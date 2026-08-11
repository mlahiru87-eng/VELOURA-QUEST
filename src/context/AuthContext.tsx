import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  UserProfile, 
  TaskItem, 
  TaskCompletion, 
  TransactionRecord,
  WithdrawalRequest, 
  ReferralRecord, 
  NotificationItem, 
  SystemSettings,
  PageView,
  AuditLog
} from '../types';
import { INITIAL_TASKS, INITIAL_NOTIFICATIONS, DEFAULT_SETTINGS } from '../data/initialData';
import { checkClaimRateLimit, recordLoginAttempt, evaluateSuspiciousActivity } from '../lib/securityAndUtils';
import { telemetry } from '../lib/telemetry';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errStr = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';
  const isPermissionErr = errStr.toLowerCase().includes('permission') || errCode === 'permission-denied';
  const isUnavailableErr = errStr.toLowerCase().includes('unavailable') || errStr.toLowerCase().includes('could not reach') || errCode === 'unavailable';

  if (isPermissionErr) {
    console.warn(`[Firestore Permission Info] ${operationType} on ${path}: Access restricted or unauthenticated. Using local state fallback.`);
    return;
  }

  if (isUnavailableErr) {
    console.warn(`[Firestore Offline Info] ${operationType} on ${path}: Backend unavailable, operating in local offline persistence mode.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
};

export const isTaskCompletedToday = (completedAtIso: string): boolean => {
  if (!completedAtIso) return false;
  const completedDate = new Date(completedAtIso);
  const now = new Date();
  return (
    completedDate.getFullYear() === now.getFullYear() &&
    completedDate.getMonth() === now.getMonth() &&
    completedDate.getDate() === now.getDate()
  );
};

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  tasks: TaskItem[];
  taskCompletions: TaskCompletion[];
  transactions: TransactionRecord[];
  withdrawals: WithdrawalRequest[];
  referrals: ReferralRecord[];
  notifications: NotificationItem[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
  allUsers: UserProfile[];
  allWithdrawals: WithdrawalRequest[];
  allTransactions: TransactionRecord[];
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string, name: string, refCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  claimTaskReward: (taskId: string) => Promise<{ success: boolean; message: string }>;
  startTaskSession: (taskId: string) => Promise<{ success: boolean; redirectUrl?: string; sessionId?: string; message?: string }>;
  submitWithdrawalRequest: (amount: number, method: WithdrawalRequest['method'], destination: string) => Promise<{ success: boolean; message: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateUserProfileData: (displayName: string, photoURL?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshData: () => Promise<void>;
  // Admin Methods
  addNewTask: (task: Omit<TaskItem, 'id'>) => Promise<void>;
  updateTaskItem: (task: TaskItem) => Promise<void>;
  deleteTaskItem: (taskId: string) => Promise<void>;
  updateWithdrawalStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  sendAnnouncement: (title: string, message: string) => Promise<void>;
  updateSystemSettings: (newSettings: SystemSettings) => Promise<void>;
  performManualWalletAdjustment: (targetUserId: string, amount: number, reason: string) => Promise<{ success: boolean; message: string }>;
  toggleUserFlagStatus: (targetUserId: string, isFlagged: boolean, reason?: string) => Promise<void>;
  toggleUserSuspensionStatus: (targetUserId: string, isSuspended: boolean, reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const checkIsReferralOrRegisterUrl = (): { isRef: boolean; code: string } => {
    if (typeof window === 'undefined') return { isRef: false, code: '' };

    const path = window.location.pathname.toLowerCase();
    const search = window.location.search;
    const hash = window.location.hash;

    const params = new URLSearchParams(search);
    let code = params.get('code') || params.get('ref') || '';

    if (!code && hash) {
      const hashIndex = hash.indexOf('?');
      if (hashIndex !== -1) {
        const hashParams = new URLSearchParams(hash.slice(hashIndex));
        code = hashParams.get('code') || hashParams.get('ref') || '';
      }
    }

    if (!code) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && (parts[0] === 'ref' || parts[0] === 'register' || parts[0] === 'r')) {
        code = parts[1];
      }
    }

    const isRef =
      path === '/ref' ||
      path.startsWith('/ref/') ||
      path === '/r' ||
      path.startsWith('/r/') ||
      path === '/register' ||
      path.startsWith('/register/') ||
      search.includes('code=') ||
      search.includes('ref=') ||
      hash.includes('code=') ||
      hash.includes('ref=') ||
      Boolean(code);

    if (code) {
      try {
        localStorage.setItem('pending_referral_code', code);
      } catch (e) {
        // ignore
      }
    }

    return { isRef, code };
  };

  const getInitialPage = (): PageView => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/complete' || search.includes('taskId=') || search.includes('sessionId=')) {
        return 'complete';
      }
      const { isRef } = checkIsReferralOrRegisterUrl();
      if (isRef) {
        return 'register';
      }
    }
    return 'splash';
  };

  const [currentPage, setCurrentPage] = useState<PageView>(getInitialPage);

  // App State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  
  // Admin State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Validate Firestore Connection on initial boot as required by skill
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'connection_test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.info('Firebase client operating in offline mode.');
        }
      }
    };
    testConnection();
  }, []);

  // Seed tasks if collection is empty (only when authenticated)
  const seedInitialTasksIfNeeded = async () => {
    if (!auth.currentUser) return;
    try {
      const taskSnap = await getDocs(collection(db, 'tasks'));
      if (taskSnap.empty) {
        for (const t of INITIAL_TASKS) {
          await setDoc(doc(db, 'tasks', t.id), t);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'tasks');
    }
  };

  // Listen to tasks
  useEffect(() => {
    seedInitialTasksIfNeeded();
    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedTasks: TaskItem[] = [];
        snapshot.forEach((d) => {
          const raw = d.data();
          const reward = typeof raw.reward === 'number' ? raw.reward : (typeof raw.rewardAmount === 'number' ? raw.rewardAmount : 5.0);
          const duration = typeof raw.duration === 'number' ? raw.duration : (typeof raw.durationSeconds === 'number' ? raw.durationSeconds : 30);
          const thumbnailUrl = raw.thumbnailUrl || raw.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
          const videoUrl = raw.videoUrl || 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC';
          const createdAt = raw.createdAt || new Date().toISOString();

          loadedTasks.push({
            id: d.id,
            title: raw.title || 'Untitled Quest',
            description: raw.description || '',
            reward,
            rewardAmount: reward,
            thumbnailUrl,
            thumbnail: thumbnailUrl,
            videoUrl,
            duration,
            durationSeconds: duration,
            category: raw.category || 'Video',
            createdAt,
            active: raw.active !== false
          });
        });
        setTasks(loadedTasks);
      } else {
        setTasks(INITIAL_TASKS);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tasks');
      setTasks(INITIAL_TASKS);
    });

    return () => unsubscribeTasks();
  }, [currentUser]);

  // Listen to system settings
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'platform'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SystemSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/platform');
      setSettings(DEFAULT_SETTINGS);
    });
    return () => unsubSettings();
  }, []);

  // Listen to user auth state & sync profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          telemetry.recordFirestoreRead();
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const profileData = userSnap.data() as UserProfile;
            setUserProfile(profileData);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || 'user@veloura-quest.vercel.app',
              displayName: user.displayName || user.email?.split('@')[0] || 'Quest Explorer',
              photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              referralCode: 'VQ-' + Math.floor(1000 + Math.random() * 9000),
              currentBalance: 10.00,
              totalEarned: 10.00,
              role: user.email === 'admin@veloura-quest.vercel.app' ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
              hasSeenOnboarding: false,
              isFlagged: false
            };
            await setDoc(userRef, newProfile, { merge: true });
            telemetry.recordFirestoreWrite();
            console.log(`[Firestore User Created] Document written to users/${user.uid}`);
            setUserProfile(newProfile);

            await addDoc(collection(db, 'transactions'), {
              userId: user.uid,
              type: 'welcome_bonus',
              amount: 10.00,
              description: 'Veloura Quest Registration Bonus',
              status: 'completed',
              createdAt: new Date().toISOString()
            });
            telemetry.recordFirestoreWrite();
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const search = window.location.search;
        const { isRef } = checkIsReferralOrRegisterUrl();

        if (path === '/complete' || search.includes('taskId=') || search.includes('sessionId=')) {
          setCurrentPage('complete');
        } else if (isRef) {
          if (!user) {
            setCurrentPage('register');
          } else {
            setCurrentPage('home');
          }
        } else if (user && (currentPage === 'splash' || currentPage === 'login' || currentPage === 'register')) {
          setCurrentPage('home');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to User-specific Data when user is logged in
  useEffect(() => {
    if (!userProfile) return;

    // 1. Task completions
    const qCompletions = query(collection(db, 'taskCompletions'), where('userId', '==', userProfile.uid));
    const unsubCompletions = onSnapshot(qCompletions, (snap) => {
      const items: TaskCompletion[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as TaskCompletion));
      setTaskCompletions(items);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'taskCompletions'));

    // 2. Transactions
    const qTransactions = query(collection(db, 'transactions'), where('userId', '==', userProfile.uid));
    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      const items: TransactionRecord[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as TransactionRecord));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(items);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    // 3. User Withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', userProfile.uid));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
      const items: WithdrawalRequest[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as WithdrawalRequest));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWithdrawals(items);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals'));

    // 4. User Referrals
    const qReferrals = query(collection(db, 'referrals'), where('referrerId', '==', userProfile.uid));
    const unsubReferrals = onSnapshot(qReferrals, (snap) => {
      const items: ReferralRecord[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ReferralRecord));
      setReferrals(items);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'referrals'));

    // 5. Notifications
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
      const items: NotificationItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as NotificationItem;
        if (data.userId === 'all' || data.userId === userProfile.uid) {
          items.push({ id: d.id, ...data });
        }
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(items.length > 0 ? items : INITIAL_NOTIFICATIONS);
    }, () => {
      setNotifications(INITIAL_NOTIFICATIONS);
    });

    return () => {
      unsubCompletions();
      unsubTransactions();
      unsubWithdrawals();
      unsubReferrals();
      unsubNotifs();
    };
  }, [userProfile?.uid]);

  // Admin Data Listeners
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const usersList: UserProfile[] = [];
        snap.forEach((d) => usersList.push(d.data() as UserProfile));
        setAllUsers(usersList);
      });

      const unsubAllWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
        const wList: WithdrawalRequest[] = [];
        snap.forEach((d) => wList.push({ id: d.id, ...d.data() } as WithdrawalRequest));
        wList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllWithdrawals(wList);
      });

      const unsubAllTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
        const tList: TransactionRecord[] = [];
        snap.forEach((d) => tList.push({ id: d.id, ...d.data() } as TransactionRecord));
        tList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllTransactions(tList);
      });

      const unsubAuditLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
        const logList: AuditLog[] = [];
        snap.forEach((d) => logList.push({ id: d.id, ...d.data() } as AuditLog));
        logList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAuditLogs(logList);
      });

      return () => {
        unsubUsers();
        unsubAllWithdrawals();
        unsubAllTransactions();
        unsubAuditLogs();
      };
    }
  }, [userProfile?.role]);

  // Auth Functions
  const login = async (email: string, pass: string) => {
    const rateCheck = recordLoginAttempt(email, false);
    if (!rateCheck.allowed) {
      throw new Error(`Too many failed attempts. Please wait ${rateCheck.remainingSeconds} seconds.`);
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      recordLoginAttempt(email, true);
      setCurrentPage('home');
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const register = async (email: string, pass: string, name: string, refCode?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUid = cred.user.uid;
      const generatedRefCode = 'VQ-' + Math.floor(1000 + Math.random() * 9000);
      const isFirstAdmin = email === 'admin@veloura-quest.vercel.app';
      const initialBonus = 10.00;

      const newProfile: UserProfile = {
        uid: newUid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        referralCode: generatedRefCode,
        referredBy: refCode ? refCode.trim() : '',
        currentBalance: initialBonus,
        totalEarned: initialBonus,
        role: isFirstAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        hasSeenOnboarding: false,
        isFlagged: false
      };

      await setDoc(doc(db, 'users', newUid), newProfile, { merge: true });
      telemetry.recordFirestoreWrite();
      console.log(`[Firestore User Registered] Document written to users/${newUid}`);
      setUserProfile(newProfile);

      await addDoc(collection(db, 'transactions'), {
        userId: newUid,
        type: 'welcome_bonus',
        amount: initialBonus,
        description: 'Veloura Quest Registration Welcome Gift',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: newUid,
        title: 'Welcome to Veloura Quest!',
        message: 'Your account is active. Complete daily quests to earn rewards!',
        type: 'reward',
        read: false,
        createdAt: new Date().toISOString()
      });

      if (refCode && refCode.trim()) {
        try {
          const qRef = query(collection(db, 'users'), where('referralCode', '==', refCode.trim()));
          const refSnap = await getDocs(qRef);
          if (!refSnap.empty) {
            const referrerData = refSnap.docs[0].data() as UserProfile;
            
            await addDoc(collection(db, 'referrals'), {
              referrerId: referrerData.uid,
              refereeId: newUid,
              refereeName: newProfile.displayName,
              rewardAmount: settings.referralBonus || 5.00,
              status: 'pending',
              createdAt: new Date().toISOString()
            });

            await addDoc(collection(db, 'notifications'), {
              userId: referrerData.uid,
              title: 'New Referral Joined!',
              message: `${newProfile.displayName} joined using your code. $${settings.referralBonus || 5.00} reward will be awarded after their 1st completed task!`,
              type: 'reward',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'referrals');
        }
      }

      setCurrentPage('home');
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentPage('login');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Complete Onboarding
  const completeOnboarding = async () => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        hasSeenOnboarding: true
      });
      setUserProfile({ ...userProfile, hasSeenOnboarding: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  // Pull-to-refresh
  const refreshData = async () => {
    if (!userProfile) return;
    try {
      const uSnap = await getDoc(doc(db, 'users', userProfile.uid));
      if (uSnap.exists()) {
        setUserProfile(uSnap.data() as UserProfile);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    }
  };

  // Task Reward Claiming with Rate Limiting & Suspicious Activity Guard
  const claimTaskReward = async (taskId: string): Promise<{ success: boolean; message: string }> => {
    if (!userProfile) return { success: false, message: 'User profile not found' };

    // 1. Account flag check
    if (userProfile.isFlagged) {
      return { 
        success: false, 
        message: 'Your account is under administrative review for suspicious activity. Task rewards are paused.' 
      };
    }

    // 2. Client Rate-Limiter Check
    const rateCheck = checkClaimRateLimit(userProfile.uid);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        message: `Claim rate limit reached. Please wait ${rateCheck.waitSeconds}s before claiming again.` 
      };
    }

    // 3. Concurrency guard
    if (claimingTaskId === taskId) {
      return { success: false, message: 'Claim in progress...' };
    }
    setClaimingTaskId(taskId);

    try {
      // Check if already completed TODAY
      const alreadyCompletedToday = taskCompletions.some(
        (tc) => tc.taskId === taskId && isTaskCompletedToday(tc.completedAt)
      );
      if (alreadyCompletedToday) {
        setClaimingTaskId(null);
        return { success: false, message: 'You have already completed this quest today!' };
      }

      // Check suspicious activity (completed 4+ tasks in last minute)
      const now = new Date().getTime();
      const completionsLastMinute = taskCompletions.filter(
        (tc) => now - new Date(tc.completedAt).getTime() < 60000
      ).length;

      const evalResult = evaluateSuspiciousActivity(completionsLastMinute + 1, 0);
      if (evalResult.suspicious) {
        // Automatically flag account in Firestore
        await updateDoc(doc(db, 'users', userProfile.uid), {
          isFlagged: true,
          flaggedReason: evalResult.reason,
          flaggedAt: new Date().toISOString()
        });
        
        setUserProfile({ ...userProfile, isFlagged: true, flaggedReason: evalResult.reason });

        // Alert Admin
        await addDoc(collection(db, 'notifications'), {
          userId: 'all',
          title: 'Security Alert: Account Flagged',
          message: `User ${userProfile.email} flagged: ${evalResult.reason}`,
          type: 'security',
          read: false,
          createdAt: new Date().toISOString()
        });

        setClaimingTaskId(null);
        return { 
          success: false, 
          message: `Security Warning: ${evalResult.reason}. Your account has been flagged for admin review.` 
        };
      }

      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        setClaimingTaskId(null);
        return { success: false, message: 'Quest not found' };
      }

      const isFirstTaskEver = taskCompletions.length === 0;
      const reward = task.rewardAmount;
      const newBalance = userProfile.currentBalance + reward;
      const newTotalEarned = userProfile.totalEarned + reward;

      // 1. Create TaskCompletion doc
      const newCompletion: Omit<TaskCompletion, 'id'> = {
        userId: userProfile.uid,
        taskId: taskId,
        completedAt: new Date().toISOString(),
        claimedAmount: reward
      };
      const compRef = await addDoc(collection(db, 'taskCompletions'), newCompletion);

      // 2. Create Transaction Log
      await addDoc(collection(db, 'transactions'), {
        userId: userProfile.uid,
        type: 'task_reward',
        amount: reward,
        description: `Completed Quest: "${task.title}"`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // 3. Update User Balance
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        currentBalance: newBalance,
        totalEarned: newTotalEarned
      });

      setUserProfile({
        ...userProfile,
        currentBalance: newBalance,
        totalEarned: newTotalEarned
      });

      setTaskCompletions([...taskCompletions, { id: compRef.id, ...newCompletion }]);

      // 4. Send Notification
      await addDoc(collection(db, 'notifications'), {
        userId: userProfile.uid,
        title: 'Quest Completed!',
        message: `You earned $${reward.toFixed(2)} for completing "${task.title}".`,
        type: 'reward',
        read: false,
        createdAt: new Date().toISOString()
      });

      // 5. Unlock Referral Bonus if first task
      if (isFirstTaskEver) {
        try {
          const qRefPending = query(
            collection(db, 'referrals'),
            where('refereeId', '==', userProfile.uid),
            where('status', '==', 'pending')
          );
          const pendingSnap = await getDocs(qRefPending);
          
          if (!pendingSnap.empty) {
            const refDoc = pendingSnap.docs[0];
            const refData = refDoc.data() as ReferralRecord;
            const rewardAmount = refData.rewardAmount || settings.referralBonus || 5.00;

            await updateDoc(doc(db, 'referrals', refDoc.id), {
              status: 'completed',
              completedAt: new Date().toISOString()
            });

            const referrerUserRef = doc(db, 'users', refData.referrerId);
            const referrerSnap = await getDoc(referrerUserRef);
            if (referrerSnap.exists()) {
              const referrerProfile = referrerSnap.data() as UserProfile;
              const updatedRefBalance = (referrerProfile.currentBalance || 0) + rewardAmount;
              const updatedRefEarned = (referrerProfile.totalEarned || 0) + rewardAmount;

              await updateDoc(referrerUserRef, {
                currentBalance: updatedRefBalance,
                totalEarned: updatedRefEarned
              });

              await addDoc(collection(db, 'transactions'), {
                userId: refData.referrerId,
                type: 'referral_bonus',
                amount: rewardAmount,
                description: `Referral Bonus: ${userProfile.displayName} completed 1st task!`,
                status: 'completed',
                createdAt: new Date().toISOString()
              });

              await addDoc(collection(db, 'notifications'), {
                userId: refData.referrerId,
                title: 'Referral Bonus Unlocked!',
                message: `${userProfile.displayName} completed their first quest! $${rewardAmount.toFixed(2)} referral bonus was added to your wallet.`,
                type: 'reward',
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'referrals');
        }
      }

      setClaimingTaskId(null);
      return { success: true, message: `Successfully claimed $${reward.toFixed(2)}!` };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'taskCompletions');
      setClaimingTaskId(null);
      return { success: false, message: 'Failed to claim task reward. Please try again.' };
    }
  };

  // Submit Withdrawal Request
  const submitWithdrawalRequest = async (
    amount: number, 
    method: WithdrawalRequest['method'], 
    destination: string
  ) => {
    if (!userProfile) return { success: false, message: 'Please log in first' };

    if (userProfile.isFlagged) {
      return { 
        success: false, 
        message: 'Your account is under administrative review. Withdrawals are currently locked.' 
      };
    }

    if (amount < settings.minWithdrawal) {
      return { success: false, message: `Minimum withdrawal amount is $${settings.minWithdrawal.toFixed(2)}` };
    }

    if (amount > userProfile.currentBalance) {
      return { success: false, message: 'Insufficient wallet balance' };
    }

    // Check suspicious withdrawal frequency
    const now = new Date().getTime();
    const recentWithdrawalsCount = withdrawals.filter(
      (w) => now - new Date(w.createdAt).getTime() < 300000
    ).length;

    const evalResult = evaluateSuspiciousActivity(0, recentWithdrawalsCount + 1);
    if (evalResult.suspicious) {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        isFlagged: true,
        flaggedReason: evalResult.reason,
        flaggedAt: new Date().toISOString()
      });

      setUserProfile({ ...userProfile, isFlagged: true, flaggedReason: evalResult.reason });

      return {
        success: false,
        message: `Withdrawal locked: ${evalResult.reason}. Account flagged for review.`
      };
    }

    try {
      const newBalance = userProfile.currentBalance - amount;

      const newRequest: Omit<WithdrawalRequest, 'id'> = {
        userId: userProfile.uid,
        userEmail: userProfile.email,
        amount,
        method,
        destination,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const wRef = await addDoc(collection(db, 'withdrawals'), newRequest);

      await addDoc(collection(db, 'transactions'), {
        userId: userProfile.uid,
        type: 'withdrawal',
        amount: -amount,
        description: `Withdrawal Request (${method} - ${destination})`,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', userProfile.uid), {
        currentBalance: newBalance
      });

      setUserProfile({
        ...userProfile,
        currentBalance: newBalance
      });

      setWithdrawals([{ id: wRef.id, ...newRequest }, ...withdrawals]);

      await addDoc(collection(db, 'notifications'), {
        userId: userProfile.uid,
        title: 'Withdrawal Request Submitted',
        message: `Your request to withdraw $${amount.toFixed(2)} via ${method} is being processed.`,
        type: 'withdrawal',
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'Withdrawal request submitted successfully!' };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'withdrawals');
      return { success: false, message: 'Failed to submit withdrawal request. Please try again.' };
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    notifications.forEach((n) => {
      if (!n.read) {
        try {
          updateDoc(doc(db, 'notifications', n.id), { read: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `notifications/${n.id}`);
        }
      }
    });
  };

  const updateUserProfileData = async (displayName: string, photoURL?: string) => {
    if (!userProfile) return;
    try {
      const updated = {
        ...userProfile,
        displayName,
        photoURL: photoURL || userProfile.photoURL
      };
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName,
        ...(photoURL && { photoURL })
      });
      setUserProfile(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  // External Video Task Support - Start Session
  const startTaskSession = async (taskId: string): Promise<{ success: boolean; redirectUrl?: string; sessionId?: string; message?: string }> => {
    if (!currentUser || !userProfile) {
      return { success: false, message: 'Please log in to start this quest' };
    }

    try {
      // 1. Read the task's videoUrl and duration from Firestore
      let videoUrl = 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC';
      let duration = 30;
      try {
        telemetry.recordFirestoreRead();
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const tData = taskSnap.data();
          if (tData.videoUrl) {
            videoUrl = tData.videoUrl;
          }
          if (typeof tData.duration === 'number') {
            duration = tData.duration;
          } else if (typeof tData.durationSeconds === 'number') {
            duration = tData.durationSeconds;
          }
        } else {
          const memTask = tasks.find((t) => t.id === taskId);
          if (memTask) {
            if (memTask.videoUrl) videoUrl = memTask.videoUrl;
            if (memTask.durationSeconds) duration = memTask.durationSeconds;
          }
        }
      } catch (e) {
        console.warn('Could not read task directly from Firestore, falling back to loaded state', e);
        const memTask = tasks.find((t) => t.id === taskId);
        if (memTask) {
          if (memTask.videoUrl) videoUrl = memTask.videoUrl;
          if (memTask.durationSeconds) duration = memTask.durationSeconds;
        }
      }

      // 2. Generate a unique sessionId
      const sessionRef = doc(collection(db, 'taskSessions'));
      const sessionId = sessionRef.id;

      // 3. Save a pending task session in Firestore
      const sessionPayload = {
        sessionId,
        taskId,
        userId: userProfile.uid,
        status: 'started',
        startedAt: serverTimestamp(),
        requiredSeconds: duration || 30
      };

      await setDoc(sessionRef, sessionPayload);
      telemetry.recordFirestoreWrite();

      // 4. Redirect the user to videoUrl with query params appended
      let targetUrl: URL;
      try {
        targetUrl = new URL(videoUrl);
      } catch {
        targetUrl = new URL(videoUrl, window.location.origin);
      }

      targetUrl.searchParams.set('taskId', taskId);
      targetUrl.searchParams.set('userId', userProfile.uid);
      targetUrl.searchParams.set('sessionId', sessionId);
      targetUrl.searchParams.set('returnUrl', `https://veloura-quest.vercel.app/complete?taskId=${taskId}&sessionId=${sessionId}`);

      const redirectUrl = targetUrl.toString();

      // Attempt to open in a new tab so user can watch while staying in app, fallback to current window location
      try {
        const openedWin = window.open(redirectUrl, '_blank');
        if (!openedWin || openedWin.closed || typeof openedWin.closed === 'undefined') {
          window.location.href = redirectUrl;
        }
      } catch (e) {
        window.location.href = redirectUrl;
      }

      return { success: true, redirectUrl, sessionId };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'taskSessions');
      return { success: false, message: 'Failed to start quest session.' };
    }
  };

  // Admin Methods
  const addNewTask = async (taskData: Omit<TaskItem, 'id'> | {
    title: string;
    description: string;
    reward: number;
    thumbnailUrl: string;
    videoUrl: string;
    duration: number;
    category: string;
    createdAt?: string;
    active?: boolean;
  }) => {
    try {
      const createdAt = (taskData as any).createdAt || new Date().toISOString();
      const reward = (taskData as any).reward !== undefined ? (taskData as any).reward : (taskData as any).rewardAmount;
      const thumbnailUrl = (taskData as any).thumbnailUrl || (taskData as any).thumbnail;
      const duration = (taskData as any).duration !== undefined ? (taskData as any).duration : (taskData as any).durationSeconds;

      const payload = {
        title: taskData.title,
        description: taskData.description,
        reward,
        thumbnailUrl,
        videoUrl: (taskData as any).videoUrl || 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC',
        duration,
        category: taskData.category,
        createdAt,
        active: taskData.active !== undefined ? taskData.active : true
      };

      const docRef = await addDoc(collection(db, 'tasks'), payload);
      telemetry.recordFirestoreWrite();

      const newTask: TaskItem = {
        id: docRef.id,
        ...payload,
        rewardAmount: reward,
        thumbnail: thumbnailUrl,
        durationSeconds: duration
      };
      setTasks([...tasks, newTask]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const updateTaskItem = async (task: TaskItem) => {
    try {
      await setDoc(doc(db, 'tasks', task.id), task);
      setTasks(tasks.map(t => t.id === task.id ? task : t));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTaskItem = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { active: false });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const updateWithdrawalStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!userProfile || userProfile.role !== 'admin') return;

    try {
      await updateDoc(doc(db, 'withdrawals', id), { status });
      setAllWithdrawals(allWithdrawals.map(w => w.id === id ? { ...w, status } : w));

      const targetW = allWithdrawals.find(w => w.id === id);
      if (targetW) {
        if (status === 'rejected') {
          const uSnap = await getDoc(doc(db, 'users', targetW.userId));
          if (uSnap.exists()) {
            const uData = uSnap.data() as UserProfile;
            const refundedBalance = uData.currentBalance + targetW.amount;
            await updateDoc(doc(db, 'users', targetW.userId), {
              currentBalance: refundedBalance
            });

            await addDoc(collection(db, 'transactions'), {
              userId: targetW.userId,
              type: 'withdrawal_refund',
              amount: targetW.amount,
              description: `Withdrawal Refund ($${targetW.amount.toFixed(2)} via ${targetW.method})`,
              status: 'completed',
              createdAt: new Date().toISOString()
            });
          }
        }

        // Add audit log
        await addDoc(collection(db, 'auditLogs'), {
          adminUid: userProfile.uid,
          adminEmail: userProfile.email,
          targetUserId: targetW.userId,
          targetUserEmail: targetW.userEmail,
          action: 'withdrawal_override',
          reason: `Withdrawal ${id} status set to ${status}`,
          createdAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'notifications'), {
          userId: targetW.userId,
          title: `Withdrawal ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: status === 'approved' 
            ? `Your withdrawal request of $${targetW.amount.toFixed(2)} via ${targetW.method} was approved and disbursed.`
            : `Your withdrawal request of $${targetW.amount.toFixed(2)} was rejected. $${targetW.amount.toFixed(2)} has been refunded to your wallet balance.`,
          type: 'withdrawal',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  // Admin Manual Wallet Adjustment
  const performManualWalletAdjustment = async (
    targetUserId: string, 
    amount: number, 
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, message: 'Unauthorized action' };
    }

    try {
      const uRef = doc(db, 'users', targetUserId);
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) return { success: false, message: 'Target user not found' };

      const uData = uSnap.data() as UserProfile;
      const newBal = uData.currentBalance + amount;
      const newTotal = amount > 0 ? uData.totalEarned + amount : uData.totalEarned;

      // Update user
      await updateDoc(uRef, {
        currentBalance: newBal,
        ...(amount > 0 && { totalEarned: newTotal })
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: targetUserId,
        type: 'admin_adjustment',
        amount: amount,
        description: `Admin Wallet Adjustment: ${reason}`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId,
        targetUserEmail: uData.email,
        action: 'balance_adjustment',
        amountChanged: amount,
        reason,
        createdAt: new Date().toISOString()
      });

      // Notification
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        title: 'Wallet Balance Adjusted',
        message: `Admin adjusted your wallet balance by ${amount >= 0 ? '+' : ''}$${amount.toFixed(2)}. Reason: ${reason}`,
        type: 'admin',
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'Wallet adjustment successful!' };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
      return { success: false, message: 'Adjustment failed' };
    }
  };

  // Toggle Flag Status
  const toggleUserFlagStatus = async (targetUserId: string, isFlagged: boolean, reason: string = 'Manual Admin Review') => {
    if (!userProfile || userProfile.role !== 'admin') return;

    try {
      const uRef = doc(db, 'users', targetUserId);
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) return;
      const uData = uSnap.data() as UserProfile;

      await updateDoc(uRef, {
        isFlagged,
        flaggedReason: isFlagged ? reason : '',
        flaggedAt: isFlagged ? new Date().toISOString() : ''
      });

      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId,
        targetUserEmail: uData.email,
        action: isFlagged ? 'account_flag' : 'account_unflag',
        reason,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
    }
  };

  const toggleUserSuspensionStatus = async (targetUserId: string, isSuspended: boolean, reason: string = 'Emergency administrative action') => {
    if (!userProfile || userProfile.role !== 'admin') return;
    try {
      const uRef = doc(db, 'users', targetUserId);
      const uSnap = await getDoc(uRef);
      const uData = uSnap.exists() ? (uSnap.data() as UserProfile) : { email: 'unknown@user.com' };

      await updateDoc(uRef, {
        isSuspended,
        suspendedReason: isSuspended ? reason : '',
        suspendedAt: isSuspended ? new Date().toISOString() : ''
      });

      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId,
        targetUserEmail: uData.email,
        action: isSuspended ? 'account_flag' : 'account_unflag',
        reason: `Suspension status set to ${isSuspended}: ${reason}`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
    }
  };

  const sendAnnouncement = async (title: string, message: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: 'all',
        title,
        message,
        type: 'admin',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    }
  };

  const updateSystemSettings = async (newSettings: SystemSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'platform'), newSettings);
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/platform');
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      currentPage,
      setCurrentPage,
      tasks,
      taskCompletions,
      transactions,
      withdrawals,
      referrals,
      notifications,
      settings,
      auditLogs,
      allUsers,
      allWithdrawals,
      allTransactions,
      login,
      register,
      logout,
      resetPassword,
      claimTaskReward,
      startTaskSession,
      submitWithdrawalRequest,
      markNotificationRead,
      markAllNotificationsRead,
      updateUserProfileData,
      completeOnboarding,
      refreshData,
      addNewTask,
      updateTaskItem,
      deleteTaskItem,
      updateWithdrawalStatus,
      sendAnnouncement,
      updateSystemSettings,
      performManualWalletAdjustment,
      toggleUserFlagStatus,
      toggleUserSuspensionStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

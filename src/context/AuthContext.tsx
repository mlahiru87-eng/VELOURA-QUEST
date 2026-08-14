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
  serverTimestamp,
  runTransaction
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
import { checkClaimRateLimit, recordLoginAttempt, evaluateSuspiciousActivity, isValidTRC20Address, maskWalletAddress } from '../lib/securityAndUtils';
import { telemetry } from '../lib/telemetry';
import { processTaskReferralCommission } from '../lib/referralCommission';

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
  submitWithdrawalRequest: (amount: number, walletAddress: string) => Promise<{ success: boolean; message: string; withdrawalId?: string }>;
  approveWithdrawal: (id: string, txHash: string, adminNote?: string) => Promise<{ success: boolean; message: string }>;
  rejectWithdrawal: (id: string, rejectionReason: string, adminNote?: string) => Promise<{ success: boolean; message: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateUserProfileData: (displayName: string, photoURL?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshData: () => Promise<void>;
  // Admin Methods
  addNewTask: (task: Omit<TaskItem, 'id'>) => Promise<void>;
  updateTaskItem: (task: TaskItem) => Promise<void>;
  deleteTaskItem: (taskId: string) => Promise<void>;
  updateWithdrawalStatus: (id: string, status: 'approved' | 'rejected', txHashOrReason?: string, adminNote?: string) => Promise<void>;
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

      // Check for active pending task session in localStorage
      try {
        const pendingSession = localStorage.getItem('active_task_session');
        if (pendingSession) {
          const parsed = JSON.parse(pendingSession);
          if (parsed && parsed.taskId && parsed.sessionId) {
            localStorage.removeItem('active_task_session');
            window.history.replaceState(null, '', `/complete?taskId=${parsed.taskId}&sessionId=${parsed.sessionId}`);
            return 'complete';
          }
        }
      } catch (e) {
        // ignore storage parse errors
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
          const isAds = raw.category === 'Ads';
          const defaultAdThumb = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&auto=format&fit=crop&q=80';
          const defaultVideoThumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
          const thumbnailUrl = raw.thumbnailUrl || raw.thumbnail || (isAds ? defaultAdThumb : defaultVideoThumb);
          const videoUrl = raw.videoUrl || (isAds ? '' : 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC');
          const adUrl = raw.adUrl || '';
          const createdAt = raw.createdAt || new Date().toISOString();

          loadedTasks.push({
            id: d.id,
            title: raw.title || (isAds ? 'Advertisement Task' : 'Untitled Quest'),
            description: raw.description || (isAds ? 'Visit the advertisement and stay on the page for 30 seconds.' : ''),
            reward,
            rewardAmount: reward,
            thumbnailUrl,
            thumbnail: thumbnailUrl,
            videoUrl,
            adUrl,
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
              currentBalance: 5.00,
              totalEarned: 5.00,
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
              amount: 5.00,
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
      const initialBonus = 5.00;

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
              referredUserId: newUid,
              referrerUserId: referrerData.uid,
              referralCode: refCode.trim(),
              status: 'active',
              createdAt: new Date().toISOString(),
              referrerId: referrerData.uid,
              refereeId: newUid,
              refereeName: newProfile.displayName,
            });

            await addDoc(collection(db, 'notifications'), {
              userId: referrerData.uid,
              title: 'New Referral Joined!',
              message: `${newProfile.displayName} joined using your referral code. You will earn 50% referral commission whenever they complete daily tasks!`,
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

      // 5. Process 50% Referral Commission
      try {
        await processTaskReferralCommission({
          taskCompletionId: compRef.id,
          referredUserId: userProfile.uid,
          referredUserName: userProfile.displayName,
          taskReward: reward
        });
      } catch (refErr) {
        console.error('Referral commission error in claimTaskReward:', refErr);
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
    walletAddress: string
  ): Promise<{ success: boolean; message: string; withdrawalId?: string }> => {
    if (!userProfile) return { success: false, message: 'Please log in first' };

    if (userProfile.isFlagged) {
      return { 
        success: false, 
        message: 'Your account is under administrative review. Withdrawals are currently locked.' 
      };
    }

    if (userProfile.isSuspended) {
      return {
        success: false,
        message: 'Your account is suspended. Withdrawals are disabled.'
      };
    }

    const minAmount = Math.max(20.00, settings?.minWithdrawal || 20.00);
    if (amount < minAmount) {
      return { success: false, message: 'Minimum withdrawal amount is 20 USDT.' };
    }

    if (amount <= 0) {
      return { success: false, message: 'Withdrawal amount must be greater than $0.00' };
    }

    if (!walletAddress || !walletAddress.trim()) {
      return { success: false, message: 'USDT TRC20 Wallet Address is required' };
    }

    if (!isValidTRC20Address(walletAddress)) {
      return { 
        success: false, 
        message: 'Invalid TRC20 Wallet Address. Address must start with "T" and be 34 characters long.' 
      };
    }

    // Check duplicate pending request
    const existingPending = withdrawals.find(w => w.status === 'pending');
    if (existingPending) {
      return {
        success: false,
        message: 'You already have a pending withdrawal request under review. Please wait until it is processed.'
      };
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
      const cleanAddress = walletAddress.trim();
      const maskedAddr = maskWalletAddress(cleanAddress);
      let createdWithdrawalId = '';

      // Perform atomic Firestore transaction to verify balance and deduct
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error('User profile not found in database.');
        }

        const serverUserData = userSnap.data() as UserProfile;
        const currentBal = serverUserData.currentBalance ?? 0;

        if (currentBal < amount) {
          throw new Error(`Insufficient wallet balance. Available balance: $${currentBal.toFixed(2)}`);
        }

        const newBalance = currentBal - amount;

        // Create withdrawal doc reference
        const wDocRef = doc(collection(db, 'withdrawals'));
        createdWithdrawalId = wDocRef.id;

        const newWithdrawalData: WithdrawalRequest = {
          id: wDocRef.id,
          withdrawalId: wDocRef.id,
          userId: userProfile.uid,
          userEmail: userProfile.email || '',
          userName: userProfile.displayName || '',
          amount,
          currency: 'USDT',
          network: 'TRC20',
          walletAddress: cleanAddress,
          status: 'pending',
          createdAt: new Date().toISOString(),
          processedAt: null,
          processedBy: null,
          adminNote: null,
          txHash: null,
          rejectionReason: null,
          method: 'Crypto (USDT)',
          destination: cleanAddress
        };

        // Create transaction record
        const txDocRef = doc(collection(db, 'transactions'));
        const newTransactionData: TransactionRecord = {
          id: txDocRef.id,
          userId: userProfile.uid,
          type: 'withdrawal',
          amount: -amount,
          currency: 'USDT',
          network: 'TRC20',
          withdrawalId: wDocRef.id,
          description: `Withdrawal Request ($${amount.toFixed(2)} USDT TRC20 - ${maskedAddr})`,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        // Set withdrawal and transaction docs atomically
        transaction.set(wDocRef, newWithdrawalData);
        transaction.set(txDocRef, newTransactionData);

        // Update user balance atomically
        transaction.update(userRef, {
          currentBalance: newBalance
        });
      });

      // Update local React state
      const updatedBalance = userProfile.currentBalance - amount;
      setUserProfile({
        ...userProfile,
        currentBalance: updatedBalance
      });

      const newWithdrawalObj: WithdrawalRequest = {
        id: createdWithdrawalId,
        withdrawalId: createdWithdrawalId,
        userId: userProfile.uid,
        userEmail: userProfile.email || '',
        userName: userProfile.displayName || '',
        amount,
        currency: 'USDT',
        network: 'TRC20',
        walletAddress: cleanAddress,
        status: 'pending',
        createdAt: new Date().toISOString(),
        processedAt: null,
        processedBy: null,
        adminNote: null,
        txHash: null,
        rejectionReason: null,
        method: 'Crypto (USDT)',
        destination: cleanAddress
      };

      setWithdrawals([newWithdrawalObj, ...withdrawals]);

      // Add notification for user
      await addDoc(collection(db, 'notifications'), {
        userId: userProfile.uid,
        title: 'Withdrawal Request Submitted',
        message: `Your request to withdraw $${amount.toFixed(2)} USDT (TRC20) has been submitted. An administrator will review and process your payout.`,
        type: 'withdrawal',
        read: false,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Your withdrawal request has been submitted. An administrator will review and process your payout.',
        withdrawalId: createdWithdrawalId
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to submit withdrawal request. Please try again.';
      handleFirestoreError(err, OperationType.WRITE, 'withdrawals');
      return { success: false, message: errMsg };
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

  // External Video & Ads Task Support - Start Session
  const startTaskSession = async (taskId: string): Promise<{ success: boolean; redirectUrl?: string; sessionId?: string; message?: string }> => {
    if (!currentUser || !userProfile) {
      return { success: false, message: 'Please log in to start this quest' };
    }

    try {
      // 1. Read the task details from Firestore or memory
      let targetDestination = 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC';
      let requiredDuration = 30;
      let taskCategory = 'Video';

      try {
        telemetry.recordFirestoreRead();
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const tData = taskSnap.data();
          taskCategory = tData.category || 'Video';
          if (taskCategory === 'Ads' || tData.adUrl) {
            taskCategory = 'Ads';
            targetDestination = tData.adUrl || 'https://example.com/advertisement';
            requiredDuration = 30;
          } else {
            if (tData.videoUrl) targetDestination = tData.videoUrl;
            if (typeof tData.duration === 'number') requiredDuration = tData.duration;
            else if (typeof tData.durationSeconds === 'number') requiredDuration = tData.durationSeconds;
          }
        } else {
          const memTask = tasks.find((t) => t.id === taskId);
          if (memTask) {
            taskCategory = memTask.category || 'Video';
            if (taskCategory === 'Ads' || memTask.adUrl) {
              taskCategory = 'Ads';
              targetDestination = memTask.adUrl || 'https://example.com/advertisement';
              requiredDuration = 30;
            } else {
              if (memTask.videoUrl) targetDestination = memTask.videoUrl;
              if (memTask.durationSeconds) requiredDuration = memTask.durationSeconds;
            }
          }
        }
      } catch (e) {
        console.warn('Could not read task directly from Firestore, falling back to loaded state', e);
        const memTask = tasks.find((t) => t.id === taskId);
        if (memTask) {
          taskCategory = memTask.category || 'Video';
          if (taskCategory === 'Ads' || memTask.adUrl) {
            taskCategory = 'Ads';
            targetDestination = memTask.adUrl || 'https://example.com/advertisement';
            requiredDuration = 30;
          } else {
            if (memTask.videoUrl) targetDestination = memTask.videoUrl;
            if (memTask.durationSeconds) requiredDuration = memTask.durationSeconds;
          }
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
        requiredSeconds: requiredDuration || 30,
        category: taskCategory
      };

      await setDoc(sessionRef, sessionPayload);
      telemetry.recordFirestoreWrite();

      // Store in localStorage so if the user hits Back or reopens, we resume session verification
      try {
        localStorage.setItem('active_task_session', JSON.stringify({ taskId, sessionId, category: taskCategory, startedAt: Date.now() }));
      } catch (e) {
        // ignore
      }

      // 4. Prepare redirect URL with query params
      let targetUrl: URL;
      try {
        targetUrl = new URL(targetDestination);
      } catch {
        targetUrl = new URL(targetDestination, window.location.origin);
      }

      targetUrl.searchParams.set('taskId', taskId);
      targetUrl.searchParams.set('userId', userProfile.uid);
      targetUrl.searchParams.set('sessionId', sessionId);
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://veloura-quest.vercel.app';
      targetUrl.searchParams.set('returnUrl', `${currentOrigin}/complete?taskId=${taskId}&sessionId=${sessionId}`);

      const redirectUrl = targetUrl.toString();

      // Navigate directly in the same window/tab
      window.location.href = redirectUrl;

      return { success: true, redirectUrl, sessionId };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'taskSessions');
      return { success: false, message: 'Failed to start quest session.' };
    }
  };

  // Admin Methods
  const addNewTask = async (taskData: Omit<TaskItem, 'id'> | {
    title: string;
    description?: string;
    reward: number;
    thumbnailUrl?: string;
    videoUrl?: string;
    adUrl?: string;
    duration?: number;
    category: string;
    createdAt?: string;
    active?: boolean;
  }) => {
    try {
      const createdAt = (taskData as any).createdAt || new Date().toISOString();
      const rewardRaw = (taskData as any).reward !== undefined ? (taskData as any).reward : (taskData as any).rewardAmount;
      const reward = typeof rewardRaw === 'number' ? rewardRaw : parseFloat(rewardRaw);
      
      if (isNaN(reward) || reward < 0.01) {
        throw new Error("Minimum task reward is 0.01 USDT.");
      }

      const isAds = taskData.category === 'Ads';
      let payload: any;

      if (isAds) {
        payload = {
          title: taskData.title?.trim() || 'Advertisement Task',
          category: 'Ads',
          reward,
          adUrl: (taskData as any).adUrl?.trim() || '',
          createdAt,
          active: taskData.active !== undefined ? taskData.active : true
        };
      } else {
        const thumbnailUrl = (taskData as any).thumbnailUrl || (taskData as any).thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
        const duration = (taskData as any).duration !== undefined ? (taskData as any).duration : ((taskData as any).durationSeconds || 30);

        payload = {
          title: taskData.title?.trim() || 'Veloura Video Quest',
          description: taskData.description || 'Veloura Quest',
          reward,
          thumbnailUrl,
          videoUrl: (taskData as any).videoUrl || 'https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC',
          duration,
          category: taskData.category || 'Video',
          createdAt,
          active: taskData.active !== undefined ? taskData.active : true
        };
      }

      const docRef = await addDoc(collection(db, 'tasks'), payload);
      telemetry.recordFirestoreWrite();

      const newTask: TaskItem = {
        id: docRef.id,
        ...payload,
        rewardAmount: reward,
        thumbnail: payload.thumbnailUrl || (isAds ? 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&auto=format&fit=crop&q=80' : undefined),
        durationSeconds: isAds ? 30 : (payload.duration || 30)
      };
      setTasks([...tasks, newTask]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const updateTaskItem = async (task: TaskItem) => {
    try {
      const rewardRaw = task.reward !== undefined ? task.reward : task.rewardAmount;
      const reward = typeof rewardRaw === 'number' ? rewardRaw : parseFloat(rewardRaw as any);
      if (isNaN(reward) || reward < 0.01) {
        throw new Error("Minimum task reward is 0.01 USDT.");
      }

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

  const approveWithdrawal = async (
    id: string, 
    txHash: string, 
    adminNote?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, message: 'Unauthorized action' };
    }

    if (!txHash || !txHash.trim()) {
      return { success: false, message: 'Transaction Hash / TXID is required for payout confirmation' };
    }

    try {
      const cleanTxHash = txHash.trim();
      const cleanNote = adminNote ? adminNote.trim() : '';

      await runTransaction(db, async (transaction) => {
        const wRef = doc(db, 'withdrawals', id);
        const wSnap = await transaction.get(wRef);

        if (!wSnap.exists()) {
          throw new Error('Withdrawal request document not found');
        }

        const wData = wSnap.data() as WithdrawalRequest;
        if (wData.status !== 'pending') {
          throw new Error(`Cannot approve. Withdrawal request is already ${wData.status}.`);
        }

        // Update withdrawal doc
        transaction.update(wRef, {
          status: 'approved',
          processedAt: new Date().toISOString(),
          processedBy: userProfile.uid,
          txHash: cleanTxHash,
          adminNote: cleanNote
        });

        // Add completed transaction record
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: wData.userId,
          type: 'withdrawal',
          amount: -wData.amount,
          currency: 'USDT',
          network: 'TRC20',
          withdrawalId: id,
          txHash: cleanTxHash,
          description: `Withdrawal Paid - TXID: ${cleanTxHash.slice(0, 10)}...`,
          status: 'completed',
          createdAt: new Date().toISOString()
        });
      });

      // Local state updates
      setAllWithdrawals(allWithdrawals.map(w => w.id === id ? {
        ...w,
        status: 'approved',
        processedAt: new Date().toISOString(),
        processedBy: userProfile.uid,
        txHash: cleanTxHash,
        adminNote: cleanNote
      } : w));

      const targetW = allWithdrawals.find(w => w.id === id);
      const targetUserId = targetW ? targetW.userId : '';
      const targetUserEmail = targetW ? targetW.userEmail : '';
      const targetAmount = targetW ? targetW.amount : 0;

      // Add audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId,
        targetUserEmail,
        action: 'withdrawal_override',
        reason: `Approved withdrawal ${id} ($${targetAmount.toFixed(2)} USDT TRC20). TXID: ${cleanTxHash}`,
        createdAt: new Date().toISOString()
      });

      // Send user notification
      if (targetUserId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          title: 'Withdrawal Approved & Paid',
          message: `Your withdrawal request of $${targetAmount.toFixed(2)} USDT (TRC20) has been processed and paid! TXID: ${cleanTxHash}`,
          type: 'withdrawal',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      return { success: true, message: 'Withdrawal request marked as paid and approved!' };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
      return { success: false, message: err?.message || 'Failed to approve withdrawal' };
    }
  };

  const rejectWithdrawal = async (
    id: string, 
    rejectionReason: string, 
    adminNote?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, message: 'Unauthorized action' };
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return { success: false, message: 'Rejection reason is required' };
    }

    try {
      const cleanReason = rejectionReason.trim();
      const cleanNote = adminNote ? adminNote.trim() : '';

      await runTransaction(db, async (transaction) => {
        const wRef = doc(db, 'withdrawals', id);
        const wSnap = await transaction.get(wRef);

        if (!wSnap.exists()) {
          throw new Error('Withdrawal request document not found');
        }

        const wData = wSnap.data() as WithdrawalRequest;
        if (wData.status !== 'pending') {
          throw new Error(`Cannot reject. Withdrawal request is already ${wData.status}.`);
        }

        const uRef = doc(db, 'users', wData.userId);
        const uSnap = await transaction.get(uRef);

        if (uSnap.exists()) {
          const uData = uSnap.data() as UserProfile;
          const currentBal = uData.currentBalance ?? 0;
          const refundedBalance = currentBal + wData.amount;

          // Refund balance to user
          transaction.update(uRef, {
            currentBalance: refundedBalance
          });

          // Create withdrawal_refund transaction record
          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: wData.userId,
            type: 'withdrawal_refund',
            amount: wData.amount,
            currency: 'USDT',
            network: 'TRC20',
            withdrawalId: id,
            description: `Withdrawal Refund: ${cleanReason}`,
            status: 'completed',
            createdAt: new Date().toISOString()
          });
        }

        // Update withdrawal doc to rejected
        transaction.update(wRef, {
          status: 'rejected',
          processedAt: new Date().toISOString(),
          processedBy: userProfile.uid,
          rejectionReason: cleanReason,
          adminNote: cleanNote
        });
      });

      // Update local state
      setAllWithdrawals(allWithdrawals.map(w => w.id === id ? {
        ...w,
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: userProfile.uid,
        rejectionReason: cleanReason,
        adminNote: cleanNote
      } : w));

      const targetW = allWithdrawals.find(w => w.id === id);
      const targetUserId = targetW ? targetW.userId : '';
      const targetUserEmail = targetW ? targetW.userEmail : '';
      const targetAmount = targetW ? targetW.amount : 0;

      // Add audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId,
        targetUserEmail,
        action: 'withdrawal_override',
        reason: `Rejected withdrawal ${id} ($${targetAmount.toFixed(2)} USDT TRC20). Reason: ${cleanReason}`,
        createdAt: new Date().toISOString()
      });

      // Send user notification
      if (targetUserId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          title: 'Withdrawal Request Rejected',
          message: `Your withdrawal request was rejected and the amount has been refunded to your wallet. Reason: ${cleanReason}`,
          type: 'withdrawal',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      return { success: true, message: 'Withdrawal rejected and funds refunded to user balance.' };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
      return { success: false, message: err?.message || 'Failed to reject withdrawal' };
    }
  };

  const updateWithdrawalStatus = async (
    id: string, 
    status: 'approved' | 'rejected',
    txHashOrReason?: string,
    adminNote?: string
  ) => {
    if (status === 'approved') {
      await approveWithdrawal(id, txHashOrReason || 'TXID_MANUAL_APPROVE', adminNote);
    } else {
      await rejectWithdrawal(id, txHashOrReason || 'Administrative decision', adminNote);
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
      approveWithdrawal,
      rejectWithdrawal,
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

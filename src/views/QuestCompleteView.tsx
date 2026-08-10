import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, runTransaction, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { telemetry } from '../lib/telemetry';
import { CheckCircle2, AlertCircle, ShieldAlert, Zap, Clock, ArrowLeft, RefreshCw, DollarSign } from 'lucide-react';

export const QuestCompleteView: React.FC = () => {
  const { currentUser, setCurrentPage, refreshData, startTaskSession, loading: authLoading } = useAuth();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [statusState, setStatusState] = useState<'success' | 'already_claimed' | 'error'>('success');
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'invalid_session' | 'too_early' | 'wrong_user' | 'task_not_found' | 'already_claimed' | 'network_error' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [claimedReward, setClaimedReward] = useState<number>(0);
  const [elapsedTimeInfo, setElapsedTimeInfo] = useState<{ spent: number; required: number } | null>(null);
  const [taskInfo, setTaskInfo] = useState<{ title: string; category: string } | null>(null);

  // Parse URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');
  const sessionId = urlParams.get('sessionId');

  const verifyAndClaimReward = async () => {
    if (!taskId || !sessionId) {
      setStatusState('error');
      setErrorType('invalid_session');
      setErrorMessage('Missing taskId or sessionId parameters in query string.');
      setVerifying(false);
      return;
    }

    if (!currentUser) {
      setStatusState('error');
      setErrorType('unauthenticated');
      setErrorMessage('Authentication required. Please log in to verify quest completion and claim your reward.');
      setVerifying(false);
      return;
    }

    setVerifying(true);
    setErrorType(null);

    try {
      let finalReward = 0;

      // Execute Atomic Transaction for Reward Claiming
      await runTransaction(db, async (tx) => {
        // 1. Fetch taskSessions doc inside transaction
        const sessionRef = doc(db, 'taskSessions', sessionId);
        const sessionSnap = await tx.get(sessionRef);

        if (!sessionSnap.exists()) {
          throw { code: 'INVALID_SESSION', message: 'Task session record not found in Firestore.' };
        }

        const sessionData = sessionSnap.data();

        if (sessionData.sessionId && sessionData.sessionId !== sessionId) {
          throw { code: 'INVALID_SESSION', message: 'Session ID mismatch.' };
        }

        if (sessionData.taskId !== taskId) {
          throw { code: 'INVALID_SESSION', message: 'Task ID mismatch in quest session record.' };
        }

        if (sessionData.userId !== currentUser.uid) {
          throw { code: 'WRONG_USER', message: 'This task session belongs to a different user account.' };
        }

        // Check if reward was already processed
        if (sessionData.rewardStatus === 'credited') {
          throw { code: 'ALREADY_CLAIMED', message: 'Reward Already Claimed.' };
        }

        // Check if attempt previously failed
        if (sessionData.status === 'failed' || sessionData.status === 'expired') {
          throw { code: 'TOO_EARLY', message: 'You left the task too early. Please stay on the task page for 30 seconds.' };
        }

        // 2. SERVER TIMESTAMP 30-SECOND VISIT CHECK
        let startedAtMs = 0;
        if (sessionData.startedAt) {
          if (typeof sessionData.startedAt.toMillis === 'function') {
            startedAtMs = sessionData.startedAt.toMillis();
          } else if (typeof sessionData.startedAt.seconds === 'number') {
            startedAtMs = sessionData.startedAt.seconds * 1000;
          } else if (typeof sessionData.startedAt === 'string') {
            startedAtMs = new Date(sessionData.startedAt).getTime();
          } else if (typeof sessionData.startedAt === 'number') {
            startedAtMs = sessionData.startedAt;
          }
        }

        const requiredSeconds = typeof sessionData.requiredSeconds === 'number' ? sessionData.requiredSeconds : 30;
        const nowMs = Date.now();
        const elapsedSeconds = startedAtMs > 0 ? Math.floor((nowMs - startedAtMs) / 1000) : 0;

        // If returned before required 30 seconds:
        if (elapsedSeconds < requiredSeconds) {
          tx.update(sessionRef, {
            status: 'failed',
            failedReason: 'left_early',
            failedAt: new Date().toISOString(),
            elapsedSeconds
          });

          throw {
            code: 'TOO_EARLY',
            message: 'You left the task too early. Please stay on the task page for 30 seconds.',
            elapsedSeconds,
            requiredSeconds
          };
        }

        // 3. Fetch tasks doc inside transaction to get official reward amount
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await tx.get(taskRef);

        if (!taskSnap.exists()) {
          throw { code: 'TASK_NOT_FOUND', message: 'Quest task not found in database catalog.' };
        }

        const taskData = taskSnap.data();
        const officialReward = typeof taskData.reward === 'number'
          ? taskData.reward
          : (typeof taskData.rewardAmount === 'number' ? taskData.rewardAmount : 5.00);

        finalReward = officialReward;

        // 4. Fetch user profile inside transaction
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists()) {
          throw { code: 'WRONG_USER', message: 'User profile document not found.' };
        }

        const userData = userSnap.data();
        const curBalance = typeof userData.currentBalance === 'number' ? userData.currentBalance : 0;
        const curEarned = typeof userData.totalEarned === 'number' ? userData.totalEarned : 0;

        const newBalance = curBalance + officialReward;
        const newTotalEarned = curEarned + officialReward;

        // Atomic Updates
        tx.update(userRef, {
          currentBalance: newBalance,
          totalEarned: newTotalEarned
        });

        tx.update(sessionRef, {
          status: 'completed',
          rewardStatus: 'credited',
          completedAt: new Date().toISOString(),
          creditedAt: new Date().toISOString(),
          elapsedSeconds
        });

        const txRef = doc(db, 'transactions', `tx_${sessionId}`);
        tx.set(txRef, {
          userId: currentUser.uid,
          taskId: taskId,
          sessionId: sessionId,
          amount: officialReward,
          type: 'task_reward',
          status: 'completed',
          description: `Reward for completing quest: ${taskData.title || 'Veloura Quest'}`,
          createdAt: new Date().toISOString()
        });

        const completionRef = doc(db, 'taskCompletions', `comp_${currentUser.uid}_${sessionId}`);
        tx.set(completionRef, {
          userId: currentUser.uid,
          taskId: taskId,
          sessionId: sessionId,
          rewardAmount: officialReward,
          completedAt: new Date().toISOString()
        });

        const notifRef = doc(collection(db, 'notifications'));
        tx.set(notifRef, {
          userId: currentUser.uid,
          title: '✓ Task Completed',
          message: `✓ Task Completed! +$${officialReward.toFixed(2)} reward added to your wallet.`,
          type: 'reward',
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      telemetry.recordFirestoreWrite();

      // Check & trigger referral bonus if this was user's 1st completed task
      try {
        const completionsQuery = query(collection(db, 'taskCompletions'), where('userId', '==', currentUser.uid));
        const completionsSnap = await getDocs(completionsQuery);
        if (completionsSnap.size === 1) {
          const qRefPending = query(
            collection(db, 'referrals'),
            where('refereeId', '==', currentUser.uid),
            where('status', '==', 'pending')
          );
          const pendingSnap = await getDocs(qRefPending);
          if (!pendingSnap.empty) {
            const refDoc = pendingSnap.docs[0];
            const refData = refDoc.data();
            const rewardAmount = refData.rewardAmount || 5.00;

            await updateDoc(doc(db, 'referrals', refDoc.id), {
              status: 'completed',
              completedAt: new Date().toISOString()
            });

            const referrerUserRef = doc(db, 'users', refData.referrerId);
            const referrerSnap = await getDoc(referrerUserRef);
            if (referrerSnap.exists()) {
              const referrerProfile = referrerSnap.data();
              await updateDoc(referrerUserRef, {
                currentBalance: (referrerProfile.currentBalance || 0) + rewardAmount,
                totalEarned: (referrerProfile.totalEarned || 0) + rewardAmount
              });

              await addDoc(collection(db, 'transactions'), {
                userId: refData.referrerId,
                type: 'referral_bonus',
                amount: rewardAmount,
                description: `Referral Bonus: ${currentUser.displayName || 'Friend'} completed 1st task!`,
                status: 'completed',
                createdAt: new Date().toISOString()
              });

              await addDoc(collection(db, 'notifications'), {
                userId: refData.referrerId,
                title: 'Referral Bonus Unlocked!',
                message: `${currentUser.displayName || 'Friend'} completed their first quest! $${rewardAmount.toFixed(2)} referral bonus was added to your wallet.`,
                type: 'reward',
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      } catch (refErr) {
        console.warn('Referral check non-blocking error:', refErr);
      }

      // Read task info for UI presentation
      try {
        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (taskSnap.exists()) {
          const t = taskSnap.data();
          const reward = typeof t.reward === 'number' ? t.reward : (typeof t.rewardAmount === 'number' ? t.rewardAmount : 5.00);
          setClaimedReward(reward);
          setTaskInfo({ title: t.title || 'Veloura Quest', category: t.category || 'Video' });
        } else {
          setClaimedReward(finalReward || 5.00);
        }
      } catch (e) {
        setClaimedReward(finalReward || 5.00);
      }

      setStatusState('success');
      await refreshData();
    } catch (err: any) {
      console.error('Quest completion transaction error:', err);

      if (err && err.code === 'ALREADY_CLAIMED') {
        try {
          const taskSnap = await getDoc(doc(db, 'tasks', taskId));
          if (taskSnap.exists()) {
            const t = taskSnap.data();
            const reward = typeof t.reward === 'number' ? t.reward : (typeof t.rewardAmount === 'number' ? t.rewardAmount : 5.00);
            setClaimedReward(reward);
            setTaskInfo({ title: t.title || 'Veloura Quest', category: t.category || 'Video' });
          }
        } catch (e) {
          // ignore
        }
        setStatusState('already_claimed');
        setErrorType('already_claimed');
        setErrorMessage('Reward Already Claimed');
      } else if (err && err.code === 'TOO_EARLY') {
        setStatusState('error');
        setErrorType('too_early');
        const spent = typeof err.elapsedSeconds === 'number' ? err.elapsedSeconds : 0;
        const req = typeof err.requiredSeconds === 'number' ? err.requiredSeconds : 30;
        setElapsedTimeInfo({ spent, required: req });
        setErrorMessage('You left the task too early. Please stay on the task page for 30 seconds.');
      } else if (err && err.code) {
        setStatusState('error');
        if (err.code === 'INVALID_SESSION') setErrorType('invalid_session');
        else if (err.code === 'WRONG_USER') setErrorType('wrong_user');
        else if (err.code === 'TASK_NOT_FOUND') setErrorType('task_not_found');
        else setErrorType('network_error');
        setErrorMessage(err.message || 'Quest verification failed');
      } else {
        setStatusState('error');
        setErrorType('network_error');
        setErrorMessage(err?.message || 'Network error occurred while verifying task session.');
      }
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      verifyAndClaimReward();
    }
  }, [authLoading, currentUser, taskId, sessionId]);

  if (authLoading || verifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl electric-gradient-btn animate-spin flex items-center justify-center text-white glow-purple mb-6 shadow-xl">
          <Zap className="w-8 h-8 fill-white/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Verifying Quest Completion...</h2>
        <p className="text-xs text-slate-400 max-w-md font-mono">
          Evaluating 30-second server timestamp visit duration in Firestore...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        {/* 1. SUCCESS STATE */}
        {statusState === 'success' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 glow-emerald animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-widest mb-2">
                ✓ Task Completed
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">Reward Added to Your Wallet</h1>
            </div>

            <div className="py-4 px-6 rounded-2xl bg-slate-900/80 border border-slate-800 w-full flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Credited Reward</span>
              <span className="text-4xl font-black text-emerald-400 tracking-tight font-mono">
                +${claimedReward.toFixed(2)}
              </span>
              {taskInfo && (
                <p className="text-xs font-semibold text-purple-300 mt-2 line-clamp-1">
                  {taskInfo.title}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Reward added to your wallet.
              </p>
            </div>

            <button
              onClick={() => setCurrentPage('home')}
              className="w-full py-4 rounded-xl electric-gradient-btn text-sm font-bold text-white shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}

        {/* 2. REWARD ALREADY CLAIMED STATE */}
        {statusState === 'already_claimed' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-2">
                Already Processed
              </span>
              <h1 className="text-2xl font-black text-slate-100">Reward Already Claimed</h1>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              The reward for this quest session (${claimedReward.toFixed(2)}) has already been credited to your wallet balance.
            </p>

            <button
              onClick={() => setCurrentPage('home')}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}

        {/* 3. RETURNED TOO EARLY STATE */}
        {statusState === 'error' && errorType === 'too_early' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl">
              <Clock className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold uppercase tracking-widest mb-2">
                Try Again
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                You left the task too early.
              </h1>
              <p className="text-xs text-slate-300 mt-2 max-w-sm leading-relaxed">
                Please stay on the task page for 30 seconds.
              </p>
            </div>

            {elapsedTimeInfo && (
              <div className="py-3.5 px-5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full font-mono text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Your Time Spent:</span>
                  <span className="text-rose-400 font-bold">{elapsedTimeInfo.spent}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Required Time:</span>
                  <span className="text-emerald-400 font-bold">{elapsedTimeInfo.required}s</span>
                </div>
              </div>
            )}

            <div className="space-y-3 w-full pt-2">
              <button
                onClick={() => taskId && startTaskSession(taskId)}
                className="w-full py-4 rounded-xl electric-gradient-btn text-sm font-bold text-white shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Start Task Again</span>
              </button>

              <button
                onClick={() => setCurrentPage('home')}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. OTHER ERROR STATES */}
        {statusState === 'error' && errorType !== 'too_early' && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100 mb-1">
                {errorType === 'unauthenticated' && 'Authentication Required'}
                {errorType === 'invalid_session' && 'Invalid Quest Session'}
                {errorType === 'wrong_user' && 'Account Mismatch'}
                {errorType === 'task_not_found' && 'Quest Task Not Found'}
                {errorType === 'network_error' && 'Verification Error'}
              </h2>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {errorMessage || 'Unable to verify quest completion.'}
              </p>
            </div>

            {errorType === 'unauthenticated' && (
              <button
                onClick={() => setCurrentPage('login')}
                className="w-full py-3.5 rounded-xl electric-gradient-btn text-sm font-bold text-white shadow-lg"
              >
                Log In to Claim Reward
              </button>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              {errorType !== 'unauthenticated' && (
                <button
                  onClick={verifyAndClaimReward}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Retry Verification</span>
                </button>
              )}

              <button
                onClick={() => setCurrentPage('home')}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, runTransaction, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { telemetry } from '../lib/telemetry';
import { processTaskReferralCommission } from '../lib/referralCommission';
import { CheckCircle2, AlertCircle, ShieldAlert, Zap, Clock, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

export const QuestCompleteView: React.FC = () => {
  const { currentUser, setCurrentPage, refreshData, startTaskSession, loading: authLoading } = useAuth();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [statusState, setStatusState] = useState<'ready_to_claim' | 'success' | 'already_claimed' | 'error'>('ready_to_claim');
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'invalid_session' | 'too_early' | 'wrong_user' | 'task_not_found' | 'already_claimed' | 'network_error' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [claimedReward, setClaimedReward] = useState<number>(0);
  const [elapsedTimeInfo, setElapsedTimeInfo] = useState<{ spent: number; required: number } | null>(null);
  const [taskInfo, setTaskInfo] = useState<{ title: string; category: string } | null>(null);
  const [isClaimingInView, setIsClaimingInView] = useState<boolean>(false);

  // Parse URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');
  const sessionId = urlParams.get('sessionId');

  // Step 1: Check session eligibility without claiming immediately
  const checkSessionEligibility = async () => {
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
      const sessionRef = doc(db, 'taskSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setStatusState('error');
        setErrorType('invalid_session');
        setErrorMessage('Task session record not found in Firestore.');
        setVerifying(false);
        return;
      }

      const sessionData = sessionSnap.data();

      if (sessionData.sessionId && sessionData.sessionId !== sessionId) {
        setStatusState('error');
        setErrorType('invalid_session');
        setErrorMessage('Session ID mismatch.');
        setVerifying(false);
        return;
      }

      if (sessionData.taskId !== taskId) {
        setStatusState('error');
        setErrorType('invalid_session');
        setErrorMessage('Task ID mismatch in quest session record.');
        setVerifying(false);
        return;
      }

      if (sessionData.userId !== currentUser.uid) {
        setStatusState('error');
        setErrorType('wrong_user');
        setErrorMessage('This task session belongs to a different user account.');
        setVerifying(false);
        return;
      }

      if (sessionData.rewardStatus === 'credited' || sessionData.status === 'completed') {
        setStatusState('already_claimed');
        setErrorType('already_claimed');
        setVerifying(false);
        return;
      }

      if (sessionData.status === 'failed' || sessionData.status === 'expired') {
        setStatusState('error');
        setErrorType('too_early');
        setErrorMessage('You left the task too early. Please stay on the task page for 30 seconds.');
        setVerifying(false);
        return;
      }

      // Check visit duration using timestamp
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

      if (elapsedSeconds < requiredSeconds) {
        await updateDoc(sessionRef, {
          status: 'failed',
          failedReason: 'left_early',
          failedAt: new Date().toISOString(),
          elapsedSeconds
        });

        setStatusState('error');
        setErrorType('too_early');
        setElapsedTimeInfo({ spent: elapsedSeconds, required: requiredSeconds });
        setErrorMessage('You left the task too early. Please stay on the task page for 30 seconds.');
        setVerifying(false);
        return;
      }

      // Read task reward info
      try {
        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (taskSnap.exists()) {
          const t = taskSnap.data();
          const reward = typeof t.reward === 'number' ? t.reward : (typeof t.rewardAmount === 'number' ? t.rewardAmount : 5.00);
          setClaimedReward(reward);
          setTaskInfo({ title: t.title || 'Veloura Quest', category: t.category || 'Video' });
        } else {
          setClaimedReward(5.00);
        }
      } catch (e) {
        setClaimedReward(5.00);
      }

      // 30 seconds completed -> ready to claim!
      setStatusState('ready_to_claim');
    } catch (err: any) {
      console.error('Session check error:', err);
      setStatusState('error');
      setErrorType('network_error');
      setErrorMessage(err?.message || 'Error checking session duration');
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Execute Reward Claim Transaction when 'Claim Rewards' button clicked
  const executeClaimReward = async () => {
    if (!taskId || !sessionId || !currentUser || isClaimingInView) return;

    setIsClaimingInView(true);

    try {
      let finalReward = 0;

      await runTransaction(db, async (tx) => {
        const sessionRef = doc(db, 'taskSessions', sessionId);
        const sessionSnap = await tx.get(sessionRef);

        if (!sessionSnap.exists()) {
          throw { code: 'INVALID_SESSION', message: 'Task session record not found in Firestore.' };
        }

        const sessionData = sessionSnap.data();

        if (sessionData.rewardStatus === 'credited') {
          throw { code: 'ALREADY_CLAIMED', message: 'Reward Already Claimed.' };
        }

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

        tx.update(userRef, {
          currentBalance: newBalance,
          totalEarned: newTotalEarned
        });

        tx.update(sessionRef, {
          status: 'completed',
          rewardStatus: 'credited',
          completedAt: new Date().toISOString(),
          creditedAt: new Date().toISOString()
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

      // Process 50% referral commission for referrer
      try {
        const taskCompletionId = `comp_${currentUser.uid}_${sessionId}`;
        await processTaskReferralCommission({
          taskCompletionId: taskCompletionId,
          referredUserId: currentUser.uid,
          referredUserName: currentUser.displayName || '',
          taskReward: finalReward
        });
      } catch (refErr) {
        console.warn('Referral commission error:', refErr);
      }

      setClaimedReward(finalReward);
      setStatusState('success');
      await refreshData();
    } catch (err: any) {
      console.error('Claim reward error:', err);
      if (err?.code === 'ALREADY_CLAIMED') {
        setStatusState('already_claimed');
      } else {
        setStatusState('error');
        setErrorMessage(err?.message || 'Failed to claim reward');
      }
    } finally {
      setIsClaimingInView(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      checkSessionEligibility();
    }
  }, [authLoading, currentUser, taskId, sessionId]);

  if (authLoading || verifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl electric-gradient-btn animate-spin flex items-center justify-center text-white glow-purple mb-6 shadow-xl">
          <Zap className="w-8 h-8 fill-white/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Verifying Task Visit Duration...</h2>
        <p className="text-xs text-slate-400 max-w-md font-mono">
          Evaluating 30-second visit duration in Firestore...
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

        {/* 1. 30 SECONDS COMPLETED -> READY TO CLAIM STATE */}
        {statusState === 'ready_to_claim' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 glow-emerald animate-pulse">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">
                ✓ 30 Seconds Completed!
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">You are Eligible for Reward</h1>
              <p className="text-xs text-slate-300 mt-2 max-w-sm">
                You stayed on the task page for 30 seconds. Click below to claim your reward into your wallet.
              </p>
            </div>

            <button
              onClick={executeClaimReward}
              disabled={isClaimingInView}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-base font-black text-white shadow-2xl glow-emerald flex items-center justify-center gap-2.5 transition-all animate-bounce"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                {isClaimingInView ? 'Claiming Reward...' : `Claim Rewards ($${claimedReward.toFixed(2)})`}
              </span>
            </button>
          </div>
        )}

        {/* 2. SUCCESS STATE (AFTER CLAIMING) */}
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

        {/* 3. REWARD ALREADY CLAIMED STATE */}
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
              The reward for this quest session has already been credited to your wallet balance.
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

        {/* 4. RETURNED TOO EARLY STATE ("TRY AGAIN") */}
        {statusState === 'error' && errorType === 'too_early' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl">
              <Clock className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-widest mb-2">
                Try Again
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                You left the task too early.
              </h1>
              <p className="text-xs text-slate-300 mt-2 max-w-sm leading-relaxed">
                Please stay on the task page for at least 30 seconds to earn your reward.
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-sm font-extrabold text-white shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again (Start Task Again)</span>
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

        {/* 5. OTHER ERROR STATES */}
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
                  onClick={checkSessionEligibility}
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

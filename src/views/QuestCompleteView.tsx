import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, runTransaction, updateDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { telemetry } from '../lib/telemetry';
import { CheckCircle2, AlertCircle, ShieldAlert, Zap, Clock, ArrowLeft, RefreshCw, DollarSign, ExternalLink } from 'lucide-react';

export const QuestCompleteView: React.FC = () => {
  const { currentUser, setCurrentPage, refreshData, loading: authLoading } = useAuth();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [statusState, setStatusState] = useState<'success' | 'already_claimed' | 'error'>('success');
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'invalid_session' | 'session_not_completed' | 'wrong_user' | 'task_not_found' | 'already_claimed' | 'network_error' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [claimedReward, setClaimedReward] = useState<number>(0);
  const [taskInfo, setTaskInfo] = useState<{ title: string; category: string } | null>(null);
  const [simulatingCompletion, setSimulatingCompletion] = useState<boolean>(false);

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

        // Check if status is completed
        if (sessionData.status !== 'completed') {
          throw { code: 'SESSION_NOT_COMPLETED', message: 'Quest session has not been marked as completed by external verification service.' };
        }

        // 2. Fetch tasks doc inside transaction to get official reward amount
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await tx.get(taskRef);

        if (!taskSnap.exists()) {
          throw { code: 'TASK_NOT_FOUND', message: 'Quest task not found in database catalog.' };
        }

        const taskData = taskSnap.data();
        const officialReward = typeof taskData.reward === 'number'
          ? taskData.reward
          : (typeof taskData.rewardAmount === 'number' ? taskData.rewardAmount : 5.00);

        // 3. Fetch user profile inside transaction
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
          rewardStatus: 'credited',
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
          description: `Reward for completing quest: ${taskData.title || 'External Quest'}`,
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
          title: 'Quest Completed!',
          message: 'Quest completed! Your reward has been added.',
          type: 'reward',
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      telemetry.recordFirestoreWrite();

      // Read task info for UI presentation
      try {
        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (taskSnap.exists()) {
          const t = taskSnap.data();
          const reward = typeof t.reward === 'number' ? t.reward : (typeof t.rewardAmount === 'number' ? t.rewardAmount : 5.00);
          setClaimedReward(reward);
          setTaskInfo({ title: t.title || 'Veloura Quest', category: t.category || 'Video' });
        }
      } catch (e) {
        console.warn('Could not read task details for presentation', e);
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
      } else if (err && err.code) {
        setStatusState('error');
        if (err.code === 'INVALID_SESSION') setErrorType('invalid_session');
        else if (err.code === 'SESSION_NOT_COMPLETED') setErrorType('session_not_completed');
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

  // Helper function for external verification simulation in preview environment
  const handleSimulateCompletion = async () => {
    if (!sessionId) return;
    setSimulatingCompletion(true);
    try {
      const sessionRef = doc(db, 'taskSessions', sessionId);
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      telemetry.recordFirestoreWrite();
      await verifyAndClaimReward();
    } catch (err) {
      console.error('Error setting session status to completed:', err);
      setErrorMessage('Failed to update session status in Firestore.');
    } finally {
      setSimulatingCompletion(false);
    }
  };

  if (authLoading || verifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl electric-gradient-btn animate-spin flex items-center justify-center text-white glow-purple mb-6 shadow-xl">
          <Zap className="w-8 h-8 fill-white/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Verifying Quest Session...</h2>
        <p className="text-xs text-slate-400 max-w-md font-mono">
          Connecting to Veloura Firestore to validate task session parameters...
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
                ✓ Quest Completed
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">Reward Added</h1>
            </div>

            <div className="py-4 px-6 rounded-2xl bg-slate-900/80 border border-slate-800 w-full flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Credited Balance</span>
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
              The reward for this quest session (${claimedReward.toFixed(2)}) has already been credited to your account balance.
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

        {/* 3. ERROR STATES */}
        {statusState === 'error' && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100 mb-1">
                {errorType === 'unauthenticated' && 'Authentication Required'}
                {errorType === 'invalid_session' && 'Invalid Quest Session'}
                {errorType === 'session_not_completed' && 'Session Not Completed'}
                {errorType === 'wrong_user' && 'Account Mismatch'}
                {errorType === 'task_not_found' && 'Quest Task Not Found'}
                {errorType === 'network_error' && 'Verification Error'}
              </h2>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {errorMessage || 'Unable to verify quest completion.'}
              </p>
            </div>

            {/* Special Action for Session Not Completed in Dev environment */}
            {errorType === 'session_not_completed' && (
              <div className="w-full p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400" /> External Service Verification
                  </span>
                  <span className="text-[10px] uppercase font-mono text-purple-400">Pending</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  The external quest service has not marked this session as completed in Firestore yet.
                </p>
                <button
                  onClick={handleSimulateCompletion}
                  disabled={simulatingCompletion}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulatingCompletion ? 'animate-spin' : ''}`} />
                  <span>{simulatingCompletion ? 'Updating Firestore Session...' : 'Mark Session Completed & Claim'}</span>
                </button>
              </div>
            )}

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

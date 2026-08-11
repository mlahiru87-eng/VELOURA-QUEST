import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Play, CheckCircle2, Sparkles, Clock, DollarSign, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface TaskExecutionModalProps {
  task: TaskItem | null;
  onClose: () => void;
  isAlreadyCompleted: boolean;
}

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({ task, onClose, isAlreadyCompleted }) => {
  const { claimTaskReward, startTaskSession } = useAuth();
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(isAlreadyCompleted);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimedSuccess, setClaimedSuccess] = useState<boolean>(false);

  // 30-Second Countdown Timer States
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);
  const [showTryAgain, setShowTryAgain] = useState<boolean>(false);

  useEffect(() => {
    if (task) {
      setIsStarting(false);
      setIsCompleted(isAlreadyCompleted);
      setClaimedSuccess(false);
      setTimerRunning(false);
      setTimeLeft(30);
      setTimerFinished(false);
      setShowTryAgain(false);
    }
  }, [task, isAlreadyCompleted]);

  // 30-second live countdown interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            setTimerFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timeLeft]);

  if (!task) return null;

  const handleStartTask = async () => {
    if (isStarting || timerRunning) return;
    setIsStarting(true);
    setShowTryAgain(false);
    setTimeLeft(30);
    setTimerFinished(false);

    const res = await startTaskSession(task.id);
    setIsStarting(false);

    if (res.success) {
      setTimerRunning(true);
    } else {
      setShowTryAgain(true);
    }
  };

  const handleEarlyClaimAttempt = () => {
    if (timerRunning && timeLeft > 0) {
      setShowTryAgain(true);
    }
  };

  const handleClaim = async () => {
    if (isClaiming || claimedSuccess) return;
    setIsClaiming(true);
    const result = await claimTaskReward(task.id);
    setIsClaiming(false);

    if (typeof result === 'boolean' ? result : result?.success) {
      setClaimedSuccess(true);
      setIsCompleted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setShowTryAgain(true);
    }
  };

  const rewardVal = task.reward ?? task.rewardAmount ?? 5.00;

  return (
    <div id="task-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl space-y-6 overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {task.category} Quest
            </span>
            <h3 className="text-xl font-bold text-slate-100 mt-2">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail Preview / Task Display */}
        <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-700/60 group">
          <img
            src={task.thumbnailUrl || task.thumbnail}
            alt={task.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-md">
              <DollarSign className="w-4 h-4" /> Reward: ${rewardVal.toFixed(2)}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 text-blue-400 border border-blue-500/30 backdrop-blur-md">
              <Clock className="w-4 h-4" /> 30s Task Visit
            </span>
          </div>
        </div>

        {/* Execution Requirement Info & Action Section */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          {/* TRY AGAIN WARNING BANNER */}
          {showTryAgain && !timerFinished && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-black text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Try Again (ට්රයි අගේන්)</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-200/90">
                You left the task page too early! Please stay on the task page for the full 30 seconds to unlock your reward.
              </p>
              <button
                onClick={handleStartTask}
                className="mt-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again (Start Task Again)</span>
              </button>
            </div>
          )}

          {!isAlreadyCompleted && !claimedSuccess && (
            <>
              {/* 1. INITIAL UNSTARTED STATE */}
              {!timerRunning && !timerFinished && (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/20 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span>30-Second Task Visit Required</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Please stay on the task page for at least 30 seconds. A 30-second timer will count down before you can claim your reward.
                    </p>
                  </div>

                  <button
                    onClick={handleStartTask}
                    disabled={isStarting}
                    className="w-full py-3.5 rounded-xl electric-gradient-btn text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
                    <span>{isStarting ? 'Opening Task Link...' : 'Start Task (30 Seconds)'}</span>
                  </button>
                </>
              )}

              {/* 2. ACTIVE 30-SECOND COUNTDOWN TIMER */}
              {timerRunning && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                        <span>30s Countdown Running...</span>
                      </span>
                      <span className="text-amber-400 font-mono text-sm">{timeLeft}s remaining</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-1000 ease-linear"
                        style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      Please stay on the task page for 30 seconds to unlock your cash reward.
                    </p>
                  </div>

                  <button
                    onClick={handleEarlyClaimAttempt}
                    className="w-full py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-400 border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Please Wait ({timeLeft}s remaining...)</span>
                  </button>
                </div>
              )}

              {/* 3. 30 SECONDS COMPLETED -> SHOW 'CLAIM REWARDS' BUTTON */}
              {timerFinished && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>✓ 30 Seconds Completed! You can now claim your reward.</span>
                  </div>

                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-base font-black text-white shadow-2xl glow-emerald flex items-center justify-center gap-2.5 transition-all animate-bounce"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>{isClaiming ? 'Claiming Reward...' : `Claim Rewards (කලේම් රිවෝර්ඩ්ස් - $${rewardVal.toFixed(2)})`}</span>
                  </button>
                </div>
              )}
            </>
          )}

          {claimedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-sm font-extrabold flex items-center justify-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>✓ Reward Claimed Successfully! Balance Updated.</span>
            </div>
          )}

          {isAlreadyCompleted && !claimedSuccess && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-center text-xs font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>You have already completed this daily quest today.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

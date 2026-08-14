import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Play, CheckCircle2, Sparkles, Clock, DollarSign, ShieldCheck, AlertCircle, RefreshCw, Megaphone, Film } from 'lucide-react';

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

  const isAd = task.category === 'Ads';

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
    <div id="task-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-6 overflow-hidden ${
        isAd ? 'border-amber-500/40' : 'border-rose-500/40'
      }`}>
        {/* Glow ambient background elements */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
          isAd ? 'bg-amber-600/25' : 'bg-rose-600/25'
        }`}></div>
        <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
          isAd ? 'bg-rose-600/20' : 'bg-red-600/20'
        }`}></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isAd 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              {isAd ? <Megaphone className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-rose-400" />}
              {isAd ? 'Ads Task' : `${task.category} Quest`}
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
          {task.thumbnailUrl || task.thumbnail ? (
            <img
              src={task.thumbnailUrl || task.thumbnail}
              alt={task.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${
              isAd 
                ? 'bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900' 
                : 'bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900'
            }`}>
              {isAd ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                    <Megaphone className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-200">Sponsored Advertisement</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">Stay on the sponsor page for 30 seconds</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3 shadow-lg">
                    <Film className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-200">{task.title}</h4>
                </>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-semibold z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-md">
              <DollarSign className="w-4 h-4" /> Reward: ${rewardVal.toFixed(2)}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 text-blue-400 border border-blue-500/30 backdrop-blur-md">
              <Clock className="w-4 h-4" /> 30s {isAd ? 'Ad Visit' : 'Task Visit'}
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
                <span>Try Again</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-200/90">
                {isAd 
                  ? 'You left the advertisement page too early! Please stay on the ad page for the full 30 seconds to unlock your reward.'
                  : 'You left the task page too early! Please stay on the task page for the full 30 seconds to unlock your reward.'}
              </p>
              <button
                onClick={handleStartTask}
                className="mt-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again ({isAd ? 'Start Ad Again' : 'Start Task Again'})</span>
              </button>
            </div>
          )}

          {!isAlreadyCompleted && !claimedSuccess && (
            <>
              {/* 1. INITIAL UNSTARTED STATE */}
              {!timerRunning && !timerFinished && (
                <>
                  <div className={`p-3.5 rounded-2xl bg-slate-900/90 border text-xs text-slate-300 space-y-1 ${
                    isAd ? 'border-amber-500/30' : 'border-rose-500/30'
                  }`}>
                    <div className={`flex items-center gap-1.5 font-bold ${isAd ? 'text-amber-300' : 'text-rose-300'}`}>
                      <Clock className={`w-4 h-4 ${isAd ? 'text-amber-400' : 'text-rose-400'}`} />
                      <span>30-Second {isAd ? 'Ad Visit' : 'Task Visit'} Required</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isAd 
                        ? 'Please visit the advertisement and stay on the page for at least 30 seconds. A 30-second countdown will track your visit before you can claim your cash reward.'
                        : 'Please stay on the task page for at least 30 seconds. A 30-second timer will count down before you can claim your reward.'}
                    </p>
                  </div>

                  <button
                    onClick={handleStartTask}
                    disabled={isStarting}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 transition-all hover:scale-[1.02] ${
                      isAd 
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 glow-amber' 
                        : 'electric-gradient-btn'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
                    <span>{isStarting ? (isAd ? 'Opening Advertisement...' : 'Opening Task Link...') : (isAd ? 'Start Ad (30 Seconds)' : 'Start Task (30 Seconds)')}</span>
                  </button>
                </>
              )}

              {/* 2. ACTIVE 30-SECOND COUNTDOWN TIMER */}
              {timerRunning && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl space-y-3 ${
                    isAd ? 'bg-amber-950/40 border border-amber-500/40' : 'bg-rose-950/40 border border-rose-500/40'
                  }`}>
                    <div className={`flex items-center justify-between text-xs font-bold ${
                      isAd ? 'text-amber-200' : 'text-rose-200'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 animate-spin ${isAd ? 'text-amber-400' : 'text-rose-400'}`} />
                        <span>30s Countdown Running...</span>
                      </span>
                      <span className="text-amber-400 font-mono text-sm">{timeLeft}s remaining</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-1000 ease-linear ${
                          isAd 
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500' 
                            : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400'
                        }`}
                        style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      {isAd 
                        ? 'Please stay on the advertisement page for 30 seconds to unlock your cash reward.'
                        : 'Please stay on the task page for 30 seconds to unlock your cash reward.'}
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
                    <span>{isClaiming ? 'Claiming Reward...' : `Claim Rewards ($${rewardVal.toFixed(2)})`}</span>
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

import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Play, CheckCircle2, Sparkles, Clock, DollarSign, ShieldCheck } from 'lucide-react';

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

  useEffect(() => {
    if (task) {
      setIsStarting(false);
      setIsCompleted(isAlreadyCompleted);
      setClaimedSuccess(false);
    }
  }, [task, isAlreadyCompleted]);

  if (!task) return null;

  const handleStartTask = async () => {
    if (isStarting) return;
    setIsStarting(true);
    await startTaskSession(task.id);
  };

  const handleClaim = async () => {
    if (isClaiming || claimedSuccess) return;
    setIsClaiming(true);
    const success = await claimTaskReward(task.id);
    setIsClaiming(false);
    if (success) {
      setClaimedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

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
              <DollarSign className="w-4 h-4" /> Reward: ${(task.reward ?? task.rewardAmount ?? 0).toFixed(2)}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 text-blue-400 border border-blue-500/30 backdrop-blur-md">
              <Clock className="w-4 h-4" /> {task.duration ?? task.durationSeconds ?? 30}s Quest
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>

        {/* Execution Timer & Action Section */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          {!isAlreadyCompleted && (
            <button
              onClick={handleStartTask}
              disabled={isStarting}
              className="w-full py-3.5 rounded-xl electric-gradient-btn text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
              <span>{isStarting ? 'Redirecting to External Quest...' : `Start Quest (${task.duration ?? task.durationSeconds ?? 30} Seconds)`}</span>
            </button>
          )}

          {isCompleted && !isAlreadyCompleted && !claimedSuccess && (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-xl glow-purple flex items-center justify-center gap-2 transition-all animate-bounce"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{isClaiming ? 'Claiming Reward...' : `Claim $${task.rewardAmount.toFixed(2)} Reward`}</span>
            </button>
          )}

          {claimedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Reward claimed successfully! Balance updated.</span>
            </div>
          )}

          {isAlreadyCompleted && !claimedSuccess && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-center text-xs font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>You have already completed this daily quest today.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

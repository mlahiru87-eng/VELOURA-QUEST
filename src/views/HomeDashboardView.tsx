import React, { useState } from 'react';
import { useAuth, isTaskCompletedToday } from '../context/AuthContext';
import { TaskItem } from '../types';
import { TaskExecutionModal } from '../components/TaskExecutionModal';
import { 
  Wallet, 
  TrendingUp, 
  Trophy, 
  CheckCircle2, 
  Sparkles, 
  Users, 
  Copy, 
  ChevronRight, 
  Play, 
  Clock, 
  Gift,
  Zap,
  Check,
  Flame,
  Lock,
  ShieldCheck
} from 'lucide-react';

export const HomeDashboardView: React.FC = () => {
  const { userProfile, tasks, taskCompletions, referrals, setCurrentPage } = useAuth();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!userProfile) return null;

  // Active 5 daily tasks
  const daily5Tasks = tasks.filter(t => t.active !== false).slice(0, 5);
  // Tasks completed TODAY in user's local timezone
  const completedTaskIds = new Set(
    taskCompletions.filter(tc => isTaskCompletedToday(tc.completedAt)).map((tc) => tc.taskId)
  );
  const completedCount = daily5Tasks.filter((t) => completedTaskIds.has(t.id)).length;
  const progressPercent = Math.round((completedCount / 5) * 100);

  // Today's earnings calculation
  const todaysEarnings = taskCompletions
    .filter((tc) => isTaskCompletedToday(tc.completedAt))
    .reduce((sum, tc) => sum + (tc.claimedAmount || 0), 0);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://veloura-quest.vercel.app';
  const referralLink = `${appOrigin}/?ref=${userProfile.referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="home-dashboard" className="space-y-6 pb-20 md:pb-8">
      {/* 18+ Animated Age Verification Header Banner */}
      <div className="relative glass-panel rounded-2xl p-3 sm:p-4 border border-rose-500/40 overflow-hidden flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-950 pointer-events-none"></div>
        <div className="relative z-10 flex items-center space-x-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white border border-rose-400 animated-18-badge flex items-center gap-1 shrink-0">
            <Lock className="w-3.5 h-3.5" /> 18+ MATURE CONTENT
          </span>
          <div className="text-xs">
            <span className="font-bold text-slate-100 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-500 animate-pulse" /> Verified 18+ Adult Portal
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Must be 18 years or older to participate in daily rewarded web quests.</span>
          </div>
        </div>
        <div className="relative z-10 flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Age Verified
          </span>
        </div>
      </div>

      {/* User Welcome Profile Banner */}
      <div className="relative glass-panel rounded-3xl p-6 sm:p-8 overflow-hidden border border-rose-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={userProfile.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/50 glow-red shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 p-1 rounded-md bg-rose-600 text-white shadow-md">
                <Zap className="w-3.5 h-3.5 fill-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-100">{userProfile.displayName}</h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600/30 text-rose-300 border border-rose-500/40 uppercase">
                  18+ Member
                </span>
                {userProfile.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Referral Code:{' '}
                <span className="font-mono font-bold text-rose-300">{userProfile.referralCode}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setCurrentPage('tasks')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 hover:scale-105 transition-transform"
            >
              <Sparkles className="w-4 h-4" /> Start 18+ Quests
            </button>
            <button
              onClick={() => setCurrentPage('wallet')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl glass-panel hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> Cash Out Wallet
            </button>
          </div>
        </div>
      </div>


      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wallet Balance</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">${userProfile.currentBalance.toFixed(2)}</div>
          <p className="text-[10px] text-slate-400 mt-1">Available to withdraw</p>
        </div>

        {/* Today's Earnings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100">${todaysEarnings.toFixed(2)}</div>
          <p className="text-[10px] text-slate-400 mt-1">Earned today in local timezone</p>
        </div>

        {/* Total Earnings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Earned</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300">${userProfile.totalEarned.toFixed(2)}</div>
          <p className="text-[10px] text-slate-400 mt-1">Lifetime rewards claimed</p>
        </div>

        {/* Daily Progress */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Daily Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">{completedCount} / 5</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-700">
            <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Today's 5 Daily Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" /> Today's 5 Daily Tasks
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Resets automatically every 24 hours in your local timezone</p>
          </div>
          <button
            onClick={() => setCurrentPage('tasks')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
          >
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daily5Tasks.map((task) => {
            const isCompleted = completedTaskIds.has(task.id);
            return (
              <div
                key={task.id}
                className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80 hover:border-purple-500/40 transition-all p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex space-x-3">
                  <img
                    src={task.thumbnail}
                    alt={task.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {task.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 mt-1 line-clamp-1">{task.title}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-emerald-400">${task.rewardAmount.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {task.durationSeconds}s
                    </span>
                  </div>

                  {isCompleted ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 text-xs font-bold border border-emerald-500/30 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="px-3 py-1.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-md inline-flex items-center gap-1 hover:scale-105 transition-transform"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Summary Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Users className="w-3.5 h-3.5 text-amber-400" /> Instant Referral Bonus
          </span>
          <h3 className="text-lg font-bold text-slate-100">Invite Friends & Unlock $5.00 Cash per Referral</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Share your exclusive referral code. When your referred friend completes their 1st daily quest, you instantly unlock $5.00 cash directly in your wallet!
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-amber-300 text-center">
            {userProfile.referralCode}
          </div>
          <button
            onClick={copyReferral}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Referral Link'}</span>
          </button>
        </div>
      </div>

      {/* Task Execution Modal */}
      {selectedTask && (
        <TaskExecutionModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          isAlreadyCompleted={completedTaskIds.has(selectedTask.id)}
        />
      )}
    </div>
  );
};

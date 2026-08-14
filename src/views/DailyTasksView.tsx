import React, { useState } from 'react';
import { useAuth, isTaskCompletedToday } from '../context/AuthContext';
import { TaskItem } from '../types';
import { TaskExecutionModal } from '../components/TaskExecutionModal';
import { 
  CheckSquare, 
  Sparkles, 
  Clock, 
  Play, 
  ShieldCheck, 
  Check,
  Megaphone,
  Film
} from 'lucide-react';

export const DailyTasksView: React.FC = () => {
  const { tasks, taskCompletions } = useAuth();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Filter daily active tasks
  const daily5Tasks = tasks.filter(t => t.active !== false).slice(0, 8);
  const completedTaskIds = new Set(
    taskCompletions.filter(tc => isTaskCompletedToday(tc.completedAt)).map((tc) => tc.taskId)
  );

  const filteredTasks = daily5Tasks.filter((t) => {
    if (filterCategory === 'All') return true;
    return t.category === filterCategory;
  });

  const categories = ['All', 'Video', 'Ads', 'Survey', 'Game Quest', 'App Install', 'Special'];

  return (
    <div id="daily-tasks-view" className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Daily Rewards Hub
          </span>
          <h2 className="text-2xl font-black text-slate-100">Daily Quests</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Complete your assigned daily video and advertisement tasks to unlock instant cash rewards. Daily tasks reset every 24 hours based on your local timezone.
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterCategory === cat
                ? 'electric-gradient-btn text-white shadow-md glow-purple'
                : 'glass-panel text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'Ads' ? '📢 Ads' : cat === 'Video' ? '🎬 Video' : cat}
          </button>
        ))}
      </div>

      {/* Daily Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">No tasks in this category</p>
            <p className="text-xs text-slate-500 mt-1">Switch to "All" to view all available daily quests.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = completedTaskIds.has(task.id);
            const isAd = task.category === 'Ads';

            return (
              <div
                key={task.id}
                className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCompleted 
                    ? 'border-emerald-500/30 bg-slate-900/60' 
                    : isAd
                    ? 'border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-amber-950/20'
                    : 'border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="relative shrink-0">
                    {task.thumbnailUrl || task.thumbnail ? (
                      <img
                        src={task.thumbnailUrl || task.thumbnail}
                        alt={task.title}
                        className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-md"
                      />
                    ) : (
                      <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border shadow-md ${
                        isAd 
                          ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/40 text-purple-300'
                      }`}>
                        {isAd ? <Megaphone className="w-8 h-8 text-amber-400" /> : <Film className="w-8 h-8 text-purple-400" />}
                      </div>
                    )}
                    {isCompleted && (
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isAd 
                          ? 'text-amber-300 bg-amber-500/20 border-amber-500/30' 
                          : 'text-purple-300 bg-purple-500/20 border-purple-500/30'
                      }`}>
                        {isAd ? '📢 Ads' : task.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> {task.duration ?? task.durationSeconds ?? 30} Seconds
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">{task.title}</h3>
                    {isAd && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        Visit the advertisement and stay on the page for 30 seconds.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Reward</span>
                    <span className="text-lg font-black text-emerald-400">${(task.reward ?? task.rewardAmount ?? 0).toFixed(2)}</span>
                  </div>

                  {isCompleted ? (
                    <button
                      disabled
                      className="px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 inline-flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Claimed Today
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedTask(task)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg inline-flex items-center gap-2 hover:scale-105 transition-transform ${
                        isAd 
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 glow-amber' 
                          : 'electric-gradient-btn'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-white" /> {isAd ? 'Start Ad' : 'Start Task'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Modal */}
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

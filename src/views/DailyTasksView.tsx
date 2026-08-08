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
  Check
} from 'lucide-react';

export const DailyTasksView: React.FC = () => {
  const { tasks, taskCompletions } = useAuth();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Filter 5 daily active tasks
  const daily5Tasks = tasks.filter(t => t.active !== false).slice(0, 5);
  const completedTaskIds = new Set(
    taskCompletions.filter(tc => isTaskCompletedToday(tc.completedAt)).map((tc) => tc.taskId)
  );

  const filteredTasks = daily5Tasks.filter((t) => {
    if (filterCategory === 'All') return true;
    return t.category === filterCategory;
  });

  const categories = ['All', 'Video', 'Survey', 'Game Quest', 'App Install', 'Special'];

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
          <h2 className="text-2xl font-black text-slate-100">5 Daily Quests</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Complete your 5 assigned daily tasks to unlock instant cash rewards. Daily tasks reset every 24 hours based on your local timezone.
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
            {cat}
          </button>
        ))}
      </div>

      {/* Daily Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">No tasks in this category</p>
            <p className="text-xs text-slate-500 mt-1">Switch to "All" to view all 5 available daily quests.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = completedTaskIds.has(task.id);
            return (
              <div
                key={task.id}
                className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCompleted ? 'border-emerald-500/30 bg-slate-900/60' : 'border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={task.thumbnailUrl || task.thumbnail}
                      alt={task.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-md"
                    />
                    {isCompleted && (
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                        {task.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> {task.duration ?? task.durationSeconds ?? 30} Seconds
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">{task.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{task.description}</p>
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
                      className="px-5 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg inline-flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                      <Play className="w-4 h-4 fill-white" /> Start Task
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

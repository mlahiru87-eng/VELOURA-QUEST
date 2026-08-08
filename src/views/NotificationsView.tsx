import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, Gift, CheckSquare, ShieldAlert, ArrowUpRight } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  return (
    <div id="notifications-view" className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Bell className="w-3.5 h-3.5 text-purple-400" />
            System Alerts & Updates
          </span>
          <h2 className="text-2xl font-black text-slate-100">Notifications</h2>
        </div>

        <button
          onClick={markAllNotificationsRead}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500/40 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <CheckCheck className="w-4 h-4 text-purple-400" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['all', 'unread', 'reward', 'task', 'admin', 'withdrawal'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              filterType === type
                ? 'electric-gradient-btn text-white shadow-md'
                : 'glass-panel text-slate-400 hover:text-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl">
            <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">No notifications found</p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                !n.read ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/80 opacity-80'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'reward'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : n.type === 'task'
                    ? 'bg-purple-500/20 text-purple-400'
                    : n.type === 'withdrawal'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {n.type === 'reward' ? (
                  <Gift className="w-5 h-5" />
                ) : n.type === 'task' ? (
                  <CheckSquare className="w-5 h-5" />
                ) : n.type === 'withdrawal' ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-100">{n.title}</h4>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mt-1"></span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

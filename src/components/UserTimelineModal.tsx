import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { X, Clock, CheckCircle2, ArrowUpRight, Gift, ShieldAlert, Wallet } from 'lucide-react';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

export const UserTimelineModal: React.FC<Props> = ({ user, onClose }) => {
  const { allTransactions, allWithdrawals, auditLogs } = useAuth();

  // Combine user activity into a unified chronological array
  const userTransactions = allTransactions.filter(t => t.userId === user.uid);
  const userWithdrawals = allWithdrawals.filter(w => w.userId === user.uid);
  const userAuditLogs = auditLogs.filter(a => a.targetUserId === user.uid);

  interface TimelineItem {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: 'registration' | 'task' | 'withdrawal' | 'referral' | 'audit' | 'adjustment';
    badgeColor: string;
  }

  const timelineItems: TimelineItem[] = [
    {
      id: `reg-${user.uid}`,
      title: "Account Registered",
      description: `Registered as ${user.displayName} (${user.email})`,
      timestamp: user.createdAt,
      type: 'registration',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  ];

  userTransactions.forEach((tx) => {
    timelineItems.push({
      id: tx.id,
      title: tx.type === 'task_reward' 
        ? 'Quest Reward Claimed' 
        : tx.type === 'referral_bonus'
        ? 'Referral Bonus Unlocked'
        : tx.type === 'admin_adjustment'
        ? 'Admin Wallet Adjustment'
        : tx.type === 'withdrawal'
        ? 'Withdrawal Debited'
        : 'Welcome Bonus',
      description: `${tx.description} (${tx.amount >= 0 ? '+' : ''}$${tx.amount.toFixed(2)})`,
      timestamp: tx.createdAt,
      type: tx.type === 'task_reward' ? 'task' : tx.type === 'referral_bonus' ? 'referral' : 'adjustment',
      badgeColor: tx.amount >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    });
  });

  userWithdrawals.forEach((w) => {
    timelineItems.push({
      id: w.id,
      title: `Withdrawal Request: ${w.status.toUpperCase()}`,
      description: `$${w.amount.toFixed(2)} via ${w.method} (${w.destination})`,
      timestamp: w.createdAt,
      type: 'withdrawal',
      badgeColor: w.status === 'approved' 
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
        : w.status === 'rejected'
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    });
  });

  userAuditLogs.forEach((a) => {
    timelineItems.push({
      id: a.id,
      title: `Admin Audit Log: ${a.action}`,
      description: `Reason: ${a.reason} (by ${a.adminEmail})`,
      timestamp: a.createdAt,
      type: 'audit',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    });
  });

  timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col glass-panel rounded-3xl border border-purple-500/40 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" /> User Activity Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{user.displayName} ({user.email})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {user.isFlagged && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Account Flagged: </span>
                <span>{user.flaggedReason || 'Suspicious activity detected'}</span>
              </div>
            </div>
          )}

          {timelineItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No activity recorded for this user yet.</div>
          ) : (
            <div className="relative pl-6 space-y-4 border-l border-slate-800 ml-2">
              {timelineItems.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-slate-950 shadow-md"></div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${item.badgeColor}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

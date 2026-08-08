import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TaskItem, UserProfile, SystemSettings } from '../types';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { UserTimelineModal } from '../components/UserTimelineModal';
import { WalletAdjustmentModal } from '../components/WalletAdjustmentModal';
import { exportUsersCSV, exportWithdrawalsCSV, exportTransactionsCSV } from '../lib/securityAndUtils';
import { 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Wallet, 
  Bell, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Send, 
  DollarSign,
  TrendingUp,
  Download,
  Search,
  Clock,
  Flag,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const AdminPanelView: React.FC = () => {
  const { 
    userProfile, 
    allUsers, 
    allWithdrawals, 
    allTransactions,
    tasks, 
    settings, 
    auditLogs,
    addNewTask, 
    deleteTaskItem, 
    updateWithdrawalStatus, 
    sendAnnouncement, 
    updateSystemSettings,
    toggleUserFlagStatus,
    toggleUserSuspensionStatus
  } = useAuth();

  const { showToast } = useToast();

  const [adminTab, setAdminTab] = useState<'analytics' | 'users' | 'tasks' | 'withdrawals' | 'audit' | 'notifications' | 'settings'>('analytics');

  // Search & Filter state for users
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'flagged' | 'suspended' | 'admin'>('all');

  // Search & Filter state for withdrawals
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modals state
  const [timelineUser, setTimelineUser] = useState<UserProfile | null>(null);
  const [adjustmentUser, setAdjustmentUser] = useState<UserProfile | null>(null);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskReward, setTaskReward] = useState('5.00');
  const [taskCategory, setTaskCategory] = useState<'Video' | 'Survey' | 'Game Quest' | 'App Install' | 'Special'>('Video');
  const [taskThumbnail, setTaskThumbnail] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80');
  const [taskVideoUrl, setTaskVideoUrl] = useState('');

  // Announcement state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');

  // Settings form state
  const [minW, setMinW] = useState(settings.minWithdrawal.toString());
  const [refBonus, setRefBonus] = useState(settings.referralBonus.toString());
  const [mMode, setMMode] = useState(settings.maintenanceMode);
  const [bannerActive, setBannerActive] = useState(settings.announcementBanner?.active ?? true);
  const [bannerMsg, setBannerMsg] = useState(settings.announcementBanner?.message ?? '');
  const [bannerType, setBannerType] = useState<'info' | 'warning' | 'alert'>(settings.announcementBanner?.type ?? 'info');
  const [flags, setFlags] = useState(settings.featureFlags ?? {
    enableReferrals: true,
    enableWithdrawals: true,
    enableDailyTasks: true,
    enableNotifications: true,
  });

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl max-w-md mx-auto my-12 space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-100">Access Restricted</h3>
        <p className="text-xs text-slate-400">Admin authorization is required to access this control panel.</p>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch = u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.referralCode.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === 'flagged') return u.isFlagged;
    if (userFilter === 'suspended') return u.isSuspended;
    if (userFilter === 'admin') return u.role === 'admin';
    return true;
  });

  // Filtered Withdrawals
  const filteredWithdrawals = allWithdrawals.filter((w) => {
    const matchesSearch = w.userEmail.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
                          w.method.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
                          w.destination.toLowerCase().includes(withdrawalSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (withdrawalFilter !== 'all') return w.status === withdrawalFilter;
    return true;
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskVideoUrl.trim()) return;
    await addNewTask({
      title: taskTitle.trim(),
      description: taskDescription.trim() || 'Complete quest objectives to claim reward.',
      reward: parseFloat(taskReward) || 5.00,
      thumbnailUrl: taskThumbnail.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      videoUrl: taskVideoUrl.trim(),
      duration: parseInt(taskDuration) || 30,
      category: taskCategory,
      createdAt: new Date().toISOString(),
      active: true,
    });
    showToast("Task Added", `Created daily quest "${taskTitle.trim()}".`, "success");
    setTaskTitle('');
    setTaskDescription('');
    setTaskVideoUrl('');
  };

  const handleSendNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) return;
    await sendAnnouncement(notifTitle.trim(), notifMessage.trim());
    setNotifTitle('');
    setNotifMessage('');
    showToast("Announcement Sent", "Broadcasting platform notification to all users.", "success");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSystemSettings({
      minWithdrawal: parseFloat(minW) || 10.0,
      referralBonus: parseFloat(refBonus) || 5.0,
      maintenanceMode: mMode,
      announcementBanner: {
        active: bannerActive,
        message: bannerMsg,
        type: bannerType,
      },
      featureFlags: flags,
    });
    showToast("Settings Updated", "Platform parameters and feature flags saved.", "success");
  };

  return (
    <div id="admin-panel" className="space-y-6 pb-20 md:pb-8">
      {/* Admin Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Administrative Command
            </span>
            <h2 className="text-2xl font-black text-slate-100 mt-2">Veloura Quest Management Studio</h2>
            <p className="text-xs text-slate-400 mt-1">Manage users, audit wallet adjustments, approve cashouts, and view real-time analytics.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportUsersCSV(allUsers)}
              className="px-3.5 py-2 rounded-xl glass-panel hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" /> Export Users CSV
            </button>
            <button
              onClick={() => exportWithdrawalsCSV(allWithdrawals)}
              className="px-3.5 py-2 rounded-xl glass-panel hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Export Cashouts CSV
            </button>
            <button
              onClick={() => exportTransactionsCSV(allTransactions)}
              className="px-3.5 py-2 rounded-xl glass-panel hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" /> Export Txs CSV
            </button>
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'users', label: `Users (${allUsers.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'tasks', label: `Tasks (${tasks.length})`, icon: <CheckSquare className="w-4 h-4" /> },
          { id: 'withdrawals', label: `Cashouts (${allWithdrawals.filter(w=>w.status==='pending').length} pending)`, icon: <Wallet className="w-4 h-4" /> },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'notifications', label: 'Announcements', icon: <Bell className="w-4 h-4" /> },
          { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-2 transition-all ${
              adminTab === tab.id
                ? 'electric-gradient-btn text-white shadow-md glow-purple'
                : 'glass-panel text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {adminTab === 'analytics' && <AnalyticsDashboard />}

      {/* Users Tab */}
      {adminTab === 'users' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> User Accounts & Security Management
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, ref code..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-1.5 text-xs text-slate-100 rounded-xl"
                />
              </div>

              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value as any)}
                className="glass-input px-3 py-1.5 text-xs text-slate-300 rounded-xl bg-slate-900 border-slate-800"
              >
                <option value="all">All Users</option>
                <option value="flagged">Flagged Security</option>
                <option value="suspended">Suspended Accounts</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role & Ref</th>
                  <th className="py-3 px-3">Balance</th>
                  <th className="py-3 px-3">Total Earned</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={u.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                            alt="Avatar"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-200">{u.displayName}</div>
                            <div className="text-[10px] text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                        <div className="text-[10px] font-mono text-purple-300 mt-1">{u.referralCode}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        ${u.currentBalance.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-mono text-purple-300 font-semibold">
                        ${u.totalEarned.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-600/50 flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3 h-3 text-rose-500" /> Suspended
                          </span>
                        ) : u.isFlagged ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                            <Flag className="w-3 h-3" /> Flagged
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setTimelineUser(u)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-purple-400" /> Activity
                          </button>

                          <button
                            onClick={() => setAdjustmentUser(u)}
                            className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" /> Wallet
                          </button>

                          <button
                            onClick={() => {
                              toggleUserFlagStatus(u.uid, !u.isFlagged, u.isFlagged ? 'Cleared by admin' : 'Flagged manually by admin');
                              showToast("Security Status Updated", `User ${u.displayName} status toggled.`, "info");
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              u.isFlagged 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                            }`}
                            title={u.isFlagged ? "Unflag Account" : "Flag Account"}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              toggleUserSuspensionStatus(u.uid, !u.isSuspended, u.isSuspended ? 'Lifted by admin' : 'Emergency account suspension');
                              showToast("Suspension Action Executed", `User ${u.displayName} suspension set to ${!u.isSuspended}.`, u.isSuspended ? "info" : "warning");
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              u.isSuspended
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-rose-950/80 text-rose-400 border-rose-500/40 hover:bg-rose-900'
                            }`}
                            title={u.isSuspended ? "Lift Suspension" : "Emergency Account Suspension"}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {adminTab === 'tasks' && (
        <div className="space-y-6">
          {/* Add New Task Form */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" /> Create New Daily Quest
            </h3>

            <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Quest Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Watch Tech Video Review"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Category</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 bg-slate-900 border-slate-800"
                >
                  <option value="Video">Video</option>
                  <option value="Survey">Survey</option>
                  <option value="Game Quest">Game Quest</option>
                  <option value="App Install">App Install</option>
                  <option value="Special">Special</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Reward Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  required
                  value={taskReward}
                  onChange={(e) => setTaskReward(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Duration (Seconds)</label>
                <input
                  type="number"
                  min="5"
                  required
                  value={taskDuration}
                  onChange={(e) => setTaskDuration(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={taskThumbnail}
                  onChange={(e) => setTaskThumbnail(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Video URL (Required External Target) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://veloura.com/watch/video123"
                  value={taskVideoUrl}
                  onChange={(e) => setTaskVideoUrl(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Quest requirements and instructions..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Publish Quest
                </button>
              </div>
            </form>
          </div>

          {/* Existing Tasks List */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Active Quest Catalog</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex space-x-3">
                    <img src={t.thumbnail} alt={t.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-700" />
                    <div>
                      <span className="text-[9px] font-bold uppercase text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                        {t.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-200 mt-1">{t.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs font-black text-emerald-400">${t.rewardAmount.toFixed(2)}</span>
                    <button
                      onClick={() => deleteTaskItem(t.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                      title="Deactivate Quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {adminTab === 'withdrawals' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" /> Cashout Approvals & Management
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user email or method..."
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-1.5 text-xs text-slate-100 rounded-xl"
                />
              </div>

              <select
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value as any)}
                className="glass-input px-3 py-1.5 text-xs text-slate-300 rounded-xl bg-slate-900 border-slate-800"
              >
                <option value="all">All Cashouts</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No withdrawal requests match your search filter.</div>
            ) : (
              filteredWithdrawals.map((w) => (
                <div key={w.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200">{w.userEmail}</span>
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 uppercase">
                        {w.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Destination: <span className="font-mono text-slate-300">{w.destination}</span> • Submitted {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <span className="text-lg font-black text-emerald-400">${w.amount.toFixed(2)}</span>

                    {w.status === 'pending' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateWithdrawalStatus(w.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateWithdrawalStatus(w.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject & Refund
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {w.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {adminTab === 'audit' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" /> Administrative Audit Log Ledger
          </h3>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No admin audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200 uppercase">{log.action}</span>
                      <span className="text-[10px] text-slate-400">Target: {log.targetUserEmail}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Reason: "{log.reason}" • Executed by {log.adminEmail}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {adminTab === 'notifications' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" /> Broadcast Platform Announcement
          </h3>

          <form onSubmit={handleSendNotif} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekend Double Bonus Event!"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Message Content</label>
              <textarea
                required
                rows={3}
                placeholder="Message displayed in all user notification hubs..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          </form>
        </div>
      )}

      {/* System Settings Tab */}
      {adminTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" /> Platform Configuration Parameters
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Financial Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Minimum Withdrawal Threshold ($)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={minW}
                    onChange={(e) => setMinW(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Referral Bonus Amount ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={refBonus}
                    onChange={(e) => setRefBonus(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">System Maintenance Mode</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Locks the app for non-admin users during updates or DB migrations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMMode(!mMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    mMode 
                      ? 'bg-amber-500 text-slate-950 shadow-lg glow-purple font-black' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mMode ? 'MAINTENANCE ACTIVE' : 'DISABLED'}
                </button>
              </div>

              {/* Feature Flags Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" /> Granular Feature Flags
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Daily Tasks Flag */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Daily Quests</div>
                      <div className="text-[10px] text-slate-500">Allow reward claims</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={flags.enableDailyTasks}
                      onChange={(e) => setFlags({ ...flags, enableDailyTasks: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                  </div>

                  {/* Withdrawals Flag */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Withdrawals</div>
                      <div className="text-[10px] text-slate-500">Allow cashout requests</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={flags.enableWithdrawals}
                      onChange={(e) => setFlags({ ...flags, enableWithdrawals: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                  </div>

                  {/* Referrals Flag */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Referral Network</div>
                      <div className="text-[10px] text-slate-500">Allow friend invite bonuses</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={flags.enableReferrals}
                      onChange={(e) => setFlags({ ...flags, enableReferrals: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                  </div>

                  {/* Notifications Flag */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Notifications Hub</div>
                      <div className="text-[10px] text-slate-500">Enable system broadcasts</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={flags.enableNotifications}
                      onChange={(e) => setFlags({ ...flags, enableNotifications: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Global Announcement Banner Controls */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" /> Global Announcement Banner
                </h4>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Banner Active</span>
                    <input
                      type="checkbox"
                      checked={bannerActive}
                      onChange={(e) => setBannerActive(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Banner Message</label>
                    <input
                      type="text"
                      value={bannerMsg}
                      onChange={(e) => setBannerMsg(e.target.value)}
                      placeholder="e.g. Welcome to Veloura Quest Public Beta!"
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Banner Type</label>
                    <select
                      value={bannerType}
                      onChange={(e) => setBannerType(e.target.value as any)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-200 bg-slate-950 border-slate-800"
                    >
                      <option value="info">Info (Purple)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="alert">Alert (Rose)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save All System Settings & Feature Flags</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Timeline Modal */}
      {timelineUser && (
        <UserTimelineModal user={timelineUser} onClose={() => setTimelineUser(null)} />
      )}

      {/* Wallet Adjustment Modal */}
      {adjustmentUser && (
        <WalletAdjustmentModal user={adjustmentUser} onClose={() => setAdjustmentUser(null)} />
      )}
    </div>
  );
};

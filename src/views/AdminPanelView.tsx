import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { useToast } from '../context/ToastContext';
import { TaskItem, UserProfile, SystemSettings, WithdrawalRequest, AdminTab } from '../types';
import { AdminHeader } from '../components/AdminHeader';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminDashboardOverview } from '../components/AdminDashboardOverview';
import { AdminSupportPanel } from '../components/AdminSupportPanel';
import { AdminTransactionsView } from '../components/AdminTransactionsView';
import { AdminReportsView } from '../components/AdminReportsView';
import { UserTimelineModal } from '../components/UserTimelineModal';
import { WalletAdjustmentModal } from '../components/WalletAdjustmentModal';
import { exportUsersCSV, exportWithdrawalsCSV, exportTransactionsCSV } from '../lib/securityAndUtils';
import { formatUsdtAmount } from '../lib/referralCommission';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  FileText,
  Sparkles,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Megaphone,
  Film,
  Link2,
  MessageSquare
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
    approveWithdrawal,
    rejectWithdrawal,
    sendAnnouncement, 
    updateSystemSettings,
    toggleUserFlagStatus,
    toggleUserSuspensionStatus
  } = useAuth();

  const { unreadForAdminCount } = useSupport();
  const { showToast } = useToast();

  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Search & Filter state for users
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'flagged' | 'suspended' | 'admin'>('all');

  // Search & Filter state for withdrawals
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Withdrawal Action Modal States
  const [selectedWithdrawalForApprove, setSelectedWithdrawalForApprove] = useState<WithdrawalRequest | null>(null);
  const [selectedWithdrawalForReject, setSelectedWithdrawalForReject] = useState<WithdrawalRequest | null>(null);
  const [txHashInput, setTxHashInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [copiedAddrId, setCopiedAddrId] = useState<string | null>(null);

  // Modals state
  const [timelineUser, setTimelineUser] = useState<UserProfile | null>(null);
  const [adjustmentUser, setAdjustmentUser] = useState<UserProfile | null>(null);

  // New task form state
  const [taskVideoUrl, setTaskVideoUrl] = useState('');
  const [taskAdUrl, setTaskAdUrl] = useState('');
  const [taskCategory, setTaskCategory] = useState<'Video' | 'Ads' | 'Survey' | 'Game Quest' | 'App Install' | 'Special'>('Video');
  const [taskReward, setTaskReward] = useState('5.00');
  const [adminTaskCategoryFilter, setAdminTaskCategoryFilter] = useState<string>('all');

  // Auto-detected metadata state (editable by admin if needed)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskThumbnail, setTaskThumbnail] = useState('');
  const [taskDuration, setTaskDuration] = useState('30');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Auto detect video metadata when URL changes
  const autoDetectMetadata = async (url: string) => {
    setIsDetecting(true);

    let detectedTitle = '';
    let detectedThumb = '';
    let detectedDuration = '30';

    // 1. Extract video ID if present (e.g. /video/ID or /watch/ID or ?v=ID)
    let videoId = '';
    const videoMatch = url.match(/\/(?:video|watch|v)\/([a-zA-Z0-9_-]+)/i);
    if (videoMatch) {
      videoId = videoMatch[1];
    } else {
      try {
        const urlObj = new URL(url, 'https://veloura-quest.vercel.app');
        videoId = urlObj.searchParams.get('v') || urlObj.searchParams.get('id') || '';
      } catch {
        // ignore
      }
    }

    // 2. Check Firestore if a document exists in 'videos' or 'tasks' for videoId
    if (videoId) {
      try {
        const vSnap = await getDoc(doc(db, 'videos', videoId));
        if (vSnap.exists()) {
          const data = vSnap.data();
          if (data.title) detectedTitle = data.title;
          if (data.thumbnailUrl || data.thumbnail) detectedThumb = data.thumbnailUrl || data.thumbnail;
          if (data.duration || data.durationSeconds) detectedDuration = String(data.duration || data.durationSeconds);
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Try fetching page HTML metadata
    if (!detectedTitle || !detectedThumb) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const html = await res.text();
          const parser = new DOMParser();
          const docHtml = parser.parseFromString(html, 'text/html');

          const ogTitle = docHtml.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                          docHtml.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                          docHtml.querySelector('title')?.textContent;
          if (ogTitle && ogTitle.trim()) {
            detectedTitle = ogTitle.replace(/\s*[-|–]\s*Veloura.*$/i, '').trim();
          }

          const ogImage = docHtml.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                          docHtml.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
          if (ogImage && ogImage.trim()) {
            detectedThumb = ogImage.trim();
          }

          const ogDuration = docHtml.querySelector('meta[property="video:duration"]')?.getAttribute('content') ||
                             docHtml.querySelector('meta[property="og:video:duration"]')?.getAttribute('content');
          if (ogDuration && !isNaN(parseInt(ogDuration))) {
            detectedDuration = String(parseInt(ogDuration));
          }
        }
      } catch (e) {
        // CORS or network error, fallback handled below
      }
    }

    // 4. Fallbacks if fetching / Firestore didn't yield values
    if (!detectedTitle) {
      if (videoId) {
        const shortId = videoId.length > 12 ? videoId.slice(0, 8) + '...' : videoId;
        detectedTitle = `Veloura Video Quest (${shortId})`;
      } else {
        detectedTitle = 'Veloura Daily Quest Video';
      }
    }

    if (!detectedThumb) {
      const thumbnails = [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80'
      ];
      let hash = 0;
      const str = videoId || url;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      detectedThumb = thumbnails[Math.abs(hash) % thumbnails.length];
    }

    setTaskTitle(detectedTitle);
    setTaskThumbnail(detectedThumb);
    setTaskDuration(detectedDuration);
    setIsDetecting(false);
  };

  useEffect(() => {
    if (!taskVideoUrl.trim()) {
      setTaskTitle('');
      setTaskThumbnail('');
      setTaskDuration('30');
      setIsDetecting(false);
      return;
    }

    const timer = setTimeout(() => {
      autoDetectMetadata(taskVideoUrl.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [taskVideoUrl]);

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
    const searchLower = withdrawalSearch.toLowerCase();
    const addr = w.walletAddress || w.destination || '';
    const email = w.userEmail || '';
    const name = w.userName || '';
    const matchesSearch = email.toLowerCase().includes(searchLower) ||
                          name.toLowerCase().includes(searchLower) ||
                          addr.toLowerCase().includes(searchLower) ||
                          (w.currency && w.currency.toLowerCase().includes(searchLower)) ||
                          (w.network && w.network.toLowerCase().includes(searchLower));
    if (!matchesSearch) return false;
    if (withdrawalFilter !== 'all') return w.status === withdrawalFilter;
    return true;
  });

  const handleCopyWalletAddress = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddrId(id);
    showToast("Address Copied", "Wallet address copied to clipboard", "info");
    setTimeout(() => setCopiedAddrId(null), 2000);
  };

  const handleConfirmApprove = async () => {
    if (!selectedWithdrawalForApprove) return;
    if (!txHashInput.trim()) {
      showToast("Missing TXID", "Please enter the Transaction Hash (TXID) for this payout.", "error");
      return;
    }

    setIsActionSubmitting(true);
    const res = await approveWithdrawal(selectedWithdrawalForApprove.id, txHashInput.trim(), adminNoteInput.trim());
    setIsActionSubmitting(false);

    if (res.success) {
      showToast("Payout Approved", res.message, "success");
      setSelectedWithdrawalForApprove(null);
      setTxHashInput('');
      setAdminNoteInput('');
    } else {
      showToast("Approval Failed", res.message, "error");
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedWithdrawalForReject) return;
    if (!rejectionReasonInput.trim()) {
      showToast("Missing Reason", "Please provide a reason for rejecting this withdrawal.", "error");
      return;
    }

    setIsActionSubmitting(true);
    const res = await rejectWithdrawal(selectedWithdrawalForReject.id, rejectionReasonInput.trim(), adminNoteInput.trim());
    setIsActionSubmitting(false);

    if (res.success) {
      showToast("Payout Rejected", res.message, "info");
      setSelectedWithdrawalForReject(null);
      setRejectionReasonInput('');
      setAdminNoteInput('');
    } else {
      showToast("Rejection Failed", res.message, "error");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReward = parseFloat(taskReward);

    if (isNaN(finalReward) || finalReward < 0.01) {
      showToast("Validation Error", "Minimum task reward is 0.01 USDT.", "error");
      return;
    }

    if (taskCategory === 'Ads') {
      if (!taskAdUrl.trim()) {
        showToast("Error", "Please enter a valid Advertisement URL.", "error");
        return;
      }

      await addNewTask({
        title: 'Advertisement Task',
        category: 'Ads',
        reward: finalReward,
        adUrl: taskAdUrl.trim(),
        createdAt: new Date().toISOString(),
        active: true,
      });

      showToast("Task Published", `Created Ad Task with +$${finalReward.toFixed(2)} USDT reward.`, "success");
      setTaskAdUrl('');
      setTaskReward('0.01');
    } else {
      if (!taskVideoUrl.trim()) {
        showToast("Error", "Please enter a valid Video URL.", "error");
        return;
      }

      const finalTitle = taskTitle.trim() || 'Veloura Daily Quest';
      const finalDuration = parseInt(taskDuration) || 30;
      const finalThumb = taskThumbnail.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';

      await addNewTask({
        title: finalTitle,
        description: 'Veloura Quest',
        reward: finalReward,
        rewardAmount: finalReward,
        thumbnailUrl: finalThumb,
        thumbnail: finalThumb,
        videoUrl: taskVideoUrl.trim(),
        duration: finalDuration,
        durationSeconds: finalDuration,
        category: taskCategory,
        createdAt: new Date().toISOString(),
        active: true,
      });

      showToast("Task Published", `Created quest "${finalTitle}".`, "success");
      setTaskVideoUrl('');
      setTaskTitle('');
      setTaskThumbnail('');
      setTaskDuration('30');
    }
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
    const parsedMinW = parseFloat(minW);
    if (isNaN(parsedMinW) || parsedMinW < 20.0) {
      showToast("Validation Error", "Minimum withdrawal amount is 20 USDT.", "error");
      return;
    }

    await updateSystemSettings({
      minWithdrawal: parsedMinW,
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
    <div id="admin-panel" className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Dedicated Admin Header */}
      <AdminHeader
        currentTab={adminTab}
        onSelectTab={setAdminTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Dedicated Admin Sidebar / Mobile Drawer */}
        <AdminSidebar
          currentTab={adminTab}
          onSelectTab={setAdminTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-20 md:pb-12">
          {/* Dashboard Tab */}
          {adminTab === 'dashboard' && (
            <AdminDashboardOverview
              onNavigateTab={setAdminTab}
              onOpenApproveModal={(w) => {
                setSelectedWithdrawalForApprove(w);
                setTxHashInput('');
                setAdminNoteInput('');
              }}
              onOpenRejectModal={(w) => {
                setSelectedWithdrawalForReject(w);
                setRejectionReasonInput('');
                setAdminNoteInput('');
              }}
            />
          )}

          {/* Support Chat Tab */}
          {adminTab === 'support' && <AdminSupportPanel />}

          {/* Transactions Tab */}
          {adminTab === 'transactions' && <AdminTransactionsView />}

          {/* Reports & Audits Tab */}
          {adminTab === 'reports' && <AdminReportsView />}

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
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" /> Create New Task
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a category to create either an interactive Video Quest or an external Ad Task.
                </p>
              </div>

              {/* Task Type Switcher */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setTaskCategory('Video')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    taskCategory !== 'Ads'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" /> Video Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaskCategory('Ads');
                    if (taskReward === '5.00') setTaskReward('0.01');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    taskCategory === 'Ads'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" /> Ad Task
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="space-y-6">
              {taskCategory === 'Ads' ? (
                /* Simplified Ad Task Creation Form */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                    <Megaphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold">Simplified Ad Task:</span> Users will visit your advertisement link and must remain on the page for 30 seconds to earn the reward.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Ad URL */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-amber-400" /> Ad URL *
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://example.com/advertisement"
                        value={taskAdUrl}
                        onChange={(e) => setTaskAdUrl(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-100 font-mono focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {/* 2. Reward Amount */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Reward Amount (USDT) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={taskReward}
                        onChange={(e) => setTaskReward(e.target.value)}
                        placeholder="0.01"
                        className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-100 font-mono font-bold focus:border-amber-500 transition-colors"
                      />
                      {taskReward !== '' && parseFloat(taskReward) < 0.01 && (
                        <p className="text-[10px] text-rose-400 mt-1">Minimum task reward is 0.01 USDT.</p>
                      )}
                    </div>
                  </div>

                  {/* AD TASK PREVIEW */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4 text-amber-400" /> 📢 Ad Task
                      </span>
                      <span className="text-[10px] font-bold uppercase text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        Category: Ads
                      </span>
                    </div>

                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          🔗 Advertisement Link
                        </span>
                        <div className="text-xs font-mono text-amber-200/90 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 truncate">
                          {taskAdUrl.trim() || 'https://example.com/advertisement'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            💰 Reward
                          </span>
                          <span className="text-sm font-extrabold text-emerald-400">
                            +${(parseFloat(taskReward) || 0.01).toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            ⏱ Stay Requirement
                          </span>
                          <span className="text-xs font-bold text-blue-400">
                            30 Seconds
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Publish Ad Task Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!taskAdUrl.trim() || isNaN(parseFloat(taskReward)) || parseFloat(taskReward) < 0.01}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Publish Ad Task
                    </button>
                  </div>
                </div>
              ) : (
                /* Video Task Creation Form */
                <div className="space-y-4">
                  {/* 1. Video URL */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Film className="w-3.5 h-3.5 text-purple-400" /> Video URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://veloura-etez.vercel.app/video/Lwq20xe9n2eLnBbQqzjC"
                      value={taskVideoUrl}
                      onChange={(e) => setTaskVideoUrl(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-100 font-mono focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 2. Category */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Category ▼
                      </label>
                      <select
                        value={taskCategory}
                        onChange={(e) => setTaskCategory(e.target.value as any)}
                        className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-100 bg-slate-900/90 border-slate-800 focus:border-purple-500 transition-colors cursor-pointer"
                      >
                        <option value="Video">Video</option>
                        <option value="Survey">Survey</option>
                        <option value="Game Quest">Game Quest</option>
                        <option value="App Install">App Install</option>
                        <option value="Special">Special</option>
                      </select>
                    </div>

                    {/* 3. Reward */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Reward ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={taskReward}
                        onChange={(e) => setTaskReward(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-100 font-mono font-bold focus:border-purple-500 transition-colors"
                      />
                      {taskReward !== '' && parseFloat(taskReward) < 0.01 && (
                        <p className="text-[10px] text-rose-400 mt-1">Minimum task reward is 0.01 USDT.</p>
                      )}
                    </div>
                  </div>

                  {/* Video Preview Section */}
                  {taskVideoUrl.trim() && (
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-4 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-400" /> Video Preview
                        </span>
                        {isDetecting ? (
                          <span className="text-[10px] text-amber-400 animate-pulse font-mono font-bold">
                            Auto-detecting video metadata...
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            ✓ Auto-detected
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row gap-5 items-start">
                        {/* Thumbnail */}
                        <div className="w-full md:w-48 h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 relative shadow-md">
                          {taskThumbnail ? (
                            <img src={taskThumbnail} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">Thumbnail: Auto detecting...</div>
                          )}
                        </div>

                        {/* Auto Detected Fields */}
                        <div className="flex-1 space-y-3 w-full">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Title (Auto detected - editable)
                            </label>
                            <input
                              type="text"
                              value={taskTitle}
                              onChange={(e) => setTaskTitle(e.target.value)}
                              placeholder="Auto detecting title..."
                              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 border border-slate-700/80 focus:border-purple-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                              <span className="text-slate-500 block uppercase font-bold text-[9px]">Thumbnail</span>
                              <span className="text-slate-300 font-mono font-medium truncate block">Auto detected</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                              <span className="text-slate-500 block uppercase font-bold text-[9px]">Duration</span>
                              <span className="text-blue-400 font-mono font-bold block">{taskDuration} Seconds</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                              <span className="text-slate-500 block uppercase font-bold text-[9px]">Reward</span>
                              <span className="text-emerald-400 font-mono font-bold block">+${(parseFloat(taskReward) || 0).toFixed(2)} USDT</span>
                            </div>
                          </div>

                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            <span className="text-slate-500 font-bold uppercase">Target: </span>
                            {taskVideoUrl}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Publish Task Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isDetecting || !taskVideoUrl.trim() || isNaN(parseFloat(taskReward)) || parseFloat(taskReward) < 0.01}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg inline-flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Publish Task
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Existing Tasks List */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" /> Active Quest Catalog ({tasks.length})
              </h3>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminTaskCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    adminTaskCategoryFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTaskCategoryFilter('Video')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    adminTaskCategoryFilter === 'Video'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3 h-3" /> Video ({tasks.filter(t => t.category === 'Video').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTaskCategoryFilter('Ads')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    adminTaskCategoryFilter === 'Ads'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-3 h-3" /> Ads ({tasks.filter(t => t.category === 'Ads').length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks
                .filter(t => adminTaskCategoryFilter === 'all' || t.category === adminTaskCategoryFilter)
                .map((t) => {
                  const isAd = t.category === 'Ads';
                  return (
                    <div key={t.id} className={`p-4 rounded-2xl bg-slate-900/60 border space-y-3 flex flex-col justify-between transition-all ${
                      isAd ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-slate-800 hover:border-purple-500/40'
                    }`}>
                      <div className="flex space-x-3 min-w-0">
                        {isAd ? (
                          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <Megaphone className="w-7 h-7" />
                          </div>
                        ) : (
                          <img src={t.thumbnail} alt={t.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-700" />
                        )}
                        <div className="min-w-0 flex-1">
                          {isAd ? (
                            <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 inline-flex items-center gap-1">
                              <Megaphone className="w-2.5 h-2.5" /> 📢 Ads
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 inline-flex items-center gap-1">
                              <Film className="w-2.5 h-2.5" /> 🎬 Video
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-200 mt-1 line-clamp-1">{t.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            {isAd ? (t.adUrl || 'External Link') : (t.videoUrl || 'Video Link')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-400">${(t.rewardAmount || t.reward || 0).toFixed(2)}</span>
                          <span className="text-[10px] text-slate-500 font-mono">30s</span>
                        </div>
                        <button
                          onClick={() => deleteTaskItem(t.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                          title="Deactivate Quest"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {adminTab === 'withdrawals' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-rose-400" /> Manual Crypto Payout Management
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Disburse USDT TRC20 payments outside app and enter TXID to approve</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search email, wallet or network..."
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
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => exportWithdrawalsCSV(filteredWithdrawals)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1 shrink-0"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No withdrawal requests match your search filter.</div>
            ) : (
              filteredWithdrawals.map((w) => {
                const walletAddr = w.walletAddress || w.destination || '';
                const currencyStr = w.currency || 'USDT';
                const networkStr = w.network || 'TRC20';

                return (
                  <div key={w.id} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-200">{w.userEmail}</span>
                          {w.userName && <span className="text-[10px] text-slate-400">({w.userName})</span>}
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 uppercase">
                            {currencyStr} ({networkStr})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">TRC20 Wallet:</span>
                          <span className="font-mono text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 select-all">
                            {walletAddr}
                          </span>
                          <button
                            onClick={() => handleCopyWalletAddress(w.id, walletAddr)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[10px] flex items-center gap-1"
                            title="Copy TRC20 Wallet Address"
                          >
                            {copiedAddrId === w.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedAddrId === w.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500">
                          Submitted: {new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/80">
                        <div className="text-right">
                          <div className="text-lg font-black text-rose-400">${w.amount.toFixed(2)}</div>
                          <div className="text-[9px] font-bold text-slate-400">USDT</div>
                        </div>

                        {w.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedWithdrawalForApprove(w);
                                setTxHashInput('');
                                setAdminNoteInput('');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition-all"
                            >
                              <Check className="w-4 h-4" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawalForReject(w);
                                setRejectionReasonInput('');
                                setAdminNoteInput('');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition-all"
                            >
                              <X className="w-4 h-4" /> Reject & Refund
                            </button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${
                            w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {w.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>{w.status}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Approved/Rejected Audit Record inside Card */}
                    {w.status === 'approved' && w.txHash && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono"><strong>TXID:</strong> {w.txHash}</span>
                        {w.adminNote && <span className="text-slate-400">Memo: {w.adminNote}</span>}
                      </div>
                    )}

                    {w.status === 'rejected' && w.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex flex-wrap items-center justify-between gap-2">
                        <span><strong>Reason:</strong> {w.rejectionReason}</span>
                        {w.adminNote && <span className="text-slate-400">Memo: {w.adminNote}</span>}
                      </div>
                    )}
                  </div>
                );
              })
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

      {/* Referrals Tab */}
      {adminTab === 'referrals' && (() => {
        const allReferralTx = allTransactions.filter(t => t.type === 'referral_bonus' && t.status === 'completed');
        const totalReferralPayouts = allReferralTx.reduce((sum, t) => sum + t.amount, 0);

        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20">
                <span className="text-[10px] font-bold uppercase text-purple-300 block mb-1">Referral Commission Rate</span>
                <div className="text-2xl font-black text-purple-400">50%</div>
                <p className="text-[10px] text-slate-400 mt-1">Single-level commission on task rewards</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Referral Commissions Paid</span>
                <div className="text-2xl font-black text-emerald-400">${formatUsdtAmount(totalReferralPayouts)} USDT</div>
                <p className="text-[10px] text-slate-400 mt-1">Platform total referral earnings</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Commission Transactions</span>
                <div className="text-2xl font-black text-amber-300">{allReferralTx.length}</div>
                <p className="text-[10px] text-slate-400 mt-1">Executed referral payouts</p>
              </div>
            </div>

            {/* Referral Commission Transactions Table */}
            <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Referral Commission Transactions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Auditable log of all 50% referral commissions credited to referrers</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {allReferralTx.length} Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Referrer</th>
                      <th className="p-3.5">Referred User</th>
                      <th className="p-3.5 text-right">Task Reward</th>
                      <th className="p-3.5 text-right">Commission (50%)</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {allReferralTx.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 text-xs font-sans">
                          No referral commission transactions logged yet.
                        </td>
                      </tr>
                    ) : (
                      allReferralTx.map((tx) => {
                        const referrer = allUsers.find(u => u.uid === tx.userId);
                        const referrerName = referrer ? referrer.displayName || referrer.email : tx.userId;
                        const taskReward = tx.taskReward ?? (tx.amount * 2);

                        return (
                          <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3.5 text-slate-400 font-sans text-[11px]">
                              {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3.5 font-sans font-bold text-slate-200">
                              {referrerName}
                            </td>
                            <td className="p-3.5 font-sans text-purple-300 font-semibold">
                              {tx.referredUserName || 'Referred User'}
                            </td>
                            <td className="p-3.5 text-right text-slate-300">
                              ${formatUsdtAmount(taskReward)} USDT
                            </td>
                            <td className="p-3.5 text-right font-black text-emerald-400">
                              +${formatUsdtAmount(tx.amount)} USDT
                            </td>
                            <td className="p-3.5 text-center font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

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
                    step="0.01"
                    min="20.00"
                    required
                    value={minW}
                    onChange={(e) => setMinW(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono font-bold"
                  />
                  {minW !== '' && parseFloat(minW) < 20 && (
                    <p className="text-[10px] text-rose-400 mt-1">Minimum withdrawal amount is 20 USDT.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Referral Commission Rate (%)</label>
                  <input
                    type="text"
                    disabled
                    value="50% (Fixed 50% of task rewards)"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-purple-300 font-mono font-bold bg-slate-900/60 cursor-not-allowed border-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Single-level commission on referred user's daily task rewards.</p>
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
        </main>
      </div>

      {/* User Timeline Modal */}
      {timelineUser && (
        <UserTimelineModal user={timelineUser} onClose={() => setTimelineUser(null)} />
      )}

      {/* Wallet Adjustment Modal */}
      {adjustmentUser && (
        <WalletAdjustmentModal user={adjustmentUser} onClose={() => setAdjustmentUser(null)} />
      )}

      {/* Approve Modal */}
      {selectedWithdrawalForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Approve USDT Cashout</h3>
              </div>
              <button onClick={() => setSelectedWithdrawalForApprove(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User:</span>
                <span className="font-bold text-slate-200">{selectedWithdrawalForApprove.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payout Amount:</span>
                <span className="font-black text-emerald-400">${selectedWithdrawalForApprove.amount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network:</span>
                <span className="font-bold text-rose-300">TRC20</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <span className="text-slate-400 block text-[10px]">Destination Address:</span>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-slate-200">
                  <span className="truncate mr-2">{selectedWithdrawalForApprove.walletAddress || selectedWithdrawalForApprove.destination}</span>
                  <button 
                    onClick={() => handleCopyWalletAddress(selectedWithdrawalForApprove.id, selectedWithdrawalForApprove.walletAddress || selectedWithdrawalForApprove.destination)}
                    className="text-xs text-rose-400 hover:underline shrink-0 font-sans font-bold"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Blockchain Transaction Hash (TXID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Paste TRC20 TXID (e.g. 5f4a8b7c9d0e1f...)"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via Binance / TRON wallet memo..."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWithdrawalForApprove(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting || !txHashInput.trim()}
                onClick={handleConfirmApprove}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg flex items-center justify-center gap-1.5"
              >
                {isActionSubmitting ? <Lock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirm & Mark Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedWithdrawalForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Reject & Refund Request</h3>
              </div>
              <button onClick={() => setSelectedWithdrawalForReject(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User:</span>
                <span className="font-bold text-slate-200">{selectedWithdrawalForReject.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Refund:</span>
                <span className="font-black text-rose-400">${selectedWithdrawalForReject.amount.toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              ⚠️ Rejecting this payout will automatically refund ${selectedWithdrawalForReject.amount.toFixed(2)} USDT back to the user's wallet balance.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invalid TRC20 wallet address / Duplicate request..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Internal notes for audit ledger..."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWithdrawalForReject(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting || !rejectionReasonInput.trim()}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg flex items-center justify-center gap-1.5"
              >
                {isActionSubmitting ? <Lock className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                <span>Reject & Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

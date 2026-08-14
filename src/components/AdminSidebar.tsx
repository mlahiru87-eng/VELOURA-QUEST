import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Wallet, 
  MessageSquare, 
  DollarSign, 
  Receipt, 
  Bell, 
  FileText, 
  Settings,
  ShieldCheck,
  X,
  Database,
  ArrowRight,
  LogOut,
  Layers
} from 'lucide-react';
import { AdminTab } from '../types';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { allUsers, allWithdrawals, tasks, auditLogs, allTransactions, logout } = useAuth();
  const { unreadForAdminCount } = useSupport();

  const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'pending').length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, badge: allUsers.length },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, badge: tasks.length },
    { 
      id: 'withdrawals', 
      label: 'Withdrawals', 
      icon: <Wallet className="w-4 h-4" />, 
      badge: pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount} pending` : undefined,
      badgeColor: pendingWithdrawalsCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
    },
    { 
      id: 'support', 
      label: 'Support', 
      icon: <MessageSquare className="w-4 h-4" />, 
      badge: unreadForAdminCount > 0 ? `${unreadForAdminCount} new` : undefined,
      badgeColor: unreadForAdminCount > 0 ? 'bg-purple-600 text-white animate-bounce' : undefined
    },
    { id: 'referrals', label: 'Referrals', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" />, badge: allTransactions.length },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" />, badge: auditLogs.length },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleTabClick = (tabId: AdminTab) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-4">
      {/* Navigation List */}
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
          <span>Navigation Menu</span>
          <span className="text-purple-400 font-mono text-[9px]">RBAC Active</span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'electric-gradient-btn text-white shadow-lg glow-purple font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-white' : 'text-purple-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800')
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="pt-4 border-t border-slate-900 space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-purple-950/30 border border-purple-500/20 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Role Level 1</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <p className="text-[10px] text-slate-400">All permissions granted. Direct Firestore synchronization enabled.</p>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-600/40 text-xs font-bold flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-slate-950/80 backdrop-blur-2xl border-r border-purple-950/50 min-h-[calc(100vh-65px)]">
        {navContent}
      </aside>

      {/* Mobile Drawer (Collapsible) with Backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-purple-500/30 shadow-2xl z-10 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black text-sm">
                  👑
                </div>
                <span className="text-sm font-black text-slate-100 uppercase tracking-wide">Admin Navigation</span>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Activity, 
  Crown,
  Bell,
  MessageSquare
} from 'lucide-react';
import { AdminTab } from '../types';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { userProfile, logout, allWithdrawals } = useAuth();
  const { unreadForAdminCount } = useSupport();

  const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'pending').length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-purple-900/40 px-4 sm:px-6 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Brand Title */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-purple-500/40 transition-colors"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg glow-purple shrink-0">
            <Crown className="w-5 h-5 text-amber-200 fill-amber-200/30" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide uppercase electric-gradient-text leading-tight flex items-center gap-1.5">
                <span>👑 Admin Dashboard</span>
              </h1>
              <span className="hidden xs:inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Studio
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Veloura Quest Management & RBAC Control</p>
          </div>
        </div>
      </div>

      {/* Right: Real-time Indicators, Admin Info & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Quick pending badges (visible on medium+ screens) */}
        <div className="hidden md:flex items-center space-x-2">
          {pendingWithdrawalsCount > 0 && (
            <button
              onClick={() => onSelectTab('withdrawals')}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1.5 hover:bg-rose-500/30 transition-colors animate-pulse"
              title="Pending cashouts awaiting payout"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{pendingWithdrawalsCount} Cashouts Pending</span>
            </button>
          )}

          {unreadForAdminCount > 0 && (
            <button
              onClick={() => onSelectTab('support')}
              className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 hover:bg-purple-500/30 transition-colors"
              title="Unread support tickets"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>{unreadForAdminCount} Support Inquiries</span>
            </button>
          )}
        </div>

        {/* Admin Identity Pill */}
        {userProfile && (
          <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs">
            <div className="relative">
              <img
                src={userProfile.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="Admin Avatar"
                className="w-7 h-7 rounded-xl object-cover border border-purple-400/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-slate-950"></span>
            </div>

            <div className="text-left hidden sm:block max-w-[140px] md:max-w-[180px]">
              <div className="text-[11px] font-extrabold text-slate-100 truncate flex items-center gap-1">
                <span>{userProfile.displayName || 'Authorized Admin'}</span>
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              </div>
              <div className="text-[9px] text-purple-300/80 font-mono truncate">
                {userProfile.email}
              </div>
            </div>
          </div>
        )}

        {/* Explicit Logout Button */}
        <button
          onClick={logout}
          className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-600/40 hover:border-rose-500 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 glow-red"
          title="Sign out of Admin Session"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span className="hidden xs:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

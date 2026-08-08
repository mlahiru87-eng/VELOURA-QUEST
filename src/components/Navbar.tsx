import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Wallet, 
  Users, 
  Bell, 
  User, 
  ShieldCheck, 
  LogOut,
  Zap
} from 'lucide-react';
import { PageView } from '../types';

export const Navbar: React.FC = () => {
  const { currentPage, setCurrentPage, userProfile, notifications, logout } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems: { page: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { page: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { page: 'tasks', label: 'Quests', icon: <CheckSquare className="w-5 h-5" /> },
    { page: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> },
    { page: 'referral', label: 'Referral', icon: <Users className="w-5 h-5" /> },
    { page: 'notifications', label: 'Alerts', icon: <Bell className="w-5 h-5" />, badge: unreadCount },
    { page: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  if (userProfile?.role === 'admin') {
    navItems.push({ page: 'admin', label: 'Admin', icon: <ShieldCheck className="w-5 h-5 text-purple-400" /> });
  }

  return (
    <>
      {/* Desktop Top Bar / Header */}
      <header id="desktop-header" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div 
          onClick={() => setCurrentPage('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl electric-gradient-btn flex items-center justify-center text-white glow-purple shadow-lg transition-transform group-hover:scale-105">
            <Zap className="w-6 h-6 fill-white/20" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase electric-gradient-text leading-tight">
              Veloura Quest
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Mobile Reward Ecosystem</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 glow-purple' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User Balance & Profile Quick Info */}
        <div className="flex items-center space-x-3">
          {userProfile && (
            <div 
              onClick={() => setCurrentPage('wallet')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-xs font-bold text-slate-100 cursor-pointer hover:border-purple-400 transition-all glow-blue"
            >
              <span className="text-emerald-400 font-extrabold">${userProfile.currentBalance.toFixed(2)}</span>
            </div>
          )}

          {userProfile ? (
            <button
              onClick={() => setCurrentPage('profile')}
              className="w-9 h-9 rounded-full overflow-hidden border border-purple-400/40 p-0.5 glow-purple focus:outline-none"
            >
              <img 
                src={userProfile.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-full"
              />
            </button>
          ) : (
            <button
              onClick={() => setCurrentPage('login')}
              className="px-4 py-1.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-md hover:opacity-95"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Mobile-first requirement) */}
      <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/90 px-3 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
                isActive ? 'text-purple-400 font-bold scale-110' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-ping"></span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
};

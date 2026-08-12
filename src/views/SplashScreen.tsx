import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Sparkles, ChevronRight, ShieldCheck, Trophy, Gift, Flame, Lock } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { setCurrentPage } = useAuth();

  return (
    <div id="splash-view" className="min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden bg-slate-950">
      {/* Background Lighting Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Tag & 18+ Badge */}
      <div className="w-full flex justify-between items-center max-w-md pt-4 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg electric-gradient-btn flex items-center justify-center text-white glow-red">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <span className="text-sm font-black tracking-widest electric-gradient-text uppercase">Veloura Quest</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-400 animated-18-badge flex items-center gap-1 shadow-lg">
            <Lock className="w-3 h-3" /> 18+ ONLY
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
            v2.4 Live
          </span>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="w-full max-w-md my-auto space-y-6 z-10 text-center">
        <div className="relative inline-block mx-auto mb-2">
          <div className="relative flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-rose-500/20 bg-rose-600/10 pointer-events-none blur-xl" />
            <img
              src="/veloura-logo.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/d/1ztGHTiifIgk6YlzX0LqprR3UF5mTQc6f';
              }}
              alt="Veloura Quest Logo"
              className="w-44 sm:w-48 object-contain h-auto drop-shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-logo-float-breath"
            />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-3 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> 18+ Mature Web Quests & Rewards Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Adult Earn Hub <br /><span className="shimmer-text">18+ Premium Quests</span>
          </h1>
          <p className="text-xs text-slate-300 mt-3 leading-relaxed px-4">
            Exclusive 18+ rewarded web quests. Complete 5 high-yield daily tasks, invite friends, and instantly withdraw cash rewards to your wallet.
          </p>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1 hover:border-rose-500/40 transition-all">
            <Gift className="w-5 h-5 text-rose-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">5 Daily Quests</span>
          </div>
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1 hover:border-amber-500/40 transition-all">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">50% Referral</span>
          </div>
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1 hover:border-emerald-500/40 transition-all">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">Fast 18+ Cashout</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="w-full max-w-md space-y-3 z-10 pb-6">
        <button
          id="splash-get-started"
          onClick={() => setCurrentPage('register')}
          className="w-full py-4 rounded-2xl electric-gradient-btn text-sm font-bold text-white shadow-xl glow-red flex items-center justify-center gap-2 group transition-all"
        >
          <span>Confirm 18+ & Start Quests</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          id="splash-login"
          onClick={() => setCurrentPage('login')}
          className="w-full py-3.5 rounded-2xl glass-panel hover:bg-slate-800/80 text-xs font-semibold text-slate-300 transition-colors"
        >
          Already verified? Sign In
        </button>
      </div>
    </div>
  );
};


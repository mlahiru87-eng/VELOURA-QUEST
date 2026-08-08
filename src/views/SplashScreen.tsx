import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Sparkles, ChevronRight, ShieldCheck, Trophy, Gift } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { setCurrentPage } = useAuth();

  return (
    <div id="splash-view" className="min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden bg-slate-950">
      {/* Background Lighting Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Tag */}
      <div className="w-full flex justify-between items-center max-w-md pt-4 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg electric-gradient-btn flex items-center justify-center text-white glow-purple">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <span className="text-sm font-black tracking-widest electric-gradient-text uppercase">Veloura Quest</span>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
          v2.4 Live
        </span>
      </div>

      {/* Main Hero Card */}
      <div className="w-full max-w-md my-auto space-y-6 z-10 text-center">
        <div className="relative inline-block mx-auto mb-2">
          <div className="w-24 h-24 rounded-3xl electric-gradient-btn flex items-center justify-center text-white shadow-2xl glow-purple mx-auto animate-pulse">
            <Trophy className="w-12 h-12 text-amber-300" />
          </div>
          <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-blue-500 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Earn Cash Rewards with <span className="electric-gradient-text">Daily Quests</span>
          </h1>
          <p className="text-xs text-slate-300 mt-3 leading-relaxed px-4">
            Complete 5 high-yield daily tasks, invite friends for instant cash bonuses, and withdraw earnings seamlessly to PayPal or Crypto.
          </p>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1">
            <Gift className="w-5 h-5 text-purple-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">5 Daily Tasks</span>
          </div>
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">$5 Referral</span>
          </div>
          <div className="p-3 glass-panel rounded-2xl text-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
            <span className="text-[10px] font-bold text-slate-200 block">Fast Cashout</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="w-full max-w-md space-y-3 z-10 pb-6">
        <button
          id="splash-get-started"
          onClick={() => setCurrentPage('register')}
          className="w-full py-4 rounded-2xl electric-gradient-btn text-sm font-bold text-white shadow-xl glow-purple flex items-center justify-center gap-2 group transition-all"
        >
          <span>Get Started & Claim Bonus</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          id="splash-login"
          onClick={() => setCurrentPage('login')}
          className="w-full py-3.5 rounded-2xl glass-panel hover:bg-slate-800/80 text-xs font-semibold text-slate-300 transition-colors"
        >
          Already have an account? Sign In
        </button>
      </div>
    </div>
  );
};

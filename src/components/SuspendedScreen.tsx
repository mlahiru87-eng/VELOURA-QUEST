import React from 'react';
import { ShieldX, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SuspendedScreen: React.FC = () => {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
          <ShieldX className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Account Suspended</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your account has been temporarily suspended due to security flags or suspicious system activity.
          </p>
        </div>

        {userProfile?.suspendedReason && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/20 rounded-2xl text-xs text-rose-300 text-left">
            <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-400 mb-1">Reason:</span>
            {userProfile.suspendedReason}
          </div>
        )}

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2 text-left">
          <p className="font-semibold text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" /> Need Help or Appeals?
          </p>
          <p>Please contact compliance support at <a href="mailto:support@veloura-quest.vercel.app" className="text-purple-400 underline">support@veloura-quest.vercel.app</a> with your registered email ({userProfile?.email}).</p>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

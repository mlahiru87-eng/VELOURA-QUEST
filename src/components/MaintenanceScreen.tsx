import React from 'react';
import { Wrench, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MaintenanceScreen: React.FC = () => {
  const { refreshData } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshData();
    setTimeout(() => setChecking(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900/80 border border-purple-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
          <Wrench className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">System Under Maintenance</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Veloura Quest is undergoing scheduled system upgrades and database optimizations to serve you better.
          </p>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1 text-left">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <ShieldAlert className="w-4 h-4" /> Expected Upgrades:
          </div>
          <p>• Fast Firestore database indexing</p>
          <p>• Enhanced reward claim security validation</p>
          <p>• Automated withdrawal processing queues</p>
        </div>

        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full py-3 px-6 rounded-2xl electric-gradient-btn text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking Status...' : 'Check Status Again'}
        </button>

        <p className="text-xs text-slate-500">Administrators may sign in or access Admin Panel during maintenance.</p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, LogIn, AlertCircle, ShieldAlert, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, setCurrentPage } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = () => {
    setEmail('demo@velouraquest.app');
    setPassword('password123');
  };

  const fillDemoAdmin = () => {
    setEmail('admin@velouraquest.app');
    setPassword('admin123');
  };

  return (
    <div id="login-view" className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => setCurrentPage('splash')}
            className="w-12 h-12 rounded-2xl electric-gradient-btn flex items-center justify-center text-white glow-purple mx-auto cursor-pointer"
          >
            <Zap className="w-6 h-6 fill-white/20" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-2">Welcome Back</h2>
          <p className="text-xs text-slate-400">Sign in to access your daily quests & wallet</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email-input"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => setCurrentPage('forgotPassword')}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Credentials for Fast Testing */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Quick Demo Logins</span>
          <div className="flex gap-2">
            <button
              onClick={fillDemoUser}
              type="button"
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-purple-300 border border-purple-500/20 flex items-center justify-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" /> Demo User
            </button>
            <button
              onClick={fillDemoAdmin}
              type="button"
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-amber-500/20 flex items-center justify-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Demo Admin
            </button>
          </div>
        </div>

        {/* Toggle to Register */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="font-bold text-purple-400 hover:text-purple-300"
            >
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

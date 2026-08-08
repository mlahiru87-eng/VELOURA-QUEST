import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordView: React.FC = () => {
  const { resetPassword, setCurrentPage } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await resetPassword(email.trim());
      setMessage('Password reset link sent to your email inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Ensure the address is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="forgot-password-view" className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl relative z-10 space-y-6">
        <button
          onClick={() => setCurrentPage('login')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl electric-gradient-btn flex items-center justify-center text-white glow-purple mx-auto">
            <Zap className="w-6 h-6 fill-white/20" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-2">Reset Password</h2>
          <p className="text-xs text-slate-400">Enter your account email to receive reset instructions</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

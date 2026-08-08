import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, User, Mail, Lock, Gift, UserPlus, AlertCircle } from 'lucide-react';

export const RegisterView: React.FC = () => {
  const { register, setCurrentPage, settings } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email.trim(), password, name.trim(), referralCode.trim());
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="register-view" className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => setCurrentPage('splash')}
            className="w-12 h-12 rounded-2xl electric-gradient-btn flex items-center justify-center text-white glow-purple mx-auto cursor-pointer"
          >
            <Zap className="w-6 h-6 fill-white/20" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-2">Create Account</h2>
          <p className="text-xs text-slate-400">Join Veloura Quest and start earning rewards daily</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-name-input"
                type="text"
                required
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-email-input"
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-password-input"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Referral Code <span className="text-purple-400 font-normal">(Optional - +${settings.referralBonus.toFixed(2)} Bonus)</span>
            </label>
            <div className="relative">
              <Gift className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-refcode-input"
                type="text"
                placeholder="e.g. VQ-8849"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-amber-300 font-mono uppercase"
              />
            </div>
          </div>

          <button
            id="register-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register & Claim Bonus'}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="font-bold text-purple-400 hover:text-purple-300"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WithdrawalRequest } from '../types';
import { X, Wallet, DollarSign, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface WithdrawalModalProps {
  onClose: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ onClose }) => {
  const { userProfile, settings, submitWithdrawalRequest } = useAuth();
  const [amount, setAmount] = useState<string>(settings.minWithdrawal.toString());
  const [method, setMethod] = useState<WithdrawalRequest['method']>('PayPal');
  const [destination, setDestination] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount');
      return;
    }

    if (!destination.trim()) {
      setErrorMsg('Please enter your receiving account email or wallet address');
      return;
    }

    setIsSubmitting(true);
    const res = await submitWithdrawalRequest(numAmount, method, destination.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div id="withdrawal-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg electric-gradient-btn flex items-center justify-center text-white">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Request Withdrawal</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {userProfile && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Available Wallet Balance</span>
            <span className="text-sm font-bold text-emerald-400">${userProfile.currentBalance.toFixed(2)}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Withdrawal Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
            >
              <option value="PayPal" className="bg-slate-900">PayPal Express Cashout</option>
              <option value="Crypto (USDT)" className="bg-slate-900">Crypto Wallet (USDT TRC20)</option>
              <option value="Bank Transfer" className="bg-slate-900">Direct Bank Wire Transfer</option>
              <option value="Amazon Gift Card" className="bg-slate-900">Amazon E-Gift Voucher</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount (Min ${settings.minWithdrawal.toFixed(2)})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min={settings.minWithdrawal}
                max={userProfile?.currentBalance || 1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full glass-input rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-100 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {method === 'PayPal' ? 'PayPal Email Address' : method === 'Crypto (USDT)' ? 'USDT TRC20 Wallet Address' : 'Account Details / Email'}
            </label>
            <input
              type="text"
              placeholder={method === 'PayPal' ? 'user@paypal.com' : method === 'Crypto (USDT)' ? 'T...' : 'Account information...'}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing Request...' : 'Submit Withdrawal'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

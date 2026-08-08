import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserProfile } from '../types';
import { X, Wallet, Plus, Minus, ShieldCheck } from 'lucide-react';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

export const WalletAdjustmentModal: React.FC<Props> = ({ user, onClose }) => {
  const { performManualWalletAdjustment } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amountStr, setAmountStr] = useState<string>('5.00');
  const [reason, setReason] = useState<string>('Manual administrative adjustment / resolution');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Invalid Amount", "Please enter a valid positive adjustment amount.", "warning");
      return;
    }

    if (!reason.trim()) {
      showToast("Reason Required", "Please provide a reason for audit logging.", "warning");
      return;
    }

    setIsSubmitting(true);
    const finalAmount = mode === 'add' ? parsedAmount : -parsedAmount;

    try {
      const res = await performManualWalletAdjustment(user.uid, finalAmount, reason.trim());
      if (res.success) {
        showToast("Wallet Adjusted", `Successfully ${mode === 'add' ? 'added' : 'deducted'} $${parsedAmount.toFixed(2)} to ${user.displayName}'s wallet.`, "success");
        onClose();
      } else {
        showToast("Adjustment Failed", res.message, "error");
      }
    } catch (err) {
      showToast("Error", "An unexpected error occurred during adjustment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-purple-500/40 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Manual Wallet Adjustment</h3>
              <p className="text-[11px] text-slate-400">{user.displayName} ({user.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold uppercase">Current Wallet Balance</span>
          <span className="text-xl font-black text-emerald-400">${user.currentBalance.toFixed(2)}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Add / Deduct Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'add' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Add Funds
            </button>
            <button
              type="button"
              onClick={() => setMode('deduct')}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'deduct' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" /> Deduct Funds
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Adjustment Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono font-bold"
            />
          </div>

          {/* Audit Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Audit Log Reason *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Promotional bonus credit, dispute resolution, refund adjustment..."
              className="w-full glass-input rounded-xl p-3 text-xs text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Log...' : 'Confirm & Save Audit Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

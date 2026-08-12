import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Wallet, Send, AlertTriangle, CheckCircle2, ShieldAlert, Info, Lock } from 'lucide-react';
import { isValidTRC20Address, maskWalletAddress } from '../lib/securityAndUtils';

interface WithdrawalModalProps {
  onClose: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ onClose }) => {
  const { userProfile, settings, submitWithdrawalRequest } = useAuth();
  
  const minWithdrawal = settings?.minWithdrawal && settings.minWithdrawal >= 20 ? settings.minWithdrawal : 20.00;
  
  const [amount, setAmount] = useState<string>(minWithdrawal.toString());
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [confirmAccepted, setConfirmAccepted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successData, setSuccessData] = useState<{ amount: number; address: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isAddressValid = isValidTRC20Address(walletAddress);
  const isAmountValid = parsedAmount >= minWithdrawal && userProfile && parsedAmount <= userProfile.currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!userProfile) {
      setErrorMsg('You must be logged in to request a withdrawal.');
      return;
    }

    if (parsedAmount < minWithdrawal) {
      setErrorMsg('Minimum withdrawal amount is 20 USDT.');
      return;
    }

    if (parsedAmount > userProfile.currentBalance) {
      setErrorMsg(`Insufficient balance. Your available balance is $${userProfile.currentBalance.toFixed(2)}.`);
      return;
    }

    if (!walletAddress.trim()) {
      setErrorMsg('Please enter your USDT TRC20 wallet address.');
      return;
    }

    if (!isAddressValid) {
      setErrorMsg('Invalid TRC20 wallet address. TRC20 addresses start with "T" and are exactly 34 characters long.');
      return;
    }

    if (!confirmAccepted) {
      setErrorMsg('Please check the confirmation box before submitting.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitWithdrawalRequest(parsedAmount, walletAddress.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSuccessData({
        amount: parsedAmount,
        address: walletAddress.trim(),
        message: res.message
      });
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div id="withdrawal-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/30 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Crypto Cashout</h3>
              <p className="text-xs text-rose-300/80">Manual USDT TRC20 Payout</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="space-y-5 py-2 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-200">Withdrawal Request Submitted!</p>
                <p className="text-xs text-emerald-300/90 leading-relaxed">{successData.message}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Withdrawal Amount:</span>
                <span className="font-bold text-emerald-400">${successData.amount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Currency:</span>
                <span className="font-semibold text-slate-200">USDT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Network:</span>
                <span className="font-semibold text-rose-300">TRC20</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Destination Wallet:</span>
                <span className="font-mono text-slate-200">{maskWalletAddress(successData.address)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Pending Approval</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-400 shrink-0" />
              <span>An administrator will review your payout request and process transfer outside the platform.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-bold text-white shadow-lg transition-all"
            >
              Back to Wallet
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Balance Header */}
            {userProfile && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Available Balance</span>
                  <span className="text-lg font-black text-rose-400">${userProfile.currentBalance.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 block">Minimum Payout</span>
                  <span className="text-xs font-bold text-slate-300">${minWithdrawal.toFixed(2)} USDT</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Readonly Currency & Network Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Supported Currency</label>
                <div className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span>USDT</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">Stablecoin</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Supported Network</label>
                <div className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-300 bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span>TRC20</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">TRON</span>
                </div>
              </div>
            </div>

            {/* Wallet Address Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>USDT TRC20 Wallet Address</span>
                {walletAddress && (
                  <span className={`text-[10px] ${isAddressValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isAddressValid ? '✓ Valid TRC20 Address' : '✕ Invalid (Must start with T, 34 chars)'}
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="Enter TRC20 address starting with T... (e.g. TAbc123...)"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono transition-colors ${
                  walletAddress 
                    ? isAddressValid 
                      ? 'border-emerald-500/50 focus:border-emerald-400' 
                      : 'border-rose-500/60 focus:border-rose-400' 
                    : ''
                }`}
              />
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Withdrawal Amount (Min ${minWithdrawal.toFixed(2)})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  min={minWithdrawal}
                  max={userProfile?.currentBalance || 1000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full glass-input rounded-xl pl-8 pr-16 py-2.5 text-xs text-slate-100 font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                  USDT
                </span>
              </div>
            </div>

            {/* Estimated Network Fee */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimated Network Fee</span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                Handled by Admin
              </span>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Important Network Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Only send USDT using the <strong className="text-amber-200 underline">TRC20 network</strong>. Using an incorrect network or wallet address may result in permanent loss of funds.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="confirm-trc20"
                checked={confirmAccepted}
                onChange={(e) => setConfirmAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-950 cursor-pointer"
              />
              <label htmlFor="confirm-trc20" className="text-[11px] text-slate-300 leading-snug cursor-pointer select-none">
                I confirm that this is my correct <strong className="text-rose-300">USDT TRC20</strong> wallet address and that I understand crypto transactions may be irreversible.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !confirmAccepted || !isAddressValid || !isAmountValid}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                confirmAccepted && isAddressValid && isAmountValid && !isSubmitting
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-rose-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Lock className="w-4 h-4 animate-spin" />
                  <span>Processing Secure Transaction...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit USDT TRC20 Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};


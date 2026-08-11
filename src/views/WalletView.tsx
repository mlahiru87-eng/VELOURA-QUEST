import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { 
  Wallet, 
  ArrowUpRight, 
  Trophy, 
  CreditCard,
  ArrowDownLeft,
  RefreshCw,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { maskWalletAddress } from '../lib/securityAndUtils';

export const WalletView: React.FC = () => {
  const { userProfile, transactions, withdrawals, settings } = useAuth();
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');

  if (!userProfile) return null;

  const minPayout = settings?.minWithdrawal && settings.minWithdrawal >= 20 ? settings.minWithdrawal : 20.00;

  return (
    <div id="wallet-view" className="space-y-6 pb-20 md:pb-8">
      {/* Wallet Main Balance Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 relative overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-rose-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-900/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Wallet className="w-3.5 h-3.5 text-rose-400" />
                Verified Wallet Balance
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                <ShieldCheck className="w-3 h-3" />
                USDT TRC20
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black text-rose-400 tracking-tight">
              ${userProfile.currentBalance.toFixed(2)} <span className="text-lg font-bold text-slate-400">USDT</span>
            </div>
            <p className="text-xs text-slate-400">Minimum Withdrawal: 20 USDT • Handled by Admin</p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-bold text-white shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw USDT TRC20</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Lifetime Earned</span>
            <div className="text-xl font-black text-rose-300">${userProfile.totalEarned.toFixed(2)} USDT</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Approved Crypto Payouts</span>
            <div className="text-xl font-black text-slate-100">
              {withdrawals.filter(w => w.status === 'approved').length} Disbursed
            </div>
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'transactions' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'withdrawals' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crypto Cashouts ({withdrawals.length})
            </button>
          </div>
        </div>

        {/* Real-time Transactions History */}
        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No wallet transactions recorded yet. Complete daily quests to earn rewards!
              </div>
            ) : (
              transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        tx.type === 'withdrawal'
                          ? 'bg-amber-500/20 text-amber-400'
                          : tx.type === 'withdrawal_refund'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {tx.type === 'withdrawal' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : tx.type === 'withdrawal_refund' ? (
                          <RefreshCw className="w-4 h-4" />
                        ) : tx.type === 'referral_bonus' ? (
                          <Gift className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{tx.description}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {tx.txHash && <span className="ml-2 font-mono text-emerald-400">TXID: {tx.txHash.slice(0, 10)}...</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-xs font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-slate-500">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Withdrawal History Table/List */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No withdrawal requests submitted yet.
              </div>
            ) : (
              withdrawals.map((w) => {
                const walletAddressStr = w.walletAddress || w.destination || '';
                return (
                  <div key={w.id} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200">USDT Cashout</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                              {w.network || 'TRC20'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Wallet: {maskWalletAddress(walletAddressStr)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-rose-400">${w.amount.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">USDT</span></span>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border flex items-center gap-1 ${
                            w.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : w.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {w.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {w.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {w.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span>{w.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Transaction Metadata Details */}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                      <span>Submitted: {new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {w.status === 'approved' && w.txHash && (
                        <span className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <span>TXID: {w.txHash}</span>
                        </span>
                      )}

                      {w.status === 'rejected' && w.rejectionReason && (
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Reason: {w.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showWithdrawModal && <WithdrawalModal onClose={() => setShowWithdrawModal(false)} />}
    </div>
  );
};

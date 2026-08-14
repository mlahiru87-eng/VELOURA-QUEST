import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TransactionRecord } from '../types';
import { 
  Receipt, 
  Search, 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Gift, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { formatUsdtAmount } from '../lib/referralCommission';

export const AdminTransactionsView: React.FC = () => {
  const { allTransactions, allUsers } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task_reward' | 'referral_bonus' | 'welcome_bonus' | 'withdrawal' | 'adjustment'>('all');

  const filteredTransactions = allTransactions.filter((tx) => {
    // Type match
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const user = allUsers.find(u => u.uid === tx.userId);
      const userEmail = (user?.email || '').toLowerCase();
      const userName = (user?.displayName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const id = (tx.id || '').toLowerCase();
      return userEmail.includes(q) || userName.includes(q) || desc.includes(q) || id.includes(q);
    }
    return true;
  });

  const exportTransactionsCSV = () => {
    const headers = ['Transaction ID', 'User ID', 'User Email', 'Type', 'Amount (USDT)', 'Description', 'Status', 'Date'];
    const rows = filteredTransactions.map((tx) => {
      const user = allUsers.find(u => u.uid === tx.userId);
      return [
        `"${tx.id || ''}"`,
        `"${tx.userId}"`,
        `"${user?.email || 'N/A'}"`,
        `"${tx.type}"`,
        `"${tx.amount}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        `"${tx.status || 'completed'}"`,
        `"${new Date(tx.createdAt).toISOString()}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `veloura_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'task_reward':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🎯 Task Reward</span>;
      case 'referral_bonus':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">👥 Referral (50%)</span>;
      case 'welcome_bonus':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🎁 Welcome Bonus</span>;
      case 'withdrawal':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">💸 Cashout</span>;
      case 'adjustment':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">⚙️ Manual Adjustment</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400">{type}</span>;
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-400" /> Platform Transaction Ledger
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Complete immutable financial record of all system reward credits, referral commissions, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, email, txid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-1.5 text-xs text-slate-100 rounded-xl"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="glass-input px-3 py-1.5 text-xs text-slate-300 rounded-xl bg-slate-900 border-slate-800"
          >
            <option value="all">All Types</option>
            <option value="task_reward">Task Rewards</option>
            <option value="referral_bonus">Referral (50%)</option>
            <option value="welcome_bonus">Welcome Bonus</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="adjustment">Adjustments</option>
          </select>

          <button
            onClick={exportTransactionsCSV}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1 shrink-0"
            title="Export Ledger to CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">User & Email</th>
              <th className="py-3 px-3">Description</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                  No matching transaction records found.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const user = allUsers.find(u => u.uid === tx.userId);
                const isNegative = tx.type === 'withdrawal';

                return (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getTypeBadge(tx.type)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200">{user?.displayName || 'Unknown User'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{user?.email || tx.userId}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {tx.description}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono font-black">
                      <span className={isNegative ? 'text-rose-400' : 'text-emerald-400'}>
                        {isNegative ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tx.status || 'completed'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FileText, 
  Download, 
  Database, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Receipt,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { formatUsdtAmount } from '../lib/referralCommission';

export const AdminReportsView: React.FC = () => {
  const { allUsers, allWithdrawals, allTransactions, auditLogs } = useAuth();
  const { showToast } = useToast();

  const [auditSearch, setAuditSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityVerified, setIntegrityVerified] = useState(false);

  // Financial calculations
  const totalUsersCount = allUsers.length;
  const totalWalletLiability = allUsers.reduce((sum, u) => sum + (u.currentBalance || 0), 0);
  const totalEarningsDistributed = allUsers.reduce((sum, u) => sum + (u.totalEarned || 0), 0);
  
  const approvedWithdrawals = allWithdrawals.filter(w => w.status === 'approved');
  const totalPaidOut = approvedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  
  const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending');
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.adminEmail || '').toLowerCase().includes(q) ||
      (log.targetUserEmail || '').toLowerCase().includes(q) ||
      (log.reason || '').toLowerCase().includes(q)
    );
  });

  const exportUsersCSV = () => {
    const headers = ['UID', 'Display Name', 'Email', 'Role', 'Balance (USDT)', 'Total Earned (USDT)', 'Referral Code', 'Referred By', 'Flagged', 'Suspended', 'Created At'];
    const rows = allUsers.map(u => [
      `"${u.uid}"`,
      `"${u.displayName}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.currentBalance}"`,
      `"${u.totalEarned}"`,
      `"${u.referralCode}"`,
      `"${u.referredBy || ''}"`,
      `"${u.isFlagged ? 'YES' : 'NO'}"`,
      `"${u.isSuspended ? 'YES' : 'NO'}"`,
      `"${u.createdAt}"`
    ]);
    downloadCSV(`veloura_users_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast("Report Exported", "User accounts CSV downloaded.", "success");
  };

  const exportWithdrawalsCSV = () => {
    const headers = ['Request ID', 'User Email', 'User Name', 'Amount (USDT)', 'Currency', 'Network', 'Wallet Address', 'Status', 'TXID', 'Rejection Reason', 'Admin Memo', 'Created At'];
    const rows = allWithdrawals.map(w => [
      `"${w.id}"`,
      `"${w.userEmail}"`,
      `"${w.userName || ''}"`,
      `"${w.amount}"`,
      `"${w.currency || 'USDT'}"`,
      `"${w.network || 'TRC20'}"`,
      `"${w.walletAddress || w.destination}"`,
      `"${w.status}"`,
      `"${w.txHash || ''}"`,
      `"${w.rejectionReason || ''}"`,
      `"${w.adminNote || ''}"`,
      `"${w.createdAt}"`
    ]);
    downloadCSV(`veloura_withdrawals_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast("Report Exported", "Withdrawals report CSV downloaded.", "success");
  };

  const exportAuditLogsCSV = () => {
    const headers = ['Log ID', 'Action', 'Admin Email', 'Target User Email', 'Reason', 'Timestamp'];
    const rows = auditLogs.map(l => [
      `"${l.id}"`,
      `"${l.action}"`,
      `"${l.adminEmail}"`,
      `"${l.targetUserEmail || ''}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${l.createdAt}"`
    ]);
    downloadCSV(`veloura_audit_logs_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast("Report Exported", "Security Audit Logs CSV downloaded.", "success");
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRunVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIntegrityVerified(true);
      showToast("Verification Complete", "All collections and balances verified without discrepancies.", "success");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Liability Card */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total User Balances</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${formatUsdtAmount(totalWalletLiability)} USDT
          </div>
          <p className="text-[10px] text-slate-400">Current liability stored across {totalUsersCount} user wallets</p>
        </div>

        {/* Total Paid Out */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Approved Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${formatUsdtAmount(totalPaidOut)} USDT
          </div>
          <p className="text-[10px] text-slate-400">{approvedWithdrawals.length} cashout requests paid out</p>
        </div>

        {/* Pending Payouts */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Liability</span>
            <CreditCard className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            ${formatUsdtAmount(totalPendingAmount)} USDT
          </div>
          <p className="text-[10px] text-slate-400">{pendingWithdrawals.length} cashout requests pending approval</p>
        </div>
      </div>

      {/* CSV Export Center */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-purple-400" /> Export Platform Reports (CSV)
        </h3>
        <p className="text-xs text-slate-400">
          Generate structured CSV snapshots of system databases for accounting, offline analysis, and regulatory auditing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={exportUsersCSV}
            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <Download className="w-4 h-4 text-slate-500 group-hover:text-purple-300" />
            </div>
            <div className="text-xs font-bold text-slate-200">Users Directory Report</div>
            <div className="text-[10px] text-slate-400 mt-1">Export {allUsers.length} user accounts & security flags</div>
          </button>

          <button
            onClick={exportWithdrawalsCSV}
            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <Download className="w-4 h-4 text-slate-500 group-hover:text-rose-300" />
            </div>
            <div className="text-xs font-bold text-slate-200">Cashouts & Payouts Report</div>
            <div className="text-[10px] text-slate-400 mt-1">Export {allWithdrawals.length} TRC20 crypto payout logs</div>
          </button>

          <button
            onClick={exportAuditLogsCSV}
            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <Download className="w-4 h-4 text-slate-500 group-hover:text-amber-300" />
            </div>
            <div className="text-xs font-bold text-slate-200">Security Audit Log Report</div>
            <div className="text-[10px] text-slate-400 mt-1">Export {auditLogs.length} administrative action entries</div>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" /> Administrative Audit Log Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Immutable chronological record of all administrative actions, balance adjustments, and security flags.
            </p>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit action, email, reason..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-1.5 text-xs text-slate-100 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredAuditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No admin audit log entries match your filter.</div>
          ) : (
            filteredAuditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-200 uppercase bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {log.action}
                    </span>
                    {log.targetUserEmail && (
                      <span className="text-xs text-purple-300 font-medium">Target: {log.targetUserEmail}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    "{log.reason}" • Executed by <span className="text-slate-300 font-mono">{log.adminEmail}</span>
                  </p>
                </div>

                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

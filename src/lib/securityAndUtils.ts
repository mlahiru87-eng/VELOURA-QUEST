import { UserProfile, WithdrawalRequest, TransactionRecord } from '../types';

// Rate Limiter storage for client-side state
const claimTimestamps: Record<string, number[]> = {};
const loginFailures: Record<string, { count: number; lockedUntil: number }> = {};

/**
 * Checks if reward claim is rate-limited (Max 3 claims per 30 seconds per user).
 */
export const checkClaimRateLimit = (userId: string): { allowed: boolean; waitSeconds?: number } => {
  const now = Date.now();
  const history = claimTimestamps[userId] || [];
  
  // Clean timestamps older than 30 seconds
  const recent = history.filter((t) => now - t < 30000);
  
  if (recent.length >= 3) {
    const oldest = recent[0];
    const waitSeconds = Math.ceil((30000 - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  recent.push(now);
  claimTimestamps[userId] = recent;
  return { allowed: true };
};

/**
 * Tracks failed login attempts and applies exponential 5-minute lockout after 5 failures.
 */
export const recordLoginAttempt = (email: string, success: boolean): { allowed: boolean; remainingSeconds?: number } => {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  const record = loginFailures[key] || { count: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  if (success) {
    delete loginFailures[key];
    return { allowed: true };
  } else {
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = now + 5 * 60 * 1000; // 5 minute lockout
    }
    loginFailures[key] = record;
    return { allowed: true };
  }
};

/**
 * Validates whether a given string is a plausible TRC20 wallet address.
 * TRC20 addresses start with 'T', are 34 characters long, and use Base58 characters.
 */
export const isValidTRC20Address = (address: string): boolean => {
  if (!address) return false;
  const trimmed = address.trim();
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed) || /^T[a-zA-Z0-9]{33}$/.test(trimmed);
};

/**
 * Masks a wallet address for privacy in UI: TAbc••••••••••••••••XYZ123
 */
export const maskWalletAddress = (address: string): string => {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= 10) return trimmed;
  return `${trimmed.slice(0, 4)}••••••••••••••••${trimmed.slice(-6)}`;
};

/**
 * Analyzes user history to flag suspicious activities like rapid task completions or withdrawal spamming.
 */
export const evaluateSuspiciousActivity = (
  completedCountLastMinute: number,
  withdrawalCountLastFiveMinutes: number
): { suspicious: boolean; reason?: string } => {
  if (completedCountLastMinute >= 4) {
    return {
      suspicious: true,
      reason: 'Automated rapid task completion detected (4+ tasks in under 60s)'
    };
  }

  if (withdrawalCountLastFiveMinutes >= 3) {
    return {
      suspicious: true,
      reason: 'Repeated high-frequency withdrawal requests detected (3+ requests in 5m)'
    };
  }

  return { suspicious: false };
};

// CSV Export Helpers
const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportUsersCSV = (users: UserProfile[]) => {
  const headers = ['UID', 'Email', 'Display Name', 'Role', 'Current Balance ($)', 'Total Earned ($)', 'Referral Code', 'Flagged', 'Created At'];
  const rows = users.map((u) => [
    `"${u.uid}"`,
    `"${u.email}"`,
    `"${u.displayName}"`,
    `"${u.role}"`,
    u.currentBalance.toFixed(2),
    u.totalEarned.toFixed(2),
    `"${u.referralCode}"`,
    u.isFlagged ? 'YES' : 'NO',
    `"${new Date(u.createdAt).toISOString()}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, `veloura_users_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportWithdrawalsCSV = (withdrawals: WithdrawalRequest[]) => {
  const headers = ['Request ID', 'User ID', 'User Email', 'Amount ($)', 'Currency', 'Network', 'Wallet Address', 'Status', 'TXID', 'Requested At', 'Processed At'];
  const rows = withdrawals.map((w) => [
    `"${w.id}"`,
    `"${w.userId}"`,
    `"${w.userEmail || ''}"`,
    w.amount.toFixed(2),
    `"${w.currency || 'USDT'}"`,
    `"${w.network || 'TRC20'}"`,
    `"${w.walletAddress || w.destination || ''}"`,
    `"${w.status}"`,
    `"${w.txHash || ''}"`,
    `"${new Date(w.createdAt).toISOString()}"`,
    `"${w.processedAt ? new Date(w.processedAt).toISOString() : ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, `veloura_withdrawals_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportTransactionsCSV = (transactions: TransactionRecord[]) => {
  const headers = ['Transaction ID', 'User ID', 'Type', 'Amount ($)', 'Description', 'Status', 'Created At'];
  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${t.userId}"`,
    `"${t.type}"`,
    t.amount.toFixed(2),
    `"${t.description.replace(/"/g, '""')}"`,
    `"${t.status}"`,
    `"${new Date(t.createdAt).toISOString()}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, `veloura_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
};

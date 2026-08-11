export type PageView = 
  | 'splash' 
  | 'login' 
  | 'register' 
  | 'forgotPassword' 
  | 'home' 
  | 'tasks' 
  | 'wallet' 
  | 'referral' 
  | 'notifications' 
  | 'profile' 
  | 'admin'
  | 'complete';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  referralCode: string;
  referredBy?: string;
  currentBalance: number;
  totalEarned: number;
  role: 'user' | 'admin';
  createdAt: string;
  isFlagged?: boolean;
  flaggedReason?: string;
  flaggedAt?: string;
  isSuspended?: boolean;
  suspendedReason?: string;
  suspendedAt?: string;
  hasSeenOnboarding?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward: number;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  category: 'Video' | 'Survey' | 'Game Quest' | 'App Install' | 'Special' | string;
  createdAt: string;
  active?: boolean;
  // Aliases for component convenience
  thumbnail?: string;
  rewardAmount?: number;
  durationSeconds?: number;
}

export interface TaskSession {
  sessionId: string;
  taskId: string;
  userId: string;
  status: 'started' | 'completed' | 'abandoned';
  startedAt: any;
  completedAt?: string;
}

export interface TaskCompletion {
  id: string;
  userId: string;
  taskId: string;
  completedAt: string;
  claimedAmount: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'task_reward' | 'withdrawal' | 'withdrawal_refund' | 'referral_bonus' | 'welcome_bonus' | 'admin_adjustment';
  amount: number;
  currency?: 'USDT';
  network?: 'TRC20';
  withdrawalId?: string;
  txHash?: string;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
}

export interface WalletRecord {
  userId: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

export interface WithdrawalRequest {
  id: string;
  withdrawalId?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency: 'USDT';
  network: 'TRC20';
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string | null;
  processedBy?: string | null;
  adminNote?: string | null;
  txHash?: string | null;
  rejectionReason?: string | null;
  // Legacy aliases for backward compatibility if needed
  method?: string;
  destination?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  rewardAmount: number;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // specific user ID or 'all' for platform announcements
  title: string;
  message: string;
  type: 'reward' | 'task' | 'admin' | 'withdrawal' | 'security';
  read: boolean;
  createdAt: string;
}

export interface FeatureFlags {
  enableReferrals: boolean;
  enableWithdrawals: boolean;
  enableDailyTasks: boolean;
  enableNotifications: boolean;
}

export interface AnnouncementBanner {
  active: boolean;
  message: string;
  type: 'info' | 'warning' | 'alert';
}

export interface SystemSettings {
  minWithdrawal: number;
  referralBonus: number;
  maintenanceMode: boolean;
  announcementBanner?: AnnouncementBanner;
  featureFlags: FeatureFlags;
}

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  action: 'balance_adjustment' | 'account_flag' | 'account_unflag' | 'withdrawal_override' | 'settings_update';
  amountChanged?: number;
  reason: string;
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

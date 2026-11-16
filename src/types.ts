export type PaymentMethod = 'bkash' | 'nagad';

export interface BankCard {
  method: PaymentMethod;
  accountName: string;
  accountNumber: string;
  updatedAt: string;
}

export interface GlobalSettings {
  supportGroupUrl: string;
  supportChannelUrl: string;
  bkashNumber: string;
  nagadNumber: string;
  minDeposit: number;
  minWithdraw: number;
  welcomeBonus: number;
  level1Rate: number;
  level2Rate: number;
  level3Rate: number;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  validityDays: number;
  imageUrl: string;
  badge?: string;
  sortOrder: number;
  active: boolean;
}

export interface BannerSlide {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  badge?: string;
  imageUrl: string;
  accent?: string;
  active: boolean;
}

export interface User {
  id: string;
  phone: string;
  referralCode: string;
  referredBy: string | null;
  rechargeBalance: number;
  withdrawalBalance: number;
  hasRecharged: boolean;
  hasPurchasedPlan: boolean;
  bankCard: BankCard | null;
  claimedSalaryLevels: number[];
  redeemedGiftCodes: string[];
  createdAt: string;
}

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  imageUrl: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  validityDays: number;
  daysCredited: number;
  totalEarned: number;
  purchasedAt: string;
  nextPayoutAt: string;
  status: 'active' | 'completed';
}

export interface DepositRecord {
  id: string;
  orderId: string;
  userId: string;
  userPhone: string;
  amount: number;
  method: PaymentMethod;
  senderNumber: string;
  trxId: string;
  proofNote?: string;
  proofImageUrl?: string;
  isProofSubmission?: boolean;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface WithdrawRecord {
  id: string;
  userId: string;
  userPhone: string;
  amount: number;
  method: PaymentMethod;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'failed';
  createdAt: string;
  processedAt?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'bonus' | 'deposit' | 'plan_buy' | 'daily_income' | 'referral' | 'withdraw' | 'withdraw_refund' | 'gift_code' | 'salary' | 'admin_adjust';
  title: string;
  amount: number;
  balanceType: 'recharge' | 'withdrawal';
  createdAt: string;
}

export interface GiftCode {
  code: string;
  amount: number;
  active: boolean;
  maxUses?: number;
  usedCount: number;
  createdAt: string;
}

export interface TeamSummary {
  level1: { count: number; earnings: number; rate: number };
  level2: { count: number; earnings: number; rate: number };
  level3: { count: number; earnings: number; rate: number };
  totalValidUsers: number;
  totalEarnings: number;
}

export interface LiveFeedItem {
  id: string;
  type: 'withdraw' | 'income' | 'deposit';
  phone: string;
  amount: number;
  method?: string;
  label: string;
  timeText: string;
}

export interface BootstrapData {
  settings: GlobalSettings;
  plans: Plan[];
  banners: BannerSlide[];
  liveFeed: LiveFeedItem[];
}

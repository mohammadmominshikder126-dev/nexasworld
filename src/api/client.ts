import {
  BannerSlide,
  BootstrapData,
  DepositRecord,
  GiftCode,
  GlobalSettings,
  PaymentMethod,
  Plan,
  TeamSummary,
  TransactionRecord,
  User,
  UserPlan,
  WithdrawRecord,
} from '../types';

import { handleFallbackRequest } from './fallbackEngine';

const USER_TOKEN_KEY = 'nexas_user_token';
const ADMIN_TOKEN_KEY = 'nexas_admin_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response | null = null;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    return handleFallbackRequest<T>(url, options, headers);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return handleFallbackRequest<T>(url, options, headers);
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    return handleFallbackRequest<T>(url, options, headers);
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'অনুরোধ সম্পন্ন করা যায়নি।');
  }
  return data as T;
}

async function adminRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const adminToken = getAdminToken() || '';
  return request<T>(url, {
    ...options,
    headers: {
      'x-admin-token': adminToken,
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

export const api = {
  getBootstrap: () => request<BootstrapData>('/api/bootstrap'),

  register: (payload: {
    phone: string;
    password: string;
    confirmPassword?: string;
    referralCode?: string;
  }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { phone: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{
      user: User;
      userPlans: UserPlan[];
      deposits: DepositRecord[];
      withdrawals: WithdrawRecord[];
      transactions: TransactionRecord[];
      team: TeamSummary;
    }>('/api/auth/me'),

  buyPlan: (planId: string) =>
    request<{ message: string; user: User; userPlan: UserPlan }>('/api/plans/buy', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  createDeposit: (payload: {
    amount: number;
    method: PaymentMethod;
    senderNumber?: string;
    trxId: string;
  }) =>
    request<{ message: string; deposit: DepositRecord; user: User }>('/api/deposits/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitPaymentProof: (payload: {
    amount: number;
    method: PaymentMethod;
    senderNumber?: string;
    trxId: string;
    proofNote?: string;
    proofImageUrl?: string;
  }) =>
    request<{ message: string; deposit: DepositRecord }>('/api/deposits/submit-proof', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveBankCard: (payload: {
    method: PaymentMethod;
    accountName: string;
    accountNumber: string;
  }) =>
    request<{ message: string; user: User }>('/api/bank-card', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  withdraw: (amount: number) =>
    request<{ message: string; withdrawal: WithdrawRecord; user: User }>('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  redeemGiftCode: (code: string) =>
    request<{ message: string; user: User }>('/api/gift-code/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  claimDailySalary: (level: number) =>
    request<{ message: string; user: User }>('/api/daily-salary/claim', {
      method: 'POST',
      body: JSON.stringify({ level }),
    }),

  uploadImage: async (file: File): Promise<{ url: string; fileName: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি।'));
      reader.readAsDataURL(file);
    });
    return request<{ url: string; fileName: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, dataUrl }),
    });
  },

  getServerImages: () =>
    request<{ images: { name: string; url: string; source: 'server' | 'uploaded' }[] }>(
      '/api/server-images'
    ),

  // Admin APIs
  adminLogin: (passcode: string) =>
    request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  adminOverview: () =>
    adminRequest<{
      settings: GlobalSettings;
      plans: Plan[];
      banners: BannerSlide[];
      giftCodes: GiftCode[];
      withdrawals: WithdrawRecord[];
      deposits: DepositRecord[];
      users: User[];
      stats: {
        totalUsers: number;
        totalDeposits: number;
        pendingWithdrawals: number;
        pendingDeposits: number;
        activePlans: number;
      };
    }>('/api/admin/overview'),

  adminSaveSettings: (payload: GlobalSettings & { newPasscode?: string }) =>
    adminRequest<{ message: string; settings: GlobalSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminSearchUsers: (q: string) =>
    adminRequest<{ users: (User & { activePlansCount: number })[] }>(
      `/api/admin/users/search?q=${encodeURIComponent(q)}`
    ),

  adminAdjustBalance: (
    userId: string,
    payload: {
      balanceType: 'recharge' | 'withdrawal';
      action: 'add' | 'deduct';
      amount: number;
      note?: string;
    }
  ) =>
    adminRequest<{ message: string; user: User }>(`/api/admin/users/${userId}/balance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminProcessWithdrawal: (id: string, status: 'approved' | 'failed') =>
    adminRequest<{ message: string; withdrawal: WithdrawRecord }>(
      `/api/admin/withdrawals/${id}`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      }
    ),

  adminProcessDeposit: (id: string, status: 'completed' | 'failed') =>
    adminRequest<{ message: string; deposit: DepositRecord }>(`/api/admin/deposits/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  adminSavePlans: (plans: Plan[]) =>
    adminRequest<{ message: string; plans: Plan[] }>('/api/admin/plans', {
      method: 'PUT',
      body: JSON.stringify({ plans }),
    }),

  adminSaveBanners: (banners: BannerSlide[]) =>
    adminRequest<{ message: string; banners: BannerSlide[] }>('/api/admin/banners', {
      method: 'PUT',
      body: JSON.stringify({ banners }),
    }),

  adminCreateGiftCode: (payload: { code: string; amount: number; maxUses?: number }) =>
    adminRequest<{ message: string; giftCodes: GiftCode[] }>('/api/admin/gift-codes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminToggleGiftCode: (code: string) =>
    adminRequest<{ message: string; giftCodes: GiftCode[] }>(
      `/api/admin/gift-codes/${encodeURIComponent(code)}/toggle`,
      { method: 'PATCH' }
    ),

  adminDeleteGiftCode: (code: string) =>
    adminRequest<{ message: string; giftCodes: GiftCode[] }>(
      `/api/admin/gift-codes/${encodeURIComponent(code)}`,
      { method: 'DELETE' }
    ),
};

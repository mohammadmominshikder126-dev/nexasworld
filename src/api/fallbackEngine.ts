import { fetchGiftCodeFromFirestore } from '../firebase';
import {
  BANNER_IMAGES,
  DAILY_SALARY_TIERS,
  DEFAULT_BANNERS,
  DEFAULT_PLANS,
  DEFAULT_SETTINGS,
  PRODUCT_IMAGES,
} from '../data/plans';
import {
  BannerSlide,
  DepositRecord,
  GiftCode,
  GlobalSettings,
  LiveFeedItem,
  PaymentMethod,
  Plan,
  TeamSummary,
  TransactionRecord,
  User,
  UserPlan,
  WithdrawRecord,
} from '../types';

interface StoredFallbackUser extends User {
  passwordHash: string;
}

interface FallbackDatabase {
  adminPasscode: string;
  settings: GlobalSettings;
  plans: Plan[];
  banners: BannerSlide[];
  users: StoredFallbackUser[];
  sessions: Record<string, string>;
  adminTokens: Record<string, number>;
  userPlans: UserPlan[];
  deposits: DepositRecord[];
  withdrawals: WithdrawRecord[];
  transactions: TransactionRecord[];
  giftCodes: GiftCode[];
  liveFeed: LiveFeedItem[];
}

const FALLBACK_DB_KEY = 'nexas_fallback_db_v1';

function hashPasswordClient(password: string): string {
  // Deterministic lightweight hash for static fallback mode
  let h1 = 0xdeadbeef ^ password.length;
  let h2 = 0x41c6ce57 ^ password.length;
  const input = `nexas_${password}_salt`;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function genId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4);
  return `${prefix}_${rand}`;
}

function genRefCode(): string {
  return (
    Math.random().toString(16).slice(2, 7) + Math.random().toString(16).slice(2, 7)
  ).slice(0, 10);
}

export function normalizePhoneNumber(input: string): string {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 13) {
    return `+${digits.slice(0, 13)}`;
  }
  if (digits.startsWith('01') && digits.length >= 11) {
    return `+880${digits.slice(1, 11)}`;
  }
  if (digits.startsWith('1') && digits.length >= 10) {
    return `+880${digits.slice(0, 10)}`;
  }
  return '';
}

export function extractReferralCode(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('ref=')) {
    try {
      const normalized = trimmed.startsWith('http')
        ? trimmed
        : `https://nexas.local/?${trimmed.split('?')[1] || trimmed}`;
      const u = new URL(normalized);
      const refParam = u.searchParams.get('ref');
      if (refParam) return refParam.trim();
    } catch {
      const m = trimmed.match(/[?&]ref=([^&#\s]+)/i);
      if (m && m[1]) return m[1].trim();
    }
  }
  return trimmed;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  return `${phone.slice(0, 6)}****${phone.slice(-3)}`;
}

function sanitizeUser(u: StoredFallbackUser): User {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

function createInitialDb(): FallbackDatabase {
  return {
    adminPasscode: 'admin1234',
    settings: { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() },
    plans: DEFAULT_PLANS.map((p) => ({ ...p })),
    banners: DEFAULT_BANNERS.map((b) => ({ ...b })),
    users: [],
    sessions: {},
    adminTokens: {},
    userPlans: [],
    deposits: [],
    withdrawals: [],
    transactions: [],
    giftCodes: [
      { code: 'NEXAS10', amount: 10, active: true, usedCount: 0, createdAt: new Date().toISOString() },
      { code: 'VIP15', amount: 15, active: true, usedCount: 0, createdAt: new Date().toISOString() },
      { code: 'BONUS5', amount: 5, active: true, usedCount: 0, createdAt: new Date().toISOString() },
      { code: 'DAILY12', amount: 12, active: true, usedCount: 0, createdAt: new Date().toISOString() },
    ],
    liveFeed: [
      { id: 'lf_1', type: 'withdraw', phone: '+88017****842', amount: 1250, method: 'বিকাশ', label: 'উত্তোলন সফল', timeText: 'এইমাত্র' },
      { id: 'lf_2', type: 'income', phone: '+88018****319', amount: 460, label: 'VIP 4 দৈনিক আয়', timeText: '১ মিনিট আগে' },
      { id: 'lf_3', type: 'deposit', phone: '+88019****504', amount: 2500, method: 'নগদ', label: 'GoPay রিচার্জ', timeText: '২ মিনিট আগে' },
      { id: 'lf_4', type: 'withdraw', phone: '+88016****771', amount: 650, method: 'নগদ', label: 'উত্তোলন সফল', timeText: '৩ মিনিট আগে' },
      { id: 'lf_5', type: 'income', phone: '+88013****920', amount: 960, label: 'VIP 5 দৈনিক আয়', timeText: '৪ মিনিট আগে' },
      { id: 'lf_6', type: 'deposit', phone: '+88017****115', amount: 1200, method: 'বিকাশ', label: 'GoPay রিচার্জ', timeText: '৫ মিনিট আগে' },
    ],
  };
}

function loadFallbackDb(): FallbackDatabase {
  try {
    const raw = localStorage.getItem(FALLBACK_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FallbackDatabase>;
      const def = createInitialDb();
      return {
        ...def,
        ...parsed,
        settings: { ...def.settings, ...(parsed.settings || {}) },
        plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? parsed.plans : def.plans,
        banners: Array.isArray(parsed.banners) && parsed.banners.length > 0 ? parsed.banners : def.banners,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: parsed.sessions || {},
        adminTokens: parsed.adminTokens || {},
        userPlans: Array.isArray(parsed.userPlans) ? parsed.userPlans : [],
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        giftCodes: Array.isArray(parsed.giftCodes) && parsed.giftCodes.length > 0 ? parsed.giftCodes : def.giftCodes,
        liveFeed: Array.isArray(parsed.liveFeed) && parsed.liveFeed.length > 0 ? parsed.liveFeed : def.liveFeed,
      };
    }
  } catch {
    // ignore corrupted local storage
  }
  const initial = createInitialDb();
  saveFallbackDb(initial);
  return initial;
}

function saveFallbackDb(db: FallbackDatabase): void {
  localStorage.setItem(FALLBACK_DB_KEY, JSON.stringify(db));
}

export function syncCloudToFallbackEngine(patch: {
  settings?: GlobalSettings;
  plans?: Plan[];
  banners?: BannerSlide[];
}): void {
  try {
    const db = loadFallbackDb();
    if (patch.settings) {
      db.settings = {
        ...db.settings,
        ...patch.settings,
        updatedAt: patch.settings.updatedAt || new Date().toISOString(),
      };
    }
    if (patch.plans && patch.plans.length > 0) {
      const inactiveIds = new Map(patch.plans.map((p) => [p.id, p]));
      const merged = db.plans
        .filter((p) => !inactiveIds.has(p.id) && !p.active)
        .concat(patch.plans);
      db.plans = merged.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    if (patch.banners && patch.banners.length > 0) {
      const incomingIds = new Map(patch.banners.map((b) => [b.id, b]));
      const merged = db.banners
        .filter((b) => !incomingIds.has(b.id) && !b.active)
        .concat(patch.banners);
      db.banners = merged.sort((a, b) => a.order - b.order);
    }
    saveFallbackDb(db);
  } catch {
    // ignore storage quota errors
  }
}

function addTx(
  db: FallbackDatabase,
  userId: string,
  type: TransactionRecord['type'],
  title: string,
  amount: number,
  balanceType: 'recharge' | 'withdrawal'
) {
  db.transactions.unshift({
    id: genId('tx'),
    userId,
    type,
    title,
    amount,
    balanceType,
    createdAt: new Date().toISOString(),
  });
}

function pushFeed(db: FallbackDatabase, item: Omit<LiveFeedItem, 'id' | 'timeText'>) {
  db.liveFeed.unshift({ id: genId('lf'), timeText: 'এইমাত্র', ...item });
  if (db.liveFeed.length > 24) db.liveFeed = db.liveFeed.slice(0, 24);
}

function processPayouts(db: FallbackDatabase): boolean {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let changed = false;
  for (const up of db.userPlans) {
    if (up.status !== 'active') continue;
    let nextMs = new Date(up.nextPayoutAt).getTime();
    while (up.status === 'active' && nextMs <= now && up.daysCredited < up.validityDays) {
      const u = db.users.find((x) => x.id === up.userId);
      if (!u) break;
      u.withdrawalBalance = Number((u.withdrawalBalance + up.dailyIncome).toFixed(2));
      up.daysCredited += 1;
      up.totalEarned = Number((up.totalEarned + up.dailyIncome).toFixed(2));
      addTx(db, u.id, 'daily_income', `${up.planName} দৈনিক আয় (${up.daysCredited}/${up.validityDays})`, up.dailyIncome, 'withdrawal');
      pushFeed(db, { type: 'income', phone: maskPhone(u.phone), amount: up.dailyIncome, label: `${up.planName} দৈনিক আয়` });
      if (up.daysCredited >= up.validityDays) {
        up.status = 'completed';
      } else {
        nextMs += oneDayMs;
        up.nextPayoutAt = new Date(nextMs).toISOString();
      }
      changed = true;
    }
  }
  return changed;
}

function distributeRechargeCommission(
  db: FallbackDatabase,
  sourceUser: StoredFallbackUser,
  depositAmount: number
) {
  const rates = [
    { level: 1, rate: db.settings.level1Rate },
    { level: 2, rate: db.settings.level2Rate },
    { level: 3, rate: db.settings.level3Rate },
  ];
  let currentRefId = sourceUser.referredBy;
  for (const r of rates) {
    if (!currentRefId) break;
    const upline = db.users.find((u) => u.id === currentRefId);
    if (!upline) break;
    if (r.rate > 0) {
      const comm = Number(((depositAmount * r.rate) / 100).toFixed(2));
      if (comm > 0) {
        upline.withdrawalBalance = Number((upline.withdrawalBalance + comm).toFixed(2));
        addTx(
          db,
          upline.id,
          'referral',
          `লেভেল ${r.level} রেফার কমিশন (${r.rate}%) — ${maskPhone(sourceUser.phone)} রিচার্জ ৳${depositAmount}`,
          comm,
          'withdrawal'
        );
      }
    }
    currentRefId = upline.referredBy;
  }
}

function computeTeam(db: FallbackDatabase, user: StoredFallbackUser): TeamSummary {
  const l1 = db.users.filter((u) => u.referredBy === user.id);
  const l1Ids = new Set(l1.map((u) => u.id));
  const l2 = db.users.filter((u) => u.referredBy && l1Ids.has(u.referredBy));
  const l2Ids = new Set(l2.map((u) => u.id));
  const l3 = db.users.filter((u) => u.referredBy && l2Ids.has(u.referredBy));

  const valid1 = l1.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;
  const valid2 = l2.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;
  const valid3 = l3.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;

  const refTxs = db.transactions.filter((t) => t.userId === user.id && t.type === 'referral');
  const earn1 = refTxs.filter((t) => t.title.includes('লেভেল 1')).reduce((s, t) => s + t.amount, 0);
  const earn2 = refTxs.filter((t) => t.title.includes('লেভেল 2')).reduce((s, t) => s + t.amount, 0);
  const earn3 = refTxs.filter((t) => t.title.includes('লেভেল 3')).reduce((s, t) => s + t.amount, 0);

  return {
    level1: { count: valid1, earnings: earn1, rate: db.settings.level1Rate },
    level2: { count: valid2, earnings: earn2, rate: db.settings.level2Rate },
    level3: { count: valid3, earnings: earn3, rate: db.settings.level3Rate },
    totalValidUsers: valid1 + valid2 + valid3,
    totalEarnings: earn1 + earn2 + earn3,
  };
}

function requireUserFromHeaders(db: FallbackDatabase, headers: Record<string, string>): StoredFallbackUser {
  const auth = headers.Authorization || headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const userId = token ? db.sessions[token] : '';
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('অনুগ্রহ করে আবার লগইন করুন।');
  }
  return user;
}

function requireAdminFromHeaders(db: FallbackDatabase, headers: Record<string, string>) {
  const token = headers['x-admin-token'] || '';
  const exp = db.adminTokens[token];
  if (!token || !exp || exp < Date.now()) {
    throw new Error('অ্যাডমিন অনুমোদন প্রয়োজন।');
  }
}

export async function handleFallbackRequest<T>(
  url: string,
  options: RequestInit = {},
  headers: Record<string, string> = {}
): Promise<T> {
  const db = loadFallbackDb();
  const payoutChanged = processPayouts(db);
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(url, 'https://nexas.local');
  const pathname = parsedUrl.pathname;
  const body: Record<string, unknown> =
    typeof options.body === 'string' && options.body ? JSON.parse(options.body) : {};

  if (pathname === '/api/bootstrap' && method === 'GET') {
    if (payoutChanged) saveFallbackDb(db);
    return {
      settings: db.settings,
      plans: [...db.plans].filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
      banners: [...db.banners].filter((b) => b.active).sort((a, b) => a.order - b.order),
      liveFeed: db.liveFeed,
    } as T;
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const normalizedPhone = normalizePhoneNumber(String(body.phone || ''));
    const password = String(body.password || '');
    const confirmPassword = body.confirmPassword !== undefined ? String(body.confirmPassword) : undefined;
    if (!normalizedPhone || normalizedPhone.length !== 14) {
      throw new Error('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
    }
    if (password.length < 6) {
      throw new Error('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি।');
    }
    if (db.users.some((u) => u.phone === normalizedPhone)) {
      throw new Error('এই মোবাইল নম্বর দিয়ে ইতিমধ্যেই অ্যাকাউন্ট খোলা হয়েছে।');
    }

    const cleanRef = extractReferralCode(String(body.referralCode || ''));
    const inviter = cleanRef
      ? db.users.find((u) => u.referralCode.trim().toLowerCase() === cleanRef.toLowerCase())
      : undefined;

    const welcomeBonus = Number(db.settings.welcomeBonus ?? 100);
    const newUser: StoredFallbackUser = {
      id: genId('usr'),
      phone: normalizedPhone,
      passwordHash: hashPasswordClient(password),
      referralCode: genRefCode(),
      referredBy: inviter ? inviter.id : null,
      rechargeBalance: welcomeBonus,
      withdrawalBalance: 0,
      hasRecharged: false,
      hasPurchasedPlan: false,
      bankCard: null,
      claimedSalaryLevels: [],
      redeemedGiftCodes: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    addTx(db, newUser.id, 'bonus', 'নিবন্ধন স্বাগতম বোনাস', welcomeBonus, 'recharge');
    const token = genId('tok');
    db.sessions[token] = newUser.id;
    saveFallbackDb(db);
    return { token, user: sanitizeUser(newUser) } as T;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const normalizedPhone = normalizePhoneNumber(String(body.phone || ''));
    const password = String(body.password || '');
    if (!normalizedPhone) {
      throw new Error('সঠিক মোবাইল নম্বর দিন।');
    }
    const user = db.users.find((u) => u.phone === normalizedPhone);
    if (!user || user.passwordHash !== hashPasswordClient(password)) {
      throw new Error('মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    const token = genId('tok');
    db.sessions[token] = user.id;
    saveFallbackDb(db);
    return { token, user: sanitizeUser(user) } as T;
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = requireUserFromHeaders(db, headers);
    if (payoutChanged) saveFallbackDb(db);
    return {
      user: sanitizeUser(user),
      userPlans: db.userPlans.filter((p) => p.userId === user.id),
      deposits: db.deposits.filter((d) => d.userId === user.id),
      withdrawals: db.withdrawals.filter((w) => w.userId === user.id),
      transactions: db.transactions.filter((t) => t.userId === user.id).slice(0, 100),
      team: computeTeam(db, user),
    } as T;
  }

  if (pathname === '/api/plans/buy' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const plan = db.plans.find((p) => p.id === body.planId && p.active);
    if (!plan) throw new Error('প্ল্যানটি খুঁজে পাওয়া যায়নি।');
    const totalAvailable = user.rechargeBalance + user.withdrawalBalance;
    if (totalAvailable < plan.price) {
      throw new Error(`পর্যাপ্ত ব্যালেন্স নেই। এই প্ল্যানটির জন্য ৳${plan.price} প্রয়োজন। অনুগ্রহ করে রিচার্জ করুন।`);
    }
    let remaining = plan.price;
    if (user.rechargeBalance >= remaining) {
      user.rechargeBalance = Number((user.rechargeBalance - remaining).toFixed(2));
    } else {
      remaining = Number((remaining - user.rechargeBalance).toFixed(2));
      user.rechargeBalance = 0;
      user.withdrawalBalance = Number((user.withdrawalBalance - remaining).toFixed(2));
    }
    const now = new Date();
    const newPlan: UserPlan = {
      id: genId('up'),
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      imageUrl: plan.imageUrl,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      totalIncome: plan.totalIncome,
      validityDays: plan.validityDays,
      daysCredited: 0,
      totalEarned: 0,
      purchasedAt: now.toISOString(),
      nextPayoutAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    };
    db.userPlans.unshift(newPlan);
    const isFirstPlan = !user.hasPurchasedPlan;
    user.hasPurchasedPlan = true;
    addTx(db, user.id, 'plan_buy', `${plan.name} প্যাকেজ ক্রয়`, -plan.price, 'recharge');
    if (isFirstPlan) {
      pushFeed(db, { type: 'income', phone: maskPhone(user.phone), amount: plan.price, label: `${plan.name} অ্যাক্টিভ হয়েছে` });
    }
    saveFallbackDb(db);
    return {
      message: `${plan.name} সফলভাবে ক্রয় করা হয়েছে! প্রতি 24 ঘণ্টা পরপর দৈনিক আয় যোগ হবে।`,
      user: sanitizeUser(user),
      userPlan: newPlan,
    } as T;
  }

  if (pathname === '/api/deposits/create' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const numAmount = Number(body.amount || 0);
    const payMethod = body.method as PaymentMethod;
    const cleanTrx = String(body.trxId || '').trim().toUpperCase();
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minDeposit) {
      throw new Error(`সর্বনিম্ন ডিপোজিট ৳${db.settings.minDeposit}।`);
    }
    if (payMethod !== 'bkash' && payMethod !== 'nagad') {
      throw new Error('সঠিক পেমেন্ট মেথড নির্বাচন করুন (বিকাশ অথবা নগদ)।');
    }
    if (cleanTrx.length < 5) {
      throw new Error('সঠিক Transaction ID (TrxID) লিখুন।');
    }
    if (db.deposits.some((d) => d.trxId.toUpperCase() === cleanTrx && d.status !== 'failed')) {
      throw new Error('এই Transaction ID ইতিমধ্যেই ব্যবহার করা হয়েছে।');
    }
    const record: DepositRecord = {
      id: genId('dep'),
      orderId: `GP${Date.now().toString().slice(-8)}`,
      userId: user.id,
      userPhone: user.phone,
      amount: numAmount,
      method: payMethod,
      senderNumber: String(body.senderNumber || user.phone).trim(),
      trxId: cleanTrx,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.deposits.unshift(record);
    saveFallbackDb(db);
    return {
      message: `৳${numAmount} রিচার্জ অনুরোধ জমা হয়েছে! অ্যাডমিন অনুমোদন করলে আপনার অ্যাকাউন্ট ব্যালেন্সে টাকা যুক্ত হবে।`,
      deposit: record,
      user: sanitizeUser(user),
    } as T;
  }

  if (pathname === '/api/deposits/submit-proof' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const numAmount = Number(body.amount || 0);
    const payMethod = body.method as PaymentMethod;
    const cleanTrx = String(body.trxId || '').trim().toUpperCase();
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minDeposit) {
      throw new Error(`সর্বনিম্ন পরিমাণ ৳${db.settings.minDeposit}।`);
    }
    if (payMethod !== 'bkash' && payMethod !== 'nagad') {
      throw new Error('সঠিক পেমেন্ট মেথড নির্বাচন করুন।');
    }
    if (cleanTrx.length < 4) {
      throw new Error('সঠিক ট্রানজেকশন আইডি (TrxID) দিন।');
    }
    const record: DepositRecord = {
      id: genId('dep'),
      orderId: `PF${Date.now().toString().slice(-8)}`,
      userId: user.id,
      userPhone: user.phone,
      amount: numAmount,
      method: payMethod,
      senderNumber: String(body.senderNumber || user.phone).trim(),
      trxId: cleanTrx,
      proofNote: String(body.proofNote || '').trim(),
      proofImageUrl: body.proofImageUrl ? String(body.proofImageUrl) : undefined,
      isProofSubmission: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.deposits.unshift(record);
    saveFallbackDb(db);
    return {
      message: 'আপনার পেমেন্ট প্রুফ জমা হয়েছে। অ্যাডমিন যাচাই করে ব্যালেন্স যোগ করে দেবেন।',
      deposit: record,
    } as T;
  }

  if (pathname === '/api/bank-card' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const payMethod = body.method as PaymentMethod;
    const cleanName = String(body.accountName || '').trim();
    const cleanNum = String(body.accountNumber || '').replace(/\D/g, '');
    if (payMethod !== 'bkash' && payMethod !== 'nagad') throw new Error('বিকাশ অথবা নগদ নির্বাচন করুন।');
    if (cleanName.length < 2) throw new Error('অ্যাকাউন্ট হোল্ডারের নাম লিখুন।');
    if (cleanNum.length < 11) throw new Error('সঠিক ১১ ডিজিটের মোবাইল ওয়ালেট নম্বর দিন।');
    user.bankCard = {
      method: payMethod,
      accountName: cleanName,
      accountNumber: cleanNum.slice(0, 11),
      updatedAt: new Date().toISOString(),
    };
    saveFallbackDb(db);
    return { message: 'ব্যাংক কার্ড সফলভাবে সেভ করা হয়েছে।', user: sanitizeUser(user) } as T;
  }

  if (pathname === '/api/withdraw' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    if (!user.bankCard) throw new Error('উত্তোলন করার আগে অনুগ্রহ করে ব্যাংক কার্ড (বিকাশ/নগদ) সেটআপ করুন।');
    const plans = db.userPlans.filter((p) => p.userId === user.id);
    if (!user.hasRecharged || plans.length === 0) {
      throw new Error('রিচার্জ সম্পন্ন করে কমপক্ষে একটি প্যাকেজ অ্যাক্টিভ না করা পর্যন্ত টাকা উত্তোলন করা যাবে না।');
    }
    const numAmount = Number(body.amount || 0);
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minWithdraw) {
      throw new Error(`সর্বনিম্ন উত্তোলন ৳${db.settings.minWithdraw}।`);
    }
    if (user.withdrawalBalance < numAmount) {
      throw new Error('আপনার উত্তোলন ব্যালেন্স পর্যাপ্ত নয়।');
    }
    user.withdrawalBalance = Number((user.withdrawalBalance - numAmount).toFixed(2));
    const wd: WithdrawRecord = {
      id: genId('wd'),
      userId: user.id,
      userPhone: user.phone,
      amount: numAmount,
      method: user.bankCard.method,
      accountName: user.bankCard.accountName,
      accountNumber: user.bankCard.accountNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.withdrawals.unshift(wd);
    addTx(db, user.id, 'withdraw', `${user.bankCard.method === 'bkash' ? 'বিকাশ' : 'নগদ'} উত্তোলন অনুরোধ`, -numAmount, 'withdrawal');
    saveFallbackDb(db);
    return {
      message: 'উত্তোলন অনুরোধ জমা হয়েছে! অনুমোদনের অপেক্ষায় রয়েছে।',
      withdrawal: wd,
      user: sanitizeUser(user),
    } as T;
  }

  if (pathname === '/api/gift-code/redeem' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const cleanCode = String(body.code || '').trim().toUpperCase();
    let gift = db.giftCodes.find((g) => g.code.toUpperCase() === cleanCode && g.active);
    if (!gift) {
      const cloudGift = await fetchGiftCodeFromFirestore(cleanCode);
      if (cloudGift && cloudGift.active) {
        const idx = db.giftCodes.findIndex((g) => g.code.toUpperCase() === cleanCode);
        if (idx >= 0) db.giftCodes[idx] = cloudGift;
        else db.giftCodes.unshift(cloudGift);
        gift = cloudGift;
      }
    }
    if (!gift) throw new Error('গিফট কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।');
    if (user.redeemedGiftCodes.includes(gift.code)) throw new Error('আপনি ইতিমধ্যেই এই গিফট কোড ব্যবহার করেছেন।');
    if (gift.maxUses && gift.usedCount >= gift.maxUses) throw new Error('এই গিফট কোডের সীমা শেষ হয়ে গেছে।');
    user.redeemedGiftCodes.push(gift.code);
    gift.usedCount += 1;
    user.withdrawalBalance = Number((user.withdrawalBalance + gift.amount).toFixed(2));
    addTx(db, user.id, 'gift_code', `গিফট কোড রিওয়ার্ড (${gift.code})`, gift.amount, 'withdrawal');
    saveFallbackDb(db);
    return {
      message: `অভিনন্দন! গিফট কোড থেকে ৳${gift.amount} আপনার উত্তোলন ব্যালেন্সে যোগ হয়েছে।`,
      user: sanitizeUser(user),
    } as T;
  }

  if (pathname === '/api/daily-salary/claim' && method === 'POST') {
    const user = requireUserFromHeaders(db, headers);
    const level = Number(body.level || 0);
    const tier = DAILY_SALARY_TIERS.find((t) => t.level === level);
    if (!tier) throw new Error('বেতন প্ল্যান পাওয়া যায়নি।');
    if (user.claimedSalaryLevels.includes(level)) throw new Error('এই লেভেলের বেতন আপনি ইতিমধ্যেই সংগ্রহ করেছেন।');
    const summary = computeTeam(db, user);
    if (summary.level1.count < tier.requiredValid) {
      throw new Error(`এই বোনাস পেতে কমপক্ষে ${tier.requiredValid} জন সক্রিয় লেভেল 1 সদস্য প্রয়োজন।`);
    }
    user.claimedSalaryLevels.push(level);
    user.withdrawalBalance = Number((user.withdrawalBalance + tier.reward).toFixed(2));
    addTx(db, user.id, 'salary', `দৈনিক বেতন বোনাস (${tier.title})`, tier.reward, 'withdrawal');
    saveFallbackDb(db);
    return {
      message: `৳${tier.reward} দৈনিক বেতন বোনাস সংগ্রহ করা হয়েছে!`,
      user: sanitizeUser(user),
    } as T;
  }

  if (pathname === '/api/upload' && method === 'POST') {
    return { url: String(body.dataUrl || ''), fileName: String(body.fileName || 'image.png') } as T;
  }

  if (pathname === '/api/server-images' && method === 'GET') {
    const imgs = [
      ...Object.entries(BANNER_IMAGES).map(([name, url]) => ({ name, url, source: 'server' as const })),
      ...Object.entries(PRODUCT_IMAGES).map(([name, url]) => ({ name, url, source: 'server' as const })),
    ];
    return { images: imgs } as T;
  }

  // Admin endpoints
  if (pathname === '/api/admin/login' && method === 'POST') {
    if (!body.passcode || String(body.passcode) !== db.adminPasscode) {
      throw new Error('অ্যাডমিন পাসকোড সঠিক নয়।');
    }
    const token = genId('adm');
    db.adminTokens[token] = Date.now() + 24 * 60 * 60 * 1000;
    saveFallbackDb(db);
    return { token } as T;
  }

  if (pathname === '/api/admin/overview' && method === 'GET') {
    requireAdminFromHeaders(db, headers);
    return {
      settings: db.settings,
      plans: [...db.plans].sort((a, b) => a.sortOrder - b.sortOrder),
      banners: [...db.banners].sort((a, b) => a.order - b.order),
      giftCodes: db.giftCodes,
      withdrawals: db.withdrawals,
      deposits: db.deposits,
      users: db.users.map(sanitizeUser),
      stats: {
        totalUsers: db.users.length,
        totalDeposits: db.deposits.filter((d) => d.status === 'completed').reduce((s, d) => s + d.amount, 0),
        pendingWithdrawals: db.withdrawals.filter((w) => w.status === 'pending').length,
        pendingDeposits: db.deposits.filter((d) => d.status === 'pending').length,
        activePlans: db.userPlans.filter((p) => p.status === 'active').length,
      },
    } as T;
  }

  if (pathname === '/api/admin/settings' && method === 'PUT') {
    requireAdminFromHeaders(db, headers);
    const s = body as Partial<GlobalSettings> & { newPasscode?: string };
    db.settings = {
      supportGroupUrl: String(s.supportGroupUrl ?? db.settings.supportGroupUrl).trim(),
      supportChannelUrl: String(s.supportChannelUrl ?? db.settings.supportChannelUrl).trim(),
      bkashNumber: String(s.bkashNumber ?? db.settings.bkashNumber).trim(),
      nagadNumber: String(s.nagadNumber ?? db.settings.nagadNumber).trim(),
      minDeposit: Math.max(1, Number(s.minDeposit ?? db.settings.minDeposit)),
      minWithdraw: Math.max(1, Number(s.minWithdraw ?? db.settings.minWithdraw)),
      welcomeBonus: Math.max(0, Number(s.welcomeBonus ?? db.settings.welcomeBonus)),
      level1Rate: Math.max(0, Math.min(100, Number(s.level1Rate ?? db.settings.level1Rate))),
      level2Rate: Math.max(0, Math.min(100, Number(s.level2Rate ?? db.settings.level2Rate))),
      level3Rate: Math.max(0, Math.min(100, Number(s.level3Rate ?? db.settings.level3Rate))),
      updatedAt: new Date().toISOString(),
    };
    if (s.newPasscode && String(s.newPasscode).trim().length >= 4) {
      db.adminPasscode = String(s.newPasscode).trim();
    }
    saveFallbackDb(db);
    return { message: 'সেটিংস সংরক্ষণ ও সকল ব্যবহারকারীর জন্য আপডেট করা হয়েছে।', settings: db.settings } as T;
  }

  if (pathname === '/api/admin/users/search' && method === 'GET') {
    requireAdminFromHeaders(db, headers);
    const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
    const users = db.users
      .filter((u) => !q || u.phone.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.referralCode.toLowerCase().includes(q))
      .slice(0, 50)
      .map((u) => ({
        ...sanitizeUser(u),
        activePlansCount: db.userPlans.filter((p) => p.userId === u.id && p.status === 'active').length,
      }));
    return { users } as T;
  }

  const balMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/balance$/);
  if (balMatch && method === 'POST') {
    requireAdminFromHeaders(db, headers);
    const user = db.users.find((u) => u.id === balMatch[1]);
    if (!user) throw new Error('ব্যবহারকারী পাওয়া যায়নি।');
    const numAmount = Number(body.amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) throw new Error('সঠিক পরিমাণ লিখুন।');
    const delta = body.action === 'deduct' ? -numAmount : numAmount;
    if (body.balanceType === 'recharge') {
      user.rechargeBalance = Math.max(0, Number((user.rechargeBalance + delta).toFixed(2)));
      if (delta > 0) user.hasRecharged = true;
    } else {
      user.withdrawalBalance = Math.max(0, Number((user.withdrawalBalance + delta).toFixed(2)));
    }
    addTx(db, user.id, 'admin_adjust', String(body.note || (body.action === 'deduct' ? 'অ্যাডমিন কর্তন' : 'অ্যাডমিন ব্যালেন্স যোগ')), delta, body.balanceType === 'recharge' ? 'recharge' : 'withdrawal');
    saveFallbackDb(db);
    return { message: 'ব্যালেন্স সফলভাবে আপডেট করা হয়েছে।', user: sanitizeUser(user) } as T;
  }

  const wdMatch = pathname.match(/^\/api\/admin\/withdrawals\/([^/]+)$/);
  if (wdMatch && method === 'POST') {
    requireAdminFromHeaders(db, headers);
    const wd = db.withdrawals.find((w) => w.id === wdMatch[1]);
    if (!wd) throw new Error('উত্তোলন রেকর্ড পাওয়া যায়নি।');
    if (wd.status !== 'pending') throw new Error('এই উত্তোলনটি ইতিমধ্যেই প্রক্রিয়াকরণ করা হয়েছে।');
    const status = body.status as 'approved' | 'failed';
    wd.status = status;
    wd.processedAt = new Date().toISOString();
    const user = db.users.find((u) => u.id === wd.userId);
    if (status === 'failed' && user) {
      user.withdrawalBalance = Number((user.withdrawalBalance + wd.amount).toFixed(2));
      addTx(db, user.id, 'withdraw_refund', 'উত্তোলন ব্যর্থ - টাকা রিফান্ড', wd.amount, 'withdrawal');
    } else if (status === 'approved' && user) {
      pushFeed(db, { type: 'withdraw', phone: maskPhone(user.phone), amount: wd.amount, method: wd.method === 'bkash' ? 'বিকাশ' : 'নগদ', label: 'উত্তোলন সফল' });
    }
    saveFallbackDb(db);
    return { message: `উত্তোলন ${status === 'approved' ? 'অনুমোদিত' : 'বাতিল ও রিফান্ড'} হয়েছে।`, withdrawal: wd } as T;
  }

  const depMatch = pathname.match(/^\/api\/admin\/deposits\/([^/]+)$/);
  if (depMatch && method === 'POST') {
    requireAdminFromHeaders(db, headers);
    const dep = db.deposits.find((d) => d.id === depMatch[1]);
    if (!dep) throw new Error('ডিপোজিট রেকর্ড পাওয়া যায়নি।');
    if (dep.status !== 'pending') throw new Error('এই ডিপোজিট ইতিমধ্যেই যাচাই করা হয়েছে।');
    const status = body.status as 'completed' | 'failed';
    dep.status = status;
    const user = db.users.find((u) => u.id === dep.userId);
    if (status === 'completed' && user) {
      user.rechargeBalance = Number((user.rechargeBalance + dep.amount).toFixed(2));
      user.hasRecharged = true;
      addTx(db, user.id, 'deposit', `GoPay ${dep.method === 'bkash' ? 'বিকাশ' : 'নগদ'} ডিপোজিট অনুমোদিত (${dep.trxId})`, dep.amount, 'recharge');
      distributeRechargeCommission(db, user, dep.amount);
      pushFeed(db, { type: 'deposit', phone: maskPhone(user.phone), amount: dep.amount, method: dep.method === 'bkash' ? 'বিকাশ' : 'নগদ', label: 'GoPay রিচার্জ' });
    }
    saveFallbackDb(db);
    return { message: 'ডিপোজিট স্ট্যাটাস আপডেট করা হয়েছে।', deposit: dep } as T;
  }

  if (pathname === '/api/admin/plans' && method === 'PUT') {
    requireAdminFromHeaders(db, headers);
    db.plans = (body.plans as Plan[]) || db.plans;
    db.settings.updatedAt = new Date().toISOString();
    saveFallbackDb(db);
    return { message: 'প্ল্যানসমূহ সংরক্ষণ ও সবার কাছে আপডেট করা হয়েছে।', plans: db.plans } as T;
  }

  if (pathname === '/api/admin/banners' && method === 'PUT') {
    requireAdminFromHeaders(db, headers);
    db.banners = (body.banners as BannerSlide[]) || db.banners;
    db.settings.updatedAt = new Date().toISOString();
    saveFallbackDb(db);
    return { message: 'ব্যানারগুলো সংরক্ষণ ও সবার কাছে আপডেট করা হয়েছে।', banners: db.banners } as T;
  }

  if (pathname === '/api/admin/gift-codes' && method === 'POST') {
    requireAdminFromHeaders(db, headers);
    const clean = String(body.code || '').trim().toUpperCase();
    const numAmount = Number(body.amount || 0);
    if (!clean || numAmount <= 0) throw new Error('সঠিক কোড ও পরিমাণ লিখুন।');
    const idx = db.giftCodes.findIndex((g) => g.code.toUpperCase() === clean);
    const entry: GiftCode = {
      code: clean,
      amount: numAmount,
      active: true,
      maxUses: body.maxUses && Number(body.maxUses) > 0 ? Number(body.maxUses) : undefined,
      usedCount: idx >= 0 ? db.giftCodes[idx].usedCount : 0,
      createdAt: new Date().toISOString(),
    };
    if (idx >= 0) db.giftCodes[idx] = entry;
    else db.giftCodes.unshift(entry);
    saveFallbackDb(db);
    return { message: 'গিফট কোড যুক্ত করা হয়েছে।', giftCodes: db.giftCodes } as T;
  }

  const toggleMatch = pathname.match(/^\/api\/admin\/gift-codes\/([^/]+)\/toggle$/);
  if (toggleMatch && method === 'PATCH') {
    requireAdminFromHeaders(db, headers);
    const clean = decodeURIComponent(toggleMatch[1]).toUpperCase();
    const gift = db.giftCodes.find((g) => g.code.toUpperCase() === clean);
    if (!gift) throw new Error('গিফট কোড পাওয়া যায়নি।');
    gift.active = !gift.active;
    saveFallbackDb(db);
    return { message: 'গিফট কোড স্ট্যাটাস আপডেট হয়েছে।', giftCodes: db.giftCodes } as T;
  }

  const delMatch = pathname.match(/^\/api\/admin\/gift-codes\/([^/]+)$/);
  if (delMatch && method === 'DELETE') {
    requireAdminFromHeaders(db, headers);
    const clean = decodeURIComponent(delMatch[1]).toUpperCase();
    db.giftCodes = db.giftCodes.filter((g) => g.code.toUpperCase() !== clean);
    saveFallbackDb(db);
    return { message: 'গিফট কোড মুছে ফেলা হয়েছে।', giftCodes: db.giftCodes } as T;
  }

  throw new Error('অনুরোধ সম্পন্ন করা যায়নি।');
}

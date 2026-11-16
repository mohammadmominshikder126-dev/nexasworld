import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  DEFAULT_BANNERS,
  DEFAULT_PLANS,
  DEFAULT_SETTINGS,
  DAILY_SALARY_TIERS,
} from './src/data/plans.ts';
import type {
  BannerSlide,
  DepositRecord,
  GiftCode,
  GlobalSettings,
  LiveFeedItem,
  PaymentMethod,
  Plan,
  TransactionRecord,
  User,
  UserPlan,
  WithdrawRecord,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(__dirname, 'nexasworld-db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const AISTUDIO_ASSETS_DIR = path.join(__dirname, 'public', 'assets', 'aistudio');
const FIREBASE_CFG_FILE = path.join(__dirname, 'firebase-applet-config.json');

interface FirebasePublicCfg {
  projectId: string;
  firestoreDatabaseId: string;
}

const firebaseCfg: FirebasePublicCfg | null = (() => {
  try {
    if (fs.existsSync(FIREBASE_CFG_FILE)) {
      return JSON.parse(fs.readFileSync(FIREBASE_CFG_FILE, 'utf-8')) as FirebasePublicCfg;
    }
  } catch {
    // ignore
  }
  return null;
})();

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface StoredUser extends User {
  passwordHash: string;
}

interface DatabaseSchema {
  adminPasscode: string;
  settings: GlobalSettings;
  plans: Plan[];
  banners: BannerSlide[];
  users: StoredUser[];
  sessions: Record<string, string>;
  adminTokens: Record<string, number>;
  userPlans: UserPlan[];
  deposits: DepositRecord[];
  withdrawals: WithdrawRecord[];
  transactions: TransactionRecord[];
  giftCodes: GiftCode[];
  liveFeed: LiveFeedItem[];
}

function createInitialLiveFeed(): LiveFeedItem[] {
  return [
    { id: 'lf_1', type: 'withdraw', phone: '+88017****842', amount: 1250, method: 'বিকাশ', label: 'উত্তোলন সফল', timeText: 'এইমাত্র' },
    { id: 'lf_2', type: 'income', phone: '+88018****319', amount: 460, label: 'VIP 4 দৈনিক আয়', timeText: '১ মিনিট আগে' },
    { id: 'lf_3', type: 'deposit', phone: '+88019****504', amount: 2500, method: 'নগদ', label: 'GoPay রিচার্জ', timeText: '২ মিনিট আগে' },
    { id: 'lf_4', type: 'withdraw', phone: '+88016****771', amount: 650, method: 'নগদ', label: 'উত্তোলন সফল', timeText: '৩ মিনিট আগে' },
    { id: 'lf_5', type: 'income', phone: '+88013****920', amount: 960, label: 'VIP 5 দৈনিক আয়', timeText: '৪ মিনিট আগে' },
    { id: 'lf_6', type: 'deposit', phone: '+88017****115', amount: 1200, method: 'বিকাশ', label: 'GoPay রিচার্জ', timeText: '৫ মিনিট আগে' },
    { id: 'lf_7', type: 'withdraw', phone: '+88015****640', amount: 2200, method: 'বিকাশ', label: 'উত্তোলন সফল', timeText: '৬ মিনিট আগে' },
    { id: 'lf_8', type: 'income', phone: '+88018****883', amount: 210, label: 'VIP 3 দৈনিক আয়', timeText: '৭ মিনিট আগে' },
  ];
}

function createDefaultDb(): DatabaseSchema {
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
    liveFeed: createInitialLiveFeed(),
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      const def = createDefaultDb();
      const users = Array.isArray(parsed.users) ? parsed.users : [];
      const settings = { ...def.settings, ...(parsed.settings || {}) };
      if (users.length === 0 && settings.welcomeBonus === 40) {
        settings.welcomeBonus = 100;
      }
      if (settings.level2Rate === 2 && settings.level3Rate === 1) {
        settings.level2Rate = 3;
        settings.level3Rate = 2;
      }
      const giftCodes =
        users.length === 0
          ? def.giftCodes
          : Array.isArray(parsed.giftCodes) && parsed.giftCodes.length > 0
          ? parsed.giftCodes
          : def.giftCodes;
      const savedBanners = Array.isArray(parsed.banners) && parsed.banners.length > 0 ? parsed.banners : def.banners;
      const isOldDefaultBanners =
        savedBanners[0]?.id === 'banner_1' &&
        savedBanners[0]?.imageUrl === '/assets/aistudio/nexas-6000-White-Slush_01ab39be.jpg';
      return {
        adminPasscode: parsed.adminPasscode || def.adminPasscode,
        settings,
        plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? parsed.plans : def.plans,
        banners: isOldDefaultBanners ? def.banners : savedBanners,
        users,
        sessions: parsed.sessions || {},
        adminTokens: parsed.adminTokens || {},
        userPlans: Array.isArray(parsed.userPlans) ? parsed.userPlans : [],
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        giftCodes,
        liveFeed: Array.isArray(parsed.liveFeed) && parsed.liveFeed.length > 0 ? parsed.liveFeed : def.liveFeed,
      };
    }
  } catch (err) {
    console.error('Failed to load DB, using defaults:', err);
  }
  const initial = createDefaultDb();
  saveDb(initial);
  return initial;
}

let db: DatabaseSchema = loadDb();

function saveDb(state: DatabaseSchema = db): void {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// SSE clients
const sseClients = new Set<Response>();

function broadcastSync(eventType: string, payload: Record<string, unknown> = {}) {
  const data = JSON.stringify({ eventType, ts: Date.now(), ...payload });
  for (const res of sseClients) {
    try {
      res.write(`event: sync\ndata: ${data}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

type FsField = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
};

function readFsStr(fields: Record<string, FsField> | undefined, key: string, fallback = ''): string {
  const v = fields?.[key]?.stringValue;
  return typeof v === 'string' ? v : fallback;
}

function readFsNum(fields: Record<string, FsField> | undefined, key: string, fallback = 0): number {
  const f = fields?.[key];
  if (!f) return fallback;
  if (typeof f.doubleValue === 'number') return f.doubleValue;
  if (typeof f.integerValue === 'string') {
    const n = Number(f.integerValue);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function readFsBool(fields: Record<string, FsField> | undefined, key: string, fallback = false): boolean {
  const v = fields?.[key]?.booleanValue;
  return typeof v === 'boolean' ? v : fallback;
}

let lastFirestorePullAt = 0;
let pullInFlight: Promise<void> | null = null;

async function pullPublicFirestoreIfNewer(force = false): Promise<void> {
  if (!firebaseCfg) return;
  const now = Date.now();
  if (!force && now - lastFirestorePullAt < 3000) return;
  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    lastFirestorePullAt = Date.now();
    const base = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents`;
    try {
      const settingsRes = await fetch(`${base}/settings/global`);
      if (!settingsRes.ok) return;
      const settingsDoc = (await settingsRes.json()) as {
        fields?: Record<string, FsField>;
        updateTime?: string;
      };
      const fields = settingsDoc.fields;
      if (!fields) return;

      const fsUpdatedIso = fields.updatedAt?.timestampValue || settingsDoc.updateTime || '';
      const fsUpdatedMs = fsUpdatedIso ? new Date(fsUpdatedIso).getTime() : 0;
      const localUpdatedMs = db.settings.updatedAt ? new Date(db.settings.updatedAt).getTime() : 0;
      if (!fsUpdatedMs || fsUpdatedMs <= localUpdatedMs) return;

      db.settings = {
        supportGroupUrl: readFsStr(fields, 'supportGroupUrl', db.settings.supportGroupUrl),
        supportChannelUrl: readFsStr(fields, 'supportChannelUrl', db.settings.supportChannelUrl),
        bkashNumber: readFsStr(fields, 'bkashNumber', db.settings.bkashNumber),
        nagadNumber: readFsStr(fields, 'nagadNumber', db.settings.nagadNumber),
        minDeposit: Math.max(1, readFsNum(fields, 'minDeposit', db.settings.minDeposit)),
        minWithdraw: Math.max(1, readFsNum(fields, 'minWithdraw', db.settings.minWithdraw)),
        welcomeBonus: Math.max(0, readFsNum(fields, 'welcomeBonus', db.settings.welcomeBonus)),
        level1Rate: Math.max(0, Math.min(100, readFsNum(fields, 'level1Rate', db.settings.level1Rate))),
        level2Rate: Math.max(0, Math.min(100, readFsNum(fields, 'level2Rate', db.settings.level2Rate))),
        level3Rate: Math.max(0, Math.min(100, readFsNum(fields, 'level3Rate', db.settings.level3Rate))),
        updatedAt: new Date(fsUpdatedMs).toISOString(),
      };

      const runActiveQuery = async (collectionId: string) => {
        const qRes = await fetch(`${base}:runQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'active' },
                  op: 'EQUAL',
                  value: { booleanValue: true },
                },
              },
            },
          }),
        });
        if (!qRes.ok) return [];
        const rows = (await qRes.json()) as Array<{ document?: { name?: string; fields?: Record<string, FsField> } }>;
        return rows.map((r) => r.document).filter((d): d is { name?: string; fields?: Record<string, FsField> } => Boolean(d?.fields));
      };

      const [planDocs, bannerDocs] = await Promise.all([runActiveQuery('plans'), runActiveQuery('banners')]);

      if (planDocs.length > 0) {
        const fsPlans: Plan[] = planDocs.map((docItem, idx) => {
          const pf = docItem.fields!;
          const docId = docItem.name?.split('/').pop() || `vip_${idx + 1}`;
          return {
            id: readFsStr(pf, 'id', docId),
            name: readFsStr(pf, 'name', docId),
            price: readFsNum(pf, 'price', 300),
            dailyIncome: readFsNum(pf, 'dailyIncome', 45),
            totalIncome: readFsNum(pf, 'totalIncome', 1350),
            validityDays: readFsNum(pf, 'validityDays', 30),
            imageUrl: readFsStr(pf, 'imageUrl', DEFAULT_PLANS[0].imageUrl),
            badge: readFsStr(pf, 'badge') || undefined,
            sortOrder: readFsNum(pf, 'sortOrder', idx + 1),
            active: readFsBool(pf, 'active', true),
          };
        });
        const activeIds = new Set(fsPlans.map((p) => p.id));
        const inactiveLocal = db.plans.filter((p) => !activeIds.has(p.id) && !p.active);
        db.plans = [...fsPlans, ...inactiveLocal].sort((a, b) => a.sortOrder - b.sortOrder);
      }

      if (bannerDocs.length > 0) {
        const fsBanners: BannerSlide[] = bannerDocs.map((docItem, idx) => {
          const bf = docItem.fields!;
          const docId = docItem.name?.split('/').pop() || `banner_${idx + 1}`;
          return {
            id: readFsStr(bf, 'id', docId),
            order: readFsNum(bf, 'order', idx + 1),
            title: readFsStr(bf, 'title', `NexasWorld ব্যানার ${idx + 1}`),
            subtitle: readFsStr(bf, 'subtitle', ''),
            badge: readFsStr(bf, 'badge') || undefined,
            imageUrl: readFsStr(bf, 'imageUrl', DEFAULT_BANNERS[0].imageUrl),
            accent: readFsStr(bf, 'accent') || undefined,
            active: readFsBool(bf, 'active', true),
          };
        });
        const activeIds = new Set(fsBanners.map((b) => b.id));
        const inactiveLocal = db.banners.filter((b) => !activeIds.has(b.id) && !b.active);
        db.banners = [...fsBanners, ...inactiveLocal].sort((a, b) => a.order - b.order);
      }

      saveDb();
      broadcastSync('firestore_pulled', { updatedAt: db.settings.updatedAt });
    } catch {
      // silent fallback to local db
    } finally {
      pullInFlight = null;
    }
  })();

  return pullInFlight;
}

async function fetchFirestoreGiftCode(code: string): Promise<GiftCode | null> {
  if (!firebaseCfg) return null;
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
  if (!clean) return null;
  try {
    const base = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId}/documents`;
    const res = await fetch(`${base}/giftCodes/${encodeURIComponent(clean)}`);
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: Record<string, FsField> };
    if (!doc.fields) return null;
    return {
      code: readFsStr(doc.fields, 'code', clean),
      amount: readFsNum(doc.fields, 'amount', 0),
      active: readFsBool(doc.fields, 'active', false),
      maxUses: readFsNum(doc.fields, 'maxUses', 0) || undefined,
      usedCount: readFsNum(doc.fields, 'usedCount', 0),
      createdAt: readFsStr(doc.fields, 'createdAt', new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`nexas_${password}_salt`).digest('hex');
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function generateReferralCode(): string {
  return crypto.randomBytes(5).toString('hex');
}

function normalizePhone(input: string): string {
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

function extractReferralCode(raw: string): string {
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

function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

function pushLiveFeed(item: Omit<LiveFeedItem, 'id' | 'timeText'>) {
  db.liveFeed.unshift({
    id: generateId('lf'),
    timeText: 'এইমাত্র',
    ...item,
  });
  if (db.liveFeed.length > 24) {
    db.liveFeed = db.liveFeed.slice(0, 24);
  }
}

function addTransaction(
  userId: string,
  type: TransactionRecord['type'],
  title: string,
  amount: number,
  balanceType: 'recharge' | 'withdrawal'
) {
  db.transactions.unshift({
    id: generateId('tx'),
    userId,
    type,
    title,
    amount,
    balanceType,
    createdAt: new Date().toISOString(),
  });
}

// Automatic 24-hour plan payout processor
function processDuePlanPayouts(): boolean {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let changed = false;

  for (const up of db.userPlans) {
    if (up.status !== 'active') continue;
    let nextMs = new Date(up.nextPayoutAt).getTime();

    while (up.status === 'active' && nextMs <= now && up.daysCredited < up.validityDays) {
      const user = db.users.find((u) => u.id === up.userId);
      if (!user) break;

      user.withdrawalBalance = Number((user.withdrawalBalance + up.dailyIncome).toFixed(2));
      up.daysCredited += 1;
      up.totalEarned = Number((up.totalEarned + up.dailyIncome).toFixed(2));
      addTransaction(
        user.id,
        'daily_income',
        `${up.planName} দৈনিক আয় (${up.daysCredited}/${up.validityDays})`,
        up.dailyIncome,
        'withdrawal'
      );
      pushLiveFeed({
        type: 'income',
        phone: maskPhone(user.phone),
        amount: up.dailyIncome,
        label: `${up.planName} দৈনিক আয়`,
      });

      if (up.daysCredited >= up.validityDays) {
        up.status = 'completed';
      } else {
        nextMs += oneDayMs;
        up.nextPayoutAt = new Date(nextMs).toISOString();
      }
      changed = true;
    }
  }

  if (changed) {
    saveDb();
    broadcastSync('payouts');
  }
  return changed;
}

setInterval(() => {
  processDuePlanPayouts();
}, 30_000);

interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  processDuePlanPayouts();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !db.sessions[token]) {
    res.status(401).json({ error: 'অনুগ্রহ করে আবার লগইন করুন।' });
    return;
  }
  const userId = db.sessions[token];
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = String(req.headers['x-admin-token'] || '');
  const exp = db.adminTokens[token];
  if (!token || !exp || exp < Date.now()) {
    res.status(401).json({ error: 'অ্যাডমিন অনুমোদন প্রয়োজন।' });
    return;
  }
  next();
}

function computeTeamSummary(user: StoredUser) {
  const level1Users = db.users.filter((u) => u.referredBy === user.id);
  const level1Ids = new Set(level1Users.map((u) => u.id));
  const level2Users = db.users.filter((u) => u.referredBy && level1Ids.has(u.referredBy));
  const level2Ids = new Set(level2Users.map((u) => u.id));
  const level3Users = db.users.filter((u) => u.referredBy && level2Ids.has(u.referredBy));

  const valid1 = level1Users.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;
  const valid2 = level2Users.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;
  const valid3 = level3Users.filter((u) => u.hasRecharged || u.hasPurchasedPlan).length;

  const refTxs = db.transactions.filter((t) => t.userId === user.id && t.type === 'referral');
  const earn1 = refTxs.filter((t) => t.title.includes('লেভেল 1')).reduce((s, t) => s + t.amount, 0);
  const earn2 = refTxs.filter((t) => t.title.includes('লেভেল 2')).reduce((s, t) => s + t.amount, 0);
  const earn3 = refTxs.filter((t) => t.title.includes('লেভেল 3')).reduce((s, t) => s + t.amount, 0);

  return {
    level1: { count: valid1, totalRegistered: level1Users.length, earnings: earn1, rate: db.settings.level1Rate },
    level2: { count: valid2, totalRegistered: level2Users.length, earnings: earn2, rate: db.settings.level2Rate },
    level3: { count: valid3, totalRegistered: level3Users.length, earnings: earn3, rate: db.settings.level3Rate },
    totalValidUsers: valid1 + valid2 + valid3,
    totalEarnings: earn1 + earn2 + earn3,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/assets/aistudio', express.static(AISTUDIO_ASSETS_DIR));

  // Real-time SSE endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`event: sync\ndata: ${JSON.stringify({ eventType: 'connected', ts: Date.now() })}\n\n`);
    sseClients.add(res);

    const ping = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        clearInterval(ping);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sseClients.delete(res);
    });
  });

  // Public bootstrap
  app.get('/api/bootstrap', async (_req, res) => {
    await pullPublicFirestoreIfNewer();
    processDuePlanPayouts();
    res.json({
      settings: db.settings,
      plans: [...db.plans].filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
      banners: [...db.banners].filter((b) => b.active).sort((a, b) => a.order - b.order),
      liveFeed: db.liveFeed,
    });
  });

  // Image Upload (from gallery / device)
  app.post('/api/upload', (req, res) => {
    try {
      const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'ছবির ডেটা পাওয়া যায়নি।' });
        return;
      }
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
      if (!match) {
        res.status(400).json({ error: 'সঠিক ফরম্যাটের ছবি আপলোড করুন (PNG, JPG, WEBP)।' });
        return;
      }
      const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'ছবির সাইজ 10MB-এর কম হতে হবে।' });
        return;
      }
      const baseSlug = String(fileName || 'img')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32);
      const finalName = `${baseSlug || 'img'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, finalName), buffer);
      res.json({ url: `/uploads/${finalName}`, fileName: finalName });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'ছবি আপলোড করতে সমস্যা হয়েছে।' });
    }
  });

  // List server images (for Server Gallery Picker in Admin)
  app.get('/api/server-images', (_req, res) => {
    const images: { name: string; url: string; source: 'server' | 'uploaded' }[] = [];
    if (fs.existsSync(AISTUDIO_ASSETS_DIR)) {
      for (const f of fs.readdirSync(AISTUDIO_ASSETS_DIR)) {
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(f)) {
          images.push({ name: f, url: `/assets/aistudio/${f}`, source: 'server' });
        }
      }
    }
    if (fs.existsSync(UPLOAD_DIR)) {
      for (const f of fs.readdirSync(UPLOAD_DIR)) {
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(f)) {
          images.push({ name: f, url: `/uploads/${f}`, source: 'uploaded' });
        }
      }
    }
    res.json({ images: images.reverse() });
  });

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      await pullPublicFirestoreIfNewer();
      const { phone, password, confirmPassword, referralCode } = (req.body || {}) as {
        phone?: string;
        password?: string;
        confirmPassword?: string;
        referralCode?: string;
      };
      const normalizedPhone = normalizePhone(phone || '');
      if (!normalizedPhone || normalizedPhone.length !== 14) {
        res.status(400).json({ error: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' });
        return;
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        res.status(400).json({ error: 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি।' });
        return;
      }
      if (db.users.some((u) => u.phone === normalizedPhone)) {
        res.status(400).json({ error: 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যেই অ্যাকাউন্ট খোলা হয়েছে।' });
        return;
      }

      const cleanRef = extractReferralCode(referralCode || '');
      const inviter = cleanRef
        ? db.users.find((u) => u.referralCode.trim().toLowerCase() === cleanRef.toLowerCase())
        : undefined;

      const welcomeBonus = Number(db.settings.welcomeBonus ?? 100);
      const newUser: StoredUser = {
        id: generateId('usr'),
        phone: normalizedPhone,
        passwordHash: hashPassword(password),
        referralCode: generateReferralCode(),
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
      addTransaction(newUser.id, 'bonus', 'নিবন্ধন স্বাগতম বোনাস', welcomeBonus, 'recharge');

      const token = crypto.randomBytes(24).toString('hex');
      db.sessions[token] = newUser.id;
      saveDb();
      broadcastSync('user_registered', { userId: newUser.id });

      res.json({ token, user: sanitizeUser(newUser) });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    try {
      processDuePlanPayouts();
      const { phone, password } = (req.body || {}) as { phone?: string; password?: string };
      const normalizedPhone = normalizePhone(phone || '');
      if (!normalizedPhone) {
        res.status(400).json({ error: 'সঠিক মোবাইল নম্বর দিন।' });
        return;
      }
      const user = db.users.find((u) => u.phone === normalizedPhone);
      if (!user || user.passwordHash !== hashPassword(password || '')) {
        res.status(401).json({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' });
        return;
      }
      const token = crypto.randomBytes(24).toString('hex');
      db.sessions[token] = user.id;
      saveDb();
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'লগইন সম্পন্ন করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।' });
    }
  });

  // Auth: Current user & dashboard state
  app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    await pullPublicFirestoreIfNewer();
    const user = req.authUser!;
    res.json({
      user: sanitizeUser(user),
      userPlans: db.userPlans.filter((p) => p.userId === user.id),
      deposits: db.deposits.filter((d) => d.userId === user.id),
      withdrawals: db.withdrawals.filter((w) => w.userId === user.id),
      transactions: db.transactions.filter((t) => t.userId === user.id).slice(0, 100),
      team: computeTeamSummary(user),
    });
  });

  // Buy Plan
  app.post('/api/plans/buy', requireAuth, async (req: AuthedRequest, res) => {
    await pullPublicFirestoreIfNewer(true);
    const user = req.authUser!;
    const { planId } = req.body as { planId?: string };
    const plan = db.plans.find((p) => p.id === planId && p.active);
    if (!plan) {
      res.status(404).json({ error: 'প্ল্যানটি খুঁজে পাওয়া যায়নি।' });
      return;
    }
    const totalAvailable = user.rechargeBalance + user.withdrawalBalance;
    if (totalAvailable < plan.price) {
      res.status(400).json({
        error: `পর্যাপ্ত ব্যালেন্স নেই। এই প্ল্যানটির জন্য ৳${plan.price} প্রয়োজন। অনুগ্রহ করে রিচার্জ করুন।`,
      });
      return;
    }

    // Deduct from rechargeBalance first, then withdrawalBalance
    let remaining = plan.price;
    if (user.rechargeBalance >= remaining) {
      user.rechargeBalance = Number((user.rechargeBalance - remaining).toFixed(2));
      remaining = 0;
    } else {
      remaining = Number((remaining - user.rechargeBalance).toFixed(2));
      user.rechargeBalance = 0;
      user.withdrawalBalance = Number((user.withdrawalBalance - remaining).toFixed(2));
    }

    const now = new Date();
    const nextPayout = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const newUserPlan: UserPlan = {
      id: generateId('up'),
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
      nextPayoutAt: nextPayout.toISOString(),
      status: 'active',
    };

    db.userPlans.unshift(newUserPlan);
    const isFirstPlan = !user.hasPurchasedPlan;
    user.hasPurchasedPlan = true;
    addTransaction(user.id, 'plan_buy', `${plan.name} প্যাকেজ ক্রয়`, -plan.price, 'recharge');

    if (isFirstPlan) {
      pushLiveFeed({
        type: 'income',
        phone: maskPhone(user.phone),
        amount: plan.price,
        label: `${plan.name} অ্যাক্টিভ হয়েছে`,
      });
    }

    saveDb();
    broadcastSync('user_update', { userId: user.id });
    res.json({
      message: `${plan.name} সফলভাবে ক্রয় করা হয়েছে! প্রতি 24 ঘণ্টা পরপর দৈনিক আয় যোগ হবে।`,
      user: sanitizeUser(user),
      userPlan: newUserPlan,
    });
  });

  // Create GoPay Deposit Order
  app.post('/api/deposits/create', requireAuth, async (req: AuthedRequest, res) => {
    await pullPublicFirestoreIfNewer();
    const user = req.authUser!;
    const { amount, method, senderNumber, trxId } = req.body as {
      amount?: number;
      method?: PaymentMethod;
      senderNumber?: string;
      trxId?: string;
    };
    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minDeposit) {
      res.status(400).json({ error: `সর্বনিম্ন ডিপোজিট ৳${db.settings.minDeposit}।` });
      return;
    }
    if (method !== 'bkash' && method !== 'nagad') {
      res.status(400).json({ error: 'সঠিক পেমেন্ট মেথড নির্বাচন করুন (বিকাশ অথবা নগদ)।' });
      return;
    }
    const cleanSender = String(senderNumber || user.phone).trim();
    const cleanTrx = String(trxId || '').trim().toUpperCase();
    if (cleanTrx.length < 5) {
      res.status(400).json({ error: 'সঠিক Transaction ID (TrxID) লিখুন।' });
      return;
    }
    if (db.deposits.some((d) => d.trxId.toUpperCase() === cleanTrx && d.status !== 'failed')) {
      res.status(400).json({ error: 'এই Transaction ID ইতিমধ্যেই ব্যবহার করা হয়েছে।' });
      return;
    }

    const orderId = `GP${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 89)}`;
    const record: DepositRecord = {
      id: generateId('dep'),
      orderId,
      userId: user.id,
      userPhone: user.phone,
      amount: numAmount,
      method,
      senderNumber: cleanSender,
      trxId: cleanTrx,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.deposits.unshift(record);
    saveDb();
    broadcastSync('deposit_created', { userId: user.id });
    res.json({
      message: `৳${numAmount} রিচার্জ অনুরোধ জমা হয়েছে! অ্যাডমিন অনুমোদন করলে আপনার অ্যাকাউন্ট ব্যালেন্সে টাকা যুক্ত হবে।`,
      deposit: record,
      user: sanitizeUser(user),
    });
  });

  // Submit Payment Proof (for failed order -> admin review)
  app.post('/api/deposits/submit-proof', requireAuth, async (req: AuthedRequest, res) => {
    await pullPublicFirestoreIfNewer();
    const user = req.authUser!;
    const { amount, method, senderNumber, trxId, proofNote, proofImageUrl } = req.body as {
      amount?: number;
      method?: PaymentMethod;
      senderNumber?: string;
      trxId?: string;
      proofNote?: string;
      proofImageUrl?: string;
    };
    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minDeposit) {
      res.status(400).json({ error: `সর্বনিম্ন পরিমাণ ৳${db.settings.minDeposit}।` });
      return;
    }
    if (method !== 'bkash' && method !== 'nagad') {
      res.status(400).json({ error: 'সঠিক পেমেন্ট মেথড নির্বাচন করুন।' });
      return;
    }
    const cleanTrx = String(trxId || '').trim().toUpperCase();
    if (cleanTrx.length < 4) {
      res.status(400).json({ error: 'সঠিক ট্রানজেকশন আইডি (TrxID) দিন।' });
      return;
    }

    const orderId = `PF${Date.now().toString().slice(-8)}`;
    const record: DepositRecord = {
      id: generateId('dep'),
      orderId,
      userId: user.id,
      userPhone: user.phone,
      amount: numAmount,
      method,
      senderNumber: String(senderNumber || user.phone).trim(),
      trxId: cleanTrx,
      proofNote: String(proofNote || '').trim(),
      proofImageUrl: proofImageUrl || undefined,
      isProofSubmission: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.deposits.unshift(record);
    saveDb();
    broadcastSync('deposit_proof', { userId: user.id });
    res.json({
      message: 'আপনার পেমেন্ট প্রুফ জমা হয়েছে। অ্যাডমিন যাচাই করে ব্যালেন্স যোগ করে দেবেন।',
      deposit: record,
    });
  });

  // Save Bank Card / Withdrawal Account
  app.post('/api/bank-card', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { method, accountName, accountNumber } = req.body as {
      method?: PaymentMethod;
      accountName?: string;
      accountNumber?: string;
    };
    if (method !== 'bkash' && method !== 'nagad') {
      res.status(400).json({ error: 'বিকাশ অথবা নগদ নির্বাচন করুন।' });
      return;
    }
    const cleanName = String(accountName || '').trim();
    const cleanNum = String(accountNumber || '').replace(/\D/g, '');
    if (cleanName.length < 2) {
      res.status(400).json({ error: 'অ্যাকাউন্ট হোল্ডারের নাম লিখুন।' });
      return;
    }
    if (cleanNum.length < 11) {
      res.status(400).json({ error: 'সঠিক ১১ ডিজিটের মোবাইল ওয়ালেট নম্বর দিন।' });
      return;
    }

    user.bankCard = {
      method,
      accountName: cleanName,
      accountNumber: cleanNum.slice(0, 11),
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    res.json({ message: 'ব্যাংক কার্ড সফলভাবে সেভ করা হয়েছে।', user: sanitizeUser(user) });
  });

  // Request Withdrawal
  app.post('/api/withdraw', requireAuth, async (req: AuthedRequest, res) => {
    await pullPublicFirestoreIfNewer();
    const user = req.authUser!;
    const { amount } = req.body as { amount?: number };

    if (!user.bankCard) {
      res.status(400).json({ error: 'উত্তোলন করার আগে অনুগ্রহ করে ব্যাংক কার্ড (বিকাশ/নগদ) সেটআপ করুন।' });
      return;
    }
    const activeOrCompletedPlans = db.userPlans.filter((p) => p.userId === user.id);
    if (!user.hasRecharged || activeOrCompletedPlans.length === 0) {
      res.status(400).json({
        error: 'রিচার্জ সম্পন্ন করে কমপক্ষে একটি প্যাকেজ অ্যাক্টিভ না করা পর্যন্ত টাকা উত্তোলন করা যাবে না।',
      });
      return;
    }

    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount < db.settings.minWithdraw) {
      res.status(400).json({ error: `সর্বনিম্ন উত্তোলন ৳${db.settings.minWithdraw}।` });
      return;
    }
    if (user.withdrawalBalance < numAmount) {
      res.status(400).json({ error: 'আপনার উত্তোলন ব্যালেন্স পর্যাপ্ত নয়।' });
      return;
    }

    user.withdrawalBalance = Number((user.withdrawalBalance - numAmount).toFixed(2));
    const wd: WithdrawRecord = {
      id: generateId('wd'),
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
    addTransaction(
      user.id,
      'withdraw',
      `${user.bankCard.method === 'bkash' ? 'বিকাশ' : 'নগদ'} উত্তোলন অনুরোধ`,
      -numAmount,
      'withdrawal'
    );

    saveDb();
    broadcastSync('withdrawal_created', { userId: user.id });
    res.json({
      message: 'উত্তোলন অনুরোধ জমা হয়েছে! অনুমোদনের অপেক্ষায় রয়েছে।',
      withdrawal: wd,
      user: sanitizeUser(user),
    });
  });

  // Redeem Gift Code
  app.post('/api/gift-code/redeem', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const cleanCode = String(req.body?.code || '').trim().toUpperCase();
    if (!cleanCode) {
      res.status(400).json({ error: 'গিফট কোড লিখুন।' });
      return;
    }
    let gift = db.giftCodes.find((g) => g.code.toUpperCase() === cleanCode && g.active);
    if (!gift) {
      const cloudGift = await fetchFirestoreGiftCode(cleanCode);
      if (cloudGift && cloudGift.active) {
        const idx = db.giftCodes.findIndex((g) => g.code.toUpperCase() === cleanCode);
        if (idx >= 0) db.giftCodes[idx] = cloudGift;
        else db.giftCodes.unshift(cloudGift);
        gift = cloudGift;
      }
    }
    if (!gift) {
      res.status(404).json({ error: 'গিফট কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।' });
      return;
    }
    if (user.redeemedGiftCodes.includes(gift.code)) {
      res.status(400).json({ error: 'আপনি ইতিমধ্যেই এই গিফট কোড ব্যবহার করেছেন।' });
      return;
    }
    if (gift.maxUses && gift.usedCount >= gift.maxUses) {
      res.status(400).json({ error: 'এই গিফট কোডের সীমা শেষ হয়ে গেছে।' });
      return;
    }

    user.redeemedGiftCodes.push(gift.code);
    gift.usedCount += 1;
    user.withdrawalBalance = Number((user.withdrawalBalance + gift.amount).toFixed(2));
    addTransaction(user.id, 'gift_code', `গিফট কোড রিওয়ার্ড (${gift.code})`, gift.amount, 'withdrawal');

    saveDb();
    res.json({
      message: `অভিনন্দন! গিফট কোড থেকে ৳${gift.amount} আপনার উত্তোলন ব্যালেন্সে যোগ হয়েছে।`,
      user: sanitizeUser(user),
    });
  });

  // Claim Daily Salary Tier
  app.post('/api/daily-salary/claim', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const level = Number(req.body?.level || 0);
    const tier = DAILY_SALARY_TIERS.find((t) => t.level === level);
    if (!tier) {
      res.status(404).json({ error: 'বেতন প্ল্যান পাওয়া যায়নি।' });
      return;
    }
    if (user.claimedSalaryLevels.includes(level)) {
      res.status(400).json({ error: 'এই লেভেলের বেতন আপনি ইতিমধ্যেই সংগ্রহ করেছেন।' });
      return;
    }
    const summary = computeTeamSummary(user);
    if (summary.level1.count < tier.requiredValid) {
      res.status(400).json({
        error: `এই বোনাস পেতে কমপক্ষে ${tier.requiredValid} জন সক্রিয় লেভেল 1 সদস্য প্রয়োজন।`,
      });
      return;
    }

    user.claimedSalaryLevels.push(level);
    user.withdrawalBalance = Number((user.withdrawalBalance + tier.reward).toFixed(2));
    addTransaction(user.id, 'salary', `দৈনিক বেতন বোনাস (${tier.title})`, tier.reward, 'withdrawal');
    saveDb();
    res.json({
      message: `৳${tier.reward} দৈনিক বেতন বোনাস সংগ্রহ করা হয়েছে!`,
      user: sanitizeUser(user),
    });
  });

  // ================= ADMIN ROUTES =================

  app.post('/api/admin/login', (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || passcode !== db.adminPasscode) {
      res.status(401).json({ error: 'অ্যাডমিন পাসকোড সঠিক নয়।' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.adminTokens[token] = Date.now() + 24 * 60 * 60 * 1000;
    saveDb();
    res.json({ token });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    processDuePlanPayouts();
    res.json({
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
    });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body as Partial<GlobalSettings> & { newPasscode?: string };
    db.settings = {
      supportGroupUrl: String(body.supportGroupUrl ?? db.settings.supportGroupUrl).trim(),
      supportChannelUrl: String(body.supportChannelUrl ?? db.settings.supportChannelUrl).trim(),
      bkashNumber: String(body.bkashNumber ?? db.settings.bkashNumber).trim(),
      nagadNumber: String(body.nagadNumber ?? db.settings.nagadNumber).trim(),
      minDeposit: Math.max(1, Number(body.minDeposit ?? db.settings.minDeposit)),
      minWithdraw: Math.max(1, Number(body.minWithdraw ?? db.settings.minWithdraw)),
      welcomeBonus: Math.max(0, Number(body.welcomeBonus ?? db.settings.welcomeBonus)),
      level1Rate: Math.max(0, Math.min(100, Number(body.level1Rate ?? db.settings.level1Rate))),
      level2Rate: Math.max(0, Math.min(100, Number(body.level2Rate ?? db.settings.level2Rate))),
      level3Rate: Math.max(0, Math.min(100, Number(body.level3Rate ?? db.settings.level3Rate))),
      updatedAt: new Date().toISOString(),
    };
    if (body.newPasscode && body.newPasscode.trim().length >= 4) {
      db.adminPasscode = body.newPasscode.trim();
    }
    saveDb();
    broadcastSync('settings_updated', { settings: db.settings });
    res.json({ message: 'সেটিংস সংরক্ষণ ও সকল ব্যবহারকারীর জন্য আপডেট করা হয়েছে।', settings: db.settings });
  });

  app.get('/api/admin/users/search', requireAdmin, (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const results = db.users
      .filter((u) => {
        if (!q) return true;
        return (
          u.phone.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          u.referralCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 50)
      .map((u) => ({
        ...sanitizeUser(u),
        activePlansCount: db.userPlans.filter((p) => p.userId === u.id && p.status === 'active').length,
      }));
    res.json({ users: results });
  });

  app.post('/api/admin/users/:id/balance', requireAdmin, (req, res) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    const { balanceType, action, amount, note } = req.body as {
      balanceType?: 'recharge' | 'withdrawal';
      action?: 'add' | 'deduct';
      amount?: number;
      note?: string;
    };
    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'সঠিক পরিমাণ লিখুন।' });
      return;
    }

    const delta = action === 'deduct' ? -numAmount : numAmount;
    if (balanceType === 'recharge') {
      user.rechargeBalance = Math.max(0, Number((user.rechargeBalance + delta).toFixed(2)));
      if (delta > 0) user.hasRecharged = true;
    } else {
      user.withdrawalBalance = Math.max(0, Number((user.withdrawalBalance + delta).toFixed(2)));
    }

    addTransaction(
      user.id,
      'admin_adjust',
      note?.trim() || (action === 'deduct' ? 'অ্যাডমিন কর্তন' : 'অ্যাডমিন ব্যালেন্স যোগ'),
      delta,
      balanceType === 'recharge' ? 'recharge' : 'withdrawal'
    );
    saveDb();
    broadcastSync('user_balance_updated', { userId: user.id });
    res.json({ message: 'ব্যালেন্স সফলভাবে আপডেট করা হয়েছে।', user: sanitizeUser(user) });
  });

  app.post('/api/admin/withdrawals/:id', requireAdmin, (req, res) => {
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) {
      res.status(404).json({ error: 'উত্তোলন রেকর্ড পাওয়া যায়নি।' });
      return;
    }
    const { status } = req.body as { status?: 'approved' | 'failed' };
    if (status !== 'approved' && status !== 'failed') {
      res.status(400).json({ error: 'সঠিক স্ট্যাটাস দিন।' });
      return;
    }
    if (wd.status !== 'pending') {
      res.status(400).json({ error: 'এই উত্তোলনটি ইতিমধ্যেই প্রক্রিয়াকরণ করা হয়েছে।' });
      return;
    }

    wd.status = status;
    wd.processedAt = new Date().toISOString();

    const user = db.users.find((u) => u.id === wd.userId);
    if (status === 'failed' && user) {
      user.withdrawalBalance = Number((user.withdrawalBalance + wd.amount).toFixed(2));
      addTransaction(user.id, 'withdraw_refund', 'উত্তোলন ব্যর্থ - টাকা রিফান্ড', wd.amount, 'withdrawal');
    } else if (status === 'approved' && user) {
      pushLiveFeed({
        type: 'withdraw',
        phone: maskPhone(user.phone),
        amount: wd.amount,
        method: wd.method === 'bkash' ? 'বিকাশ' : 'নগদ',
        label: 'উত্তোলন সফল',
      });
    }

    saveDb();
    broadcastSync('withdrawal_updated', { userId: wd.userId, id: wd.id, status });
    res.json({ message: `উত্তোলন ${status === 'approved' ? 'অনুমোদিত' : 'বাতিল ও রিফান্ড'} হয়েছে।`, withdrawal: wd });
  });

  app.post('/api/admin/deposits/:id', requireAdmin, async (req, res) => {
    await pullPublicFirestoreIfNewer();
    const dep = db.deposits.find((d) => d.id === req.params.id);
    if (!dep) {
      res.status(404).json({ error: 'ডিপোজিট রেকর্ড পাওয়া যায়নি।' });
      return;
    }
    const { status } = req.body as { status?: 'completed' | 'failed' };
    if (status !== 'completed' && status !== 'failed') {
      res.status(400).json({ error: 'সঠিক স্ট্যাটাস দিন।' });
      return;
    }
    if (dep.status !== 'pending') {
      res.status(400).json({ error: 'এই ডিপোজিট ইতিমধ্যেই যাচাই করা হয়েছে।' });
      return;
    }

    dep.status = status;
    const user = db.users.find((u) => u.id === dep.userId);
    if (status === 'completed' && user) {
      user.rechargeBalance = Number((user.rechargeBalance + dep.amount).toFixed(2));
      user.hasRecharged = true;
      addTransaction(
        user.id,
        'deposit',
        `GoPay ${dep.method === 'bkash' ? 'বিকাশ' : 'নগদ'} ডিপোজিট অনুমোদিত (${dep.trxId})`,
        dep.amount,
        'recharge'
      );

      // Distribute 3-level referral commission when recharge completes (L1: 20%, L2: 3%, L3: 2%)
      const rates = [
        { level: 1, rate: db.settings.level1Rate },
        { level: 2, rate: db.settings.level2Rate },
        { level: 3, rate: db.settings.level3Rate },
      ];
      let currentRefId = user.referredBy;
      for (const r of rates) {
        if (!currentRefId) break;
        const upline = db.users.find((u) => u.id === currentRefId);
        if (!upline) break;
        if (r.rate > 0) {
          const comm = Number(((dep.amount * r.rate) / 100).toFixed(2));
          if (comm > 0) {
            upline.withdrawalBalance = Number((upline.withdrawalBalance + comm).toFixed(2));
            addTransaction(
              upline.id,
              'referral',
              `লেভেল ${r.level} রেফার কমিশন (${r.rate}%) — ${maskPhone(user.phone)} রিচার্জ ৳${dep.amount}`,
              comm,
              'withdrawal'
            );
          }
        }
        currentRefId = upline.referredBy;
      }

      pushLiveFeed({
        type: 'deposit',
        phone: maskPhone(user.phone),
        amount: dep.amount,
        method: dep.method === 'bkash' ? 'বিকাশ' : 'নগদ',
        label: 'GoPay রিচার্জ',
      });
    }

    saveDb();
    broadcastSync('deposit_updated', { userId: dep.userId, id: dep.id, status });
    res.json({ message: 'ডিপোজিট স্ট্যাটাস আপডেট করা হয়েছে।', deposit: dep });
  });

  app.put('/api/admin/plans', requireAdmin, (req, res) => {
    const { plans } = req.body as { plans?: Plan[] };
    if (!Array.isArray(plans)) {
      res.status(400).json({ error: 'সঠিক প্ল্যান তালিকা দিন।' });
      return;
    }
    db.plans = plans.map((p, idx) => ({
      id: p.id || generateId('vip'),
      name: String(p.name || `VIP ${idx + 1}`).trim(),
      price: Math.max(1, Number(p.price || 100)),
      dailyIncome: Math.max(1, Number(p.dailyIncome || 10)),
      totalIncome: Math.max(1, Number(p.totalIncome || Number(p.dailyIncome || 10) * Number(p.validityDays || 30))),
      validityDays: Math.max(1, Number(p.validityDays || 30)),
      imageUrl: String(p.imageUrl || DEFAULT_PLANS[0].imageUrl).trim(),
      badge: p.badge ? String(p.badge).trim() : undefined,
      sortOrder: Number(p.sortOrder ?? idx + 1),
      active: p.active !== false,
    }));
    db.settings.updatedAt = new Date().toISOString();
    saveDb();
    broadcastSync('plans_updated', { plans: db.plans });
    res.json({ message: 'প্ল্যানসমূহ সংরক্ষণ ও সবার কাছে আপডেট করা হয়েছে।', plans: db.plans });
  });

  app.put('/api/admin/banners', requireAdmin, (req, res) => {
    const { banners } = req.body as { banners?: BannerSlide[] };
    if (!Array.isArray(banners)) {
      res.status(400).json({ error: 'সঠিক ব্যানার তালিকা দিন।' });
      return;
    }
    db.banners = banners.map((b, idx) => ({
      id: b.id || `banner_${idx + 1}`,
      order: Number(b.order ?? idx + 1),
      title: String(b.title || `NexasWorld ব্যানার ${idx + 1}`).trim(),
      subtitle: String(b.subtitle || '').trim(),
      badge: b.badge ? String(b.badge).trim() : undefined,
      imageUrl: String(b.imageUrl || DEFAULT_BANNERS[0].imageUrl).trim(),
      accent: b.accent || 'from-slate-950/90 via-slate-900/75 to-emerald-950/60',
      active: b.active !== false,
    }));
    db.settings.updatedAt = new Date().toISOString();
    saveDb();
    broadcastSync('banners_updated', { banners: db.banners });
    res.json({ message: 'ব্যানারগুলো সংরক্ষণ ও সবার কাছে আপডেট করা হয়েছে।', banners: db.banners });
  });

  app.post('/api/admin/gift-codes', requireAdmin, (req, res) => {
    const { code, amount, maxUses } = req.body as { code?: string; amount?: number; maxUses?: number };
    const clean = String(code || '').trim().toUpperCase();
    const numAmount = Number(amount || 0);
    if (!clean || numAmount <= 0) {
      res.status(400).json({ error: 'সঠিক কোড ও পরিমাণ লিখুন।' });
      return;
    }
    const existingIdx = db.giftCodes.findIndex((g) => g.code.toUpperCase() === clean);
    const entry: GiftCode = {
      code: clean,
      amount: numAmount,
      active: true,
      maxUses: maxUses && Number(maxUses) > 0 ? Number(maxUses) : undefined,
      usedCount: existingIdx >= 0 ? db.giftCodes[existingIdx].usedCount : 0,
      createdAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      db.giftCodes[existingIdx] = entry;
    } else {
      db.giftCodes.unshift(entry);
    }
    saveDb();
    broadcastSync('gift_codes_updated');
    res.json({ message: 'গিফট কোড যুক্ত করা হয়েছে।', giftCodes: db.giftCodes });
  });

  app.patch('/api/admin/gift-codes/:code/toggle', requireAdmin, (req, res) => {
    const clean = String(req.params.code || '').toUpperCase();
    const gift = db.giftCodes.find((g) => g.code.toUpperCase() === clean);
    if (!gift) {
      res.status(404).json({ error: 'গিফট কোড পাওয়া যায়নি।' });
      return;
    }
    gift.active = !gift.active;
    saveDb();
    broadcastSync('gift_codes_updated');
    res.json({ message: 'গিফট কোড স্ট্যাটাস আপডেট হয়েছে।', giftCodes: db.giftCodes });
  });

  app.delete('/api/admin/gift-codes/:code', requireAdmin, (req, res) => {
    const clean = String(req.params.code || '').toUpperCase();
    db.giftCodes = db.giftCodes.filter((g) => g.code.toUpperCase() !== clean);
    saveDb();
    broadcastSync('gift_codes_updated');
    res.json({ message: 'গিফট কোড মুছে ফেলা হয়েছে।', giftCodes: db.giftCodes });
  });

  // Vite or Static Dist Serving
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));
  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexasWorld server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

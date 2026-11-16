import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { BannerSlide, GiftCode, GlobalSettings, Plan } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const BOOTSTRAPPED_ADMIN_EMAIL = 'nexasworld5@gmail.com';

export function isAuthorizedFirebaseAdmin(user: FirebaseUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.emailVerified &&
      user.email &&
      user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export async function signInAdminWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function observeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

function parseTimestampMs(raw: unknown): number {
  if (!raw) return 0;
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
    const fn = (raw as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') return fn.call(raw).getTime();
  }
  if (typeof raw === 'string') {
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

export function subscribePublicSettings(
  onData: (settings: GlobalSettings, updatedMs: number) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, 'settings', 'global'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const updatedMs = parseTimestampMs(d.updatedAt);
        const updatedAtIso = updatedMs > 0 ? new Date(updatedMs).toISOString() : undefined;
        onData(
          {
            supportGroupUrl: String(d.supportGroupUrl || ''),
            supportChannelUrl: String(d.supportChannelUrl || ''),
            bkashNumber: String(d.bkashNumber || ''),
            nagadNumber: String(d.nagadNumber || ''),
            minDeposit: Number(d.minDeposit ?? 150),
            minWithdraw: Number(d.minWithdraw ?? 200),
            welcomeBonus: Number(d.welcomeBonus ?? 100),
            level1Rate: Number(d.level1Rate ?? 20),
            level2Rate: Number(d.level2Rate ?? 3),
            level3Rate: Number(d.level3Rate ?? 2),
            updatedAt: updatedAtIso,
          },
          updatedMs || Date.now()
        );
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribePublicPlans(
  onData: (plans: Plan[], latestUpdatedMs: number) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, 'plans'), where('active', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        let latestMs = 0;
        const items: Plan[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const docMs = parseTimestampMs(d.updatedAt);
          if (docMs > latestMs) latestMs = docMs;
          return {
            id: String(d.id || docSnap.id),
            name: String(d.name || ''),
            price: Number(d.price || 0),
            dailyIncome: Number(d.dailyIncome || 0),
            totalIncome: Number(d.totalIncome || 0),
            validityDays: Number(d.validityDays || 30),
            imageUrl: String(d.imageUrl || ''),
            badge: d.badge ? String(d.badge) : undefined,
            sortOrder: Number(d.sortOrder || 0),
            active: Boolean(d.active),
          };
        });
        items.sort((a, b) => a.sortOrder - b.sortOrder);
        onData(items, latestMs || Date.now());
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribePublicBanners(
  onData: (banners: BannerSlide[], latestUpdatedMs: number) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, 'banners'), where('active', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        let latestMs = 0;
        const items: BannerSlide[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const docMs = parseTimestampMs(d.updatedAt);
          if (docMs > latestMs) latestMs = docMs;
          return {
            id: String(d.id || docSnap.id),
            order: Number(d.order || 0),
            title: String(d.title || ''),
            subtitle: String(d.subtitle || ''),
            badge: d.badge ? String(d.badge) : undefined,
            imageUrl: String(d.imageUrl || ''),
            accent: d.accent ? String(d.accent) : undefined,
            active: Boolean(d.active),
          };
        });
        items.sort((a, b) => a.order - b.order);
        onData(items, latestMs || Date.now());
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function syncSettingsToFirestore(settings: GlobalSettings): Promise<void> {
  if (!auth.currentUser) return;
  const path = 'settings/global';
  try {
    await setDoc(doc(db, 'settings', 'global'), {
      supportGroupUrl: String(settings.supportGroupUrl || '').trim().slice(0, 300),
      supportChannelUrl: String(settings.supportChannelUrl || '').trim().slice(0, 300),
      bkashNumber: String(settings.bkashNumber || '').trim().slice(0, 30),
      nagadNumber: String(settings.nagadNumber || '').trim().slice(0, 30),
      minDeposit: Math.max(1, Number(settings.minDeposit || 150)),
      minWithdraw: Math.max(1, Number(settings.minWithdraw || 200)),
      welcomeBonus: Math.max(0, Number(settings.welcomeBonus ?? 100)),
      level1Rate: Math.max(0, Math.min(100, Number(settings.level1Rate ?? 20))),
      level2Rate: Math.max(0, Math.min(100, Number(settings.level2Rate ?? 3))),
      level3Rate: Math.max(0, Math.min(100, Number(settings.level3Rate ?? 2))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncPlanToFirestore(plan: Plan): Promise<void> {
  if (!auth.currentUser) return;
  const safeId = plan.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'vip_plan';
  const path = `plans/${safeId}`;
  const price = Math.max(1, Number(plan.price || 100));
  const dailyIncome = Math.max(1, Number(plan.dailyIncome || 10));
  const validityDays = Math.max(1, Math.min(3650, Number(plan.validityDays || 30)));
  const totalIncome = Math.max(dailyIncome, Number(plan.totalIncome || dailyIncome * validityDays));
  const imageUrl = String(plan.imageUrl || '/assets/aistudio/nexas-6000-White-Slush_01ab39be.jpg')
    .trim()
    .slice(0, 500);
  try {
    const payload: Record<string, unknown> = {
      id: safeId,
      name: String(plan.name || safeId).trim().slice(0, 80) || safeId,
      price,
      dailyIncome,
      totalIncome,
      validityDays,
      imageUrl: imageUrl.startsWith('data:') && String(plan.imageUrl || '').length > 500
        ? '/assets/aistudio/nexas-6000-White-Slush_01ab39be.jpg'
        : imageUrl,
      sortOrder: Math.max(0, Number(plan.sortOrder || 0)),
      active: Boolean(plan.active),
      updatedAt: serverTimestamp(),
    };
    if (plan.badge && plan.badge.trim()) {
      payload.badge = plan.badge.trim().slice(0, 60);
    }
    await setDoc(doc(db, 'plans', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncBannerToFirestore(banner: BannerSlide): Promise<void> {
  if (!auth.currentUser) return;
  const safeId = banner.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'banner_1';
  const path = `banners/${safeId}`;
  const rawImg = String(banner.imageUrl || '/assets/aistudio/nexas_black_banner.svg').trim();
  const safeImg =
    rawImg.startsWith('data:') && rawImg.length > 500
      ? '/assets/aistudio/nexas_black_banner.svg'
      : rawImg.slice(0, 500);
  try {
    const payload: Record<string, unknown> = {
      id: safeId,
      order: Math.max(0, Math.min(100, Number(banner.order || 0))),
      title: String(banner.title || 'NexasWorld').trim().slice(0, 160) || 'NexasWorld',
      subtitle: String(banner.subtitle || '').trim().slice(0, 320),
      imageUrl: safeImg,
      active: Boolean(banner.active),
      updatedAt: serverTimestamp(),
    };
    if (banner.badge && banner.badge.trim()) {
      payload.badge = banner.badge.trim().slice(0, 60);
    }
    if (banner.accent && banner.accent.trim()) {
      payload.accent = banner.accent.trim().slice(0, 40);
    }
    await setDoc(doc(db, 'banners', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlanFromFirestore(planId: string): Promise<void> {
  if (!auth.currentUser) return;
  const safeId = planId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `plans/${safeId}`;
  try {
    await deleteDoc(doc(db, 'plans', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncGiftCodeToFirestore(gift: GiftCode): Promise<void> {
  if (!auth.currentUser) return;
  const cleanCode = String(gift.code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
  if (!cleanCode) return;
  const path = `giftCodes/${cleanCode}`;
  try {
    const payload: Record<string, unknown> = {
      code: cleanCode,
      amount: Math.max(1, Math.min(100000, Number(gift.amount || 5))),
      active: Boolean(gift.active),
      usedCount: Math.max(0, Number(gift.usedCount || 0)),
      createdAt: String(gift.createdAt || new Date().toISOString()).slice(0, 64),
      updatedAt: serverTimestamp(),
    };
    if (gift.maxUses && Number(gift.maxUses) >= 1) {
      payload.maxUses = Math.floor(Number(gift.maxUses));
    }
    await setDoc(doc(db, 'giftCodes', cleanCode), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGiftCodeFromFirestore(code: string): Promise<void> {
  if (!auth.currentUser) return;
  const cleanCode = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
  if (!cleanCode) return;
  const path = `giftCodes/${cleanCode}`;
  try {
    await deleteDoc(doc(db, 'giftCodes', cleanCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchGiftCodeFromFirestore(code: string): Promise<GiftCode | null> {
  const cleanCode = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
  if (!cleanCode) return null;
  try {
    const snap = await getDoc(doc(db, 'giftCodes', cleanCode));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      code: String(d.code || cleanCode),
      amount: Number(d.amount || 0),
      active: Boolean(d.active),
      maxUses: d.maxUses ? Number(d.maxUses) : undefined,
      usedCount: Number(d.usedCount || 0),
      createdAt: String(d.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

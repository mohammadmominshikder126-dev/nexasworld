import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Gift,
  Image as ImageIcon,
  Layers,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { api, getAdminToken, setAdminToken } from '../api/client';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  deleteGiftCodeFromFirestore,
  isAuthorizedFirebaseAdmin,
  observeFirebaseAuth,
  signInAdminWithGoogle,
  signOutFirebase,
  syncBannerToFirestore,
  syncGiftCodeToFirestore,
  syncPlanToFirestore,
  syncSettingsToFirestore,
} from '../firebase';
import {
  BannerSlide,
  DepositRecord,
  GiftCode,
  GlobalSettings,
  Plan,
  User,
  WithdrawRecord,
} from '../types';
import { formatBDT, formatDateTime, formatNumberEN } from '../utils/format';
import { NexasLogo } from './NexasLogo';

type AdminTab = 'overview' | 'users' | 'plans' | 'banners' | 'settings' | 'gifts';

interface ServerImage {
  name: string;
  url: string;
  source: 'server' | 'uploaded';
}

interface AdminPanelViewProps {
  onExitAdmin: () => void;
  onGlobalUpdated: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  onExitAdmin,
  onGlobalUpdated,
}) => {
  const [adminToken, setLocalAdminToken] = useState<string | null>(getAdminToken());
  const [passcode, setPasscode] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const hasAutoSyncedRef = useRef(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const isCloudReady = isAuthorizedFirebaseAdmin(fbUser);

  // Overview state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    pendingWithdrawals: 0,
    pendingDeposits: 0,
    activePlans: 0,
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [newPasscode, setNewPasscode] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);

  // User search & balance adjustment
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(User & { activePlansCount?: number })[]>([]);
  const [selectedUser, setSelectedUser] = useState<(User & { activePlansCount?: number }) | null>(null);
  const [adjBalanceType, setAdjBalanceType] = useState<'recharge' | 'withdrawal'>('recharge');
  const [adjAction, setAdjAction] = useState<'add' | 'deduct'>('add');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');

  // Gift code form
  const [newGiftCode, setNewGiftCode] = useState('');
  const [newGiftAmount, setNewGiftAmount] = useState('');
  const [newGiftMaxUses, setNewGiftMaxUses] = useState('');

  // Server Image Picker Modal
  const [pickerTarget, setPickerTarget] = useState<{
    kind: 'plan' | 'banner';
    index: number;
  } | null>(null);
  const [serverImages, setServerImages] = useState<ServerImage[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const unsub = observeFirebaseAuth((u) => setFbUser(u));
    return () => unsub();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.adminOverview();
      setStats(data.stats);
      setWithdrawals(data.withdrawals);
      setDeposits(data.deposits);
      setSettings(data.settings);
      setPlans(data.plans);
      setBanners(data.banners);
      setGiftCodes(data.giftCodes);
      setSearchResults(data.users.slice(0, 30));
    } catch (err) {
      if (err instanceof Error && err.message.includes('অ্যাডমিন')) {
        setAdminToken(null);
        setLocalAdminToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadOverview();
    }
  }, [adminToken]);

  useEffect(() => {
    if (!isCloudReady || !settings || plans.length === 0 || hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    Promise.all([
      syncSettingsToFirestore(settings),
      ...plans.map((p) => syncPlanToFirestore(p)),
      ...banners.map((b) => syncBannerToFirestore(b)),
      ...giftCodes.map((g) => syncGiftCodeToFirestore(g)),
    ]).catch(() => {
      hasAutoSyncedRef.current = false;
    });
  }, [isCloudReady, settings, plans, banners, giftCodes]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setLoggingIn(true);
    try {
      const res = await api.adminLogin(passcode);
      setAdminToken(res.token);
      setLocalAdminToken(res.token);
      setPasscode('');
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogoutAdmin = () => {
    setAdminToken(null);
    setLocalAdminToken(null);
  };

  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await api.adminSearchUsers(searchQuery);
      setSearchResults(res.users);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'সার্চ ব্যর্থ হয়েছে।');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await api.adminAdjustBalance(selectedUser.id, {
        balanceType: adjBalanceType,
        action: adjAction,
        amount: Number(adjAmount),
        note: adjNote,
      });
      setSelectedUser(res.user);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u))
      );
      setAdjAmount('');
      setAdjNote('');
      showToast(res.message);
      onGlobalUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ব্যালেন্স পরিবর্তন ব্যর্থ হয়েছে।');
    }
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'failed') => {
    try {
      const res = await api.adminProcessWithdrawal(id, status);
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? res.withdrawal : w)));
      showToast(res.message);
      onGlobalUpdated();
      loadOverview();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'অপারেশন ব্যর্থ হয়েছে।');
    }
  };

  const handleDepositAction = async (id: string, status: 'completed' | 'failed') => {
    try {
      const res = await api.adminProcessDeposit(id, status);
      setDeposits((prev) => prev.map((d) => (d.id === id ? res.deposit : d)));
      showToast(res.message);
      onGlobalUpdated();
      loadOverview();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'অপারেশন ব্যর্থ হয়েছে।');
    }
  };

  const normalizeUrl = (raw: string, fallback: string) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return fallback;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed.replace(/^\/+/, '')}`;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const normalizedSettings: GlobalSettings = {
      ...settings,
      supportGroupUrl: normalizeUrl(settings.supportGroupUrl, 'https://t.me/NexasWorld_SupportGroup'),
      supportChannelUrl: normalizeUrl(settings.supportChannelUrl, 'https://t.me/NexasWorld_OfficialChannel'),
      bkashNumber: String(settings.bkashNumber || '').trim(),
      nagadNumber: String(settings.nagadNumber || '').trim(),
      minDeposit: Math.max(1, Number(settings.minDeposit || 150)),
      minWithdraw: Math.max(1, Number(settings.minWithdraw || 200)),
      welcomeBonus: Math.max(0, Number(settings.welcomeBonus ?? 100)),
      level1Rate: Math.max(0, Math.min(100, Number(settings.level1Rate ?? 20))),
      level2Rate: Math.max(0, Math.min(100, Number(settings.level2Rate ?? 3))),
      level3Rate: Math.max(0, Math.min(100, Number(settings.level3Rate ?? 2))),
    };
    try {
      const res = await api.adminSaveSettings({
        ...normalizedSettings,
        newPasscode: newPasscode.trim() || undefined,
      });
      setSettings(res.settings);
      setNewPasscode('');
      onGlobalUpdated();
      if (isCloudReady) {
        await syncSettingsToFirestore(res.settings);
        showToast('সেটিংস সেভ ও সকল ইউজার অ্যাকাউন্টে লাইভ আপডেট হয়েছে!');
      } else {
        showToast('স্থানীয়ভাবে সেভ হয়েছে — সব ইউজারে পাঠাতে Google সংযুক্ত করুন।');
        setShowCloudSyncModal(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'সেটিংস সেভ ব্যর্থ হয়েছে।');
    }
  };

  const handleSavePlans = async () => {
    const normalizedPlans = plans.map((p, idx) => {
      const price = Math.max(1, Number(p.price || 100));
      const dailyIncome = Math.max(1, Number(p.dailyIncome || 10));
      const validityDays = Math.max(1, Math.min(3650, Number(p.validityDays || 30)));
      const totalIncome = Math.max(dailyIncome, Number(p.totalIncome || dailyIncome * validityDays));
      return {
        ...p,
        name: String(p.name || `VIP ${idx + 1}`).trim() || `VIP ${idx + 1}`,
        price,
        dailyIncome,
        validityDays,
        totalIncome,
        sortOrder: Number(p.sortOrder ?? idx + 1),
      };
    });
    try {
      const res = await api.adminSavePlans(normalizedPlans);
      setPlans(res.plans);
      onGlobalUpdated();
      if (isCloudReady) {
        await Promise.all(res.plans.map((p) => syncPlanToFirestore(p)));
        if (settings) await syncSettingsToFirestore(settings);
        showToast('প্ল্যানসমূহ সেভ ও সকল ইউজার অ্যাকাউন্টে লাইভ আপডেট হয়েছে!');
      } else {
        showToast('স্থানীয়ভাবে সেভ হয়েছে — সব ইউজারে পাঠাতে Google সংযুক্ত করুন।');
        setShowCloudSyncModal(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'প্ল্যান সেভ ব্যর্থ হয়েছে।');
    }
  };

  const handleSaveBanners = async () => {
    try {
      const res = await api.adminSaveBanners(banners);
      setBanners(res.banners);
      onGlobalUpdated();
      if (isCloudReady) {
        await Promise.all(res.banners.map((b) => syncBannerToFirestore(b)));
        if (settings) await syncSettingsToFirestore(settings);
        showToast('ব্যানারসমূহ সেভ ও সকল ইউজার অ্যাকাউন্টে লাইভ আপডেট হয়েছে!');
      } else {
        showToast('স্থানীয়ভাবে সেভ হয়েছে — সব ইউজারে পাঠাতে Google সংযুক্ত করুন।');
        setShowCloudSyncModal(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ব্যানার সেভ ব্যর্থ হয়েছে।');
    }
  };

  const handleGalleryUpload = async (
    kind: 'plan' | 'banner',
    index: number,
    file: File
  ) => {
    const key = `${kind}_${index}`;
    setUploadingKey(key);
    try {
      const res = await api.uploadImage(file);
      if (kind === 'plan') {
        setPlans((prev) =>
          prev.map((p, i) => (i === index ? { ...p, imageUrl: res.url } : p))
        );
      } else {
        setBanners((prev) =>
          prev.map((b, i) => (i === index ? { ...b, imageUrl: res.url } : b))
        );
      }
      showToast('গ্যালারি থেকে ছবি আপলোড হয়েছে! সংরক্ষণ করতে "সেভ করুন" বাটনে চাপ দিন।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setUploadingKey(null);
    }
  };

  const openServerPicker = async (kind: 'plan' | 'banner', index: number) => {
    setPickerTarget({ kind, index });
    try {
      const res = await api.getServerImages();
      setServerImages(res.images);
    } catch {
      setServerImages([]);
    }
  };

  const selectServerImage = (url: string) => {
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'plan') {
      setPlans((prev) =>
        prev.map((p, i) => (i === pickerTarget.index ? { ...p, imageUrl: url } : p))
      );
    } else {
      setBanners((prev) =>
        prev.map((b, i) => (i === pickerTarget.index ? { ...b, imageUrl: url } : b))
      );
    }
    setPickerTarget(null);
    showToast('সার্ভার থেকে ছবি নির্বাচিত হয়েছে! সেভ করতে ভুলবেন না।');
  };

  const handleSyncAllToFirebase = async () => {
    setSyncingCloud(true);
    try {
      let user = fbUser;
      if (user && !isAuthorizedFirebaseAdmin(user)) {
        await signOutFirebase();
        user = null;
      }
      if (!user) {
        user = await signInAdminWithGoogle();
      }
      if (!isAuthorizedFirebaseAdmin(user)) {
        showToast(
          `দুঃখিত (${user.email || 'unknown'}) অনুমোদিত অ্যাডমিন নয়। অনুগ্রহ করে ${BOOTSTRAPPED_ADMIN_EMAIL} দিয়ে লগইন করুন।`
        );
        return;
      }
      if (settings) await syncSettingsToFirestore(settings);
      await Promise.all([
        ...plans.map((p) => syncPlanToFirestore(p)),
        ...banners.map((b) => syncBannerToFirestore(b)),
        ...giftCodes.map((g) => syncGiftCodeToFirestore(g)),
      ]);
      hasAutoSyncedRef.current = true;
      setShowCloudSyncModal(false);
      showToast(`Firebase ক্লাউডে সফলভাবে সিঙ্ক হয়েছে (${user.email}) — সব ইউজার অ্যাকাউন্ট আপডেট হয়েছে!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Firebase সিঙ্ক ব্যর্থ হয়েছে।');
    } finally {
      setSyncingCloud(false);
    }
  };

  // Passcode Lock Screen
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#080b10] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#131822] border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <NexasLogo size="sm" />
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> সাইটে ফিরুন
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">গোপন অ্যাডমিন প্যানেল</h1>
              <p className="text-xs text-slate-400">
                সিস্টেম নিয়ন্ত্রণ করতে অ্যাডমিন পাসকোড দিন
              </p>
            </div>
          </div>

          {loginErr && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {loginErr}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                অ্যাডমিন পাসকোড
              </label>
              <div className="flex items-center rounded-xl bg-[#0b0e14] border border-slate-700 px-3.5">
                <Lock className="w-4 h-4 text-slate-400 mr-2.5" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="পাসকোড লিখুন (ডিফল্ট: admin1234)"
                  className="w-full py-3 bg-transparent text-white text-sm font-mono-num focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {loggingIn ? 'যাচাই হচ্ছে...' : 'অ্যাডমিন প্যানেলে প্রবেশ করুন'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100 pb-14">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 bg-[#111621]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <NexasLogo size="sm" />
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
              অ্যাডমিন কন্ট্রোল
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAllToFirebase}
              disabled={syncingCloud}
              className={`px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                isCloudReady ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>
                {syncingCloud
                  ? 'সিঙ্ক হচ্ছে...'
                  : isCloudReady
                  ? 'Firebase সিঙ্ক করুন'
                  : 'Firebase Google লগইন'}
              </span>
            </button>
            {fbUser && (
              <button
                type="button"
                onClick={() => {
                  hasAutoSyncedRef.current = false;
                  signOutFirebase();
                }}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                title={fbUser.email || ''}
              >
                {fbUser.email?.split('@')[0]}
              </button>
            )}
            <button
              type="button"
              onClick={loadOverview}
              aria-label="রিফ্রেশ"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
            >
              সাইট দেখুন
            </button>
            <button
              type="button"
              onClick={handleLogoutAdmin}
              aria-label="অ্যাডমিন লগআউট"
              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm shadow-2xl">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 space-y-5">
        {/* Live Cross-Link Cloud Sync Status Bar */}
        <div
          className={`rounded-2xl px-4 py-3 border flex flex-wrap items-center justify-between gap-3 text-xs ${
            isCloudReady
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : fbUser
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 shrink-0" />
            <span>
              {isCloudReady
                ? `লাইভ ক্লাউড সিঙ্ক সক্রিয় (${fbUser?.email}) — এখান থেকে যেকোনো আপডেট সাথে সাথে সকল ইউজার অ্যাকাউন্ট ও লিংকে চলে যাবে।`
                : fbUser
                ? `বর্তমান ইমেইল (${fbUser.email}) ক্লাউড অ্যাডমিন নয় — সব ইউজারে লাইভ আপডেট পাঠাতে ${BOOTSTRAPPED_ADMIN_EMAIL} দিয়ে লগইন করুন।`
                : 'সকল ব্যবহারকারীর অ্যাকাউন্ট, শেয়ার্ড লিংক ও মোবাইল অ্যাপে তাৎক্ষণিক লাইভ আপডেট পাঠাতে "Firebase Google লগইন" চালু করুন।'}
            </span>
          </div>
          {!isCloudReady && (
            <button
              type="button"
              onClick={handleSyncAllToFirebase}
              disabled={syncingCloud}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0 disabled:opacity-60"
            >
              {fbUser ? 'অ্যাডমিন অ্যাকাউন্ট বদলান' : 'এখনই চালু করুন'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'overview', label: 'ওভারভিউ ও অনুমোদন', icon: Shield },
              { id: 'users', label: 'ইউজার সার্চ ও ব্যালেন্স', icon: Users },
              { id: 'plans', label: 'VIP প্ল্যান ও ছবি', icon: Layers },
              { id: 'banners', label: '১০টি ব্যানার ও ছবি', icon: ImageIcon },
              { id: 'settings', label: 'সিস্টেম ও লিংক সেটিংস', icon: Settings },
              { id: 'gifts', label: 'গিফট কোড', icon: Gift },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[#151b27] text-slate-300 hover:bg-[#1c2434] border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* OVERVIEW & APPROVALS TAB */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-4">
                <div className="text-xs text-slate-400">মোট ব্যবহারকারী</div>
                <div className="text-2xl font-num font-extrabold text-white mt-1">
                  {formatNumberEN(stats.totalUsers)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-4">
                <div className="text-xs text-slate-400">মোট ডিপোজিট</div>
                <div className="text-2xl font-num font-extrabold text-emerald-400 mt-1">
                  {formatBDT(stats.totalDeposits)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-4">
                <div className="text-xs text-slate-400">অপেক্ষমান উত্তোলন</div>
                <div className="text-2xl font-num font-extrabold text-amber-400 mt-1">
                  {formatNumberEN(stats.pendingWithdrawals)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-4">
                <div className="text-xs text-slate-400">অপেক্ষমান ডিপোজিট</div>
                <div className="text-2xl font-num font-extrabold text-sky-400 mt-1">
                  {formatNumberEN(stats.pendingDeposits)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-4">
                <div className="text-xs text-slate-400">সক্রিয় প্ল্যান</div>
                <div className="text-2xl font-num font-extrabold text-white mt-1">
                  {formatNumberEN(stats.activePlans)}
                </div>
              </div>
            </div>

            {/* Withdrawals Management */}
            <div className="rounded-2xl bg-[#141923] border border-slate-800 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">উত্তোলন অনুরোধসমূহ</h2>
                <span className="text-xs text-slate-400">
                  অপেক্ষমান (হলুদ) · অনুমোদিত (সবুজ) · ব্যর্থ (লাল)
                </span>
              </div>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {withdrawals.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    কোনো উত্তোলন অনুরোধ নেই।
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">
                          <span className="font-num">{formatBDT(w.amount)}</span> ·{' '}
                          {w.method === 'bkash' ? 'বিকাশ' : 'নগদ'} (
                          <span className="font-num">{w.accountNumber}</span>)
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          নাম: {w.accountName} · ইউজার: <span className="font-num">{w.userPhone}</span> ·{' '}
                          <span className="font-num">{formatDateTime(w.createdAt)}</span>
                        </div>
                      </div>

                      {w.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleWithdrawalAction(w.id, 'approved')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> অ্যাপ্রুভ করুন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWithdrawalAction(w.id, 'failed')}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> ব্যর্থ (রিফান্ড)
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-bold border ${
                            w.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/35'
                          }`}
                        >
                          {w.status === 'approved' ? 'অনুমোদিত' : 'ব্যর্থ'}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Deposits & Proof Submissions */}
            <div className="rounded-2xl bg-[#141923] border border-slate-800 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">ডিপোজিট / রিচার্জ অনুরোধসমূহ</h2>
                <span className="text-xs text-slate-400">
                  অপেক্ষমান (হলুদ) · অনুমোদিত (সবুজ) · ব্যর্থ (লাল)
                </span>
              </div>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {deposits.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    কোনো ডিপোজিট রেকর্ড নেই।
                  </div>
                ) : (
                  deposits.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">
                          <span className="font-num">{formatBDT(d.amount)}</span> ·{' '}
                          {d.method === 'bkash' ? 'বিকাশ' : 'নগদ'} ·{' '}
                          <span className="font-mono-num text-emerald-400">{d.trxId}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-num">
                          ইউজার: {d.userPhone} · প্রেরক: {d.senderNumber} · {formatDateTime(d.createdAt)}
                        </div>
                        {d.proofNote && (
                          <div className="text-xs text-amber-300">মন্তব্য: {d.proofNote}</div>
                        )}
                        {d.proofImageUrl && (
                          <a
                            href={d.proofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs text-sky-400 underline"
                          >
                            আপলোডকৃত স্ক্রিনশট দেখুন
                          </a>
                        )}
                      </div>

                      {d.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDepositAction(d.id, 'completed')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            অনুমোদন করুন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDepositAction(d.id, 'failed')}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-bold border ${
                            d.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/35'
                          }`}
                        >
                          {d.status === 'completed' ? 'অনুমোদিত' : 'ব্যর্থ'}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* USER SEARCH & BALANCE ADJUSTMENT TAB */}
        {tab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <form onSubmit={handleSearchUsers} className="flex gap-2">
                <div className="flex-1 flex items-center rounded-xl bg-[#141923] border border-slate-800 px-3.5">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="মোবাইল নম্বর, আইডি অথবা রেফার কোড দিয়ে খুঁজুন..."
                    className="w-full py-3 bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  সার্চ
                </button>
              </form>

              <div className="rounded-2xl bg-[#141923] border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    কোনো ব্যবহারকারী পাওয়া যায়নি।
                  </div>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`w-full p-4 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        selectedUser?.id === u.id ? 'bg-emerald-500/10' : 'hover:bg-[#1a202d]'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-num font-bold text-white">{u.phone}</div>
                        <div className="text-xs text-slate-400 font-mono-num mt-0.5">
                          ID: {u.id} · কোড: {u.referralCode}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-emerald-400 font-num font-bold">
                          অ্যাকাউন্ট: {formatBDT(u.rechargeBalance)}
                        </div>
                        <div className="text-amber-400 font-num font-bold mt-0.5">
                          উত্তোলন: {formatBDT(u.withdrawalBalance)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#141923] border border-slate-800 p-5 space-y-4 sticky top-20">
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">ব্যালেন্স যোগ বা কর্তন</h3>
                </div>

                {!selectedUser ? (
                  <p className="text-xs text-slate-400">
                    বাম পাশের তালিকা থেকে যেকোনো ব্যবহারকারী নির্বাচন করুন।
                  </p>
                ) : (
                  <form onSubmit={handleAdjustBalance} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-[#0e131d] border border-slate-800 space-y-1">
                      <div className="text-sm font-num font-bold text-white">
                        {selectedUser.phone}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num">
                        ID: {selectedUser.id}
                      </div>
                      <div className="flex gap-4 text-xs pt-1">
                        <span className="text-emerald-400 font-num font-bold">
                          অ্যাকাউন্ট: {formatBDT(selectedUser.rechargeBalance)}
                        </span>
                        <span className="text-amber-400 font-num font-bold">
                          উত্তোলন: {formatBDT(selectedUser.withdrawalBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjBalanceType('recharge')}
                        className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          adjBalanceType === 'recharge'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        অ্যাকাউন্ট ব্যালেন্স
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjBalanceType('withdrawal')}
                        className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          adjBalanceType === 'withdrawal'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        উত্তোলন ব্যালেন্স
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjAction('add')}
                        className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          adjAction === 'add'
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        + টাকা যোগ করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjAction('deduct')}
                        className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          adjAction === 'deduct'
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        - টাকা কেটে নিন
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        পরিমাণ (৳)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={adjAmount}
                        onChange={(e) => setAdjAmount(e.target.value)}
                        placeholder="যেমন: 500"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-num font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        কারণ / নোট (ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        value={adjNote}
                        onChange={(e) => setAdjNote(e.target.value)}
                        placeholder="যেমন: ম্যানুয়াল অ্যাডজাস্টমেন্ট"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
                    >
                      ব্যালেন্স আপডেট করুন
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIP PLANS & IMAGE UPLOAD TAB */}
        {tab === 'plans' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white">
                ভিআইপি প্ল্যান ও প্রোডাক্ট ছবি (গ্যালারি বা সার্ভার থেকে আপলোড)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPlans((prev) => [
                      ...prev,
                      {
                        id: `vip_${prev.length + 1}`,
                        name: `VIP ${prev.length + 1}`,
                        price: 1500,
                        dailyIncome: 250,
                        totalIncome: 7500,
                        validityDays: 30,
                        imageUrl: prev[0]?.imageUrl || '',
                        sortOrder: prev.length + 1,
                        active: true,
                      },
                    ])
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> নতুন প্ল্যান
                </button>
                <button
                  type="button"
                  onClick={handleSavePlans}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> সকল প্ল্যান সেভ ও আপডেট করুন
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className="rounded-2xl bg-[#141923] border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700">
                      <img
                        src={plan.imageUrl}
                        alt={plan.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) =>
                            setPlans((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#0e131d] border border-slate-700 text-sm font-num font-bold text-white w-32"
                        />
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={plan.active}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, active: e.target.checked } : p
                                )
                              )
                            }
                          />
                          সক্রিয়
                        </label>
                      </div>

                      {/* Image Upload Buttons: Gallery OR Server */}
                      <div className="flex flex-wrap gap-2">
                        <label className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>
                            {uploadingKey === `plan_${idx}` ? 'আপলোড হচ্ছে...' : 'গ্যালারি আপলোড'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleGalleryUpload('plan', idx, f);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openServerPicker('plan', idx)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> সার্ভার থেকে বাছুন
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">মূল্য (৳)</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, price: Number(e.target.value) } : p
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0e131d] border border-slate-700 font-num text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">দৈনিক আয়</label>
                      <input
                        type="number"
                        value={plan.dailyIncome}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, dailyIncome: Number(e.target.value) } : p
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0e131d] border border-slate-700 font-num text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">মোট আয়</label>
                      <input
                        type="number"
                        value={plan.totalIncome}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, totalIncome: Number(e.target.value) } : p
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0e131d] border border-slate-700 font-num text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">মেয়াদ (দিন)</label>
                      <input
                        type="number"
                        value={plan.validityDays}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, validityDays: Number(e.target.value) } : p
                            )
                          )
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0e131d] border border-slate-700 font-num text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ছবির URL / পাথ</label>
                    <input
                      type="text"
                      value={plan.imageUrl}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, imageUrl: e.target.value } : p))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0e131d] border border-slate-700 text-xs font-mono-num text-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10 BANNERS & IMAGE UPLOAD TAB */}
        {tab === 'banners' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white">
                হোম পেজ ১০টি ব্যানার স্লাইডার (গ্যালারি বা সার্ভার ছবি আপলোড)
              </h2>
              <button
                type="button"
                onClick={handleSaveBanners}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> ব্যানার সেভ ও আপডেট করুন
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((b, idx) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-[#141923] border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700">
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-num font-bold text-emerald-400">
                          ব্যানার #{idx + 1}
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={b.active}
                            onChange={(e) =>
                              setBanners((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, active: e.target.checked } : item
                                )
                              )
                            }
                          />
                          সক্রিয়
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>
                            {uploadingKey === `banner_${idx}` ? 'আপলোড হচ্ছে...' : 'গ্যালারি আপলোড'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleGalleryUpload('banner', idx, f);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openServerPicker('banner', idx)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> সার্ভার থেকে বাছুন
                        </button>
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={b.title}
                    onChange={(e) =>
                      setBanners((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, title: e.target.value } : item
                        )
                      )
                    }
                    placeholder="ব্যানার শিরোনাম"
                    className="w-full px-3 py-2 rounded-lg bg-[#0e131d] border border-slate-700 text-xs font-bold text-white"
                  />
                  <textarea
                    rows={2}
                    value={b.subtitle}
                    onChange={(e) =>
                      setBanners((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, subtitle: e.target.value } : item
                        )
                      )
                    }
                    placeholder="ব্যানার বিবরণ"
                    className="w-full px-3 py-2 rounded-lg bg-[#0e131d] border border-slate-700 text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={b.imageUrl}
                    onChange={(e) =>
                      setBanners((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, imageUrl: e.target.value } : item
                        )
                      )
                    }
                    placeholder="ছবির URL"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0e131d] border border-slate-700 text-[11px] font-mono-num text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SYSTEM SETTINGS TAB */}
        {tab === 'settings' && settings && (
          <form
            onSubmit={handleSaveSettings}
            className="rounded-2xl bg-[#141923] border border-slate-800 p-5 space-y-5 max-w-3xl"
          >
            <h2 className="text-base font-bold text-white">
              সাপোর্ট লিংক, রিচার্জ নম্বর, রেফার কমিশন ও সিস্টেম সেটিংস
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  গ্রুপ লিংক (টেলিগ্রাম গ্রুপ)
                </label>
                <input
                  type="text"
                  required
                  value={settings.supportGroupUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, supportGroupUrl: e.target.value })
                  }
                  placeholder="https://t.me/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  কাস্টমার সাপোর্ট লিংক
                </label>
                <input
                  type="text"
                  required
                  value={settings.supportChannelUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, supportChannelUrl: e.target.value })
                  }
                  placeholder="https://t.me/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  বিকাশ রিচার্জ নম্বর (GoPay)
                </label>
                <input
                  type="text"
                  required
                  value={settings.bkashNumber}
                  onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  নগদ রিচার্জ নম্বর (GoPay)
                </label>
                <input
                  type="text"
                  required
                  value={settings.nagadNumber}
                  onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  সর্বনিম্ন ডিপোজিট (৳)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={settings.minDeposit}
                  onChange={(e) =>
                    setSettings({ ...settings, minDeposit: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  সর্বনিম্ন উত্তোলন (৳)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={settings.minWithdraw}
                  onChange={(e) =>
                    setSettings({ ...settings, minWithdraw: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  নিবন্ধন স্বাগতম বোনাস (৳)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={settings.welcomeBonus}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeBonus: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  নতুন অ্যাডমিন পাসকোড (পরিবর্তন করতে চাইলে)
                </label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="খালি রাখলে আগেরটি থাকবে"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-mono-num"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-sm font-bold text-white mb-3">রেফারেল কমিশন হার (%)</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">লেভেল 1 (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.level1Rate}
                    onChange={(e) =>
                      setSettings({ ...settings, level1Rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">লেভেল 2 (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.level2Rate}
                    onChange={(e) =>
                      setSettings({ ...settings, level2Rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">লেভেল 3 (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.level3Rate}
                    onChange={(e) =>
                      setSettings({ ...settings, level3Rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white font-num font-bold"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> সংরক্ষণ ও গ্লোবাল আপডেট করুন
            </button>
          </form>
        )}

        {/* GIFT CODES TAB */}
        {tab === 'gifts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await api.adminCreateGiftCode({
                    code: newGiftCode,
                    amount: Number(newGiftAmount),
                    maxUses: newGiftMaxUses ? Number(newGiftMaxUses) : undefined,
                  });
                  setGiftCodes(res.giftCodes);
                  const created = res.giftCodes.find(
                    (g) => g.code.toUpperCase() === newGiftCode.trim().toUpperCase()
                  );
                  if (created && isCloudReady) {
                    await syncGiftCodeToFirestore(created);
                  }
                  setNewGiftCode('');
                  setNewGiftAmount('');
                  setNewGiftMaxUses('');
                  showToast(isCloudReady ? 'গিফট কোড সেভ ও লাইভ আপডেট হয়েছে!' : res.message);
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'গিফট কোড তৈরি ব্যর্থ।');
                }
              }}
              className="rounded-2xl bg-[#141923] border border-slate-800 p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">গিফট কোড তৈরি ও কন্ট্রোল</h3>
                <button
                  type="button"
                  onClick={() => {
                    const randAmt = Math.floor(5 + Math.random() * 11); // 5 to 15
                    const randCode = `NX${Math.random().toString(36).substring(2, 6).toUpperCase()}${randAmt}`;
                    setNewGiftCode(randCode);
                    setNewGiftAmount(String(randAmt));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[11px] font-bold cursor-pointer"
                >
                  র‍্যান্ডম (৳5–৳15) জেনারেট
                </button>
              </div>
              <input
                type="text"
                required
                value={newGiftCode}
                onChange={(e) => setNewGiftCode(e.target.value)}
                placeholder="কোড (যেমন: NEXAS10)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-mono-num uppercase"
              />
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[5, 8, 10, 12, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewGiftAmount(String(preset))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-num font-bold cursor-pointer ${
                        Number(newGiftAmount) === preset
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ৳{preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  value={newGiftAmount}
                  onChange={(e) => setNewGiftAmount(e.target.value)}
                  placeholder="বোনাস পরিমাণ (৳5 থেকে ৳15)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-num"
                />
              </div>
              <input
                type="number"
                min={1}
                value={newGiftMaxUses}
                onChange={(e) => setNewGiftMaxUses(e.target.value)}
                placeholder="সর্বোচ্চ ব্যবহার সীমা (ঐচ্ছিক)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-num"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                গিফট কোড সেভ করুন
              </button>
            </form>

            <div className="rounded-2xl bg-[#141923] border border-slate-800 divide-y divide-slate-800 overflow-hidden">
              {giftCodes.map((g) => (
                <div key={g.code} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono-num font-bold text-white">{g.code}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          g.active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {g.active ? 'সক্রিয়' : 'বন্ধ'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-num mt-0.5">
                      বোনাস: {formatBDT(g.amount)} · ব্যবহৃত: {g.usedCount}
                      {g.maxUses ? ` / ${g.maxUses}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await api.adminToggleGiftCode(g.code);
                        setGiftCodes(res.giftCodes);
                        const updated = res.giftCodes.find((x) => x.code === g.code);
                        if (updated && isCloudReady) {
                          await syncGiftCodeToFirestore(updated);
                        }
                        showToast(res.message);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      {g.active ? 'বন্ধ করুন' : 'চালু করুন'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await api.adminDeleteGiftCode(g.code);
                        setGiftCodes(res.giftCodes);
                        if (isCloudReady) {
                          await deleteGiftCodeFromFirestore(g.code);
                        }
                        showToast(res.message);
                      }}
                      aria-label="মুছুন"
                      className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Server Gallery Picker Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#141923] border border-slate-700 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">সার্ভার গ্যালারি থেকে ছবি বাছুন</h3>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[65vh] overflow-y-auto">
              {serverImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => selectServerImage(img.url)}
                  className="group rounded-xl overflow-hidden border border-slate-800 hover:border-emerald-400 bg-[#0b0e14] text-left cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-1.5 text-[10px] text-slate-300 truncate font-num">
                    {img.source === 'uploaded' ? 'আপলোড: ' : 'সার্ভার: '}
                    {img.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Cloud Sync Prompt Modal when Admin saves without Firebase Google Auth */}
      {showCloudSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141923] border border-amber-500/40 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">সব ইউজারে লাইভ আপডেট পাঠান</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudSyncModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                আপনার পরিবর্তন লোকাল সার্ভারে সংরক্ষিত হয়েছে। তবে অন্য ফোন, শেয়ার্ড লিংক বা মোবাইল অ্যাপ ব্যবহারকারীদের অ্যাকাউন্টে সাথে সাথে{' '}
                <strong className="text-white">
                  রিচার্জ নম্বর, কমিশন, টেলিগ্রাম লিংক ও প্ল্যান মূল্য
                </strong>{' '}
                আপডেট পাঠাতে Firebase ক্লাউড অ্যাডমিন (
                <span className="font-mono-num text-emerald-400">{BOOTSTRAPPED_ADMIN_EMAIL}</span>
                ) সংযুক্ত করুন।
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSyncAllToFirebase}
                  disabled={syncingCloud}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Cloud className="w-4 h-4" />
                  <span>
                    {syncingCloud ? 'ক্লাউডে পাঠানো হচ্ছে...' : 'Google দিয়ে সব ইউজারে পাঠান'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloudSyncModal(false)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  পরে করব
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

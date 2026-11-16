import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Home, Package, User as UserIcon, Users } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { api, getStoredToken, setStoredToken } from './api/client';
import { syncCloudToFallbackEngine } from './api/fallbackEngine';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthView } from './components/AuthView';
import { DepositView } from './components/DepositView';
import { GoPayCheckoutView } from './components/GoPayCheckoutView';
import { HomeView } from './components/HomeView';
import { NexasLogo } from './components/NexasLogo';
import { ProfileSubViews } from './components/ProfileSubViews';
import { ProfileSubViewType, ProfileView } from './components/ProfileView';
import { ProductsView } from './components/ProductsView';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TeamView } from './components/TeamView';
import { TelegramModal } from './components/TelegramModal';
import { TrainingGuidelineModal } from './components/TrainingGuidelineModal';
import { WithdrawView } from './components/WithdrawView';
import { DEFAULT_BANNERS, DEFAULT_PLANS, DEFAULT_SETTINGS } from './data/plans';
import {
  subscribePublicBanners,
  subscribePublicPlans,
  subscribePublicSettings,
  testFirestoreConnection,
} from './firebase';
import {
  BannerSlide,
  DepositRecord,
  GlobalSettings,
  LiveFeedItem,
  PaymentMethod,
  Plan,
  TeamSummary,
  TransactionRecord,
  User,
  UserPlan,
  WithdrawRecord,
} from './types';

type MainTab = 'home' | 'products' | 'team' | 'profile';
type OverlayRoute =
  | { type: 'none' }
  | { type: 'deposit' }
  | { type: 'gopay'; amount: number; method: PaymentMethod }
  | { type: 'withdraw' }
  | { type: 'profile_sub'; subView: ProfileSubViewType };

const EMPTY_TEAM: TeamSummary = {
  level1: { count: 0, earnings: 0, rate: 20 },
  level2: { count: 0, earnings: 0, rate: 3 },
  level3: { count: 0, earnings: 0, rate: 2 },
  totalValidUsers: 0,
  totalEarnings: 0,
};

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash.startsWith('#/admin')
  );
}

function getRefFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const searchRef = new URLSearchParams(window.location.search).get('ref');
  if (searchRef) return searchRef.trim();
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx !== -1) {
    const hashRef = new URLSearchParams(hash.slice(idx)).get('ref');
    if (hashRef) return hashRef.trim();
  }
  return '';
}

export default function App() {
  const [adminMode, setAdminMode] = useState<boolean>(isAdminRoute);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [team, setTeam] = useState<TeamSummary>(EMPTY_TEAM);

  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [banners, setBanners] = useState<BannerSlide[]>(DEFAULT_BANNERS);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);

  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [overlay, setOverlay] = useState<OverlayRoute>({ type: 'none' });
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramTitle, setTelegramTitle] = useState<string | undefined>(undefined);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  // Referral query param -> direct registration mode
  const refFromUrl = getRefFromLocation();

  const firestoreSettingsTimeRef = useRef<number>(0);
  const firestorePlansTimeRef = useRef<number>(0);
  const firestoreBannersTimeRef = useRef<number>(0);

  const showToast = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3800);
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      const serverTs = data.settings.updatedAt ? new Date(data.settings.updatedAt).getTime() : 0;

      if (firestoreSettingsTimeRef.current === 0 || serverTs > firestoreSettingsTimeRef.current) {
        setSettings(data.settings);
      }
      if (firestorePlansTimeRef.current === 0 || serverTs > firestorePlansTimeRef.current) {
        setPlans(data.plans);
      }
      if (firestoreBannersTimeRef.current === 0 || serverTs > firestoreBannersTimeRef.current) {
        setBanners(data.banners);
      }
      setLiveFeed(data.liveFeed);
    } catch {
      // Keep defaults
    }
  }, []);

  const loadMe = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      setUser(null);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me.user);
      setUserPlans(me.userPlans);
      setDeposits(me.deposits);
      setWithdrawals(me.withdrawals);
      setTransactions(me.transactions);
      setTeam(me.team);
    } catch {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  // Initial load + URL popstate listener
  useEffect(() => {
    const init = async () => {
      await loadBootstrap();
      if (getStoredToken()) {
        await loadMe();
      }
      setBootLoading(false);
    };
    init();

    // Test Firestore connection at boot
    testFirestoreConnection();

    const onPopState = () => setAdminMode(isAdminRoute());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, [loadBootstrap, loadMe]);

  // Real-Time Updates: SSE (/api/events) + Firestore onSnapshot + Focus/Visibility + 5s Fallback Sync
  useEffect(() => {
    const syncNow = () => {
      loadBootstrap();
      if (getStoredToken()) {
        loadMe();
      }
    };

    let sseConnectedOnce = false;
    let sseErrors = 0;
    const es = new EventSource('/api/events');
    es.addEventListener('sync', () => {
      sseConnectedOnce = true;
      sseErrors = 0;
      syncNow();
    });
    es.onerror = () => {
      sseErrors += 1;
      if (!sseConnectedOnce && sseErrors >= 2) {
        es.close();
      }
    };

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
    };
    window.addEventListener('focus', syncNow);
    window.addEventListener('storage', syncNow);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    const pollTimer = setInterval(() => {
      if (!adminMode && document.visibilityState === 'visible') {
        syncNow();
      }
    }, 5000);

    const unsubSettings = subscribePublicSettings((s, updatedMs) => {
      firestoreSettingsTimeRef.current = updatedMs || Date.now();
      setSettings(s);
      syncCloudToFallbackEngine({ settings: s });
    });
    const unsubPlans = subscribePublicPlans((p, latestMs) => {
      if (p.length > 0) {
        firestorePlansTimeRef.current = latestMs || Date.now();
        setPlans(p);
        syncCloudToFallbackEngine({ plans: p });
      }
    });
    const unsubBanners = subscribePublicBanners((b, latestMs) => {
      if (b.length > 0) {
        firestoreBannersTimeRef.current = latestMs || Date.now();
        setBanners(b);
        syncCloudToFallbackEngine({ banners: b });
      }
    });

    return () => {
      es.close();
      clearInterval(pollTimer);
      window.removeEventListener('focus', syncNow);
      window.removeEventListener('storage', syncNow);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      unsubSettings();
      unsubPlans();
      unsubBanners();
    };
  }, [adminMode, loadBootstrap, loadMe]);

  const handleAuthenticated = async (
    newToken: string,
    authedUser: User,
    isNewRegistration: boolean
  ) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(authedUser);
    await loadMe();

    if (refFromUrl && typeof window !== 'undefined') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    setTelegramTitle(
      isNewRegistration
        ? 'নিবন্ধন সফল! বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন'
        : 'স্বাগতম! বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন'
    );
    setTelegramOpen(true);
  };

  const handleLogout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setOverlay({ type: 'none' });
    setMainTab('home');
  };

  const handleBuyPlan = async (plan: Plan) => {
    if (!user) return;
    setBuyingPlanId(plan.id);
    try {
      const res = await api.buyPlan(plan.id);
      setUser(res.user);
      await loadMe();
      showToast(res.message, 'ok');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'প্ল্যান কেনা যায়নি।', 'err');
    } finally {
      setBuyingPlanId(null);
    }
  };

  // Dedicated Secret Admin Route (/admin or #/admin)
  if (adminMode) {
    return (
      <AdminPanelView
        onExitAdmin={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setAdminMode(false);
          loadBootstrap();
          if (getStoredToken()) loadMe();
        }}
        onGlobalUpdated={() => {
          loadBootstrap();
          if (getStoredToken()) loadMe();
        }}
      />
    );
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center gap-4">
        <NexasLogo size="lg" showTagline />
        <div className="text-xs text-slate-400">লোড হচ্ছে...</div>
      </div>
    );
  }

  // Auth Gate (Full Screen with Support Icon Modal)
  if (!token || !user) {
    return (
      <>
        <AuthView
          initialMode={refFromUrl ? 'register' : 'login'}
          initialReferralCode={refFromUrl}
          settings={settings}
          onOpenSupport={() => {
            setTelegramTitle('বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন');
            setTelegramOpen(true);
          }}
          onAuthenticated={handleAuthenticated}
        />
        <TelegramModal
          open={telegramOpen}
          onClose={() => setTelegramOpen(false)}
          settings={settings}
          contextTitle={telegramTitle}
        />
      </>
    );
  }

  // Fullscreen Overlay Views (Deposit, GoPay Checkout, Withdraw, Profile Sub-views)
  if (overlay.type === 'deposit') {
    return (
      <>
        <DepositView
          settings={settings}
          onBack={() => setOverlay({ type: 'none' })}
          onProceedToGoPay={(amount, method) => setOverlay({ type: 'gopay', amount, method })}
          onProofSubmitted={(msg) => {
            showToast(msg, 'ok');
            loadMe();
            setOverlay({ type: 'none' });
          }}
        />
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xl ${
              toast.kind === 'ok'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {toast.text}
          </div>
        )}
      </>
    );
  }

  if (overlay.type === 'gopay') {
    return (
      <GoPayCheckoutView
        amount={overlay.amount}
        method={overlay.method}
        settings={settings}
        userBalance={user.rechargeBalance + user.withdrawalBalance}
        onBack={() => setOverlay({ type: 'deposit' })}
        onGoHome={() => {
          setOverlay({ type: 'none' });
          setMainTab('home');
        }}
        onSuccess={(updatedUser) => {
          setUser(updatedUser);
          loadMe();
        }}
      />
    );
  }

  if (overlay.type === 'withdraw') {
    return (
      <WithdrawView
        user={user}
        userPlans={userPlans}
        withdrawals={withdrawals}
        settings={settings}
        onBack={() => setOverlay({ type: 'none' })}
        onGoSetupCard={() =>
          setOverlay({ type: 'profile_sub', subView: 'withdrawal_account' })
        }
        onGoRecharge={() => setOverlay({ type: 'deposit' })}
        onGoHome={() => {
          setOverlay({ type: 'none' });
          setMainTab('home');
        }}
        onWithdrawCreated={(msg, updatedUser) => {
          setUser(updatedUser);
          loadMe();
          showToast(msg, 'ok');
        }}
      />
    );
  }

  if (overlay.type === 'profile_sub') {
    return (
      <ProfileSubViews
        subView={overlay.subView}
        user={user}
        team={team}
        transactions={transactions}
        deposits={deposits}
        withdrawals={withdrawals}
        onBack={() => setOverlay({ type: 'none' })}
        onUserUpdated={(updatedUser, toastMsg) => {
          setUser(updatedUser);
          loadMe();
          if (toastMsg) showToast(toastMsg, 'ok');
        }}
      />
    );
  }

  // Main App Shell with Bottom 4-Tab Nav (No top balance header bar)
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0b0e14] text-slate-100 pb-20">
        {/* Toast Feedback */}
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] text-center px-4 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-2xl ${
              toast.kind === 'ok'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Main Content Container */}
        <main className="max-w-5xl mx-auto px-4 pt-3.5">
          <AnimatePresence mode="wait">
            {mainTab === 'home' && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <HomeView
                  banners={banners}
                  plans={plans}
                  accountBalance={user.rechargeBalance}
                  withdrawalBalance={user.withdrawalBalance}
                  liveFeed={liveFeed}
                  buyingPlanId={buyingPlanId}
                  onRecharge={() => setOverlay({ type: 'deposit' })}
                  onWithdraw={() => setOverlay({ type: 'withdraw' })}
                  onSupport={() => {
                    setTelegramTitle('বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন');
                    setTelegramOpen(true);
                  }}
                  onOpenTraining={() => setTrainingOpen(true)}
                  onBuyPlan={handleBuyPlan}
                />
              </motion.div>
            )}

            {mainTab === 'products' && (
              <motion.div
                key="tab-products"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductsView
                  userPlans={userPlans}
                  onGoHome={() => setMainTab('home')}
                  onRefreshDuePayouts={loadMe}
                />
              </motion.div>
            )}

            {mainTab === 'team' && (
              <motion.div
                key="tab-team"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <TeamView user={user} team={team} settings={settings} />
              </motion.div>
            )}

            {mainTab === 'profile' && (
              <motion.div
                key="tab-profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProfileView
                  user={user}
                  onRecharge={() => setOverlay({ type: 'deposit' })}
                  onWithdraw={() => setOverlay({ type: 'withdraw' })}
                  onOpenSubView={(subView) => setOverlay({ type: 'profile_sub', subView })}
                  onSupport={() => {
                    setTelegramTitle('বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন');
                    setTelegramOpen(true);
                  }}
                  onOpenTraining={() => setTrainingOpen(true)}
                  onLogout={handleLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Fixed 4-Tab Bottom Navigation Bar matching screenshot */}
        <motion.nav
          aria-label="প্রধান নেভিগেশন"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#121722]/95 backdrop-blur-md border-t border-slate-800"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-4 h-16">
            {(
              [
                { id: 'home', label: 'হোম', icon: Home },
                { id: 'products', label: 'আমার পণ্য', icon: Package },
                { id: 'team', label: 'আমার টিম', icon: Users },
                { id: 'profile', label: 'প্রোফাইল', icon: UserIcon },
              ] as const
            ).map((item, idx) => {
              const Icon = item.icon;
              const active = mainTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setMainTab(item.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.05 + idx * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active-bar"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400"
                    />
                  )}
                  <motion.span
                    animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center justify-center"
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
                  </motion.span>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.nav>

        {/* Support Center Telegram Notification Modal (Group + Channel Links) */}
        <TelegramModal
          open={telegramOpen}
          onClose={() => setTelegramOpen(false)}
          settings={settings}
          contextTitle={telegramTitle}
        />

        {/* Training Guidline Modal */}
        <TrainingGuidelineModal
          open={trainingOpen}
          onClose={() => setTrainingOpen(false)}
          settings={settings}
        />

        {/* Offline PWA Status Indicator */}
        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}

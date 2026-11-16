import React, { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BannerSlide, LiveFeedItem, Plan } from '../types';
import { formatBDT, formatNumberEN } from '../utils/format';

const CARD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface HomeViewProps {
  banners: BannerSlide[];
  plans: Plan[];
  accountBalance?: number;
  withdrawalBalance?: number;
  liveFeed: LiveFeedItem[];
  buyingPlanId: string | null;
  onRecharge: () => void;
  onWithdraw: () => void;
  onSupport: () => void;
  onOpenTraining: () => void;
  onBuyPlan: (plan: Plan) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  banners,
  plans,
  accountBalance = 0,
  withdrawalBalance = 0,
  liveFeed,
  buyingPlanId,
  onRecharge,
  onWithdraw,
  onSupport,
  onOpenTraining,
  onBuyPlan,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const safeBanners = banners.length > 0 ? banners : [];

  useEffect(() => {
    if (safeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % safeBanners.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [safeBanners.length]);

  useEffect(() => {
    if (activeSlide >= safeBanners.length && safeBanners.length > 0) {
      setActiveSlide(0);
    }
  }, [activeSlide, safeBanners.length]);

  const currentBanner = safeBanners[activeSlide];
  const doubledFeed = [...liveFeed, ...liveFeed];

  return (
    <div className="space-y-5 pb-6">
      {/* 10-Slide Promotional Image Banner Carousel */}
      {currentBanner && (
        <motion.section
          aria-label="প্রচারমূলক ব্যানার"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: CARD_EASE }}
          className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#121722]"
        >
          <div className="relative aspect-[2/1] max-h-[360px] w-full bg-[#141c29]">
            <motion.img
              key={currentBanner.id}
              src={currentBanner.imageUrl}
              alt={currentBanner.title || `ব্যানার ${activeSlide + 1}`}
              referrerPolicy="no-referrer"
              initial={{ opacity: 0.35, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: CARD_EASE }}
              className="w-full h-full object-contain"
            />

            {/* Prev / Next Controls */}
            {safeBanners.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="আগের ব্যানার"
                  onClick={() =>
                    setActiveSlide((prev) => (prev - 1 + safeBanners.length) % safeBanners.length)
                  }
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="পরের ব্যানার"
                  onClick={() => setActiveSlide((prev) => (prev + 1) % safeBanners.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Slide Dots */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
              {safeBanners.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`ব্যানার ${idx + 1}`}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeSlide ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Clear Account Balance Card directly below Banner */}
      <motion.section
        aria-label="অ্যাকাউন্ট ব্যালেন্স"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.05, ease: CARD_EASE }}
        className="rounded-2xl bg-[#161b26] border border-emerald-500/30 px-4 py-3.5 flex items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium">অ্যাকাউন্ট ব্যালেন্স</div>
            <div className="text-lg sm:text-xl font-num font-extrabold text-emerald-400 leading-tight mt-0.5">
              {formatBDT(accountBalance)}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 pl-3 border-l border-slate-800">
          <div className="text-[11px] text-slate-400">উত্তোলন ব্যালেন্স</div>
          <div className="text-sm font-num font-bold text-amber-400 mt-0.5">
            {formatBDT(withdrawalBalance)}
          </div>
        </div>
      </motion.section>

      {/* Training Guidline Icon Card directly below Account Balance */}
      <motion.button
        type="button"
        onClick={onOpenTraining}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.32, delay: 0.09, ease: CARD_EASE }}
        className="w-full rounded-2xl bg-[#161b26] hover:bg-[#1c2331] border border-slate-800/90 px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#202736] flex items-center justify-center text-violet-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-num font-bold text-white">Training Guidline</div>
            <div className="text-[11px] text-slate-400 truncate">
              Modern Platform · Secure &amp; Scalable · Built for the Future
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </motion.button>

      {/* 3 Quick Action Cards matching original single-row layout */}
      <section className="grid grid-cols-3 gap-3">
        <motion.button
          type="button"
          onClick={onRecharge}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.3, delay: 0.13, ease: CARD_EASE }}
          className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl bg-[#161b26] hover:bg-[#1c2331] border border-slate-800/90 transition-colors cursor-pointer min-h-[96px]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#202736] flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-nowrap">
            রিচার্জ
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={onWithdraw}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.3, delay: 0.17, ease: CARD_EASE }}
          className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl bg-[#161b26] hover:bg-[#1c2331] border border-slate-800/90 transition-colors cursor-pointer min-h-[96px]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#202736] flex items-center justify-center text-amber-400">
            <Banknote className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-nowrap">
            উত্তোলন
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={onSupport}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.3, delay: 0.21, ease: CARD_EASE }}
          className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl bg-[#161b26] hover:bg-[#1c2331] border border-slate-800/90 transition-colors cursor-pointer min-h-[96px]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#202736] flex items-center justify-center text-sky-400">
            <Headphones className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-nowrap">
            কাস্টমার সার্ভিস
          </span>
        </motion.button>
      </section>

      {/* VIP Investment Plans Grid (2 cols mobile, 3 cols desktop) */}
      <section aria-label="ভিআইপি ইনভেস্টমেন্ট প্ল্যান">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          {plans.map((plan, idx) => {
            const isBuying = buyingPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{
                  duration: 0.32,
                  delay: 0.18 + Math.min(idx, 6) * 0.045,
                  ease: CARD_EASE,
                }}
                className="rounded-2xl bg-white text-slate-900 p-3.5 sm:p-4 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="text-center mb-2.5">
                    <h3 className="text-base sm:text-lg font-num font-extrabold text-slate-900">
                      {plan.name}
                    </h3>
                  </div>

                  {/* Square Product Image */}
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-900 mb-3">
                    <img
                      src={plan.imageUrl}
                      alt={plan.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Plan Specs */}
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="text-slate-600">দৈনিক আয়:</span>
                      <span className="font-num font-bold text-rose-600">
                        {formatBDT(plan.dailyIncome)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="text-slate-600">মোট আয়:</span>
                      <span className="font-num font-bold text-rose-600">
                        {formatBDT(plan.totalIncome)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="text-slate-600">মেয়াদ:</span>
                      <span className="font-semibold text-rose-600">
                        <span className="font-num">{formatNumberEN(plan.validityDays)}</span> দিন
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="text-base sm:text-lg font-num font-extrabold text-slate-900 mb-2.5">
                    {formatBDT(plan.price)}
                  </div>
                  <button
                    type="button"
                    disabled={isBuying}
                    onClick={() => onBuyPlan(plan)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1f242f] hover:bg-[#11151d] text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {isBuying ? 'প্রক্রিয়াধীন...' : 'এখনই কিনুন'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Bottom Floating Live Feed (Withdrawals, Income, Deposits moving upward) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.28, ease: CARD_EASE }}
        className="rounded-2xl bg-[#141923] border border-slate-800 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">লাইভ উত্তোলন, ইনকাম ও ডিপোজিট</h3>
          </div>
          <span className="text-xs text-emerald-400 font-medium">রিয়েল-টাইম</span>
        </div>

        <div className="h-56 overflow-hidden relative px-3 py-2">
          <div className="animate-marquee-up space-y-2">
            {doubledFeed.map((item, idx) => {
              const isWithdraw = item.type === 'withdraw';
              const isDeposit = item.type === 'deposit';
              return (
                <div
                  key={`${item.id}_${idx}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#1a202d] border border-slate-800/70"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isWithdraw
                          ? 'bg-amber-500/15 text-amber-400'
                          : isDeposit
                          ? 'bg-sky-500/15 text-sky-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {isWithdraw ? (
                        <ArrowUpCircle className="w-4 h-4" />
                      ) : isDeposit ? (
                        <ArrowDownCircle className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-num font-semibold text-slate-200 truncate">
                        {item.phone}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.label}
                        {item.method ? ` · ${item.method}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs sm:text-sm font-num font-bold ${
                        isWithdraw
                          ? 'text-amber-400'
                          : isDeposit
                          ? 'text-sky-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formatBDT(item.amount)}
                    </div>
                    <div className="text-[10px] text-slate-500">{item.timeText}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
    </div>
  );
};

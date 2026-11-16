import React, { useEffect, useState } from 'react';
import { Clock, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react';
import { UserPlan } from '../types';
import { formatBDT, formatCountdown, formatNumberEN } from '../utils/format';

interface ProductsViewProps {
  userPlans: UserPlan[];
  onGoHome: () => void;
  onRefreshDuePayouts: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  userPlans,
  onGoHome,
  onRefreshDuePayouts,
}) => {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      const hasDue = userPlans.some(
        (p) => p.status === 'active' && new Date(p.nextPayoutAt).getTime() <= nextNow
      );
      if (hasDue) {
        onRefreshDuePayouts();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [userPlans, onRefreshDuePayouts]);

  const activeCount = userPlans.filter((p) => p.status === 'active').length;
  const totalDaily = userPlans
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + p.dailyIncome, 0);
  const totalEarned = userPlans.reduce((s, p) => s + p.totalEarned, 0);

  return (
    <div className="space-y-5 pb-6">
      {/* Top Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-3.5 text-center">
          <div className="text-xs text-slate-400">সক্রিয় পণ্য</div>
          <div className="text-lg sm:text-xl font-num font-bold text-white mt-1">
            {formatNumberEN(activeCount)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-3.5 text-center">
          <div className="text-xs text-slate-400">দৈনিক আয়</div>
          <div className="text-lg sm:text-xl font-num font-bold text-emerald-400 mt-1">
            {formatBDT(totalDaily)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-3.5 text-center">
          <div className="text-xs text-slate-400">মোট অর্জিত</div>
          <div className="text-lg sm:text-xl font-num font-bold text-amber-400 mt-1">
            {formatBDT(totalEarned)}
          </div>
        </div>
      </div>

      {userPlans.length === 0 ? (
        <div className="rounded-2xl bg-[#141923] border border-slate-800 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1e2534] text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">আপনার কোনো সক্রিয় প্ল্যান নেই</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              যেকোনো VIP প্ল্যান কিনলে প্রতি 24 ঘণ্টা পরপর স্বয়ংক্রিয়ভাবে দৈনিক আয় আপনার উত্তোলন ব্যালেন্সে যোগ হবে।
            </p>
          </div>
          <button
            type="button"
            onClick={onGoHome}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            প্ল্যানগুলো দেখুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userPlans.map((up) => {
            const progressPct = Math.min(
              100,
              Math.round((up.daysCredited / Math.max(1, up.validityDays)) * 100)
            );
            const countdown =
              up.status === 'active' ? formatCountdown(up.nextPayoutAt, nowMs) : 'সম্পন্ন';

            return (
              <div
                key={up.id}
                className="rounded-2xl bg-[#161b26] border border-slate-800 p-4 space-y-3.5 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700/60">
                    <img
                      src={up.imageUrl}
                      alt={up.planName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-num font-extrabold text-white truncate">
                        {up.planName}
                      </h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                          up.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        {up.status === 'active' ? 'সক্রিয়' : 'সম্পন্ন'}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">দৈনিক আয়: </span>
                        <span className="font-num font-bold text-emerald-400">
                          {formatBDT(up.dailyIncome)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">অর্জিত: </span>
                        <span className="font-num font-bold text-amber-400">
                          {formatBDT(up.totalEarned)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">মূল্য: </span>
                        <span className="font-num font-semibold text-slate-200">
                          {formatBDT(up.price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">দিন: </span>
                        <span className="font-num font-semibold text-slate-200">
                          {formatNumberEN(up.daysCredited)} / {formatNumberEN(up.validityDays)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 24-Hour Reminder Timer & Progress Bar */}
                <div className="p-3 rounded-xl bg-[#0e131d] border border-amber-500/25">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-medium">
                      ২৪ ঘণ্টার রিমাইন্ডার টাইম
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300 font-mono-num font-bold text-sm">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {up.status === 'active' ? countdown : 'মেয়াদ পূর্ণ'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      অগ্রগতি (<span className="font-num">{formatNumberEN(progressPct)}%</span>)
                    </span>
                    <span className="font-num">
                      {formatNumberEN(up.daysCredited)} / {formatNumberEN(up.validityDays)} দিন সম্পন্ন
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>প্রতি 24 ঘণ্টা পরপর অটোমেটিক উত্তোলন ব্যালেন্সে যোগ হয়</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

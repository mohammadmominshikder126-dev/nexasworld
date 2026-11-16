import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { BKASH_LOGO, NAGAD_LOGO } from '../data/plans';
import { GlobalSettings, User, UserPlan, WithdrawRecord } from '../types';
import { formatBDT, formatDateTime, formatNumberEN } from '../utils/format';

interface WithdrawViewProps {
  user: User;
  userPlans: UserPlan[];
  withdrawals: WithdrawRecord[];
  settings: GlobalSettings;
  onBack: () => void;
  onGoSetupCard: () => void;
  onGoRecharge: () => void;
  onGoHome: () => void;
  onWithdrawCreated: (message: string, updatedUser: User, wd: WithdrawRecord) => void;
}

export const WithdrawView: React.FC<WithdrawViewProps> = ({
  user,
  userPlans,
  withdrawals,
  settings,
  onBack,
  onGoSetupCard,
  onGoRecharge,
  onGoHome,
  onWithdrawCreated,
}) => {
  const minW = Math.max(1, settings.minWithdraw || 200);
  const [amount, setAmount] = useState(String(minW));
  const [amountTouched, setAmountTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!amountTouched) {
      setAmount(String(minW));
    }
  }, [minW, amountTouched]);

  const hasBankCard = Boolean(user.bankCard);
  const hasActivePackage = user.hasRecharged && userPlans.length > 0;
  const canWithdraw = hasBankCard && hasActivePackage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num < minW) {
      setError(`সর্বনিম্ন উত্তোলন ${formatNumberEN(minW)} টাকা।`);
      return;
    }
    setLoading(true);
    try {
      const res = await api.withdraw(num);
      onWithdrawCreated(res.message, res.user, res.withdrawal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'উত্তোলন অনুরোধ ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 pb-10">
      <header className="sticky top-0 z-30 bg-[#121722]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="ফিরে যান"
          className="w-9 h-9 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold">টাকা উত্তোলন</h1>
        <div className="w-9" />
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {/* Available Withdrawal Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1a2234] to-[#121722] border border-slate-800 p-5 text-center">
          <div className="text-xs text-slate-400">উত্তোলনযোগ্য ব্যালেন্স</div>
          <div className="text-3xl font-num font-extrabold text-emerald-400 mt-1">
            {formatBDT(user.withdrawalBalance)}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            সর্বনিম্ন উত্তোলন: <span className="font-num font-bold text-white">{formatBDT(minW)}</span>
          </div>
        </div>

        {/* Bank Card Check */}
        {!hasBankCard ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-300">ব্যাংক কার্ড সেটআপ প্রয়োজন</h3>
                <p className="text-xs text-slate-300 mt-1">
                  উত্তোলন করতে হলে অবশ্যই আপনার বিকাশ অথবা নগদ ব্যাংক কার্ড সেটআপ করতে হবে।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoSetupCard}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
            >
              এখনই ব্যাংক কার্ড সেটআপ করুন
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-10 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={user.bankCard!.method === 'bkash' ? BKASH_LOGO : NAGAD_LOGO}
                  alt={user.bankCard!.method}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {user.bankCard!.method === 'bkash' ? 'বিকাশ' : 'নগদ'} ·{' '}
                  <span className="font-num">{user.bankCard!.accountNumber}</span>
                </div>
                <div className="text-xs text-slate-400">{user.bankCard!.accountName}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoSetupCard}
              className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
            >
              পরিবর্তন
            </button>
          </div>
        )}

        {/* Active Package Check */}
        {!hasActivePackage && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-300">প্যাকেজ অ্যাক্টিভ করা আবশ্যক</h3>
                <p className="text-xs text-slate-300 mt-1">
                  রিচার্জ সম্পন্ন করে কমপক্ষে একটি VIP প্যাকেজ অ্যাক্টিভ না করা পর্যন্ত টাকা উত্তোলন দেওয়া যাবে না।
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onGoRecharge}
                className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                রিচার্জ করুন
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                প্যাকেজ কিনুন
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-[#161b26] border border-slate-800 p-4 sm:p-5 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              উত্তোলনের পরিমাণ (৳)
            </label>
            <input
              type="number"
              min={minW}
              required
              disabled={!canWithdraw}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountTouched(true);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-base font-num font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!canWithdraw || loading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'অনুরোধ পাঠানো হচ্ছে...' : 'উত্তোলন নিশ্চিত করুন'}
          </button>
        </form>

        {/* Recent Withdrawal Records with Yellow / Green / Red Status Colors */}
        <div className="rounded-2xl bg-[#161b26] border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">সাম্প্রতিক উত্তোলন তালিকা</h3>
            <span className="text-xs text-slate-400 font-num">{withdrawals.length} টি</span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              এখনো কোনো উত্তোলন রেকর্ড নেই।
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {withdrawals.map((w) => {
                const statusBadge =
                  w.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদিত
                    </span>
                  ) : w.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/35">
                      <XCircle className="w-3.5 h-3.5" /> ব্যর্থ (রিফান্ড)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/35">
                      <Clock className="w-3.5 h-3.5" /> অপেক্ষমান
                    </span>
                  );

                return (
                  <div key={w.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-num font-bold text-white">
                        {formatBDT(w.amount)} · {w.method === 'bkash' ? 'বিকাশ' : 'নগদ'}
                      </div>
                      <div className="text-xs text-slate-400 font-num mt-0.5">
                        {w.accountNumber} · {formatDateTime(w.createdAt)}
                      </div>
                    </div>
                    {statusBadge}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

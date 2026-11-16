import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Gift,
  Star,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { BKASH_LOGO, DAILY_SALARY_TIERS, NAGAD_LOGO } from '../data/plans';
import {
  DepositRecord,
  PaymentMethod,
  TeamSummary,
  TransactionRecord,
  User,
  WithdrawRecord,
} from '../types';
import { formatBDT, formatDateTime, formatNumberEN } from '../utils/format';
import { ProfileSubViewType } from './ProfileView';

interface ProfileSubViewsProps {
  subView: ProfileSubViewType;
  user: User;
  team: TeamSummary;
  transactions: TransactionRecord[];
  deposits: DepositRecord[];
  withdrawals: WithdrawRecord[];
  onBack: () => void;
  onUserUpdated: (user: User, toastMsg?: string) => void;
}

export const ProfileSubViews: React.FC<ProfileSubViewsProps> = ({
  subView,
  user,
  team,
  transactions,
  deposits,
  withdrawals,
  onBack,
  onUserUpdated,
}) => {
  // Gift Code State
  const [giftCode, setGiftCode] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftMsg, setGiftMsg] = useState('');
  const [giftErr, setGiftErr] = useState('');

  // Daily Salary State
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  const [salaryErr, setSalaryErr] = useState('');

  // Bank Card State
  const [cardMethod, setCardMethod] = useState<PaymentMethod>(user.bankCard?.method || 'bkash');
  const [accountName, setAccountName] = useState(user.bankCard?.accountName || '');
  const [accountNumber, setAccountNumber] = useState(user.bankCard?.accountNumber || '');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardErr, setCardErr] = useState('');

  const titles: Record<ProfileSubViewType, string> = {
    daily_salary: 'দৈনিক বেতন প্ল্যান',
    gift_code: 'গিফট কোড',
    account_details: 'অ্যাকাউন্টের বিবরণ',
    payment_record: 'পেমেন্ট রেকর্ড',
    withdrawal_record: 'উত্তোলন রেকর্ড',
    withdrawal_account: 'উত্তোলন অ্যাকাউন্ট (ব্যাংক কার্ড)',
  };

  const handleRedeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftErr('');
    setGiftMsg('');
    setGiftLoading(true);
    try {
      const res = await api.redeemGiftCode(giftCode);
      setGiftCode('');
      setGiftMsg(res.message);
      onUserUpdated(res.user, res.message);
    } catch (err) {
      setGiftErr(err instanceof Error ? err.message : 'গিফট কোড রিডিম করা যায়নি।');
    } finally {
      setGiftLoading(false);
    }
  };

  const handleClaimSalary = async (level: number) => {
    setSalaryErr('');
    setClaimingLevel(level);
    try {
      const res = await api.claimDailySalary(level);
      onUserUpdated(res.user, res.message);
    } catch (err) {
      setSalaryErr(err instanceof Error ? err.message : 'বেতন সংগ্রহ করা যায়নি।');
    } finally {
      setClaimingLevel(null);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardErr('');
    setCardLoading(true);
    try {
      const res = await api.saveBankCard({
        method: cardMethod,
        accountName,
        accountNumber,
      });
      onUserUpdated(res.user, res.message);
      onBack();
    } catch (err) {
      setCardErr(err instanceof Error ? err.message : 'ব্যাংক কার্ড সেভ করা যায়নি।');
    } finally {
      setCardLoading(false);
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
        <h1 className="text-base font-bold">{titles[subView]}</h1>
        <div className="w-9" />
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {/* Daily Salary */}
        {subView === 'daily_salary' && (
          <div className="space-y-3.5">
            <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">আপনার সক্রিয় লেভেল 1 সদস্য</div>
                <div className="text-2xl font-num font-extrabold text-amber-400 mt-0.5">
                  {formatNumberEN(team.level1.count)} জন
                </div>
              </div>
              <Star className="w-9 h-9 text-amber-400 fill-amber-400/20" />
            </div>

            {salaryErr && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {salaryErr}
              </div>
            )}

            {DAILY_SALARY_TIERS.map((tier) => {
              const claimed = user.claimedSalaryLevels.includes(tier.level);
              const eligible = team.level1.count >= tier.requiredValid;
              return (
                <div
                  key={tier.level}
                  className="rounded-2xl bg-[#161b26] border border-slate-800 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{tier.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      পুরস্কার:{' '}
                      <span className="font-num font-bold text-emerald-400">
                        {formatBDT(tier.reward)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={claimed || !eligible || claimingLevel === tier.level}
                    onClick={() => handleClaimSalary(tier.level)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      claimed
                        ? 'bg-slate-800 text-slate-400'
                        : eligible
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {claimed
                      ? 'সংগ্রহিত'
                      : claimingLevel === tier.level
                      ? 'অপেক্ষা...'
                      : eligible
                      ? 'সংগ্রহ করুন'
                      : `আরও ${formatNumberEN(Math.max(0, tier.requiredValid - team.level1.count))} জন`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Gift Code */}
        {subView === 'gift_code' && (
          <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">গিফট কোড রিডিম করুন</h2>
                <p className="text-xs text-slate-400">
                  অফিশিয়াল টেলিগ্রাম চ্যানেল থেকে প্রাপ্ত কোড এখানে লিখুন
                </p>
              </div>
            </div>

            {giftErr && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {giftErr}
              </div>
            )}
            {giftMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                {giftMsg}
              </div>
            )}

            <form onSubmit={handleRedeemGift} className="space-y-3">
              <input
                type="text"
                required
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                placeholder="যেমন: NEXAS10"
                className="w-full px-4 py-3 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-mono-num uppercase focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={giftLoading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                {giftLoading ? 'যাচাই হচ্ছে...' : 'বোনাস সংগ্রহ করুন'}
              </button>
            </form>
          </div>
        )}

        {/* Account Details / Transactions */}
        {subView === 'account_details' && (
          <div className="rounded-2xl bg-[#161b26] border border-slate-800 divide-y divide-slate-800 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">কোনো লেনদেন নেই।</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{tx.title}</div>
                    <div className="text-xs text-slate-400 font-num mt-0.5">
                      {formatDateTime(tx.createdAt)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-num font-bold shrink-0 ${
                      tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatBDT(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Payment / Deposit Record */}
        {subView === 'payment_record' && (
          <div className="rounded-2xl bg-[#161b26] border border-slate-800 divide-y divide-slate-800 overflow-hidden">
            {deposits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">কোনো পেমেন্ট রেকর্ড নেই।</div>
            ) : (
              deposits.map((dep) => (
                <div key={dep.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">
                      <span className="font-num">{formatBDT(dep.amount)}</span> ·{' '}
                      {dep.method === 'bkash' ? 'বিকাশ' : 'নগদ'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono-num mt-0.5">
                      TrxID: {dep.trxId} · {formatDateTime(dep.createdAt)}
                    </div>
                  </div>
                  {dep.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদিত
                    </span>
                  ) : dep.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/35">
                      <XCircle className="w-3.5 h-3.5" /> ব্যর্থ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/35">
                      <Clock className="w-3.5 h-3.5" /> অপেক্ষমান
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Withdrawal Record (Yellow = Pending, Green = Approved, Red = Failed) */}
        {subView === 'withdrawal_record' && (
          <div className="rounded-2xl bg-[#161b26] border border-slate-800 divide-y divide-slate-800 overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">কোনো উত্তোলন রেকর্ড নেই।</div>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">
                      <span className="font-num">{formatBDT(w.amount)}</span> ·{' '}
                      {w.method === 'bkash' ? 'বিকাশ' : 'নগদ'}
                    </div>
                    <div className="text-xs text-slate-400 font-num mt-0.5">
                      {w.accountNumber} · {formatDateTime(w.createdAt)}
                    </div>
                  </div>
                  {w.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদিত
                    </span>
                  ) : w.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/35">
                      <XCircle className="w-3.5 h-3.5" /> ব্যর্থ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/35">
                      <Clock className="w-3.5 h-3.5" /> অপেক্ষমান
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Withdrawal Account / Bank Card Setup with bKash & Nagad logos */}
        {subView === 'withdrawal_account' && (
          <form
            onSubmit={handleSaveCard}
            className="rounded-2xl bg-[#161b26] border border-slate-800 p-5 space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-white">ব্যাংক কার্ড সেটআপ</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                উত্তোলন করার জন্য আপনার বিকাশ অথবা নগদ ওয়ালেট সেটআপ করুন
              </p>
            </div>

            {cardErr && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {cardErr}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCardMethod('bkash')}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  cardMethod === 'bkash'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-slate-700 bg-[#0e131d]'
                }`}
              >
                <div className="w-16 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={BKASH_LOGO}
                    alt="bKash"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-sm font-bold text-white">বিকাশ (bKash)</span>
              </button>

              <button
                type="button"
                onClick={() => setCardMethod('nagad')}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  cardMethod === 'nagad'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-[#0e131d]'
                }`}
              >
                <div className="w-16 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={NAGAD_LOGO}
                    alt="Nagad"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-sm font-bold text-white">নগদ (Nagad)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                অ্যাকাউন্ট হোল্ডারের নাম
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="আপনার পূর্ণ নাম"
                className="w-full px-4 py-3 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {cardMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} পার্সোনাল নম্বর
              </label>
              <input
                type="tel"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-[#0e131d] border border-slate-700 text-white text-sm font-num font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={cardLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {cardLoading ? 'সেভ হচ্ছে...' : 'ব্যাংক কার্ড সেভ করুন'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

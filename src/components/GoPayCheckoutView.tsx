import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Clock, Copy, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { BKASH_LOGO, NAGAD_LOGO } from '../data/plans';
import { DepositRecord, GlobalSettings, PaymentMethod, User } from '../types';
import { formatBDT, formatNumberEN } from '../utils/format';
import { NexasLogo } from './NexasLogo';

interface GoPayCheckoutViewProps {
  amount: number;
  method: PaymentMethod;
  settings: GlobalSettings;
  userBalance: number;
  onBack: () => void;
  onGoHome: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const GoPayCheckoutView: React.FC<GoPayCheckoutViewProps> = ({
  amount,
  method,
  settings,
  userBalance,
  onBack,
  onGoHome,
  onSuccess,
}) => {
  const orderId = useMemo(
    () => `GP${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 89)}`,
    []
  );
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [copied, setCopied] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedDeposit, setSubmittedDeposit] = useState<DepositRecord | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const isBkash = method === 'bkash';
  const methodLabel = isBkash ? 'বিকাশ (bKash)' : 'নগদ (Nagad)';
  const methodPersonalLabel = isBkash ? 'বিকাশ (bKash Personal)' : 'নগদ (Nagad Personal)';
  const methodLogo = isBkash ? BKASH_LOGO : NAGAD_LOGO;
  const merchantNumber = isBkash
    ? settings.bkashNumber || '01789-083100'
    : settings.nagadNumber || '01812-459200';

  // Authentic bKash App Pink (#E2136E) vs Nagad App Red-Orange (#EC1C24 -> #F7941D)
  const headerGradient = isBkash
    ? 'from-[#E2136E] via-[#D11165] to-[#B00D54]'
    : 'from-[#EC1C24] via-[#F04E23] to-[#F7941D]';
  const accentText = isBkash ? 'text-[#E2136E]' : 'text-[#EC1C24]';
  const accentBorder = isBkash ? 'border-[#E2136E]/30' : 'border-[#F04E23]/30';
  const accentFocus = isBkash ? 'focus:border-[#E2136E]' : 'focus:border-[#EC1C24]';
  const buttonStyle = isBkash
    ? 'bg-[#E2136E] hover:bg-[#c80f60] shadow-[#E2136E]/25'
    : 'bg-gradient-to-r from-[#EC1C24] to-[#F7941D] hover:opacity-95 shadow-[#EC1C24]/25';
  const pageBg = isBkash ? 'bg-[#fdf2f7]' : 'bg-[#fff6f2]';

  const handleCopy = async () => {
    const clean = merchantNumber.replace(/[^0-9+]/g, '') || merchantNumber;
    try {
      await navigator.clipboard.writeText(clean);
    } catch {
      const el = document.createElement('textarea');
      el.value = clean;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.createDeposit({
        amount,
        method,
        trxId,
      });
      setSubmittedDeposit(res.deposit);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'পেমেন্ট নিশ্চিত করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  // Confirmation Receipt Page matching screenshot
  if (submittedDeposit) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] text-slate-900 pb-10">
        {/* Top App Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="rounded-xl bg-[#0e131d] px-3 py-1.5">
              <NexasLogo size="sm" />
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-indigo-700 text-white font-num font-bold text-sm shadow-sm">
              ৳ {formatNumberEN(userBalance)}
            </div>
          </div>
        </header>

        {/* Receipt Card */}
        <div className="max-w-xl mx-auto p-4 sm:p-6">
          <div className="rounded-2xl bg-white shadow-xl border border-slate-200/80 overflow-hidden">
            {/* Green Verification Header */}
            <div className="bg-[#0d7c47] text-white px-5 pt-6 pb-7 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/15 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                পেমেন্ট ভেরিফিকেশন জমা হয়েছে
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1.5">
                GoPay নিরাপদ গেটওয়ে · যাচাই প্রক্রিয়াধীন
              </p>
            </div>

            {/* Amount & Receipt Details */}
            <div className="p-5 sm:p-6 space-y-5">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="text-xs font-medium text-slate-500">জমাকৃত পরিমাণ</div>
                <div className="text-3xl sm:text-4xl font-num font-extrabold text-slate-900 mt-1">
                  ৳ {formatNumberEN(submittedDeposit.amount)}
                </div>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">ইনভয়েস আইডি</span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {submittedDeposit.orderId}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
                  <span className={`font-bold ${accentText}`}>{methodPersonalLabel}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">প্রাপক নম্বর</span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {merchantNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">ট্রানজেকশন আইডি (TrxID)</span>
                  <span className="font-mono-num font-bold text-slate-900 uppercase">
                    {submittedDeposit.trxId}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">বর্তমান অবস্থা</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span>অপেক্ষমান (যাচাই চলছে)</span>
                  </span>
                </div>
              </div>

              {/* Exact User Message Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                আপনার আবেদনটি জমা করা হয়েছে। আপনার সকল তথ্য সঠিক থাকলে ৫ থেকে ১০ মিনিট এর মধ্যে আপনার একাউন্টে জমা হবে।
              </div>

              {/* Bottom Action Buttons */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm sm:text-base transition-colors cursor-pointer"
                >
                  ডিপোজিট পেজে ফিরুন
                </button>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-md transition-opacity cursor-pointer"
                >
                  হোম পেজে যান
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg} text-slate-900 pb-10`}>
      {/* bKash App Pink OR Nagad App Red-Orange Gradient Header */}
      <div className={`bg-gradient-to-r ${headerGradient} text-white px-4 pt-4 pb-10 shadow-md`}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={onBack}
              aria-label="ফিরে যান"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white ${accentText} font-num font-extrabold text-sm shadow`}>
              <span className={`w-5 h-5 rounded-full border-2 ${isBkash ? 'border-[#E2136E]' : 'border-[#EC1C24]'} flex items-center justify-center text-[11px]`}>
                G
              </span>
              <span>GoPay</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 text-white font-mono-num text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>00:{mm}:{ss}</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-white/85 font-num">অর্ডার নম্বর: {orderId}</div>
              <div className="text-3xl sm:text-4xl font-num font-extrabold mt-1">
                {formatBDT(amount)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/85">পেমেন্ট মেথড</div>
              <div className="text-sm sm:text-base font-bold mt-0.5">{methodLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Cards */}
      <div className="max-w-xl mx-auto px-4 -mt-5 space-y-4">
        {/* Selected Gateway Logo Card */}
        <div className={`rounded-2xl bg-white p-4 shadow-sm border ${accentBorder} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-slate-100 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={methodLogo}
                alt={methodLabel}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">নির্বাচিত GoPay গেটওয়ে মাধ্যম</div>
              <div className={`text-sm sm:text-base font-bold ${accentText}`}>{methodLabel}</div>
            </div>
          </div>
          <div className="w-20 h-10 flex items-center justify-end overflow-hidden">
            <img
              src={methodLogo}
              alt={methodLabel}
              referrerPolicy="no-referrer"
              className="h-8 object-contain"
            />
          </div>
        </div>

        {/* Merchant Number & Instructions Card */}
        <div className={`rounded-2xl bg-white p-4 sm:p-5 shadow-sm border ${accentBorder} space-y-4`}>
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-slate-600 font-medium">
              {methodLabel} মার্চেন্ট / পার্সোনাল নম্বর
            </span>
            <span className={`font-bold ${accentText}`}>Send Money করুন</span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xl sm:text-2xl font-mono-num font-extrabold text-slate-900 tracking-wide">
              {merchantNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${buttonStyle}`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>কপি করুন</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <span className="font-num font-bold text-slate-800">1.</span> আপনার {methodLabel} অ্যাপ থেকে উপরের নম্বরে ঠিক{' '}
              <span className="font-num font-bold text-slate-900">{formatBDT(amount)}</span> Send Money করুন।
            </p>
            <p>
              <span className="font-num font-bold text-slate-800">2.</span> টাকা পাঠানোর পর এসএমএস বা অ্যাপ থেকে Transaction ID (TrxID) কপি করুন।
            </p>
            <p>
              <span className="font-num font-bold text-slate-800">3.</span> নিচের বক্সে শুধু ট্রানজেকশন আইডি (TrxID) দিয়ে পেমেন্ট নিশ্চিত করুন। অ্যাডমিন অনুমোদনের পর অ্যাকাউন্ট ব্যালেন্সে টাকা যুক্ত হবে।
            </p>
          </div>
        </div>

        {/* TrxID-Only Submission Form */}
        <form
          onSubmit={handleConfirm}
          className={`rounded-2xl bg-white p-4 sm:p-5 shadow-sm border ${accentBorder} space-y-4`}
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
              ট্রানজেকশন আইডি (Transaction ID / TrxID)
            </label>
            <input
              type="text"
              required
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder={isBkash ? 'যেমন: BKA92X84M1' : 'যেমন: 73N8K91P2'}
              className={`w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white ${accentFocus} text-sm sm:text-base font-mono-num uppercase font-bold focus:outline-none`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${buttonStyle}`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'যাচাই হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

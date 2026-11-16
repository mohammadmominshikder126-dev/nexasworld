import React, { useEffect, useState } from 'react';
import { ArrowLeft, Info, ShieldCheck, Upload, X, Zap } from 'lucide-react';
import { api } from '../api/client';
import { BKASH_LOGO, NAGAD_LOGO } from '../data/plans';
import { GlobalSettings, PaymentMethod } from '../types';
import { formatNumberEN } from '../utils/format';

interface DepositViewProps {
  settings: GlobalSettings;
  onBack: () => void;
  onProceedToGoPay: (amount: number, method: PaymentMethod) => void;
  onProofSubmitted: (msg: string) => void;
}

const PRESET_AMOUNTS = [150, 300, 500, 1000, 2000, 5000, 10000, 25000];

export const DepositView: React.FC<DepositViewProps> = ({
  settings,
  onBack,
  onProceedToGoPay,
  onProofSubmitted,
}) => {
  const minDep = Math.max(1, settings.minDeposit || 150);
  const [amount, setAmount] = useState<string>(String(minDep));
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('bkash');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!amountTouched) {
      setAmount(String(minDep));
    }
  }, [minDep, amountTouched]);

  // Proof Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofTrxId, setProofTrxId] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState('');

  const handlePayNow = () => {
    setError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num < minDep) {
      setError(`সর্বনিম্ন রিচার্জ পরিমাণ ${formatNumberEN(minDep)} টাকা।`);
      return;
    }
    onProceedToGoPay(num, method);
  };

  const handleUploadProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    setProofError('');
    try {
      const res = await api.uploadImage(file);
      setProofImageUrl(res.url);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'ছবি আপলোড করা যায়নি।');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setProofError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num < minDep) {
      setProofError(`সর্বনিম্ন পরিমাণ ${formatNumberEN(minDep)} টাকা।`);
      return;
    }
    setSubmittingProof(true);
    try {
      const res = await api.submitPaymentProof({
        amount: num,
        method,
        trxId: proofTrxId,
        proofNote,
        proofImageUrl,
      });
      setShowProofModal(false);
      setProofTrxId('');
      setProofNote('');
      setProofImageUrl('');
      onProofSubmitted(res.message);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'পেমেন্ট প্রুফ জমা দেওয়া যায়নি।');
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      {/* Top Bar matching screenshot */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="ফিরে যান"
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-slate-900">রিচার্জ পেমেন্ট</h1>
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center">
          <Info className="w-4 h-4" />
        </div>
      </header>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Amount Section */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-sm font-bold text-slate-900">পরিশোধযোগ্য পরিমাণ</span>
            <span className="text-xs text-slate-500">
              (সর্বনিম্ন <span className="font-num font-semibold">{formatNumberEN(minDep)}</span> টাকা)
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 mb-3">
            {PRESET_AMOUNTS.map((val) => {
              const selected = Number(amount) === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(String(val));
                    setAmountTouched(true);
                    setError('');
                  }}
                  className={`py-2.5 rounded-xl text-sm font-num font-bold border transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#0b132b] text-white border-[#0b132b] shadow-md'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {formatNumberEN(val)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center rounded-xl bg-white border border-slate-200 px-4 py-3 shadow-sm focus-within:border-teal-600">
            <span className="text-sm font-semibold text-slate-500 mr-3">টাকা (৳)</span>
            <input
              type="number"
              min={minDep}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountTouched(true);
                setError('');
              }}
              className="w-full text-base font-num font-bold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-rose-600 font-medium mt-1.5">{error}</p>}
        </div>

        {/* Payment Method Section (ONLY bKash & Nagad with official logos, GoPay style) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-900">পেমেন্ট মেথড</span>
            <div className="inline-flex items-center gap-1.5 text-teal-600 font-num font-bold text-sm">
              <span className="w-6 h-6 rounded-full border-2 border-teal-500 flex items-center justify-center text-xs font-extrabold">
                G
              </span>
              <span>GoPay</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* GoPay bKash */}
            <button
              type="button"
              onClick={() => setMethod('bkash')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 transition-all text-left cursor-pointer ${
                method === 'bkash'
                  ? 'border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-20 h-12 rounded-xl border border-slate-100 bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
                  <img
                    src={BKASH_LOGO}
                    alt="bKash"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    <span className="font-num">GoPay</span> · বিকাশ
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">অ্যাডমিন যাচাইয়ের পর ব্যালেন্স যুক্ত হবে</div>
                </div>
              </div>
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  method === 'bkash' ? 'border-cyan-500' : 'border-slate-300'
                }`}
              >
                {method === 'bkash' && <span className="w-3 h-3 rounded-full bg-cyan-500" />}
              </span>
            </button>

            {/* GoPay Nagad */}
            <button
              type="button"
              onClick={() => setMethod('nagad')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 transition-all text-left cursor-pointer ${
                method === 'nagad'
                  ? 'border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-20 h-12 rounded-xl border border-slate-100 bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
                  <img
                    src={NAGAD_LOGO}
                    alt="Nagad"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    <span className="font-num">GoPay</span> · নগদ
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">অ্যাডমিন যাচাইয়ের পর ব্যালেন্স যুক্ত হবে</div>
                </div>
              </div>
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  method === 'nagad' ? 'border-cyan-500' : 'border-slate-300'
                }`}
              >
                {method === 'nagad' && <span className="w-3 h-3 rounded-full bg-cyan-500" />}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons matching screenshot */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handlePayNow}
            className="w-full py-4 rounded-full bg-[#151b26] hover:bg-[#0c1018] text-white font-bold text-base shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>এখনই পে করুন</span>
          </button>

          <button
            type="button"
            onClick={() => setShowProofModal(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1d222e] hover:bg-[#141822] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 text-center cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>আপনার পেমেন্ট অর্ডার ব্যর্থ হলে পেমেন্ট প্রুফ জমা দিতে এখানে ক্লিক করুন</span>
          </button>
        </div>

        {/* Guidelines Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>নিরাপদ GoPay রিচার্জ নির্দেশিকা</span>
          </div>
          <p>
            <span className="font-num font-semibold">1.</span> সর্বনিম্ন রিচার্জ পরিমাণ{' '}
            <span className="font-num font-semibold">{formatNumberEN(minDep)}</span> টাকা। এর কম পরিমাণ ডিপোজিট করা যাবে না।
          </p>
          <p>
            <span className="font-num font-semibold">2.</span> প্রতিটি রিচার্জের সময় GoPay চেকআউট পেজে প্রদর্শিত সর্বশেষ মার্চেন্ট নম্বরে সেন্ড মানি করুন।
          </p>
          <p>
            <span className="font-num font-semibold">3.</span> পেমেন্টের পর ট্রানজেকশন আইডি (TrxID) সঠিকভাবে প্রদান করলে অ্যাডমিন অনুমোদনের পর আপনার অ্যাকাউন্ট ব্যালেন্সে যুক্ত হবে।
          </p>
        </div>
      </div>

      {/* Failed Order Payment Proof Modal */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold">পেমেন্ট প্রুফ জমা দিন</h3>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="p-5 space-y-3.5">
              {proofError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {proofError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রিচার্জের পরিমাণ (৳)
                </label>
                <input
                  type="number"
                  required
                  min={minDep}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-num font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি (TrxID)
                </label>
                <input
                  type="text"
                  required
                  value={proofTrxId}
                  onChange={(e) => setProofTrxId(e.target.value)}
                  placeholder="যেমন: BKA92X84M1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পেমেন্ট স্ক্রিনশট আপলোড (গ্যালারি থেকে)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadProofFile}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold cursor-pointer"
                />
                {uploadingProof && <p className="text-xs text-teal-600 mt-1">আপলোড হচ্ছে...</p>}
                {proofImageUrl && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    স্ক্রিনশট যুক্ত হয়েছে!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="অর্ডার নম্বর বা অতিরিক্ত তথ্য"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submittingProof || uploadingProof}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                {submittingProof ? 'জমা হচ্ছে...' : 'প্রুফ জমা দিন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

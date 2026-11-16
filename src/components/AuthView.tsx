import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Gift, Headphones, Lock, Phone, Sparkles, UserPlus } from 'lucide-react';
import { api } from '../api/client';
import { AUTH_BANNER_IMAGE } from '../data/plans';
import { GlobalSettings, User } from '../types';
import { formatNumberEN } from '../utils/format';
import { NexasLogo } from './NexasLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthViewProps {
  initialMode: 'login' | 'register';
  initialReferralCode?: string;
  settings: GlobalSettings;
  onOpenSupport: () => void;
  onAuthenticated: (token: string, user: User, isNewRegistration: boolean) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode,
  initialReferralCode = '',
  settings,
  onOpenSupport,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialReferralCode) {
      setMode('register');
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।');
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি। উভয় ঘরে একই পাসওয়ার্ড দিন।');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await api.register({
          phone,
          password,
          confirmPassword,
          referralCode,
        });
        onAuthenticated(res.token, res.user, true);
      } else {
        const res = await api.login({ phone, password });
        onAuthenticated(res.token, res.user, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col">
      {/* Clean Top Bar Outside the Banner (Support Icon + Brand) */}
      <header className="w-full bg-[#0d1522] border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <NexasLogo size="sm" />
        <button
          type="button"
          onClick={onOpenSupport}
          aria-label="সাপোর্ট গ্রুপ ও কাস্টমার সাপোর্ট লিংক"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <Headphones className="w-4 h-4 text-emerald-400" />
          <span>সাপোর্ট</span>
        </button>
      </header>

      <div className="flex-1 w-full flex flex-col lg:grid lg:grid-cols-12">
        {/* Banner with ONLY the uploaded image (zero overlaid text) */}
        <div className="w-full lg:col-span-6 bg-[#0d1522] flex items-center justify-center overflow-hidden">
          <img
            src={AUTH_BANNER_IMAGE}
            alt="Nexas World"
            referrerPolicy="no-referrer"
            className="w-full h-56 sm:h-72 lg:h-full object-contain lg:object-cover bg-[#0d1522]"
          />
        </div>

        {/* Full-Screen Form Area */}
        <div className="flex-1 lg:col-span-6 flex flex-col justify-center px-5 py-7 sm:px-10 md:px-16 bg-white">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {mode === 'login' ? 'অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট নিবন্ধন'}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'আপনার +880 মোবাইল নম্বর ও পাসওয়ার্ড দিন'
                    : `নিবন্ধন করলেই সাথে সাথে ৳${formatNumberEN(settings.welcomeBonus)} স্বাগতম বোনাস`}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1 shrink-0">
                <Gift className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-num">৳{formatNumberEN(settings.welcomeBonus)}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  মোবাইল নম্বর (Phone Number)
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white transition-colors overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3.5 py-3.5 bg-slate-100 border-r border-slate-200 text-slate-700 text-sm font-num font-semibold shrink-0">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>+880</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-3.5 bg-transparent text-slate-900 text-sm font-num placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {mode === 'register' ? 'নতুন পাসওয়ার্ড তৈরি করুন (Create Password)' : 'পাসওয়ার্ড (Password)'}
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white transition-colors px-3.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="কমপক্ষে 6 অক্ষরের পাসওয়ার্ড"
                    className="w-full px-3 py-3.5 bg-transparent text-slate-900 text-sm font-num placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="পাসওয়ার্ড দেখুন"
                    className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input (Register mode) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white transition-colors px-3.5">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="আবার একই পাসওয়ার্ড লিখুন"
                      className="w-full px-3 py-3.5 bg-transparent text-slate-900 text-sm font-num placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      aria-label="কনফার্ম পাসওয়ার্ড দেখুন"
                      className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Referral Code Input (Register mode) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    রেফার কোড (ঐচ্ছিক)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white transition-colors px-3.5">
                    <UserPlus className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="আমন্ত্রণ কোড বা রেফার লিংক দিন"
                      className="w-full px-3 py-3.5 bg-transparent text-slate-900 text-sm font-mono-num placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-full bg-[#1a1f29] hover:bg-[#11151d] text-white font-bold text-sm sm:text-base shadow-lg shadow-slate-900/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>অপেক্ষা করুন...</span>
                ) : mode === 'login' ? (
                  <span>লগইন করুন</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>নিবন্ধন করুন (৳{formatNumberEN(settings.welcomeBonus)} বোনাস)</span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center text-sm text-slate-600">
              {mode === 'login' ? (
                <>
                  অ্যাকাউন্ট নেই?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="font-bold text-slate-900 underline underline-offset-4 hover:text-emerald-700 cursor-pointer"
                  >
                    এখনই নিবন্ধন করুন
                  </button>
                </>
              ) : (
                <>
                  ইতিমধ্যেই অ্যাকাউন্ট আছে?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="font-bold text-slate-900 underline underline-offset-4 hover:text-emerald-700 cursor-pointer"
                  >
                    লগইন করুন
                  </button>
                </>
              )}
            </div>

            {/* Direct Support & Mobile App Install Row at Bottom of Auth Screen */}
            <div className="mt-7 pt-5 border-t border-slate-200 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onOpenSupport}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-700 cursor-pointer"
              >
                <Headphones className="w-4 h-4 text-emerald-600" />
                <span>সহায়তার জন্য গ্রুপ লিংক ও কাস্টমার সাপোর্ট লিংক দেখুন</span>
              </button>
              <PWAInstallButton variant="pill" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

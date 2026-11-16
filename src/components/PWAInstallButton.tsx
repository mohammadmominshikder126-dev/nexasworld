import React, { useState } from 'react';
import { ChevronRight, Download, Smartphone, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'menu' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'menu' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) setShowGuide(true);
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>মোবাইল অ্যাপ ইনস্টল করুন</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/15 border border-emerald-500/35 px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">NexasWorld মোবাইল অ্যাপ</div>
              <div className="text-xs text-emerald-300/90 truncate">
                ফোনে সরাসরি অ্যাপ হিসেবে ইনস্টল করতে ট্যাপ করুন
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold shrink-0">
            <Download className="w-3.5 h-3.5" />
            <span>ইনস্টল</span>
          </div>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#141923] border border-slate-700 p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">মোবাইল অ্যাপ ইনস্টল গাইড</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-300 list-decimal pl-5">
                <li>
                  Safari ব্রাউজারের নিচে <strong className="text-white">Share</strong> বাটনে ট্যাপ করুন।
                </li>
                <li>
                  নিচে স্ক্রল করে <strong className="text-white">Add to Home Screen</strong> নির্বাচন করুন।
                </li>
                <li>
                  উপরে <strong className="text-emerald-400">Add</strong> চাপলেই NexasWorld অ্যাপ ফোনে সেভ হয়ে যাবে।
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-300 list-decimal pl-5">
                <li>
                  Chrome ব্রাউজারের উপরের ডান কোণায় <strong className="text-white">⋮ (Menu)</strong> আইকনে ট্যাপ করুন।
                </li>
                <li>
                  তালিকা থেকে <strong className="text-white">Install app</strong> অথবা{' '}
                  <strong className="text-white">Add to Home screen</strong> নির্বাচন করুন।
                </li>
                <li>
                  <strong className="text-emerald-400">Install</strong> বাটনে চাপলেই আপনার ফোনের হোম স্ক্রিনে NexasWorld অ্যাপ ইনস্টল হয়ে যাবে।
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <span>বুঝেছি</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-xl">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <span>অফলাইন মোড — সংরক্ষিত ডেটা দেখানো হচ্ছে</span>
    </div>
  );
};

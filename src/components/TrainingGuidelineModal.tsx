import React from 'react';
import { BookOpen, CheckCircle2, Cpu, Rocket, ShieldCheck, X } from 'lucide-react';
import { GlobalSettings } from '../types';
import { formatNumberEN } from '../utils/format';

interface TrainingGuidelineModalProps {
  open: boolean;
  onClose: () => void;
  settings: GlobalSettings;
}

export const TrainingGuidelineModal: React.FC<TrainingGuidelineModalProps> = ({
  open,
  onClose,
  settings,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0e1523] border border-slate-700/80 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#0d1626] via-[#132036] to-[#0e2a2f] px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-num font-extrabold text-white">
                Training Guidline
              </h3>
              <p className="text-xs text-slate-400">Nexas World প্রশিক্ষণ ও ব্যবহার নির্দেশিকা</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-sm">
          {/* Core Message from the Banner Text */}
          <div className="rounded-2xl bg-[#141d2e] border border-slate-700/70 p-4 space-y-3">
            <h4 className="text-lg font-num font-bold text-white leading-snug">
              Welcome to Nexas World
            </h4>
            <p className="text-xs sm:text-sm font-num text-slate-300 leading-relaxed">
              A next-generation digital ecosystem for innovation, connection, and growth.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl bg-[#0c121e] border border-slate-800 p-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-num font-semibold text-slate-100">
                  Modern Platform
                </span>
              </div>
              <div className="rounded-xl bg-[#0c121e] border border-slate-800 p-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-num font-semibold text-slate-100">
                  Secure &amp; Scalable
                </span>
              </div>
              <div className="rounded-xl bg-[#0c121e] border border-slate-800 p-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-num font-semibold text-slate-100">
                  Built for the Future
                </span>
              </div>
            </div>
          </div>

          {/* Step-by-step Bangla Training Guide */}
          <div className="space-y-2.5">
            <h5 className="text-sm font-bold text-white">কাজের ধাপসমূহ (Training Steps)</h5>

            <div className="space-y-2 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131a28] border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">১. নিবন্ধন ও স্বাগতম বোনাস: </span>
                  নতুন অ্যাকাউন্ট খুললেই সাথে সাথে{' '}
                  <span className="font-num font-bold text-emerald-400">
                    ৳{formatNumberEN(settings.welcomeBonus)}
                  </span>{' '}
                  বোনাস যুক্ত হয়।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131a28] border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">২. GoPay রিচার্জ ও প্ল্যান ক্রয়: </span>
                  সর্বনিম্ন{' '}
                  <span className="font-num font-bold text-white">
                    ৳{formatNumberEN(settings.minDeposit)}
                  </span>{' '}
                  বিকাশ বা নগদ দিয়ে রিচার্জ করে ট্রানজেকশন আইডি (TrxID) সাবমিট করুন এবং পছন্দের VIP প্ল্যান কিনুন।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131a28] border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">৩. ২৪ ঘণ্টা অটো-ইনকাম: </span>
                  প্ল্যান সক্রিয় করার পর <span className="font-num font-bold">24</span> ঘণ্টার রিমাইন্ডার টাইম শেষে স্বয়ংক্রিয়ভাবে দৈনিক আয় উত্তোলন ব্যালেন্সে যোগ হবে।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131a28] border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">৪. টিম ও রেফারেল কমিশন: </span>
                  বন্ধুদের আমন্ত্রণ জানিয়ে লেভেল 1 ({formatNumberEN(settings.level1Rate)}%), লেভেল 2 ({formatNumberEN(settings.level2Rate)}%) ও লেভেল 3 ({formatNumberEN(settings.level3Rate)}%) কমিশন অর্জন করুন।
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131a28] border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">৫. ব্যাংক কার্ড ও উত্তোলন: </span>
                  বিকাশ বা নগদ ব্যাংক কার্ড সেটআপ করে এবং কমপক্ষে একটি প্ল্যান অ্যাক্টিভ রেখে সর্বনিম্ন{' '}
                  <span className="font-num font-bold text-amber-400">
                    ৳{formatNumberEN(settings.minWithdraw)}
                  </span>{' '}
                  হলেই উত্তোলন করতে পারবেন।
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0b101b]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            বুঝেছি
          </button>
        </div>
      </div>
    </div>
  );
};

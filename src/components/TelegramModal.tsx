import React from 'react';
import { Bell, ExternalLink, Headphones, Megaphone, Send, Users, X } from 'lucide-react';
import { GlobalSettings } from '../types';

interface TelegramModalProps {
  open: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  contextTitle?: string;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  open,
  onClose,
  settings,
  contextTitle,
}) => {
  if (!open) return null;

  const groupUrl = settings.supportGroupUrl || 'https://t.me/NexasWorld_SupportGroup';
  const channelUrl = settings.supportChannelUrl || 'https://t.me/NexasWorld_OfficialChannel';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#131822] border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-5 py-4 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-sky-100 font-medium">সাপোর্ট সেন্টার নোটিফিকেশন</p>
              <h3 className="text-lg font-bold leading-snug">
                {contextTitle || 'বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন'}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            বিস্তারিত জানতে টেলিগ্রামে জয়েন করুন। প্রতিদিনের আপডেট, পেমেন্ট প্রুফ, নতুন গিফট কোড এবং তাৎক্ষণিক কাস্টমার সাপোর্টের জন্য নিচের গ্রুপ ও চ্যানেলে যুক্ত থাকুন:
          </p>

          <div className="space-y-3">
            {/* Customer Service Group Link */}
            <a
              href={groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>গ্রুপ লিংক (টেলিগ্রাম গ্রুপ)</span>
                  </div>
                  <div className="text-xs text-sky-300 truncate font-num">{groupUrl}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold shrink-0 group-hover:bg-sky-400">
                জয়েন <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>

            {/* Customer Support Link */}
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">কাস্টমার সাপোর্ট লিংক</div>
                  <div className="text-xs text-emerald-300 truncate font-num">{channelUrl}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold shrink-0 group-hover:bg-emerald-400">
                চ্যানেল <Send className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Headphones className="w-4 h-4 text-emerald-400" />
              <span>২৪/৭ সাপোর্ট সেবা চালু রয়েছে</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

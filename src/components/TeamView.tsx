import React, { useState } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import { GlobalSettings, TeamSummary, User } from '../types';
import { formatBDT, formatNumberEN } from '../utils/format';

interface TeamViewProps {
  user: User;
  team: TeamSummary;
  settings: GlobalSettings;
}

export const TeamView: React.FC<TeamViewProps> = ({ user, team, settings }) => {
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = `${origin}/?ref=${user.referralCode}`;

  const copyText = async (text: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = async () => {
    const shareText = `NexasWorld-এ জয়েন করুন এবং নিবন্ধন করলেই পান স্বাগতম বোনাস! আমার রেফারেল লিংক: ${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NexasWorld আমন্ত্রণ',
          text: shareText,
          url: referralLink,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    copyText(referralLink, 'link');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top White Card matching screenshot */}
      <div className="rounded-2xl bg-white text-slate-900 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-mono-num font-bold text-slate-900 truncate">
              {user.referralCode}
            </div>
            <div className="text-xs font-medium text-rose-500 mt-0.5">আমন্ত্রণ কোড</div>
          </div>
          <button
            type="button"
            onClick={() => copyText(user.referralCode, 'code')}
            className="px-4 py-2 rounded-xl bg-[#252a34] hover:bg-[#161a22] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            {copiedField === 'code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>কপি হয়েছে</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>কপি</span>
              </>
            )}
          </button>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-num font-semibold text-slate-800 truncate">
              {referralLink}
            </div>
            <div className="text-xs font-medium text-rose-500 mt-0.5">আমন্ত্রণ লিংক (সরাসরি নিবন্ধন)</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => copyText(referralLink, 'link')}
              className="px-3.5 py-2 rounded-xl bg-[#252a34] hover:bg-[#161a22] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedField === 'link' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>কপি</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="শেয়ার করুন"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Commission Table Card matching screenshot */}
      <div className="rounded-2xl bg-[#161b26] border border-slate-800 overflow-hidden shadow-lg">
        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-6">কমিশন হার</div>
          <div className="col-span-3 text-center">বৈধ সদস্য</div>
          <div className="col-span-3 text-right">আয়</div>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs sm:text-sm">
          <div className="grid grid-cols-12 items-center px-4 py-3.5">
            <div className="col-span-6 font-medium text-slate-100">
              লেভেল <span className="font-num">1</span> টিম (
              <span className="font-num">{formatNumberEN(settings.level1Rate ?? team.level1.rate)}%</span>)
            </div>
            <div className="col-span-3 text-center font-num font-bold text-white">
              {formatNumberEN(team.level1.count)}
            </div>
            <div className="col-span-3 text-right font-num font-bold text-emerald-400">
              {formatBDT(team.level1.earnings)}
            </div>
          </div>

          <div className="grid grid-cols-12 items-center px-4 py-3.5">
            <div className="col-span-6 font-medium text-slate-100">
              লেভেল <span className="font-num">2</span> টিম (
              <span className="font-num">{formatNumberEN(settings.level2Rate ?? team.level2.rate)}%</span>)
            </div>
            <div className="col-span-3 text-center font-num font-bold text-white">
              {formatNumberEN(team.level2.count)}
            </div>
            <div className="col-span-3 text-right font-num font-bold text-emerald-400">
              {formatBDT(team.level2.earnings)}
            </div>
          </div>

          <div className="grid grid-cols-12 items-center px-4 py-3.5">
            <div className="col-span-6 font-medium text-slate-100">
              লেভেল <span className="font-num">3</span> টিম (
              <span className="font-num">{formatNumberEN(settings.level3Rate ?? team.level3.rate)}%</span>)
            </div>
            <div className="col-span-3 text-center font-num font-bold text-white">
              {formatNumberEN(team.level3.count)}
            </div>
            <div className="col-span-3 text-right font-num font-bold text-emerald-400">
              {formatBDT(team.level3.earnings)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 2 Summary Cards matching screenshot */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-5 text-center">
          <div className="text-2xl font-num font-extrabold text-white">
            {formatNumberEN(team.totalValidUsers)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>বৈধ সদস্য</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#161b26] border border-slate-800 p-5 text-center">
          <div className="text-2xl font-num font-extrabold text-white">
            {formatBDT(team.totalEarnings)}
          </div>
          <div className="text-xs text-slate-400 mt-1">আমন্ত্রণ আয়</div>
        </div>
      </div>
    </div>
  );
};

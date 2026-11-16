import React from 'react';
import {
  Award,
  BarChart2,
  BookOpen,
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  Headphones,
  LogOut,
  Star,
} from 'lucide-react';
import { User } from '../types';
import { formatBDT } from '../utils/format';
import { PWAInstallButton } from './PWAInstallButton';

export type ProfileSubViewType =
  | 'daily_salary'
  | 'gift_code'
  | 'account_details'
  | 'payment_record'
  | 'withdrawal_record'
  | 'withdrawal_account';

interface ProfileViewProps {
  user: User;
  onRecharge: () => void;
  onWithdraw: () => void;
  onOpenSubView: (view: ProfileSubViewType) => void;
  onSupport: () => void;
  onOpenTraining: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onRecharge,
  onWithdraw,
  onOpenSubView,
  onSupport,
  onOpenTraining,
  onLogout,
}) => {
  const menuItems: {
    id: ProfileSubViewType | 'support' | 'training';
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'daily_salary',
      label: 'দৈনিক বেতন প্ল্যান',
      icon: <Star className="w-5 h-5 text-amber-400 fill-amber-400" />,
    },
    {
      id: 'gift_code',
      label: 'গিফট কোড',
      icon: <Gift className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 'account_details',
      label: 'অ্যাকাউন্টের বিবরণ',
      icon: <BarChart2 className="w-5 h-5 text-slate-300" />,
    },
    {
      id: 'payment_record',
      label: 'পেমেন্ট রেকর্ড',
      icon: <FileText className="w-5 h-5 text-slate-300" />,
    },
    {
      id: 'withdrawal_record',
      label: 'উত্তোলন রেকর্ড',
      icon: <FileText className="w-5 h-5 text-slate-300" />,
    },
    {
      id: 'withdrawal_account',
      label: 'উত্তোলন অ্যাকাউন্ট (ব্যাংক কার্ড)',
      icon: <CreditCard className="w-5 h-5 text-slate-300" />,
    },
    {
      id: 'support',
      label: 'কাস্টমার সার্ভিস',
      icon: <Headphones className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'training',
      label: 'Training Guidline',
      icon: <BookOpen className="w-5 h-5 text-violet-400" />,
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Header Row matching screenshot */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="text-xl sm:text-2xl font-num font-extrabold text-white tracking-tight">
            {user.phone}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">মোবাইল নম্বর</div>
        </div>
        <div className="w-11 h-11 rounded-full border border-slate-700 bg-[#161b26] flex items-center justify-center text-emerald-400">
          <Award className="w-5 h-5" />
        </div>
      </div>

      {/* White Dual Balance Card matching screenshot */}
      <div className="rounded-2xl bg-white text-slate-900 p-5 shadow-lg">
        <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
          <div className="pr-3">
            <div className="text-lg sm:text-xl font-num font-extrabold text-slate-900">
              {formatBDT(user.rechargeBalance)}
            </div>
            <div className="text-xs text-slate-500 mt-1">অ্যাকাউন্ট ব্যালেন্স</div>
          </div>
          <div className="pl-3">
            <div className="text-lg sm:text-xl font-num font-extrabold text-slate-900">
              {formatBDT(user.withdrawalBalance)}
            </div>
            <div className="text-xs text-slate-500 mt-1">উত্তোলন ব্যালেন্স</div>
          </div>
        </div>
      </div>

      {/* Two Action Buttons matching screenshot */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={onRecharge}
          className="py-3.5 rounded-2xl bg-[#1d222d] hover:bg-[#252c3a] border border-slate-800 text-white font-bold text-sm transition-colors active:scale-[0.98] cursor-pointer"
        >
          রিচার্জ
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="py-3.5 rounded-2xl bg-[#1d222d] hover:bg-[#252c3a] border border-slate-800 text-white font-bold text-sm transition-colors active:scale-[0.98] cursor-pointer"
        >
          উত্তোলন
        </button>
      </div>

      {/* Mobile App Install Card (PWA) */}
      <PWAInstallButton variant="menu" />

      {/* Menu List matching screenshot (NO admin link/icon anywhere) */}
      <div className="rounded-2xl bg-[#161b26] border border-slate-800 divide-y divide-slate-800/90 overflow-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'support') onSupport();
              else if (item.id === 'training') onOpenTraining();
              else onOpenSubView(item.id);
            }}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-[#1c2331] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#202736] flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-slate-100">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-sm font-semibold text-rose-300">লগআউট</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};

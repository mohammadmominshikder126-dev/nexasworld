import React from 'react';

interface NexasLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const NexasLogo: React.FC<NexasLogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconDim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${iconDim} rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 p-[2px] shadow-lg shadow-emerald-500/20 shrink-0`}
      >
        <div className="w-full h-full rounded-[10px] bg-[#0b0e14] flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="nexasGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="55%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <path
              d="M7 27V9L18 22L29 9V27"
              stroke="url(#nexasGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 27L18 19L24 27"
              stroke="#fbbf24"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col leading-none">
        <span className={`${textSize} font-num font-extrabold tracking-tight text-white whitespace-nowrap`}>
          Nexas<span className="text-emerald-400">World</span>
        </span>
        {showTagline && (
          <span className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
            বিশ্বস্ত ডিজিটাল ইনভেস্টমেন্ট
          </span>
        )}
      </div>
    </div>
  );
};

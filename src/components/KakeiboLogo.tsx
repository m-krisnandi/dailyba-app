'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function DailybaLogo({ size = 38, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(16,185,129,0.35)] shrink-0 ring-1 ring-white/20 border border-white/20 group cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dailyba-icon.png"
        alt="Dailyba"
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// Backward compatible aliases
export const ZenithLogo = DailybaLogo;
export const SolidPaceLogo = DailybaLogo;
export const KakeiboLogo = DailybaLogo;

'use client';

import React, { useState } from 'react';
import { Language } from '@/types/finance';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { Star, Sparkles, Heart, ExternalLink } from 'lucide-react';

interface AppReviewPromptModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onDismissForever: () => void;
}

export function AppReviewPromptModal({
  isOpen,
  language,
  onClose,
  onDismissForever,
}: AppReviewPromptModalProps) {
  useBodyScrollLock(isOpen);
  const [rating, setRating] = useState<number>(5);

  if (!isOpen) return null;

  const isJa = language === 'ja';

  const handleOpenPlayStore = () => {
    onDismissForever();
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.dailyba.app';
    const marketUrl = 'market://details?id=com.dailyba.app';

    // Try market protocol on Android native, fallback to standard web URL
    try {
      window.location.href = marketUrl;
      setTimeout(() => {
        window.open(playStoreUrl, '_blank');
      }, 500);
    } catch {
      window.open(playStoreUrl, '_blank');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-6 space-y-5 text-center cursor-default"
      >
        {/* Heart / Sparkle Icon */}
        <div className="relative w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
          <Heart className="w-8 h-8 fill-amber-400/30 text-amber-400 animate-pulse" />
          <Sparkles className="w-4 h-4 text-emerald-400 absolute -top-1 -right-1" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-[var(--text-main)]">
            {isJa ? 'Dailyba を気に入っていただけましたか？' : 'Enjoying Dailyba?'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {isJa
              ? 'もし日々の家計管理に役立っているなら、Google Play で星5つの評価やレビューをいただけると開発の大きな励みになります！'
              : 'If Dailyba helps you keep track of your daily expenses, please consider leaving a 5-star rating on Google Play. Your feedback helps us grow!'}
          </p>
        </div>

        {/* Interactive 5 Stars */}
        <div className="flex items-center justify-center space-x-2 py-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-[var(--border-strong)]'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleOpenPlayStore}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{isJa ? 'Google Play で評価する' : 'Rate on Google Play'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              {isJa ? '後で' : 'Maybe Later'}
            </button>
            <button
              type="button"
              onClick={onDismissForever}
              className="text-[var(--text-faint)] hover:text-[var(--text-muted)] cursor-pointer"
            >
              {isJa ? '今後は表示しない' : "Don't show again"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

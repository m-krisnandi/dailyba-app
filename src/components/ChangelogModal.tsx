'use client';

import React from 'react';
import { APP_VERSION, APP_BUILD, APP_CHANGELOG } from '@/lib/version';
import { Sparkles, X, CheckCircle2, Download, Tag } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-[var(--text-main)]">
                  What's New in Dailyba
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[10px] font-mono font-bold">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                Build: {APP_BUILD} • Daily Balance & Wealth Tracker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changelog Timeline */}
        <div className="space-y-4">
          {APP_CHANGELOG.map((item, idx) => (
            <div
              key={item.version}
              className={`p-4 rounded-2xl border transition-all ${
                idx === 0
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-extrabold ${
                      idx === 0
                        ? 'bg-[var(--accent-emerald)] text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    v{item.version}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold text-[var(--accent-emerald)] uppercase tracking-wider">
                      Latest
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[var(--text-faint)]">
                  {item.date}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] mb-2.5">
                {item.title}
              </h4>

              <ul className="space-y-1.5">
                {item.highlights.map((h, hIdx) => (
                  <li
                    key={hIdx}
                    className="flex items-start space-x-2 text-xs text-[var(--text-muted)] leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-emerald)] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <a
            href="/dailyba.apk"
            download="dailyba.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK (v{APP_VERSION})</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

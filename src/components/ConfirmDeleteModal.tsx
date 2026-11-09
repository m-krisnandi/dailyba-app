'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Language } from '@/types/finance';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  language?: Language;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  itemName,
  confirmLabel,
  cancelLabel,
  language = 'en',
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const isJa = language === 'ja';

  const defaultTitle = isJa ? '削除の確認' : 'Confirm Deletion';
  const defaultDesc = isJa
    ? 'この項目を削除してもよろしいですか？この操作は元に戻せません。'
    : 'Are you sure you want to delete this item? This action cannot be undone.';
  const defaultConfirm = isJa ? '削除する' : 'Delete';
  const defaultCancel = isJa ? 'キャンセル' : 'Cancel';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(244,63,94,0.35)] p-5 sm:p-6 space-y-4 text-center cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* Glow & Warning Icon */}
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
          <Trash2 className="w-7 h-7 stroke-[2.2]" />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-[var(--text-main)] tracking-tight">
            {title || defaultTitle}
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed px-1">
            {description || defaultDesc}
          </p>

          {itemName && (
            <div className="mt-2.5 p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono text-xs font-bold text-[var(--text-main)] truncate max-w-full">
              {itemName}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer active:scale-95"
          >
            {cancelLabel || defaultCancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmLabel || defaultConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

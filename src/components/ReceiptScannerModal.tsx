'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Currency, ExpenseCategory, FundingSource, Language, Transaction } from '@/types/finance';
import { translations, formatCurrency } from '@/lib/i18n';
import { formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { EXPENSE_CATEGORY_ICONS, FUNDING_SOURCE_ICONS, getCategoryBadgeStyle, getFundingSourceBadgeStyle } from '@/lib/constants';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { prepareImageForAI, parseReceiptWithGemini, ParsedReceiptResult } from '@/lib/geminiScanner';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Receipt,
  Eye,
  CreditCard,
  Building,
  Wallet,
  Coins,
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  language,
  currency: activeCurrency,
  onAddTransaction,
}: ReceiptScannerModalProps) {
  useBodyScrollLock(isOpen);
  const t = translations[language];

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'idle' | 'scanning' | 'review' | 'error'>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review form state
  const [amountStr, setAmountStr] = useState<string>('');
  const [txCurrency, setTxCurrency] = useState<Currency>(activeCurrency);
  const [category, setCategory] = useState<ExpenseCategory>('food_drinks');
  const [source, setSource] = useState<FundingSource>('cash');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0.9);
  const [showFullReceipt, setShowFullReceipt] = useState<boolean>(false);

  // Expense categories options for custom select
  const expenseCategories = Object.keys(EXPENSE_CATEGORY_ICONS) as ExpenseCategory[];
  const categoryOptions = useMemo<CustomSelectOption<ExpenseCategory>[]>(() => {
    return expenseCategories.map((cat) => {
      const style = getCategoryBadgeStyle('expense', cat);
      return {
        value: cat,
        label: t.expenseCategories[cat] || cat,
        icon: EXPENSE_CATEGORY_ICONS[cat],
        badgeClass: `${style.border} ${style.bg} ${style.text}`,
      };
    });
  }, [expenseCategories, t]);

  const resetAll = () => {
    setStep('idle');
    setImagePreview(null);
    setErrorMessage(null);
    setAmountStr('');
    setNote('');
    setShowFullReceipt(false);
  };

  const handleProcessImage = async (file: File) => {
    try {
      setStep('scanning');
      setErrorMessage(null);

      // 1. Resize & prepare image client-side for rapid Gemini analysis
      const { base64, mimeType, previewUrl } = await prepareImageForAI(file);
      setImagePreview(previewUrl);

      // 2. Call Gemini Vision API
      const result: ParsedReceiptResult = await parseReceiptWithGemini(base64, mimeType, activeCurrency);

      // 3. Pre-fill review form
      setAmountStr(formatNumberWithCommas(result.amount));
      setTxCurrency(result.currency || activeCurrency);
      setCategory(result.category);
      setSource(result.source);
      setDate(result.date);
      setNote(result.note);
      setConfidence(result.confidence);

      setStep('review');
    } catch (err: any) {
      console.error('Receipt parse error:', err);
      setErrorMessage(err?.message || (language === 'ja' ? 'レシートの解析に失敗しました。もう一度お試しください。' : 'Failed to scan receipt with Gemini AI. Please try another angle or image.'));
      setStep('error');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImage(file);
    }
    // Reset input so same file can be picked again if needed
    e.target.value = '';
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRawNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) return;

    onAddTransaction({
      type: 'expense',
      amount: parsedAmount,
      category,
      source,
      currency: txCurrency,
      date,
      note: note.trim() || undefined,
    });

    resetAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto cursor-default relative"
      >
        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)] flex items-center space-x-1.5">
                <span>{language === 'ja' ? 'レシート・請求書 AIスキャン' : 'AI Receipt & Invoice Scanner'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Gemini
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {language === 'ja'
                  ? 'カメラまたは画像から金額・項目・店舗を自動解析'
                  : 'Auto-detect amount, category, source & merchant'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. IDLE STATE: Choose Camera or Upload */}
        {step === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Take Photo Card */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer space-y-3 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ja' ? 'カメラで撮影' : 'Take Photo'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {language === 'ja' ? 'レシートを直接スキャン' : 'Scan physical bill directly'}
                  </p>
                </div>
              </button>

              {/* Upload Image Card */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-blue-500/40 transition-all duration-200 cursor-pointer space-y-3 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ja' ? 'ギャラリーから選択' : 'Upload Image'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {language === 'ja' ? '保存済みの画像やPDFスクショ' : 'Pick invoice screenshot/photo'}
                  </p>
                </div>
              </button>
            </div>

            {/* Smart Capability Badges */}
            <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {language === 'ja' ? 'AI自動認識できる情報' : 'Automatic AI Extraction'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ja' ? '合計金額 & 通貨 (Rp/¥/$)' : 'Grand Total & Currency'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ja' ? '決済方法 (現金/クレカ/QRIS)' : 'Payment Source (Cash/QRIS/Bank)'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ja' ? '店舗名 & 購入品目' : 'Merchant Name & Items'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ja' ? '支出カテゴリーの自動分類' : 'Expense Category Matching'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SCANNING ANIMATION STATE */}
        {step === 'scanning' && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            {imagePreview && (
              <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-xl bg-black/40">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="w-full h-full object-cover filter brightness-90"
                />
                {/* Glowing Laser Scanner Beam Effect */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce" />
                <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
              </div>
            )}

            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                <span>
                  {language === 'ja'
                    ? 'Gemini AI がレシートを解析中...'
                    : 'Gemini AI is parsing receipt...'}
                </span>
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                {language === 'ja'
                  ? '合計金額・支払方法・店舗名・項目を抽出しています'
                  : 'Extracting total amount, payment source, and merchant items'}
              </p>
            </div>
          </div>
        )}

        {/* 3. ERROR STATE */}
        {step === 'error' && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-bold text-[var(--text-main)]">
                {language === 'ja' ? '解析できませんでした' : 'Receipt Analysis Failed'}
              </h4>
              <p className="text-xs text-rose-500/90 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'ja' ? 'もう一度試す' : 'Try Again'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. REVIEW & CONFIRMATION FORM */}
        {step === 'review' && (
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Top Success & AI Confidence Bar */}
            <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {language === 'ja' ? 'AI解析完了（内容をご確認ください）' : 'Receipt Parsed (Please review details)'}
                </span>
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setShowFullReceipt(!showFullReceipt)}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>{showFullReceipt ? (language === 'ja' ? '隠す' : 'Hide') : (language === 'ja' ? '写真を見る' : 'View Photo')}</span>
                </button>
              )}
            </div>

            {/* Expanded Receipt Image Preview */}
            {showFullReceipt && imagePreview && (
              <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] max-h-48 flex items-center justify-center bg-black/60">
                <img
                  src={imagePreview}
                  alt="Receipt Full"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Amount & Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.amountLabel} ({txCurrency})
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setAmountStr(formatNumberWithCommas(raw));
                  }}
                  placeholder="0"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 pr-16 py-2.5 text-base font-extrabold text-[var(--text-main)] tabular-numbers font-mono outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                  {txCurrency}
                </span>
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.selectCategory}
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val as ExpenseCategory)}
                options={categoryOptions}
              />
            </div>

            {/* Funding Source Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.fundingSource}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['cash', 'bank', 'credit_card', 'ewallet'] as FundingSource[]).map((s) => {
                  const Icon = FUNDING_SOURCE_ICONS[s] || CreditCard;
                  const isSelected = source === s;
                  const sourceStyle = getFundingSourceBadgeStyle(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSource(s)}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)] shadow-xs'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${sourceStyle.border} ${sourceStyle.bg} ${sourceStyle.text}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="truncate">{t.sources[s]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.date}
              </label>
              <CustomDatePicker
                value={date}
                onChange={setDate}
                language={language}
              />
            </div>

            {/* Note / Memo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.note}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.record.notePlaceholder}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'ja' ? '再スキャン' : 'Scan Another'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.record.recordButton}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

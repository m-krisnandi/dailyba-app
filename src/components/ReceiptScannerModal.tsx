'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Currency, ExpenseCategory, FundingSource, Language, Transaction } from '@/types/finance';
import { translations, formatCurrency } from '@/lib/i18n';
import { formatNumberWithCommas, parseRawNumber, convertCurrency, useExchangeRates } from '@/lib/currency';
import { getTodayLocalDate } from '@/lib/dateUtils';
import { EXPENSE_CATEGORY_ICONS, FUNDING_SOURCE_ICONS, getCategoryBadgeStyle, getFundingSourceBadgeStyle } from '@/lib/constants';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { prepareImageForAI, parseReceiptWithAI, ParsedReceiptResult, isNetworkError } from '@/lib/aiReceiptScanner';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Eye,
  CreditCard,
  WifiOff,
  PenLine,
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
  const rates = useExchangeRates();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  const [step, setStep] = useState<'idle' | 'camera' | 'scanning' | 'review' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkFailure, setIsNetworkFailure] = useState<boolean>(false);
  const [isManualOfflineMode, setIsManualOfflineMode] = useState<boolean>(false);

  // Connectivity state for ambient hints
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setStep('camera');
        return;
      }
    } catch (err: any) {
      console.warn('getUserMedia failed or rejected, falling back to file input:', err);
      stopCameraStream();
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError(
          language === 'ja'
            ? 'カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。'
            : 'Camera permission denied. Please allow camera access in your browser or choose Upload Image.'
        );
        return;
      }
    }
    // Fallback for devices without webcam API support
    cameraInputRef.current?.click();
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "receipt_" + Date.now() + ".jpg", { type: "image/jpeg" });
            stopCameraStream();
            handleProcessImage(file);
          }
        },
        'image/jpeg',
        0.95
      );
    }
  };

  useEffect(() => {
    if (step === 'camera' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const handleClose = () => {
    stopCameraStream();
    resetAll();
    onClose();
  };

  const resetAll = () => {
    stopCameraStream();
    setStep('idle');
    setImagePreview(null);
    setErrorMessage(null);
    setIsNetworkFailure(false);
    setIsManualOfflineMode(false);
    lastFileRef.current = null;
    setAmountStr('');
    setNote('');
    setShowFullReceipt(false);
  };

  const handleProcessImage = async (file: File) => {
    try {
      lastFileRef.current = file;
      setIsNetworkFailure(false);
      setIsManualOfflineMode(false);
      setStep('scanning');
      setErrorMessage(null);

      // 1. Resize & prepare image client-side for rapid AI analysis
      const { base64, mimeType, previewUrl } = await prepareImageForAI(file);
      setImagePreview(previewUrl);

      // 2. Call AI Vision API
      const result: ParsedReceiptResult = await parseReceiptWithAI(base64, mimeType, activeCurrency, language);

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
      const isNet = isNetworkError(err);
      setIsNetworkFailure(isNet);
      if (isNet) {
        setErrorMessage(
          language === 'ja'
            ? 'オフラインまたは通信環境が不安定なため、AI解析サーバーに接続できませんでした。'
            : 'You appear to be offline or network connection is unstable. AI analysis could not complete.'
        );
      } else {
        setErrorMessage(
          err?.message ||
            (language === 'ja'
              ? 'レシートの解析に失敗しました。もう一度お試しください。'
              : 'Failed to scan receipt. Please ensure the total amount is clearly visible.')
        );
      }
      setStep('error');
    }
  };

  const handleSwitchToManualEntry = () => {
    setIsManualOfflineMode(true);
    setShowFullReceipt(true); // Automatically expand the photo preview so user can read it!
    setAmountStr('');
    setDate(getTodayLocalDate());
    setCategory('food_drinks');
    setSource('cash');
    setNote('');
    setStep('review');
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
      onClick={handleClose}
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
                <span>{t.scanner.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {t.scanner.autoScan}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {t.scanner.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. IDLE STATE: Choose Camera or Upload */}
        {step === 'idle' && (
          <div className="space-y-4 py-2">
            {/* Ambient Offline Banner */}
            {!isOnline && (
              <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-500">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span className="leading-relaxed">
                  {language === 'ja'
                    ? '現在オフラインです。撮影した写真を見ながら手動入力で記録できます。'
                    : 'You are currently offline. You can still capture photos and record manually.'}
                </span>
              </div>
            )}

            {cameraError && (
              <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-500 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Take Photo Card */}
              <button
                type="button"
                onClick={handleStartCamera}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer space-y-3 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {t.scanner.takePhoto}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {t.scanner.takePhotoDesc}
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
                    {t.scanner.uploadImage}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {t.scanner.uploadImageDesc}
                  </p>
                </div>
              </button>
            </div>

            {/* Smart Capability Badges */}
            <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.scanner.autoExtractedTitle}
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.scanner.grandTotalCurrency}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.scanner.paymentSource}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.scanner.merchantItems}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.scanner.categoryMatching}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1.5 LIVE WEBCAM / CAMERA VIEWFINDER (CENTERED PORTRAIT RECEIPT DESIGN) */}
        {step === 'camera' && (
          <div className="space-y-3.5 py-1">
            <div className="relative w-full h-[430px] sm:h-[480px] rounded-2xl overflow-hidden bg-black border border-emerald-500/40 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Viewfinder Receipt Overlay: Centered portrait format tailored for receipts */}
              <div className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[62%] h-[88%] border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                {/* Scanner corner brackets */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                {/* Top Alignment Guide */}
                <div className="text-[10px] text-emerald-300 font-mono bg-black/75 px-3 py-1 rounded-full backdrop-blur-md self-center shadow-md border border-emerald-500/30 whitespace-nowrap">
                  <span>{t.scanner.alignInsideFrame}</span>
                </div>

                {/* Center Dynamic Scanning Laser */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse" />

                {/* Bottom Branding / Guide */}
                <div className="text-[10px] text-emerald-300 font-mono self-center bg-black/75 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-emerald-500/30 whitespace-nowrap">
                  <span>{t.scanner.scannerBrand}</span>
                </div>
              </div>
            </div>

            {/* Smart Long-Receipt Guide Tip */}
            <div className="flex items-start space-x-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                {language === 'ja'
                  ? '💡 長いレシートは「店名（上部）」と「合計金額（下部）」が枠内に収まるように撮影してください。AIが自動認識します。'
                  : '💡 For long receipts, make sure Store Name (top) and Grand Total (bottom) are visible inside the frame. AI will auto-detect the rest.'}
              </span>
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setStep('idle');
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
              >
                {t.actions.cancel}
              </button>

              {/* Big Shutter Button */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-ping mr-0.5" />
                <Camera className="w-4 h-4" />
                <span>{t.scanner.captureReceipt}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  galleryInputRef.current?.click();
                }}
                className="px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center space-x-1"
                title={t.scanner.uploadFromDisk}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.scanner.uploadShort}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. SCANNING ANIMATION STATE */}
        {step === 'scanning' && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            {imagePreview && (
              <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-xl bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    ? 'スマートAIがレシートを解析中...'
                    : 'Smart AI is analyzing your receipt...'}
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

        {/* 3. ERROR & OFFLINE FALLBACK STATE */}
        {step === 'error' && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isNetworkFailure
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-500'
            }`}>
              {isNetworkFailure ? <WifiOff className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-sm font-bold text-[var(--text-main)]">
                {isNetworkFailure
                  ? t.scanner.offlineOrError : t.scanner.analysisFailed}
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {errorMessage}
              </p>
              {isNetworkFailure && imagePreview && (
                <p className="text-[11px] text-amber-500/90 pt-1">
                  {language === 'ja'
                    ? '💡 写真は保持されています。写真を見ながら手動入力ですぐに記録できます。'
                    : '💡 Photo is saved in memory. You can record quickly using manual entry.'}
                </p>
              )}
            </div>

            {/* Actions: If network failure, offer Quick Manual Entry as prominent primary button! */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full sm:w-auto">
              {isNetworkFailure ? (
                <>
                  <button
                    type="button"
                    onClick={handleSwitchToManualEntry}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>{t.scanner.quickManualEntry}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (lastFileRef.current) {
                        handleProcessImage(lastFileRef.current);
                      } else {
                        resetAll();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.scanner.retry}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.scanner.tryAgain}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. REVIEW & CONFIRMATION FORM */}
        {step === 'review' && (
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Top Success & AI Confidence Bar */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isManualOfflineMode
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}>
              <div className="flex items-center space-x-2">
                {isManualOfflineMode ? (
                  <PenLine className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className={`text-xs font-bold flex items-center space-x-1.5 ${
                  isManualOfflineMode ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  <span>
                    {isManualOfflineMode
                      ? t.scanner.manualModeViewingPhoto : t.scanner.receiptParsed}
                  </span>
                  {!isManualOfflineMode ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold">
                      {Math.round(confidence * 100)}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                      {t.scanner.offlineTag}
                    </span>
                  )}
                </span>
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setShowFullReceipt(!showFullReceipt)}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>{showFullReceipt ? t.scanner.hide : t.scanner.viewPhoto}</span>
                </button>
              )}
            </div>

            {/* Expanded Receipt Image Preview (Kept visible so user can easily read details from it!) */}
            {showFullReceipt && imagePreview && (
              <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] max-h-56 flex items-center justify-center bg-black/60 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Receipt Full"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Amount & Currency with Live Conversion */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.record.amountLabel}
                </label>
                {/* Currency Switcher Buttons */}
                <div className="flex items-center space-x-1">
                  {(['IDR', 'JPY', 'USD', 'MMK'] as Currency[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        if (cur !== txCurrency) {
                          const currentVal = parseRawNumber(amountStr);
                          if (currentVal > 0) {
                            const converted = convertCurrency(currentVal, txCurrency, cur, rates);
                            setAmountStr(formatNumberWithCommas(converted));
                          }
                          setTxCurrency(cur);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${txCurrency === cur ? "bg-emerald-500 text-white shadow-xs" : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]"}`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  autoFocus={isManualOfflineMode}
                  value={amountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setAmountStr(formatNumberWithCommas(raw));
                  }}
                  placeholder="0"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 pr-16 py-2.5 text-base font-extrabold text-[var(--text-main)] tabular-numbers font-mono outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-500 select-none">
                  {txCurrency}
                </span>
              </div>

              {/* Multi-Currency Auto-Conversion Hint */}
              {txCurrency !== activeCurrency && (
                <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-muted)] font-mono bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
                  <span>{t.scanner.convertedIntoActiveCurrency}</span>
                  <span className="text-emerald-500 font-bold">
                    ≈ {formatCurrency(convertCurrency(parseRawNumber(amountStr), txCurrency, activeCurrency, rates), activeCurrency)}
                  </span>
                </div>
              )}
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
                <span>{t.scanner.scanAnother}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
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

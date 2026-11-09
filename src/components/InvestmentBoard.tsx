'use client';

import React, { useMemo, useState } from 'react';
import { Currency, InvestmentAsset, Language } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  X,
  PieChart as PieIcon,
  Coins,
  ShieldCheck,
  Building,
  Sparkles,
} from 'lucide-react';

interface InvestmentBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  investments: InvestmentAsset[];
  totalLiquidSavings: number; // Cash reserve passed from parent
  onAddOrUpdateInvestment: (asset: InvestmentAsset) => void;
  onDeleteInvestment: (id: string) => void;
}

export function InvestmentBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  investments,
  totalLiquidSavings,
  onAddOrUpdateInvestment,
  onDeleteInvestment,
}: InvestmentBoardProps) {
  const t = translations[language];

  const [isModalOpen, setIsModalOpen] = useState(false);
  useBodyScrollLock(isModalOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<InvestmentAsset | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InvestmentAsset['category']>('gold');
  const [costBasisStr, setCostBasisStr] = useState('');
  const [currentValueStr, setCurrentValueStr] = useState('');
  const [isCustomValuation, setIsCustomValuation] = useState(false);

  // Total Portfolio Cost Basis converted to active currency
  const assetCategoryOptions = useMemo<CustomSelectOption<InvestmentAsset['category']>[]>(() => [
    { value: 'mutual_fund', label: t.investmentCategories.mutual_fund, icon: TrendingUp },
    { value: 'stock', label: t.investmentCategories.stock, icon: Building },
    { value: 'crypto', label: t.investmentCategories.crypto, icon: Sparkles },
    { value: 'gold', label: t.investmentCategories.gold, icon: Coins },
    { value: 'deposit', label: t.investmentCategories.deposit, icon: ShieldCheck },
  ], [t]);
  const totalCostBasis = useMemo(() => {
    return investments.reduce((sum, inv) => {
      return sum + convertCurrency(inv.costBasis, inv.currency, currency, rates);
    }, 0);
  }, [investments, currency, rates]);

  // Total Portfolio Market Value converted to active currency
  const totalCurrentValue = useMemo(() => {
    return investments.reduce((sum, inv) => {
      return sum + convertCurrency(inv.currentValue, inv.currency, currency, rates);
    }, 0);
  }, [investments, currency, rates]);

  // Combined Net Worth (Total Liquid Cash Buffer + Investment Portfolio Market Valuation)
  const combinedNetWorth = totalLiquidSavings + totalCurrentValue;

  const totalGainLoss = totalCurrentValue - totalCostBasis;
  const gainLossPercentage =
    totalCostBasis > 0 ? ((totalGainLoss / totalCostBasis) * 100).toFixed(1) : '0.0';

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('gold');
    setCostBasisStr('');
    setCurrentValueStr('');
    setIsCustomValuation(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: InvestmentAsset) => {
    setEditingId(inv.id);
    setName(inv.name);
    setCategory(inv.category);
    // Convert to active currency for friendly editing
    const cb = convertCurrency(inv.costBasis, inv.currency, currency, rates);
    const cv = convertCurrency(inv.currentValue, inv.currency, currency, rates);
    setCostBasisStr(formatNumberWithCommas(cb));
    setCurrentValueStr(formatNumberWithCommas(cv));
    setIsCustomValuation(Math.abs(cv - cb) > 1);
    setIsModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cb = parseRawNumber(costBasisStr);
    if (!name.trim() || isNaN(cb) || cb <= 0) return;

    // If custom valuation not toggled or empty, automatically equals costBasis
    const cv = isCustomValuation && currentValueStr ? parseRawNumber(currentValueStr) : cb;
    const finalCv = isNaN(cv) || cv < 0 ? cb : cv;

    onAddOrUpdateInvestment({
      id: editingId || `inv_${Date.now()}`,
      name: name.trim(),
      category,
      costBasis: cb,
      currentValue: finalCv,
      currency,
      updatedAt: new Date().toISOString(),
    });

    setIsModalOpen(false);
  };

  const getCategoryIcon = (cat: InvestmentAsset['category']) => {
    switch (cat) {
      case 'stock':
        return Building;
      case 'crypto':
        return Sparkles;
      case 'gold':
        return Coins;
      case 'deposit':
        return ShieldCheck;
      default:
        return TrendingUp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Net Worth Hero (Combined Cash + Investments in Liquid Glass) */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-6 sm:p-8 shadow-[var(--card-shadow)] relative overflow-hidden transition-all duration-200 space-y-6">
        {/* Ambient Specular Glow */}
        

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.investments.netWorthTitle}
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)] tabular-numbers font-mono mt-1">
              {formatCurrency(combinedNetWorth, currency)}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t.investments.combinedSubtitle}
            </p>
          </div>

          {/* Executive Monochrome Primary Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] text-xs sm:text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.investments.addAsset}</span>
          </button>
        </div>

        {/* Breakdown Sub-panels: Liquid Cash vs Investments */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Liquid Cash Buffer */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] ">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {t.investments.liquidCash}
            </span>
            <p className="text-lg sm:text-xl font-bold text-[var(--text-main)] tabular-numbers font-mono mt-0.5">
              {formatCurrency(totalLiquidSavings, currency)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {language === 'ja' ? '累計の普通預金・手元資金' : 'Cash buffer across all time'}
            </p>
          </div>

          {/* Investment Portfolio Valuation */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] ">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.investments.totalCurrentValue}
              </span>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                  totalGainLoss >= 0
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalGainLoss >= 0 ? '+' : ''}
                {gainLossPercentage}%
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[var(--text-main)] tabular-numbers font-mono mt-0.5">
              {formatCurrency(totalCurrentValue, currency)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {language === 'ja' ? '取得原価' : 'Cost'}: {formatCurrency(totalCostBasis, currency)} (
              {totalGainLoss >= 0 ? '+' : ''}
              {formatCurrency(totalGainLoss, currency)})
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {t.investments.totalInvested}
          </span>
          <p className="text-lg font-bold text-[var(--text-main)] tabular-numbers font-mono mt-1">
            {formatCurrency(totalCostBasis, currency)}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {t.investments.currentValue}
          </span>
          <p className="text-lg font-bold text-[var(--text-main)] tabular-numbers font-mono mt-1">
            {formatCurrency(totalCurrentValue, currency)}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {t.investments.unrealizedGainLoss}
          </span>
          <p
            className={`text-lg font-bold tabular-numbers font-mono mt-1 flex items-center space-x-1 ${
              totalGainLoss >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalGainLoss >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1 inline" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1 inline" />
            )}
            <span>
              {totalGainLoss >= 0 ? '+' : ''}
              {formatCurrency(totalGainLoss, currency)}
            </span>
          </p>
        </div>
      </div>

      {/* Holdings Asset List */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
            <PieIcon className="w-4 h-4" />
            <span>{t.investments.holdingsBreakdown}</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {investments.length} {t.record.items}
          </span>
        </div>

        {investments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl p-6 bg-[var(--bg-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              {t.investments.noAssets}
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.investments.addAsset}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {investments.map((inv) => {
              const Icon = getCategoryIcon(inv.category);
              const costInCur = convertCurrency(inv.costBasis, inv.currency, currency, rates);
              const valInCur = convertCurrency(inv.currentValue, inv.currency, currency, rates);
              const gain = valInCur - costInCur;
              const gainPct = costInCur > 0 ? ((gain / costInCur) * 100).toFixed(1) : '0.0';
              const hasDiff = Math.abs(gain) > 1;

              return (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] hover:border-[var(--border-strong)] transition-all space-y-3 group shadow-xs"
                >
                  {/* Top Bar: Icon + Name & Category Pill + Action Buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shadow-xs shrink-0">
                        <Icon className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[var(--text-main)] truncate">
                          {inv.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {t.investmentCategories[inv.category]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(inv)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                        title={t.actions.edit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingAsset(inv)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title={t.actions.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar: Modal/Cost vs Market Valuation & Return */}
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] font-medium block">
                        {t.investments.costBasis}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-muted)] tabular-numbers font-mono">
                        {formatCurrency(costInCur, currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] font-medium block">
                        {t.investments.currentValue}
                      </span>
                      <div className="flex items-center space-x-2 justify-end">
                        <span className="text-sm sm:text-base font-bold text-[var(--text-main)] tabular-numbers font-mono">
                          {formatCurrency(valInCur, currency)}
                        </span>
                        {hasDiff && (
                          <span
                            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border inline-flex items-center ${
                              gain >= 0
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {gain >= 0 ? '+' : ''}
                            {gainPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal (Liquid Glass Modal with Safe Backdrop Click) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xl animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            className="liquid-glass-modal rounded-3xl w-full max-w-md my-auto p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {editingId ? t.investments.editAsset : t.investments.addAsset}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  {t.investments.assetName}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    category === 'gold'
                      ? (language === 'ja' ? '例: 純金積立、金地金 10g' : 'e.g. Physical Gold (Antam) or Digital Gold')
                      : category === 'crypto'
                      ? (language === 'ja' ? '例: ビットコイン (BTC)、イーサリアム' : 'e.g. Bitcoin (BTC), Ethereum')
                      : category === 'stock'
                      ? (language === 'ja' ? '例: トヨタ自動車 (7203)、Apple (AAPL)' : 'e.g. Apple (AAPL), BBCA')
                      : category === 'deposit'
                      ? (language === 'ja' ? '例: 定期預金 1年' : 'e.g. Bank Fixed Deposit')
                      : (language === 'ja' ? '例: eMAXIS Slim 全世界株式、S&P 500' : 'e.g. S&P 500 ETF, BTC, or Gold')
                  }
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  {t.investments.assetCategory}
                </label>
                <CustomSelect
                  value={category}
                  onChange={(val) => setCategory(val)}
                  options={assetCategoryOptions}
                />
              </div>

              {/* Single Primary Amount Input */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  {t.investments.amountInvested} ({currency})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={costBasisStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setCostBasisStr(formatNumberWithCommas(raw));
                      if (!isCustomValuation) {
                        setCurrentValueStr(formatNumberWithCommas(raw));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl pl-4 pr-14 py-2.5 text-sm font-bold text-[var(--text-main)] tabular-numbers font-mono outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Optional Custom Market Valuation Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomValuation;
                    setIsCustomValuation(next);
                    if (next && !currentValueStr) {
                      setCurrentValueStr(costBasisStr);
                    }
                  }}
                  className="text-xs font-medium text-[var(--accent-emerald)] hover:underline inline-flex items-center space-x-1.5 cursor-pointer py-1"
                >
                  <span className="w-4 h-4 rounded-full border border-[var(--border-strong)] flex items-center justify-center text-[10px] font-bold">
                    {isCustomValuation ? '−' : '+'}
                  </span>
                  <span>{t.investments.customValuationToggle}</span>
                </button>

                {isCustomValuation && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2 animate-fade-in">
                    <label className="text-xs font-semibold text-[var(--text-muted)] block">
                      {t.investments.currentValue} ({currency})
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currentValueStr}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          setCurrentValueStr(formatNumberWithCommas(raw));
                        }}
                        placeholder={costBasisStr || '0'}
                        className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl pl-3 pr-14 py-2 text-xs font-bold text-[var(--text-main)] tabular-numbers font-mono outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                        {currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                      {t.investments.customValuationHint}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all cursor-pointer"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingAsset}
        title={language === "ja" ? "資産の削除" : "Delete Investment Asset"}
        description={language === "ja" ? "この投資・資産データを削除してもよろしいですか？" : "Are you sure you want to remove this asset from your portfolio?"}
        itemName={deletingAsset ? `${deletingAsset.name} (${formatCurrency(convertCurrency(deletingAsset.currentValue, deletingAsset.currency || "JPY", currency, rates), currency)})` : undefined}
        language={language}
        onConfirm={() => {
          if (deletingAsset) {
            onDeleteInvestment(deletingAsset.id);
            setDeletingAsset(null);
          }
        }}
        onClose={() => setDeletingAsset(null)}
      />
    </div>
  );
}

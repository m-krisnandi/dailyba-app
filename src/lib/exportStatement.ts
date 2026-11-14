'use client';

import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from './currency';
import { translations } from './i18n';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

/**
 * Export Monthly Transactions to CSV
 * Supports both Web Browser (Blob download) and Native Mobile (Filesystem + Share)
 */
export async function exportMonthlyTransactionsToCSV(
  transactions: Transaction[],
  yearMonth: string, // 'YYYY-MM'
  currency: Currency,
  rates: ExchangeRates,
  language: Language
) {
  const t = translations[language];
  const filtered = transactions.filter((tx) => tx.date && tx.date.startsWith(yearMonth));

  const headers = [
    'Date',
    'Type',
    'Category',
    'Amount',
    'Currency',
    `Converted (${currency})`,
    'Funding Source',
    'Destination (Transfer)',
    'Note',
  ];

  const rows = filtered.map((tx) => {
    const isExpense = tx.type === 'expense';
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';

    const typeLabel = isTransfer
      ? t.record.typeTransfer
      : isExpense
      ? t.record.typeExpense
      : isIncome
      ? t.record.typeIncome
      : t.record.typeSavings;

    const catLabel = isTransfer
      ? 'Internal Transfer'
      : isExpense
      ? (t.expenseCategories as any)[tx.category] || tx.category
      : isIncome
      ? (t.incomeCategories as any)[tx.category] || tx.category
      : t.record.typeSavings;

    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    const sourceLabel = t.sources[tx.source] || tx.source;
    const destLabel = tx.destinationSource ? (t.sources[tx.destinationSource] || tx.destinationSource) : '';
    const cleanNote = (tx.note || '').replace(/"/g, '""');

    return [
      tx.date,
      `"${typeLabel}"`,
      `"${catLabel}"`,
      tx.amount,
      tx.currency || 'JPY',
      converted,
      `"${sourceLabel}"`,
      `"${destLabel}"`,
      `"${cleanNote}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const fileName = `dailyba_statement_${yearMonth}.csv`;

  // Native Mobile handling via Capacitor Filesystem and Share
  if (Capacitor.isNativePlatform()) {
    try {
      const fileResult = await Filesystem.writeFile({
        path: fileName,
        data: csvContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: `Dailyba Statement - ${yearMonth}`,
        text: `Dailyba Financial Statement (${yearMonth})`,
        url: fileResult.uri,
        dialogTitle: 'Share / Save Statement (.csv)',
      });
      return;
    } catch (err) {
      console.warn('Native CSV export/share failed, falling back to browser download:', err);
    }
  }

  // Web Browser fallback
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Monthly Transactions to Microsoft Excel (.xlsx)
 * Supports both Web Browser and Native Mobile (Filesystem + Share)
 */
export async function exportMonthlyTransactionsToExcel(
  transactions: Transaction[],
  yearMonth: string, // 'YYYY-MM'
  currency: Currency,
  rates: ExchangeRates,
  language: Language
) {
  const t = translations[language];
  const filtered = transactions.filter((tx) => tx.date && tx.date.startsWith(yearMonth));

  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    if (tx.type === 'income') totalIncome += converted;
    else if (tx.type === 'expense') totalExpense += converted;
  });

  const netSavings = totalIncome - totalExpense;

  // Header Rows
  const sheetData: (string | number)[][] = [
    ['DAILYBA FINANCIAL STATEMENT', '', '', '', '', '', '', '', ''],
    ['Period:', yearMonth, '', '', '', '', '', '', ''],
    ['Generated:', new Date().toLocaleDateString(), '', '', '', '', '', '', ''],
    ['Total Income:', `${currency} ${formatNumberWithCommas(totalIncome)}`, '', '', '', '', '', '', ''],
    ['Total Expense:', `${currency} ${formatNumberWithCommas(totalExpense)}`, '', '', '', '', '', '', ''],
    ['Net Cash Flow:', `${currency} ${formatNumberWithCommas(netSavings)}`, '', '', '', '', '', '', ''],
    [], // Blank separator row
    [
      'Date',
      'Type',
      'Category',
      'Funding Source',
      'Destination',
      'Description / Note',
      'Amount',
      'Currency',
      `Converted (${currency})`,
    ],
  ];

  filtered.forEach((tx) => {
    const isExpense = tx.type === 'expense';
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';

    const typeLabel = isTransfer
      ? t.record.typeTransfer
      : isExpense
      ? t.record.typeExpense
      : isIncome
      ? t.record.typeIncome
      : t.record.typeSavings;

    const catLabel = isTransfer
      ? 'Internal Transfer'
      : isExpense
      ? (t.expenseCategories as any)[tx.category] || tx.category
      : isIncome
      ? (t.incomeCategories as any)[tx.category] || tx.category
      : t.record.typeSavings;

    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    const sourceLabel = t.sources[tx.source] || tx.source;
    const destLabel = tx.destinationSource ? (t.sources[tx.destinationSource] || tx.destinationSource) : '';

    sheetData.push([
      tx.date,
      typeLabel,
      catLabel,
      sourceLabel,
      destLabel,
      tx.note || '',
      tx.amount,
      tx.currency || 'JPY',
      converted,
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set professional column widths
  ws['!cols'] = [
    { wch: 13 }, // Date
    { wch: 14 }, // Type
    { wch: 22 }, // Category
    { wch: 16 }, // Source
    { wch: 16 }, // Destination
    { wch: 30 }, // Note
    { wch: 15 }, // Amount
    { wch: 10 }, // Currency
    { wch: 18 }, // Converted
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Statement ${yearMonth}`);
  const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fileName = `dailyba_statement_${yearMonth}.xlsx`;

  // Native Mobile handling via Capacitor Filesystem and Share
  if (Capacitor.isNativePlatform()) {
    try {
      const fileResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Dailyba Statement - ${yearMonth}`,
        text: `Dailyba Financial Statement (${yearMonth})`,
        url: fileResult.uri,
        dialogTitle: 'Share / Save Excel Statement (.xlsx)',
      });
      return;
    } catch (err) {
      console.warn('Native Excel export/share failed, falling back to browser download:', err);
    }
  }

  // Web Browser fallback
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

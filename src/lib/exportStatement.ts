'use client';

import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from './currency';
import { translations } from './i18n';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DownloadResult {
  success: boolean;
  fileName: string;
  uri?: string;
  location?: string;
  error?: string;
}

/**
 * Universal helper to save or download files on both Web Browser and Native Mobile (Capacitor)
 */
export async function saveAndDownloadFile(
  fileName: string,
  content: string,
  isBase64: boolean,
  mimeType: string
): Promise<DownloadResult> {
  // 1. Native Mobile Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // Attempt writing to Directory.Documents first
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Documents,
        recursive: true,
        ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
      });

      return {
        success: true,
        fileName,
        uri: result.uri,
        location: 'Documents',
      };
    } catch (docErr) {
      console.warn('Failed writing to Directory.Documents, falling back to Directory.Cache:', docErr);
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          recursive: true,
          ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
        });

        return {
          success: true,
          fileName,
          uri: result.uri,
          location: 'Cache',
        };
      } catch (cacheErr: any) {
        console.error('Mobile file save error:', cacheErr);
        return {
          success: false,
          fileName,
          error: cacheErr?.message || 'Could not write file to device storage',
        };
      }
    }
  }

  // 2. Web Browser Environment
  try {
    let blob: Blob;

    if (isBase64) {
      const byteCharacters = atob(content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else {
      blob = new Blob([content], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      location: 'Downloads',
    };
  } catch (webErr: any) {
    console.error('Web download error:', webErr);
    return {
      success: false,
      fileName,
      error: webErr?.message || 'Download failed',
    };
  }
}

/**
 * Export Monthly Transactions to CSV (.csv)
 */
export async function exportMonthlyTransactionsToCSV(
  transactions: Transaction[],
  yearMonth: string, // 'YYYY-MM'
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): Promise<DownloadResult> {
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

  return saveAndDownloadFile(fileName, csvContent, false, 'text/csv;charset=utf-8;');
}

/**
 * Export Monthly Transactions to Microsoft Excel (.xlsx)
 */
export async function exportMonthlyTransactionsToExcel(
  transactions: Transaction[],
  yearMonth: string, // 'YYYY-MM'
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): Promise<DownloadResult> {
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

  const sheetData: (string | number)[][] = [
    ['DAILYBA FINANCIAL STATEMENT', '', '', '', '', '', '', '', ''],
    ['Period:', yearMonth, '', '', '', '', '', '', ''],
    ['Generated:', new Date().toLocaleDateString(), '', '', '', '', '', '', ''],
    ['Total Income:', `${currency} ${formatNumberWithCommas(totalIncome)}`, '', '', '', '', '', '', ''],
    ['Total Expense:', `${currency} ${formatNumberWithCommas(totalExpense)}`, '', '', '', '', '', '', ''],
    ['Net Cash Flow:', `${currency} ${formatNumberWithCommas(netSavings)}`, '', '', '', '', '', '', ''],
    [],
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

  ws['!cols'] = [
    { wch: 13 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Statement ${yearMonth}`);
  const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fileName = `dailyba_statement_${yearMonth}.xlsx`;

  return saveAndDownloadFile(
    fileName,
    base64Data,
    true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/**
 * Export Monthly Transactions to Portable Document Format (.pdf)
 */
export async function exportMonthlyTransactionsToPDF(
  transactions: Transaction[],
  yearMonth: string, // 'YYYY-MM'
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): Promise<DownloadResult> {
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

  // Initialize jsPDF document in A4 format (points unit, 595.28 x 841.89 pt)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // 1. Header & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Dailyba', 40, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Daily Balance & Wealth Tracker • Financial Statement', 40, 68);

  // Period on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(yearMonth, 555, 52, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 555, 68, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1.5);
  doc.line(40, 78, 555, 78);

  // 2. Summary KPI Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(40, 90, 515, 46, 6, 6, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.8);
  doc.roundedRect(40, 90, 515, 46, 6, 6, 'S');

  // Total Income
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL INCOME', 55, 105);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`+${currency} ${formatNumberWithCommas(totalIncome)}`, 55, 123);

  // Total Expense
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EXPENSE', 230, 105);
  doc.setFontSize(11);
  doc.setTextColor(244, 63, 94); // rose-500
  doc.text(`-${currency} ${formatNumberWithCommas(totalExpense)}`, 230, 123);

  // Net Cash Flow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NET CASH FLOW', 405, 105);
  doc.setFontSize(11);
  if (netSavings >= 0) {
    doc.setTextColor(99, 102, 241); // indigo-500
    doc.text(`+${currency} ${formatNumberWithCommas(netSavings)}`, 405, 123);
  } else {
    doc.setTextColor(244, 63, 94); // rose-500
    doc.text(`-${currency} ${formatNumberWithCommas(Math.abs(netSavings))}`, 405, 123);
  }

  // 3. Transactions Table
  const tableRows = filtered.map((tx) => {
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
    const sourceText = isTransfer
      ? `${t.sources[tx.source] || tx.source} -> ${t.sources[tx.destinationSource || 'ewallet'] || tx.destinationSource || 'E-Wallet'}`
      : t.sources[tx.source] || tx.source;

    const sign = isExpense ? '-' : isIncome ? '+' : '';
    const formattedAmt = `${sign}${currency} ${formatNumberWithCommas(converted)}`;

    return [
      tx.date,
      typeLabel,
      catLabel,
      sourceText,
      tx.note || '-',
      formattedAmt,
    ];
  });

  autoTable(doc, {
    startY: 150,
    head: [['Date', 'Type', 'Category', 'Source', 'Description', `Amount (${currency})`]],
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'No transactions recorded', '-', '-', '-']],
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 55 },
      2: { cellWidth: 85 },
      3: { cellWidth: 85 },
      4: { cellWidth: 128 },
      5: { cellWidth: 100, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'Dailyba Personal Finance Vault • Privacy-First & Locally Encrypted Statement',
        40,
        820
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber}`,
        555,
        820,
        { align: 'right' }
      );
    },
  });

  const base64Data = doc.output('datauristring').split(',')[1];
  const fileName = `dailyba_statement_${yearMonth}.pdf`;

  return saveAndDownloadFile(fileName, base64Data, true, 'application/pdf');
}

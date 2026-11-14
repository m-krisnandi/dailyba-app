'use client';

import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from './currency';
import { translations } from './i18n';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TargetExportLocation = 'DOCUMENTS' | 'DOWNLOADS' | 'SYSTEM_PICKER';

export interface DownloadResult {
  success: boolean;
  fileName: string;
  uri?: string;
  location?: string;
  error?: string;
}

/**
 * Universal helper to save or download files on both Web Browser and Native Mobile (Capacitor)
 * Supports choosing target location: Documents, Downloads, or System Picker (Save As)
 */
export async function saveAndDownloadFile(
  fileName: string,
  content: string,
  isBase64: boolean,
  mimeType: string,
  targetLocation: TargetExportLocation = 'DOCUMENTS'
): Promise<DownloadResult> {
  // 1. Native Mobile Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // If user requested System Picker (Save As) on Mobile, write to cache and trigger system file saver / share
      if (targetLocation === 'SYSTEM_PICKER') {
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          recursive: true,
          ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
        });

        await Share.share({
          title: `Dailyba Statement`,
          text: `Save ${fileName} to chosen folder`,
          url: fileResult.uri,
          dialogTitle: 'Save As / Pilih Folder Penyimpanan',
        });

        return {
          success: true,
          fileName,
          uri: fileResult.uri,
          location: 'Folder Pilihan (System)',
        };
      }

      // Try chosen Directory (DOWNLOADS or DOCUMENTS)
      if (targetLocation === 'DOWNLOADS') {
        try {
          // On Android, writing to ExternalStorage "Download/filename" saves to public Downloads folder
          const result = await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: content,
            directory: Directory.ExternalStorage,
            recursive: true,
            ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
          });

          return {
            success: true,
            fileName,
            uri: result.uri,
            location: 'Downloads',
          };
        } catch (downloadErr) {
          console.warn('ExternalStorage Download/ write failed, trying Documents:', downloadErr);
        }
      }

      // Default or fallback: write to Directory.Documents
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
      console.warn('Failed writing to chosen directory, falling back to Directory.Cache:', docErr);
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

    // Check if user requested System Picker (Save As) and browser supports File System Access API
    if (targetLocation === 'SYSTEM_PICKER' && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const ext = '.' + fileName.split('.').pop();
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Financial Statement',
              accept: { [mimeType]: [ext] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          success: true,
          fileName,
          location: 'Folder Pilihan',
        };
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          return { success: false, fileName, error: 'Download cancelled' };
        }
        console.warn('File picker failed, falling back to standard download:', pickerErr);
      }
    }

    // Standard Web Download
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
      location: targetLocation === 'DOCUMENTS' ? 'Documents' : 'Downloads',
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
 * Generate CSV Content string
 */
export function generateMonthlyCSVText(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): string {
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

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate Excel data grid and Base64 string
 */
export function generateMonthlyExcelData(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): { sheetData: (string | number)[][]; base64: string } {
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
  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return { sheetData, base64 };
}

/**
 * Generate PDF Base64 string
 */
export function generateMonthlyPDFBase64(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language
): string {
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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(yearMonth, 555, 52, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 555, 68, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1.5);
  doc.line(40, 78, 555, 78);

  // 2. Summary KPI Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 90, 515, 46, 6, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.roundedRect(40, 90, 515, 46, 6, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL INCOME', 55, 105);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`+${currency} ${formatNumberWithCommas(totalIncome)}`, 55, 123);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EXPENSE', 230, 105);
  doc.setFontSize(11);
  doc.setTextColor(244, 63, 94);
  doc.text(`-${currency} ${formatNumberWithCommas(totalExpense)}`, 230, 123);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NET CASH FLOW', 405, 105);
  doc.setFontSize(11);
  if (netSavings >= 0) {
    doc.setTextColor(99, 102, 241);
    doc.text(`+${currency} ${formatNumberWithCommas(netSavings)}`, 405, 123);
  } else {
    doc.setTextColor(244, 63, 94);
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
      fillColor: [30, 41, 59],
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
      fillColor: [248, 250, 252],
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
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
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

  return doc.output('datauristring').split(',')[1];
}

/**
 * High-level export actions
 */
export async function exportMonthlyTransactionsToCSV(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language,
  location: TargetExportLocation = 'DOCUMENTS'
): Promise<DownloadResult> {
  const content = generateMonthlyCSVText(transactions, yearMonth, currency, rates, language);
  const fileName = `dailyba_statement_${yearMonth}.csv`;
  return saveAndDownloadFile(fileName, content, false, 'text/csv;charset=utf-8;', location);
}

export async function exportMonthlyTransactionsToExcel(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language,
  location: TargetExportLocation = 'DOCUMENTS'
): Promise<DownloadResult> {
  const { base64 } = generateMonthlyExcelData(transactions, yearMonth, currency, rates, language);
  const fileName = `dailyba_statement_${yearMonth}.xlsx`;
  return saveAndDownloadFile(
    fileName,
    base64,
    true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    location
  );
}

export async function exportMonthlyTransactionsToPDF(
  transactions: Transaction[],
  yearMonth: string,
  currency: Currency,
  rates: ExchangeRates,
  language: Language,
  location: TargetExportLocation = 'DOCUMENTS'
): Promise<DownloadResult> {
  const base64 = generateMonthlyPDFBase64(transactions, yearMonth, currency, rates, language);
  const fileName = `dailyba_statement_${yearMonth}.pdf`;
  return saveAndDownloadFile(fileName, base64, true, 'application/pdf', location);
}

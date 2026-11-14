'use client';

import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from './currency';
import { translations } from './i18n';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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
  cancelled?: boolean;
}

interface NativeFileSaverPluginType {
  saveWithPicker(options: {
    fileName: string;
    mimeType: string;
    cachedPath?: string;
    content?: string;
    isBase64?: boolean;
  }): Promise<{ success: boolean; uri: string; fileName: string; location: string }>;
}

const NativeFileSaver = registerPlugin<NativeFileSaverPluginType>('NativeFileSaver');

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
      // If user requested System Picker (Save As) on Mobile, directly invoke Android File Manager (SAF)
      if (targetLocation === 'SYSTEM_PICKER') {
        try {
          let cachedPath: string | undefined;
          try {
            const cacheResult = await Filesystem.writeFile({
              path: fileName,
              data: content,
              directory: Directory.Cache,
              recursive: true,
              ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
            });
            if (cacheResult.uri) {
              cachedPath = cacheResult.uri.startsWith('file://')
                ? decodeURIComponent(cacheResult.uri.replace('file://', ''))
                : cacheResult.uri;
            }
          } catch (cErr) {
            console.warn('Cache write before picker warning:', cErr);
          }

          const pickerResult = await NativeFileSaver.saveWithPicker({
            fileName,
            mimeType,
            cachedPath,
            content: cachedPath ? undefined : content,
            isBase64,
          });

          return {
            success: true,
            fileName: pickerResult.fileName || fileName,
            uri: pickerResult.uri,
            location: pickerResult.location || 'Folder Pilihan (File Manager)',
          };
        } catch (pickerErr: any) {
          const errMsg = pickerErr?.message || String(pickerErr);
          if (errMsg.toLowerCase().includes('cancel')) {
            return {
              success: false,
              fileName,
              cancelled: true,
              error: 'Pemilihan folder dibatalkan',
            };
          }
          console.warn('NativeFileSaver error, falling back to cache:', pickerErr);
          const fallbackResult = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Cache,
            recursive: true,
            ...(isBase64 ? {} : { encoding: Encoding.UTF8 }),
          });

          return {
            success: true,
            fileName,
            uri: fallbackResult.uri,
            location: 'Cache',
          };
        }
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
          return { success: false, fileName, cancelled: true, error: 'Pemilihan folder dibatalkan' };
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
    'ID',
    'Date',
    'Type',
    'Category',
    'Source',
    'Destination',
    'Amount (Original)',
    'Original Currency',
    `Amount (${currency})`,
    'Note',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[][] = filtered.map((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    return [
      tx.id,
      tx.date,
      tx.type,
      tx.category,
      t.sources[tx.source] || tx.source,
      tx.destinationSource ? t.sources[tx.destinationSource] || tx.destinationSource : '',
      String(tx.amount),
      tx.currency || 'JPY',
      String(Math.round(converted * 100) / 100),
      tx.note || '',
    ];
  });

  const csvRows = [headers.map(escapeCSV).join(',')];
  rows.forEach((r) => {
    csvRows.push(r.map(escapeCSV).join(','));
  });

  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Generate Excel data structure for preview & export
 */
export function generateMonthlyExcelData(
  transactions: Transaction[],
  yearMonth: string,
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

  const sheetData: (string | number)[][] = [
    ['DAILYBA FINANCIAL STATEMENT - ' + yearMonth],
    ['Generated at:', new Date().toLocaleString()],
    ['Currency:', currency],
    ['Total Income:', totalIncome],
    ['Total Expense:', totalExpense],
    ['Net Savings:', netSavings],
    [],
    [
      'Date',
      'Type',
      'Category',
      'Source / Account',
      'Destination Account',
      'Description',
      `Original Amount`,
      'Orig Currency',
      `Converted Amount (${currency})`,
    ],
  ];

  filtered.forEach((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    const typeLabel =
      tx.type === 'transfer'
        ? t.record.typeTransfer
        : tx.type === 'expense'
        ? t.record.typeExpense
        : tx.type === 'income'
        ? t.record.typeIncome
        : t.record.typeSavings;

    const catLabel =
      tx.type === 'transfer'
        ? 'Transfer'
        : tx.type === 'expense'
        ? (t.expenseCategories as any)[tx.category] || tx.category
        : tx.type === 'income'
        ? (t.incomeCategories as any)[tx.category] || tx.category
        : t.record.typeSavings;

    sheetData.push([
      tx.date,
      typeLabel,
      catLabel,
      t.sources[tx.source] || tx.source,
      tx.destinationSource ? t.sources[tx.destinationSource] || tx.destinationSource : '-',
      tx.note || '',
      tx.amount,
      tx.currency || 'JPY',
      Math.round(converted * 100) / 100,
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 25 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Statement_${yearMonth}`);
  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    sheetData,
    base64,
  };
}

/**
 * Generate PDF document base64
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

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Dailyba', 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Financial Statement & Wealth Report', 14, 21);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(yearMonth, 196, 14, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 21, { align: 'right' });

  const kpiY = 35;
  const kpiW = 58;
  const kpiH = 20;

  // Income Card
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INCOME', 18, kpiY + 7);
  doc.setFontSize(11);
  doc.text(`+${currency} ${formatNumberWithCommas(totalIncome)}`, 18, kpiY + 15);

  // Expense Card
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(76, kpiY, kpiW, kpiH, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL EXPENSE', 80, kpiY + 7);
  doc.setFontSize(11);
  doc.text(`-${currency} ${formatNumberWithCommas(totalExpense)}`, 80, kpiY + 15);

  // Net Savings Card
  doc.setFillColor(netSavings >= 0 ? 238 : 254, netSavings >= 0 ? 242 : 242, netSavings >= 0 ? 255 : 242);
  doc.setDrawColor(netSavings >= 0 ? 199 : 254, netSavings >= 0 ? 210 : 202, netSavings >= 0 ? 254 : 202);
  doc.roundedRect(138, kpiY, kpiW, kpiH, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(netSavings >= 0 ? 79 : 185, netSavings >= 0 ? 70 : 28, netSavings >= 0 ? 229 : 28);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SAVINGS', 142, kpiY + 7);
  doc.setFontSize(11);
  doc.text(`${netSavings >= 0 ? '+' : ''}${currency} ${formatNumberWithCommas(netSavings)}`, 142, kpiY + 15);

  const tableBody = filtered.map((tx) => {
    const isExpense = tx.type === 'expense';
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';

    const typeLabel = isTransfer
      ? 'Transfer'
      : isExpense
      ? 'Expense'
      : isIncome
      ? 'Income'
      : 'Savings';

    const catLabel = isTransfer
      ? 'Transfer'
      : isExpense
      ? (t.expenseCategories as any)[tx.category] || tx.category
      : isIncome
      ? (t.incomeCategories as any)[tx.category] || tx.category
      : 'Savings';

    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    const sourceText = isTransfer
      ? `${t.sources[tx.source] || tx.source} -> ${t.sources[tx.destinationSource || 'ewallet'] || tx.destinationSource || 'E-Wallet'}`
      : t.sources[tx.source] || tx.source;

    const formattedAmount = `${isExpense ? '-' : isIncome ? '+' : ''}${currency} ${formatNumberWithCommas(converted)}`;

    return [
      tx.date,
      typeLabel,
      catLabel,
      sourceText,
      tx.note || '-',
      formattedAmount,
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [['Date', 'Type', 'Category', 'Account', 'Description', `Amount (${currency})`]],
    body: tableBody.length > 0 ? tableBody : [['-', '-', 'No transactions found', '-', '-', '-']],
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      font: 'helvetica',
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Dailyba Personal Finance Vault • Page ${data.pageNumber} of ${pageCount}`,
        14,
        290
      );
    },
  });

  const pdfOutput = doc.output('datauristring');
  const base64 = pdfOutput.split(',')[1];
  return base64;
}

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

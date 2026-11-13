'use client';

import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from './currency';
import { translations } from './i18n';

export function exportMonthlyTransactionsToCSV(
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
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dailyba_statement_${yearMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlyStatementPrintPDF(
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

  const rowsHtml = filtered
    .map((tx) => {
      const isExpense = tx.type === 'expense';
      const isIncome = tx.type === 'income';
      const isTransfer = tx.type === 'transfer';

      const typeBadgeColor = isExpense
        ? 'color: #f43f5e; background: #fff1f2;'
        : isIncome
        ? 'color: #10b981; background: #ecfdf5;'
        : isTransfer
        ? 'color: #6366f1; background: #eef2ff;'
        : 'color: #f59e0b; background: #fffbeb;';

      const typeLabel = isTransfer
        ? t.record.typeTransfer
        : isExpense
        ? t.record.typeExpense
        : isIncome
        ? t.record.typeIncome
        : t.record.typeSavings;

      const catLabel = isTransfer
        ? `${t.sources[tx.source] || tx.source} → ${t.sources[tx.destinationSource || 'ewallet'] || tx.destinationSource || 'E-Wallet'}`
        : isExpense
        ? (t.expenseCategories as any)[tx.category] || tx.category
        : isIncome
        ? (t.incomeCategories as any)[tx.category] || tx.category
        : t.record.typeSavings;

      const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      const sign = isExpense ? '-' : isIncome ? '+' : '';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 10px; font-family: monospace;">${tx.date}</td>
          <td style="padding: 8px 10px;">
            <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; ${typeBadgeColor}">
              ${typeLabel}
            </span>
          </td>
          <td style="padding: 8px 10px; font-weight: 600;">${catLabel}</td>
          <td style="padding: 8px 10px; color: #64748b;">${tx.note || '-'}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold;">
            ${sign}${currency} ${formatNumberWithCommas(converted)}
          </td>
        </tr>
      `;
    })
    .join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dailyba Statement - ${yearMonth}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }
          .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #f8fafc; }
          .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .card-val { font-size: 18px; font-weight: 800; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; padding: 10px; background: #f1f5f9; font-size: 10px; text-transform: uppercase; color: #475569; }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Dailyba</div>
            <div style="font-size: 12px; color: #64748b;">Daily Balance & Wealth Tracker • Financial Statement</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 700;">${yearMonth}</div>
            <div style="font-size: 11px; color: #64748b;">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="card-grid">
          <div class="card">
            <div class="card-title">${t.summary.totalIncome}</div>
            <div class="card-val" style="color: #10b981;">+${currency} ${formatNumberWithCommas(totalIncome)}</div>
          </div>
          <div class="card">
            <div class="card-title">${t.summary.totalExpense}</div>
            <div class="card-val" style="color: #f43f5e;">-${currency} ${formatNumberWithCommas(totalExpense)}</div>
          </div>
          <div class="card">
            <div class="card-title">${t.summary.netCashFlow}</div>
            <div class="card-val" style="color: ${netSavings >= 0 ? '#10b981' : '#f43f5e'};">
              ${netSavings >= 0 ? '+' : ''}${currency} ${formatNumberWithCommas(netSavings)}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description / Note</th>
              <th style="text-align: right;">Amount (${currency})</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions found for this period.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Dailyba Personal Finance Vault • Privacy-First & Locally Encrypted Statement
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

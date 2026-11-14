'use client';

import { useEffect, useState } from 'react';
import { Currency } from '@/types/finance';
import { evaluateInlineMath } from './mathParser';

export interface ExchangeRates {
  JPY: number;
  IDR: number;
  USD: number;
  MMK: number;
  updatedAt: string;
}

// Fallback baseline rates (Base JPY) - Real-world open market rates
export const DEFAULT_RATES: ExchangeRates = {
  JPY: 1,
  IDR: 114.18,
  USD: 0.006314,
  MMK: 28.0, // Real-world market rate (1 JPY ≈ 28 MMK / 1 USD ≈ 4,430 MMK)
  updatedAt: '2026-11-08',
};

const STORAGE_RATES_KEY = 'dailyba_exchange_rates_v2';

export function getCachedRates(): ExchangeRates {
  if (typeof window === 'undefined') return DEFAULT_RATES;
  try {
    const raw = localStorage.getItem(STORAGE_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure MMK is using the realistic market rate (> 20) instead of the outdated 13.26 artificial peg
      if (parsed.JPY && parsed.IDR && parsed.USD && parsed.MMK && parsed.MMK > 20) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load cached rates:', e);
  }
  return DEFAULT_RATES;
}

export function saveCachedRates(rates: ExchangeRates) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(rates));
    window.dispatchEvent(new Event('kakeibo_rates_updated'));
  } catch (e) {
    console.error('Failed to cache rates:', e);
  }
}

export async function fetchLiveExchangeRates(): Promise<ExchangeRates | null> {
  try {
    let jpyRates: any = null;

    // 1. Primary: open.er-api.com
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/JPY', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result === 'success' && data.rates) {
          jpyRates = data.rates;
        }
      }
    } catch {
      // ignore, fallback to secondary
    }

    // 2. Secondary fallback: fawazahmed0 currency api on jsdelivr CDN
    if (!jpyRates) {
      try {
        const fallbackRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json');
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData && fbData.jpy) {
            jpyRates = {
              IDR: fbData.jpy.idr,
              USD: fbData.jpy.usd,
            };
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Fetch real-world open market Myanmar Kyat rate (curb/street rate)
    // Standard central bank pegs (~13.25) are not used in actual market transactions in Myanmar.
    let marketMMKRate = 28.0;
    try {
      const mmkRes = await fetch('https://myanmar-currency-api.github.io/api/latest.json');
      if (mmkRes.ok) {
        const mmkData = await mmkRes.json();
        const jpnItem = mmkData?.data?.find((x: any) => x.currency === 'JPN');
        if (jpnItem && jpnItem.buy && jpnItem.sell) {
          const buy = parseFloat(jpnItem.buy);
          const sell = parseFloat(jpnItem.sell);
          if (buy > 0 && sell > 0) {
            marketMMKRate = Math.round(((buy + sell) / 2) * 100) / 100;
          }
        } else {
          // If direct JPN isn't available, derive from USD/MMK market rate
          const usdItem = mmkData?.data?.find((x: any) => x.currency === 'USD');
          if (usdItem && jpyRates?.USD) {
            const usdMmk = (parseFloat(usdItem.buy) + parseFloat(usdItem.sell)) / 2;
            marketMMKRate = Math.round(usdMmk * Number(jpyRates.USD) * 100) / 100;
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch market MMK rate, using real-market baseline:', e);
    }

    if (jpyRates) {
      const rates: ExchangeRates = {
        JPY: 1,
        IDR: Number(jpyRates.IDR) || 114.18,
        USD: Number(jpyRates.USD) || 0.006314,
        MMK: marketMMKRate || 28.0,
        updatedAt: new Date().toISOString(),
      };
      saveCachedRates(rates);
      return rates;
    }
  } catch (e) {
    console.warn('Could not fetch live rates, using cached/fallback:', e);
  }
  return null;
}

/**
 * React hook to get reactive live exchange rates
 */
export function useExchangeRates(): ExchangeRates {
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);

  useEffect(() => {
    // 1. Initial cached rates
    const cached = getCachedRates();
    setRates(cached);

    // 2. Automatic refresh if cache is older than 12 hours or on startup
    const checkAndRefresh = () => {
      const current = getCachedRates();
      const lastUpdate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const isStale = Date.now() - lastUpdate > 12 * 60 * 60 * 1000;
      if (isStale) {
        fetchLiveExchangeRates().then((live) => {
          if (live) setRates(live);
        });
      }
    };

    checkAndRefresh();

    // Periodic 12-hour background updater interval
    const interval = setInterval(checkAndRefresh, 12 * 60 * 60 * 1000);

    const handleUpdate = () => {
      setRates(getCachedRates());
    };

    window.addEventListener('kakeibo_rates_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kakeibo_rates_updated', handleUpdate);
    };
  }, []);

  return rates;
}

/**
 * Converts an amount from one currency to another using base JPY rates
 */
export function convertCurrency(
  amount: number,
  from: Currency = 'JPY',
  to: Currency = 'JPY',
  rates: ExchangeRates = DEFAULT_RATES
): number {
  if (from === to || !Number.isFinite(amount)) return amount;

  const validRates = rates && rates.IDR && rates.USD ? rates : DEFAULT_RATES;

  // Convert `from` -> JPY first
  let inJPY = amount;
  if (from === 'IDR') {
    inJPY = amount / (validRates.IDR || 114.18);
  } else if (from === 'USD') {
    inJPY = amount / (validRates.USD || 0.006314);
  } else if (from === 'MMK') {
    inJPY = amount / (validRates.MMK || 28.0);
  }

  // Convert JPY -> `to`
  if (to === 'JPY') {
    return Math.round(inJPY);
  }
  if (to === 'IDR') {
    return Math.round(inJPY * (validRates.IDR || 114.18));
  }
  if (to === 'MMK') {
    return Math.round(inJPY * (validRates.MMK || 28.0));
  }
  if (to === 'USD') {
    return Math.round(inJPY * (validRates.USD || 0.006314) * 100) / 100;
  }

  return inJPY;
}

/**
 * Live formats numeric strings with comma thousand separators (e.g. "4000" -> "4,000", "1250.5" -> "1,250.5")
 */
export function formatNumberWithCommas(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const str = String(raw).replace(/,/g, '').trim();
  if (str === '') return '';

  // Edge cases while user is typing
  if (str === '-') return '-';
  if (str === '.') return '0.';
  if (str === '-.') return '-0.';

  const isNegative = str.startsWith('-');
  const unsigned = isNegative ? str.slice(1) : str;
  const parts = unsigned.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts.slice(1).join('') : null;

  // Format integer portion with commas
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\\d))/g, ',');
  const prefix = isNegative ? '-' : '';

  if (decPart !== null) {
    return `${prefix}${formattedInt}.${decPart}`;
  }
  return `${prefix}${formattedInt}`;
}

/**
 * Extracts a clean numeric float from a comma-formatted string, shorthand or inline math expression
 * (e.g. "4,000" -> 4000, "100.000" -> 100000, "10000+20000" -> 30000, "50k" -> 50000)
 */
export function parseRawNumber(formatted: string | number | null | undefined): number {
  if (typeof formatted === 'number') return Number.isFinite(formatted) ? formatted : 0;
  if (!formatted) return 0;
  
  const str = String(formatted).trim();
  if (!str) return 0;

  // If arithmetic operators or shortcuts (k, rb) are present, evaluate dynamically
  if (/[+\-*/xX×÷]|(?:k|rb)/i.test(str)) {
    const evalRes = evaluateInlineMath(str);
    if (evalRes.isValid && evalRes.result !== null) {
      return evalRes.result;
    }
  }

  // Convert full-width numbers to ASCII and strip commas
  let cleaned = str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/,/g, '');

  // Convert Indonesian/European thousand-separator dots (e.g. "100.000" -> "100000", "1.250.000" -> "1250000")
  while (/(\d+)\.(\d{3})(?!\d)/.test(cleaned)) {
    cleaned = cleaned.replace(/(\d+)\.(\d{3})(?!\d)/g, '$1$2');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

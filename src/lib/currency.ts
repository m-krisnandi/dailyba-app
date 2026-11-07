'use client';

import { useEffect, useState } from 'react';
import { Currency } from '@/types/finance';

export interface ExchangeRates {
  JPY: number;
  IDR: number;
  USD: number;
  MMK: number;
  updatedAt: string;
}

// Fallback baseline rates (Base JPY)
export const DEFAULT_RATES: ExchangeRates = {
  JPY: 1,
  IDR: 114.18,
  USD: 0.006314,
  MMK: 13.26,
  updatedAt: '2026-11-07',
};

const STORAGE_RATES_KEY = 'kakeibo_exchange_rates_v1';

export function getCachedRates(): ExchangeRates {
  if (typeof window === 'undefined') return DEFAULT_RATES;
  try {
    const raw = localStorage.getItem(STORAGE_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.JPY && parsed.IDR && parsed.USD && parsed.MMK) {
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
    const res = await fetch('https://open.er-api.com/v6/latest/JPY', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      const rates: ExchangeRates = {
        JPY: 1,
        IDR: Number(data.rates.IDR) || 114.18,
        USD: Number(data.rates.USD) || 0.006314,
        MMK: Number(data.rates.MMK) || 13.26,
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

    // 2. Fetch live in background
    fetchLiveExchangeRates().then((live) => {
      if (live) setRates(live);
    });

    const handleUpdate = () => {
      setRates(getCachedRates());
    };

    window.addEventListener('kakeibo_rates_updated', handleUpdate);
    return () => {
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
    inJPY = amount / (validRates.MMK || 13.26);
  }

  // Convert JPY -> `to`
  if (to === 'JPY') {
    return Math.round(inJPY);
  }
  if (to === 'IDR') {
    return Math.round(inJPY * (validRates.IDR || 114.18));
  }
  if (to === 'MMK') {
    return Math.round(inJPY * (validRates.MMK || 13.26));
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
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = isNegative ? '-' : '';

  if (decPart !== null) {
    return `${prefix}${formattedInt}.${decPart}`;
  }
  return `${prefix}${formattedInt}`;
}

/**
 * Extracts a clean numeric float from a comma-formatted string (e.g. "4,000" -> 4000)
 */
export function parseRawNumber(formatted: string | number | null | undefined): number {
  if (typeof formatted === 'number') return Number.isFinite(formatted) ? formatted : 0;
  if (!formatted) return 0;
  const cleaned = String(formatted).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

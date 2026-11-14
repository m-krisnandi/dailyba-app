'use client';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FinanceState, Language } from '@/types/finance';
import { getTodayLocalDate } from './dateUtils';

export interface GoogleDriveBackupResult {
  success: boolean;
  message: string;
  backupTime?: string;
  fileName?: string;
}

const GD_STORAGE_KEY = 'dailyba_gdrive_last_backup';

export function getLastGoogleDriveBackupTime(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(GD_STORAGE_KEY);
    }
  } catch {}
  return null;
}

export function setLastGoogleDriveBackupTime(timeIso: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GD_STORAGE_KEY, timeIso);
    }
  } catch {}
}

/**
 * Performs a 1-tap backup to Google Drive
 * - On Mobile (Android / iOS): Writes backup JSON to cache and invokes native Share sheet targeting Google Drive
 * - On Web: Uses Web Share (if supported) or downloads the file ready for Google Drive
 */
export async function backupToGoogleDrive(
  state: FinanceState,
  language: Language = 'en'
): Promise<GoogleDriveBackupResult> {
  const isJa = language === 'ja';
  const today = getTodayLocalDate();
  const fileName = `Dailyba_Backup_${today}.json`;

  const backupPayload = {
    app: 'Dailyba',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    currency: state.currency,
    transactions: state.transactions,
    investments: state.investments,
    recurringBills: state.recurringBills,
    savingsGoalMonthly: state.savingsGoalMonthly,
    savingsGoalCurrency: state.savingsGoalCurrency,
    dailySpendTarget: state.dailySpendTarget,
    monthlyBudgets: state.monthlyBudgets,
    hiddenCategories: state.hiddenCategories,
  };

  const jsonStr = JSON.stringify(backupPayload, null, 2);

  // 1. Native Mobile Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // Write to Cache directory
      const fileResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      const uri = fileResult.uri;

      // Invoke native share sheet directly with Google Drive intent
      await Share.share({
        title: isJa ? 'Dailyba • Google Drive バックアップ' : 'Dailyba • Google Drive Backup',
        text: isJa
          ? 'Dailyba の家計簿データを Google Drive にバックアップします。'
          : 'Save your Dailyba financial data to Google Drive.',
        url: uri,
        dialogTitle: isJa ? 'Google Drive に保存' : 'Save to Google Drive',
      });

      const nowIso = new Date().toISOString();
      setLastGoogleDriveBackupTime(nowIso);

      return {
        success: true,
        fileName,
        backupTime: nowIso,
        message: isJa
          ? 'Google Drive への保存画面を開きました。保存先フォルダを選択してください。'
          : 'Google Drive dialog opened. Select your Google Drive folder to save.',
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('cancel') || errMsg.toLowerCase().includes('dismiss')) {
        return {
          success: false,
          message: isJa ? 'Google Drive への保存をキャンセルしました' : 'Google Drive backup was cancelled.',
        };
      }
      console.warn('Native Google Drive backup error:', err);
    }
  }

  // 2. Web Browser Fallback
  if (typeof window !== 'undefined') {
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], fileName, { type: 'application/json' });

      // Check if Web Share API with files is supported
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isJa ? 'Dailyba Google Drive バックアップ' : 'Dailyba Google Drive Backup',
          text: isJa
            ? 'Dailyba のデータを Google Drive に保存します。'
            : 'Save your Dailyba backup file to Google Drive.',
        });

        const nowIso = new Date().toISOString();
        setLastGoogleDriveBackupTime(nowIso);

        return {
          success: true,
          fileName,
          backupTime: nowIso,
          message: isJa
            ? 'Google Drive バックアップを送信しました！'
            : 'Backup file shared to Google Drive successfully!',
        };
      }

      // Download file directly
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      setLastGoogleDriveBackupTime(nowIso);

      return {
        success: true,
        fileName,
        backupTime: nowIso,
        message: isJa
          ? 'バックアップファイルをダウンロードしました。Google Drive へアップロード可能です。'
          : 'Backup file downloaded. You can upload it directly to your Google Drive.',
      };
    } catch (webErr: any) {
      console.warn('Web Google Drive backup error:', webErr);
    }
  }

  return {
    success: false,
    message: isJa ? 'バックアップの生成に失敗しました' : 'Failed to generate Google Drive backup.',
  };
}

/**
 * Validates and parses a restored Google Drive JSON file
 */
export function parseGoogleDriveBackupFile(content: string): Partial<FinanceState> | null {
  try {
    const data = JSON.parse(content);
    if (!data || typeof data !== 'object') return null;

    // Must contain transactions or investments or categories
    if (!Array.isArray(data.transactions) && !Array.isArray(data.investments)) {
      return null;
    }

    return {
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      investments: Array.isArray(data.investments) ? data.investments : [],
      recurringBills: Array.isArray(data.recurringBills) ? data.recurringBills : [],
      savingsGoalMonthly: typeof data.savingsGoalMonthly === 'number' ? data.savingsGoalMonthly : undefined,
      savingsGoalCurrency: data.savingsGoalCurrency,
      dailySpendTarget: typeof data.dailySpendTarget === 'number' ? data.dailySpendTarget : undefined,
      monthlyBudgets: data.monthlyBudgets && typeof data.monthlyBudgets === 'object' ? data.monthlyBudgets : undefined,
      currency: data.currency,
      hiddenCategories: Array.isArray(data.hiddenCategories) ? data.hiddenCategories : undefined,
    };
  } catch (e) {
    console.error('Error parsing Google Drive backup file:', e);
    return null;
  }
}

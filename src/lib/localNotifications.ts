'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Language, RecurringBill } from '@/types/finance';

const NOTIFICATION_ID = 202611;

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return true;
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    } catch (e) {
      console.warn('Native notification permission error:', e);
      return false;
    }
  }

  // Web Browser fallback (Standard HTML5 Notification API)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

export async function scheduleDailyReminder(
  enabled: boolean,
  timeStr: string = '20:00',
  language: Language = 'en'
): Promise<boolean> {
  if (!enabled) {
    await cancelDailyReminder();
    return true;
  }

  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '20', 10);
  const minute = parseInt(minStr || '0', 10);

  const title = language === 'ja' ? 'Dailyba • 今日の収支記録' : 'Dailyba • Daily Balance Check';
  const body =
    language === 'ja'
      ? '今日の支出や使ったお金は記録しましたか？1分でサッと記録して、日々のバランスを保ちましょう。'
      : 'Did you record your spending today? Take a quick minute to log and stay within your target.';

  // 1. Native Mobile (Android & iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) return false;

      // Cancel previous scheduled reminder
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_ID,
            title,
            body,
            schedule: {
              on: {
                hour,
                minute,
              },
              allowWhileIdle: true,
            },
            smallIcon: 'ic_launcher_round',
            iconColor: '#059669',
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn('Failed to schedule native daily reminder:', e);
      return false;
    }
  }

  // 2. Web Browser Fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) return false;

      const now = new Date();
      const target = new Date();
      target.setHours(hour, minute, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      const delay = target.getTime() - now.getTime();

      const win = window as unknown as { __dailyba_reminder_timer?: ReturnType<typeof setTimeout> };
      if (win.__dailyba_reminder_timer) {
        clearTimeout(win.__dailyba_reminder_timer);
      }

      win.__dailyba_reminder_timer = setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/icon.png',
        });
        // Reschedule for next day
        scheduleDailyReminder(true, timeStr, language);
      }, delay);

      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function cancelDailyReminder(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    } catch (e) {
      console.warn('Failed to cancel native notification:', e);
    }
  } else if (typeof window !== 'undefined') {
    const win = window as unknown as { __dailyba_reminder_timer?: ReturnType<typeof setTimeout> };
    if (win.__dailyba_reminder_timer) {
      clearTimeout(win.__dailyba_reminder_timer);
    }
  }
}

const BILL_NOTIFICATION_BASE_ID = 30000;

export async function scheduleBillDueReminders(
  bills: RecurringBill[],
  language: Language = 'en'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // First cancel previous bill notifications
    const idsToCancel = Array.from({ length: 50 }, (_, i) => ({ id: BILL_NOTIFICATION_BASE_ID + i }));
    await LocalNotifications.cancel({ notifications: idsToCancel }).catch(() => {});

    if (!Array.isArray(bills) || bills.length === 0) return;

    const notifications = bills.slice(0, 50).map((bill, index) => {
      const dueDay = Math.max(1, Math.min(31, bill.dayOfMonth || 1));
      // Remind H-2: 2 days before due date
      const remindDay = dueDay > 2 ? dueDay - 2 : (dueDay === 2 ? 30 : 28);

      const title = language === 'ja'
        ? `Dailyba • 請求予定: ${bill.name}`
        : `Dailyba • Upcoming Bill: ${bill.name}`;
      const body = language === 'ja'
        ? `${bill.name} の引き落とし日（${dueDay}日）が2日後に迫っています。残高をご確認ください。`
        : `Your recurring payment for ${bill.name} is due in 2 days (on the ${dueDay}th).`;

      return {
        id: BILL_NOTIFICATION_BASE_ID + index,
        title,
        body,
        schedule: {
          on: {
            day: remindDay,
            hour: 9,
            minute: 0,
          },
          allowWhileIdle: true,
        },
        smallIcon: 'ic_launcher_round',
        iconColor: '#6366f1',
      };
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    console.warn('Failed to schedule bill reminders:', e);
  }
}

const BUDGET_ALERT_80_ID = 40080;
const BUDGET_ALERT_100_ID = 40100;
const BUDGET_ALERT_STORAGE_PREFIX = 'dailyba_budget_alert_sent_';

/**
 * Smart Budget Alert Trigger
 * Sends a native push or browser notification when today's spending reaches 80% (Warning) or 100% (Exceeded)
 * Throttled to once per day per tier to prevent alert fatigue.
 */
export async function checkAndTriggerBudgetAlert(options: {
  dailySpent: number;
  dailyBudget: number;
  currency: string;
  language: Language;
}): Promise<void> {
  const { dailySpent, dailyBudget, currency, language } = options;
  if (!dailyBudget || dailyBudget <= 0) return;

  const ratio = dailySpent / dailyBudget;
  if (ratio < 0.8) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const tier = ratio >= 1.0 ? '100' : '80';
  const alertKey = `${BUDGET_ALERT_STORAGE_PREFIX}${todayStr}_${tier}`;

  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(alertKey)) {
      return; // Already notified today for this tier
    }
  } catch {}

  const formattedSpent = `${currency} ${Math.round(dailySpent).toLocaleString()}`;
  const formattedBudget = `${currency} ${Math.round(dailyBudget).toLocaleString()}`;

  let title = '';
  let body = '';
  const notifId = ratio >= 1.0 ? BUDGET_ALERT_100_ID : BUDGET_ALERT_80_ID;

  if (ratio >= 1.0) {
    title = language === 'ja' ? 'Dailyba • 今日の予算上限を超過しました' : 'Dailyba • Daily Budget Exceeded';
    body =
      language === 'ja'
        ? `本日の支出が予算（${formattedBudget}）を超過しました（現在: ${formattedSpent}）。`
        : `You have exceeded today's budget limit (${formattedSpent} of ${formattedBudget}). Keep mindful!`;
  } else {
    title = language === 'ja' ? 'Dailyba • 今日の予算80%に到達しました' : 'Dailyba • Budget Alert (80% Reached)';
    body =
      language === 'ja'
        ? `本日の支出が予算の80%に到達しました（現在: ${formattedSpent} / 上限: ${formattedBudget}）。`
        : `You have reached 80% of today's target budget (${formattedSpent} / ${formattedBudget}).`;
  }

  // 1. Native Mobile Notification
  if (Capacitor.isNativePlatform()) {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              smallIcon: 'ic_launcher_round',
              iconColor: ratio >= 1.0 ? '#ef4444' : '#f59e0b',
            },
          ],
        });
        try {
          localStorage.setItem(alertKey, 'true');
        } catch {}
      }
    } catch (e) {
      console.warn('Native budget alert error:', e);
    }
    return;
  }

  // 2. Web Browser Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon.png' });
      try {
        localStorage.setItem(alertKey, 'true');
      } catch {}
    } catch (e) {
      console.warn('Web budget alert error:', e);
    }
  }
}

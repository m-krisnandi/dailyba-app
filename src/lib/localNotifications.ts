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
      const delayMs = target.getTime() - now.getTime();

      // Store in window timer for the session
      const win = window as unknown as { __dailyba_reminder_timer?: ReturnType<typeof setTimeout> };
      if (win.__dailyba_reminder_timer) {
        clearTimeout(win.__dailyba_reminder_timer);
      }

      win.__dailyba_reminder_timer = setTimeout(() => {
        try {
          new Notification(title, {
            body,
            icon: '/icon.png',
          });
        } catch (e) {
          console.warn('Browser notification trigger failed:', e);
        }
      }, delayMs);

      // Instant confirmation toast notification so web users immediately verify it works
      try {
        const confirmTitle = language === 'ja' ? 'Dailyba • 通知リマインダーが有効化されました' : 'Dailyba • Daily Reminder Activated';
        const confirmBody =
          language === 'ja'
            ? `毎日 ${timeStr} にリマインダー通知をお届けします。`
            : `Daily reminder scheduled for ${timeStr} each evening.`;
        new Notification(confirmTitle, {
          body: confirmBody,
          icon: '/icon.png',
        });
      } catch {
        // Ignored if permission was silent
      }

      return true;
    } catch (e) {
      console.warn('Web notification schedule failed:', e);
      return false;
    }
  }

  return true;
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

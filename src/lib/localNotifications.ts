'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Language } from '@/types/finance';

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

  // Web Browser fallback
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

  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    } catch (e) {
      console.warn('Failed to cancel native notification:', e);
    }
  }
}

/**
 * Date Cycle Utilities for Dailyba
 * Supports standard calendar months (Day 1 - 30/31) and custom salary/payday cycles (e.g. Day 20 - 19 of next month).
 */

/**
 * Formats a Date object into 'YYYY-MM-DD' according to the user's local device timezone.
 * Unlike d.toISOString().split('T')[0] which forces UTC (GMT+0) and causes dates after midnight
 * in Asian/European/local timezones to lag behind, this evaluates getFullYear(), getMonth(), and getDate()
 * directly from the user's local clock.
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate(): string {
  return formatLocalDate(new Date());
}

export function getYesterdayLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

export function getDaysAgoLocalDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}

export interface MonthCycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isCustomCycle: boolean;
  label: string;     // e.g. "2026-11-20 ~ 2026-12-19"
  shortLabel: string;
}

export function getMonthDateRange(monthKey: string, startDay = 1): MonthCycleRange {
  const [year, month] = monthKey.split('-').map(Number);
  const safeDay = Math.max(1, Math.min(31, Math.round(startDay) || 1));

  if (safeDay === 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${monthKey}-01`;
    const endDate = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
    return {
      startDate,
      endDate,
      isCustomCycle: false,
      label: `${startDate} ~ ${endDate}`,
      shortLabel: `${monthKey}-01 ~ ${daysInMonth}`,
    };
  }

  // Custom cycle (e.g. Day 20)
  // MonthKey 2026-11 represents salary period starting 2026-11-20 to 2026-12-19
  const daysInCurrentMonth = new Date(year, month, 0).getDate();
  const startDayClamped = Math.min(safeDay, daysInCurrentMonth);
  const startDate = `${year}-${String(month).padStart(2, '0')}-${String(startDayClamped).padStart(2, '0')}`;

  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const endDayVal = Math.min(safeDay - 1, daysInNextMonth);
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(endDayVal).padStart(2, '0')}`;

  return {
    startDate,
    endDate,
    isCustomCycle: true,
    label: `${startDate} ~ ${endDate}`,
    shortLabel: `${month}/${startDayClamped} ~ ${nextMonth}/${endDayVal}`,
  };
}

export function isDateInMonthCycle(dateStr: string, monthKey: string, startDay = 1): boolean {
  if (startDay === 1) {
    return dateStr.startsWith(monthKey);
  }
  const range = getMonthDateRange(monthKey, startDay);
  return dateStr >= range.startDate && dateStr <= range.endDate;
}

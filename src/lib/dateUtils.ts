/**
 * Date Cycle Utilities for Dailyba
 * Supports standard calendar months (Day 1 - 30/31) and custom salary/payday cycles (e.g. Day 20 - 19 of next month).
 */

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

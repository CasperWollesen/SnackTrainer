import { addDays, addMonths, compareISO, daysBetween, endOfMonth, startOfMonth, startOfWeek } from './dates';
import type { ISODate } from './types';

/**
 * History periods. Calendar periods (day, ISO week, month) and rolling windows (last 7 / 31 days
 * ending on the anchor day). A period is always a closed date range `from..to`.
 */
export type PeriodKind = 'day' | 'week' | 'month' | 'last7' | 'last31';

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface Period extends DateRange {
  kind: PeriodKind;
}

/** The period of `kind` that contains `anchor` (rolling windows end on `anchor`). */
export function periodAt(kind: PeriodKind, anchor: ISODate): Period {
  switch (kind) {
    case 'day':
      return { kind, from: anchor, to: anchor };
    case 'week': {
      const from = startOfWeek(anchor);
      return { kind, from, to: addDays(from, 6) };
    }
    case 'month':
      return { kind, from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'last7':
      return { kind, from: addDays(anchor, -6), to: anchor };
    case 'last31':
      return { kind, from: addDays(anchor, -30), to: anchor };
  }
}

/** The period `steps` periods later (negative: earlier). Rolling windows move by their own length. */
export function shiftPeriod(p: Period, steps: number): Period {
  switch (p.kind) {
    case 'day':
      return periodAt('day', addDays(p.from, steps));
    case 'week':
      return periodAt('week', addDays(p.from, 7 * steps));
    case 'month':
      return periodAt('month', addMonths(p.from, steps));
    case 'last7':
      return periodAt('last7', addDays(p.to, 7 * steps));
    case 'last31':
      return periodAt('last31', addDays(p.to, 31 * steps));
  }
}

export function periodLength(r: DateRange): number {
  return daysBetween(r.from, r.to) + 1;
}

export function containsDate(r: DateRange, date: ISODate): boolean {
  return compareISO(r.from, date) <= 0 && compareISO(date, r.to) <= 0;
}

/** True when the next period would start after today (nothing to step forward to). */
export function isLatest(p: Period, today: ISODate): boolean {
  return compareISO(shiftPeriod(p, 1).from, today) > 0;
}

export interface Comparison {
  /** The part of the period that has happened: `from..min(to, today)`. */
  current: DateRange;
  /** The previous period, cut to the same number of days when the current one is still running. */
  previous: DateRange;
  /** True when both ranges were cut ("so far" comparison). */
  partial: boolean;
}

/**
 * What to compare a period with. A finished period is compared with the whole previous one.
 * A running calendar period (this week, this month) is compared "so far": Monday–Wednesday
 * with last Monday–Wednesday, 1–23 September with 1–23 August, so progress is fair mid-period.
 */
export function comparisonFor(p: Period, today: ISODate): Comparison {
  const prev = shiftPeriod(p, -1);
  if (compareISO(p.to, today) <= 0) return { current: { from: p.from, to: p.to }, previous: { from: prev.from, to: prev.to }, partial: false };
  const sameDay = addDays(prev.from, daysBetween(p.from, today));
  const prevTo = compareISO(sameDay, prev.to) < 0 ? sameDay : prev.to;
  return { current: { from: p.from, to: today }, previous: { from: prev.from, to: prevTo }, partial: true };
}

/** `count` consecutive periods ending with `p`, oldest first (for trend charts). */
export function recentPeriods(p: Period, count: number): Period[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(p, i - (count - 1)));
}

import type { ISODate, LocalDateTime, TimeString } from './types';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // Round-trip through a local Date to reject e.g. 2026-02-30.
  const dt = new Date(y, mo - 1, d, 12);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function isTimeString(value: unknown): value is TimeString {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function isLocalDateTime(value: unknown): value is LocalDateTime {
  if (typeof value !== 'string') return false;
  const m = DATETIME_RE.exec(value);
  return m !== null && isISODate(m[1]);
}

/** Local calendar date of the given instant. Never uses UTC. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local wall-clock time of the given instant as HH:MM. */
export function toTimeString(date: Date): TimeString {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Local "YYYY-MM-DDTHH:MM" of the given instant. */
export function toLocalDateTime(date: Date): LocalDateTime {
  return `${toISODate(date)}T${toTimeString(date)}`;
}

export function joinDateTime(date: ISODate, time: TimeString): LocalDateTime {
  return `${date}T${time}`;
}

export function dateOf(dt: LocalDateTime): ISODate {
  return dt.slice(0, 10);
}

export function timeOf(dt: LocalDateTime): TimeString {
  return dt.slice(11, 16);
}

/** Parses an ISO date into a local Date at noon (safe across DST switches). */
export function parseISODate(iso: ISODate): Date {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Parses a local date-time string into a local Date. */
export function parseLocalDateTime(dt: LocalDateTime): Date {
  const m = DATETIME_RE.exec(dt);
  if (!m) throw new Error(`Invalid local date-time: ${dt}`);
  const d = parseISODate(m[1]!);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(m[2]), Number(m[3]));
}

/** Minutes from `a` to `b` (positive when b is later). Wall-clock difference. */
export function minutesBetween(a: LocalDateTime, b: LocalDateTime): number {
  return Math.round((parseLocalDateTime(b).getTime() - parseLocalDateTime(a).getTime()) / 60_000);
}

/**
 * Adds calendar days. Uses the local calendar, so month/year boundaries and
 * daylight saving switches are handled by the Date implementation.
 */
export function addDays(iso: ISODate, days: number): ISODate {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return toISODate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days, 12));
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function weekdayOf(iso: ISODate): number {
  const jsDay = parseISODate(iso).getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

/** Last day of the month containing `iso`. */
export function endOfMonth(iso: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

/** Adds calendar months; the day is clamped to the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISODate(iso);
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1, 12);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  return toISODate(new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastDay), 12));
}

/** Monday of the ISO week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, 1 - weekdayOf(iso));
}

/**
 * ISO 8601 week number (1–53). Week 1 is the week with the year's first Thursday,
 * so 2026-12-31 can be week 53 and 2027-01-01 still week 53 of 2026.
 */
export function isoWeekNumber(iso: ISODate): number {
  const thursday = addDays(iso, 4 - weekdayOf(iso));
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}

/** Lexicographic comparison works for YYYY-MM-DD and YYYY-MM-DDTHH:MM strings. */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Number of calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/** Enumerates every date from `from` to `to` inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cursor = from;
  while (compareISO(cursor, to) <= 0) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

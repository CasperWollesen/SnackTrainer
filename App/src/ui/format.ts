import { addDays, daysBetween, parseISODate, weekdayOf } from '../domain/dates';
import type { Entry, Exercise, ISODate } from '../domain/types';
import { MONTH_NAMES, MONTH_SHORT, WEEKDAY_NAMES, WEEKDAY_SHORT, texts } from '../texts';

export function weekdayName(iso: ISODate): string {
  return WEEKDAY_NAMES[weekdayOf(iso) - 1] ?? '';
}

export function weekdayShort(iso: ISODate): string {
  return WEEKDAY_SHORT[weekdayOf(iso) - 1] ?? '';
}

/** "Wednesday 23 September" */
export function formatDayLong(iso: ISODate): string {
  const d = parseISODate(iso);
  return `${weekdayName(iso)} ${d.getDate()} ${MONTH_NAMES[d.getMonth()] ?? ''}`;
}

/** "Wed 23 Sep" */
export function formatDayShort(iso: ISODate): string {
  const d = parseISODate(iso);
  return `${weekdayShort(iso)} ${d.getDate()} ${MONTH_SHORT[d.getMonth()] ?? ''}`;
}

/** "21–27 Sep" or "28 Sep – 4 Oct" for the week starting on `monday`. */
export function formatWeekRange(monday: ISODate): string {
  const a = parseISODate(monday);
  const b = parseISODate(addDays(monday, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTH_SHORT[b.getMonth()] ?? ''}`;
  return `${a.getDate()} ${MONTH_SHORT[a.getMonth()] ?? ''} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()] ?? ''}`;
}

/** "23 Sep 2026" */
export function formatDateWithYear(iso: ISODate): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

/** "Today", "Yesterday", weekday name within the last week, otherwise "Wed 23 Sep". */
export function formatRelativeDay(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return texts.relative.today;
  if (diff === -1) return texts.relative.yesterday;
  if (diff === 1) return texts.relative.tomorrow;
  if (diff < 0 && diff > -7) return weekdayName(iso);
  return formatDayShort(iso);
}

/** "1:30" for 90 seconds, "0:45" for 45, "1:02:03" past an hour. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Compact total time for stat tiles: "45 s", "12 min", "1 h 05". */
export function formatTotalTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} ${texts.common.seconds}`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${texts.common.minutes}`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')}`;
}

/** "20 x Push-Up" or "1:30 Plank (hold)". */
export function formatEntrySummary(entry: Entry, exercise: Exercise): string {
  if (entry.reps !== undefined) return `${entry.reps} ${texts.common.repsShort} ${exercise.name}`;
  return `${formatDuration(entry.seconds ?? 0)} ${exercise.name}`;
}

/** "23 Sep 2026, 14:03" for an ISO timestamp. */
export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()] ?? ''} ${d.getFullYear()}, ${hh}:${mm}`;
}

import { addDays, daysBetween, isoWeekNumber, parseISODate, weekdayOf } from '../domain/dates';
import type { Period } from '../domain/periods';
import { metricValue, type Delta, type Metric } from '../domain/stats';
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
  return formatDateRange(monday, addDays(monday, 6));
}

/**
 * "Wed 23 Sep", "17–23 Sep" or "24 Aug – 23 Sep". The year is added when the range ends in a
 * different year than `today` (or starts in another year than it ends).
 */
export function formatDateRange(from: ISODate, to: ISODate, today?: ISODate): string {
  const a = parseISODate(from);
  const b = parseISODate(to);
  const year = a.getFullYear() !== b.getFullYear() || (today !== undefined && b.getFullYear() !== parseISODate(today).getFullYear());
  const suffix = year ? ` ${b.getFullYear()}` : '';
  if (from === to) return `${formatDayShort(from)}${suffix}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${MONTH_SHORT[b.getMonth()] ?? ''}${suffix}`;
  }
  const aYear = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : '';
  return `${a.getDate()} ${MONTH_SHORT[a.getMonth()] ?? ''}${aYear} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()] ?? ''}${suffix}`;
}

/** Title and subtitle for a History period, relative to today where that reads better. */
export function formatPeriod(p: Period, today: ISODate): { title: string; subtitle: string } {
  const h = texts.history.period;
  switch (p.kind) {
    case 'day':
      return { title: formatRelativeDay(p.from, today), subtitle: formatDateWithYear(p.from) };
    case 'week': {
      const current = p.from <= today && today <= p.to;
      const last = !current && daysBetween(p.to, today) >= 1 && daysBetween(p.to, today) <= 7;
      const week = texts.history.week(isoWeekNumber(p.from));
      return { title: current ? h.thisWeek : last ? h.lastWeek : week, subtitle: `${week} · ${formatDateRange(p.from, p.to, today)}` };
    }
    case 'month': {
      const d = parseISODate(p.from);
      const current = p.from <= today && today <= p.to;
      return { title: `${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getFullYear()}`, subtitle: current ? h.thisMonth : formatDateRange(p.from, p.to, today) };
    }
    case 'last7':
    case 'last31': {
      const days = p.kind === 'last7' ? 7 : 31;
      return { title: p.to === today ? h.lastDays(days) : h.days(days), subtitle: formatDateRange(p.from, p.to, today) };
    }
  }
}

/** Chart value for a metric: time in minutes (one decimal), others as counts. */
export function chartValue(t: { reps: number; seconds: number; sessions: number }, metric: Metric): number {
  const v = metricValue(t, metric);
  return metric === 'time' ? Math.round(v / 6) / 10 : v;
}

export function formatChartValue(v: number, metric: Metric): string {
  return metric === 'time' ? `${v} ${texts.common.minutes}` : String(v);
}

/** "▲ 12%", "▼ 8%", "= 0%", "new" or null (nothing to compare). */
export function formatDelta(delta: Delta): { text: string; tone: 'up' | 'down' | 'flat' } | undefined {
  if (delta.kind === 'none') return undefined;
  if (delta.kind === 'new') return { text: texts.history.deltaNew, tone: 'up' };
  if (delta.percent > 0) return { text: `▲ ${delta.percent}%`, tone: 'up' };
  if (delta.percent < 0) return { text: `▼ ${Math.abs(delta.percent)}%`, tone: 'down' };
  return { text: '= 0%', tone: 'flat' };
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

import { addDays, compareISO, daysBetween, timeOf, weekdayOf } from './dates';
import type { DateRange } from './periods';
import { periodLength } from './periods';
import { exerciseTotals, sessionsBetween, totalsOf, type Totals } from './sessions';
import type { AppData, ISODate, LocalDateTime, Session } from './types';

/**
 * Statistics for History: period summaries, distributions, streaks and the "nerd" numbers.
 * Pure functions over sessions; narrow to one exercise first with `sessionsWithExercise`.
 */

export interface RangeSummary extends Totals {
  /** Days in the range with at least one entry. */
  activeDays: number;
  /** Days in the range. */
  days: number;
}

export function summarize(data: Pick<AppData, 'sessions'>, range: DateRange): RangeSummary {
  const sessions = sessionsBetween(data, range.from, range.to);
  return { ...totalsOf(sessions), activeDays: new Set(sessions.map((s) => s.date)).size, days: periodLength(range) };
}

export type Metric = 'reps' | 'time' | 'sessions';

/** The number a chart or delta shows for a metric: reps, seconds or sessions. */
export function metricValue(t: Pick<Totals, 'reps' | 'seconds' | 'sessions'>, metric: Metric): number {
  return metric === 'reps' ? t.reps : metric === 'time' ? t.seconds : t.sessions;
}

export type Delta = { kind: 'none' } | { kind: 'new' } | { kind: 'change'; percent: number };

/** Change from `previous` to `current`: none when both are 0, "new" when previous is 0. */
export function deltaOf(current: number, previous: number): Delta {
  if (previous === 0) return current === 0 ? { kind: 'none' } : { kind: 'new' };
  return { kind: 'change', percent: Math.round(((current - previous) / previous) * 100) };
}

export interface Bucket extends Totals {
  key: number;
}

function emptyBucket(key: number): Bucket {
  return { key, reps: 0, seconds: 0, entries: 0, sessions: 0 };
}

/** Totals per hour of day (0–23). Entries count by their own time, sessions by their start. */
export function hourlyTotals(sessions: readonly Session[]): Bucket[] {
  const hours = Array.from({ length: 24 }, (_, h) => emptyBucket(h));
  for (const s of sessions) {
    hours[Number(timeOf(s.startedAt).slice(0, 2))]!.sessions++;
    for (const e of s.entries) {
      const b = hours[Number(timeOf(e.at).slice(0, 2))]!;
      b.reps += e.reps ?? 0;
      b.seconds += e.seconds ?? 0;
      b.entries++;
    }
  }
  return hours;
}

/** Totals per ISO weekday, key 1 = Monday … 7 = Sunday. */
export function weekdayTotals(sessions: readonly Session[]): Bucket[] {
  const days = Array.from({ length: 7 }, (_, i) => emptyBucket(i + 1));
  for (const s of sessions) {
    const b = days[weekdayOf(s.date) - 1]!;
    const t = totalsOf([s]);
    b.reps += t.reps;
    b.seconds += t.seconds;
    b.entries += t.entries;
    b.sessions++;
  }
  return days;
}

export interface Streaks {
  /** Consecutive active days ending today, or ending yesterday while today is still empty. */
  current: number;
  longest: number;
  longestEnd: ISODate | null;
}

export function streaks(sessions: readonly Session[], today: ISODate): Streaks {
  const days = [...new Set(sessions.map((s) => s.date))].sort(compareISO);
  let longest = 0;
  let longestEnd: ISODate | null = null;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of days) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > longest) {
      longest = run;
      longestEnd = d;
    }
    prev = d;
  }
  const active = new Set(days);
  let current = 0;
  let cursor = active.has(today) ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, longestEnd };
}

export interface StatRecord {
  value: number;
  date: ISODate;
  at: LocalDateTime | null;
  exerciseId: string | null;
}

export interface NerdStats {
  activeDays: number;
  perActiveDay: { reps: number; seconds: number; sessions: number };
  perSession: { reps: number; entries: number };
  /** Average reps per reps entry and seconds per time entry. */
  perSet: { reps: number; seconds: number };
  biggestSession: StatRecord | null;
  biggestDay: StatRecord | null;
  bestSet: StatRecord | null;
  longestHold: StatRecord | null;
  /** Earliest and latest session start (time of day). */
  earliest: LocalDateTime | null;
  latest: LocalDateTime | null;
  /** Hour (0–23) with most sessions, or null without sessions. */
  busiestHour: number | null;
  /** ISO weekday with most reps (then sessions), or null without sessions. */
  busiestWeekday: number | null;
  exercises: number;
}

const avg = (sum: number, n: number) => (n > 0 ? sum / n : 0);

export function nerdStats(sessions: readonly Session[]): NerdStats {
  const t = totalsOf(sessions);
  const byDay = new Map<ISODate, number>();
  let biggestSession: StatRecord | null = null;
  let bestSet: StatRecord | null = null;
  let longestHold: StatRecord | null = null;
  let repEntries = 0;
  let timeEntries = 0;
  let earliest: LocalDateTime | null = null;
  let latest: LocalDateTime | null = null;

  for (const s of sessions) {
    const st = totalsOf([s]);
    byDay.set(s.date, (byDay.get(s.date) ?? 0) + st.reps);
    if (st.reps > 0 && (!biggestSession || st.reps > biggestSession.value)) {
      biggestSession = { value: st.reps, date: s.date, at: s.startedAt, exerciseId: null };
    }
    if (!earliest || timeOf(s.startedAt) < timeOf(earliest)) earliest = s.startedAt;
    if (!latest || timeOf(s.startedAt) > timeOf(latest)) latest = s.startedAt;
    for (const e of s.entries) {
      if (e.reps !== undefined) {
        repEntries++;
        if (!bestSet || e.reps > bestSet.value) bestSet = { value: e.reps, date: s.date, at: e.at, exerciseId: e.exerciseId };
      } else {
        timeEntries++;
        const sec = e.seconds ?? 0;
        if (!longestHold || sec > longestHold.value) longestHold = { value: sec, date: s.date, at: e.at, exerciseId: e.exerciseId };
      }
    }
  }

  let biggestDay: StatRecord | null = null;
  for (const [date, reps] of byDay) {
    if (reps > 0 && (!biggestDay || reps > biggestDay.value || (reps === biggestDay.value && date < biggestDay.date))) {
      biggestDay = { value: reps, date, at: null, exerciseId: null };
    }
  }

  const hours = hourlyTotals(sessions);
  const weekdays = weekdayTotals(sessions);
  const top = (buckets: Bucket[], score: (b: Bucket) => number) =>
    buckets.reduce<Bucket | null>((best, b) => (score(b) > 0 && (!best || score(b) > score(best)) ? b : best), null)?.key ?? null;
  const activeDays = byDay.size;

  return {
    activeDays,
    perActiveDay: { reps: avg(t.reps, activeDays), seconds: avg(t.seconds, activeDays), sessions: avg(t.sessions, activeDays) },
    perSession: { reps: avg(t.reps, t.sessions), entries: avg(t.entries, t.sessions) },
    perSet: { reps: avg(t.reps, repEntries), seconds: avg(t.seconds, timeEntries) },
    biggestSession,
    biggestDay,
    bestSet,
    longestHold,
    earliest,
    latest,
    busiestHour: top(hours, (b) => b.sessions),
    busiestWeekday: top(weekdays, (b) => b.reps * 1000 + b.sessions),
    exercises: exerciseTotals(sessions).length,
  };
}

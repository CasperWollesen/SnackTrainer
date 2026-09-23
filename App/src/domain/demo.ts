import { addDays, compareISO, dateOf, joinDateTime, toISODate, toTimeString, weekdayOf } from './dates';
import type { AppData, Entry, ISODate, Session } from './types';

/**
 * Demo data: realistic generated snacks so History has something to show. Every demo
 * session and entry id starts with DEMO_PREFIX; that prefix is the only marker, so the data
 * model needs no flag and "Remove demo data" can never touch what the user logged.
 */
export const DEMO_PREFIX = 'demo-';

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}

export function demoEntryCount(data: Pick<AppData, 'sessions'>): number {
  return data.sessions.reduce((n, s) => n + s.entries.filter((e) => isDemoId(e.id)).length, 0);
}

export function hasDemoData(data: Pick<AppData, 'sessions'>): boolean {
  return data.sessions.some((s) => s.entries.some((e) => isDemoId(e.id)));
}

/** Removes every demo entry; sessions left empty are removed, the rest keep their real entries. */
export function removeDemoData(data: AppData): AppData {
  const sessions: Session[] = [];
  for (const s of data.sessions) {
    const entries = s.entries.filter((e) => !isDemoId(e.id));
    if (entries.length === s.entries.length) sessions.push(s);
    else if (entries.length > 0) sessions.push({ ...s, entries, startedAt: entries[0]!.at, date: dateOf(entries[0]!.at) });
  }
  return { ...data, sessions };
}

/** Small deterministic PRNG (mulberry32) so the same seed gives the same demo history. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoExercise {
  id: string;
  /** Typical amount on day 0 and at the end of the period (reps or seconds). */
  start: number;
  end: number;
  time?: boolean;
  weight: number;
}

const DEMO_EXERCISES: DemoExercise[] = [
  { id: 'push-up', start: 12, end: 22, weight: 5 },
  { id: 'squat', start: 15, end: 28, weight: 4 },
  { id: 'plank', start: 40, end: 90, time: true, weight: 2 },
  { id: 'pull-up', start: 3, end: 8, weight: 2 },
  { id: 'sit-up', start: 12, end: 20, weight: 2 },
  { id: 'lunge', start: 10, end: 16, weight: 1 },
  { id: 'calf-raise', start: 20, end: 30, weight: 1 },
  { id: 'burpee', start: 6, end: 12, weight: 1 },
];

function pick(rand: () => number): DemoExercise {
  const total = DEMO_EXERCISES.reduce((n, e) => n + e.weight, 0);
  let r = rand() * total;
  for (const e of DEMO_EXERCISES) {
    r -= e.weight;
    if (r < 0) return e;
  }
  return DEMO_EXERCISES[0]!;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Generates `days` days of demo sessions ending at `now` (nothing later than now), with a slow
 * upward trend, quieter weekends and the odd rest day. Pure and deterministic for a given seed.
 */
export function generateDemoSessions(now: Date, days = 120, seed = 42): Session[] {
  const rand = prng(seed);
  const today: ISODate = toISODate(now);
  const nowTime = toTimeString(now);
  const sessions: Session[] = [];
  let n = 0;
  const id = () => `${DEMO_PREFIX}${(n++).toString(36)}`;

  for (let back = days - 1; back >= 0; back--) {
    const date = addDays(today, -back);
    const progress = (days - 1 - back) / Math.max(1, days - 1); // 0 → 1 over the period
    const weekend = weekdayOf(date) >= 6;
    if (rand() < (weekend ? 0.45 : 0.18)) continue; // rest day

    const sessionCount = 1 + Math.floor(rand() * (weekend ? 2 : 4));
    // Spread session start hours over the day, in order.
    const hours = Array.from({ length: sessionCount }, () => 7 + Math.floor(rand() * 15)).sort((a, b) => a - b);
    let lastMinute = -1;
    for (const hour of hours) {
      let minute = hour * 60 + Math.floor(rand() * 50);
      if (minute <= lastMinute + 45) minute = lastMinute + 45; // keep sessions apart
      if (minute > 22 * 60 + 30) break;
      const at0 = joinDateTime(date, `${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`);
      if (date === today && at0.slice(11) > nowTime) break;

      const entries: Entry[] = [];
      const entryCount = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < entryCount; k++) {
        const ex = pick(rand);
        const m = minute + k * 2;
        const at = joinDateTime(date, `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
        if (date === today && at.slice(11) > nowTime) break;
        const typical = ex.start + (ex.end - ex.start) * progress;
        const amount = Math.max(1, Math.round(typical * (0.75 + rand() * 0.5)));
        entries.push(ex.time ? { id: id(), exerciseId: ex.id, at, seconds: amount } : { id: id(), exerciseId: ex.id, at, reps: amount });
      }
      if (entries.length === 0) continue;
      entries.sort((a, b) => compareISO(a.at, b.at));
      const session: Session = { id: id(), date, startedAt: entries[0]!.at, entries };
      // Most demo sessions look like they were run with the session timer.
      if (rand() < 0.7) session.durationSeconds = (entries.length - 1) * 120 + 60 + Math.floor(rand() * 240);
      sessions.push(session);
      lastMinute = minute + entryCount * 2;
    }
  }
  return sessions;
}

/** Replaces any existing demo data with a fresh set, keeping the user's own entries. */
export function withDemoData(data: AppData, now: Date): AppData {
  const clean = removeDemoData(data);
  const sessions = [...clean.sessions, ...generateDemoSessions(now)].sort((a, b) => compareISO(a.startedAt, b.startedAt));
  return { ...clean, sessions };
}

import { addDays, compareISO, dateOf, eachDay, minutesBetween, startOfWeek } from './dates';
import { isDemoId } from './demo';
import { newId } from './ids';
import type { AppData, Entry, ISODate, LocalDateTime, Session } from './types';

/** The amount part of an entry, exactly one of the two. */
export type Amount = { reps: number } | { seconds: number };

export interface NewEntry {
  exerciseId: string;
  at: LocalDateTime;
  amount: Amount;
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => compareISO(a.at, b.at));
}

function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => compareISO(a.startedAt, b.startedAt));
}

function makeEntry(input: NewEntry, id = newId()): Entry {
  const entry: Entry = { id, exerciseId: input.exerciseId, at: input.at };
  if ('reps' in input.amount) entry.reps = input.amount.reps;
  else entry.seconds = input.amount.seconds;
  return entry;
}

/** Last entry time of a session (sessions are never empty in stored data). */
export function sessionEndsAt(session: Session): LocalDateTime {
  return session.entries[session.entries.length - 1]?.at ?? session.startedAt;
}

/**
 * Picks the session a new entry at `at` should join: the latest non-demo session of that day
 * whose last entry is at most `gapMinutes` before `at` (and which does not start after `at`).
 * Returns null when a new session is needed.
 */
export function findSessionFor(data: AppData, at: LocalDateTime, gapMinutes = data.settings.sessionGapMinutes): Session | null {
  const date = dateOf(at);
  // Demo sessions are never joined, so removing demo data never splits a real session.
  const candidates = data.sessions.filter((s) => s.date === date && compareISO(s.startedAt, at) <= 0 && !isDemoId(s.id));
  const last = candidates[candidates.length - 1];
  if (!last) return null;
  const gap = minutesBetween(sessionEndsAt(last), at);
  return gap >= 0 && gap <= gapMinutes ? last : null;
}

export interface AddResult {
  data: AppData;
  entry: Entry;
  session: Session;
  createdSession: boolean;
}

/** Adds an entry, joining an existing session or creating a new one. Pure; returns new data. */
export function addEntry(data: AppData, input: NewEntry): AddResult {
  const entry = makeEntry(input);
  const target = findSessionFor(data, input.at);
  if (target) {
    const session: Session = { ...target, entries: sortEntries([...target.entries, entry]) };
    const sessions = sortSessions(data.sessions.map((s) => (s.id === target.id ? session : s)));
    return { data: { ...data, sessions }, entry, session, createdSession: false };
  }
  const session: Session = { id: newId(), date: dateOf(input.at), startedAt: input.at, entries: [entry] };
  return { data: { ...data, sessions: sortSessions([...data.sessions, session]) }, entry, session, createdSession: true };
}

export function findEntry(data: AppData, entryId: string): { session: Session; entry: Entry } | null {
  for (const session of data.sessions) {
    const entry = session.entries.find((e) => e.id === entryId);
    if (entry) return { session, entry };
  }
  return null;
}

/**
 * Replaces an entry's amount and/or time. The entry stays in its session (editing the time
 * never regroups history); the session's startedAt follows its earliest entry.
 */
export function updateEntry(data: AppData, entryId: string, patch: { at?: LocalDateTime; amount?: Amount }): AppData {
  const found = findEntry(data, entryId);
  if (!found) return data;
  const next: Entry = { id: found.entry.id, exerciseId: found.entry.exerciseId, at: patch.at ?? found.entry.at };
  const amount: Amount = patch.amount ?? (found.entry.reps !== undefined ? { reps: found.entry.reps } : { seconds: found.entry.seconds ?? 0 });
  if ('reps' in amount) next.reps = amount.reps;
  else next.seconds = amount.seconds;
  const entries = sortEntries(found.session.entries.map((e) => (e.id === entryId ? next : e)));
  const first = entries[0]!;
  const session: Session = { ...found.session, entries, startedAt: first.at, date: dateOf(first.at) };
  return { ...data, sessions: sortSessions(data.sessions.map((s) => (s.id === session.id ? session : s))) };
}

/** Removes an entry; a session that becomes empty is removed too. */
export function deleteEntry(data: AppData, entryId: string): AppData {
  const found = findEntry(data, entryId);
  if (!found) return data;
  const entries = found.session.entries.filter((e) => e.id !== entryId);
  if (entries.length === 0) {
    return { ...data, sessions: data.sessions.filter((s) => s.id !== found.session.id) };
  }
  const first = entries[0]!;
  const session: Session = { ...found.session, entries, startedAt: first.at, date: dateOf(first.at) };
  return { ...data, sessions: sortSessions(data.sessions.map((s) => (s.id === session.id ? session : s))) };
}

/** Puts a previously deleted entry back into the session it came from (or a new one). Used by Undo. */
export function restoreEntry(data: AppData, session: Session, entry: Entry): AppData {
  const existing = data.sessions.find((s) => s.id === session.id);
  if (existing) {
    const merged: Session = { ...existing, entries: sortEntries([...existing.entries.filter((e) => e.id !== entry.id), entry]) };
    const first = merged.entries[0]!;
    merged.startedAt = first.at;
    merged.date = dateOf(first.at);
    return { ...data, sessions: sortSessions(data.sessions.map((s) => (s.id === merged.id ? merged : s))) };
  }
  const revived: Session = { id: session.id, date: dateOf(entry.at), startedAt: entry.at, entries: [entry] };
  return { ...data, sessions: sortSessions([...data.sessions, revived]) };
}

// ---------------------------------------------------------------------------
// Totals

export interface Totals {
  reps: number;
  seconds: number;
  entries: number;
  sessions: number;
}

export function totalsOf(sessions: readonly Session[]): Totals {
  let reps = 0;
  let seconds = 0;
  let entries = 0;
  for (const s of sessions) {
    for (const e of s.entries) {
      reps += e.reps ?? 0;
      seconds += e.seconds ?? 0;
      entries++;
    }
  }
  return { reps, seconds, entries, sessions: sessions.length };
}

export function sessionsOn(data: Pick<AppData, 'sessions'>, date: ISODate): Session[] {
  return data.sessions.filter((s) => s.date === date);
}

export function sessionsBetween(data: Pick<AppData, 'sessions'>, from: ISODate, to: ISODate): Session[] {
  return data.sessions.filter((s) => s.date >= from && s.date <= to);
}

export interface DayTotals extends Totals {
  date: ISODate;
}

/** One row per calendar day in the range, including empty days (for charts). */
export function dailyTotals(data: Pick<AppData, 'sessions'>, from: ISODate, to: ISODate): DayTotals[] {
  const byDate = new Map<ISODate, Session[]>();
  for (const s of sessionsBetween(data, from, to)) {
    const list = byDate.get(s.date);
    if (list) list.push(s);
    else byDate.set(s.date, [s]);
  }
  return eachDay(from, to).map((date) => ({ date, ...totalsOf(byDate.get(date) ?? []) }));
}

export interface WeekTotals extends Totals {
  /** Monday of the ISO week. */
  weekStart: ISODate;
  /** Days in the week with at least one entry. */
  activeDays: number;
}

/**
 * One row per ISO week (Monday–Sunday) overlapping the range, including empty weeks.
 * Only days inside `from`..`to` are counted, so a partial first or current week is partial.
 */
export function weeklyTotals(data: Pick<AppData, 'sessions'>, from: ISODate, to: ISODate): WeekTotals[] {
  const weeks: WeekTotals[] = [];
  for (let week = startOfWeek(from); compareISO(week, to) <= 0; week = addDays(week, 7)) {
    const start = compareISO(week, from) < 0 ? from : week;
    const endOfWeek = addDays(week, 6);
    const end = compareISO(endOfWeek, to) > 0 ? to : endOfWeek;
    const days = dailyTotals(data, start, end);
    const sessions = sessionsBetween(data, start, end);
    weeks.push({ weekStart: week, ...totalsOf(sessions), activeDays: days.filter((d) => d.entries > 0).length });
  }
  return weeks;
}

/**
 * The sessions narrowed to one exercise: each keeps only that exercise's entries,
 * sessions without it are dropped. Lets every total/chart helper work per exercise.
 */
export function sessionsWithExercise(sessions: readonly Session[], exerciseId: string): Session[] {
  const out: Session[] = [];
  for (const s of sessions) {
    const entries = s.entries.filter((e) => e.exerciseId === exerciseId);
    if (entries.length > 0) out.push({ ...s, entries });
  }
  return out;
}

export interface SessionBest {
  sessionId: string;
  date: ISODate;
  startedAt: LocalDateTime;
  value: number;
}

export interface PersonalBests {
  /** Most reps in one session (summed over its entries), or null when never logged in reps. */
  sessionReps: SessionBest | null;
  /** Longest total time in one session, or null when never logged in time. */
  sessionSeconds: SessionBest | null;
}

/**
 * Personal bests per session. Pass sessions already narrowed with `sessionsWithExercise`.
 * Ties keep the earliest session: the record was set there.
 */
export function personalBests(sessions: readonly Session[]): PersonalBests {
  let sessionReps: SessionBest | null = null;
  let sessionSeconds: SessionBest | null = null;
  for (const s of sessions) {
    const t = totalsOf([s]);
    const base = { sessionId: s.id, date: s.date, startedAt: s.startedAt };
    if (t.reps > 0 && (!sessionReps || t.reps > sessionReps.value)) sessionReps = { ...base, value: t.reps };
    if (t.seconds > 0 && (!sessionSeconds || t.seconds > sessionSeconds.value)) sessionSeconds = { ...base, value: t.seconds };
  }
  return { sessionReps, sessionSeconds };
}

export interface ExerciseTotals {
  exerciseId: string;
  reps: number;
  seconds: number;
  entries: number;
  /** Highest reps (or seconds) in a single entry. */
  bestReps: number;
  bestSeconds: number;
  lastAt: LocalDateTime | null;
}

/** Per-exercise totals over the given sessions, ordered by reps then seconds descending. */
export function exerciseTotals(sessions: readonly Session[]): ExerciseTotals[] {
  const map = new Map<string, ExerciseTotals>();
  for (const s of sessions) {
    for (const e of s.entries) {
      let row = map.get(e.exerciseId);
      if (!row) {
        row = { exerciseId: e.exerciseId, reps: 0, seconds: 0, entries: 0, bestReps: 0, bestSeconds: 0, lastAt: null };
        map.set(e.exerciseId, row);
      }
      row.reps += e.reps ?? 0;
      row.seconds += e.seconds ?? 0;
      row.entries++;
      row.bestReps = Math.max(row.bestReps, e.reps ?? 0);
      row.bestSeconds = Math.max(row.bestSeconds, e.seconds ?? 0);
      if (!row.lastAt || compareISO(e.at, row.lastAt) > 0) row.lastAt = e.at;
    }
  }
  return [...map.values()].sort((a, b) => b.reps - a.reps || b.seconds - a.seconds || b.entries - a.entries);
}

/** Days with at least one entry, most recent first. */
export function activeDays(data: Pick<AppData, 'sessions'>): ISODate[] {
  return [...new Set(data.sessions.map((s) => s.date))].sort((a, b) => compareISO(b, a));
}

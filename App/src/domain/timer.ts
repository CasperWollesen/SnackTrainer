import { newId } from './ids';
import { toLocalDateTime } from './dates';
import type { ActiveSession, AppData, Session } from './types';

/**
 * The session timer: Start → log entries → Stop, or stop by itself after
 * `settings.sessionTimeoutMinutes` without activity. A count-down instead ends by itself when its
 * time is up. Pure functions over AppData; the caller passes the clock (`now` / epoch ms) so
 * everything is testable.
 */

/**
 * Starts a timer (no-op while one is running). No session exists until the first entry.
 * With `countdownSeconds` it is a count-down that ends by itself after that long.
 */
export function startSession(data: AppData, now: Date, countdownSeconds?: number): AppData {
  if (data.activeSession) return data;
  const ms = now.getTime();
  const active: ActiveSession = { id: newId(), startedAt: toLocalDateTime(now), startedMs: ms, lastActivityMs: ms };
  if (countdownSeconds !== undefined && countdownSeconds > 0) active.countdownSeconds = Math.round(countdownSeconds);
  return { ...data, activeSession: active };
}

/** Epoch ms at which a count-down ends, or null for a timer that counts up. */
export function countdownEndMs(active: ActiveSession): number | null {
  return active.countdownSeconds === undefined ? null : active.startedMs + active.countdownSeconds * 1000;
}

/** Whole seconds left of a count-down (rounded up, so it shows 0:01 until the very end); 0 when up. */
export function remainingSeconds(active: ActiveSession, nowMs: number): number {
  const end = countdownEndMs(active);
  return end === null ? 0 : Math.max(0, Math.ceil((end - nowMs) / 1000));
}

/**
 * Records activity (an entry, the log sheet, a running stopwatch). Writes only when at least
 * `minIntervalMs` passed since the last recorded activity, so frequent calls stay cheap.
 */
export function touchSession(data: AppData, nowMs: number, minIntervalMs = 0): AppData {
  const active = data.activeSession;
  if (!active || nowMs - active.lastActivityMs < minIntervalMs || nowMs <= active.lastActivityMs) return data;
  return { ...data, activeSession: { ...active, lastActivityMs: nowMs } };
}

export function elapsedSeconds(active: ActiveSession, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - active.startedMs) / 1000));
}

/** Epoch ms at which the running timer stops by itself. */
export function idleDeadline(active: ActiveSession, timeoutMinutes: number): number {
  return active.lastActivityMs + timeoutMinutes * 60_000;
}

export interface StopResult {
  data: AppData;
  /** The finished session, or null when nothing was logged (the timer is simply dropped). */
  session: Session | null;
  /** The timer that was stopped (for Undo). */
  stopped: ActiveSession | null;
}

/** Stops the timer at `endMs`: the session gets its duration, the timer is cleared. */
export function stopSession(data: AppData, endMs: number): StopResult {
  const active = data.activeSession;
  if (!active) return { data, session: null, stopped: null };
  const existing = data.sessions.find((s) => s.id === active.id);
  if (!existing) return { data: { ...data, activeSession: null }, session: null, stopped: active };
  const session: Session = { ...existing, durationSeconds: Math.max(0, Math.round((endMs - active.startedMs) / 1000)) };
  return {
    data: { ...data, activeSession: null, sessions: data.sessions.map((s) => (s.id === session.id ? session : s)) },
    session,
    stopped: active,
  };
}

/**
 * Stops a timer that has been idle past the timeout. The session ends at the last activity,
 * not at the moment this runs, so an app that was closed for an hour does not add an hour.
 */
export function autoStopIfIdle(data: AppData, nowMs: number): StopResult | null {
  const active = data.activeSession;
  if (!active || active.countdownSeconds !== undefined) return null; // a count-down ends on time instead
  if (nowMs < idleDeadline(active, data.settings.sessionTimeoutMinutes)) return null;
  return stopSession(data, active.lastActivityMs);
}

/**
 * Ends a count-down whose time is up, at its end time (also when the app was closed past it),
 * so the session's duration is exactly the chosen length.
 */
export function finishCountdownIfDue(data: AppData, nowMs: number): StopResult | null {
  const active = data.activeSession;
  const end = active ? countdownEndMs(active) : null;
  if (end === null || nowMs < end) return null;
  return stopSession(data, end);
}

/** Undo for a stop: the timer runs again (activity counted from `nowMs`) and the duration is cleared. */
export function resumeSession(data: AppData, stopped: ActiveSession, nowMs: number): AppData {
  if (data.activeSession) return data;
  const sessions = data.sessions.map((s) => {
    if (s.id !== stopped.id) return s;
    const { durationSeconds: _dropped, ...rest } = s;
    return rest;
  });
  return { ...data, sessions, activeSession: { ...stopped, lastActivityMs: Math.max(stopped.lastActivityMs, nowMs) } };
}

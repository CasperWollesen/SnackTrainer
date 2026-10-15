/** Local calendar date, "YYYY-MM-DD". Never UTC. */
export type ISODate = string;

/** Local wall-clock time, "HH:MM", 24-hour. */
export type TimeString = string;

/** Local date and time, "YYYY-MM-DDTHH:MM". Sorts lexicographically. */
export type LocalDateTime = string;

export type ExerciseMode = 'reps' | 'time';

/** How the snack session timer runs: counting up until Stop, or counting down a set time. */
export type TimerMode = 'up' | 'down';

export interface Exercise {
  /** Slug for built-ins ("push-up"); "custom-<random>" for user-created exercises. */
  id: string;
  name: string;
  emoji: string;
  category: string;
  /** Default logging mode. Any exercise can still be logged in the other mode. */
  mode: ExerciseMode;
  /** The movement lifts the user's own body (informational, from MuscleUp). */
  bodyweight: boolean;
}

export interface Entry {
  id: string;
  exerciseId: string;
  at: LocalDateTime;
  /** Present when logged in reps mode. */
  reps?: number;
  /** Present when logged in time mode. */
  seconds?: number;
}

export interface Session {
  id: string;
  date: ISODate;
  startedAt: LocalDateTime;
  /** Sorted by `at`. Never empty in stored data. */
  entries: Entry[];
  /**
   * Set when the session was run with the session timer and stopped: seconds from pressing
   * Start to pressing Stop (or to the last activity when it stopped by itself).
   * Also marks the session as timed: its startedAt stays at the timer start.
   */
  durationSeconds?: number;
}

/**
 * A running session timer. The Session itself is created with this id on the first entry,
 * so an empty timer never leaves an empty session behind.
 */
export interface ActiveSession {
  id: string;
  /** Local wall-clock start, used as the session's startedAt. */
  startedAt: LocalDateTime;
  /** Epoch milliseconds of the start and of the last activity (for the timer and auto-stop). */
  startedMs: number;
  lastActivityMs: number;
  /**
   * v4: set for a count-down. The session ends by itself `countdownSeconds` after the start
   * (no idle auto-stop); absent for a timer that counts up.
   */
  countdownSeconds?: number;
}

export type GoalMetric = 'reps' | 'time' | 'sessions';

/** v6: a goal is per calendar day or per ISO week (Monday–Sunday). */
export type GoalPeriod = 'day' | 'week';

/**
 * A goal (v5 as `dailyGoals`, v6 `goals` with `period`). `target` is reps, seconds or sessions per
 * day or per week. At most one scope: `exerciseId` (that exercise), `category` (exercises in it) or
 * `bodyweight` (bodyweight exercises); none means everything.
 */
export interface Goal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  exerciseId?: string;
  category?: string;
  /** v7: only exercises marked as bodyweight count (built-in flag, or set on a custom exercise). */
  bodyweight?: true;
}

export interface Settings {
  /** Minutes since the previous entry within which a new entry joins the same session. */
  sessionGapMinutes: number;
  installHintDismissed: boolean;
  /** Exercise ids left out of the pickers (built-in or custom). Their entries still count everywhere. */
  hiddenExerciseIds: string[];
  /** A running session timer stops by itself after this many minutes without activity. */
  sessionTimeoutMinutes: number;
  /** v4: the timer mode last chosen on Today. */
  timerMode: TimerMode;
  /** v4: length of a count-down, in minutes. */
  countdownMinutes: number;
  /** v6 (v5: dailyGoals): goals per day or week, shown on Today in this order. */
  goals: Goal[];
}

/**
 * 2: settings.hiddenExerciseIds. 3: activeSession, Session.durationSeconds,
 * settings.sessionTimeoutMinutes. 4: count-down (activeSession.countdownSeconds,
 * settings.timerMode, settings.countdownMinutes). 5: settings.dailyGoals. 6: settings.goals
 * with a day/week period (replaces dailyGoals). 7: Goal.bodyweight. Older data is upgraded by
 * `upgradeAppData`.
 */
export const DATA_VERSION = 7;

export interface AppData {
  version: typeof DATA_VERSION;
  /** Sorted by startedAt ascending. */
  sessions: Session[];
  customExercises: Exercise[];
  settings: Settings;
  /** The running session timer, or null. */
  activeSession: ActiveSession | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sessionGapMinutes: 20,
  installHintDismissed: false,
  hiddenExerciseIds: [],
  sessionTimeoutMinutes: 5,
  timerMode: 'up',
  countdownMinutes: 5,
  goals: [],
};

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    sessions: [],
    customExercises: [],
    settings: { ...DEFAULT_SETTINGS, hiddenExerciseIds: [], goals: [] },
    activeSession: null,
  };
}

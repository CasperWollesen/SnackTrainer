import { addDays, startOfWeek, weekdayOf } from './dates';
import { findExercise } from './exercises';
import type { AppData, Entry, Goal, GoalMetric, GoalPeriod, ISODate, Session } from './types';

/**
 * Goals: "100 reps a day", "50 Push-Up a day", "500 reps a week", "1 h of Stretching a week".
 * A goal counts reps, time (seconds of timed entries) or sessions per day or per ISO week
 * (Monday–Sunday), over all exercises, one category or one exercise. Pure functions over AppData.
 */

/** Stepper limits and the default per period and metric (time in seconds). */
export const GOAL_LIMITS: Record<GoalPeriod, Record<GoalMetric, { min: number; max: number; step: number; initial: number }>> = {
  day: {
    reps: { min: 5, max: 2000, step: 5, initial: 100 },
    time: { min: 30, max: 4 * 3600, step: 30, initial: 600 },
    sessions: { min: 1, max: 30, step: 1, initial: 5 },
  },
  week: {
    reps: { min: 10, max: 10000, step: 10, initial: 500 },
    time: { min: 300, max: 40 * 3600, step: 300, initial: 3600 },
    sessions: { min: 1, max: 150, step: 1, initial: 20 },
  },
};

type GoalData = Pick<AppData, 'sessions' | 'customExercises'>;
type GoalAppData = GoalData & Pick<AppData, 'settings'>;

function entryCounts(data: GoalData, goal: Goal, entry: Entry): boolean {
  if (goal.exerciseId !== undefined) return entry.exerciseId === goal.exerciseId;
  if (goal.category !== undefined) return findExercise(data, entry.exerciseId)?.category === goal.category;
  return true;
}

/** The goal's value over the given sessions (a day's or a week's). */
export function goalValueOf(data: GoalData, goal: Goal, sessions: readonly Session[]): number {
  let value = 0;
  for (const s of sessions) {
    const entries = s.entries.filter((e) => entryCounts(data, goal, e));
    if (goal.metric === 'sessions') value += entries.length > 0 ? 1 : 0;
    else for (const e of entries) value += (goal.metric === 'reps' ? e.reps : e.seconds) ?? 0;
  }
  return value;
}

/** The days a goal counts on `date`: that day, or its week from Monday up to and including `date`. */
export function goalRange(period: GoalPeriod, date: ISODate): { from: ISODate; to: ISODate } {
  return period === 'week' ? { from: startOfWeek(date), to: date } : { from: date, to: date };
}

export interface GoalProgress {
  goal: Goal;
  value: number;
  /** 0–1, capped. */
  fraction: number;
  done: boolean;
  /** Week goals: the share of the week gone by the end of the day (1/7 on Monday … 1 on Sunday). */
  pace?: number;
}

function sessionsIn(sessions: readonly Session[], from: ISODate, to: ISODate): Session[] {
  return sessions.filter((s) => s.date >= from && s.date <= to);
}

function progressOf(data: GoalData, goal: Goal, sessions: readonly Session[]): GoalProgress {
  const value = goalValueOf(data, goal, sessions);
  return { goal, value, fraction: goal.target > 0 ? Math.min(1, value / goal.target) : 1, done: value >= goal.target };
}

/** Progress of every goal as of `date` (week goals: the week so far), in the goals' order. */
export function goalProgress(data: GoalAppData, date: ISODate): GoalProgress[] {
  return data.settings.goals.map((g) => {
    const { from, to } = goalRange(g.period, date);
    const p = progressOf(data, g, sessionsIn(data.sessions, from, to));
    return g.period === 'week' ? { ...p, pace: weekdayOf(date) / 7 } : p;
  });
}

/** Goals that were not met on `date` before a change and are met after it (for "Goal reached"). */
export function newlyReachedGoals(before: AppData, after: AppData, date: ISODate): Goal[] {
  const was = new Map(goalProgress(before, date).map((p) => [p.goal.id, p.done]));
  return goalProgress(after, date)
    .filter((p) => p.done && was.get(p.goal.id) === false)
    .map((p) => p.goal);
}

/**
 * Days (or weeks) in a row the goal was met, ending with the current one, or the one before while
 * the current one is not met yet (an unfinished day or week does not break the streak).
 * Looks back at most `max` days or weeks.
 */
export function goalStreak(data: GoalData, goal: Goal, today: ISODate, max = goal.period === 'week' ? 104 : 366): number {
  const step = goal.period === 'week' ? 7 : 1;
  const met = (start: ISODate) => goalValueOf(data, goal, sessionsIn(data.sessions, start, addDays(start, step - 1))) >= goal.target;
  const current = goal.period === 'week' ? startOfWeek(today) : today;
  let start = met(current) ? current : addDays(current, -step);
  let streak = 0;
  while (streak < max && met(start)) {
    streak++;
    start = addDays(start, -step);
  }
  return streak;
}

/**
 * Days in [from, to] on which every daily goal was met; empty without daily goals (week goals are
 * not about single days). Judged by the goals as they are now (goals have no history), so changing
 * a goal re-colours the past.
 */
export function daysAllGoalsMet(data: GoalAppData, from: ISODate, to: ISODate): Set<ISODate> {
  const goals = data.settings.goals.filter((g) => g.period === 'day');
  const met = new Set<ISODate>();
  if (goals.length === 0) return met;
  const byDate = new Map<ISODate, Session[]>();
  for (const s of sessionsIn(data.sessions, from, to)) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  for (const [date, sessions] of byDate) {
    if (goals.every((g) => goalValueOf(data, g, sessions) >= g.target)) met.add(date);
  }
  return met;
}

/** Clamps a target into the limits for its period and metric, and onto the step. */
export function clampTarget(period: GoalPeriod, metric: GoalMetric, target: number): number {
  const { min, max, step } = GOAL_LIMITS[period][metric];
  const stepped = Math.round(target / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** Adds the goal, or replaces the one with the same id (keeping its place). */
export function withGoal(goals: readonly Goal[], goal: Goal): Goal[] {
  return goals.some((g) => g.id === goal.id) ? goals.map((g) => (g.id === goal.id ? goal : g)) : [...goals, goal];
}

export function withoutGoal(goals: readonly Goal[], id: string): Goal[] {
  return goals.filter((g) => g.id !== id);
}

import { addDays } from './dates';
import { findExercise } from './exercises';
import type { AppData, DailyGoal, Entry, GoalMetric, ISODate, Session } from './types';

/**
 * Daily goals: "100 reps a day", "50 Push-Up", "10 min of Stretching", "5 snacks a day".
 * A goal counts reps, time (seconds of timed entries) or sessions, over all exercises, one
 * category or one exercise. Pure functions over AppData.
 */

/** Stepper limits and the default per metric (time in seconds). */
export const GOAL_LIMITS: Record<GoalMetric, { min: number; max: number; step: number; initial: number }> = {
  reps: { min: 5, max: 2000, step: 5, initial: 100 },
  time: { min: 30, max: 4 * 3600, step: 30, initial: 600 },
  sessions: { min: 1, max: 30, step: 1, initial: 5 },
};

type GoalData = Pick<AppData, 'sessions' | 'customExercises'>;

function entryCounts(data: GoalData, goal: DailyGoal, entry: Entry): boolean {
  if (goal.exerciseId !== undefined) return entry.exerciseId === goal.exerciseId;
  if (goal.category !== undefined) return findExercise(data, entry.exerciseId)?.category === goal.category;
  return true;
}

/** The goal's value over the given sessions (normally one day's). */
export function goalValueOf(data: GoalData, goal: DailyGoal, sessions: readonly Session[]): number {
  let value = 0;
  for (const s of sessions) {
    const entries = s.entries.filter((e) => entryCounts(data, goal, e));
    if (goal.metric === 'sessions') value += entries.length > 0 ? 1 : 0;
    else for (const e of entries) value += (goal.metric === 'reps' ? e.reps : e.seconds) ?? 0;
  }
  return value;
}

export interface GoalProgress {
  goal: DailyGoal;
  value: number;
  /** 0–1, capped. */
  fraction: number;
  done: boolean;
}

function sessionsByDate(sessions: readonly Session[]): Map<ISODate, Session[]> {
  const map = new Map<ISODate, Session[]>();
  for (const s of sessions) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

function progressOf(data: GoalData, goal: DailyGoal, sessions: readonly Session[]): GoalProgress {
  const value = goalValueOf(data, goal, sessions);
  return { goal, value, fraction: goal.target > 0 ? Math.min(1, value / goal.target) : 1, done: value >= goal.target };
}

/** Progress of every goal on one day, in the goals' order. */
export function goalProgress(data: GoalData & Pick<AppData, 'settings'>, date: ISODate): GoalProgress[] {
  const day = data.sessions.filter((s) => s.date === date);
  return data.settings.dailyGoals.map((g) => progressOf(data, g, day));
}

/** Goals that were not met on `date` before a change and are met after it (for "Goal reached"). */
export function newlyReachedGoals(before: AppData, after: AppData, date: ISODate): DailyGoal[] {
  const was = new Map(goalProgress(before, date).map((p) => [p.goal.id, p.done]));
  return goalProgress(after, date)
    .filter((p) => p.done && was.get(p.goal.id) === false)
    .map((p) => p.goal);
}

/**
 * Days in a row the goal was met, ending today, or yesterday while today is not met yet
 * (an unfinished today does not break the streak). Looks back at most `maxDays`.
 */
export function goalStreak(data: GoalData, goal: DailyGoal, today: ISODate, maxDays = 366): number {
  const byDate = sessionsByDate(data.sessions);
  const met = (d: ISODate) => goalValueOf(data, goal, byDate.get(d) ?? []) >= goal.target;
  let day = met(today) ? today : addDays(today, -1);
  let streak = 0;
  while (streak < maxDays && met(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/**
 * Days in [from, to] on which every goal was met; empty when there are no goals. Judged by the
 * goals as they are now (goals have no history), so changing a goal re-colours the past.
 */
export function daysAllGoalsMet(data: GoalData & Pick<AppData, 'settings'>, from: ISODate, to: ISODate): Set<ISODate> {
  const goals = data.settings.dailyGoals;
  const met = new Set<ISODate>();
  if (goals.length === 0) return met;
  const byDate = sessionsByDate(data.sessions.filter((s) => s.date >= from && s.date <= to));
  for (const [date, sessions] of byDate) {
    if (goals.every((g) => goalValueOf(data, g, sessions) >= g.target)) met.add(date);
  }
  return met;
}

/** Clamps a target into the metric's limits and onto its step. */
export function clampTarget(metric: GoalMetric, target: number): number {
  const { min, max, step } = GOAL_LIMITS[metric];
  const stepped = Math.round(target / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** Adds the goal, or replaces the one with the same id (keeping its place). */
export function withGoal(goals: readonly DailyGoal[], goal: DailyGoal): DailyGoal[] {
  return goals.some((g) => g.id === goal.id) ? goals.map((g) => (g.id === goal.id ? goal : g)) : [...goals, goal];
}

export function withoutGoal(goals: readonly DailyGoal[], id: string): DailyGoal[] {
  return goals.filter((g) => g.id !== id);
}

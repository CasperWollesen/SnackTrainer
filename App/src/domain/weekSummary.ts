import { addDays, compareISO, startOfWeek } from './dates';
import { daysAllGoalsMet, goalProgress } from './goals';
import { dailyTotals, exerciseTotals, sessionsBetween, totalsOf, type Totals } from './sessions';
import type { AppData, ISODate } from './types';

/**
 * The week summary in History: one ISO week (Monday–Sunday, up to today while it runs) told as
 * highlights. Pure; uses all data (the History exercise filter does not apply).
 */

export interface PersonalBest {
  exerciseId: string;
  unit: 'reps' | 'time';
  /** Best single entry this week, and the best before this week. */
  value: number;
  previous: number;
}

export interface WeekSummary {
  from: ISODate;
  /** The last day counted: Sunday, or today while the week runs. */
  to: ISODate;
  /** Days counted (7 for a finished week). */
  days: number;
  running: boolean;
  totals: Totals;
  activeDays: number;
  /** Most reps (or, without reps, most time); the earliest wins a tie. */
  bestDay: { date: ISODate; reps: number; seconds: number } | null;
  /** Most reps (or, without reps, most time). */
  topExercise: { exerciseId: string; reps: number; seconds: number; entries: number } | null;
  /** Best single entry beaten this week, biggest relative improvement first. */
  personalBests: PersonalBest[];
  /** Exercises logged this week for the very first time. */
  firstTimes: string[];
  /** Days with every daily goal met, of the days counted; null without daily goals. */
  dailyGoals: { met: number; days: number } | null;
  /** Week goals met; null without week goals. */
  weekGoals: { met: number; total: number } | null;
}

/** The summary of the week containing `date`; null for a week that has not started yet. */
export function weekSummary(data: AppData, date: ISODate, today: ISODate, maxPersonalBests = 3): WeekSummary | null {
  const from = startOfWeek(date);
  if (compareISO(from, today) > 0) return null;
  const sunday = addDays(from, 6);
  const running = compareISO(sunday, today) > 0;
  const to = running ? today : sunday;
  const sessions = sessionsBetween(data, from, to);
  const before = data.sessions.filter((s) => compareISO(s.date, from) < 0);

  const days = dailyTotals(data, from, to);
  const byReps = days.some((d) => d.reps > 0);
  const best = days.reduce<(typeof days)[number] | null>((top, d) => {
    const v = byReps ? d.reps : d.seconds;
    return v > 0 && (!top || v > (byReps ? top.reps : top.seconds)) ? d : top;
  }, null);

  const rows = exerciseTotals(sessions); // reps, then seconds, descending
  const top = rows[0];

  const earlier = new Map(exerciseTotals(before).map((r) => [r.exerciseId, r]));
  const personalBests: PersonalBest[] = [];
  const firstTimes: string[] = [];
  for (const row of rows) {
    const prev = earlier.get(row.exerciseId);
    if (!prev) {
      firstTimes.push(row.exerciseId);
      continue;
    }
    if (prev.bestReps > 0 && row.bestReps > prev.bestReps) {
      personalBests.push({ exerciseId: row.exerciseId, unit: 'reps', value: row.bestReps, previous: prev.bestReps });
    } else if (prev.bestSeconds > 0 && row.bestSeconds > prev.bestSeconds) {
      personalBests.push({ exerciseId: row.exerciseId, unit: 'time', value: row.bestSeconds, previous: prev.bestSeconds });
    }
  }
  personalBests.sort((a, b) => b.value / b.previous - a.value / a.previous);

  const goals = data.settings.goals;
  const hasDaily = goals.some((g) => g.period === 'day');
  const weekProgress = goalProgress(data, to).filter((p) => p.goal.period === 'week');

  return {
    from,
    to,
    days: days.length,
    running,
    totals: totalsOf(sessions),
    activeDays: new Set(sessions.map((s) => s.date)).size,
    bestDay: best ? { date: best.date, reps: best.reps, seconds: best.seconds } : null,
    topExercise: top && (top.reps > 0 || top.seconds > 0) ? { exerciseId: top.exerciseId, reps: top.reps, seconds: top.seconds, entries: top.entries } : null,
    personalBests: personalBests.slice(0, maxPersonalBests),
    firstTimes,
    dailyGoals: hasDaily ? { met: daysAllGoalsMet(data, from, to).size, days: days.length } : null,
    weekGoals: weekProgress.length > 0 ? { met: weekProgress.filter((p) => p.done).length, total: weekProgress.length } : null,
  };
}

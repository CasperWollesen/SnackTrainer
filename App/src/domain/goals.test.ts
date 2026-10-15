import { describe, expect, it } from 'vitest';
import { upgradeAppData, validateAppData } from './backup';
import { clampTarget, daysAllGoalsMet, goalProgress, goalStreak, newlyReachedGoals, withGoal, withoutGoal } from './goals';
import { addEntry, type Amount } from './sessions';
import { DATA_VERSION, emptyData, type AppData, type DailyGoal } from './types';

function log(d: AppData, exerciseId: string, at: string, amount: Amount): AppData {
  return addEntry(d, { exerciseId, at, amount }).data;
}

function withGoals(d: AppData, goals: DailyGoal[]): AppData {
  return { ...d, settings: { ...d.settings, dailyGoals: goals } };
}

const ALL_REPS: DailyGoal = { id: 'all', metric: 'reps', target: 50 };
const PUSH_UPS: DailyGoal = { id: 'push', metric: 'reps', target: 30, exerciseId: 'push-up' };
const STRETCH: DailyGoal = { id: 'stretch', metric: 'time', target: 120, category: 'Stretching' };
const SNACKS: DailyGoal = { id: 'snacks', metric: 'sessions', target: 2 };

describe('daily goals', () => {
  it('counts reps, time and sessions for everything, one exercise or one category', () => {
    let d = withGoals(emptyData(), [ALL_REPS, PUSH_UPS, STRETCH, SNACKS]);
    d = log(d, 'push-up', '2026-10-15T07:30', { reps: 20 });
    d = log(d, 'squat', '2026-10-15T07:31', { reps: 15 });
    d = log(d, 'plank', '2026-10-15T07:32', { seconds: 60 }); // Core, not Stretching
    d = log(d, 'stretching', '2026-10-15T12:00', { seconds: 90 });
    d = log(d, 'push-up', '2026-10-14T07:30', { reps: 99 }); // another day
    const p = Object.fromEntries(goalProgress(d, '2026-10-15').map((x) => [x.goal.id, x]));
    expect(p.all).toMatchObject({ value: 35, done: false });
    expect(p.all!.fraction).toBeCloseTo(0.7);
    expect(p.push).toMatchObject({ value: 20, done: false });
    expect(p.stretch).toMatchObject({ value: 90, done: false });
    expect(p.snacks).toMatchObject({ value: 2, done: true, fraction: 1 });
  });

  it('reports the goals a change completes', () => {
    const before = log(withGoals(emptyData(), [ALL_REPS, PUSH_UPS]), 'push-up', '2026-10-15T07:30', { reps: 25 });
    const after = log(before, 'push-up', '2026-10-15T09:00', { reps: 10 });
    expect(newlyReachedGoals(before, after, '2026-10-15').map((g) => g.id)).toEqual(['push']);
    const more = log(after, 'squat', '2026-10-15T10:00', { reps: 20 });
    expect(newlyReachedGoals(after, more, '2026-10-15').map((g) => g.id)).toEqual(['all']);
    expect(newlyReachedGoals(more, log(more, 'squat', '2026-10-15T11:00', { reps: 5 }), '2026-10-15')).toEqual([]);
  });

  it('counts a streak of days met; an unfinished today does not break it', () => {
    let d = withGoals(emptyData(), [PUSH_UPS]);
    for (const day of ['2026-10-11', '2026-10-13', '2026-10-14']) d = log(d, 'push-up', `${day}T08:00`, { reps: 30 });
    expect(goalStreak(d, PUSH_UPS, '2026-10-15')).toBe(2); // 13th and 14th; 12th was missed
    d = log(d, 'push-up', '2026-10-15T08:00', { reps: 10 });
    expect(goalStreak(d, PUSH_UPS, '2026-10-15')).toBe(2);
    d = log(d, 'push-up', '2026-10-15T09:00', { reps: 20 });
    expect(goalStreak(d, PUSH_UPS, '2026-10-15')).toBe(3);
    expect(goalStreak(d, PUSH_UPS, '2026-10-17')).toBe(0);
  });

  it('finds the days in a range where every goal was met', () => {
    let d = withGoals(emptyData(), [PUSH_UPS, SNACKS]);
    d = log(d, 'push-up', '2026-10-12T08:00', { reps: 30 });
    d = log(d, 'push-up', '2026-10-12T15:00', { reps: 5 }); // two snacks + 35 push-ups: met
    d = log(d, 'push-up', '2026-10-13T08:00', { reps: 40 }); // one snack only: not met
    d = log(d, 'squat', '2026-10-14T08:00', { reps: 30 });
    d = log(d, 'squat', '2026-10-14T15:00', { reps: 30 }); // two snacks, no push-ups: not met
    d = log(d, 'push-up', '2026-10-20T08:00', { reps: 30 });
    d = log(d, 'push-up', '2026-10-20T15:00', { reps: 30 }); // met, but outside the range
    expect([...daysAllGoalsMet(d, '2026-10-12', '2026-10-18')]).toEqual(['2026-10-12']);
    expect(daysAllGoalsMet(withGoals(d, []), '2026-10-01', '2026-10-31').size).toBe(0);
  });

  it('edits the goal list and clamps targets', () => {
    expect(withGoal([ALL_REPS], PUSH_UPS)).toEqual([ALL_REPS, PUSH_UPS]);
    expect(withGoal([ALL_REPS, PUSH_UPS], { ...ALL_REPS, target: 80 })).toEqual([{ ...ALL_REPS, target: 80 }, PUSH_UPS]);
    expect(withoutGoal([ALL_REPS, PUSH_UPS], 'all')).toEqual([PUSH_UPS]);
    expect(clampTarget('reps', 0)).toBe(5);
    expect(clampTarget('reps', 47)).toBe(45);
    expect(clampTarget('time', 100)).toBe(90);
    expect(clampTarget('sessions', 99)).toBe(30);
  });

  it('upgrades version 4 data and drops unreadable goals', () => {
    const data = validateAppData(upgradeAppData({ version: 4, sessions: [], settings: { timerMode: 'down' } }));
    expect(data?.version).toBe(DATA_VERSION);
    expect(data?.settings.dailyGoals).toEqual([]);
    expect(data?.settings.timerMode).toBe('down');
    const goals = [PUSH_UPS, { id: 'x', metric: 'weight', target: 5 }, { id: 'y', metric: 'reps', target: 0 }, { ...PUSH_UPS }, STRETCH];
    expect(validateAppData({ version: DATA_VERSION, sessions: [], settings: { dailyGoals: goals } })?.settings.dailyGoals).toEqual([PUSH_UPS, STRETCH]);
  });
});

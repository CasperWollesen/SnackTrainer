import { describe, expect, it } from 'vitest';
import { upgradeAppData, validateAppData } from './backup';
import { clampTarget, daysAllGoalsMet, goalProgress, goalStreak, newlyReachedGoals, withGoal, withoutGoal } from './goals';
import { addEntry, type Amount } from './sessions';
import { DATA_VERSION, emptyData, type AppData, type Goal } from './types';

function log(d: AppData, exerciseId: string, at: string, amount: Amount): AppData {
  return addEntry(d, { exerciseId, at, amount }).data;
}

function withGoals(d: AppData, goals: Goal[]): AppData {
  return { ...d, settings: { ...d.settings, goals: goals } };
}

const ALL_REPS: Goal = { id: 'all', metric: 'reps', period: 'day', target: 50 };
const PUSH_UPS: Goal = { id: 'push', metric: 'reps', period: 'day', target: 30, exerciseId: 'push-up' };
const STRETCH: Goal = { id: 'stretch', metric: 'time', period: 'day', target: 120, category: 'Stretching' };
const SNACKS: Goal = { id: 'snacks', metric: 'sessions', period: 'day', target: 2 };
const WEEK_REPS: Goal = { id: 'week', metric: 'reps', period: 'week', target: 100 };

describe('goals', () => {
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

  it('counts only bodyweight exercises for a bodyweight goal, custom ones included', () => {
    const BODYWEIGHT: Goal = { id: 'bw', metric: 'reps', period: 'day', target: 40, bodyweight: true };
    let d = withGoals(emptyData(), [BODYWEIGHT]);
    d = { ...d, customExercises: [{ id: 'custom-1', name: 'Wall push', emoji: '', category: 'Custom', mode: 'reps', bodyweight: true }] };
    d = log(d, 'push-up', '2026-10-15T07:30', { reps: 20 }); // bodyweight
    d = log(d, 'bicep-curl', '2026-10-15T07:31', { reps: 12 }); // weights: not counted
    d = log(d, 'custom-1', '2026-10-15T07:32', { reps: 10 }); // custom bodyweight
    d = log(d, 'gone', '2026-10-15T07:33', { reps: 50 }); // unknown exercise: not counted
    expect(goalProgress(d, '2026-10-15')[0]).toMatchObject({ value: 30, done: false });
    expect(validateAppData({ version: DATA_VERSION, sessions: [], settings: { goals: [BODYWEIGHT] } })?.settings.goals).toEqual([BODYWEIGHT]);
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

  it('counts a week goal from Monday up to the day shown, with the pace of the week', () => {
    let d = withGoals(emptyData(), [WEEK_REPS, PUSH_UPS]);
    d = log(d, 'squat', '2026-10-11T08:00', { reps: 99 }); // Sunday of the week before
    d = log(d, 'squat', '2026-10-12T08:00', { reps: 40 }); // Monday
    d = log(d, 'push-up', '2026-10-14T08:00', { reps: 30 }); // Wednesday
    d = log(d, 'squat', '2026-10-16T08:00', { reps: 50 }); // Friday
    const wed = goalProgress(d, '2026-10-14').find((p) => p.goal.id === 'week')!;
    expect(wed).toMatchObject({ value: 70, done: false });
    expect(wed.pace).toBeCloseTo(3 / 7);
    expect(goalProgress(d, '2026-10-14').find((p) => p.goal.id === 'push')!.pace).toBeUndefined();
    expect(goalProgress(d, '2026-10-16').find((p) => p.goal.id === 'week')).toMatchObject({ value: 120, done: true });
    // Week goals do not decide single days in History.
    expect([...daysAllGoalsMet(d, '2026-10-12', '2026-10-18')]).toEqual(['2026-10-14']);
  });

  it('reports a week goal reached by a log, and counts weeks in a row', () => {
    let d = withGoals(emptyData(), [WEEK_REPS]);
    d = log(d, 'squat', '2026-09-30T08:00', { reps: 100 }); // week 40
    d = log(d, 'squat', '2026-10-06T08:00', { reps: 100 }); // week 41
    d = log(d, 'squat', '2026-10-12T08:00', { reps: 60 }); // week 42, not done yet
    expect(goalStreak(d, WEEK_REPS, '2026-10-15')).toBe(2); // the unfinished week does not break it
    const after = log(d, 'squat', '2026-10-15T08:00', { reps: 40 });
    expect(newlyReachedGoals(d, after, '2026-10-15').map((g) => g.id)).toEqual(['week']);
    expect(goalStreak(after, WEEK_REPS, '2026-10-15')).toBe(3);
    expect(goalStreak(after, WEEK_REPS, '2026-10-27')).toBe(0); // a whole week was missed
  });

  it('edits the goal list and clamps targets', () => {
    expect(withGoal([ALL_REPS], PUSH_UPS)).toEqual([ALL_REPS, PUSH_UPS]);
    expect(withGoal([ALL_REPS, PUSH_UPS], { ...ALL_REPS, target: 80 })).toEqual([{ ...ALL_REPS, target: 80 }, PUSH_UPS]);
    expect(withoutGoal([ALL_REPS, PUSH_UPS], 'all')).toEqual([PUSH_UPS]);
    expect(clampTarget('day', 'reps', 0)).toBe(5);
    expect(clampTarget('day', 'reps', 47)).toBe(45);
    expect(clampTarget('day', 'time', 100)).toBe(90);
    expect(clampTarget('day', 'sessions', 99)).toBe(30);
    expect(clampTarget('week', 'reps', 47)).toBe(50);
    expect(clampTarget('week', 'time', 100)).toBe(300);
  });

  it('upgrades version 5 daily goals to version 6 goals per day', () => {
    const v5 = { version: 5, sessions: [], settings: { dailyGoals: [{ id: 'a', metric: 'reps', target: 50 }] } };
    const data = validateAppData(upgradeAppData(v5));
    expect(data?.version).toBe(DATA_VERSION);
    expect(data?.settings.goals).toEqual([{ id: 'a', metric: 'reps', period: 'day', target: 50 }]);
    expect(data?.settings).not.toHaveProperty('dailyGoals');
  });

  it('upgrades version 4 data and drops unreadable goals', () => {
    const data = validateAppData(upgradeAppData({ version: 4, sessions: [], settings: { timerMode: 'down' } }));
    expect(data?.version).toBe(DATA_VERSION);
    expect(data?.settings.goals).toEqual([]);
    expect(data?.settings.timerMode).toBe('down');
    const goals = [PUSH_UPS, { id: 'x', metric: 'weight', target: 5 }, { id: 'y', metric: 'reps', target: 0 }, { ...PUSH_UPS }, STRETCH];
    expect(validateAppData({ version: DATA_VERSION, sessions: [], settings: { goals: goals } })?.settings.goals).toEqual([PUSH_UPS, STRETCH]);
  });
});

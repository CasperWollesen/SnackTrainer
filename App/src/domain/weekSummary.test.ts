import { describe, expect, it } from 'vitest';
import { addEntry, type Amount } from './sessions';
import { emptyData, type AppData, type Goal } from './types';
import { weekSummary } from './weekSummary';

function log(d: AppData, exerciseId: string, at: string, amount: Amount): AppData {
  return addEntry(d, { exerciseId, at, amount }).data;
}

// Week 42 of 2026: Monday 12 – Sunday 18 October.
function sample(): AppData {
  let d = emptyData();
  d = log(d, 'push-up', '2026-10-05T08:00', { reps: 20 }); // week before: best 20
  d = log(d, 'plank', '2026-10-06T08:00', { seconds: 60 }); // week before: best 1:00
  d = log(d, 'squat', '2026-10-07T08:00', { reps: 30 }); // week before: best 30
  d = log(d, 'push-up', '2026-10-12T08:00', { reps: 25 }); // Mon: new best (+25 %)
  d = log(d, 'squat', '2026-10-12T12:00', { reps: 20 });
  d = log(d, 'plank', '2026-10-14T08:00', { seconds: 90 }); // Wed: new best (+50 %)
  d = log(d, 'push-up', '2026-10-14T09:00', { reps: 15 });
  d = log(d, 'burpee', '2026-10-15T07:00', { reps: 10 }); // Thu: first time ever
  d = log(d, 'push-up', '2026-10-15T07:30', { reps: 40 }); // Thu: new best 40 (+100 %)
  return d;
}

describe('week summary', () => {
  it('sums up a running week up to today', () => {
    const s = weekSummary(sample(), '2026-10-14', '2026-10-15')!;
    expect(s).toMatchObject({ from: '2026-10-12', to: '2026-10-15', days: 4, running: true, activeDays: 3 });
    expect(s.totals).toMatchObject({ reps: 110, seconds: 90, entries: 6 });
    expect(s.bestDay).toEqual({ date: '2026-10-15', reps: 50, seconds: 0 });
    expect(s.topExercise).toEqual({ exerciseId: 'push-up', reps: 80, seconds: 0, entries: 3 });
    expect(s.firstTimes).toEqual(['burpee']);
    // Push-up 40 vs 20 (+100 %) before plank 1:30 vs 1:00 (+50 %); squat 20 is no best.
    expect(s.personalBests).toEqual([
      { exerciseId: 'push-up', unit: 'reps', value: 40, previous: 20 },
      { exerciseId: 'plank', unit: 'time', value: 90, previous: 60 },
    ]);
    expect(s.dailyGoals).toBeNull();
    expect(s.weekGoals).toBeNull();
  });

  it('counts a finished week in full, with goals', () => {
    const goals: Goal[] = [
      { id: 'd', metric: 'reps', period: 'day', target: 40 },
      { id: 'w', metric: 'reps', period: 'week', target: 100 },
    ];
    const d = { ...sample(), settings: { ...emptyData().settings, goals } };
    const s = weekSummary(d, '2026-10-12', '2026-10-20')!;
    expect(s).toMatchObject({ to: '2026-10-18', days: 7, running: false });
    expect(s.dailyGoals).toEqual({ met: 2, days: 7 }); // Mon 45 and Thu 50
    expect(s.weekGoals).toEqual({ met: 1, total: 1 });
  });

  it('uses time when a week has no reps, and is null for a future week', () => {
    const d = log(emptyData(), 'plank', '2026-10-13T08:00', { seconds: 45 });
    const s = weekSummary(d, '2026-10-13', '2026-10-15')!;
    expect(s.bestDay).toEqual({ date: '2026-10-13', reps: 0, seconds: 45 });
    expect(s.topExercise?.exerciseId).toBe('plank');
    expect(s.firstTimes).toEqual(['plank']);
    expect(weekSummary(d, '2026-10-20', '2026-10-15')).toBeNull();
    const empty = weekSummary(emptyData(), '2026-10-13', '2026-10-15')!;
    expect(empty.bestDay).toBeNull();
    expect(empty.topExercise).toBeNull();
  });
});

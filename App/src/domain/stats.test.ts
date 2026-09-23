import { describe, expect, it } from 'vitest';
import { addEntry, type Amount } from './sessions';
import { deltaOf, hourlyTotals, metricValue, nerdStats, streaks, summarize, weekdayTotals } from './stats';
import { emptyData, type AppData } from './types';

function log(d: AppData, at: string, exerciseId: string, amount: Amount) {
  return addEntry(d, { exerciseId, at, amount }).data;
}

function sample(): AppData {
  let d = emptyData();
  d = log(d, '2026-09-21T07:10', 'push-up', { reps: 20 }); // Mon
  d = log(d, '2026-09-21T07:12', 'squat', { reps: 30 }); // same session: 50
  d = log(d, '2026-09-21T15:00', 'plank', { seconds: 60 });
  d = log(d, '2026-09-22T08:30', 'push-up', { reps: 25 }); // Tue
  d = log(d, '2026-09-23T21:05', 'plank', { seconds: 90 }); // Wed
  return d;
}

describe('stats', () => {
  it('summarizes a range', () => {
    expect(summarize(sample(), { from: '2026-09-21', to: '2026-09-27' })).toEqual({
      reps: 75,
      seconds: 150,
      entries: 5,
      sessions: 4,
      activeDays: 3,
      days: 7,
    });
    expect(metricValue({ reps: 1, seconds: 2, sessions: 3 }, 'time')).toBe(2);
  });

  it('computes deltas', () => {
    expect(deltaOf(0, 0)).toEqual({ kind: 'none' });
    expect(deltaOf(5, 0)).toEqual({ kind: 'new' });
    expect(deltaOf(110, 100)).toEqual({ kind: 'change', percent: 10 });
    expect(deltaOf(0, 40)).toEqual({ kind: 'change', percent: -100 });
  });

  it('distributes by hour and weekday', () => {
    const d = sample();
    const hours = hourlyTotals(d.sessions);
    expect(hours[7]).toMatchObject({ reps: 50, entries: 2, sessions: 1 });
    expect(hours[21]).toMatchObject({ seconds: 90, sessions: 1 });
    const days = weekdayTotals(d.sessions);
    expect(days[0]).toMatchObject({ key: 1, reps: 50, seconds: 60, sessions: 2 });
    expect(days[2]).toMatchObject({ key: 3, seconds: 90 });
  });

  it('finds current and longest streaks', () => {
    const d = sample();
    expect(streaks(d.sessions, '2026-09-23')).toEqual({ current: 3, longest: 3, longestEnd: '2026-09-23' });
    // Today still empty: the streak ending yesterday is still alive.
    expect(streaks(d.sessions, '2026-09-24').current).toBe(3);
    expect(streaks(d.sessions, '2026-09-25').current).toBe(0);
    expect(streaks([], '2026-09-25')).toEqual({ current: 0, longest: 0, longestEnd: null });
  });

  it('computes nerd stats', () => {
    const n = nerdStats(sample().sessions);
    expect(n.activeDays).toBe(3);
    expect(n.perActiveDay.reps).toBe(25);
    expect(n.perSession).toEqual({ reps: 75 / 4, entries: 5 / 4 });
    expect(n.perSet).toEqual({ reps: 25, seconds: 75 });
    expect(n.biggestSession).toMatchObject({ value: 50, at: '2026-09-21T07:10' });
    expect(n.biggestDay).toMatchObject({ value: 50, date: '2026-09-21' });
    expect(n.bestSet).toMatchObject({ value: 30, exerciseId: 'squat' });
    expect(n.longestHold).toMatchObject({ value: 90, exerciseId: 'plank' });
    expect(n.earliest).toBe('2026-09-21T07:10');
    expect(n.latest).toBe('2026-09-23T21:05');
    expect(n.busiestHour).toBe(7);
    expect(n.busiestWeekday).toBe(1);
    expect(n.exercises).toBe(3);
    expect(nerdStats([]).biggestSession).toBeNull();
    expect(n.timed).toEqual({ count: 0, totalSeconds: 0, averageSeconds: 0, longestSeconds: 0 });
    const timed = sample().sessions.map((s, i) => (i < 2 ? { ...s, durationSeconds: (i + 1) * 300 } : s));
    expect(nerdStats(timed).timed).toEqual({ count: 2, totalSeconds: 900, averageSeconds: 450, longestSeconds: 600 });
  });
});

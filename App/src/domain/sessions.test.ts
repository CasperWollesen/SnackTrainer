import { describe, expect, it } from 'vitest';
import { addEntry, dailyTotals, deleteEntry, exerciseTotals, findSessionFor, restoreEntry, totalsOf, updateEntry } from './sessions';
import { emptyData, type AppData } from './types';

function log(data: AppData, at: string, exerciseId = 'push-up', reps = 10) {
  return addEntry(data, { exerciseId, at, amount: { reps } });
}

describe('session grouping', () => {
  it('creates a session for the first entry of the day', () => {
    const r = log(emptyData(), '2026-09-23T07:30');
    expect(r.createdSession).toBe(true);
    expect(r.data.sessions).toHaveLength(1);
    expect(r.session.startedAt).toBe('2026-09-23T07:30');
    expect(r.session.date).toBe('2026-09-23');
    expect(r.entry.reps).toBe(10);
    expect(r.entry.seconds).toBeUndefined();
  });

  it('joins the previous session within the gap and starts a new one after it', () => {
    let d = log(emptyData(), '2026-09-23T15:15', 'squat').data;
    const joined = log(d, '2026-09-23T15:25', 'push-up', 13);
    expect(joined.createdSession).toBe(false);
    d = joined.data;
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]!.entries.map((e) => e.exerciseId)).toEqual(['squat', 'push-up']);

    const later = log(d, '2026-09-23T15:46');
    expect(later.createdSession).toBe(true);
    expect(later.data.sessions).toHaveLength(2);
  });

  it('respects the configured gap', () => {
    const d = log(emptyData(), '2026-09-23T10:00').data;
    expect(findSessionFor(d, '2026-09-23T10:30', 20)).toBeNull();
    expect(findSessionFor(d, '2026-09-23T10:30', 45)).not.toBeNull();
    expect(findSessionFor(d, '2026-09-23T09:50', 45)).toBeNull(); // before the session
  });

  it('never joins across midnight', () => {
    const d = log(emptyData(), '2026-09-23T23:55').data;
    const r = log(d, '2026-09-24T00:05');
    expect(r.createdSession).toBe(true);
    expect(r.session.date).toBe('2026-09-24');
  });

  it('keeps sessions sorted by start time even when logging in the past', () => {
    let d = log(emptyData(), '2026-09-23T15:00').data;
    d = log(d, '2026-09-23T07:30').data;
    expect(d.sessions.map((s) => s.startedAt)).toEqual(['2026-09-23T07:30', '2026-09-23T15:00']);
  });
});

describe('editing', () => {
  it('updates reps and moves the session start when the first entry moves', () => {
    const r = log(emptyData(), '2026-09-23T07:30');
    let d = r.data;
    d = updateEntry(d, r.entry.id, { amount: { reps: 25 }, at: '2026-09-23T07:00' });
    expect(d.sessions[0]!.entries[0]!.reps).toBe(25);
    expect(d.sessions[0]!.startedAt).toBe('2026-09-23T07:00');
  });

  it('can switch an entry from reps to time', () => {
    const r = log(emptyData(), '2026-09-23T07:30', 'plank');
    const d = updateEntry(r.data, r.entry.id, { amount: { seconds: 90 } });
    expect(d.sessions[0]!.entries[0]).toMatchObject({ seconds: 90 });
    expect(d.sessions[0]!.entries[0]!.reps).toBeUndefined();
  });

  it('deletes an entry and removes an emptied session; restore brings it back', () => {
    const first = log(emptyData(), '2026-09-23T07:30');
    const second = log(first.data, '2026-09-23T07:35', 'squat');
    let d = deleteEntry(second.data, first.entry.id);
    expect(d.sessions[0]!.entries).toHaveLength(1);
    expect(d.sessions[0]!.startedAt).toBe('2026-09-23T07:35');
    d = deleteEntry(d, second.entry.id);
    expect(d.sessions).toHaveLength(0);

    d = restoreEntry(d, second.session, second.entry);
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]!.id).toBe(second.session.id);
    d = restoreEntry(d, first.session, first.entry);
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]!.entries.map((e) => e.exerciseId)).toEqual(['push-up', 'squat']);
  });
});

describe('totals', () => {
  it('sums reps, seconds, entries and sessions', () => {
    let d = log(emptyData(), '2026-09-22T07:30', 'push-up', 20).data;
    d = log(d, '2026-09-23T15:15', 'squat', 10).data;
    d = log(d, '2026-09-23T15:16', 'push-up', 13).data;
    d = addEntry(d, { exerciseId: 'plank', at: '2026-09-23T15:18', amount: { seconds: 60 } }).data;
    expect(totalsOf(d.sessions)).toEqual({ reps: 43, seconds: 60, entries: 4, sessions: 2 });

    const days = dailyTotals(d, '2026-09-21', '2026-09-23');
    expect(days.map((x) => x.reps)).toEqual([0, 20, 23]);
    expect(days[2]!.seconds).toBe(60);

    const perExercise = exerciseTotals(d.sessions);
    expect(perExercise[0]).toMatchObject({ exerciseId: 'push-up', reps: 33, entries: 2, bestReps: 20 });
    expect(perExercise.find((x) => x.exerciseId === 'plank')).toMatchObject({ seconds: 60, bestSeconds: 60 });
  });
});

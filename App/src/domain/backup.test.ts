import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, serializeBackup, validateAppData } from './backup';
import { addEntry } from './sessions';
import { emptyData } from './types';

describe('backup', () => {
  it('round-trips', () => {
    let d = emptyData();
    d = addEntry(d, { exerciseId: 'push-up', at: '2026-09-23T07:30', amount: { reps: 20 } }).data;
    d = addEntry(d, { exerciseId: 'plank', at: '2026-09-23T07:32', amount: { seconds: 45 } }).data;
    d.customExercises.push({ id: 'custom-1', name: 'Wall sit', emoji: '🧱', category: 'Custom', mode: 'time', bodyweight: true });
    d.settings.sessionGapMinutes = 30;
    const json = serializeBackup(createBackup(d, new Date('2026-09-23T10:00:00Z')));
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual(d);
    expect(parsed.summary).toEqual({
      sessions: 1,
      entries: 2,
      customExercises: 1,
      firstDate: '2026-09-23',
      lastDate: '2026-09-23',
      exportedAt: '2026-09-23T10:00:00.000Z',
    });
  });

  it('rejects garbage', () => {
    expect(parseBackup('nope')).toEqual({ ok: false, error: 'not-json' });
    expect(parseBackup('{"app":"ready","data":{}}')).toEqual({ ok: false, error: 'not-backup' });
    expect(parseBackup('{"app":"snacktrainer","formatVersion":9,"data":{}}')).toEqual({ ok: false, error: 'unsupported-version' });
    expect(parseBackup('{"app":"snacktrainer","formatVersion":1,"data":{"version":1,"sessions":[{}]}}')).toEqual({
      ok: false,
      error: 'invalid-data',
    });
  });

  it('rejects entries with both reps and seconds, or neither', () => {
    const base = { version: 1, sessions: [{ id: 's', date: '2026-09-23', startedAt: '2026-09-23T07:30', entries: [] as unknown[] }] };
    base.sessions[0]!.entries = [{ id: 'e', exerciseId: 'x', at: '2026-09-23T07:30', reps: 1, seconds: 1 }];
    expect(validateAppData(base)).toBeNull();
    base.sessions[0]!.entries = [{ id: 'e', exerciseId: 'x', at: '2026-09-23T07:30' }];
    expect(validateAppData(base)).toBeNull();
    base.sessions[0]!.entries = [{ id: 'e', exerciseId: 'x', at: '2026-09-23T07:30', reps: 5 }];
    expect(validateAppData(base)).not.toBeNull();
  });

  it('fills missing settings with defaults and sorts sessions', () => {
    const raw = {
      version: 1,
      sessions: [
        { id: 'b', date: '2026-09-23', startedAt: '2026-09-23T15:00', entries: [{ id: '2', exerciseId: 'x', at: '2026-09-23T15:00', reps: 1 }] },
        { id: 'a', date: '2026-09-23', startedAt: '2026-09-23T07:00', entries: [{ id: '1', exerciseId: 'x', at: '2026-09-23T07:00', reps: 1 }] },
      ],
    };
    const data = validateAppData(raw);
    expect(data?.sessions.map((s) => s.id)).toEqual(['a', 'b']);
    expect(data?.settings).toEqual({ sessionGapMinutes: 20, installHintDismissed: false });
    expect(data?.customExercises).toEqual([]);
  });
});

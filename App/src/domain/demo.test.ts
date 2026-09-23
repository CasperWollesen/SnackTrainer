import { describe, expect, it } from 'vitest';
import { validateAppData } from './backup';
import { compareISO } from './dates';
import { demoEntryCount, generateDemoSessions, hasDemoData, isDemoId, removeDemoData, withDemoData } from './demo';
import { addEntry } from './sessions';
import { emptyData } from './types';

const NOW = new Date(2026, 8, 23, 12, 30); // Wed 23 Sep 2026, 12:30 local

describe('demo data', () => {
  it('generates valid, deterministic, demo-marked sessions ending no later than now', () => {
    const a = generateDemoSessions(NOW);
    expect(a).toEqual(generateDemoSessions(NOW));
    expect(a.length).toBeGreaterThan(100);
    expect(a.every((s) => isDemoId(s.id) && s.entries.every((e) => isDemoId(e.id)))).toBe(true);
    expect(a.every((s) => s.date >= '2026-05-27' && s.date <= '2026-09-23')).toBe(true);
    expect(a.flatMap((s) => s.entries).every((e) => compareISO(e.at, '2026-09-23T12:30') <= 0)).toBe(true);
    // Passes the same validation as stored data and backups.
    const data = validateAppData({ ...emptyData(), sessions: a });
    expect(data?.sessions).toHaveLength(a.length);
  });

  it('trends upward', () => {
    const entries = generateDemoSessions(NOW).flatMap((s) => s.entries).filter((e) => e.exerciseId === 'push-up');
    const avg = (xs: typeof entries) => xs.reduce((n, e) => n + (e.reps ?? 0), 0) / xs.length;
    expect(avg(entries.slice(-20))).toBeGreaterThan(avg(entries.slice(0, 20)));
  });

  it('adds next to real data and removes only demo entries', () => {
    let d = addEntry(emptyData(), { exerciseId: 'squat', at: '2026-09-20T09:00', amount: { reps: 5 } }).data;
    const real = d.sessions[0]!;
    d = withDemoData(d, NOW);
    expect(hasDemoData(d)).toBe(true);
    expect(demoEntryCount(d)).toBeGreaterThan(100);
    // Inserting again replaces rather than doubles.
    expect(demoEntryCount(withDemoData(d, NOW))).toBe(demoEntryCount(d));

    const cleaned = removeDemoData(d);
    expect(cleaned.sessions).toEqual([real]);
    expect(hasDemoData(cleaned)).toBe(false);
  });

  it('never lets a real entry join a demo session', () => {
    let d = withDemoData(emptyData(), NOW);
    const demo = d.sessions[d.sessions.length - 1]!;
    const r = addEntry(d, { exerciseId: 'push-up', at: demo.entries[demo.entries.length - 1]!.at, amount: { reps: 1 } });
    expect(r.createdSession).toBe(true);
    d = removeDemoData(r.data);
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]!.entries[0]!.id).toBe(r.entry.id);
  });
});

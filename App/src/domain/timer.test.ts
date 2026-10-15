import { describe, expect, it } from 'vitest';
import { parseBackup, serializeBackup, createBackup, upgradeAppData, validateAppData } from './backup';
import { addEntry, deleteEntry, updateEntry } from './sessions';
import {
  autoStopIfIdle,
  countdownEndMs,
  discardSession,
  elapsedSeconds,
  finishCountdownIfDue,
  idleDeadline,
  remainingSeconds,
  restoreDiscarded,
  resumeSession,
  startSession,
  stopSession,
  touchSession,
} from './timer';
import { DATA_VERSION, emptyData, type AppData } from './types';

const START = new Date(2026, 8, 23, 10, 0, 0); // 23 Sep 2026 10:00:00 local
const T0 = START.getTime();
const MIN = 60_000;

function log(d: AppData, at: string, reps = 10) {
  return addEntry(d, { exerciseId: 'push-up', at, amount: { reps } });
}

describe('session timer', () => {
  it('starts without creating a session and puts entries into the timed session', () => {
    let d = startSession(emptyData(), START);
    expect(d.activeSession).toMatchObject({ startedAt: '2026-09-23T10:00', startedMs: T0, lastActivityMs: T0 });
    expect(d.sessions).toHaveLength(0);
    expect(startSession(d, new Date(T0 + MIN))).toBe(d); // no second timer

    const first = log(d, '2026-09-23T10:03');
    expect(first.session.id).toBe(d.activeSession!.id);
    expect(first.session.startedAt).toBe('2026-09-23T10:00'); // the timer start, not the entry
    d = first.data;
    // 40 minutes later is far past the 20-minute gap, but the timer still owns the entry.
    d = log(d, '2026-09-23T10:40').data;
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]!.entries).toHaveLength(2);
  });

  it('keeps the timer start when entries are edited or deleted', () => {
    let d = startSession(emptyData(), START);
    const r = log(d, '2026-09-23T10:05');
    d = log(r.data, '2026-09-23T10:08').data;
    d = deleteEntry(d, r.entry.id);
    expect(d.sessions[0]!.startedAt).toBe('2026-09-23T10:00');
    const other = d.sessions[0]!.entries[0]!;
    d = updateEntry(d, other.id, { at: '2026-09-23T09:55' }); // earlier than the start
    expect(d.sessions[0]!.startedAt).toBe('2026-09-23T09:55');
  });

  it('does not use the timer for entries on another day', () => {
    const d = startSession(emptyData(), START);
    const r = log(d, '2026-09-22T18:00');
    expect(r.session.id).not.toBe(d.activeSession!.id);
  });

  it('stops with a duration, or drops an empty timer', () => {
    let d = startSession(emptyData(), START);
    expect(stopSession(d, T0 + 5 * MIN)).toMatchObject({ session: null, data: { activeSession: null, sessions: [] } });

    d = log(d, '2026-09-23T10:02').data;
    const stop = stopSession(d, T0 + 6 * MIN + 12_000);
    expect(stop.session?.durationSeconds).toBe(372);
    expect(stop.data.activeSession).toBeNull();

    // Undo resumes the same session and clears the duration.
    const resumed = resumeSession(stop.data, stop.stopped!, T0 + 7 * MIN);
    expect(resumed.activeSession?.id).toBe(d.activeSession!.id);
    expect(resumed.activeSession?.lastActivityMs).toBe(T0 + 7 * MIN);
    expect(resumed.sessions[0]!.durationSeconds).toBeUndefined();
  });

  it('stops by itself at the last activity after the timeout', () => {
    let d = startSession(emptyData(), START);
    d = log(d, '2026-09-23T10:02').data;
    d = touchSession(d, T0 + 2 * MIN);
    expect(touchSession(d, T0 + 2 * MIN + 5_000, 15_000)).toBe(d); // throttled
    expect(idleDeadline(d.activeSession!, 5)).toBe(T0 + 7 * MIN);
    expect(elapsedSeconds(d.activeSession!, T0 + 90_000)).toBe(90);

    expect(autoStopIfIdle(d, T0 + 6 * MIN)).toBeNull();
    // Opened again an hour later: the session ends at the last activity (10:02), not now.
    const auto = autoStopIfIdle(d, T0 + 60 * MIN);
    expect(auto?.session?.durationSeconds).toBe(120);
  });

  it('upgrades v2 data and validates timer fields', () => {
    const v2 = { version: 2, sessions: [], settings: { sessionGapMinutes: 20, hiddenExerciseIds: ['squat'] } };
    const d = validateAppData(upgradeAppData(v2));
    expect(d).toMatchObject({ version: DATA_VERSION, activeSession: null, settings: { sessionTimeoutMinutes: 5, hiddenExerciseIds: ['squat'] } });

    let data = startSession(emptyData(), START);
    data = log(data, '2026-09-23T10:02').data;
    const finished = stopSession(data, T0 + 3 * MIN).data;
    const running = log(startSession(finished, new Date(T0 + 30 * MIN)), '2026-09-23T10:31').data;
    const parsed = parseBackup(serializeBackup(createBackup(running, new Date())));
    expect(parsed.ok && parsed.data).toEqual(running);

    // A broken timer is dropped, a broken duration rejects the data.
    expect(validateAppData({ ...running, activeSession: { id: 'x' } })?.activeSession).toBeNull();
    const bad = { ...running, sessions: [{ ...running.sessions[0]!, durationSeconds: -1 }] };
    expect(validateAppData(bad)).toBeNull();
  });

  describe('count-down', () => {
    it('counts down and ends by itself at its end time with the chosen length', () => {
      let d = startSession(emptyData(), START, 300);
      expect(d.activeSession?.countdownSeconds).toBe(300);
      expect(countdownEndMs(d.activeSession!)).toBe(T0 + 5 * MIN);
      expect(remainingSeconds(d.activeSession!, T0 + 500)).toBe(300);
      expect(remainingSeconds(d.activeSession!, T0 + 4 * MIN + 59_500)).toBe(1);
      d = log(d, '2026-09-23T10:01').data;
      expect(finishCountdownIfDue(d, T0 + 4 * MIN)).toBeNull();
      // Opened long after the end: still exactly five minutes.
      const r = finishCountdownIfDue(d, T0 + 90 * MIN)!;
      expect(r.data.activeSession).toBeNull();
      expect(r.session?.durationSeconds).toBe(300);
    });

    it('is not stopped by inactivity, and a count-up timer has no end', () => {
      const down = startSession(emptyData(), START, 20 * 60);
      expect(autoStopIfIdle(down, T0 + 10 * MIN)).toBeNull();
      const up = startSession(emptyData(), START);
      expect(countdownEndMs(up.activeSession!)).toBeNull();
      expect(remainingSeconds(up.activeSession!, T0)).toBe(0);
      expect(finishCountdownIfDue(up, T0 + 600 * MIN)).toBeNull();
    });

    it('leaves nothing behind when nothing was logged', () => {
      const r = finishCountdownIfDue(startSession(emptyData(), START, 60), T0 + MIN)!;
      expect(r.session).toBeNull();
      expect(r.data.sessions).toHaveLength(0);
      expect(r.data.activeSession).toBeNull();
    });
  });

  describe('discard', () => {
    it('throws away the timer and everything logged in it, other sessions stay; Undo restores', () => {
      let d = log(emptyData(), '2026-09-23T08:00').data; // an earlier quick log
      d = startSession(d, START, 300);
      d = log(d, '2026-09-23T10:01').data;
      d = log(d, '2026-09-23T10:02', 5).data;
      const before = d;
      const r = discardSession(d);
      expect(r.data.activeSession).toBeNull();
      expect(r.data.sessions).toHaveLength(1);
      expect(r.data.sessions[0]!.startedAt).toBe('2026-09-23T08:00');
      expect(r.session?.entries).toHaveLength(2);
      const back = restoreDiscarded(r.data, r.discarded!, r.session, T0 + 2 * MIN);
      expect(back.sessions).toEqual(before.sessions);
      expect(back.activeSession).toMatchObject({ id: before.activeSession!.id, countdownSeconds: 300, lastActivityMs: T0 + 2 * MIN });
    });

    it('discards an empty timer and does nothing without one', () => {
      const r = discardSession(startSession(emptyData(), START));
      expect(r.data.activeSession).toBeNull();
      expect(r.session).toBeNull();
      const none = emptyData();
      expect(discardSession(none).data).toBe(none);
    });
  });
});

import { useCallback, useMemo } from 'react';
import { removeDemoData, withDemoData } from '../domain/demo';
import {
  autoStopIfIdle,
  countdownEndMs,
  discardSession,
  finishCountdownIfDue,
  restoreDiscarded,
  resumeSession,
  startSession,
  stopSession,
  touchSession,
  type StopResult,
} from '../domain/timer';
import { dateOf } from '../domain/dates';
import { findExercise, unknownExercise, withHidden } from '../domain/exercises';
import { newlyReachedGoals, withGoal, withoutGoal } from '../domain/goals';
import { addEntry, deleteEntry, findEntry, restoreEntry, updateEntry, type Amount, type NewEntry } from '../domain/sessions';
import type { Goal, Exercise, LocalDateTime, Session } from '../domain/types';
import { repository } from '../storage/repository';
import { texts } from '../texts';
import { formatDuration, formatEntrySummary } from './format';
import { unlockSound } from './sound';
import { goalScope } from './components/GoalList';
import { useToast } from './hooks/useToast';

/** A count-down that ended by itself; App shows its summary. */
export interface CountdownFinished {
  session: Session | null;
  lengthSeconds: number;
  /** The time ran out a while ago (the app was closed), so no sound. */
  late: boolean;
}

/** User actions with toast feedback and Undo. Every write goes through the repository. */
export function useActions() {
  const toast = useToast();

  const afterWrite = useCallback(
    (message: string, undo?: () => void) => {
      if (repository.lastSaveFailed) {
        toast.show({ message: texts.toast.saveFailed, variant: 'error' });
        return;
      }
      toast.show(undo ? { message, actionLabel: texts.common.undo, onAction: undo } : { message });
    },
    [toast],
  );

  const log = useCallback(
    (input: NewEntry) => {
      const before = repository.get();
      const result = addEntry(before, input);
      repository.replaceAll(touchSession(result.data, Date.now()));
      const exercise = findExercise(result.data, input.exerciseId) ?? unknownExercise(input.exerciseId);
      const logged = texts.toast.logged(formatEntrySummary(result.entry, exercise));
      const reached = newlyReachedGoals(before, result.data, dateOf(result.entry.at));
      const names = reached.map((g) => `${goalScope(g, result.data).name}${g.period === 'week' ? ` (${texts.goals.thisWeek})` : ''}`);
      const message = reached.length > 0 ? texts.toast.goalReached(logged, names.join(', ')) : logged;
      afterWrite(message, () => {
        repository.update((d) => deleteEntry(d, result.entry.id));
      });
      return result;
    },
    [afterWrite],
  );

  const edit = useCallback(
    (entryId: string, patch: { at?: LocalDateTime; amount?: Amount }) => {
      const before = findEntry(repository.get(), entryId);
      repository.update((d) => updateEntry(d, entryId, patch));
      afterWrite(texts.toast.updated, before ? () => repository.update((d) => restoreEntry(d, before.session, before.entry)) : undefined);
    },
    [afterWrite],
  );

  const remove = useCallback(
    (entryId: string) => {
      const before = findEntry(repository.get(), entryId);
      if (!before) return;
      repository.update((d) => deleteEntry(d, entryId));
      afterWrite(texts.toast.deleted, () => {
        repository.update((d) => restoreEntry(d, before.session, before.entry));
      });
    },
    [afterWrite],
  );

  const saveGoal = useCallback(
    (goal: Goal) => {
      repository.setSettings({ goals: withGoal(repository.get().settings.goals, goal) });
      afterWrite(texts.toast.goalSaved);
    },
    [afterWrite],
  );

  const deleteGoal = useCallback(
    (goal: Goal) => {
      const before = repository.get().settings.goals;
      repository.setSettings({ goals: withoutGoal(before, goal.id) });
      afterWrite(texts.toast.goalDeleted, () => repository.setSettings({ goals: before }));
    },
    [afterWrite],
  );

  const saveExercise = useCallback(
    (exercise: Exercise) => {
      repository.saveCustomExercise(exercise);
      afterWrite(texts.toast.exerciseSaved);
    },
    [afterWrite],
  );

  const deleteExercise = useCallback(
    (exercise: Exercise) => {
      repository.deleteCustomExercise(exercise.id);
      afterWrite(texts.toast.exerciseDeleted, () => repository.saveCustomExercise(exercise));
    },
    [afterWrite],
  );

  /** Hides or shows exercises in the pickers. Undo restores the previous hidden list exactly. */
  const setHidden = useCallback(
    (ids: string[], hide: boolean) => {
      const before = repository.get().settings.hiddenExerciseIds;
      const after = withHidden(before, ids, hide);
      if (after.length === before.length && after.every((id, i) => id === before[i])) return;
      repository.setSettings({ hiddenExerciseIds: after });
      const name = ids.length === 1 ? (findExercise(repository.get(), ids[0]!)?.name ?? null) : null;
      const message = name
        ? hide
          ? texts.toast.exerciseHidden(name)
          : texts.toast.exerciseShown(name)
        : hide
          ? texts.toast.exercisesHidden(ids.length)
          : texts.toast.exercisesShown(ids.length);
      afterWrite(message, () => repository.setSettings({ hiddenExerciseIds: before }));
    },
    [afterWrite],
  );

  /** Adds (or refreshes) demo data, or removes it. Undo puts the previous sessions back. */
  const setDemo = useCallback(
    (on: boolean) => {
      const before = repository.get().sessions;
      repository.update((d) => (on ? withDemoData(d, new Date()) : removeDemoData(d)));
      afterWrite(on ? texts.toast.demoAdded : texts.toast.demoRemoved, () => repository.update((d) => ({ ...d, sessions: before })));
    },
    [afterWrite],
  );

  /** Starts counting up (null) or a count-down of that many minutes; the mode is remembered. */
  const startTimer = useCallback(
    (countdownMinutes: number | null) => {
      const countdown = countdownMinutes !== null;
      if (countdown) unlockSound(); // the start tap is the user gesture browsers require for the end beep
      repository.update((d) => {
        const settings = { ...d.settings, timerMode: countdown ? ('down' as const) : ('up' as const), ...(countdown ? { countdownMinutes } : {}) };
        return startSession({ ...d, settings }, new Date(), countdown ? countdownMinutes * 60 : undefined);
      });
      afterWrite(countdown ? texts.toast.countdownStarted(countdownMinutes) : texts.toast.sessionStarted);
    },
    [afterWrite],
  );

  /** Throws the running session away with everything logged in it; Undo brings it all back. */
  const discardTimer = useCallback(() => {
    const result = discardSession(repository.get());
    const { discarded, session } = result;
    if (!discarded) return;
    repository.replaceAll(result.data);
    afterWrite(texts.toast.sessionThrownAway(session?.entries.length ?? 0), () =>
      repository.update((d) => restoreDiscarded(d, discarded, session, Date.now())),
    );
  }, [afterWrite]);

  /** Shared by Stop and auto-stop: saves, then offers Undo (the timer runs on). */
  const afterStop = useCallback(
    (result: StopResult, message: (duration: string) => string) => {
      repository.replaceAll(result.data);
      const stopped = result.stopped;
      if (!result.session) {
        afterWrite(texts.toast.sessionDiscarded, stopped ? () => repository.update((d) => resumeSession(d, stopped, Date.now())) : undefined);
        return;
      }
      afterWrite(message(formatDuration(result.session.durationSeconds ?? 0)), () => {
        if (stopped) repository.update((d) => resumeSession(d, stopped, Date.now()));
      });
    },
    [afterWrite],
  );

  const stopTimer = useCallback(() => {
    afterStop(stopSession(repository.get(), Date.now()), texts.toast.sessionStopped);
  }, [afterStop]);

  /**
   * Ends a count-down whose time is up (returned, without a toast: App shows a summary) or a
   * count-up timer that has been idle too long (toast with Undo).
   */
  const autoStopTimer = useCallback((): CountdownFinished | null => {
    const d = repository.get();
    const nowMs = Date.now();
    const finished = finishCountdownIfDue(d, nowMs);
    if (finished && d.activeSession) {
      const end = countdownEndMs(d.activeSession) ?? nowMs;
      repository.replaceAll(finished.data);
      if (repository.lastSaveFailed) toast.show({ message: texts.toast.saveFailed, variant: 'error' });
      return { session: finished.session, lengthSeconds: d.activeSession.countdownSeconds ?? 0, late: nowMs - end > 5_000 };
    }
    const result = autoStopIfIdle(d, nowMs);
    if (result) afterStop(result, (duration) => texts.toast.sessionAutoStopped(duration, d.settings.sessionTimeoutMinutes));
    return null;
  }, [afterStop, toast]);

  /** Counts as activity for the running timer; writes at most every 15 seconds. */
  const touchTimer = useCallback((force = false) => {
    repository.update((d) => touchSession(d, Date.now(), force ? 0 : 15_000));
  }, []);

  return useMemo(
    () => ({ log, edit, remove, saveGoal, deleteGoal, saveExercise, deleteExercise, setHidden, setDemo, startTimer, stopTimer, discardTimer, autoStopTimer, touchTimer }),
    [log, edit, remove, saveGoal, deleteGoal, saveExercise, deleteExercise, setHidden, setDemo, startTimer, stopTimer, discardTimer, autoStopTimer, touchTimer],
  );
}

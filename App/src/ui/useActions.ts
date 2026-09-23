import { useCallback, useMemo } from 'react';
import { removeDemoData, withDemoData } from '../domain/demo';
import { autoStopIfIdle, resumeSession, startSession, stopSession, touchSession, type StopResult } from '../domain/timer';
import { findExercise, unknownExercise, withHidden } from '../domain/exercises';
import { addEntry, deleteEntry, findEntry, restoreEntry, updateEntry, type Amount, type NewEntry } from '../domain/sessions';
import type { Exercise, LocalDateTime } from '../domain/types';
import { repository } from '../storage/repository';
import { texts } from '../texts';
import { formatDuration, formatEntrySummary } from './format';
import { useToast } from './hooks/useToast';

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
      const result = addEntry(repository.get(), input);
      repository.replaceAll(touchSession(result.data, Date.now()));
      const exercise = findExercise(result.data, input.exerciseId) ?? unknownExercise(input.exerciseId);
      afterWrite(texts.toast.logged(formatEntrySummary(result.entry, exercise)), () => {
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

  const startTimer = useCallback(() => {
    repository.update((d) => startSession(d, new Date()));
    afterWrite(texts.toast.sessionStarted);
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

  /** Runs the idle check; returns true when the timer was stopped. */
  const autoStopTimer = useCallback((): boolean => {
    const d = repository.get();
    const result = autoStopIfIdle(d, Date.now());
    if (!result) return false;
    afterStop(result, (duration) => texts.toast.sessionAutoStopped(duration, d.settings.sessionTimeoutMinutes));
    return true;
  }, [afterStop]);

  /** Counts as activity for the running timer; writes at most every 15 seconds. */
  const touchTimer = useCallback((force = false) => {
    repository.update((d) => touchSession(d, Date.now(), force ? 0 : 15_000));
  }, []);

  return useMemo(
    () => ({ log, edit, remove, saveExercise, deleteExercise, setHidden, setDemo, startTimer, stopTimer, autoStopTimer, touchTimer }),
    [log, edit, remove, saveExercise, deleteExercise, setHidden, setDemo, startTimer, stopTimer, autoStopTimer, touchTimer],
  );
}

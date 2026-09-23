import { useCallback, useMemo } from 'react';
import { findExercise, unknownExercise } from '../domain/exercises';
import { addEntry, deleteEntry, findEntry, restoreEntry, updateEntry, type Amount, type NewEntry } from '../domain/sessions';
import type { Exercise, LocalDateTime } from '../domain/types';
import { repository } from '../storage/repository';
import { texts } from '../texts';
import { formatEntrySummary } from './format';
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
      repository.replaceAll(result.data);
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

  return useMemo(() => ({ log, edit, remove, saveExercise, deleteExercise }), [log, edit, remove, saveExercise, deleteExercise]);
}

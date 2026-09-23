import { describe, expect, it } from 'vitest';
import { BUILT_IN_EXERCISES, groupByCategory, recentExerciseIds, searchExercises } from './exercises';
import { addEntry } from './sessions';
import { emptyData } from './types';

describe('exercise catalogue', () => {
  it('has unique ids and exactly one time exercise by default', () => {
    const ids = new Set(BUILT_IN_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(BUILT_IN_EXERCISES.length);
    expect(BUILT_IN_EXERCISES.filter((e) => e.mode === 'time').map((e) => e.id)).toEqual(['plank']);
  });

  it('searches ignoring case and punctuation', () => {
    expect(searchExercises(BUILT_IN_EXERCISES, 'pushup').map((e) => e.id)).toEqual(['push-up']);
    expect(searchExercises(BUILT_IN_EXERCISES, 'PUSH').map((e) => e.id)).toContain('push-up');
    expect(searchExercises(BUILT_IN_EXERCISES, 'core plank').map((e) => e.id)).toEqual(['plank']);
    expect(searchExercises(BUILT_IN_EXERCISES, '')).toHaveLength(BUILT_IN_EXERCISES.length);
  });

  it('orders recent exercises by last use', () => {
    let d = emptyData();
    d = addEntry(d, { exerciseId: 'squat', at: '2026-09-23T07:00', amount: { reps: 1 } }).data;
    d = addEntry(d, { exerciseId: 'push-up', at: '2026-09-23T08:00', amount: { reps: 1 } }).data;
    d = addEntry(d, { exerciseId: 'squat', at: '2026-09-23T09:00', amount: { reps: 1 } }).data;
    expect(recentExerciseIds(d)).toEqual(['squat', 'push-up']);
    expect(recentExerciseIds(d, 1)).toEqual(['squat']);
  });

  it('groups by category in catalogue order with custom last', () => {
    const groups = groupByCategory([
      { id: 'c', name: 'C', emoji: '', category: 'Custom', mode: 'reps', bodyweight: false },
      { id: 'p', name: 'P', emoji: '', category: 'Chest', mode: 'reps', bodyweight: true },
      { id: 's', name: 'S', emoji: '', category: 'Legs', mode: 'reps', bodyweight: true },
    ]);
    expect(groups.map((g) => g.category)).toEqual(['Legs', 'Chest', 'Custom']);
  });
});

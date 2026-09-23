import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_EXERCISES,
  groupByCategory,
  hiddenExercises,
  recentExerciseIds,
  searchExercises,
  unusedBuiltInIds,
  visibleExercises,
  withHidden,
} from './exercises';
import { addEntry } from './sessions';
import { emptyData } from './types';

describe('exercise catalogue', () => {
  it('has unique ids and, outside Stretching, only Plank timed by default', () => {
    const ids = new Set(BUILT_IN_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(BUILT_IN_EXERCISES.length);
    expect(BUILT_IN_EXERCISES.filter((e) => e.mode === 'time' && e.category !== 'Stretching').map((e) => e.id)).toEqual(['plank']);
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

  it('has a Stretching group that defaults to time', () => {
    const stretches = BUILT_IN_EXERCISES.filter((e) => e.category === 'Stretching');
    expect(stretches.length).toBeGreaterThanOrEqual(15);
    expect(stretches.find((e) => e.id === 'hamstring-stretch')?.mode).toBe('time');
    expect(searchExercises(BUILT_IN_EXERCISES, 'stretch').length).toBeGreaterThanOrEqual(10);
    expect(groupByCategory(stretches).map((g) => g.category)).toEqual(['Stretching']);
  });

  it('hides and shows exercises', () => {
    const d = emptyData();
    d.customExercises.push({ id: 'custom-1', name: 'Wall sit', emoji: '', category: 'Custom', mode: 'time', bodyweight: true });
    d.settings.hiddenExerciseIds = withHidden([], ['squat', 'custom-1', 'squat'], true);
    expect(d.settings.hiddenExerciseIds).toEqual(['squat', 'custom-1']);
    expect(visibleExercises(d).some((e) => e.id === 'squat' || e.id === 'custom-1')).toBe(false);
    expect(visibleExercises(d)).toHaveLength(BUILT_IN_EXERCISES.length - 1);
    expect(hiddenExercises(d).map((e) => e.id)).toEqual(['squat', 'custom-1']);
    expect(withHidden(d.settings.hiddenExerciseIds, ['squat'], false)).toEqual(['custom-1']);
  });

  it('lists built-ins never logged and not already hidden', () => {
    let d = emptyData();
    d = addEntry(d, { exerciseId: 'push-up', at: '2026-09-23T07:00', amount: { reps: 10 } }).data;
    d.settings.hiddenExerciseIds = ['squat'];
    const unused = unusedBuiltInIds(d);
    expect(unused).not.toContain('push-up');
    expect(unused).not.toContain('squat');
    expect(unused).toHaveLength(BUILT_IN_EXERCISES.length - 2);
  });
});

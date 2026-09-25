import { ChevronRight, Search, Timer, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { findExercise, groupByCategory, hiddenExercises, recentExerciseIds, searchExercises, visibleExercises } from '../../domain/exercises';
import type { AppData, Exercise } from '../../domain/types';
import { texts } from '../../texts';
import { IconButton } from './Button';

export interface ExercisePickerProps {
  data: AppData;
  onPick: (exercise: Exercise) => void;
  /** Extra content rendered per row (e.g. totals on the Exercises tab). */
  renderSide?: (exercise: Exercise) => ReactNode;
  /** Highlighted exercise id, if any. */
  selectedId?: string | null;
  autoFocus?: boolean;
  /** Rendered between the search box and the list (e.g. an "Add exercise" button). */
  extra?: ReactNode;
}

/**
 * Search box, every exercise used so far (most recently used first, right under the search box)
 * and the catalogue grouped by category. Hidden exercises are left out, except that a search also
 * lists hidden matches in a trailing "Hidden" group.
 */
export function ExercisePicker({ data, onPick, renderSide, selectedId = null, autoFocus = false, extra }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const exercises = useMemo(() => visibleExercises(data), [data]);
  const recent = useMemo(() => {
    const visible = new Set(exercises.map((e) => e.id));
    return recentExerciseIds(data, Infinity)
      .filter((id) => visible.has(id))
      .map((id) => findExercise(data, id))
      .filter((e): e is Exercise => Boolean(e));
  }, [data, exercises]);
  const searching = query.trim().length > 0;
  const matches = useMemo(() => searchExercises(exercises, query), [exercises, query]);
  const hiddenMatches = useMemo(() => (searching ? searchExercises(hiddenExercises(data), query) : []), [data, query, searching]);
  const groups = useMemo(() => {
    const visibleGroups = groupByCategory(matches);
    return hiddenMatches.length > 0 ? [...visibleGroups, { category: texts.exercises.hiddenMatches, exercises: hiddenMatches }] : visibleGroups;
  }, [matches, hiddenMatches]);

  const row = (e: Exercise) => (
    <button key={e.id} type="button" className="exercise-row" aria-pressed={e.id === selectedId} onClick={() => onPick(e)}>
      <span className="entry__emoji" aria-hidden="true">
        {e.emoji || '🏃'}
      </span>
      <span className="exercise-row__body">
        <span className="exercise-row__name">{e.name}</span>
        {renderSide ? <span className="exercise-row__meta">{renderSide(e)}</span> : null}
      </span>
      <span className="exercise-row__side">
        {e.mode === 'time' ? <Timer size={16} aria-label={texts.common.time} /> : null}
        <ChevronRight size={18} aria-hidden="true" />
      </span>
    </button>
  );

  return (
    <div className="form">
      <div className="search">
        <Search size={18} aria-hidden="true" />
        <input
          className="input"
          type="search"
          placeholder={texts.exercises.searchPlaceholder}
          aria-label={texts.common.search}
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? <IconButton className="search__clear" label={texts.common.close} icon={<X size={18} />} onClick={() => setQuery('')} /> : null}
      </div>

      {extra}

      {!searching && recent.length > 0 ? (
        <div className="exercise-group">
          <div className="exercise-group__title">{texts.exercises.recent}</div>
          {recent.map(row)}
        </div>
      ) : null}

      {groups.length === 0 ? <p className="field__hint">{texts.exercises.noMatch}</p> : null}

      {groups.map((g) => (
        <div key={g.category} className="exercise-group">
          <div className="exercise-group__title">{g.category}</div>
          {g.exercises.map(row)}
        </div>
      ))}
    </div>
  );
}

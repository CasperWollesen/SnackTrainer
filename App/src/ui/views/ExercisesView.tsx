import { ChevronRight, EyeOff, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { hiddenExercises, unusedBuiltInIds } from '../../domain/exercises';
import { exerciseTotals } from '../../domain/sessions';
import type { AppData, Exercise } from '../../domain/types';
import { texts } from '../../texts';
import { Button } from '../components/Button';
import { ExercisePicker } from '../components/ExercisePicker';
import { Section } from '../components/Section';
import { formatDuration, formatRelativeDay } from '../format';

export interface ExercisesViewProps {
  data: AppData;
  today: string;
  /** Opens the exercise page (history, log, hide). */
  onOpen: (exercise: Exercise) => void;
  onAddCustom: () => void;
  onSetHidden: (ids: string[], hidden: boolean) => void;
}

export function ExercisesView({ data, today, onOpen, onAddCustom, onSetHidden }: ExercisesViewProps) {
  const totals = useMemo(() => new Map(exerciseTotals(data.sessions).map((t) => [t.exerciseId, t])), [data.sessions]);
  const hidden = useMemo(() => hiddenExercises(data), [data]);
  const unused = useMemo(() => unusedBuiltInIds(data), [data]);

  const renderSide = (e: Exercise) => {
    const t = totals.get(e.id);
    if (!t || !t.lastAt) return texts.exercises.never;
    const amount = t.reps > 0 ? `${t.reps} ${texts.common.reps}` : formatDuration(t.seconds);
    return `${texts.exercises.total} ${amount} · ${texts.exercises.lastUsed} ${formatRelativeDay(t.lastAt.slice(0, 10), today).toLowerCase()}`;
  };

  return (
    <div className="view">
      <header className="view__header">
        <div className="view__heading">
          <h1 className="view__title">{texts.exercises.title}</h1>
        </div>
        <div className="view__tools">
          <Button size="sm" icon={<Plus size={16} />} onClick={onAddCustom}>
            {texts.exercises.addCustom}
          </Button>
        </div>
      </header>
      <ExercisePicker data={data} onPick={onOpen} renderSide={renderSide} />

      {/* Offered once something has been logged, so a new user does not hide the whole catalogue. */}
      {data.sessions.length > 0 && unused.length > 0 ? (
        <div className="card tidy">
          <div className="tidy__text">
            <strong>{texts.exercises.tidyTitle}</strong>
            <span>{texts.exercises.tidyText}</span>
          </div>
          <Button size="sm" icon={<EyeOff size={16} />} onClick={() => onSetHidden(unused, true)}>
            {texts.exercises.hideUnused(unused.length)}
          </Button>
        </div>
      ) : null}

      {hidden.length > 0 ? (
        <Section
          title={texts.exercises.hidden}
          count={hidden.length}
          action={
            <Button size="sm" variant="ghost" onClick={() => onSetHidden(hidden.map((e) => e.id), false)}>
              {texts.exercises.showAllHidden}
            </Button>
          }
        >
          <div className="exercise-group">
            {hidden.map((e) => (
              <button key={e.id} type="button" className="exercise-row exercise-row--hidden" onClick={() => onOpen(e)}>
                <span className="entry__emoji" aria-hidden="true">
                  {e.emoji || '🏃'}
                </span>
                <span className="exercise-row__body">
                  <span className="exercise-row__name">{e.name}</span>
                  <span className="exercise-row__meta">{renderSide(e)}</span>
                </span>
                <span className="exercise-row__side">
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { exerciseTotals } from '../../domain/sessions';
import type { AppData, Exercise } from '../../domain/types';
import { texts } from '../../texts';
import { Button } from '../components/Button';
import { ExercisePicker } from '../components/ExercisePicker';
import { formatDuration, formatRelativeDay } from '../format';

export interface ExercisesViewProps {
  data: AppData;
  today: string;
  onPick: (exercise: Exercise) => void;
  onAddCustom: () => void;
}

export function ExercisesView({ data, today, onPick, onAddCustom }: ExercisesViewProps) {
  const totals = useMemo(() => new Map(exerciseTotals(data.sessions).map((t) => [t.exerciseId, t])), [data.sessions]);

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
      <ExercisePicker data={data} onPick={onPick} renderSide={renderSide} />
    </div>
  );
}

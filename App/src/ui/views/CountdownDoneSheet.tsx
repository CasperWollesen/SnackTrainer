import { Plus } from 'lucide-react';
import { findExercise, unknownExercise } from '../../domain/exercises';
import { exerciseTotals, totalsOf } from '../../domain/sessions';
import type { AppData } from '../../domain/types';
import { texts } from '../../texts';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { formatDuration } from '../format';
import type { CountdownFinished } from '../useActions';

export interface CountdownDoneSheetProps {
  finished: CountdownFinished | null;
  data: AppData;
  onClose: () => void;
  onLog: () => void;
}

/** The summary when a count-down runs out: what was done, per exercise, and the total. */
export function CountdownDoneSheet({ finished, data, onClose, onLog }: CountdownDoneSheetProps) {
  const session = finished?.session ?? null;
  const rows = session ? exerciseTotals([session]) : [];
  const totals = session ? totalsOf([session]) : null;
  const totalParts = totals
    ? [totals.reps > 0 ? `${totals.reps} ${texts.common.reps}` : '', totals.seconds > 0 ? formatDuration(totals.seconds) : ''].filter(Boolean).join(' · ')
    : '';

  return (
    <Sheet
      open={finished !== null}
      onClose={onClose}
      title={texts.timer.done.title}
      footer={
        <>
          <Button variant="ghost" icon={<Plus size={18} />} onClick={onLog}>
            {texts.timer.done.log}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {texts.timer.done.close}
          </Button>
        </>
      }
    >
      <p className="settings-group__text">{texts.timer.done.subtitle(formatDuration(finished?.lengthSeconds ?? 0))}</p>
      {rows.length === 0 ? (
        <p className="settings-group__text">{texts.timer.done.nothing}</p>
      ) : (
        <div className="list">
          {rows.map((row) => {
            const exercise = findExercise(data, row.exerciseId) ?? unknownExercise(row.exerciseId);
            return (
              <div key={row.exerciseId} className="entry">
                <span className="entry__emoji" aria-hidden="true">
                  {exercise.emoji || '🏃'}
                </span>
                <span className="entry__body">
                  <span className="entry__name">{exercise.name}</span>
                </span>
                <span className={`entry__amount${row.reps === 0 ? ' entry__amount--time' : ''}`}>
                  {row.reps > 0 ? row.reps : formatDuration(row.seconds)}
                  {row.reps > 0 ? <small>{texts.common.reps}</small> : null}
                </span>
              </div>
            );
          })}
          {totalParts ? <p className="field__hint">{texts.timer.done.total(totalParts)}</p> : null}
        </div>
      )}
    </Sheet>
  );
}

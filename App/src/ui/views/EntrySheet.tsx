import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dateOf, joinDateTime, timeOf } from '../../domain/dates';
import { findExercise, unknownExercise } from '../../domain/exercises';
import type { Amount } from '../../domain/sessions';
import type { AppData, Entry, ExerciseMode, LocalDateTime, TimeString } from '../../domain/types';
import { texts } from '../../texts';
import { Button, Segmented } from '../components/Button';
import { Counter } from '../components/Counter';
import { Sheet } from '../components/Sheet';
import { Stopwatch } from '../components/Stopwatch';
import { formatDayShort } from '../format';

export interface EntrySheetProps {
  entry: Entry | null;
  data: AppData;
  onClose: () => void;
  onSave: (entryId: string, patch: { at?: LocalDateTime; amount?: Amount }) => void;
  onDelete: (entryId: string) => void;
}

const MODE_OPTIONS: { value: ExerciseMode; label: string }[] = [
  { value: 'reps', label: texts.log.modeReps },
  { value: 'time', label: texts.log.modeTime },
];

/** Edit or delete one logged entry. */
export function EntrySheet({ entry, data, onClose, onSave, onDelete }: EntrySheetProps) {
  const [mode, setMode] = useState<ExerciseMode>('reps');
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [time, setTime] = useState<TimeString>('12:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setMode(entry.seconds !== undefined ? 'time' : 'reps');
    setReps(entry.reps ?? 0);
    setSeconds(entry.seconds ?? 0);
    setTime(timeOf(entry.at));
    setError(null);
  }, [entry]);

  const exercise = entry ? (findExercise(data, entry.exerciseId) ?? unknownExercise(entry.exerciseId)) : null;

  const save = () => {
    if (!entry) return;
    const amount: Amount | null = mode === 'reps' ? (reps > 0 ? { reps } : null) : seconds > 0 ? { seconds } : null;
    if (!amount) {
      setError(texts.log.nothingToSave);
      return;
    }
    onSave(entry.id, { at: joinDateTime(dateOf(entry.at), time), amount });
    onClose();
  };

  return (
    <Sheet
      open={entry !== null}
      onClose={onClose}
      title={exercise ? `${exercise.emoji} ${exercise.name}` : texts.entry.title}
      footer={
        <>
          <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => entry && (onDelete(entry.id), onClose())}>
            {texts.common.delete}
          </Button>
          <Button variant="primary" onClick={save}>
            {texts.entry.save}
          </Button>
        </>
      }
    >
      {entry ? (
        <div className="form">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} label={texts.log.modeReps} />
          </div>
          {mode === 'reps' ? <Counter value={reps} onChange={setReps} /> : <Stopwatch value={seconds} onChange={setSeconds} />}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="when">
            <label className="when__label" htmlFor="entry-time">
              <strong>{texts.log.when}</strong>
              <span>{formatDayShort(dateOf(entry.at))}</span>
            </label>
            <input id="entry-time" className="input" type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

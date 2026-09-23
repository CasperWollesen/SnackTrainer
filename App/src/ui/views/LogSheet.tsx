import { useEffect, useState } from 'react';
import { joinDateTime } from '../../domain/dates';
import type { Amount, NewEntry } from '../../domain/sessions';
import type { AppData, Exercise, ExerciseMode, ISODate, TimeString } from '../../domain/types';
import { texts } from '../../texts';
import { Button, Segmented } from '../components/Button';
import { Counter } from '../components/Counter';
import { ExercisePicker } from '../components/ExercisePicker';
import { Sheet } from '../components/Sheet';
import { Stopwatch } from '../components/Stopwatch';
import { formatRelativeDay } from '../format';

export interface LogSheetProps {
  open: boolean;
  data: AppData;
  /** The day shown on the Today tab; entries are logged to it. */
  date: ISODate;
  today: ISODate;
  nowTime: TimeString;
  /** Preselected exercise (from the Exercises tab), or null to start with the picker. */
  initialExercise: Exercise | null;
  onClose: () => void;
  onSave: (input: NewEntry) => void;
}

const MODE_OPTIONS: { value: ExerciseMode; label: string }[] = [
  { value: 'reps', label: texts.log.modeReps },
  { value: 'time', label: texts.log.modeTime },
];

/**
 * Two-step sheet: pick an exercise, then enter reps or time.
 * "Save & add another" keeps the sheet open and goes back to the picker.
 */
export function LogSheet({ open, data, date, today, nowTime, initialExercise, onClose, onSave }: LogSheetProps) {
  const [exercise, setExercise] = useState<Exercise | null>(initialExercise);
  const [mode, setMode] = useState<ExerciseMode>(initialExercise?.mode ?? 'reps');
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [time, setTime] = useState<TimeString>(nowTime);
  const [timeTouched, setTimeTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when the sheet opens.
  useEffect(() => {
    if (!open) return;
    setExercise(initialExercise);
    setMode(initialExercise?.mode ?? 'reps');
    setReps(0);
    setSeconds(0);
    setTime(nowTime);
    setTimeTouched(false);
    setError(null);
    // nowTime intentionally read only at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialExercise]);

  // Follow the clock while the user has not touched the time field.
  useEffect(() => {
    if (open && !timeTouched && date === today) setTime(nowTime);
  }, [nowTime, open, timeTouched, date, today]);

  const pick = (e: Exercise) => {
    setExercise(e);
    setMode(e.mode);
    setReps(0);
    setSeconds(0);
    setError(null);
  };

  const build = (): NewEntry | null => {
    if (!exercise) return null;
    const amount: Amount | null = mode === 'reps' ? (reps > 0 ? { reps } : null) : seconds > 0 ? { seconds } : null;
    if (!amount) {
      setError(texts.log.nothingToSave);
      return null;
    }
    return { exerciseId: exercise.id, at: joinDateTime(date, time), amount };
  };

  const save = (another: boolean) => {
    const input = build();
    if (!input) return;
    onSave(input);
    if (another) {
      setExercise(null);
      setReps(0);
      setSeconds(0);
      setError(null);
    } else {
      onClose();
    }
  };

  const title = exercise ? texts.log.amountTitle(`${exercise.emoji} ${exercise.name}`) : texts.log.pickTitle;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      tall
      onBack={exercise ? () => setExercise(null) : undefined}
      footer={
        exercise ? (
          <>
            <Button onClick={() => save(true)}>{texts.log.saveAndAnother}</Button>
            <Button variant="primary" onClick={() => save(false)}>
              {texts.log.save}
            </Button>
          </>
        ) : undefined
      }
    >
      {!exercise ? (
        <ExercisePicker data={data} onPick={pick} autoFocus={false} />
      ) : (
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
            <label className="when__label" htmlFor="log-time">
              <strong>{texts.log.when}</strong>
              <span>{texts.log.dateLabel(formatRelativeDay(date, today))}</span>
            </label>
            <input
              id="log-time"
              className="input"
              type="time"
              value={time}
              onChange={(e) => {
                if (e.target.value) {
                  setTime(e.target.value);
                  setTimeTouched(true);
                }
              }}
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}

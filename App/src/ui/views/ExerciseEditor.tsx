import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CATEGORY_ORDER, CUSTOM_CATEGORY } from '../../domain/exercises';
import { newId } from '../../domain/ids';
import type { Exercise, ExerciseMode } from '../../domain/types';
import { texts } from '../../texts';
import { Button, Segmented } from '../components/Button';
import { Field, Toggle } from '../components/FormFields';
import { Sheet } from '../components/Sheet';

export interface ExerciseEditorProps {
  open: boolean;
  /** Existing custom exercise to edit, or null for a new one. */
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

const MODE_OPTIONS: { value: ExerciseMode; label: string }[] = [
  { value: 'reps', label: texts.exerciseEditor.modeReps },
  { value: 'time', label: texts.exerciseEditor.modeTime },
];

export function ExerciseEditor({ open, exercise, onClose, onSave, onDelete }: ExerciseEditorProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState(CUSTOM_CATEGORY);
  const [mode, setMode] = useState<ExerciseMode>('reps');
  const [bodyweight, setBodyweight] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? '');
    setEmoji(exercise?.emoji ?? '');
    setCategory(exercise?.category ?? CUSTOM_CATEGORY);
    setMode(exercise?.mode ?? 'reps');
    setBodyweight(exercise?.bodyweight ?? true);
    setError(null);
  }, [open, exercise]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(texts.exerciseEditor.nameRequired);
      return;
    }
    onSave({
      id: exercise?.id ?? `custom-${newId()}`,
      name: trimmed,
      emoji: [...emoji.trim()].slice(0, 2).join(''),
      category,
      mode,
      bodyweight,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? texts.exerciseEditor.editTitle : texts.exerciseEditor.newTitle}
      footer={
        <>
          {exercise ? (
            <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => (onDelete(exercise), onClose())}>
              {texts.common.delete}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              {texts.common.cancel}
            </Button>
          )}
          <Button variant="primary" onClick={save}>
            {texts.common.save}
          </Button>
        </>
      }
    >
      <div className="form">
        <Field label={texts.exerciseEditor.name} htmlFor="ex-name" error={error ?? undefined}>
          <input
            id="ex-name"
            className={`input${error ? ' input--invalid' : ''}`}
            value={name}
            placeholder={texts.exerciseEditor.namePlaceholder}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <div className="row">
          <Field label={texts.exerciseEditor.emoji} htmlFor="ex-emoji" hint={texts.exerciseEditor.emojiHint}>
            <input id="ex-emoji" className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </Field>
          <Field label={texts.exerciseEditor.category} htmlFor="ex-category">
            <select id="ex-category" className="input input--select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={texts.exerciseEditor.mode}>
          <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} label={texts.exerciseEditor.mode} />
        </Field>
        <Toggle checked={bodyweight} onChange={setBodyweight} label={texts.exerciseEditor.bodyweight} />
        {exercise ? <p className="field__hint">{texts.exercises.deleteCustomHint}</p> : null}
      </div>
    </Sheet>
  );
}

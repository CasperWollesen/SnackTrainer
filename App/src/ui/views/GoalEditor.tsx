import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { findExercise, groupByCategory, visibleExercises } from '../../domain/exercises';
import { clampTarget, GOAL_LIMITS } from '../../domain/goals';
import { newId } from '../../domain/ids';
import type { AppData, Goal, GoalMetric, GoalPeriod } from '../../domain/types';
import { texts } from '../../texts';
import { Button, Segmented } from '../components/Button';
import { Field, Stepper } from '../components/FormFields';
import { Sheet } from '../components/Sheet';
import { formatGoalAmount } from '../format';

export interface GoalEditorProps {
  open: boolean;
  /** Existing goal to edit, or null for a new one. */
  goal: Goal | null;
  data: AppData;
  onBack: () => void;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: 'day', label: texts.goals.periods.day },
  { value: 'week', label: texts.goals.periods.week },
];

const METRICS: { value: GoalMetric; label: string }[] = [
  { value: 'reps', label: texts.goals.metrics.reps },
  { value: 'time', label: texts.goals.metrics.time },
  { value: 'sessions', label: texts.goals.metrics.sessions },
];

/** The scope select's value: "all", "bodyweight", "cat:<category>" or "ex:<exercise id>". */
type Scope = string;

function scopeOf(goal: Goal | null): Scope {
  if (goal?.exerciseId !== undefined) return `ex:${goal.exerciseId}`;
  if (goal?.category !== undefined) return `cat:${goal.category}`;
  if (goal?.bodyweight) return 'bodyweight';
  return 'all';
}

export function GoalEditor({ open, goal, data, onBack, onClose, onSave, onDelete }: GoalEditorProps) {
  const [period, setPeriod] = useState<GoalPeriod>('day');
  const [metric, setMetric] = useState<GoalMetric>('reps');
  const [target, setTarget] = useState(GOAL_LIMITS.day.reps.initial);
  const [scope, setScope] = useState<Scope>('all');

  useEffect(() => {
    if (!open) return;
    setPeriod(goal?.period ?? 'day');
    setMetric(goal?.metric ?? 'reps');
    setTarget(goal?.target ?? GOAL_LIMITS.day.reps.initial);
    setScope(scopeOf(goal));
  }, [open, goal]);

  /** The goal's own target when it matches, else the default for that period and metric. */
  const targetFor = (p: GoalPeriod, m: GoalMetric) => (goal?.period === p && goal.metric === m ? goal.target : GOAL_LIMITS[p][m].initial);

  const changePeriod = (next: GoalPeriod) => {
    if (next === period) return;
    setPeriod(next);
    setTarget(targetFor(next, metric));
  };

  // Visible exercises by category, plus the goal's own exercise if it has been hidden since.
  const groups = useMemo(() => {
    const list = visibleExercises(data);
    const own = goal?.exerciseId !== undefined ? findExercise(data, goal.exerciseId) : undefined;
    return groupByCategory(own && !list.some((e) => e.id === own.id) ? [...list, own] : list);
  }, [data, goal]);

  const changeMetric = (next: GoalMetric) => {
    if (next === metric) return;
    setMetric(next);
    setTarget(targetFor(period, next));
  };

  const changeScope = (next: Scope) => {
    setScope(next);
    // A timed exercise (plank, a stretch) is counted in time, not reps.
    const exercise = next.startsWith('ex:') ? findExercise(data, next.slice(3)) : undefined;
    if (exercise && metric !== 'sessions') changeMetric(exercise.mode === 'time' ? 'time' : 'reps');
  };

  const save = () => {
    const next: Goal = { id: goal?.id ?? newId(), metric, period, target: clampTarget(period, metric, target) };
    if (scope.startsWith('ex:')) next.exerciseId = scope.slice(3);
    else if (scope.startsWith('cat:')) next.category = scope.slice(4);
    else if (scope === 'bodyweight') next.bodyweight = true;
    onSave(next);
  };

  const limits = GOAL_LIMITS[period][metric];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onBack={onBack}
      title={goal ? texts.goals.editTitle : texts.goals.newTitle}
      footer={
        <>
          {goal ? (
            <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => onDelete(goal)}>
              {texts.common.delete}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onBack}>
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
        <Field label={texts.goals.period}>
          <Segmented value={period} options={PERIODS} onChange={changePeriod} label={texts.goals.period} />
        </Field>
        <Field label={texts.goals.metric} hint={texts.goals.metricHints[metric]}>
          <Segmented value={metric} options={METRICS} onChange={changeMetric} label={texts.goals.metric} />
        </Field>
        <Field label={texts.goals.scope} htmlFor="goal-scope">
          <select id="goal-scope" className="input input--select" value={scope} onChange={(e) => changeScope(e.target.value)}>
            <option value="all">{texts.goals.allExercises}</option>
            <option value="bodyweight">{texts.goals.bodyweight}</option>
            <optgroup label={texts.goals.categories}>
              {groups.map((g) => (
                <option key={g.category} value={`cat:${g.category}`}>
                  {texts.goals.categoryOption(g.category)}
                </option>
              ))}
            </optgroup>
            {groups.map((g) => (
              <optgroup key={g.category} label={g.category}>
                {g.exercises.map((e) => (
                  <option key={e.id} value={`ex:${e.id}`}>
                    {`${e.emoji ? `${e.emoji} ` : ''}${e.name}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label={texts.goals.target[period]}>
          <Stepper
            label={texts.goals.target[period]}
            value={clampTarget(period, metric, target)}
            min={limits.min}
            max={limits.max}
            step={limits.step}
            format={(v) => formatGoalAmount(metric, v)}
            onChange={setTarget}
          />
        </Field>
      </div>
    </Sheet>
  );
}

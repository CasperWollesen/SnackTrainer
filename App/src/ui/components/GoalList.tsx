import { Check, ChevronRight } from 'lucide-react';
import { allExercises, findExercise } from '../../domain/exercises';
import type { GoalProgress } from '../../domain/goals';
import type { AppData, DailyGoal } from '../../domain/types';
import { texts } from '../../texts';
import { formatGoalProgress } from '../format';

export interface GoalListProps {
  progress: GoalProgress[];
  data: AppData;
  /** Days in a row per goal id; shown from 2 days. */
  streaks?: ReadonlyMap<string, number>;
  onSelect: (goal: DailyGoal) => void;
}

/** What a goal counts, as a name and an emoji: "All exercises", "Stretching", "Push-Up". */
export function goalScope(goal: DailyGoal, data: AppData): { name: string; emoji: string } {
  if (goal.exerciseId !== undefined) {
    const exercise = findExercise(data, goal.exerciseId);
    return { name: exercise?.name ?? goal.exerciseId, emoji: exercise?.emoji || '🏃' };
  }
  if (goal.category !== undefined) {
    const first = allExercises(data).find((e) => e.category === goal.category && e.emoji);
    return { name: goal.category, emoji: first?.emoji ?? '🏃' };
  }
  return { name: texts.goals.allExercises, emoji: '🎯' };
}

/** One row per goal: scope, "35 / 50 reps", a progress bar, a check when met, the streak. */
export function GoalList({ progress, data, streaks, onSelect }: GoalListProps) {
  return (
    <div className="list">
      {progress.map(({ goal, value, fraction, done }) => {
        const scope = goalScope(goal, data);
        const streak = streaks?.get(goal.id) ?? 0;
        return (
          <button key={goal.id} type="button" className={`goal${done ? ' goal--done' : ''}`} onClick={() => onSelect(goal)}>
            <span className="entry__emoji" aria-hidden="true">
              {scope.emoji}
            </span>
            <span className="goal__body">
              <span className="goal__head">
                <span className="goal__name">{scope.name}</span>
                {streak >= 2 ? <span className="goal__streak">{texts.goals.streak(streak)}</span> : null}
              </span>
              <span className="goal__amount">
                {done ? <Check size={14} aria-label={texts.goals.done} /> : null}
                {formatGoalProgress(goal.metric, value, goal.target)}
              </span>
              <span className="goal__bar" aria-hidden="true">
                <span style={{ width: `${Math.round(fraction * 100)}%` }} />
              </span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

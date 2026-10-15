import { Check, ChevronRight } from 'lucide-react';
import { allExercises, findExercise } from '../../domain/exercises';
import type { GoalProgress } from '../../domain/goals';
import type { AppData, Goal } from '../../domain/types';
import { texts } from '../../texts';
import { formatGoalProgress } from '../format';

export interface GoalListProps {
  progress: GoalProgress[];
  data: AppData;
  /** Days (or weeks, for week goals) in a row per goal id; shown from 2. */
  streaks?: ReadonlyMap<string, number>;
  onSelect: (goal: Goal) => void;
}

/** What a goal counts, as a name and an emoji: "All exercises", "Stretching", "Push-Up". */
export function goalScope(goal: Goal, data: AppData): { name: string; emoji: string } {
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
      {progress.map(({ goal, value, fraction, done, pace }) => {
        const scope = goalScope(goal, data);
        const streak = streaks?.get(goal.id) ?? 0;
        return (
          <button key={goal.id} type="button" className={`goal${done ? ' goal--done' : ''}`} onClick={() => onSelect(goal)}>
            <span className="entry__emoji" aria-hidden="true">
              {scope.emoji}
            </span>
            <span className="goal__body">
              <span className="goal__head">
                <span className="goal__name">
                  {scope.name}
                  {goal.period === 'week' ? <span className="tag tag--time goal__period">{texts.goals.weekTag}</span> : null}
                </span>
                {streak >= 2 ? <span className="goal__streak">{texts.goals.streak(streak, goal.period)}</span> : null}
              </span>
              <span className="goal__amount">
                {done ? <Check size={14} aria-label={texts.goals.done} /> : null}
                {formatGoalProgress(goal.metric, value, goal.target, goal.period)}
              </span>
              <span className="goal__bar" aria-hidden="true">
                <span style={{ width: `${Math.round(fraction * 100)}%` }} />
                {pace !== undefined && !done && pace < 1 ? <i className="goal__pace" style={{ left: `${Math.round(pace * 100)}%` }} /> : null}
              </span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

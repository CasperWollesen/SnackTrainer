import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { findExercise, unknownExercise } from '../../domain/exercises';
import type { AppData, ISODate } from '../../domain/types';
import type { WeekSummary } from '../../domain/weekSummary';
import { texts } from '../../texts';
import { formatDuration, weekdayName } from '../format';

export interface WeekSummaryCardProps {
  summary: WeekSummary;
  data: AppData;
  onOpenDay: (date: ISODate) => void;
  onOpenExercise: (exerciseId: string) => void;
}

function amount(reps: number, seconds: number): string {
  return reps > 0 ? `${reps} ${texts.common.reps}` : formatDuration(seconds);
}

function Item({ emoji, children, onClick }: { emoji: string; children: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="week-summary__emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="week-summary__text">{children}</span>
      {onClick ? <ChevronRight size={16} aria-hidden="true" /> : null}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" className="week-summary__item" onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className="week-summary__item">{body}</div>
      )}
    </li>
  );
}

/** The week told as highlights: totals, best day, top exercise, new bests, first times, goals. */
export function WeekSummaryCard({ summary: s, data, onOpenDay, onOpenExercise }: WeekSummaryCardProps) {
  const name = (id: string) => (findExercise(data, id) ?? unknownExercise(id)).name;
  const t = texts.history.summary;
  const totals = [
    s.totals.reps > 0 ? `${s.totals.reps} ${texts.common.reps}` : '',
    s.totals.seconds > 0 ? formatDuration(s.totals.seconds) : '',
    s.totals.sessions > 0 ? texts.goals.snacks(s.totals.sessions) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="card week-summary">
      {s.totals.entries === 0 ? (
        <p className="settings-group__text">{t.nothing}</p>
      ) : (
        <ul className="week-summary__list">
          <Item emoji="📊">{t.headline(totals, s.activeDays, s.days)}</Item>
          {s.bestDay ? (
            <Item emoji="🏆" onClick={() => onOpenDay(s.bestDay!.date)}>
              {t.bestDay(weekdayName(s.bestDay.date), amount(s.bestDay.reps, s.bestDay.seconds))}
            </Item>
          ) : null}
          {s.topExercise ? (
            <Item emoji="💪" onClick={() => onOpenExercise(s.topExercise!.exerciseId)}>
              {t.topExercise(name(s.topExercise.exerciseId), amount(s.topExercise.reps, s.topExercise.seconds), s.topExercise.entries)}
            </Item>
          ) : null}
          {s.personalBests.map((pb) => (
            <Item key={pb.exerciseId} emoji="⭐" onClick={() => onOpenExercise(pb.exerciseId)}>
              {pb.unit === 'reps'
                ? t.personalBest(name(pb.exerciseId), String(pb.value), String(pb.previous))
                : t.personalBest(name(pb.exerciseId), formatDuration(pb.value), formatDuration(pb.previous))}
            </Item>
          ))}
          {s.firstTimes.length > 0 ? <Item emoji="🆕">{t.firstTime(s.firstTimes.map(name).join(', '))}</Item> : null}
          {s.dailyGoals ? <Item emoji="🎯">{t.dailyGoals(s.dailyGoals.met, s.dailyGoals.days)}</Item> : null}
          {s.weekGoals ? <Item emoji="🎯">{t.weekGoals(s.weekGoals.met, s.weekGoals.total)}</Item> : null}
        </ul>
      )}
    </div>
  );
}

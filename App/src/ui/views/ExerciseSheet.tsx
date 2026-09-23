import { ChevronRight, Eye, EyeOff, Pencil, Plus, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addDays, startOfWeek, timeOf } from '../../domain/dates';
import { isBuiltIn, isHidden } from '../../domain/exercises';
import { dailyTotals, exerciseTotals, personalBests, sessionsWithExercise, totalsOf, weeklyTotals } from '../../domain/sessions';
import type { AppData, Exercise, ISODate } from '../../domain/types';
import { texts } from '../../texts';
import { BarChart, dayBars, weekBars } from '../components/BarChart';
import { Button, Segmented } from '../components/Button';
import { Section } from '../components/Section';
import { Sheet } from '../components/Sheet';
import { StatTiles } from '../components/StatTiles';
import { formatDuration, formatRelativeDay, formatTotalTime } from '../format';

export interface ExerciseSheetProps {
  /** The exercise to show, or null when closed. */
  exercise: Exercise | null;
  data: AppData;
  today: ISODate;
  onClose: () => void;
  onLog: (exercise: Exercise) => void;
  /** Custom exercises only. */
  onEdit: (exercise: Exercise) => void;
  onSetHidden: (exercise: Exercise, hidden: boolean) => void;
  onOpenDay: (date: ISODate) => void;
}

type ChartRange = 'days' | 'weeks';

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: 'days', label: texts.exercise.chartDays },
  { value: 'weeks', label: texts.exercise.chartWeeks },
];

/** Sessions shown before "Show all". */
const SESSION_PREVIEW = 20;

/**
 * One exercise's history: totals, personal bests per session, a day/week chart and
 * every session it was logged in. Also where an exercise is hidden or shown again.
 */
export function ExerciseSheet({ exercise, data, today, onClose, onLog, onEdit, onSetHidden, onOpenDay }: ExerciseSheetProps) {
  const [range, setRange] = useState<ChartRange>('days');
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const exerciseId = exercise?.id ?? null;
  useEffect(() => {
    setSelected(null);
    setShowAll(false);
  }, [exerciseId]);

  const sessions = useMemo(() => (exerciseId ? sessionsWithExercise(data.sessions, exerciseId) : []), [data.sessions, exerciseId]);
  const totals = useMemo(() => totalsOf(sessions), [sessions]);
  const bests = useMemo(() => personalBests(sessions), [sessions]);
  const perEntry = useMemo(() => exerciseTotals(sessions)[0] ?? null, [sessions]);

  if (!exercise) {
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );
  }

  // Show the exercise's own mode unless it was only ever logged the other way.
  const metric: 'reps' | 'time' =
    exercise.mode === 'reps' ? (totals.reps > 0 || totals.seconds === 0 ? 'reps' : 'time') : totals.seconds > 0 || totals.reps === 0 ? 'time' : 'reps';
  const valueOf = (t: { reps: number; seconds: number }) => (metric === 'reps' ? t.reps : Math.round(t.seconds / 60));
  const formatValue = (v: number) => (metric === 'reps' ? String(v) : `${v} ${texts.common.minutes}`);

  const narrowed = { sessions };
  const bars =
    range === 'days'
      ? dayBars(dailyTotals(narrowed, addDays(today, -27), today).map((d) => ({ date: d.date, value: valueOf(d) })), today)
      : weekBars(weeklyTotals(narrowed, addDays(startOfWeek(today), -7 * 25), today).map((w) => ({ weekStart: w.weekStart, value: valueOf(w) })), today);

  const best = metric === 'reps' ? bests.sessionReps : bests.sessionSeconds;
  const bestSet = metric === 'reps' ? (perEntry?.bestReps ?? 0) : (perEntry?.bestSeconds ?? 0);
  const fmt = (value: number) => (metric === 'reps' ? String(value) : formatDuration(value));
  const hidden = isHidden(data, exercise.id);
  const recent = [...sessions].reverse();
  const visible = showAll ? recent : recent.slice(0, SESSION_PREVIEW);

  return (
    <Sheet
      open
      tall
      onClose={onClose}
      title={`${exercise.emoji || '🏃'} ${exercise.name}`}
      footer={
        <>
          <Button variant="ghost" icon={hidden ? <Eye size={18} /> : <EyeOff size={18} />} onClick={() => onSetHidden(exercise, !hidden)}>
            {hidden ? texts.exercise.show : texts.exercise.hide}
          </Button>
          {!isBuiltIn(exercise.id) ? (
            <Button icon={<Pencil size={18} />} onClick={() => onEdit(exercise)}>
              {texts.exercise.edit}
            </Button>
          ) : null}
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => onLog(exercise)}>
            {texts.exercise.log}
          </Button>
        </>
      }
    >
      <div className="form">
        <p className="exercise-page__meta">
          {exercise.category} · {exercise.mode === 'time' ? texts.log.modeTime : texts.log.modeReps}
          {hidden ? <span className="tag">{texts.exercises.hidden}</span> : null}
        </p>
        {hidden ? <p className="field__hint">{texts.exercise.hiddenNote}</p> : null}

        {sessions.length === 0 ? (
          <p className="field__hint">{texts.exercise.notLogged}</p>
        ) : (
          <>
            <StatTiles
              stats={[
                {
                  label: texts.exercise.total,
                  value: metric === 'reps' ? `${totals.reps}` : formatTotalTime(totals.seconds),
                  tone: metric === 'reps' ? 'accent' : 'time',
                },
                { label: texts.exercise.sessions, value: String(totals.sessions) },
                { label: texts.exercise.bestSession, value: best ? fmt(best.value) : '–' },
                { label: texts.exercise.bestSet, value: bestSet > 0 ? fmt(bestSet) : '–' },
              ]}
            />

            <div className="toolbar">
              <Segmented value={range} options={RANGE_OPTIONS} onChange={(r) => (setRange(r), setSelected(null))} label={texts.exercise.chartRange} />
            </div>
            <div className="card">
              <BarChart
                bars={bars}
                selected={selected}
                onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
                tone={metric}
                format={formatValue}
                label={
                  range === 'days'
                    ? metric === 'reps'
                      ? texts.history.chartLabel
                      : texts.history.chartLabelTime
                    : metric === 'reps'
                      ? texts.history.chartLabelWeek
                      : texts.history.chartLabelWeekTime
                }
              />
            </div>

            <Section title={texts.exercise.sessions} count={sessions.length}>
              <div className="list">
                {visible.map((s) => {
                  const t = totalsOf([s]);
                  const isBest = best?.sessionId === s.id;
                  const parts = s.entries.map((e) => (e.reps !== undefined ? String(e.reps) : formatDuration(e.seconds ?? 0)));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="dayrow"
                      onClick={() => onOpenDay(s.date)}
                      aria-label={`${texts.exercise.openDay}: ${formatRelativeDay(s.date, today)} ${timeOf(s.startedAt)}`}
                    >
                      <span className="dayrow__label">
                        <span className="dayrow__name">
                          {formatRelativeDay(s.date, today)}
                          <span className="dayrow__sub"> · {timeOf(s.startedAt)}</span>
                          {isBest ? (
                            <span className="tag tag--accent exercise-page__best">
                              <Trophy size={12} aria-hidden="true" />
                              {texts.exercise.best}
                            </span>
                          ) : null}
                        </span>
                        <span className="dayrow__meta">{parts.length > 1 ? parts.join(' + ') : texts.history.entries(1)}</span>
                      </span>
                      <span className="dayrow__value">
                        {t.reps > 0 ? (
                          <>
                            {t.reps}
                            <small>{texts.common.reps}</small>
                          </>
                        ) : null}
                        {t.reps > 0 && t.seconds > 0 ? ' · ' : null}
                        {t.seconds > 0 ? <span className="dayrow__value--time">{formatDuration(t.seconds)}</span> : null}
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              {!showAll && recent.length > SESSION_PREVIEW ? (
                <Button variant="ghost" block onClick={() => setShowAll(true)}>
                  {texts.exercise.showMore(recent.length)}
                </Button>
              ) : null}
            </Section>
          </>
        )}
      </div>
    </Sheet>
  );
}

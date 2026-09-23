import { BarChart3, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { addDays, isoWeekNumber, startOfWeek } from '../../domain/dates';
import { findExercise, unknownExercise } from '../../domain/exercises';
import { dailyTotals, exerciseTotals, sessionsBetween, totalsOf, weeklyTotals } from '../../domain/sessions';
import type { AppData, ISODate } from '../../domain/types';
import { texts } from '../../texts';
import { BarChart, dayBars, weekBars } from '../components/BarChart';
import { Segmented } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Section } from '../components/Section';
import { StatTiles } from '../components/StatTiles';
import { formatDuration, formatRelativeDay, formatTotalTime, formatWeekRange } from '../format';

export interface HistoryViewProps {
  data: AppData;
  today: ISODate;
  onOpenDay: (date: ISODate) => void;
  onOpenExercise: (exerciseId: string) => void;
}

type Group = 'days' | 'weeks';
/** Number of days (day grouping) or weeks (week grouping). */
type Range = '14' | '28' | '56' | '8' | '16' | '26';
type Metric = 'reps' | 'time';

const RANGE_OPTIONS: Record<Group, { value: Range; label: string }[]> = {
  days: [
    { value: '14', label: texts.history.range.twoWeeks },
    { value: '28', label: texts.history.range.fourWeeks },
    { value: '56', label: texts.history.range.eightWeeks },
  ],
  weeks: [
    { value: '8', label: texts.history.range.eightWeeks },
    { value: '16', label: texts.history.range.sixteenWeeks },
    { value: '26', label: texts.history.range.halfYear },
  ],
};

const GROUP_OPTIONS: { value: Group; label: string }[] = [
  { value: 'days', label: texts.history.group.days },
  { value: 'weeks', label: texts.history.group.weeks },
];

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'reps', label: texts.history.metric.reps },
  { value: 'time', label: texts.history.metric.time },
];

/** First day of the range: `n` days back, or the Monday `n` weeks back (whole ISO weeks). */
function rangeStart(group: Group, range: Range, today: ISODate): ISODate {
  const n = Number(range);
  return group === 'days' ? addDays(today, -(n - 1)) : addDays(startOfWeek(today), -7 * (n - 1));
}

export function HistoryView({ data, today, onOpenDay, onOpenExercise }: HistoryViewProps) {
  const [group, setGroup] = useState<Group>('days');
  const [range, setRange] = useState<Range>('14');
  const [metric, setMetric] = useState<Metric>('reps');
  const [selected, setSelected] = useState<string | null>(null);

  const from = rangeStart(group, range, today);
  const days = useMemo(() => dailyTotals(data, from, today), [data, from, today]);
  const weeks = useMemo(() => (group === 'weeks' ? weeklyTotals(data, from, today) : []), [data, group, from, today]);
  const sessions = useMemo(() => sessionsBetween(data, from, today), [data, from, today]);
  const totals = useMemo(() => totalsOf(sessions), [sessions]);
  const perExercise = useMemo(() => exerciseTotals(sessions), [sessions]);
  const activeDays = days.filter((d) => d.entries > 0);
  const activeWeeks = weeks.filter((w) => w.entries > 0);

  const valueOf = (t: { reps: number; seconds: number }) => (metric === 'reps' ? t.reps : Math.round(t.seconds / 60));
  const bars =
    group === 'days'
      ? dayBars(days.map((d) => ({ date: d.date, value: valueOf(d) })), today)
      : weekBars(weeks.map((w) => ({ weekStart: w.weekStart, value: valueOf(w) })), today);
  const chartLabel =
    group === 'days'
      ? metric === 'reps'
        ? texts.history.chartLabel
        : texts.history.chartLabelTime
      : metric === 'reps'
        ? texts.history.chartLabelWeek
        : texts.history.chartLabelWeekTime;
  const hasAny = data.sessions.length > 0;

  const changeGroup = (next: Group) => {
    setGroup(next);
    setRange(RANGE_OPTIONS[next][0]!.value);
    setSelected(null);
  };

  return (
    <div className="view">
      <header className="view__header">
        <div className="view__heading">
          <h1 className="view__title">{texts.history.title}</h1>
        </div>
      </header>

      {!hasAny ? (
        <EmptyState icon={<BarChart3 size={26} />} title={texts.history.emptyTitle} text={texts.history.emptyText} />
      ) : (
        <>
          <div className="toolbar">
            <Segmented value={group} options={GROUP_OPTIONS} onChange={changeGroup} label={texts.history.group.label} />
            <Segmented value={range} options={RANGE_OPTIONS[group]} onChange={setRange} label={texts.history.rangeLabel} />
            <Segmented value={metric} options={METRIC_OPTIONS} onChange={setMetric} label={texts.history.metric.label} />
          </div>

          <div className="card">
            <BarChart
              bars={bars}
              selected={selected}
              onSelect={(d) => setSelected((cur) => (cur === d ? null : d))}
              tone={metric}
              format={(v) => (metric === 'reps' ? String(v) : `${v} ${texts.common.minutes}`)}
              label={chartLabel}
            />
          </div>

          <StatTiles
            stats={[
              { label: texts.history.stats.reps, value: String(totals.reps), tone: 'accent' },
              { label: texts.history.stats.time, value: totals.seconds > 0 ? formatTotalTime(totals.seconds) : '–', tone: 'time' },
              { label: texts.history.stats.sessions, value: String(totals.sessions) },
              { label: texts.history.stats.activeDays, value: `${activeDays.length}/${days.length}` },
            ]}
          />

          {group === 'weeks' ? (
            <Section title={texts.history.weeks} count={activeWeeks.length}>
              <div className="list">
                {[...activeWeeks].reverse().map((w) => (
                  <div key={w.weekStart} className={`dayrow dayrow--static${w.weekStart === selected ? ' dayrow--selected' : ''}`}>
                    <span className="dayrow__label">
                      <span className="dayrow__name">
                        {w.weekStart === startOfWeek(today) ? texts.history.thisWeek : texts.history.week(isoWeekNumber(w.weekStart))}
                        <span className="dayrow__sub"> · {formatWeekRange(w.weekStart)}</span>
                      </span>
                      <span className="dayrow__meta">
                        {texts.history.activeDays(w.activeDays)} · {texts.today.session(w.sessions)} · {texts.history.entries(w.entries)}
                      </span>
                    </span>
                    <span className="dayrow__value">
                      {w.reps > 0 ? (
                        <>
                          {w.reps}
                          <small>{texts.common.reps}</small>
                        </>
                      ) : null}
                      {w.reps > 0 && w.seconds > 0 ? ' · ' : null}
                      {w.seconds > 0 ? <span className="dayrow__value--time">{formatDuration(w.seconds)}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          ) : (
          <Section title={texts.history.days} count={activeDays.length}>
            <div className="list">
              {[...activeDays].reverse().map((d) => (
                <button
                  key={d.date}
                  type="button"
                  className={`dayrow${d.date === selected ? ' dayrow--selected' : ''}`}
                  onClick={() => onOpenDay(d.date)}
                  aria-label={`${texts.history.openDay}: ${formatRelativeDay(d.date, today)}`}
                >
                  <span className="dayrow__label">
                    <span className="dayrow__name">{formatRelativeDay(d.date, today)}</span>
                    <span className="dayrow__meta">
                      {texts.today.session(d.sessions)} · {texts.history.entries(d.entries)}
                    </span>
                  </span>
                  <span className="dayrow__value">
                    {d.reps > 0 ? (
                      <>
                        {d.reps}
                        <small>{texts.common.reps}</small>
                      </>
                    ) : null}
                    {d.reps > 0 && d.seconds > 0 ? ' · ' : null}
                    {d.seconds > 0 ? <span className="dayrow__value--time">{formatDuration(d.seconds)}</span> : null}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </Section>
          )}

          {perExercise.length > 0 ? (
            <Section title={texts.history.byExercise} count={perExercise.length}>
              <div className="card" style={{ padding: 'var(--space-1) var(--space-2)' }}>
                {perExercise.map((row) => {
                  const ex = findExercise(data, row.exerciseId) ?? unknownExercise(row.exerciseId);
                  return (
                    <button key={row.exerciseId} type="button" className="entry" onClick={() => onOpenExercise(row.exerciseId)}>
                      <span className="entry__emoji" aria-hidden="true">
                        {ex.emoji || '🏃'}
                      </span>
                      <span className="entry__body">
                        <span className="entry__name">{ex.name}</span>
                        <span className="entry__meta">
                          {texts.history.entries(row.entries)}
                          {row.bestReps > 0 ? ` · ${texts.history.best} ${row.bestReps}` : ''}
                          {row.bestSeconds > 0 ? ` · ${texts.history.best} ${formatDuration(row.bestSeconds)}` : ''}
                        </span>
                      </span>
                      <span className={`entry__amount${row.reps === 0 && row.seconds > 0 ? ' entry__amount--time' : ''}`}>
                        {row.reps > 0 ? row.reps : formatDuration(row.seconds)}
                        {row.reps > 0 ? <small>{texts.common.reps}</small> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

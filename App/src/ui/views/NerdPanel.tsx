import { useMemo } from 'react';
import { timeOf } from '../../domain/dates';
import { findExercise, unknownExercise } from '../../domain/exercises';
import type { DateRange } from '../../domain/periods';
import { hourlyTotals, nerdStats, streaks, summarize, weekdayTotals, type Metric, type StatRecord } from '../../domain/stats';
import type { AppData, ISODate, Session } from '../../domain/types';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, texts } from '../../texts';
import { BarChart, type ChartBar } from '../components/BarChart';
import { Section } from '../components/Section';
import { chartValue, formatChartValue, formatDateWithYear, formatDayShort, formatDuration, formatTotalTime } from '../format';

export interface NerdPanelProps {
  data: AppData;
  /** All sessions after the exercise filter (for all-time numbers). */
  filtered: Pick<AppData, 'sessions'>;
  /** Sessions in the shown period (after the filter). */
  sessions: Session[];
  range: DateRange;
  today: ISODate;
  metric: Metric;
  multiDay: boolean;
  filterName: string | null;
}

const one = (n: number) => n.toFixed(1);
/** Joins the non-empty parts with a middle dot, or a dash when nothing is left. */
const parts = (...xs: (string | false)[]) => xs.filter(Boolean).join(' · ') || texts.nerd.none;

/** The detailed numbers behind History's "Nerd view" toggle. */
export function NerdPanel({ data, filtered, sessions, range, today, metric, multiDay, filterName }: NerdPanelProps) {
  const n = useMemo(() => nerdStats(sessions), [sessions]);
  const streak = useMemo(() => streaks(filtered.sessions, today), [filtered, today]);
  const firstDate = filtered.sessions[0]?.date ?? null;
  const allTime = useMemo(() => (firstDate ? summarize(filtered, { from: firstDate, to: today }) : null), [filtered, firstDate, today]);
  const t = texts.nerd;

  const exerciseName = (id: string | null) => (id ? (findExercise(data, id) ?? unknownExercise(id)).name : '');
  const when = (r: StatRecord) => (r.at ? `${formatDayShort(r.date)} ${timeOf(r.at)}` : formatDayShort(r.date));
  const hour = (h: number) => `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`;

  const periodRows: [string, string][] = [
    [
      t.perActiveDay,
      parts(
        n.perActiveDay.reps > 0 && t.reps(one(n.perActiveDay.reps)),
        n.perActiveDay.seconds > 0 && formatDuration(n.perActiveDay.seconds),
        n.activeDays > 0 && t.sessions(one(n.perActiveDay.sessions)),
      ),
    ],
    [t.perSession, parts(n.perSession.reps > 0 && t.reps(one(n.perSession.reps)), n.activeDays > 0 && t.entries(one(n.perSession.entries)))],
    [t.perSet, parts(n.perSet.reps > 0 && t.reps(one(n.perSet.reps)), n.perSet.seconds > 0 && formatDuration(n.perSet.seconds))],
    [t.biggestSession, n.biggestSession ? `${t.reps(String(n.biggestSession.value))} · ${when(n.biggestSession)}` : t.none],
    ...(multiDay ? ([[t.biggestDay, n.biggestDay ? `${t.reps(String(n.biggestDay.value))} · ${when(n.biggestDay)}` : t.none]] as [string, string][]) : []),
    [t.bestSet, n.bestSet ? `${n.bestSet.value} × ${exerciseName(n.bestSet.exerciseId)} · ${when(n.bestSet)}` : t.none],
    [t.longestHold, n.longestHold ? `${formatDuration(n.longestHold.value)} ${exerciseName(n.longestHold.exerciseId)} · ${when(n.longestHold)}` : t.none],
    [t.earliest, n.earliest ? timeOf(n.earliest) : t.none],
    [t.latest, n.latest ? timeOf(n.latest) : t.none],
    [t.busiestHour, n.busiestHour !== null ? hour(n.busiestHour) : t.none],
    ...(multiDay ? ([[t.busiestWeekday, n.busiestWeekday !== null ? (WEEKDAY_NAMES[n.busiestWeekday - 1] ?? '') : t.none]] as [string, string][]) : []),
    ...(filterName ? [] : ([[t.exercisesUsed, String(n.exercises)]] as [string, string][])),
    [
      t.timedSessions,
      n.timed.count > 0 ? t.timedValue(n.timed.count, formatDuration(n.timed.averageSeconds), formatTotalTime(n.timed.totalSeconds)) : t.none,
    ],
    [t.longestSession, n.timed.count > 0 ? formatDuration(n.timed.longestSeconds) : t.none],
  ];

  const allTimeRows: [string, string][] = [
    [t.currentStreak, t.days(streak.current)],
    [t.longestStreak, streak.longestEnd ? `${t.days(streak.longest)} · ${formatDayShort(streak.longestEnd)}` : t.none],
    [t.firstSnack, firstDate ? formatDateWithYear(firstDate) : t.none],
    [t.activeDaysAllTime, allTime ? `${allTime.activeDays}/${allTime.days}` : t.none],
    [texts.history.stats.reps, allTime ? String(allTime.reps) : t.none],
    [texts.history.stats.time, allTime ? formatTotalTime(allTime.seconds) : t.none],
    [texts.history.stats.sessions, allTime ? String(allTime.sessions) : t.none],
  ];

  const tone = metric === 'time' ? 'time' : 'reps';
  const hourBars: ChartBar[] = hourlyTotals(sessions).map((h) => ({
    id: `h${h.key}`,
    value: chartValue(h, metric),
    axisLabel: String(h.key),
    name: hour(h.key),
  }));
  const weekdayBars: ChartBar[] = weekdayTotals(sessions).map((d) => ({
    id: `w${d.key}`,
    value: chartValue(d, metric),
    axisLabel: (WEEKDAY_SHORT[d.key - 1] ?? '').slice(0, 2),
    name: WEEKDAY_NAMES[d.key - 1] ?? '',
    muted: d.key >= 6,
  }));

  return (
    <div className="nerd">
      <Section title={`${t.title} · ${t.period}`}>
        {filterName ? <p className="field__hint">{t.filterNote(filterName)}</p> : null}
        <dl className="nerd__list">
          {periodRows.map(([k, v]) => (
            <div key={k} className="nerd__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {multiDay && sessions.length > 0 ? (
        <>
          <Section title={t.timeOfDay}>
            <div className="card">
              <BarChart bars={hourBars} selected={null} onSelect={() => undefined} tone={tone} format={(v) => formatChartValue(v, metric)} label={t.timeOfDayLabel} />
            </div>
          </Section>
          <Section title={t.weekdays}>
            <div className="card">
              <BarChart bars={weekdayBars} selected={null} onSelect={() => undefined} tone={tone} format={(v) => formatChartValue(v, metric)} label={t.weekdaysLabel} />
            </div>
          </Section>
        </>
      ) : null}

      <Section title={t.allTime}>
        <dl className="nerd__list">
          {allTimeRows.map(([k, v]) => (
            <div key={k} className="nerd__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <p className="field__hint">{`${formatDateWithYear(range.from)} – ${formatDateWithYear(range.to)}`}</p>
    </div>
  );
}

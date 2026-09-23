import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { compareISO, isoWeekNumber, parseISODate } from '../../domain/dates';
import { allExercises, findExercise, unknownExercise } from '../../domain/exercises';
import { comparisonFor, containsDate, isLatest, periodAt, recentPeriods, shiftPeriod, type Period, type PeriodKind } from '../../domain/periods';
import { dailyTotals, exerciseTotals, sessionsBetween, sessionsWithExercise } from '../../domain/sessions';
import { deltaOf, hourlyTotals, summarize, type Metric } from '../../domain/stats';
import type { AppData, ISODate } from '../../domain/types';
import { MONTH_SHORT, texts } from '../../texts';
import { BarChart, dayBars, type ChartBar } from '../components/BarChart';
import { Button, IconButton, Segmented } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Toggle } from '../components/FormFields';
import { Section } from '../components/Section';
import { StatTiles } from '../components/StatTiles';
import { chartValue, formatChartValue, formatDateRange, formatDelta, formatDuration, formatPeriod, formatRelativeDay, formatTotalTime } from '../format';
import { NerdPanel } from './NerdPanel';

/** History's view state; kept in App so it survives switching tabs. */
export interface HistoryState {
  kind: PeriodKind;
  /** A day inside the shown period (the last day for rolling windows). */
  anchor: ISODate;
  metric: Metric;
  /** Narrow everything to one exercise, or null for all. */
  exerciseId: string | null;
  nerd: boolean;
}

export function initialHistoryState(today: ISODate): HistoryState {
  return { kind: 'day', anchor: today, metric: 'reps', exerciseId: null, nerd: false };
}

export interface HistoryViewProps {
  data: AppData;
  today: ISODate;
  state: HistoryState;
  onChange: (patch: Partial<HistoryState>) => void;
  onOpenDay: (date: ISODate) => void;
  onOpenExercise: (exerciseId: string) => void;
}

const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = (['day', 'week', 'month', 'last7', 'last31'] as const).map((k) => ({
  value: k,
  label: texts.history.periods[k],
}));

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'reps', label: texts.history.metric.reps },
  { value: 'time', label: texts.history.metric.time },
  { value: 'sessions', label: texts.history.metric.sessions },
];

/** Periods shown in the trend chart. */
const TREND_COUNT: Record<PeriodKind, number> = { day: 14, week: 12, month: 12, last7: 12, last31: 12 };

/** The anchor that keeps a period's position when switching kind: its last elapsed day. */
function anchorFor(p: Period, today: ISODate): ISODate {
  return compareISO(p.to, today) > 0 ? today : p.to;
}

function trendLabel(p: Period): string {
  switch (p.kind) {
    case 'day':
      return String(Number(p.from.slice(8, 10)));
    case 'week':
      return String(isoWeekNumber(p.from));
    case 'month':
      return (MONTH_SHORT[parseISODate(p.from).getMonth()] ?? '').slice(0, 3);
    default:
      return String(Number(p.to.slice(8, 10)));
  }
}

export function HistoryView({ data, today, state, onChange, onOpenDay, onOpenExercise }: HistoryViewProps) {
  const period = periodAt(state.kind, state.anchor);
  const comparison = comparisonFor(period, today);
  const filtered = useMemo(
    () => (state.exerciseId ? { sessions: sessionsWithExercise(data.sessions, state.exerciseId) } : data),
    [data, state.exerciseId],
  );

  const current = summarize(filtered, comparison.current);
  const previous = summarize(filtered, comparison.previous);
  const sessions = sessionsBetween(filtered, comparison.current.from, comparison.current.to);
  const prevSessions = sessionsBetween(filtered, comparison.previous.from, comparison.previous.to);

  const usedExercises = useMemo(() => {
    const used = new Set(data.sessions.flatMap((s) => s.entries.map((e) => e.exerciseId)));
    return allExercises(data)
      .filter((e) => used.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  if (data.sessions.length === 0) {
    return (
      <div className="view">
        <header className="view__header">
          <div className="view__heading">
            <h1 className="view__title">{texts.history.title}</h1>
          </div>
        </header>
        <EmptyState icon={<BarChart3 size={26} />} title={texts.history.emptyTitle} text={texts.history.emptyText} />
      </div>
    );
  }

  const { title, subtitle } = formatPeriod(period, today);
  const latest = isLatest(period, today);
  const showingNow = containsDate(period, today) && (state.kind === 'day' || state.kind === 'week' || state.kind === 'month' || period.to === today);
  const go = (p: Period) => onChange({ anchor: anchorFor(p, today) });
  const metric = state.metric;
  const isDay = state.kind === 'day';

  // --- tiles
  const tile = (cur: number, prev: number) => formatDelta(deltaOf(cur, prev));
  const stats = [
    { label: texts.history.stats.reps, value: String(current.reps), tone: 'accent' as const, delta: tile(current.reps, previous.reps) },
    {
      label: texts.history.stats.time,
      value: current.seconds > 0 ? formatTotalTime(current.seconds) : '–',
      tone: 'time' as const,
      delta: tile(current.seconds, previous.seconds),
    },
    { label: texts.history.stats.sessions, value: String(current.sessions), delta: tile(current.sessions, previous.sessions) },
    isDay
      ? { label: texts.history.stats.entries, value: String(current.entries), delta: tile(current.entries, previous.entries) }
      : {
          label: texts.history.stats.activeDays,
          value: `${current.activeDays}/${current.days}`,
          delta: tile(current.activeDays, previous.activeDays),
        },
  ];
  const comparedRange = formatDateRange(comparison.previous.from, comparison.previous.to, today);

  // --- breakdown chart: hours for a day, days otherwise
  let breakdown: ChartBar[];
  if (isDay) {
    breakdown = hourlyTotals(sessions).map((h) => ({
      id: `h${h.key}`,
      value: chartValue(h, metric),
      axisLabel: String(h.key),
      name: `${String(h.key).padStart(2, '0')}:00–${String(h.key).padStart(2, '0')}:59`,
    }));
  } else {
    const days = dailyTotals(filtered, period.from, period.to);
    breakdown = dayBars(
      days.map((d) => ({ date: d.date, value: chartValue(d, metric) })),
      today,
    );
  }

  // --- trend over recent periods
  const trendPeriods = recentPeriods(period, TREND_COUNT[state.kind]);
  const trendValues = trendPeriods.map((p) => chartValue(summarize(filtered, p), metric));
  const trendBars: ChartBar[] = trendPeriods.map((p, i) => ({
    id: `${p.from}_${p.to}`,
    value: trendValues[i]!,
    axisLabel: trendLabel(p),
    name: formatPeriod(p, today).title + (p.kind === 'day' ? '' : ` (${formatDateRange(p.from, p.to, today)})`),
    current: i === trendPeriods.length - 1,
    muted: compareISO(p.from, today) > 0,
  }));
  const trendAvg = trendValues.reduce((a, b) => a + b, 0) / Math.max(1, trendValues.length);

  // --- lists
  const activeDays = isDay ? [] : dailyTotals(filtered, comparison.current.from, comparison.current.to).filter((d) => d.entries > 0).reverse();
  const perExercise = exerciseTotals(sessions);
  const prevPerExercise = new Map(exerciseTotals(prevSessions).map((r) => [r.exerciseId, r]));
  const filterExercise = state.exerciseId ? (findExercise(data, state.exerciseId) ?? unknownExercise(state.exerciseId)) : null;

  return (
    <div className="view">
      <header className="view__header">
        <div className="view__heading">
          <h1 className="view__title">{texts.history.title}</h1>
        </div>
      </header>

      <Segmented
        value={state.kind}
        options={PERIOD_OPTIONS}
        onChange={(kind) => onChange({ kind, anchor: anchorFor(period, today) })}
        label={texts.history.periodLabel}
      />

      <div className="periodnav">
        <IconButton label={texts.history.previous} icon={<ChevronLeft size={22} />} onClick={() => go(shiftPeriod(period, -1))} />
        <div className="periodnav__label">
          <span className="periodnav__title">{title}</span>
          <span className="periodnav__sub">{subtitle}</span>
        </div>
        {!showingNow ? (
          <Button size="sm" variant="ghost" onClick={() => onChange({ anchor: today })}>
            {texts.history.now}
          </Button>
        ) : null}
        <IconButton label={texts.history.next} icon={<ChevronRight size={22} />} disabled={latest} onClick={() => go(shiftPeriod(period, 1))} />
      </div>

      <div className="toolbar">
        <select
          className="input input--select toolbar__select"
          aria-label={texts.history.filterLabel}
          value={state.exerciseId ?? ''}
          onChange={(e) => onChange({ exerciseId: e.target.value || null })}
        >
          <option value="">{texts.history.allExercises}</option>
          {usedExercises.map((e) => (
            <option key={e.id} value={e.id}>
              {`${e.emoji} ${e.name}`.trim()}
            </option>
          ))}
        </select>
        <Segmented value={metric} options={METRIC_OPTIONS} onChange={(m) => onChange({ metric: m })} label={texts.history.metric.label} />
      </div>

      <StatTiles stats={stats} />
      <p className="field__hint history__compared">
        {comparison.partial ? texts.history.comparedSoFar(comparedRange) : texts.history.compared(comparedRange)}
      </p>

      <Section title={isDay ? texts.history.byHour : texts.history.byDay}>
        <div className="card">
          <BarChart
            bars={breakdown}
            selected={null}
            onSelect={(id) => {
              if (!isDay && compareISO(id, today) <= 0) onChange({ kind: 'day', anchor: id });
            }}
            tone={metric === 'time' ? 'time' : 'reps'}
            format={(v) => formatChartValue(v, metric)}
            label={isDay ? texts.history.byHour : texts.history.byDay}
          />
        </div>
        <p className="field__hint">{isDay ? texts.history.byHourHint : texts.history.byDayHint}</p>
      </Section>

      <Section title={texts.history.trend}>
        <div className="card">
          <BarChart
            bars={trendBars}
            selected={null}
            onSelect={(id) => {
              const p = trendPeriods.find((t) => `${t.from}_${t.to}` === id);
              if (p) go(p);
            }}
            tone={metric === 'time' ? 'time' : 'reps'}
            format={(v) => formatChartValue(v, metric)}
            label={texts.history.trend}
          />
        </div>
        <p className="field__hint">
          {texts.history.trendAverage(formatChartValue(Math.round(trendAvg * 10) / 10, metric))} ·{' '}
          {texts.history.trendHint(TREND_COUNT[state.kind], texts.history.trendUnits[state.kind])}
        </p>
      </Section>

      {isDay ? (
        <div className="settings-group__actions">
          <Button onClick={() => onOpenDay(period.from)} icon={<ChevronRight size={18} />}>
            {texts.history.openInToday}
          </Button>
        </div>
      ) : activeDays.length > 0 ? (
        <Section title={texts.history.days} count={activeDays.length}>
          <div className="list">
            {activeDays.map((d) => (
              <button
                key={d.date}
                type="button"
                className="dayrow"
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
      ) : null}

      {current.entries === 0 ? <p className="field__hint">{texts.history.emptyPeriod}</p> : null}

      {!filterExercise && perExercise.length > 0 ? (
        <Section title={texts.history.byExercise} count={perExercise.length}>
          <div className="card" style={{ padding: 'var(--space-1) var(--space-2)' }}>
            {perExercise.map((row) => {
              const ex = findExercise(data, row.exerciseId) ?? unknownExercise(row.exerciseId);
              const prev = prevPerExercise.get(row.exerciseId);
              const byTime = row.reps === 0 && row.seconds > 0;
              const delta = formatDelta(deltaOf(byTime ? row.seconds : row.reps, byTime ? (prev?.seconds ?? 0) : (prev?.reps ?? 0)));
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
                      {delta ? <span className={`stat__delta stat__delta--${delta.tone}`}> · {delta.text}</span> : null}
                    </span>
                  </span>
                  <span className={`entry__amount${byTime ? ' entry__amount--time' : ''}`}>
                    {byTime ? formatDuration(row.seconds) : row.reps}
                    {!byTime ? <small>{texts.common.reps}</small> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Toggle checked={state.nerd} onChange={(nerd) => onChange({ nerd })} label={texts.history.nerdToggle} hint={texts.history.nerdHint} />
      {state.nerd ? (
        <NerdPanel
          data={data}
          filtered={filtered}
          sessions={sessions}
          range={comparison.current}
          today={today}
          metric={metric}
          multiDay={!isDay}
          filterName={filterExercise?.name ?? null}
        />
      ) : null}
    </div>
  );
}


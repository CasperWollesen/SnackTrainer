import { addDays, isoWeekNumber, weekdayOf } from '../../domain/dates';
import type { ISODate } from '../../domain/types';
import { texts } from '../../texts';
import { formatDayShort, weekdayShort } from '../format';

export interface ChartBar {
  /** Stable key, also what `selected` / `onSelect` refer to (a date or a week start). */
  id: string;
  value: number;
  axisLabel: string;
  /** Screen-reader name of the bar, without the value. */
  name: string;
  /** Today's bar or the current week's bar. */
  current?: boolean;
  /** Drawn a little lighter (weekends in day charts). */
  muted?: boolean;
}

export interface BarChartProps {
  bars: ChartBar[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** Colour scheme: reps (accent) or time (blue). */
  tone: 'reps' | 'time';
  /** Formats a value for the gridline labels and bar tooltips. */
  format: (value: number) => string;
  label: string;
}

/** One bar per day: weekday initials for up to two weeks, day of month beyond that. */
export function dayBars(days: readonly { date: ISODate; value: number }[], today: ISODate): ChartBar[] {
  const short = days.length <= 14;
  return days.map((d) => ({
    id: d.date,
    value: d.value,
    axisLabel: short ? weekdayShort(d.date).slice(0, 2) : String(Number(d.date.slice(8, 10))),
    name: formatDayShort(d.date),
    current: d.date === today,
    muted: weekdayOf(d.date) >= 6,
  }));
}

/** One bar per ISO week, labelled with the week number. */
export function weekBars(weeks: readonly { weekStart: ISODate; value: number }[], today: ISODate): ChartBar[] {
  return weeks.map((w) => ({
    id: w.weekStart,
    value: w.value,
    axisLabel: String(isoWeekNumber(w.weekStart)),
    name: `${texts.history.week(isoWeekNumber(w.weekStart))}, ${formatDayShort(w.weekStart)}`,
    current: w.weekStart <= today && today <= addDays(w.weekStart, 6),
  }));
}

/** Evenly spaced "nice" gridline values from 0 to max (inclusive). */
function gridTicks(max: number): number[] {
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const target = max / 4;
  const step = candidates.find((c) => c >= target) ?? candidates[candidates.length - 1]!;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  return ticks;
}

/** Rounds the axis maximum up to the next "nice" number so the top gridline has a label. */
function niceMax(max: number): number {
  if (max <= 0) return 10;
  const ticks = gridTicks(max);
  const step = ticks.length > 1 ? ticks[1]! - ticks[0]! : max;
  return Math.ceil(max / step) * step;
}

/**
 * Bar chart rendered with plain HTML/CSS, ported from PowerOn's chart.js.
 * The Y axis is fixed to a nice maximum so the range reads at a glance.
 */
export function BarChart({ bars, selected, onSelect, tone, format, label }: BarChartProps) {
  const rawMax = Math.max(0, ...bars.map((d) => d.value));
  const max = niceMax(rawMax);
  const ticks = gridTicks(max);
  const n = bars.length;
  // Show every axis label when there is room; otherwise every other (or every 7th).
  const labelEvery = n <= 14 ? 1 : n <= 28 ? 2 : 7;

  return (
    <div className={`chart${tone === 'time' ? ' chart--time' : ''}`} style={{ ['--n' as string]: n }} role="img" aria-label={label}>
      <div className="chart__grid">
        {ticks.map((t) => (
          <div key={t} className="chart__gridline" style={{ ['--y' as string]: `${(t / max) * 100}%` }}>
            <span>{format(t)}</span>
          </div>
        ))}
      </div>
      <div className="chart__bars">
        {bars.map((d) => {
          const pct = max > 0 ? (Math.min(d.value, max) / max) * 100 : 0;
          const classes = [
            'chart__bar',
            d.value === 0 ? 'chart__bar--empty' : '',
            d.current ? 'chart__bar--today' : '',
            d.id === selected ? 'chart__bar--selected' : '',
            d.muted ? 'chart__bar--weekend' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={d.id}
              type="button"
              className={classes}
              style={{ ['--h' as string]: `${pct}%` }}
              aria-label={`${d.name} · ${format(d.value)}`}
              title={`${d.name} · ${format(d.value)}`}
              aria-pressed={d.id === selected}
              onClick={() => onSelect(d.id)}
            >
              <span className="chart__fill" />
            </button>
          );
        })}
      </div>
      <div className="chart__axis" aria-hidden="true">
        {bars.map((d, i) => (
          <span key={d.id} className={i % labelEvery === 0 ? '' : 'chart__axis-hidden'}>
            {d.axisLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

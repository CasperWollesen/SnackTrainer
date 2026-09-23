import { weekdayOf } from '../../domain/dates';
import type { ISODate } from '../../domain/types';
import { weekdayShort } from '../format';

export interface ChartDay {
  date: ISODate;
  value: number;
}

export interface BarChartProps {
  days: ChartDay[];
  today: ISODate;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
  /** Colour scheme: reps (accent) or time (blue). */
  tone: 'reps' | 'time';
  /** Formats a value for the gridline labels and bar tooltips. */
  format: (value: number) => string;
  label: string;
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
 * Per-day bar chart rendered with plain HTML/CSS, ported from PowerOn's chart.js.
 * The Y axis is fixed to a nice maximum so the range reads at a glance.
 */
export function BarChart({ days, today, selected, onSelect, tone, format, label }: BarChartProps) {
  const rawMax = Math.max(0, ...days.map((d) => d.value));
  const max = niceMax(rawMax);
  const ticks = gridTicks(max);
  const n = days.length;
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
        {days.map((d) => {
          const pct = max > 0 ? (Math.min(d.value, max) / max) * 100 : 0;
          const wd = weekdayOf(d.date);
          const classes = [
            'chart__bar',
            d.value === 0 ? 'chart__bar--empty' : '',
            d.date === today ? 'chart__bar--today' : '',
            d.date === selected ? 'chart__bar--selected' : '',
            wd >= 6 ? 'chart__bar--weekend' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={d.date}
              type="button"
              className={classes}
              style={{ ['--h' as string]: `${pct}%` }}
              aria-label={`${d.date} · ${format(d.value)}`}
              aria-pressed={d.date === selected}
              onClick={() => onSelect(d.date)}
            >
              <span className="chart__fill" />
            </button>
          );
        })}
      </div>
      <div className="chart__axis" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} className={i % labelEvery === 0 ? '' : 'chart__axis-hidden'}>
            {n <= 14 ? weekdayShort(d.date).slice(0, 2) : String(Number(d.date.slice(8, 10)))}
          </span>
        ))}
      </div>
    </div>
  );
}

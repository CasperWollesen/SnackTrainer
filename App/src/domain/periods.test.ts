import { describe, expect, it } from 'vitest';
import { addMonths, endOfMonth } from './dates';
import { comparisonFor, isLatest, periodAt, periodLength, recentPeriods, shiftPeriod } from './periods';

const TODAY = '2026-09-23'; // Wednesday

describe('periods', () => {
  it('adds months with clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2026-12-01')).toBe('2026-12-31');
  });

  it('finds the period containing a day', () => {
    expect(periodAt('day', TODAY)).toEqual({ kind: 'day', from: TODAY, to: TODAY });
    expect(periodAt('week', TODAY)).toEqual({ kind: 'week', from: '2026-09-21', to: '2026-09-27' });
    expect(periodAt('month', TODAY)).toEqual({ kind: 'month', from: '2026-09-01', to: '2026-09-30' });
    expect(periodAt('last7', TODAY)).toEqual({ kind: 'last7', from: '2026-09-17', to: TODAY });
    expect(periodAt('last31', TODAY)).toEqual({ kind: 'last31', from: '2026-08-24', to: TODAY });
    expect(periodLength(periodAt('last31', TODAY))).toBe(31);
  });

  it('steps back and forth', () => {
    expect(shiftPeriod(periodAt('day', TODAY), -1).from).toBe('2026-09-22');
    expect(shiftPeriod(periodAt('week', TODAY), -1)).toMatchObject({ from: '2026-09-14', to: '2026-09-20' });
    expect(shiftPeriod(periodAt('month', '2026-03-31'), -1)).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
    expect(shiftPeriod(periodAt('last7', TODAY), -1)).toMatchObject({ from: '2026-09-10', to: '2026-09-16' });
    expect(shiftPeriod(periodAt('last31', TODAY), -1)).toMatchObject({ from: '2026-07-24', to: '2026-08-23' });
    expect(isLatest(periodAt('week', TODAY), TODAY)).toBe(true);
    expect(isLatest(shiftPeriod(periodAt('week', TODAY), -1), TODAY)).toBe(false);
    expect(isLatest(periodAt('last7', TODAY), TODAY)).toBe(true);
  });

  it('compares finished periods whole and running ones so far', () => {
    expect(comparisonFor(periodAt('last7', TODAY), TODAY)).toEqual({
      current: { from: '2026-09-17', to: TODAY },
      previous: { from: '2026-09-10', to: '2026-09-16' },
      partial: false,
    });
    // Mon–Wed this week vs Mon–Wed last week.
    expect(comparisonFor(periodAt('week', TODAY), TODAY)).toEqual({
      current: { from: '2026-09-21', to: TODAY },
      previous: { from: '2026-09-14', to: '2026-09-16' },
      partial: true,
    });
    // 1–30 March so far vs February, which is shorter.
    const march = comparisonFor(periodAt('month', '2026-03-31'), '2026-03-30');
    expect(march.previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(comparisonFor(periodAt('day', TODAY), TODAY).previous).toEqual({ from: '2026-09-22', to: '2026-09-22' });
  });

  it('lists recent periods oldest first', () => {
    const weeks = recentPeriods(periodAt('week', TODAY), 3);
    expect(weeks.map((w) => w.from)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
  });
});

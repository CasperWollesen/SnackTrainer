import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, eachDay, isISODate, isLocalDateTime, isoWeekNumber, minutesBetween, startOfWeek, weekdayOf } from './dates';

describe('dates', () => {
  it('validates', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isLocalDateTime('2026-09-23T07:30')).toBe(true);
    expect(isLocalDateTime('2026-09-23T24:00')).toBe(false);
    expect(isLocalDateTime('2026-09-23 07:30')).toBe(false);
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST switch day
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('enumerates days and weekdays', () => {
    expect(eachDay('2026-09-21', '2026-09-23')).toEqual(['2026-09-21', '2026-09-22', '2026-09-23']);
    expect(weekdayOf('2026-09-21')).toBe(1); // Monday
    expect(weekdayOf('2026-09-27')).toBe(7); // Sunday
  });

  it('measures minutes between local date-times', () => {
    expect(minutesBetween('2026-09-23T07:30', '2026-09-23T07:50')).toBe(20);
    expect(minutesBetween('2026-09-23T23:50', '2026-09-24T00:10')).toBe(20);
    expect(minutesBetween('2026-09-23T08:00', '2026-09-23T07:00')).toBe(-60);
  });

  it('finds the ISO week start and number', () => {
    expect(startOfWeek('2026-09-23')).toBe('2026-09-21'); // Wednesday -> Monday
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21'); // Sunday belongs to the week before
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
    expect(isoWeekNumber('2026-09-23')).toBe(39);
    expect(isoWeekNumber('2026-01-01')).toBe(1); // Thursday
    expect(isoWeekNumber('2026-12-31')).toBe(53);
    expect(isoWeekNumber('2027-01-03')).toBe(53); // Sunday still in 2026's last week
    expect(isoWeekNumber('2027-01-04')).toBe(1);
    expect(isoWeekNumber('2021-01-03')).toBe(53);
  });
});

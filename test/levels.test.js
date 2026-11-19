// Resolution levels (RC-002, analytics spec §5): the pure rule in
// core/levels.js — which level a window draws — and the tooltip's date by
// bucket (bucketDateText, core/utils.js). The chart that applies them:
// test/timeseries-levels.test.js.
//
// Both zones: 'local' dates are built with the local Date constructor and
// 'UTC' dates with Date.UTC, so each expectation holds in every TZ run (+04,
// UTC, America/Los_Angeles, Asia/Tokyo).

import { describe, it, expect } from 'vitest';
import { chooseLevel, countInWindow, levelCovers, levelName, DEFAULT_MAX_POINTS } from '../assets/charts/src/core/levels.js';
import { bucketDateText } from '../assets/charts/src/core/utils.js';

const HOUR = 36e5;
const local = (y, m, d = 1, h = 0, mi = 0) => new Date(y, m, d, h, mi);
const utc = (y, m, d = 1, h = 0, mi = 0) => new Date(Date.UTC(y, m, d, h, mi));
const rowsAt = dates => dates.map(date => ({ date, value: 1 }));
// `n` rows a step apart from `from`: hours (absolute) or days / months (the calendar's)
const hours = (from, n) => rowsAt(Array.from({ length: n }, (_, i) => new Date(+from + i * HOUR)));
const days = (y, m, d, n, at = local) => rowsAt(Array.from({ length: n }, (_, i) => at(y, m, d + i)));
const months = (y, m, n, at = local) => rowsAt(Array.from({ length: n }, (_, i) => at(y, m + i, 1)));

// ─── The names ───────────────────────────────────────────────────────────────

describe('levelName: a setData key that names a level', () => {
  it('the seven intervals, in any case; anything else is no level', () => {
    expect(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'].map(levelName))
      .toEqual(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']);
    expect(levelName('Hour')).toBe('hour');
    expect(levelName(' MONTH ')).toBe('month');
    expect(levelName('hours')).toBeNull();
    expect(levelName('daily')).toBeNull();
    expect(levelName('')).toBeNull();
  });
});

// ─── Counting ────────────────────────────────────────────────────────────────

describe('countInWindow: the rows a window holds', () => {
  const rows = hours(local(2026, 10, 18), 24);

  it('both ends included; outside the rows, none', () => {
    expect(countInWindow(rows, [local(2026, 10, 18), local(2026, 10, 18, 23)])).toBe(24);
    expect(countInWindow(rows, [local(2026, 10, 18, 2), local(2026, 10, 18, 4)])).toBe(3);
    expect(countInWindow(rows, [local(2026, 10, 18, 2, 30), local(2026, 10, 18, 3, 30)])).toBe(1);
    expect(countInWindow(rows, [local(2026, 10, 18, 2, 10), local(2026, 10, 18, 2, 50)])).toBe(0);
    expect(countInWindow(rows, [local(2026, 10, 19), local(2026, 10, 20)])).toBe(0);
    expect(countInWindow([], [local(2026, 10, 18), local(2026, 10, 19)])).toBe(0);
  });
});

// ─── Coverage ────────────────────────────────────────────────────────────────

describe('levelCovers: the first bucket at most one after the start, the last at most one before the end', () => {
  it('hours: one bucket of slack at each end, not two (local)', () => {
    const rows = hours(local(2026, 10, 18, 6), 4);        // 06:00 … 09:00
    const covers = view => levelCovers(rows, view, 'hour');
    expect(covers([local(2026, 10, 18, 6), local(2026, 10, 18, 9)])).toBe(true);
    // the start: a first bucket one hour into the window covers it, two do not
    expect(covers([local(2026, 10, 18, 5), local(2026, 10, 18, 9)])).toBe(true);
    expect(covers([local(2026, 10, 18, 5, 59), local(2026, 10, 18, 9)])).toBe(true);
    expect(covers([local(2026, 10, 18, 4, 59), local(2026, 10, 18, 9)])).toBe(false);
    // the end, counted in buckets: rows to 09:00 cover a window to 10:59 —
    // its 10:00 bucket may not be out yet — but not one to 11:00
    expect(covers([local(2026, 10, 18, 6), local(2026, 10, 18, 10, 59)])).toBe(true);
    expect(covers([local(2026, 10, 18, 6), local(2026, 10, 18, 11)])).toBe(false);
  });

  it('the spec\'s example: rows to 10:00 cover a window to 11:21, rows to 09:00 do not', () => {
    const view = [local(2026, 10, 18), local(2026, 10, 18, 11, 21)];
    expect(levelCovers(hours(local(2026, 10, 18), 11), view, 'hour')).toBe(true);    // 00:00 … 10:00
    expect(levelCovers(hours(local(2026, 10, 18), 10), view, 'hour')).toBe(false);   // 00:00 … 09:00
  });

  it('months in UTC: the buckets are the zone\'s', () => {
    const rows = months(2026, 0, 6, utc);                 // 1 January … 1 June, UTC
    const covers = view => levelCovers(rows, view, 'month', 'UTC');
    expect(covers([utc(2025, 11, 15), utc(2026, 5, 20)])).toBe(true);    // starts in December: one month of slack
    expect(covers([utc(2025, 10, 30), utc(2026, 5, 20)])).toBe(false);   // starts in November: two
    expect(covers([utc(2026, 0, 1), utc(2026, 6, 31, 23, 59)])).toBe(true);
    expect(covers([utc(2026, 0, 1), utc(2026, 7, 1)])).toBe(false);
    // the same instants read as local months: a zone east of UTC sees
    // 1 January 00:00 UTC in January, one west of it in December
    const eastOrUTC = new Date(Date.UTC(2026, 0, 1)).getMonth() === 0;
    expect(levelCovers(rows, [utc(2025, 10, 30, 12), utc(2026, 5, 20)], 'month', 'local'))
      .toBe(!eastOrUTC);
  });

  it('weeks: the buckets start on weekStart', () => {
    // Mondays from 9 November 2026; the window from Sunday 1 November
    const rows = rowsAt([local(2026, 10, 9), local(2026, 10, 16), local(2026, 10, 23)]);
    const view = [local(2026, 10, 1), local(2026, 10, 25)];
    // Monday weeks: the window starts in the week of 26 October, the rows two weeks later
    expect(levelCovers(rows, view, 'week', 'local', 1)).toBe(false);
    // Sunday weeks: the window's week is that of 1 November, the first row's
    // that of 8 November — one week later
    expect(levelCovers(rows, view, 'week', 'local', 0)).toBe(true);
    expect(levelCovers(rows, view, 'week', 'local', 'sunday')).toBe(true);
  });

  it('days across a DST change are one bucket each (local)', () => {
    // whatever the zone, the calendar days of March 2024 around the European
    // and the American change
    const rows = days(2024, 2, 1, 31);
    expect(levelCovers(rows, [local(2024, 2, 2), local(2024, 2, 31, 12)], 'day')).toBe(true);
    expect(levelCovers(rows, [local(2024, 1, 29, 12), local(2024, 2, 31)], 'day')).toBe(true);
    expect(levelCovers(rows, [local(2024, 1, 28, 12), local(2024, 2, 31)], 'day')).toBe(false);
  });

  it('no rows, or a name that is no interval: no cover', () => {
    expect(levelCovers([], [local(2026, 0, 1), local(2026, 1, 1)], 'day')).toBe(false);
    expect(levelCovers(days(2026, 0, 1, 31), [local(2026, 0, 1), local(2026, 0, 31)], 'fortnight')).toBe(false);
  });
});

// ─── The choice ──────────────────────────────────────────────────────────────

describe('chooseLevel: the finest covering level within maxPoints', () => {
  // hours for the last 2 days, days for 60 days, months for 3 years — all to 18 November 2026
  const END = local(2026, 10, 18, 11);
  const levels = [
    { name: 'hour',  rows: hours(new Date(+END - 47 * HOUR), 48) },
    { name: 'day',   rows: days(2026, 8, 20, 60) },
    { name: 'month', rows: months(2023, 11, 36) },
  ];
  const pick = (from, opts) => chooseLevel(levels, [from, END], opts);

  it('the finest that covers the window and fits', () => {
    expect(pick(local(2026, 10, 17, 12))).toBe('hour');
    expect(pick(local(2026, 9, 18, 11))).toBe('day');     // a month: the hours start too late
    expect(pick(local(2024, 0, 1))).toBe('month');        // years: only the months reach back
  });

  it('maxPoints at its boundary: a level with exactly that many rows fits, one more does not', () => {
    const from = local(2026, 10, 17, 12);
    const n = countInWindow(levels[0].rows, [from, END]);
    expect(n).toBe(24);
    expect(pick(from, { maxPoints: n })).toBe('hour');
    expect(pick(from, { maxPoints: n - 1 })).toBe('day');
  });

  it('no covering level fits: the coarsest that covers', () => {
    // from 1 October: the days (49 rows) and the months (2) cover it, the hours do not
    expect(pick(local(2026, 9, 1), { maxPoints: 1 })).toBe('month');
    expect(pick(local(2026, 9, 1), { maxPoints: 2 })).toBe('month');
    expect(pick(local(2026, 9, 1), { maxPoints: 49 })).toBe('day');
  });

  it('the default is 500', () => {
    expect(DEFAULT_MAX_POINTS).toBe(500);
    const many = [{ name: 'hour', rows: hours(local(2026, 0, 1), 501) }, { name: 'day', rows: days(2026, 0, 1, 30) }];
    const view = n => [local(2026, 0, 1), new Date(+local(2026, 0, 1) + (n - 1) * HOUR)];
    expect(chooseLevel(many, view(500))).toBe('hour');
    expect(chooseLevel(many, view(501))).toBe('day');
  });

  it('none covers: the finest level with any rows in the window', () => {
    // hours for 2 days and days for 60, no months: a year reaches past both
    const short = levels.slice(0, 2);
    expect(chooseLevel(short, [local(2025, 10, 18), END])).toBe('hour');
    // a window before the hours: only the days have rows in it
    expect(chooseLevel(short, [local(2026, 8, 1), local(2026, 10, 1)])).toBe('day');
  });

  it('no level has a row in the window: the coarsest; no window: the coarsest; no levels: none', () => {
    expect(chooseLevel(levels.slice(0, 2), [local(2020, 0, 1), local(2020, 5, 1)])).toBe('day');
    expect(chooseLevel(levels, null)).toBe('month');
    expect(chooseLevel([], [local(2026, 0, 1), END])).toBeNull();
  });

  it('UTC: the same rule in the zone\'s buckets', () => {
    const end = utc(2026, 10, 18, 11);
    const u = [
      { name: 'hour', rows: hours(new Date(+end - 23 * HOUR), 24) },        // from 12:00 the day before
      { name: 'day',  rows: days(2026, 9, 1, 49, utc) },
    ];
    expect(chooseLevel(u, [utc(2026, 10, 17, 11), end], { timeZone: 'UTC' })).toBe('hour');
    expect(chooseLevel(u, [utc(2026, 10, 17, 10), end], { timeZone: 'UTC' })).toBe('day');
  });
});

// ─── The tooltip's date ──────────────────────────────────────────────────────

describe('bucketDateText: a date by its bucket, in the zone', () => {
  const cases = [
    ['minute',  'Nov 18, 2026, 14:05'],
    ['hour',    'Nov 18, 2026, 14:05'],
    ['day',     'Nov 18, 2026'],
    ['week',    'Week of Nov 18, 2026'],
    ['month',   'November 2026'],
    ['quarter', 'Q4 2026'],
    ['year',    '2026'],
    [null,      'Nov 18, 2026'],
  ];

  it.each(cases)('local, %s: %s', (interval, text) => {
    expect(bucketDateText(local(2026, 10, 18, 14, 5), interval)).toBe(text);
    expect(bucketDateText(local(2026, 10, 18, 14, 5), interval, 'local')).toBe(text);
  });

  it.each(cases)('UTC, %s: %s', (interval, text) => {
    expect(bucketDateText(utc(2026, 10, 18, 14, 5), interval, 'UTC')).toBe(text);
  });

  it('the spec\'s examples, each at its bucket\'s start', () => {
    expect(bucketDateText(local(2026, 10, 18, 14), 'hour')).toBe('Nov 18, 2026, 14:00');
    expect(bucketDateText(local(2026, 10, 16), 'week')).toBe('Week of Nov 16, 2026');
    expect(bucketDateText(local(2026, 10, 1), 'month')).toBe('November 2026');
    expect(bucketDateText(local(2026, 9, 1), 'quarter')).toBe('Q4 2026');
    expect(bucketDateText(local(2026, 0, 1), 'year')).toBe('2026');
  });

  it('the quarters, and midnight as 00:00', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 11].map(m => bucketDateText(utc(2026, m, 1), 'quarter', 'UTC')))
      .toEqual(['Q1 2026', 'Q1 2026', 'Q2 2026', 'Q2 2026', 'Q3 2026', 'Q3 2026', 'Q4 2026', 'Q4 2026']);
    expect(bucketDateText(utc(2026, 10, 18), 'hour', 'UTC')).toBe('Nov 18, 2026, 00:00');
  });

  it('one instant, two zones: the bucket is named where the chart reads it', () => {
    const instant = utc(2026, 11, 31, 23, 30);               // the last half hour of 2026 in UTC
    expect(bucketDateText(instant, 'month', 'UTC')).toBe('December 2026');
    expect(bucketDateText(instant, 'quarter', 'UTC')).toBe('Q4 2026');
    expect(bucketDateText(instant, 'year', 'UTC')).toBe('2026');
    expect(bucketDateText(instant, 'hour', 'UTC')).toBe('Dec 31, 2026, 23:30');
    // in the runtime's zone, whatever it is
    const y = instant.getFullYear(), m = instant.getMonth();
    const monthName = instant.toLocaleDateString('en-US', { month: 'long' });
    expect(bucketDateText(instant, 'month')).toBe(`${monthName} ${y}`);
    expect(bucketDateText(instant, 'quarter')).toBe(`Q${Math.floor(m / 3) + 1} ${y}`);
    const hh = String(instant.getHours()).padStart(2, '0'), mm = String(instant.getMinutes()).padStart(2, '0');
    expect(bucketDateText(instant, 'hour')).toBe(`${instant.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}, ${hh}:${mm}`);
  });
});

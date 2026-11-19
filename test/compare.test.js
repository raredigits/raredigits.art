// The comparison's rule (RC-004, analytics spec §7 with owner answer 4 А),
// pure (core/compare.js): which earlier window a view is compared with
// (compareShift), a date moved by it (shiftDate), that window's rows moved
// onto the view (comparisonRows: a calendar shift row by row, two rows on
// one date keep the later), and the change shown beside it (changeOf). Also
// the pieces the tooltip takes from elsewhere: the crosshair's partner row
// (pointNear, core/Crosshair.js) and a date without its year
// (bucketDateText's `year: false`, core/utils.js).
//
// The chart that draws it: test/timeseries-compare.test.js; the days a DST
// change makes 23 or 25 hours long: test/compare-dst.test.js. Dates here are
// local, built with the local Date constructor, or UTC with Date.UTC for the
// 'UTC' zone, so each expectation holds in every TZ run.

import { describe, it, expect } from 'vitest';
import {
  COMPARE_MODES, COMPARE_NAMES, compareMode, compareShift, shiftDate, shiftKey, comparisonRows, sourceDate, changeOf,
} from '../assets/charts/src/core/compare.js';
import { pointNear } from '../assets/charts/src/core/Crosshair.js';
import { bucketDateText } from '../assets/charts/src/core/utils.js';

const HOUR = 36e5;
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const utc = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi));
const dayEnd = (D, y, mo, d) => new Date(+D(y, mo, d + 1) - 1);
const daily = (D, [y, mo, d], n, value = i => 100 + i) =>
  Array.from({ length: n }, (_, i) => ({ date: D(y, mo, d + i), value: value(i) }));
const dates = rows => rows.map(r => +r.date);
const sources = rows => rows.map(r => +sourceDate(r));

// ─── The modes ───────────────────────────────────────────────────────────────

describe('compareMode: the two modes, in any case', () => {
  it('names them; false, unset and anything else are none', () => {
    expect(COMPARE_MODES).toEqual(['previousPeriod', 'previousYear']);
    expect(COMPARE_NAMES).toEqual({ previousPeriod: 'Previous period', previousYear: 'Previous year' });
    expect(compareMode('previousPeriod')).toBe('previousPeriod');
    expect(compareMode(' PREVIOUSyear ')).toBe('previousYear');
    for (const v of [undefined, null, false, true, 0, 'previous', 'lastYear', {}]) expect(compareMode(v)).toBeNull();
  });
});

// ─── The shift ───────────────────────────────────────────────────────────────

describe.each([['local', local], ['UTC', utc]])('compareShift in the %s zone', (zone, D) => {
  const view = [D(2026, 11, 1), D(2026, 11, 18, 11, 21)];
  const shift = (key, v = view, days = null) => compareShift('previousPeriod', v, { key, days, timeZone: zone });

  it('a calendar key: one of its unit — TODAY a day, WTD a week, MTD a month, YTD a year (any case)', () => {
    expect(shift('TODAY')).toEqual({ unit: 'D', n: 1 });
    expect(shift('wtd')).toEqual({ unit: 'W', n: 1 });
    expect(shift('MTD')).toEqual({ unit: 'M', n: 1 });
    expect(shift(' Ytd ')).toEqual({ unit: 'Y', n: 1 });
  });

  it('a rolling key: n of its unit, nH in real hours', () => {
    expect(shift('24H')).toEqual({ ms: 24 * HOUR });
    expect(shift('7D')).toEqual({ unit: 'D', n: 7 });
    expect(shift('2w')).toEqual({ unit: 'W', n: 2 });
    expect(shift('3M')).toEqual({ unit: 'M', n: 3 });
    expect(shift('1Y')).toEqual({ unit: 'Y', n: 1 });
  });

  it('any other window: its length — whole days from midnight to midnight, else rounded to whole days or hours', () => {
    const days = [D(2026, 11, 2), D(2026, 11, 9)];
    expect(shift(null, days)).toEqual({ unit: 'D', n: 7 });
    expect(shift('ALL', days)).toEqual({ unit: 'D', n: 7 });
    expect(shift('0D', days)).toEqual({ unit: 'D', n: 7 });          // no window of its own
    // a day or more: the nearest whole number of days, so a daily rhythm lines up
    expect(shift(null, [D(2026, 11, 2), D(2026, 11, 9, 0, 1)])).toEqual({ unit: 'D', n: 7 });
    expect(shift(null, [D(2026, 11, 2, 9), D(2026, 11, 4, 22)])).toEqual({ unit: 'D', n: 3 });   // 61 h
    expect(shift(null, [D(2026, 11, 2, 9), D(2026, 11, 4, 20)])).toEqual({ unit: 'D', n: 2 });   // 59 h
    // an hour up to a day: whole hours; under an hour: its span
    expect(shift(null, [D(2026, 11, 2, 9), D(2026, 11, 2, 14, 40)])).toEqual({ ms: 6 * HOUR });
    expect(shift(null, [D(2026, 11, 2, 9), D(2026, 11, 2, 9, 20)])).toEqual({ ms: 20 * 6e4 });
  });

  it('a window that ends on the last millisecond of a day counts that day whole', () => {
    expect(shift(null, [D(2026, 11, 1), dayEnd(D, 2026, 11, 10)])).toEqual({ unit: 'D', n: 10 });
    // not from a midnight: rounded to whole days (9 days 18 hours → 10)
    const from = D(2026, 11, 1, 6);
    expect(shift(null, [from, dayEnd(D, 2026, 11, 10)])).toEqual({ unit: 'D', n: 10 });
  });

  it('the custom range: its days, whatever the view was clamped to', () => {
    const days = [D(2026, 11, 1), dayEnd(D, 2026, 11, 18)];
    // the data ends on 18 November at midnight: the view stops there
    expect(shift('CUSTOM', [D(2026, 11, 1), D(2026, 11, 18)], days)).toEqual({ unit: 'D', n: 18 });
  });

  it('an empty window compares with nothing', () => {
    expect(shift(null, [D(2026, 11, 1), D(2026, 11, 1)])).toBeNull();
    expect(shift(null, null)).toBeNull();
    expect(compareShift('previousPeriod', [D(2026, 11, 1, 5), D(2026, 11, 1, 5)])).toBeNull();
  });

  it("'previousYear': one year, whatever set the view", () => {
    for (const key of [null, 'TODAY', 'MTD', '7D', '24H', 'CUSTOM']) {
      expect(compareShift('previousYear', view, { key, timeZone: zone })).toEqual({ unit: 'Y', n: 1 });
    }
    expect(compareShift('nope', view, { key: 'MTD' })).toBeNull();
  });

  it('shiftDate moves by the calendar in the zone, or by milliseconds; shiftKey names a shift', () => {
    expect(+shiftDate(D(2026, 3, 31, 9), { unit: 'M', n: 1 }, -1, zone)).toBe(+D(2026, 2, 28, 9));
    expect(+shiftDate(D(2026, 2, 28, 9), { unit: 'M', n: 1 }, 1, zone)).toBe(+D(2026, 3, 28, 9));
    expect(+shiftDate(D(2024, 2, 29), { unit: 'Y', n: 1 }, 1, zone)).toBe(+D(2025, 2, 28));
    expect(+shiftDate(D(2026, 11, 18), { unit: 'W', n: 2 }, -1, zone)).toBe(+D(2026, 11, 4));
    expect(+shiftDate(D(2026, 11, 18), { ms: 5 }, -1, zone)).toBe(+D(2026, 11, 18) - 5);
    expect([shiftKey({ unit: 'M', n: 1 }), shiftKey({ ms: 60 }), shiftKey(null)]).toEqual(['1M', '60ms', '']);
  });
});

// ─── The rows ────────────────────────────────────────────────────────────────

describe.each([['local', local], ['UTC', utc]])('comparisonRows in the %s zone', (zone, D) => {
  // 1 September to 31 December 2026, one row a day: 100, 101 …
  const rows = daily(D, [2026, 9, 1], 122);
  const rowOn = (mo, d) => rows.find(r => +r.date === +D(2026, mo, d));

  it('MTD: 1–18 October onto 1–18 November, day by day, each a copy that keeps its fields', () => {
    const withExtra = rows.map(r => ({ ...r, volume: 7 }));
    const out = comparisonRows(withExtra, [D(2026, 11, 1), D(2026, 11, 18)], { unit: 'M', n: 1 }, zone);
    expect(dates(out)).toEqual(daily(D, [2026, 11, 1], 18).map(r => +r.date));
    expect(sources(out)).toEqual(daily(D, [2026, 10, 1], 18).map(r => +r.date));
    expect(out.map(r => r.value)).toEqual(Array.from({ length: 18 }, (_, i) => 130 + i));   // 1 October is 130
    expect(out[0]).toMatchObject({ volume: 7 });
    expect(Object.keys(out[0]).sort()).toEqual(['date', 'value', 'volume']);
    expect(withExtra[30].date).toEqual(D(2026, 10, 1));                     // the rows are untouched
  });

  it('two rows on one date keep the later: 30 and 31 October both land on 30 November', () => {
    // a month back from 15 November – 15 December: 15 October – 15 November
    const out = comparisonRows(rows, [D(2026, 11, 15), D(2026, 12, 15)], { unit: 'M', n: 1 }, zone);
    const on30 = out.filter(r => +r.date === +D(2026, 11, 30));
    expect(on30).toHaveLength(1);
    expect(+sourceDate(on30[0])).toBe(+D(2026, 10, 31));
    expect(on30[0].value).toBe(rowOn(10, 31).value);
    expect(out.find(r => +r.date === +D(2026, 11, 29)).value).toBe(rowOn(10, 29).value);
    expect(out.find(r => +r.date === +D(2026, 12, 1)).value).toBe(rowOn(11, 1).value);
    expect(out).toHaveLength(31);                                           // 32 rows, one pair on a date
    expect(dates(out)).toEqual([...dates(out)].sort((a, b) => a - b));
  });

  it('MTD at the end of a month: the days the month before has — 1–30 October for 1–30 November', () => {
    const out = comparisonRows(rows, [D(2026, 11, 1), D(2026, 11, 30, 23)], { unit: 'M', n: 1 }, zone);
    expect(out).toHaveLength(30);
    expect(+sourceDate(out[29])).toBe(+D(2026, 10, 30));
  });

  it('a shorter month before: February 2024 (29 days) onto 1–29 March; 30 and 31 March have none', () => {
    const leap = daily(D, [2024, 1, 1], 100);
    const out = comparisonRows(leap, [D(2024, 3, 1), D(2024, 3, 31)], { unit: 'M', n: 1 }, zone);
    expect(out).toHaveLength(29);
    expect(+out[28].date).toBe(+D(2024, 3, 29));
    expect(+sourceDate(out[28])).toBe(+D(2024, 2, 29));
  });

  it('a year back: 29 February 2024 lands on 28 February 2025, beside the 28th — the later stays', () => {
    const leap = daily(D, [2024, 2, 20], 400);
    const out = comparisonRows(leap, [D(2025, 2, 20), D(2025, 3, 5)], { unit: 'Y', n: 1 }, zone);
    const feb28 = out.find(r => +r.date === +D(2025, 2, 28));
    expect(+sourceDate(feb28)).toBe(+D(2024, 2, 29));
    expect(out.filter(r => +r.date === +D(2025, 2, 28))).toHaveLength(1);
  });

  it('a shift in milliseconds moves every row by the same span', () => {
    const span = 7 * 24 * HOUR + 6 * HOUR;
    const view = [D(2026, 11, 10, 6), D(2026, 11, 17, 12)];
    const out = comparisonRows(rows, view, { ms: span }, zone);
    // the rows from 3 November 00:00 (≥ 10 Nov 06:00 − span) to 10 November
    expect(sources(out)).toEqual(daily(D, [2026, 11, 3], 8).map(r => +r.date)
      .filter(t => t >= +view[0] - span && t <= +view[1] - span));
    out.forEach(r => expect(+r.date - +sourceDate(r)).toBe(span));
  });

  it('gaps move like any row: a null value stays null at its new date', () => {
    const holed = rows.map(r => (+r.date === +D(2026, 10, 5) ? { ...r, value: null } : r));
    const out = comparisonRows(holed, [D(2026, 11, 1), D(2026, 11, 18)], { unit: 'M', n: 1 }, zone);
    expect(out.find(r => +r.date === +D(2026, 11, 5)).value).toBeNull();
  });

  it('no rows in the earlier window, no shift or no view: none', () => {
    expect(comparisonRows(rows, [D(2026, 9, 1), D(2026, 9, 30)], { unit: 'M', n: 1 }, zone)).toEqual([]);
    expect(comparisonRows(rows, [D(2026, 8, 1), D(2026, 8, 31)], { unit: 'M', n: 1 }, zone)).toEqual([]);
    expect(comparisonRows(rows, [D(2026, 11, 1), D(2026, 11, 18)], null, zone)).toEqual([]);
    expect(comparisonRows(rows, null, { unit: 'M', n: 1 }, zone)).toEqual([]);
    expect(comparisonRows([], [D(2026, 11, 1), D(2026, 11, 18)], { unit: 'M', n: 1 }, zone)).toEqual([]);
  });

  it('hours moved a day: the same wall clock the day before', () => {
    const hours = Array.from({ length: 48 }, (_, i) => ({ date: new Date(+D(2026, 11, 17) + i * HOUR), value: i }));
    const out = comparisonRows(hours, [D(2026, 11, 18), D(2026, 11, 18, 11, 21)], { unit: 'D', n: 1 }, zone);
    expect(out.map(r => r.value)).toEqual(Array.from({ length: 12 }, (_, i) => i));
    expect(dates(out)).toEqual(hours.slice(24, 36).map(r => +r.date));
  });
});

// ─── The change ──────────────────────────────────────────────────────────────

describe('changeOf: (value − earlier) / |earlier|', () => {
  it('up, down and against a negative earlier value', () => {
    expect(changeOf(1234, 1100)).toBeCloseTo(0.12182, 5);
    expect(changeOf(50, 100)).toBe(-0.5);
    expect(changeOf(-50, -100)).toBe(0.5);
    expect(changeOf(100, 100)).toBe(0);
  });

  it('none against 0, or with a value missing', () => {
    expect(changeOf(10, 0)).toBeNull();
    expect(changeOf(null, 10)).toBeNull();
    expect(changeOf(10, null)).toBeNull();
    expect(changeOf(undefined, 10)).toBeNull();
  });
});

// ─── The partner row and its date ────────────────────────────────────────────

describe('pointNear: the row nearest a date, inside the rows', () => {
  const rows = [1, 2, 4].map(d => ({ date: local(2026, 1, d) }));

  it('the nearer one; on a tie the earlier; an exact date its row', () => {
    expect(pointNear(rows, local(2026, 1, 2))).toBe(rows[1]);
    expect(pointNear(rows, local(2026, 1, 2, 13))).toBe(rows[1]);
    expect(pointNear(rows, local(2026, 1, 3, 1))).toBe(rows[2]);
    expect(pointNear(rows, new Date((+rows[1].date + +rows[2].date) / 2))).toBe(rows[1]);
    expect(pointNear([rows[0]], rows[0].date)).toBe(rows[0]);
  });

  it('outside the rows or without rows: none', () => {
    expect(pointNear(rows, local(2025, 12, 31))).toBeNull();
    expect(pointNear(rows, local(2026, 1, 4, 0, 1))).toBeNull();
    expect(pointNear([], local(2026, 1, 2))).toBeNull();
    expect(pointNear(undefined, local(2026, 1, 2))).toBeNull();
  });
});

describe("bucketDateText with year: false — the comparison row's date", () => {
  it.each([
    ['hour', 'Oct 18, 14:00'],
    ['minute', 'Oct 18, 14:00'],
    ['day', 'Oct 18'],
    [null, 'Oct 18'],
    ['week', 'Week of Oct 18'],
    ['month', 'October'],
    ['quarter', 'Q4'],
    ['year', '2026'],
  ])('%s: %s, and the full text unchanged', (interval, text) => {
    expect(bucketDateText(local(2026, 10, 18, 14), interval, 'local', { year: false })).toBe(text);
    expect(bucketDateText(utc(2026, 10, 18, 14), interval, 'UTC', { year: false })).toBe(text);
    expect(bucketDateText(local(2026, 10, 18, 14), interval, 'local', { year: true }))
      .toBe(bucketDateText(local(2026, 10, 18, 14), interval));
  });
});

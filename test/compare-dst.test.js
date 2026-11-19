// The comparison across a DST change (RC-004, analytics spec §7 "Tests"):
// a calendar shift keeps the wall clock, so on the day clocks go forward the
// hour that does not exist runs on into the next one and the two rows that
// land there keep the later; on the day they go back, the hour that comes
// twice is compared once. nH shifts by real hours, so its rows land an hour
// off the wall clock. A window from midnight to midnight is whole days, the
// short day included. A chart in the 'UTC' zone has no DST: a day is 24 hours.
//
// Each block sets its own zone through process.env.TZ before it builds a
// date, as timeframe-anchor-dst.test.js does; the first test of a block
// proves the zone is in effect.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { compareShift, comparisonRows, sourceDate } from '../assets/charts/src/core/compare.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track, setGeometry } from './helpers.js';

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const HOUR = 36e5;

beforeEach(() => {
  setGeometry({ width: 800, height: 400 });
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => vi.useRealTimers());

// hourly rows from `from` for `n` hours, valued by their index
const hourly = (from, n) => Array.from({ length: n }, (_, i) => ({ date: new Date(+from + i * HOUR), value: i }));
const wall = d => `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe.each([
  // zone, the offset in mid-January, the day clocks go forward, the day they go back
  ['Europe/Berlin', -60, [2024, 3, 31], [2024, 10, 27]],
  ['America/Los_Angeles', 480, [2024, 3, 10], [2024, 11, 3]],
])('TZ=%s', (zone, winterOffset, spring, autumn) => {
  beforeAll(() => { process.env.TZ = zone; });

  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(winterOffset);
  });

  it('the day clocks go forward, a day back: 24 hours onto 23, the lost hour onto the next', () => {
    const [y, m, d] = spring;
    const rows = hourly(new Date(y, m - 1, d - 1), 47);              // the day before and the spring day
    const view = [new Date(y, m - 1, d), rows[46].date];
    const out = comparisonRows(rows, view, { unit: 'D', n: 1 });
    expect(out).toHaveLength(23);
    // every hour of the spring day once, at the wall clock of the day before
    out.forEach(r => {
      expect(r.date.getHours()).toBe(sourceDate(r).getHours() === 2 ? 3 : sourceDate(r).getHours());
      expect(r.date.getDate()).toBe(d);
    });
    // 02:00 and 03:00 the day before both land on 03:00: the later stays
    const at3 = out.find(r => r.date.getHours() === 3);
    expect(wall(sourceDate(at3))).toBe(`${d - 1} 03:00`);
    expect(new Set(out.map(r => +r.date)).size).toBe(23);
  });

  it('half hours in the lost hour run on past the next row: sorted by date, the later of each pair stays', () => {
    const [y, m, d] = spring;
    const rows = Array.from({ length: 48 }, (_, i) => ({ date: new Date(+new Date(y, m - 1, d - 1) + i * HOUR / 2), value: i }));
    const view = [new Date(y, m - 1, d, 1), new Date(y, m - 1, d, 5)];
    const out = comparisonRows(rows, view, { unit: 'D', n: 1 });
    expect(out.map(r => wall(r.date))).toEqual(['01:00', '01:30', '03:00', '03:30', '04:00', '04:30', '05:00'].map(t => `${d} ${t}`));
    // 02:00 and 02:30 the day before ran on to 03:00 and 03:30, where 03:00 and 03:30 landed too
    expect(out.map(r => wall(sourceDate(r)))).toEqual(['01:00', '01:30', '03:00', '03:30', '04:00', '04:30', '05:00'].map(t => `${d - 1} ${t}`));
  });

  it('the day clocks go back, a day back: 24 hours onto 25, the hour that comes twice compared once', () => {
    const [y, m, d] = autumn;
    const rows = hourly(new Date(y, m - 1, d - 1), 49);              // 24 + 25 hours
    const view = [new Date(y, m - 1, d), rows[48].date];
    const out = comparisonRows(rows, view, { unit: 'D', n: 1 });
    expect(out).toHaveLength(24);
    out.forEach(r => expect(wall(r.date)).toBe(wall(sourceDate(r)).replace(/^\d+/, String(d))));
  });

  it('24H shifts by real hours: across the change the rows land an hour off the wall clock', () => {
    const [y, m, d] = spring;
    const rows = hourly(new Date(y, m - 1, d - 1), 47);
    const view = [new Date(y, m - 1, d, 12), rows[46].date];
    const shift = compareShift('previousPeriod', view, { key: '24H' });
    expect(shift).toEqual({ ms: 24 * HOUR });
    const out = comparisonRows(rows, view, shift);
    out.forEach(r => expect(+r.date - +sourceDate(r)).toBe(24 * HOUR));
    // the window from noon reaches back to 11:00 the day before, which
    // lands on noon; noon the day before lands on 13:00
    expect(wall(out[0].date)).toBe(`${d} 12:00`);
    expect(wall(sourceDate(out[0]))).toBe(`${d - 1} 11:00`);
    expect(wall(out[1].date)).toBe(`${d} 13:00`);
    expect(wall(sourceDate(out[1]))).toBe(`${d - 1} 12:00`);
  });

  it('a window from midnight to midnight across the change is whole days', () => {
    const [y, m, d] = spring;
    expect(compareShift('previousPeriod', [new Date(y, m - 1, d - 1), new Date(y, m - 1, d + 1)])).toEqual({ unit: 'D', n: 2 });
    const [ay, am, ad] = autumn;
    expect(compareShift('previousPeriod', [new Date(ay, am - 1, ad), new Date(ay, am - 1, ad + 1)])).toEqual({ unit: 'D', n: 1 });
    // from noon: the window's own milliseconds, 23 hours here
    expect(compareShift('previousPeriod', [new Date(y, m - 1, d - 1, 12), new Date(y, m - 1, d, 12)])).toEqual({ ms: 23 * HOUR });
  });

  it("a TimeSeries anchored to now: TODAY on the spring day compares with yesterday's wall clock", () => {
    const [y, m, d] = spring;
    vi.setSystemTime(new Date(y, m - 1, d, 23, 30));
    const tip = vi.fn(() => '');
    const c = track(new TimeSeries(mount(null), {
      timeframes: ['TODAY'], defaultTimeframe: 'TODAY', timeframeAnchor: 'now', compare: 'previousPeriod', tooltipFormat: tip,
    })).setData(hourly(new Date(y, m - 1, d - 2), 71));
    const hover = date => c.container.querySelector('svg > g > rect')
      .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY: 50 }));
    hover(new Date(y, m - 1, d, 5));
    const [row, info] = tip.mock.lastCall;
    expect(wall(row.date)).toBe(`${d} 05:00`);
    expect(wall(info.compare.date)).toBe(`${d - 1} 05:00`);
    expect(info.compare.value).toBe(24 + 5);
  });

  it("a chart in the 'UTC' zone has no DST there: a day back is 24 hours", () => {
    const [y, m, d] = spring;
    const rows = hourly(new Date(Date.UTC(y, m - 1, d - 1)), 48);
    const view = [new Date(Date.UTC(y, m - 1, d)), rows[47].date];
    const out = comparisonRows(rows, view, { unit: 'D', n: 1 }, 'UTC');
    expect(out).toHaveLength(24);
    out.forEach(r => expect(+r.date - +sourceDate(r)).toBe(24 * HOUR));
  });
});

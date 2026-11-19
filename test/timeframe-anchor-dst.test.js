// The timeframe anchor on the days a DST change makes 23 or 25 hours long
// (RC-001, analytics spec §3 "Tests"): nH counts real hours, so 24H is 24
// hours on any day; TODAY starts at the zone's midnight and is as long as
// that day has run; 1D steps back one calendar day at the same wall time.
// A chart in the 'UTC' zone has no DST: its TODAY starts at UTC midnight.
//
// Each block sets its own zone through process.env.TZ before it builds a
// date, as time-zones.test.js does (one process per file, Node re-reads TZ
// on assignment); the first test of a block proves the zone is in effect.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { resolveTimeframeExtent } from '../assets/charts/src/core/utils.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track, setGeometry } from './helpers.js';

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const HOUR = 36e5;
const spanOf = ([a, b]) => (+b - +a) / HOUR;

beforeEach(() => {
  setGeometry({ width: 800, height: 400 });
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => vi.useRealTimers());

describe.each([
  // zone, the offset in mid-January, the day clocks go forward, the day they go back
  ['Europe/Berlin', -60, [2024, 3, 31], [2024, 10, 27]],
  ['America/Los_Angeles', 480, [2024, 3, 10], [2024, 11, 3]],
])('TZ=%s', (zone, winterOffset, spring, autumn) => {
  beforeAll(() => { process.env.TZ = zone; });

  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(winterOffset);
  });

  // 23:30 on that day, local; the full extent from five days before
  const windows = ([y, m, d]) => {
    const A = new Date(y, m - 1, d, 23, 30);
    const full = [new Date(y, m - 1, d - 5), A];
    const win = key => resolveTimeframeExtent(key, full, undefined, 'local', { anchor: A });
    return { A, win, day: [y, m - 1, d] };
  };

  it('the day clocks go forward: TODAY 22.5 hours, 24H 24, 1D 23', () => {
    const { A, win, day: [y, m, d] } = windows(spring);
    expect(+win('TODAY')[0]).toBe(+new Date(y, m, d));
    expect(spanOf(win('TODAY'))).toBe(22.5);
    expect(spanOf(win('24H'))).toBe(24);
    expect(+win('24H')[0]).toBe(+new Date(y, m, d - 1, 22, 30));   // the wall clock lost the hour
    expect(+win('1D')[0]).toBe(+new Date(y, m, d - 1, 23, 30));
    expect(spanOf(win('1D'))).toBe(23);
    expect(+win('TODAY')[1]).toBe(+A);
  });

  it('the day clocks go back: TODAY 24.5 hours, 24H 24, 1D 25', () => {
    const { win, day: [y, m, d] } = windows(autumn);
    expect(+win('TODAY')[0]).toBe(+new Date(y, m, d));
    expect(spanOf(win('TODAY'))).toBe(24.5);
    expect(spanOf(win('24H'))).toBe(24);
    expect(+win('24H')[0]).toBe(+new Date(y, m, d, 0, 30));          // the same day: it has 25 hours
    expect(spanOf(win('1D'))).toBe(25);
  });

  it('a TimeSeries anchored to now: 24H and TODAY on the spring day, local and UTC', () => {
    const [y, m, d] = spring;
    const A = new Date(y, m - 1, d, 23, 30);
    vi.setSystemTime(A);
    const rows = [];
    for (let t = +A - 72 * HOUR; t < +A; t += HOUR) rows.push({ date: new Date(t), value: 1 + rows.length });
    const make = o => track(new TimeSeries(mount(null), { timeframes: ['TODAY', '24H'], timeframeAnchor: 'now', ...o })).setData(rows);

    const c = make();
    c.setTimeframe('24H');
    expect(spanOf(c.getView())).toBe(24);
    expect(+c.getView()[1]).toBe(+A);
    c.setTimeframe('TODAY');
    const [start] = c.getView();
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([d, 0, 0]);
    expect(spanOf(c.getView())).toBe(22.5);

    const u = make({ timeZone: 'UTC' });
    u.setTimeframe('TODAY');
    expect(+u.getView()[0]).toBe(+new Date(Date.UTC(A.getUTCFullYear(), A.getUTCMonth(), A.getUTCDate())));
    expect(+u.getView()[1]).toBe(+A);
  });
});

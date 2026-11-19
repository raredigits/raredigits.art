// The named intervals (RC-005, analytics spec §2.6 and §4): minute … year as
// d3 intervals in the chart's zone (timeKit), the step a gap is filled by
// (stepInterval) and the interval read from a series' own steps
// (inferInterval). Levels (RC-002) and the comparison (RC-004) reuse them.
//
// Most cases run in the zone of the test run (four runs: +04, UTC,
// America/Los_Angeles, Asia/Tokyo): local dates are built with the local
// Date constructor and UTC ones with Date.UTC, so every expectation holds in
// each. The DST cases set their own zone (as time-zones.test.js does: Node
// re-reads TZ on assignment, and each test file has its own process), check
// it is in effect, and put the original back.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as d3 from 'd3';
import {
  timeKit, INTERVAL_NAMES, resolveWeekStart, stepInterval, inferInterval,
} from '../assets/charts/src/core/utils.js';

const L = (y, m, d = 1, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi);
const U = (y, m, d = 1, h = 0, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi));
const rowsOf = dates => dates.map(date => ({ date, value: 1 }));
// n rows from `from`, one interval apart (in that zone)
const series = (name, from, n, zone = 'local') =>
  rowsOf(Array.from({ length: n }, (_, k) => stepInterval(name, from, k, zone)));

// A block in a fixed zone: set before any date of it is made, restored after.
const inZone = (zone, offsetInJanuary, body) => describe(`TZ=${zone}`, () => {
  const original = process.env.TZ;
  beforeAll(() => { process.env.TZ = zone; });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });
  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(offsetInJanuary);
  });
  body();
});

describe('timeKit keeps its fields and gains the named intervals', () => {
  it('the fields it had are the same d3 pieces', () => {
    const local = timeKit('local'), utc = timeKit('UTC');
    expect(local.zone).toBe('local');
    expect([local.scale, local.format, local.day, local.month, local.year])
      .toEqual([d3.scaleTime, d3.timeFormat, d3.timeDay, d3.timeMonth, d3.timeYear]);
    expect(utc.zone).toBe('UTC');
    expect([utc.scale, utc.format, utc.day, utc.month, utc.year])
      .toEqual([d3.scaleUtc, d3.utcFormat, d3.utcDay, d3.utcMonth, d3.utcYear]);
    expect(timeKit()).toBe(local);
    expect(Object.isFrozen(local) && Object.isFrozen(utc)).toBe(true);
  });

  it('minute, hour and a Monday week are d3’s own, in each zone', () => {
    expect([timeKit().minute, timeKit().hour, timeKit().week]).toEqual([d3.timeMinute, d3.timeHour, d3.timeMonday]);
    expect([timeKit('UTC').minute, timeKit('UTC').hour, timeKit('UTC').week]).toEqual([d3.utcMinute, d3.utcHour, d3.utcMonday]);
  });

  it('interval(name) gives every named interval, finest first, and null for another name', () => {
    expect(INTERVAL_NAMES).toEqual(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']);
    for (const zone of ['local', 'UTC']) {
      const kit = timeKit(zone);
      INTERVAL_NAMES.forEach(name => expect(kit.interval(name)).toBe(name === 'week' ? kit.week : kit[name]));
      ['Day', 'decade', 'toString', '', null, undefined].forEach(name => expect(kit.interval(name)).toBeNull());
    }
  });

  it('a week starts on Monday unless asked otherwise', () => {
    const wed = L(2024, 1, 10);   // Wednesday
    expect(+timeKit().interval('week').floor(wed)).toBe(+L(2024, 1, 8));
    expect(+timeKit().interval('week', 'sunday').floor(wed)).toBe(+L(2024, 1, 7));
    expect(+timeKit().interval('week', 0).floor(wed)).toBe(+L(2024, 1, 7));
    expect(+timeKit('UTC').interval('week', 'Sunday').floor(U(2024, 1, 10, 12))).toBe(+U(2024, 1, 7));
    expect(+timeKit('UTC').interval('week').floor(U(2024, 1, 10, 12))).toBe(+U(2024, 1, 8));
  });

  it('resolveWeekStart: day numbers and names, Monday for anything else', () => {
    expect([0, 1, 6, 'sunday', 'MONDAY', ' Saturday '].map(resolveWeekStart)).toEqual([0, 1, 6, 0, 1, 6]);
    expect([undefined, null, 7, -1, 1.5, '1', 'sun', {}].map(resolveWeekStart)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('a quarter starts in January, April, July or October, in each zone', () => {
    const q = timeKit().quarter, uq = timeKit('UTC').quarter;
    expect(+q.floor(L(2024, 5, 15, 10))).toBe(+L(2024, 4, 1));
    expect(+q.floor(L(2024, 12, 31, 23))).toBe(+L(2024, 10, 1));
    expect(+q.floor(L(2024, 1, 1))).toBe(+L(2024, 1, 1));
    expect(+q.offset(L(2024, 10, 1), 1)).toBe(+L(2025, 1, 1));
    expect(+q.offset(L(2024, 4, 1), -2)).toBe(+L(2023, 10, 1));
    expect(q.count(L(2024, 1, 1), L(2025, 3, 31))).toBe(4);
    expect(q.range(L(2024, 2, 1), L(2025, 1, 1)).map(Number)).toEqual([L(2024, 4, 1), L(2024, 7, 1), L(2024, 10, 1)].map(Number));
    expect(+uq.floor(U(2024, 8, 31, 23))).toBe(+U(2024, 7, 1));
    expect(+uq.offset(U(2024, 7, 1), 2)).toBe(+U(2025, 1, 1));
  });
});

describe('stepInterval: the step a gap is filled by', () => {
  it('minutes and hours are absolute; days and weeks keep the wall time', () => {
    const t = L(2024, 3, 9, 13, 30);
    expect(+stepInterval('minute', t, 90)).toBe(+t + 90 * 6e4);
    expect(+stepInterval('hour', t, -3)).toBe(+t - 3 * 36e5);
    expect(+stepInterval('day', t, 2)).toBe(+L(2024, 3, 11, 13, 30));
    expect(+stepInterval('week', t, 1)).toBe(+L(2024, 3, 16, 13, 30));
  });

  it('a month, a quarter or a year keeps the day of the month where it can', () => {
    expect(+stepInterval('month', L(2024, 1, 31), 1)).toBe(+L(2024, 2, 29));
    expect(+stepInterval('month', L(2024, 1, 31), 2)).toBe(+L(2024, 3, 31));
    expect(+stepInterval('quarter', L(2024, 1, 15), 1)).toBe(+L(2024, 4, 15));
    expect(+stepInterval('quarter', L(2023, 11, 30), 1)).toBe(+L(2024, 2, 29));
    expect(+stepInterval('year', L(2024, 2, 29), 1)).toBe(+L(2025, 2, 28));
    expect(+stepInterval('month', U(2024, 1, 31, 6), 1, 'UTC')).toBe(+U(2024, 2, 29, 6));
  });

  it('null for a name it does not know', () => {
    expect(stepInterval('decade', L(2024, 1, 1), 1)).toBeNull();
  });
});

describe('inferInterval: the most common step, when it is a named interval', () => {
  it('reads each regular series as its interval, in both zones', () => {
    const cases = [
      ['minute', L(2024, 1, 1, 9), U(2024, 1, 1, 9)],
      ['hour', L(2024, 1, 1), U(2024, 1, 1)],
      ['day', L(2024, 1, 1), U(2024, 1, 1)],
      ['week', L(2024, 1, 1), U(2024, 1, 1)],
      ['month', L(2023, 1, 1), U(2023, 1, 1)],
      ['quarter', L(2020, 1, 1), U(2020, 1, 1)],
      ['year', L(2000, 1, 1), U(2000, 1, 1)],
    ];
    for (const [name, local, utc] of cases) {
      expect(inferInterval(series(name, local, 14)), name).toBe(name);
      expect(inferInterval(series(name, utc, 14, 'UTC'), 'UTC'), `${name} UTC`).toBe(name);
    }
  });

  it('a month is any month, 28 to 31 days; month-end rows count too', () => {
    expect(inferInterval(rowsOf([L(2024, 1, 1), L(2024, 2, 1), L(2024, 3, 1), L(2024, 4, 1)]))).toBe('month');
    // the last day of each month: 29, 31, 30, 31 days apart
    expect(inferInterval(rowsOf([L(2024, 1, 31), L(2024, 2, 29), L(2024, 3, 31), L(2024, 4, 30), L(2024, 5, 31)]))).toBe('month');
    expect(inferInterval(rowsOf([U(2024, 1, 31), U(2024, 2, 29), U(2024, 3, 31)]), 'UTC')).toBe('month');
  });

  it('a few gaps do not change it; the null rows of a gap are rows too', () => {
    const hours = series('hour', L(2024, 1, 1), 24).filter((_, i) => ![3, 4, 9, 15].includes(i));
    expect(inferInterval(hours)).toBe('hour');
    const days = series('day', L(2024, 1, 1), 10).filter((_, i) => i !== 5);
    expect(inferInterval(days)).toBe('day');
  });

  it('irregular data has none: the most common step names no interval', () => {
    expect(inferInterval(rowsOf([L(2024, 1, 1), L(2024, 1, 3), L(2024, 1, 5), L(2024, 1, 6)]))).toBeNull();   // every 2 days
    expect(inferInterval(rowsOf([0, 7, 9, 20, 26, 41].map(h => L(2024, 1, 1, h))))).toBeNull();
    expect(inferInterval(rowsOf([L(2024, 1, 1, 0), L(2024, 1, 1, 0, 30), L(2024, 1, 1, 1)]))).toBeNull();     // half hours
    expect(inferInterval(rowsOf([L(2024, 1, 1, 0, 30), L(2024, 1, 1, 23, 45)]))).toBeNull();                 // the same day
  });

  it('two steps that tie for the most common: none — the bucket would be a guess', () => {
    // two hourly steps, two of two hours
    expect(inferInterval(rowsOf([0, 1, 3, 5, 6].map(h => L(2024, 1, 1, h))))).toBeNull();
    // one daily step, one weekly
    expect(inferInterval(rowsOf([L(2024, 1, 1), L(2024, 1, 2), L(2024, 1, 9)]))).toBeNull();
    // every step different, one of them an hour
    expect(inferInterval(rowsOf([0, 1, 3, 6, 10].map(h => L(2024, 1, 1, h))))).toBeNull();
    // one more hour breaks the tie
    expect(inferInterval(rowsOf([0, 1, 2, 4, 6, 7].map(h => L(2024, 1, 1, h))))).toBe('hour');
  });

  it('fewer than two dates, or rows on one date only: none', () => {
    expect(inferInterval([])).toBeNull();
    expect(inferInterval(null)).toBeNull();
    expect(inferInterval(rowsOf([L(2024, 1, 1)]))).toBeNull();
    expect(inferInterval(rowsOf([L(2024, 1, 1), L(2024, 1, 1)]))).toBeNull();
    expect(inferInterval(rowsOf([L(2024, 1, 1), L(2024, 1, 1), L(2024, 1, 2)]))).toBe('day');
  });

  it('a day is the next calendar day of the zone, 23 to 25 hours on', () => {
    expect(inferInterval(series('day', U(2024, 1, 1), 5, 'UTC'), 'UTC')).toBe('day');
    expect(inferInterval(rowsOf([U(2024, 1, 1), U(2024, 1, 2, 1), U(2024, 1, 3, 2)]), 'UTC')).toBe('day');
    expect(inferInterval(rowsOf([U(2024, 1, 1), U(2024, 1, 2, 2), U(2024, 1, 3, 4)]), 'UTC')).toBeNull();
    // 23:00 to 23:30 the next evening is a day; 23:30 to 00:30 two days on is not
    expect(inferInterval(rowsOf([U(2024, 1, 1, 23), U(2024, 1, 2, 23, 30)]), 'UTC')).toBe('day');
    expect(inferInterval(rowsOf([U(2024, 1, 1, 23, 30), U(2024, 1, 3, 0, 30)]), 'UTC')).toBeNull();
  });
});

// ─── DST days ────────────────────────────────────────────────────────────────

inZone('America/Los_Angeles', 480, () => {
  it('local days across 10 March and 3 November 2024 (23 and 25 hours) are days', () => {
    const spring = series('day', L(2024, 3, 7), 7);
    expect(spring[4].date - spring[3].date).toBe(23 * 36e5);
    expect(inferInterval(spring)).toBe('day');
    const fall = series('day', L(2024, 10, 31), 7);
    expect(fall[4].date - fall[3].date).toBe(25 * 36e5);
    expect(inferInterval(fall)).toBe('day');
    // only DST days: still days
    expect(inferInterval(rowsOf([L(2024, 3, 10), L(2024, 3, 11)]))).toBe('day');
  });

  it('weeks and months across a DST change keep their names', () => {
    expect(inferInterval(series('week', L(2024, 2, 26), 4))).toBe('week');
    expect(inferInterval(series('month', L(2024, 1, 1), 6))).toBe('month');
  });

  it('local hours across the change are absolute hours (01:00 → 03:00 is one)', () => {
    const hours = series('hour', L(2024, 3, 10, 0), 5);
    expect(hours.map(r => r.date.getHours())).toEqual([0, 1, 3, 4, 5]);
    expect(inferInterval(hours)).toBe('hour');
  });

  it('the same instants read in UTC are days too: the next calendar day, give or take the hour', () => {
    expect(inferInterval(series('day', L(2024, 3, 9), 3), 'UTC')).toBe('day');
    expect(inferInterval(rowsOf([L(2024, 3, 10), L(2024, 3, 11)]), 'UTC')).toBe('day');
  });

  it('22 or 26 hours is no day, DST or not', () => {
    expect(inferInterval(rowsOf([L(2024, 3, 10, 1), L(2024, 3, 11, 0)]))).toBeNull();   // 22 h (one of them the DST hour)
    expect(inferInterval(rowsOf([L(2024, 11, 2, 23), L(2024, 11, 4, 0)]))).toBeNull();  // 26 h, two calendar days
  });
});

inZone('Europe/Berlin', -60, () => {
  it('local days across 31 March and 27 October 2024 are days; a quarter across them is one', () => {
    expect(inferInterval(series('day', L(2024, 3, 29), 5))).toBe('day');
    expect(inferInterval(series('day', L(2024, 10, 25), 5))).toBe('day');
    expect(inferInterval(series('quarter', L(2023, 1, 1), 8))).toBe('quarter');
    expect(+timeKit().quarter.floor(L(2024, 5, 20))).toBe(+L(2024, 4, 1));
  });
});

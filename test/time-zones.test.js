// Time zones — the safety net for T-10 ("one UTC/local policy") and RC-006
// (S-14; the relation charts' ties, also in link-time.test.js). Before T-10 a 'YYYY-MM-DD' string was parsed as UTC midnight (the
// ECMAScript rule for date-only ISO strings) but shown, ticked and cut in
// local time, so a date-only row landed on the previous evening west of UTC
// and at a morning hour east of it. T-10 adds the timeZone option — 'local'
// (default, owner 2026-10-26: a date-only string is the local midnight of
// that day) or 'UTC' (everything in UTC) — and a day-of-month clamp to the
// month and year steps. The table it follows is at parseDate in core/utils.js.
//
// Every case runs under three fixed zones. The TZ is set through process.env
// before any date of the block is created: Node re-reads it on assignment, and
// vitest's default pool (forks, one process per file) gives this file its own
// process.env — the first test of each block proves the zone is in effect, so
// a pool that ignores the assignment (worker threads) fails loudly instead of
// quietly testing the machine's zone. The original TZ is put back at the end.
// Every expectation is the same in every zone: local dates are built with
// the local Date constructor, UTC ones with Date.UTC.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as d3 from 'd3';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { parseDate, spanTimeFormatter, resolveTimeframeExtent, offsetCalendar } from '../assets/charts/src/core/utils.js';
import { dayTicks } from '../assets/charts/src/core/renderHelpers.js';
import { parseTime, activeLinkSeries } from '../assets/charts/src/core/links.js';
import { mount, track, setGeometry, dragStrip } from './helpers.js';

const ZONES = ['UTC', 'America/New_York', 'Asia/Tokyo'];
// minutes, as getTimezoneOffset() gives them, in mid-January
const WINTER_OFFSET = { UTC: 0, 'America/New_York': 300, 'Asia/Tokyo': -540 };

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

// Rows — always built inside a test, after the zone is set.
const dateOnly = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dailyStrings = (y, m, d, n) => Array.from({ length: n }, (_, i) => {
  const t = new Date(Date.UTC(y, m - 1, d + i));
  return { date: t.toISOString().slice(0, 10), value: 10 + (i % 9) };
});
const dailyLocal = (from, to) => {
  const rows = [];
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) rows.push({ date: new Date(d), value: 10 + (rows.length % 9) });
  return rows;
};

const ts = (o = {}) => track(new TimeSeries(mount(null), o));
const view = c => c.getView().map(Number);
const xLabels = c => [...c.container.querySelector('svg > g > g.rc-axis').querySelectorAll('.tick text')].map(t => t.textContent);
const pointsDrawn = c => (c.container.querySelector('path.rc-ts-line')?.getAttribute('d').match(/[ML]/g) ?? []).length;
const tooltipAtFirstPoint = c => {
  const overlay = c.container.querySelector('svg > g > rect[pointer-events="all"]');
  overlay.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 50 }));
  // its lines (the date, the rows) one after another
  return [...c.container.querySelector('.rc-tooltip').children].map(el => el.textContent).join(' ').replace(/\s+/g, ' ').trim();
};
// Line, DualAxes and the dated Bar: the X labels and the tooltip's date header
const axisLabels = c => c.gAxisX.selectAll('.tick text').nodes().map(n => n.textContent);
const headerAt = (c, el, type) => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 0, clientY: 50 }));
  return c.container.querySelector('.rc-tooltip .rc-tooltip-header').textContent;
};
const lineHeader = c => headerAt(c, c.container.querySelector('rect.rc-overlay'), 'mousemove');
const barHeader  = c => headerAt(c, c.container.querySelector('rect.rc-bar'), 'mouseover');
const tickX = (c, text) => {
  const tick = c.gAxisX.selectAll('.tick').nodes().find(n => n.textContent === text);
  return tick ? +tick.getAttribute('transform').match(/translate\(([-\d.]+)/)[1] : NaN;
};
const fiveDays = () => dailyStrings(2024, 3, 1, 5);

describe.each(ZONES)('TZ=%s', (zone) => {
  beforeAll(() => { process.env.TZ = zone; });

  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(WINTER_OFFSET[zone]);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
  });

  // ─── Stays after T-10 ──────────────────────────────────────────────────────

  describe('local Dates and instants — the same after T-10', () => {
    it('local Date rows: 1Y, 6M and YTD are calendar windows at local midnight', () => {
      const c = ts({ timeframes: ['6M', '1Y', 'YTD', 'ALL'] })
        .setData(dailyLocal(new Date(2023, 0, 1), new Date(2024, 5, 20)));
      const end = +new Date(2024, 5, 20);
      c.setTimeframe('6M');
      expect(view(c)).toEqual([+new Date(2023, 11, 20), end]);
      c.setTimeframe('1Y');
      expect(view(c)).toEqual([+new Date(2023, 5, 20), end]);
      c.setTimeframe('YTD');
      expect(view(c)).toEqual([+new Date(2024, 0, 1), end]);
    });

    it('a month or week step keeps the local wall time across a DST change', () => {
      const c = ts({ timeframes: ['1M', '1W', 'ALL'] }).setData(dailyLocal(new Date(2024, 0, 1), new Date(2024, 3, 15)));
      c.setTimeframe('1M');
      expect(view(c)).toEqual([+new Date(2024, 2, 15), +new Date(2024, 3, 15)]);   // NY: DST began 10 March
      const w = ts({ timeframes: ['1W', 'ALL'] }).setData(dailyLocal(new Date(2024, 0, 1), new Date(2024, 2, 12)));
      w.setTimeframe('1W');
      expect(view(w)).toEqual([+new Date(2024, 2, 5), +new Date(2024, 2, 12)]);
    });

    it('a month step without overflow: 1M from 15 March is 15 February', () => {
      const c = ts({ timeframes: ['1M', 'ALL'] }).setData(dailyLocal(new Date(2024, 0, 1), new Date(2024, 2, 15)));
      c.setTimeframe('1M');
      expect(view(c)).toEqual([+new Date(2024, 1, 15), +new Date(2024, 2, 15)]);
    });

    it('instants with an offset (ISO with Z or ±hh:mm, epoch ms) are the same instants in every zone', () => {
      const c = ts().setData([
        { date: '2024-03-01T12:00:00Z', value: 1 },
        { date: '2024-03-02T21:00:00+09:00', value: 2 },
        { date: Date.UTC(2024, 2, 3, 12), value: 3 },
      ]);
      expect(view(c)).toEqual([Date.UTC(2024, 2, 1, 12), Date.UTC(2024, 2, 3, 12)]);
    });

    it('a clock-time axis names the day at local midnight', () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ date: new Date(2024, 0, 5, 18 + i), value: i }));
      const labels = xLabels(ts().setData(rows));
      expect(labels).toContain('Jan 06');
      labels.filter(l => l !== 'Jan 06').forEach(l => expect(l).toMatch(/^\d\d:00$/));
    });

    it('a 1M window of date-only rows holds the same rows in every zone', () => {
      const c = ts({ timeframes: ['1M', 'ALL'], curve: 'linear', area: false }).setData(dailyStrings(2024, 1, 1, 171));
      c.setTimeframe('1M');
      expect(pointsDrawn(c)).toBe(32);                              // 19 May … 19 June
    });

    it('the navigator strip labels the months of local Date rows alike in every zone', () => {
      // the ticks follow the strip's width, the end labels their measure (S-18)
      setGeometry({ charWidth: 6 });
      const el = mount(null, { width: 800 });
      const ov = new Overview(el, { axis: true })
        .setData(Array.from({ length: 12 }, (_, i) => ({ date: new Date(2023, i, 15), value: i })), () => {});
      const labels = [...el.querySelectorAll('.rc-ov-axis .tick text')].map(t => t.textContent);
      ov.destroy();
      expect(labels).toEqual(['February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December']);
    });
  });

  // ─── T-10, timeZone 'local' (the default) ─────────────────────────────────
  // Each of these failed before T-10 in some zone (it.fails until then).

  describe('date-only strings — T-10: the local midnight of that day', () => {
    it('T-10: the view of date-only rows starts and ends at local midnight of their days', () => {
      const c = ts().setData(dailyStrings(2024, 3, 1, 5));
      expect(view(c)).toEqual([+new Date(2024, 2, 1), +new Date(2024, 2, 5)]);
    });

    it('T-10: a day axis names each day of date-only rows', () => {
      const labels = xLabels(ts().setData(dailyStrings(2024, 3, 1, 5)));
      expect(labels).toEqual(['Mar 01', 'Mar 02', 'Mar 03', 'Mar 04', 'Mar 05']);
    });

    // Before T-10, west of UTC the month's first row was the previous
    // evening; east of it, the first month's tick fell before the strip
    // started and was dropped.
    it('T-10: a month axis of monthly date-only rows starts at their first month', () => {
      const rows = Array.from({ length: 6 }, (_, i) => ({ date: dateOnly(2024, i + 1, 1), value: 10 + i }));
      expect(xLabels(ts().setData(rows))).toEqual(['Jan', 'Apr']);
    });

    it('T-10: the tooltip names the row\'s own day — 1 March, not 29 February', () => {
      const c = ts().setData([{ date: '2024-03-01', value: 10 }, { date: '2024-03-02', value: 11 }]);
      expect(tooltipAtFirstPoint(c)).toMatch(/^Mar 1, 2024 /);
    });
  });

  describe('resolveTimeframeExtent — T-10: one policy for every step', () => {
    // Before T-10 YTD was cut at local midnight while the rows sat at UTC
    // midnight: west of UTC YTD started after the 1 January row (the
    // previous evening, local) and dropped it; east of UTC the view started
    // at the row's morning hour. Every step now works on the chart's zone.
    it('T-10: YTD of date-only rows starts at local midnight on 1 January and holds that row', () => {
      const c = ts({ timeframes: ['YTD', 'ALL'], curve: 'linear', area: false }).setData(dailyStrings(2024, 1, 1, 171));
      c.setTimeframe('YTD');
      expect(view(c)[0]).toBe(+new Date(2024, 0, 1));
      expect(pointsDrawn(c)).toBe(171);
    });

    it('T-10: a relative step of date-only rows starts at local midnight', () => {
      const c = ts({ timeframes: ['1M', 'ALL'] }).setData(dailyStrings(2024, 1, 1, 171));
      c.setTimeframe('1M');
      expect(view(c)).toEqual([+new Date(2024, 4, 19), +new Date(2024, 5, 19)]);
    });

    // The day-of-month clamp — wrong in every zone before T-10 (Date overflow).
    it('T-10: 1M from 31 March is 29 February, not 2 March', () => {
      const c = ts({ timeframes: ['1M', 'ALL'] }).setData(dailyLocal(new Date(2024, 0, 1), new Date(2024, 2, 31)));
      c.setTimeframe('1M');
      expect(view(c)).toEqual([+new Date(2024, 1, 29), +new Date(2024, 2, 31)]);
    });

    it('T-10: 1Y from 29 February is 28 February a year before, not 1 March', () => {
      const c = ts({ timeframes: ['1Y', 'ALL'] }).setData(dailyLocal(new Date(2022, 0, 1), new Date(2024, 1, 29)));
      c.setTimeframe('1Y');
      expect(view(c)).toEqual([+new Date(2023, 1, 28), +new Date(2024, 1, 29)]);
    });
  });

  // ─── T-10: the table, and the helpers that take a zone ────────────────────

  describe('parseDate — the T-10 table', () => {
    const instant = Date.UTC(2024, 2, 1, 12, 30);

    it("'local': a date or a wall time without a zone of its own is the local one", () => {
      expect(+parseDate('2024-03-01')).toBe(+new Date(2024, 2, 1));
      expect(+parseDate('2024-03')).toBe(+new Date(2024, 2, 1));
      expect(+parseDate('2024')).toBe(+new Date(2024, 0, 1));
      expect(+parseDate('2024-03-01T12:30')).toBe(+new Date(2024, 2, 1, 12, 30));
      expect(+parseDate('2024-03-01 12:30:15.5')).toBe(+new Date(2024, 2, 1, 12, 30, 15, 500));
      expect(+parseDate('2024-03-10')).toBe(+new Date(2024, 2, 10));          // New York: the day DST begins
    });

    it("'UTC': a date or a wall time without a zone of its own is the UTC one", () => {
      expect(+parseDate('2024-03-01', 'UTC')).toBe(Date.UTC(2024, 2, 1));
      expect(+parseDate('2024-03', 'UTC')).toBe(Date.UTC(2024, 2, 1));
      expect(+parseDate('2024', 'UTC')).toBe(Date.UTC(2024, 0, 1));
      expect(+parseDate('2024-03-01T12:30', 'UTC')).toBe(instant);
    });

    it('an instant stays that instant in both: Z, an offset, epoch ms, a Date', () => {
      const d = new Date(instant);
      ['local', 'UTC'].forEach(tz => {
        expect(+parseDate('2024-03-01T12:30:00Z', tz)).toBe(instant);
        expect(+parseDate('2024-03-01T21:30:00+09:00', tz)).toBe(instant);
        expect(+parseDate('2024-03-01T07:30:00-05:00', tz)).toBe(instant);
        expect(+parseDate(instant, tz)).toBe(instant);
        expect(parseDate(d, tz)).toBe(d);
      });
    });

    it('other text is read by Date, the same in both', () => {
      const asDate = +new Date('March 1, 2024');
      expect(+parseDate('March 1, 2024')).toBe(asDate);
      expect(+parseDate('March 1, 2024', 'UTC')).toBe(asDate);
    });
  });

  describe('the date helpers name and cut days in the zone they are given', () => {
    it('spanTimeFormatter: the zone\'s days, and its midnight on a clock-time axis', () => {
      const month = [new Date(Date.UTC(2024, 2, 1)), new Date(Date.UTC(2024, 2, 20))];
      expect(spanTimeFormatter(month, 'UTC')(new Date(Date.UTC(2024, 2, 1)))).toBe('Mar 01');
      expect(spanTimeFormatter(month)(new Date(2024, 2, 1))).toBe('Mar 01');
      const hours = [new Date(Date.UTC(2024, 0, 5, 18)), new Date(Date.UTC(2024, 0, 6, 18))];
      const utc = spanTimeFormatter(hours, 'UTC'), local = spanTimeFormatter(hours);
      expect(utc(new Date(Date.UTC(2024, 0, 6)))).toBe('Jan 06');
      expect(utc(new Date(Date.UTC(2024, 0, 6, 3)))).toBe('03:00');
      expect(local(new Date(2024, 0, 6))).toBe('Jan 06');
      expect(local(new Date(2024, 0, 6, 3))).toBe('03:00');
    });

    it('dayTicks: the zone\'s midnights', () => {
      const utcSpan = [new Date(Date.UTC(2024, 2, 1, 12)), new Date(Date.UTC(2024, 2, 4, 12))];
      expect(dayTicks(utcSpan, 6, 'UTC').map(Number)).toEqual([Date.UTC(2024, 2, 2), Date.UTC(2024, 2, 3), Date.UTC(2024, 2, 4)]);
      const localSpan = [new Date(2024, 2, 1, 12), new Date(2024, 2, 4, 12)];
      expect(dayTicks(localSpan, 6).map(Number)).toEqual([+new Date(2024, 2, 2), +new Date(2024, 2, 3), +new Date(2024, 2, 4)]);
    });

    it('resolveTimeframeExtent: YTD and the calendar steps are cut in the zone given', () => {
      // two ends: New York's clocks change inside the first month, Tokyo's
      // date is a day on from UTC's at the second
      const ends = [Date.UTC(2024, 2, 31, 6), Date.UTC(2024, 3, 30, 20)];
      const starts = { '1M': [Date.UTC(2024, 1, 29, 6), Date.UTC(2024, 2, 30, 20)] };
      ends.forEach((end, i) => {
        const full = [new Date(Date.UTC(2023, 0, 1)), new Date(end)];
        expect(+resolveTimeframeExtent('YTD', full, undefined, 'UTC')[0]).toBe(Date.UTC(2024, 0, 1));
        expect(+resolveTimeframeExtent('1M', full, undefined, 'UTC')[0]).toBe(starts['1M'][i]);
      });
      const local = [new Date(2023, 0, 1), new Date(2024, 2, 31, 6)];
      expect(resolveTimeframeExtent('YTD', local).map(Number)).toEqual([+new Date(2024, 0, 1), +new Date(2024, 2, 31, 6)]);
      expect(resolveTimeframeExtent('1M', local).map(Number)).toEqual([+new Date(2024, 1, 29, 6), +new Date(2024, 2, 31, 6)]);
    });

    it('offsetCalendar: local steps keep the local wall time across a DST change', () => {
      expect(+offsetCalendar(new Date(2024, 2, 12, 9), 'W', -1)).toBe(+new Date(2024, 2, 5, 9));
      expect(+offsetCalendar(new Date(2024, 3, 15, 9), 'M', -1)).toBe(+new Date(2024, 2, 15, 9));
      expect(+offsetCalendar(new Date(2024, 2, 31, 9), 'M', -1)).toBe(+new Date(2024, 1, 29, 9));
    });
  });

  // ─── T-10: the time charts in each zone ───────────────────────────────────

  describe('Line, DualAxes and the dated Bar read, tick and name date-only rows in their zone', () => {
    const lineOf = o => track(new Line(mount(null), { animate: false, ...o })).setData(fiveDays());
    const dualOf = o => track(new DualAxes(mount(null), { animate: false, ...o })).setData([{ name: 'A', values: fiveDays() }]);
    const barOf  = o => track(new Bar(mount(null), { animate: false, ...o })).setData(fiveDays());
    const MD   = ['Mar 01', 'Mar 02', 'Mar 03', 'Mar 04', 'Mar 05'];   // by the span (K-10); it was '03/01'…
    const DAYS = ['Mar 01', 'Mar 02', 'Mar 03', 'Mar 04', 'Mar 05'];
    const first = tz => (tz === 'UTC' ? Date.UTC(2024, 2, 1) : +new Date(2024, 2, 1));

    it.each([['local', {}], ['UTC', { timeZone: 'UTC' }]])('%s: Line', (tz, o) => {
      const c = lineOf(o);
      expect(+c.getView()[0]).toBe(first(tz));
      expect(axisLabels(c)).toEqual(MD);
      expect(lineHeader(c)).toBe('Mar 01, 2024');
    });

    it.each([['local', {}], ['UTC', { timeZone: 'UTC' }]])('%s: DualAxes', (tz, o) => {
      const c = dualOf(o);
      expect(+c.getView()[0]).toBe(first(tz));
      expect(axisLabels(c)).toEqual(MD);
      expect(lineHeader(c)).toBe('Mar 01, 2024');
    });

    it.each([['local', {}], ['UTC', { timeZone: 'UTC' }]])('%s: the dated Bar', (tz, o) => {
      const c = barOf(o);
      expect(+c.getView()[0]).toBe(first(tz));
      expect(axisLabels(c)).toEqual(DAYS);
      expect(barHeader(c)).toBe('Mar 01, 2024');
    });
  });

  describe("timeZone: 'UTC' — the same instants, ticks and names in every zone", () => {
    const utc = { timeZone: 'UTC' };
    const monthly = () => Array.from({ length: 6 }, (_, i) => ({ date: dateOnly(2024, i + 1, 1), value: 10 + i }));
    const hourly = () => Array.from({ length: 25 }, (_, i) => ({ date: Date.UTC(2024, 0, 5, 18 + i), value: 1 + i }));

    // Over months the scale picks its own ticks: on a UTC scale they are UTC
    // month starts, so each month is named once (Tokyo's local month starts
    // are the UTC evening before, and would name the month before twice).
    it('Line: multi-series rows are read in UTC and the scale ticks UTC months', () => {
      const c = track(new Line(mount(null), { ...utc, animate: false })).setData([{ name: 'A', values: monthly() }]);
      expect(+c.getView()[0]).toBe(Date.UTC(2024, 0, 1));
      const labels = axisLabels(c);
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2}$|^\d{4}$/));   // '%b' by the span (K-10)
      expect(new Set(labels).size).toBe(labels.length);
    });

    it('DualAxes: the scale ticks UTC months', () => {
      const c = track(new DualAxes(mount(null), { ...utc, animate: false })).setData([{ name: 'A', values: monthly() }]);
      const labels = axisLabels(c);
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2}$|^\d{4}$/));   // '%b' by the span (K-10)
      expect(new Set(labels).size).toBe(labels.length);
    });

    // Over a day the dated Bar's scale picks clock-time ticks: UTC hours,
    // UTC midnight named as the day (New York's local hours are UTC 05:00…).
    it('the dated Bar: the scale ticks UTC hours and names UTC midnight', () => {
      const c = track(new Bar(mount(null), { ...utc, animate: false })).setData(hourly());
      const labels = axisLabels(c);
      expect(labels).toContain('Jan 06');
      labels.forEach(l => expect(l).toMatch(/^(Jan 06|(0[0369]|1[258]|21):00)$/));
    });

    it('TimeSeries: appendPoint reads its date in UTC', () => {
      const c = ts(utc).setData(fiveDays());
      c.appendPoint({ date: '2024-03-06', value: 1 });
      expect(view(c)).toEqual([Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 6)]);
    });

    it('TimeSeries: date-only rows are UTC midnights, ticked and named in UTC', () => {
      const c = ts(utc).setData(fiveDays());
      expect(view(c)).toEqual([Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 5)]);
      expect(xLabels(c)).toEqual(['Mar 01', 'Mar 02', 'Mar 03', 'Mar 04', 'Mar 05']);
      expect(tooltipAtFirstPoint(c)).toMatch(/^Mar 1, 2024 /);
    });

    it('TimeSeries: YTD and a month step are cut in UTC, the day of the month clamped', () => {
      const c = ts({ ...utc, timeframes: ['YTD', '1M', 'ALL'], curve: 'linear', area: false })
        .setData(dailyStrings(2024, 1, 1, 91));                   // 1 January … 31 March
      c.setTimeframe('YTD');
      expect(view(c)[0]).toBe(Date.UTC(2024, 0, 1));
      expect(pointsDrawn(c)).toBe(91);
      c.setTimeframe('1M');
      expect(view(c)).toEqual([Date.UTC(2024, 1, 29), Date.UTC(2024, 2, 31)]);
    });

    it('TimeSeries: setView bounds and annotations are read in UTC', () => {
      const c = ts({ ...utc, annotations: [{ date: '2024-03-03', label: 'A' }] }).setData(fiveDays());
      c.setView(['2024-03-02', '2024-03-04']);
      expect(view(c)).toEqual([Date.UTC(2024, 2, 2), Date.UTC(2024, 2, 4)]);
      expect(+c.container.querySelector('.rc-annotation-line').getAttribute('x1')).toBeCloseTo(c.width / 2, 6);
    });

    it('TimeSeries: a clock-time axis names the day at UTC midnight', () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ date: Date.UTC(2024, 0, 5, 18 + i), value: i }));
      const c = ts(utc).setData(rows);
      expect(xLabels(c)).toContain('Jan 06');
      // d3's axis puts a tick half a pixel on, for a crisp line
      expect(Math.abs(tickX(c, 'Jan 06') - c.xScale(new Date(Date.UTC(2024, 0, 6))))).toBeLessThanOrEqual(0.5);
    });

    it("the navigator strip ticks and names the chart's UTC hours and days", () => {
      setGeometry({ charWidth: 6 });
      const rows = Array.from({ length: 25 }, (_, i) => ({ date: Date.UTC(2024, 2, 1, i), value: i }));
      const c = track(new TimeSeries(mount(null, { width: 800 }), { ...utc, navigator: { axis: true, timeZone: 'local' } })).setData(rows);
      const labels = [...c.container.querySelectorAll('.rc-ov-axis .tick text')].map(t => t.textContent);
      expect(labels[0]).toBe('March');                           // 1 March 2024, UTC midnight
      expect(labels.at(-1)).toBe('Sat 02');
    });

    it('Overview on its own reads rows, its extent and setBrush in UTC', () => {
      const el = mount(null);
      const onBrush = vi.fn();
      const ov = new Overview(el, utc).setData(
        [{ date: '2026-01-10', value: 1 }, { date: '2026-01-20', value: 2 }], onBrush, { extent: ['2026-01-01', '2026-01-31'] });
      const W = +el.querySelector('.overlay').getAttribute('width');
      dragStrip(el, 0, W);
      const [[d0, d1]] = onBrush.mock.calls.at(-1);
      expect([+d0, +d1]).toEqual([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 31)]);
      // the line starts at its first row: day 9 of 30
      const x0 = +el.querySelector('path.rc-ov-line').getAttribute('d').match(/^M\s*([-\d.]+)/)[1];
      expect(x0).toBeCloseTo(W * 9 / 30, 6);
      ov.setBrush(['2026-01-10', '2026-01-20']);
      expect(+el.querySelector('.selection').getAttribute('x')).toBeCloseTo(W * 9 / 30, 6);
      ov.destroy();
    });
  });

  // ─── Link time: the chart's zone (RC-006) ─────────────────────────────────

  describe("link periods — RC-006: in the chart's zone, as the time series' dates", () => {
    // Before RC-006 a tie's years, months and days were UTC in every zone,
    // its timeframe steps and the navigator's axis local.
    it("years, months and days of a tie are the zone's periods", () => {
      expect(parseTime('1990')).toBe(+new Date(1990, 0, 1));
      expect(parseTime(1990, { end: true })).toBe(+new Date(1991, 0, 1) - 1);
      expect(parseTime('2024-03')).toBe(+new Date(2024, 2, 1));
      expect(parseTime('2024-03', { end: true })).toBe(+new Date(2024, 3, 1) - 1);
      expect(parseTime('2024-03-15')).toBe(+new Date(2024, 2, 15));
      const utc = { timeZone: 'UTC' };
      expect(parseTime('1990', utc)).toBe(Date.UTC(1990, 0, 1));
      expect(parseTime(1990, { ...utc, end: true })).toBe(Date.UTC(1991, 0, 1) - 1);
      expect(parseTime('2024-03', utc)).toBe(Date.UTC(2024, 2, 1));
      expect(parseTime('2024-03', { ...utc, end: true })).toBe(Date.UTC(2024, 3, 1) - 1);
      expect(parseTime('2024-03-15', utc)).toBe(Date.UTC(2024, 2, 15));
      // the zones part by the machine's offset on that day
      expect(parseTime('2024-01') - parseTime('2024-01', utc)).toBe(WINTER_OFFSET[zone] * 6e4);
    });

    it("the navigator series counts ties in the zone's months", () => {
      const ties = [{ start: '2020-01', end: '2020-06' }, { start: '2020-03' }];
      const local = activeLinkSeries(ties);
      expect(local.map(p => +p.date)).toEqual([
        ...[0, 1, 2, 3, 4, 5].map(m => +new Date(2020, m, 1)), +new Date(2020, 6, 1) - 1,
      ]);
      expect(local.map(p => p.value)).toEqual([1, 1, 2, 2, 2, 2, 2]);
      const utc = activeLinkSeries(ties, undefined, 'UTC');
      expect(utc.map(p => p.date.toISOString())).toEqual([
        '2020-01-01T00:00:00.000Z', '2020-02-01T00:00:00.000Z', '2020-03-01T00:00:00.000Z',
        '2020-04-01T00:00:00.000Z', '2020-05-01T00:00:00.000Z', '2020-06-01T00:00:00.000Z',
        '2020-06-30T23:59:59.999Z',
      ]);
      expect(utc.map(p => p.value)).toEqual([1, 1, 2, 2, 2, 2, 2]);
    });

    it("a relation chart's timeframe steps follow its timeZone", () => {
      const data = { nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ from: 'a', to: 'b', start: '2023-06', end: '2024-03' }] };
      const flow = timeZone => track(new Graph(mount(null), { view: 'flow', duration: 0, timeZone, timeframes: ['YTD', 'ALL'] })).setData(data);
      const u = flow('UTC');
      u.setTimeframe('YTD');
      expect(u.getView().map(Number)).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 3, 1) - 1]);
      const l = flow(undefined);
      l.setTimeframe('YTD');
      expect(l.getView().map(Number)).toEqual([+new Date(2024, 0, 1), +new Date(2024, 3, 1) - 1]);
    });
  });
});

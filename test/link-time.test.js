// Time on ties (core/links.js: parseTime, linkInWindow, applyTimeWindow,
// linkTimeExtent, activeLinkSeries) and the navigator of the relation charts
// built on it — the safety net for T-10, RC-006 and the TimeSeries analytics
// work (S-14). Calendar periods: a year or 'YYYY-MM' runs to its last
// millisecond as an end; open bounds (no start, no end) and ties with no
// time at all; the strip's span when the data changes under it.
//
// RC-006: a tie's start / end, the window, the timeframe steps and the
// navigator strip of Graph's flow view and MapFlow are read in the chart's
// timeZone — 'local' (default) or 'UTC', the T-10 policy of the time series
// (core/utils.js, parseDate). Before it, years, months and days were UTC in
// every zone, and the steps and the strip's axis local.
//
// Every case runs in both zones under three machine zones, west of UTC, east
// of it and UTC itself. The TZ is set through process.env before any date
// of the block is created (vitest's forks pool gives this file its own
// process; the first test of each block proves the zone is in effect — see
// test/time-zones.test.js). An expectation is built and read in the zone
// under test — the local Date for 'local', Date.UTC for 'UTC' — so each
// says the same thing everywhere; the cases that differ between zones say
// so with the zone's own offset.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as d3 from 'd3';
import {
  parseTime, linkInWindow, applyTimeWindow, linkTimeExtent, activeLinkSeries, normalizeLinks,
} from '../assets/charts/src/core/links.js';
import { layoutFlow } from '../assets/charts/src/graph/views/flow.js';
import { autoFlowHints } from '../assets/charts/src/graph/layouts/flowAuto.js';
import { foldGraph } from '../assets/charts/src/graph/views/flowFold.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track, setGeometry } from './helpers.js';

const MACHINE_ZONES = ['America/Los_Angeles', 'Asia/Tokyo', 'UTC'];
// minutes, as getTimezoneOffset() gives them, in mid-January
const WINTER_OFFSET = { 'America/Los_Angeles': 480, 'Asia/Tokyo': -540, UTC: 0 };

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const DAY = 864e5;
const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };

describe.each(MACHINE_ZONES)('TZ=%s', (machine) => {
  beforeAll(() => { process.env.TZ = machine; });

  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(WINTER_OFFSET[machine]);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(machine);
  });

  describe.each(['local', 'UTC'])("timeZone: '%s'", (zone) => {
    const utc = zone === 'UTC';
    // midnight of that day in the zone (years from 100 on: the local Date
    // reads 0–99 as 19xx)
    const U = (y, m = 1, d = 1) => (utc ? Date.UTC(y, m - 1, d) : +new Date(y, m - 1, d));
    const fmt = spec => (utc ? d3.utcFormat(spec) : d3.timeFormat(spec));
    const iso = v => fmt('%Y-%m-%dT%H:%M:%S.%L')(new Date(v));
    const day = v => fmt('%Y-%m-%d')(new Date(v));
    const get = (d, field) => (utc ? d[`getUTC${field}`]() : d[`get${field}`]());
    const pt = (v, o = {}) => parseTime(v, { ...o, timeZone: zone });
    const ext = links => linkTimeExtent(links, zone)?.map(iso) ?? null;
    const series = (links, extent) => activeLinkSeries(links, extent, zone);
    const values = s => s.map(p => p.value);
    const dates = s => s.map(p => day(p.date));

    // ─── parseTime: the calendar periods of a tie ───────────────────────────

    describe('parseTime — month and year periods', () => {
      it("'YYYY-MM' starts at the month's first millisecond and, as an end, runs to its last", () => {
        expect(iso(pt('2024-03'))).toBe('2024-03-01T00:00:00.000');
        expect(pt('2024-03')).toBe(U(2024, 3, 1));
        expect(iso(pt('2024-03', { end: true }))).toBe('2024-03-31T23:59:59.999');
        expect(pt('2024-03', { end: true })).toBe(U(2024, 4, 1) - 1);
        expect(iso(pt('2024-02', { end: true }))).toBe('2024-02-29T23:59:59.999');   // leap year
        expect(iso(pt('2023-02', { end: true }))).toBe('2023-02-28T23:59:59.999');
        expect(iso(pt('2024-12', { end: true }))).toBe('2024-12-31T23:59:59.999');
      });

      it('a year — a number below 10000 or a four-digit string — is the whole year', () => {
        expect(pt(1990)).toBe(U(1990));
        expect(pt('1990')).toBe(U(1990));
        expect(pt(' 1990 ')).toBe(U(1990));
        expect(iso(pt(1990, { end: true }))).toBe('1990-12-31T23:59:59.999');
        expect(iso(pt('1990', { end: true }))).toBe('1990-12-31T23:59:59.999');
        expect(pt(1990.7)).toBe(U(1990));
      });

      it('a day is a point: an end on it is its midnight, not the end of the day', () => {
        expect(pt('2024-03-15')).toBe(U(2024, 3, 15));
        expect(pt('2024-03-15', { end: true })).toBe(U(2024, 3, 15));
      });

      it('a date with a wall time and no zone of its own is that wall time in the zone', () => {
        expect(pt('2024-03-15T06:30')).toBe(U(2024, 3, 15) + 6.5 * 36e5);
        expect(pt('2024-03-15 06:30', { end: true })).toBe(U(2024, 3, 15) + 6.5 * 36e5);
      });

      it('Dates, epoch milliseconds and ISO strings with a zone pass through as they are, whatever the end flag', () => {
        const d = new Date(Date.UTC(2024, 2, 15, 12));
        expect(pt(d)).toBe(+d);
        expect(pt(d, { end: true })).toBe(+d);
        expect(pt(+d)).toBe(+d);
        expect(pt('2024-03-15T12:00:00Z')).toBe(+d);
        expect(pt('2024-03-15T21:00:00+09:00', { end: true })).toBe(+d);
        expect(pt(10000)).toBe(10000);                // from 10000 on, a number is epoch ms
      });

      it('no time: null, undefined, empty, unreadable and invalid values are null', () => {
        [null, undefined, '', 'soon', NaN, Infinity, new Date('x'), '2024-03-32'].forEach(v => expect(pt(v)).toBeNull());
      });
    });

    // ─── linkInWindow / applyTimeWindow ──────────────────────────────────────

    describe('the time window', () => {
      it('a window is read like the ties, in the zone: whole periods, open bounds', () => {
        const jan31 = { start: '2024-01-31', end: '2024-01-31' };
        expect(linkInWindow(jan31, null, '2024-01', zone)).toBe(true);
        expect(linkInWindow(jan31, '2024-02', null, zone)).toBe(false);
        expect(linkInWindow({ start: '2024-01-31' }, '2024-02', null, zone)).toBe(true);   // no end: still running
        expect(linkInWindow({ start: 2026 }, null, '2025', zone)).toBe(false);
        expect(linkInWindow({ start: '2023-09', end: '2023-12' }, '2024', null, zone)).toBe(false);
        expect(linkInWindow({}, '2024', '2024', zone)).toBe(true);
      });

      it('a tie that is an instant meets a calendar window where the zone puts its bounds', () => {
        // 22:00 UTC on 29 February: in March from Tokyo's midnight on, not
        // from UTC's or Los Angeles'
        const tie = { start: '2024-02-29T20:00:00Z', end: '2024-02-29T22:00:00Z' };
        const inMarch = Date.UTC(2024, 1, 29, 22) >= U(2024, 3, 1);
        expect(linkInWindow(tie, '2024-03', null, zone)).toBe(inMarch);
        expect(inMarch).toBe(!utc && machine === 'Asia/Tokyo');
        const links = [{ id: 'a', ...tie }, { id: 'b', start: '2024-03-02' }];
        expect(applyTimeWindow(links, { from: '2024-03', to: null }, 'hide', zone).map(l => l.id))
          .toEqual(inMarch ? ['a', 'b'] : ['b']);
        expect(applyTimeWindow(links, { from: '2024-03', to: null }, 'dim', zone).filter(l => l._dim).map(l => l.id))
          .toEqual(inMarch ? [] : ['a']);
      });
    });

    // ─── linkTimeExtent ──────────────────────────────────────────────────────

    describe('linkTimeExtent', () => {
      it("month granularity: from the first month's start to the last month's end", () => {
        expect(ext([{ start: '2020-03', end: '2020-05' }, { start: '2020-01', end: '2020-02' }]))
          .toEqual(['2020-01-01T00:00:00.000', '2020-05-31T23:59:59.999']);
      });

      it("year granularity: from the first year's start to the last year's end", () => {
        expect(ext([{ start: 1900, end: 1950 }, { start: '1920', end: '1990' }]))
          .toEqual(['1900-01-01T00:00:00.000', '1990-12-31T23:59:59.999']);
      });

      it('an open start: a tie with only an end adds that end', () => {
        expect(ext([{ end: 2001 }])).toEqual(['2001-12-31T23:59:59.999', '2001-12-31T23:59:59.999']);
        expect(ext([{ end: '2001-06' }, { start: 1999, end: 2000 }]))
          .toEqual(['1999-01-01T00:00:00.000', '2001-06-30T23:59:59.999']);
      });

      it('an open end: a tie with only a start adds that start — not the end of its period', () => {
        expect(ext([{ start: '1990' }])).toEqual(['1990-01-01T00:00:00.000', '1990-01-01T00:00:00.000']);
        expect(ext([{ start: 1980, end: 1985 }, { start: '1990-04' }]))
          .toEqual(['1980-01-01T00:00:00.000', '1990-04-01T00:00:00.000']);
      });

      it('ties with no time add nothing; with no timed tie the extent is null', () => {
        expect(ext([{ source: 'a', target: 'b' }, { start: 2000, end: 2001 }, { start: '', end: 'soon' }]))
          .toEqual(['2000-01-01T00:00:00.000', '2001-12-31T23:59:59.999']);
        expect(linkTimeExtent([{ source: 'a' }, { start: null, end: '' }], zone)).toBeNull();
        expect(linkTimeExtent([], zone)).toBeNull();
        expect(linkTimeExtent(null, zone)).toBeNull();
      });

      it('mixed: years, months, days, Dates and epoch ms on one scale', () => {
        expect(ext([
          { start: 2019 },
          { start: '2019-06', end: '2020-02' },
          { start: '2020-03-15' },
          { start: new Date(U(2018, 11, 3)) },
          { end: U(2021, 1, 10) },
        ])).toEqual(['2018-11-03T00:00:00.000', '2021-01-10T00:00:00.000']);
      });
    });

    // ─── activeLinkSeries ────────────────────────────────────────────────────

    describe('activeLinkSeries — periods', () => {
      it("month buckets: the zone's months; a tie counts in every month it touches, both ends included", () => {
        const s = series([{ start: '2020-01', end: '2020-06' }, { start: '2020-02', end: '2020-04' }]);
        expect(dates(s)).toEqual(['2020-01-01', '2020-02-01', '2020-03-01', '2020-04-01', '2020-05-01', '2020-06-01', '2020-06-30']);
        expect(values(s)).toEqual([1, 2, 2, 2, 1, 1, 1]);
        s.slice(0, -1).forEach((p, i) => expect(+p.date).toBe(U(2020, i + 1, 1)));
      });

      it('year buckets past fifty years', () => {
        const s = series([{ start: 1800, end: 1899 }, { start: 1850, end: 1860 }]);
        expect(iso(s[0].date)).toBe('1800-01-01T00:00:00.000');
        expect(s).toHaveLength(100 + 1);                          // 1800…1899 and the extent's last instant
        expect(s.slice(0, -1).every(p => get(p.date, 'Month') === 0 && get(p.date, 'Date') === 1 && get(p.date, 'Hours') === 0)).toBe(true);
        expect(s.find(p => get(p.date, 'FullYear') === 1849).value).toBe(1);
        expect(s.find(p => get(p.date, 'FullYear') === 1855).value).toBe(2);
        expect(s.find(p => get(p.date, 'FullYear') === 1861).value).toBe(1);
      });

      it("day buckets under four months: the zone's days", () => {
        const s = series([{ start: '2024-01-10', end: '2024-01-12' }, { start: '2024-01-01', end: '2024-01-31' }]);
        expect(iso(s[0].date)).toBe('2024-01-01T00:00:00.000');
        expect(s).toHaveLength(31);
        expect(values(s).slice(8, 13)).toEqual([1, 2, 2, 2, 1]);   // 9…13 January
        s.forEach((p, i) => expect(+p.date).toBe(U(2024, 1, 1 + i)));
      });

      it('the granularity switches at 120 days and at fifty years of span', () => {
        const at = (t0, span) => series([{ start: t0 }], [new Date(t0), new Date(t0 + span)]);
        const t0 = U(2020);
        expect(iso(at(t0, 120 * DAY - 1)[1].date)).toBe('2020-01-02T00:00:00.000');   // days
        expect(iso(at(t0, 120 * DAY)[1].date)).toBe('2020-02-01T00:00:00.000');       // months
        const y0 = U(1900);
        expect(iso(at(y0, 50 * 365 * DAY - 1)[1].date)).toBe('1900-02-01T00:00:00.000');  // months
        expect(iso(at(y0, 50 * 365 * DAY)[1].date)).toBe('1901-01-01T00:00:00.000');      // years
      });

      it('the series spans exactly the extent: the first point at its start, the last at its end', () => {
        const s = series([{ start: '2020-01-20', end: '2020-07-10' }]);
        expect(iso(s[0].date)).toBe('2020-01-20T00:00:00.000');   // not the month's first day
        expect(iso(s.at(-1).date)).toBe('2020-07-10T00:00:00.000');
        expect(s.at(-1).value).toBe(s.at(-2).value);
      });

      it('every tie at one instant: two points one period apart, not a dot', () => {
        const s = series([{ start: '2024-01-30' }, { start: '2024-01-30' }]);
        expect(dates(s)).toEqual(['2024-01-30', '2024-01-31']);
        expect(values(s)).toEqual([2, 2]);
      });
    });

    describe('activeLinkSeries — open bounds and ties with no time', () => {
      // A frame tie fixes the extent (2020-01 … 2020-06) for the others.
      const frame = { start: '2020-01', end: '2020-06' };
      const without = s => values(s).map(v => v - 1);              // take the frame tie out

      it("an open start: counted from the strip's start up to its end — it has always been", () => {
        expect(without(series([frame, { end: '2020-03' }]))).toEqual([1, 1, 1, 0, 0, 0, 0]);
      });

      it("an open end: counted from its start to the strip's end — it is still running", () => {
        expect(without(series([frame, { start: '2020-04' }]))).toEqual([0, 0, 0, 1, 1, 1, 1]);
      });

      it('a tie with no time counts in every period — it is in every window', () => {
        expect(without(series([frame, { source: 'a', target: 'b' }]))).toEqual([1, 1, 1, 1, 1, 1, 1]);
        expect(without(series([frame, { start: 'soon', end: '' }]))).toEqual([1, 1, 1, 1, 1, 1, 1]);
      });

      it('only ties with no time: no series, so the navigator hides', () => {
        expect(series([{ source: 'a', target: 'b' }])).toBeNull();
        expect(series([])).toBeNull();
        expect(activeLinkSeries([{ start: 2020 }], null, zone)).toBeNull();   // an extent of null: none
      });

      it('mixed: closed, open on either side and timeless ties add up per month', () => {
        const s = series([frame, { end: '2020-02' }, { start: '2020-05' }, { start: '2020-02', end: '2020-03' }, {}]);
        expect(values(s)).toEqual([3, 4, 3, 2, 3, 3, 3]);
      });
    });

    describe("activeLinkSeries — an extent other than the ties' own", () => {
      const ties = [{ start: '2020-03', end: '2020-05' }];

      it('a wider extent: the strip runs over it, the ties counted where they are', () => {
        const s = series(ties, [new Date(U(2020, 1)), new Date(U(2020, 8))]);
        expect(dates(s)).toEqual(['2020-01-01', '2020-02-01', '2020-03-01', '2020-04-01',
          '2020-05-01', '2020-06-01', '2020-07-01', '2020-08-01']);
        expect(values(s)).toEqual([0, 0, 1, 1, 1, 0, 0, 0]);
      });

      it('a narrower extent: only its periods, from its start to its end', () => {
        const s = series([{ start: '2019-01', end: '2021-12' }, ...ties],
          [new Date(U(2020, 4, 10)), new Date(U(2020, 9, 20))]);
        expect(dates(s)).toEqual(['2020-04-10', '2020-05-01', '2020-06-01', '2020-07-01',
          '2020-08-01', '2020-09-01', '2020-09-20']);
        expect(values(s)).toEqual([2, 2, 1, 1, 1, 1, 1]);
      });

      it('an extent that misses the ties: a flat strip of zeros', () => {
        const s = series(ties, [new Date(U(2030, 1)), new Date(U(2030, 6))]);
        expect(values(s).every(v => v === 0)).toBe(true);
        expect(day(s[0].date).slice(0, 7)).toBe('2030-01');
      });
    });

    // ─── The relation charts' navigator when the ties change ─────────────────

    describe('relation charts — the navigator over new ties', () => {
      const ties = (...spans) => ({
        nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'c', lane: 'z' }],
        links: spans.map(([start, end], i) => ({ from: i % 2 ? 'b' : 'a', to: i % 2 ? 'c' : 'b', start, end })),
      });
      const graph = (o = {}) => track(new Graph(mount(null), { view: 'flow', duration: 0, navigator: true, timeZone: zone, ...o }));
      const strip = c => c.container.querySelector('.rc-chart-navigator');
      const W = c => +strip(c).querySelector('.overlay').getAttribute('width');
      const years = c => [...strip(c).querySelectorAll('.rc-ov-axis .tick text')]
        .filter(t => t.style.display !== 'none').map(t => +t.textContent);
      const sel = c => {
        const r = strip(c).querySelector('.selection');
        return [+r.getAttribute('x'), +r.getAttribute('x') + +r.getAttribute('width')];
      };
      const isoDays = c => c.getView().map(day);

      it('the strip has a time axis by default and turns it off with navigator: { axis: false }', () => {
        const c = graph().setData(ties([1980, 2020]));
        expect(years(c).length).toBeGreaterThan(1);
        const off = graph({ navigator: { axis: false } }).setData(ties([1980, 2020]));
        expect(off.container.querySelectorAll('.rc-chart-navigator .rc-ov-axis .tick')).toHaveLength(0);
      });

      it('after setData with ties of another span the strip spans the new ties', () => {
        // Years after 1970: before it some zones had offsets in seconds (local
        // mean time), and a local axis labels a tick near such a change ':48'
        // rather than with its year.
        const c = graph().setData(ties([1960, 1980], [1965, 1970]));
        expect(Math.max(...years(c))).toBeLessThanOrEqual(1980);
        c.setData(ties([2000, 2020], [2010]));
        const y = years(c);
        expect(y.length).toBeGreaterThan(1);
        y.forEach(v => { expect(v).toBeGreaterThanOrEqual(2000); expect(v).toBeLessThanOrEqual(2020); });
        expect(isoDays(c)).toEqual(['2000-01-01', '2020-12-31']);
        expect(c.getView().map(Number)).toEqual([U(2000), U(2021) - 1]);
        expect(sel(c)).toEqual([0, W(c)]);
      });

      it('a window the new ties still cover is kept and mapped onto the new strip', () => {
        const c = graph().setData(ties([1900, 1999]));
        c.setView([1950, 1959]);
        c.setData(ties([1940, 1980], [1945, 1949]));
        expect(isoDays(c)).toEqual(['1950-01-01', '1959-12-31']);
        const t0 = U(1940), t1 = U(1981) - 1;
        const x = t => ((t - t0) / (t1 - t0)) * W(c);
        expect(sel(c)[0]).toBeCloseTo(x(U(1950)), 6);
        expect(sel(c)[1]).toBeCloseTo(x(U(1960) - 1), 6);
      });

      it('a window the new ties leave behind falls back to their whole span', () => {
        const c = graph().setData(ties([1800, 1850]));
        c.setView([1810, 1820]);
        c.setData(ties([1900, 1950]));
        expect(isoDays(c)).toEqual(['1900-01-01', '1950-12-31']);
        expect(sel(c)).toEqual([0, W(c)]);
      });

      it('ties without time hide the strip; timed ties bring it back over their span', () => {
        const c = graph().setData(ties([1800, 1850]));
        c.setData({ nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ from: 'a', to: 'b' }] });
        expect(strip(c).style.display).toBe('none');
        c.setData(ties(['2020-01', '2020-06']));
        expect(strip(c).style.display).toBe('');
        expect(isoDays(c)).toEqual(['2020-01-01', '2020-06-30']);
        expect(c.getView().map(Number)).toEqual([U(2020, 1, 1), U(2020, 7, 1) - 1]);
      });

      it("the strip is handed the zone's months and the ties' extent in the zone", () => {
        const toStrip = vi.spyOn(Overview.prototype, 'setData');
        graph().setData(ties(['2020-01', '2020-06'], ['2020-03']));
        const [s, , { extent }] = toStrip.mock.calls.at(-1);
        expect(extent.map(Number)).toEqual([U(2020, 1, 1), U(2020, 7, 1) - 1]);
        expect(s.slice(0, -1).map(p => +p.date)).toEqual([1, 2, 3, 4, 5, 6].map(m => U(2020, m, 1)));
        expect(values(s)).toEqual([1, 1, 2, 2, 2, 2, 2]);
      });

      it('MapFlow: the same — the strip and the view follow the new ties', () => {
        const data = (start, end) => ({
          nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
          links: [{ from: 'A', to: 'B', start, end }],
        });
        const m = track(new MapFlow(mount(null), { geoData, navigator: true, timeZone: zone })).setData(data(1960, 1980));
        m.setView([1965, 1970]);
        m.setData(data(2000, 2020));
        expect(isoDays(m)).toEqual(['2000-01-01', '2020-12-31']);
        expect(m.getView().map(Number)).toEqual([U(2000), U(2021) - 1]);
        expect(years(m).length).toBeGreaterThan(1);
        years(m).forEach(v => { expect(v).toBeGreaterThanOrEqual(2000); expect(v).toBeLessThanOrEqual(2020); });
        expect(sel(m)).toEqual([0, W(m)]);
      });
    });

    // ─── The relation charts in the zone: steps, strip, dimming ──────────────

    describe('relation charts read, cut and name their ties in the zone', () => {
      const flowData = links => ({ nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'c', lane: 'z' }], links });
      const mapData = links => ({ nodes: [{ id: 'a', coords: [1, 1] }, { id: 'b', coords: [10, 10] }, { id: 'c', coords: [15, 5] }], links });
      const graph = (o = {}) => track(new Graph(mount(null, { width: 800 }), { view: 'flow', duration: 0, timeZone: zone, ...o }));
      const mapflow = (o = {}) => track(new MapFlow(mount(null, { width: 800 }), { geoData, timeZone: zone, ...o }));
      const view = c => c.getView().map(Number);

      it("YTD and 1M are cut at the zone's midnight, a month back to the day", () => {
        const g = graph({ timeframes: ['1M', 'YTD', 'ALL'] })
          .setData(flowData([{ from: 'a', to: 'b', start: '2023-06', end: '2024-03-31' }]));
        g.setTimeframe('YTD');
        expect(view(g)).toEqual([U(2024, 1, 1), U(2024, 3, 31)]);
        g.setTimeframe('1M');
        expect(view(g)).toEqual([U(2024, 2, 29), U(2024, 3, 31)]);    // 31 March less a month, clamped
        const m = mapflow({ timeframes: ['YTD', 'ALL'], defaultTimeframe: 'YTD' })
          .setData(mapData([{ from: 'a', to: 'b', start: 2022, end: '2024-03-31' }]));
        expect(view(m)).toEqual([U(2024, 1, 1), U(2024, 3, 31)]);
      });

      it("the strip's axis ticks and names the zone's hours and days", () => {
        setGeometry({ charWidth: 6 });
        const g = graph({ navigator: true })
          .setData(flowData([{ from: 'a', to: 'b', start: '2024-03-01T00:00', end: '2024-03-02T00:00' }]));
        const labels = [...g.container.querySelectorAll('.rc-chart-navigator .rc-ov-axis .tick text')].map(t => t.textContent);
        expect(labels[0]).toBe('March');                             // 1 March 2024, the zone's midnight
        expect(labels.at(-1)).toBe('Sat 02');
        expect(view(g)).toEqual([U(2024, 3, 1), U(2024, 3, 2)]);
      });

      it('Graph flow: a calendar window dims an instant tie where the zone puts its bounds', () => {
        const links = [
          { from: 'a', to: 'b', start: '2024-02-29T20:00:00Z', end: '2024-02-29T22:00:00Z' },
          { from: 'b', to: 'c', start: '2024-03-05', end: '2024-03-09' },
        ];
        const inMarch = Date.UTC(2024, 1, 29, 22) >= U(2024, 3, 1);
        const dimmed = c => [...c.container.querySelectorAll('.rc-flow-link')]
          .filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.source);
        // the window as given (no time scale) …
        const plain = graph().setData(flowData(links));
        plain.setTimeWindow('2024-03', null);
        expect(dimmed(plain)).toEqual(inMarch ? [] : ['a']);
        // … and as the view, through a timeframe range read in the zone
        const nav = graph({ timeframes: [{ key: 'mar', label: 'March', range: ['2024-03', '2024-03'] }, 'ALL'] })
          .setData(flowData(links));
        nav.setTimeframe('mar');
        expect(dimmed(nav)).toEqual(inMarch ? [] : ['a']);
        expect(view(nav)[0]).toBe(Math.max(U(2024, 3, 1), Date.UTC(2024, 1, 29, 20)));
      });

      it('MapFlow: a calendar window hides or dims an instant flow where the zone puts its bounds', () => {
        const links = [
          { from: 'a', to: 'b', start: '2024-02-29T20:00:00Z', end: '2024-02-29T22:00:00Z' },
          { from: 'b', to: 'c', start: '2024-03-05', end: '2024-03-09' },
        ];
        const inMarch = Date.UTC(2024, 1, 29, 22) >= U(2024, 3, 1);
        const drawn = c => [...c.container.querySelectorAll('.rc-mapflow-link')].map(p => p.__data__.source);
        const faded = c => [...c.container.querySelectorAll('.rc-mapflow-link')]
          .filter(p => p.getAttribute('stroke-opacity') === '0.15').map(p => p.__data__.source);
        const hide = mapflow().setData(mapData(links));
        hide.setTimeWindow('2024-03', null);
        expect(drawn(hide).sort()).toEqual(inMarch ? ['a', 'b'] : ['b']);
        const dim = mapflow({ timeWindowMode: 'dim', navigator: true }).setData(mapData(links));
        dim.setTimeWindow('2024-03', '2024-03');
        expect(faded(dim)).toEqual(inMarch ? [] : ['a']);
      });
    });

    // ─── The flow view's layout and folds order ties in the zone ─────────────

    describe("the flow view's columns and merged ties order a calendar date against an instant in the zone", () => {
      // A cycle in one lane: buyer → sale on a calendar day, the other two at
      // instants that morning. In time order the tie that closes the loop
      // turns — which tie that is depends on where the zone puts midnight.
      const nodes = [{ id: 'buyer', lane: 'a' }, { id: 'sale', lane: 'a' }, { id: 'owner', lane: 'a' }];
      const cycle = [
        { from: 'buyer', to: 'sale', start: '2024-03-01' },
        { from: 'sale', to: 'owner', start: '2024-03-01T01:00:00Z' },
        { from: 'owner', to: 'buyer', start: '2024-03-01T03:00:00Z' },
      ];
      const ids = ['buyer', 'sale', 'owner'];
      // midnight before 01:00 UTC (UTC, Tokyo) keeps buyer → sale → owner;
      // after 03:00 UTC (Los Angeles) the day's tie comes last and turns
      const calendarFirst = () => U(2024, 3, 1) < Date.UTC(2024, 2, 1, 1);
      const expectedCols = () => (calendarFirst() ? [0, 1, 2] : [2, 0, 1]);

      it('the case parts the zones as it says', () => {
        expect(calendarFirst()).toBe(utc || machine !== 'America/Los_Angeles');
      });

      it('autoFlowHints and layoutFlow rank the columns by start in the zone', () => {
        const { hints } = autoFlowHints({
          nodes, links: normalizeLinks(cycle), laneOf: n => n.lane, laneIndex: () => 0, timeZone: zone,
        });
        expect(ids.map(id => hints.get(id).col)).toEqual(expectedCols());
        const { positions } = layoutFlow({ nodes, links: normalizeLinks(cycle) }, { timeZone: zone });
        expect(ids.map(id => positions.get(id).col)).toEqual(expectedCols());
      });

      it("Graph's flow view hands its timeZone to the layout", () => {
        const g = track(new Graph(mount(null), { view: 'flow', duration: 0, timeZone: zone }))
          .setData({ nodes, links: cycle });
        const x = id => {
          const n = [...g.container.querySelectorAll('.rc-flow-node')].find(el => el.__data__.id === id);
          return +/translate\(([-\d.]+),/.exec(n.getAttribute('transform'))[1];
        };
        const order = [...ids].sort((a, b) => x(a) - x(b));
        expect(order).toEqual([...ids].sort((a, b) => expectedCols()[ids.indexOf(a)] - expectedCols()[ids.indexOf(b)]));
      });

      it("a merged tie's earliest start and latest end are found in the zone", () => {
        const ties = normalizeLinks([
          { from: 'buyer', to: 'sale', value: 1, start: '2024-03-01', end: '2024-03-02' },
          { from: 'buyer', to: 'sale', value: 2, start: '2024-03-01T03:00:00Z', end: '2024-03-02T03:00:00Z' },
        ]);
        const dayFirst = U(2024, 3, 1) < Date.UTC(2024, 2, 1, 3);
        const span = dayFirst ? ['2024-03-01', '2024-03-02T03:00:00Z'] : ['2024-03-01T03:00:00Z', '2024-03-02'];
        const [agg] = foldGraph({ nodes, links: ties }, [], new Set(), { aggregate: true, timeZone: zone }).links;
        expect([agg.start, agg.end]).toEqual(span);
        const g = track(new Graph(mount(null), { view: 'flow', duration: 0, aggregateLinks: true, timeZone: zone }))
          .setData({ nodes, links: ties });
        const drawn = [...g.container.querySelectorAll('.rc-flow-link')].map(p => p.__data__).find(l => l.aggregate);
        expect([drawn.start, drawn.end]).toEqual(span);
      });
    });
  });

  // ─── The default is local ────────────────────────────────────────────────────

  describe("the default zone is 'local', as on the time series", () => {
    it('the helpers read a tie in local time unless told otherwise', () => {
      const L = (y, m = 1, d = 1) => +new Date(y, m - 1, d);
      expect(parseTime('2024-03')).toBe(L(2024, 3));
      expect(parseTime('2024-03', { end: true })).toBe(L(2024, 4) - 1);
      expect(parseTime(1990)).toBe(L(1990));
      expect(parseTime('2024-03-15')).toBe(L(2024, 3, 15));
      expect(linkTimeExtent([{ start: '2024-01', end: '2024-02' }]).map(Number)).toEqual([L(2024, 1), L(2024, 3) - 1]);
      const s = activeLinkSeries([{ start: '2024-01', end: '2024-06' }]);
      expect(s.slice(0, -1).map(p => +p.date)).toEqual([1, 2, 3, 4, 5, 6].map(m => L(2024, m)));
      const tie = { start: '2024-02-29T20:00:00Z', end: '2024-02-29T22:00:00Z' };
      expect(linkInWindow(tie, '2024-03', null)).toBe(linkInWindow(tie, '2024-03', null, 'local'));
      expect(applyTimeWindow([tie], { from: '2024-03' }, 'dim')).toEqual(applyTimeWindow([tie], { from: '2024-03' }, 'dim', 'local'));
    });

    it("a relation chart without the option reads its ties as one with timeZone: 'local'", () => {
      const data = { nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ from: 'a', to: 'b', start: '2020-01', end: '2020-06' }] };
      const g = track(new Graph(mount(null), { view: 'flow', duration: 0, navigator: true })).setData(data);
      expect(g.getView().map(Number)).toEqual([+new Date(2020, 0, 1), +new Date(2020, 6, 1) - 1]);
      const m = track(new MapFlow(mount(null), { geoData, navigator: true })).setData({
        nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
        links: [{ from: 'A', to: 'B', start: 1990, end: 1999 }],
      });
      expect(m.getView().map(Number)).toEqual([+new Date(1990, 0, 1), +new Date(2000, 0, 1) - 1]);
    });

    it("'utc' in any case is UTC; another value reads local, with a hint", () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ties = { nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }], links: [{ from: 'A', to: 'B', start: 1990, end: 1999 }] };
      const lower = track(new MapFlow(mount(null), { geoData, navigator: true, timeZone: ' utc ' })).setData(ties);
      expect(+lower.getView()[0]).toBe(Date.UTC(1990, 0, 1));
      // the hint comes once per value: one of its own per block
      const name = `Europe/Paris (${machine})`;
      const iana = track(new MapFlow(mount(null), { geoData, navigator: true, timeZone: name })).setData(ties);
      expect(+iana.getView()[0]).toBe(+new Date(1990, 0, 1));
      expect(warn.mock.calls.some(([m]) => m.includes(name))).toBe(true);
    });
  });
});

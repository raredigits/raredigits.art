import { describe, it, expect } from 'vitest';
import { clampDateExtent, resolveTimeframeExtent } from '../assets/charts/src/core/utils.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track } from './helpers.js';
import { vi } from 'vitest';

// The library does its timeframe math in local time (setFullYear/setMonth/
// setHours). Build and read dates in local time too, so these assertions are
// independent of the machine's timezone (mixing UTC parsing with day-level
// checks would make YTD/relative windows flap across the date line).
const D = (y, m, d) => new Date(y, m - 1, d);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

describe('clampDateExtent', () => {
  it('returns the pair unchanged when inside the full extent', () => {
    const out = clampDateExtent([D(2025, 3, 1), D(2025, 6, 1)], [D(2025, 1, 1), D(2025, 12, 31)]);
    expect(out.map(ymd)).toEqual(['2025-03-01', '2025-06-01']);
  });
  it('orders a reversed pair low→high', () => {
    const out = clampDateExtent([D(2025, 6, 1), D(2025, 3, 1)], null);
    expect(out.map(ymd)).toEqual(['2025-03-01', '2025-06-01']);
  });
  it('clamps to the full extent bounds', () => {
    const out = clampDateExtent([D(2020, 1, 1), D(2030, 1, 1)], [D(2024, 1, 1), D(2026, 1, 1)]);
    expect(out.map(ymd)).toEqual(['2024-01-01', '2026-01-01']);
  });
  it('returns null for malformed input', () => {
    expect(clampDateExtent(null, null)).toBeNull();
    expect(clampDateExtent([D(2025, 1, 1)], null)).toBeNull();
  });
  it('returns null for a window that misses the data entirely, not an inverted pair (T-03)', () => {
    expect(clampDateExtent([D(2020, 1, 1), D(2020, 3, 1)], [D(2023, 1, 1), D(2023, 12, 31)])).toBeNull();
  });
});

describe('resolveTimeframeExtent', () => {
  const full = [D(2024, 1, 1), D(2026, 6, 20)];

  it('ALL / MAX returns the full extent', () => {
    expect(resolveTimeframeExtent('ALL', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
    expect(resolveTimeframeExtent('MAX', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
  });

  it('1Y goes back one year from the end', () => {
    expect(resolveTimeframeExtent('1Y', full).map(ymd)).toEqual(['2025-06-20', '2026-06-20']);
  });

  it('6M goes back six months from the end', () => {
    expect(resolveTimeframeExtent('6M', full).map(ymd)).toEqual(['2025-12-20', '2026-06-20']);
  });

  it('YTD starts at Jan 1 of the end year', () => {
    expect(resolveTimeframeExtent('YTD', full).map(ymd)).toEqual(['2026-01-01', '2026-06-20']);
  });

  it('is case-insensitive', () => {
    expect(resolveTimeframeExtent('1y', full).map(ymd)).toEqual(['2025-06-20', '2026-06-20']);
  });

  it('clamps a window longer than the data to the full extent', () => {
    // 5Y back from 2026 = 2021, before data start → clamp to 2024-01-01
    expect(resolveTimeframeExtent('5Y', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
  });

  it('accepts an explicit { range } step', () => {
    const out = resolveTimeframeExtent({ key: 'custom', range: [D(2025, 1, 1), D(2025, 2, 1)] }, full);
    expect(out.map(ymd)).toEqual(['2025-01-01', '2025-02-01']);
  });

  it('returns null for an unparseable key', () => {
    expect(resolveTimeframeExtent('banana', full)).toBeNull();
  });

  it('returns null when the full extent is missing', () => {
    expect(resolveTimeframeExtent('1Y', null)).toBeNull();
  });
});

// ─── The view of a chart when its data changes ─────────────────────────────────

const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, 15), value: 10 + i,
}));
const viewYmd = chart => chart.getView().map(ymd);
const TIME_CHARTS = [
  ['Line', o => new Line(mount(null), { animate: false, ...o }), rows => rows, 'path.rc-line'],
  ['DualAxes', o => new DualAxes(mount(null), { animate: false, ...o }), rows => [{ name: 's', values: rows }], 'path.rc-dual-line'],
  ['Bar (dates)', o => new Bar(mount(null), { animate: false, ...o }), rows => rows, 'rect.rc-bar'],
];

describe('chart view across setData (T-03)', () => {
  it.each(TIME_CHARTS)('%s: a chosen timeframe re-applies to the new data', (_n, make, shape, marks) => {
    const c = track(make({ timeframes: ['3M', 'ALL'] })).setData(shape(monthly(2020)));
    c.setTimeframe('3M');
    c.setData(shape(monthly(2023)));
    const end = new Date(2023, 11, 15), start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    expect(viewYmd(c)).toEqual([ymd(start), ymd(end)]);    // the last 3 months of the new data
    expect(c.container.querySelector('.rc-range-btn.active')?.textContent).toBe('3M');
    expect(c.container.querySelectorAll(marks).length).toBeGreaterThan(0);
  });

  it.each(TIME_CHARTS)('%s: a free view the new data leaves behind falls back to the full extent', (_n, make, shape, marks) => {
    const c = track(make({ timeframes: ['ALL'] })).setData(shape(monthly(2020)));
    c.setView([new Date(2020, 1, 1), new Date(2020, 3, 1)]);
    c.setData(shape(monthly(2023)));
    expect(viewYmd(c)).toEqual([ymd(new Date(2023, 0, 15)), ymd(new Date(2023, 11, 15))]);
    expect(c.container.querySelectorAll(marks).length).toBeGreaterThan(0);
  });

  it('a defaultView outside the data opens on the full extent, not an inverted window', () => {
    const c = track(new Line(mount(null), { animate: false, defaultView: [new Date(2010, 0, 1), new Date(2010, 5, 1)] }))
      .setData(monthly(2023));
    expect(viewYmd(c)).toEqual([ymd(new Date(2023, 0, 15)), ymd(new Date(2023, 11, 15))]);
  });

  it('an explicit window outside the data is kept as asked — an empty window, not the full range', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['ALL'] })).setData(monthly(2023));
    c.setView([new Date(2030, 0, 1), new Date(2030, 5, 1)]);
    expect(viewYmd(c)).toEqual(['2030-01-01', '2030-06-01']);
    expect(c.container.querySelectorAll('path.rc-line')).toHaveLength(0);
    expect(c.container.querySelector('.rc-range-btn.active')).toBeNull();
  });

  it('a custom timeframe object passed to setTimeframe survives setData', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['ALL'] })).setData(monthly(2023, 10));
    c.setTimeframe({ key: 'q2', label: 'Q2', range: [new Date(2023, 3, 1), new Date(2023, 5, 30)] });
    c.setData(monthly(2023, 11));
    expect(viewYmd(c)).toEqual(['2023-04-01', '2023-06-30']);
  });
});

describe('MapFlow: a time window outside the dated range behaves the same with and without the time scale', () => {
  // Map draws nothing without geometry: one square country is enough.
  const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
  const data = {
    nodes: [{ id: 'A', coords: [0, 0] }, { id: 'B', coords: [10, 10] }, { id: 'C', coords: [20, 0] }],
    links: [
      { from: 'A', to: 'B', start: 1800, end: 1850 },
      { from: 'B', to: 'C', start: 1820, end: 1900 },
      { from: 'A', to: 'C', start: 1900 },              // open-ended: still running
    ],
  };
  const drawn = c => [...c.container.querySelectorAll('.rc-mapflow-link')].map(p => `${p.__data__.source}${p.__data__.target}`).sort();
  it.each([[1950, 2000, ['AC']], [1700, 1750, []], [1840, 1860, ['AB', 'BC']]])('window %i–%i', (from, to, expected) => {
    const plain = track(new MapFlow(mount(null), { geoData, fitTo: 'links' })).setData(data);
    const nav = track(new MapFlow(mount(null), { geoData, fitTo: 'links', navigator: true, timeframes: ['ALL'] })).setData(data);
    plain.setTimeWindow(from, to);
    nav.setTimeWindow(from, to);
    expect(drawn(plain)).toEqual(expected);
    expect(drawn(nav)).toEqual(expected);
  });
});

describe('defaultTimeframe with a custom step (T-02)', () => {
  it('opens on the step\'s range and marks its button', () => {
    const c = track(new Line(mount(null), {
      animate: false,
      timeframes: [{ key: 'q1', label: 'Q1', range: [new Date(2023, 0, 1), new Date(2023, 2, 31)] }, 'ALL'],
      defaultTimeframe: 'q1',
    })).setData(monthly(2023));
    expect(viewYmd(c)).toEqual(['2023-01-15', '2023-03-31']);
    expect(c.container.querySelector('.rc-range-btn.active')?.textContent).toBe('Q1');
  });
});

// ─── Relation charts read view bounds like their ties (T-01) ───────────────────

describe('MapFlow / Graph flow: years in view bounds (T-01)', () => {
  const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
  const ties = (from, to) => ({
    nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
    links: [{ from: 'A', to: 'B', start: from, end: to }],
  });
  const iso = c => c.getView().map(d => d.toISOString().slice(0, 10));

  it('defaultView, setView and a timeframe range take years — not epoch milliseconds', () => {
    const c = track(new MapFlow(mount(null), {
      geoData, navigator: true, defaultView: [1990, 2000],
      timeframes: [{ key: '1995', label: '1995', range: ['1995', '1995'] }, 'ALL'],
    })).setData(ties(1985, 2005));
    expect(iso(c)).toEqual(['1990-01-01', '2000-12-31']);
    c.setView([1820, 1840]);                       // outside the data: an empty window, as asked
    expect(iso(c)).toEqual(['1820-01-01', '1840-12-31']);
    c.setTimeframe('1995');
    expect(iso(c)).toEqual(['1995-01-01', '1995-12-31']);
  });

  it('time-series charts keep epoch milliseconds', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['ALL'] })).setData(monthly(2023));
    c.setView([+new Date(2023, 2, 1), +new Date(2023, 5, 1)]);
    expect(viewYmd(c)).toEqual(['2023-03-01', '2023-06-01']);
  });
});

// ─── The navigator (T-04 … T-08) ───────────────────────────────────────────────

const nav = c => c._navigator;
const brushTo = (c, sel) => {               // a user's brush gesture, as d3 sees one
  const ov = nav(c);
  ov._brush.move(ov.gBrush, sel, new MouseEvent('mouseup'));
};
const selection = c => {
  const r = c.container.querySelector('.rc-chart-navigator .selection');
  return [+r.getAttribute('x'), +r.getAttribute('width')];
};

describe('navigator', () => {
  it('a drag reports through onViewChange once, when it ends (T-04)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    brushTo(c, [100, 300]);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toEqual(c.getView());
  });

  it('a click on the strip without a drag keeps the selection (T-05)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    brushTo(c, [100, 300]);
    const before = selection(c);
    brushTo(c, null);
    expect(selection(c)).toEqual(before);
    expect(before[1]).toBeGreaterThan(0);
  });

  it('navigator: { area: false } draws no area (T-06)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: { area: false } })).setData(monthly(2023));
    expect(c.container.querySelectorAll('.rc-chart-navigator .rc-ov-area')).toHaveLength(0);
    expect(c.container.querySelectorAll('.rc-chart-navigator .rc-ov-line')).toHaveLength(1);
  });

  it.each(TIME_CHARTS)('%s: the strip lines up with the plot (T-07)', (_n, make, shape) => {
    const c = track(make({ navigator: true })).setData(shape(monthly(2023)));
    const g = c.container.querySelector('.rc-chart-navigator svg > g');
    expect(g.getAttribute('transform')).toMatch(new RegExp(`^translate\\(${c.margin.left},`));
    expect(+c.container.querySelector('.rc-chart-navigator .overlay').getAttribute('width')).toBe(c.width);
  });

  it('a navigator margin given by the page merges side by side (T-07)', () => {
    const geoData = { type: 'FeatureCollection', features: [] };
    const c = track(new MapFlow(mount(null), { geoData, navigator: { margin: { left: 20 } } }));
    expect(c._getNavigatorOptions().margin).toMatchObject({ left: 20, right: 6 });
  });

  it('the strip spans every series: dates only a later series covers can be brushed to (T-08)', () => {
    const actual = monthly(2023, 6);
    const forecast = Array.from({ length: 7 }, (_, i) => ({ date: new Date(2023, 5 + i, 15), value: 20 + i }));
    const c = track(new Line(mount(null), { animate: false, navigator: true }))
      .setData([{ name: 'actual', values: actual }, { name: 'forecast', values: forecast }]);
    const W = +c.container.querySelector('.rc-chart-navigator .overlay').getAttribute('width');
    brushTo(c, [W * 0.8, W]);
    expect(c.getView()[1].getMonth()).toBe(11);       // December: the forecast's end
  });
});

// ─── Review of step 3: the remaining time paths ────────────────────────────────

describe('relation charts: year steps everywhere a bound is read (T-01)', () => {
  const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
  const ties = { nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
    links: [{ from: 'A', to: 'B', start: 1985, end: 2005 }] };
  const iso = c => c.getView().map(d => d.toISOString().slice(0, 10));
  const step = { key: '1995', label: '1995', range: ['1995', '1995'] };

  it('defaultTimeframe, the active button and a re-applied step after setData', () => {
    const c = track(new MapFlow(mount(null), { geoData, timeframes: [step, 'ALL'], defaultTimeframe: '1995' })).setData(ties);
    expect(iso(c)).toEqual(['1995-01-01', '1995-12-31']);
    c.setTimeframe('1995');
    expect(c.container.querySelector('.rc-range-btn.active')?.textContent).toBe('1995');
    c.setData({ ...ties, links: [{ from: 'A', to: 'B', start: 1980, end: 2010 }] });
    expect(iso(c)).toEqual(['1995-01-01', '1995-12-31']);
  });

  it('Graph flow reads years the same way', () => {
    const g = track(new Graph(mount(null), { view: 'flow', duration: 0, navigator: true, defaultView: [1990, 2000] }))
      .setData({ nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ from: 'a', to: 'b', start: 1985, end: 2005 }] });
    expect(iso(g)).toEqual(['1990-01-01', '2000-12-31']);
    g.setTimeWindow(1991, 1999);
    expect(iso(g)).toEqual(['1991-01-01', '1999-12-31']);
  });

  it("a bound that does not read as a time ('', garbage) stays open, as without the time scale", () => {
    const c = track(new MapFlow(mount(null), { geoData, navigator: true })).setData(ties);
    c.setTimeWindow('', 1990);
    expect(iso(c)).toEqual(['1985-01-01', '1990-12-31']);
    c.setTimeWindow('soon', 1990);
    expect(iso(c)).toEqual(['1985-01-01', '1990-12-31']);
  });

  it("time series keep their own reading: 'YYYY-MM' bounds are the month's first day", () => {
    const c = track(new Line(mount(null), { animate: false })).setData(monthly(2023));
    c.setView(['2023-03', '2023-06']);
    expect(viewYmd(c)).toEqual(['2023-03-01', '2023-06-01']);
  });
});

describe('navigator edge cases', () => {
  it('a drag brought back to zero width restores the last window and reports it (T-04/T-05)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    const ov = c._navigator;
    const ev = () => new MouseEvent('mousemove');
    ov._brush.move(ov.gBrush, [200, 300], ev());     // the drag…
    ov._brush.move(ov.gBrush, [250, 250], ev());     // …comes back to its start pixel
    ov._brush.move(ov.gBrush, null, new MouseEvent('mouseup'));
    expect(c.container.querySelectorAll('path.rc-line').length).toBeGreaterThan(0);   // not an empty sliver
    expect(selection(c)[1]).toBeGreaterThan(1);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('ties all at one instant: the strip spans its own series instead of collapsing to a dot', () => {
    const g = track(new Graph(mount(null), { view: 'flow', duration: 0, navigator: true }))
      .setData({ nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ from: 'a', to: 'b', start: '2024-01-30' }] });
    const line = g.container.querySelector('.rc-chart-navigator .rc-ov-line').getAttribute('d');
    expect(line).toMatch(/L/);
  });

  it('one setView syncs the navigator once', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const sync = vi.spyOn(c._navigator, 'setData');
    c.setView([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('TimeSeries wheel zoom starts from the window on screen (T-09)', () => {
  it('after a timeframe, a small zoom step stays near that window and clears the selection', () => {
    const days = Array.from({ length: 730 }, (_, i) => ({ date: new Date(2022, 0, 1 + i), value: 100 + i }));
    const c = track(new TimeSeries(mount(null), { timeframes: ['3M', 'ALL'] })).setData(days);
    c.setTimeframe('3M');
    const [a, b] = c.getView();
    const zoom = c._zoom.extent([[0, 0], [c.width, c.height]]);
    c.svg.call(zoom.scaleBy, 1.05, [c.width / 2, 0]);
    const [a2, b2] = c.getView();
    const span = +b - +a;
    expect(Math.abs(+a2 - +a)).toBeLessThan(span * 0.2);
    expect(Math.abs(+b2 - +b)).toBeLessThan(span * 0.2);
    expect(c.container.querySelector('.rc-range-btn.active')?.textContent).not.toBe('3M');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clampDateExtent, resolveTimeframeExtent } from '../assets/charts/src/core/utils.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track, brushDrag, dragStrip, setGeometry } from './helpers.js';
import { vi } from 'vitest';

// Moved from chart-core-7a.test.js (RC-026):
//   'C-34: several steps cover the same window' → same describe
//   'K-16: a brush drag renders once per animation frame' → same describe
// Moved from public-surface-k04.test.js (RC-026):
//   'viewSteps — deprecated alias of timeframes (K-04)' → 'viewSteps — the removed alias' (RC-059)
//   'Overview — standalone, dates read as the charts read them (K-04)' → same describe

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

// ─── The lit button and the timeframes option ──────────────────────────────────

describe('C-34: several steps cover the same window', () => {
  const activeButton = c => c.container.querySelector('.rc-range-btn.active')?.textContent ?? null;
  // Feb–Nov 2024: YTD, 1Y and ALL all resolve to the whole data.
  const year = () => Array.from({ length: 10 }, (_, i) => ({ date: new Date(2024, i + 1, 1), value: 10 + i }));
  const make = (o = {}) => track(new Line(mount(null), { animate: false, timeframes: ['1M', 'YTD', '1Y', 'ALL'], ...o })).setData(year());
  const whole = [new Date(2024, 1, 1), new Date(2024, 10, 1)];   // the data's first and last day

  it('the whole data lights ALL, not YTD — the first step in the list that covers it', () => {
    expect(activeButton(make())).toBe('ALL');
  });

  it('a step chosen by click or setTimeframe() stays lit', () => {
    const c = make();
    c.setTimeframe('YTD');
    expect(activeButton(c)).toBe('YTD');
    c.container.querySelectorAll('.rc-range-btn')[2].click();   // 1Y
    expect(activeButton(c)).toBe('1Y');
  });

  it('after a brush or setView over the whole data: ALL, not the first match', () => {
    const c = make({ navigator: true });
    c.setTimeframe('YTD');
    c.setView(whole);
    expect(activeButton(c)).toBe('ALL');
  });

  it('defaultTimeframe stays lit while its view holds', () => {
    const c = make({ defaultTimeframe: 'YTD' });
    expect(activeButton(c)).toBe('YTD');
    c.setView([new Date(2024, 5, 1), new Date(2024, 8, 1)]);
    c.setView(whole);
    expect(activeButton(c)).toBe('ALL');
  });

  it('a window short of the data lights the first step that matches it', () => {
    const c = make();
    c.setTimeframe('1M');
    expect(activeButton(c)).toBe('1M');
    c.setView(c.getView());
    expect(activeButton(c)).toBe('1M');
  });

  it("'MAX' counts as the whole data too; a custom range covering it does not outrank it", () => {
    const [a, b] = [new Date(2024, 1, 1), new Date(2024, 10, 1)];
    const c = make({ timeframes: [{ key: 'SPAN', range: [a, b] }, 'YTD', 'MAX'] });
    expect(activeButton(c)).toBe('MAX');
  });
});

// The state of a timeframe button is aria-pressed (K-06); `.active` stays
// beside it as an alias until 0.9.9, on the same button. The Lin/Log button
// is an action (it names the scale it switches to): no aria-pressed.
describe('K-06: the pressed timeframe is aria-pressed, with .active as its alias', () => {
  const year = () => Array.from({ length: 10 }, (_, i) => ({ date: new Date(2024, i + 1, 1), value: 10 + i }));
  const pressed = c => [...c.container.querySelectorAll('.rc-range-btn:not(.rc-scale-btn)')]
    .map(b => `${b.textContent}:${b.getAttribute('aria-pressed')}${b.classList.contains('active') ? ':active' : ''}`);

  it('every timeframe button carries the state, from before the data on; it follows the view', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['1M', '1Y', 'ALL'] }));
    expect(pressed(c)).toEqual(['1M:false', '1Y:false', 'ALL:false']);
    c.setData(year());
    expect(pressed(c)).toEqual(['1M:false', '1Y:false', 'ALL:true:active']);
    c.container.querySelectorAll('.rc-range-btn')[0].click();
    expect(pressed(c)).toEqual(['1M:true:active', '1Y:false', 'ALL:false']);
    c.setView([new Date(2030, 0, 1), new Date(2030, 5, 1)]);   // an empty window: none
    expect(pressed(c)).toEqual(['1M:false', '1Y:false', 'ALL:false']);
  });

  it('a relation chart\'s buttons too (MapFlow with its time scale)', () => {
    const square = (x, y) => [[[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10], [x, y]]];
    const c = track(new MapFlow(mount(null), {
      geoData: { type: 'FeatureCollection', features: [
        { type: 'Feature', id: '1', geometry: { type: 'Polygon', coordinates: square(0, 40) } },
        { type: 'Feature', id: '2', geometry: { type: 'Polygon', coordinates: square(30, 40) } },
      ] },
      projection: 'mercator', timeframes: [{ key: 'early', label: 'Early', range: [1800, 1850] }, 'ALL'],
    })).setData({
      nodes: [{ id: 'W', country: '1' }, { id: 'E', country: '2' }],
      links: [{ from: 'W', to: 'E', value: 1, start: 1800, end: 1900 }],
    });
    expect(pressed(c)).toEqual(['Early:false', 'ALL:true:active']);
    c.setTimeframe('early');
    expect(pressed(c)).toEqual(['Early:true:active', 'ALL:false']);
  });

  it('the Lin/Log button has no aria-pressed', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['ALL'], scaleToggle: true })).setData(year());
    // the Log toggle has its own aria-pressed (RC-083), never a timeframe's
    expect(c.container.querySelector('.rc-scale-btn').getAttribute('aria-pressed')).toBe('false');
  });

  it('a render that changes nothing writes nothing', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['1M', 'ALL'] })).setData(year());
    const seen = new MutationObserver(() => {});
    seen.observe(c.container.querySelector('.rc-chart-range-bar'), { subtree: true, attributes: true });
    c.render();
    c.setData(year());
    expect(seen.takeRecords()).toEqual([]);
    seen.disconnect();
  });
});

describe('viewSteps — the removed alias of timeframes (K-04, RC-059)', () => {
  afterEach(() => vi.restoreAllMocks());
  const dates = values => values.map((value, i) => ({ date: new Date(2026, 0, 1 + i * 20), value }));
  const buttons = c => [...c.container.querySelectorAll('.rc-range-btn:not(.rc-scale-btn)')].map(b => b.textContent);

  // Removed in 0.9.8_7 (the maintainer's decision of 2026-10-26): the option
  // is ignored like any unknown key, and nothing warns about it any more.
  it('builds no buttons and warns nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = track(new Line(mount(null), { animate: false, viewSteps: ['3M', 'ALL'] })).setData(dates([1, 2, 3, 4, 5, 6]));
    expect(buttons(a)).toEqual([]);
    expect(warn.mock.calls.filter(args => String(args[0]).includes('viewSteps'))).toEqual([]);
  });

  it('timeframes alone builds the buttons', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['1M'], viewSteps: ['3M', 'ALL'] })).setData(dates([1, 2, 3]));
    expect(buttons(c)).toEqual(['1M']);
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
  // ties and bounds are read in local time, the default timeZone (RC-006)
  const iso = c => c.getView().map(ymd);

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

const strip = c => c.container.querySelector('.rc-chart-navigator');
const selection = c => {
  const r = c.container.querySelector('.rc-chart-navigator .selection');
  return [+r.getAttribute('x'), +r.getAttribute('width')];
};

// The navigator's sizes are the test's own (S-18): the card and the strip
// inside it are BOX px wide, as the strip spans the card in a page.
const BOX = 800;

describe('navigator', () => {
  beforeEach(() => setGeometry({ width: BOX, height: 400 }));

  it('a drag reports through onViewChange once, when it ends (T-04)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    dragStrip(strip(c), 100, 200, 300);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toEqual(c.getView());
  });

  it('a click on the strip without a drag keeps the selection (T-05)', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    dragStrip(strip(c), 100, 300);
    const before = selection(c);
    dragStrip(strip(c), 500);                       // press and release, no move
    expect(selection(c)).toEqual(before);
    expect(before[0]).toBeCloseTo(100, 6);          // x and width of the dragged window
    expect(before[1]).toBeCloseTo(200, 6);
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
    const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
    const c = track(new MapFlow(mount(null), { geoData, navigator: { margin: { left: 20 } } })).setData({
      nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
      links: [{ from: 'A', to: 'B', start: 1985, end: 2005 }],
    });
    // the page's left, the relation chart's own right (6px for the handle)
    expect(strip(c).querySelector('svg > g').getAttribute('transform')).toMatch(/^translate\(20,/);
    expect(+strip(c).querySelector('.overlay').getAttribute('width')).toBe(BOX - 20 - 6);
  });

  it('the strip spans every series: dates only a later series covers can be brushed to (T-08)', () => {
    const actual = monthly(2023, 6);
    const forecast = Array.from({ length: 7 }, (_, i) => ({ date: new Date(2023, 5 + i, 15), value: 20 + i }));
    const c = track(new Line(mount(null), { animate: false, navigator: true }))
      .setData([{ name: 'actual', values: actual }, { name: 'forecast', values: forecast }]);
    const W = +c.container.querySelector('.rc-chart-navigator .overlay').getAttribute('width');
    dragStrip(strip(c), W * 0.8, W);
    expect(c.getView()[1].getMonth()).toBe(11);       // December: the forecast's end
  });
});

// ─── Review of step 3: the remaining time paths ────────────────────────────────

describe('relation charts: year steps everywhere a bound is read (T-01)', () => {
  const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
  const ties = { nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
    links: [{ from: 'A', to: 'B', start: 1985, end: 2005 }] };
  // ties and bounds are read in local time, the default timeZone (RC-006)
  const iso = c => c.getView().map(ymd);
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
    dragStrip(strip(c), 200, 300, 200);             // the drag comes back to its start pixel
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
    const sync = vi.spyOn(Overview.prototype, 'setData');     // what the strip is handed
    c.setView([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('K-16: a brush drag renders once per animation frame', () => {
  // The drags are in pixels (100 to 390): the card and strip get their own box.
  beforeEach(() => setGeometry({ width: BOX, height: 400 }));
  // Rows on the 1st of each month, values from 100 (monthly() above uses the 15th).
  const firstOfMonth = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
    date: new Date(year, i, 1), value: 100 + i,
  }));
  const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  // The strip spans the data, Jan 1 to Dec 1, linearly over its width: the
  // date at x, to the millisecond d3 rounds to.
  const span = [new Date(2023, 0, 1), new Date(2023, 11, 1)];
  const dateAt = (c, x) => {
    const W = +strip(c).querySelector('.overlay').getAttribute('width');
    return +span[0] + (x / W) * (+span[1] - +span[0]);
  };
  const expectView = (c, [x0, x1]) => {
    const [a, b] = c.getView().map(Number);
    expect(a).toBeCloseTo(dateAt(c, x0), -1);
    expect(b).toBeCloseTo(dateAt(c, x1), -1);
  };

  it('live moves land once per frame, the latest window winning, silently', async () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(firstOfMonth(2023));
    const render = vi.spyOn(c, 'render');
    const changed = vi.fn();
    c.onViewChange(changed);
    const drag = brushDrag(strip(c), 100);
    for (let i = 0; i < 10; i++) drag.move(300 + i * 10);
    expect(render).not.toHaveBeenCalled();
    await frame();
    expect(render).toHaveBeenCalledTimes(1);
    expectView(c, [100, 390]);
    expect(changed).not.toHaveBeenCalled();
    drag.end();
  });

  it('the end of the drag applies at once, reports once and drops the pending frame', async () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(firstOfMonth(2023));
    const render = vi.spyOn(c, 'render');
    const changed = vi.fn();
    c.onViewChange(changed);
    brushDrag(strip(c), 100).move(300, 320, 350).end();
    expect(render).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expectView(c, [100, 350]);
    await frame();
    await frame();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('destroy() during a drag cancels the pending frame', async () => {
    const c = new Line(mount(null), { animate: false, navigator: true }).setData(firstOfMonth(2023));
    const drag = brushDrag(strip(c), 100).move(300);
    const setView = vi.spyOn(c, 'setView');
    c.destroy();
    await frame();
    expect(setView).not.toHaveBeenCalled();
    drag.end();                                     // the release, after destroy(): nothing either (C-33)
    expect(setView).not.toHaveBeenCalled();
  });

  it('a relation chart works out its ties\' extent and strip series once per data set', () => {
    const g = track(new Graph(mount(null), { view: 'flow', navigator: true, animate: false }));
    const toStrip = vi.spyOn(Overview.prototype, 'setData');   // the series and extent the strip is handed
    const handed = () => { const [series, , { extent }] = toStrip.mock.calls.at(-1); return { series, extent }; };
    g.setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ from: 'a', to: 'b', start: '2024-01', end: '2024-06' }],
    });
    const first = handed();
    const calls = toStrip.mock.calls.length;
    g.render();                                     // a redraw over the same ties
    expect(toStrip.mock.calls.length).toBeGreaterThan(calls);
    expect(handed().series).toBe(first.series);
    expect(handed().extent).toBe(first.extent);
    g.setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ from: 'a', to: 'b', start: '2023-01', end: '2024-06' }],
    });
    expect(handed().series).not.toBe(first.series);
    expect(handed().extent[0].getFullYear()).toBe(2023);
    expect(g.getView()[0].getFullYear()).toBe(2023);
  });
});

// ─── The strip on its own: Overview, a public class ────────────────────────────

describe('Overview — standalone, dates read as the charts read them (K-04)', () => {
  const pathOf = el => el.querySelector('path.rc-ov-line').getAttribute('d');
  // the points a drawn path passes through: M x,y then the end of each C or L
  const vertices = d => d.match(/[MLC][^MLC]*/g).map(seg => seg.slice(1).split(/[ ,]/).filter(Boolean).map(Number).slice(-2));

  it('string dates, epoch ms and numeric strings draw; unreadable rows drop; the input is not touched', () => {
    const input = [
      { date: '2026-03-01', value: '3' },
      { date: Date.UTC(2026, 0, 1), value: 1 },
      { date: 'not a date', value: 5 },
      { date: '2026-02-01', value: 'n/a' },
      { date: new Date(2026, 1, 15), value: 2 },
    ];
    const copy = structuredClone(input);
    const el = mount(null, { width: BOX });
    const ov = new Overview(el, { height: 56 }).setData(input, () => {});
    expect(input).toEqual(copy);
    // three points, in date order across the strip, at the heights of 1, 2
    // and 3 on the 34px plot: numbers, read as dates, the rest dropped
    const pts = vertices(pathOf(el));
    expect(pts.map(([, y]) => y)).toEqual([34, 17, 0]);
    expect(pts[0][0]).toBe(0);
    expect(pts[1][0]).toBeGreaterThan(0);
    expect(pts[1][0]).toBeLessThan(pts[2][0]);
    expect(pts[2][0]).toBe(BOX - 70);
    expect(pathOf(el)).not.toMatch(/NaN/);
    ov.destroy();
  });

  it('extent and setBrush take strings too; onBrush reports Dates', () => {
    const el = mount(null);
    const onBrush = vi.fn();
    const ov = new Overview(el).setData(
      [{ date: '2026-01-10', value: 1 }, { date: '2026-01-20', value: 2 }],
      onBrush,
      { extent: ['2026-01-01', '2026-01-31'] },
    );
    // a drag over the whole strip reports the extent's two ends, as Dates
    dragStrip(el, 0, +el.querySelector('.overlay').getAttribute('width'));
    const [[d0, d1], { final }] = onBrush.mock.calls.at(-1);
    expect(final).toBe(true);
    expect(d0).toBeInstanceOf(Date);
    expect(+d0).toBe(+new Date(2026, 0, 1));                 // local midnights (T-10)
    expect(+d1).toBe(+new Date(2026, 0, 31));
    // the string window lands where its dates are: day 9 to day 19 of 30
    ov.setBrush(['2026-01-10', '2026-01-20']);
    const W = +el.querySelector('.overlay').getAttribute('width');
    const sel = el.querySelector('.selection');
    expect(+sel.getAttribute('x')).toBeCloseTo(W * 9 / 30, 6);
    expect(+sel.getAttribute('width')).toBeCloseTo(W * 10 / 30, 6);
    ov.setBrush(['nope', 'nope']);                                     // ignored, no throw
    expect(+sel.getAttribute('x')).toBeCloseTo(W * 9 / 30, 6);
    expect(+sel.getAttribute('width')).toBeCloseTo(W * 10 / 30, 6);
    ov.destroy();
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

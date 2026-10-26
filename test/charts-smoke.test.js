import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import * as publicApi from '../assets/charts/src/index.js';
import { mount, track } from './helpers.js';

// Construct → setData → render must not throw, and must produce a labelled
// <svg> with its marks — for every public chart class. Imports are direct.
// index.js loads under Vitest too, but its CSS import is stubbed to ''; the
// public exports are covered by exports.test.js and CSS delivery by
// bundle-smoke.test.js.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
  { date: '2026-03-01', value: 2 },
];
const labelSeries = [
  { label: 'A', value: 4 },
  { label: 'B', value: 7 },
  { label: 'C', value: 2 },
];
const square = (x, y) => [[[x, y], [x, y + 10], [x + 10, y + 10], [x + 10, y], [x, y]]];
const geoData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 0) } },
    { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: square(10, 0) } },
  ],
};
const network = {
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
  links: [{ source: 'a', target: 'b', value: 2 }, { source: 'b', target: 'c', value: 1 }],
};

// [case, factory(title), data, marks selector, how many marks, the svg's aria-label]
// `null` data: the factory brings its own. The aria-label is the title, except
// for Overview (a navigator strip — its svg carries no label of its own) and
// MultiChart (the grid has no svg; each panel draws a labelled one).
const SMOKE = [
  ['Line', t => new Line('#chart', { title: t, height: 300 }), dateSeries, 'path.rc-line', 1],
  ['Bar', t => new Bar('#chart', { title: t, height: 300 }), labelSeries, 'rect.rc-bar', 3],
  ['Bar (horizontal)', t => new Bar('#chart', { title: t, height: 300, orientation: 'horizontal' }), labelSeries, 'rect.rc-bar', 3],
  ['HierarchicalBar', t => new HierarchicalBar('#chart', { title: t }),
    { label: 'Root', children: [{ label: 'A', value: 3 }, { label: 'B', value: 2 }] }, 'g.rc-hbar-row', 3],
  ['Donut', t => new Donut('#chart', { title: t, height: 300 }), labelSeries, 'path.rc-donut-slice', 3],
  ['Pie', t => new Pie('#chart', { title: t, height: 300 }), labelSeries, 'path.rc-donut-slice', 3],
  ['Gauge (number form)', t => new Gauge('#chart', { title: t, height: 300, max: 100 }), 73, '.rc-gauge-fill', 1],
  ['DualAxes (bar + line on two axes)', t => new DualAxes('#chart', { title: t, height: 300 }), [
    { name: 'Vol', axis: 'y1', type: 'bar', values: dateSeries },
    { name: 'Price', axis: 'y2', type: 'line', values: dateSeries },
  ], 'rect.rc-dual-bar, path.rc-dual-line', 4],
  ['TimeSeries', t => new TimeSeries('#chart', { title: t, height: 300 }), dateSeries, 'path.rc-ts-line', 1],
  ['Overview', () => new Overview('#chart'), dateSeries, 'path.rc-ov-line', 1, null],
  ['Graph', t => new Graph('#chart', { title: t, duration: 0 }), network, '.rc-graph-node', 3],
  ['MultiChart', () => new MultiChart('#chart', { charts: [
    { type: 'Bar', options: { title: 'A' }, data: labelSeries },
    { type: 'Line', options: { title: 'B' }, data: dateSeries },
  ] }), null, 'svg[role="img"]', 2, 'A'],
  ['Map', t => new RareMap('#chart', { title: t, height: 300, geoData }), [{ id: 'AA', value: 5 }, { id: 'BB', value: 3 }],
    '.rc-map-paths path', 2],
  ['MapFlow', t => new MapFlow('#chart', { title: t, geoData }),
    { nodes: [{ id: 'x', coords: [2, 2] }, { id: 'y', coords: [15, 5] }], links: [{ from: 'x', to: 'y' }] },
    '.rc-mapflow-link', 1],
  ['Sankey', t => new Sankey('#chart', { title: t, animate: false }), network, '.rc-sankey-node', 3],
];

describe('chart render smoke tests', () => {
  it('the table covers every public chart class', () => {
    const classes = new Set([Line, Bar, HierarchicalBar, Donut, Pie, Gauge, DualAxes, TimeSeries,
      Overview, MultiChart, RareMap, Graph, MapFlow, Sankey]);
    const exported = Object.values(publicApi).filter(v => typeof v === 'function' && /^[A-Z]/.test(v.name)
      && typeof v.prototype?.setData === 'function');
    exported.forEach(cls => expect(classes.has(cls), cls.name).toBe(true));
    const drawn = new Set(SMOKE.map(([, make]) => track(make('t')).constructor));
    classes.forEach(cls => expect(drawn.has(cls), cls.name).toBe(true));
  });

  it.each(SMOKE)('%s constructs, accepts data, and renders a labelled svg', async (name, make, data, marks, count, label = name) => {
    let chart;
    expect(() => {
      chart = track(make(name));
      if (data != null) chart.setData(data);
    }).not.toThrow();
    await chart.whenReady?.();
    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    if (label != null) {
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe(label);
    }
    expect(host.querySelectorAll(marks)).toHaveLength(count);
  });

  it('MultiChart instantiates each child chart', () => {
    const multi = track(new MultiChart('#chart', {
      title: 'Dashboard',
      charts: [
        { type: 'Bar', options: { title: 'A' }, data: labelSeries },
        { type: 'Line', options: { title: 'B' }, data: dateSeries },
      ],
    }));
    expect(multi.charts).toHaveLength(2);
    expect(host.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('re-rendering via a second setData does not throw', () => {
    const c = new Bar('#chart', { title: 'Bar', height: 300 }).setData(labelSeries);
    expect(() => c.setData([{ label: 'X', value: 1 }])).not.toThrow();
  });
});

// ─── Empty data clears the drawing (C-02) ──────────────────────────────────────

const twoSeries = [{ name: 'a', values: dateSeries }, { name: 'b', type: 'bar', axis: 'y2', values: dateSeries }];
const hoverAt = (el, clientX = 400) =>
  el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 100 }));
const crossVisible = c => [...c.container.querySelectorAll('.rc-cross-line, svg > g > line')]
  .some(l => l.getAttribute('opacity') === '1' || l.style.opacity === '1');
const tipVisible = c => !!c.container.querySelector('.rc-tooltip.is-visible');

// [name, factory, data, empty input, marks that must vanish, has a time axis]
const EMPTY_CASES = [
  ['Line', () => new Line(mount(null), { animate: false, navigator: true, y2Title: 'T' }), dateSeries, [],
    'path.rc-line, .rc-end-label, .rc-axis text, .rc-grid line', true],
  ['DualAxes', () => new DualAxes(mount(null), { animate: false, navigator: true, y1Title: 'P', y2Title: 'V' }), twoSeries, [],
    'path.rc-dual-line, rect.rc-dual-bar, .rc-end-label, .rc-axis text, .rc-grid line, .rc-axis-titles text', true],
  ['TimeSeries', () => new TimeSeries(mount(null), { navigator: true }), dateSeries, [],
    'path.rc-ts-line, path.rc-ts-area, .rc-axis text, .rc-grid line', true],
  ['Bar (dates)', () => new Bar(mount(null), { animate: false, navigator: true }), dateSeries, [],
    'rect.rc-bar, .tick text, .tick line', true],
  ['Bar (categories)', () => new Bar(mount(null), { animate: false }), labelSeries, [],
    'rect.rc-bar, .tick text, .tick line', false],
  ['Bar (stacked)', () => new Bar(mount(null), { animate: false }), [{ name: 's', values: labelSeries }],
    [{ name: 's', values: [] }], 'rect, .tick text', false],
  ['Donut', () => new Donut(mount(null), { animate: false }), labelSeries, [],
    'path.rc-donut-slice, .rc-donut-labels *, .rc-donut-center *', false],
];

describe('setData([]) clears the previous drawing (C-02)', () => {
  it.each(EMPTY_CASES)('%s', (_name, make, data, empty, marks, timed) => {
    const c = track(make()).setData(data);
    expect(c.container.querySelectorAll(marks).length).toBeGreaterThan(0);
    c.setData(empty);
    expect(c.container.querySelectorAll(marks).length).toBe(0);
    if (timed) expect(c.container.querySelector('.rc-chart-navigator').style.display).toBe('none');
    // hovering the empty plot shows nothing from the old data
    const overlay = c.container.querySelector('rect.rc-overlay') ?? c.container.querySelector('svg > g > rect');
    if (overlay) {
      hoverAt(overlay);
      expect(tipVisible(c)).toBe(false);
      expect(crossVisible(c)).toBe(false);
    }
    c.setData(data);
    expect(c.container.querySelectorAll(marks).length).toBeGreaterThan(0);
  });

  it.each(EMPTY_CASES.filter(row => row[5]))('%s: a time window with nothing in it clears the marks, keeps the navigator', (_n, make, data, _e, marks) => {
    const c = track(make()).setData(data);
    c.setView([new Date('2026-01-05'), new Date('2026-01-20')]);   // between two points
    expect(c.container.querySelectorAll(marks).length).toBe(0);
    expect(c.container.querySelector('.rc-chart-navigator').style.display).not.toBe('none');
  });
});

// ─── Input is copied, parsed and sorted (C-06, C-07, C-10, C-26) ───────────────

describe('input normalization', () => {
  it('TimeSeries draws ISO-string dates, sorts them and never touches the caller\'s array (C-06)', () => {
    const input = [{ date: '2026-01-03', value: '3', volume: 9 }, { date: '2026-01-01', value: 1 }];
    const copy = JSON.parse(JSON.stringify(input));
    const c = track(new TimeSeries(mount(null), {})).setData(input);
    const d = c.container.querySelector('path.rc-ts-line').getAttribute('d');
    expect(d).toMatch(/^M/);
    expect(d).not.toMatch(/NaN/);
    expect(c.getView().map(v => v.toISOString().slice(0, 10))).toEqual(['2026-01-01', '2026-01-03']);
    // drawn in date order: the line's x coordinates only grow
    const xs = d.match(/[ML]\s*(-?[\d.]+)/g).map(m => +m.slice(1));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    c.appendPoint({ date: '2026-01-02', value: 2 });
    expect(input).toEqual(copy);                      // not pushed into, not re-sorted
  });

  it('TimeSeries passes extra fields through to tooltipFormat', () => {
    const fmt = vi.fn(() => '');
    const c = track(new TimeSeries(mount(null), { tooltipFormat: fmt }))
      .setData([{ date: '2026-01-01', value: 1, volume: 7 }, { date: '2026-01-02', value: 2, volume: 9 }]);
    hoverAt(c.container.querySelector('svg > g > rect'), 790);
    // the row first; the role fields second since K-09
    expect(fmt).toHaveBeenCalledWith(expect.objectContaining({ volume: 9 }), expect.any(Object));
  });

  // newest-first input draws in date order (C-07): the end label is the latest value
  const newestFirst = [{ date: '2026-03-01', value: 300 }, { date: '2026-02-01', value: 200 }, { date: '2026-01-01', value: 100 }];
  it.each([
    ['Line (flat)', () => new Line(mount(null), { animate: false }), newestFirst],
    ['Line (series)', () => new Line(mount(null), { animate: false }), [{ name: 's', values: newestFirst }]],
    ['DualAxes', () => new DualAxes(mount(null), { animate: false }), [{ name: 's', values: newestFirst }]],
  ])('%s sorts newest-first input (C-07)', (_n, make, data) => {
    const c = track(make()).setData(data);
    expect(c.container.querySelector('.rc-end-label').textContent).toMatch(/300/);
  });

  it('Bar (dates) sorts newest-first input into full-width bars (C-07)', () => {
    const c = track(new Bar(mount(null), { animate: false })).setData(newestFirst);
    const rects = [...c.container.querySelectorAll('rect.rc-bar')];
    const xs = rects.map(r => +r.getAttribute('x'));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.min(...rects.map(r => +r.getAttribute('width')))).toBeGreaterThan(2);
  });

  it('Bar coerces categorical rows: numeric labels take labelMaxLength, CSV strings scale as numbers (C-10)', () => {
    const c = track(new Bar(mount(null), { animate: false, labelMaxLength: 3, orientation: 'horizontal' }));
    expect(() => c.setData([{ label: 2021, value: 5 }, { label: 2022, value: 6 }])).not.toThrow();
    const v = track(new Bar(mount(null), { animate: false })).setData([{ label: 'A', value: '9' }, { label: 'B', value: '12' }]);
    const heights = [...v.container.querySelectorAll('rect.rc-bar')].map(r => +r.getAttribute('height'));
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(Math.max(...heights)).toBeLessThanOrEqual(v.height);   // '12' is not scaled as a string
  });

  it('Bar keeps a category whose value is missing on the axis, without a bar', () => {
    const c = track(new Bar(mount(null), { animate: false, showValues: true, orientation: 'horizontal' }))
      .setData([{ label: 'A', value: 3 }, { label: 'B' }, { label: 'C', value: 'n/a' }, { label: 'D', value: '4' }]);
    const ticks = [...c.container.querySelectorAll('.tick text')].map(t => t.textContent);
    expect(ticks).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(c.container.querySelectorAll('rect.rc-bar')).toHaveLength(2);
    expect(c.container.querySelectorAll('.rc-bar-value')).toHaveLength(2);
    expect(c.container.querySelector('rect.rc-bar').getAttribute('width')).not.toMatch(/NaN/);
  });

  it('unreadable dates are dropped instead of crashing the render (C-26)', () => {
    const all = track(new Line(mount(null), { animate: false }));
    // every date unreadable: used to throw "Cannot read properties of null"
    expect(() => all.setData([{ date: new Date(NaN), value: 1 }, { date: new Date(NaN), value: 2 }])).not.toThrow();
    expect(all.container.querySelectorAll('path.rc-line')).toHaveLength(0);

    const mixed = track(new Line(mount(null), { animate: false })).setData([
      { date: new Date(NaN), value: 1 }, { date: NaN, value: 2 }, { date: Infinity, value: 3 },
      { date: null, value: 4 }, { date: '2026-01-01', value: 5 }, { date: '2026-02-01', value: 6 },
    ]);
    expect(mixed.container.querySelector('path.rc-line').getAttribute('d')).not.toMatch(/NaN/);
    expect(mixed.getView().map(d => d.toISOString().slice(0, 7))).toEqual(['2026-01', '2026-02']);
  });
});

// ─── destroy() ends the chart's life (C-09) ────────────────────────────────────

describe('destroy()', () => {
  it('undoes only the library\'s own changes to the container; later page changes stay', () => {
    const el = mount(null);
    el.className = 'card';
    el.style.color = 'red';
    const c = new Line(el, { animate: false, navigator: true, title: 'T' }).setData(dateSeries);
    el.classList.add('is-active');      // the page, after construction
    el.style.display = 'block';
    c.destroy();
    expect(el.children.length).toBe(0);
    expect([...el.classList]).toEqual(['card', 'is-active']);
    expect(el.style.color).toBe('red');
    expect(el.style.display).toBe('block');
    expect(el.style.height).toBe('');
  });

  it('after destroy, render and navigator sync add nothing — whoever calls them', () => {
    const el = mount(null);
    const c = new Line(el, { animate: false, navigator: true }).setData(dateSeries);
    c.destroy();
    c.render();
    c._syncNavigator();
    c.setData(dateSeries);
    expect(el.children.length).toBe(0);
  });

  it('a fonts.ready render that lands after destroy is skipped', async () => {
    let ready;
    const fonts = document.fonts;
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise(r => { ready = r; }) } });
    try {
      const el = mount(null);
      const c = new Line(el, { animate: false, navigator: true }).setData(dateSeries);
      c.destroy();
      ready();
      await new Promise(r => setTimeout(r, 0));
      expect(el.children.length).toBe(0);
    } finally {
      Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    }
  });

  it('gives the page\'s own Graph details panel back, without the chart\'s styling', () => {
    const page = mount('page');
    const panel = document.createElement('aside');
    page.appendChild(panel);
    const g = new Graph(mount(null), { duration: 0, details: panel });
    g.destroy();
    expect(panel.parentNode).toBe(page);
    expect(panel.classList.contains('rc-graph-details')).toBe(false);
    expect(panel.hasAttribute('aria-live')).toBe(false);
  });

  it('a Map destroyed while its geometry loads neither renders nor reports the load', async () => {
    const geo = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } }] };
    for (const outcome of ['resolve', 'reject']) {
      let settle;
      vi.stubGlobal('fetch', () => new Promise((resolve, reject) => {
        settle = () => (outcome === 'resolve'
          ? resolve(new Response(JSON.stringify(geo), { headers: { 'Content-Type': 'application/json' } }))
          : reject(new Error('network down')));
      }));
      const el = mount(null);
      const m = new RareMap(el, { geoUrl: '/nowhere.json' });
      const render = vi.spyOn(RareMap.prototype, 'render');
      m.destroy();
      settle();
      await new Promise(r => setTimeout(r, 10));   // a late console.error would fail this test
      expect(render).not.toHaveBeenCalled();
      expect(el.children.length).toBe(0);
      render.mockRestore();
    }
  });

  it('a pinned map tooltip is released on destroy (no document listeners left)', () => {
    const m = new MapFlow(mount(null), { geoData: { type: 'FeatureCollection', features: [] } });
    const tip = m._tooltip;
    tip.pin(10, 10, 'x');
    const off = vi.spyOn(document, 'removeEventListener');
    m.destroy();
    expect(tip.isPinned).toBe(false);
    expect(off).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
  });

  it('a Graph in native full screen leaves it on destroy', () => {
    const el = mount(null);
    let fsEl = null;
    el.requestFullscreen = () => { fsEl = el; return Promise.resolve(); };
    const exit = vi.fn(() => { fsEl = null; return Promise.resolve(); });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsEl });
    document.exitFullscreen = exit;
    try {
      const g = new Graph(el, { duration: 0 });
      g.toggleFullscreen(true);
      g._syncFullscreen(true);                 // what the fullscreenchange event does
      g.destroy();
      expect(exit).toHaveBeenCalled();
      expect(el.classList.contains('rc-graph--fullscreen')).toBe(false);
    } finally {
      delete document.fullscreenElement;
      delete document.exitFullscreen;
    }
  });

  it('a Graph full-screen render scheduled for the next frame does nothing after destroy', async () => {
    const el = mount(null);
    el.className = 'card';
    const g = new Graph(el, { duration: 0, details: true });
    g.toggleFullscreen(true);                  // overlay fallback: schedules a render
    g.destroy();
    await new Promise(r => setTimeout(r, 50));
    expect(el.className).toBe('card');
    expect(el.style.height).toBe('');
  });

  it('Sankey.setData after destroy adds nothing to the container', () => {
    const el = mount(null);
    const s = new Sankey(el, {});
    s.destroy();
    s.setData({ nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', value: 1 }] });
    expect(el.children.length).toBe(0);
  });
});

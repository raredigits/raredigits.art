import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Chart } from '../assets/charts/src/core/Chart.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { mount, track } from './helpers.js';

// D-09: the svg root of every SVG chart class is made in one place,
// Chart._createSvg() — sized, placed in the card and given its accessible
// name (applySvgA11y) there; the axis charts take their plot group from
// Chart._createPlot(). Also the other shared pieces of the time charts on
// Chart: _plotToCard (TimeSeries' tooltip) and _warnLogSkips.

// A chart that draws nothing.
class Blank extends Chart {
  render() {}
}

const square = (x, y) => [[[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10], [x, y]]];
const geoData = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 0) } },
] };

// [class, make(el, options)]
const SVG_CLASSES = [
  ['Line', (el, o) => new Line(el, { animate: false, ...o })],
  ['DualAxes', (el, o) => new DualAxes(el, { animate: false, ...o })],
  ['Bar', (el, o) => new Bar(el, { animate: false, ...o })],
  ['HierarchicalBar', (el, o) => new HierarchicalBar(el, { animate: false, ...o })],
  ['Donut', (el, o) => new Donut(el, { animate: false, ...o })],
  ['Pie', (el, o) => new Pie(el, { animate: false, ...o })],
  ['Gauge', (el, o) => new Gauge(el, { animate: false, ...o })],
  ['TimeSeries', (el, o) => new TimeSeries(el, o)],
  ['Map', (el, o) => new RareMap(el, { projection: 'mercator', geoData, ...o })],
  ['MapFlow', (el, o) => new MapFlow(el, { projection: 'mercator', geoData, ...o })],
  ['Graph', (el, o) => new Graph(el, { duration: 0, ...o })],
  ['Sankey', (el, o) => new Sankey(el, { animate: false, ...o })],
];

afterEach(() => vi.restoreAllMocks());

describe('every SVG chart class creates its svg through Chart._createSvg() (D-09)', () => {
  it.each(SVG_CLASSES)('%s: one call, the root it returns, named', (_name, make) => {
    const spy = vi.spyOn(Chart.prototype, '_createSvg');
    const c = track(make(mount(null), { ariaLabel: 'Named chart', source: 'Desk' }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.contexts[0]).toBe(c);
    expect(spy.mock.results[0].value).toBe(c.svg);
    const svg = c.svg.node();
    expect(svg.parentNode).toBe(c.container);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Named chart');
  });

  // The rule in the source: no class makes or names a root of its own.
  // Overview, the navigator strip, is not a Chart and stays outside it.
  it('no chart source creates an svg root or calls applySvgA11y itself', () => {
    const root = resolve(process.cwd(), 'assets/charts/src');
    const files = readdirSync(root, { recursive: true }).filter(f => f.endsWith('.js'));
    expect(files).toContain('charts/Line.js');
    const own = /(?:append|insert|create)\(\s*['"]svg['"]|createElementNS\([^)]*['"]svg['"]|applySvgA11y\(/;
    const offenders = files
      .filter(f => !['core/Chart.js', 'core/renderHelpers.js', 'charts/Overview.js'].includes(f))
      .filter(f => own.test(readFileSync(join(root, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('Chart._createSvg', () => {
  const attrs = svg => svg.node().getAttributeNames();

  it("size 'fill' (default): the card takes options.height, the svg fills it", () => {
    const c = track(new Blank(mount(null), { height: 260 }));
    const svg = c._createSvg();
    expect(svg).toBe(c.svg);
    expect(c.container.style.height).toBe('260px');
    expect(attrs(svg)).toEqual(['width', 'height', 'role', 'aria-label']);
    expect([svg.attr('width'), svg.attr('height')]).toEqual(['100%', '100%']);
  });

  it("size 'width': width only, the card's height untouched", () => {
    const c = track(new Blank(mount(null), { height: 260 }));
    const svg = c._createSvg({ size: 'width', style: { display: 'block' } });
    expect(c.container.style.height).toBe('');
    expect(attrs(svg)).toEqual(['width', 'style', 'role', 'aria-label']);
    expect(svg.attr('width')).toBe('100%');
    expect(svg.style('display')).toBe('block');
  });

  it("size 'none': no size; class first, styles in the order given", () => {
    const c = track(new Blank(mount(null), { height: 260 }));
    const svg = c._createSvg({ size: 'none', className: 'rc-x', style: { cursor: 'grab', overflow: 'hidden' } });
    expect(c.container.style.height).toBe('');
    expect(attrs(svg)).toEqual(['class', 'style', 'role', 'aria-label']);
    expect(svg.attr('class')).toBe('rc-x');
    expect(svg.attr('style')).toBe('cursor: grab; overflow: hidden;');
  });

  it('the class comes first, ahead of the size', () => {
    const c = track(new Blank(mount(null), { height: 260 }));
    expect(attrs(c._createSvg({ className: 'rc-x' }))).toEqual(['class', 'width', 'height', 'role', 'aria-label']);
  });

  it('is named from ariaLabel, else title and subtitle, else "Chart"', () => {
    const named = o => track(new Blank(mount(null), o))._createSvg().attr('aria-label');
    expect(named({ title: 'Revenue', subtitle: 'USD' })).toBe('Revenue — USD');
    expect(named({ title: 'Revenue', ariaLabel: 'Own' })).toBe('Own');
    expect(named({})).toBe('Chart');
  });

  it('goes last in the card — after the footer — unless beforeFooter', () => {
    const c = track(new Blank(mount(null), { source: 'Desk' }));
    const footer = c.container.querySelector('.rc-chart-footer');
    expect(c._createSvg().node()).toBe(c.container.lastChild);
    const early = c._createSvg({ beforeFooter: true }).node();
    expect(early.nextSibling).toBe(footer);
  });

  it('beforeFooter without a footer (or one moved out) goes last', () => {
    const c = track(new Blank(mount(null), {}));
    c.container.appendChild(document.createElement('p'));
    expect(c._createSvg({ beforeFooter: true }).node()).toBe(c.container.lastChild);

    const d = track(new Blank(mount(null), { source: 'Desk' }));
    document.body.appendChild(d._footerEl);   // no longer in the card
    d.container.appendChild(document.createElement('p'));
    expect(d._createSvg({ beforeFooter: true }).node()).toBe(d.container.lastChild);
  });
});

describe('Chart._createPlot', () => {
  it('the svg filling the card and a group moved in by the margin', () => {
    const c = track(new Blank(mount(null), { height: 300, margin: { top: 7, left: 11, right: 3, bottom: 2 } }));
    const g = c._createPlot();
    expect(g).toBe(c.g);
    expect(g.node().parentNode).toBe(c.svg.node());
    expect(g.attr('transform')).toBe('translate(11,7)');
    expect(c.svg.attr('height')).toBe('100%');
    expect(c.container.style.height).toBe('300px');
  });

  it('a margin left out is 0', () => {
    const c = track(new Blank(mount(null), {}));
    expect(c._createPlot().attr('transform')).toBe('translate(0,0)');
  });
});

describe('Chart._plotToCard', () => {
  it('maps a plot point through the margin and the svg offset in the card', () => {
    const c = track(new Blank(mount(null), { margin: { top: 5, left: 9 } }));
    c._createPlot();
    c.svg.node().getBoundingClientRect = () => ({ left: 130, top: 260 });
    c.container.getBoundingClientRect = () => ({ left: 100, top: 200 });
    Object.defineProperty(c.container, 'clientLeft', { configurable: true, get: () => 2 });
    Object.defineProperty(c.container, 'clientTop', { configurable: true, get: () => 3 });
    // 40 + 9 + (130 − 100 − 2), 20 + 5 + (260 − 200 − 3)
    expect(c._plotToCard(40, 20)).toEqual([77, 82]);
    expect(c._plotToCard(0, 0)).toEqual([37, 62]);
  });
});

describe('Chart._warnLogSkips', () => {
  it('warns once until the flag is cleared (setData), naming the class and the scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = track(new Blank(mount(null), {}));
    c._warnLogSkips(0, 'Line');
    expect(warn).not.toHaveBeenCalled();
    c._warnLogSkips(1, 'Line');
    c._warnLogSkips(5, 'Line');
    expect(warn.mock.calls).toEqual([['RareCharts.Line: 1 value ≤ 0 skipped on the log scale']]);
    c._warnedNonPositive = false;
    c._warnLogSkips(3, 'DualAxes', 'axis');
    expect(warn.mock.calls[1]).toEqual(['RareCharts.DualAxes: 3 values ≤ 0 skipped on the log axis']);
  });

  it('nothing skipped keeps the warning for later', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = track(new Blank(mount(null), {}));
    c._warnLogSkips(0, 'TimeSeries');
    expect(c._warnedNonPositive).toBeFalsy();
    c._warnLogSkips(2, 'TimeSeries');
    expect(warn).toHaveBeenCalledWith('RareCharts.TimeSeries: 2 values ≤ 0 skipped on the log scale');
  });

  it.each([
    ['Line', el => new Line(el, { animate: false, yScale: 'log' }), rows => [{ name: 'A', values: rows }], 'scale'],
    ['DualAxes', el => new DualAxes(el, { animate: false, y1Scale: 'log' }), rows => [{ name: 'A', values: rows }], 'axis'],
    ['TimeSeries', el => new TimeSeries(el, { yScale: 'log' }), rows => rows, 'scale'],
  ])('%s: once per setData, counting the values in view', (name, make, shape, where) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = [1, 0, 5, -2, 3].map((value, i) => ({ date: new Date(2026, 0, i + 1), value }));
    const c = track(make(mount(null)));
    c.setData(shape(rows));
    c.render();
    expect(warn.mock.calls).toEqual([[`RareCharts.${name}: 2 values ≤ 0 skipped on the log ${where}`]]);
    c.setData(shape(rows));
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

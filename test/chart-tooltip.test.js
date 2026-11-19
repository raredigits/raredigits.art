import { describe, it, expect, vi } from 'vitest';
import { Chart } from '../assets/charts/src/core/Chart.js';
import { Tooltip } from '../assets/charts/src/core/Tooltip.js';
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
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { mount, track, tooltipOf } from './helpers.js';

// D-02: the tooltip's life. A chart has one tooltip, made by the base Chart's
// `tooltip` getter on first use (a chart that never asks makes none) and
// taken down by Chart.destroy() for every class — the element, and when it
// is pinned, its document listeners. The classes that show one ask for it
// in their constructor, so the element sits in the card from the start, as
// it always has.

const tick = () => new Promise(r => setTimeout(r, 0));

// A chart that draws nothing and never asks for a tooltip.
class Blank extends Chart {
  render() {}
}

// From here on, every listener added to the document runs through a spy
// (removeEventListener finds the spy by the original function).
function spyDocumentListeners() {
  const spies = [];
  const byFn = new Map();
  const add = document.addEventListener.bind(document);
  const remove = document.removeEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((type, fn, opts) => {
    if (!byFn.has(fn)) {
      const spy = vi.fn(function (event) { return fn.call(this, event); });
      byFn.set(fn, spy);
      spies.push(spy);
    }
    add(type, byFn.get(fn), opts);
  });
  vi.spyOn(document, 'removeEventListener').mockImplementation((type, fn, opts) => remove(type, byFn.get(fn) ?? fn, opts));
  return spies;
}

// What a click elsewhere and Escape send to the document.
function pressOutside() {
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('Chart.tooltip: made on first use (D-02)', () => {
  it('a chart that never asks for one makes none', () => {
    const c = track(new Blank(mount(null), { title: 'T', source: 'S' }));
    expect(c.container.querySelector('.rc-tooltip')).toBeNull();
  });

  it('the first use makes it in the card, with the chart theme; later uses get the same one', () => {
    const c = track(new Blank(mount(null), { theme: { tooltip: { bg: '#123456' } } }));
    const t = c.tooltip;
    expect(t).toBeInstanceOf(Tooltip);
    expect(c.tooltip).toBe(t);
    expect(c.container.querySelectorAll('.rc-tooltip')).toHaveLength(1);
    expect(t.el.parentNode).toBe(c.container);
    expect(c.container.style.getPropertyValue('--rc-tooltip-bg')).toBe('#123456');   // the card's (core/paint.js)
    expect(t.el.style.getPropertyValue('--rc-tooltip-bg')).toBe('');
  });

  it('destroy() removes it; after that there is none, and asking adds nothing to the card', () => {
    const c = new Blank(mount(null));
    const el = c.tooltip.el;
    c.destroy();
    expect(el.isConnected).toBe(false);
    expect(c.tooltip).toBeNull();
    expect(c.container.children).toHaveLength(0);
  });

  it('a chart destroyed before it made one makes none after', () => {
    const c = new Blank(mount(null));
    c.destroy();
    expect(c.tooltip).toBeNull();
    expect(c.container.children).toHaveLength(0);
  });

  it('a pinned one: destroy() releases it — onClose runs once, its document listeners never again', async () => {
    const spies = spyDocumentListeners();
    const c = new Blank(mount(null));
    const onClose = vi.fn();
    c.tooltip.pin(10, 10, 'x', { onClose });
    await tick();                              // the pin listens from the next task
    expect(spies.length).toBeGreaterThan(0);
    c.destroy();
    expect(onClose).toHaveBeenCalledTimes(1);
    pressOutside();
    spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Every class ─────────────────────────────────────────────────────────────

const days = [{ date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 3 }, { date: '2026-03-01', value: 2 }];
const rows = [{ label: 'A', value: 4 }, { label: 'B', value: 7 }];
const square = (x, y) => [[[x, y], [x, y + 10], [x + 10, y + 10], [x + 10, y], [x, y]]];
const geoData = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 0) } },
  { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: square(20, 0) } },
] };
const network = {
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
  links: [{ source: 'a', target: 'b', value: 2 }, { source: 'b', target: 'c', value: 1 }],
};

// [class, make(el), its data]
const CLASSES = [
  ['Line', el => new Line(el, { animate: false }), [{ name: 'A', values: days }]],
  ['DualAxes', el => new DualAxes(el, { animate: false }),
    [{ name: 'V', axis: 'y1', type: 'bar', values: days }, { name: 'P', axis: 'y2', values: days }]],
  ['Bar', el => new Bar(el, { animate: false }), rows],
  ['HierarchicalBar', el => new HierarchicalBar(el, { animate: false }), { label: 'T', children: rows }],
  ['Donut', el => new Donut(el, { animate: false }), rows],
  ['Pie', el => new Pie(el, { animate: false }), rows],
  ['Gauge', el => new Gauge(el, { animate: false }), 40],
  ['TimeSeries', el => new TimeSeries(el, {}), days],
  ['Map', el => new RareMap(el, { projection: 'mercator', geoData }), [{ id: 'AA', value: 5 }]],
  ['MapFlow', el => new MapFlow(el, { projection: 'mercator', geoData }),
    { nodes: [{ id: 'x', coords: [2, 2] }, { id: 'y', coords: [25, 5] }], links: [{ from: 'x', to: 'y' }] }],
  ['Graph', el => new Graph(el, { duration: 0 }), network],
  ['Sankey', el => new Sankey(el, { animate: false }), network],
];

describe('every chart class: one tooltip, taken down by destroy() (D-02)', () => {
  it.each(CLASSES)('%s: the tooltip element is in the card from construction, one, as before', (_name, make) => {
    const c = track(make(mount(null)));
    const tips = c.container.querySelectorAll('.rc-tooltip');
    expect(tips).toHaveLength(1);
    expect(tips[0].parentNode).toBe(c.container);
    expect(c.tooltip.el).toBe(tips[0]);
  });

  it.each(CLASSES)('%s: destroy() leaves no .rc-tooltip and no document listener that fires', async (_name, make, data) => {
    const spies = spyDocumentListeners();
    const c = make(mount(null));
    await c.setData(data).whenReady();
    c.tooltip.show(10, 10, 'hover');
    const onClose = vi.fn();
    c.tooltip.pin(10, 10, 'pinned', { onClose });
    await tick();
    const tip = tooltipOf(c);
    expect(tip.classList.contains('is-pinned')).toBe(true);
    expect(spies.length).toBeGreaterThan(0);

    c.destroy();
    expect(tip.isConnected).toBe(false);
    expect(c.container.querySelector('.rc-tooltip')).toBeNull();
    expect(c.tooltip).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    pressOutside();
    spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
  });

  it('MultiChart makes none of its own; each panel has one, and destroy() takes them all', () => {
    const mc = new MultiChart(mount(null), { animate: false, charts: [
      { type: 'Bar', data: rows },
      { type: 'Line', data: [{ name: 'A', values: days }] },
    ] });
    expect(mc.container.querySelectorAll(':scope > .rc-tooltip')).toHaveLength(0);
    expect(mc.charts.map(c => c.container.querySelectorAll(':scope > .rc-tooltip').length)).toEqual([1, 1]);
    mc.destroy();
    expect(mc.container.querySelector('.rc-tooltip')).toBeNull();
  });
});

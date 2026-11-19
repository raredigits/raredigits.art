// Entry animations survive the renders that follow setData (C-16, C-25).
// document.fonts.ready and the first ResizeObserver callback both render
// again right after setData; a resize may come later. Such a render must
// carry the entry on — from where each mark stands, to the new geometry,
// on the rest of the same curve — not restart it and not cut it to the end.
//
// The clock is d3's: performance.now is replaced by a hand-moved time and
// d3.timerFlush() runs the transitions that are due, so every sample below is
// exact. Linear easing keeps the expected values plain (half the time → half
// the way).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { continueEase, ENTRY_DURATION } from '../assets/charts/src/core/entryMotion.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mount, track, graphCentres } from './helpers.js';

const D = 600;                                // duration, ms
const motion = { duration: D, ease: 'linear' };

let base;
let clock;
const settle = () => new Promise(r => setTimeout(r, 30));   // d3 drops its cached frame time
// Move d3's clock to `ms` after the start and run every transition due by then.
const at = async (ms) => { clock = base + ms; await settle(); d3.timerFlush(); };

beforeEach(async () => {
  base = clock = performance.now();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  await settle();
});

const attr  = (c, sel, name) => [...c.container.querySelectorAll(sel)].map(n => n.getAttribute(name));
const nums  = (c, sel, name) => attr(c, sel, name).map(Number);
const close = (a, b, eps = 1e-6) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= eps * Math.max(1, Math.abs(b[i])));
const resize = (c, width) => {
  Object.defineProperty(c.container, 'clientWidth', { configurable: true, get: () => width });
  c.render();
};
const numbersIn = s => (s.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);

describe('continueEase', () => {
  it('continues the curve: a value made ease(p) of its way follows ease from there', () => {
    const ease = d3.easeCubicOut;
    const p = 0.3, e0 = ease(p);
    const rest = continueEase(ease, p);
    for (const s of [0, 0.25, 0.5, 1]) {
      expect(e0 + (1 - e0) * rest(s)).toBeCloseTo(ease(p + s * (1 - p)), 12);
    }
  });
});

describe('Bar: the growth is seen and survives re-renders (C-16)', () => {
  const rows = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];

  it('vertical: a render right after setData does not finalise; one mid-way carries on', async () => {
    const c = track(new Bar(mount(null), motion)).setData(rows);
    const h = () => nums(c, 'rect.rc-bar', 'height');
    c.render();                                 // fonts.ready
    expect(h()).toEqual([0, 0]);                // was: the end state at once
    await at(D / 2);
    const end = h().map(v => v * 2);
    expect(end[0]).toBeGreaterThan(0);
    c.render();                                 // resize, same size
    expect(close(h(), end.map(v => v / 2))).toBe(true);
    await at(D * 0.75);
    expect(close(h(), end.map(v => v * 0.75))).toBe(true);
    await at(D + 50);
    expect(close(h(), end)).toBe(true);
    c.setData(rows.map(r => ({ ...r, value: r.value * 2 })));   // after the entry: no animation
    expect(h()[0]).toBeGreaterThan(end[0] * 0.99);
  });

  it('horizontal: a resize mid-way retargets the widths to the new scale', async () => {
    const c = track(new Bar(mount(null), { ...motion, orientation: 'horizontal' })).setData(rows);
    const w = () => nums(c, 'rect.rc-bar', 'width');
    await at(D / 2);
    const half = w();
    resize(c, 400);
    expect(close(w(), half)).toBe(true);       // no jump at the render
    await at(D + 50);
    const ref = track(new Bar(mount(null, { width: 400 }), { animate: false, orientation: 'horizontal' })).setData(rows);
    expect(close(w(), nums(ref, 'rect.rc-bar', 'width'))).toBe(true);
  });

  it('stagger: a bar that has not started yet starts on time after a re-render', async () => {
    const c = track(new Bar(mount(null), { ...motion, stagger: 300 })).setData(rows);
    const h = () => nums(c, 'rect.rc-bar', 'height');
    await at(150);
    c.render();
    await at(450);                              // A: 450/600, B: 150/600
    const [a, b] = h();
    await at(1000);
    const [A, B] = h();
    expect(a / A).toBeCloseTo(0.75, 6);
    expect(b / B).toBeCloseTo(0.25, 6);
  });

  it('stacked: segments fade in once; a re-render mid-way does not restart the fade', async () => {
    const c = track(new Bar(mount(null), motion)).setData([{ name: 's', values: rows }]);
    const op = () => nums(c, 'rect.rc-bar-seg', 'opacity');
    await at(D / 2);
    expect(close(op(), [0.5, 0.5])).toBe(true);
    c.render();
    expect(close(op(), [0.5, 0.5])).toBe(true);          // was: back to 0
    await at(D * 0.75);
    expect(close(op(), [0.75, 0.75])).toBe(true);
  });
});

describe('Bar value labels never jump to stale positions (C-25)', () => {
  const rows = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];

  it('a resize during the entry: the labels end where a fresh chart puts them', async () => {
    const o = { orientation: 'horizontal', showValues: true };
    const c = track(new Bar(mount(null), { ...o, ...motion })).setData(rows);
    await at(100);
    resize(c, 400);
    await at(D + 100);                          // past the old transition ends
    await new Promise(r => setTimeout(r, D + 50));   // and past the old fallback timer
    const ref = track(new Bar(mount(null, { width: 400 }), { ...o, animate: false })).setData(rows);
    expect(nums(c, '.rc-bar-value', 'x')).toEqual(nums(ref, '.rc-bar-value', 'x'));
    expect(attr(c, '.rc-bar-value', 'text-anchor')).toEqual(attr(ref, '.rc-bar-value', 'text-anchor'));
    expect(close(nums(c, '.rc-bar-value', 'opacity'), [1, 1])).toBe(true);
  });

  it('labels fade in at their place along with the bars', async () => {
    const c = track(new Bar(mount(null), { orientation: 'horizontal', showValues: true, ...motion })).setData(rows);
    const ref = track(new Bar(mount(null), { orientation: 'horizontal', showValues: true, animate: false })).setData(rows);
    expect(close(nums(c, '.rc-bar-value', 'opacity'), [0, 0])).toBe(true);
    expect(nums(c, '.rc-bar-value', 'x')).toEqual(nums(ref, '.rc-bar-value', 'x'));
    await at(D / 2);
    expect(close(nums(c, '.rc-bar-value', 'opacity'), [0.5, 0.5])).toBe(true);
  });
});

describe('Line and DualAxes: the draw-in carries on (C-16)', () => {
  let length;
  beforeEach(() => {
    length = 200;
    vi.spyOn(SVGElement.prototype, 'getTotalLength').mockImplementation(() => length);
  });
  const values = [1, 3, 2].map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));

  it.each([
    ['Line',     o => new Line(mount(null), o),     [{ name: 's', values }],                    'path.rc-line'],
    ['DualAxes', o => new DualAxes(mount(null), o), [{ name: 's', type: 'line', values }],      'path.rc-dual-line'],
  ])('%s: a render mid-way keeps the share drawn, on the new length', async (_n, make, data, sel) => {
    const c = track(make(motion)).setData(data);
    c.render();                                 // fonts.ready
    expect(attr(c, sel, 'stroke-dashoffset')).toEqual(['200']);
    await at(D / 2);
    expect(close(nums(c, sel, 'stroke-dashoffset'), [100])).toBe(true);
    length = 400;                               // the path got longer (resize)
    c.render();
    expect(attr(c, sel, 'stroke-dasharray')).toEqual(['400 400']);
    expect(close(nums(c, sel, 'stroke-dashoffset'), [200])).toBe(true);   // still half drawn — was: 400, from the start
    await at(D * 0.75);
    expect(close(nums(c, sel, 'stroke-dashoffset'), [100])).toBe(true);
    await at(D + 50);
    expect(attr(c, sel, 'stroke-dasharray')).toEqual([null]);    // whole, attributes cleared
    c.render();
    expect(attr(c, sel, 'stroke-dasharray')).toEqual([null]);    // once per instance
  });

  it('a dashed line or a band: the whole drawing sweeps in, left to right, the solid line with it', async () => {
    const band = values.map(v => ({ date: v.date, lower: v.value - 1, upper: v.value + 1 }));
    const c = track(new Line(mount(null), motion)).setData([
      { name: 'range', type: 'band', values: band },
      { name: 'actual', values },
      { name: 'plan', strokeDash: '5,4', values },
    ]);
    const lines = c.container.querySelector('.rc-lines');
    const clipId = () => (lines.getAttribute('clip-path') ?? '').replace(/^url\(#|\)$/g, '');
    const width = () => +c.container.querySelector(`#${clipId()} rect`).getAttribute('width');
    expect(clipId()).not.toBe('');
    expect(c.container.querySelector('.rc-bands').getAttribute('clip-path')).toBe(lines.getAttribute('clip-path'));
    expect(attr(c, 'path.rc-line', 'stroke-dashoffset')).toEqual([null, null]);   // no draw-in of its own
    const start = width();
    await at(D / 2);
    c.render();                                 // a render mid-way keeps the share open
    const half = width();
    expect(half).toBeGreaterThan(0);
    await at(D + 50);
    expect(lines.getAttribute('clip-path')).toBeNull();
    expect(c.container.querySelector('defs[id$="-sweep-defs"]')).toBeNull();
    expect(start).toBe(0);                      // opened from nothing
  });

  it('animate: false draws the line whole', () => {
    const c = track(new Line(mount(null), { animate: false })).setData(values);
    expect(attr(c, 'path.rc-line', 'stroke-dasharray')).toEqual([null]);
  });

  it('DualAxes bars grow on the same timeline', async () => {
    const c = track(new DualAxes(mount(null), motion)).setData([
      { name: 'b', type: 'bar', values }, { name: 's', type: 'line', values },
    ]);
    const h = () => nums(c, 'rect.rc-dual-bar', 'height');
    await at(D / 2);
    const half = h();
    c.render();
    expect(close(h(), half)).toBe(true);
    await at(D * 0.75);
    await at(D + 50);
    const end = h();
    expect(close(half, end.map(v => v / 2))).toBe(true);
  });
});

describe('Donut, Gauge, HierarchicalBar: the entry carries on (C-16)', () => {
  const slices = [{ label: 'a', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }];
  const paths = (c, sel) => attr(c, sel, 'd').map(numbersIn);
  const sameShape = (a, b) => a.length === b.length && a.every((p, i) => close(p, b[i], 1e-6));

  it('Donut: a render mid-sweep follows the uninterrupted sweep', async () => {
    const a = track(new Donut(mount(null), motion)).setData(slices);
    const b = track(new Donut(mount(null), motion)).setData(slices);
    await at(D / 2);
    a.render();
    await at(D * 0.75);
    expect(sameShape(paths(a, '.rc-donut-slice'), paths(b, '.rc-donut-slice'))).toBe(true);   // was: swept again from zero
    await at(D + 50);
    expect(sameShape(paths(a, '.rc-donut-slice'), paths(b, '.rc-donut-slice'))).toBe(true);
  });

  it('Donut: each drill sweeps again', async () => {
    const tree = { label: 'root', children: [{ label: 'x', value: 2, children: [{ label: 'x1', value: 1 }, { label: 'x2', value: 1 }] }, { label: 'y', value: 1 }] };
    const c = track(new Donut(mount(null), motion)).setData(tree);
    await at(D + 50);
    const before = c.container.querySelectorAll('.rc-donut-slice').length;
    c.drillTo('x');
    await at(D + 50 + D / 2);
    const mid = paths(c, '.rc-donut-slice');
    await at(2 * D + 100);
    expect(before).toBe(2);
    expect(sameShape(mid, paths(c, '.rc-donut-slice'))).toBe(false);   // still sweeping at mid-drill
  });

  it('Gauge: a render mid-sweep follows the uninterrupted sweep (fill and needle)', async () => {
    const a = track(new Gauge(mount(null), { ...motion, needle: true })).setData(40);
    const b = track(new Gauge(mount(null), { ...motion, needle: true })).setData(40);
    await at(D / 2);
    a.render();
    await at(D * 0.75);
    expect(sameShape(paths(a, '.rc-gauge-fill'), paths(b, '.rc-gauge-fill'))).toBe(true);
    // the same angle up to rounding (the resumed sweep runs on a rescaled curve)
    expect(close(numbersIn(attr(a, '.rc-gauge-needle-pointer', 'transform')[0]), numbersIn(attr(b, '.rc-gauge-needle-pointer', 'transform')[0]))).toBe(true);
  });

  it('Gauge: a new value mid-sweep is reached from where the needle stands', async () => {
    const c = track(new Gauge(mount(null), { ...motion, needle: true })).setData(40);
    const deg = () => numbersIn(attr(c, '.rc-gauge-needle-pointer', 'transform')[0])[0];
    await at(D / 2);
    expect(deg()).toBeCloseTo(-81, 6);          // −135° + ½ · 40% · 270°
    c.setData(80);
    expect(deg()).toBeCloseTo(-81, 6);          // was: back to −135°
    await at(D * 0.75);
    expect(deg()).toBeCloseTo(0, 6);            // halfway from −81° to +81° in the time left
    await at(D + 50);
    expect(deg()).toBeCloseTo(81, 6);
  });

  it('HierarchicalBar: the growth is seen, carries on, and replays per setData', async () => {
    const tree = { label: 'All', value: 10, children: [{ label: 'a', value: 6 }, { label: 'b', value: 4 }] };
    const c = track(new HierarchicalBar(mount(null), motion)).setData(tree);
    const w = () => nums(c, '.rc-hbar-bar', 'width');
    c.render();                                 // fonts.ready
    expect(w().every(v => v === 0)).toBe(true); // was: full width at once
    await at(D / 2);
    const half = w();
    c.render();
    expect(close(w(), half)).toBe(true);
    await at(D + 50);
    expect(close(w(), half.map(v => v * 2))).toBe(true);
    c.setData(tree);                            // a new dataset grows again
    expect(w().every(v => v === 0)).toBe(true);
  });
});

describe('Sankey: the band fade carries on (C-16)', () => {
  const flows = { links: [{ source: 'a', target: 'b', value: 3 }, { source: 'a', target: 'c', value: 2 }] };
  const op = c => nums(c, '.rc-sankey-link', 'stroke-opacity');
  const all = (vals, v) => vals.length > 0 && vals.every(x => Math.abs(x - v) < 1e-9);

  it('a render right after setData does not cut the fade; one mid-way carries on; each setData fades again', async () => {
    const c = track(new Sankey(mount(null), { ...motion, orientation: 'horizontal', linkOpacity: 0.4 })).setData(flows);
    c.render();                                 // fonts.ready
    expect(all(op(c), 0)).toBe(true);           // was: 0.4 at once
    await at(D / 2);
    expect(all(op(c), 0.2)).toBe(true);
    c.render();                                 // resize, same size
    expect(all(op(c), 0.2)).toBe(true);         // no jump, no restart
    await at(D * 0.75);
    expect(all(op(c), 0.3)).toBe(true);         // the same timeline, not re-timed
    await at(D + 50);
    expect(all(op(c), 0.4)).toBe(true);
    c.render();                                 // after the fade: the end state
    expect(all(op(c), 0.4)).toBe(true);
    c.setData(flows);                           // a new dataset fades again
    expect(all(op(c), 0)).toBe(true);
  });

  it('a hover mid-fade keeps its highlight to the end (the fade stops)', async () => {
    const c = track(new Sankey(mount(null), { ...motion, orientation: 'horizontal', linkOpacity: 0.4 })).setData(flows);
    await at(D / 2);
    c.container.querySelector('.rc-sankey-link').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const lit = op(c);
    await at(D + 50);
    expect(op(c)).toEqual(lit);
  });

  it('animate: false draws the bands at rest', () => {
    const c = track(new Sankey(mount(null), { animate: false, orientation: 'horizontal' })).setData(flows);
    expect(all(op(c), 0.45)).toBe(true);
  });
});

// drawLinesIn with timing null (no entry: TimeSeries on every zoom, pan and
// brush step) leaves the line whole and never measures it — getTotalLength is
// a layout read that cost a quarter of a 5000-point redraw (RC-080 review).
describe('drawLinesIn without an entry', () => {
  it('does not measure the path, and clears any draw-in dashes', async () => {
    const { drawLinesIn } = await import('../assets/charts/src/core/entryMotion.js');
    const svg = d3.create('svg');
    const path = svg.append('path').attr('stroke-dasharray', '10 10').attr('stroke-dashoffset', 5);
    const measure = vi.fn(() => 100);
    path.node().getTotalLength = measure;
    drawLinesIn(path, null);
    expect(measure).not.toHaveBeenCalled();
    expect(path.attr('stroke-dasharray')).toBeNull();
    expect(path.attr('stroke-dashoffset')).toBeNull();
    drawLinesIn(path, { eased: 0.5, delay: 0, duration: 100, ease: d3.easeLinear });
    expect(measure).toHaveBeenCalledTimes(1);                 // the entry still measures
    expect(path.attr('stroke-dasharray')).toBe('100 100');
  });
});

// K-08: one entry duration for every chart, 650 ms (ENTRY_DURATION in
// core/entryMotion.js); Graph's ties and nodes move for 500 ms after a click
// (GRAPH_TRANSITION), and its first render does not move. No `duration`
// option, `animate` at its default, no reduced-motion preference (jsdom has
// no matchMedia). The clock stands still, so every transition the render
// scheduled is still on its mark (node.__transition) with its duration.
describe('K-08: one entry duration, 650 ms; Graph moves for 500 ms after a click', () => {
  const durations = (root, sel) => [...root.querySelectorAll(sel)]
    .flatMap(n => Object.values(n.__transition ?? {}).map(s => s.duration));
  const cats   = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];
  const dated  = [1, 3, 2].map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));
  const tree   = { label: 'All', value: 10, children: [{ label: 'a', value: 6 }, { label: 'b', value: 4 }] };
  const flows  = { links: [{ source: 'a', target: 'b', value: 3 }, { source: 'a', target: 'c', value: 2 }] };

  it('ENTRY_DURATION is 650', () => {
    expect(ENTRY_DURATION).toBe(650);
  });

  it.each([
    ['Bar',                 () => new Bar(mount(null)).setData(cats),                                     'rect.rc-bar'],
    ['Bar, horizontal',     () => new Bar(mount(null), { orientation: 'horizontal' }).setData(cats),      'rect.rc-bar'],
    ['Bar, stacked',        () => new Bar(mount(null)).setData([{ name: 's', values: cats }]),            'rect.rc-bar-seg'],
    ['HierarchicalBar',     () => new HierarchicalBar(mount(null)).setData(tree),                         '.rc-hbar-bar'],
    ['Sankey',              () => new Sankey(mount(null), { orientation: 'horizontal' }).setData(flows),  '.rc-sankey-link'],
    ['Gauge',               () => new Gauge(mount(null), { needle: true }).setData(40),                   '.rc-gauge-fill, .rc-gauge-needle-pointer'],
    ['Line',                () => new Line(mount(null)).setData(dated),                                   'path.rc-line'],
    ['DualAxes',            () => new DualAxes(mount(null)).setData([
                              { name: 'b', type: 'bar', values: dated }, { name: 's', type: 'line', values: dated },
                            ]),                                                                           'rect.rc-dual-bar, path.rc-dual-line'],
    ['Donut',               () => new Donut(mount(null)).setData(cats),                                   '.rc-donut-slice'],
    ['Pie',                 () => new Pie(mount(null)).setData(cats),                                     '.rc-donut-slice'],
  ])('%s: the entry runs 650 ms', (_name, make, sel) => {
    vi.spyOn(SVGElement.prototype, 'getTotalLength').mockImplementation(() => 200);   // a line to draw in
    const c = track(make());
    const d = durations(c.container, sel);
    expect(d.length).toBeGreaterThan(0);
    expect(d.every(v => v === 650)).toBe(true);
  });

  it('Graph: the first render does not move; a click moves ties and nodes for 500 ms', async () => {
    // A node's move tweens its transform, which d3 parses through the SVG
    // transform list when the move starts; jsdom has none, so this test
    // lends every element an empty one.
    const own = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'transform');
    Object.defineProperty(SVGElement.prototype, 'transform', {
      configurable: true, get: () => ({ baseVal: { consolidate: () => null } }),
    });
    const net = {
      nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, label: id.toUpperCase() })),
      links: [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }, { source: 'b', target: 'd' }],
    };
    const marks = '.rc-graph-node, .rc-graph-link';
    const host = mount();
    try {
      const g = track(new Graph(host, { dataSource: memorySource(net), depth: 1 }));
      await g.focus('a').whenReady();
      expect(durations(host, marks)).toEqual([]);
      [...host.querySelectorAll('.rc-graph-node')].find(n => n.__data__.id === 'b')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await g.whenReady();
      expect(graphCentres(host)).toEqual(['B']);
      const d = durations(host, marks);
      expect(d.length).toBeGreaterThan(0);
      expect(d.every(v => v === 500)).toBe(true);
    } finally {
      d3.selectAll(host.querySelectorAll(marks)).interrupt();
      if (own) Object.defineProperty(SVGElement.prototype, 'transform', own);
      else delete SVGElement.prototype.transform;
    }
  });

  it('no class keeps a number of its own as the default duration', () => {
    const root = join(process.cwd(), 'assets/charts/src');
    const files = readdirSync(root, { recursive: true }).filter(f => f.endsWith('.js'));
    expect(files).toContain('charts/Gauge.js');
    const own = /duration\s*\?\?\s*\d/;
    const offenders = files.flatMap(f => readFileSync(join(root, f), 'utf8').split('\n')
      .flatMap((line, i) => own.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : []));
    expect(offenders).toEqual([]);
  });
});

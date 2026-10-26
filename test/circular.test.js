import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { mount, track } from './helpers.js';

// The circular charts, Donut and Gauge: edge data and parsing, fit (outer-label
// spreading on Donut, the shallow-arc text reserve on Gauge), the needle, and
// updates across setData — Donut slice colours and identity (C-18), legend
// colours by slice label (K-22), Gauge min/max overrides that hold for one
// setData only (C-21).

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const labelSeries = [
  { label: 'A', value: 4 },
  { label: 'B', value: 7 },
];

// ─── Edge data and parsing ────────────────────────────────────────────────────

describe('Donut — edge data', () => {
  it('renders an empty dataset without throwing', () => {
    expect(() => new Donut('#chart', { title: 'D', height: 300 }).setData([])).not.toThrow();
  });
  it('renders an all-zero dataset without throwing (total = 0)', () => {
    expect(() => new Donut('#chart', { title: 'D', height: 300 })
      .setData([{ label: 'A', value: 0 }, { label: 'B', value: 0 }])).not.toThrow();
  });
  it('renders one slice per data point', () => {
    new Donut('#chart', { title: 'D', height: 300 }).setData(labelSeries);
    const arcs = host.querySelectorAll('path.rc-donut-arc, .rc-donut-arc, g.rc-arc path');
    // fall back to counting any <path> with a fill if class names differ
    const paths = arcs.length ? arcs : host.querySelectorAll('svg g path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Gauge — data parsing & clamping', () => {
  it('number form sets the value; max comes from options', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300, max: 200 }).setData(73);
    expect(g._value).toBe(73);
    expect(g._max).toBe(200);
    expect(g._min).toBe(0);
  });
  it('object form overrides max and min', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300 }).setData({ value: 50, max: 80, min: 10 });
    expect(g._value).toBe(50);
    expect(g._max).toBe(80);
    expect(g._min).toBe(10);
  });
  it('a value above max renders without throwing (clamped)', () => {
    expect(() => new Gauge('#chart', { title: 'G', height: 300, max: 100 }).setData(150)).not.toThrow();
  });
  it('a value below min renders without throwing (clamped)', () => {
    expect(() => new Gauge('#chart', { title: 'G', height: 300, min: 0, max: 100 }).setData(-20)).not.toThrow();
  });
});

// ─── Fit ──────────────────────────────────────────────────────────────────────

describe('Donut — outer label spreading', () => {
  it('spreads same-side labels of small adjacent slices apart', () => {
    new Donut('#chart', { height: 300, showLabels: true }).setData([
      { label: 'Big',     value: 90 },
      { label: 'Small A', value: 5 },
      { label: 'Small B', value: 5 },
    ]);
    // Both small slices land on the left side (text-anchor: end). Unspread,
    // their rows sit ~12px apart; the pass enforces a full block of distance
    // (two 14px lines + 4px breathing room).
    const left = [...host.querySelectorAll('.rc-donut-label')]
      .filter(t => t.getAttribute('text-anchor') === 'end');
    expect(left).toHaveLength(2);
    const ys = left.map(t => +t.getAttribute('y')).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(28 + 4);
  });

  it('renders every eligible label after spreading', () => {
    new Donut('#chart', { height: 300, showLabels: true }).setData([
      { label: 'A', value: 50 }, { label: 'B', value: 50 },
    ]);
    expect(host.querySelectorAll('.rc-donut-label')).toHaveLength(2);
  });
});

describe('Gauge — shallow arcs (half-circle speedometer)', () => {
  const half = { startAngle: -Math.PI / 2, endAngle: Math.PI / 2 };

  it('renders a labelled half-circle without throwing', () => {
    expect(() => new Gauge('#chart', {
      title: 'Speed', height: 220, centerLabel: 'Load', ...half,
    }).setData(64)).not.toThrow();
    expect(host.querySelector('svg').getAttribute('aria-label')).toBe('Speed');
    expect(host.querySelector('.rc-gauge-center-label').textContent).toBe('Load');
  });

  it('keeps the center label inside the svg for a flat 180° sweep', () => {
    // The circle center of a half-circle sits on the drawing's bottom edge;
    // without the text reserve the label 21px below it would clip.
    const g = new Gauge('#chart', { height: 220, centerLabel: 'Load', ...half }).setData(64);
    const tr = host.querySelector('.rc-gauge-center').getAttribute('transform');
    const centerY = +tr.match(/,\s*([-\d.]+)\)/)[1];
    const svgH = g.height + g.margin.top + g.margin.bottom;
    expect(centerY + 21).toBeLessThanOrEqual(svgH);
  });
});

describe('Gauge — needle', () => {
  const half = { startAngle: -Math.PI / 2, endAngle: Math.PI / 2 };

  it('draws a pointer rotated to the value, and a hub', () => {
    new Gauge('#chart', {
      height: 220, animate: false, needle: true, max: 120, centerLabel: 'km/h', ...half,
    }).setData(30);   // 25% of a 180° sweep → −90° + 45° = −45°
    const pointer = host.querySelector('.rc-gauge-needle-pointer');
    expect(pointer).not.toBeNull();
    expect(pointer.getAttribute('transform')).toBe('rotate(-45)');
    expect(host.querySelector('.rc-gauge-needle-hub')).not.toBeNull();
  });

  it('moves the center readout below the hub, inside the svg', () => {
    const g = new Gauge('#chart', {
      height: 220, animate: false, needle: true, centerLabel: 'km/h', ...half,
    }).setData(87);
    expect(host.querySelector('.rc-gauge-center-value').getAttribute('y')).toBe('22');
    expect(host.querySelector('.rc-gauge-center-label').getAttribute('y')).toBe('44');
    const centerY = +host.querySelector('.rc-gauge-center')
      .getAttribute('transform').match(/,\s*([-\d.]+)\)/)[1];
    const svgH = g.height + g.margin.top + g.margin.bottom;
    expect(centerY + 52).toBeLessThanOrEqual(svgH);
  });

  it('renders no needle by default', () => {
    new Gauge('#chart', { height: 220 }).setData(50);
    expect(host.querySelector('.rc-gauge-needle-pointer')).toBeNull();
  });
});

// ─── Updates (step 7a) ────────────────────────────────────────────────────────

const PALETTE = ['#fa8c16', '#00aaff', '#00c97a'];   // default theme.colors, in order
const ACCENT  = '#00aaff';                           // default theme.accent

const donut = (o = {}) => track(new Donut(mount(null), { animate: false, ...o }));
const slices = c => [...c.container.querySelectorAll('.rc-donut-slice')];
const fillOf = (c, label) => slices(c).find(p => p.__data__.data.label === label)?.getAttribute('fill');
const hex = css => d3.rgb(css).formatHex();
const legendColors = c => [...c.container.querySelectorAll('.rc-legend-item')]
  .map(el => hex(el.firstElementChild.style.backgroundColor));

describe('Donut — slices on update (C-18)', () => {
  it('a new color for a slice that stays is painted', () => {
    const c = donut().setData([{ label: 'A', value: 1, color: '#ff0000' }, { label: 'B', value: 1 }]);
    expect(fillOf(c, 'A')).toBe('#ff0000');
    c.setData([{ label: 'A', value: 1, color: '#00ff00' }, { label: 'B', value: 1 }]);
    expect(fillOf(c, 'A')).toBe('#00ff00');
  });

  it('a palette colour moves with the slice position, as the tooltip and legend have it', () => {
    const c = donut().setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }]);
    expect(fillOf(c, 'B')).toBe(PALETTE[1]);
    c.setData([{ label: 'B', value: 1 }]);
    expect(fillOf(c, 'B')).toBe(PALETTE[0]);
  });

  it('repeated labels keep their own slices across renders', () => {
    const c = donut().setData([
      { label: 'A', value: 1 }, { label: 'A', value: 2 }, { label: 'B', value: 3 },
    ]);
    const before = slices(c);
    expect(before).toHaveLength(3);
    c.render();
    c.setData([{ label: 'A', value: 1 }, { label: 'A', value: 2 }, { label: 'B', value: 3 }]);
    const after = slices(c);
    expect(after).toHaveLength(3);
    after.forEach((node, i) => expect(node).toBe(before[i]));
    expect(after.map(p => p.__data__.data.value)).toEqual([1, 2, 3]);
  });

  it('an id tells two slices with one label apart, and follows its slice when the order changes', () => {
    const c = donut().setData([{ id: 'x', label: 'A', value: 1 }, { id: 'y', label: 'A', value: 2 }]);
    const [x, y] = slices(c);
    c.setData([{ id: 'y', label: 'A', value: 2 }, { id: 'x', label: 'A', value: 1 }]);
    expect(slices(c).find(p => p.__data__.data.id === 'x')).toBe(x);
    expect(slices(c).find(p => p.__data__.data.id === 'y')).toBe(y);
  });
});

describe('Donut — legend colours follow the slice label (K-22)', () => {
  const items = (...labels) => labels.map(label => ({ label, type: 'bar' }));

  it('items in another order than the data take their own slice colour', () => {
    const c = donut({ legend: items('C', 'A', 'B') })
      .setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }]);
    expect(legendColors(c)).toEqual([fillOf(c, 'C'), fillOf(c, 'A'), fillOf(c, 'B')]);
    expect(legendColors(c)).toEqual([PALETTE[2], PALETTE[0], PALETTE[1]]);
  });

  it('an empty ring puts every uncoloured item back to the accent', () => {
    const c = donut({ legend: items('A', 'B') }).setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }]);
    c.setData([]);
    expect(legendColors(c)).toEqual([ACCENT, ACCENT]);
  });

  it('an item whose value the ring filtered out does not take a neighbour colour', () => {
    const c = donut({ legend: items('A', 'B', 'C') })
      .setData([{ label: 'A', value: 0 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }]);
    expect(legendColors(c)).toEqual([ACCENT, PALETTE[0], PALETTE[1]]);
  });

  it('band and line items are repainted too; an item with its own color is left alone', () => {
    const c = donut({ legend: [
      { label: 'C', type: 'band' }, { label: 'B' }, { label: 'A', type: 'bar', color: '#123456' },
    ] }).setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }]);
    expect(legendColors(c)).toEqual([PALETTE[2], PALETTE[1], '#123456']);
  });

  it('an item with an id matches the slice with that id', () => {
    const c = donut({ legend: [{ id: 'y', label: 'Second A', type: 'bar' }] })
      .setData([{ id: 'x', label: 'A', value: 1 }, { id: 'y', label: 'A', value: 1 }]);
    expect(legendColors(c)).toEqual([PALETTE[1]]);
  });

  it('drilled in, an item of the level left behind goes back to the accent', () => {
    const c = donut({ legend: items('P', 'Q', 'p2') }).setData({
      label: 'Root',
      children: [
        { label: 'P', children: [{ label: 'p1', value: 1 }, { label: 'p2', value: 2 }] },
        { label: 'Q', value: 3 },
      ],
    });
    expect(legendColors(c)).toEqual([PALETTE[0], PALETTE[1], ACCENT]);
    c.drillTo(c._tree.children[0]);
    expect(legendColors(c)).toEqual([ACCENT, ACCENT, PALETTE[1]]);
  });
});

describe('Gauge — a min / max in setData holds for that call only (C-21)', () => {
  const center = g => g.container.querySelector('.rc-gauge-center-value').textContent;

  it('the next setData reads the options again', () => {
    const g = track(new Gauge(mount(null), { animate: false })).setData({ value: 50, max: 80 });
    expect(center(g)).toBe('63%');
    g.setData(40);
    expect(g._max).toBe(100);
    expect(center(g)).toBe('40%');
  });

  it('options min and max are the base; an object may override either', () => {
    const g = track(new Gauge(mount(null), { animate: false, min: 10, max: 60 }));
    g.setData({ value: 30, min: 20 });
    expect([g._min, g._max]).toEqual([20, 60]);
    g.setData({ value: 30 });
    expect([g._min, g._max]).toEqual([10, 60]);
    expect(center(g)).toBe('40%');   // (30 − 10) / (60 − 10)
  });
});

describe('Donut drillTo(child) takes what the page has (step 7 review)', () => {
  const root = { label: 'All', children: [
    { label: 'A', id: 'a', children: [{ label: 'a1', value: 30 }, { label: 'a2', value: 10 }, { label: 'a3', value: null }] },
    { label: 'B', value: 20 },
  ] };
  const ring = c => [...c.container.querySelectorAll('.rc-donut-slice')].map(p => p.__data__.data.label).sort();

  it.each([
    ['its own object', r => r.children[0]],
    ['its id', () => 'a'],
    ['its label', () => 'A'],
  ])('given %s, it draws what a click draws', (_n, pick) => {
    const c = track(new Donut(mount(null), { animate: false })).setData(root);
    c.drillTo(pick(root));
    expect(ring(c)).toEqual(['a1', 'a2']);
    expect(c.container.textContent).toContain('a3');   // the undisclosed child is named, as on a click
  });

  it('a leaf or a name not in the level shown is ignored', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(root);
    c.drillTo('B').drillTo('nope');
    expect(ring(c)).toEqual(['A', 'B']);
  });
});

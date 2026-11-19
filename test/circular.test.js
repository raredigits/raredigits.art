import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { mount, track, tooltipOf, setGeometry } from './helpers.js';

// The circular charts, Donut and Gauge: edge data and parsing, fit (outer-label
// spreading on Donut, the shallow-arc text reserve on Gauge), the needle, and
// updates across setData — Donut slice colours and identity (C-18), legend
// colours by slice label (K-22), Gauge min/max overrides that hold for one
// setData only (C-21) — and the Donut's drill-down into a tree: flat and
// hierarchy modes, the way in and back up, drillTo (K-21).
//
// Moved from hierarchical-charts.test.js (RC-026):
//   'Donut — flat mode is unchanged' → same describe
//   'Donut — drill-down (hierarchy mode)' → same describe
//   'Donut — drill-down transitions and the way back up' → same describe
// Moved from public-surface-k04.test.js (RC-026):
//   'Donut drillTo(node) — public (K-21)' → same describe

// Sizes are the test's own (S-18): an 800×400 card, and a text measures 7px
// a character — the centre label and the outer labels are fitted to it.
let host;
beforeEach(() => {
  setGeometry({ width: 800, height: 400, charWidth: 7 });
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
  it('renders one slice per data point, its angle in proportion to its value (S-13)', () => {
    new Donut('#chart', { title: 'D', height: 300, animate: false }).setData(labelSeries);
    const slices = [...host.querySelectorAll('.rc-donut-slices path.rc-donut-slice')];
    expect(slices.map(p => p.__data__.data.label)).toEqual(['A', 'B']);
    slices.forEach(p => expect(p.getAttribute('d')).toMatch(/^M/));
    // the pad between slices aside, A takes 4/11 of the ring and B 7/11
    const span = ({ startAngle, endAngle, padAngle = 0 }) => endAngle - startAngle - padAngle;
    const [a, b] = slices.map(p => span(p.__data__));
    expect(a / (a + b)).toBeCloseTo(4 / 11, 6);
  });
});

// What the gauge read from setData: the role fields its tooltipFormat gets
// (K-09), shown by hovering the arc.
const reading = { tooltipFormat: ({ value, min, max }) => `${value} of ${min}..${max}` };
const readOf = g => {
  g.container.querySelector('.rc-gauge-track').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
  return tooltipOf(g).textContent;
};

describe('Gauge — data parsing & clamping', () => {
  it('number form sets the value; max comes from options', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300, max: 200, ...reading }).setData(73);
    expect(readOf(g)).toBe('73 of 0..200');
  });
  it('object form overrides max and min', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300, ...reading }).setData({ value: 50, max: 80, min: 10 });
    expect(readOf(g)).toBe('50 of 10..80');
  });
  // The needle and the fill show the clamped value (S-13): on a half arc a
  // value above max points at +90°, one below min at −90°, and the readout
  // says 100%. RC-025 (the angle math as pure functions) is not
  // needed for this: the needle's rotation is the angle.
  const half = { startAngle: -Math.PI / 2, endAngle: Math.PI / 2, needle: true, animate: false };
  const needleOf = () => host.querySelector('.rc-gauge-needle-pointer').getAttribute('transform');
  it('a value above max is drawn at max: the needle at the end, the fill the whole track', () => {
    new Gauge('#chart', { title: 'G', height: 300, max: 100, ...half }).setData(150);
    expect(needleOf()).toBe('rotate(90)');
    expect(host.querySelector('.rc-gauge-fill').getAttribute('d')).toBe(host.querySelector('.rc-gauge-track').getAttribute('d'));
    expect(host.querySelector('.rc-gauge-center-value').textContent).toBe('100%');
  });
  it('a value below min is drawn at min: the needle at the start', () => {
    new Gauge('#chart', { title: 'G', height: 300, min: 0, max: 100, ...half }).setData(-20);
    expect(needleOf()).toBe('rotate(-90)');
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

// The ring gives way to a long slice name (field finding, 2026-11-17): the
// outer radius shrinks so every name fits whole, if 75% of it is enough;
// otherwise nothing changes and the name is cut as before. A name's anchor
// stands |sin a|·(R + 14) + 15 px from the centre, and it is fitted to the
// room left before the svg edge minus 2px.
describe('Donut, Gauge — placed in the card (maintainer, 2026-11-19)', () => {
  it('the ring stands 16 px off the header and the source, centred in the svg\'s own height', () => {
    const c = new Donut('#chart', { height: 400, animate: false }).setData(labelSeries);
    const svg = host.querySelector('svg');
    Object.defineProperty(svg, 'clientHeight', { configurable: true, get: () => 280 });
    c.render();
    const r = Math.max(...[...host.querySelectorAll('.rc-donut-slice')]
      .flatMap(p => [...p.getAttribute('d').matchAll(/A([\d.]+),/g)].map(m => +m[1])));
    expect(r).toBeCloseTo(280 / 2 - 16, 6);
    expect(host.querySelector('.rc-donut-slices, g[transform]').getAttribute('transform')).toMatch(/,140\)$/);
  });

  it('a gauge centres its title and source over the dial; destroy takes the class back', () => {
    const g = new Gauge('#chart', { title: 'G' }).setData(40);
    expect(host.classList.contains('rc-chart--gauge')).toBe(true);
    g.destroy();
    expect(host.classList.contains('rc-chart--gauge')).toBe(false);
  });
});

describe('Donut — the ring gives way to a long name', () => {
  const ringR = () => Math.max(...[...host.querySelectorAll('.rc-donut-slice')]
    .flatMap(p => [...p.getAttribute('d').matchAll(/A([\d.]+),/g)].map(m => +m[1])));
  const names = () => [...host.querySelectorAll('.rc-donut-label')].map(t => t.textContent);
  const right = label => [{ label, value: 50 }, { label: 'B', value: 50 }];   // mid-angles π/2 and 3π/2
  const base = () => {
    const c = new Donut('#chart', { height: 300, showLabels: true, animate: false }).setData(right('A'));
    const r = ringR(), cx = (c.width + c.margin.left + c.margin.right) / 2;   // the svg's centre
    c.destroy(); host.innerHTML = '';
    return { R0: r, room: R => cx - 17 - (R + 14) };
  };

  it('a name cut at full size: the ring shrinks just enough for it to fit whole', () => {
    const { R0, room } = base();
    const chars = Math.floor(room(R0) / 7) + 2;              // two characters too many at full size
    const long = 'x'.repeat(chars);
    new Donut('#chart', { height: 300, showLabels: true, animate: false }).setData(right(long));
    expect(names()).toContain(long);
    const R = ringR();
    expect(R).toBeLessThan(R0);
    expect(R).toBeGreaterThanOrEqual(R0 * 0.75);
    expect(room(R)).toBeCloseTo(chars * 7, 6);               // exactly enough
  });

  it('a name that would need more than 25% off: the ring keeps its size and the name is cut', () => {
    const { R0, room } = base();
    const long = 'x'.repeat(Math.ceil(room(R0 * 0.75) / 7) + 3);
    new Donut('#chart', { height: 300, showLabels: true, animate: false }).setData(right(long));
    expect(ringR()).toBeCloseTo(R0, 6);
    expect(names().some(n => n.endsWith('…'))).toBe(true);
  });

  it('names that fit, a hidden small slice, percent-only labels or no layout: no change', () => {
    const { R0, room } = base();
    const long = 'x'.repeat(Math.floor(room(R0) / 7) + 2);
    const at = (data, o = {}) => {
      host.innerHTML = '';
      new Donut('#chart', { height: 300, showLabels: true, animate: false, ...o }).setData(data);
      return ringR();
    };
    expect(at(right('Short'))).toBeCloseTo(R0, 6);
    expect(at([{ label: 'B', value: 23.5 }, { label: long, value: 3 }, { label: 'C', value: 73.5 }])).toBeCloseTo(R0, 6);   // 3% at π/2: under labelMinPct
    expect(at(right(long), { labelContent: 'percent' })).toBeCloseTo(R0, 6);
    setGeometry({ width: 800, height: 400, charWidth: 0 });
    expect(at(right(long))).toBeCloseTo(R0, 6);
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

const PALETTE = ['#1677ff', '#fa8c16', '#00c97a'];   // default theme.colors, in order
// An item with no slice in the ring is grey (theme.muted; maintainer,
// 2026-11-17): the default accent is PALETTE[0], slice 1's colour. The K-22
// cases still give the chart an accent of its own, so "grey" cannot pass for
// "the accent" or for "took slice 1's colour".
const ACCENT  = '#336699';

const donut = (o = {}) => track(new Donut(mount(null), { animate: false, ...o }));
const slices = c => [...c.container.querySelectorAll('.rc-donut-slice')];
const fillOf = (c, label) => slices(c).find(p => p.__data__.data.label === label)?.getAttribute('fill');
// a role colour (theme.muted, a var(--rc-…) reference) is compared as written
const hex = css => (css.startsWith('var(') ? css : d3.rgb(css).formatHex());
// The colour a swatch paints: the legend builder sets --rc-swatch-color,
// which the stylesheet draws. Nothing writes an inline background any more
// (Donut's K-22 repaint is the legend hooks now: an item's colour is its
// slice's, given to the builder).
const swatchColor = sw => {
  expect(sw.style.background).toBe('');
  return sw.style.getPropertyValue('--rc-swatch-color');
};
const legendColors = c => [...c.container.querySelectorAll('.rc-legend-item')]
  .map(el => hex(swatchColor(el.firstElementChild)));

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
  // Here every chart has its own accent, ACCENT, apart from the palette.
  const donut = (o = {}) => track(new Donut(mount(null), { animate: false, theme: { accent: ACCENT }, ...o }));

  it('items in another order than the data take their own slice colour', () => {
    const c = donut({ legend: items('C', 'A', 'B') })
      .setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }]);
    expect(legendColors(c)).toEqual([fillOf(c, 'C'), fillOf(c, 'A'), fillOf(c, 'B')]);
    expect(legendColors(c)).toEqual([PALETTE[2], PALETTE[0], PALETTE[1]]);
  });

  it('an empty ring puts every uncoloured item to grey (theme.muted), not the accent', () => {
    const c = donut({ legend: items('A', 'B') }).setData([{ label: 'A', value: 1 }, { label: 'B', value: 1 }]);
    c.setData([]);
    expect(legendColors(c)).toEqual([c.theme.muted, c.theme.muted]);
  });

  it('an item whose value the ring filtered out does not take a neighbour colour', () => {
    const c = donut({ legend: items('A', 'B', 'C') })
      .setData([{ label: 'A', value: 0 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }]);
    expect(legendColors(c)).toEqual([c.theme.muted, PALETTE[0], PALETTE[1]]);
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

  it('drilled in, an item of the level left behind goes grey', () => {
    const c = donut({ legend: items('P', 'Q', 'p2') }).setData({
      label: 'Root',
      children: [
        { label: 'P', children: [{ label: 'p1', value: 1 }, { label: 'p2', value: 2 }] },
        { label: 'Q', value: 3 },
      ],
    });
    expect(legendColors(c)).toEqual([PALETTE[0], PALETTE[1], c.theme.muted]);
    c.drillTo('P');
    expect(legendColors(c)).toEqual([c.theme.muted, c.theme.muted, PALETTE[1]]);
  });
});

describe('Gauge — a min / max in setData holds for that call only (C-21)', () => {
  const center = g => g.container.querySelector('.rc-gauge-center-value').textContent;

  it('the next setData reads the options again', () => {
    const g = track(new Gauge(mount(null), { animate: false, ...reading })).setData({ value: 50, max: 80 });
    expect(center(g)).toBe('63%');
    g.setData(40);
    expect(readOf(g)).toBe('40 of 0..100');
    expect(center(g)).toBe('40%');
  });

  it('options min and max are the base; an object may override either', () => {
    const g = track(new Gauge(mount(null), { animate: false, min: 10, max: 60, ...reading }));
    g.setData({ value: 30, min: 20 });
    expect(readOf(g)).toBe('30 of 20..60');
    g.setData({ value: 30 });
    expect(readOf(g)).toBe('30 of 10..60');
    expect(center(g)).toBe('40%');   // (30 − 10) / (60 − 10)
  });
});

// ─── Drill-down: a tree on the ring ──────────────────────────────────────────

// A compact tree that exercises: a two-level branch with a surfaced remainder
// (A: 60 vs 30+10 → 20 "A other"), a leaf branch (B), and a named-but-undisclosed
// item (C: value null → a "?" placeholder, excluded from magnitude).
const portfolio = {
  label: 'Root',
  value: 100,
  children: [
    { label: 'A', value: 60, remainderLabel: 'A other', children: [
      { label: 'A1', value: 30 },
      { label: 'A2', value: 10 },
    ] },
    { label: 'B', value: 25 },
    { label: 'C', value: null },
  ],
};

// The level the ring shows, read from the drawing: the slices still in it (a
// slice on its way out takes no pointer events, E-04), the breadcrumb trail
// (drawn once drilled in; the "N not disclosed" note carries a <title> and is
// not part of it) and the centre's label.
const ringOf = c => [...c.container.querySelectorAll('path.rc-donut-slice')]
  .filter(p => p.style.pointerEvents !== 'none').map(p => p.__data__.data.label);
const trailOf = c => [...c.container.querySelectorAll('.rc-donut-crumb text')]
  .filter(t => !t.querySelector('title') && t.textContent !== '›').map(t => t.textContent);
const centreOf = c => c.container.querySelector('.rc-donut-center-label')?.textContent ?? null;
const sliceEl = (c, label) =>
  [...c.container.querySelectorAll('path.rc-donut-slice')].find(p => p.__data__.data.label === label);

describe('Donut — flat mode is unchanged', () => {
  it('takes a plain array and stays in flat mode', () => {
    const c = new Donut('#chart', { title: 'Flat' }).setData([
      { label: 'A', value: 4 }, { label: 'B', value: 6 },
    ]);
    expect(host.querySelectorAll('.rc-donut-slice')).toHaveLength(2);
    // flat: no slice is a way in, the centre totals the slices, and no strip
    // is kept above the ring for a breadcrumb
    expect([...host.querySelectorAll('.rc-donut-slice')].map(p => p.style.cursor)).toEqual(['default', 'default']);
    expect(host.querySelector('.rc-donut-center-value').textContent).toBe('10');
    expect(centreOf(c)).toBe('Total');
    const [W, H] = [c.width + c.margin.left + c.margin.right, c.height + c.margin.top + c.margin.bottom];
    expect(host.querySelector('.rc-donut-slices').getAttribute('transform')).toBe(`translate(${W / 2},${H / 2})`);
  });
});

describe('Donut — drill-down (hierarchy mode)', () => {
  it('enters hierarchy mode on an object root and shows its direct children', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    // A and B are drawable; C (missing) is excluded from the ring.
    expect(host.querySelectorAll('.rc-donut-slice')).toHaveLength(2);
    expect(ringOf(c)).toEqual(['A', 'B']);
    // a tree: the branch is a way in, the leaf is not; at the root there is
    // no trail and nothing to go up to
    expect(sliceEl(c, 'A').style.cursor).toBe('pointer');
    expect(sliceEl(c, 'B').style.cursor).toBe('default');
    expect(trailOf(c)).toEqual([]);
    expect(host.querySelector('.rc-donut-center').getAttribute('role')).toBeNull();
  });

  it('notes undisclosed children rather than drawing them', () => {
    new Donut('#chart', {}).setData(portfolio);
    const crumb = host.querySelector('.rc-donut-crumb');
    expect(crumb.textContent).toContain('1 not disclosed');
  });

  it('drills into a node with children and back out again', () => {
    const c = new Donut('#chart', {}).setData(portfolio);

    c.drillTo('A');
    expect(trailOf(c)).toEqual(['Root', 'A']);
    expect(centreOf(c)).toBe('A');
    // A1, A2, and the surfaced "A other" remainder = 3 slices. The previous
    // level's slices leave via an async exit transition and linger for its
    // duration, taking no pointer events: the ring is the slices that do.
    expect(ringOf(c)).toEqual(['A1', 'A2', 'A other']);
    // Breadcrumb shows the path.
    expect(host.querySelector('.rc-donut-crumb').textContent).toContain('Root');
    expect(host.querySelector('.rc-donut-crumb').textContent).toContain('A');

    c.drillUp();
    expect(trailOf(c)).toEqual([]);
    expect(centreOf(c)).toBe('Total');
    expect(ringOf(c)).toEqual(['A', 'B']);
  });

  it('does not drill into a leaf', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    c.drillTo('B');
    expect(trailOf(c)).toEqual([]);       // unchanged
    expect(centreOf(c)).toBe('Total');
    expect(ringOf(c)).toEqual(['A', 'B']);
  });

  it('jumps to an ancestor via drillToDepth', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    c.drillTo('A');
    expect(trailOf(c)).toEqual(['Root', 'A']);
    c.drillToDepth(0);
    expect(trailOf(c)).toEqual([]);
    expect(centreOf(c)).toBe('Total');
    expect(ringOf(c)).toEqual(['A', 'B']);
  });
});

describe('Donut — drill-down transitions and the way back up', () => {
  const sliceOf = (c, label) =>
    [...c.container.querySelectorAll('path.rc-donut-slice')].find(p => p.__data__.data.label === label);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  it('the slice clicked to drill in leaves the DOM, even when the pointer then leaves it (E-04)', async () => {
    const c = track(new Donut(mount(null), { duration: 40 })).setData(portfolio);
    const a = sliceOf(c, 'A');
    a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(trailOf(c)).toEqual(['Root', 'A']);
    // on its way out: no hover, no tooltip, no second drill
    expect(a.style.pointerEvents).toBe('none');
    // the pointer leaving it used to start a hover transition that cancelled the exit
    a.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(tooltipOf(c).classList.contains('is-visible')).toBe(false);
    await wait(120);
    expect(a.isConnected).toBe(false);
    expect([...c.container.querySelectorAll('path.rc-donut-slice')].map(p => p.__data__.data.label))
      .toEqual(['A1', 'A2', 'A other']);
  });

  it('drilling in and straight back up keeps the slice that returns, live (E-04)', async () => {
    const c = track(new Donut(mount(null), { duration: 40 })).setData(portfolio);
    const a = sliceOf(c, 'A');
    c.drillTo('A');
    c.drillUp();                                  // before A's exit has finished
    await wait(120);
    expect(a.isConnected).toBe(true);
    expect(a.style.pointerEvents).toBe('');
    expect([...c.container.querySelectorAll('path.rc-donut-slice')].map(p => p.__data__.data.label)).toEqual(['A', 'B']);
  });

  it('animate: false removes the previous level at once (D14)', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(portfolio);
    c.drillTo('A');
    expect(c.container.querySelectorAll('path.rc-donut-slice')).toHaveLength(3);
  });

  it('drilled in, the whole hole is a button back up — click, Enter or Space (E-21)', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(portfolio);
    const center = c.container.querySelector('.rc-donut-center');
    expect(center.getAttribute('tabindex')).toBeNull();          // nothing to go up to at the root
    expect(center.querySelector('circle')).toBeNull();

    c.drillTo('A');
    const disc = center.querySelector('circle.rc-donut-center-hit');
    expect(disc).not.toBeNull();
    expect(center.firstElementChild).toBe(disc);                  // under the text
    expect(+disc.getAttribute('r')).toBeGreaterThan(0);
    expect(center.getAttribute('tabindex')).toBe('0');
    expect(center.getAttribute('role')).toBe('button');
    expect(center.getAttribute('aria-label')).toBe('Back to Root');
    disc.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(trailOf(c)).toEqual([]);
    expect(ringOf(c)).toEqual(['A', 'B']);
    expect(center.getAttribute('tabindex')).toBeNull();

    c.drillTo('A');
    center.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(trailOf(c)).toEqual([]);
    expect(ringOf(c)).toEqual(['A', 'B']);
    c.drillTo('A');
    center.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(trailOf(c)).toEqual([]);
    expect(ringOf(c)).toEqual(['A', 'B']);
  });

  it('a pie has no hole to click: no center button, the breadcrumb goes back up', () => {
    const c = track(new Pie(mount(null), { animate: false })).setData(portfolio);
    c.drillTo('A');
    const center = c.container.querySelector('.rc-donut-center');
    expect(center.querySelector('circle')).toBeNull();
    expect(center.getAttribute('tabindex')).toBeNull();
    const crumb = [...c.container.querySelectorAll('.rc-donut-crumb text')].find(t => t.textContent === 'Root');
    crumb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(trailOf(c)).toEqual([]);
    expect(ringOf(c)).toEqual(['A', 'B']);
  });
});

// onDrill: after each change of the level shown, by a click, a key or a
// method (event null), as onFoldChange; not on setData or a call that
// changes nothing (maintainer, 2026-11-17; from the 1.x list).
describe('Donut onDrill', () => {
  const calls = [];
  const make = (o = {}) => {
    calls.length = 0;
    return track(new Donut(mount(null), { animate: false, onDrill: e => calls.push(e), ...o })).setData(portfolio);
  };
  const seen = () => calls.map(e => [e.node.label, e.path.map(n => n.label).join('/'), e.depth, e.event?.type ?? null]);

  it('a click on a slice: the node, the path from the root, the depth and the event', () => {
    const c = make();
    const a = [...c.container.querySelectorAll('path.rc-donut-slice')].find(p => p.__data__.data.label === 'A');
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen()).toEqual([['A', 'Root/A', 1, 'click']]);
    expect(calls[0].node.children).toBeUndefined();                    // its own fields, no children
    expect(calls[0].node.value).toBe(portfolio.children.find(n => n.label === 'A').value);
  });

  it('the way back up: the hole (click, Enter, Space) and a breadcrumb', () => {
    const c = make();
    const center = c.container.querySelector('.rc-donut-center');
    const up = ev => { c.drillTo('A'); center.dispatchEvent(ev); };
    up(new MouseEvent('click', { bubbles: true }));
    up(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    up(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    c.drillTo('A');
    [...c.container.querySelectorAll('.rc-donut-crumb text')].find(t => t.textContent === 'Root')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen()).toEqual([
      ['A', 'Root/A', 1, null], ['Root', 'Root', 0, 'click'],
      ['A', 'Root/A', 1, null], ['Root', 'Root', 0, 'keydown'],
      ['A', 'Root/A', 1, null], ['Root', 'Root', 0, 'keydown'],
      ['A', 'Root/A', 1, null], ['Root', 'Root', 0, 'click'],
    ]);
  });

  it('the methods report with event null; a call that changes nothing reports nothing', () => {
    const c = make();
    c.drillUp();                 // at the root
    c.drillToDepth(0);           // already there
    c.drillTo('B');              // a leaf
    c.drillTo('nope');           // not in the level shown
    expect(calls).toHaveLength(0);
    c.drillTo('A');
    c.drillToDepth(0);
    expect(seen()).toEqual([['A', 'Root/A', 1, null], ['Root', 'Root', 0, null]]);
  });

  it('the chart has drawn the new level when it is told; setData and destroy() tell nothing', () => {
    let ring = null;
    const c = make({ onDrill() { ring = ringOf(this); } });
    c.drillTo('A');
    expect(ring).toEqual(ringOf(c));
    expect(ring).not.toEqual(['A', 'B']);
    calls.length = 0;
    const d = make();
    d.setData(portfolio);
    d.destroy();
    d.drillTo('A');
    expect(calls).toHaveLength(0);
  });
});

describe('Donut drillTo(node) — public (K-21)', () => {
  const tree = { label: 'Root', children: [
    { label: 'A', value: 4, children: [{ label: 'A1', value: 3 }, { label: 'A2', value: 1 }] },
    { label: 'B', value: 2 },
  ] };

  it('descends into a node of the chart\'s tree and returns the chart', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(tree);
    const A = sliceEl(c, 'A').__data__.data;      // the chart's own node, as a click passes it
    expect(c.drillTo(A)).toBe(c);
    expect(c.container.querySelector('.rc-donut-crumb').textContent).toContain('A');
    expect(trailOf(c)).toEqual(['Root', 'A']);
    expect(ringOf(c)).toEqual(['A1', 'A2']);
    expect(c.drillUp()).toBe(c);
    expect(trailOf(c)).toEqual([]);
  });

  it('a leaf, or no node, is ignored — and still returns the chart', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(tree);
    const B = sliceEl(c, 'B').__data__.data;      // the chart's own leaf node
    expect(c.drillTo(B)).toBe(c);
    // the level is unchanged: the same slices, no trail, the root's centre
    expect(ringOf(c)).toEqual(['A', 'B']);
    expect(trailOf(c)).toEqual([]);
    expect(centreOf(c)).toBe('Total');
    expect(c.drillTo(null)).toBe(c);
    expect(ringOf(c)).toEqual(['A', 'B']);
    expect(c.container.querySelector('.rc-donut-crumb').textContent).toBe('');
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

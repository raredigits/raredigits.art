import { describe, it, expect, beforeEach } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';

// Bar: negative values and the category axis line, stacked mode, value labels
// on short bars. Focused contracts live beside it: bar-width, bar-color,
// bar-category-gutter, barLayout, hbar-layout, bars-contracts.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

// ─── Negative values (fixed after v0.9.8) ─────────────────────────────────────
// Categorical Bar with negative values: the scale domain always includes 0 and
// bars grow from the zero baseline in both directions. Before the fix the
// domain was hard-coded to [0, max], giving negative bars a negative
// height/width — an invalid rect that silently doesn't render.

const mixed = [
  { label: 'Alpha', value: 40 },
  { label: 'Beta', value: -25 },
  { label: 'Gamma', value: 10 },
];

const rects = () => [...host.querySelectorAll('.rc-bar')].map(r => ({
  x: +r.getAttribute('x'),
  y: +r.getAttribute('y'),
  w: +r.getAttribute('width'),
  h: +r.getAttribute('height'),
}));

describe('Bar — negative values (vertical)', () => {
  it('renders every bar with a non-negative height', () => {
    new Bar('#chart', { height: 300, animate: false }).setData(mixed);
    const rs = rects();
    expect(rs).toHaveLength(3);
    rs.forEach(r => {
      expect(Number.isFinite(r.h)).toBe(true);
      expect(r.h).toBeGreaterThan(0);
    });
  });

  it('positive bars sit above the negative bar top', () => {
    new Bar('#chart', { height: 300, animate: false }).setData(mixed);
    const [alpha, beta] = rects();
    // Vertical SVG y grows downward: the positive bar's top must be above
    // (smaller y than) the negative bar's top, which starts at the baseline.
    expect(alpha.y).toBeLessThan(beta.y);
    // The negative bar hangs below the positive bar's bottom edge.
    expect(beta.y + beta.h).toBeGreaterThan(alpha.y + alpha.h);
  });

  it('all-negative data still renders', () => {
    new Bar('#chart', { height: 300, animate: false }).setData([
      { label: 'A', value: -5 },
      { label: 'B', value: -12 },
    ]);
    const rs = rects();
    expect(rs).toHaveLength(2);
    rs.forEach(r => expect(r.h).toBeGreaterThan(0));
  });
});

describe('Bar — negative values (horizontal)', () => {
  it('renders every bar with a non-negative width', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(mixed);
    const rs = rects();
    expect(rs).toHaveLength(3);
    rs.forEach(r => {
      expect(Number.isFinite(r.w)).toBe(true);
      expect(r.w).toBeGreaterThan(0);
    });
  });

  it('the negative bar extends left of the positive bars', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(mixed);
    const [alpha, beta] = rects();
    // The negative bar starts left of the zero baseline where positives start.
    expect(beta.x).toBeLessThan(alpha.x);
    // And ends where the positive bars begin (the shared zero baseline).
    expect(beta.x + beta.w).toBeCloseTo(alpha.x, 0);
  });

  it('value labels render for mixed-sign data without throwing', () => {
    expect(() => new Bar('#chart', {
      height: 300, orientation: 'horizontal', animate: false, showValues: true,
    }).setData(mixed)).not.toThrow();
    expect(host.querySelectorAll('.rc-bar-value')).toHaveLength(3);
  });
});

describe('Bar — positive-only data is unchanged', () => {
  it('keeps the zero-based domain (bar bottoms at the baseline)', () => {
    new Bar('#chart', { height: 300, animate: false }).setData([
      { label: 'A', value: 4 },
      { label: 'B', value: 8 },
    ]);
    const [a, b] = rects();
    // Both bars end on the same baseline; the larger value is taller.
    expect(a.y + a.h).toBeCloseTo(b.y + b.h, 0);
    expect(b.h).toBeGreaterThan(a.h);
  });
});

// Horizontal category axis has no axis line (after v0.9.8_4_1). With negative
// values the bars start at zero, not at the plot's left edge, so the line drew
// a stray rule beside the category labels. Vertical keeps its baseline.
describe('Bar — category axis line', () => {
  const stacked = [
    { name: 'A', values: [{ label: 'X', value: 3 }, { label: 'Y', value: 5 }] },
    { name: 'B', values: [{ label: 'X', value: 2 }, { label: 'Y', value: 1 }] },
  ];

  it('horizontal: no .domain on the category axis', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(mixed);
    expect(host.querySelectorAll('.rc-axis-cat .tick')).toHaveLength(3);
    expect(host.querySelector('.rc-axis-cat .domain')).toBeNull();
  });

  it('horizontal stacked: no .domain on the category axis', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(stacked);
    expect(host.querySelectorAll('.rc-axis-cat .tick')).toHaveLength(2);
    expect(host.querySelector('.rc-axis-cat .domain')).toBeNull();
  });

  it('vertical: the category axis keeps its baseline', () => {
    new Bar('#chart', { height: 300, animate: false }).setData(mixed);
    expect(host.querySelector('.rc-axis-cat .domain')).not.toBeNull();
  });
});

// ─── Stacked mode ─────────────────────────────────────────────────────────────

const series = [
  { name: 'Equities', values: [{ label: '2022', value: 40 }, { label: '2023', value: 55 }, { label: '2024', value: 60 }] },
  { name: 'Bonds',    values: [{ label: '2022', value: 30 }, { label: '2023', value: 25 }, { label: '2024', value: 20 }] },
  { name: 'Cash',     values: [{ label: '2022', value: 30 }, { label: '2023', value: 20 }, { label: '2024', value: 20 }] },
];

const segCount = () => host.querySelectorAll('.rc-bar-seg').length;

describe('Bar — stacked mode', () => {
  it('detects the series-major shape and renders a labelled svg', () => {
    const c = new Bar('#chart', { title: 'Stacked', height: 300 }).setData(series);
    expect(c._isStacked).toBe(true);
    const svg = host.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Stacked');
  });

  it('draws one segment per positive series value', () => {
    new Bar('#chart', { height: 300 }).setData(series);
    expect(segCount()).toBe(9);   // 3 series × 3 categories
  });

  it('takes categories as the ordered union of series labels', () => {
    const c = new Bar('#chart', { height: 300 }).setData(series);
    expect(c._categories).toEqual(['2022', '2023', '2024']);
  });

  it('treats a category a series omits as zero (no segment drawn)', () => {
    const sparse = [
      { name: 'A', values: [{ label: 'Q1', value: 10 }, { label: 'Q2', value: 10 }] },
      { name: 'B', values: [{ label: 'Q1', value: 5 }] },   // omits Q2
    ];
    const c = new Bar('#chart', { height: 300 }).setData(sparse);
    expect(c._categories).toEqual(['Q1', 'Q2']);
    expect(segCount()).toBe(3);   // A/Q1, A/Q2, B/Q1 — not B/Q2
  });

  it('auto-builds a legend from series names', () => {
    new Bar('#chart', { height: 300 }).setData(series);
    const items = host.querySelectorAll('.rc-legend-item');
    expect(items).toHaveLength(3);
    expect([...items].map(el => el.textContent)).toContain('Equities');
  });

  it('renders in percent mode', () => {
    expect(() => new Bar('#chart', { height: 300, stacked: 'percent' }).setData(series)).not.toThrow();
    expect(segCount()).toBe(9);
  });

  it('renders horizontally', () => {
    expect(() => new Bar('#chart', { height: 300, orientation: 'horizontal' }).setData(series)).not.toThrow();
    expect(segCount()).toBe(9);
  });

  it('falls back to plain single-series bars for a flat array', () => {
    const c = new Bar('#chart', { height: 300 }).setData([{ label: 'A', value: 4 }, { label: 'B', value: 7 }]);
    expect(c._isStacked).toBe(false);
    expect(host.querySelectorAll('.rc-bar')).toHaveLength(2);
  });

  it('draws exactly yTicks intervals on the value axis', () => {
    // Totals are 100 per category; d3's ticks(4) would emit 6 ticks (step 20).
    // The stack divides the niced domain into the requested 4 intervals → 5 ticks.
    new Bar('#chart', { height: 300 }).setData(series);
    expect(host.querySelectorAll('.rc-axis .tick')).toHaveLength(5);
  });

  it('percent mode ticks at exact quarter steps', () => {
    new Bar('#chart', { height: 300, stacked: 'percent', orientation: 'horizontal' }).setData(series);
    const labels = [...host.querySelectorAll('.rc-axis .tick text')].map(t => t.textContent);
    expect(labels).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });
});

// ─── Value labels on short bars ───────────────────────────────────────────────
//
// Horizontal Bar value labels on short bars (fixed after v0.9.8_4). A small
// negative bar next to the plot's left edge has room for its label neither
// outside (the plot edge) nor inside (the bar is too short). The label used to
// flip inside anyway and get clipped — '-0.2' read as '-0' on a phone. Now a
// label that does not fit inside goes outside, past the bar end, and the value
// axis widens so it stays inside the plot.

const cpi = [
  { label: 'Energy',   value: 1.9 },
  { label: 'Housing',  value: 1.5 },
  { label: 'Clothing', value: -0.2 },
];
const oneDecimal = d => d.value.toFixed(1);

// jsdom has no text layout: Bar falls back to 7px per character.
const textW = el => el.textContent.length * 7;

const draw = (data, opts = {}) => {
  const chart = new Bar('#chart', {
    orientation: 'horizontal', showValues: true, height: 300, animate: false,
    valueFormat: oneDecimal, ...opts,
  }).setData(data);
  const bars = [...host.querySelectorAll('.rc-bar')].map(r => ({
    x: +r.getAttribute('x'), w: +r.getAttribute('width'),
  }));
  const labels = [...host.querySelectorAll('.rc-bar-value')].map(el => ({
    el, text: el.textContent, x: +el.getAttribute('x'),
    anchor: el.getAttribute('text-anchor'), fill: el.getAttribute('fill'),
  }));
  return { chart, bars, labels };
};

describe('Bar — value labels on short bars (horizontal)', () => {
  // A phone-width card (setup.js gives every element 800px).
  beforeEach(() => {
    Object.defineProperty(host, 'clientWidth', { configurable: true, get: () => 375 });
  });

  it('places a short negative bar’s label outside, left of the bar end', () => {
    const { chart, bars, labels } = draw(cpi);
    const bar = bars[2], label = labels[2];
    expect(label.text).toBe('-0.2');
    // Outside: anchored at its end, left of the bar's left (value) end,
    // in text colour rather than the bar-background colour.
    expect(label.anchor).toBe('end');
    expect(label.x).toBeLessThan(bar.x);
    expect(label.fill).toBe(chart.theme.text);
  });

  it('keeps that label inside the plot area', () => {
    const { chart, labels } = draw(cpi);
    const label = labels[2];
    // text-anchor end: the text spans [x - width, x].
    expect(label.x - textW(label.el)).toBeGreaterThanOrEqual(0);
    expect(label.x).toBeLessThanOrEqual(chart.width);
  });

  it('positive bars keep their labels within the plot', () => {
    const { chart, labels } = draw(cpi);
    labels.slice(0, 2).forEach(l => {
      const [lo, hi] = l.anchor === 'end' ? [l.x - textW(l.el), l.x] : [l.x, l.x + textW(l.el)];
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(chart.width);
    });
  });

  it('mirrors a short positive bar next to the right edge', () => {
    const { chart, bars, labels } = draw([
      { label: 'A', value: -1.9 },
      { label: 'B', value: 0.2 },
    ]);
    const bar = bars[1], label = labels[1];
    expect(label.anchor).toBe('start');
    expect(label.x).toBeGreaterThan(bar.x + bar.w);
    expect(label.x + textW(label.el)).toBeLessThanOrEqual(chart.width);
  });

  it('still flips a label inside a long bar near the edge', () => {
    // The longest bar ends close to the right edge (the domain stops 10% past
    // it); its label fits inside, so it goes there in the background colour.
    const { chart, bars, labels } = draw([
      { label: 'A', value: 1900 },
      { label: 'B', value: 1500 },
    ], { valueFormat: d => String(d.value) });
    const bar = bars[0], label = labels[0];
    expect(label.anchor).toBe('end');
    expect(label.x).toBeLessThan(bar.x + bar.w);
    expect(label.fill).toBe(chart.theme.bg);
  });
});

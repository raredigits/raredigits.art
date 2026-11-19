// DualAxes and the interactive legend (the legend spec, §9.2): the header
// legend's items map to series by name (or `series`); a hidden series leaves
// the lines, the bars, the end labels, the markers, the crosshair and the
// tooltip. Each value axis rescales to its own shown series; an axis whose
// series are all hidden keeps the domain of its series in view (its labels
// stay in its units), and only an axis with no series at all follows the
// other. y1Domain / y2Domain and legendRescale: false keep the axes. The X
// inset (C-27) comes from every bar series in view, so X never moves when a
// bar series hides; the shown bars re-pack inside it. setSeriesVisible is
// the silent setter; hidden names survive setData.
//
// Everything is read from the drawing and the tooltip a page sees (S-17).
// Sizes are the test's own (S-18): an 800×400 card.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));
afterEach(() => vi.useRealTimers());

const N = 11;
const pts = (f, n = N, step = 1) => Array.from({ length: n }, (_, i) => ({ date: new Date(2024, 0, 1 + i * step), value: f(i) }));
const PRICE  = { name: 'Price',  axis: 'y1', type: 'line', color: '#f7931a', values: pts(i => 100 + 4 * i) };   // 100…140
const COST   = { name: 'Cost',   axis: 'y1', type: 'line', color: '#00aaff', values: pts(i => 2 * i) };         // 0…20
const SPREAD = { name: 'Spread', axis: 'y2', type: 'bar',  color: '#cccccc', values: pts(i => (i % 5) - 1) };   // −1…3
const MIX = [PRICE, COST, SPREAD];

const dual = (o, data, host = mount(null)) => track(new DualAxes(host, { animate: false, ...o })).setData(data);

// What the page sees
const ticks = (c, axis) => [...c.container.querySelectorAll(`.rc-axis-${axis} .tick text`)].map(t => t.textContent);
const tickNumbers = (c, axis) => ticks(c, axis).map(s => parseFloat(s.replace('−', '-')));
const lineColors = c => [...c.container.querySelectorAll('path.rc-dual-line')].map(p => p.getAttribute('stroke'));
const areaColors = c => [...c.container.querySelectorAll('path.rc-dual-area')].map(p => p.getAttribute('fill'));
const barRects = c => [...c.container.querySelectorAll('rect.rc-dual-bar')]
  .map(r => ({ fill: r.getAttribute('fill'), x: +r.getAttribute('x'), w: +r.getAttribute('width') }));
const endLabels = c => [...c.container.querySelectorAll('.rc-end-labels text')].map(t => t.getAttribute('fill'));
const markers = c => c.container.querySelectorAll('.rc-markers .rc-marker-circle').length;
const gridLines = c => c.container.querySelectorAll('.rc-grid .tick line').length;
const firstLineX = (c, color) => {
  const p = [...c.container.querySelectorAll('path.rc-dual-line')].find(el => el.getAttribute('stroke') === color);
  return +p.getAttribute('d').match(/^M([\d.]+)/)[1];
};
const xTicks = c => [...c.container.querySelectorAll('.rc-axis-x .tick')].map(t => `${t.getAttribute('transform')}|${t.textContent}`);
const clip = c => { const r = c.container.querySelector('clipPath rect'); return [+r.getAttribute('x'), +r.getAttribute('x') + +r.getAttribute('width')]; };
const inside = c => { const [a, b] = clip(c); return barRects(c).every(r => r.x >= a - 1e-6 && r.x + r.w <= b + 1e-6); };
const item = (c, key) => c.container.querySelector(`.rc-legend button.rc-legend-item[data-key="${key}"]`);
const hover = (c, clientX = 300) => c.container.querySelector('rect.rc-overlay')
  .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 100 }));
const tipVisible = c => !!c.container.querySelector('.rc-tooltip.is-visible');
// Enter, Space, a screen reader or a script: event.detail 0, at once
const press = node => node.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
// a real double click in an engine that counts clicks: click 1, click 2, dblclick
const doubleClick = node => {
  node.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
  node.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));
  node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
};

// ─── The legend maps to the series ──────────────────────────────────────────

describe('DualAxes: the header legend toggles its series', () => {
  it('items map by label, name or `series`; a click hides that series; onLegendToggle hears it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const heard = [];
    const c = dual({
      legend: [
        { label: 'Price cost', series: 'Cost', color: '#00aaff' },   // the label differs from the name
        { label: 'Price', color: '#f7931a' },
        { name: 'Spread', label: 'The spread', type: 'bar' },
      ],
      onLegendToggle: e => heard.push(e),
    }, MIX);
    expect([...c.container.querySelectorAll('.rc-legend > *')].map(el => `${el.localName}:${el.dataset.key ?? '-'}`))
      .toEqual(['button:Cost', 'button:Price', 'button:Spread', 'button:-']);
    expect(warn).not.toHaveBeenCalled();

    press(item(c, 'Cost'));
    expect(lineColors(c)).toEqual(['#f7931a']);
    expect(item(c, 'Cost').getAttribute('aria-pressed')).toBe('false');
    expect(heard).toEqual([{ name: 'Cost', visible: false, visibleNames: ['Price', 'Spread'] }]);
  });

  it('an item without a colour takes its series colour', () => {
    const c = dual({ legend: [{ label: 'Price' }, { label: 'Spread', type: 'bar' }] }, MIX);
    expect([...c.container.querySelectorAll('.rc-legend-item > span:first-child')]
      .map(s => s.style.getPropertyValue('--rc-swatch-color'))).toEqual(['#f7931a', '#cccccc']);
  });

  it('a pointer double click keeps only that series; a second brings all back', () => {
    vi.useFakeTimers();
    const c = dual({ legend: [{ label: 'Price' }, { label: 'Cost' }, { label: 'Spread' }] }, MIX);
    doubleClick(item(c, 'Cost'));
    expect(lineColors(c)).toEqual(['#00aaff']);
    expect(barRects(c)).toEqual([]);
    vi.advanceTimersByTime(1000);
    doubleClick(item(c, 'Cost'));
    expect(lineColors(c)).toEqual(['#f7931a', '#00aaff']);
    expect(barRects(c)).toHaveLength(N);
  });
});

// ─── What a hidden series leaves ────────────────────────────────────────────

describe('DualAxes: a hidden series leaves the drawing', () => {
  it('its line, area, markers and bars go; the others stay', () => {
    const c = dual({ markers: true }, [{ ...PRICE, area: true }, COST, SPREAD]);
    expect(lineColors(c)).toEqual(['#f7931a', '#00aaff']);
    expect(areaColors(c)).toEqual(['#f7931a']);
    expect(markers(c)).toBe(2 * N);

    c.setSeriesVisible(['Cost', 'Spread']);
    expect(lineColors(c)).toEqual(['#00aaff']);
    expect(areaColors(c)).toEqual([]);
    expect(markers(c)).toBe(N);
    expect(barRects(c).map(b => b.fill)).toEqual(Array(N).fill('#cccccc'));

    c.setSeriesVisible(['Price', 'Cost']);
    expect(barRects(c)).toEqual([]);
    expect(lineColors(c)).toEqual(['#f7931a', '#00aaff']);
  });

  it('end labels: only the shown series of endLabelsAxis', () => {
    const VOL = { name: 'Volume', axis: 'y2', type: 'line', color: '#00c97a', values: pts(i => i) };
    const c = dual({ endLabels: true }, [PRICE, COST, SPREAD, VOL]);
    expect(endLabels(c)).toEqual(['#f7931a', '#00aaff']);
    c.setSeriesVisible(['Price', 'Spread', 'Volume']);
    expect(endLabels(c)).toEqual(['#f7931a']);

    const y2 = dual({ endLabels: true, endLabelsAxis: 'y2' }, [PRICE, COST, SPREAD, VOL]);
    expect(endLabels(y2)).toEqual(['#00c97a']);              // bars carry none
    y2.setSeriesVisible(['Price', 'Cost', 'Spread']);
    expect(endLabels(y2)).toEqual([]);
  });

  it('the crosshair and the tooltip: no point of a hidden series', () => {
    let seen = null;
    const c = dual({ tooltipFormat: ({ points }) => { seen = points.map(p => p.name); return 'tip'; } }, MIX);
    hover(c);
    expect(seen).toEqual(['Price', 'Cost', 'Spread']);
    expect(c.container.querySelectorAll('.rc-cross-dot')).toHaveLength(2);

    c.setSeriesVisible(['Price', 'Spread']);
    hover(c, 310);
    expect(seen).toEqual(['Price', 'Spread']);
    expect(c.container.querySelectorAll('.rc-cross-dot')).toHaveLength(1);
  });

  it('with every series hidden the frame stays: axes and grid as in view, no marks, no tooltip', () => {
    let seen = null;
    const c = dual({ endLabels: true, markers: true, tooltipFormat: ({ points }) => { seen = points; return 'tip'; } }, MIX);
    const before = { y1: ticks(c, 'y1'), y2: ticks(c, 'y2'), grid: gridLines(c), x: xTicks(c) };

    c.setSeriesVisible([]);
    expect({ y1: ticks(c, 'y1'), y2: ticks(c, 'y2'), grid: gridLines(c), x: xTicks(c) }).toEqual(before);
    expect(before.grid).toBeGreaterThan(0);
    expect(lineColors(c)).toEqual([]);
    expect(barRects(c)).toEqual([]);
    expect(endLabels(c)).toEqual([]);
    expect(markers(c)).toBe(0);
    hover(c);
    expect(seen).toBeNull();
    expect(tipVisible(c)).toBe(false);
  });
});

// ─── The value axes ─────────────────────────────────────────────────────────

describe('DualAxes: each value axis follows its own shown series', () => {
  it('hiding y2\'s only series keeps y2\'s ticks in y2 units; y1 rescales to what it shows', () => {
    const c = dual({}, MIX);
    const y1 = ticks(c, 'y1'), y2 = ticks(c, 'y2');

    c.setSeriesVisible(['Price', 'Cost']);                  // Spread, y2's only series, hidden
    expect(ticks(c, 'y2')).toEqual(y2);                      // not y1's 0…150 (the "follow the other" rule)
    expect(ticks(c, 'y1')).toEqual(y1);

    c.setSeriesVisible(['Price']);                          // y1 shows Price alone
    expect(ticks(c, 'y1')).toEqual(['100', '110', '120', '130', '140']);
    expect(ticks(c, 'y2')).toEqual(y2);

    c.setSeriesVisible(null);
    expect(ticks(c, 'y1')).toEqual(y1);
  });

  it('an axis with no series of its own follows the other\'s shown series (the grid stays on its labels)', () => {
    const c = dual({}, [PRICE, COST]);
    expect(tickNumbers(c, 'y2')).toEqual(tickNumbers(c, 'y1'));
    c.setSeriesVisible(['Price']);
    expect(tickNumbers(c, 'y1')).toEqual([100, 110, 120, 130, 140]);
    expect(tickNumbers(c, 'y2')).toEqual(tickNumbers(c, 'y1'));
  });

  it('legendRescale: false keeps both axes on every series in view', () => {
    const c = dual({ legendRescale: false }, MIX);
    const y1 = ticks(c, 'y1'), y2 = ticks(c, 'y2');
    c.setSeriesVisible(['Price']);
    expect(ticks(c, 'y1')).toEqual(y1);
    expect(ticks(c, 'y2')).toEqual(y2);
  });

  it('y1Domain and y2Domain win', () => {
    const c = dual({ y1Domain: [0, 200], y2Domain: [-5, 5] }, MIX);
    const y1 = ticks(c, 'y1'), y2 = ticks(c, 'y2');
    c.setSeriesVisible(['Price']);
    expect(ticks(c, 'y1')).toEqual(y1);
    expect(ticks(c, 'y2')).toEqual(y2);
  });

  it('a log axis rescales on its shown positive values', () => {
    const SMALL = { name: 'Small', axis: 'y1', type: 'line', values: pts(i => 1 + i) };          // 1…11
    const BIG   = { name: 'Big',   axis: 'y1', type: 'line', values: pts(i => 1000 + 100 * i) }; // 1000…2000
    const c = dual({ y1Scale: 'log' }, [SMALL, BIG]);
    const both = ticks(c, 'y1');
    c.setSeriesVisible(['Small']);
    expect(ticks(c, 'y1')).not.toEqual(both);
    expect(tickNumbers(c, 'y1').every(v => v < 100)).toBe(true);
  });

  it('a level outside the rescaled axis is skipped; with legendRescale: false it stays', () => {
    const annotations = [{ type: 'hPoint', value: 120, label: 'Level' }];
    const levels = c => c.container.querySelectorAll('.rc-annotations line').length;
    const on = dual({ annotations }, [PRICE, COST]);
    expect(levels(on)).toBe(1);
    on.setSeriesVisible(['Cost']);                          // y1 now 0…20
    expect(levels(on)).toBe(0);

    const off = dual({ annotations, legendRescale: false }, [PRICE, COST]);
    off.setSeriesVisible(['Cost']);
    expect(levels(off)).toBe(1);
  });
});

// ─── X and the bars (C-27) ──────────────────────────────────────────────────

describe('DualAxes: X never moves when a bar series hides', () => {
  const LINE = { name: 'Index', axis: 'y1', type: 'line', color: '#111111', values: pts(i => 100 + i, 30) };
  const BARS = { name: 'Change', axis: 'y2', type: 'bar', color: '#222222', values: pts(i => (i % 3) - 1, 30) };

  it('hiding every bar keeps the first line point and the X ticks where they were', () => {
    const c = dual({}, [LINE, BARS]);
    const x0 = firstLineX(c, '#111111'), xt = xTicks(c);
    expect(x0).toBeGreaterThan(8);                           // inset by half a bar
    c.setSeriesVisible(['Index']);
    expect(barRects(c)).toEqual([]);
    expect(firstLineX(c, '#111111')).toBeCloseTo(x0, 6);
    expect(xTicks(c)).toEqual(xt);
  });

  it('a cluster re-packs: the shown bar takes the cluster\'s width, centred on its date, inside the clip', () => {
    const HALF = { ...BARS, name: 'Half', color: '#333333', values: BARS.values.map(v => ({ ...v, value: v.value / 2 })) };
    const c = dual({ barGrouping: 'cluster' }, [LINE, BARS, HALF]);
    const x0 = firstLineX(c, '#111111');
    const before = barRects(c);
    const w = before[0].w;
    expect(before.every(b => Math.abs(b.w - w) < 1e-9)).toBe(true);

    c.setSeriesVisible(['Index', 'Change']);
    const after = barRects(c);
    expect(after).toHaveLength(30);
    after.forEach(b => expect(b.w).toBeCloseTo(2 * w, 6));
    expect(after[0].x + after[0].w / 2).toBeCloseTo(x0, 2); // centred on the date the line point marks (the path rounds)
    expect(firstLineX(c, '#111111')).toBeCloseTo(x0, 6);
    expect(inside(c)).toBe(true);
  });

  it('hiding the widest of some bar series keeps the inset: X stays, the narrower bars keep their width', () => {
    const WIDE = { ...BARS, name: 'Wide', color: '#777777', barWidth: 16 };
    const THIN = { ...BARS, name: 'Thin', color: '#888888', barWidth: 4 };
    const c = dual({}, [LINE, WIDE, THIN]);
    const x0 = firstLineX(c, '#111111');
    const thin = () => barRects(c).filter(b => b.fill === '#888888');
    const before = thin();
    c.setSeriesVisible(['Index', 'Thin']);
    expect(firstLineX(c, '#111111')).toBeCloseTo(x0, 6);
    expect(thin()).toEqual(before);
  });

  it('the space per date comes from every bar in view: a sparse bar series keeps its width when a dense one hides', () => {
    const DENSE  = { name: 'Dense',  axis: 'y2', type: 'bar', color: '#444444', values: pts(i => i, 21) };      // daily
    const SPARSE = { name: 'Sparse', axis: 'y2', type: 'bar', color: '#555555', values: pts(i => i, 5, 5) };   // every 5 days
    const c = dual({}, [DENSE, SPARSE]);
    const sparse = () => barRects(c).filter(b => b.fill === '#555555');
    const before = sparse();
    c.setSeriesVisible(['Sparse']);
    expect(sparse()).toEqual(before);
    expect(inside(c)).toBe(true);
  });

  it('a single bar date keeps its width when the line beside it hides (its space comes from every date in view)', () => {
    const ONE = { name: 'One', axis: 'y2', type: 'bar', color: '#666666', values: [{ date: new Date(2024, 0, 6), value: 2 }] };
    const c = dual({}, [{ ...LINE, values: pts(i => 100 + i) }, ONE]);
    const before = barRects(c);
    c.setSeriesVisible(['One']);
    expect(barRects(c)).toEqual(before);
  });
});

// ─── setSeriesVisible and setData ───────────────────────────────────────────

describe('DualAxes: setSeriesVisible and the hidden names across setData', () => {
  it('a list, a name or null; returns the chart; no onLegendToggle', () => {
    const heard = vi.fn();
    const c = dual({ legend: [{ label: 'Price' }, { label: 'Cost' }, { label: 'Spread' }], onLegendToggle: heard }, MIX);
    expect(c.setSeriesVisible('Cost')).toBe(c);
    expect(lineColors(c)).toEqual(['#00aaff']);
    expect(barRects(c)).toEqual([]);
    expect(item(c, 'Price').getAttribute('aria-pressed')).toBe('false');
    expect(c.container.querySelector('.rc-legend-reset').hidden).toBe(false);
    c.setSeriesVisible(null);
    expect(lineColors(c)).toEqual(['#f7931a', '#00aaff']);
    expect(c.container.querySelector('.rc-legend-reset').hidden).toBe(true);
    expect(heard).not.toHaveBeenCalled();
  });

  it('a series named by a number is known by its string', () => {
    const c = dual({ legend: [{ label: '2023' }, { label: '2024' }] },
      [{ ...PRICE, name: 2023 }, { ...COST, name: 2024 }]);
    press(item(c, '2024'));
    expect(lineColors(c)).toEqual(['#f7931a']);
    c.setSeriesVisible([2024]);
    expect(lineColors(c)).toEqual(['#00aaff']);
  });

  it('a hidden name stays hidden across setData; a new name is shown', () => {
    const c = dual({}, MIX).setSeriesVisible(['Price', 'Spread']);
    const EXTRA = { name: 'Extra', axis: 'y1', type: 'line', color: '#abcdef', values: pts(i => 50 + i) };
    c.setData([PRICE, COST, SPREAD, EXTRA]);
    expect(lineColors(c)).toEqual(['#f7931a', '#abcdef']);
    c.setData([PRICE, SPREAD]);                              // Cost leaves the data …
    c.setData(MIX);                                          // … and comes back hidden
    expect(lineColors(c)).toEqual(['#f7931a']);
  });

  it('the navigator keeps drawing the first line series, hidden or not', () => {
    const c = dual({ navigator: true }, MIX);
    const strip = () => c.container.querySelector('.rc-chart-navigator .rc-ov-line').getAttribute('d');
    const before = strip();
    c.setSeriesVisible(['Cost', 'Spread']);
    expect(strip()).toBe(before);
  });
});

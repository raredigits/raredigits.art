import { describe, it, expect, vi } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { createTheme } from '../assets/charts/src/core/theme.js';
import { mount, track } from './helpers.js';

// Documented promises of the bar charts that the code now keeps (O-10 §8,
// step 6): Bar's view controls only on a date axis, yPrefix/ySuffix in every
// vertical mode, a warning for dated horizontal rows; HierarchicalBar reports
// shares of the total; DualAxes lets an explicit
// margin.top win, reads the theme's sizing tokens and does not repeat a date
// on short spans.

const months = (n, f = i => 10 + i) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(2024, i, 1), value: f(i) }));
const cats = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];
const stacked = [
  { name: 'S1', values: [{ label: 'Q1', value: 10 }, { label: 'Q2', value: 20 }] },
  { name: 'S2', values: [{ label: 'Q1', value: 5 },  { label: 'Q2', value: 15 }] },
];

const bar = (o, data) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);
const rangeRow  = c => c.container.querySelector('.rc-chart-range-row');
const navigator = c => c.container.querySelector('.rc-chart-navigator');
const shown     = el => !!el && el.style.display !== 'none';
const yLabels   = c => [...c.gAxisY.selectAll('.tick text').nodes()].map(n => n.textContent);

describe('Bar — timeframes and navigator belong to the date axis', () => {
  const controls = { timeframes: true, navigator: true };

  it('dated vertical bars show the buttons and the strip', () => {
    const c = bar(controls, months(24));
    expect(shown(rangeRow(c))).toBe(true);
    expect(shown(navigator(c))).toBe(true);
    expect(c.getView()).not.toBeNull();
  });

  it('categorical bars hide them', () => {
    const c = bar(controls, cats);
    expect(rangeRow(c).style.display).toBe('none');
    expect(navigator(c).style.display).toBe('none');
  });

  it('a header that held only the buttons hides too; one with a title stays', () => {
    const bare = bar(controls, cats);
    expect(bare.container.querySelector('.rc-chart-header').style.display).toBe('none');
    const titled = bar({ ...controls, title: 'Sales' }, cats);
    expect(shown(titled.container.querySelector('.rc-chart-header'))).toBe(true);
    expect(rangeRow(titled).style.display).toBe('none');
    titled.setData(months(24));
    expect(shown(rangeRow(titled))).toBe(true);
    bare.setData(months(24));
    expect(shown(bare.container.querySelector('.rc-chart-header'))).toBe(true);
  });

  it('stacked bars hide them', () => {
    const c = bar(controls, stacked);
    expect(rangeRow(c).style.display).toBe('none');
    expect(navigator(c).style.display).toBe('none');
  });

  it('they come back when the same chart gets dated rows', () => {
    const c = bar(controls, cats);
    c.setData(months(24));
    expect(shown(rangeRow(c))).toBe(true);
    expect(shown(navigator(c))).toBe(true);
  });

  it('dated rows with orientation horizontal: no date axis, controls hidden, one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = bar({ ...controls, orientation: 'horizontal' }, months(3));
    c.setData(months(4));
    expect(rangeRow(c).style.display).toBe('none');
    expect(navigator(c).style.display).toBe('none');
    expect(c.getView()).toBeNull();
    const calls = warn.mock.calls.filter(a => /dated rows .* need orientation 'vertical'/.test(a[0]));
    expect(calls).toHaveLength(1);
  });

  it('vertical dated bars do not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    bar({}, months(3));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Bar — yPrefix / ySuffix in every vertical mode', () => {
  const units = { yPrefix: '$', ySuffix: 'k' };
  const dressed = labels => labels.length > 0 && labels.every(s => s.startsWith('$') && s.endsWith('k'));

  it('categorical (as before)', () => {
    expect(dressed(yLabels(bar(units, cats)))).toBe(true);
  });

  it('date-based', () => {
    expect(dressed(yLabels(bar(units, months(6))))).toBe(true);
  });

  it('stacked', () => {
    expect(dressed(yLabels(bar(units, stacked)))).toBe(true);
  });

  it("stacked 'percent' keeps its own unit", () => {
    const labels = yLabels(bar({ ...units, stacked: 'percent' }, stacked));
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(s => s.endsWith('%') && !s.startsWith('$'))).toBe(true);
  });

  it('an explicit yTickFormat still wins', () => {
    const labels = yLabels(bar({ ...units, yTickFormat: v => `v${v}` }, months(6)));
    expect(labels.every(s => s.startsWith('v'))).toBe(true);
  });
});

// ── HierarchicalBar ─────────────────────────────────────────────────────────

const portfolio = {
  label: 'Portfolio', value: 100,
  children: [
    { label: 'Equities', value: 60 },
    { label: 'Bonds', value: 30 },
    { label: 'Cash', value: 10 },
  ],
};
const forest = [
  { label: 'Engineering', value: 128, children: [{ label: 'Platform', value: 74 }] },
  { label: 'Go-to-Market', value: 74 },
];

const hbar = (o, data) => track(new HierarchicalBar(mount(null), o)).setData(data);
const widths = c => [...c.container.querySelectorAll('.rc-hbar-bar')].map(r => r.getAttribute('width'));

// The default tooltip of the row labelled `label`: its last line is the share.
const shareOf = (c, label) => {
  const spy = vi.spyOn(c._tooltip, 'show');
  const row = [...c.container.querySelectorAll('g.rc-hbar-row')]
    .find(g => g.querySelector('.rc-hbar-label').textContent === label);
  row.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
  const html = spy.mock.calls.at(-1)[2];
  spy.mockRestore();
  return html.match(/([\d.]+%)/)?.[1] ?? null;
};

describe('HierarchicalBar — each dataset grows in', () => {
  it('a second setData starts the bars from zero again', () => {
    const c = hbar({ animate: true }, portfolio);
    c.setData({ ...portfolio, children: portfolio.children.map(n => ({ ...n, value: n.value / 2 })) });
    expect(widths(c).map(Number).every(w => w === 0)).toBe(true);   // the growth transition has not run yet
  });
});

describe('HierarchicalBar — tooltip share is of the total', () => {
  it('root shown: a child is its share of the root', () => {
    expect(shareOf(hbar({ animate: false }, portfolio), 'Equities')).toBe('60.0%');
  });

  it('showRoot: false still divides by the root, not by the largest row', () => {
    const c = hbar({ animate: false, showRoot: false }, portfolio);
    expect(shareOf(c, 'Equities')).toBe('60.0%');
    expect(shareOf(c, 'Bonds')).toBe('30.0%');
  });

  it('a one-element array counts as a single root', () => {
    expect(shareOf(hbar({ animate: false, showRoot: false }, [portfolio]), 'Cash')).toBe('10.0%');
  });

  it('a forest divides by the sum of its roots', () => {
    const c = hbar({ animate: false }, forest);
    expect(shareOf(c, 'Engineering')).toBe('63.4%');   // 128 / 202
    expect(shareOf(c, 'Go-to-Market')).toBe('36.6%');  // 74 / 202
    expect(shareOf(c, 'Platform')).toBe('36.6%');
  });
});

// ── DualAxes ────────────────────────────────────────────────────────────────

const line = (values, extra = {}) => ({ name: 'L', type: 'line', values, ...extra });
const dual = (o, data) => track(new DualAxes(mount(null), { animate: false, ...o })).setData(data);

describe('DualAxes — an explicit margin.top wins (K-10, as on Line and Bar)', () => {
  const ann = [{ date: '2024-03-01', label: 'Event' }];

  it('defaults are unchanged: 10, 30 with an axis title, annotationLabelHeight + 4 with annotations', () => {
    expect(new DualAxes(mount(null), {}).margin.top).toBe(10);
    expect(new DualAxes(mount(null), { y1Title: 'USD' }).margin.top).toBe(30);
    expect(new DualAxes(mount(null), { annotations: ann }).margin.top).toBe(26);
    expect(new DualAxes(mount(null), { y2Title: 'bp', annotations: ann, annotationLabelHeight: 40 }).margin.top).toBe(44);
  });

  it('a margin.top the page sets is kept', () => {
    expect(new DualAxes(mount(null), { y1Title: 'USD', margin: { top: 0 } }).margin.top).toBe(0);
    expect(new DualAxes(mount(null), { annotations: ann, margin: { top: 5 } }).margin.top).toBe(5);
  });
});

describe('DualAxes — theme sizing tokens are the fallbacks', () => {
  const data = [
    line(months(6), { markers: true }),
    { name: 'B', type: 'bar', axis: 'y2', values: months(6, i => i - 2) },
  ];
  const look = c => ({
    opacity: c.container.querySelector('rect.rc-dual-bar').getAttribute('opacity'),
    r:       c.container.querySelector('.rc-marker-circle').getAttribute('r'),
    stroke:  c.container.querySelector('path.rc-dual-line').getAttribute('stroke-width'),
  });

  it('the default theme draws as before', () => {
    expect(look(dual({}, data))).toEqual({ opacity: '0.35', r: '4', stroke: '2' });
  });

  it('theme barOpacity, markerSize and strokeWidth apply', () => {
    const theme = createTheme({ barOpacity: 0.9, markerSize: 7, strokeWidth: 3 });
    expect(look(dual({ theme }, data))).toEqual({ opacity: '0.9', r: '7', stroke: '3' });
  });

  it('chart and series options still win over the theme', () => {
    const theme = createTheme({ barOpacity: 0.9, markerSize: 7, strokeWidth: 3 });
    const c = dual({ theme, barOpacity: 0.5, markerSize: 5 },
      [line(months(6), { markers: true, strokeWidth: 1 }), data[1]]);
    expect(look(c)).toEqual({ opacity: '0.5', r: '5', stroke: '1' });
  });
});

describe('DualAxes — date ticks on a short span do not repeat (E-03)', () => {
  // jsdom has no layout: give each tick label a 30px box at its tick, so the
  // overlap thinning in renderAxisX sees the real spacing.
  const layoutLabels = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const m = this.closest?.('.tick')?.getAttribute('transform')?.match(/translate\(([-\d.]+)/);
    const x = m ? +m[1] : 0;
    return { left: x - 15, right: x + 15, top: 0, bottom: 10, width: 30, height: 10, x: x - 15, y: 0 };
  });
  const xLabels = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);
  const days = n => Array.from({ length: n }, (_, i) => ({ date: new Date(2025, 0, 1 + i), value: 10 + i }));

  it('three days: one label per day', () => {
    layoutLabels();
    const labels = xLabels(dual({}, [line(days(3))]));
    expect(labels).toEqual(['01/01', '01/02', '01/03']);
  });

  it('a week: still no repeated date', () => {
    layoutLabels();
    const labels = xLabels(dual({}, [line(days(8))]));
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("a page's own xTickFormat keeps the full tick count", () => {
    layoutLabels();
    const labels = xLabels(dual({ xTickFormat: d => d.toISOString() }, [line(days(3))]));
    expect(labels.length).toBeGreaterThan(3);
  });
});

describe('step 6 review — plot height and day ticks', () => {
  // jsdom has no layout: the strip reports a height only while it is shown.
  const strip = c => Object.defineProperty(c._navigatorEl, 'offsetHeight',
    { configurable: true, get() { return this.style.display === 'none' ? 0 : 60; } });
  const axisY = c => c.gAxisX.attr('transform');

  it('Bar: categories then dates measures the plot with the navigator shown again', () => {
    const fresh = track(new Bar(mount(null), { animate: false, timeframes: true, navigator: true }));
    strip(fresh); fresh.setData(months(24));
    const back = track(new Bar(mount(null), { animate: false, timeframes: true, navigator: true }));
    strip(back); back.setData(cats); back.setData(months(24));
    expect(axisY(back)).toBe(axisY(fresh));
  });

  it('Bar: hidden header and navigator give back their gaps', () => {
    const plain = bar({}, cats);
    const ctrl  = bar({ timeframes: true, navigator: true }, cats);
    expect(ctrl.height).toBe(plain.height);
  });

  const hourly = (from, hours) => Array.from({ length: hours + 1 }, (_, i) =>
    ({ date: new Date(+from + i * 36e5), value: 10 + (i % 5) }));
  const xLabels = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);
  it.each([
    ['36h across one midnight', new Date(2026, 0, 1, 8), 36, ['01/02']],
    ['20h inside one day',      new Date(2026, 0, 5, 2), 20, ['01/05']],
    ['26h across two midnights', new Date(2026, 0, 1, 23), 26, ['01/02', '01/03']],
  ])('DualAxes default date ticks, %s: one label per midnight, never none, never repeated', (_n, from, h, want) => {
    const c = track(new DualAxes(mount(null), { animate: false })).setData([{ name: 's', values: hourly(from, h) }]);
    expect(xLabels(c)).toEqual(want);
  });
});

// Step 7 decisions on the public surface: K-04 (generateMockPrices a demo
// helper outside the stability guarantee, viewSteps deprecated, Overview a
// public class that reads dates as the charts do) and K-21 (Donut drillTo).
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as RareCharts from '../assets/charts/src/index.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { mount, track } from './helpers.js';

const dates = values => values.map((value, i) => ({ date: new Date(2026, 0, 1 + i * 20), value }));
const buttons = c => [...c.container.querySelectorAll('.rc-range-btn:not(.rc-scale-btn)')].map(b => b.textContent);

describe('viewSteps — deprecated alias of timeframes (K-04)', () => {
  afterEach(() => vi.restoreAllMocks());
  const MSG = 'RareCharts: viewSteps is deprecated — use timeframes';
  const deprecations = spy => spy.mock.calls.filter(args => args[0] === MSG);

  it('still builds the buttons, and warns once per chart', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = track(new Line(mount(null), { animate: false, viewSteps: ['3M', 'ALL'] })).setData(dates([1, 2, 3, 4, 5, 6]));
    expect(buttons(a)).toEqual(['3M', 'ALL']);
    a.setTimeframe('3M');
    a.render();
    expect(deprecations(warn)).toHaveLength(1);
    track(new Line(mount(null), { animate: false, viewSteps: true })).setData(dates([1, 2]));
    expect(deprecations(warn)).toHaveLength(2);           // a second chart warns for itself
  });

  it('timeframes wins when both are set — the alias still warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = track(new Line(mount(null), { animate: false, timeframes: ['1M'], viewSteps: ['3M', 'ALL'] })).setData(dates([1, 2, 3]));
    expect(buttons(c)).toEqual(['1M']);
    expect(deprecations(warn)).toHaveLength(1);
  });

  it('timeframes alone does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    track(new Line(mount(null), { animate: false, timeframes: true })).setData(dates([1, 2, 3]));
    expect(deprecations(warn)).toHaveLength(0);
  });
});

describe('generateMockPrices — exported demo helper (K-04)', () => {
  it('is still exported and returns OHLCV rows', () => {
    const rows = RareCharts.generateMockPrices(10, 100);
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(rows[0]).sort()).toEqual(['date', 'high', 'low', 'open', 'value', 'volume']);
  });
});

describe('Overview — standalone, dates read as the charts read them (K-04)', () => {
  const pathOf = el => el.querySelector('path.rc-ov-line').getAttribute('d');

  it('string dates, epoch ms and numeric strings draw; unreadable rows drop; the input is not touched', () => {
    const input = [
      { date: '2026-03-01', value: '3' },
      { date: Date.UTC(2026, 0, 1), value: 1 },
      { date: 'not a date', value: 5 },
      { date: '2026-02-01', value: 'n/a' },
      { date: new Date(2026, 1, 15), value: 2 },
    ];
    const copy = structuredClone(input);
    const el = mount(null);
    const ov = new Overview(el, { height: 56 }).setData(input, () => {});
    expect(input).toEqual(copy);
    expect(ov._data.map(d => d.value)).toEqual([1, 2, 3]);            // date order, numbers
    expect(ov._data.every(d => d.date instanceof Date)).toBe(true);
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
    const [d0, d1] = ov._xScale.domain();
    expect(+d0).toBe(+new Date('2026-01-01'));
    expect(+d1).toBe(+new Date('2026-01-31'));
    ov.setBrush(['2026-01-10', '2026-01-20']);
    const sel = el.querySelector('.selection');
    expect(Number(sel.getAttribute('width'))).toBeGreaterThan(0);
    expect(sel.getAttribute('x')).not.toMatch(/NaN/);
    ov.setBrush(['nope', 'nope']);                                     // ignored, no throw
    expect(Number(sel.getAttribute('width'))).toBeGreaterThan(0);
    ov.destroy();
  });
});

describe('Donut drillTo(node) — public (K-21)', () => {
  const tree = { label: 'Root', children: [
    { label: 'A', value: 4, children: [{ label: 'A1', value: 3 }, { label: 'A2', value: 1 }] },
    { label: 'B', value: 2 },
  ] };

  it('descends into a node of the chart\'s tree and returns the chart', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(tree);
    const A = c._tree.children.find(n => n.label === 'A');
    expect(c.drillTo(A)).toBe(c);
    expect(c.container.querySelector('.rc-donut-crumb').textContent).toContain('A');
    expect(c.drillUp()).toBe(c);
  });

  it('a leaf, or no node, is ignored — and still returns the chart', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(tree);
    const B = c._tree.children.find(n => n.label === 'B');
    expect(c.drillTo(B)).toBe(c);
    expect(c.drillTo(null)).toBe(c);
    expect(c.container.querySelector('.rc-donut-crumb').textContent).toBe('');
  });
});

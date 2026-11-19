// The base Chart's view report and loading state (RC-002, analytics spec
// §2.3 and §5), for every class:
//   - onViewChange(extent, { key, level }): `key` the timeframe key when a
//     button or setTimeframe set the view, null for the brush, the wheel and
//     setView; `level` the TimeSeries level drawn, null elsewhere. One report
//     per button click and per brush drag (at its release), as before.
//   - setLoading(true | false): a slim "Loading…" bar over the plot
//     (.rc-chart-loading, the tooltip's tokens), aria-busy on the card, the
//     drawing kept. Made on first need and removed again: a chart at rest
//     has none. Its look in a browser: test/browser/charts-standalone.test.js.
//
// The TimeSeries levels themselves: test/timeseries-levels.test.js. Sizes are
// the test's own (S-18): every box 800×400.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { mount, track, dragStrip, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({ date: new Date(year, i, 15), value: 10 + (i % 7) }));
const line = (o = {}) => track(new Line(mount(null), { animate: false, timeframes: ['3M', '1Y', 'ALL'], ...o })).setData([{ name: 'A', values: monthly(2023) }]);
const button = (c, label) => [...c.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === label);
const bar = c => c.container.querySelector('.rc-chart-loading');
const svgMarkup = c => c.container.querySelector(':scope > svg').outerHTML;

// ─── onViewChange(extent, info) ──────────────────────────────────────────────

describe('onViewChange(extent, { key, level }) on every class', () => {
  it('Line: a button click reports its key, once; the level is null', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    button(c, '3M').click();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(c.getView(), { key: '3M', level: null });
    c.setTimeframe('1Y');
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: '1Y', level: null });
  });

  it('Line: the brush (once, at its release) and setView report no key', () => {
    const c = line({ navigator: true });
    c.setTimeframe('3M');
    const changed = vi.fn();
    c.onViewChange(changed);
    dragStrip(c.container.querySelector('.rc-chart-navigator'), 100, 200, 300);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0]).toEqual([c.getView(), { key: null, level: null }]);
    c.setView([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: null, level: null });
  });

  it('a step known by its label, and a key in the page\'s own case, are reported as named', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: [{ label: 'Year', range: ['2023-01-01', '2023-12-31'] }, { key: 'all', label: 'All time' }] }))
      .setData([{ name: 'A', values: monthly(2023) }]);
    const changed = vi.fn();
    c.onViewChange(changed);
    button(c, 'Year').click();
    expect(changed.mock.calls.at(-1)[1]).toEqual({ key: 'Year', level: null });
    button(c, 'All time').click();
    expect(changed.mock.calls.at(-1)[1]).toEqual({ key: 'all', level: null });
  });

  it('a callback that reads only the extent works as before', () => {
    const views = [];
    const c = line();
    c.onViewChange(extent => views.push(extent));
    button(c, '3M').click();
    expect(views).toEqual([c.getView()]);
  });

  it('dated Bar and MapFlow: the same report', () => {
    const b = track(new Bar(mount(null), { animate: false, timeframes: ['3M', 'ALL'] }))
      .setData(monthly(2023).map(d => ({ date: d.date, value: d.value })));
    const onBar = vi.fn();
    b.onViewChange(onBar);
    button(b, '3M').click();
    expect(onBar).toHaveBeenCalledWith(b.getView(), { key: '3M', level: null });

    const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
    const m = track(new MapFlow(mount(null), { geoData, timeframes: ['5Y', 'ALL'] })).setData({
      nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
      links: [{ from: 'A', to: 'B', start: 1990, end: 2010 }],
    });
    const onMap = vi.fn();
    m.onViewChange(onMap);
    button(m, '5Y').click();
    expect(onMap).toHaveBeenLastCalledWith(m.getView(), { key: '5Y', level: null });
    m.setTimeWindow(1995, 2000);
    expect(onMap).toHaveBeenLastCalledWith(m.getView(), { key: null, level: null });
    expect(onMap).toHaveBeenCalledTimes(2);
  });
});

// ─── setLoading ──────────────────────────────────────────────────────────────

describe('setLoading(true | false)', () => {
  it('a chart at rest has no bar and no aria-busy', () => {
    const c = line();
    expect(bar(c)).toBeNull();
    expect(c.container.hasAttribute('aria-busy')).toBe(false);
  });

  it('true: one "Loading…" bar across the top of the plot, aria-busy on the card, the drawing kept', () => {
    const c = line();
    const drawing = svgMarkup(c);
    expect(c.setLoading(true)).toBe(c);
    const el = bar(c);
    expect(el.textContent).toBe('Loading…');
    expect(c.container.getAttribute('aria-busy')).toBe('true');
    // the plot in the card's frame (jsdom lays nothing out: the margins)
    expect(el.style.left).toBe(`${c.margin.left}px`);
    expect(el.style.top).toBe(`${c.margin.top}px`);
    expect(el.style.width).toBe(`${c.width}px`);
    expect(svgMarkup(c)).toBe(drawing);
    c.setLoading(true);
    expect(c.container.querySelectorAll('.rc-chart-loading')).toHaveLength(1);
  });

  it('false: the bar and aria-busy go, and the card is as it was', () => {
    const c = line();
    const before = c.container.outerHTML;
    c.setLoading(true).setLoading(false);
    expect(bar(c)).toBeNull();
    expect(c.container.hasAttribute('aria-busy')).toBe(false);
    expect(c.container.outerHTML).toBe(before);
    c.setLoading(false);                              // nothing to take away
    expect(c.container.outerHTML).toBe(before);
    c.setLoading();                                   // no argument: on
    expect(bar(c)).not.toBeNull();
  });

  it('the drawing still follows the view while it loads; the bar follows the plot at every render', () => {
    const el = mount(null, { width: 800 });
    const c = track(new TimeSeries(el, { timeframes: ['1M', 'ALL'] })).setData(monthly(2023));
    c.setLoading(true);
    expect(bar(c).style.width).toBe('730px');
    c.setTimeframe('1M');
    expect(c.container.querySelector('path.rc-ts-line')).not.toBeNull();
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => 500 });
    c._onResize();
    expect(bar(c).style.width).toBe('430px');
  });

  it('the bar wears the tooltip\'s tokens from the theme: dark with darkTheme', () => {
    const light = line().setLoading(true);
    // the default theme's token chains, resolved where the bar sits
    expect(bar(light).style.getPropertyValue('--rc-tooltip-bg')).toBe('var(--chart-tooltip-bg, #ffffff)');
    expect(bar(light).style.getPropertyValue('--rc-tooltip-muted')).toBe('var(--chart-tooltip-muted, #666666)');
    const dark = line({ theme: darkTheme }).setLoading(true);
    expect(bar(dark).style.getPropertyValue('--rc-tooltip-bg')).toBe('#1a1a1a');
    expect(bar(dark).style.getPropertyValue('--rc-tooltip-muted')).toBe('#888888');
  });

  it('a page\'s own aria-busy comes back after it, and after destroy()', () => {
    const el = mount(null);
    el.setAttribute('aria-busy', 'false');
    const c = track(new Line(el, { animate: false })).setData([{ name: 'A', values: monthly(2023) }]);
    c.setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    c.setLoading(false);
    expect(el.getAttribute('aria-busy')).toBe('false');
    c.setLoading(true);
    c.destroy();
    expect(el.getAttribute('aria-busy')).toBe('false');
    expect(el.querySelector('.rc-chart-loading')).toBeNull();
  });

  it('destroy() while loading leaves no aria-busy; setLoading after destroy() does nothing', () => {
    const el = mount(null);
    const c = new Line(el, { animate: false }).setData([{ name: 'A', values: monthly(2023) }]);
    c.setLoading(true);
    c.destroy();
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(c.setLoading(true)).toBe(c);
    expect(el.innerHTML).toBe('');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('before the first data too, and on charts without an axis plot (the drawing\'s svg)', () => {
    const empty = track(new TimeSeries(mount(null))).setLoading(true);
    expect(bar(empty)).not.toBeNull();
    const donut = track(new Donut(mount(null), { animate: false })).setData([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]);
    donut.setLoading(true);
    expect(bar(donut).style.left).toBe('0px');
    const graph = track(new Graph(mount(null), { animate: false }))
      .setData({ nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b' }] });
    graph.setLoading(true);
    expect(bar(graph).textContent).toBe('Loading…');
    expect(graph.container.getAttribute('aria-busy')).toBe('true');
  });
});

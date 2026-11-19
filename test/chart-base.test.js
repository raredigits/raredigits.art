import { describe, it, expect, vi } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Map as GeoMap } from '../assets/charts/src/charts/Map.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track, brushDrag } from './helpers.js';

// The base Chart (core/Chart.js), what every chart class inherits from it:
// the card's slots — `controls`, a page element moved into the card (with its
// listeners), and handed back on destroy() — the margin merge (C-17), the
// card height around a wrapping header and footer (C-32), page callbacks
// after destroy() (C-33) and whenReady() (K-12).
//
// Moved from chart-core-7a.test.js (RC-026):
//   'C-17: a partial margin keeps the class defaults of the sides left out' → same describe
//   'C-32: the plot keeps 80px when the header and footer wrap' → same describe
//   'C-33: no page callback after destroy()' → same describe
//   'K-12: whenReady() on every chart' → same describe

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
  { date: '2026-03-01', value: 2 },
];
const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, 1), value: 100 + i,
}));

describe('Chart — controls slot', () => {
  it('moves the given element inside the card, keeping its listeners', () => {
    document.body.innerHTML = '<div id="c"></div><div id="ctl"><button id="b">x</button></div>';
    let clicks = 0;
    document.getElementById('b').addEventListener('click', () => { clicks++; });
    track(new Bar('#c', { controls: '#ctl', source: 'Source: test' }));
    const ctl = document.getElementById('ctl');
    expect(ctl.parentElement.id).toBe('c');
    expect(ctl.classList.contains('rc-chart-controls')).toBe(true);
    document.getElementById('b').click();
    expect(clicks).toBe(1);
  });

  it('hands the page\'s own controls element back to its place among its siblings', () => {
    const page = mount('page');
    const before = document.createElement('p'), after = document.createElement('p');
    const ctl = document.createElement('div');
    ctl.id = 'ctl';
    page.append(before, ctl, after);
    const c = new Line(mount(null), { animate: false, controls: '#ctl' }).setData(dateSeries);
    expect(ctl.parentNode).toBe(c.container);
    c.destroy();
    expect(ctl.parentNode).toBe(page);
    expect(ctl.previousSibling).toBe(before);
    expect(ctl.nextSibling).toBe(after);
    expect(ctl.classList.contains('rc-chart-controls')).toBe(false);
  });

  it('leaves the controls alone once the page has given them to a newer chart', () => {
    const page = mount('page');
    const ctl = document.createElement('div');
    page.appendChild(ctl);
    const old = new Line(mount(null), { animate: false, controls: ctl }).setData(dateSeries);
    const fresh = track(new Line(mount(null), { animate: false, controls: ctl })).setData(dateSeries);
    old.destroy();
    expect(ctl.parentNode).toBe(fresh.container);
    expect(ctl.classList.contains('rc-chart-controls')).toBe(true);
  });
});

// ─── C-17: the margin merge ──────────────────────────────────────────────────

describe('C-17: a partial margin keeps the class defaults of the sides left out', () => {
  it.each([
    ['Map', el => new GeoMap(el, { margin: { top: 10 } })],
    ['Graph', el => new Graph(el, { margin: { top: 10 } })],
    ['MultiChart', el => new MultiChart(el, { margin: { top: 10 } })],
  ])('%s: the other sides stay 0', (_, make) => {
    const c = track(make(mount(null)));
    expect(c.margin).toEqual({ top: 10, right: 0, bottom: 0, left: 0 });
  });

  it('a Map with margin.top still spans the card — no 70px gutter on the right', () => {
    const c = track(new GeoMap(mount(null, { width: 720 }), { margin: { top: 10 } }));
    expect(c.width).toBe(720);
  });

  it('Graph flow: timeframe buttons stay flush right with a partial margin', () => {
    const c = track(new Graph(mount(null), { view: 'flow', timeframes: ['ALL'], margin: { bottom: 12 } }));
    expect(c.container.querySelector('.rc-chart-range-row').classList.contains('rc-chart-range-row--flush')).toBe(true);
  });

  it('the axis charts keep working out each side themselves', () => {
    expect(track(new Line(mount(null), { margin: { top: 4 } })).margin).toEqual({ top: 4, right: 64, bottom: 18, left: 0 });
    expect(track(new Bar(mount(null), { margin: { left: 20 } })).margin.right).toBe(64);
  });

  it('a full margin is used as given', () => {
    const margin = { top: 1, right: 2, bottom: 3, left: 4 };
    expect(track(new GeoMap(mount(null), { margin })).margin).toEqual(margin);
  });
});

// ─── C-32: the card height ───────────────────────────────────────────────────

describe('C-32: the plot keeps 80px when the header and footer wrap', () => {
  // jsdom has no layout: the header is given the height it would wrap to.
  const headerHeight = (c, h) =>
    Object.defineProperty(c.container.querySelector('.rc-chart-header'), 'offsetHeight', { configurable: true, get: () => h });

  it('the card grows so the plot keeps 80px', () => {
    const c = track(new Line(mount(null), { animate: false, height: 200, title: 'A title', subtitle: 'A subtitle' }));
    headerHeight(c, 180);
    c.setData(monthly(2023));
    // 200 − margins 10 + 18 − header 180 + 8 = −16: the card takes 96px more
    expect(c.height).toBe(80);
    expect(c.container.style.height).toBe('296px');
    expect(+c.container.querySelector('.rc-overlay').getAttribute('height')).toBe(80);   // the plot drawn
  });

  it('and returns to `height` once the parts fit again', () => {
    const c = track(new Line(mount(null), { animate: false, height: 200, title: 'A title' }));
    headerHeight(c, 180);
    c.setData(monthly(2023));
    headerHeight(c, 20);
    c.render();
    expect(c.container.style.height).toBe('200px');
    expect(c.height).toBe(200 - 10 - 18 - 28);
  });

  it('a card with room to spare is left as it is', () => {
    const c = track(new Line(mount(null), { animate: false, height: 300, title: 'A title' })).setData(monthly(2023));
    expect(c.container.style.height).toBe('300px');
    expect(c.height).toBe(300 - 10 - 18 - 8);
  });

  it('a height the page set on the card stays', () => {
    const c = track(new Line(mount(null), { animate: false, height: 200, title: 'A title' }));
    c.container.style.height = '150px';
    headerHeight(c, 180);
    c.setData(monthly(2023));
    expect(c.container.style.height).toBe('150px');
  });

  it('destroy() gives the card back its own height', () => {
    const el = mount(null);
    el.style.height = '50px';
    const c = new Line(el, { animate: false, height: 200, title: 'A title' });
    headerHeight(c, 180);
    c.setData(monthly(2023));
    c.destroy();
    expect(el.style.height).toBe('50px');
  });
});

// ─── C-33: page callbacks after destroy() ────────────────────────────────────
// Graph's own callbacks (onSelect, onFoldChange): graph-flow.test.js.

describe('C-33: no page callback after destroy()', () => {
  // A drag on the navigator strip that the page's destroy() lands in the
  // middle of: d3 finishes the gesture on window listeners, after the strip
  // is gone.
  const strip = c => c.container.querySelector('.rc-chart-navigator');

  it('onViewChange: a drag that ends after destroy() reports nothing', async () => {
    const c = new Line(mount(null), { animate: false, navigator: true }).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    const drag = brushDrag(strip(c), 100).move(300);
    c.destroy();
    drag.end();
    await new Promise(requestAnimationFrame);       // and no late frame either
    expect(changed).not.toHaveBeenCalled();
  });

  it('onViewChange: setView and setTimeframe after destroy() report nothing', () => {
    const c = new Line(mount(null), { animate: false, timeframes: ['3M', 'ALL'] }).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    const button = c.container.querySelector('.rc-range-btn');
    c.destroy();
    c.setView([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    c.setTimeframe('3M');
    button.click();
    expect(changed).not.toHaveBeenCalled();
  });

  it('onScaleChange: a held Lin/Log button clicked after destroy() reports nothing', () => {
    const c = new Line(mount(null), { animate: false, scaleToggle: true }).setData(monthly(2023));
    const changed = vi.fn();
    c.onScaleChange(changed);
    const button = c.container.querySelector('.rc-scale-btn');
    c.destroy();
    button.click();
    c.setYScale('log');
    expect(changed).not.toHaveBeenCalled();
  });

  it('a standalone Overview: onBrush stays quiet after destroy()', () => {
    const el = mount(null);
    const ov = new Overview(el);
    const onBrush = vi.fn();
    ov.setData(monthly(2023), onBrush);
    const drag = brushDrag(el, 100).move(300);
    expect(onBrush).toHaveBeenCalledTimes(1);       // the live move, before destroy()
    ov.destroy();
    drag.move(320).end();
    expect(onBrush).toHaveBeenCalledTimes(1);
  });

  it('before destroy() the same callbacks fire', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true, scaleToggle: true })).setData(monthly(2023));
    const view = vi.fn(), scale = vi.fn();
    c.onViewChange(view).onScaleChange(scale);
    // the click first: d3 swallows the click that follows a drag, as a browser does
    c.container.querySelector('.rc-scale-btn').click();
    brushDrag(strip(c), 100).move(300).end();
    expect(view).toHaveBeenCalledTimes(1);
    expect(scale).toHaveBeenCalledWith({ scale: 'log', axis: 'y' });
  });
});

// ─── K-12: whenReady() ───────────────────────────────────────────────────────
// Map's own geometry load: map.test.js.

describe('K-12: whenReady() on every chart', () => {
  it.each([
    ['Line', el => new Line(el, { animate: false }).setData(monthly(2023))],
    ['Bar', el => new Bar(el, { animate: false }).setData([{ label: 'a', value: 1 }])],
    ['Donut', el => new Donut(el, { animate: false }).setData([{ label: 'a', value: 1 }])],
    ['Gauge', el => new Gauge(el, { animate: false }).setData(40)],
    ['Sankey', el => new Sankey(el).setData({ nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', value: 1 }] })],
    ['MultiChart', el => new MultiChart(el, {})],
    ['Map', el => new GeoMap(el, {})],
  ])('%s: resolves with the chart', async (_, make) => {
    const c = track(make(mount(null)));
    await expect(c.whenReady()).resolves.toBe(c);
  });

  it('waits for the work a class puts in this._ready', async () => {
    const c = track(new Line(mount(null), { animate: false }));
    let finish;
    c._ready = new Promise(resolve => { finish = resolve; });
    const done = vi.fn();
    c.whenReady().then(done);
    await Promise.resolve();
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    finish();
    await c.whenReady();
    expect(done).toHaveBeenCalledWith(c);
  });

  it('Graph waits for its queue of fetches and renders, and resolves with the chart', async () => {
    const c = track(new Graph(mount(null), {}));
    await expect(c.whenReady()).resolves.toBe(c);
    c.setData({ nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b' }] });
    await expect(c.whenReady()).resolves.toBe(c);
  });

  it('a callback gets the chart as this', () => {
    const c = track(new Line(mount(null), { animate: false })).setData([
      { date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 }, { date: '2026-03-01', value: 3 }]);
    let self = null;
    c.onViewChange(function () { self = this; });
    c.setView(['2026-01-15', '2026-02-15']);
    expect(self).toBe(c);
  });
});

// RC-066: the header stacks on a wider card when the title would be cut
describe('the header stacks when the title would be cut beside the buttons (RC-066)', () => {
  it('cut: stacked; fits: side by side; measured again when the card changes', async () => {
    const { TimeSeries } = await import('../assets/charts/src/charts/TimeSeries.js');
    const host = mount(null);
    const c = track(new TimeSeries(host, { title: 'Site visits', timeframes: true }));
    const title = host.querySelector('.rc-chart-title');
    let cut = true;
    Object.defineProperty(title, 'scrollWidth', { configurable: true, get: () => (cut ? 400 : 100) });
    Object.defineProperty(title, 'clientWidth', { configurable: true, get: () => 120 });
    c.setData([{ date: '2024-01-01', value: 1 }, { date: '2024-02-01', value: 2 }]);
    const header = host.querySelector('.rc-chart-header');
    expect(header.classList.contains('rc-chart-header--stacked')).toBe(true);
    cut = false;
    c.setOptions?.({}); c._headerFitKey = null; c.render();
    expect(header.classList.contains('rc-chart-header--stacked')).toBe(false);
  });

  it('a subtitle squeezed past two lines beside the buttons: stacked; two lines: side by side', async () => {
    const { TimeSeries } = await import('../assets/charts/src/charts/TimeSeries.js');
    const host = mount(null);
    const c = track(new TimeSeries(host, { title: 'Visits', subtitle: 'A long sentence of context', timeframes: true }));
    const header = host.querySelector('.rc-chart-header');
    const subtitle = host.querySelector('.rc-chart-subtitle');
    subtitle.style.lineHeight = '16px';
    // jsdom lays nothing out: the subtitle's height beside the buttons
    let lines = 6;
    Object.defineProperty(subtitle, 'offsetHeight', { configurable: true, get: () => lines * 16 });
    c.setData([{ date: '2024-01-01', value: 1 }, { date: '2024-02-01', value: 2 }]);
    expect(header.classList.contains('rc-chart-header--stacked')).toBe(true);
    lines = 2;
    c._headerFitKey = null; c.render();
    expect(header.classList.contains('rc-chart-header--stacked')).toBe(false);
  });
});

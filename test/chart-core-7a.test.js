// The base Chart and the navigator strip (core/Chart.js, charts/Overview.js,
// index.js) — the bugs closed in step 7a:
//
//   C-17  a partial `margin` keeps the class's other sides (no 70px gutter)
//   C-32  a card whose header and footer wrap keeps an 80px plot
//   C-33  no page callback after destroy()
//   C-34  a view of the whole data lights ALL, not the first step covering it
//   K-12  whenReady() on every chart
//   K-16  live brush moves render once per animation frame; the end at once
//   K-18  window.RareChartsConfig = { injectStyles: false }
//   C-24, K-17, K-19 — the rules in rare-charts.css; what they do in a real
//         engine (hover, container width, grid rows): test/browser/charts-card-layout
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Map as GeoMap } from '../assets/charts/src/charts/Map.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track } from './helpers.js';

const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, 1), value: 100 + i,
}));
const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
const activeButton = c => c.container.querySelector('.rc-range-btn.active')?.textContent ?? null;

// ─── C-17 ─────────────────────────────────────────────────────────────────────

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
    const c = track(new GeoMap(mount(null), { margin: { top: 10 } }));
    expect(c.width).toBe(800);
  });

  it('Graph flow: timeframe buttons stay flush right with a partial margin', () => {
    const c = track(new Graph(mount(null), { view: 'flow', timeframes: ['ALL'], margin: { bottom: 12 } }));
    expect(c.container.querySelector('.rc-chart-range-row').classList.contains('rc-chart-range-row--flush')).toBe(true);
  });

  it('the axis charts keep working out each side themselves', () => {
    expect(track(new Line(mount(null), { margin: { top: 4 } })).margin).toEqual({ top: 4, right: 64, bottom: 18, left: 0 });
    expect(track(new Bar(mount(null), { margin: { left: 20 } })).margin.right).toBe(65);
  });

  it('a full margin is used as given', () => {
    const margin = { top: 1, right: 2, bottom: 3, left: 4 };
    expect(track(new GeoMap(mount(null), { margin })).margin).toEqual(margin);
  });
});

// ─── C-32 ─────────────────────────────────────────────────────────────────────

describe('C-32: the plot keeps 80px when the header and footer wrap', () => {
  // jsdom has no layout: the header is given the height it would wrap to.
  const headerHeight = (c, h) =>
    Object.defineProperty(c._headerEl, 'offsetHeight', { configurable: true, get: () => h });

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

// ─── C-33 ─────────────────────────────────────────────────────────────────────

describe('C-33: no page callback after destroy()', () => {
  const brushListener = (ov, type) => {
    const fn = ov._brush.on(type);
    const node = ov.gBrush.node();
    return selection => fn.call(node, { type, sourceEvent: new MouseEvent(type === 'end' ? 'mouseup' : 'mousemove'), selection });
  };

  it('onViewChange: a drag that ends after destroy() reports nothing', () => {
    const c = new Line(mount(null), { animate: false, navigator: true }).setData(monthly(2023));
    const changed = vi.fn();
    c.onViewChange(changed);
    const end = brushListener(c._navigator, 'end');
    c.destroy();
    end([100, 300]);
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
    const ov = new Overview(mount(null));
    const onBrush = vi.fn();
    ov.setData(monthly(2023), onBrush);
    const end = brushListener(ov, 'end');
    ov.destroy();
    end([100, 300]);
    expect(onBrush).not.toHaveBeenCalled();
  });

  it('before destroy() the same callbacks fire', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true, scaleToggle: true })).setData(monthly(2023));
    const view = vi.fn(), scale = vi.fn();
    c.onViewChange(view).onScaleChange(scale);
    brushListener(c._navigator, 'end')([100, 300]);
    c.container.querySelector('.rc-scale-btn').click();
    expect(view).toHaveBeenCalledTimes(1);
    expect(scale).toHaveBeenCalledWith({ scale: 'log', axis: 'y' });
  });
});

// ─── C-34 ─────────────────────────────────────────────────────────────────────

describe('C-34: several steps cover the same window', () => {
  // Feb–Nov 2024: YTD, 1Y and ALL all resolve to the whole data.
  const year = () => Array.from({ length: 10 }, (_, i) => ({ date: new Date(2024, i + 1, 1), value: 10 + i }));
  const make = (o = {}) => track(new Line(mount(null), { animate: false, timeframes: ['1M', 'YTD', '1Y', 'ALL'], ...o })).setData(year());

  it('the whole data lights ALL, not YTD — the first step in the list that covers it', () => {
    expect(activeButton(make())).toBe('ALL');
  });

  it('a step chosen by click or setTimeframe() stays lit', () => {
    const c = make();
    c.setTimeframe('YTD');
    expect(activeButton(c)).toBe('YTD');
    c.container.querySelectorAll('.rc-range-btn')[2].click();   // 1Y
    expect(activeButton(c)).toBe('1Y');
  });

  it('after a brush or setView over the whole data: ALL, not the first match', () => {
    const c = make({ navigator: true });
    c.setTimeframe('YTD');
    c.setView(c._getDataExtent());
    expect(activeButton(c)).toBe('ALL');
  });

  it('defaultTimeframe stays lit while its view holds', () => {
    const c = make({ defaultTimeframe: 'YTD' });
    expect(activeButton(c)).toBe('YTD');
    c.setView([new Date(2024, 5, 1), new Date(2024, 8, 1)]);
    c.setView(c._getDataExtent());
    expect(activeButton(c)).toBe('ALL');
  });

  it('a window short of the data lights the first step that matches it', () => {
    const c = make();
    c.setTimeframe('1M');
    expect(activeButton(c)).toBe('1M');
    c.setView(c.getView());
    expect(activeButton(c)).toBe('1M');
  });

  it("'MAX' counts as the whole data too; a custom range covering it does not outrank it", () => {
    const [a, b] = [new Date(2024, 1, 1), new Date(2024, 10, 1)];
    const c = make({ timeframes: [{ key: 'SPAN', range: [a, b] }, 'YTD', 'MAX'] });
    expect(activeButton(c)).toBe('MAX');
  });
});

// ─── K-12 ─────────────────────────────────────────────────────────────────────

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

// ─── K-16 ─────────────────────────────────────────────────────────────────────

describe('K-16: a brush drag renders once per animation frame', () => {
  const listeners = c => {
    const ov = c._navigator, node = ov.gBrush.node();
    const at = type => selection => ov._brush.on(type).call(node, {
      type, sourceEvent: new MouseEvent(type === 'end' ? 'mouseup' : 'mousemove'), selection });
    return { brush: at('brush'), end: at('end'), ov };
  };

  it('live moves land once per frame, the latest window winning, silently', async () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const render = vi.spyOn(c, 'render');
    const changed = vi.fn();
    c.onViewChange(changed);
    const { brush, ov } = listeners(c);
    for (let i = 0; i < 10; i++) brush([100 + i * 10, 300 + i * 10]);
    expect(render).not.toHaveBeenCalled();
    await frame();
    expect(render).toHaveBeenCalledTimes(1);
    const want = [ov._xScale.invert(190), ov._xScale.invert(390)];
    expect(c.getView().map(Number)).toEqual(want.map(Number));
    expect(changed).not.toHaveBeenCalled();
  });

  it('the end of the drag applies at once, reports once and drops the pending frame', async () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const render = vi.spyOn(c, 'render');
    const changed = vi.fn();
    c.onViewChange(changed);
    const { brush, end, ov } = listeners(c);
    brush([100, 300]);
    brush([120, 320]);
    end([150, 350]);
    expect(render).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(c.getView().map(Number)).toEqual([ov._xScale.invert(150), ov._xScale.invert(350)].map(Number));
    await frame();
    await frame();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('destroy() during a drag cancels the pending frame', async () => {
    const c = new Line(mount(null), { animate: false, navigator: true }).setData(monthly(2023));
    const { brush } = listeners(c);
    brush([100, 300]);
    const setView = vi.spyOn(c, 'setView');
    c.destroy();
    await frame();
    expect(setView).not.toHaveBeenCalled();
  });

  it('a relation chart works out its ties\' extent and strip series once per data set', () => {
    const g = track(new Graph(mount(null), { view: 'flow', navigator: true, animate: false }));
    g.setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ from: 'a', to: 'b', start: '2024-01', end: '2024-06' }],
    });
    const series = g._getNavigatorData();
    expect(g._getNavigatorData()).toBe(series);
    expect(g._getDataExtent()).toBe(g._getDataExtent());
    g.setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ from: 'a', to: 'b', start: '2023-01', end: '2024-06' }],
    });
    expect(g._getNavigatorData()).not.toBe(series);
    expect(g._getDataExtent()[0].getUTCFullYear()).toBe(2023);
  });
});

// ─── K-18 ─────────────────────────────────────────────────────────────────────

describe('K-18: the injected stylesheet can be turned off', () => {
  afterEach(() => {
    delete window.RareChartsConfig;
    document.getElementById('rc-base-styles')?.remove();
  });
  const load = async () => {
    document.getElementById('rc-base-styles')?.remove();
    vi.resetModules();
    await import('../assets/charts/src/index.js');
  };

  it('by default the bundle adds its <style id="rc-base-styles">', async () => {
    await load();
    expect(document.querySelector('style#rc-base-styles')).not.toBeNull();
  });

  it('window.RareChartsConfig = { injectStyles: false } adds none', async () => {
    window.RareChartsConfig = { injectStyles: false };
    await load();
    expect(document.getElementById('rc-base-styles')).toBeNull();
  });

  it('a <link id="rc-base-styles"> the page loads itself also stops it', async () => {
    document.getElementById('rc-base-styles')?.remove();
    const link = document.createElement('link');
    link.id = 'rc-base-styles';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    vi.resetModules();
    await import('../assets/charts/src/index.js');
    expect(document.querySelectorAll('#rc-base-styles')).toHaveLength(1);
    expect(document.querySelector('style#rc-base-styles')).toBeNull();
  });
});

// ─── C-24, K-17, K-19: the rules in rare-charts.css ──────────────────────────

describe('rare-charts.css', () => {
  const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
  const rules = selector => {
    const found = [];
    root.walkRules(r => { if (r.selectors.includes(selector)) found.push(r); });
    return found;
  };
  const decl = (selector, prop) => rules(selector).flatMap(r => r.nodes.filter(n => n.prop === prop)).at(-1)?.value;
  // [ids, classes + attributes + pseudo-classes, elements] — enough for these selectors
  const specificity = s => [
    (s.match(/#[\w-]+/g) ?? []).length,
    (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length,
    (s.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/[a-z][\w-]*/gi) ?? []).length,
  ];
  const outranks = (a, b) => {
    const [x, y] = [specificity(a), specificity(b)];
    const i = x.findIndex((v, k) => v !== y[k]);
    return i >= 0 && x[i] > y[i];
  };
  const HOST_HOVER = 'button:hover';   // Rare Styles: button:hover:where(.rd, .rd *) { background: … }

  it('C-24: a hovered range button keeps its own background', () => {
    expect(decl('.rc-range-btn:hover', 'background-color')).toBe('transparent');
    expect(outranks('.rc-range-btn:hover', HOST_HOVER)).toBe(true);
  });

  it('C-24: the Lin/Log fill outranks a host button:hover background, in both states', () => {
    const fills = [];
    root.walkDecls(/^background(-image)?$/, d => {
      if (d.value.includes('--rc-scale-btn-fill')) fills.push(d.parent.selector);
    });
    expect(fills).toHaveLength(2);
    fills.forEach(s => expect(outranks(s, HOST_HOVER), s).toBe(true));
  });

  it('K-17: the card is a size container and the header stacks by its width', () => {
    expect(decl('.rc-chart', 'container')).toMatch(/inline-size/);
    const stacking = [];
    root.walkAtRules(/^(media|container)$/, at => {
      at.walkRules(r => { if (r.selectors.includes('.rc-chart-header')) stacking.push(at.name); });
    });
    expect(stacking).toEqual(['container']);
  });

  it('K-19: with the legend on the right the controls sit between the navigator and the footer', () => {
    const row = sel => decl(`.rc-chart--legend-right > ${sel}`, 'grid-row');
    const [nav, controls, footer] = ['.rc-chart-navigator', '.rc-chart-controls', '.rc-chart-footer'].map(row).map(Number);
    expect(controls).toBe(nav + 1);
    expect(footer).toBe(controls + 1);
    const aside = decl('.rc-chart--legend-right > .rc-chart-legend-aside', 'grid-row');
    expect(aside).toBe(`1 / ${footer + 1}`);
    expect(decl('.rc-chart--legend-right', 'grid-template-rows').split(/\s+/)).toHaveLength(footer);
  });
});

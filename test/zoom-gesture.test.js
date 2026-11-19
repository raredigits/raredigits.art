import { describe, it, expect, vi, afterEach } from 'vitest';
import * as d3 from 'd3';
import {
  zoomFilter, zoomHintText, isApplePlatform, ZoomHint, bindZoom, boxInCard, ZOOM_HINT_MS,
} from '../assets/charts/src/core/zoomGesture.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { defaultTheme, darkTheme } from '../assets/charts/src/core/theme.js';
import { fixture } from './fixtures/graph.js';
import { mount, track } from './helpers.js';

// T-09: the wheel zooms with Ctrl or ⌘ only, on a phone two fingers move
// the chart and one finger scrolls the page; a plain wheel or a one-finger
// drag shows a hint. One rule (core/zoomGesture.js) for every d3.zoom:
// TimeSeries, Map and MapFlow with zoom: true, Graph. The same in a real
// browser, with touch emulation: test/browser/charts-zoom-gesture.test.js.

afterEach(() => { vi.useRealTimers(); });

// ─── Events as the browser sends them ────────────────────────────────────────

const wheel = (opts = {}) => new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100, ...opts });

// jsdom has TouchEvent but no Touch: the lists are set on a plain event.
// points: [[clientX, clientY], …], the fingers down after this event.
function touch(type, points, { cancelable = true, changed = points } = {}) {
  const e = new Event(type, { bubbles: true, cancelable });
  const list = pts => pts.map(([clientX, clientY, identifier]) => ({ clientX, clientY, identifier }));
  Object.defineProperty(e, 'touches', { value: list(points) });
  Object.defineProperty(e, 'changedTouches', { value: list(changed) });
  return e;
}

// ─── The filter ──────────────────────────────────────────────────────────────

describe('zoomFilter: what the chart takes', () => {
  const ev = (type, init = {}) => ({ type, ctrlKey: false, metaKey: false, button: 0, ...init });
  const fingers = n => Array.from({ length: n }, (_, i) => ({ identifier: i, clientX: i * 10, clientY: 0 }));

  it.each([
    ['a plain wheel', ev('wheel'), false],
    ['Ctrl + wheel (a trackpad pinch too)', ev('wheel', { ctrlKey: true }), true],
    ['⌘ + wheel', ev('wheel', { metaKey: true }), true],
    ['a mousedown, main button', ev('mousedown'), true],
    ['a mousedown, secondary button', ev('mousedown', { button: 2 }), false],
    ['Ctrl + mousedown (a right click on macOS)', ev('mousedown', { ctrlKey: true }), false],
    ['a double click', ev('dblclick'), true],
    ['one finger down', ev('touchstart', { touches: fingers(1) }), false],
    ['a second finger down', ev('touchstart', { touches: fingers(2) }), true],
    ['three fingers', ev('touchstart', { touches: fingers(3) }), true],
  ])('%s → %s', (_, event, expected) => {
    expect(zoomFilter(event)).toBe(expected);
  });
});

// ─── The words ───────────────────────────────────────────────────────────────

describe('the hint says ⌘ on Apple platforms, Ctrl elsewhere', () => {
  it.each([
    [{ userAgentData: { platform: 'macOS' }, platform: 'MacIntel' }, true],
    [{ userAgentData: { platform: 'Windows' }, platform: 'Win32' }, false],
    [{ userAgentData: { platform: '' }, platform: 'MacIntel' }, true],     // an empty one falls back
    [{ platform: 'MacIntel' }, true],
    [{ platform: 'iPhone' }, true],
    [{ platform: 'iPad' }, true],
    [{ platform: 'Win32' }, false],
    [{ platform: 'Linux armv8l' }, false],
    [{ userAgentData: { platform: 'Chrome OS' } }, false],
    [{}, false],
  ])('%j → Apple %s', (nav, apple) => {
    expect(isApplePlatform(nav)).toBe(apple);
    expect(zoomHintText('wheel', nav)).toBe(apple ? 'Hold ⌘ to zoom' : 'Hold Ctrl to zoom');
  });

  it('a one-finger drag: "Use two fingers to move"', () => {
    expect(zoomHintText('touch', { platform: 'iPhone' })).toBe('Use two fingers to move');
    expect(zoomHintText('touch', { platform: 'Linux armv8l' })).toBe('Use two fingers to move');
  });
});

// ─── The hint ────────────────────────────────────────────────────────────────

describe('ZoomHint', () => {
  const box = () => ({ x: 10, y: 20, width: 300, height: 100 });
  const hintIn = el => el.querySelector('.rc-zoom-hint');

  it('is made on first need: nothing in the card before show()', () => {
    const card = mount(null);
    const hint = new ZoomHint(card, defaultTheme, box);
    expect(hintIn(card)).toBeNull();
    hint.hide();                                   // nothing to hide, no element made
    expect(hintIn(card)).toBeNull();
    hint.show('wheel');
    const el = hintIn(card);
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('Hold Ctrl to zoom');   // jsdom's platform is ''
    expect(el.classList.contains('is-visible')).toBe(true);
    // centred on the plot's box (CSS moves it back by half its own size)
    expect(el.style.left).toBe('160px');
    expect(el.style.top).toBe('70px');
    hint.show('touch');
    expect(card.querySelectorAll('.rc-zoom-hint')).toHaveLength(1);   // one element, new words
    expect(el.textContent).toBe('Use two fingers to move');
    hint.destroy();
  });

  it('stays while events come and fades 1.2 s after the last one', () => {
    vi.useFakeTimers();
    const card = mount(null);
    const hint = new ZoomHint(card, defaultTheme, box);
    const visible = () => hintIn(card).classList.contains('is-visible');
    hint.show('wheel');
    vi.advanceTimersByTime(ZOOM_HINT_MS - 1);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(false);
    // a wheel that keeps turning keeps it up: each event starts the fade over
    hint.show('wheel');
    vi.advanceTimersByTime(1000);
    hint.show('wheel');
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(visible()).toBe(false);
    expect(ZOOM_HINT_MS).toBe(1200);
  });

  it('wears the tooltip tokens of the chart theme, dark too', () => {
    const light = mount(null), dark = mount(null);
    new ZoomHint(light, defaultTheme, box).show('wheel');
    new ZoomHint(dark, darkTheme, box).show('wheel');
    const token = (card, name) => hintIn(card).style.getPropertyValue(name);
    expect(token(light, '--rc-tooltip-bg')).toBe(defaultTheme.tooltip.bg);
    expect(token(light, '--rc-tooltip-text')).toBe(defaultTheme.tooltip.text);
    expect(token(dark, '--rc-tooltip-bg')).toBe('#1a1a1a');
    expect(token(dark, '--rc-tooltip-border')).toBe('#2e2e2e');
    expect(token(dark, '--rc-tooltip-text')).toBe('#e8e8e8');
  });

  it('destroy() takes the element down and stops the fade timer', () => {
    vi.useFakeTimers();
    const card = mount(null);
    const hint = new ZoomHint(card, defaultTheme, box);
    hint.show('wheel');
    hint.destroy();
    expect(hintIn(card)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('boxInCard: the box in the card frame, cut to the card', () => {
    const card = mount(null);
    const inner = document.createElement('div');
    card.appendChild(inner);
    const rect = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height });
    card.getBoundingClientRect = rect(100, 50, 400, 300);
    inner.getBoundingClientRect = rect(80, 90, 900, 100);    // wider than the card, sideways scroll
    Object.defineProperty(card, 'clientLeft', { value: 1 });
    Object.defineProperty(card, 'clientTop', { value: 1 });
    expect(boxInCard(inner, card)).toEqual({ x: -1, y: 39, width: 400, height: 100 });
  });
});

// ─── bindZoom on a bare svg ──────────────────────────────────────────────────

describe('bindZoom', () => {
  // A zoomable svg in a card; `touchable` as d3's detector would say.
  function setup({ touchable = true } = {}) {
    const card = mount(null);
    const svg = d3.select(card).append('svg');
    const zoom = d3.zoom()
      .extent([[0, 0], [400, 200]])
      .touchable(touchable)
      .on('zoom', () => {});
    const onStart = vi.fn();
    const hint = bindZoom(svg, zoom, { container: card, theme: defaultTheme, box: () => ({ x: 0, y: 0, width: 400, height: 200 }) });
    zoom.on('start.test', onStart);
    const node = svg.node();
    const k = () => d3.zoomTransform(node).k;
    const t = () => d3.zoomTransform(node);
    const visible = () => !!card.querySelector('.rc-zoom-hint.is-visible');
    const text = () => card.querySelector('.rc-zoom-hint')?.textContent;
    return { card, svg, node, zoom, hint, onStart, k, t, visible, text };
  }

  it('puts the shared filter on the zoom', () => {
    const { zoom } = setup();
    expect(zoom.filter()).toBe(zoomFilter);
  });

  it('a plain wheel: not taken, not prevented (the page scrolls), the hint shows', () => {
    const { node, k, visible, text } = setup();
    const e = wheel();
    node.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(k()).toBe(1);
    expect(visible()).toBe(true);
    expect(text()).toBe('Hold Ctrl to zoom');
  });

  it.each(['ctrlKey', 'metaKey'])('%s + wheel zooms, is prevented, and hides the hint', key => {
    const { node, k, visible } = setup();
    node.dispatchEvent(wheel());
    expect(visible()).toBe(true);
    const e = wheel({ [key]: true });
    node.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(k()).toBeGreaterThan(1);
    expect(visible()).toBe(false);
  });

  it('a mouse drag still pans', () => {
    const { node, t } = setup();
    const mouse = (type, x) => {
      const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 10, button: 0 });
      Object.defineProperty(e, 'view', { value: window });
      return e;
    };
    node.dispatchEvent(mouse('mousedown', 100));
    window.dispatchEvent(mouse('mousemove', 140));
    window.dispatchEvent(mouse('mouseup', 140));
    expect(t().x).toBe(40);
  });

  it('touch-action: pan-x pan-y where d3 binds touch, nothing where it does not', () => {
    expect(setup({ touchable: true }).node.style.touchAction).toBe('pan-x pan-y');
    expect(setup({ touchable: false }).node.style.touchAction).toBe('');
  });

  it('one finger: no gesture, nothing prevented; a drag shows "Use two fingers to move", a tap does not', () => {
    const { node, onStart, t, visible, text } = setup();
    // a tap: under 10 px of jitter
    node.dispatchEvent(touch('touchstart', [[100, 100, 0]]));
    const tap = touch('touchmove', [[104, 103, 0]]);
    node.dispatchEvent(tap);
    node.dispatchEvent(touch('touchend', [], { changed: [[104, 103, 0]] }));
    expect(tap.defaultPrevented).toBe(false);
    expect(visible()).toBe(false);
    // a drag
    node.dispatchEvent(touch('touchstart', [[100, 100, 0]]));
    const moves = [130, 160].map(y => touch('touchmove', [[100, y, 0]]));
    moves.forEach(e => node.dispatchEvent(e));
    node.dispatchEvent(touch('touchend', [], { changed: [[100, 160, 0]] }));
    expect(moves.some(e => e.defaultPrevented)).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
    expect(t().y).toBe(0);
    expect(visible()).toBe(true);
    expect(text()).toBe('Use two fingers to move');
  });

  it('two fingers pan the chart, prevented, and hide the hint', () => {
    const { node, onStart, t, visible } = setup();
    node.dispatchEvent(touch('touchstart', [[100, 100, 0]]));
    node.dispatchEvent(touch('touchmove', [[100, 130, 0]]));    // a one-finger drag first: the hint
    expect(visible()).toBe(true);
    node.dispatchEvent(touch('touchstart', [[100, 130, 0], [200, 130, 1]], { changed: [[200, 130, 1]] }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(visible()).toBe(false);
    const move = touch('touchmove', [[100, 170, 0], [200, 170, 1]]);
    node.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
    expect(t().y).toBe(40);
    expect(t().k).toBe(1);
  });

  it('two fingers spreading apart zoom in (pinch)', () => {
    const { node, k } = setup();
    node.dispatchEvent(touch('touchstart', [[150, 100, 0], [250, 100, 1]]));
    node.dispatchEvent(touch('touchmove', [[100, 100, 0], [300, 100, 1]]));
    expect(k()).toBeCloseTo(2, 6);
  });

  it('a sequence the page began to scroll stays the page\'s: a second finger then does not move the chart', () => {
    const { node, onStart, t } = setup();
    node.dispatchEvent(touch('touchstart', [[100, 100, 0]]));
    node.dispatchEvent(touch('touchmove', [[100, 130, 0]]));
    // the browser scrolls: its touchmoves can no longer be cancelled
    node.dispatchEvent(touch('touchmove', [[100, 160, 0]], { cancelable: false }));
    node.dispatchEvent(touch('touchstart', [[100, 160, 0], [200, 160, 1]], { changed: [[200, 160, 1]] }));
    node.dispatchEvent(touch('touchmove', [[100, 190, 0], [200, 190, 1]], { cancelable: false }));
    expect(onStart).not.toHaveBeenCalled();
    expect(t().y).toBe(0);
    // every finger up: the next two-finger gesture is the chart's again
    node.dispatchEvent(touch('touchend', [[200, 190, 1]], { changed: [[100, 190, 0]] }));
    node.dispatchEvent(touch('touchend', [], { changed: [[200, 190, 1]] }));
    node.dispatchEvent(touch('touchstart', [[100, 100, 0], [200, 100, 1]]));
    node.dispatchEvent(touch('touchmove', [[100, 120, 0], [200, 120, 1]]));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(t().y).toBe(20);
  });
});

// ─── The charts ──────────────────────────────────────────────────────────────

const days = Array.from({ length: 120 }, (_, i) => ({ date: new Date(2024, 0, 1 + i), value: 100 + i }));
const square = (x, y) => [[[x, y], [x, y + 10], [x + 10, y + 10], [x + 10, y], [x, y]]];
const geoData = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 40) } },
  { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: square(30, 40) } },
] };

// Each zoomable class: how to make it, and what its view is.
const CLASSES = {
  TimeSeries: {
    make: async () => {
      const c = track(new TimeSeries(mount(null), { timeframes: ['1M', 'ALL'], defaultTimeframe: '1M' })).setData(days);
      c._zoom.extent([[0, 0], [c.width, c.height]]);   // jsdom: the svg has no size of its own
      return c;
    },
    view: c => c.getView().map(Number).join(),
  },
  Map: {
    make: async () => track(new RareMap(mount(null), { geoData, zoom: true })).setData([{ id: 'AA' }]).whenReady(),
    view: c => c.gZoom.attr('transform') ?? '',
  },
  MapFlow: {
    make: async () => track(new MapFlow(mount(null), { geoData, zoom: true })).setData({
      nodes: [{ id: 'W', country: 'AA' }, { id: 'E', country: 'BB' }],
      links: [{ source: 'W', target: 'E', value: 2 }],
    }).whenReady(),
    view: c => c.gZoom.attr('transform') ?? '',
  },
  Graph: {
    make: async () => track(new Graph(mount(null), { duration: 0, semanticZoom: false })).setData(fixture).whenReady(),
    view: c => c.gZoom.attr('transform') ?? '',
  },
};

describe.each(Object.entries(CLASSES))('%s takes the rule', (name, { make, view }) => {
  it('the shared filter; no hint in the card at rest (made on first need)', async () => {
    const c = await make();
    expect(c._zoom.filter()).toBe(zoomFilter);
    expect(c.container.querySelector('.rc-zoom-hint')).toBeNull();
  });

  it('a plain wheel leaves the view and the page\'s scroll alone and shows the hint over the plot', async () => {
    const c = await make();
    const before = view(c);
    const e = wheel();
    c.svg.node().dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(view(c)).toBe(before);
    const hint = c.container.querySelector('.rc-zoom-hint');
    expect(hint?.classList.contains('is-visible')).toBe(true);
    expect(hint.textContent).toBe('Hold Ctrl to zoom');
    expect(hint.getAttribute('aria-hidden')).toBe('true');
  });

  it('Ctrl + wheel zooms', async () => {
    const c = await make();
    const before = view(c);
    const e = wheel({ ctrlKey: true });
    c.svg.node().dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(view(c)).not.toBe(before);
  });

  it('destroy() takes a shown hint down with its timer', async () => {
    const c = await make();
    c.svg.node().dispatchEvent(wheel());
    const el = c.container.querySelector('.rc-zoom-hint');
    expect(el.classList.contains('is-visible')).toBe(true);
    c.destroy();
    expect(c.container.querySelector('.rc-zoom-hint')).toBeNull();
    // hidden and its fade timer stopped now, not left to run on a detached element
    expect(el.classList.contains('is-visible')).toBe(false);
  });
});

describe('the rule where there is no zoom', () => {
  it('Map without zoom: no zoom, no hint, the wheel is the page\'s as before', async () => {
    const m = await track(new RareMap(mount(null), { geoData })).setData([{ id: 'AA' }]).whenReady();
    expect(m._zoom).toBeUndefined();
    const e = wheel();
    m.svg.node().dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(m.container.querySelector('.rc-zoom-hint')).toBeNull();
    expect(m.svg.node().style.touchAction).toBe('');
  });

  it('Graph with zoom: false: no zoom, no hint', async () => {
    const g = await track(new Graph(mount(null), { duration: 0, zoom: false })).setData(fixture).whenReady();
    expect(g._zoom).toBeUndefined();
    g.svg.node().dispatchEvent(wheel());
    expect(g.container.querySelector('.rc-zoom-hint')).toBeNull();
  });
});

describe('the hint centres on the plot', () => {
  it('TimeSeries: the plot inside the margins, not the whole svg', async () => {
    const c = track(new TimeSeries(mount(null), {})).setData(days);
    c._plotToCard = (px, py) => [px + 5, py + 30];   // where the plot sits in the card
    c.svg.node().dispatchEvent(wheel());
    const hint = c.container.querySelector('.rc-zoom-hint');
    expect(parseFloat(hint.style.left)).toBeCloseTo(5 + c.width / 2, 6);
    expect(parseFloat(hint.style.top)).toBeCloseTo(30 + c.height / 2, 6);
  });
});

describe('the hint centres on the drawing', () => {
  it('Graph: a details panel beside the drawing is not part of it', async () => {
    const el = mount(null, { width: 1200 });
    const g = track(new Graph(el, { duration: 0, details: true })).setData(fixture);
    await g.whenReady();
    expect(el.classList.contains('rc-graph--details-side')).toBe(true);
    const rect = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height });
    el.getBoundingClientRect = rect(0, 0, 1200, 520);
    g.svg.node().getBoundingClientRect = rect(0, 40, 1200, 400);
    g.svg.node().dispatchEvent(wheel());
    const hint = el.querySelector('.rc-zoom-hint');
    // 1200 less the 300px panel and its 12px gap, halved
    expect(hint.style.left).toBe('444px');
    expect(hint.style.top).toBe('240px');
  });
});

describe('Graph: Ctrl + wheel reaches the semantic zoom', () => {
  it('zooming out of ego with Ctrl + wheel opens the cluster overview', async () => {
    const g = track(new Graph(mount(null), { duration: 0 })).setData(fixture);
    await g.whenReady();
    // a mouse notch zooms 1.15× (zoomWheelDelta): eight notches take ego past 0.45
    for (let i = 0; i < 8; i++) g.svg.node().dispatchEvent(wheel({ ctrlKey: true, deltaY: 100 }));
    await g.whenReady();
    const labels = [...g.container.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(l => / · \d+$/.test(l))).toBe(true);
  });

  it('a plain wheel does not', async () => {
    const g = track(new Graph(mount(null), { duration: 0 })).setData(fixture);
    await g.whenReady();
    for (let i = 0; i < 4; i++) g.svg.node().dispatchEvent(wheel({ deltaY: 100 }));
    await g.whenReady();
    const labels = [...g.container.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.some(l => / · \d+$/.test(l))).toBe(false);
  });
});

// The wheel's zoom limit follows the data (maintainer, 2026-11-18): hourly
// rows over three years zoomed in no further than two days under a fixed
// 500×, and a TODAY window already past that limit widened on "zoom in".
describe('TimeSeries: how far the wheel zooms in', () => {
  const hourly = (days, from = new Date(2024, 0, 1)) => Array.from({ length: days * 24 }, (_, i) =>
    ({ date: new Date(+from + i * 36e5), value: 10 + (i % 24) }));

  it('down to four of the finest rows, never less than 500×', () => {
    const c = track(new TimeSeries(mount(null), {}));
    c.setData({ hour: hourly(40, new Date(2026, 9, 1)), day: Array.from({ length: 1000 }, (_, i) => ({ date: new Date(2024, 0, 1 + i), value: 100 })) });
    const [, max] = c._zoom.scaleExtent();
    const [a, b] = c._getDataExtent();
    expect(max).toBeCloseTo((+b - +a) / (4 * 36e5), 6);

    const daily = track(new TimeSeries(mount(null), {})).setData(Array.from({ length: 30 }, (_, i) => ({ date: new Date(2026, 0, 1 + i), value: i })));
    expect(daily._zoom.scaleExtent()[1]).toBe(500);
  });

  it('a window narrower than 500× of the whole stays inside the limit, so a zoom-in step narrows it', () => {
    const c = track(new TimeSeries(mount(null), {})).setData(hourly(800));
    const [a, b] = c._getDataExtent();
    c.setView([new Date(+b - 12 * 36e5), b]);              // 12 hours of 800 days: 1600×
    const k = c.svg.property('__zoom').k;
    expect(k).toBeGreaterThan(500);
    expect(k).toBeLessThanOrEqual(c._zoom.scaleExtent()[1]);
  });
});

describe('the wheel step (maintainer, 2026-11-18)', () => {
  const wheel = o => ({ deltaMode: 0, deltaY: 0, ctrlKey: false, metaKey: false, ...o });
  it('a mouse notch zooms as much with Ctrl as with ⌘; a pinch keeps d3\'s tenfold rate', async () => {
    const { zoomWheelDelta } = await import('../assets/charts/src/core/zoomGesture.js');
    expect(zoomWheelDelta(wheel({ deltaY: 100, ctrlKey: true }))).toBeCloseTo(zoomWheelDelta(wheel({ deltaY: 100, metaKey: true })), 9);
    expect(zoomWheelDelta(wheel({ deltaY: 100, metaKey: true }))).toBeCloseTo(-0.2, 9);
    expect(zoomWheelDelta(wheel({ deltaY: 4, ctrlKey: true }))).toBeCloseTo(-0.08, 9);   // a pinch
    expect(zoomWheelDelta(wheel({ deltaMode: 1, deltaY: 3, ctrlKey: true }))).toBeCloseTo(-0.15, 9);   // lines
  });
});

// RC-073: every zoomable chart gives d3.zoom an extent of its own
describe('an explicit zoom extent (RC-073)', () => {
  it('TimeSeries and Map read the svg box, never the width attribute', () => {
    const ts = track(new TimeSeries(mount(null), {})).setData([{ date: '2024-01-01', value: 1 }, { date: '2024-02-01', value: 2 }]);
    const ext = ts._zoom.extent().call(ts.svg.node());
    expect(ext[0]).toEqual([0, 0]);
    expect(ext[1].every(v => Number.isFinite(v) && v >= 1)).toBe(true);
    const map = track(new RareMap(mount(null), { zoom: true }));
    const mext = map._zoom.extent().call(map.svg.node());
    expect(mext[1].every(v => Number.isFinite(v) && v >= 1)).toBe(true);
  });
});

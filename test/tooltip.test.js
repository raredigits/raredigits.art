import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tooltip } from '../assets/charts/src/core/Tooltip.js';
import { defaultTheme, createTheme } from '../assets/charts/src/core/theme.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { escapeHtml, safeUrl } from '../assets/charts/src/core/html.js';
import { mount, track } from './helpers.js';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('Tooltip pin (opt-in)', () => {
  let host, tt;
  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    tt = new Tooltip(host, defaultTheme);
  });

  it('hover show/hide behaves as before when nothing is pinned', () => {
    tt.show(10, 10, 'hello');
    expect(tt.el.classList.contains('is-visible')).toBe(true);
    expect(tt.el.classList.contains('is-pinned')).toBe(false);
    tt.hide();
    expect(tt.el.classList.contains('is-visible')).toBe(false);
  });

  it('ignores hover show/hide while pinned', () => {
    tt.pin(10, 10, '<a href="#x">proof</a>');
    tt.show(50, 50, 'hover');
    tt.hide();
    expect(tt.el.textContent).toBe('proof');
    expect(tt.el.classList.contains('is-visible')).toBe(true);
    expect(tt.isPinned).toBe(true);
  });

  it('closes on an outside pointerdown and on Escape, calling onClose once', async () => {
    const onClose = vi.fn();
    tt.pin(10, 10, 'a', { onClose });
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(true);          // the pinning click itself must not close it
    await tick();
    tt.el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(true);          // clicks inside keep it
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);

    tt.pin(10, 10, 'b');
    await tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tt.isPinned).toBe(false);
    expect(tt.el.classList.contains('is-visible')).toBe(false);
  });

  it('re-pinning replaces the content and releases the previous onClose', () => {
    const first = vi.fn();
    tt.pin(10, 10, 'one', { onClose: first });
    tt.pin(20, 20, 'two');
    expect(first).toHaveBeenCalledTimes(1);
    expect(tt.el.textContent).toBe('two');
    expect(tt.isPinned).toBe(true);
  });
});

// ─── Data in default tooltips is text, never markup (C-01) ─────────────────────

const EVIL = '<img src=x onerror="window.__pwned=1">';
const shown = chart => chart.container.querySelector('.rc-tooltip');
const hover = (el, type = 'mouseover', init = {}) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 300, clientY: 100, ...init }));
const expectText = tip => {
  expect(tip.querySelector('img')).toBeNull();
  expect(tip.textContent).toContain('<img');
};

describe('default tooltips escape data (C-01)', () => {
  it('escapeHtml / safeUrl', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escapeHtml(null)).toBe('');
    expect(safeUrl('javascript:alert(1)')).toBe(false);
    expect(safeUrl('https://example.com')).toBe(true);
  });

  it('Graph node: label, neighbour names and group', async () => {
    const g = track(new Graph(mount(null), { duration: 0 })).setData({
      nodes: [{ id: 'a', label: EVIL, group: EVIL }, { id: 'b', label: EVIL }],
      links: [{ source: 'a', target: 'b' }],
    });
    await g.focus('a').whenReady();
    hover(g.container.querySelector('.rc-graph-node'));
    expectText(shown(g));
  });

  it('Bar label', () => {
    const c = track(new Bar(mount(null), { animate: false })).setData([{ label: EVIL, value: 3 }]);
    hover(c.container.querySelector('rect.rc-bar'));
    expectText(shown(c));
  });

  it('Line crosshair: series name', () => {
    const c = track(new Line(mount(null), { animate: false })).setData([{ name: EVIL, values: [
      { date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 },
    ] }]);
    hover(c.container.querySelector('rect.rc-overlay'), 'mousemove');
    expectText(shown(c));
  });

  it('Donut slice label', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData([{ label: EVIL, value: 1 }, { label: 'b', value: 2 }]);
    hover(c.container.querySelector('path.rc-donut-slice'));
    expectText(shown(c));
  });

  it('Map region name from the geometry', () => {
    const c = track(new RareMap(mount(null), {
      projection: 'mercator',
      geoData: { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: { name: EVIL },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } }] },
    })).setData([{ id: '1', value: EVIL }]);
    hover(c.container.querySelector('.rc-map-feature'));
    expectText(shown(c));
  });

  it('HierarchicalBar row label', () => {
    const c = track(new HierarchicalBar(mount(null), { animate: false })).setData({ label: EVIL, value: 5 });
    hover(c.container.querySelector('.rc-hbar-row') ?? c.container.querySelector('.rc-hbar-bar').parentNode, 'mouseenter');
    expectText(shown(c));
  });

  it('stacked Bar: series name and category', () => {
    const c = track(new Bar(mount(null), { animate: false }))
      .setData([{ name: EVIL, values: [{ label: EVIL, value: 2 }, { label: 'b', value: 3 }] }]);
    hover(c.container.querySelector('rect.rc-bar-seg') ?? c.container.querySelector('svg rect'));
    expectText(shown(c));
  });

  it('Bar: the full text of a truncated axis label', () => {
    const c = track(new Bar(mount(null), { animate: false, labelMaxLength: 4 })).setData([{ label: EVIL, value: 3 }]);
    hover(c.container.querySelector('.tick text'));
    expectText(shown(c));
  });

  it('Graph tie: its type label', async () => {
    const g = track(new Graph(mount(null), { duration: 0 })).setData({
      nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', type: EVIL }],
    });
    await g.whenReady();
    hover(g.container.querySelector('.rc-graph-link-hit'));
    expectText(shown(g));
  });

  it('a user tooltipFormat stays HTML by contract', () => {
    const c = track(new Bar(mount(null), { animate: false, tooltipFormat: d => `<b class="mine">${d.value}</b>` }))
      .setData([{ label: 'A', value: 3 }]);
    hover(c.container.querySelector('rect.rc-bar'));
    expect(shown(c).querySelector('b.mine')).not.toBeNull();
  });
});

// ─── TimeSeries tooltip sits at the point, below the header (C-08) ─────────────

describe('TimeSeries tooltip position (C-08)', () => {
  it('maps the snapped point from plot to card coordinates', () => {
    const c = track(new TimeSeries(mount(null), { title: 'Price', subtitle: 'daily' }))
      .setData([{ date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 }]);
    const svg = c.container.querySelector('svg');
    const at = (left, top) => {
      svg.getBoundingClientRect = () => ({ left, top, right: left + 800, bottom: top + 300, width: 800, height: 300 });
      const spy = vi.spyOn(c._tooltip, 'show');
      // the same point under the cursor in both layouts
      hover(c.container.querySelector('svg > g > rect'), 'mousemove', { clientX: left + 300, clientY: top + 100 });
      const [x, y] = spy.mock.calls.at(-1);
      spy.mockRestore();
      return [x, y];
    };
    // the header pushes the svg down 60px, a side gutter 40px right → the tooltip follows
    const [x0, y0] = at(0, 0), [x1, y1] = at(40, 60);
    expect(x1 - x0).toBe(40);
    expect(y1 - y0).toBe(60);
  });
});

// ─── Built-in tooltips read theme.tooltip (B-03, C-23, D-03) ───────────────────
// jsdom applies no stylesheet: these check what the HTML asks for — classes
// and custom properties. The computed look: test/browser/charts-standalone.

const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const twoCountries = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: '100', properties: { name: 'West' }, geometry: { type: 'Polygon', coordinates: square(0, 40, 10) } },
  { type: 'Feature', id: '200', properties: { name: 'East' }, geometry: { type: 'Polygon', coordinates: square(30, 40, 10) } },
] };
const twoDays = [{ date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 }];

describe('the tooltip element (B-03, C-23)', () => {
  it('publishes theme.tooltip as --rc-tooltip-*; no inline typography or colour', () => {
    const tt = new Tooltip(mount(null), createTheme({ tooltip: { muted: '#a0b0c0', header: { text: '#123456' } } }));
    const { style } = tt.el;
    expect(style.fontSize).toBe('');
    expect(style.fontFamily).toBe('');
    expect(style.color).toBe('');
    expect(style.getPropertyValue('--rc-tooltip-muted')).toBe('#a0b0c0');
    expect(style.getPropertyValue('--rc-tooltip-text')).toBe(defaultTheme.tooltip.text);
    expect(style.getPropertyValue('--rc-tooltip-bg')).toBe(defaultTheme.tooltip.bg);
    expect(style.getPropertyValue('--rc-tooltip-header-text')).toBe('#123456');
    expect(style.getPropertyValue('--rc-tooltip-header-bg')).toBe('');    // null: the CSS fallback
    expect(tt.el.classList.contains('rc-tooltip--header-band')).toBe(false);
    tt.destroy();
  });

  it('tooltip.header.bg draws the header as a band', () => {
    const tt = new Tooltip(mount(null), createTheme({ tooltip: { header: { bg: '#eeeeee' } } }));
    expect(tt.el.style.getPropertyValue('--rc-tooltip-header-bg')).toBe('#eeeeee');
    expect(tt.el.classList.contains('rc-tooltip--header-band')).toBe(true);
    tt.destroy();
  });
});

describe('built-in tooltips read theme.tooltip, not the chart tokens (B-03)', () => {
  // The chart's muted and text must not reach the tooltip: tooltip.muted
  // arrives through the .rc-tooltip-muted / -sub classes, the text inherits.
  const THEME = { muted: '#010203', text: '#040506', tooltip: { muted: '#a0b0c0' } };
  const tip = c => c.container.querySelector('.rc-tooltip');

  const charts = {
    'Line (Crosshair)': () => {
      const c = track(new Line(mount(null), { animate: false, theme: THEME })).setData([{ name: 'A', values: twoDays }]);
      hover(c.container.querySelector('rect.rc-overlay'), 'mousemove');
      return c;
    },
    'TimeSeries': () => {
      const c = track(new TimeSeries(mount(null), { theme: THEME })).setData(twoDays);
      hover(c.container.querySelector('svg > g > rect'), 'mousemove');
      return c;
    },
    'Donut': () => {
      const c = track(new Donut(mount(null), { animate: false, theme: THEME })).setData([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]);
      hover(c.container.querySelector('path.rc-donut-slice'));
      return c;
    },
    'Gauge': () => {
      const c = track(new Gauge(mount(null), { animate: false, theme: THEME })).setData({ value: 4, max: 10 });
      hover(c.container.querySelector('svg path'), 'mousemove');
      return c;
    },
    'HierarchicalBar': () => {
      const c = track(new HierarchicalBar(mount(null), { animate: false, theme: THEME }))
        .setData({ label: 'T', children: [{ label: 'A', value: 3 }, { label: 'B', missing: true }] });
      hover(c.container.querySelector('.rc-hbar-row'), 'mouseenter');
      return c;
    },
    'Map': () => {
      const c = track(new RareMap(mount(null), { projection: 'mercator', geoData: twoCountries, theme: THEME }))
        .setData([{ id: '100', value: 42 }]);
      hover(c.container.querySelector('.rc-map-feature'));
      return c;
    },
    'Sankey node': () => {
      const c = track(new Sankey(mount(null), { animate: false, theme: THEME }))
        .setData({ links: [{ source: 'A', target: 'B', value: 5 }, { source: 'A', target: 'C', value: 3 }] });
      hover(c.container.querySelector('.rc-sankey-node'));
      return c;
    },
    'Sankey link': () => {
      const c = track(new Sankey(mount(null), { animate: false, theme: THEME }))
        .setData({ links: [{ source: 'A', target: 'B', value: 5, type: 't' }, { source: 'A', target: 'C', value: 3 }] });
      hover(c.container.querySelector('.rc-sankey-link'));
      return c;
    },
    'MapFlow place': () => {
      const c = track(new MapFlow(mount(null), { geoData: twoCountries, projection: 'mercator', theme: THEME }))
        .setData({ nodes: [{ id: 'W', label: 'West', country: '100' }, { id: 'E', label: 'East', country: '200' }],
          links: [{ source: 'W', target: 'E', value: 3 }] });
      hover(c.container.querySelector('.rc-mapflow-node'));
      return c;
    },
  };

  it.each(Object.keys(charts))('%s', name => {
    const t = tip(charts[name]());
    expect(t.classList.contains('is-visible')).toBe(true);
    expect(t.innerHTML).not.toContain(THEME.muted);
    expect(t.querySelector('.rc-tooltip-muted, .rc-tooltip-sub')).not.toBeNull();
  });

  // The neighbour names were painted theme.text: black on a dark tooltip.
  it('Graph node: names take tooltip.text; the group and the counts read as categories', async () => {
    const g = track(new Graph(mount(null), { duration: 0, theme: THEME })).setData({
      nodes: [{ id: 'a', label: 'A', group: 'G' }, { id: 'b', label: 'B' }],
      links: [{ source: 'a', target: 'b', type: 'x', value: 5 }],
    });
    await g.focus('a').whenReady();
    hover(g.container.querySelector('.rc-graph-node'));
    const t = tip(g);
    expect(t.innerHTML).not.toContain(THEME.muted);
    expect(t.innerHTML).not.toContain(THEME.text);
    expect(t.querySelector('.rc-tooltip-header').textContent).toBe('A');
    expect([...t.querySelectorAll('.rc-tooltip-kind')].map(k => k.textContent.trim())).toEqual(['G', 'x', '· 1']);
    expect(t.querySelector('div.rc-tooltip-kind').classList.contains('rc-tooltip-muted')).toBe(true);
  });

  it('Graph flow view node', () => {
    const g = track(new Graph(mount(null), { view: 'flow', duration: 0, theme: THEME })).setData({
      nodes: [{ id: 'a', label: 'A', group: 'G', sub: 'a sub line' }, { id: 'b', label: 'B' }],
      links: [{ source: 'a', target: 'b' }],
    });
    hover(g.container.querySelector('.rc-flow-node'));
    const t = tip(g);
    expect(t.innerHTML).not.toContain(THEME.muted);
    expect(t.querySelector('.rc-tooltip-header').textContent).toBe('A');
    expect(t.querySelectorAll('.rc-tooltip-sub').length).toBeGreaterThanOrEqual(2);
  });
});

describe('one header class across the built-in tooltips (B-03)', () => {
  const header = c => c.container.querySelector('.rc-tooltip .rc-tooltip-header');

  it('a date header is muted, a label plain, a subject a title', () => {
    const line = track(new Line(mount(null), { animate: false })).setData([{ name: 'A', values: twoDays }]);
    hover(line.container.querySelector('rect.rc-overlay'), 'mousemove');
    expect(header(line).textContent).toMatch(/^Jan \d\d, 2026$/);
    expect(header(line).className).toBe('rc-tooltip-header rc-tooltip-muted');

    const bar = track(new Bar(mount(null), { animate: false })).setData([{ label: 'Apples', value: 3 }]);
    hover(bar.container.querySelector('rect.rc-bar'));
    expect(header(bar).textContent).toBe('Apples');
    expect(header(bar).className).toBe('rc-tooltip-header');

    const sankey = track(new Sankey(mount(null), { animate: false })).setData({ links: [{ source: 'A', target: 'B', value: 5 }] });
    hover(sankey.container.querySelector('.rc-sankey-link'));
    expect(header(sankey).textContent).toBe('A → B');
    expect(header(sankey).className).toBe('rc-tooltip-header rc-tooltip-title');
  });

  // D1: TimeSeries had its own date row — theme.fontSize (14px), a 4px gap.
  it('TimeSeries: the Crosshair date header, nothing inline', () => {
    const c = track(new TimeSeries(mount(null))).setData(twoDays);
    hover(c.container.querySelector('svg > g > rect'), 'mousemove');
    expect(header(c).className).toBe('rc-tooltip-header rc-tooltip-muted');
    expect(header(c).getAttribute('style')).toBeNull();
    expect(c.container.querySelector('.rc-tooltip-value').style.color).not.toBe('');  // the accent, a data colour
  });

  it('Donut: the slice colour stays inline on the header', () => {
    const c = track(new Donut(mount(null), { animate: false }))
      .setData([{ label: 'a', value: 1, color: '#123456' }, { label: 'b', value: 2 }]);
    hover(c.container.querySelector('path.rc-donut-slice'));
    expect(header(c).textContent).toBe('a');
    expect(header(c).getAttribute('style')).toBe('color:#123456');
  });

  it('Map, HierarchicalBar and the Bar axis label', () => {
    const map = track(new RareMap(mount(null), { projection: 'mercator', geoData: twoCountries })).setData([{ id: '100', value: 7 }]);
    hover(map.container.querySelector('.rc-map-feature'));
    expect(header(map).textContent).toBe('West');

    const hbar = track(new HierarchicalBar(mount(null), { animate: false })).setData({ label: 'Total', value: 5 });
    hover(hbar.container.querySelector('.rc-hbar-row'), 'mouseenter');
    expect(header(hbar).textContent).toBe('Total');

    const bar = track(new Bar(mount(null), { animate: false, labelMaxLength: 4 })).setData([{ label: 'Long label', value: 3 }]);
    hover(bar.container.querySelector('.tick text'));
    expect(header(bar).textContent).toBe('Long label');
  });
});

describe('one tie tooltip for Graph and MapFlow (D-03)', () => {
  it('builds the same HTML for the same typed tie', async () => {
    const link = { source: 'W', target: 'E', type: 'goods', value: 3, start: 1800, end: 1850, label: 'cloth',
      sources: [{ url: 'https://example.com/proof', title: 'Proof' }, 'javascript:alert(1)'] };
    const linkTypes = { goods: { color: '#8a5a2b', label: 'goods' } };
    const nodes = [{ id: 'W', label: 'West', country: '100' }, { id: 'E', label: 'East', country: '200' }];

    const g = track(new Graph(mount(null), { duration: 0, linkTypes })).setData({ nodes, links: [link] });
    await g.whenReady();
    hover(g.container.querySelector('.rc-graph-link-hit'));
    const m = track(new MapFlow(mount(null), { geoData: twoCountries, projection: 'mercator', linkTypes }))
      .setData({ nodes, links: [link] });
    hover(m.container.querySelector('.rc-mapflow-link-hit'));

    const [gt, mt] = [shown(g), shown(m)];
    expect(mt.innerHTML).toBe(gt.innerHTML);
    expect(mt.querySelector('.rc-tooltip-kind').textContent).toBe('goods');
    expect(mt.querySelectorAll('a')).toHaveLength(1);              // the javascript: source stays text
    expect(mt.querySelector('a').getAttribute('href')).toBe('https://example.com/proof');
  });
});

describe('tooltip rows (step 5 review)', () => {
  it('stacked Bar: the share of the total is a muted row, as on Donut and HierarchicalBar', () => {
    const c = track(new Bar(mount(null), { animate: false }))
      .setData([{ name: 'a', values: [{ label: 'Q1', value: 2 }] }, { name: 'b', values: [{ label: 'Q1', value: 6 }] }]);
    hover(c.container.querySelector('rect.rc-bar-seg'));
    expect(c.container.querySelector('.rc-tooltip .rc-tooltip-muted')?.textContent).toMatch(/%$/);
  });

  it('Graph cluster meta-node: the tooltip wraps a long name in the capped body (C-29)', async () => {
    const g = track(new Graph(mount(null), { duration: 0 })).setData({
      nodes: [{ id: 'a', label: 'Department of Housing and Long Names That Keep Going' }, { id: 'b' }, { id: 'c' }],
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    });
    await g.overview().whenReady();
    hover(g.container.querySelector('.rc-graph-node'));
    expect(shown(g).firstElementChild?.classList.contains('rc-tooltip-body')).toBe(true);
  });
});

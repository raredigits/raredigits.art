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
import { escapeHtml, safeUrl, tipDate, tipNum, tipRow } from '../assets/charts/src/core/html.js';
import { mount, track, tooltipOf, unclampTooltip, tooltipPosition } from './helpers.js';

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
    // an 800×400 card: the point stays clear of the tooltip's clamp (S-18)
    const c = track(new TimeSeries(mount(null, { width: 800, height: 400 }), { title: 'Price', subtitle: 'daily' }))
      .setData([{ date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 }]);
    const svg = c.container.querySelector('svg');
    const at = (left, top) => {
      svg.getBoundingClientRect = () => ({ left, top, right: left + 800, bottom: top + 300, width: 800, height: 300 });
      // the same point under the cursor in both layouts
      hover(c.container.querySelector('svg > g > rect'), 'mousemove', { clientX: left + 300, clientY: top + 100 });
      expect(tooltipOf(c).classList.contains('is-visible')).toBe(true);
      return tooltipPosition(tooltipOf(c));
    };
    at(0, 0);
    unclampTooltip(c);                    // where the chart put it, not jsdom's clamp
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
  // The colours are the card's: the chart publishes its theme's own values
  // there (core/paint.js), the stylesheet declares the rest on .rc-chart.
  it('carries no inline typography, colour or token; the card has the theme\'s own', () => {
    const c = track(new Line(mount(null), { animate: false, theme: { tooltip: { muted: '#a0b0c0', header: { text: '#123456' } } } }));
    const tt = c.tooltip;
    expect(tt.el.getAttribute('style') ?? '').not.toMatch(/--rc-|font|color/);
    const card = c.container.style;
    expect(card.getPropertyValue('--rc-tooltip-muted')).toBe('#a0b0c0');
    expect(card.getPropertyValue('--rc-tooltip-text')).toBe('');         // the default: the stylesheet's
    expect(card.getPropertyValue('--rc-tooltip-bg')).toBe('');
    expect(card.getPropertyValue('--rc-tooltip-header-text')).toBe('#123456');
    expect(card.getPropertyValue('--rc-tooltip-header-bg')).toBe('');    // null: the CSS fallback
    expect(tt.el.classList.contains('rc-tooltip--header-band')).toBe(false);
  });

  it('tooltip.header.bg draws the header as a band', () => {
    const c = track(new Line(mount(null), { animate: false, theme: createTheme({ tooltip: { header: { bg: '#eeeeee' } } }) }));
    expect(c.container.style.getPropertyValue('--rc-tooltip-header-bg')).toBe('#eeeeee');
    expect(c.tooltip.el.classList.contains('rc-tooltip--header-band')).toBe(true);
  });

  it('a Tooltip made by hand writes nothing on its element', () => {
    const tt = new Tooltip(mount(null), createTheme({ tooltip: { bg: '#123456' } }));
    expect(tt.el.getAttribute('style')).toBeNull();
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

  // RC-082: the rows' names take tooltip.text by inheritance, their notes
  // and the date tooltip.muted through classes; a role colour never goes
  // inline, not even on a mark.
  it.each(Object.keys(charts))('%s', name => {
    const t = tip(charts[name]());
    expect(t.classList.contains('is-visible')).toBe(true);
    expect(t.innerHTML).not.toContain(THEME.muted);
    expect(t.innerHTML).not.toContain(THEME.text);
    expect(t.innerHTML).not.toContain('var(--rc-');
    expect(t.querySelector('.rc-tooltip-row, .rc-tooltip-muted, .rc-tooltip-sub')).not.toBeNull();
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

describe('RC-082: the date above, one row per series', () => {
  const tipEl = c => c.container.querySelector('.rc-tooltip');
  const header = c => tipEl(c).querySelector('.rc-tooltip-header');
  const rows = c => [...tipEl(c).querySelectorAll('.rc-tooltip-row')].map(r => ({
    mark: r.querySelector('.rc-tooltip-swatch')?.className.replace('rc-tooltip-swatch', '').trim() ?? null,
    color: r.querySelector('.rc-tooltip-swatch')?.style.getPropertyValue('--rc-swatch-color') || null,
    label: r.querySelector('.rc-tooltip-label').textContent,
    value: r.querySelector('.rc-tooltip-value').textContent,
    num: r.querySelector('.rc-tooltip-value').classList.contains('rc-num'),
    note: r.querySelector('.rc-tooltip-note')?.textContent ?? null,
  }));

  it('Line: the date small and muted, in figures; a row per series, its name never in its colour', () => {
    // 800px: x = 300 is nearer the first day than the second (S-18)
    const line = track(new Line(mount(null, { width: 800 }), { animate: false }))
      .setData([{ name: 'A', values: twoDays }, { name: 'B', values: twoDays, strokeDash: 'dashed' }]);
    hover(line.container.querySelector('rect.rc-overlay'), 'mousemove');
    expect(header(line).textContent).toMatch(/^Jan \d\d, 2026$/);
    expect(header(line).className).toBe('rc-tooltip-header rc-tooltip-muted');
    expect(header(line).querySelector('.rc-num')).not.toBeNull();
    const [a, b] = rows(line);
    expect(a).toMatchObject({ mark: '', label: 'A', value: '1', num: true, note: null });
    expect(a.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(b).toMatchObject({ mark: 'rc-tooltip-swatch--dashed', label: 'B' });
    expect(tipEl(line).querySelector('[style*="color:"]:not(.rc-tooltip-swatch)')).toBeNull();
  });

  it('DualAxes: a bar\'s dot, a band\'s square', async () => {
    const { DualAxes } = await import('../assets/charts/src/charts/DualAxes.js');
    const c = track(new DualAxes(mount(null, { width: 800 }), { animate: false })).setData([
      { name: 'L', axis: 'y1', type: 'line', values: twoDays },
      { name: 'B', axis: 'y2', type: 'bar', values: twoDays },
    ]);
    hover(c.container.querySelector('rect.rc-overlay'), 'mousemove');
    expect(rows(c).map(r => [r.label, r.mark])).toEqual([['L', ''], ['B', 'rc-tooltip-swatch--dot']]);
  });

  it('Bar: a category is the row\'s name; a date goes above the row', () => {
    const bar = track(new Bar(mount(null), { animate: false })).setData([{ label: 'Apples', value: 1234 }]);
    hover(bar.container.querySelector('rect.rc-bar'));
    expect(header(bar)).toBeNull();
    expect(rows(bar)).toEqual([expect.objectContaining({ mark: 'rc-tooltip-swatch--dot', label: 'Apples', value: '1,234', num: true })]);

    const dated = track(new Bar(mount(null), { animate: false })).setData([{ date: '2026-01-05', value: 3 }, { date: '2026-01-06', value: 4 }]);
    hover(dated.container.querySelector('rect.rc-bar'));
    expect(header(dated).textContent).toBe('Jan 05, 2026');
    expect(rows(dated)[0]).toMatchObject({ label: '', value: '3' });
  });

  it('stacked Bar: the category above, the series\' row, its share as the note', () => {
    const c = track(new Bar(mount(null), { animate: false }))
      .setData([{ name: 'a', values: [{ label: 'Q1', value: 2 }] }, { name: 'b', values: [{ label: 'Q1', value: 6 }] }]);
    hover(c.container.querySelector('rect.rc-bar-seg'));
    expect(header(c).textContent).toBe('Q1');
    expect(rows(c)).toEqual([expect.objectContaining({ mark: 'rc-tooltip-swatch--dot', label: 'a', value: '2', note: '25.0%' })]);
  });

  it('Donut: the slice colour on the dot only; the remainder\'s dot takes the tooltip\'s muted', () => {
    const c = track(new Donut(mount(null), { animate: false, total: 10 }))
      .setData([{ label: 'a', value: 1, color: '#123456' }, { label: 'b', value: 2 }]);
    const slices = c.container.querySelectorAll('path.rc-donut-slice');
    hover(slices[0]);
    expect(rows(c)).toEqual([expect.objectContaining({ mark: 'rc-tooltip-swatch--dot', color: '#123456', label: 'a', num: true })]);
    expect(rows(c)[0].note).toMatch(/%$/);
    expect(tipEl(c).querySelector('.rc-tooltip-label').getAttribute('style')).toBeNull();
    hover(slices[slices.length - 1]);
    const sw = tipEl(c).querySelector('.rc-tooltip-swatch');
    if (rows(c)[0].label !== 'b') {          // the remainder slice
      expect(sw.classList.contains('rc-tooltip-muted')).toBe(true);
      expect(sw.getAttribute('style')).toBeNull();
    }
  });

  it('Map, HierarchicalBar, Gauge: a row each; the Bar axis label stays a header', () => {
    const map = track(new RareMap(mount(null), { projection: 'mercator', geoData: twoCountries })).setData([{ id: '100', value: 7 }]);
    hover(map.container.querySelector('.rc-map-feature'));
    expect(rows(map)).toEqual([expect.objectContaining({ mark: 'rc-tooltip-swatch--dot', label: 'West', value: '7' })]);

    const hbar = track(new HierarchicalBar(mount(null), { animate: false }))
      .setData({ label: 'Total', children: [{ label: 'A', value: 3 }, { label: 'B', children: [{ label: 'B1', value: null }] }] });
    const hrows = [...hbar.container.querySelectorAll('g.rc-hbar-row')];
    hover(hrows[0], 'mouseenter');
    expect(rows(hbar)[0]).toMatchObject({ label: 'Total', value: '3' });
    hover(hrows.find(g => g.querySelector('.rc-hbar-label').textContent === 'B'), 'mouseenter');
    expect(rows(hbar)[0]).toMatchObject({ label: 'B', value: 'not disclosed', num: false, note: null });

    const gauge = track(new Gauge(mount(null), { animate: false })).setData({ value: 4, max: 10 });
    hover(gauge.container.querySelector('svg path'), 'mousemove');
    expect(rows(gauge)).toEqual([expect.objectContaining({ value: '40.0%', note: '4 / 10' })]);

    const bar = track(new Bar(mount(null), { animate: false, labelMaxLength: 4 })).setData([{ label: 'Long label', value: 3 }]);
    hover(bar.container.querySelector('.tick text'));
    expect(header(bar).textContent).toBe('Long label');
  });

  it('Sankey: a node\'s in and out with each band (RC-022), a band\'s value and share, in rows', () => {
    const c = track(new Sankey(mount(null), { animate: false }))
      .setData({ links: [{ source: 'A', target: 'B', value: 5 }, { source: 'A', target: 'C', value: 3 }] });
    hover(c.container.querySelector('.rc-sankey-node'));
    expect(header(c).className).toBe('rc-tooltip-header rc-tooltip-title');
    expect(rows(c).map(r => [r.mark, r.label, r.value])).toEqual([
      [null, 'out', '8'], ['rc-tooltip-swatch--band', 'B', '5'], ['rc-tooltip-swatch--band', 'C', '3']]);
    hover(c.container.querySelector('.rc-sankey-link'));
    expect(header(c).textContent).toMatch(/^A → [BC]$/);
    expect(rows(c)[0].note).toMatch(/^\d+% of A$/);
  });

  it('the row helpers: a mark per kind, a role colour muted, words or figures', () => {
    const el = document.createElement('div');
    el.innerHTML = tipDate('Jan 05') + tipRow('<b>x</b>', '1', { swatch: 'band', color: '#abcdef', note: tipNum('2%') })
      + tipRow('y', 'No data', { swatch: 'dashed', color: 'var(--rc-muted, #666666)', muted: true })
      + tipRow('z', '3', { swatch: 'nope' });
    const [r1, r2, r3] = el.querySelectorAll('.rc-tooltip-row');
    expect(el.querySelector('.rc-tooltip-header').innerHTML).toBe('<span class="rc-num">Jan 05</span>');
    expect(r1.querySelector('.rc-tooltip-swatch').className).toBe('rc-tooltip-swatch rc-tooltip-swatch--band');
    expect(r1.querySelector('.rc-tooltip-swatch').getAttribute('style')).toBe('--rc-swatch-color:#abcdef');
    expect(r1.querySelector('.rc-tooltip-label b')).not.toBeNull();          // HTML: the caller escapes
    expect(r1.querySelector('.rc-tooltip-note .rc-num').textContent).toBe('2%');
    expect(r2.querySelector('.rc-tooltip-swatch').className).toBe('rc-tooltip-swatch rc-tooltip-swatch--dashed rc-tooltip-muted');
    expect(r2.querySelector('.rc-tooltip-swatch').getAttribute('style')).toBeNull();
    expect(r2.querySelector('.rc-tooltip-value').className).toBe('rc-tooltip-value rc-tooltip-muted');
    expect(r3.className).toBe('rc-tooltip-row rc-tooltip-row--plain');      // no such mark: none
    expect(r3.querySelector('.rc-tooltip-swatch')).toBeNull();
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

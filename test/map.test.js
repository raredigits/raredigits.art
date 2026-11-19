import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { mount, track, allowChartErrors } from './helpers.js';

// Map readiness (K-12), the map theme tokens hoverBrighten and graticule
// (C-22), and what tooltipFormat receives.
//
// whenReady() belongs to the base Chart (K-12): for a Map it resolves to the
// chart once the geometry has loaded.

const geoData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } },
    { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: [[[10, 0], [10, 10], [20, 10], [20, 0], [10, 0]]] } },
  ],
};

// fetch answering after `ms`, with the geometry or a 404
const serve = (ms, ok = true) => vi.stubGlobal('fetch', () => new Promise(resolve => setTimeout(() => resolve(ok
  ? new Response(JSON.stringify(geoData), { headers: { 'Content-Type': 'application/json' } })
  : new Response('missing', { status: 404, statusText: 'Not Found' })), ms)));

describe('Map whenReady (K-12)', () => {
  it('resolves to the chart once a fetched geometry has loaded and the map is drawn', async () => {
    serve(20);
    const m = track(new RareMap(mount(null), { geoUrl: '/world.json' })).setData([{ id: 'AA' }]);
    expect(m.container.querySelectorAll('.rc-map-feature')).toHaveLength(0);   // still loading
    const ready = m.whenReady?.();
    expect(ready).toBeInstanceOf(Promise);
    expect(await ready).toBe(m);
    const regions = m.container.querySelectorAll('.rc-map-feature');
    expect(regions).toHaveLength(2);
    expect(regions[0].getAttribute('d')).toMatch(/^M/);
  });

  it('MapFlow: the flows set before the geometry arrived are drawn by then', async () => {
    serve(20);
    const c = track(new MapFlow(mount(null), { geoUrl: '/world.json' })).setData({
      nodes: [{ id: 'A', coords: [2, 5] }, { id: 'B', coords: [18, 5] }],
      links: [{ from: 'A', to: 'B' }],
    });
    expect(c.container.querySelector('.rc-mapflow-link')).toBeNull();
    await c.whenReady?.();
    expect(c.container.querySelector('.rc-mapflow-link').getAttribute('d')).toMatch(/^M/);
    expect(c.container.querySelectorAll('.rc-mapflow-node')).toHaveLength(2);
  });

  it('also resolves when the load fails — after the error is logged', async () => {
    allowChartErrors();
    serve(10, false);
    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(String(args[0])));
    const m = track(new RareMap(mount(null), { topoUrl: '/missing.json' }));
    const settled = await Promise.race([
      m.whenReady?.().then(() => 'resolved', () => 'rejected'),
      new Promise(resolve => setTimeout(() => resolve('pending'), 500)),
    ]);
    expect(settled).toBe('resolved');
    expect(errors).toEqual([expect.stringContaining('RareCharts Map: failed to load geographic data')]);
    expect(m.container.querySelectorAll('.rc-map-feature')).toHaveLength(0);
  });

  it('inline geometry is ready at once; a map with no geometry source warns and is ready', async () => {
    const m = track(new RareMap(mount(null), { geoData }));
    expect(await m.whenReady?.()).toBe(m);
    expect(m.container.querySelectorAll('.rc-map-feature')).toHaveLength(2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const empty = track(new RareMap(mount(null), {}));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RareCharts Map: no geographic data'));
    expect(await empty.whenReady?.()).toBe(empty);
  });
});

describe('theme.map.hoverBrighten (C-22)', () => {
  const hover = (m, id) => {
    const p = [...m.container.querySelectorAll('.rc-map-feature')].find(f => f.__data__.id === id);
    p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const fill = p.getAttribute('fill');
    p.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    return [fill, p.getAttribute('fill')];
  };
  // (k − 1) of the way towards white; above 0.85 a small darkening instead
  const lighter = (color, k) => {
    const c = d3.hsl(color);
    c.l = c.l > 0.85 ? Math.max(0, c.l - (k - 1) * 0.4) : c.l + (1 - c.l) * (k - 1);
    return String(c);
  };

  it('a region with data lightens its own fill by the token — matchFill or its own color', () => {
    const m = track(new RareMap(mount(null), { geoData })).setData([{ id: 'AA' }, { id: 'BB', color: '#336699' }]);
    expect(hover(m, 'AA')).toEqual([lighter('#1677ff', 1.3), '#1677ff']);
    expect(hover(m, 'BB')).toEqual([lighter('#336699', 1.3), '#336699']);
    expect(lighter('#336699', 1.3)).not.toBe('#336699');
  });

  it('the dark theme uses its own factor; 1 turns the effect off; hoverFill still wins', () => {
    const dark = track(new RareMap(mount(null), { geoData, theme: darkTheme })).setData([{ id: 'AA' }]);
    expect(hover(dark, 'AA')[0]).toBe(lighter('#ff6200', 1.2));
    const off = track(new RareMap(mount(null), { geoData, theme: { map: { hoverBrighten: 1 } } })).setData([{ id: 'AA' }]);
    expect(d3.color(hover(off, 'AA')[0]).formatHex()).toBe('#1677ff');
    const fixed = track(new RareMap(mount(null), { geoData, hoverFill: '#123456' })).setData([{ id: 'AA', color: '#ff0000' }]);
    expect(hover(fixed, 'AA')).toEqual(['#123456', '#ff0000']);
  });

  it('black lightens and a very light fill does not turn pure white (darkens a little)', () => {
    const m = track(new RareMap(mount(null), { geoData })).setData([{ id: 'AA', color: '#000000' }, { id: 'BB', color: '#f0f0f0' }]);
    const [black] = hover(m, 'AA'), [light] = hover(m, 'BB');
    expect(d3.hsl(black).l).toBeGreaterThan(0.2);
    expect(d3.color(light).formatHex()).not.toBe('#ffffff');
    expect(d3.hsl(light).l).toBeLessThan(d3.hsl('#f0f0f0').l);
  });

  it('a region without data keeps its fill: the token, resolved by the browser', () => {
    const m = track(new RareMap(mount(null), { geoData })).setData([{ id: 'AA' }]);
    const unmatched = 'var(--rc-map-unmatched-fill, #e8e8e8)';
    expect(hover(m, 'BB')).toEqual([unmatched, unmatched]);
  });

  // RC-014: a fill given as a token or a var() is read as hex before the
  // maths, so it still lightens (d3.hsl of 'var(…)' is NaN).
  it('a var() fill lightens as its colour', () => {
    const m = track(new RareMap(mount(null), { geoData, matchFill: 'var(--brand, #336699)' })).setData([{ id: 'AA' }]);
    expect(hover(m, 'AA')).toEqual([lighter('#336699', 1.3), 'var(--brand, #336699)']);
  });
});

// theme.map.matchFill is null in both presets (0.9.8_7): a region with data
// and no color of its own takes the accent, so an accent of the chart's own
// recolours the map; theme.map.matchFill, then the matchFill option, win.
describe('regions with data take the accent', () => {
  const map = (o, data = [{ id: 'AA' }]) => track(new RareMap(mount(null), { geoData, ...o })).setData(data);
  const fill = (m, id) => [...m.container.querySelectorAll('.rc-map-feature')]
    .find(f => f.__data__.id === id).getAttribute('fill');

  it('the light and the dark preset', () => {
    expect(fill(map({}), 'AA')).toBe('#1677ff');
    expect(fill(map({ theme: darkTheme }), 'AA')).toBe('#ff6200');
  });

  it('an accent of its own recolours the map; map.matchFill and the option win over it', () => {
    expect(fill(map({ theme: { accent: '#336699' } }), 'AA')).toBe('#336699');
    expect(fill(map({ theme: { accent: '#336699', map: { matchFill: '#123456' } } }), 'AA')).toBe('#123456');
    const opt = map({ matchFill: '#abcdef', theme: { accent: '#336699', map: { matchFill: '#123456' } } });
    expect(fill(opt, 'AA')).toBe('#abcdef');
    expect(fill(opt, 'BB')).toBe('var(--rc-map-unmatched-fill, #e8e8e8)');   // no data: unmatchedFill
  });
});

describe('graticule (C-22)', () => {
  it('graticule: true draws a 10° grid under the regions in theme.map.graticule', () => {
    const m = track(new RareMap(mount(null), { geoData, graticule: true }));
    const grid = m.container.querySelector('.rc-map-graticule');
    expect(grid).not.toBeNull();
    expect(grid.getAttribute('d')).toMatch(/^M/);
    expect(grid.getAttribute('stroke')).toBe('var(--rc-map-graticule, rgba(0,0,0,0.08))');
    expect(grid.getAttribute('fill')).toBe('none');
    // under the regions, in the zoom group
    expect(grid.parentNode.classList.contains('rc-map-zoom')).toBe(true);
    expect(grid.compareDocumentPosition(m.container.querySelector('.rc-map-paths')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const dark = track(new RareMap(mount(null), { geoData, graticule: true, theme: darkTheme }));
    // darkTheme's own value: published on its card, and the reference's literal
    expect(dark.container.querySelector('.rc-map-graticule').getAttribute('stroke')).toBe('var(--rc-map-graticule, rgba(255,255,255,0.06))');
    expect(dark.container.style.getPropertyValue('--rc-map-graticule')).toBe('rgba(255,255,255,0.06)');
  });

  it('off by default; not drawn for planar data', () => {
    expect(track(new RareMap(mount(null), { geoData })).container.querySelector('.rc-map-graticule')).toBeNull();
    const planar = track(new RareMap(mount(null), { geoData, graticule: true, projection: 'identity' }));
    expect(planar.container.querySelector('.rc-map-graticule')?.getAttribute('d') ?? null).toBeNull();
  });
});

describe('Map — tooltipFormat', () => {
  it('tooltipFormat gets item null — not undefined — for a region without data, with or without an id', () => {
    const noId = { type: 'Feature', properties: { name: 'Gamma' }, geometry: { type: 'Polygon', coordinates: [[[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]]] } };
    const seen = [];
    const map = track(new RareMap(mount(null), {
      geoData: { ...geoData, features: [...geoData.features, noId] },
      tooltipFormat: ({ feature, item }) => { seen.push([feature.properties.name, item]); return 'tip'; },
    })).setData([{ id: 'AA', value: 5 }]);
    map.container.querySelectorAll('.rc-map-feature')
      .forEach(p => p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(seen).toEqual([['Alpha', { id: 'AA', value: 5 }], ['Beta', null], ['Gamma', null]]);
  });

  // RC-014: the region's colour leaves the chart as hex — the accent, its
  // own colour, and the unmatched token (its literal: no stylesheet here).
  it('the region colour is hex, never a var()', () => {
    const seen = {};
    const map = track(new RareMap(mount(null), {
      geoData, tooltipFormat: ({ feature, color }) => { seen[feature.id] = color; return 'tip'; },
    })).setData([{ id: 'AA', value: 5 }]);
    map.container.querySelectorAll('.rc-map-feature')
      .forEach(p => p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(seen).toEqual({ AA: '#1677ff', BB: '#e8e8e8' });
    const dark = {};
    const d = track(new RareMap(mount(null), {
      geoData, theme: darkTheme, tooltipFormat: ({ feature, color }) => { dark[feature.id] = color; return 'tip'; },
    })).setData([{ id: 'AA', value: 5 }]);
    d.container.querySelectorAll('.rc-map-feature')
      .forEach(p => p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(dark).toEqual({ AA: '#ff6200', BB: '#1e1e2e' });
  });
});

// B-06: a region with data reports a click, Enter or Space when the page
// sets onRegionClick; nothing changes without it.
describe('Map region clicks (B-06)', () => {
  const make = async (o = {}) => {
    const m = track(new RareMap(mount(null), { geoData, ...o })).setData([{ id: 'AA', value: 7, label: 'Alpha land' }]);
    await m.whenReady();
    return m;
  };
  const region = (m, id) => [...m.container.querySelectorAll('.rc-map-feature')].find(p => p.__data__.id === id);
  const click = (el, x = 10, y = 10, x2 = x, y2 = y) => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x2, clientY: y2 }));
  };

  it('without a handler nothing changes: no tabindex, role or class on any region', async () => {
    const m = await make();
    for (const p of m.container.querySelectorAll('.rc-map-feature')) {
      expect(p.hasAttribute('tabindex') || p.hasAttribute('role') || p.classList.contains('rc-map-feature--clickable')).toBe(false);
    }
    expect(m.svg.attr('role')).toBe('img');
  });

  it('a click on a region with data reports feature, item, label, value and the event', async () => {
    const seen = [];
    const m = await make({ onRegionClick: e => seen.push(e) });
    click(region(m, 'AA'));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ item: { id: 'AA', value: 7 }, label: 'Alpha land', value: 7 });
    expect(seen[0].feature.id).toBe('AA');
    expect(seen[0].event.type).toBe('click');
  });

  it('a region with data is a focusable button named by its label and value; one without is not', async () => {
    const m = await make({ onRegionClick: () => {} });
    const a = region(m, 'AA'), b = region(m, 'BB');
    expect([a.getAttribute('tabindex'), a.getAttribute('role'), a.getAttribute('aria-label')]).toEqual(['0', 'button', 'Alpha land, 7']);
    expect(a.classList.contains('rc-map-feature--clickable')).toBe(true);
    expect(b.hasAttribute('tabindex') || b.hasAttribute('role')).toBe(false);
    expect(m.svg.attr('role')).toBe('group');
  });

  it('Enter and Space report the region; Escape reports nothing chosen; other keys nothing', async () => {
    const seen = [];
    const m = await make({ onRegionClick: e => seen.push([e.event.key, e.item?.id ?? null]) });
    for (const key of ['Enter', ' ', 'a', 'Escape']) region(m, 'AA').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(seen).toEqual([['Enter', 'AA'], [' ', 'AA'], ['Escape', null]]);
  });

  it('a click on a region without data or on the sea reports item: null — nothing chosen', async () => {
    const seen = [];
    const m = await make({ onRegionClick: e => seen.push(e) });
    click(region(m, 'BB'));
    click(m.svg.node());
    const ocean = m.container.querySelector('.rc-map-ocean');
    if (ocean) click(ocean);
    expect(seen.map(e => [e.item, e.feature?.id ?? null, e.label])).toEqual([[null, 'BB', 'Beta'], [null, null, null], ...(ocean ? [[null, null, null]] : [])]);
  });

  it('a drag that pans the map is not a click', async () => {
    const seen = [];
    const m = await make({ onRegionClick: e => seen.push(e) });
    click(region(m, 'AA'), 10, 10, 40, 10);
    expect(seen).toHaveLength(0);
    click(region(m, 'AA'), 10, 10, 12, 11);
    expect(seen).toHaveLength(1);
  });

  it('setData again keeps one handler; after destroy nothing reports', async () => {
    const seen = [];
    const m = await make({ onRegionClick: e => seen.push(e) });
    m.setData([{ id: 'AA', value: 8 }]);
    m.setData([{ id: 'AA', value: 9 }]);
    const a = region(m, 'AA');
    click(a);
    expect(seen.map(e => e.value)).toEqual([9]);
    m.destroy();
    click(a);
    expect(seen).toHaveLength(1);
  });
});

// ─── The geometry options (S-15) ───────────────────────────────────────────

describe('Map — topoData, idField, featureFilter, clipExtent (S-15)', () => {
  // A hand-made topology: two squares, absolute arcs (no transform). The
  // second has no id, only a `code` property.
  const topoData = {
    type: 'Topology',
    objects: {
      land: {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Polygon', id: 'AA', properties: { name: 'Alpha' }, arcs: [[0]] },
          { type: 'Polygon', properties: { name: 'Beta', code: 'BB' }, arcs: [[1]] },
        ],
      },
    },
    arcs: [
      [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
      [[10, 0], [10, 10], [20, 10], [20, 0], [10, 0]],
    ],
  };
  const regions = m => [...m.container.querySelectorAll('.rc-map-feature')];
  const names = m => regions(m).map(r => r.__data__.properties.name).sort();
  const fillOf = (m, name) => regions(m).find(r => r.__data__.properties.name === name).getAttribute('fill');

  it('topoData draws the topology inline, ready at once', async () => {
    const m = track(new RareMap(mount(null), { topoData }));
    expect(await m.whenReady()).toBe(m);
    expect(names(m)).toEqual(['Alpha', 'Beta']);
    regions(m).forEach(r => expect(r.getAttribute('d')).toMatch(/^M/));
  });

  it('idField matches a feature without an id by its property', () => {
    const m = track(new RareMap(mount(null), { topoData, idField: 'code', defaultFill: '#eeeeee' }))
      .setData([{ id: 'BB', color: '#ff0000' }]);
    expect(fillOf(m, 'Beta')).toBe('#ff0000');
    expect(fillOf(m, 'Alpha')).not.toBe('#ff0000');
  });

  it('featureFilter keeps only the features it accepts', () => {
    const m = track(new RareMap(mount(null), { geoData, featureFilter: f => f.id !== 'AA' }));
    expect(names(m)).toEqual(['Beta']);
  });

  it('clipExtent keeps only the polygons that reach into the box', () => {
    const m = track(new RareMap(mount(null), { geoData, clipExtent: [[15, -5], [30, 5]] }));
    expect(names(m)).toEqual(['Beta']);
    const all = track(new RareMap(mount(null), { geoData, clipExtent: [[-5, -5], [30, 5]] }));
    expect(names(all)).toEqual(['Alpha', 'Beta']);
  });
});

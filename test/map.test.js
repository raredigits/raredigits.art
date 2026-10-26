import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { Chart } from '../assets/charts/src/core/Chart.js';
import { Map as BaseMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow as BaseMapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { mount, track, allowChartErrors } from './helpers.js';

// Map readiness (K-12), the map theme tokens hoverBrighten and graticule
// (C-22), and what tooltipFormat receives.
//
// whenReady() belongs to the base Chart: it resolves to the chart once
// this._ready settles. Until that method lands, these subclasses carry the
// same one line, so the tests speak to the contract either way.
const withReady = Base => (typeof Chart.prototype.whenReady === 'function' ? Base : class extends Base {
  whenReady() { return Promise.resolve(this._ready).then(() => this); }
});
const RareMap = withReady(BaseMap);
const MapFlow = withReady(BaseMapFlow);

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
    expect(hover(m, 'AA')).toEqual([lighter('#00aaff', 1.3), '#00aaff']);
    expect(hover(m, 'BB')).toEqual([lighter('#336699', 1.3), '#336699']);
    expect(lighter('#336699', 1.3)).not.toBe('#336699');
  });

  it('the dark theme uses its own factor; 1 turns the effect off; hoverFill still wins', () => {
    const dark = track(new RareMap(mount(null), { geoData, theme: darkTheme })).setData([{ id: 'AA' }]);
    expect(hover(dark, 'AA')[0]).toBe(lighter('#ff6200', 1.2));
    const off = track(new RareMap(mount(null), { geoData, theme: { map: { hoverBrighten: 1 } } })).setData([{ id: 'AA' }]);
    expect(d3.color(hover(off, 'AA')[0]).formatHex()).toBe('#00aaff');
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

  it('a region without data keeps its fill', () => {
    const m = track(new RareMap(mount(null), { geoData })).setData([{ id: 'AA' }]);
    expect(hover(m, 'BB')).toEqual(['#e8e8e8', '#e8e8e8']);
  });
});

describe('graticule (C-22)', () => {
  it('graticule: true draws a 10° grid under the regions in theme.map.graticule', () => {
    const m = track(new RareMap(mount(null), { geoData, graticule: true }));
    const grid = m.container.querySelector('.rc-map-graticule');
    expect(grid).not.toBeNull();
    expect(grid.getAttribute('d')).toMatch(/^M/);
    expect(grid.getAttribute('stroke')).toBe('rgba(0,0,0,0.08)');
    expect(grid.getAttribute('fill')).toBe('none');
    // under the regions, in the zoom group
    expect(grid.parentNode.classList.contains('rc-map-zoom')).toBe(true);
    expect(grid.compareDocumentPosition(m.container.querySelector('.rc-map-paths')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const dark = track(new RareMap(mount(null), { geoData, graticule: true, theme: darkTheme }));
    expect(dark.container.querySelector('.rc-map-graticule').getAttribute('stroke')).toBe('rgba(255,255,255,0.06)');
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
});

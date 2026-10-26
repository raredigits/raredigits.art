import { describe, it, expect } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track } from './helpers.js';

// Ids in <defs> are document-global. Every url(#id) a chart draws must
// resolve, page-wide, to an element inside that same chart (C-04) — a
// shared id made the second chart paint with the first one's gradient
// (or with nothing, when the first was hidden).

const URL_ATTRS = ['fill', 'stroke', 'clip-path', 'marker-end'];
const urlRefs = root => [...root.querySelectorAll('*')].flatMap(n => URL_ATTRS
  .map(a => n.getAttribute(a))
  .filter(v => v?.startsWith('url(#'))
  .map(v => v.slice(5, -1)));

function expectOwnRefs(root) {
  const refs = urlRefs(root);
  expect(refs.length).toBeGreaterThan(0);
  refs.forEach(id => {
    const el = document.getElementById(id);
    expect(el, `url(#${id}) resolves to nothing`).not.toBeNull();
    expect(root.contains(el), `url(#${id}) resolves outside its chart`).toBe(true);
  });
}

function expectUniqueIds() {
  const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
}

// The stop colour of the gradient an element is painted with, as the page
// resolves its url(#…).
const stopColor = el => document.getElementById(el.getAttribute('fill').slice(5, -1))
  .querySelector('stop').getAttribute('stop-color');

const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, 15), value: 10 + i,
}));

const NAV_CHARTS = [
  ['TimeSeries', o => new TimeSeries(mount(null), o), rows => rows],
  ['Line', o => new Line(mount(null), { animate: false, ...o }), rows => rows],
  ['DualAxes', o => new DualAxes(mount(null), { animate: false, ...o }), rows => [{ name: 's', values: rows }]],
  ['Bar (dates)', o => new Bar(mount(null), { animate: false, ...o }), rows => rows],
];

describe('<defs> ids are per chart (C-04)', () => {
  it.each(NAV_CHARTS)('%s: two charts with navigators each paint with their own defs', (_n, make, shape) => {
    const charts = ['#ff0000', '#00ff00'].map(color =>
      track(make({ navigator: { areaColor: color } })).setData(shape(monthly(2023))));
    charts.forEach((c, i) => {
      expectOwnRefs(c.container);
      const strip = c.container.querySelector('.rc-chart-navigator .rc-ov-area');
      expect(stopColor(strip)).toBe(['#ff0000', '#00ff00'][i]);
    });
    expectUniqueIds();
  });

  it("TimeSeries: the area gradient is each chart's own, and keeps its rc-ts-grad class", () => {
    const charts = ['#ff0000', '#00ff00'].map(areaColor =>
      track(new TimeSeries(mount(null), { areaColor })).setData(monthly(2023)));
    charts.forEach((c, i) => {
      const area = c.container.querySelector('.rc-ts-area');
      expect(stopColor(area)).toBe(['#ff0000', '#00ff00'][i]);
      expect(c.container.querySelectorAll('.rc-ts-grad')).toHaveLength(1);
    });
    // the clip id the chart keeps on itself is the one it uses
    expect(charts[0].clipId).not.toBe(charts[1].clipId);
    expect(charts[0].container.querySelector(`#${charts[0].clipId}`)).not.toBeNull();
    // a re-render reuses the gradient instead of appending another
    charts[0].setData(monthly(2024));
    expect(charts[0].container.querySelectorAll('.rc-ts-grad')).toHaveLength(1);
    expectOwnRefs(charts[0].container);
  });

  it('Map: two maps clip to their own rect', () => {
    const geoData = { type: 'FeatureCollection', features: [] };
    const maps = [0, 1].map(() => track(new RareMap(mount(null), { geoData })));
    maps.forEach(m => expectOwnRefs(m.container));
    expectUniqueIds();
  });

  it('MapFlow with a navigator: the map clip and the strip gradient are its own', () => {
    const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
    const data = { nodes: [{ id: 'A', coords: [1, 1] }, { id: 'B', coords: [10, 10] }],
      links: [{ from: 'A', to: 'B', start: 1990, end: 2000 }] };
    const maps = [0, 1].map(() => track(new MapFlow(mount(null), { geoData, navigator: true })).setData(data));
    maps.forEach(m => {
      expectOwnRefs(m.container);
      expect(m.container.querySelector('.rc-chart-navigator .rc-ov-area')).not.toBeNull();
    });
    expectUniqueIds();
  });

  it('Sankey: link gradients resolve inside their own chart', () => {
    const budget = {
      nodes: [{ id: 'tax' }, { id: 'debt' }, { id: 'health' }, { id: 'roads' }],
      links: [{ source: 'tax', target: 'health', value: 120 }, { source: 'debt', target: 'roads', value: 50 },
        { source: 'debt', target: 'health', value: 30 }],
    };
    const charts = [0, 1].map(() =>
      track(new Sankey(mount(null), { animate: false, linkColor: 'gradient' })).setData(budget));
    charts.forEach(c => expectOwnRefs(c.container));
    expectUniqueIds();
  });

  it('Graph: ego arrow markers resolve inside their own graph', async () => {
    const data = { nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      links: [{ source: 'a', target: 'b', type: 'x' }, { source: 'a', target: 'c', type: 'y' }] };
    const graphs = [0, 1].map(() => track(new Graph(mount(null), { duration: 0 })).setData(data));
    await Promise.all(graphs.map(g => g.whenReady()));
    graphs.forEach(g => {
      expect(g.container.querySelectorAll('.rc-graph-link[marker-end]').length).toBeGreaterThan(0);
      expectOwnRefs(g.container);
    });
    expectUniqueIds();
  });

  it('Graph flow: arrow markers and the strip gradient resolve inside their own graph', async () => {
    const data = { nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ from: 'a', to: 'b', start: '2023-01' }, { from: 'b', to: 'a', start: '2024-01' }] };
    const graphs = [0, 1].map(() =>
      track(new Graph(mount(null), { view: 'flow', duration: 0, navigator: true })).setData(data));
    await Promise.all(graphs.map(g => g.whenReady()));
    graphs.forEach(g => {
      expect(g.container.querySelectorAll('.rc-flow-link[marker-end]').length).toBeGreaterThan(0);
      expect(g.container.querySelector('.rc-chart-navigator .rc-ov-area')).not.toBeNull();
      expectOwnRefs(g.container);
    });
    expectUniqueIds();
  });

  it('a standalone Overview, twice on a page: each strip paints with its own gradient', () => {
    const strips = ['#ff0000', '#00ff00'].map(areaColor => {
      const ov = new Overview(mount(null), { areaColor }).setData(monthly(2023), () => {});
      track({ destroy: () => ov.destroy() });
      return ov;
    });
    strips.forEach((ov, i) => {
      expectOwnRefs(ov.container);
      expect(stopColor(ov.container.querySelector('.rc-ov-area'))).toBe(['#ff0000', '#00ff00'][i]);
      expect(ov.container.querySelectorAll('.rc-ov-grad')).toHaveLength(1);
    });
    expectUniqueIds();
  });
});

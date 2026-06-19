import { describe, it, expect, beforeEach } from 'vitest';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const labelSeries = [
  { label: 'A', value: 4 },
  { label: 'B', value: 7 },
];
const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
];

describe('Donut — edge data', () => {
  it('renders an empty dataset without throwing', () => {
    expect(() => new Donut('#chart', { title: 'D', height: 300 }).setData([])).not.toThrow();
  });
  it('renders an all-zero dataset without throwing (total = 0)', () => {
    expect(() => new Donut('#chart', { title: 'D', height: 300 })
      .setData([{ label: 'A', value: 0 }, { label: 'B', value: 0 }])).not.toThrow();
  });
  it('renders one slice per data point', () => {
    new Donut('#chart', { title: 'D', height: 300 }).setData(labelSeries);
    const arcs = host.querySelectorAll('path.rc-donut-arc, .rc-donut-arc, g.rc-arc path');
    // fall back to counting any <path> with a fill if class names differ
    const paths = arcs.length ? arcs : host.querySelectorAll('svg g path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Gauge — data parsing & clamping', () => {
  it('number form sets the value; max comes from options', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300, max: 200 }).setData(73);
    expect(g._value).toBe(73);
    expect(g._max).toBe(200);
    expect(g._min).toBe(0);
  });
  it('object form overrides max and min', () => {
    const g = new Gauge('#chart', { title: 'G', height: 300 }).setData({ value: 50, max: 80, min: 10 });
    expect(g._value).toBe(50);
    expect(g._max).toBe(80);
    expect(g._min).toBe(10);
  });
  it('a value above max renders without throwing (clamped)', () => {
    expect(() => new Gauge('#chart', { title: 'G', height: 300, max: 100 }).setData(150)).not.toThrow();
  });
  it('a value below min renders without throwing (clamped)', () => {
    expect(() => new Gauge('#chart', { title: 'G', height: 300, min: 0, max: 100 }).setData(-20)).not.toThrow();
  });
});

describe('Map — inline GeoJSON smoke', () => {
  const geoData = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } },
      { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: [[[10, 0], [10, 10], [20, 10], [20, 0], [10, 0]]] } },
    ],
  };

  it('constructs with inline geoData and renders a labelled svg with region paths', () => {
    let map;
    expect(() => {
      map = new RareMap('#chart', { title: 'Map', height: 300, geoData });
      map.setData([{ id: 'AA', value: 5 }, { id: 'BB', value: 3 }]);
    }).not.toThrow();

    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Map');
    expect(host.querySelectorAll('.rc-map-paths path').length).toBeGreaterThanOrEqual(2);
  });
});

describe('MultiChart — composed children smoke', () => {
  it('instantiates each child chart and renders their svgs', () => {
    let multi;
    expect(() => {
      multi = new MultiChart('#chart', {
        title: 'Dashboard',
        charts: [
          { type: 'Bar', options: { title: 'A' }, data: labelSeries },
          { type: 'Line', options: { title: 'B' }, data: dateSeries },
        ],
      });
    }).not.toThrow();

    expect(multi.charts).toHaveLength(2);
    expect(host.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });
});

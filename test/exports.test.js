import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as RareCharts from '../assets/charts/src/index.js';
import versionInfo from '../assets/charts/src/version.json';
import { mount, track } from './helpers.js';

// The public surface, through the entry point the bundle is built from (S-03).
// Under Vitest the stylesheet import resolves to '' — CSS delivery is checked
// on the built bundles in bundle-smoke.test.js.

// A deliberate freeze: adding or removing an export means updating this list.
const PUBLIC = [
  'Bar', 'DOCS_URL', 'Donut', 'DualAxes', 'Gauge', 'Graph', 'HierarchicalBar', 'Line', 'Map', 'MapFlow',
  'MultiChart', 'Overview', 'Pie', 'Sankey', 'TimeSeries', 'VERSION', 'createTheme', 'd3', 'darkTheme',
  'defaultTheme', 'defaultTimeframes', 'fromApi', 'fromArray', 'fromCsv', 'fromJson', 'generateMockPrices',
  'linkPresets', 'memorySource',
];

describe('public exports (S-03)', () => {
  it('exposes exactly the public names', () => {
    expect(Object.keys(RareCharts).sort()).toEqual(PUBLIC);
  });

  it('VERSION comes from version.json', () => {
    expect(RareCharts.VERSION).toBe(versionInfo.version);
    expect(RareCharts.VERSION).toMatch(/^v\d+\.\d+\.\d+/);
  });

  // K-13: RareCharts.d3 is a documented subset, not the whole namespace —
  // the same names as README and /charts/installation/. Adding a name means
  // updating this list and both pages.
  it('d3 is the documented, frozen subset (K-13)', () => {
    const D3 = [
      'color', 'extent', 'format', 'formatPrefix', 'hsl', 'interpolate', 'max', 'mean', 'min', 'range', 'rgb',
      'scaleLinear', 'scaleLog', 'scaleOrdinal', 'scaleTime', 'sum',
      'timeDay', 'timeFormat', 'timeMonth', 'timeParse', 'timeWeek', 'timeYear',
      'utcDay', 'utcFormat', 'utcMonth', 'utcParse', 'utcWeek', 'utcYear',
    ];
    expect(Object.keys(RareCharts.d3).sort()).toEqual(D3);
    expect(Object.isFrozen(RareCharts.d3)).toBe(true);
    D3.forEach(name => expect(typeof RareCharts.d3[name], name).toBe('function'));
    expect(RareCharts.d3.format(',.0f')(1234.5)).toBe('1,235');
    expect(RareCharts.d3.timeMonth.every(6)).toBeTruthy();
  });

  it('every type the build banner names is an exported class', () => {
    // Read as text: importing the build script would pull in esbuild, which
    // does not load under the jsdom environment.
    const banner = readFileSync('scripts/build-charts.mjs', 'utf8');
    const types = banner.match(/Types: ([^.]+)\./)[1]
      .replace(/\([^)]*\)/g, '').split(',').map(s => s.trim());
    expect(types).toContain('Pie');
    types.forEach(t => expect(typeof RareCharts[t], t).toBe('function'));
  });
});

// ─── Pie (C-05) ───────────────────────────────────────────────────────────────
// Behaviour, not implementation: Pie draws a pie; how it relates to Donut is
// not part of the contract.

const slices = [{ label: 'A', value: 3 }, { label: 'B', value: 2 }, { label: 'C', value: 1 }];
const paths = c => [...c.container.querySelectorAll('path.rc-donut-slice')].map(p => p.getAttribute('d'));
// A slice of a full pie closes at the centre (d3.arc with innerRadius 0 ends
// "…L0,0Z"); a donut slice closes along its inner arc. Needs 2+ slices: a
// single full circle has no corner at the centre.
const atCentre = d => /L0,0Z$/.test(d);
const centre = c => c.container.querySelectorAll('.rc-donut-center *');

describe('Pie (C-05)', () => {
  it('draws a full pie by default: no hole, no centre total', () => {
    const c = track(new RareCharts.Pie(mount(null), { animate: false })).setData(slices);
    expect(paths(c)).toHaveLength(3);
    expect(paths(c).every(atCentre)).toBe(true);
    expect(centre(c)).toHaveLength(0);
  });

  it('innerRadius: undefined counts as not given', () => {
    const c = track(new RareCharts.Pie(mount(null), { animate: false, innerRadius: undefined })).setData(slices);
    expect(paths(c).every(atCentre)).toBe(true);
  });

  it('an explicit innerRadius still makes a hole, with the centre text', () => {
    const c = track(new RareCharts.Pie(mount(null), { animate: false, innerRadius: 0.5, centerLabel: 'Sum' }))
      .setData(slices);
    expect(paths(c).some(atCentre)).toBe(false);
    expect(c.container.querySelector('.rc-donut-center').textContent).toContain('Sum');
  });

  it("takes Donut's other options and methods: outer labels, drill-down", () => {
    const labelled = track(new RareCharts.Pie(mount(null), { animate: false, showLabels: true })).setData(slices);
    expect(labelled.container.querySelectorAll('.rc-donut-label')).toHaveLength(3);

    const tree = { label: 'Root', children: [
      { label: 'A', value: 4, children: [{ label: 'A1', value: 3 }, { label: 'A2', value: 1 }] },
      { label: 'B', value: 2 },
    ] };
    const c = track(new RareCharts.Pie(mount(null), { animate: false })).setData(tree);
    expect(paths(c).every(atCentre)).toBe(true);
    c.container.querySelector('path.rc-donut-slice').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c.container.querySelector('.rc-donut-crumb').textContent).toContain('A');
    c.drillUp();
    expect(c.container.querySelector('.rc-donut-crumb').textContent).not.toContain('A');
  });

  it('Donut still defaults to a ring with the centre total', () => {
    const c = track(new RareCharts.Donut(mount(null), { animate: false })).setData(slices);
    expect(paths(c).some(atCentre)).toBe(false);
    expect(centre(c).length).toBeGreaterThan(0);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { mount, track } from './helpers.js';

// Each chart that estimates a text's width keeps its own rate per character
// (D-08): the shared estimateTextWidth / textWidth take the rate from the
// caller, and these pins fail when a caller's number changes. jsdom measures
// every text 0 long, so every width here is the estimate. The helpers
// themselves are in label-placement.test.js.

const calls = vi.hoisted(() => []);
vi.mock('../assets/charts/src/core/renderHelpers.js', async importOriginal => {
  const real = await importOriginal();
  return {
    ...real,
    estimateTextWidth: (text, perChar) => {
      calls.push({ fn: 'estimate', text: String(text ?? ''), perChar });
      return real.estimateTextWidth(text, perChar);
    },
    textWidth: (node, perChar, text) => {
      calls.push({ fn: 'measure', text: String(text ?? node?.textContent ?? ''), perChar });
      return real.textWidth(node, perChar, text);
    },
  };
});

// The rates each function was called with for `text`.
const ratesOf = (fn, text) => [...new Set(calls.filter(c => c.fn === fn && c.text === text).map(c => c.perChar))];

beforeEach(() => {
  calls.length = 0;
  document.body.innerHTML = '';
});

describe('the callers\' rates per character', () => {
  it('Graph ego view: a drawn node label as a +N badge\'s obstacle, 6.2', async () => {
    mount('chart');
    const g = track(new Graph('#chart', { duration: 0 }).setData({
      nodes: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
      links: ['p', 'q', 'r', 's'].map(type => ({ source: 'a', target: 'b', type })),
    }));
    await g.whenReady();
    expect(document.querySelector('.rc-graph-link-more')).not.toBeNull();
    expect(ratesOf('measure', 'Alpha')).toEqual([6.2]);
    expect(ratesOf('measure', 'Beta')).toEqual([6.2]);
  });

  it('Graph path view: a label\'s half width at the ends of the drawing, 6.2', async () => {
    mount('chart');
    const g = track(new Graph('#chart', {
      duration: 0,
      dataSource: memorySource({
        nodes: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }],
        links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
      }),
    }));
    await g.connect('a', 'c').whenReady();
    expect(ratesOf('measure', 'Alpha')).toEqual([6.2]);
    expect(ratesOf('measure', 'Gamma')).toEqual([6.2]);
  });

  it('Graph flow view: captions 6.6, sub-captions 6.4, hull labels 6.2, tie labels 6.4', () => {
    mount('chart');
    track(new Graph('#chart', {
      view: 'flow', duration: 0, laneBy: 'net',
      lanes: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }],
      hulls: [{ id: 'h', label: 'one key', members: n => n.id !== 'c' }],
    }).setData({
      nodes: [
        { id: 'a', label: 'Wallet A', sub: 'osmo1…', net: 'one' },
        { id: 'b', label: 'Pools', net: 'one', row: 1 },
        { id: 'c', label: 'Exchange', net: 'two' },
      ],
      links: [
        { from: 'a', to: 'b', value: 5, label: '61.38 ATOM' },
        { from: 'b', to: 'c', value: 3, label: '0.27 ETH' },
      ],
    }));
    expect(document.querySelectorAll('.rc-flow-link-label').length).toBeGreaterThan(0);
    expect(ratesOf('estimate', 'Wallet A')).toEqual([6.6]);
    expect(ratesOf('estimate', 'osmo1…')).toEqual([6.4]);
    expect(ratesOf('estimate', 'one key')).toEqual([6.2]);
    expect(ratesOf('estimate', '61.38 ATOM')).toEqual([6.4]);
  });

  it('MapFlow: a place label, 6.4', () => {
    const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
    const c = track(new MapFlow(mount(null), {
      geoData: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', id: '1', properties: { name: 'Land' }, geometry: { type: 'Polygon', coordinates: square(0, 40, 30) } }],
      },
      projection: 'mercator',
    }));
    c.setData({
      nodes: [{ id: 'W', label: 'Westport', coords: [5, 45] }, { id: 'E', label: 'Eastham', coords: [25, 50] }],
      links: [{ from: 'W', to: 'E', value: 3 }],
    });
    expect(c.container.querySelectorAll('.rc-mapflow-label').length).toBeGreaterThan(0);
    expect(ratesOf('estimate', 'Westport')).toEqual([6.4]);
  });

  it('Overview: an axis tick label, 5.5', () => {
    const ov = new Overview(mount(null, { width: 800 }), { axis: true });
    ov.setData(Array.from({ length: 12 }, (_, i) => ({ date: new Date(2023, i, 15), value: 10 + i })), () => {});
    expect(ratesOf('measure', 'June')).toEqual([5.5]);
    ov.destroy();
  });

  it('Bar: a value label, 7', () => {
    mount('chart');
    track(new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false, showValues: true })
      .setData([{ label: 'A', value: 1200 }, { label: 'B', value: 80 }]));
    expect(ratesOf('measure', '1,200')).toEqual([7]);
  });

  it('Donut: a breadcrumb, 7', () => {
    mount('chart');
    const c = track(new Donut('#chart', {}).setData({
      label: 'Portfolio', value: 100,
      children: [{ label: 'Equities', value: 60, children: [{ label: 'US', value: 30 }, { label: 'EU', value: 30 }] }, { label: 'Cash', value: 40 }],
    }));
    c.drillTo('Equities');
    expect(ratesOf('measure', 'Portfolio')).toEqual([7]);
  });
});

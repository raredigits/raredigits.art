// Graph bug fixes of step 7a (internal audit before v0.9.8_6):
//   R-17  setData() in ego/path/cluster: a new history, the new data's
//         relation types, the best-connected node of the new data, and an
//         empty payload clears the drawing
//   R-18  connect(a, a) is one node, no routes
//   C-36  path view: labels at the drawing's ends stay inside it
//   C-37  details panel: the → / ← of a node's ties is the only marker
//   C-38  flow view: a short drawing gives its padding to the rows first
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { mount, track } from './helpers.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { pathLayout } from '../assets/charts/src/graph/layouts/path.js';
import { layoutFlow } from '../assets/charts/src/graph/views/flow.js';

const ids = host => [...host.querySelectorAll('.rc-graph-node')].map(n => n.__data__.id).sort();
const crumbs = host => [...host.querySelectorAll('.rc-graph-breadcrumbs button')].map(b => b.textContent);
const legend = host => [...host.querySelectorAll('.rc-graph-legend-item')].map(b => b.dataset.type);

const first = {
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
  links: [
    { source: 'a', target: 'b', type: 'work' },
    { source: 'a', target: 'c', type: 'family' },
  ],
};
const second = {
  nodes: [{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }, { id: 'r', label: 'R' }],
  links: [
    { source: 'q', target: 'p', type: 'deal' },
    { source: 'q', target: 'r', type: 'deal' },
  ],
};

describe('R-17: setData() replaces the ego / path / cluster state', () => {
  it('the old breadcrumbs go: the new data starts a new history', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    await g.focus('b').whenReady();
    expect(crumbs(host)).toEqual(['A', 'B']);
    await g.setData(second).whenReady();
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    expect(g._history.map(s => s.root)).toEqual(['q']);
    await g.focus('p').whenReady();
    expect(crumbs(host)).toEqual(['Q', 'P']);
  });

  it('the legend lists the new data\'s relation types, not the old ones', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    expect(legend(host).sort()).toEqual(['family', 'work']);
    await g.setData(second).whenReady();
    expect(legend(host)).toEqual(['deal']);
  });

  it('under a relation filter the legend keeps the linkTypes catalogue, not the old data\'s types', async () => {
    const host = mount();
    const linkTypes = { deal: { color: '#123456', label: 'Deal' }, loan: { color: '#654321', label: 'Loan' } };
    const g = track(new Graph(host, { duration: 0, linkTypes, relationTypes: ['deal'] }));
    await g.setData(first).whenReady();
    await g.setData(second).whenReady();
    expect(legend(host).sort()).toEqual(['deal', 'loan']);
  });

  it('a filter set from the legend before setData still lets the legend list the new data\'s types', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    g.setRelationTypes(['work']);
    await g.whenReady();
    await g.setData(second).whenReady();
    expect(legend(host)).toContain('deal');
  });

  it('autofocus: the most distinct neighbours, not the most tie entries', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData({ links: [
      { source: 'p', target: 'q', type: 't1' },
      { source: 'p', target: 'q', type: 't2' },
      { source: 'q', target: 'p', type: 't3' },
      { from: 'h', to: 'a' },
      { from: 'h', to: 'b' },
    ] }).whenReady();
    expect(g._root).toBe('h');
  });

  it('autofocus ignores ties to themselves and ties without both ends', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData({ links: [
      { source: 's', target: 's' }, { source: 's', target: 's', type: 'x' },
      { source: 'lonely' }, { target: 'lonely' }, { source: 'lonely', target: null },
      { source: 'a', target: 'b' },
    ] }).whenReady();
    expect(g._root).toBe('a');
    expect(ids(host)).toEqual(['a', 'b']);
  });

  it('autofocus under relationTypes: the best-connected node by the ties the view draws', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, relationTypes: ['family'] }));
    await g.setData({ links: [
      { source: 'hub', target: 'w1', type: 'work' },
      { source: 'hub', target: 'w2', type: 'work' },
      { source: 'hub', target: 'w3', type: 'work' },
      { source: 'm', target: 'f1', type: 'family' },
      { source: 'm', target: 'f2', type: 'family' },
    ] }).whenReady();
    expect(g._root).toBe('m');
    expect(ids(host)).toEqual(['f1', 'f2', 'm']);
  });

  it('an empty payload clears the ego drawing, legend, notes and details', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, details: true, maxNodes: 1 }));
    await g.setData(first).whenReady();
    await g.focus('b').whenReady();
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelector('.rc-graph-note').hidden).toBe(false);   // "+N more"
    await g.setData({ nodes: [], links: [] }).whenReady();
    expect(host.querySelectorAll('.rc-graph-node, .rc-graph-link, .rc-graph-link-hit')).toHaveLength(0);
    expect(host.querySelectorAll('.rc-graph-legend-item')).toHaveLength(0);
    expect(host.querySelector('.rc-graph-note').hidden).toBe(true);
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    expect(host.querySelector('.rc-graph-details').textContent).toContain('Hover a node');
    // and the next data draws as usual
    await g.setData(second).whenReady();
    expect(ids(host)).toEqual(['q']);                // maxNodes: 1
    expect(g._root).toBe('q');
  });

  it('an empty payload clears a path view too — its route captions included', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData(first);
    await g.connect('b', 'c').whenReady();
    expect(host.querySelectorAll('.rc-graph-row-label').length).toBeGreaterThan(0);
    await g.setData({}).whenReady();
    expect(host.querySelectorAll('.rc-graph-node, .rc-graph-row-label, .rc-arrow')).toHaveLength(0);
  });

  it('overview() after setData() keeps a centre of the new data for the zoom back in', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    await g.setData(second).overview().whenReady();
    expect(['p', 'q', 'r']).toContain(g._root);
  });
});

describe('R-18: connect(a, a)', () => {
  it('memorySource answers one route of one node, no ties', async () => {
    const src = memorySource(first);
    expect(await src.paths('a', 'a', { k: 3 })).toEqual({ paths: [['a']], nodes: [{ id: 'a', label: 'A' }], links: [] });
  });

  it('the path view draws the node once: no routes, captions or context', async () => {
    const warn = vi.spyOn(console, 'warn');
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData(first);
    await g.connect('a', 'a').whenReady();
    expect(ids(host)).toEqual(['a']);
    expect(host.querySelectorAll('.rc-graph-link, .rc-graph-row-label')).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a source that repeats a route still gets one row per route', () => {
    const { rows } = pathLayout({ paths: [['a', 'm', 'b'], ['a', 'm', 'b'], ['a', 'n', 'b']] }, { width: 800, height: 400 });
    expect(rows).toHaveLength(2);
    const self = pathLayout({ paths: [['a'], ['a'], ['a']] }, { width: 800, height: 400 });
    expect(self.rows).toEqual([]);
    expect(self.positions.get('a')).toMatchObject({ x: 400, y: 200 });
  });
});

describe('C-36: path-view labels stay inside the drawing', () => {
  it('pathLayout moves an end node in by half its label', () => {
    const half = { a: 30, b: 30, m: 20, r1: 60, l1: 60 };
    const { positions } = pathLayout(
      { paths: [['a', 'm', 'b']], context: { a: ['l1'], b: ['r1'] } },
      { width: 800, height: 400, labelHalf: id => half[id] });
    positions.forEach((p, id) => {
      expect(p.x - half[id], id).toBeGreaterThanOrEqual(4);
      expect(p.x + half[id], id).toBeLessThanOrEqual(796);
    });
    // nodes away from the edges stay where the routes put them
    expect(positions.get('m').x).toBe(400);
  });

  it('the Graph path view keeps a long context label inside the svg', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData({ links: [
      { source: 'a', target: 'm' }, { source: 'm', target: 'b' },
      { source: 'b', target: 'verdant', weight: 0.9 },
    ], nodes: [{ id: 'verdant', label: 'Verdant Group Holdings Ltd' }] });
    await g.connect('a', 'b').whenReady();
    const W = g._renderedSize.W;                      // the width the layout had
    [...host.querySelectorAll('.rc-graph-node')].forEach(el => {
      const x = Number(el.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]);
      const label = String(el.__data__.label ?? el.__data__.id);
      const half = label.length * 6.2 / 2;          // the estimate jsdom falls back to
      expect(x - half, label).toBeGreaterThanOrEqual(0);
      expect(x + half, label).toBeLessThanOrEqual(W);
    });
  });
});

describe('C-37: the details panel lists ties without a second marker', () => {
  it('a node\'s ties are a .rc-graph-details-ties list', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, details: true }));
    await g.setData(first).whenReady();
    const list = host.querySelector('.rc-graph-details ul');
    expect(list.classList.contains('rc-graph-details-ties')).toBe(true);
    expect(list.querySelector('li').textContent.trim()).toMatch(/^→ /);
  });

  it('rare-charts.css drops the bullet and its indent there', () => {
    const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
    const decls = {};
    root.walkRules(r => {
      if (!r.selectors.includes('.rc-graph-details .rc-graph-details-ties')) return;
      r.walkDecls(d => { decls[d.prop] = d.value; });
    });
    expect(decls).toMatchObject({ 'list-style': 'none', 'padding-left': '0' });
  });
});

describe('C-38: a short flow drawing gives its padding to the rows', () => {
  const nodes = [
    { id: 'dex', lane: 'l2', row: -1 },
    { id: 'wallet', lane: 'l2', row: 0, sub: 'osmo1…w7zs' },
    { id: 'buyer', lane: 'l2', row: 1 },
  ];
  const ys = res => ['dex', 'wallet', 'buyer'].map(id => res.positions.get(id).y);

  it('rows keep room for a node, its two caption lines and the node below', () => {
    // 270 px: the step-6 900 px card with title, buttons, legend and navigator
    const [a, b, c] = ys(layoutFlow({ nodes }, { width: 900, height: 270, layout: 'hints' }));
    expect(b - a).toBeGreaterThanOrEqual(2 * 18 + 38);
    expect(c - b).toBeGreaterThanOrEqual(2 * 18 + 38);
    expect(a - 18).toBeGreaterThanOrEqual(34 + 8);    // under the lane headers
  });

  it('a drawing with room is laid out as before', () => {
    // header 34 + pad 24; band 600 − 58 − 24 − 36 − 36 = 446; step min(120, 223)
    expect(ys(layoutFlow({ nodes }, { width: 900, height: 600, layout: 'hints' }))).toEqual([179, 299, 419]);
  });
});

describe('C-33: Graph callbacks stay quiet after destroy()', () => {
  const flowData = {
    lanes: [{ id: 'l1' }, { id: 'l2' }],
    nodes: [{ id: 'a', lane: 'l1' }, { id: 'b', lane: 'l2' }, { id: 'c', lane: 'l2' }],
    links: [{ source: 'a', target: 'b', value: 1 }, { source: 'a', target: 'c', value: 2 }],
  };

  it('flow view: select() and collapse() after destroy() call neither onSelect nor onFoldChange', () => {
    const onSelect = vi.fn(), onFoldChange = vi.fn();
    const g = new Graph(mount(null), { view: 'flow', duration: 0, onSelect, onFoldChange,
      folds: [{ id: 'f', members: ['b', 'c'], collapsed: false }] }).setData(flowData);
    g.select({ node: 'a' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    g.destroy();
    g.select({ node: 'b' });
    g.collapse('f');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onFoldChange).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphModel } from '../assets/charts/src/graph/model.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { egoLayout } from '../assets/charts/src/graph/layouts/ego.js';
import { pathLayout } from '../assets/charts/src/graph/layouts/path.js';
import { clusterLayout } from '../assets/charts/src/graph/layouts/cluster.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';

// Fixture: a small two-community graph.
//
//   a ─ b ─ c ─ d        left chain into right triangle
//   a ─ e                e hangs off the root
//   c ─ f, d ─ f         f closes the triangle
//
const fixture = {
  nodes: [
    { id: 'a', label: 'A', group: 'g1' },
    { id: 'b', label: 'B', group: 'g1' },
    { id: 'c', label: 'C', group: 'g2' },
    { id: 'd', label: 'D', group: 'g2' },
    { id: 'e', label: 'E', group: 'g1' },
    { id: 'f', label: 'F', group: 'g2' },
  ],
  links: [
    { source: 'a', target: 'b', type: 'professional', weight: 0.9 },
    { source: 'b', target: 'c', type: 'investment',   weight: 0.5 },
    { source: 'c', target: 'd', type: 'investment',   weight: 0.7 },
    { source: 'a', target: 'e', type: 'family',       weight: 0.8 },
    { source: 'c', target: 'f', type: 'professional', weight: 0.4 },
    { source: 'd', target: 'f', type: 'professional', weight: 0.6 },
  ],
};

// ─── GraphModel ────────────────────────────────────────────────────────────────

describe('GraphModel', () => {
  it('merges payloads idempotently and accumulates new ones', () => {
    const m = new GraphModel(fixture);
    expect(m.order).toBe(6);
    m.merge(fixture);                       // re-merge: no duplicates, no throw
    expect(m.order).toBe(6);
    m.merge({ nodes: [{ id: 'z', label: 'Z' }], links: [{ source: 'z', target: 'a' }] });
    expect(m.order).toBe(7);
    expect(m.link('z', 'a')).not.toBeNull();
  });

  it('neighborhood returns BFS depths and induced links only', () => {
    const m = new GraphModel(fixture);
    const sub = m.neighborhood('a', 2);
    const depths = Object.fromEntries(sub.nodes.map(n => [n.id, n.depth]));
    expect(depths).toEqual({ a: 0, b: 1, e: 1, c: 2 });
    // induced: only links among {a,b,e,c}
    expect(sub.links).toHaveLength(3);
    expect(sub.links.every(l => depths[l.source] != null && depths[l.target] != null)).toBe(true);
  });

  it('neighborhood type filter drops off-type induced links and keeps untyped as default', () => {
    // Triangle with mixed types: both b and c are family-reachable from a,
    // but the b–c tie is work — a family filter must not display it.
    const m = new GraphModel({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      links: [
        { source: 'a', target: 'b', type: 'family' },
        { source: 'a', target: 'c', type: 'family' },
        { source: 'b', target: 'c', type: 'work' },
      ],
    });
    const sub = m.neighborhood('a', 1, { types: ['family'] });
    expect(sub.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(sub.links.map(l => l.type)).toEqual(['family', 'family']);

    // Untyped links belong to the 'default' type the legend names them by
    const untyped = new GraphModel({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b' }],
    });
    expect(untyped.neighborhood('a', 1, { types: ['default'] }).links).toHaveLength(1);
    expect(untyped.neighborhood('a', 1, { types: ['family'] }).links).toHaveLength(0);
  });

  it('centrality finds the broker: b sits on every left↔right path', () => {
    const m = new GraphModel(fixture);
    const { betweenness, degree } = m.centrality();
    const others = ['a', 'e', 'f'].map(id => betweenness[id]);
    expect(others.every(v => betweenness.b > v)).toBe(true);
    expect(degree.a).toBeGreaterThan(0);
  });

  it('communitySummary is deterministic and covers all nodes', () => {
    const m = new GraphModel(fixture);
    const s1 = m.communitySummary();
    const s2 = m.communitySummary();
    expect(s1.communities.map(c => c.members.sort())).toEqual(
      s2.communities.map(c => c.members.sort()));
    const total = s1.communities.reduce((n, c) => n + c.size, 0);
    expect(total).toBe(6);
  });
});

// ─── memorySource ──────────────────────────────────────────────────────────────

describe('memorySource', () => {
  it('neighbors answers the ego query', async () => {
    const src = memorySource(fixture);
    const sub = await src.neighbors('a', { depth: 1 });
    expect(sub.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'e']);
  });

  it('paths finds edge-disjoint routes a→f', async () => {
    const src = memorySource(fixture);
    const res = await src.paths('a', 'f', { k: 3 });
    expect(res.paths.length).toBeGreaterThanOrEqual(1);
    expect(res.paths[0][0]).toBe('a');
    expect(res.paths[0].at(-1)).toBe('f');
    // shortest route first: a-b-c-f (4 nodes)
    expect(res.paths[0]).toHaveLength(4);
    // payload nodes carry attributes from the model
    expect(res.nodes.find(n => n.id === 'f').label).toBe('F');
  });

  it('paths between unconnected nodes returns empty, not throws', async () => {
    const src = memorySource({
      nodes: [{ id: 'x' }, { id: 'y' }],
      links: [],
    });
    const res = await src.paths('x', 'y');
    expect(res.paths).toEqual([]);
    const missing = await src.paths('x', 'nope');
    expect(missing.paths).toEqual([]);
  });

  it('aggregates returns communities and inter-community links', async () => {
    const src = memorySource(fixture);
    const agg = await src.aggregates();
    expect(agg.communities.length).toBeGreaterThanOrEqual(1);
    agg.links.forEach(l => {
      expect(l.source).toMatch(/^c/);
      expect(l.weight).toBeGreaterThan(0);
    });
  });
});

// ─── Layouts ───────────────────────────────────────────────────────────────────

describe('egoLayout', () => {
  const dims = { rootId: 'a', width: 800, height: 600 };

  it('pins the root near the center of the grid', () => {
    const m = new GraphModel(fixture);
    const sub = m.neighborhood('a', 2);
    const { positions: pos } = egoLayout(sub, dims);

    const root = pos.get('a');
    // center cell of the grid — within one cell of the exact center
    expect(Math.abs(root.x - 400)).toBeLessThan(120);
    expect(Math.abs(root.y - 300)).toBeLessThan(110);
  });

  it('gives each node its own cell and each category its own corner', () => {
    const m = new GraphModel(fixture);
    const sub = m.neighborhood('a', 2);
    const { positions: pos, sectors } = egoLayout(sub, dims);

    // no two nodes share a cell
    const seen = new Set();
    pos.forEach(p => {
      const cell = `${Math.round(p.x)},${Math.round(p.y)}`;
      expect(seen.has(cell)).toBe(false);
      seen.add(cell);
    });

    // fixture groups among placed non-root nodes: b,e → g1, c → g2
    expect(sectors.map(s => s.key).sort()).toEqual(['g1', 'g2']);
    // same-category nodes cluster: b and e sit closer to each other than to c
    const dist = (x, y) => Math.hypot(pos.get(x).x - pos.get(y).x, pos.get(x).y - pos.get(y).y);
    expect(dist('b', 'e')).toBeLessThan(dist('b', 'c'));
    expect(dist('b', 'e')).toBeLessThan(dist('e', 'c'));
  });

  it('is deterministic and places every node', () => {
    const m = new GraphModel(fixture);
    const sub = m.neighborhood('a', 2);
    const { positions: p1 } = egoLayout(sub, dims);
    const { positions: p2 } = egoLayout(sub, dims);
    expect(p1.size).toBe(sub.nodes.length);
    sub.nodes.forEach(n => {
      expect(p1.get(n.id)).toEqual(p2.get(n.id));
    });
  });
});

describe('pathLayout', () => {
  it('lays hops out left→right with centered endpoints and row captions', () => {
    const { positions: pos, rows } = pathLayout(
      { paths: [['a', 'b', 'c', 'f'], ['a', 'e', 'f']] },
      { width: 800, height: 600 });

    expect(pos.get('a').x).toBeLessThan(pos.get('b').x);
    expect(pos.get('b').x).toBeLessThan(pos.get('c').x);
    expect(pos.get('c').x).toBeLessThan(pos.get('f').x);
    // endpoints vertically centered
    expect(pos.get('a').y).toBe(300);
    expect(pos.get('f').y).toBe(300);
    // rows separated
    expect(pos.get('b').y).not.toBe(pos.get('e').y);
    // first row is the shortest route
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ hops: 3, shortest: true });
    expect(rows[1]).toMatchObject({ hops: 2, shortest: false });
  });

  it('fans endpoint context behind the endpoints', () => {
    const { positions: pos } = pathLayout(
      { paths: [['a', 'b', 'f']], context: { a: ['x1', 'x2'], f: ['y1'] } },
      { width: 800, height: 600 });

    // context sits outward of its endpoint and is flagged
    expect(pos.get('x1').x).toBeLessThan(pos.get('a').x + 1);
    expect(pos.get('y1').x).toBeGreaterThan(pos.get('f').x - 1);
    expect(pos.get('x1').context).toBe(true);
  });
});

describe('clusterLayout', () => {
  it('places meta-nodes on a circle, single community centered', () => {
    const two = clusterLayout(
      { nodes: [{ id: 'c0' }, { id: 'c1' }] },
      { width: 800, height: 600 });
    expect(two.size).toBe(2);
    const d0 = Math.hypot(two.get('c0').x - 400, two.get('c0').y - 300);
    const d1 = Math.hypot(two.get('c1').x - 400, two.get('c1').y - 300);
    expect(d0).toBeCloseTo(d1, 6);

    const one = clusterLayout({ nodes: [{ id: 'c0' }] }, { width: 800, height: 600 });
    expect(one.get('c0')).toEqual({ x: 400, y: 300 });
  });
});

// ─── Graph viewport (smoke + interaction contract) ─────────────────────────────

describe('Graph viewport', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
  });

  it('constructs, renders a labelled svg, and draws the ego view', async () => {
    const g = new Graph('#chart', { title: 'Network', duration: 0 })
      .setData(fixture);
    await g.whenReady();

    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Network');
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.rc-graph-link').length).toBeGreaterThan(0);
  });

  it('focus() recenters: view keeps shared nodes, root changes', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const first = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(first).toContain('A');
    expect(first).not.toContain('D');

    await g.focus('c').whenReady();
    const second = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(second).toContain('C');
    expect(second).toContain('D');
  });

  it('focus() filters traversal by relation type and can clear the filter', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 2, duration: 0 });
    await g.focus('a', { types: ['family'] }).whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toEqual(expect.arrayContaining(['A', 'E']));
    expect(labels()).not.toContain('B');

    await g.clearRelationTypes().whenReady();
    expect(labels()).toContain('B');
    expect(labels()).toContain('C');
  });

  it('interactive legend isolates, multi-selects and resets relation types', async () => {
    const g = new Graph('#chart', {
      dataSource: memorySource(fixture), depth: 2, duration: 0,
      linkTypes: {
        professional: { color: '#09f', label: 'Professional' },
        investment: { color: '#f90', label: 'Investment' },
        family: { color: '#0c7', label: 'Family' },
      },
    });
    await g.focus('a').whenReady();
    const item = type => host.querySelector(`.rc-graph-legend-item[data-type="${type}"]`);
    item('family').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-link')]).toHaveLength(1);
    expect(item('family').getAttribute('aria-pressed')).toBe('true');
    expect(item('professional').getAttribute('aria-pressed')).toBe('false');

    item('professional').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-link')].length).toBeGreaterThan(1);

    host.querySelector('.rc-graph-legend-reset').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect(item('investment').getAttribute('aria-pressed')).toBe('true');
  });

  it('progressive contract: a links-only payload drives all three views', async () => {
    // The minimal unit of data: links with source/target, nothing else.
    // Nodes are auto-created, labels fall back to ids, untyped links act as
    // 'default', weights default — every view must render something sensible.
    const g = new Graph('#chart', { duration: 0 }).setData({
      links: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'd' },
        { source: 'a', target: 'd' },
      ],
    });
    await g.whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
    expect(labels().join(' ')).not.toContain('undefined');
    expect(host.querySelectorAll('.rc-graph-link').length).toBeGreaterThan(0);

    await g.connect('a', 'c').whenReady();
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelector('.rc-graph-row-label')?.textContent).toMatch(/hop/);

    await g.overview().whenReady();
    expect(labels().length).toBeGreaterThan(0);
    expect(labels().join(' ')).not.toContain('undefined');
  });

  it('progressive contract: tooltip falls back to the id when label is absent', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData({
      links: [{ source: 'acme', target: 'globex' }],
    });
    await g.whenReady();
    host.querySelector('.rc-graph-node')
      .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const tip = host.querySelector('.rc-tooltip');
    expect(tip.textContent).toMatch(/acme|globex/);
    expect(tip.textContent).not.toContain('undefined');
  });

  it('queued focus() calls each fetch with their own type filter', async () => {
    const src = memorySource(fixture);
    const calls = [];
    const spy = {
      ...src,
      neighbors: (id, opts) => { calls.push(opts.types); return src.neighbors(id, opts); },
    };
    const g = new Graph('#chart', { dataSource: spy, depth: 1, duration: 0 });
    g.focus('a', { types: ['family'] });
    g.focus('c', { types: ['investment'] });   // queued before the first fetch runs
    await g.whenReady();
    expect(calls).toEqual([['family'], ['investment']]);
  });

  it('legend is a static caption in the path view', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.connect('a', 'f').whenReady();
    const items = [...host.querySelectorAll('.rc-graph-legend-item')];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(b => b.disabled)).toBe(true);
    expect(items.every(b => !b.hasAttribute('aria-pressed'))).toBe(true);
    expect(host.querySelector('.rc-graph-legend-reset')).toBeNull();
  });

  it('tolerates a source payload without links', async () => {
    const g = new Graph('#chart', {
      duration: 0,
      dataSource: {
        neighbors: async () => ({ nodes: [{ id: 'a', label: 'A' }] }),
        paths: async () => ({ paths: [], nodes: [], links: [] }),
        aggregates: async () => ({ communities: [], links: [] }),
      },
    });
    await g.focus('a').whenReady();
    expect(host.querySelectorAll('.rc-graph-node')).toHaveLength(1);
  });

  it('selecting the default legend type keeps untyped links visible', async () => {
    // Untyped links surface in the legend as 'default' — clicking that item
    // must select them, not filter the whole neighborhood away.
    const untyped = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    };
    const g = new Graph('#chart', { dataSource: memorySource(untyped), depth: 2, duration: 0 });
    await g.focus('a').whenReady();
    const item = host.querySelector('.rc-graph-legend-item[data-type="default"]');
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(host.querySelectorAll('.rc-graph-link')).toHaveLength(2);
  });

  it('connect() renders the path view with context and a shortest caption', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.connect('a', 'f').whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toContain('A');
    expect(labels).toContain('F');
    // endpoint context: E (a's other tie) and D (f's other tie) fan behind
    expect(labels).toContain('E');
    expect(labels).toContain('D');
    // row caption calls out the shortest route
    const caption = host.querySelector('.rc-graph-row-label');
    expect(caption?.textContent).toContain('shortest');
  });

  it('overview() renders community meta-nodes', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.overview().whenReady();
    const nodes = host.querySelectorAll('.rc-graph-node');
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.every(l => / · \d+$/.test(l))).toBe(true);
  });

  it('renders group icons inside nodes; nodeIcons:false disables them', async () => {
    const data = {
      nodes: [
        { id: 'p', label: 'P', group: 'person' },
        { id: 'c', label: 'C', group: 'company' },
        { id: 'x', label: 'X', group: 'no-such-group' },
      ],
      links: [{ source: 'p', target: 'c' }, { source: 'p', target: 'x' }],
    };
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    await g.whenReady();
    // person + company get glyphs, unknown group stays a plain circle
    expect(host.querySelectorAll('.rc-graph-node-icon').length).toBe(2);

    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
    const plain = new Graph('#chart', { duration: 0, nodeIcons: false }).setData(data);
    await plain.whenReady();
    expect(host.querySelectorAll('.rc-graph-node-icon').length).toBe(0);
  });

  it('sizeBy: degree makes the hub larger than a leaf', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), sizeBy: 'degree', duration: 0 });
    await g.focus('c').whenReady();   // c has degree 3, a has degree 2
    const rOf = id => {
      const el = [...host.querySelectorAll('.rc-graph-node')]
        .find(n => n.querySelector('.rc-graph-node-label')?.textContent === id);
      return +el.querySelector('.rc-graph-node-circle').getAttribute('r');
    };
    expect(rOf('C')).toBeGreaterThan(rOf('A'));
  });

  it('hide()/show() toggle a node out of the ego view, model intact', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toContain('E');

    g.hide('e');
    expect(labels()).not.toContain('E');
    g.show('e');
    expect(labels()).toContain('E');
  });

  it('right-click hides a node (ego exempt); restore control brings it back', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    const nodeOf = name => [...host.querySelectorAll('.rc-graph-node')]
      .find(n => n.querySelector('.rc-graph-node-label')?.textContent === name);
    const rightClick = el => el.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    rightClick(nodeOf('E'));
    expect(labels()).not.toContain('E');

    rightClick(nodeOf('A'));           // the ego cannot be hidden
    expect(labels()).toContain('A');

    const note = host.querySelector('.rc-graph-hidden-note');
    expect(note?.textContent).toContain('1 hidden');
    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(labels()).toContain('E');
    expect(host.querySelector('.rc-graph-hidden-note')).toBeNull();
  });

  it('add() merges a news-sized payload and refreshes the ego view', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    // minimal unit of ingestion: one link; the endpoint node is auto-created
    g.add({ links: [{ source: 'a', target: 'lloyds', type: 'professional' }] });
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toContain('lloyds');   // label falls back to the id
  });

  it('caps the ego view at maxNodes and notes the hidden count', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), maxNodes: 3, duration: 0 });
    await g.focus('a').whenReady();   // full depth-2 neighborhood would be 4 nodes
    expect(host.querySelectorAll('.rc-graph-node').length).toBe(3);
    const note = host.querySelector('.rc-graph-note');
    expect(note?.textContent).toContain('+1 more');
    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const overflow = host.querySelector('.rc-graph-overflow');
    expect(overflow.hidden).toBe(false);
    expect(overflow.querySelectorAll('.rc-graph-overflow-item')).toHaveLength(1);

    overflow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overflow.hidden).toBe(true);

    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overflow.hidden).toBe(false);
    overflow.querySelector('.rc-graph-overflow-item')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect(overflow.hidden).toBe(true);
  });

  it('breadcrumbs restore prior views and back() follows the same history', async () => {
    const g = new Graph('#chart', {
      dataSource: memorySource(fixture), depth: 1, duration: 0, zoom: false,
    });
    await g.focus('a').whenReady();
    await g.focus('c').whenReady();
    let crumbs = [...host.querySelectorAll('.rc-graph-breadcrumbs button')];
    expect(crumbs.map(el => el.textContent)).toEqual(['A', 'C']);

    crumbs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent)).toContain('A');

    await g.focus('c').whenReady();
    await g.back().whenReady();
    expect([...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent)).toContain('A');
  });

  it('renders zoom controls, and omits them with zoom: false', async () => {
    new Graph('#chart', { duration: 0 }).setData(fixture);
    expect(host.querySelectorAll('.rc-graph-zoom-controls button').length).toBe(3);

    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
    new Graph('#chart', { duration: 0, zoom: false }).setData(fixture);
    expect(host.querySelectorAll('.rc-graph-zoom-controls').length).toBe(0);
  });

  it('tooltip on a hub is a capped counts-first summary', async () => {
    // hub with 9 ties — more than the 6-name cap
    const hub = {
      nodes: [{ id: 'hub', label: 'Hub', group: 'person' },
        ...Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: `N${i}`, group: 'company' }))],
      links: Array.from({ length: 9 }, (_, i) =>
        ({ source: 'hub', target: `n${i}`, type: i % 2 ? 'investment' : 'professional', weight: 0.5 })),
    };
    const g = new Graph('#chart', { duration: 0 }).setData(hub);
    await g.whenReady();

    const hubEl = [...host.querySelectorAll('.rc-graph-node')]
      .find(n => n.querySelector('.rc-graph-node-label')?.textContent === 'Hub');
    hubEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    const tip = host.querySelector('.rc-tooltip');
    expect(tip?.innerHTML).toContain('9 connections');
    expect(tip?.innerHTML).toContain('+3 more');        // 9 ties, 6-name cap
    expect(tip?.innerHTML).toContain('· 5');            // per-type counts
  });

  it('destroy() cleans up without throwing', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(fixture);
    await g.whenReady();
    expect(() => g.destroy()).not.toThrow();
  });
});

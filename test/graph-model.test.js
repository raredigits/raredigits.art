import { describe, it, expect } from 'vitest';
import { GraphModel } from '../assets/charts/src/graph/model.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { egoLayout, egoCapacity } from '../assets/charts/src/graph/layouts/ego.js';
import { pathLayout } from '../assets/charts/src/graph/layouts/path.js';
import { clusterLayout } from '../assets/charts/src/graph/layouts/cluster.js';
import { fixture } from './fixtures/graph.js';

// The Graph's pure parts, without a DOM: the model (GraphModel), the in-memory
// data source and the ego / path / cluster layouts. The chart itself is in
// graph.test.js; the flow view's layout in flow-layout.test.js.

// ─── GraphModel ────────────────────────────────────────────────────────────────

describe('GraphModel', () => {
  it('merges payloads idempotently and accumulates new ones', () => {
    // The tie set, not just the node count: a re-merge must not add a single
    // tie, and a new payload adds exactly its own (S-04).
    const ties = m => m.toData().links.map(l => `${l.source}→${l.target}|${l.type ?? '-'}`).sort();
    const m = new GraphModel(fixture);
    const before = ties(m);
    expect(m.order).toBe(6);
    expect(before).toHaveLength(6);
    m.merge(fixture);                       // re-merge: no duplicate nodes or ties
    expect(m.order).toBe(6);
    expect(ties(m)).toEqual(before);
    m.merge({ nodes: [{ id: 'z', label: 'Z' }], links: [{ source: 'z', target: 'a' }] });
    expect(m.order).toBe(7);
    expect(ties(m)).toEqual([...before, 'z→a|-'].sort());
    expect(m.links('a', 'z')).toEqual([expect.objectContaining({ source: 'z', target: 'a' })]);
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

describe('GraphModel ids (R-19)', () => {
  it('a numeric id is its string: neighborhood(1) finds the neighbour', () => {
    const m = new GraphModel({ nodes: [{ id: 1 }, { id: 2 }], links: [{ source: 1, target: 2 }] });
    const viaNumber = m.neighborhood(1, 1), viaString = m.neighborhood('1', 1);
    expect(viaNumber.nodes.map(n => n.id).sort()).toEqual(['1', '2']);
    expect(viaNumber.links).toHaveLength(1);
    expect(viaNumber).toEqual(viaString);
    expect(new GraphModel({ nodes: [{ id: 0 }] }).node(0)).toMatchObject({ id: '0' });
  });

  it('ties of different pairs never share a key, even with separators in ids (R-20)', () => {
    const m = new GraphModel({ links: [{ source: 'a→b', target: 'c' }, { source: 'a', target: 'b→c' }] });
    expect(m.toData().links).toHaveLength(2);
  });
});

// ─── GraphModel — multigraph storage (A2, 0.9.8_3) ─────────────────────────────

describe('GraphModel — multigraph storage', () => {
  const multi = {
    nodes: [{ id: 'trump' }, { id: 'kushner' }, { id: 'x' }],
    links: [
      { source: 'trump', target: 'kushner', type: 'family' },
      { source: 'trump', target: 'kushner', type: 'investment' },
      { source: 'kushner', target: 'trump', type: 'employment' },
      { source: 'kushner', target: 'x', type: 'investment' },
    ],
  };

  it('keeps every typed tie of a pair, in both directions', () => {
    const m = new GraphModel(multi);
    const ties = m.links('trump', 'kushner');
    expect(ties.map(l => l.type).sort()).toEqual(['employment', 'family', 'investment']);
    expect(ties.every(l => typeof l.id === 'string')).toBe(true);
  });

  it('re-merging is idempotent; same pair + type updates in place', () => {
    const m = new GraphModel(multi);
    m.merge(multi);
    expect(m.links('trump', 'kushner')).toHaveLength(3);
    m.merge({ links: [{ source: 'trump', target: 'kushner', type: 'family', label: 'son-in-law' }] });
    const fam = m.links('trump', 'kushner').find(l => l.type === 'family');
    expect(fam.label).toBe('son-in-law');
    expect(m.links('trump', 'kushner')).toHaveLength(3);
  });

  it('caller ids are the identity; from/to aliases are accepted', () => {
    const m = new GraphModel({ links: [
      { id: 'tx1', from: 'a', to: 'b', type: 'swap' },
      { id: 'tx2', from: 'a', to: 'b', type: 'swap' },
    ] });
    expect(m.links('a', 'b').map(l => l.id).sort()).toEqual(['tx1', 'tx2']);
    expect(m.links('a', 'b')[0]).not.toHaveProperty('from');
  });

  it('analytics see one tie per pair: degree is not inflated by parallel ties', () => {
    const m = new GraphModel(multi);
    expect(m.degree('trump')).toBe(1);
    expect(m.degree('kushner')).toBe(2);
  });

  it('the type filter applies per tie: isolating a type keeps only that tie of the pair', () => {
    const m = new GraphModel(multi);
    const sub = m.neighborhood('trump', 1, { types: ['investment'] });
    expect(sub.links.map(l => l.type)).toEqual(['investment']);
    expect(sub.nodes.map(n => n.id).sort()).toEqual(['kushner', 'trump']);
  });

  it('memorySource paths ignore direction and return every tie along the route', async () => {
    const src = memorySource({ links: [
      { source: 'b', target: 'a', type: 'family' },
      { source: 'a', target: 'b', type: 'deal' },
      { source: 'c', target: 'b' },
    ] });
    const res = await src.paths('a', 'c', { k: 1 });
    expect(res.paths[0]).toEqual(['a', 'b', 'c']);
    expect(res.links.map(l => l.type ?? 'default').sort()).toEqual(['deal', 'default', 'family']);
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

describe('egoLayout — one dominant category (A4)', () => {
  // 60 nodes of a single group: 12 first-ring, 48 second-ring.
  const nodes = [{ id: 'ego', depth: 0, group: 'person' }];
  const links = [];
  for (let i = 0; i < 12; i++) {
    nodes.push({ id: `r1-${i}`, depth: 1, group: 'person' });
    links.push({ source: 'ego', target: `r1-${i}` });
    for (let j = 0; j < 4; j++) {
      nodes.push({ id: `r2-${i}-${j}`, depth: 2, group: 'person' });
      links.push({ source: `r1-${i}`, target: `r2-${i}-${j}` });
    }
  }
  const W = 900, H = 600;
  const { positions: p, sectors } = egoLayout({ nodes, links }, { rootId: 'ego', width: W, height: H });

  it('centres the ego and spreads every node around it — not into one corner', () => {
    expect(Math.abs(p.get('ego').x - W / 2)).toBeLessThan(W / 6);
    expect(Math.abs(p.get('ego').y - H / 2)).toBeLessThan(H / 6);
    const pts = nodes.slice(1).map(n => p.get(n.id));
    const quadrant = pt => `${pt.x < W / 2 ? 'L' : 'R'}${pt.y < H / 2 ? 'T' : 'B'}`;
    const counts = {};
    pts.forEach(pt => { counts[quadrant(pt)] = (counts[quadrant(pt)] ?? 0) + 1; });
    expect(Object.keys(counts).sort()).toEqual(['LB', 'LT', 'RB', 'RT']);
    Object.values(counts).forEach(c => expect(c).toBeGreaterThan(8));
  });

  it('keeps depth readable as distance, on the grid, inside the canvas', () => {
    const e = p.get('ego');
    const d = id => Math.hypot(p.get(id).x - e.x, p.get(id).y - e.y);
    const first = Math.max(...nodes.filter(n => n.depth === 1).map(n => d(n.id)));
    const second = Math.min(...nodes.filter(n => n.depth === 2).map(n => d(n.id)));
    expect(second).toBeGreaterThanOrEqual(first - 1e-9);
    // on the grid: shared column/row centres, not free angles
    const xs = new Set(nodes.map(n => Math.round(p.get(n.id).x)));
    expect(xs.size).toBeLessThan(nodes.length / 3);
    nodes.forEach(n => {
      const pt = p.get(n.id);
      expect(pt.x).toBeGreaterThan(0); expect(pt.x).toBeLessThan(W);
      expect(pt.y).toBeGreaterThan(0); expect(pt.y).toBeLessThan(H);
    });
    expect(sectors).toHaveLength(1);
  });

  it('no two nodes share a spot', () => {
    const seen = new Set();
    nodes.forEach(n => {
      const key = `${Math.round(p.get(n.id).x)},${Math.round(p.get(n.id).y)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });
});

describe('egoLayout — wide canvas, one dominant category', () => {
  it('spreads across the width on cells at least ~96 px wide', () => {
    const nodes = [{ id: 'ego', depth: 0, group: 'fund' }];
    for (let i = 0; i < 33; i++) nodes.push({ id: `f${i}`, depth: i < 8 ? 1 : 2, group: 'fund' });
    const W = 740, H = 387;
    const { positions, cellW } = egoLayout({ nodes, links: [] }, { rootId: 'ego', width: W, height: H });
    expect(cellW).toBeGreaterThanOrEqual(96 - 1e-9);
    const xs = [...positions.values()].map(p => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(W * 0.7);
    const ys = [...positions.values()].map(p => p.y);
    expect(Math.max(...ys)).toBeLessThan(H);
  });
});

describe('egoCapacity', () => {
  it('fits a 63-node neighbourhood on a 1150 × 410 drawing (the FF Portfolio case)', () => {
    expect(egoCapacity(1150, 410)).toBeGreaterThanOrEqual(63);
  });
  it('grows with the canvas and never drops below one', () => {
    expect(egoCapacity(1600, 900)).toBeGreaterThan(egoCapacity(800, 520));
    expect(egoCapacity(10, 10)).toBe(1);
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
    // captions sit on the route (over the first intermediate node), not at
    // the left edge where the endpoint's context fan lives
    expect(rows[0].x).toBe(pos.get('b').x);
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
  it('places meta-nodes on a grid from the centre out, single community centered', () => {
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

  it('never overlaps meta-nodes and puts the first (largest) nearest the centre', () => {
    const nodes = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}` }));
    const pos = clusterLayout({ nodes }, { width: 800, height: 520 });
    const pts = nodes.map(n => pos.get(n.id));
    const seen = new Set(pts.map(p => `${Math.round(p.x)},${Math.round(p.y)}`));
    expect(seen.size).toBe(9);
    const d = p => Math.hypot(p.x - 400, p.y - 260);
    expect(d(pts[0])).toBeLessThanOrEqual(Math.min(...pts.slice(1).map(d)) + 1e-9);
    // grid: every x and y comes from a small set of column/row centres
    expect(new Set(pts.map(p => Math.round(p.x))).size).toBeLessThanOrEqual(4);
    expect(new Set(pts.map(p => Math.round(p.y))).size).toBeLessThanOrEqual(3);
  });
});

describe('layouts — vertical fit', () => {
  it('ego: the used rows run from just under the top to just above the bottom', () => {
    const m = new GraphModel(fixture);
    const sub = m.neighborhood('c', 2);
    const { positions } = egoLayout(sub, { rootId: 'c', width: 800, height: 520, nodeRadius: 22 });
    const ys = [...positions.values()].map(p => p.y);
    expect(Math.min(...ys)).toBeCloseTo(28, 0);            // radius + 6
    expect(Math.max(...ys)).toBeLessThanOrEqual(520 - 22 - 22 + 1e-6);
  });

  it('cluster: the top row sits under the edge by its largest node radius', () => {
    const nodes = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, size: i === 0 ? 3 : 1 }));
    const pos = clusterLayout({ nodes }, { width: 800, height: 520, nodeRadius: 22 });
    const ys = [...pos.values()].map(p => p.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(22 + 6 - 1e-6);
    expect(Math.max(...ys)).toBeLessThanOrEqual(520 - 22 - 22 + 1e-6);
  });
});

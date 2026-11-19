import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parallelIndex, chord, quadBow, quadPoint, sineBow } from '../assets/charts/src/core/links.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { mount, track } from './helpers.js';

// The shared geometry of curved ties (D-07): which slot a parallel tie takes
// in its fan, and how a tie bows off the straight line between its ends —
// one quadratic curve in Graph's views, a sine along a polyline in MapFlow.
// The last four blocks pin the callers, whose spacing and sizes differ.

const close = (p, q) => {
  expect(p.x).toBeCloseTo(q.x, 9);
  expect(p.y).toBeCloseTo(q.y, 9);
};
const L = (id, source, target) => ({ id, source, target });
const offsets = (idx, ids) => ids.map(id => idx.get(id).offset);

describe('parallelIndex — a tie\'s slot in its fan', () => {
  it('without options, ties of one unordered pair are one group, counted in input order', () => {
    const idx = parallelIndex([L('p', 'a', 'b'), L('q', 'a', 'c'), L('r', 'b', 'a'), L('s', 'a', 'b')]);
    expect(['p', 'r', 's'].map(id => idx.get(id).index)).toEqual([0, 1, 2]);
    expect(['p', 'r', 's'].map(id => idx.get(id).count)).toEqual([3, 3, 3]);
    expect(idx.get('q')).toEqual({ index: 0, count: 1, offset: 0 });
  });

  it('offsets are centred on 0, one apart: odd and even counts', () => {
    expect(offsets(parallelIndex([L(1, 'a', 'b'), L(2, 'a', 'b'), L(3, 'a', 'b')]), [1, 2, 3])).toEqual([-1, 0, 1]);
    expect(offsets(parallelIndex([L(1, 'a', 'b'), L(2, 'a', 'b'), L(3, 'a', 'b'), L(4, 'a', 'b')]), [1, 2, 3, 4]))
      .toEqual([-1.5, -0.5, 0.5, 1.5]);
    expect(offsets(parallelIndex([L(1, 'a', 'b'), L(2, 'a', 'b')]), [1, 2])).toEqual([-0.5, 0.5]);
  });

  it('a lone tie sits on the centre line: offset exactly 0, whichever way it runs', () => {
    const idx = parallelIndex([L('ab', 'a', 'b'), L('dc', 'd', 'c')]);
    expect(idx.get('ab').offset).toBe(0);
    expect(idx.get('dc').offset).toBe(0);   // toBe: +0, never -0
    const mid = parallelIndex([L(1, 'a', 'b'), L(2, 'b', 'a'), L(3, 'a', 'b')]);
    expect(mid.get(2).offset).toBe(0);      // the middle slot, run against the pair's direction
  });

  it('undirected: slots lie on the pair\'s direction, lower id → higher, so a tie run the other way takes the opposite sign', () => {
    const idx = parallelIndex([L(1, 'b', 'a'), L(2, 'a', 'b'), L(3, 'b', 'a')]);
    expect(offsets(idx, [1, 2, 3])).toEqual([1, 0, -1]);
    // on screen: offset × the tie's own normal is the slot on the pair's normal
    const A = { x: 0, y: 0 }, B = { x: 100, y: 0 };
    const pairN = chord(A, B).n;
    const at = (id, s, t) => idx.get(id).offset * chord(s, t).n.y;
    expect(at(1, B, A)).toBe((0 - 1) * pairN.y);
    expect(at(3, B, A)).toBe((2 - 1) * pairN.y);
    // a tie listed both ways never lands on top of the other
    const two = parallelIndex([L('there', 'a', 'b'), L('back', 'b', 'a')]);
    expect(two.get('there').offset * chord(A, B).n.y).not.toBe(two.get('back').offset * chord(B, A).n.y);
  });

  it('directed: A → B and B → A are two fans, each centred, with no sign change', () => {
    const idx = parallelIndex([L(1, 'a', 'b'), L(2, 'b', 'a'), L(3, 'a', 'b'), L(4, 'b', 'a'), L(5, 'b', 'a')], { directed: true });
    expect([1, 3].map(id => idx.get(id))).toEqual([
      { index: 0, count: 2, offset: -0.5 }, { index: 1, count: 2, offset: 0.5 },
    ]);
    expect([2, 4, 5].map(id => idx.get(id))).toEqual([
      { index: 0, count: 3, offset: -1 }, { index: 1, count: 3, offset: 0 }, { index: 2, count: 3, offset: 1 },
    ]);
    const lone = parallelIndex([L('ab', 'a', 'b'), L('ba', 'b', 'a')], { directed: true });
    expect(lone.get('ab')).toEqual({ index: 0, count: 1, offset: 0 });
    expect(lone.get('ba')).toEqual({ index: 0, count: 1, offset: 0 });
    expect(parallelIndex([L('x', 'a', 'b'), L('y', 'b', 'a')], { directed: false }).get('y').count).toBe(2);
  });

  it('directed keys stay unambiguous when ids contain separators', () => {
    const idx = parallelIndex([L(1, 'a→b', 'c'), L(2, 'a', 'b→c'), L(3, 'a', 'b'), L(4, 'a', 'b')], { directed: true });
    expect([1, 2].map(id => idx.get(id).count)).toEqual([1, 1]);
    expect([3, 4].map(id => idx.get(id).count)).toEqual([2, 2]);
  });

  it('keyed by link id; an empty list gives an empty map', () => {
    expect(parallelIndex([]).size).toBe(0);
    expect([...parallelIndex([L('u', 'a', 'b'), L('v', 'c', 'd')]).keys()]).toEqual(['u', 'v']);
  });
});

describe('chord — the straight line between two points', () => {
  it('length, unit direction, and the normal: the direction turned a quarter clockwise on screen', () => {
    const c = chord({ x: 1, y: 2 }, { x: 4, y: 6 });
    expect(c.len).toBe(5);
    expect(c.u).toEqual({ x: 0.6, y: 0.8 });
    expect(c.n).toEqual({ x: -0.8, y: 0.6 });
    close(chord({ x: 0, y: 0 }, { x: 10, y: 0 }).n, { x: 0, y: 1 });   // rightwards → down
    close(chord({ x: 0, y: 0 }, { x: 0, y: 10 }).n, { x: -1, y: 0 });  // down → left
  });

  it('reversed, the same length and the opposite normal', () => {
    const a = { x: 3, y: -7 }, b = { x: 40, y: 11 };
    const there = chord(a, b), back = chord(b, a);
    expect(back.len).toBe(there.len);
    close(back.n, { x: -there.n.x, y: -there.n.y });
    expect(Math.hypot(there.u.x, there.u.y)).toBeCloseTo(1, 12);
    expect(there.u.x * there.n.x + there.u.y * there.n.y).toBeCloseTo(0, 12);
  });

  it('coincident points: length 1, no NaN', () => {
    const c = chord({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(c.len).toBe(1);
    [c.u.x, c.u.y, c.n.x, c.n.y].forEach(v => expect(v).toBeCloseTo(0, 12));
  });
});

describe('quadBow — a tie as one quadratic curve', () => {
  const A = { x: 0, y: 0 }, B = { x: 100, y: 0 };

  it('without options: a straight curve from a to b, control point in the middle', () => {
    const q = quadBow(A, B);
    expect(q.s).toEqual({ x: 0, y: 0 });
    expect(q.e).toEqual({ x: 100, y: 0 });
    expect(q.s).not.toBe(A);                // copies: a caller may keep them
    expect(q.e).not.toBe(B);
    expect(q.off).toBe(0);
    expect(q.d).toBe('M0,0Q50,0 100,0');
  });

  it('from / to move the ends along the centre line: past a, short of b', () => {
    const q = quadBow({ x: 10, y: 10 }, { x: 40, y: 50 }, { from: 5, to: 10 });
    expect(q.s).toEqual({ x: 13, y: 14 });
    expect(q.e).toEqual({ x: 34, y: 42 });
  });

  it('bow px puts the control point off the middle of the ends, along the normal', () => {
    const q = quadBow(A, B, { from: 10, to: 20, bow: 12 });
    close(q.c, { x: 45, y: 12 });
    expect(q.off).toBe(12);
    close(quadBow(A, B, { bow: -12 }).c, { x: 50, y: -12 });   // negative: the other side
    close(quadBow(B, A, { bow: 12 }).c, { x: 50, y: -12 });    // reversed: the other side
  });

  it('bow as a function gets the distance between a and b — not the trimmed one — and its result is the bow', () => {
    const bow = vi.fn(len => len / 10);
    const q = quadBow({ x: 0, y: 0 }, { x: 30, y: 40 }, { from: 5, to: 5, bow });
    expect(bow).toHaveBeenCalledWith(50);
    expect(q.off).toBe(5);
    close(q.c, { x: 15 - 0.8 * 5, y: 20 + 0.6 * 5 });
  });

  it('returns chord(a, b) and the path M s Q c e', () => {
    const a = { x: 2, y: 3 }, b = { x: 62, y: 83 };
    const q = quadBow(a, b, { from: 10, to: 20, bow: 8 });
    const { len, u, n } = chord(a, b);
    expect({ len: q.len, u: q.u, n: q.n }).toEqual({ len, u, n });
    expect(q.d).toBe(`M${q.s.x},${q.s.y}Q${q.c.x},${q.c.y} ${q.e.x},${q.e.y}`);
    close(q.s, { x: 8, y: 11 });
    close(q.e, { x: 50, y: 67 });
    close(q.c, { x: 29 - 0.8 * 8, y: 39 + 0.6 * 8 });
  });

  it('coincident ends: no NaN anywhere', () => {
    const q = quadBow({ x: 7, y: 7 }, { x: 7, y: 7 }, { from: 3, to: 3, bow: 10 });
    expect(q.d).not.toMatch(/NaN/);
    close(q.c, { x: 7, y: 7 });
  });

  it('a NaN trim leaves that end NaN (a node radius that is not a number draws no tie), as before', () => {
    const q = quadBow({ x: 0, y: 0 }, { x: 100, y: 0 }, { from: NaN, to: 4 });
    expect(Number.isNaN(q.s.x)).toBe(true);
    expect(q.e).toEqual({ x: 96, y: 0 });
    expect(q.d).toMatch(/NaN/);
  });

  it('an end left in place is the point as given, whatever the other end holds', () => {
    const q = quadBow({ x: 1, y: 2 }, { x: NaN, y: 5 }, { to: 4 });
    expect(q.s).toEqual({ x: 1, y: 2 });
    expect(q.d.startsWith('M1,2Q')).toBe(true);
  });
});

describe('quadPoint — a point along a quadratic curve', () => {
  const curve = { s: { x: 0, y: 0 }, c: { x: 4, y: 8 }, e: { x: 8, y: 0 } };

  it('t = 0 is s, t = 1 is e', () => {
    expect(quadPoint(curve, 0)).toEqual({ x: 0, y: 0 });
    expect(quadPoint(curve, 1)).toEqual({ x: 8, y: 0 });
  });

  it('t = 0.5 is the middle of the bow: (s + 2c + e) / 4 — half the control point\'s offset', () => {
    expect(quadPoint(curve, 0.5)).toEqual({ x: 4, y: 4 });
    const q = quadBow({ x: 0, y: 0 }, { x: 100, y: 0 }, { bow: 20 });
    close(quadPoint(q, 0.5), { x: 50, y: 10 });
  });

  it('any t follows the Bézier weights (1 − t)², 2(1 − t)t, t²', () => {
    expect(quadPoint(curve, 0.25)).toEqual({ x: 2, y: 3 });
    const skew = { s: { x: 1, y: 2 }, c: { x: 9, y: -4 }, e: { x: 5, y: 10 } };
    close(quadPoint(skew, 0.3), { x: 0.49 * 1 + 0.42 * 9 + 0.09 * 5, y: 0.49 * 2 - 0.42 * 4 + 0.09 * 10 });
  });
});

describe('sineBow — a polyline bowed by a sine over its length', () => {
  const line = [[0, 0], [25, 0], [50, 0], [75, 0], [100, 0]];

  it('both ends stay where they are; the middle moves by the whole bow along the normal', () => {
    const out = sineBow(line, 10);
    expect(out[0]).toEqual([0, 0]);
    expect(out[4][0]).toBeCloseTo(100, 12);
    expect(out[4][1]).toBeCloseTo(0, 12);
    expect(out[2][0]).toBeCloseTo(50, 12);
    expect(out[2][1]).toBeCloseTo(10, 12);
    expect(out[1][1]).toBeCloseTo(10 * Math.SQRT1_2, 12);
    expect(out[3][1]).toBeCloseTo(10 * Math.SQRT1_2, 12);
  });

  it('a negative bow, or the polyline reversed, bows to the other side', () => {
    expect(sineBow(line, -10)[2][1]).toBeCloseTo(-10, 12);
    expect(sineBow(line.slice().reverse(), 10)[2][1]).toBeCloseTo(-10, 12);
  });

  it('the sine runs over the length, not the point count', () => {
    const out = sineBow([[0, 0], [10, 0], [100, 0]], 20);
    expect(out[1][1]).toBeCloseTo(20 * Math.sin(Math.PI * 0.1), 12);
  });

  it('every point moves along the normal of first → last, and a bow function gets that chord\'s length', () => {
    const bent = [[0, 0], [0, 30], [40, 30]];
    const bow = vi.fn(() => 10);
    const out = sineBow(bent, bow);
    expect(bow).toHaveBeenCalledWith(50);                  // the chord, not the 70 px polyline
    const k = 10 * Math.sin(Math.PI * 30 / 70);
    expect(out[1][0]).toBeCloseTo(0 - 0.6 * k, 12);       // n of (0,0) → (40,30) is (−0.6, 0.8)
    expect(out[1][1]).toBeCloseTo(30 + 0.8 * k, 12);
  });

  it('leaves its input alone and survives a polyline of coincident points', () => {
    const pts = [[1, 1], [2, 2], [3, 3]];
    const copy = JSON.parse(JSON.stringify(pts));
    sineBow(pts, 5);
    expect(pts).toEqual(copy);
    const still = sineBow([[4, 4], [4, 4]], 5);
    still.flat().forEach(v => expect(v).toBeCloseTo(4, 12));
  });
});

// ─── The callers: each keeps its own rule on the shared geometry ─────────────

const translate = el => {
  const m = /translate\(([^,]+),([^)]+)\)/.exec(el.getAttribute('transform'));
  return { x: +m[1], y: +m[2] };
};

describe('Graph ego view: a base bow of 8% (at most 26 px) plus 16 px per slot, from the source centre to 6 px short of the target rim', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  const draw = async links => {
    const g = track(new Graph('#chart', { duration: 0 })).setData({
      nodes: [{ id: 'trump', label: 'Trump' }, { id: 'kushner', label: 'Kushner' }],
      links: links.map(([source, target, type]) => ({ source, target, type })),
    });
    await g.whenReady();
    const at = id => translate([...document.querySelectorAll('.rc-graph-node')].find(n => n.__data__.id === id));
    const dOf = (source, target, slot) => quadBow(at(source), at(target), {
      to: 22 + 6,
      bow: len => (len >= 40 ? Math.min(26, len * 0.08) : 0) + slot * 16,
    }).d;
    const ties = [...document.querySelectorAll('.rc-graph-link')]
      .map(p => ({ ...p.__data__, d: p.getAttribute('d') }));
    return { ties, dOf };
  };

  it('three typed ties of one pair: slots −1, 0 and 1', async () => {
    const { ties, dOf } = await draw([['trump', 'kushner', 'family'], ['trump', 'kushner', 'investment'], ['trump', 'kushner', 'employment']]);
    expect(ties).toHaveLength(3);
    expect(new Set(ties.map(t => t.d))).toEqual(new Set([-1, 0, 1].map(k => dOf('trump', 'kushner', k))));
  });

  it('a pair listed both ways: both ties take the same slot on their own normals — opposite sides on screen', async () => {
    const { ties, dOf } = await draw([['trump', 'kushner', 'family'], ['kushner', 'trump', 'investment']]);
    expect(ties).toHaveLength(2);
    const fits = slot => ties.every(t => t.d === dOf(t.source, t.target, slot));
    expect(fits(0.5) || fits(-0.5)).toBe(true);
  });
});

describe('Graph path view: no base bow, so a lone tie is a straight line', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  it('from the source centre to 6 px short of the target rim', async () => {
    const g = track(new Graph('#chart', { duration: 0 })).setData({
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    });
    await g.connect('a', 'c').whenReady();
    const at = id => translate([...document.querySelectorAll('.rc-graph-node')].find(n => n.__data__.id === id));
    const ties = [...document.querySelectorAll('.rc-graph-link')];
    expect(ties).toHaveLength(2);
    ties.forEach(p => {
      const { source, target } = p.__data__;
      const s = at(source), { e } = quadBow(s, at(target), { to: 22 + 6 });
      expect(p.getAttribute('d')).toBe(`M${s.x},${s.y}L${e.x},${e.y}`);
    });
  });
});

describe('Graph flow view: bend 0.35 alone, 0 ± 2 per slot in a fan; 1 bend = 18% (at most 60 px); rims R + 2 and R + 4', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  it('a pair listed both ways fans out; a lone tie takes the default bend', async () => {
    const g = track(new Graph('#chart', {
      view: 'flow', duration: 0, laneBy: 'net', lanes: [{ id: 'l' }, { id: 'r' }],
    })).setData({
      nodes: [{ id: 'a', net: 'l' }, { id: 'b', net: 'r' }, { id: 'c', net: 'r', row: 1 }],
      links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }, { from: 'a', to: 'c' }],
    });
    await g.whenReady();
    const at = id => translate([...document.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === id));
    // 'a' < 'b': a → b takes slot −0.5, b → a runs against the pair and
    // takes −0.5 on its own normal — both bend −1, to opposite sides
    const bends = { 'a→b': -1, 'b→a': -1, 'a→c': 0.35 };
    const paths = [...document.querySelectorAll('.rc-flow-link')];
    expect(paths).toHaveLength(3);
    paths.forEach(p => {
      const { source, target } = p.__data__;
      const bend = bends[`${source}→${target}`];
      const q = quadBow(at(source), at(target), { from: 18 + 2, to: 18 + 4, bow: len => bend * Math.min(60, len * 0.18) });
      expect(p.getAttribute('d')).toBe(q.d);
    });
  });
});

describe('MapFlow: bend × 0.6 of the chord, at most bend × 90 px; parallel flows of one direction 0.16 bends apart', () => {
  const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
  const geoData = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', id: '1', properties: { name: 'Sea' }, geometry: { type: 'Polygon', coordinates: square(0, -5, 40) } }],
  };

  it('along the equator on Mercator, where the great circle is straight: each flow\'s sine amplitude', () => {
    const c = track(new MapFlow(mount(null), { geoData, linkLegend: false, projection: 'mercator', fitTo: 'links' })).setData({
      nodes: [{ id: 'A', coords: [5, 0] }, { id: 'B', coords: [35, 0] }],
      links: [{ from: 'A', to: 'B', id: 'one' }, { from: 'B', to: 'A', id: 'back' }, { from: 'A', to: 'B', id: 'two' }],
    });
    const dot = id => {
      const el = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === id);
      return [+el.getAttribute('cx'), +el.getAttribute('cy')];
    };
    const [a, b] = [dot('A'), dot('B')];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // the bow at the points well inside the arc: the sideways shift over
    // the sine of the share of the way (the path is written to 3 decimals)
    const amp = id => {
      const el = [...c.container.querySelectorAll('.rc-mapflow-link')].find(p => p.__data__.id === id);
      const [from, to] = el.__data__.source === 'A' ? [a, b] : [b, a];
      const pts = el.getAttribute('d').split('M').filter(Boolean)[0].split('L').map(s => s.split(',').map(Number));
      const inner = pts.map(([x, y]) => [(x - from[0]) / (to[0] - from[0]), y - from[1]]).filter(([f]) => f > 0.3 && f < 0.7);
      expect(inner.length).toBeGreaterThan(3);
      // the normal of A → B points down the screen (y grows), of B → A up
      const sign = to[0] > from[0] ? 1 : -1;
      return inner.map(([f, dy]) => sign * dy / Math.sin(Math.PI * f));
    };
    const expected = bend => bend * Math.min(90, len * 0.6);
    // directed: A → B is a fan of two (0.18 ∓ 0.08), B → A a fan of one (0.18)
    amp('one').forEach(v => expect(v).toBeCloseTo(expected(0.10), 2));
    amp('two').forEach(v => expect(v).toBeCloseTo(expected(0.26), 2));
    amp('back').forEach(v => expect(v).toBeCloseTo(expected(0.18), 2));
  });
});

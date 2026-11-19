import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { layoutFlow, laneOfNode } from '../assets/charts/src/graph/views/flow.js';
import { autoFlowHints, countCrossings } from '../assets/charts/src/graph/layouts/flowAuto.js';
import { resolveFolds, foldGraph, foldSub } from '../assets/charts/src/graph/views/flowFold.js';
import { normalizeLinks } from '../assets/charts/src/core/links.js';

// The flow view's pure layer, without a DOM: lanes and rows (layoutFlow), the
// automatic placement (autoFlowHints, layout: auto) and the fold / aggregation
// math (Flows II, 0.9.8_6; the decisions: assets/charts/docs/DECISIONS.md §13, Flow view). The
// drawing itself is in graph-flow.test.js.
//
// Moved from graph-fixes-7a.test.js (RC-026):
//   'C-38: a short flow drawing gives its padding to the rows' → same describe

const lanesOf = ids => new Map(ids.map((id, i) => [id, i]));
const hintsFor = (nodes, links, laneIds = ['a', 'b', 'c']) => {
  const idx = lanesOf(laneIds);
  return autoFlowHints({
    nodes, links: normalizeLinks(links),
    laneOf: n => n.lane, laneIndex: id => idx.get(id) ?? 0,
  });
};

// The docs demo, loaded as the page runs it: the trace with hand-placed
// hints (#graph-flow-demo) and the same trace stripped of them (#graph-flow-auto).
function loadDemo() {
  const calls = [];
  ['graph-flow-demo', 'graph-flow-auto', 'graph-flow-demo-panel'].forEach(id => {
    if (!document.getElementById(id)) {
      const d = document.createElement('div');
      d.id = id;
      document.body.appendChild(d);
    }
  });
  const prev = window.RareCharts;
  window.RareCharts = {
    Graph: class {
      constructor(sel, o) { this.sel = sel; this.o = o; }
      setData(d) { calls.push({ sel: this.sel, o: this.o, d }); return this; }
      isCollapsed() { return false; }
    },
  };
  try {
    const src = fs.readFileSync(path.resolve('assets/charts/examples/graph/graph-flow-demo.js'), 'utf8');
    new Function(src)();
  } finally {
    window.RareCharts = prev;
  }
  return {
    hand: calls.find(c => c.sel === '#graph-flow-demo'),
    auto: calls.find(c => c.sel === '#graph-flow-auto'),
  };
}

// ─── Lanes and rows ───────────────────────────────────────────────────────────

describe('layoutFlow', () => {
  const lanes = [{ id: 'l1', label: 'One' }, { id: 'l2', label: 'Two', weight: 3 }];

  it('splits the width by lane weight, in declared order', () => {
    const { lanes: out } = layoutFlow({ nodes: [], lanes }, { width: 800, height: 400 });
    expect(out.map(l => [l.x0, l.x1])).toEqual([[0, 200], [200, 800]]);
  });

  it('places rows around the main line and honours col and x/y hints', () => {
    const { positions: p, top, height } = layoutFlow({
      lanes,
      nodes: [
        { id: 'main', lane: 'l1', row: 0 },
        { id: 'above', lane: 'l1', row: -1 },
        { id: 'c1', lane: 'l2', col: 1 },
        { id: 'c0', lane: 'l2', col: 0 },
        { id: 'exact', lane: 'l2', x: 0, y: 1 },
      ],
    }, { width: 800, height: 400 });
    expect(p.get('above').y).toBeLessThan(p.get('main').y);
    expect(p.get('main').x).toBe(100);                 // centre of lane 1
    expect(p.get('c1').x).toBeGreaterThan(p.get('c0').x);
    expect(p.get('exact').x).toBe(200);                 // left edge of lane 2
    expect(p.get('exact').y).toBeCloseTo(height - 24, 6);   // bottom of the drawing area
    expect(top).toBe(58);
  });

  it('fills free rows 0, 1, −1, 2… around explicit ones; never stacks two in one spot', () => {
    const { positions: p } = layoutFlow({
      lanes,
      nodes: [
        { id: 'a', lane: 'l1', row: 0 },
        { id: 'b', lane: 'l1' },
        { id: 'c', lane: 'l1' },
        { id: 'd', lane: 'l1', row: 1 },   // collides with b's auto row
      ],
    }, { width: 800, height: 600, layout: 'hints' });
    // explicit rows (a: 0, d: 1) are reserved first; b and c take the next free ones
    expect(p.get('b').row).toBe(-1);
    expect(p.get('c').row).toBe(2);
    const ys = ['a', 'b', 'c', 'd'].map(id => p.get(id).y);
    expect(new Set(ys.map(y => Math.round(y))).size).toBe(4);
  });

  it('keeps the outermost rows and their captions inside the drawing', () => {
    const { positions: p } = layoutFlow({
      lanes,
      nodes: [{ id: 'top', lane: 'l1', row: -2 }, { id: 'main', lane: 'l1', row: 0 }, { id: 'low', lane: 'l1', row: 3 }],
    }, { width: 800, height: 600, nodeRadius: 18, captionRoom: 36 });
    expect(p.get('top').y - 18).toBeGreaterThanOrEqual(58);            // below the lane header
    expect(p.get('low').y + 18 + 36).toBeLessThanOrEqual(600 - 24 + 1e-6);   // node edge + captions fit
    expect(p.get('top').y).toBeLessThan(p.get('main').y);
  });

  it('a col that is not a whole number ≥ 0 counts as column 0', () => {
    const { positions: p, colsPerLane } = layoutFlow({
      lanes,
      nodes: [{ id: 'neg', lane: 'l1', col: -1 }, { id: 'frac', lane: 'l1', col: 1.5, row: 1 }, { id: 'str', lane: 'l1', col: '2', row: 2 }],
    }, { width: 800, height: 400, layout: 'hints' });
    expect(['neg', 'frac', 'str'].map(id => p.get(id).col)).toEqual([0, 0, 0]);
    expect(colsPerLane.get('l1')).toBe(1);
    expect(['neg', 'frac', 'str'].map(id => p.get(id).x)).toEqual([100, 100, 100]);
  });

  it('appends lanes that only the data mentions; laneBy can be a field or a function', () => {
    const r1 = layoutFlow({ lanes, nodes: [{ id: 'x', net: 'l3' }] }, { laneBy: 'net' });
    expect(r1.lanes.map(l => l.id)).toEqual(['l1', 'l2', 'l3']);
    const r2 = layoutFlow({ lanes, nodes: [{ id: 'y', meta: { lane: 'l2' } }] }, { laneBy: n => n.meta.lane });
    expect(r2.positions.get('y').lane).toBe('l2');
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

// ─── Automatic layout ──────────────────────────────────────────────────────────

describe('autoFlowHints', () => {
  it('ranks a chain left to right inside one lane and puts it on the main line', () => {
    const { hints, main } = hintsFor(
      [{ id: 'x', lane: 'a' }, { id: 'y', lane: 'a' }, { id: 'z', lane: 'a' }],
      [{ from: 'x', to: 'y' }, { from: 'y', to: 'z' }],
    );
    expect(['x', 'y', 'z'].map(id => hints.get(id).col)).toEqual([0, 1, 2]);
    expect(['x', 'y', 'z'].map(id => hints.get(id).row)).toEqual([0, 0, 0]);
    expect([...main]).toEqual(['z', 'y', 'x']);
  });

  it('puts a satellite (a DEX swapped with and back, a fee) in its counterpart\'s column, off the main line', () => {
    const { hints } = hintsFor(
      [{ id: 'w', lane: 'a' }, { id: 'dex', lane: 'a' }, { id: 'fee', lane: 'a' }, { id: 'next', lane: 'b' }],
      [{ from: 'w', to: 'dex' }, { from: 'dex', to: 'w' }, { from: 'w', to: 'fee' }, { from: 'w', to: 'next' }],
    );
    expect(hints.get('dex').col).toBe(hints.get('w').col);
    expect(hints.get('fee').col).toBe(hints.get('w').col);
    expect(hints.get('w').row).toBe(0);
    expect(new Set([hints.get('dex').row, hints.get('fee').row])).toEqual(new Set([-1, 1]));
  });

  it('breaks a cycle at the later tie when ties carry time (a refund turns, not the payment)', () => {
    const { hints } = hintsFor(
      [{ id: 'buyer', lane: 'a' }, { id: 'sale', lane: 'a' }, { id: 'owner', lane: 'a' }],
      [
        { from: 'owner', to: 'buyer', start: '2024-02-01' },   // refund — listed first on purpose
        { from: 'buyer', to: 'sale', start: '2024-01-30' },
        { from: 'sale', to: 'owner', start: '2024-01-31' },
      ],
    );
    expect(['buyer', 'sale', 'owner'].map(id => hints.get(id).col)).toEqual([0, 1, 2]);
  });

  it('breaks a timeless cycle by turning as few ties as possible', () => {
    const { hints } = hintsFor(
      [{ id: 'p', lane: 'a' }, { id: 'q', lane: 'a' }, { id: 'r', lane: 'a' }, { id: 's', lane: 'a' }],
      [{ from: 'p', to: 'q' }, { from: 'q', to: 'r' }, { from: 'r', to: 's' }, { from: 's', to: 'q' }, { from: 'p', to: 'r' }],
    );
    const cols = ['p', 'q', 'r', 's'].map(id => hints.get(id).col);
    // one tie turned: p < q < r < s, s → q is the return
    expect(cols).toEqual([0, 1, 2, 3]);
  });

  it('keeps the main route on row 0 across lanes; flagged nodes override the automatic route', () => {
    const nodes = [
      { id: 'a1', lane: 'a' }, { id: 'b1', lane: 'b' }, { id: 'b2', lane: 'b' }, { id: 'c1', lane: 'c' },
    ];
    const links = [
      { from: 'a1', to: 'b1', value: 1 }, { from: 'b1', to: 'c1', value: 1 },
      { from: 'a1', to: 'b2', value: 1000 },
    ];
    const { hints } = hintsFor(nodes, links);
    expect(hints.get('b1').row).toBe(0);        // longer route wins over the heavier single tie
    expect(hints.get('b2').row).not.toBe(0);
    const flagged = hintsFor(nodes.map(n => (n.id === 'b2' ? { ...n, main: true } : n)), links).hints;
    expect(flagged.get('b2').row).toBe(0);
    expect(flagged.get('b1').row).not.toBe(0);
  });

  it('a pinned col holds: what follows a pinned node lands to its right (R-08)', () => {
    const { hints } = hintsFor(
      [{ id: 'P', lane: 'a', col: 3 }, { id: 'Q', lane: 'a' }, { id: 'R', lane: 'a' }],
      [{ from: 'P', to: 'Q' }, { from: 'Q', to: 'R' }],
    );
    expect(hints.get('Q').col).toBe(4);
    expect(hints.get('R').col).toBe(5);
  });

  it('a pinned col keeps its place when ties lead into it (R-08)', () => {
    const { hints } = hintsFor(
      [{ id: 'A', lane: 'a' }, { id: 'B', lane: 'a' }, { id: 'P', lane: 'a', col: 1 }, { id: 'Q', lane: 'a' }],
      [{ from: 'A', to: 'B' }, { from: 'B', to: 'P' }, { from: 'P', to: 'Q' }],
    );
    expect(hints.get('Q').col).toBe(2);
  });

  it('leaves hinted nodes alone and works around their rows', () => {
    const { hints } = hintsFor(
      [{ id: 'm', lane: 'a' }, { id: 'pin', lane: 'a', row: -1 }, { id: 'free', lane: 'a' }],
      [{ from: 'm', to: 'pin' }, { from: 'm', to: 'free' }],
    );
    expect(hints.has('pin')).toBe(false);
    expect(hints.get('free').row).not.toBe(-1);
  });

  it('is deterministic', () => {
    const { auto } = loadDemo();
    const links = normalizeLinks(auto.d.links);
    const run = () => [...layoutFlow({ nodes: auto.d.nodes, links, lanes: auto.o.lanes },
      { width: 1100, height: 700, laneBy: 'net' }).positions.entries()];
    expect(run()).toEqual(run());
  });
});

describe('layoutFlow — layout: auto', () => {
  it('the demo trace without a single coordinate: main route in the middle, no overlaps, no more crossings than by hand', () => {
    const { hand, auto } = loadDemo();
    expect(auto.d.nodes.some(n => 'row' in n || 'col' in n)).toBe(false);
    const handLinks = normalizeLinks(hand.d.links);
    const autoLinks = normalizeLinks(auto.d.links);
    const byHand = layoutFlow({ nodes: hand.d.nodes, links: handLinks, lanes: hand.o.lanes },
      { width: 1100, height: 700, laneBy: 'net', layout: 'hints' });
    const byAuto = layoutFlow({ nodes: auto.d.nodes, links: autoLinks, lanes: auto.o.lanes },
      { width: 1100, height: 700, laneBy: 'net' });

    // main route: the owner's wallets and the bridge share one line
    const mainIds = ['bostrom', 'hub', 'osmo', 'kujira', 'bridge', 'eth', 'crowdfunding'];
    expect(new Set(mainIds.map(id => byAuto.positions.get(id).row))).toEqual(new Set([0]));
    // no two nodes on one spot
    const spots = [...byAuto.positions.values()].map(p => `${Math.round(p.x)}|${Math.round(p.y)}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(countCrossings(autoLinks, byAuto.positions))
      .toBeLessThanOrEqual(countCrossings(handLinks, byHand.positions));
  });

  it('gives an undeclared lane as much width as it has columns', () => {
    const { lanes } = layoutFlow({
      lanes: [{ id: 'a' }, { id: 'b' }],
      nodes: [{ id: 'x', lane: 'a' }, { id: 'y', lane: 'a' }, { id: 'z', lane: 'b' }],
      links: normalizeLinks([{ from: 'x', to: 'y' }, { from: 'y', to: 'z' }]),
    }, { width: 900 });
    expect(lanes.map(l => l.x1 - l.x0)).toEqual([600, 300]);
  });

  it('a fully hinted trace keeps equal lane widths under layout: auto, as with hints (R-09)', () => {
    const input = {
      lanes: [{ id: 'a' }, { id: 'b' }],
      nodes: [{ id: 'x', lane: 'a', row: 0 }, { id: 'y', lane: 'a', col: 1 }, { id: 'z', lane: 'b', row: 0 }],
      links: normalizeLinks([{ from: 'x', to: 'y' }, { from: 'y', to: 'z' }]),
    };
    const widths = layout => layoutFlow(input, { width: 900, layout }).lanes.map(l => l.x1 - l.x0);
    expect(widths('auto')).toEqual(widths('hints'));
  });

  it('layout: hints keeps the stage-1 placement (input order, next free row)', () => {
    const { positions } = layoutFlow({
      lanes: [{ id: 'a' }],
      nodes: [{ id: 'x', lane: 'a' }, { id: 'y', lane: 'a' }],
      links: normalizeLinks([{ from: 'x', to: 'y' }]),
    }, { layout: 'hints' });
    expect([positions.get('x').col, positions.get('y').col]).toEqual([0, 0]);
    expect([positions.get('x').row, positions.get('y').row]).toEqual([0, 1]);
  });
});

// ─── Lane resolution (D-05) ────────────────────────────────────────────────────

describe('laneOfNode', () => {
  it('reads laneBy: a field name (default lane) or a function of the node; the value comes back as given', () => {
    expect(laneOfNode({ lane: 'a' })).toBe('a');
    expect(laneOfNode({ lane: 2 })).toBe(2);
    expect(laneOfNode({ net: 'eth', lane: 'a' }, 'net')).toBe('eth');
    expect(laneOfNode({ meta: { lane: 'l2' } }, n => n.meta.lane)).toBe('l2');
    expect(laneOfNode({ id: 'x' })).toBeUndefined();
    expect(laneOfNode({ lane: null })).toBeNull();
  });

  it("a folded meta-node's _lane wins over laneBy, even when empty; only an undefined _lane falls through", () => {
    const by = vi.fn(() => 'fn');
    expect(laneOfNode({ _lane: 'c', lane: 'a' })).toBe('c');
    expect(laneOfNode({ _lane: 'c', net: 'a' }, by)).toBe('c');
    expect(laneOfNode({ _lane: null, lane: 'a' })).toBeNull();
    expect(laneOfNode({ _lane: '', lane: 'a' })).toBe('');
    expect(laneOfNode({ _lane: 0, lane: 'a' })).toBe(0);
    expect(by).not.toHaveBeenCalled();
    expect(laneOfNode({ _lane: undefined, lane: 'a' })).toBe('a');
    const n = { _lane: undefined, net: 'b' };
    expect(laneOfNode(n, by)).toBe('fn');
    expect(by).toHaveBeenCalledTimes(1);
    expect(by).toHaveBeenCalledWith(n);
  });
});

describe('layoutFlow — lanes and columns from one pass (D-05)', () => {
  // A cycle in one lane, a declared lane no node uses, a numeric lane id, a
  // lane only the data names, a meta-node whose _lane overrides its field,
  // nodes without a lane (one null, one missing) and a col hint. Pinned
  // before lane resolution and column counting went down to one pass.
  const lanes = [{ id: 'a', label: 'A' }, { id: 2, weight: 2 }, { id: 'empty' }];
  const nodes = [
    { id: 'x', lane: 'a' },
    { id: 'y', lane: 'a' },
    { id: 'z', lane: 'a' },
    { id: 'w', lane: 'a', row: 1 },
    { id: 'n2', lane: 2, col: 2 },
    { id: 'm', lane: 2 },
    { id: 'meta', _lane: 'c', lane: 'a' },
    { id: 'nul', lane: null },
    { id: 'und' },
    { id: 'c2', lane: 'c' },
  ];
  const links = normalizeLinks([
    { from: 'x', to: 'y' }, { from: 'y', to: 'z' }, { from: 'z', to: 'x' },
    { from: 'z', to: 'm' }, { from: 'm', to: 'n2' }, { from: 'n2', to: 'meta' }, { from: 'meta', to: 'c2' },
    { from: 'c2', to: 'nul' }, { from: 'c2', to: 'w' },
  ]);
  const r3 = v => Math.round(v * 1000) / 1000;
  const pin = res => ({
    lanes: res.lanes.map(l => [l.id, l.label, l.weight, r3(l.x0), r3(l.x1)]),
    cols: [...res.colsPerLane],
    at: [...res.positions].map(([id, p]) => [id, p.lane, p.col, p.row, r3(p.x), r3(p.y)]),
    top: res.top,
  });
  const run = (extra = {}) => layoutFlow({ nodes, links, lanes }, { width: 1000, height: 500, ...extra });

  it('layout: auto — lanes sized by their columns, the cycle ranked, _lane and the empty lane honoured', () => {
    expect(pin(run())).toEqual({
      lanes: [['a', 'A', 3, 0, 333.333], ['2', '2', 2, 333.333, 555.556], ['empty', 'empty', 1, 555.556, 666.667],
        ['c', 'c', 2, 666.667, 888.889], ['', '', 1, 888.889, 1000]],
      cols: [['a', 3], ['2', 3], ['c', 2], ['', 1]],
      at: [
        ['x', 'a', 0, 0, 55.556, 189], ['y', 'a', 1, 0, 166.667, 189], ['z', 'a', 2, 0, 277.778, 189],
        ['w', 'a', 0, 1, 55.556, 309], ['n2', '2', 2, 0, 518.519, 189], ['m', '2', 0, 0, 370.37, 189],
        ['meta', 'c', 0, 0, 722.222, 189], ['nul', '', 0, 0, 944.444, 189], ['und', '', 0, 1, 944.444, 309],
        ['c2', 'c', 1, 0, 833.333, 189],
      ],
      top: 58,
    });
  });

  it('layout: hints — equal widths for undeclared lanes, free rows per lane and column', () => {
    expect(pin(run({ layout: 'hints' }))).toEqual({
      lanes: [['a', 'A', 1, 0, 166.667], ['2', '2', 2, 166.667, 500], ['empty', 'empty', 1, 500, 666.667],
        ['c', 'c', 1, 666.667, 833.333], ['', '', 1, 833.333, 1000]],
      cols: [['a', 1], ['2', 3], ['c', 1], ['', 1]],
      at: [
        ['x', 'a', 0, 0, 83.333, 191.333], ['y', 'a', 0, -1, 83.333, 76], ['z', 'a', 0, 2, 83.333, 422],
        ['w', 'a', 0, 1, 83.333, 306.667], ['n2', '2', 2, 0, 444.444, 191.333], ['m', '2', 0, 0, 222.222, 191.333],
        ['meta', 'c', 0, 0, 750, 191.333], ['nul', '', 0, 0, 916.667, 191.333], ['und', '', 0, 1, 916.667, 306.667],
        ['c2', 'c', 0, 1, 750, 306.667],
      ],
      top: 58,
    });
  });

  it('asks laneBy once per node, in input order, and never for a node that carries _lane', () => {
    ['auto', 'hints'].forEach(layout => {
      const asked = [];
      const res = run({ layout, laneBy: n => { asked.push(n.id); return n.lane; } });
      expect(asked, layout).toEqual(['x', 'y', 'z', 'w', 'n2', 'm', 'nul', 'und', 'c2']);
      expect(pin(res), layout).toEqual(pin(run({ layout })));
    });
  });
});

// ─── Folds and aggregation (pure) ──────────────────────────────────────────────

describe('folds', () => {
  const nodes = [
    { id: 'in', lane: 'a' }, { id: 'hub', lane: 'b', row: 0, label: 'Sale' },
    { id: 'p1', lane: 'b', row: 1 }, { id: 'p2', lane: 'b', row: 2 }, { id: 'out', lane: 'c' },
  ];
  const links = normalizeLinks([
    { from: 'in', to: 'hub', type: 'ETH', value: 1, start: '2024-01' },
    { from: 'p1', to: 'hub', type: 'ETH', value: 10, start: '2024-02' },
    { from: 'hub', to: 'out', type: 'ETH', value: 5, start: '2024-03' },
    { from: 'p2', to: 'out', type: 'ETH', value: 7, start: '2024-04', end: '2024-06' },
    { from: 'p2', to: 'out', type: 'TOKEN', value: 2, start: '2024-05' },
  ]);
  const folds = resolveFolds(nodes, [{ id: 'sale', anchor: 'hub', members: ['hub', 'p1', 'p2'], sub: '{n} addresses' }]);

  it('resolves members once; the anchor defaults to the first member', () => {
    const f = resolveFolds(nodes, [
      { id: 'one', members: n => n.lane === 'b' },
      { id: 'two', members: ['p1', 'out'] },     // p1 already claimed
      { id: 'none', members: [] },
    ]);
    expect(f.map(x => [x.id, x.members, x.anchor])).toEqual([
      ['one', ['hub', 'p1', 'p2'], 'hub'],
      ['two', ['out'], 'out'],
    ]);
    expect(foldSub({ sub: n => `${n}!` }, 3)).toBe('3!');
    expect(foldSub({}, 1)).toBe('1 node');
  });

  it('collapses members into a meta-node at the anchor, drops inner ties, sums the rest per pair and category', () => {
    const out = foldGraph({ nodes, links }, folds, new Set(['sale']), { laneOf: n => n.lane });
    expect(out.nodes.map(n => n.id)).toEqual(['in', 'fold:sale', 'out']);
    const meta = out.nodes[1];
    expect(meta).toMatchObject({ label: 'Sale', sub: '3 addresses', fold: 'sale', row: 0, _lane: 'b' });
    expect(meta.addr).toBeUndefined();
    const eth = out.links.find(l => l.source === 'fold:sale' && l.type === 'ETH');
    expect(eth.value).toBe(12);                              // 5 + 7
    expect(eth.links).toHaveLength(2);
    expect(eth.start).toBe('2024-03');
    expect(eth.end).toBe(null);                              // one of them is open-ended
    expect(out.links.find(l => l.type === 'TOKEN').value).toBe(2);
    expect(out.links.some(l => l.source === 'p1' || l.target === 'p1')).toBe(false);
    expect(out.links.find(l => l.source === 'in').target).toBe('fold:sale');
  });

  it('dim mode: an aggregate counts only the ties in the window (R-06)', () => {
    const ties = normalizeLinks([
      { from: 'in', to: 'hub', type: 'ETH', value: 1 },
      { from: 'in', to: 'hub', type: 'ETH', value: 100 },
    ]).map((l, i) => (i === 1 ? { ...l, _dim: true } : l));
    const [agg] = foldGraph({ nodes, links: ties }, [], new Set(), { aggregate: true }).links;
    expect(agg.value).toBe(1);
    expect(agg._dim).toBeUndefined();
    const allOut = ties.map(l => ({ ...l, _dim: true }));
    expect(foldGraph({ nodes, links: allOut }, [], new Set(), { aggregate: true }).links[0]._dim).toBe(true);
  });

  it('an input tie with its own links and key fields is not taken for a group (D-06)', () => {
    const [own] = normalizeLinks([{ from: 'in', to: 'hub', type: 'ETH', value: 3 }]);
    const odd = { ...own, links: ['x'], key: 'mine' };
    const out = foldGraph({ nodes, links: [odd] }, [], new Set()).links;
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(odd);                                // itself, not an aggregate
    expect(out[0].aggregate).toBeUndefined();
  });

  it('a bucket key cannot confuse two pairs whose ids contain separators (R-20)', () => {
    const odd = [{ id: 'a' }, { id: 'b→c' }, { id: 'a→b' }, { id: 'c' }];
    const ties = normalizeLinks([{ from: 'a', to: 'b→c', type: 'x' }, { from: 'a→b', to: 'c', type: 'x' }]);
    expect(foldGraph({ nodes: odd, links: ties }, [], new Set(), { aggregate: true }).links).toHaveLength(2);
  });

  it('aggregateLinks merges parallel ties that no fold touches', () => {
    const plain = foldGraph({ nodes, links }, folds, new Set(), { aggregate: true });
    const p2out = plain.links.filter(l => l.source === 'p2' && l.target === 'out');
    expect(p2out).toHaveLength(2);                           // different categories stay apart
    const twice = normalizeLinks([...links.slice(0, 1), { from: 'in', to: 'hub', type: 'ETH', value: 4 }]);
    const merged = foldGraph({ nodes, links: twice }, [], new Set(), { aggregate: true }).links;
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ value: 5, label: '2 ties', aggregate: true });
  });
});

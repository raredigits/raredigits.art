// RareCharts — graph/layouts/flowAuto.js
// Automatic in-lane layout for the flow view (stage 2, 0.9.8_6): turns a
// trace without coordinates into `col` / `row` hints that layoutFlow() then
// places exactly like hand-written ones. Pure, no DOM, deterministic — the
// same payload always gives the same picture.
//
//   1. Columns. Inside each lane, ties between the lane's own nodes rank them
//      left to right (longest path). Cycles — a deposit and a withdrawal, a
//      refund — are broken first. Ties with a time (`start`) go in time order
//      and a tie that would close a loop turns: the refund, the later payout
//      back. Without time, as few ties as possible turn (Eades greedy
//      heuristic; on an even count the lighter one). Lane order is fixed:
//      a tie into an earlier lane is a return and does not move anything.
//      A satellite takes its counterpart's column instead, above or below
//      it: a node whose only counterpart sits in the same lane and which is a
//      branch, not the line going on — a DEX swapped with and back, a fee
//      paid by a node that also sends elsewhere, an income source of a node
//      that also receives elsewhere. The two ends of a plain chain are not
//      satellites.
//   2. Main route. Nodes flagged `main: true` (or the ends of ties flagged
//      `main: true`); otherwise the longest left-to-right path, by number of
//      steps, the heavier by `value` on a tie — the trace itself rather than
//      its single biggest transfer. It takes row 0.
//   3. Rows. Everything else goes above or below, ordered by the barycentre
//      of its neighbours in alternating sweeps, so ties cross as little as
//      the order allows. Row 0 is kept for the main route.
//
// A node that carries any position hint (`row`, `col`, `x`, `y`) is pinned:
// it keeps its hints (col 0 when only a row is given) and the automaton
// works around it.

import { parseTime } from '../../core/links.js';

const isHinted = n => ['row', 'col', 'x', 'y'].some(k => Number.isFinite(n[k]));
const num = v => (v == null || v === '' || !Number.isFinite(+v) ? null : Math.max(0, +v));

export function autoFlowHints({ nodes = [], links = [], laneIndex, laneOf }) {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const lane = new Map(nodes.map(n => [n.id, laneIndex(laneOf(n))]));
  const pinned = new Set(nodes.filter(isHinted).map(n => n.id));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = links.filter(l =>
    index.has(l.source) && index.has(l.target) && l.source !== l.target);

  // ── 1. Columns ──
  // Satellites first: one distinct counterpart, in the same lane.
  const partners = new Map(nodes.map(n => [n.id, new Set()]));
  edges.forEach(e => { partners.get(e.source).add(e.target); partners.get(e.target).add(e.source); });
  const satelliteOf = new Map();
  nodes.forEach(n => {
    if (pinned.has(n.id)) return;
    const p = partners.get(n.id);
    if (p.size !== 1) return;
    const [other] = p;
    if (lane.get(other) !== lane.get(n.id)) return;
    const mine = edges.filter(e => e.source === n.id || e.target === n.id);
    const sends = mine.some(e => e.source === n.id), gets = mine.some(e => e.target === n.id);
    if (!(sends && gets)) {
      // a one-way leaf: a branch only if its counterpart has another tie in
      // the same direction elsewhere
      const rest = edges.filter(e => (e.source === other || e.target === other) && e.source !== n.id && e.target !== n.id);
      const branch = gets ? rest.some(e => e.source === other) : rest.some(e => e.target === other);
      if (!branch) return;
    }
    // two nodes tied only to each other: the earlier one anchors the pair
    if (satelliteOf.get(other) === n.id || (partners.get(other).size === 1 && index.get(other) > index.get(n.id))) return;
    satelliteOf.set(n.id, other);
  });
  const col = new Map();
  const byLane = new Map();
  nodes.forEach(n => {
    const k = lane.get(n.id);
    if (!byLane.has(k)) byLane.set(k, []);
    byLane.get(k).push(n.id);
  });
  byLane.forEach((all, k) => {
    const ids = all.filter(id => !satelliteOf.has(id));
    const inner = edges.filter(e => lane.get(e.source) === k && lane.get(e.target) === k
      && !satelliteOf.has(e.source) && !satelliteOf.has(e.target));
    const forward = inner.some(e => parseTime(e.start) != null)
      ? temporalForward(ids, inner)
      : eadesForward(ids, inner, index);
    // longest path over the forward ties, in a topological order. A pinned
    // node starts from its own col and keeps it, so what follows it lands to
    // its right ("works around pinned nodes", not over them).
    const pinnedCol = id => {
      const n = byId.get(id);
      return Number.isInteger(n.col) && n.col >= 0 ? n.col : 0;
    };
    const indeg = new Map(ids.map(id => [id, 0]));
    forward.forEach(e => indeg.set(e.target, indeg.get(e.target) + 1));
    const queue = ids.filter(id => !indeg.get(id));
    ids.forEach(id => col.set(id, pinned.has(id) ? pinnedCol(id) : 0));
    while (queue.length) {
      const id = queue.shift();
      forward.forEach(e => {
        if (e.source !== id) return;
        if (!pinned.has(e.target)) col.set(e.target, Math.max(col.get(e.target), col.get(id) + 1));
        indeg.set(e.target, indeg.get(e.target) - 1);
        if (!indeg.get(e.target)) queue.push(e.target);
      });
    }
  });
  nodes.forEach(n => {
    if (pinned.has(n.id)) col.set(n.id, Number.isInteger(n.col) && n.col >= 0 ? n.col : 0);
  });
  satelliteOf.forEach((other, id) => col.set(id, col.get(other) ?? 0));

  // Global slots: lane, then column — the left-to-right order of the drawing.
  const slot = id => lane.get(id) * 10000 + col.get(id);

  // ── 2. Main route ──
  const main = mainRoute(nodes.filter(n => !satelliteOf.has(n.id)), edges, slot, index);

  // ── 3. Rows ──
  const slots = new Map();
  nodes.forEach(n => {
    const s = slot(n.id);
    if (!slots.has(s)) slots.set(s, []);
    slots.get(s).push(n.id);
  });
  const slotKeys = [...slots.keys()].sort((a, b) => a - b);
  const neighbours = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(e => {
    neighbours.get(e.source).push(e.target);
    neighbours.get(e.target).push(e.source);
  });

  const row = new Map();
  const fixed = new Set();
  nodes.forEach(n => {
    if (pinned.has(n.id) && Number.isFinite(n.row)) { row.set(n.id, n.row); fixed.add(n.id); }
  });
  main.forEach(id => {
    if (!fixed.has(id)) { row.set(id, 0); fixed.add(id); }
  });
  // Row 0 belongs to the main route wherever there is one.
  const keepZero = main.size > 0;

  // Start from input order, then refine by barycentres, sweeping left→right
  // and right→left. A node with no placed neighbour keeps its place.
  const place = (s, bary) => {
    const ids = slots.get(s);
    const free = ids.filter(id => !fixed.has(id))
      .sort((a, b) => (bary(a) - bary(b)) || (index.get(a) - index.get(b)));
    if (!free.length) return;
    const taken = new Set(ids.filter(id => fixed.has(id)).map(id => row.get(id)));
    if (keepZero) taken.add(0);
    assignRows(free, free.map(bary), taken).forEach((r, i) => row.set(free[i], r));
  };
  slotKeys.forEach(s => place(s, id => index.get(id) * 1e-6));
  const baryOf = id => {
    const near = neighbours.get(id).filter(x => row.has(x));
    if (!near.length) return row.get(id) ?? 0;
    return near.reduce((sum, x) => sum + row.get(x), 0) / near.length;
  };
  for (let sweep = 0; sweep < 8; sweep++) {
    const keys = sweep % 2 ? [...slotKeys].reverse() : slotKeys;
    keys.forEach(s => place(s, baryOf));
  }

  const hints = new Map();
  nodes.forEach(n => {
    if (pinned.has(n.id)) return;
    hints.set(n.id, { col: col.get(n.id), row: row.get(n.id) ?? 0 });
  });
  return { hints, main, cols: col };
}

// Ties in time order (timeless ones last, in input order); a tie whose
// target already reaches its source would close a loop and is left out.
function temporalForward(ids, edges) {
  const t = e => parseTime(e.start);
  const order = edges.map((e, i) => [e, i]).sort((a, b) => {
    const ta = t(a[0]), tb = t(b[0]);
    if (ta == null || tb == null) return ta == null && tb == null ? a[1] - b[1] : ta == null ? 1 : -1;
    return (ta - tb) || (a[1] - b[1]);
  }).map(x => x[0]);
  const out = new Map(ids.map(id => [id, []]));
  const reaches = (from, to) => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      const id = stack.pop();
      if (id === to) return true;
      out.get(id).forEach(x => { if (!seen.has(x)) { seen.add(x); stack.push(x); } });
    }
    return false;
  };
  const kept = [];
  order.forEach(e => {
    if (reaches(e.target, e.source)) return;
    out.get(e.source).push(e.target);
    kept.push(e);
  });
  return kept;
}

function eadesForward(ids, edges, index) {
  const pos = new Map(acyclicOrder(ids, edges, index).map((id, i) => [id, i]));
  return edges.filter(e => pos.get(e.source) < pos.get(e.target));
}

// Eades–Lin–Smyth greedy order: sinks to the back, sources to the front,
// otherwise the node with the largest out − in surplus. Ties pointing
// backwards in the result are the reversed (feedback) set — few, and on an
// even count the lighter by value.
function acyclicOrder(ids, edges, index) {
  const left = new Set(ids);
  const head = [], tail = [];
  const outs = id => edges.filter(e => e.source === id && left.has(e.target) && e.target !== id);
  const ins  = id => edges.filter(e => e.target === id && left.has(e.source) && e.source !== id);
  const byInput = (a, b) => index.get(a) - index.get(b);
  while (left.size) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const id of [...left].sort(byInput)) {
        if (!outs(id).length) { tail.unshift(id); left.delete(id); moved = true; }
      }
      for (const id of [...left].sort(byInput)) {
        if (!ins(id).length) { head.push(id); left.delete(id); moved = true; }
      }
    }
    if (!left.size) break;
    const weight = list => list.reduce((s, e) => s + (num(e.value) ?? 0), 0);
    const best = [...left].sort(byInput).reduce((a, b) => {
      const da = outs(a).length - ins(a).length, db = outs(b).length - ins(b).length;
      if (db !== da) return db > da ? b : a;
      const wa = weight(outs(a)) - weight(ins(a)), wb = weight(outs(b)) - weight(ins(b));
      return wb > wa ? b : a;
    });
    head.push(best);
    left.delete(best);
  }
  return head.concat(tail);
}

// The route on row 0: flagged nodes or ties, else the longest path moving
// strictly left to right through the slots (steps first, value second).
function mainRoute(nodes, edges, slot, index) {
  const flagged = new Set(nodes.filter(n => n.main === true).map(n => n.id));
  edges.forEach(e => { if (e.main === true) { flagged.add(e.source); flagged.add(e.target); } });
  if (flagged.size) {
    // one per slot: the earliest in input order
    const perSlot = new Map();
    [...flagged].sort((a, b) => index.get(a) - index.get(b)).forEach(id => {
      if (!perSlot.has(slot(id))) perSlot.set(slot(id), id);
    });
    return new Set(perSlot.values());
  }
  const ids = new Set(nodes.map(n => n.id));
  const forward = edges.filter(e => ids.has(e.source) && ids.has(e.target) && slot(e.source) < slot(e.target));
  if (!forward.length) return new Set();
  // Each step counts 1; value adds less than one step in total, so it only
  // decides between routes of equal length.
  const total = forward.reduce((s, e) => s + (num(e.value) ?? 0), 0);
  const w = e => 1 + (total ? (num(e.value) ?? 0) / (total * 2) : 0);
  const order = nodes.map(n => n.id)
    .sort((a, b) => (slot(a) - slot(b)) || (index.get(a) - index.get(b)));
  const best = new Map(order.map(id => [id, 0]));
  const prev = new Map();
  order.forEach(id => {
    forward.filter(e => e.target === id).forEach(e => {
      const score = best.get(e.source) + w(e);
      if (score > best.get(id) + 1e-12) { best.set(id, score); prev.set(id, e.source); }
    });
  });
  let end = null;
  order.forEach(id => { if (end == null || best.get(id) > best.get(end) + 1e-12) end = id; });
  const route = new Set();
  for (let id = end; id != null; id = prev.get(id)) route.add(id);
  return route.size > 1 ? route : new Set();
}

// Rows for nodes already sorted by barycentre: strictly increasing, none in
// `taken`, as close to each barycentre as possible (small DP over a window
// of candidate rows).
function assignRows(ids, bary, taken) {
  const m = ids.length;
  const reach = m + taken.size + 2 + Math.ceil(Math.max(0, ...bary.map(b => Math.abs(b))));
  const rows = [];
  for (let r = -reach; r <= reach; r++) if (!taken.has(r)) rows.push(r);
  const R = rows.length;
  const cost = new Array(m).fill(null).map(() => new Array(R).fill(Infinity));
  const from = new Array(m).fill(null).map(() => new Array(R).fill(-1));
  // distance to the barycentre, plus a hair for rows far from the centre so
  // equal choices settle near the main line
  const c = (i, j) => Math.abs(rows[j] - bary[i]) + Math.abs(rows[j]) * 1e-3;
  for (let j = 0; j < R; j++) cost[0][j] = c(0, j);
  for (let i = 1; i < m; i++) {
    let bestK = -1;
    for (let j = 0; j < R; j++) {
      if (j > 0 && (bestK < 0 || cost[i - 1][j - 1] < cost[i - 1][bestK])) bestK = j - 1;
      if (bestK < 0) continue;
      cost[i][j] = cost[i - 1][bestK] + c(i, j);
      from[i][j] = bestK;
    }
  }
  let j = 0;
  for (let k = 1; k < R; k++) if (cost[m - 1][k] < cost[m - 1][j]) j = k;
  const out = new Array(m);
  for (let i = m - 1; i >= 0; i--) { out[i] = rows[j]; j = from[i][j]; }
  return out;
}

// Number of crossing tie pairs between positioned nodes — for tests and for
// comparing layouts. Ties are straight segments here; shared endpoints do
// not count.
export function countCrossings(links, positions) {
  const segs = links
    .map(l => [l.source, l.target, positions.get(l.source), positions.get(l.target)])
    .filter(s => s[2] && s[3]);
  const cross = (p, q, r, s) => {
    const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const d1 = d(r, s, p), d2 = d(r, s, q), d3 = d(p, q, r), d4 = d(p, q, s);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [a, b, p, q] = segs[i], [c, d, r, s] = segs[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (cross(p, q, r, s)) n++;
    }
  }
  return n;
}

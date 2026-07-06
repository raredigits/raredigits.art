// RareCharts — graph/layouts/ego.js
// Deterministic grid ego layout: categories anchored to corners.
//
// The chart is divided into a regular grid sized for the node count (with
// headroom). The focused node is pinned to the center cell. Every category
// (node `group` by default, or first-ring link type with groupBy: 'type')
// gets a home anchor — corners first, then edge midpoints, largest category
// first — and its nodes fill cells starting from the anchor and growing
// toward the center: deepest connections claim the far corner, first-ring
// ones end up nearest the ego. No arcs, no simulation — a tidy table where
// distance from the center still reads as degrees of separation.
//
// Input nodes must carry a `depth` property (GraphModel.neighborhood).
// Returns { positions: Map<id, {x, y, depth}>,
//           sectors:   [{ key, angle, x, y }] }  — category caption anchors.

const linkW = l => l.weight ?? l.strength ?? 0.5;

export function egoLayout({ nodes = [], links = [] } = {}, {
  rootId,
  width: W = 800,
  height: H = 520,
  groupBy = 'group',
} = {}) {
  const positions = new Map();
  const sectors = [];
  if (!nodes.length || rootId == null) return { positions, sectors };

  // ── Grid: enough cells for every node plus breathing room
  const pad = 28;
  const gw = Math.max(1, W - pad * 2);
  const gh = Math.max(1, H - pad * 2);
  const target = Math.max(nodes.length + 8, Math.ceil(nodes.length * 1.35));
  const cols = Math.max(4, Math.round(Math.sqrt(target * gw / gh)));
  const rows = Math.max(3, Math.ceil(target / cols));
  const cellW = gw / cols;
  const cellH = gh / rows;
  const cxOf = c => pad + cellW * (c + 0.5);
  const cyOf = r => pad + cellH * (r + 0.5);

  const occupied = new Set();
  const take = (r, c) => occupied.add(`${r},${c}`);
  const free = (r, c) => !occupied.has(`${r},${c}`);

  // ── Root pinned to the center cell
  const rootR = Math.floor(rows / 2);
  const rootC = Math.floor(cols / 2);
  take(rootR, rootC);
  positions.set(rootId, { x: cxOf(rootC), y: cyOf(rootR), depth: 0 });

  // ── Strongest-link parent on the previous ring (needed for 'type' sectors)
  const byId = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map();
  links.forEach(l => {
    if (!adjacency.has(l.source)) adjacency.set(l.source, []);
    if (!adjacency.has(l.target)) adjacency.set(l.target, []);
    adjacency.get(l.source).push({ other: l.target, link: l });
    adjacency.get(l.target).push({ other: l.source, link: l });
  });
  const parentOf = new Map();
  nodes.forEach(n => {
    if ((n.depth ?? 0) === 0) return;
    const candidates = (adjacency.get(n.id) ?? [])
      .filter(({ other }) => (byId.get(other)?.depth ?? Infinity) === n.depth - 1)
      .sort((a, b) => (linkW(b.link) - linkW(a.link)) || (a.other < b.other ? -1 : 1));
    if (candidates[0]) parentOf.set(n.id, candidates[0]);
  });
  const typeKey = id => {
    let cur = id, guard = 0;
    while (guard++ < 64) {
      const p = parentOf.get(cur);
      if (!p) return '';
      if ((byId.get(p.other)?.depth ?? 0) === 0) return String(p.link?.type ?? '');
      cur = p.other;
    }
    return '';
  };
  const keyOf = id => groupBy === 'type'
    ? typeKey(id)
    : String(byId.get(id)?.group ?? 'other');

  // ── Categories by population; anchors: corners first, then edge midpoints
  const members = new Map();
  nodes.forEach(n => {
    if ((n.depth ?? 0) === 0) return;
    const k = keyOf(n.id);
    if (!members.has(k)) members.set(k, []);
    members.get(k).push(n);
  });
  const keys = [...members.keys()].sort((a, b) =>
    (members.get(b).length - members.get(a).length) || a.localeCompare(b));

  const midR = Math.floor(rows / 2), midC = Math.floor(cols / 2);
  const anchorCells = [
    [0, cols - 1],           // top-right
    [rows - 1, 0],           // bottom-left
    [0, 0],                  // top-left
    [rows - 1, cols - 1],    // bottom-right
    [0, midC],               // top-mid
    [rows - 1, midC],        // bottom-mid
    [midR, 0],               // left-mid
    [midR, cols - 1],        // right-mid
  ];

  keys.forEach((key, ki) => {
    const [ar, ac] = anchorCells[ki % anchorCells.length];
    const ax = cxOf(ac), ay = cyOf(ar);

    // Deepest first: the far corner belongs to the most distant connections,
    // so the cells nearest the center are left for the first ring.
    const list = members.get(key).slice().sort((x, y) =>
      ((y.depth ?? 0) - (x.depth ?? 0))
      || String(x.label ?? x.id).localeCompare(String(y.label ?? y.id)));

    list.forEach(n => {
      let best = null, bestD = Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!free(r, c)) continue;
          const dx = cxOf(c) - ax, dy = cyOf(r) - ay;
          const d = dx * dx + dy * dy;
          if (d < bestD - 1e-9) { bestD = d; best = [r, c]; }
        }
      }
      if (!best) return;  // grid sized with headroom — should not happen
      take(best[0], best[1]);
      positions.set(n.id, { x: cxOf(best[1]), y: cyOf(best[0]), depth: n.depth ?? 1 });
    });

    // Caption in the margin next to the anchor; angle points toward the
    // center so the renderer grows the text into the chart, not off-canvas.
    const onTop = ar === 0, onBottom = ar === rows - 1;
    const x = ac === 0 ? pad * 0.35 : ac === cols - 1 ? W - pad * 0.35 : ax;
    const y = onTop ? pad * 0.4 : onBottom ? H - pad * 0.35 : ay;
    const angle = Math.atan2(H / 2 - y, W / 2 - x);
    sectors.push({ key, angle, x, y });
  });

  return { positions, sectors };
}

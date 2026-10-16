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
// One dominant category (> 80% of the nodes) has no corners to share — the
// grid would pile it into a single corner. Then that category is anchored at
// the ego itself and fills the grid from the centre out, nearest ring first:
// a centred rosette on the same grid (A4, 0.9.8_3).
//
// Input nodes must carry a `depth` property (GraphModel.neighborhood).
// Returns { positions: Map<id, {x, y, depth}>,
//           sectors:   [{ key, angle, x, y }] }  — category caption anchors.

const linkW = l => l.weight ?? l.strength ?? 0.5;

// Cell rule shared with the Graph's capacity cap: a node and its label need
// ~96 px across and ~50 px down once the used rows are spread over the
// height. Capacity = cells − 1 (the ego's own cell).
const CELL_W = 96, CELL_H = 50, PAD = 28;
export function egoCapacity(W, H, nodeRadius = 22) {
  const gw = Math.max(1, W - PAD * 2);
  const gh = Math.max(1, H - nodeRadius * 2 - 28);
  return Math.max(1, Math.floor(gw / CELL_W) * Math.floor(gh / CELL_H) - 1);
}

export function egoLayout({ nodes = [], links = [] } = {}, {
  rootId,
  width: W = 800,
  height: H = 520,
  groupBy = 'group',
  nodeRadius = 22,
  sectorLabels = false,
} = {}) {
  const positions = new Map();
  const sectors = [];
  if (!nodes.length || rootId == null) return { positions, sectors };

  // ── Grid: enough cells for every node plus breathing room
  const pad = 28;
  const gw = Math.max(1, W - pad * 2);
  const gh = Math.max(1, H - pad * 2);
  // Spare cells give each category room around its anchor — but only while
  // the canvas has them: a full canvas uses every cell instead.
  const maxCells = egoCapacity(W, H, nodeRadius) + 1;
  const target = Math.max(nodes.length + 1,
    Math.min(Math.max(nodes.length + 8, Math.ceil(nodes.length * 1.35)), maxCells));
  // A cell holds a node and its label: never narrower than ~96 px, or labels
  // run into each other. Cap columns by width first.
  const maxCols = Math.max(4, Math.floor(gw / CELL_W));
  const cols = Math.min(maxCols, Math.max(4, Math.round(Math.sqrt(target * gw / gh))));
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
  const rowOf = new Map([[rootId, rootR]]);
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

  const others = nodes.filter(n => n.id !== rootId && (n.depth ?? 0) > 0).length;
  const dominant = keys.length > 0 && others >= 6 && members.get(keys[0]).length / others > 0.8;

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
    // Dominant category: anchored at the ego, nearest ring first. A minority
    // next to it keeps the corner scheme (its index shifts by one).
    const centred = dominant && ki === 0;
    const [ar, ac] = centred ? [rootR, rootC] : anchorCells[(ki - (dominant ? 1 : 0)) % anchorCells.length];
    // Next to a dominant rosette a minority category sits halfway out towards
    // its corner — just outside the crowd, not pinned to the canvas edge.
    const pull = dominant && !centred ? 0.5 : 1;
    const ax = cxOf(rootC) + (cxOf(ac) - cxOf(rootC)) * pull;
    const ay = cyOf(rootR) + (cyOf(ar) - cyOf(rootR)) * pull;

    // Corner anchors: deepest first — the far corner belongs to the most
    // distant connections, so the cells nearest the center are left for the
    // first ring. Centre anchor: the opposite, first ring nearest the ego.
    const list = members.get(key).slice().sort((x, y) =>
      (centred ? (x.depth ?? 0) - (y.depth ?? 0) : (y.depth ?? 0) - (x.depth ?? 0))
      || String(x.label ?? x.id).localeCompare(String(y.label ?? y.id)));

    list.forEach(n => {
      let best = null, bestD = Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!free(r, c)) continue;
          const dx = cxOf(c) - ax, dy = cyOf(r) - ay;
          // Centre anchor: distance in canvas proportions (an ellipse as wide
          // as the canvas), so the rosette uses the width instead of piling
          // up as a circle in the middle; ties broken clockwise from the top.
          const d = centred
            ? (dx / gw) ** 2 + (dy / gh) ** 2
              + ((Math.atan2(dy, dx) + Math.PI * 2.5) % (Math.PI * 2)) * 1e-9
            : dx * dx + dy * dy;
          if (d < bestD - 1e-9) { bestD = d; best = [r, c]; }
        }
      }
      if (!best) return;  // grid sized with headroom — should not happen
      take(best[0], best[1]);
      rowOf.set(n.id, best[0]);
      positions.set(n.id, { x: cxOf(best[1]), y: cyOf(best[0]), depth: n.depth ?? 1 });
    });

    // Caption in the margin next to the anchor; angle points toward the
    // center so the renderer grows the text into the chart, not off-canvas.
    // A centred category is captioned at the top edge.
    if (centred) {
      sectors.push({ key, angle: Math.PI / 2, x: W / 2, y: pad * 0.4 });
      return;
    }
    const onTop = ar === 0, onBottom = ar === rows - 1;
    const x = ac === 0 ? pad * 0.35 : ac === cols - 1 ? W - pad * 0.35 : ax;
    const y = onTop ? pad * 0.4 : onBottom ? H - pad * 0.35 : ay;
    const angle = Math.atan2(H / 2 - y, W / 2 - x);
    sectors.push({ key, angle, x, y });
  });

  // ── Vertical fit: the grid keeps spare cells, and spare rows at the top or
  // bottom became empty bands. Spread the rows actually used from just under
  // the top edge (a node's radius) to just above the bottom (radius + label).
  const used = [...rowOf.values()];
  const rMin = Math.min(...used), rMax = Math.max(...used);
  const yTop = nodeRadius + 6 + (sectorLabels ? 14 : 0);
  const yBot = H - nodeRadius - 22 - (sectorLabels ? 14 : 0);
  if (rMax > rMin && yBot > yTop) {
    const step = Math.min((yBot - yTop) / (rMax - rMin), cellH * 1.6);
    const span = step * (rMax - rMin);
    const y0 = yTop + ((yBot - yTop) - span) / 2;
    positions.forEach((pos, id) => {
      pos.y = y0 + (rowOf.get(id) - rMin) * step;
    });
  }

  return { positions, sectors, cellW };
}

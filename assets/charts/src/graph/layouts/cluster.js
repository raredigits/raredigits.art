// RareCharts — graph/layouts/cluster.js
// Deterministic overview layout: communities collapsed into meta-nodes.
//
// Meta-nodes stand on a regular grid, like the ego view — a circle of
// unequal meta-nodes overlapped as soon as a few of them were large. Cells
// are taken from the centre outwards in the input order (largest community
// first, as Graph builds it), so the biggest groups sit in the middle and
// the small ones at the rim. A single community sits in the center.
// Inter-community link widths encode how many real edges run between groups.
//
// Input: viewData with meta-nodes (as built by Graph from source.aggregates()).
// Returns Map<id, { x, y }>.

export function clusterLayout({ nodes = [] } = {}, {
  width: W = 800,
  height: H = 520,
  pad = 48,
  nodeRadius = 22,
} = {}) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const cx = W / 2, cy = H / 2;
  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: cx, y: cy });
    return positions;
  }

  // Grid shaped like the canvas, one cell per meta-node.
  const gw = Math.max(1, W - pad * 2);
  const gh = Math.max(1, H - pad * 2);
  const n = nodes.length;
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * gw / gh))));
  const rows = Math.ceil(n / cols);
  const cellW = gw / cols, cellH = gh / rows;

  // Cells ordered by distance from the centre, then clockwise from the top —
  // deterministic spiral fill.
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + cellW * (c + 0.5), y = pad + cellH * (r + 0.5);
      const d = Math.hypot(x - cx, y - cy);
      const a = (Math.atan2(y - cy, x - cx) + Math.PI * 2.5) % (Math.PI * 2);
      cells.push({ x, y, d, a });
    }
  }
  cells.sort((p, q) => (p.d - q.d) || (p.a - q.a));
  nodes.forEach((node, i) => {
    const cell = cells[i];
    positions.set(node.id, { x: cell.x, y: cell.y, row: Math.round((cell.y - pad) / cellH - 0.5) });
  });

  // Vertical fit, as in the ego view: the used rows span the canvas from
  // just under the top (largest node's radius in that row) to just above
  // the bottom (radius + label), instead of floating in a padded band.
  const radiusOf = n => nodeRadius * (n.size ?? 1);
  const usedRows = [...new Set([...positions.values()].map(p => p.row))].sort((a, b) => a - b);
  if (usedRows.length > 1) {
    const rowR = r => Math.max(...nodes.filter(n => positions.get(n.id).row === r).map(radiusOf));
    const yTop = rowR(usedRows[0]) + 6;
    const yBot = H - rowR(usedRows[usedRows.length - 1]) - 22;
    const step = (yBot - yTop) / (usedRows.length - 1);
    positions.forEach(p => {
      p.y = yTop + usedRows.indexOf(p.row) * step;
    });
  }
  positions.forEach(p => { delete p.row; });
  return positions;
}

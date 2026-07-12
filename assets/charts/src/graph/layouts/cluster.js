// RareCharts — graph/layouts/cluster.js
// Deterministic overview layout: communities collapsed into meta-nodes.
//
// Meta-nodes sit on a circle, ordered by community size (largest at the top,
// then clockwise); a single community sits in the center. Inter-community
// link widths encode how many real edges run between the groups.
//
// Input: viewData with meta-nodes (as built by Graph from source.aggregates()).
// Returns Map<id, { x, y }>.

export function clusterLayout({ nodes = [] } = {}, {
  width: W = 800,
  height: H = 520,
} = {}) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const cx = W / 2, cy = H / 2;
  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: cx, y: cy });
    return positions;
  }

  const R = Math.min(W, H) * 0.37;
  nodes.forEach((n, i) => {
    const angle = -Math.PI / 2 + (i / nodes.length) * Math.PI * 2;
    positions.set(n.id, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
  });
  return positions;
}

// RareCharts — graph/layouts/path.js
// Deterministic layered layout for "how are A and B connected".
//
// Columns = hops from A (left) to B (right), one row per route — reads like a
// route map. Endpoints sit vertically centered; each path occupies its own
// row; nodes shared between paths keep the position of the first (shortest)
// path they appear in. Optional context fans place each endpoint's other
// connections in a half-circle behind it — showing that the endpoints are well
// connected beyond the routes. Chaos is impossible by construction.
//
// Input: { paths: [[idA, ..., idB], ...], context?: { [endpointId]: [ids] } }.
// Returns { positions: Map<id, {x, y, row?, hop?, context?}>,
//           rows: [{ y, x, hops, shortest, direct }] } — x/y anchor the row's
//           caption on the route.
//
// A route listed twice is drawn once. A route of one node (connect(a, a))
// is that node, centred, with no caption (R-18).
//
// labelHalf(id) — half the width of a node's label in px (default 0): a node
// at either end of the drawing moves in so that its label stays inside it,
// `edge` px from the border (C-36).

export function pathLayout({ paths = [], context = null } = {}, {
  width: W = 800,
  height: H = 520,
  padX = null,
  labelHalf = null,
  edge = 4,
} = {}) {
  const positions = new Map();
  const rows = [];
  const seenRoutes = new Set();
  paths = paths.filter(p => {
    const key = JSON.stringify(p);
    if (!p?.length || seenRoutes.has(key)) return false;
    seenRoutes.add(key);
    return true;
  });
  if (!paths.length) return { positions, rows };
  if (paths.length === 1 && paths[0].length === 1) {
    positions.set(paths[0][0], { x: W / 2, y: H / 2, row: 0, hop: 0 });
    return { positions, rows };
  }

  const pad = padX ?? (context ? 150 : 70);
  const usableW = Math.max(1, W - pad * 2);
  const count = paths.length;
  // Routes spread over the height, keeping room for a node and its label at
  // the top and bottom rows.
  const rowGap = count > 1 ? Math.min(150, (H - 76) / (count - 1)) : 0;
  const yForRow = row => H / 2 + (row - (count - 1) / 2) * rowGap;

  paths.forEach((p, row) => {
    const last = Math.max(1, p.length - 1);
    p.forEach((id, hop) => {
      if (positions.has(id)) return;  // shared node — first path wins
      const isEndpoint = hop === 0 || hop === p.length - 1;
      positions.set(id, {
        x: pad + (hop / last) * usableW,
        y: isEndpoint ? H / 2 : yForRow(row),
        row,
        hop,
      });
    });
    // Caption anchor: over the row's first intermediate node — on the route
    // itself, clear of the endpoint's context fan at the canvas edge. A direct
    // tie (no intermediate node) is captioned over its middle.
    const hops = p.length - 1;
    rows.push({
      y: yForRow(row), hops, shortest: row === 0,
      x: hops > 1 ? pad + usableW / last : pad + usableW / 2,
      direct: hops <= 1,
    });
  });

  // ── Context fans: the endpoints' other connections, behind each endpoint
  if (context) {
    const fan = (ids, at, side) => {
      if (!ids?.length || !at) return;
      const R = Math.max(48, Math.min(120, pad - 30, (H - 100) / 2));
      const base = side === 'left' ? Math.PI : 0;      // outward horizontal
      const spread = Math.PI * 0.8;
      const dir = side === 'left' ? 1 : -1;
      ids.forEach((id, i) => {
        if (positions.has(id)) return;
        const t = ids.length === 1 ? 0 : (i / (ids.length - 1) - 0.5);
        const ang = base + t * spread * dir;
        positions.set(id, {
          x: at.x + R * Math.cos(ang),
          y: at.y + R * Math.sin(ang),
          context: true,
        });
      });
    };
    const a = paths[0][0];
    const b = paths[0][paths[0].length - 1];
    fan(context[a], positions.get(a), 'left');
    fan(context[b], positions.get(b), 'right');
  }

  // Labels hang centred under their nodes: the outermost context nodes and
  // long endpoint names ran past the drawing's edge (C-36).
  if (typeof labelHalf === 'function') {
    positions.forEach((p, id) => {
      const half = Math.max(0, labelHalf(id) || 0) + edge;
      p.x = W > 2 * half ? Math.min(W - half, Math.max(half, p.x)) : W / 2;
    });
  }

  return { positions, rows };
}

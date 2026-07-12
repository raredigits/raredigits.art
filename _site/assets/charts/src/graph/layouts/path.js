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
//           rows: [{ y, hops, shortest }] }.

export function pathLayout({ paths = [], context = null } = {}, {
  width: W = 800,
  height: H = 520,
  padX = null,
} = {}) {
  const positions = new Map();
  const rows = [];
  if (!paths.length) return { positions, rows };

  const pad = padX ?? (context ? 150 : 70);
  const usableW = Math.max(1, W - pad * 2);
  const count = paths.length;
  const rowGap = count > 1 ? Math.min(110, (H - 120) / (count - 1)) : 0;
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
    rows.push({ y: yForRow(row), hops: p.length - 1, shortest: row === 0 });
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

  return { positions, rows };
}

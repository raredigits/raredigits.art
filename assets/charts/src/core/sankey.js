// RareCharts — core/sankey.js
// Sankey layout. Pure function, no DOM: { nodes, links } in, coordinates out.
//
// The classic approach (columns by longest path, a few rounds of relaxation
// towards the weighted centre of each node's neighbours, collision
// resolution, then stacking link bands at both ends), written for this
// library: deterministic, with explicit column overrides and a stable
// input-order mode that never reshuffles nodes inside a column.
//
// Input:
//   nodes: [{ id, column?, ... }]          (column: manual layer override)
//   links: [{ id, source, target, value }] (value > 0; endpoints are node ids)
// Options:
//   width, height, nodeWidth, nodePadding,
//   align: 'justify' | 'left' | 'right' | 'center'
//   sort:  null (input order, default) | 'value' | 'auto' (by relaxed
//          position) | (a, b) => number    — order of nodes inside a column
//   iterations: relaxation rounds (default 6)
// Output:
//   { nodes: [{ id, data, layer, value, x0, x1, y0, y1, sourceLinks, targetLinks }],
//     links: [{ id, data, source, target, value, width, y0, y1 }],
//     columns, ky }
// Throws on a cycle (A→B→A, self-loops included) — sankeys are acyclic.

export function sankeyLayout({ nodes = [], links = [] } = {}, {
  width = 600,
  height = 400,
  nodeWidth = 12,
  nodePadding = 12,
  align = 'justify',
  sort = null,
  iterations = 6,
} = {}) {
  // ── Graph ──
  const N = nodes.map((data, index) => ({
    id: String(data.id), data, index,
    sourceLinks: [], targetLinks: [],
  }));
  const byId = new Map(N.map(n => [n.id, n]));
  const L = links.map((data, index) => {
    const source = byId.get(String(data.source));
    const target = byId.get(String(data.target));
    if (!source || !target) {
      throw new Error(`RareCharts.Sankey: link "${data.id ?? index}" references a missing node`);
    }
    const l = { id: data.id ?? String(index), data, index, source, target, value: +data.value };
    source.sourceLinks.push(l);
    target.targetLinks.push(l);
    return l;
  });

  assertAcyclic(N);

  // ── Values ──
  const sum = arr => arr.reduce((s, l) => s + l.value, 0);
  N.forEach(n => { n.value = Math.max(sum(n.sourceLinks), sum(n.targetLinks)); });

  // ── Columns: longest path from the sources (depth) and to the sinks (height) ──
  const order = topoOrder(N);
  N.forEach(n => { n.depth = 0; n.height = 0; });
  order.forEach(n => n.sourceLinks.forEach(l => {
    l.target.depth = Math.max(l.target.depth, n.depth + 1);
  }));
  order.slice().reverse().forEach(n => n.targetLinks.forEach(l => {
    l.source.height = Math.max(l.source.height, n.height + 1);
  }));
  const maxDepth = N.reduce((m, n) => Math.max(m, n.depth), 0);
  N.forEach(n => {
    let layer;
    if (align === 'left') layer = n.depth;
    else if (align === 'right') layer = maxDepth - n.height;
    else if (align === 'center') {
      layer = n.targetLinks.length ? n.depth
        : n.sourceLinks.length ? Math.min(...n.sourceLinks.map(l => l.target.depth)) - 1
        : 0;
    } else {
      layer = n.sourceLinks.length ? n.depth : maxDepth;   // justify: sinks to the right edge
    }
    const manual = n.data.column;
    n.layer = Number.isInteger(manual) && manual >= 0 ? manual : Math.max(0, layer);
  });
  const columnsCount = N.reduce((m, n) => Math.max(m, n.layer + 1), 0);
  const columns = Array.from({ length: columnsCount }, () => []);
  N.forEach(n => columns[n.layer].push(n));

  const sortColumn = col => {
    if (typeof sort === 'function') col.sort((a, b) => sort(a.data, b.data) || a.index - b.index);
    else if (sort === 'value') col.sort((a, b) => (b.value - a.value) || a.index - b.index);
    else if (sort === 'auto') col.sort((a, b) => (a.y0 - b.y0) || a.index - b.index);
    else col.sort((a, b) => a.index - b.index);
  };

  // ── Horizontal positions ──
  const step = columnsCount > 1 ? (width - nodeWidth) / (columnsCount - 1) : 0;
  N.forEach(n => {
    n.x0 = columnsCount > 1 ? n.layer * step : (width - nodeWidth) / 2;
    n.x1 = n.x0 + nodeWidth;
  });

  // ── Vertical scale: the most crowded column fills the height ──
  const maxPerColumn = columns.reduce((m, c) => Math.max(m, c.length), 0);
  const py = maxPerColumn > 1 ? Math.min(nodePadding, height / (maxPerColumn - 1) / 2) : 0;
  const ky = columns.reduce((k, col) => {
    const total = col.reduce((s, n) => s + n.value, 0);
    if (!total) return k;
    return Math.min(k, (height - (col.length - 1) * py) / total);
  }, Infinity);
  const kyFinal = Number.isFinite(ky) && ky > 0 ? ky : 0;

  // Initial stacking, centred in the available height
  columns.forEach(col => {
    sortColumn(col);
    const used = col.reduce((s, n) => s + n.value * kyFinal, 0) + (col.length - 1) * py;
    let y = Math.max(0, (height - used) / 2);
    col.forEach(n => {
      n.y0 = y;
      n.y1 = y + n.value * kyFinal;
      y = n.y1 + py;
    });
  });

  // ── Relaxation: pull nodes towards the weighted centre of their neighbours ──
  const centre = n => (n.y0 + n.y1) / 2;
  const relax = (cols, alpha, incoming) => {
    cols.forEach(col => {
      col.forEach(n => {
        const ls = incoming ? n.targetLinks : n.sourceLinks;
        if (!ls.length) return;
        let w = 0, acc = 0;
        ls.forEach(l => {
          const other = incoming ? l.source : l.target;
          acc += centre(other) * l.value;
          w += l.value;
        });
        if (!w) return;
        const dy = (acc / w - centre(n)) * alpha;
        n.y0 += dy;
        n.y1 += dy;
      });
      if (sort === 'auto') sortColumn(col);
      resolveCollisions(col, py, height);
    });
  };
  for (let i = 0; i < iterations; i++) {
    const alpha = Math.pow(0.99, i);
    const beta = Math.max(1 - alpha, (i + 1) / iterations);
    relax(columns.slice(1), beta, true);
    relax(columns.slice(0, -1).reverse(), beta, false);
  }

  // ── Link bands: stack at both ends, ordered by the far end's position ──
  N.forEach(n => {
    n.sourceLinks.sort((a, b) => (a.target.y0 - b.target.y0) || a.index - b.index);
    n.targetLinks.sort((a, b) => (a.source.y0 - b.source.y0) || a.index - b.index);
  });
  // Widths first: a node's incoming bands may belong to sources not yet visited.
  L.forEach(l => { l.width = l.value * kyFinal; });
  N.forEach(n => {
    let y = n.y0;
    n.sourceLinks.forEach(l => { l.y0 = y + l.width / 2; y += l.width; });
    y = n.y0;
    n.targetLinks.forEach(l => { l.y1 = y + l.width / 2; y += l.width; });
  });

  return { nodes: N, links: L, columns: columnsCount, ky: kyFinal };
}

// Keep a column's order, push overlapping nodes down, then pull the overflow
// back up from the bottom edge.
function resolveCollisions(col, py, height) {
  let y = 0;
  col.forEach(n => {
    const dy = y - n.y0;
    if (dy > 0) { n.y0 += dy; n.y1 += dy; }
    y = n.y1 + py;
  });
  const overflow = y - py - height;
  if (overflow > 0) {
    y = height;
    for (let i = col.length - 1; i >= 0; i--) {
      const n = col[i];
      const dy = n.y1 - y;
      if (dy > 0) { n.y0 -= dy; n.y1 -= dy; }
      y = n.y0 - py;
    }
  }
}

// Kahn's algorithm: a topological order of an acyclic graph.
function topoOrder(N) {
  const indeg = new Map(N.map(n => [n, n.targetLinks.length]));
  const queue = N.filter(n => indeg.get(n) === 0);
  const out = [];
  while (queue.length) {
    const n = queue.shift();
    out.push(n);
    n.sourceLinks.forEach(l => {
      indeg.set(l.target, indeg.get(l.target) - 1);
      if (indeg.get(l.target) === 0) queue.push(l.target);
    });
  }
  return out;
}

// Depth-first search for a back edge; the error names the cycle.
function assertAcyclic(N) {
  const state = new Map();   // undefined = unseen, 1 = on stack, 2 = done
  const stack = [];
  const visit = n => {
    state.set(n, 1);
    stack.push(n);
    for (const l of n.sourceLinks) {
      const t = l.target;
      if (state.get(t) === 1) {
        const from = stack.indexOf(t);
        const cycle = [...stack.slice(from), t].map(x => x.id).join(' → ');
        throw new Error(`RareCharts.Sankey: links form a cycle (${cycle}); a sankey must be acyclic`);
      }
      if (!state.get(t)) visit(t);
    }
    stack.pop();
    state.set(n, 2);
  };
  N.forEach(n => { if (!state.get(n)) visit(n); });
}

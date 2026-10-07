// RareCharts — graph/views/flow.js
// Graph `view: 'flow'` — a trace of value moving between entities: money
// trails, supply chains, address investigations. Nodes stand in ordered
// lanes (networks, stages, jurisdictions) and flow left to right; ties are
// directed, may repeat between one pair, and carry value (width), category
// (color), certainty (dash) and labels.
//
// Stage 1 (0.9.8_3): layout from data hints — `lane` (required), `row`,
// `col`, exact `x`/`y`. Automatic in-lane layout, aggregation and collapsible
// groups are stage 2 (0.9.8_4). Spec: charts/SPEC-GRAPH-FLOW-INTERNAL.md.
//
// Two parts: layoutFlow() is pure (no DOM) and unit-tested; FlowView draws
// inside the Graph's zoom group and owns the view's interaction.

import * as d3 from 'd3';
import {
  applyTimeWindow, linkWidthScale, parallelIndex,
} from '../../core/links.js';

// ─── Layout ─────────────────────────────────────────────────────────────────

// Positions from hints. Lanes split the width by `weight`; a lane holds
// sub-columns (`col`, default 0) and rows (`row`: 0 = the main line, ±1, ±2
// above/below). A node without `row` takes the next free row of its cell —
// 0, then 1, −1, 2, −2… — in input order. Exact `x`/`y` are fractions:
// `x` of the lane width, `y` of the drawing height below the lane headers.
// Nodes that still share a spot are pushed apart vertically.
export function layoutFlow({ nodes = [], lanes = [] } = {}, {
  width = 900,
  height = 600,
  laneBy = 'lane',
  header = 34,
  pad = 24,
  minGap = 56,
  nodeRadius = 18,
  captionRoom = 36,   // below a node's edge: label + sub line
} = {}) {
  const laneOf = n => (typeof laneBy === 'function' ? laneBy(n) : n[laneBy]);

  // Lanes: declared order first, then any lane only the data mentions.
  const laneList = lanes.map(l => ({ id: String(l.id), label: l.label ?? String(l.id), weight: l.weight ?? 1 }));
  const known = new Set(laneList.map(l => l.id));
  nodes.forEach(n => {
    const id = laneOf(n) == null ? '' : String(laneOf(n));
    if (!known.has(id)) {
      known.add(id);
      laneList.push({ id, label: id, weight: 1 });
    }
  });
  const totalW = laneList.reduce((s, l) => s + l.weight, 0) || 1;
  let x = 0;
  laneList.forEach(l => {
    l.x0 = x;
    l.x1 = x + (l.weight / totalW) * width;
    x = l.x1;
  });
  const laneById = new Map(laneList.map(l => [l.id, l]));

  const top = header + pad;
  const usableH = Math.max(1, height - top - pad);

  // Cells: lane × col. Count columns per lane.
  const colsPerLane = new Map();
  nodes.forEach(n => {
    const lane = String(laneOf(n) ?? '');
    const c = Number.isInteger(n.col) && n.col >= 0 ? n.col : 0;
    colsPerLane.set(lane, Math.max(colsPerLane.get(lane) ?? 1, c + 1));
  });

  // Rows: explicit first, then fill free rows per cell in input order.
  const rowOf = new Map();
  const taken = new Map();   // cell key → Set(rows)
  const cellKey = n => `${laneOf(n) ?? ''}|${Number.isInteger(n.col) && n.col >= 0 ? n.col : 0}`;
  nodes.forEach(n => {
    if (Number.isFinite(n.row)) {
      rowOf.set(n.id, n.row);
      const k = cellKey(n);
      if (!taken.has(k)) taken.set(k, new Set());
      taken.get(k).add(n.row);
    }
  });
  const freeRows = function* () {
    yield 0;
    for (let i = 1; ; i++) { yield i; yield -i; }
  };
  nodes.forEach(n => {
    if (rowOf.has(n.id)) return;
    const k = cellKey(n);
    if (!taken.has(k)) taken.set(k, new Set());
    const used = taken.get(k);
    for (const r of freeRows()) {
      if (!used.has(r)) { used.add(r); rowOf.set(n.id, r); break; }
    }
  });
  // Rows span what the data uses — not a symmetric band around the main
  // line — inside room kept for a node's top half and, below, its captions.
  const rows = [...rowOf.values()];
  const minRow = Math.min(0, ...rows), maxRow = Math.max(0, ...rows);
  const span = maxRow - minRow;
  const bandTop = top + nodeRadius;
  const bandH = Math.max(1, usableH - nodeRadius * 2 - captionRoom);
  const rowStep = span ? Math.min(120, bandH / span) : 0;
  // A short span sits centred in the band rather than pinned to its top.
  const bandOffset = span ? (bandH - rowStep * span) / 2 : bandH / 2;
  const rowY = r => bandTop + bandOffset + (r - minRow) * rowStep;

  const positions = new Map();
  nodes.forEach(n => {
    const lane = laneById.get(String(laneOf(n) ?? ''));
    const cols = colsPerLane.get(lane.id) ?? 1;
    const c = Number.isInteger(n.col) && n.col >= 0 ? n.col : 0;
    const laneW = lane.x1 - lane.x0;
    let px = lane.x0 + ((c + 0.5) / cols) * laneW;
    let py = rowY(rowOf.get(n.id) ?? 0);
    if (Number.isFinite(n.x)) px = lane.x0 + Math.min(1, Math.max(0, n.x)) * laneW;
    if (Number.isFinite(n.y)) py = top + Math.min(1, Math.max(0, n.y)) * usableH;
    positions.set(n.id, { x: px, y: py, lane: lane.id, col: c, row: rowOf.get(n.id) ?? 0 });
  });

  // Push apart nodes that landed on (almost) the same spot of one lane.
  const byLane = d3.group(nodes, n => positions.get(n.id).lane);
  byLane.forEach(list => {
    const pts = list.map(n => positions.get(n.id)).sort((a, b) => (a.x - b.x) || (a.y - b.y));
    for (let i = 1; i < pts.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = pts[j], b = pts[i];
        if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < minGap) b.y = a.y + minGap;
      }
    }
  });

  return { positions, lanes: laneList, top, height };
}

// ─── View ───────────────────────────────────────────────────────────────────

const SHAPES = ['circle', 'square', 'diamond', 'stack'];
const esc = v => String(v).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class FlowView {
  constructor(graph) {
    this.g = graph;
    this.data = { nodes: [], links: [] };
    this.filter = null;
    this.window = null;
    this.hiddenTypes = new Set();
    this.selected = null;          // { node: id } | { link: id }
    this.labels = graph.options.linkLabels !== false;
    this.layer = graph.gZoom.append('g').attr('class', 'rc-flow');
    this.gLanes = this.layer.append('g').attr('class', 'rc-flow-lanes');
    this.gHulls = this.layer.append('g').attr('class', 'rc-flow-hulls');
    this.gLinks = this.layer.append('g').attr('class', 'rc-flow-links');
    this.gHits  = this.layer.append('g').attr('class', 'rc-flow-link-hits');
    this.gLinkLabels = this.layer.append('g').attr('class', 'rc-flow-link-labels');
    this.gNodes = this.layer.append('g').attr('class', 'rc-flow-nodes');
  }

  setData({ nodes, links }) {
    this.data = { nodes, links };
    if (this.selected && !this._exists(this.selected)) this.selected = null;
  }

  clear() {
    [this.gLanes, this.gHulls, this.gLinks, this.gHits, this.gLinkLabels, this.gNodes]
      .forEach(g => g.selectAll('*').remove());
  }

  // ── Option helpers ──
  _opt(name, fallback) { return this.g.options[name] ?? fallback; }
  _laneOf(n) {
    const by = this._opt('laneBy', 'lane');
    return typeof by === 'function' ? by(n) : n[by];
  }
  _groupCfg(n) { return (this._opt('nodeGroups', {}))[n.group] ?? null; }
  _nodeColor(n, palette) {
    if (n.color) return n.color;
    const cfg = this._groupCfg(n);
    if (cfg?.color) return cfg.color;
    const groups = Object.keys(this._opt('nodeGroups', {}));
    const i = Math.max(0, groups.indexOf(n.group));
    return palette[i % palette.length];
  }
  _shape(n) {
    const by = this._opt('shapeBy', 'kind');
    const key = typeof by === 'function' ? by(n) : n[by];
    const map = this._opt('nodeShapes', {});
    const shape = map[key] ?? key ?? 'circle';
    return shape;
  }
  _linkKey(l) {
    const by = this._opt('linkColorBy', 'type');
    const v = typeof by === 'function' ? by(l) : l[by];
    return v == null ? 'default' : String(v);
  }
  _exists(sel) {
    if (sel.node) return this.data.nodes.some(n => n.id === sel.node);
    return this.data.links.some(l => l.id === sel.link);
  }

  // ── Visibility ──
  _visible() {
    const pass = item => !this.filter || this.filter(item);
    const nodes = this.data.nodes.filter(pass);
    const keep = new Set(nodes.map(n => n.id));
    let links = this.data.links.filter(l =>
      pass(l) && keep.has(l.source) && keep.has(l.target) && !this.hiddenTypes.has(this._linkKey(l)));
    links = applyTimeWindow(links, this.window, this._opt('timeWindowMode', 'dim'));
    return { nodes, links };
  }

  // ── Render ──
  render(W, H) {
    const graph = this.g;
    const t = graph.theme;
    const o = graph.options;
    const palette = t.colors ?? ['#888'];
    const R = o.nodeRadius ?? 18;

    const { positions, lanes, top } = layoutFlow(
      { nodes: this.data.nodes, lanes: o.lanes ?? [] },
      { width: W, height: H, laneBy: o.laneBy ?? 'lane', nodeRadius: R });
    const { nodes, links } = this._visible();
    const byId = new Map(nodes.map(n => [n.id, n]));

    // Active = in the time window; a node with ties but none active fades.
    const active = links.filter(l => !l._dim);
    const live = new Set();
    active.forEach(l => { live.add(l.source); live.add(l.target); });
    const hasTies = new Set();
    links.forEach(l => { hasTies.add(l.source); hasTies.add(l.target); });
    const nodeDim = n => hasTies.has(n.id) && !live.has(n.id);

    // ── Lanes ──
    this.gLanes.selectAll('.rc-flow-lane')
      .data(lanes, l => l.id)
      .join(enter => {
        const g = enter.append('g').attr('class', 'rc-flow-lane');
        g.append('rect');
        g.append('text');
        return g;
      })
      .call(sel => sel.select('rect')
        .attr('x', l => l.x0 + 4).attr('y', 4)
        .attr('width', l => Math.max(0, l.x1 - l.x0 - 8)).attr('height', Math.max(0, H - 8))
        .attr('rx', 6)
        .attr('fill', t.surface ?? t.grid))
      .call(sel => sel.select('text')
        .attr('x', l => (l.x0 + l.x1) / 2).attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('class', 'rc-flow-lane-label')
        .text(l => l.label));

    // ── Hulls (groups drawn as a soft band through their members) ──
    const hulls = (o.hulls ?? []).map(h => {
      const members = nodes.filter(n =>
        typeof h.members === 'function' ? h.members(n) : (h.members ?? []).includes(n.id));
      const pts = members.map(n => positions.get(n.id)).filter(Boolean).sort((a, b) => a.x - b.x);
      return { ...h, pts };
    }).filter(h => h.pts.length);
    const hullColor = h => h.color ?? t.accent;
    this.gHulls.selectAll('.rc-flow-hull')
      .data(hulls, h => h.id)
      .join(enter => {
        const g = enter.append('g').attr('class', 'rc-flow-hull');
        g.append('path');
        g.append('text');
        return g;
      })
      .call(sel => sel.select('path')
        .attr('d', h => h.pts.length > 1
          ? d3.line().curve(d3.curveCatmullRom)(h.pts.map(p => [p.x, p.y]))
          : `M${h.pts[0].x},${h.pts[0].y}l0.01,0`)
        .attr('fill', 'none')
        .attr('stroke', hullColor)
        .attr('stroke-opacity', 0.12)
        .attr('stroke-width', R * 2 + 28)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .style('pointer-events', 'none'))
      .call(sel => sel.select('text')
        .attr('x', h => h.pts[0].x - R)
        // below the band (half-width R + 14) and clear of the node captions
        .attr('y', h => Math.max(...h.pts.map(p => p.y)) + R + 48)
        .attr('fill', hullColor)
        .attr('class', 'rc-flow-hull-label')
        .text(h => h.label ?? ''));

    // ── Ties ──
    const widthOf = linkWidthScale(this.data.links, {
      min: 1.6, max: 22, ...(o.linkWidth ?? {}),
    });
    const types = o.linkTypes ?? {};
    const keys = [...new Set(this.data.links.map(l => this._linkKey(l)))];
    const colorOf = l => types[this._linkKey(l)]?.color
      ?? palette[keys.indexOf(this._linkKey(l)) % palette.length];
    const dashOf = l => {
      const fromType = types[this._linkKey(l)]?.dash;
      if (fromType) return fromType;
      return o.linkDash && o.linkDash(l) ? '6 5' : null;
    };

    const markerId = key => `rc-flow-arrow-${graph._uid}-${String(key).replace(/[^\w-]/g, '_')}`;
    graph._defs.selectAll('.rc-flow-arrow').remove();
    keys.forEach(key => {
      const color = types[key]?.color ?? palette[keys.indexOf(key) % palette.length];
      graph._defs.append('marker')
        .attr('class', 'rc-flow-arrow')
        .attr('id', markerId(key))
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8).attr('refY', 5)
        .attr('markerWidth', 9).attr('markerHeight', 9)
        .attr('markerUnits', 'userSpaceOnUse')
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,0L10,5L0,10z')
        .attr('fill', color);
    });

    const par = parallelIndex(links);
    const geom = l => {
      const a = positions.get(l.source), b = positions.get(l.target);
      if (!a || !b) return null;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = a.x + ux * (R + 2), sy = a.y + uy * (R + 2);
      const tx = b.x - ux * (R + 4), ty = b.y - uy * (R + 4);
      const { index = 0, count = 1 } = par.get(l.id) ?? {};
      const flip = l.source > l.target ? -1 : 1;
      const fan = count > 1 ? (index - (count - 1) / 2) * 2 * flip : 0;
      const bend = (l.bend ?? (count > 1 ? 0 : 0.35)) + fan;
      const off = bend * Math.min(60, len * 0.18);
      const nx = -uy, ny = ux;
      const cx = (sx + tx) / 2 + nx * off, cy = (sy + ty) / 2 + ny * off;
      // Outward normal of the bow: the side a label can step towards.
      const side = off >= 0 ? 1 : -1;
      return {
        d: `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`,
        mid: { x: (sx + 2 * cx + tx) / 4, y: (sy + 2 * cy + ty) / 4 },
        out: { x: nx * side, y: ny * side },
      };
    };

    const linkSel = this.gLinks.selectAll('.rc-flow-link')
      .data(links, l => l.id)
      .join('path')
      .attr('class', 'rc-flow-link')
      .attr('fill', 'none')
      .attr('d', l => geom(l)?.d ?? '')
      .attr('stroke', colorOf)
      .attr('stroke-width', widthOf)
      .attr('stroke-dasharray', dashOf)
      .attr('stroke-linecap', 'round')
      .attr('marker-end', l => `url(#${markerId(this._linkKey(l))})`);

    const hitSel = this.gHits.selectAll('.rc-flow-link-hit')
      .data(links, l => l.id)
      .join('path')
      .attr('class', 'rc-flow-link-hit')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', l => Math.max(14, widthOf(l) + 8))
      .style('pointer-events', 'stroke')
      .style('cursor', 'pointer')
      .attr('d', l => geom(l)?.d ?? '');

    // Tie labels: active ties only. Each tries the bow's middle, then steps
    // outward along the bow's normal; a label that still collides is left to
    // the tooltip.
    const boxes = [];
    const labelAt = new Map();
    const labelled = this.labels ? links.filter(l => !l._dim && l.label != null && l.label !== '') : [];
    labelled.forEach(l => {
      const gm = geom(l);
      if (!gm) return;
      const w = String(l.label).length * 6.4 + 6, h = 13;
      const tries = [0, 14, 28, 44].map(k => [gm.out.x * k, gm.out.y * k])
        .concat([[0, -16], [0, 16], [gm.out.x * 44, gm.out.y * 44 - 16]]);
      for (const [ox, oy] of tries) {
        const x = gm.mid.x + ox, y = gm.mid.y + oy;
        const box = { x0: x - w / 2, x1: x + w / 2, y0: y - 4 - h, y1: y - 4 };
        if (boxes.some(b => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
        boxes.push(box);
        labelAt.set(l.id, { x, y });
        break;
      }
    });
    const placed = labelled.filter(l => labelAt.has(l.id));
    this.gLinkLabels.selectAll('.rc-flow-link-label')
      .data(placed, l => l.id)
      .join('text')
      .attr('class', 'rc-flow-link-label')
      .attr('x', l => labelAt.get(l.id).x)
      .attr('y', l => labelAt.get(l.id).y - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', t.muted)
      .attr('stroke', t.bg)
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .style('pointer-events', 'none')
      .text(l => l.label);

    // ── Nodes ──
    const ordered = nodes.slice().sort((a, b) => {
      const pa = positions.get(a.id), pb = positions.get(b.id);
      return (pa.x - pb.x) || (pa.y - pb.y);
    });
    const nodeSel = this.gNodes.selectAll('.rc-flow-node')
      .data(ordered, n => n.id)
      .join(enter => enter.append('g').attr('class', 'rc-flow-node'))
      .attr('transform', n => {
        const p = positions.get(n.id);
        return `translate(${p.x},${p.y})`;
      })
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', n => [n.label ?? n.id, this._groupCfg(n)?.label ?? n.group]
        .filter(Boolean).join(' — '))
      .style('cursor', 'pointer')
      .order();
    nodeSel.each((n, i, els) => {
      const g = d3.select(els[i]);
      g.selectAll('*').remove();
      const fill = this._nodeColor(n, palette);
      const shape = this._shape(n);
      const stroke = { stroke: t.bg, 'stroke-width': 2.5 };
      const add = (tag, attrs) => {
        const el = g.append(tag).attr('class', 'rc-flow-node-shape').attr('fill', fill);
        Object.entries({ ...stroke, ...attrs }).forEach(([k, v]) => el.attr(k, v));
        return el;
      };
      if (shape === 'square') add('rect', { x: -R + 1, y: -R + 1, width: 2 * R - 2, height: 2 * R - 2, rx: 6 });
      else if (shape === 'diamond') add('path', { d: `M0,${-R - 3}L${R + 3},0L0,${R + 3}L${-R - 3},0z` });
      else if (shape === 'stack') {
        add('circle', { cx: 6, cy: -5, r: R - 2, opacity: 0.55 });
        add('circle', { r: R });
      } else if (!SHAPES.includes(shape) && /^[Mm]/.test(String(shape))) add('path', { d: shape });
      else add('circle', { r: R });
      g.append('text').attr('class', 'rc-flow-node-label')
        .attr('y', R + 16).attr('text-anchor', 'middle').attr('fill', t.text)
        .attr('stroke', t.bg).attr('stroke-width', 3).attr('paint-order', 'stroke')
        .text(n.label ?? n.id);
      if (n.sub) {
        g.append('text').attr('class', 'rc-flow-node-sub')
          .attr('y', R + 30).attr('text-anchor', 'middle').attr('fill', t.muted)
          .attr('stroke', t.bg).attr('stroke-width', 3).attr('paint-order', 'stroke')
          .text(n.sub);
      }
      if (n.terminal) {
        g.append('text').attr('class', 'rc-flow-node-sub')
          .attr('x', R + 6).attr('y', -R + 4).attr('fill', t.muted).text('end');
      }
    });

    // ── State: dimming (time window) and selection ──
    const apply = () => {
      const sel = this.selected;
      let nearNodes = null, onLinks = null;
      if (sel?.node) {
        nearNodes = new Set([sel.node]);
        onLinks = new Set();
        links.forEach(l => {
          if (l.source === sel.node || l.target === sel.node) {
            onLinks.add(l.id); nearNodes.add(l.source); nearNodes.add(l.target);
          }
        });
      } else if (sel?.link) {
        const l = links.find(x => x.id === sel.link);
        if (l) { onLinks = new Set([l.id]); nearNodes = new Set([l.source, l.target]); }
      }
      linkSel
        .attr('stroke-opacity', l => {
          if (onLinks) return onLinks.has(l.id) ? 1 : 0.1;
          return l._dim ? 0.14 : 0.78;
        });
      nodeSel
        .classed('is-selected', n => sel?.node === n.id)
        .style('opacity', n => {
          if (nearNodes) return nearNodes.has(n.id) ? 1 : 0.15;
          return nodeDim(n) ? 0.2 : 1;
        });
      nodeSel.selectAll('.rc-flow-node-shape')
        .attr('stroke', function () {
          const n = d3.select(this.parentNode).datum();
          return sel?.node === n.id ? (t.accent) : t.bg;
        })
        .attr('stroke-width', function () {
          const n = d3.select(this.parentNode).datum();
          return sel?.node === n.id ? 4 : 2.5;
        });
    };
    this._apply = apply;
    apply();

    // ── Interaction ──
    const nodeById = id => byId.get(id) ?? { id };
    const select = (s, event = null) => {
      this.selected = s;
      apply();
      const cb = o.onSelect;
      if (typeof cb === 'function') {
        if (!s) cb({ node: null, link: null, event });
        else if (s.node) cb({ node: byId.get(s.node) ?? null, link: null, event });
        else cb({ node: null, link: links.find(l => l.id === s.link) ?? null, event });
      }
    };
    this._select = select;

    nodeSel
      .on('click', (event, n) => { event.stopPropagation(); select({ node: n.id }, event); })
      .on('keydown', (event, n) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select({ node: n.id }, event);
          return;
        }
        if (event.key === 'Escape') { select(null, event); return; }
        const next = this._neighborFor(n, event.key, ordered, links, positions);
        if (next) {
          event.preventDefault();
          nodeSel.filter(x => x.id === next.id).node()?.focus();
        }
      })
      .on('mouseover', (event, n) => {
        if (graph._tooltip.isPinned) return;
        const [mx, my] = d3.pointer(event, graph.container);
        const nodeLinks = links.filter(l => l.source === n.id || l.target === n.id);
        const html = o.tooltipFormat
          ? o.tooltipFormat({ node: n, links: nodeLinks })
          : this._nodeTooltip(n, nodeLinks, nodeById);
        graph._tooltip.show(mx, my, html);
      })
      .on('mouseout', () => { if (!graph._tooltip.isPinned) graph._tooltip.hide(); });

    const tieHtml = l => {
      const source = nodeById(l.source), target = nodeById(l.target);
      return o.linkTooltipFormat
        ? o.linkTooltipFormat({ link: l, source, target })
        : graph._defaultLinkTooltip(l, source, target);
    };
    hitSel
      .on('mouseover', (event, l) => {
        if (graph._tooltip.isPinned) return;
        const [mx, my] = d3.pointer(event, graph.container);
        graph._tooltip.show(mx, my, tieHtml(l));
      })
      .on('mouseout', () => { if (!graph._tooltip.isPinned) graph._tooltip.hide(); })
      .on('click', (event, l) => {
        event.stopPropagation();
        select({ link: l.id }, event);
        // Without an external details panel, the pinned tooltip is the panel.
        if (typeof o.onSelect !== 'function') {
          const [mx, my] = d3.pointer(event, graph.container);
          graph._tooltip.pin(mx, my, tieHtml(l));
        }
      });

    graph.svg.on('click.flow', () => { if (this.selected) select(null); });

    this._renderLegend(keys, colorOf, dashOf, palette);
  }

  // Arrow keys walk the trace: → first outgoing tie, ← first incoming tie,
  // ↑/↓ the previous/next node of the same lane.
  _neighborFor(n, key, ordered, links, positions) {
    if (key === 'ArrowRight') {
      const l = links.find(x => x.source === n.id);
      return l ? ordered.find(x => x.id === l.target) : null;
    }
    if (key === 'ArrowLeft') {
      const l = links.find(x => x.target === n.id);
      return l ? ordered.find(x => x.id === l.source) : null;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const lane = positions.get(n.id).lane;
      const same = ordered.filter(x => positions.get(x.id).lane === lane)
        .sort((a, b) => positions.get(a.id).y - positions.get(b.id).y);
      const i = same.findIndex(x => x.id === n.id);
      return same[i + (key === 'ArrowDown' ? 1 : -1)] ?? null;
    }
    return null;
  }

  _nodeTooltip(n, nodeLinks, nodeById) {
    const t = this.g.theme;
    const ins = nodeLinks.filter(l => l.target === n.id);
    const outs = nodeLinks.filter(l => l.source === n.id);
    const group = this._groupCfg(n)?.label ?? n.group;
    return `<div style="max-width:280px">
      <div style="font-weight:bold;margin-bottom:2px">${esc(n.label ?? n.id)}</div>
      ${group ? `<div style="color:${t.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em">${esc(group)}</div>` : ''}
      ${n.sub ? `<div style="color:${t.muted};font-size:11px">${esc(n.sub)}</div>` : ''}
      <div style="color:${t.muted};font-size:11px;margin-top:4px">${ins.length} in · ${outs.length} out</div>
    </div>`;
  }

  // Legend: node groups (dots) and tie categories (lines). Clicking a tie
  // category hides/shows it; positions stay put.
  _renderLegend(keys, colorOf, dashOf, palette) {
    const el = this.g._legendEl;
    if (!el) return;
    const o = this.g.options;
    el.replaceChildren();
    const groups = o.nodeGroups ?? {};
    Object.entries(groups).forEach(([key, cfg], i) => {
      const item = document.createElement('span');
      item.className = 'rc-legend-item rc-flow-legend-group';
      item.innerHTML = `<svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="${cfg.color ?? palette[i % palette.length]}"/></svg><span></span>`;
      item.querySelector('span').textContent = cfg.label ?? key;
      el.appendChild(item);
    });
    const types = o.linkTypes ?? {};
    keys.forEach(key => {
      const sample = this.data.links.find(l => this._linkKey(l) === key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rc-legend-item rc-graph-legend-item';
      const off = this.hiddenTypes.has(key);
      button.setAttribute('aria-pressed', String(!off));
      button.style.opacity = off ? '0.35' : '1';
      // the category's own style — not one tie's (a derived first tie would
      // make the whole category look dashed)
      const dash = types[key]?.dash ?? '';
      button.innerHTML = `<svg width="22" height="12" aria-hidden="true"><line x1="1" y1="6" x2="21" y2="6" stroke="${colorOf(sample)}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''}/></svg><span></span>`;
      button.querySelector('span').textContent = types[key]?.label ?? key;
      button.addEventListener('click', () => {
        if (this.hiddenTypes.has(key)) this.hiddenTypes.delete(key);
        else this.hiddenTypes.add(key);
        this.g.render();
      });
      el.appendChild(button);
    });
  }
}

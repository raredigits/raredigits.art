// RareCharts — graph/views/network.js
// Graph's ego / path / cluster views: from the measured drawing area to
// the drawing — the ego capacity cap, the three layouts
// (graph/layouts/ego.js, path.js, cluster.js), then ties, +N badges, hit
// targets, nodes, dragging, the hover/focus highlight, keyboard roving,
// sector and row captions. The flow view lives in ./flow.js.
//
// Methods of Graph (charts/Graph.js mixes them into its prototype; split
// out of Graph.js in 0.9.8_6, D-11, code unchanged): `this` is the chart.

import * as d3 from 'd3';
import { fitTextNode } from '../../core/renderHelpers.js';
import { motionDuration } from '../../core/utils.js';
import { dedupeUndirected, parallelIndex, pairKey } from '../../core/links.js';
import { rovingTabindex, holdsFocus, gridStep } from '../roving.js';
import { egoLayout, egoCapacity } from '../layouts/ego.js';
import { pathLayout }    from '../layouts/path.js';
import { clusterLayout } from '../layouts/cluster.js';

export const networkView = {
  // ego / path / cluster: render() hands over the measured drawing area
  // (the flow view draws through FlowView.render instead).
  _renderNetwork(W, H) {
    // Ego view: drop user-hidden nodes (they stay in the model), then cap to
    // what this canvas can hold legibly. Path and cluster views are small by
    // construction — and a route through a hidden node still has to show it.
    let data = this._viewData;
    if (this._view === 'ego') {
      const visible = data.nodes.filter(n =>
        n.id === this._root || (!n.hidden && !this._hidden.has(n.id)));
      if (visible.length !== data.nodes.length) {
        const keep = new Set(visible.map(n => n.id));
        data = {
          nodes: visible,
          links: data.links.filter(l => keep.has(l.source) && keep.has(l.target)),
        };
      }
      data = this._trimToCapacity(data, W, H);
    }
    this._shown = data;
    if (this._view !== 'ego') this._overflowNodes = [];

    let positions, sectors = null;
    if (this._view === 'ego') {
      const res = egoLayout(this._shown, {
        rootId: this._root, width: W, height: H,
        nodeRadius: this.options.nodeRadius ?? 22,
        sectorLabels: this.options.sectorLabels === true,
        groupBy: this.options.groupBy ?? 'group',
      });
      positions = res.positions;
      sectors = res.sectors;
      this._egoCellW = res.cellW;
    } else if (this._view === 'path') {
      // labels stay inside the drawing at its left and right ends (C-36)
      const half = this._labelHalfWidths(this._shown.nodes);
      const res = pathLayout(
        { paths: this._paths ?? [], context: this._ctxIds },
        { width: W, height: H, labelHalf: id => half.get(id) ?? 0 });
      positions = res.positions;
      this._rows = res.rows;
    } else {
      positions = clusterLayout(this._shown, {
        width: W, height: H, nodeRadius: this.options.nodeRadius ?? 22,
      });
    }

    // Hand-dragged positions survive re-renders until the next view change
    this._manual.forEach((p, id) => {
      const cur = positions.get(id);
      if (cur) positions.set(id, { ...cur, x: p.x, y: p.y });
    });

    this._labelRoom = this._view === 'ego' ? this._egoCellW - 6 : null;
    this._draw(positions, W, H, sectors);
  },

  // ego / path / cluster with nothing to show (setData with an empty
  // payload): no nodes, ties, captions, legend or notes of the previous
  // data, and the details panel back to its hint (R-17).
  _clearDrawing() {
    [this.gSectors, this.gLinks, this.gLinkHits, this.gLinkBadges, this.gNodes]
      .forEach(g => g?.selectAll('*').remove());
    this.gRoot.selectAll('.rc-graph-row-label').remove();
    this._defs.selectAll('.rc-arrow').remove();
    this._legendEl?.replaceChildren();
    if (this._tooltip?.isPinned) this._tooltip.unpin();
    this._tooltip?.hide?.();
    this._root = null;
    this._paths = null;
    this._ctxIds = null;
    this._shortestKeys = null;
    this._rows = null;
    this._anchors = new Set();
    this._viewData = null;
    this._shown = null;
    this._hiddenCount = 0;
    this._overflowNodes = [];
    if (this._overflowNoteEl) this._overflowNoteEl.hidden = true;
    if (this._hiddenNoteEl) this._hiddenNoteEl.hidden = true;
    this._renderOverflow();
    this._detailsSubject = null;
    this._refreshDetails();
  },

  // Half the drawn width of each node's label, its backdrop included:
  // measured with the label's own font where the browser can measure,
  // estimated from the length where it cannot (C-36).
  _labelHalfWidths(nodes) {
    const out = new Map();
    const probe = this.gNodes.append('text')
      .attr('class', 'rc-graph-node-label')
      .style('visibility', 'hidden');
    const el = probe.node();
    nodes.forEach(n => {
      const text = String(n.label ?? n.id);
      el.textContent = text;
      let w = 0;
      try { w = el.getComputedTextLength?.() ?? 0; } catch { w = 0; }
      out.set(n.id, (w > 0 ? w : text.length * 6.2) / 2 + 3);
    });
    probe.remove();
    return out;
  },

  // How many nodes fit: one per comfortable grid cell (~96×74 px with the
  // label), minus the root's. Keeps first-ring and best-connected nodes;
  // the rest stay in the model and reappear on recenter or a larger canvas.
  _trimToCapacity(data, W, H) {
    const o = this.options;
    const max = (o.maxNodes == null || o.maxNodes === 'auto')
      ? Math.max(12, egoCapacity(W, H, o.nodeRadius ?? 22))
      : o.maxNodes;
    if (data.nodes.length <= max) {
      this._hiddenCount = 0;
      this._overflowNodes = [];
      return data;
    }
    const ranked = data.nodes.slice().sort((a, b) =>
      ((a.depth ?? 0) - (b.depth ?? 0))
      || (this._model.degree(b.id) - this._model.degree(a.id))
      || String(a.label ?? a.id).localeCompare(String(b.label ?? b.id)));
    const nodes = ranked.slice(0, max);
    this._overflowNodes = ranked.slice(max);
    const keep = new Set(nodes.map(n => n.id));
    this._hiddenCount = data.nodes.length - nodes.length;
    return {
      nodes,
      links: data.links.filter(l => keep.has(l.source) && keep.has(l.target)),
    };
  },

  _draw(positions, W, H, sectors = null) {
    const t = this.theme;
    const o = this.options;
    const { nodes, links: viewLinks } = this._shown ?? this._viewData;
    // A redraw invalidates a pinned tie's highlight and anchor point.
    if (this._tooltip?.isPinned) this._tooltip.unpin();

    // ── Ties (A2) ──
    // These views ignore direction: the same tie listed both ways collapses.
    // Different types between one pair are parallel ties and fan out as arcs;
    // past MAX_PARALLEL one line stands for the pair with a +N badge, and its
    // tooltip lists them all.
    const MAX_PARALLEL = 3;
    const allTies = dedupeUndirected(viewLinks.map(l =>
      l.id != null ? l : { ...l, id: pairKey(l.source, l.target) }));
    const byPair = new Map();
    allTies.forEach(l => {
      const k = pairKey(l.source, l.target);
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k).push(l);
    });
    const links = [];
    byPair.forEach(group => {
      if (group.length <= MAX_PARALLEL) links.push(...group);
      else links.push({ ...group[0], _siblings: group });
    });
    const par = parallelIndex(links);
    const baseR = o.nodeRadius ?? 22;
    // Uniform node size by default — size is not an encoding channel unless
    // asked for: sizeBy 'degree' computes it from connectivity, 'field' reads
    // the per-node `size` value. Meta-nodes (cluster view) always keep their
    // community-size multiplier: there it carries real information.
    const sizeOf = n => {
      if (n?._ctx) return 0.7;   // endpoint-context nodes stay in the background
      if (n?._size != null) return Math.min(3, Math.max(0.6, n?.size ?? 1));
      if (o.sizeBy === 'degree') {
        return 0.8 + Math.min(1.6, Math.sqrt(this._model.degree(n?.id)) * 0.35);
      }
      if (o.sizeBy === 'field') return Math.min(3, Math.max(0.6, n?.size ?? 1));
      return 1;
    };
    const nodeR = n => baseR * sizeOf(n);
    const byId  = new Map(nodes.map(n => [n.id, n]));
    const dur   = this._hasRendered ? motionDuration(o.duration ?? 500) : 0;

    // Monochrome nodes: color stays on the links only. Anchors (the ego
    // center, path endpoints) invert to a filled dark circle so the eye finds
    // the reference points; per-node `color` remains an explicit override.
    const anchors = this._anchors ?? new Set();
    const isDark  = d => anchors.has(d.id) || !!d.color;
    const fillOf  = d => d.color ?? (anchors.has(d.id) ? t.text : (t.surface ?? t.bg));
    const strokeOf = d => anchors.has(d.id) ? t.text : (t.border ?? t.muted);

    // ── Arrow markers (one per link type present in the view) ──
    const typesInUse = Array.from(new Set(allTies.map(l => l.type ?? 'default')));
    // known before anything is styled — context ties of the path view bring
    // types no query result listed, and their colour must not change on the
    // next render
    typesInUse.forEach(type => this._knownTypes.add(String(type)));
    // ids by position: a category name may hold characters an id cannot
    // (Cyrillic, spaces), and two names must never share one marker; the
    // chart's uid keeps two graphs on a page apart (C-04)
    const markerId = type => `${this._uid}-arrow-${typesInUse.indexOf(type)}`;
    this._defs.selectAll('.rc-arrow').remove();
    typesInUse.forEach(type => {
      const cfg = this._typeInfo(type);
      // Open chevron, stroked not filled — quieter than a solid triangle
      this._defs.append('marker')
        .attr('id',           markerId(type))
        .attr('class',        'rc-arrow')
        .attr('viewBox',      '0 -3 7 6')
        .attr('refX',         6)
        .attr('refY',         0)
        .attr('markerWidth',  5)
        .attr('markerHeight', 5)
        .attr('orient',       'auto')
        .append('path')
        .attr('d',              'M0,-2.5L6,0L0,2.5')
        .attr('fill',           'none')
        .attr('stroke',         cfg.color)
        .attr('stroke-width',   1.2)
        .attr('stroke-linecap', 'round');
    });

    // ── Link geometry ──
    // In the ego (grid) view every link gets a gentle uniform bow: cell
    // centers are collinear, so a straight line would run exactly through
    // the nodes sitting between its endpoints. Path/cluster links connect
    // adjacent columns or a sparse circle — straight is fine there.
    //
    // Parallel ties of a pair fan out symmetrically around that base. The
    // offset is measured on the pair's canonical normal (lower id → higher),
    // so A→B and B→A ties of one pair land on opposite sides, never on top
    // of each other.
    const linkGeom = d => {
      const s = positions.get(d.source);
      const e = positions.get(d.target);
      if (!s || !e) return null;
      const rT = nodeR(byId.get(d.target)) + 6;
      const dx = e.x - s.x, dy = e.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const ex = e.x - (dx / len) * rT;
      const ey = e.y - (dy / len) * rT;
      const { index = 0, count = 1 } = par.get(d.id) ?? {};
      // Grid views (ego, cluster): cell centres are collinear, so ties bow
      // gently instead of running straight through the nodes between them.
      const base = this._view !== 'path' && len >= 40 ? Math.min(26, len * 0.08) : 0;
      const flip = d.source > d.target ? -1 : 1;
      const fan = count > 1 ? (index - (count - 1) / 2) * 16 * flip : 0;
      const bow = base + fan;
      const nx = -dy / len, ny = dx / len;   // fixed-handedness unit normal
      const cx = (s.x + ex) / 2 + nx * bow;
      const cy = (s.y + ey) / 2 + ny * bow;
      // The path starts at the source center (under the node); the visible
      // stretch begins at the source rim. Its middle anchors the +N badge.
      const rS = nodeR(byId.get(d.source));
      const vx = s.x + (dx / len) * rS, vy = s.y + (dy / len) * rS;
      const mid = { x: (vx + ex) / 2 + nx * bow * 0.5, y: (vy + ey) / 2 + ny * bow * 0.5 };
      return { s, e: { x: ex, y: ey }, c: { x: cx, y: cy }, mid, curved: bow !== 0 };
    };
    const linkD = d => {
      const g = linkGeom(d);
      if (!g) return '';
      return g.curved
        ? `M${g.s.x},${g.s.y}Q${g.c.x},${g.c.y} ${g.e.x},${g.e.y}`
        : `M${g.s.x},${g.s.y}L${g.e.x},${g.e.y}`;
    };

    // Route emphasis in the path view is per pair, whatever ties it carries.
    const linkKey = d => pairKey(d.source, d.target);

    // ── Links ──
    const linkSel = this.gLinks.selectAll('.rc-graph-link')
      .data(links, d => d.id)
      .join(
        enter => enter.append('path')
          .attr('class', 'rc-graph-link')
          .attr('fill', 'none')
          .attr('d', linkD)
          .attr('stroke-opacity', 0),
        update => update,
        exit => exit.remove()
      )
      .attr('stroke',           d => this._typeInfo(d.type).color)
      .attr('stroke-width',     d => {
        // weight first, as the layout, the tooltip and the model read it;
        // `strength` is the legacy alias
        const w = Math.max(0.75, 1.4 * (d.weight ?? d.strength ?? 0.5));
        return this._shortestKeys?.has(linkKey(d)) ? Math.max(2, w * 1.6) : w;
      })
      .attr('stroke-dasharray', d => this._typeInfo(d.type).dash)
      .attr('marker-end',       d => `url(#${markerId(d.type ?? 'default')})`);

    // Path view is layered: context ties whisper, alternative routes speak,
    // the shortest route carries the message.
    const linkOpacity = l => {
      if (l._ctx) return 0.25;
      if (this._view === 'path' && this._shortestKeys) {
        return this._shortestKeys.has(linkKey(l)) ? 0.95 : 0.4;
      }
      return 0.7;
    };
    this._linkOpacity = linkOpacity;

    (dur ? linkSel.transition().duration(dur) : linkSel)
      .attr('d', linkD)
      .attr('stroke-opacity', linkOpacity);

    // +N badge on a pair that carries more ties than MAX_PARALLEL
    const badgeSel = this.gLinkBadges.selectAll('.rc-graph-link-more')
      .data(links.filter(l => l._siblings), d => d.id)
      .join('text')
      .attr('class',             'rc-graph-link-more')
      .attr('text-anchor',       'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill',              t.text)
      .attr('stroke',            t.bg)          // halo keeps it legible over lines/labels
      .attr('stroke-width',      3)
      .attr('paint-order',       'stroke')
      .style('pointer-events',   'none')
      .text(d => `+${d._siblings.length - 1}`);
    // A badge takes the first spot along its tie (or just beside it) that
    // covers no node and no node label; the visible middle is the fallback.
    const nodeBoxes = () => nodes.map(n => {
      const p = positions.get(n.id);
      if (!p) return null;
      const r = nodeR(n);
      const w = Math.max(2 * r, String(n.label ?? n.id).length * 6.2);
      return [
        { x0: p.x - r, x1: p.x + r, y0: p.y - r, y1: p.y + r },
        { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + r + 3, y1: p.y + r + 19 },
      ];
    }).filter(Boolean).flat();
    const badgeAt = (d, obstacles) => {
      const g = linkGeom(d);
      if (!g) return { x: 0, y: 0 };
      const q = tt => ({
        x: (1 - tt) ** 2 * g.s.x + 2 * (1 - tt) * tt * g.c.x + tt ** 2 * g.e.x,
        y: (1 - tt) ** 2 * g.s.y + 2 * (1 - tt) * tt * g.c.y + tt ** 2 * g.e.y,
      });
      const dx = g.e.x - g.s.x, dy = g.e.y - g.s.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const half = 9;
      for (const tt of [0.5, 0.4, 0.6, 0.3, 0.7]) {
        for (const off of [0, 12, -12]) {
          const p = q(tt);
          const x = p.x + nx * off, y = p.y + ny * off;
          const hit = obstacles.some(b => x + half > b.x0 && x - half < b.x1 && y + 7 > b.y0 && y - 7 < b.y1);
          if (!hit) return { x, y };
        }
      }
      return g.mid;
    };
    const placeBadges = sel => {
      const obstacles = nodeBoxes();
      sel.each(function (d) {
        const p = badgeAt(d, obstacles);
        d3.select(this).attr('x', p.x).attr('y', p.y);
      });
    };
    placeBadges(badgeSel);

    // ── Tie hit targets (A3): hover = tooltip, click = pin it ──
    const hitSel = this.gLinkHits.selectAll('.rc-graph-link-hit')
      .data(links, d => d.id)
      .join('path')
      .attr('class',          'rc-graph-link-hit')
      .attr('fill',           'none')
      .attr('stroke',         'transparent')
      .attr('stroke-width',   12)
      .style('pointer-events', 'stroke')
      .style('cursor',        'pointer')
      .attr('d', linkD);

    const tieHtml = d => {
      const source = this._model.node(d.source) ?? { id: d.source };
      const target = this._model.node(d.target) ?? { id: d.target };
      return o.linkTooltipFormat
        ? o.linkTooltipFormat({ link: d, source, target })
        : this._defaultLinkTooltip(d, source, target);
    };
    hitSel
      .on('mouseover', (event, d) => {
        if (this._tooltip.isPinned) return;
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, tieHtml(d));
        this._highlightTie(d, nodeSel, linkSel);
      })
      .on('mouseout', () => {
        if (this._tooltip.isPinned) return;
        this._tooltip.hide();
        this._highlight(null, nodeSel, linkSel);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        const [mx, my] = d3.pointer(event, this.container);
        this._highlightTie(d, nodeSel, linkSel);
        this._showDetails({ link: d });
        this._tooltip.pin(mx, my, tieHtml(d), {
          onClose: () => { this._highlight(null, nodeSel, linkSel); this._showDetails(null); },
        });
      });

    this._redrawTies = id => {
      const touches = l => l.source === id || l.target === id;
      linkSel.filter(touches).attr('d', linkD);
      hitSel.filter(touches).attr('d', linkD);
      placeBadges(badgeSel.filter(touches));
    };

    // ── Node groups (circle + label) ──
    // Keyboard focus is read before the join: removing the focused node
    // fires blur, which would clear the pointer flag (see Keyboard below).
    const keyFocus = holdsFocus(this.gNodes.node()) && !this._pointerFocus;
    const nodeSel = this.gNodes.selectAll('.rc-graph-node')
      .data(nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'rc-graph-node')
            .attr('transform', d => {
              const p = positions.get(d.id);
              return p ? `translate(${p.x},${p.y})` : null;
            })
            .style('opacity', 0)
            .style('cursor', 'pointer');

          g.append('circle')
            .attr('class', 'rc-graph-node-ring')
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('opacity', 0);

          g.append('circle')
            .attr('class',  'rc-graph-node-circle')
            .attr('stroke-width', 1.5);

          g.filter(d => !d.image && !!this._nodeIcons?.[d.group])
            .append('path')
            .attr('class',           'rc-graph-node-icon')
            .style('pointer-events', 'none');

          g.filter(d => !!d.image)
            .append('image')
            .attr('class',           'rc-graph-node-image')
            .attr('href',            d => d.image)
            .attr('x',               d => -nodeR(d) + 2)
            .attr('y',               d => -nodeR(d) + 2)
            .attr('width',           d => (nodeR(d) - 2) * 2)
            .attr('height',          d => (nodeR(d) - 2) * 2)
            .attr('clip-path',       d => `circle(${nodeR(d) - 2}px at center)`)
            .style('pointer-events', 'none');

          g.append('rect')
            .attr('class',           'rc-graph-node-label-bg')
            .attr('rx',              3)
            .attr('fill',            t.bg ?? '#ffffff')
            .attr('opacity',         0.75)
            .style('pointer-events', 'none');

          g.append('text')
            .attr('class',            'rc-graph-node-label')
            .attr('text-anchor',      'middle')
            .attr('dominant-baseline','hanging')
            .attr('fill',             t.text)
            .style('pointer-events',  'none')
            .style('user-select',     'none');

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    // Per-draw attributes (sizes/labels may change between views)
    nodeSel.select('.rc-graph-node-ring').attr('r', d => nodeR(d) + 4);
    nodeSel.select('.rc-graph-node-circle')
      .attr('r',      d => nodeR(d))
      .attr('fill',   fillOf)
      .attr('stroke', strokeOf);
    // Ego grid: a label may not run into the next cell — cut it to the cell
    // width; the full name stays in the tooltip and the accessible name.
    const room = this._labelRoom;
    // A recenter moves nodes out from under the pointer, so their mouseout
    // never fires: clear hover rings on every draw.
    nodeSel.select('.rc-graph-node-ring').attr('opacity', 0);
    nodeSel.select('.rc-graph-node-label')
      .attr('y', d => nodeR(d) + 5)
      .each(function (d) {
        const full = d.label ?? d.id;
        if (room) fitTextNode(this, full, room);
        else this.textContent = full;
      });
    // Icon glyph: 24×24 path scaled to ~62% of the node diameter, centered.
    // Monochrome: dark on light circles, inverted on anchor/colored nodes.
    nodeSel.select('.rc-graph-node-icon')
      .attr('d',    d => this._nodeIcons?.[d.group] ?? null)
      .attr('fill', d => isDark(d) ? (t.bg ?? '#ffffff') : t.text)
      .attr('transform', d => {
        const s = (nodeR(d) * 1.24) / 24;
        return `translate(${-12 * s},${-12 * s}) scale(${s})`;
      });

    // Size the label backdrop to the text bounding box
    nodeSel.each(function () {
      const grp = d3.select(this);
      const tEl = grp.select('.rc-graph-node-label').node();
      if (!tEl) return;
      const bbox = tEl.getBBox ? tEl.getBBox() : { x: 0, y: 0, width: 0, height: 0 };
      const padX = 3, padY = 1;
      grp.select('.rc-graph-node-label-bg')
        .attr('x',      bbox.x - padX)
        .attr('y',      bbox.y - padY)
        .attr('width',  bbox.width  + padX * 2)
        .attr('height', bbox.height + padY * 2);
    });

    // Shared nodes travel to their new position; new nodes fade in place —
    // the identity-preserving move that keeps the user oriented on recenter.
    (dur ? nodeSel.transition().duration(dur) : nodeSel)
      .attr('transform', d => {
        const p = positions.get(d.id);
        return p ? `translate(${p.x},${p.y})` : null;
      })
      .style('opacity', d => d._ctx ? 0.55 : 1);

    // ── Node dragging: no simulation to wake — move the node, redraw its
    // links, remember the spot until the next view change ──
    if (o.draggable !== false) {
      nodeSel.call(this._dragBehavior(positions));
    }

    // ── Hover (and keyboard focus): tooltip + focus-and-context highlight ──
    const showNode = (d, x, y) => {
      if (this._tooltip.isPinned) return;   // a pinned tie keeps the stage
      this._showDetails({ node: d });
      const nodeLinks = allTies.filter(l => l.source === d.id || l.target === d.id);
      const html = o.tooltipFormat
        ? o.tooltipFormat({ node: d, links: nodeLinks })
        : this._defaultTooltip(d, nodeLinks);
      this._tooltip.show(x, y, html);
      this._highlight(d, nodeSel, linkSel);
    };
    const leaveNode = () => {
      if (this._tooltip.isPinned) return;
      this._tooltip.hide();
      this._highlight(null, nodeSel, linkSel);
      this._showDetails(null);
    };
    const showFocused = d => {
      const p = positions.get(d.id);
      if (p) showNode(d, ...this._toCard(p.x, p.y));
    };
    nodeSel
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('stroke', t.accent)
          .attr('opacity', 0.5);
        showNode(d, ...d3.pointer(event, this.container));
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('opacity', 0);
        leaveNode();
      });

    // ── Right-click: hide the node (ego view; the center is exempt) ──
    nodeSel.on('contextmenu', (event, d) => {
      if (this._view !== 'ego' || d.id === this._root) return;
      event.preventDefault();
      this.hide(d.id);
    });

    // ── Click: recenter (default), a custom handler, or nothing ──
    // Only an absent option means the default: null (as documented) and
    // false turn the click off.
    const handler = o.onNodeClick === undefined ? 'recenter' : o.onNodeClick;
    const activate = (event, d) => {
      if (typeof handler === 'function') { this._emit(handler, { node: d, event }); return; }
      if (handler !== 'recenter') return;
      if (this._view === 'cluster' && d._top) this.focus(d._top);
      else if (!(this._view === 'ego' && d.id === this._root)) this.focus(d.id);
    };
    nodeSel.on('click', (event, d) => {
      event.stopPropagation();
      activate(event, d);
    });

    // ── Keyboard (K-20): the nodes share one Tab stop (roving tabindex) —
    // the ego centre, the path's first endpoint or the node focused last.
    // Arrows move between nodes (graph/roving.js gridStep), Enter or Space
    // acts as a click, Escape clears the tooltip and the highlight. Focus
    // shows what hover shows.
    nodeSel
      .attr('role', typeof handler === 'function' || handler === 'recenter' ? 'button' : 'img')
      .attr('aria-label', d => this._nodeAriaLabel(d, allTies, anchors));
    const stop = rovingTabindex(nodeSel, {
      state: this._nodeRoving,
      preferred: this._view === 'ego' ? this._root : this._view === 'path' ? this._paths?.[0]?.[0] ?? null : null,
    });
    // A node a pointer pressed takes focus too: hover already handles it.
    nodeSel
      .on('pointerdown.tip', () => { this._pointerFocus = true; })
      .on('focus.tip', (event, d) => { if (!this._pointerFocus && !this._destroyed) showFocused(d); })
      .on('blur.tip', event => {
        if (!event.target.isConnected || this._destroyed) return;   // removed by a redraw / destroy()
        if (!this._pointerFocus) leaveNode();
        this._pointerFocus = false;
      })
      .on('keydown', (event, d) => {
        this._pointerFocus = false;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(event, d);
          return;
        }
        if (event.key === 'Escape') {
          if (this._tooltip.isPinned) this._tooltip.unpin();
          this._tooltip.hide();
          this._highlight(null, nodeSel, linkSel);
          this._showDetails(null);
          return;
        }
        const next = gridStep(nodes, d, event.key, n => positions.get(n.id));
        if (next) {
          event.preventDefault();
          stop.focus(next.id);
        }
      });
    // A redraw that removed the node keyboard focus was on (a view change)
    // hands focus to the new Tab stop; a node still focused from the
    // keyboard shows its tooltip where it now stands.
    const focusedEl = typeof document !== 'undefined' ? document.activeElement : null;
    if (!focusedEl || !nodeSel.nodes().includes(focusedEl)) {
      this._pointerFocus = false;
      if (keyFocus) stop.focus(this._nodeRoving.current);
    } else if (!this._pointerFocus) {
      showFocused(focusedEl.__data__);
    }

    // ── Sector captions (ego view, opt-in): name the category corners ──
    const showSectors = o.sectorLabels === true && (sectors?.length ?? 0) > 1;
    this.gSectors.selectAll('.rc-graph-sector-label')
      .data(showSectors ? sectors : [], d => d.key)
      .join('text')
      .attr('class',             'rc-graph-sector-label')
      .attr('x',                 d => d.x)
      .attr('y',                 d => d.y)
      .attr('text-anchor',       d => Math.cos(d.angle) > 0.35 ? 'start'
                                    : Math.cos(d.angle) < -0.35 ? 'end' : 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill',              t.muted)
      .style('pointer-events',   'none')
      .text(d => d.key);

    // ── Capacity note: how much of the neighborhood is not shown ──
    // (a footer button; it opens the list of hidden nodes)
    if (this._overflowNoteEl) {
      const n = this._view === 'ego' ? this._hiddenCount : 0;
      this._overflowNoteEl.hidden = !n;
      this._overflowNoteEl.textContent = n ? `+${n} more` : '';
      this._overflowNoteEl.title = n
        ? `${n} more node${n === 1 ? '' : 's'} did not fit — open full screen, or pick one to recenter on it`
        : '';
    }
    this._renderOverflow();

    // ── Path-view row captions: hop counts, shortest called out ──
    const rowLabels = this._view === 'path' && this._rows?.length ? this._rows : [];
    this.gRoot.selectAll('.rc-graph-row-label')
      .data(rowLabels, (d, i) => i)
      .join('text')
      .attr('class',        'rc-graph-row-label')
      // On the route, above its first intermediate node (or the middle of a
      // direct tie) — the left edge belongs to the endpoint's context fan.
      .attr('x',            d => d.x ?? 8)
      .attr('y',            d => d.direct ? d.y - 10 : d.y - (o.nodeRadius ?? 22) - 8)
      .attr('text-anchor',  d => d.x != null ? 'middle' : 'start')
      .attr('fill',         t.muted)
      .text(d => `${d.hops} hop${d.hops !== 1 ? 's' : ''}${d.shortest ? ' · shortest' : ''}`);

    // ── Hidden-nodes control: the way back from right-click hiding ──
    if (this._hiddenNoteEl) {
      const n = this._view === 'ego' ? this._hidden.size : 0;
      this._hiddenNoteEl.hidden = !n;
      this._hiddenNoteEl.textContent = n ? `${n} hidden · restore` : '';
    }

    // ── Legend (link types; meta-links in cluster view carry no types) ──
    if (this._view === 'cluster') this._legendEl.innerHTML = '';
    else this._renderLegend(typesInUse, t);
  },

  // The accessible name of a node: its label, group and number of ties, and
  // whether it is the centre or an endpoint of the view (K-20).
  _nodeAriaLabel(d, ties, anchors) {
    const name = String(d.label ?? d.id);
    if (d._size != null) return `${name} — community of ${d._size} node${d._size === 1 ? '' : 's'}`;
    const n = ties.filter(l => l.source === d.id || l.target === d.id).length;
    const role = anchors.has(d.id) ? (this._view === 'ego' ? 'center' : 'endpoint') : null;
    return [name, d.group, `${n} connection${n === 1 ? '' : 's'}`, role].filter(Boolean).join(' — ');
  },

  // ─── Node dragging ────────────────────────────────────────────────────────

  _dragBehavior(positions) {
    const self = this;
    // `this` inside d3 listeners = the dragged <g> element. Never derive the
    // element from sourceEvent.target: on mousemove that is whatever sits
    // under the cursor, not the node being dragged.
    // The drag subject is the node's current position: event.x/y are that
    // position plus the pointer's movement. Without it d3 used the bare
    // datum (no x/y) and a click with a tremor threw the node across the
    // canvas — even off it. Movement under 6 px is a click, not a drag.
    const SLOP = 6;
    return d3.drag()
      .clickDistance(5)   // small jitter still counts as a click
      .subject((event, d) => {
        const p = positions.get(d.id) ?? { x: 0, y: 0 };
        return { x: p.x, y: p.y, x0: p.x, y0: p.y };
      })
      .on('start', function () {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event, d) {
        const p = positions.get(d.id);
        if (!p) return;
        const s = event.subject;
        if (!s.moved && Math.hypot(event.x - s.x0, event.y - s.y0) < SLOP) return;
        s.moved = true;
        p.x = event.x;
        p.y = event.y;
        self._manual.set(d.id, { x: event.x, y: event.y });
        d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
        self._redrawTies?.(d.id);
      })
      .on('end', function () {
        d3.select(this).style('cursor', 'pointer');
      });
  },

  // ─── Focus + context: highlight the hovered neighborhood, fade the rest ────

  // Node fades go through the `opacity` *style*: the enter/update transition
  // sets that style, and a style beats the presentation attribute — fading
  // via attr('opacity') silently did nothing.
  _highlight(node, nodeSel, linkSel) {
    if (!node) {
      nodeSel.style('opacity', d => d._ctx ? 0.55 : 1);
      linkSel.attr('stroke-opacity', l => this._linkOpacity?.(l) ?? 0.7);
      return;
    }
    const near = new Set([node.id]);
    (this._shown ?? this._viewData).links.forEach(l => {
      if (l.source === node.id) near.add(l.target);
      if (l.target === node.id) near.add(l.source);
    });
    nodeSel.style('opacity', d => near.has(d.id) ? 1 : 0.25);
    linkSel.attr('stroke-opacity', l =>
      (l.source === node.id || l.target === node.id) ? 1 : 0.08);
  },

  // A single tie: it and its two endpoints stay, everything else fades.
  _highlightTie(tie, nodeSel, linkSel) {
    nodeSel.style('opacity', d => (d.id === tie.source || d.id === tie.target) ? 1 : 0.25);
    linkSel.attr('stroke-opacity', l => l.id === tie.id ? 1 : 0.08);
  },
};

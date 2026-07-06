// RareCharts — Graph (experimental)
// Network viewport over a headless graph model. Three deterministic views
// instead of a force simulation:
//
//   ego     — rings by degree of separation around a focused node,
//             angular sectors by relation type (graph/layouts/ego.js)
//   path    — layered "how are A and B connected" routes (layouts/path.js)
//   cluster — communities collapsed into meta-nodes (layouts/cluster.js)
//
// Data arrives through a source adapter (graph/source.js contract):
//   { neighbors(id, {depth, types}), paths(a, b, {k}), aggregates() }
// memorySource(data) adapts a static { nodes, links } payload; a real backend
// implements the same contract server-side. Everything the user "walks"
// accumulates in a client-side GraphModel, so revisits don't refetch.
//
// Data format:
//   nodes: [{ id, label, group?, size?, color?, image? }, ...]
//   links: [{ source, target, type?, weight?, strength?, label? }, ...]
//
// Options:
//   view          — initial view: 'ego' | 'path' | 'cluster' (default: 'ego')
//   dataSource    — source adapter (or use setData() for static payloads);
//                   `source` remains the footer attribution, as on every chart
//   depth         — ego neighborhood depth (default: 2)
//   groupBy       — ego sectors: 'group' (node group, default) | 'type'
//                   (relation type of the first-ring ancestor)
//   sectorLabels  — caption the ego category corners (default: false)
//   hiddenNodes   — ids to keep out of the ego view (see also hide()/show()
//                   and the per-node `hidden` data field); they stay in the
//                   model, and the path view still draws routes through them
//   onNodeClick   — 'recenter' (default) | fn({ node, event }) | null
//   pathCount     — max routes for connect() (default: 3)
//   pathContext   — fan the endpoints' other connections behind them in the
//                   path view, faded (default: true)
//   pathContextCount — max context ties per endpoint (default: 8)
//   semanticZoom  — zooming out of ego switches to cluster view (default: true)
//   height        — px (default: 520)
//   maxNodes      — cap on rendered ego nodes: 'auto' (from canvas size,
//                   default) or a number; hidden count is noted on-chart
//   draggable     — nodes can be hand-dragged; positions persist until the
//                   next view change (default: true)
//   nodeRadius    — base radius px (default: 22)
//   nodeIcons     — { group: svgPath } merged over built-ins (graph/icons.js);
//                   false renders plain circles
//   sizeBy        — node size channel: uniform by default; 'degree' computes
//                   it from connectivity, 'field' reads the per-node `size`
//   zoom          — +/−/reset buttons and drag pan; the wheel is left to the
//                   page (default: true)
//   linkTypes     — { type: { color, dash, label } } map or preset
//   tooltipFormat — function({ node, links }) => html
//   duration      — transition ms (default: 500; reduced-motion aware)
//
// Methods (each returns `this`; use whenReady() to await the fetch+render):
//   focus(id)      — ego view around id (click-recenter uses this too)
//   connect(a, b)  — path view between a and b
//   overview()     — cluster view
//   setData(data)  — wrap data in memorySource and focus the best-connected node
//   add(payload)   — merge an incremental { nodes?, links } payload and refresh
//   hide(id) / show(id) — toggle a node out of / back into the ego view

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';
import { applySvgA11y } from '../core/renderHelpers.js';
import { motionDuration } from '../core/utils.js';
import { GraphModel }    from '../graph/model.js';
import { memorySource }  from '../graph/source.js';
import { defaultNodeIcons } from '../graph/icons.js';
import { egoLayout }     from '../graph/layouts/ego.js';
import { pathLayout }    from '../graph/layouts/path.js';
import { clusterLayout } from '../graph/layouts/cluster.js';

export class Graph extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 520,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this._model    = new GraphModel();   // accumulates everything the user walks
    // `dataSource`, not `source` — the base Chart already uses options.source
    // for the footer attribution line.
    this._source   = options.dataSource ?? null;
    this._view     = options.view ?? 'ego';
    this._root     = null;               // ego center id
    this._paths    = null;               // id sequences for path view
    this._ctxIds   = null;               // path view: endpoint-context fans
    this._shortestKeys = null;           // path view: links of the shortest route
    this._rows     = null;               // path view: row captions
    this._viewData = null;               // { nodes, links } of the current query
    this._shown    = null;               // viewData capped to canvas capacity
    this._hiddenCount = 0;
    this._manual   = new Map();          // node id → dragged position override
    this._hidden   = new Set(options.hiddenNodes ?? []);
    this._ready    = Promise.resolve();
    this._switching = false;             // guards semantic-zoom feedback loops
    this._hasRendered = false;
    this._tooltip  = new Tooltip(this.container, this.theme);
    // linkTypes: pass a preset (e.g. linkPresets.personal) or your own map.
    this._linkTypes = options.linkTypes ?? {
      default: { color: '#888888', dash: null, label: 'Connection' },
    };
    // nodeIcons: group → svg path (24×24). Merged over the built-in set;
    // pass false to render plain circles.
    this._nodeIcons = options.nodeIcons === false
      ? null
      : { ...defaultNodeIcons, ...(options.nodeIcons ?? {}) };

    this._initSVG();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  // Ego view around `id`: fetch its neighborhood, merge into the model,
  // lay out from the accumulated graph.
  focus(id) {
    return this._enqueue(async () => {
      const depth = this.options.depth ?? 2;
      const sub = await this._requireSource().neighbors(id, { depth });
      this._model.merge(sub);
      this._view = 'ego';
      this._root = id;
      this._paths = null;
      this._ctxIds = null;
      this._shortestKeys = null;
      this._rows = null;
      this._manual = new Map();
      this._anchors = new Set([id]);
      this._viewData = this._model.neighborhood(id, depth);
      this.render();
      this._resetZoomSilently();
    });
  }

  // Path view: up to `pathCount` routes between a and b.
  // Pathfinding is the source's job (server-side on a real backend) — the
  // client only ever holds the neighborhoods it has walked.
  connect(a, b) {
    return this._enqueue(async () => {
      const o = this.options;
      const res = await this._requireSource().paths(a, b, { k: o.pathCount ?? 3 });
      if (!res.paths.length) {
        console.warn(`RareCharts.Graph: no path found between "${a}" and "${b}"`);
      }
      this._model.merge(res);

      // The story of a path view: both endpoints have many ties, several
      // routes exist, the shortest is highlighted. Endpoint context = their
      // strongest other connections, fanned behind them, faded.
      let ctxNodes = [], ctxLinks = [];
      this._ctxIds = null;
      if (o.pathContext !== false && res.paths.length) {
        const [na, nb] = await Promise.all([
          this._requireSource().neighbors(a, { depth: 1 }),
          this._requireSource().neighbors(b, { depth: 1 }),
        ]);
        this._model.merge(na);
        this._model.merge(nb);
        const inPath = new Set(res.nodes.map(n => n.id));
        const pickCtx = (sub, endpoint) => {
          const picked = [];
          sub.links
            .filter(l => l.source === endpoint || l.target === endpoint)
            .sort((x, y) => (y.weight ?? y.strength ?? 0.5) - (x.weight ?? x.strength ?? 0.5))
            .forEach(l => {
              const other = l.source === endpoint ? l.target : l.source;
              if (inPath.has(other)) return;
              if (picked.some(p => p.other === other)) return;
              if (picked.length >= (o.pathContextCount ?? 8)) return;
              picked.push({ other, link: { ...l, _ctx: true } });
            });
          return picked;
        };
        const pa = pickCtx(na, a);
        const pb = pickCtx(nb, b);
        const seen = new Set();
        [...pa, ...pb].forEach(({ other }) => {
          if (seen.has(other)) return;
          seen.add(other);
          ctxNodes.push({ ...this._model.node(other), _ctx: true });
        });
        ctxLinks = [...pa, ...pb].map(({ link }) => link);
        this._ctxIds = { [a]: pa.map(p => p.other), [b]: pb.map(p => p.other) };
      }

      // Shortest route (first found) gets the visual emphasis
      const keys = new Set();
      (res.paths[0] ?? []).forEach((id, i, p) => {
        if (i === 0) return;
        keys.add(id < p[i - 1] ? `${id}|${p[i - 1]}` : `${p[i - 1]}|${id}`);
      });
      this._shortestKeys = keys.size ? keys : null;

      this._view = 'path';
      this._paths = res.paths;
      this._manual = new Map();
      this._anchors = new Set([a, b]);
      this._viewData = {
        nodes: [...res.nodes, ...ctxNodes],
        links: [...res.links, ...ctxLinks],
      };
      this.render();
      this._resetZoomSilently();
    });
  }

  // Cluster view: communities as meta-nodes. Clicking one recenters the ego
  // view on its most-connected member.
  overview() {
    return this._enqueue(async () => {
      const agg = await this._requireSource().aggregates();
      const maxSize = Math.max(1, ...agg.communities.map(c => c.size));
      this._view = 'cluster';
      this._root = this._root ?? agg.communities[0]?.top ?? null;
      this._paths = null;
      this._ctxIds = null;
      this._shortestKeys = null;
      this._rows = null;
      this._manual = new Map();
      this._anchors = new Set();
      this._viewData = {
        nodes: agg.communities.map(c => ({
          id: c.id,
          label: `${c.label} · ${c.size}`,
          group: 'cluster',
          size: 1 + 2 * Math.sqrt(c.size / maxSize),
          _top: c.top,
          _size: c.size,
        })),
        links: agg.links.map(l => ({ ...l, strength: Math.min(1, l.weight / 8) })),
      };
      this.render();
      this._resetZoomSilently();
    });
  }

  // Static payload convenience: simulate a backend over the given data and
  // focus the best-connected node.
  setData(data = {}) {
    this._source = memorySource(data);
    this._model = new GraphModel();
    const score = new Map();
    (data.links ?? []).forEach(l => {
      score.set(l.source, (score.get(l.source) ?? 0) + 1);
      score.set(l.target, (score.get(l.target) ?? 0) + 1);
    });
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      ?? (data.nodes ?? [])[0]?.id;
    if (best != null) this.focus(best);
    return this;
  }

  // Merge an incremental payload — e.g. a news item asserting a new tie —
  // into the accumulated model and refresh the current ego view. Nodes
  // referenced only by link endpoints are created automatically (their label
  // falls back to the id), so the minimal unit of ingestion is one link.
  add(payload = {}) {
    this._model.merge(payload);
    if (this._view === 'ego' && this._root != null) {
      this._viewData = this._model.neighborhood(this._root, this.options.depth ?? 2);
      this.render();
    }
    return this;
  }

  // Keep a node out of the ego view without removing it from the model.
  hide(id) { this._hidden.add(id);    this.render(); return this; }
  show(id) { this._hidden.delete(id); this.render(); return this; }

  // Resolves when all queued view changes have fetched and rendered.
  whenReady() { return this._ready; }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width',  '100%')
      .attr('height', '100%')
      .style('cursor',   'grab')
      .style('overflow', 'hidden');

    applySvgA11y(this.svg, this.options);

    this._defs = this.svg.append('defs');

    // gRoot: outer group; gZoom: zoom/pan transform target
    this.gRoot    = this.svg.append('g').attr('class', 'rc-graph-root');
    this.gZoom    = this.gRoot.append('g').attr('class', 'rc-graph-zoom');
    this.gSectors = this.gZoom.append('g').attr('class', 'rc-graph-sectors');
    this.gLinks   = this.gZoom.append('g').attr('class', 'rc-graph-links');
    this.gNodes   = this.gZoom.append('g').attr('class', 'rc-graph-nodes');

    // Legend — HTML element, rendered outside SVG so it never overlaps nodes
    this._legendEl = document.createElement('div');
    this._legendEl.className = 'rc-graph-legend rc-legend';
    this.container.appendChild(this._legendEl);

    if (this.options.zoom !== false) {
      this._zoom = d3.zoom()
        .scaleExtent([0.2, 4])
        // Buttons zoom, dragging pans — the wheel stays with page scroll
        .filter(event => event.type !== 'wheel' && !event.button)
        .on('zoom', event => {
          this.gZoom.attr('transform', event.transform);
          this._maybeSemanticZoom(event.transform.k);
        });

      this.svg
        .call(this._zoom)
        .on('dblclick.zoom', null);

      this._initZoomControls();
    }
  }

  _initZoomControls() {
    const t = this.theme;
    this.container.style.position = 'relative';

    // Bottom-left row; the exact top is synced to the svg in render()
    const wrap = document.createElement('div');
    wrap.className = 'rc-graph-zoom-controls';
    wrap.style.cssText =
      'position:absolute;left:8px;bottom:8px;' +
      'display:flex;flex-direction:row;gap:4px;z-index:2;';
    this._zoomControlsEl = wrap;

    const mk = (label, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.style.cssText =
        `width:26px;height:26px;padding:0;border:1px solid ${t.border ?? t.muted};` +
        `border-radius:4px;background:${t.bg ?? '#fff'};color:${t.text};` +
        'font-size:14px;line-height:1;cursor:pointer;';
      b.addEventListener('click', fn);
      wrap.appendChild(b);
    };
    mk('+', 'Zoom in',    () => this._zoomBy(1.4));
    mk('−', 'Zoom out',   () => this._zoomBy(1 / 1.4));
    mk('⟲', 'Reset view', () => {
      if (this._zoom) this.svg.transition().duration(200).call(this._zoom.transform, d3.zoomIdentity);
    });

    this.container.appendChild(wrap);
  }

  _zoomBy(factor) {
    if (!this._zoom) return;
    this.svg.transition().duration(200).call(this._zoom.scaleBy, factor);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._viewData?.nodes?.length) return;

    // Measure the svg itself: the base Chart's width/height getters model
    // axis charts and can disagree with the real viewport by the header
    // height — a grid layout that uses the full area would get clipped.
    const svgEl = this.svg?.node();
    const W = svgEl?.clientWidth  || this.width;
    const H = svgEl?.clientHeight || this.height;
    if (W <= 0 || H <= 0) return;

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

    let positions, sectors = null;
    if (this._view === 'ego') {
      const res = egoLayout(this._shown, {
        rootId: this._root, width: W, height: H,
        groupBy: this.options.groupBy ?? 'group',
      });
      positions = res.positions;
      sectors = res.sectors;
    } else if (this._view === 'path') {
      const res = pathLayout(
        { paths: this._paths ?? [], context: this._ctxIds },
        { width: W, height: H });
      positions = res.positions;
      this._rows = res.rows;
    } else {
      positions = clusterLayout(this._shown, { width: W, height: H });
    }

    // Hand-dragged positions survive re-renders until the next view change
    this._manual.forEach((p, id) => {
      const cur = positions.get(id);
      if (cur) positions.set(id, { ...cur, x: p.x, y: p.y });
    });

    this._draw(positions, W, H, sectors);

    // Pin the zoom controls to the bottom-left corner of the svg itself
    // (the container also holds the header, legend, and footer).
    if (this._zoomControlsEl && svgEl?.getBoundingClientRect) {
      const svgTop = svgEl.getBoundingClientRect().top
        - this.container.getBoundingClientRect().top;
      this._zoomControlsEl.style.bottom = '';
      this._zoomControlsEl.style.top = `${Math.max(0, svgTop + H - 34)}px`;
    }

    this._hasRendered = true;
  }

  // How many nodes fit: one per comfortable grid cell (~96×74 px with the
  // label), minus the root's. Keeps first-ring and best-connected nodes;
  // the rest stay in the model and reappear on recenter or a larger canvas.
  _trimToCapacity(data, W, H) {
    const o = this.options;
    const max = (o.maxNodes == null || o.maxNodes === 'auto')
      ? Math.max(12, Math.floor(W / 96) * Math.floor(H / 74) - 1)
      : o.maxNodes;
    if (data.nodes.length <= max) {
      this._hiddenCount = 0;
      return data;
    }
    const nodes = data.nodes.slice().sort((a, b) =>
      ((a.depth ?? 0) - (b.depth ?? 0))
      || (this._model.degree(b.id) - this._model.degree(a.id))
      || String(a.label ?? a.id).localeCompare(String(b.label ?? b.id)))
      .slice(0, max);
    const keep = new Set(nodes.map(n => n.id));
    this._hiddenCount = data.nodes.length - nodes.length;
    return {
      nodes,
      links: data.links.filter(l => keep.has(l.source) && keep.has(l.target)),
    };
  }

  _draw(positions, W, H, sectors = null) {
    const t = this.theme;
    const o = this.options;
    const { nodes, links } = this._shown ?? this._viewData;
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
    const typesInUse = Array.from(new Set(links.map(l => l.type ?? 'default')));
    this._defs.selectAll('.rc-arrow').remove();
    typesInUse.forEach(type => {
      const cfg = this._linkTypes[type] ?? { color: t.muted };
      // Open chevron, stroked not filled — quieter than a solid triangle
      this._defs.append('marker')
        .attr('id',           `rc-arrow-${type}`)
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
    const linkD = d => {
      const s = positions.get(d.source);
      const e = positions.get(d.target);
      if (!s || !e) return '';
      const rT = nodeR(byId.get(d.target)) + 6;
      const dx = e.x - s.x, dy = e.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const ex = e.x - (dx / len) * rT;
      const ey = e.y - (dy / len) * rT;
      if (this._view !== 'ego' || len < 40) return `M${s.x},${s.y}L${ex},${ey}`;
      const bow = Math.min(26, len * 0.08);
      const nx = -dy / len, ny = dx / len;   // fixed-handedness unit normal
      const mx = (s.x + ex) / 2 + nx * bow;
      const my = (s.y + ey) / 2 + ny * bow;
      return `M${s.x},${s.y}Q${mx},${my} ${ex},${ey}`;
    };

    const linkKey = d =>
      d.source < d.target ? `${d.source}|${d.target}` : `${d.target}|${d.source}`;

    // ── Links ──
    const linkSel = this.gLinks.selectAll('.rc-graph-link')
      .data(links, linkKey)
      .join(
        enter => enter.append('path')
          .attr('class', 'rc-graph-link')
          .attr('fill', 'none')
          .attr('d', linkD)
          .attr('stroke-opacity', 0),
        update => update,
        exit => exit.remove()
      )
      .attr('stroke',           d => (this._linkTypes[d.type ?? 'default'] ?? {}).color ?? t.muted)
      .attr('stroke-width',     d => {
        const w = Math.max(0.75, 1.4 * (d.strength ?? d.weight ?? 0.5));
        return this._shortestKeys?.has(linkKey(d)) ? Math.max(2, w * 1.6) : w;
      })
      .attr('stroke-dasharray', d => (this._linkTypes[d.type ?? 'default'] ?? {}).dash ?? null)
      .attr('marker-end',       d => `url(#rc-arrow-${d.type ?? 'default'})`);

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

    // ── Node groups (circle + label) ──
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
            .style('font-family',     t.font)
            .style('font-size',       '11px')
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
    nodeSel.select('.rc-graph-node-label')
      .attr('y', d => nodeR(d) + 5)
      .text(d => d.label ?? d.id);
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
      nodeSel.call(this._dragBehavior(positions, linkSel, linkD));
    }

    // ── Hover: tooltip + focus-and-context highlight ──
    nodeSel
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('stroke', t.accent)
          .attr('opacity', 0.5);

        const nodeLinks = links.filter(l => l.source === d.id || l.target === d.id);
        const html = o.tooltipFormat
          ? o.tooltipFormat({ node: d, links: nodeLinks })
          : this._defaultTooltip(d, nodeLinks);
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, html);

        this._highlight(d, nodeSel, linkSel);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('opacity', 0);
        this._tooltip.hide();
        this._highlight(null, nodeSel, linkSel);
      });

    // ── Right-click: hide the node (ego view; the center is exempt) ──
    nodeSel.on('contextmenu', (event, d) => {
      if (this._view !== 'ego' || d.id === this._root) return;
      event.preventDefault();
      this.hide(d.id);
    });

    // ── Click: recenter (default) or custom handler ──
    nodeSel.on('click', (event, d) => {
      event.stopPropagation();
      const handler = o.onNodeClick ?? 'recenter';
      if (typeof handler === 'function') { handler({ node: d, event }); return; }
      if (handler !== 'recenter') return;
      if (this._view === 'cluster' && d._top) this.focus(d._top);
      else if (!(this._view === 'ego' && d.id === this._root)) this.focus(d.id);
    });

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
      .style('font-family',      t.font)
      .style('font-size',        '10px')
      .style('letter-spacing',   '0.08em')
      .style('text-transform',   'uppercase')
      .style('pointer-events',   'none')
      .text(d => d.key);

    // ── Capacity note: how much of the neighborhood is not shown ──
    const note = this._view === 'ego' && this._hiddenCount > 0
      ? [`+${this._hiddenCount} more — enlarge the chart or recenter to reveal`]
      : [];
    this.gRoot.selectAll('.rc-graph-note')
      .data(note)
      .join('text')
      .attr('class',        'rc-graph-note')
      .attr('x',            104)   // clears the zoom-controls row bottom-left
      .attr('y',            H - 14)
      .attr('fill',         t.muted)
      .style('font-family', t.font)
      .style('font-size',   '10px')
      .text(d => d);

    // ── Path-view row captions: hop counts, shortest called out ──
    const rowLabels = this._view === 'path' && this._rows?.length ? this._rows : [];
    this.gRoot.selectAll('.rc-graph-row-label')
      .data(rowLabels, (d, i) => i)
      .join('text')
      .attr('class',        'rc-graph-row-label')
      .attr('x',            8)
      .attr('y',            d => d.y + 3)
      .attr('fill',         t.muted)
      .style('font-family', t.font)
      .style('font-size',   '10px')
      .style('letter-spacing', '0.05em')
      .text(d => `${d.hops} hop${d.hops !== 1 ? 's' : ''}${d.shortest ? ' · shortest' : ''}`);

    // ── Hidden-nodes control: the way back from right-click hiding ──
    const hiddenNote = this._view === 'ego' && this._hidden.size > 0
      ? [`${this._hidden.size} hidden · restore`]
      : [];
    this.gRoot.selectAll('.rc-graph-hidden-note')
      .data(hiddenNote)
      .join('text')
      .attr('class',            'rc-graph-hidden-note')
      .attr('x',                W - 10)
      .attr('y',                H - 8)
      .attr('text-anchor',      'end')
      .attr('fill',             t.muted)
      .style('font-family',     t.font)
      .style('font-size',       '10px')
      .style('cursor',          'pointer')
      .style('text-decoration', 'underline')
      .text(d => d)
      .on('click', () => {
        this._hidden.clear();
        this.render();
      });

    // ── Legend (link types; meta-links in cluster view carry no types) ──
    if (this._view === 'cluster') this._legendEl.innerHTML = '';
    else this._renderLegend(typesInUse, t);
  }

  // ─── Node dragging ────────────────────────────────────────────────────────

  _dragBehavior(positions, linkSel, linkD) {
    const self = this;
    // `this` inside d3 listeners = the dragged <g> element. Never derive the
    // element from sourceEvent.target: on mousemove that is whatever sits
    // under the cursor, not the node being dragged.
    return d3.drag()
      .clickDistance(5)   // small jitter still counts as a click
      .on('start', function () {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event, d) {
        const p = positions.get(d.id);
        if (!p) return;
        p.x = event.x;
        p.y = event.y;
        self._manual.set(d.id, { x: event.x, y: event.y });
        d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
        linkSel
          .filter(l => l.source === d.id || l.target === d.id)
          .attr('d', linkD);
      })
      .on('end', function () {
        d3.select(this).style('cursor', 'pointer');
      });
  }

  // ─── Focus + context: highlight the hovered neighborhood, fade the rest ────

  _highlight(node, nodeSel, linkSel) {
    if (!node) {
      nodeSel.attr('opacity', 1);
      linkSel.attr('stroke-opacity', l => this._linkOpacity?.(l) ?? 0.7);
      return;
    }
    const near = new Set([node.id]);
    (this._shown ?? this._viewData).links.forEach(l => {
      if (l.source === node.id) near.add(l.target);
      if (l.target === node.id) near.add(l.source);
    });
    nodeSel.attr('opacity', d => near.has(d.id) ? 1 : 0.25);
    linkSel.attr('stroke-opacity', l =>
      (l.source === node.id || l.target === node.id) ? 1 : 0.08);
  }

  // ─── Semantic zoom: zooming out of ego = cluster overview, and back ────────

  _maybeSemanticZoom(k) {
    if (this.options.semanticZoom === false || this._switching || !this._source) return;
    if (this._view === 'ego' && k < 0.45) {
      this._switching = true;
      this.overview();
      this._enqueue(() => { this._switching = false; });
    } else if (this._view === 'cluster' && k > 1.7 && this._root) {
      this._switching = true;
      this.focus(this._root);
      this._enqueue(() => { this._switching = false; });
    }
  }

  _resetZoomSilently() {
    if (!this._zoom) return;
    const was = this._switching;
    this._switching = true;
    this.svg.call(this._zoom.transform, d3.zoomIdentity);
    this._switching = was;
  }

  // ─── Legend ───────────────────────────────────────────────────────────────

  _renderLegend(typesInUse, t) {
    if (!this._legendEl) return;

    const items = typesInUse
      .map(type => ({ type, ...(this._linkTypes[type] ?? { color: t.muted, label: type }) }));

    this._legendEl.innerHTML = items.map(item => {
      const dash = item.dash ? `stroke-dasharray="${item.dash}"` : '';
      return `<span class="rc-legend-item">
        <svg width="22" height="12" style="flex-shrink:0;vertical-align:middle">
          <line x1="1" y1="6" x2="21" y2="6"
            stroke="${item.color}" stroke-width="2" ${dash}/>
        </svg>
        ${item.label ?? item.type}
      </span>`;
    }).join('');
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────

  _defaultTooltip(node, nodeLinks) {
    const t = this.theme;

    if (node._size != null) {
      return `
        <div style="font-weight:bold;margin-bottom:2px">${node.label}</div>
        <div style="color:${t.muted};font-size:11px">
          ${node._size} node${node._size !== 1 ? 's' : ''} — click to explore
        </div>`;
    }

    // Counts-first summary with a hard cap on names: a hover tooltip cannot
    // scroll (it dies on mouseout and takes no pointer events), so on hubs it
    // must summarize. The full list belongs to a details surface (backlog).
    const MAX_NAMES = 6;
    const linkW = l => l.weight ?? l.strength ?? 0.5;

    const byType = new Map();
    nodeLinks.slice()
      .sort((a, b) => linkW(b) - linkW(a))          // strongest ties first
      .forEach(l => {
        const type = l.type ?? 'default';
        if (!byType.has(type)) byType.set(type, []);
        const otherId = l.source === node.id ? l.target : l.source;
        byType.get(type).push(this._model.node(otherId)?.label ?? otherId);
      });

    const cfg = type => this._linkTypes[type] ?? { color: t.muted };
    const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

    let shown = 0;
    const rows = types.map(([type, names]) => {
      const take = Math.max(0, Math.min(names.length, MAX_NAMES - shown));
      shown += take;
      const list = take
        ? `<div style="color:${t.text}">${names.slice(0, take).join(', ')}${names.length > take ? '…' : ''}</div>`
        : '';
      return `<div style="margin-top:4px">
        <span style="color:${cfg(type).color};font-size:10px;text-transform:uppercase;
                     letter-spacing:0.06em">${cfg(type).label ?? type}</span>
        <span style="color:${t.muted};font-size:10px"> · ${names.length}</span>
        ${list}
       </div>`;
    }).join('');

    const hiddenNames = nodeLinks.length - shown;
    const footer = hiddenNames > 0
      ? `<div style="color:${t.muted};font-size:10px;margin-top:6px">+${hiddenNames} more</div>`
      : '';
    const total = nodeLinks.length;

    return `<div style="max-width:260px">
      <div style="font-weight:bold;margin-bottom:2px">${node.label}</div>
      ${node.group ? `<div style="color:${t.muted};font-size:10px;margin-bottom:2px">${node.group}</div>` : ''}
      <div style="color:${t.muted};font-size:11px">${total} connection${total !== 1 ? 's' : ''}</div>
      ${rows}
      ${footer}
    </div>`;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _requireSource() {
    if (!this._source) {
      throw new Error('RareCharts.Graph: no data source — pass options.dataSource or call setData()');
    }
    return this._source;
  }

  // View changes queue up so rapid clicks can't interleave fetch + render.
  _enqueue(task) {
    this._ready = this._ready
      .then(task)
      .catch(err => console.error('RareCharts.Graph:', err));
    return this;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    this._tooltip?.destroy();
    this._tooltip = null;
    super.destroy();
  }
}

export { linkPresets } from './presets/linkPresets.js';

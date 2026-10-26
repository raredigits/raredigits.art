// RareCharts — MapFlow (experimental)
// Flows between places drawn over a map: capital, goods, influence. Built on
// Map — same geometry options, projections and theme — with the relation
// charts' link contract (core/links.js) on top. Spec:
// charts/SPEC-GRAPH-MAPFLOW-INTERNAL.md, part B.
//
// Data (setData or the `nodes` / `links` options):
//   nodes: [{ id, label?, coords?: [lon, lat], country?: featureId, color?, ... }]
//          coords place a node exactly; `country` puts it at the centroid of
//          the largest polygon of that feature (an island state's overseas
//          territories do not drag it into the ocean); color — the dot's fill
//          (default: theme text)
//   links: [{ source, target, type?, value?, start?, end?, label?, ... }]
//          (`from`/`to` and a `flows` collection are accepted as aliases)
//
// Options (plus every Map geometry option: topoUrl / topoData / geoUrl /
// geoData, topoObject, projection, rotate, fitPadding, featureFilter,
// clipExtent, defaultFill, borderColor, borderWidth, oceanColor, graticule,
// zoom…):
//   height        — card height px, header, period buttons, navigator and
//                   footer included; the type legend adds its own row
//                   (default: 420)
//   linkTypes     — { type: { color, dash?, label } }; the legend lists the
//                   types in use and turns them on and off
//   hiddenLinkTypes — types hidden at start
//   linkWidth     — { by: 'value', scale: 'sqrt' | 'linear', min, max }
//                   (default min 1, max 6); the arrowhead grows with the
//                   arc, more slowly
//   bend          — how far an arc bows to its side: bend × 0.6 of the arc's
//                   length, at most bend × 90 px (default 0.18); flows A→B
//                   and B→A bow to opposite sides; parallel flows of one
//                   direction fan out from there. An arc follows the great
//                   circle as the projection draws it: across the edge of a
//                   flat map it leaves one side and comes back on the other,
//                   on 'orthographic' only the near side of the globe shows
//                   (a place behind it has no dot); each piece bows on its own
//   timeWindow    — [from, to] initial window (null = all); see setTimeWindow
//   timeWindowMode — 'hide' (default) | 'dim' for flows outside the window
//   timeframes / navigator — a time scale, as on TimeSeries and the Graph
//                   flow view: period buttons in the header ({ key, label,
//                   range } for eras) and a brushable strip with a time axis
//                   under the map, showing how many flows run over time.
//                   With either on, the window is the chart's view:
//                   setTimeWindow moves it, setTimeframe / setView /
//                   onViewChange work as on TimeSeries; defaultView (or
//                   defaultTimeframe, a timeframe key) sets the starting period
//   fitTo         — 'features' (default) | 'links': fit the projection to the
//                   map or to the places and the arcs between them (their
//                   great circles and bows included)
//   nodeRadius    — dot radius px (default: 4)
//   nodeLabels    — draw node labels (default: true); they give way to each
//                   other — a node with more flow keeps its label first
//   tooltipFormat — ({ node, links }) => html, for places only
//   regionTooltipFormat — ({ feature, item }) => html for a country under the
//                   flows (Map's tooltipFormat payload); item is always null —
//                   MapFlow takes no region data
//   linkTooltipFormat — ({ link, source, target }) => html; click a flow to
//                   pin its tooltip (links inside stay clickable)
//   linkLegend    — false hides the type legend (default: shown with two or
//                   more types, or when linkTypes is given)
//   zoom          — as on Map; arcs keep their width, and dots, labels and
//                   arrowheads their size on screen (labels are placed again)
//
// Methods: setData({ nodes, links }) · setTimeWindow(from, to) ·
// setLinkTypesVisible(types | null) — each returns `this`. With the time
// scale on: setTimeframe(key), setView([from, to]), getView(),
// onViewChange(fn). whenReady() as on Map.
//
// Not in v1 (deliberately): particle animation, node clustering on zoom,
// choropleth values under the flows, hand-bent curves.

import * as d3 from 'd3';
import { Map as RareMap } from './Map.js';
import {
  applyTimeWindow, linkWidthScale, normalizeRelationData, resolveLinkType,
} from '../core/links.js';
import { escapeHtml as esc, tipBody, tipTitle, tipSub, linkTooltipHtml } from '../core/html.js';

// ─── Arc geometry (projection px) ────────────────────────────────────────────

// More points along a polyline, so a bow stays smooth on a piece the
// projection drew with only a few: at least 24 steps, none over 8 px.
function densify(pts) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const step = Math.max(Math.min(8, lens.reduce((s, v) => s + v, 0) / 24), 1e-9);
  const out = [pts[0]];
  lens.forEach((len, i) => {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.ceil(len / step);
    for (let j = 1; j <= n; j++) out.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]);
  });
  if (out.length < 2) out.push(pts[pts.length - 1].slice());
  return out;
}

// A piece bowed sideways by a sine over its length: `bend` × 0.6 of its
// chord, at most `bend` × 90 px, to one side of its direction — so A → B and
// B → A part. Both ends stay where they are.
function bow(pts, bend) {
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const amp = bend * Math.min(90, len * 0.6);
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = s[s.length - 1] || 1;
  return pts.map(([x, y], i) => {
    const k = Math.sin(Math.PI * (s[i] / total)) * amp;
    return [x + nx * k, y + ny * k];
  });
}

// The piece cut `stop` short of its end b, where the arrowhead takes over.
// Popping never passes the first point, and the end never moves back past
// the previous point (`slack` of it is kept).
function trimEnd(pts, b, stop, slack) {
  const body = pts.slice();
  const toB = p => Math.hypot(p[0] - b[0], p[1] - b[1]);
  while (body.length > 2 && toB(body[body.length - 2]) < stop) body.pop();
  const p = body[body.length - 2], e = body[body.length - 1];
  const short = stop - toB(e);
  if (short > 0) {
    const seg = Math.hypot(e[0] - p[0], e[1] - p[1]) || 1;
    const back = Math.min(short, seg - slack);
    body[body.length - 1] = [e[0] - (e[0] - p[0]) / seg * back, e[1] - (e[1] - p[1]) / seg * back];
  }
  return body;
}

// The point half way along polylines drawn one after another.
function midway(lines) {
  const segs = [];
  lines.forEach(pts => pts.slice(1).forEach((q, i) => segs.push([pts[i], q, Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])])));
  let half = segs.reduce((s, [, , len]) => s + len, 0) / 2;
  for (const [p, q, len] of segs) {
    if (half <= len) {
      const f = len ? half / len : 0;
      return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    }
    half -= len;
  }
  return lines[0]?.[0] ?? null;
}


export class MapFlow extends RareMap {
  constructor(selector, options = {}) {
    super(selector, { height: 420, ...options });
    if (options.nodes || options.links || options.flows) {
      this.setData({ nodes: options.nodes, links: options.links ?? options.flows });
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  setData(data = {}) {
    if (Array.isArray(data)) data = { nodes: [], links: data };
    // A flow needs both places on the map: one to an unknown node is
    // dropped, with a warning (core/links.js, K-07).
    const { nodes, links } = normalizeRelationData(data, {
      unknownEndpoints: 'drop',
      onUnknown: l => console.warn(`RareCharts.MapFlow: flow ${l.id} points to an unknown node — dropped`),
    });
    this._flowData = { nodes, links };
    if (this._hasTimeNav()) this._refreshViewForData();
    if (this._geoReady) this.render();
    return this;
  }

  // Flows outside [from, to] hide (or dim, timeWindowMode: 'dim'); null
  // bounds are open. Years, 'YYYY-MM' or ISO dates.
  // With timeframes or a navigator, the window is the view.
  setTimeWindow(from = null, to = null) {
    if (this._hasTimeNav()) return this._timeWindowAsView(from, to);
    this._window = from == null && to == null ? null : { from, to };
    if (this._geoReady) this.render();
    return this;
  }

  // ── Time scale: the base Chart's timeframes and navigator over the flows'
  // start / end (Chart._timeLinks and friends).
  _isLinkTimeChart() {
    return true;
  }

  // Hovering a country: MapFlow's tooltipFormat is for places ({ node,
  // links }); regions take their own regionTooltipFormat ({ feature, item }).
  _regionTooltipFormat() {
    return this.options.regionTooltipFormat;
  }

  _timeLinks() {
    return this._flowData?.links ?? null;
  }

  // Show only these flow types (null shows all) — what the legend does.
  setLinkTypesVisible(types) {
    const all = this._typeKeys();
    const on = types == null ? null : new Set(types.map(String));
    this._hiddenTypes = new Set(on ? all.filter(k => !on.has(k)) : []);
    if (this._geoReady) this.render();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  // Runs inside Map's constructor — before this constructor's body, and
  // before inline geometry renders — so all flow state starts here.
  _initSVG() {
    super._initSVG();
    const o = this.options;
    this._flowData = { nodes: [], links: [] };
    this._window = Array.isArray(o.timeWindow) ? { from: o.timeWindow[0] ?? null, to: o.timeWindow[1] ?? null } : null;
    this._hiddenTypes = new Set((o.hiddenLinkTypes ?? []).map(String));
    this.svg.attr('role', this.svg.attr('role') ?? 'img');
    // Arcs and their mouse targets live in map space and zoom with the map
    // (their stroke does not scale); arrowheads, dots and labels sit on top in
    // screen px and only move, so they keep their size under zoom (R-14).
    this.gFlows  = this.gZoom.append('g').attr('class', 'rc-mapflow-links');
    this.gHits   = this.gZoom.append('g').attr('class', 'rc-mapflow-link-hits');
    this.gOverlay = this.svg.append('g').attr('class', 'rc-mapflow-overlay');
    this.gHeads  = this.gOverlay.append('g').attr('class', 'rc-mapflow-heads');
    this.gNodes  = this.gOverlay.append('g').attr('class', 'rc-mapflow-nodes');
    this.gLabels = this.gOverlay.append('g').attr('class', 'rc-mapflow-labels');
    if (o.linkLegend !== false) {
      this._flowLegendEl = document.createElement('div');
      this._flowLegendEl.className = 'rc-legend rc-mapflow-legend';
      this.container.appendChild(this._flowLegendEl);
    }
    this.svg.on('click.mapflow', () => { if (this._tooltip?.isPinned) this._tooltip.unpin(); });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (this._flowData && this._hasTimeNav()) this._window = this._syncLinkTimeView();
    super.render();
    if (!this._projection) return;
    this._renderFlows();
  }

  _fitObject() {
    if (this.options.fitTo !== 'links') return super._fitObject();
    const pts = this._flowData.nodes.map(n => this._coordsOf(n)).filter(Boolean);
    // fewer than two distinct places have no extent to fit (a zero box would
    // scale the projection to Infinity): fit the map instead
    const distinct = new Set(pts.map(p => `${p[0]},${p[1]}`));
    if (distinct.size < 2) return super._fitObject();
    return { type: 'MultiPoint', coordinates: pts };
  }

  // fitTo: 'links' — the arcs too, as they are drawn: a great circle runs
  // far from its ends (China → New York goes over the Arctic) and the bow
  // adds px on top. After a fit, every point of every arc (all flows, so the
  // time window and the legend do not move the frame) that falls outside
  // the frame goes into the fit object, read back to [lon, lat], and the
  // projection is fitted again. A bow capped at bend × 90 px does not shrink
  // with the map: a second pass, or a third, takes up the rest (C-35).
  _fitProjection(proj, extent) {
    super._fitProjection(proj, extent);
    const fit = this._fitObject();
    if (this.options.fitTo !== 'links' || fit.type !== 'MultiPoint') return;
    const [[x0, y0], [x1, y1]] = extent;
    const extra = [];
    for (let pass = 0; pass < 3; pass++) {
      const at = this._placesAt(proj);
      const arcs = this._bowArcs(proj, this._flowData.links.filter(l => at.has(l.source) && at.has(l.target)), at);
      const out = [];
      arcs.forEach(({ pieces }) => pieces.forEach(pts => pts.forEach(p => {
        if (p[0] >= x0 - 0.5 && p[0] <= x1 + 0.5 && p[1] >= y0 - 0.5 && p[1] <= y1 + 0.5) return;
        const c = proj.invert?.(p);
        // a point the projection cannot read back (off the globe) is left out
        if (!c?.every(Number.isFinite)) return;
        const q = proj(c);
        if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1) out.push(c);
      })));
      if (!out.length) return;
      extra.push(...out);
      proj.fitExtent(extent, { type: 'MultiPoint', coordinates: [...fit.coordinates, ...extra] });
    }
  }

  // Where each place falls: its [lon, lat], its point in projection px, and
  // whether the projection shows it — a place behind an orthographic globe
  // projects onto the front, so it is hidden instead (R-13).
  _placesAt(proj) {
    const at = new globalThis.Map();
    let seen = false;
    const probe = proj.stream({
      point() { seen = true; }, lineStart() {}, lineEnd() {}, polygonStart() {}, polygonEnd() {}, sphere() {},
    });
    this._flowData.nodes.forEach(n => {
      const c = this._coordsOf(n);
      if (!c) return;
      const p = proj(c);
      seen = false;
      probe.point(c[0], c[1]);
      const finite = !!p && p.every(Number.isFinite);
      at.set(n.id, { lonlat: c, x: finite ? p[0] : NaN, y: finite ? p[1] : NaN, shown: seen && finite });
    });
    return at;
  }

  // Each flow's arc in projection px: the great circle between its places
  // as d3.geoPath draws it — cut where the projection cuts, at the edge of a
  // flat map and at the horizon of the globe, so in pieces, or none at all
  // (R-13) — each piece bowed on its own (see bow) so the arc reads as a
  // flow and two directions never overlap. Parallel flows of one direction
  // fan out; the opposite direction bows to the other side on its own.
  // `toTarget`: the last piece ends at the target's dot (not at the horizon).
  _bowArcs(proj, links, at) {
    const fan = new globalThis.Map();
    d3.group(links, l => `${l.source}→${l.target}`)
      .forEach(list => list.forEach((l, i) => fan.set(l.id, i - (list.length - 1) / 2)));
    const baseBend = this.options.bend ?? 0.18;
    let pieces = [];
    const trace = d3.geoPath(proj, {
      moveTo(x, y) { pieces.push([[x, y]]); },
      lineTo(x, y) { pieces[pieces.length - 1].push([x, y]); },
      closePath() {},
      arc() {},
    });
    const arcs = new globalThis.Map();
    links.forEach(l => {
      const a = at.get(l.source), b = at.get(l.target);
      pieces = [];
      trace({ type: 'LineString', coordinates: [a.lonlat, b.lonlat] });
      const bend = baseBend + (fan.get(l.id) ?? 0) * 0.16;
      const drawn = pieces.filter(p => p.length > 1).map(p => bow(densify(p), bend));
      if (!drawn.length) return;
      const last = drawn[drawn.length - 1];
      const [ex, ey] = last[last.length - 1];
      arcs.set(l.id, { pieces: drawn, b: [b.x, b.y], toTarget: b.shown && Math.hypot(ex - b.x, ey - b.y) < 0.5 });
    });
    return arcs;
  }

  // [lon, lat] of a node: its coords, else the centroid of the largest
  // polygon of its country feature.
  _coordsOf(n) {
    if (Array.isArray(n.coords) && n.coords.length >= 2 && n.coords.every(Number.isFinite)) return n.coords;
    if (n.country == null) return null;
    this._centroids ??= new globalThis.Map();
    const key = String(n.country);
    if (this._centroids.has(key)) return this._centroids.get(key);
    const idField = this.options.idField ?? 'id';
    const f = this._features.find(x => this._featureId(x, idField) === key);
    let c = null;
    if (f?.geometry) {
      const g = f.geometry;
      const polys = g.type === 'MultiPolygon'
        ? g.coordinates.map(p => ({ type: 'Polygon', coordinates: p }))
        : [g];
      // d3 reads rings clockwise; a ring wound the RFC 7946 way covers the
      // rest of the globe instead — read it the other way round.
      const fix = poly => (d3.geoArea(poly) > 2 * Math.PI
        ? { type: 'Polygon', coordinates: poly.coordinates.map(r => r.slice().reverse()) }
        : poly);
      const biggest = polys.map(fix).reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
      c = d3.geoCentroid(biggest);
    }
    if (!c) console.warn(`RareCharts.MapFlow: node ${n.id} — no feature "${key}" on the map`);
    this._centroids.set(key, c);
    return c;
  }

  _typeOf(l) { return l.type == null ? 'default' : String(l.type); }

  // A flow's category is named (tooltip, aria-label) when it has a type, or
  // when the page described the untyped 'default' — as the legend does.
  _namesType(l) {
    return l.type != null || !!this.options.linkTypes?.[this._typeOf(l)];
  }

  _typeKeys() {
    return [...new Set(this._flowData.links.map(l => this._typeOf(l)))];
  }

  _renderFlows() {
    const o = this.options;
    const t = this.theme;
    const types = o.linkTypes ?? {};
    const keys = this._typeKeys();
    // one category rule for every relation chart (core/links.js)
    const infoOf = key => resolveLinkType(types, key, { keys, theme: t });
    const colorOf = key => infoOf(key).color;

    const { nodes } = this._flowData;
    const at = this._placesAt(this._projection);
    const byId = new globalThis.Map(nodes.map(n => [n.id, n]));

    const typed = this._flowData.links.filter(l =>
      at.has(l.source) && at.has(l.target) && !this._hiddenTypes.has(this._typeOf(l)));
    const mode = o.timeWindowMode ?? 'hide';
    const links = applyTimeWindow(typed, this._window, mode);
    const widthOf = linkWidthScale(this._flowData.links, { min: 1, max: 6, ...(o.linkWidth ?? {}) });

    const arcs = this._bowArcs(this._projection, links, at);
    const name = id => byId.get(id)?.label ?? id;
    // thin on top; a flow with nothing on the visible side of the globe is
    // not drawn — nor in the Tab order
    const ordered = links.filter(l => arcs.has(l.id)).sort((a, b) => widthOf(b) - widthOf(a));

    // Geometry ('d', positions) is set by _layoutFlows, here and on zoom.
    this.gFlows.selectAll('.rc-mapflow-link')
      .data(ordered, l => l.id)
      .join('path')
      .attr('class', 'rc-mapflow-link')
      .attr('fill', 'none')
      .attr('stroke', l => colorOf(this._typeOf(l)))
      .attr('stroke-width', widthOf)
      .attr('stroke-opacity', l => (l._dim ? 0.15 : 0.8))
      .attr('stroke-dasharray', l => infoOf(this._typeOf(l)).dash)
      // round caps would fill a thick dash's gaps
      .attr('stroke-linecap', l => (infoOf(this._typeOf(l)).dash ? 'butt' : 'round'))
      .attr('vector-effect', 'non-scaling-stroke');

    // The arrowhead is drawn on its own: a marker would scale with the stroke
    // and swamp a thick flow.
    this.gHeads.selectAll('.rc-mapflow-head')
      .data(ordered, l => l.id)
      .join('path')
      .attr('class', 'rc-mapflow-head')
      .attr('fill', l => colorOf(this._typeOf(l)))
      .attr('fill-opacity', l => (l._dim ? 0.15 : 0.9))
      .style('pointer-events', 'none');

    const tieHtml = l => {
      const source = byId.get(l.source), target = byId.get(l.target);
      return o.linkTooltipFormat
        ? o.linkTooltipFormat({ link: l, source, target })
        : this._linkTooltip(l, source, target, infoOf);
    };
    this.gHits.selectAll('.rc-mapflow-link-hit')
      .data(ordered, l => l.id)
      .join('path')
      .attr('class', 'rc-mapflow-link-hit')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', l => Math.max(12, widthOf(l) + 8))
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', l => [`${name(l.source)} → ${name(l.target)}`,
        this._namesType(l) ? infoOf(this._typeOf(l)).label : null, l.label].filter(Boolean).join(', '))
      .style('pointer-events', 'stroke')
      .style('cursor', 'pointer')
      .on('mouseover', (event, l) => {
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, tieHtml(l));
      })
      .on('mouseout', () => this._tooltip.hide())
      .on('click', (event, l) => {
        event.stopPropagation();
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.pin(mx, my, tieHtml(l));
      })
      .on('keydown', (event, l) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        // the arc's midpoint is in map space: through the zoom, then from the
        // svg into the card (the tooltip's frame, below the header)
        const [mx, my] = this._zoomTransform.apply(this._flowLayout.get(l.id).mid);
        const svgBox = this.svg.node().getBoundingClientRect();
        const cardBox = this.container.getBoundingClientRect();
        this._tooltip.pin(
          mx + svgBox.left - cardBox.left - this.container.clientLeft,
          my + svgBox.top - cardBox.top - this.container.clientTop,
          tieHtml(l));
      });

    // Nodes: a node whose flows are all outside the window fades.
    const live = new Set(), tied = new Set();
    links.forEach(l => {
      tied.add(l.source); tied.add(l.target);
      if (!l._dim) { live.add(l.source); live.add(l.target); }
    });
    this._flowData.links.forEach(l => { tied.add(l.source); tied.add(l.target); });
    const total = new globalThis.Map(nodes.map(n => [n.id, 0]));
    this._flowData.links.forEach(l => {
      const v = Number.isFinite(+l.value) && l.value !== null ? Math.max(0, +l.value) : 0;
      total.set(l.source, total.get(l.source) + v);
      total.set(l.target, total.get(l.target) + v);
    });
    // a place behind the globe has no dot (R-13)
    const placed = nodes.filter(n => at.get(n.id)?.shown);
    const faded = n => tied.has(n.id) && !live.has(n.id);

    this.gNodes.selectAll('.rc-mapflow-node')
      .data(placed, n => n.id)
      .join('circle')
      .attr('class', 'rc-mapflow-node')
      .attr('r', o.nodeRadius ?? 4)
      .attr('fill', n => n.color ?? t.text)
      .attr('stroke', t.bg)
      .attr('stroke-width', 1.5)
      .attr('opacity', n => (faded(n) ? 0.3 : 1))
      .on('mouseover', (event, n) => {
        if (this._tooltip.isPinned) return;
        const nodeLinks = links.filter(l => l.source === n.id || l.target === n.id);
        const html = o.tooltipFormat
          ? o.tooltipFormat({ node: n, links: nodeLinks })
          : this._nodeTooltip(n, nodeLinks, name);
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, html);
      })
      .on('mouseout', () => this._tooltip.hide());

    this._flowView = { at, arcs, ordered, placed, nodes, total, faded, widthOf, k: null };
    this._layoutFlows();

    this._renderFlowLegend(keys, infoOf);
  }

  // The zoom moved: dots, labels and arrowheads follow in screen px (R-14).
  _onZoom(transform) {
    this._layoutFlows(transform);
  }

  // Everything that depends on the zoom, for the transform z (default: the
  // current one). Arcs and their mouse targets are in map px, inside the
  // zoom group; only their trimmed ends depend on the scale, so they are
  // redrawn when it changes. Arrowheads, dots and labels are in screen px:
  // same size at any zoom, and the labels are placed again.
  _layoutFlows(z = this._zoomTransform) {
    const v = this._flowView;
    if (!v) return;
    const o = this.options;
    const t = this.theme;
    const R = o.nodeRadius ?? 4;
    const k = z.k;
    const line = d3.line();

    const layout = new globalThis.Map();
    v.ordered.forEach(l => {
      const arc = v.arcs.get(l.id);
      const w = v.widthOf(l);
      const hl = 6 + w * 1.2, hw = 2.6 + w * 0.8;   // the arrowhead grows with the arc, more slowly
      const drawn = arc.pieces.slice();
      let chord = null, head = '', headBox = null;
      if (arc.toTarget) {
        // Trim at the target: the line stops `stop` screen px short of the
        // dot, where the arrowhead takes over; a last piece shorter than that
        // is drawn as the arrowhead alone, pointing along it at the target.
        const last = drawn.pop();
        const b = arc.b, from = last[0];
        const stop = (R + 2 + hl * 0.85) / k;
        const span = Math.hypot(b[0] - from[0], b[1] - from[1]);
        let end, ux, uy;
        if (span > stop + 1 / k) {
          const body = trimEnd(last, b, stop, 0.5 / k);
          drawn.push(body);
          const q = body[body.length - 2];
          end = body[body.length - 1];
          const dl = Math.hypot(end[0] - q[0], end[1] - q[1]) || 1;
          ux = (end[0] - q[0]) / dl; uy = (end[1] - q[1]) / dl;
        } else {
          const dl = span || 1;
          ux = (b[0] - from[0]) / dl; uy = (b[1] - from[1]) / dl;
          end = [b[0] - ux * stop, b[1] - uy * stop];
          chord = [from, b];
        }
        // base at the line's end, tip short of the target dot
        const [ex, ey] = z.apply(end);
        const bx = ex - ux * hl * 0.15, by = ey - uy * hl * 0.15;
        const tx = bx + ux * hl, ty = by + uy * hl;
        head = `M${tx},${ty}L${bx - uy * hw},${by + ux * hw}L${bx + uy * hw},${by - ux * hw}Z`;
        const hx = [tx, bx - uy * hw, bx + uy * hw], hy = [ty, by + ux * hw, by - ux * hw];
        headBox = { x0: Math.min(...hx), x1: Math.max(...hx), y0: Math.min(...hy), y1: Math.max(...hy) };
      }
      // A flow toward a place behind the globe runs to the horizon, without
      // an arrowhead. An arc drawn as its arrowhead alone still needs a mouse
      // target: the hit path then runs along the chord.
      const d = drawn.map(p => line(p)).join('');
      layout.set(l.id, {
        d,
        hit: d + (chord ? `M${chord[0]}L${chord[1]}` : ''),
        mid: midway(drawn.length ? drawn : chord ? [chord] : arc.pieces),   // labels, keyboard pin
        head, headBox,
      });
    });
    this._flowLayout = layout;

    if (v.k !== k) {
      this.gFlows.selectAll('.rc-mapflow-link').attr('d', l => layout.get(l.id).d);
      this.gHits.selectAll('.rc-mapflow-link-hit').attr('d', l => layout.get(l.id).hit);
      v.k = k;
    }
    this.gHeads.selectAll('.rc-mapflow-head').attr('d', l => layout.get(l.id).head);

    const screen = new globalThis.Map(v.placed.map(n => {
      const p = v.at.get(n.id);
      return [n.id, { x: z.applyX(p.x), y: z.applyY(p.y) }];
    }));
    this.gNodes.selectAll('.rc-mapflow-node')
      .attr('cx', n => screen.get(n.id).x)
      .attr('cy', n => screen.get(n.id).y);

    // Labels: right of the dot, else left, above, below; a label that would
    // overlap one already placed is left to the tooltip. Heavier nodes first.
    // Arrowheads and the other places' dots are obstacles: a label must not
    // cover where a flow lands, nor another place (D6).
    const heads = v.ordered.map(l => layout.get(l.id).headBox).filter(Boolean);
    const dots = v.placed.map(n => {
      const { x, y } = screen.get(n.id);
      return { id: n.id, x0: x - R, x1: x + R, y0: y - R, y1: y + R };
    });
    const labelBoxes = [];
    const labels = [];
    if (o.nodeLabels !== false) {
      const W = this.width, H = this.height;
      v.placed.slice()
        .sort((a, b) => (v.total.get(b.id) - v.total.get(a.id)) || (v.nodes.indexOf(a) - v.nodes.indexOf(b)))
        .forEach(n => {
          const { x, y } = screen.get(n.id);
          const text = String(n.label ?? n.id);
          const w = text.length * 6.4, h = 12;
          const tries = [
            [x + R + 4, y + 4, 'start'], [x - R - 4, y + 4, 'end'],
            [x, y - R - 5, 'middle'], [x, y + R + 13, 'middle'],
          ];
          // First clear of arrowheads, dots and labels; a hub ringed by
          // arrowheads then settles for clear of dots and labels only.
          const hits = (box, list) => list.some(b => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
          const others = dots.filter(d => d.id !== n.id);
          for (const avoid of [[...heads, ...others, ...labelBoxes], [...others, ...labelBoxes]]) {
            const spot = tries.find(([lx, ly, anchor]) => {
              const x0 = anchor === 'start' ? lx : anchor === 'end' ? lx - w : lx - w / 2;
              const box = { x0, x1: x0 + w, y0: ly - h + 2, y1: ly + 2 };
              return !(box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > H) && !hits(box, avoid);
            });
            if (!spot) continue;
            const [lx, ly, anchor] = spot;
            const x0 = anchor === 'start' ? lx : anchor === 'end' ? lx - w : lx - w / 2;
            labelBoxes.push({ x0, x1: x0 + w, y0: ly - h + 2, y1: ly + 2 });
            labels.push({ n, x: lx, y: ly, anchor });
            break;
          }
        });
    }
    this.gLabels.selectAll('.rc-mapflow-label')
      .data(labels, d => d.n.id)
      .join('text')
      .attr('class', 'rc-mapflow-label')
      .attr('x', d => d.x).attr('y', d => d.y)
      .attr('text-anchor', d => d.anchor)
      .attr('fill', t.text)
      .attr('stroke', t.bg).attr('stroke-width', 3).attr('paint-order', 'stroke')
      .attr('opacity', d => (v.faded(d.n) ? 0.4 : 1))
      .style('pointer-events', 'none')
      .text(d => d.n.label ?? d.n.id);
  }

  _renderFlowLegend(keys, infoOf) {
    const el = this._flowLegendEl;
    if (!el) return;
    // The rebuild replaces the buttons: one pressed from the keyboard would
    // drop focus to <body>, and the next Space would do nothing (R-16). Hand
    // focus to its successor.
    const focused = el.ownerDocument.activeElement;
    const refocus = el.contains(focused) ? focused.dataset.key : null;
    el.replaceChildren();
    const types = this.options.linkTypes ?? {};
    if (keys.length < 2 && !Object.keys(types).length) return;
    keys.forEach(key => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rc-legend-item rc-graph-legend-item';
      button.dataset.key = key;
      const off = this._hiddenTypes.has(key);
      button.setAttribute('aria-pressed', String(!off));
      button.style.opacity = off ? '0.35' : '1';
      const { color, dash, label } = infoOf(key);
      button.innerHTML = `<svg width="22" height="12" aria-hidden="true"><line x1="1" y1="6" x2="21" y2="6" stroke="${esc(color)}" stroke-width="3" ${dash ? `stroke-dasharray="${esc(dash)}"` : ''}/></svg><span></span>`;
      button.querySelector('span').textContent = label;
      button.addEventListener('click', () => {
        if (this._hiddenTypes.has(key)) this._hiddenTypes.delete(key);
        else this._hiddenTypes.add(key);
        this.render();
      });
      el.appendChild(button);
    });
    if (refocus != null) {
      [...el.querySelectorAll('button')].find(b => b.dataset.key === refocus)?.focus({ preventScroll: true });
    }
  }

  // Graph's tie tooltip (core/html.js linkTooltipHtml, D-03): label, value,
  // period and `sources`, clickable once the tooltip is pinned.
  _linkTooltip(l, source, target, infoOf) {
    const kind = this._namesType(l) ? infoOf(this._typeOf(l)) : null;
    return linkTooltipHtml({
      from: source?.label ?? l.source,
      to:   target?.label ?? l.target,
      ties: [{ link: l, kind }],
    });
  }

  _nodeTooltip(n, nodeLinks, name) {
    const outs = nodeLinks.filter(l => l.source === n.id && !l._dim);
    const ins = nodeLinks.filter(l => l.target === n.id && !l._dim);
    const line = (arrow, other, l) => `<div>${arrow} ${esc(name(other))}${l.label ? ` — ${esc(l.label)}` : ''}</div>`;
    return tipBody(`${tipTitle(esc(n.label ?? n.id))}
      ${tipSub(`${outs.map(l => line('→', l.target, l)).join('')}${ins.map(l => line('←', l.source, l)).join('')}`)}`);
  }
}

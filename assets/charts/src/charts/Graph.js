// RareCharts — Graph (experimental)
// Network viewport over a headless graph model. Deterministic views instead
// of a force simulation:
//
//   ego     — a grid around a focused node: each category anchored to a
//             corner, distance from the centre ≈ degrees of separation; a
//             dominant category fills from the centre out (graph/layouts/ego.js)
//   path    — layered "how are A and B connected" routes (layouts/path.js)
//   cluster — communities collapsed into meta-nodes on a grid, largest in the
//             centre (layouts/cluster.js)
//   flow    — a trace in ordered lanes: directed, value-weighted ties between
//             entities, laid out automatically from the ties, or from data
//             hints (graph/layouts/flowAuto.js, graph/views/flow.js;
//             set `view: 'flow'` and call setData — see "Flow view" below)
//
// Code (D-11): this file keeps the options, the source queue, view
// switching and the public API. The ego/path/cluster drawing is
// graph/views/network.js, the card chrome (tools, legend, details panel,
// "+N more" list, breadcrumbs, full screen) graph/chrome.js, the default
// node/tie tooltip and details HTML graph/tooltips.js — methods of this
// class, mixed into its prototype at the end of this file.
//
// Data arrives through a source adapter (graph/source.js contract):
//   { neighbors(id, {depth, types}), paths(a, b, {k}), aggregates() }
// memorySource(data) adapts a static { nodes, links } payload; a real backend
// implements the same contract server-side. Everything the user "walks"
// accumulates in a client-side GraphModel (layout, node identity across
// views); it is not a response cache — every focus/connect/overview/back
// queries the source again (O-09).
//
// Data format:
//   nodes: [{ id, label, group?, size?, color?, image?, hidden?, note? }, ...]
//   links: [{ id?, source, target, type?, weight?, strength?, label?, ... }, ...]
//          (`from`/`to` accepted as endpoint aliases, `flows` for `links`, in
//          every view — core/links.js normalizeRelationData). A pair may carry
//          several ties of different types — drawn as parallel arcs (up to 3;
//          more collapse into one line with a +N badge, all listed in its
//          tooltip). Without an `id`, a tie is `source→target|type` in
//          ego/path/cluster and `source→target#n` in the flow view.
//
// Options:
//   view          — 'flow' for the flow view; otherwise the view follows the
//                   call: focus() ego, connect() path, overview() cluster
//                   (setData() opens ego; default: 'ego')
//   dataSource    — source adapter (or use setData() for static payloads);
//                   `source` remains the footer attribution, as on every chart
//   depth         — ego neighborhood depth (default: 2)
//   groupBy       — ego sectors: 'group' (node group, default) | 'type'
//                   (relation type of the first-ring ancestor)
//   sectorLabels  — caption the ego category corners (default: false)
//   hiddenNodes   — ids to keep out of the ego view (see also hide()/show()
//                   and the per-node `hidden` data field); they stay in the
//                   model, and the path view still draws routes through them
//   onNodeClick   — 'recenter' (default) | fn({ node, event }) | null or
//                   false: clicks do nothing
//   pathCount     — max routes for connect() (default: 3)
//   pathContext   — fan the endpoints' other connections behind them in the
//                   path view, faded (default: true)
//   pathContextCount — max context ties per endpoint (default: 8)
//   semanticZoom  — zooming out of ego switches to cluster view (default: true)
//   height        — card height px, title/legend/footer included (default: 520)
//   maxNodes      — cap on rendered ego nodes: 'auto' (from canvas size —
//                   one node per ~96 × 50 px cell, never below 12; default)
//                   or a number; the rest is listed behind a "+N more"
//                   button in the footer
//   draggable     — nodes can be hand-dragged; positions persist until the
//                   next view change; under 6 px of movement is a click
//                   (default: true)
//   nodeRadius    — base radius px (default: 22)
//   nodeIcons     — { group: svgPath } merged over built-ins (graph/icons.js);
//                   false renders plain circles
//   sizeBy        — node size channel: uniform by default; 'degree' computes
//                   it from connectivity, 'field' reads the per-node `size`
//   zoom          — +/−/reset buttons, drag pan and Ctrl/⌘ + wheel (a
//                   trackpad pinch); on a phone two fingers pan and pinch. A
//                   plain wheel and one finger scroll the page, with a hint
//                   over the drawing (T-09, core/zoomGesture.js) (default: true)
//   fullscreen    — full-screen button in the footer tools; Esc or the
//                   button exits (default: true). Also toggleFullscreen()
//   details       — a details panel inside the card: true = rendered by the
//                   library (the hovered node or clicked tie, the focused node
//                   by default; in the flow view the selected node or tie), or
//                   your own element/selector (fill it from onSelect in the
//                   flow view; the other views do not call it). Beside the
//                   drawing on wide cards, below it on narrow ones (default: off)
//   detailsFormat — ({ node, link, view }) => html for details: true
//   detailsWidth  — side panel width px (default: 300)
//   detailsBreakpoint — card width px from which the panel sits beside the
//                   drawing (default: 1000)
//   detailsHeight — panel height px when it sits below (default: 200)
//   linkTypes     — { type: { color, dash, label } } map or preset; without
//                   it untyped ties are #888888 "Connection" (ego/path/cluster)
//   relationTypes — initial link-type filter: only listed types are traversed
//                   and drawn; untyped links match 'default' (default: all)
//   legendInteractive — the type legend's items are toggles (default: true).
//                   Ego view: a click, Enter or Space turns a relation type
//                   off or on and re-queries; a double click keeps only that
//                   type, a second double click brings all back; "Show all"
//                   shows while a type is off. With every type off the view
//                   is the focused node alone. Flow view: the same gestures
//                   hide and show tie categories. false: a static legend of
//                   the types drawn. (`interactiveLegend`, its old name, is no
//                   longer read: a console warning says so.)
//   onLegendToggle — ({ name, visible, visibleNames }) => void, after a legend
//                   gesture has redrawn (in the ego view, after its re-query);
//                   name is null for "Show all". The methods never call it
//   breadcrumbs   — show clickable view history (default: true)
//   historyLimit  — max states kept for breadcrumbs/back() (default: 12)
//   tooltipFormat — function({ node, links }) => html
//   linkTooltipFormat — function({ link, source, target }) => html for a tie's
//                   hover/pinned tooltip; click a tie to pin it (links inside
//                   a pinned tooltip are clickable; outside click/Esc closes)
//   valueFormat   — v => string for a tie's value in its tooltip and the
//                   details panel (default: locale number; as on Sankey)
//   duration      — transition ms (default: 500; reduced-motion aware)
//
// Flow view options (view: 'flow'; the decisions: assets/charts/docs/DECISIONS.md §13, Flow view):
//   lanes         — [{ id, label, weight? }] in left-to-right order
//   laneBy        — node field (or fn) naming its lane (default: 'lane')
//   nodeGroups    — { group: { color, label } } — node color + legend
//   nodeShapes    — { kind: 'circle' | 'square' | 'diamond' | 'stack' | svgPath }
//   shapeBy       — node field (or fn) keyed into nodeShapes (default: 'kind')
//   linkColorBy   — tie field (or fn) keyed into linkTypes (default: 'type')
//   linkWidth     — { by: 'value', scale: 'sqrt' | 'linear', min, max }
//   linkDash      — tie => boolean: dashed (e.g. derived amounts)
//   linkLabels    — draw tie labels (default: true)
//   legendSymbols — { shapes?, dash?, width? } | false — the key to the
//                   drawing: static rows after the tie categories in the
//                   legend, marks in the muted text colour. Shapes: a row
//                   per node shape, named by the kinds (shapeBy) that draw
//                   it, when the nodes draw two or more shapes (a fold's
//                   stack is no kind); shapes: { kind: 'label' | false }
//                   renames or leaves out a kind, shapes: false all of them.
//                   dash: 'words' — a row for the ties linkDash dashes;
//                   width: 'words' — a row for the tie width (linkWidth.by).
//                   No words, no dash or width row. false: no key
//                   (default: the shape rows only)
//   layout        — 'auto' (default): nodes without position hints are laid
//                   out from the ties — ranks along the flow, the heaviest
//                   route (or nodes/ties flagged `main: true`) on row 0, the
//                   rest above/below with few crossings; hinted nodes stay
//                   put. 'hints': stage-1 placement from hints only
//   folds         — [{ id, label?, members: ids | node => bool, anchor?,
//                   collapsed?, sub?: string ({n}) | n => string, group? }] —
//                   sets of nodes that collapse into one meta-node with a
//                   +/− switch; its ties sum `value` per pair and category
//   onFoldChange  — ({ id, collapsed, fold, event }) => void
//   aggregateLinks — merge parallel ties of one pair and category into one
//                   (value summed, originals listed in the tooltip; default false)
//   laneCap       — integer: most nodes a lane shows, the "+N more" meta-node
//                   included — a lane over it keeps its laneCap − 1 heaviest
//                   and folds the rest into it (fold id lane:<laneId>;
//                   default: none)
//   timeframes / navigator — time navigation over the ties' start/end, as
//                   on TimeSeries: buttons in the header, a brushable
//                   overview of active ties under the drawing
//   timeZone      — 'local' (default) | 'UTC', as on TimeSeries: the zone
//                   the ties' start / end, setTimeWindow and the view bounds
//                   are read in, the timeframes cut in and the navigator's
//                   periods and axis follow (RC-006; parseTime in core/links.js)
//   hulls         — [{ id, label, members: ids | node => bool, color? }]
//   hiddenLinkTypes — tie categories hidden at start; the legend shows them
//                   (dimmed) and turns them on. A node whose ties are all
//                   hidden is hidden with them. A hidden category stays hidden
//                   across setData, also while the data lacks it
//   timeWindowMode — 'dim' (default) | 'hide' for setTimeWindow; nodes left
//                   without ties in the window fade either way
//   onSelect      — ({ node, link, event }) => void — drive a details panel
//   minWidth      — px; below it the drawing scrolls sideways inside the
//                   card, the rest of the card stays put (default: 0)
//   nodeRadius    — default 18 in the flow view
// Node hints: lane, row (0 main line, ±1…), col (sub-column), x/y (0..1
// fractions), sub (second line), terminal. Ties: source/target (from/to),
// value, start/end, label, bend.
//
// Methods (return `this` except whenReady() → Promise, isCollapsed() →
// boolean, getView() → the period; whenReady() awaits the fetch+render):
//   focus(id, { types? }) — ego view around id (click-recenter uses this too)
//   connect(a, b)  — path view between a and b
//   overview()     — cluster view
//   setData(data)  — wrap data in memorySource and focus the best-connected node
//                    (most distinct neighbours over the ties the view draws);
//                    a focus/connect/overview chained in the same tick replaces
//                    that default (no whenReady() needed in between). New data,
//                    new history and legend types; an empty payload clears the
//                    drawing (R-17). The flow view draws the whole payload instead.
//   add(payload)   — merge an incremental { nodes?, links } payload and refresh
//                    an ego view (path/cluster draw what the source answers:
//                    the new tie shows with the next focus())
//   hide(id) / show(id) — toggle a node out of / back into the ego view
//   setRelationTypes(types) / clearRelationTypes() — filter ego relations
//                    (the traversal; null or [] means every type)
//   back() / clearHistory() — navigate the graph view history
//   flow view: setLinkTypesVisible(types | null) — show only these tie
//              categories (null: all), as the legend does; silent (no
//              onLegendToggle). Read against the categories in the trace;
//              in the other views it is only kept for the flow view
//              · setFilter(fn) · setTimeWindow(from, to) · select(id | { link })
//              · clearSelection() · setLinkLabels(bool) · setHulls(list)
//              · expand(id) · collapse(id) · isCollapsed(id) · setFolds(list)
//              · setTimeframe(key) · setView([from, to]) · getView()
//              · onViewChange(fn)
//
// Keyboard (K-20, K-23, graph/roving.js): the nodes of a view share one Tab
// stop and its ties another (after the nodes in ego, path and cluster,
// before them in flow); arrows move between them, Enter or Space acts as a
// click, Escape clears. A tie's tooltip pinned from the keyboard takes Tab
// into its links. The svg is a group while it holds them (K-24).

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { linkWeight, pairKey, normalizeRelationData, resolveLinkType } from '../core/links.js';
import { FlowView } from '../graph/views/flow.js';
import { networkView } from '../graph/views/network.js';
import { graphChrome, NO_RELATION_TYPES } from '../graph/chrome.js';
import { graphTooltips } from '../graph/tooltips.js';
import { GraphModel }    from '../graph/model.js';
import { renderLegendItems } from '../core/legend.js';
import { memorySource }  from '../graph/source.js';
import { defaultNodeIcons } from '../graph/icons.js';
import { bindZoom, boxInCard } from '../core/zoomGesture.js';


// setData()'s default centre: the node with the most distinct neighbours,
// over the ties the model stores (`data` is GraphModel.normalize()d: no tie
// without both ends, none to itself) — and, under a relation filter, over
// the ties the ego view will draw (R-17). Ties keep data order; a payload
// without ties falls back to its first node.
function bestConnected(data, types = null) {
  const links = data.links;
  const count = list => {
    const near = new Map();
    list.forEach(l => {
      const s = l.source, t = l.target;
      if (!near.has(s)) near.set(s, new Set());
      if (!near.has(t)) near.set(t, new Set());
      near.get(s).add(t);
      near.get(t).add(s);
    });
    let best = null, most = 0;
    near.forEach((set, id) => { if (set.size > most) { best = id; most = set.size; } });
    return best;
  };
  const passing = types ? links.filter(l => types.has(String(l.type ?? 'default'))) : links;
  const id = count(passing) ?? (passing === links ? null : count(links)) ?? data.nodes[0]?.id;
  return id ?? null;
}

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
    this._overflowNodes = [];
    this._relationTypes = options.relationTypes?.length
      ? new Set(options.relationTypes.map(String)) : null;
    this._knownTypes = new Set();
    // The ego legend: its keys at the last render, a gesture whose re-query
    // is pending ({ shown }), and the breadcrumb its last re-query pushed.
    this._typeLegendKeys = [];
    this._legendPending = null;
    this._legendEntry = null;
    // The flow view's hidden tie categories are the chart's hidden set (the
    // one every RareCharts legend uses); the ego filter is the traversal
    // above, not this set (K-05).
    (options.hiddenLinkTypes ?? []).forEach(type => this._hiddenKeys.add(String(type)));
    // Graph's old switch for its legend; legendInteractive now, with no
    // alias (K-05). Ignored — said once, so a page that turned the legend
    // off does not silently get an interactive one.
    if (options.interactiveLegend !== undefined) {
      console.warn('RareCharts.Graph: `interactiveLegend` is no longer read — use `legendInteractive`');
    }
    this._history = [];
    this._skipHistoryOnce = false;
    this._manual   = new Map();          // node id → dragged position override
    this._hidden   = new Set((options.hiddenNodes ?? []).map(String));
    this._ready    = Promise.resolve();
    this._autoFocusId = null;            // setData's default ego, unless a view is requested first
    this._dataGen  = 0;                  // bumped by setData()/destroy(); see _isStale()
    this._switching = false;             // guards semantic-zoom feedback loops
    this._hasRendered = false;
    this._nodeRoving = { current: null }; // keyboard: the node holding the drawing's tab stop (K-20)
    this._tieRoving  = { current: null }; // and the tie holding the ties' tab stop (K-23)
    this.tooltip;   // made now: its element keeps its place in the card
    // linkTypes: pass a preset (e.g. linkPresets.personal) or your own map.
    this._linkTypes = options.linkTypes ?? {
      default: { color: '#888888', dash: null, label: 'Connection' },
    };
    // If the graph starts filtered, the current query cannot reveal the other
    // available types. Treat configured linkTypes as the legend catalogue so
    // the user can still expand the filter; unfiltered graphs discover types
    // from their actual payload instead.
    if (this._relationTypes) {
      Object.keys(this._linkTypes).forEach(type => this._knownTypes.add(type));
    }
    // nodeIcons: group → svg path (24×24). Merged over the built-in set;
    // pass false to render plain circles.
    this._nodeIcons = options.nodeIcons === false
      ? null
      : { ...defaultNodeIcons, ...(options.nodeIcons ?? {}) };

    this._initSVG();
    this._initGraphChrome();
    this._initDetails();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  // Ego view around `id`: fetch its neighborhood, merge into the model,
  // lay out from the accumulated graph.
  focus(id, { types } = {}) {
    this._autoFocusId = null;
    id = String(id);                       // node ids are strings in the model
    return this._enqueue(() => this._focusTask(id, { types }));
  }

  // `legend`: { replaces } when a legend gesture asked (chrome.js
  // _relationLegendGesture).
  async _focusTask(id, { types, legend = null } = {}) {
    id = String(id);       // every way in (focus, setData's auto-focus, back) — ids are strings in the model
    // The filter is applied inside the queued task: two rapid focus() calls
    // with different filters must each fetch with their own, not both with
    // whichever was set last.
    if (types !== undefined) this._setRelationTypesState(types);
    const depth = this.options.depth ?? 2;
    const activeTypes = this._activeRelationTypes();
    // Every type turned off in the legend (spec decision 26): the node
    // alone, from the model — no source call, which a backend could read as
    // "every type", and no breadcrumb. A node the model does not hold yet is
    // fetched over every type, then drawn alone.
    const none = activeTypes?.length === 0;
    const gen = this._dataGen;
    if (!none || !this._model.has(id)) {
      const sub = await this._requireSource().neighbors(id, { depth, types: none ? null : activeTypes });
      if (this._isStale(gen)) return;
      this._model.merge(sub);
      (sub.links ?? []).forEach(l => this._knownTypes.add(String(l.type ?? 'default')));
    }
    this._view = 'ego';
    this._root = id;
    this._paths = null;
    this._ctxIds = null;
    this._shortestKeys = null;
    this._rows = null;
    this._manual = new Map();
    this._anchors = new Set([id]);
    this._viewData = this._model.neighborhood(id, depth, { types: activeTypes });
    // Zoom back first: render places a keyboard-focused node's tooltip
    // through the zoom transform, which must be the new view's.
    this._resetZoomSilently();
    this.render();
    if (none) {
      if (legend) this._legendEntry = null;
      return;
    }
    // The second click of a legend double click replaces the breadcrumb its
    // first click pushed — only that one, if it is still the last.
    const replace = !!legend?.replaces && this._history[this._history.length - 1] === this._legendEntry;
    const entry = this._recordHistory({ view: 'ego', root: id, types: activeTypes }, { replace });
    if (legend) this._legendEntry = entry;
  }

  // Path view: up to `pathCount` routes between a and b.
  // Pathfinding is the source's job (server-side on a real backend) — the
  // client only ever holds the neighborhoods it has walked.
  connect(a, b) {
    this._autoFocusId = null;
    a = String(a); b = String(b);
    return this._enqueue(async () => {
      const o = this.options;
      const gen = this._dataGen;
      const res = await this._requireSource().paths(a, b, { k: o.pathCount ?? 3 });
      if (this._isStale(gen)) return;
      if (!res.paths.length) {
        console.warn(`RareCharts.Graph: no path found between "${a}" and "${b}"`);
      }
      this._model.merge(res);
      (res.links ?? []).forEach(l => this._knownTypes.add(String(l.type ?? 'default')));

      // The story of a path view: both endpoints have many ties, several
      // routes exist, the shortest is highlighted. Endpoint context = their
      // strongest other connections, fanned behind them, faded. A node and
      // itself is one node, no routes and no context (R-18).
      let ctxNodes = [], ctxLinks = [];
      this._ctxIds = null;
      if (o.pathContext !== false && res.paths.length && a !== b) {
        const [na, nb] = await Promise.all([
          this._requireSource().neighbors(a, { depth: 1 }),
          this._requireSource().neighbors(b, { depth: 1 }),
        ]);
        if (this._isStale(gen)) return;
        this._model.merge(na);
        this._model.merge(nb);
        const inPath = new Set(res.nodes.map(n => n.id));
        const pickCtx = (sub, endpoint) => {
          const picked = [];
          sub.links
            .filter(l => l.source === endpoint || l.target === endpoint)
            .sort((x, y) => linkWeight(y) - linkWeight(x))
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
      this._resetZoomSilently();   // before render, as in focus()
      this.render();
      this._recordHistory({ view: 'path', a, b, types: this._activeRelationTypes() });
    });
  }

  // Cluster view: communities as meta-nodes. Clicking one recenters the ego
  // view on its most-connected member.
  overview() {
    this._autoFocusId = null;
    return this._enqueue(async () => {
      const gen = this._dataGen;
      const agg = await this._requireSource().aggregates();
      if (this._isStale(gen)) return;
      const maxSize = Math.max(1, ...agg.communities.map(c => c.size));
      this._view = 'cluster';
      // zooming back in returns to the last ego centre — one of this data's
      // (after setData() the old centre is gone from the model)
      this._root = (this._root != null && this._model.has(this._root) ? this._root : null)
        ?? agg.communities[0]?.top ?? null;
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
        // width from the number of real edges between the two communities,
        // full at eight; the raw number stays as `count`
        links: agg.links.map(l => ({
          ...l, id: pairKey(l.source, l.target), weight: Math.min(1, l.weight / 8), count: l.weight,
        })),
      };
      this._resetZoomSilently();   // before render, as in focus()
      this.render();
      this._recordHistory({ view: 'cluster', root: this._root, types: this._activeRelationTypes() });
    });
  }

  // Static payload convenience: simulate a backend over the given data and
  // focus the best-connected node — unless a view change (focus, connect,
  // overview) is requested in the same tick: `setData(d).focus(id)` then
  // renders `id` once, without first drawing and discarding the default ego.
  setData(data = {}) {
    // Replacing the data retires every task already waiting on the old
    // source: their late answers must not reach the new model or view —
    // nor may a retired back() leave its one-shot history skip armed.
    this._dataGen++;
    this._skipHistoryOnce = false;
    // A legend gesture still waiting for its re-query is retired with them:
    // the legend shows the filter again, not that gesture's types.
    if (this._legendPending) {
      this._legendPending = null;
      this._typeLegendEl?.removeAttribute('aria-busy');
    }
    if (this._view === 'flow') return this._setFlowData(data);
    // The ties as the model reads them (core/links.js, K-07): the legend and
    // the default centre below; the source reads the payload itself, as a
    // backend would.
    const norm = GraphModel.normalize(data);
    this._source = memorySource(data);
    this._model = new GraphModel();
    // A new dataset starts a new walk: the old breadcrumbs and the relation
    // types the old data taught the legend go (R-17). The old centre stays
    // drawn until the new one is focused; overview() checks it is still in
    // the model.
    this._history = [];
    this._renderBreadcrumbs();
    // The legend learns the new data's own types and the ones an active
    // filter names — a filter set before setData must not leave it with a
    // stale or empty list (R-17); a given linkTypes catalogue counts too.
    this._knownTypes = new Set();
    norm.links.forEach(l => this._knownTypes.add(String(l.type ?? 'default')));
    (this._relationTypes ?? []).forEach(type => this._knownTypes.add(String(type)));
    if (this.options.linkTypes) Object.keys(this._linkTypes).forEach(type => this._knownTypes.add(type));
    this._nodeRoving.current = null;
    this._tieRoving.current = null;
    const best = bestConnected(norm, this._relationTypes);
    if (best == null) {
      // Nothing to focus: the old drawing must not stay up as if it were
      // this data's.
      this._autoFocusId = null;
      this._clearDrawing();
      return this;
    }
    this._autoFocusId = best;
    // Queued now (so whenReady() covers it), decided when it runs — after the
    // caller's synchronous chain: a view method called meanwhile has cleared
    // _autoFocusId and queued its own task behind this one.
    return this._enqueue(async () => {
      const id = this._autoFocusId;
      this._autoFocusId = null;
      if (id != null) await this._focusTask(id);
    });
  }

  // ─── Flow view ────────────────────────────────────────────────────────────

  // The flow view draws the given trace whole — it is the query result — so
  // there is no source to walk and no default focus.
  _setFlowData(data) {
    // Read once (core/links.js) for the trace and the model alike; endpoint-
    // only nodes are created, as in the other views.
    const { nodes, links } = normalizeRelationData(data, { unknownEndpoints: 'create' });
    this._model = new GraphModel().mergeCanonical({ nodes, links });
    this._flow().setData({ nodes, links });
    this._viewData = { nodes, links };
    if (this._hasTimeNav()) this._refreshViewForData();
    this.render();
    return this;
  }

  _flow() {
    if (!this._flowView) this._flowView = new FlowView(this);
    return this._flowView;
  }

  // Show only nodes/ties passing fn(item); a tie hides with either end.
  // Positions do not move. null clears.
  setFilter(fn) {
    this._flow().filter = typeof fn === 'function' ? fn : null;
    this.render();
    return this;
  }

  // Ties outside [from, to] dim (or hide, timeWindowMode: 'hide'); nodes
  // whose ties are all outside fade. null bounds are open. With timeframes
  // or a navigator the window is the chart's view, so the buttons and the
  // brush follow.
  setTimeWindow(from = null, to = null) {
    if (this._hasTimeNav()) return this._timeWindowAsView(from, to);
    this._flow().window = from == null && to == null ? null : { from, to };
    this.render();
    return this;
  }

  // Folds (flow view): collapse / expand a fold by id, as its +/− switch does.
  collapse(id) { return this._setFold(id, true); }
  expand(id)   { return this._setFold(id, false); }
  isCollapsed(id) { return this._flow().isCollapsed(id); }

  _setFold(id, collapsed) {
    if (this._flow().setCollapsed(id, collapsed)) {
      this.render();
      const f = this._flow();
      if (f.selected) this._showDetails(f._selectedSubject());
    }
    return this;
  }

  // Replace the fold list; states of folds that keep their id are kept.
  setFolds(folds) {
    this.options.folds = folds ?? [];
    this._flow()._foldCache = null;
    this.render();
    return this;
  }

  // ── Time navigation (flow view): the base Chart's time scale over the
  // ties' start / end (Chart._timeLinks and friends).
  _isLinkTimeChart() {
    return (this._view ?? this.options.view) === 'flow';
  }

  _timeLinks() {
    return this._view === 'flow' && this._flowView ? this._flowView.data.links : null;
  }

  // Select a node (id) or a tie ({ link: id }), as a click would.
  select(target) {
    const f = this._flow();
    const sel = target == null ? null
      : typeof target === 'object' ? (target.link != null ? { link: String(target.link) } : null)
      : { node: String(target) };
    if (f._select) f._select(sel); else f.selected = sel;
    return this;
  }

  clearSelection() { return this.select(null); }

  // Replace the group outlines ([] or null removes them).
  setHulls(hulls) {
    this.options.hulls = hulls ?? [];
    this.render();
    return this;
  }

  setLinkLabels(on = true) {
    this._flow().labels = !!on;
    this.render();
    return this;
  }

  // Flow view: show only these tie categories (a list, or one name); null
  // shows them all — what the legend does, without onLegendToggle. Read
  // against the categories in the trace (MapFlow's rule): a category it
  // lacks drops from the hidden set. In the other views the set is only
  // kept for the flow view.
  setLinkTypesVisible(types) {
    return this._setVisibleKeys(types);
  }

  // The flow trace's tie categories, in data order: what setLinkTypesVisible
  // reads and onLegendToggle's visibleNames list (core/Chart.js). The ego
  // view's filter is the traversal, not this set.
  _legendSeries() {
    return (this._flowView?.linkKeys() ?? []).map(key => ({ key }));
  }

  // The header `legend` names no series in Graph: every item stays a label.
  // The type legend is Graph's own (_typeLegendEl).
  _legendKeyOf() {
    return null;
  }

  // Merge an incremental payload — e.g. a news item asserting a new tie —
  // into the accumulated model and refresh the current ego view. Nodes
  // referenced only by link endpoints are created automatically (their label
  // falls back to the id), so the minimal unit of ingestion is one link.
  add(payload = {}) {
    const norm = GraphModel.normalize(payload);
    this._model.mergeCanonical(norm);
    norm.links.forEach(l => this._knownTypes.add(String(l.type ?? 'default')));
    if (this._view === 'ego' && this._root != null) {
      this._viewData = this._model.neighborhood(this._root, this.options.depth ?? 2, {
        types: this._activeRelationTypes(),
      });
      this.render();
    }
    return this;
  }

  // Keep a node out of the ego view without removing it from the model.
  hide(id) { this._hidden.add(String(id));    this.render(); return this; }
  show(id) { this._hidden.delete(String(id)); this.render(); return this; }

  // Filter ego relations by type. null / [] means all types.
  setRelationTypes(types) {
    if (this._view === 'ego' && this._root != null) {
      return this.focus(this._root, { types: types ?? null });
    }
    this._setRelationTypesState(types);
    this.render();
    return this;
  }

  clearRelationTypes() { return this.setRelationTypes(null); }

  // Restore the previous semantic view (not the literal pan/zoom transform).
  back() {
    if (this._history.length < 2) return this;
    this._history.pop();
    const state = this._history[this._history.length - 1];
    this._skipHistoryOnce = true;
    this._restoreState(state);
    this._renderBreadcrumbs();
    return this;
  }

  clearHistory() {
    this._history = this._history.length ? [this._history[this._history.length - 1]] : [];
    this._renderBreadcrumbs();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this._createSvg({ style: { cursor: 'grab', overflow: 'hidden' } });

    this._defs = this.svg.append('defs');

    // gRoot: outer group; gZoom: zoom/pan transform target
    this.gRoot    = this.svg.append('g').attr('class', 'rc-graph-root');
    this.gZoom    = this.gRoot.append('g').attr('class', 'rc-graph-zoom');
    this.gSectors = this.gZoom.append('g').attr('class', 'rc-graph-sectors');
    this.gLinks   = this.gZoom.append('g').attr('class', 'rc-graph-links');
    // Invisible wide strokes over the links: hover/click targets for thin
    // ties. Below the nodes, so a node always wins where they overlap.
    this.gLinkHits = this.gZoom.append('g').attr('class', 'rc-graph-link-hits');
    this.gNodes   = this.gZoom.append('g').attr('class', 'rc-graph-nodes');
    // The ties' keyboard targets (K-23): twins of the hit strokes that take
    // no pointer events. After the nodes, so the ties' Tab stop comes after
    // the nodes' one, while the pointer still finds a node over a tie.
    this.gLinkKeys = this.gZoom.append('g').attr('class', 'rc-graph-link-keys');
    // +N badges of collapsed pairs sit above the nodes: on a tight grid the
    // tie's visible stretch is often covered by an endpoint's label.
    this.gLinkBadges = this.gZoom.append('g').attr('class', 'rc-graph-link-badges');

    // The type legend — HTML, outside the SVG so it never overlaps nodes. Its
    // own name: the base's _legendEl is the header legend (`legend`).
    this._typeLegendEl = document.createElement('div');
    this._typeLegendEl.className = 'rc-graph-legend rc-legend';
    this.container.appendChild(this._typeLegendEl);

    if (this.options.zoom !== false) {
      this._zoom = d3.zoom()
        // Explicit extent: the default reads the svg's width/height
        // attributes ('100%') or viewBox, which not every environment
        // resolves to pixels — the silent reset transform then threw.
        .extent(function () { return [[0, 0], [this.clientWidth || 1, this.clientHeight || 1]]; })
        .scaleExtent([0.2, 4])
        .on('zoom', event => {
          this.gZoom.attr('transform', event.transform);
          this._maybeSemanticZoom(event.transform.k);
        });

      // The buttons zoom, a drag pans, Ctrl/⌘ + wheel zooms; on a phone two
      // fingers pan and pinch. A plain wheel and one finger are the page's,
      // with a hint over the drawing (core/zoomGesture.js).
      this._zoomHint = bindZoom(this.svg, this._zoom, {
        container: this.container,
        theme:     this.theme,
        box:       () => this._drawingBox(),
      });
      this.svg.on('dblclick.zoom', null);
    }
    this._initTools();
  }

  // Full screen: the Fullscreen API where it exists (Esc exits natively),
  // otherwise a fixed overlay with our own Esc. The card stretches to the
  // screen; the resize re-lays the graph out, so more of it fits.
  toggleFullscreen(on = !this._expanded) {
    const el = this.container;
    if (on === this._expanded) return this;
    if (el.requestFullscreen && document.fullscreenEnabled !== false) {
      if (on) el.requestFullscreen().catch(() => this._syncFullscreen(true));
      else if (document.fullscreenElement === el) document.exitFullscreen();
      else this._syncFullscreen(false);
    } else {
      this._syncFullscreen(on);
    }
    return this;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // The header's fit first (RC-066): the drawing measures the svg, not
  // this.height, which is where the other charts fit it. Then the drawing,
  // then the svg's role from what it holds.
  render() {
    this._fitHeader();
    this._renderDrawing();
    this._syncSvgRole();
  }

  // A group while the drawing has focusable nodes or ties — an image would
  // hide those buttons from assistive technology — an image while it has
  // none (K-24).
  _syncSvgRole() {
    this.svg?.attr('role', this.svg.select('[tabindex]').empty() ? 'img' : 'group');
  }

  _renderDrawing() {
    if (!this._viewData?.nodes?.length) {
      // Flow view emptied by setData: clear the trace, its legend and the
      // time controls instead of leaving the previous drawing.
      if (this._view === 'flow') {
        this._flowView?.clear();
        if (this._typeLegendEl) renderLegendItems(this._typeLegendEl, []);
        if (this._tooltip?.isPinned) this._tooltip.unpin();
        this._tooltip?.hide?.();
        const f = this._flowView;
        const hadSelection = !!f?.selected;
        if (f) {
          f.selected = null;
          // what the previous render drew is gone: details and select() must
          // not resolve against it
          f._lastVisible = null;
          f._select = null;
        }
        this._detailsSubject = null;
        this._refreshDetails();
        if (hadSelection && typeof this.options.onSelect === 'function') {
          this._emit(this.options.onSelect, { node: null, link: null, event: null });
        }
        if (this._hasTimeNav()) {
          this._syncTimeframeButtons(null);
          this._syncNavigator();
        }
      }
      return;
    }

    // Details panel beside the drawing takes its width from the layout.
    const reserve = this._layoutDetails();

    if (this._view === 'flow') {
      // Narrow containers scroll sideways instead of crushing the lanes —
      // the drawing only, inside its own wrapper: the title, buttons,
      // legend, navigator, details panel and footer stay put (D5).
      const minW = this.options.minWidth ?? 0;
      if (minW) this._wrapForScroll();
      this.svg.style('min-width', minW ? `${minW + reserve}px` : null);
    }

    // Measure the svg itself: the base Chart's width/height getters model
    // axis charts and can disagree with the real viewport by the header
    // height — a grid layout that uses the full area would get clipped.
    const svgEl = this.svg?.node();
    const svgW = svgEl?.clientWidth  || this.width;
    const W = svgW - reserve;
    const H = svgEl?.clientHeight || this.height;
    if (W <= 0 || H <= 0) return;

    if (this._view === 'flow') {
      // One view owns the canvas: clear what ego/path/cluster left behind.
      [this.gSectors, this.gLinks, this.gLinkHits, this.gLinkBadges, this.gNodes, this.gLinkKeys]
        .forEach(g => g?.selectAll('*').remove());
      this.gRoot.selectAll('.rc-graph-row-label').remove();
      if (this._overflowNoteEl) this._overflowNoteEl.hidden = true;
      if (this._hiddenNoteEl) this._hiddenNoteEl.hidden = true;
      if (this._tooltip?.isPinned) this._tooltip.unpin();
      if (this._hasTimeNav()) this._flow().window = this._syncLinkTimeView();
      this._flow().render(W, H);
      this._hasRendered = true;
      this._renderedSize = { W: svgW, H };
      this._refreshDetails();
      this._placeDetails(svgEl);
      this._refitIfResized();
      return;
    }
    this._flowView?.clear();
    this._renderNetwork(W, H);

    this._hasRendered = true;
    this._renderedSize = { W: svgW, H };
    this._refreshDetails();
    this._placeDetails(svgEl);
    this._refitIfResized();
  }

  // The svg moves, in place, into a div.rc-graph-scroll that scrolls
  // sideways (rare-charts.css); created once, on the first render that
  // needs it.
  _wrapForScroll() {
    if (this._scrollEl) return;
    const svgEl = this.svg.node();
    const wrap = document.createElement('div');
    wrap.className = 'rc-graph-scroll';
    svgEl.replaceWith(wrap);
    wrap.appendChild(svgEl);
    this._scrollEl = wrap;
  }

  // Chrome drawn after the layout — the legend for the new view, the
  // breadcrumb trail after a navigation — takes height from the svg (it is
  // a flex child of a fixed-height card), and nothing resizes the container
  // to tell us. Without this check the bottom row ended up below the edge.
  _refitIfResized() {
    if (this._refitting || !this._renderedSize) return;
    const svgEl = this.svg?.node();
    const w = svgEl?.clientWidth, h = svgEl?.clientHeight;
    if (!w || !h) return;
    if (Math.abs(w - this._renderedSize.W) <= 1 && Math.abs(h - this._renderedSize.H) <= 1) return;
    this._refitting = true;
    try { this.render(); } finally { this._refitting = false; }
  }

  // The drawing's box in the card's frame, where the zoom hint centres and
  // the loading bar lies (the base Chart's _plotBox): the svg's, less a
  // details panel beside it (it sits over the svg's right side).
  _plotBox() {
    return this._drawingBox();
  }

  _drawingBox() {
    const box = boxInCard(this.svg.node(), this.container);
    if (this._detailsEl && this.container.classList.contains('rc-graph--details-side')) {
      box.width = Math.max(0, box.width - (this.options.detailsWidth ?? 300) - 12);
    }
    return box;
  }

  // A point of the drawing (zoom-group coordinates) in the card's frame,
  // where tooltips are placed — for tooltips opened from the keyboard.
  _toCard(x, y) {
    const svgEl = this.svg.node();
    const [sx, sy] = d3.zoomTransform(svgEl).apply([x, y]);
    const svgBox = svgEl.getBoundingClientRect();
    const cardBox = this.container.getBoundingClientRect();
    return [
      sx + svgBox.left - cardBox.left - this.container.clientLeft,
      sy + svgBox.top - cardBox.top - this.container.clientTop,
    ];
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
    // finally: an exception here must not leave semantic zoom switched off
    try {
      this.svg.call(this._zoom.transform, d3.zoomIdentity);
    } finally {
      this._switching = was;
    }
  }

  // ─── Relation filter and history ─────────────────────────────────────────

  // null or [] → every type; NO_RELATION_TYPES (the legend's "nothing
  // shown") → an empty set, which no public call makes.
  _setRelationTypesState(types) {
    if (types === NO_RELATION_TYPES) {
      this._relationTypes = new Set();
      return;
    }
    const list = types == null ? [] : [...types].map(String);
    this._relationTypes = list.length ? new Set(list) : null;
  }

  _activeRelationTypes() { return this._relationTypes ? [...this._relationTypes] : null; }

  // `replace`: the new state takes the last entry's place. Returns the
  // entry pushed, or null (the same state as the last, a restore).
  _recordHistory(state, { replace = false } = {}) {
    if (this._skipHistoryOnce) {
      this._skipHistoryOnce = false;
      this._renderBreadcrumbs();
      return null;
    }
    // Types are a set: sort them so {a,b} and {b,a} dedupe to one entry.
    const normalized = { ...state, types: state.types ? [...state.types].sort() : null };
    if (replace) this._history.pop();
    const last = this._history[this._history.length - 1];
    let entry = null;
    if (JSON.stringify(last) !== JSON.stringify(normalized)) {
      this._history.push(normalized);
      entry = normalized;
    }
    const max = Math.max(1, this.options.historyLimit ?? 12);
    if (this._history.length > max) this._history.splice(0, this._history.length - max);
    this._renderBreadcrumbs();
    return entry;
  }

  _restoreState(state) {
    if (state.view === 'path') {
      this._setRelationTypesState(state.types);
      this.connect(state.a, state.b);
    } else if (state.view === 'cluster') {
      this._setRelationTypesState(state.types);
      this.overview();
    } else {
      // Ego restores carry the filter through focus() so it is applied in
      // queue order, exactly like a user-issued focus.
      this.focus(state.root, { types: state.types ?? null });
    }
  }

  // ─── Tie categories ───────────────────────────────────────────────────────

  // A tie's category { key, color, dash, label } (core/links.js
  // resolveLinkType): by `type` in ego/path/cluster, by linkColorBy in the
  // flow view — the tooltip and the details panel say what the drawing shows.
  _linkTypeOf(l) {
    if (this._view === 'flow' && this._flowView) return this._flowView.typeOf(l);
    return this._typeInfo(l.type);
  }

  _typeInfo(type) {
    const keys = [...new Set([...Object.keys(this._linkTypes), ...this._knownTypes])];
    return resolveLinkType(this._linkTypes, type, { keys, theme: this.theme });
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _requireSource() {
    if (!this._source) {
      throw new Error('RareCharts.Graph: no data source — pass options.dataSource or call setData()');
    }
    return this._source;
  }

  // View changes queue up so rapid clicks can't interleave fetch + render.
  // A view task captured the data generation before awaiting its source; if
  // setData() or destroy() happened meanwhile, its result is dropped.
  _isStale(gen) {
    return this._destroyed || gen !== this._dataGen;
  }

  _enqueue(task) {
    this._ready = this._ready
      // a task queued (or still waiting) when the chart is destroyed is dropped
      .then(() => (this._destroyed ? undefined : task()))
      .catch(err => {
        // A failed restore must not leave the one-shot history skip armed:
        // the next successful view change still has to record itself.
        this._skipHistoryOnce = false;
        console.error('RareCharts.Graph:', err);
      });
    return this;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    this._dataGen++;
    // Leave full screen first: the overlay fallback is position: fixed over
    // the whole page, and native full screen would keep an emptied element.
    if (this._expanded) {
      if (typeof document !== 'undefined' && document.fullscreenElement === this.container) {
        document.exitFullscreen?.().catch?.(() => {});
      }
      this._expanded = false;
    }
    if (this._onFullscreenChange) document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    if (this._onFullscreenKey) document.removeEventListener('keydown', this._onFullscreenKey);
    super.destroy();
    this._typeLegendEl = null;
  }
}

// The methods kept in their own files (D-11) join the class as if written
// in it: non-enumerable, like class methods, with `this` the chart.
[networkView, graphChrome, graphTooltips].forEach(part => {
  Object.entries(Object.getOwnPropertyDescriptors(part)).forEach(([name, desc]) => {
    Object.defineProperty(Graph.prototype, name, { ...desc, enumerable: false });
  });
});

export { linkPresets } from './presets/linkPresets.js';
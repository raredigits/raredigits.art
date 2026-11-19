// RareCharts — graph/views/flow.js
// Graph `view: 'flow'` — a trace of value moving between entities: money
// trails, supply chains, address investigations. Nodes stand in ordered
// lanes (networks, stages, jurisdictions) and flow left to right; ties are
// directed, may repeat between one pair, and carry value (width), category
// (color), certainty (dash) and labels.
//
// Stage 1 (0.9.8_3): layout from data hints — `lane` (required), `row`,
// `col`, exact `x`/`y`. Stage 2 (0.9.8_6): automatic in-lane layout for
// nodes without hints (layouts/flowAuto.js), folds that collapse a set of
// nodes into one +/− meta-node, tie aggregation, a per-lane cap, and time
// navigation (timeframes / navigator, wired in Graph). The decisions:
// assets/charts/docs/DECISIONS.md §13, Flow view.
//
// Parts: layoutFlow() is pure (no DOM) and unit-tested; flowFold.js folds and
// aggregates (pure); FlowView draws inside the Graph's zoom group and owns
// the view's interaction.

import * as d3 from 'd3';
import {
  applyTimeWindow, linkValue, linkWidthScale, parallelIndex, quadBow, quadPoint, resolveLinkType,
} from '../../core/links.js';
import { estimateTextWidth, placeFirstFree } from '../../core/renderHelpers.js';
import { escapeHtml as esc, tipBody, tipTitle, tipSub, tipKind, tipNum } from '../../core/html.js';
import { autoFlowHints } from '../layouts/flowAuto.js';
import { renderLegendItems, shapeParts } from '../../core/legend.js';
import { GRAPH_LEGEND_ALIAS, drawnDash } from '../chrome.js';
import { rovingTabindex, holdsFocus, listStep, enterPinnedTip } from '../roving.js';
import { resolveFolds, foldGraph, metaId, META_PREFIX } from './flowFold.js';

// ─── Layout ─────────────────────────────────────────────────────────────────

// A node's lane as given (not yet a lane id): a folded meta-node's `_lane`
// (its anchor's lane, flowFold.js) wins, else `laneBy` — a field name or a
// function of the node. Only an undefined `_lane` falls through.
export function laneOfNode(n, laneBy = 'lane') {
  if (n._lane !== undefined) return n._lane;
  return typeof laneBy === 'function' ? laneBy(n) : n[laneBy];
}

// Positions from hints. Lanes split the width by `weight`; a lane holds
// sub-columns (`col`, default 0) and rows (`row`: 0 = the main line, ±1, ±2
// above/below). Exact `x`/`y` are fractions: `x` of the lane width, `y` of
// the drawing height below the lane headers. Nodes that still share a spot
// are pushed apart vertically.
//
// layout 'auto' (default): nodes without any hint get `col`/`row` from the
// ties (layouts/flowAuto.js), and a lane without a declared weight is as
// wide as its columns. layout 'hints': a node without `row` takes the next
// free row of its cell — 0, then 1, −1, 2, −2… — in input order (stage 1).
// A drawing too short for its rows gives up its top and bottom padding
// (down to minPad) before rows get closer than a node and its captions.
export function layoutFlow({ nodes = [], lanes = [], links = [] } = {}, {
  width = 900,
  height = 600,
  laneBy = 'lane',
  layout = 'auto',
  header = 34,
  pad = 24,
  minGap = 56,
  nodeRadius = 18,
  captionRoom = 36,   // below a node's edge: label + sub line
  padBottom = pad,    // extra room under the drawing (e.g. zoom controls)
  minPad = 8,         // the least either padding shrinks to (C-38)
  timeZone = 'local', // the chart's: the automatic hints order ties by start in it
  hints = null,       // the automatic hints of an earlier call on the same nodes,
                      // links and lanes (they do not depend on the size): reused
} = {}) {
  // Each node's lane id, resolved once and kept by input position (the
  // automatic hints below copy a node, never move it to another lane); a
  // node without a lane stands in the lane ''.
  const laneIds = nodes.map(n => String(laneOfNode(n, laneBy) ?? ''));
  const colOf = n => (Number.isInteger(n.col) && n.col >= 0 ? n.col : 0);

  // Lanes: declared order first, then any lane only the data mentions.
  const laneList = lanes.map(l => ({ id: String(l.id), label: l.label ?? String(l.id), weight: l.weight, declared: l.weight != null }));
  const known = new Set(laneList.map(l => l.id));
  laneIds.forEach(id => {
    if (!known.has(id)) {
      known.add(id);
      laneList.push({ id, label: id, weight: undefined, declared: false });
    }
  });
  const laneIdx = new Map(laneList.map((l, i) => [l.id, i]));

  // Automatic hints for nodes that carry none.
  let auto = null;
  if (layout === 'auto' && nodes.length) {
    const laneAt = new Map(nodes.map((n, i) => [n, laneIds[i]]));
    auto = hints ?? autoFlowHints({
      nodes, links,
      laneOf: n => laneAt.get(n),
      laneIndex: id => laneIdx.get(id) ?? 0,
      timeZone,
    }).hints;
    if (auto.size) nodes = nodes.map(n => (auto.has(n.id) ? { ...n, ...auto.get(n.id) } : n));
  }

  // Cells: lane × col. Columns per lane (at least one), counted once: they
  // size an undeclared lane and split each lane's width.
  const colsPerLane = new Map();
  nodes.forEach((n, i) => {
    colsPerLane.set(laneIds[i], Math.max(colsPerLane.get(laneIds[i]) ?? 1, colOf(n) + 1));
  });
  laneList.forEach(l => {
    // undeclared lanes widen with their columns only when the automaton
    // placed something (an empty map is truthy: a fully hinted trace keeps
    // the stage-1 equal widths)
    if (!l.declared) l.weight = auto?.size ? (colsPerLane.get(l.id) ?? 1) : 1;
    delete l.declared;
  });
  const totalW = laneList.reduce((s, l) => s + l.weight, 0) || 1;
  let x = 0;
  laneList.forEach(l => {
    l.x0 = x;
    l.x1 = x + (l.weight / totalW) * width;
    x = l.x1;
  });
  const laneById = new Map(laneList.map(l => [l.id, l]));

  // Rows: explicit first, then fill free rows per cell in input order.
  const rowOf = new Map();
  const taken = new Map();   // cell key → Set(rows)
  const cellKey = (n, i) => `${laneIds[i]}|${colOf(n)}`;
  nodes.forEach((n, i) => {
    if (Number.isFinite(n.row)) {
      rowOf.set(n.id, n.row);
      const k = cellKey(n, i);
      if (!taken.has(k)) taken.set(k, new Set());
      taken.get(k).add(n.row);
    }
  });
  const freeRows = function* () {
    yield 0;
    for (let i = 1; ; i++) { yield i; yield -i; }
  };
  nodes.forEach((n, i) => {
    if (rowOf.has(n.id)) return;
    const k = cellKey(n, i);
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
  // A row needs a node, its caption (two lines with a `sub`) and the top of
  // the node below with its fold switch. A drawing too short for that gives
  // its top and bottom padding to the rows first, down to minPad (C-38).
  let padTop = pad, padBot = padBottom;
  if (span) {
    const needStep = 2 * nodeRadius + (nodes.some(n => n.sub) ? 38 : 24);
    const bandAt = (pt, pb) => Math.max(1, height - header - pt - pb) - nodeRadius * 2 - captionRoom;
    const short = needStep * span - bandAt(pad, padBottom);
    if (short > 0) {
      // evenly from both, then what one side still has
      const spareTop = Math.max(0, pad - minPad), spareBot = Math.max(0, padBottom - minPad);
      const t = Math.min(spareTop, short / 2);
      const b = Math.min(spareBot, short - t);
      padTop = pad - t - Math.min(spareTop - t, short - t - b);
      padBot = padBottom - b;
    }
  }
  const top = header + padTop;
  const usableH = Math.max(1, height - top - padBot);
  const bandTop = top + nodeRadius;
  const bandH = Math.max(1, usableH - nodeRadius * 2 - captionRoom);
  const rowStep = span ? Math.min(120, bandH / span) : 0;
  // A short span sits centred in the band rather than pinned to its top.
  const bandOffset = span ? (bandH - rowStep * span) / 2 : bandH / 2;
  const rowY = r => bandTop + bandOffset + (r - minRow) * rowStep;

  const positions = new Map();
  nodes.forEach((n, i) => {
    const lane = laneById.get(laneIds[i]);
    const cols = colsPerLane.get(lane.id);
    const c = colOf(n);
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

  return { positions, lanes: laneList, top, height, colsPerLane, hints: auto };
}

// ─── View ───────────────────────────────────────────────────────────────────

const SHAPES = ['circle', 'square', 'diamond', 'stack'];
// The dash of a tie the page's linkDash marks (an amount derived, not read).
const LINK_DASH = '6 5';
const sameSelection = (a, b) => (a?.node ?? null) === (b?.node ?? null) && (a?.link ?? null) === (b?.link ?? null);

// A web font that finishes loading changes every caption's width: the
// fitted captions (FlowView._fitCaption) start over. One listener for the
// page, set on the first fit.
let fontEpoch = 0;
let fontsWatched = false;
function watchFonts() {
  if (fontsWatched) return;
  fontsWatched = true;
  try { globalThis.document?.fonts?.addEventListener?.('loadingdone', () => { fontEpoch += 1; }); } catch { /* no FontFaceSet */ }
}

export class FlowView {
  constructor(graph) {
    this.g = graph;
    this.data = { nodes: [], links: [] };
    this.filter = null;
    this.window = null;
    // The hidden tie categories are the chart's hidden set, graph._hiddenKeys:
    // seeded from hiddenLinkTypes, turned on and off by the legend and
    // setLinkTypesVisible, kept across setData.
    this.selected = null;          // { node: id } | { link: id }
    this.labels = graph.options.linkLabels !== false;
    // Fold id → collapsed. Seeded from each fold's `collapsed` (lane-cap
    // folds start collapsed); kept across setData so a reload of the same
    // trace keeps what the reader opened.
    this.foldState = new Map();
    // keyboard: the node and the tie holding each set's Tab stop (K-20)
    this._nodeRoving = { current: null };
    this._tieRoving = { current: null };
    this.layer = graph.gZoom.append('g').attr('class', 'rc-flow');
    this.gLanes = this.layer.append('g').attr('class', 'rc-flow-lanes');
    this.gHulls = this.layer.append('g').attr('class', 'rc-flow-hulls');
    this.gLinks = this.layer.append('g').attr('class', 'rc-flow-links');
    this.gHits  = this.layer.append('g').attr('class', 'rc-flow-link-hits');
    this.gNodes = this.layer.append('g').attr('class', 'rc-flow-nodes');
    // Tie labels above the nodes: they are placed clear of node shapes and
    // captions, so drawing them on top never hides a node.
    this.gLinkLabels = this.layer.append('g').attr('class', 'rc-flow-link-labels');
  }

  setData({ nodes, links }) {
    this.data = { nodes, links };
    this._foldCache = null;
    this._keyList = null;
    this._layoutCache = null;
  }

  // ── Caches (K-16) ──
  // The whole trace's layout does not depend on the filter, the legend or
  // the time window: a brush move or a legend click reuses it. It is laid
  // out again for a new payload, size, fold state or lane option, and at a
  // new size only placed again: the folded trace and the automatic hints
  // (layouts/flowAuto.js) do not depend on it.
  _layout(W, H, R) {
    const o = this.g.options;
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    const traceKey = [this.data, this._folds(), [...this._collapsed()].join('\u0000'),
      this._opt('laneBy', 'lane'), o.layout ?? 'auto', JSON.stringify(o.lanes ?? []), this.g._zone(),
      !!this._opt('aggregateLinks', false), o.linkColorBy];
    const c = this._layoutCache;
    if (c && same(c.traceKey, traceKey) && same(c.sizeKey, [W, H, R])) return c;
    const reuse = c && same(c.traceKey, traceKey) ? c : null;
    const whole = reuse?.whole ?? this._fold(this.data);
    const out = layoutFlow(
      { nodes: whole.nodes, links: whole.links, lanes: o.lanes ?? [] },
      { width: W, height: H, laneBy: this._opt('laneBy', 'lane'), layout: o.layout ?? 'auto', nodeRadius: R,
        timeZone: this.g._zone(), hints: reuse?.hints ?? null });
    this._layoutCache = { traceKey, sizeKey: [W, H, R], whole, ...out };
    return this._layoutCache;
  }

  // Captions cut to their room as fitTextNode cuts them — the same strings
  // measured, the same result — but all at once: every caption is written,
  // then every one measured, then the ones too wide lose a character each,
  // and so on. A measure after a write lays the drawing out again, so one
  // caption at a time cost a layout per character per caption (K-16).
  // Each result is remembered by kind, room and text, so a redraw at the
  // same size measures nothing, and an uncut width by kind and text, so at
  // a new size a caption that fits is not measured again. Where text cannot
  // be measured (jsdom) this does what fitTextNode does: nothing. A caption
  // measured 0 px wide (not laid out) is not remembered.
  _fitCaptions(items) {
    if (!items.length || !items[0][0].getComputedTextLength) return;
    watchFonts();
    if (!this._captions || this._captionEpoch !== fontEpoch || this._captions.size > 5000) {
      this._captions = new Map();
      this._captionWidths = new Map();
      this._captionEpoch = fontEpoch;
    }
    const width = node => { try { return node.getComputedTextLength(); } catch { return 0; } };
    let pending = [];
    items.forEach(([node, text, room, kind]) => {
      const full = String(text);
      const key = `${kind}\u0000${room}\u0000${full}`;
      const wKey = `${kind}\u0000${full}`;
      const known = this._captions.get(key);
      const wide = this._captionWidths.get(wKey);
      if (known != null || (wide != null && wide <= room)) {
        node.textContent = known ?? full;
        if (known == null) this._captions.set(key, full);
        return;
      }
      node.textContent = full;
      pending.push({ node, full, s: full, room, key, wKey });
    });
    let first = true;
    while (pending.length) {
      const next = [];
      pending.forEach(c => {
        const w = width(c.node);
        if (c.s.length > 1 && w > c.room) { next.push(c); return; }
        if (!(w > 0) && c.full) return;
        this._captions.set(c.key, c.node.textContent);
        if (first) this._captionWidths.set(c.wKey, w);
      });
      next.forEach(c => {
        c.s = c.s.slice(0, -1).trimEnd();
        c.node.textContent = `${c.s}…`;
      });
      pending = next;
      first = false;
    }
  }

  clear() {
    [this.gLanes, this.gHulls, this.gLinks, this.gHits, this.gLinkLabels, this.gNodes]
      .forEach(g => g.selectAll('*').remove());
  }

  // ── Option helpers ──
  _opt(name, fallback) { return this.g.options[name] ?? fallback; }
  _laneOf(n) { return laneOfNode(n, this._opt('laneBy', 'lane')); }
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
    if (n.fold != null && n.id.startsWith(META_PREFIX)) return 'stack';
    return this._shapeOfKind(this._kindOf(n));
  }
  // A node's kind, by shapeBy: a field name or a function of the node.
  _kindOf(n) {
    const by = this._opt('shapeBy', 'kind');
    return typeof by === 'function' ? by(n) : n[by];
  }
  // The shape a kind draws. The nodeShapes map first (an SVG path comes
  // only from there); a kind that names a built-in shape is that shape; any
  // other kind is a circle. A kind value is never drawn as a path itself:
  // 'mixer' or 'Multisig' made an invisible <path d="mixer">. A map value
  // that is neither a built-in name nor a path draws a circle, so it is one.
  _shapeOfKind(key) {
    const map = this._opt('nodeShapes', {}) ?? {};
    if (key != null && Object.prototype.hasOwnProperty.call(map, key) && map[key] != null) {
      const shape = map[key];
      return SHAPES.includes(shape) || /^[Mm]/.test(String(shape)) ? shape : 'circle';
    }
    return SHAPES.includes(key) ? key : 'circle';
  }
  _linkKey(l) {
    const by = this._opt('linkColorBy', 'type');
    const v = typeof by === 'function' ? by(l) : l[by];
    return v == null ? 'default' : String(v);
  }

  // The tie categories of the trace, in data order (cached per payload).
  linkKeys() {
    return this._keyList ??= [...new Set(this.data.links.map(x => this._linkKey(x)))];
  }

  // A tie's category (by linkColorBy) → { key, color, dash, label }, the
  // rule every relation chart shares (core/links.js resolveLinkType). The
  // Graph's tooltip and details panel ask here, so they name the category
  // the drawing shows.
  typeOf(l) {
    return this._typeOfKey(this._linkKey(l));
  }

  _typeOfKey(key) {
    return resolveLinkType(this._opt('linkTypes', {}), key, { keys: this.linkKeys(), theme: this.g.theme });
  }

  // ── Folds ──
  // The page's folds plus, with laneCap, one per crowded lane holding its
  // lightest nodes ("+N more"). Resolved once per payload.
  _folds() {
    if (this._foldCache) return this._foldCache;
    const nodes = this.data.nodes;
    const user = resolveFolds(nodes, this._opt('folds', []));
    const cap = this._opt('laneCap', null);
    const extra = [];
    if (Number.isInteger(cap) && cap >= 1) {
      const claimed = new Set(user.flatMap(f => f.members));
      const weight = new Map(nodes.map(n => [n.id, [0, 0]]));
      this.data.links.forEach(l => [l.source, l.target].forEach(id => {
        const w = weight.get(id);
        if (!w) return;
        w[0] += linkValue(l) ?? 0;
        w[1] += 1;
      }));
      const index = new Map(nodes.map((n, i) => [n.id, i]));
      d3.group(nodes.filter(n => !claimed.has(n.id)), n => String(this._laneOf(n) ?? ''))
        .forEach((list, lane) => {
          if (list.length <= cap) return;
          const ranked = list.slice().sort((a, b) => {
            const wa = weight.get(a.id), wb = weight.get(b.id);
            return (wb[0] - wa[0]) || (wb[1] - wa[1]) || (index.get(a.id) - index.get(b.id));
          });
          const rest = ranked.slice(Math.max(0, cap - 1)).sort((a, b) => index.get(a.id) - index.get(b.id));
          extra.push({
            id: `lane:${lane}`, members: rest.map(n => n.id), collapsed: true,
            label: `+${rest.length} more`, sub: '', laneCap: true,
          });
        });
    }
    const folds = user.concat(resolveFolds(nodes, extra));
    folds.forEach(f => {
      if (!this.foldState.has(f.id)) this.foldState.set(f.id, !!f.collapsed);
    });
    this._foldCache = folds;
    return folds;
  }

  _collapsed() {
    return new Set(this._folds().filter(f => this.foldState.get(f.id)).map(f => f.id));
  }

  _fold(payload) {
    return foldGraph(payload, this._folds(), this._collapsed(), {
      keyOf: l => this._linkKey(l),
      aggregate: !!this._opt('aggregateLinks', false),
      laneOf: n => this._laneOf(n),
      timeZone: this.g._zone(),
    });
  }

  isCollapsed(id) { return !!this.foldState.get(String(id)); }

  // Collapse or expand a fold. The selection follows: a selected member
  // becomes the selected meta-node, a selected meta-node its anchor.
  setCollapsed(id, collapsed, event = null) {
    id = String(id);
    const fold = this._folds().find(f => f.id === id);
    if (!fold || this.isCollapsed(id) === !!collapsed) return false;
    this.foldState.set(id, !!collapsed);
    // The selection follows into and out of the fold at render
    // (_resolveSelection), which also tells onSelect.
    const cb = this._opt('onFoldChange', null);
    this.g._emit(cb, { id, collapsed: !!collapsed, fold, event });   // nothing after destroy() (C-33)
    return true;
  }

  // ── Visibility ──
  // Filter, legend and time window work on the original nodes and ties;
  // folds and aggregation apply to what passes.
  _visible() {
    const pass = item => !this.filter || this.filter(item);
    let nodes = this.data.nodes.filter(pass);
    let keep = new Set(nodes.map(n => n.id));
    const shown = this.data.links.filter(l => pass(l) && keep.has(l.source) && keep.has(l.target));
    const hidden = this.g._hiddenKeys;
    let links = shown.filter(l => !hidden.has(this._linkKey(l)));
    // A node whose every tie belongs to a category hidden in the legend goes
    // with them — a decoy address without its fake transfers would just
    // float there. Nodes without any ties stay.
    if (links.length < shown.length) {
      const hasTie = new Set(), hasVisible = new Set();
      shown.forEach(l => { hasTie.add(l.source); hasTie.add(l.target); });
      links.forEach(l => { hasVisible.add(l.source); hasVisible.add(l.target); });
      nodes = nodes.filter(n => !hasTie.has(n.id) || hasVisible.has(n.id));
      keep = new Set(nodes.map(n => n.id));
      links = links.filter(l => keep.has(l.source) && keep.has(l.target));
    }
    const timed = applyTimeWindow(links, this.window, this._opt('timeWindowMode', 'dim'), this.g._zone());
    const out = this._fold({ nodes, links: timed });
    // Nodes with ties before the time window — as drawn, a folded member by
    // its meta-node, ties inside a fold not counted. A node among them with
    // no tie in the window fades, in 'hide' mode too: there the window
    // removes its ties, and the node used to stay at full strength.
    const tied = new Set();
    links.forEach(l => {
      const s = out.metaOf.get(l.source) ?? l.source;
      const t = out.metaOf.get(l.target) ?? l.target;
      if (s === t && (s !== l.source || t !== l.target)) return;
      tied.add(s); tied.add(t);
    });
    return { ...out, tied };
  }

  // ── Render ──
  render(W, H) {
    const graph = this.g;
    const t = graph.theme;
    const o = graph.options;
    const palette = t.colors ?? ['#888'];
    const R = o.nodeRadius ?? 18;

    // Positions come from the whole trace (folded as it stands), so the
    // filter, the legend and the time window never move a node.
    const { whole, positions, lanes, colsPerLane } = this._layout(W, H, R);
    const { nodes, links, metas, metaOf, tied } = this._visible();
    const byId = new Map(nodes.map(n => [n.id, n]));
    const resolve = s => this._resolveSelection(s, byId, links, metaOf);
    const prevSelection = this.selected;
    this.selected = resolve(prevSelection);
    // Fold switches: "+" on a collapsed meta-node, "−" on an open fold's
    // anchor — or, when the anchor is filtered or hidden, on its first
    // member still drawn, so the fold can always be closed.
    const folds = this._folds();
    const foldOfAnchor = new Map(folds.filter(f => !this.isCollapsed(f.id)).flatMap(f => {
      const shown = this._shownMember(f, byId);
      return shown ? [[shown, f]] : [];
    }));
    const switchOf = n => (metas.has(n.id) ? { fold: metas.get(n.id), open: false }
      : foldOfAnchor.has(n.id) ? { fold: foldOfAnchor.get(n.id), open: true } : null);

    // Active = in the time window; a node with ties but none active fades
    // (in both timeWindowMode settings — `tied` counts ties before the window).
    const active = links.filter(l => !l._dim);
    const live = new Set();
    active.forEach(l => { live.add(l.source); live.add(l.target); });
    const nodeDim = n => tied.has(n.id) && !live.has(n.id);

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
    // A band, not a convex hull: a group that snakes across lanes (one owner's
    // wallets on five networks) reads as one stroke; a hull would cover the
    // lanes between them.
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
    const widthOf = linkWidthScale(this.data.links.concat(whole.links), {
      min: 1.6, max: 22, ...(o.linkWidth ?? {}),
    });
    const types = o.linkTypes ?? {};
    const keys = [...new Set(this.data.links.map(l => this._linkKey(l)))];
    const colorOf = l => this.typeOf(l).color;
    const dashOf = l => {
      const fromType = this.typeOf(l).dash;
      if (fromType) return fromType;
      if (!o.linkDash) return null;
      // an aggregated tie is dashed only when every tie in it is
      const dashed = l.links ? l.links.every(x => o.linkDash(x)) : o.linkDash(l);
      return dashed ? LINK_DASH : null;
    };

    // ids by position: a category may hold characters an id cannot
    // (Cyrillic, spaces), and two categories must never share one marker
    const markerId = key => `${graph._uid}-flow-arrow-${keys.indexOf(key)}`;
    graph._defs.selectAll('.rc-flow-arrow').remove();
    keys.forEach(key => {
      const color = resolveLinkType(types, key, { keys, theme: t }).color;
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
      // A tie bows by its `bend` — 0.35 by default when it is alone, 0 when
      // it has parallel ties, which fan out from there 2 bends apart. A bend
      // of 1 is 18% of the distance between the nodes, at most 60 px.
      const { count = 1, offset = 0 } = par.get(l.id) ?? {};
      const bend = (l.bend ?? (count > 1 ? 0 : 0.35)) + offset * 2;
      const q = quadBow(a, b, { from: R + 2, to: R + 4, bow: len => bend * Math.min(60, len * 0.18) });
      // Outward normal of the bow: the side a label can step towards.
      const side = q.off >= 0 ? 1 : -1;
      return {
        d: q.d,
        mid: quadPoint(q, 0.5),
        out: { x: q.n.x * side, y: q.n.y * side },
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

    // Read before the join (removing the focused tie fires blur, which
    // clears the pointer flag): a click that changed the view is no reason
    // to move keyboard focus.
    const tiesHadFocus = holdsFocus(this.gHits.node()) && !this._pointerFocus;
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
    // the tooltip. Node shapes, node captions and hull labels are obstacles.
    const roomOf = n => {
      const p = positions.get(n.id);
      const lane = lanes.find(l => l.id === p.lane);
      const cols = colsPerLane.get(p.lane) ?? 1;
      return lane ? (lane.x1 - lane.x0) / cols - 8 : 120;
    };
    const boxes = [];
    nodes.forEach(n => {
      const p = positions.get(n.id);
      const w = Math.min(roomOf(n), Math.max(2 * R, estimateTextWidth(n.label ?? n.id, 6.6), estimateTextWidth(n.sub ?? '', 6.4)));
      boxes.push({ x0: p.x - R, x1: p.x + R, y0: p.y - R, y1: p.y + R });
      boxes.push({ x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + R + 2, y1: p.y + R + (n.sub ? 34 : 20) });
    });
    hulls.forEach(h => {
      const x = h.pts[0].x - R, y = Math.max(...h.pts.map(p => p.y)) + R + 48;
      const w = estimateTextWidth(h.label ?? '', 6.2);
      boxes.push({ x0: x, x1: x + w, y0: y - 12, y1: y + 3 });
    });
    const labelAt = new Map();
    const labelled = this.labels ? links.filter(l => !l._dim && l.label != null && l.label !== '') : [];
    labelled.forEach(l => {
      const gm = geom(l);
      if (!gm) return;
      const w = estimateTextWidth(l.label, 6.4) + 6, h = 13;
      const tries = [0, 14, 28, 44].map(k => [gm.out.x * k, gm.out.y * k])
        .concat([[0, -16], [0, 16], [gm.out.x * 44, gm.out.y * 44 - 16]])
        .map(([ox, oy]) => ({ x: gm.mid.x + ox, y: gm.mid.y + oy }));
      const spot = placeFirstFree(tries, ({ x, y }) => ({ x0: x - w / 2, x1: x + w / 2, y0: y - 4 - h, y1: y - 4 }), boxes);
      if (!spot) return;
      boxes.push(spot.box);
      labelAt.set(l.id, spot.at);
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
    const nodesHadFocus = holdsFocus(this.gNodes.node());
    const nodeSel = this.gNodes.selectAll('.rc-flow-node')
      .data(ordered, n => n.id)
      .join(enter => enter.append('g').attr('class', 'rc-flow-node'))
      .attr('transform', n => {
        const p = positions.get(n.id);
        return `translate(${p.x},${p.y})`;
      })
      .attr('role', 'button')
      .attr('aria-label', n => [n.label ?? n.id, n.fold != null && metas.has(n.id) ? n.sub : null,
        this._groupCfg(n)?.label ?? n.group].filter(Boolean).join(' — '))
      .attr('aria-expanded', n => { const sw = switchOf(n); return sw ? String(sw.open) : null; })
      .style('cursor', 'pointer')
      .order();
    // Captions are fitted after every node is built: a measure between two
    // nodes' DOM writes would lay the drawing out again each time (K-16).
    const captions = [];
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
      // The parts of the shape. The legend key draws its glyphs with the same
      // function (core/legend.js), so a key row shows exactly this shape.
      shapeParts(shape, R).forEach(([tag, attrs]) => add(tag, attrs));
      // Captions are cut to the node's column width — the full text stays in
      // the tooltip and the accessible name.
      const room = roomOf(n);
      const label = g.append('text').attr('class', 'rc-flow-node-label')
        .attr('y', R + 16).attr('text-anchor', 'middle').attr('fill', t.text)
        .attr('stroke', t.bg).attr('stroke-width', 3).attr('paint-order', 'stroke');
      captions.push([label.node(), n.label ?? n.id, room, 'label']);
      if (n.sub) {
        const sub = g.append('text').attr('class', 'rc-flow-node-sub')
          .attr('y', R + 30).attr('text-anchor', 'middle').attr('fill', t.muted)
          .attr('stroke', t.bg).attr('stroke-width', 3).attr('paint-order', 'stroke');
        captions.push([sub.node(), n.sub, room, 'sub']);
      }
      if (n.terminal) {
        g.append('text').attr('class', 'rc-flow-node-sub')
          .attr('x', R + 6).attr('y', -R + 4).attr('fill', t.muted).text('end');
      }
      const sw = switchOf(n);
      if (sw) {
        // The switch sits on the node's upper-left shoulder; it toggles the
        // fold without selecting (the node itself still selects).
        const b = g.append('g').attr('class', 'rc-flow-fold-switch')
          .attr('transform', `translate(${-R * 0.78},${-R * 0.78})`)
          .attr('aria-hidden', 'true')
          .style('cursor', 'pointer')
          .on('click', event => {
            event.stopPropagation();
            this._toggle(sw.fold.id, event);
          });
        b.append('circle').attr('r', 8.5).attr('fill', t.bg).attr('stroke', t.text).attr('stroke-width', 1.4);
        b.append('path')
          .attr('d', sw.open ? 'M-4,0H4' : 'M-4,0H4M0,-4V4')
          .attr('stroke', t.text).attr('stroke-width', 1.8).attr('stroke-linecap', 'round');
        b.append('title').text(sw.open ? `Collapse ${sw.fold.label ?? sw.fold.id}` : `Expand ${sw.fold.label ?? sw.fold.id}`);
      }
    });
    this._fitCaptions(captions);

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
    this._lastVisible = { nodes, links };
    apply();

    // ── Interaction ──
    const nodeById = id => byId.get(id) ?? { id };
    const select = (s, event = null) => {
      if (s) {
        s = resolve(s);
        if (!s) return;                  // an id not in the drawing: nothing to select
      }
      this.selected = s;
      apply();
      this._preferStops?.();
      graph._showDetails(!s ? null
        : s.node ? { node: byId.get(s.node) ?? null }
        : { link: links.find(l => l.id === s.link) ?? null });
      // through _emit: no call after destroy() (C-33)
      if (!s) graph._emit(o.onSelect, { node: null, link: null, event });
      else if (s.node) graph._emit(o.onSelect, { node: byId.get(s.node) ?? null, link: null, event });
      else graph._emit(o.onSelect, { node: null, link: links.find(l => l.id === s.link) ?? null, event });
    };
    this._select = select;

    // ── Keyboard (K-20): the nodes share one Tab stop and the ties another
    // (graph/roving.js); the ties come first in the Tab order. The stop is
    // the selected node / tie, else the one focused last, else the first.
    const nodeStop = rovingTabindex(nodeSel, { state: this._nodeRoving, preferred: this.selected?.node ?? null });

    nodeSel
      .on('click', (event, n) => { event.stopPropagation(); select({ node: n.id }, event); })
      .on('keydown', (event, n) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select({ node: n.id }, event);
          return;
        }
        if (event.key === 'Escape') { select(null, event); return; }
        const sw = switchOf(n);
        if (sw && (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '−')) {
          event.preventDefault();
          const collapse = event.key === '-' || event.key === '−';
          if (collapse === sw.open) this._toggle(sw.fold.id, event, true);
          return;
        }
        const next = this._neighborFor(n, event.key, ordered, links, positions, lanes);
        if (next) {
          event.preventDefault();
          nodeStop.focus(next.id);
        }
      })
      .on('mouseover', (event, n) => {
        if (graph._tooltip.isPinned) return;
        const [mx, my] = d3.pointer(event, graph.container);
        const nodeLinks = links.filter(l => l.source === n.id || l.target === n.id);
        const html = o.tooltipFormat
          ? o.tooltipFormat({ node: n, links: nodeLinks })
          : this._nodeTooltip(n, nodeLinks, switchOf(n));
        graph._tooltip.show(mx, my, html);
      })
      .on('mouseout', () => { if (!graph._tooltip.isPinned) graph._tooltip.hide(); });

    const tieHtml = l => {
      const source = nodeById(l.source), target = nodeById(l.target);
      return o.linkTooltipFormat
        ? o.linkTooltipFormat({ link: l, source, target })
        : graph._defaultLinkTooltip(l.links?.length > 1 ? { ...l, _siblings: l.links } : l, source, target);
    };
    const pickTie = (event, l, [x, y]) => {
      select({ link: l.id, originals: (l.links ?? [l]).map(x => x.id) }, event);
      // Without an external details panel, the pinned tooltip is the panel.
      if (typeof o.onSelect !== 'function') graph._tooltip.pin(x, y, tieHtml(l));
    };
    // where a tie's tooltip opens from the keyboard: the middle of its bow
    const tieAt = l => { const m = geom(l)?.mid ?? { x: 0, y: 0 }; return graph._toCard(m.x, m.y); };
    hitSel
      .on('mouseover', (event, l) => {
        if (graph._tooltip.isPinned) return;
        const [mx, my] = d3.pointer(event, graph.container);
        graph._tooltip.show(mx, my, tieHtml(l));
      })
      .on('mouseout', () => { if (!graph._tooltip.isPinned) graph._tooltip.hide(); })
      .on('click', (event, l) => {
        event.stopPropagation();
        pickTie(event, l, d3.pointer(event, graph.container));
      });

    // Ties from the keyboard (K-20): left to right by their source, then
    // their target; arrows step through them, Enter or Space picks one as a
    // click does, Escape clears. Focus shows what hover shows — a tie a
    // pointer pressed takes focus too, and hover already handles it.
    const pos = id => positions.get(id) ?? { x: 0, y: 0 };
    const tieOrder = links.slice().sort((a, b) =>
      (pos(a.source).x - pos(b.source).x) || (pos(a.source).y - pos(b.source).y)
      || (pos(a.target).x - pos(b.target).x) || (pos(a.target).y - pos(b.target).y));
    const tieStop = rovingTabindex(hitSel, { state: this._tieRoving, preferred: this.selected?.link ?? null });
    hitSel
      .attr('role', 'button')
      .attr('aria-label', l => this._tieLabel(l, nodeById))
      .on('pointerdown.key', () => { this._pointerFocus = true; })
      .on('focus.tip', (event, l) => {
        if (graph._destroyed) return;
        if (!this._pointerFocus && !graph._tooltip.isPinned) graph._tooltip.show(...tieAt(l), tieHtml(l));
      })
      .on('blur.tip', event => {
        if (!event.target.isConnected || graph._destroyed) return;   // removed by a redraw / destroy()
        if (!this._pointerFocus && !graph._tooltip.isPinned) graph._tooltip.hide();
        this._pointerFocus = false;
      })
      .on('keydown', (event, l) => {
        this._pointerFocus = false;
        // Tab into a tooltip Enter pinned, to its sources (K-23)
        if (enterPinnedTip(event, graph._tooltip, event.currentTarget)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pickTie(event, l, tieAt(l));
          return;
        }
        if (event.key === 'Escape') {
          if (graph._tooltip.isPinned) graph._tooltip.unpin();
          graph._tooltip.hide();
          select(null, event);
          return;
        }
        const next = listStep(tieOrder, l, event.key);
        if (next) {
          event.preventDefault();
          tieStop.focus(next.id);
        }
      });
    // A selection made with the mouse or select() moves the Tab stops to it.
    this._preferStops = () => {
      nodeStop.prefer(this.selected?.node ?? null);
      tieStop.prefer(this.selected?.link ?? null);
    };
    // A redraw that took away the node or tie keyboard focus was on (a fold,
    // the filter) hands focus to the new Tab stop of the same set.
    const focusedEl = typeof document !== 'undefined' ? document.activeElement : null;
    if (nodesHadFocus && !this.gNodes.node().contains(focusedEl)) nodeStop.focus(this._nodeRoving.current);
    if (tiesHadFocus && !this.gHits.node().contains(focusedEl)) tieStop.focus(this._tieRoving.current);

    graph.svg.on('click.flow', () => { if (this.selected) select(null); });

    // Legend: categories present among the ties the filter lets through, plus
    // any the user toggled off (so they can be turned back on).
    // Built from the page's filter only — not from what the legend itself
    // hides — so a hidden category (and the nodes hidden with it) can always
    // be turned back on. The key after them reads the same nodes and ties,
    // so it stays put while categories go and come back.
    const pass = item => !this.filter || this.filter(item);
    const passingNodes = this.data.nodes.filter(pass);
    const passing = new Set(passingNodes.map(n => n.id));
    const passingLinks = this.data.links.filter(l => pass(l) && passing.has(l.source) && passing.has(l.target));
    const shown = new Set(passingLinks.map(l => this._linkKey(l)));
    this._renderLegend(keys.filter(k => shown.has(k)), palette, this._symbolItems(passingNodes, passingLinks));

    // The selection moved or went (a fold, the filter, the legend, the time
    // window): the details panel and onSelect hear about it, as on a click —
    // last, once handlers, select() and the legend belong to this render, so
    // a page that changes the chart from onSelect starts from a whole one.
    if (prevSelection && !sameSelection(prevSelection, this.selected)) {
      const s = this.selected;
      const node = s?.node ? byId.get(s.node) ?? null : null;
      const link = s?.link ? links.find(l => l.id === s.link) ?? null : null;
      graph._showDetails(node ? { node } : link ? { link } : null);
      graph._emit(o.onSelect, { node, link, event: null });
    }
  }

  // Arrow keys walk the trace: → first outgoing tie, ← first incoming tie,
  // ↑/↓ the previous/next node of the same lane — past the lane's last node
  // into the next lane, so every node can be reached (K-20) — and Home /
  // End the first / last node.
  _neighborFor(n, key, ordered, links, positions, lanes = []) {
    if (key === 'ArrowRight') {
      const l = links.find(x => x.source === n.id);
      return l ? ordered.find(x => x.id === l.target) : null;
    }
    if (key === 'ArrowLeft') {
      const l = links.find(x => x.target === n.id);
      return l ? ordered.find(x => x.id === l.source) : null;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      // lane by lane, top to bottom within a lane
      const laneIdx = new Map(lanes.map((l, i) => [l.id, i]));
      const at = x => positions.get(x.id);
      const walk = ordered.slice().sort((a, b) =>
        ((laneIdx.get(at(a).lane) ?? 0) - (laneIdx.get(at(b).lane) ?? 0)) || (at(a).y - at(b).y) || (at(a).x - at(b).x));
      const i = walk.findIndex(x => x.id === n.id);
      return walk[i + (key === 'ArrowDown' ? 1 : -1)] ?? null;
    }
    if (key === 'Home') return ordered[0] ?? null;
    if (key === 'End') return ordered[ordered.length - 1] ?? null;
    return null;
  }

  // The accessible name of a tie: its ends, its category and its label.
  _tieLabel(l, nodeById) {
    const name = id => String(nodeById(id).label ?? id);
    const kind = this.typeOf(l).label;
    const label = l.links?.length > 1 ? `${l.links.length} ties` : l.label;
    return [`${name(l.source)} → ${name(l.target)}`, kind, label].filter(v => v != null && v !== '').join(', ');
  }

  _nodeTooltip(n, nodeLinks, sw = null) {
    const ins = nodeLinks.filter(l => l.target === n.id);
    const outs = nodeLinks.filter(l => l.source === n.id);
    const group = this._groupCfg(n)?.label ?? n.group;
    const members = Array.isArray(n.members) && sw && !sw.open
      ? `<div class="rc-tooltip-small rc-tooltip-section">${n.members.slice(0, 8).map(m => esc(m.label ?? m.id)).join('<br>')}${n.members.length > 8 ? `<br>… +${n.members.length - 8}` : ''}</div>`
      : '';
    const hint = sw ? tipSub(`${sw.open ? '− collapses' : '+ expands'} · keys + / −`, { section: true }) : '';
    return tipBody(`${tipTitle(esc(n.label ?? n.id))}
      ${group ? tipKind(esc(group), null, 'div') : ''}
      ${n.sub ? tipSub(esc(n.sub)) : ''}
      ${members}
      ${tipSub(`${tipNum(ins.length)} in · ${tipNum(outs.length)} out`, { section: true })}
      ${hint}`);
  }

  // Toggle a fold from the drawing (switch click or + / − key) and redraw;
  // keyboard focus returns to the node that now stands there.
  _toggle(id, event = null, refocus = false) {
    if (!this.setCollapsed(id, !this.isCollapsed(id), event)) return;
    this.g._tooltip?.hide?.();
    this.g.render();
    if (this.selected) this.g._showDetails(this._selectedSubject());
    if (refocus) {
      const fold = this._folds().find(f => f.id === id);
      const drawn = new Map((this._lastVisible?.nodes ?? []).map(n => [n.id, n]));
      const target = this.isCollapsed(id) ? metaId(id) : fold && this._shownMember(fold, drawn);
      this.gNodes.selectAll('.rc-flow-node').filter(n => n.id === target).node()?.focus();
    }
  }

  // A selection against what is drawn: a node folded away becomes its
  // meta-node; a tie is found by its id or by the original ties it holds
  // (an aggregate's id changes as ties merge and split). null when gone.
  _resolveSelection(sel, byId, links, metaOf) {
    if (!sel) return null;
    if (sel.node != null) {
      const id = String(sel.node);
      if (byId.has(id)) return { node: id };
      const meta = metaOf?.get(id);
      if (meta && byId.has(meta)) return { node: meta };
      // a fold's meta-node after the fold opened: its anchor, or the first
      // member still drawn
      const fold = id.startsWith(META_PREFIX) ? this._folds().find(f => metaId(f.id) === id) : null;
      const shown = fold && this._shownMember(fold, byId);
      return shown ? { node: shown } : null;
    }
    if (sel.link == null) return null;
    // the ties the user picked, kept as picked: merging never widens them,
    // so a split returns to the chosen tie, not a neighbour
    const originals = sel.originals ?? [String(sel.link)];
    const hit = links.find(l => l.id === String(sel.link))
      ?? links.find(l => originals.includes(l.id))
      ?? links.find(l => (l.links ?? []).some(x => originals.includes(x.id)));
    return hit ? { link: hit.id, originals } : null;
  }

  // The member that stands for an open fold: its anchor when drawn, else
  // the first member still drawn (the − switch sits there too).
  _shownMember(fold, byId) {
    return byId.has(fold.anchor) ? fold.anchor : fold.members.find(m => byId.has(m)) ?? null;
  }

  _selectedSubject() {
    const s = this.selected;
    if (!s) return null;
    const vis = this._lastVisible;
    if (!vis) return null;
    return s.node ? { node: vis.nodes.find(n => n.id === s.node) ?? null }
      : { link: vis.links.find(l => l.id === s.link) ?? null };
  }

  // The key to the drawing (RC-053): static rows after the tie categories,
  // their marks in the muted text colour. `legendSymbols` gives the words:
  //   shapes — a row per node shape drawn, named by the kinds that draw it
  //            (shapeBy), when the nodes draw two or more shapes. Kinds in
  //            nodeShapes order, then the others as the nodes bring them;
  //            kinds that share a shape share a row. `shapes: { kind: label }`
  //            renames a kind, `{ kind: false }` leaves it out, `shapes: false`
  //            leaves them all out. A fold's stack is no kind: no row
  //   dash   — words for the ties linkDash dashes: a row with that dash,
  //            when linkDash dashes a tie
  //   width  — words for the tie width: a row with a wedge, when a tie has
  //            a value to size it by (linkWidth.by)
  // No words, no dash or width row. `legendSymbols: false`: no key.
  // Not `legendKey`: in the legend a key is an item's identity (data-key,
  // legendKey() in core/legend.js), and pages read that one.
  // `nodes`, `links`: what the page's filter lets through, as the list rule
  // reads them — not the legend's own hiding, the folds or the time window,
  // so the rows stay put while categories go and come back.
  _symbolItems(nodes, links) {
    const o = this.g.options;
    const words = o.legendSymbols;
    if (words === false) return [];
    const cfg = words && typeof words === 'object' ? words : {};
    const text = v => (typeof v === 'string' && v !== '' ? v : null);
    const row = (label, mark, more) => ({ key: null, label, color: this.g.theme.muted, mark, alias: '', ...more });
    const items = [];

    if (cfg.shapes !== false) {
      const names = cfg.shapes && typeof cfg.shapes === 'object' ? cfg.shapes : {};
      const drawn = new Set();      // the shapes the nodes draw, a kind-less circle too
      const present = new Set();    // the kinds, as the nodes bring them
      nodes.forEach(n => {
        const kind = this._kindOf(n);
        drawn.add(this._shapeOfKind(kind));
        if (kind != null && kind !== '') present.add(String(kind));
      });
      if (drawn.size >= 2) {
        const declared = Object.keys(o.nodeShapes ?? {}).filter(k => present.has(k));
        const labels = new Map();   // shape → its kinds' labels, in order
        new Set([...declared, ...present]).forEach(kind => {
          const given = names[kind];      // a string renames the kind, false leaves it out
          if (given === false) return;
          const shape = this._shapeOfKind(kind);
          const label = text(given) ?? kind;
          if (!labels.has(shape)) labels.set(shape, []);
          if (!labels.get(shape).includes(label)) labels.get(shape).push(label);
        });
        const radius = o.nodeRadius ?? 18;
        labels.forEach((list, shape) => items.push(row(list.join(', '), 'shape', { shape, radius })));
      }
    }

    // a tie whose category has its own dash is drawn with that one (dashOf)
    const dash = text(cfg.dash);
    if (dash && typeof o.linkDash === 'function' && links.some(l => !this.typeOf(l).dash && o.linkDash(l))) {
      items.push(row(dash, 'dashed', { dash: LINK_DASH }));
    }
    // the width channel as the drawing reads it (linkWidthScale's default)
    const width = text(cfg.width);
    const { by = 'value' } = o.linkWidth ?? {};
    if (width && links.some(l => linkValue(l, { by }) != null)) items.push(row(width, 'width'));
    return items;
  }

  // Legend, through the one legend builder (core/legend.js, D-04): the node
  // groups as plain labels with a dot, then the tie categories as toggles,
  // then the key (`symbols`, from _symbolItems). A click, Enter or Space
  // hides or shows a category's ties, a double click keeps only that
  // category and a second one brings all back, "Show all" shows while one
  // is off; positions stay put. The state is the chart's hidden set, the
  // gestures the base Chart's (_legendGesture): it redraws, then
  // onLegendToggle. legendInteractive: false lists the categories drawn as
  // labels. `keys`: the categories offered (the list rule above).
  _renderLegend(keys, palette, symbols = []) {
    const graph = this.g;
    const el = graph._typeLegendEl;
    if (!el) return;
    const o = graph.options;
    const interactive = o.legendInteractive !== false;
    const hidden = graph._hiddenKeys;
    const groups = Object.entries(o.nodeGroups ?? {}).map(([key, cfg], i) => ({
      key: null,
      label: cfg.label ?? key,
      color: cfg.color ?? palette[i % palette.length],
      mark: 'dot',
      alias: 'rc-flow-legend-group',
    }));
    const ties = keys.filter(key => interactive || !hidden.has(key)).map(key => {
      // the category's own style — not one tie's (a derived first tie would
      // make the whole category look dashed)
      const info = this._typeOfKey(key);
      const dash = drawnDash(info.dash);
      return { key, label: info.label, color: info.color, mark: dash ? 'dashed' : 'line', dash, on: !hidden.has(key) };
    });
    renderLegendItems(el, [...groups, ...ties, ...symbols], {
      interactive,
      // a category off that the page's filter keeps out of the list still
      // shows Show all, which clears it too
      anyHidden: this.linkKeys().some(key => hidden.has(key)),
      alias: GRAPH_LEGEND_ALIAS,
      onToggle: info => graph._legendGesture(info, keys),
    });
  }
}

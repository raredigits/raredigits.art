// RareCharts — Sankey (experimental)
// Flow diagram: nodes stand in columns, bands between them are flows, band
// width = value. Budgets and how they are spent, money trails, funnels,
// balances. Outside the 1.0 semver promise until it has seen real data.
//
// Data (shared link layer, core/links.js):
//   { nodes?: [{ id, label?, color?, column? }],
//     links:  [{ source, target, value, type?, label?, ... }] }
//   `from`/`to` and `flows` are accepted as aliases. Without `nodes`, nodes are
//   derived from the links (label = id). Ties of the same pair and type are
//   summed (with a warning); different types stay separate bands.
//   A cycle (A→B→A) throws — a sankey is acyclic.
//
// Options:
//   height        — card height px for the horizontal layout, title/legend/
//                   footer included (default: 400)
//   orientation   — 'horizontal' | 'vertical' | 'auto' (default: 'auto':
//                   vertical when the container is ≤ mobileBreakpoint wide)
//   mobileBreakpoint — px (default: 480)
//   rowHeight     — px per column in the vertical layout (default: 140)
//   nodeWidth     — node thickness across the flow, px (default: 12)
//   nodePadding   — gap between nodes of a column, px (default: 12)
//   nodeAlign     — 'justify' | 'left' | 'right' | 'center' (default: 'justify')
//   nodeSort      — null (input order) | 'value' | 'auto' | (a, b) => number
//   iterations    — relaxation rounds (default: 6)
//   linkColor     — 'source' | 'target' | 'type' | 'gradient' | css color
//                   (default: 'source')
//   linkOpacity   — band opacity at rest (default: 0.45)
//   linkTypes     — { type: { color, label } } — colors bands when
//                   linkColor: 'type' and fills the legend with every type it
//                   describes that the data uses, each item a toggle for its
//                   bands; a type it does not describe stays muted
//   hiddenLinkTypes — link types hidden from the start (an untyped band is
//                   'default'); the legend shows them off
//   legendInteractive — false: the legend is plain labels, and a type hidden
//                   through the API is left out of it (default: true)
//   onLegendToggle — ({ name, visible, visibleNames }) after a legend gesture
//                   (name: the link type; null for "Show all")
//   labels        — 'auto' | false (default: 'auto'): right of each node, the
//                   last column in a measured right gutter; cut with an
//                   ellipsis to the room before the next column
//   minLabelSize  — px; smaller nodes get no label, only a tooltip (default:
//                   10); the vertical layout measures node width against
//                   max(minLabelSize, 24)
//   showValues    — append the node value to its label (default: true)
//   valueFormat   — v => string (default: locale number)
//   tooltipFormat — ({ node, incoming, outgoing, links }) => html (the shown
//                   bands; links = incoming then outgoing, the shape of
//                   MapFlow's and Graph's node payloads, RC-010)
//   linkTooltipFormat — ({ link, source, target }) => html
//   tableFallback — render a visually hidden source/target/value table for
//                   screen readers (default: true)
//   animate, duration (default: 650), ease
//
// Interaction: hover a node or band to highlight its flows; click a band (or
// press Enter on a focused node) to pin its tooltip; a click elsewhere or
// Escape releases it. A node's tooltip lists its bands in and out with their
// values (RC-022), so the keyboard, which stops on the nodes only, reads the
// bands too. A band thinner than 8 px takes the pointer 8 px wide.
//
// The legend (RC-052): a header legend item that names a link type (`series`,
// else `name`, else `label`; the auto legend sets `series`) toggles that
// type's bands — a click, Enter or Space; a double click keeps only that
// type; "Show all" brings every band back. Hidden bands leave without a new
// layout: nodes, their labels and their values stay where and as they were,
// and a hidden band leaves its gap at its nodes. The hover, the node tooltip
// and the screen-reader table read the shown bands; a band's "% of source"
// stays a share of the whole node.
//
// Methods: setData(data), setLinkTypesVisible(types | null) — show only these
// link types (null shows all); returns `this`.

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { fitTextNode } from '../core/renderHelpers.js';
import { motionDuration, resolveEase } from '../core/utils.js';
import { groupTies, linkValue, normalizeRelationData, resolveLinkType } from '../core/links.js';
import { sankeyLayout } from '../core/sankey.js';
import { EntryMotion, entryTransition, ENTRY_DURATION } from '../core/entryMotion.js';
import { escapeHtml as esc, tipNum, tipTitle, tipRow, tipSub } from '../core/html.js';

// The least width a band takes the pointer at, px (RC-024).
const HIT_MIN = 8;

export class Sankey extends Chart {
  constructor(selector, options = {}) {
    // linkColor 'type': the header legend lists the link types, each item
    // keyed to its type (`series`), so it toggles that type's bands.
    const auto = options.legend == null && options.linkColor === 'type' && options.linkTypes
      ? Object.entries(options.linkTypes).map(([type, cfg]) => ({
          label: cfg.label ?? type, color: cfg.color, type: 'bar', series: type,
        }))
      : null;
    super(selector, {
      height: 400,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
      ...(auto ? { legend: auto } : {}),
    });
    this._autoLegend   = !!auto;
    [].concat(this.options.hiddenLinkTypes ?? []).forEach(t => this._hiddenKeys.add(String(t)));
    this._pinnedItem   = null;   // what the pinned tooltip shows: a band or a node
    this._baseHeight   = this.options.height;
    this._nodes        = [];
    this._links        = [];
    this._entry        = new EntryMotion();   // a fade per dataset (C-16)
    this.tooltip;   // made now: its element keeps its place in the card
    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data = {}) {
    // One read of the payload (core/links.js, K-07). Valid flows only: a
    // band needs a positive finite value — checked first, so a dropped flow
    // names no node. Nodes: the explicit list (a flow to a node outside it
    // is dropped), or derived from the flows in order of appearance, the id
    // as the label.
    const given = (data.nodes ?? []).length > 0;
    const { nodes: readNodes, links } = normalizeRelationData(data, {
      accept: l => {
        const v = linkValue(l);
        if (!(v > 0)) {
          console.warn(`RareCharts.Sankey: link ${l.source} → ${l.target} has no positive value — dropped`);
          return null;
        }
        return { ...l, value: v };
      },
      unknownEndpoints: given ? 'drop' : 'create',
      onUnknown: l => console.warn(`RareCharts.Sankey: link ${l.source} → ${l.target} references an unknown node — dropped`),
    });
    const nodes = given ? readNodes : readNodes.map(n => ({ ...n, label: n.id }));

    // Same pair + same type = one band; sum it and say so. The type as given
    // (`?? ''`): an untyped band and a 'default' one stay apart, as do 1 and '1'.
    const nextLinks = groupTies(links, {
      tie: l => [l.source, l.target, l.type ?? ''],
      onRepeat: l => console.warn(`RareCharts.Sankey: repeated link ${l.source} → ${l.target}${l.type ? ` (${l.type})` : ''} — values summed`),
    }).map(g => ({ ...g.links[0], value: g.links.reduce((s, l) => s + l.value, 0) }));

    // Validate before storing — a cycle is a data error the caller should see
    // at once, and the chart keeps its previous valid data (otherwise every
    // later resize would throw again).
    sankeyLayout({ nodes, links: nextLinks }, { width: 100, height: 100, iterations: 0 });
    this._nodes = nodes;
    this._links = nextLinks;
    this._entry.reset();
    this.render();
    return this;
  }

  // Show only these link types (a list, or one type); null shows all. Types
  // not in the data are dropped from the hidden set. The chart redraws
  // without a new layout; onLegendToggle does not fire.
  setLinkTypesVisible(types) {
    return this._setVisibleKeys(types);
  }

  // ─── Legend ───────────────────────────────────────────────────────────────

  // A band's link type, the legend key: an untyped band is 'default'
  // (core/links.js). `data` is the link as given (a layout link's .data).
  _typeOf(data) {
    return resolveLinkType(this.options.linkTypes, data?.type).key;
  }

  _linkShown(l) {
    return this._isShown(this._typeOf(l.data));
  }

  // The link types in the data, in data order, with the colour their bands
  // take: the type's own with linkColor 'type' (an undescribed type muted, as
  // drawn), the one colour with a CSS colour; by source, target or gradient a
  // type has no one colour, and an item without its own takes the accent.
  _legendSeries() {
    const o = this.options;
    const mode = o.linkColor ?? 'source';
    const colorOf = key => {
      if (mode === 'type') return resolveLinkType(o.linkTypes ?? {}, key, { theme: this.theme }).color;
      return ['source', 'target', 'gradient'].includes(mode) ? undefined : mode;
    };
    const seen = new Map();
    (this._links ?? []).forEach(l => {
      const key = this._typeOf(l);
      if (!seen.has(key)) seen.set(key, { key, color: colorOf(key) });
    });
    return [...seen.values()];
  }

  // The auto legend lists the described types the data uses: a type that
  // is not in the data has no item (a page's own legend keeps a label for
  // it). Before any data every described type stays, as a label.
  _headerLegendItems(present) {
    const items = super._headerLegendItems(present);
    return this._autoLegend && present?.size ? items.filter(item => item.key != null) : items;
  }

  // A legend change lets go of a pinned tooltip that no longer holds: a band
  // that is now hidden, or a node whose shown in/out sums changed.
  _unpinHidden() {
    const pin = this._pinnedItem;
    if (!pin || !this._tooltip?.isPinned) return;
    let stale;
    if (pin.kind === 'band') {
      stale = !this._isShown(pin.key);
    } else {
      const n = this._layout?.nodes.find(x => x.id === pin.id);
      stale = !n || this._nodeHtml(n, this._valueFormat()) !== pin.html;
    }
    if (stale) this._tooltip.unpin();
  }

  _valueFormat() {
    return this.options.valueFormat ?? (v => Number(v).toLocaleString());
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this._createSvg();
    this._defs  = this.svg.append('defs');
    this.gRoot  = this.svg.append('g').attr('class', 'rc-sankey');
    this.gLinks = this.gRoot.append('g').attr('class', 'rc-sankey-links');
    this.gLinkHits = this.gRoot.append('g').attr('class', 'rc-sankey-link-hits').attr('aria-hidden', 'true');
    this.gNodes = this.gRoot.append('g').attr('class', 'rc-sankey-nodes');
    this.gLabels = this.gRoot.append('g').attr('class', 'rc-sankey-labels');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  _orientation() {
    const o = this.options;
    if (o.orientation === 'horizontal' || o.orientation === 'vertical') return o.orientation;
    const w = this.container.clientWidth;
    return w > 0 && w <= (o.mobileBreakpoint ?? 480) ? 'vertical' : 'horizontal';
  }

  render() {
    const o = this.options;
    const t = this.theme;
    if (!this._links.length) {
      [this.gLinks, this.gLinkHits, this.gNodes, this.gLabels].forEach(g => g.selectAll('*').remove());
      this.svg.attr('role', 'img');   // nothing focusable left (K-24)
      this._renderTable([]);
      return;
    }

    const vertical = this._orientation() === 'vertical';

    // Vertical: the chart grows with the number of columns (now rows).
    // Columns are known before geometry: a cheap pass fixes them for sizing.
    const pre = sankeyLayout(
      { nodes: this._nodes, links: this._links },
      { width: 100, height: 100, iterations: 0, align: o.nodeAlign ?? 'justify' });
    const columnsEstimate = pre.columns;
    const chromeH = (this._headerEl ? this._headerEl.offsetHeight + 8 : 0)
      + (this._footerEl ? this._footerEl.offsetHeight + 6 : 0)
      + this.margin.top + this.margin.bottom;
    const targetH = vertical
      ? Math.max(200, columnsEstimate * (o.rowHeight ?? 140)) + chromeH
      : this._baseHeight;
    if (this.options.height !== targetH) {
      this.options.height = targetH;
      this.container.style.height = targetH + 'px';
    }

    const W = this.width + this.margin.left + this.margin.right;
    const H = this.height + this.margin.top + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const labelGap = 6;
    const pad = 8;
    const fmt = this._valueFormat();
    const labelText = n => o.showValues === false
      ? this._name(n) : `${this._name(n)} · ${fmt(n.value)}`;
    // Horizontal: every label sits right of its node, so no two columns'
    // labels ever face each other; the last column's labels get a gutter on
    // the right, as wide as the longest of them (capped). Vertical: a strip
    // above the first row and below the last row holds their labels.
    let gutter = 0;
    if (!vertical && o.labels !== false && pre.columns > 1) {
      const probe = this.gLabels.append('text').attr('class', 'rc-sankey-label');
      const widest = pre.nodes.filter(n => n.layer === pre.columns - 1).reduce((m, n) => {
        probe.text(labelText(n));
        return Math.max(m, probe.node().getComputedTextLength?.() ?? 0);
      }, 0);
      probe.remove();
      gutter = widest ? Math.min(widest + labelGap * 2, W * 0.3) : 0;
    }
    const lane = vertical ? { x: pad, y: 18, w: W - pad * 2, h: H - 36 }
                          : { x: pad, y: pad, w: W - pad * 2 - gutter, h: H - pad * 2 };
    const layout = sankeyLayout({ nodes: this._nodes, links: this._links }, {
      width:  vertical ? lane.h : lane.w,
      height: vertical ? lane.w : lane.h,
      nodeWidth:   o.nodeWidth ?? 12,
      nodePadding: o.nodePadding ?? 12,
      align:       o.nodeAlign ?? 'justify',
      sort:        o.nodeSort ?? null,
      iterations:  o.iterations ?? 6,
    });
    this._layout = layout;
    // The legend hides bands, never the layout: it runs over every link
    // above, so nodes keep their place and size, and only the bands of the
    // shown types are drawn.
    const shown = layout.links.filter(l => this._linkShown(l));
    const drawn = new Set(shown);

    // Layout space (flow axis = x, cross axis = y) → screen space.
    const P = vertical
      ? (flow, cross) => [lane.x + cross, lane.y + flow]
      : (flow, cross) => [lane.x + flow, lane.y + cross];
    const nodeRect = n => {
      const [x0, y0] = P(n.x0, n.y0);
      const [x1, y1] = P(n.x1, n.y1);
      return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
    };
    const bandPath = l => {
      const [sx, sy] = P(l.source.x1, l.y0);
      const [tx, ty] = P(l.target.x0, l.y1);
      if (vertical) {
        const my = (sy + ty) / 2;
        return `M${sx},${sy}C${sx},${my} ${tx},${my} ${tx},${ty}`;
      }
      const mx = (sx + tx) / 2;
      return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
    };

    // ── Colors ──
    const palette = t.colors ?? ['#888'];
    const nodeColor = n => n.data.color ?? palette[n.index % palette.length];
    const linkTypes = o.linkTypes ?? {};
    // The type legend lists the described types only (it is built from
    // linkTypes), so an undescribed type stays muted here rather than taking
    // a colour the legend never names.
    const typeKeys = [];
    const mode = o.linkColor ?? 'source';
    const gradId = l => `${this._uid}-sankey-grad-${l.index}`;
    const linkStroke = l => {
      if (mode === 'source') return nodeColor(l.source);
      if (mode === 'target') return nodeColor(l.target);
      if (mode === 'type') return resolveLinkType(linkTypes, l.data.type, { keys: typeKeys, theme: t }).color;
      if (mode === 'gradient') return `url(#${gradId(l)})`;
      return mode;
    };
    // A band's swatch in a node's tooltip: the band's colour; a gradient's
    // at the band's far end (`far`, the other node).
    this._bandColor = (l, far) => (mode === 'gradient' ? nodeColor(far) : linkStroke(l));
    this._defs.selectAll('linearGradient').remove();
    if (mode === 'gradient') {
      shown.forEach(l => {
        const [sx, sy] = P(l.source.x1, l.y0);
        const [tx, ty] = P(l.target.x0, l.y1);
        const g = this._defs.append('linearGradient')
          .attr('id', gradId(l))
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', sx).attr('y1', sy).attr('x2', tx).attr('y2', ty);
        g.append('stop').attr('offset', '0%').attr('stop-color', nodeColor(l.source));
        g.append('stop').attr('offset', '100%').attr('stop-color', nodeColor(l.target));
      });
    }

    const baseOpacity = o.linkOpacity ?? 0.45;
    const dur = motionDuration(o.duration ?? ENTRY_DURATION);
    const ease = resolveEase(o.ease ?? 'cubicOut');
    const phase = this._entry.phase((o.animate ?? true) ? dur : 0);

    // ── Bands ──
    const linkSel = this.gLinks.selectAll('.rc-sankey-link')
      .data(shown, l => l.id)
      .join('path')
      .attr('class', 'rc-sankey-link')
      .attr('fill', 'none')
      .attr('d', bandPath)
      .attr('stroke', linkStroke)
      .attr('stroke-width', l => Math.max(1, l.width))
      .attr('role', 'img')
      .attr('aria-label', l => `${this._name(l.source)} → ${this._name(l.target)}: ${fmt(l.value)}`)
      .style('cursor', 'pointer');
    // The bands fade in on each setData, on the entry timeline (C-16): the
    // renders that follow setData — fonts.ready, the first ResizeObserver
    // callback — and a resize mid-fade carry each band on from its current
    // opacity for the time left, instead of cutting the fade to its end. A
    // band added mid-fade starts from 0.
    if (phase === 'none') {
      linkSel.interrupt().attr('stroke-opacity', baseOpacity);
    } else {
      if (phase === 'enter') linkSel.interrupt().attr('stroke-opacity', 0);
      else linkSel.filter(function () { return !this.hasAttribute('stroke-opacity'); }).attr('stroke-opacity', 0);
      const { moving, settled } = entryTransition(linkSel, this._entry, { duration: dur, ease });
      settled.attr('stroke-opacity', baseOpacity);
      moving.attr('stroke-opacity', baseOpacity);
    }

    // Each band takes the pointer on an invisible stroke over the bands, at
    // least HIT_MIN px wide (RC-024), the thinnest on top: a thin band wins
    // a few px from a thick neighbour, which keeps the rest. Nodes stay
    // above.
    const hitSel = this.gLinkHits.selectAll('.rc-sankey-link-hit')
      .data(shown.slice().sort((a, b) => b.width - a.width), l => l.id)
      .join('path')
      .attr('class', 'rc-sankey-link-hit')
      .attr('fill', 'none')
      .attr('d', bandPath)
      .attr('stroke', 'transparent')
      .attr('stroke-width', l => Math.max(HIT_MIN, l.width))
      .style('pointer-events', 'stroke')
      .style('cursor', 'pointer')
      .order();

    // ── Nodes ──
    const nodeSel = this.gNodes.selectAll('.rc-sankey-node')
      .data(layout.nodes, n => n.id)
      .join('rect')
      .attr('class', 'rc-sankey-node')
      .attr('x', n => nodeRect(n).x)
      .attr('y', n => nodeRect(n).y)
      .attr('width', n => Math.max(1, nodeRect(n).w))
      .attr('height', n => Math.max(1, nodeRect(n).h))
      .attr('fill', nodeColor)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', n => `${this._name(n)}: ${fmt(n.value)}`)
      .style('cursor', 'pointer');
    // The nodes are Tab stops: the svg is a group, not an image, which
    // would hide them from assistive technology (K-24).
    this.svg.attr('role', 'group');

    // ── Labels ──
    const minLabel = o.minLabelSize ?? 10;
    const labelled = o.labels === false ? [] : layout.nodes.filter(n =>
      vertical ? nodeRect(n).w >= Math.max(minLabel, 24) : nodeRect(n).h >= minLabel);
    const lastCol = layout.columns - 1;
    const labelPos = n => {
      const r = nodeRect(n);
      if (vertical) {
        // first row: above; last row: below; middle rows: beside the bar's end
        if (n.layer === 0) return { x: r.x + r.w / 2, y: r.y - 6, anchor: 'middle', base: 'auto' };
        if (n.layer === lastCol) return { x: r.x + r.w / 2, y: r.y + r.h + 12, anchor: 'middle', base: 'hanging' };
        return { x: r.x + r.w / 2, y: r.y + r.h / 2, anchor: 'middle', base: 'middle' };
      }
      return { x: r.x + r.w + labelGap, y: r.y + r.h / 2, anchor: 'start', base: 'middle' };
    };
    // Room for a label: up to the neighbouring column (horizontal), or the
    // bar's own length (vertical). Longer labels are cut with an ellipsis —
    // the full name stays in the tooltip and the accessible name.
    const colStep = layout.columns > 1 ? (lane.w - (o.nodeWidth ?? 12)) / (layout.columns - 1) : lane.w / 2;
    const labelRoom = n => vertical
      // centred on its bar; may spill into half the gap on either side
      ? nodeRect(n).w + (o.nodePadding ?? 12) - 4
      : (n.layer === lastCol && layout.columns > 1
          ? gutter - labelGap
          : colStep - (o.nodeWidth ?? 12) - labelGap * 2);
    this.gLabels.selectAll('.rc-sankey-label')
      .data(labelled, n => n.id)
      .join('text')
      .attr('class', 'rc-sankey-label')
      .attr('x', n => labelPos(n).x)
      .attr('y', n => labelPos(n).y)
      .attr('text-anchor', n => labelPos(n).anchor)
      .attr('dominant-baseline', n => labelPos(n).base)
      .attr('fill', t.text)
      .attr('stroke', t.bg)
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .style('pointer-events', 'none')
      .each(function (n) { fitTextNode(this, labelText(n), labelRoom(n)); });

    // ── Interaction ──
    // A hover or pin ends the entry fade at once: the fade would otherwise
    // carry on over the highlight and leave it lost. A node's neighbours are
    // those of its shown bands.
    const reset = () => {
      linkSel.interrupt().attr('stroke-opacity', baseOpacity);
      nodeSel.style('opacity', 1);
    };
    const unpinned = () => {
      this._pinnedItem = null;
      reset();
    };
    const highlightNode = n => {
      const touches = l => l.source === n || l.target === n;
      linkSel.interrupt().attr('stroke-opacity', l => touches(l) ? Math.min(1, baseOpacity + 0.35) : 0.12);
      const near = new Set([n]);
      n.sourceLinks.forEach(l => { if (drawn.has(l)) near.add(l.target); });
      n.targetLinks.forEach(l => { if (drawn.has(l)) near.add(l.source); });
      nodeSel.style('opacity', x => near.has(x) ? 1 : 0.35);
    };
    const highlightLink = l => {
      linkSel.interrupt().attr('stroke-opacity', x => x === l ? Math.min(1, baseOpacity + 0.4) : 0.12);
      nodeSel.style('opacity', x => (x === l.source || x === l.target) ? 1 : 0.35);
    };
    const pointer = event => d3.pointer(event, this.container);
    const centerOf = el => {
      const b = el.getBoundingClientRect?.();
      const c = this.container.getBoundingClientRect?.();
      return b && c ? [b.x - c.x + b.width / 2, b.y - c.y + b.height / 2] : [0, 0];
    };

    nodeSel
      .on('mouseover', (event, n) => {
        if (this._tooltip.isPinned) return;
        const [mx, my] = pointer(event);
        this._tooltip.show(mx, my, this._nodeHtml(n, fmt));
        highlightNode(n);
      })
      .on('mouseout', () => {
        if (this._tooltip.isPinned) return;
        this._tooltip.hide();
        reset();
      })
      .on('keydown', (event, n) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const [mx, my] = centerOf(event.currentTarget);
        highlightNode(n);
        const html = this._nodeHtml(n, fmt);
        this._tooltip.pin(mx, my, html, { onClose: unpinned });
        this._pinnedItem = { kind: 'node', id: n.id, html };
      });

    [linkSel, hitSel].forEach(sel => sel
      .on('mouseover', (event, l) => {
        if (this._tooltip.isPinned) return;
        const [mx, my] = pointer(event);
        this._tooltip.show(mx, my, this._linkHtml(l, fmt));
        highlightLink(l);
      })
      .on('mouseout', () => {
        if (this._tooltip.isPinned) return;
        this._tooltip.hide();
        reset();
      })
      .on('click', (event, l) => {
        event.stopPropagation();
        const [mx, my] = pointer(event);
        highlightLink(l);
        this._tooltip.pin(mx, my, this._linkHtml(l, fmt), { onClose: unpinned });
        this._pinnedItem = { kind: 'band', id: l.id, key: this._typeOf(l.data) };
      }));

    this._renderTable(shown, fmt);
  }

  // ─── Text ─────────────────────────────────────────────────────────────────

  _name(n) { return n.data.label ?? n.id; }

  // A node's tooltip: its shown bands in and out (the drawing, not the node's
  // whole value, which its label keeps).
  _nodeHtml(n, fmt) {
    const o = this.options;
    const incoming = n.targetLinks.filter(l => this._linkShown(l));
    const outgoing = n.sourceLinks.filter(l => this._linkShown(l));
    if (o.tooltipFormat) {
      const ins = incoming.map(l => l.data), outs = outgoing.map(l => l.data);
      return o.tooltipFormat({ node: n.data, incoming: ins, outgoing: outs, links: [...ins, ...outs] });
    }
    const inV = incoming.reduce((s, l) => s + l.value, 0);
    const outV = outgoing.reduce((s, l) => s + l.value, 0);
    // label/value rows, as every default tooltip (RC-082): the total in,
    // then each band in by the node it comes from; the same out (RC-022).
    // A band row carries the band's swatch; two bands with one other node
    // (two types) are told apart by their type, under the name.
    const row = (k, v) => tipRow(k, esc(fmt(v)));
    const bands = (list, far) => {
      const count = new Map();
      list.forEach(l => count.set(far(l), (count.get(far(l)) ?? 0) + 1));
      return list.map(l => {
        const type = l.data.type;
        const note = count.get(far(l)) > 1 && type ? esc(o.linkTypes?.[type]?.label ?? type) : '';
        return tipRow(esc(this._name(far(l))), esc(fmt(l.value)),
          { swatch: 'band', color: this._bandColor?.(l, far(l)) ?? null, note });
      }).join('\n');
    };
    return `${tipTitle(esc(this._name(n)))}
      ${incoming.length ? `${row('in', inV)}\n${bands(incoming, l => l.source)}` : ''}
      ${outgoing.length ? `${row('out', outV)}\n${bands(outgoing, l => l.target)}` : ''}`;
  }

  // A band's tooltip. Its share is of the whole source node, hidden bands
  // included: the node is drawn whole.
  _linkHtml(l, fmt) {
    const o = this.options;
    if (o.linkTooltipFormat) {
      return o.linkTooltipFormat({ link: l.data, source: l.source.data, target: l.target.data });
    }
    const out = l.source.sourceLinks.reduce((s, x) => s + x.value, 0);
    const share = out ? `${tipNum(`${Math.round((l.value / out) * 100)}%`)} of ${esc(this._name(l.source))}` : '';
    const type = l.data.type ? tipSub(esc(o.linkTypes?.[l.data.type]?.label ?? l.data.type)) : '';
    // the band's label and value in a row, its share under them (RC-082)
    return `${tipTitle(`${esc(this._name(l.source))} → ${esc(this._name(l.target))}`)}
      ${tipRow(l.data.label ? esc(l.data.label) : '', esc(fmt(l.value)), { note: share })}
      ${type}`;
  }

  // Visually hidden table: the flows as data (the shown bands), for screen
  // readers.
  _renderTable(links, fmt = v => v) {
    this._tableEl?.remove();
    this._tableEl = null;
    if (this.options.tableFallback === false || !links.length) return;
    const table = document.createElement('table');
    table.className = 'rc-sr-only rc-sankey-table';
    const caption = this.options.title ? `<caption>${esc(this.options.title)}</caption>` : '';
    table.innerHTML = `${caption}<thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Value</th></tr></thead>
      <tbody>${links.map(l => `<tr><td>${esc(this._name(l.source))}</td><td>${esc(this._name(l.target))}</td><td>${esc(fmt(l.value))}</td></tr>`).join('')}</tbody>`;
    this.container.appendChild(table);
    this._tableEl = table;
  }
  // No destroy() of its own: Chart.destroy() empties the container, the
  // table with it (D-02).
}

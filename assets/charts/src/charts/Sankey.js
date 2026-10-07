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
//   height        — px for the horizontal layout (default: 400)
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
//                   linkColor: 'type' and fills the legend
//   labels        — 'auto' | false (default: 'auto')
//   minLabelSize  — px; smaller nodes get no label, only a tooltip (default: 10)
//   showValues    — append the node value to its label (default: true)
//   valueFormat   — v => string (default: locale number)
//   tooltipFormat — ({ node, incoming, outgoing }) => html
//   linkTooltipFormat — ({ link, source, target }) => html
//   tableFallback — render a visually hidden source/target/value table for
//                   screen readers (default: true)
//   animate, duration (default: 600), ease
//
// Interaction: hover a node or band to highlight its flows; click a band (or
// press Enter on a focused node) to pin its tooltip.

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';
import { applySvgA11y, fitTextNode } from '../core/renderHelpers.js';
import { motionDuration, resolveEase } from '../core/utils.js';
import { normalizeLinkData } from '../core/links.js';
import { sankeyLayout } from '../core/sankey.js';

const esc = v => String(v).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class Sankey extends Chart {
  constructor(selector, options = {}) {
    // linkColor 'type': the header legend lists the link types.
    const legend = options.legend ?? (options.linkColor === 'type' && options.linkTypes
      ? Object.entries(options.linkTypes).map(([type, cfg]) => ({
          label: cfg.label ?? type, color: cfg.color, type: 'bar',
        }))
      : undefined);
    super(selector, {
      height: 400,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
      ...(legend ? { legend } : {}),
    });
    this._baseHeight   = this.options.height;
    this._nodes        = [];
    this._links        = [];
    this._didAnimateIn = false;
    this._uid          = Math.random().toString(36).slice(2, 8);
    this._tooltip      = new Tooltip(this.container, this.theme);
    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data = {}) {
    const { nodes: rawNodes, links: rawLinks } = normalizeLinkData(data);

    // Valid flows only: a band needs a positive finite value.
    const links = [];
    rawLinks.forEach(l => {
      const v = +l.value;
      if (l.value == null || l.value === '' || !Number.isFinite(v) || v <= 0) {
        console.warn(`RareCharts.Sankey: link ${l.source} → ${l.target} has no positive value — dropped`);
        return;
      }
      links.push({ ...l, value: v });
    });

    // Nodes: explicit list, or derived from the links in order of appearance.
    let nodes;
    if (rawNodes.length) {
      nodes = rawNodes.map(n => ({ ...n, id: String(n.id) }));
      const known = new Set(nodes.map(n => n.id));
      for (let i = links.length - 1; i >= 0; i--) {
        const l = links[i];
        if (!known.has(l.source) || !known.has(l.target)) {
          console.warn(`RareCharts.Sankey: link ${l.source} → ${l.target} references an unknown node — dropped`);
          links.splice(i, 1);
        }
      }
    } else {
      const seen = new Map();
      links.forEach(l => [l.source, l.target].forEach(id => {
        if (!seen.has(id)) seen.set(id, { id, label: id });
      }));
      nodes = [...seen.values()];
    }

    // Same pair + same type = one band; sum it and say so.
    const merged = new Map();
    links.forEach(l => {
      const key = `${l.source}→${l.target}|${l.type ?? ''}`;
      const prev = merged.get(key);
      if (prev) {
        console.warn(`RareCharts.Sankey: repeated link ${l.source} → ${l.target}${l.type ? ` (${l.type})` : ''} — values summed`);
        prev.value += l.value;
      } else {
        merged.set(key, { ...l });
      }
    });

    this._nodes = nodes;
    this._links = [...merged.values()];
    // Validate now — a cycle is a data error the caller should see at once.
    sankeyLayout({ nodes: this._nodes, links: this._links }, { width: 100, height: 100, iterations: 0 });
    this._didAnimateIn = false;
    this.render();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width',  '100%')
      .attr('height', '100%');
    applySvgA11y(this.svg, this.options);
    this._defs  = this.svg.append('defs');
    this.gRoot  = this.svg.append('g').attr('class', 'rc-sankey');
    this.gLinks = this.gRoot.append('g').attr('class', 'rc-sankey-links');
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
      [this.gLinks, this.gNodes, this.gLabels].forEach(g => g.selectAll('*').remove());
      this._renderTable([]);
      return;
    }

    const vertical = this._orientation() === 'vertical';
    this._vertical = vertical;

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
    const fmt = o.valueFormat ?? (v => Number(v).toLocaleString());
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
    const mode = o.linkColor ?? 'source';
    const gradId = l => `rc-sankey-grad-${this._uid}-${l.index}`;
    const linkStroke = l => {
      if (mode === 'source') return nodeColor(l.source);
      if (mode === 'target') return nodeColor(l.target);
      if (mode === 'type') return linkTypes[l.data.type]?.color ?? t.muted;
      if (mode === 'gradient') return `url(#${gradId(l)})`;
      return mode;
    };
    this._defs.selectAll('linearGradient').remove();
    if (mode === 'gradient') {
      layout.links.forEach(l => {
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
    const animate = (o.animate ?? true) && !this._didAnimateIn;
    const dur = animate ? motionDuration(o.duration ?? 600) : 0;
    const ease = resolveEase(o.ease ?? 'cubicOut');
    // Guard set synchronously (the Bar race of 0.9.8_2): a re-render during
    // the entry transition must not restart it or freeze half-drawn bands.
    this._didAnimateIn = true;

    // ── Bands ──
    const linkSel = this.gLinks.selectAll('.rc-sankey-link')
      .data(layout.links, l => l.id)
      .join('path')
      .attr('class', 'rc-sankey-link')
      .attr('fill', 'none')
      .attr('d', bandPath)
      .attr('stroke', linkStroke)
      .attr('stroke-width', l => Math.max(1, l.width))
      .attr('role', 'img')
      .attr('aria-label', l => `${this._name(l.source)} → ${this._name(l.target)}: ${fmt(l.value)}`)
      .style('cursor', 'pointer');
    if (dur) {
      linkSel.interrupt().attr('stroke-opacity', 0)
        .transition().duration(dur).ease(ease).attr('stroke-opacity', baseOpacity);
    } else {
      linkSel.interrupt().attr('stroke-opacity', baseOpacity);
    }

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
    const reset = () => {
      linkSel.attr('stroke-opacity', baseOpacity);
      nodeSel.style('opacity', 1);
    };
    const highlightNode = n => {
      const touches = l => l.source === n || l.target === n;
      linkSel.attr('stroke-opacity', l => touches(l) ? Math.min(1, baseOpacity + 0.35) : 0.12);
      const near = new Set([n]);
      n.sourceLinks.forEach(l => near.add(l.target));
      n.targetLinks.forEach(l => near.add(l.source));
      nodeSel.style('opacity', x => near.has(x) ? 1 : 0.35);
    };
    const highlightLink = l => {
      linkSel.attr('stroke-opacity', x => x === l ? Math.min(1, baseOpacity + 0.4) : 0.12);
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
        this._tooltip.pin(mx, my, this._nodeHtml(n, fmt), { onClose: reset });
      });

    linkSel
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
        this._tooltip.pin(mx, my, this._linkHtml(l, fmt), { onClose: reset });
      });

    this._renderTable(layout.links, fmt);
  }

  // ─── Text ─────────────────────────────────────────────────────────────────

  _name(n) { return n.data.label ?? n.id; }

  _nodeHtml(n, fmt) {
    const o = this.options;
    if (o.tooltipFormat) {
      return o.tooltipFormat({
        node: n.data,
        incoming: n.targetLinks.map(l => l.data),
        outgoing: n.sourceLinks.map(l => l.data),
      });
    }
    const t = this.theme;
    const inV = n.targetLinks.reduce((s, l) => s + l.value, 0);
    const outV = n.sourceLinks.reduce((s, l) => s + l.value, 0);
    const row = (k, v) => `<div><span style="color:${t.muted}">${k}</span> ${esc(fmt(v))}</div>`;
    return `<div style="font-weight:bold;margin-bottom:2px">${esc(this._name(n))}</div>
      ${n.targetLinks.length ? row('in', inV) : ''}
      ${n.sourceLinks.length ? row('out', outV) : ''}`;
  }

  _linkHtml(l, fmt) {
    const o = this.options;
    if (o.linkTooltipFormat) {
      return o.linkTooltipFormat({ link: l.data, source: l.source.data, target: l.target.data });
    }
    const t = this.theme;
    const out = l.source.sourceLinks.reduce((s, x) => s + x.value, 0);
    const share = out ? ` · ${Math.round((l.value / out) * 100)}% of ${esc(this._name(l.source))}` : '';
    const type = l.data.type
      ? `<div style="color:${t.muted};font-size:11px">${esc(o.linkTypes?.[l.data.type]?.label ?? l.data.type)}</div>` : '';
    const label = l.data.label ? `<div>${esc(l.data.label)}</div>` : '';
    return `<div style="font-weight:bold;margin-bottom:2px">${esc(this._name(l.source))} → ${esc(this._name(l.target))}</div>
      <div>${esc(fmt(l.value))}<span style="color:${t.muted};font-size:11px">${share}</span></div>
      ${type}${label}`;
  }

  // Visually hidden table: the flows as data, for screen readers.
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

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    this._tooltip?.destroy();
    this._tooltip = null;
    this._tableEl?.remove();
    super.destroy();
  }
}

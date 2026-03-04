// RareCharts — Graph
// Force-directed network graph. Nodes + typed links.
//
// Data format:
// {
//   nodes: [{ id, label, group?, size?, color?, image? }, ...],
//   links: [{ source, target, type?, label?, strength? }, ...]
// }
//
// Node fields:
//   id       — unique string identifier
//   label    — display name
//   group    — 'person' | 'company' | 'org' | string (affects shape)
//   size     — relative size multiplier 1..3 (default: 1)
//   color    — override color
//   image    — avatar URL (shown inside circle)
//
// Link fields:
//   source, target  — node id references
//   type     — 'professional' | 'family' | 'friendship' | 'investment'
//            | 'philanthropy' | 'education' | string
//   label    — optional hover label
//   strength — force strength override 0..1
//
// Options:
//   height         — px (default: 520)
//   nodeRadius     — base radius px (default: 22)
//   linkDistance   — base link distance px (default: 120)
//   chargeStrength — repulsion force (default: -400)
//   animate        — run simulation (default: true)
//   focusOnClick   — dim unrelated nodes on click (default: true)
//   zoom           — enable scroll zoom + drag canvas (default: true)
//   linkTypes      — override colors/styles per type (see defaults below)
//   tooltipFormat  — function({ node, links }) => html

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';

export class Graph extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 520,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this._nodes      = [];
    this._links      = [];
    this._simulation = null;
    this._focused    = null;
    this._tooltip    = new Tooltip(this.container, this.theme);
    // linkTypes: pass a preset (e.g. linkPresets.personal) or your own map.
    // Fallback: a single 'default' type using accent color.
    this._linkTypes  = options.linkTypes ?? {
      default: { color: '#888888', dash: null, label: 'Connection' },
    };

    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData({ nodes = [], links = [] } = {}) {
    // Deep-copy so D3 force can annotate objects freely
    this._nodes = nodes.map(n => ({ ...n }));
    this._links = links.map(l => ({ ...l }));
    this._focused = null;
    this._stopSimulation();
    this.render();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width',  '100%')
      .attr('height', '100%')
      .style('cursor',   'grab')
      .style('overflow', 'hidden');  // prevent zoomed content from bleeding outside

    // Arrow markers per link type
    this._defs = this.svg.append('defs');

    // gRoot: offset group — sits below header (offsetY applied in render)
    this.gRoot = this.svg.append('g').attr('class', 'rc-graph-root');

    // gZoom: zoom/pan transforms this inner group, leaving offsetY intact on gRoot
    this.gZoom   = this.gRoot.append('g').attr('class', 'rc-graph-zoom');
    this.gLinks  = this.gZoom.append('g').attr('class', 'rc-graph-links');
    this.gLabels = this.gZoom.append('g').attr('class', 'rc-graph-link-labels');
    this.gNodes  = this.gZoom.append('g').attr('class', 'rc-graph-nodes');

    // Legend — HTML element, rendered outside SVG so it never overlaps nodes
    this._legendEl = document.createElement('div');
    this._legendEl.className = 'rc-graph-legend rc-legend';
    this.container.appendChild(this._legendEl);

    // Zoom
    if (this.options.zoom !== false) {
      this._zoom = d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', event => {
          this.gZoom.attr('transform', event.transform);
        });

      this.svg
        .call(this._zoom)
        .on('dblclick.zoom', null);   // disable dblclick zoom
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._nodes.length) return;

    // this.width / this.height subtract header and footer via base Chart class
    const W      = this.width;
    const H      = this.height;
    const offsetY = this._headerEl ? this._headerEl.offsetHeight + 8 : 0;
    if (W <= 0 || H <= 0) return;

    const t          = this.theme;
    const o          = this.options;
    const baseR      = o.nodeRadius    ?? 22;
    const linkDist   = o.linkDistance  ?? 140;
    const charge     = o.chargeStrength ?? -600;
    const focusMode  = o.focusOnClick  !== false;
    const palette    = t.colors ?? [];

    // ── Arrow markers (one per link type present in data) ──
    const typesInUse = Array.from(new Set(this._links.map(l => l.type ?? 'professional')));
    this._defs.selectAll('.rc-arrow').remove();

    typesInUse.forEach(type => {
      const cfg = this._linkTypes[type] ?? { color: t.muted };
      this._defs.append('marker')
        .attr('id',           `rc-arrow-${type}`)
        .attr('class',        'rc-arrow')
        .attr('viewBox',      '0 -4 8 8')
        .attr('refX',         8)
        .attr('refY',         0)
        .attr('markerWidth',  6)
        .attr('markerHeight', 6)
        .attr('orient',       'auto')
        .append('path')
        .attr('d',    'M0,-4L8,0L0,4')
        .attr('fill', cfg.color);
    });

    // ── Node color by group or index ──
    const groupIndex = {};
    this._nodes.forEach(n => {
      if (!(n.group in groupIndex)) {
        groupIndex[n.group] = Object.keys(groupIndex).length;
      }
    });
    const nodeColor = (n, i) =>
      n.color ?? palette[groupIndex[n.group] % palette.length] ?? t.accent;

    const nodeR = n => baseR * Math.min(3, Math.max(0.6, n.size ?? 1));

    // ── Links ──
    const linkSel = this.gLinks.selectAll('.rc-graph-link')
      .data(this._links, d => `${d.source?.id ?? d.source}→${d.target?.id ?? d.target}`)
      .join('line')
      .attr('class',            'rc-graph-link')
      .attr('stroke',           d => (this._linkTypes[d.type ?? 'professional'] ?? {}).color ?? t.muted)
      .attr('stroke-width',     d => Math.max(1, 2.5 * (d.strength ?? 0.5)))
      .attr('stroke-dasharray', d => (this._linkTypes[d.type ?? 'professional'] ?? {}).dash ?? null)
      .attr('stroke-opacity',   0.7)
      .attr('marker-end',       d => `url(#rc-arrow-${d.type ?? 'professional'})`);

    // ── Node groups (circle + label) ──
    const nodeSel = this.gNodes.selectAll('.rc-graph-node')
      .data(this._nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'rc-graph-node')
            .style('cursor', 'pointer')
            .call(this._dragBehavior());

          // Shadow / glow ring
          g.append('circle')
            .attr('class', 'rc-graph-node-ring')
            .attr('r',    d => nodeR(d) + 4)
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('opacity', 0);

          // Main circle
          g.append('circle')
            .attr('class',  'rc-graph-node-circle')
            .attr('r',      d => nodeR(d))
            .attr('fill',   (d, i) => nodeColor(d, i))
            .attr('stroke', t.bg)
            .attr('stroke-width', 2);

          // Avatar image (if provided)
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

          // Label backdrop — improves legibility on busy graphs
          g.append('rect')
            .attr('class',            'rc-graph-node-label-bg')
            .attr('rx',               3)
            .attr('fill',             t.bg ?? '#ffffff')
            .attr('opacity',          0.75)
            .style('pointer-events',  'none');

          // Label below
          g.append('text')
            .attr('class',            'rc-graph-node-label')
            .attr('text-anchor',      'middle')
            .attr('dominant-baseline','hanging')
            .attr('y',                d => nodeR(d) + 5)
            .attr('fill',             t.text)
            .style('font-family',     t.font)
            .style('font-size',       '11px')
            .style('pointer-events',  'none')
            .style('user-select',     'none')
            .text(d => d.label);

          // Size the backdrop rect to match the text bounding box
          g.each(function () {
            const grp  = d3.select(this);
            const txt  = grp.select('.rc-graph-node-label');
            const bg   = grp.select('.rc-graph-node-label-bg');
            const node = grp.datum();
            const tEl  = txt.node();
            if (!tEl) return;
            const bbox = tEl.getBBox ? tEl.getBBox() : { x: 0, y: 0, width: 0, height: 0 };
            const padX = 3, padY = 1;
            bg.attr('x',      bbox.x - padX)
              .attr('y',      bbox.y - padY)
              .attr('width',  bbox.width  + padX * 2)
              .attr('height', bbox.height + padY * 2);
          });

          return g;
        },
        update => update,
        exit   => exit.remove()
      );

    // ── Hover ──
    nodeSel
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('stroke', nodeColor(d))
          .attr('opacity', 0.4);

        const nodeLinks = this._links.filter(
          l => (l.source?.id ?? l.source) === d.id || (l.target?.id ?? l.target) === d.id
        );

        const html = o.tooltipFormat
          ? o.tooltipFormat({ node: d, links: nodeLinks })
          : this._defaultTooltip(d, nodeLinks);

        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, html);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).select('.rc-graph-node-ring')
          .attr('opacity', 0);
        this._tooltip.hide();
      });

    // ── Focus on click ──
    if (focusMode) {
      nodeSel.on('click', (event, d) => {
        event.stopPropagation();
        this._focused = this._focused?.id === d.id ? null : d;
        this._applyFocus(nodeSel, linkSel);
      });

      this.svg.on('click', () => {
        this._focused = null;
        this._applyFocus(nodeSel, linkSel);
      });
    }

    // ── Legend ──
    this._renderLegend(typesInUse, t);

    // ── Group cluster centers ──
    // Arrange group anchors in a circle so related nodes naturally cluster
    const groups   = Array.from(new Set(this._nodes.map(n => n.group ?? 'default')));
    const clusterR = Math.min(W, H) * 0.28;
    const clusterX = {};
    const clusterY = {};
    groups.forEach((g, i) => {
      const angle  = (i / groups.length) * 2 * Math.PI - Math.PI / 2;
      clusterX[g]  = W / 2 + clusterR * Math.cos(angle);
      clusterY[g]  = H / 2 + clusterR * Math.sin(angle);
    });

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    // Per-node padding: circle radius + rough label half-width (x) or label height (y)
    // so labels stay inside the SVG even with overflow: hidden
    const padX = d => nodeR(d) + Math.ceil((d.label?.length ?? 0) * 3.5) + 8;
    const padY = d => nodeR(d) + 20;  // label sits ~20px below node center

    // ── Force simulation ──
    this._simulation = d3.forceSimulation(this._nodes)
      .force('link', d3.forceLink(this._links)
        .id(d => d.id)
        .distance(l => linkDist * (1.2 / (l.strength ?? 0.5)))
        .strength(l => (l.strength ?? 0.5) * 0.7)
      )
      // Larger nodes push harder — keeps hubs from being buried by their neighbors
      .force('charge',  d3.forceManyBody()
        .strength(d => charge * Math.max(1, (d.size ?? 1) * 0.75))
        .distanceMax(W * 0.7))
      .force('center',  d3.forceCenter(W / 2, H / 2).strength(0.03))
      // +20 padding so labels don't eat into neighboring nodes
      .force('collide', d3.forceCollide().radius(d => nodeR(d) + 20).strength(0.9))
      // Weaker cluster pull — repulsion should dominate over grouping
      .force('clusterX', d3.forceX(d => clusterX[d.group ?? 'default'] ?? W / 2).strength(0.07))
      .force('clusterY', d3.forceY(d => clusterY[d.group ?? 'default'] ?? H / 2).strength(0.07))
      .on('tick', () => {
        // Clamp nodes so their labels stay inside the SVG bounds
        this._nodes.forEach(d => {
          const px = padX(d), py = padY(d);
          d.x = clamp(d.x, px, W - px);
          d.y = clamp(d.y, py, H - py);
        });

        linkSel
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => {
            const r   = nodeR(d.target) + 8;
            const dx  = d.target.x - d.source.x;
            const dy  = d.target.y - d.source.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return d.target.x - (dx / len) * r;
          })
          .attr('y2', d => {
            const r   = nodeR(d.target) + 8;
            const dx  = d.target.x - d.source.x;
            const dy  = d.target.y - d.source.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return d.target.y - (dy / len) * r;
          });

        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    // Cool down faster for large graphs
    if (this._nodes.length > 60) {
      this._simulation.alphaDecay(0.025);
    }
  }

  // ─── Focus dim/highlight ──────────────────────────────────────────────────

  _applyFocus(nodeSel, linkSel) {
    const f = this._focused;
    if (!f) {
      nodeSel.attr('opacity', 1);
      linkSel.attr('opacity', 0.7);
      return;
    }

    const connectedIds = new Set([f.id]);
    this._links.forEach(l => {
      const s = l.source?.id ?? l.source;
      const t = l.target?.id ?? l.target;
      if (s === f.id) connectedIds.add(t);
      if (t === f.id) connectedIds.add(s);
    });

    nodeSel.attr('opacity', d => connectedIds.has(d.id) ? 1 : 0.12);
    linkSel.attr('opacity', l => {
      const s = l.source?.id ?? l.source;
      const t = l.target?.id ?? l.target;
      return (s === f.id || t === f.id) ? 1 : 0.04;
    });
  }

  // ─── Drag ─────────────────────────────────────────────────────────────────

  _dragBehavior() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this._simulation?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.closest('.rc-graph-node'))
          .style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this._simulation?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(event.sourceEvent.target.closest('.rc-graph-node'))
          .style('cursor', 'pointer');
      });
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
    const byType = {};
    nodeLinks.forEach(l => {
      const type = l.type ?? 'professional';
      if (!byType[type]) byType[type] = [];
      const other = (l.source?.id ?? l.source) === node.id
        ? (l.target?.label ?? l.target?.id ?? l.target)
        : (l.source?.label ?? l.source?.id ?? l.source);
      byType[type].push(other);
    });

    const cfg = type => this._linkTypes[type] ?? { color: t.muted };

    const rows = Object.entries(byType).map(([type, names]) =>
      `<div style="margin-top:4px">
        <span style="color:${cfg(type).color};font-size:10px;text-transform:uppercase;
                     letter-spacing:0.06em">${cfg(type).label ?? type}</span>
        <div style="color:${t.text}">${names.join(', ')}</div>
       </div>`
    ).join('');

    return `
      <div style="font-weight:bold;margin-bottom:2px">${node.label}</div>
      ${node.group ? `<div style="color:${t.muted};font-size:10px;margin-bottom:4px">${node.group}</div>` : ''}
      ${rows}
    `;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  _stopSimulation() {
    if (this._simulation) {
      this._simulation.stop();
      this._simulation = null;
    }
  }

  destroy() {
    this._stopSimulation();
    super.destroy();
  }
}

export { linkPresets } from './presets/linkPresets.js';

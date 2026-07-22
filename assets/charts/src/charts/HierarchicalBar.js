// RareCharts — HierarchicalBar
// Horizontal outline of a tree: one row per node, indented by depth, each with
// its own bar on a shared value scale. Parent rows carry their subtotal; nested
// rows read as an editorial breakdown — a portfolio overview, an org rollup, a
// budget decomposition. The linear (outline) view of a shallow hierarchy; the
// spatial views (treemap/pack/sunburst) belong to the future Hierarchies class.
//
// Consumes the shared tree normalizer (core/hierarchy.js): pass ONE root object
// OR an array of roots (a forest). Authored node:
//   { label, value?, color?, children?, remainderLabel? }
// See core/hierarchy.js for the value tri-state (a number > 0 / null "missing"
// placeholder / dropped) and the remainder rules.
//
// Options:
//   showRoot       — render the root row(s) (default: true). When false, a
//                    single root is dropped and its children become the top rows
//                    (the root reads as the header/total instead of a bar).
//   rowHeight      — px per row (default: 44)
//   indent         — px indent per depth level (default: 16)
//   barHeight      — bar thickness px (default: value-label font size + 2)
//   maxDepth       — deepest level to render, 0-based from the top row (default: no limit)
//   showValues     — value label at each bar end (default: true)
//   valueFormat    — function(node) => string  (default: locale integer)
//   labelMaxLength — truncate a label to N chars; full label stays in the tooltip
//   missingGlyph   — marker drawn where a value:null node's bar would be (default: '?')
//   showRemainder / remainderLabel / strict — forwarded to the normalizer
//   animate        — grow bars on first render (default: true)
//   duration       — animation ms (default: 500)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//   tooltipFormat  — function(node) => html string

import * as d3 from 'd3';
import { Chart }                 from '../core/Chart.js';
import { Tooltip }               from '../core/Tooltip.js';
import { resolveEase, motionDuration } from '../core/utils.js';
import { applySvgA11y }          from '../core/renderHelpers.js';
import { normalizeHierarchy }    from '../core/hierarchy.js';

export class HierarchicalBar extends Chart {
  constructor(selector, options = {}) {
    const { margin: _m, ...rest } = options;

    super(selector, {
      height: options.height ?? 200,   // content-driven; kept for base getters
      margin: {
        top:    options.margin?.top    ?? 8,
        right:  options.margin?.right  ?? 8,
        bottom: options.margin?.bottom ?? 8,
        left:   options.margin?.left   ?? 0,
      },
      ...rest,
    });

    this._tree         = null;
    this._didAnimateIn = false;
    this._tooltip      = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  setData(input) {
    this._tree = normalizeHierarchy(input, {
      showRemainder:  this.options.showRemainder  ?? false,
      remainderLabel: this.options.remainderLabel ?? 'Other',
      strict:         this.options.strict         ?? false,
    });
    this._didAnimateIn = false;
    this.render();
    return this;
  }

  _initSVG() {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .style('display', 'block');
    applySvgA11y(this.svg, this.options);

    this.g     = this.svg.append('g');
    this.gRows = this.g.append('g');
  }

  _formatLabel(label) {
    const max = this.options.labelMaxLength;
    if (!max || label.length <= max) return label;
    return label.slice(0, max).trimEnd() + '…';
  }

  // Depth-first flatten into render rows, assigning each a branch color and a
  // depth fade. The branch head — the level that seeds a palette color — is the
  // root's children when the root is shown, otherwise the top rows themselves.
  _flatten() {
    const roots = Array.isArray(this._tree) ? this._tree : (this._tree ? [this._tree] : []);
    if (!roots.length) return [];

    const showRoot  = this.options.showRoot ?? true;
    const maxDepth  = this.options.maxDepth ?? Infinity;
    const palette   = this.theme.colors ?? [];
    const singleRoot = roots.length === 1;

    const startNodes  = (showRoot || !singleRoot) ? roots : (roots[0].children ?? []);
    const branchDepth = (showRoot && singleRoot) ? 1 : 0;

    const rows = [];
    let branch = 0;

    const walk = (node, renderDepth, inherited) => {
      if (renderDepth > maxDepth) return;

      let color;
      if (renderDepth < branchDepth)      color = this.theme.muted;                         // root — a neutral total, above its branches
      else if (renderDepth === branchDepth) color = node.color ?? palette[branch++ % palette.length] ?? this.theme.accent;
      else                                color = node.color ?? inherited;                  // inherits its branch hue
      if (node.isRemainder) color = this.theme.muted;

      const fade    = Math.max(0, renderDepth - branchDepth);
      const opacity = node.isRemainder ? 0.55 : Math.max(0.5, 1 - fade * 0.16);

      rows.push({ node, renderDepth, color, opacity });

      if (renderDepth < maxDepth && node.children?.length) {
        node.children.forEach(c => walk(c, renderDepth + 1, color));
      }
    };

    startNodes.forEach(n => walk(n, 0, null));
    return rows;
  }

  _tooltipHtml(node, pct) {
    if (this.options.tooltipFormat) return this.options.tooltipFormat(node);
    const t = this.theme;
    const valueFmt = this.options.valueFormat ?? (n => d3.format(',')(n.value));
    const value = node.missing
      ? `<span style="color:${t.muted}">not disclosed</span>`
      : valueFmt(node);
    const pctLine = (node.missing || pct == null) ? ''
      : `<div style="color:${t.muted}">${d3.format('.1%')(pct)}</div>`;
    return `<div>${node.label}</div><div>${value}</div>${pctLine}`;
  }

  render() {
    const rows = this._tree ? this._flatten() : [];
    if (!rows.length) { this.gRows.selectAll('*').remove(); return; }

    const W = this.width;
    if (W <= 0) return;

    const t          = this.theme;
    const rowHeight  = this.options.rowHeight ?? 44;
    const indent     = this.options.indent    ?? 16;
    // Bar height tracks the value-label font (font size + 2px) unless overridden.
    // The value font lives in CSS (.rc-hbar-value); measure it off a probe.
    const probe      = this.gRows.append('text').attr('class', 'rc-hbar-value').text('0');
    const fontPx     = parseFloat((typeof getComputedStyle !== 'undefined' && getComputedStyle(probe.node()).fontSize) || '') || 14;
    probe.remove();
    const barHeight  = this.options.barHeight ?? Math.round(fontPx + 2);
    const labelY     = 14;   // label baseline from the row top
    const barGap     = 6;    // fixed gap below the label. The bar is anchored to the
                             // TOP (label + gap), not the row bottom, so the label↔bar
                             // pairing is identical at any rowHeight — rowHeight only
                             // sets the space between rows.
    const showValues = this.options.showValues ?? true;
    const valueFmt   = this.options.valueFormat ?? (n => d3.format(',')(n.value));
    const glyph      = this.options.missingGlyph ?? '?';
    const animate    = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration   = motionDuration(this.options.duration ?? 500);
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');

    const plotH = rows.length * rowHeight;
    this.svg.attr('height', plotH + this.margin.top + this.margin.bottom);
    this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const rootValue = d3.max(rows, r => typeof r.node.value === 'number' ? r.node.value : 0) || 1;
    const x = d3.scaleLinear().domain([0, rootValue]).range([0, W]);
    const valueGap = 46;   // px past the bar end reserved for the value label

    // Geometry per row, stored on the datum so the animation pass can read it.
    rows.forEach((r, i) => {
      r.top  = i * rowHeight;
      r.barX = Math.min(r.renderDepth * indent, W - 12);
      r.barY = r.top + labelY + barGap;
      r.barW = (typeof r.node.value === 'number')
        ? Math.max(0, Math.min(x(r.node.value), W - r.barX))
        : 0;
      r.pct  = (typeof r.node.value === 'number') ? r.node.value / rootValue : null;
    });

    const sel = this.gRows.selectAll('g.rc-hbar-row')
      .data(rows, r => r.node.id)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'rc-hbar-row');
          g.append('rect').attr('class', 'rc-hbar-bar');
          g.append('text').attr('class', 'rc-hbar-label');
          g.append('text').attr('class', 'rc-hbar-value');
          return g;
        },
        update => update,
        exit => exit.remove()
      );

    sel.each((r, i, nodes) => {
      const g = d3.select(nodes[i]);

      g.select('.rc-hbar-label')
        .attr('x', r.barX).attr('y', r.top + labelY)
        .attr('fill', r.node.isRemainder ? t.muted : t.text)
        .text(this._formatLabel(r.node.label));

      g.select('.rc-hbar-bar')
        .attr('x', r.barX).attr('y', r.barY)
        .attr('height', barHeight).attr('rx', 2)
        .attr('fill', r.color).attr('opacity', r.opacity)
        .attr('display', r.node.missing ? 'none' : null);

      // Value / missing marker on the bar line.
      const vsel = g.select('.rc-hbar-value')
        .attr('y', r.barY + barHeight / 2).attr('dy', '0.35em');

      if (r.node.missing) {
        vsel.attr('x', r.barX).attr('text-anchor', 'start').attr('fill', t.muted).text(glyph);
      } else if (showValues) {
        const end    = r.barX + r.barW;
        const inside = (W - end) < valueGap;
        vsel.attr('x', inside ? Math.max(r.barX + 4, end - 6) : end + 6)
            .attr('text-anchor', inside ? 'end' : 'start')
            .attr('fill', inside ? t.bg : t.muted)
            .text(valueFmt(r.node));
      } else {
        vsel.text('');
      }

      // Hover the row's actual content (bar + label + value) — an SVG <g> only
      // receives pointer events over its painted children, so the empty gutter
      // to the right of a bar no longer triggers. enter/leave (not over/out)
      // means moving between the label and the bar doesn't flicker the tooltip.
      const move = (event) => {
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, this._tooltipHtml(r.node, r.pct));
      };
      g.style('cursor', 'default')
        .on('mouseenter', (event) => { g.select('.rc-hbar-bar').attr('opacity', Math.min(1, r.opacity + 0.2)); move(event); })
        .on('mousemove', move)
        .on('mouseleave', () => { g.select('.rc-hbar-bar').attr('opacity', r.opacity); this._tooltip.hide(); });
    });

    // Bar grow on first render.
    const bars = sel.select('.rc-hbar-bar');
    if (animate) {
      bars.attr('width', 0)
        .transition().duration(duration).ease(ease)
        .attr('width', r => r.barW)
        .on('end', (d, i, n) => { if (i === n.length - 1) this._didAnimateIn = true; });
    } else {
      bars.attr('width', r => r.barW);
      this._didAnimateIn = true;
    }
  }
}

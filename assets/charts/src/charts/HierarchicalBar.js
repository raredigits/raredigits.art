// RareCharts — HierarchicalBar
// Horizontal outline of a tree: one row per node, its name beside or above
// its own bar, every bar from one shared zero line. Parent rows carry their
// subtotal, name and value in semibold; nested rows read as an editorial
// breakdown — a portfolio overview, an org rollup, a budget decomposition.
// The linear (outline) view of a shallow hierarchy; the spatial views
// (treemap/pack/sunburst) belong to the future Hierarchies class.
//
// Consumes the shared tree normalizer (core/hierarchy.js): pass ONE root object
// OR an array of roots (a forest). Authored node:
//   { label, value?, color?, children?, remainderLabel? }
// See core/hierarchy.js for the value tri-state (a number > 0 / null "missing"
// placeholder / dropped) and the remainder rules.
//
// Options:
//   showRoot       — render the root row(s) (default: true). When false, a
//                    single root (an object, or an array of one) is dropped and
//                    its children become the top rows (the root reads as the
//                    header/total instead of a bar); no effect on a forest.
//   margin         — { top, right, bottom, left } (default: 8, 8, 8, 0); the
//                    height follows the rows, top and bottom add to it
//   rowHeight      — px per row (default: 28 side by side, 44 stacked; a
//                    name wrapped to two lines adds a line to its row)
//   indent         — px indent of the name per depth level (default: 16);
//                    bars always start at the shared zero line
//   labelAlign     — side by side: 'right' sets every name flush against the
//                    bars, 'left' indents it by depth (default: 'right');
//                    stacked, the name is always indented
//   barHeight      — bar thickness px (default: value-label font size + 2)
//   maxDepth       — deepest level to render, 0-based from the top row (default: no limit)
//   showValues     — value labels (default: true): side by side in a
//                    right-aligned column, stacked at the bar end
//   valueFormat    — function(node, info) => string  (default: d3.format(','));
//                    arguments as tooltipFormat's
//   labelMaxLength — truncate a label to N chars; full label stays in the tooltip
//   missingGlyph   — marker drawn where a value:null node's bar would be (default: '?')
//   showRemainder / remainderLabel / strict — forwarded to the normalizer
//   animate        — grow bars from zero on every setData (default: true)
//   duration       — animation ms (default: 500)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//   tooltipFormat  — function(node, info) => html string; the default shows
//                    the label, the value and its share of the total (the
//                    single root's value, shown or not; a forest: the roots'
//                    sum). node is the tree node (core/hierarchy.js), info its
//                    role fields { label, value, color, percent } — color as
//                    drawn, percent that share (null without a value or a
//                    positive total). The rule for every class (K-09):
//                    /charts/settings/#formatter-arguments
//
// Layout (C-28): from 480 px of plot width a row reads name → bar → value —
// the names in a left column (up to 40% of the width; a longer name wraps
// once, then ends in an ellipsis), branch groups set apart by a gap.
// Narrower, each name sits on its own line above its bar, shortened with an
// ellipsis to the width. The tooltip always has the full name.
//
// The row of a shown single root is always neutral (theme.muted) and a
// remainder always muted; any other row takes its own color, then its branch
// colour.

import * as d3 from 'd3';
import { Chart }                 from '../core/Chart.js';
import { Tooltip }               from '../core/Tooltip.js';
import { resolveEase, motionDuration } from '../core/utils.js';
import { EntryMotion, entryTransition } from '../core/entryMotion.js';
import { applySvgA11y }          from '../core/renderHelpers.js';
import { normalizeHierarchy }    from '../core/hierarchy.js';
import { escapeHtml, tipHeader, tipMuted } from '../core/html.js';

// Plot width (px) from which a row reads name → bar → value side by side;
// narrower, the name sits on its own line above the bar (C-28).
const SIDE_MIN_WIDTH = 480;

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
    this._entry        = new EntryMotion();   // a growth per dataset (C-16)
    this._tooltip      = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  setData(input) {
    this._tree = normalizeHierarchy(input, {
      showRemainder:  this.options.showRemainder  ?? false,
      remainderLabel: this.options.remainderLabel ?? 'Other',
      strict:         this.options.strict         ?? false,
    });
    // Each dataset grows in from zero. The font-load and first-resize renders
    // that follow setData carry the growth on (C-16) — they used to finalise
    // the bars before it was seen.
    this._entry.reset();
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

      // head: a branch head (the level that seeds a palette color) — the
      // layout puts space before a new group (C-28).
      rows.push({ node, renderDepth, color, opacity, head: renderDepth === branchDepth });

      if (renderDepth < maxDepth && node.children?.length) {
        node.children.forEach(c => walk(c, renderDepth + 1, color));
      }
    };

    startNodes.forEach(n => walk(n, 0, null));
    return rows;
  }

  // info: the row's role fields (K-09) — the node stays the first argument.
  _tooltipHtml(node, info) {
    if (this.options.tooltipFormat) return this.options.tooltipFormat(node, info);
    const valueFmt = this.options.valueFormat ?? (n => d3.format(',')(n.value));
    const pct = info.percent;
    const value = node.missing
      ? tipMuted('not disclosed', 'span')
      : escapeHtml(valueFmt(node, info));
    const pctLine = (node.missing || pct == null) ? ''
      : tipMuted(d3.format('.1%')(pct));
    return `${tipHeader(escapeHtml(node.label))}<div>${value}</div>${pctLine}`;
  }

  render() {
    const rows = this._tree ? this._flatten() : [];
    if (!rows.length) { this.gRows.selectAll('*').remove(); return; }

    const W = this.width;
    if (W <= 0) return;

    const t          = this.theme;
    // Two layouts (C-28): name → bar → value side by side from SIDE_MIN_WIDTH
    // px of plot width; narrower, the name on its own line above the bar.
    const side       = W >= SIDE_MIN_WIDTH;
    const rowHeight  = this.options.rowHeight ?? (side ? 28 : 44);
    const indent     = this.options.indent    ?? 16;
    // Side by side, names flush against the bars by default; 'left' keeps
    // the indented outline. Stacked, the name is above its bar and indents.
    const flush      = side && (this.options.labelAlign ?? 'right') !== 'left';
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
    const duration   = motionDuration(this.options.duration ?? 500);
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');
    const phase      = this._entry.phase((this.options.animate ?? true) ? duration : 0);

    // Side by side, a row reads left to right: the name in a column of its
    // own, flush against the bar (or indented by depth) → the bar from one
    // zero line shared by every row → the value in a right-aligned column.
    // Stacked, the name keeps its line above the bar. Depth never moves the
    // bar's start, and a parent row's name and value are semibold.
    const lineH    = Math.round(fontPx * 1.2);   // second line of a wrapped name
    const groupGap = 8;                          // extra space before a new group
    const maxDepth = this.options.maxDepth ?? Infinity;

    // Text widths off a probe. Without a layout engine (or before the svg is
    // laid out) getComputedTextLength gives 0: estimate from the length.
    const meter   = this.gRows.append('text');
    const measure = (text, cls, bold) => {
      meter.attr('class', cls).attr('font-weight', bold ? 600 : null).text(text);
      const n   = meter.node();
      const len = n.getComputedTextLength ? n.getComputedTextLength() : 0;
      return len > 0 || !text ? len : text.length * fontPx * (bold ? 0.6 : 0.56);
    };
    // The longest prefix that fits with its ellipsis (binary search: one
    // measurement per halving, not per character, on a long outline).
    const fit = (text, avail, bold) => {
      if (measure(text, 'rc-hbar-label', bold) <= avail) return text;
      const cut = n => text.slice(0, n).trimEnd() + '…';
      let lo = 1;
      let hi = text.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (measure(cut(mid), 'rc-hbar-label', bold) <= avail) lo = mid; else hi = mid - 1;
      }
      return cut(lo);
    };
    // A name wider than its room wraps once, at a word; what the second line
    // cannot hold ends in an ellipsis (the tooltip keeps the full name).
    const wrap = (text, avail, bold, maxLines) => {
      const words = text.split(/\s+/);
      if (maxLines < 2 || words.length < 2
        || measure(text, 'rc-hbar-label', bold) <= avail
        || measure(words[0], 'rc-hbar-label', bold) > avail) return [fit(text, avail, bold)];
      let first = words[0];
      let k = 1;
      while (k < words.length && measure(`${first} ${words[k]}`, 'rc-hbar-label', bold) <= avail) first += ` ${words[k++]}`;
      return [first, fit(words.slice(k).join(' '), avail, bold)];
    };

    rows.forEach(r => {
      r.parent = r.renderDepth < maxDepth && (r.node.children?.length ?? 0) > 0;
      r.label  = this._formatLabel(r.node.label);
    });

    // The tooltip share is of the total, not of the longest bar: the single
    // root's value, whether its row is shown or not (showRoot: false keeps
    // the root as the total), or the sum of the roots of a forest. Without a
    // positive total there is no share line.
    const roots = Array.isArray(this._tree) ? this._tree : [this._tree];
    const total = d3.sum(roots, n => (typeof n?.value === 'number' ? n.value : 0));
    // The role fields every formatter gets second (K-09): the share is
    // `percent`, the colour the bar's.
    rows.forEach(r => {
      r.info = {
        label:   r.node.label,
        value:   r.node.value,
        color:   r.color,
        percent: (typeof r.node.value === 'number' && total > 0) ? r.node.value / total : null,
      };
    });
    const fmtValue = r => valueFmt(r.node, r.info);

    // Side by side: names take up to 40% of the width, values as much as the
    // widest needs, the bars the rest. Stacked: the bars span the width.
    let x0 = 0;
    let x1 = W;
    if (side) {
      const nameW  = d3.max(rows, r => (flush ? 0 : r.renderDepth * indent) + measure(r.label, 'rc-hbar-label', r.parent)) ?? 0;
      const labelW = Math.min(Math.ceil(nameW), Math.round(W * 0.4));
      const valueW = showValues
        ? Math.ceil(d3.max(rows, r => (r.node.missing ? 0 : measure(fmtValue(r), 'rc-hbar-value', r.parent))) ?? 0)
        : 0;
      x0 = labelW + 12;
      x1 = Math.max(x0, W - (valueW > 0 ? valueW + 10 : 0));
    }

    const rootValue = d3.max(rows, r => typeof r.node.value === 'number' ? r.node.value : 0) || 1;
    const x = d3.scaleLinear().domain([0, rootValue]).range([0, x1 - x0]);
    const valueGap = 46;   // stacked: px past the bar end reserved for the value label

    // Geometry per row, stored on the datum so the animation pass can read it.
    // A new branch group starts after a gap — except between branch heads
    // that are single rows, which stay a compact list.
    let y = 0;
    rows.forEach((r, i) => {
      const prev = rows[i - 1];
      if (prev && r.head && !(prev.head && !prev.parent && !r.parent)) y += groupGap;
      const room = side ? x0 - 12 : W;
      r.labelX = flush ? room : Math.min(r.renderDepth * indent, room / 2);
      r.lines  = wrap(r.label, flush ? room : room - r.labelX, r.parent, side ? 2 : 1);
      r.top    = y;
      r.h      = rowHeight + (r.lines.length - 1) * lineH;
      r.barX   = x0;
      if (side) {
        const mid = y + r.h / 2;
        r.barY   = mid - barHeight / 2;
        r.labelY = mid - ((r.lines.length - 1) * lineH) / 2;   // first line's middle
      } else {
        r.barY   = y + labelY + barGap;
        r.labelY = y + labelY;                                  // baseline
      }
      r.barW = (typeof r.node.value === 'number')
        ? Math.max(0, Math.min(x(r.node.value), x1 - x0))
        : 0;
      // Stacked: the value's own width decides whether it fits past the bar
      // end (a fixed gap let a long value run off the plot on a phone).
      r.valueW = showValues && !side && !r.node.missing ? measure(fmtValue(r), 'rc-hbar-value', r.parent) : 0;
      y += r.h;
    });
    meter.remove();

    this.svg.attr('height', y + this.margin.top + this.margin.bottom);
    this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

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
      const weight = r.parent ? 600 : null;

      // The name, one tspan per line. A wrapped first line keeps a trailing
      // space, so the label's textContent still reads as the name.
      g.select('.rc-hbar-label')
        .attr('x', r.labelX).attr('y', r.labelY)
        .attr('text-anchor', flush ? 'end' : null)
        .attr('font-weight', weight)
        .attr('fill', r.node.isRemainder ? t.muted : t.text)
        .selectAll('tspan')
        .data(r.lines)
        .join('tspan')
        .attr('x', r.labelX)
        .attr('dy', (d, k) => (k ? lineH : (side ? '0.35em' : 0)))
        .text((d, k) => (k < r.lines.length - 1 ? `${d} ` : d));

      g.select('.rc-hbar-bar')
        .attr('x', r.barX).attr('y', r.barY)
        .attr('height', barHeight).attr('rx', 2)
        .attr('fill', r.color).attr('opacity', r.opacity)
        .attr('display', r.node.missing ? 'none' : null);

      // Value / missing marker on the bar line: side by side in the value
      // column, stacked at the bar end (inside it when the room runs out).
      const vsel = g.select('.rc-hbar-value')
        .attr('y', r.barY + barHeight / 2).attr('dy', '0.35em')
        .attr('font-weight', r.node.missing ? null : weight);

      if (r.node.missing) {
        vsel.attr('x', r.barX).attr('text-anchor', 'start').attr('fill', t.muted).text(glyph);
      } else if (showValues && side) {
        vsel.attr('x', W).attr('text-anchor', 'end')
            .attr('fill', r.parent ? t.text : t.muted)
            .text(fmtValue(r));
      } else if (showValues) {
        const end    = r.barX + r.barW;
        const inside = (W - end) < Math.max(valueGap, r.valueW + 6);
        vsel.attr('x', inside ? Math.max(r.barX + 4, end - 6) : end + 6)
            .attr('text-anchor', inside ? 'end' : 'start')
            .attr('fill', inside ? t.bg : t.muted)
            .text(fmtValue(r));
      } else {
        vsel.text('');
      }

      // Hover the row's actual content (bar + label + value) — an SVG <g> only
      // receives pointer events over its painted children, so the empty gutter
      // to the right of a bar no longer triggers. enter/leave (not over/out)
      // means moving between the label and the bar doesn't flicker the tooltip.
      const move = (event) => {
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, this._tooltipHtml(r.node, r.info));
      };
      g.style('cursor', 'default')
        .on('mouseenter', (event) => { g.select('.rc-hbar-bar').attr('opacity', Math.min(1, r.opacity + 0.2)); move(event); })
        .on('mousemove', move)
        .on('mouseleave', () => { g.select('.rc-hbar-bar').attr('opacity', r.opacity); this._tooltip.hide(); });
    });

    // Bars grow from zero on each setData, on the entry timeline (C-16): a
    // render in the middle of the growth — fonts.ready, the first resize —
    // carries each bar on from its current width to this render's width for
    // the time left, instead of finalising it (the growth went unseen) or
    // starting over. A row added mid-growth starts from zero.
    const bars = sel.select('.rc-hbar-bar');
    if (phase === 'none') {
      bars.interrupt().attr('width', r => r.barW);
    } else {
      if (phase === 'enter') bars.interrupt().attr('width', 0);
      else bars.filter(function () { return !this.hasAttribute('width'); }).attr('width', 0);
      const { moving, settled } = entryTransition(bars, this._entry, { duration, ease });
      settled.attr('width', r => r.barW);
      moving.attr('width', r => r.barW);
    }
  }
}

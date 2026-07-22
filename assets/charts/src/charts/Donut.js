// RareCharts — Donut / Pie
// Circular chart. Pie = Donut with innerRadius: 0.
//
// Expected data format:
// [{ label: string, value: number, color?: string }, ...]
//
// Options:
//   height       — chart height px (default: 280)
//   innerRadius  — 0 for pie, 0..1 as fraction of outer radius (default: 0.58)
//   padAngle     — gap between slices in radians (default: 0.018 donut / 0.008 pie)
//   cornerRadius — rounded slice corners px (default: 3 donut / 1 pie)
//
//   animate      — animate on first render (default: true)
//   duration     — animation duration ms (default: 650)
//   ease         — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showLabels   — show slice labels with leader lines outside the chart (default: false)
//   labelMinPct  — hide label when slice is smaller than this fraction (default: 0.04)
//   labelContent — what outside labels show: 'both' | 'label' | 'percent' (default: 'both')
//   showCenter   — show text in the center hole (default: true for donut)
//   centerText   — string | function(data) => string (default: formatted total)
//   centerLabel  — secondary line below centerText (default: 'Total')
//
//   valueFormat  — function(v) => string (default: locale number)
//   percentFormat— function(pct) => string (default: '12.3%')
//   tooltipFormat— function({label, value, percent, color}) => html
//
// Drill-down (hierarchy mode): call setData with ONE ROOT OBJECT instead of an
// array — { label, value?, color?, children?, remainderLabel? } — and the donut
// becomes an interactive drill-down over the tree (contract: core/hierarchy.js).
// It opens on the root's children; clicking a slice with children descends;
// clicking the center (or a breadcrumb) goes back up; a leaf shows its value.
// Public navigation: drillTo(node), drillUp(), drillToDepth(index).
//   showRemainder  — draw each node's remainder (value − Σ children) as a
//                    muted slice (default: false; a per-node remainderLabel
//                    surfaces just that node's remainder)
//   remainderLabel — fallback label for surfaced remainders (default: 'Other')
//   strict         — throw when children exceed a parent's stated value
//                    (default: warn and leave the negative remainder undrawn)

import * as d3 from 'd3';
import { Chart }       from '../core/Chart.js';
import { Tooltip }     from '../core/Tooltip.js';
import { resolveEase, motionDuration } from '../core/utils.js';
import { applySvgA11y } from '../core/renderHelpers.js';
import { normalizeHierarchy } from '../core/hierarchy.js';

// Truncate a text node's content with an ellipsis until it fits `avail` px.
// The full text stays available in the tooltip. No-op where text measurement
// is unavailable (jsdom).
function fitTextNode(node, full, avail) {
  if (!node.getComputedTextLength) return;
  let s = String(full);
  node.textContent = s;
  while (s.length > 1 && node.getComputedTextLength() > avail) {
    s = s.slice(0, -1).trimEnd();
    node.textContent = s + '…';
  }
}

export class Donut extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 280,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
    });

    this._data         = [];
    this._didAnimateIn = false;
    this._tooltip      = new Tooltip(this.container, this.theme);

    // Drill-down state (hierarchy mode). _mode is 'flat' for a plain slice list
    // or 'hier' for a normalized tree; _trail is the root→focus path.
    this._mode  = 'flat';
    this._tree  = null;
    this._trail = [];

    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  // A plain ARRAY is the classic flat donut. A single root OBJECT switches on
  // drill-down: the tree is normalized once and navigated in place.
  setData(data) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      this._mode  = 'hier';
      this._tree  = normalizeHierarchy(data, {
        showRemainder:  this.options.showRemainder  ?? false,
        remainderLabel: this.options.remainderLabel ?? 'Other',
        strict:         this.options.strict         ?? false,
      });
      this._trail = this._tree ? [this._tree] : [];
      this._didAnimateIn = false;
      this.render();
      return this;
    }

    this._mode  = 'flat';
    this._tree  = null;
    this._trail = [];
    this._data  = (data ?? []).filter(d => Number.isFinite(+d.value) && +d.value > 0);
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

    this.gSlices = this.svg.append('g').attr('class', 'rc-donut-slices');
    this.gLabels = this.svg.append('g').attr('class', 'rc-donut-labels');
    this.gCenter = this.svg.append('g').attr('class', 'rc-donut-center');
    this.gCrumb  = this.svg.append('g').attr('class', 'rc-donut-crumb');
  }

  // ─── Drill-down (hierarchy mode) ────────────────────────────────────────────

  _focus() { return this._trail[this._trail.length - 1] ?? null; }

  _drillable(node) {
    return !!node && !node.isRemainder && Array.isArray(node.children)
      && node.children.some(c => typeof c.value === 'number');
  }

  drillTo(node) {
    if (!this._drillable(node)) return this;
    this._trail = [...this._trail, node];
    this._didAnimateIn = false;
    this.render();
    return this;
  }

  drillToDepth(index) {
    if (index < 0 || index >= this._trail.length - 1) return this;
    this._trail = this._trail.slice(0, index + 1);
    this._didAnimateIn = false;
    this.render();
    return this;
  }

  drillUp() { return this.drillToDepth(this._trail.length - 2); }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const hier = this._mode === 'hier';
    let focus = null;
    let missingChildren = [];
    if (hier) {
      focus = this._focus();
      if (!focus) {
        [this.gSlices, this.gLabels, this.gCenter, this.gCrumb].forEach(g => g.selectAll('*').remove());
        return;
      }
      this._data      = (focus.children ?? []).filter(d => typeof d.value === 'number');
      missingChildren = (focus.children ?? []).filter(d => d.missing);
    }

    if (!this._data.length) { this.gCrumb.selectAll('*').remove(); return; }

    // Use this.width (subtracts margins + legend-aside width) and add margins back
    // to get the actual SVG content width. Same pattern for height.
    const W = this.width + this.margin.left + this.margin.right;
    const H = this.height + this.margin.top + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;

    const animate    = (o.animate ?? true) && !this._didAnimateIn;
    const duration   = motionDuration(o.duration ?? 650);
    const ease       = resolveEase(o.ease ?? 'cubicOut');

    const isPie      = (o.innerRadius ?? 0.58) === 0;
    const innerFrac  = isPie ? 0 : (o.innerRadius ?? 0.58);
    const padAngle   = o.padAngle     ?? (isPie ? 0.008 : 0.018);
    const cornerR    = o.cornerRadius ?? (isPie ? 1 : 3);
    const showLabels = o.showLabels   ?? false;
    const showCenter = o.showCenter   ?? !isPie;

    // Center in SVG space. In hierarchy mode reserve a strip at the top for the
    // breadcrumb, so the ring drops below it.
    const inset = hier ? 24 : 0;
    const cx = W / 2;
    const cy = inset + (H - inset) / 2;

    // Outer radius — reserve only enough for the polyline itself (text overflows via SVG overflow:visible)
    const labelRoom = showLabels ? 36 : 0;
    const outerR    = Math.min(cx, (H - inset) / 2) - labelRoom - 4;
    const innerR    = outerR * innerFrac;

    // Formatters
    const total      = d3.sum(this._data, d => +d.value);
    const valueFmt   = o.valueFormat   ?? (v => d3.format(',')(v));
    const percentFmt = o.percentFormat ?? (p => d3.format('.1%')(p));

    // Colors — per-item override, then palette, then accent fallback
    const palette  = t.colors ?? [];
    const colorFor = (d, i) => d.isRemainder ? t.muted : (d.color ?? palette[i % palette.length] ?? t.accent);

    // Arc generators
    const arc = d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .padAngle(padAngle)
      .cornerRadius(cornerR);

    const arcHover = d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR + 6)
      .padAngle(padAngle)
      .cornerRadius(cornerR);

    // Pie layout — preserve input order
    const pie = d3.pie()
      .value(d => +d.value)
      .sort(null)
      .padAngle(padAngle);

    const arcs = pie(this._data);

    // Position all layers at the chart center
    this.gSlices.attr('transform', `translate(${cx},${cy})`);
    this.gLabels.attr('transform', `translate(${cx},${cy})`);
    this.gCenter.attr('transform', `translate(${cx},${cy})`);

    // ── Slices ────────────────────────────────────────────────────────────────

    const slices = this.gSlices.selectAll('.rc-donut-slice')
      .data(arcs, d => d.data.id ?? d.data.label)
      .join(
        enter => enter.append('path')
          .attr('class', 'rc-donut-slice')
          .attr('fill',  (d, i) => colorFor(d.data, i))
          .attr('d', animate
            ? d => arc({ ...d, endAngle: d.startAngle })   // start collapsed
            : d => arc(d)
          ),
        update => update,
        exit   => exit
          .transition().duration(duration / 2).ease(ease)
          .attr('d', d => arc({ ...d, endAngle: d.startAngle }))
          .remove()
      )
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(120).ease(d3.easeQuadOut)
          .attr('d', arcHover(d));

        const i   = arcs.indexOf(d);
        const pct = d.data.value / total;
        const html = o.tooltipFormat
          ? o.tooltipFormat({ label: d.data.label, value: d.data.value, percent: pct, color: colorFor(d.data, i) })
          : `<div style="color:${colorFor(d.data, i)}">${d.data.label}</div>
             <div>${valueFmt(d.data.value)}</div>
             <div style="color:${t.muted}">${percentFmt(pct)}</div>`;

        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, html);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(180).ease(d3.easeQuadOut)
          .attr('d', arc(d));
        this._tooltip.hide();
      })
      .on('click', (event, d) => {
        if (hier && this._drillable(d.data)) this.drillTo(d.data);
      })
      .style('cursor', d =>
        hier && this._drillable(d.data) ? 'pointer' : 'default');

    if (animate) {
      slices
        .transition().duration(duration).ease(ease)
        .attrTween('d', function (d) {
          const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
          return t => arc(i(t));
        })
        .on('end', (d, i, nodes) => {
          if (i === nodes.length - 1) this._didAnimateIn = true;
        });
    } else {
      slices.attr('d', d => arc(d));
      this._didAnimateIn = true;
    }

    // ── Sync legend indicator colors ──────────────────────────────────────────
    // Legend items are built by Chart base class before render() — colors from
    // the palette are not known at that point. Re-apply correct colors here.
    if (this._legendEl) {
      const indicators = this._legendEl.querySelectorAll('.rc-legend-dot, .rc-legend-line');
      arcs.forEach((arcDatum, i) => {
        if (indicators[i]) indicators[i].style.background = colorFor(arcDatum.data, i);
      });
    }

    // ── Outer labels (Bloomberg-style: polyline leader + two-line text) ───────
    this.gLabels.selectAll('*').remove();

    if (showLabels) {
      const lineLen     = 14;
      const tickLen     = 12;
      const labelGap    = 3;
      const lineH       = 14;                           // line height between label rows
      const labelMinPct = o.labelMinPct ?? 0.04;

      // labelContent: 'both' (default) | 'label' | 'percent'
      const content   = o.labelContent ?? 'both';
      const showName  = content !== 'percent';
      const showPct   = content !== 'label';
      const lineCount = (showName ? 1 : 0) + (showPct ? 1 : 0);
      const blockH    = lineCount * lineH;

      // Pass 1 — anchor geometry for every labelled slice. `y` is the label
      // row center; it starts at the leader elbow and may be pushed by pass 2.
      const entries = [];
      arcs.forEach((d) => {
        const pct = d.data.value / total;
        if (pct < labelMinPct) return;
        const mid = (d.startAngle + d.endAngle) / 2;
        entries.push({
          d, pct,
          isRight: Math.sin(mid) >= 0,
          x1: Math.sin(mid) * outerR,               // on the outer arc edge
          y1: -Math.cos(mid) * outerR,
          x2: Math.sin(mid) * (outerR + lineLen),   // leader elbow
          y:  -Math.cos(mid) * (outerR + lineLen),
        });
      });

      // Pass 2 — spread each side's rows apart so the labels of small adjacent
      // slices never overprint: sweep top-down enforcing a minimum gap, then
      // sweep back up from the bottom bound.
      const spreadSide = (side) => {
        const list = entries.filter(e => e.isRight === side).sort((a, b) => a.y - b.y);
        const gap    = blockH + 4;
        const top    = inset - cy + blockH / 2 + 2;
        const bottom = H - cy - blockH / 2 - 2;
        for (let i = 1; i < list.length; i++) {
          if (list[i].y < list[i - 1].y + gap) list[i].y = list[i - 1].y + gap;
        }
        for (let i = list.length - 1; i >= 0; i--) {
          const maxY = i === list.length - 1 ? bottom : list[i + 1].y - gap;
          if (list[i].y > maxY) list[i].y = maxY;
          if (list[i].y < top)  list[i].y = top;
        }
      };
      spreadSide(true);
      spreadSide(false);

      // Pass 3 — leaders and text at the resolved rows. The leader runs from
      // the arc edge diagonally to the elbow at the label's final row, then
      // horizontally to the tick end.
      entries.forEach((e) => {
        const x3 = e.x2 + (e.isRight ? tickLen : -tickLen);

        this.gLabels.append('polyline')
          .attr('class', 'rc-donut-leader')
          .attr('points', `${e.x1},${e.y1} ${e.x2},${e.y} ${x3},${e.y}`)
          .attr('fill', 'none')
          .attr('stroke', t.border)
          .attr('stroke-width', 1);

        const tx     = x3 + (e.isRight ? labelGap : -labelGap);
        const anchor = e.isRight ? 'start' : 'end';

        // Center the text block around the row regardless of line count
        const topY = e.y - ((lineCount - 1) * lineH) / 2;

        let lineIdx = 0;
        if (showName) {
          const name = this.gLabels.append('text')
            .attr('class', 'rc-donut-label')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.text)
            .text(e.d.data.label);
          // Keep the label inside the svg: truncate to the room between its
          // anchor and the chart edge — the full label stays in the tooltip.
          fitTextNode(name.node(), e.d.data.label, cx - Math.abs(tx) - 2);
        }
        if (showPct) {
          this.gLabels.append('text')
            .attr('class', 'rc-donut-label-pct')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.muted)
            .text(percentFmt(e.pct));
        }
      });
    }

    // ── Center text (donut only) ──────────────────────────────────────────────
    this.gCenter.selectAll('*').remove();

    if (showCenter && innerR > 0) {
      const rawCenter = o.centerText;
      const centerVal = hier
        ? valueFmt(focus.value)
        : (typeof rawCenter === 'function' ? rawCenter(this._data) : (rawCenter ?? valueFmt(total)));

      const centerLabel = hier
        ? (this._trail.length > 1 ? focus.label : (o.centerLabel ?? 'Total'))
        : (o.centerLabel ?? 'Total');

      // Usable width inside the hole; both center lines are fitted to it.
      const holeAvail = 2 * innerR - 12;
      const valueSize = Math.max(14, innerR * 0.28);

      const valueSel = this.gCenter.append('text')
        .attr('class',             'rc-donut-center-value')
        .attr('text-anchor',       'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y',     centerLabel ? -10 : 0)
        .attr('fill',  t.text)
        .style('font-size', `${valueSize}px`)
        .text(centerVal);
      // A wide value shrinks its font (floor 11px) instead of poking out.
      const vNode = valueSel.node();
      const vLen  = vNode.getComputedTextLength ? vNode.getComputedTextLength() : 0;
      if (vLen > holeAvail) valueSel.style('font-size', `${Math.max(11, valueSize * holeAvail / vLen)}px`);

      if (centerLabel) {
        const labelSel = this.gCenter.append('text')
          .attr('class',             'rc-donut-center-label')
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y',    14)
          .attr('fill', t.muted)
          .text(centerLabel);
        // Secondary line truncates to the hole; the breadcrumb carries the full name.
        fitTextNode(labelSel.node(), centerLabel, holeAvail);
      }
    }

    // ── Hierarchy chrome: breadcrumb, up-navigation, undisclosed note ─────────
    this.gCrumb.selectAll('*').remove();
    if (hier) {
      // Breadcrumbs appear only once drilled in — the root view carries no
      // trail. Flush left with the chart content (no indent).
      if (this._trail.length > 1) {
        let cursorX = 0;
        this._trail.forEach((node, idx) => {
          if (idx > 0) {
            this.gCrumb.append('text')
              .attr('x', cursorX).attr('y', 14).attr('fill', t.muted).text('›');
            cursorX += 12;
          }
          const isLast = idx === this._trail.length - 1;
          const label  = node.label.length > 22 ? node.label.slice(0, 22).trimEnd() + '…' : node.label;
          const txt = this.gCrumb.append('text')
            .attr('x', cursorX).attr('y', 14)
            .attr('fill', isLast ? t.text : t.accent)
            .style('cursor', isLast ? 'default' : 'pointer')
            .text(label);
          if (!isLast) txt.on('click', () => this.drillToDepth(idx));
          const len = txt.node().getComputedTextLength ? txt.node().getComputedTextLength() : 0;
          cursorX += (len || label.length * 7) + 8;
        });
      }

      if (missingChildren.length) {
        this.gCrumb.append('text')
          .attr('x', W / 2).attr('y', H - 6).attr('text-anchor', 'middle')
          .attr('fill', t.muted)
          .text(`${missingChildren.length} not disclosed`)
          .append('title').text(missingChildren.map(m => m.label).join(', '));
      }

      if (this._trail.length > 1) {
        this.gCenter.style('cursor', 'pointer').on('click', () => this.drillUp());
      } else {
        this.gCenter.style('cursor', 'default').on('click', null);
      }
    }
  }
}

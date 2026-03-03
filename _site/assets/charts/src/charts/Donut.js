// RareCharts — Donut / Pie
// Circular chart. Pie = Donut with innerRadius: 0.
//
// Expected data format:
// [{ label: string, value: number, color?: string }, ...]
//
// Options:
//   height       — chart height px (default: 280)
//   innerRadius  — 0 for pie, 0..1 as fraction of outer radius (default: 0.58)
//   padAngle     — gap between slices in radians (default: 0.018)
//   cornerRadius — rounded slice corners px (default: 3)
//
//   animate      — animate on first render (default: true)
//   duration     — animation duration ms (default: 650)
//   ease         — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showLabels   — show slice labels with leader lines outside the chart (default: false)
//   labelMinPct  — hide label when slice is smaller than this fraction (default: 0.04)
//   showCenter   — show text in the center hole (default: true for donut)
//   centerText   — string | function(data) => string (default: formatted total)
//   centerLabel  — secondary line below centerText (default: 'Total')
//
//   valueFormat  — function(v) => string (default: locale number)
//   percentFormat— function(pct) => string (default: '12.3%')
//   tooltipFormat— function({label, value, percent, color}) => html

import * as d3 from 'd3';
import { Chart }       from '../core/Chart.js';
import { Tooltip }     from '../core/Tooltip.js';
import { resolveEase } from '../core/utils.js';

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

    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data) {
    this._data = (data ?? []).filter(d => Number.isFinite(+d.value) && +d.value > 0);
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

    this.gSlices = this.svg.append('g').attr('class', 'rc-donut-slices');
    this.gLabels = this.svg.append('g').attr('class', 'rc-donut-labels');
    this.gCenter = this.svg.append('g').attr('class', 'rc-donut-center');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._data.length) return;

    // Use this.width (subtracts margins + legend-aside width) and add margins back
    // to get the actual SVG content width. Same pattern for height.
    const W = this.width + this.margin.left + this.margin.right;
    const H = this.height + this.margin.top + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;

    const animate    = (o.animate ?? true) && !this._didAnimateIn;
    const duration   = o.duration ?? 650;
    const ease       = resolveEase(o.ease ?? 'cubicOut');

    const isPie      = (o.innerRadius ?? 0.58) === 0;
    const innerFrac  = isPie ? 0 : (o.innerRadius ?? 0.58);
    const padAngle   = o.padAngle     ?? (isPie ? 0.008 : 0.018);
    const cornerR    = o.cornerRadius ?? (isPie ? 1 : 3);
    const showLabels = o.showLabels   ?? false;
    const showCenter = o.showCenter   ?? !isPie;

    // Center in SVG space
    const cx = W / 2;
    const cy = H / 2;

    // Outer radius — reserve only enough for the polyline itself (text overflows via SVG overflow:visible)
    const labelRoom = showLabels ? 36 : 0;
    const outerR    = Math.min(cx, cy) - labelRoom - 4;
    const innerR    = outerR * innerFrac;

    // Formatters
    const total      = d3.sum(this._data, d => +d.value);
    const valueFmt   = o.valueFormat   ?? (v => d3.format(',')(v));
    const percentFmt = o.percentFormat ?? (p => d3.format('.1%')(p));

    // Colors — per-item override, then palette, then accent fallback
    const palette  = t.colors ?? [];
    const colorFor = (d, i) => d.color ?? palette[i % palette.length] ?? t.accent;

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
      .data(arcs, d => d.data.label)
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
      });

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

      arcs.forEach((d) => {
        const pct = d.data.value / total;
        if (pct < labelMinPct) return;

        const mid     = (d.startAngle + d.endAngle) / 2;
        const isRight = Math.sin(mid) >= 0;

        // Three points of the leader polyline:
        //   [x1,y1] — on the outer arc edge
        //   [x2,y2] — radially further out
        //   [x3,y3] — horizontal tick end
        const x1 = Math.sin(mid) * outerR;
        const y1 = -Math.cos(mid) * outerR;
        const x2 = Math.sin(mid) * (outerR + lineLen);
        const y2 = -Math.cos(mid) * (outerR + lineLen);
        const x3 = x2 + (isRight ? tickLen : -tickLen);
        const y3 = y2;

        this.gLabels.append('polyline')
          .attr('class', 'rc-donut-leader')
          .attr('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`)
          .attr('fill', 'none')
          .attr('stroke', t.border)
          .attr('stroke-width', 1);

        const tx     = x3 + (isRight ? labelGap : -labelGap);
        const anchor = isRight ? 'start' : 'end';

        // Center the text block around y3 regardless of line count
        const topY = y3 - ((lineCount - 1) * lineH) / 2;

        let lineIdx = 0;
        if (showName) {
          this.gLabels.append('text')
            .attr('class', 'rc-donut-label')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.text)
            .style('font-family', t.font)
            .style('font-size', t.fontSize)
            .text(d.data.label);
        }
        if (showPct) {
          this.gLabels.append('text')
            .attr('class', 'rc-donut-label-pct')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.muted)
            .style('font-family', t.numericFont)
            .style('font-size', t.fontSize)
            .text(percentFmt(pct));
        }
      });
    }

    // ── Center text (donut only) ──────────────────────────────────────────────
    this.gCenter.selectAll('*').remove();

    if (showCenter && innerR > 0) {
      const rawCenter = o.centerText;
      const centerVal = typeof rawCenter === 'function'
        ? rawCenter(this._data)
        : (rawCenter ?? valueFmt(total));

      const centerLabel = o.centerLabel ?? 'Total';

      this.gCenter.append('text')
        .attr('class',             'rc-donut-center-value')
        .attr('text-anchor',       'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y',     centerLabel ? -10 : 0)
        .attr('fill',  t.text)
        .style('font-family', t.numericFont)
        .style('font-size',   `${Math.max(14, innerR * 0.28)}px`)
        .style('font-weight', 'bold')
        .text(centerVal);

      if (centerLabel) {
        this.gCenter.append('text')
          .attr('class',             'rc-donut-center-label')
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y',    14)
          .attr('fill', t.muted)
          .style('font-family', t.font)
          .style('font-size',   t.fontSize)
          .text(centerLabel);
      }
    }
  }
}

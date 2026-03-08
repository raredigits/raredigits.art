// RareCharts — Gauge (Arc)
// Arc-based progress chart — shows a value relative to a maximum along a partial arc.
// Common uses: goal completion, budget usage, KPI progress.
//
// Expected data: a number, or { value, max?, min? }
//   setData(73)                        — value only, max from options
//   setData({ value: 50, max: 80 })   — value + max override
//
// Options:
//   height       — chart height px (default: 220)
//   min          — minimum value (default: 0)
//   max          — maximum value (default: 100)
//   startAngle   — arc start in radians, clockwise from top (default: -¾π = -135°)
//   endAngle     — arc end in radians (default: +¾π = +135°)
//   thickness    — ring thickness as fraction of outer radius (default: 0.18)
//   cornerRadius — arc end rounding px (default: 6)
//
//   color        — fill arc color (default: theme.accent)
//   trackColor   — background arc color (default: theme.grid)
//
//   showCenter   — render center text (default: true)
//   centerText   — string | function(value, max, min) => string
//                  default: percentage string (e.g. "63%")
//   centerLabel  — secondary label below centerText (default: none)
//
//   animate      — animate fill on first render (default: true)
//   duration     — animation duration ms (default: 800)
//   ease         — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   tooltipFormat — function({ value, max, min, percent }) => html

import * as d3 from 'd3';
import { Chart }       from '../core/Chart.js';
import { Tooltip }     from '../core/Tooltip.js';
import { resolveEase } from '../core/utils.js';

export class Gauge extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 220,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
    });

    this._value        = 0;
    this._max          = options.max ?? 100;
    this._min          = options.min ?? 0;
    this._didAnimateIn = false;
    this._tooltip      = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data) {
    if (typeof data === 'number') {
      this._value = data;
    } else if (data !== null && typeof data === 'object') {
      this._value = data.value ?? 0;
      if (data.max != null) this._max = data.max;
      if (data.min != null) this._min = data.min;
    }
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

    this.gArc    = this.svg.append('g').attr('class', 'rc-gauge-arc');
    this.gCenter = this.svg.append('g').attr('class', 'rc-gauge-center');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const W = this.width  + this.margin.left + this.margin.right;
    const H = this.height + this.margin.top  + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;

    const startAngle = o.startAngle  ?? -Math.PI * 0.75;   // -135°
    const endAngle   = o.endAngle    ??  Math.PI * 0.75;   // +135°
    const thickness  = o.thickness   ?? 0.18;
    const cornerR    = o.cornerRadius ?? 6;
    const animate    = (o.animate ?? true) && !this._didAnimateIn;
    const duration   = o.duration ?? 800;
    const ease       = resolveEase(o.ease ?? 'cubicOut');

    const trackColor = o.trackColor ?? t.grid;
    const fillColor  = o.color      ?? t.accent;

    // ── Geometry ──────────────────────────────────────────────────────────────
    // Arc angles use "clockwise from top" convention:
    //   x = sin(angle) * r,  y = -cos(angle) * r
    //
    // For startAngle=-135°, endAngle=+135° (270° sweep):
    //   Top of arc (angle=0):   y = -outerR   (above center)
    //   Arc ends (angle=±135°): y = outerR * cos(135°) * -1 = outerR * 0.707 (below center)
    //
    // Total arc height = outerR * (1 + |cos(endAngle)|)

    const bottomFrac = Math.abs(Math.cos(endAngle));        // 0.707 for ±135°
    const cx     = W / 2;
    const outerR = Math.min(cx, H / (1 + bottomFrac)) - 4;
    const innerR = outerR * (1 - thickness);

    // Vertically center the arc in SVG space
    const centerY = (H + outerR * (1 - bottomFrac)) / 2;

    this.gArc.attr('transform',    `translate(${cx},${centerY})`);
    this.gCenter.attr('transform', `translate(${cx},${centerY})`);

    // ── Value → angle ─────────────────────────────────────────────────────────
    const clamp    = v => Math.max(this._min, Math.min(this._max, v));
    const fraction = (this._max - this._min) > 0
      ? (clamp(this._value) - this._min) / (this._max - this._min)
      : 0;
    const fillEnd  = startAngle + fraction * (endAngle - startAngle);

    // ── Arc generators ────────────────────────────────────────────────────────
    const arcBase = () => d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .cornerRadius(cornerR);

    const trackArc = arcBase()
      .startAngle(startAngle)
      .endAngle(endAngle);

    const fillArc = arcBase().startAngle(startAngle);

    // ── Track ─────────────────────────────────────────────────────────────────
    this.gArc.selectAll('.rc-gauge-track')
      .data([null])
      .join('path')
      .attr('class', 'rc-gauge-track')
      .attr('fill',  trackColor)
      .attr('d', trackArc());

    // ── Fill ──────────────────────────────────────────────────────────────────
    const fillPath = this.gArc.selectAll('.rc-gauge-fill')
      .data([null])
      .join('path')
      .attr('class', 'rc-gauge-fill')
      .attr('fill',  fillColor);

    if (animate) {
      fillPath
        .attr('d', fillArc.endAngle(startAngle)())
        .transition().duration(duration).ease(ease)
        .attrTween('d', () => {
          const interp = d3.interpolate(startAngle, fillEnd);
          return t => fillArc.endAngle(interp(t))();
        })
        .on('end', () => { this._didAnimateIn = true; });
    } else {
      fillPath.attr('d', fillArc.endAngle(fillEnd)());
      this._didAnimateIn = true;
    }

    // ── Tooltip ───────────────────────────────────────────────────────────────
    const pct = fraction;
    const tooltipHtml = o.tooltipFormat
      ? o.tooltipFormat({ value: this._value, max: this._max, min: this._min, percent: pct })
      : `<div>${d3.format('.1%')(pct)}</div>
         <div style="color:${t.muted}">${this._value} / ${this._max}</div>`;

    this.gArc.selectAll('path')
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, tooltipHtml);
      })
      .on('mouseleave', () => this._tooltip.hide());

    // ── Center text ───────────────────────────────────────────────────────────
    this.gCenter.selectAll('*').remove();

    if (o.showCenter !== false) {
      const rawText = o.centerText;
      const centerVal = typeof rawText === 'function'
        ? rawText(this._value, this._max, this._min)
        : (rawText ?? d3.format('.0%')(fraction));

      const centerLabel = o.centerLabel ?? null;

      this.gCenter.append('text')
        .attr('class',             'rc-gauge-center-value')
        .attr('text-anchor',       'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y',     centerLabel ? -10 : 0)
        .attr('fill',  t.text)
        .style('font-family', t.numericFont)
        .style('font-size',   `${Math.max(16, innerR * 0.32)}px`)
        .style('font-weight', 'bold')
        .text(centerVal);

      if (centerLabel) {
        this.gCenter.append('text')
          .attr('class',             'rc-gauge-center-label')
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

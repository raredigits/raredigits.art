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
//   needle       — speedometer-style pointer pivoting at the dial center,
//                  animated to the value together with the fill (default: false).
//                  The center readout moves below the hub, dial-style.
//   needleColor  — needle and hub color (default: theme text)
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
import { resolveEase, motionDuration } from '../core/utils.js';
import { applySvgA11y } from '../core/renderHelpers.js';

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
    applySvgA11y(this.svg, this.options);

    this.gArc    = this.svg.append('g').attr('class', 'rc-gauge-arc');
    this.gNeedle = this.svg.append('g').attr('class', 'rc-gauge-needle');
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
    const duration   = motionDuration(o.duration ?? 800);
    const ease       = resolveEase(o.ease ?? 'cubicOut');

    const trackColor  = o.trackColor  ?? t.grid;
    const fillColor   = o.color       ?? t.accent;
    const needle      = o.needle === true;
    const needleColor = o.needleColor ?? t.text;

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
    const cx = W / 2;

    // Room the center text needs BELOW the circle center. For deep arcs
    // (default ±135°) the arc itself reaches lower and the text sits inside
    // the ring; for shallow arcs (half-circle speedometer: endAngle ±90°,
    // bottomFrac → 0) the text defines the block's bottom edge — without this
    // reserve the center label would clip against the svg bottom.
    const hasCenter = o.showCenter !== false;
    // With a needle the readout drops below the hub (dial-style), so the
    // reserve below the circle center grows accordingly.
    const textBelow = hasCenter
      ? (needle ? (o.centerLabel != null ? 52 : 34)
                : (o.centerLabel != null ? 21 : 10))
      : (needle ? 8 : 0);

    // Largest radius whose block — R above the circle center plus whatever
    // hangs below it (arc bottom or text) — fits the svg height.
    const fitDeep    = (H - 8) / (1 + bottomFrac);          // arc bottom rules
    const fitShallow = H - 8 - textBelow;                   // text bottom rules
    const outerR = Math.min(cx - 4, fitDeep * bottomFrac >= textBelow ? fitDeep : fitShallow);
    const innerR = outerR * (1 - thickness);

    // Vertically center the whole block (arc + any protruding text).
    const below   = Math.max(outerR * bottomFrac, textBelow);
    const centerY = (H - (outerR + below)) / 2 + outerR;

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

    // ── Needle (speedometer pointer) ──────────────────────────────────────────
    this.gNeedle.attr('transform', `translate(${cx},${centerY})`);
    this.gNeedle.selectAll('*').remove();
    if (needle) {
      const tipR  = (innerR + outerR) / 2;         // reaches the middle of the band
      const baseW = Math.max(3, outerR * 0.035);
      const hubR  = Math.max(4, outerR * 0.055);
      const deg   = a => a * 180 / Math.PI;

      const pointer = this.gNeedle.append('path')
        .attr('class', 'rc-gauge-needle-pointer')
        .attr('d', `M ${-baseW} 0 L 0 ${-tipR} L ${baseW} 0 Z`)
        .attr('fill', needleColor);

      this.gNeedle.append('circle')
        .attr('class', 'rc-gauge-needle-hub')
        .attr('r', hubR)
        .attr('fill', needleColor);

      if (animate) {
        pointer.attr('transform', `rotate(${deg(startAngle)})`)
          .transition().duration(duration).ease(ease)
          .attrTween('transform', () => {
            const interp = d3.interpolate(deg(startAngle), deg(fillEnd));
            return tt => `rotate(${interp(tt)})`;
          });
      } else {
        pointer.attr('transform', `rotate(${deg(fillEnd)})`);
      }
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
        .attr('y',     needle ? 22 : (centerLabel ? -10 : 0))
        .attr('fill',  t.text)
        .style('font-size',   `${Math.max(16, innerR * 0.32)}px`)
        .text(centerVal);

      if (centerLabel) {
        this.gCenter.append('text')
          .attr('class',             'rc-gauge-center-label')
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y',    needle ? 44 : 14)
          .attr('fill', t.muted)
          .text(centerLabel);
      }
    }
  }
}

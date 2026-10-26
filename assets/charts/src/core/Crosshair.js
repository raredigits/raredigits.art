// RareCharts — core/Crosshair.js
// Reusable vertical crosshair with series dots and tooltip.
// Works with any number of series and any mix of Y scales. Dots take
// theme.dotRadius (3); a band is reported as a range, without a dot.

import * as d3 from 'd3';
import { escapeHtml, tipHeader } from './html.js';

export class Crosshair {
  /**
   * @param {d3.Selection}  g        — parent <g> for crosshair elements
   * @param {d3.Selection}  overlay  — transparent rect for mouse events
   * @param {Tooltip}       tooltip  — RareCharts Tooltip instance
   * @param {object}        theme
   */
  constructor(g, overlay, tooltip, theme) {
    this._g       = g;
    this._overlay = overlay;
    this._tooltip = tooltip;
    this._theme   = theme;

    this._line = g.append('line')
      .attr('class', 'rc-cross-line')
      .attr('opacity', 0);

    this._dots = g.append('g').attr('class', 'rc-cross-dots');
  }

  /**
   * Bind (or update) crosshair behaviour to the overlay rect.
   *
   * @param {object} ctx
   * @param {number}       ctx.W           — chart width
   * @param {number}       ctx.H           — chart height
   * @param {Function}     ctx.x           — d3 time scale
   * @param {Function}     ctx.scaleFor    — (series) => d3 y-scale for that series
   * @param {Function}     ctx.formatFor   — (series, value) => formatted string
   * @param {Array}        ctx.series      — all series (line + bar)
   * @param {boolean}      ctx.enabled     — show crosshair (default true)
   * @param {Function}     ctx.tooltipFmt  — optional custom html builder
   */
  bind({ W, H, x, scaleFor, formatFor, series, enabled = true, tooltipFmt }) {
    const t = this._theme;

    this._overlay
      .attr('width', W)
      .attr('height', H);

    this._line
      .attr('y1', 0)
      .attr('y2', H)
      .attr('stroke', t.crosshair)
      .attr('stroke-dasharray', '2,3');

    if (!enabled) {
      this._overlay.on('mousemove', null).on('mouseleave', null);
      return;
    }

    const bisect = d3.bisector(d => d.date).left;

    const pickNearest = (vals, dt) => {
      const i = bisect(vals, dt, 1);
      const a = vals[i - 1];
      const b = vals[i];
      if (!a) return b;
      if (!b) return a;
      return (dt - a.date) < (b.date - dt) ? a : b;
    };

    const move = (event) => {
      const [mx]  = d3.pointer(event, this._overlay.node());
      // Clamped to the view: the plot's padding (xPad, and on DualAxes the
      // half bar inset at each end, C-27) reads as the nearest end, so an
      // edge bar answers along its whole width.
      const [d0, d1] = x.domain();
      const dt    = new Date(Math.min(Math.max(+x.invert(mx), +d0), +d1));

      const points = series.map(s => {
        const d = pickNearest(s.values, dt);
        if (!d) return null;
        // Skip series that don't cover the hovered date — e.g. a forecast band
        // or a projected line that only exists past a cut-over point. Without
        // this, a partial series would report its nearest endpoint everywhere.
        if (dt < s.values[0].date || dt > s.values[s.values.length - 1].date) return null;

        if (s.type === 'band') {
          // A band has two edges and no single value: report the range, no dot.
          return {
            name: s.name, series: s.name, type: 'band', color: s.color, date: d.date,
            lower: d.lower, upper: d.upper,
            fmt: `${formatFor(s, d.lower)} – ${formatFor(s, d.upper)}`,
          };
        }
        const fmt = formatFor(s, d.value);
        return { name: s.name, series: s.name, axis: s.axis, type: s.type, color: s.color, date: d.date, value: d.value, fmt };
      }).filter(Boolean);

      // Nothing under the cursor (outside every series' date range): clear.
      if (!points.length) {
        this._line.attr('opacity', 0);
        this._dots.selectAll('.rc-cross-dot').attr('opacity', 0);
        this._tooltip.hide();
        return;
      }

      // Crosshair line
      this._line
        .attr('x1', mx).attr('x2', mx)
        .attr('opacity', 1);

      // Dots on line-type series only (bars and bands carry no single point)
      this._dots.selectAll('.rc-cross-dot')
        .data(points.filter(p => p.type !== 'bar' && p.type !== 'band'), p => p.name)
        .join('circle')
        .attr('class', 'rc-cross-dot')
        .attr('r', t.dotRadius ?? 3)
        .attr('fill',         p => p.color)
        .attr('stroke',       t.bg)
        .attr('stroke-width', 1.5)
        .attr('cx', p => x(p.date))
        .attr('cy', p => scaleFor(p)(p.value))
        .attr('opacity', 1);

      // Tooltip. The payload is an object, so the role fields (K-09) sit on
      // it: `date` here, and on each point `series` (= name), `value`,
      // `color`, `date`.
      const payload = { date: points[0]?.date, points };
      const html = tooltipFmt
        ? tooltipFmt(payload)
        : tipHeader(d3.timeFormat('%b %d, %Y')(payload.date), { muted: true }) +
          points.map(p =>
            `<div style="color:${escapeHtml(p.color)}">${escapeHtml(p.name)}: ${escapeHtml(p.fmt)}</div>`
          ).join('');

      const [px, py] = d3.pointer(event, this._overlay.node().closest('.rc-chart') ?? this._overlay.node().parentElement);
      this._tooltip.show(px, py, html);
    };

    const leave = () => {
      this._line.attr('opacity', 0);
      this._dots.selectAll('.rc-cross-dot').attr('opacity', 0);
      this._tooltip.hide();
    };

    this._overlay
      .on('mousemove', move)
      .on('mouseleave', leave);
  }

  hide() {
    this._line.attr('opacity', 0);
    this._dots.selectAll('.rc-cross-dot').attr('opacity', 0);
    this._tooltip.hide();
  }

  // Empty chart: hide, and drop the hover handlers — they hold the last
  // series and scale. The next bind() attaches fresh ones.
  unbind() {
    this._overlay.on('mousemove', null).on('mouseleave', null);
    this.hide();
  }
}

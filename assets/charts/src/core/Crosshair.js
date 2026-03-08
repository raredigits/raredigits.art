// RareCharts — core/Crosshair.js
// Reusable vertical crosshair with series dots and tooltip.
// Works with any number of series and any mix of Y scales.

import * as d3 from 'd3';

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
      const dt    = x.invert(mx);

      const points = series.map(s => {
        const d   = pickNearest(s.values, dt);
        const fmt = formatFor(s, d.value);
        return { name: s.name, axis: s.axis, type: s.type, color: s.color, date: d.date, value: d.value, fmt };
      });

      // Crosshair line
      this._line
        .attr('x1', mx).attr('x2', mx)
        .attr('opacity', 1);

      // Dots on line-type series only
      this._dots.selectAll('.rc-cross-dot')
        .data(points.filter(p => p.type !== 'bar'), p => p.name)
        .join('circle')
        .attr('class', 'rc-cross-dot')
        .attr('r', 3)
        .attr('fill',         p => p.color)
        .attr('stroke',       t.bg)
        .attr('stroke-width', 1.5)
        .attr('cx', p => x(p.date))
        .attr('cy', p => scaleFor(p)(p.value))
        .attr('opacity', 1);

      // Tooltip
      const payload = { date: points[0]?.date, points };
      const html = tooltipFmt
        ? tooltipFmt(payload)
        : `<div style="color:${t.muted}">${d3.timeFormat('%b %d, %Y')(payload.date)}</div>` +
          points.map(p =>
            `<div style="color:${p.color}">${p.name}: ${p.fmt}</div>`
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
}

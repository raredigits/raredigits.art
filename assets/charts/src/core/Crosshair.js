// RareCharts — core/Crosshair.js
// Reusable vertical crosshair with series dots and tooltip.
// Works with any number of series and any mix of Y scales. Dots take
// theme.dotRadius (3); a band is reported as a range, without a dot.
//
// With { horizontal: true } it is TimeSeries' crosshair instead: a vertical
// and a horizontal line through the point nearest the pointer, the tooltip
// at that point, no dots; over a gap (a null value, RC-005) the vertical
// line alone. It follows the first series it is given; each other one (the
// comparison, RC-004) is reported beside it, by its row nearest the date.
// Its look stays TimeSeries' own (two bare 1px lines dashed '3 3') until
// the two are aligned — a visible change, later.

import * as d3 from 'd3';
import { escapeHtml, tipDate, tipRow } from './html.js';
import { hexOf } from './paint.js';
import { resolveStrokeDash, timeKit } from './utils.js';

export class Crosshair {
  /**
   * The crosshair layer of a plot (Line, DualAxes), appended to its group: a
   * group for the line and the dots, then the transparent overlay over the
   * plot that takes the pointer.
   *
   * @param {d3.Selection} plot — the plot <g>
   * @param {Tooltip}      tooltip
   * @param {object}       theme
   * @returns {Crosshair}
   */
  static attach(plot, tooltip, theme) {
    const g = plot.append('g').attr('class', 'rc-crosshair');
    const overlay = plot.append('rect')
      .attr('class', 'rc-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');
    return new Crosshair(g, overlay, tooltip, theme);
  }

  /**
   * @param {d3.Selection}  g        — parent <g> for crosshair elements
   * @param {d3.Selection}  overlay  — transparent rect for mouse events
   * @param {Tooltip}       tooltip  — RareCharts Tooltip instance
   * @param {object}        theme
   * @param {object}        [opts]
   * @param {boolean}       [opts.horizontal=false] — the point crosshair of
   *   TimeSeries (see the top of this file and bind)
   */
  constructor(g, overlay, tooltip, theme, { horizontal = false } = {}) {
    this._overlay = overlay;
    this._tooltip = tooltip;
    this._theme   = theme;
    this._horizontal = horizontal;

    if (horizontal) {
      // Both lines in `g` itself — below the overlay when it is in `g` too,
      // so the pointer still reaches it. Shown and hidden by style opacity.
      const below = overlay.node().parentNode === g.node() ? overlay.node() : null;
      this._line  = g.insert('line', () => below).style('opacity', 0);
      this._hLine = g.insert('line', () => below).style('opacity', 0);
      this._dots  = null;
      return;
    }

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
   * @param {string}       ctx.timeZone    — 'local' (default) | 'UTC': the zone
   *                                         the default header names the date in (T-10)
   * @param {*}            ctx.dash        — the chart's strokeDash for every line
   *                                         (a series' own wins): the default
   *                                         tooltip draws such a line dashed
   *
   * With { horizontal: true }: the crosshair follows `series[0]`;
   * `tooltipFmt(d, others)` builds the html for its row d (required) —
   * `others` holds, for each further series, its row nearest d's date, or
   * null where d's date is outside its rows (pointNear) — and
   * `toCard(px, py)` maps the point from the plot to the tooltip's frame;
   * `formatFor` is not used.
   */
  bind(ctx) {
    if (this._horizontal) { this._bindPoint(ctx); return; }
    const { W, H, x, scaleFor, formatFor, series, enabled = true, tooltipFmt, timeZone = 'local', dash = null } = ctx;
    const t = this._theme;
    // a series colour leaves the chart in the points (tooltipFormat): hex
    const hex = hexOf(t);
    const headerDate = timeKit(timeZone).format('%b %d, %Y');
    // Each series' mark in the default tooltip (RC-082): a band's square, a
    // bar's dot, a line solid or dashed as drawn.
    const markOf = s => (s.type === 'band' ? 'band'
      : s.type === 'bar' ? 'dot'
      : resolveStrokeDash(s.strokeDash ?? dash) ? 'dashed' : 'line');
    const marks = new Map(series.map(s => [s.name, markOf(s)]));

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
            name: s.name, series: s.name, type: 'band', color: hex(s.color), date: d.date,
            lower: d.lower, upper: d.upper,
            fmt: `${formatFor(s, d.lower)} – ${formatFor(s, d.upper)}`,
          };
        }
        const fmt = formatFor(s, d.value);
        return { name: s.name, series: s.name, axis: s.axis, type: s.type, color: hex(s.color), date: d.date, value: d.value, fmt };
      }).filter(Boolean);

      // Nothing under the cursor (outside every series' date range): clear.
      if (!points.length) { this.hide(); return; }

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
        : tipDate(headerDate(payload.date)) +
          points.map(p =>
            tipRow(escapeHtml(p.name), escapeHtml(p.fmt), { swatch: marks.get(p.name), color: p.color })
          ).join('');

      const [px, py] = d3.pointer(event, this._overlay.node().closest('.rc-chart') ?? this._overlay.node().parentElement);
      this._tooltip.show(px, py, html);
    };

    this._overlay
      .on('mousemove', move)
      .on('mouseleave', () => this.hide());
  }

  // The point crosshair (horizontal: true). The lines go through the point
  // nearest the pointer — on a tie the earlier one; there is always one
  // while the series has a value — and the tooltip sits at that point. A
  // gap (a value of null, TimeSeries gaps 'break') has no height: only the
  // vertical line marks it, and the tooltip sits at the pointer. The other
  // series are reported to the tooltip at that point's date, not drawn.
  _bindPoint({ W, H, x, scaleFor, series, enabled = true, tooltipFmt, toCard }) {
    const t = this._theme;

    this._overlay
      .attr('width', W)
      .attr('height', H);

    [this._line, this._hLine].forEach(l =>
      l.attr('stroke', t.crosshair)
       .attr('stroke-width', 1)
       .attr('stroke-dasharray', '3 3'));

    if (!enabled) {
      this._overlay.on('mousemove', null).on('mouseleave', null);
      return;
    }

    const s      = series[0];
    const values = s?.values ?? [];
    const others = series.slice(1);
    const bisect = d3.bisector(d => d.date).left;

    const move = (event) => {
      const [mx, my] = d3.pointer(event, this._overlay.node());
      const date = x.invert(mx);
      const i  = bisect(values, date, 1);
      const d0 = values[i - 1];
      const d1 = values[i];
      const d  = d1 && (date - d0.date > d1.date - date) ? d1 : (d0 || d1);
      if (!d) return;                         // no values

      const gap = d.value === null;
      const cx = x(d.date);
      const cy = gap ? Math.min(Math.max(my, 0), H) : scaleFor(s)(d.value);
      this._line.attr('x1', cx).attr('x2', cx).attr('y1', 0).attr('y2', H).style('opacity', 1);
      if (gap) this._hLine.style('opacity', 0);
      else this._hLine.attr('x1', 0).attr('x2', W).attr('y1', cy).attr('y2', cy).style('opacity', 1);

      const html = tooltipFmt(d, others.map(o => pointNear(o.values, d.date)));
      const [tx, ty] = toCard(cx, cy);
      this._tooltip.show(tx, ty, html);
    };

    this._overlay
      .on('mousemove', move)
      .on('mouseleave', () => this.hide());
  }

  hide() {
    if (this._horizontal) {
      this._line.style('opacity', 0);
      this._hLine.style('opacity', 0);
    } else {
      this._line.attr('opacity', 0);
      this._dots.selectAll('.rc-cross-dot').attr('opacity', 0);
    }
    this._tooltip.hide();
  }

  // Empty chart: hide, and drop the hover handlers — they hold the last
  // series and scale. The next bind() attaches fresh ones.
  unbind() {
    this._overlay.on('mousemove', null).on('mouseleave', null);
    this.hide();
  }
}

/**
 * The row of `values` (sorted by date) nearest `date` — on a tie the
 * earlier — while `date` lies within their first and last dates; null
 * outside them or without values. A series that does not reach a date is
 * not reported there by its nearest end.
 *
 * @param {Array<{date: Date}>} values
 * @param {Date} date
 * @returns {object|null}
 */
export function pointNear(values, date) {
  if (!values?.length || date < values[0].date || date > values[values.length - 1].date) return null;
  const i = d3.bisector(d => d.date).left(values, date, 1);
  const a = values[i - 1], b = values[i];
  return b && (date - a.date > b.date - date) ? b : a;
}

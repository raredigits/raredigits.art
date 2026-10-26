// RareCharts — Overview (mini-map)
// Small navigator strip under a chart, with a brush for range selection. The
// `navigator` option of every time chart builds one (Line, dated Bar,
// DualAxes, TimeSeries, the Graph flow view, MapFlow) and syncs it with the
// chart both ways; it also works on its own, as below — a public class,
// documented on /charts/line/time-series/ ("Overview (standalone navigator)").
// It is not a Chart: no header, footer, timeframes or whenReady().
//
// Usage:
//   const overview = new Overview('#overview', { height: 56 });
//   overview.setData(data, (extent, { final }) => mainChart.setView(extent), { extent });
//   mainChart.onViewChange(extent => overview.setBrush(extent));
// onBrush gets { final: true } once, when a drag ends; the optional `extent`
// is the strip's time span (default: the data's own) — pass the chart's full
// extent so dates that only other series cover can be brushed to.
// Dates are read as the charts read them (K-04): a Date, an ISO string or
// epoch ms — in the rows, in `extent` and in setBrush(). The rows are copied
// and sorted by date; a row with an unreadable date or value is dropped.
//
// Options:
//   height      — px (default: 52)
//   color       — line stroke color; falls back to theme.border
//   area        — false | true (gradient) | number (solid opacity) (default: true)
//   areaColor   — fill color for area; falls back to theme.accent
//   brushColor  — stroke + handle color for brush selection; falls back to theme.text
//                 (the selection and overlay tints are theme.text, faint)
//   margin      — { top, right, bottom, left } px; right defaults to 70, the
//                 Y-axis gutter of the charts it sits under
//   axis        — draw a time axis under the strip (default: false); the
//                 relation charts (Graph flow, MapFlow) turn it on

import * as d3 from 'd3';
import { defaultTheme } from '../core/theme.js';
import { uid, parseDate, byDate } from '../core/utils.js';

export class Overview {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    this.theme  = { ...defaultTheme, ...(options.theme ?? {}) };
    this.opts   = {
      height:      options.height     ?? 52,
      area:        options.area,
      areaColor:   options.areaColor,
      brushColor:  options.brushColor,
      color:       options.color,
      axis:        !!options.axis,
    };
    this.margin = { top: 6, right: 70, bottom: 16, left: 0, ...(options.margin ?? {}) };
    this._data  = [];
    // Its own <defs> id prefix: the strip is also a public class used
    // without a chart around it (C-04)
    this._uid   = uid('rc');
    this._init();
  }

  get width()  { return Math.max(0, this.container.clientWidth - this.margin.left - this.margin.right); }
  get height() { return Math.max(0, this.opts.height - this.margin.top - this.margin.bottom); }

  _init() {
    this.container.style.height = this.opts.height + 'px';
    this.svg = d3.select(this.container).append('svg').attr('width', '100%').attr('height', '100%');
    const { left, top } = this.margin;
    this.g      = this.svg.append('g').attr('transform', `translate(${left},${top})`);
    this.gArea  = this.g.append('g');
    this.gLine  = this.g.append('g');
    this.gAxis  = this.g.append('g').attr('class', 'rc-ov-axis');
    this.gBrush = this.g.append('g');

    this._resizeObserver = new ResizeObserver(() => {
      if (this._data.length) this._render();
    });
    this._resizeObserver.observe(this.container);
  }

  // After destroy() the page's onBrush never fires — not even for a drag
  // that ends after it: d3 finishes a gesture on window listeners (C-33).
  destroy() {
    this._destroyed = true;
    this._onBrush = null;
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }

  setData(data, onBrush, { extent = null } = {}) {
    // Read like a chart's rows (K-04): string and epoch dates parsed, numeric
    // strings coerced, unreadable rows dropped, date order — on a copy.
    this._data    = (Array.isArray(data) ? data : [])
      .map(d => (d && typeof d === 'object' ? { ...d, date: parseDate(d.date), value: d.value == null || d.value === '' ? NaN : +d.value } : null))
      .filter(d => d && d.date && Number.isFinite(d.value))
      .sort(byDate);
    this._onBrush = onBrush;
    // a zero-span extent (every tie at one instant) has nothing to spread:
    // the strip then spans its own data
    const span    = Array.isArray(extent) ? [parseDate(extent[0]), parseDate(extent[1])] : null;
    this._extent  = span && span[0] && span[1] && +span[1] > +span[0] ? span : null;
    this._render();
    return this;
  }

  setBrush(extent) {
    if (!this._xScale || !Array.isArray(extent)) return;
    const a = parseDate(extent[0]), b = parseDate(extent[1]);
    if (!a || !b) return;
    // Clamped to the strip: a selection past either end would lose its handle.
    const [r0, r1] = this._xScale.range();
    const x = d => Math.min(r1, Math.max(r0, this._xScale(d)));
    this._lastSelection = [x(a), x(b)];
    this._brush.move(this.gBrush, this._lastSelection);
  }

  _render() {
    const W = this.width, H = this.height;
    const t = this.theme;

    this._xScale = d3.scaleTime().domain(this._extent ?? d3.extent(this._data, d => d.date)).range([0, W]);
    const yScale = d3.scaleLinear()
      .domain([d3.min(this._data, d => d.value), d3.max(this._data, d => d.value)])
      .range([H, 0]);

    const line = d3.line()
      .x(d => this._xScale(d.date)).y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const area = d3.area()
      .x(d => this._xScale(d.date)).y0(H).y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const areaOpt      = this.opts.area;
    const solidOpacity = typeof areaOpt === 'number' ? areaOpt : null;
    const lineColor    = this.opts.color      ?? t.border;
    const areaColor    = this.opts.areaColor  ?? t.accent;
    const brushColor   = this.opts.brushColor ?? t.text;

    if (areaOpt === false) {
      this.gArea.selectAll('*').remove();
    } else if (solidOpacity !== null) {
      // Solid fill — area: 0.12 (number = opacity)
      this.gArea.selectAll('.rc-ov-area').data([this._data]).join('path')
        .attr('class', 'rc-ov-area')
        .attr('d', area)
        .attr('fill', areaColor)
        .attr('fill-opacity', solidOpacity);
    } else {
      // Gradient — default. The id is this strip's own, so two navigators
      // never paint with each other's gradient (C-04); the old name
      // rc-ov-grad stays as the class it is found by.
      const gradId = `${this._uid}-ov-grad`;
      let grad = this.svg.select('.rc-ov-grad');
      if (grad.empty()) {
        grad = this.svg.append('defs').append('linearGradient')
          .attr('id', gradId)
          .attr('class', 'rc-ov-grad')
          .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-opacity', 0.18);
        grad.append('stop').attr('offset', '100%').attr('stop-opacity', 0);
      }
      grad.selectAll('stop').attr('stop-color', areaColor);

      this.gArea.selectAll('.rc-ov-area').data([this._data]).join('path')
        .attr('class', 'rc-ov-area')
        .attr('d', area)
        .attr('fill', `url(#${gradId})`)
        .attr('fill-opacity', 1);
    }

    this.gLine.selectAll('.rc-ov-line').data([this._data]).join('path')
      .attr('class', 'rc-ov-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1);

    if (this.opts.axis) {
      this.gAxis
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(this._xScale).ticks(Math.max(2, Math.floor(W / 90))).tickSizeOuter(0).tickSize(3))
        // d3 sets font-family="sans-serif" on the axis; the chart's font wins
        .attr('font-family', null)
        .call(g => g.select('.domain').attr('stroke', t.border ?? t.muted))
        .call(g => g.selectAll('.tick line').attr('stroke', t.border ?? t.muted))
        .call(g => g.selectAll('.tick text').attr('fill', t.muted).attr('font-size', 10));
      // A label that would run past either end of the strip is dropped
      // rather than cut by the card's edge.
      const { left, right } = this.margin;
      this.gAxis.selectAll('.tick').each((d, i, els) => {
        const text = els[i].querySelector('text');
        if (!text) return;
        const x = this._xScale(d);
        const half = (text.getComputedTextLength?.() || String(text.textContent).length * 5.5) / 2;
        text.style.display = x - half < -left || x + half > W + right ? 'none' : '';
      });
    } else {
      this.gAxis.selectAll('*').remove();
    }

    this._brush = d3.brushX()
      .extent([[0, 0], [W, H]])
      .on('start brush end', (event) => {
        if (!event.sourceEvent || this._destroyed) return;   // our own setBrush moves
        if (event.type === 'start') { this._gestureMoved = false; return; }
        const sel = event.selection;
        const invert = s => [this._xScale.invert(s[0]), this._xScale.invert(s[1])];
        if (!sel || sel[1] - sel[0] < 1) {
          // A click, or a drag brought back to zero width: d3 clears its
          // selection while the chart keeps a window. Put the last real
          // selection back — and if this gesture already moved the view,
          // report that window as final.
          if (event.type === 'end' && this._lastSelection) {
            this.gBrush.call(this._brush.move, this._lastSelection);
            if (this._gestureMoved) this._onBrush?.(invert(this._lastSelection), { final: true });
          }
          return;
        }
        this._lastSelection = sel;
        this._gestureMoved = true;
        this._onBrush?.(invert(sel), { final: event.type === 'end' });
      });

    // Tints follow the theme (C-12): theme.text, faint — black on the light
    // theme as before, light on darkTheme. fill-opacity, not rgba(): a theme
    // colour may be a CSS variable. (d3 gives .selection fill-opacity 0.3, so
    // the old rgba alpha 0.05 drew at 0.015.)
    this.gBrush.call(this._brush)
      .call(g => {
        g.select('.selection').attr('fill', t.text).attr('fill-opacity', 0.015)
          .attr('stroke', brushColor).attr('stroke-width', 1);
        g.selectAll('.handle').attr('fill', brushColor).attr('opacity', 0.7);
        g.select('.overlay').attr('fill', t.text).attr('fill-opacity', 0.2);
      });
  }
}

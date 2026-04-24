// RareCharts — Overview (mini-map)
// Small navigator chart rendered below the main chart. Exposes a brush for range selection.
// Syncs with TimeSeries in both directions.
//
// Usage:
//   const overview = new Overview('#overview', { height: 56 });
//   overview.setData(data, extent => mainChart.setView(extent));
//   mainChart.onViewChange(extent => overview.setBrush(extent));
//
// Options:
//   height      — px (default: 52)
//   color       — line stroke color; falls back to theme.border
//   area        — false | true (gradient) | number (solid opacity) (default: true)
//   areaColor   — fill color for area; falls back to theme.accent
//   brushColor  — stroke + handle color for brush selection; falls back to theme.text

import * as d3 from 'd3';
import { defaultTheme } from '../core/theme.js';

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
    };
    this.margin = { top: 6, right: 70, bottom: 16, left: 0 };
    this._data  = [];
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
    this.gBrush = this.g.append('g');

    this._resizeObserver = new ResizeObserver(() => {
      if (this._data.length) this._render();
    });
    this._resizeObserver.observe(this.container);
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }

  setData(data, onBrush) {
    this._data    = data;
    this._onBrush = onBrush;
    this._render();
    return this;
  }

  setBrush(extent) {
    if (!this._xScale || !extent) return;
    this._brush.move(this.gBrush, [
      this._xScale(extent[0]),
      this._xScale(extent[1]),
    ]);
  }

  _render() {
    const W = this.width, H = this.height;
    const t = this.theme;

    this._xScale = d3.scaleTime().domain(d3.extent(this._data, d => d.date)).range([0, W]);
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

    if (solidOpacity !== null) {
      // Solid fill — area: 0.12 (number = opacity)
      this.gArea.selectAll('.rc-ov-area').data([this._data]).join('path')
        .attr('class', 'rc-ov-area')
        .attr('d', area)
        .attr('fill', areaColor)
        .attr('fill-opacity', solidOpacity);
    } else {
      // Gradient — default
      let grad = this.svg.select('#rc-ov-grad');
      if (grad.empty()) {
        grad = this.svg.append('defs').append('linearGradient')
          .attr('id', 'rc-ov-grad')
          .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-opacity', 0.18);
        grad.append('stop').attr('offset', '100%').attr('stop-opacity', 0);
      }
      grad.selectAll('stop').attr('stop-color', areaColor);

      this.gArea.selectAll('.rc-ov-area').data([this._data]).join('path')
        .attr('class', 'rc-ov-area')
        .attr('d', area)
        .attr('fill', 'url(#rc-ov-grad)')
        .attr('fill-opacity', 1);
    }

    this.gLine.selectAll('.rc-ov-line').data([this._data]).join('path')
      .attr('class', 'rc-ov-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1);

    this._brush = d3.brushX()
      .extent([[0, 0], [W, H]])
      .on('brush end', (event) => {
        if (!event.selection || !event.sourceEvent) return;
        const [x0, x1] = event.selection;
        if (this._onBrush) {
          this._onBrush([this._xScale.invert(x0), this._xScale.invert(x1)]);
        }
      });

    this.gBrush.call(this._brush)
      .call(g => {
        g.select('.selection').attr('fill', 'rgba(0,0,0,0.05)').attr('stroke', brushColor).attr('stroke-width', 1);
        g.selectAll('.handle').attr('fill', brushColor).attr('opacity', 0.7);
        g.select('.overlay').attr('fill', 'rgba(0,0,0,0.2)');
      });
  }
}

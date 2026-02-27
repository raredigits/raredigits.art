// RareCharts — Overview (mini-map)
// Маленький график под основным. Brush для выбора диапазона.
// Синхронизируется с TimeSeries в обе стороны.
//
// Использование:
//   const overview = new Overview('#overview', { height: 56 });
//   overview.setData(data, extent => mainChart.setView(extent));
//   mainChart.onViewChange(extent => overview.setBrush(extent));

import * as d3 from 'd3';
import { defaultTheme } from '../core/Theme.js';

export class Overview {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    this.theme  = { ...defaultTheme, ...(options.theme ?? {}) };
    this.opts   = { height: options.height ?? 52 };
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
    this.gLine  = this.g.append('g');
    this.gBrush = this.g.append('g');
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

    this.gLine.selectAll('.rc-ov-line').data([this._data]).join('path')
      .attr('class', 'rc-ov-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#3a3a3a')
      .attr('stroke-width', 1);

    this._brush = d3.brushX()
      .extent([[0, 0], [W, H]])
      .on('brush end', (event) => {
        if (!event.selection) return;
        const [x0, x1] = event.selection;
        if (this._onBrush) {
          this._onBrush([this._xScale.invert(x0), this._xScale.invert(x1)]);
        }
      });

    this.gBrush.call(this._brush)
      .call(g => {
        g.select('.selection').attr('fill', 'rgba(255,98,0,0.1)').attr('stroke', t.accent).attr('stroke-width', 1);
        g.selectAll('.handle').attr('fill', t.accent).attr('opacity', 0.7);
        g.select('.overlay').attr('fill', 'rgba(0,0,0,0.2)');
      });
  }
}

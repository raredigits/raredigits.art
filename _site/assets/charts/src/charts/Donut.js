// RareCharts — Donut
// Donut диаграмма с hover и легендой.
//
// Ожидаемый формат данных:
// [{ label: string, value: number }, ...]

import * as d3 from 'd3';
import { Chart } from '../core/Chart.js';

export class Donut extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 180,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });
    this._data = [];
    this._initSVG();
  }

  setData(data) {
    this._data = data;
    this.render();
    return this;
  }

  _initSVG() {
    this.container.style.height = this.options.height + 'px';
    this.svg = d3.select(this.container).append('svg').attr('width', '100%').attr('height', '100%');
  }

  render() {
    if (!this._data.length) return;
    const t = this.theme;
    const W = this.container.clientWidth;
    const H = this.options.height;

    this.svg.selectAll('*').remove();

    const radius = Math.min(W * 0.38, H * 0.42);
    const cx = W * 0.33, cy = H / 2;
    const g  = this.svg.append('g').attr('transform', `translate(${cx},${cy})`);

    const pie       = d3.pie().value(d => d.value).sort(null).padAngle(0.025);
    const arc       = d3.arc().innerRadius(radius * 0.58).outerRadius(radius);
    const arcHover  = d3.arc().innerRadius(radius * 0.54).outerRadius(radius * 1.05);
    const total     = d3.sum(this._data, d => d.value);

    // Arcs
    g.selectAll('.rc-slice').data(pie(this._data)).join('g').attr('class', 'rc-slice')
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => t.colors[i % t.colors.length])
      .attr('opacity', 0.85)
      .on('mouseover', function() { d3.select(this).attr('d', arcHover).attr('opacity', 1); })
      .on('mouseout',  function() { d3.select(this).attr('d', arc).attr('opacity', 0.85); });

    // Центральные подписи
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .attr('fill', t.muted).style('font-family', t.font).style('font-size', '9px').text('TOTAL');

    g.append('text').attr('text-anchor', 'middle').attr('dy', '1em')
      .attr('fill', t.text).style('font-family', t.font).style('font-size', '15px')
      .text(this.options.centerFormat ? this.options.centerFormat(total) : d3.format(',.0f')(total));

    // Легенда
    const legend = this.svg.append('g')
      .attr('transform', `translate(${cx + radius + 18}, ${cy - this._data.length * 10})`);

    this._data.forEach((d, i) => {
      const row = legend.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 8).attr('height', 8).attr('y', -8)
        .attr('fill', t.colors[i % t.colors.length]);
      row.append('text').attr('x', 12).attr('fill', t.muted)
        .style('font-family', t.font).style('font-size', '9px')
        .text(`${d.label}  ${Math.round(d.value / total * 100)}%`);
    });
  }
}

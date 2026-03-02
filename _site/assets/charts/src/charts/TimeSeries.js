// RareCharts — TimeSeries
// Линейный график с zoom (wheel), pan (drag), crosshair и mini-map.
//
// Ожидаемый формат данных:
// [{ date: Date, value: number }, ...]
//
// Опции:
//   height        — высота в px (default: 340)
//   tooltipFormat — fn(d) => html-строка для тултипа
//   theme         — объект с переопределением цветов

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';

export class TimeSeries extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 340,
      margin: { top: 16, right: 70, bottom: 28, left: 0 },
      ...options,
    });

    this._data           = [];
    this._viewExtent     = null;
    this._onViewChangeCb = null;
    this._tooltip        = new Tooltip(this.container, this.theme);

    this._initSVG();
    this._bindZoomPan();
    this._bindHover();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setData(data) {
    this._data       = data;
    this._viewExtent = null;
    this.render();
    return this;
  }

  appendPoint(point) {
    this._data.push(point);
    this._data.sort((a, b) => a.date - b.date);
    this.render();
    return this;
  }

  setView(extent) {
    this._viewExtent = extent;
    this.render();
    return this;
  }

  onViewChange(fn) {
    this._onViewChangeCb = fn;
    return this;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container).append('svg')
      .attr('width', '100%').attr('height', '100%');

    const { top, left } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    // Clip path — линия не выходит за края при zoom
    const clipId = 'rc-clip-' + Math.random().toString(36).slice(2);
    this.clipRect = this.svg.append('defs').append('clipPath')
      .attr('id', clipId).append('rect');
    this.clipId = clipId;

    this.gGrid  = this.g.append('g').attr('class', 'rc-grid');
    this.gArea  = this.g.append('g').attr('clip-path', `url(#${clipId})`);
    this.gPaths = this.gArea.append('g');
    this.gAxisX = this.g.append('g').attr('class', 'rc-axis');
    this.gAxisY = this.g.append('g').attr('class', 'rc-axis');

    // Crosshair: X (вертикаль) + Y (горизонталь)
    this.crossX = this.g.append('line').style('opacity', 0);
    this.crossY = this.g.append('line').style('opacity', 0);

    this.overlay = this.g.append('rect').attr('fill', 'none').attr('pointer-events', 'all');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    if (!this._data.length) return;
    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;

    this.clipRect.attr('width', W).attr('height', H + 4).attr('y', -4);
    this.overlay.attr('width', W).attr('height', H);

    const fullExtent = d3.extent(this._data, d => d.date);
    const viewExtent = this._viewExtent ?? fullExtent;

    const visible = this._data.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]);
    this._visible = visible;

    this.xScale = d3.scaleTime().domain(viewExtent).range([0, W]);
    const yMin  = d3.min(visible, d => d.value) * 0.99;
    const yMax  = d3.max(visible, d => d.value) * 1.01;
    this.yScale = d3.scaleLinear().domain([yMin, yMax]).range([H, 0]);

    // Grid
    this.gGrid
      .attr('transform', `translate(${W},0)`)
      .call(d3.axisLeft(this.yScale).ticks(5).tickSize(-W).tickFormat(''))
      .call(g => {
        g.selectAll('line').attr('stroke', t.grid).attr('stroke-width', 1);
        g.select('.domain').remove();
      });

    // Area + line paths
    const area = d3.area()
      .x(d => this.xScale(d.date)).y0(H).y1(d => this.yScale(d.value))
      .curve(d3.curveMonotoneX);
    const line = d3.line()
      .x(d => this.xScale(d.date)).y(d => this.yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Gradient — создаём один раз, потом только обновляем цвет
    let grad = this.svg.select('#rc-ts-grad');
    if (grad.empty()) {
      grad = this.svg.select('defs').append('linearGradient')
        .attr('id', 'rc-ts-grad')
        .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-opacity', 0.22);
      grad.append('stop').attr('offset', '100%').attr('stop-opacity', 0);
    }
    grad.selectAll('stop')
      .attr('stop-color', t.accent);

    this.gPaths.selectAll('.rc-ts-area').data([visible]).join('path')
      .attr('class', 'rc-ts-area')
      .attr('d', area)
      .attr('fill', 'url(#rc-ts-grad)');

    this.gPaths.selectAll('.rc-ts-line').data([visible]).join('path')
      .attr('class', 'rc-ts-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', t.accent)
      .attr('stroke-width', t.strokeWidth ?? 1.5);

    // Axis X — D3 сам подбирает формат под текущий zoom-уровень
    this.gAxisX.attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(this.xScale).ticks(Math.max(2, Math.floor(W / 100))).tickSize(4))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.numericFont)
          .style('font-size', '10px');
        g.selectAll('line').attr('stroke', t.border);
        g.select('.domain').attr('stroke', t.border);
      });

    // Axis Y
    this.gAxisY.attr('transform', `translate(${W},0)`)
      .call(d3.axisRight(this.yScale).ticks(5).tickFormat(d => '$' + d3.format(',.0f')(d)))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.numericFont)
          .style('font-size', '10px');
        g.selectAll('line,path').remove();
      });

    // Crosshair styling — из темы, без хардкодов
    [this.crossX, this.crossY].forEach(l =>
      l.attr('stroke', t.crosshair)
       .attr('stroke-width', 1)
       .attr('stroke-dasharray', '3 3')
    );
  }

  // ── Zoom & Pan ────────────────────────────────────────────────────────────

  _bindZoomPan() {
    this._zoom = d3.zoom()
      .scaleExtent([1, 500])
      .on('zoom', (event) => {
        if (!this._data.length) return;

        const fullExtent = d3.extent(this._data, d => d.date);
        const xFull = d3.scaleTime().domain(fullExtent).range([0, this.width]);
        const newX  = event.transform.rescaleX(xFull);

        const extent = [
          d3.max([newX.invert(0),          fullExtent[0]]),
          d3.min([newX.invert(this.width),  fullExtent[1]]),
        ];

        this._viewExtent = extent;
        this.render();
        if (this._onViewChangeCb) this._onViewChangeCb(extent);
      });

    this.svg.call(this._zoom);
  }

  // ── Hover / Crosshair ─────────────────────────────────────────────────────

  _bindHover() {
    this.overlay
      .on('mousemove', (event) => {
        if (!this._visible?.length) return;
        const [mx] = d3.pointer(event);
        const W = this.width, H = this.height;

        const date   = this.xScale.invert(mx);
        const bisect = d3.bisector(d => d.date).left;
        const idx    = bisect(this._visible, date, 1);
        const d0     = this._visible[idx - 1];
        const d1     = this._visible[idx];
        const d      = d1 && (date - d0.date > d1.date - date) ? d1 : (d0 || d1);
        if (!d) return;

        const cx = this.xScale(d.date);
        const cy = this.yScale(d.value);

        this.crossX.attr('x1', cx).attr('x2', cx).attr('y1', 0).attr('y2', H).style('opacity', 1);
        this.crossY.attr('x1', 0).attr('x2', W).attr('y1', cy).attr('y2', cy).style('opacity', 1);

        const html = this.options.tooltipFormat
          ? this.options.tooltipFormat(d)
          : this._defaultTooltip(d);

        this._tooltip.show(cx + this.margin.left, cy + this.margin.top, html);
      })
      .on('mouseleave', () => {
        this.crossX.style('opacity', 0);
        this.crossY.style('opacity', 0);
        this._tooltip.hide();
      });
  }

  _defaultTooltip(d) {
    const t    = this.theme;
    const date = d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return `
      <div style="color:${t.muted};font-size:10px;margin-bottom:4px">${date}</div>
      <div style="color:${t.accent};font-size:14px;font-weight:bold">
        ${typeof d.value === 'number' ? '$' + d3.format(',.2f')(d.value) : d.value}
      </div>
    `;
  }
}

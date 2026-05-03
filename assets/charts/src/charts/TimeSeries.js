// RareCharts — TimeSeries
// Price time series with zoom (wheel), pan (drag), crosshair and mini-map support.
//
// Expected data format:
// [{ date: Date, value: number, open?, high?, low?, volume? }, ...]
//
// Options:
//   height        — px (default: 340)
//   tooltipFormat — fn(d) => HTML string for tooltip
//   theme         — theme override object
//   curve         — 'linear'|'monotone'|'basis'|'cardinal'|'step'|'stepBefore'|'stepAfter' (default: 'monotone')
//   area          — show area fill under line (default: true)
//   yLabelsOnly   — hide Y axis line/ticks (default: true)
//   yTicks        — Y tick count (default: 5)

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';
import { renderGrid, renderAxisX, renderAxisYRight } from '../core/renderHelpers.js';

export class TimeSeries extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;
    super(selector, {
      height: 340,
      margin: {
        top:    options.margin?.top    ?? 16,
        right:  options.margin?.right  ?? 70,
        bottom: options.margin?.bottom ?? 28,
        left:   options.margin?.left   ?? 0,
      },
      ...restOptions,
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
    this._syncTimeframeButtons(this._getDataExtent());
    this.render();
    return this;
  }

  appendPoint(point) {
    this._data.push(point);
    this._data.sort((a, b) => a.date - b.date);
    this.render();
    return this;
  }

  _getDataExtent() {
    return this._data.length ? d3.extent(this._data, d => d.date) : null;
  }

  _getNavigatorData() {
    return this._data.length ? this._data : null;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container).append('svg')
      .attr('width', '100%').attr('height', '100%');

    const { top, left } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    // Clip path — keep the line inside the plot area while zooming
    const clipId = 'rc-clip-' + Math.random().toString(36).slice(2);
    this.clipRect = this.svg.append('defs').append('clipPath')
      .attr('id', clipId).append('rect');
    this.clipId = clipId;

    this.gGrid  = this.g.append('g').attr('class', 'rc-grid');
    this.gArea  = this.g.append('g').attr('clip-path', `url(#${clipId})`);
    this.gPaths = this.gArea.append('g');
    this.gAxisX = this.g.append('g').attr('class', 'rc-axis');
    this.gAxisY = this.g.append('g').attr('class', 'rc-axis');

    // Crosshair: vertical (X) + horizontal (Y)
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

    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);
    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    const visible = this._data.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]);
    this._visible = visible;

    this.xScale = d3.scaleTime().domain(viewExtent).range([0, W]);
    const yMin  = d3.min(visible, d => d.value) * 0.99;
    const yMax  = d3.max(visible, d => d.value) * 1.01;
    this.yScale = d3.scaleLinear().domain([yMin, yMax]).range([H, 0]);

    // Grid
    renderGrid(this.gGrid, this.yScale, W, (this.options.yTicks ?? 5), t);

    const curveName = this.options.curve ?? 'monotone';
    const curveMap = {
      linear: d3.curveLinear,
      monotone: d3.curveMonotoneX,
      basis: d3.curveBasis,
      cardinal: d3.curveCardinal,
      step: d3.curveStep,
      stepBefore: d3.curveStepBefore,
      stepAfter: d3.curveStepAfter,
    };
    const curve = curveMap[curveName] ?? d3.curveMonotoneX;

    // Area + line paths
    const line = d3.line()
      .x(d => this.xScale(d.date)).y(d => this.yScale(d.value))
      .curve(curve);

    const areaOpt = this.options.area;

    if (areaOpt !== false) {
      const area = d3.area()
        .x(d => this.xScale(d.date)).y0(H).y1(d => this.yScale(d.value))
        .curve(curve);

      const solidOpacity = typeof areaOpt === 'number' ? areaOpt : null;
      const areaColor    = this.options.areaColor ?? t.accent;

      if (solidOpacity !== null) {
        // Solid fill — area: 0.12 (number = opacity)
        this.gPaths.selectAll('.rc-ts-area').data([visible]).join('path')
          .attr('class', 'rc-ts-area')
          .attr('d', area)
          .attr('fill', areaColor)
          .attr('fill-opacity', solidOpacity);
      } else {
        // Gradient — area: true (default)
        let grad = this.svg.select('#rc-ts-grad');
        if (grad.empty()) {
          grad = this.svg.select('defs').append('linearGradient')
            .attr('id', 'rc-ts-grad')
            .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
          grad.append('stop').attr('offset', '0%').attr('stop-opacity', 0.22);
          grad.append('stop').attr('offset', '100%').attr('stop-opacity', 0);
        }
        grad.selectAll('stop').attr('stop-color', areaColor);

        this.gPaths.selectAll('.rc-ts-area').data([visible]).join('path')
          .attr('class', 'rc-ts-area')
          .attr('d', area)
          .attr('fill', 'url(#rc-ts-grad)')
          .attr('fill-opacity', 1);
      }
    } else {
      this.gPaths.selectAll('.rc-ts-area').remove();
    }

    this.gPaths.selectAll('.rc-ts-line').data([visible]).join('path')
      .attr('class', 'rc-ts-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', t.accent)
      .attr('stroke-width', t.strokeWidth ?? 1.5);

    // X axis
    const xTickFormat = this.options.xTickFormat ?? (d => d3.timeFormat('%b')(d));
    renderAxisX(this.gAxisX, this.xScale, H, xTickFormat, t);

    // Y axis
    const yTicks = this.options.yTicks ?? 5;
    const yTickFormat = this.options.yTickFormat ?? (v => '$' + d3.format(',.0f')(v));
    renderAxisYRight(
      this.gAxisY,
      this.yScale,
      W,
      yTicks,
      yTickFormat,
      (this.options.yLabelsOnly ?? true),
      t,
      this.options.yTickValues ?? null
    );

    // Crosshair styling — from theme, no hardcoded values
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
        this._syncTimeframeButtons(fullExtent, extent);
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
      <div style="color:${t.muted};font-size:${t.fontSize};margin-bottom:4px">${date}</div>
      <div style="color:${t.accent};font-size:14px;font-weight:bold">
        ${typeof d.value === 'number' ? '$' + d3.format(',.2f')(d.value) : d.value}
      </div>
    `;
  }
}

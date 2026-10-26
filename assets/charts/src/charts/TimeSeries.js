// RareCharts — TimeSeries
// Long date series with range buttons, zoom (wheel), pan (drag), crosshair
// and a navigator strip.
//
// Expected data format:
// [{ date, value, ...extra }, ...] — `date` a Date, ISO string or epoch ms,
// `value` a number (numeric strings are coerced). Only `value` is drawn; any
// other fields (open, high, low, volume…) pass through to tooltipFormat(d, info).
// The input is copied, parsed and sorted by date; rows with an unreadable
// date or value are dropped. The caller's array is never modified.
//
// Options:
//   height        — px (default: 340)
//   tooltipFormat — fn(d, info) => HTML string for tooltip; d is the row (a
//                   copy, date parsed), info the role fields { date, value,
//                   color } — the rule for every class (K-09):
//                   /charts/settings/#formatter-arguments
//   crosshair     — crosshair lines and tooltip on hover (default: true)
//   theme         — theme override object
//   curve         — 'linear'|'monotone'|'basis'|'cardinal'|'step'|'stepBefore'|'stepAfter' (default: 'monotone')
//   area          — false | true (gradient) | number (solid fill at that opacity) (default: true)
//   areaColor     — area fill color (default: theme.accent)
//   yLabelsOnly   — hide Y axis line/ticks (default: true)
//   yScale        — 'linear' (default) | 'log'. Log: powers-of-ten ticks, the
//                   margin above/below is a factor of the data's span, values
//                   ≤ 0 are skipped (warned once per setData). setYScale() switches
//   scaleToggle   — a Lin/Log button, top right of the header above the Y labels
//                   (true | { labels: { linear, log } }); onScaleChange(fn)
//                   gets { scale, axis: 'y' } on every switch
//   yTicks        — Y tick count (default: 5)
//   yTickValues   — explicit Y tick positions (overrides yTicks); the value
//                   range widens to include them
//   yTickFormat   — fn(value) => string (default: '$' + ',.0f')
//   xTickFormat   — fn(date) => string. Default by the span in view (C-31):
//                   ≤ 36 h '%H:%M' (a midnight tick names the day), ≤ 92 days
//                   '%b %d' (at most one tick per day), ≤ 366 days '%b',
//                   ≤ 5 years "%b '%y", longer '%Y'
//   showGrid      — show grid lines (default: true)
//   showXAxis     — show X axis (default: true; hiding it also reclaims the bottom margin)
//   showYAxis     — show Y axis (default: true; hiding it also reclaims the right margin)
//   annotations   — event markers. Vertical (point/range) and horizontal (line/band).
//                   point:  { date, label?, color?, strokeDash?, labelColor? }
//                   range:  { from, to, label?, color?, fill?, fillOpacity?, strokeDash? }
//                   hPoint: { value, label?, color?, strokeDash?, labelPosition? }
//                   hRange: { yFrom, yTo, label?, color?, fill?, fillOpacity?, strokeDash? }
//   annotationLabelHeight — px reserved above the chart for vertical labels (default: 22);
//                   an explicit margin.top wins over the reserve
//
// The line takes theme.accent and theme.strokeWidth. setData and appendPoint
// keep the view: a selected timeframe re-applies to the new data, a window
// the data no longer reaches falls back to the default view.

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';
import { renderGrid, renderAxisX, dayTicks, renderAxisYRight, renderAnnotations, applySvgA11y } from '../core/renderHelpers.js';
import { normalizeAnnotations, logTickValues, logPaddedDomain, byDate, spanTimeFormat, spanTimeFormatter } from '../core/utils.js';
import { normalizePoints } from '../core/seriesPath.js';
import { escapeHtml, tipHeader } from '../core/html.js';

export class TimeSeries extends Chart {
  constructor(selector, options = {}) {
    const annotations    = normalizeAnnotations(options.annotations);
    const annLabelHeight = options.annotationLabelHeight ?? 22;
    const annTopReserve  = annotations.length ? annLabelHeight + 4 : 0;
    const { margin: _margin, ...restOptions } = options;

    // A hidden axis collapses its margin so the plot runs flush; annotations
    // raise the top for their labels. An explicit margin always wins.
    super(selector, {
      height: 340,
      margin: {
        top:    options.margin?.top    ?? Math.max(16, annTopReserve),
        right:  options.margin?.right  ?? (options.showYAxis === false ? 0 : 70),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 28),
        left:   options.margin?.left   ?? 0,
      },
      ...restOptions,
    });

    this._data           = [];
    this._viewExtent     = null;
    this._onViewChangeCb = null;
    this._tooltip        = new Tooltip(this.container, this.theme);
    this._annotations    = annotations;
    this._annLabelHeight = annLabelHeight;

    this._initSVG();
    this._bindZoomPan();
    this._bindHover();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setData(data) {
    // Extra fields (open, volume…) are kept for tooltipFormat (C-06).
    this._data       = normalizePoints(data, { keep: true });
    this._warnedNonPositive = false;
    // As on every time chart (T-03): a selected timeframe re-applies to the
    // new data, a window the data no longer reaches falls back.
    this._refreshViewForData();
    this.render();
    return this;
  }

  // Switch the Y scale between 'linear' and 'log' and redraw. Fires
  // onScaleChange unless { silent: true }.
  setYScale(type, { silent = false } = {}) {
    const scale = type === 'log' ? 'log' : 'linear';
    this.options.yScale = scale;
    this.render();
    this._scaleChanged(scale, 'y', silent);
    return this;
  }

  _isLogScale() {
    return this.options.yScale === 'log';
  }

  // Add one point (normalized like setData) and redraw. The chart keeps its
  // own copy of the data, so the array passed to setData is never touched.
  // A selected timeframe moves with the new point.
  appendPoint(point) {
    const [p] = normalizePoints([point], { keep: true });
    if (!p) return this;
    this._data = this._data.concat(p).sort(byDate);
    this._refreshViewForData();
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
    applySvgA11y(this.svg, this.options);

    const { top, left } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    // Clip path — keep the line inside the plot area while zooming
    const clipId = `${this._uid}-clip`;
    this.clipRect = this.svg.append('defs').append('clipPath')
      .attr('id', clipId).append('rect');
    this.clipId = clipId;

    this.gGrid        = this.g.append('g').attr('class', 'rc-grid');
    this.gArea        = this.g.append('g').attr('clip-path', `url(#${clipId})`);
    this.gPaths       = this.gArea.append('g');
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations');
    this.gAxisX       = this.g.append('g').attr('class', 'rc-axis');
    this.gAxisY       = this.g.append('g').attr('class', 'rc-axis');

    // Crosshair: vertical (X) + horizontal (Y)
    this.crossX = this.g.append('line').style('opacity', 0);
    this.crossY = this.g.append('line').style('opacity', 0);

    this.overlay = this.g.append('rect').attr('fill', 'none').attr('pointer-events', 'all');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _dataLayers() {
    return [this.gGrid, this.gPaths, this.gAnnotations, this.gAxisX, this.gAxisY];
  }

  _renderEmpty() {
    this._visible = [];          // the hover reads it: no old points under the cursor
    this.crossX?.style('opacity', 0);
    this.crossY?.style('opacity', 0);
    super._renderEmpty();
  }

  render() {
    if (!this._data.length) { this._renderEmpty(); return; }
    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;

    this.clipRect.attr('width', W).attr('height', H + 4).attr('y', -4);
    this.overlay.attr('width', W).attr('height', H);

    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);
    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();
    this._syncZoomToView(fullExtent, viewExtent, W);

    // A log scale has no place for zero or negatives: such points are skipped
    // (the line joins its neighbours) instead of drawing NaN.
    const isLog = this.options.yScale === 'log';
    const inView = this._data.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]);
    const visible = isLog ? inView.filter(d => d.value > 0) : inView;
    if (isLog && visible.length < inView.length && !this._warnedNonPositive) {
      this._warnedNonPositive = true;
      const n = inView.length - visible.length;
      console.warn(`RareCharts.TimeSeries: ${n} value${n === 1 ? '' : 's'} ≤ 0 skipped on the log scale`);
    }
    this._visible = visible;
    if (!visible.length) { this._renderEmpty(); return; }

    const yTicks = this.options.yTicks ?? 5;
    this.xScale = d3.scaleTime().domain(viewExtent).range([0, W]);
    let yTickValues = this.options.yTickValues ?? null;
    if (isLog) {
      let [lo, hi] = logPaddedDomain(d3.min(visible, d => d.value), d3.max(visible, d => d.value));
      yTickValues = yTickValues ? yTickValues.filter(v => v > 0) : null;
      if (yTickValues?.length) {
        lo = Math.min(lo, d3.min(yTickValues));
        hi = Math.max(hi, d3.max(yTickValues));
      } else {
        yTickValues = logTickValues(lo, hi, yTicks);
      }
      this.yScale = d3.scaleLog().domain([lo, hi]).range([H, 0]);
    } else {
      let yMin = d3.min(visible, d => d.value) * 0.99;
      let yMax = d3.max(visible, d => d.value) * 1.01;
      // explicit ticks widen the range, as on Line — none is drawn off the plot
      if (yTickValues?.length) {
        yMin = Math.min(yMin, d3.min(yTickValues));
        yMax = Math.max(yMax, d3.max(yTickValues));
      }
      this.yScale = d3.scaleLinear().domain([yMin, yMax]).range([H, 0]);
    }

    // Grid
    if (this.options.showGrid ?? true) {
      renderGrid(this.gGrid, this.yScale, W, yTicks, t, yTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

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
        // Gradient — area: true (default). The id is this chart's own (C-04);
        // the old name rc-ts-grad stays as the class it is found by.
        const gradId = `${this._uid}-ts-grad`;
        let grad = this.svg.select('.rc-ts-grad');
        if (grad.empty()) {
          grad = this.svg.select('defs').append('linearGradient')
            .attr('id', gradId)
            .attr('class', 'rc-ts-grad')
            .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
          grad.append('stop').attr('offset', '0%').attr('stop-opacity', 0.22);
          grad.append('stop').attr('offset', '100%').attr('stop-opacity', 0);
        }
        grad.selectAll('stop').attr('stop-color', areaColor);

        this.gPaths.selectAll('.rc-ts-area').data([visible]).join('path')
          .attr('class', 'rc-ts-area')
          .attr('d', area)
          .attr('fill', `url(#${gradId})`)
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
    if (this.options.showXAxis ?? true) {
      // The default follows the span in view (C-31): '%b' alone repeated a
      // month on a 1M view ("Sep Oct Oct Oct") and dropped the year on a long
      // one. A day-labelled view of a few days gets at most one tick per
      // midnight, as on Line. A page's own xTickFormat keeps d3's ticks.
      const own  = this.options.xTickFormat;
      const spec = own ? null : spanTimeFormat(viewExtent);
      const xTickFormat = own ?? spanTimeFormatter(viewExtent);
      const xTicks = spec === '%b %d' ? (dayTicks(viewExtent, 6) ?? 6) : 6;
      renderAxisX(this.gAxisX, this.xScale, H, xTickFormat, t, xTicks);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    // Y axis
    if (this.options.showYAxis ?? true) {
      const yTickFormat = this.options.yTickFormat ?? (v => '$' + d3.format(',.0f')(v));
      renderAxisYRight(
        this.gAxisY,
        this.yScale,
        W,
        yTicks,
        yTickFormat,
        (this.options.yLabelsOnly ?? true),
        t,
        yTickValues
      );
    } else {
      this.gAxisY.selectAll('*').remove();
    }

    // Annotations — levels outside the value range (on a log scale: at or
    // below zero) are skipped by renderAnnotations itself.
    renderAnnotations(
      this.gAnnotations, this._annotations, this.xScale,
      () => this.yScale,
      H, this._annLabelHeight, t
    );

    // Crosshair styling — from theme, no hardcoded values
    [this.crossX, this.crossY].forEach(l =>
      l.attr('stroke', t.crosshair)
       .attr('stroke-width', 1)
       .attr('stroke-dasharray', '3 3')
    );
  }

  // ── Zoom & Pan ────────────────────────────────────────────────────────────

  // The wheel/drag zoom is measured against the full extent: after a view
  // set elsewhere (a button, the brush, setView, setData) put its transform
  // where that view is, so the next wheel step starts from the window on
  // screen instead of jumping back towards the whole range.
  _syncZoomToView(full, view, W) {
    if (!this._zoom || !full || !view || W <= 0) return;
    const span = +full[1] - +full[0], vspan = +view[1] - +view[0];
    if (!(span > 0) || !(vspan > 0)) return;
    const k = span / vspan;
    const xFull = d3.scaleTime().domain(full).range([0, W]);
    this.svg.property('__zoom', d3.zoomIdentity.translate(-k * xFull(view[0]), 0).scale(k));
  }

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

        // a view change like any other: the timeframe selection clears, the
        // buttons and the navigator follow, onViewChange reports it
        this.setView(extent);
      });

    this.svg.call(this._zoom);
  }

  // ── Hover / Crosshair ─────────────────────────────────────────────────────

  _bindHover() {
    this.overlay
      .on('mousemove', (event) => {
        // crosshair: false — no lines and no tooltip, as on Line and DualAxes
        if (!(this.options.crosshair ?? true)) return;
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

        // The row first, as before; the role fields second (K-09).
        const html = this.options.tooltipFormat
          ? this.options.tooltipFormat(d, { date: d.date, value: d.value, color: this.theme.accent })
          : this._defaultTooltip(d);

        // The tooltip lives in the card, below the header and range row: map
        // the snapped point from plot to container coordinates (the same
        // frame d3.pointer(event, container) gives every other chart).
        const svgBox  = this.svg.node().getBoundingClientRect();
        const cardBox = this.container.getBoundingClientRect();
        const dx = svgBox.left - cardBox.left - this.container.clientLeft;
        const dy = svgBox.top - cardBox.top - this.container.clientTop;
        this._tooltip.show(cx + this.margin.left + dx, cy + this.margin.top + dy, html);
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
    // the date header as in Crosshair: 13px, muted, no gap (B-03)
    return `
      ${tipHeader(date, { muted: true })}
      <div class="rc-tooltip-value" style="color:${escapeHtml(t.accent)}">
        ${typeof d.value === 'number' ? '$' + d3.format(',.2f')(d.value) : escapeHtml(d.value)}
      </div>
    `;
  }
}

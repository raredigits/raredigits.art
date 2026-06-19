// RareCharts — Line
// Multi-series line chart with crosshair.
//
// Data formats supported:
// 1) Single series: [{ date: Date|string|number, value: number }, ...]
// 2) Multi series:  [{ name, color?, values: [{ date, value }, ...] }, ...]
// 3) Band series:   [{ name, type:'band', color?, fillOpacity?,
//                      values: [{ date, lower, upper }, ...] }, ...]
//                    A filled ribbon between lower/upper at each x — for
//                    confidence intervals (P10–P90 cones), min/max envelopes,
//                    error bands. Rendered behind lines; excluded from the
//                    crosshair, end labels, and markers. Mixes freely with
//                    line series in the same dataset.
//
// Options:
//   height         — chart height (default: 240)
//   margin         — {top,right,bottom,left}
//   animate        — animate on first render (default: true)
//   duration       — ms (default: 650)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   yTickFormat    — function(value) => string
//   xTickFormat    — function(date) => string
//   yTicks         — number of ticks (default: 4)
//   yFormat        — 'auto' (default) | 'percent' | 'number'
//   zeroEpsilon    — treat |v| < epsilon as zero (default: 1e-6)
//   yPrefix / ySuffix
//
//   yLabelsOnly    — show only Y tick labels (default: true)
//   showGrid       — show grid lines (default: true)
//   showXAxis      — show X axis (default: true)
//   showYAxis      — show Y axis (default: true)
//   endLabels      — show last value labels on the right (default: true)
//
//   crosshair      — enable crosshair + dots + tooltip (default: true)
//   tooltipFormat  — function({date, points:[{name,value,color}]}) => html
//
//   annotations    — event markers. Vertical (point/range) and horizontal (line/band).
//                    point:  { date, label?, color?, strokeDash?, labelColor? }
//                    range:  { from, to, label?, color?, fill?, fillOpacity?, strokeDash? }
//                    hPoint: { value, label?, color?, strokeDash?, labelPosition? }
//                    hRange: { yFrom, yTo, label?, color?, fill?, fillOpacity?, strokeDash? }
//   annotationLabelHeight — px reserved above the chart for vertical labels (default: 22)
//
//   curve          — 'linear'|'monotone'|'basis'|'cardinal'|'step'|... (default: 'monotone')
//   curveTension   — 0..1 for 'cardinal' (default: 0)
//   area           — fill area under line(s) (default: false)
//   areaOpacity    — default area opacity (default: 0.12)
//   areaBaseline   — 'zero'|'min'|number (default: 'zero')
//
// Per-series overrides (multi-series only):
//   series.curve, series.strokeWidth, series.strokeDash,
//   series.area, series.areaOpacity, series.areaBaseline
//   series.type ('band'), series.fillOpacity (band)

import * as d3 from 'd3';
import { Chart }             from '../core/Chart.js';
import { Tooltip }           from '../core/Tooltip.js';
import { Crosshair }         from '../core/Crosshair.js';
import { parseDate, resolveEase, resolveStrokeDash, niceTickValues, normalizeAnnotations, motionDuration } from '../core/utils.js';
import { linePath, areaPath, bandPath } from '../core/seriesPath.js';
import {
  applySvgA11y,
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  renderAxisYRight,
  renderAxisYLeft,
  renderEndLabels,
  animateLines,
  renderMarkers,
  renderAnnotations,
} from '../core/renderHelpers.js';

export class Line extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;
    const annotations    = normalizeAnnotations(options.annotations);
    const annLabelHeight = options.annotationLabelHeight ?? 22;
    const annTopReserve  = annotations.length ? annLabelHeight + 4 : 0;

    super(selector, {
      height: 240,
      margin: {
        top:    options.margin?.top    ?? Math.max(10, annTopReserve),
        bottom: options.margin?.bottom ?? 18,
        right:  options.margin?.right  ?? (options.yAxisPosition === 'left' ? 0 : 64),
        left:   options.margin?.left   ?? (options.yAxisPosition === 'left' ? 64 : 0),
      },
      ...restOptions,
    });

    this._series          = [];
    this._didAnimateIn    = false;
    this._annotations     = annotations;
    this._annLabelHeight  = annLabelHeight;

    const tooltip = new Tooltip(this.container, this.theme);
    this._initSVG(tooltip);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data) {
    this._series = this._normalizeData(data);
    this._syncTimeframeButtons(this._getDataExtent());
    this.render();
    return this;
  }

  _getDataExtent() {
    const all = this._series.flatMap(s => s.values);
    return all.length ? d3.extent(all, d => d.date) : null;
  }

  _getNavigatorData() {
    const lineSeries = this._series.find(s => s.type !== 'band');
    const source = (lineSeries ?? this._series[0])?.values ?? [];
    return source.length ? source : null;
  }

  _normalizeData(data) {
    if (!data) return [];

    // Single-series shorthand: [{date, value}, ...]
    if (Array.isArray(data) && data[0] && 'date' in data[0] && 'value' in data[0]) {
      return [{
        name:   this.options.seriesName ?? 'Series',
        color:  this.options.lineColor  ?? this.theme.accent,
        type:   'line',
        values: data
          .map(d => ({ date: parseDate(d.date), value: +d.value }))
          .filter(d => d.date && Number.isFinite(d.value)),
      }];
    }

    // Multi-series
    return (Array.isArray(data) ? data : [])
      .map((s, idx) => {
        const color = s.color ?? (this.theme.colors?.[idx % (this.theme.colors?.length || 1)] ?? this.theme.accent);

        // Band (ribbon) series: { type:'band', values:[{date, lower, upper}] }
        const isBand = s.type === 'band' ||
                       (s.values?.[0] && 'lower' in s.values[0] && 'upper' in s.values[0]);
        if (isBand) {
          return {
            name:        s.name ?? `Series ${idx + 1}`,
            color,
            type:        'band',
            curve:       s.curve,
            fillOpacity: s.fillOpacity ?? s.areaOpacity,
            values: (s.values ?? [])
              .map(d => ({ date: parseDate(d.date), lower: +d.lower, upper: +d.upper }))
              .filter(d => d.date && Number.isFinite(d.lower) && Number.isFinite(d.upper)),
          };
        }

        return {
          name:         s.name   ?? `Series ${idx + 1}`,
          color,
          type:         'line',
          curve:        s.curve,
          strokeDash:   s.strokeDash,
          area:         s.area,
          areaOpacity:  s.areaOpacity,
          areaBaseline: s.areaBaseline,
          strokeWidth:  Number.isFinite(+s.strokeWidth) ? +s.strokeWidth : 2,
          values: (s.values ?? [])
            .map(d => ({ date: parseDate(d.date), value: +d.value }))
            .filter(d => d.date && Number.isFinite(d.value)),
        };
      })
      .filter(s => s.values.length);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG(tooltip) {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');
    applySvgA11y(this.svg, this.options);

    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    this.gGrid  = this.g.append('g').attr('class', 'rc-grid');
    this.gBands = this.g.append('g').attr('class', 'rc-bands');
    this.gLines = this.g.append('g').attr('class', 'rc-lines');
    this.gAxisX = this.g.append('g').attr('class', 'rc-axis rc-axis-x');
    this.gAxisY = this.g.append('g').attr('class', 'rc-axis rc-axis-y');
    this.gEnds    = this.g.append('g').attr('class', 'rc-end-labels');
    this.gMarkers = this.g.append('g').attr('class', 'rc-markers');
    this.gZero  = this.g.append('g').attr('class', 'rc-zero-layer');
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations');

    const gCross  = this.g.append('g').attr('class', 'rc-crosshair');
    const overlay = this.g.append('rect')
      .attr('class', 'rc-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    this._crosshair = new Crosshair(gCross, overlay, tooltip, this.theme);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._series.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;
    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);
    const visibleSeries = this._series
      .map(s => ({ ...s, values: s.values.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]) }))
      .filter(s => s.values.length);
    if (!visibleSeries.length) return;

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation
    const animate  = (o.animate ?? true) && !this._didAnimateIn;
    const duration = motionDuration(o.duration ?? 650);
    const ease     = resolveEase(o.ease ?? 'cubicOut');

    // Split line vs band series — bands render behind lines and are excluded
    // from the crosshair, end labels, and markers.
    const lineSeries = visibleSeries.filter(s => s.type !== 'band');
    const bandSeries = visibleSeries.filter(s => s.type === 'band');

    // Per-series Y values (band contributes both its lower and upper bounds).
    const yValuesOf = s => s.type === 'band'
      ? s.values.flatMap(d => [d.lower, d.upper])
      : s.values.map(d => d.value);

    // Scales
    const xPad = 8;
    const x    = d3.scaleTime()
      .domain(viewExtent)
      .range([xPad, W - xPad]);

    // Formatters
    const yTicks   = o.yTicks ?? 4;

    const allY = visibleSeries.flatMap(yValuesOf);
    const maxY = d3.max(allY);
    const minY = d3.min(allY);
    const pad  = (maxY - minY) * 0.08 || 1;

    // Compute ticks from the raw padded range — no .nice() to avoid double-expansion.
    // Domain top = max(rawHi, last tick) so ticks never overshoot the chart area.
    const resolvedYTickValues = o.yTickValues ?? niceTickValues(minY - pad, maxY + pad, yTicks);
    const y    = d3.scaleLinear()
      .domain([minY - pad, Math.max(maxY + pad, resolvedYTickValues[resolvedYTickValues.length - 1])])
      .range([H, 0]);
    const absMax   = d3.max(allY, v => Math.abs(v)) ?? 0;
    const usePercent = (o.yFormat ?? 'auto') === 'percent' ||
                       ((o.yFormat ?? 'auto') === 'auto' && absMax <= 1);

    const prefix  = o.yPrefix ?? '';
    const suffix  = o.ySuffix ?? '';
    const zeroEps = o.zeroEpsilon ?? 1e-6;
    const baseY   = usePercent ? d3.format('+.2%') : d3.format('.2s');

    const yTickFormat = o.yTickFormat ?? (v => {
      if (Math.abs(v) < zeroEps) return `${prefix}${usePercent && !suffix ? '0%' : '0'}${suffix}`;
      return `${prefix}${baseY(v)}${suffix}`;
    });

    const xTickFormat = o.xTickFormat ?? (d => d3.timeFormat('%m/%d')(d));

    // Curve / area options
    const defaultCurve    = o.curve          ?? 'monotone';
    const tension         = o.curveTension   ?? 0;
    const globalArea      = o.area           ?? false;
    const globalAreaOp    = o.areaOpacity    ?? 0.12;
    const globalAreaBase  = o.areaBaseline   ?? 'zero';
    const globalDash      = o.strokeDash    ?? null;
    const globalMarkers   = o.markers       ?? false;
    const globalShape     = o.markerShape   ?? 'circle';
    const globalSize      = o.markerSize    ?? 4;

    // ── Render helpers ──
    if (o.showGrid ?? true) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    renderZeroBaseline(this.gZero, y, W, t);

    if (o.showXAxis ?? true) {
      renderAxisX(this.gAxisX, x, H, xTickFormat, t, o.xTicks ?? 6);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    if (o.showYAxis ?? true) {
      if ((o.yAxisPosition ?? 'right') === 'left') {
        renderAxisYLeft(this.gAxisY, y, yTicks, yTickFormat, o.yLabelsOnly ?? true, t, resolvedYTickValues);
      } else {
        renderAxisYRight(this.gAxisY, y, W, yTicks, yTickFormat, o.yLabelsOnly ?? true, t, resolvedYTickValues);
      }
    } else {
      this.gAxisY.selectAll('*').remove();
    }

    // Bands (confidence ribbons) — drawn behind everything else.
    this.gBands.selectAll('.rc-band')
      .data(bandSeries, s => s.name)
      .join('path')
      .attr('class', 'rc-band')
      .attr('d', s => bandPath(s, x, y, defaultCurve, tension))
      .attr('fill',    s => s.color)
      .attr('opacity', s => s.fillOpacity ?? globalAreaOp);

    // Areas
    const areaSeries = lineSeries.filter(s => (s.area ?? globalArea) === true);
    this.gLines.selectAll('.rc-line-area')
      .data(areaSeries, s => s.name)
      .join('path')
      .attr('class', 'rc-line-area')
      .attr('d', s => areaPath(s, x, y, defaultCurve, globalAreaBase, tension))
      .attr('fill',    s => s.color)
      .attr('opacity', s => s.areaOpacity ?? globalAreaOp);

    // Lines
    const paths = this.gLines.selectAll('.rc-line')
      .data(lineSeries, s => s.name)
      .join('path')
      .attr('class', 'rc-line')
      .attr('fill', 'none')
      .attr('stroke',       s => s.color)
      .attr('stroke-width',   s => s.strokeWidth ?? 2)
      .attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
      .attr('d', s => linePath(s, x, y, defaultCurve, tension));

    if (animate) {
      // Lines with a dash pattern cannot use the draw-animation trick
      // (both use stroke-dasharray and conflict). Animate solid lines only;
      // dashed/dotted lines appear instantly with their real pattern.
      const solidPaths = paths.filter(s => !resolveStrokeDash(s.strokeDash ?? globalDash));
      const dashedPaths = paths.filter(s =>  resolveStrokeDash(s.strokeDash ?? globalDash));

      dashedPaths.attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
                 .attr('stroke-dashoffset', null);

      animateLines(solidPaths, duration, ease, () => { this._didAnimateIn = true; });

      // If there are no solid paths, mark animation done immediately
      if (solidPaths.empty()) this._didAnimateIn = true;
    } else {
      paths.attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
           .attr('stroke-dashoffset', null);
      this._didAnimateIn = true;
    }

    // End labels
    if (o.endLabels ?? true) {
      renderEndLabels(this.gEnds, lineSeries, y, W, yTickFormat, t);
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // Markers
    renderMarkers(this.gMarkers, lineSeries, x, () => y, globalMarkers, globalShape, globalSize, t);

    // Annotations
    renderAnnotations(this.gAnnotations, this._annotations, x, () => y, H, this._annLabelHeight, t);

    // Crosshair
    this._crosshair.bind({
      W, H, x,
      series:     [...lineSeries, ...bandSeries],
      enabled:    o.crosshair ?? true,
      scaleFor:   () => y,
      formatFor:  (_s, v) => yTickFormat(v),
      tooltipFmt: o.tooltipFormat,
    });
  }
}

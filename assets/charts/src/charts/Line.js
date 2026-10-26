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
//                    error bands. Drawn behind lines; reported in the
//                    crosshair tooltip as a range (no dot); skipped by end
//                    labels and markers. Mixes freely with line series in
//                    the same dataset.
//
// Options:
//   height         — chart height (default: 240)
//   margin         — {top,right,bottom,left}
//   animate        — draw the lines in on first render, once per instance (default:
//                    true); renders that land in the middle (fonts, resize) carry
//                    the draw-in on to the new geometry
//   duration       — ms (default: 650)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   yTickFormat    — function(value) => string; also formats end labels and the
//                    tooltip. Default: ticks by their step ('~s' from 1000, ',~f'
//                    below, 0 as '0'), values to 3 significant digits ('.3~r' /
//                    '.3~s'); percent '+.2%'; log ticks '.3~s'
//   xTickFormat    — function(date) => string
//   yScale         — 'linear' (default) | 'log'. Log: powers-of-ten ticks, the
//                    margin above/below is a factor of the data's span, values
//                    ≤ 0 are skipped (warned once per setData). Switch between
//                    data swaps with setYScale(): chart.setYScale('log').setData(all)
//   scaleToggle    — a Lin/Log button, top right of the header above the Y labels
//                    (true | { labels: { linear, log } }); onScaleChange(fn)
//                    gets { scale, axis: 'y' } on every switch
//   yTicks         — approximate number of ticks (default: 4); linear ticks stay
//                    inside the padded data range, so the count follows the step
//   yTickValues    — explicit Y tick positions (overrides yTicks)
//   xTicks         — number of X ticks (default: 6); with the default date
//                    format, no more than the whole days in view
//   yFormat        — 'auto' (default) | 'percent' | 'number'
//   zeroEpsilon    — treat |v| < epsilon as zero (default: 1e-6)
//   yPrefix / ySuffix
//   yAxisPosition  — 'right' (default) | 'left'; the default margins follow the side
//                    (end labels keep a right-hand gutter either way)
//
//   yLabelsOnly    — show only Y tick labels (default: true)
//   showGrid       — show grid lines (default: true)
//   showXAxis      — show X axis (default: true; hiding it also reclaims the bottom margin)
//   showYAxis      — show Y axis (default: true; hiding it reclaims the side margin
//                    once endLabels is off too — they share the same gutter)
//   endLabels      — show last value labels on the right (default: true)
//
//   crosshair      — enable crosshair + dots + tooltip (default: true)
//   tooltipFormat  — function({ date, points }) => html; points is
//                    [{ name, series, type, color, date, value, fmt }], one
//                    per series covering the hovered date (a band: lower and
//                    upper, no value). Formatter arguments: one rule for every
//                    class (K-09), /charts/settings/#formatter-arguments
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
//   strokeDash     — dash pattern for all lines: 'dashed'|'dotted'|'dashDot'|'longDash'
//                    or a raw dash-array string like '4,3' (default: solid)
//   markers        — draw point markers on lines (default: false)
//   markerShape    — 'circle'|'square'|'diamond'|'triangle'|'cross' (default: 'circle')
//   markerSize     — marker radius / half-size px (default: theme.markerSize, 4)
//
// Single-series shorthand only:
//   seriesName     — series name shown in the crosshair tooltip (default: 'Series')
//   lineColor      — line color (default: theme.accent)
//
// Per-series overrides (multi-series only):
//   series.curve, series.strokeWidth (default: theme.strokeWidth, 2), series.strokeDash,
//   series.area, series.areaOpacity, series.areaBaseline,
//   series.markers, series.markerShape, series.markerSize,
//   series.markerFill, series.markerStroke
//   series.type ('band'), series.fillOpacity (band)

import * as d3 from 'd3';
import { Chart }             from '../core/Chart.js';
import { Tooltip }           from '../core/Tooltip.js';
import { Crosshair }         from '../core/Crosshair.js';
import { resolveEase, resolveStrokeDash, linearTickValues, logTickValues, logPaddedDomain, normalizeAnnotations, motionDuration, compactTickFormat, compactValue } from '../core/utils.js';
import { EntryMotion, drawLinesIn } from '../core/entryMotion.js';
import { linePath, areaPath, bandPath, normalizeLineSeries } from '../core/seriesPath.js';
import {
  applySvgA11y,
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  dayTicks,
  renderAxisYRight,
  renderAxisYLeft,
  renderEndLabels,
  renderMarkers,
  renderAnnotations,
} from '../core/renderHelpers.js';

export class Line extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;
    const annotations    = normalizeAnnotations(options.annotations);
    const annLabelHeight = options.annotationLabelHeight ?? 22;
    const annTopReserve  = annotations.length ? annLabelHeight + 4 : 0;

    // Margin defaults track what occupies each gutter: end labels always sit
    // on the right, Y-axis labels on their own side, X-axis labels at the
    // bottom. Hiding all of a gutter's occupants collapses it so the plot runs
    // flush; an explicit margin always wins.
    const yLeft     = options.yAxisPosition === 'left';
    const yGutter   = options.showYAxis !== false;
    const endGutter = options.endLabels  !== false;

    super(selector, {
      height: 240,
      margin: {
        top:    options.margin?.top    ?? Math.max(10, annTopReserve),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 18),
        right:  options.margin?.right  ?? ((yLeft ? endGutter : (yGutter || endGutter)) ? 64 : 0),
        left:   options.margin?.left   ?? (yLeft && yGutter ? 64 : 0),
      },
      ...restOptions,
    });

    this._series          = [];
    this._entry           = new EntryMotion();   // draw-in once per instance (C-16)
    this._annotations     = annotations;
    this._annLabelHeight  = annLabelHeight;

    const tooltip = new Tooltip(this.container, this.theme);
    this._initSVG(tooltip);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(data) {
    this._series = this._normalizeData(data);
    this._warnedNonPositive = false;
    this._refreshViewForData();
    this.render();
    return this;
  }

  // Switch the Y scale between 'linear' and 'log' and redraw. Chained before
  // setData(), both run in the same tick — one paint with the new scale and data.
  // Fires onScaleChange unless { silent: true }.
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

  _getDataExtent() {
    const all = this._series.flatMap(s => s.values);
    return all.length ? d3.extent(all, d => d.date) : null;
  }

  _getNavigatorData() {
    const lineSeries = this._series.find(s => s.type !== 'band');
    const source = (lineSeries ?? this._series[0])?.values ?? [];
    return source.length ? source : null;
  }

  // One normaliser with DualAxes (C-03): every per-series style field reaches
  // render; values are parsed, sorted, and unreadable rows dropped.
  _normalizeData(data) {
    if (!Array.isArray(data)) return [];
    const isRow  = v => v != null && typeof v === 'object';
    const colors = this.theme.colors ?? [];

    // Single-series shorthand: [{date, value}, ...]. The shape is read from
    // the first row, not from data[0]: a leading null (or a point without a
    // value) must not turn the points into series and lose them all.
    const firstRow = data.find(isRow);
    if (firstRow && 'date' in firstRow && !('values' in firstRow)) {
      const s = normalizeLineSeries({
        name:   this.options.seriesName ?? 'Series',
        color:  this.options.lineColor  ?? this.theme.accent,
        values: data,
      }, 0);
      return s.values.length ? [s] : [];
    }

    // Multi-series. Mapped before filtering, so default names and palette
    // slots keep the input index.
    return data
      .map((s, idx) => {
        if (!isRow(s)) return null;
        // Band (ribbon) series: { type:'band', values:[{date, lower, upper}] }
        const first  = (Array.isArray(s.values) ? s.values : []).find(isRow);
        const isBand = s.type === 'band' || (isRow(first) && 'lower' in first && 'upper' in first);
        return normalizeLineSeries(s, idx, {
          color: colors[idx % (colors.length || 1)] ?? this.theme.accent,
          type:  isBand ? 'band' : 'line',
        });
      })
      .filter(s => s?.values.length);
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

  _dataLayers() {
    return [this.gGrid, this.gBands, this.gLines, this.gAxisX, this.gAxisY,
      this.gEnds, this.gMarkers, this.gZero, this.gAnnotations];
  }

  render() {
    if (!this._series.length) { this._renderEmpty(); return; }

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;
    const isLog = o.yScale === 'log';
    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);

    // A log scale has no place for zero or negatives: such points are skipped
    // (the line joins its neighbours) instead of drawing NaN.
    let skipped = 0;
    const positive = d => {
      const ok = 'lower' in d ? d.lower > 0 && d.upper > 0 : d.value > 0;
      if (!ok) skipped++;
      return ok;
    };
    const visibleSeries = this._series
      .map(s => ({ ...s, values: s.values.filter(d =>
        d.date >= viewExtent[0] && d.date <= viewExtent[1] && (!isLog || positive(d))) }))
      .filter(s => s.values.length);
    if (skipped && !this._warnedNonPositive) {
      this._warnedNonPositive = true;
      console.warn(`RareCharts.Line: ${skipped} value${skipped === 1 ? '' : 's'} ≤ 0 skipped on the log scale`);
    }
    if (!visibleSeries.length) { this._renderEmpty(); return; }

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation — one draw-in per instance; a render in the middle of it
    // (fonts.ready, the first resize) carries it on (C-16).
    const duration = motionDuration(o.duration ?? 650);
    const phase    = this._entry.phase((o.animate ?? true) ? duration : 0);
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

    // Padded data range: 8% of the span on a linear scale, the same share of
    // the log span (a factor) on a log scale. Ticks are picked inside it — no
    // .nice() — and only explicit yTickValues may widen the domain.
    let [lo, hi] = isLog
      ? logPaddedDomain(minY, maxY)
      : [minY - ((maxY - minY) * 0.08 || 1), maxY + ((maxY - minY) * 0.08 || 1)];
    let resolvedYTickValues;
    if (o.yTickValues) {
      resolvedYTickValues = isLog ? o.yTickValues.filter(v => v > 0) : o.yTickValues;
      if (resolvedYTickValues.length) {
        lo = Math.min(lo, d3.min(resolvedYTickValues));
        hi = Math.max(hi, d3.max(resolvedYTickValues));
      }
    } else {
      resolvedYTickValues = isLog ? logTickValues(lo, hi, yTicks) : linearTickValues(lo, hi, yTicks);
    }
    const y = (isLog ? d3.scaleLog() : d3.scaleLinear())
      .domain([lo, hi])
      .range([H, 0]);
    const absMax   = d3.max(allY, v => Math.abs(v)) ?? 0;
    const usePercent = (o.yFormat ?? 'auto') === 'percent' ||
                       ((o.yFormat ?? 'auto') === 'auto' && absMax <= 1);

    const prefix  = o.yPrefix ?? '';
    const suffix  = o.ySuffix ?? '';
    const zeroEps = o.zeroEpsilon ?? 1e-6;
    const dress   = base => v => (Math.abs(v) < zeroEps
      ? `${prefix}${usePercent && !suffix ? '0%' : '0'}${suffix}`
      : `${prefix}${base(v)}${suffix}`);
    // Default formats (C-30). Ticks: percent with a sign; log ticks are round
    // powers (1k, 10k); linear ticks by their step — '~s' from 1000, ',~f'
    // below — so neighbours never print alike (145 150 155, not 150 150 160).
    // End labels and the tooltip: three significant digits (147, −0.6, 1.23k).
    // An explicit yTickFormat formats all three, as before.
    const tickBase  = usePercent ? d3.format('+.2%')
      : isLog ? d3.format('.3~s') : compactTickFormat(resolvedYTickValues);
    const valueBase = usePercent ? d3.format('+.2%') : compactValue;
    const yTickFormat  = o.yTickFormat ?? dress(tickBase);
    const yValueFormat = o.yTickFormat ?? dress(valueBase);

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
    const globalSize      = o.markerSize    ?? t.markerSize ?? 4;

    // ── Render helpers ──
    if (o.showGrid ?? true) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    renderZeroBaseline(this.gZero, y, W, t);

    if (o.showXAxis ?? true) {
      // The default format names days: on a span of a few days more ticks
      // than whole days would repeat a date (12-hour steps) — cap the count.
      let xTicks = o.xTicks ?? 6;
      if (!o.xTickFormat && typeof xTicks === 'number') {
        xTicks = dayTicks(viewExtent, xTicks) ?? xTicks;   // one tick per midnight in view (as on DualAxes)
      }
      renderAxisX(this.gAxisX, x, H, xTickFormat, t, xTicks);
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
      .attr('stroke-width',   s => s.strokeWidth ?? t.strokeWidth ?? 2)
      .attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
      .attr('d', s => linePath(s, x, y, defaultCurve, tension));

    // Lines with a dash pattern cannot use the draw-in trick (both use
    // stroke-dasharray): they appear at once with their real pattern. Solid
    // lines draw in — from the start ('enter') or on from the share already
    // drawn ('resume'); 'none' shows them whole.
    const dashOf = s => resolveStrokeDash(s.strokeDash ?? globalDash);
    paths.filter(s => dashOf(s)).interrupt()
      .attr('stroke-dasharray', dashOf)
      .attr('stroke-dashoffset', null);
    drawLinesIn(paths.filter(s => !dashOf(s)),
      phase === 'none' ? null : this._entry.timing(0, duration, ease));

    // End labels
    if (o.endLabels ?? true) {
      renderEndLabels(this.gEnds, lineSeries, y, W, yValueFormat, t);
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // Markers
    renderMarkers(this.gMarkers, lineSeries, x, () => y, globalMarkers, globalShape, globalSize, t);

    // Annotations — levels outside the value range (on a log scale: at or
    // below zero) are skipped by renderAnnotations itself.
    renderAnnotations(this.gAnnotations, this._annotations, x, () => y, H, this._annLabelHeight, t);

    // Crosshair
    this._crosshair.bind({
      W, H, x,
      series:     [...lineSeries, ...bandSeries],
      enabled:    o.crosshair ?? true,
      scaleFor:   () => y,
      formatFor:  (_s, v) => yValueFormat(v),
      tooltipFmt: o.tooltipFormat,
    });
  }
}

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
//   xTickFormat    — function(date) => string. Default by the span in view,
//                    as on TimeSeries and Bar (K-10): ≤ 36 h '%H:%M', ≤ 92
//                    days '%b %d' (at most one tick per day), ≤ 366 days
//                    '%b', ≤ 5 years "%b '%y", longer '%Y'; it was '%m/%d'
//   timeZone       — 'local' (default) | 'UTC': the zone date strings without a
//                    zone are read in, timeframes cut in and the axis and
//                    tooltip name dates in; an instant stays that instant
//                    (the table: parseDate in core/utils.js, T-10)
//   timeframeAnchor / weekStart — the end the timeframes count back from
//                    ('dataEnd' default | 'now' | a date) and the first day
//                    of a week (Monday default), as on TimeSeries (RC-001)
//   yScale         — 'linear' (default) | 'log'. Log: powers-of-ten ticks, the
//                    margin above/below is a factor of the data's span, values
//                    ≤ 0 are skipped (warned once per setData). Switch between
//                    data swaps with setYScale(): chart.setYScale('log').setData(all)
//   scaleToggle    — a Log toggle, top right of the header above the Y labels
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
// The interactive legend (D-04; the header options legendInteractive,
// legendRescale and onLegendToggle are on the Settings page). A header legend
// item that names a series — its `series`, else `name`, else `label` —
// toggles that series; a band is a series too. A hidden series leaves the
// plot, the end labels, the markers, the crosshair and its tooltip, and the
// Y axis rescales to the series still shown (legendRescale: false keeps it on
// every series in view). The X axis, the view, the timeframes, the navigator,
// the annotations and the formats (auto percent) never follow the legend.
// Hiding every series leaves the axes and the grid with no marks.
//   setSeriesVisible(names | null) — show only these series (null: all); no
//                    event. Chain it after setData.
//
// Single-series shorthand only:
//   seriesName     — series name shown in the crosshair tooltip and named by
//                    the legend (default: 'Series')
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
import { Crosshair }         from '../core/Crosshair.js';
import { resolveEase, resolveStrokeDash, linearTickValues, logTickValues, logPaddedDomain, annotationRoom, motionDuration, compactTickFormat, compactValue, timeKit, spanTimeFormat, spanTimeFormatter } from '../core/utils.js';
import { EntryMotion, ENTRY_DURATION, sweepIn } from '../core/entryMotion.js';
import { bandPath, normalizeLineSeries, filterLogSeries } from '../core/seriesPath.js';
import {
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  dayTicks,
  renderAxisY,
  renderEndLabels,
  renderMarkers,
  renderAnnotations,
  drawLineSeries,
} from '../core/renderHelpers.js';

export class Line extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;
    const ann = annotationRoom(options);

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
        top:    options.margin?.top    ?? Math.max(10, ann.top),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 18),
        right:  options.margin?.right  ?? ((yLeft ? endGutter : (yGutter || endGutter)) ? 64 : 0),
        left:   options.margin?.left   ?? (yLeft && yGutter ? 64 : 0),
      },
      ...restOptions,
    });
    // the sides the page's own margin sets: those gutters stay as given (RC-060)
    this._pageMargin = options.margin ?? {};

    this._series          = [];
    this._entry           = new EntryMotion();   // draw-in once per instance (C-16)
    this._annotations     = ann.annotations;
    this._annLabelHeight  = ann.labelHeight;

    this._initSVG(this.tooltip);
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

  // ─── Legend ───────────────────────────────────────────────────────────────

  // Show only the named series (null: every series) and redraw. Names as in
  // the data; a band is a series too; a name not in the data is ignored. The
  // header legend follows. No onLegendToggle: a page that mirrors one chart's
  // legend into another from that event cannot loop. Chained after setData,
  // both run in one task — nothing paints in between.
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  // The series the legend toggles: every series in the data (bands too), in
  // data order, keyed by name.
  _legendSeries() {
    return (this._series ?? []).map(s => ({ key: s.name, color: s.color }));
  }

  // A visibility change drops the hover readout: its dots and tooltip rows
  // were placed for the series and the Y scale before it. The next pointer
  // move draws them again from what is shown.
  _unpinHidden() {
    this._crosshair?.hide();
  }

  _dataExtent() {
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
    const timeZone = this._zone();

    // Single-series shorthand: [{date, value}, ...]. The shape is read from
    // the first row, not from data[0]: a leading null (or a point without a
    // value) must not turn the points into series and lose them all.
    const firstRow = data.find(isRow);
    if (firstRow && 'date' in firstRow && !('values' in firstRow)) {
      const s = normalizeLineSeries({
        name:   this.options.seriesName ?? 'Series',
        color:  this.options.lineColor  ?? this.theme.accent,
        values: data,
      }, 0, { timeZone });
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
          timeZone,
        });
      })
      .filter(s => s?.values.length);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG(tooltip) {
    this._createPlot();

    this.gGrid  = this.g.append('g').attr('class', 'rc-grid');
    this.gBands = this.g.append('g').attr('class', 'rc-bands');
    this.gLines = this.g.append('g').attr('class', 'rc-lines');
    this.gAxisX = this.g.append('g').attr('class', 'rc-axis rc-axis-x');
    this.gAxisY = this.g.append('g').attr('class', 'rc-axis rc-axis-y');
    this.gEnds    = this.g.append('g').attr('class', 'rc-end-labels');
    this.gMarkers = this.g.append('g').attr('class', 'rc-markers');
    this.gZero  = this.g.append('g').attr('class', 'rc-zero-layer');
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations');

    this._crosshair = Crosshair.attach(this.g, tooltip, this.theme);
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
    const { series: inView, skipped } = filterLogSeries(this._series, viewExtent, () => isLog);
    this._warnLogSkips(skipped, 'Line');
    if (!inView.length) { this._renderEmpty(); return; }

    // The legend: `shown` are the series in view the legend has not hidden —
    // the marks, end labels, markers and crosshair read them. The Y domain
    // reads `scaleSet`: the shown series, or every series in view with
    // legendRescale: false, or when nothing is shown (the axes and grid stay,
    // with no marks). The formats read `inView`, so a toggle never flips the
    // auto percent.
    const shown = inView.filter(s => this._isShown(String(s.name)));
    const scaleSet = this._legendRescale() && shown.length ? shown : inView;

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation — one draw-in per instance; a render in the middle of it
    // (fonts.ready, the first resize) carries it on (C-16).
    const duration = motionDuration(o.duration ?? ENTRY_DURATION);
    const phase    = this._entry.phase((o.animate ?? true) ? duration : 0);
    const ease     = resolveEase(o.ease ?? 'cubicOut');

    // Split line vs band series — bands render behind lines and are excluded
    // from the crosshair, end labels, and markers.
    const lineSeries = shown.filter(s => s.type !== 'band');
    const bandSeries = shown.filter(s => s.type === 'band');

    // Per-series Y values (band contributes both its lower and upper bounds).
    const yValuesOf = s => s.type === 'band'
      ? s.values.flatMap(d => [d.lower, d.upper])
      : s.values.map(d => d.value);

    // Scales — the date scale is d3's local or UTC one: ticks fall on the
    // zone's days and months, and so do the default labels (T-10)
    const tz   = timeKit(this._zone());
    const xPad = 8;
    const x    = tz.scale()
      .domain(viewExtent)
      .range([xPad, W - xPad]);

    // Formatters
    const yTicks   = o.yTicks ?? 4;

    const allY = scaleSet.flatMap(yValuesOf);
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
    const viewY    = scaleSet === inView ? allY : inView.flatMap(yValuesOf);
    const absMax   = d3.max(viewY, v => Math.abs(v)) ?? 0;
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

    // The default follows the span in view (K-10), as on TimeSeries and Bar:
    // '%m/%d' named neither the month nor the year on a long view.
    const xSpec       = o.xTickFormat ? null : spanTimeFormat(viewExtent);
    const xTickFormat = o.xTickFormat ?? spanTimeFormatter(viewExtent, tz.zone);

    // Curve / area options
    const defaultCurve    = o.curve          ?? 'monotone';
    const tension         = o.curveTension   ?? 0;
    const globalAreaOp    = o.areaOpacity    ?? 0.12;
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
      // A day-labelled view: on a span of a few days more ticks than whole
      // days would repeat a date (12-hour steps) — cap the count.
      let xTicks = o.xTicks ?? 6;
      if (xSpec === '%b %d' && typeof xTicks === 'number') {
        xTicks = dayTicks(viewExtent, xTicks, tz.zone) ?? xTicks;   // one tick per midnight in view (as on DualAxes)
      }
      renderAxisX(this.gAxisX, x, H, xTickFormat, t, xTicks);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    if (o.showYAxis ?? true) {
      renderAxisY(this.gAxisY, y, {
        side: o.yAxisPosition ?? 'right', width: W, ticks: yTicks, tickValues: resolvedYTickValues,
        tickFormat: yTickFormat, labelsOnly: o.yLabelsOnly ?? true, theme: t,
      });
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

    // Areas, then lines. Solid lines draw in — from the start ('enter') or on
    // from the share already drawn ('resume'); 'none' shows them whole. A
    // dashed line or a band cannot draw in by its stroke: then the whole
    // drawing sweeps in, left to right, the solid lines with it.
    const timing = phase === 'none' ? null : this._entry.timing(0, duration, ease);
    const sweep  = !!timing && (bandSeries.length > 0
      || lineSeries.some(s => resolveStrokeDash(s.strokeDash ?? o.strokeDash ?? null)));
    drawLineSeries(this.gLines, lineSeries, {
      x, yFor: () => y, curve: defaultCurve, tension,
      area:         o.area         ?? false,
      areaOpacity:  globalAreaOp,
      areaBaseline: o.areaBaseline ?? 'zero',
      dash:         o.strokeDash   ?? null,
      width:        t.strokeWidth  ?? 2,
      classes:      { area: 'rc-line-area', line: 'rc-line' },
      timing:       sweep ? null : timing,
    });
    sweepIn(this.svg, [this.gBands, this.gLines, this.gMarkers], `${this._uid}-sweep`,
      { x: -8, y: -this.margin.top, width: W + 16, height: H + this.margin.top + this.margin.bottom },
      sweep ? timing : null);

    // End labels
    if (o.endLabels ?? true) {
      renderEndLabels(this.gEnds, lineSeries, y, W, yValueFormat, t, { axis: (o.showYAxis ?? true) ? this.gAxisY : null });
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // The value gutter takes the room its labels need (RC-060): the end
    // labels stand in the right one whichever side the axis is on
    const ySide = o.yAxisPosition ?? 'right';
    if (this._fitGutters(ySide === 'right' ? [[[this.gAxisY, this.gEnds], 'right']]
      : [[this.gAxisY, 'left'], [this.gEnds, 'right']])) return;

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
      timeZone:   tz.zone,
      dash:       o.strokeDash ?? null,
    });
  }
}

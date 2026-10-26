// RareCharts — DualAxes
// Dual-axis composite chart: mix line and bar series on two Y axes.
//
// Data format (multi-series):
// [
//   {
//     name:   string,
//     axis:   'y1' | 'y2',
//     type:   'line' | 'bar',
//     color:  string (optional),
//     values: [{ date: Date|string|number, value: number }, ...]
//   },
//   ...
// ]
//
// series.name is the tooltip label and the key that matches lines and bars
// across setData; no legend is built from series (pass `legend`).
//
// Per-series overrides (line series only):
//   series.curve, series.strokeWidth (default: theme.strokeWidth, 2),
//   series.strokeDash, series.area, series.areaOpacity, series.areaBaseline,
//   series.markers, series.markerShape, series.markerSize,
//   series.markerFill, series.markerStroke
// Per-series override (bar series only):
//   series.barWidth — px, overrides barWidth for this series
//
// Options:
//   height
//   margin          — { top, right, bottom, left }; defaults: top 10 (30 with
//                     y1Title/y2Title, annotationLabelHeight + 4 with
//                     annotations), right and left 64, bottom 18; a hidden
//                     axis collapses its side; each side set explicitly wins
//   navigator       — the strip draws the first line series (the first series
//                     when all are bars)
//   xPad            — gap between the plot edge and the outermost mark; with bars,
//                     the outer edge of the first/last bar (default: 8)
//   curve           — 'linear' (default) | 'monotone' | 'step' | ...
//   curveTension    — 0..1 for 'cardinal' (default: 0)
//   animate         — animate on first render, once per instance (default: true):
//                     lines draw in, bars grow; renders that land in the middle
//                     (fonts, resize) carry the motion on to the new geometry
//   duration        — ms (default: 650)
//   ease            — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   area            — fill area under line series (default: false)
//   areaOpacity     — area opacity (default: 0.12)
//   areaBaseline    — 'zero'|'min'|number (default: 'zero')
//   strokeDash      — dash pattern for all line series: preset name or dash-array (default: solid)
//   markers         — draw point markers on line series (default: false)
//   markerShape     — 'circle'|'square'|'diamond'|'triangle'|'cross' (default: 'circle')
//   markerSize      — marker radius / half-size px (default: theme.markerSize, 4)
//
//   y1Ticks/y2Ticks — approximate tick count (default: 4); the auto domain is
//                     rounded (d3 nice) to the same count
//   y1TickFormat    — function(value) => string (default: ',.2f'; log: '.3~s')
//   y2TickFormat    — function(value) => string (default: '+.2f', '0' near
//                     zero; log: '.3~s')
//   xTickFormat     — function(date) => string (default: '%m/%d', at most one
//                     tick per day of the view)
//   y1Domain / y2Domain — override auto domains (used as given; a log axis
//                     needs 0 < min < max)
//   y1Scale / y2Scale — 'linear' (default) | 'log', per axis. Log: powers-of-ten
//                     ticks, the margin above/below is a factor of the axis's
//                     data span, values ≤ 0 on that axis are skipped (warned once
//                     per setData), bars grow from the bottom of the axis.
//                     setYScale(type, { axis: 'y1' | 'y2' | 'both' }) switches
//   scaleToggle     — a Lin/Log button, top right of the header above the Y labels:
//                     true (= 'y1') | 'y2' | 'both' | { axis?, labels?: { linear, log } };
//                     onScaleChange(fn) gets { scale, axis } on every switch
//
//   y1LabelsOnly/y2LabelsOnly — labels only, no axis line (default: true)
//   showGrid        — show grid lines (default: true)
//   showXAxis       — show X axis (default: true; hiding it also reclaims the bottom margin)
//   showY1Axis      — show right Y1 axis (default: true; hiding it reclaims the right
//                     margin once endLabels is off and no y1Title is set — shared gutter)
//   showY2Axis      — show left Y2 axis (default: true; hiding it reclaims the left
//                     margin unless a y2Title is set)
//   endLabels       — last value of each line series on endLabelsAxis, at the
//                     right edge; bar series are not labelled (default: true)
//   endLabelsAxis   — whose line series get end labels, placed and formatted
//                     on that axis ('y1' default: Y2 series have none)
//
//   y1Title / y2Title — axis title labels (terse units; trimmed with an
//                     ellipsis if wider than their axis margin)
//   axisTitleMaxLength — optional hard character cap for axis titles
//
//   barOpacity      — opacity for bars (default: theme.barOpacity, 0.35)
//   barWidth        — bar width in px (each bar of a cluster); capped at the
//                     smallest gap between bar dates, a cluster narrowed to fit it
//   barWidthRatio   — width as a share of the smallest gap between bar dates
//                     (default: 0.65); ignored when barWidth is set
//   barGrouping     — 'overlap' (default) | 'cluster' (side by side, centred on the date)
//
//   annotations     — event markers. Vertical (point/range) and horizontal (line/band).
//                     Horizontal entries take `axis: 'y1'|'y2'` (default 'y1') for DualAxes.
//                     point:  { date, label?, color?, strokeDash?, labelColor? }
//                     range:  { from, to, label?, color?, fill?, fillOpacity?, strokeDash? }
//                     hPoint: { value, axis?, label?, color?, strokeDash?, labelPosition? }
//                     hRange: { yFrom, yTo, axis?, label?, color?, fill?, fillOpacity?, strokeDash? }
//   annotationLabelHeight — px reserved above the chart for vertical labels (default: 22)
//
//   crosshair       — vertical crosshair + dots + tooltip (default: true)
//   tooltipFormat   — function({ date, points }) => html; points is
//                     [{ name, series, axis, type, color, date, value, fmt }],
//                     one per series covering the hovered date (formatter
//                     arguments: /charts/settings/#formatter-arguments, K-09)
//
// Notes:
//   Y1 axis is drawn on the RIGHT.
//   Y2 axis is drawn on the LEFT.

import * as d3 from 'd3';
import { Chart }                  from '../core/Chart.js';
import { Tooltip }                from '../core/Tooltip.js';
import { Crosshair }              from '../core/Crosshair.js';
import { resolveEase, resolveStrokeDash, normalizeAnnotations, motionDuration, logTickValues, logPaddedDomain } from '../core/utils.js';
import { EntryMotion, entryTransition, drawLinesIn } from '../core/entryMotion.js';
import { linePath, areaPath, normalizeLineSeries } from '../core/seriesPath.js';
import { readBarWidth, timeSlot, barInset } from '../core/barLayout.js';
import {
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  dayTicks,
  renderAxisYRight,
  renderAxisYLeft,
  applySvgA11y,
  renderEndLabels,
  renderAxisTitles,
  renderMarkers,
  renderAnnotations,
} from '../core/renderHelpers.js';

export class DualAxes extends Chart {
  constructor(selector, options = {}) {
    const hasAxisTitles = !!(options.y1Title || options.y2Title);
    const annotations    = normalizeAnnotations(options.annotations);
    const annLabelHeight = options.annotationLabelHeight ?? 22;
    const annTopReserve  = annotations.length ? annLabelHeight + 4 : 0;
    const { margin: _margin, ...restOptions } = options;

    // Margin defaults track what occupies each gutter: the right one hosts the
    // Y1 axis, its title, and end labels; the left one the Y2 axis and title;
    // the bottom one the X axis; the top one the axis titles and annotation
    // labels. Hiding all of a gutter's occupants collapses it so the plot runs
    // flush; each side set explicitly wins — margin.top too, as on Line and
    // Bar (K-10).
    const y1Gutter  = options.showY1Axis !== false || !!options.y1Title;
    const y2Gutter  = options.showY2Axis !== false || !!options.y2Title;
    const endGutter = options.endLabels  !== false;

    super(selector, {
      height: 280,
      margin: {
        top:    options.margin?.top    ?? Math.max(hasAxisTitles ? 30 : 10, annTopReserve),
        right:  options.margin?.right  ?? (y1Gutter || endGutter ? 64 : 0),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 18),
        left:   options.margin?.left   ?? (y2Gutter ? 64 : 0),
      },
      ...restOptions,
    });

    this._series          = [];
    this._entry           = new EntryMotion();   // once per instance (C-16)
    this._annotations     = annotations;
    this._annLabelHeight  = annLabelHeight;

    const tooltip = new Tooltip(this.container, this.theme);
    this._initSVG(tooltip);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(series) {
    this._series = this._normalizeData(series);
    this._warnedNonPositive = false;
    this._refreshViewForData();
    this.render();
    return this;
  }

  // Switch an axis between 'linear' and 'log' and redraw. `axis`: 'y1', 'y2'
  // or 'both' (default). Fires onScaleChange unless { silent: true }.
  setYScale(type, { axis = 'both', silent = false } = {}) {
    const scale = type === 'log' ? 'log' : 'linear';
    const axes  = axis === 'y1' || axis === 'y2' ? [axis] : ['y1', 'y2'];
    axes.forEach(a => { this.options[`${a}Scale`] = scale; });
    this.render();
    this._scaleChanged(scale, axes.length === 2 ? 'both' : axis, silent);
    return this;
  }

  // The switch drives Y1 by default: Y2 often carries a signed series (a
  // spread, a change) that a log axis cannot show.
  _defaultScaleAxis() {
    return 'y1';
  }

  // For 'both', any log axis counts — the button then reads Log, and a click
  // takes both axes to linear rather than forcing a signed axis onto log.
  _isLogScale(axis = 'both') {
    const log = a => this.options[`${a}Scale`] === 'log';
    return axis === 'y1' || axis === 'y2' ? log(axis) : log('y1') || log('y2');
  }

  _getDataExtent() {
    const all = this._series.flatMap(s => s.values);
    return all.length ? d3.extent(all, d => d.date) : null;
  }

  _getNavigatorData() {
    const preferred = this._series.find(s => s.type === 'line') ?? this._series[0];
    return preferred?.values?.length ? preferred.values : null;
  }

  // One normaliser with Line (C-03): every per-series style field reaches
  // render; values are parsed, sorted, and unreadable rows dropped.
  _normalizeData(series) {
    const colors = this.theme.colors ?? [];

    // Mapped before filtering, so default names and palette slots keep the
    // input index.
    return (Array.isArray(series) ? series : [])
      .map((s, idx) => {
        if (s == null || typeof s !== 'object') return null;
        return normalizeLineSeries(s, idx, {
          color: colors[idx % (colors.length || 1)] ?? this.theme.accent,
          type:  s.type === 'bar' ? 'bar' : 'line',
          axis:  s.axis === 'y2' ? 'y2' : 'y1',
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

    this.gGrid        = this.g.append('g').attr('class', 'rc-grid');
    this.gBars        = this.g.append('g').attr('class', 'rc-bars');
    this.gLines       = this.g.append('g').attr('class', 'rc-lines');
    this.gAxisX       = this.g.append('g').attr('class', 'rc-axis rc-axis-x');
    this.gAxisY1      = this.g.append('g').attr('class', 'rc-axis rc-axis-y1');
    this.gAxisY2      = this.g.append('g').attr('class', 'rc-axis rc-axis-y2');
    this.gAxisTitles  = this.g.append('g').attr('class', 'rc-axis-titles');
    this.gEnds        = this.g.append('g').attr('class', 'rc-end-labels');
    this.gMarkers     = this.g.append('g').attr('class', 'rc-markers');
    this.gZero        = this.g.append('g').attr('class', 'rc-zero-layer');
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations');

    // Clip bars and lines to the drawing area so bar stubs don't bleed past edges
    this._clipId   = `${this._uid}-clip`;
    this._clipRect = this.svg.append('defs')
      .append('clipPath').attr('id', this._clipId)
      .append('rect');
    this.gBars.attr('clip-path',  `url(#${this._clipId})`);
    this.gLines.attr('clip-path', `url(#${this._clipId})`);

    const gCross  = this.g.append('g').attr('class', 'rc-crosshair');
    const overlay = this.g.append('rect')
      .attr('class', 'rc-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    this._crosshair = new Crosshair(gCross, overlay, tooltip, this.theme);
  }

  // ─── Bars ─────────────────────────────────────────────────────────────────

  // Bar widths per visible bar series for a scale L px long (B-07): an
  // explicit width — series.barWidth, then barWidth — in px; otherwise the
  // ratio share as before. The space per date (the smallest gap between bar
  // dates) caps explicit widths: an overlapping bar is never wider than it,
  // a cluster is narrowed proportionally to fit it.
  _barLayout(bars, viewExtent, allValues) {
    const o       = this.options;
    const ratio   = o.barWidthRatio ?? 0.65;
    const cluster = (o.barGrouping ?? 'overlap') === 'cluster';
    const msOf    = values => Array.from(new Set(values.map(d => +d.date))).sort((a, b) => a - b);
    // The space per date is the smallest gap between bar dates (it was the
    // first gap among all dates, lines included, so irregular dates overlapped);
    // with a single bar date in view, among all visible dates. With one date
    // there is no neighbour: the ratio share keeps its old 12px slot, and an
    // explicit width is capped only by the scale itself (as on Bar).
    const gapAt   = timeSlot(msOf(bars.flatMap(s => s.values)), viewExtent,
      timeSlot(msOf(allValues), viewExtent, null));
    const slotAt  = gapAt ?? (() => 12);
    const capAt   = gapAt ?? (L => L);
    const fixed   = bars.map(s => readBarWidth(s.barWidth) ?? readBarWidth(o.barWidth));
    const anyFixed = fixed.some(w => w !== undefined);
    const widths = L => {
      const share = Math.max(4, Math.max(6, slotAt(L)) * ratio) / (cluster ? bars.length : 1);
      let ws = fixed.map(w => w ?? share);
      if (anyFixed) {
        const cap = Math.max(0, capAt(L));   // a plot narrower than 2·xPad: 0, never negative
        if (cluster) {
          const total = d3.sum(ws);
          if (total > cap) ws = ws.map(w => w * cap / total);
        } else {
          ws = ws.map((w, i) => (fixed[i] !== undefined ? Math.min(w, cap) : w));
        }
      }
      return ws;
    };
    const extent = L => (cluster ? d3.sum(widths(L)) : d3.max(widths(L)));
    return { cluster, widths, extent };
  }

  _renderBars({ bars, x, widths, cluster, y1, y2, barOpacity, phase, duration, ease }) {
    // Left edge of each series' bar from its date: a cluster sits side by
    // side, centred on the date; overlapping bars are each centred on it.
    let acc = -d3.sum(widths) / 2;
    const left = widths.map(w => (cluster ? (acc += w) - w : -w / 2));
    const barItems = bars.flatMap((s, i) =>
      s.values.map(v => ({
        key:    `${s.name}|${+v.date}`,
        series: s.name,
        axis:   s.axis,
        color:  s.color,
        date:   v.date,
        value:  v.value,
        dx:     left[i],
        w:      widths[i],
      }))
    );

    const scaleFor = (d) => (d.axis === 'y2' ? y2 : y1);
    // Bars grow from zero; a log axis (it has .base()) has no zero, so they
    // grow from the bottom of the axis.
    const baseFor  = (d) => (typeof scaleFor(d).base === 'function' ? scaleFor(d).domain()[0] : 0);

    // Bars entering during the entry (the first render, or mid-entry)
    // start flat on their baseline and grow.
    const grow = phase !== 'none';
    const barsSel = this.gBars.selectAll('.rc-dual-bar')
      .data(barItems, d => d.key)
      .join(
        enter => enter.append('rect')
          .attr('class',   'rc-dual-bar')
          .attr('x',       d => x(d.date) + d.dx)
          .attr('width',   d => d.w)
          .attr('y',       d => grow ? scaleFor(d)(baseFor(d)) : scaleFor(d)(Math.max(baseFor(d), d.value)))
          .attr('height',  d => grow ? 0 : Math.abs(scaleFor(d)(d.value) - scaleFor(d)(baseFor(d)))),
        update => update,
        exit   => exit.remove()
      );

    // Colour and opacity follow setData and options, not only the first draw.
    barsSel.attr('fill', d => d.color).attr('opacity', barOpacity);
    const apply = (sel) => sel
      .attr('x',      d => x(d.date) + d.dx)
      .attr('width',  d => d.w)
      .attr('y',      d => scaleFor(d)(Math.max(baseFor(d), d.value)))
      .attr('height', d => Math.abs(scaleFor(d)(d.value) - scaleFor(d)(baseFor(d))));

    // The growth runs on the chart's entry timeline: a render in the middle
    // of it retargets the bars from where they stand (C-16); after it, or
    // with animate off, they take their place at once.
    if (phase === 'none') {
      apply(barsSel.interrupt());
    } else {
      const { moving, settled } = entryTransition(barsSel, this._entry, { duration, ease });
      apply(settled);
      apply(moving);
    }
  }

  // ─── Lines ────────────────────────────────────────────────────────────────

  _renderLines({ lines, x, y1, y2, defaultCurve, tension, globalDash, phase, duration, ease }) {
    const globalArea    = this.options.area        ?? false;
    const globalAreaOp  = this.options.areaOpacity ?? 0.12;
    const globalAreaBase= this.options.areaBaseline?? 'zero';

    const yFor = (s) => (s.axis === 'y2' ? y2 : y1);

    // Areas
    const areaSeries = lines.filter(s => (s.area ?? globalArea) === true);
    this.gLines.selectAll('.rc-dual-area')
      .data(areaSeries, s => s.name)
      .join('path')
      .attr('class', 'rc-dual-area')
      .attr('d',       s => areaPath(s, x, yFor(s), defaultCurve, globalAreaBase, tension))
      .attr('fill',    s => s.color)
      .attr('opacity', s => s.areaOpacity ?? globalAreaOp);

    // Lines
    const paths = this.gLines.selectAll('.rc-dual-line')
      .data(lines, s => s.name)
      .join('path')
      .attr('class',        'rc-dual-line')
      .attr('fill',         'none')
      .attr('stroke',       s => s.color)
      .attr('stroke-width',   s => s.strokeWidth ?? this.theme.strokeWidth ?? 2)
      .attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
      .attr('d', s => linePath(s, x, yFor(s), defaultCurve, tension));

    // Dashed lines appear at once with their pattern (the draw-in uses the
    // same attribute); solid ones draw in on the entry timeline, as on Line.
    const dashOf = s => resolveStrokeDash(s.strokeDash ?? globalDash);
    paths.filter(s => dashOf(s)).interrupt()
      .attr('stroke-dasharray', dashOf)
      .attr('stroke-dashoffset', null);
    drawLinesIn(paths.filter(s => !dashOf(s)),
      phase === 'none' ? null : this._entry.timing(0, duration, ease));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  _dataLayers() {
    return [this.gGrid, this.gBars, this.gLines, this.gAxisX, this.gAxisY1, this.gAxisY2,
      this.gAxisTitles, this.gEnds, this.gMarkers, this.gZero, this.gAnnotations];
  }

  render() {
    if (!this._series.length) { this._renderEmpty(); return; }

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;
    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);
    // A log axis has no place for zero or negatives: such points on it are
    // skipped (lines join their neighbours) instead of drawing NaN.
    const logOn = { y1: o.y1Scale === 'log', y2: o.y2Scale === 'log' };
    let skipped = 0;
    const visibleSeries = this._series
      .map(s => ({ ...s, values: s.values.filter(d => {
        if (d.date < viewExtent[0] || d.date > viewExtent[1]) return false;
        if (logOn[s.axis] && !(d.value > 0)) { skipped++; return false; }
        return true;
      }) }))
      .filter(s => s.values.length);
    if (skipped && !this._warnedNonPositive) {
      this._warnedNonPositive = true;
      console.warn(`RareCharts.DualAxes: ${skipped} value${skipped === 1 ? '' : 's'} ≤ 0 skipped on the log axis`);
    }
    if (!visibleSeries.length) { this._renderEmpty(); return; }

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation — once per instance; lines and bars share one timeline that
    // a render in the middle of it carries on (C-16).
    const duration = motionDuration(o.duration ?? 650);
    const phase    = this._entry.phase((o.animate ?? true) ? duration : 0);
    const ease     = resolveEase(o.ease ?? 'cubicOut');

    // Curve / dash options
    const defaultCurve = o.curve         ?? 'linear';
    const tension      = o.curveTension  ?? 0;
    const xPad         = o.xPad         ?? 8;

    const lines = visibleSeries.filter(s => s.type === 'line');
    const bars  = visibleSeries.filter(s => s.type === 'bar');

    const allValues = visibleSeries.flatMap(s => s.values);
    const allY1     = visibleSeries.filter(s => s.axis === 'y1').flatMap(s => s.values);
    const allY2     = visibleSeries.filter(s => s.axis === 'y2').flatMap(s => s.values);

    // Update clip rect to match current drawing area
    this._clipRect.attr('x', xPad).attr('y', 0).attr('width', W - 2 * xPad).attr('height', H);

    // Scales. With bars, the range is inset by half the widest bar or cluster
    // (C-27): the first and last bars end at the clip edges instead of being
    // centred on them and cut in half. Lines share the scale, so their points
    // stay on the bar centres; a chart without bars is unchanged.
    const barLayout = bars.length ? this._barLayout(bars, viewExtent, allValues) : null;
    const inset = barLayout ? barInset(W - 2 * xPad, barLayout.extent) : 0;
    const x = d3.scaleTime()
      .domain(viewExtent)
      .range([xPad + inset, W - xPad - inset]);

    // Each axis is linear (a niced auto domain, as before) or log: a padded
    // domain whose margin is a factor of the data's span, with ticks on powers
    // of ten → 1-2-5 → linear steps (the same rules as Line). An axis without
    // series of its own follows the other axis's data.
    const axisScale = (axis, own, other) => {
      const values = (own.length ? own : other).map(d => d.value);
      const domain = o[`${axis}Domain`];
      if (!logOn[axis]) {
        // The auto domain is rounded to the axis's own tick count (C-21: it
        // was always 4, whatever y1Ticks / y2Ticks asked for).
        const scale = Array.isArray(domain)
          ? d3.scaleLinear().domain(domain)
          : d3.scaleLinear().domain(d3.extent(values)).nice(o[`${axis}Ticks`] ?? 4);
        return { scale: scale.range([H, 0]), tickValues: null };
      }
      const positive = values.filter(v => v > 0);
      const [lo, hi] = Array.isArray(domain) && domain[0] > 0 && domain[1] > domain[0]
        ? domain
        : positive.length ? logPaddedDomain(d3.min(positive), d3.max(positive)) : [1, 10];
      return {
        scale: d3.scaleLog().domain([lo, hi]).range([H, 0]),
        tickValues: logTickValues(lo, hi, o[`${axis}Ticks`] ?? 4),
      };
    };
    const { scale: y1, tickValues: y1TickValues } = axisScale('y1', allY1, allY2);
    const { scale: y2, tickValues: y2TickValues } = axisScale('y2', allY2, allY1);

    // Formatters — log ticks are round powers: trim the zeros (1k, not 1,000.00).
    const logFormat    = d3.format('.3~s');
    const xTickFormat  = o.xTickFormat  ?? (d => d3.timeFormat('%m/%d')(d));
    // The default '%m/%d' labels days: on a span of a few days d3 would place
    // ticks every few hours and repeat a date ("01/01 01/01 01/02"), so the
    // count is capped at one tick per whole day of the view (E-03; the same
    // rule as Line). A page's own xTickFormat keeps the full count.
    const xTicks = o.xTickFormat
      ? 6
      : (dayTicks(viewExtent, 6) ?? 6);
    const y1TickFormat = o.y1TickFormat ?? (logOn.y1 ? logFormat : v => d3.format(',.2f')(v));
    const y2TickFormat = o.y2TickFormat ?? (logOn.y2 ? logFormat : v => Math.abs(v) < 1e-6 ? '0' : d3.format('+.2f')(v));

    // Axes + grid
    if (o.showGrid ?? true) {
      renderGrid(this.gGrid, y2, W, o.y2Ticks ?? 4, t, y2TickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    renderZeroBaseline(this.gZero, y2, W, t);

    if (o.showXAxis ?? true) {
      renderAxisX(this.gAxisX, x, H, xTickFormat, t, xTicks);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    if (o.showY1Axis ?? true) {
      renderAxisYRight(this.gAxisY1, y1, W, o.y1Ticks ?? 4, y1TickFormat, o.y1LabelsOnly ?? true, t, y1TickValues);
    } else {
      this.gAxisY1.selectAll('*').remove();
    }

    if (o.showY2Axis ?? true) {
      renderAxisYLeft(this.gAxisY2, y2, o.y2Ticks ?? 4, y2TickFormat, o.y2LabelsOnly ?? true, t, y2TickValues);
    } else {
      this.gAxisY2.selectAll('*').remove();
    }

    // Available px for each title = its axis margin plus the container's side
    // padding. Titles are anchored 8px in from the axis (x = ±8), and the
    // overflow clip sits at the padding box, so that 8px is the exact room
    // before a title would be cut off.
    const cs   = window.getComputedStyle(this.container);
    const padL = parseFloat(cs.paddingLeft)  || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    renderAxisTitles(this.gAxisTitles, W, o.y1Title, o.y2Title, t, {
      y1Avail:   this.margin.right + padR - 8,
      y2Avail:   this.margin.left  + padL - 8,
      maxLength: o.axisTitleMaxLength,
    });

    // Series
    if (bars.length) {
      this._renderBars({
        bars, x, y1, y2,
        widths:     barLayout.widths(W - 2 * xPad - 2 * inset),
        cluster:    barLayout.cluster,
        barOpacity: o.barOpacity ?? t.barOpacity ?? 0.35,
        phase, duration, ease,
      });
    } else {
      this.gBars.selectAll('*').remove();
    }

    if (lines.length) {
      this._renderLines({ lines, x, y1, y2, defaultCurve, tension, globalDash: o.strokeDash ?? null, phase, duration, ease });
    } else {
      this.gLines.selectAll('*').remove();
    }

    // End labels
    if (o.endLabels ?? true) {
      const endAxis   = o.endLabelsAxis ?? 'y1';
      const endSeries = visibleSeries.filter(s => s.axis === endAxis);
      const endScale  = endAxis === 'y2' ? y2 : y1;
      const endFmt    = endAxis === 'y2' ? y2TickFormat : y1TickFormat;
      renderEndLabels(this.gEnds, endSeries, endScale, W, endFmt, t);
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // Markers
    renderMarkers(
      this.gMarkers, visibleSeries, x,
      s => (s.axis === 'y2' ? y2 : y1),
      o.markers ?? false,
      o.markerShape ?? 'circle',
      o.markerSize  ?? t.markerSize ?? 4,
      t
    );

    // Annotations — levels outside their axis's range (on a log axis: at or
    // below zero) are skipped by renderAnnotations itself; a band is cut at
    // the edge of the axis.
    // Levels span the plot, not the scale: with bars the scale is inset by
    // half a bar (C-27), and a reference line should reach past the edge bars.
    renderAnnotations(
      this.gAnnotations, this._annotations, x,
      axis => axis === 'y2' ? y2 : y1,
      H, this._annLabelHeight, t, [xPad, W - xPad]
    );

    // Crosshair
    this._crosshair.bind({
      W, H, x,
      series:    visibleSeries,
      enabled:   o.crosshair ?? true,
      scaleFor:  (s) => (s.axis === 'y2' ? y2 : y1),
      formatFor: (s, v) => (s.axis === 'y2' ? y2TickFormat(v) : y1TickFormat(v)),
      tooltipFmt: o.tooltipFormat,
    });
  }
}

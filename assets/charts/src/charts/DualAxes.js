// RareCharts — DualAxes
// Dual-axis composite chart: mix line and bar series on two Y axes.
//
// Data format (multi-series):
// [
//   {
//     name:   string,
//     axis:   'y1' | 'y2',
//     type:   'line' | 'bar' | 'band',
//     color:  string (optional),
//     values: [{ date: Date|string|number, value: number }, ...]
//   },
//   ...
// ]
//
// A band (RC-051), as on Line: { name, type: 'band', axis, color?,
// fillOpacity?, values: [{ date, lower, upper }] } — a ribbon between the
// two edges on its axis, behind the bars and the lines (opacity:
// fillOpacity, else areaOpacity, else 0.12). Its axis fits both edges; the
// crosshair reports its range; the legend toggles it; end labels, markers
// and the navigator leave it out.
//
// series.name is the tooltip label, the key that matches lines and bars
// across setData, and the legend's key: a `legend` item names its series by
// `series`, else `name`, else `label` (no legend is built from series; pass
// `legend`).
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
//   y1Ticks/y2Ticks — approximate tick count (default: 4); ticks are picked
//                     inside the auto domain: the data with 8% of its span as
//                     headroom on both sides, not rounded up (as on Line)
//   y1TickFormat    — function(value) => string. Default as on Line (K-10):
//                     ticks by their step ('~s' from 1000, ',~f' below: 65k,
//                     0.5, '0' at zero), log ticks '.3~s'; end labels and the
//                     tooltip three significant digits (1.23k, −0.3). An own
//                     format formats all three. It was ',.2f'
//   y2TickFormat    — the same for Y2 (it was '+.2f')
//   xTickFormat     — function(date) => string. Default by the span in view,
//                     as on Line, TimeSeries and Bar (K-10): '%H:%M', '%b %d'
//                     (at most one tick per day), '%b', "%b '%y", '%Y'; it
//                     was '%m/%d'
//   timeZone        — 'local' (default) | 'UTC': the zone date strings without
//                     a zone are read in, timeframes cut in and the axis and
//                     tooltip name dates in; an instant stays that instant
//                     (the table: parseDate in core/utils.js, T-10)
//   timeframeAnchor / weekStart — the end the timeframes count back from
//                     ('dataEnd' default | 'now' | a date) and the first day
//                     of a week (Monday default), as on TimeSeries (RC-001)
//   y1Domain / y2Domain — override auto domains (used as given; a log axis
//                     needs 0 < min < max)
//   y1Scale / y2Scale — 'linear' (default) | 'log', per axis. Log: powers-of-ten
//                     ticks, the margin above/below is a factor of the axis's
//                     data span, values ≤ 0 on that axis are skipped (warned once
//                     per setData), bars grow from the bottom of the axis.
//                     setYScale(type, { axis: 'y1' | 'y2' | 'both' }) switches
//   scaleToggle     — a Log toggle, top right of the header above the Y labels:
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
//                     one per shown series covering the hovered date
//                     (formatter arguments: /charts/settings/#formatter-arguments, K-09)
//
//   legendInteractive — a `legend` item that names a series is a toggle
//                     (default: true): a click hides or shows that series, a
//                     double click keeps only it; false: plain labels
//   legendRescale   — each value axis follows its shown series (default:
//                     true); an axis whose series are all hidden keeps the
//                     domain of its series in view, so its labels stay in its
//                     units; false: both axes keep every series in view
//   onLegendToggle  — function({ name, visible, visibleNames }) after a legend
//                     gesture (not after setSeriesVisible)
//
// A hidden series leaves the drawing, the end labels, the markers, the
// crosshair and the tooltip; the X axis, the bar inset (C-27), the navigator
// and the timeframes stay. setSeriesVisible(names | null) shows only the
// series named (null: all), silently; chain it after setData.
//
// Notes:
//   Y1 axis is drawn on the RIGHT.
//   Y2 axis is drawn on the LEFT.

import * as d3 from 'd3';
import { Chart }                  from '../core/Chart.js';
import { Crosshair }              from '../core/Crosshair.js';
import { resolveEase, annotationRoom, motionDuration, logTickValues, logPaddedDomain, linearTickValues, timeKit, compactTickFormat, compactValue, spanTimeFormat, spanTimeFormatter } from '../core/utils.js';
import { EntryMotion, entryTransition, ENTRY_DURATION } from '../core/entryMotion.js';
import { bandPath, normalizeLineSeries, filterLogSeries } from '../core/seriesPath.js';
import { readBarWidth, timeSlot, barInset } from '../core/barLayout.js';
import {
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  dayTicks,
  renderAxisY,
  renderEndLabels,
  renderAxisTitles,
  renderMarkers,
  renderAnnotations,
  drawLineSeries,
} from '../core/renderHelpers.js';

export class DualAxes extends Chart {
  constructor(selector, options = {}) {
    const hasAxisTitles = !!(options.y1Title || options.y2Title);
    const ann = annotationRoom(options);
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
        top:    options.margin?.top    ?? Math.max(hasAxisTitles ? 30 : 10, ann.top),
        right:  options.margin?.right  ?? (y1Gutter || endGutter ? 64 : 0),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 18),
        left:   options.margin?.left   ?? (y2Gutter ? 64 : 0),
      },
      ...restOptions,
    });
    // the sides the page's own margin sets: those gutters stay as given (RC-060)
    this._pageMargin = options.margin ?? {};

    this._series          = [];
    this._entry           = new EntryMotion();   // once per instance (C-16)
    this._annotations     = ann.annotations;
    this._annLabelHeight  = ann.labelHeight;

    this._initSVG(this.tooltip);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(series) {
    this._series = this._normalizeData(series);
    this._warnedNonPositive = false;
    this._refreshViewForData();
    this.render();
    return this;
  }

  // Show only the series named (series.name; a string or a list) and hide
  // the others in the data; null shows them all. Redraws, silently (no
  // onLegendToggle). A hidden series stays hidden across setData.
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  // The legend's series (the base Chart's hook): every series in the data,
  // by name, in data order, with its colour.
  _legendSeries() {
    return this._series.map(s => ({ key: s.name, color: s.color }));
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

  _dataExtent() {
    const all = this._series.flatMap(s => s.values);
    return all.length ? d3.extent(all, d => d.date) : null;
  }

  _getNavigatorData() {
    const preferred = this._series.find(s => s.type === 'line') ?? this._series.find(s => s.type !== 'band');
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
          type:  s.type === 'bar' || s.type === 'band' ? s.type : 'line',
          axis:  s.axis === 'y2' ? 'y2' : 'y1',
          timeZone: this._zone(),
        });
      })
      .filter(s => s?.values.length);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG(tooltip) {
    this._createPlot();

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

    this._crosshair = Crosshair.attach(this.g, tooltip, this.theme);
  }

  // ─── Bars ─────────────────────────────────────────────────────────────────

  // Bar widths per visible bar series for a scale L px long (B-07): an
  // explicit width — series.barWidth, then barWidth — in px; otherwise the
  // ratio share as before. The space per date (the smallest gap between bar
  // dates) caps explicit widths: an overlapping bar is never wider than it,
  // a cluster is narrowed proportionally to fit it.
  // `inView`: the bar series in view, hidden ones included (default: `bars`)
  // — the space per date comes from them, so a bar series the legend hides
  // re-packs a cluster without widening the others past the X inset (C-27).
  _barLayout(bars, viewExtent, allValues, inView = bars) {
    const o       = this.options;
    const ratio   = o.barWidthRatio ?? 0.65;
    const cluster = (o.barGrouping ?? 'overlap') === 'cluster';
    const msOf    = values => Array.from(new Set(values.map(d => +d.date))).sort((a, b) => a - b);
    // The space per date is the smallest gap between bar dates (it was the
    // first gap among all dates, lines included, so irregular dates overlapped);
    // with a single bar date in view, among all visible dates. With one date
    // there is no neighbour: the ratio share keeps its old 12px slot, and an
    // explicit width is capped only by the scale itself (as on Bar).
    const gapAt   = timeSlot(msOf(inView.flatMap(s => s.values)), viewExtent,
      timeSlot(msOf(allValues), viewExtent, null));
    const slotAt  = gapAt ?? (() => 12);
    const capAt   = gapAt ?? (L => L);
    const fixed   = bars.map(s => readBarWidth(s.barWidth) ?? readBarWidth(o.barWidth));
    const anyFixed = fixed.some(w => w !== undefined);
    const widths = L => {
      // the ratio's share of the slot, at least 4 px to stay visible — but
      // never wider than the gap between two bar dates (RC-072): on a narrow
      // card that floor made neighbours overlap; they may now just touch
      const slot  = slotAt(L);
      const wide  = Math.max(4, Math.max(6, slot) * ratio);
      const share = (gapAt ? Math.min(wide, Math.max(0, slot)) : wide) / (cluster ? bars.length : 1);
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

  // Areas, then lines, each on its own axis — the drawing Line has; solid
  // lines draw in on the entry timeline, dashed ones show at once.
  _renderLines({ lines, x, y1, y2, defaultCurve, tension, globalDash, phase, duration, ease }) {
    const o = this.options;
    drawLineSeries(this.gLines, lines, {
      x, yFor: s => (s.axis === 'y2' ? y2 : y1), curve: defaultCurve, tension,
      area:         o.area         ?? false,
      areaOpacity:  o.areaOpacity  ?? 0.12,
      areaBaseline: o.areaBaseline ?? 'zero',
      dash:         globalDash,
      width:        this.theme.strokeWidth ?? 2,
      classes:      { area: 'rc-dual-area', line: 'rc-dual-line' },
      timing:       phase === 'none' ? null : this._entry.timing(0, duration, ease),
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // The bands (RC-051) in a group of their own under the bars, made with the
  // first band, so a chart without one keeps its drawing; clipped as the
  // bars and the lines are. Drawn as Line draws its bands.
  _renderBands(bands, { x, y1, y2, defaultCurve, tension }) {
    if (!bands.length && !this.gBands) return;
    this.gBands ??= this.g.insert('g', () => this.gBars.node())
      .attr('class', 'rc-bands')
      .attr('clip-path', `url(#${this._clipId})`);
    const areaOp = this.options.areaOpacity ?? 0.12;
    this.gBands.selectAll('.rc-band')
      .data(bands, s => s.name)
      .join('path')
      .attr('class', 'rc-band')
      .attr('d', s => bandPath(s, x, s.axis === 'y2' ? y2 : y1, defaultCurve, tension))
      .attr('fill', s => s.color)
      .attr('opacity', s => s.fillOpacity ?? areaOp);
  }

  _dataLayers() {
    return [this.gGrid, this.gBands, this.gBars, this.gLines, this.gAxisX, this.gAxisY1, this.gAxisY2,
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
    const { series: inView, skipped } = filterLogSeries(this._series, viewExtent, s => logOn[s.axis]);
    this._warnLogSkips(skipped, 'DualAxes', 'axis');
    if (!inView.length) { this._renderEmpty(); return; }
    // The series the legend leaves shown. Marks, end labels, markers and the
    // crosshair read these; the X axis, the bar inset and the navigator read
    // every series (in view). With all hidden the frame stays, with no marks.
    const shown = inView.filter(s => this._isShown(String(s.name)));

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation — once per instance; lines and bars share one timeline that
    // a render in the middle of it carries on (C-16).
    const duration = motionDuration(o.duration ?? ENTRY_DURATION);
    const phase    = this._entry.phase((o.animate ?? true) ? duration : 0);
    const ease     = resolveEase(o.ease ?? 'cubicOut');

    // Curve / dash options
    const defaultCurve = o.curve         ?? 'linear';
    const tension      = o.curveTension  ?? 0;
    const xPad         = o.xPad         ?? 8;

    const lines = shown.filter(s => s.type === 'line');
    const bars  = shown.filter(s => s.type === 'bar');
    const barsInView = inView.filter(s => s.type === 'bar');

    // The values each axis scales on: its shown series (legendRescale, the
    // default), else — every one hidden, or legendRescale: false — its series
    // in view, so its labels stay in its own units and nothing jumps when a
    // series comes back. An axis with no series in view still follows the
    // other (axisScale).
    const allValues = inView.filter(s => s.type !== 'band').flatMap(s => s.values);
    // a band counts by its two edges (RC-051)
    const valuesOf = s => (s.type === 'band'
      ? s.values.flatMap(d => [{ value: d.lower }, { value: d.upper }])
      : s.values);
    const axisValues = axis => {
      const on = list => list.filter(s => s.axis === axis).flatMap(valuesOf);
      const own = this._legendRescale() ? on(shown) : [];
      return own.length ? own : on(inView);
    };
    const allY1     = axisValues('y1');
    const allY2     = axisValues('y2');

    // Update clip rect to match current drawing area
    this._clipRect.attr('x', xPad).attr('y', 0).attr('width', W - 2 * xPad).attr('height', H);

    // Scales. With bars, the range is inset by half the widest bar or cluster
    // (C-27): the first and last bars end at the clip edges instead of being
    // centred on them and cut in half. Lines share the scale, so their points
    // stay on the bar centres; a chart without bars is unchanged. The inset
    // comes from every bar series in view, hidden ones too, so X never moves
    // when the legend hides a bar series; the shown bars re-pack inside it.
    const barLayout = bars.length ? this._barLayout(bars, viewExtent, allValues, barsInView) : null;
    const insetLayout = bars.length === barsInView.length ? barLayout
      : this._barLayout(barsInView, viewExtent, allValues);
    const inset = insetLayout ? barInset(W - 2 * xPad, insetLayout.extent) : 0;
    // d3's local or UTC scale and format: the zone's days and months (T-10)
    const tz = timeKit(this._zone());
    const x = tz.scale()
      .domain(viewExtent)
      .range([xPad + inset, W - xPad - inset]);

    // Each axis follows Line's rules, linear or log. Linear: the data with 8%
    // of its span as headroom on both sides, not rounded up to the next round
    // number, the axis's own tick count picked inside (maintainer,
    // 2026-11-17; it was the extent .nice()d, which could run 156k on to
    // 200k). Log: a padded domain whose margin is a factor of the data's
    // span, with ticks on powers of ten → 1-2-5 → linear steps. An explicit
    // y1Domain / y2Domain is used as given. An axis without series of its
    // own follows the other axis's data.
    const axisScale = (axis, own, other) => {
      const values = (own.length ? own : other).map(d => d.value);
      const domain = o[`${axis}Domain`];
      const count  = o[`${axis}Ticks`] ?? 4;
      if (!logOn[axis]) {
        if (Array.isArray(domain)) return { scale: d3.scaleLinear().domain(domain).range([H, 0]), tickValues: null };
        const [min, max] = d3.extent(values);
        if (min == null) return { scale: d3.scaleLinear().domain([0, 1]).range([H, 0]), tickValues: null };
        const pad = (max - min) * 0.08 || 1;
        const [lo, hi] = [min - pad, max + pad];
        return { scale: d3.scaleLinear().domain([lo, hi]).range([H, 0]), tickValues: linearTickValues(lo, hi, count) };
      }
      const positive = values.filter(v => v > 0);
      const [lo, hi] = Array.isArray(domain) && domain[0] > 0 && domain[1] > domain[0]
        ? domain
        : positive.length ? logPaddedDomain(d3.min(positive), d3.max(positive)) : [1, 10];
      return {
        scale: d3.scaleLog().domain([lo, hi]).range([H, 0]),
        tickValues: logTickValues(lo, hi, count),
      };
    };
    const { scale: y1, tickValues: y1TickValues } = axisScale('y1', allY1, allY2);
    const { scale: y2, tickValues: y2TickValues } = axisScale('y2', allY2, allY1);

    // Formatters — log ticks are round powers: trim the zeros (1k, not 1,000.00).
    const logFormat    = d3.format('.3~s');
    // The date ticks follow the span in view (K-10), as on Line, TimeSeries
    // and Bar. A day-labelled view of a few days gets at most one tick per
    // whole day: d3 would place them every few hours and repeat a date (E-03).
    // A page's own xTickFormat keeps the full count.
    const xSpec        = o.xTickFormat ? null : spanTimeFormat(viewExtent);
    const xTickFormat  = o.xTickFormat ?? spanTimeFormatter(viewExtent, tz.zone);
    const xTicks = xSpec === '%b %d' ? (dayTicks(viewExtent, 6, tz.zone) ?? 6) : 6;
    // The value axes label as Line's do (K-10): ticks by their step (65k,
    // 0.5), log ticks round powers; end labels and the tooltip three
    // significant digits. An own y1TickFormat / y2TickFormat formats all three.
    const tickFormatOf = (axis, scale, tickValues) => o[`${axis}TickFormat`]
      ?? (logOn[axis] ? logFormat : compactTickFormat(tickValues ?? scale.ticks(o[`${axis}Ticks`] ?? 4)));
    const y1TickFormat = tickFormatOf('y1', y1, y1TickValues);
    const y2TickFormat = tickFormatOf('y2', y2, y2TickValues);
    const y1ValueFormat = o.y1TickFormat ?? compactValue;
    const y2ValueFormat = o.y2TickFormat ?? compactValue;

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
      renderAxisY(this.gAxisY1, y1, {
        side: 'right', width: W, ticks: o.y1Ticks ?? 4, tickValues: y1TickValues,
        tickFormat: y1TickFormat, labelsOnly: o.y1LabelsOnly ?? true, theme: t,
      });
    } else {
      this.gAxisY1.selectAll('*').remove();
    }

    if (o.showY2Axis ?? true) {
      renderAxisY(this.gAxisY2, y2, {
        side: 'left', ticks: o.y2Ticks ?? 4, tickValues: y2TickValues,
        tickFormat: y2TickFormat, labelsOnly: o.y2LabelsOnly ?? true, theme: t,
      });
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

    // Bands (RC-051), behind the bars and the lines
    this._renderBands(shown.filter(s => s.type === 'band'), { x, y1, y2, defaultCurve, tension });

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
      const endSeries = shown.filter(s => s.axis === endAxis && s.type !== 'band');
      const endScale  = endAxis === 'y2' ? y2 : y1;
      const endFmt    = endAxis === 'y2' ? y2ValueFormat : y1ValueFormat;
      // the end labels sit in the right column, Y1's (RC-084)
      renderEndLabels(this.gEnds, endSeries, endScale, W, endFmt, t, { axis: (o.showY1Axis ?? true) ? this.gAxisY1 : null });
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // Each value gutter takes the room its labels need (RC-060); the axis
    // titles are trimmed to their gutter, so they do not count
    if (this._fitGutters([[[this.gAxisY1.selectAll('.tick'), this.gEnds], 'right'], [this.gAxisY2.selectAll('.tick'), 'left']])) return;

    // Markers
    renderMarkers(
      this.gMarkers, shown.filter(s => s.type !== 'band'), x,
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
      series:    shown,
      enabled:   o.crosshair ?? true,
      scaleFor:  (s) => (s.axis === 'y2' ? y2 : y1),
      formatFor: (s, v) => (s.axis === 'y2' ? y2ValueFormat(v) : y1ValueFormat(v)),
      tooltipFmt: o.tooltipFormat,
      timeZone:  tz.zone,
      dash:      o.strokeDash ?? null,
    });
  }
}

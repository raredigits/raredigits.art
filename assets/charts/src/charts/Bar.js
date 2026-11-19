// RareCharts — Bar
// Vertical and horizontal bar chart with three data modes, detected by shape:
//
//   categorical  [{ label, value, color? }, ...]
//                Values may be negative: bars grow from a zero baseline in
//                both directions (below it when vertical, to the left of it
//                when horizontal).
//   time-series  [{ date, value, color? }, ...]  (vertical only)
//                Time X scale; supports the shared view API — timeframes,
//                defaultTimeframe, defaultView, navigator, setView/getView,
//                setTimeframe, onViewChange — and annotations. Dated rows
//                with orientation: 'horizontal' have no date axis: they are
//                drawn as unlabelled categories and warn once.
//   stacked      [{ name, color?, values: [{ label, value }] }, ...]
//                Series stack segments per category, both orientations.
//                Categories are the ordered union of series labels; a
//                negative, missing or non-numeric value counts as 0 (no
//                segment). stacked: 'percent' normalizes each bar to
//                100%. A legend is auto-built from series names unless a
//                `legend` option is passed; either way its items that name
//                a series (by `series`, `name` or `label`) are toggles —
//                the interactive legend below.
//   A row's `color` fills that bar (B-01); the stacked mode ignores it —
//   segments take their series colour.
//   The timeframe buttons and the navigator strip belong to the date axis:
//   the categorical, stacked and horizontal modes hide them.
//
// Options:
//   orientation    — 'vertical' (default) | 'horizontal'
//   labelMaxLength — truncate long labels to N chars (default: no truncation)
//                    full label is always shown in tooltip
//                    Horizontal: the left gutter (65px) grows to the longest
//                    label, up to 40% of the chart width; a label past that is
//                    cut with an ellipsis (full text in its tooltip). An explicit
//                    margin.left keeps the gutter as given (C-39).
//   barColor       — fill for bars without their own `color` (single-series modes)
//   barWidth       — bar width in px: thickness when horizontal, the whole column
//                    when stacked; capped at the space per category or date
//   barWidthRatio  — bar width as a fraction of the slot (time-series, default: 0.72);
//                    ignored when barWidth is set
//   stacked        — 'percent' normalizes each bar to 100% (stacking itself is
//                    switched on by the series-major data shape)
//   animate        — animate bars on first render, once per instance (default:
//                    true); stacked segments fade in instead of growing, value
//                    labels fade in at their place. A render in the middle of it
//                    (fonts, the first resize, new data) carries the motion on
//                    to the new geometry (C-16)
//   duration       — animation duration ms (default: 650)
//   stagger        — per-bar delay ms (default: 0); not in the stacked mode
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showValues     — show numeric labels at bar ends (default: false; not on
//                    stacked bars). Horizontal: past the bar's end, flipped
//                    inside where room is tight (valueInsideGap). Vertical
//                    (categories and dates): above a positive bar, below a
//                    negative one, the value axis grown to make room; where
//                    labels would collide (with each other or another bar),
//                    the larger values keep theirs — the tooltip keeps every
//                    value
//   valueFormat    — function(d, info) => string for bar-end labels
//                    (default: ',.2~f' — whole numbers with separators, up to
//                    two decimals for a fraction: 1,234 and 0.4, where ',.0f'
//                    printed 0.4 as "0", C-41) and the default stacked-segment tooltip
//                    value (default: ','); arguments as tooltipFormat's
//   valueOffset    — px offset from bar end (default: 6)
//   valueInsideGap — horizontal bars: threshold px; the label flips inside the
//                    bar when space is tight and it fits there (default: 42);
//                    a label that fits neither way gets room outside — the
//                    value axis widens
//
//   showGrid       — show grid lines (default: true)
//   showXAxis      — show X axis (default: true; hiding it also reclaims its margin)
//   showYAxis      — show Y axis (default: true; hiding it also reclaims its margin)
//
//   yTicks / yTickValues — value-axis tick count (approximate; stacked: exact
//                    intervals) / explicit positions (vertical, default 4)
//   xTicks         — value-axis ticks (horizontal, default 4) or time-axis
//                    ticks (date mode, default 6)
//   xTickValues    — explicit value-axis positions (horizontal)
//   yTickFormat    — function(value) => string (vertical: Y axis labels).
//                    Default (C-30): by the tick step — SI '~s' once the largest
//                    tick reaches 1000, ',~f' below, 0 as '0' (stacked:
//                    'percent' '.0%')
//   yPrefix/ySuffix— prefix/suffix for the default Y formatter (vertical:
//                    categorical, date and stacked — not stacked: 'percent')
//   xTickFormat    — function(value) => string (horizontal: X axis labels,
//                    default as yTickFormat); date mode: function(date), default
//                    by the span in view, as on TimeSeries ('%H:%M' up to 36 h,
//                    '%b %d' up to 92 days,
//                    '%b' up to a year, "%b '%y" up to five, then '%Y')
//   timeZone       — date mode: 'local' (default) | 'UTC', the zone date strings
//                    without a zone are read in, timeframes cut in and the
//                    axis and tooltip name dates in; an instant stays that
//                    instant (the table: parseDate in core/utils.js, T-10)
//   timeframeAnchor / weekStart — date mode: the end the timeframes count
//                    back from ('dataEnd' default | 'now' | a date) and the
//                    first day of a week (Monday default), as on TimeSeries
//                    (RC-001)
//   tooltipFormat  — function(d, info) => html string; d is a copy of the row
//                    (label a string, value a number; date mode: date a Date,
//                    label ''), info its role fields { label, value, color }
//                    (date mode: { date, value, color }). The stacked mode
//                    passes one object, a segment { i, name, cat, v0, v1,
//                    value, total } with the role fields on it: label (= cat),
//                    series (= name), color, percent (value / total). The
//                    rule for every class (K-09): /charts/settings/#formatter-arguments
//
//   annotations    — event markers, as on Line: point/range on dates, line/band
//                    on values. Dated vertical bars only; the categorical,
//                    stacked and horizontal modes do not draw them and warn once.
//   annotationLabelHeight — px reserved above the chart for date labels (default: 22)
//
// The interactive legend (stacked mode; the base options legendInteractive
// and onLegendToggle, /charts/settings/): a click (Enter, Space) hides or
// shows a series, a double click keeps only it, Show all brings all back.
// A hidden series leaves the stacks — the segments above close up, its
// colour and those of the others stay — and its category keeps its slot.
//   legendRescale  — true (default): the value axis runs to the tallest
//                    stack of the shown series, and 'percent' bars are
//                    shares of what is shown (each fills 100%); false: the
//                    axis keeps every series, and 'percent' bars are shares
//                    of the whole bar (the top stays empty). The tooltip's
//                    percent and the segment's total follow the same base.
//   setSeriesVisible(names | null) — shows only these series (null: all), as
//                    the legend does but without onLegendToggle; chain it
//                    after setData. Series are named `name`, else
//                    'Series N'. The categorical and date modes have one
//                    series: their legend is a caption.

import * as d3 from 'd3';
import { Chart }              from '../core/Chart.js';
import { parseDate, byDate, resolveEase, motionDuration, annotationRoom, compactTickFormat, spanTimeFormat, spanTimeFormatter, barValueDomain, linearTickValues, timeKit } from '../core/utils.js';
import { renderGrid, renderGridX, renderAnnotations, renderAxisX, renderAxisY, thinBandLabels, fitTextNode, dayTicks, textWidth } from '../core/renderHelpers.js';
import { EntryMotion, entryTransition, ENTRY_DURATION } from '../core/entryMotion.js';
import { escapeHtml, tipDate, tipHeader, tipNum, tipRow } from '../core/html.js';
import { readBarWidth, fitBarWidth, timeSlot, barInset } from '../core/barLayout.js';

const SEG_SEP = String.fromCharCode(31); // stacked join-key separator (never in labels)

// Exactly `count` intervals over a niced stack domain. scale.ticks(count) aims
// for "approximately count" and can nearly double it — domain [0, 120] with
// count 4 yields 7 ticks at step 20. Dividing the niced domain keeps the
// requested density and always labels both ends of the scale.
function stackTickValues(scale, count) {
  const [d0, d1] = scale.domain();
  return d3.range(count + 1).map(i => d0 + (d1 - d0) * (i / count));
}

// d3.stackOffsetExpand with each bar divided by its row's `field` instead of
// the sum of its stacked values: the percent mode with legendRescale: false,
// where a bar is a share of the whole row, hidden series included, and its
// top stays empty. With nothing hidden the row's whole is that sum, added in
// the same order, so the bars equal stackOffsetExpand's.
const stackOffsetShareOf = field => (series, order) => {
  if (!series.length) return;
  for (let j = 0; j < series[0].length; j++) {
    const whole = series[0][j].data[field];
    if (whole) series.forEach(s => { s[j][1] /= whole; });
  }
  d3.stackOffsetNone(series, order);
};

// Horizontal category gutter (C-39): the default 65px, grown to the longest
// label plus the axis padding (3px) and a little air, up to 40% of the width.
const GUTTER_MIN   = 65;
const GUTTER_PAD   = 9;
const GUTTER_SHARE = 0.4;

// The default text of a bar's value (C-41): separators, no decimals on a
// whole number, up to two on a fraction — 1,234, 87,000, 0.4, 2.35.
const barValueText = d3.format(',.2~f');

export class Bar extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;

    // Margin defaults track the axis that owns each gutter (which axis that
    // is flips with the orientation). A hidden axis collapses its gutter so
    // the plot runs flush; an explicit margin always wins.
    const horizontal = options.orientation === 'horizontal';
    const yGutter    = options.showYAxis !== false;
    const xGutter    = options.showXAxis !== false;

    // Annotations mark the date axis of vertical bars; their labels take room
    // above the plot, as on Line (an explicit margin.top wins). Horizontal
    // bars have no date axis, so no room is kept.
    const ann = annotationRoom(options, !horizontal);

    super(selector, {
      height: 200,
      margin: {
        top:    options.margin?.top    ?? Math.max(12, ann.top),
        // the value axis gutter: 64px, as Line's (K-10; it was 65)
        right:  options.margin?.right  ?? (!horizontal && yGutter ? 64 : 0),
        left:   options.margin?.left   ?? (horizontal && yGutter ? 65 : 0),
        bottom: options.margin?.bottom ?? (xGutter ? (horizontal ? 16 : 8) : 0),
      },
      ...restOptions,
    });
    // the sides the page's own margin sets: those gutters stay as given (RC-060)
    this._pageMargin = options.margin ?? {};

    this._data          = [];
    this._isTimeSeries  = false;
    this._isStacked     = false;
    this._hasUserLegend = options.legend != null;
    this._series        = [];
    this._categories    = [];
    this._entry         = new EntryMotion();   // once per instance (C-16)
    // Horizontal labels size their gutter unless the page set margin.left
    // or hid the category axis (C-39) — or the margins were set from outside
    // since (a MultiChart breakpoint replaces options.margin).
    this._autoGutter    = horizontal && yGutter && options.margin?.left == null;
    this._builtMargin   = this.options.margin;
    this._labelRoom     = null;
    this._annotations   = ann.annotations;
    this._annLabelHeight = ann.labelHeight;
    this._warnedAnnotations = false;
    this._warnedHorizontalDates = false;
    this.tooltip;   // made now: its element keeps its place in the card

    this._initSVG();
  }

  setData(data) {
    // Series-major shape [{ name, values: [...] }] switches on the stacked mode.
    const first = Array.isArray(data) ? data[0] : null;
    if (first && Array.isArray(first.values)) return this._setStackedData(data);

    const isTimeSeries = Array.isArray(data) && data[0] && 'date' in data[0] && 'value' in data[0];

    this._isStacked    = false;
    this._isTimeSeries = isTimeSeries;
    // Rows are copied and coerced (the caller's array is never touched):
    // dates parsed and sorted, labels as strings (a numeric year label must
    // still take labelMaxLength), values as numbers (CSV strings would
    // otherwise compare as text in the domain).
    this._data = isTimeSeries
      ? data
        .map(d => ({
          ...d,
          date: parseDate(d.date, this._zone()),
          value: +d.value,
          label: d.label ?? '',
        }))
        .filter(d => d.date && Number.isFinite(d.value))
        .sort(byDate)
      : (Array.isArray(data) ? data : [])
        .filter(d => d && typeof d === 'object')
        .map(d => {
          // A row without a readable value keeps its category on the axis
          // but draws no bar and no value label.
          const v = d.value == null || d.value === '' ? NaN : +d.value;
          return Number.isFinite(v)
            ? { ...d, label: String(d.label ?? ''), value: v }
            : { ...d, label: String(d.label ?? ''), value: null, missing: true };
        });

    this._refreshViewForData();
    this.render();
    return this;
  }

  // Only dated vertical bars have a time axis: the view API (timeframes,
  // navigator, setView) works on it, and every other mode reports no extent.
  _hasDateAxis() {
    return this._isTimeSeries && this.options.orientation !== 'horizontal';
  }

  _dataExtent() {
    return this._hasDateAxis() && this._data.length
      ? d3.extent(this._data, d => d.date)
      : null;
  }

  _getNavigatorData() {
    return this._hasDateAxis() && this._data.length ? this._data : null;
  }

  // The timeframe buttons and the navigator strip are built with the chart,
  // before it knows its data. A mode without a date axis (categorical,
  // stacked, horizontal) hides them, so no inert buttons or empty strip are
  // left on the card; dated vertical bars show them again. (Bar has no
  // Log toggle, so the range row holds only the timeframes.) A header
  // with nothing else in it — no title, subtitle or legend — goes with it.
  _showTimeControls(on) {
    const row = this._rangeRowEl;
    if (row) {
      row.style.display = on ? '' : 'none';
      const header = row.parentNode;
      if (header && [...header.children].every(el => el === row)) header.style.display = on ? '' : 'none';
    }
    // Before the plot is measured, both ways: no navigator data → the strip
    // hides; back on dates it shows again and takes its height.
    this._syncNavigator();
  }

  _initSVG() {
    this._createPlot();

    this.gGrid  = this.g.append('g');
    this.gBars  = this.g.append('g');
    // Over the bars, but the pointer passes through to them (bar tooltips).
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations').attr('pointer-events', 'none');
    this.gAxisX = this.g.append('g');
    this.gAxisY = this.g.append('g').classed('rc-axis', true);  // value axis — numeric font (rare-charts.css)
  }

  _formatLabel(label) {
    const max = this.options.labelMaxLength;
    if (!max || label.length <= max) return label;
    return label.slice(0, max).trimEnd() + '\u2026';
  }

  // A bar's colour: its row's own, then barColor, then the accent (B-01).
  _barColor(d) {
    return d.color || this.options.barColor || this.theme.accent;
  }

  // The role fields of a bar (K-09): formatters get the row first, as
  // before, and these second; the colour as hex (core/paint.js).
  _barRole(d) {
    const color = this._hex(this._barColor(d));
    return this._isTimeSeries
      ? { date: d.date, value: d.value, color }
      : { label: d.label, value: d.value, color };
  }

  // The default (RC-082): a bar's dot in its colour, its label and its
  // value; on dates, the date above the row.
  _tooltipHtml(d) {
    if (this.options.tooltipFormat) return this.options.tooltipFormat(d, this._barRole(d));
    const opts = { swatch: 'dot', color: this._hex(this._barColor(d)) };
    const value = escapeHtml(d3.format(',')(d.value));
    return d.label
      ? tipRow(escapeHtml(d.label), value, opts)
      : tipDate(escapeHtml(timeKit(this._zone()).format('%b %d, %Y')(d.date))) + tipRow('', value, opts);
  }

  _dataLayers() {
    return [this.gGrid, this.gBars, this.gAnnotations, this.gAxisX, this.gAxisY];
  }

  // Annotations live on the date axis: only the vertical time-series mode
  // draws them. The other modes clear the layer — a switch of data shape
  // leaves nothing behind — and say once that they ignore the option (B-04).
  _skipAnnotations(mode) {
    this.gAnnotations.selectAll('*').remove();
    if (!this._annotations.length || this._warnedAnnotations) return;
    this._warnedAnnotations = true;
    console.warn(`RareCharts.Bar: annotations need dated vertical bars ({ date, value } rows) — not drawn in the ${mode} mode`);
  }

  render() {
    if (this._isStacked) {
      this._showTimeControls(false);
      this._renderStacked();
      if (this.options.orientation !== 'horizontal') this._fitGutters([[this.gAxisY, 'right']]);   // RC-060
      return;
    }
    if (!this._data.length) { this._renderEmpty(); return; }

    // Before the plot is measured: hidden controls give their height back.
    const horizontal = this.options.orientation === 'horizontal';
    this._showTimeControls(this._hasDateAxis());
    if (horizontal && this._isTimeSeries && !this._warnedHorizontalDates) {
      this._warnedHorizontalDates = true;
      console.warn("RareCharts.Bar: dated rows ({ date, value }) need orientation 'vertical' — horizontal bars have no date axis and draw them without labels");
    }

    if (horizontal) this._fitCategoryGutter(this._data.map(d => d.label));

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t          = this.theme;
    const animate    = this.options.animate ?? true;   // the entry timeline decides when (C-16)
    const duration   = motionDuration(this.options.duration ?? ENTRY_DURATION);
    const stagger    = this.options.stagger  ?? 0;
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');
    const barFill    = d => this._barColor(d);   // B-01: row colour, then barColor, then accent

    const onBarOver = (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 0.75);
      const [mx, my] = d3.pointer(event, this.container);
      this._tooltip.show(mx, my, this._tooltipHtml(d));
    };
    const onBarOut = (event) => {
      d3.select(event.currentTarget).attr('opacity', 1);
      this._tooltip.hide();
    };

    if (!horizontal && this._isTimeSeries) {
      const fullExtent = this._getDataExtent();
      const viewExtent = this._resolveViewExtent(fullExtent);
      const visible = this._data.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]);
      if (!visible.length) { this._renderEmpty(); return; }
      this._syncTimeframeButtons(fullExtent, viewExtent);
      this._syncNavigator();
      this._renderTimeSeries({ data: visible, W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut, viewExtent });
      this._fitGutters([[this.gAxisY, 'right']]);   // the value gutter takes the room its labels need (RC-060)
      return;
    }

    if (horizontal) {
      this._renderHorizontal({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut });
    } else {
      this._renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut });
      this._fitGutters([[this.gAxisY, 'right']]);   // RC-060
    }
  }

  // ─── Horizontal ───────────────────────────────────────────────────────────

  _renderHorizontal({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    this._skipAnnotations('horizontal');
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    const y = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, H])
      .padding(0.25);
    // B-07: barWidth is the thickness, centred in the band and capped at the
    // band step (neighbours touch, never overlap).
    const bh = fitBarWidth(this.options.barWidth, y.step()) ?? y.bandwidth();
    const by = d => y(d.label) + (y.bandwidth() - bh) / 2;

    // The domain always includes 0 — bars grow from the zero baseline, and
    // negative values extend to the left of it — with the 8% headroom of the
    // vertical modes and Line (barValueDomain; it was 10% of each end value).
    const maxVal = d3.max(this._data, d => d.value) ?? 0;   // all values missing → an empty scale at 0
    const minVal = d3.min(this._data, d => d.value) ?? 0;
    const x = d3.scaleLinear()
      .domain(barValueDomain(minVal, maxVal, { tickValues: this.options.xTickValues }))
      .range([0, W]);

    const showValues     = this.options.showValues     ?? false;
    const valueOffset    = this.options.valueOffset    ?? 6;
    const valueInsideGap = this.options.valueInsideGap ?? 42;
    const valueFormat    = this.options.valueFormat    ?? (d => barValueText(d.value));
    const showGrid       = this.options.showGrid       ?? true;

    // A value label goes inside its bar only when it fits there; otherwise it
    // sits past the bar end. A short bar near the plot edge (a small negative
    // value next to the left edge) has room for neither, so the domain is
    // widened on that side until the outside label fits.
    const labelW = new Map();
    // A label also needs the bar's thickness: on a bar thinner than the text
    // (a small barWidth, B-07) it stays outside, where it is readable.
    let thick = true;
    if (showValues) {
      const probe = this.gBars.append('text').attr('class', 'rc-bar-value');
      let labelH = 0;
      this._data.filter(d => !d.missing).forEach(d => {
        const text = valueFormat(d, this._barRole(d));
        probe.text(text);
        // 0 before layout (or no SVG layout at all): estimate from the
        // monospace numeric font.
        labelW.set(d.label, textWidth(probe.node(), 7, text));
        labelH = Math.max(labelH, probe.node().getBBox?.().height || 14);
      });
      probe.remove();
      thick = bh >= labelH * 0.75;   // the digits, not the whole line box

      let padL = 0, padR = 0;
      for (let pass = 0; pass < 3; pass++) {
        const xs = x.copy().range([padL, W - padR]);
        let needL = 0, needR = 0;
        this._data.filter(d => !d.missing).forEach(d => {
          const end = xs(d.value), lw = labelW.get(d.label);
          if (thick && Math.abs(end - xs(0)) >= lw + valueOffset * 2) return;  // fits inside
          const short = lw + valueOffset + 2 - (d.value < 0 ? end : W - end);
          if (short <= 0) return;                                      // fits outside
          if (d.value < 0) needL = Math.max(needL, short);
          else             needR = Math.max(needR, short);
        });
        if (!needL && !needR) break;
        padL = Math.min(padL + needL, W * 0.3);
        padR = Math.min(padR + needR, W * 0.3);
      }
      if (padL || padR) {
        const xs = x.copy().range([padL, W - padR]);
        x.domain([xs.invert(0), xs.invert(W)]);
      }
    }
    const zeroX = x(0);
    const xTickVals   = this.options.xTickValues ?? x.ticks(this.options.xTicks ?? 4);
    const xTickFormat = this.options.xTickFormat ?? compactTickFormat(xTickVals);   // C-30

    // Grid — vertical lines
    if (showGrid) {
      // the lines at the labels' values: an own xTickValues counts for both (RC-075)
      renderGridX(this.gGrid, x, H, this.options.xTicks ?? 4, t, this.options.xTickValues ?? null);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    // Bars
    const drawn = this._data.filter(d => !d.missing);
    const phase = this._entry.phase(animate ? duration + Math.max(0, drawn.length - 1) * stagger : 0);
    const grow  = phase !== 'none';
    const bars = this.gBars.selectAll('.rc-bar')
      .data(drawn, d => d.label)
      .join(
        enter => enter.append('rect')
          .attr('class',  'rc-bar')
          .attr('x',      grow ? zeroX : d => Math.min(zeroX, x(d.value)))
          .attr('y',      by)
          .attr('height', bh)
          .attr('width',  grow ? 0 : d => Math.abs(x(d.value) - zeroX)),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — y/height depend on the current scale.
    // The fill is set here too, so a row's new colour shows after setData.
    bars.attr('y', by).attr('height', bh).attr('fill', barFill);

    // Grow once per instance, on the entry timeline (see _entryMove).
    this._entryMove(bars, phase, { duration, stagger, ease }, sel => sel
      .attr('x',     d => Math.min(zeroX, x(d.value)))
      .attr('width', d => Math.abs(x(d.value) - zeroX)));

    // Value labels
    if (showValues) {
      const placeValue = (sel) => {
        sel.each((d, i, nodes) => {
          // The label sits just past the bar's value end — to the right of a
          // positive bar, to the left of a negative one — and flips inside
          // the bar when the space between the end and the chart edge is
          // tight, but only if it fits inside (the domain was widened above
          // so the outside position always has room).
          const end = x(d.value);
          const neg = d.value < 0;
          const lw = labelW.get(d.label);
          const room = neg ? end : W - end;
          const fitsInside  = thick && Math.abs(end - zeroX) >= lw + valueOffset * 2;
          const fitsOutside = room >= lw + valueOffset + 2;
          const inside = fitsInside && (room < valueInsideGap || !fitsOutside);
          const xPos = (neg !== inside) ? end - valueOffset : end + valueOffset;
          const anchor = (neg ? !inside : inside) ? 'end' : 'start';
          d3.select(nodes[i])
            .attr('x',            xPos)
            .attr('text-anchor',  anchor)
            .attr('fill',         inside ? t.bg  : t.text);
        });
      };

      const values = this.gBars.selectAll('.rc-bar-value')
        .data(drawn, d => d.label)
        .join(enter => enter.append('text')
          .attr('class', 'rc-bar-value')
          .attr('opacity', grow ? 0 : 1))
        .attr('y',     d => y(d.label) + y.bandwidth() / 2)
        .attr('dy',    '0.35em')
        .text(d => valueFormat(d, this._barRole(d)));

      // Placed on this render's scale, every render: no transition end or
      // timer from an earlier render moves a label later (C-25). During the
      // entry a label fades in at its place along with its bar.
      placeValue(values);
      this._entryMove(values, phase, { duration, stagger, ease }, sel => sel.attr('opacity', 1));
    } else {
      this.gBars.selectAll('.rc-bar-value').remove();
    }

    this._renderCategoryAxis(y, 'left', H);                 // categories on the left
    this._renderValueAxisX(x, H, xTickVals, xTickFormat);   // values at the bottom
  }

  // ─── Vertical ─────────────────────────────────────────────────────────────

  _renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    this._skipAnnotations('categorical');
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    const x = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, W])
      .padding(0.25);
    // B-07: barWidth centred in the band, capped at the band step.
    const bw = fitBarWidth(this.options.barWidth, x.step()) ?? x.bandwidth();
    const bx = d => x(d.label) + (x.bandwidth() - bw) / 2;

    const maxVal = d3.max(this._data, d => d.value) ?? 0;   // all values missing → an empty scale at 0
    const minVal = d3.min(this._data, d => d.value) ?? 0;
    const yTicks = this.options.yTicks ?? 4;
    // Bars grow from a zero baseline, so the domain always includes 0 and
    // extends to the data on both sides — negative bars hang below it — with
    // Line's 8% headroom and ticks inside (barValueDomain): no rounding up to
    // the next round number (156k used to run to 200k).
    const yTickValues = this.options.yTickValues ?? null;
    const y = d3.scaleLinear()
      .domain(barValueDomain(minVal, maxVal, { tickValues: yTickValues }))
      .range([H, 0]);
    const drawn = this._data.filter(d => !d.missing);
    const values = this._valueLabels(drawn);
    if (values) this._roomForValues(y, drawn, values);
    const zeroY = y(0);
    const resolvedYTickValues = yTickValues ?? linearTickValues(...y.domain(), yTicks);

    const prefix      = this.options.yPrefix ?? '';
    const suffix      = this.options.ySuffix ?? '';
    const yTickBase   = compactTickFormat(resolvedYTickValues);   // C-30: by the tick step
    const yTickFormat = this.options.yTickFormat ?? (d => `${prefix}${yTickBase(d)}${suffix}`);
    const showGrid    = this.options.showGrid  ?? true;

    // Grid — horizontal lines
    if (showGrid) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    // Bars
    const phase = this._entry.phase(animate ? duration + Math.max(0, drawn.length - 1) * stagger : 0);
    const grow  = phase !== 'none';
    const bars = this.gBars.selectAll('.rc-bar')
      .data(drawn, d => d.label)
      .join(
        enter => enter.append('rect')
          .attr('class',  'rc-bar')
          .attr('x',      bx)
          .attr('width',  bw)
          .attr('y',      grow ? zeroY : d => y(Math.max(0, d.value)))
          .attr('height', grow ? 0     : d => Math.abs(y(d.value) - zeroY)),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — x/width depend on the current scale.
    // The fill is set here too, so a row's new colour shows after setData.
    bars.attr('x', bx).attr('width', bw).attr('fill', barFill);

    // Grow once per instance, on the entry timeline (see _entryMove).
    this._entryMove(bars, phase, { duration, stagger, ease }, sel => sel
      .attr('y',      d => y(Math.max(0, d.value)))
      .attr('height', d => Math.abs(y(d.value) - zeroY)));

    this._drawVerticalValues(drawn, values, d => x(d.label) + x.bandwidth() / 2, d => d.label, y,
      { W, barSpan: d => [bx(d), bx(d) + bw], phase, grow, duration, stagger, ease });

    this._renderCategoryAxis(x, 'bottom', H);                                // categories at the bottom
    this._renderValueAxisY(y, W, yTicks, resolvedYTickValues, yTickFormat);   // values on the right
  }

  _renderTimeSeries({ data, W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut, viewExtent }) {
    this.gAxisX.classed('rc-axis', true).classed('rc-axis-cat', false);  // numeric (time) axis
    // Bar width: an explicit barWidth (B-07) capped at the smallest gap between
    // dates, or the ratio share of that gap within 2–48px. The range is inset
    // by half a bar, so the first and last bars end xPad inside the plot
    // instead of running past it (the C-27 defect, here without a clip).
    const xPad    = 8;
    const fixed   = readBarWidth(this.options.barWidth);
    const ratio   = this.options.barWidthRatio ?? 0.72;
    const slotAt  = timeSlot(data.map(d => +d.date), viewExtent, L => L);
    const widthAt = L => fixed !== undefined
      ? Math.max(0, Math.min(fixed, slotAt(L)))   // a plot narrower than 2·xPad: no bar, not a negative width
      : Math.max(2, Math.min(48, slotAt(L) * ratio));
    const inset = barInset(W - 2 * xPad, widthAt);
    const barW  = widthAt(W - 2 * xPad - 2 * inset);
    // d3's local or UTC scale: the zone's days and months (T-10)
    const zone  = this._zone();
    const x = timeKit(zone).scale()
      .domain(viewExtent)
      .range([xPad + inset, W - xPad - inset]);

    const minValue = d3.min(data, d => d.value) ?? 0;
    const maxValue = d3.max(data, d => d.value) ?? 0;
    const yTicks = this.options.yTicks ?? 4;
    // As the categorical mode: zero in, 8% headroom, ticks inside.
    const yTickValues = this.options.yTickValues ?? null;
    const y = d3.scaleLinear()
      .domain(barValueDomain(minValue, maxValue, { tickValues: yTickValues }))
      .range([H, 0]);
    const values = this._valueLabels(data);
    if (values) this._roomForValues(y, data, values);
    const resolvedYTickValues = yTickValues ?? linearTickValues(...y.domain(), yTicks);

    const prefix      = this.options.yPrefix ?? '';
    const suffix      = this.options.ySuffix ?? '';
    const yTickBase   = compactTickFormat(resolvedYTickValues);   // C-30: by the tick step
    const yTickFormat = this.options.yTickFormat ?? (d => `${prefix}${yTickBase(d)}${suffix}`);
    // The date default follows the span in view, as on TimeSeries (C-31):
    // '%b' alone repeated a month on a short span ("Jan Jan Jan Feb").
    const xTickFormat = this.options.xTickFormat ?? spanTimeFormatter(viewExtent, zone);
    let xTicks = this.options.xTicks ?? 6;
    if (!this.options.xTickFormat && typeof xTicks === 'number' && spanTimeFormat(viewExtent) === '%b %d') {
      xTicks = dayTicks(viewExtent, xTicks, zone) ?? xTicks;   // one tick per midnight on a span of a few days
    }
    const showGrid    = this.options.showGrid  ?? true;
    const showXAxis   = this.options.showXAxis ?? true;

    if (showGrid) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    const zeroY = y(0);

    const phase = this._entry.phase(animate ? duration + Math.max(0, data.length - 1) * stagger : 0);
    const grow  = phase !== 'none';
    const bars = this.gBars.selectAll('.rc-bar')
      .data(data, d => +d.date)
      .join(
        enter => enter.append('rect')
          .attr('class', 'rc-bar')
          .attr('x', d => x(d.date) - barW / 2)
          .attr('width', barW)
          .attr('y', grow ? zeroY : d => y(Math.max(0, d.value)))
          .attr('height', grow ? 0 : d => Math.abs(y(d.value) - zeroY)),
        update => update,
        exit => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout', onBarOut);

    bars.attr('x', d => x(d.date) - barW / 2).attr('width', barW).attr('fill', barFill);

    // Grow once per instance, on the entry timeline (see _entryMove).
    this._entryMove(bars, phase, { duration, stagger, ease }, sel => sel
      .attr('y', d => y(Math.max(0, d.value)))
      .attr('height', d => Math.abs(y(d.value) - zeroY)));

    this._drawVerticalValues(data, values, d => x(d.date), d => +d.date, y,
      { W, barSpan: d => [x(d.date) - barW / 2, x(d.date) + barW / 2], phase, grow, duration, stagger, ease });

    if (showXAxis) {
      // The shared time axis: it thins labels that would overlap, as on
      // Line — the span-aware formats are longer than the old '%b'.
      renderAxisX(this.gAxisX, x, H, xTickFormat, t, xTicks);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    this._renderValueAxisY(y, W, yTicks, resolvedYTickValues, yTickFormat);

    // Annotations — on the bars' own scales: dates (point, range) on the
    // time axis, levels (value, yFrom/yTo) on the value axis (B-04).
    // levels span the plot past the inset edge bars (C-27), as on DualAxes
    renderAnnotations(this.gAnnotations, this._annotations, x, () => y, H, this._annLabelHeight, t, [xPad, W - xPad]);
  }

  // ─── Value labels on vertical bars ─────────────────────────────────────────

  // showValues on a vertical mode: each drawn bar's label text and width,
  // and the height of the line, measured on a probe in the labels' own class
  // (0 before layout: estimated from the numeric font). null when off.
  _valueLabels(drawn) {
    if (!(this.options.showValues ?? false)) return null;
    const format = this.options.valueFormat ?? (d => barValueText(d.value));
    const probe  = this.gBars.append('text').attr('class', 'rc-bar-value');
    const text = new Map(), width = new Map();
    let height = 0;
    drawn.forEach(d => {
      const s = format(d, this._barRole(d));
      probe.text(s);
      text.set(d, s);
      width.set(d, textWidth(probe.node(), 7, s));
      height = Math.max(height, probe.node().getBBox?.().height || 14);
    });
    probe.remove();
    return { text, width, height, offset: this.options.valueOffset ?? 6 };
  }

  // Room for the labels past the bar ends: the value domain grows until a
  // label above the tallest bar, and below the deepest negative one, fits
  // inside the plot. The ticks are picked afterwards, inside the new domain.
  _roomForValues(y, drawn, { height, offset }) {
    const need = height + offset;
    const [H] = y.range();
    for (let pass = 0; pass < 3; pass++) {
      let top = 0, bottom = 0;
      drawn.forEach(d => {
        const end = y(d.value);
        if (d.value < 0) bottom = Math.max(bottom, end + need - H);
        else             top    = Math.max(top, need - end);
      });
      if (top < 0.5 && bottom < 0.5) return;
      const ys = y.copy().range([H - bottom, top]);
      y.domain([ys.invert(H), ys.invert(0)]);
    }
  }

  // The labels: centred on the bar — moved in just enough to stay inside the
  // plot at its edges — above a positive one (or zero), below a negative
  // one, in the text colour. Where they would collide, the larger values
  // win: labels are placed from the largest |value| down, and one that would
  // come closer than 6px side by side (2px above or below) to a label
  // already placed, or overprint another bar, is left out — the peaks keep
  // theirs on a narrow card; the tooltip keeps every value. They fade in at
  // their place with the bars (the entry timeline).
  _drawVerticalValues(drawn, values, cx, key, y, { W, barSpan, phase, grow, duration, stagger, ease }) {
    if (!values) { this.gBars.selectAll('.rc-bar-value').remove(); return; }
    const { text, width, height, offset } = values;
    const zero = y(0);
    const at = d => {
      const half = width.get(d) / 2;
      return Math.max(Math.min(cx(d), W - half), half);
    };
    const ly = d => (d.value < 0 ? y(d.value) + offset : y(d.value) - offset);
    const box = d => {
      const half = width.get(d) / 2, top = d.value < 0 ? ly(d) : ly(d) - height;
      return { x0: at(d) - half, x1: at(d) + half, y0: top, y1: top + height };
    };
    const bars = drawn.map(d => {
      const [x0, x1] = barSpan(d);
      return { d, x0, x1, y0: Math.min(y(d.value), zero), y1: Math.max(y(d.value), zero) };
    });
    const hits = (a, b, gx, gy) => a.x0 < b.x1 + gx && b.x0 < a.x1 + gx && a.y0 < b.y1 + gy && b.y0 < a.y1 + gy;
    const placed = [];
    [...drawn]
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))   // stable: equal values in order
      .forEach(d => {
        const b = box(d);
        if (placed.some(p => hits(b, p.box, 6, 2))) return;
        if (bars.some(r => r.d !== d && hits(b, r, 0, 0))) return;
        placed.push({ d, box: b });
      });
    const keep = new Set(placed.map(p => p.d));
    const sel = this.gBars.selectAll('.rc-bar-value')
      .data(drawn.filter(d => keep.has(d)), key)
      .join(enter => enter.append('text')
        .attr('class', 'rc-bar-value')
        .attr('opacity', grow ? 0 : 1))
      .attr('x', at)
      .attr('y', ly)
      .attr('dy', d => (d.value < 0 ? '0.71em' : null))
      .attr('text-anchor', 'middle')
      .attr('fill', this.theme.text)
      .text(d => text.get(d));
    this._entryMove(sel, phase, { duration, stagger, ease }, s => s.attr('opacity', 1));
  }

  // ─── Stacked (multi-series composition)─────────────────────────────────────

  _setStackedData(data) {
    this._isStacked    = true;
    this._isTimeSeries = false;

    this._series = (data ?? []).map(s => ({
      name:  s.name ?? '',
      color: s.color,
      values: (s.values ?? []).map(v => ({ label: String(v.label ?? ''), value: +v.value })),
    }));

    // Categories are the ordered union of labels across every series, so a
    // series that omits a category simply contributes 0 there.
    const seen = new Set();
    this._categories = [];
    this._series.forEach(s => s.values.forEach(v => {
      if (v.label && !seen.has(v.label)) { seen.add(v.label); this._categories.push(v.label); }
    }));

    this._ensureStackedLegend();
    this.render();
    return this;
  }

  // A stacked series' colour: its own, then the palette, then the accent.
  // By its place in the data, so hiding a series recolours none.
  _seriesColor(i) {
    const palette = this.theme.colors ?? [];
    return this._series[i].color ?? palette[i % palette.length] ?? this.theme.accent;
  }

  // A stacked series' name — in its tooltip and legend item, and as a
  // string its key in the legend and the hidden set: `name`, else 'Series N'.
  _seriesName(i) {
    return this._series[i].name || `Series ${i + 1}`;
  }

  // The series the legend toggles: the stacked ones, in data order. The
  // categorical and date modes draw one series and list none, so a legend
  // there stays a caption.
  _legendSeries() {
    if (!this._isStacked) return [];
    return this._series.map((_, i) => ({ key: this._seriesName(i), color: this._seriesColor(i) }));
  }

  // Shows only the stacked series named (null: all) and redraws; no
  // onLegendToggle (the base's _setVisibleKeys). Chain it after setData.
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  // Auto-build a legend from the series names unless the caller passed their
  // own. Its items name their series (`series`), so they are toggles. The
  // header is built once, when the chart has no legend element yet: later
  // the render's legend sync updates the items in place, so the element —
  // and the focus in it — survive a new setData.
  _ensureStackedLegend() {
    if (!this._hasUserLegend) {
      this.options.legend = this._series.map((s, i) => ({
        label:  this._seriesName(i),
        series: this._seriesName(i),
        type:   'bar',
        color:  this._seriesColor(i),
      }));
    }
    if (!this._legendEl) this._renderHeader();
  }

  // The stack rows, one per category. A hidden series counts 0 in its row,
  // so its segments drop out and those above close up; its key — the series
  // index — stays, so colours and segment keys do not move. `_total` sums
  // the shown series, `_totalAll` every one.
  //
  // The base (legendRescale): what is shown — the value axis runs to the
  // tallest shown stack, a 'percent' bar is the shares of its shown total —
  // or, with legendRescale: false or nothing drawn, the whole: the axis
  // keeps every series, a 'percent' bar is shares of the whole row (its top
  // stays empty). `baseField` names the row field of that base, the
  // segments' `total`.
  _computeStack() {
    const keys = this._series.map((_, i) => String(i));
    const shown = this._series.map((_, i) => this._isShown(String(this._seriesName(i))));
    const rows = this._categories.map(cat => {
      const row = { label: cat, _total: 0, _totalAll: 0 };
      this._series.forEach((s, i) => {
        const hit = s.values.find(v => v.label === cat);
        const val = hit && Number.isFinite(hit.value) && hit.value > 0 ? hit.value : 0;
        row[String(i)] = shown[i] ? val : 0;
        if (shown[i]) row._total += val;
        row._totalAll += val;
      });
      return row;
    });

    const percent = this.options.stacked === 'percent';
    const shownMax = d3.max(rows, r => r._total) || 0;
    const whole = !this._legendRescale() || !(shownMax > 0);
    const gen = d3.stack().keys(keys);
    if (percent) gen.offset(whole ? stackOffsetShareOf('_totalAll') : d3.stackOffsetExpand);

    const maxTotal = percent ? 1 : (whole ? (d3.max(rows, r => r._totalAll) || 0) : shownMax);
    return { layers: gen(rows), maxTotal, percent, baseField: whole ? '_totalAll' : '_total' };
  }

  _stackSegments(layers, baseField) {
    const segs = [];
    layers.forEach((layer, i) => {
      layer.forEach((d, j) => {
        const value = d.data[String(i)];
        if (!(value > 0)) return;
        const name  = this._seriesName(i);
        const total = d.data[baseField];
        // The segment is the formatters' one argument: it carries the role
        // fields itself (K-09) — label, series, color, percent.
        segs.push({
          i,
          name,
          cat:   this._categories[j],
          v0:    d[0],
          v1:    d[1],
          value,
          total,
          label:   this._categories[j],
          series:  name,
          color:   this._hex(this._seriesColor(i)),   // the payload's colour: hex
          percent: total > 0 ? value / total : 0,
        });
      });
    });
    return segs;
  }

  _segTooltipHtml(seg) {
    if (this.options.tooltipFormat) return this.options.tooltipFormat(seg);
    const valFmt = this.options.valueFormat ?? (d => d3.format(',')(d.value));
    const pct    = seg.total > 0 ? seg.value / seg.total : 0;
    // the category above (RC-082); the series' row, its share under it
    return tipHeader(escapeHtml(seg.cat), { muted: true })
      + tipRow(escapeHtml(seg.name), escapeHtml(valFmt(seg)), {
        swatch: 'dot', color: seg.color, note: tipNum(d3.format('.1%')(pct)),
      });
  }

  _renderStacked() {
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    if (!this._series.length || !this._categories.length) { this._renderEmpty(); return; }
    const horizontal = this.options.orientation === 'horizontal';
    if (horizontal) this._fitCategoryGutter(this._categories);
    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;
    this._skipAnnotations('stacked');

    const t = this.theme;
    const colorFor = i => this._seriesColor(i);
    const { layers, maxTotal, percent, baseField } = this._computeStack();
    const segs = this._stackSegments(layers, baseField);

    // Segments fade in once per instance, on the entry timeline (C-16).
    const duration   = motionDuration(this.options.duration ?? ENTRY_DURATION);
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');
    const phase      = this._entry.phase((this.options.animate ?? true) ? duration : 0);
    const segEnter   = enter => enter.append('rect').attr('opacity', phase !== 'none' ? 0 : 1);

    const showGrid  = this.options.showGrid  ?? true;

    const onOver = (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 0.8);
      const [mx, my] = d3.pointer(event, this.container);
      this._tooltip.show(mx, my, this._segTooltipHtml(d));
    };
    const onOut = (event) => {
      d3.select(event.currentTarget).attr('opacity', 1);
      this._tooltip.hide();
    };

    // Shared value scale [0, total]; category scale is a band on the other axis.
    const cat = d3.scaleBand().domain(this._categories).padding(0.25)
      .range(horizontal ? [0, H] : [0, W]);
    // B-07: barWidth is the whole column (thickness when horizontal).
    const cw   = fitBarWidth(this.options.barWidth, cat.step()) ?? cat.bandwidth();
    const cpos = d => cat(d.cat) + (cat.bandwidth() - cw) / 2;
    // Value-axis labels: '.0%' in the percent mode, else by the tick step (C-30).
    const valFmtFor = ticks => (percent ? d3.format('.0%') : compactTickFormat(ticks));

    if (horizontal) {
      const xTicks = this.options.xTicks ?? 4;
      const x = d3.scaleLinear().domain([0, maxTotal || 1]).nice(xTicks).range([0, W]);
      const xTickValues = this.options.xTickValues ?? stackTickValues(x, xTicks);

      if (showGrid) { renderGridX(this.gGrid, x, H, xTicks, t, xTickValues); }
      else { this.gGrid.selectAll('*').remove(); }

      const rects = this.gBars.selectAll('.rc-bar-seg')
        .data(segs, d => d.cat + SEG_SEP + d.i)
        .join(segEnter)
        .attr('class', 'rc-bar-seg')
        .attr('y',      cpos)
        .attr('height', cw)
        .attr('x',      d => x(d.v0))
        .attr('width',  d => Math.max(0, x(d.v1) - x(d.v0)))
        .attr('fill',   d => colorFor(d.i))
        .on('mouseover', onOver).on('mouseout', onOut);
      this._entryMove(rects, phase, { duration, stagger: 0, ease }, sel => sel.attr('opacity', 1));

      this._renderCategoryAxis(cat, 'left', H);
      this._renderValueAxisX(x, H, xTickValues, this.options.xTickFormat ?? valFmtFor(xTickValues));
      return;
    }

    // Vertical
    // Stacks keep their documented axis: the niced total divided into exactly
    // yTicks intervals, labelled at both ends (stackTickValues).
    const yTicks = this.options.yTicks ?? 4;
    const y = d3.scaleLinear().domain([0, maxTotal || 1]).nice(yTicks).range([H, 0]);
    const yTickValues = this.options.yTickValues ?? stackTickValues(y, yTicks);

    if (showGrid) { renderGrid(this.gGrid, y, W, yTicks, t, yTickValues); }
    else { this.gGrid.selectAll('*').remove(); }

    const rects = this.gBars.selectAll('.rc-bar-seg')
      .data(segs, d => d.cat + SEG_SEP + d.i)
      .join(segEnter)
      .attr('class', 'rc-bar-seg')
      .attr('x',      cpos)
      .attr('width',  cw)
      .attr('y',      d => y(d.v1))
      .attr('height', d => Math.max(0, y(d.v0) - y(d.v1)))
      .attr('fill',   d => colorFor(d.i))
      .on('mouseover', onOver).on('mouseout', onOut);
    this._entryMove(rects, phase, { duration, stagger: 0, ease }, sel => sel.attr('opacity', 1));

    this._renderCategoryAxis(cat, 'bottom', H);

    // yPrefix / ySuffix dress the default Y labels as in the other vertical
    // modes; a percent axis keeps its own unit.
    const prefix = this.options.yPrefix ?? '';
    const suffix = this.options.ySuffix ?? '';
    const yBase  = valFmtFor(yTickValues);
    const yFmt   = this.options.yTickFormat
      ?? (percent ? yBase : (d => `${prefix}${yBase(d)}${suffix}`));

    this._renderValueAxisY(y, W, yTicks, yTickValues, yFmt);
  }

  // Bars, segments and value labels move on the chart's entry timeline
  // (C-16): once per instance, mark i from i·stagger ms after the first
  // drawing render. A render in the middle of it — fonts.ready and the first
  // ResizeObserver callback land right after setData, a resize or new data
  // may follow — retargets each mark from where it stands to this render's
  // geometry for the time left, instead of finalising (the growth was never
  // seen) or starting over. 'none': the end state at once. `apply` sets the
  // target attributes.
  _entryMove(sel, phase, { duration, stagger, ease }, apply) {
    if (phase === 'none') { apply(sel.interrupt()); return; }
    const { moving, settled } = entryTransition(sel, this._entry, {
      delay: (d, i) => i * stagger, duration, ease,
    });
    apply(settled);
    apply(moving);
  }

  // ─── Axes ──────────────────────────────────────────────────────────────────

  // gAxisX holds the category axis (the time axis in the date mode), gAxisY
  // the value axis; the orientation decides where each one sits. showXAxis
  // shows the axis at the bottom, showYAxis the one at the side. A hidden
  // axis is emptied.
  _showsAxis(side) {
    return side === 'bottom' ? (this.options.showXAxis ?? true) : (this.options.showYAxis ?? true);
  }

  // The category axis: band labels cut to labelMaxLength, the full label in
  // a tooltip, and no axis line in either orientation, as on Line, DualAxes
  // and TimeSeries (maintainer, 2026-11-18): with negative values the bars
  // start at zero, not at the plot's edge, and the line read as a stray
  // rule under them. Vertical bars put it at the bottom and show every
  // second (third…) label when neighbours would sit closer than 8px, as the
  // time axis does (thinBandLabels); horizontal ones on the left, labels
  // fitted to the gutter.
  _renderCategoryAxis(scale, side, H) {
    if (!this._showsAxis(side)) { this.gAxisX.selectAll('*').remove(); return; }
    const left = side === 'left';
    this.gAxisX
      .attr('transform', left ? 'translate(0,0)' : `translate(0,${H})`)
      .call((left ? d3.axisLeft : d3.axisBottom)(scale).tickSize(0).tickFormat(d => this._formatLabel(d)))
      .call(g => {
        g.selectAll('text').attr('fill', this.theme.muted);
        g.select('.domain').remove();
        if (left) this._fitCategoryLabels(g);
        else thinBandLabels(g, scale);
        this._bindLabelTooltips(g, side);
      });
  }

  // The value axis of the vertical modes, on the right: the shared Y axis
  // of Line, DualAxes and TimeSeries, labels 8px out (until 0.9.8_7 Bar's
  // sat 9px out, d3's default tick plus padding; aligned by the maintainer,
  // 2026-11-17).
  _renderValueAxisY(y, W, ticks, tickValues, tickFormat) {
    if (!this._showsAxis('right')) { this.gAxisY.selectAll('*').remove(); return; }
    renderAxisY(this.gAxisY, y, {
      side: 'right', width: W, ticks, tickValues, tickFormat, theme: this.theme,
    });
  }

  // The value axis of the horizontal modes, at the bottom. It can run flush
  // with the card's edge (margin.left / right = 0), where a centred first or
  // last label is half cut off: the end labels anchor inward.
  _renderValueAxisX(x, H, tickValues, tickFormat) {
    if (!this._showsAxis('bottom')) { this.gAxisY.selectAll('*').remove(); return; }
    this.gAxisY
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(tickFormat))
      .call(g => {
        g.selectAll('text').attr('fill', this.theme.muted);
        g.select('.domain').remove();
        g.selectAll('line').remove();
        const labels = g.selectAll('.tick text');
        const n = labels.size();
        labels.attr('text-anchor', (d, i) => (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'))
          // the last label ends on the plot's edge, and with margin.right 0 its
          // glyphs ran about 1 px past the svg ('100%', RC-077): 1 px in
          .attr('dx', (d, i) => (n > 1 && i === n - 1 ? -1 : null));
      });
  }

  // ─── Category gutter (horizontal) ──────────────────────────────────────────

  // C-39: the left gutter of horizontal bars was a fixed 65px, so a long
  // category label ran off the card. It now grows to the longest label —
  // after labelMaxLength — up to 40% of the chart width; never below 65px.
  // Measured off a probe in the category axis (its CSS font). An explicit
  // margin.left or a hidden category axis keeps the margin as given.
  _gutterIsAuto() {
    return this._autoGutter && this.options.margin === this._builtMargin;
  }

  _fitCategoryGutter(labels) {
    if (!this._gutterIsAuto()) return;
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);
    const probe = this.gAxisX.append('text');
    let widest = 0;
    labels.forEach(label => {
      probe.text(this._formatLabel(String(label ?? '')));
      widest = Math.max(widest, probe.node().getComputedTextLength?.() || 0);
    });
    probe.remove();
    const room   = this.width + this.margin.left;   // gutter + plot
    const gutter = Math.max(GUTTER_MIN, Math.min(Math.ceil(widest) + GUTTER_PAD, Math.floor(room * GUTTER_SHARE)));
    this._labelRoom = gutter - GUTTER_PAD;
    if (gutter !== this.margin.left) {
      this.margin.left = gutter;
      this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }
  }

  // A label wider than its gutter (past the 40% cap) is cut with an
  // ellipsis; the tooltip keeps the full text.
  _fitCategoryLabels(g) {
    const room = this._labelRoom;
    if (!this._gutterIsAuto() || !(room > 0)) return;
    g.selectAll('.tick text').each((label, i, nodes) => {
      if ((nodes[i].getComputedTextLength?.() || 0) > room) {
        fitTextNode(nodes[i], this._formatLabel(String(label)), room);
      }
    });
  }

  // ─── Label tooltip on truncated axis labels ────────────────────────────────

  _bindLabelTooltips(g, side) {
    g.selectAll('.tick text')
      .style('cursor', 'default')
      .on('mouseover', (event, fullLabel) => {
        // cut by labelMaxLength or by the gutter: show the whole label
        if (event.currentTarget.textContent === String(fullLabel)) return;
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, tipHeader(escapeHtml(fullLabel)));
      })
      .on('mouseout', () => this._tooltip.hide());
  }
}

// RareCharts — TimeSeries
// Long date series with range buttons, zoom (Ctrl/⌘ + wheel, two-finger
// pinch), pan (drag, two fingers), crosshair and a navigator strip. A plain
// wheel and a one-finger drag scroll the page, with a hint over the plot
// (T-09, core/zoomGesture.js).
//
// Expected data format:
// [{ date, value, ...extra }, ...] — `date` a Date, ISO string or epoch ms,
// `value` a number (numeric strings are coerced). Only `value` is drawn; any
// other fields (open, high, low, volume…) pass through to tooltipFormat(d, info).
// The input is copied, parsed and sorted by date; rows with an unreadable
// date or value are dropped. The caller's array is never modified. Under
// gaps 'zero' or 'break' a row whose value is null is kept: a missing
// bucket at its date (RC-005).
//
// Levels (RC-002): setData({ minute?, hour?, day?, week?, month?, quarter?,
// year? }) hands over the same series at several bucket sizes, each a list
// of rows as above, dated at their bucket's start in the chart's zone. The
// server aggregates: the chart never sums or averages. A level may cover
// only part of the time (hourly rows for the last 30 days); a key that is
// not a level is left out, with a one-time warning. For each window — a
// button, the brush, the wheel, setView — the chart draws the finest level
// that covers it with at most resolution.maxPoints rows in it, else the
// coarsest level that covers it, else the finest with rows in it
// (chooseLevel in core/levels.js). The full extent is the union of the
// levels (run on to the timeframe anchor), the navigator draws the coarsest
// level, and the gaps rule fills each level by its own bucket. getLevel()
// names the level drawn; onViewChange(extent, { key, level }) says it too,
// so a page can fetch finer rows for the window — setLoading(true) shows a
// "Loading…" bar meanwhile — and hand them over with setData({ ...levels,
// hour: rows }): the view and the selected timeframe hold, as on every
// setData. appendPoint(point, level?) appends to that level (the finest
// without one).
//
// Options:
//   height        — px (default: 340)
//   timeZone      — 'local' (default) | 'UTC': the zone date strings without
//                   a zone are read in ('2024-03-01' is that day's midnight
//                   there), the timeframes are cut in (YTD, 1M…) and the axis
//                   and tooltip name dates in. An instant (a Date, epoch ms,
//                   ISO with Z or an offset) stays that instant. The full
//                   table: parseDate in core/utils.js (T-10)
//   timeframeAnchor — the end the timeframes count back from (RC-001):
//                   'dataEnd' (default: the last date of the data), 'now'
//                   (read at each setData, appendPoint and timeframe click;
//                   a resize keeps it) or a date (a fixed "as of"). Each
//                   window ends at the anchor; with 'now' or a date past the
//                   data the full extent (ALL, the zoom, the navigator) runs
//                   on to it. Keys beside ALL / MAX / YTD / nD / nW / nM /
//                   nY: TODAY, WTD, MTD (from the start of the anchor's day,
//                   week, month) and nH (real hours). The table:
//                   resolveTimeframeExtent in core/utils.js. CUSTOM (RC-003)
//                   is the custom range: a "Custom" button whose panel takes
//                   two days, From and To, and makes them the view — whole
//                   days in the zone, kept across setData;
//                   setTimeframe('CUSTOM', { range: [from, to] }) from code
//                   (core/customRange.js; every class with timeframes)
//   weekStart     — the first day of a week, for WTD and week buckets:
//                   'monday' (default) | 'sunday' | any day name | 0–6
//                   (0 Sunday)
//   resolution    — { maxPoints } (default: { maxPoints: 500 }): with levels,
//                   the most rows a window draws before a coarser level
//                   takes over (RC-002)
//   navigator     — the strip under the plot (true | { height, area, axis,
//                   margin, level }); with levels it draws the coarsest one,
//                   `level: 'day'` another the data holds
//   tooltipFormat — fn(d, info) => HTML string for tooltip; d is the row (a
//                   copy, date parsed), info the role fields { date, value,
//                   color, level } — the rule for every class (K-09):
//                   /charts/settings/#formatter-arguments. `level` is the
//                   level drawn (RC-002), null for plain rows. The default
//                   tooltip names the date by the bucket the rows are
//                   counted in — the level, else `interval`, else the one
//                   the rows' steps name: 'Nov 18, 2026, 14:00' (minute,
//                   hour), 'Nov 18, 2026' (day), 'Week of Nov 16, 2026',
//                   'November 2026', 'Q4 2026', '2026'; with none, the day.
//                   With `compare`, info also has `series` (the name of the
//                   series the crosshair is on) and `compare`: { date, value,
//                   change } of the comparison at that point — `date` its
//                   own, before the shift; `change` (value − compare.value) /
//                   |compare.value|, null when that is 0 — or null where it
//                   has no row or is hidden
//   crosshair     — crosshair lines and tooltip on hover (default: true)
//   theme         — theme override object
//   curve         — 'linear'|'monotone'|'basis'|'cardinal'|'step'|'stepBefore'|'stepAfter' (default: 'monotone';
//                   a name it does not know draws monotone)
//   curveTension  — 0..1 for 'cardinal' (default: 0), as on Line
//   area          — false | true (gradient) | number (solid fill at that opacity) (default: true)
//   areaColor     — area fill color (default: theme.accent)
//   yLabelsOnly   — hide Y axis line/ticks (default: true)
//   yScale        — 'linear' (default) | 'log'. Log: powers-of-ten ticks, the
//                   margin above/below is a factor of the data's span, values
//                   ≤ 0 are skipped (warned once per setData). setYScale() switches
//   scaleToggle   — a Log toggle, top right of the header above the Y labels
//                   (true | { labels: { linear, log } }); onScaleChange(fn)
//                   gets { scale, axis: 'y' } on every switch
//   yTicks        — Y tick count (default: 5)
//   yTickValues   — explicit Y tick positions (overrides yTicks); the value
//                   range widens to include them
//   yTickFormat   — fn(value) => string (default: by yFormat); it wins over
//                   yFormat on the ticks only
//   yFormat       — 'currency' (default) | 'number' (RC-005). 'currency':
//                   '$' + ',.0f' on the ticks, '$' + ',.2f' in the tooltip.
//                   'number': compact ticks as on Line (1.2k; on a log scale
//                   '.3~s') and the exact count in the tooltip, ',.2~f'
//                   (1,234). tooltipFormat wins in the tooltip
//   yPrefix / ySuffix — text before / after the default labels of both
//                   formats (RC-005). The prefix is '$' under 'currency'
//                   (yPrefix: '€' replaces it, '' drops it) and '' under
//                   'number'; the suffix is '' (ySuffix: ' visits')
//   gaps          — 'join' (default) | 'zero' | 'break' (RC-005): a missing
//                   bucket is a bucket of `interval` between two rows that
//                   has no row, or a row whose value is null.
//                   'join': dropped, the line joins its neighbours (null rows
//                   are dropped too). 'zero': drawn as 0 — line, area and
//                   tooltip. 'break': the line and the area stop there, a
//                   point between two gaps gets a dot (theme.dotRadius), and
//                   the crosshair over a gap reads "No data" (tooltipFormat
//                   is not called for it). Buckets before the first row are
//                   not filled, nor after the last — but with a
//                   timeframeAnchor of 'now' or a date, up to the anchor's
//                   bucket (RC-001). On a log scale the zeros
//                   are skipped with the usual warning, so 'zero' draws as
//                   'break'. The navigator draws the 'zero' series; under
//                   'break' it joins its neighbours
//   interval      — the bucket of the rows, for gaps and the tooltip's date:
//                   'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' |
//                   'year'. Unset: the rows' most common step, when it is one
//                   of these in the chart's zone (a day across a DST change
//                   is a day, a month 28–31 days); with none, only null rows
//                   are gaps. With levels, each level's name is its bucket
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
//   seriesName    — the series' name (default: 'Series', as Line's single
//                   series): the key a header legend item maps to, so
//                   legend: [{ label: 'BTC' }] with seriesName: 'BTC', or
//                   [{ label: 'BTC', series: 'Series' }], is a toggle
//   compare       — false (default) | 'previousPeriod' | 'previousYear'
//                   (RC-004): a second series, the rows of an earlier window
//                   moved onto the view — a dashed line (4 3, 1.5px) with no
//                   area, under the main line. 'previousPeriod': TODAY
//                   against the day before, WTD the week before, MTD the
//                   month before (1–18 November against 1–18 October, day
//                   by day), YTD the year before; a rolling nH / nD / nW /
//                   nM / nY against the n before it; the custom range
//                   against as many days before it. The period picked holds
//                   while the brush, the wheel or setView then move the
//                   window (zoomed into a week: still the week before);
//                   with none picked, or after ALL, the window against its
//                   own length before it, in whole days (whole hours under
//                   a day). 'previousYear': the same window a
//                   year before. A calendar shift moves each row by itself
//                   (the day of the month clamped); two rows that land on
//                   one date (30 and 31 October on 30 November) keep the
//                   later. The rows are the drawn level's, under the gaps
//                   rule. The Y axis fits it (legendRescale); the time
//                   axis, the view and the navigator do not. The default
//                   tooltip adds a row: 'Previous period  1,100 · Oct 18 ·
//                   +12.2%' (core/compare.js)
//   compareName   — the comparison's name, its legend key (default:
//                   'Previous period' / 'Previous year')
//   compareColor  — the comparison's colour (default: theme.muted)
//   band          — a ribbon read from the rows (RC-051): true reads the
//                   fields `lower` and `upper`; { lower, upper, name, color,
//                   fillOpacity } names them (default name 'Range', its legend
//                   key; colour theme.accent; opacity 0.12, as Line's bands).
//                   Drawn under the area and the lines; a row without both
//                   edges (a gap, a filled zero, a row that lacks them) breaks
//                   it. The Y axis fits it; the default tooltip adds 'Range
//                   90 – 110', tooltipFormat gets info.band { lower, upper } |
//                   null; the navigator draws the line alone. With levels,
//                   each level's rows carry their own edges.
//
// The line takes theme.accent and theme.strokeWidth (2 when a theme leaves it
// unset) and is drawn as Line draws its lines (drawLineSeries); the area
// fill is the chart's own (RC-080). setData and appendPoint
// keep the view: a selected timeframe re-applies to the new data, a window
// the data no longer reaches falls back to the default view.
//
// Legend (the base Chart's; legendInteractive, legendRescale, onLegendToggle):
// a hidden series leaves the line, the area and the crosshair; with nothing
// shown the frame stays (axes, grid, annotations) and the crosshair is off.
// The comparison is a second key (compareName); an item naming it without a
// `type` of its own gets a dashed swatch. The crosshair follows the main
// series, or the comparison while the main one is hidden.
// The Y axis fits the shown series (every series in view with legendRescale:
// false); the time axis, the view, the timeframes and the navigator never
// follow the legend. setSeriesVisible(names | null) sets it from code.

import * as d3 from 'd3';
import { Chart }   from '../core/Chart.js';
import { Crosshair } from '../core/Crosshair.js';
import { renderGrid, renderAxisX, dayTicks, renderAxisY, renderAnnotations, drawLineSeries } from '../core/renderHelpers.js';
import { annotationRoom, logTickValues, logPaddedDomain, byDate, curveName, resolveCurve, spanTimeFormat, spanTimeFormatter, timeKit, compactTickFormat, inferInterval, bucketDateText, extentEquals, INTERVAL_NAMES } from '../core/utils.js';
import { normalizePoints, filterLogSeries, fillGaps, isGap, MAX_FILLED_BUCKETS } from '../core/seriesPath.js';
import { chooseLevel, levelName, DEFAULT_MAX_POINTS } from '../core/levels.js';
import { escapeHtml, isRoleColor, tipDate, tipNum, tipRow } from '../core/html.js';
import { bindZoom } from '../core/zoomGesture.js';
import { isCustomStep } from '../core/customRange.js';
import { COMPARE_NAMES, compareMode, compareShift, comparisonRows, shiftKey, sourceDate, changeOf } from '../core/compare.js';

// The comparison's line (RC-004, §2.5 of the analytics spec)
const COMPARE_DASH  = '4 3';
const COMPARE_WIDTH = 1.5;
const changeText = d3.format('+.1%');

// The rows no line shows — no drawn neighbour on either side, between two
// gaps or alone in view: each gets a dot.
const loneRows = values => {
  const drawn = i => i >= 0 && i < values.length && !isGap(values[i]);
  return values.filter((d, i) => drawn(i) && !drawn(i - 1) && !drawn(i + 1));
};

export class TimeSeries extends Chart {
  constructor(selector, options = {}) {
    const ann = annotationRoom(options);
    const { margin: _margin, ...restOptions } = options;

    // A hidden axis collapses its margin so the plot runs flush; annotations
    // raise the top for their labels. An explicit margin always wins.
    super(selector, {
      height: 340,
      margin: {
        top:    options.margin?.top    ?? Math.max(16, ann.top),
        right:  options.margin?.right  ?? (options.showYAxis === false ? 0 : 70),
        bottom: options.margin?.bottom ?? (options.showXAxis === false ? 0 : 28),
        left:   options.margin?.left   ?? 0,
      },
      ...restOptions,
    });
    // the sides the page's own margin sets: those gutters stay as given (RC-060)
    this._pageMargin = options.margin ?? {};

    this._rows           = [];   // the rows as given, normalised
    this._data           = [];   // the rows drawn: _rows after the gaps rule
    // Levels (RC-002): name → { rows, data } (rows as given, data after the
    // gaps rule), finest first; null for plain rows. With levels, _rows and
    // _data are the drawn level's, and _level names it.
    this._levels         = null;
    this._level          = null;
    this._viewExtent     = null;
    this._onViewChangeCb = null;
    this.tooltip;   // made now: its element keeps its place in the card
    this._annotations    = ann.annotations;
    this._annLabelHeight = ann.labelHeight;

    this._initSVG();
    this._bindZoomPan();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setData(data) {
    // An object hands over levels (RC-002); anything else is one series of
    // rows, as before. Extra fields (open, volume…) are kept for
    // tooltipFormat (C-06).
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      this._levels = this._readLevels(data);
    } else {
      this._levels = null;
      this._level = null;
      this._rows = this._readRows(data);
    }
    this._warnedNonPositive = false;
    // As on every time chart (T-03): a selected timeframe re-applies to the
    // new data, a window the data no longer reaches falls back. It reads the
    // anchor first, and the gaps are filled up to it (_readAnchor).
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
  // A selected timeframe moves with the new point. With levels the point
  // goes to `level` — a new level if the data has none of that name — or
  // to the finest level without one; plain rows take no level.
  appendPoint(point, level) {
    const [p] = this._readRows([point]);
    if (!p) return this;
    if (this._levels) {
      const name = level == null ? [...this._levels.keys()][0] : levelName(level);
      if (!name) {
        this._warnOnce('appendLevel', level == null
          ? 'appendPoint: the chart holds no level — name the level to append to'
          : `appendPoint: "${level}" is not a level (${INTERVAL_NAMES.join(', ')}) — the point is left out`);
        return this;
      }
      const lv = this._levels.get(name);
      if (lv) lv.rows = lv.rows.concat(p).sort(byDate);
      else this._levels = new Map(INTERVAL_NAMES.filter(n => n === name || this._levels.has(n))
        .map(n => [n, n === name ? { rows: [p] } : this._levels.get(n)]));
    } else {
      this._rows = this._rows.concat(p).sort(byDate);
    }
    this._refreshViewForData();   // the anchor, the gaps, the view
    this.render();
    return this;
  }

  // The level drawn for the current view (RC-002): 'hour', 'day'…, or null
  // for plain rows.
  getLevel() {
    return this._levels ? this._levelFor(this.getView()) : null;
  }

  // Show only the series named (seriesName, and compareName for the
  // comparison); null shows every one. No onLegendToggle. Chain it after
  // setData.
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  // ── Series: the legend hook ───────────────────────────────────────────────
  // Every series the chart draws, in legend order: the main one, then the
  // comparison ({ key, role: 'compare', values, color, dashed: true, area:
  // false }, RC-004) for `view` (the one in force by default). Both are
  // listed, scaled and crosshaired through this list alone.
  _drawnSeries(view) {
    const main = { key: this.options.seriesName ?? 'Series', role: 'main', values: this._data };
    const cmp  = this._comparison(view);
    const band = this._bandSeries();
    return [main, cmp, band].filter(Boolean);
  }

  // ── The band (RC-051) ─────────────────────────────────────────────────────

  // The `band` option read: null without it.
  _bandOptions() {
    const b = this.options.band;
    if (!b) return null;
    const o = b === true ? {} : b;
    return {
      lower: o.lower ?? 'lower', upper: o.upper ?? 'upper',
      name: String(o.name ?? 'Range'), color: o.color, fillOpacity: o.fillOpacity,
    };
  }

  // The band over the rows drawn (the level in force): a row whose two edges
  // read as numbers is a point of the ribbon; any other row is a gap in it
  // (value null, as the rows' own gaps). Worked out again only for new rows.
  _bandSeries() {
    const b = this._bandOptions();
    if (!b || !this._data.length) return null;
    const f = this._bandFor;
    if (f?.data !== this._data || f.lower !== b.lower || f.upper !== b.upper) {
      const read = v => (v == null || v === '' || typeof v === 'boolean' ? NaN : +v);
      const values = this._data.map(d => {
        const lower = read(d[b.lower]), upper = read(d[b.upper]);
        return !isGap(d) && Number.isFinite(lower) && Number.isFinite(upper)
          ? { date: d.date, lower, upper }
          : { date: d.date, lower: null, upper: null, value: null };
      });
      this._bandFor = { data: this._data, lower: b.lower, upper: b.upper, values, byTime: null };
    }
    return {
      key: b.name, role: 'band', type: 'band', values: this._bandFor.values,
      color: b.color ?? this.theme.accent, fillOpacity: b.fillOpacity,
    };
  }

  // The band's edges at a row's date while the band is shown, else null.
  _bandAt(date) {
    if (!this._shownBand || !this._bandFor) return null;
    const f = this._bandFor;
    f.byTime ??= new Map(f.values.filter(d => !isGap(d)).map(d => [+d.date, d]));
    const d = f.byTime.get(+date);
    return d ? { lower: d.lower, upper: d.upper } : null;
  }

  // ── The comparison (RC-004) ───────────────────────────────────────────────

  // The comparison series for a view, built from the rows drawn whenever
  // the legend or the render asks — so it is there on the first render that
  // brings data, before the legend first maps its items — and worked out
  // again only for new rows, a new view or a new shift. null without
  // `compare` or without data; with no rows in its window it has no values
  // (no line), and its legend item stays.
  _comparison(view) {
    const mode = this._compareMode();
    if (!mode || !this._data.length) return (this._compareSeries = null);
    view ??= this.getView();
    const shift = view ? this._compareShift(mode, view) : null;
    const key = `${mode}|${view ? `${+view[0]}:${+view[1]}` : ''}|${shiftKey(shift)}`;
    if (this._compareFor?.data !== this._data || this._compareFor.key !== key) {
      this._compareFor = { data: this._data, key, values: comparisonRows(this._data, view, shift, this._zone()) };
    }
    return (this._compareSeries = {
      key:    this._compareName(mode),
      role:   'compare',
      values: this._compareFor.values,
      color:  this.options.compareColor ?? this.theme.muted,
      dashed: true,
      area:   false,
    });
  }

  // 'previousPeriod', 'previousYear' or null (no comparison). A value that
  // names neither warns once and draws none.
  _compareMode() {
    const v = this.options.compare;
    const mode = compareMode(v);
    if (!mode && v != null && v !== false) {
      this._warnOnce('compare', `compare "${v}" is not 'previousPeriod' or 'previousYear' — no comparison is drawn`);
    }
    return mode;
  }

  _compareName(mode = this._compareMode()) {
    return String(this.options.compareName ?? COMPARE_NAMES[mode]);
  }

  // How far back the comparison lies for a view (compareShift, core/
  // compare.js). The period picked sets it: a timeframe button or
  // setTimeframe, or the defaultTimeframe while the default view holds; the
  // custom range by its days. That shift then holds while the brush, the
  // wheel or setView move the window — zoomed into a week, the comparison is
  // still the week before, so the two lines keep their phase (maintainer,
  // 2026-11-18: with the window's own length as the shift, every wheel step
  // moved the dashed line off the main one). Without a period picked, or
  // after ALL, the window's own length in whole days (hours under a day).
  _compareShift(mode, view) {
    if (mode !== 'previousPeriod') return compareShift(mode, view);
    const zone = this._zone();
    const picked = this._selectedTimeframe ?? this._defaultTimeframeKey();
    const step = picked == null ? null : this._findTimeframe(picked);
    const keyed = step != null && extentEquals(this._timeframeExtent(step, this._getDataExtent()), view);
    if (keyed) {
      const custom = isCustomStep(step);
      const name = typeof step === 'string' ? step : step.key ?? step.label;
      const whole = !Array.isArray(step.range) && ['ALL', 'MAX'].includes(String(name ?? '').trim().toUpperCase());
      const key = !custom && !Array.isArray(step.range) ? name : null;
      const shift = compareShift(mode, view, { key, days: custom ? this._customRange : null, timeZone: zone });
      this._pickedShift = whole ? null : shift;
      return shift;
    }
    return this._pickedShift ?? compareShift(mode, view, { timeZone: zone });
  }

  // ── Levels (RC-002) ───────────────────────────────────────────────────────

  // Rows as setData reads them: copied, parsed, sorted; null values kept as
  // missing buckets under gaps 'zero' / 'break'.
  _readRows(rows) {
    return normalizePoints(rows, { keep: true, timeZone: this._zone(), keepNull: this._gapMode() !== 'join' });
  }

  // setData's levels object: each key that names a level (in any case) read
  // as rows, finest first; a level without a readable row is left out, and
  // so, with a one-time warning, is a key that names no level.
  _readLevels(data) {
    const found = new Map();
    Object.entries(data).forEach(([key, rows]) => {
      const name = levelName(key);
      if (!name) {
        this._warnOnce(`level:${key}`, `setData: "${key}" is not a level (${INTERVAL_NAMES.join(', ')}) — its rows are left out`);
        return;
      }
      const points = this._readRows(rows);
      if (points.length) found.set(name, { rows: points });
    });
    return new Map(INTERVAL_NAMES.filter(n => found.has(n)).map(n => [n, found.get(n)]));
  }

  // The level drawn for a view (chooseLevel, core/levels.js), from the rows
  // each level draws — after the gaps rule, so a 'zero' level filled up to
  // the anchor covers the window up to it.
  _levelFor(view) {
    const levels = [...this._levels].map(([name, lv]) => ({ name, rows: lv.data ?? lv.rows }));
    return chooseLevel(levels, view, { maxPoints: this._maxPoints(), timeZone: this._zone(), weekStart: this._weekStart() });
  }

  // Draw that level: its rows become _rows and _data. null (no level) draws
  // nothing.
  _useLevel(name) {
    const lv = name == null ? null : this._levels.get(name);
    this._level = lv ? name : null;
    this._rows = lv?.rows ?? [];
    this._data = lv?.data ?? lv?.rows ?? [];
  }

  // resolution.maxPoints: a number above 0, else the default with a
  // one-time warning.
  _maxPoints() {
    const n = this.options.resolution?.maxPoints;
    if (n == null) return DEFAULT_MAX_POINTS;
    if (typeof n === 'number' && n > 0) return n;
    this._warnOnce('maxPoints', `resolution.maxPoints "${n}" is not a number above 0 — ${DEFAULT_MAX_POINTS} is used`);
    return DEFAULT_MAX_POINTS;
  }

  // The level the strip draws: navigator.level when the data holds it, else
  // the coarsest. A name that is no level warns once.
  _navigatorLevel() {
    const own = this.options.navigator?.level;
    const name = own == null ? null : levelName(own);
    if (own != null && !name) this._warnOnce('navigatorLevel', `navigator.level "${own}" is not a level (${INTERVAL_NAMES.join(', ')}) — the strip draws the coarsest`);
    return name && this._levels.has(name) ? name : [...this._levels.keys()].pop() ?? null;
  }

  // onViewChange's info.level (the base Chart's hook).
  _viewLevel() {
    return this.getLevel();
  }

  // ── Gaps (RC-005) ─────────────────────────────────────────────────────────

  // 'join' (the default), 'zero' or 'break'; any other value joins, with a
  // one-time warning.
  _gapMode() {
    const gaps = this.options.gaps;
    if (gaps === 'zero' || gaps === 'break') return gaps;
    if (gaps != null && gaps !== 'join') this._warnOnce('gaps', `gaps "${gaps}" is not 'join', 'zero' or 'break' — the line joins its neighbours`);
    return 'join';
  }

  // The bucket the rows are counted in, for the gaps and the tooltip's date
  // (§2.6 of the analytics spec): the drawn level's name, else the interval
  // option, else the one the rows' own steps name, else none — then only
  // null rows are gaps, and the tooltip names the day.
  _gapInterval() {
    if (this._levels) return this._level;
    const own = this.options.interval;
    if (own != null) {
      const name = String(own).toLowerCase();
      if (INTERVAL_NAMES.includes(name)) return name;
      this._warnOnce('interval', `interval "${own}" is not one of ${INTERVAL_NAMES.join(', ')} — it is read from the data`);
    }
    // read once per data set: the tooltip asks on every pointer move
    if (this._inferred?.rows !== this._rows) {
      this._inferred = { rows: this._rows, interval: inferInterval(this._rows, this._zone()) };
    }
    return this._inferred.interval;
  }

  // The instant the gaps are filled up to after the last row (RC-001): the
  // timeframe anchor when it is not the data's end — the "now" read at the
  // last data or selection change, or the fixed date. Under 'dataEnd' none.
  _gapsUntil() {
    return this._anchorInstant();
  }

  // Every reading of the anchor (setData, appendPoint, setTimeframe) fills
  // the gaps anew: under 'now' the buckets after the last row run to the
  // new moment.
  _readAnchor(at) {
    super._readAnchor(at);
    this._applyGaps();
  }

  // The rows drawn, from the rows given, by the gaps rule: under 'join' the
  // same array, so a chart without the option keeps its rows as they were.
  // With levels, each level by its own bucket; the level drawn stays until
  // the render chooses again (the coarsest when it is gone).
  _applyGaps() {
    if (!this._levels) {
      this._data = this._fillRows(this, this._rows, () => this._gapInterval());
      return;
    }
    this._levels.forEach((lv, name) => { lv.data = this._fillRows(lv, lv.rows, () => name); });
    this._useLevel(this._levels.has(this._level) ? this._level : [...this._levels.keys()].pop());
  }

  // One series' rows by the gaps rule. A fill is worked out again only for
  // new rows or a new anchor, and `holder` (the chart, or a level) keeps it:
  // a button click under 'dataEnd' keeps the rows drawn (and the strip's) as
  // they are. `interval()` is asked only for a new fill.
  _fillRows(holder, rows, interval) {
    const gaps = this._gapMode();
    if (gaps === 'join') return rows;
    const until = this._gapsUntil();
    const key = until ? +until : null;
    if (holder._filledFor?.rows === rows && holder._filledFor.until === key) return holder._filled;
    const { rows: filled, capped } = fillGaps(rows, {
      gaps, interval: interval(), timeZone: this._zone(), weekStart: this._weekStart(), until,
    });
    holder._filledFor = { rows, until: key };
    holder._filled = filled;
    if (capped) this._warnOnce('fill', `gaps: more than ${MAX_FILLED_BUCKETS} empty buckets — the rest of the gaps join; check interval`);
    return filled;
  }

  // The legend's series (the base Chart's hook): none without data. The
  // comparison is drawn dashed, and so is its swatch unless the item says.
  _legendSeries() {
    return this._data?.length
      ? this._drawnSeries().map(s => ({ key: s.key, color: s.color ?? this.theme.accent, dashed: s.dashed === true }))
      : [];
  }

  // The rows' own extent — with levels, the union of theirs (each sorted by
  // date); the full extent runs on to the timeframe anchor
  // (Chart._getDataExtent, RC-001).
  _dataExtent() {
    if (!this._levels) return this._data.length ? d3.extent(this._data, d => d.date) : null;
    let lo = null, hi = null;
    this._levels.forEach(({ data }) => {
      if (!data?.length) return;
      const first = data[0].date, last = data[data.length - 1].date;
      if (!lo || first < lo) lo = first;
      if (!hi || last > hi) hi = last;
    });
    return lo ? [lo, hi] : null;
  }

  // The strip draws the rows after the 'zero' fill — with levels, the
  // navigator's level (the coarsest by default) over the whole extent; over
  // a 'break' it joins the neighbours of a gap — it is a strip, not a
  // reading (RC-005).
  _getNavigatorData() {
    const data = this._levels ? this._levels.get(this._navigatorLevel())?.data ?? [] : this._data;
    if (!data.length) return null;
    if (this._gapMode() !== 'break') return data;
    if (this._navRows?.of !== data) {
      this._navRows = { of: data, rows: data.filter(d => !isGap(d)) };
    }
    return this._navRows.rows.length ? this._navRows.rows : null;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  _initSVG() {
    this._createPlot();

    // Clip path — keep the line inside the plot area while zooming
    const clipId = `${this._uid}-clip`;
    this.clipRect = this.svg.append('defs').append('clipPath')
      .attr('id', clipId).append('rect');

    this.gGrid        = this.g.append('g').attr('class', 'rc-grid');
    this.gArea        = this.g.append('g').attr('clip-path', `url(#${clipId})`);
    this.gPaths       = this.gArea.append('g');
    this.gAnnotations = this.g.append('g').attr('class', 'rc-annotations');
    this.gAxisX       = this.g.append('g').attr('class', 'rc-axis');
    this.gAxisY       = this.g.append('g').attr('class', 'rc-axis');

    // Crosshair: vertical (X) + horizontal (Y) lines through the hovered
    // point, below the overlay that takes the pointer
    this.overlay = this.g.append('rect').attr('fill', 'none').attr('pointer-events', 'all');
    this._crosshair = new Crosshair(this.g, this.overlay, this.tooltip, this.theme, { horizontal: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _dataLayers() {
    return [this.gGrid, this.gPaths, this.gAnnotations, this.gAxisX, this.gAxisY];
  }

  render() {
    // Levels (RC-002): the level drawn follows the view, so every view
    // change — a button, the brush, the wheel, setView — chooses again.
    if (this._levels) this._useLevel(this._levelFor(this.getView()));
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

    // The series in view, each cut to the window. A log scale has no place
    // for zero or negatives: such points are skipped (the line joins its
    // neighbours) instead of drawing NaN — under gaps 'zero' or 'break' they
    // leave a gap instead, so 'zero' on a log scale draws as 'break'.
    const isLog = this.options.yScale === 'log';
    const gaps  = this._gapMode();
    const { series: inView, skipped } = filterLogSeries(this._drawnSeries(viewExtent), viewExtent, () => isLog, () => gaps !== 'join');
    this._warnLogSkips(skipped, 'TimeSeries');
    if (!inView.length) { this._renderEmpty(); return; }

    // The legend's split: the shown series are drawn and crosshaired; the Y
    // axis fits them, or every series in view with legendRescale: false or
    // with nothing shown (the frame stays, with no marks).
    const shown    = inView.filter(s => this._isShown(String(s.key)));
    const scaleSet = this._legendRescale() && shown.length ? shown : inView;
    // a band scales by its two edges (RC-051)
    const values   = scaleSet.flatMap(s => (s.type === 'band'
      ? s.values.flatMap(d => (isGap(d) ? [] : [{ value: d.lower }, { value: d.upper }]))
      : s.values));
    const main     = shown.find(s => s.role === 'main');

    const yTicks = this.options.yTicks ?? 5;
    const zone   = this._zone();
    // d3's local or UTC scale: the date ticks fall on the zone's days,
    // months and years (T-10)
    this.xScale = timeKit(zone).scale().domain(viewExtent).range([0, W]);
    let yTickValues = this.options.yTickValues ?? null;
    if (isLog) {
      let [lo, hi] = logPaddedDomain(d3.min(values, d => d.value), d3.max(values, d => d.value));
      yTickValues = yTickValues ? yTickValues.filter(v => v > 0) : null;
      if (yTickValues?.length) {
        lo = Math.min(lo, d3.min(yTickValues));
        hi = Math.max(hi, d3.max(yTickValues));
      } else {
        yTickValues = logTickValues(lo, hi, yTicks);
      }
      this.yScale = d3.scaleLog().domain([lo, hi]).range([H, 0]);
    } else {
      let yMin = d3.min(values, d => d.value) * 0.99;
      let yMax = d3.max(values, d => d.value) * 1.01;
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

    // The curve as on Line (RC-080): monotone by default, the cardinal's
    // tension from curveTension (0). A name it does not know draws monotone,
    // on the line and the area alike.
    const curveKey = curveName(this.options.curve, 'monotone');
    const tension  = this.options.curveTension ?? 0;
    const curve    = resolveCurve(curveKey, tension);

    // The band (RC-051), under everything else
    this._shownBand = shown.find(s => s.role === 'band') ?? null;
    this._drawBand(this._shownBand, curve);

    // Area — the chart's own fill: a gradient (or a solid opacity) down to
    // the plot's bottom, under the line
    const areaOpt = this.options.area;
    const visible = main?.values;

    if (areaOpt !== false && visible) {
      // a gap (gaps 'break') stops the area as it stops the line
      const area = d3.area()
        .defined(d => !isGap(d))
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

    // The comparison (RC-004) under the main line, over the area
    this._drawComparison(shown.find(s => s.role === 'compare'), { curveKey, tension, gaps });

    // Line — drawn as Line draws its lines, at Line's default width (RC-080).
    // No area class: the fill above stays the chart's own.
    // The main series' line while it is shown (the legend may hide it).
    drawLineSeries(this.gPaths, visible ? [{ name: 'value', color: t.accent, values: visible }] : [], {
      x: this.xScale, yFor: () => this.yScale, curve: curveKey, tension,
      dash:    null,
      width:   t.strokeWidth ?? 2,
      classes: { line: 'rc-ts-line' },
      timing:  null,
    });

    // A point with no drawn neighbour — between two gaps, or alone in view —
    // has no line to show it: it gets a dot (gaps 'zero' / 'break' only; a
    // joined line keeps its look).
    const lone = gaps !== 'join' && visible ? loneRows(visible) : [];
    this.gPaths.selectAll('.rc-ts-dot').data(lone).join('circle')
      .attr('class', 'rc-ts-dot')
      .attr('cx', d => this.xScale(d.date))
      .attr('cy', d => this.yScale(d.value))
      .attr('r', t.dotRadius ?? 3)
      .attr('fill', t.accent);

    // X axis
    if (this.options.showXAxis ?? true) {
      // The default follows the span in view (C-31): '%b' alone repeated a
      // month on a 1M view ("Sep Oct Oct Oct") and dropped the year on a long
      // one. A day-labelled view of a few days gets at most one tick per
      // midnight, as on Line. A page's own xTickFormat keeps d3's ticks.
      const own  = this.options.xTickFormat;
      const spec = own ? null : spanTimeFormat(viewExtent);
      const xTickFormat = own ?? spanTimeFormatter(viewExtent, zone);
      const xTicks = spec === '%b %d' ? (dayTicks(viewExtent, 6, zone) ?? 6) : 6;
      renderAxisX(this.gAxisX, this.xScale, H, xTickFormat, t, xTicks);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    // Y axis
    if (this.options.showYAxis ?? true) {
      const yTickFormat = this.options.yTickFormat
        ?? this._tickFormat(yTickValues ?? this.yScale.ticks(yTicks), isLog);
      renderAxisY(this.gAxisY, this.yScale, {
        side: 'right', width: W, ticks: yTicks, tickValues: yTickValues,
        tickFormat: yTickFormat, labelsOnly: this.options.yLabelsOnly ?? true, theme: t,
      });
    } else {
      this.gAxisY.selectAll('*').remove();
    }

    // The value gutter takes the room its labels need (RC-060)
    if (this._fitGutters([[this.gAxisY, 'right']])) return;

    // Annotations — levels outside the value range (on a log scale: at or
    // below zero) are skipped by renderAnnotations itself.
    renderAnnotations(
      this.gAnnotations, this._annotations, this.xScale,
      () => this.yScale,
      H, this._annLabelHeight, t
    );

    // Crosshair — through the point nearest the pointer, the tooltip at it,
    // on the first shown series: the main one, or the comparison while the
    // main one is hidden; the comparison's row at that date comes beside the
    // main one (RC-004). Off while nothing is shown (unbind, not just hide:
    // the hover handlers hold the series).
    // The band is not a point to follow: its edges come as a tooltip row.
    const points = shown.filter(s => s.role !== 'band');
    if (!points.length) { this._crosshair.unbind(); return; }
    const lead = points[0];
    const colorOf = () => lead.color ?? this.theme.accent;
    this._crosshair.bind({
      W, H,
      x:          this.xScale,
      series:     points,
      enabled:    this.options.crosshair ?? true,
      scaleFor:   () => this.yScale,
      tooltipFmt: (d, [partner = null] = []) => this._pointTooltip(d, lead, partner, colorOf),
      toCard:     (px, py) => this._plotToCard(px, py),
    });
  }

  // The band's ribbon, first in the plot (under the area and the lines), in
  // a group of its own; no group without `band`, so a chart without it keeps
  // its drawing. A gap in the band stops the ribbon.
  _drawBand(band, curve) {
    let g = this.gPaths.select('g.rc-ts-band');
    if (!this._bandOptions()) { g.remove(); return; }
    const plot = this.gPaths.node();
    if (g.empty()) g = this.gPaths.append('g').attr('class', 'rc-ts-band');
    if (plot.firstChild !== g.node()) plot.insertBefore(g.node(), plot.firstChild);
    const ribbon = d3.area()
      .defined(d => !isGap(d))
      .x(d => this.xScale(d.date)).y0(d => this.yScale(d.lower)).y1(d => this.yScale(d.upper))
      .curve(curve);
    g.selectAll('path.rc-band').data(band ? [band] : []).join('path')
      .attr('class', 'rc-band')
      .attr('d', s => ribbon(s.values))
      .attr('fill', s => s.color)
      .attr('opacity', s => s.fillOpacity ?? 0.12);
  }

  // The comparison's line and its lone dots, in a group of their own that
  // sits over the area and under the main line; no group without `compare`,
  // so a chart without it keeps its drawing.
  _drawComparison(cmp, { curveKey, tension, gaps }) {
    let g = this.gPaths.select('g.rc-ts-compare');
    if (!this._compareMode()) { g.remove(); return; }
    if (g.empty()) g = this.gPaths.append('g').attr('class', 'rc-ts-compare');
    drawLineSeries(g, cmp ? [{ name: 'compare', color: cmp.color, values: cmp.values }] : [], {
      x: this.xScale, yFor: () => this.yScale, curve: curveKey, tension,
      dash:    COMPARE_DASH,
      width:   COMPARE_WIDTH,
      classes: { line: 'rc-ts-compare-line' },
      timing:  null,
    });
    g.selectAll('.rc-ts-compare-dot').data(cmp && gaps !== 'join' ? loneRows(cmp.values) : []).join('circle')
      .attr('class', 'rc-ts-compare-dot')
      .attr('cx', d => this.xScale(d.date))
      .attr('cy', d => this.yScale(d.value))
      .attr('r', this.theme.dotRadius ?? 3)
      .attr('fill', cmp?.color);
    // before the main line (or its dots), wherever a render left them
    const above = this.gPaths.select('.rc-ts-line').node() ?? this.gPaths.select('.rc-ts-dot').node();
    if (g.node().nextSibling !== above) this.gPaths.node().insertBefore(g.node(), above);
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
    // How far the wheel may zoom in: down to four steps of the finest rows,
    // never less than 500×. Hourly rows over three years need about 6,500×;
    // with a fixed 500× the wheel stopped at two days, and a narrower window
    // set by a button (TODAY) sat past the limit, so the first "zoom in"
    // step widened it.
    const maxK = Math.max(500, span / this._minWindow());
    if (this._zoom.scaleExtent()[1] !== maxK) this._zoom.scaleExtent([1, maxK]);
    const k = span / vspan;
    const xFull = d3.scaleTime().domain(full).range([0, W]);
    this.svg.property('__zoom', d3.zoomIdentity.translate(-k * xFull(view[0]), 0).scale(k));
  }

  // The narrowest window the wheel zooms to: four steps of the finest rows
  // (with levels, the finest level's). Worked out again only for new rows.
  _minWindow() {
    const finest = this._levels ? [...this._levels.values()][0] : null;
    const rows = finest ? (finest.data ?? finest.rows ?? []) : this._data;
    if (this._minWindowFor?.rows !== rows) {
      let step = Infinity;
      for (let i = 1; i < rows.length; i++) {
        const d = rows[i].date - rows[i - 1].date;
        if (d > 0 && d < step) step = d;
      }
      this._minWindowFor = { rows, ms: 4 * step };
    }
    return this._minWindowFor.ms;
  }

  _bindZoomPan() {
    this._zoom = d3.zoom()
      // An explicit extent, as Graph's (RC-073): the default reads the
      // svg's width/height attributes or viewBox, which not every
      // environment resolves to pixels.
      .extent(function () { return [[0, 0], [this.clientWidth || 1, this.clientHeight || 1]]; })
      .scaleExtent([1, 500])
      .on('zoom', (event) => {
        // the full extent, run on to the timeframe anchor (RC-001)
        const fullExtent = this._getDataExtent();
        if (!fullExtent) return;

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

    // Ctrl/⌘ + wheel, two fingers on a phone; a plain wheel and one finger
    // are the page's, with a hint over the plot (core/zoomGesture.js)
    this._zoomHint = bindZoom(this.svg, this._zoom, {
      container: this.container,
      theme:     this.theme,
      box:       () => this._plotBox(),
    });
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  // The row's date in the chart's zone (T-10), named by the bucket the rows
  // are counted in (RC-002: bucketDateText, core/utils.js) — the hour of an
  // hourly row, the month of a monthly one; with no known bucket, the day.
  _tooltipDate(d) {
    return bucketDateText(d.date, this._gapInterval(), this._zone());
  }

  // The tooltip at the crosshair's row d of `lead` (the series it is on);
  // `partner` is the comparison's row at that date when the main series
  // leads. Over a gap the tooltip says so, and tooltipFormat is not asked.
  // tooltipFormat gets the row first, as before, and the role fields
  // second (K-09) — with `compare`, also `series` and `compare`.
  _pointTooltip(d, lead, partner, colorOf) {
    const mode = this._compareMode();
    const onCompare = lead.role === 'compare';
    const compare = !mode ? null
      : onCompare ? this._compareInfo(d, null)
      : partner ? this._compareInfo(partner, d) : null;
    const band = this._bandAt(d.date);
    if (!isGap(d) && this.options.tooltipFormat) {
      const info = { date: d.date, value: d.value, color: this._hex(colorOf()), level: this._level };
      if (mode) Object.assign(info, { series: lead.key, compare });
      if (this._bandOptions()) info.band = band;
      return this.options.tooltipFormat(d, info);
    }
    return this._defaultTooltip(d, lead, colorOf(), compare, band);
  }

  // info.compare for a row of the comparison: its date before the shift,
  // its value, and the change to the main row's value (none without one).
  _compareInfo(prev, main) {
    return {
      date:   sourceDate(prev) ?? prev.date,
      value:  prev.value,
      change: main ? changeOf(main.value, prev.value) : null,
    };
  }

  // The default tooltip (RC-082): the date, small and muted, then a row per
  // series — the one hovered (the main line, or the comparison while the
  // main one is hidden), the comparison beside the main one, the band.
  // `color` is the hovered series' (the main one takes the accent).
  _defaultTooltip(d, lead, color, compare = null, band = null) {
    const onCompare = lead.role === 'compare';
    const rows = [onCompare
      ? this._compareRow(compare, d.date, color)
      : this._seriesRow(lead.key, d.value, { swatch: 'line', color })];
    if (compare && !onCompare) {
      rows.push(this._compareRow(compare, d.date, this.options.compareColor ?? this.theme.muted));
    }
    if (band) rows.push(this._bandRow(band));
    return tipDate(this._tooltipDate(d)) + rows.join('');
  }

  // A series row: its mark, its name and its value in the chart's format;
  // "No data" over a gap. A data colour goes in as hex; a role colour (the
  // comparison's muted) is not written inline — the mark takes the
  // tooltip's muted (core/html.js).
  _seriesRow(name, value, { swatch, color, note = '' }) {
    const gap = value == null;
    const text = gap ? 'No data' : typeof value === 'number' ? this._valueFormat()(value) : value;
    return tipRow(escapeHtml(name), escapeHtml(text), {
      swatch, note, muted: gap, color: isRoleColor(color) ? color : this._hex(color),
    });
  }

  // The comparison's row: 'Previous period  1,100', and under it its own
  // date by the bucket (the year only when it is not the year hovered) and
  // the change when there is one: 'Oct 18 · +12.2%'.
  _compareRow({ date, value, change }, at, color) {
    const zone = this._zone();
    const year = timeKit(zone).year;
    const note = [bucketDateText(date, this._gapInterval(), zone, { year: +year.floor(date) !== +year.floor(at) })];
    if (change != null) note.push(changeText(change));
    return this._seriesRow(this._compareName(), value, {
      swatch: 'dashed', color, note: tipNum(note.map(escapeHtml).join(' · ')),
    });
  }

  // The band's row (RC-051): 'Range  90 – 110', in the chart's value format.
  _bandRow({ lower, upper }) {
    const f = this._valueFormat();
    const b = this._bandOptions();
    return tipRow(escapeHtml(b.name), `${escapeHtml(f(lower))} – ${escapeHtml(f(upper))}`, {
      swatch: 'band', color: this._hex(b.color ?? this.theme.accent),
    });
  }

  // ── Value labels (RC-005) ─────────────────────────────────────────────────

  // 'currency' (the default) or 'number'; any other value is 'currency',
  // with a one-time warning.
  _yFormat() {
    const f = this.options.yFormat;
    if (f === 'number') return 'number';
    if (f != null && f !== 'currency') this._warnOnce('yFormat', `yFormat "${f}" is not 'currency' or 'number' — currency labels are drawn`);
    return 'currency';
  }

  // The default labels dressed in yPrefix / ySuffix: the prefix is '$' under
  // 'currency' and nothing under 'number', unless the page sets one.
  _dressValue(format) {
    const prefix = this.options.yPrefix ?? (this._yFormat() === 'number' ? '' : '$');
    const suffix = this.options.ySuffix ?? '';
    return v => `${prefix}${format(v)}${suffix}`;
  }

  // The Y tick labels: currency to the unit (',.0f'), or counts as Line
  // labels them — by the step between the ticks drawn (compactTickFormat),
  // round powers on a log scale.
  _tickFormat(tickValues, isLog) {
    if (this._yFormat() !== 'number') return this._dressValue(d3.format(',.0f'));
    return this._dressValue(isLog ? d3.format('.3~s') : compactTickFormat(tickValues));
  }

  // The tooltip's value: currency to the cent, or the exact count with
  // separators (§2.2: 1,234).
  _valueFormat() {
    return this._dressValue(d3.format(this._yFormat() === 'number' ? ',.2~f' : ',.2f'));
  }
}

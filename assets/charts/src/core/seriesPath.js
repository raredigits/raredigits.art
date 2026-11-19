// RareCharts — core/seriesPath.js
// Pure helpers for line-family series: input normalisation, the gaps rule,
// the view and log-axis filter, and path builders.
// All functions are stateless — no side effects.

import * as d3 from 'd3';
import { resolveCurve, parseDate, byDate, timeKit, stepInterval } from './utils.js';

// ─── Input ───────────────────────────────────────────────────────────────────

// A number, or NaN for a missing value: null, '' and booleans are not 0/1.
const readNumber = v => (v == null || v === '' || typeof v === 'boolean' ? NaN : +v);

/**
 * Normalize a time-series point list: dates parsed, numeric fields coerced,
 * rows with an unreadable date or value dropped, sorted by date (C-07).
 * Returns new objects in a new array — the caller's rows are never touched.
 *
 * @param {Array}    rows
 * @param {object}   [opts]
 * @param {string[]} [opts.fields=['value']] — numeric fields every row must carry
 * @param {boolean}  [opts.keep=false]       — keep the row's other fields (TimeSeries → tooltipFormat)
 * @param {string}   [opts.timeZone='local'] — the zone a date string is read in (parseDate, T-10)
 * @param {boolean}  [opts.keepNull=false]   — keep a row whose field is null, with null in
 *   it: a missing bucket at its date (TimeSeries gaps 'zero' / 'break', RC-005). Only
 *   null: '', NaN and text that is not a number are still unreadable
 * @returns {Array<{date: Date}>}
 */
export function normalizePoints(rows, { fields = ['value'], keep = false, timeZone = 'local', keepNull = false } = {}) {
  return (Array.isArray(rows) ? rows : [])
    .flatMap(d => {
      if (!d || typeof d !== 'object') return [];
      const date = parseDate(d.date, timeZone);
      if (!date) return [];
      const out = keep ? { ...d, date } : { date };
      for (const f of fields) {
        if (keepNull && d[f] === null) { out[f] = null; continue; }
        const v = readNumber(d[f]);
        if (!Number.isFinite(v)) return [];
        out[f] = v;
      }
      return [out];
    })
    .sort(byDate);
}

/**
 * Normalize one series of a line-family chart (Line, DualAxes). Every field of
 * the input series travels to render, so a per-series option the renderers
 * read can no longer be dropped here (C-03: strokeDash, markers…).
 *
 * @param {object} s      — raw series { name?, color?, values, ...style }
 * @param {number} idx    — position in the input; default name 'Series N'
 * @param {object} [opts] — { color: palette default, type: 'line'|'bar'|'band', axis?: 'y1'|'y2',
 *                          timeZone?: the chart's, for the dates (T-10) }
 * @returns {object} a new series object; `values` normalized by normalizePoints
 */
export function normalizeLineSeries(s, idx, { color, type = 'line', axis, timeZone = 'local' } = {}) {
  const width = readNumber(s.strokeWidth);
  const out = {
    ...s,
    name:        s.name  ?? `Series ${idx + 1}`,
    color:       s.color ?? color,
    type,
    // Absent or unreadable → undefined: render keeps its default width.
    strokeWidth: Number.isFinite(width) ? width : undefined,
    values:      normalizePoints(s.values, { fields: type === 'band' ? ['lower', 'upper'] : ['value'], timeZone }),
  };
  if (axis) out.axis = axis;
  if (type === 'band') out.fillOpacity = s.fillOpacity ?? s.areaOpacity;
  return out;
}

// ─── Gaps (RC-005) ───────────────────────────────────────────────────────────

// A missing bucket: a row whose value is null. Only TimeSeries' gaps rule
// keeps such rows (normalizePoints keepNull, fillGaps); a line stops at one.
export const isGap = d => d.value === null;

// fillGaps never adds more rows than this: a wrong interval over a long
// span (minutes across years) would otherwise build millions of them.
export const MAX_FILLED_BUCKETS = 100000;

/**
 * The rows a gaps rule draws (TimeSeries `gaps`, RC-005). `rows` are sorted
 * by date and normalised with keepNull, so a row whose value is null is a
 * missing bucket at its date.
 *   'join'  — the rows as given (the same array): the caller has dropped the
 *             null rows, and the line joins its neighbours (the rule before
 *             RC-005, and the default).
 *   'zero'  — every missing bucket is a row of value 0: a null row (its other
 *             fields kept), and every bucket of `interval` between two
 *             neighbours that has no row.
 *   'break' — the same buckets, with value null: the line stops there.
 * Without an interval, only the null rows are missing buckets. A bucket is
 * filled with a new row { date, value }, dated `interval` steps after the
 * row before the gap (stepInterval: the rows' own wall time and day of the
 * month), for as long as its bucket comes before the next row's. Buckets
 * before the first row are never filled; after the last row, only up to
 * `until`'s bucket and no later than `until` itself (the anchor of RC-001;
 * null, the default, fills nothing past the last row). Past `limit` filled
 * buckets the rest of the gaps join, and `capped` says so.
 *
 * @param {Array<{date: Date, value: number|null}>} rows
 * @param {object} [opts]
 * @param {string} [opts.gaps='join']      — 'join' | 'zero' | 'break'
 * @param {string|null} [opts.interval]    — a named interval (INTERVAL_NAMES), or null
 * @param {string} [opts.timeZone='local'] — the zone the buckets are cut in
 * @param {*}      [opts.weekStart=1]      — the first day of a week bucket (resolveWeekStart)
 * @param {Date|null} [opts.until=null]    — fill after the last row up to this instant's bucket
 * @param {number} [opts.limit]            — the most buckets filled (MAX_FILLED_BUCKETS)
 * @returns {{ rows: object[], capped: boolean }} new rows (the input is untouched)
 */
export function fillGaps(rows, {
  gaps = 'join', interval = null, timeZone = 'local', weekStart = 1, until = null, limit = MAX_FILLED_BUCKETS,
} = {}) {
  if (gaps !== 'zero' && gaps !== 'break') return { rows, capped: false };
  const bucket  = interval ? timeKit(timeZone).interval(interval, weekStart) : null;
  const missing = gaps === 'zero' ? 0 : null;
  const out = [];
  let filled = 0, capped = false;

  // The buckets after the row dated `from`: up to the bucket before `to`'s,
  // or with `inclusive` up to `to`'s bucket and `to` itself.
  const fillAfter = (from, to, inclusive) => {
    const end = +bucket.floor(to);
    for (let k = 1; ; k++) {
      const date = stepInterval(interval, from, k, timeZone);
      const b = +bucket.floor(date);
      if (inclusive ? (date > to || b > end) : (date >= to || b >= end)) return;
      if (filled >= limit) { capped = true; return; }
      out.push({ date, value: missing });
      filled++;
    }
  };

  rows.forEach((d, i) => {
    out.push(isGap(d) && missing !== null ? { ...d, value: missing } : d);
    if (!bucket || capped) return;
    const next = rows[i + 1];
    if (next) fillAfter(d.date, next.date, false);
    else if (until) fillAfter(d.date, until, true);
  });
  return { rows: out, capped };
}

// ─── View and log axis ───────────────────────────────────────────────────────

/**
 * The part of each series a time chart draws (Line, DualAxes, TimeSeries):
 * the values inside the view, and on a log axis only those it can place —
 * above zero; a band needs both edges above zero. The line then joins the
 * neighbours of a skipped value instead of drawing NaN — or, for a series
 * `breaks` names (TimeSeries under gaps 'zero' / 'break', RC-005), stops
 * there: the skipped value is kept as a gap, a copy of its row with value
 * null. A gap already in the series stays and is not counted. A series left
 * with no value (or only gaps) is dropped. The input is untouched: each
 * series kept is a new object (its other fields copied) over a new values
 * array of the same rows.
 *
 * @param {object[]} series   — [{ type?, values: [{ date, value } | { date, lower, upper }] }]
 * @param {Date[]}   extent   — the view [from, to], both ends included
 * @param {Function} isLog    — (series) => true when that series sits on a log axis
 * @param {Function} [breaks] — (series) => true when a skipped value leaves a gap
 * @returns {{ series: object[], skipped: number }} skipped — the values in
 *   view the log axis dropped (the class warns about them once per setData)
 */
export function filterLogSeries(series, extent, isLog, breaks = () => false) {
  const [from, to] = extent;
  let skipped = 0;
  const placeable = (s, d) => (s.type === 'band' ? d.lower > 0 && d.upper > 0 : d.value > 0);
  const kept = series
    .map(s => {
      const log = !!isLog(s);
      const gapOnSkip = log && !!breaks(s);
      const values = [];
      for (const d of s.values) {
        if (d.date < from || d.date > to) continue;
        if (log && !isGap(d) && !placeable(s, d)) {
          skipped++;
          if (gapOnSkip) values.push({ ...d, value: null });
          continue;
        }
        values.push(d);
      }
      return { ...s, values };
    })
    .filter(s => s.values.some(d => !isGap(d)));
  return { series: kept, skipped };
}

// ─── Baseline ────────────────────────────────────────────────────────────────

/**
 * Resolve the numeric baseline value for area fills. Not clamped here —
 * areaPath keeps it inside the scale's domain.
 *
 * @param {string|number} baseline  'zero' | 'min' | number
 * @param {number[]}      domain    [min, max] of the Y scale
 * @returns {number}
 */
export function baselineValue(baseline, domain) {
  if (typeof baseline === 'number' && Number.isFinite(baseline)) return baseline;
  if (baseline === 'min') return domain[0];
  return 0; // 'zero' default
}

// ─── Line path ───────────────────────────────────────────────────────────────

/**
 * Build a line path string for one series. A gap (a value of null, RC-005)
 * breaks the line; a series without gaps draws as it always has.
 *
 * @param {object}   series        — { values: [{date, value}], curve? }
 * @param {Function} x             — d3 time scale
 * @param {Function} y             — d3 linear scale
 * @param {string}   defaultCurve  — fallback curve name
 * @param {number}   tension       — tension for cardinal curve
 * @returns {string} SVG path d attribute
 */
export function linePath(series, x, y, defaultCurve = 'linear', tension = 0) {
  const curve = resolveCurve(series.curve ?? defaultCurve, tension);
  return d3.line()
    .defined(d => !isGap(d))
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(curve)(series.values);
}

// ─── Area path ───────────────────────────────────────────────────────────────

/**
 * Build an area path string for one series.
 *
 * @param {object}        series        — { values, curve?, areaBaseline? }
 * @param {Function}      x             — d3 time scale
 * @param {Function}      y             — d3 linear scale
 * @param {string}        defaultCurve  — fallback curve name
 * @param {string|number} globalBaseline— chart-level baseline fallback;
 *                                        clamped into the Y domain
 * @param {number}        tension       — tension for cardinal curve
 * @returns {string} SVG path d attribute
 */
export function areaPath(series, x, y, defaultCurve = 'linear', globalBaseline = 'zero', tension = 0) {
  const curve  = resolveCurve(series.curve ?? defaultCurve, tension);
  const domain = y.domain();
  let base     = baselineValue(series.areaBaseline ?? globalBaseline, domain);
  // A log scale (it has .base()) cannot place zero: fill down to the domain floor.
  if (typeof y.base === 'function' && !(base > 0)) base = domain[0];
  // The fill stays inside the plot: a baseline beyond the value range — 0
  // under data that never reaches it — ends at the nearer edge of the domain.
  const lo = Math.min(domain[0], domain[1]), hi = Math.max(domain[0], domain[1]);
  base = Math.min(Math.max(base, lo), hi);

  return d3.area()
    .x(d  => x(d.date))
    .y0(y(base))
    .y1(d => y(d.value))
    .curve(curve)(series.values);
}

// ─── Band path ─────────────────────────────────────────────────────────────────

/**
 * Build a band (ribbon) path string for one series — the filled region between
 * a lower and an upper value at each x. Used for confidence intervals
 * (e.g. P10–P90 forecast cones), min/max envelopes, and error bands.
 *
 * @param {object}   series        — { values: [{date, lower, upper}], curve? }
 * @param {Function} x             — d3 time scale
 * @param {Function} y             — d3 linear scale
 * @param {string}   defaultCurve  — fallback curve name
 * @param {number}   tension       — tension for cardinal curve
 * @returns {string} SVG path d attribute
 */
export function bandPath(series, x, y, defaultCurve = 'linear', tension = 0) {
  const curve = resolveCurve(series.curve ?? defaultCurve, tension);
  return d3.area()
    .x(d  => x(d.date))
    .y0(d => y(d.lower))
    .y1(d => y(d.upper))
    .curve(curve)(series.values);
}

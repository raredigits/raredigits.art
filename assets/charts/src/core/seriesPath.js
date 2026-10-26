// RareCharts — core/seriesPath.js
// Pure helpers for line-family series: input normalisation and path builders.
// All functions are stateless — no side effects.

import * as d3 from 'd3';
import { resolveCurve, parseDate, byDate } from './utils.js';

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
 * @returns {Array<{date: Date}>}
 */
export function normalizePoints(rows, { fields = ['value'], keep = false } = {}) {
  return (Array.isArray(rows) ? rows : [])
    .flatMap(d => {
      if (!d || typeof d !== 'object') return [];
      const date = parseDate(d.date);
      if (!date) return [];
      const out = keep ? { ...d, date } : { date };
      for (const f of fields) {
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
 * @param {object} [opts] — { color: palette default, type: 'line'|'bar'|'band', axis?: 'y1'|'y2' }
 * @returns {object} a new series object; `values` normalized by normalizePoints
 */
export function normalizeLineSeries(s, idx, { color, type = 'line', axis } = {}) {
  const width = readNumber(s.strokeWidth);
  const out = {
    ...s,
    name:        s.name  ?? `Series ${idx + 1}`,
    color:       s.color ?? color,
    type,
    // Absent or unreadable → undefined: render keeps its default width.
    strokeWidth: Number.isFinite(width) ? width : undefined,
    values:      normalizePoints(s.values, { fields: type === 'band' ? ['lower', 'upper'] : ['value'] }),
  };
  if (axis) out.axis = axis;
  if (type === 'band') out.fillOpacity = s.fillOpacity ?? s.areaOpacity;
  return out;
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
 * Build a line path string for one series.
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

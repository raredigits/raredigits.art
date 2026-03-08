// RareCharts — core/seriesPath.js
// Pure path-builder functions for line and area series.
// All functions are stateless — no side effects.

import * as d3 from 'd3';
import { resolveCurve } from './utils.js';

// ─── Baseline ────────────────────────────────────────────────────────────────

/**
 * Resolve the numeric baseline value for area fills.
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
 * @param {string|number} globalBaseline— chart-level baseline fallback
 * @param {number}        tension       — tension for cardinal curve
 * @returns {string} SVG path d attribute
 */
export function areaPath(series, x, y, defaultCurve = 'linear', globalBaseline = 'zero', tension = 0) {
  const curve  = resolveCurve(series.curve ?? defaultCurve, tension);
  const base   = baselineValue(series.areaBaseline ?? globalBaseline, y.domain());

  return d3.area()
    .x(d  => x(d.date))
    .y0(y(base))
    .y1(d => y(d.value))
    .curve(curve)(series.values);
}

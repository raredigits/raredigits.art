// RareCharts — core/utils.js
// Shared low-level helpers used across all chart types.

import * as d3 from 'd3';

// ─── Date ────────────────────────────────────────────────────────────────────

export function parseDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  const dt = new Date(v);
  return Number.isNaN(+dt) ? null : dt;
}

// ─── Curve ───────────────────────────────────────────────────────────────────

export function resolveCurve(name, tension = 0) {
  switch (name) {
    case 'monotone':   return d3.curveMonotoneX;
    case 'basis':      return d3.curveBasis;
    case 'cardinal':   return d3.curveCardinal.tension(tension);
    case 'step':       return d3.curveStep;
    case 'stepBefore': return d3.curveStepBefore;
    case 'stepAfter':  return d3.curveStepAfter;
    case 'linear':
    default:           return d3.curveLinear;
  }
}

// ─── Stroke dash ─────────────────────────────────────────────────────────────

/**
 * Resolve a strokeDash option to an SVG stroke-dasharray string (or null).
 *
 * @param {string|number[]|null} dash
 *   'solid'    → null
 *   'dashed'   → '6,4'
 *   'dotted'   → '2,3'
 *   'dashDot'  → '8,4,2,4'
 *   'longDash' → '12,4'
 *   number[]   → joined with ','
 * @returns {string|null}
 */
export function resolveStrokeDash(dash) {
  if (!dash || dash === 'solid') return null;
  if (Array.isArray(dash)) return dash.join(',');
  switch (dash) {
    case 'dashed':   return '6,4';
    case 'dotted':   return '2,3';
    case 'dashDot':  return '8,4,2,4';
    case 'longDash': return '12,4';
    default:         return null;
  }
}

// ─── Marker shape ─────────────────────────────────────────────────────────────

/**
 * Resolve a marker shape name to an SVG path `d` string centered on (0,0).
 *
 * @param {string} shape — 'circle'|'square'|'diamond'|'triangle'|'cross'
 * @param {number} size  — radius / half-size in px
 * @returns {string|null}  null for 'circle' (rendered as <circle> natively)
 */
export function markerPath(shape, size = 4) {
  const s = size;
  switch (shape) {
    case 'square':
      return `M${-s},${-s}h${s*2}v${s*2}h${-s*2}z`;
    case 'diamond':
      return `M0,${-s}L${s},0L0,${s}L${-s},0z`;
    case 'triangle':
      return `M0,${-s}L${s},${s}L${-s},${s}z`;
    case 'cross': {
      const t = s * 0.35;
      return `M${-s},${-t}h${s-t}v${-(s-t)}h${t*2}v${s-t}h${s-t}v${t*2}` +
             `h${-(s-t)}v${s-t}h${-t*2}v${-(s-t)}h${-(s-t)}z`;
    }
    case 'circle':
    default:
      return null; // rendered as <circle>
  }
}

// ─── Nice tick values ─────────────────────────────────────────────────────────

/**
 * Generate exactly `count` evenly-spaced tick values covering [lo, hi],
 * snapped to a "nice" step (1×, 2×, 5×, or 10× a power of 10).
 *
 * The returned array always has exactly `count` elements. If the last tick
 * exceeds `hi`, the caller should extend the scale domain to match.
 *
 * @param {number} lo    — lower bound of the (already-nice) domain
 * @param {number} hi    — upper bound
 * @param {number} count — number of tick values to produce (≥ 2)
 * @returns {number[]}
 */
export function niceTickValues(lo, hi, count) {
  if (count < 2 || lo === hi) return [lo];
  const rawStep = (hi - lo) / (count - 1);
  const exp  = Math.floor(Math.log10(rawStep));
  const frac = rawStep / Math.pow(10, exp);
  const m    = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  const step = m * Math.pow(10, exp);
  const start = Math.ceil(lo / step) * step;
  return Array.from({ length: count }, (_, i) => +((start + step * i).toPrecision(10)));
}

// ─── Ease ────────────────────────────────────────────────────────────────────

export function resolveEase(name) {
  switch (name) {
    case 'cubicInOut': return d3.easeCubicInOut;
    case 'linear':     return d3.easeLinear;
    case 'cubicOut':
    default:           return d3.easeCubicOut;
  }
}

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

export function clampDateExtent(extent, fullExtent) {
  if (!Array.isArray(extent) || extent.length < 2) return null;

  const start = parseDate(extent[0]);
  const end   = parseDate(extent[1]);
  if (!start || !end) return null;

  const lo = start <= end ? start : end;
  const hi = start <= end ? end   : start;

  if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) {
    return [lo, hi];
  }

  const fullStart = parseDate(fullExtent[0]);
  const fullEnd   = parseDate(fullExtent[1]);
  if (!fullStart || !fullEnd) return [lo, hi];

  return [
    new Date(Math.max(+lo, +fullStart)),
    new Date(Math.min(+hi, +fullEnd)),
  ];
}

export function resolveTimeframeExtent(step, fullExtent) {
  if (!step || !Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;

  const fullStart = parseDate(fullExtent[0]);
  const fullEnd   = parseDate(fullExtent[1]);
  if (!fullStart || !fullEnd) return null;

  const cfg = typeof step === 'string' ? { key: step, label: step } : step;
  if (!cfg) return null;

  if (Array.isArray(cfg.range)) {
    return clampDateExtent(cfg.range, fullExtent);
  }

  const key = String(cfg.key ?? cfg.label ?? '').trim().toUpperCase();
  if (!key) return null;
  if (key === 'ALL' || key === 'MAX') return [fullStart, fullEnd];

  const start = new Date(fullEnd);

  if (key === 'YTD') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return clampDateExtent([start, fullEnd], fullExtent);
  }

  const match = key.match(/^(\d+)\s*([DWMY])$/);
  if (!match) return null;

  const amount = +match[1];
  const unit   = match[2];

  if (unit === 'D') start.setDate(start.getDate() - amount);
  if (unit === 'W') start.setDate(start.getDate() - amount * 7);
  if (unit === 'M') start.setMonth(start.getMonth() - amount);
  if (unit === 'Y') start.setFullYear(start.getFullYear() - amount);

  return clampDateExtent([start, fullEnd], fullExtent);
}

export function extentEquals(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a[0] || !a[1] || !b[0] || !b[1]) return false;
  return +a[0] === +b[0] && +a[1] === +b[1];
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

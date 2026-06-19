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

// ─── Axis title length guard ───────────────────────────────────────────────────

const _warnedAxisTitles = new Set();

/**
 * One-time console hint when an axis title is clipped to fit its margin.
 * Deduplicated by title text so a resize re-render doesn't spam the console.
 *
 * @param {string} text — the full (un-clipped) title text
 */
export function warnAxisTitleClipped(text) {
  const str = String(text ?? '');
  if (_warnedAxisTitles.has(str)) return;
  _warnedAxisTitles.add(str);
  console.warn(
    `RareCharts: axis title "${str}" is wider than its axis margin and was ` +
    `truncated. Axis titles are meant to be terse units (e.g. "PRICE", ` +
    `"N · K HLX") — shorten the label, widen the margin, or set ` +
    `axisTitleMaxLength to cap it explicitly.`
  );
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
 *   '5,4'      → passed through as a raw SVG dash-array
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
  }
  // Raw SVG dash-array string, e.g. '5,4' or '4 3'.
  if (typeof dash === 'string' && /^[\d.,\s]+$/.test(dash.trim())) return dash.trim();
  return null;
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
  const exp     = Math.floor(Math.log10(rawStep));
  const base    = Math.pow(10, exp);

  // Try a richer multiplier set across two adjacent decades. Pick the step that
  // (a) covers [lo, hi] with `count` evenly-spaced ticks, and (b) minimizes
  // the gap between the last tick and `hi` (i.e. avoids domain overshoot like
  // [50, 100, 150, 200] when data tops at 125).
  const multipliers = [1, 2, 2.5, 5, 10];
  const candidates = [];
  for (const m of multipliers) {
    candidates.push(m * base);
    candidates.push(m * base * 10);
  }

  let best = null;
  for (const step of candidates) {
    const start    = Math.ceil(lo / step) * step;
    const lastTick = start + step * (count - 1);
    if (lastTick < hi - 1e-9) continue; // doesn't cover data top
    const overshoot = lastTick - hi;
    if (!best || overshoot < best.overshoot) {
      best = { step, start, overshoot };
    }
  }

  if (!best) {
    // Fallback to the original simple choice.
    const frac  = rawStep / base;
    const m     = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
    const step  = m * base;
    const start = Math.ceil(lo / step) * step;
    best = { step, start };
  }

  return Array.from({ length: count }, (_, i) => +((best.start + best.step * i).toPrecision(10)));
}

// ─── Annotations ─────────────────────────────────────────────────────────────

/**
 * Normalize an array of annotation configs.
 *
 * Vertical point:     { date, label?, color?, strokeDash?, labelColor? }
 * Vertical range:     { from, to, label?, color?, fill?, fillOpacity?, strokeDash?, labelColor? }
 * Horizontal line:    { value, axis?, label?, color?, strokeDash?, labelColor?, labelPosition? }
 * Horizontal band:    { yFrom, yTo, axis?, label?, color?, fill?, fillOpacity?, strokeDash?, labelColor?, labelPosition? }
 *
 * `axis` is 'y1' (default) or 'y2' — only relevant for DualAxes.
 * `labelPosition` is 'left' (default) or 'right' for horizontal annotations.
 *
 * Invalid entries (bad dates / numbers, missing required fields) are dropped.
 *
 * @param {Array} list — raw annotation configs from chart options
 * @returns {Array} normalized annotations
 */
export function normalizeAnnotations(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map(a => {
      if (!a || typeof a !== 'object') return null;

      const axisKey       = a.axis === 'y2' ? 'y2' : 'y1';
      const labelPosition = a.labelPosition === 'right' ? 'right' : 'left';

      // Horizontal band — { yFrom, yTo }
      if (a.yFrom != null || a.yTo != null) {
        const yFrom = +a.yFrom;
        const yTo   = +a.yTo;
        if (!Number.isFinite(yFrom) || !Number.isFinite(yTo)) return null;
        return {
          kind:          'hRange',
          yFrom:         Math.min(yFrom, yTo),
          yTo:           Math.max(yFrom, yTo),
          axis:          axisKey,
          label:         a.label ?? '',
          color:         a.color ?? null,
          fill:          a.fill ?? null,
          fillOpacity:   Number.isFinite(+a.fillOpacity) ? +a.fillOpacity : 0.08,
          strokeDash:    a.strokeDash ?? 'dashed',
          labelColor:    a.labelColor ?? null,
          labelPosition,
        };
      }

      // Horizontal line — { value }
      if (a.value != null) {
        const v = +a.value;
        if (!Number.isFinite(v)) return null;
        return {
          kind:          'hPoint',
          value:         v,
          axis:          axisKey,
          label:         a.label ?? '',
          color:         a.color ?? null,
          strokeDash:    a.strokeDash ?? 'dashed',
          labelColor:    a.labelColor ?? null,
          labelPosition,
        };
      }

      // Vertical range — { from, to }
      if (a.from != null || a.to != null) {
        const from = parseDate(a.from);
        const to   = parseDate(a.to);
        if (!from || !to) return null;
        const lo = from <= to ? from : to;
        const hi = from <= to ? to   : from;
        return {
          kind:        'range',
          from:        lo,
          to:          hi,
          label:       a.label ?? '',
          color:       a.color ?? null,
          fill:        a.fill ?? null,
          fillOpacity: Number.isFinite(+a.fillOpacity) ? +a.fillOpacity : 0.08,
          strokeDash:  a.strokeDash ?? 'dashed',
          labelColor:  a.labelColor ?? null,
        };
      }

      // Vertical point — { date }
      const date = parseDate(a.date);
      if (!date) return null;
      return {
        kind:       'point',
        date,
        label:      a.label ?? '',
        color:      a.color ?? null,
        strokeDash: a.strokeDash ?? 'dashed',
        labelColor: a.labelColor ?? null,
      };
    })
    .filter(Boolean);
}

// ─── Motion / reduced-motion ───────────────────────────────────────────────────

/**
 * Whether the user has asked the OS to minimize motion
 * (`prefers-reduced-motion: reduce`). Safe in non-browser/SSR contexts
 * (11ty build, tests) where `window`/`matchMedia` are absent — returns false.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gate an animation duration on the reduced-motion preference: returns the
 * given duration normally, or 0 when the user prefers reduced motion (so a
 * d3 transition resolves instantly instead of animating). Pass every
 * chart's animation duration through this before handing it to a transition.
 *
 * @param {number} ms — the desired duration in milliseconds
 * @returns {number}
 */
export function motionDuration(ms) {
  return prefersReducedMotion() ? 0 : ms;
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

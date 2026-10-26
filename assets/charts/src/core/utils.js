// RareCharts — core/utils.js
// Shared low-level helpers used across all chart types.

import * as d3 from 'd3';

// ─── Date ────────────────────────────────────────────────────────────────────

// A valid Date or null. Accepts Date objects, epoch milliseconds (0 is a
// valid epoch) and date strings. Invalid Dates, NaN/Infinity, null,
// undefined, booleans and empty strings are null — never 1970-01-01 or an
// Invalid Date that slips past a truthiness filter.
export function parseDate(v) {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  const dt = v instanceof Date ? v : new Date(v);
  return Number.isNaN(+dt) ? null : dt;
}

// Ascending by `date` — time-series input is drawn in date order whatever
// order it arrives in (APIs often return newest first).
export const byDate = (a, b) => a.date - b.date;

// `parse(value, isEnd)` reads a bound — parseDate by default; relation
// charts pass a reader that takes years and 'YYYY-MM' periods (see
// Chart._parseViewBound).
export function clampDateExtent(extent, fullExtent, parse = parseDate) {
  if (!Array.isArray(extent) || extent.length < 2) return null;

  const start = parse(extent[0], false);
  const end   = parse(extent[1], true);
  if (!start || !end) return null;

  const lo = start <= end ? start : end;
  const hi = start <= end ? end   : start;

  if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) {
    return [lo, hi];
  }

  const fullStart = parseDate(fullExtent[0]);
  const fullEnd   = parseDate(fullExtent[1]);
  if (!fullStart || !fullEnd) return [lo, hi];

  const from = Math.max(+lo, +fullStart);
  const to   = Math.min(+hi, +fullEnd);
  // A window that misses the data entirely clamps to nothing — null, so
  // callers fall back to the full extent instead of an inverted window.
  if (from > to) return null;
  return [new Date(from), new Date(to)];
}

export function resolveTimeframeExtent(step, fullExtent, parse = parseDate) {
  if (!step || !Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;

  const fullStart = parseDate(fullExtent[0]);
  const fullEnd   = parseDate(fullExtent[1]);
  if (!fullStart || !fullEnd) return null;

  const cfg = typeof step === 'string' ? { key: step, label: step } : step;
  if (!cfg) return null;

  if (Array.isArray(cfg.range)) {
    return clampDateExtent(cfg.range, fullExtent, parse);
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

// ─── Ids ─────────────────────────────────────────────────────────────────────

// Ids in <defs> (gradients, clip paths, markers) are document-global: two
// charts on one page must never share one, or the second paints with the
// first one's gradient — or with nothing, when the first is hidden (C-04).
// The counter keeps ids unique within this bundle; the salt keeps two copies
// of the bundle on one page apart. Starts with a letter, [a-z0-9-] only, so
// an id is safe in url(#…) and as a CSS selector.
const ID_SALT = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
let idCount = 0;

export function uid(prefix = 'rc') {
  return `${prefix}-${ID_SALT}-${++idCount}`;
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

// ─── Tick values ──────────────────────────────────────────────────────────────

/**
 * Linear Y ticks for a fixed domain: d3's 1-2-5 steps, every tick inside
 * [lo, hi]. The tick count follows the step (≈ `count`, not exactly it), so the
 * axis never stretches past the data to fit a fixed number of steps, as a
 * fixed-count step does when the range sits awkwardly (193 → an axis to 400).
 */
export function linearTickValues(lo, hi, count = 4) {
  if (!(hi > lo)) return [lo];
  let ticks = d3.ticks(lo, hi, count);
  if (ticks.length < 2) ticks = d3.ticks(lo, hi, count * 2);
  return ticks.length >= 2 ? ticks : [lo, hi];
}

/**
 * Padded Y domain for a log scale. The margin is a factor, not a share of the
 * range: `pad` of the data's log span below the minimum and above the maximum,
 * so both ends get the same visual room. Flat data gets ×/÷ 10^0.05.
 */
export function logPaddedDomain(min, max, pad = 0.08) {
  const f = max > min ? Math.pow(max / min, pad) : Math.pow(10, 0.05);
  return [min / f, max * f];
}

/**
 * Log-scale ticks inside [lo, hi] (lo > 0): powers of ten (10, 100, 1k…) when
 * the domain spans two or more of them — thinned to every 2nd/3rd power past
 * 2 × `count` — else the 1-2-5 steps (20, 50, 100…), else linear steps for a
 * domain too narrow for either.
 */
export function logTickValues(lo, hi, count = 4) {
  if (!(lo > 0) || !(hi > lo)) return lo > 0 ? [lo] : [];
  const inside = v => v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9);
  const k0 = Math.floor(Math.log10(lo));
  const k1 = Math.ceil(Math.log10(hi));

  const powers = d3.range(k0, k1 + 1).map(k => +Math.pow(10, k).toPrecision(12)).filter(inside);
  if (powers.length >= 2) {
    const every = Math.ceil(powers.length / Math.max(2, count * 2));
    return powers.filter((_, i) => i % every === 0);
  }

  const steps = d3.range(k0, k1 + 1)
    .flatMap(k => [1, 2, 5].map(m => +(m * Math.pow(10, k)).toPrecision(12)))
    .filter(inside);
  if (steps.length >= 2) return steps;

  return linearTickValues(lo, hi, count);
}

// ─── Number formats ──────────────────────────────────────────────────────────

/**
 * Default labels for the ticks of a linear value axis (C-30). The precision
 * comes from the step between the ticks actually drawn, as d3's
 * scale.tickFormat picks it: SI prefixes ('~s', one prefix for the whole
 * axis) once the largest |tick| reaches 1000, grouped decimals (',~f') below
 * it; zero always prints as '0'. 145…160 reads "145 150 155 160" (not
 * "150 150 160 160"), 0 reads "0" (not "0.0" or "0k"), −0.6 reads "−0.6"
 * (not "−600m"). A tick that falls between round steps (a stacked axis
 * divided into exact intervals) gets up to three more digits instead of a
 * rounded label.
 *
 * @param {number[]} ticks — the tick values the axis draws
 * @returns {(v: number) => string}
 */
export function compactTickFormat(ticks) {
  const vals   = (Array.isArray(ticks) ? ticks : []).map(Number).filter(Number.isFinite);
  const max    = d3.max(vals, Math.abs) ?? 0;
  const sorted = [...new Set(vals)].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < sorted.length; i++) step = Math.min(step, sorted[i] - sorted[i - 1]);
  step = Number.isFinite(step) && step > 0 ? +step.toPrecision(12) : (max || 1);

  const si    = max >= 1e3;
  const scale = si ? Math.pow(10, -Math.max(-8, Math.min(8, Math.floor(Math.log10(max) / 3))) * 3) : 1;
  const exact = p => vals.every(v => {
    const x = v * scale * Math.pow(10, p);
    return Math.abs(x - Math.round(x)) < 1e-6 * Math.max(1, Math.abs(x));
  });
  const p0 = si ? d3.precisionPrefix(step, max) : d3.precisionFixed(step);
  let p = p0;
  while (p < p0 + 3 && !exact(p)) p++;

  const f   = si ? d3.formatPrefix(`.${p}~s`, max) : d3.format(`,.${p}~f`);
  const eps = step * 1e-9;
  return v => (Math.abs(v) <= eps ? '0' : f(v));
}

/**
 * Default value labels — end labels, tooltip values (C-30): three significant
 * digits, '.3~r' below 1000 and SI '.3~s' from 1000 on: 147.3 → "147",
 * −0.6 → "−0.6", 0 → "0", 1234 → "1.23k".
 *
 * @param {number} v
 * @returns {string}
 */
export function compactValue(v) {
  const n = +v;
  if (!Number.isFinite(n)) return String(v);
  return Math.abs(n) >= 1e3 ? d3.format('.3~s')(n) : d3.format('.3~r')(n);
}

// ─── Date formats ────────────────────────────────────────────────────────────

const HOUR = 36e5;
const DAY  = 864e5;

/**
 * Default date-tick format for the span in view (C-31, TimeSeries): ≤ 36 h
 * '%H:%M', ≤ 92 days '%b %d', ≤ 366 days '%b', ≤ 5 years "%b '%y", longer
 * '%Y' — a month name never repeats ("Sep Oct Oct Oct") and a view across a
 * new year says which year.
 *
 * @param {[Date, Date]} extent — the dates in view
 * @returns {string} a d3.timeFormat specifier
 */
export function spanTimeFormat(extent) {
  const span = Array.isArray(extent) ? Math.abs(+extent[1] - +extent[0]) : NaN;
  if (!Number.isFinite(span)) return '%b';
  if (span <= 36 * HOUR)  return '%H:%M';
  if (span <= 92 * DAY)   return '%b %d';
  if (span <= 366 * DAY)  return '%b';
  if (span <= 1827 * DAY) return "%b '%y";   // five years, two of them leap
  return '%Y';
}

/**
 * The date-tick formatter for that span: spanTimeFormat's specifier, except
 * that on a clock-time axis a tick at midnight names the day ('%b %d'), so
 * a view across midnight reads "18:00 Jan 06 06:00", not "18:00 00:00 06:00".
 *
 * @param {[Date, Date]} extent — the dates in view
 * @returns {(d: Date) => string}
 */
export function spanTimeFormatter(extent) {
  const spec = spanTimeFormat(extent);
  const f    = d3.timeFormat(spec);
  if (spec !== '%H:%M') return f;
  const day = d3.timeFormat('%b %d');
  return d => (+d3.timeDay.floor(d) === +d ? day(d) : f(d));
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

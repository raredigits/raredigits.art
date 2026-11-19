// RareCharts — core/utils.js
// Shared low-level helpers used across all chart types.

import * as d3 from 'd3';

// ─── Date ────────────────────────────────────────────────────────────────────

// timeZone — 'local' (default) | 'UTC' (T-10): the zone a time chart (Line,
// DualAxes, TimeSeries, the dated Bar and their navigator strip; Overview on
// its own) reads a date without a zone of its own in, cuts its timeframes in
// (YTD, 1M, 1Y…), places its date ticks on and names its dates in (tick
// labels, the tooltip's date). The relation charts (Graph's flow view,
// MapFlow) take the same option for their ties' start / end (RC-006; the
// periods a tie adds to this table are at parseTime in core/links.js).
//
//   input                              'local'                    'UTC'
//   'YYYY-MM-DD' (date only)           local midnight that day    UTC midnight that day
//   'YYYY-MM'                          local midnight on the 1st  UTC midnight on the 1st
//   'YYYY'                             local midnight, 1 January  UTC midnight, 1 January
//   'YYYY-MM-DDTHH:mm[:ss[.sss]]'      that wall time, local      that wall time in UTC
//     (no Z or offset; 'T' or a space)
//   an ISO string with Z or ±hh:mm     the instant it names — the same in both
//   a number (epoch ms)                that instant — the same in both
//   a Date                             that instant — the same in both
//   any other text                     as the browser's Date reads it, in both
//
// An instant stays that instant: the zone only says where its day, month
// and year begin and what they are called. '/' may stand for '-', and a
// month or day may have one digit ('2024/3/1'). A month above 12, a day
// above 31 or a time past 24:00 is not a date (null); 31 February runs on
// into March, as Date has it. A number is always epoch ms here, never a year.
//
// Before T-10 a date-only string was UTC midnight (the ECMAScript rule)
// while the ticks, the tooltip and the presets were local — west of UTC
// every date-only row sat on the evening before and was named a day early.
// The relation charts read their ties the same way until RC-006: years,
// months and days in UTC, the timeframe steps and the navigator's axis in
// local time.

const _warnedTimeZones = new Set();

// 'UTC' or 'local' (either in any case). Anything else — an IANA name, a
// typo — reads as 'local', with a one-time console hint per value.
export function resolveTimeZone(v) {
  if (v == null) return 'local';
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (s === 'UTC') return 'UTC';
  if (s === 'LOCAL') return 'local';
  const key = String(v);
  if (!_warnedTimeZones.has(key)) {
    _warnedTimeZones.add(key);
    console.warn(`RareCharts: timeZone "${key}" is not supported — use 'local' (the default) or 'UTC'. Dates are read in local time.`);
  }
  return 'local';
}

// The named intervals (RC-005): the buckets a time series is counted in.
// The gaps rule fills by them; levels (RC-002) are keyed by them and the
// comparison (RC-004) steps by them. Finest first.
export const INTERVAL_NAMES = Object.freeze(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']);

// The day a value names: 0 Sunday … 6 Saturday, from a number or an
// English day name in any case; null for anything else.
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export function weekdayOf(v) {
  if (Number.isInteger(v) && v >= 0 && v <= 6) return v;
  const i = typeof v === 'string' ? WEEKDAY_NAMES.indexOf(v.trim().toLowerCase()) : -1;
  return i >= 0 ? i : null;
}

// The first day of a week: the day `v` names, else Monday, the ISO week
// (§2.1 of the analytics spec). The weekStart option (RC-001) reads it
// through Chart._weekStart, which warns about a value that names no day.
export function resolveWeekStart(v) {
  return weekdayOf(v) ?? 1;
}

// d3 has no quarter: three months from January, April, July or October.
// `month` is the zone's month interval, whose floor and offset it reuses.
function quarterInterval(month, utc) {
  const monthOf = date => (utc ? date.getUTCMonth() : date.getMonth());
  return d3.timeInterval(
    date => {
      const m = monthOf(date);
      if (utc) date.setUTCMonth(m - (m % 3), 1); else date.setMonth(m - (m % 3), 1);
      date.setTime(+month.floor(date));
    },
    (date, step) => { date.setTime(+month.offset(date, step * 3)); },
    (start, end) => month.count(start, end) / 3,
    date => Math.floor(monthOf(date) / 3),
  );
}

// The d3 pieces of a zone: the time scale, the date format and the
// intervals — d3's local ones, or its UTC ones. `week` starts on Monday;
// interval(name, weekStart) gives any named interval, a week from the day
// asked (resolveWeekStart), or null for a name it does not know.
function zoneKit(zone, scale, format, intervals, weeks) {
  return Object.freeze({
    zone, scale, format, ...intervals, week: weeks[1],
    interval(name, weekStart = 1) {
      if (name === 'week') return weeks[resolveWeekStart(weekStart)];
      return INTERVAL_NAMES.includes(name) ? intervals[name] : null;
    },
  });
}

const LOCAL_TIME = zoneKit('local', d3.scaleTime, d3.timeFormat, {
  day: d3.timeDay, month: d3.timeMonth, year: d3.timeYear,
  minute: d3.timeMinute, hour: d3.timeHour, quarter: quarterInterval(d3.timeMonth, false),
}, [d3.timeSunday, d3.timeMonday, d3.timeTuesday, d3.timeWednesday, d3.timeThursday, d3.timeFriday, d3.timeSaturday]);
const UTC_TIME = zoneKit('UTC', d3.scaleUtc, d3.utcFormat, {
  day: d3.utcDay, month: d3.utcMonth, year: d3.utcYear,
  minute: d3.utcMinute, hour: d3.utcHour, quarter: quarterInterval(d3.utcMonth, true),
}, [d3.utcSunday, d3.utcMonday, d3.utcTuesday, d3.utcWednesday, d3.utcThursday, d3.utcFriday, d3.utcSaturday]);

export function timeKit(timeZone = 'local') {
  return timeZone === 'UTC' ? UTC_TIME : LOCAL_TIME;
}

// A calendar string: a year, then a month, a day and a wall time, each
// optional after the one before it, and no zone of its own.
const CALENDAR = /^([+-]\d{6}|\d{4})(?:([-/])(\d{1,2})(?:\2(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?)?)?$/;

// The Date of a calendar date and wall time in that zone, set field by
// field: Date's constructor and Date.UTC read the years 0–99 as 19xx.
function calendarDate([y, mo, d, h, mi, s, ms], utc) {
  const dt = new Date(0);
  if (utc) {
    dt.setUTCFullYear(y, mo, d);
    dt.setUTCHours(h, mi, s, ms);
  } else {
    dt.setFullYear(y, mo, d);
    dt.setHours(h, mi, s, ms);
  }
  return dt;
}

// Midnight at the start of day `d` of month `m` (0-based) of year `y` in
// that zone, as a new Date — field by field, so the years 0–99 stay
// themselves. A month or day out of range runs on as Date has it (month 12
// is January of the next year, day 0 the last day of the month before):
// calendarMidnight(y, m + 1) - 1 is the last millisecond of month m.
export function calendarMidnight(y, m = 0, d = 1, timeZone = 'local') {
  return calendarDate([y, m, d, 0, 0, 0, 0], timeZone === 'UTC');
}

// A Date for a calendar string in that zone; null for one with a field out
// of range; undefined for text that is not a calendar string (with Z or an
// offset, a month name…), which the caller hands to Date.
function readCalendar(text, utc) {
  const m = CALENDAR.exec(text.trim());
  if (!m) return undefined;
  const [, y, , mo = '1', d = '1', h = '0', mi = '0', s = '0', frac = ''] = m;
  const month = +mo, day = +d, hour = +h, minute = +mi, second = +s;
  const ms = frac ? Math.floor(+`0.${frac}` * 1000) : 0;
  if (month < 1 || month > 12 || day < 1 || day > 31 || minute > 59 || second > 59) return null;
  if (hour > 24 || (hour === 24 && (minute || second || ms))) return null;
  return calendarDate([+y, month - 1, day, hour, minute, second, ms], utc);
}

// A valid Date or null. Accepts Date objects, epoch milliseconds (0 is a
// valid epoch) and date strings, read in `timeZone` as the table above
// says. Invalid Dates, NaN/Infinity, null, undefined, booleans and empty
// strings are null — never 1970-01-01 or an Invalid Date that slips past a
// truthiness filter. A Date comes back as the same object.
export function parseDate(v, timeZone = 'local') {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  if (v instanceof Date) return Number.isNaN(+v) ? null : v;
  if (typeof v === 'string') {
    const dt = readCalendar(v, timeZone === 'UTC');
    if (dt !== undefined) return dt;
  }
  const dt = new Date(v);
  return Number.isNaN(+dt) ? null : dt;
}

// Ascending by `date` — time-series input is drawn in date order whatever
// order it arrives in (APIs often return newest first).
export const byDate = (a, b) => a.date - b.date;

// The days in month `m` (0-based) of year `y` — the same in every zone.
function daysInMonth(y, m) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m + 1, 0);
  return dt.getUTCDate();
}

/**
 * The date `amount` calendar steps after `date` (before it when negative), at
 * the same wall time in that zone. unit: 'D' a day, 'W' a week, 'M' a month,
 * 'Y' a year. A month or year step keeps the day of the month where the
 * target month has it and takes that month's last day where it does not:
 * 1M back from 31 March 2024 is 29 February, 1Y back from 29 February 2024
 * is 28 February 2023 — Date's own setMonth / setFullYear run on into
 * 2 March and 1 March.
 *
 * @param {Date}   date
 * @param {string} unit               — 'D' | 'W' | 'M' | 'Y'
 * @param {number} amount             — whole steps, negative to go back
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @returns {Date|null} a new Date; null for another unit
 */
export function offsetCalendar(date, unit, amount, timeZone = 'local') {
  const utc = timeZone === 'UTC';
  const out = new Date(+date);
  const y = utc ? out.getUTCFullYear() : out.getFullYear();
  const m = utc ? out.getUTCMonth()    : out.getMonth();
  const d = utc ? out.getUTCDate()     : out.getDate();
  const set = (yy, mm, dd) => (utc ? out.setUTCFullYear(yy, mm, dd) : out.setFullYear(yy, mm, dd));

  if (unit === 'D' || unit === 'W') {
    set(y, m, d + amount * (unit === 'W' ? 7 : 1));
    return out;
  }
  if (unit !== 'M' && unit !== 'Y') return null;
  const months = m + amount * (unit === 'Y' ? 12 : 1);
  const ty = y + Math.floor(months / 12);
  const tm = ((months % 12) + 12) % 12;
  set(ty, tm, Math.min(d, daysInMonth(ty, tm)));
  return out;
}

/**
 * The date `k` steps of a named interval after `date` (before it when `k`
 * is negative), in that zone. Minutes and hours are absolute: a DST change
 * does not move them. A day or a week keeps the wall time, and a month, a
 * quarter or a year also keeps the day of the month where the target month
 * has it (offsetCalendar): 31 January steps to 29 February, not to 2 March
 * as d3's month offset does.
 *
 * @param {string} name               — one of INTERVAL_NAMES
 * @param {Date}   date
 * @param {number} k                  — whole steps
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @returns {Date|null} a new Date; null for a name it does not know
 */
export function stepInterval(name, date, k, timeZone = 'local') {
  switch (name) {
    case 'minute':  return new Date(+date + k * MINUTE);
    case 'hour':    return new Date(+date + k * HOUR);
    case 'day':     return offsetCalendar(date, 'D', k, timeZone);
    case 'week':    return offsetCalendar(date, 'W', k, timeZone);
    case 'month':   return offsetCalendar(date, 'M', k, timeZone);
    case 'quarter': return offsetCalendar(date, 'M', 3 * k, timeZone);
    case 'year':    return offsetCalendar(date, 'Y', k, timeZone);
    default:        return null;
  }
}

// The named interval the step from `a` to `b` is one of, or null (§2.6 of
// the analytics spec). Minutes and hours are exact. A day is the next
// calendar day 23–25 hours on, so the days a DST change shortens or
// lengthens count; a week is seven calendar days on; a month the next
// month 28–31 days on; a quarter three months on, 89–92 days; a year twelve
// months on, 365–366 days — each give or take the hour of a DST change.
function intervalOfStep(a, b, kit) {
  const dt = b - a;
  if (dt === MINUTE) return 'minute';
  if (dt === HOUR) return 'hour';
  const days = (lo, hi) => dt >= lo * DAY - HOUR && dt <= hi * DAY + HOUR;
  if (days(1, 1) && kit.day.count(a, b) === 1) return 'day';
  if (days(7, 7) && kit.day.count(a, b) === 7) return 'week';
  const months = kit.month.count(a, b);
  if (months === 1 && days(28, 31)) return 'month';
  if (months === 3 && days(89, 92)) return 'quarter';
  if (months === 12 && days(365, 366)) return 'year';
  return null;
}

/**
 * The interval a dated series is counted in, read from its rows (RC-005;
 * §2.6 of the analytics spec): its most common step between neighbours,
 * when that step is a named interval in the zone. A step that names none
 * counts by its own length, so data with a few gaps still reads as its
 * interval and irregular data as none. Rows on one date are skipped. Two
 * steps that tie for the most common give none: filling zeros into data
 * whose bucket is a guess draws a wrong line, and the interval option can
 * name it.
 *
 * @param {Array<{date: Date}>} rows  — sorted by date
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @returns {string|null} one of INTERVAL_NAMES, or null
 */
export function inferInterval(rows, timeZone = 'local') {
  const kit = timeKit(timeZone);
  const counts = new Map();
  for (let i = 1; i < (rows?.length ?? 0); i++) {
    const a = rows[i - 1].date, b = rows[i].date;
    if (!(b > a)) continue;
    const key = intervalOfStep(a, b, kit) ?? b - a;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = null, most = 0, tie = false;
  for (const [key, n] of counts) {
    if (n > most) { best = key; most = n; tie = false; }
    else if (n === most) tie = true;
  }
  return !tie && typeof best === 'string' ? best : null;
}

// `parse(value, isEnd)` reads a bound — parseDate by default; relation
// charts pass a reader that takes years and 'YYYY-MM' periods (see
// Chart._parseViewBound).
export function clampDateExtent(extent, fullExtent, parse = v => parseDate(v)) {
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

/**
 * The window of a timeframe step (RC-001; T-10 for the zone). The calendar
 * and rolling keys count back from the anchor A — `anchor`, else the end of
 * `fullExtent`, the rule before RC-001 (timeframeAnchor 'dataEnd') — and
 * every window ends at A. Keys, in any case:
 *
 *   ALL, MAX         the whole of fullExtent
 *   TODAY            [start of A's day, A]
 *   WTD              [start of A's week (weekStart), A]
 *   MTD              [start of A's month, A]
 *   YTD              [start of A's year, A]
 *   nH               [A − n hours, A] — real hours: 24H across a DST change
 *                    is 24 hours, while TODAY that day is 23 or 25
 *   nD nW nM nY      n calendar steps back from A (offsetCalendar: the same
 *                    wall time, the day of the month clamped)
 *   { range }        its own bounds, read by `parse`
 *
 * Days, weeks, months and years start in `timeZone`, the chart's. A window
 * is clamped to fullExtent (a window that starts before the data starts at
 * the data's start); one that misses it entirely, an A before the data
 * included, is null — as is a key it does not know.
 *
 * @param {string|object} step       — a key, or { key?, label?, range? }
 * @param {Date[]}  fullExtent       — [first, last]: the chart's full extent
 * @param {Function} [parse]         — (value, isEnd) => Date | null for a range's bounds
 * @param {string}  [timeZone='local'] — 'local' | 'UTC'
 * @param {object}  [opts]
 * @param {Date}    [opts.anchor]    — A; null: the end of fullExtent
 * @param {number|string} [opts.weekStart=1] — the first day of a week (resolveWeekStart)
 * @returns {Date[]|null}
 */
export function resolveTimeframeExtent(step, fullExtent, parse = v => parseDate(v), timeZone = 'local', { anchor = null, weekStart = 1 } = {}) {
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

  const end   = parseDate(anchor) ?? fullEnd;
  const tz    = timeKit(timeZone);
  const until = start => clampDateExtent([start, end], fullExtent);
  switch (key) {
    case 'TODAY': return until(tz.day.floor(end));
    case 'WTD':   return until(tz.interval('week', weekStart).floor(end));
    case 'MTD':   return until(tz.month.floor(end));
    case 'YTD':   return until(tz.year.floor(end));
  }

  const match = key.match(/^(\d+)\s*([HDWMY])$/);
  if (!match) return null;
  const n = +match[1];
  return until(match[2] === 'H' ? new Date(+end - n * HOUR) : offsetCalendar(end, match[2], -n, timeZone));
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

// The curve names the line charts take — the one list resolveCurve draws.
const CURVE_NAMES = new Set(['linear', 'monotone', 'basis', 'cardinal', 'step', 'stepBefore', 'stepAfter']);

// The curve name to draw: `name` when the charts know it, else `fallback`
// when that is one, else 'linear'. Names off the list — Object.prototype
// keys too — are unknown. TimeSeries settles its name here before it hands
// it to drawLineSeries, whose own fallback is linear (RC-080).
export function curveName(name, fallback = 'linear') {
  if (CURVE_NAMES.has(name)) return name;
  const drawn = CURVE_NAMES.has(fallback) ? fallback : 'linear';
  // A name the charts do not know draws the fallback, with one hint per name
  // (K-10): 'monotoneX' in two docs examples drew linear without a word.
  if (name != null && name !== '' && !_warnedCurves.has(String(name))) {
    _warnedCurves.add(String(name));
    console.warn(`RareCharts: curve "${name}" is not one of ${[...CURVE_NAMES].join(', ')} — drawing ${drawn}.`);
  }
  return drawn;
}

const _warnedCurves = new Set();

// A d3 curve by name; `tension` is the cardinal's. A name it does not know
// draws the `fallback` curve: linear on Line and DualAxes, monotone on
// TimeSeries.
export function resolveCurve(name, tension = 0, fallback = 'linear') {
  switch (curveName(name, fallback)) {
    case 'monotone':   return d3.curveMonotoneX;
    case 'basis':      return d3.curveBasis;
    case 'cardinal':   return d3.curveCardinal.tension(tension);
    case 'step':       return d3.curveStep;
    case 'stepBefore': return d3.curveStepBefore;
    case 'stepAfter':  return d3.curveStepAfter;
    default:           return d3.curveLinear;   // 'linear'
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
 * The value domain of bars, which grow from a zero baseline: the data range
 * with 0 in it, and on each side that has bars `pad` of its span as
 * headroom — Line's 8% — but no .nice(), so the axis does not run on to the
 * next round number (a tallest bar of 156k gets 168k, not 200k; ticks are
 * picked inside with linearTickValues). Explicit tick values may widen it,
 * as on Line. No bars, or all at zero: [0, 1].
 */
export function barValueDomain(min, max, { pad = 0.08, tickValues = null } = {}) {
  let lo = Math.min(0, min ?? 0);
  let hi = Math.max(0, max ?? 0);
  const span = hi - lo;
  if (span > 0) {
    if (hi > 0) hi += span * pad;
    if (lo < 0) lo -= span * pad;
  } else {
    [lo, hi] = [0, 1];
  }
  if (tickValues?.length) {
    lo = Math.min(lo, d3.min(tickValues));
    hi = Math.max(hi, d3.max(tickValues));
  }
  return [lo, hi];
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

const MINUTE = 6e4;
const HOUR   = 36e5;
const DAY    = 864e5;

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
 * Days, months and midnight are the zone's (T-10).
 *
 * @param {[Date, Date]} extent           — the dates in view
 * @param {string} [timeZone='local']     — 'local' | 'UTC'
 * @returns {(d: Date) => string}
 */
export function spanTimeFormatter(extent, timeZone = 'local') {
  const tz   = timeKit(timeZone);
  const spec = spanTimeFormat(extent);
  const f    = tz.format(spec);
  if (spec !== '%H:%M') return f;
  const day = tz.format('%b %d');
  return d => (+tz.day.floor(d) === +d ? day(d) : f(d));
}

/**
 * A bucket's date as a tooltip names it (RC-002, §5 of the analytics spec),
 * by the interval the rows are counted in, in that zone:
 *
 *   minute, hour   Nov 18, 2026, 14:00
 *   day            Nov 18, 2026
 *   week           Week of Nov 16, 2026   (the row's own date: its bucket's start)
 *   month          November 2026
 *   quarter        Q4 2026
 *   year           2026
 *   none (null)    Nov 18, 2026 — the day, the TimeSeries tooltip before RC-002
 *
 * The day is the browser's en-US short date, as it always was; the rest is
 * d3's format in the zone. `year: false` leaves the year out — 'Oct 18',
 * 'Oct 18, 14:00', 'Week of Oct 13', 'October', 'Q4' — for a date read
 * beside another of the same year (the comparison row of RC-004); a year
 * bucket keeps it, being nothing else.
 *
 * @param {Date}   date
 * @param {string|null} interval      — one of INTERVAL_NAMES, or null
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @param {object} [opts]
 * @param {boolean} [opts.year=true]  — name the year
 * @returns {string}
 */
export function bucketDateText(date, interval, timeZone = 'local', { year = true } = {}) {
  const utc = timeZone === 'UTC';
  const tz  = timeKit(timeZone);
  const day = () => date.toLocaleDateString('en-US', { ...(year ? { year: 'numeric' } : {}), month: 'short', day: 'numeric', ...(utc ? { timeZone: 'UTC' } : {}) });
  const yy  = year ? ` ${tz.format('%Y')(date)}` : '';
  switch (interval) {
    case 'minute':
    case 'hour':    return `${day()}, ${tz.format('%H:%M')(date)}`;
    case 'week':    return `Week of ${day()}`;
    case 'month':   return `${tz.format('%B')(date)}${yy}`;
    case 'quarter': return `Q${Math.floor((utc ? date.getUTCMonth() : date.getMonth()) / 3) + 1}${yy}`;
    case 'year':    return tz.format('%Y')(date);
    default:        return day();
  }
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
 * Dates are read like the chart's rows, in its `timeZone` (T-10).
 *
 * @param {Array}  list               — raw annotation configs from chart options
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @returns {Array} normalized annotations
 */
export function normalizeAnnotations(list, timeZone = 'local') {
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
        const from = parseDate(a.from, timeZone);
        const to   = parseDate(a.to, timeZone);
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
      const date = parseDate(a.date, timeZone);
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

/**
 * A time chart's annotations and the room their labels take above the plot
 * (Line, DualAxes, TimeSeries, vertical Bar) — worked out before the class
 * calls super(), where its default margin.top is set: `top` is the label
 * height plus a 4px gap when there is an annotation to label, else 0. The
 * class takes it as a floor for its own top; an explicit margin.top wins.
 *
 * @param {object}  options            — chart options (annotations, annotationLabelHeight,
 *                                       timeZone: the annotations' dates are read in it)
 * @param {boolean} [labelled=true]    — false: no room is kept (horizontal Bar has no date axis)
 * @returns {{ annotations: object[], labelHeight: number, top: number }}
 */
export function annotationRoom(options = {}, labelled = true) {
  const annotations = normalizeAnnotations(options.annotations, resolveTimeZone(options.timeZone));
  const labelHeight = options.annotationLabelHeight ?? 22;
  return { annotations, labelHeight, top: annotations.length && labelled ? labelHeight + 4 : 0 };
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

// RareCharts — core/compare.js
// The comparison series of a TimeSeries (RC-004, §7 of the analytics spec,
// owner answer 4 А): which earlier window a view is compared with, and that
// window's rows moved onto the view. Pure: the chart (charts/TimeSeries.js)
// builds the series from these on every render.
//
// compare: 'previousPeriod' shifts the view back by
//   - one unit of a calendar key: TODAY a day, WTD a week, MTD a month, YTD
//     a year — so 1–18 November compares with 1–18 October, not with the
//     18 days before 1 November;
//   - n units of a rolling key: nD, nW, nM, nY (calendar steps) and nH (real
//     hours, as the window itself counts them);
//   - the custom range's days (From to To, both counted);
//   - any other window (ALL, a step with its own range, the brush, the
//     wheel, setView with no period picked before) its own length: whole
//     days when both ends are zone midnights — a day a DST change makes 23
//     or 25 hours long is still one day — else rounded to whole days from a
//     day up and to whole hours from an hour up, so a daily rhythm lines up.
//     TimeSeries keeps the shift of the period picked while the brush, the
//     wheel or setView then move the window (_compareShift).
// compare: 'previousYear' shifts it back one year, whatever set the view.
//
// A calendar shift moves each row by itself (offsetCalendar: the same wall
// time, the day of the month clamped), so the months line up day by day:
// 31 October lands on 30 November, where 30 October lands too — two rows on
// one date keep the later one.

import * as d3 from 'd3';
import { offsetCalendar, timeKit } from './utils.js';

export const COMPARE_MODES = Object.freeze(['previousPeriod', 'previousYear']);

// The comparison's default name, its legend key: compareName replaces it.
export const COMPARE_NAMES = Object.freeze({
  previousPeriod: 'Previous period',
  previousYear:   'Previous year',
});

const HOUR = 36e5;
const CALENDAR_KEYS = Object.freeze({ TODAY: 'D', WTD: 'W', MTD: 'M', YTD: 'Y' });
const dated = d3.bisector(d => d.date);

// The source date of a moved row: where it was before the shift. A symbol,
// so it rides along when the row is copied (the log filter's gap copies)
// and never shows among the row's own fields.
const SOURCE = Symbol('rc.compare.source');

// The mode `v` names — 'previousPeriod' or 'previousYear', in any case — or
// null: false and unset are no comparison, anything else is unknown.
export function compareMode(v) {
  if (typeof v !== 'string') return null;
  const name = v.trim().toLowerCase();
  return COMPARE_MODES.find(m => m.toLowerCase() === name) ?? null;
}

/**
 * How far back the comparison's window lies (see the top of this file).
 *
 * @param {string} mode     — 'previousPeriod' | 'previousYear'
 * @param {Date[]} view     — the window drawn, [from, to]
 * @param {object} [opts]
 * @param {string} [opts.key]      — the timeframe key that set the view, when
 *                                   the view is still its window; null otherwise
 * @param {Date[]} [opts.days]     — the custom range's days, [midnight of From,
 *                                   the last millisecond of To], when it set the view
 * @param {string} [opts.timeZone='local'] — 'local' | 'UTC'
 * @returns {{unit: string, n: number}|{ms: number}|null} a calendar shift —
 *   n steps of 'D', 'W', 'M' or 'Y' (offsetCalendar) — or a span in
 *   milliseconds; null when there is nothing to compare (an empty window)
 */
export function compareShift(mode, view, { key = null, days = null, timeZone = 'local' } = {}) {
  if (mode === 'previousYear') return { unit: 'Y', n: 1 };
  if (mode !== 'previousPeriod') return null;
  const k = key == null ? '' : String(key).trim().toUpperCase();
  if (CALENDAR_KEYS[k]) return { unit: CALENDAR_KEYS[k], n: 1 };
  const rolling = k.match(/^(\d+)\s*([HDWMY])$/);
  if (rolling && +rolling[1] > 0) {
    const n = +rolling[1];
    return rolling[2] === 'H' ? { ms: n * HOUR } : { unit: rolling[2], n };
  }
  return lengthShift(days ?? view, timeZone);
}

// A window's own length: whole days when it runs from a zone midnight to a
// zone midnight — or to the last millisecond before one, as the custom range
// does. Any other window is rounded, so a daily rhythm lines up with the
// one before it: to whole days from a day up, to whole hours from an hour
// up, its span in milliseconds below that.
function lengthShift(win, timeZone) {
  if (!Array.isArray(win) || !win[0] || !win[1]) return null;
  const day = timeKit(timeZone).day;
  const midnight = t => +day.floor(new Date(t)) === t;
  const from = +win[0], to = +win[1];
  const end = midnight(to + 1) ? to + 1 : to;
  if (midnight(from) && midnight(end)) {
    const n = day.count(new Date(from), new Date(end));
    return n > 0 ? { unit: 'D', n } : null;
  }
  const span = to - from;
  if (!(span > 0)) return null;
  if (span >= 24 * HOUR) return { unit: 'D', n: Math.round(span / (24 * HOUR)) };
  if (span >= HOUR) return { ms: Math.round(span / HOUR) * HOUR };
  return { ms: span };
}

// A date moved by a shift: `sign` 1 forward, -1 back.
export function shiftDate(date, shift, sign = 1, timeZone = 'local') {
  return 'ms' in shift
    ? new Date(+date + sign * shift.ms)
    : offsetCalendar(date, shift.unit, sign * shift.n, timeZone);
}

// A shift as text, for a cache key.
export function shiftKey(shift) {
  if (!shift) return '';
  return 'ms' in shift ? `${shift.ms}ms` : `${shift.n}${shift.unit}`;
}

/**
 * The comparison's rows: those of `rows` in the view moved back by the
 * shift, both ends included, each moved forward again by the same shift —
 * a calendar shift row by row. A moved row is a copy of its row (the other
 * fields kept) at its new date; sourceDate() reads where it came from. Two
 * rows that land on one date keep the later one. A gap (value null) is
 * moved like any row, so the gaps rule of the rows holds for the comparison.
 *
 * @param {Array<{date: Date}>} rows — sorted by date: the rows drawn
 * @param {Date[]} view              — the window drawn, [from, to]
 * @param {object|null} shift        — compareShift's
 * @param {string} [timeZone='local']
 * @returns {object[]} new rows, sorted by date
 */
export function comparisonRows(rows, view, shift, timeZone = 'local') {
  if (!shift || !Array.isArray(rows) || !rows.length || !Array.isArray(view) || !view[0] || !view[1]) return [];
  const from = shiftDate(view[0], shift, -1, timeZone);
  const to   = shiftDate(view[1], shift, -1, timeZone);
  const moved = [];
  for (let i = dated.left(rows, from), hi = dated.right(rows, to); i < hi; i++) {
    const d = rows[i];
    moved.push({ ...d, date: shiftDate(d.date, shift, 1, timeZone), [SOURCE]: d.date });
  }
  // In date order: a DST change can move a row past the next one (a wall
  // time that does not exist runs on an hour). The sort is stable, so of
  // the rows on one date the later one comes last, and stays.
  moved.sort((a, b) => a.date - b.date);
  const out = [];
  for (const d of moved) {
    if (out.length && +out[out.length - 1].date === +d.date) out[out.length - 1] = d;
    else out.push(d);
  }
  return out;
}

// Where a row of the comparison came from (its date before the shift), or
// null for a row that was not moved.
export const sourceDate = d => d?.[SOURCE] ?? null;

// The change from the earlier value to the current one, (value − prev) /
// |prev|: 0.122 for 1,234 against 1,100. None (null) when either is
// missing or the earlier one is 0.
export function changeOf(value, prev) {
  if (!Number.isFinite(value) || !Number.isFinite(prev) || prev === 0) return null;
  return (value - prev) / Math.abs(prev);
}

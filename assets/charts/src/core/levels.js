// RareCharts — core/levels.js
// Resolution levels (RC-002, §5 of the analytics spec): a TimeSeries can be
// handed its rows at several bucket sizes at once — setData({ hour, day,
// month… }), each level keyed by a named interval (INTERVAL_NAMES) and
// aggregated by the server — and draws, for each window, the level that
// suits it. The rule is here, pure; TimeSeries applies it on every render.

import * as d3 from 'd3';
import { INTERVAL_NAMES, stepInterval, timeKit } from './utils.js';

// The most buckets a window draws before a coarser level takes over, unless
// the chart's resolution.maxPoints says otherwise.
export const DEFAULT_MAX_POINTS = 500;

const dated = d3.bisector(d => d.date);

// The level a setData key names — one of INTERVAL_NAMES, in any case — or
// null for a key that names none.
export function levelName(key) {
  const name = String(key).trim().toLowerCase();
  return INTERVAL_NAMES.includes(name) ? name : null;
}

// The rows of `rows` (sorted by date) dated inside the window, both ends
// included.
export function countInWindow(rows, [from, to]) {
  return Math.max(0, dated.right(rows, to) - dated.left(rows, from));
}

/**
 * Whether a level covers a window: its first bucket is at most one bucket
 * after the window's start and its last bucket at most one bucket before the
 * window's end. Counted in the level's own buckets, cut in the zone: hourly
 * rows up to 10:00 cover a window that ends at 11:21 (the 11:00 bucket may
 * not be out yet), rows up to 09:00 do not. A level that starts or stops
 * further inside the window leaves a part of it bare.
 *
 * @param {Array<{date: Date}>} rows  — the level's rows, sorted by date
 * @param {Date[]} view               — the window [from, to]
 * @param {string} name               — the level, one of INTERVAL_NAMES
 * @param {string} [timeZone='local'] — 'local' | 'UTC'
 * @param {number|string} [weekStart=1] — the first day of a week bucket
 * @returns {boolean}
 */
export function levelCovers(rows, [from, to], name, timeZone = 'local', weekStart = 1) {
  const bucket = timeKit(timeZone).interval(name, weekStart);
  if (!bucket || !rows.length) return false;
  const first = bucket.floor(rows[0].date);
  const last  = bucket.floor(rows[rows.length - 1].date);
  return +first <= +stepInterval(name, bucket.floor(from), 1, timeZone)
    && +last >= +stepInterval(name, bucket.floor(to), -1, timeZone);
}

/**
 * The level drawn for a window (§5): the finest level that covers it
 * (levelCovers) and has at most `maxPoints` rows in it; when every covering
 * level has more, the coarsest covering one; when none covers the window,
 * the finest level with any rows in it; when no level has a row in it, the
 * coarsest level — the one the navigator draws by default.
 *
 * @param {Array<{name: string, rows: object[]}>} levels — finest first, none empty
 * @param {Date[]|null} view — the window; null draws the coarsest level
 * @param {object} [opts]
 * @param {number} [opts.maxPoints=DEFAULT_MAX_POINTS]
 * @param {string} [opts.timeZone='local']
 * @param {number|string} [opts.weekStart=1]
 * @returns {string|null} the level's name; null without levels
 */
export function chooseLevel(levels, view, { maxPoints = DEFAULT_MAX_POINTS, timeZone = 'local', weekStart = 1 } = {}) {
  if (!levels.length) return null;
  const coarsest = levels[levels.length - 1];
  if (!view) return coarsest.name;
  const covering = levels.filter(l => levelCovers(l.rows, view, l.name, timeZone, weekStart));
  const level = covering.find(l => countInWindow(l.rows, view) <= maxPoints)
    ?? covering[covering.length - 1]
    ?? levels.find(l => countInWindow(l.rows, view) > 0)
    ?? coarsest;
  return level.name;
}

// TimeSeries levels (RC-002, analytics spec §5 with owner answer 1 А):
// setData({ hour, day, month… }) hands over the series at several bucket
// sizes, and the chart draws, for each window, the finest level that covers
// it within resolution.maxPoints. The full extent is the union of the levels,
// the navigator draws the coarsest, appendPoint(point, level) appends to a
// level, getLevel() and onViewChange(extent, { key, level }) name the level
// drawn, and the tooltip names the date by its bucket. The rule itself is in
// test/levels.test.js; the loading bar in test/chart-loading.test.js.
//
// Through the DOM and the public surface (S-17), with a few looks at the
// rows drawn (_data) and the levels held (_levels), as the gaps tests do.
// Sizes are the test's own (S-18): every box 800×400, the plot 730px wide,
// the pointer's x in the overlay is clientX. Dates are local, built with the
// local Date constructor (or UTC with Date.UTC for the 'UTC' zone); counts
// that a DST change could move are read from the rows themselves, so each
// expectation holds in every TZ run.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track, setGeometry, dragStrip } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const HOUR = 36e5;
const ms = extent => extent?.map(Number) ?? null;
const local = (y, m, d = 1, h = 0, mi = 0) => new Date(y, m, d, h, mi);
const utc = (y, m, d = 1, h = 0, mi = 0) => new Date(Date.UTC(y, m, d, h, mi));

// Wednesday 18 November 2026, 11:00: hours for the last 30 days, days for
// the last 400, months since January 2024 — the donor's traffic report
const END = local(2026, 10, 18, 11);
const HOURS  = Array.from({ length: 720 }, (_, i) => ({ date: new Date(+END - (719 - i) * HOUR), value: 10 + (i % 24) }));
const DAYS   = Array.from({ length: 400 }, (_, i) => ({ date: local(2026, 10, 18 - 399 + i), value: 200 + (i % 7) }));
const MONTHS = Array.from({ length: 35 }, (_, i) => ({ date: local(2024, i, 1), value: 6000 + i }));
const LEVELS = { hour: HOURS, day: DAYS, month: MONTHS };
const inView = (rows, [a, b]) => rows.filter(d => d.date >= a && d.date <= b).length;

const ts = (o = {}) => track(new TimeSeries(mount(null), { timeframes: ['7D', '1M', '1Y', 'ALL'], yFormat: 'number', ...o }));
const plot = c => c.container.querySelector(':scope > svg > g');
const lineD = c => c.container.querySelector('path.rc-ts-line')?.getAttribute('d') ?? null;
const points = d => (d?.match(/[ML]|C/g) ?? []).length;
const button = (c, label) => [...c.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === label);
const pressed = c => [...c.container.querySelectorAll('.rc-range-btn')]
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
const hover = (c, date) => plot(c).querySelector(':scope > rect')
  .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY: 50 }));
const tipHeader = c => c.container.querySelector('.rc-tooltip .rc-tooltip-header')?.textContent.trim();
const tipValue = c => c.container.querySelector('.rc-tooltip .rc-tooltip-value')?.textContent.trim();
const strip = c => c.container.querySelector('.rc-chart-navigator');
const markup = c => c.container.outerHTML.replace(/rc-[a-z0-9]{1,8}-\d+/g, 'rc-UID');

// ─── The level follows the window ────────────────────────────────────────────

describe('the level drawn follows the window', () => {
  it('ALL draws the months, 1Y the days, 1M the days (the hours start too late), 7D the hours', () => {
    const c = ts().setData(LEVELS);
    expect(c.getLevel()).toBe('month');
    expect(points(lineD(c))).toBe(35);
    c.setTimeframe('1Y');
    expect(c.getLevel()).toBe('day');
    expect(points(lineD(c))).toBe(inView(DAYS, c.getView()));
    c.setTimeframe('1M');
    expect(c.getLevel()).toBe('day');
    expect(points(lineD(c))).toBe(31);
    c.setTimeframe('7D');
    expect(c.getLevel()).toBe('hour');
    expect(points(lineD(c))).toBe(inView(HOURS, c.getView()));
    button(c, 'ALL').click();
    expect(c.getLevel()).toBe('month');
  });

  it('the full extent is the union of the levels: ALL runs from the first month to the last hour', () => {
    const c = ts().setData(LEVELS);
    expect(ms(c.getView())).toEqual(ms([MONTHS[0].date, END]));
    expect(pressed(c)).toEqual(['ALL']);
    // a level that ends later than the rest carries the end: the days alone end at midnight
    const days = ts().setData({ day: DAYS, month: MONTHS });
    expect(ms(days.getView())).toEqual(ms([MONTHS[0].date, DAYS.at(-1).date]));
  });

  it('setView and the zoom choose too: every view change', () => {
    const c = ts().setData(LEVELS);
    c.setView([local(2026, 10, 15), END]);
    expect(c.getLevel()).toBe('hour');
    c.setView([local(2026, 0, 1), END]);
    expect(c.getLevel()).toBe('day');
    c.setView([local(2025, 0, 1), END]);                // before the days' start
    expect(c.getLevel()).toBe('month');
    // the zoom, all the way out (jsdom has no svg viewBox: the zoom gets its extent)
    c.svg.call(c._zoom.extent([[0, 0], [c.width, c.height]]).scaleTo, 1);
    expect(c.getLevel()).toBe('month');
  });

  it('maxPoints at its boundary: the hours draw while the window holds no more of them', () => {
    const at = maxPoints => {
      const c = ts({ resolution: { maxPoints } }).setData(LEVELS).setTimeframe('7D');
      return c.getLevel();
    };
    const n = inView(HOURS, ts().setData(LEVELS).setTimeframe('7D').getView());
    expect(n).toBeGreaterThan(160);
    expect(at(n)).toBe('hour');
    expect(at(n - 1)).toBe('day');
    expect(at(5)).toBe('month');     // the 7 or 8 days do not fit: the coarsest covering level
  });

  it('a level covering part of the time: a window inside the hours draws them, one reaching past their start does not', () => {
    const c = ts({ resolution: { maxPoints: 10000 } }).setData(LEVELS);
    const first = HOURS[0].date;
    c.setView([new Date(+first - HOUR), END]);          // the first hour one bucket into the window
    expect(c.getLevel()).toBe('hour');
    c.setView([new Date(+first - 2 * HOUR), END]);      // two buckets: it does not cover
    expect(c.getLevel()).toBe('day');
  });

  it('no level covers the window: the finest one with rows in it', () => {
    // the hours and the days only; a window from before the days: neither covers it
    const c = ts().setData({ hour: HOURS, day: DAYS });
    c.setView([local(2024, 0, 1), END]);
    expect(c.getView()[0]).toEqual(DAYS[0].date);       // clamped to the full extent: the days' start
    expect(c.getLevel()).toBe('day');
    const m = ts().setData({ hour: HOURS, month: MONTHS.slice(0, 30) });   // months to June 2026
    m.setTimeframe('1M');
    expect(m.getLevel()).toBe('hour');
  });

  it('a single level draws as plain rows do: the same markup', () => {
    const plain = ts().setData(DAYS);
    const level = ts().setData({ day: DAYS });
    expect(markup(level)).toBe(markup(plain));
    expect(plain.getLevel()).toBeNull();
    expect(level.getLevel()).toBe('day');
  });
});

// ─── Anchored to now ─────────────────────────────────────────────────────────

describe("with timeframeAnchor 'now'", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  const today = (now, o = {}) => {
    vi.setSystemTime(now);
    return ts({ timeframes: ['TODAY', '24H', 'ALL'], timeframeAnchor: 'now', ...o }).setData(LEVELS).setTimeframe('TODAY');
  };

  it('hours to 11:00 still cover Today at 12:21 (its 12:00 hour may not be out), not at 13:21', () => {
    expect(today(local(2026, 10, 18, 12, 21)).getLevel()).toBe('hour');
    expect(today(local(2026, 10, 18, 13, 21)).getLevel()).toBe('day');
  });

  it("gaps 'zero' fills each level up to now's bucket, so the hours cover Today again", () => {
    const c = today(local(2026, 10, 18, 13, 21), { gaps: 'zero' });
    expect(c.getLevel()).toBe('hour');
    expect(c._data.slice(-3).map(d => [d.date.getHours(), d.value])).toEqual([[11, 10 + (719 % 24)], [12, 0], [13, 0]]);
    hover(c, local(2026, 10, 18, 13));
    expect(tipValue(c)).toBe('0');
    expect(c._levels.get('day').data.at(-1).date).toEqual(local(2026, 10, 18));
    expect(c._levels.get('month').data.at(-1).date).toEqual(local(2026, 10, 1));
  });

  it('the full extent runs on to now: ALL reaches it, the strip spans it', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    vi.setSystemTime(local(2026, 10, 18, 13, 21));
    const c = ts({ timeframeAnchor: 'now', navigator: true }).setData(LEVELS);
    expect(ms(c.getView())).toEqual(ms([MONTHS[0].date, local(2026, 10, 18, 13, 21)]));
    expect(ms(toStrip.mock.calls.at(-1)[2].extent)).toEqual(ms(c.getView()));
  });
});

// ─── The gaps rule, per level ────────────────────────────────────────────────

describe('the gaps rule applies to each level with its own bucket', () => {
  it("'zero': a missing hour is an hour of 0, a missing month a month of 0", () => {
    const hours = HOURS.filter((d, i) => i !== 700);      // one hour out, inside the last week
    const months = MONTHS.filter((d, i) => i !== 10);     // November 2024 out
    const c = ts({ gaps: 'zero' }).setData({ hour: hours, day: DAYS, month: months });
    expect(c.getLevel()).toBe('month');
    expect(points(lineD(c))).toBe(35);
    hover(c, local(2024, 10, 1));
    expect(tipHeader(c)).toBe('November 2024');
    expect(tipValue(c)).toBe('0');
    c.setTimeframe('7D');
    expect(c.getLevel()).toBe('hour');
    expect(points(lineD(c))).toBe(inView(HOURS, c.getView()));
    hover(c, HOURS[700].date);
    expect(tipValue(c)).toBe('0');
  });

  it("'break': each level breaks at its own missing buckets", () => {
    const months = MONTHS.filter((d, i) => i !== 10);
    const c = ts({ gaps: 'break' }).setData({ day: DAYS, month: months });
    expect((lineD(c).match(/M/g) ?? []).length).toBe(2);
    c.setTimeframe('1Y');
    expect((lineD(c).match(/M/g) ?? []).length).toBe(1);
  });
});

// ─── The navigator ───────────────────────────────────────────────────────────

describe('the navigator draws the coarsest level, or navigator.level', () => {
  const stripRows = spy => spy.mock.calls.at(-1)[0];

  it('the coarsest by default, over the whole extent, whatever the view draws', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    const c = ts({ navigator: true }).setData(LEVELS);
    expect(stripRows(toStrip)).toHaveLength(35);
    expect(stripRows(toStrip)[0].date).toEqual(MONTHS[0].date);
    expect(ms(toStrip.mock.calls.at(-1)[2].extent)).toEqual(ms([MONTHS[0].date, END]));
    c.setTimeframe('7D');
    expect(c.getLevel()).toBe('hour');
    expect(stripRows(toStrip)).toHaveLength(35);
    expect(strip(c).style.display).toBe('');
  });

  it("navigator: { level: 'day' } draws the days; a level the data lacks, the coarsest", () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    ts({ navigator: { level: 'day' } }).setData(LEVELS);
    expect(stripRows(toStrip)).toHaveLength(400);
    ts({ navigator: { level: 'Hour', height: 40 } }).setData(LEVELS);
    expect(stripRows(toStrip)).toHaveLength(720);
    ts({ navigator: { level: 'week' } }).setData(LEVELS);
    expect(stripRows(toStrip)).toHaveLength(35);
  });

  it('a navigator.level that names no level warns once and draws the coarsest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    const c = ts({ navigator: { level: 'days' } }).setData(LEVELS);
    c.setTimeframe('1Y');
    expect(stripRows(toStrip)).toHaveLength(35);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: navigator\.level "days" is not a level/);
  });
});

// ─── setData: lazy loading ───────────────────────────────────────────────────

describe('setData with levels keeps the view and the selected timeframe', () => {
  it('a page that loads the hours late: the window holds, the level follows the rows', () => {
    const c = ts().setData({ day: DAYS, month: MONTHS });
    const changed = vi.fn();
    c.onViewChange(changed);
    c.setTimeframe('7D');
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: '7D', level: 'day' });
    c.setLoading(true);
    c.setData({ day: DAYS, month: MONTHS, hour: HOURS });
    c.setLoading(false);
    expect(pressed(c)).toEqual(['7D']);
    expect(c.getLevel()).toBe('hour');
    expect(changed).toHaveBeenCalledTimes(1);          // setData reports nothing
    // and back: the hours dropped, the days draw again
    c.setData({ day: DAYS, month: MONTHS });
    expect(pressed(c)).toEqual(['7D']);
    expect(c.getLevel()).toBe('day');
  });

  it('a brushed window holds across setData too', () => {
    const c = ts().setData({ day: DAYS, month: MONTHS });
    c.setView([local(2026, 10, 12), local(2026, 10, 17)]);
    c.setData(LEVELS);
    expect(ms(c.getView())).toEqual(ms([local(2026, 10, 12), local(2026, 10, 17)]));
    expect(c.getLevel()).toBe('hour');
  });

  it('a key that is no level warns once and its rows are left out; keys in any case', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts().setData({ hours: HOURS, day: DAYS });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: setData: "hours" is not a level/);
    c.setData({ hours: HOURS, day: DAYS });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(c.getLevel()).toBe('day');
    expect(ts().setData({ Day: DAYS, MONTH: MONTHS }).getLevel()).toBe('month');
  });

  it('getLevel: null for plain rows and for no levels; the caller\'s rows are never touched', () => {
    expect(ts().setData(DAYS).getLevel()).toBeNull();
    const empty = ts().setData({});
    expect(empty.getLevel()).toBeNull();
    expect(empty.container.querySelector('path.rc-ts-line')).toBeNull();
    const rows = HOURS.map(d => ({ ...d, date: d.date.toISOString() }));
    const c = ts({ gaps: 'zero' }).setData({ hour: rows, day: DAYS });
    c.appendPoint({ date: new Date(+END + HOUR), value: 1 });
    expect(rows).toHaveLength(720);
    expect(typeof rows[0].date).toBe('string');
    expect(DAYS).toHaveLength(400);
  });
});

// ─── appendPoint ─────────────────────────────────────────────────────────────

describe('appendPoint(point, level)', () => {
  it('into a level: the selected timeframe moves with it', () => {
    const c = ts().setData(LEVELS).setTimeframe('7D');
    c.appendPoint({ date: new Date(+END + HOUR), value: 99 }, 'hour');
    expect(c.getView()[1]).toEqual(new Date(+END + HOUR));
    expect(pressed(c)).toEqual(['7D']);
    expect(c.getLevel()).toBe('hour');
    expect(c._levels.get('hour').rows).toHaveLength(721);
    expect(c._data.at(-1).value).toBe(99);
  });

  it('a point dated inside a level takes its place in date order', () => {
    const days = DAYS.filter((d, i) => i !== 390);
    const c = ts().setData({ day: days, month: MONTHS }).setTimeframe('1M');
    c.appendPoint({ date: DAYS[390].date, value: 42 }, 'day');
    const rows = c._levels.get('day').rows;
    expect(rows.map(d => +d.date)).toEqual(DAYS.map(d => +d.date));
    expect(rows[390].value).toBe(42);
    expect(points(lineD(c))).toBe(inView(DAYS, c.getView()));
  });

  it('without a level, to the finest', () => {
    const c = ts().setData(LEVELS);
    c.appendPoint({ date: new Date(+END + HOUR), value: 1 });
    expect(c._levels.get('hour').rows).toHaveLength(721);
    expect(c._levels.get('day').rows).toHaveLength(400);
    const days = ts().setData({ day: DAYS, month: MONTHS });
    days.appendPoint({ date: local(2026, 10, 19), value: 1 });
    expect(days._levels.get('day').rows).toHaveLength(401);
  });

  it('to a level the data lacks: a new level, in its place among the others', () => {
    const c = ts().setData({ day: DAYS, month: MONTHS });
    c.appendPoint({ date: local(2026, 10, 16), value: 7 }, 'week');
    expect([...c._levels.keys()]).toEqual(['day', 'week', 'month']);
    c.appendPoint({ date: END, value: 7 }, 'HOUR');
    expect([...c._levels.keys()]).toEqual(['hour', 'day', 'week', 'month']);
  });

  it('a level name that is no level warns once and leaves the point out', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts().setData(LEVELS);
    c.appendPoint({ date: new Date(+END + HOUR), value: 1 }, 'hours');
    c.appendPoint({ date: new Date(+END + HOUR), value: 1 }, 'hours');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: appendPoint: "hours" is not a level/);
    expect(c._levels.get('hour').rows).toHaveLength(720);
  });

  it('plain rows take no level: the point joins them', () => {
    const c = ts().setData(DAYS);
    c.appendPoint({ date: local(2026, 10, 19), value: 1 }, 'hour');
    expect(c._data).toHaveLength(401);
    expect(c.getLevel()).toBeNull();
  });
});

// ─── The tooltip ─────────────────────────────────────────────────────────────

describe('the tooltip names the date by the level drawn, in the zone', () => {
  it('hours, days and months of one chart; tooltipFormat gets info.level', () => {
    const fmt = vi.fn(() => 'x');
    const c = ts().setData(LEVELS);
    c.setTimeframe('7D');
    hover(c, END);
    expect(tipHeader(c)).toBe('Nov 18, 2026, 11:00');
    c.setTimeframe('1Y');
    hover(c, local(2026, 10, 18));
    expect(tipHeader(c)).toBe('Nov 18, 2026');
    button(c, 'ALL').click();
    hover(c, local(2026, 10, 1));
    expect(tipHeader(c)).toBe('November 2026');

    const f = ts({ tooltipFormat: fmt }).setData(LEVELS).setTimeframe('7D');
    hover(f, END);
    expect(fmt.mock.calls.at(-1)[1]).toEqual({ date: END, value: HOURS.at(-1).value, color: f.theme.accent, level: 'hour' });
    f.setTimeframe('ALL');
    hover(f, local(2026, 10, 1));
    expect(fmt.mock.calls.at(-1)[1].level).toBe('month');
  });

  const one = (level, rows, o = {}) => {
    const c = ts(o).setData({ [level]: rows });
    hover(c, rows.at(-1).date);
    return tipHeader(c);
  };

  it.each([
    ['minute',  [local(2026, 10, 18, 14, 4), local(2026, 10, 18, 14, 5)], 'Nov 18, 2026, 14:05'],
    ['hour',    [local(2026, 10, 18, 13), local(2026, 10, 18, 14)], 'Nov 18, 2026, 14:00'],
    ['day',     [local(2026, 10, 17), local(2026, 10, 18)], 'Nov 18, 2026'],
    ['week',    [local(2026, 10, 9), local(2026, 10, 16)], 'Week of Nov 16, 2026'],
    ['month',   [local(2026, 9, 1), local(2026, 10, 1)], 'November 2026'],
    ['quarter', [local(2026, 6, 1), local(2026, 9, 1)], 'Q4 2026'],
    ['year',    [local(2025, 0, 1), local(2026, 0, 1)], '2026'],
  ])('local, %s: "%s"', (level, dates, text) => {
    expect(one(level, dates.map((date, i) => ({ date, value: i + 1 })))).toBe(text);
  });

  it.each([
    ['minute',  [utc(2026, 10, 18, 14, 4), utc(2026, 10, 18, 14, 5)], 'Nov 18, 2026, 14:05'],
    ['hour',    [utc(2026, 10, 18, 13), utc(2026, 10, 18, 14)], 'Nov 18, 2026, 14:00'],
    ['day',     [utc(2026, 10, 17), utc(2026, 10, 18)], 'Nov 18, 2026'],
    ['week',    [utc(2026, 10, 9), utc(2026, 10, 16)], 'Week of Nov 16, 2026'],
    ['month',   [utc(2026, 9, 1), utc(2026, 10, 1)], 'November 2026'],
    ['quarter', [utc(2026, 6, 1), utc(2026, 9, 1)], 'Q4 2026'],
    ['year',    [utc(2025, 0, 1), utc(2026, 0, 1)], '2026'],
  ])("timeZone 'UTC', %s: \"%s\"", (level, dates, text) => {
    expect(one(level, dates.map((date, i) => ({ date, value: i + 1 })), { timeZone: 'UTC' })).toBe(text);
  });

  it('the level\'s name wins: over the interval option, and where the rows name no step', () => {
    expect(one('month', [{ date: local(2026, 10, 1), value: 1 }])).toBe('November 2026');
    expect(one('month', [local(2026, 9, 1), local(2026, 10, 1)].map(date => ({ date, value: 1 })), { interval: 'day' }))
      .toBe('November 2026');
  });

  it('plain rows: by the interval the rows\' steps name, else the interval option, else the day', () => {
    const plain = (rows, o) => {
      const c = ts(o).setData(rows);
      hover(c, rows.at(-1).date);
      return tipHeader(c);
    };
    expect(plain(MONTHS)).toBe('November 2026');
    expect(plain(DAYS)).toBe('Nov 18, 2026');
    expect(plain(HOURS)).toBe('Nov 18, 2026, 11:00');
    // irregular steps: no interval, the day as before
    const irregular = [1, 3, 7, 8, 12].map((d, i) => ({ date: local(2026, 10, d), value: i }));
    expect(plain(irregular)).toBe('Nov 12, 2026');
    // the option names it
    expect(plain(irregular, { interval: 'week' })).toBe('Week of Nov 12, 2026');
    expect(plain(MONTHS, { interval: 'quarter' })).toBe('Q4 2026');
  });
});

// ─── onViewChange(extent, { key, level }) ────────────────────────────────────

describe('onViewChange reports the key and the level, once per change', () => {
  it('a button click: once, with its key and the level it draws', () => {
    const c = ts().setData(LEVELS);
    const changed = vi.fn();
    c.onViewChange(changed);
    button(c, '7D').click();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: '7D', level: 'hour' });
    button(c, 'ALL').click();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: 'ALL', level: 'month' });
    c.setTimeframe('1Y');
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: '1Y', level: 'day' });
    c.setTimeframe('1M', { silent: true });
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it('a brush drag: once, at the release, with no key', () => {
    const c = ts({ navigator: true }).setData(LEVELS).setTimeframe('1Y');
    const changed = vi.fn();
    c.onViewChange(changed);
    dragStrip(strip(c), 600, 650, 700, 729);
    expect(changed).toHaveBeenCalledTimes(1);
    const [extent, info] = changed.mock.calls[0];
    expect(extent).toEqual(c.getView());
    expect(info).toEqual({ key: null, level: c.getLevel() });
    expect(pressed(c)).toEqual([]);
  });

  it('setView and the zoom: no key', () => {
    const c = ts().setData(LEVELS);
    const changed = vi.fn();
    c.onViewChange(changed);
    c.setView([local(2026, 10, 15), END]);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: null, level: 'hour' });
    c.svg.call(c._zoom.extent([[0, 0], [c.width, c.height]]).scaleTo, 1);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: null, level: 'month' });
  });

  it('plain rows: the level is null', () => {
    const c = ts().setData(DAYS);
    const changed = vi.fn();
    c.onViewChange(changed);
    button(c, '1M').click();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: '1M', level: null });
  });
});

// ─── appendPoint (S-19) ─────────────────────────────────────────────────────

describe('appendPoint (S-19)', () => {
  const lastOf = c => { c.setTimeframe('ALL'); return ms(c.getView())[1]; };

  it('plain rows: the point is read as setData reads one, sorted in, and the array passed is left alone', () => {
    const rows = DAYS.slice(0, 10);
    const c = ts().setData(rows);
    const next = local(2026, 11, 31);
    c.appendPoint({ date: next, value: '7' }, 'hour');      // plain rows take no level
    expect(rows).toHaveLength(10);
    expect(lastOf(c)).toBe(+next);
    expect(c.getLevel()).toBeNull();
    c.appendPoint({ date: 'soon', value: 1 });               // unreadable: left out
    expect(lastOf(c)).toBe(+next);
  });

  it('levels: without a level the point goes to the finest one; a named level takes it', () => {
    const c = ts().setData(LEVELS);
    const hour = new Date(+END + HOUR);
    c.appendPoint({ date: hour, value: 1 });
    expect(lastOf(c)).toBe(+hour);
    const month = local(2027, 0, 1);
    c.appendPoint({ date: month, value: 9000 }, 'month');
    expect(lastOf(c)).toBe(+month);
    expect(c.getLevel()).toBe('month');                      // ALL draws the months, the new one included
  });

  it('levels: a level the data lacks is made; a name that is no level warns once and is left out', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts().setData({ day: DAYS });
    const week = local(2027, 1, 1);
    c.appendPoint({ date: week, value: 1 }, 'week');
    expect(lastOf(c)).toBe(+week);
    c.appendPoint({ date: local(2028, 0, 1), value: 1 }, 'fortnight');
    c.appendPoint({ date: local(2028, 0, 2), value: 1 }, 'fortnight');
    expect(lastOf(c)).toBe(+week);
    expect(warn.mock.calls.filter(a => String(a[0]).includes('"fortnight" is not a level'))).toHaveLength(1);
  });
});

// TimeSeries gaps (RC-005, analytics spec §4 "Gaps" and §2.6): a missing
// bucket — a bucket of the interval between two rows that has no row, or a
// row whose value is null — is joined over ('join', the default and the rule
// of before), drawn as 0 ('zero') or left as a break ('break'). The pure
// helpers (fillGaps, inferInterval…) are tested in seriesPath.test.js and
// time-intervals.test.js; here, the chart: line, area, dots, crosshair,
// navigator, log scale, appendPoint and the legend.
//
// Through the DOM and the public surface (S-17). Sizes are the test's own
// (S-18): every box 800×400, so the plot is 730px wide and the pointer's x
// in the overlay is clientX. Dates are local, built with the local Date
// constructor, so each expectation holds in every TZ run; the DST block sets
// its own zone, as time-zones.test.js does.

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const at = h => new Date(2026, 0, 5, h);   // an hour of 5 January 2026
// hourly rows: `values[i]` at hour i; undefined leaves the hour out, null is a null row
const hourly = values => values.flatMap((value, h) => (value === undefined ? [] : [{ date: at(h), value }]));

const ts = (o = {}) => track(new TimeSeries(mount(null), o));
const plot = c => c.container.querySelector(':scope > svg > g');
const lineD = c => c.container.querySelector('path.rc-ts-line')?.getAttribute('d') ?? null;
const areaD = c => c.container.querySelector('path.rc-ts-area')?.getAttribute('d') ?? null;
const segments = d => (d?.match(/M/g) ?? []).length;
const points = d => (d?.match(/[ML]|C/g) ?? []).length;
const dots = c => [...c.container.querySelectorAll('circle.rc-ts-dot')];
const overlay = c => plot(c).querySelector(':scope > rect');
const crossLines = c => [...plot(c).querySelectorAll(':scope > line')];
const hover = (c, date, clientY = 50) =>
  overlay(c).dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY }));
const tooltip = c => c.container.querySelector('.rc-tooltip');
const tipText = c => tooltip(c).textContent.replace(/\s+/g, ' ').trim();
const stripLine = c => c.container.querySelector('.rc-chart-navigator path.rc-ov-line').getAttribute('d');
const markup = c => c.container.outerHTML.replace(/rc-[a-z0-9]{1,8}-\d+/g, 'rc-UID');
const values = c => c._data.map(d => d.value);

// 0 … 6 o'clock, hours 3 and 4 missing
const WITH_GAP = [10, 12, 11, undefined, undefined, 14, 13];

// ─── 'join': the default, as before ──────────────────────────────────────────

describe("'join' (the default): a missing bucket is dropped and the line joins", () => {
  it('missing hours are joined over: one line through the rows', () => {
    const c = ts().setData(hourly(WITH_GAP));
    expect(segments(lineD(c))).toBe(1);
    expect(values(c)).toEqual([10, 12, 11, 14, 13]);
    expect(dots(c)).toHaveLength(0);
  });

  it('a null row is dropped, as before: the same markup as without it', () => {
    const withNull = ts().setData(hourly([10, 12, null, 11, 14]));
    const without  = ts().setData(hourly([10, 12, undefined, 11, 14]));
    expect(values(withNull)).toEqual([10, 12, 11, 14]);
    expect(markup(withNull)).toBe(markup(without));
  });

  it("gaps: 'join' is the default itself; an unknown rule joins and says so once", () => {
    expect(markup(ts({ gaps: 'join' }).setData(hourly(WITH_GAP)))).toBe(markup(ts().setData(hourly(WITH_GAP))));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ gaps: 'zeros' }).setData(hourly([10, null, ...WITH_GAP]));
    expect(segments(lineD(c))).toBe(1);
    expect(values(c)).not.toContain(null);
    c.setData(hourly(WITH_GAP));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: gaps "zeros"/);
  });
});

// ─── 'zero' ──────────────────────────────────────────────────────────────────

describe("'zero': a missing bucket is drawn as 0", () => {
  it('every missing hour between two rows is a 0, on the line and the area', () => {
    const c = ts({ gaps: 'zero' }).setData(hourly(WITH_GAP));
    expect(values(c)).toEqual([10, 12, 11, 0, 0, 14, 13]);
    expect(c._data.map(d => d.date.getHours())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(segments(lineD(c))).toBe(1);
    expect(lineD(c)).toBe(ts({ gaps: 'join' }).setData(hourly([10, 12, 11, 0, 0, 14, 13])).container
      .querySelector('path.rc-ts-line').getAttribute('d'));
    expect(segments(areaD(c))).toBe(1);
    expect(c.yScale.domain()[0]).toBe(0);
    expect(dots(c)).toHaveLength(0);
  });

  it('the tooltip over a filled bucket shows its 0', () => {
    const c = ts({ gaps: 'zero' }).setData(hourly(WITH_GAP));
    hover(c, at(3));
    expect(tooltip(c).querySelector('.rc-tooltip-value').textContent.trim()).toBe('$0.00');
    const n = ts({ gaps: 'zero', yFormat: 'number' }).setData(hourly(WITH_GAP));
    hover(n, at(4));
    expect(tooltip(n).querySelector('.rc-tooltip-value').textContent.trim()).toBe('0');
  });

  it('a null row is a 0 at its date, and keeps its other fields for tooltipFormat', () => {
    const fmt = vi.fn((d, info) => `${d.note ?? ''}:${info.value}`);
    const rows = [{ date: at(0), value: 5 }, { date: at(1), value: null, note: 'outage' }, { date: at(2), value: 7 }];
    const c = ts({ gaps: 'zero', tooltipFormat: fmt }).setData(rows);
    expect(values(c)).toEqual([5, 0, 7]);
    hover(c, at(1));
    expect(fmt.mock.calls.at(-1)[0]).toMatchObject({ value: 0, note: 'outage' });
    expect(tipText(c)).toBe('outage:0');
    expect(rows[1].value).toBeNull();
  });

  it('no bucket is filled before the first row or after the last', () => {
    const c = ts({ gaps: 'zero' }).setData(hourly([undefined, undefined, 4, 5, undefined, 7, 8]));
    expect(c._data.map(d => d.date.getHours())).toEqual([2, 3, 4, 5, 6]);
    expect(c.getView().map(Number)).toEqual([+at(2), +at(6)]);
  });

  it('up to the anchor (_gapsUntil, RC-001): data to 09:00 at 11:21 gives zeros at 10:00 and 11:00', () => {
    class Anchored extends TimeSeries {
      _gapsUntil() { return new Date(2026, 0, 5, 11, 21); }
    }
    const c = track(new Anchored(mount(null), { gaps: 'zero' }))
      .setData([7, 8, 9].map(h => ({ date: at(h), value: h })));
    expect(c._data.map(d => [d.date.getHours(), d.value])).toEqual([[7, 7], [8, 8], [9, 9], [10, 0], [11, 0]]);
    expect(c.getView().map(Number)).toEqual([+at(7), +at(11)]);
    expect(points(lineD(c))).toBe(5);
  });

  it('a point alone in view gets a dot', () => {
    const c = ts({ gaps: 'zero' }).setData([{ date: at(3), value: 4 }]);
    expect(dots(c)).toHaveLength(1);
    expect(dots(ts().setData([{ date: at(3), value: 4 }]))).toHaveLength(0);
  });

  it('the navigator draws the zeros', () => {
    const c = ts({ gaps: 'zero', navigator: true }).setData(hourly(WITH_GAP));
    expect(segments(stripLine(c))).toBe(1);
    expect(points(stripLine(c))).toBe(7);
    const joined = ts({ navigator: true }).setData(hourly(WITH_GAP));
    expect(points(stripLine(joined))).toBe(5);
  });
});

// ─── 'break' ─────────────────────────────────────────────────────────────────

describe("'break': the line and the area stop at a missing bucket", () => {
  it('two stretches either side of the missing hours, on the line and the area', () => {
    const c = ts({ gaps: 'break' }).setData(hourly(WITH_GAP));
    expect(values(c)).toEqual([10, 12, 11, null, null, 14, 13]);
    expect(segments(lineD(c))).toBe(2);
    expect(segments(areaD(c))).toBe(2);
    expect(lineD(c)).not.toMatch(/NaN/);
    expect(dots(c)).toHaveLength(0);
  });

  it('a point between two gaps gets a dot of theme.dotRadius in the line colour', () => {
    const c = ts({ gaps: 'break', interval: 'hour' }).setData(hourly([10, 12, undefined, 9, undefined, 14, 13]));
    const [dot, ...more] = dots(c);
    expect(more).toHaveLength(0);
    expect(+dot.getAttribute('cx')).toBeCloseTo(c.xScale(at(3)));
    expect(+dot.getAttribute('cy')).toBeCloseTo(c.yScale(9));
    expect(dot.getAttribute('r')).toBe(String(defaultTheme.dotRadius));
    expect(dot.getAttribute('fill')).toBe(c.theme.accent);
    const big = ts({ gaps: 'break', interval: 'hour', theme: { dotRadius: 5 } }).setData(hourly([10, undefined, 9, undefined, 14]));
    expect(dots(big).map(d => d.getAttribute('r'))).toEqual(['5', '5', '5']);
  });

  it('the crosshair over a gap reads "No data": the date, no value line, tooltipFormat not asked', () => {
    const fmt = vi.fn(() => 'custom');
    const c = ts({ gaps: 'break', tooltipFormat: fmt }).setData(hourly(WITH_GAP));
    hover(c, at(4), 120);
    expect(tipText(c)).toMatch(/No data$/);
    expect(tooltip(c).querySelector('.rc-tooltip-muted:not(.rc-tooltip-header)').textContent).toBe('No data');
    expect(tooltip(c).classList.contains('is-visible')).toBe(true);
    expect(fmt).not.toHaveBeenCalled();
    const [v, h] = crossLines(c);
    expect(v.style.opacity).toBe('1');
    expect(+v.getAttribute('x1')).toBeCloseTo(c.xScale(at(4)));
    expect(h.style.opacity).toBe('0');
    // over a value: the formatter, both lines
    hover(c, at(5));
    expect(tipText(c)).toBe('custom');
    expect(fmt).toHaveBeenCalledTimes(1);
    expect(crossLines(c).map(l => l.style.opacity)).toEqual(['1', '1']);
  });

  it('the default tooltip over a gap: the date header, then "No data"', () => {
    const c = ts({ gaps: 'break' }).setData(hourly(WITH_GAP));
    hover(c, at(3));
    const header = tooltip(c).querySelector('.rc-tooltip-header');
    // hourly rows: the date names the hour (RC-002, the interval read from the rows)
    expect(header.textContent).toBe(`${at(3).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}, 03:00`);
    // the series' row says so, in words and muted (RC-082)
    const value = tooltip(c).querySelector('.rc-tooltip-row .rc-tooltip-value');
    expect(value.textContent).toBe('No data');
    expect(value.className).toBe('rc-tooltip-value rc-tooltip-muted');
  });

  it('a null row is a gap at its date, even with no interval to read', () => {
    // irregular hours (1, 2, 3, 4 and 5 hours apart): no interval, so only the null row breaks the line
    const rows = [0, 1, 3, 6, 10, 15].map((h, i) => ({ date: at(h), value: i === 3 ? null : 10 + i }));
    const c = ts({ gaps: 'break' }).setData(rows);
    expect(values(c)).toEqual([10, 11, 12, null, 14, 15]);
    expect(segments(lineD(c))).toBe(2);
    const noNull = ts({ gaps: 'break' }).setData(rows.filter(d => d.value !== null));
    expect(segments(lineD(noNull))).toBe(1);
  });

  it('the interval option names the bucket when the rows do not', () => {
    const days = [1, 3, 5].map(d => ({ date: new Date(2026, 0, d), value: d }));
    expect(segments(lineD(ts({ gaps: 'break' }).setData(days)))).toBe(1);
    const c = ts({ gaps: 'break', interval: 'day' }).setData(days);
    expect(values(c)).toEqual([1, null, 3, null, 5]);
    expect(dots(c)).toHaveLength(3);
    expect(values(ts({ gaps: 'zero', interval: 'Day' }).setData(days))).toEqual([1, 0, 3, 0, 5]);
  });

  it('an interval it does not know is read from the data, with a warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ gaps: 'zero', interval: 'fortnight' }).setData(hourly(WITH_GAP));
    expect(values(c)).toEqual([10, 12, 11, 0, 0, 14, 13]);
    c.appendPoint({ date: at(8), value: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: interval "fortnight"/);
  });

  it('a view inside a gap shows the empty state', () => {
    const c = ts({ gaps: 'break', interval: 'hour' }).setData(hourly([10, 12, undefined, undefined, undefined, undefined, 13]));
    c.setView([new Date(2026, 0, 5, 2, 30), new Date(2026, 0, 5, 4, 30)]);
    expect(lineD(c)).toBeNull();
    expect(dots(c)).toHaveLength(0);
    c.setView(null);
    expect(segments(lineD(c))).toBe(2);   // 0–1, and 6 alone (a move, no line)
    expect(dots(c)).toHaveLength(1);
  });

  it('the navigator joins over the gaps: a strip, not a reading', () => {
    const c = ts({ gaps: 'break', navigator: true }).setData(hourly(WITH_GAP));
    expect(segments(stripLine(c))).toBe(1);
    expect(stripLine(c)).toBe(stripLine(ts({ navigator: true }).setData(hourly(WITH_GAP))));
  });

  it('only null rows: nothing to draw, nothing thrown; the strip hides', () => {
    const c = ts({ gaps: 'break', navigator: true, seriesName: 'Visits' })
      .setData([{ date: at(1), value: null }, { date: at(2), value: null }]);
    expect(lineD(c)).toBeNull();
    expect(c.container.querySelector('.rc-chart-navigator').style.display).toBe('none');
    expect(c._legendSeries().map(s => s.key)).toEqual(['Visits']);
  });
});

// ─── The Y range ────────────────────────────────────────────────────────────

describe('the Y range', () => {
  it("'break' fits the values only (±1%); 'zero' reaches down to 0", () => {
    const b = ts({ gaps: 'break' }).setData(hourly(WITH_GAP));
    expect(b.yScale.domain()).toEqual([10 * 0.99, 14 * 1.01]);
    expect(ts().setData(hourly(WITH_GAP)).yScale.domain()).toEqual([10 * 0.99, 14 * 1.01]);
    expect(ts({ gaps: 'zero' }).setData(hourly(WITH_GAP)).yScale.domain()).toEqual([0, 14 * 1.01]);
  });
});

// ─── Log scale ──────────────────────────────────────────────────────────────

describe("a log scale: the zeros are skipped with the warning, so 'zero' draws as 'break'", () => {
  it("'zero': the filled zeros leave gaps, with one warning", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ gaps: 'zero', yScale: 'log' }).setData(hourly(WITH_GAP));
    expect(segments(lineD(c))).toBe(2);
    expect(segments(areaD(c))).toBe(2);
    expect(lineD(c)).not.toMatch(/NaN|Infinity/);
    c.render();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe('RareCharts.TimeSeries: 2 values ≤ 0 skipped on the log scale');
    // the crosshair over one of them: no value to place
    hover(c, at(3));
    expect(tipText(c)).toMatch(/No data$/);
  });

  it("'break': a value ≤ 0 in the data breaks the line too; 'join' joins it, as before", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = hourly([10, 12, 0, 11, 14]);
    expect(segments(lineD(ts({ gaps: 'break', yScale: 'log' }).setData(rows)))).toBe(2);
    expect(segments(lineD(ts({ yScale: 'log' }).setData(rows)))).toBe(1);
  });

  it('a point left alone between skipped zeros gets its dot', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ gaps: 'zero', yScale: 'log', interval: 'hour' }).setData(hourly([10, 12, undefined, 9, undefined, 14, 13]));
    expect(dots(c)).toHaveLength(1);
  });
});

// ─── appendPoint ────────────────────────────────────────────────────────────

describe('appendPoint follows the gaps rule', () => {
  it("'zero': a point three hours on fills the two hours between", () => {
    const c = ts({ gaps: 'zero' }).setData(hourly([10, 12, 11]));
    c.appendPoint({ date: at(5), value: 9 });
    expect(values(c)).toEqual([10, 12, 11, 0, 0, 9]);
    expect(points(lineD(c))).toBe(6);
  });

  it("'break': a null point is a gap; 'join': it is dropped, as before", () => {
    const b = ts({ gaps: 'break' }).setData(hourly([10, 12, 11]));
    b.appendPoint({ date: at(3), value: null });
    expect(values(b)).toEqual([10, 12, 11, null]);
    expect(b.getView().map(Number)).toEqual([+at(0), +at(3)]);
    b.appendPoint({ date: at(4), value: 8 });
    expect(values(b)).toEqual([10, 12, 11, null, 8]);
    expect(dots(b)).toHaveLength(1);
    const j = ts().setData(hourly([10, 12, 11]));
    j.appendPoint({ date: at(3), value: null });
    expect(values(j)).toEqual([10, 12, 11]);
  });
});

// ─── The legend ─────────────────────────────────────────────────────────────

describe('the legend hides the series with its dots', () => {
  it('hidden: no line, no area, no dots; shown again: all back', () => {
    const c = ts({ gaps: 'break', interval: 'hour', seriesName: 'Visits', legend: [{ label: 'Visits' }] })
      .setData(hourly([10, 12, undefined, 9, undefined, 14, 13]));
    expect(dots(c)).toHaveLength(1);
    c.setSeriesVisible([]);
    expect([lineD(c), areaD(c), dots(c).length]).toEqual([null, null, 0]);
    c.setSeriesVisible(null);
    expect(dots(c)).toHaveLength(1);
    expect(segments(lineD(c))).toBe(3);   // 0–1, 3 alone, 5–6
  });
});

// ─── The cap ────────────────────────────────────────────────────────────────

describe('a wrong interval cannot build millions of rows', () => {
  it('past 100000 filled buckets the rest of the gaps join, with a warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ gaps: 'zero', interval: 'minute' })
      .setData([{ date: new Date(2026, 0, 1), value: 1 }, { date: new Date(2026, 2, 15), value: 2 }]);
    expect(c._data).toHaveLength(100002);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: gaps: more than 100000 empty buckets/);
  });
});

// ─── Zones and DST ──────────────────────────────────────────────────────────

describe("timeZone: 'UTC' fills UTC buckets", () => {
  it('a missing UTC day is filled at UTC midnight', () => {
    const U = d => new Date(Date.UTC(2026, 0, d));
    const c = ts({ gaps: 'zero', timeZone: 'UTC' }).setData(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05']
      .map((date, i) => ({ date, value: i + 1 })));
    expect(c._data.map(d => +d.date)).toEqual([U(1), U(2), U(3), U(4), U(5)].map(Number));
    expect(values(c)).toEqual([1, 2, 3, 0, 4]);
  });
});

describe('DST days (TZ=America/Los_Angeles)', () => {
  const original = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'America/Los_Angeles'; });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('the zone is in effect', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(480);
  });

  it('daily rows across 10 March 2024: the missing DST day is filled at its local midnight', () => {
    const rows = ['2024-03-08', '2024-03-09', '2024-03-11', '2024-03-12'].map((date, i) => ({ date, value: i + 1 }));
    const c = ts({ gaps: 'zero' }).setData(rows);
    expect(c._data.map(d => +d.date)).toEqual([8, 9, 10, 11, 12].map(d => +new Date(2024, 2, d)));
    expect(values(c)).toEqual([1, 2, 0, 3, 4]);
    // the 3 November day of 25 hours too
    const fall = ts({ gaps: 'break' }).setData(['2024-11-01', '2024-11-02', '2024-11-04', '2024-11-05']
      .map((date, i) => ({ date, value: i + 1 })));
    expect(fall._data.map(d => +d.date)).toEqual([1, 2, 3, 4, 5].map(d => +new Date(2024, 10, d)));
    expect(values(fall)).toEqual([1, 2, null, 3, 4]);
  });

  it('hourly rows across the spring change: hours are absolute, 02:00 does not exist', () => {
    const hours = [0, 1, 4, 5].map(h => ({ date: new Date(Date.UTC(2024, 2, 10, 8 + h)), value: h + 1 }));
    // 00:00 and 01:00 PST, then 05:00 and 06:00 PDT: the hours between are 03:00 and 04:00
    const c = ts({ gaps: 'zero' }).setData(hours);
    expect(c._data.map(d => d.date.getHours())).toEqual([0, 1, 3, 4, 5, 6]);
    expect(values(c)).toEqual([1, 2, 0, 0, 5, 6]);
  });
});

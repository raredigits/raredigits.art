import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { baselineValue, linePath, areaPath, bandPath, normalizePoints, normalizeLineSeries, filterLogSeries, fillGaps, isGap, MAX_FILLED_BUCKETS } from '../assets/charts/src/core/seriesPath.js';

// Linear scales make the path output fully deterministic, so we can assert
// exact coordinates — a strong regression guard on the geometry.
const x = d3.scaleLinear().domain([0, 2]).range([0, 200]);
const y = d3.scaleLinear().domain([0, 10]).range([100, 0]); // inverted, as on screen

describe('baselineValue', () => {
  it('returns a finite numeric baseline as-is', () => {
    expect(baselineValue(5, [0, 10])).toBe(5);
  });
  it("'min' resolves to the domain minimum", () => {
    expect(baselineValue('min', [2, 10])).toBe(2);
  });
  it("'zero' resolves to 0", () => {
    expect(baselineValue('zero', [2, 10])).toBe(0);
  });
  it('an unknown string falls back to 0', () => {
    expect(baselineValue('whatever', [2, 10])).toBe(0);
  });
  it('a non-finite number falls back to 0 (does not leak NaN into the path)', () => {
    expect(baselineValue(NaN, [2, 10])).toBe(0);
    expect(baselineValue(Infinity, [2, 10])).toBe(0);
  });
});

describe('linePath', () => {
  const series = { values: [{ date: 0, value: 0 }, { date: 1, value: 5 }, { date: 2, value: 10 }] };

  it('builds an exact linear path', () => {
    expect(linePath(series, x, y)).toBe('M0,100L100,50L200,0');
  });

  it('honours a per-series curve override (monotone → cubic segments)', () => {
    const curved = linePath({ ...series, curve: 'monotone' }, x, y);
    expect(curved).toMatch(/^M0,100/);
    expect(curved).toContain('C'); // cubic Bézier, not straight L segments
  });
});

describe('areaPath', () => {
  const series = { values: [{ date: 0, value: 5 }, { date: 1, value: 10 }] };
  const xa = d3.scaleLinear().domain([0, 1]).range([0, 100]);

  it('builds a closed area down to the zero baseline', () => {
    // top edge forward (y1), then baseline y(0)=100 backward, closed with Z
    expect(areaPath(series, xa, y)).toBe('M0,50L100,0L100,100L0,100Z');
  });

  it("respects a 'min' baseline (here domain min is 0, same as zero)", () => {
    expect(areaPath({ ...series, areaBaseline: 'min' }, xa, y)).toBe('M0,50L100,0L100,100L0,100Z');
  });
});

describe('bandPath', () => {
  it('builds a closed ribbon between lower and upper at each x', () => {
    const series = { values: [{ date: 0, lower: 2, upper: 8 }, { date: 1, lower: 3, upper: 9 }] };
    const xb = d3.scaleLinear().domain([0, 1]).range([0, 100]);
    // upper edge forward (y: 8→20, 9→10), then lower edge backward (3→70, 2→80)
    expect(bandPath(series, xb, y)).toBe('M0,20L100,10L100,70L0,80Z');
  });
});

// ─── Input (C-03) ──────────────────────────────────────────────────────────────

// A date-only string is that day's local midnight by default (T-10).
const day = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const at = iso => new Date(day(iso));

describe('normalizePoints', () => {
  it('parses dates, coerces numeric strings and sorts by date (C-07)', () => {
    const out = normalizePoints([{ date: '2026-01-03', value: '3' }, { date: '2026-01-01', value: 1 }]);
    expect(out.map(d => [+d.date, d.value])).toEqual([[day('2026-01-01'), 1], [day('2026-01-03'), 3]]);
  });

  it('reads date strings in the zone it is given (T-10): local midnight by default, UTC midnight for UTC', () => {
    const rows = [{ date: '2026-01-01', value: 1 }, { date: '2026-01-02T06:00', value: 2 }, { date: '2026-01-03T00:00Z', value: 3 }];
    expect(normalizePoints(rows).map(d => +d.date))
      .toEqual([day('2026-01-01'), +new Date(2026, 0, 2, 6), Date.UTC(2026, 0, 3)]);
    expect(normalizePoints(rows, { timeZone: 'UTC' }).map(d => +d.date))
      .toEqual([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2, 6), Date.UTC(2026, 0, 3)]);
  });

  it.each([
    ['null', null], ['empty string', ''], ['true', true], ['false', false], ['NaN', NaN], ['text', 'x'], ['absent', undefined],
  ])('drops a row whose value is %s (not drawn as 0/1)', (_n, value) => {
    expect(normalizePoints([{ date: '2026-01-01', value }, { date: '2026-01-02', value: 2 }])).toHaveLength(1);
  });

  it('drops unreadable dates and non-object rows, keeps epoch 0', () => {
    const out = normalizePoints([{ date: 'nope', value: 1 }, { date: null, value: 1 }, null, 5, { date: 0, value: 4 }]);
    expect(out).toEqual([{ date: new Date(0), value: 4 }]);
  });

  it('reads the fields it is given (a band needs lower and upper)', () => {
    const out = normalizePoints(
      [{ date: '2026-01-01', lower: '1', upper: 3 }, { date: '2026-01-02', lower: 2 }],
      { fields: ['lower', 'upper'] });
    expect(out).toEqual([{ date: at('2026-01-01'), lower: 1, upper: 3 }]);
  });

  it('keep: true passes the other fields through (TimeSeries → tooltipFormat)', () => {
    expect(normalizePoints([{ date: '2026-01-01', value: '1', volume: 9 }], { keep: true }))
      .toEqual([{ date: at('2026-01-01'), value: 1, volume: 9 }]);
    expect(normalizePoints([{ date: '2026-01-01', value: 1, volume: 9 }])[0]).not.toHaveProperty('volume');
  });

  it('returns new objects and never touches the caller\'s rows', () => {
    const rows = [{ date: '2026-01-02', value: 2 }, { date: '2026-01-01', value: 1 }];
    const copy = structuredClone(rows);
    const out  = normalizePoints(rows, { keep: true });
    expect(rows).toEqual(copy);
    expect(out).not.toContain(rows[0]);
  });

  it('a non-array is an empty list', () => {
    expect(normalizePoints(null)).toEqual([]);
    expect(normalizePoints({ date: '2026-01-01', value: 1 })).toEqual([]);
  });
});

describe('normalizeLineSeries', () => {
  const values = [{ date: '2026-01-02', value: 2 }, { date: '2026-01-01', value: 1 }];

  it.each([
    ['curve', 'step'], ['strokeDash', 'dashed'], ['area', true], ['areaOpacity', 0.3], ['areaBaseline', 'min'],
    ['markers', true], ['markerShape', 'diamond'], ['markerSize', 6], ['markerFill', 'red'], ['markerStroke', 'blue'],
  ])('keeps the per-series %s', (field, value) => {
    expect(normalizeLineSeries({ [field]: value, values }, 0)[field]).toBe(value);
  });

  it('a markers:false opt-out survives (it is not dropped as falsy)', () => {
    expect(normalizeLineSeries({ markers: false, values }, 0)).toHaveProperty('markers', false);
  });

  it.each([
    ['3', 3], [3, 3], [0, 0], [null, undefined], ['', undefined], [undefined, undefined], ['wide', undefined],
  ])('strokeWidth %j → %j (absent: render keeps its default)', (input, expected) => {
    expect(normalizeLineSeries({ strokeWidth: input, values }, 0).strokeWidth).toBe(expected);
  });

  it('defaults name and colour, sorts values (C-07) and leaves the input alone', () => {
    const s    = { values, extra: 1 };
    const copy = structuredClone(s);
    const out  = normalizeLineSeries(s, 2, { color: '#abc' });
    expect(out).toMatchObject({ name: 'Series 3', color: '#abc', type: 'line', extra: 1 });
    expect(out.values.map(d => d.value)).toEqual([1, 2]);
    expect(s).toEqual(copy);
    expect(normalizeLineSeries({ name: 'n', color: 'red', values }, 0, { color: '#abc' }))
      .toMatchObject({ name: 'n', color: 'red' });
  });

  it('a band reads lower/upper; fillOpacity falls back to areaOpacity', () => {
    const band = normalizeLineSeries({ areaOpacity: 0.2, values: [{ date: '2026-01-01', lower: 1, upper: 2 }] }, 0, { type: 'band' });
    expect(band).toMatchObject({ type: 'band', fillOpacity: 0.2 });
    expect(band.values).toEqual([{ date: at('2026-01-01'), lower: 1, upper: 2 }]);
    expect(normalizeLineSeries({ fillOpacity: 0.5, areaOpacity: 0.2, values: [] }, 0, { type: 'band' }).fillOpacity).toBe(0.5);
  });

  it('reads the values\' dates in the chart\'s zone (T-10)', () => {
    expect(normalizeLineSeries({ values }, 0).values.map(d => +d.date)).toEqual([day('2026-01-01'), day('2026-01-02')]);
    expect(normalizeLineSeries({ values }, 0, { timeZone: 'UTC' }).values.map(d => +d.date))
      .toEqual([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2)]);
    const band = normalizeLineSeries({ values: [{ date: '2026-01-01', lower: 1, upper: 2 }] }, 0, { type: 'band', timeZone: 'UTC' });
    expect(+band.values[0].date).toBe(Date.UTC(2026, 0, 1));
  });

  it('sets axis only when one is passed', () => {
    expect(normalizeLineSeries({ values }, 0, { axis: 'y2' }).axis).toBe('y2');
    expect(normalizeLineSeries({ values }, 0)).not.toHaveProperty('axis');
  });
});

describe('filterLogSeries (D-09)', () => {
  const day = d => new Date(2026, 0, d);
  const pts = (...vs) => vs.map((value, i) => ({ date: day(i + 1), value }));
  const view = [day(2), day(4)];
  const never = () => false, always = () => true;

  it('keeps the values inside the view, both ends included', () => {
    const { series, skipped } = filterLogSeries([{ name: 'a', values: pts(1, 2, 3, 4, 5) }], view, never);
    expect(series[0].values.map(d => d.value)).toEqual([2, 3, 4]);
    expect(skipped).toBe(0);
  });

  it('on a log axis skips values ≤ 0 in view and counts only those', () => {
    // -1 and 0 sit outside the view: dropped, not counted as log skips
    const { series, skipped } = filterLogSeries([{ values: pts(-1, 5, 0, -2, 0) }], view, always);
    expect(series[0].values.map(d => d.value)).toEqual([5]);
    expect(skipped).toBe(2);
  });

  it('a linear axis keeps zero and negatives', () => {
    const { series, skipped } = filterLogSeries([{ values: pts(1, -2, 0, -3) }], view, never);
    expect(series[0].values.map(d => d.value)).toEqual([-2, 0, -3]);
    expect(skipped).toBe(0);
  });

  it('a band needs both edges above zero', () => {
    const band = { type: 'band', values: [
      { date: day(2), lower: 1, upper: 2 },
      { date: day(3), lower: 0, upper: 2 },
      { date: day(4), lower: 1, upper: -1 },
    ] };
    const { series, skipped } = filterLogSeries([band], view, always);
    expect(series[0].values).toEqual([band.values[0]]);
    expect(skipped).toBe(2);
  });

  it('a row that carries lower/upper is still read by its value unless the series is a band', () => {
    const row = { date: day(3), value: 4, lower: -1, upper: -1 };
    expect(filterLogSeries([{ values: [row] }], view, always).series[0].values).toEqual([row]);
  });

  it('asks per series (DualAxes: only the log axis skips)', () => {
    const input = [
      { name: 'y1', axis: 'y1', values: pts(1, -1, 2) },
      { name: 'y2', axis: 'y2', values: pts(1, -1, 2) },
    ];
    const { series, skipped } = filterLogSeries(input, view, s => s.axis === 'y2');
    expect(series.map(s => s.values.map(d => d.value))).toEqual([[-1, 2], [2]]);
    expect(skipped).toBe(1);
  });

  it('drops a series left without values, keeping the order of the rest', () => {
    const input = [
      { name: 'a', values: pts(1, 2, 3) },
      { name: 'gone', values: pts(9, -1, -2, -3) },
      { name: 'out', values: [{ date: day(9), value: 1 }] },
      { name: 'b', values: pts(1, 4) },
    ];
    const { series, skipped } = filterLogSeries(input, view, always);
    expect(series.map(s => s.name)).toEqual(['a', 'b']);
    expect(skipped).toBe(3);
  });

  it('leaves the input alone: new series objects, the same rows', () => {
    const s = { name: 'a', color: 'red', strokeDash: 'dashed', values: pts(1, 2, 3) };
    const values = s.values;
    const { series: [out] } = filterLogSeries([s], view, never);
    expect(out).not.toBe(s);
    expect(out).toMatchObject({ name: 'a', color: 'red', strokeDash: 'dashed' });
    expect(out.values).not.toBe(values);
    expect(out.values[0]).toBe(values[1]);
    expect(s.values).toBe(values);
    expect(values).toHaveLength(3);
  });

  it('no series, no values: nothing kept, nothing skipped', () => {
    expect(filterLogSeries([], view, always)).toEqual({ series: [], skipped: 0 });
    expect(filterLogSeries([{ values: [] }], view, always)).toEqual({ series: [], skipped: 0 });
  });
});

// ─── Gaps (RC-005) ───────────────────────────────────────────────────────────
// The pure half of TimeSeries' gaps rule: null rows kept, the line broken at
// them, the log filter leaving a gap, and fillGaps. The chart's half is in
// timeseries-gaps.test.js. Dates are local, built with the local Date
// constructor, so every expectation holds in each TZ run.

describe('normalizePoints keepNull (RC-005)', () => {
  const rows = [
    { date: '2024-01-03', value: null, note: 'down' },
    { date: '2024-01-01', value: 4 },
    { date: '2024-01-02', value: '' },
    { date: '2024-01-04' },
    { date: '2024-01-05', value: NaN },
    { date: '2024-01-06', value: 'n/a' },
  ];

  it('without it a null value is unreadable, as before', () => {
    expect(normalizePoints(rows).map(d => d.value)).toEqual([4]);
  });

  it('keeps a row whose value is null — only null — with its other fields', () => {
    const out = normalizePoints(rows, { keep: true, keepNull: true });
    expect(out.map(d => [d.date.getDate(), d.value])).toEqual([[1, 4], [3, null]]);
    expect(out[1].note).toBe('down');
    expect(isGap(out[1])).toBe(true);
    expect(isGap(out[0])).toBe(false);
  });
});

describe('linePath breaks at a gap (RC-005)', () => {
  const xs = d3.scaleLinear().domain([0, 4]).range([0, 400]);
  const pts = vs => vs.map((value, i) => ({ date: i, value }));

  it('a null value stops the line; the next value starts it again', () => {
    expect(linePath({ values: pts([5, 5, null, 0, 10]) }, xs, y, 'linear'))
      .toBe('M0,50L100,50M300,100L400,0');
  });

  it('a series without gaps draws as before (the same path as a plain d3.line)', () => {
    const values = pts([1, 9, 3, 7]);
    const plain = d3.line().x(d => xs(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX)(values);
    expect(linePath({ values }, xs, y, 'monotone')).toBe(plain);
  });
});

describe('filterLogSeries with gaps (RC-005)', () => {
  const day = d => new Date(2026, 0, d);
  const pts = (...vs) => vs.map((value, i) => ({ date: day(i + 1), value }));
  const view = [day(1), day(5)];
  const always = () => true, never = () => false;

  it('a gap in view stays, is not counted, and does not keep a series alive alone', () => {
    const { series, skipped } = filterLogSeries([{ values: pts(2, null, 3) }, { values: pts(null, null) }], view, always);
    expect(series).toHaveLength(1);
    expect(series[0].values.map(d => d.value)).toEqual([2, null, 3]);
    expect(skipped).toBe(0);
    expect(filterLogSeries([{ values: pts(null, 4) }], view, never).series[0].values.map(d => d.value)).toEqual([null, 4]);
  });

  it("where `breaks` says so, a value the log axis skips leaves a gap (a copy with null) and still counts", () => {
    const values = pts(2, 0, 3, -1);
    const { series, skipped } = filterLogSeries([{ values }], view, always, always);
    expect(series[0].values.map(d => d.value)).toEqual([2, null, 3, null]);
    expect(series[0].values[1]).not.toBe(values[1]);
    expect(series[0].values[1].date).toBe(values[1].date);
    expect(values[1].value).toBe(0);
    expect(skipped).toBe(2);
    // without it the line joins, as before
    expect(filterLogSeries([{ values }], view, always).series[0].values.map(d => d.value)).toEqual([2, 3]);
    // a linear axis skips nothing, so it breaks nothing
    expect(filterLogSeries([{ values }], view, never, always).series[0].values.map(d => d.value)).toEqual([2, 0, 3, -1]);
  });

  it('a series of zeros on a log axis is gaps only: dropped', () => {
    expect(filterLogSeries([{ values: pts(0, 0) }], view, always, always)).toEqual({ series: [], skipped: 2 });
  });
});

describe('fillGaps (RC-005)', () => {
  const H = (d, h = 0) => new Date(2024, 0, d, h);
  const rows = (...pairs) => pairs.map(([date, value]) => ({ date, value }));
  const show = out => out.rows.map(d => [d.date.getDate(), d.date.getHours(), d.value]);

  it("'join' (and anything else) gives the rows back as they are", () => {
    const input = rows([H(1), 1], [H(3), 2]);
    for (const gaps of ['join', undefined, 'zeros']) {
      expect(fillGaps(input, { gaps, interval: 'day' })).toEqual({ rows: input, capped: false });
      expect(fillGaps(input, { gaps, interval: 'day' }).rows).toBe(input);
    }
  });

  it("'zero' fills every missing bucket between two rows with 0, and a null row becomes 0", () => {
    const input = [{ date: H(1), value: 5 }, { date: H(2), value: null, note: 'x' }, { date: H(5), value: 7 }];
    const out = fillGaps(input, { gaps: 'zero', interval: 'day' });
    expect(show(out)).toEqual([[1, 0, 5], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 7]]);
    expect(out.rows[1]).toEqual({ date: H(2), value: 0, note: 'x' });
    expect(out.rows[0]).toBe(input[0]);
    expect(input[1].value).toBeNull();
    expect(out.capped).toBe(false);
  });

  it("'break' fills the same buckets with null", () => {
    const input = rows([H(1), 5], [H(2), null], [H(5), 7]);
    const out = fillGaps(input, { gaps: 'break', interval: 'day' });
    expect(show(out)).toEqual([[1, 0, 5], [2, 0, null], [3, 0, null], [4, 0, null], [5, 0, 7]]);
    expect(out.rows[1]).toBe(input[1]);
  });

  it('without an interval only the null rows are gaps', () => {
    const input = rows([H(1), 5], [H(2), null], [H(5), 7]);
    expect(show(fillGaps(input, { gaps: 'zero' }))).toEqual([[1, 0, 5], [2, 0, 0], [5, 0, 7]]);
    expect(show(fillGaps(input, { gaps: 'break' }))).toEqual([[1, 0, 5], [2, 0, null], [5, 0, 7]]);
  });

  it('a filled bucket steps from the row before it, until it would share the next row’s bucket', () => {
    // hourly rows at :00; the 10:30 row sits in the 10:00 bucket, so 10:00 is not missing
    const out = fillGaps(rows([H(1, 8), 1], [new Date(2024, 0, 1, 10, 30), 2]), { gaps: 'zero', interval: 'hour' });
    expect(out.rows.map(d => [d.date.getHours(), d.date.getMinutes(), d.value])).toEqual([[8, 0, 1], [9, 0, 0], [10, 30, 2]]);
    // weekly rows on Sundays, cut in Monday weeks: the missing Sunday is filled, nothing else
    const sun = d => new Date(2024, 0, d);
    const weeks = fillGaps(rows([sun(7), 1], [sun(28), 2]), { gaps: 'zero', interval: 'week' });
    expect(weeks.rows.map(d => d.date.getDate())).toEqual([7, 14, 21, 28]);
    // month ends: the last day of each missing month
    const ends = fillGaps(rows([new Date(2024, 0, 31), 1], [new Date(2024, 4, 31), 2]), { gaps: 'zero', interval: 'month' });
    expect(ends.rows.map(d => [d.date.getMonth() + 1, d.date.getDate()])).toEqual([[1, 31], [2, 29], [3, 31], [4, 30], [5, 31]]);
  });

  it('nothing before the first row; after the last only up to `until`’s bucket, and not past `until`', () => {
    const input = rows([H(1, 7), 3], [H(1, 9), 4]);
    expect(show(fillGaps(input, { gaps: 'zero', interval: 'hour' }))).toEqual([[1, 7, 3], [1, 8, 0], [1, 9, 4]]);
    // data to 09:00 at 11:21: zeros at 10:00 and 11:00
    const until = new Date(2024, 0, 1, 11, 21);
    expect(show(fillGaps(input, { gaps: 'zero', interval: 'hour', until }))).toEqual(
      [[1, 7, 3], [1, 8, 0], [1, 9, 4], [1, 10, 0], [1, 11, 0]]);
    expect(show(fillGaps(input, { gaps: 'break', interval: 'hour', until })).slice(3)).toEqual([[1, 10, null], [1, 11, null]]);
    // an anchor at or before the last row adds nothing
    expect(fillGaps(input, { gaps: 'zero', interval: 'hour', until: H(1, 9) }).rows).toHaveLength(3);
    // a daily bucket dated at noon is not filled for a day whose noon is still to come
    const noon = rows([new Date(2024, 0, 1, 12), 1]);
    expect(fillGaps(noon, { gaps: 'zero', interval: 'day', until: new Date(2024, 0, 3, 9) }).rows
      .map(d => [d.date.getDate(), d.date.getHours()])).toEqual([[1, 12], [2, 12]]);
    // no rows, nothing to fill from
    expect(fillGaps([], { gaps: 'zero', interval: 'hour', until })).toEqual({ rows: [], capped: false });
  });

  it('rows on one date, or already adjacent, add nothing', () => {
    const input = rows([H(1), 1], [H(1), 2], [H(2), 3]);
    expect(fillGaps(input, { gaps: 'zero', interval: 'day' }).rows).toEqual(input);
  });

  it('in UTC the buckets are UTC days', () => {
    const U = d => new Date(Date.UTC(2024, 0, d));
    const out = fillGaps(rows([U(1), 1], [U(4), 2]), { gaps: 'zero', interval: 'day', timeZone: 'UTC' });
    expect(out.rows.map(d => +d.date)).toEqual([U(1), U(2), U(3), U(4)].map(Number));
  });

  it('stops at `limit` filled buckets (MAX_FILLED_BUCKETS by default): the rest of the gaps join', () => {
    const input = rows([H(1), 1], [H(5), 2], [H(9), 3]);
    const out = fillGaps(input, { gaps: 'zero', interval: 'day', limit: 4 });
    expect(out.capped).toBe(true);
    expect(out.rows.map(d => d.date.getDate())).toEqual([1, 2, 3, 4, 5, 6, 9]);
    expect(fillGaps(input, { gaps: 'zero', interval: 'day', limit: 6 }).capped).toBe(false);
    expect(MAX_FILLED_BUCKETS).toBe(100000);
  });
});

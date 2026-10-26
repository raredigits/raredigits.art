import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { baselineValue, linePath, areaPath, bandPath, normalizePoints, normalizeLineSeries } from '../assets/charts/src/core/seriesPath.js';

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

const day = iso => new Date(iso).getTime();

describe('normalizePoints', () => {
  it('parses dates, coerces numeric strings and sorts by date (C-07)', () => {
    const out = normalizePoints([{ date: '2026-01-03', value: '3' }, { date: '2026-01-01', value: 1 }]);
    expect(out.map(d => [+d.date, d.value])).toEqual([[day('2026-01-01'), 1], [day('2026-01-03'), 3]]);
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
    expect(out).toEqual([{ date: new Date('2026-01-01'), lower: 1, upper: 3 }]);
  });

  it('keep: true passes the other fields through (TimeSeries → tooltipFormat)', () => {
    expect(normalizePoints([{ date: '2026-01-01', value: '1', volume: 9 }], { keep: true }))
      .toEqual([{ date: new Date('2026-01-01'), value: 1, volume: 9 }]);
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
    expect(band.values).toEqual([{ date: new Date('2026-01-01'), lower: 1, upper: 2 }]);
    expect(normalizeLineSeries({ fillOpacity: 0.5, areaOpacity: 0.2, values: [] }, 0, { type: 'band' }).fillOpacity).toBe(0.5);
  });

  it('sets axis only when one is passed', () => {
    expect(normalizeLineSeries({ values }, 0, { axis: 'y2' }).axis).toBe('y2');
    expect(normalizeLineSeries({ values }, 0)).not.toHaveProperty('axis');
  });
});

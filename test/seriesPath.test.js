import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { baselineValue, linePath, areaPath, bandPath } from '../assets/charts/src/core/seriesPath.js';

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

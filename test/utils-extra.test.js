import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { resolveCurve, resolveEase, niceTickValues, normalizeAnnotations } from '../assets/charts/src/core/utils.js';

describe('resolveCurve', () => {
  it('maps known curve names to their d3 factory', () => {
    expect(resolveCurve('monotone')).toBe(d3.curveMonotoneX);
    expect(resolveCurve('basis')).toBe(d3.curveBasis);
    expect(resolveCurve('step')).toBe(d3.curveStep);
    expect(resolveCurve('linear')).toBe(d3.curveLinear);
  });
  it('falls back to linear for an unknown name', () => {
    expect(resolveCurve('nope')).toBe(d3.curveLinear);
  });
  it('returns a usable cardinal curve with tension applied', () => {
    expect(typeof resolveCurve('cardinal', 0.5)).toBe('function');
  });
});

describe('resolveEase', () => {
  it('maps known easings', () => {
    expect(resolveEase('cubicInOut')).toBe(d3.easeCubicInOut);
    expect(resolveEase('linear')).toBe(d3.easeLinear);
  });
  it('defaults to cubicOut', () => {
    expect(resolveEase('cubicOut')).toBe(d3.easeCubicOut);
    expect(resolveEase(undefined)).toBe(d3.easeCubicOut);
  });
});

describe('niceTickValues — edge cases', () => {
  it('returns a single value when lo === hi', () => {
    expect(niceTickValues(42, 42, 5)).toEqual([42]);
  });
  it('returns a single value for count < 2', () => {
    expect(niceTickValues(0, 100, 1)).toEqual([0]);
  });
  it('produces exactly `count` evenly-spaced, increasing ticks across a negative domain', () => {
    const ticks = niceTickValues(-100, 100, 5);
    expect(ticks).toHaveLength(5);
    const steps = ticks.slice(1).map((t, i) => +(t - ticks[i]).toPrecision(6));
    expect(new Set(steps).size).toBe(1);          // evenly spaced
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100); // covers top
  });
  it('handles a small fractional domain', () => {
    const ticks = niceTickValues(0, 1, 5);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBeLessThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(1);
  });
});

describe('normalizeAnnotations — remaining branches', () => {
  it('normalizes a horizontal line { value } with defaults', () => {
    const [a] = normalizeAnnotations([{ value: 100 }]);
    expect(a.kind).toBe('hPoint');
    expect(a.value).toBe(100);
    expect(a.axis).toBe('y1');           // default axis
    expect(a.strokeDash).toBe('dashed'); // default dash
    expect(a.labelPosition).toBe('left');
  });

  it('respects axis y2 and labelPosition right', () => {
    const [a] = normalizeAnnotations([{ value: 5, axis: 'y2', labelPosition: 'right' }]);
    expect(a.axis).toBe('y2');
    expect(a.labelPosition).toBe('right');
  });

  it('orders a vertical range from→to chronologically', () => {
    const [a] = normalizeAnnotations([{ from: '2026-06-01', to: '2026-01-01' }]);
    expect(a.kind).toBe('range');
    expect(+a.from).toBeLessThan(+a.to);
  });

  it('applies the default fillOpacity and honours an explicit one', () => {
    const [def] = normalizeAnnotations([{ from: '2026-01-01', to: '2026-02-01' }]);
    expect(def.fillOpacity).toBe(0.08);
    const [custom] = normalizeAnnotations([{ yFrom: 1, yTo: 2, fillOpacity: 0.3 }]);
    expect(custom.fillOpacity).toBe(0.3);
  });

  it('drops a horizontal line with a non-finite value', () => {
    expect(normalizeAnnotations([{ value: 'x' }])).toEqual([]);
  });
});

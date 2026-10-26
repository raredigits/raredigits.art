import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import {
  parseDate,
  byDate,
  extentEquals,
  resolveCurve,
  resolveEase,
  resolveStrokeDash,
  markerPath,
  linearTickValues,
  logTickValues,
  logPaddedDomain,
  normalizeAnnotations,
  motionDuration,
  prefersReducedMotion,
} from '../assets/charts/src/core/utils.js';

// core/utils, one describe per helper (S-07: these used to be spread over
// utils, utils-extra and line-yscale).

describe('parseDate', () => {
  it('rejects what is not a readable date instead of passing it on (C-26)', () => {
    // An Invalid Date is an object (truthy) — it used to slip past `d.date &&`
    // filters and crash the Line render; null/false used to become 1970.
    [new Date(NaN), NaN, Infinity, -Infinity, null, undefined, false, true, '', 'not a date']
      .forEach(v => expect(parseDate(v)).toBeNull());
  });
  it('keeps epoch 0 and numeric strings of ISO dates', () => {
    expect(+parseDate(0)).toBe(0);
    expect(parseDate('2026-01-01')).toBeInstanceOf(Date);
  });
  it('passes a Date through unchanged', () => {
    const d = new Date('2026-01-01');
    expect(parseDate(d)).toBe(d);
  });
  it('parses an ISO string', () => {
    expect(+parseDate('2026-01-01')).toBe(+new Date('2026-01-01'));
  });
  it('returns null for an unparseable value', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });
});

describe('extentEquals', () => {
  it('is true for equal date pairs', () => {
    expect(extentEquals([new Date(0), new Date(10)], [new Date(0), new Date(10)])).toBe(true);
  });
  it('is false when an endpoint differs', () => {
    expect(extentEquals([new Date(0), new Date(10)], [new Date(0), new Date(11)])).toBe(false);
  });
  it('is false for malformed input', () => {
    expect(extentEquals(null, [new Date(0), new Date(10)])).toBe(false);
  });
});

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

describe('resolveStrokeDash', () => {
  it('maps named presets', () => {
    expect(resolveStrokeDash('dashed')).toBe('6,4');
    expect(resolveStrokeDash('dotted')).toBe('2,3');
  });
  it('treats solid/empty as no dash', () => {
    expect(resolveStrokeDash('solid')).toBeNull();
    expect(resolveStrokeDash(null)).toBeNull();
  });
  it('joins an array', () => {
    expect(resolveStrokeDash([4, 3])).toBe('4,3');
  });
  it('passes a raw dash-array string through', () => {
    expect(resolveStrokeDash('5,4')).toBe('5,4');
    expect(resolveStrokeDash('4 3')).toBe('4 3');
  });
  it('rejects a non-numeric string', () => {
    expect(resolveStrokeDash('abc')).toBeNull();
  });
});

describe('markerPath', () => {
  it('returns null for circle (rendered natively)', () => {
    expect(markerPath('circle', 4)).toBeNull();
  });
  it('returns an SVG path for other shapes', () => {
    for (const shape of ['square', 'diamond', 'triangle', 'cross']) {
      expect(markerPath(shape, 4)).toMatch(/^M/);
    }
  });
});

describe('linearTickValues', () => {
  it('keeps every tick inside the range (1Y case: max 193 no longer pulls the axis to 400)', () => {
    const ticks = linearTickValues(49.4, 203.6, 4);
    expect(ticks).toEqual([50, 100, 150, 200]);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(203.6);
  });

  it('returns at least two ticks for a narrow range', () => {
    expect(linearTickValues(100.1, 100.2, 4).length).toBeGreaterThanOrEqual(2);
  });
});

describe('logTickValues', () => {
  it('uses powers of ten across decades', () => {
    expect(logTickValues(5, 300000, 4)).toEqual([10, 100, 1000, 10000, 100000]);
  });

  it('thins powers when there are many decades', () => {
    const ticks = logTickValues(1, 1e12, 4);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0]).toBe(1);
  });

  it('falls back to 1-2-5 steps inside one decade boundary', () => {
    expect(logTickValues(15, 600, 4)).toEqual([20, 50, 100, 200, 500]);
  });

  it('falls back to linear steps for a very narrow domain', () => {
    const ticks = logTickValues(120, 180, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    ticks.forEach(v => expect(v >= 120 && v <= 180).toBe(true));
  });

  it('returns nothing for a non-positive domain', () => {
    expect(logTickValues(0, 10, 4)).toEqual([]);
  });
});

describe('logPaddedDomain', () => {
  it('pads by the same factor on both ends', () => {
    const [lo, hi] = logPaddedDomain(10, 1000);
    expect(10 / lo).toBeCloseTo(hi / 1000, 9);
    expect(10 / lo).toBeCloseTo(Math.pow(100, 0.08), 9);
  });

  it('pads flat data', () => {
    const [lo, hi] = logPaddedDomain(50, 50);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(50);
  });
});

describe('normalizeAnnotations', () => {
  it('returns [] for non-arrays', () => {
    expect(normalizeAnnotations(null)).toEqual([]);
  });
  it('drops invalid entries', () => {
    expect(normalizeAnnotations([{ date: 'nope' }, {}])).toEqual([]);
  });
  it('orders a horizontal band low→high regardless of input order', () => {
    const [band] = normalizeAnnotations([{ yFrom: 9, yTo: 2 }]);
    expect(band.kind).toBe('hRange');
    expect(band.yFrom).toBe(2);
    expect(band.yTo).toBe(9);
  });
  it('normalizes a vertical point from a date', () => {
    const [pt] = normalizeAnnotations([{ date: '2026-01-01', label: 'launch' }]);
    expect(pt.kind).toBe('point');
    expect(pt.label).toBe('launch');
  });
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

describe('motion gating', () => {
  it('prefersReducedMotion is false without matchMedia (jsdom default)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
  it('motionDuration returns the duration when motion is allowed', () => {
    expect(motionDuration(500)).toBe(500);
  });
  it('with prefers-reduced-motion: reduce, motionDuration returns 0', () => {
    const query = vi.fn(q => ({ matches: q === '(prefers-reduced-motion: reduce)', media: q }));
    vi.stubGlobal('matchMedia', query);
    expect(prefersReducedMotion()).toBe(true);
    expect(motionDuration(500)).toBe(0);
    expect(query).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
  it('a matchMedia that does not match leaves the duration alone', () => {
    vi.stubGlobal('matchMedia', q => ({ matches: false, media: q }));
    expect(prefersReducedMotion()).toBe(false);
    expect(motionDuration(500)).toBe(500);
  });
});

describe('byDate', () => {
  it('sorts rows ascending by date (C-07)', () => {
    const rows = [{ date: new Date(3) }, { date: new Date(1) }, { date: new Date(2) }];
    expect(rows.sort(byDate).map(r => +r.date)).toEqual([1, 2, 3]);
  });
});

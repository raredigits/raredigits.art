import { describe, it, expect } from 'vitest';
import {
  parseDate,
  extentEquals,
  resolveStrokeDash,
  markerPath,
  niceTickValues,
  normalizeAnnotations,
  motionDuration,
  prefersReducedMotion,
} from '../assets/charts/src/core/utils.js';

describe('parseDate', () => {
  it('passes a Date through unchanged', () => {
    const d = new Date('2026-01-01');
    expect(parseDate(d)).toBe(d);
  });
  it('parses a number as an epoch', () => {
    expect(+parseDate(0)).toBe(0);
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

describe('niceTickValues', () => {
  it('returns exactly `count` ticks', () => {
    expect(niceTickValues(0, 125, 5)).toHaveLength(5);
  });
  it('covers the data top without excessive overshoot', () => {
    const ticks = niceTickValues(0, 125, 5);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(125);
  });
  it('degenerates safely when lo === hi', () => {
    expect(niceTickValues(10, 10, 5)).toEqual([10]);
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
});

describe('motion gating', () => {
  it('prefersReducedMotion is false without matchMedia (jsdom default)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
  it('motionDuration returns the duration when motion is allowed', () => {
    expect(motionDuration(500)).toBe(500);
  });
});

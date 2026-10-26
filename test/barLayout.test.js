import { describe, it, expect } from 'vitest';
import { readBarWidth, fitBarWidth, timeSlot, barInset } from '../assets/charts/src/core/barLayout.js';

// Pure helpers behind barWidth (B-07) and the edge-bar inset (C-27).

describe('readBarWidth', () => {
  it.each([[12, 12], ['12', 12], [0.5, 0.5]])('%s reads as %s px', (v, px) => {
    expect(readBarWidth(v)).toBe(px);
  });

  it.each([0, -4, NaN, Infinity, -Infinity, null, undefined, '', true, false, 'wide', {}])(
    '%s is not a width', v => {
      expect(readBarWidth(v)).toBeUndefined();
    });
});

describe('fitBarWidth', () => {
  it('caps an explicit width at the slot', () => {
    expect(fitBarWidth(10, 40)).toBe(10);
    expect(fitBarWidth(100, 40)).toBe(40);
  });

  it('is undefined when no width is set, so the default applies', () => {
    expect(fitBarWidth(undefined, 40)).toBeUndefined();
    expect(fitBarWidth(-3, 40)).toBeUndefined();
  });
});

describe('timeSlot', () => {
  const day = 864e5;

  it('is the smallest gap between times, linear in the scale length', () => {
    const slot = timeSlot([0, 4 * day, 5 * day, 10 * day], [0, 10 * day], () => -1);
    expect(slot(100)).toBeCloseTo(10, 9);   // 1 day of 10 → a tenth of the length
    expect(slot(300)).toBeCloseTo(30, 9);
  });

  it('ignores zero gaps (repeated dates)', () => {
    const slot = timeSlot([0, 0, 2 * day, 2 * day, 4 * day], [0, 4 * day], () => -1);
    expect(slot(100)).toBeCloseTo(50, 9);
  });

  it('falls back with fewer than two distinct times or an empty span', () => {
    const fallback = L => L / 7;
    expect(timeSlot([day], [0, day], fallback)).toBe(fallback);
    expect(timeSlot([day, day], [0, day], fallback)).toBe(fallback);
    expect(timeSlot([0, day], [day, day], fallback)).toBe(fallback);
  });
});

describe('barInset', () => {
  const extents = {
    constant: () => 40,
    linear:   L => L / 10,
    clamped:  L => Math.max(2, Math.min(48, L * 0.2)),
  };

  it.each(Object.entries(extents))('%s extent: the bars fit, and only just', (_n, extentAt) => {
    for (const length of [50, 300, 772]) {
      const inset = barInset(length, extentAt);
      expect(extentAt(length - 2 * inset) / 2).toBeLessThanOrEqual(inset + 1e-12);
      expect(inset - extentAt(length - 2 * inset) / 2).toBeLessThan(1e-6);
    }
  });

  it('is 0 without length or without bars', () => {
    expect(barInset(0, () => 10)).toBe(0);
    expect(barInset(-5, () => 10)).toBe(0);
    expect(barInset(300, () => 0)).toBe(0);
  });
});

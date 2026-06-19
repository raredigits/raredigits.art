import { describe, it, expect } from 'vitest';
import { clampDateExtent, resolveTimeframeExtent } from '../assets/charts/src/core/utils.js';

// The library does its timeframe math in local time (setFullYear/setMonth/
// setHours). Build and read dates in local time too, so these assertions are
// independent of the machine's timezone (mixing UTC parsing with day-level
// checks would make YTD/relative windows flap across the date line).
const D = (y, m, d) => new Date(y, m - 1, d);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

describe('clampDateExtent', () => {
  it('returns the pair unchanged when inside the full extent', () => {
    const out = clampDateExtent([D(2025, 3, 1), D(2025, 6, 1)], [D(2025, 1, 1), D(2025, 12, 31)]);
    expect(out.map(ymd)).toEqual(['2025-03-01', '2025-06-01']);
  });
  it('orders a reversed pair low→high', () => {
    const out = clampDateExtent([D(2025, 6, 1), D(2025, 3, 1)], null);
    expect(out.map(ymd)).toEqual(['2025-03-01', '2025-06-01']);
  });
  it('clamps to the full extent bounds', () => {
    const out = clampDateExtent([D(2020, 1, 1), D(2030, 1, 1)], [D(2024, 1, 1), D(2026, 1, 1)]);
    expect(out.map(ymd)).toEqual(['2024-01-01', '2026-01-01']);
  });
  it('returns null for malformed input', () => {
    expect(clampDateExtent(null, null)).toBeNull();
    expect(clampDateExtent([D(2025, 1, 1)], null)).toBeNull();
  });
});

describe('resolveTimeframeExtent', () => {
  const full = [D(2024, 1, 1), D(2026, 6, 20)];

  it('ALL / MAX returns the full extent', () => {
    expect(resolveTimeframeExtent('ALL', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
    expect(resolveTimeframeExtent('MAX', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
  });

  it('1Y goes back one year from the end', () => {
    expect(resolveTimeframeExtent('1Y', full).map(ymd)).toEqual(['2025-06-20', '2026-06-20']);
  });

  it('6M goes back six months from the end', () => {
    expect(resolveTimeframeExtent('6M', full).map(ymd)).toEqual(['2025-12-20', '2026-06-20']);
  });

  it('YTD starts at Jan 1 of the end year', () => {
    expect(resolveTimeframeExtent('YTD', full).map(ymd)).toEqual(['2026-01-01', '2026-06-20']);
  });

  it('is case-insensitive', () => {
    expect(resolveTimeframeExtent('1y', full).map(ymd)).toEqual(['2025-06-20', '2026-06-20']);
  });

  it('clamps a window longer than the data to the full extent', () => {
    // 5Y back from 2026 = 2021, before data start → clamp to 2024-01-01
    expect(resolveTimeframeExtent('5Y', full).map(ymd)).toEqual(['2024-01-01', '2026-06-20']);
  });

  it('accepts an explicit { range } step', () => {
    const out = resolveTimeframeExtent({ key: 'custom', range: [D(2025, 1, 1), D(2025, 2, 1)] }, full);
    expect(out.map(ymd)).toEqual(['2025-01-01', '2025-02-01']);
  });

  it('returns null for an unparseable key', () => {
    expect(resolveTimeframeExtent('banana', full)).toBeNull();
  });

  it('returns null when the full extent is missing', () => {
    expect(resolveTimeframeExtent('1Y', null)).toBeNull();
  });
});

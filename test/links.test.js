import { describe, it, expect, vi } from 'vitest';
import {
  normalizeLinks, normalizeLinkData, parseTime, linkInWindow, applyTimeWindow,
  linkWidthScale, pairKey, dedupeUndirected, parallelIndex,
} from '../assets/charts/src/core/links.js';

describe('normalizeLinks', () => {
  it('resolves from/to aliases to source/target and strips the aliases', () => {
    const [l] = normalizeLinks([{ from: 'a', to: 'b', label: 'x' }]);
    expect(l).toEqual({ source: 'a', target: 'b', label: 'x', id: 'a→b#0' });
  });

  it('keeps caller ids and numbers repeated ordered pairs', () => {
    const out = normalizeLinks([
      { source: 'a', target: 'b' },
      { source: 'a', target: 'b', type: 'swap' },
      { source: 'b', target: 'a' },
      { id: 7, source: 'a', target: 'b' },
    ]);
    expect(out.map(l => l.id)).toEqual(['a→b#0', 'a→b#1', 'b→a#0', '7']);
  });

  it('drops links without endpoints, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeLinks([{ source: 'a' }, null, { source: 'a', target: 'b' }])).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('accepts `flows` as the collection alias', () => {
    const d = normalizeLinkData({ nodes: [{ id: 'a' }], flows: [{ from: 'a', to: 'b' }] });
    expect(d.links[0].source).toBe('a');
    expect(d.nodes).toHaveLength(1);
  });
});

describe('parseTime', () => {
  it('reads small numbers and YYYY strings as years', () => {
    expect(parseTime(1773)).toBe(Date.UTC(1773, 0, 1));
    expect(parseTime('2024')).toBe(Date.UTC(2024, 0, 1));
  });

  it('resolves periods to their last millisecond with end: true', () => {
    expect(parseTime('2024-01', { end: true })).toBe(Date.UTC(2024, 1, 1) - 1);
    expect(parseTime(2024, { end: true })).toBe(Date.UTC(2025, 0, 1) - 1);
  });

  it('passes through epoch ms, Dates and ISO strings; rejects junk', () => {
    expect(parseTime(1700000000000)).toBe(1700000000000);
    expect(parseTime(new Date(Date.UTC(2023, 8, 26)))).toBe(Date.UTC(2023, 8, 26));
    expect(parseTime('2023-09-26T00:00:00Z')).toBe(Date.UTC(2023, 8, 26));
    expect(parseTime('soon')).toBeNull();
    expect(parseTime(null)).toBeNull();
  });
});

describe('time window', () => {
  const links = [
    { id: 'old', source: 'a', target: 'b', start: '2023-09', end: '2023-12' },
    { id: 'jan', source: 'b', target: 'c', start: '2024-01-31' },
    { id: 'late', source: 'c', target: 'd', start: 2026 },
    { id: 'timeless', source: 'd', target: 'e' },
  ];

  it('treats missing bounds as open and includes the whole closing period', () => {
    expect(linkInWindow(links[1], null, '2024-01')).toBe(true);
    expect(linkInWindow(links[2], null, '2024-01')).toBe(false);
    expect(linkInWindow(links[0], '2024', null)).toBe(false);
    expect(linkInWindow(links[3], '2024', '2024')).toBe(true);
  });

  it("hides or dims out-of-window links", () => {
    const w = { from: null, to: '2024-01' };
    expect(applyTimeWindow(links, w, 'hide').map(l => l.id)).toEqual(['old', 'jan', 'timeless']);
    const dimmed = applyTimeWindow(links, w, 'dim');
    expect(dimmed).toHaveLength(4);
    expect(dimmed.filter(l => l._dim).map(l => l.id)).toEqual(['late']);
    expect(applyTimeWindow(links, null)).toBe(links);
  });
});

describe('linkWidthScale', () => {
  it('maps value through a clamped sqrt scale; null gets the minimum', () => {
    const links = [{ value: 0 }, { value: 100 }, { value: 400 }, { value: null }, {}];
    const w = linkWidthScale(links, { min: 2, max: 22 });
    expect(w(links[0])).toBe(2);
    expect(w(links[2])).toBe(22);
    expect(w(links[1])).toBeCloseTo(12, 6);   // sqrt(100/400) = 0.5 of the range
    expect(w(links[3])).toBe(2);
    expect(w(links[4])).toBe(2);
  });

  it('supports linear scales and accessor functions', () => {
    const links = [{ usd: 50 }, { usd: 100 }];
    const w = linkWidthScale(links, { by: l => l.usd, scale: 'linear', min: 0, max: 10 });
    expect(w(links[0])).toBe(5);
  });
});

describe('pairs', () => {
  it('pairKey ignores direction', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'));
  });

  it('dedupeUndirected merges reversed same-type ties but keeps other types', () => {
    const out = dedupeUndirected([
      { id: 1, source: 'a', target: 'b', type: 'family' },
      { id: 2, source: 'b', target: 'a', type: 'family' },
      { id: 3, source: 'b', target: 'a', type: 'investment' },
    ]);
    expect(out.map(l => l.id)).toEqual([1, 3]);
  });

  it('parallelIndex counts ties per unordered pair', () => {
    const idx = parallelIndex([
      { id: 'x', source: 'a', target: 'b' },
      { id: 'y', source: 'b', target: 'a' },
      { id: 'z', source: 'a', target: 'c' },
    ]);
    expect(idx.get('x')).toEqual({ index: 0, count: 2 });
    expect(idx.get('y')).toEqual({ index: 1, count: 2 });
    expect(idx.get('z')).toEqual({ index: 0, count: 1 });
  });
});

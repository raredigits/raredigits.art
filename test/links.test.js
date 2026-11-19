import { describe, it, expect, vi } from 'vitest';
import {
  normalizeLinks, normalizeLinkData, parseTime, linkInWindow, applyTimeWindow,
  linkWidthScale, pairKey, dedupeUndirected, parallelIndex,
  resolveLinkType, linkTimeExtent, activeLinkSeries, linkValueText,
} from '../assets/charts/src/core/links.js';

// Ties are read in the chart's timeZone, 'local' by default (RC-006): these
// build their expectations in local time, so they hold in any zone. The
// zones themselves are tried in link-time.test.js and time-zones.test.js.
const L = (y, m = 0, d = 1) => {
  const dt = new Date(0);
  dt.setFullYear(y, m, d);          // field by field: the years 0–99 stay themselves
  dt.setHours(0, 0, 0, 0);
  return +dt;
};
const ym = v => { const d = new Date(v); return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

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
  });

  it('accepts `flows` as the collection alias', () => {
    const d = normalizeLinkData({ nodes: [{ id: 'a' }], flows: [{ from: 'a', to: 'b' }] });
    expect(d.links[0].source).toBe('a');
    expect(d.nodes).toHaveLength(1);
  });
});

describe('parseTime', () => {
  it('reads small numbers and YYYY strings as years', () => {
    expect(parseTime(1773)).toBe(L(1773));
    expect(parseTime('2024')).toBe(L(2024));
  });

  it('resolves periods to their last millisecond with end: true', () => {
    expect(parseTime('2024-01', { end: true })).toBe(L(2024, 1) - 1);
    expect(parseTime(2024, { end: true })).toBe(L(2025) - 1);
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
    expect(idx.get('x')).toEqual({ index: 0, count: 2, offset: -0.5 });
    expect(idx.get('y')).toEqual({ index: 1, count: 2, offset: -0.5 });
    expect(idx.get('z')).toEqual({ index: 0, count: 1, offset: 0 });
  });
});

describe('resolveLinkType — one category rule for every relation chart (R-01)', () => {
  const theme = { muted: '#999', colors: ['#a', '#b', '#c'] };
  it('a described category uses its own color, dash and label', () => {
    expect(resolveLinkType({ ETH: { color: '#123', dash: '4 2', label: 'Ether' } }, 'ETH', { keys: ['ETH'], theme }))
      .toEqual({ key: 'ETH', color: '#123', dash: '4 2', label: 'Ether' });
  });
  it('an untyped tie is muted; an undescribed category takes the palette by position', () => {
    expect(resolveLinkType({}, null, { keys: ['x', 'y'], theme })).toMatchObject({ key: 'default', color: '#999', label: 'connection' });
    expect(resolveLinkType({}, 'y', { keys: ['x', 'y'], theme })).toMatchObject({ color: '#b', label: 'y' });
  });
  it('never a colour a described type uses; muted once the free colours run out', () => {
    const types = { x: { color: '#a' } };
    const keys = ['x', 'p', 'q', 'r'];
    expect(['p', 'q', 'r'].map(k => resolveLinkType(types, k, { keys, theme }).color)).toEqual(['#b', '#c', '#999']);
  });
});

describe('ids and keys stay unambiguous when ids contain separators (R-20)', () => {
  it('normalizeLinks never gives two links the same generated id', () => {
    const ls = normalizeLinks([{ from: 'a→b', to: 'c' }, { from: 'a', to: 'b→c' }]);
    expect(new Set(ls.map(l => l.id)).size).toBe(2);
  });
  it('parallelIndex and dedupeUndirected do not merge different pairs', () => {
    const ls = normalizeLinks([{ from: 'a|b', to: 'c' }, { from: 'a', to: 'b|c' }]);
    expect([...parallelIndex(ls).values()].map(v => v.count)).toEqual([1, 1]);
    expect(dedupeUndirected(ls)).toHaveLength(2);
  });
});

describe('time of ties', () => {
  it("'YYYY-00' is the month before January, one month long", () => {
    expect(parseTime('2024-00')).toBe(L(2023, 11));
    expect(parseTime('2024-00', { end: true })).toBe(L(2024) - 1);
  });

  it('years 0–99 are those years, not 1900–1999 (T-01)', () => {
    expect(new Date(parseTime(14)).getFullYear()).toBe(14);
    expect(parseTime(14)).toBe(L(14));
    expect(parseTime('0099', { end: true })).toBe(L(100) - 1);
    expect(new Date(parseTime('0099', { end: true })).getFullYear()).toBe(99);
  });
  it('linkTimeExtent spans every start and end; null without time', () => {
    const ext = linkTimeExtent([{ start: 1990 }, { start: '1995-03', end: 2001 }]);
    expect(ext.map(ym)).toEqual(['1990-01', '2001-12']);
    expect(linkTimeExtent([{ source: 'a' }])).toBeNull();
  });
  it('activeLinkSeries counts open-ended ties as still running, by month or year', () => {
    const monthly = activeLinkSeries([{ start: '2020-01', end: '2020-02' }, { start: '2020-02' }, { start: '2020-01', end: '2020-06' }]);
    expect(monthly.map(d => d.value)).toEqual([2, 3, 2, 2, 2, 2, 2]);
    const yearly = activeLinkSeries([{ start: 1900, end: 1960 }, { start: 1950 }]);
    expect(yearly[0].date.getFullYear()).toBe(1900);
    expect(yearly.at(-1).value).toBe(2);
  });
});

// RC-079: one rule for a tie's value wherever it is printed.
describe('linkValueText', () => {
  it('prints an amount in the locale, a numeric string alike, and keeps the sign', () => {
    expect(linkValueText({ value: 1200 })).toBe((1200).toLocaleString());
    expect(linkValueText({ value: '1200' })).toBe((1200).toLocaleString());
    expect(linkValueText({ value: -5 })).toBe((-5).toLocaleString());
    expect(linkValueText({ value: 0 })).toBe('0');
  });
  it('gives other text as it is, and nothing for no value', () => {
    expect(linkValueText({ value: 'abc' })).toBe('abc');
    expect(linkValueText({ value: '' })).toBe('');
    expect(linkValueText({ value: null })).toBe('');
    expect(linkValueText({})).toBe('');
  });
  it('formats an amount with the chart\'s valueFormat; text is not formatted', () => {
    const usd = v => '$' + v.toLocaleString('en-US');
    expect(linkValueText({ value: 627 }, usd)).toBe('$627');
    expect(linkValueText({ value: '1200' }, usd)).toBe('$1,200');
    expect(linkValueText({ value: '≈ 5 M' }, usd)).toBe('≈ 5 M');
    expect(linkValueText({ value: null }, usd)).toBe('');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fromArray, fromJson, fromCsv, fromApi } from '../assets/charts/src/adapters/index.js';

describe('fromArray', () => {
  it('maps fields via accessor functions', () => {
    const out = fromArray(
      [{ d: '2026-01-01', c: '1.5' }],
      { date: r => new Date(r.d), value: r => +r.c },
    );
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(1.5);
    expect(out[0].date).toBeInstanceOf(Date);
  });

  it('maps fields via string keys', () => {
    const out = fromArray(
      [{ label: 'A', n: 7 }],
      { label: 'label', value: 'n' },
    );
    expect(out[0]).toEqual({ label: 'A', value: 7 });
  });

  it('drops rows with an invalid date', () => {
    const out = fromArray(
      [{ d: 'bad' }, { d: '2026-01-01' }],
      { date: r => new Date(r.d) },
    );
    expect(out).toHaveLength(1);
  });

  it('drops rows with a non-finite value', () => {
    const out = fromArray(
      [{ n: 'x' }, { n: '3' }],
      { value: r => +r.n },
    );
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(3);
  });
});

describe('fromArray — dates by key (C-11)', () => {
  it('parses a string date mapped by key and coerces the value', () => {
    const out = fromArray([{ ts: '2026-01-01', close: '148.5' }], { date: 'ts', value: 'close' });
    expect(out).toHaveLength(1);
    expect(out[0].date).toBeInstanceOf(Date);
    expect(out[0].value).toBe(148.5);
  });
  it('reads a date-only string as the charts do by default: local midnight (T-10)', () => {
    const out = fromArray([{ ts: '2026-01-01' }, { ts: '2026-01-02T00:00:00Z' }], { date: 'ts' });
    expect(out.map(r => +r.date)).toEqual([+new Date(2026, 0, 1), Date.UTC(2026, 0, 2)]);
  });
  it('accepts epoch milliseconds, epoch 0 included', () => {
    const out = fromArray([{ ts: 0, v: 1 }, { ts: 86400000, v: 2 }], { date: 'ts', value: 'v' });
    expect(out.map(r => +r.date)).toEqual([0, 86400000]);
  });
  it('drops a row whose date cannot be read, keeps rows without a date', () => {
    const dated = fromArray([{ ts: 'soon', v: 1 }, { ts: '2026-02-01', v: 2 }], { date: 'ts', value: 'v' });
    expect(dated.map(r => r.value)).toEqual([2]);
    const undated = fromArray([{ k: 'A', v: '0' }], { label: 'k', value: 'v' });
    expect(undated).toEqual([{ label: 'A', value: 0 }]);
  });
});


// ─── The fetch adapters (S-19) ──────────────────────────────────────────────
// fromJson and fromCsv load through d3.json / d3.csv, fromApi through fetch
// itself: all three go through the page's fetch, stubbed here.

describe('fromJson, fromCsv, fromApi (S-19)', () => {
  const serve = (body, { status = 200, type = 'application/json' } = {}) => {
    const fetch = vi.fn(async () => new Response(body, { status, statusText: status === 200 ? 'OK' : 'Not Found', headers: { 'Content-Type': type } }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };
  const rows = [{ ts: '2026-01-01', v: '1.5' }, { ts: 'soon', v: '2' }, { ts: '2026-01-03', v: '' }];
  const mapping = { date: 'ts', value: 'v' };
  const read = out => out.map(r => [+r.date, r.value]);
  const expected = [[+new Date(2026, 0, 1), 1.5], [+new Date(2026, 0, 3), '']];

  it('fromJson maps an array, the same rules as fromArray', async () => {
    const fetch = serve(JSON.stringify(rows));
    expect(read(await fromJson('/rows.json', mapping))).toEqual(expected);
    expect(fetch.mock.calls[0][0]).toBe('/rows.json');
  });

  it('fromJson reads `data` of an object, else its values', async () => {
    serve(JSON.stringify({ data: rows }));
    expect(read(await fromJson('/a.json', mapping))).toEqual(expected);
    serve(JSON.stringify({ a: rows[0], b: rows[2] }));
    expect(read(await fromJson('/b.json', mapping))).toEqual(expected);
  });

  it('fromCsv parses the text, every field a string until the mapping reads it', async () => {
    serve('ts,v\n2026-01-01,1.5\nsoon,2\n2026-01-03,\n', { type: 'text/csv' });
    expect(read(await fromCsv('/rows.csv', mapping))).toEqual(expected);
  });

  it('fromApi sends the headers, applies transform, and maps the rows', async () => {
    const fetch = serve(JSON.stringify({ result: { items: rows } }));
    const out = await fromApi('/api', mapping, { headers: { Authorization: 'Bearer t' }, transform: r => r.result.items });
    expect(read(out)).toEqual(expected);
    expect(fetch).toHaveBeenCalledWith('/api', { headers: { Authorization: 'Bearer t' } });
  });

  it('fromApi without transform reads an array or `data`', async () => {
    serve(JSON.stringify({ data: rows }));
    expect(read(await fromApi('/api', mapping))).toEqual(expected);
  });

  it('fromApi rejects on an HTTP error, naming the status', async () => {
    serve('nope', { status: 404 });
    await expect(fromApi('/api', mapping)).rejects.toThrow('RareCharts.fromApi: 404 Not Found');
  });

  it('fromJson rejects on an HTTP error (d3.json)', async () => {
    serve('nope', { status: 404 });
    await expect(fromJson('/missing.json', mapping)).rejects.toThrow(/404/);
  });
});

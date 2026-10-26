import { describe, it, expect } from 'vitest';
import { fromArray } from '../assets/charts/src/adapters/index.js';

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


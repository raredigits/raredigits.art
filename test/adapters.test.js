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

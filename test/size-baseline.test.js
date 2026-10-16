// The size baseline table is reproducible (CSS-339): every row that names a
// git ref is recomputed from that ref with the documented settings.
import { describe, it, expect } from 'vitest';
import { measure, recordedRows, row } from '../scripts/size-report.mjs';

describe('CSS-339: SIZE-BASELINE.md rows reproduce from git', () => {
  const rows = recordedRows();

  it('has the pre-gate v0.6.19 reference row', () => {
    expect(rows.some((r) => r.label === 'v0.6.19')).toBe(true);
  });

  it.each(rows.map((r) => [r.label, r]))('%s', (_label, r) => {
    expect(row(r.date, r.label, r.ref, measure(r.ref))).toBe(r.line);
  });
});

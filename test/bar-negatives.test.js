import { describe, it, expect, beforeEach } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';

// Categorical Bar with negative values (fixed after v0.9.8): the scale domain
// always includes 0 and bars grow from the zero baseline in both directions.
// Before the fix the domain was hard-coded to [0, max], giving negative bars
// a negative height/width — an invalid rect that silently doesn't render.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const mixed = [
  { label: 'Alpha', value: 40 },
  { label: 'Beta', value: -25 },
  { label: 'Gamma', value: 10 },
];

const rects = () => [...host.querySelectorAll('.rc-bar')].map(r => ({
  x: +r.getAttribute('x'),
  y: +r.getAttribute('y'),
  w: +r.getAttribute('width'),
  h: +r.getAttribute('height'),
}));

describe('Bar — negative values (vertical)', () => {
  it('renders every bar with a non-negative height', () => {
    new Bar('#chart', { height: 300, animate: false }).setData(mixed);
    const rs = rects();
    expect(rs).toHaveLength(3);
    rs.forEach(r => {
      expect(Number.isFinite(r.h)).toBe(true);
      expect(r.h).toBeGreaterThan(0);
    });
  });

  it('positive bars sit above the negative bar top', () => {
    new Bar('#chart', { height: 300, animate: false }).setData(mixed);
    const [alpha, beta] = rects();
    // Vertical SVG y grows downward: the positive bar's top must be above
    // (smaller y than) the negative bar's top, which starts at the baseline.
    expect(alpha.y).toBeLessThan(beta.y);
    // The negative bar hangs below the positive bar's bottom edge.
    expect(beta.y + beta.h).toBeGreaterThan(alpha.y + alpha.h);
  });

  it('all-negative data still renders', () => {
    new Bar('#chart', { height: 300, animate: false }).setData([
      { label: 'A', value: -5 },
      { label: 'B', value: -12 },
    ]);
    const rs = rects();
    expect(rs).toHaveLength(2);
    rs.forEach(r => expect(r.h).toBeGreaterThan(0));
  });
});

describe('Bar — negative values (horizontal)', () => {
  it('renders every bar with a non-negative width', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(mixed);
    const rs = rects();
    expect(rs).toHaveLength(3);
    rs.forEach(r => {
      expect(Number.isFinite(r.w)).toBe(true);
      expect(r.w).toBeGreaterThan(0);
    });
  });

  it('the negative bar extends left of the positive bars', () => {
    new Bar('#chart', { height: 300, orientation: 'horizontal', animate: false }).setData(mixed);
    const [alpha, beta] = rects();
    // The negative bar starts left of the zero baseline where positives start.
    expect(beta.x).toBeLessThan(alpha.x);
    // And ends where the positive bars begin (the shared zero baseline).
    expect(beta.x + beta.w).toBeCloseTo(alpha.x, 0);
  });

  it('value labels render for mixed-sign data without throwing', () => {
    expect(() => new Bar('#chart', {
      height: 300, orientation: 'horizontal', animate: false, showValues: true,
    }).setData(mixed)).not.toThrow();
    expect(host.querySelectorAll('.rc-bar-value')).toHaveLength(3);
  });
});

describe('Bar — positive-only data is unchanged', () => {
  it('keeps the zero-based domain (bar bottoms at the baseline)', () => {
    new Bar('#chart', { height: 300, animate: false }).setData([
      { label: 'A', value: 4 },
      { label: 'B', value: 8 },
    ]);
    const [a, b] = rects();
    // Both bars end on the same baseline; the larger value is taller.
    expect(a.y + a.h).toBeCloseTo(b.y + b.h, 0);
    expect(b.h).toBeGreaterThan(a.h);
  });
});

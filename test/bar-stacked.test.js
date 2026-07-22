import { describe, it, expect, beforeEach } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const series = [
  { name: 'Equities', values: [{ label: '2022', value: 40 }, { label: '2023', value: 55 }, { label: '2024', value: 60 }] },
  { name: 'Bonds',    values: [{ label: '2022', value: 30 }, { label: '2023', value: 25 }, { label: '2024', value: 20 }] },
  { name: 'Cash',     values: [{ label: '2022', value: 30 }, { label: '2023', value: 20 }, { label: '2024', value: 20 }] },
];

const segCount = () => host.querySelectorAll('.rc-bar-seg').length;

describe('Bar — stacked mode', () => {
  it('detects the series-major shape and renders a labelled svg', () => {
    const c = new Bar('#chart', { title: 'Stacked', height: 300 }).setData(series);
    expect(c._isStacked).toBe(true);
    const svg = host.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Stacked');
  });

  it('draws one segment per positive series value', () => {
    new Bar('#chart', { height: 300 }).setData(series);
    expect(segCount()).toBe(9);   // 3 series × 3 categories
  });

  it('takes categories as the ordered union of series labels', () => {
    const c = new Bar('#chart', { height: 300 }).setData(series);
    expect(c._categories).toEqual(['2022', '2023', '2024']);
  });

  it('treats a category a series omits as zero (no segment drawn)', () => {
    const sparse = [
      { name: 'A', values: [{ label: 'Q1', value: 10 }, { label: 'Q2', value: 10 }] },
      { name: 'B', values: [{ label: 'Q1', value: 5 }] },   // omits Q2
    ];
    const c = new Bar('#chart', { height: 300 }).setData(sparse);
    expect(c._categories).toEqual(['Q1', 'Q2']);
    expect(segCount()).toBe(3);   // A/Q1, A/Q2, B/Q1 — not B/Q2
  });

  it('auto-builds a legend from series names', () => {
    new Bar('#chart', { height: 300 }).setData(series);
    const items = host.querySelectorAll('.rc-legend-item');
    expect(items).toHaveLength(3);
    expect([...items].map(el => el.textContent)).toContain('Equities');
  });

  it('renders in percent mode', () => {
    expect(() => new Bar('#chart', { height: 300, stacked: 'percent' }).setData(series)).not.toThrow();
    expect(segCount()).toBe(9);
  });

  it('renders horizontally', () => {
    expect(() => new Bar('#chart', { height: 300, orientation: 'horizontal' }).setData(series)).not.toThrow();
    expect(segCount()).toBe(9);
  });

  it('falls back to plain single-series bars for a flat array', () => {
    const c = new Bar('#chart', { height: 300 }).setData([{ label: 'A', value: 4 }, { label: 'B', value: 7 }]);
    expect(c._isStacked).toBe(false);
    expect(host.querySelectorAll('.rc-bar')).toHaveLength(2);
  });

  it('draws exactly yTicks intervals on the value axis', () => {
    // Totals are 100 per category; d3's ticks(4) would emit 6 ticks (step 20).
    // The stack divides the niced domain into the requested 4 intervals → 5 ticks.
    new Bar('#chart', { height: 300 }).setData(series);
    expect(host.querySelectorAll('.rc-axis .tick')).toHaveLength(5);
  });

  it('percent mode ticks at exact quarter steps', () => {
    new Bar('#chart', { height: 300, stacked: 'percent', orientation: 'horizontal' }).setData(series);
    const labels = [...host.querySelectorAll('.rc-axis .tick text')].map(t => t.textContent);
    expect(labels).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });
});

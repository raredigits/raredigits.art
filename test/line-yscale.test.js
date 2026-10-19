import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { linearTickValues, logTickValues, logPaddedDomain } from '../assets/charts/src/core/utils.js';

// v0.9.8_4: yScale 'log' on Line, switchable between setData() calls, and
// linear Y ticks that stay inside the data instead of stretching the axis.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const series = (values) => values.map((value, i) => ({
  date: new Date(Date.UTC(2020, 0, 1 + i)),
  value,
}));

const yTickLabels = () => [...host.querySelectorAll('.rc-axis-y .tick text')].map(n => n.textContent);
const pathsHaveNaN = () => [...host.querySelectorAll('path')].some(p => (p.getAttribute('d') ?? '').includes('NaN'));

describe('linearTickValues', () => {
  it('keeps every tick inside the range (1Y case: max 193 no longer pulls the axis to 400)', () => {
    const ticks = linearTickValues(49.4, 203.6, 4);
    expect(ticks).toEqual([50, 100, 150, 200]);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(203.6);
  });

  it('returns at least two ticks for a narrow range', () => {
    expect(linearTickValues(100.1, 100.2, 4).length).toBeGreaterThanOrEqual(2);
  });
});

describe('logTickValues', () => {
  it('uses powers of ten across decades', () => {
    expect(logTickValues(5, 300000, 4)).toEqual([10, 100, 1000, 10000, 100000]);
  });

  it('thins powers when there are many decades', () => {
    const ticks = logTickValues(1, 1e12, 4);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0]).toBe(1);
  });

  it('falls back to 1-2-5 steps inside one decade boundary', () => {
    expect(logTickValues(15, 600, 4)).toEqual([20, 50, 100, 200, 500]);
  });

  it('falls back to linear steps for a very narrow domain', () => {
    const ticks = logTickValues(120, 180, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    ticks.forEach(v => expect(v >= 120 && v <= 180).toBe(true));
  });

  it('returns nothing for a non-positive domain', () => {
    expect(logTickValues(0, 10, 4)).toEqual([]);
  });
});

describe('logPaddedDomain', () => {
  it('pads by the same factor on both ends', () => {
    const [lo, hi] = logPaddedDomain(10, 1000);
    expect(10 / lo).toBeCloseTo(hi / 1000, 9);
    expect(10 / lo).toBeCloseTo(Math.pow(100, 0.08), 9);
  });

  it('pads flat data', () => {
    const [lo, hi] = logPaddedDomain(50, 50);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(50);
  });
});

describe('Line — yScale', () => {
  it('stays linear by default with ticks inside the padded data range', () => {
    const c = new Line('#chart', { animate: false });
    c.setData(series([60, 120, 193]));
    expect(c.options.yScale).toBeUndefined();
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);
  });

  it("draws a log scale with power-of-ten ticks for yScale: 'log'", () => {
    const c = new Line('#chart', { animate: false, yScale: 'log' });
    c.setData(series([8, 90, 1200, 15000, 160000]));
    expect(yTickLabels()).toEqual(['10', '100', '1k', '10k', '100k']);
    expect(pathsHaveNaN()).toBe(false);
  });

  it('switches scales between setData() calls with setYScale()', () => {
    const c = new Line('#chart', { animate: false });
    c.setData(series([60, 120, 193]));
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);

    expect(c.setYScale('log')).toBe(c);
    c.setData(series([8, 90, 1200, 15000, 160000]));
    expect(yTickLabels()).toEqual(['10', '100', '1k', '10k', '100k']);

    c.setYScale('linear').setData(series([60, 120, 193]));
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);
  });

  it('skips values ≤ 0 on the log scale with one warning, without NaN paths', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = new Line('#chart', { animate: false, yScale: 'log', area: true, markers: true });
    c.setData(series([10, 0, -5, 100, 1000]));
    c.render();
    expect(pathsHaveNaN()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/2 values ≤ 0 skipped/);
    warn.mockRestore();
  });

  it('fills the area down to the domain floor on a log scale', () => {
    const c = new Line('#chart', { animate: false, yScale: 'log', area: true });
    c.setData(series([10, 100, 1000]));
    const d = host.querySelector('.rc-line-area').getAttribute('d');
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('drops horizontal annotations at or below zero on a log scale', () => {
    const c = new Line('#chart', {
      animate: false, yScale: 'log',
      annotations: [{ value: 0, label: 'zero' }, { value: 100, label: 'hundred' }],
    });
    c.setData(series([10, 100, 1000]));
    const text = host.querySelector('.rc-annotations').textContent;
    expect(text).toContain('hundred');
    expect(text).not.toContain('zero');
    expect(pathsHaveNaN()).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';

// Horizontal Bar value labels on short bars (fixed after v0.9.8_4). A small
// negative bar next to the plot's left edge has room for its label neither
// outside (the plot edge) nor inside (the bar is too short). The label used to
// flip inside anyway and get clipped — '-0.2' read as '-0' on a phone. Now a
// label that does not fit inside goes outside, past the bar end, and the value
// axis widens so it stays inside the plot.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  // A phone-width card (setup.js gives every element 800px).
  Object.defineProperty(host, 'clientWidth', { configurable: true, get: () => 375 });
  document.body.appendChild(host);
});

const cpi = [
  { label: 'Energy',   value: 1.9 },
  { label: 'Housing',  value: 1.5 },
  { label: 'Clothing', value: -0.2 },
];
const oneDecimal = d => d.value.toFixed(1);

// jsdom has no text layout: Bar falls back to 7px per character.
const textW = el => el.textContent.length * 7;

const draw = (data, opts = {}) => {
  const chart = new Bar('#chart', {
    orientation: 'horizontal', showValues: true, height: 300, animate: false,
    valueFormat: oneDecimal, ...opts,
  }).setData(data);
  const bars = [...host.querySelectorAll('.rc-bar')].map(r => ({
    x: +r.getAttribute('x'), w: +r.getAttribute('width'),
  }));
  const labels = [...host.querySelectorAll('.rc-bar-value')].map(el => ({
    el, text: el.textContent, x: +el.getAttribute('x'),
    anchor: el.getAttribute('text-anchor'), fill: el.getAttribute('fill'),
  }));
  return { chart, bars, labels };
};

describe('Bar — value labels on short bars (horizontal)', () => {
  it('places a short negative bar’s label outside, left of the bar end', () => {
    const { chart, bars, labels } = draw(cpi);
    const bar = bars[2], label = labels[2];
    expect(label.text).toBe('-0.2');
    // Outside: anchored at its end, left of the bar's left (value) end,
    // in text colour rather than the bar-background colour.
    expect(label.anchor).toBe('end');
    expect(label.x).toBeLessThan(bar.x);
    expect(label.fill).toBe(chart.theme.text);
  });

  it('keeps that label inside the plot area', () => {
    const { chart, labels } = draw(cpi);
    const label = labels[2];
    // text-anchor end: the text spans [x - width, x].
    expect(label.x - textW(label.el)).toBeGreaterThanOrEqual(0);
    expect(label.x).toBeLessThanOrEqual(chart.width);
  });

  it('positive bars keep their labels within the plot', () => {
    const { chart, labels } = draw(cpi);
    labels.slice(0, 2).forEach(l => {
      const [lo, hi] = l.anchor === 'end' ? [l.x - textW(l.el), l.x] : [l.x, l.x + textW(l.el)];
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(chart.width);
    });
  });

  it('mirrors a short positive bar next to the right edge', () => {
    const { chart, bars, labels } = draw([
      { label: 'A', value: -1.9 },
      { label: 'B', value: 0.2 },
    ]);
    const bar = bars[1], label = labels[1];
    expect(label.anchor).toBe('start');
    expect(label.x).toBeGreaterThan(bar.x + bar.w);
    expect(label.x + textW(label.el)).toBeLessThanOrEqual(chart.width);
  });

  it('still flips a label inside a long bar near the edge', () => {
    // The longest bar ends close to the right edge (the domain stops 10% past
    // it); its label fits inside, so it goes there in the background colour.
    const { chart, bars, labels } = draw([
      { label: 'A', value: 1900 },
      { label: 'B', value: 1500 },
    ], { valueFormat: d => String(d.value) });
    const bar = bars[0], label = labels[0];
    expect(label.anchor).toBe('end');
    expect(label.x).toBeLessThan(bar.x + bar.w);
    expect(label.fill).toBe(chart.theme.bg);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';

// Fit behaviors of the circular charts: outer-label spreading on Donut and
// the shallow-arc (speedometer) text reserve on Gauge.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

describe('Donut — outer label spreading', () => {
  it('spreads same-side labels of small adjacent slices apart', () => {
    new Donut('#chart', { height: 300, showLabels: true }).setData([
      { label: 'Big',     value: 90 },
      { label: 'Small A', value: 5 },
      { label: 'Small B', value: 5 },
    ]);
    // Both small slices land on the left side (text-anchor: end). Unspread,
    // their rows sit ~12px apart; the pass enforces a full block of distance
    // (two 14px lines + 4px breathing room).
    const left = [...host.querySelectorAll('.rc-donut-label')]
      .filter(t => t.getAttribute('text-anchor') === 'end');
    expect(left).toHaveLength(2);
    const ys = left.map(t => +t.getAttribute('y')).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(28 + 4);
  });

  it('renders every eligible label after spreading', () => {
    new Donut('#chart', { height: 300, showLabels: true }).setData([
      { label: 'A', value: 50 }, { label: 'B', value: 50 },
    ]);
    expect(host.querySelectorAll('.rc-donut-label')).toHaveLength(2);
  });
});

describe('Gauge — shallow arcs (half-circle speedometer)', () => {
  const half = { startAngle: -Math.PI / 2, endAngle: Math.PI / 2 };

  it('renders a labelled half-circle without throwing', () => {
    expect(() => new Gauge('#chart', {
      title: 'Speed', height: 220, centerLabel: 'Load', ...half,
    }).setData(64)).not.toThrow();
    expect(host.querySelector('svg').getAttribute('aria-label')).toBe('Speed');
    expect(host.querySelector('.rc-gauge-center-label').textContent).toBe('Load');
  });

  it('keeps the center label inside the svg for a flat 180° sweep', () => {
    // The circle center of a half-circle sits on the drawing's bottom edge;
    // without the text reserve the label 21px below it would clip.
    const g = new Gauge('#chart', { height: 220, centerLabel: 'Load', ...half }).setData(64);
    const tr = host.querySelector('.rc-gauge-center').getAttribute('transform');
    const centerY = +tr.match(/,\s*([-\d.]+)\)/)[1];
    const svgH = g.height + g.margin.top + g.margin.bottom;
    expect(centerY + 21).toBeLessThanOrEqual(svgH);
  });
});

describe('Gauge — needle', () => {
  const half = { startAngle: -Math.PI / 2, endAngle: Math.PI / 2 };

  it('draws a pointer rotated to the value, and a hub', () => {
    new Gauge('#chart', {
      height: 220, animate: false, needle: true, max: 120, centerLabel: 'km/h', ...half,
    }).setData(30);   // 25% of a 180° sweep → −90° + 45° = −45°
    const pointer = host.querySelector('.rc-gauge-needle-pointer');
    expect(pointer).not.toBeNull();
    expect(pointer.getAttribute('transform')).toBe('rotate(-45)');
    expect(host.querySelector('.rc-gauge-needle-hub')).not.toBeNull();
  });

  it('moves the center readout below the hub, inside the svg', () => {
    const g = new Gauge('#chart', {
      height: 220, animate: false, needle: true, centerLabel: 'km/h', ...half,
    }).setData(87);
    expect(host.querySelector('.rc-gauge-center-value').getAttribute('y')).toBe('22');
    expect(host.querySelector('.rc-gauge-center-label').getAttribute('y')).toBe('44');
    const centerY = +host.querySelector('.rc-gauge-center')
      .getAttribute('transform').match(/,\s*([-\d.]+)\)/)[1];
    const svgH = g.height + g.margin.top + g.margin.bottom;
    expect(centerY + 52).toBeLessThanOrEqual(svgH);
  });

  it('renders no needle by default', () => {
    new Gauge('#chart', { height: 220 }).setData(50);
    expect(host.querySelector('.rc-gauge-needle-pointer')).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';

// Construct → setData → render must not throw, and must produce a labelled
// <svg>. Imports are direct (not via index.js, which imports CSS as text —
// that only resolves under esbuild, not the test runner).

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
  { date: '2026-03-01', value: 2 },
];
const labelSeries = [
  { label: 'A', value: 4 },
  { label: 'B', value: 7 },
  { label: 'C', value: 2 },
];

function expectLabelledSvg(title) {
  const svg = host.querySelector('svg');
  expect(svg).not.toBeNull();
  expect(svg.getAttribute('role')).toBe('img');
  expect(svg.getAttribute('aria-label')).toBe(title);
}

describe('chart render smoke tests', () => {
  it('Line constructs, accepts data, and renders a labelled svg', () => {
    expect(() => new Line('#chart', { title: 'Line', height: 300 }).setData(dateSeries)).not.toThrow();
    expectLabelledSvg('Line');
  });

  it('Bar', () => {
    expect(() => new Bar('#chart', { title: 'Bar', height: 300 }).setData(labelSeries)).not.toThrow();
    expectLabelledSvg('Bar');
  });

  it('Bar (horizontal)', () => {
    expect(() => new Bar('#chart', { title: 'BarH', height: 300, orientation: 'horizontal' }).setData(labelSeries)).not.toThrow();
    expectLabelledSvg('BarH');
  });

  it('Donut', () => {
    expect(() => new Donut('#chart', { title: 'Donut', height: 300 }).setData(labelSeries)).not.toThrow();
    expectLabelledSvg('Donut');
  });

  it('Gauge (number form)', () => {
    expect(() => new Gauge('#chart', { title: 'Gauge', height: 300, max: 100 }).setData(73)).not.toThrow();
    expectLabelledSvg('Gauge');
  });

  it('DualAxes (bar + line on two axes)', () => {
    const data = [
      { name: 'Vol', axis: 'y1', type: 'bar', values: dateSeries },
      { name: 'Price', axis: 'y2', type: 'line', values: dateSeries },
    ];
    expect(() => new DualAxes('#chart', { title: 'Dual', height: 300 }).setData(data)).not.toThrow();
    expectLabelledSvg('Dual');
  });

  it('TimeSeries', () => {
    expect(() => new TimeSeries('#chart', { title: 'TS', height: 300 }).setData(dateSeries)).not.toThrow();
    expectLabelledSvg('TS');
  });

  it('re-rendering via a second setData does not throw', () => {
    const c = new Bar('#chart', { title: 'Bar', height: 300 }).setData(labelSeries);
    expect(() => c.setData([{ label: 'X', value: 1 }])).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track } from './helpers.js';

// Line and DualAxes share one series normaliser (C-03): every per-series style
// field reaches render, and unreadable rows are dropped the same way in both.

const vals   = [{ date: '2026-01-01', value: 1 }, { date: '2026-01-02', value: 3 }, { date: '2026-01-03', value: 2 }];
const styled = { name: 'a', strokeDash: 'dashed', markers: true, markerShape: 'square', markerSize: 6,
                 markerFill: 'red', markerStroke: 'blue', values: vals };
const plain  = { name: 'b', values: vals.map(d => ({ ...d, value: d.value + 1 })) };

const lineCharts = [
  ['Line',     o => new Line(mount(null), o),     'path.rc-line'],
  ['DualAxes', o => new DualAxes(mount(null), o), 'path.rc-dual-line'],
];

const dashes  = (c, sel) => [...c.container.querySelectorAll(sel)].map(p => p.getAttribute('stroke-dasharray'));
const circles = c => c.container.querySelectorAll('.rc-markers circle');
const shapes  = c => c.container.querySelectorAll('.rc-markers path.rc-marker-shape');

describe('per-series styles (C-03)', () => {
  it.each(lineCharts)('%s applies per-series strokeDash and markers', (_n, make, lineSel) => {
    for (const animate of [false, true]) {          // dashed lines skip the draw-in in both branches
      const c = track(make({ animate })).setData([styled, plain]);
      expect(dashes(c, lineSel)).toEqual(['6,4', null]);
      const marks = shapes(c);
      expect(marks).toHaveLength(3);                // series a only
      expect(marks[0].getAttribute('d')).toBe('M-6,-6h12v12h-12z');   // square, size 6
      expect(marks[0].getAttribute('fill')).toBe('red');
      expect(marks[0].getAttribute('stroke')).toBe('blue');
      expect(circles(c)).toHaveLength(0);
    }
  });

  it.each(lineCharts)('%s: per-series markers:false opts out of chart-level markers', (_n, make) => {
    const c = track(make({ animate: false, markers: true }))
      .setData([{ name: 'a', markers: false, values: vals }, { name: 'b', values: vals }]);
    expect(circles(c)).toHaveLength(3);             // series b only
  });

  it.each(lineCharts)('%s keeps per-series styles through a view change', (_n, make, lineSel) => {
    const c = track(make({ animate: false })).setData([styled, plain]);
    c.setView(['2026-01-02', '2026-01-03']);
    expect(dashes(c, lineSel)).toEqual(['6,4', null]);
    expect(shapes(c)).toHaveLength(2);
  });

  it.each(lineCharts)('%s: strokeWidth null or "" keeps the default width, not 0', (_n, make, lineSel) => {
    const c = track(make({ animate: false }))
      .setData([{ name: 'a', strokeWidth: null, values: vals }, { name: 'b', strokeWidth: '', values: vals },
                { name: 'c', strokeWidth: '3', values: vals }]);
    expect([...c.container.querySelectorAll(lineSel)].map(p => p.getAttribute('stroke-width')))
      .toEqual(['2', '2', '3']);
  });

  it('DualAxes draws no markers on a bar series', () => {
    const c = track(new DualAxes(mount(null), { animate: false }))
      .setData([{ name: 'bars', type: 'bar', markers: true, values: vals }, { name: 'line', values: vals }]);
    expect(c.container.querySelectorAll('rect.rc-dual-bar')).toHaveLength(3);
    expect(circles(c)).toHaveLength(0);
  });
});

// ─── Missing values are dropped, not drawn as 0 ────────────────────────────────

describe('missing values in line-family charts (C-03)', () => {
  // null, '' and booleans are not 0/1: the line joins its neighbours
  const gappy = [
    { date: '2026-01-01', value: 5 },
    { date: '2026-01-02', value: null },
    { date: '2026-01-03', value: '' },
    { date: '2026-01-04', value: true },
    { date: '2026-01-05', value: 7 },
  ];

  it.each([
    ['Line (flat)',   () => new Line(mount(null), { animate: false, markers: true }), gappy],
    ['Line (series)', () => new Line(mount(null), { animate: false, markers: true }), [{ name: 's', values: gappy }]],
    ['DualAxes',      () => new DualAxes(mount(null), { animate: false, markers: true }), [{ name: 's', values: gappy }]],
  ])('%s drops null, empty and boolean values', (_n, make, data) => {
    const c = track(make()).setData(data);
    expect(circles(c)).toHaveLength(2);
    expect(c.container.querySelector('.rc-end-label').textContent).toMatch(/7/);
  });

  it.each(lineCharts)('%s skips null series and null rows without throwing', (_n, make, lineSel) => {
    const c = track(make({ animate: false, markers: true }));
    expect(() => c.setData([null, { name: 'a', values: [null, ...vals] }])).not.toThrow();
    expect(circles(c)).toHaveLength(3);
    // mapped before filtering: the series keeps its palette slot (index 1)
    expect(c.container.querySelector(lineSel).getAttribute('stroke')).toBe(c.theme.colors[1]);
  });

  it('Line (flat) skips a null row without throwing', () => {
    const c = track(new Line(mount(null), { animate: false, markers: true }));
    expect(() => c.setData([vals[0], null, vals[2]])).not.toThrow();
    expect(circles(c)).toHaveLength(2);
  });

  it.each([
    ['a leading null', [null, ...vals]],
    ['a leading point without a value', [{ date: '2025-12-31' }, ...vals]],
  ])('Line (flat) reads its shape past %s instead of losing the whole series', (_n, data) => {
    const c = track(new Line(mount(null), { animate: false, markers: true })).setData(data);
    expect(c.container.querySelectorAll('path.rc-line')).toHaveLength(1);
    expect(circles(c)).toHaveLength(3);
  });

  it('a band whose first point is null is still a band', () => {
    const band = { name: 'range', values: [null, { date: '2026-01-01', lower: 1, upper: 3 }, { date: '2026-01-02', lower: 2, upper: 4 }] };
    const c = track(new Line(mount(null), { animate: false })).setData([band, plain]);
    expect(c.container.querySelectorAll('path.rc-band')).toHaveLength(1);
    expect(c.container.querySelectorAll('path.rc-line')).toHaveLength(1);
  });

  it('TimeSeries reads points the same way: booleans are dropped, setData and appendPoint alike', () => {
    const c = track(new TimeSeries(mount(null), { curve: 'linear' })).setData(gappy);
    const vertices = () => c.container.querySelector('path.rc-ts-line').getAttribute('d').match(/[ML]/g).length;
    expect(vertices()).toBe(2);
    c.appendPoint({ date: '2026-01-06', value: false });
    expect(vertices()).toBe(2);
    c.appendPoint({ date: '2026-01-06', value: '6' });
    expect(vertices()).toBe(3);
  });
});

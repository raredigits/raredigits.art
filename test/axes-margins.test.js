import { describe, it, expect, beforeEach } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';

// Axis visibility toggles (0.9.8): a hidden axis collapses its default margin
// so the plot runs flush. An explicit margin always wins. Where a gutter is
// shared (Line/DualAxes right side hosts the Y axis AND end labels), it only
// collapses once every occupant is off.

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
];
const dualData = [
  { name: 'Vol', axis: 'y1', type: 'bar', values: dateSeries },
  { name: 'Price', axis: 'y2', type: 'line', values: dateSeries },
];

describe('Line — margin reclaim', () => {
  it('keeps the default gutters when axes are shown', () => {
    const c = new Line('#chart', {});
    expect(c.margin.right).toBe(64);
    expect(c.margin.bottom).toBe(18);
  });

  it('keeps the right gutter when only the Y axis is hidden (end labels still live there)', () => {
    const c = new Line('#chart', { showYAxis: false });
    expect(c.margin.right).toBe(64);
  });

  it('collapses the right gutter when the Y axis and end labels are both off', () => {
    const c = new Line('#chart', { showYAxis: false, endLabels: false });
    expect(c.margin.right).toBe(0);
  });

  it('keeps the right gutter for end labels alone', () => {
    const c = new Line('#chart', { showYAxis: false, endLabels: true });
    expect(c.margin.right).toBe(64);
  });

  it('collapses the bottom margin when the X axis is hidden', () => {
    const c = new Line('#chart', { showXAxis: false });
    expect(c.margin.bottom).toBe(0);
  });

  it('collapses the left gutter of a left-positioned hidden Y axis', () => {
    const shown  = new Line('#chart', { yAxisPosition: 'left' });
    expect(shown.margin.left).toBe(64);
    document.body.innerHTML = '';
    document.body.appendChild(host);
    const hidden = new Line('#chart', { yAxisPosition: 'left', showYAxis: false });
    expect(hidden.margin.left).toBe(0);
  });

  it('an explicit margin wins over the collapse', () => {
    const c = new Line('#chart', { showYAxis: false, endLabels: false, showXAxis: false, margin: { right: 40, bottom: 12 } });
    expect(c.margin.right).toBe(40);
    expect(c.margin.bottom).toBe(12);
  });

  it('still renders flush without throwing', () => {
    expect(() => new Line('#chart', {
      showXAxis: false, showYAxis: false, showGrid: false, endLabels: false,
    }).setData(dateSeries)).not.toThrow();
    expect(host.querySelector('svg')).not.toBeNull();
  });
});

describe('Bar — margin reclaim', () => {
  it('vertical: hiding the value (Y) axis collapses the right gutter', () => {
    expect(new Bar('#chart', {}).margin.right).toBe(65);
    document.body.innerHTML = '';
    document.body.appendChild(host);
    expect(new Bar('#chart', { showYAxis: false }).margin.right).toBe(0);
  });

  it('vertical: hiding the category (X) axis collapses the bottom margin', () => {
    expect(new Bar('#chart', { showXAxis: false }).margin.bottom).toBe(0);
  });

  it('horizontal: hiding the category (Y) axis collapses the left gutter', () => {
    expect(new Bar('#chart', { orientation: 'horizontal' }).margin.left).toBe(65);
    document.body.innerHTML = '';
    document.body.appendChild(host);
    expect(new Bar('#chart', { orientation: 'horizontal', showYAxis: false }).margin.left).toBe(0);
  });

  it('horizontal: hiding the value (X) axis collapses the bottom margin', () => {
    expect(new Bar('#chart', { orientation: 'horizontal', showXAxis: false }).margin.bottom).toBe(0);
  });

  it('an explicit margin wins over the collapse', () => {
    const c = new Bar('#chart', { showYAxis: false, margin: { right: 30 } });
    expect(c.margin.right).toBe(30);
  });

  it('still renders flush without throwing', () => {
    expect(() => new Bar('#chart', {
      showXAxis: false, showYAxis: false, showGrid: false,
    }).setData(labelSeries)).not.toThrow();
  });
});

describe('DualAxes — margin reclaim', () => {
  it('keeps both gutters by default', () => {
    const c = new DualAxes('#chart', {});
    expect(c.margin.right).toBe(64);
    expect(c.margin.left).toBe(64);
  });

  it('collapses the left gutter when the Y2 axis is hidden', () => {
    expect(new DualAxes('#chart', { showY2Axis: false }).margin.left).toBe(0);
  });

  it('keeps the left gutter for a y2Title even with the axis hidden', () => {
    expect(new DualAxes('#chart', { showY2Axis: false, y2Title: 'USD' }).margin.left).toBe(64);
  });

  it('keeps the right gutter while end labels are on', () => {
    expect(new DualAxes('#chart', { showY1Axis: false }).margin.right).toBe(64);
  });

  it('collapses the right gutter when the Y1 axis and end labels are both off', () => {
    expect(new DualAxes('#chart', { showY1Axis: false, endLabels: false }).margin.right).toBe(0);
  });

  it('collapses the bottom margin when the X axis is hidden', () => {
    expect(new DualAxes('#chart', { showXAxis: false }).margin.bottom).toBe(0);
  });

  it('still renders flush without throwing', () => {
    expect(() => new DualAxes('#chart', {
      showXAxis: false, showY1Axis: false, showY2Axis: false, showGrid: false, endLabels: false,
    }).setData(dualData)).not.toThrow();
  });
});

describe('TimeSeries — axis toggles (new in 0.9.8)', () => {
  const tsData = dateSeries.map(d => ({ ...d, date: new Date(d.date) }));

  it('renders grid and both axes by default', () => {
    new TimeSeries('#chart', { height: 300 }).setData(tsData);
    expect(host.querySelector('.rc-grid').children.length).toBeGreaterThan(0);
    const axes = host.querySelectorAll('.rc-axis');
    expect(axes[0].children.length).toBeGreaterThan(0);
    expect(axes[1].children.length).toBeGreaterThan(0);
  });

  it('showGrid: false leaves the grid group empty', () => {
    new TimeSeries('#chart', { height: 300, showGrid: false }).setData(tsData);
    expect(host.querySelector('.rc-grid').children.length).toBe(0);
  });

  it('showXAxis / showYAxis: false leave the axis groups empty', () => {
    new TimeSeries('#chart', { height: 300, showXAxis: false, showYAxis: false }).setData(tsData);
    const axes = host.querySelectorAll('.rc-axis');
    expect(axes[0].children.length).toBe(0);
    expect(axes[1].children.length).toBe(0);
  });

  it('hiding the axes collapses their margins', () => {
    const c = new TimeSeries('#chart', { showXAxis: false, showYAxis: false });
    expect(c.margin.right).toBe(0);
    expect(c.margin.bottom).toBe(0);
  });

  it('keeps the default margins when axes are shown', () => {
    const c = new TimeSeries('#chart', {});
    expect(c.margin.right).toBe(70);
    expect(c.margin.bottom).toBe(28);
  });

  it('an explicit margin wins over the collapse', () => {
    const c = new TimeSeries('#chart', { showYAxis: false, margin: { right: 24 } });
    expect(c.margin.right).toBe(24);
  });
});

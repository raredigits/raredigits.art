import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';

// The log Y scale: yScale 'log' on Line (v0.9.8_4) and TimeSeries, per axis on
// DualAxes (y1Scale / y2Scale, v0.9.8_5), switchable with setYScale(); and one
// Lin/Log button (scaleToggle) in the header row, pinned right above the
// Y-axis labels, with an onScaleChange event, shared by the three charts.
// The tick helpers themselves (logTickValues, logPaddedDomain,
// linearTickValues) are covered in utils.test.js.

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

const day = i => new Date(Date.UTC(2020, 0, 1 + i));
const points = values => values.map((value, i) => ({ date: day(i), value }));

const ticks = sel => [...host.querySelectorAll(`${sel} .tick text`)].map(n => n.textContent);
const pathsHaveNaN = () => [...host.querySelectorAll('path, rect')]
  .some(el => ['d', 'y', 'height'].some(a => (el.getAttribute(a) ?? '').includes('NaN')));
const scaleButtons = () => [...host.querySelectorAll('.rc-scale-btn')];
const scaleButton  = () => host.querySelector('.rc-scale-btn');

// An index on y1 spanning four decades, a signed change on y2.
const dual = (y2Values = [-2, 1, 3, -1, 2]) => [
  { name: 'Index',  axis: 'y1', type: 'line', values: points([10, 120, 1500, 9000, 80000]) },
  { name: 'Change', axis: 'y2', type: 'bar',  values: points(y2Values) },
];

// ─── Shared contracts ─────────────────────────────────────────────────────────
// What every chart with a log scale owes: powers-of-ten ticks without NaN, and
// values ≤ 0 skipped with a single warning (not one per render).

const LOG_CHARTS = [
  {
    name: 'Line',
    build: o => new Line('#chart', { animate: false, ...o }),
    decades: {
      opts: { yScale: 'log' }, axis: '.rc-axis-y',
      data: () => points([8, 90, 1200, 15000, 160000]),
      ticks: ['10', '100', '1k', '10k', '100k'],
    },
    // area and markers on: no NaN in any of the three marks
    nonPositive: { opts: { yScale: 'log', area: true, markers: true }, data: () => points([10, 0, -5, 100, 1000]) },
  },
  {
    name: 'DualAxes',
    build: o => new DualAxes('#chart', { animate: false, ...o }),
    decades: {
      opts: { y1Scale: 'log' }, axis: '.rc-axis-y1',
      data: () => dual(),
      ticks: ['10', '100', '1k', '10k', '100k'],
    },
    // the signed change series on a log y2
    nonPositive: { opts: { y2Scale: 'log' }, data: () => dual() },
  },
  {
    name: 'TimeSeries',
    build: o => new TimeSeries('#chart', o),
    decades: {
      opts: { yScale: 'log', yTickFormat: v => String(v) }, axis: '.rc-axis',
      data: () => points([3, 40, 500, 6000, 70000]),
      ticks: ['10', '100', '1000', '10000'], partial: true,
    },
    nonPositive: { opts: { yScale: 'log' }, data: () => points([0, 10, -3, 100, 1000]) },
  },
];

describe('log scale — shared contracts', () => {
  const rows = LOG_CHARTS.map(c => [c.name, c]);

  it.each(rows)('%s: powers-of-ten ticks on the log axis, no NaN', (_name, { build, decades }) => {
    build(decades.opts).setData(decades.data());
    const drawn = ticks(decades.axis);
    if (decades.partial) expect(drawn).toEqual(expect.arrayContaining(decades.ticks));
    else expect(drawn).toEqual(decades.ticks);
    expect(pathsHaveNaN()).toBe(false);
  });

  it.each(rows)('%s: values ≤ 0 are skipped with one warning, also across a re-render, no NaN', (_name, { build, nonPositive }) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = build(nonPositive.opts).setData(nonPositive.data());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/2 values ≤ 0 skipped/);
    chart.render();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(pathsHaveNaN()).toBe(false);
  });
});

// ─── Line ─────────────────────────────────────────────────────────────────────

describe('Line — yScale', () => {
  const yTickLabels = () => ticks('.rc-axis-y');

  it('stays linear by default with ticks inside the padded data range', () => {
    const c = new Line('#chart', { animate: false });
    c.setData(points([60, 120, 193]));
    expect(c.options.yScale).toBeUndefined();
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);
  });

  it('switches scales between setData() calls with setYScale()', () => {
    const c = new Line('#chart', { animate: false });
    c.setData(points([60, 120, 193]));
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);

    expect(c.setYScale('log')).toBe(c);
    c.setData(points([8, 90, 1200, 15000, 160000]));
    expect(yTickLabels()).toEqual(['10', '100', '1k', '10k', '100k']);

    c.setYScale('linear').setData(points([60, 120, 193]));
    expect(yTickLabels()).toEqual(['50', '100', '150', '200']);
  });

  it('fills the area down to the domain floor on a log scale', () => {
    new Line('#chart', { animate: false, yScale: 'log', area: true }).setData(points([10, 100, 1000]));
    const d = host.querySelector('.rc-line-area').getAttribute('d');
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('drops horizontal annotations at or below zero on a log scale', () => {
    new Line('#chart', {
      animate: false, yScale: 'log',
      annotations: [{ value: 0, label: 'zero' }, { value: 100, label: 'hundred' }],
    }).setData(points([10, 100, 1000]));
    const text = host.querySelector('.rc-annotations').textContent;
    expect(text).toContain('hundred');
    expect(text).not.toContain('zero');
    expect(pathsHaveNaN()).toBe(false);
  });
});

// ─── DualAxes ─────────────────────────────────────────────────────────────────

describe('DualAxes — per-axis log scale', () => {
  it('y1Scale log leaves y2 linear: its signed ticks keep zero', () => {
    new DualAxes('#chart', { animate: false, y1Scale: 'log' }).setData(dual());
    expect(ticks('.rc-axis-y2')).toContain('0');
  });

  it('linear by default — the existing axes are unchanged', () => {
    new DualAxes('#chart', { animate: false }).setData(dual());
    expect(ticks('.rc-axis-y1').some(s => s.includes('.00'))).toBe(true);
  });

  it('y2Scale log on a bar series: bars grow from the bottom of the axis', () => {
    const data = [
      { name: 'Price',  axis: 'y1', type: 'line', values: points([5, 6, 7, 8, 9]) },
      { name: 'Volume', axis: 'y2', type: 'bar',  values: points([10, 100, 1000, 10000, 100000]) },
    ];
    new DualAxes('#chart', { animate: false, y2Scale: 'log' }).setData(data);
    const bars = [...host.querySelectorAll('.rc-dual-bar')];
    expect(bars).toHaveLength(5);
    const bottoms = bars.map(b => +b.getAttribute('y') + +b.getAttribute('height'));
    bottoms.forEach(v => expect(v).toBeCloseTo(bottoms[0], 3));
    const heights = bars.map(b => +b.getAttribute('height'));
    // Each ×10 adds the same height on a log axis.
    expect(heights[2] - heights[1]).toBeCloseTo(heights[3] - heights[2], 3);
    expect(pathsHaveNaN()).toBe(false);
  });

  it('a skipped value ≤ 0 takes its bar with it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    new DualAxes('#chart', { animate: false, y2Scale: 'log' }).setData(dual());
    expect(host.querySelectorAll('.rc-dual-bar')).toHaveLength(3);
  });

  it('setYScale switches one axis or both', () => {
    const chart = new DualAxes('#chart', { animate: false }).setData([
      { name: 'A', axis: 'y1', type: 'line', values: points([10, 100, 1000]) },
      { name: 'B', axis: 'y2', type: 'line', values: points([20, 200, 2000]) },
    ]);
    chart.setYScale('log', { axis: 'y2' });
    expect(chart.options.y1Scale ?? 'linear').toBe('linear');
    expect(chart.options.y2Scale).toBe('log');
    expect(ticks('.rc-axis-y2')).toEqual(['100', '1k']);
    chart.setYScale('log');
    expect(ticks('.rc-axis-y1')).toEqual(['10', '100', '1k']);
    chart.setYScale('linear', { axis: 'y1' });
    expect(chart.options.y1Scale).toBe('linear');
    expect(chart.options.y2Scale).toBe('log');
  });

  it('drops horizontal annotations at or below zero on the log axis only', () => {
    new DualAxes('#chart', {
      animate: false, y1Scale: 'log',
      annotations: [
        { value: 1000, label: 'kept' },
        { value: -5, label: 'dropped' },
        { value: -1, axis: 'y2', label: 'linear axis keeps it' },
      ],
    }).setData(dual());
    const text = host.querySelector('.rc-annotations').textContent;
    expect(text).toContain('kept');
    expect(text).toContain('linear axis keeps it');
    expect(text).not.toContain('dropped');
  });
});

// ─── TimeSeries ───────────────────────────────────────────────────────────────

describe('TimeSeries — yScale log', () => {
  it('setYScale switches back to linear', () => {
    const chart = new TimeSeries('#chart', { yScale: 'log' }).setData(points([10, 100, 1000]));
    chart.setYScale('linear');
    expect(chart.yScale.base).toBeUndefined();
    chart.setYScale('log');
    expect(typeof chart.yScale.base).toBe('function');
  });
});

// ─── The Lin/Log button ───────────────────────────────────────────────────────

describe('scaleToggle — one Lin/Log button in the header row', () => {
  const make = {
    Line:       opts => new Line('#chart', { animate: false, ...opts }).setData(points([10, 100, 1000])),
    TimeSeries: opts => new TimeSeries('#chart', opts).setData(points([10, 100, 1000])),
    DualAxes:   opts => new DualAxes('#chart', { animate: false, ...opts }).setData([
      { name: 'A', axis: 'y1', type: 'line', values: points([10, 100, 1000]) },
      { name: 'B', axis: 'y2', type: 'line', values: points([20, 200, 2000]) },
    ]),
  };

  for (const [name, build] of Object.entries(make)) {
    it(`${name}: one button naming the scale; a click flips it and fires onScaleChange`, () => {
      const chart = build({ scaleToggle: true });
      const events = [];
      chart.onScaleChange(e => events.push(e));

      expect(scaleButtons()).toHaveLength(1);
      expect(scaleButton().textContent).toBe('Lin');
      expect(scaleButton().classList.contains('rc-range-btn')).toBe(true);
      expect(scaleButton().closest('.rc-chart-header .rc-chart-range-row')).not.toBeNull();

      scaleButton().click();
      expect(scaleButton().textContent).toBe('Log');
      expect(scaleButton().dataset.scale).toBe('log');
      expect(events).toEqual([{ scale: 'log', axis: name === 'DualAxes' ? 'y1' : 'y' }]);
      expect(pathsHaveNaN()).toBe(false);

      scaleButton().click();
      expect(scaleButton().textContent).toBe('Lin');
      expect(events.at(-1).scale).toBe('linear');
      expect(scaleButtons()).toHaveLength(1);
    });
  }

  it('names the initial scale', () => {
    make.Line({ scaleToggle: true, yScale: 'log' });
    expect(scaleButton().textContent).toBe('Log');
  });

  it('setYScale() from code renames it; { silent: true } skips the event', () => {
    const chart = make.Line({ scaleToggle: true });
    const cb = vi.fn();
    chart.onScaleChange(cb);
    chart.setYScale('log', { silent: true });
    expect(scaleButton().textContent).toBe('Log');
    expect(cb).not.toHaveBeenCalled();
    chart.setYScale('linear');
    expect(cb).toHaveBeenCalledWith({ scale: 'linear', axis: 'y' });
  });

  it('DualAxes: scaleToggle "y2" drives the left axis only', () => {
    const chart = make.DualAxes({ scaleToggle: 'y2' });
    const events = [];
    chart.onScaleChange(e => events.push(e));
    scaleButton().click();
    expect(chart.options.y2Scale).toBe('log');
    expect(chart.options.y1Scale ?? 'linear').toBe('linear');
    expect(events).toEqual([{ scale: 'log', axis: 'y2' }]);
  });

  it('DualAxes: true drives Y1 only — a signed Y2 stays linear', () => {
    const chart = new DualAxes('#chart', { animate: false, y1Scale: 'log', scaleToggle: true }).setData(dual());
    expect(scaleButton().textContent).toBe('Log');
    scaleButton().click();
    expect(chart.options.y1Scale).toBe('linear');
    expect(chart.options.y2Scale ?? 'linear').toBe('linear');
    scaleButton().click();
    expect(chart.options.y1Scale).toBe('log');
    expect(chart.options.y2Scale ?? 'linear').toBe('linear');
    // The negative bars on Y2 are still there.
    expect(host.querySelectorAll('.rc-dual-bar')).toHaveLength(5);
  });

  it("DualAxes: 'both' reads Log while either axis is log, and a click takes both to linear", () => {
    const chart = new DualAxes('#chart', { animate: false, y1Scale: 'log', scaleToggle: 'both' }).setData(dual());
    expect(scaleButton().textContent).toBe('Log');
    scaleButton().click();
    expect(chart.options.y1Scale).toBe('linear');
    expect(chart.options.y2Scale).toBe('linear');
    expect(scaleButton().textContent).toBe('Lin');
  });

  it('custom labels', () => {
    const chart = make.Line({ scaleToggle: { labels: { linear: 'Лин', log: 'Лог' } } });
    expect(scaleButton().textContent).toBe('Лин');
    chart.setYScale('log');
    expect(scaleButton().textContent).toBe('Лог');
  });

  it('sits in the timeframe row but outside the timeframe group', () => {
    make.Line({ scaleToggle: true, timeframes: ['1M', 'ALL'] });
    const row = host.querySelector('.rc-chart-range-row');
    expect(row.querySelectorAll('.rc-chart-range-bar .rc-range-btn')).toHaveLength(2);
    expect(row.lastElementChild).toBe(scaleButton());
    expect(scaleButton().closest('.rc-chart-range-bar')).toBeNull();
  });

  for (const [name, build] of Object.entries(make)) {
    it(`${name}: the scale and the timeframe keep each other`, () => {
      // Two years of daily data, so 1M / 1Y / ALL are distinct windows.
      const days = Array.from({ length: 730 }, (_, i) => ({ date: day(i), value: 10 * Math.pow(1.005, i) }));
      const data = name === 'DualAxes'
        ? [{ name: 'A', axis: 'y1', type: 'line', values: days }]
        : days;
      const chart = build({ scaleToggle: true, timeframes: ['1M', '1Y', 'ALL'] });
      chart.setData(data);
      const views = [];
      const scales = [];
      chart.onViewChange(v => views.push(v));
      chart.onScaleChange(e => scales.push(e.scale));
      const active = () => host.querySelector('.rc-range-btn.active')?.dataset.timeframe;

      host.querySelector('[data-timeframe="1Y"]').click();
      const view1Y = chart.getView().map(Number);
      scaleButton().click();                                // → log
      expect(active()).toBe('1Y');                          // the period stays
      expect(chart.getView().map(Number)).toEqual(view1Y);

      host.querySelector('[data-timeframe="1M"]').click();
      expect(scaleButton().textContent).toBe('Log');        // the scale stays
      expect(chart._isLogScale(chart._getScaleToggle().axis)).toBe(true);
      expect(pathsHaveNaN()).toBe(false);

      scaleButton().click();                                // → linear
      expect(active()).toBe('1M');

      // Each control fires only its own event.
      expect(views).toHaveLength(2);
      expect(scales).toEqual(['log', 'linear']);
    });
  }

  it('is off by default, and ignored by charts without a log scale', () => {
    make.Line({});
    expect(scaleButtons()).toHaveLength(0);
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
    new Bar('#chart', { scaleToggle: true, animate: false }).setData([{ label: 'A', value: 1 }]);
    expect(scaleButtons()).toHaveLength(0);
  });
});

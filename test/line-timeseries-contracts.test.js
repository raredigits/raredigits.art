import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { Line } from '../assets/charts/src/charts/Line.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { areaPath } from '../assets/charts/src/core/seriesPath.js';
import { mount, track } from './helpers.js';

// Documented promises of the base chart, Line and TimeSeries that the
// v0.9.8_6 docs check (O-10, step 6) found broken — each test fails without
// its fix.

// Local-time dates, so day-level assertions hold in any timezone.
const D = (y, m, d) => new Date(y, m - 1, d);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daily = (from, days, value = i => 100 + (i % 20)) => Array.from({ length: days }, (_, i) => {
  const date = new Date(from);
  date.setDate(date.getDate() + i);
  return { date, value: value(i) };
});
const hover = (el, init = {}) =>
  el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 100, ...init }));
const activeButton = c => c.container.querySelector('.rc-range-btn.active')?.textContent ?? null;

describe('source: { text } without href', () => {
  it('renders its text, alone or as an array part', () => {
    const one = track(new Line(mount(null), { animate: false, source: { text: 'Source: Desk' } }));
    expect(one.container.querySelector('.rc-chart-source').textContent).toBe('Source: Desk');
    const many = track(new Line(mount(null), {
      animate: false,
      source: ['Source: ', { text: 'NASDAQ', href: 'https://nasdaq.com' }, ', ', { text: 'Internal' }],
    }));
    const cite = many.container.querySelector('.rc-chart-source');
    expect(cite.textContent).toBe('Source: NASDAQ, Internal');
    expect(cite.querySelectorAll('a')).toHaveLength(1);
  });
});

describe('a timeframe step without a key', () => {
  const steps = [{ label: 'Q1', range: [D(2025, 1, 1), D(2025, 3, 31)] }, 'ALL'];

  it('is highlighted by its label, from code and from its button', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: steps })).setData(daily(D(2025, 1, 1), 200));
    c.setTimeframe('Q1');
    expect(activeButton(c)).toBe('Q1');
    c.setTimeframe('ALL');
    expect(activeButton(c)).toBe('ALL');
    [...c.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === 'Q1').click();
    expect(activeButton(c)).toBe('Q1');
    expect(c.getView().map(ymd)).toEqual(['2025-01-01', '2025-03-31']);
  });
});

describe('navigator option', () => {
  const strip = o => track(new Line(mount(null), { animate: false, ...o }))
    .setData(daily(D(2025, 1, 1), 60)).container.querySelector('.rc-chart-navigator');

  it('only true or an options object turns the strip on', () => {
    expect(strip({ navigator: 0 })).toBeNull();
    expect(strip({ navigator: '' })).toBeNull();
    expect(strip({ navigator: false })).toBeNull();
    expect(strip({ navigator: true })).not.toBeNull();
    expect(strip({ navigator: { height: 40 } })).not.toBeNull();
  });
});

describe('TimeSeries keeps its view across new data (as every time chart, T-03)', () => {
  const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
    date: new Date(year, i, 15), value: 10 + i,
  }));

  it('setData: a selected timeframe re-applies to the new data', () => {
    const c = track(new TimeSeries(mount(null), { timeframes: ['3M', 'ALL'] })).setData(monthly(2020));
    c.setTimeframe('3M');
    c.setData(monthly(2023));
    const end = new Date(2023, 11, 15), start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    expect(c.getView().map(ymd)).toEqual([ymd(start), ymd(end)]);
    expect(activeButton(c)).toBe('3M');
  });

  it('setData: a window the new data still meets is kept', () => {
    const c = track(new TimeSeries(mount(null), { timeframes: ['ALL'] })).setData(monthly(2023));
    c.setView([D(2023, 3, 1), D(2023, 6, 1)]);
    c.setData(monthly(2023).map(d => ({ ...d, value: d.value * 2 })));
    expect(c.getView().map(ymd)).toEqual(['2023-03-01', '2023-06-01']);
  });

  it('appendPoint: a selected timeframe moves with the new point and stays highlighted', () => {
    const c = track(new TimeSeries(mount(null), { timeframes: ['1M', 'ALL'] })).setData(daily(D(2025, 1, 1), 100));
    c.setTimeframe('1M');
    const next = D(2025, 4, 20);
    c.appendPoint({ date: next, value: 130 });
    expect(c.getView()[1].getTime()).toBe(next.getTime());
    expect(activeButton(c)).toBe('1M');
  });
});

describe('Line: yAxisPosition left keeps a right gutter for end labels', () => {
  it('64px on the right while end labels are on, none without them', () => {
    const withEnds = track(new Line(mount(null), { yAxisPosition: 'left' }));
    expect(withEnds.margin.left).toBe(64);
    expect(withEnds.margin.right).toBe(64);
    const without = track(new Line(mount(null), { yAxisPosition: 'left', endLabels: false }));
    expect(without.margin.right).toBe(0);
  });
});

describe('areaBaseline stays inside the plot', () => {
  const xa = d3.scaleLinear().domain([0, 1]).range([0, 100]);
  const yPos = d3.scaleLinear().domain([100, 120]).range([200, 0]);
  const series = { values: [{ date: 0, value: 110 }, { date: 1, value: 120 }] };
  const ys = d => d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 1);

  it("'zero' under all-positive data ends at the bottom of the plot", () => {
    expect(Math.max(...ys(areaPath(series, xa, yPos)))).toBe(200);
  });

  it('a number beyond the value range is clamped to the nearer edge', () => {
    expect(Math.min(...ys(areaPath({ ...series, areaBaseline: 500 }, xa, yPos)))).toBe(0);
    expect(Math.max(...ys(areaPath({ ...series, areaBaseline: 105 }, xa, yPos)))).toBe(150);
  });

  it('Line: the drawn fill does not run below the plot', () => {
    const c = track(new Line(mount(null), { animate: false, area: true }))
      .setData(daily(D(2025, 1, 1), 20));
    const d = c.container.querySelector('.rc-line-area').getAttribute('d');
    expect(Math.max(...ys(d))).toBeLessThanOrEqual(c.height + 0.5);
  });
});

describe('TimeSeries: explicit options win', () => {
  const ann = [{ date: D(2025, 2, 1), label: 'Event' }];

  it('an explicit margin.top wins over the annotation reserve, as on Line', () => {
    expect(track(new TimeSeries(mount(null), { annotations: ann, margin: { top: 5 } })).margin.top).toBe(5);
    expect(track(new TimeSeries(mount(null), { annotations: ann })).margin.top).toBe(26);
    expect(track(new TimeSeries(mount(null), {})).margin.top).toBe(16);
  });

  it('linear yTickValues widen the value range, so every tick is on the plot', () => {
    const c = track(new TimeSeries(mount(null), { yTickValues: [0, 110, 200] })).setData(daily(D(2025, 1, 1), 30));
    const [lo, hi] = c.yScale.domain();
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(200);
  });

  it('crosshair: false shows neither the crosshair lines nor the tooltip', () => {
    const rows = daily(D(2025, 1, 1), 30);
    const on = track(new TimeSeries(mount(null), {})).setData(rows);
    hover(on.overlay.node());
    expect(on.container.querySelector('.rc-tooltip').classList.contains('is-visible')).toBe(true);
    expect(on.crossX.style('opacity')).toBe('1');

    const off = track(new TimeSeries(mount(null), { crosshair: false })).setData(rows);
    hover(off.overlay.node());
    expect(off.container.querySelector('.rc-tooltip').classList.contains('is-visible')).toBe(false);
    expect(off.crossX.style('opacity')).toBe('0');
  });
});

describe('theme sizing tokens are the fallbacks (C-22, Line/TimeSeries/crosshair part)', () => {
  const twoSeries = [
    { name: 'A', values: daily(D(2025, 1, 1), 10) },
    { name: 'B', strokeWidth: 1, values: daily(D(2025, 1, 1), 10, i => 50 + i) },
  ];
  const width = c => [...c.container.querySelectorAll('path.rc-line')].map(p => p.getAttribute('stroke-width'));
  const markerR = c => c.container.querySelector('.rc-marker-circle').getAttribute('r');
  const dotR = c => {
    hover(c.container.querySelector('rect.rc-overlay'));
    return c.container.querySelector('.rc-cross-dot').getAttribute('r');
  };

  it('the defaults draw as before: 2px lines, 4px markers, 3px crosshair dots', () => {
    const c = track(new Line(mount(null), { animate: false, markers: true })).setData(twoSeries);
    expect(width(c)).toEqual(['2', '1']);
    expect(markerR(c)).toBe('4');
    expect(dotR(c)).toBe('3');
  });

  it('theme tokens apply where the chart and series set nothing', () => {
    const theme = { strokeWidth: 5, markerSize: 7, dotRadius: 6 };
    const c = track(new Line(mount(null), { animate: false, markers: true, theme })).setData(twoSeries);
    expect(width(c)).toEqual(['5', '1']);         // a series' own strokeWidth wins
    expect(markerR(c)).toBe('7');
    expect(dotR(c)).toBe('6');
    const opt = track(new Line(mount(null), { animate: false, markers: true, markerSize: 3, theme })).setData(twoSeries);
    expect(markerR(opt)).toBe('3');               // the option wins over the theme
  });

  it('TimeSeries draws its line at theme.strokeWidth', () => {
    const c = track(new TimeSeries(mount(null), { theme: { strokeWidth: 4 } })).setData(daily(D(2025, 1, 1), 10));
    expect(c.container.querySelector('.rc-ts-line').getAttribute('stroke-width')).toBe('4');
  });
});

describe('Line: default date ticks on a short span', () => {
  it('a span of a few days gets one tick per day at most — no repeated dates', () => {
    // Real label boxes, spaced apart: no overlap thinning hides a repeat.
    let n = 0;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => {
      const left = (n++) * 100;
      return { left, right: left + 10, top: 0, bottom: 10, width: 10, height: 10, x: left, y: 0 };
    });
    const c = track(new Line(mount(null), { animate: false })).setData([
      { date: '2026-01-01', value: 1240 },
      { date: '2026-01-02', value: 1580 },
      { date: '2026-01-03', value: 1390 },
    ]);
    const labels = [...c.container.querySelectorAll('.rc-axis-x text')].map(t => t.textContent);
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('an explicit xTickFormat keeps the requested count', () => {
    let n = 0;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => {
      const left = (n++) * 100;
      return { left, right: left + 10, top: 0, bottom: 10, width: 10, height: 10, x: left, y: 0 };
    });
    const c = track(new Line(mount(null), { animate: false, xTickFormat: d3.timeFormat('%d %H:%M') })).setData([
      { date: '2026-01-01', value: 1 },
      { date: '2026-01-03', value: 2 },
    ]);
    expect(c.container.querySelectorAll('.rc-axis-x text').length).toBeGreaterThan(3);
  });
});

describe('Line default date ticks on short spans (step 6 review)', () => {
  const hourly = (from, hours) => Array.from({ length: hours + 1 }, (_, i) =>
    ({ date: new Date(+from + i * 36e5), value: 10 + (i % 5) }));
  const xLabels = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);
  it.each([
    ['36h across one midnight', new Date(2026, 0, 1, 8), 36, ['01/02']],
    ['20h inside one day',      new Date(2026, 0, 5, 2), 20, ['01/05']],
    ['26h across two midnights', new Date(2026, 0, 1, 23), 26, ['01/02', '01/03']],
  ])('%s: one label per midnight, never none, never repeated', (_n, from, h, want) => {
    const c = track(new Line(mount(null), { animate: false })).setData(hourly(from, h));
    expect(xLabels(c)).toEqual(want);
  });
});

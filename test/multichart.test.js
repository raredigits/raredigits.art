import { describe, it, expect, vi } from 'vitest';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track } from './helpers.js';

// MultiChart: the chart types a cell may name (B-02), and the breakpoint.
//
// C-15: the narrow layout is a matter of width (not of the column counts), and
// crossing the breakpoint rebuilds a panel with mobileOptions, so the options
// a chart reads in its constructor — height, margin — apply as well.

const rows = [
  { label: 'North', value: 4 }, { label: 'South', value: 6 }, { label: 'East', value: 5 },
];
const later = [{ label: 'West', value: 9 }, { label: 'Centre', value: 2 }];

// A grid container whose width the test sets; children keep setup's 800px.
function grid(options, width) {
  const el = document.createElement('div');
  let w = width;
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w });
  document.body.appendChild(el);
  const mc = track(new MultiChart(el, { animate: false, ...options }));
  mc.resizeTo = (next) => { w = next; mc._onResize(); return mc; };
  return mc;
}

const panels = (extra = {}) => [
  { type: 'Bar', data: rows, options: { barColor: '#111111' } },
  {
    type: 'Bar', data: rows,
    options: { barColor: '#222222', margin: { left: 0 } },
    mobileOptions: { barColor: '#333333', height: 300, margin: { left: 100 } },
    ...extra,
  },
];
const fills = c => [...c.container.querySelectorAll('rect.rc-bar')].map(r => r.getAttribute('fill'));

describe('MultiChart — mobile is a matter of width (C-15)', () => {
  it('one column on a wide screen is not the mobile layout', () => {
    const mc = grid({ columns: 1, charts: panels() }, 1000);
    expect(mc._isMobile).toBe(false);
    expect(mc.charts[1].options.barColor).toBe('#222222');
    expect(mc.charts[1].options.height).toBe(200);
  });

  it('a narrow container is, whatever the column counts', () => {
    const mc = grid({ columns: 3, mobileColumns: 2, charts: panels() }, 400);
    expect(mc._isMobile).toBe(true);
    expect(mc._gridEl.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(mc.charts[1].options.barColor).toBe('#333333');
  });

  it('a one-column grid that widens past the breakpoint leaves the mobile layout', () => {
    const mc = grid({ columns: 1, charts: panels() }, 400);
    expect(mc.charts[1].options.barColor).toBe('#333333');
    mc.resizeTo(1000);
    expect(mc._isMobile).toBe(false);
    expect(mc.charts[1].options.barColor).toBe('#222222');
    expect(mc.charts[1].container.style.height).toBe('200px');
  });

  it('a hidden container (width 0) keeps the wide layout', () => {
    const mc = grid({ charts: panels() }, 0);
    expect(mc._isMobile).toBe(false);
    expect(mc.charts[1].options.barColor).toBe('#222222');
  });
});

describe('MultiChart — crossing the breakpoint rebuilds the panel (C-15)', () => {
  it('narrowing applies height and margin from mobileOptions, not just the render-time keys', () => {
    const mc = grid({ charts: panels() }, 1000);
    const wide = mc.charts[1];
    expect(wide.container.style.height).toBe('200px');
    mc.resizeTo(400);
    const narrow = mc.charts[1];
    expect(narrow).not.toBe(wide);
    expect(narrow).toBeInstanceOf(Bar);
    expect(narrow.container.style.height).toBe('300px');
    expect(narrow.g.attr('transform')).toMatch(/^translate\(100,/);
    expect(fills(narrow).every(f => f === '#333333')).toBe(true);
    expect(narrow.container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
    expect(wide.container.querySelectorAll('svg')).toHaveLength(1);   // the old chart left the wrapper
  });

  it('widening again restores the options of the wide side', () => {
    const mc = grid({ charts: panels() }, 400);
    expect(mc.charts[1].container.style.height).toBe('300px');
    mc.resizeTo(1000);
    const wide = mc.charts[1];
    expect(wide.container.style.height).toBe('200px');
    expect(wide.g.attr('transform')).toMatch(/^translate\(0,/);
    expect(fills(wide).every(f => f === '#222222')).toBe(true);
  });

  it('the rebuilt panel gets the data it was last given — by mc.setData or by the panel itself', () => {
    const mc = grid({ charts: panels() }, 1000);
    mc.setData([null, later]);
    mc.resizeTo(400);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(2);

    mc.charts[1].setData(rows);
    mc.resizeTo(1000);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
  });

  it('a call on a replaced panel instance is not replayed', () => {
    const mc = grid({ charts: panels() }, 1000);
    const old = mc.charts[1];
    mc.resizeTo(400);
    old.setData(later);
    mc.resizeTo(1000);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
  });

  it('a panel without mobileOptions is left as it is; spans follow the columns', () => {
    const mc = grid({ charts: [{ ...panels()[0], span: 2 }, panels()[1]] }, 1000);
    const first = mc.charts[0];
    expect(mc._cells[0].style.gridColumn).toBe('span 2');
    mc.resizeTo(400);
    expect(mc.charts[0]).toBe(first);
    expect(mc._cells[0].style.gridColumn).toBe('');
    expect(mc._gridEl.style.gridTemplateColumns).toBe('repeat(1, 1fr)');
  });

  it('no crossing, no rebuild', () => {
    const mc = grid({ charts: panels() }, 1000);
    const panel = mc.charts[1];
    mc.resizeTo(900);
    expect(mc.charts[1]).toBe(panel);
  });
});

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
];

// B-02: an explicit type the grid does not know warns and still draws a Line;
// no type means Line, silently.
describe('MultiChart — chart types (B-02)', () => {
  const multi = charts => track(new MultiChart(mount(null), { animate: false, charts }));
  const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

  it('an unknown type warns once, naming the cell and the supported types, and draws a Line', () => {
    const warn = silence();
    const m = multi([{ type: 'Line', data: dateSeries }, { type: 'Donut', data: dateSeries },
      { type: 'Bar', data: dateSeries }, { data: dateSeries }, { type: null, data: dateSeries }]);
    expect(m.charts.map(c => c.constructor)).toEqual([Line, Line, Bar, Line, Line]);
    expect(m.charts[1].container.querySelector('path.rc-line')).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.MultiChart: charts\[1\] has an unknown type "Donut" — drawn as Line\. Supported types: 'Line', 'Bar'\.$/);
  });

  it('a wrong case points at the right name, and still falls back to Line', () => {
    const warn = silence();
    const m = multi([{ type: 'bar', data: dateSeries }]);
    expect(m.charts[0]).toBeInstanceOf(Line);
    expect(warn.mock.calls[0][0]).toMatch(/unknown type "bar" .* Did you mean 'Bar'\?$/);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('%s is an unknown type, not an Object.prototype member', (type) => {
    const warn = silence();
    let m;
    expect(() => { m = multi([{ type, data: dateSeries }]); }).not.toThrow();
    expect(m.charts[0]).toBeInstanceOf(Line);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(() => m.destroy()).not.toThrow();
  });

  it('a class instead of its name warns too', () => {
    const warn = silence();
    const m = multi([{ type: Bar, data: dateSeries }]);
    expect(m.charts[0]).toBeInstanceOf(Line);
    expect(warn.mock.calls[0][0]).toMatch(/unknown type Bar — drawn as Line/);
  });
});

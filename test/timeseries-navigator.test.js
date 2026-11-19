// The TimeSeries navigator: the Overview strip a TimeSeries builds with
// `navigator`, kept in step with the chart by core/Chart.js — the safety net
// for T-10 and the TimeSeries analytics work (S-14). Through the public
// surface only: options, setData, appendPoint, setView, setTimeframe,
// getView, onViewChange, the timeframe buttons, a drag on the strip, and the
// strip's DOM.
//
// Dates are built in local time (new Date(y, m, d)), as the timeframe math
// is; the zone-dependent cases live in test/time-zones.test.js.
//
// Sizes are the test's own (S-18): the card and the strip inside it are BOX
// px wide, as the strip spans the card's width in a page.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track, setGeometry } from './helpers.js';

const BOX = 800;
beforeEach(() => setGeometry({ width: BOX, height: 400 }));

const monthly = (year, months = 12, from = 0) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, from + i, 15), value: 10 + (i % 7),
}));
const span = rows => [rows[0].date, rows.at(-1).date];

const ts = (o = {}) => track(new TimeSeries(mount(null), { navigator: true, ...o }));
const strip = c => c.container.querySelector('.rc-chart-navigator');
const stripWidth = c => +strip(c).querySelector('.overlay').getAttribute('width');
const selection = c => {
  const r = strip(c).querySelector('.selection');
  const x = +r.getAttribute('x');
  return [x, x + +r.getAttribute('width')];
};
const xAt = (d, [t0, t1], W) => ((+d - +t0) / (+t1 - +t0)) * W;
const pathEnds = d => {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g).map(Number);
  return [n[0], n[n.length - 2]];
};
const stripLine = c => pathEnds(strip(c).querySelector('path.rc-ov-line').getAttribute('d'));
const activeButton = c => c.container.querySelector('.rc-range-btn.active')?.textContent ?? null;
const button = (c, label) => [...c.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === label);
const expectSelection = (c, [a, b], extent) => {
  const W = stripWidth(c);
  const [x0, x1] = selection(c);
  expect(x0).toBeCloseTo(Math.min(W, Math.max(0, xAt(a, extent, W))), 6);
  expect(x1).toBeCloseTo(Math.min(W, Math.max(0, xAt(b, extent, W))), 6);
};

// A user's drag on the strip (see test/overview.test.js): mousedown on the
// brush overlay, moves and release on the window; clientX is the x inside
// the strip under jsdom.
function drag(c, from, ...moves) {
  const ev = (type, x) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 5 });
    Object.defineProperty(e, 'view', { value: window });
    return e;
  };
  strip(c).querySelector('.overlay').dispatchEvent(ev('mousedown', from));
  moves.forEach(x => window.dispatchEvent(ev('mousemove', x)));
  window.dispatchEvent(ev('mouseup', moves.length ? moves[moves.length - 1] : from));
}

// ─── Present or absent ────────────────────────────────────────────────────────

describe('TimeSeries navigator — present or absent', () => {
  it('without the option, or with navigator: false, there is no strip', () => {
    const plain = track(new TimeSeries(mount(null))).setData(monthly(2023));
    const off = track(new TimeSeries(mount(null), { navigator: false })).setData(monthly(2023));
    expect(strip(plain)).toBeNull();
    expect(strip(off)).toBeNull();
  });

  it('navigator: true draws the series in a strip of its own: area and line', () => {
    const c = ts().setData(monthly(2023));
    expect(strip(c).querySelectorAll('path.rc-ov-line')).toHaveLength(1);
    expect(strip(c).querySelectorAll('path.rc-ov-area')).toHaveLength(1);
    expect(strip(c).style.display).toBe('');
  });

  it('the strip hides while the chart has no data and comes back with it', () => {
    const c = ts().setData(monthly(2023));
    c.setData([]);
    expect(strip(c).style.display).toBe('none');
    c.setData(monthly(2024));
    expect(strip(c).style.display).toBe('');
    expect(stripLine(c)).toEqual([0, stripWidth(c)]);
  });

  it('navigator options reach the strip: height, area and axis', () => {
    const c = ts({ navigator: { height: 40, area: false, axis: true } }).setData(monthly(2023));
    expect(strip(c).style.height).toBe('40px');
    expect(strip(c).querySelector('path.rc-ov-area')).toBeNull();
    expect(strip(c).querySelectorAll('.rc-ov-axis .tick').length).toBeGreaterThan(0);
    const plain = ts().setData(monthly(2023));
    expect(plain.container.querySelectorAll('.rc-chart-navigator .rc-ov-axis .tick')).toHaveLength(0);
  });
});

// ─── Margin: the strip lines up with the plot ─────────────────────────────────

describe('TimeSeries navigator — margin', () => {
  const origin = c => strip(c).querySelector('svg > g').getAttribute('transform');

  it('by default the strip takes the chart\'s side margins: it lines up with the plot', () => {
    const c = ts().setData(monthly(2023));
    expect(origin(c)).toBe('translate(0,6)');
    expect(stripWidth(c)).toBe(BOX - 70);          // the plot: the Y-axis gutter on the right
    expect(stripWidth(c)).toBe(c.width);
    const flush = ts({ showYAxis: false }).setData(monthly(2023));
    expect(stripWidth(flush)).toBe(BOX);
    const own = ts({ margin: { left: 30, right: 50 } }).setData(monthly(2023));
    expect(origin(own)).toBe('translate(30,6)');
    expect(stripWidth(own)).toBe(BOX - 30 - 50);
  });

  it('a navigator margin merges over the chart\'s sides, side by side', () => {
    const right = ts({ margin: { left: 30 }, navigator: { margin: { right: 20 } } }).setData(monthly(2023));
    expect(origin(right)).toBe('translate(30,6)');
    expect(stripWidth(right)).toBe(BOX - 30 - 20);
    const top = ts({ navigator: { margin: { top: 0 } } }).setData(monthly(2023));
    expect(origin(top)).toBe('translate(0,0)');
    expect(stripWidth(top)).toBe(BOX - 70);
  });
});

// ─── The strip's domain follows the data ──────────────────────────────────────

describe('TimeSeries navigator — the domain follows the data', () => {
  it('after setData with data of another span the strip spans the new data', () => {
    const c = ts().setData(monthly(2020));
    const next = monthly(2023, 6);
    c.setData(next);
    expect(stripLine(c)).toEqual([0, stripWidth(c)]);
    const view = [new Date(2023, 2, 1), new Date(2023, 3, 1)];
    c.setView(view);
    expectSelection(c, view, span(next));
  });

  it('a longer series: the old window is a narrower slice of the new strip', () => {
    const c = ts().setData(monthly(2023));
    const view = [new Date(2023, 2, 1), new Date(2023, 5, 1)];
    c.setView(view);
    const before = selection(c);
    const next = monthly(2021, 48);
    c.setData(next);
    expect(c.getView().map(Number)).toEqual(view.map(Number));
    expectSelection(c, view, span(next));
    expect(selection(c)[1] - selection(c)[0]).toBeLessThan(before[1] - before[0]);
  });

  it('appendPoint widens the strip to the new point', () => {
    const rows = monthly(2023);
    const c = ts().setData(rows);
    const view = [new Date(2023, 2, 1), new Date(2023, 5, 1)];
    c.setView(view);
    const late = new Date(2024, 11, 15);
    c.appendPoint({ date: late, value: 12 });
    expect(stripLine(c)).toEqual([0, stripWidth(c)]);
    expectSelection(c, view, [rows[0].date, late]);
  });
});

// ─── The brush window across views and data ───────────────────────────────────

describe('TimeSeries navigator — the brush window', () => {
  const rows = monthly(2023);

  it('the full view: the selection spans the strip', () => {
    const c = ts().setData(rows);
    expect(selection(c)).toEqual([0, stripWidth(c)]);
  });

  it('setView inside the data: the selection sits at the view', () => {
    const c = ts().setData(rows);
    const view = [new Date(2023, 2, 1), new Date(2023, 5, 1)];
    c.setView(view);
    expect(c.getView().map(Number)).toEqual(view.map(Number));
    expectSelection(c, view, span(rows));
  });

  it('setView partly outside: the view and the brush clamp to the data', () => {
    const c = ts().setData(rows);
    const end = new Date(2023, 5, 1);
    c.setView([new Date(2021, 0, 1), end]);
    expect(c.getView().map(Number)).toEqual([+rows[0].date, +end]);
    expect(selection(c)[0]).toBe(0);
    expectSelection(c, [rows[0].date, end], span(rows));
    c.setView([new Date(2023, 8, 1), new Date(2026, 0, 1)]);
    expect(c.getView().map(Number)).toEqual([+new Date(2023, 8, 1), +rows.at(-1).date]);
    expect(selection(c)[1]).toBe(stripWidth(c));
  });

  it('setView fully outside: an empty window kept as asked — no line; the strip stays, its brush shut at the nearer edge', () => {
    const c = ts().setData(rows);
    const later = [new Date(2030, 0, 1), new Date(2030, 5, 1)];
    c.setView(later);
    expect(c.getView().map(Number)).toEqual(later.map(Number));
    expect(c.container.querySelector('path.rc-ts-line')).toBeNull();
    expect(strip(c).style.display).toBe('');
    expect(selection(c)).toEqual([stripWidth(c), stripWidth(c)]);
    c.setView([new Date(2010, 0, 1), new Date(2010, 5, 1)]);
    expect(selection(c)).toEqual([0, 0]);
  });

  it('setData keeps a free window the new data still covers, mapped onto the new strip', () => {
    const c = ts().setData(rows);
    const view = [new Date(2023, 2, 1), new Date(2023, 5, 1)];
    c.setView(view);
    const next = monthly(2022, 24);
    c.setData(next);
    expect(c.getView().map(Number)).toEqual(view.map(Number));
    expectSelection(c, view, span(next));
  });

  it('setData clamps a free window the new data covers in part', () => {
    const c = ts().setData(rows);
    const view = [new Date(2023, 2, 1), new Date(2023, 5, 1)];
    c.setView(view);
    const next = monthly(2023, 9, 3);                     // April to December
    c.setData(next);
    expect(c.getView().map(Number)).toEqual([+next[0].date, +view[1]]);
    expect(selection(c)[0]).toBe(0);
    expectSelection(c, [next[0].date, view[1]], span(next));
  });

  it('setData drops a free window the new data leaves behind: the brush spans the new strip', () => {
    const c = ts().setData(rows);
    c.setView([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    const next = monthly(2026);
    c.setData(next);
    expect(c.getView().map(Number)).toEqual(span(next).map(Number));
    expect(selection(c)).toEqual([0, stripWidth(c)]);
  });

  it('a selected timeframe re-applies to the new data and the brush follows', () => {
    const c = ts({ timeframes: ['3M', 'ALL'] }).setData(rows);
    c.setTimeframe('3M');
    const next = monthly(2026);
    c.setData(next);
    const end = next.at(-1).date, start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    expect(c.getView().map(Number)).toEqual([+start, +end]);
    expectSelection(c, [start, end], span(next));
    expect(selection(c)[1]).toBe(stripWidth(c));
    expect(activeButton(c)).toBe('3M');
  });
});

// ─── The timeframe buttons with the navigator ─────────────────────────────────

describe('TimeSeries navigator — the timeframe buttons', () => {
  const rows = monthly(2022, 24);
  const make = () => ts({ timeframes: ['3M', '1Y', 'ALL'] }).setData(rows);

  it('a button moves the brush to its window; ALL spans the strip', () => {
    const c = make();
    button(c, '3M').click();
    const end = rows.at(-1).date, start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    expect(activeButton(c)).toBe('3M');
    expectSelection(c, [start, end], span(rows));
    button(c, 'ALL').click();
    expect(activeButton(c)).toBe('ALL');
    expect(selection(c)).toEqual([0, stripWidth(c)]);
  });

  it('a drag on the strip sets the view, puts out the lit button and reports once, at the release', () => {
    const c = make();
    c.setTimeframe('1Y');
    const changed = vi.fn();
    c.onViewChange(changed);
    drag(c, 100, 200, 300);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toEqual(c.getView());
    expect(activeButton(c)).toBeNull();
    // the view (whole milliseconds) mapped back onto the strip
    expect(selection(c)[0]).toBeCloseTo(100, 6);
    expect(selection(c)[1]).toBeCloseTo(300, 6);
    const W = stripWidth(c), [t0, t1] = span(rows);
    expect(+c.getView()[0]).toBeCloseTo(+t0 + (100 / W) * (t1 - t0), -1);
    expect(+c.getView()[1]).toBeCloseTo(+t0 + (300 / W) * (t1 - t0), -1);
  });

  it('a drag over the whole strip lights ALL', () => {
    const c = make();
    c.setTimeframe('3M');
    drag(c, 0, 400, 5000);                                // past the end: d3 stops at the strip's edge
    expect(c.getView().map(Number)).toEqual(span(rows).map(Number));
    expect(activeButton(c)).toBe('ALL');
  });

  it('setView reports through onViewChange and the brush follows; { silent: true } only moves the brush', () => {
    const c = make();
    const changed = vi.fn();
    c.onViewChange(changed);
    const view = [new Date(2023, 0, 1), new Date(2023, 3, 1)];
    c.setView(view, { silent: true });
    expect(changed).not.toHaveBeenCalled();
    expectSelection(c, view, span(rows));
    c.setView([new Date(2023, 1, 1), new Date(2023, 4, 1)]);
    expect(changed).toHaveBeenCalledTimes(1);
    expectSelection(c, [new Date(2023, 1, 1), new Date(2023, 4, 1)], span(rows));
  });
});

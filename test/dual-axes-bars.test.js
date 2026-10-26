import { describe, it, expect } from 'vitest';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { mount, track } from './helpers.js';

// DualAxes bars: the X range is inset by half the widest bar or cluster, so
// the edge bars are drawn whole inside the clip (C-27); barWidth and
// series.barWidth in px (B-07); the space per date is the smallest gap between
// bar dates (N2); fill and opacity follow setData (N3).

const years = (n, f = i => i % 3 - 1) => Array.from({ length: n }, (_, i) => ({ date: `${2000 + i}-12-31`, value: f(i) }));
const bars  = c => [...c.container.querySelectorAll('rect.rc-dual-bar')].map(r => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width') }));
const clip  = c => { const r = c.container.querySelector('clipPath rect'); return [+r.getAttribute('x'), +r.getAttribute('x') + +r.getAttribute('width')]; };
const inside = c => { const [a, b] = clip(c); return bars(c).every(r => r.x >= a - 1e-6 && r.x + r.w <= b + 1e-6); };
const firstLineX = c => +c.container.querySelector('path.rc-dual-line').getAttribute('d').match(/^M([\d.]+)/)[1];
const setWidth = (el, w) => {
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w });
};
const combo = (n = 45) => [
  { name: 'Index', type: 'line', values: years(n, i => 100 + i) },
  { name: 'Change', type: 'bar', axis: 'y2', values: years(n) },
];
const dual = (o, data, host = mount(null)) => track(new DualAxes(host, { animate: false, ...o })).setData(data);

describe('DualAxes edge bars (C-27)', () => {
  it('the first and last bars are drawn whole, on the scale the line uses', () => {
    const c = dual({}, combo(), mount(null, { width: 900 }));
    expect(inside(c)).toBe(true);
    const [b0] = bars(c);
    expect(b0.x).toBeCloseTo(clip(c)[0], 5);                    // flush with the clip edge (xPad)
    expect(firstLineX(c)).toBeCloseTo(b0.x + b0.w / 2, 2);      // shared x: the line point is the bar centre
  });

  it('xPad is the gap between the plot edge and the first bar', () => {
    const c = dual({ xPad: 30 }, combo(10));
    expect(bars(c)[0].x).toBeCloseTo(30, 5);
    expect(inside(c)).toBe(true);
  });

  it('a line-only chart keeps its range', () => {
    expect(firstLineX(dual({}, [combo(10)[0]]))).toBeCloseTo(8, 6);
  });

  it('cluster: the outer series at the first and last dates are inside', () => {
    const d = combo(12)[1];
    const c = dual({ barGrouping: 'cluster' },
      [d, { ...d, name: 'Half', values: d.values.map(v => ({ ...v, value: v.value / 2 })) }]);
    expect(inside(c)).toBe(true);
  });

  it('after resize and in a window whose last bar sits at its end', () => {
    const el = mount(null, { width: 900 });
    const c = dual({}, combo(), el);
    setWidth(el, 420); c.render();
    expect(inside(c)).toBe(true);
    c.setView([new Date('2000-01-01'), new Date('2010-01-01')]);
    expect(bars(c)).toHaveLength(10);
    expect(inside(c)).toBe(true);
  });

  it('the crosshair answers over the whole first bar, plot padding included', () => {
    const c = dual({}, combo(10));
    const ov = c.container.querySelector('rect.rc-overlay');
    ov.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 2, clientY: 100 }));
    expect(c.container.querySelector('.rc-tooltip.is-visible')).not.toBeNull();
  });
});

describe('DualAxes barWidth (B-07)', () => {
  it('chart-level px width; overlap bars centred on their date', () => {
    const c = dual({ barWidth: 6 }, combo(10));
    bars(c).forEach(r => expect(r.w).toBe(6));
    expect(firstLineX(c)).toBeCloseTo(bars(c)[0].x + 3, 2);
  });

  it('series.barWidth overrides the chart; a cluster lays its bars side by side, centred on the date', () => {
    const d = combo(10)[1];
    const c = dual({ barWidth: 4, barGrouping: 'cluster' },
      [combo(10)[0], { ...d, name: 'A', barWidth: 10 }, { ...d, name: 'B' }]);
    const rs = bars(c);
    const a = rs.slice(0, 10), b = rs.slice(10);
    a.forEach(r => expect(r.w).toBe(10));
    b.forEach(r => expect(r.w).toBe(4));
    a.forEach((r, i) => expect(r.x + r.w).toBeCloseTo(b[i].x, 6));
    expect(firstLineX(c)).toBeCloseTo(a[0].x + 7, 2);          // the cluster (14px) is centred on the date
  });

  it('an invalid series.barWidth falls back to the chart barWidth', () => {
    const d = combo(10)[1];
    bars(dual({ barWidth: 5 }, [{ ...d, barWidth: -1 }])).forEach(r => expect(r.w).toBe(5));
  });

  it('without barWidth the width is barWidthRatio of the space per date', () => {
    const rs = bars(dual({}, combo(10)));
    const gap = (rs[1].x + rs[1].w / 2) - (rs[0].x + rs[0].w / 2);
    expect(rs[0].w).toBeCloseTo(gap * 0.65, 1);
  });

  it('too wide: overlap bars and a whole cluster are cut to the space per date', () => {
    const d = combo(10)[1];
    for (const o of [{}, { barGrouping: 'cluster' }]) {
      const c = dual({ barWidth: 1000, ...o }, o.barGrouping ? [d, { ...d, name: 'B' }] : [d]);
      const all = bars(c);
      const rs = all.slice(0, 10).map((r, i) => (o.barGrouping ? { x: r.x, w: r.w + all[10 + i].w } : r));
      for (let i = 1; i < rs.length; i++) expect(rs[i - 1].x + rs[i - 1].w).toBeLessThanOrEqual(rs[i].x + 1e-3);
      expect(inside(c)).toBe(true);
    }
  });

  it('irregular dates: bars no wider than the smallest gap between bar dates (N2)', () => {
    const c = dual({}, [{ name: 'b', type: 'bar', values: [
      { date: '2026-01-01', value: 3 }, { date: '2026-03-01', value: 3 },
      { date: '2026-03-02', value: 3 }, { date: '2026-05-01', value: 3 }] }]);
    const rs = bars(c);
    for (let i = 1; i < rs.length; i++) expect(rs[i - 1].x + rs[i - 1].w).toBeLessThanOrEqual(rs[i].x + 1e-6);
    expect(inside(c)).toBe(true);
  });

  it('holds through resize, new data and a new window', () => {
    const el = mount(null);
    const c = dual({ barWidth: 7 }, combo(20), el);
    setWidth(el, 500); c.render();
    bars(c).forEach(r => expect(r.w).toBe(7));
    c.setData(combo(8));
    bars(c).forEach(r => expect(r.w).toBe(7));
    c.setView([new Date('2002-01-01'), new Date('2006-01-01')]);
    bars(c).forEach(r => expect(r.w).toBe(7));
  });
});

describe('DualAxes bar fill (N3)', () => {
  it('a new series colour and barOpacity show after setData', () => {
    const d = combo(4)[1];
    const c = dual({}, [{ ...d, color: '#ff0000' }]);
    c.options.barOpacity = 0.6;                                 // as MultiChart mobileOptions does
    c.setData([{ ...d, color: '#00ff00' }]);
    const rects = [...c.container.querySelectorAll('rect.rc-dual-bar')];
    expect(rects.map(r => r.getAttribute('fill'))).toEqual(Array(4).fill('#00ff00'));
    rects.forEach(r => expect(r.getAttribute('opacity')).toBe('0.6'));
  });
});

describe('DualAxes barWidth — edge cases (step 5 review)', () => {
  const one = [{ name: 'b', type: 'bar', values: [{ date: '2026-01-01', value: 3 }] }];

  it('one date in view: an explicit barWidth is capped by the scale, not by 12px', () => {
    expect(bars(dual({ barWidth: 30 }, one)).map(b => b.w)).toEqual([30]);
    const pair = [...one, { name: 'c', type: 'bar', values: [{ date: '2026-01-01', value: 2 }] }];
    expect(bars(dual({ barWidth: 10, barGrouping: 'cluster' }, pair)).map(b => b.w)).toEqual([10, 10]);
  });

  it('without barWidth one date keeps the old 12px slot', () => {
    expect(bars(dual({}, one))[0].w).toBeCloseTo(Math.max(4, 12 * 0.65), 6);
  });

  it('a plot narrower than 2·xPad: widths are never negative', () => {
    const c = dual({ barWidth: 30 }, combo(4), mount(null, { width: 140 }));
    expect(bars(c).every(b => b.w >= 0)).toBe(true);
  });
});

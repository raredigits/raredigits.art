import { describe, it, expect } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track } from './helpers.js';

// barWidth on Bar (B-07): a px width in every mode — the thickness when
// horizontal, the whole column when stacked — centred where the default bar
// stood and capped at the space per category or date. In date mode the range
// is inset by half a bar, so the edge bars stay inside the plot (N1, the
// C-27 defect without a clip).

const geo = c => [...c.container.querySelectorAll('rect.rc-bar, rect.rc-bar-seg')].map(r => ({
  x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'),
}));
const cats   = [{ label: 'A', value: 3 }, { label: 'B', value: -2 }, { label: 'C', value: 5 }];
const months = n => Array.from({ length: n }, (_, i) => ({ date: new Date(2026, i, 1), value: i + 1 }));
const stacked = [
  { name: 'a', values: [{ label: 'Q1', value: 2 }, { label: 'Q2', value: 3 }] },
  { name: 'b', values: [{ label: 'Q1', value: 1 }, { label: 'Q2', value: 4 }] },
];
const setWidth = (el, w) => {
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w });
};
const bar = (o, data) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);

describe('Bar barWidth (B-07)', () => {
  it('vertical: px width, centred where the default bar was', () => {
    const plain = geo(bar({}, cats));
    const sized = geo(bar({ barWidth: 12 }, cats));
    sized.forEach((r, i) => {
      expect(r.w).toBe(12);
      expect(r.x + r.w / 2).toBeCloseTo(plain[i].x + plain[i].w / 2, 6);
      expect(r.h).toBeCloseTo(plain[i].h, 6);
    });
  });

  it('horizontal: barWidth is the thickness of the bar', () => {
    const o = { orientation: 'horizontal', height: 300 };
    const plain = geo(bar(o, cats));
    const sized = geo(bar({ ...o, barWidth: 10 }, cats));
    sized.forEach((r, i) => {
      expect(r.h).toBe(10);
      expect(r.y + r.h / 2).toBeCloseTo(plain[i].y + plain[i].h / 2, 6);
      expect(r.w).toBeCloseTo(plain[i].w, 6);                 // the length still encodes the value
    });
  });

  it('stacked: barWidth is the whole column, every segment shares it', () => {
    const plain = geo(bar({}, stacked));
    const v = geo(bar({ barWidth: 14 }, stacked));
    expect(v).toHaveLength(4);
    v.forEach((r, i) => {
      expect(r.w).toBe(14);
      expect(r.x + 7).toBeCloseTo(plain[i].x + plain[i].w / 2, 6);
    });
    const h = geo(bar({ barWidth: 14, orientation: 'horizontal', height: 300 }, stacked));
    expect(h).toHaveLength(4);
    h.forEach(r => expect(r.h).toBe(14));
  });

  it('a numeric string reads as px', () => {
    geo(bar({ barWidth: '12' }, cats)).forEach(r => expect(r.w).toBe(12));
  });

  it('dates: px width over barWidthRatio, without the 48px cap of the ratio', () => {
    geo(bar({ barWidth: 60, barWidthRatio: 0.2 }, months(3))).forEach(r => expect(r.w).toBe(60));
  });

  it('dates: the first and last bars stay inside the plot (N1)', () => {
    for (const o of [{}, { barWidth: 120 }]) {
      const c = bar(o, months(3));
      const rs = geo(c);
      const last = rs[rs.length - 1];
      expect(rs[0].x).toBeCloseTo(8, 6);                       // flush with the 8px padding
      expect(last.x + last.w).toBeLessThanOrEqual(c.width - 8 + 1e-6);
    }
  });

  it('too wide for the space per category or date: neighbours touch, never overlap', () => {
    const cat = geo(bar({ barWidth: 5000 }, cats));
    for (let i = 1; i < cat.length; i++) expect(cat[i - 1].x + cat[i - 1].w).toBeCloseTo(cat[i].x, 6);
    const c = bar({ barWidth: 5000 }, months(6));
    const t = geo(c);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].x + t[i - 1].w).toBeLessThanOrEqual(t[i].x + 1e-6);
    expect(t[0].x).toBeGreaterThanOrEqual(0);
    expect(t[t.length - 1].x + t[t.length - 1].w).toBeLessThanOrEqual(c.width + 1e-9);
  });

  it.each([0, -4, NaN, Infinity, null, '', 'wide', true])('barWidth %s is ignored', bad => {
    expect(geo(bar({ barWidth: bad }, cats))).toEqual(geo(bar({}, cats)));
    expect(geo(bar({ barWidth: bad }, months(4)))).toEqual(geo(bar({}, months(4))));
  });

  it('holds through resize, new data and a new window', () => {
    const el = mount(null);
    const c = track(new Bar(el, { animate: false, barWidth: 9 })).setData(months(12));
    setWidth(el, 500); c.render();
    geo(c).forEach(r => expect(r.w).toBe(9));
    c.setData(months(6));
    geo(c).forEach(r => expect(r.w).toBe(9));
    c.setView([new Date(2026, 1, 1), new Date(2026, 3, 1)]);
    const rs = geo(c);
    expect(rs).toHaveLength(3);
    rs.forEach(r => expect(r.w).toBe(9));
  });
});

describe('Bar barWidth — edge cases (step 5 review)', () => {
  const big = [{ label: 'A', value: 1000000 }, { label: 'B', value: 400000 }];
  const fills = c => [...c.container.querySelectorAll('.rc-bar-value')].map(t => t.getAttribute('fill'));

  it('horizontal: a value label taller than a thin bar stays outside, in the text colour', () => {
    const plain = bar({ orientation: 'horizontal', showValues: true }, big);
    expect(fills(plain)).toContain(plain.theme.bg);            // the long bar carries its label inside
    const thin = bar({ orientation: 'horizontal', showValues: true, barWidth: 4 }, big);
    expect(fills(thin).every(f => f === thin.theme.text)).toBe(true);
  });

  it('date mode: a plot narrower than 2·xPad draws no negative widths', () => {
    const c = track(new Bar(mount(null, { width: 75 }), { animate: false, barWidth: 30 })).setData(months(4));
    expect(geo(c).every(r => r.w >= 0)).toBe(true);
  });
});

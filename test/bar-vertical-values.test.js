// showValues on vertical bars (maintainer, 2026-11-17; from the 1.x list):
// above a positive bar, below a negative one, centred; the value axis grows
// so a label fits; labels that would sit closer than 8px show every second
// (third…) one. Categories and dates; not on stacked bars.
import { describe, it, expect } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track, setGeometry } from './helpers.js';

const cats = vals => vals.map((value, i) => ({ label: `C${i + 1}`, value }));
const dated = vals => vals.map((value, i) => ({ date: new Date(2026, 0, 1 + 7 * i), value }));
const bar = (o, data) => track(new Bar(mount(null), { animate: false, showValues: true, ...o })).setData(data);

const plot = c => c.container.querySelector('svg > g');
const rects = c => [...plot(c).querySelectorAll('rect.rc-bar')];
const values = c => [...plot(c).querySelectorAll('text.rc-bar-value')];
const num = (el, a) => +el.getAttribute(a);

describe('Bar showValues — vertical bars', () => {
  it('off by default: no labels', () => {
    const c = track(new Bar(mount(null), { animate: false })).setData(cats([10, 20]));
    expect(values(c)).toHaveLength(0);
  });

  it.each([['categories', cats], ['dates', dated]])('%s: one label per bar, centred above it, in the text colour', (_, make) => {
    const c = bar({}, make([1200, 3400, 560]));
    const r = rects(c), v = values(c);
    expect(v.map(t => t.textContent)).toEqual(['1,200', '3,400', '560']);
    v.forEach((t, i) => {
      expect(num(t, 'x')).toBeCloseTo(num(r[i], 'x') + num(r[i], 'width') / 2, 6);
      expect(num(t, 'y')).toBeCloseTo(num(r[i], 'y') - 6, 6);
      expect(t.getAttribute('text-anchor')).toBe('middle');
      expect(t.getAttribute('dy')).toBeNull();
      expect(t.getAttribute('fill')).toBe(c.theme.text);
    });
  });

  it('at the plot edges a label moves in just enough to stay inside', () => {
    setGeometry({ width: 375, height: 300, charWidth: 10 });
    const c = bar({ valueFormat: () => 'abcdefgh' }, cats(Array.from({ length: 12 }, (_, i) => i + 1)));   // 80px labels
    const xs = values(c).map(t => num(t, 'x'));
    const r = rects(c).at(-1);
    expect(num(r, 'x') + num(r, 'width') / 2).toBeGreaterThan(c.width - 40);   // the last bar's centre is nearer the edge
    expect(xs.at(-1)).toBeCloseTo(c.width - 40, 6);                            // its label ends at the edge
    expect(xs.every(x => x >= 40 - 1e-6 && x <= c.width - 40 + 1e-6)).toBe(true);
  });

  it('a negative bar has its label below it, hanging from the offset', () => {
    const c = bar({ valueOffset: 4 }, cats([30, -20]));
    const r = rects(c)[1], t = values(c)[1];
    expect(num(t, 'y')).toBeCloseTo(num(r, 'y') + num(r, 'height') + 4, 6);
    expect(t.getAttribute('dy')).toBe('0.71em');
  });

  it('the value axis grows so the label above the tallest bar (and below the deepest) fits in the plot', () => {
    const c = bar({}, cats([100, -100]));
    const [up, down] = rects(c);
    const need = 14 + 6;   // the line (14 without layout) and the offset
    expect(num(up, 'y')).toBeGreaterThanOrEqual(need - 0.5);
    expect(c.height - (num(down, 'y') + num(down, 'height'))).toBeGreaterThanOrEqual(need - 0.5);
    const plain = track(new Bar(mount(null), { animate: false })).setData(cats([100, -100]));
    expect(num(rects(plain)[0], 'y')).toBeLessThan(need - 0.5);   // without labels: 8% only
  });

  it('valueFormat writes the text, with the bar and its role', () => {
    const seen = [];
    const c = bar({ valueFormat: (d, info) => { seen.push(info); return `v${d.value}`; } }, cats([1, 2]));
    expect(values(c).map(t => t.textContent)).toEqual(['v1', 'v2']);
    expect(seen).toContainEqual({ label: 'C2', value: 2, color: c.theme.accent });
  });

  // Boxes as the chart sees them: 7px a character, a 14px line.
  const labelBox = t => {
    const w = t.textContent.length * 7, x = num(t, 'x'), y = num(t, 'y');
    const top = t.getAttribute('dy') ? y : y - 14;
    return { x0: x - w / 2, x1: x + w / 2, y0: top, y1: top + 14 };
  };
  const barBox = r => ({ x0: num(r, 'x'), x1: num(r, 'x') + num(r, 'width'), y0: num(r, 'y'), y1: num(r, 'y') + num(r, 'height') });
  const meet = (a, b, gx, gy) => a.x0 < b.x1 + gx && b.x0 < a.x1 + gx && a.y0 < b.y1 + gy && b.y0 < a.y1 + gy;
  const revenue = cats([84000, 91000, 78000, 105000, 112000, 98000, 87000, 119000, 134000, 128000, 141000, 156000]);

  it('on a narrow card the larger values keep their labels: none meets another label or another bar', () => {
    setGeometry({ width: 375, height: 300, charWidth: 7 });
    const c = bar({ barWidth: 18 }, revenue);
    const v = values(c), shown = v.map(t => t.textContent);
    expect(shown.length).toBeLessThan(12);
    expect(shown).toContain('156,000');                                   // the peak always
    const boxes = v.map(labelBox);
    boxes.forEach((b, i) => boxes.forEach((o, j) => { if (i < j) expect(meet(b, o, 6, 2)).toBe(false); }));
    const own = new Map(v.map(t => [t.textContent, t]));
    rects(c).forEach((r, i) => v.forEach(t => {
      if (t !== own.get(revenue[i].value.toLocaleString('en-US'))) expect(meet(labelBox(t), barBox(r), 0, 0)).toBe(false);
    }));
  });

  it('a label left out had a larger value in its way: the larger ones are placed first', () => {
    setGeometry({ width: 375, height: 300, charWidth: 7 });
    const c = bar({ barWidth: 18 }, revenue);
    const shown = new Set(values(c).map(t => t.textContent));
    // Nov (141k) sits next to Dec (156k), taller, whose bar its label would cross
    expect(shown.has('141,000')).toBe(false);
    // a local peak keeps its label: Sep (134k) between Aug (119k) and Oct (128k)
    expect(shown.has('134,000')).toBe(true);
  });

  it('labels side by side keep 6px between them; of two that meet, the larger value wins', () => {
    setGeometry({ width: 375, height: 300, charWidth: 7 });
    const flat = bar({ barWidth: 2 }, cats(Array(12).fill(100000)));   // equal bars: only labels can meet
    const boxes = values(flat).map(labelBox);
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes.length).toBeLessThan(12);
    boxes.forEach((b, i) => { if (i) expect(b.x0 - boxes[i - 1].x1).toBeGreaterThanOrEqual(6); });
    const zigzag = bar({ barWidth: 2 }, cats(Array.from({ length: 12 }, (_, i) => 1000 + (i % 2))));   // thin bars do not block
    expect(values(zigzag).map(t => t.textContent)).toEqual(Array(6).fill('1,001'));
  });

  it('a wide card shows every label', () => {
    setGeometry({ width: 1440, height: 300, charWidth: 7 });
    expect(values(bar({}, revenue))).toHaveLength(12);
  });

  it('setData redraws them: fewer bars, fewer labels; new values, new text', () => {
    const c = bar({}, cats([1, 2, 3]));
    c.setData(cats([7, 8]));
    expect(values(c).map(t => t.textContent)).toEqual(['7', '8']);
  });

  it('turned off and re-rendered, the labels go', () => {
    const c = bar({}, cats([1, 2]));
    c.options.showValues = false;
    c.render();
    expect(values(c)).toHaveLength(0);
  });

  it('stacked bars print none', () => {
    const c = bar({}, [{ name: 'A', values: [{ label: 'X', value: 3 }] }, { name: 'B', values: [{ label: 'X', value: 4 }] }]);
    expect(values(c)).toHaveLength(0);
  });

});

// C-41: the default value text kept a fraction's digits ("0" for 0.4)
describe('the default value text (C-41)', () => {
  it('separators, no decimals on a whole number, up to two on a fraction', () => {
    const c = bar({}, cats([0.4, 1234, 87000, 2.345]));
    expect(values(c).map(t => t.textContent).sort()).toEqual(['0.4', '1,234', '2.35', '87,000'].sort());
  });

  it('on horizontal bars too', () => {
    const c = track(new Bar(mount(null), { animate: false, showValues: true, orientation: 'horizontal' })).setData(cats([0.4, 1234]));
    expect([...c.container.querySelectorAll('text.rc-bar-value')].map(t => t.textContent).sort()).toEqual(['0.4', '1,234']);
  });
});

// Bar's axes (D-10). The value axis of the vertical modes is the shared
// renderAxisY, the vertical grid lines of the horizontal modes renderGridX;
// the category axis and the horizontal modes' value axis are Bar's own, one
// method each for all its modes. What a page sees: where each axis sits,
// which option hides which, how the labels are placed.
import { describe, it, expect } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track, setGeometry } from './helpers.js';

const cats = vals => vals.map((value, i) => ({ label: `C${i + 1}`, value }));
const dated = vals => vals.map((value, i) => ({ date: new Date(2026, 0, 1 + 7 * i), value }));
const stacked = [
  { name: 'A', values: [{ label: 'X', value: 30 }, { label: 'Y', value: 45 }, { label: 'Z', value: 12 }] },
  { name: 'B', values: [{ label: 'X', value: 20 }, { label: 'Y', value: 5 }] },
];
const bar = (o, data) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);

const plot = c => c.container.querySelector('svg > g');
const grid = c => plot(c).firstElementChild;
// the value axis is the last .rc-axis (the date mode's time axis is one too)
const valueAxis = c => [...plot(c).querySelectorAll(':scope > .rc-axis')].at(-1);
const catAxis = c => plot(c).querySelector(':scope > .rc-axis-cat');
const labels = g => [...g.querySelectorAll('.tick text')];
const tickAt = g => [...g.querySelectorAll('.tick')].map(n => n.getAttribute('transform'));

const vertical = {
  categorical: [{}, cats([30, -45, 12, 80])],
  dated:       [{}, dated([30, 45, 12, 80])],
  stacked:     [{}, stacked],
};
const horizontal = {
  categorical: [{ orientation: 'horizontal' }, cats([30, -25, 12, 80])],
  stacked:     [{ orientation: 'horizontal' }, stacked],
};

describe('Bar — the value axis', () => {
  it.each(Object.entries(vertical))('vertical, %s: on the right, labels 8px out as on Line, each anchored at its start', (_, [o, data]) => {
    const c = bar(o, data);
    const g = valueAxis(c);
    expect(g.getAttribute('transform')).toBe(`translate(${c.width},0)`);
    expect(labels(g).length).toBeGreaterThan(2);
    for (const t of labels(g)) {
      expect(t.getAttributeNames()).toEqual(['fill', 'x', 'dy', 'text-anchor']);
      expect([t.getAttribute('x'), t.getAttribute('text-anchor'), t.getAttribute('fill')]).toEqual(['8', 'start', c.theme.muted]);
    }
    expect(g.querySelectorAll('line')).toHaveLength(0);
    expect(g.querySelector('.domain')).toBeNull();
  });

  it.each(Object.entries(horizontal))('horizontal, %s: at the bottom, the end labels anchored inward', (_, [o, data]) => {
    const c = bar(o, data);
    const g = valueAxis(c);
    expect(g.getAttribute('transform')).toBe(`translate(0,${c.height})`);
    const anchors = labels(g).map(t => t.getAttribute('text-anchor'));
    expect(anchors.length).toBeGreaterThan(2);
    expect(anchors).toEqual(anchors.map((_, i) => (i === 0 ? 'start' : i === anchors.length - 1 ? 'end' : 'middle')));
    expect(labels(g).every(t => t.getAttribute('fill') === c.theme.muted && t.getAttribute('y') === '9')).toBe(true);
    expect(g.querySelectorAll('line')).toHaveLength(0);
    expect(g.querySelector('.domain')).toBeNull();
  });

  it('the format and the tick values given are the ones drawn', () => {
    const v = bar({ yTickValues: [0, 40, 80], yTickFormat: d => `v${d}` }, cats([30, 45, 80]));
    expect(labels(valueAxis(v)).map(t => t.textContent)).toEqual(['v0', 'v40', 'v80']);
    const h = bar({ orientation: 'horizontal', xTickValues: [0, 35, 70], xTickFormat: d => `h${d}` }, stacked);
    expect(labels(valueAxis(h)).map(t => t.textContent)).toEqual(['h0', 'h35', 'h70']);
  });
});

// The value axis of the vertical modes: zero, the data and 8% headroom, ticks
// inside, no rounding up (maintainer, 2026-11-17: "156 stretched to 200").
describe('Bar — the vertical value axis ends just above the tallest bar', () => {
  const ticks = c => labels(valueAxis(c)).map(t => t.textContent);
  const tallest = c => Math.min(...[...plot(c).querySelectorAll('.rc-bar')].map(r => +r.getAttribute('y')));

  it.each([
    ['categorical', cats([120000, 156000, 90000])],
    ['dated', dated([120000, 156000, 90000])],
  ])('%s: a top of 156k reads 0…150k, and the bar stands 8% of the span below the top', (_, data) => {
    const c = bar({}, data);
    expect(ticks(c)).toEqual(['0', '50k', '100k', '150k']);
    expect(tallest(c)).toBeCloseTo(c.height * (1 - 156 / 168.48), 1);
  });

  it('negative bars: the same headroom below zero (domain −62…112)', () => {
    const c = bar({}, cats([100, -50]));
    expect(ticks(c)).toEqual(['−50', '0', '50', '100']);
    const low = [...plot(c).querySelectorAll('.rc-bar')].map(r => +r.getAttribute('y') + +r.getAttribute('height'));
    expect(Math.max(...low)).toBeCloseTo(c.height * (112 + 50) / 174, 1);
  });

  it('explicit yTickValues widen the axis to reach them', () => {
    const c = bar({ yTickValues: [0, 100000, 200000, 300000] }, cats([120000, 156000]));
    expect(ticks(c)).toEqual(['0', '100k', '200k', '300k']);
    expect(tallest(c)).toBeCloseTo(c.height * (1 - 156 / 300), 1);
  });

  it('horizontal bars: the same 8% headroom past the longest bar (it was 10% of the value)', () => {
    const c = bar({ orientation: 'horizontal' }, cats([60, 100]));
    const widths = [...plot(c).querySelectorAll('.rc-bar')].map(r => +r.getAttribute('width'));
    expect(Math.max(...widths)).toBeCloseTo(c.width * 100 / 108, 1);
    const neg = bar({ orientation: 'horizontal' }, cats([100, -50]));
    const left = Math.min(...[...plot(neg).querySelectorAll('.rc-bar')].map(r => +r.getAttribute('x')));
    expect(left).toBeCloseTo(neg.width * 12 / 174, 1);          // domain −62…112
    const wide = bar({ orientation: 'horizontal', xTickValues: [0, 100, 200] }, cats([60, 100]));
    const w = [...plot(wide).querySelectorAll('.rc-bar')].map(r => +r.getAttribute('width'));
    expect(Math.max(...w)).toBeCloseTo(wide.width / 2, 1);       // explicit ticks widen it to 200
  });

  it('stacked bars keep their axis: the niced total in exactly yTicks intervals', () => {
    expect(ticks(bar({}, stacked))).toEqual(['0', '12.5', '25', '37.5', '50']);   // totals 50, 50, 12
  });
});

describe('Bar — the category axis', () => {
  it.each(['categorical', 'stacked'])('vertical, %s: at the bottom, no axis line', mode => {
    const c = bar(...vertical[mode]);
    const g = catAxis(c);
    expect(g.getAttribute('transform')).toBe(`translate(0,${c.height})`);
    expect(g.querySelector('.domain')).toBeNull();
    expect(labels(g).every(t => t.getAttribute('fill') === c.theme.muted)).toBe(true);
  });

  it.each(['categorical', 'stacked'])('horizontal, %s: on the left, no axis line', mode => {
    const c = bar(...horizontal[mode]);
    const g = catAxis(c);
    expect(g.getAttribute('transform')).toBe('translate(0,0)');
    expect(g.querySelector('.domain')).toBeNull();
    expect(labels(g).every(t => t.getAttribute('fill') === c.theme.muted)).toBe(true);
  });
});

// Category labels closer than 8px to a neighbour: every second (third…) one
// is shown, as on the time axis (maintainer, 2026-11-17). 12 months of 3
// characters at 8.4px each are 25.2px wide, as the docs' Bar at 375px.
describe('Bar — the category axis at the bottom thins labels that would collide', () => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = MONTHS.map((label, i) => ({ label, value: 10 + i }));
  const monthsStacked = [{ name: 'A', values: months }, { name: 'B', values: months }];
  const hidden = g => labels(g).filter(t => t.getAttribute('display') === 'none').map(t => t.textContent);
  const at = (width, o, data) => { setGeometry({ width, height: 300, charWidth: 8.4 }); return bar(o, data); };

  it.each([['categorical', {}, months], ['stacked', {}, monthsStacked]])('vertical, %s, on a phone: every second month, from January', (_, o, data) => {
    const c = at(375, o, data);
    expect(hidden(catAxis(c))).toEqual(['Feb', 'Apr', 'Jun', 'Aug', 'Oct', 'Dec']);
    expect(catAxis(c).querySelectorAll('.tick')).toHaveLength(12);
  });

  it('on a wide card every month shows', () => {
    expect(hidden(catAxis(at(1440, {}, months)))).toEqual([]);
  });

  it('new data that fits shows every label again', () => {
    const c = at(375, {}, months);
    c.setData(months.slice(0, 4));
    expect(hidden(catAxis(c))).toEqual([]);
  });

  it('horizontal bars: the categories on the left are not thinned', () => {
    const c = at(375, { orientation: 'horizontal' }, months);
    expect(hidden(catAxis(c))).toEqual([]);
  });
});

describe('Bar — showXAxis hides the axis at the bottom, showYAxis the one at the side', () => {
  const count = g => g.querySelectorAll('.tick').length;

  it.each(['categorical', 'stacked'])('vertical, %s', mode => {
    const [o, data] = vertical[mode];
    let c = bar({ ...o, showXAxis: false }, data);
    expect(catAxis(c).childElementCount).toBe(0);
    expect(count(valueAxis(c))).toBeGreaterThan(0);
    c = bar({ ...o, showYAxis: false }, data);
    expect(valueAxis(c).childElementCount).toBe(0);
    expect(count(catAxis(c))).toBeGreaterThan(0);
  });

  it.each(['categorical', 'stacked'])('horizontal, %s', mode => {
    const [o, data] = horizontal[mode];
    let c = bar({ ...o, showXAxis: false }, data);
    expect(valueAxis(c).childElementCount).toBe(0);
    expect(count(catAxis(c))).toBeGreaterThan(0);
    c = bar({ ...o, showYAxis: false }, data);
    expect(catAxis(c).childElementCount).toBe(0);
    expect(count(valueAxis(c))).toBeGreaterThan(0);
  });

  it('dated: showYAxis hides the value axis', () => {
    const c = bar({ showYAxis: false }, dated([30, 45, 12]));
    expect(valueAxis(c).childElementCount).toBe(0);
  });

  it('an axis hidden after a render is emptied', () => {
    const c = bar({ orientation: 'horizontal' }, cats([3, 4, 5]));
    expect(count(catAxis(c))).toBe(3);
    c.options.showYAxis = false;
    c.options.showXAxis = false;
    c.render();
    expect(catAxis(c).childElementCount).toBe(0);
    expect(valueAxis(c).childElementCount).toBe(0);
  });
});

describe('Bar — the grid of the horizontal modes', () => {
  it.each(Object.entries(horizontal))('%s: vertical lines up the plot, at the value ticks', (_, [o, data]) => {
    const c = bar(o, data);
    const g = grid(c);
    expect(g.getAttribute('transform')).toBe(`translate(0,${c.height})`);
    expect(tickAt(g)).toEqual(tickAt(valueAxis(c)));
    const lines = [...g.querySelectorAll('line')];
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.every(l => l.getAttribute('y2') === String(-c.height) && l.getAttribute('stroke') === c.theme.grid)).toBe(true);
    expect(g.querySelectorAll('text, .domain')).toHaveLength(0);
  });

  it('categorical: at the count xTicks asks for', () => {
    const c = bar({ orientation: 'horizontal', xTicks: 2 }, cats([30, -25, 12, 80]));
    expect(tickAt(grid(c))).toEqual(tickAt(valueAxis(c)));
    expect(tickAt(grid(c))).toHaveLength(2);
  });

  it('stacked: at the explicit tick values', () => {
    const c = bar({ orientation: 'horizontal', xTickValues: [0, 35, 70] }, stacked);
    expect(tickAt(grid(c))).toEqual(tickAt(valueAxis(c)));
    expect(tickAt(grid(c))).toHaveLength(3);
  });

  it('showGrid false draws none', () => {
    expect(grid(bar({ orientation: 'horizontal', showGrid: false }, cats([3, 4]))).childElementCount).toBe(0);
  });
});

// RC-075: the horizontal categorical grid drew x.ticks(4) whatever the labels said
describe('horizontal categorical Bar: the grid follows xTickValues (RC-075)', () => {
  it('one grid line per tick value, where the labels stand', () => {
    const c = bar({ orientation: 'horizontal', xTickValues: [0, 20, 60, 90] }, cats([90, 40]));
    const x = t => +/translate\(([-\d.e]+)/.exec(t)[1];
    const lines = tickAt(grid(c)).map(x);
    const at = tickAt(valueAxis(c)).map(x);
    expect(lines).toHaveLength(4);
    expect(lines).toEqual(at);
  });
});

// RC-077: the horizontal stacked value axis's last label ('100%') sits 1px in
describe('horizontal stacked: the last value label stays inside the svg (RC-077)', () => {
  it('the last label is anchored at its end and moved 1 px in; the others are not moved', () => {
    const c = bar({ orientation: 'horizontal', stackMode: 'percent' }, stacked);
    const texts = [...valueAxis(c).querySelectorAll('.tick text')];
    expect(texts.length).toBeGreaterThan(1);
    expect(texts.at(-1).getAttribute('text-anchor')).toBe('end');
    expect(texts.at(-1).getAttribute('dx')).toBe('-1');
    expect(texts.slice(0, -1).every(t => !t.hasAttribute('dx') || t.getAttribute('dx') !== '-1')).toBe(true);
  });
});

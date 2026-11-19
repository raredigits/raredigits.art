// Bar's interactive legend (the legend spec, §9.4; decisions 9, 17–19, 21):
// only the stacked mode has series. A hidden series leaves the stacks — the
// segments above close up, colours and categories stay — and the value axis
// follows the shown stacks; legendRescale: false keeps the axis of every
// series. 'percent' bars are shares of the shown total (each fills 100%),
// or with legendRescale: false of the whole bar (the top stays empty); the
// tooltip's total and percent take the same base. The auto legend is built
// once and updated in place, so a stacked setData keeps its element and the
// focus. The categorical and date modes list no series: a legend there is a
// caption. Read through the DOM and the public API only.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as d3 from 'd3';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { mount, track } from './helpers.js';

// The docs' stacked-revenue chart: totals 90, 97, 105, 119 → an axis to 120;
// without Services (the top series) 72, 77, 86, 97 → an axis to 100.
const Q = (...v) => v.map((value, i) => ({ label: `Q${i + 1}`, value }));
const REVENUE = [
  { name: 'Cloud',    values: Q(42, 48, 55, 63) },
  { name: 'Licenses', values: Q(30, 29, 31, 34) },
  { name: 'Services', values: Q(18, 20, 19, 22) },
];
const MONEY = v => '$' + v + 'M';
// One category: A 50, B 30, C 20 of 100.
const SHARES = [
  { name: 'A', values: [{ label: 'X', value: 50 }] },
  { name: 'B', values: [{ label: 'X', value: 30 }] },
  { name: 'C', values: [{ label: 'X', value: 20 }] },
];

const bar = (o = {}) => track(new Bar(mount(null, { width: 600, height: 400 }), { animate: false, height: 320, ...o }));
const valueTicks = c => [...c.container.querySelectorAll('.rc-axis .tick text')].map(t => t.textContent);
const catTicks = c => [...c.container.querySelectorAll('.rc-axis-cat .tick text')].map(t => t.textContent);
const segs = c => [...c.container.querySelectorAll('rect.rc-bar-seg')].map(r => ({
  fill: r.getAttribute('fill'),
  x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'),
}));
const rectAttrs = c => [...c.container.querySelectorAll('rect.rc-bar-seg')]
  .map(r => ['x', 'y', 'width', 'height', 'fill', 'opacity'].map(a => r.getAttribute(a)).join(' '));
const itemOf = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
const itemsOf = c => [...c.container.querySelectorAll('.rc-legend > *')];
const resetOf = c => c.container.querySelector('.rc-legend-reset');
const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
const doubleClick = node => {
  click(node, 1);
  click(node, 2);
  node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
};
const over = el => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
// The stack of one vertical column, as drawn: the share of the plot its top
// reaches (the bottom segment starts at the baseline, so its foot is y(0)).
const stackTop = c => {
  const s = segs(c);
  const base = Math.max(...s.map(r => r.y + r.h));
  return 1 - Math.min(...s.map(r => r.y)) / base;
};
const heightShares = c => {
  const s = segs(c);
  const base = Math.max(...s.map(r => r.y + r.h));
  return s.map(r => r.h / base);
};

afterEach(() => vi.useRealTimers());

// ─── A hidden series leaves the stacks ──────────────────────────────────────

describe('stacked Bar: a hidden series leaves the stacks and the axis follows', () => {
  it('hiding the top series: its segments go, the axis $0–120M becomes $0–100M, the others keep their colours', () => {
    const c = bar({ yTickFormat: MONEY }).setData(REVENUE);
    expect(valueTicks(c)).toEqual(['$0M', '$30M', '$60M', '$90M', '$120M']);
    const before = segs(c);
    expect(before).toHaveLength(12);
    click(itemOf(c, 'Services'));                       // Enter, Space, a script: at once
    expect(valueTicks(c)).toEqual(['$0M', '$25M', '$50M', '$75M', '$100M']);
    const after = segs(c);
    expect(after).toHaveLength(8);
    expect(after.map(s => s.fill)).toEqual(before.slice(0, 8).map(s => s.fill));
    expect(after.map(s => s.x)).toEqual(before.slice(0, 8).map(s => s.x));   // the columns stay
    expect(catTicks(c)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('legendRescale: false keeps the axis of every series ($120M)', () => {
    const c = bar({ yTickFormat: MONEY, legendRescale: false }).setData(REVENUE);
    click(itemOf(c, 'Services'));
    expect(segs(c)).toHaveLength(8);
    expect(valueTicks(c)).toEqual(['$0M', '$30M', '$60M', '$90M', '$120M']);
  });

  it('the segments above a hidden series close up; their colours stay', () => {
    const c = bar().setData(REVENUE);
    const [cloudQ1, , , , licQ1] = segs(c);
    expect(licQ1.y + licQ1.h).toBeCloseTo(cloudQ1.y, 6);   // Licenses sits on Cloud
    c.setSeriesVisible(['Licenses', 'Services']);
    const [licNow] = segs(c);
    expect(licNow.fill).toBe(licQ1.fill);
    expect(licNow.y + licNow.h).toBeCloseTo(cloudQ1.y + cloudQ1.h, 6);   // now on the baseline
  });

  it('a category with no shown value keeps its slot', () => {
    const data = [
      { name: 'A', values: [{ label: 'X', value: 4 }, { label: 'Y', value: 6 }] },
      { name: 'B', values: [{ label: 'Z', value: 5 }] },
    ];
    const c = bar().setData(data);
    const xs = segs(c).map(s => s.x);
    c.setSeriesVisible(['A']);
    expect(catTicks(c)).toEqual(['X', 'Y', 'Z']);
    expect(segs(c).map(s => s.x)).toEqual(xs.slice(0, 2));
  });

  it('hiding every series keeps the frame: no segment, the axis of all, the categories, Show all', () => {
    const c = bar({ yTickFormat: MONEY }).setData(REVENUE);
    c.setSeriesVisible([]);
    expect(segs(c)).toHaveLength(0);
    expect(valueTicks(c)).toEqual(['$0M', '$30M', '$60M', '$90M', '$120M']);
    expect(catTicks(c)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(resetOf(c).hidden).toBe(false);
    click(resetOf(c));
    expect(segs(c)).toHaveLength(12);
  });

  it('horizontal: the value axis at the bottom follows the shown stacks too', () => {
    const c = bar({ orientation: 'horizontal' }).setData(REVENUE);
    expect(valueTicks(c)).toEqual(['0', '30', '60', '90', '120']);
    click(itemOf(c, 'Services'));
    expect(valueTicks(c)).toEqual(['0', '25', '50', '75', '100']);
    const h = bar({ orientation: 'horizontal', legendRescale: false }).setData(REVENUE);
    click(itemOf(h, 'Services'));
    expect(valueTicks(h)).toEqual(['0', '30', '60', '90', '120']);
  });

  it('a redraw from the legend is at once even while the entry runs: the hidden segments are gone', () => {
    const c = track(new Bar(mount(null, { width: 600, height: 400 }), { height: 320 })).setData(REVENUE);
    c.setSeriesVisible(['Cloud']);
    expect(segs(c)).toHaveLength(4);
  });
});

// ─── 'percent' ───────────────────────────────────────────────────────────────

describe("stacked: 'percent' — the base of the shares", () => {
  it('by default the shown series fill the bar: shares of the shown total', () => {
    const c = bar({ stacked: 'percent' }).setData(SHARES);
    c.setSeriesVisible(['A', 'B']);
    expect(stackTop(c)).toBeCloseTo(1, 6);
    const [a, b] = heightShares(c);
    expect(a).toBeCloseTo(50 / 80, 6);
    expect(b).toBeCloseTo(30 / 80, 6);
    expect(valueTicks(c)).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });

  it('legendRescale: false: shares of the whole bar, so its top stays empty', () => {
    const c = bar({ stacked: 'percent', legendRescale: false }).setData(SHARES);
    c.setSeriesVisible(['A', 'B']);
    expect(stackTop(c)).toBeCloseTo(0.8, 6);
    const [a, b] = heightShares(c);
    expect(a).toBeCloseTo(0.5, 6);
    expect(b).toBeCloseTo(0.3, 6);
    expect(valueTicks(c)).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });

  it('with nothing hidden, legendRescale: false draws the very same bars', () => {
    const data = [
      { name: 'Renewables', values: [{ label: '2019', value: 22 }, { label: '2021', value: 29 }, { label: '2023', value: 38 }] },
      { name: 'Gas',        values: [{ label: '2019', value: 38 }, { label: '2021', value: 36 }, { label: '2023', value: 34 }] },
      { name: 'Coal',       values: [{ label: '2019', value: 40 }, { label: '2021', value: 35.1 }, { label: '2023', value: 28.3 }] },
    ];
    for (const orientation of ['vertical', 'horizontal']) {
      const on = bar({ stacked: 'percent', orientation }).setData(data);
      const off = bar({ stacked: 'percent', orientation, legendRescale: false }).setData(data);
      expect(rectAttrs(off)).toEqual(rectAttrs(on));
    }
  });

  it('horizontal: the stack ends at the right edge, or short of it with legendRescale: false', () => {
    const right = c => Math.max(...segs(c).map(r => r.x + r.w));
    for (const [legendRescale, share] of [[true, 1], [false, 0.7]]) {
      const c = bar({ stacked: 'percent', orientation: 'horizontal', legendRescale }).setData(SHARES);
      const full = right(c);
      c.setSeriesVisible(['A', 'C']);
      expect(right(c) / full).toBeCloseTo(share, 6);
    }
  });
});

// ─── The tooltip ────────────────────────────────────────────────────────────

describe('the segment tooltip: total and percent on the same base', () => {
  const seen = (o) => {
    const calls = [];
    const c = bar({ ...o, tooltipFormat: seg => { calls.push(seg); return 'x'; } }).setData(SHARES);
    c.setSeriesVisible(['A', 'B']);
    over(c.container.querySelector('rect.rc-bar-seg'));
    return calls.at(-1);
  };

  it('of the shown total by default, of the whole with legendRescale: false', () => {
    expect(seen({})).toMatchObject({ name: 'A', value: 50, total: 80, percent: 50 / 80 });
    expect(seen({ legendRescale: false })).toMatchObject({ name: 'A', value: 50, total: 100, percent: 0.5 });
    expect(seen({ stacked: 'percent' })).toMatchObject({ value: 50, total: 80, percent: 50 / 80 });
    expect(seen({ stacked: 'percent', legendRescale: false })).toMatchObject({ value: 50, total: 100, percent: 0.5 });
  });

  it('the default tooltip prints that percent', () => {
    const c = bar().setData(SHARES);
    c.setSeriesVisible(['A', 'B']);
    over(c.container.querySelector('rect.rc-bar-seg'));
    expect(c.container.querySelector('.rc-tooltip').textContent).toContain('62.5%');
    const w = bar({ legendRescale: false }).setData(SHARES);
    w.setSeriesVisible(['A', 'B']);
    over(w.container.querySelector('rect.rc-bar-seg'));
    expect(w.container.querySelector('.rc-tooltip').textContent).toContain('50.0%');
  });
});

// ─── The legend ─────────────────────────────────────────────────────────────

describe('the stacked legend', () => {
  it('the auto legend: one toggle per series, named by its series; Show all hidden while nothing is off', () => {
    const c = bar().setData([...REVENUE, { values: Q(1, 1, 1, 1) }]);
    expect(itemsOf(c).map(el => `${el.localName}:${el.dataset.key ?? '-'}:${el.getAttribute('aria-pressed') ?? '-'}:${el.textContent}`)).toEqual([
      'button:Cloud:true:Cloud', 'button:Licenses:true:Licenses', 'button:Services:true:Services',
      'button:Series 4:true:Series 4', 'button:-:-:Show all',
    ]);
    expect(c.container.querySelectorAll('.rc-legend-item')).toHaveLength(4);
    expect(resetOf(c).hidden).toBe(true);
    expect(c.options.legend.map(item => item.series)).toEqual(['Cloud', 'Licenses', 'Services', 'Series 4']);
    expect(c.container.querySelector('.rc-legend').getAttribute('role')).toBe('group');
  });

  it('a click hides at once and a second shows; a pointer click waits; a double click keeps only that series', () => {
    vi.useFakeTimers();
    const c = bar().setData(REVENUE);
    const fills = segs(c).map(s => s.fill);
    click(itemOf(c, 'Licenses'));
    expect(segs(c)).toHaveLength(8);
    expect(itemOf(c, 'Licenses').getAttribute('aria-pressed')).toBe('false');
    click(itemOf(c, 'Licenses'));
    expect(segs(c).map(s => s.fill)).toEqual(fills);
    click(itemOf(c, 'Cloud'), 1);
    expect(segs(c)).toHaveLength(12);                   // waits for a second click
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(segs(c)).toHaveLength(8);
    click(resetOf(c));
    doubleClick(itemOf(c, 'Services'));
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(segs(c).map(s => s.fill)).toEqual(fills.slice(8));   // Services alone, its colour
    doubleClick(itemOf(c, 'Services'));
    expect(segs(c)).toHaveLength(12);
  });

  it('onLegendToggle({ name, visible, visibleNames }) once the stacks are redrawn', () => {
    const calls = [];
    const c = bar({ onLegendToggle(info) { calls.push({ ...info, drawn: segs(this).length }); } }).setData(REVENUE);
    click(itemOf(c, 'Services'));
    click(resetOf(c));
    expect(calls).toEqual([
      { name: 'Services', visible: false, visibleNames: ['Cloud', 'Licenses'], drawn: 8 },
      { name: null, visible: true, visibleNames: ['Cloud', 'Licenses', 'Services'], drawn: 12 },
    ]);
  });

  it('setSeriesVisible: a list, null; it returns the chart and calls no onLegendToggle', () => {
    const onLegendToggle = vi.fn();
    const c = bar({ onLegendToggle }).setData(REVENUE);
    expect(c.setSeriesVisible(['Cloud'])).toBe(c);
    expect(segs(c)).toHaveLength(4);
    expect(itemsOf(c).map(el => el.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', null]);
    expect(c.setSeriesVisible(null)).toBe(c);
    expect(segs(c)).toHaveLength(12);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('a stacked setData keeps the header, the legend element, its items and the focus; a hidden series stays hidden, a new one shows', () => {
    const c = bar({ title: 'Revenue' }).setData(REVENUE);
    const header = c.container.querySelector('.rc-chart-header');
    const legend = c.container.querySelector('.rc-legend');
    const cloud = itemOf(c, 'Cloud');
    click(itemOf(c, 'Services'));
    cloud.focus();
    c.setData([...REVENUE, { name: 'Hardware', values: Q(5, 5, 5, 5) }]);
    expect(c.container.querySelector('.rc-chart-header')).toBe(header);
    expect(c.container.querySelector('.rc-legend')).toBe(legend);
    expect(itemOf(c, 'Cloud')).toBe(cloud);
    expect(document.activeElement).toBe(cloud);
    expect(itemsOf(c).map(el => el.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', 'true', null]);
    expect(segs(c)).toHaveLength(12);                   // Cloud, Licenses, Hardware
  });

  it('a hidden series that leaves the data is dropped from the auto legend and comes back hidden', () => {
    const c = bar().setData(REVENUE);
    click(itemOf(c, 'Services'));
    c.setData(REVENUE.slice(0, 2));
    expect(itemsOf(c).map(el => el.dataset.key ?? 'reset')).toEqual(['Cloud', 'Licenses', 'reset']);
    c.setData(REVENUE);
    expect(itemOf(c, 'Services').getAttribute('aria-pressed')).toBe('false');
    expect(segs(c)).toHaveLength(8);
  });

  it('a page legend maps by series name; legendInteractive: false keeps labels and leaves the hidden series out', () => {
    const legend = [{ label: 'Cloud' }, { label: 'On-premise licences', series: 'Licenses' }, { label: 'Services' }];
    const c = bar({ legend }).setData(REVENUE);
    expect(itemsOf(c).map(el => `${el.localName}:${el.dataset.key ?? '-'}`))
      .toEqual(['button:Cloud', 'button:Licenses', 'button:Services', 'button:-']);
    click(itemOf(c, 'Licenses'));
    expect(segs(c)).toHaveLength(8);
    const s = bar({ legend, legendInteractive: false }).setData(REVENUE).setSeriesVisible(['Cloud', 'Services']);
    expect(itemsOf(s).map(el => `${el.localName}:${el.lastElementChild.textContent}`))
      .toEqual(['div:Cloud', 'div:Services']);
    expect(segs(s)).toHaveLength(8);
  });

  it('a series named by a number is keyed by its string', () => {
    const c = bar().setData([
      { name: 2024, values: [{ label: 'X', value: 2 }] },
      { name: 2025, values: [{ label: 'X', value: 3 }] },
    ]);
    click(itemOf(c, '2024'));
    expect(segs(c)).toHaveLength(1);
    c.setSeriesVisible([2024]);
    expect(itemsOf(c).map(el => el.getAttribute('aria-pressed'))).toEqual(['true', 'false', null]);
    expect(segs(c)).toHaveLength(1);
  });

  it('the swatches keep the series colours, by place in the data', () => {
    const c = bar({ theme: { colors: ['#aa0000', '#00aa00', '#0000aa'] } }).setData(REVENUE);
    c.setSeriesVisible(['Services']);
    const colors = itemsOf(c).slice(0, 3).map(el => el.firstElementChild.style.getPropertyValue('--rc-swatch-color'));
    expect(colors).toEqual(['#aa0000', '#00aa00', '#0000aa']);
    expect(segs(c).map(s => s.fill)).toEqual(['#0000aa', '#0000aa', '#0000aa', '#0000aa']);
  });
});

// ─── The modes with one series ──────────────────────────────────────────────

describe('categorical and date bars: the legend is a caption', () => {
  let warn;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });

  it('categorical: labels, no group, no Show all, no warning; the bars stay', () => {
    const c = bar({ legend: [{ label: 'Revenue' }, { label: 'Series' }] })
      .setData([{ label: 'A', value: 3 }, { label: 'B', value: 5 }]);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['div', 'div']);
    expect(c.container.querySelector('.rc-legend').hasAttribute('role')).toBe(false);
    expect(c.setSeriesVisible([])).toBe(c);
    expect(c.container.querySelectorAll('rect.rc-bar')).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('dates: the same', () => {
    const c = bar({ legend: [{ label: 'Hash rate' }] })
      .setData([{ date: '2026-01-01', value: 3 }, { date: '2026-01-02', value: 5 }]);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['div']);
    expect(resetOf(c)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('stacked, then categorical: the auto legend turns into labels; back to stacked, the hidden series is still hidden', () => {
    const c = bar().setData(REVENUE);
    click(itemOf(c, 'Services'));
    c.setData([{ label: 'A', value: 3 }]);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['div', 'div', 'div']);
    c.setData(REVENUE);
    expect(itemOf(c, 'Services').getAttribute('aria-pressed')).toBe('false');
    expect(warn).not.toHaveBeenCalled();
  });
});

// ─── No new motion (decision 19) ────────────────────────────────────────────

describe('a legend redraw adds no motion', () => {
  // d3's clock by hand, as in entry-motion.test.js: performance.now is
  // replaced and d3.timerFlush() runs what is due.
  const D = 600;
  let base, clock;
  const settle = () => new Promise(r => setTimeout(r, 30));
  const at = async (ms) => { clock = base + ms; await settle(); d3.timerFlush(); };
  const opacities = c => [...c.container.querySelectorAll('rect.rc-bar-seg')].map(r => +r.getAttribute('opacity'));
  beforeEach(async () => {
    base = clock = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    await settle();
  });
  const moving = () => track(new Bar(mount(null, { width: 600, height: 400 }), { height: 320, duration: D, ease: 'linear' }));

  it('after the entry: a hide and a show land at once, where a still chart draws them', async () => {
    const c = moving().setData(REVENUE);
    await at(D + 100);
    c.setSeriesVisible(['Cloud', 'Licenses']);
    expect(rectAttrs(c)).toEqual(rectAttrs(bar().setData(REVENUE).setSeriesVisible(['Cloud', 'Licenses'])));
    c.setSeriesVisible(null);
    expect(rectAttrs(c)).toEqual(rectAttrs(bar().setData(REVENUE)));   // the shown segments at opacity 1
    await at(D + 400);
    expect(rectAttrs(c)).toEqual(rectAttrs(bar().setData(REVENUE)));   // and nothing moves later
  });

  it('during the entry: the fade carries on, it does not restart', async () => {
    const c = moving().setData(REVENUE);
    await at(D / 2);
    expect(opacities(c).every(o => Math.abs(o - 0.5) < 1e-6)).toBe(true);
    c.setSeriesVisible(['Cloud']);
    expect(opacities(c).every(o => Math.abs(o - 0.5) < 1e-6)).toBe(true);
    await at(D * 0.75);
    expect(opacities(c)).toHaveLength(4);
    expect(opacities(c).every(o => Math.abs(o - 0.75) < 1e-6)).toBe(true);
  });
});

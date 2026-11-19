// Donut and Pie: the interactive legend (the legend spec, §9.5; decisions 6,
// 9, 13, 14, 17, 19, 21, 22 and 28). A header legend item names its slice —
// `series`, else `id`, else its label — and toggles it; the ring closes over
// what is shown (legendRescale: false keeps the gaps), the total, the
// percents and the centre follow, colours stay with their slices, and a
// hidden slice leaves at once. Drilled in, the legend is a static key.
//
// The gestures themselves (the hide delay, double clicks, Show all, focus)
// are the builder's, tested in legend.test.js; the base glue (the hidden
// set, the event, the setters' core) in legend-chart.test.js. Here: what the
// ring draws, read from the DOM — slices, their fills and angles (the datum
// d3 binds), the centre, the labels, the tooltip — and the legend items.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as d3 from 'd3';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { mount, track, tooltipOf, setGeometry } from './helpers.js';

beforeEach(() => {
  setGeometry({ width: 800, height: 400, charWidth: 7 });
});

const PALETTE = ['#111111', '#222222', '#333333', '#444444'];
const ACCENT  = '#00aaff';
const theme   = { colors: PALETTE, accent: ACCENT };

const SLICES = [
  { label: 'Atlas', value: 40 },
  { label: 'Corsair', value: 30 },
  { label: 'Jeeves', value: 20 },
  { label: 'Other', value: 10 },
];
const legendOf = data => data.map(d => ({ label: d.label, type: 'bar' }));

const donut = (o = {}) => track(new Donut(mount(null), { animate: false, theme, legend: legendOf(SLICES), ...o }));

// The drawing
const slices  = c => [...c.container.querySelectorAll('.rc-donut-slice')];
const drawn   = c => slices(c).map(p => p.__data__.data.label);
const fills   = c => Object.fromEntries(slices(c).map(p => [p.__data__.data.label, p.getAttribute('fill')]));
const paths   = c => Object.fromEntries(slices(c).map(p => [p.__data__.data.label, p.getAttribute('d')]));
const sweep   = c => d3.sum(slices(c), p => p.__data__.endAngle - p.__data__.startAngle);
const centre  = c => c.container.querySelector('.rc-donut-center-value')?.textContent ?? null;
const labels  = c => [...c.container.querySelectorAll('.rc-donut-label')].map(t => t.textContent);
const percents = c => [...c.container.querySelectorAll('.rc-donut-label-pct')].map(t => t.textContent);

// The legend
const legendItems = c => [...c.container.querySelectorAll('.rc-legend .rc-legend-item')];
const itemOf  = (c, key) => c.container.querySelector(`.rc-legend [data-key="${key}"]`);
const resetOf = c => c.container.querySelector('.rc-legend-reset');
const shape   = c => legendItems(c).map(el => `${el.localName}:${el.dataset.key ?? '-'}:${el.getAttribute('aria-pressed') ?? '-'}`);
const swatches = c => legendItems(c).map(el => el.firstElementChild.style.getPropertyValue('--rc-swatch-color'));
const hover = (c, label) => slices(c).find(p => p.__data__.data.label === label)
  .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

// ─── Items and slices ────────────────────────────────────────────────────────

describe('Donut legend: items map to slices', () => {
  it('an item naming a slice by its label is a toggle keyed by that label, in the slice colour', () => {
    const c = donut().setData(SLICES);
    expect(shape(c)).toEqual(['button:Atlas:true', 'button:Corsair:true', 'button:Jeeves:true', 'button:Other:true']);
    expect(swatches(c)).toEqual(PALETTE);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('an id names the slice with that id, which keys it; `series` names a slice key; series: false is a caption', () => {
    const data = [{ id: 'x', label: 'A', value: 1 }, { id: 'y', label: 'A', value: 2 }, { label: 'B', value: 3 }];
    const c = donut({ legend: [
      { id: 'y', label: 'Second A' }, { label: 'First', series: 'x' }, { label: 'B', series: false }, { label: 'A' },
    ] }).setData(data);
    // the label 'A' names the first slice labelled A (K-22): x, a toggle above
    // already, so a label here in x's colour
    expect(shape(c)).toEqual(['button:y:true', 'button:x:true', 'div:-:-', 'div:-:-']);
    expect(swatches(c)).toEqual([PALETTE[1], PALETTE[0], c.theme.muted, PALETTE[0]]);
  });

  it('an item naming no slice warns once, while another maps; one naming a zero-valued slice stays a quiet label in grey', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = donut({ legend: [{ label: 'Atlas' }, { label: 'Atlsa' }, { label: 'Zero' }, { label: 'Missing', series: 'nope' }] })
      .setData([...SLICES, { label: 'Zero', value: 0 }]);
    c.render();
    expect(shape(c)).toEqual(['button:Atlas:true', 'div:-:-', 'div:-:-', 'div:-:-']);
    expect(swatches(c).slice(1)).toEqual([c.theme.muted, c.theme.muted, c.theme.muted]);
    expect(warn.mock.calls.map(args => args[0].match(/"([^"]+)"/)[1])).toEqual(['Atlsa', 'Missing']);
  });

  it('an item with no label, name or id names no slice, not even one without a label', () => {
    const c = donut({ legend: [{ type: 'band', color: '#888888' }, { label: 'Atlas' }] })
      .setData([{ value: 5 }, ...SLICES]);
    expect(shape(c)).toEqual(['div:-:-', 'button:Atlas:true']);
  });

  it('slices that repeat a label share its key: one toggle, and they hide together', () => {
    const c = donut({ legend: [{ label: 'A' }, { label: 'B' }] })
      .setData([{ label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'A', value: 3 }]);
    expect(shape(c)).toEqual(['button:A:true', 'button:B:true']);
    itemOf(c, 'A').click();
    expect(drawn(c)).toEqual(['B']);
  });
});

// ─── Hiding a slice ──────────────────────────────────────────────────────────

describe('Donut legend: a hidden slice leaves the ring', () => {
  it('a click hides the slice; every other slice keeps its fill and every swatch its colour', () => {
    const c = donut().setData(SLICES);
    const before = fills(c);
    itemOf(c, 'Atlas').click();
    expect(drawn(c)).toEqual(['Corsair', 'Jeeves', 'Other']);
    expect(fills(c)).toEqual({ Corsair: before.Corsair, Jeeves: before.Jeeves, Other: before.Other });
    expect(swatches(c)).toEqual(PALETTE);
    expect(shape(c)[0]).toBe('button:Atlas:false');
    expect(resetOf(c).hidden).toBe(false);
  });

  it('the ring closes over the shown slices; the centre total, the percents and the tooltip are theirs', () => {
    const c = donut({ showLabels: true, labelMinPct: 0, tooltipFormat: ({ label, percent }) => `${label} ${percent.toFixed(3)}` })
      .setData(SLICES);
    const full = sweep(c);
    expect(centre(c)).toBe('100');
    c.setSeriesVisible(['Corsair', 'Jeeves', 'Other']);
    expect(sweep(c)).toBeCloseTo(full, 9);
    expect(centre(c)).toBe('60');
    expect(labels(c)).toEqual(['Corsair', 'Jeeves', 'Other']);
    expect(percents(c)).toEqual(['50.0%', '33.3%', '16.7%']);
    hover(c, 'Corsair');
    expect(tooltipOf(c).textContent).toBe('Corsair 0.500');
  });

  it('legendRescale: false leaves the gap: the other slices keep their angles, the total and the percents stay of all', () => {
    const c = donut({ legendRescale: false, showLabels: true, labelMinPct: 0, tooltipFormat: ({ label, percent }) => `${label} ${percent.toFixed(3)}` })
      .setData(SLICES);
    const before = paths(c);
    const full = sweep(c);
    c.setSeriesVisible(['Corsair', 'Jeeves', 'Other']);
    expect(paths(c)).toEqual({ Corsair: before.Corsair, Jeeves: before.Jeeves, Other: before.Other });
    expect(sweep(c)).toBeLessThan(full * 0.65);
    expect(centre(c)).toBe('100');
    expect(percents(c)).toEqual(['30.0%', '20.0%', '10.0%']);
    hover(c, 'Corsair');
    expect(tooltipOf(c).textContent).toBe('Corsair 0.300');
  });

  it('centerText gets the slices the total is of: the shown ones, or all with legendRescale: false', () => {
    const seen = [];
    const centerText = (data, { value }) => { seen.push([data.map(d => d.label).join(','), value]); return 'x'; };
    donut({ centerText }).setData(SLICES).setSeriesVisible(['Atlas', 'Other']);
    donut({ centerText, legendRescale: false }).setData(SLICES).setSeriesVisible(['Atlas', 'Other']);
    expect(seen).toEqual([
      ['Atlas,Corsair,Jeeves,Other', 100], ['Atlas,Other', 50],
      ['Atlas,Corsair,Jeeves,Other', 100], ['Atlas,Corsair,Jeeves,Other', 100],
    ]);
  });

  it('the slice goes at once, with the animation on; a slice that leaves the data still sweeps out', () => {
    const c = track(new Donut(mount(null), { theme, legend: legendOf(SLICES) })).setData(SLICES);
    const atlas = slices(c)[0];
    itemOf(c, 'Atlas').click();
    expect(atlas.isConnected).toBe(false);
    expect(drawn(c)).toEqual(['Corsair', 'Jeeves', 'Other']);

    const d = track(new Donut(mount(null), { theme })).setData(SLICES);
    const leaving = slices(d)[0];
    d.setData(SLICES.slice(1));
    expect(leaving.isConnected).toBe(true);    // its exit sweep
  });

  it('hiding every slice: no ring, no centre, no labels; the legend keeps its colours; Show all brings them back', () => {
    const c = donut({ showLabels: true }).setData(SLICES);
    c.setSeriesVisible([]);
    expect(slices(c)).toEqual([]);
    expect(centre(c)).toBeNull();
    expect(labels(c)).toEqual([]);
    expect(swatches(c)).toEqual(PALETTE);
    expect(shape(c).every(s => s.endsWith(':false'))).toBe(true);
    resetOf(c).click();
    expect(drawn(c)).toEqual(['Atlas', 'Corsair', 'Jeeves', 'Other']);
    expect(centre(c)).toBe('100');
  });

  it('a legend change takes the tooltip down: the pointer has not moved, the numbers have', () => {
    const c = donut().setData(SLICES);
    hover(c, 'Corsair');
    expect(tooltipOf(c).classList.contains('is-visible')).toBe(true);
    itemOf(c, 'Corsair').click();
    expect(tooltipOf(c).classList.contains('is-visible')).toBe(false);
  });
});

// ─── The event, the setter, setData ─────────────────────────────────────────

describe('Donut legend: the event, setSeriesVisible and setData', () => {
  it('onLegendToggle: a click, a double click and Show all, with the slice keys shown', () => {
    const calls = [];
    const c = donut({ onLegendToggle: e => calls.push(e) }).setData(SLICES);
    itemOf(c, 'Jeeves').click();
    const dbl = itemOf(c, 'Corsair');
    dbl.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    dbl.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));
    expect(drawn(c)).toEqual(['Corsair']);
    resetOf(c).click();
    expect(calls).toEqual([
      { name: 'Jeeves', visible: false, visibleNames: ['Atlas', 'Corsair', 'Other'] },
      { name: 'Corsair', visible: true, visibleNames: ['Corsair'] },
      { name: null, visible: true, visibleNames: ['Atlas', 'Corsair', 'Jeeves', 'Other'] },
    ]);
  });

  it('setSeriesVisible takes slice keys (an id, else a label), returns the chart and calls no one; null shows all', () => {
    const onLegendToggle = vi.fn();
    const data = [{ id: 'a1', label: 'Atlas', value: 40 }, ...SLICES.slice(1)];
    const c = donut({ onLegendToggle });
    expect(c.setData(data).setSeriesVisible(['a1', 'Other'])).toBe(c);
    expect(drawn(c)).toEqual(['Atlas', 'Other']);
    expect(shape(c)).toEqual(['button:a1:true', 'button:Corsair:false', 'button:Jeeves:false', 'button:Other:true']);
    c.setSeriesVisible(null);
    expect(drawn(c)).toEqual(['Atlas', 'Corsair', 'Jeeves', 'Other']);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('Pie has it too', () => {
    const c = track(new Pie(mount(null), { animate: false, theme, legend: legendOf(SLICES) })).setData(SLICES);
    c.setSeriesVisible(['Jeeves']);
    expect(drawn(c)).toEqual(['Jeeves']);
    expect(sweep(c)).toBeCloseTo(2 * Math.PI, 9);   // the whole ring
  });

  it('a hidden slice stays hidden across setData, also while it is out of the data; a new slice comes in shown', () => {
    const c = donut().setData(SLICES);
    itemOf(c, 'Jeeves').click();
    c.setData(SLICES.filter(d => d.label !== 'Jeeves'));
    expect(shape(c)[2]).toBe('div:-:-');
    c.setData([...SLICES, { label: 'New', value: 5 }]);
    expect(drawn(c)).toEqual(['Atlas', 'Corsair', 'Other', 'New']);
    expect(shape(c)[2]).toBe('button:Jeeves:false');
  });

  it('legendInteractive: false: a static legend without the hidden slices', () => {
    const c = donut({ legendInteractive: false }).setData(SLICES).setSeriesVisible(['Atlas', 'Other']);
    expect(shape(c)).toEqual(['div:Atlas:-', 'div:Other:-']);
    expect(drawn(c)).toEqual(['Atlas', 'Other']);
    expect(resetOf(c)).toBeNull();
  });
});

// ─── Drill-down: a static key ────────────────────────────────────────────────

describe('Donut legend, drilled in: a static key (decision 28)', () => {
  const tree = {
    label: 'Root',
    children: [
      { label: 'P', children: [{ label: 'p1', value: 1 }, { label: 'p2', value: 2 }] },
      { label: 'Q', value: 3 },
    ],
  };

  it('items are labels in the colours of the level shown; nothing hides a slice there', () => {
    const c = donut({ legend: [{ label: 'P' }, { label: 'Q' }, { label: 'p2' }] }).setData(tree);
    expect(shape(c)).toEqual(['div:-:-', 'div:-:-', 'div:-:-']);
    expect(resetOf(c)).toBeNull();
    expect(swatches(c)).toEqual([PALETTE[0], PALETTE[1], c.theme.muted]);
    c.setSeriesVisible([]);
    expect(drawn(c)).toEqual(['P', 'Q']);
    c.drillTo('P');
    expect(swatches(c)).toEqual([c.theme.muted, c.theme.muted, PALETTE[1]]);
    expect(drawn(c)).toEqual(['p1', 'p2']);
  });

  it('a slice hidden in flat data comes back hidden when the data is flat again', () => {
    const c = donut().setData(SLICES).setSeriesVisible(['Atlas', 'Corsair', 'Jeeves']);
    c.setData(tree);
    expect(drawn(c)).toEqual(['P', 'Q']);
    c.setData(SLICES);
    expect(drawn(c)).toEqual(['Atlas', 'Corsair', 'Jeeves']);
  });

  it('the hidden set never reaches a level, even a key equal to a node\'s own id', () => {
    // a tree node's id is its label path, joined by U+001F (core/hierarchy.js)
    const c = donut().setData([{ id: 'Root\u001fQ', label: 'Q', value: 1 }, { label: 'X', value: 1 }])
      .setSeriesVisible(['X']);
    expect(drawn(c)).toEqual(['X']);
    c.setData(tree);
    expect(drawn(c)).toEqual(['P', 'Q']);
  });
});

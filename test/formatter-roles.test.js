// K-09 (step 7): one rule for formatter arguments, backward compatible.
// A formatter handed an object payload finds the role fields on it — label,
// value, date, color, percent, series, whichever apply. A formatter whose
// first argument is a number, a data row or a node keeps it and gets the
// role fields as its next argument (the second; Gauge's positional
// centerText(value, max, min) the fourth).
import { describe, it, expect } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { mount, track } from './helpers.js';

const move = (el, clientX = 400) =>
  el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 60 }));
const over = el => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
const enter = el => el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
const dates = values => values.map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));

// Every call of a formatter, its arguments as given.
const recorder = (ret = 'x') => {
  const calls = [];
  const fn = (...args) => { calls.push(args); return ret; };
  return { fn, calls };
};

describe('object payloads gain the role fields (K-09)', () => {
  it('Line: each point carries series (= name) next to value, color and date', () => {
    const tip = recorder('');
    const c = track(new Line(mount(null), { animate: false, tooltipFormat: tip.fn }))
      .setData([{ name: 'Revenue', color: '#123456', values: dates([1, 2, 3]) }]);
    move(c.container.querySelector('rect.rc-overlay'), 2000);
    expect(tip.calls).toHaveLength(1);
    const [payload, second] = tip.calls[0];
    expect(second).toBeUndefined();                     // one object, as before
    expect(payload.date).toBeInstanceOf(Date);
    expect(payload.points[0]).toMatchObject({ name: 'Revenue', series: 'Revenue', value: 3, color: '#123456' });
    expect(payload.points[0].fmt).toBeTypeOf('string');
  });

  it('DualAxes: the same point shape, with axis', () => {
    const tip = recorder('');
    const c = track(new DualAxes(mount(null), { animate: false, tooltipFormat: tip.fn })).setData([
      { name: 'Price', axis: 'y1', values: dates([1, 2, 3]) },
      { name: 'Volume', axis: 'y2', type: 'bar', values: dates([5, 6, 7]) },
    ]);
    move(c.container.querySelector('rect.rc-overlay'), 2000);
    const { points } = tip.calls.at(-1)[0];
    expect(points.map(p => [p.series, p.axis])).toEqual([['Price', 'y1'], ['Volume', 'y2']]);
  });

  it('Bar stacked: the segment carries label, series, color and percent', () => {
    const tip = recorder();
    const val = recorder('v');
    const c = track(new Bar(mount(null), { animate: false, tooltipFormat: tip.fn, theme: { colors: ['#aa0000', '#00aa00'] } }))
      .setData([
        { name: 'North', values: [{ label: 'Q1', value: 3 }] },
        { name: 'South', values: [{ label: 'Q1', value: 1 }] },
      ]);
    over(c.container.querySelector('rect.rc-bar-seg'));
    const [seg, second] = tip.calls[0];
    expect(second).toBeUndefined();
    expect(seg).toMatchObject({ i: 0, name: 'North', cat: 'Q1', value: 3, total: 4 });   // the old fields stay
    expect(seg).toMatchObject({ label: 'Q1', series: 'North', color: '#aa0000', percent: 0.75 });

    // valueFormat in the default stacked tooltip gets the same segment
    const d = track(new Bar(mount(null), { animate: false, valueFormat: val.fn }))
      .setData([{ name: 'North', values: [{ label: 'Q1', value: 3 }] }]);
    over(d.container.querySelector('rect.rc-bar-seg'));
    expect(val.calls[0][0]).toMatchObject({ label: 'Q1', series: 'North', percent: 1 });
  });

  it('Donut: the tooltip payload is the role object', () => {
    const tip = recorder();
    const c = track(new Donut(mount(null), { animate: false, tooltipFormat: tip.fn }))
      .setData([{ label: 'A', value: 3, color: '#111111' }, { label: 'B', value: 1 }]);
    over(c.container.querySelector('path.rc-donut-slice'));
    expect(tip.calls[0]).toEqual([{ label: 'A', value: 3, percent: 0.75, color: '#111111' }]);
  });

  it('Gauge: the tooltip payload gains color (the fill arc)', () => {
    const tip = recorder();
    const c = track(new Gauge(mount(null), { animate: false, color: '#ff0000', tooltipFormat: tip.fn })).setData(40);
    move(c.container.querySelector('.rc-gauge-arc path'));
    expect(tip.calls[0]).toEqual([{ value: 40, max: 100, min: 0, percent: 0.4, color: '#ff0000' }]);
  });

  it('Map: { feature, item } gains label, value and color', () => {
    const square = (id, name, x) => ({ type: 'Feature', id, properties: { name },
      geometry: { type: 'Polygon', coordinates: [[[x, 0], [x, 10], [x + 10, 10], [x + 10, 0], [x, 0]]] } });
    const geoData = { type: 'FeatureCollection', features: [square('AA', 'Alpha', 0), square('BB', 'Beta', 10)] };
    const tip = recorder();
    const c = track(new RareMap(mount(null), { geoData, matchFill: '#0000ff', defaultFill: '#eeeeee', tooltipFormat: tip.fn }))
      .setData([{ id: 'AA', value: 5, label: 'Alpha land' }]);
    c.container.querySelectorAll('.rc-map-feature').forEach(over);
    const [alpha, beta] = tip.calls.map(a => a[0]);
    expect(alpha.item).toEqual({ id: 'AA', value: 5, label: 'Alpha land' });
    expect(alpha).toMatchObject({ label: 'Alpha land', value: 5, color: '#0000ff' });
    expect(alpha.feature.id).toBe('AA');
    expect(beta).toMatchObject({ item: null, label: 'Beta', value: null, color: '#eeeeee' });
  });
});

describe('a number, row or node first — the role fields second (K-09)', () => {
  it('TimeSeries: tooltipFormat(row, { date, value, color })', () => {
    const tip = recorder('');
    const c = track(new TimeSeries(mount(null), { tooltipFormat: tip.fn, theme: { accent: '#abcdef' } }))
      .setData([{ date: '2026-01-01', value: 1, volume: 7 }, { date: '2026-01-02', value: 2, volume: 9 }]);
    move(c.container.querySelector('svg > g > rect'), 790);
    const [row, info] = tip.calls[0];
    expect(row).toMatchObject({ value: 2, volume: 9 });
    expect(info).toEqual({ date: row.date, value: 2, color: '#abcdef' });
  });

  it('Bar categories: tooltipFormat and valueFormat get (row, { label, value, color })', () => {
    const tip = recorder();
    const val = recorder('v');
    const c = track(new Bar(mount(null), {
      animate: false, orientation: 'horizontal', showValues: true, barColor: '#330033',
      tooltipFormat: tip.fn, valueFormat: val.fn,
    })).setData([{ label: 'A', value: 4, color: '#ff8800', note: 'n' }, { label: 'B', value: 2 }]);
    expect(val.calls.some(([row, info]) => row.note === 'n' && info.label === 'A' && info.color === '#ff8800')).toBe(true);
    expect(val.calls.some(([row, info]) => row.label === 'B' && info.color === '#330033' && info.value === 2)).toBe(true);
    over(c.container.querySelector('rect.rc-bar'));
    const [row, info] = tip.calls[0];
    expect(row).toMatchObject({ label: 'A', value: 4, note: 'n' });
    expect(info).toEqual({ label: 'A', value: 4, color: '#ff8800' });
  });

  it('Bar dates: the role fields are { date, value, color }', () => {
    const tip = recorder();
    const c = track(new Bar(mount(null), { animate: false, tooltipFormat: tip.fn })).setData(dates([1, 2]));
    over(c.container.querySelector('rect.rc-bar'));
    const [row, info] = tip.calls[0];
    expect(Object.keys(info).sort()).toEqual(['color', 'date', 'value']);
    expect(info.date).toBe(row.date);
  });

  it('HierarchicalBar: (node, { label, value, color, percent }) for valueFormat and tooltipFormat', () => {
    const tip = recorder();
    const val = recorder('v');
    const tree = { label: 'Root', value: 10, children: [{ label: 'A', value: 6, color: '#00ff00' }, { label: 'B', value: 4 }] };
    const c = track(new HierarchicalBar(mount(null), { animate: false, tooltipFormat: tip.fn, valueFormat: val.fn }))
      .setData(tree);
    const a = val.calls.find(([node]) => node.label === 'A');
    expect(a[0].children).toBeDefined();                 // still the tree node
    expect(a[1]).toEqual({ label: 'A', value: 6, color: '#00ff00', percent: 0.6 });
    const row = [...c.container.querySelectorAll('.rc-hbar-row')].find(g => g.textContent.includes('B'));
    enter(row);
    const [node, info] = tip.calls[0];
    expect(node.label).toBe('B');
    expect(info).toMatchObject({ label: 'B', value: 4, percent: 0.4 });
    expect(info.color).toBeTypeOf('string');
  });

  it('Donut: valueFormat and percentFormat get the slice, centerText the centre', () => {
    const val = recorder('v');
    const pct = recorder('p');
    const center = recorder('c');
    const c = track(new Donut(mount(null), {
      animate: false, showLabels: true, valueFormat: val.fn, percentFormat: pct.fn, centerText: center.fn, centerLabel: 'Sum',
    })).setData([{ label: 'A', value: 3 }, { label: 'B', value: 1 }]);
    expect(center.calls[0][0]).toHaveLength(2);         // the drawn items, as before
    expect(center.calls[0][1]).toEqual({ label: 'Sum', value: 4 });
    expect(pct.calls.find(([p]) => p === 0.75)[1]).toMatchObject({ label: 'A', value: 3, percent: 0.75 });
    over(c.container.querySelector('path.rc-donut-slice'));
    expect(val.calls.at(-1)).toEqual([3, expect.objectContaining({ label: 'A', value: 3, percent: 0.75 })]);
  });

  it('Donut: without centerText, valueFormat formats the total with the centre role', () => {
    const val = recorder('v');
    track(new Donut(mount(null), { animate: false, valueFormat: val.fn })).setData([{ label: 'A', value: 2 }, { label: 'B', value: 2 }]);
    expect(val.calls).toContainEqual([4, { label: 'Total', value: 4 }]);
  });

  it('Gauge: centerText(value, max, min, info) — the positional arguments stay first', () => {
    const center = recorder('c');
    track(new Gauge(mount(null), { animate: false, min: 10, max: 60, centerText: center.fn })).setData(35);
    expect(center.calls[0]).toEqual([35, 60, 10, expect.objectContaining({ value: 35, max: 60, min: 10, percent: 0.5 })]);
  });
});

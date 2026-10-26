import { describe, it, expect, vi } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track } from './helpers.js';

// Annotations on the time-series Bar (B-04). Dates are local, as in
// timeframes.test.js, so positions do not depend on the machine's timezone.
const M = m => new Date(2026, m - 1, 1);
const rows = [10, -5, 20, 15, 30, 25].map((value, i) => ({ date: M(i + 1), value }));
const ANN = [
  { date: M(3), label: 'Launch' },
  { from: M(2), to: M(4), label: 'Freeze' },
  { value: 20, label: 'Target' },
  { value: -5, label: 'Floor' },
  { yFrom: 15, yTo: 25, label: 'Band' },
];
const make = (o = {}) => track(new Bar(mount(null), { animate: false, annotations: ANN, ...o }));
const q   = (c, s) => [...c.container.querySelectorAll(s)];
const num = (el, a) => +el.getAttribute(a);
const bar = (c, m) => q(c, 'rect.rc-bar').find(r => +r.__data__.date === +M(m));
const mid = r => num(r, 'x') + num(r, 'width') / 2;
const top = r => num(r, 'y');
const bottom = r => num(r, 'y') + num(r, 'height');
const labels = c => q(c, '.rc-annotation-label, .rc-annotation-h-label').map(n => n.textContent).sort();
const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Bar (dates) — annotations on the time axis', () => {
  it('a point sits on its bar, a range runs between its bars, labels above the plot', () => {
    const c = make().setData(rows);
    const [line] = q(c, '.rc-annotation-line');
    expect(num(line, 'x1')).toBeCloseTo(mid(bar(c, 3)), 6);
    const [fill] = q(c, '.rc-annotation-range-fill');
    expect(num(fill, 'x')).toBeCloseTo(mid(bar(c, 2)), 6);
    expect(num(fill, 'x') + num(fill, 'width')).toBeCloseTo(mid(bar(c, 4)), 6);
    expect(num(fill, 'height')).toBe(c.height);
    expect(q(c, '.rc-annotation-range-edge')).toHaveLength(2);
    expect(labels(c)).toEqual(['Band', 'Floor', 'Freeze', 'Launch', 'Target']);
    // the vertical labels live in the room kept above the plot
    q(c, '.rc-annotation-label-g').forEach(g =>
      expect(+g.getAttribute('transform').match(/,(-?[\d.]+)\)/)[1]).toBeLessThan(0));
  });

  it('levels sit on the value axis — positive and negative', () => {
    const c = make().setData(rows);
    const [target, floor] = q(c, '.rc-annotation-h-line');
    expect(num(target, 'y1')).toBeCloseTo(top(bar(c, 3)), 6);        // 20
    expect(num(floor, 'y1')).toBeCloseTo(bottom(bar(c, 2)), 6);       // -5 hangs below zero
    const edges = q(c, '.rc-annotation-h-range-edge').map(e => num(e, 'y1'));
    expect(edges[0]).toBeCloseTo(top(bar(c, 4)), 6);                  // 15
    expect(edges[1]).toBeCloseTo(top(bar(c, 6)), 6);                  // 25
  });

  it('follows setView: a date outside the window goes, a range is cut to it', () => {
    const c = make().setData(rows);
    c.setView([new Date(2026, 2, 15), M(6)]);
    expect(q(c, '.rc-annotation-line')).toHaveLength(0);               // Mar 1 is outside
    const [fill] = q(c, '.rc-annotation-range-fill');
    expect(num(fill, 'x') + num(fill, 'width')).toBeCloseTo(mid(bar(c, 4)), 6);
    expect(q(c, '.rc-annotation-range-edge')).toHaveLength(1);         // only the real end
    expect(labels(c)).not.toContain('Launch');
  });

  it('follows new data: a level moves with the value scale', () => {
    const c = make().setData(rows);
    const before = num(q(c, '.rc-annotation-h-line')[0], 'y1');
    c.setData(rows.map(d => (+d.date === +M(5) ? { ...d, value: 90 } : d)));
    const after = num(q(c, '.rc-annotation-h-line')[0], 'y1');
    expect(after).not.toBeCloseTo(before, 3);
    expect(after).toBeCloseTo(top(bar(c, 3)), 6);
  });

  it('an empty window and empty data clear them; data brings them back', () => {
    const c = make().setData(rows);
    c.setView([new Date(2026, 0, 5), new Date(2026, 0, 20)]);
    expect(q(c, '.rc-annotations *')).toHaveLength(0);
    c.setView(null);
    expect(q(c, '.rc-annotations *').length).toBeGreaterThan(0);
    c.setData([]);
    expect(q(c, '.rc-annotations *')).toHaveLength(0);
    c.setData(rows);
    expect(labels(c)).toHaveLength(5);
  });

  it('a level off the value scale is skipped; a band is cut at the plot edge with its real edge only', () => {
    // Levels never widen the domain: a target above the tallest bar is not shown.
    const c = track(new Bar(mount(null), { animate: false,
      annotations: [{ value: 1000, label: 'Far' }, { yFrom: 25, yTo: 1000, label: 'Up' },
        { yFrom: 500, yTo: 900, label: 'Away' }] })).setData(rows);
    expect(q(c, '.rc-annotation-h-line')).toHaveLength(0);
    const fills = q(c, '.rc-annotation-h-range-fill');
    expect(fills).toHaveLength(1);
    expect(num(fills[0], 'y')).toBe(0);
    expect(q(c, '.rc-annotation-h-range-edge')).toHaveLength(1);
    expect(labels(c)).toEqual(['Up']);
  });

  it('lets the pointer through to the bars', () => {
    const c = make().setData(rows);
    const layer = c.container.querySelector('.rc-annotations');
    expect(layer.getAttribute('pointer-events')).toBe('none');
    // between the bars and the axes
    const order = [...layer.parentNode.children];
    expect(order.indexOf(layer)).toBeGreaterThan(order.indexOf(bar(c, 1).parentNode));
  });
});

describe('Bar — annotations outside the date mode', () => {
  const cats = [{ label: 'A', value: 3 }, { label: 'B', value: 5 }];
  const stacked = [{ name: 's', values: cats }];
  // Horizontal bars take categories: dated rows there have no date axis and
  // warn on their own (bars-contracts.test.js).
  it.each([
    ['categorical', {}, cats],
    ['stacked', {}, stacked],
    ['horizontal', { orientation: 'horizontal' }, cats],
  ])('%s: not drawn, one warning that names the mode — none without annotations', (mode, o, data) => {
    const warn = silence();
    track(new Bar(mount(null), { animate: false, ...o })).setData(data);
    expect(warn).not.toHaveBeenCalled();
    const c = make(o).setData(data);
    c.render();
    expect(q(c, '.rc-annotations *')).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(new RegExp(`^RareCharts\\.Bar: annotations .* ${mode} mode`));
  });

  it('switching from dates to categories clears them', () => {
    silence();
    const c = make().setData(rows);
    expect(q(c, '.rc-annotations *').length).toBeGreaterThan(0);
    c.setData(cats);
    expect(q(c, '.rc-annotations *')).toHaveLength(0);
  });
});

describe('Bar — room for annotation labels', () => {
  it('keeps room above the plot for vertical bars with annotations; an explicit margin.top wins', () => {
    const topOf = o => track(new Bar(mount(null), o)).margin.top;
    expect(topOf({ annotations: ANN })).toBe(26);
    expect(topOf({ annotations: ANN, annotationLabelHeight: 30 })).toBe(34);
    expect(topOf({})).toBe(12);
    expect(topOf({ annotations: ANN, margin: { top: 4 } })).toBe(4);
    expect(topOf({ annotations: ANN, orientation: 'horizontal' })).toBe(12);
  });
});

// Horizontal annotations keep to the value range, as vertical ones keep to
// the date window: nothing is drawn above or below the plot (B-04, shared by
// every chart that draws annotations).
describe('Horizontal annotations stay inside the plot', () => {
  const series = [10, 14, 12, 18].map((value, i) => ({ date: new Date(2026, i, 1), value }));
  const FAR = [{ value: 500, label: 'far' }, { value: -500, label: 'low' }, { value: 12, label: 'mid' },
    { yFrom: 15, yTo: 900, label: 'band' }, { yFrom: -900, yTo: -400, label: 'below' }];
  const inPlot = c => q(c, '.rc-annotation-h-line, .rc-annotation-h-range-edge')
    .map(l => num(l, 'y1')).every(y => y >= 0 && y <= c.height);
  const hLabels = c => q(c, '.rc-annotation-h-label').map(n => n.textContent).sort();

  describe.each([
    ['Line', o => new Line(mount(null), { animate: false, ...o }), series],
    ['DualAxes', o => new DualAxes(mount(null), { animate: false, ...o }), [{ name: 's', values: series }]],
    ['TimeSeries', o => new TimeSeries(mount(null), o), series],
  ])('%s', (_name, create, data) => {
    it('levels and bands off the value range are skipped; a band across an edge keeps only its real edge', () => {
      const c = track(create({ annotations: FAR })).setData(data);
      expect(inPlot(c)).toBe(true);
      expect(hLabels(c)).toEqual(['band', 'mid']);
      expect(q(c, '.rc-annotation-h-range-edge')).toHaveLength(1);
    });

    it('on a log scale, a band from below zero is cut at the bottom without a false edge', () => {
      const log = _name === 'DualAxes' ? { y1Scale: 'log' } : { yScale: 'log' };
      const c = track(create({ ...log, annotations: [{ value: 0, label: 'zero' }, { yFrom: -5, yTo: 12, label: 'low' }] }))
        .setData(data);
      expect(hLabels(c)).toEqual(['low']);
      const edges = q(c, '.rc-annotation-h-range-edge');
      expect(edges).toHaveLength(1);
      expect(num(edges[0], 'y1')).toBeGreaterThan(0);
      expect(num(edges[0], 'y1')).toBeLessThan(c.height);
    });
  });
});

describe('Levels span the plot, past the inset edge bars (C-27)', () => {
  const months = [10, 14, 12, 18].map((value, i) => ({ date: new Date(2026, i, 1), value }));
  const span = c => { const l = q(c, '.rc-annotation-h-line')[0]; return [num(l, 'x1'), num(l, 'x2')]; };

  it('DualAxes with bars: a level runs from xPad to the far xPad, not from bar centre to bar centre', () => {
    const c = track(new DualAxes(mount(null), { animate: false, annotations: [{ value: 12, label: 'mid' }] }))
      .setData([{ name: 'b', type: 'bar', values: months }, { name: 'l', values: months }]);
    expect(span(c)).toEqual([8, c.width - 8]);
  });

  it('Bar with dates: the same', () => {
    const c = track(new Bar(mount(null), { animate: false, annotations: [{ value: 12, label: 'mid' }] })).setData(months);
    expect(span(c)).toEqual([8, c.width - 8]);
  });
});

describe('Ranges on an inset scale reach the plot edge (step 5 review)', () => {
  it('Bar: a range from half a month before the first bar shades that bar whole', () => {
    const c = make({ annotations: [{ from: new Date(2025, 11, 16), to: new Date(2026, 1, 15), label: 'r' }] }).setData(rows);
    const fill = q(c, '.rc-annotation-range-fill')[0];
    const jan  = bar(c, 1);
    expect(num(fill, 'x')).toBeLessThanOrEqual(num(jan, 'x') + 1e-6);
    expect(q(c, '.rc-annotation-range-edge')).toHaveLength(1);   // the start lies past the plot: no false edge
  });
});

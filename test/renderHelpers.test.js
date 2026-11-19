import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { applySvgA11y, drawLineSeries, renderAxisY, renderGrid, renderGridX, thinBandLabels } from '../assets/charts/src/core/renderHelpers.js';
import { linePath, areaPath } from '../assets/charts/src/core/seriesPath.js';

function makeSvg() {
  return d3.create('svg');
}

describe('applySvgA11y', () => {
  it('sets role="img" and a label from title + subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { title: 'Revenue', subtitle: 'USD, 12 months' });
    expect(svg.attr('role')).toBe('img');
    expect(svg.attr('aria-label')).toBe('Revenue — USD, 12 months');
  });

  it('uses the title alone when there is no subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { title: 'Revenue' });
    expect(svg.attr('aria-label')).toBe('Revenue');
  });

  it('an explicit ariaLabel overrides title/subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { ariaLabel: 'Quarterly revenue chart', title: 'Revenue' });
    expect(svg.attr('aria-label')).toBe('Quarterly revenue chart');
  });

  it('falls back to "Chart" when there is no string slot', () => {
    const svg = makeSvg();
    applySvgA11y(svg, {});
    expect(svg.attr('aria-label')).toBe('Chart');
  });

  it('ignores non-string (HTMLElement) title/subtitle slots', () => {
    const svg = makeSvg();
    const el = document.createElement('div');
    applySvgA11y(svg, { title: el, subtitle: el });
    expect(svg.attr('aria-label')).toBe('Chart');
  });

  it('is a no-op when given no selection', () => {
    expect(() => applySvgA11y(null, { title: 'x' })).not.toThrow();
  });
});

describe('drawLineSeries (D-09: Line and DualAxes)', () => {
  const day = d => new Date(2026, 0, d);
  const vals = (...vs) => vs.map((value, i) => ({ date: day(i + 1), value }));
  const x  = d3.scaleTime().domain([day(1), day(3)]).range([0, 200]);
  const y1 = d3.scaleLinear().domain([0, 10]).range([100, 0]);
  const y2 = d3.scaleLinear().domain([-5, 5]).range([100, 0]);
  const base = {
    x, yFor: () => y1, curve: 'linear', tension: 0,
    area: false, areaOpacity: 0.12, areaBaseline: 'zero', dash: null, width: 2,
    classes: { area: 'rc-a', line: 'rc-l' }, timing: null,
  };
  const layer = () => d3.create('svg').append('g');
  const draw = (g, lines, opts = {}) => { drawLineSeries(g, lines, { ...base, ...opts }); return g; };
  const paths = (g, cls) => [...g.node().querySelectorAll(`path.${cls}`)];

  it('one line path per series, in its colour and width, with the shared linePath', () => {
    const a = { name: 'a', color: 'red', values: vals(1, 5, 2) };
    const b = { name: 'b', color: 'blue', strokeWidth: 1, curve: 'step', values: vals(3, 3, 9) };
    const g = draw(layer(), [a, b]);
    const [pa, pb] = paths(g, 'rc-l');
    expect(paths(g, 'rc-l')).toHaveLength(2);
    expect(pa.getAttribute('d')).toBe(linePath(a, x, y1, 'linear', 0));
    expect(pb.getAttribute('d')).toBe(linePath(b, x, y1, 'linear', 0));   // its own curve wins
    expect(pa.getAttribute('fill')).toBe('none');
    expect([pa.getAttribute('stroke'), pb.getAttribute('stroke')]).toEqual(['red', 'blue']);
    expect([pa.getAttribute('stroke-width'), pb.getAttribute('stroke-width')]).toEqual(['2', '1']);
  });

  it('the attributes come in a fixed order (the drawing is compared as text)', () => {
    const g = draw(layer(), [{ name: 'a', color: 'red', values: vals(1, 2) }], { dash: 'dashed', area: true });
    expect(paths(g, 'rc-a')[0].getAttributeNames()).toEqual(['class', 'd', 'fill', 'opacity']);
    expect(paths(g, 'rc-l')[0].getAttributeNames()).toEqual(['class', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'd']);
  });

  it('each series on its own scale (yFor)', () => {
    const a = { name: 'a', axis: 'y1', values: vals(1, 2) };
    const b = { name: 'b', axis: 'y2', values: vals(1, 2) };
    const g = draw(layer(), [a, b], { yFor: s => (s.axis === 'y2' ? y2 : y1), area: true });
    const [pa, pb] = paths(g, 'rc-l');
    expect(pb.getAttribute('d')).toBe(linePath(b, x, y2, 'linear', 0));
    expect(pb.getAttribute('d')).not.toBe(pa.getAttribute('d'));
    expect(paths(g, 'rc-a')[1].getAttribute('d')).toBe(areaPath(b, x, y2, 'linear', 'zero', 0));
  });

  it("areas: the chart value, a series' own area winning either way; drawn under the lines", () => {
    const on  = { name: 'on',  color: 'red', area: true, areaOpacity: 0.5, areaBaseline: 'min', values: vals(2, 4) };
    const off = { name: 'off', color: 'blue', area: false, values: vals(2, 4) };
    const dflt = { name: 'dflt', color: 'green', values: vals(2, 4) };
    // y2 runs −5…5: 'zero' and 'min' fill down to different levels
    let g = draw(layer(), [on, off, dflt], { area: false, yFor: () => y2 });
    expect(paths(g, 'rc-a').map(p => p.getAttribute('fill'))).toEqual(['red']);
    expect(paths(g, 'rc-a')[0].getAttribute('opacity')).toBe('0.5');
    expect(paths(g, 'rc-a')[0].getAttribute('d')).toBe(areaPath(on, x, y2, 'linear', 'zero', 0));
    g = draw(layer(), [on, off, dflt], { area: true, areaOpacity: 0.3, areaBaseline: 'min', yFor: () => y2 });
    expect(paths(g, 'rc-a').map(p => p.getAttribute('fill'))).toEqual(['red', 'green']);
    expect(paths(g, 'rc-a')[1].getAttribute('opacity')).toBe('0.3');
    expect(paths(g, 'rc-a')[1].getAttribute('d')).toBe(areaPath(dflt, x, y2, 'linear', 'min', 0));
    expect(areaPath(dflt, x, y2, 'linear', 'min', 0)).not.toBe(areaPath(dflt, x, y2, 'linear', 'zero', 0));
    // area: 'yes' is not true — only true turns the fill on
    expect(paths(draw(layer(), [{ ...dflt, area: 'yes' }]), 'rc-a')).toHaveLength(0);
    const kids = [...g.node().children].map(n => n.getAttribute('class'));
    expect(kids).toEqual(['rc-a', 'rc-a', 'rc-l', 'rc-l', 'rc-l']);
  });

  it('without an area class the fills are left to the caller (TimeSeries, RC-080)', () => {
    const g = layer();
    g.append('path').attr('class', 'own-fill');
    const a = { name: 'a', color: 'red', area: true, values: vals(1, 2) };
    drawLineSeries(g, [a], { ...base, area: true, classes: { line: 'rc-l' } });
    drawLineSeries(g, [a], { ...base, area: true, classes: { line: 'rc-l' } });
    const kids = [...g.node().children].map(n => n.getAttribute('class'));
    expect(kids).toEqual(['own-fill', 'rc-l']);
    expect(paths(g, 'rc-l')[0].getAttribute('d')).toBe(linePath(a, x, y1, 'linear', 0));
  });

  it('a dash pattern stays on its line; solid lines carry none once drawn', () => {
    const solid  = { name: 's', values: vals(1, 2) };
    const dashed = { name: 'd', strokeDash: 'dotted', values: vals(1, 2) };
    const g = draw(layer(), [solid, dashed], { dash: null });
    const [ps, pd] = paths(g, 'rc-l');
    expect(ps.hasAttribute('stroke-dasharray')).toBe(false);
    expect(pd.getAttribute('stroke-dasharray')).toBe('2,3');
    // the chart-level dash, a series' own winning
    const g2 = draw(layer(), [solid, dashed], { dash: 'dashed' });
    expect(paths(g2, 'rc-l').map(p => p.getAttribute('stroke-dasharray'))).toEqual(['6,4', '2,3']);
    expect(paths(draw(layer(), [{ ...solid, strokeDash: 'solid' }], { dash: 'dashed' }), 'rc-l')[0]
      .hasAttribute('stroke-dasharray')).toBe(false);
  });

  it('a solid line draws in on the timing given; a dashed one shows its pattern at once', () => {
    const proto = SVGElement.prototype;
    const saved = Object.getOwnPropertyDescriptor(proto, 'getTotalLength');
    Object.defineProperty(proto, 'getTotalLength', { configurable: true, value: () => 100 });
    try {
      const timing = { delay: 0, duration: 1000, ease: d3.easeLinear, eased: 0.25 };
      const g = draw(layer(), [{ name: 's', values: vals(1, 2) }, { name: 'd', strokeDash: 'dashed', values: vals(1, 2) }], { timing });
      const [ps, pd] = paths(g, 'rc-l');
      expect(ps.getAttribute('stroke-dasharray')).toBe('100 100');
      expect(ps.getAttribute('stroke-dashoffset')).toBe('75');
      expect(pd.getAttribute('stroke-dasharray')).toBe('6,4');
      expect(pd.hasAttribute('stroke-dashoffset')).toBe(false);
      // a line drawing in that turns dashed: the draw-in stops, its pattern shows
      draw(g, [{ name: 's', strokeDash: 'dotted', values: vals(1, 2) }], { timing });
      expect(ps.getAttribute('stroke-dasharray')).toBe('2,3');
      expect(ps.hasAttribute('stroke-dashoffset')).toBe(false);
      d3.select(ps).interrupt();
    } finally {
      Object.defineProperty(proto, 'getTotalLength', saved);
    }
  });

  it('joins by name: a redraw updates the same paths and removes the gone ones', () => {
    const g = layer();
    draw(g, [{ name: 'a', color: 'red', area: true, values: vals(1, 2) }, { name: 'b', values: vals(1, 2) }]);
    const [pa] = paths(g, 'rc-l');
    draw(g, [{ name: 'a', color: 'blue', values: vals(3, 4) }]);
    expect(paths(g, 'rc-l')).toHaveLength(1);
    expect(paths(g, 'rc-l')[0]).toBe(pa);
    expect(pa.getAttribute('stroke')).toBe('blue');
    expect(paths(g, 'rc-a')).toHaveLength(0);
    draw(g, []);
    expect(g.node().children).toHaveLength(0);
  });

  it('joins by name, not by place: a series keeps its path when the one before it goes', () => {
    const g = layer();
    draw(g, [{ name: 'a', color: 'red', values: vals(1, 2) }, { name: 'b', color: 'blue', values: vals(1, 2) }]);
    const pb = paths(g, 'rc-l')[1];
    draw(g, [{ name: 'b', color: 'blue', values: vals(1, 2) }]);
    expect(paths(g, 'rc-l')).toHaveLength(1);
    expect(paths(g, 'rc-l')[0]).toBe(pb);    // the same node, not an equal one
  });

  it('leaves paths of other classes in the layer alone', () => {
    const g = layer();
    g.append('path').attr('class', 'mine');
    draw(g, [{ name: 'a', values: vals(1, 2) }]);
    draw(g, []);
    expect(g.node().querySelectorAll('path.mine')).toHaveLength(1);
  });
});

describe('renderAxisY (D-10: one Y axis for both sides)', () => {
  const theme = { muted: '#777', border: '#bbb', grid: '#eee' };
  const y = d3.scaleLinear().domain([0, 100]).range([200, 0]);
  const axisG = (cls = 'rc-axis-y') => d3.create('svg').append('g').attr('class', cls);
  const draw = (opts = {}, g = axisG()) => { renderAxisY(g, y, { width: 300, theme, ...opts }); return g; };
  const labels = g => [...g.node().querySelectorAll('.tick text')];
  const texts = g => labels(g).map(n => n.textContent);
  const ticks = g => g.selectAll('.tick').data();
  const xs = g => labels(g).map(n => n.getAttribute('x'));

  it('right (the default): at the plot width, labels start past the axis', () => {
    const g = draw();
    expect(g.attr('transform')).toBe('translate(300,0)');
    expect(g.attr('text-anchor')).toBe('start');
    expect(labels(g).map(n => [n.getAttribute('text-anchor'), n.getAttribute('x')]))
      .toEqual(texts(g).map(() => ['start', '8']));
  });

  it('left: at x = 0 whatever the width, labels end before the axis', () => {
    const g = draw({ side: 'left' });
    expect(g.attr('transform')).toBe('translate(0,0)');
    expect(g.attr('text-anchor')).toBe('end');
    expect(labels(g).map(n => [n.getAttribute('text-anchor'), n.getAttribute('x')]))
      .toEqual(texts(g).map(() => ['end', '-8']));
    // any side but 'left' is the right one
    expect(draw({ side: 'middle' }).attr('transform')).toBe('translate(300,0)');
  });

  it('tick count: about `ticks` ticks, 4 by default', () => {
    expect(ticks(draw())).toEqual(y.ticks(4));
    expect(ticks(draw({ ticks: 10 }))).toEqual(y.ticks(10));
    expect(ticks(draw({ ticks: 2 }))).toEqual(y.ticks(2));
    expect(y.ticks(4)).not.toEqual(y.ticks(10));
  });

  it('explicit tick values win over the count; an empty list draws none', () => {
    expect(ticks(draw({ ticks: 10, tickValues: [5, 50, 95] }))).toEqual([5, 50, 95]);
    expect(ticks(draw({ tickValues: new Set([0, 100]) }))).toEqual([0, 100]);
    expect(labels(draw({ tickValues: [] }))).toHaveLength(0);
    // no values (null, or a falsy page option passed through): the count decides
    expect(ticks(draw({ ticks: 2, tickValues: null }))).toEqual(y.ticks(2));
    expect(ticks(draw({ ticks: 2, tickValues: false }))).toEqual(y.ticks(2));
  });

  it('labels: in the format given, the muted colour, the numeric font class', () => {
    const g = draw({ tickValues: [0, 50], tickFormat: v => `$${v}k` }, axisG('rc-axis-y1'));
    expect(texts(g)).toEqual(['$0k', '$50k']);
    expect(labels(g).map(n => n.getAttribute('fill'))).toEqual([theme.muted, theme.muted]);
    expect(g.attr('class')).toBe('rc-axis-y1 rc-axis');   // its own class kept
    // no format: the scale's own for the count asked
    const unit = axisG();
    renderAxisY(unit, d3.scaleLinear().domain([0, 1]).range([200, 0]), { ticks: 4, theme });
    expect(texts(unit)).toEqual(['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
  });

  it('no tick marks or grid lines; the axis line only when labelsOnly is false', () => {
    for (const side of ['right', 'left']) {
      const bare = draw({ side });
      expect(bare.node().querySelectorAll('line')).toHaveLength(0);
      expect(bare.node().querySelector('.domain')).toBeNull();
      const lined = draw({ side, labelsOnly: false });
      expect(lined.node().querySelectorAll('line')).toHaveLength(0);
      expect(lined.node().querySelector('.domain').getAttribute('stroke')).toBe(theme.border);
      // tickSize 0: a straight line, no outer ticks
      expect(lined.node().querySelector('.domain').getAttribute('d')).toBe('M0.5,200.5V0.5');
    }
  });

  it('padding: the gap between the axis and the labels', () => {
    expect(xs(draw({ padding: 12 })).every(x => x === '12')).toBe(true);
    expect(xs(draw({ side: 'left', padding: 3 })).every(x => x === '-3')).toBe(true);
  });

  it('each label carries its own anchor and x, after its fill and dy (one attribute order on every axis)', () => {
    expect(labels(draw())[0].getAttributeNames()).toEqual(['fill', 'x', 'dy', 'text-anchor']);
    expect(labels(draw()).every(t => t.getAttribute('text-anchor') === 'start')).toBe(true);
    expect(labels(draw({ side: 'left' })).every(t => t.getAttribute('text-anchor') === 'end')).toBe(true);
  });

  it('a redraw updates the same axis: new ticks, still no marks, the line gone with labelsOnly', () => {
    const g = draw({ labelsOnly: false, tickValues: [0, 50, 100] });
    draw({ tickValues: [25, 75], tickFormat: v => `v${v}` }, g);
    expect(texts(g)).toEqual(['v25', 'v75']);
    expect(g.node().querySelectorAll('line')).toHaveLength(0);
    expect(g.node().querySelector('.domain')).toBeNull();
    draw({ side: 'left' }, g);
    expect(g.attr('transform')).toBe('translate(0,0)');
    expect(labels(g)[0].getAttribute('text-anchor')).toBe('end');
  });
});

describe('renderGrid / renderGridX (D-10: grid lines on either axis)', () => {
  const theme = { grid: '#eee' };
  const layer = () => d3.create('svg').append('g');
  const lines = g => [...g.node().querySelectorAll('.tick line')];
  const ticks = g => g.selectAll('.tick').data();

  it('renderGrid: horizontal lines across the width at the Y ticks, nothing else', () => {
    const y = d3.scaleLinear().domain([0, 100]).range([200, 0]);
    const g = layer();
    renderGrid(g, y, 300, 10, theme);
    expect(ticks(g)).toEqual(y.ticks(10));
    expect(y.ticks(10)).not.toEqual(y.ticks(4));
    expect(lines(g).map(n => [n.getAttribute('x2'), n.getAttribute('stroke')]))
      .toEqual(y.ticks(10).map(() => ['300', theme.grid]));
    expect(g.node().querySelectorAll('text')).toHaveLength(0);
    expect(g.node().querySelector('.domain')).toBeNull();
    expect(g.attr('transform')).toBeNull();
    renderGrid(g, y, 300, 4, theme, [10, 90]);
    expect(ticks(g)).toEqual([10, 90]);
  });

  it('renderGridX: vertical lines up the height at the X ticks, from the bottom edge', () => {
    const x = d3.scaleLinear().domain([0, 1000]).range([0, 400]);
    const g = layer();
    renderGridX(g, x, 150, 10, theme);
    expect(g.attr('transform')).toBe('translate(0,150)');
    expect(ticks(g)).toEqual(x.ticks(10));
    expect(x.ticks(10)).not.toEqual(x.ticks(4));
    expect(lines(g).map(n => [n.getAttribute('y2'), n.getAttribute('stroke')]))
      .toEqual(x.ticks(10).map(() => ['-150', theme.grid]));
    expect(g.node().querySelectorAll('text')).toHaveLength(0);
    expect(g.node().querySelector('.domain')).toBeNull();
    // explicit positions win over the count; a redraw follows a new height
    renderGridX(g, x, 90, 10, theme, [250, 750]);
    expect(ticks(g)).toEqual([250, 750]);
    expect(g.attr('transform')).toBe('translate(0,90)');
    expect(lines(g).map(n => n.getAttribute('y2'))).toEqual(['-90', '-90']);
    renderGridX(g, x, 90, 2, theme, []);
    expect(lines(g)).toHaveLength(0);
    renderGridX(g, x, 90, 2, theme, false);   // no values: the count decides
    expect(ticks(g)).toEqual(x.ticks(2));
  });
});

// thinBandLabels: a categorical axis at the bottom shows every k-th label
// when neighbours would sit closer than 8px (the time axis's rule).
describe('thinBandLabels', () => {
  // A bottom band axis with labels of the given widths (getComputedTextLength).
  function bandAxis(widths, range = [0, 21.2 * widths.length]) {
    const scale = d3.scaleBand().domain(widths.map((_, i) => `c${i}`)).range(range);   // step = range / n
    const g = makeSvg().append('g').call(d3.axisBottom(scale).tickSize(0));
    g.selectAll('.tick text').nodes().forEach((t, i) => { t.getComputedTextLength = () => widths[i]; });
    return { g, scale };
  }
  const shown = g => g.selectAll('.tick text').nodes().map(t => t.getAttribute('display') !== 'none');

  it("12 months 21.2px apart (the docs' Bar at 375px): every second one, from the first", () => {
    const { g, scale } = bandAxis(Array(12).fill(25.2));
    expect(thinBandLabels(g, scale)).toBe(2);
    expect(shown(g)).toEqual([true, false, true, false, true, false, true, false, true, false, true, false]);
    expect(g.selectAll('.tick').size()).toBe(12);            // the ticks stay
  });

  it('labels that clear 8px are all shown', () => {
    const { g, scale } = bandAxis(Array(12).fill(13), [0, 21.2 * 12]);   // gaps 8.2px
    expect(thinBandLabels(g, scale)).toBe(1);
    expect(shown(g).every(Boolean)).toBe(true);
  });

  it('exactly 8px is enough; just under is not', () => {
    const step = 21.2;
    const at = w => { const { g, scale } = bandAxis(Array(6).fill(w), [0, step * 6]); return thinBandLabels(g, scale); };
    expect(at(step - 8)).toBe(1);
    expect(at(step - 7.9)).toBe(2);
  });

  it('the smallest k that clears every pair shown, wide neighbours included', () => {
    const { g, scale } = bandAxis([30, 30, 30, 30, 30, 30, 30], [0, 140]);   // step 20: k = 2 leaves 10px
    expect(thinBandLabels(g, scale, { minGap: 12 })).toBe(3);
    expect(shown(g)).toEqual([true, false, false, true, false, false, true]);
  });

  it('a later call starts afresh (a wider card shows them all again)', () => {
    const { g, scale } = bandAxis(Array(12).fill(25.2));
    thinBandLabels(g, scale);
    scale.range([0, 600]);
    g.call(d3.axisBottom(scale).tickSize(0));
    expect(thinBandLabels(g, scale)).toBe(1);
    expect(shown(g).every(Boolean)).toBe(true);
  });

  it('a DOM that measures nothing hides nothing; two labels are never thinned', () => {
    const none = bandAxis(Array(12).fill(0));
    expect(thinBandLabels(none.g, none.scale)).toBe(1);
    expect(shown(none.g).every(Boolean)).toBe(true);
    const two = bandAxis([200, 200]);
    expect(thinBandLabels(two.g, two.scale)).toBe(1);
  });
});

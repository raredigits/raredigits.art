import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { Crosshair } from '../assets/charts/src/core/Crosshair.js';
import { createTheme } from '../assets/charts/src/core/theme.js';

// D-09: core/Crosshair beyond what the chart tests reach — Crosshair.attach
// (the layer Line and DualAxes share) and the point crosshair TimeSeries
// draws through it ({ horizontal: true }): a vertical and a horizontal line
// through the point nearest the pointer, the tooltip at that point.

const theme = createTheme({ crosshair: '#123456' });
const fakeTooltip = () => ({ show: vi.fn(), hide: vi.fn() });
const day = d => new Date(2026, 0, d);
// jsdom has no layout: an SVG element's box is 0, so the pointer's x in the
// overlay is clientX
const move = (node, clientX) =>
  node.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 5 }));
const leave = node => node.dispatchEvent(new MouseEvent('mouseleave'));

function plot() {
  const svg = d3.select(document.body).append('svg');
  return svg.append('g');
}

describe('Crosshair.attach', () => {
  it('appends the crosshair group, then the transparent overlay that takes the pointer', () => {
    const g = plot();
    g.append('g').attr('class', 'before');
    const tip = fakeTooltip();
    const c = Crosshair.attach(g, tip, theme);
    expect(c).toBeInstanceOf(Crosshair);
    const kids = [...g.node().children];
    expect(kids.map(n => `${n.tagName}.${n.getAttribute('class')}`)).toEqual(['g.before', 'g.rc-crosshair', 'rect.rc-overlay']);
    const overlay = kids[2];
    expect(overlay.getAttributeNames()).toEqual(['class', 'fill', 'style']);
    expect(overlay.getAttribute('fill')).toBe('transparent');
    expect(overlay.style.pointerEvents).toBe('all');
    expect(kids[1].querySelector('line.rc-cross-line')).not.toBeNull();
    expect(kids[1].querySelector('g.rc-cross-dots')).not.toBeNull();
  });

  it('the crosshair it returns works that overlay', () => {
    const g = plot();
    const tip = fakeTooltip();
    const c = Crosshair.attach(g, tip, theme);
    const x = d3.scaleTime().domain([day(1), day(3)]).range([0, 200]);
    const y = d3.scaleLinear().domain([0, 10]).range([100, 0]);
    const s = { name: 'A', color: 'red', type: 'line', values: [1, 2, 3].map(i => ({ date: day(i), value: i })) };
    c.bind({ W: 200, H: 100, x, scaleFor: () => y, formatFor: (_s, v) => String(v), series: [s] });
    const overlay = g.select('rect.rc-overlay');
    expect([overlay.attr('width'), overlay.attr('height')]).toEqual(['200', '100']);
    move(overlay.node(), 100);
    expect(tip.show).toHaveBeenCalledTimes(1);
    expect(g.select('.rc-cross-line').attr('opacity')).toBe('1');
  });
});

describe('Crosshair { horizontal: true } — the point crosshair (TimeSeries)', () => {
  const W = 200, H = 100;
  const x = d3.scaleTime().domain([day(1), day(5)]).range([0, W]);   // a day is 50px
  const y = d3.scaleLinear().domain([0, 10]).range([H, 0]);
  const rows = [1, 2, 3, 4, 5].map(i => ({ date: day(i), value: i * 2, extra: `row${i}` }));

  function setup({ values = rows, enabled, overlayInG = true } = {}) {
    const g = plot();
    g.append('g').attr('class', 'axis');
    const host = overlayInG ? g : g.select(function () { return this.parentNode; });
    const overlay = host.append('rect').attr('fill', 'none').attr('pointer-events', 'all');
    const tip = fakeTooltip();
    const c = new Crosshair(g, overlay, tip, theme, { horizontal: true });
    const fmt = vi.fn(d => `<b>${d.extra}</b>`);
    const toCard = vi.fn((px, py) => [px + 1000, py + 2000]);
    const ctx = { W, H, x, scaleFor: () => y, series: [{ values }], tooltipFmt: fmt, toCard };
    if (enabled !== undefined) ctx.enabled = enabled;
    c.bind(ctx);
    const lines = [...g.node().querySelectorAll(':scope > line')];
    return { g, overlay: overlay.node(), tip, c, fmt, toCard, lines };
  }
  const at = l => ['x1', 'x2', 'y1', 'y2'].map(a => +l.getAttribute(a));

  it('two bare lines in the plot group, below the overlay; no dots', () => {
    const { g, overlay, lines } = setup();
    expect([...g.node().children].map(n => n.tagName)).toEqual(['g', 'line', 'line', 'rect']);
    expect(g.node().lastChild).toBe(overlay);
    expect(lines).toHaveLength(2);
    lines.forEach(l => expect(l.hasAttribute('class')).toBe(false));
    expect(g.node().querySelector('.rc-cross-dots')).toBeNull();
  });

  it('an overlay outside the group: the lines are appended to it', () => {
    const { g, lines } = setup({ overlayInG: false });
    expect([...g.node().children].map(n => n.tagName)).toEqual(['g', 'line', 'line']);
    expect(lines).toHaveLength(2);
  });

  it("bind sizes the overlay and styles the lines: 1px, dashed '3 3', the theme colour, hidden", () => {
    const { overlay, lines } = setup();
    expect([overlay.getAttribute('width'), overlay.getAttribute('height')]).toEqual(['200', '100']);
    lines.forEach(l => {
      expect(l.getAttributeNames()).toEqual(['style', 'stroke', 'stroke-width', 'stroke-dasharray']);
      expect(l.getAttribute('stroke')).toBe('#123456');
      expect(l.getAttribute('stroke-width')).toBe('1');
      expect(l.getAttribute('stroke-dasharray')).toBe('3 3');
      expect(l.style.opacity).toBe('0');
    });
  });

  it('a move: both lines through the nearest point, the tooltip at it with the row', () => {
    const { overlay, lines, tip, fmt, toCard } = setup();
    move(overlay, 60);                        // day 2.2 → day 2
    const [v, h] = lines;
    expect(at(v)).toEqual([50, 50, 0, H]);
    expect(at(h)).toEqual([0, W, 60, 60]);    // value 4 on 0..10 → 60px
    expect([v.style.opacity, h.style.opacity]).toEqual(['1', '1']);
    expect(fmt).toHaveBeenCalledWith(rows[1], []);   // no other series
    expect(fmt.mock.calls[0][0]).toBe(rows[1]);
    expect(toCard).toHaveBeenCalledWith(50, 60);
    expect(tip.show).toHaveBeenCalledWith(1050, 2060, '<b>row2</b>');
  });

  it('snaps to the nearer side; on a tie, the earlier point', () => {
    const { overlay, lines } = setup();
    move(overlay, 80);                        // day 2.6 → day 3
    expect(+lines[0].getAttribute('x1')).toBe(100);
    move(overlay, 75);                        // midway between day 2 and day 3
    expect(+lines[0].getAttribute('x1')).toBe(50);
  });

  it('past either end it holds the end point (no coverage check)', () => {
    const late = rows.slice(1, 3);             // days 2–3 only, the scale runs 1–5
    const { overlay, lines, tip } = setup({ values: late });
    move(overlay, 5);
    expect(+lines[0].getAttribute('x1')).toBe(50);
    move(overlay, 195);
    expect(+lines[0].getAttribute('x1')).toBe(100);
    expect(tip.show).toHaveBeenCalledTimes(2);
  });

  it('a single point answers everywhere', () => {
    const { overlay, lines, tip } = setup({ values: [rows[2]] });
    move(overlay, 0);
    expect(+lines[0].getAttribute('x1')).toBe(100);
    expect(tip.show).toHaveBeenCalledTimes(1);
  });

  it('leaving hides both lines and the tooltip', () => {
    const { overlay, lines, tip } = setup();
    move(overlay, 60);
    leave(overlay);
    expect(lines.map(l => l.style.opacity)).toEqual(['0', '0']);
    expect(tip.hide).toHaveBeenCalled();
  });

  it('no values or enabled: false: a move shows nothing', () => {
    for (const opts of [{ values: [] }, { enabled: false }]) {
      const { overlay, lines, tip, fmt } = setup(opts);
      move(overlay, 60);
      expect(lines.map(l => l.style.opacity)).toEqual(['0', '0']);
      expect(tip.show).not.toHaveBeenCalled();
      expect(fmt).not.toHaveBeenCalled();
    }
  });

  it('unbind hides and drops the handlers; a new bind reads the new series', () => {
    const { c, overlay, lines, tip, fmt, toCard } = setup();
    move(overlay, 60);
    c.unbind();
    expect(lines.map(l => l.style.opacity)).toEqual(['0', '0']);
    move(overlay, 60);
    expect(tip.show).toHaveBeenCalledTimes(1);

    const other = [{ date: day(4), value: 5 }];
    c.bind({ W, H, x, scaleFor: () => y, series: [{ values: other }], tooltipFmt: fmt, toCard });
    move(overlay, 10);
    expect(at(lines[0])).toEqual([150, 150, 0, H]);
    expect(at(lines[1])).toEqual([0, W, 50, 50]);
    expect(fmt).toHaveBeenLastCalledWith(other[0], []);
  });

  it('hide() leaves the line crosshair look alone (style, not attribute)', () => {
    const { c, lines } = setup();
    c.hide();
    lines.forEach(l => expect(l.hasAttribute('opacity')).toBe(false));
  });
});

// ─── The line crosshair (Line, DualAxes) and its hover tooltip (S-19) ──────

describe('Crosshair — the line crosshair and its tooltip (S-19)', () => {
  const x = d3.scaleTime().domain([day(1), day(5)]).range([0, 400]);
  const y = d3.scaleLinear().domain([0, 10]).range([100, 0]);
  const vals = (from, to, f) => d3.range(from, to + 1).map(i => ({ date: day(i), value: f(i) }));
  const setup = (series, extra = {}) => {
    const g = plot();
    const tip = fakeTooltip();
    const c = Crosshair.attach(g, tip, theme);
    c.bind({ W: 400, H: 100, x, scaleFor: () => y, formatFor: (_s, v) => `v${v}`, series, ...extra });
    return { g, tip, c, overlay: g.select('rect.rc-overlay').node() };
  };
  const line = { name: 'A', color: '#ff0000', type: 'line', values: vals(1, 5, i => i) };

  it('a move: the line at the pointer, a dot on each line series at the nearest point, the tooltip with the date and a row each', () => {
    const bar = { name: 'B', color: '#00ff00', type: 'bar', values: vals(1, 5, i => 2 * i) };
    const { g, tip, overlay } = setup([line, bar]);
    move(overlay, 190);                                   // nearest day 3 (x = 200)
    expect(g.select('.rc-cross-line').attr('x1')).toBe('190');
    const dots = g.selectAll('.rc-cross-dot').nodes();
    expect(dots).toHaveLength(1);                         // bars carry no dot
    expect([dots[0].getAttribute('cx'), dots[0].getAttribute('cy')]).toEqual(['200', String(y(3))]);
    expect(dots[0].getAttribute('fill')).toBe('#ff0000');
    const html = tip.show.mock.calls[0][2];
    const box = document.createElement('div');
    box.innerHTML = html;
    expect(box.textContent).toContain('Jan 03, 2026');
    expect([...box.querySelectorAll('.rc-tooltip-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()))
      .toEqual(['A v3', 'B v6']);
    expect(box.querySelector('.rc-tooltip-swatch--dot')).not.toBeNull();   // the bar's mark
  });

  it('a band reports its range and draws no dot; a dashed series shows a dashed mark', () => {
    const band = { name: 'Range', color: '#cccccc', type: 'band', values: vals(1, 5, i => i).map(d => ({ ...d, lower: d.value - 1, upper: d.value + 1 })) };
    const dashed = { ...line, name: 'Plan', strokeDash: 'dashed' };
    const { g, tip, overlay } = setup([band, dashed]);
    move(overlay, 300);                                   // day 4
    expect(g.selectAll('.rc-cross-dot').nodes().map(d => d.__data__.name)).toEqual(['Plan']);
    const box = document.createElement('div');
    box.innerHTML = tip.show.mock.calls[0][2];
    expect(box.textContent).toContain('v3 – v5');
    expect(box.querySelector('.rc-tooltip-swatch--band')).not.toBeNull();
    expect(box.querySelector('.rc-tooltip-swatch--dashed')).not.toBeNull();
  });

  it('a series that does not reach the date is left out; with none, the crosshair hides', () => {
    const late = { name: 'Late', color: '#0000ff', type: 'line', values: vals(4, 5, i => i) };
    const { g, tip, overlay } = setup([late]);
    move(overlay, 100);                                   // day 2: before the series starts
    expect(tip.show).not.toHaveBeenCalled();
    expect(tip.hide).toHaveBeenCalled();
    expect(g.select('.rc-cross-line').attr('opacity')).toBe('0');
    move(overlay, 400);
    expect(tip.show).toHaveBeenCalledTimes(1);
  });

  it('tooltipFormat gets the date and the points, with their role fields', () => {
    const tooltipFmt = vi.fn(() => 'custom');
    const { tip, overlay } = setup([line], { tooltipFmt });
    move(overlay, 0);
    expect(tooltipFmt).toHaveBeenCalledWith({
      date: day(1),
      points: [expect.objectContaining({ name: 'A', series: 'A', value: 1, color: '#ff0000', date: day(1), fmt: 'v1' })],
    });
    expect(tip.show.mock.calls[0][2]).toBe('custom');
  });

  it('enabled: false takes no pointer; leaving hides the line, the dots and the tooltip', () => {
    const off = setup([line], { enabled: false });
    move(off.overlay, 100);
    expect(off.tip.show).not.toHaveBeenCalled();
    const on = setup([line]);
    move(on.overlay, 100);
    leave(on.overlay);
    expect(on.g.select('.rc-cross-line').attr('opacity')).toBe('0');
    expect(on.g.select('.rc-cross-dot').attr('opacity')).toBe('0');
    expect(on.tip.hide).toHaveBeenCalled();
  });
});

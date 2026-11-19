import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { Line } from '../assets/charts/src/charts/Line.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { mount, track } from './helpers.js';

// RC-080, the visible half of D-09 (owner, 2026-11-17): TimeSeries keeps '$';
// its stroke and curve tension follow Line, and its line is drawn as Line's
// (drawLineSeries). The area — a gradient down to the plot's bottom — and
// the point crosshair stay its own.

const D = (y, m, d) => new Date(y, m - 1, d);
const daily = (from, days) => Array.from({ length: days }, (_, i) => {
  const date = new Date(from);
  date.setDate(date.getDate() + i);
  return { date, value: 100 + ((i * 7) % 13) };
});
const rows = daily(D(2025, 1, 1), 12);

const ts = (opts = {}) => track(new TimeSeries(mount(null), opts)).setData(rows);
const lineOf = c => c.container.querySelector('path.rc-ts-line');
const areaOf = c => c.container.querySelector('path.rc-ts-area');
// The paths the chart's own scales give for a curve
const linePathOf = (c, curve) => d3.line()
  .x(d => c.xScale(d.date)).y(d => c.yScale(d.value)).curve(curve)(rows);
const areaPathOf = (c, curve) => d3.area()
  .x(d => c.xScale(d.date)).y0(c.height).y1(d => c.yScale(d.value)).curve(curve)(rows);

describe('TimeSeries follows Line: stroke width (RC-080)', () => {
  it("a theme without a stroke width draws Line's default, 2", () => {
    const theme = { strokeWidth: undefined };
    const line = track(new Line(mount(null), { animate: false, theme })).setData(rows);
    expect(line.container.querySelector('path.rc-line').getAttribute('stroke-width')).toBe('2');
    expect(lineOf(ts({ theme })).getAttribute('stroke-width')).toBe('2');
    expect(lineOf(ts({ theme: { strokeWidth: null } })).getAttribute('stroke-width')).toBe('2');
  });

  it('the theme token still wins, and the default theme draws 2', () => {
    expect(lineOf(ts({ theme: { strokeWidth: 3.5 } })).getAttribute('stroke-width')).toBe('3.5');
    expect(lineOf(ts()).getAttribute('stroke-width')).toBe('2');
  });
});

describe('TimeSeries follows Line: curve tension (RC-080)', () => {
  it("curveTension shapes the cardinal on the line and the area alike, as on Line", () => {
    const c = ts({ curve: 'cardinal', curveTension: 0.8 });
    expect(lineOf(c).getAttribute('d')).toBe(linePathOf(c, d3.curveCardinal.tension(0.8)));
    expect(areaOf(c).getAttribute('d')).toBe(areaPathOf(c, d3.curveCardinal.tension(0.8)));
    expect(lineOf(c).getAttribute('d')).not.toBe(linePathOf(c, d3.curveCardinal.tension(0)));
  });

  it('without curveTension the cardinal keeps tension 0 (the default did not move)', () => {
    const c = ts({ curve: 'cardinal' });
    expect(lineOf(c).getAttribute('d')).toBe(linePathOf(c, d3.curveCardinal.tension(0)));
    expect(areaOf(c).getAttribute('d')).toBe(areaPathOf(c, d3.curveCardinal.tension(0)));
  });

  it('the default curve stays monotone; an explicit curve wins', () => {
    const dflt = ts();
    expect(lineOf(dflt).getAttribute('d')).toBe(linePathOf(dflt, d3.curveMonotoneX));
    const step = ts({ curve: 'step', curveTension: 0.8 });
    expect(lineOf(step).getAttribute('d')).toBe(linePathOf(step, d3.curveStep));
    expect(areaOf(step).getAttribute('d')).toBe(areaPathOf(step, d3.curveStep));
  });

  it('a name it does not know still draws monotone, on the line and the area', () => {
    for (const curve of ['smooth', 'toString']) {
      const c = ts({ curve });
      expect(lineOf(c).getAttribute('d')).toBe(linePathOf(c, d3.curveMonotoneX));
      expect(areaOf(c).getAttribute('d')).toBe(areaPathOf(c, d3.curveMonotoneX));
    }
  });
});

describe("TimeSeries draws its line as Line does, and keeps its own area (RC-080)", () => {
  it("the line carries drawLineSeries' attributes, in its order", () => {
    const p = lineOf(ts());
    expect(p.getAttributeNames()).toEqual(['class', 'fill', 'stroke', 'stroke-width', 'd']);
    expect(p.getAttribute('fill')).toBe('none');
    expect(p.getAttribute('stroke')).toBe(ts().theme.accent);
  });

  it('the area keeps its gradient and its bottom, under the one line, across re-renders', () => {
    const c = ts();
    c.setData(daily(D(2025, 2, 1), 12));
    c.render();
    const kids = [...lineOf(c).parentNode.children].map(n => n.getAttribute('class'));
    expect(kids).toEqual(['rc-ts-area', 'rc-ts-line']);
    expect(areaOf(c).getAttribute('fill')).toMatch(/^url\(#.+-ts-grad\)$/);
    expect(areaOf(c).getAttributeNames()).toEqual(['class', 'd', 'fill', 'fill-opacity']);
    const solid = ts({ area: 0.3 });
    expect(areaOf(solid).getAttribute('fill-opacity')).toBe('0.3');
    expect(areaOf(solid).getAttribute('d')).toBe(areaPathOf(solid, d3.curveMonotoneX));
  });

  it('area: false draws the line alone', () => {
    const c = ts({ area: false });
    expect(areaOf(c)).toBeNull();
    expect(lineOf(c).parentNode.children).toHaveLength(1);
  });
});

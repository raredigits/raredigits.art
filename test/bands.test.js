// RC-051: bands on TimeSeries (read from the rows) and DualAxes (a band
// series, as on Line). A chart without a band keeps its drawing.
import { describe, it, expect, beforeEach } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const day = i => new Date(2025, 0, 1 + i);
// value 100…109, edges 20 under and 50 over
const rows = Array.from({ length: 10 }, (_, i) => ({ date: day(i), value: 100 + i, lower: 80 + i, upper: 150 + i }));

const ts = (o = {}, data = rows) => track(new TimeSeries(mount(null), { yFormat: 'number', ...o })).setData(data);
const plot = c => c.container.querySelector(':scope > svg > g');
const paths = c => c.container.querySelector('svg g[clip-path] > g');
const ribbon = c => c.container.querySelector('g.rc-ts-band path.rc-band');
const hover = (c, date) => plot(c).querySelector(':scope > rect')
  .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY: 50 }));
const tipText = c => c.container.querySelector('.rc-tooltip').textContent.replace(/\s+/g, ' ');
const moves = d => (d.match(/M/g) ?? []).length;

describe('TimeSeries band (RC-051)', () => {
  it('without the option nothing changes: no band group', () => {
    const c = ts();
    expect(c.container.querySelector('.rc-ts-band')).toBeNull();
    expect(c.container.querySelector('.rc-band')).toBeNull();
  });

  it('band: true draws a ribbon from lower / upper, first in the plot (under the area and the line)', () => {
    const c = ts({ band: true });
    expect(ribbon(c)).not.toBeNull();
    expect(paths(c).firstElementChild.classList.contains('rc-ts-band')).toBe(true);
    expect(ribbon(c).getAttribute('opacity')).toBe('0.12');
    expect(moves(ribbon(c).getAttribute('d'))).toBe(1);
  });

  it('the Y axis fits both edges', () => {
    const c = ts({ band: true });
    const [lo, hi] = c.yScale.domain();
    expect(lo).toBeLessThanOrEqual(80);
    expect(hi).toBeGreaterThanOrEqual(159);
    const plain = ts();
    expect(plain.yScale.domain()[0]).toBeGreaterThan(80);
  });

  it('names its own fields, colour, opacity and name', () => {
    const data = rows.map(r => ({ date: r.date, value: r.value, p10: String(r.lower), p90: r.upper }));
    const c = ts({ band: { lower: 'p10', upper: 'p90', color: '#123456', fillOpacity: 0.3, name: 'P10–P90' } }, data);
    expect(ribbon(c).getAttribute('fill')).toBe('#123456');
    expect(ribbon(c).getAttribute('opacity')).toBe('0.3');
    expect(c._legendSeries().map(s => s.key)).toEqual(['Series', 'P10–P90']);
  });

  it('a row without both edges breaks the ribbon', () => {
    const data = rows.map((r, i) => (i === 5 ? { date: r.date, value: r.value } : r));
    const c = ts({ band: true }, data);
    expect(moves(ribbon(c).getAttribute('d'))).toBe(2);
  });

  it('the default tooltip adds the range; tooltipFormat gets info.band', () => {
    const c = ts({ band: true });
    hover(c, day(3));
    expect(tipText(c)).toContain('Range 83 – 153');
    let seen;
    const f = ts({ band: true, tooltipFormat: (d, info) => { seen = info.band; return 'x'; } });
    hover(f, day(3));
    expect(seen).toEqual({ lower: 83, upper: 153 });
    let none = 'unset';
    const g = ts({ tooltipFormat: (d, info) => { none = 'band' in info; return 'x'; } });
    hover(g, day(3));
    expect(none).toBe(false);
  });

  it('the legend hides it: no ribbon, no range row, and the axis fits the line again', () => {
    const c = ts({ band: true });
    c.setSeriesVisible(['Series']);
    expect(ribbon(c)).toBeNull();
    expect(c.yScale.domain()[0]).toBeGreaterThan(80);
    hover(c, day(3));
    expect(tipText(c)).not.toContain('Range');
  });

  it('the crosshair never follows the band: with only the band shown it is off', () => {
    const c = ts({ band: true });
    c.setSeriesVisible(['Range']);
    expect(ribbon(c)).not.toBeNull();
    hover(c, day(3));
    expect(c.container.querySelector('.rc-tooltip.is-visible')).toBeNull();
  });

  it('the navigator draws the line alone', () => {
    const c = ts({ band: true, navigator: true });
    expect(c._getNavigatorData().every(d => 'value' in d)).toBe(true);
  });
});

const pts = (f, n = 11) => Array.from({ length: n }, (_, i) => ({ date: new Date(2024, 0, 1 + i), value: f(i) }));
const PRICE = { name: 'Price', axis: 'y1', type: 'line', color: '#1677ff', values: pts(i => 100 + i) };
const SPREAD = { name: 'Spread', axis: 'y2', type: 'bar', values: pts(i => i - 3) };
const BAND = {
  name: 'Range', axis: 'y1', type: 'band', color: '#fa8c16',
  values: pts(() => 0).map((d, i) => ({ date: d.date, lower: 60 + i, upper: 160 + i })),
};
const dual = (o, data) => track(new DualAxes(mount(null), { animate: false, ...o })).setData(data);

describe('DualAxes band series (RC-051)', () => {
  it('without a band series nothing changes: no band group', () => {
    const c = dual({}, [PRICE, SPREAD]);
    expect(c.container.querySelector('.rc-bands')).toBeNull();
  });

  it('draws a ribbon behind the bars and the lines, on its axis, and the axis fits its edges', () => {
    const c = dual({}, [PRICE, SPREAD, BAND]);
    const g = c.container.querySelector('g.rc-bands');
    expect(g.nextElementSibling.classList.contains('rc-bars')).toBe(true);
    expect(g.querySelector('path.rc-band').getAttribute('fill')).toBe('#fa8c16');
    // the ribbon stays inside the plot: its axis fits 60…170, not the line's 100…110
    const ys = g.querySelector('path.rc-band').getAttribute('d').match(/-?[\d.]+(?:e-?\d+)?/g).filter((_, i) => i % 2).map(Number);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(c.height);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(c.height * 0.6);
  });

  it('end labels, markers and the navigator leave it out; the legend toggles it', () => {
    const c = dual({ markers: true, navigator: true }, [BAND, PRICE]);
    expect(c.container.querySelectorAll('.rc-end-labels text')).toHaveLength(1);
    expect(c._getNavigatorData()).toBe(c._series.find(s => s.name === 'Price').values);
    c.setSeriesVisible(['Price']);
    expect(c.container.querySelector('path.rc-band')).toBeNull();
  });

  it('the crosshair reports its range', () => {
    let seen = null;
    const c = dual({ tooltipFormat: ({ points }) => { seen = points; return 'tip'; } }, [PRICE, BAND]);
    c.container.querySelector('rect.rc-overlay')
      .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 100 }));
    const band = seen.find(p => p.type === 'band');
    expect(band.lower).toBeLessThan(band.upper);
  });
});

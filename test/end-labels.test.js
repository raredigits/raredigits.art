// RC-084: an end label sits in the right-hand column, where the Y tick
// labels are; a tick label it would cover is hidden ('10.9k' over '10k').
import { describe, it, expect, beforeEach } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const pts = last => Array.from({ length: 6 }, (_, i) => ({ date: new Date(2024, 0, 1 + i), value: i === 5 ? last : 20 + i }));
const hidden = (c, sel) => [...c.container.querySelectorAll(`${sel} .tick text`)]
  .filter(t => t.getAttribute('visibility') === 'hidden').map(t => t.textContent);

describe('end labels give way to no tick label, tick labels give way to them (RC-084)', () => {
  it('Line: the tick label under the end label is hidden, the others show', () => {
    const c = track(new Line(mount(null), { animate: false, yTickValues: [0, 50, 100], yFormat: 'number' }))
      .setData([{ name: 'A', values: pts(100) }]);
    expect(hidden(c, '.rc-axis-y')).toEqual(['100']);
  });

  it('Line: an end label between two ticks hides none', () => {
    const c = track(new Line(mount(null), { animate: false, yTickValues: [0, 50, 100], yFormat: 'number' }))
      .setData([{ name: 'A', values: pts(75) }]);
    expect(hidden(c, '.rc-axis-y')).toEqual([]);
  });

  it('a tick label comes back once the series that covered it is hidden', () => {
    const c = track(new Line(mount(null), { animate: false, yTickValues: [0, 50, 100], yFormat: 'number', legendRescale: false }))
      .setData([{ name: 'A', values: pts(100) }, { name: 'B', values: pts(30) }]);
    expect(hidden(c, '.rc-axis-y')).toEqual(['100']);
    c.setSeriesVisible(['B']);
    expect(hidden(c, '.rc-axis-y')).toEqual([]);
  });

  it('DualAxes: Y1\'s tick label under the end label is hidden', () => {
    const c = track(new DualAxes(mount(null), { animate: false, y1Domain: [0, 100] }))
      .setData([{ name: 'A', axis: 'y1', type: 'line', values: pts(100) }]);
    const shown = [...c.container.querySelectorAll('.rc-axis-y1 .tick text')].map(t => t.textContent);
    const top = shown.find(t => parseFloat(t.replace(/,/g, '')) === 100);
    if (top) expect(hidden(c, '.rc-axis-y1')).toEqual([top]);
    else expect(hidden(c, '.rc-axis-y1')).toEqual([]);
  });
});

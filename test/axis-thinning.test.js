// RC-076: a crowded date axis is thinned by asking d3 for fewer ticks; a
// count d3 answers with a step longer than the view (one label, or none)
// keeps the ticks asked before and shows every k-th label instead.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { mount, track, setGeometry } from './helpers.js';

afterEach(() => vi.restoreAllMocks());

// Labels `w` px wide, centred on their tick; the svg as wide as the card.
const layout = (w, cardWidth) => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
  if (this.tagName?.toLowerCase() === 'svg') return { left: 0, right: cardWidth, top: 0, bottom: 300, width: cardWidth, height: 300, x: 0, y: 0 };
  const m = this.closest?.('.tick')?.getAttribute('transform')?.match(/translate\(([-\d.]+)/);
  const x = m ? +m[1] : 0;
  return { left: x - w / 2, right: x + w / 2, top: 0, bottom: 10, width: w, height: 10, x: x - w / 2, y: 0 };
});
const shown = c => [...c.gAxisX.selectAll('.tick text').nodes()].filter(t => t.getAttribute('display') !== 'none').map(t => t.textContent);
const weekly = n => Array.from({ length: n }, (_, i) => ({ date: new Date(2025, 0, 6 + 7 * i), value: 10 + (i % 4) }));

describe('a crowded date axis keeps at least two labels (RC-076)', () => {
  it('the dated Bar on a narrow card: two labels or more, none overlapping', () => {
    setGeometry({ width: 375, height: 300 });
    layout(120, 375);
    const c = track(new Bar(mount(null), { animate: false })).setData(weekly(20));
    const labels = shown(c);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('Line too', () => {
    setGeometry({ width: 375, height: 300 });
    layout(120, 375);
    const c = track(new Line(mount(null), { animate: false })).setData([{ name: 'a', values: weekly(20) }]);
    expect(shown(c).length).toBeGreaterThanOrEqual(2);
  });

  it('a hidden label shows again when the card widens', () => {
    setGeometry({ width: 375, height: 300 });
    layout(120, 375);
    const c = track(new Line(mount(null), { animate: false })).setData([{ name: 'a', values: weekly(20) }]);
    vi.restoreAllMocks();
    layout(30, 1400);
    setGeometry({ width: 1400, height: 300 });
    c.render();
    expect(c.gAxisX.selectAll('text[data-rc-thin]').size()).toBe(0);
  });
});

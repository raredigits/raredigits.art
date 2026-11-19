import { describe, it, expect } from 'vitest';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { mount, track } from './helpers.js';

// RC-023: the standalone Overview's drawing has a name, as a chart's has;
// the strip under a chart is part of that chart and takes none.
describe('Overview — accessible name (RC-023)', () => {
  const strip = (o = {}) => {
    const ov = new Overview(mount(null), o);
    return { ov, svg: ov.container.querySelector('svg') };
  };

  it('standalone: role="img" and ariaLabel, else "Chart"', () => {
    const named = strip({ ariaLabel: ' Brent, 2020–2026 ' });
    expect(named.svg.getAttribute('role')).toBe('img');
    expect(named.svg.getAttribute('aria-label')).toBe('Brent, 2020–2026');
    expect(strip().svg.getAttribute('aria-label')).toBe('Chart');
    named.ov.destroy();
    expect(named.ov.container.querySelector('svg')).toBeNull();
  });

  it('under a chart (the navigator) the strip takes no role and no name', () => {
    const day = i => new Date(2026, 0, 1 + i);
    const c = track(new Line(mount(null), { animate: false, navigator: true, ariaLabel: 'Prices' }))
      .setData([1, 3, 2, 5].map((value, i) => ({ date: day(i), value })));
    const nav = c.container.querySelector('.rc-chart-navigator svg');
    expect(nav).not.toBeNull();
    expect(nav.hasAttribute('role')).toBe(false);
    expect(nav.hasAttribute('aria-label')).toBe(false);
  });
});

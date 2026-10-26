import { describe, it, expect, vi } from 'vitest';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { mount, track } from './helpers.js';

// C-28: label placement of HierarchicalBar. From 480px of plot width a row
// reads name → bar → value (names flush against the bars, one zero line for
// every bar, values in a right-aligned column); narrower the name keeps its
// own line above the bar. Depth indents the name only; parents are semibold; branch
// groups are set apart. jsdom has no text metrics, so widths are the chart's
// own estimate — these tests check the geometry, the browser test the look.

const LONG = 'License agreement with CIC Digital LLC for NFTs and meme coins';
const tree = {
  label: 'Portfolio', value: 100,
  children: [
    { label: 'Equities', value: 60, children: [
      { label: 'US Large Cap', value: 35 },
      { label: LONG, value: 18 },
    ] },
    { label: 'Bonds', value: 30 },
    { label: 'Gold', value: 5 },
    { label: 'Cash', value: null },
  ],
};

const hbar = (width, o = {}, data = tree) =>
  track(new HierarchicalBar(mount(null, { width }), { animate: false, ...o })).setData(data);
const rowsOf = c => [...c.container.querySelectorAll('g.rc-hbar-row')].map(g => {
  const label = g.querySelector('.rc-hbar-label');
  const bar   = g.querySelector('.rc-hbar-bar');
  const value = g.querySelector('.rc-hbar-value');
  return {
    g,
    name:   label.textContent,
    lines:  [...label.querySelectorAll('tspan')].map(t => t.textContent),
    labelX: +label.getAttribute('x'),
    labelY: +label.getAttribute('y'),
    weight: label.getAttribute('font-weight'),
    barX:   +bar.getAttribute('x'),
    barY:   +bar.getAttribute('y'),
    barW:   +bar.getAttribute('width'),
    value:  value.textContent,
    valueX: +value.getAttribute('x'),
    anchor: value.getAttribute('text-anchor'),
    valueWeight: value.getAttribute('font-weight'),
  };
});
const row = (c, start) => rowsOf(c).find(r => r.name.startsWith(start));

describe('HierarchicalBar — side by side on a wide plot (C-28)', () => {
  it('every bar starts at one zero line, right of the names; names stand flush against the bars', () => {
    const c = hbar(800);
    const rows = rowsOf(c);
    const x0 = rows[0].barX;
    expect(x0).toBeGreaterThan(0);
    rows.forEach(r => expect(r.barX).toBe(x0));
    rows.forEach(r => {
      expect(r.labelX).toBe(x0 - 12);
      expect(r.g.querySelector('.rc-hbar-label').getAttribute('text-anchor')).toBe('end');
    });
  });

  it("labelAlign: 'left' indents the name by depth instead", () => {
    const c = hbar(800, { labelAlign: 'left' });
    const rows = rowsOf(c);
    const x0 = rows[0].barX;
    rows.forEach(r => expect(r.barX).toBe(x0));
    expect(row(c, 'Portfolio').labelX).toBe(0);
    expect(row(c, 'Equities').labelX).toBe(16);
    expect(row(c, 'US Large Cap').labelX).toBe(32);
    rows.forEach(r => {
      expect(r.labelX).toBeLessThan(x0);
      expect(r.g.querySelector('.rc-hbar-label').getAttribute('text-anchor')).toBeNull();
    });
  });

  it('values stand in one right-aligned column at the right edge', () => {
    const c = hbar(800);
    const shown = rowsOf(c).filter(r => r.value !== '?');
    expect(new Set(shown.map(r => r.valueX))).toEqual(new Set([c.width]));
    shown.forEach(r => expect(r.anchor).toBe('end'));
    // bars end before the value column, at their share of the longest bar
    const span = row(c, 'Portfolio').barW;
    expect(row(c, 'Equities').barW).toBeCloseTo(span * 0.6, 5);
    rowsOf(c).forEach(r => expect(r.barX + r.barW).toBeLessThan(c.width - 10));
  });

  it('a long name wraps to a second line in the name column, and its row grows by a line', () => {
    const c = hbar(800);
    const long = row(c, 'License');
    expect(long.lines.length).toBe(2);
    expect(long.name.replace(/…$/, '')).toBe(LONG.slice(0, long.name.replace(/…$/, '').length));
    const short = row(c, 'US Large Cap');
    expect(short.lines).toEqual(['US Large Cap']);
    // the bar sits in the middle of its (taller) row, the two lines around it
    expect(long.barY - long.labelY).toBeGreaterThan(short.barY - short.labelY);
  });

  it('parents are semibold, name and value; leaves and the missing marker are not', () => {
    const c = hbar(800);
    expect(row(c, 'Portfolio').weight).toBe('600');
    expect(row(c, 'Equities').weight).toBe('600');
    expect(row(c, 'Equities').valueWeight).toBe('600');
    expect(row(c, 'Bonds').weight).toBeNull();
    expect(row(c, 'US Large Cap').valueWeight).toBeNull();
    expect(row(c, 'Cash').valueWeight).toBeNull();
    // maxDepth: 0 draws no children, so no row is a parent
    expect(rowsOf(hbar(800, { maxDepth: 0 })).every(r => r.weight === null)).toBe(true);
  });

  it('a gap opens before a new branch group, not between single-row branches', () => {
    const c = hbar(800);
    const gapBefore = (a, b) => row(c, b).barY - row(c, a).barY;
    const step = gapBefore('Bonds', 'Gold');           // two single-row branches: no gap
    expect(step).toBe(28);                              // default side rowHeight
    expect(gapBefore('Portfolio', 'Equities')).toBe(28 + 8);   // root → first group
    // after the Equities group (its last row wraps to two lines) Bonds starts 8px further
    const lastChild = row(c, 'License');
    expect(row(c, 'Bonds').barY - lastChild.barY).toBeGreaterThan(28 + 8);
  });

  it('the missing marker stands where the bar would start', () => {
    const c = hbar(800);
    expect(row(c, 'Cash').value).toBe('?');
    expect(row(c, 'Cash').valueX).toBe(row(c, 'Bonds').barX);
  });
});

describe('HierarchicalBar — stacked on a narrow plot (C-28)', () => {
  it('the name has its own line above the bar; bars share the zero line', () => {
    const c = hbar(375);
    const rows = rowsOf(c);
    rows.forEach(r => {
      expect(r.barX).toBe(0);
      expect(r.labelY).toBeLessThan(r.barY);
    });
    expect(row(c, 'US Large Cap').labelX).toBe(32);
    expect(c.svg.attr('height')).toBe(String(7 * 44 + 2 * 8 + 8 + 8));   // 44px rows, two group gaps, margins
  });

  it('a name too long for the width ends in an ellipsis; the tooltip keeps it whole', () => {
    const c = hbar(375);
    const long = row(c, 'License');
    expect(long.lines.length).toBe(1);
    expect(long.name.endsWith('…')).toBe(true);
    expect(long.name.length).toBeLessThan(LONG.length);
    const spy = vi.spyOn(c._tooltip, 'show');
    long.g.dispatchEvent(new MouseEvent('mouseenter', { clientX: 5, clientY: 5 }));
    expect(spy.mock.calls.at(-1)[2]).toContain(LONG);
  });

  it('values follow the bar end as before', () => {
    const c = hbar(375);
    const bonds = row(c, 'Bonds');
    expect(bonds.anchor).toBe('start');
    expect(bonds.valueX).toBeCloseTo(bonds.barX + bonds.barW + 6, 5);
  });

  it('a resize across 480px switches the layout', () => {
    const el = mount(null);
    let w = 800;
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
    const c = track(new HierarchicalBar(el, { animate: false })).setData(tree);
    expect(row(c, 'Bonds').barX).toBeGreaterThan(0);
    w = 375;
    c.render();
    expect(row(c, 'Bonds').barX).toBe(0);
    expect(row(c, 'Bonds').labelY).toBeLessThan(row(c, 'Bonds').barY);
  });

  it('rowHeight still sets the row pitch in either layout', () => {
    const wide = hbar(800, { rowHeight: 40 });
    expect(row(wide, 'Gold').barY - row(wide, 'Bonds').barY).toBe(40);
    const narrow = hbar(375, { rowHeight: 50 });
    expect(row(narrow, 'Gold').barY - row(narrow, 'Bonds').barY).toBe(50);
  });
});

describe('HierarchicalBar — stacked values stay on the plot (step 7a review)', () => {
  it('a long value past a near-full bar goes inside the bar instead of off the plot', () => {
    // Mid leaves ~60px past its end: more than the old fixed 46px gap, less
    // than its ~80px value.
    const data = { label: 'Root', value: 2_200_000, children: [
      { label: 'Big', value: 1_200_000 }, { label: 'Mid', value: 1_000_000 },
    ] };
    const c = hbar(375, { showRoot: false, valueFormat: n => '$' + n.value.toLocaleString('en-US') }, data);
    const mid = row(c, 'Mid');
    expect(mid.anchor).toBe('end');                       // inside, right-aligned at the bar end
    expect(mid.valueX).toBeLessThanOrEqual(mid.barX + mid.barW);
  });
});

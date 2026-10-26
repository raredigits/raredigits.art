import { describe, it, expect } from 'vitest';
import { normalizeHierarchy } from '../assets/charts/src/core/hierarchy.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { mount, track } from './helpers.js';

// C-19: a parent with no value of its own and not one disclosed child has an
// unknown magnitude — a missing placeholder, not a 0. The 0 made the Donut
// drill-down divide by a zero total ("NaN%") and the bar print "0".

const hidden = (label) => ({ label, children: [{ label: `${label} 1`, value: null }, { label: `${label} 2`, value: null }] });

describe('normalizeHierarchy — a parent of undisclosed items only', () => {
  it('is itself missing, keeps its children, and adds nothing to its parent', () => {
    const root = normalizeHierarchy({ label: 'Root', children: [hidden('P'), { label: 'B', value: 10 }] });
    const p = root.children[0];
    expect(p).toMatchObject({ label: 'P', value: null, missing: true, remainder: 0 });
    expect(p.children.map(c => [c.label, c.missing])).toEqual([['P 1', true], ['P 2', true]]);
    expect(root.value).toBe(10);
  });

  it('an explicit value: null with such children, and a chain of them, stay missing up the tree', () => {
    const root = normalizeHierarchy({ label: 'Root', value: null, children: [{ label: 'G', children: [hidden('P')] }] });
    expect(root).toMatchObject({ value: null, missing: true });
    expect(root.children[0]).toMatchObject({ label: 'G', value: null, missing: true });
  });

  it('a stated value or one disclosed child still gives a number', () => {
    const root = normalizeHierarchy({ label: 'Root', children: [
      { label: 'S', value: 7, children: [{ label: 's', value: null }] },
      { label: 'M', children: [{ label: 'm1', value: null }, { label: 'm2', value: 3 }] },
    ] });
    expect(root.children.map(n => [n.label, n.value, !!n.missing])).toEqual([['S', 7, false], ['M', 3, false]]);
  });
});

describe('Donut drill-down — no NaN for a parent of undisclosed items', () => {
  const texts = c => c.container.querySelector('svg').textContent;

  it('the parent is noted as not disclosed, not drawn as an empty slice', () => {
    const c = track(new Donut(mount(null), { animate: false, showLabels: true }))
      .setData({ label: 'Root', children: [hidden('P'), { label: 'B', value: 10 }] });
    expect(c.container.querySelectorAll('.rc-donut-slice')).toHaveLength(1);
    expect(texts(c)).toContain('1 not disclosed');
    expect(texts(c)).not.toMatch(/NaN/);
  });

  it('a level of such parents only is the empty state, not a NaN% ring', () => {
    const c = track(new Donut(mount(null), { animate: false, showLabels: true }))
      .setData({ label: 'Root', children: [hidden('P'), hidden('Q')] });
    expect(c.container.querySelectorAll('.rc-donut-slice')).toHaveLength(0);
    expect(c.container.textContent).not.toMatch(/NaN/);
  });
});

describe('HierarchicalBar — a parent of undisclosed items reads "?"', () => {
  it('draws the marker and no bar, and its tooltip says not disclosed', () => {
    const c = track(new HierarchicalBar(mount(null), { animate: false }))
      .setData({ label: 'Root', children: [hidden('P'), { label: 'B', value: 10 }] });
    const row = [...c.container.querySelectorAll('g.rc-hbar-row')]
      .find(g => g.querySelector('.rc-hbar-label').textContent === 'P');
    expect(row.querySelector('.rc-hbar-value').textContent).toBe('?');
    expect(row.querySelector('.rc-hbar-bar').getAttribute('display')).toBe('none');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';

// Both charts render a normalized tree (core/hierarchy.js). Imports are direct
// (not via index.js, which imports CSS as text — esbuild-only).

let host;
beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  host.id = 'chart';
  document.body.appendChild(host);
});

// A compact tree that exercises: a two-level branch with a surfaced remainder
// (A: 60 vs 30+10 → 20 "A other"), a leaf branch (B), and a named-but-undisclosed
// item (C: value null → a "?" placeholder, excluded from magnitude).
const portfolio = {
  label: 'Root',
  value: 100,
  children: [
    { label: 'A', value: 60, remainderLabel: 'A other', children: [
      { label: 'A1', value: 30 },
      { label: 'A2', value: 10 },
    ] },
    { label: 'B', value: 25 },
    { label: 'C', value: null },
  ],
};

const rowLabels = (svg) =>
  [...svg.querySelectorAll('.rc-hbar-label')].map(t => t.textContent);

describe('HierarchicalBar', () => {
  it('constructs, accepts a tree, and renders a labelled svg', () => {
    expect(() => new HierarchicalBar('#chart', { title: 'HBar' }).setData(portfolio)).not.toThrow();
    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('HBar');
  });

  it('flattens the tree into one row per node (root shown, remainder surfaced)', () => {
    new HierarchicalBar('#chart', {}).setData(portfolio);
    const svg = host.querySelector('svg');
    // Root, A, A1, A2, A other (remainder), B, C = 7 rows
    expect(svg.querySelectorAll('g.rc-hbar-row')).toHaveLength(7);
    expect(rowLabels(svg)).toContain('A other');
    expect(rowLabels(svg)).toContain('Root');
  });

  it('drops the root and re-bases when showRoot is false', () => {
    new HierarchicalBar('#chart', { showRoot: false }).setData(portfolio);
    const svg = host.querySelector('svg');
    // A, A1, A2, A other, B, C = 6 rows
    expect(svg.querySelectorAll('g.rc-hbar-row')).toHaveLength(6);
    expect(rowLabels(svg)).not.toContain('Root');
  });

  it('renders a missing (value:null) node as a "?" marker with no bar', () => {
    new HierarchicalBar('#chart', { missingGlyph: '?' }).setData(portfolio);
    const svg = host.querySelector('svg');
    const values = [...svg.querySelectorAll('.rc-hbar-value')].map(t => t.textContent);
    expect(values).toContain('?');
  });

  it('accepts a forest (array of roots)', () => {
    expect(() => new HierarchicalBar('#chart', {}).setData([
      { label: 'One', value: 10 },
      { label: 'Two', value: 20, children: [{ label: 'Two-a', value: 20 }] },
    ])).not.toThrow();
    expect(host.querySelectorAll('g.rc-hbar-row')).toHaveLength(3);
  });
});

describe('Donut — flat mode is unchanged', () => {
  it('takes a plain array and stays in flat mode', () => {
    const c = new Donut('#chart', { title: 'Flat' }).setData([
      { label: 'A', value: 4 }, { label: 'B', value: 6 },
    ]);
    expect(c._mode).toBe('flat');
    expect(host.querySelectorAll('.rc-donut-slice')).toHaveLength(2);
  });
});

describe('Donut — drill-down (hierarchy mode)', () => {
  it('enters hierarchy mode on an object root and shows its direct children', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    expect(c._mode).toBe('hier');
    expect(c._trail).toHaveLength(1);
    // A and B are drawable; C (missing) is excluded from the ring.
    expect(host.querySelectorAll('.rc-donut-slice')).toHaveLength(2);
  });

  it('notes undisclosed children rather than drawing them', () => {
    new Donut('#chart', {}).setData(portfolio);
    const crumb = host.querySelector('.rc-donut-crumb');
    expect(crumb.textContent).toContain('1 not disclosed');
  });

  it('drills into a node with children and back out again', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    const A = c._tree.children.find(n => n.label === 'A');

    c.drillTo(A);
    expect(c._trail).toHaveLength(2);
    expect(c._focus().label).toBe('A');
    // A1, A2, and the surfaced "A other" remainder = 3 slices. Asserted on the
    // model, not the DOM: the previous level's slices leave via an async exit
    // transition and linger for its duration, so a synchronous DOM count is racy.
    expect(c._data).toHaveLength(3);
    // Breadcrumb shows the path.
    expect(host.querySelector('.rc-donut-crumb').textContent).toContain('Root');
    expect(host.querySelector('.rc-donut-crumb').textContent).toContain('A');

    c.drillUp();
    expect(c._trail).toHaveLength(1);
    expect(c._focus().label).toBe('Root');
  });

  it('does not drill into a leaf', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    const B = c._tree.children.find(n => n.label === 'B');
    c.drillTo(B);
    expect(c._trail).toHaveLength(1);       // unchanged
    expect(c._focus().label).toBe('Root');
  });

  it('jumps to an ancestor via drillToDepth', () => {
    const c = new Donut('#chart', {}).setData(portfolio);
    c.drillTo(c._tree.children.find(n => n.label === 'A'));
    expect(c._trail).toHaveLength(2);
    c.drillToDepth(0);
    expect(c._trail).toHaveLength(1);
    expect(c._focus().label).toBe('Root');
  });
});

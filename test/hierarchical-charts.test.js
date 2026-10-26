import { describe, it, expect, beforeEach } from 'vitest';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { mount, track } from './helpers.js';

// Both charts render a normalized tree (core/hierarchy.js). Imports are direct;
// the entry point and its CSS are covered by exports.test.js and
// bundle-smoke.test.js.

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

describe('Donut — drill-down transitions and the way back up', () => {
  const sliceOf = (c, label) =>
    [...c.container.querySelectorAll('path.rc-donut-slice')].find(p => p.__data__.data.label === label);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  it('the slice clicked to drill in leaves the DOM, even when the pointer then leaves it (E-04)', async () => {
    const c = track(new Donut(mount(null), { duration: 40 })).setData(portfolio);
    const a = sliceOf(c, 'A');
    a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c._focus().label).toBe('A');
    // on its way out: no hover, no tooltip, no second drill
    expect(a.style.pointerEvents).toBe('none');
    // the pointer leaving it used to start a hover transition that cancelled the exit
    a.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(c._tooltip.el.classList.contains('is-visible')).toBe(false);
    await wait(120);
    expect(a.isConnected).toBe(false);
    expect([...c.container.querySelectorAll('path.rc-donut-slice')].map(p => p.__data__.data.label))
      .toEqual(['A1', 'A2', 'A other']);
  });

  it('drilling in and straight back up keeps the slice that returns, live (E-04)', async () => {
    const c = track(new Donut(mount(null), { duration: 40 })).setData(portfolio);
    const a = sliceOf(c, 'A');
    c.drillTo(c._tree.children.find(n => n.label === 'A'));
    c.drillUp();                                  // before A's exit has finished
    await wait(120);
    expect(a.isConnected).toBe(true);
    expect(a.style.pointerEvents).toBe('');
    expect([...c.container.querySelectorAll('path.rc-donut-slice')].map(p => p.__data__.data.label)).toEqual(['A', 'B']);
  });

  it('animate: false removes the previous level at once (D14)', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(portfolio);
    c.drillTo(c._tree.children.find(n => n.label === 'A'));
    expect(c.container.querySelectorAll('path.rc-donut-slice')).toHaveLength(3);
  });

  it('drilled in, the whole hole is a button back up — click, Enter or Space (E-21)', () => {
    const c = track(new Donut(mount(null), { animate: false })).setData(portfolio);
    const center = c.container.querySelector('.rc-donut-center');
    expect(center.getAttribute('tabindex')).toBeNull();          // nothing to go up to at the root
    expect(center.querySelector('circle')).toBeNull();

    const A = c._tree.children.find(n => n.label === 'A');
    c.drillTo(A);
    const disc = center.querySelector('circle.rc-donut-center-hit');
    expect(disc).not.toBeNull();
    expect(center.firstElementChild).toBe(disc);                  // under the text
    expect(+disc.getAttribute('r')).toBeGreaterThan(0);
    expect(center.getAttribute('tabindex')).toBe('0');
    expect(center.getAttribute('role')).toBe('button');
    expect(center.getAttribute('aria-label')).toBe('Back to Root');
    disc.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c._focus().label).toBe('Root');
    expect(center.getAttribute('tabindex')).toBeNull();

    c.drillTo(A);
    center.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(c._focus().label).toBe('Root');
    c.drillTo(A);
    center.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(c._focus().label).toBe('Root');
  });

  it('a pie has no hole to click: no center button, the breadcrumb goes back up', () => {
    const c = track(new Pie(mount(null), { animate: false })).setData(portfolio);
    c.drillTo(c._tree.children.find(n => n.label === 'A'));
    const center = c.container.querySelector('.rc-donut-center');
    expect(center.querySelector('circle')).toBeNull();
    expect(center.getAttribute('tabindex')).toBeNull();
    const crumb = [...c.container.querySelectorAll('.rc-donut-crumb text')].find(t => t.textContent === 'Root');
    crumb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c._focus().label).toBe('Root');
  });
});

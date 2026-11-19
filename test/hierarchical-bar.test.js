import { describe, it, expect, beforeEach } from 'vitest';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';

// HierarchicalBar, the tree outline: one row per node, the root and a
// surfaced remainder shown, showRoot, the "?" of an undisclosed node, a
// forest. The tree itself is normalized by core/hierarchy.js
// (hierarchy.test.js); the layout on wide and narrow plots is in
// hbar-layout.test.js. Imports are direct; the entry point and its CSS are
// covered by exports.test.js and bundle-smoke.test.js.
//
// Moved from hierarchical-charts.test.js (RC-026):
//   'HierarchicalBar' → same describe
// Its Donut describes went to circular.test.js.

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

// RC-056: one name for a bar's thickness; barHeight is gone with no alias
describe('HierarchicalBar barWidth (RC-056)', () => {
  it('barWidth sets the thickness; barHeight is ignored with a one-time hint', async () => {
    const { vi } = await import('vitest');
    const { HierarchicalBar } = await import('../assets/charts/src/charts/HierarchicalBar.js');
    const { mount, track } = await import('./helpers.js');
    const data = [{ label: 'A', value: 3 }, { label: 'B', value: 5 }];
    const thick = c => +c.container.querySelector('rect.rc-hbar-bar, .rc-hbar-row rect')?.getAttribute('height');
    const wide = track(new HierarchicalBar(mount(null), { animate: false, barWidth: 22 })).setData(data);
    expect(thick(wide)).toBe(22);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const old = track(new HierarchicalBar(mount(null), { animate: false, barHeight: 22 })).setData(data);
    expect(thick(old)).not.toBe(22);
    expect(warn.mock.calls.some(c => /barHeight was removed in 0\.9\.8_7 — use barWidth/.test(c[0]))).toBe(true);
    warn.mockRestore();
  });
});

describe('HierarchicalBar: a wrapped name (maintainer, 2026-11-19)', () => {
  it('the first line ends at its last word — no space drawn — and the label still reads as the name', async () => {
    const { mount, track } = await import('./helpers.js');
    const name = 'License agreement with CIC Digital LLC for NFTs and meme coins and a few more words';
    const c = track(new HierarchicalBar(mount(null), { animate: false })).setData([{ label: name, value: 3 }, { label: 'B', value: 5 }]);
    const label = [...c.container.querySelectorAll('.rc-hbar-label')].find(t => t.textContent.startsWith('License'));
    const drawn = [...label.querySelectorAll('tspan')].filter(t => t.getAttribute('display') !== 'none');
    expect(drawn.length).toBe(2);
    expect(drawn[0].textContent).toBe(drawn[0].textContent.trimEnd());
    expect(label.textContent.replace(/…$/, '')).toBe(name.slice(0, label.textContent.replace(/…$/, '').length));
  });
});

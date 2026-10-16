import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';

const budget = {
  nodes: [
    { id: 'tax', label: 'Taxes' }, { id: 'debt', label: 'Borrowing' },
    { id: 'health', label: 'Health' }, { id: 'schools', label: 'Schools' }, { id: 'roads', label: 'Roads' },
  ],
  links: [
    { source: 'tax', target: 'health', value: 120, type: 'grant' },
    { source: 'tax', target: 'schools', value: 80 },
    { source: 'debt', target: 'roads', value: 50 },
    { source: 'debt', target: 'health', value: 30 },
  ],
};

describe('Sankey', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });

  it('renders one rect per node and one band per flow, with an accessible svg', () => {
    new Sankey('#chart', { title: 'Budget', orientation: 'horizontal', animate: false }).setData(budget);
    expect(host.querySelectorAll('.rc-sankey-node')).toHaveLength(5);
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(4);
    expect(host.querySelector('svg').getAttribute('aria-label')).toBe('Budget');
    expect(host.querySelector('.rc-sankey-link').getAttribute('aria-label')).toBe('Taxes → Health: 120');
  });

  it('derives nodes from links when none are given, and accepts from/to and flows', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' })
      .setData({ flows: [{ from: 'a', to: 'b', value: 2 }, { from: 'b', to: 'c', value: 1 }] });
    expect(host.querySelectorAll('.rc-sankey-node')).toHaveLength(3);
  });

  it('drops invalid values and unknown nodes with warnings; sums repeated pair+type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [
        { source: 'a', target: 'b', value: 2 },
        { source: 'a', target: 'b', value: 3 },          // summed
        { source: 'a', target: 'b', value: 0 },          // dropped
        { source: 'a', target: 'b', value: 'x' },        // dropped
        { source: 'a', target: 'zzz', value: 1 },        // unknown node
        { source: 'a', target: 'b', value: 1, type: 't' }, // separate band
      ],
    });
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });

  it('throws on a cycle', () => {
    const s = new Sankey('#chart', { animate: false });
    expect(() => s.setData({ links: [
      { source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 },
    ] })).toThrow(/cycle/);
  });

  it("orientation 'auto' switches to vertical on a narrow container", () => {
    const narrow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(host, 'clientWidth', { configurable: true, get: () => 360 });
    const s = new Sankey('#chart', { animate: false }).setData(budget);
    expect(s._vertical).toBe(true);
    // two columns × rowHeight 140 → the container grows to fit
    expect(parseFloat(host.style.height)).toBeGreaterThanOrEqual(280);
    Object.defineProperty(host, 'clientWidth', narrow);
  });

  it('click on a band pins its tooltip with the share of the source', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData(budget);
    const band = [...host.querySelectorAll('.rc-sankey-link')]
      .find(p => p.getAttribute('aria-label') === 'Taxes → Schools: 80');
    band.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tt = host.querySelector('.rc-tooltip');
    expect(tt.classList.contains('is-pinned')).toBe(true);
    expect(tt.textContent).toContain('40% of Taxes');
  });

  it('gradient ids are unique per instance', () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
    new Sankey('#a', { animate: false, orientation: 'horizontal', linkColor: 'gradient' }).setData(budget);
    new Sankey('#b', { animate: false, orientation: 'horizontal', linkColor: 'gradient' }).setData(budget);
    const ga = document.querySelector('#a linearGradient').id;
    const gb = document.querySelector('#b linearGradient').id;
    expect(ga).not.toBe(gb);
  });

  it('renders a screen-reader table of flows, and none when disabled', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData(budget);
    expect(host.querySelectorAll('.rc-sankey-table tbody tr')).toHaveLength(4);
    document.body.innerHTML = '<div id="chart"></div>';
    new Sankey('#chart', { animate: false, tableFallback: false }).setData(budget);
    expect(document.querySelector('.rc-sankey-table')).toBeNull();
  });

  it('empty data renders nothing and does not throw', () => {
    new Sankey('#chart', { animate: false }).setData({ links: [] });
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(0);
  });

  it('linkColor type builds the legend from linkTypes', () => {
    new Sankey('#chart', {
      animate: false, orientation: 'horizontal', linkColor: 'type',
      linkTypes: { grant: { color: '#0a0', label: 'Grant' } },
    }).setData(budget);
    expect(host.querySelector('.rc-legend').textContent).toContain('Grant');
  });
});

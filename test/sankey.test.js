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
    new Sankey('#chart', { animate: false }).setData(budget);
    // Read the drawing, not the private flag (S-04): the flow runs top to
    // bottom, so the sources share one row above every target, side by side.
    const rect = name => host.querySelector(`rect.rc-sankey-node[aria-label^="${name}:"]`);
    const y = name => +rect(name).getAttribute('y');
    const x = name => +rect(name).getAttribute('x');
    expect(y('Taxes')).toBe(y('Borrowing'));
    expect(x('Taxes')).not.toBe(x('Borrowing'));
    ['Health', 'Schools', 'Roads'].forEach(t => expect(y(t)).toBeGreaterThan(y('Taxes')));
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

describe('Sankey — a rejected payload (K-02)', () => {
  it('a cycle throws at setData and the chart keeps its previous data', () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const s = new Sankey('#chart', { animate: false }).setData(budget);
    const bands = () => document.querySelectorAll('#chart .rc-sankey-link').length;
    const before = bands();
    expect(() => s.setData({ links: [{ source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 }] })).toThrow();
    expect(() => s.render()).not.toThrow();       // a resize after the error
    expect(bands()).toBe(before);
    s.destroy();
  });
});

describe('Sankey — keys and colours', () => {
  it('ids with separators do not merge different pairs (R-20)', () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = new Sankey('#chart', { animate: false }).setData({
      links: [{ source: 'a→b', target: 'c', value: 1 }, { source: 'a', target: 'b→c', value: 2 }],
    });
    expect(document.querySelectorAll('#chart .rc-sankey-link')).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
    s.destroy();
  });

  it("linkColor: 'type' keeps an undescribed type muted — the legend lists described types only", () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const s = new Sankey('#chart', { animate: false, linkColor: 'type', linkTypes: { grant: { color: '#123456', label: 'Grant' } } })
      .setData({ links: [{ source: 'a', target: 'b', value: 1, type: 'grant' }, { source: 'a', target: 'c', value: 1, type: 'loan' }] });
    const fills = [...document.querySelectorAll('#chart .rc-sankey-link')].map(p => [p.__data__.data.type, p.getAttribute('stroke') ?? p.getAttribute('fill')]);
    expect(Object.fromEntries(fills)).toMatchObject({ grant: '#123456' });
    expect(Object.fromEntries(fills).loan).not.toBe('#123456');
    s.destroy();
  });
});

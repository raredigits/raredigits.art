import { describe, it, expect, beforeEach, vi } from 'vitest';
import { layoutFlow } from '../assets/charts/src/graph/views/flow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';

// ─── layoutFlow (pure) ─────────────────────────────────────────────────────────

describe('layoutFlow', () => {
  const lanes = [{ id: 'l1', label: 'One' }, { id: 'l2', label: 'Two', weight: 3 }];

  it('splits the width by lane weight, in declared order', () => {
    const { lanes: out } = layoutFlow({ nodes: [], lanes }, { width: 800, height: 400 });
    expect(out.map(l => [l.x0, l.x1])).toEqual([[0, 200], [200, 800]]);
  });

  it('places rows around the main line and honours col and x/y hints', () => {
    const { positions: p, top, height } = layoutFlow({
      lanes,
      nodes: [
        { id: 'main', lane: 'l1', row: 0 },
        { id: 'above', lane: 'l1', row: -1 },
        { id: 'c1', lane: 'l2', col: 1 },
        { id: 'c0', lane: 'l2', col: 0 },
        { id: 'exact', lane: 'l2', x: 0, y: 1 },
      ],
    }, { width: 800, height: 400 });
    expect(p.get('above').y).toBeLessThan(p.get('main').y);
    expect(p.get('main').x).toBe(100);                 // centre of lane 1
    expect(p.get('c1').x).toBeGreaterThan(p.get('c0').x);
    expect(p.get('exact').x).toBe(200);                 // left edge of lane 2
    expect(p.get('exact').y).toBeCloseTo(height - 24, 6);   // bottom of the drawing area
    expect(top).toBe(58);
  });

  it('fills free rows 0, 1, −1, 2… around explicit ones; never stacks two in one spot', () => {
    const { positions: p } = layoutFlow({
      lanes,
      nodes: [
        { id: 'a', lane: 'l1', row: 0 },
        { id: 'b', lane: 'l1' },
        { id: 'c', lane: 'l1' },
        { id: 'd', lane: 'l1', row: 1 },   // collides with b's auto row
      ],
    }, { width: 800, height: 600 });
    // explicit rows (a: 0, d: 1) are reserved first; b and c take the next free ones
    expect(p.get('b').row).toBe(-1);
    expect(p.get('c').row).toBe(2);
    const ys = ['a', 'b', 'c', 'd'].map(id => p.get(id).y);
    expect(new Set(ys.map(y => Math.round(y))).size).toBe(4);
  });

  it('keeps the outermost rows and their captions inside the drawing', () => {
    const { positions: p } = layoutFlow({
      lanes,
      nodes: [{ id: 'top', lane: 'l1', row: -2 }, { id: 'main', lane: 'l1', row: 0 }, { id: 'low', lane: 'l1', row: 3 }],
    }, { width: 800, height: 600, nodeRadius: 18, captionRoom: 36 });
    expect(p.get('top').y - 18).toBeGreaterThanOrEqual(58);            // below the lane header
    expect(p.get('low').y + 18 + 36).toBeLessThanOrEqual(600 - 24 + 1e-6);   // node edge + captions fit
    expect(p.get('top').y).toBeLessThan(p.get('main').y);
  });

  it('appends lanes that only the data mentions; laneBy can be a field or a function', () => {
    const r1 = layoutFlow({ lanes, nodes: [{ id: 'x', net: 'l3' }] }, { laneBy: 'net' });
    expect(r1.lanes.map(l => l.id)).toEqual(['l1', 'l2', 'l3']);
    const r2 = layoutFlow({ lanes, nodes: [{ id: 'y', meta: { lane: 'l2' } }] }, { laneBy: n => n.meta.lane });
    expect(r2.positions.get('y').lane).toBe('l2');
  });
});

// ─── Graph view: 'flow' ────────────────────────────────────────────────────────

const trace = {
  nodes: [
    { id: 'osmo', label: 'Osmosis main', sub: 'osmo1…', group: 'church', kind: 'wallet', net: 'osmosis' },
    { id: 'pools', label: 'Pools', group: 'protocol', kind: 'contract', net: 'osmosis', row: 1 },
    { id: 'eth', label: 'ETH wallet', group: 'church', kind: 'wallet', net: 'ethereum' },
    { id: 'binance', label: 'Binance', group: 'exchange', kind: 'exchange', net: 'ethereum', row: 1, terminal: true },
    { id: 'poison', label: '0x33f2…', group: 'noise', kind: 'wallet', net: 'ethereum', row: -1, noise: true },
  ],
  links: [
    { from: 'osmo', to: 'pools', asset: 'ATOM', value: 530, label: '61.38 ATOM', start: '2023-09', basis: 'exact' },
    { from: 'pools', to: 'osmo', asset: 'ETH', value: 517, label: '0.274 ETH', start: '2023-09' },
    { from: 'osmo', to: 'eth', asset: 'ETH', value: 686, label: '0.2755 ETH', start: '2024-01' },
    { from: 'eth', to: 'binance', asset: 'ETH', value: null, start: '2026-04', basis: 'derived' },
    { from: 'eth', to: 'poison', asset: 'ETH', value: null, noise: true, start: '2024-02' },
  ],
};
const opts = extra => ({
  view: 'flow', duration: 0, laneBy: 'net',
  lanes: [{ id: 'osmosis', label: 'Osmosis' }, { id: 'ethereum', label: 'Ethereum', weight: 2 }],
  nodeGroups: { church: { color: '#2c5d8f', label: 'Church' }, exchange: { color: '#a33d36', label: 'exchange' } },
  nodeShapes: { wallet: 'circle', contract: 'square', exchange: 'diamond' },
  linkColorBy: 'asset',
  linkTypes: { ATOM: { color: '#6c58b5', label: 'ATOM' }, ETH: { color: '#3d4a5c', label: 'ETH' } },
  linkDash: l => l.basis === 'derived',
  hulls: [{ id: 'owner', label: 'one key', members: n => n.group === 'church' }],
  ...extra,
});

describe('Graph view: flow', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });
  const count = sel => host.querySelectorAll(sel).length;

  it('draws lanes, nodes with shapes, every tie (both directions of a pair) and the hull', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    expect(count('.rc-flow-lane')).toBe(2);
    expect(count('.rc-flow-node')).toBe(5);
    expect(count('.rc-flow-link')).toBe(5);
    expect(count('.rc-flow-hull')).toBe(1);
    expect(host.querySelector('.rc-flow-node rect')).not.toBeNull();       // contract → square
    const paths = [...host.querySelectorAll('.rc-flow-link')];
    const swap = paths.filter(p => ['osmo', 'pools'].includes(p.__data__.source) && ['osmo', 'pools'].includes(p.__data__.target));
    expect(swap).toHaveLength(2);
    expect(swap[0].getAttribute('d')).not.toBe(swap[1].getAttribute('d'));
    // derived tie is dashed; widths follow value; colors follow asset
    const derived = paths.find(p => p.__data__.basis === 'derived');
    expect(derived.getAttribute('stroke-dasharray')).toBe('6 5');
    expect(paths.find(p => p.__data__.asset === 'ATOM').getAttribute('stroke')).toBe('#6c58b5');
    expect(host.querySelector('.rc-graph-node')).toBeNull();               // no ego leftovers
  });

  it('setFilter hides nodes and their ties without moving the rest', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    const pos = () => Object.fromEntries([...host.querySelectorAll('.rc-flow-node')]
      .map(n => [n.__data__.id, n.getAttribute('transform')]));
    const before = pos();
    g.setFilter(item => !item.noise);
    expect(count('.rc-flow-node')).toBe(4);
    expect(count('.rc-flow-link')).toBe(4);
    const after = pos();
    Object.keys(after).forEach(id => expect(after[id]).toBe(before[id]));
    g.setFilter(null);
    expect(count('.rc-flow-node')).toBe(5);
  });

  it('setTimeWindow dims later ties and fades nodes whose ties are all outside', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    g.setTimeWindow(null, '2023-12');
    const paths = [...host.querySelectorAll('.rc-flow-link')];
    const dim = paths.filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.target);
    expect(dim.sort()).toEqual(['binance', 'eth', 'poison']);
    const binance = [...host.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === 'binance');
    expect(binance.style.opacity).toBe('0.2');
    expect(count('.rc-flow-link-label')).toBe(2);   // labels for active ties only
  });

  it("timeWindowMode 'hide' removes out-of-window ties", async () => {
    const g = new Graph('#chart', opts({ timeWindowMode: 'hide' })).setData(trace);
    await g.whenReady();
    g.setTimeWindow(null, '2023-12');
    expect(count('.rc-flow-link')).toBe(2);
  });

  it('select / click fire onSelect with the original objects; blank click clears', async () => {
    const onSelect = vi.fn();
    const g = new Graph('#chart', opts({ onSelect })).setData(trace);
    await g.whenReady();
    const node = [...host.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === 'eth');
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect.mock.calls[0][0].node.label).toBe('ETH wallet');
    expect(node.classList.contains('is-selected')).toBe(true);

    const hit = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.target === 'binance');
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { link } = onSelect.mock.calls[1][0];
    expect(link.source).toBe('eth');
    expect(link).not.toHaveProperty('from');
    expect(link.basis).toBe('derived');            // custom fields pass through

    host.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect.mock.calls[2][0]).toMatchObject({ node: null, link: null });

    g.select('osmo');
    expect(onSelect.mock.calls[3][0].node.id).toBe('osmo');
  });

  it('without onSelect, clicking a tie pins its tooltip', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    host.querySelector('.rc-flow-link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.querySelector('.rc-tooltip').classList.contains('is-pinned')).toBe(true);
  });

  it('keyboard: Enter selects, → follows an outgoing tie', async () => {
    const onSelect = vi.fn();
    const g = new Graph('#chart', opts({ onSelect })).setData(trace);
    await g.whenReady();
    const nodes = [...host.querySelectorAll('.rc-flow-node')];
    const osmo = nodes.find(n => n.__data__.id === 'osmo');
    osmo.focus();
    osmo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect.mock.calls[0][0].node.id).toBe('osmo');
    osmo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement.__data__.id).toBe('pools');
  });

  it('legend lists node groups and tie categories; a category toggles off', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    const legend = host.querySelector('.rc-graph-legend');
    expect(legend.textContent).toContain('Church');
    const atom = [...legend.querySelectorAll('button')].find(b => b.textContent === 'ATOM');
    atom.click();
    expect(count('.rc-flow-link')).toBe(4);
  });

  it('marker ids are unique per instance; setLinkLabels(false) removes labels', async () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
    const a = new Graph('#a', opts()).setData(trace);
    const b = new Graph('#b', opts()).setData(trace);
    await Promise.all([a.whenReady(), b.whenReady()]);
    const ma = document.querySelector('#a .rc-flow-arrow').id;
    const mb = document.querySelector('#b .rc-flow-arrow').id;
    expect(ma).not.toBe(mb);
    a.setLinkLabels(false);
    expect(document.querySelectorAll('#a .rc-flow-link-label')).toHaveLength(0);
  });

  it('switching from flow to ego clears the flow layer', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    g._source = (await import('../assets/charts/src/graph/source.js')).memorySource(trace);
    await g.focus('osmo').whenReady();
    expect(count('.rc-flow-node')).toBe(0);
    expect(count('.rc-graph-node')).toBeGreaterThan(0);
  });
});

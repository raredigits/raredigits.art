import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { mount, track } from './helpers.js';

// The Graph flow view in the DOM: lanes, nodes and ties drawn, selection,
// legend, filters, the details panel (stage 1), folds, the lane cap and time
// navigation (Flows II, 0.9.8_6). The layout math without a DOM is in
// flow-layout.test.js.

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

  it('setData with an empty trace clears the drawing, the legend and the navigator (C-02)', () => {
    const g = new Graph('#chart', opts({ navigator: true })).setData(trace);
    expect(count('.rc-flow-node')).toBeGreaterThan(0);
    g.setData({ nodes: [], links: [] });
    expect(count('.rc-flow-node')).toBe(0);
    expect(count('.rc-flow-link')).toBe(0);
    expect(host.querySelector('.rc-graph-legend').children.length).toBe(0);
    expect(host.querySelector('.rc-chart-navigator').style.display).toBe('none');
    g.destroy();
  });

  it('setData with an empty trace also releases a pinned tie tooltip and empties the details panel (C-02)', () => {
    const g = new Graph('#chart', opts({ details: true })).setData(trace);
    host.querySelector('.rc-flow-link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.querySelector('.rc-tooltip.is-pinned')).not.toBeNull();
    g.setData({ nodes: [], links: [] });
    expect(host.querySelector('.rc-tooltip.is-pinned')).toBeNull();
    expect(host.querySelector('.rc-graph-details').textContent).not.toMatch(/→/);
    g.destroy();
  });

  it('a tie tooltip names the category the drawing shows, by linkColorBy (R-01)', () => {
    const g = new Graph('#chart', opts({ linkTypes: { ETH: { color: '#123456', label: 'Ether' } } })).setData(trace);
    const ethTie = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.asset === 'ETH');
    ethTie.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const tip = host.querySelector('.rc-tooltip');
    expect(tip.textContent).toContain('Ether');
    expect(tip.innerHTML).toContain('#123456');
    g.destroy();
  });

  it('two categories in Cyrillic get two arrow markers, each in its own colour (R-02)', () => {
    const g = new Graph('#chart', opts({
      linkColorBy: 'kind',
      linkTypes: { друг: { color: '#aa0000' }, брат: { color: '#00aa00' } },
    })).setData({
      nodes: trace.nodes,
      links: [{ from: 'osmo', to: 'pools', kind: 'друг' }, { from: 'osmo', to: 'eth', kind: 'брат' }],
    });
    const ids = [...host.querySelectorAll('.rc-flow-link')].map(p => p.getAttribute('marker-end'));
    expect(new Set(ids).size).toBe(2);
    const colours = ids.map(u => host.querySelector(u.slice(4, -1) + ' path').getAttribute('fill'));
    expect(colours.sort()).toEqual(['#00aa00', '#aa0000']);
    g.destroy();
  });

  it('the built-in details panel describes a selected fold and names ties by what is drawn (R-03)', () => {
    const folds = [{ id: 'eth-side', label: 'Ethereum side', anchor: 'eth', members: ['eth', 'binance', 'poison'] }];
    const g = new Graph('#chart', opts({ details: true, folds })).setData(trace);
    g.collapse('eth-side');
    g.select('fold:eth-side');
    const panel = host.querySelector('.rc-graph-details');
    expect(panel.textContent).toContain('Ethereum side');
    expect(panel.textContent).toMatch(/Folded/i);
    const tie = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.target === 'fold:eth-side');
    g.select({ link: tie.__data__.id });
    expect(panel.textContent).not.toContain('fold:');
    expect(panel.textContent).toContain('Ethereum side');
    g.destroy();
  });

  it('a selection that disappears or moves is reported to onSelect and the panel (R-04)', () => {
    const onSelect = vi.fn();
    const folds = [{ id: 'eth-side', label: 'Ethereum side', anchor: 'eth', members: ['eth', 'binance'] }];
    const g = new Graph('#chart', opts({ onSelect, folds })).setData(trace);
    g.select('binance');
    onSelect.mockClear();
    g.collapse('eth-side');                         // binance folds away → the fold is selected
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ node: expect.objectContaining({ id: 'fold:eth-side' }) }));
    g.expand('eth-side');
    g.select('osmo');
    onSelect.mockClear();
    g.setFilter(n => n.id !== 'osmo');              // the selected node is filtered out
    expect(onSelect).toHaveBeenLastCalledWith({ node: null, link: null, event: null });
    g.destroy();
  });

  it('a selected tie survives folding: it follows into the merged tie (R-04)', () => {
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'] }];
    const g = new Graph('#chart', opts({ folds })).setData(trace);
    const tie = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.source === 'osmo' && p.__data__.target === 'eth');
    g.select({ link: tie.__data__.id });
    g.collapse('eth-side');
    const sel = host.querySelectorAll('.rc-flow-link[stroke-opacity="1"]');
    expect(sel).toHaveLength(1);
    expect(sel[0].__data__.target).toBe('fold:eth-side');
    g.destroy();
  });

  it('select() of a folded member selects its fold; an unknown id fades nothing (R-05)', () => {
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'], collapsed: true }];
    const g = new Graph('#chart', opts({ folds })).setData(trace);
    g.select('binance');
    expect(host.querySelector('.rc-flow-node.is-selected').__data__.id).toBe('fold:eth-side');
    g.clearSelection();
    g.select('nowhere');
    const faded = [...host.querySelectorAll('.rc-flow-node')].filter(n => n.style.opacity === '0.15');
    expect(faded).toHaveLength(0);
    g.destroy();
  });

  it('an open fold whose anchor is filtered out keeps its − switch on a member still drawn (R-07)', () => {
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'] }];
    const g = new Graph('#chart', opts({ folds })).setData(trace);
    g.setFilter(n => n.id !== 'eth');
    expect(host.querySelectorAll('.rc-flow-fold-switch')).toHaveLength(1);
    g.collapse('eth-side');
    expect(g.isCollapsed('eth-side')).toBe(true);
    g.destroy();
  });

  it('expanding a selected fold moves the selection to its anchor and tells onSelect (R-04)', () => {
    const onSelect = vi.fn();
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'], collapsed: true }];
    const g = new Graph('#chart', opts({ onSelect, folds })).setData(trace);
    g.select('fold:eth-side');
    onSelect.mockClear();
    g.expand('eth-side');
    expect(host.querySelector('.rc-flow-node.is-selected').__data__.id).toBe('eth');
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ node: expect.objectContaining({ id: 'eth' }) }));
    g.destroy();
  });

  it('with the anchor filtered out, expand selects and focuses the first member still drawn (R-07)', () => {
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'], collapsed: true }];
    const g = new Graph('#chart', opts({ folds })).setData(trace);
    g.setFilter(n => n.id !== 'eth');
    g.select('fold:eth-side');
    const meta = [...host.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === 'fold:eth-side');
    meta.focus();
    meta.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    expect(host.querySelector('.rc-flow-node.is-selected').__data__.id).toBe('binance');
    expect(document.activeElement.__data__?.id).toBe('binance');
    g.destroy();
  });

  it('a tie picked, merged by a fold and split again comes back as the tie picked (R-04)', () => {
    const folds = [{ id: 'eth-side', anchor: 'eth', members: ['eth', 'binance'] }];
    const g = new Graph('#chart', opts({ folds })).setData({
      nodes: trace.nodes,
      // the neighbour comes first: a split must not settle on it
      links: [{ id: 'to-binance', from: 'osmo', to: 'binance', asset: 'ETH', value: 5 }, ...trace.links],
    });
    const picked = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.source === 'osmo' && p.__data__.target === 'eth');
    picked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const selectedTie = () => [...host.querySelectorAll('.rc-flow-link')].filter(p => p.getAttribute('stroke-opacity') === '1');
    g.collapse('eth-side');
    expect(selectedTie()).toHaveLength(1);
    expect(selectedTie()[0].__data__.id).toMatch(/^agg:/);           // two ties merged into the fold's tie
    g.expand('eth-side');
    expect(selectedTie().map(p => p.__data__.id)).toEqual([picked.__data__.id]);
    g.destroy();
  });

  it('a selected tie the filter removes empties the details panel (R-04)', () => {
    const g = new Graph('#chart', opts({ details: true })).setData(trace);
    const tie = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.target === 'binance');
    g.select({ link: tie.__data__.id });
    expect(host.querySelector('.rc-graph-details').textContent).toContain('Binance');
    g.setFilter(n => n.id !== 'binance');
    expect(host.querySelector('.rc-graph-details').textContent).not.toContain('Binance');
    g.destroy();
  });

  it('onSelect may change the chart: a re-render from it leaves a working select() (R-04)', () => {
    let g;
    const onSelect = ({ node, link }) => { if (!node && !link) g.setFilter(null); };
    g = new Graph('#chart', opts({ onSelect })).setData(trace);
    g.select('eth');
    g.setFilter(n => n.id !== 'eth');               // drops the selection → onSelect clears the filter
    g.select('eth');
    expect(host.querySelector('.rc-flow-node.is-selected')?.__data__.id).toBe('eth');
    g.destroy();
  });

  it('setData with an empty trace reports the cleared selection; select() then finds nothing (R-04)', () => {
    const onSelect = vi.fn();
    const g = new Graph('#chart', opts({ onSelect, details: true })).setData(trace);
    g.select('osmo');
    onSelect.mockClear();
    g.setData({ nodes: [], links: [] });
    expect(onSelect).toHaveBeenCalledWith({ node: null, link: null, event: null });
    onSelect.mockClear();
    g.select('osmo');
    expect(onSelect).not.toHaveBeenCalled();
    expect(host.querySelector('.rc-graph-details').textContent).not.toContain('Osmosis');
    g.destroy();
  });

  it('the details panel names a tie by its linkColorBy category (R-01)', () => {
    const g = new Graph('#chart', opts({ details: true, linkTypes: { ETH: { color: '#123456', label: 'Ether' } } })).setData(trace);
    const tie = [...host.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.asset === 'ETH');
    g.select({ link: tie.__data__.id });
    expect(host.querySelector('.rc-graph-details').textContent).toContain('Ether');
    g.destroy();
  });

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
    // labels only for ties inside the window
    const labelled = [...host.querySelectorAll('.rc-flow-link-label')].map(t => t.__data__);
    expect(labelled.every(l => !l._dim)).toBe(true);
    expect(labelled.map(l => l.target).filter(id => ['eth', 'binance', 'poison'].includes(id))).toEqual([]);
  });

  it('tie labels never sit on a node shape or caption, and render above the nodes', async () => {
    const g = new Graph('#chart', opts({ hulls: [] })).setData(trace);
    await g.whenReady();
    const labels = [...host.querySelectorAll('.rc-flow-link-label')];
    expect(labels.length).toBeGreaterThan(0);
    const nodes = [...host.querySelectorAll('.rc-flow-node')].map(n => {
      const [, x, y] = /translate\(([-\d.]+),([-\d.]+)\)/.exec(n.getAttribute('transform'));
      return { x: +x, y: +y };
    });
    labels.forEach(t => {
      const x = +t.getAttribute('x'), y = +t.getAttribute('y');
      nodes.forEach(p => {
        const onShape = Math.abs(x - p.x) < 18 && y + 4 > p.y - 18 && y - 13 < p.y + 18;
        expect(onShape).toBe(false);
      });
    });
    const layers = [...host.querySelectorAll('.rc-flow > g')].map(g => g.getAttribute('class'));
    expect(layers.indexOf('rc-flow-link-labels')).toBeGreaterThan(layers.indexOf('rc-flow-nodes'));
  });

  it('the legend lists only tie categories the filter lets through', async () => {
    const g = new Graph('#chart', opts({
      linkColorBy: l => (l.noise ? 'noise' : l.asset),
      linkTypes: { ATOM: { color: '#6c58b5' }, ETH: { color: '#3d4a5c' }, noise: { color: '#c2410c', label: 'poisoning' } },
    })).setData(trace);
    await g.whenReady();
    const legendText = () => host.querySelector('.rc-graph-legend').textContent;
    expect(legendText()).toContain('poisoning');
    g.setFilter(item => !item.noise);
    expect(legendText()).not.toContain('poisoning');
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

describe('Graph view: flow — hiddenLinkTypes', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });
  const data = {
    nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'decoy', lane: 'y', row: 1 }],
    links: [
      { source: 'a', target: 'b', type: 'eth' },
      { source: 'a', target: 'decoy', type: 'noise' },
    ],
  };

  it('starts the category hidden, hides its orphaned node, and keeps it in the legend', async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { view: 'flow', duration: 0, hiddenLinkTypes: ['noise'],
      linkTypes: { eth: { color: '#333', label: 'ETH' }, noise: { color: '#c00', label: 'poisoning' } } }).setData(data);
    await g.whenReady();
    const ids = () => [...host.querySelectorAll('.rc-flow-node')].map(n => n.__data__.id).sort();
    expect(ids()).toEqual(['a', 'b']);
    expect(host.querySelectorAll('.rc-flow-link')).toHaveLength(1);
    const item = [...host.querySelectorAll('.rc-graph-legend button')].find(b => b.textContent === 'poisoning');
    expect(item.getAttribute('aria-pressed')).toBe('false');
    item.click();
    expect(ids()).toEqual(['a', 'b', 'decoy']);
    expect(host.querySelectorAll('.rc-flow-link')).toHaveLength(2);
  });

  it("a hidden category whose ties the page's filter removes is not offered in the legend", async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { view: 'flow', duration: 0, hiddenLinkTypes: ['noise'],
      linkTypes: { noise: { label: 'poisoning' } } }).setData(data);
    await g.whenReady();
    g.setFilter(item => item.id !== 'decoy');
    expect(host.querySelector('.rc-graph-legend').textContent).not.toContain('poisoning');
  });
});

// ─── Graph flow view: folds, lane cap, time navigation ─────────────────────────

// A sale with two crowd backers, for folds, the lane cap and time navigation.
const crowdTrace = {
  nodes: [
    { id: 'w', label: 'Wallet', lane: 'a' },
    { id: 'sale', label: 'Sale', lane: 'b' },
    { id: 'p1', label: 'Backer 1', lane: 'b', crowd: true },
    { id: 'p2', label: 'Backer 2', lane: 'b', crowd: true },
    { id: 'x', label: 'Exchange', lane: 'c' },
  ],
  links: [
    { from: 'w', to: 'sale', value: 1, start: '2024-01-01', end: '2024-01-02' },
    { from: 'p1', to: 'sale', value: 10, start: '2024-01-03', end: '2024-01-04' },
    { from: 'p2', to: 'sale', value: 20, start: '2024-01-03', end: '2024-01-05' },
    { from: 'sale', to: 'x', value: 30, start: '2024-02-01', end: '2024-02-10' },
  ],
};
const mkGraph = (opts = {}) => track(new Graph(mount(null), {
  view: 'flow', height: 500, lanes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], ...opts,
}));
const nodeIds = g => [...g.container.querySelectorAll('.rc-flow-node')].map(n => n.__data__.id);

describe('Graph flow — folds', () => {
  const folds = [{ id: 'sale', label: 'Sale', anchor: 'sale', members: n => n.crowd || n.id === 'sale' }];

  it('draws − on an open fold\'s anchor; collapse() swaps in the + meta-node and fires onFoldChange', () => {
    const onFoldChange = vi.fn();
    const g = mkGraph({ folds, onFoldChange }).setData(crowdTrace);
    expect(g.container.querySelectorAll('.rc-flow-fold-switch')).toHaveLength(1);
    expect(g.container.querySelector('.rc-flow-node[aria-expanded="true"]').__data__.id).toBe('sale');
    g.collapse('sale');
    expect(g.isCollapsed('sale')).toBe(true);
    expect(nodeIds(g).sort()).toEqual(['fold:sale', 'w', 'x']);
    expect(g.container.querySelector('.rc-flow-node[aria-expanded="false"]').__data__.sub).toBe('3 nodes');
    expect(onFoldChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'sale', collapsed: true }));
    g.expand('sale');
    expect(nodeIds(g)).toHaveLength(5);
  });

  it('starts collapsed with collapsed: true, and the switch toggles it', () => {
    const g = mkGraph({ folds: [{ ...folds[0], collapsed: true }] }).setData(crowdTrace);
    expect(nodeIds(g)).toContain('fold:sale');
    g.container.querySelector('.rc-flow-fold-switch').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(g.isCollapsed('sale')).toBe(false);
    expect(nodeIds(g)).toContain('p1');
  });

  it('keeps the selection: a selected member becomes the meta-node, and back to the anchor', () => {
    const onSelect = vi.fn();
    const g = mkGraph({ folds, onSelect }).setData(crowdTrace);
    g.select('p1');
    g.collapse('sale');
    expect(g.container.querySelector('.rc-flow-node.is-selected').__data__.id).toBe('fold:sale');
    g.expand('sale');
    expect(g.container.querySelector('.rc-flow-node.is-selected').__data__.id).toBe('sale');
  });

  it('+ and − keys on the node fold and unfold', () => {
    const g = mkGraph({ folds }).setData(crowdTrace);
    const anchor = () => [...g.container.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === 'sale' || n.__data__.id === 'fold:sale');
    anchor().dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
    expect(g.isCollapsed('sale')).toBe(true);
    anchor().dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    expect(g.isCollapsed('sale')).toBe(false);
  });

  it('laneCap folds the lightest nodes of a crowded lane into "+N more"', () => {
    const g = mkGraph({ laneCap: 2 }).setData(crowdTrace);
    const meta = [...g.container.querySelectorAll('.rc-flow-node')].map(n => n.__data__).find(n => n.fold);
    expect(meta).toMatchObject({ id: 'fold:lane:b', label: '+2 more' });
    // cap 2 = the heaviest node (sale) + the fold of the rest
    expect(meta.members.map(m => m.id).sort()).toEqual(['p1', 'p2']);
    g.expand('lane:b');
    expect(nodeIds(g)).toHaveLength(5);
  });

  it('aggregateLinks lists the merged ties in the tooltip', () => {
    const g = mkGraph({ aggregateLinks: true }).setData({
      nodes: crowdTrace.nodes,
      links: [...crowdTrace.links, { from: 'w', to: 'sale', value: 2, label: 'second' }],
    });
    const ties = [...g.container.querySelectorAll('.rc-flow-link')].map(p => p.__data__);
    const merged = ties.find(l => l.source === 'w');
    expect(merged.links).toHaveLength(2);
    expect(merged.value).toBe(3);
  });
});

describe('Graph flow — time navigation', () => {
  it('derives the data extent from the ties and an overview of active ties per day', () => {
    const g = mkGraph({ navigator: true }).setData(crowdTrace);
    const [a, b] = g._getDataExtent();
    expect(a.toISOString().slice(0, 10)).toBe('2024-01-01');
    expect(b.toISOString().slice(0, 10)).toBe('2024-02-10');
    const series = g._getNavigatorData();
    expect(series[0].value).toBe(1);
    expect(series.find(d => d.date.toISOString().startsWith('2024-01-03')).value).toBe(2);
    // the strip spans the data exactly, so a full view ends at its right edge
    expect(+series[0].date).toBe(+a);
    expect(+series[series.length - 1].date).toBe(+b);
    expect(g.container.querySelector('.rc-chart-navigator')).not.toBeNull();
  });

  it('timeframes dim ties outside the period; setTimeWindow moves the view and the buttons follow', () => {
    const onViewChange = vi.fn();
    const g = mkGraph({
      timeframes: [{ key: 'jan', label: 'January', range: ['2024-01-01', '2024-01-31'] }, 'ALL'],
    }).setData(crowdTrace);
    g.onViewChange(onViewChange);
    const dimmed = () => [...g.container.querySelectorAll('.rc-flow-link')]
      .filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.source);
    expect(dimmed()).toEqual([]);
    g.setTimeframe('jan');
    expect(dimmed()).toEqual(['sale']);
    expect(g.container.querySelector('.rc-range-btn.active').textContent).toBe('January');
    expect(onViewChange).toHaveBeenCalled();
    g.setTimeWindow('2024-02', null);
    expect(dimmed().sort()).toEqual(['p1', 'p2', 'w']);
    expect(g.container.querySelector('.rc-range-btn.active')).toBeNull();
    g.setTimeWindow();
    expect(dimmed()).toEqual([]);
    expect(g.container.querySelector('.rc-range-btn.active').textContent).toBe('ALL');
  });

  it('without timeframes or navigator setTimeWindow behaves as in stage 1', () => {
    const g = mkGraph().setData(crowdTrace);
    g.setTimeWindow('2024-02', null);
    expect(g._flow().window).toEqual({ from: '2024-02', to: null });
    expect(g.container.querySelector('.rc-chart-range-row')).toBeNull();
  });
});

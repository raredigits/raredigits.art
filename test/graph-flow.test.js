import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { mount, track, setGeometry } from './helpers.js';

// The Graph flow view in the DOM: lanes, nodes and ties drawn, selection,
// legend, filters, the details panel (stage 1), folds, the lane cap and time
// navigation (Flows II, 0.9.8_6). The layout math without a DOM is in
// flow-layout.test.js.
//
// Moved from graph-fixes-7a.test.js (RC-026):
//   'C-33: Graph callbacks stay quiet after destroy()' → same describe

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
    expect(host.querySelector('.rc-graph-legend').hasAttribute('role')).toBe(false);   // no toggles: no group
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
    // no hull: its label takes the one in-window tie label's spot (RC-074, below)
    const g = new Graph('#chart', opts({ hulls: [] })).setData(trace);
    await g.whenReady();
    g.setTimeWindow(null, '2023-12');
    const paths = [...host.querySelectorAll('.rc-flow-link')];
    const dim = paths.filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.target);
    expect(dim.sort()).toEqual(['binance', 'eth', 'poison']);
    const binance = [...host.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === 'binance');
    expect(binance.style.opacity).toBe('0.2');
    // labels only for ties inside the window: none for a tie drawn dimmed
    const labelled = [...host.querySelectorAll('.rc-flow-link-label')].map(t => t.__data__);
    const dimIds = new Set(paths.filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.id));
    expect(dimIds.size).toBe(3);
    expect(labelled.length).toBeGreaterThan(0);
    expect(labelled.filter(l => dimIds.has(l.id))).toEqual([]);
    expect(labelled.map(l => l.target).filter(id => ['eth', 'binance', 'poison'].includes(id))).toEqual([]);
  });

  // RC-074 (pinned 2026-11-18, the same in Chrome at 1280, 800, 600 and 375):
  // a hull's label is an obstacle for tie labels by design (flow.js, "Tie
  // labels"). The trace's hull label sits under Osmosis main, on the spot of
  // the osmo→pools label, so that tie leaves its label to the tooltip, with
  // or without a time window; the hull's band is not an obstacle.
  it('a hull label keeps tie labels off it: the tie under it leaves its label to the tooltip', async () => {
    const labelOf = (g, id) => {
      const t = [...host.querySelectorAll('.rc-flow-link-label')].find(el => el.__data__.source === 'osmo' && el.__data__.target === id);
      return t ? { x: +t.getAttribute('x'), y: +t.getAttribute('y'), w: t.textContent.length * 6.4 + 6 } : null;
    };
    const bare = new Graph('#chart', opts({ hulls: [] })).setData(trace);
    await bare.whenReady();
    const free = labelOf(bare, 'pools');
    expect(free).not.toBeNull();
    bare.setTimeWindow(null, '2023-12');
    expect(labelOf(bare, 'pools')).not.toBeNull();
    bare.destroy();

    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    const hull = host.querySelector('.rc-flow-hull-label');
    const hx = +hull.getAttribute('x'), hy = +hull.getAttribute('y'), hw = hull.textContent.length * 6.2;
    // the spot it takes without the hull overlaps the hull label's box
    const y1 = free.y + 1, y0 = y1 - 13;
    expect(free.x - free.w / 2 < hx + hw && free.x + free.w / 2 > hx && y0 < hy + 3 && y1 > hy - 12).toBe(true);
    expect(labelOf(g, 'pools')).toBeNull();
    g.setTimeWindow(null, '2023-12');
    expect(labelOf(g, 'pools')).toBeNull();
    expect(host.querySelectorAll('.rc-flow-link-label').length).toBe(0);
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

  it('legend: node groups as plain labels with a dot, then tie categories as toggles in their colour; Show all last', async () => {
    const g = new Graph('#chart', opts()).setData(trace);
    await g.whenReady();
    const legend = host.querySelector('.rc-graph-legend');
    expect(legend.getAttribute('role')).toBe('group');
    const shape = el => [el.localName, el.className, el.dataset.key ?? null, el.getAttribute('aria-pressed'),
      el.firstElementChild.className, el.firstElementChild.getAttribute('style'), el.lastElementChild.textContent];
    expect([...legend.children].slice(0, 4).map(shape)).toEqual([
      ['div', 'rc-legend-item rc-flow-legend-group', null, null, 'rc-legend-dot', '--rc-swatch-color: #2c5d8f;', 'Church'],
      ['div', 'rc-legend-item rc-flow-legend-group', null, null, 'rc-legend-dot', '--rc-swatch-color: #a33d36;', 'exchange'],
      ['button', 'rc-legend-item rc-graph-legend-item', 'ATOM', 'true', 'rc-legend-line', '--rc-swatch-color: #6c58b5;', 'ATOM'],
      ['button', 'rc-legend-item rc-graph-legend-item', 'ETH', 'true', 'rc-legend-line', '--rc-swatch-color: #3d4a5c;', 'ETH'],
    ]);
    // a category's derived ties (linkDash) do not make its swatch dashed;
    // a toggle's swatch is a span (the svg marks are the key's, below)
    expect(legend.querySelector('button svg, button .rc-legend-line--dashed')).toBeNull();
    const reset = legend.lastElementChild;
    expect(reset.matches('button.rc-legend-reset.rc-graph-legend-reset')).toBe(true);
    expect(reset.hidden).toBe(true);
    // groups 2, categories 2, the key's three shapes (RC-053), Show all
    expect(legend.children).toHaveLength(8);
    const atom = legend.querySelector('button[data-key="ATOM"]');
    expect(atom.dataset.type).toBe('ATOM');                   // the K-06 alias until 0.9.9
    atom.click();
    expect(count('.rc-flow-link')).toBe(4);
    expect(atom.getAttribute('aria-pressed')).toBe('false');
    expect(reset.hidden).toBe(false);
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
    // a flow graph with a data source behind it can walk to an ego view
    const g = new Graph('#chart', opts({ dataSource: memorySource(trace) })).setData(trace);
    await g.whenReady();
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

  it("a hidden category whose ties the page's filter removes is not offered in the legend; Show all still clears it", async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { view: 'flow', duration: 0, hiddenLinkTypes: ['noise'],
      linkTypes: { noise: { label: 'poisoning' } } }).setData(data);
    await g.whenReady();
    g.setFilter(item => item.id !== 'decoy');
    expect(host.querySelector('.rc-graph-legend').textContent).not.toContain('poisoning');
    // something is off, listed or not: Show all shows, and shows everything
    const reset = host.querySelector('.rc-graph-legend .rc-legend-reset');
    expect(reset.hidden).toBe(false);
    reset.click();
    expect(reset.hidden).toBe(true);
    g.setFilter(null);
    expect(host.querySelectorAll('.rc-flow-link')).toHaveLength(2);
  });

  it('stays hidden across setData, also while the trace lacks it', async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { view: 'flow', duration: 0, hiddenLinkTypes: ['noise'] }).setData(data);
    g.setData({ nodes: data.nodes, links: [data.links[0]] });
    expect(host.querySelector('.rc-graph-legend .rc-legend-reset').hidden).toBe(true);   // nothing off here
    g.setData(data);
    expect(host.querySelectorAll('.rc-flow-link')).toHaveLength(1);
    expect(host.querySelector('.rc-graph-legend button[data-key="noise"]').getAttribute('aria-pressed')).toBe('false');
  });
});

// ─── Graph flow view: the legend's gestures and setLinkTypesVisible ────────────
// The flow legend's tie categories are toggles of the one legend builder
// (core/legend.js); its state is the chart's hidden set, which hiddenLinkTypes
// seeds and setLinkTypesVisible sets (K-05: visibility, as on MapFlow).

describe('Graph view: flow — legend gestures and setLinkTypesVisible (D-04, K-05)', () => {
  const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
  const doubleClick = node => {
    click(node, 1);
    click(node, 2);
    node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
  };
  const three = {
    nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'c', lane: 'y', row: 1 }, { id: 'd', lane: 'y', row: 2 }],
    links: [
      { source: 'a', target: 'b', type: 'eth' },
      { source: 'a', target: 'c', type: 'atom' },
      { source: 'a', target: 'd', type: 'noise' },
    ],
  };
  const flow = (options = {}) => {
    const host = mount();
    const g = track(new Graph(host, { view: 'flow', duration: 0, ...options })).setData(three);
    return { host, g };
  };
  const item = (host, key) => host.querySelector(`.rc-graph-legend button.rc-legend-item[data-key="${key}"]`);
  const resetOf = host => host.querySelector('.rc-graph-legend .rc-legend-reset');
  const drawn = host => [...host.querySelectorAll('.rc-flow-link')].map(p => p.__data__.type).sort();

  it('a click hides a category; a pointer hide waits for a second click; a double click keeps one in one redraw, a second brings all back', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { host, g } = flow();
      const render = vi.spyOn(g, 'render');
      click(item(host, 'eth'));
      expect(drawn(host)).toEqual(['atom', 'noise']);
      click(item(host, 'eth'));
      expect(drawn(host)).toEqual(['atom', 'eth', 'noise']);
      click(item(host, 'eth'), 1);
      expect(drawn(host)).toEqual(['atom', 'eth', 'noise']);         // waiting for a second click
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      expect(drawn(host)).toEqual(['atom', 'noise']);
      click(item(host, 'eth'), 1);                                    // a show: at once
      const n = render.mock.calls.length;
      doubleClick(item(host, 'atom'));
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      expect(render.mock.calls.length - n).toBe(1);                   // one redraw, no flash
      expect(drawn(host)).toEqual(['atom']);
      expect([...host.querySelectorAll('.rc-flow-node')].map(el => el.__data__.id).sort()).toEqual(['a', 'c']);
      doubleClick(item(host, 'atom'));
      expect(drawn(host)).toEqual(['atom', 'eth', 'noise']);
      click(item(host, 'noise'));
      click(resetOf(host));
      expect(drawn(host)).toEqual(['atom', 'eth', 'noise']);
      expect(resetOf(host).hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('onLegendToggle after the redraw, visibleNames in data order; setLinkTypesVisible stays silent', () => {
    const calls = [];
    let host;
    const onLegendToggle = vi.fn(function (info) { calls.push({ info, drawn: drawn(host), self: this }); });
    const made = flow({ onLegendToggle });
    host = made.host;
    const { g } = made;
    click(item(host, 'atom'));
    doubleClick(item(host, 'noise'));
    click(resetOf(host));
    g.setLinkTypesVisible(['eth']);
    g.setLinkTypesVisible(null);
    expect(calls).toEqual([
      { info: { name: 'atom', visible: false, visibleNames: ['eth', 'noise'] }, drawn: ['eth', 'noise'], self: g },
      { info: { name: 'noise', visible: true, visibleNames: ['noise'] }, drawn: ['noise'], self: g },
      { info: { name: null, visible: true, visibleNames: ['eth', 'atom', 'noise'] }, drawn: ['atom', 'eth', 'noise'], self: g },
    ]);
  });

  it('setLinkTypesVisible(list | null): only those categories, as the legend shows; null all; a name the trace lacks drops', () => {
    const { host, g } = flow({ hiddenLinkTypes: ['gone'] });
    expect(g.setLinkTypesVisible(['eth', 'noise'])).toBe(g);
    expect(drawn(host)).toEqual(['eth', 'noise']);
    expect(item(host, 'atom').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(host).hidden).toBe(false);
    g.setLinkTypesVisible('atom');
    expect(drawn(host)).toEqual(['atom']);
    g.setLinkTypesVisible(null);
    expect(drawn(host)).toEqual(['atom', 'eth', 'noise']);
    expect(resetOf(host).hidden).toBe(true);
    // 'gone' was hidden while absent; a list is read against the trace, so it drops
    g.setLinkTypesVisible(['eth', 'atom', 'noise']);
    g.setData({ nodes: three.nodes, links: [...three.links, { source: 'b', target: 'c', type: 'gone' }] });
    expect(drawn(host)).toEqual(['atom', 'eth', 'gone', 'noise']);
  });

  it('hiding the selected tie\'s category clears the selection, and onSelect hears it', () => {
    const onSelect = vi.fn();
    const { host, g } = flow({ onSelect });
    g.select({ link: 'a→c#0' });
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ link: expect.objectContaining({ type: 'atom' }) }));
    click(item(host, 'atom'));
    expect(onSelect).toHaveBeenLastCalledWith({ node: null, link: null, event: null });
  });

  it('legendInteractive: false lists the categories drawn as plain labels; no Show all', () => {
    const { host } = flow({ legendInteractive: false, hiddenLinkTypes: ['noise'] });
    const legend = host.querySelector('.rc-graph-legend');
    expect([...legend.children].map(el => [el.localName, el.dataset.key])).toEqual([['div', 'eth'], ['div', 'atom']]);
    expect(legend.hasAttribute('role')).toBe(false);
    expect(drawn(host)).toEqual(['atom', 'eth']);
  });

  it('a category\'s own dash shows in its swatch (its first pair); a dash the drawing draws solid is a plain line', () => {
    const { host, g } = flow({ linkTypes: {
      eth: { color: '#333333', dash: '2 3 4 5' }, atom: { color: '#444444', dash: 'dashed' },
      noise: { color: '#555555', dash: '0' }, odd: { color: '#666666', dash: '4 x' }, px: { color: '#777777', dash: '5px,1px' },
    } });
    g.setData({ nodes: three.nodes, links: [...three.links,
      { source: 'b', target: 'c', type: 'odd' }, { source: 'c', target: 'd', type: 'px' }] });
    const swatch = key => item(host, key).firstElementChild;
    expect(swatch('eth').className).toBe('rc-legend-line rc-legend-line--dashed');
    expect(swatch('eth').getAttribute('style')).toBe('--rc-swatch-color: #333333; --rc-swatch-dash: 2px; --rc-swatch-gap: 3px;');
    // a word, a zero length, a list with a word in it: drawn solid, shown solid
    expect(['atom', 'noise', 'odd'].map(key => swatch(key).className)).toEqual(['rc-legend-line', 'rc-legend-line', 'rc-legend-line']);
    // lengths in px are lengths: dashed (the swatch's own dash then falls back to 5/3)
    expect(swatch('px').className).toBe('rc-legend-line rc-legend-line--dashed');
  });

  it('the header `legend` of a Graph stays a caption: it names no tie category', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host } = flow({ legend: [{ label: 'eth' }, { label: 'Source: chain data' }] });
    const header = host.querySelector('.rc-chart-header .rc-legend');
    expect([...header.children].map(el => [el.localName, el.dataset.key ?? null])).toEqual([['div', null], ['div', null]]);
    expect(header.querySelector('.rc-legend-reset')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(item(host, 'eth')).not.toBeNull();                         // the type legend has its toggle
  });
});

// ─── Graph flow view: the key to the drawing (RC-053) ──────────────────────────
// After the tie categories the flow legend carries a key: static rows for the
// node shapes, named by the kinds that draw them, and — only when the page
// gives the words (legendSymbols) — for the dashed ties and the tie width.

describe('Graph view: flow — the key to node shapes, dashes and width (RC-053, legendSymbols)', () => {
  const make = (options, data = trace) => {
    const host = mount(null);
    const g = track(new Graph(host, options)).setData(data);
    return { host, g };
  };
  const legendOf = host => host.querySelector('.rc-graph-legend');
  // the key's rows: plain labels that are neither a node group nor a category
  const keyRows = host => [...legendOf(host).children].filter(el =>
    el.localName === 'div' && !el.classList.contains('rc-flow-legend-group') && !el.hasAttribute('data-key'));
  const glyph = el => {
    const sw = el.firstElementChild;
    if (sw.localName !== 'svg') {
      return [sw.className, sw.style.getPropertyValue('--rc-swatch-dash'), sw.style.getPropertyValue('--rc-swatch-gap')].join(' ').trim();
    }
    return `svg ${sw.getAttribute('width')}×${sw.getAttribute('height')} ${[...sw.children].map(p => p.localName).join('+')}`;
  };
  const rows = host => keyRows(host).map(el => [glyph(el), el.lastElementChild.textContent]);
  const labels = host => rows(host).map(r => r[1]);

  it('by default a row per node shape drawn, named by its kind, in nodeShapes order, after the categories; Show all stays last', () => {
    // the trace: wallet, contract, exchange — linkDash dashes a tie and ties carry values, but no words: no such rows
    const { host } = make(opts());
    expect(rows(host)).toEqual([
      ['svg 12×12 circle', 'wallet'],
      ['svg 12×12 rect', 'contract'],
      ['svg 12×12 path', 'exchange'],
    ]);
    const legend = legendOf(host);
    const kids = [...legend.children];
    expect(kids.indexOf(keyRows(host)[0])).toBe(kids.indexOf(legend.querySelector('button[data-key="ETH"]')) + 1);
    expect(legend.lastElementChild.matches('.rc-legend-reset')).toBe(true);
    // plain labels, no alias class; the mark in the muted text colour (theme.muted)
    keyRows(host).forEach(el => {
      expect(el.className).toBe('rc-legend-item');
      expect(el.firstElementChild.getAttribute('style')).toBe('--rc-swatch-color: var(--rc-muted, #666666);');
    });
  });

  it("a row's glyph is the shape its nodes are drawn with, at nodeRadius — an SVG path from nodeShapes too", () => {
    const path = 'M0,-12L12,12L-12,12z';
    const { host } = make(opts({ nodeRadius: 14, nodeShapes: { wallet: 'circle', contract: path, exchange: 'diamond', crowd: 'stack' } }),
      { nodes: [...trace.nodes, { id: 'crowd', group: 'noise', kind: 'crowd', net: 'osmosis', row: -1 }], links: trace.links });
    const shapeOf = id => [...host.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === id)
      .querySelectorAll('.rc-flow-node-shape');
    const geometry = list => [...list].map(el => [el.localName,
      ...['r', 'cx', 'cy', 'x', 'y', 'width', 'height', 'rx', 'd', 'opacity'].map(a => el.getAttribute(a))]);
    const glyphs = keyRows(host).map(el => el.firstElementChild);
    expect(labels(host)).toEqual(['wallet', 'contract', 'exchange', 'crowd']);
    expect(geometry(glyphs[0].children)).toEqual(geometry(shapeOf('osmo')));
    expect(geometry(glyphs[1].children)).toEqual(geometry(shapeOf('pools')));
    expect(glyphs[1].firstElementChild.getAttribute('d')).toBe(path);
    expect(geometry(glyphs[2].children)).toEqual(geometry(shapeOf('binance')));
    expect(geometry(glyphs[3].children)).toEqual(geometry(shapeOf('crowd')));   // two circles
    // the viewBox holds a node of that radius
    expect(glyphs[0].getAttribute('viewBox')).toBe('-18 -18 36 36');
  });

  it('legendSymbols: shapes renames or leaves out a kind; dash and width add their rows, in that order, with their words', () => {
    const { host } = make(opts({ legendSymbols: {
      shapes: { wallet: 'address', exchange: false }, dash: 'derived amount', width: 'value in USD',
    } }));
    expect(rows(host)).toEqual([
      ['svg 12×12 circle', 'address'],
      ['svg 12×12 rect', 'contract'],
      ['rc-legend-line rc-legend-line--dashed 6px 5px', 'derived amount'],
      ['svg 16×12 path', 'value in USD'],
    ]);
    // the dash row shows the dash the drawing gives a tie linkDash marks
    const derived = [...host.querySelectorAll('.rc-flow-link')].find(p => p.__data__.basis === 'derived');
    expect(derived.getAttribute('stroke-dasharray')).toBe('6 5');
    keyRows(host).slice(2).forEach(el => expect(el.firstElementChild.getAttribute('style')).toMatch(/^--rc-swatch-color: var\(--rc-muted, #666666\);/));
    // kinds given one label share a row
    const merged = make(opts({ legendSymbols: { shapes: { contract: 'wallet' } },
      nodeShapes: { wallet: 'circle', contract: 'circle', exchange: 'diamond' } })).host;
    expect(rows(merged)).toEqual([['svg 12×12 circle', 'wallet'], ['svg 12×12 path', 'exchange']]);
  });

  it('no dash row without a tie linkDash dashes, no width row without a width value; empty words are none', () => {
    const words = { legendSymbols: { dash: 'derived', width: 'USD' } };
    const shapes = ['wallet', 'contract', 'exchange'];
    // no linkDash; no tie with a value
    const bare = { nodes: trace.nodes, links: trace.links.map(({ value, ...l }) => l) };
    expect(labels(make(opts({ ...words, linkDash: undefined }), bare).host)).toEqual(shapes);
    // a category with its own dash draws its ties with it, not linkDash's
    const own = make(opts({ ...words, linkTypes: { ATOM: { color: '#6c58b5' }, ETH: { color: '#3d4a5c', dash: '2 2' } } })).host;
    expect(labels(own)).toEqual([...shapes, 'USD']);
    // the width channel is linkWidth.by
    expect(labels(make(opts({ ...words, linkWidth: { by: 'count' } })).host)).toEqual([...shapes, 'derived']);
    expect(labels(make(opts({ legendSymbols: { shapes: { wallet: '' }, dash: '', width: '' } })).host)).toEqual(shapes);
  });

  it('legendSymbols: false leaves the key out; shapes: false only the shape rows', () => {
    expect(keyRows(make(opts({ legendSymbols: false })).host)).toEqual([]);
    expect(rows(make(opts({ legendSymbols: { shapes: false, dash: 'derived' } })).host))
      .toEqual([['rc-legend-line rc-legend-line--dashed 6px 5px', 'derived']]);
  });

  it('shape rows only when the nodes draw two or more shapes; kinds sharing a shape share a row; nodeShapes order first', () => {
    const flow = { view: 'flow', duration: 0 };
    const node = (id, kind) => ({ id, lane: 'x', kind });
    // one shape: 'mixer' is no built-in shape, so a circle like the wallet
    expect(rows(make(flow, { nodes: [node('a', 'wallet'), node('b', 'mixer')], links: [] }).host)).toEqual([]);
    // a node without a kind is a circle too: next to a square, two shapes, one row; an empty kind is no kind
    expect(rows(make(flow, { nodes: [node('a'), node('b', 'square')], links: [] }).host)).toEqual([['svg 12×12 rect', 'square']]);
    expect(rows(make(flow, { nodes: [node('a', ''), node('b', 'square')], links: [] }).host)).toEqual([['svg 12×12 rect', 'square']]);
    // shapeBy as a function; 'hexagon' is no shape, so mixer draws a circle and joins the wallet's row
    const { host } = make({ ...flow, shapeBy: n => n.role, nodeShapes: { exchange: 'diamond', wallet: 'circle', mixer: 'hexagon' } }, {
      nodes: [{ id: 'a', lane: 'x', role: 'square' }, { id: 'b', lane: 'x', role: 'mixer' }, { id: 'c', lane: 'y', role: 'wallet' },
        { id: 'd', lane: 'y', role: 'exchange' }, { id: 'e', lane: 'y', role: 'wallet' }],
      links: [],
    });
    expect(rows(host)).toEqual([
      ['svg 12×12 path', 'exchange'],
      ['svg 12×12 circle', 'wallet, mixer'],
      ['svg 12×12 rect', 'square'],
    ]);
    expect(host.querySelector('.rc-flow-node path[d="hexagon"]')).toBeNull();
  });

  it("the key reads what the page's filter lets through — not the legend's hiding, the folds or the time window", () => {
    const { host, g } = make(opts({ legendSymbols: { dash: 'derived' } }));
    const before = keyRows(host);
    expect(labels(host)).toEqual(['wallet', 'contract', 'exchange', 'derived']);
    // ATOM alone: Binance (the exchange) and the derived tie leave the drawing; the key stays, element for element
    g.setLinkTypesVisible(['ATOM']);
    expect(host.querySelectorAll('.rc-flow-node')).toHaveLength(2);
    expect(keyRows(host)).toHaveLength(before.length);
    keyRows(host).forEach((el, i) => expect(el).toBe(before[i]));
    g.setLinkTypesVisible(null);
    g.setTimeWindow('2023-01', '2023-12');
    expect(labels(host)).toEqual(['wallet', 'contract', 'exchange', 'derived']);
    g.setTimeWindow(null, null);
    // the page's filter takes the exchange and the derived tie out of the trace: their rows go
    g.setFilter(item => item.id !== 'binance');
    expect(labels(host)).toEqual(['wallet', 'contract']);
    // a collapsed fold draws a stack: not a kind, no row; its members' kinds stay
    const folded = make(opts({ folds: [{ id: 'f', label: 'Ethereum', anchor: 'eth', members: ['eth', 'binance', 'poison'], collapsed: true }] })).host;
    expect([...folded.querySelectorAll('.rc-flow-node')].some(n => n.__data__.id === 'fold:f')).toBe(true);
    expect(labels(folded)).toEqual(['wallet', 'contract', 'exchange']);
  });

  it('a static legend (legendInteractive: false) keeps the key', () => {
    const { host } = make(opts({ legendInteractive: false }));
    expect(labels(host)).toEqual(['wallet', 'contract', 'exchange']);
    expect(legendOf(host).querySelector('button')).toBeNull();
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

  it('the lane cap and a fold read laneBy: the meta-node stands in its anchor\'s lane (D-05)', () => {
    const byNet = { nodes: crowdTrace.nodes.map(({ lane, ...n }) => ({ ...n, net: lane })), links: crowdTrace.links };
    const g = mkGraph({ laneBy: 'net', laneCap: 2 }).setData(byNet);
    const meta = [...g.container.querySelectorAll('.rc-flow-node')].map(n => n.__data__).find(n => n.fold);
    expect(meta).toMatchObject({ id: 'fold:lane:b', label: '+2 more' });
    // no lane of its own: the declared three, and nothing for a lane-less meta-node
    expect([...g.container.querySelectorAll('.rc-flow-lane')].map(l => l.__data__.id)).toEqual(['a', 'b', 'c']);
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
    // the tooltip names the pair once, then each tie it stands for (S-13)
    const hit = [...g.container.querySelectorAll('.rc-flow-link-hit')].find(p => p.__data__.source === 'w');
    hit.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const tip = g.container.querySelector('.rc-tooltip');
    expect(tip.querySelector('.rc-tooltip-title').textContent).toBe('Wallet → Sale');
    const rows = [...tip.querySelectorAll('.rc-tooltip-body > .rc-tooltip-section')].map(s => s.textContent.replace(/\s+/g, ' ').trim());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('2024-01-01 – 2024-01-02');
    expect(rows[1]).toMatch(/second\s*2$/);
  });
});

describe('Graph flow — time navigation', () => {
  // the ties' dates are local days, the default timeZone (RC-006)
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('derives the data extent from the ties and an overview of active ties per day', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');   // what the strip is handed
    const g = mkGraph({ navigator: true }).setData(crowdTrace);
    const [a, b] = g.getView();                                 // no window set: the whole data
    expect(ymd(a)).toBe('2024-01-01');
    expect(ymd(b)).toBe('2024-02-10');
    const [series, , { extent }] = toStrip.mock.calls.at(-1);
    expect(extent.map(Number)).toEqual([+a, +b]);
    // the whole view selects the whole strip
    const strip = g.container.querySelector('.rc-chart-navigator');
    expect(+strip.querySelector('.selection').getAttribute('x')).toBe(0);
    expect(+strip.querySelector('.selection').getAttribute('width'))
      .toBeCloseTo(+strip.querySelector('.overlay').getAttribute('width'), 6);
    expect(series[0].value).toBe(1);
    expect(series.find(d => ymd(d.date) === '2024-01-03').value).toBe(2);
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
    const dimmed = () => [...g.container.querySelectorAll('.rc-flow-link')]
      .filter(p => p.getAttribute('stroke-opacity') === '0.14').map(p => p.__data__.source);
    g.setTimeWindow('2024-02', null);
    expect(dimmed().sort()).toEqual(['p1', 'p2', 'w']);           // ties ended before February
    expect(g.container.querySelector('.rc-chart-range-row')).toBeNull();
    g.setTimeWindow();
    expect(dimmed()).toEqual([]);
  });
});

// ─── C-33: Graph callbacks after destroy() ─────────────────────────────────────
// The base Chart's callbacks (onViewChange, onScaleChange): chart-base.test.js.

describe('C-33: Graph callbacks stay quiet after destroy()', () => {
  const flowData = {
    lanes: [{ id: 'l1' }, { id: 'l2' }],
    nodes: [{ id: 'a', lane: 'l1' }, { id: 'b', lane: 'l2' }, { id: 'c', lane: 'l2' }],
    links: [{ source: 'a', target: 'b', value: 1 }, { source: 'a', target: 'c', value: 2 }],
  };

  it('flow view: select() and collapse() after destroy() call neither onSelect nor onFoldChange', () => {
    const onSelect = vi.fn(), onFoldChange = vi.fn();
    const g = new Graph(mount(null), { view: 'flow', duration: 0, onSelect, onFoldChange,
      folds: [{ id: 'f', members: ['b', 'c'], collapsed: false }] }).setData(flowData);
    g.select({ node: 'a' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    g.destroy();
    g.select({ node: 'b' });
    g.collapse('f');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onFoldChange).not.toHaveBeenCalled();
  });
});

// K-16: a brush move or a legend click reuses the whole trace's layout; a
// new size places it again with the same automatic hints; the captions are
// cut all at once (the same strings fitTextNode measures — checked against
// the old code in Chrome at four sizes), and a redraw at the same size
// measures nothing.
describe('Graph flow — the layout and the captions are cached (K-16)', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  it('keeps the layout across the time window and the legend, and the hints across sizes', async () => {
    setGeometry({ width: 900, height: 500 });
    const g = track(new Graph('#chart', opts())).setData(trace);
    await g.whenReady();
    const view = g._flow();
    const first = view._layoutCache;
    expect(first.hints.size).toBeGreaterThan(0);
    g.setTimeWindow(null, '2023-12');
    g.setLinkTypesVisible(['ETH']);
    g.setFilter(item => !item.noise);
    expect(view._layoutCache).toBe(first);
    setGeometry({ width: 700, height: 500 });
    g.render();
    expect(view._layoutCache).not.toBe(first);
    expect(view._layoutCache.hints).toBe(first.hints);
    expect(view._layoutCache.whole).toBe(first.whole);
    g.collapse('owner-none');                       // no such fold: nothing changes
    expect(view._layoutCache.whole).toBe(first.whole);
    g.setData({ nodes: trace.nodes, links: trace.links.slice() });
    await g.whenReady();
    expect(view._layoutCache.whole).not.toBe(first.whole);
  });

  it('cuts the captions once: a redraw at the same size measures nothing', async () => {
    setGeometry({ width: 600, height: 500, charWidth: 12 });
    const measure = vi.spyOn(SVGElement.prototype, 'getComputedTextLength');
    const g = track(new Graph('#chart', opts())).setData(trace);
    await g.whenReady();
    const captions = () => [...document.querySelectorAll('#chart .rc-flow-node-label, #chart .rc-flow-node-sub')].map(t => t.textContent);
    const drawn = captions();
    const cut = drawn.filter(t => t.endsWith('…'));
    expect(cut.length).toBeGreaterThan(0);
    const fulls = trace.nodes.flatMap(n => [n.label, n.sub].filter(Boolean));
    cut.forEach(t => expect(fulls.some(f => f.startsWith(t.slice(0, -1)))).toBe(true));
    expect(measure).toHaveBeenCalled();
    measure.mockClear();
    g.setTimeWindow(null, '2023-12');
    g.render();
    expect(measure).not.toHaveBeenCalled();
    expect(captions()).toEqual(drawn);
  });
});

// ─── Interaction gaps (S-15) ───────────────────────────────────────────────

describe('Graph flow — interaction (S-15)', () => {
  const folds = [{ id: 'sale', label: 'Sale', anchor: 'sale', members: n => n.crowd || n.id === 'sale' }];
  const nodeEl = (g, id) => [...g.container.querySelectorAll('.rc-flow-node')].find(n => n.__data__.id === id);

  it('a click on the fold switch tells onFoldChange, with the click', () => {
    const onFoldChange = vi.fn();
    const g = mkGraph({ folds, onFoldChange }).setData(crowdTrace);
    const click = new MouseEvent('click', { bubbles: true });
    g.container.querySelector('.rc-flow-fold-switch').dispatchEvent(click);
    expect(onFoldChange).toHaveBeenCalledTimes(1);
    expect(onFoldChange.mock.calls[0][0]).toMatchObject({ id: 'sale', collapsed: true, event: click });
  });

  it('a node tooltip names the node, its group, its second line and its ties in and out', () => {
    const g = track(new Graph(mount(null), opts())).setData(trace);
    nodeEl(g, 'osmo').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const tip = g.container.querySelector('.rc-tooltip');
    expect(tip.querySelector('.rc-tooltip-title').textContent).toBe('Osmosis main');
    expect(tip.textContent).toContain('Church');                // the group's label, not its key
    expect(tip.textContent).toContain('osmo1…');
    expect(tip.textContent.replace(/\s+/g, ' ')).toContain('1 in · 2 out');
  });

  it('a fold anchor\'s tooltip says how to open it, and a collapsed fold lists its members', () => {
    const g = mkGraph({ folds }).setData(crowdTrace);
    nodeEl(g, 'sale').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(g.container.querySelector('.rc-tooltip').textContent).toContain('− collapses');
    g.collapse('sale');
    nodeEl(g, 'fold:sale').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const text = g.container.querySelector('.rc-tooltip').textContent;
    expect(text).toContain('+ expands');
    ['Sale', 'Backer 1', 'Backer 2'].forEach(name => expect(text).toContain(name));
  });

  it('setFolds replaces the folds and keeps the state of one that keeps its id; [] removes them', () => {
    const g = mkGraph({ folds }).setData(crowdTrace);
    g.collapse('sale');
    g.setFolds([...folds, { id: 'tail', anchor: 'x', members: ['x'] }]);
    expect(g.isCollapsed('sale')).toBe(true);
    expect(g.container.querySelectorAll('.rc-flow-fold-switch')).toHaveLength(2);
    g.setFolds([]);
    expect(g.container.querySelectorAll('.rc-flow-fold-switch')).toHaveLength(0);
    expect(nodeIds(g).sort()).toEqual(['p1', 'p2', 'sale', 'w', 'x']);
  });

  it('setHulls replaces the outlines; [] and null remove them', () => {
    const g = track(new Graph(mount(null), opts())).setData(trace);
    const hulls = () => [...g.container.querySelectorAll('.rc-flow-hull-label')].map(t => t.textContent);
    expect(hulls()).toEqual(['one key']);
    g.setHulls([{ id: 'eth', label: 'Ethereum side', members: ['eth', 'binance'] }]);
    expect(hulls()).toEqual(['Ethereum side']);
    g.setHulls([]);
    expect(g.container.querySelectorAll('.rc-flow-hull')).toHaveLength(0);
    g.setHulls(null);
    expect(g.container.querySelectorAll('.rc-flow-hull')).toHaveLength(0);
  });

  it('clearSelection clears a node picked by a click, and onSelect hears it', () => {
    const onSelect = vi.fn();
    const g = mkGraph({ onSelect }).setData(crowdTrace);
    nodeEl(g, 'sale').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(nodeEl(g, 'sale').classList.contains('is-selected')).toBe(true);
    g.clearSelection();
    expect(g.container.querySelector('.rc-flow-node.is-selected')).toBeNull();
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ node: null, link: null }));
  });
});

describe('Graph — clearHistory (S-15)', () => {
  it('keeps the current view only: no breadcrumbs, and the next step starts from it', async () => {
    const g = track(new Graph(mount(null), { duration: 0, height: 400 })).setData({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'a', target: 'c' }],
    });
    await g.whenReady();
    await g.focus('a').whenReady();
    await g.focus('c').whenReady();
    const crumbs = () => g.container.querySelector('.rc-graph-breadcrumbs');
    expect(crumbs().hidden).toBe(false);
    g.clearHistory();
    expect(crumbs().hidden).toBe(true);
    await g.focus('b').whenReady();
    expect([...crumbs().querySelectorAll('button')].map(b => b.textContent)).toEqual(['c', 'b']);
  });
});

// ─── A tie's label (S-19: only the DOM oracle covered these) ───────────────
// A label stands on the middle of its tie's bow, quadPoint(q, 0.5); where a
// node or its caption is in the way it steps outward, to the side the tie
// bows to, 14, 28 or 44 px (flow.js, the label placement).

describe('Graph flow — where a tie label stands (S-19)', () => {
  const quad = d => {
    const [sx, sy, cx, cy, ex, ey] = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number);
    return { s: { x: sx, y: sy }, c: { x: cx, y: cy }, e: { x: ex, y: ey } };
  };
  const midOf = ({ s, c, e }) => ({ x: 0.25 * s.x + 0.5 * c.x + 0.25 * e.x, y: 0.25 * s.y + 0.5 * c.y + 0.25 * e.y });
  // the label's anchor: its text sits 5 px above the spot placed
  const spotOf = g => {
    const t = g.container.querySelector('.rc-flow-link-label');
    return { x: +t.getAttribute('x'), y: +t.getAttribute('y') + 5 };
  };
  const tieOf = g => quad([...g.container.querySelectorAll('.rc-flow-link')].find(p => p.__data__.label).getAttribute('d'));

  it('alone, it stands on the middle of the bow', () => {
    const g = mkGraph().setData({
      nodes: [{ id: 'a', lane: 'a' }, { id: 'b', lane: 'c', row: 1 }],
      links: [{ from: 'a', to: 'b', label: 'ten' }],
    });
    const mid = midOf(tieOf(g));
    const at = spotOf(g);
    expect(at.x).toBeCloseTo(mid.x, 6);
    expect(at.y).toBeCloseTo(mid.y, 6);
  });

  it('with a node in the way, it steps outward, to the side the tie bows to', () => {
    const g = mkGraph().setData({
      // m, drawn because it has a tie of its own, stands on the row of a and
      // b; the tie runs right to left, so it bows up, away from m's caption
      nodes: [{ id: 'a', lane: 'a', row: 0 }, { id: 'm', lane: 'b', row: 0 }, { id: 'b', lane: 'c', row: 0 }],
      links: [{ from: 'b', to: 'a', label: 'ten' }, { from: 'm', to: 'b' }],
    });
    const q = tieOf(g);
    const mid = midOf(q);
    // the bow's outward side: from the chord's middle towards the control point
    const out = { x: q.c.x - (q.s.x + q.e.x) / 2, y: q.c.y - (q.s.y + q.e.y) / 2 };
    const len = Math.hypot(out.x, out.y);
    expect(len).toBeGreaterThan(0);
    const at = spotOf(g);
    const step = { x: at.x - mid.x, y: at.y - mid.y };
    const k = (step.x * out.x + step.y * out.y) / len;        // the step along the outward side
    expect([14, 28, 44].some(v => Math.abs(k - v) < 1e-6)).toBe(true);
    expect(Math.abs(step.x * out.y - step.y * out.x) / len).toBeLessThan(1e-6);   // and nothing across it
  });
});

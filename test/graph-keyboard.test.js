// K-20: keyboard access to what a Graph draws. Nodes of the ego, path and
// cluster views and the ties of the flow view are reachable: each set has
// one Tab stop (roving tabindex), arrows move between its items, Enter or
// Space acts as a click, Escape clears. Focus is visible (rare-charts.css)
// and every item has an accessible name.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { mount, track } from './helpers.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { gridStep, listStep } from '../assets/charts/src/graph/roving.js';

const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const nodesOf = host => [...host.querySelectorAll('.rc-graph-node')];
const nodeById = (host, id) => nodesOf(host).find(n => n.__data__.id === id);
const stops = els => els.filter(el => el.getAttribute('tabindex') === '0');
const focusedId = () => document.activeElement?.__data__?.id;
const tooltip = host => host.querySelector('.rc-tooltip');

// a ─ b ─ c ─ d, a ─ e, c ─ f, d ─ f
const data = {
  nodes: [
    { id: 'a', label: 'Alice', group: 'person' },
    { id: 'b', label: 'Bob', group: 'person' },
    { id: 'c', label: 'Carol', group: 'company' },
    { id: 'd', label: 'Dan', group: 'company' },
    { id: 'e', label: 'Eve', group: 'person' },
    { id: 'f', label: 'Fay', group: 'company' },
  ],
  links: [
    { source: 'a', target: 'b', type: 'work' },
    { source: 'b', target: 'c', type: 'work' },
    { source: 'c', target: 'd', type: 'deal' },
    { source: 'a', target: 'e', type: 'family' },
    { source: 'c', target: 'f', type: 'work' },
    { source: 'd', target: 'f', type: 'work' },
  ],
};

describe('K-20: ego, path and cluster nodes', () => {
  const ego = async (opts = {}) => {
    const host = mount();
    const g = track(new Graph(host, { dataSource: memorySource(data), depth: 2, duration: 0, ...opts }));
    await g.focus('a').whenReady();
    return { host, g };
  };

  it('the nodes are buttons with a name; one Tab stop — the ego centre', async () => {
    const { host } = await ego();
    const nodes = nodesOf(host);
    expect(nodes.length).toBe(4);                          // a, b, e, c
    nodes.forEach(n => expect(n.getAttribute('role')).toBe('button'));
    expect(stops(nodes).map(n => n.__data__.id)).toEqual(['a']);
    expect(nodes.filter(n => n.getAttribute('tabindex') === '-1')).toHaveLength(3);
    expect(nodeById(host, 'a').getAttribute('aria-label')).toBe('Alice — person — 2 connections — center');
    expect(nodeById(host, 'c').getAttribute('aria-label')).toBe('Carol — company — 1 connection');
  });

  it('focus shows what hover shows; blur hides it', async () => {
    const { host } = await ego({ details: true });
    nodeById(host, 'b').focus();
    expect(tooltip(host).classList.contains('is-visible')).toBe(true);
    expect(tooltip(host).textContent).toContain('Bob');
    expect(host.querySelector('.rc-graph-details h4').textContent).toBe('Bob');
    expect(nodeById(host, 'c').style.opacity).toBe('1');    // Bob's neighbour
    expect(nodeById(host, 'e').style.opacity).toBe('0.25'); // not
    nodeById(host, 'b').blur();
    expect(tooltip(host).classList.contains('is-visible')).toBe(false);
    expect(host.querySelector('.rc-graph-details h4').textContent).toBe('Alice');
  });

  it('arrows move focus and the Tab stop; ← → reach every node', async () => {
    const { host } = await ego();
    const start = nodeById(host, 'a');
    start.focus();
    const seen = new Set([focusedId()]);
    key(document.activeElement, 'Home');
    seen.add(focusedId());
    for (let i = 0; i < 6; i++) { key(document.activeElement, 'ArrowRight'); seen.add(focusedId()); }
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'e']);
    expect(stops(nodesOf(host))).toEqual([document.activeElement]);
    key(document.activeElement, 'End');
    const last = focusedId();
    key(document.activeElement, 'ArrowLeft');
    expect(focusedId()).not.toBe(last);
  });

  it('Enter recenters, as a click does, and keeps focus on the node', async () => {
    const { host, g } = await ego();
    const b = nodeById(host, 'b');
    b.focus();
    key(b, 'Enter');
    await g.whenReady();
    expect(g._root).toBe('b');
    expect(document.activeElement).toBe(nodeById(host, 'b'));
    expect(stops(nodesOf(host)).map(n => n.__data__.id)).toEqual(['b']);
    key(document.activeElement, ' ');                      // the centre: nothing to do
    await g.whenReady();
    expect(g._root).toBe('b');
  });

  it('Escape hides the tooltip and the highlight', async () => {
    const { host } = await ego();
    const b = nodeById(host, 'b');
    b.focus();
    key(b, 'Escape');
    expect(tooltip(host).classList.contains('is-visible')).toBe(false);
    nodesOf(host).forEach(n => expect(n.style.opacity).toBe('1'));
  });

  it('onNodeClick: a function gets { node, event }; null leaves a named, focusable image', async () => {
    const onNodeClick = vi.fn();
    const { host } = await ego({ onNodeClick });
    key(nodeById(host, 'e'), 'Enter');
    expect(onNodeClick).toHaveBeenCalledWith(expect.objectContaining({ node: expect.objectContaining({ id: 'e' }) }));
    const off = await ego({ onNodeClick: null });
    const n = nodeById(off.host, 'e');
    expect(n.getAttribute('role')).toBe('img');
    expect(n.getAttribute('aria-label')).toMatch(/^Eve/);
    key(n, 'Enter');
    await off.g.whenReady();
    expect(off.g._root).toBe('a');
  });

  it('cluster: Enter dives into a community; focus moves to the new ego centre', async () => {
    const { host, g } = await ego();
    await g.overview().whenReady();
    const meta = nodesOf(host)[0];
    expect(meta.getAttribute('aria-label')).toMatch(/— community of \d+ nodes$/);
    meta.focus();
    const top = meta.__data__._top;
    key(meta, 'Enter');
    await g.whenReady();
    expect(g._view).toBe('ego');
    expect(focusedId()).toBe(top);
  });

  it('path: the Tab stop is the first endpoint; the endpoints are named as such', async () => {
    const { host, g } = await ego();
    await g.connect('a', 'd').whenReady();
    const nodes = nodesOf(host);
    expect(stops(nodes).map(n => n.__data__.id)).toEqual(['a']);
    expect(nodeById(host, 'd').getAttribute('aria-label')).toMatch(/— endpoint$/);
  });

  it('gridStep: rows left to right, ↑ ↓ to the nearest node above / below', () => {
    const at = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 0, y: 50 }, d: { x: 100, y: 50 }, e: { x: 210, y: 100 } };
    const items = Object.keys(at);
    const pos = id => at[id];
    expect(gridStep(items, 'b', 'ArrowRight', pos)).toBe('c');      // wraps to the next row
    expect(gridStep(items, 'c', 'ArrowLeft', pos)).toBe('b');
    expect(gridStep(items, 'b', 'ArrowDown', pos)).toBe('d');
    expect(gridStep(items, 'd', 'ArrowUp', pos)).toBe('b');
    expect(gridStep(items, 'a', 'ArrowUp', pos)).toBeNull();
    expect(gridStep(items, 'd', 'End', pos)).toBe('e');
    expect(listStep(items, 'a', 'ArrowLeft')).toBeNull();
    expect(listStep(items, 'a', 'ArrowDown')).toBe('b');
  });
});

describe('K-20: the flow view — ties and nodes', () => {
  const trace = {
    nodes: [
      { id: 'w', label: 'Wallet', net: 'osmosis', row: 0 },
      { id: 'dex', label: 'DEX', net: 'osmosis', row: 1 },
      { id: 'eth', label: 'ETH wallet', net: 'ethereum', row: 0 },
      { id: 'cex', label: 'Exchange', net: 'ethereum', row: 1 },
    ],
    links: [
      { id: 't1', from: 'w', to: 'dex', asset: 'ATOM', value: 5, label: '5 ATOM' },
      { id: 't2', from: 'dex', to: 'w', asset: 'ETH', value: 4 },
      { id: 't3', from: 'w', to: 'eth', asset: 'ETH', value: 4, label: '0.9 ETH' },
      { id: 't4', from: 'eth', to: 'cex', asset: 'ETH', value: 3 },
    ],
  };
  const flow = (opts = {}) => {
    const host = mount();
    const g = track(new Graph(host, {
      view: 'flow', duration: 0, laneBy: 'net', layout: 'hints',
      lanes: [{ id: 'osmosis', label: 'Osmosis' }, { id: 'ethereum', label: 'Ethereum' }],
      linkColorBy: 'asset', linkTypes: { ATOM: { label: 'Atom' }, ETH: { label: 'Ether' } },
      ...opts,
    }).setData(trace));
    return { host, g };
  };
  const ties = host => [...host.querySelectorAll('.rc-flow-link-hit')];
  const flowNodes = host => [...host.querySelectorAll('.rc-flow-node')];
  const tie = (host, id) => ties(host).find(t => t.__data__.id === id);

  it('ties are named buttons with one Tab stop, before the nodes', () => {
    const { host } = flow();
    const hits = ties(host);
    hits.forEach(t => expect(t.getAttribute('role')).toBe('button'));
    expect(stops(hits)).toHaveLength(1);
    expect(tie(host, 't1').getAttribute('aria-label')).toBe('Wallet → DEX, Atom, 5 ATOM');
    expect(tie(host, 't2').getAttribute('aria-label')).toBe('DEX → Wallet, Ether');
    // the nodes: one Tab stop as well
    expect(stops(flowNodes(host))).toHaveLength(1);
    const all = [...host.querySelectorAll('[tabindex="0"]')];
    expect(all.indexOf(stops(hits)[0])).toBeLessThan(all.indexOf(stops(flowNodes(host))[0]));
  });

  it('arrows step through the ties left to right; every tie is reached', () => {
    const { host } = flow();
    stops(ties(host))[0].focus();
    const seen = [document.activeElement.__data__.id];
    for (let i = 0; i < 5; i++) {
      key(document.activeElement, 'ArrowRight');
      if (seen.at(-1) !== focusedId()) seen.push(focusedId());
    }
    expect(seen.sort()).toEqual(['t1', 't2', 't3', 't4']);
    key(document.activeElement, 'Home');
    const firstTie = focusedId();
    key(document.activeElement, 'ArrowUp');
    expect(focusedId()).toBe(firstTie);                    // nothing before the first
    expect(stops(ties(host))).toEqual([document.activeElement]);
  });

  it('focus shows the tie\'s tooltip; Enter pins it (no onSelect); Escape releases it', () => {
    const { host } = flow();
    const t3 = tie(host, 't3');
    t3.focus();
    expect(tooltip(host).classList.contains('is-visible')).toBe(true);
    expect(tooltip(host).textContent).toContain('ETH wallet');
    key(t3, 'Enter');
    expect(tooltip(host).classList.contains('is-pinned')).toBe(true);
    expect(host.querySelectorAll('.rc-flow-link')[2].getAttribute('stroke-opacity')).toBe('1');
    key(t3, 'Escape');
    expect(tooltip(host).classList.contains('is-pinned')).toBe(false);
    expect(tooltip(host).classList.contains('is-visible')).toBe(false);
  });

  it('with onSelect, Enter on a tie selects it and Escape clears, as clicks do', () => {
    const onSelect = vi.fn();
    const { host } = flow({ onSelect });
    const t4 = tie(host, 't4');
    t4.focus();
    key(t4, ' ');
    expect(onSelect.mock.calls[0][0]).toMatchObject({ node: null, link: { id: 't4' } });
    expect(tooltip(host).classList.contains('is-pinned')).toBe(false);
    key(t4, 'Escape');
    expect(onSelect.mock.calls[1][0]).toMatchObject({ node: null, link: null });
  });

  it('nodes: ↓ goes on from a lane\'s last node into the next lane, so every node is reached', () => {
    const { host } = flow();
    const nodes = flowNodes(host);
    nodes.find(n => n.__data__.id === 'w').focus();
    const seen = ['w'];
    for (let i = 0; i < 3; i++) { key(document.activeElement, 'ArrowDown'); seen.push(focusedId()); }
    expect(seen).toEqual(['w', 'dex', 'eth', 'cex']);
    key(document.activeElement, 'ArrowUp');
    expect(focusedId()).toBe('eth');
    expect(stops(flowNodes(host)).map(n => n.__data__.id)).toEqual(['eth']);
    key(document.activeElement, 'Home');
    expect(focusedId()).toBe('w');
  });

  it('the Tab stop follows the selection', () => {
    const { host, g } = flow();
    g.select('cex');
    expect(stops(flowNodes(host)).map(n => n.__data__.id)).toEqual(['cex']);
    g.select({ link: 't3' });
    g.render();
    expect(stops(ties(host)).map(t => t.__data__.id)).toEqual(['t3']);
  });
});

describe('K-20: focus is visible (rare-charts.css)', () => {
  const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
  const declsOf = selector => {
    const decls = {};
    root.walkRules(r => { if (r.selectors.includes(selector)) r.walkDecls(d => { decls[d.prop] = d.value; }); });
    return decls;
  };

  it('a graph node shows an outline on keyboard focus, as a flow node does', () => {
    expect(declsOf('.rc-graph-node:focus-visible')).toMatchObject({ outline: '2px solid currentColor' });
    expect(declsOf('.rc-graph-node:focus')).toMatchObject({ outline: 'none' });
  });

  it('a flow tie shows its hit stroke on keyboard focus', () => {
    expect(declsOf('.rc-flow-link-hit:focus-visible')).toMatchObject({ stroke: 'currentColor' });
    expect(declsOf('.rc-flow-link-hit:focus')).toMatchObject({ outline: 'none' });
  });
});

describe('K-20 follow-ups (step 7a review)', () => {
  it('destroy() while a node holds keyboard focus does not throw', async () => {
    const host = mount();
    const g = new Graph(host, { dataSource: memorySource(data), depth: 2, duration: 0 });
    await g.focus('a').whenReady();
    const el = nodeById(host, 'b');
    el.focus();
    expect(document.activeElement).toBe(el);
    const errors = [];
    const onErr = e => errors.push(e);
    window.addEventListener('error', onErr);
    expect(() => g.destroy()).not.toThrow();
    el.dispatchEvent(new FocusEvent('blur'));   // a browser fires it as the node leaves
    window.removeEventListener('error', onErr);
    expect(errors).toEqual([]);
  });

  it('a pointer action that removes the focused node does not hand keyboard focus to the new stop', async () => {
    const host = mount();
    const g = track(new Graph(host, { dataSource: memorySource(data), depth: 2, duration: 0 }));
    await g.focus('a').whenReady();
    // A browser fires blur on a focused element the redraw removes; jsdom
    // does not, so do it here.
    const removeChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child === document.activeElement || child.contains?.(document.activeElement)) {
        document.activeElement.dispatchEvent(new FocusEvent('blur'));
      }
      return removeChild.call(this, child);
    };
    try {
      const el = nodeById(host, 'e');
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // a right-click…
      el.focus();
      g.hide('e');                                                            // …that hides it
      await g.whenReady();
      expect(nodesOf(host).includes(document.activeElement)).toBe(false);
      expect(tooltip(host)?.classList.contains('is-visible') ?? false).toBe(false);
    } finally {
      Node.prototype.removeChild = removeChild;
    }
  });
});

// Graph: documented promises the code did not keep (O-10, step 6 of the
// 0.9.8_6 cleanup). Each test fails on the code before its fix.
//
//   onNodeClick: null / false   — a click does nothing (it recentred)
//   weight vs strength          — line width reads `weight` first, as the
//                                 layout, the tooltip and the model do; the
//                                 cluster view keeps its widths
//   details panel counts        — a tie listed both ways counts once outside
//                                 the flow view, as in the drawing
//   flow nodeShapes             — the map first; an unknown kind is a circle
//                                 (a kind starting with m/M drew an invisible path)
//   flow timeWindowMode 'hide'  — nodes left without ties fade, as in 'dim'
//   flow minWidth (D5)          — only the drawing scrolls sideways
//   hidden-nodes list (D7)      — Escape and × give focus back to "+N more"
//   legends (D8, R-16)          — a legend button keeps focus across the redraw
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { mount, track } from './helpers.js';

const fixture = {
  nodes: [
    { id: 'a', label: 'A', group: 'g1' },
    { id: 'b', label: 'B', group: 'g1' },
    { id: 'c', label: 'C', group: 'g2' },
    { id: 'd', label: 'D', group: 'g2' },
    { id: 'e', label: 'E', group: 'g1' },
    { id: 'f', label: 'F', group: 'g2' },
  ],
  links: [
    { source: 'a', target: 'b', type: 'professional', weight: 0.9 },
    { source: 'b', target: 'c', type: 'investment',   weight: 0.5 },
    { source: 'c', target: 'd', type: 'investment',   weight: 0.7 },
    { source: 'a', target: 'e', type: 'family',       weight: 0.8 },
    { source: 'c', target: 'f', type: 'professional', weight: 0.4 },
    { source: 'd', target: 'f', type: 'professional', weight: 0.6 },
  ],
};

const nodeEl = (host, id, cls = '.rc-graph-node') =>
  [...host.querySelectorAll(cls)].find(n => n.__data__.id === id);
const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('Graph — onNodeClick', () => {
  it.each([null, false])('onNodeClick: %s — clicking a node does not recenter', async value => {
    const host = mount();
    const g = track(new Graph(host, {
      dataSource: memorySource(fixture), depth: 1, duration: 0, onNodeClick: value,
    }));
    await g.focus('a').whenReady();
    click(nodeEl(host, 'b'));
    await g.whenReady();
    expect(g._root).toBe('a');
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
  });

  it('left out, a click recenters (the default)', async () => {
    const host = mount();
    const g = track(new Graph(host, { dataSource: memorySource(fixture), depth: 1, duration: 0 }));
    await g.focus('a').whenReady();
    click(nodeEl(host, 'b'));
    await g.whenReady();
    expect(g._root).toBe('b');
  });
});

describe('Graph — link weight and the strength alias', () => {
  const width = el => parseFloat(el.getAttribute('stroke-width'));

  it('line width follows weight when a tie also carries strength', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }).setData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b', weight: 1, strength: 0.1 }],
    }));
    await g.whenReady();
    expect(width(host.querySelector('.rc-graph-link'))).toBeCloseTo(1.4, 6);
  });

  it('strength alone still sets the width (legacy alias)', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }).setData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b', strength: 1 }],
    }));
    await g.whenReady();
    expect(width(host.querySelector('.rc-graph-link'))).toBeCloseTo(1.4, 6);
  });

  it('cluster view: width from the number of ties between communities, full at eight; the number stays as count', async () => {
    const host = mount();
    const source = {
      neighbors: async () => ({ nodes: [], links: [] }),
      paths: async () => ({ paths: [], nodes: [], links: [] }),
      aggregates: async () => ({
        communities: [
          { id: 'c0', label: 'A', size: 3, top: 'a' },
          { id: 'c1', label: 'B', size: 3, top: 'd' },
          { id: 'c2', label: 'C', size: 2, top: 'x' },
        ],
        links: [{ source: 'c0', target: 'c1', weight: 6 }, { source: 'c1', target: 'c2', weight: 12 }],
      }),
    };
    const g = track(new Graph(host, { dataSource: source, duration: 0 }));
    await g.overview().whenReady();
    const ties = [...host.querySelectorAll('.rc-graph-link')];
    const of = (s, t) => ties.find(p => p.__data__.source === s && p.__data__.target === t);
    expect(width(of('c0', 'c1'))).toBeCloseTo(1.4 * 6 / 8, 6);
    expect(width(of('c1', 'c2'))).toBeCloseTo(1.4, 6);       // saturates at eight
    expect(of('c0', 'c1').__data__.count).toBe(6);
  });
});

describe('Graph — details panel connections', () => {
  it('a tie listed in both directions counts once in the ego view, as on the drawing', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, details: true }).setData({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      links: [
        { source: 'a', target: 'b', type: 'x' },
        { source: 'b', target: 'a', type: 'x' },
      ],
    }).focus('a'));
    await g.whenReady();
    expect(host.querySelectorAll('.rc-graph-link')).toHaveLength(1);
    const panel = host.querySelector('.rc-graph-details');
    expect(panel.querySelector('dd').textContent).toBe('1');
    expect(panel.querySelectorAll('li')).toHaveLength(1);
  });

  it('the flow view keeps both directions: they are two ties there', () => {
    const host = mount();
    track(new Graph(host, { view: 'flow', duration: 0, details: true }).setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }],
      links: [{ source: 'a', target: 'b', type: 't' }, { source: 'b', target: 'a', type: 't' }],
    }).select('a'));
    expect(host.querySelector('.rc-graph-details dd').textContent).toBe('2');
  });
});

describe('Graph flow — nodeShapes', () => {
  const shapes = (host) => Object.fromEntries([...host.querySelectorAll('.rc-flow-node')].map(g => {
    const s = g.querySelector('.rc-flow-node-shape');
    return [g.__data__.id, s.tagName === 'path' ? `path:${s.getAttribute('d')}` : s.tagName];
  }));
  const data = {
    nodes: [
      { id: 'm', lane: 'x', kind: 'mixer' },
      { id: 'ms', lane: 'x', kind: 'Multisig' },
      { id: 'w', lane: 'y', kind: 'wallet' },
      { id: 'sq', lane: 'y', kind: 'square' },
    ],
    links: [{ source: 'm', target: 'w' }, { source: 'ms', target: 'sq' }],
  };

  it('a kind that is neither in nodeShapes nor a built-in shape draws a circle — never a path of its own name', () => {
    const host = mount();
    track(new Graph(host, { view: 'flow', duration: 0 }).setData(data));
    const s = shapes(host);
    expect(s).toMatchObject({ m: 'circle', ms: 'circle', w: 'circle', sq: 'rect' });
    expect(host.querySelector('path[d="mixer"], path[d="Multisig"]')).toBeNull();
  });

  it('the map is read first: an SVG path comes from it, and it can restyle a built-in name', () => {
    const host = mount();
    track(new Graph(host, {
      view: 'flow', duration: 0,
      nodeShapes: { mixer: 'M0,-10L10,10L-10,10z', square: 'diamond' },
    }).setData(data));
    const s = shapes(host);
    expect(s.m).toBe('path:M0,-10L10,10L-10,10z');
    expect(s.sq).toMatch(/^path:M0,/);                  // the diamond, not a rect
    expect(s.ms).toBe('circle');
  });
});

describe('Graph flow — timeWindowMode', () => {
  const trace = {
    nodes: [
      { id: 'osmo', net: 'osmosis' }, { id: 'pools', net: 'osmosis', row: 1 },
      { id: 'eth', net: 'ethereum' }, { id: 'binance', net: 'ethereum', row: 1 },
    ],
    links: [
      { from: 'osmo', to: 'pools', start: '2023-09' },
      { from: 'pools', to: 'osmo', start: '2023-09' },
      { from: 'osmo', to: 'eth', start: '2024-01' },
      { from: 'eth', to: 'binance', start: '2026-04' },
    ],
  };
  const opacity = (host, id) => nodeEl(host, id, '.rc-flow-node').style.opacity;

  it.each(['dim', 'hide'])("'%s': nodes whose ties are all outside the window fade", mode => {
    const host = mount();
    const g = track(new Graph(host, { view: 'flow', duration: 0, laneBy: 'net', timeWindowMode: mode }).setData(trace));
    g.setTimeWindow(null, '2023-12');
    expect(opacity(host, 'binance')).toBe('0.2');
    expect(opacity(host, 'eth')).toBe('0.2');
    expect(opacity(host, 'osmo')).toBe('1');
    expect(host.querySelectorAll('.rc-flow-link')).toHaveLength(mode === 'hide' ? 2 : 4);
  });

  it("'hide': a node without any tie stays at full strength", () => {
    const host = mount();
    const g = track(new Graph(host, { view: 'flow', duration: 0, laneBy: 'net', timeWindowMode: 'hide' })
      .setData({ ...trace, nodes: [...trace.nodes, { id: 'lone', net: 'ethereum', row: 2 }] }));
    g.setTimeWindow(null, '2023-12');
    expect(opacity(host, 'lone')).toBe('1');
  });
});

describe('Graph flow — minWidth scrolls the drawing only (D5)', () => {
  const data = { nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ source: 'a', target: 'b', start: '2024-01', end: '2024-02' }] };

  it('the svg sits in its own scrolling wrapper; the card does not scroll', () => {
    const host = mount();
    const g = track(new Graph(host, { view: 'flow', duration: 0, minWidth: 780, navigator: true, title: 'T' }).setData(data));
    const svg = g.svg.node();
    const wrap = host.querySelector(':scope > .rc-graph-scroll');
    expect(wrap).not.toBeNull();
    expect(wrap.querySelector(':scope > svg')).toBe(svg);
    expect(svg.style.minWidth).toBe('780px');
    expect(host.style.overflowX).toBe('');
    // the header, legend, navigator and footer are not in the scrolling part
    ['.rc-chart-header', '.rc-graph-legend', '.rc-chart-navigator', '.rc-chart-footer'].forEach(sel => {
      expect(host.querySelector(sel), sel).not.toBeNull();
      expect(wrap.contains(host.querySelector(sel)), sel).toBe(false);
    });
  });

  it('without minWidth the svg stays a direct child of the card', () => {
    const host = mount();
    track(new Graph(host, { view: 'flow', duration: 0 }).setData(data));
    expect(host.querySelector('.rc-graph-scroll')).toBeNull();
    expect(host.querySelector(':scope > svg')).not.toBeNull();
  });

  it('rare-charts.css: the wrapper scrolls sideways and takes the drawing slot', () => {
    const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
    const decls = {};
    root.walkRules(r => {
      if (!r.selectors.includes('.rc-chart > .rc-graph-scroll')) return;
      r.walkDecls(d => { decls[d.prop] = d.value; });
    });
    expect(decls).toMatchObject({ 'overflow-x': 'auto', 'overflow-y': 'hidden', order: '3', 'min-height': '0' });
  });
});

describe('Graph — hidden-nodes list keyboard (D7)', () => {
  it('Escape and × close the list and give focus back to "+N more"', async () => {
    const host = mount();
    const g = track(new Graph(host, { dataSource: memorySource(fixture), maxNodes: 3, duration: 0 }));
    await g.focus('a').whenReady();
    const note = host.querySelector('.rc-graph-note');
    const list = host.querySelector('.rc-graph-overflow');

    click(note);
    expect(document.activeElement).toBe(list.querySelector('.rc-graph-overflow-close'));
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(note);

    click(note);
    click(list.querySelector('.rc-graph-overflow-close'));
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(note);
  });
});

describe('Graph legends keep keyboard focus across the redraw (D8, R-16)', () => {
  const legendButton = (host, type) => host.querySelector(`.rc-graph-legend-item[data-type="${type}"]`);

  it('ego: the activated relation type keeps focus; after "Show all" the focus stays in the legend', async () => {
    const host = mount();
    const g = track(new Graph(host, { dataSource: memorySource(fixture), duration: 0, zoom: false }));
    await g.focus('a').whenReady();
    const before = legendButton(host, 'family');
    before.focus();
    before.click();
    await g.whenReady();
    const after = legendButton(host, 'family');
    expect(after).not.toBe(before);                      // the legend was rebuilt
    expect(document.activeElement).toBe(after);

    const reset = host.querySelector('.rc-graph-legend-reset');
    reset.focus();
    reset.click();
    await g.whenReady();
    expect(host.querySelector('.rc-graph-legend-reset')).toBeNull();
    expect(host.querySelector('.rc-graph-legend').contains(document.activeElement)).toBe(true);
  });

  it('flow: a category button keeps focus after it hides and shows its ties', () => {
    const host = mount();
    track(new Graph(host, {
      view: 'flow', duration: 0, linkColorBy: 'asset',
      linkTypes: { ATOM: { color: '#6c58b5', label: 'ATOM' }, ETH: { color: '#3d4a5c', label: 'ETH' } },
    }).setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'c', lane: 'y', row: 1 }],
      links: [{ source: 'a', target: 'b', asset: 'ATOM' }, { source: 'a', target: 'c', asset: 'ETH' }],
    }));
    let atom = legendButton(host, 'ATOM');
    atom.focus();
    atom.click();
    expect(legendButton(host, 'ATOM').getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(legendButton(host, 'ATOM'));
    atom = legendButton(host, 'ATOM');
    atom.click();
    expect(document.activeElement).toBe(legendButton(host, 'ATOM'));
  });

  it('a redraw while the focus is elsewhere does not pull it into the legend', async () => {
    const host = mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const g = track(new Graph(host, { dataSource: memorySource(fixture), duration: 0 }));
    outside.focus();
    await g.focus('a').whenReady();
    await g.focus('b').whenReady();
    expect(document.activeElement).toBe(outside);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as d3 from 'd3';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { mount, track, takeChartErrors, graphCentres, graphNodesNamed } from './helpers.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { pathLayout } from '../assets/charts/src/graph/layouts/path.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { fixture } from './fixtures/graph.js';

// The Graph chart in the DOM: the ego / path / cluster views, their ties,
// chrome and details panel, and the setData() → view chain with its queue.
// The model and the layouts without a DOM are in graph-model.test.js; the
// flow view in graph-flow.test.js.
//
// Moved from graph-fixes-7a.test.js (RC-026):
//   'R-17: setData() replaces the ego / path / cluster state' → same describe
//   'R-18: connect(a, a)' → same describe
//   'C-36: path-view labels stay inside the drawing' → same describe
//   'C-37: the details panel lists ties without a second marker' → same describe

// ─── Graph viewport (smoke + interaction contract) ─────────────────────────────

describe('Graph viewport', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
  });

  it('constructs, renders a labelled svg, and draws the ego view', async () => {
    const g = new Graph('#chart', { title: 'Network', duration: 0 })
      .setData(fixture);
    await g.whenReady();

    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('role')).toBe('group');            // its nodes are buttons (K-24)
    expect(svg.getAttribute('aria-label')).toBe('Network');
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.rc-graph-link').length).toBeGreaterThan(0);
  });

  it('focus() recenters: view keeps shared nodes, root changes', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const first = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(first).toContain('A');
    expect(first).not.toContain('D');

    await g.focus('c').whenReady();
    const second = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(second).toContain('C');
    expect(second).toContain('D');
  });

  it('focus() filters traversal by relation type and can clear the filter', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 2, duration: 0 });
    await g.focus('a', { types: ['family'] }).whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toEqual(expect.arrayContaining(['A', 'E']));
    expect(labels()).not.toContain('B');

    await g.clearRelationTypes().whenReady();
    expect(labels()).toContain('B');
    expect(labels()).toContain('C');
  });

  it('progressive contract: a links-only payload drives all three views', async () => {
    // The minimal unit of data: links with source/target, nothing else.
    // Nodes are auto-created, labels fall back to ids, untyped links act as
    // 'default', weights default — every view must render something sensible.
    const g = new Graph('#chart', { duration: 0 }).setData({
      links: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'd' },
        { source: 'a', target: 'd' },
      ],
    });
    await g.whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
    expect(labels().join(' ')).not.toContain('undefined');
    expect(host.querySelectorAll('.rc-graph-link').length).toBeGreaterThan(0);

    await g.connect('a', 'c').whenReady();
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelector('.rc-graph-row-label')?.textContent).toMatch(/hop/);

    await g.overview().whenReady();
    expect(labels().length).toBeGreaterThan(0);
    expect(labels().join(' ')).not.toContain('undefined');
  });

  it('progressive contract: tooltip falls back to the id when label is absent', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData({
      links: [{ source: 'acme', target: 'globex' }],
    });
    await g.whenReady();
    host.querySelector('.rc-graph-node')
      .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const tip = host.querySelector('.rc-tooltip');
    expect(tip.textContent).toMatch(/acme|globex/);
    expect(tip.textContent).not.toContain('undefined');
  });

  it('queued focus() calls each fetch with their own type filter', async () => {
    const src = memorySource(fixture);
    const calls = [];
    const spy = {
      ...src,
      neighbors: (id, opts) => { calls.push(opts.types); return src.neighbors(id, opts); },
    };
    const g = new Graph('#chart', { dataSource: spy, depth: 1, duration: 0 });
    g.focus('a', { types: ['family'] });
    g.focus('c', { types: ['investment'] });   // queued before the first fetch runs
    await g.whenReady();
    expect(calls).toEqual([['family'], ['investment']]);
  });

  it('tolerates a source payload without links', async () => {
    const g = new Graph('#chart', {
      duration: 0,
      dataSource: {
        neighbors: async () => ({ nodes: [{ id: 'a', label: 'A' }] }),
        paths: async () => ({ paths: [], nodes: [], links: [] }),
        aggregates: async () => ({ communities: [], links: [] }),
      },
    });
    await g.focus('a').whenReady();
    expect(host.querySelectorAll('.rc-graph-node')).toHaveLength(1);
  });

  it('the legend\'s default item stands for the untyped links: keeping only it keeps them', async () => {
    // Untyped links surface in the legend as 'default' — keeping only that
    // item must keep them, not filter the whole neighborhood away.
    const untyped = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'a', target: 'd', type: 'work' }],
    };
    const g = new Graph('#chart', { dataSource: memorySource(untyped), depth: 2, duration: 0 });
    await g.focus('a').whenReady();
    const item = host.querySelector('.rc-graph-legend button.rc-legend-item[data-key="default"]');
    item.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    item.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));   // a double click
    await g.whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.sort()).toEqual(['A', 'B', 'C']);
    expect(host.querySelectorAll('.rc-graph-link')).toHaveLength(2);
  });

  it('connect() renders the path view with context and a shortest caption', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.connect('a', 'f').whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toContain('A');
    expect(labels).toContain('F');
    // endpoint context: E (a's other tie) and D (f's other tie) fan behind
    expect(labels).toContain('E');
    expect(labels).toContain('D');
    // row caption calls out the shortest route
    const caption = host.querySelector('.rc-graph-row-label');
    expect(caption?.textContent).toContain('shortest');
  });

  it('overview() renders community meta-nodes', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.overview().whenReady();
    const nodes = host.querySelectorAll('.rc-graph-node');
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.every(l => / · \d+$/.test(l))).toBe(true);
  });

  it('zooming out of the ego view switches to the cluster overview (semantic zoom)', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(fixture);
    await g.whenReady();
    // The −/+ buttons animate the same d3 zoom; drive it directly.
    g.svg.call(g._zoom.transform, d3.zoomIdentity.scale(0.4));
    await g.whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(l => / · \d+$/.test(l))).toBe(true);
  });

  it('a view task that throws is logged as a library error, which fails the test unless expected', async () => {
    const down = () => Promise.reject(new Error('source down'));
    const g = new Graph('#chart', { dataSource: { neighbors: down, paths: down, aggregates: down }, duration: 0 });
    await g.focus('a').whenReady();
    // test/setup.js would fail this test on the logged error; take it here.
    const errors = takeChartErrors();
    expect(errors).toHaveLength(1);
    expect(String(errors[0][1])).toContain('source down');
  });

  it('renders group icons inside nodes; nodeIcons:false disables them', async () => {
    const data = {
      nodes: [
        { id: 'p', label: 'P', group: 'person' },
        { id: 'c', label: 'C', group: 'company' },
        { id: 'x', label: 'X', group: 'no-such-group' },
      ],
      links: [{ source: 'p', target: 'c' }, { source: 'p', target: 'x' }],
    };
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    await g.whenReady();
    // person + company get glyphs, unknown group stays a plain circle
    expect(host.querySelectorAll('.rc-graph-node-icon').length).toBe(2);

    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
    const plain = new Graph('#chart', { duration: 0, nodeIcons: false }).setData(data);
    await plain.whenReady();
    expect(host.querySelectorAll('.rc-graph-node-icon').length).toBe(0);
  });

  it('sizeBy: degree makes the hub larger than a leaf', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), sizeBy: 'degree', duration: 0 });
    await g.focus('c').whenReady();   // c has degree 3, a has degree 2
    const rOf = id => {
      const el = [...host.querySelectorAll('.rc-graph-node')]
        .find(n => n.querySelector('.rc-graph-node-label')?.textContent === id);
      return +el.querySelector('.rc-graph-node-circle').getAttribute('r');
    };
    expect(rOf('C')).toBeGreaterThan(rOf('A'));
  });

  it('hide()/show() toggle a node out of the ego view, model intact', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels()).toContain('E');

    g.hide('e');
    expect(labels()).not.toContain('E');
    g.show('e');
    expect(labels()).toContain('E');
  });

  it('right-click hides a node (ego exempt); restore control brings it back', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    const nodeOf = name => [...host.querySelectorAll('.rc-graph-node')]
      .find(n => n.querySelector('.rc-graph-node-label')?.textContent === name);
    const rightClick = el => el.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    rightClick(nodeOf('E'));
    expect(labels()).not.toContain('E');

    rightClick(nodeOf('A'));           // the ego cannot be hidden
    expect(labels()).toContain('A');

    const note = host.querySelector('.rc-graph-hidden-note');
    expect(note?.textContent).toContain('1 hidden');
    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(labels()).toContain('E');
    expect(host.querySelector('.rc-graph-hidden-note').hidden).toBe(true);
  });

  it('add() merges a news-sized payload and refreshes the ego view', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), depth: 1, duration: 0 });
    await g.focus('a').whenReady();
    // minimal unit of ingestion: one link; the endpoint node is auto-created
    g.add({ links: [{ source: 'a', target: 'lloyds', type: 'professional' }] });
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toContain('lloyds');   // label falls back to the id
  });

  it('caps the ego view at maxNodes and notes the hidden count', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), maxNodes: 3, duration: 0 });
    await g.focus('a').whenReady();   // full depth-2 neighborhood would be 4 nodes
    expect(host.querySelectorAll('.rc-graph-node').length).toBe(3);
    const note = host.querySelector('.rc-graph-note');
    expect(note?.textContent).toContain('+1 more');
    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const overflow = host.querySelector('.rc-graph-overflow');
    expect(overflow.hidden).toBe(false);
    expect(overflow.querySelectorAll('.rc-graph-overflow-item')).toHaveLength(1);

    overflow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overflow.hidden).toBe(true);

    note.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overflow.hidden).toBe(false);
    overflow.querySelector('.rc-graph-overflow-item')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect(overflow.hidden).toBe(true);
  });

  it('breadcrumbs restore prior views and back() follows the same history', async () => {
    const g = new Graph('#chart', {
      dataSource: memorySource(fixture), depth: 1, duration: 0, zoom: false,
    });
    await g.focus('a').whenReady();
    await g.focus('c').whenReady();
    let crumbs = [...host.querySelectorAll('.rc-graph-breadcrumbs button')];
    expect(crumbs.map(el => el.textContent)).toEqual(['A', 'C']);

    crumbs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent)).toContain('A');

    await g.focus('c').whenReady();
    await g.back().whenReady();
    expect([...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent)).toContain('A');
  });

  it('renders zoom controls, and omits them with zoom: false', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(fixture);
    await g.whenReady();
    expect(host.querySelectorAll('.rc-graph-zoom-controls button').length).toBe(3);
    g.destroy();

    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
    const plain = new Graph('#chart', { duration: 0, zoom: false }).setData(fixture);
    await plain.whenReady();
    expect(host.querySelectorAll('.rc-graph-zoom-controls').length).toBe(0);
  });

  it('tooltip on a hub is a capped counts-first summary', async () => {
    // hub with 9 ties — more than the 6-name cap
    const hub = {
      nodes: [{ id: 'hub', label: 'Hub', group: 'person' },
        ...Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: `N${i}`, group: 'company' }))],
      links: Array.from({ length: 9 }, (_, i) =>
        ({ source: 'hub', target: `n${i}`, type: i % 2 ? 'investment' : 'professional', weight: 0.5 })),
    };
    const g = new Graph('#chart', { duration: 0 }).setData(hub);
    await g.whenReady();

    const hubEl = [...host.querySelectorAll('.rc-graph-node')]
      .find(n => n.querySelector('.rc-graph-node-label')?.textContent === 'Hub');
    hubEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    const tip = host.querySelector('.rc-tooltip');
    expect(tip?.textContent).toContain('9 connections');
    expect(tip?.textContent).toContain('+3 more');      // 9 ties, 6-name cap
    expect(tip?.textContent).toContain('· 5');          // per-type counts
    // the counts are figures (K-15)
    expect([...tip.querySelectorAll('.rc-num')].map(n => n.textContent)).toEqual(expect.arrayContaining(['9', '+3', '5']));
  });

  it('destroy() cleans up without throwing', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(fixture);
    await g.whenReady();
    expect(() => g.destroy()).not.toThrow();
  });
});

// ─── The ego and path legend (D-04, K-05, K-06) ────────────────────────────────
// The type legend is drawn by the one legend builder (core/legend.js). In the
// ego view its toggles drive the traversal: a click turns a relation type off
// or on, a double click keeps only that type and a second one brings all
// back, Show all shows while a type is off; every gesture re-queries the
// view around its root. Every type off is the root alone, with no source
// call (spec decision 26). The path view lists the types on screen as plain
// labels.

describe('Graph ego and path legend (D-04, K-05)', () => {
  const LINK_TYPES = {
    professional: { color: '#0099ff', label: 'Professional' },
    investment: { color: '#ff9900', label: 'Investment' },
    family: { color: '#00cc77', label: 'Family' },
  };
  const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
  // a real double click in an engine that counts: click 1, click 2, dblclick
  const doubleClick = node => {
    click(node, 1);
    click(node, 2);
    node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
  };
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const legendEl = host => host.querySelector('.rc-graph-legend');
  const item = (host, type) => legendEl(host).querySelector(`button.rc-legend-item[data-key="${type}"]`);
  const resetOf = host => legendEl(host).querySelector('.rc-legend-reset');
  const pressed = host => Object.fromEntries([...legendEl(host).querySelectorAll('button.rc-legend-item')]
    .map(b => [b.dataset.key, b.getAttribute('aria-pressed')]));
  const typesDrawn = host => [...new Set([...host.querySelectorAll('.rc-graph-link')]
    .map(p => p.__data__.type ?? 'default'))].sort();
  const nodeIds = host => [...host.querySelectorAll('.rc-graph-node')].map(n => n.__data__.id).sort();
  const crumbCount = host => host.querySelectorAll('.rc-graph-breadcrumbs button').length;
  // A memory source that records the types each neighbors() call asks for,
  // and holds its answers from hold() on: releaseOne() lets the first held
  // one through, release() all of them and stops holding.
  const sourceOf = data => {
    const src = memorySource(data);
    const calls = [];
    let held = null;
    return {
      calls,
      hold() { held = []; },
      release() { const waiting = held ?? []; held = null; waiting.forEach(go => go()); },
      releaseOne() { held?.shift()?.(); },
      source: {
        ...src,
        neighbors(id, opts) {
          calls.push(opts.types == null ? null : [...opts.types].sort());
          if (!held) return src.neighbors(id, opts);
          return new Promise(resolve => held.push(() => resolve(src.neighbors(id, opts))));
        },
      },
    };
  };
  // b at depth 2: a and c, then e, d and f — all three types of the fixture
  const egoAtB = async (options = {}) => {
    const host = mount();
    const s = sourceOf(fixture);
    const g = track(new Graph(host, { dataSource: s.source, depth: 2, duration: 0, linkTypes: LINK_TYPES, ...options }));
    await g.focus('b').whenReady();
    return { host, g, s };
  };

  it('a click turns one type off, re-querying without it; a second click turns it back on', async () => {
    const { host, g, s } = await egoAtB();
    expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
    expect(pressed(host)).toEqual({ professional: 'true', investment: 'true', family: 'true' });
    expect(resetOf(host).hidden).toBe(true);
    const family = item(host, 'family');
    click(family);                         // Enter, Space, a scripted click: at once
    expect(family.getAttribute('aria-pressed')).toBe('false');   // written before the re-query
    await g.whenReady();
    expect(s.calls.at(-1)).toEqual(['investment', 'professional']);
    expect(typesDrawn(host)).toEqual(['investment', 'professional']);
    expect(nodeIds(host)).not.toContain('e');
    expect(item(host, 'family')).toBe(family);                     // the same element, updated in place
    expect(resetOf(host).hidden).toBe(false);
    click(family);
    await g.whenReady();
    expect(s.calls.at(-1)).toBeNull();
    expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
    expect(resetOf(host).hidden).toBe(true);
  });

  it('a pointer click that hides waits for a second click; a double click keeps one type in one re-query, a second brings all back', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { host, g, s } = await egoAtB();
      const n = s.calls.length;
      click(item(host, 'family'), 1);
      await g.whenReady();
      expect(s.calls).toHaveLength(n);                              // waiting for a second click
      expect(item(host, 'family').getAttribute('aria-pressed')).toBe('true');
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      await g.whenReady();
      expect(s.calls.slice(n)).toEqual([['investment', 'professional']]);
      click(item(host, 'family'));
      await g.whenReady();
      const m = s.calls.length;
      doubleClick(item(host, 'investment'));
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      await g.whenReady();
      expect(s.calls.slice(m)).toEqual([['investment']]);          // one re-query, no hide first
      expect(typesDrawn(host)).toEqual(['investment']);
      expect(pressed(host)).toEqual({ professional: 'false', investment: 'true', family: 'false' });
      doubleClick(item(host, 'investment'));
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      await g.whenReady();
      expect(s.calls.slice(m + 1)).toEqual([null]);                 // all back, never every type off
      expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('every type off is the root alone, drawn without a source call and with no breadcrumb; Show all brings all back', async () => {
    const { host, g, s } = await egoAtB();
    click(item(host, 'family'));
    await g.whenReady();
    click(item(host, 'investment'));
    await g.whenReady();
    const calls = s.calls.length;
    const crumbs = crumbCount(host);
    click(item(host, 'professional'));
    await g.whenReady();
    expect(s.calls).toHaveLength(calls);                // a backend could read [] as every type
    expect(nodeIds(host)).toEqual(['b']);
    expect(host.querySelectorAll('.rc-graph-link')).toHaveLength(0);
    expect(graphCentres(host)).toEqual(['B']);
    expect(pressed(host)).toEqual({ professional: 'false', investment: 'false', family: 'false' });
    expect(crumbCount(host)).toBe(crumbs);
    expect(resetOf(host).hidden).toBe(false);
    click(resetOf(host));
    await g.whenReady();
    expect(s.calls.at(-1)).toBeNull();
    expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
    expect(resetOf(host).hidden).toBe(true);
  });

  it('with every type off, a node the model holds is drawn alone; one it lacks is fetched over every type, then drawn alone', async () => {
    const { host, g, s } = await egoAtB({ depth: 1 });             // the model: a, b, c
    click(item(host, 'professional'));
    click(item(host, 'investment'));
    await g.whenReady();
    expect(nodeIds(host)).toEqual(['b']);
    const calls = s.calls.length;
    await g.focus('a').whenReady();
    expect(s.calls).toHaveLength(calls);
    expect(nodeIds(host)).toEqual(['a']);
    await g.focus('f').whenReady();
    expect(s.calls.slice(calls)).toEqual([null]);
    expect(nodeIds(host)).toEqual(['f']);
    // the public setRelationTypes([]) still means every type
    await g.setRelationTypes([]).whenReady();
    expect(s.calls.at(-1)).toBeNull();
    expect(nodeIds(host)).toEqual(['c', 'd', 'f']);
  });

  it('aria-busy while the re-query is pending; a redraw meanwhile keeps the new state; onLegendToggle after it', async () => {
    const seen = [];
    let host;
    const onLegendToggle = vi.fn(info => seen.push({ info, drawn: typesDrawn(host) }));
    const ego = await egoAtB({ onLegendToggle });
    host = ego.host;
    const { g, s } = ego;
    s.hold();
    click(item(host, 'family'));
    expect(legendEl(host).getAttribute('aria-busy')).toBe('true');
    await tick();                                                   // the query is out
    expect(s.calls.at(-1)).toEqual(['investment', 'professional']);
    g.render();                                                     // a resize meanwhile
    expect(item(host, 'family').getAttribute('aria-pressed')).toBe('false');
    expect(legendEl(host).getAttribute('aria-busy')).toBe('true');
    expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
    expect(onLegendToggle).not.toHaveBeenCalled();
    s.release();
    await g.whenReady();
    expect(legendEl(host).hasAttribute('aria-busy')).toBe(false);
    expect(seen).toEqual([{
      info: { name: 'family', visible: false, visibleNames: ['professional', 'investment'] },
      drawn: ['investment', 'professional'],                        // after the re-query drew
    }]);
  });

  it('two gestures in flight: the legend stays busy and shows the second until its re-query is done; each fires once', async () => {
    const onLegendToggle = vi.fn();
    const { host, g, s } = await egoAtB({ onLegendToggle });
    const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };
    s.hold();
    click(item(host, 'family'));
    click(item(host, 'investment'));
    await settle();
    s.releaseOne();                                                 // the first re-query draws
    await settle();
    expect(typesDrawn(host)).toEqual(['investment', 'professional']);
    expect(onLegendToggle).toHaveBeenCalledTimes(1);
    expect(legendEl(host).getAttribute('aria-busy')).toBe('true');   // the second is still out
    expect(pressed(host)).toEqual({ professional: 'true', investment: 'false', family: 'false' });
    s.release();
    await g.whenReady();
    expect(typesDrawn(host)).toEqual(['professional']);
    expect(legendEl(host).hasAttribute('aria-busy')).toBe(false);
    expect(onLegendToggle.mock.calls.map(([info]) => info.name)).toEqual(['family', 'investment']);
  });

  it('onLegendToggle: a toggle, a double click and Show all, with the chart as this; never from setRelationTypes', async () => {
    const onLegendToggle = vi.fn();
    const { host, g } = await egoAtB({ onLegendToggle });
    const keys = [...legendEl(host).querySelectorAll('button.rc-legend-item')].map(b => b.dataset.key);
    expect(keys).toEqual(['professional', 'investment', 'family']);
    doubleClick(item(host, 'family'));
    await g.whenReady();
    click(item(host, 'investment'));
    await g.whenReady();
    click(resetOf(host));
    await g.whenReady();
    await g.setRelationTypes(['family']).whenReady();
    await g.clearRelationTypes().whenReady();
    expect(onLegendToggle.mock.calls.map(([info]) => info)).toEqual([
      { name: 'family', visible: true, visibleNames: ['family'] },
      { name: 'investment', visible: true, visibleNames: ['investment', 'family'] },
      { name: null, visible: true, visibleNames: ['professional', 'investment', 'family'] },
    ]);
    expect(onLegendToggle.mock.contexts.every(self => self === g)).toBe(true);
  });

  it('a double click on a type that is off takes one breadcrumb, not two', async () => {
    const { host, g, s } = await egoAtB({ relationTypes: ['professional'] });
    click(item(host, 'investment'));
    await g.whenReady();
    expect(crumbCount(host)).toBe(2);
    const calls = s.calls.length;
    doubleClick(item(host, 'family'));          // shows it at once, then keeps only it
    await g.whenReady();
    expect(s.calls.slice(calls)).toEqual([null, ['family']]);
    expect(crumbCount(host)).toBe(3);           // the second re-query took the first one's place
    expect(pressed(host)).toEqual({ professional: 'false', investment: 'false', family: 'true' });
    await g.back().whenReady();
    expect(pressed(host)).toEqual({ professional: 'true', investment: 'true', family: 'false' });
  });

  it('a slow double click whose first click hid the last type: the second adds its breadcrumb, replacing none', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { host, g } = await egoAtB({ relationTypes: ['family', 'investment'] });
      click(item(host, 'investment'));                              // a legend breadcrumb: family alone
      await g.whenReady();
      expect(crumbCount(host)).toBe(2);
      click(item(host, 'family'), 1);
      vi.advanceTimersByTime(HIDE_DELAY_MS);                        // the first click hides it: nothing on
      await g.whenReady();
      expect(nodeIds(host)).toEqual(['b']);
      expect(crumbCount(host)).toBe(2);                             // no breadcrumb for nothing shown
      click(item(host, 'family'), 2);                               // the double click: all back
      await g.whenReady();
      expect(typesDrawn(host)).toEqual(['family', 'investment', 'professional']);
      expect(crumbCount(host)).toBe(3);                             // family alone keeps its breadcrumb
    } finally {
      vi.useRealTimers();
    }
  });

  it('a gesture whose view has moved on by its turn sets the filter for the next ego view, and still fires', async () => {
    const onLegendToggle = vi.fn();
    const { host, g, s } = await egoAtB({ onLegendToggle });
    s.hold();
    g.connect('a', 'f');                                            // its context fetches are held
    await tick();
    click(item(host, 'family'));                                    // the ego legend, still on screen
    s.release();
    await g.whenReady();
    expect(legendEl(host).querySelector('button')).toBeNull();      // the path view's labels
    expect(onLegendToggle).toHaveBeenCalledTimes(1);
    await g.focus('b').whenReady();
    expect(s.calls.at(-1)).toEqual(['investment', 'professional']);
    expect(pressed(host)).toEqual({ professional: 'true', investment: 'true', family: 'false' });
  });

  it('new data retires a gesture queued behind a fetch: no re-query, no event, no busy legend', async () => {
    const onLegendToggle = vi.fn();
    const { host, g, s } = await egoAtB({ onLegendToggle });
    s.hold();
    g.focus('a');                                                   // a fetch held at the source
    await tick();
    click(item(host, 'family'));                                    // queued behind it
    g.setData({ links: [{ source: 'p', target: 'q', type: 'family' }, { source: 'q', target: 'r', type: 'deal' }] });
    expect(legendEl(host).hasAttribute('aria-busy')).toBe(false);
    s.release();
    await g.whenReady();
    expect(onLegendToggle).not.toHaveBeenCalled();
    expect(legendEl(host).hasAttribute('aria-busy')).toBe(false);
    // the new data's types and the linkTypes catalogue, every one on
    expect(pressed(host)).toEqual({ professional: 'true', investment: 'true', family: 'true', deal: 'true' });
    expect(typesDrawn(host)).toEqual(['deal', 'family']);
  });

  it('a type\'s swatch is a line in its colour; a dashed type keeps its own first dash pair', async () => {
    const { host } = await egoAtB({
      linkTypes: {
        professional: { color: '#0099ff', dash: '6 4' },
        investment: { color: '#ff9900', dash: 'solid' },
        family: { color: '#00cc77', dash: [3, 2, 1] },
      },
    });
    const swatch = type => item(host, type).firstElementChild;
    expect(legendEl(host).querySelector('svg')).toBeNull();
    expect(swatch('professional').className).toBe('rc-legend-line rc-legend-line--dashed');
    expect(swatch('professional').getAttribute('style')).toBe('--rc-swatch-color: #0099ff; --rc-swatch-dash: 6px; --rc-swatch-gap: 4px;');
    expect(swatch('investment').className).toBe('rc-legend-line');                 // 'solid' draws solid
    expect(swatch('investment').getAttribute('style')).toBe('--rc-swatch-color: #ff9900;');
    expect(swatch('family').getAttribute('style')).toBe('--rc-swatch-color: #00cc77; --rc-swatch-dash: 3px; --rc-swatch-gap: 2px;');
    expect(swatch('family').getAttribute('aria-hidden')).toBe('true');
    expect(item(host, 'family').lastElementChild.textContent).toBe('family');      // no label: the key
  });

  it('the path view lists the types on screen as plain labels: no toggles, no Show all', async () => {
    const { host, g } = await egoAtB();
    click(item(host, 'family'));
    await g.whenReady();
    await g.connect('a', 'f').whenReady();
    const items = [...legendEl(host).children];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(el => el.localName === 'div' && el.matches('.rc-legend-item.rc-graph-legend-item'))).toBe(true);
    expect(items.every(el => !el.hasAttribute('aria-pressed') && el.dataset.type === el.dataset.key)).toBe(true);
    expect(legendEl(host).querySelector('.rc-legend-reset')).toBeNull();
    expect(legendEl(host).hasAttribute('role')).toBe(false);
    // the cluster view has no legend at all
    await g.focus('b').whenReady();
    expect(legendEl(host).getAttribute('role')).toBe('group');
    await g.overview().whenReady();
    expect(legendEl(host).children).toHaveLength(0);
    expect(legendEl(host).hasAttribute('role')).toBe(false);
  });

  it('legendInteractive: false is a static legend of the types the view traverses', async () => {
    const { host, g, s } = await egoAtB({ legendInteractive: false, relationTypes: ['family', 'investment'] });
    const items = [...legendEl(host).children];
    expect(items.map(el => [el.localName, el.dataset.key])).toEqual([['div', 'investment'], ['div', 'family']]);
    const calls = s.calls.length;
    click(items[0]);
    await g.whenReady();
    expect(s.calls).toHaveLength(calls);
  });

  it('the old interactiveLegend option is ignored, with one warning naming legendInteractive', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host } = await egoAtB({ interactiveLegend: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/interactiveLegend.*legendInteractive/);
    expect(item(host, 'family')).not.toBeNull();
  });
});

// ─── Graph viewport — parallel ties and tie tooltips (A2/A3, 0.9.8_3) ──────────

describe('Graph viewport — ties', () => {
  let host;
  const mount = id => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    return el;
  };
  beforeEach(() => {
    document.body.innerHTML = '';
    host = mount('chart');
  });

  const pairData = types => ({
    nodes: [{ id: 'trump', label: 'Trump' }, { id: 'kushner', label: 'Kushner' }],
    links: types.map(type => ({ source: 'trump', target: 'kushner', type })),
  });

  it('draws parallel typed ties of one pair as separate arcs', async () => {
    const g = new Graph('#chart', { duration: 0 })
      .setData(pairData(['family', 'investment', 'employment']));
    await g.whenReady();
    const paths = [...host.querySelectorAll('.rc-graph-link')];
    expect(paths).toHaveLength(3);
    expect(new Set(paths.map(p => p.getAttribute('d'))).size).toBe(3);   // fanned, not stacked
    expect(host.querySelectorAll('.rc-graph-link-hit')).toHaveLength(3);
  });

  it('collapses a pair with more than 3 ties into one line with a +N badge', async () => {
    const g = new Graph('#chart', { duration: 0 })
      .setData(pairData(['family', 'investment', 'employment', 'deal', 'conflict']));
    await g.whenReady();
    expect(host.querySelectorAll('.rc-graph-link')).toHaveLength(1);
    expect(host.querySelector('.rc-graph-link-more').textContent).toBe('+4');
  });

  it('click on a tie pins a tooltip with working source links', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData({
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      links: [{
        source: 'a', target: 'b', type: 'deal', label: '<b>merger</b>',
        sources: [{ url: 'https://example.com/1', title: 'Post 1' },
                  { url: 'javascript:alert(1)', title: 'Bad' }],
      }],
    });
    await g.whenReady();
    const hit = host.querySelector('.rc-graph-link-hit');
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tt = host.querySelector('.rc-tooltip');
    expect(tt.classList.contains('is-pinned')).toBe(true);
    const anchors = [...tt.querySelectorAll('a')];
    expect(anchors.map(a => a.getAttribute('href'))).toEqual(['https://example.com/1']);
    expect(tt.innerHTML).toContain('&lt;b&gt;merger&lt;/b&gt;');   // payload text is escaped
  });

  it('linkTooltipFormat receives the canonical link and both endpoint nodes', async () => {
    const seen = [];
    const g = new Graph('#chart', {
      duration: 0,
      linkTooltipFormat: ({ link, source, target }) => {
        seen.push({ link, source, target });
        return 'custom';
      },
    }).setData({ nodes: [{ id: 'a', label: 'A' }, { id: 'b' }], links: [{ from: 'a', to: 'b' }] });
    await g.whenReady();
    host.querySelector('.rc-graph-link-hit').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(seen[0].link.source).toBe('a');
    expect(seen[0].link).not.toHaveProperty('from');
    expect(seen[0].source.label).toBe('A');
    expect(seen[0].target.id).toBe('b');
  });

  it('arrow marker ids are unique per instance', async () => {
    const other = mount('chart2');
    const g1 = new Graph('#chart', { duration: 0 }).setData(pairData(['family']));
    const g2 = new Graph('#chart2', { duration: 0 }).setData(pairData(['family']));
    await Promise.all([g1.whenReady(), g2.whenReady()]);
    const m1 = host.querySelector('marker').id;
    const m2 = other.querySelector('marker').id;
    expect(m1).not.toBe(m2);
    expect(host.querySelector('.rc-graph-link').getAttribute('marker-end')).toBe(`url(#${m1})`);
  });

  it('keeping one type in the legend keeps only that arc of the pair', async () => {
    const g = new Graph('#chart', { duration: 0 })
      .setData(pairData(['family', 'investment', 'employment']));
    await g.whenReady();
    const item = host.querySelector('.rc-graph-legend button.rc-legend-item[data-key="investment"]');
    item.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    item.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));   // a double click
    await g.whenReady();
    const paths = [...host.querySelectorAll('.rc-graph-link')];
    expect(paths.map(p => p.__data__.type)).toEqual(['investment']);
  });
});

describe('Graph viewport — focus + context fade', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
  });

  it('hovering a node actually fades the others (style, not a shadowed attribute)', async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { duration: 0 }).setData(fixture).focus('a');
    await g.whenReady();
    const nodes = [...host.querySelectorAll('.rc-graph-node')];
    nodes.find(n => n.__data__.id === 'e').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const faded = nodes.filter(n => n.style.opacity === '0.25').map(n => n.__data__.id).sort();
    expect(faded).toEqual(['b', 'c']);           // e's only neighbor is a
    nodes[0].dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(nodes.every(n => n.style.opacity === '1')).toBe(true);
  });
});

describe('Graph viewport — chrome', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  it('puts the tools (notes, zoom, full screen) in the footer row, after the source', () => {
    new Graph('#chart', { duration: 0, source: 'Synthetic data' });
    const footer = document.querySelector('#chart .rc-chart-footer');
    expect(footer.classList.contains('rc-chart-footer--tools')).toBe(true);
    const kids = [...footer.children].map(c => c.className);
    expect(kids.indexOf('rc-graph-tools')).toBe(kids.indexOf('rc-chart-source') + 1);
    const tools = footer.querySelector('.rc-graph-tools');
    expect(tools.querySelector('.rc-graph-zoom-controls')).not.toBeNull();
    expect(tools.querySelector('.rc-graph-fullscreen')).not.toBeNull();
    expect(tools.querySelector('.rc-graph-note').hidden).toBe(true);
    expect(document.querySelectorAll('#chart svg .rc-graph-note')).toHaveLength(0);
  });

  it('full screen: the button expands the card, Esc (overlay fallback) or the button restores it', () => {
    const host = document.getElementById('chart');
    host.requestFullscreen = undefined;                 // force the overlay fallback
    const g = new Graph('#chart', { duration: 0, height: 420 });
    const btn = host.querySelector('.rc-graph-fullscreen');
    btn.click();
    expect(host.classList.contains('rc-graph--fullscreen')).toBe(true);
    expect(host.style.height).toBe('100vh');
    expect(btn.title).toContain('Exit');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.classList.contains('rc-graph--fullscreen')).toBe(false);
    expect(host.style.height).toBe('420px');
    g.toggleFullscreen(true);
    btn.click();
    expect(host.classList.contains('rc-graph--fullscreen')).toBe(false);
  });

  it('fullscreen: false leaves the button out', () => {
    new Graph('#chart', { duration: 0, fullscreen: false });
    expect(document.querySelector('#chart .rc-graph-fullscreen')).toBeNull();
  });

  it('creates a footer row for the controls when there is no source or note', () => {
    new Graph('#chart', { duration: 0 });
    expect(document.querySelector('#chart .rc-chart-footer .rc-graph-zoom-controls')).not.toBeNull();
  });
});

describe('Graph viewport — details panel', () => {
  const setWidth = (el, w) => Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });

  it('details: true sits beside a wide card and shows the focused node by default', async () => {
    const host = document.getElementById('chart');
    setWidth(host, 1200);
    const g = new Graph('#chart', { duration: 0, details: true, height: 500 }).setData(fixture).focus('a');
    await g.whenReady();
    const panel = host.querySelector('.rc-graph-details');
    expect(host.classList.contains('rc-graph--details-side')).toBe(true);
    expect(panel.style.width).toBe('300px');
    expect(panel.querySelector('h4').textContent).toBe('A');
    expect(panel.textContent).toContain('Connections');
  });

  // X-11: a strict CSP blocks style=""; the hint and the tool buttons carry
  // classes, their colours come from the card's tokens (rare-charts.css)
  it('the default hint is a class, not an inline colour; the tool buttons too', async () => {
    const host = document.getElementById('chart');
    const g = new Graph('#chart', { duration: 0, details: true, height: 500 }).setData(fixture);
    await g.whenReady();
    for (const view of ['ego', 'flow']) {
      g._view = view;
      const html = g._defaultDetails(null);
      expect(html, view).toContain('<p class="rc-graph-details-muted">');
      expect(html, view).not.toContain('style=');
    }
    const tools = [...host.querySelectorAll('.rc-graph-zoom-controls button, .rc-graph-fullscreen')];
    expect(tools.map(b => [b.className, b.getAttribute('style')])).toEqual([
      ['rc-graph-tool', null], ['rc-graph-tool', null], ['rc-graph-tool', null], ['rc-graph-tool rc-graph-fullscreen', null],
    ]);
    expect(host.style.position).toBe('');                // the card's position is the stylesheet's
  });

  it('a narrow card puts it below and grows by its height', async () => {
    const host = document.getElementById('chart');
    setWidth(host, 600);
    const g = new Graph('#chart', { duration: 0, details: true, height: 500 }).setData(fixture);
    await g.whenReady();
    expect(host.classList.contains('rc-graph--details-below')).toBe(true);
    expect(host.style.height).toBe('700px');
  });

  it('hovering a node and clicking a tie update it; detailsFormat replaces the content', async () => {
    const host = document.getElementById('chart');
    setWidth(host, 1200);
    const seen = [];
    const g = new Graph('#chart', {
      duration: 0, details: true,
      detailsFormat: ({ node, link, view }) => { seen.push({ node: node?.id, link: link?.id, view }); return 'x'; },
    }).setData(fixture).focus('a');
    await g.whenReady();
    const node = [...host.querySelectorAll('.rc-graph-node')].find(n => n.__data__.id === 'b');
    node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(seen[seen.length - 1]).toMatchObject({ node: 'b', view: 'ego' });
    node.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(seen[seen.length - 1].node).toBe('a');            // back to the focused node
    host.querySelector('.rc-graph-link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen[seen.length - 1].link).toBeTruthy();
  });

  it("flow: stays below when the drawing's minWidth plus the panel does not fit", async () => {
    const host = document.getElementById('chart');
    setWidth(host, 1166);
    const g = new Graph('#chart', { view: 'flow', duration: 0, details: true, minWidth: 980 })
      .setData({ nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }], links: [{ source: 'a', target: 'b' }] });
    await g.whenReady();
    expect(host.classList.contains('rc-graph--details-below')).toBe(true);
  });

  it('a page-owned element is moved in and left for the page to fill', async () => {
    document.body.innerHTML = '<div id="chart"></div><aside id="mine">page content</aside>';
    const g = new Graph('#chart', { duration: 0, details: '#mine' }).setData(fixture);
    await g.whenReady();
    const mine = document.getElementById('mine');
    expect(mine.parentElement.id).toBe('chart');
    expect(mine.textContent).toBe('page content');
  });
});

describe('Graph — numeric ids, categories, markers (R-19, R-01, R-02)', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });
  const nodeG = id => [...host.querySelectorAll('.rc-graph-node')].find(n => n.__data__.id === id);
  const numeric = {
    nodes: [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }, { id: 3, label: 'Three' }],
    links: [{ source: 1, target: 2 }, { source: 1, target: 3 }],
  };

  it('setData with numeric ids places its auto-focused root like string ids do', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(numeric);
    await g.whenReady();
    expect(nodeG('1').getAttribute('transform')).toMatch(/translate/);
    await g.focus(2).whenReady();
    expect(nodeG('2').getAttribute('transform')).toMatch(/translate/);
    g.destroy();
  });

  it('hide(3) and hiddenNodes: [3] hide the node with id "3"', async () => {
    const labels = () => [...host.querySelectorAll('.rc-graph-node-label')].map(t => t.textContent);
    const g = new Graph('#chart', { duration: 0 }).setData(numeric);
    await g.whenReady();
    g.hide(3);
    expect(labels()).not.toContain('Three');
    g.destroy();
    const h = new Graph('#chart', { duration: 0, hiddenNodes: [3] }).setData(numeric);
    await h.whenReady();
    expect(labels()).not.toContain('Three');
    h.destroy();
  });

  it('an undescribed type takes a palette colour no described type uses; untyped stays muted', async () => {
    const g = new Graph('#chart', { duration: 0, linkTypes: { a: { color: defaultTheme.colors[0], label: 'A' } } }).setData({
      nodes: [{ id: 'h' }, { id: 'x' }, { id: 'y' }, { id: 'z' }],
      links: [{ source: 'h', target: 'x', type: 'a' }, { source: 'h', target: 'y', type: 'b' }, { source: 'h', target: 'z' }],
    });
    await g.focus('h').whenReady();
    const stroke = target => [...host.querySelectorAll('.rc-graph-link')].find(p => p.__data__.target === target || p.__data__.source === target).getAttribute('stroke');
    // the palette is hex; the type's chain counts as its blue, so y takes the orange
    expect(stroke('x')).toBe(defaultTheme.colors[0]);
    expect(stroke('y')).toBe('#fa8c16');
    expect(stroke('z')).toBe(g.theme.muted);
    g.destroy();
  });

  it('two Cyrillic types get two arrow markers in the ego view (R-02)', async () => {
    const g = new Graph('#chart', { duration: 0, linkTypes: { друг: { color: '#aa0000' }, брат: { color: '#00aa00' } } }).setData({
      nodes: [{ id: 'h' }, { id: 'x' }, { id: 'y' }],
      links: [{ source: 'h', target: 'x', type: 'друг' }, { source: 'h', target: 'y', type: 'брат' }],
    });
    await g.focus('h').whenReady();
    const ids = [...host.querySelectorAll('.rc-graph-link')].map(p => p.getAttribute('marker-end'));
    expect(new Set(ids).size).toBe(2);
    const colours = ids.map(u => host.querySelector(u.slice(4, -1) + ' path').getAttribute('stroke')).sort();
    expect(colours).toEqual(['#00aa00', '#aa0000']);
    g.destroy();
  });

  it('path view: context ties of a new type keep one colour across renders, matching the legend', async () => {
    const data = {
      nodes: ['a', 'b', 'c', 'x', 'y'].map(id => ({ id })),
      links: [{ source: 'a', target: 'b', type: 'k' }, { source: 'b', target: 'c', type: 'k' },
        { source: 'a', target: 'x', type: 'zzz' }, { source: 'c', target: 'y', type: 'zzz' }],
    };
    const g = new Graph('#chart', { duration: 0, linkTypes: { k: { color: '#123456' } }, dataSource: memorySource(data) });
    await g.connect('a', 'c').whenReady();
    const ctx = () => [...host.querySelectorAll('.rc-graph-link')].find(p => p.__data__.type === 'zzz').getAttribute('stroke');
    const first = ctx();
    g.render();
    expect(ctx()).toBe(first);
    g.destroy();
  });
});

// ─── setData() and the view queue ─────────────────────────────────────────────

// A1 (0.9.8_3): a synchronous `setData(d); focus(id)` chain must draw the ego
// view around `id` without a manual whenReady() in between, and must not
// first build the default (best-connected) ego only to discard it.
describe('Graph — setData() → view chain (A1)', () => {
  const data = {
    nodes: [
      { id: 'hub', label: 'Hub' },
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Y' },
      { id: 'z', label: 'Z' },
    ],
    links: [
      { source: 'hub', target: 'x' },
      { source: 'hub', target: 'y' },
      { source: 'hub', target: 'z' },
      { source: 'x', target: 'y' },
    ],
  };

  let host;
  const mount = () => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
  };
  beforeEach(mount);

  it('draws the requested ego on a synchronous setData(); focus() chain — the only view it builds', async () => {
    const g = new Graph('#chart', { duration: 0 });
    g.setData(data);
    g.focus('z');
    await g.whenReady();
    expect(graphCentres(host)).toEqual(['Z']);
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    // one view in the history: no default (hub) ego was built and then
    // replaced — no breadcrumbs yet, and the next step's trail starts at Z
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    await g.focus('x').whenReady();
    expect(crumbs(host)).toEqual(['Z', 'X']);
  });

  it('skips the default ego when a view is requested in the same tick', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    const neighbors = vi.spyOn(g._source, 'neighbors');
    g.focus('z');
    await g.whenReady();
    expect(neighbors).toHaveBeenCalledTimes(1);
    expect(neighbors.mock.calls[0][0]).toBe('z');
  });

  it('still auto-focuses the best-connected node when nothing else is requested', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    await g.whenReady();
    expect(graphCentres(host)).toEqual(['Hub']);
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
  });

  it('skips the default ego for connect() and overview() too', async () => {
    const g1 = new Graph('#chart', { duration: 0 }).setData(data);
    g1.connect('x', 'z');
    await g1.whenReady();
    // the path view: its two ends drawn as such, no ego centre
    expect(graphNodesNamed(host, 'endpoint').sort()).toEqual(['X', 'Z']);
    expect(graphCentres(host)).toEqual([]);

    mount();
    const g2 = new Graph('#chart', { duration: 0 }).setData(data);
    g2.overview();
    await g2.whenReady();
    // the cluster view: community meta-nodes only, and it is the first step
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(l => / · \d+$/.test(l))).toBe(true);
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    await g2.focus('x').whenReady();
    expect(crumbs(host)).toEqual(['Overview', 'X']);
  });

  it('a later view change after whenReady() still recenters', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    await g.whenReady();
    await g.focus('y').whenReady();
    expect(graphCentres(host)).toEqual(['Y']);
  });
});

// R-21: a view task still waiting on the old source when setData() replaces
// the data must not merge its late answer into the new model or view.
describe('Graph — a late answer from the replaced source (R-21)', () => {
  // A source whose answers wait until released, one at a time, in order.
  const slowSource = () => {
    const pending = [];
    const later = value => new Promise(resolve => pending.push(() => resolve(value)));
    return {
      pending,
      neighbors: id => later({ nodes: [{ id }, { id: 'old', label: 'Old' }], links: [{ source: id, target: 'old' }] }),
      paths: (a, b) => later({ nodes: [{ id: a }, { id: 'old', label: 'Old' }, { id: b }],
        links: [{ source: a, target: 'old' }, { source: 'old', target: b }], paths: [[a, 'old', b]] }),
      aggregates: () => later({ communities: [{ id: 'c', label: 'Old', size: 2, top: 'old' }], links: [] }),
    };
  };
  const fresh = { nodes: [{ id: 'a', label: 'A' }, { id: 'new', label: 'New' }], links: [{ source: 'a', target: 'new' }] };
  const labels = () => [...document.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
  const tick = () => new Promise(r => setTimeout(r, 0));
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });

  it.each([
    ['focus()', g => g.focus('a')],
    ['connect()', g => g.connect('a', 'b')],
    ['overview()', g => g.overview()],
  ])('%s: the late answer is dropped instead of reaching the new data', async (_n, start) => {
    const src = slowSource();
    const g = new Graph(host, { dataSource: src, duration: 0, pathContext: false });
    start(g);
    await tick();
    g.setData(fresh);
    src.pending.forEach(release => release());
    await g.whenReady();
    expect(labels()).toContain('New');
    expect(labels().some(l => l.startsWith('Old'))).toBe(false);
    g.destroy();
  });

  it('a task still waiting when the chart is destroyed renders nothing', async () => {
    const src = slowSource();
    const g = new Graph(host, { dataSource: src, duration: 0 });
    g.focus('a');
    await tick();
    g.destroy();
    src.pending.forEach(release => release());
    await g.whenReady();
    expect(host.children.length).toBe(0);
  });

  it('a back() retired by setData does not cost the new data its first history entry', async () => {
    const answers = { x: ['y'], y: ['x'] };
    let hold = null;
    const src = {
      neighbors: id => {
        const sub = { nodes: [{ id }, ...answers[id].map(n => ({ id: n }))], links: answers[id].map(n => ({ source: id, target: n })) };
        return hold ? new Promise(resolve => { hold = () => resolve(sub); }) : Promise.resolve(sub);
      },
      paths: async () => ({ nodes: [], links: [], paths: [] }),
      aggregates: async () => ({ communities: [], links: [] }),
    };
    const g = new Graph(host, { dataSource: src, duration: 0 });
    await g.focus('x').whenReady();
    await g.focus('y').whenReady();
    hold = true;
    g.back();                                   // restores x — waits on the source
    await tick();
    g.setData({ nodes: [{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }], links: [{ source: 'p', target: 'q' }] });
    hold();
    await g.whenReady();
    // setData starts a new history (R-17): a second view shows the trail,
    // which begins with the new data's first view — recorded, not skipped
    await g.focus('q').whenReady();
    const crumbs = [...host.querySelectorAll('.rc-graph-breadcrumbs button, .rc-graph-breadcrumbs span')].map(b => b.textContent);
    expect(crumbs).toEqual(['P', 'Q']);
    g.destroy();
  });
});

// ─── setData() replaces the view state; the path view; the details ties ──────
// R-17  setData() in ego/path/cluster: a new history, the new data's relation
//       types, the best-connected node of the new data, and an empty payload
//       clears the drawing
// R-18  connect(a, a) is one node, no routes
// C-36  path view: labels at the drawing's ends stay inside it
// C-37  details panel: the → / ← of a node's ties is the only marker

const ids = host => [...host.querySelectorAll('.rc-graph-node')].map(n => n.__data__.id).sort();
const crumbs = host => [...host.querySelectorAll('.rc-graph-breadcrumbs button')].map(b => b.textContent);
// the type legend's keys; the K-06 alias (rc-graph-legend-item, data-type)
// is still on every item until 0.9.9
const legend = host => [...host.querySelectorAll('.rc-graph-legend .rc-legend-item')].map(b => {
  expect(b.classList.contains('rc-graph-legend-item')).toBe(true);
  expect(b.dataset.type).toBe(b.dataset.key);
  return b.dataset.key;
});

const first = {
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
  links: [
    { source: 'a', target: 'b', type: 'work' },
    { source: 'a', target: 'c', type: 'family' },
  ],
};
const second = {
  nodes: [{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }, { id: 'r', label: 'R' }],
  links: [
    { source: 'q', target: 'p', type: 'deal' },
    { source: 'q', target: 'r', type: 'deal' },
  ],
};

describe('R-17: setData() replaces the ego / path / cluster state', () => {
  it('the old breadcrumbs go: the new data starts a new history', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    await g.focus('b').whenReady();
    expect(crumbs(host)).toEqual(['A', 'B']);
    await g.setData(second).whenReady();
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    expect(graphCentres(host)).toEqual(['Q']);
    await g.focus('p').whenReady();
    expect(crumbs(host)).toEqual(['Q', 'P']);
  });

  it('the legend lists the new data\'s relation types, not the old ones', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    expect(legend(host).sort()).toEqual(['family', 'work']);
    await g.setData(second).whenReady();
    expect(legend(host)).toEqual(['deal']);
  });

  it('under a relation filter the legend keeps the linkTypes catalogue, not the old data\'s types', async () => {
    const host = mount();
    const linkTypes = { deal: { color: '#123456', label: 'Deal' }, loan: { color: '#654321', label: 'Loan' } };
    const g = track(new Graph(host, { duration: 0, linkTypes, relationTypes: ['deal'] }));
    await g.setData(first).whenReady();
    await g.setData(second).whenReady();
    expect(legend(host).sort()).toEqual(['deal', 'loan']);
  });

  it('a filter set from the legend before setData still lets the legend list the new data\'s types', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    g.setRelationTypes(['work']);
    await g.whenReady();
    await g.setData(second).whenReady();
    expect(legend(host)).toContain('deal');
  });

  it('autofocus: the most distinct neighbours, not the most tie entries', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData({ links: [
      { source: 'p', target: 'q', type: 't1' },
      { source: 'p', target: 'q', type: 't2' },
      { source: 'q', target: 'p', type: 't3' },
      { from: 'h', to: 'a' },
      { from: 'h', to: 'b' },
    ] }).whenReady();
    expect(graphCentres(host)).toEqual(['h']);
  });

  it('autofocus ignores ties to themselves and ties without both ends', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData({ links: [
      { source: 's', target: 's' }, { source: 's', target: 's', type: 'x' },
      { source: 'lonely' }, { target: 'lonely' }, { source: 'lonely', target: null },
      { source: 'a', target: 'b' },
    ] }).whenReady();
    expect(graphCentres(host)).toEqual(['a']);
    expect(ids(host)).toEqual(['a', 'b']);
  });

  it('autofocus under relationTypes: the best-connected node by the ties the view draws', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, relationTypes: ['family'] }));
    await g.setData({ links: [
      { source: 'hub', target: 'w1', type: 'work' },
      { source: 'hub', target: 'w2', type: 'work' },
      { source: 'hub', target: 'w3', type: 'work' },
      { source: 'm', target: 'f1', type: 'family' },
      { source: 'm', target: 'f2', type: 'family' },
    ] }).whenReady();
    expect(graphCentres(host)).toEqual(['m']);
    expect(ids(host)).toEqual(['f1', 'f2', 'm']);
  });

  it('an empty payload clears the ego drawing, legend, notes and details', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, details: true, maxNodes: 1 }));
    await g.setData(first).whenReady();
    await g.focus('b').whenReady();
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(host.querySelector('.rc-graph-note').hidden).toBe(false);   // "+N more"
    await g.setData({ nodes: [], links: [] }).whenReady();
    expect(host.querySelectorAll('.rc-graph-node, .rc-graph-link, .rc-graph-link-hit')).toHaveLength(0);
    expect(host.querySelectorAll('.rc-graph-legend > *')).toHaveLength(0);
    expect(host.querySelector('.rc-graph-legend').hasAttribute('role')).toBe(false);
    expect(host.querySelector('.rc-graph-note').hidden).toBe(true);
    expect(host.querySelector('.rc-graph-breadcrumbs').hidden).toBe(true);
    expect(host.querySelector('.rc-graph-details').textContent).toContain('Hover a node');
    // and the next data draws as usual
    await g.setData(second).whenReady();
    expect(ids(host)).toEqual(['q']);                // maxNodes: 1
    expect(graphCentres(host)).toEqual(['Q']);
  });

  it('an empty payload clears a path view too — its route captions included', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData(first);
    await g.connect('b', 'c').whenReady();
    expect(host.querySelectorAll('.rc-graph-row-label').length).toBeGreaterThan(0);
    await g.setData({}).whenReady();
    expect(host.querySelectorAll('.rc-graph-node, .rc-graph-row-label, .rc-arrow')).toHaveLength(0);
  });

  it('overview() after setData() keeps a centre of the new data for the zoom back in', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    await g.setData(first).whenReady();
    await g.setData(second).overview().whenReady();
    // zooming back in (semantic zoom) centres a node of the new data. The
    // −/+ buttons animate the same d3 zoom; drive it directly.
    g.svg.call(g._zoom.transform, d3.zoomIdentity.scale(2));
    await g.whenReady();
    const centre = graphCentres(host);
    expect(centre).toHaveLength(1);
    expect(['P', 'Q', 'R']).toContain(centre[0]);
  });
});

describe('R-18: connect(a, a)', () => {
  it('memorySource answers one route of one node, no ties', async () => {
    const src = memorySource(first);
    expect(await src.paths('a', 'a', { k: 3 })).toEqual({ paths: [['a']], nodes: [{ id: 'a', label: 'A' }], links: [] });
  });

  it('the path view draws the node once: no routes, captions or context', async () => {
    const warn = vi.spyOn(console, 'warn');
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData(first);
    await g.connect('a', 'a').whenReady();
    expect(ids(host)).toEqual(['a']);
    expect(host.querySelectorAll('.rc-graph-link, .rc-graph-row-label')).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a source that repeats a route still gets one row per route', () => {
    const { rows } = pathLayout({ paths: [['a', 'm', 'b'], ['a', 'm', 'b'], ['a', 'n', 'b']] }, { width: 800, height: 400 });
    expect(rows).toHaveLength(2);
    const self = pathLayout({ paths: [['a'], ['a'], ['a']] }, { width: 800, height: 400 });
    expect(self.rows).toEqual([]);
    expect(self.positions.get('a')).toMatchObject({ x: 400, y: 200 });
  });
});

describe('C-36: path-view labels stay inside the drawing', () => {
  it('pathLayout moves an end node in by half its label', () => {
    const half = { a: 30, b: 30, m: 20, r1: 60, l1: 60 };
    const { positions } = pathLayout(
      { paths: [['a', 'm', 'b']], context: { a: ['l1'], b: ['r1'] } },
      { width: 800, height: 400, labelHalf: id => half[id] });
    positions.forEach((p, id) => {
      expect(p.x - half[id], id).toBeGreaterThanOrEqual(4);
      expect(p.x + half[id], id).toBeLessThanOrEqual(796);
    });
    // nodes away from the edges stay where the routes put them
    expect(positions.get('m').x).toBe(400);
  });

  it('the Graph path view keeps a long context label inside the svg', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0 }));
    g.setData({ links: [
      { source: 'a', target: 'm' }, { source: 'm', target: 'b' },
      { source: 'b', target: 'verdant', weight: 0.9 },
    ], nodes: [{ id: 'verdant', label: 'Verdant Group Holdings Ltd' }] });
    await g.connect('a', 'b').whenReady();
    const W = host.querySelector('svg').clientWidth || g.width;   // the width the layout had, measured as Graph does
    [...host.querySelectorAll('.rc-graph-node')].forEach(el => {
      const x = Number(el.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]);
      const label = String(el.__data__.label ?? el.__data__.id);
      const half = label.length * 6.2 / 2;          // the estimate jsdom falls back to
      expect(x - half, label).toBeGreaterThanOrEqual(0);
      expect(x + half, label).toBeLessThanOrEqual(W);
    });
  });
});

describe('C-37: the details panel lists ties without a second marker', () => {
  it('a node\'s ties are a .rc-graph-details-ties list', async () => {
    const host = mount();
    const g = track(new Graph(host, { duration: 0, details: true }));
    await g.setData(first).whenReady();
    const list = host.querySelector('.rc-graph-details ul');
    expect(list.classList.contains('rc-graph-details-ties')).toBe(true);
    expect(list.querySelector('li').textContent.trim()).toMatch(/^→ /);
  });

  it('rare-charts.css drops the bullet and its indent there', () => {
    const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
    const decls = {};
    root.walkRules(r => {
      if (!r.selectors.includes('.rc-graph-details .rc-graph-details-ties')) return;
      r.walkDecls(d => { decls[d.prop] = d.value; });
    });
    expect(decls).toMatchObject({ 'list-style': 'none', 'padding-left': '0' });
  });
});

// RC-018: a host's button:hover fill does not reach the "+N" panel's close.
it('rare-charts.css clears the host hover fill on the "+N" panel\'s close button', () => {
  const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
  const decls = {};
  root.walkRules(r => {
    // since X-08's follow-up (2026-11-19) one rule covers :hover, :active and :focus
    if (!r.selectors.includes('.rc-graph-overflow .rc-graph-overflow-close.rc-graph-overflow-close:is(:hover, :active, :focus)')) return;
    r.walkDecls(d => { decls[d.prop] = d.value; });
  });
  expect(decls).toMatchObject({ border: '0', 'box-shadow': 'none', background: 'transparent' });
});

// RC-079: the details panel and the tie tooltip print a tie's value the same
// way: a numeric string in the locale, other text as given, '' not at all.
describe('Graph — a tie\'s value is printed one way', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
  });
  const data = {
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
    links: [
      { source: 'a', target: 'b', value: '1200' },
      { source: 'a', target: 'c', value: 'abc' },
      { source: 'a', target: 'd', value: '' },
    ],
  };
  const text = html => { const el = document.createElement('div'); el.innerHTML = html; return el.textContent.replace(/\s+/g, ' '); };

  it('the node panel, the tie panel and the tie tooltip agree', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(data).focus('a');
    await g.whenReady();
    const [ab, ac, ad] = data.links;
    const node = text(g._defaultDetails({ node: g._model.node('a') }));
    expect(node).toContain((1200).toLocaleString());
    expect(node).toContain('abc');
    expect(node).not.toMatch(/NaN|· 0\b/);
    for (const [l, shown] of [[ab, (1200).toLocaleString()], [ac, 'abc']]) {
      expect(text(g._defaultDetails({ link: l }))).toContain(`Value${shown}`);
      expect(text(g._defaultLinkTooltip(l, { id: 'a' }, { id: l.target }))).toContain(shown);
    }
    expect(text(g._defaultDetails({ link: ad }))).not.toContain('Value');
    const tip = g._defaultLinkTooltip(ad, { id: 'a' }, { id: 'd' });
    expect(tip).not.toContain('rc-num"></span>');
  });

  it('valueFormat formats an amount in all three; text stays as given (maintainer, 2026-11-19)', async () => {
    const g = new Graph('#chart', { duration: 0, valueFormat: v => '$' + v }).setData(data).focus('a');
    await g.whenReady();
    const [ab, ac] = data.links;
    expect(text(g._defaultDetails({ node: g._model.node('a') }))).toContain('$1200');
    expect(text(g._defaultDetails({ link: ab }))).toContain('Value$1200');
    expect(text(g._defaultLinkTooltip(ab, { id: 'a' }, { id: 'b' }))).toContain('$1200');
    expect(text(g._defaultLinkTooltip(ac, { id: 'a' }, { id: 'c' }))).toContain('abc');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as d3 from 'd3';
import { takeChartErrors } from './helpers.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';
import { fixture } from './fixtures/graph.js';

// The Graph chart in the DOM: the ego / path / cluster views, their ties,
// chrome and details panel, and the setData() → view chain with its queue.
// The model and the layouts without a DOM are in graph-model.test.js; the
// flow view in graph-flow.test.js.

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
    expect(svg.getAttribute('role')).toBe('img');
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

  it('interactive legend isolates, multi-selects and resets relation types', async () => {
    const g = new Graph('#chart', {
      dataSource: memorySource(fixture), depth: 2, duration: 0,
      linkTypes: {
        professional: { color: '#09f', label: 'Professional' },
        investment: { color: '#f90', label: 'Investment' },
        family: { color: '#0c7', label: 'Family' },
      },
    });
    await g.focus('a').whenReady();
    const item = type => host.querySelector(`.rc-graph-legend-item[data-type="${type}"]`);
    item('family').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-link')]).toHaveLength(1);
    expect(item('family').getAttribute('aria-pressed')).toBe('true');
    expect(item('professional').getAttribute('aria-pressed')).toBe('false');

    item('professional').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await g.whenReady();
    expect([...host.querySelectorAll('.rc-graph-link')].length).toBeGreaterThan(1);

    host.querySelector('.rc-graph-legend-reset').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    expect(item('investment').getAttribute('aria-pressed')).toBe('true');
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

  it('legend is a static caption in the path view', async () => {
    const g = new Graph('#chart', { dataSource: memorySource(fixture), duration: 0 });
    await g.connect('a', 'f').whenReady();
    const items = [...host.querySelectorAll('.rc-graph-legend-item')];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(b => b.disabled)).toBe(true);
    expect(items.every(b => !b.hasAttribute('aria-pressed'))).toBe(true);
    expect(host.querySelector('.rc-graph-legend-reset')).toBeNull();
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

  it('selecting the default legend type keeps untyped links visible', async () => {
    // Untyped links surface in the legend as 'default' — clicking that item
    // must select them, not filter the whole neighborhood away.
    const untyped = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      links: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    };
    const g = new Graph('#chart', { dataSource: memorySource(untyped), depth: 2, duration: 0 });
    await g.focus('a').whenReady();
    const item = host.querySelector('.rc-graph-legend-item[data-type="default"]');
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await g.whenReady();
    const labels = [...host.querySelectorAll('.rc-graph-node-label')].map(el => el.textContent);
    expect(labels).toEqual(expect.arrayContaining(['A', 'B', 'C']));
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
    expect(tip?.innerHTML).toContain('9 connections');
    expect(tip?.innerHTML).toContain('+3 more');        // 9 ties, 6-name cap
    expect(tip?.innerHTML).toContain('· 5');            // per-type counts
  });

  it('destroy() cleans up without throwing', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(fixture);
    await g.whenReady();
    expect(() => g.destroy()).not.toThrow();
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

  it('isolating a type in the legend keeps only that arc of the pair', async () => {
    const g = new Graph('#chart', { duration: 0 })
      .setData(pairData(['family', 'investment', 'employment']));
    await g.whenReady();
    await g.setRelationTypes(['investment']).whenReady();
    const paths = [...host.querySelectorAll('.rc-graph-link')];
    expect(paths).toHaveLength(1);
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
    expect(stroke('x')).toBe(defaultTheme.colors[0]);
    expect(stroke('y')).toBe(defaultTheme.colors[1]);
    expect(stroke('z')).toBe(defaultTheme.muted);
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
    expect(g._root).toBe('z');
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    // one view in the history: no default (hub) ego was built and then replaced
    expect(g._history.map(h => [h.view, h.root])).toEqual([['ego', 'z']]);
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
    expect(g._root).toBe('hub');
    expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
  });

  it('skips the default ego for connect() and overview() too', async () => {
    const g1 = new Graph('#chart', { duration: 0 }).setData(data);
    g1.connect('x', 'z');
    await g1.whenReady();
    expect(g1._view).toBe('path');

    mount();
    const g2 = new Graph('#chart', { duration: 0 }).setData(data);
    g2.overview();
    await g2.whenReady();
    expect(g2._view).toBe('cluster');
    expect(g2._history.map(h => h.view)).toEqual(['cluster']);
  });

  it('a later view change after whenReady() still recenters', async () => {
    const g = new Graph('#chart', { duration: 0 }).setData(data);
    await g.whenReady();
    await g.focus('y').whenReady();
    expect(g._root).toBe('y');
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

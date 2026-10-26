// K-07 (0.9.8_6): one way relation data enters the library —
// core/links.js normalizeRelationData — read by Graph (every view and its
// model), MapFlow and Sankey, each with its own endpoint policy. The link id
// format is the public one, frozen for 1.0.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeRelationData, tieKey } from '../assets/charts/src/core/links.js';
import { GraphModel } from '../assets/charts/src/graph/model.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { mount, track } from './helpers.js';

afterEach(() => vi.restoreAllMocks());

describe('normalizeRelationData: canonical shape', () => {
  it('reads `flows` and from/to, gives string ids to nodes and ends, strips the aliases', () => {
    const d = normalizeRelationData({ nodes: [{ id: 1 }], flows: [{ from: 1, to: 2, label: 'x' }], title: 't' });
    expect(d.nodes).toEqual([{ id: '1' }]);
    expect(d.links).toEqual([{ id: '1→2#0', source: '1', target: '2', label: 'x' }]);
    expect(d.title).toBe('t');
  });

  it('payload ids (default): source→target#n per ordered pair; a caller id wins, as a string', () => {
    const { links } = normalizeRelationData({ links: [
      { source: 'a', target: 'b', type: 'x' },
      { source: 'a', target: 'b', type: 'y' },
      { source: 'b', target: 'a' },
      { id: 7, source: 'a', target: 'b' },
    ] });
    expect(links.map(l => l.id)).toEqual(['a→b#0', 'a→b#1', 'b→a#0', '7']);
  });

  it("tie ids (Graph's model): source→target|type, 'default' when untyped; a caller id wins", () => {
    const { links } = normalizeRelationData({ links: [
      { source: 'a', target: 'b', type: 'x' },
      { source: 'a', target: 'b', type: 'x' },
      { source: 'a', target: 'b' },
      { id: 'tx1', source: 'a', target: 'b', type: 'x' },
    ] }, { ids: 'tie' });
    expect(links.map(l => l.id)).toEqual(['a→b|x', 'a→b|x', 'a→b|default', 'tx1']);
    expect(tieKey('a', 'b', null)).toBe('a→b|default');
  });

  it('a link without both ends is dropped — with a warning unless warn: false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeRelationData({ links: [{ source: 'a' }, null, { from: 'a', to: 'b' }] }).links).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    normalizeRelationData({ links: [{ source: 'a' }] }, { warn: false });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('normalizeRelationData: unknown endpoints', () => {
  const data = () => ({ nodes: [{ id: 'a' }], links: [{ from: 'a', to: 'x' }, { from: 'y', to: 'a' }, { from: 'a', to: 'a' }] });

  it("'keep' (default) leaves every link and adds no node", () => {
    const d = normalizeRelationData(data());
    expect(d.links).toHaveLength(3);
    expect(d.nodes).toEqual([{ id: 'a' }]);
  });

  it("'create' appends endpoint-only nodes in order of appearance, source first (Graph)", () => {
    const d = normalizeRelationData(data(), { unknownEndpoints: 'create' });
    expect(d.nodes).toEqual([{ id: 'a' }, { id: 'x' }, { id: 'y' }]);
    expect(d.links).toHaveLength(3);
  });

  it("'drop' removes the link and hands it, id and all, to onUnknown (MapFlow, Sankey with nodes)", () => {
    const dropped = [];
    const d = normalizeRelationData(data(), { unknownEndpoints: 'drop', onUnknown: l => dropped.push(l.id) });
    expect(d.links.map(l => l.id)).toEqual(['a→a#0']);
    expect(dropped).toEqual(['a→x#0', 'y→a#0']);
  });

  it('accept() runs after the ids and before the policy: a link it drops creates no node', () => {
    const d = normalizeRelationData({ links: [
      { from: 'a', to: 'b', value: 0 },
      { from: 'a', to: 'b', value: 2 },
      { from: 'c', to: 'd', value: -1 },
    ] }, {
      accept: l => (l.value > 0 ? { ...l, value: l.value * 10 } : null),
      unknownEndpoints: 'create',
    });
    expect(d.links).toEqual([{ id: 'a→b#1', source: 'a', target: 'b', value: 20 }]);
    expect(d.nodes.map(n => n.id)).toEqual(['a', 'b']);
  });
});

describe("GraphModel reads through the shared normalizer, with the model's rules", () => {
  it('quietly: no warning, no tie from a node to itself and no node for one, endpoint-only nodes created', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = GraphModel.normalize({ nodes: [{ id: 'a' }], links: [{ source: 'x' }, { from: 's', to: 's' }, { from: 'a', to: 'b' }] });
    expect(warn).not.toHaveBeenCalled();
    expect(d.nodes.map(n => n.id)).toEqual(['a', 'b']);
    expect(d.links).toEqual([{ id: 'a→b|default', source: 'a', target: 'b' }]);
    const m = new GraphModel({ links: [{ from: 's', to: 's' }, { from: 'a', to: 'b' }] });
    expect(m.toData().nodes.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('mergeCanonical stores canonical links as given: payload ids stay the keys, a self-tie is skipped', () => {
    const trace = normalizeRelationData({ links: [
      { from: 'a', to: 'b', type: 'x' }, { from: 'a', to: 'b', type: 'x' }, { from: 'b', to: 'b' },
    ] }, { unknownEndpoints: 'create' });
    const m = new GraphModel().mergeCanonical(trace);
    expect(m.toData().links.map(l => l.id)).toEqual(['a→b#0', 'a→b#1']);
    expect(m.toData().nodes.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('a derived key another pair holds is numbered across merges, and re-merging stays idempotent', () => {
    const m = new GraphModel({ links: [{ source: 'a→b', target: 'c' }] });
    m.merge({ links: [{ source: 'a', target: 'b→c' }] });
    m.merge({ links: [{ source: 'a', target: 'b→c', label: 'again' }] });
    const ties = m.toData().links;
    expect(ties.map(l => l.id)).toEqual(['a→b→c|default', 'a→b→c|default#1']);
    expect(ties[1]).toMatchObject({ source: 'a', target: 'b→c', label: 'again' });
  });

  it('`flows` is read in every Graph view now, not only in the flow view', async () => {
    const src = memorySource({ flows: [{ from: 'a', to: 'b', type: 'family' }] });
    const sub = await src.neighbors('a', { depth: 1 });
    expect(sub.links).toEqual([expect.objectContaining({ id: 'a→b|family', source: 'a', target: 'b' })]);
  });
});

describe('the public link id, per class', () => {
  it('Graph ego/path/cluster: source→target|type in linkTooltipFormat', async () => {
    mount('chart');
    const seen = [];
    const g = track(new Graph('#chart', {
      duration: 0,
      linkTooltipFormat: ({ link }) => { seen.push(link.id); return ''; },
    })).setData({ flows: [{ from: 'a', to: 'b', type: 'family' }] });
    await g.whenReady();
    document.querySelector('.rc-graph-link-hit').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(seen).toEqual(['a→b|family']);
    expect([...document.querySelectorAll('.rc-graph-legend-item')].map(b => b.dataset.type)).toEqual(['family']);
  });

  it('Graph flow view: source→target#n, the same in the trace and in the model', () => {
    mount('chart');
    const onSelect = vi.fn();
    const g = track(new Graph('#chart', { view: 'flow', duration: 0, onSelect })).setData({
      nodes: [{ id: 'a', lane: 'l1' }],
      links: [{ from: 'a', to: 'b', value: 1 }, { from: 'a', to: 'b', value: 2 }],
    });
    const ids = [...document.querySelectorAll('.rc-flow-link-hit')].map(p => p.__data__.id).sort();
    expect(ids).toEqual(['a→b#0', 'a→b#1']);
    g.select({ link: 'a→b#1' });
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ link: expect.objectContaining({ id: 'a→b#1', value: 2 }) }));
  });

  it('Sankey: derived nodes are labelled by id; a flow without a value names no node', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mount('chart');
    track(new Sankey('#chart', { animate: false, orientation: 'horizontal' })).setData({
      links: [{ from: 'a', to: 'b', value: 2 }, { from: 'b', to: 'ghost', value: 0 }],
    });
    const nodes = [...document.querySelectorAll('.rc-sankey-node')].map(el => el.__data__.data);
    expect(nodes).toEqual([{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }]);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';

// A1 (0.9.8_3): a synchronous `setData(d); focus(id)` chain must draw the ego
// view around `id` without a manual whenReady() in between, and must not
// first build the default (best-connected) ego only to discard it.

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

describe('Graph — setData() → view chain (A1)', () => {
  let host;
  const mount = () => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'chart';
    document.body.appendChild(host);
  };
  beforeEach(mount);

  it('draws the requested ego on a synchronous setData(); focus() chain, 20× in a row', async () => {
    for (let i = 0; i < 20; i++) {
      mount();
      const g = new Graph('#chart', { duration: 0 });
      g.setData(data);
      g.focus('z');
      await g.whenReady();
      expect(g._root).toBe('z');
      expect(host.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    }
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

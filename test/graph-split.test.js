// D-11 (0.9.8_6): Graph.js split like the flow view — the ego/path/cluster
// drawing (graph/views/network.js), the card chrome (graph/chrome.js) and
// the default tooltip/details HTML (graph/tooltips.js) are methods of the
// class kept in their own files. They must join the class whole: on the
// prototype, non-enumerable like class methods, no name claimed twice.
import { describe, it, expect } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { networkView } from '../assets/charts/src/graph/views/network.js';
import { graphChrome } from '../assets/charts/src/graph/chrome.js';
import { graphTooltips } from '../assets/charts/src/graph/tooltips.js';

const parts = { networkView, graphChrome, graphTooltips };

describe('Graph split (D-11)', () => {
  it.each(Object.entries(parts))('%s: every method is on Graph.prototype, non-enumerable', (_name, part) => {
    const names = Object.keys(part);
    expect(names.length).toBeGreaterThan(0);
    names.forEach(name => {
      const desc = Object.getOwnPropertyDescriptor(Graph.prototype, name);
      expect(desc?.value, name).toBe(part[name]);
      expect(desc.enumerable, name).toBe(false);
    });
  });

  it('no method is claimed by two parts, and the parts hold only private (_) methods', () => {
    const all = Object.values(parts).flatMap(p => Object.keys(p));
    expect(new Set(all).size).toBe(all.length);
    expect(all.filter(n => !n.startsWith('_'))).toEqual([]);
  });

  it('the drawing, the chrome and the tooltips each live in their part', () => {
    expect(networkView).toHaveProperty('_draw');
    expect(networkView).toHaveProperty('_renderNetwork');
    expect(graphChrome).toHaveProperty('_renderLegend');
    expect(graphChrome).toHaveProperty('_syncFullscreen');
    expect(graphTooltips).toHaveProperty('_defaultTooltip');
    expect(graphTooltips).toHaveProperty('_defaultDetails');
    // the public API stays a class method of Graph.js
    expect(Object.keys(parts).some(k => 'toggleFullscreen' in parts[k])).toBe(false);
    expect(typeof Graph.prototype.toggleFullscreen).toBe('function');
  });
});

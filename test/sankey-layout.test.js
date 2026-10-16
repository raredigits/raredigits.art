import { describe, it, expect } from 'vitest';
import { sankeyLayout } from '../assets/charts/src/core/sankey.js';

// Budget: two sources into three spending lines.
const budget = {
  nodes: [{ id: 'tax' }, { id: 'debt' }, { id: 'health' }, { id: 'schools' }, { id: 'roads' }],
  links: [
    { id: 'l1', source: 'tax', target: 'health', value: 120 },
    { id: 'l2', source: 'tax', target: 'schools', value: 80 },
    { id: 'l3', source: 'debt', target: 'roads', value: 50 },
    { id: 'l4', source: 'debt', target: 'health', value: 30 },
  ],
};

// Three columns with a node whose input ≠ output.
const chain = {
  nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
  links: [
    { id: 'ab', source: 'a', target: 'b', value: 10 },
    { id: 'bc', source: 'b', target: 'c', value: 6 },
    { id: 'bd', source: 'b', target: 'd', value: 3 },
  ],
};

const opts = { width: 600, height: 400, nodeWidth: 10, nodePadding: 10 };
const byId = r => Object.fromEntries(r.nodes.map(n => [n.id, n]));

describe('sankeyLayout', () => {
  it('assigns columns by longest path and spans the width', () => {
    const r = sankeyLayout(chain, opts);
    const n = byId(r);
    expect(r.columns).toBe(3);
    expect([n.a.layer, n.b.layer, n.c.layer, n.d.layer]).toEqual([0, 1, 2, 2]);
    expect(n.a.x0).toBe(0);
    expect(n.c.x1).toBe(600);
  });

  it('node height follows the larger of in/out flow; bands stack inside the node', () => {
    const r = sankeyLayout(chain, opts);
    const n = byId(r);
    expect(n.b.value).toBe(10);                       // in 10, out 9
    expect(n.b.y1 - n.b.y0).toBeCloseTo(10 * r.ky, 6);
    // outgoing bands of b lie within b and do not overlap
    const out = n.b.sourceLinks.map(l => [l.y0 - l.width / 2, l.y0 + l.width / 2]);
    expect(out[0][0]).toBeCloseTo(n.b.y0, 6);
    expect(out[1][0]).toBeCloseTo(out[0][1], 6);
    expect(out[1][1]).toBeLessThanOrEqual(n.b.y1 + 1e-6);
  });

  it('nodes of one column never overlap and stay inside the height', () => {
    const r = sankeyLayout(budget, opts);
    for (let c = 0; c < r.columns; c++) {
      const col = r.nodes.filter(n => n.layer === c).sort((a, b) => a.y0 - b.y0);
      col.forEach((n, i) => {
        expect(n.y0).toBeGreaterThanOrEqual(-1e-6);
        expect(n.y1).toBeLessThanOrEqual(400 + 1e-6);
        if (i) expect(n.y0).toBeGreaterThanOrEqual(col[i - 1].y1 - 1e-6);
      });
    }
  });

  it('is deterministic and keeps input order by default', () => {
    const a = sankeyLayout(budget, opts);
    const b = sankeyLayout(budget, opts);
    expect(a.nodes.map(n => [n.y0, n.y1])).toEqual(b.nodes.map(n => [n.y0, n.y1]));
    const right = a.nodes.filter(n => n.layer === 1).sort((x, y) => x.y0 - y.y0).map(n => n.id);
    expect(right).toEqual(['health', 'schools', 'roads']);
  });

  it("sort: 'value' puts the biggest node first in its column", () => {
    const r = sankeyLayout(budget, { ...opts, sort: 'value' });
    const right = r.nodes.filter(n => n.layer === 1).sort((x, y) => x.y0 - y.y0).map(n => n.id);
    expect(right[0]).toBe('health');                 // 150
    expect(right[right.length - 1]).toBe('roads');   // 50
  });

  it('honours manual column overrides and alignment', () => {
    const withCol = sankeyLayout({
      nodes: [{ id: 'a' }, { id: 'b', column: 2 }, { id: 'c' }],
      links: [{ source: 'a', target: 'b', value: 1 }, { source: 'a', target: 'c', value: 1 }],
    }, opts);
    expect(byId(withCol).b.layer).toBe(2);
    expect(withCol.columns).toBe(3);

    const left = sankeyLayout(chain, { ...opts, align: 'left' });
    expect(byId(left).d.layer).toBe(2);
  });

  it('throws on cycles and names them', () => {
    expect(() => sankeyLayout({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 }],
    }, opts)).toThrow(/cycle \(a → b → a\)/);
    expect(() => sankeyLayout({
      nodes: [{ id: 'a' }], links: [{ source: 'a', target: 'a', value: 1 }],
    }, opts)).toThrow(/cycle/);
  });

  it('handles empty input', () => {
    const r = sankeyLayout({ nodes: [], links: [] }, opts);
    expect(r.nodes).toEqual([]);
    expect(r.columns).toBe(0);
  });
});

describe('sankeyLayout — band coordinates', () => {
  it('every band has finite ends regardless of node order', () => {
    // target listed before its source: incoming bands are stacked before the
    // source node is visited
    const r = sankeyLayout({
      nodes: [{ id: 'c' }, { id: 'b' }, { id: 'a' }],
      links: [{ source: 'a', target: 'b', value: 3 }, { source: 'b', target: 'c', value: 2 },
              { source: 'a', target: 'c', value: 1 }],
    }, { width: 300, height: 200 });
    r.links.forEach(l => {
      expect(Number.isFinite(l.y0)).toBe(true);
      expect(Number.isFinite(l.y1)).toBe(true);
      expect(Number.isFinite(l.width)).toBe(true);
    });
  });
});

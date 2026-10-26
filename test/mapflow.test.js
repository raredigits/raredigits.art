import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { mount, track } from './helpers.js';

// MapFlow (0.9.8_6): flows over Map geometry. Spec:
// charts/SPEC-GRAPH-MAPFLOW-INTERNAL.md, part B.

// Two square "countries" and a small overseas island for the second one —
// enough geometry to fit a projection and test centroids. Rings are wound
// the RFC 7946 way (counter-clockwise), which d3 reads inverted — the chart
// has to cope.
const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const geoData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: '100', properties: { name: 'West' }, geometry: { type: 'Polygon', coordinates: square(0, 40, 10) } },
    { type: 'Feature', id: '200', properties: { name: 'East' },
      geometry: { type: 'MultiPolygon', coordinates: [square(30, 40, 10), square(60, -20, 1)] } },
  ],
};

const data = {
  nodes: [
    { id: 'W', label: 'West', country: '100' },
    { id: 'E', label: 'East', country: '200' },
    { id: 'C', label: 'City', coords: [20, 45] },
  ],
  links: [
    { from: 'W', to: 'E', type: 'goods', value: 3, start: 1800, end: 1850, label: 'cloth' },
    { from: 'E', to: 'W', type: 'silver', value: 1, start: 1820, end: 1900 },
    { from: 'W', to: 'C', type: 'goods', value: 2, start: 1900 },
  ],
};

const mk = (opts = {}) => track(new MapFlow(mount(null), {
  geoData,
  projection: 'mercator',
  linkTypes: { goods: { color: '#8a5a2b', label: 'goods' }, silver: { color: '#5b6b7d', label: 'silver', dash: '6 4' } },
  ...opts,
}));
const flows = c => [...c.container.querySelectorAll('.rc-mapflow-link')].map(p => p.__data__);

describe('MapFlow', () => {
  it('draws one arc, one arrowhead and one hit path per flow, and a dot per node', () => {
    const c = mk().setData(data);
    expect(flows(c)).toHaveLength(3);
    expect(c.container.querySelectorAll('.rc-mapflow-head')).toHaveLength(3);
    expect(c.container.querySelectorAll('.rc-mapflow-link-hit')).toHaveLength(3);
    expect(c.container.querySelectorAll('.rc-mapflow-node')).toHaveLength(3);
    // a dashed type gets butt caps, so the dash survives a thick stroke
    const silver = [...c.container.querySelectorAll('.rc-mapflow-link')].find(p => p.__data__.type === 'silver');
    expect(silver.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(silver.getAttribute('stroke-linecap')).toBe('butt');
  });

  it('accepts nodes/links (or flows) as options', () => {
    const c = mk({ nodes: data.nodes, flows: data.links });
    expect(flows(c)).toHaveLength(3);
  });

  it('places a country node at the centroid of its largest polygon', () => {
    const c = mk().setData(data);
    const [lon, lat] = c._coordsOf(data.nodes[1]);
    expect(lon).toBeGreaterThan(30);
    expect(lon).toBeLessThan(40);                 // not dragged towards the island at 60°
    expect(lat).toBeGreaterThan(40);
  });

  it('bows A→B and B→A to opposite sides', () => {
    const c = mk().setData(data);
    const paths = [...c.container.querySelectorAll('.rc-mapflow-link')];
    const there = paths.find(p => p.__data__.source === 'W' && p.__data__.target === 'E').getAttribute('d');
    const back = paths.find(p => p.__data__.source === 'E' && p.__data__.target === 'W').getAttribute('d');
    const midY = d0 => {
      const pts = d0.slice(1).split('L').map(s => s.split(',').map(Number));
      return pts[Math.floor(pts.length / 2)][1];
    };
    // the straight chord between the two ends, at mid-span
    const [w, e] = [c._coordsOf(data.nodes[0]), c._coordsOf(data.nodes[1])].map(p => c._projection(p));
    const chordY = (w[1] + e[1]) / 2;
    expect(Math.sign(midY(there) - chordY)).not.toBe(Math.sign(midY(back) - chordY));
  });

  it('setTimeWindow hides flows outside the window; a place with none left fades', () => {
    const c = mk().setData(data);
    c.setTimeWindow(1860, 1870);
    expect(flows(c).map(l => l.type)).toEqual(['silver']);
    const city = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === 'C');
    expect(city.getAttribute('opacity')).toBe('0.3');
    c.setTimeWindow();
    expect(flows(c)).toHaveLength(3);
  });

  it("timeWindowMode: 'dim' keeps the flows, faded", () => {
    const c = mk({ timeWindowMode: 'dim', timeWindow: [1860, 1870] }).setData(data);
    const ops = [...c.container.querySelectorAll('.rc-mapflow-link')].map(p => [p.__data__.type, p.getAttribute('stroke-opacity')]);
    expect(ops).toHaveLength(3);
    expect(ops.filter(([, o]) => o === '0.15')).toHaveLength(2);
  });

  it('the legend lists the types and turns them off; setLinkTypesVisible does the same', () => {
    const c = mk().setData(data);
    const buttons = [...c.container.querySelectorAll('.rc-mapflow-legend button')];
    expect(buttons.map(b => b.textContent)).toEqual(['goods', 'silver']);
    buttons[0].click();
    expect(flows(c).map(l => l.type)).toEqual(['silver']);
    expect(c.container.querySelector('.rc-mapflow-legend button').getAttribute('aria-pressed')).toBe('false');
    c.setLinkTypesVisible(null);
    expect(flows(c)).toHaveLength(3);
    c.setLinkTypesVisible(['goods']);
    expect(flows(c).every(l => l.type === 'goods')).toBe(true);
  });

  it('linkLegend: false hides the legend', () => {
    const c = mk({ linkLegend: false }).setData(data);
    expect(c.container.querySelector('.rc-mapflow-legend')).toBeNull();
  });

  it('drops a flow to an unknown node with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = mk().setData({ nodes: data.nodes, links: [...data.links, { from: 'W', to: 'nowhere' }] });
    expect(flows(c)).toHaveLength(3);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown node'));
  });

  it('click pins the flow tooltip; flows are named for assistive tech', () => {
    const c = mk().setData(data);
    const hit = c.container.querySelector('.rc-mapflow-link-hit');
    expect(hit.getAttribute('aria-label')).toMatch(/→/);
    expect(hit.getAttribute('tabindex')).toBe('0');
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c._tooltip.isPinned).toBe(true);
    expect(c._tooltip.el.innerHTML).toContain('→');
    c._tooltip.unpin();
  });

  it("fitTo: 'links' fits the projection to the places, not the whole map", () => {
    const wide = mk().setData(data);
    const tight = mk({ fitTo: 'links' }).setData(data);
    const span = ch => Math.abs(ch._projection([30, 45])[0] - ch._projection([5, 45])[0]);
    // re-render after data so the fit sees the nodes
    tight.render();
    expect(span(tight)).toBeGreaterThan(span(wide));
  });

  it('timeframes and a navigator with a time axis: eras pick flows, setTimeWindow moves the view', () => {
    const era = y => ({ key: String(y), label: String(y), range: [`${y}-01-01`, `${y}-12-31`] });
    const c = mk({ timeframes: [era(1830), era(1880), 'ALL'], navigator: true, defaultView: ['1830-01-01', '1830-12-31'] })
      .setData(data);
    expect(flows(c).map(l => l.type).sort()).toEqual(['goods', 'silver']);
    expect(c.container.querySelector('.rc-range-btn.active').textContent).toBe('1830');
    expect(c.container.querySelector('.rc-chart-navigator .rc-ov-axis')).not.toBeNull();
    c.setTimeframe('1880');
    expect(flows(c).map(l => l.type)).toEqual(['silver']);
    c.setTimeWindow(1900, null);
    expect(flows(c).map(l => l.target).sort()).toEqual(['C', 'W']);
    expect(c.container.querySelector('.rc-range-btn.active')).toBeNull();
    c.setTimeWindow();
    expect(flows(c)).toHaveLength(3);
    expect(c.container.querySelector('.rc-range-btn.active').textContent).toBe('ALL');
  });

  it('tooltipFormat is for places; hovering a country uses regionTooltipFormat (R-10)', () => {
    const c = mk({ tooltipFormat: ({ node }) => `place ${node.label}`, regionTooltipFormat: ({ feature }) => `region ${feature.id}` })
      .setData(data);
    expect(() => c.container.querySelector('.rc-map-feature').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))).not.toThrow();
    expect(c._tooltip.el.textContent).toMatch(/^region /);
    c.container.querySelector('.rc-mapflow-node').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(c._tooltip.el.textContent).toMatch(/^place /);
  });

  it('an arc shorter than the target margin points source → target and draws no reversed line (R-11)', () => {
    const c = mk().setData({
      nodes: [{ id: 'P', coords: [5, 45] }, { id: 'Q', coords: [5.05, 45] }, ...data.nodes],
      links: [{ from: 'P', to: 'Q', type: 'goods', value: 3 }, ...data.links],
    });
    const head = [...c.container.querySelectorAll('.rc-mapflow-head')].find(h => h.__data__.source === 'P');
    const [tip, b1, b2] = head.getAttribute('d').slice(1, -1).split('L').map(p => p.split(',').map(Number));
    const base = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
    const [px] = c._projection([5, 45]), [qx] = c._projection([5.05, 45]);
    expect(Math.sign(tip[0] - base[0])).toBe(Math.sign(qx - px));   // the head points at Q
    const line = [...c.container.querySelectorAll('.rc-mapflow-link')].find(p => p.__data__.source === 'P');
    expect(line.getAttribute('d')).toBe('');
    // still a mouse target: the hit path runs along the chord, and hovering it shows the flow
    const hit = [...c.container.querySelectorAll('.rc-mapflow-link-hit')].find(p => p.__data__.source === 'P');
    expect(hit.getAttribute('d')).toMatch(/^M.+L/);
    hit.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(c._tooltip.el.classList.contains('is-visible')).toBe(true);
  });

  it('an untyped flow is named by a described default type, in the tooltip and the aria-label as in the legend (R-01)', () => {
    const c = mk({ linkTypes: { default: { color: '#123456', label: 'Trade' } } })
      .setData({ nodes: data.nodes, links: [{ from: 'W', to: 'E', value: 1 }] });
    const hit = c.container.querySelector('.rc-mapflow-link-hit');
    expect(hit.getAttribute('aria-label')).toContain('Trade');
    hit.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(c._tooltip.el.textContent).toContain('Trade');
  });

  it('Enter on a focused arc pins its tooltip at the arc: through the zoom, in card coordinates (R-12)', () => {
    const c = mk({ zoom: true }).setData(data);
    const svg = c.container.querySelector('svg');
    const pinAt = (left, top, transform) => {
      svg.getBoundingClientRect = () => ({ left, top, right: left + 800, bottom: top + 400, width: 800, height: 400 });
      c._zoomTransform = transform;
      const pin = vi.spyOn(c._tooltip, 'pin');
      c.container.querySelector('.rc-mapflow-link-hit').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const [x, y] = pin.mock.calls.at(-1);
      pin.mockRestore();
      c._tooltip.unpin();
      return [x, y];
    };
    const identity = d3.zoomIdentity;
    const [x0, y0] = pinAt(0, 0, identity);
    const [x1, y1] = pinAt(40, 70, identity);               // header above, gutter left
    expect([x1 - x0, y1 - y0]).toEqual([40, 70]);
    const [x2, y2] = pinAt(0, 0, identity.translate(50, 0).scale(2));
    expect(x2).toBeCloseTo(x0 * 2 + 50, 6);                  // the zoomed position of the same point
    expect(y2).toBeCloseTo(y0 * 2, 6);
  });

  it("fitTo: 'links' with every place at one point falls back to the map (K-03)", () => {
    const c = mk({ fitTo: 'links' }).setData({
      nodes: [{ id: 'A', coords: [5, 45] }, { id: 'B', coords: [5, 45] }],
      links: [{ from: 'A', to: 'B' }],
    });
    expect(c.container.querySelector('.rc-map-feature').getAttribute('d')).not.toMatch(/NaN/);
    expect(c.container.querySelectorAll('.rc-mapflow-node')).toHaveLength(2);
  });

  it('the default arc tooltip lists sources as links — only safe URLs become links (R-15)', () => {
    const c = mk().setData({
      nodes: data.nodes,
      links: [{ from: 'W', to: 'E', type: 'goods', value: 1, sources: [{ url: 'https://example.com/a', title: 'Ledger' }, 'javascript:alert(1)'] }],
    });
    c.container.querySelector('.rc-mapflow-link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const links = [...c._tooltip.el.querySelectorAll('a')];
    expect(links.map(a => a.getAttribute('href'))).toEqual(['https://example.com/a']);
    expect(c._tooltip.el.textContent).toContain('javascript:alert(1)');
    c._tooltip.unpin();
  });

  it('a place label keeps off the other places\' dots (D6)', () => {
    // Alpha carries the flow, so it is labelled first; Beta sits just right of
    // it (fitted to the places, about 15 px), where Alpha's label would go by
    // default. The flow lands far off, at City.
    const c = mk({ fitTo: 'links' }).setData({
      nodes: [{ id: 'A', label: 'Alpha', coords: [10, 45] }, { id: 'B', label: 'Beta', coords: [10.2, 45] },
        { id: 'C', label: 'City', coords: [20, 46] }],
      links: [{ from: 'A', to: 'C', type: 'goods', value: 3 }],
    });
    const dot = id => [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === id);
    const r = +dot('B').getAttribute('r');
    const [bx, by] = ['cx', 'cy'].map(k => +dot('B').getAttribute(k));
    const label = [...c.container.querySelectorAll('.rc-mapflow-label')].find(t => t.__data__.n.id === 'A');
    const w = 'Alpha'.length * 6.4;
    const x = +label.getAttribute('x'), y = +label.getAttribute('y');
    const x0 = { start: x, end: x - w, middle: x - w / 2 }[label.getAttribute('text-anchor')];
    const overlaps = x0 < bx + r && x0 + w > bx - r && y - 10 < by + r && y + 2 > by - r;
    expect(overlaps).toBe(false);
  });

  it('a legend button pressed from the keyboard keeps focus through the redraw (R-16)', () => {
    const c = mk().setData(data);
    const first = c.container.querySelector('.rc-mapflow-legend button');
    first.focus();
    first.click();                                 // Enter and Space on a button fire click
    const now = document.activeElement;
    expect(now).not.toBe(document.body);
    expect(c.container.querySelector('.rc-mapflow-legend').contains(now)).toBe(true);
    expect(now.textContent).toBe('goods');
    expect(now.getAttribute('aria-pressed')).toBe('false');
    now.click();
    expect(document.activeElement.getAttribute('aria-pressed')).toBe('true');
  });

  it('regionTooltipFormat gets item null: MapFlow takes no region data', () => {
    const items = [];
    const c = mk({ regionTooltipFormat: ({ item }) => { items.push(item); return 'r'; } }).setData(data);
    c.container.querySelectorAll('.rc-map-feature')
      .forEach(p => p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(items).toEqual([null, null]);
  });
});

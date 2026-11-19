import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { mount, track, tooltipOf, unclampTooltip, tooltipPosition } from './helpers.js';

// MapFlow (0.9.8_6): flows over Map geometry. The decisions:
// assets/charts/docs/DECISIONS.md §13, MapFlow.

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

const mk = (opts = {}, host = mount(null)) => track(new MapFlow(host, {
  geoData,
  projection: 'mercator',
  linkTypes: { goods: { color: '#8a5a2b', label: 'goods' }, silver: { color: '#5b6b7d', label: 'silver', dash: '6 4' } },
  ...opts,
}));
const flows = c => [...c.container.querySelectorAll('.rc-mapflow-link')].map(p => p.__data__);
// A place as drawn: the centre of its dot, at the projected place (no zoom).
const dotOf = (c, id) => {
  const dot = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === id);
  return [+dot.getAttribute('cx'), +dot.getAttribute('cy')];
};

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
    // the main square's corners, as places on the same map (fitted to the
    // regions, not to the places)
    const corners = mk().setData({ nodes: [{ id: 'sw', coords: [30, 40] }, { id: 'ne', coords: [40, 50] }], links: [] });
    const [x, y] = dotOf(c, 'E');
    const [[x0, y0], [x1, y1]] = [dotOf(corners, 'sw'), dotOf(corners, 'ne')];
    expect(x).toBeGreaterThan(x0);
    expect(x).toBeLessThan(x1);                   // not dragged towards the island at 60°
    expect(y).toBeLessThan(y0);                   // north of 40°…
    expect(y).toBeGreaterThan(y1);                // …and south of 50°
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
    const [w, e] = [dotOf(c, 'W'), dotOf(c, 'E')];
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
    const buttons = [...c.container.querySelectorAll('.rc-mapflow-legend button.rc-legend-item')];
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
    expect(tooltipOf(c).classList.contains('is-pinned')).toBe(true);
    expect(tooltipOf(c).innerHTML).toContain('→');
  });

  it("fitTo: 'links' fits the projection to the places, not the whole map", () => {
    const wide = mk().setData(data);
    const tight = mk({ fitTo: 'links' }).setData(data);
    const span = ch => Math.abs(dotOf(ch, 'E')[0] - dotOf(ch, 'W')[0]);
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
    // the navigator's axis has ticks, and they read as the flows' years (S-13)
    const ticks = [...c.container.querySelectorAll('.rc-chart-navigator .rc-ov-axis .tick text')].map(t => t.textContent);
    expect(ticks.length).toBeGreaterThan(1);
    ticks.forEach(t => expect(t).toMatch(/^1[89]\d\d$/));
    expect(ticks.map(Number)).toEqual([...ticks.map(Number)].sort((x, y) => x - y));
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
    expect(tooltipOf(c).textContent).toMatch(/^region /);
    c.container.querySelector('.rc-mapflow-node').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltipOf(c).textContent).toMatch(/^place /);
  });

  it('an arc shorter than the target margin points source → target and draws no reversed line (R-11)', () => {
    const c = mk().setData({
      nodes: [{ id: 'P', coords: [5, 45] }, { id: 'Q', coords: [5.05, 45] }, ...data.nodes],
      links: [{ from: 'P', to: 'Q', type: 'goods', value: 3 }, ...data.links],
    });
    const head = [...c.container.querySelectorAll('.rc-mapflow-head')].find(h => h.__data__.source === 'P');
    const [tip, b1, b2] = head.getAttribute('d').slice(1, -1).split('L').map(p => p.split(',').map(Number));
    const base = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
    const [[px], [qx]] = [dotOf(c, 'P'), dotOf(c, 'Q')];
    expect(Math.sign(tip[0] - base[0])).toBe(Math.sign(qx - px));   // the head points at Q
    const line = [...c.container.querySelectorAll('.rc-mapflow-link')].find(p => p.__data__.source === 'P');
    expect(line.getAttribute('d')).toBe('');
    // still a mouse target: the hit path runs along the chord, and hovering it shows the flow
    const hit = [...c.container.querySelectorAll('.rc-mapflow-link-hit')].find(p => p.__data__.source === 'P');
    expect(hit.getAttribute('d')).toMatch(/^M.+L/);
    hit.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltipOf(c).classList.contains('is-visible')).toBe(true);
  });

  it('an untyped flow is named by a described default type, in the tooltip and the aria-label as in the legend (R-01)', () => {
    const c = mk({ linkTypes: { default: { color: '#123456', label: 'Trade' } } })
      .setData({ nodes: data.nodes, links: [{ from: 'W', to: 'E', value: 1 }] });
    const hit = c.container.querySelector('.rc-mapflow-link-hit');
    expect(hit.getAttribute('aria-label')).toContain('Trade');
    hit.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltipOf(c).textContent).toContain('Trade');
  });

  it('Enter on a focused arc pins its tooltip at the arc: through the zoom, in card coordinates (R-12)', () => {
    // an 800×400 card (S-18): the ×2 zoom below moves the arc's middle over
    // 200px, and the pins stay clear of the tooltip's clamp to the card
    const c = mk({ zoom: true }, mount(null, { width: 800, height: 400 })).setData(data);
    const svg = c.container.querySelector('svg');
    const hit = c.container.querySelector('.rc-mapflow-link-hit');
    const arc = [...c.container.querySelectorAll('.rc-mapflow-link')].find(p => p.__data__ === hit.__data__);
    // The middle of the arc as drawn — half its length along its pieces —
    // where the map's zoom puts it on the svg.
    const middle = () => {
      const pieces = arc.getAttribute('d').split('M').filter(Boolean).map(s => s.split('L').map(p => p.split(',').map(Number)));
      const segs = pieces.flatMap(pts => pts.slice(1).map((q, i) => [pts[i], q, Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])]));
      let half = segs.reduce((s, [, , len]) => s + len, 0) / 2;
      const [p, q, len] = segs.find(([, , l]) => (half -= l) <= 0);
      const f = (len + half) / len;
      const [x, y] = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
      const z = (c.container.querySelector('.rc-map-zoom').getAttribute('transform') ?? '')
        .match(/translate\(([-\d.e]+),([-\d.e]+)\) scale\(([-\d.e]+)\)/)?.slice(1).map(Number) ?? [0, 0, 1];
      return [x * z[2] + z[0], y * z[2] + z[1]];
    };
    // The page zooms (the map's own d3 zoom: there is no public zoom call),
    // the svg sits at (left, top) in the card, Enter pins.
    const pinAt = (left, top, transform) => {
      svg.getBoundingClientRect = () => ({ left, top, right: left + 800, bottom: top + 400, width: 800, height: 400 });
      c.svg.call(c._zoom.transform, transform);
      hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(tooltipOf(c).classList.contains('is-pinned')).toBe(true);
      return [...tooltipPosition(tooltipOf(c)), ...middle()];
    };
    const identity = d3.zoomIdentity;
    pinAt(0, 0, identity);
    unclampTooltip(c);                                       // where the chart put it, not jsdom's clamp
    const [x0, y0, mx0, my0] = pinAt(0, 0, identity);
    const [x1, y1] = pinAt(40, 70, identity);               // header above, gutter left
    expect([x1 - x0, y1 - y0]).toEqual([40, 70]);
    // ×2, panned left so the arc's middle stays on the card
    const [x2, y2, mx2, my2] = pinAt(0, 0, identity.translate(-150, 0).scale(2));
    expect(mx2 - mx0).toBeGreaterThan(200);                  // the zoom moved the arc's middle (≈ ×2 − 150)…
    expect(x2 - x0).toBeCloseTo(mx2 - mx0, 2);               // …and the pin went with it
    expect(y2 - y0).toBeCloseTo(my2 - my0, 2);
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
    const links = [...tooltipOf(c).querySelectorAll('a')];
    expect(links.map(a => a.getAttribute('href'))).toEqual(['https://example.com/a']);
    expect(tooltipOf(c).textContent).toContain('javascript:alert(1)');
  });

  it('valueFormat prints a flow\'s value in its tooltip (maintainer, 2026-11-19)', () => {
    const c = mk({ valueFormat: v => '$' + v + 'bn' }).setData({
      nodes: data.nodes, links: [{ from: 'W', to: 'E', type: 'goods', value: 3 }],
    });
    c.container.querySelector('.rc-mapflow-link-hit').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltipOf(c).textContent).toContain('$3bn');
  });

  it('Tab from an arc with a pinned tooltip goes into its links; past the last, back to the arc, released (K-23)', () => {
    const c = mk().setData({
      nodes: data.nodes,
      links: [{ from: 'W', to: 'E', type: 'goods', value: 1, sources: [{ url: 'https://example.com/a', title: 'Ledger' }] }],
    });
    const hit = c.container.querySelector('.rc-mapflow-link-hit');
    const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    hit.focus();
    expect(key(hit, 'Tab')).toBe(true);                     // not pinned: the browser's Tab
    key(hit, 'Enter');
    expect(key(hit, 'Tab')).toBe(false);                    // pinned: into the tooltip
    const link = tooltipOf(c).querySelector('a');
    expect(document.activeElement).toBe(link);
    key(link, 'Tab');                                       // past the last link
    expect(tooltipOf(c).classList.contains('is-pinned')).toBe(false);
    expect(document.activeElement).toBe(hit);
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

  it('a legend button pressed from the keyboard keeps focus through the redraw (R-16): the same element', () => {
    const c = mk().setData(data);
    const first = c.container.querySelector('.rc-mapflow-legend button');
    first.focus();
    first.click();                                 // Enter and Space on a button fire click
    expect(document.activeElement).toBe(first);    // updated in place, not rebuilt
    expect(first.isConnected).toBe(true);
    expect(first.textContent).toBe('goods');
    expect(first.getAttribute('aria-pressed')).toBe('false');
    first.click();
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-pressed')).toBe('true');
  });

  it('regionTooltipFormat gets item null: MapFlow takes no region data', () => {
    const items = [];
    const c = mk({ regionTooltipFormat: ({ item }) => { items.push(item); return 'r'; } }).setData(data);
    c.container.querySelectorAll('.rc-map-feature')
      .forEach(p => p.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(items).toEqual([null, null]);
  });
});

// ─── The type legend on the legend builder (D-04, K-05, K-06) ──────────────
// MapFlow's type legend is drawn by the one legend builder (core/legend.js):
// each flow type a toggle with the gestures every RareCharts legend shares,
// "Show all", state in aria-pressed. The hidden types are the chart's hidden
// set, which hiddenLinkTypes seeds and setLinkTypesVisible sets (K-05:
// visibility). The decisions: assets/charts/docs/DECISIONS.md §3, "The legend in detail".

describe('MapFlow: the type legend on the legend builder', () => {
  const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
  const doubleClick = node => {
    click(node, 1);
    click(node, 2);
    node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
  };
  const three = {
    nodes: data.nodes,
    links: [
      { from: 'W', to: 'E', type: 'goods', value: 3 },
      { from: 'E', to: 'W', type: 'silver', value: 1 },
      { from: 'W', to: 'C', type: 'arms', value: 2 },
    ],
  };
  const legendOf = c => c.container.querySelector('.rc-mapflow-legend');
  const item = (c, key) => legendOf(c).querySelector(`button.rc-legend-item[data-key="${key}"]`);
  const resetOf = c => legendOf(c).querySelector('.rc-legend-reset');
  const drawn = c => flows(c).map(l => l.type).sort();
  const pinned = c => tooltipOf(c).classList.contains('is-pinned');
  const hitOf = (c, type) => [...c.container.querySelectorAll('.rc-mapflow-link-hit')].find(h => h.__data__.type === type);

  it('a toggle per type in its colour and its own dash, Show all last; the K-06 aliases, no data-type', () => {
    const c = mk().setData(data);
    const legend = legendOf(c);
    expect(legend.getAttribute('role')).toBe('group');
    expect(legend.getAttribute('aria-label')).toBe('Legend');
    const shape = el => [el.localName, el.className, el.dataset.key ?? null, el.getAttribute('aria-pressed'),
      el.dataset.type ?? null, el.firstElementChild.className, el.firstElementChild.getAttribute('style'), el.lastElementChild.textContent];
    expect([...legend.children].slice(0, 2).map(shape)).toEqual([
      ['button', 'rc-legend-item rc-graph-legend-item', 'goods', 'true', null, 'rc-legend-line', '--rc-swatch-color: #8a5a2b;', 'goods'],
      ['button', 'rc-legend-item rc-graph-legend-item', 'silver', 'true', null, 'rc-legend-line rc-legend-line--dashed',
        '--rc-swatch-color: #5b6b7d; --rc-swatch-dash: 6px; --rc-swatch-gap: 4px;', 'silver'],
    ]);
    expect(legend.querySelector('svg')).toBeNull();          // the 22×12 svg swatch is gone
    const reset = legend.lastElementChild;
    expect(reset.matches('button.rc-legend-reset.rc-graph-legend-reset')).toBe(true);
    expect(reset.hidden).toBe(true);
    expect(reset.hasAttribute('aria-pressed')).toBe(false);
    expect(reset.textContent).toBe('Show all');
    expect(legend.children).toHaveLength(3);
    // a dash the drawing draws solid (a word) shows a plain line, as drawn
    const solid = mk({ linkTypes: { goods: { color: '#8a5a2b' }, silver: { color: '#5b6b7d', dash: 'dashed' } } }).setData(data);
    expect(item(solid, 'silver').firstElementChild.className).toBe('rc-legend-line');
    expect(item(solid, 'silver').firstElementChild.getAttribute('style')).toBe('--rc-swatch-color: #5b6b7d;');
  });

  it('a click hides a type; a pointer hide waits for a second click; a double click keeps one type in one redraw, a second brings all back; Show all', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const c = mk().setData(three);
      const render = vi.spyOn(c, 'render');
      click(item(c, 'goods'));
      expect(drawn(c)).toEqual(['arms', 'silver']);
      click(item(c, 'goods'));
      expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
      click(item(c, 'goods'), 1);
      expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);       // waiting for a second click
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      expect(drawn(c)).toEqual(['arms', 'silver']);
      click(item(c, 'goods'), 1);                                  // a show: at once
      expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
      const places = ['W', 'E', 'C'].map(id => dotOf(c, id));
      const n = render.mock.calls.length;
      doubleClick(item(c, 'silver'));
      vi.advanceTimersByTime(HIDE_DELAY_MS);
      expect(render.mock.calls.length - n).toBe(1);                // one redraw, no flash
      expect(drawn(c)).toEqual(['silver']);
      expect(['W', 'E', 'C'].map(id => dotOf(c, id))).toEqual(places);   // places stay
      doubleClick(item(c, 'silver'));
      expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
      click(item(c, 'arms'));
      expect(resetOf(c).hidden).toBe(false);
      click(resetOf(c));
      expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
      expect(resetOf(c).hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('onLegendToggle after the redraw, visibleNames in data order, the chart as this; setLinkTypesVisible stays silent', () => {
    const calls = [];
    let c;
    const onLegendToggle = vi.fn(function (info) { calls.push({ info, drawn: drawn(c), self: this }); });
    c = mk({ onLegendToggle }).setData(three);
    click(item(c, 'silver'));
    doubleClick(item(c, 'arms'));
    click(resetOf(c));
    c.setLinkTypesVisible(['goods']);
    c.setLinkTypesVisible(null);
    expect(calls).toEqual([
      { info: { name: 'silver', visible: false, visibleNames: ['goods', 'arms'] }, drawn: ['arms', 'goods'], self: c },
      { info: { name: 'arms', visible: true, visibleNames: ['arms'] }, drawn: ['arms'], self: c },
      { info: { name: null, visible: true, visibleNames: ['goods', 'silver', 'arms'] }, drawn: ['arms', 'goods', 'silver'], self: c },
    ]);
  });

  it('setLinkTypesVisible(list | name | null): only those types, as the legend shows; null all; a type the data lacks drops', () => {
    const c = mk({ hiddenLinkTypes: ['gone'] }).setData(three);
    expect(resetOf(c).hidden).toBe(true);           // 'gone' is not in the data: nothing drawn is off
    expect(c.setLinkTypesVisible(['goods', 'arms', 'gone'])).toBe(c);
    expect(drawn(c)).toEqual(['arms', 'goods']);
    expect(item(c, 'silver').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(c).hidden).toBe(false);
    c.setLinkTypesVisible('silver');
    expect(drawn(c)).toEqual(['silver']);
    expect(c.setLinkTypesVisible(null)).toBe(c);
    expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
    expect(resetOf(c).hidden).toBe(true);
    // the hidden 'gone' dropped with the first call: data that brings it shows it
    c.setData({ nodes: data.nodes, links: [...three.links, { from: 'C', to: 'E', type: 'gone', value: 1 }] });
    expect(drawn(c)).toEqual(['arms', 'gone', 'goods', 'silver']);
  });

  it('hiddenLinkTypes: off from the start with Show all; a hidden type stays hidden across setData, also while the data lacks it', () => {
    const c = mk({ hiddenLinkTypes: ['silver'] }).setData(data);
    expect(drawn(c)).toEqual(['goods', 'goods']);
    expect(item(c, 'silver').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(c).hidden).toBe(false);
    c.setData({ nodes: data.nodes, links: [data.links[0], data.links[2]] });
    expect(item(c, 'silver')).toBeNull();
    expect(resetOf(c).hidden).toBe(true);            // nothing in this data is off
    c.setData(data);
    expect(drawn(c)).toEqual(['goods', 'goods']);
    expect(item(c, 'silver').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(c).hidden).toBe(false);
  });

  it('legendInteractive: false lists the types drawn as labels: no buttons, no Show all, no group; the method still works', () => {
    const c = mk({ legendInteractive: false, hiddenLinkTypes: ['silver'] }).setData(three);
    const legend = legendOf(c);
    expect([...legend.children].map(el => [el.localName, el.className, el.dataset.key, el.hasAttribute('aria-pressed'), el.textContent]))
      .toEqual([
        ['div', 'rc-legend-item rc-graph-legend-item', 'goods', false, 'goods'],
        ['div', 'rc-legend-item rc-graph-legend-item', 'arms', false, 'arms'],
      ]);
    expect(legend.hasAttribute('role')).toBe(false);
    expect(legend.querySelector('button')).toBeNull();
    c.setLinkTypesVisible(null);
    expect(drawn(c)).toEqual(['arms', 'goods', 'silver']);
    expect([...legend.children].map(el => el.textContent)).toEqual(['goods', 'silver', 'arms']);
  });

  it('one type: a legend only when the page describes the types; then a toggle and Show all, and the last type may go', () => {
    const one = { nodes: data.nodes, links: [data.links[0]] };
    const bare = mk({ linkTypes: undefined }).setData(one);
    expect(legendOf(bare).children).toHaveLength(0);
    expect(legendOf(bare).hasAttribute('role')).toBe(false);
    // two types need no description
    expect([...legendOf(mk({ linkTypes: undefined }).setData(data)).querySelectorAll('button.rc-legend-item')]
      .map(b => b.dataset.key)).toEqual(['goods', 'silver']);
    const described = mk().setData(one);
    expect([...legendOf(described).children].map(el => el.className))
      .toEqual(['rc-legend-item rc-graph-legend-item', 'rc-legend-reset rc-graph-legend-reset']);
    click(item(described, 'goods'));
    expect(drawn(described)).toEqual([]);           // the map and its places stay
    expect(described.container.querySelectorAll('.rc-mapflow-node')).toHaveLength(3);
    expect(resetOf(described).hidden).toBe(false);
    click(resetOf(described));
    expect(drawn(described)).toEqual(['goods']);
  });

  it('linkLegend: false — no legend; setLinkTypesVisible still hides', () => {
    const c = mk({ linkLegend: false }).setData(three);
    expect(legendOf(c)).toBeNull();
    c.setLinkTypesVisible(['arms']);
    expect(drawn(c)).toEqual(['arms']);
  });

  it('hiding a type keeps the other arcs\' widths and every place: widths and totals come from all the flows', () => {
    const c = mk().setData(three);
    const widths = () => Object.fromEntries([...c.container.querySelectorAll('.rc-mapflow-link')]
      .map(p => [p.__data__.type, p.getAttribute('stroke-width')]));
    const before = widths();
    const places = ['W', 'E', 'C'].map(id => dotOf(c, id));
    c.setLinkTypesVisible(['silver', 'arms']);       // goods, the widest, goes
    expect(widths()).toEqual({ silver: before.silver, arms: before.arms });
    expect(['W', 'E', 'C'].map(id => dotOf(c, id))).toEqual(places);
    // a place whose flows are all hidden fades, as outside a time window
    c.setLinkTypesVisible(['goods', 'silver']);
    const city = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === 'C');
    expect(city.getAttribute('opacity')).toBe('0.3');
  });

  it('a pinned arc tooltip goes when its type is hidden — from the keyboard or by the method — and stays for another type', () => {
    const c = mk().setData(data);
    hitOf(c, 'silver').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pinned(c)).toBe(true);
    item(c, 'goods').click();                        // Enter or Space on another type: the pin stays
    expect(pinned(c)).toBe(true);
    item(c, 'silver').click();
    expect(pinned(c)).toBe(false);
    c.setLinkTypesVisible(null);
    // a pin moved to another arc follows it
    hitOf(c, 'silver').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    hitOf(c, 'goods').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    c.setLinkTypesVisible(['goods']);
    expect(pinned(c)).toBe(true);
    c.setLinkTypesVisible(['silver']);
    expect(pinned(c)).toBe(false);
    // Enter on a focused arc pins it too
    c.setLinkTypesVisible(null);
    hitOf(c, 'silver').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(pinned(c)).toBe(true);
    c.setLinkTypesVisible(['goods']);
    expect(pinned(c)).toBe(false);
  });

  it('a pin released elsewhere is forgotten: hiding its type later unpins nothing', () => {
    const c = mk().setData(data);
    hitOf(c, 'silver').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    c._tooltip.unpin();                              // Escape, an outside click
    const unpin = vi.spyOn(c._tooltip, 'unpin');
    c.setLinkTypesVisible(['goods']);
    expect(unpin).not.toHaveBeenCalled();
  });

  it('Show all from the keyboard hands focus to the toggle before it', () => {
    const c = mk().setData(data);
    item(c, 'silver').click();
    expect(drawn(c)).toEqual(['goods', 'goods']);
    expect(resetOf(c).hidden).toBe(false);
    resetOf(c).focus();
    resetOf(c).click();
    expect(resetOf(c).hidden).toBe(true);
    expect(document.activeElement).toBe(item(c, 'silver'));
    expect(drawn(c)).toEqual(['goods', 'goods', 'silver']);
  });

  it('the header `legend` names no series on MapFlow: its items stay labels, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = mk({ legend: [{ label: 'goods' }, { label: 'Caption' }] }).setData(data);
    const header = c.container.querySelector('.rc-chart-header .rc-legend');
    expect([...header.children].map(el => el.localName)).toEqual(['div', 'div']);
    expect(header.hasAttribute('role')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('setLinkTypesVisible before the geometry has loaded: the map draws only those types when it does', async () => {
    vi.stubGlobal('fetch', () => new Promise(resolve => setTimeout(() => resolve(
      new Response(JSON.stringify(geoData), { headers: { 'Content-Type': 'application/json' } })), 20)));
    const c = mk({ geoData: undefined, geoUrl: '/world.json' }).setData(three);
    expect(c.setLinkTypesVisible(['arms'])).toBe(c);
    expect(flows(c)).toHaveLength(0);                // still loading
    await c.whenReady();
    expect(drawn(c)).toEqual(['arms']);
    expect(item(c, 'goods').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('MapFlow: a drawing of buttons is a group (K-24)', () => {
  it('the svg is a group with its name while arcs are in the Tab order, an image without them', () => {
    const c = mk({ title: 'Trade' }).setData(data);
    const svg = c.container.querySelector('svg');
    expect(c.container.querySelectorAll('.rc-mapflow-link-hit[tabindex="0"][role="button"]').length).toBeGreaterThan(0);
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.getAttribute('aria-label')).toBe('Trade');
    c.setLinkTypesVisible(['arms']);                           // no arc left
    expect(c.container.querySelectorAll('.rc-mapflow-link-hit')).toHaveLength(0);
    expect(svg.getAttribute('role')).toBe('img');
    c.setLinkTypesVisible(null);
    expect(svg.getAttribute('role')).toBe('group');
  });

  it('with onRegionClick and no arc, the regions keep it a group', () => {
    const c = mk({ onRegionClick: () => {} }).setData({ nodes: data.nodes, links: [] });
    expect(c.container.querySelector('svg').getAttribute('role')).toBe('group');
  });
});

// ─── Interaction gaps (S-15) and the bow's factor (S-19) ───────────────────

describe('MapFlow — linkWidth, bend, nodeLabels (S-15, S-19)', () => {
  const widthOf = (c, from, to) => +[...c.container.querySelectorAll('.rc-mapflow-link')]
    .find(p => p.__data__.source === from && p.__data__.target === to).getAttribute('stroke-width');

  it('linkWidth: the scale runs from min to max over the values, linear or sqrt', () => {
    const lin = mk({ linkWidth: { scale: 'linear', min: 2, max: 10 } }).setData(data);
    expect(widthOf(lin, 'W', 'E')).toBeCloseTo(10, 6);            // the largest value, 3
    expect(widthOf(lin, 'E', 'W')).toBeCloseTo(2 + 8 / 3, 6);     // 1 of 3
    expect(widthOf(lin, 'W', 'C')).toBeCloseTo(2 + 16 / 3, 6);    // 2 of 3
    const sqrt = mk({ linkWidth: { min: 2, max: 10 } }).setData(data);
    expect(widthOf(sqrt, 'E', 'W')).toBeCloseTo(2 + 8 * Math.sqrt(1 / 3), 6);
  });

  // On a planar projection the arc is the straight line between the dots,
  // bowed by a sine: at its middle `bend` × 0.6 of the chord, at most
  // `bend` × 90 px (MapFlow._bowArcs).
  const plane = { projection: 'identity', linkLegend: false, nodeLabels: false };
  const bowOf = (c, from, to) => {
    const [a, b] = [dotOf(c, from), dotOf(c, to)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d = [...c.container.querySelectorAll('.rc-mapflow-link')]
      .find(p => p.__data__.source === from && p.__data__.target === to).getAttribute('d');
    const pts = d.split(/[ML]/).filter(Boolean).map(p => p.split(',').map(Number));
    const off = ([x, y]) => Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / len;
    return { len, bow: Math.max(...pts.map(off)) };
  };
  const pair = (from, to) => ({
    nodes: [{ id: 'A', coords: from }, { id: 'B', coords: to }],
    links: [{ from: 'A', to: 'B' }],
  });

  it('a short arc bows by bend × 0.6 of its chord', () => {
    const c = mk({ ...plane, bend: 0.5 }).setData(pair([5, 45], [11, 45]));
    const { len, bow } = bowOf(c, 'A', 'B');
    expect(len * 0.6).toBeLessThan(90);
    expect(bow / (0.5 * 0.6 * len)).toBeGreaterThan(0.97);
    expect(bow / (0.5 * 0.6 * len)).toBeLessThan(1.001);
  });

  it('a long arc bows by bend × 90 px at most', () => {
    const c = mk({ ...plane, bend: 0.5 }).setData(pair([0, 45], [40, 45]));
    const { len, bow } = bowOf(c, 'A', 'B');
    expect(len * 0.6).toBeGreaterThan(90);
    expect(bow).toBeGreaterThan(0.97 * 45);
    expect(bow).toBeLessThan(45.01);
  });

  it('nodeLabels: false draws the dots without labels', () => {
    expect(mk().setData(data).container.querySelectorAll('.rc-mapflow-label').length).toBeGreaterThan(0);
    const c = mk({ nodeLabels: false }).setData(data);
    expect(c.container.querySelectorAll('.rc-mapflow-label')).toHaveLength(0);
    expect(c.container.querySelectorAll('.rc-mapflow-node')).toHaveLength(3);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { mount, track, setGeometry } from './helpers.js';

// MapFlow arcs as the projection draws them (R-13), at a constant screen
// size under zoom (R-14), and inside the frame with fitTo: 'links' (C-35).

const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const geoData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: '100', properties: { name: 'West' }, geometry: { type: 'Polygon', coordinates: square(0, 40, 10) } },
    { type: 'Feature', id: '200', properties: { name: 'East' }, geometry: { type: 'Polygon', coordinates: square(30, 40, 10) } },
  ],
};
const mk = (opts = {}) => track(new MapFlow(mount(null), { geoData, linkLegend: false, ...opts }));

// 'M…L…L…M…L…' → [[[x, y], …], …], one array per subpath
const subpaths = d => (d ? d.split('M').filter(Boolean).map(s => s.split('L').map(p => p.split(',').map(Number))) : []);
const longestStep = pieces => Math.max(...pieces.flatMap(pts => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))));
const byLink = (c, cls, from, to) => [...c.container.querySelectorAll(`.${cls}`)]
  .find(el => el.__data__.source === from && el.__data__.target === to);
const headTip = el => el.getAttribute('d').slice(1, -1).split('L')[0].split(',').map(Number);
// A place as drawn: the centre of its dot — the projected place, before any zoom.
const dotOf = (c, id) => {
  const dot = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === id);
  return [+dot.getAttribute('cx'), +dot.getAttribute('cy')];
};

// Point p of element el in svg (screen) px: through every transform above it
// (d3 zoom writes "translate(x,y) scale(k)").
function toScreen(el, [x, y]) {
  const chain = [];
  for (let n = el; n && n.tagName !== 'svg'; n = n.parentNode) {
    const tr = n.getAttribute?.('transform');
    if (tr) chain.push(tr);
  }
  chain.forEach(tr => {
    const t = /translate\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(tr);
    const s = /scale\(([-\d.e]+)\)/.exec(tr);
    const k = s ? +s[1] : 1;
    x = x * k + (t ? +t[1] : 0);
    y = y * k + (t ? +t[2] : 0);
  });
  return [x, y];
}
const scaleOf = el => {
  const [x0] = toScreen(el, [0, 0]);
  const [x1] = toScreen(el, [1, 0]);
  return x1 - x0;
};

describe('MapFlow arcs follow the projection (R-13)', () => {
  it('an arc across the antimeridian leaves one edge and comes back on the other — no line across the map', () => {
    const c = mk({ fitTo: 'links' }).setData({
      nodes: [{ id: 'TYO', coords: [139.7, 35.7] }, { id: 'SFO', coords: [-122.4, 37.8] }],
      links: [{ from: 'TYO', to: 'SFO', value: 1 }],
    });
    const arc = c.container.querySelector('.rc-mapflow-link');
    const pieces = subpaths(arc.getAttribute('d'));
    expect(pieces).toHaveLength(2);
    expect(longestStep(pieces)).toBeLessThan(20);          // the bug: one step of ~650 px
    // the first piece runs from Tokyo to the right edge, the second from the left edge to San Francisco
    const [[tx], [sx]] = [dotOf(c, 'TYO'), dotOf(c, 'SFO')];
    expect(pieces[0][0][0]).toBeCloseTo(tx, 3);
    expect(pieces[0].at(-1)[0]).toBeGreaterThan(tx);
    expect(pieces[1][0][0]).toBeLessThan(sx);
    // the hit path is the same two pieces; the arrowhead lands at San Francisco
    expect(subpaths(c.container.querySelector('.rc-mapflow-link-hit').getAttribute('d'))).toHaveLength(2);
    const [hx, hy] = headTip(c.container.querySelector('.rc-mapflow-head'));
    const [sfx, sfy] = dotOf(c, 'SFO');
    expect(Math.hypot(hx - sfx, hy - sfy)).toBeLessThan(10);
  });

  it("'orthographic': places behind the globe have no dot, a flow between two of them is not drawn, one toward them stops at the horizon", () => {
    // The disc, from two places drawn on the same globe (fitted to the
    // regions, not the places): the rotation's centre [20, 30] sits at the
    // disc's centre, and [20, 45], 15° away, at r·sin 15° from it.
    const globe = mk({ projection: 'orthographic', rotate: [-20, -30] })
      .setData({ nodes: [{ id: 'O', coords: [20, 30] }, { id: 'N', coords: [20, 45] }], links: [] });
    const [cx, cy] = dotOf(globe, 'O');
    const r = Math.hypot(dotOf(globe, 'N')[0] - cx, dotOf(globe, 'N')[1] - cy) / Math.sin(Math.PI / 12);
    const c = mk({ projection: 'orthographic', rotate: [-20, -30] }).setData({
      nodes: [
        { id: 'F', label: 'Front', coords: [20, 45] },
        { id: 'B1', label: 'Back one', coords: [-150, -20] },
        { id: 'B2', label: 'Back two', coords: [-170, -40] },
      ],
      links: [{ from: 'F', to: 'B1', value: 2 }, { from: 'B1', to: 'B2', value: 2 }],
    });
    const dots = [...c.container.querySelectorAll('.rc-mapflow-node')].map(n => n.__data__.id);
    expect(dots).toEqual(['F']);
    expect([...c.container.querySelectorAll('.rc-mapflow-label')].map(t => t.textContent)).toEqual(['Front']);
    // B1 → B2 lies wholly on the far side: no line, no arrowhead, no Tab stop
    expect(byLink(c, 'rc-mapflow-link', 'B1', 'B2')).toBeUndefined();
    expect(byLink(c, 'rc-mapflow-link-hit', 'B1', 'B2')).toBeUndefined();
    // F → B1 runs from F to the horizon, inside the disc, without an arrowhead
    const pts = subpaths(byLink(c, 'rc-mapflow-link', 'F', 'B1').getAttribute('d')).flat();
    expect(pts.length).toBeGreaterThan(2);
    pts.forEach(([x, y]) => expect(Math.hypot(x - cx, y - cy)).toBeLessThanOrEqual(r + 1));
    expect(Math.hypot(pts.at(-1)[0] - cx, pts.at(-1)[1] - cy)).toBeGreaterThan(r - 2);
    expect(byLink(c, 'rc-mapflow-head', 'F', 'B1').getAttribute('d')).toBe('');
  });

  it('flat projections keep the bow: A → B and B → A on opposite sides, parallel flows fanned out', () => {
    // M, a place with no flow, marks the great circle's own midpoint: it
    // bulges north of the chord by itself
    const c = mk({ projection: 'mercator', fitTo: 'links' }).setData({
      nodes: [{ id: 'A', coords: [5, 45] }, { id: 'B', coords: [35, 45] }, { id: 'M', coords: d3.geoInterpolate([5, 45], [35, 45])(0.5) }],
      links: [{ from: 'A', to: 'B', value: 1 }, { from: 'B', to: 'A', value: 1 }, { from: 'A', to: 'B', value: 1, id: 'second' }],
    });
    const [a, b, g] = ['A', 'B', 'M'].map(id => dotOf(c, id));
    const off = el => {
      const pts = subpaths(el.getAttribute('d'))[0];
      const [x, y] = pts[Math.floor(pts.length / 2)];
      // signed distance from the great circle, across the chord a → b
      return ((b[0] - a[0]) * (y - g[1]) - (b[1] - a[1]) * (x - g[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    };
    const links = [...c.container.querySelectorAll('.rc-mapflow-link')];
    const there = links.filter(l => l.__data__.source === 'A').map(off);
    const back = off(links.find(l => l.__data__.source === 'B'));
    expect(Math.sign(there[0])).not.toBe(Math.sign(back));
    expect(Math.abs(there[0] - there[1])).toBeGreaterThan(5);
  });
});

describe('MapFlow under zoom (R-14)', () => {
  const data = {
    nodes: [{ id: 'W', label: 'West', coords: [5, 45] }, { id: 'E', label: 'East', coords: [35, 45] }],
    links: [{ from: 'W', to: 'E', value: 3 }],
  };
  const measure = c => {
    const dot = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === 'E');
    const head = c.container.querySelector('.rc-mapflow-head');
    const arc = c.container.querySelector('.rc-mapflow-link');
    const label = [...c.container.querySelectorAll('.rc-mapflow-label')].find(t => t.__data__.n.id === 'W');
    const [tip, b1, b2] = head.getAttribute('d').slice(1, -1).split('L').map(p => toScreen(head, p.split(',').map(Number)));
    const centre = toScreen(dot, [+dot.getAttribute('cx'), +dot.getAttribute('cy')]);
    const end = toScreen(arc, subpaths(arc.getAttribute('d')).at(-1).at(-1));
    const wDot = [...c.container.querySelectorAll('.rc-mapflow-node')].find(n => n.__data__.id === 'W');
    const wCentre = toScreen(wDot, [+wDot.getAttribute('cx'), +wDot.getAttribute('cy')]);
    const labelAt = toScreen(label, [+label.getAttribute('x'), +label.getAttribute('y')]);
    return {
      dotRadius: +dot.getAttribute('r') * scaleOf(dot),
      headLength: Math.hypot(tip[0] - (b1[0] + b2[0]) / 2, tip[1] - (b1[1] + b2[1]) / 2),
      headWidth: Math.hypot(b1[0] - b2[0], b1[1] - b2[1]),
      tipToDot: Math.hypot(tip[0] - centre[0], tip[1] - centre[1]),
      lineToHead: Math.hypot(end[0] - (b1[0] + b2[0]) / 2, end[1] - (b1[1] + b2[1]) / 2),
      labelScale: scaleOf(label),
      labelOffset: [labelAt[0] - wCentre[0], labelAt[1] - wCentre[1]],
      stroke: [arc.getAttribute('stroke-width'), arc.getAttribute('vector-effect')],
      centre,
    };
  };

  it('dots, labels and arrowheads keep their screen size; arcs keep their width and still meet their arrowhead', () => {
    const c = mk({ zoom: true, projection: 'mercator', fitTo: 'links' }).setData(data);
    const before = measure(c);
    // 4× around West, which stays put with its label
    const [wx, wy] = dotOf(c, 'W');
    const z = d3.zoomIdentity.translate(wx * -3, wy * -3).scale(4);
    c.svg.call(c._zoom.transform, z);
    const after = measure(c);
    expect(after.dotRadius).toBeCloseTo(before.dotRadius, 6);
    expect(after.dotRadius).toBe(4);
    expect(after.headLength).toBeCloseTo(before.headLength, 6);
    expect(after.headWidth).toBeCloseTo(before.headWidth, 6);
    // the tip stays as far from the dot as before (×4 if it zoomed with the map)
    expect(Math.abs(after.tipToDot - before.tipToDot)).toBeLessThan(0.5);
    expect(after.lineToHead).toBeLessThan(3);
    expect(after.labelScale).toBe(1);
    expect(after.labelOffset[0]).toBeCloseTo(before.labelOffset[0], 6);
    expect(after.labelOffset[1]).toBeCloseTo(before.labelOffset[1], 6);
    expect(after.stroke).toEqual(before.stroke);
    expect(after.stroke[1]).toBe('non-scaling-stroke');
    // the dot moved with the map: it is where the zoom puts its place
    const [ex, ey] = z.apply(before.centre);
    expect(after.centre[0]).toBeCloseTo(ex, 6);
    expect(after.centre[1]).toBeCloseTo(ey, 6);
  });

  it('panning moves the overlay with the map; a render under zoom keeps it there', () => {
    const c = mk({ zoom: true, projection: 'mercator' }).setData(data);
    const place = dotOf(c, 'E');                       // East in map px, before the zoom
    c.svg.call(c._zoom.transform, d3.zoomIdentity.translate(30, -20).scale(2));
    c.svg.call(c._zoom.transform, d3.zoomIdentity.translate(-90, 10).scale(2));
    const at = () => measure(c).centre;
    // where the map's own zoom puts that point now
    const [ex, ey] = toScreen(c.container.querySelector('.rc-map-feature'), place);
    expect([ex, ey]).toEqual(d3.zoomIdentity.translate(-90, 10).scale(2).apply(place));
    expect(at()[0]).toBeCloseTo(ex, 6);
    expect(at()[1]).toBeCloseTo(ey, 6);
    c.setTimeWindow();                                  // a full redraw, same zoom
    expect(at()[0]).toBeCloseTo(ex, 6);
    expect(at()[1]).toBeCloseTo(ey, 6);
    expect(measure(c).dotRadius).toBe(4);
  });
});

describe("MapFlow fitTo: 'links' frames the arcs, not only the places (C-35)", () => {
  // The frame is the test's own: an 800px card (S-18); the sweep below
  // tries the others.
  beforeEach(() => setGeometry({ width: 800, height: 400 }));

  // Every point of every drawn arc inside the fitted frame.
  const inFrame = (c, pad) => {
    const W = c.width, H = c.height;
    const pts = [...c.container.querySelectorAll('.rc-mapflow-link')].flatMap(el => subpaths(el.getAttribute('d')).flat());
    expect(pts.length).toBeGreaterThan(2);
    return pts.filter(([x, y]) => x < pad - 1 || x > W - pad + 1 || y < pad - 1 || y > H - pad + 1);
  };

  it('a great circle that runs far from its ends (China → New York over the Arctic) stays in the frame', () => {
    const c = mk({ fitTo: 'links', fitPadding: 20 }).setData({
      nodes: [{ id: 'CN', coords: [104, 35] }, { id: 'NYC', coords: [-74, 40.7] }],
      links: [{ from: 'CN', to: 'NYC', value: 2 }],
    });
    expect(inFrame(c, 20)).toEqual([]);
  });

  // RC-071 and C-40: at every card width, on both flat projections — the
  // China → New York circle over the Arctic (4.4px past fitPadding at 640px
  // before), Tokyo → San Francisco cut at the antimeridian (an end on the
  // cut sat at the frame's edge), and a flow over the pole (its end on the
  // cut, and on Mercator's polar edge).
  it('every arc stays inside fitPadding at 320–1200px, ends on the cut included', () => {
    const cases = {
      'China → New York': { nodes: [{ id: 'CN', coords: [104, 35] }, { id: 'NYC', coords: [-74, 40.7] }], links: [{ from: 'CN', to: 'NYC', value: 2 }] },
      'Tokyo → San Francisco': { nodes: [{ id: 'T', coords: [139.7, 35.7] }, { id: 'SF', coords: [-122.4, 37.8] }], links: [{ from: 'T', to: 'SF', value: 2 }] },
      'over the pole': { nodes: [{ id: 'A', coords: [10, 60] }, { id: 'B', coords: [-170, 60] }], links: [{ from: 'A', to: 'B', value: 2 }] },
    };
    for (const width of [320, 480, 640, 800, 1000, 1200]) {
      setGeometry({ width, height: 400 });
      for (const [name, data] of Object.entries(cases)) {
        for (const projection of ['naturalEarth1', 'mercator']) {
          const c = mk({ fitTo: 'links', fitPadding: 20, projection }).setData(data);
          expect(inFrame(c, 20), `${name}, ${projection}, ${width}px`).toEqual([]);
        }
      }
    }
  });

  it('so does the bow drawn on top of it — parallel flows fanned out included', () => {
    const c = mk({ fitTo: 'links', fitPadding: 0, projection: 'mercator' }).setData({
      nodes: [{ id: 'A', coords: [0, 10] }, { id: 'B', coords: [10, 10] }, { id: 'C', coords: [5, -10] }],
      links: [{ from: 'B', to: 'A', value: 1 }, { from: 'B', to: 'A', value: 1, id: 'again' }],
    });
    expect(inFrame(c, 0)).toEqual([]);
  });

  it("the frame does not move with the time window or the legend, and 'features' is unchanged", () => {
    const data = {
      nodes: [{ id: 'A', coords: [0, 10] }, { id: 'B', coords: [10, 10] }, { id: 'C', coords: [5, -10] }],
      links: [{ from: 'B', to: 'A', start: 1900, end: 1910 }, { from: 'C', to: 'A', start: 1950 }],
    };
    // the frame as drawn: the regions and the places' dots
    const frame = ch => [...ch.container.querySelectorAll('.rc-map-feature, .rc-mapflow-node')]
      .map(el => el.getAttribute('d') ?? `${el.getAttribute('cx')},${el.getAttribute('cy')}`);
    const c = mk({ fitTo: 'links' }).setData(data);
    const before = frame(c);
    expect(before).toHaveLength(2 + 3);
    c.setTimeWindow(1950, 1960);
    expect(frame(c)).toEqual(before);
    const plain = mk().setData(data);
    const fitted = d3.geoNaturalEarth1().fitExtent([[20, 20], [plain.width - 20, plain.height - 20]], geoData);
    data.nodes.forEach(n => {
      const [x, y] = fitted(n.coords);
      expect(dotOf(plain, n.id)[0], n.id).toBeCloseTo(x, 6);
      expect(dotOf(plain, n.id)[1], n.id).toBeCloseTo(y, 6);
    });
  });
});

// Shared helpers for the RareCharts tests.
//
// Charts mounted through mount() + track() are destroyed after each test by
// the afterEach in test/setup.js, before the DOM is cleared — emptying
// document.body alone leaves observers, transitions and document listeners
// (pinned tooltips, fullscreen keys) alive.
//
// Errors the library logs itself ("RareCharts…" via console.error — e.g. a
// Graph queue task that threw and was caught) fail the test that produced
// them, unless the test expects them: call allowChartErrors() first.
//
// Sizes (S-18): setup.js gives every element an 800×400 box and every SVG
// text a zero length, so that charts render at all. A test that asserts on
// geometry sets the sizes it depends on: mount(id, { width, height }) for
// one container, setGeometry() for every element and the text metrics.

const state = {
  charts: new Set(),
  errors: [],
  allowErrors: false,
  geometry: [],
};

// A container in document.body (id optional); `width` and `height` override
// the default box (setup.js, or setGeometry()) for this element only.
export function mount(id = 'chart', { width, height } = {}) {
  const el = document.createElement('div');
  if (id != null) el.id = id;
  if (width != null) {
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => width });
  }
  if (height != null) {
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => height });
  }
  document.body.appendChild(el);
  return el;
}

// The sizes a geometry test depends on, for the current test only (restored
// by the afterEach in test/setup.js). Call it in the test or in a
// beforeEach. Each part is optional; a part left out keeps setup.js's.
//   width, height  — the box of every HTML element (clientWidth and
//                    offsetWidth, clientHeight), as setup.js sets it. A chart
//                    measures more than its container: the navigator strip,
//                    the right-hand legend, the tooltip. mount()'s own size
//                    still wins for its element.
//   charWidth      — SVG text measures charWidth px a character
//                    (getComputedTextLength, and getBBox of a text or tspan,
//                    lineHeight px tall). 0 is a page before layout: every
//                    text measures 0 and the chart falls back to its own
//                    estimate from the length.
export function setGeometry({ width, height, charWidth, lineHeight = 14 } = {}) {
  const saved = [];
  const define = (proto, key, descriptor) => {
    saved.push([proto, key, Object.getOwnPropertyDescriptor(proto, key)]);
    Object.defineProperty(proto, key, { configurable: true, ...descriptor });
  };
  if (width != null) {
    define(HTMLElement.prototype, 'clientWidth', { get: () => width });
    define(HTMLElement.prototype, 'offsetWidth', { get: () => width });
  }
  if (height != null) define(HTMLElement.prototype, 'clientHeight', { get: () => height });
  if (charWidth != null) {
    const length = node => node.textContent.length * charWidth;
    const isText = node => ['text', 'tspan', 'textPath'].includes(node.localName);
    define(SVGElement.prototype, 'getComputedTextLength', {
      writable: true, value() { return length(this); },
    });
    define(SVGElement.prototype, 'getBBox', {
      writable: true,
      value() {
        return isText(this) && charWidth > 0
          ? { x: 0, y: 0, width: length(this), height: lineHeight }
          : { x: 0, y: 0, width: 0, height: 0 };
      },
    });
  }
  state.geometry.push(saved);
}

// Register a chart for destroy() after the test. Returns the chart.
export function track(chart) {
  state.charts.add(chart);
  return chart;
}

// The current test expects the library to log errors.
export function allowChartErrors() {
  state.allowErrors = true;
}

// ── Public oracles (S-17) ──
// What a page sees, so the tests survive renames of the chart's private
// members: the drawing, the tooltip element, the user's gesture.

// A user's drag on a time strip (an Overview, or a chart's navigator), as the
// browser delivers it: mousedown on the brush overlay, then the moves and the
// release on the window, where d3-brush listens for the rest of the gesture.
// jsdom has no layout (every box sits at 0,0), so d3.pointer reads clientX as
// the x inside the strip. jsdom refuses its own window as MouseEventInit.view,
// so the view is set on the event. `root` is any element holding the strip.
// brushDrag() leaves the release to the caller (end()); dragStrip() is the
// whole gesture.
export function brushDrag(root, from) {
  const ev = (type, x) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 5 });
    Object.defineProperty(e, 'view', { value: window });
    return e;
  };
  let last = from;
  root.querySelector('.overlay').dispatchEvent(ev('mousedown', from));
  return {
    move(...xs) {
      xs.forEach(x => { last = x; window.dispatchEvent(ev('mousemove', x)); });
      return this;
    },
    end() { window.dispatchEvent(ev('mouseup', last)); },
  };
}

export function dragStrip(root, from, ...moves) {
  brushDrag(root, from).move(...moves).end();
}

// The chart's tooltip element (core/Tooltip.js appends it to the card).
export function tooltipOf(chart) {
  return chart.container.querySelector('.rc-tooltip');
}

// setup.js gives every element an 800px box, so the tooltip's clamp to the
// card would pin it to the corner: a 0×0 tooltip keeps left/top where the
// chart placed it (12px right of the point, 20px above, as in a browser).
export function unclampTooltip(chart) {
  const el = tooltipOf(chart);
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => 0 });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => 0 });
  return el;
}
export const tooltipPosition = el => [parseFloat(el.style.left), parseFloat(el.style.top)];

// A Graph's anchors as drawn, by the role in their accessible name (K-20):
// "Name — group — N connections — center" for the ego view's centre,
// "… — endpoint" for a path view's two ends. Returns the names (label, else id).
export function graphNodesNamed(root, role) {
  return [...root.querySelectorAll('.rc-graph-node')]
    .map(n => n.getAttribute('aria-label') ?? '')
    .filter(label => label.endsWith(` — ${role}`))
    .map(label => label.split(' — ')[0]);
}
export const graphCentres = root => graphNodesNamed(root, 'center');

// ── Used by test/setup.js ──

export function recordChartError(args) {
  state.errors.push(args);
}

export function cleanupCharts() {
  const charts = [...state.charts];
  state.charts.clear();
  charts.forEach(chart => {
    try { chart.destroy(); } catch { /* already gone */ }
  });
  if (charts.length) document.body.replaceChildren();
}

// Puts back what setGeometry() changed, the last call first.
export function restoreGeometry() {
  state.geometry.splice(0).reverse().forEach(saved => saved.reverse().forEach(([proto, key, descriptor]) => {
    if (descriptor) Object.defineProperty(proto, key, descriptor);
    else delete proto[key];
  }));
}

export function takeChartErrors() {
  const errors = state.errors;
  const allowed = state.allowErrors;
  state.errors = [];
  state.allowErrors = false;
  return allowed ? [] : errors;
}

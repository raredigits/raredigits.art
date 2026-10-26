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

const state = {
  charts: new Set(),
  errors: [],
  allowErrors: false,
};

// A container in document.body (id optional); `width` overrides the 800px
// default box from setup.js for this element only.
export function mount(id = 'chart', { width } = {}) {
  const el = document.createElement('div');
  if (id != null) el.id = id;
  if (width != null) {
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => width });
  }
  document.body.appendChild(el);
  return el;
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

export function takeChartErrors() {
  const errors = state.errors;
  const allowed = state.allowErrors;
  state.errors = [];
  state.allowErrors = false;
  return allowed ? [] : errors;
}

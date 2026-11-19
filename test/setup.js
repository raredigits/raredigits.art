// Smoke-test environment shims.
// jsdom has no layout engine and no ResizeObserver, so charts would either
// throw (no ResizeObserver) or skip rendering (clientWidth === 0, see
// Chart.js: `if (this.width > 0 ...) this.render()`). Give every element a
// fixed box and stub the SVG geometry methods charts measure against, so the
// real render path actually executes under test.
//
// The defaults (S-18): every HTML element 800×400 (clientWidth, offsetWidth,
// clientHeight; offsetHeight stays jsdom's 0), every SVG text 0 long, every
// getBBox empty. They are for tests that need *a* width to render and assert
// nothing about sizes: the smoke, contract, event, theme, accessibility,
// tooltip-content and data tests (charts-smoke, bundle-smoke, the
// *-contracts files, map, links, most of graph* and mapflow, …). They are
// not a layout, and no assertion may ride on them: in a page the navigator
// strip, the right-hand legend and the tooltip have boxes of their own.
//
// A test that asserts on geometry (widths, label fitting and truncation,
// legend or tooltip placement, margin math, ticks per width) sets the sizes
// it depends on with test/helpers.js: mount(id, { width, height }) for one
// container, setGeometry({ width, height, charWidth }) for every element and
// the text metrics, for that test only. They do in overview,
// timeseries-navigator, timeframes (the navigator), time-zones (the strip's
// labels), chart-base (the Map width), tooltip (the C-08 position, the date
// header), mapflow (the R-12 pin), mapflow-arcs (C-35), bar-width,
// dual-axes-bars, hbar-layout and circular; bar-category-gutter,
// entry-motion, multichart, sankey, graph, default-formats and
// line-timeseries-contracts stub their own sizes; geometry-helpers checks the
// helpers. Changing 800, 400 or the 0 text length here must not fail any of
// them.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800; } });
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 400; } });
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return 800; } });

if (typeof SVGElement !== 'undefined') {
  SVGElement.prototype.getBBox = SVGElement.prototype.getBBox
    || function () { return { x: 0, y: 0, width: 0, height: 0 }; };
  SVGElement.prototype.getComputedTextLength = SVGElement.prototype.getComputedTextLength
    || function () { return 0; };
  SVGElement.prototype.getTotalLength = SVGElement.prototype.getTotalLength
    || function () { return 0; };
}

// ── Library errors and chart cleanup (test/helpers.js) ──
// console.error calls whose message starts with "RareCharts" come from the
// library (Graph queue failures, Map geometry load). They used to scroll by
// while the test passed; now they fail the test that caused them, unless it
// called allowChartErrors(). Other console.error output is left alone.
import { afterEach } from 'vitest';
import { recordChartError, cleanupCharts, restoreGeometry, takeChartErrors } from './helpers.js';

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].startsWith('RareCharts')) recordChartError(args);
  originalError(...args);
};

afterEach(async () => {
  // Let queued work (Graph view tasks, fetch callbacks) settle first, so its
  // errors are charged to this test and not the next one.
  await new Promise(resolve => setTimeout(resolve, 0));
  cleanupCharts();
  restoreGeometry();
  const errors = takeChartErrors();
  if (errors.length) {
    const first = errors[0].map(a => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' ');
    throw new Error(`Library logged ${errors.length} unexpected error(s): ${first}`);
  }
});

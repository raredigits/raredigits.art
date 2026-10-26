// Smoke-test environment shims.
// jsdom has no layout engine and no ResizeObserver, so charts would either
// throw (no ResizeObserver) or skip rendering (clientWidth === 0, see
// Chart.js: `if (this.width > 0 ...) this.render()`). Give every element a
// fixed box and stub the SVG geometry methods charts measure against, so the
// real render path actually executes under test.

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
import { recordChartError, cleanupCharts, takeChartErrors } from './helpers.js';

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
  const errors = takeChartErrors();
  if (errors.length) {
    const first = errors[0].map(a => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' ');
    throw new Error(`Library logged ${errors.length} unexpected error(s): ${first}`);
  }
});

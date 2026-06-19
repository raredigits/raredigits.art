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

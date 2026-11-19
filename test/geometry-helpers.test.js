// The sizes a geometry test sets (test/helpers.js, S-18): setGeometry() for
// every element and the text metrics, mount() for one container. What a test
// sets lasts that test only: the afterEach in test/setup.js puts it back, so
// a test never inherits another's sizes. The tests run in order; the last one
// compares with what the first saw before it set anything.
import { describe, it, expect } from 'vitest';
import { mount, setGeometry } from './helpers.js';

const SVG = 'http://www.w3.org/2000/svg';
const svgText = (tag, s) => {
  const el = document.createElementNS(SVG, tag);
  el.textContent = s;
  return el;
};
const sizes = () => {
  const div = document.createElement('div');
  const t = svgText('text', 'abcd');
  return { box: [div.clientWidth, div.offsetWidth, div.clientHeight], length: t.getComputedTextLength(), bbox: t.getBBox() };
};

// The global stubs of test/setup.js, read before any test runs.
const defaults = sizes();

describe('setGeometry (S-18)', () => {
  it('sets the box of every element and the text metrics', () => {
    setGeometry({ width: 321, height: 123, charWidth: 5, lineHeight: 11 });
    expect(sizes()).toEqual({ box: [321, 321, 123], length: 20, bbox: { x: 0, y: 0, width: 20, height: 11 } });
    expect(svgText('tspan', 'ab').getBBox()).toEqual({ x: 0, y: 0, width: 10, height: 11 });
    expect(svgText('g', 'abcd').getBBox()).toEqual({ x: 0, y: 0, width: 0, height: 0 });   // text only
  });

  it('a part left out keeps what it was; charWidth 0 is a page before layout', () => {
    setGeometry({ charWidth: 0 });
    expect(sizes()).toEqual({ ...defaults, length: 0, bbox: { x: 0, y: 0, width: 0, height: 0 } });
    setGeometry({ width: 500 });
    expect(sizes().box).toEqual([500, 500, defaults.box[2]]);
    setGeometry({ width: 600, charWidth: 2 });                  // the same parts again: undone last first
    expect(sizes()).toMatchObject({ box: [600, 600, defaults.box[2]], length: 8 });
  });

  it('mount() sizes its own element over it', () => {
    setGeometry({ width: 321, height: 123 });
    const el = mount(null, { width: 50, height: 60 });
    expect([el.clientWidth, el.offsetWidth, el.clientHeight]).toEqual([50, 50, 60]);
    expect(el.appendChild(document.createElement('div')).clientWidth).toBe(321);
  });

  it('…and after each test everything is back', () => {
    expect(sizes()).toEqual(defaults);
  });
});

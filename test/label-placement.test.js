import { describe, it, expect, vi } from 'vitest';
import {
  estimateTextWidth, textWidth, boxesOverlap, placeFirstFree,
} from '../assets/charts/src/core/renderHelpers.js';

// Label placement shared by the charts that place labels themselves (D-08):
// a text's width, measured or estimated at the caller's own rate per
// character; whether two boxes overlap; and the greedy first-free-spot
// search over a caller's own candidates — Graph's +N badges, the flow
// view's tie labels, MapFlow's place labels.

const SVG = 'http://www.w3.org/2000/svg';
const svgText = (s, length) => {
  const el = document.createElementNS(SVG, 'text');
  el.textContent = s;
  if (length !== undefined) el.getComputedTextLength = typeof length === 'function' ? length : () => length;
  return el;
};
const box = (x0, y0, x1, y1) => ({ x0, x1, y0, y1 });

describe('estimateTextWidth — length × the caller\'s rate per character', () => {
  it('each character counts the rate given, whatever the character', () => {
    expect(estimateTextWidth('abcd', 6.2)).toBe(4 * 6.2);
    expect(estimateTextWidth('WWW', 7)).toBe(21);
    expect(estimateTextWidth('Anderson', 6.4)).toBe('Anderson'.length * 6.4);
  });

  it('a number counts its digits; null, undefined and the empty string are no text', () => {
    expect(estimateTextWidth(1234, 7)).toBe(28);
    expect(estimateTextWidth(null, 6.2)).toBe(0);
    expect(estimateTextWidth(undefined, 6.2)).toBe(0);
    expect(estimateTextWidth('', 6.2)).toBe(0);
  });
});

describe('textWidth — the measured width, else the estimate', () => {
  it('a measured width wins over the estimate', () => {
    expect(textWidth(svgText('abcd', 31.5), 6.2)).toBe(31.5);
  });

  it('0 (before layout, jsdom) falls back to the node\'s own text at the rate given', () => {
    expect(textWidth(svgText('abcd', 0), 6.2)).toBe(4 * 6.2);
    expect(textWidth(svgText('abcd', 0), 5.5)).toBe(22);
  });

  it('the text to estimate from may be given: the caller\'s string, not the node\'s content', () => {
    expect(textWidth(svgText('abcd', 0), 7, '1,234,567')).toBe(63);
    expect(textWidth(svgText('abcd', 12), 7, '1,234,567')).toBe(12);   // measured still wins
  });

  it('no measuring method, a throwing one or no number at all: the estimate', () => {
    const plain = { textContent: 'abc' };
    expect(textWidth(plain, 6)).toBe(18);
    expect(textWidth(svgText('abc', () => { throw new Error('not rendered'); }), 6)).toBe(18);
    expect(textWidth(svgText('abc', () => undefined), 6)).toBe(18);
    expect(textWidth(svgText('abc', NaN), 6)).toBe(18);
    expect(textWidth(null, 6)).toBe(0);
    expect(textWidth(null, 6, 'ab')).toBe(12);
  });
});

describe('boxesOverlap — two boxes share area', () => {
  const a = box(0, 0, 10, 10);

  it('overlapping, contained and containing boxes overlap, either way round', () => {
    for (const b of [box(5, 5, 15, 15), box(2, 2, 4, 4), box(-5, -5, 20, 20), box(9.5, -3, 30, 0.5)]) {
      expect(boxesOverlap(a, b)).toBe(true);
      expect(boxesOverlap(b, a)).toBe(true);
    }
  });

  it('boxes that only touch along an edge or at a corner do not', () => {
    for (const b of [box(10, 0, 20, 10), box(-10, 0, 0, 10), box(0, 10, 10, 20), box(0, -10, 10, 0), box(10, 10, 20, 20)]) {
      expect(boxesOverlap(a, b)).toBe(false);
      expect(boxesOverlap(b, a)).toBe(false);
    }
  });

  it('apart on one axis is apart, however much the other axis overlaps', () => {
    expect(boxesOverlap(a, box(11, 2, 20, 8))).toBe(false);    // beside
    expect(boxesOverlap(a, box(2, 11, 8, 20))).toBe(false);    // below
    expect(boxesOverlap(a, box(-20, 2, -1, 8))).toBe(false);   // left of
    expect(boxesOverlap(a, box(2, -20, 8, -1))).toBe(false);   // above
  });
});

describe('placeFirstFree — the first candidate, in order, whose box is clear', () => {
  const at = x => ({ x });
  const boxOf = ({ x }) => box(x - 5, 0, x + 5, 10);

  it('the first clear candidate wins, even when a later one is clearer', () => {
    const obstacles = [box(-6, 0, 6, 10)];              // covers x = 0 only
    const spot = placeFirstFree([at(0), at(12), at(50)], boxOf, obstacles);
    expect(spot).toEqual({ at: { x: 12 }, box: box(7, 0, 17, 10) });
  });

  it('returns the candidate itself and the box boxOf gave it', () => {
    const c = at(30);
    const spot = placeFirstFree([c], boxOf, []);
    expect(spot.at).toBe(c);
    expect(spot.box).toEqual(box(25, 0, 35, 10));
  });

  it('null when every candidate collides, or there is none', () => {
    expect(placeFirstFree([at(0), at(4)], boxOf, [box(-20, 0, 20, 10)])).toBeNull();
    expect(placeFirstFree([], boxOf, [])).toBeNull();
  });

  it('a box touching an obstacle is clear', () => {
    const spot = placeFirstFree([at(15)], boxOf, [box(0, 0, 10, 10)]);   // 10…20 touches 0…10
    expect(spot.at).toEqual({ x: 15 });
  });

  it('leaves the obstacles alone: the caller pushes the box to keep the next label off it', () => {
    const obstacles = [];
    const first = placeFirstFree([at(0), at(20)], boxOf, obstacles);
    expect(obstacles).toEqual([]);
    expect(placeFirstFree([at(0), at(20)], boxOf, obstacles).at).toEqual({ x: 0 });
    obstacles.push(first.box);
    expect(placeFirstFree([at(0), at(20)], boxOf, obstacles).at).toEqual({ x: 20 });
  });

  it('stops at the first clear candidate: later boxes are never built', () => {
    const spy = vi.fn(boxOf);
    placeFirstFree([at(0), at(20), at(40)], spy, [box(-6, 0, 6, 10)]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('takes any iterable of candidates', () => {
    function* candidates() { yield at(0); yield at(20); }
    expect(placeFirstFree(candidates(), boxOf, [box(-6, 0, 6, 10)]).at).toEqual({ x: 20 });
  });

  it('bounds: a box must stay inside them, edges included', () => {
    const bounds = box(0, 0, 100, 10);
    expect(placeFirstFree([at(4), at(5)], boxOf, [], { bounds }).at).toEqual({ x: 5 });      // 0…10 is inside
    expect(placeFirstFree([at(96), at(95)], boxOf, [], { bounds }).at).toEqual({ x: 95 });   // 90…100 too
    expect(placeFirstFree([at(50)], boxOf, [], { bounds: box(0, 1, 100, 10) })).toBeNull();  // pokes out above
    expect(placeFirstFree([at(50)], boxOf, [], { bounds: box(0, 0, 100, 9) })).toBeNull();   // …and below
  });

  it('a candidate out of bounds is skipped; without bounds anything goes', () => {
    const spot = placeFirstFree([at(-50), at(50)], boxOf, [], { bounds: box(0, 0, 100, 10) });
    expect(spot.at).toEqual({ x: 50 });
    expect(placeFirstFree([at(-50)], boxOf, []).at).toEqual({ x: -50 });
  });
});

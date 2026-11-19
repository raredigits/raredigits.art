// The Overview strip on its own (charts/Overview.js) — the public class the
// `navigator` option of every time chart builds, and the safety net for T-10
// and the TimeSeries analytics work (S-14). Everything here goes through the
// public surface: the constructor options, setData(data, onBrush, { extent }),
// setBrush(extent) and what the strip draws.
//
// Dates are built in local time (new Date(y, m, d)): the strip's scale and
// axis are d3's local-time scaleTime, so these assertions hold in any zone.
// The zone-dependent cases live in test/time-zones.test.js.
//
// Sizes are the test's own (S-18): every strip sits on a BOX px element, and
// the axis tests say how wide a label measures.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, setGeometry } from './helpers.js';

const BOX = 800;                       // the strip's element
const W_DEFAULT = BOX - 70;            // less the default right gutter

const monthly = (year, months = 12, day = 15) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, day), value: 10 + (i % 5),
}));

// A strip on its own element, destroyed after the test (Overview is not a
// Chart: track() in test/helpers.js is for charts).
const strips = [];
const make = (options = {}, el = mount(null, { width: BOX })) => {
  const ov = new Overview(el, options);
  strips.push(ov);
  return { ov, el };
};
afterEach(() => {
  strips.splice(0).forEach(ov => ov.destroy());
  document.body.replaceChildren();
});

const overlay = el => el.querySelector('.overlay');
const stripWidth = el => +overlay(el).getAttribute('width');
const selection = el => {
  const r = el.querySelector('.selection');
  const x = +r.getAttribute('x');
  return [x, x + +r.getAttribute('width')];
};
// x of a date on a strip spanning [t0, t1] over [0, W] — a linear time scale
const xAt = (d, [t0, t1], W) => ((+d - +t0) / (+t1 - +t0)) * W;
const dateAt = (x, [t0, t1], W) => +t0 + (x / W) * (+t1 - +t0);
// first and last x of a drawn path ("M0,1C…,730,2")
const pathEnds = d => {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g).map(Number);
  return [n[0], n[n.length - 2]];
};
const ticks = el => [...el.querySelectorAll('.rc-ov-axis .tick text')];
const shownLabels = el => ticks(el).filter(t => t.style.display !== 'none').map(t => t.textContent);

// A user's drag on the strip, as the browser delivers it: mousedown on the
// overlay, then moves and the release on the window, where d3-brush listens
// for the rest of the gesture. jsdom has no layout (every box is at 0,0), so
// d3.pointer reads clientX as the x inside the strip. jsdom refuses its own
// window as MouseEventInit.view here, so the view is set on the event.
function drag(root, from, ...moves) {
  const ev = (type, x) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 5 });
    Object.defineProperty(e, 'view', { value: window });
    return e;
  };
  overlay(root).dispatchEvent(ev('mousedown', from));
  moves.forEach(x => window.dispatchEvent(ev('mousemove', x)));
  window.dispatchEvent(ev('mouseup', moves.length ? moves[moves.length - 1] : from));
}

// ─── Margin ───────────────────────────────────────────────────────────────────

describe('Overview — margin', () => {
  it('defaults: 6 top, 70 right (the Y-axis gutter of the charts it sits under), 16 bottom, 0 left', () => {
    const { ov, el } = make();
    ov.setData(monthly(2023), () => {});
    expect(el.querySelector('svg > g').getAttribute('transform')).toBe('translate(0,6)');
    expect(stripWidth(el)).toBe(W_DEFAULT);
    expect(+overlay(el).getAttribute('height')).toBe(52 - 6 - 16);
    expect(el.style.height).toBe('52px');
  });

  it('an explicit margin merges side by side with the defaults', () => {
    const { ov, el } = make({ margin: { left: 20 } });
    ov.setData(monthly(2023), () => {});
    expect(el.querySelector('svg > g').getAttribute('transform')).toBe('translate(20,6)');
    expect(stripWidth(el)).toBe(BOX - 20 - 70);
    expect(+overlay(el).getAttribute('height')).toBe(52 - 6 - 16);

    const flat = make({ margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    flat.ov.setData(monthly(2023), () => {});
    expect(flat.el.querySelector('svg > g').getAttribute('transform')).toBe('translate(0,0)');
    expect(stripWidth(flat.el)).toBe(BOX);
    expect(+overlay(flat.el).getAttribute('height')).toBe(52);
  });

  it('height sizes the strip; the top and bottom margins come off it', () => {
    const { ov, el } = make({ height: 80 });
    ov.setData(monthly(2023), () => {});
    expect(el.style.height).toBe('80px');
    expect(+overlay(el).getAttribute('height')).toBe(80 - 6 - 16);
  });

  it('the line runs the full width between the side margins', () => {
    const { ov, el } = make({ margin: { left: 10, right: 30 } });
    ov.setData(monthly(2023), () => {});
    expect(pathEnds(el.querySelector('path.rc-ov-line').getAttribute('d'))).toEqual([0, BOX - 10 - 30]);
  });
});

// ─── Axis ─────────────────────────────────────────────────────────────────────

describe('Overview — axis', () => {
  // A label measures 6px a character, about the 10px axis font in a page.
  beforeEach(() => setGeometry({ charWidth: 6 }));

  it('is off by default: no ticks, no domain line', () => {
    const { ov, el } = make();
    ov.setData(monthly(2023), () => {});
    expect(el.querySelector('.rc-ov-axis').childElementCount).toBe(0);
  });

  it('axis: true draws a time axis along the bottom of the strip, in the chart\'s font', () => {
    const { ov, el } = make({ axis: true });
    ov.setData(monthly(2023), () => {});
    const axis = el.querySelector('.rc-ov-axis');
    expect(axis.getAttribute('transform')).toBe(`translate(0,${52 - 6 - 16})`);
    expect(axis.getAttribute('font-family')).toBeNull();
    expect(axis.querySelector('.domain')).not.toBeNull();
    // mid-January to mid-December: a tick on the first of every month between
    expect(shownLabels(el)).toEqual(['February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December']);
  });

  it('the number of ticks follows the strip\'s width', () => {
    const wide = make({ axis: true });
    wide.ov.setData(monthly(2023), () => {});
    const narrow = make({ axis: true }, mount(null, { width: 200 }));
    narrow.ov.setData(monthly(2023), () => {});
    expect(ticks(narrow.el).length).toBeGreaterThanOrEqual(1);
    expect(ticks(narrow.el).length).toBeLessThan(ticks(wide.el).length);
  });

  // Measured, and before layout (every text 0 long), where the strip
  // estimates a label from its length.
  it.each([['measured', 6], ['before layout', 0]])('a label that would run past either end is hidden, unless the margin leaves it room (%s)', (_, charWidth) => {
    setGeometry({ charWidth });
    // the first of every month: ticks fall on both ends of the strip
    const rows = monthly(2023, 12, 1);
    const tight = make({ axis: true, margin: { left: 0, right: 0 } });
    tight.ov.setData(rows, () => {});
    const roomy = make({ axis: true, margin: { left: 20, right: 70 } });
    roomy.ov.setData(rows, () => {});

    expect(ticks(tight.el)[0].textContent).toBe('2023');            // 1 January at x = 0
    expect(ticks(tight.el).at(-1).textContent).toBe('December');    // 1 December at x = W
    expect(ticks(tight.el)[0].style.display).toBe('none');
    expect(ticks(tight.el).at(-1).style.display).toBe('none');
    expect(ticks(tight.el)[1].style.display).toBe('');              // inner labels stay
    expect(ticks(roomy.el)[0].style.display).toBe('');
    expect(ticks(roomy.el).at(-1).style.display).toBe('');
  });

  it('follows the new domain after setData', () => {
    const { ov, el } = make({ axis: true });
    ov.setData(monthly(2023), () => {});
    ov.setData(Array.from({ length: 10 }, (_, i) => ({ date: new Date(2010 + i, 6, 1), value: i })), () => {});
    const labels = shownLabels(el);
    expect(labels.length).toBeGreaterThan(1);
    labels.forEach(l => expect(+l).toBeGreaterThanOrEqual(2011));    // years now, not months
    labels.forEach(l => expect(+l).toBeLessThanOrEqual(2019));
  });
});

// ─── extent ───────────────────────────────────────────────────────────────────

describe('Overview — the strip\'s span (setData extent)', () => {
  it('spans the extent given: the line starts and ends where the data does inside it', () => {
    const { ov, el } = make();
    const span = [new Date(2023, 0, 1), new Date(2024, 0, 1)];
    ov.setData(monthly(2023), () => {}, { extent: span });
    const [x0, x1] = pathEnds(el.querySelector('path.rc-ov-line').getAttribute('d'));
    expect(x0).toBeCloseTo(xAt(new Date(2023, 0, 15), span, W_DEFAULT), 6);
    expect(x1).toBeCloseTo(xAt(new Date(2023, 11, 15), span, W_DEFAULT), 6);
  });

  it('a zero-span or unreadable extent: the strip spans its own data', () => {
    const { ov, el } = make();
    const d = new Date(2023, 5, 1);
    ov.setData(monthly(2023), () => {}, { extent: [d, d] });
    expect(pathEnds(el.querySelector('path.rc-ov-line').getAttribute('d'))).toEqual([0, W_DEFAULT]);
    ov.setData(monthly(2023), () => {}, { extent: ['soon', 'later'] });
    expect(pathEnds(el.querySelector('path.rc-ov-line').getAttribute('d'))).toEqual([0, W_DEFAULT]);
  });
});

// ─── setBrush ─────────────────────────────────────────────────────────────────

describe('Overview — setBrush', () => {
  const data = monthly(2023);
  const full = [data[0].date, data.at(-1).date];
  const strip = () => {
    const onBrush = vi.fn();
    const { ov, el } = make();
    ov.setData(data, onBrush);
    return { ov, el, onBrush };
  };

  it('a window inside the data: the selection sits at those dates', () => {
    const { ov, el } = strip();
    const a = new Date(2023, 2, 1), b = new Date(2023, 5, 1);
    ov.setBrush([a, b]);
    const [x0, x1] = selection(el);
    expect(x0).toBeCloseTo(xAt(a, full, W_DEFAULT), 6);
    expect(x1).toBeCloseTo(xAt(b, full, W_DEFAULT), 6);
  });

  it('a window partly outside: clamped to that edge of the strip, so its handle stays on it', () => {
    const { ov, el } = strip();
    const b = new Date(2023, 5, 1);
    ov.setBrush([new Date(2022, 2, 1), b]);
    expect(selection(el)[0]).toBe(0);
    expect(selection(el)[1]).toBeCloseTo(xAt(b, full, W_DEFAULT), 6);
    const a = new Date(2023, 2, 1);
    ov.setBrush([a, new Date(2030, 0, 1)]);
    expect(selection(el)[0]).toBeCloseTo(xAt(a, full, W_DEFAULT), 6);
    expect(selection(el)[1]).toBe(W_DEFAULT);
  });

  it('a window fully outside: a zero-width selection at the nearer edge', () => {
    const { ov, el } = strip();
    ov.setBrush([new Date(2020, 2, 1), new Date(2020, 5, 1)]);
    expect(selection(el)).toEqual([0, 0]);
    ov.setBrush([new Date(2030, 2, 1), new Date(2030, 5, 1)]);
    expect(selection(el)).toEqual([W_DEFAULT, W_DEFAULT]);
  });

  // Defect found by S-14 (RC-069): setBrush keeps the pair as
  // given, so a reversed window draws a selection of negative width (an SVG
  // rect that does not render). The charts order the pair before they call
  // it (setView → clampDateExtent); a page using the strip on its own does
  // not. The fix that orders it flips this to it().
  it('a reversed window draws the same selection as the ordered one (RC-069)', () => {
    const { ov, el } = strip();
    const a = new Date(2023, 2, 1), b = new Date(2023, 5, 1);
    ov.setBrush([a, b]);
    const ordered = selection(el);
    ov.setBrush([b, a]);
    expect(selection(el)).toEqual(ordered);
  });

  it('before setData and with unreadable dates it does nothing — no selection, no throw', () => {
    const { ov, el } = make();
    expect(() => ov.setBrush([new Date(2023, 2, 1), new Date(2023, 5, 1)])).not.toThrow();
    expect(el.querySelector('.selection')).toBeNull();
    ov.setData(data, () => {});
    ov.setBrush([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    const before = selection(el);
    ov.setBrush([null, new Date(2023, 5, 1)]);
    ov.setBrush('2023');
    expect(selection(el)).toEqual(before);
  });

  it('setBrush and setData never call onBrush — only the user\'s drag does', () => {
    const { ov, onBrush } = strip();
    ov.setBrush([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    ov.setBrush([new Date(2020, 2, 1), new Date(2030, 5, 1)]);
    ov.setData(monthly(2024), onBrush);
    ov.setBrush([new Date(2024, 2, 1), new Date(2024, 5, 1)]);
    expect(onBrush).not.toHaveBeenCalled();
  });

  it('after setData on another span, setBrush maps a window onto the new strip', () => {
    // The charts call setBrush after every setData (Chart._syncNavigator); a
    // page using the strip on its own does the same (Overview.js header).
    // What the selection shows between setData and setBrush is not pinned.
    const { ov, el } = strip();
    const a = new Date(2023, 2, 1), b = new Date(2023, 5, 1);
    ov.setBrush([a, b]);
    const pixels = selection(el);
    const next = monthly(2022, 24);
    ov.setData(next, () => {});
    ov.setBrush([a, b]);
    const span = [next[0].date, next.at(-1).date];
    expect(selection(el)[0]).toBeCloseTo(xAt(a, span, W_DEFAULT), 6);
    expect(selection(el)[1]).toBeCloseTo(xAt(b, span, W_DEFAULT), 6);
    expect(selection(el)[0]).not.toBeCloseTo(pixels[0], 0);
  });
});

// ─── onBrush: the user's drag ─────────────────────────────────────────────────

describe('Overview — onBrush, the user\'s drag', () => {
  const data = monthly(2023);
  const full = [data[0].date, data.at(-1).date];

  it('every move reports { final: false }, the release { final: true }, with the dates under the selection', () => {
    const onBrush = vi.fn();
    const { ov, el } = make();
    ov.setData(data, onBrush);
    drag(el, 100, 200, 300);
    expect(onBrush.mock.calls.map(c => c[1])).toEqual([{ final: false }, { final: false }, { final: true }]);
    const [[a, b]] = onBrush.mock.calls[2];
    expect(a).toBeInstanceOf(Date);
    expect(+a).toBeCloseTo(dateAt(100, full, W_DEFAULT), -1);
    expect(+b).toBeCloseTo(dateAt(300, full, W_DEFAULT), -1);
    expect(selection(el)).toEqual([100, 300]);
    expect(+onBrush.mock.calls[0][0][1]).toBeCloseTo(dateAt(200, full, W_DEFAULT), -1);
  });

  it('a click without a drag keeps the selection and reports nothing', () => {
    const onBrush = vi.fn();
    const { ov, el } = make();
    ov.setData(data, onBrush);
    ov.setBrush([new Date(2023, 2, 1), new Date(2023, 5, 1)]);
    const before = selection(el);
    drag(el, 500);
    expect(onBrush).not.toHaveBeenCalled();
    expect(selection(el)).toEqual(before);
    expect(el.querySelector('.selection').style.display).not.toBe('none');   // d3 hides a cleared one
  });

  it('a drag brought back to zero width puts the last window back and reports it as final', () => {
    const onBrush = vi.fn();
    const { ov, el } = make();
    ov.setData(data, onBrush);
    drag(el, 200, 250, 200);
    expect(selection(el)).toEqual([200, 250]);
    expect(el.querySelector('.selection').style.display).not.toBe('none');
    const last = onBrush.mock.calls.at(-1);
    expect(last[1]).toEqual({ final: true });
    expect(+last[0][1]).toBeCloseTo(dateAt(250, full, W_DEFAULT), -1);
  });

  it('without an onBrush a drag is harmless', () => {
    const { ov, el } = make();
    ov.setData(data);
    expect(() => drag(el, 100, 300)).not.toThrow();
    expect(selection(el)).toEqual([100, 300]);
  });

  it('after setData on another span a drag reports dates on the new span', () => {
    const onBrush = vi.fn();
    const { ov, el } = make();
    ov.setData(data, onBrush);
    const next = monthly(2030);
    ov.setData(next, onBrush);
    drag(el, 100, 300);
    const span = [next[0].date, next.at(-1).date];
    const [[a, b], info] = onBrush.mock.calls.at(-1);
    expect(info).toEqual({ final: true });
    expect(+a).toBeCloseTo(dateAt(100, span, W_DEFAULT), -1);
    expect(+b).toBeCloseTo(dateAt(300, span, W_DEFAULT), -1);
  });
});

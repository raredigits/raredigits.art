// RareCharts — core/entryMotion.js
// The entry animation of a chart — bars growing, lines drawing in, slices
// sweeping, a gauge filling — on one timeline per chart (C-16).
//
// A chart renders again right after setData: document.fonts.ready and the
// first ResizeObserver callback both land within a frame or two, a resize may
// come later. Such a render must neither restart the entry nor cut it to its
// end state. It retargets: each mark continues from where it stands to the
// new geometry, for the time that is left, on the rest of the same easing
// curve — with an unchanged target the motion is exactly the uninterrupted one.
//
//   const phase = this._entry.phase(span);   // once per drawing render
//     'enter'  — this render starts the entry: marks start from their zero state
//     'resume' — the entry is running: marks continue from where they are
//     'none'   — no entry (over, animate: false, reduced motion): the end state
//
// The timeline starts with the first drawing render and lasts `span` ms.
// Classes that animate once per instance never reset it; those that animate
// each dataset or level (HierarchicalBar, a Donut drill) call reset().

import * as d3 from 'd3';

export class EntryMotion {
  constructor() {
    this.reset();
  }

  // The next drawing render starts a new entry.
  reset() {
    this._t0   = null;
    this._span = 0;
    this._done = false;
  }

  // `span`: the whole timeline in ms — the duration plus any stagger tail;
  // 0 (animate: false, reduced motion) means no entry, and the chance is
  // gone: a later render does not animate either.
  phase(span) {
    if (this._done) return 'none';
    const now = d3.now();
    if (this._t0 === null) {
      if (!(span > 0)) { this._done = true; return 'none'; }
      this._t0   = now;
      this._span = span;
      return 'enter';
    }
    if (now - this._t0 >= this._span) { this._done = true; return 'none'; }
    return 'resume';
  }

  // ms since the entry started (0 before it has).
  elapsed() {
    return this._t0 === null ? 0 : Math.max(0, d3.now() - this._t0);
  }

  // One mark whose own motion runs from `delay` to `delay + duration` ms after
  // the start: the transition that takes it from where it stands now to its
  // target — the delay and time left and an ease that continues `ease` from
  // its progress `p` (`eased` = ease(p), the share of the way already made).
  // null once its motion is over.
  timing(delay, duration, ease) {
    if (!(duration > 0)) return null;
    const e = this.elapsed();
    const p = Math.max(0, (e - delay) / duration);
    if (p >= 1) return null;
    return {
      delay:    Math.max(0, delay - e),
      duration: duration * (1 - p),
      ease:     continueEase(ease, p),
      p,
      eased:    p > 0 ? ease(p) : 0,
    };
  }
}

// The rest of `ease` after progress p, rescaled to [0, 1]: a value that has
// made ease(p) of its way continues on the same curve.
export function continueEase(ease, p) {
  if (!(p > 0)) return ease;
  const e0   = ease(p);
  const rest = 1 - e0;
  if (!(rest > 1e-9)) return () => 1;
  return s => (ease(p + s * (1 - p)) - e0) / rest;
}

/**
 * Put marks on the entry timeline: mark i moves from `delay(d, i)` to
 * `delay(d, i) + duration` ms after the start. Running transitions on them
 * stop now (so no stale frame lands after this render), and each mark still
 * moving gets one transition from where it stands, with its own remaining
 * delay, time and continued ease.
 *
 * @returns {{ moving: d3.Transition, settled: d3.Selection }} set the target
 *   attributes on both: `moving` animates to them, `settled` (marks whose
 *   motion is over) takes them at once
 */
export function entryTransition(sel, motion, { delay = () => 0, duration, ease }) {
  const timings = new Map();
  sel.each(function (d, i) { timings.set(this, motion.timing(delay(d, i), duration, ease)); });
  sel.interrupt();
  const settled = sel.filter(function () { return !timings.get(this); });
  const moving  = sel.filter(function () { return !!timings.get(this); })
    .transition()
    .delay(function () { return timings.get(this).delay; })
    .duration(function () { return timings.get(this).duration; })
    .easeVarying(function () { return timings.get(this).ease; });
  return { moving, settled };
}

/**
 * Line draw-in (the stroke-dasharray technique) on the entry timeline. A path
 * shows the eased share of its length at once and draws on from there, so a
 * render mid-entry — a new length after a resize — keeps the share already
 * drawn instead of starting over or appearing whole. Solid paths only: a dash
 * pattern uses the same attribute. `timing` null (no entry): the whole line.
 */
export function drawLinesIn(paths, timing) {
  paths.each(function () {
    const p     = d3.select(this).interrupt();
    const total = this.getTotalLength?.() ?? 0;
    if (!timing || !total) {
      p.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      return;
    }
    p.attr('stroke-dasharray', `${total} ${total}`)
      .attr('stroke-dashoffset', total * (1 - timing.eased))
      .transition()
      .delay(timing.delay)
      .duration(timing.duration)
      .ease(timing.ease)
      .attr('stroke-dashoffset', 0)
      .on('end', function () {
        // the attributes do not linger after the draw-in
        d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      });
  });
}

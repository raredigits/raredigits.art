// RareCharts — core/barLayout.js
// Bar widths in px shared by Bar and DualAxes (B-07), and the inset that keeps
// the first and last bars inside the plot (C-27). Pure functions.

// A positive finite px width, or undefined ("not set": the default applies).
// null, '', booleans, 0, negatives, NaN and Infinity are not widths; numeric
// strings such as '12' are read as numbers.
export function readBarWidth(v) {
  const n = v == null || v === '' || typeof v === 'boolean' ? NaN : +v;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// An explicit barWidth capped at the slot (the space per category or date):
// neighbours may touch, never overlap. undefined when barWidth is not set.
export function fitBarWidth(v, slot) {
  const w = readBarWidth(v);
  return w === undefined ? undefined : Math.min(w, slot);
}

// Space per date on a time scale `L` px long over `domain`: the smallest gap
// between distinct sorted `times` (ms). Linear in L, so the inset can be
// solved without rebuilding the scale. Fewer than two times → fallback(L).
export function timeSlot(times, domain, fallback) {
  const span = +domain[1] - +domain[0];
  let gap = Infinity;
  for (let i = 1; i < times.length; i++) {
    const g = times[i] - times[i - 1];
    if (g > 0 && g < gap) gap = g;
  }
  return Number.isFinite(gap) && span > 0 ? L => L * gap / span : fallback;
}

// Inset of a time range so the outermost bar (or cluster) ends at the range
// ends instead of being centred on them: inset = extentAt(length - 2·inset) / 2.
// extentAt never shrinks as the scale grows, so the root is unique; bisection
// returns the upper bound, where the bars are guaranteed to fit.
export function barInset(length, extentAt) {
  if (!(length > 0) || !(extentAt(length) > 0)) return 0;
  let lo = 0, hi = length / 2;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (extentAt(length - 2 * mid) / 2 > mid) lo = mid; else hi = mid;
  }
  return hi;
}

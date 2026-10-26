// RareCharts — graph/roving.js
// Keyboard access to what a Graph draws (K-20): a roving tabindex. All
// items of one set — the nodes of a view, the ties of the flow view — share
// one Tab stop; the arrow keys move between them, Enter or Space acts as a
// click, Escape clears (the views wire those keys).
//
//   const stop = rovingTabindex(sel, { state, keyOf, preferred });
//   stop.focus(key)        // focus that item; false when it is not drawn
//   stop.prefer(key)       // a new preferred item (a selection made outside)
//
// The Tab stop is the item focused last while focus is in the set, else
// `preferred` (the ego centre, the selected node…), else the first item.
// `state` ({ current }) belongs to the view and outlives a redraw.

export function rovingTabindex(sel, { state, keyOf = d => d.id, preferred = null }) {
  const keys = sel.data().map(keyOf);
  const mark = () => sel.attr('tabindex', d => (keyOf(d) === state.current ? 0 : -1));
  const pick = want => {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active && sel.nodes().includes(active)) state.current = keyOf(active.__data__);
    else if (want != null && keys.includes(want)) state.current = want;
    else if (!keys.includes(state.current)) state.current = keys[0] ?? null;
    mark();
  };
  pick(preferred);
  sel.on('focus.roving', (event, d) => {
    if (state.current === keyOf(d)) return;
    state.current = keyOf(d);
    mark();
  });
  return {
    focus(key) {
      const el = sel.filter(d => keyOf(d) === key).node();
      if (!el) return false;
      state.current = key;
      mark();
      el.focus();
      return true;
    },
    prefer: pick,
  };
}

// Is keyboard focus on one of the elements under `el`? Asked before a
// redraw: an item removed by it takes the focus with it, and the view then
// hands focus to its new Tab stop instead of leaving it on <body>.
export function holdsFocus(el) {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  return !!el && !!active && active !== el && el.contains(active);
}

// Grid views (ego, path, cluster): ← → step through the nodes in reading
// order — row by row, left to right — so every node can be reached; ↑ ↓ go
// to the nearest node above or below; Home / End to the first / last.
export function gridStep(items, item, key, posOf) {
  const at = posOf(item);
  if (!at) return null;
  const placed = items.filter(d => posOf(d));
  const order = placed.slice().sort((a, b) =>
    (Math.round(posOf(a).y) - Math.round(posOf(b).y)) || (posOf(a).x - posOf(b).x));
  const i = order.indexOf(item);
  if (key === 'Home') return order[0] ?? null;
  if (key === 'End') return order[order.length - 1] ?? null;
  if (key === 'ArrowRight') return order[i + 1] ?? null;
  if (key === 'ArrowLeft') return i > 0 ? order[i - 1] : null;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const dir = key === 'ArrowDown' ? 1 : -1;
    let best = null, score = Infinity;
    placed.forEach(d => {
      const p = posOf(d);
      const dy = (p.y - at.y) * dir;
      if (dy < 1) return;
      const s = dy + 2 * Math.abs(p.x - at.x);
      if (s < score) { score = s; best = d; }
    });
    return best;
  }
  return null;
}

// A list in order (the flow view's ties): ← ↑ the previous item, → ↓ the
// next, Home / End the first / last.
export function listStep(order, item, key) {
  const i = order.indexOf(item);
  if (i < 0) return null;
  if (key === 'Home') return order[0];
  if (key === 'End') return order[order.length - 1];
  if (key === 'ArrowRight' || key === 'ArrowDown') return order[i + 1] ?? null;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return i > 0 ? order[i - 1] : null;
  return null;
}

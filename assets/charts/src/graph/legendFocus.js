// RareCharts — graph/legendFocus.js
// Keyboard focus across a legend redraw. The Graph legends (ego and flow
// views) are rebuilt on every render; emptying them dropped the focused
// button to <body>, so after Enter or Space on a legend item the next key
// did nothing (R-16, D8).
//
// Call legendFocus(el) before emptying the legend; once the new buttons are
// in, call the function it returns: it focuses the button of the same
// category (`data-type`), or the first enabled button when that one is gone
// (e.g. "Show all" after the filter cleared). Nothing happens when the focus
// was not inside the legend.

export function legendFocus(el) {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  if (!el || !active || active === el || !el.contains(active)) return () => {};
  const key = active.dataset?.type ?? null;
  return () => {
    const buttons = [...el.querySelectorAll('button')].filter(b => !b.disabled && !b.hidden);
    const target = (key != null && buttons.find(b => b.dataset.type === key)) || buttons[0];
    target?.focus();
  };
}

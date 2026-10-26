// RareCharts — Theme
// Colours, the tooltip font, and sizing fallbacks for the charts. Spacing,
// type sizes and the chart font live in rare-charts.css (--rc-*). Charts read
// the sizing tokens (strokeWidth, dotRadius, markerSize, barOpacity) as
// fallbacks — explicit chart and series options take priority.
// map.hoverBrighten (hover: (factor − 1) of the way towards white) and map.graticule (colour of
// Map's graticule option) are read by Map.

// ─── Default (light) ─────────────────────────────────────────────────────────

export const defaultTheme = {

  // ── Backgrounds ────────────────────────────────────────────────────────────
  // bg is what the chart sits on: plates behind end and annotation labels,
  // halos and knockouts are painted with it. The page background under Rare
  // Styles, white without it — the fallback keeps fill="var(…)" valid (C-13).
  bg:      'var(--bg-color, #ffffff)',
  surface: '#f5f5f5',     // Graph node fills, flow lane bands

  // ── Structure ──────────────────────────────────────────────────────────────
  grid:      '#e8e8e8',   // horizontal grid lines
  border:    '#cccccc',   // axis lines, zero baseline
  crosshair: '#aaaaaa',   // vertical hover line — intentionally subtler than border

  // ── Text ───────────────────────────────────────────────────────────────────
  text:  '#000000',       // primary labels
  muted: '#666666',       // axis tick labels, secondary text

  // ── Semantic (P&L, deltas, signals) ────────────────────────────────────────
  positive: '#389e0d',    // gains, up moves
  negative: '#ff0000',    // losses, down moves
  accent:   '#00aaff',    // highlights, single-series default

  // ── Series palette ─────────────────────────────────────────────────────────
  // Used in order for multi-series charts; override the full array or per-series.
  colors: [
    '#fa8c16',  // orange
    '#00aaff',  // blue
    '#00c97a',  // green
    '#ffcc00',  // yellow
    '#cc44ff',  // violet
    '#ff0000',  // red
  ],

  // ── Typography ─────────────────────────────────────────────────────────────
  // The fallbacks are the --rc-font-family(-numeric) stacks of
  // rare-charts.css; keep them in step. Chart text takes the CSS stack set on
  // .rc-chart; `font` is only the tooltip's fallback when numericFont is unset.
  font:        'var(--rc-font-family, "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
  // Not used: the tooltip size lives in rare-charts.css (B-03). Removal at 1.0.
  fontSize:    'var(--rc-font-size-sm, 14px)',

  // The tooltip font family (published as --rc-tooltip-font).
  // Falls back through a chain of common tabular fonts.
  numericFont: 'var(--rc-font-family-numeric, "Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',

  // ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  strokeWidth: 2,
  dotRadius:   3,         // crosshair dot radius
  markerSize:  4,         // per-point marker size
  barOpacity:  0.35,

  map: {
    matchFill:      '#00aaff',
    unmatchedFill:  '#e8e8e8',
    ocean:          'transparent',   // the card shows through (C-13)
    border:         '#ffffff',
    hoverBrighten:  1.3,
    graticule:      'rgba(0,0,0,0.08)',
  },

  // ── Tooltip ────────────────────────────────────────────────────────────────
  // Colours only: Tooltip.js publishes them as --rc-tooltip-* custom
  // properties, rare-charts.css sets size, weight and spacing — its var()
  // fallbacks repeat these values; keep them in step (B-03).
  tooltip: {
    bg:     '#ffffff',
    border: '#e0e0e0',
    text:   '#000000',      // plain rows and subject titles
    muted:  '#666666',      // dates, percentages, counts — every secondary row
    shadow: '0 2px 8px rgba(0,0,0,0.10)',
    // The row naming what is hovered (date, label, title). null keeps the
    // role look: a date stays muted, a title bold in text. bg draws a band.
    header: { text: null, bg: null },
  },
};

// ─── Dark preset ─────────────────────────────────────────────────────────────

export const darkTheme = createTheme({
  bg:      '#0a0a0a',
  surface: '#141414',
  grid:    '#666666',
  border:  '#888888',
  crosshair: '#3a3a3a',
  text:    '#e8e8e8',
  muted:   '#888888',
  accent:  '#ff6200',
  tooltip: {
    bg:     '#1a1a1a',
    border: '#2e2e2e',
    text:   '#e8e8e8',
    muted:  '#888888',
    shadow: '0 2px 12px rgba(0,0,0,0.55)',
  },
  map: {
    matchFill:      '#ff6200',
    unmatchedFill:  '#1e1e2e',
    ocean:          'transparent',
    border:         '#444455',
    hoverBrighten:  1.2,
    graticule:      'rgba(255,255,255,0.06)',
  },
});

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a theme by merging overrides with a base theme (the default one
 * unless given). Top-level keys merge shallow; `tooltip`, `tooltip.header`
 * and `map` merge deep, so a partial override keeps the base's other keys —
 * createTheme({ tooltip: { bg } }, darkTheme) stays dark (B-03).
 *
 * @param {object} overrides
 * @param {object} [base=defaultTheme]
 * @returns {object}
 */
export function createTheme(overrides = {}, base = defaultTheme) {
  const o = overrides ?? {};
  const tip = o.tooltip ?? {};
  // a non-object header ('#f00') is ignored: spread, a string becomes {0:'#',…}
  const header = tip.header && typeof tip.header === 'object' ? tip.header : {};
  return {
    ...base,
    ...o,
    tooltip: {
      ...base.tooltip,
      ...tip,
      header: { ...base.tooltip?.header, ...header },
    },
    map: {
      ...base.map,
      ...(o.map ?? {}),
    },
  };
}

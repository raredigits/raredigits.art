// RareCharts — Theme
// Colours, the tooltip font, and sizing fallbacks for the charts. Spacing,
// type sizes and the chart font live in rare-charts.css (--rc-*). Charts read
// the sizing tokens (strokeWidth, dotRadius, markerSize, barOpacity) as
// fallbacks — explicit chart and series options take priority.
// A default colour is a chain (RC-014): the page's --chart-* token, then the
// literal — 'var(--chart-text-color, #000000)'. rare-charts.css declares the
// same chains on .rc-chart as --rc-*; keep them in step. A key set to
// anything else is the theme's own and wins over the page (core/paint.js).
// null marks a colour derived from the others (surface, map.graticule).
// map.hoverBrighten (hover: (factor − 1) of the way towards white) and map.graticule (colour of
// Map's graticule option) are read by Map.

// ─── Default (light) ─────────────────────────────────────────────────────────

export const defaultTheme = {

  // ── Backgrounds ────────────────────────────────────────────────────────────
  // bg is what the chart sits on: plates behind end and annotation labels,
  // halos and knockouts are painted with it. The page background under Rare
  // Styles, white without it — the fallback keeps fill="var(…)" valid (C-13).
  bg:      'var(--chart-bg, var(--bg-color, #ffffff))',
  // Graph node fills, flow lane bands: null derives it, the background
  // with 4% of the text (#f5f5f5 on white).
  surface: null,

  // ── Structure ──────────────────────────────────────────────────────────────
  grid:      'var(--chart-grid-color, #e4e4e4)',   // horizontal grid lines, the Gauge track
  border:    'var(--chart-axis-color, #cccccc)',   // axis lines, zero baseline
  crosshair: '#aaaaaa',   // vertical hover line — subtler than border; no token (RC-064)

  // ── Text ───────────────────────────────────────────────────────────────────
  text:  'var(--chart-text-color, #000000)',    // primary labels
  muted: 'var(--chart-label-color, #666666)',   // axis tick labels, secondary text

  // ── Accent ─────────────────────────────────────────────────────────────────
  // Single-series default, highlights, map regions with data; series 1's colour.
  accent:   'var(--chart-series-1, #1677ff)',

  // ── Series palette ─────────────────────────────────────────────────────────
  // Used in order for multi-series charts; override the full array or per-series.
  // The palette agreed with Rare Styles, behind the page's --chart-series-1…6.
  // Charts draw with them resolved to hex (core/paint.js, at every render).
  colors: [
    'var(--chart-series-1, #1677ff)',  // blue (the accent)
    'var(--chart-series-2, #fa8c16)',  // orange
    'var(--chart-series-3, #00c97a)',  // green
    'var(--chart-series-4, #ffcc00)',  // yellow
    'var(--chart-series-5, #cc44ff)',  // violet
    'var(--chart-series-6, #ff0000)',  // red
  ],

  // ── Typography ─────────────────────────────────────────────────────────────
  // The fallbacks are the --rc-font-family(-numeric) stacks of
  // rare-charts.css; keep them in step. Chart text takes the CSS stack set on
  // .rc-chart. In a tooltip `font` sets the words (published as
  // --rc-tooltip-font when not this one, K-15).
  font:        'var(--rc-font-family, "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',

  // The tooltip's figures (.rc-num: values, percentages, counts, dates;
  // published as --rc-tooltip-font-numeric when not this one, K-15).
  // Falls back through a chain of common tabular fonts.
  numericFont: 'var(--rc-font-family-numeric, "Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',

  // ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  strokeWidth: 2,
  dotRadius:   3,         // crosshair dot radius
  markerSize:  4,         // per-point marker size
  barOpacity:  0.35,

  map: {
    matchFill:      null,            // null: regions with data take accent
    unmatchedFill:  'var(--chart-grid-color, #e8e8e8)',
    ocean:          'transparent',   // the card shows through (C-13)
    border:         'var(--chart-bg, #ffffff)',
    hoverBrighten:  1.3,
    graticule:      null,            // null: the text at 8% (rgba(0,0,0,0.08) on black)
  },

  // ── Tooltip ────────────────────────────────────────────────────────────────
  // Colours only: rare-charts.css declares them on the card as
  // --rc-tooltip-* (a theme's own values are published there inline,
  // core/paint.js) and sets size, weight and spacing — its literals repeat
  // these values; keep them in step (B-03). A light popover on any surface.
  tooltip: {
    bg:     'var(--chart-tooltip-bg, #ffffff)',
    border: 'var(--chart-tooltip-border, #e4e4e4)',
    text:   'var(--chart-tooltip-text, #000000)',      // plain rows and subject titles
    muted:  'var(--chart-tooltip-muted, #666666)',     // dates, percentages, counts — every secondary row
    shadow: 'var(--chart-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))',
    // The row naming what is hovered (date, label, title). null keeps the
    // role look: a date stays muted, a title bold in text. bg draws a band.
    header: { text: null, bg: null },
  },
};

// ─── Dark preset ─────────────────────────────────────────────────────────────
// Its colours are its own, plain: a dark chart keeps them on any page or card.
// It sets no colors, so the series follow the palette (and the page's
// --chart-series-*); a single series takes its orange accent.

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
    matchFill:      null,            // the accent, #ff6200
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

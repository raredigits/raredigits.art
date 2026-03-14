// RareCharts — Theme
// Single source of truth for colors, fonts, spacing, and sizing defaults.
// Charts read sizing tokens (strokeWidth, dotRadius…) as fallbacks —
// explicit chart options always take priority.

// ─── Default (light) ─────────────────────────────────────────────────────────

export const defaultTheme = {

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:      'var(--bg-color)',
  surface: '#f5f5f5',     // tooltip bg, panel fills
  service:  '#ffffff',     // used for map borders and tooltip bg in light theme

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
  font:        'var(--primary-font)',
  fontSize:    'var(--font-size-sm)',

  // Separate monospace font for numbers on axes and in tooltips.
  // Falls back through a chain of common tabular fonts.
  numericFont: 'var(--primary-font, monospace)',

  // ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  strokeWidth: 2,
  dotRadius:   3,         // crosshair dot radius
  markerSize:  4,         // per-point marker size
  barOpacity:  0.35,

  map: {
    matchFill:      '#00aaff',
    unmatchedFill:  '#e8e8e8',
    ocean:          'var(--bg-color)',
    border:         '#ffffff',
    hoverBrighten:  1.3,
    graticule:      'rgba(0,0,0,0.08)',
  },

  // ── Tooltip ────────────────────────────────────────────────────────────────
  tooltip: {
    bg:     '#ffffff',
    border: '#e0e0e0',
    text:   '#000000',
    muted:  '#888888',
    shadow: '0 2px 8px rgba(0,0,0,0.10)',
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
  numericFont: 'var(--primary-font, monospace)',
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
    ocean:          'var(--bg-color)',
    border:         '#444455',
    hoverBrighten:  1.2,
    graticule:      'rgba(255,255,255,0.06)',
  },
});

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a theme by merging overrides with the default.
 * Performs a shallow merge for top-level keys and a deep merge for `tooltip`.
 *
 * @param {object} overrides
 * @returns {object}
 */
export function createTheme(overrides = {}) {
  return {
    ...defaultTheme,
    ...overrides,
    tooltip: {
      ...defaultTheme.tooltip,
      ...(overrides.tooltip ?? {}),
    },
    map: {
      ...defaultTheme.map,
      ...(overrides.map ?? {}),
    },
  };
}

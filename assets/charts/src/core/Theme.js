// RareCharts — Theme
// Single source of truth for colors, fonts, spacing, and sizing defaults.
// Charts read sizing tokens (strokeWidth, dotRadius…) as fallbacks —
// explicit chart options always take priority.

// ─── Default (light) ─────────────────────────────────────────────────────────

export const defaultTheme = {

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:      '#ffffff',
  surface: '#f5f5f5',     // tooltip bg, panel fills

  // ── Structure ──────────────────────────────────────────────────────────────
  grid:      '#e8e8e8',   // horizontal grid lines
  border:    '#cccccc',   // axis lines, zero baseline
  crosshair: '#aaaaaa',   // vertical hover line — intentionally subtler than border

  // ── Text ───────────────────────────────────────────────────────────────────
  text:  '#000000',       // primary labels
  muted: '#666666',       // axis tick labels, secondary text

  // ── Semantic (P&L, deltas, signals) ────────────────────────────────────────
  positive: '#00c97a',    // gains, up moves
  negative: '#ff3b5c',    // losses, down moves
  accent:   '#ff6200',    // Bloomberg orange — highlights, single-series default

  // ── Series palette ─────────────────────────────────────────────────────────
  // Used in order for multi-series charts; override the full array or per-series.
  colors: [
    '#ff6200',  // orange  — primary
    '#00aaff',  // blue
    '#00c97a',  // green
    '#ffcc00',  // yellow
    '#cc44ff',  // violet
    '#ff3b5c',  // red
  ],

  // ── Typography ─────────────────────────────────────────────────────────────
  font:        'var(--primary-font)',
  fontSize:    'var(--font-size-sm)',

  // Separate monospace font for numbers on axes and in tooltips.
  // Falls back through a chain of common tabular fonts.
  numericFont: 'var(--numeric-font, "IBM Plex Mono", "Roboto Mono", ui-monospace, monospace)',

  // ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  strokeWidth: 2,
  dotRadius:   3,         // crosshair dot radius
  markerSize:  4,         // per-point marker size
  barOpacity:  0.35,

  // ── Tooltip ────────────────────────────────────────────────────────────────
  tooltip: {
    bg:     '#ffffff',
    border: '#e0e0e0',
    text:   '#000000',
    muted:  '#888888',
    shadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
};

// ─── Dark preset (Bloomberg terminal aesthetic) ───────────────────────────────

export const darkTheme = createTheme({
  bg:      '#0a0a0a',
  surface: '#141414',
  grid:    '#1c1c1c',
  border:  '#2a2a2a',
  crosshair: '#3a3a3a',
  text:    '#e8e8e8',
  muted:   '#888888',
  accent:  '#ff6200',
  numericFont: '"IBM Plex Mono", "Roboto Mono", ui-monospace, monospace',
  tooltip: {
    bg:     '#1a1a1a',
    border: '#2e2e2e',
    text:   '#e8e8e8',
    muted:  '#888888',
    shadow: '0 2px 12px rgba(0,0,0,0.55)',
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
  };
}

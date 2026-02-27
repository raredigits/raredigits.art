// RareCharts — Theme
// Single source of truth for colors, fonts, and spacing.
// Override any field when initializing a chart.

export const defaultTheme = {
  bg:      '#ffffff',
  surface: '#f0f0f0',
  grid:    '#e0e0e0',
  border:  'var(--border-color)',
  text:    '#000000',
  muted:   '#555555',
  accent:  'var(--gray-trans)',
  green:   '#00c97a',
  red:     '#ff3b5c',
  blue:    '#00aaff',
  bar:     'var(--gray-trans)',
  colors:  ['#ff6200', '#00aaff', '#00c97a', '#ffcc00', '#cc44ff', '#ff3b5c'],
  font:    'var(--primary-font)',
  fontSize: 'var(--font-size-sm)',
  axisFontSize: 'var(--font-size-sm)',
  axisFontFamily: 'var(--primary-font)',
};

// Creates a custom theme by merging overrides with defaults
export function createTheme(overrides = {}) {
  return { ...defaultTheme, ...overrides };
}

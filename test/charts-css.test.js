// The library stylesheet, assets/charts/rare-charts.css, which the bundle
// injects into every page that loads RareCharts. These checks read the source
// file: CI runs the tests before the bundle is built. What it looks like in a
// real engine on a page without Rare Styles: test/browser/charts-standalone.
//
//   C-13  works without Rare Styles: every host variable has a fallback, and
//         spacing is the chart's own --rc-space-* scale
//   C-14  the chart font is set once, on .rc-chart; buttons inherit it
//   X-05  no docs-page selectors and no dead aliases
//   K-01  no webfont import; system fallbacks; only weights the self-hosted
//         Fira Sans / Cousine set has
//   B-03  tooltip typography is CSS, colours arrive as --rc-tooltip-*
//         (C-23); long tooltip text wraps inside the box (C-29)
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss from 'postcss';
import { defaultTheme, darkTheme } from '../assets/charts/src/core/theme.js';

const CSS = readFileSync(resolve(process.cwd(), 'assets/charts/rare-charts.css'), 'utf8');
const root = postcss.parse(CSS);

// Custom properties the file declares itself (on .rc-chart) — the rest come
// from the host page.
const OWN = new Set();
root.walkDecls(/^--/, d => OWN.add(d.prop));

// var(--name[, fallback]) calls in a value, nested ones (in a fallback)
// included; `text` is the fallback itself, null without one.
function varArgs(value) {
  const out = [];
  for (let i = value.indexOf('var('); i !== -1; i = value.indexOf('var(', i + 4)) {
    let depth = 0, j = i + 3, comma = -1;
    for (; j < value.length; j++) {
      if (value[j] === '(') depth++;
      else if (value[j] === ')' && --depth === 0) break;
      else if (value[j] === ',' && depth === 1 && comma < 0) comma = j;
    }
    out.push({ name: value.slice(i + 4, comma < 0 ? j : comma).trim(), text: comma < 0 ? null : value.slice(comma + 1, j).trim() });
  }
  return out;
}
const varCalls = value => varArgs(value).map(({ name, text }) => ({ name, fallback: text != null }));

const where = d => `${d.parent.selector} { ${d.prop}: ${d.value} }`;
const ruleFor = selector => {
  const found = [];
  root.walkRules(r => { if (r.selectors.join(', ') === selector) found.push(r); });
  expect(found, selector).toHaveLength(1);
  return found[0];
};
const declsOf = rule => rule.nodes.filter(n => n.type === 'decl');

// String values anywhere in a theme object, with their key path.
function themeStrings(obj, path = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === 'string') return [[p, v]];
    if (v && typeof v === 'object') return themeStrings(v, p);
    return [];
  });
}

describe('varCalls (the scanner the checks rely on)', () => {
  it('finds plain, fallback and nested calls', () => {
    expect(varCalls('var(--a)')).toEqual([{ name: '--a', fallback: false }]);
    expect(varCalls('1px solid var(--a, #ccc)')).toEqual([{ name: '--a', fallback: true }]);
    expect(varCalls('var(--a, var(--b))')).toEqual([
      { name: '--a', fallback: true },
      { name: '--b', fallback: false },
    ]);
    expect(varCalls('linear-gradient(135deg, var(--a) 50%, transparent 50%)'))
      .toEqual([{ name: '--a', fallback: false }]);
  });
});

describe('C-13: a page without Rare Styles', () => {
  it('every host variable has a fallback (own --rc-* tokens need none)', () => {
    const bare = [];
    root.walkDecls(d => {
      for (const v of varCalls(d.value)) if (!OWN.has(v.name) && !v.fallback) bare.push(where(d));
    });
    expect(bare).toEqual([]);
  });

  it('spacing comes from the chart\'s fixed --rc-space-* scale, not the host\'s', () => {
    const host = [];
    root.walkDecls(d => {
      if (varCalls(d.value).some(v => v.name.startsWith('--space-'))) host.push(where(d));
    });
    expect(host).toEqual([]);

    const tokens = Object.fromEntries(declsOf(ruleFor('.rc-chart'))
      .filter(d => d.prop.startsWith('--rc-space-')).map(d => [d.prop, d.value]));
    expect(tokens).toEqual({
      '--rc-space-xs': '4px', '--rc-space-sm': '8px', '--rc-space-md': '16px', '--rc-space-lg': '32px',
    });
  });

  it('the source line is a block and the title has the chart size', () => {
    const source = declsOf(ruleFor('.rc-chart-source'));
    expect(source.find(d => d.prop === 'display')?.value).toBe('block');
    const title = declsOf(ruleFor('.rc-chart-title'));
    expect(title.find(d => d.prop === 'font-size')?.value).toBe('var(--rc-font-size)');
  });

  // Theme colours become SVG fill/stroke and inline styles, so a bare host
  // variable there paints black (fill) or nothing (stroke) without Rare
  // Styles (theme.bg is 'var(--bg-color, #ffffff)', the map ocean
  // 'transparent').
  it('theme colours that read a host variable have a fallback', () => {
    const bare = [];
    for (const [name, theme] of [['defaultTheme', defaultTheme], ['darkTheme', darkTheme]]) {
      for (const [path, value] of themeStrings(theme)) {
        if (varCalls(value).some(v => !OWN.has(v.name) && !v.fallback)) bare.push(`${name}.${path}: ${value}`);
      }
    }
    expect(bare).toEqual([]);
  });
});

describe('C-14: the chart font', () => {
  it('is set once, on .rc-chart', () => {
    const font = declsOf(ruleFor('.rc-chart')).find(d => d.prop === 'font-family');
    expect(font?.value).toBe('var(--rc-font-family)');
  });

  it('is repeated only where inheritance is not enough', () => {
    const ALLOWED = [
      '.rc-chart',
      // host heading rules target the <h5> / the panel's own elements
      '.rc-chart-title',
      '.rc-graph-details, .rc-graph-details *',
      // d3-axis sets font-family="sans-serif" on the axis group
      '.rc-axis text',
      '.rc-axis-cat text',
      // the numeric family
      '.rc-bar-value, .rc-donut-label-pct, .rc-donut-center-value, .rc-gauge-center-value',
      '.rc-end-label',
      '.rc-hbar-label',
      '.rc-hbar-value',
      // theme.numericFont, published as --rc-tooltip-font (B-03)
      '.rc-tooltip',
    ];
    const found = [];
    root.walkDecls('font-family', d => found.push(d.parent.selectors.join(', ')));
    expect(found.sort()).toEqual([...ALLOWED].sort());
  });

  it.each(['.rc-graph-tools button', '.rc-range-btn'])('%s inherits it (font: inherit, before any font-size)', selector => {
    const decls = declsOf(ruleFor(selector));
    const font = decls.findIndex(d => d.prop === 'font' && d.value === 'inherit');
    expect(font).toBeGreaterThanOrEqual(0);
    const size = decls.findIndex(d => d.prop === 'font-size');
    if (size >= 0) expect(size).toBeGreaterThan(font); // the shorthand resets the size
  });

  // font: inherit also takes the page's line-height (24px on the site, where
  // Rare Styles gives buttons 1.15): the timeframe buttons would grow.
  it('.rc-range-btn keeps its own line-height after the shorthand', () => {
    const decls = declsOf(ruleFor('.rc-range-btn'));
    const font = decls.findIndex(d => d.prop === 'font');
    const lineHeight = decls.findIndex(d => d.prop === 'line-height');
    expect(decls[lineHeight]?.value).toBe('1.15');
    expect(lineHeight).toBeGreaterThan(font);
  });
});

describe('X-05: no docs-page CSS in the library', () => {
  it('no .rc-demo-*, .price-chart-* or the dead .range-btn alias', () => {
    const docs = [];
    root.walkRules(r => {
      for (const s of r.selectors) if (/\.rc-demo-|\.price-chart|\.range-btn\b/.test(s)) docs.push(s);
    });
    expect(docs).toEqual([]);
  });

  it('the library\'s own range-bar classes stay', () => {
    expect(ruleFor('.rc-chart-range-bar')).toBeTruthy();
    expect(ruleFor('.rc-range-btn')).toBeTruthy();
  });
});

describe('K-01: fonts come from the page', () => {
  it('no @import and no Google Fonts URL', () => {
    const imports = [];
    root.walkAtRules('import', a => imports.push(a.params));
    expect(imports).toEqual([]);
    expect(CSS).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('the font stacks fall back to system fonts', () => {
    const vars = Object.fromEntries(declsOf(ruleFor('.rc-chart')).map(d => [d.prop, d.value]));
    expect(vars['--rc-font-family']).toMatch(/^"Fira Sans", system-ui,.*, sans-serif$/);
    expect(vars['--rc-font-family-numeric']).toMatch(/^"Cousine", ui-monospace,.*, monospace$/);
  });

  // Rare Styles self-hosts Fira Sans 400/700 (+ italics) and Cousine 400/700;
  // a 600 there renders as faux or substituted bold.
  const WEIGHTS = new Set(['normal', 'bold', '400', '700', 'initial', 'inherit']);

  it('the CSS asks only for weights the self-hosted fonts have', () => {
    const bad = [];
    root.walkDecls('font-weight', d => { if (!WEIGHTS.has(d.value)) bad.push(where(d)); });
    expect(bad).toEqual([]);
  });

  it('so do the inline styles the charts write (tooltips)', () => {
    const src = resolve(process.cwd(), 'assets/charts/src');
    const bad = [];
    for (const f of readdirSync(src, { recursive: true })) {
      if (!f.endsWith('.js')) continue;
      const text = readFileSync(join(src, f), 'utf8');
      for (const m of text.matchAll(/font-weight\s*:\s*([\w-]+)/g)) {
        if (!WEIGHTS.has(m[1])) bad.push(`${f}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('B-03: the tooltip — colours from the theme, typography here', () => {
  // Tooltip.js always sets them; the fallbacks are what a tooltip shows when
  // a theme leaves a key null — the light defaults.
  it('the colour fallbacks are defaultTheme.tooltip (keep in step)', () => {
    const KEYS = ['text', 'bg', 'border', 'muted', 'shadow'];
    const found = [];
    root.walkDecls(d => {
      for (const { name, text } of varArgs(d.value)) {
        const key = name.replace(/^--rc-tooltip-/, '');
        if (KEYS.includes(key)) found.push({ key, text, at: where(d) });
      }
    });
    expect(new Set(found.map(f => f.key)).size).toBe(KEYS.length);
    for (const { key, text, at } of found) expect(text, at).toBe(defaultTheme.tooltip[key]);
  });

  // Inline styles beat any page rule: the documented `.rc-tooltip` override
  // did nothing for the size (C-23).
  it('.rc-tooltip sets the size and the numeric family itself', () => {
    const decls = Object.fromEntries(declsOf(ruleFor('.rc-tooltip')).map(d => [d.prop, d.value]));
    expect(decls['font-size']).toBe('13px');
    expect(decls['font-family']).toBe('var(--rc-tooltip-font, var(--rc-font-family-numeric))');
    expect(decls['line-height']).toBeUndefined();          // the page's, as before (K-15)
  });

  it('the tooltip HTML the charts write carries no inline typography or spacing (C-23)', () => {
    const src = resolve(process.cwd(), 'assets/charts/src');
    const bad = [];
    for (const f of readdirSync(src, { recursive: true })) {
      if (!f.endsWith('.js')) continue;
      readFileSync(join(src, f), 'utf8').split('\n').forEach((line, i) => {
        if (/style="[^"]*(font-size|font-weight|margin|max-width|text-transform|letter-spacing)/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  // C-29: under the tooltip's nowrap, a long Graph node name ran past the
  // capped box. max-content: the box does not shrink near the chart's edge.
  it('the relation charts\' body wraps inside its cap', () => {
    const decls = Object.fromEntries(declsOf(ruleFor('.rc-tooltip-body')).map(d => [d.prop, d.value]));
    expect(decls).toMatchObject({ 'white-space': 'normal', width: 'max-content', 'max-width': '280px' });
    expect(decls['overflow-wrap']).toBe('break-word');
  });

  // O6: hover links were browser blue — unreadable on a dark tooltip.
  it('links take the tooltip colour, hovered or pinned', () => {
    const decls = Object.fromEntries(declsOf(ruleFor('.rc-tooltip a')).map(d => [d.prop, d.value]));
    expect(decls).toEqual({ color: 'inherit', 'text-decoration': 'underline' });
  });
});

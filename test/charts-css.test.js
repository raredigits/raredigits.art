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
//   RC-014, K-14  the chart tokens on .rc-chart / .rc-overview: literals in
//         step with defaultTheme; host variables are --chart-*, the old page
//         tokens only where 0.9.8_6 read them
//   C-24  a hovered range or Lin/Log button keeps its own background
//   K-17  the card is a size container; the header stacks by its width
//   K-19  legend on the right: the controls sit between navigator and footer
//   K-18  the injected copy can be turned off (index.js)
//
// Moved from chart-core-7a.test.js (RC-026):
//   'rare-charts.css' → 'C-24, K-17, K-19: card buttons, the size container, the legend-right grid'
//   'K-18: the injected stylesheet can be turned off' → same describe
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss from 'postcss';
import { defaultTheme, darkTheme, createTheme } from '../assets/charts/src/core/theme.js';
import { DERIVED_LITERALS, chainLiteral, publishTheme } from '../assets/charts/src/core/paint.js';

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
      // theme.font, published as --rc-tooltip-font (B-03, K-15)
      '.rc-tooltip',
      // a figure in a tooltip: theme.numericFont, as --rc-tooltip-font-numeric (K-15)
      '.rc-num',
      // ...but the date on top and the note under a row read as words (RC-082 mock-up)
      '.rc-tooltip-header .rc-num, .rc-tooltip-note .rc-num',
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

  // The page's chart fonts first (RC-014), then the chart's own stacks.
  it('the font stacks read the page\'s chart fonts, then fall back to system fonts', () => {
    const block = root.nodes.find(n => n.type === 'rule' && n.selectors.join(', ') === '.rc-chart, .rc-overview');
    const vars = Object.fromEntries(declsOf(block).map(d => [d.prop, d.value]));
    expect(vars['--rc-font-family']).toMatch(/^var\(--chart-font-family, "Fira Sans", system-ui,.*, sans-serif\)$/);
    expect(vars['--rc-font-family-numeric']).toMatch(/^var\(--chart-font-family-numeric, "Cousine", ui-monospace,.*, monospace\)$/);
    // the theme's defaults end in the same stacks (core/theme.js)
    const stack = v => v.slice(v.indexOf(',') + 1).trim();
    expect(stack(defaultTheme.font)).toBe(stack(vars['--rc-font-family']));
    expect(stack(defaultTheme.numericFont)).toBe(stack(vars['--rc-font-family-numeric']));
  });

  // Rare Styles self-hosts Fira Sans 400/700 (+ italics) and Cousine 400/700;
  // a 600 there renders as faux or substituted bold.
  const WEIGHTS = new Set(['normal', 'bold', '400', '700', 'initial', 'inherit']);

  it('the CSS asks only for weights the self-hosted fonts have', () => {
    const bad = [];
    root.walkDecls('font-weight', d => { if (!WEIGHTS.has(d.value)) bad.push(where(d)); });
    expect(bad).toEqual([]);
  });

  // …and the SVG font-weight attributes (K-15: HierarchicalBar's 600 → 700).
  it('so do the inline styles and SVG attributes the charts write', () => {
    const src = resolve(process.cwd(), 'assets/charts/src');
    const bad = [];
    let attrs = 0;
    for (const f of readdirSync(src, { recursive: true })) {
      if (!f.endsWith('.js')) continue;
      const text = readFileSync(join(src, f), 'utf8');
      for (const m of text.matchAll(/font-weight\s*:\s*([\w-]+)/g)) {
        if (!WEIGHTS.has(m[1])) bad.push(`${f}: ${m[0]}`);
      }
      for (const m of text.matchAll(/attr\(\s*'font-weight'\s*,([^\n]*)/g)) {
        attrs++;
        for (const w of m[1].matchAll(/\b\d{3}\b|'(\w+)'/g)) {
          if (!WEIGHTS.has(w[1] ?? w[0])) bad.push(`${f}: ${m[0].trim()}`);
        }
      }
    }
    expect(attrs).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});

describe('B-03: the tooltip — colours from the theme, typography here', () => {
  // The card always has them (the chart tokens); the fallbacks are what a
  // tooltip shows without the token block — the light defaults.
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
    // the theme's are chains (RC-014): their literal
    for (const { key, text, at } of found) expect(text, at).toBe(chainLiteral(defaultTheme.tooltip[key]));
  });

  // Inline styles beat any page rule: the documented `.rc-tooltip` override
  // did nothing for the size (C-23).
  // RC-082: 14px (the maintainer, 2026-11-18: a little larger than 13px);
  // words in the chart's font, a 24px line on any page (K-15).
  it('.rc-tooltip sets the size, the line height and the word family itself', () => {
    const decls = Object.fromEntries(declsOf(ruleFor('.rc-tooltip')).map(d => [d.prop, d.value]));
    expect(decls['font-size']).toBe('14px');
    expect(decls['font-family']).toBe('var(--rc-tooltip-font, var(--rc-font-family))');
    expect(decls['line-height']).toBe('24px');
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

describe('K-15, RC-082: line heights, figures and the tooltip rows', () => {
  const decls = selector => Object.fromEntries(declsOf(ruleFor(selector)).map(d => [d.prop, d.value]));

  // §7 of the theme spec: v0.7.1's values, held on any host.
  it('the chart\'s own line heights: the card, the title and the source at two classes', () => {
    expect(decls('.rc-chart')['line-height']).toBe('24px');
    expect(decls('.rc-chart .rc-chart-title')['line-height']).toBe('24px');
    expect(decls('.rc-chart .rc-chart-source')['line-height']).toBe('1.3');
  });

  it('a figure is in the numeric family with tabular digits, the theme\'s first', () => {
    expect(decls('.rc-num')).toEqual({
      'font-family': 'var(--rc-tooltip-font-numeric, var(--rc-font-family-numeric))',
      'font-variant-numeric': 'tabular-nums',
    });
  });

  it('the navigator\'s labels are the main axis\'s, at 10px', () => {
    expect(decls('.rc-axis.rc-ov-axis text')).toEqual({ 'font-size': '10px' });
  });

  it('the visible tooltip is opaque', () => {
    expect(decls('.rc-tooltip.is-visible').opacity).toBe('1');
  });

  it('the date header is small and muted; a row is a grid of mark, name and value', () => {
    expect(decls('.rc-tooltip-header.rc-tooltip-muted')).toMatchObject({ 'font-size': '13px' });
    expect(decls('.rc-tooltip-row')).toMatchObject({ display: 'grid', 'grid-template-columns': '12px minmax(0, 1fr) auto' });
    expect(decls('.rc-tooltip-row--plain')['grid-template-columns']).toBe('minmax(0, 1fr) auto');
    expect(decls('.rc-tooltip-row > .rc-tooltip-value')['text-align']).toBe('right');
    expect(decls('.rc-tooltip-note')).toMatchObject({ 'grid-column': '-3 / -1', color: 'var(--rc-tooltip-muted, #666666)' });
    expect(decls('.rc-tooltip-swatch').background).toBe('var(--rc-swatch-color, currentColor)');
    for (const m of ['dashed', 'band', 'dot']) expect(ruleFor(`.rc-tooltip-swatch--${m}`)).toBeTruthy();
  });
});

// ─── C-24, K-17, K-19: the card's buttons and grid ───────────────────────────
// What these rules do in a real engine (hover, container width, grid rows):
// test/browser/charts-card-layout.

describe('RC-014, K-14: the chart tokens', () => {
  const BLOCK = '.rc-chart, .rc-overview';
  // the top-level rule (the @supports fallback repeats the selector)
  const block = () => Object.fromEntries(declsOf(root.nodes.find(n => n.type === 'rule' && n.selectors.join(', ') === BLOCK))
    .map(d => [d.prop, d.value]));
  const at = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

  // Each declaration is defaultTheme's chain, character for character
  // (core/theme.js); the keys the theme leaves null are derived here with
  // color-mix(), their literals (core/paint.js) in the @supports fallback.
  it('the chains are defaultTheme\'s (keep in step)', () => {
    const CHAINS = {
      '--rc-bg': 'bg', '--rc-text': 'text', '--rc-muted': 'muted', '--rc-border': 'border',
      '--rc-grid': 'grid', '--rc-crosshair': 'crosshair', '--rc-accent': 'accent',
      '--rc-tooltip-bg': 'tooltip.bg', '--rc-tooltip-border': 'tooltip.border', '--rc-tooltip-text': 'tooltip.text',
      '--rc-tooltip-muted': 'tooltip.muted', '--rc-tooltip-shadow': 'tooltip.shadow',
      '--rc-map-unmatched-fill': 'map.unmatchedFill', '--rc-map-border': 'map.border',
    };
    const decls = block();
    for (const [name, path] of Object.entries(CHAINS)) {
      expect(decls[name], name).toBe(at(defaultTheme, path));
    }
    expect(decls['--rc-accent']).toBe(defaultTheme.colors[0]);

    const supports = [];
    root.walkAtRules('supports', a => a.walkDecls(d => supports.push([d.parent.selectors.join(', '), d.prop, d.value])));
    expect(defaultTheme.surface).toBeNull();
    expect(defaultTheme.map.graticule).toBeNull();
    expect(supports).toEqual([
      [BLOCK, '--rc-surface', DERIVED_LITERALS.surface],
      [BLOCK, '--rc-map-graticule', DERIVED_LITERALS['map.graticule']],
    ]);
    expect(decls['--rc-surface']).toMatch(/^color-mix\(in srgb, /);
    expect(decls['--rc-map-graticule']).toMatch(/^color-mix\(in srgb, /);
  });

  // Every name a theme can publish has its default on every card, so a card
  // inside another starts from the library's, not the outer card's.
  it('declares every name a theme publishes; the theme-only ones start unset', () => {
    const el = document.createElement('div');
    const names = [
      ...publishTheme(el, darkTheme),
      ...publishTheme(el, createTheme({ font: 'serif', numericFont: 'monospace', tooltip: { header: { text: '#123456', bg: '#eeeeee' } } })),
    ];
    const decls = block();
    expect(names.filter(n => !(n in decls))).toEqual([]);
    for (const n of ['--rc-tooltip-font', '--rc-tooltip-font-numeric', '--rc-tooltip-header-text', '--rc-tooltip-header-bg']) expect(decls[n], n).toBe('initial');
  });

  // RC-061: the old page tokens are read only where 0.9.8_6 read them, each
  // behind its --chart-* name; generic names such as --primary-color mean
  // other things on foreign hosts. Every other rule reads the card's --rc-*
  // tokens (K-14), never a host variable.
  it('host variables are --chart-*; the old page tokens only in their own token', () => {
    const OLD = {
      '--bg-color': '--rc-bg',
      '--text-color-light': '--rc-control-text',
      '--border-color': '--rc-control-border',
      '--primary-color': '--rc-control-hover-border',
      '--primary-text-color': '--rc-control-active-text',
      '--white': '--rc-control-active-bg',
    };
    const bad = [];
    root.walkDecls(d => {
      const calls = varArgs(d.value);
      for (const { name } of calls) {
        if (name.startsWith('--rc-')) continue;
        const sel = d.parent.selectors.join(', ');
        if (sel === BLOCK && (name.startsWith('--chart-') || (OLD[name] === d.prop && calls[0].name.startsWith('--chart-')))) continue;
        bad.push(`${sel} { ${d.prop} } ${name}`);
      }
    });
    expect(bad).toEqual([]);
  });
});

// K-14, RC-061, X-11: the chart's HTML writes no colour inline; these rules
// colour it from the card's tokens, so a .card, a .card-inverted, a page
// theme switch and paper reach it with no JS.
describe('K-14: the HTML chrome in the card\'s tokens', () => {
  const rulesOf = selector => {
    const found = [];
    root.walkRules(r => { if (r.selectors.includes(selector) && r.parent.type === 'root') found.push(r); });
    return found;
  };
  const decl = (selector, prop) => rulesOf(selector).flatMap(r => r.nodes.filter(n => n.prop === prop)).at(-1)?.value;
  const specificity = s => [
    (s.match(/#[\w-]+/g) ?? []).length,
    (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length,
    (s.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/[a-z][\w-]*/gi) ?? []).length,
  ];
  const outranks = (a, b) => {
    const [x, y] = [specificity(a), specificity(b)];
    const i = x.findIndex((v, k) => v !== y[k]);
    return i >= 0 && x[i] > y[i];
  };

  it('the card sets its text colour; title, subtitle, legend and source at two classes, the note muted', () => {
    expect(decl('.rc-chart', 'color')).toBe('var(--rc-text)');
    for (const s of ['.rc-chart .rc-chart-title', '.rc-chart .rc-chart-subtitle', '.rc-chart .rc-legend', '.rc-chart .rc-chart-source']) {
      expect(decl(s, 'color'), s).toBe('var(--rc-text)');
      // a host's h5, p, cite, .content h5
      for (const host of ['h5', 'p', 'cite', '.content h5']) expect(outranks(s, host), `${s} > ${host}`).toBe(true);
    }
    expect(decl('.rc-chart .rc-chart-note', 'color')).toBe('var(--rc-muted)');
    expect(decl('.rc-multichart-cell-title', 'color')).toBe('var(--rc-text)');
  });

  it('the 0.9.8_6 header rule is gone: nothing colours the header from --primary-color', () => {
    expect(rulesOf('.rc-chart-header').flatMap(r => r.nodes.filter(n => n.prop === 'color'))).toEqual([]);
    const primary = [];
    root.walkDecls(d => { if (d.value.includes('--primary-color') && d.prop !== '--rc-control-hover-border') primary.push(where(d)); });
    expect(primary).toEqual([]);
  });

  it('the range buttons and the Log toggle read only the control tokens (RC-061)', () => {
    expect(decl('.rc-range-btn', 'color')).toBe('var(--rc-control-text)');
    expect(decl('.rc-range-btn', 'border')).toBe('1px solid var(--rc-control-border)');
    expect(decl('.rc-range-btn:hover', 'color')).toBe('var(--rc-control-active-text)');
    expect(decl('.rc-range-btn:hover', 'border-color')).toBe('var(--rc-control-hover-border)');
    const pressed = '.rc-range-btn[aria-pressed="true"]';
    expect([decl(pressed, 'color'), decl(pressed, 'background-color'), decl(pressed, 'border-color')])
      .toEqual(['var(--rc-control-active-text)', 'var(--rc-control-active-bg)', 'var(--rc-control-hover-border)']);
    const tokens = [];
    root.walkRules(r => {
      if (!r.selectors.some(s => /^\.rc-range-btn\b/.test(s))) return;
      r.walkDecls(d => varArgs(d.value).forEach(({ name }) => tokens.push(name)));
    });
    expect([...new Set(tokens)].sort()).toEqual([
      // the Log toggle: off transparent in muted text, on in the accent (RC-083)
      '--rc-accent',
      '--rc-control-active-bg', '--rc-control-active-text', '--rc-control-border', '--rc-control-hover-border',
      '--rc-control-text', '--rc-font-size-sm', '--rc-muted', '--rc-space-md', '--rc-space-sm', '--rc-space-xs',
    ]);
    const on = '.rc-range-btn.rc-scale-btn[aria-pressed="true"]:hover';
    expect([decl(on, 'color'), decl(on, 'background-color'), decl(on, 'border-color')])
      .toEqual(['#ffffff', 'var(--rc-accent)', 'var(--rc-accent)']);
    // the diagonal half fill and its --rc-scale-btn-fill went with RC-083:
    // the Log toggle shows its state as a pressed range button
    let fill = false;
    root.walkDecls(d => { if (d.prop === '--rc-scale-btn-fill' || d.value.includes('--rc-scale-btn-fill')) fill = true; });
    expect(fill).toBe(false);
  });

  it('X-11: the Graph tool buttons are a class in the tokens, above a host button:hover', () => {
    const s = '.rc-graph-tools .rc-graph-tool';
    expect(Object.fromEntries(rulesOf(s)[0].nodes.map(n => [n.prop, n.value]))).toEqual({
      height: '26px', 'min-width': '26px', padding: '0 6px', border: '1px solid var(--rc-control-border)',
      'border-radius': '4px', background: 'var(--rc-bg)', color: 'var(--rc-text)', 'box-shadow': 'none',
      'font-size': '14px', 'line-height': '1', cursor: 'pointer',
    });
    expect(outranks(s, 'button:hover')).toBe(true);
    expect(outranks(s, '.rc-graph-tools button')).toBe(true);
    // full screen: the card's background; the :fullscreen rule (dead: the
    // browser's own rule places a native full screen element) is gone
    expect(decl('.rc-graph--fullscreen', 'background')).toBe('var(--rc-bg, #ffffff)');
    const fs = [];
    root.walkRules(r => { if (r.selector.includes(':fullscreen')) fs.push(r.selector); });
    expect(fs).toEqual([]);
  });

  it('the "+N more" panel is drawn like the tooltip (RC-064)', () => {
    const p = Object.fromEntries(rulesOf('.rc-graph-overflow').flatMap(r => r.nodes).map(n => [n.prop, n.value]));
    expect(p).toMatchObject({
      background: 'var(--rc-tooltip-bg, #ffffff)',
      color: 'var(--rc-tooltip-text, #000000)',
      border: '1px solid var(--rc-tooltip-border, #e4e4e4)',
      'box-shadow': 'var(--rc-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))',
      'border-radius': '0',
    });
    // the fallbacks are defaultTheme.tooltip's (keep in step)
    for (const k of ['bg', 'text', 'border', 'shadow']) {
      const v = p[{ bg: 'background', text: 'color', border: 'border', shadow: 'box-shadow' }[k]];
      expect(varArgs(v)[0].text, k).toBe(chainLiteral(defaultTheme.tooltip[k]));
    }
  });

  // A keyboard focus ring in --rc-focus-ring (the page's --chart-focus-ring,
  // else currentColor). The custom range panel's fields keep currentColor:
  // the panel is a popover on the tooltip's own light surface.
  it('RC-015: every chart button gets the one focus ring, and it beats a host button:focus-visible', () => {
    const one = ':is(button.rc-legend-item, .rc-legend-reset, .rc-range-btn, .rc-graph-tools .rc-graph-tool,\n    .rc-graph-tools .rc-graph-note, .rc-graph-tools .rc-graph-hidden-note,\n    .rc-graph-breadcrumbs button, .rc-graph-overflow button):focus-visible';
    let found = null;
    root.walkRules(r => { if (r.selectors.join(', ') === one) found = r; });
    expect(found, 'the shared focus rule').not.toBeNull();
    expect(found.nodes.find(n => n.prop === 'outline').value).toBe('2px solid var(--rc-focus-ring)');
    for (const b of ['.rc-range-btn', '.rc-graph-tool', '.rc-legend-reset', '.rc-graph-note', '.rc-graph-hidden-note']) expect(one).toContain(b);
  });

  it('focus rings use --rc-focus-ring, not currentColor', () => {
    const rings = [], bad = [];
    root.walkDecls(/^(outline|stroke)$/, d => {
      const sel = d.parent.selectors.join(', ');
      if (!/:focus(-visible)?\b/.test(sel) || d.value === 'none') return;
      if (d.value.includes('currentColor') && !d.parent.selectors.every(s => /^\.rc-range-(input|apply)\b/.test(s))) bad.push(where(d));
      if (d.value.includes('var(--rc-focus-ring)')) rings.push(sel);
    });
    expect(bad).toEqual([]);
    expect(rings).toEqual([
      // one rule for every button a chart draws (RC-015)
      ':is(button.rc-legend-item, .rc-legend-reset, .rc-range-btn, .rc-graph-tools .rc-graph-tool,\n    .rc-graph-tools .rc-graph-note, .rc-graph-tools .rc-graph-hidden-note,\n    .rc-graph-breadcrumbs button, .rc-graph-overflow button):focus-visible',
      // a clickable map region: the ring as its outline stroke (B-06)
      '.rc-map-feature--clickable:focus-visible',
      '.rc-sankey-node:focus-visible',
      // the nodes and ties of the relation charts, one rule each (X-07)
      '.rc-graph-node:focus-visible, .rc-flow-node:focus-visible',
      '.rc-graph-link-key:focus-visible, .rc-flow-link-hit:focus-visible, .rc-mapflow-link-hit:focus-visible',
    ]);
  });
});

describe('C-24, K-17, K-19: card buttons, the size container, the legend-right grid', () => {
  const rules = selector => {
    const found = [];
    root.walkRules(r => { if (r.selectors.includes(selector)) found.push(r); });
    return found;
  };
  const decl = (selector, prop) => rules(selector).flatMap(r => r.nodes.filter(n => n.prop === prop)).at(-1)?.value;
  // [ids, classes + attributes + pseudo-classes, elements] — enough for these selectors
  const specificity = s => [
    (s.match(/#[\w-]+/g) ?? []).length,
    (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length,
    (s.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/[a-z][\w-]*/gi) ?? []).length,
  ];
  const outranks = (a, b) => {
    const [x, y] = [specificity(a), specificity(b)];
    const i = x.findIndex((v, k) => v !== y[k]);
    return i >= 0 && x[i] > y[i];
  };
  const HOST_HOVER = 'button:hover';   // Rare Styles: button:hover:where(.rd, .rd *) { background: … }

  it('C-24: a hovered range button keeps its own background', () => {
    expect(decl('.rc-range-btn:hover', 'background-color')).toBe('transparent');
    expect(outranks('.rc-range-btn:hover', HOST_HOVER)).toBe(true);
  });

  it('C-24: the Log toggle keeps its fill under a host button:hover, in both states (RC-083)', () => {
    expect(outranks('.rc-range-btn.rc-scale-btn', HOST_HOVER)).toBe(true);
    expect(outranks('.rc-range-btn.rc-scale-btn[aria-pressed="true"]:hover', HOST_HOVER)).toBe(true);
  });

  it('K-17: the card is a size container and the header stacks by its width', () => {
    expect(decl('.rc-chart', 'container')).toMatch(/inline-size/);
    const stacking = [];
    root.walkAtRules(/^(media|container)$/, at => {
      at.walkRules(r => { if (r.selectors.includes('.rc-chart-header')) stacking.push(at.name); });
    });
    expect(stacking).toEqual(['container']);
  });

  it('K-19: with the legend on the right the controls sit between the navigator and the footer', () => {
    const row = sel => decl(`.rc-chart--legend-right > ${sel}`, 'grid-row');
    const [nav, controls, footer] = ['.rc-chart-navigator', '.rc-chart-controls', '.rc-chart-footer'].map(row).map(Number);
    expect(controls).toBe(nav + 1);
    expect(footer).toBe(controls + 1);
    const aside = decl('.rc-chart--legend-right > .rc-chart-legend-aside', 'grid-row');
    expect(aside).toBe(`1 / ${footer + 1}`);
    expect(decl('.rc-chart--legend-right', 'grid-template-rows').split(/\s+/)).toHaveLength(footer);
  });
});

// ─── RC-003: the custom range panel ──────────────────────────────────────────
// Its look on a bare page and on Rare Styles v0.7.1 and v0.7.2, in a real
// engine: test/browser/charts-custom-range.test.js.

describe('RC-003: the custom range panel', () => {
  const STATES = ['', ':hover', ':focus', ':active'];
  // the top-level rule whose selector list starts with `first`
  const groupOf = first => {
    const found = root.nodes.filter(r => r.type === 'rule' && r.selectors[0] === first);
    expect(found, first).toHaveLength(1);
    return found[0];
  };
  const props = rule => Object.fromEntries(declsOf(rule).map(d => [d.prop, d.value]));
  // [ids, classes + attributes + pseudo-classes, elements]
  const specificity = s => [
    (s.match(/#[\w-]+/g) ?? []).length,
    (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length,
    (s.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/[a-z][\w-]*/gi) ?? []).length,
  ];
  const outranks = (a, b) => {
    const [x, y] = [specificity(a), specificity(b)];
    const i = x.findIndex((v, k) => v !== y[k]);
    return i >= 0 && x[i] > y[i];
  };

  it.each(['.rc-range-input', '.rc-range-apply'])('%s: a full reset at a doubled class, in every state', cls => {
    const rule = groupOf(`${cls}${cls}`);
    expect(rule.selectors).toEqual(STATES.map(s => `${cls}${cls}${s}`));
    const p = props(rule);
    expect(p).toMatchObject({
      appearance: 'none', 'box-sizing': 'border-box', margin: '0', 'border-radius': 'var(--rc-space-xs)',
      background: 'transparent', 'box-shadow': 'none', color: 'inherit', font: 'inherit', 'line-height': 'inherit',
      'text-transform': 'none', transition: 'none', transform: 'none',
    });
    expect(p.padding).toMatch(/^var\(--rc-space-xs\) var\(--rc-space-(sm|md)\)$/);
    expect(p.border).toMatch(/^1px solid /);
    expect(p.outline).toBeUndefined();                       // the focus ring is the rule after
    // a host's element rules in any state lose: Rare Styles v0.7.1's
    // button:hover, a form framework's input[type=date]:focus
    for (const host of ['button:hover', 'input[type=date]', 'input[type=date]:focus', 'input:focus:invalid']) {
      const own = rule.selectors.find(s => s.endsWith(host.match(/:(hover|focus|active)/)?.[0] ?? cls));
      expect(outranks(own, host), `${own} over ${host}`).toBe(true);
    }
  });

  it('a disabled Apply dims after the reset, at its specificity; the focus ring outranks a host\'s', () => {
    const order = [];
    root.walkRules(r => order.push(r.selector));
    const reset = order.indexOf(groupOf('.rc-range-apply.rc-range-apply').selector);
    const disabled = order.indexOf('.rc-range-apply.rc-range-apply:disabled');
    expect(disabled).toBeGreaterThan(reset);
    expect(props(groupOf('.rc-range-apply.rc-range-apply:disabled'))).toEqual({ opacity: '0.45', cursor: 'default' });
    const ring = groupOf('.rc-range-input.rc-range-input:focus-visible');
    expect(props(ring).outline).toBe('2px solid currentColor');
    ring.selectors.forEach(s => expect(outranks(s, ':focus-visible')).toBe(true));
  });

  it('the panel wears the tooltip\'s tokens, sits over the tooltip and is hidden in print', () => {
    const p = props(groupOf('.rc-range-panel'));
    expect(p).toMatchObject({
      position: 'absolute', width: 'max-content', 'box-sizing': 'border-box',
      color: 'var(--rc-tooltip-text, #000000)', background: 'var(--rc-tooltip-bg, #ffffff)',
      border: '1px solid var(--rc-tooltip-border, #e4e4e4)',
    });
    expect(+p['z-index']).toBeGreaterThan(+props(groupOf('.rc-tooltip'))['z-index']);
    const print = [];
    root.walkAtRules('media', at => {
      if (at.params === 'print') at.walkRules(r => print.push(...r.selectors));
    });
    expect(print).toContain('.rc-range-panel');
  });

  it('the print rules come last: no screen rule after them shows a part they hide (RC-019, X-08)', () => {
    const last = root.nodes.filter(n => n.type !== 'comment').at(-1);
    expect(last.type === 'atrule' && last.name === 'media' && last.params).toBe('print');
    const hidden = [];
    last.walkRules(r => hidden.push(...r.selectors));
    expect(hidden).toEqual(expect.arrayContaining(['.rc-chart-range-row', '.rc-graph-tools', '.rc-graph-overflow']));
  });

  it('on a touch screen its fields are 16px, so the phone does not zoom into them', () => {
    const coarse = [];
    root.walkAtRules('media', at => {
      if (at.params === '(pointer: coarse)') at.walkRules(r => coarse.push([r.selector, props(r)['font-size']]));
    });
    expect(coarse).toEqual([['.rc-range-panel', 'var(--rc-font-size)']]);
    expect(props(ruleFor('.rc-chart'))['--rc-font-size']).toBe('16px');
  });
});

// ─── K-18: the copy index.js injects ─────────────────────────────────────────

describe('K-18: the injected stylesheet can be turned off', () => {
  afterEach(() => {
    delete window.RareChartsConfig;
    document.getElementById('rc-base-styles')?.remove();
  });
  const load = async () => {
    document.getElementById('rc-base-styles')?.remove();
    vi.resetModules();
    await import('../assets/charts/src/index.js');
  };

  it('by default the bundle adds its <style id="rc-base-styles">', async () => {
    await load();
    expect(document.querySelector('style#rc-base-styles')).not.toBeNull();
  });

  it('window.RareChartsConfig = { injectStyles: false } adds none', async () => {
    window.RareChartsConfig = { injectStyles: false };
    await load();
    expect(document.getElementById('rc-base-styles')).toBeNull();
  });

  it('a <link id="rc-base-styles"> the page loads itself also stops it', async () => {
    document.getElementById('rc-base-styles')?.remove();
    const link = document.createElement('link');
    link.id = 'rc-base-styles';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    vi.resetModules();
    await import('../assets/charts/src/index.js');
    expect(document.querySelectorAll('#rc-base-styles')).toHaveLength(1);
    expect(document.querySelector('style#rc-base-styles')).toBeNull();
  });
});

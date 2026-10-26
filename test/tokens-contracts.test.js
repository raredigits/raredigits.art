// Contracts of the v0.7.2 tokens stream on the compiled CSS.
//
//   CSS-380  the chart tokens are global `:root` tokens (ungated, like every
//            token) with the agreed names; a derived token resolves where it
//            is declared, so every surface that re-maps a role restates the
//            chart tokens derived from it, and every rule that sets
//            `--surface-current` restates `--chart-bg`
//   CSS-385  in print every outdent folds back to the column, or is exempt
//            with a reason (the CSS-357 computation, applied to paper)
// Real-browser proof: test/browser/tokens.test.js.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const GATE = /:where\(\.rd, \.rd \*\)/g;
const PAGE = /^:where\(html\.rd, body\.rd\) /;
const strip = (s) => s.replace(GATE, '').replace(PAGE, '').trim();

let root;
beforeAll(() => {
  root = postcss.parse(readFileSync(resolve(process.cwd(), 'assets/css/rare.css'), 'utf8'));
});

const declsOf = (rule) => Object.fromEntries(rule.nodes.filter((n) => n.type === 'decl').map((d) => [d.prop, d.value.trim()]));

describe('CSS-380: chart tokens', () => {
  const NAMES = [
    '--chart-series-1', '--chart-series-2', '--chart-series-3', '--chart-series-4', '--chart-series-5', '--chart-series-6',
    '--chart-bg', '--chart-text-color', '--chart-label-color', '--chart-axis-color', '--chart-grid-color',
    '--chart-control-text', '--chart-control-border', '--chart-control-hover-border',
    '--chart-control-active-bg', '--chart-control-active-text', '--chart-control-fill',
    '--chart-tooltip-bg', '--chart-tooltip-border', '--chart-tooltip-text', '--chart-tooltip-muted',
    '--chart-tooltip-shadow', '--chart-tooltip-font-size',
    '--chart-font-family', '--chart-font-family-numeric', '--chart-focus-ring',
  ];

  const rootTokens = () => {
    const out = {};
    root.walkRules((r) => {
      if (r.selector === ':root' && r.parent.type === 'root') Object.assign(out, declsOf(r));
    });
    return out;
  };

  it('every agreed name is declared on an ungated top-level :root, and no other --chart-* is', () => {
    const tokens = rootTokens();
    const chart = Object.keys(tokens).filter((p) => p.startsWith('--chart-'));
    expect(chart.sort()).toEqual([...NAMES].sort());
    expect(tokens['--surface-current']).toBe('var(--bg-color)');
    // no --chart-* is declared inside a media query or on a gated selector other than the surfaces
    const elsewhere = new Set();
    root.walkDecls(/^--chart-/, (d) => {
      const sel = d.parent.selector;
      if (sel === ':root' && d.parent.parent.type === 'root') return;
      elsewhere.add(strip(sel));
    });
    expect([...elsewhere].sort()).toEqual(['.card', '.card-inverted', ':where(.card-inverted .card)'].sort());
    // the tooltip size is RareCharts' own px, not a root-relative size
    expect(tokens['--chart-tooltip-font-size']).toBe('13px');
  });

  it('a surface that re-maps a role restates the chart tokens derived from it', () => {
    const tokens = rootTokens();
    // the tooltip is a popover with its own light surface: not re-mapped
    const EXEMPT = /^--chart-tooltip-/;
    const missing = [];
    root.walkRules((r) => {
      const sel = strip(r.selector);
      if (sel === ':root') return;
      const own = declsOf(r);
      const remapped = Object.keys(own).filter((p) => p.startsWith('--') && !p.startsWith('--chart-'));
      if (!remapped.length) return;
      for (const [name, value] of Object.entries(tokens)) {
        if (!name.startsWith('--chart-') || EXEMPT.test(name)) continue;
        const refs = [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
        if (refs.some((ref) => remapped.includes(ref)) && !(name in own)) missing.push(`${sel}: ${name}`);
      }
    });
    expect(missing).toEqual([]);
  });

  it('`.card-inverted` re-maps the border roles and its surface; `.card` paints its surface', () => {
    const rule = (sel) => {
      let found;
      root.walkRules((r) => { if (strip(r.selector) === sel && r.parent.type === 'root') found = declsOf(r); });
      return found;
    };
    const inv = rule('.card-inverted');
    for (const p of ['--border-color', '--border-color-light', '--border-color-dark', '--surface-current']) expect(inv, p).toHaveProperty(p);
    expect(inv.background).toBe('var(--surface-current)');
    const card = rule('.card');
    expect(card['--surface-current']).toBe('var(--gray-lightest)');
    expect(card.background).toBe('var(--surface-current)');
    // a panel paints no background and sets no surface: it passes through
    root.walkRules((r) => {
      if (!/(^|[\s>+~(,])\.panel(?![\w-])/.test(strip(r.selector))) return;
      const own = declsOf(r);
      expect(own, r.selector).not.toHaveProperty('--surface-current');
      expect(own, r.selector).not.toHaveProperty('background');
      expect(own, r.selector).not.toHaveProperty('background-color');
    });
  });

  it('a `.card` nested in `.card-inverted` restores every token the dark card re-maps, to its `:root` value', () => {
    const tokens = rootTokens();
    const rule = (sel) => {
      let found;
      root.walkRules((r) => { if (strip(r.selector) === sel && r.parent.type === 'root') found = declsOf(r); });
      return found;
    };
    const inv = rule('.card-inverted');
    const nested = rule(':where(.card-inverted .card)');
    expect(nested, 'the nested light card rule').toBeTruthy();
    // its own surface is the card's (`.card` sets it); everything else the
    // dark card re-maps comes back with the value it has on :root
    const restored = Object.keys(inv).filter((p) => p.startsWith('--') && p !== '--surface-current');
    expect(restored.length).toBeGreaterThan(15);
    const wrong = restored.filter((p) => nested[p] !== tokens[p]).map((p) => `${p}: ${nested[p]} (root: ${tokens[p]})`);
    expect(wrong).toEqual([]);
    expect(nested.color).toBe('var(--primary-text-color)');
  });
});

describe('CSS-380: the surface on paper', () => {
  it('the print module makes the page surface white', () => {
    const decls = {};
    root.walkAtRules('media', (a) => {
      if (a.params !== 'print') return;
      a.walkRules((r) => { if (r.selector === ':root') Object.assign(decls, declsOf(r)); });
    });
    expect(decls['--surface-current']).toBe('var(--white)');
  });
});

describe('CSS-385: print folds every outdent back to the column', () => {
  // Page- and header-level by design, not content blocks.
  const EXEMPT = {
    '.wide-background': 'full-bleed band breaking out of the page grid',
    '.search-wrapper': 'header search panel, hidden in print',
    '.section-icon': 'small hanging icon beside a heading',
  };

  it('every outdent selector is reset inside @media print, or exempt', () => {
    const outdents = new Set();
    root.walkDecls('margin-left', (d) => {
      if (!/^(-|calc\(\s*-|calc\(.*\*\s*-1\s*\))/.test(d.value.trim())) return;
      for (let p = d.parent.parent; p && p.type !== 'root'; p = p.parent) {
        if (p.type === 'atrule' && p.params === 'print') return;
      }
      for (const s of d.parent.selectors) outdents.add(strip(s));
    });
    const folded = new Set();
    root.walkAtRules('media', (a) => {
      if (a.params !== 'print') return;
      a.walkRules((r) => {
        const own = declsOf(r);
        if (own['margin-left'] === '0' && own.width === 'auto') for (const s of r.selectors) folded.add(strip(s));
      });
    });
    const uncovered = [...outdents].filter((o) => !folded.has(o) && !(o in EXEMPT));
    expect(outdents.size).toBeGreaterThan(8);
    expect(folded.has('.card-caption')).toBe(true);
    expect(uncovered).toEqual([]);
  });
});

// Spacing generator matrix (CSS-346, v0.7.0 bug closure).
// Guards the generated spacing utilities in the committed rare.css: every
// `var(--space-*)` is resolved against the `:root` tokens, and no property
// may receive a value it cannot take — `padding: auto` was invalid at
// computed-value time and silently acted as `padding: 0`.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const GATE = /:where\(\.rd, \.rd \*\)/g;

// property → values it can never take
const INVALID = {
  padding: ['auto'], 'padding-top': ['auto'], 'padding-right': ['auto'],
  'padding-bottom': ['auto'], 'padding-left': ['auto'],
  gap: ['auto'], 'row-gap': ['auto'], 'column-gap': ['auto'],
};

const BASE = ['margin', 'margin-t', 'margin-r', 'margin-b', 'margin-l', 'margin-x', 'margin-y',
  'padding', 'padding-t', 'padding-r', 'padding-b', 'padding-l', 'padding-x', 'padding-y',
  'gap', 'gap-x', 'gap-y', 'width', 'height', 'top', 'right', 'bottom', 'left'];
const NO_AUTO = (family) => family.startsWith('padding') || family.startsWith('gap');

let tokens; // --space-* → raw value
let classes; // Set of "<media> .class" (gate stripped)
let decls; // [{ selector, prop, value, media }]

beforeAll(() => {
  const root = postcss.parse(readFileSync(resolve(process.cwd(), 'assets/css/rare.css'), 'utf8'));
  tokens = {};
  root.each((node) => {
    if (node.type === 'rule' && node.selector === ':root') {
      node.walkDecls(/^--space-/, (d) => { tokens[d.prop] = d.value.trim(); });
    }
  });
  classes = new Set();
  decls = [];
  root.walkRules((rule) => {
    const media = rule.parent.type === 'atrule' ? rule.parent.params : '';
    for (const s of rule.selectors) {
      const selector = s.replace(GATE, '');
      classes.add(`${media} ${selector}`);
      rule.walkDecls((d) => decls.push({ selector, prop: d.prop, value: d.value, media }));
    }
  });
});

const resolveVars = (value, depth = 0) =>
  depth > 10 ? value : value.replace(/var\((--[\w-]+)\)/g, (m, name) =>
    name in tokens ? resolveVars(tokens[name], depth + 1) : m);

describe('CSS-346: generated spacing values are valid', () => {
  it('reads the spacing scale from :root', () => {
    expect(tokens['--space-auto']).toBe('auto');
    expect(Object.keys(tokens).length).toBeGreaterThan(25);
  });

  it('no padding/gap declaration resolves to an invalid value', () => {
    const bad = decls
      .filter((d) => INVALID[d.prop]?.includes(resolveVars(d.value).trim()))
      .map((d) => `${d.media} ${d.selector} { ${d.prop}: ${d.value} }`.trim());
    expect(bad).toEqual([]);
  });

  it('the base matrix emits every family × token, except auto for padding and gap', () => {
    const spaces = Object.keys(tokens).map((t) => t.replace('--space-', ''));
    const missing = [];
    const unexpected = [];
    for (const family of BASE) {
      for (const space of spaces) {
        const has = classes.has(` .${family}-${space}`);
        const want = !(space === 'auto' && NO_AUTO(family));
        if (want && !has) missing.push(`.${family}-${space}`);
        if (!want && has) unexpected.push(`.${family}-${space}`);
      }
    }
    expect(unexpected).toEqual([]);
    expect(missing).toEqual([]);
  });

  it('responsive variants follow the same matrix', () => {
    const media = [...new Set(decls.filter((d) => /^\.mobile\\:/.test(d.selector)).map((d) => d.media))][0];
    expect(media).toBeTruthy();
    for (const family of ['padding', 'padding-x', 'padding-y', 'gap']) {
      expect(classes.has(`${media} .mobile\\:${family}-auto`)).toBe(false);
      expect(classes.has(`${media} .mobile\\:${family}-md`)).toBe(true);
    }
    for (const family of ['margin', 'margin-x', 'width', 'top']) {
      expect(classes.has(`${media} .mobile\\:${family}-auto`)).toBe(true);
    }
  });
});

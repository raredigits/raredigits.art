// Compiled-CSS checks (CSS-118, v0.7.0). They run on the committed artifacts,
// which are what consumers download.
//
//   - source/artifact agreement: rare.css / rare.min.css (+ maps) equal a fresh
//     `scripts/build-css.mjs` build. This catches an ungated or stale artifact,
//     e.g. one written by a leftover `sass --watch`.
//   - every declaration is valid for its property once var() is resolved
//     through the :root tokens (css-tree lexer)
//   - every var() resolves or has a fallback, except documented required hooks
//   - escaped responsive selectors (`.mobile\:padding-md`) match their class
//   - spacing aliases (`.p-l`, `.mx-s`, …) equal their canonical utilities
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import * as csstree from 'css-tree';
import { JSDOM } from 'jsdom';
import { compile, TARGETS } from '../scripts/build-css.mjs';

const CSS = (f) => readFileSync(resolve(process.cwd(), 'assets/css', f), 'utf8');
const GATE = /:where\(\.rd, \.rd \*\)/g;

// Custom properties a consumer must set; the library cannot default them.
const REQUIRED_HOOKS = new Set(['--list-rows']);

let root;
let tokens;
let declared;

beforeAll(() => {
  root = postcss.parse(CSS('rare.css'));
  tokens = {};
  declared = new Set();
  root.walkDecls(/^--/, (d) => {
    declared.add(d.prop);
    if (d.parent.selector === ':root' && d.parent.parent.type === 'root') tokens[d.prop] = d.value.trim();
  });
});

const VAR = /var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g;
const resolveVars = (v, depth = 0) => (depth > 12 ? v : v.replace(VAR, (m, name, fb) =>
  name in tokens ? resolveVars(tokens[name], depth + 1) : fb !== undefined ? resolveVars(fb, depth + 1) : '\u0000'));

describe('CSS-118: committed artifacts equal a fresh build', () => {
  it.each(TARGETS.map((t) => [t.file, t]))('%s', async (file, target) => {
    const built = await compile(target);
    expect(built.css === CSS(file), `${file} is stale or ungated — run npm run build:css`).toBe(true);
    expect(built.map === CSS(`${file}.map`), `${file}.map is stale — run npm run build:css`).toBe(true);
  });
});

describe('CSS-118: values and tokens', () => {
  it('every declaration is valid for its property (var() resolved)', () => {
    const invalid = [];
    root.walkDecls((d) => {
      if (d.prop.startsWith('--') || d.parent.type !== 'rule') return;
      const v = resolveVars(d.value).replace(/\s*!important$/, '');
      if (v.includes('\u0000')) return; // component-scoped variable, checked below
      const r = csstree.lexer.matchProperty(d.prop, csstree.parse(v, { context: 'value' }));
      if (r.error && !/Unknown property/.test(r.error.message)) {
        invalid.push(`${d.parent.selector.replace(GATE, '')} { ${d.prop}: ${d.value} }`);
      }
    });
    expect(invalid).toEqual([]);
  });

  it('every var() is declared somewhere or has a fallback (except required hooks)', () => {
    const unresolved = new Set();
    root.walkDecls((d) => {
      for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        if (!declared.has(m[1]) && !m[2] && !REQUIRED_HOOKS.has(m[1])) unresolved.add(m[1]);
      }
    });
    expect([...unresolved]).toEqual([]);
  });
});

describe('CSS-118: selectors', () => {
  it('escaped responsive selectors match their class names', () => {
    const { document } = new JSDOM('<!doctype html><html class="rd"><body></body></html>').window;
    const misses = [];
    let checked = 0;
    root.walkRules((r) => {
      for (const s of r.selectors) {
        const m = s.match(/^\.((?:mobile|tablet|desktop)\\:[\w-]+):where/);
        if (!m) continue;
        const el = document.createElement('div');
        el.className = m[1].replace(/\\/g, '');
        document.body.append(el);
        checked++;
        if (!el.matches(s)) misses.push(s);
        el.remove();
      }
    });
    expect(checked).toBeGreaterThan(1000);
    expect(misses).toEqual([]);
  });

  it('spacing aliases equal their canonical utilities', () => {
    const ALIAS = { s: 'xs', m: 'sm', l: 'md', xl: 'lg', xxl: 'xl' };
    const FAMILY = { p: 'padding', m: 'margin', w: 'width', h: 'height', gap: 'gap' };
    const body = new Map();
    root.walkRules((r) => {
      if (r.parent.type !== 'root') return;
      for (const s of r.selectors) {
        const m = s.replace(GATE, '').match(/^\.([\w-]+)$/);
        if (m) body.set(m[1], r.nodes.filter((n) => n.type === 'decl').map((d) => `${d.prop}:${d.value}`).join(';'));
      }
    });
    const mismatches = [];
    let checked = 0;
    for (const [cls, decls] of body) {
      const m = cls.match(/^(p|m|w|h|gap)([trblxy]?)-(s|m|l|xl|xxl)$/);
      if (!m) continue;
      const [, fam, dir, alias] = m;
      // gap aliases stop at `l`: `.gap-xl`/`.gap-xxl` are canonical (CSS-098)
      if (fam === 'gap' && (alias === 'xl' || alias === 'xxl')) continue;
      const canonical = `${FAMILY[fam]}${dir ? `-${dir}` : ''}-${ALIAS[alias]}`;
      checked++;
      if (body.get(canonical) !== decls) mismatches.push(`.${cls} {${decls}} ≠ .${canonical} {${body.get(canonical)}}`);
    }
    expect(checked).toBeGreaterThan(40);
    expect(mismatches).toEqual([]);
  });
});

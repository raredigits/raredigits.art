// Layout contracts found by the CSS-345 bug sweep (v0.7.0, 2026-10-16).
//
//   CSS-357  every outdent (negative margin-left that hangs a block into the
//            page margin) is reset inside `.card`, which has no margin to hang
//            into — or is explicitly exempt with a reason.
//   CSS-358  every media query uses the shared breakpoint boundaries, so no
//            module switches layout one pixel off the rest (sidenotes used
//            `width <= 1024px` while desktop starts at 1024px).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const GATE = /:where\(\.rd, \.rd \*\)/g;
const PAGE = /^:where\(html\.rd, body\.rd\) /;
const strip = (s) => s.replace(GATE, '').replace(PAGE, '').trim();

// Outdents that are page- or header-level by design, not content blocks.
const EXEMPT = {
  '.wide-background': 'full-bleed band breaking out of the page grid',
  '.search-wrapper': 'header search panel',
  '.section-icon': 'small hanging icon beside a heading',
  'p.highlight': 'covered by the `.highlight` reset (higher specificity there)',
};

const ALLOWED_MEDIA = new Set([
  'screen and (max-width: 768px)',
  'screen and (min-width: 769px) and (max-width: 1023px)',
  'screen and (min-width: 1024px)',
  '(width < 1024px)',
  '(width <= 768px)',
  '(prefers-reduced-motion: no-preference)',
]);

let root;
beforeAll(() => {
  root = postcss.parse(readFileSync(resolve(process.cwd(), 'assets/css/rare.css'), 'utf8'));
});

describe('CSS-357: outdents are contained inside .card', () => {
  it('every outdent selector is reset in .card or exempt', () => {
    const outdents = new Set();
    root.walkDecls('margin-left', (d) => {
      if (!/^(-|calc\(\s*-|calc\(.*\*\s*-1\s*\))/.test(d.value.trim())) return;
      for (const s of d.parent.selectors) outdents.add(strip(s));
    });
    const resetInCard = new Set();
    root.walkRules((r) => {
      const zero = r.nodes.some((n) => n.type === 'decl' && n.prop === 'margin-left' && n.value === '0');
      if (!zero) return;
      for (const s of r.selectors) {
        const m = strip(s).match(/^\.card (.+)$/);
        if (m) resetInCard.add(m[1]);
      }
    });
    const uncovered = [...outdents].filter((o) => !resetInCard.has(o) && !(o in EXEMPT));
    expect(outdents.size).toBeGreaterThan(8);
    expect(uncovered).toEqual([]);
  });
});

describe('CSS-358: media queries use the shared breakpoint boundaries', () => {
  it('no ad-hoc media query', () => {
    const odd = new Set();
    root.walkAtRules('media', (a) => { if (!ALLOWED_MEDIA.has(a.params)) odd.add(a.params); });
    expect([...odd]).toEqual([]);
  });

  it('the 1024px boundary is exclusive everywhere (desktop starts at 1024)', () => {
    let inclusive = 0;
    root.walkAtRules('media', (a) => { if (/width\s*<=\s*1024px|max-width:\s*1024px/.test(a.params)) inclusive++; });
    expect(inclusive).toBe(0);
  });
});

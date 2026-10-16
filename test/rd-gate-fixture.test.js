// Hostile-host fixture — the `.rd` gate proof (CSS-338, v0.7.0, Q-14).
//
//   (a) without `.rd`, rare.css changes nothing on a foreign page
//   (b) a `class="rd"` island gets tag styles and library classes, but no
//       page-shell rules and no base typography on the island root
//   (c) `<html class="rd">` matches exactly what the ungated build matched,
//       on snapshots of real docs pages, with unchanged specificity
//   (d) every selector in the committed rare.css / rare.min.css is gated,
//       page-gated or on the ungated list
//
// Evidence is selector matching (jsdom/nwsapi) on the real compiled CSS,
// media-independent: a rule inside any @media counts as if it applied.
// getComputedStyle in jsdom resolves the cascade but not var() or most
// inheritance, so it is a secondary check here, not rendering proof — the
// browser-level checks are CSS-118 (same release, bug-closure slice).
//
// The docs-page fixtures are build snapshots (2026-10-16). Refresh after a
// layout change: `npx @11ty/eleventy`, then copy _site/<path>/index.html to
// test/fixtures/rd-gate/<path-with-dashes>.html.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import * as sass from 'sass';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import rdGate, { classify, normalize } from '../scripts/rd-gate.mjs';
import { UNGATED_AT_RULES } from '../scripts/rd-gate.config.mjs';

const ROOT = process.cwd();
const FIXTURES = resolve(ROOT, 'test/fixtures/rd-gate');
const fixture = (f) => readFileSync(resolve(FIXTURES, f), 'utf8');

const LEGACY_PE = new Set([':before', ':after', ':first-line', ':first-letter']);
const isPE = (n) => n.type === 'pseudo' && (n.value.startsWith('::') || LEGACY_PE.has(n.value));

// Rules outside @font-face / @keyframes, in source order.
function styleRules(root) {
  const out = [];
  root.walkRules((rule) => {
    for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) {
      if (p.type === 'atrule' && UNGATED_AT_RULES.includes(p.name.replace(/^-\w+-/, ''))) return;
    }
    out.push(rule);
  });
  return out;
}

// Pseudo-elements stripped: match the originating element.
const originating = (sel) =>
  selectorParser((r) => r.walkPseudos((p) => { if (isPE(p)) p.remove(); })).processSync(sel).trim() || '*';

function matches(doc, sel) {
  try {
    return [...doc.querySelectorAll(originating(sel))];
  } catch {
    return null; // selector nwsapi cannot evaluate (vendor pseudos)
  }
}

// [ids, classes/attrs/pseudo-classes, types/pseudo-elements]
function specificity(selector) {
  const of = (sel) => {
    const s = [0, 0, 0];
    for (const n of sel.nodes) {
      if (n.type === 'id') s[0]++;
      else if (n.type === 'class' || n.type === 'attribute') s[1]++;
      else if (n.type === 'tag') s[2]++;
      else if (n.type === 'pseudo') {
        if (isPE(n)) s[2]++;
        else if (n.value === ':where') continue;
        else if ([':is', ':not', ':has', ':matches'].includes(n.value)) {
          const m = n.nodes.map(of).sort((x, y) => y[0] - x[0] || y[1] - x[1] || y[2] - x[2])[0] ?? [0, 0, 0];
          s[0] += m[0]; s[1] += m[1]; s[2] += m[2];
        } else s[1]++;
      }
    }
    return s;
  };
  return of(selectorParser().astSync(selector).first);
}

const dom = (html, css) => {
  const d = new JSDOM(html);
  if (css) {
    const style = d.window.document.createElement('style');
    style.textContent = css;
    d.window.document.head.append(style); // library after the host: worst case
  }
  return d;
};

let ORIG; // Sass output, ungated (what v0.6.19 shipped)
let GATED; // the same build through rd-gate
let PAIRS; // [{ orig, gated, kind, rule }] aligned selector by selector

beforeAll(async () => {
  ORIG = sass.compile(resolve(ROOT, 'assets/css/rare.scss'), { style: 'expanded' }).css;
  GATED = (await postcss([rdGate()]).process(ORIG, { from: undefined })).css;
  const a = styleRules(postcss.parse(ORIG));
  const b = styleRules(postcss.parse(GATED));
  expect(b.length).toBe(a.length);
  PAIRS = [];
  a.forEach((rule, i) => {
    rule.selectors.forEach((orig, j) => {
      PAIRS.push({ orig, gated: b[i].selectors[j], kind: classify(orig), rule: b[i] });
    });
  });
});

describe('CSS-338 (a): no effect without .rd', () => {
  it('no library selector matches anything on a foreign page', () => {
    const doc = dom(fixture('hostile-host.html')).window.document;
    const hits = [];
    for (const { gated, orig } of PAIRS) {
      if (orig === ':root') continue; // custom properties only — asserted below
      const m = matches(doc, gated);
      if (m && m.length) hits.push(`${gated} → ${m.length}`);
    }
    expect(hits).toEqual([]);
  });

  it(':root rules declare custom properties only', () => {
    const leaks = PAIRS.filter((p) => p.orig === ':root')
      .flatMap((p) => p.rule.nodes.filter((d) => d.type === 'decl' && !d.prop.startsWith('--')))
      .map((d) => d.prop);
    expect(leaks).toEqual([]);
  });

  it('computed styles are identical with and without rare.css', () => {
    // The injected <style> itself stays out; `:root` tokens are global by
    // design (custom properties only — asserted above), so `--*` is skipped.
    const snap = (d) => [...d.window.document.querySelectorAll('html, body, body *')].map((el) => {
      const cs = d.window.getComputedStyle(el);
      return [...cs].filter((p) => !p.startsWith('--')).sort()
        .map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    });
    const html = fixture('hostile-host.html');
    expect(snap(dom(html, GATED))).toEqual(snap(dom(html)));
  });
});

describe('CSS-338 (b): an island', () => {
  let doc;
  let island;
  beforeAll(() => {
    doc = dom(fixture('hostile-host.html'), GATED).window.document;
    island = doc.getElementById('island');
    island.classList.add('rd');
  });

  it('page-shell rules match nothing — not even header/footer/section/nav inside the island', () => {
    const hits = PAIRS.filter((p) => p.kind === 'page')
      .filter((p) => matches(doc, p.gated)?.length)
      .map((p) => p.gated);
    expect(hits).toEqual([]);
  });

  it('library rules never reach outside the island', () => {
    const leaks = [];
    for (const { gated, kind } of PAIRS) {
      if (kind !== 'island') continue;
      for (const el of matches(doc, gated) ?? []) {
        if (!island.contains(el)) leaks.push(`${gated} → <${el.tagName.toLowerCase()}>`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('tag styles and library classes apply inside', () => {
    const hit = (orig, el) => {
      const p = PAIRS.find((x) => x.orig === orig);
      return (matches(doc, p.gated) ?? []).includes(el);
    };
    expect(hit('h1', island.querySelector('h1'))).toBe(true);
    expect(hit('p', island.querySelector('p'))).toBe(true);
    expect(hit('table', island.querySelector('table'))).toBe(true);
    expect(hit('a', island.querySelector('p a'))).toBe(true);
    expect(PAIRS.some((p) => p.orig.startsWith('.button') && hit(p.orig, island.querySelector('a.button')))).toBe(true);
    // the host's own .button stays the host's
    expect(PAIRS.some((p) => p.orig.startsWith('.button') && hit(p.orig, doc.querySelector('main a.button')))).toBe(false);
  });

  it('the island root gets no base typography (only the reset)', () => {
    const TYPO = /^(font|line-height|color|letter-spacing|text-)/;
    // A bare pseudo-element selector (`::-webkit-file-upload-button`) strips
    // to "any element" — its real originating element is a file input.
    const onRoot = PAIRS.filter((p) => !p.orig.startsWith('::'))
      .filter((p) => (matches(doc, p.gated) ?? []).includes(island));
    expect(onRoot.map((p) => p.orig)).toEqual(['*']);
    expect(onRoot.flatMap((p) => p.rule.nodes).filter((d) => TYPO.test(d.prop ?? ''))).toEqual([]);
  });

  it('library tag styles that the host leaves alone are visible in the island', () => {
    const w = doc.defaultView;
    expect(w.getComputedStyle(island.querySelector('table')).minWidth).toBe('100%');
    expect(w.getComputedStyle(doc.querySelector('main table')).minWidth).not.toBe('100%');
  });
});

describe('CSS-338 (c): page mode renders as before the gate', () => {
  const pages = readdirSync(FIXTURES).filter((f) => f.endsWith('.html') && f !== 'hostile-host.html');

  it('the in-repo roots opt in with class="rd"', () => {
    for (const f of ['_includes/head.njk', '_layouts/examples/hetke.njk']) {
      expect(readFileSync(resolve(ROOT, f), 'utf8')).toMatch(/<html[^>]*class="rd"/);
    }
  });

  it.each(pages)('%s: every gated selector matches exactly what it matched ungated', (page) => {
    const doc = dom(fixture(page)).window.document;
    expect(doc.documentElement.classList.contains('rd')).toBe(true);
    const diffs = [];
    let evaluated = 0;
    for (const { orig, gated } of PAIRS) {
      const before = matches(doc, orig);
      const after = matches(doc, gated);
      if (before === null || after === null) {
        if ((before === null) !== (after === null)) diffs.push(`${orig}: evaluable only on one side`);
        continue;
      }
      evaluated++;
      if (before.length !== after.length || before.some((el, i) => el !== after[i])) {
        diffs.push(`${orig}: ${before.length} → ${after.length}`);
      }
    }
    expect(diffs).toEqual([]);
    expect(evaluated).toBeGreaterThan(PAIRS.length * 0.99);
  });

  it('the gate adds zero specificity', () => {
    const changed = PAIRS.filter((p) => specificity(p.orig).join() !== specificity(p.gated).join())
      .map((p) => `${p.orig} ${specificity(p.orig)} → ${specificity(p.gated)}`);
    expect(changed).toEqual([]);
  });
});

describe('CSS-338 (d): nothing escapes the gate in the committed artifacts', () => {
  const ISLAND_RE = /:where\(\.rd,\.rd \*\)$/;
  const PAGE_RE = /^(:where\(html\.rd,body\.rd\)|html:where\(\.rd\)|body:where\(\.rd,html\.rd>\*\))/;

  const namesRdTopLevel = (sel) =>
    selectorParser().astSync(sel).first.nodes.some((n) => n.type === 'class' && n.value === 'rd');
  const iconCompound = (sel) => {
    const s = selectorParser().astSync(sel).first;
    return !s.nodes.some((n) => n.type === 'combinator') && /rd-icon-/.test(sel);
  };

  it.each(['rare.css', 'rare.min.css'])('%s', (file) => {
    const root = postcss.parse(readFileSync(resolve(ROOT, 'assets/css', file), 'utf8'));
    const escaped = [];
    let total = 0;
    for (const rule of styleRules(root)) {
      for (const sel of rule.selectors) {
        total++;
        const key = normalize(sel);
        if (ISLAND_RE.test(normalize(originating(sel)))) continue;
        if (PAGE_RE.test(key)) continue;
        if (key === ':root' || iconCompound(sel) || namesRdTopLevel(sel)) continue;
        escaped.push(sel);
      }
    }
    expect(escaped).toEqual([]);
    expect(total).toBeGreaterThan(4000);
  });
});

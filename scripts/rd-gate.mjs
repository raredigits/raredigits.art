// PostCSS `rd-gate` plugin (CSS-343, v0.7.0 — the `.rd` scope gate, Q-14).
//
// Runs after Sass on the compiled CSS. Module sources stay untouched; the
// classification lives in rd-gate.config.mjs (the CSS-337 inventory).
//
//   island gate  `.card a::before` → `.card a:where(.rd, .rd *)::before`
//                appended to the last compound, before any pseudo-element
//   page gate    `header`  → `:where(html.rd, body.rd) header`
//                `html`    → `html:where(.rd)`
//                `body`    → `body:where(.rd, html.rd > *)`
//   ungated      `:root`, `@font-face`, `@keyframes`, `rd-icon-*` compounds,
//                and selectors that already name `.rd` themselves
//
// `:where()` adds zero specificity: every rule keeps the weight it had before.
// The plugin throws on a bare-element selector missing from the config and
// reports config entries the build no longer emits (stale inventory).

import selectorParser from 'postcss-selector-parser';
import {
  UNGATED_SELECTORS,
  UNGATED_AT_RULES,
  PAGE,
  ISLAND,
} from './rd-gate.config.mjs';

const LEGACY_PSEUDO_ELEMENTS = new Set([':before', ':after', ':first-line', ':first-letter']);

// Whitespace-insensitive key, identical for expanded and compressed output.
export const normalize = (s) =>
  s.replace(/\s*([>+~,()])\s*/g, '$1').replace(/\s+/g, ' ').trim();

const isPseudoElement = (n) =>
  n.type === 'pseudo' && (n.value.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(n.value));

const isClassish = (n) => n.type === 'class' || n.type === 'attribute' || n.type === 'id';

// Classify one selector (string) → 'ungated' | 'page' | 'island'.
export function classify(selector, { page = PAGE, island = ISLAND } = {}) {
  const key = normalize(selector);
  if (UNGATED_SELECTORS.includes(key)) return 'ungated';

  const sel = selectorParser().astSync(selector).first;
  let classish = false;
  let namesRd = false;
  let iconRef = false;
  sel.walk((n) => {
    if (isClassish(n)) classish = true;
    if (n.type === 'class' && n.value === 'rd') namesRd = true;
    if ((n.type === 'class' || n.type === 'attribute') && String(n).includes('rd-icon-')) iconRef = true;
  });

  if (namesRd) return 'ungated';
  // A self-contained icon compound (`.rd-icon-check::before`,
  // `[class*=rd-icon-].rd-is-copied::before`) — no combinator, names the set.
  if (iconRef && !sel.nodes.some((n) => n.type === 'combinator')) return 'ungated';

  if (classish) return 'island';
  if (page.some((p) => normalize(p) === key)) return 'page';
  if (island.some((p) => normalize(p) === key)) return 'island';
  return null;
}

function lastCompoundInsertIndex(sel) {
  const nodes = sel.nodes;
  let start = nodes.length;
  while (start > 0 && nodes[start - 1].type !== 'combinator') start--;
  for (let i = start; i < nodes.length; i++) {
    if (isPseudoElement(nodes[i])) return i;
  }
  return nodes.length;
}

function firstCompound(sel) {
  const out = [];
  for (const n of sel.nodes) {
    if (n.type === 'combinator') break;
    out.push(n);
  }
  return out;
}

export default function rdGate({ compact = false } = {}) {
  const sp = compact ? ',' : ', ';
  const ISLAND_GATE = `:where(.rd${sp}.rd *)`;
  const PAGE_ROOT = `:where(html.rd${sp}body.rd)`;
  const HTML_GATE = ':where(.rd)';
  const BODY_GATE = compact ? ':where(.rd,html.rd>*)' : ':where(.rd, html.rd > *)';

  const pseudo = (src) => selectorParser().astSync(src).first.first;

  function gate(selector, kind) {
    return selectorParser((root) => {
      const sel = root.first;
      if (kind === 'island') {
        const i = lastCompoundInsertIndex(sel);
        if (i < sel.length) sel.insertBefore(sel.at(i), pseudo(ISLAND_GATE));
        else sel.append(pseudo(ISLAND_GATE));
        return;
      }
      // page
      const head = firstCompound(sel);
      const tag = head.find((n) => n.type === 'tag');
      const tagName = tag && tag.value.toLowerCase();
      if (tagName === 'html' || tagName === 'body') {
        const node = pseudo(tagName === 'html' ? HTML_GATE : BODY_GATE);
        const pe = head.find(isPseudoElement);
        if (pe) sel.insertBefore(pe, node);
        else sel.insertAfter(head[head.length - 1], node);
        return;
      }
      sel.prepend(selectorParser.combinator({ value: ' ' }));
      sel.prepend(pseudo(PAGE_ROOT));
    }).processSync(selector);
  }

  return {
    postcssPlugin: 'rd-gate',
    Once(root, { result }) {
      const seen = new Set();
      const unclassified = new Set();
      const stats = { island: 0, page: 0, ungated: 0 };

      root.walkRules((rule) => {
        for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) {
          if (p.type === 'atrule' && UNGATED_AT_RULES.includes(p.name.replace(/^-\w+-/, ''))) return;
        }
        rule.selectors = rule.selectors.map((s) => {
          const kind = classify(s);
          if (kind === null) {
            unclassified.add(normalize(s));
            return s;
          }
          seen.add(normalize(s));
          stats[kind]++;
          return kind === 'ungated' ? s : gate(s, kind);
        });
      });

      if (unclassified.size) {
        throw root.error(
          `rd-gate: ${unclassified.size} bare-element selector(s) missing from scripts/rd-gate.config.mjs ` +
            `(classify each as PAGE or ISLAND): ${[...unclassified].join(' | ')}`,
          { plugin: 'rd-gate' },
        );
      }
      const stale = [...PAGE, ...ISLAND].map(normalize).filter((k) => !seen.has(k));
      if (stale.length) {
        result.warn(`rd-gate: config lists selectors the build no longer emits: ${stale.join(' | ')}`);
      }
      result.messages.push({ type: 'rd-gate-stats', plugin: 'rd-gate', stats });
    },
  };
}
rdGate.postcss = true;

// RareCharts — core/hierarchy.js
// Shared normalizer for tree-shaped data. One contract, one normalized tree,
// consumed identically by every hierarchy chart: HierarchicalBar, Donut
// drill-down, and the future spatial Hierarchies (treemap/pack/sunburst).
//
// Authored node:
//   { label, value?, color?, children?, remainderLabel? }
//     - label is REQUIRED and non-blank. A blank/whitespace label is dropped:
//       it would render invisibly and yield an unstable id.
//     - value is AUTHORITATIVE and TRI-STATE:
//         · a finite number > 0 → a disclosed value. A parent's value may
//           exceed the sum of its children; the difference is a real remainder
//           (undisclosed / "other"), never inferred away.
//         · null → EXPLICITLY undisclosed. The node is kept as a "missing"
//           placeholder (value: null, missing: true), excluded from every sum,
//           it does NOT reduce a parent's remainder, and consumers render it as
//           a "?" marker.
//         · absent, 0, negative, or non-finite → no usable value. A leaf is
//           dropped; an internal node falls back to the sum of its children.
//           Compositional charts (donut, bar) can only draw positive magnitudes,
//           so 0/negative are rejected here rather than passed through for each
//           consumer to re-filter differently.
//     - children: presence marks an internal node.
//     - remainderLabel: per-node opt-in label for the remainder segment (data).
//
// normalizeHierarchy(input, opts?) accepts ONE root object OR an array of roots
// (a forest) and returns the same cardinality (or null when a single root is
// itself invalid).
//
// Options (chart-level, never per-node):
//   showRemainder  - surface the remainder on every node that has one, even
//                    without a per-node remainderLabel (default: false).
//   remainderLabel - fallback label for a surfaced remainder when the node does
//                    not set its own (default: 'Other').
//   strict         - throw on a data inconsistency (children exceed a stated
//                    parent value) instead of flagging it (default: false).
//
// Normalized node:
//   { id, label, value, depth, path, children, remainder, color?, missing?,
//     isRemainder?, overflow?, data }
//     - value:     effective magnitude — the disclosed value, else the sum of
//                  children; null for a missing placeholder.
//     - remainder: disclosed value minus the sum of children, on an INTERNAL
//                  node only (0 on any leaf and on a parent with no own value).
//                  Negative only when children exceed the stated parent, which
//                  also sets `overflow` (or throws under `strict`); a negative
//                  remainder is never surfaced as a child.
//     - children:  normalized children, plus a synthetic remainder node
//                  (isRemainder: true) appended when the remainder is > 0 and
//                  surfaced — so consumers render it as just another child and
//                  the children then sum to the parent's value.
//     - id:        collision-free machine identity. Duplicate siblings — and a
//                  real node colliding with a synthetic remainder — get distinct
//                  ids, and the disambiguation is threaded down the prefix so
//                  identical sibling SUBTREES stay distinct too.
//     - path:      array of ancestor display labels (for breadcrumbs).
//     - color:     authored color hoisted onto the atom (undefined when unset;
//                  no subtree inheritance — that is a spatial-Hierarchies concern).
//     - data:      the authored node minus children (a clean atom for tooltips).

const REMAINDER_DEFAULT = 'Other';
const SEP = String.fromCharCode(31);   // Unit Separator — never in display labels.
const REMAINDER_NS = SEP + 'remainder' + SEP; // id namespace for synthetic remainders.
const EPS = 1e-9;

// value → { kind: 'disclosed' | 'missing' | 'none', value: number | null }
function parseValue(raw) {
  if (!Object.prototype.hasOwnProperty.call(raw, 'value') || raw.value === undefined) {
    return { kind: 'none', value: null };
  }
  if (raw.value === null) return { kind: 'missing', value: null };
  const n = +raw.value;
  if (Number.isFinite(n) && n > 0) return { kind: 'disclosed', value: n };
  return { kind: 'none', value: null };  // 0, negative, non-finite → no usable value
}

function atom(raw, label, depth, value) {
  const { children: _drop, ...data } = raw;
  const node = { id: '', label, value, depth, path: [], children: [], remainder: 0, data };
  if (typeof raw.color === 'string' && raw.color) node.color = raw.color;
  return node;
}

function leaf(raw, label, depth, value, missing) {
  const node = atom(raw, label, depth, value);
  if (missing) node.missing = true;
  return node;
}

// ── Phase 1: structure, values, remainders (no identity yet) ────────────────
function buildNode(raw, depth, opts) {
  if (raw == null || typeof raw !== 'object') return null;

  const label = String(raw.label ?? '').trim();
  if (!label) return null;  // blank labels render invisibly and break ids

  const { kind, value: ownValue } = parseValue(raw);

  const children = Array.isArray(raw.children)
    ? raw.children.map(c => buildNode(c, depth + 1, opts)).filter(Boolean)
    : [];

  if (children.length === 0) {
    if (kind === 'disclosed') return leaf(raw, label, depth, ownValue, false);
    if (kind === 'missing')   return leaf(raw, label, depth, null, true);
    return null;  // a leaf with no usable value carries no information → drop
  }

  // Internal node. Missing children (value null) are placeholders: kept, but
  // they contribute nothing to the sum and do not reduce the remainder.
  const childrenSum = children.reduce(
    (s, c) => s + (typeof c.value === 'number' ? c.value : 0), 0);

  const hasOwn    = kind === 'disclosed';
  const value     = hasOwn ? ownValue : childrenSum;
  const remainder = hasOwn ? ownValue - childrenSum : 0;

  const node = atom(raw, label, depth, value);
  node.children  = children;
  node.remainder = remainder;

  if (remainder < -EPS) {
    if (opts.strict) {
      throw new Error(
        `RareCharts.normalizeHierarchy: children of "${label}" sum to ` +
        `${childrenSum}, exceeding its stated value ${ownValue}.`);
    }
    node.overflow = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `RareCharts.normalizeHierarchy: children of "${label}" (${childrenSum}) ` +
        `exceed its stated value ${ownValue}; remainder left negative, not drawn.`);
    }
  }

  // Surface a positive remainder as a synthetic child — never silent.
  const surface = remainder > EPS && (raw.remainderLabel != null || opts.showRemainder);
  if (surface) {
    const rLabel = String(raw.remainderLabel ?? opts.remainderLabel).trim() || REMAINDER_DEFAULT;
    const rem = atom({ label: rLabel }, rLabel, depth + 1, remainder);
    rem.isRemainder = true;
    rem.data = { label: rLabel, value: remainder, isRemainder: true };
    node.children = [...children, rem];
  }

  return node;
}

// ── Phase 2: collision-free identity, threaded down the prefix ──────────────
function assignIdentity(node, id, labelPath) {
  node.id   = id;
  node.path = labelPath;
  const seen = new Map();
  for (const child of node.children) {
    const base = (child.isRemainder ? REMAINDER_NS : '') + child.label;
    const n    = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const key  = n === 0 ? base : `${base}${SEP}#${n}`;
    assignIdentity(child, `${id}${SEP}${key}`, [...labelPath, child.label]);
  }
  return node;
}

export function normalizeHierarchy(input, opts = {}) {
  const options = {
    showRemainder:  opts.showRemainder  ?? false,
    remainderLabel: opts.remainderLabel ?? REMAINDER_DEFAULT,
    strict:         opts.strict         ?? false,
  };

  if (Array.isArray(input)) {
    const seen = new Map();
    return input
      .map(root => buildNode(root, 0, options))
      .filter(Boolean)
      .map((root) => {
        const n  = seen.get(root.label) ?? 0;
        seen.set(root.label, n + 1);
        const id = n === 0 ? root.label : `${root.label}${SEP}#${n}`;
        return assignIdentity(root, id, [root.label]);
      });
  }

  const root = buildNode(input, 0, options);
  return root ? assignIdentity(root, root.label, [root.label]) : null;
}

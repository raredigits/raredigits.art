import { describe, it, expect, vi } from 'vitest';
import { normalizeHierarchy } from '../assets/charts/src/core/hierarchy.js';

// The verification case from the 0.9.8_2 spec — Bloomberg's Trump crypto
// portfolio. Chosen because it exercises, at once:
//   · a two-level tree with a remainder at BOTH levels
//       root: 1400  − Σ disclosed children (1377.6) → remainder 22.4
//       WLF:  536.4 − Σ keys (243.2)                → remainder 293.2
//   · named-but-undisclosed items (value: null) — the two "License agreement"
//     rows the source draws as "?" and footnotes as not disclosed.
// The fixture itself carries NO remainderLabel (structural baseline); surfacing
// is exercised in its own block below.
const portfolio = {
  label: 'Trump crypto businesses',
  value: 1400,
  children: [
    {
      label: 'World Liberty Financial',
      value: 536.4,
      children: [
        { label: 'Ethereum Key', value: 106 },
        { label: 'USDC Key',     value: 56 },
        { label: 'USD Key',      value: 42.3 },
        { label: 'Bitcoin Key',  value: 33.5 },
        { label: 'Link Key',     value: 2.8 },
        { label: 'AAVE Key',     value: 2.6 },
      ],
    },
    { label: 'License agreement with Celebration Coins', value: 636 },
    { label: 'Stablecoin proceeds',                      value: 196.9 },
    { label: 'Stablecoin business',                      value: 8.3 },
    { label: 'License agreement with CIC Digital LLC for NFTs and meme coins', value: null },
    { label: 'License agreement with NFT INT, LLC',                            value: null },
  ],
};

const wlf = (root) => root.children.find(c => c.label === 'World Liberty Financial');

describe('normalizeHierarchy — structure', () => {
  it('returns a single normalized root for a single object input', () => {
    const root = normalizeHierarchy(portfolio);
    expect(Array.isArray(root)).toBe(false);
    expect(root.label).toBe('Trump crypto businesses');
    expect(root.depth).toBe(0);
    expect(root.children).toHaveLength(6);   // 4 disclosed + 2 missing placeholders
  });

  it('returns an array of roots for a forest input', () => {
    const forest = normalizeHierarchy([portfolio, { label: 'Other fund', value: 10 }]);
    expect(Array.isArray(forest)).toBe(true);
    expect(forest).toHaveLength(2);
    expect(forest[1].label).toBe('Other fund');
  });

  it('assigns increasing depth down the tree', () => {
    const root = normalizeHierarchy(portfolio);
    expect(root.depth).toBe(0);
    expect(wlf(root).depth).toBe(1);
    expect(wlf(root).children[0].depth).toBe(2);
  });

  it('records the ancestor-label path on each node', () => {
    const root = normalizeHierarchy(portfolio);
    expect(wlf(root).children[0].path).toEqual([
      'Trump crypto businesses', 'World Liberty Financial', 'Ethereum Key',
    ]);
  });

  it('exposes the authored node (minus children) as data', () => {
    const root = normalizeHierarchy(portfolio);
    expect(wlf(root).data).toMatchObject({ label: 'World Liberty Financial', value: 536.4 });
    expect(wlf(root).data.children).toBeUndefined();
  });
});

describe('normalizeHierarchy — authoritative value and remainder', () => {
  it("uses a parent's authored value even when it exceeds the sum of children", () => {
    const root = normalizeHierarchy(portfolio);
    expect(root.value).toBe(1400);
    expect(wlf(root).value).toBe(536.4);
  });

  it('computes the remainder as value − Σ children on an internal node', () => {
    const root = normalizeHierarchy(portfolio);
    expect(root.remainder).toBeCloseTo(22.4, 6);    // missing children do not reduce it
    expect(wlf(root).remainder).toBeCloseTo(293.2, 6);
  });

  it('gives a leaf a remainder of 0 (not its own value)', () => {
    const root = normalizeHierarchy(portfolio);
    const ethereum = wlf(root).children.find(c => c.label === 'Ethereum Key');
    expect(ethereum.value).toBe(106);
    expect(ethereum.remainder).toBe(0);
  });

  it('derives a value for a parent that omits its own value; remainder 0', () => {
    const root = normalizeHierarchy({
      label: 'Book',
      children: [{ label: 'A', value: 3 }, { label: 'B', value: 7 }],
    });
    expect(root.value).toBe(10);
    expect(root.remainder).toBe(0);
  });
});

describe('normalizeHierarchy — overflow policy (children exceed parent)', () => {
  const understated = {
    label: 'Understated',
    value: 5,
    children: [{ label: 'A', value: 4 }, { label: 'B', value: 4 }],
  };

  it('flags overflow, keeps the negative remainder visible, never surfaces it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = normalizeHierarchy(understated);
    expect(root.remainder).toBe(-3);
    expect(root.overflow).toBe(true);
    expect(root.children.some(c => c.isRemainder)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws under strict mode instead of flagging', () => {
    expect(() => normalizeHierarchy(understated, { strict: true })).toThrow(/exceeding its stated value/);
  });
});

describe('normalizeHierarchy — remainder surfacing (never silent)', () => {
  it('does NOT inject a remainder child by default', () => {
    const root = normalizeHierarchy(portfolio);
    expect(root.children.some(c => c.isRemainder)).toBe(false);
    expect(wlf(root).children.some(c => c.isRemainder)).toBe(false);
    expect(wlf(root).children).toHaveLength(6);
  });

  it('injects a remainder child for a node that sets remainderLabel', () => {
    const root = normalizeHierarchy({
      label: 'World Liberty Financial',
      value: 536.4,
      remainderLabel: 'Other / not disclosed',
      children: [{ label: 'Ethereum Key', value: 106 }, { label: 'USDC Key', value: 56 }],
    });
    const rem = root.children.find(c => c.isRemainder);
    expect(rem).toBeDefined();
    expect(rem.label).toBe('Other / not disclosed');
    expect(rem.value).toBeCloseTo(374.4, 6);   // 536.4 − (106 + 56)
    expect(rem.remainder).toBe(0);
    // Children now sum to the parent's authoritative value.
    const sum = root.children.reduce((s, c) => s + c.value, 0);
    expect(sum).toBeCloseTo(536.4, 6);
  });

  it('surfaces remainders globally with showRemainder, using the fallback label', () => {
    const root = normalizeHierarchy(portfolio, { showRemainder: true });
    const rootRem = root.children.find(c => c.isRemainder);
    expect(rootRem).toBeDefined();
    expect(rootRem.label).toBe('Other');
    expect(rootRem.value).toBeCloseTo(22.4, 6);
    expect(wlf(root).children.find(c => c.isRemainder)?.value).toBeCloseTo(293.2, 6);
  });

  it('honours a custom fallback remainderLabel', () => {
    const root = normalizeHierarchy(portfolio, { showRemainder: true, remainderLabel: 'Undisclosed' });
    expect(root.children.find(c => c.isRemainder).label).toBe('Undisclosed');
  });

  it('does not surface a remainder of zero', () => {
    const root = normalizeHierarchy({
      label: 'Exact',
      value: 10,
      remainderLabel: 'Other',
      children: [{ label: 'A', value: 6 }, { label: 'B', value: 4 }],
    });
    expect(root.children.some(c => c.isRemainder)).toBe(false);
  });
});

describe('normalizeHierarchy — numeric domain (value > 0)', () => {
  it('keeps only positive-valued leaves; drops 0, negative, and non-finite', () => {
    const root = normalizeHierarchy({
      label: 'Mixed',
      value: 100,
      children: [
        { label: 'Good',    value: 40 },
        { label: 'Zero',    value: 0 },
        { label: 'Neg',     value: -5 },
        { label: 'NaN',     value: 'x' },
        { label: 'NoValue' },
      ],
    });
    expect(root.children.map(c => c.label)).toEqual(['Good']);
  });

  it('keeps an explicit null leaf as a missing placeholder, excluded from sums', () => {
    const root = normalizeHierarchy(portfolio);
    const cic = root.children.find(c => c.label.startsWith('License agreement with CIC'));
    expect(cic).toBeDefined();
    expect(cic.value).toBeNull();
    expect(cic.missing).toBe(true);
    // Two missing placeholders present, and they did not lower the remainder.
    expect(root.children.filter(c => c.missing)).toHaveLength(2);
    expect(root.value).toBe(1400);
    expect(root.remainder).toBeCloseTo(22.4, 6);
  });
});

describe('normalizeHierarchy — labels', () => {
  it('drops nodes with a blank or whitespace label', () => {
    const root = normalizeHierarchy({
      label: 'Root',
      value: 30,
      children: [
        { label: 'Kept',  value: 10 },
        { label: '   ',   value: 10 },
        { label: '',      value: 10 },
      ],
    });
    expect(root.children.map(c => c.label)).toEqual(['Kept']);
  });

  it('returns null for a non-object or blank-label root', () => {
    expect(normalizeHierarchy(null)).toBeNull();
    expect(normalizeHierarchy(42)).toBeNull();
    expect(normalizeHierarchy({ label: '  ', value: 5 })).toBeNull();
  });
});

describe('normalizeHierarchy — color atom', () => {
  it('hoists an authored color onto the node; leaves it undefined otherwise', () => {
    const root = normalizeHierarchy({
      label: 'Root',
      children: [
        { label: 'Tinted', value: 10, color: '#ff8800' },
        { label: 'Plain',  value: 10 },
      ],
    });
    expect(root.children[0].color).toBe('#ff8800');
    expect(root.children[1].color).toBeUndefined();
  });
});

describe('normalizeHierarchy — ids', () => {
  it('keeps a childless parent value as a leaf (empty children array)', () => {
    const root = normalizeHierarchy({ label: 'Leafish', value: 5, children: [] });
    expect(root.value).toBe(5);
    expect(root.children).toHaveLength(0);
  });

  it('builds the root id from its bare label and carries ancestry downward', () => {
    const root = normalizeHierarchy(portfolio);
    expect(root.id).toBe('Trump crypto businesses');
    const w = wlf(root);
    expect(w.id).toContain('Trump crypto businesses');
    expect(w.id).toContain('World Liberty Financial');
    expect(w.id).not.toBe(w.label);
  });

  it('gives identical sibling SUBTREES distinct ids all the way down', () => {
    const root = normalizeHierarchy({
      label: 'Root',
      value: 40,
      children: [
        { label: 'Branch', value: 10, children: [{ label: 'Leaf', value: 10 }] },
        { label: 'Branch', value: 20, children: [{ label: 'Leaf', value: 20 }] },
      ],
    });
    const [a, b] = root.children;
    expect(a.id).not.toBe(b.id);                       // parents disambiguated…
    expect(a.children[0].id).not.toBe(b.children[0].id); // …and so are the grandchildren
  });

  it('does not let a real "Other" node collide with a synthetic remainder', () => {
    const root = normalizeHierarchy({
      label: 'Root',
      value: 100,
      remainderLabel: 'Other',
      children: [
        { label: 'Other', value: 30 },   // a real node literally labelled "Other"
        { label: 'B',     value: 20 },
      ],
    });
    const real = root.children.find(c => c.label === 'Other' && !c.isRemainder);
    const rem  = root.children.find(c => c.isRemainder);
    expect(real).toBeDefined();
    expect(rem).toBeDefined();
    expect(rem.label).toBe('Other');
    expect(real.id).not.toBe(rem.id);
  });
});

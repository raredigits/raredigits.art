import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// RC-045: every task or audit ID a RareCharts file cites resolves in
// assets/charts/docs/DECISIONS.md — §14's index, or the section that holds
// it. The internal notes that once explained them are gone (RC-048), so a
// comment that says "(K-09)" must be readable without them. The scan is §14's
// own: the families with a hyphen (`RC-NNN`, `C-NN`, `K-NN` …, and the Rare
// Styles `CSS-NNN` cited by the tests that share test/); the families without
// one (`A1`, `N1`, `D5` …) clash with data labels and are kept by hand.

const FILES = [
  'assets/charts/src', 'assets/charts/rare-charts.css', 'assets/charts/CHANGELOG.md',
  'assets/charts/README.md', 'charts', 'test', 'scripts/build-charts.mjs',
  '.github/workflows/sync-charts.yml', 'assets/css/rare-website.css',
];
const ID = /\b(?:RC-\d{3}|[BCDKORSTXQ]-\d{2}|CSS-\d{3}[a-z]?)\b/g;

describe('RC-045: the audit ID index stays complete', () => {
  it('every ID cited in code, tests, CSS and docs is named in DECISIONS.md', () => {
    const decisions = readFileSync('assets/charts/docs/DECISIONS.md', 'utf8');
    const named = new Set(decisions.match(ID));
    const files = execSync(`git ls-files ${FILES.join(' ')}`).toString().trim().split('\n')
      .filter(f => existsSync(f) && f !== 'test/decisions-index.test.js');
    const missing = new Map();
    for (const f of files) {
      for (const id of new Set(readFileSync(f, 'utf8').match(ID))) {
        if (!named.has(id) && !missing.has(id)) missing.set(id, f);
      }
    }
    expect([...missing].map(([id, f]) => `${id} (${f})`)).toEqual([]);
  });
});

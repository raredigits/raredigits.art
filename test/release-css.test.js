// Release tooling (CSS-348): version consistency, clean staging and the CDN
// byte check. The CDN is faked here; the real jsDelivr comparison runs in the
// release workflow after publishing.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, cpSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, stage, verifyCdn, verifyTree, RELEASE_FILES } from '../scripts/release-css.mjs';

describe('CSS-348: release check', () => {
  it('versions.js, package.json and the changelog agree', () => {
    const { errors } = check();
    expect(errors).toEqual([]);
  });
});

describe('CSS-348: staging', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rare-styles-'));
  const { manifest, problems } = stage(dir);

  it('ships only the release set, with a manifest', () => {
    expect(problems).toEqual([]);
    const top = new Set(Object.keys(manifest.files).map((f) => f.split('/')[0]));
    expect([...top].sort()).toEqual(['docs', 'fonts', 'images', 'modules', 'rare.css', 'rare.css.map',
      'rare.min.css', 'rare.min.css.map', 'rare.scss', 'vendor']);
    const docs = RELEASE_FILES.filter((f) => f.startsWith('docs/'));
    const shippedDocs = Object.keys(manifest.files).filter((f) => f.startsWith('docs/'));
    expect(shippedDocs.every((f) => docs.some((d) => f === d || f.startsWith(`${d}/`)))).toBe(true);
    expect(docs.every((d) => shippedDocs.some((f) => f === d || f.startsWith(`${d}/`)))).toBe(true);
    expect(shippedDocs).toContain('docs/api/v0.6.19.json');
    expect(existsSync(join(dir, 'rare-website.css'))).toBe(false);
    expect(existsSync(join(dir, 'examples'))).toBe(false);
  });

  it('the staged CSS is the committed CSS, byte for byte', () => {
    expect(readFileSync(join(dir, 'rare.min.css'))).toEqual(readFileSync('assets/css/rare.min.css'));
    expect(manifest.files['rare.min.css'].bytes).toBe(readFileSync('assets/css/rare.min.css').length);
  });

  it('CDN check passes on identical bytes and reports differences', async () => {
    const serve = (mutate) => async (url) => {
      const f = url.replace(/^https:\/\/cdn\.jsdelivr\.net\/gh\/raredigits\/rare-styles@[^/]+\//, '');
      let buf = readFileSync(join(dir, f));
      if (mutate && f === 'rare.min.css') buf = Buffer.concat([buf, Buffer.from(' ')]);
      return { ok: true, arrayBuffer: async () => buf };
    };
    const good = await verifyCdn(dir, { attempts: 1, fetchImpl: serve(false) });
    expect(good.mismatched).toEqual([]);
    expect(good.checked).toContain('rare.min.css');
    const bad = await verifyCdn(dir, { attempts: 2, waitMs: 1, fetchImpl: serve(true) });
    expect(bad.mismatched).toEqual(['rare.min.css']);
  });

  it('verifyTree accepts an exact published tree and rejects any drift', () => {
    const tree = mkdtempSync(join(tmpdir(), 'rare-styles-tree-'));
    cpSync(dir, tree, { recursive: true });
    writeFileSync(join(tree, 'LICENSE'), 'MIT');          // repository-only files are ignored
    mkdirSync(join(tree, '.git'));
    writeFileSync(join(tree, '.git', 'HEAD'), 'ref');
    expect(verifyTree(dir, tree).problems).toEqual([]);

    writeFileSync(join(tree, 'rare.min.css'), 'changed');
    writeFileSync(join(tree, 'stray.css'), 'x');
    rmSync(join(tree, 'rare.css.map'));
    expect(verifyTree(dir, tree).problems.sort()).toEqual(['differs rare.min.css', 'extra stray.css', 'missing rare.css.map']);
  });
});


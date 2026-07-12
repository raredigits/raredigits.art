// Rare Scripts contract tests (v0.6.17, SCRIPTS_CONTRACT.md).
// Each test evals the real script source inside its own JSDOM window, so
// listeners never leak between tests. Covers: rd-js-* hooks, rd-is-* state,
// baseline ARIA, guards, and the per-script behaviors the contract promises.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const src = (f) => readFileSync(resolve(process.cwd(), 'assets/js', f), 'utf8');
const SCRIPTS = {
  collapsible: src('collapsible.js'),
  hamburger: src('hamburger.js'),
  cookie: src('cookie-consent.js'),
  search: src('search.js'),
  copy: src('copy-to-clipboard.js'),
  carousel: src('carousel.js'),
};

function page(html, { url = 'http://localhost/' } = {}) {
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url,
    runScripts: 'outside-only',
  });
}

// Eval the script in the window, then fire DOMContentLoaded for the scripts
// that wait for it (harmless for the ones that initialized immediately).
function boot(dom, script) {
  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('collapsible.js', () => {
  const TRIGGER = '<button class="collapsible-trigger rd-js-collapsible" aria-controls="c1">Trigger</button>';
  const CONTENT = '<div id="c1" class="collapsible-content rd-js-collapsible-content">Content</div>';

  it('canonical aria-controls structure toggles rd-is-open and mirrors aria-expanded', () => {
    const dom = page(TRIGGER + CONTENT);
    boot(dom, SCRIPTS.collapsible);
    const doc = dom.window.document;
    const t = doc.querySelector('.rd-js-collapsible');
    const c = doc.getElementById('c1');

    expect(t.getAttribute('aria-expanded')).toBe('false');
    t.click();
    expect(c.classList.contains('rd-is-open')).toBe(true);
    expect(t.getAttribute('aria-expanded')).toBe('true');
    t.click();
    expect(c.classList.contains('rd-is-open')).toBe(false);
    expect(t.getAttribute('aria-expanded')).toBe('false');
  });

  it('resolves content as the trigger’s next sibling (structure 1)', () => {
    const dom = page(
      '<div><span class="rd-js-collapsible">T</span><div class="rd-js-collapsible-content">C</div></div>'
    );
    boot(dom, SCRIPTS.collapsible);
    const t = dom.window.document.querySelector('.rd-js-collapsible');
    t.click();
    expect(dom.window.document.querySelector('.rd-js-collapsible-content').classList.contains('rd-is-open')).toBe(true);
  });

  it('resolves content as the trigger’s parent’s next sibling (structure 2)', () => {
    const dom = page(
      '<div><p><span class="rd-js-collapsible">T</span></p><div class="rd-js-collapsible-content">C</div></div>'
    );
    boot(dom, SCRIPTS.collapsible);
    dom.window.document.querySelector('.rd-js-collapsible').click();
    expect(dom.window.document.querySelector('.rd-js-collapsible-content').classList.contains('rd-is-open')).toBe(true);
  });

  it('backfills aria-controls from the content id when resolved structurally', () => {
    const dom = page(
      '<span class="rd-js-collapsible">T</span><div id="found" class="rd-js-collapsible-content">C</div>'
    );
    boot(dom, SCRIPTS.collapsible);
    expect(dom.window.document.querySelector('.rd-js-collapsible').getAttribute('aria-controls')).toBe('found');
  });

  it('gives non-button triggers tabindex/role and toggles on Enter and Space', () => {
    const dom = page(
      '<span class="rd-js-collapsible">T</span><div class="rd-js-collapsible-content">C</div>'
    );
    boot(dom, SCRIPTS.collapsible);
    const doc = dom.window.document;
    const t = doc.querySelector('.rd-js-collapsible');
    const c = doc.querySelector('.rd-js-collapsible-content');

    expect(t.getAttribute('tabindex')).toBe('0');
    expect(t.getAttribute('role')).toBe('button');

    t.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(c.classList.contains('rd-is-open')).toBe(true);
    t.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(c.classList.contains('rd-is-open')).toBe(false);
  });

  it('does not decorate native button triggers with tabindex/role', () => {
    const dom = page(TRIGGER + CONTENT);
    boot(dom, SCRIPTS.collapsible);
    const t = dom.window.document.querySelector('.rd-js-collapsible');
    expect(t.hasAttribute('tabindex')).toBe(false);
    expect(t.hasAttribute('role')).toBe(false);
  });

  it('initializes aria-expanded="true" for authored-open content', () => {
    const dom = page(
      '<span class="rd-js-collapsible">T</span><div class="rd-js-collapsible-content rd-is-open">C</div>'
    );
    boot(dom, SCRIPTS.collapsible);
    expect(dom.window.document.querySelector('.rd-js-collapsible').getAttribute('aria-expanded')).toBe('true');
  });

  it('safely ignores a trigger with no resolvable content', () => {
    const dom = page('<span class="rd-js-collapsible">orphan</span>');
    expect(() => boot(dom, SCRIPTS.collapsible)).not.toThrow();
    const t = dom.window.document.querySelector('.rd-js-collapsible');
    expect(t.hasAttribute('aria-expanded')).toBe(false);
    expect(() => t.click()).not.toThrow();
  });
});

describe('hamburger.js', () => {
  const MARKUP =
    '<button class="hamburger rd-js-hamburger">☰</button>' +
    '<nav id="nav-hamburger" class="nav-hamburger rd-js-hamburger-nav"><a href="/">x</a></nav>' +
    '<main><p id="outside">content</p></main>';

  it('toggles rd-is-active on trigger and panel and mirrors aria-expanded', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.hamburger);
    const doc = dom.window.document;
    const h = doc.querySelector('.rd-js-hamburger');
    const nav = doc.querySelector('.rd-js-hamburger-nav');

    expect(h.getAttribute('aria-expanded')).toBe('false');
    h.click();
    expect(h.classList.contains('rd-is-active')).toBe(true);
    expect(nav.classList.contains('rd-is-active')).toBe(true);
    expect(h.getAttribute('aria-expanded')).toBe('true');
    h.click();
    expect(nav.classList.contains('rd-is-active')).toBe(false);
    expect(h.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets aria-controls from the panel id', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.hamburger);
    expect(dom.window.document.querySelector('.rd-js-hamburger').getAttribute('aria-controls')).toBe('nav-hamburger');
  });

  it('closes on outside click and on Escape', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.hamburger);
    const doc = dom.window.document;
    const h = doc.querySelector('.rd-js-hamburger');
    const nav = doc.querySelector('.rd-js-hamburger-nav');

    h.click();
    doc.getElementById('outside').click();
    expect(nav.classList.contains('rd-is-active')).toBe(false);

    h.click();
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(nav.classList.contains('rd-is-active')).toBe(false);
    expect(h.getAttribute('aria-expanded')).toBe('false');
  });

  it('does nothing (and does not throw) on pages without the hooks', () => {
    const dom = page('<p>no hamburger here</p>');
    expect(() => boot(dom, SCRIPTS.hamburger)).not.toThrow();
  });
});

describe('cookie-consent.js', () => {
  const MARKUP =
    '<div class="cookie-notice rd-js-cookie-consent">' +
    '<button class="rd-js-cookie-accept">OK</button>' +
    '</div>';

  it('leaves the notice visible for a first-time visitor', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.cookie);
    expect(dom.window.document.querySelector('.rd-js-cookie-consent').classList.contains('rd-is-hidden')).toBe(false);
  });

  it('hides the notice and sets the cookie on accept', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.cookie);
    const doc = dom.window.document;
    doc.querySelector('.rd-js-cookie-accept').click();
    expect(doc.querySelector('.rd-js-cookie-consent').classList.contains('rd-is-hidden')).toBe(true);
    expect(doc.cookie).toContain('cookie-notice-dismissed=true');
  });

  it('hides the notice immediately (pre-DOMContentLoaded) for a returning visitor', () => {
    const dom = page(MARKUP);
    dom.window.document.cookie = 'cookie-notice-dismissed=true';
    // eval only — no DOMContentLoaded: the anti-FOUC path must not need it
    dom.window.eval(SCRIPTS.cookie);
    expect(dom.window.document.querySelector('.rd-js-cookie-consent').classList.contains('rd-is-hidden')).toBe(true);
  });

  it('does nothing (and does not throw) without the markup', () => {
    const dom = page('<p>no notice</p>');
    expect(() => boot(dom, SCRIPTS.cookie)).not.toThrow();
  });
});

describe('search.js', () => {
  const MARKUP =
    '<button class="icon-search rd-js-search">s</button>' +
    '<div id="searchbar" class="searchbar rd-js-search-bar"><div id="search" class="rd-js-search-ui"></div></div>';

  it('opens with rd-is-open + aria-expanded, sets aria-controls, closes on Escape', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.search);
    const doc = dom.window.document;
    const btn = doc.querySelector('.rd-js-search');
    const bar = doc.querySelector('.rd-js-search-bar');

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toBe('searchbar');

    btn.click();
    expect(bar.classList.contains('rd-is-open')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(bar.classList.contains('rd-is-open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles closed on a second click', () => {
    const dom = page(MARKUP);
    boot(dom, SCRIPTS.search);
    const btn = dom.window.document.querySelector('.rd-js-search');
    const bar = dom.window.document.querySelector('.rd-js-search-bar');
    btn.click();
    btn.click();
    expect(bar.classList.contains('rd-is-open')).toBe(false);
  });

  it('bails out on the dedicated search page (body.page-search)', () => {
    const dom = page(MARKUP);
    dom.window.document.body.classList.add('page-search');
    boot(dom, SCRIPTS.search);
    expect(dom.window.document.querySelector('.rd-js-search').hasAttribute('aria-expanded')).toBe(false);
  });

  it('does nothing (and does not throw) without the hooks', () => {
    const dom = page('<p>no search</p>');
    expect(() => boot(dom, SCRIPTS.search)).not.toThrow();
  });
});

describe('copy-to-clipboard.js', () => {
  function mockClipboard(dom) {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    return writeText;
  }

  it('copies from data-copy-target and flips data-icon to the success glyph', async () => {
    const dom = page(
      '<code id="snippet">npm i rare-styles</code>' +
      '<button class="copy-data-icon rd-js-copy" data-icon="content_copy" data-copy-target="#snippet"></button>'
    );
    const writeText = mockClipboard(dom);
    boot(dom, SCRIPTS.copy);
    const icon = dom.window.document.querySelector('.rd-js-copy');

    icon.click();
    await tick();

    expect(writeText).toHaveBeenCalledWith('npm i rare-styles');
    expect(icon.dataset.icon).toBe('check');
    expect(icon.dataset.copyBusy).toBe('1');
  });

  it('copies the href of the nearest [data-copy] link', async () => {
    const dom = page(
      '<span><a href="https://cdn.example/x.js" data-copy>link</a>' +
      '<button class="rd-js-copy" data-icon="content_copy"></button></span>'
    );
    const writeText = mockClipboard(dom);
    boot(dom, SCRIPTS.copy);

    dom.window.document.querySelector('.rd-js-copy').click();
    await tick();

    expect(writeText).toHaveBeenCalledWith('https://cdn.example/x.js');
  });

  it('ignores clicks with nothing to copy and elements without the hook', async () => {
    const dom = page(
      '<button class="rd-js-copy" data-icon="content_copy"></button><p id="plain">text</p>'
    );
    const writeText = mockClipboard(dom);
    boot(dom, SCRIPTS.copy);

    dom.window.document.getElementById('plain').click();
    dom.window.document.querySelector('.rd-js-copy').click(); // no data-copy anywhere
    await tick();

    expect(writeText).not.toHaveBeenCalled();
    expect(dom.window.document.querySelector('.rd-js-copy').dataset.icon).toBe('content_copy');
  });

  it('re-entry is blocked while the success state is showing (data-copy-busy)', async () => {
    const dom = page(
      '<code id="s">x</code>' +
      '<button class="rd-js-copy" data-icon="content_copy" data-copy-target="#s"></button>'
    );
    const writeText = mockClipboard(dom);
    boot(dom, SCRIPTS.copy);
    const icon = dom.window.document.querySelector('.rd-js-copy');

    icon.click();
    await tick();
    icon.click(); // busy — must not copy again
    await tick();

    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

describe('carousel.js', () => {
  const slide = (n, active) =>
    `<figure class="carousel-slide${active ? ' rd-is-active' : ''}">` +
    `<img src="/i/${n}.jpg" alt="${n}"><figcaption class="carousel-caption">cap ${n}</figcaption></figure>`;

  const carousel = (n, { id = '' } = {}) =>
    `<div class="carousel rd-js-carousel"${id ? ` id="${id}"` : ''}>` +
    `<div class="carousel-track rd-js-carousel-track">${Array.from({ length: n }, (_, i) => slide(i + 1, i === 0)).join('')}</div>` +
    '<button class="rd-js-carousel-prev" aria-label="prev"></button>' +
    '<button class="rd-js-carousel-next" aria-label="next"></button>' +
    '<div class="carousel-dots rd-js-carousel-dots"></div>' +
    '</div>';

  const active = (root) => {
    const slides = [...root.querySelectorAll('.carousel-slide')];
    return slides.findIndex((s) => s.classList.contains('rd-is-active'));
  };

  it('advances and wraps around with the next arrow', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const doc = dom.window.document;
    const root = doc.querySelector('.rd-js-carousel');
    const next = doc.querySelector('.rd-js-carousel-next');

    expect(active(root)).toBe(0);
    next.click(); expect(active(root)).toBe(1);
    next.click(); expect(active(root)).toBe(2);
    next.click(); expect(active(root)).toBe(0); // wrap
  });

  it('wraps backwards with the prev arrow', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const doc = dom.window.document;
    doc.querySelector('.rd-js-carousel-prev').click();
    expect(active(doc.querySelector('.rd-js-carousel'))).toBe(2);
  });

  it('builds one dot per slide and reflects the active one', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const doc = dom.window.document;
    const dots = doc.querySelectorAll('.rd-js-carousel-dots .carousel-dot');
    expect(dots.length).toBe(3);
    expect(dots[0].classList.contains('rd-is-active')).toBe(true);

    doc.querySelector('.rd-js-carousel-next').click();
    expect(dots[0].classList.contains('rd-is-active')).toBe(false);
    expect(dots[1].classList.contains('rd-is-active')).toBe(true);
    expect(dots[1].getAttribute('aria-current')).toBe('true');
  });

  it('a dot click jumps to its slide', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const doc = dom.window.document;
    doc.querySelectorAll('.carousel-dot')[2].click();
    expect(active(doc.querySelector('.rd-js-carousel'))).toBe(2);
  });

  it('arrow keys move between slides', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const doc = dom.window.document;
    const root = doc.querySelector('.rd-js-carousel');
    root.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(active(root)).toBe(1);
    root.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(active(root)).toBe(0);
  });

  it('sets carousel ARIA and hides inactive slides', () => {
    const dom = page(carousel(3));
    boot(dom, SCRIPTS.carousel);
    const root = dom.window.document.querySelector('.rd-js-carousel');
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = root.querySelectorAll('.carousel-slide');
    expect(slides[0].getAttribute('aria-hidden')).toBe('false');
    expect(slides[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('two carousels on one page are independent (the harvested bug)', () => {
    const dom = page(carousel(3) + carousel(2));
    boot(dom, SCRIPTS.carousel);
    const [a, b] = dom.window.document.querySelectorAll('.rd-js-carousel');
    // advancing the first must not move the second
    a.querySelector('.rd-js-carousel-next').click();
    expect(active(a)).toBe(1);
    expect(active(b)).toBe(0);
    // each built its own dot set
    expect(a.querySelectorAll('.carousel-dot').length).toBe(3);
    expect(b.querySelectorAll('.carousel-dot').length).toBe(2);
  });

  it('a single-slide carousel builds no dots and hides the arrows', () => {
    const dom = page(carousel(1));
    boot(dom, SCRIPTS.carousel);
    const root = dom.window.document.querySelector('.rd-js-carousel');
    expect(root.querySelectorAll('.carousel-dot').length).toBe(0);
    expect(root.querySelector('.rd-js-carousel-prev').hidden).toBe(true);
    expect(root.querySelector('.rd-js-carousel-next').hidden).toBe(true);
  });

  it('does nothing (and does not throw) without a track', () => {
    const dom = page('<div class="rd-js-carousel"></div>');
    expect(() => boot(dom, SCRIPTS.carousel)).not.toThrow();
  });
});

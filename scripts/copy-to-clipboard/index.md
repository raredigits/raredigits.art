---
layout: page.njk
title: "Copy to Clipboard"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/copy-to-clipboard/'
---

<div class="meta-info">
    <p>js/copy-to-clipboard.js</p>
    <p>v3.1.0 Stable |
    <a class="copy-source" href="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v3.1.0/copy-to-clipboard/copy-to-clipboard.min.js" data-copy>CDN</a> (minified)
    <button class="copy-data-icon rd-js-copy"></button> |
    <a href="/assets/js/copy-to-clipboard.js">Download</a>
    <span class="material-symbols-outlined">download</span>
    </p>
</div>

This is a small utility that adds a “copy” <span class="material-symbols-outlined">content_copy</span> icon next to things people actually want to copy. Links. Addresses. Code snippets. Anything.

Click the icon, the data goes to the clipboard, the icon briefly turns into a checkmark, everyone is happy and moves on.

The script doesn’t care about your layout, your CSS philosophy, or how deeply nested your markup is. It follows one simple rule: either you explicitly tell it what to copy, or you place it next to something marked as copyable.

That’s the whole contract:

- The script hooks clicks via the `rd-js-copy` class; `copy-data-icon` stays as the presentational class (hooks are never styled).
- The copy glyph is baked into the CSS (`content_copy`), so **your markup needs no `data-icon`** — just `<button class="copy-data-icon rd-js-copy"></button>`. The script only sets `data-icon="check"` on success, then removes it.
- The button needs no `title` either: the script labels bare icon-only buttons with `aria-label="Copy"` for screen readers (any name you provide is kept).
- If the icon has `data-copy-target`, the script copies text from that element.
- If not, it looks for the nearest element marked with `data-copy`.
- If that element is a link, it copies the URL. Otherwise, it copies the text content.

No duplicated data. No hard-coded containers. No assumptions about structure.
It works the same way on documentation sites, dashboards, crypto wallets, and boring corporate pages.

This is intentional. The script stays dumb. The HTML stays expressive.

## Basic usage

**Copy a link (URL, not label)**

```html
<a href="https://cdn.jsdelivr.net/script.min.js" data-copy>Copy Link</a>
<button class="copy-data-icon rd-js-copy"></button>
```

Clicking the icon copies the full CDN URL.

Check it out: <a href="https://cdn.jsdelivr.net/script.min.js" data-copy>Copy Link</a> <button class="copy-data-icon rd-js-copy"></button>

<div class="air-md"></div>

**Copy plain text (addresses, hashes, IDs)**

```html
<span data-copy>0x9f1b...cA11</span>
<button class="copy-data-icon rd-js-copy"></button>
```

Works exactly like wallet address copy buttons. Because that’s what it is.

<div class="air-md"></div>

**Copy code from a block**

Use the `.code-block` wrapper and a `button` with the `copy-data-icon rd-js-copy` classes to create a classic code block with a copy button:

```html
<div class="code-block">
    <button class="copy-data-icon rd-js-copy"></button>
</div>
```

To get a result like this:

<div class="code-block text-content-width">
    <pre><code id="snippet-1">npm i rare-scripts
<span class="code-comment"># or</span>
pnpm add rare-scripts</code></pre>
    <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-1"></button>
</div>

Use `data-copy-target` when proximity is not enough or would be ambiguous.

## JavaScript

Include once per page:

<div class="code-block">
{% raw %}
<pre><code id="snippet-2" class="language-js">const ICON_SUCCESS = "check";
const RESET_MS = 1200;

function getCopyText(icon) {
  if (icon.dataset.copyTarget) {
    const target = document.querySelector(icon.dataset.copyTarget);
    return target?.textContent?.trim() || "";
  }

  const source =
    icon.closest("[data-copy]") ||
    icon.parentElement?.querySelector("[data-copy]");

  if (!source) return "";
  return source.getAttribute("href") || source.textContent.trim();
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

document.addEventListener("click", async (e) => {
  const icon = e.target.closest(".rd-js-copy");
  if (!icon) return;

  if (icon.dataset.copyBusy) return;

  const text = getCopyText(icon);
  if (!text) return;

  icon.dataset.copyBusy = "1";

  const showSuccess = () => {
    icon.dataset.icon = ICON_SUCCESS;
    clearTimeout(icon._copyTimer);
    icon._copyTimer = setTimeout(() => {
      delete icon.dataset.icon;
      delete icon.dataset.copyBusy;
    }, RESET_MS);
  };

  try {
    await navigator.clipboard.writeText(text);
    showSuccess();
  } catch {
    if (fallbackCopy(text)) showSuccess();
    else delete icon.dataset.copyBusy;
  }
});

// Icon-only buttons render just a CSS glyph, so give any bare .rd-js-copy an
// accessible name (author-provided aria-label / title / text is respected).
function labelCopyIcons() {
  document.querySelectorAll(".rd-js-copy").forEach((icon) => {
    if (!icon.getAttribute("aria-label") && !icon.getAttribute("title") && !icon.textContent.trim()) {
      icon.setAttribute("aria-label", "Copy");
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", labelCopyIcons);
} else {
  labelCopyIcons();
}</code></pre>
{% endraw %}
  <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-2"></button>
</div>

## Including the script

Don’t forget to actually include the script on the page.
Icons don’t copy things by positive thinking alone.

You can either host the file locally or load it from a CDN. Both options work the same way.

{%- capture includeSnippet -%}
// Local file:
<script src="/js/copy-to-clipboard.min.js"></script>

// CDN:
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v3.1.0/copy-to-clipboard/copy-to-clipboard.min.js"></script>
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-3">{{ includeSnippet | escape }}</code></pre>
  <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-3"></button>
</div>

{% include "special/self-host-notice.njk" %}

Include it once per page, preferably near the end of the document or with defer.

## Styling

Make it feel clickable, not decorative:

{%- capture cssSnippet -%}
.copy-data-icon {
    display: inline-block;
    font-family: "Material Symbols Outlined";
    position: relative;
    top: 0.2em;
    font-size: inherit;
    line-height: inherit;
    background: none;
    color: var(--copy-icon-color, var(--text-color-light));
    border: none;
    padding: 0;
    cursor: pointer;
}

.copy-data-icon::before {
    content: "content_copy"; /* default glyph — markup needs no data-icon */
}

.copy-data-icon[data-icon]::before {
    content: attr(data-icon); /* the script sets data-icon="check" on success */
}

.copy-data-icon:hover {
    color: var(--copy-icon-color-hover, var(--primary-color));
    background: none;
    border: none;
}

/* Optional: inverted icon for dark surfaces (put on the icon or any ancestor) */
.copy-data-icon-inverted {
    --copy-icon-color: #fafafa;
    --copy-icon-color-hover: #ccc;
}
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-4">{{ cssSnippet | escape | replace: '\n', '&#10;' }}</code></pre>
  <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-4"></button>
</div>

### Recoloring

The copy icon defaults to a muted gray (`--text-color-light`), which can fade into some surfaces or clash with a brand. Both of its colors are exposed as component tokens — `--copy-icon-color` and `--copy-icon-color-hover` — so any container (or a single icon) can override them without fighting the selector. Set the token on whatever wraps the icon (here, a code block — its copy button is already pinned top-right by `.code-block`):

{%- capture recolorSnippet -%}
<!-- recolor every copy icon inside this block -->
<div class="code-block" style="--copy-icon-color: var(--red);">
  <pre><code data-copy>0x9f1b...cA11</code></pre>
  <button class="copy-data-icon rd-js-copy"></button>
</div>
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-5" class="language-html">{{ recolorSnippet | strip | escape }}</code></pre>
  <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-5"></button>
</div>

Live — the exact snippet above, rendered. The icon is red via the token; its top-right position comes from `.code-block` itself, so there is nothing extra to position:

<div class="code-block" style="--copy-icon-color: var(--red);">
  <pre><code data-copy>0x9f1b...cA11</code></pre>
  <button class="copy-data-icon rd-js-copy"></button>
</div>

**Shortcut for dark surfaces.** The most common recolor — a light icon so it stays visible on a dark background — ships as a ready-made class, `.copy-data-icon-inverted`. It just sets the two tokens (`--gray-lightest` / `--gray`), so put it on the icon or any ancestor instead of writing the inline style:

```html
<!-- on the icon -->
<button class="copy-data-icon rd-js-copy copy-data-icon-inverted"></button>

<!-- or on a container, to invert every copy icon inside -->
<div class="dark-panel copy-data-icon-inverted"> … </div>
```

Live — the inverted icon on a dark panel (light glyph, still visible), next to the default one for contrast:

<div class="card copy-data-icon-inverted" style="background: #222; color: #eee; padding: var(--space-md);">
    <span data-copy>0x9f1b...cA11</span>
    <button class="copy-data-icon rd-js-copy"></button>
</div>

Design principles (why this won’t rot):

- The script does not depend on layout.
- HTML owns the meaning. JavaScript only moves data.
- No duplicated content in attributes.
- Works with links, text, code, addresses.
- Scales from one icon to hundreds without extra listeners.

If an element should be copied, mark it with `data-copy`.<br>
If the icon should copy something specific, tell it where with `data-copy-target`.

Everything else is none of the script’s business.

<a id="changelog"></a>

## Changelog
### v3.1.0

- `data-icon` is now **optional**: the default `content_copy` glyph is baked into `.copy-data-icon` in CSS, and the script removes `data-icon` on reset instead of writing it back. Markup drops to `<button class="copy-data-icon rd-js-copy"></button>`. Backward compatible — existing `data-icon="content_copy"` markup still works.
- The script now gives icon-only copy buttons an accessible name (`aria-label="Copy"`) if they have none, so markup needs no `title` either. Author-provided `aria-label` / `title` is respected.
- Added the `.copy-data-icon-inverted` helper class (light icon for dark surfaces) — put it on the icon or any ancestor instead of inlining the recolor tokens.

### v3.0.0

- **Breaking:** click hook moved to the `rd-js` contract — the script listens for `.rd-js-copy`; `.copy-data-icon` is presentational only and no longer read by the script
- Payload API unchanged: `data-copy`, `data-copy-target`, `data-icon` all work as before
- Icon colors are tokenized: `--copy-icon-color` / `--copy-icon-color-hover` override the defaults per container or per icon (CSS-only change, shipped with Rare Styles `v0.6.17`)

### v2.0.0

- Changed required selector to `.copy-data-icon`, legacy markup no longer supported
- Updated CSS to render icons via: `: before` with `content: attr (data-icon)`
- Replaced Material Icons `<span>` integration with a generic `<button>` element
- Introduced `data-icon` attribute for icon state control instead of inner text
- Improved clipboard API handling; deprecated fallback kept as backup

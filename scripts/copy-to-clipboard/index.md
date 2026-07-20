---
layout: page.njk
title: "Copy to Clipboard"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/copy-to-clipboard/'
---

<div class="meta-info">
    <p>js/copy-to-clipboard.js</p>
    <p>v3.2.0 Stable |
    <a class="copy-source" href="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v3.2.0/copy-to-clipboard/copy-to-clipboard.min.js" data-copy>CDN</a> (minified)
    <button class="copy-data-icon rd-js-copy"></button> |
    <a href="/assets/js/copy-to-clipboard.js">Download</a>
    <span class="rd-icon-download"></span>
    </p>
</div>

This is a small utility that adds a “copy” <span class="rd-icon-content_copy"></span> icon next to things people actually want to copy. Links. Addresses. Code snippets. Anything.

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

<div class="air-md"></div>

**Copy a literal — no payload on the page**

Sometimes the thing to copy is not written anywhere: you want the snippet that *would* produce what the reader is looking at. `data-copy-text` carries it literally, so nothing has to exist in the DOM to be copied from:

```html
<button class="rd-icon-download rd-js-copy"
        data-copy-text='<span class="rd-icon-download"></span>'></button>
```

That is what the glyph grids on [the icons page](/styles/icons/) do — every tile is a `<button>` that hands you its own markup.

Prefer it over `data-copy` whenever many hooks share one parent: the `[data-copy]` lookup scans the parent’s subtree and takes the **first** match, so in a flat grid every hook would copy the same neighbour’s payload. A literal is read off the element itself and cannot drift.

<div class="air-md"></div>

**No icon required**

Nothing in the script is icon-specific — the click is delegated, so `rd-js-copy` makes **any** element a copy control, a whole block included:

```html
<div class="rd-js-copy" data-copy-text="curl -sL example.com/install | sh">
  Click anywhere in this block to copy the install command
</div>
```

The copy icon is just the most common carrier, not a requirement. Give a block-sized control a visible affordance of its own (`cursor: pointer`, a hint in the text) — see **Styling** below for the success state.

## JavaScript

Include once per page:

<div class="code-block">
{% raw %}
<pre><code id="snippet-2" class="language-js">const ICON_SUCCESS = "check";
const STATE_COPIED = "rd-is-copied";
const RESET_MS = 1200;

function getCopyText(icon) {
  if (icon.dataset.copyText != null) return icon.dataset.copyText;

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
    icon.classList.add(STATE_COPIED);
    clearTimeout(icon._copyTimer);
    icon._copyTimer = setTimeout(() => {
      delete icon.dataset.icon;
      icon.classList.remove(STATE_COPIED);
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
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v3.2.0/copy-to-clipboard/copy-to-clipboard.min.js"></script>
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
    line-height: inherit;
    background: none;
    color: var(--copy-icon-color, var(--text-color-light));
    border: none;
    padding: 0;
    cursor: pointer;
}

/* The glyph is an SVG mask filled with currentcolor — ship the two SVGs
   next to your CSS (Rare Styles bundles them under images/icons/) */
.copy-data-icon::before {
    content: "";
    display: inline-block;
    position: relative;
    top: 0.2em;
    width: 1em;
    height: 1em;
    background-color: currentcolor;
    mask: url("images/icons/content_copy-400.svg") no-repeat center / contain;
}

.copy-data-icon[data-icon="check"]::before {
    mask-image: url("images/icons/check-400.svg"); /* success glyph set by the script */
}

.copy-data-icon:hover {
    color: var(--copy-icon-color-hover, var(--primary-color));
    background: none;
    border: none;
}

/* The general success state. data-icon above only drives .copy-data-icon, so
   anything else that carries rd-js-copy — a block, or a glyph that is itself
   the control — styles .rd-is-copied instead. Here: any Rare Styles glyph
   flips to a check for ~1.2s. The per-glyph masks are single-class rules, so
   the extra .rd-is-copied outranks them. */
[class*="rd-icon-"].rd-is-copied::before {
    mask-image: url("images/icons/check-400.svg");
}

/* Optional: park the icon in a container's top-right instead of the flow.
   The container needs a positioning context of its own (position: relative).
   Rare Styles applies this to .code-block automatically. */
.copy-data-icon--pinned {
    position: absolute;
    top: 8px;
    right: 8px;
}

/* Optional: light icon for dark surfaces (put on the icon or any ancestor) */
.copy-data-icon--light {
    --copy-icon-color: #fafafa;
    --copy-icon-color-hover: #ccc;
}
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-4">{{ cssSnippet | escape | replace: '\n', '&#10;' }}</code></pre>
  <button class="copy-data-icon rd-js-copy" data-copy-target="#snippet-4"></button>
</div>

There are two success channels and{N}the script writes both. `data-icon="check"` is{N}the older one{N}and{N}is{N}read by{N}exactly one{N}rule, `.copy-data-icon`’s — it{N}is{N}an{N}internal channel, never something you{N}author. `rd-is-copied` is{N}the general one: it{N}lands on{N}whatever was clicked, so{N}it{N}is{N}what a{N}block or{N}a{N}bare glyph should style. A{N}control with no{N}success state copies silently, which reads as{N}broken — give every carrier one.

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

**Shortcut for dark surfaces.** The most common recolor — a light icon so it stays visible on a dark background — ships as a ready-made class, `.copy-data-icon--light`. It just sets the two tokens (`--gray-lightest` / `--gray`), so put it on the icon or any ancestor instead of writing the inline style:

```html
<!-- on the icon -->
<button class="copy-data-icon rd-js-copy copy-data-icon--light"></button>

<!-- or on a container, to invert every copy icon inside -->
<div class="dark-panel copy-data-icon--light"> … </div>
```

Live — a light glyph on a dark panel, parked in the corner with `.copy-data-icon--pinned`:

<div class="card copy-data-icon--light" style="background: #222; color: #eee; padding: var(--space-md);">
    <span data-copy>0x9f1b...cA11</span>
    <button class="copy-data-icon copy-data-icon--pinned rd-js-copy"></button>
</div>

**Pinning.** A copy icon inside a `.code-block` is parked in the top-right corner for you — that rule is wired up by ancestor, so code blocks need no extra class. Anywhere else the icon stays in the flow, which on a column-flex container like `.card` drops it onto its own line. `.copy-data-icon--pinned` is the same affordance by name; the container has to establish a positioning context, which `.card` and `.code-block` already do — anything else needs `position: relative` of its own.

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
### v3.2.0

- **Breaking: `.copy-data-icon-inverted` → `.copy-data-icon--light`.** Same class, renamed onto the library's modifier convention (`--` modifies, `__` is for elements), and named for the ink rather than the surface, like `.carousel-dots--dark`. Update the class name in markup; nothing else about it changed. Consumers pinned to an older Rare Styles are unaffected until they bump.
- **`.copy-data-icon--pinned`** — parks the icon in the container's top-right instead of leaving it in the flow. This affordance already existed but was reachable only by putting the icon inside a `.code-block`; it now has a name for every other surface. The container must establish a positioning context (`.code-block` and `.card` already do).

- **`data-copy-text` — copy a literal.** The payload no longer has to exist on the page: the attribute carries the string itself. It is checked first, so it also settles the one case the older `data-copy` lookup gets wrong — many hooks under one parent, where the subtree scan hands every hook the **first** sibling’s payload. Powers the click-to-copy glyph grids on [the icons page](/styles/icons/).
- **`rd-is-copied` — a success state for carriers that are not the copy icon.** On success the script now adds the class alongside `data-icon="check"`, and removes it on reset. `data-icon` only ever drove the `.copy-data-icon` glyph swap, so a block — or an `rd-icon-*` glyph that is itself the control — had no way to confirm the copy. CSS decides what the state looks like; Rare Styles flips an `rd-icon-*` to a check.
- Documented what was already true: the click is delegated, so `rd-js-copy` works on **any** element, a whole block included — the copy icon is a carrier, not a requirement.
- Backward compatible: both additions are purely additive, and every existing `data-copy` / `data-copy-target` / `data-icon` markup keeps working untouched.

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

---
layout: page.njk
title: "Copy to Clipboard"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/copy-to-clipboard/'
---

<div class="meta-info">
    <p>js/copy-to-clipboard.js</p>
    <p>v2.0.0 Stable (<a href="#changelog">Changelog</a>) |
    <a class="copy-source" href="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v2.0.0/copy-to-clipboard/copy-to-clipboard.min.js" data-copy>CDN</a> (minified)
    <button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button> |
    <a href="/assets/js/copy-to-clipboard.js">Download</a>
    <span class="material-icons">file_download</span>
    </p>
</div>

This is a small utility that adds a “copy” <span class="material-symbols-outlined">content_copy</span> icon next to things people actually want to copy. Links. Addresses. Code snippets. Anything.

Click the icon, the data goes to the clipboard, the icon briefly turns into a checkmark, everyone is happy and moves on.

The script doesn’t care about your layout, your CSS philosophy, or how deeply nested your markup is. It follows one simple rule: either you explicitly tell it what to copy, or you place it next to something marked as copyable.

That’s the whole contract:

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
<button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button>
```

Clicking the icon copies the full CDN URL.

Check it out: <a href="https://cdn.jsdelivr.net/script.min.js" data-copy>Copy Link</a> <button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button>

<div class="air-md"></div>

**Copy plain text (addresses, hashes, IDs)**

```html
<span data-copy>0x9f1b...cA11</span>
<button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button>
```

Works exactly like wallet address copy buttons. Because that’s what it is.

<div class="air-md"></div>

**Copy code from a block**

Use the `.code-block` wrapper and a `button` with the `copy-data-icon` class to create a classic code block with a copy button:

```html
<div class="code-block">
    <button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button>
</div>
```

To get a result like this:

<div class="code-block text-content-width">
    <pre><code id="snippet-1">npm i rare-scripts
# or
pnpm add rare-scripts</code></pre>
    <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-1"></button>
</div>

Use `data-copy-target` when proximity is not enough or would be ambiguous.

## JavaScript

Include once per page:

<div class="code-block">
{% raw %}
<pre><code id="snippet-2" class="language-js">const ICON_DEFAULT = "content_copy";
const ICON_SUCCESS = "check";
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
  const icon = e.target.closest(".copy-data-icon");
  if (!icon) return;

  if (icon.dataset.copyBusy) return;

  const text = getCopyText(icon);
  if (!text) return;

  icon.dataset.copyBusy = "1";

  const showSuccess = () => {
    icon.dataset.icon = ICON_SUCCESS;
    clearTimeout(icon._copyTimer);
    icon._copyTimer = setTimeout(() => {
      icon.dataset.icon = ICON_DEFAULT;
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
});</code></pre>
{% endraw %}
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-2"></button>
</div>


## Including the script

Don’t forget to actually include the script on the page.
Icons don’t copy things by positive thinking alone.

You can either host the file locally or load it from a CDN. Both options work the same way.

{%- capture includeSnippet -%}
// Local file:
<script src="/js/copy-to-clipboard.min.js"></script>

// CDN:
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v2.0.0/copy-to-clipboard/copy-to-clipboard.min.js"></script>
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-3">{{ includeSnippet | escape }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-3"></button>
</div>

Include it once per page, preferably near the end of the document or with defer.

## Styling

Make it feel clickable, not decorative:

{%- capture cssSnippet -%}
.copy-data-icon {
    display: inline-block;
    font-family: "Material Symbols Outlined";
    font-size: var(--font-size-lg);
    position: relative;
    top: 0.2em;
    font-size: inherit;
    line-height: inherit;
    background: none;
    color: var(--text-color-light);
    border: none;
    padding: 0;
    cursor: pointer;
}

.copy-data-icon::before {
    content: attr(data-icon);
}

.copy-data-icon:hover {
    color: var(--primary-color);
    background: none;
    border: none;
}
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-4">{{ cssSnippet | escape | replace: '\n', '&#10;' }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-4"></button>
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
### v2.0.0

- Changed required selector to `.copy-data-icon`, legacy markup no longer supported
- Updated CSS to render icons via: `::before` with `content: attr (data-icon)`
- Replaced Material Icons `<span>` integration with a generic `<button>` element
- Introduced `data-icon` attribute for icon state control instead of inner text
- Improved clipboard API handling; deprecated fallback kept as backup

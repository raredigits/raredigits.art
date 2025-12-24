---
layout: page.njk
title: "Copy to Clipboard"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/copy-to-clipboard/'
---

<div class="meta-info">
    <p>js/copy-to-clipboard.js</p>
    <p>v.1.0.1 Stable |
    <a class="copy-source" href="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v.1.0.1/copy-to-clipboard/copy-to-clipboard.min.js" data-copy>CDN</a> (minified)
    <span class="material-icons copy-data-icon" title="Copy link">content_copy</span> |
    <a href="/assets/js/copy-to-clipboard.js">Download</a>
    <span class="material-icons">file_download</span>
    </p>
</div>

This is a small utility that adds a “copy” icon next to things people actually want to copy. Links. Addresses. Code snippets. Anything.

Click the icon, the data goes to the clipboard, the icon briefly turns into a checkmark, everyone is happy and moves on.

The script doesn’t care about your layout, your CSS philosophy, or how deeply nested your markup is. It follows one simple rule: either you explicitly tell it what to copy, or you place it next to something marked as copyable.

That’s the whole contract:

- If the icon has data-copy-target, the script copies text from that element.
- If not, it looks for the nearest element marked with data-copy.
- If that element is a link, it copies the URL. Otherwise, it copies the text content.

No duplicated data. No hard-coded containers. No assumptions about structure.
It works the same way on documentation sites, dashboards, crypto wallets, and boring corporate pages.

This is intentional. The script stays dumb. The HTML stays expressive.

## Basic usage

**Copy a link (URL, not label)**

```html
<a href="https://cdn.jsdelivr.net/script.min.js" data-copy>Copy Link</a>
<span class="material-icons copy-data-icon" title="Copy">content_copy</span>
```

Clicking the icon copies the full CDN URL.

**Copy plain text (addresses, hashes, IDs)**

```html
<span data-copy>0x9f1b...cA11</span>
<span class="material-icons copy-data-icon" title="Copy">content_copy</span>
```

Works exactly like wallet address copy buttons. Because that’s what it is.

**Copy code from a block**

Use the `.code-block` wrapper and a `button` with the `copy-data-icon` and `material-icons` classes to create a classic code block with a copy button:

```html
<div class="code-block">
    <button class="copy-data-icon material-icons">content_copy</button>
</div>
```

To get a result like this:

<div class="code-block text-content-width">
    <pre><code id="snippet-1">npm i rare-scripts
# or
pnpm add rare-scripts</code></pre>
    <button class="copy-data-icon material-icons" type="button" title="Copy" aria-label="Copy code" data-copy-target="#snippet-1">content_copy</button>
</div>


Use data-copy-target when proximity is not enough or would be ambiguous.

## JavaScript

Include once per page:

```js
const ICON_DEFAULT = "content_copy";
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
    icon.textContent = ICON_SUCCESS;
    clearTimeout(icon._copyTimer);
    icon._copyTimer = setTimeout(() => {
      icon.textContent = ICON_DEFAULT;
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
```

## Including the script

Don’t forget to actually include the script on the page.
Icons don’t copy things by positive thinking alone.

You can either host the file locally or load it from a CDN. Both options work the same way.

```html
// Local file:
<script src="/js/copy-to-clipboard.min.js"></script>

// CDN:
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v.1.0.1/copy-to-clipboard/copy-to-clipboard.min.js"></script>
```

Include it once per page, preferably near the end of the document or with defer.

## Styling

Make it feel clickable, not decorative:

```css
// css/modules/decorations/_icons.scss

.copy-data-icon {
    cursor: pointer;
    user-select: none;
}

.copy-data-icon:hover {
    color: var(--primary-color);
}
```

Design principles (why this won’t rot):

- The script does not depend on layout.
- HTML owns the meaning. JavaScript only moves data.
- No duplicated content in attributes.
- Works with links, text, code, addresses.
- Scales from one icon to hundreds without extra listeners.

If an element should be copied, mark it with `data-copy`.<br>
If the icon should copy something specific, tell it where.

Everything else is none of the script’s business.

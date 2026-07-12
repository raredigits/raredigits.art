---
layout: page.njk
title: "Collapsible Content"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/collapsible/'
---

<div class="meta-info">
js/collapsible.js<br>
<p>
    v2.0.0 Stable (breaking: `rd-js-` hook) | 
    <a href="/assets/js/collapsible.js">Download</a> <span class="material-symbols-outlined">download</span>
</p>
</div>

The collapsible component provides a clean solution for managing large, secondary content or detailed information that might otherwise clutter the interface. When implemented correctly, it allows users to progressively discover content based on their interest level, maintaining a clean, focused interface by default.

This pattern is particularly useful for:
- FAQ sections
- Detailed specifications
- Supplementary information
- Long descriptions that would disrupt the main content flow

<div class="air-lg"></div>

### Native HTML Solution

Basic HTML5 provides built-in `<details>` and `<summary>` elements for collapsible content that require no JavaScript and work across all modern browsers:

<details>
<summary>Native HTML Example</summary>

HTML5 provides built-in elements for collapsible content that require no JavaScript and work across all modern browsers:

```html
<details>
  <summary>Click to expand</summary>
  <p>This content is hidden by default and appears when the user clicks the summary.</p>
</details>
```
</details>

Using pure HTML elements offer several advantages:

- Zero JavaScript dependency
- Built-in accessibility features
- Native browser support
- Consistent behavior across platforms

<div class="air-lg"></div>

### JavaScript

For cases requiring more complex behavior or specific design patterns that go beyond what native HTML elements provide, a custom JavaScript implementation is available. Here it is, live:

<div class="card collapsible-container">
    <p>
        <span class="section-icon material-symbols-outlined">code</span>
        <button class="collapsible-trigger rd-js-collapsible" aria-controls="collapsible-demo">Implementation Example<span class="collapsible-icon"></span></button>
    </p>
    <div id="collapsible-demo" class="collapsible-content rd-js-collapsible-content">
        <p>This block is a live collapsible driven by the script from this page. The trigger carries the hook class <code>rd-js-collapsible</code>, this content block carries <code>rd-js-collapsible-content</code>, and the open state is the <code>rd-is-open</code> class plus <code>aria-expanded</code> on the trigger. The icon rotation is pure CSS — no glyph swapping.</p>
        <p>Ready-to-paste markup for all three supported structures is right below.</p>
        <div class="air-md"></div>
    </div>
</div>

<div class="air-lg"></div>

#### Ready-to-paste markup

The script resolves the content element in three ways, in order: explicit `aria-controls` pointing at the content's `id` (canonical), the trigger's next sibling, or the trigger's parent's next sibling.

**Canonical — explicit `aria-controls`:**

{% capture collapsibleCanonical %}
<button class="collapsible-trigger rd-js-collapsible" aria-controls="details-1">
  Trigger<span class="collapsible-icon"></span>
</button>
<div id="details-1" class="collapsible-content rd-js-collapsible-content">
  Content goes here
</div>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-collapsible-1" class="language-html">{{ collapsibleCanonical | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy markup" data-icon="content_copy" data-copy-target="#snippet-collapsible-1"></button>
</div>

**Structure 1 — trigger and content are siblings:**

{% capture collapsibleSiblings %}
<div class="collapsible-trigger rd-js-collapsible">Trigger</div>
<div class="collapsible-content rd-js-collapsible-content">Content goes here</div>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-collapsible-2" class="language-html">{{ collapsibleSiblings | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy markup" data-icon="content_copy" data-copy-target="#snippet-collapsible-2"></button>
</div>

**Structure 2 — trigger inside a parent (like a `<p>`), content right after that parent:**

{% capture collapsibleParent %}
<p>
  <span class="collapsible-trigger rd-js-collapsible">Trigger</span>
</p>
<div class="collapsible-content rd-js-collapsible-content">Content goes here</div>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-collapsible-3" class="language-html">{{ collapsibleParent | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy markup" data-icon="content_copy" data-copy-target="#snippet-collapsible-3"></button>
</div>

**Script include and minimum CSS** (Rare Styles already ships these styles — add them only when using the script standalone):

{% capture collapsibleSetup %}
<script src="/assets/js/collapsible.js"></script>

<style>
  .collapsible-content { display: none; }
  .collapsible-content.rd-is-open { display: block; }
</style>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-collapsible-4" class="language-html">{{ collapsibleSetup | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy setup" data-icon="content_copy" data-copy-target="#snippet-collapsible-4"></button>
</div>

Note: The `.collapsible-icon` element is optional, and it is **empty on purpose** — the arrow glyph is baked into the class by CSS (Material Symbols ligature via `::before`), so markup carries no vendor icon class and no ligature text. The script never swaps icon glyphs — the open state rotates the icon via CSS (`[aria-expanded="true"] .collapsible-icon`). Standalone users need:

{% capture collapsibleIconCss %}
.collapsible-icon {
  display: inline-block;
  font-family: "Material Symbols Outlined";
  transition: transform 0.2s ease;
}

.collapsible-icon::before { content: "keyboard_arrow_down"; }

.collapsible-trigger[aria-expanded="true"] .collapsible-icon {
  transform: rotate(180deg);
}
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-collapsible-5" class="language-css">{{ collapsibleIconCss | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy icon CSS" data-icon="content_copy" data-copy-target="#snippet-collapsible-5"></button>
</div>

<div class="air-lg"></div>

<details>
<summary>Technical Requirements</summary>

Pay attention for several points:

1. The clickable element must carry the hook class `rd-js-collapsible` (keep a separate presentational class like `.collapsible-trigger` for styling — hooks are never styled)
2. The content element must carry the hook class `rd-js-collapsible-content`, or be targeted explicitly via `aria-controls` + `id`
3. Optional: icon element with class `.collapsible-icon` — rotated by CSS when open, no glyph swapping
4. The content must be hidden by default via CSS (`display: none;`) and shown by the state class the script toggles: `.rd-is-open { display: block; }`
5. The script mirrors open/closed state to `aria-expanded` on the trigger. A `<button>` trigger is preferred; for any other element the script adds `tabindex="0"` + `role="button"` and handles <kbd>Enter</kbd> / <kbd>Space</kbd>, so keyboard access works either way
</details>

<div class="air-md"></div>

<details>
    <summary>Raw code</summary>

```js
document.addEventListener('DOMContentLoaded', function() {
    // Resolve the content element for a trigger:
    // 1. explicit aria-controls id, 2. trigger's next sibling, 3. trigger's parent's next sibling
    function resolveContent(trigger) {
        const id = trigger.getAttribute('aria-controls');
        if (id) {
            const byId = document.getElementById(id);
            if (byId) return byId;
        }

        const sibling = trigger.nextElementSibling;
        if (sibling && sibling.classList.contains('rd-js-collapsible-content')) {
            return sibling;
        }

        const parentSibling = trigger.parentElement && trigger.parentElement.nextElementSibling;
        if (parentSibling && parentSibling.classList.contains('rd-js-collapsible-content')) {
            return parentSibling;
        }

        return null;
    }

    document.querySelectorAll('.rd-js-collapsible').forEach(trigger => {
        const content = resolveContent(trigger);
        if (!content) return;

        // Initialize ARIA from the authored state
        const isOpen = content.classList.contains('rd-is-open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (content.id && !trigger.getAttribute('aria-controls')) {
            trigger.setAttribute('aria-controls', content.id);
        }

        function toggle() {
            const open = content.classList.toggle('rd-is-open');
            trigger.classList.toggle('rd-is-open', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        trigger.addEventListener('click', toggle);

        // Keyboard access when the trigger is not a native button:
        // make it focusable and respond to Enter / Space
        if (trigger.tagName !== 'BUTTON') {
            if (!trigger.hasAttribute('tabindex')) trigger.setAttribute('tabindex', '0');
            if (!trigger.hasAttribute('role')) trigger.setAttribute('role', 'button');
            trigger.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        }
    });
});
```
</details>

<div class="air-lg"></div>

### Changelog

#### v2.0.0

- **Breaking:** hooks moved to the `rd-js` contract — the script finds elements via `rd-js-collapsible` / `rd-js-collapsible-content`; `.collapsible-trigger` / `.collapsible-content` remain as presentational classes only
- **Breaking:** visibility is now expressed by the `rd-is-open` state class instead of inline `style.display`
- **Breaking:** the icon glyph is no longer swapped (`keyboard_arrow_down` ↔ `keyboard_arrow_up`); the icon rotates via CSS keyed off `aria-expanded`
- Added `aria-expanded` / `aria-controls`; explicit `aria-controls` targeting is now the canonical structure
- Added keyboard access: non-`<button>` triggers get `tabindex="0"` + `role="button"` and toggle on <kbd>Enter</kbd> / <kbd>Space</kbd>

<div class="air-lg"></div>

### Pseudo-Link Styling Cheat Sheet

Create a special style for pseudo-links.

Following best practices, `.collapsible-trigger` elements should be visually distinguished to indicate their interactive nature. 

When designing the visual treatment for collapsible triggers, aim for a balance between subtlety and clarity. Users should recognize them as interactive elements without disrupting the flow of content.

Bonus: If it’s part of a bigger text block, avoid `display: block` — it should feel natural inside the flow.

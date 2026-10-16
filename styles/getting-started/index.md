---
layout: page.njk
title: "Getting Started"
section: "Styles"
displaySidebar: true
permalink: '/styles/getting-started/'
---

Rare Styles changes nothing on a page until you ask for it. From `v0.7.0`, every rule in the library applies only under the `.rd` class. Load the stylesheet, then opt in: the whole page, or one block at a time.

## Install and opt in

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/raredigits/rare-styles@{{ versions.styles }}/rare.min.css">
```

**Page mode.** Put `rd` on `<html>`. The page renders exactly as the library intends: header, page grid, typography, components.

```html
<html lang="en" class="rd">
```

**Island mode.** Put `rd` on any element. Only that element and what is inside it are styled; the rest of the page stays untouched.

```html
<figure class="rd">
  <table class="table-bordered">…</table>
  <figcaption>Source: …</figcaption>
</figure>
```

A page without `.rd` anywhere is not affected by `rare.css` at all, even though the file is loaded.

## What an island gets

<div class="table-scroll">
<table class="table-comparison table-bordered">
    <thead>
        <tr><th></th><th>Page mode <code>&lt;html class="rd"&gt;</code></th><th>Island <code>class="rd"</code></th></tr>
    </thead>
    <tbody>
        <tr><td>Tag styles (<code>h1</code>–<code>h6</code>, <code>p</code>, lists, tables, <code>code</code>, links, forms…)</td><td>yes</td><td>yes</td></tr>
        <tr><td>Library classes (<code>.card</code>, <code>.button</code>, <code>.grid</code>, utilities…)</td><td>yes</td><td>yes</td></tr>
        <tr><td>Icons <code>rd-icon-*</code></td><td>yes</td><td>yes, and also outside <code>.rd</code></td></tr>
        <tr><td>Page shell: fixed <code>header</code>, <code>main</code> padding, <code>article</code> placement, <code>section</code>, <code>footer</code>, <code>nav</code> chrome</td><td>yes</td><td><strong>no</strong></td></tr>
        <tr><td>Base typography of <code>body</code> (font, size, colour, line height)</td><td>yes</td><td><strong>no</strong>: the island inherits the host's text settings</td></tr>
        <tr><td>Reset (<code>margin: 0; padding: 0; box-sizing: border-box</code>)</td><td>yes</td><td>yes, on the island root and inside it</td></tr>
    </tbody>
</table>
</div>

The reset has zero specificity. It removes the browser's default margins and padding, but any rule of your own with a tag or class selector still wins over it.

`<body class="rd">` works like page mode, except for the few rules that sit on `<html>` itself (root line height, text-size adjust, the anchor offset). Prefer `<html class="rd">`.

## Customise with tokens

Tokens are custom properties on `:root`. They are not gated, so overriding them works the same in page mode and in islands. Load your stylesheet after Rare Styles:

```css
:root {
  --brand-color: #ff6b00;
  --heading-font: 'Montserrat', sans-serif;
}
```

See [Usage](/styles/usage/) for a complete example.

## Specificity: the gate adds nothing

The gate is `:where(.rd, .rd *)`, which adds **zero specificity**. Each library rule keeps exactly the specificity it had before the gate, no more and no less. So your `.my-card p` still beats the library's `p`, and a rule of yours with the same specificity as a library rule wins when it loads after `rare.css`. Two deliberate exceptions: the state class `.rd-is-hidden` is `display: none !important` (hidden must always win), and `:root` tokens, `@font-face` and the `rd-icon-*` glyphs are not gated at all.

## The caveat

The gate protects **your page from the library**. It does not protect **the library from your page**:

- If the host page has its own rules for the same tags or class names (`h1 {…}`, `.card {…}`), they apply inside islands too. At equal specificity, whichever stylesheet loads later wins.
- Inside an island, a host rule like `h1 { font-family: … }` loaded after `rare.css` replaces the library's heading font.

If the host's styles leak into an island, either load `rare.css` after them or scope your host rules away from `.rd` (`:not(.rd *)`).

## Markup you don't control

Third-party widgets and CMS blocks that are rendered into your page (not in an `<iframe>`) inherit page mode if `rd` is on `<html>`. When that is unwanted, don't put `rd` on `<html>`. Put it on your own containers instead (`<main class="rd">`, `<article class="rd">`) and leave the foreign markup outside them.

## Layout modes

The upcoming page layouts sit next to `rd` on `<html>`: `<html class="rd rd-layout-longread">`. A layout class without `rd` does nothing.

## Upgrading from 0.6

Add `class="rd"` to `<html>` in the same change that bumps the pin to `v0.7.0`. That is the only required step. Every other change, with what to do about it, is in the [migration table](https://github.com/raredigits/raredigits.art/blob/main/assets/css/docs/MIGRATION.md).

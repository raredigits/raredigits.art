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

| | Page mode `<html class="rd">` | Island `class="rd"` |
|---|---|---|
| Tag styles (`h1`–`h6`, `p`, lists, tables, `code`, links, forms…) | yes | yes |
| Library classes (`.card`, `.button`, `.grid`, utilities…) | yes | yes |
| Icons `rd-icon-*` | yes | yes, and also outside `.rd` |
| Page shell: fixed `header`, `main` padding, `article` placement, `section`, `footer`, `nav` chrome | yes | **no** |
| Base typography of `body` (font, size, colour, line height) | yes | **no**: the island inherits the host's text settings |
| Reset (`margin: 0; padding: 0; box-sizing: border-box`) | yes | yes, on the island root and inside it |

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

## Specificity: the library never outranks you

The gate is `:where(.rd, .rd *)`, which adds **zero specificity**. A library rule weighs exactly what it did before the gate, so your `.my-card p` still beats the library's `p`, and your `.button` overrides need no `!important`.

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

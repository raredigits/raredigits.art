---
layout: page.njk
title: "Styles Overview"
section: "Styles"
displaySidebar: true
permalink: '/styles/'
---

<div class="meta-info">
  /assets/css/rare.min.css
  <p>
      {{ versions.styles }} Beta | <a href="https://cdn.jsdelivr.net/gh/raredigits/rare-styles@{{ versions.styles }}/rare.min.css">CDN</a> | 
      <a href="/assets/css/rare.min.css">Download</a> <span class="rd-icon-download"></span>
  </p>
</div>

Rare Styles is a CSS library for clarity-first content and decision-grade interfaces. It is built for situations where attention is the scarcest resource: longreads, internal tools, dashboards, documentation, reporting. This is not a decoration kit and not a vehicle for visual fashion.

### Visual decisions are not optional. They are the design.

Every screen makes choices for the reader: where to look, what to read first, what to ignore. General-purpose CSS frameworks defer those choices to the developer, who defers them to defaults. The result is interfaces that are technically clean and practically noisy.

Rare Styles takes the opposite stance. It encodes [Rareism](/manifesto/) — the discipline of removing what does not drive a decision — directly in its tokens, components and defaults. The library does not stay neutral on what attention should serve. It serves the signal.

## Rare Styles

<div class="sidenote-wrapper">
  <div>
    <p>Rare Styles is the technical instrument of <a href="/manifesto/">Digital Rareism</a>. Its tokens, components and defaults carry the same philosophy: signal over noise, certainty over feature count, function over ornament.</p>
  </div>
  <div class="sidenote">
    <h5>Built on 20 years of business-tooling expertise</h5>
    <p>Rare Styles is authored by <a href="https://raredigits.io">Rare Digits Production</a>, a team that has spent two decades building instruments for businesses and decision-makers.</p>
  </div>
  <div>
    <p>Most CSS frameworks ship a box of primitives and let the frontend assemble the answer. <strong>Rare Styles ships the answer.</strong> Visual decisions — typography, spacing, contrast, density, hierarchy — are already made and encoded in the defaults. Dark text on light background. Calm <a href="/kb/choosing-the-right-font/">typography</a>. Sufficient contrast. Deliberate density. The page you are reading uses these defaults with no overrides.</p>
    <p>This shifts where the design work happens. With Rare Styles, the design is largely done <em>before</em> the technical specification reaches the frontend developer. The developer composes structure; the library carries the visual language. There are no debates about font sizes, no rounds of “make it more breathable”, no theme variants to A/B.
  </div>
</div>

<div class="highlight">Clarity is the default, not the goal.</div>

There is no light/dark toggle either — see the <a href="/styles/themes/">stance on theme switching</a> for why.

Where a page genuinely calls for a different frame — a longread that wants a slower reading rhythm, or a data view that needs the full canvas — Rare Styles provides two opt-in body-level layout modes: <strong>Story</strong> for prose-heavy pages, <strong>Dashboard</strong> for data-heavy pages. Most pages need neither. The defaults already render correctly.

The important part is not how many components ship. It is that each one has earned its place by serving a real reading or decision task.

## Standard Architecture

The library is organized into layered modules: tokens, utilities, layout, typography, elements, components, navigation, decorations, layouts. You can ship the full bundle or import only the modules you need from the SCSS source.

### Tokens

All design decisions live as CSS custom properties — colors, spacing, typography, shadows, motion, surfaces. Adapting Rare Styles to a constrained brand context is a matter of overriding tokens in `:root`, not forking the library. Brand identity (`--brand-color`) and decision-driving accents (`--signal`) are intentionally kept separate.

### Components

Components split into two semantic families. **Cards** carry narrative content: article previews, persons, projects. **Panels** carry data and system content: KPIs, charts, status, settings. Both work in either layout mode. The choice is semantic, not stylistic.

### Layouts

Story and Dashboard are opt-in body-level modes for pages whose content asks for a different frame. **Story** scales typography up and adjusts heading treatment for prose-heavy reading; **Dashboard** removes the sidebar and lifts text-width constraints for data-heavy composition. Most pages need neither — the defaults already render correctly. The visual language stays identical across all three states.

### Professional Considerations

Rare Styles accounts for details that are often skipped in feature-driven frameworks: keyboard focus visibility, motion reduction, semantic markup, WCAG AA contrast, and a clear public API contract that distinguishes breaking from non-breaking change.

The following sections cover each module in depth: tokens, layout, typography, colors, elements, components, navigation, decorations, utilities, layouts, and integration with sibling libraries — <a href="/scripts/">Rare Scripts</a> and <a href="/charts/">Rare Charts</a>.

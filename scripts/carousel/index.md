---
layout: page.njk
title: "Carousel"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/carousel/'
scripts: [carousel]
---

<div class="meta-info">
js/carousel.js
<p>
    v1.0.0 Stable |
    <a href="/assets/js/carousel.js">Download</a> <span class="material-symbols-outlined">download</span>
</p>
</div>

A lightweight image carousel for a small set of related photos — one visible at a time, with previous/next arrows and a dot for each slide. Each slide is a `<figure>`, so an optional caption travels with its image instead of sitting still while the pictures change underneath it.

It stays deliberately small: no autoplay, no infinite virtual scrolling, no touch-momentum physics. For a handful of images inside an article — a place, a building from three angles, a before/after — that is all it needs to be.

## Live example

<div class="text-content-caption">
<div class="carousel rd-js-carousel">
  <div class="carousel-track rd-js-carousel-track">
    <figure class="carousel-slide rd-is-active">
      <img src="/assets/img/illustrations/poker.jpg" alt="Poker">
      <figcaption class="carousel-caption">First slide — the caption belongs to this image</figcaption>
    </figure>
    <figure class="carousel-slide">
      <img src="/assets/img/illustrations/batman-inverted.jpg" alt="Batman, inverted">
      <figcaption class="carousel-caption">Second slide — and this caption changes with it</figcaption>
    </figure>
    <figure class="carousel-slide">
      <img src="/assets/img/illustrations/leg-split.jpg" alt="Leg split">
      <figcaption class="carousel-caption">Third slide — a slide with no caption is fine too</figcaption>
    </figure>
  </div>
  <button class="carousel-arrow carousel-arrow-prev rd-js-carousel-prev" aria-label="Previous slide"></button>
  <button class="carousel-arrow carousel-arrow-next rd-js-carousel-next" aria-label="Next slide"></button>
  <div class="carousel-dots rd-js-carousel-dots"></div>
</div>
</div>

Use the arrows, the dots, or the <kbd>←</kbd> / <kbd>→</kbd> keys while the carousel has focus.

## Contract

- `rd-js-carousel` on the root, `rd-js-carousel-track` on the slide container — the track’s **element children are the slides**, so the script never depends on the slide’s presentational class
- `rd-js-carousel-prev` / `rd-js-carousel-next` on the arrow buttons; `rd-js-carousel-dots` on the (empty) dots container the script fills
- State is `rd-is-active` on the current slide and its dot — CSS shows the active slide and stretches the active dot
- A slide is a `<figure>` with an `<img>` and an optional `<figcaption class="carousel-caption">`; keeping the caption inside the slide is what makes it travel with the image
- Reading order below the photo: caption first, then the dots — the dots live in normal flow under the carousel (dark by default), never overlaid on the caption or the photo
- Any number of carousels can share one page — each is initialized independently
- ARIA: the root is a `role="group"` / `aria-roledescription="carousel"`; arrows and dots are real `<button>`s with labels; inactive slides are `aria-hidden`

## Ready-to-paste markup

Each slide is a `<figure>`. The first slide carries `rd-is-active`; the dots container is left empty — the script builds one dot per slide.

{% capture carouselMarkup %}
<div class="carousel rd-js-carousel">
  <div class="carousel-track rd-js-carousel-track">
    <figure class="carousel-slide rd-is-active">
      <img src="/img/one.jpg" alt="…">
      <figcaption class="carousel-caption">Caption for the first image</figcaption>
    </figure>
    <figure class="carousel-slide">
      <img src="/img/two.jpg" alt="…">
      <figcaption class="carousel-caption">Caption for the second image</figcaption>
    </figure>
  </div>
  <button class="carousel-arrow carousel-arrow-prev rd-js-carousel-prev" aria-label="Previous slide"></button>
  <button class="carousel-arrow carousel-arrow-next rd-js-carousel-next" aria-label="Next slide"></button>
  <div class="carousel-dots rd-js-carousel-dots"></div>
</div>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-carousel-1" class="language-html">{{ carouselMarkup | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy markup" data-icon="content_copy" data-copy-target="#snippet-carousel-1"></button>
</div>

The arrow buttons are empty on purpose — the chevron glyphs are baked into `.carousel-arrow-prev` / `-next` by CSS (via the `symbol ()` mixin), so the markup carries no vendor icon class.

**Script include:**

{% capture carouselScript %}
<script src="/assets/js/carousel.js"></script>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-carousel-2" class="language-html">{{ carouselScript | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy include" data-icon="content_copy" data-copy-target="#snippet-carousel-2"></button>
</div>

{% include "special/self-host-notice.njk" %}

## Recoloring

The arrows overlay the photo, so their defaults are fixed light-on-dark values; the dots sit **below** the carousel on the page background, so their defaults are dark. All four are component tokens, overridable per instance (e.g. a carousel on a dark surface wants light dots back):

{% capture carouselRecolor %}
<!-- carousel on a dark panel: light dots, brand arrows -->
<div class="carousel rd-js-carousel"
     style="--carousel-dot-color: rgb(255 255 255 / 50%); --carousel-dot-active: var(--white); --carousel-control-bg: var(--brand-color);">
  …
</div>
{% endcapture %}

<div class="code-block">
    <pre><code id="snippet-carousel-3" class="language-html">{{ carouselRecolor | strip | escape }}</code></pre>
    <button class="copy-data-icon rd-js-copy" title="Copy example" data-icon="content_copy" data-copy-target="#snippet-carousel-3"></button>
</div>

Available tokens: `--carousel-control-bg`, `--carousel-control-color`, `--carousel-dot-color`, `--carousel-dot-active`.

<details>
    <summary>Raw code</summary>

```js
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.rd-js-carousel').forEach(initCarousel);
});

function initCarousel(root) {
    const track = root.querySelector('.rd-js-carousel-track');
    if (!track) return;

    // Slides are the track's element children — the caption travels with the
    // image because both live inside the same slide element.
    const slides = Array.prototype.filter.call(track.children, function (el) {
        return el.nodeType === 1;
    });
    if (slides.length === 0) return;

    const prev = root.querySelector('.rd-js-carousel-prev');
    const next = root.querySelector('.rd-js-carousel-next');
    const dotsBox = root.querySelector('.rd-js-carousel-dots');

    let idx = Math.max(0, slides.findIndex(function (s) {
        return s.classList.contains('rd-is-active');
    }));

    if (!root.getAttribute('role')) root.setAttribute('role', 'group');
    if (!root.getAttribute('aria-roledescription')) root.setAttribute('aria-roledescription', 'carousel');

    const dots = [];
    if (dotsBox && slides.length > 1) {
        slides.forEach(function (_, i) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', function () { go(i); });
            dotsBox.appendChild(dot);
            dots.push(dot);
        });
    }

    function go(index) {
        idx = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
            const active = i === idx;
            slide.classList.toggle('rd-is-active', active);
            slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        dots.forEach(function (dot, i) {
            const active = i === idx;
            dot.classList.toggle('rd-is-active', active);
            dot.setAttribute('aria-current', active ? 'true' : 'false');
        });
    }

    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });

    root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    });

    if (slides.length < 2) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
    }

    go(idx);
}
```
</details>

## Changelog

### v1.0.0

- **Multiple carousels per page now work** — each instance is initialized independently (the original collected every image on the page into one shared list, so only a single carousel worked)
- Captions travel with their images: a slide is a `<figure>` holding the image and an optional `<figcaption>`
- Arrows and dots are real `<button>`s; added keyboard navigation (<kbd>←</kbd> / <kbd>→</kbd>), `role`/`aria-roledescription`, per-control labels, and `aria-hidden` on inactive slides
- Styles tokenized: hardcoded colors and sizes replaced with `--space-*` and the recolorable `--carousel-*` component tokens; the dead `transform` transition on the track was removed
- Dots moved out of the photo overlay into normal flow below the carousel (they collided with the new travelling captions) and recolored dark for the page background; the arrows keep their light-on-photo overlay defaults
- Rebuilt on the `rd-js` / `rd-is` contract

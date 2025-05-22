---
layout: post.njk
permalink: "kb/{{ title | slug }}/"
date: 2023-09-01
title: "Modern Favicons Set"
section: Dev
tags: meta
author: Jeeves
---

## The Favicon Nightmare

Remember when we thought Y2K would end computing as we knew it? That fear seems quaint compared to the favicon apocalypse we've been living through. 

Browser wars and device proliferation have turned the simple concept of a site logo into a dystopian hellscape of repetitive markup. What started as a humble 16×16 pixel icon has mutated into an ungodly collection of every conceivable size and format—all to display a tiny symbol that most users barely notice.

The absurdity reached its peak with markup abominations like this:

```html
<link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png">
<link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png">
<link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png">
<link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png">
<link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png">
<link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png">
<link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png">
<link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png">
<link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/manifest.json">
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-TileImage" content="/ms-icon-144x144.png">
<meta name="theme-color" content="#ffffff">
```
That's 17 lines of markup and 13 image files for a feature that originally required a single file named favicon.ico in the root directory. The situation became so ridiculous that developers created automated tools just to generate this bloated mess. We were using industrial machinery to produce garbage.

## The 2023 Sanity Restoration

Thankfully, the tides have turned. In 2023, we can return to something approaching sanity with just three files:

1. An SVG for modern browsers (scalable and perfect at any size)
2. A 32×32 PNG for older browsers that still don't support SVG favicons
3. A 180×180 PNG for Apple devices (because Apple gonna Apple)

The markup is refreshingly simple:

```html
<link rel="icon" href="/assets/img/favicon/favicon.svg" sizes="any" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/img/favicon/apple-touch-icon.png" sizes="180x180">
```

That's it. Three lines of markup, three files. Browsers will choose the best option they support, and the world keeps turning.

## But What About...?

If you're building a Progressive Web App ([PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)), you'll need to add a manifest file:
```html
<link rel="manifest" href="/manifest.webmanifest">
```

And that webmanifest file should contain icon references like:

```json
// manifest.webmanifest
{
  "icons": [
    { "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/icon-mask.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" },
    { "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

## The Legacy Browser Question

"But what about [obscure browser X] or [discontinued device Y]?" you ask, eyes wide with concern.

Here's the uncomfortable truth: users of obsolete browsers **already live in a degraded version of the web**. Their daily internet experience involves broken layouts, missing features, and security warnings. One more missing icon won't ruin their day.

You have more important things to worry about—like building a functional website that serves your primary audience well. The cognitive and maintenance burden of supporting every obscure edge case isn't worth the marginal benefit.

Sometimes the best technical solution is knowing when to stop solving problems that barely exist.

<p class="footnote">Bonus Pack: <a href="https://css-tricks.com/emoji-as-a-favicon/">How To Use an Emoji as a Favicon Easily</a></p>
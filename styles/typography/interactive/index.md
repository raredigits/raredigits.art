---
layout: page.njk
title: "Text Elements / Interactive Elements"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/interactive/'
---

<div class="meta-info">
    css/modules/navigation/_links.scss · css/modules/elements/_buttons.scss · css/modules/utilities/_a11y.scss
</div>

## Keyboard focus

Every focusable element inside `.rd` (links, buttons, form fields, `summary`, carousel controls) shows the same ring when it is reached from the keyboard. A mouse click shows no ring: the rule is `:focus-visible`. Press <kbd>Tab</kbd> on this page to see it.

The ring is 2px of `--focus-ring-color`, offset by 2px. The default `--blue` keeps at least 3:1 contrast on every library surface, light and dark. Restyle it with the tokens; don't remove it.

```css
:root {
  --focus-ring-color: var(--blue);
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
}
```

On macOS, Safari moves <kbd>Tab</kbd> only between form fields unless "Press Tab to highlight each item on a webpage" is enabled (Safari → Settings → Advanced); <kbd>Option</kbd>+<kbd>Tab</kbd> reaches links and buttons either way. Firefox follows the system setting "Keyboard navigation" (System Settings → Keyboard).

## Links

A text link is underlined in `--brand-color-dark`. On hover a soft fill of the same colour rises from the bottom of the line. With reduced motion it appears without the animation.

<p>A paragraph with <a href="/styles/typography/">a text link</a> in it, and a <a class="link-thick" href="/styles/typography/lists/">thicker link</a> with <code>.link-thick</code>.</p>

At rest a link has exactly one line, the underline. Until `v0.7.0` the hover fill sat at rest as a 1px strip just below the text box. Chrome clipped it, but Safari showed it as a second, lighter underline.

Links that are not text links (icons, cards, logos) take `.no-decoration`.

## Buttons

`.button` turns a link or a `<button>` into a rounded control sized to its content.

<p>
    <a class="button" href="/styles/getting-started/">Link as a button</a>
</p>
<p>
    <button class="button" type="button">Button element</button>
</p>

The full button system (variants, sizes, states) arrives with the interactive core in `v0.7.9`.

## Forms

Form fields are not styled by the library yet; that is the forms work of `v0.7.9`. Inside `.rd` they already inherit the page font and size (from normalize) and show the focus ring.

<form class="padding-y-md" onsubmit="return false">
    <p><label>Name<br><input type="text" name="name" placeholder="Your name"></label></p>
    <p><label>Topic<br><select name="topic"><option>Styles</option><option>Charts</option></select></label></p>
    <p><label><input type="checkbox" name="news"> Send me release notes</label></p>
    <p><button class="button" type="submit">Send</button></p>
</form>

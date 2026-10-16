---
layout: page.njk
title: "Usage"
section: "Styles"
displaySidebar: true
permalink: '/styles/usage/'
---

## General Principles

Rare Styles provides a solid foundation for creating clean, functional interfaces. This guide explains how to effectively implement the style system in your projects and customize it when needed.

## Including the Stylesheet

Add the Rare Styles stylesheet to your project by including it in the `<head>` section of your HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/raredigits/rare-styles@{{ versions.styles }}/rare.min.css">
```

For development environments or when you need unminified code:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/raredigits/rare-styles@{{ versions.styles }}/rare.css">
```

Then opt the page in. From `v0.7.0` every library style applies only under the `.rd` class, so a page without it is left alone:

```html
<html lang="en" class="rd">
```

`class="rd"` on a single element instead styles just that block (an island). An island gets the tag styles and the library classes, but not the page shell (fixed header, footer, page grid) or the base typography of `body`.

## Understanding Cascading Styles
The "C" in CSS stands for "Cascading," a fundamental principle that determines which styles take precedence when multiple rules apply to the same element. The system works through three key mechanisms:

- Inheritance - Many properties naturally flow down from parent to child elements
- Specificity - More specific selectors override less specific ones
- Source order - Later styles override earlier styles

This cascade principle is what makes customizing Rare Styles straightforward: you can override the default styles simply by adding more specific rules or loading your custom styles after the main stylesheet.

## Customization Approach
The simplest way to customize Rare Styles is to create your own stylesheet and include it after the main Rare Styles file:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/raredigits/rare-styles@{{ versions.styles }}/rare.min.css">
<link rel="stylesheet" href="path/to/my-beautiful-styles.css">
```

This approach preserves all the functional benefits of Rare Styles while allowing you to:

- Override colors to match your brand
- Adjust typography or spacing
- Create custom component variants
- Add entirely new elements

Here's a simple example of brand-specific customization in `my-beautiful-styles.css`. It changes the library's own tokens. Inventing new token names would do nothing, because no library rule reads them:

```css
/* A font name alone loads nothing: bring the files (or a <link> to your font host) */
@font-face {
  font-family: 'Montserrat';
  src: url('/fonts/montserrat-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

:root {
  /* Library tokens: override these, the library reads them */
  --primary-color: #1a1a2e;              /* body text and headings */
  --brand-color: #ff6b00;                /* brand accents */
  --brand-color-dark: #c25100;           /* link underline and hover fill */
  --heading-font: 'Montserrat', sans-serif;

  /* Your own tokens: any name, read only by your rules below */
  --my-accent: #0056b3;
}

/* A variant of the library's .card */
.card.premium {
  border-left: 4px solid var(--my-accent);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* A variant of the library's .button */
.button.brand {
  background-color: var(--brand-color);
  border-color: var(--brand-color);
  color: white;
}
```

Load it after Rare Styles so that the same-specificity rules win by source order. This changes the text color, the brand accents, the link underline and the heading font, and adds two variants of existing library components without modifying the original stylesheet. `--primary-font` and `--code-font` work the same way as `--heading-font`.

## Learning from Examples
Check out the [examples section](/examples) to see Styles in action. These practical implementations demonstrate how selectors are used in real-world scenarios. When in doubt, your browser's inspector tool is also invaluable—examining how elements are styled on the live site often reveals patterns and best practices that aren't immediately obvious from documentation alone.

## Getting Help
Don't hesitate to create an issue in the [GitHub repository](https://github.com/raredigits/rare-styles) if you encounter problems or have questions. The repository is home to mostly harmless and generally friendly developers who are happy to help. Whether you've found a bug, need clarification, or want to suggest an improvement, the community welcomes your input.

## Working with Third-Party Libraries
When integrating Rare Styles with other UI libraries or frameworks:

- Load order matters - Place Rare Styles before or after other CSS libraries depending on which should take precedence
- Namespace conflicts - Be aware of potential class name collisions between libraries
- CSS resets - Rare Styles includes its own minimal reset; additional reset libraries are usually unnecessary
- Framework integration - For component-based frameworks (React, Vue, etc.), consider using the Rare Styles variables in your component styles for consistency

## Performance Considerations
When customizing Rare Styles:

- Use CSS variables whenever possible instead of overriding entire rule sets
- Consider using media queries strategically to load custom styles only when needed
- For production, combine and minify your custom CSS with the base stylesheet
- Audit your final CSS periodically to remove unused styles

Remember that the best customizations are minimal. Rare Styles already handles the fundamentals of creating clean, functional interfaces—your customizations should focus on brand identity and specific functional needs rather than reinventing the wheel.
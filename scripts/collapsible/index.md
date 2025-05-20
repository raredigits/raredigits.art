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
    v.1.0 Stable | 
    <a href="/assets/js/collapsible.js">Download</a> <span class="material-icons">file_download</span>
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

For cases requiring more complex behavior or specific design patterns that go beyond what native HTML elements provide, a custom JavaScript implementation is available:

<div class="card collapsible-container">
    <p>
        <span class="section-icon material-icons-outlined">code</span>
        <span class="collapsible-trigger">Implementation Example<span class="collapsible-icon material-icons-outlined">keyboard_arrow_down</span></span>
    </p>
    <div class="collapsible-content">
        <p>The script handles two common HTML structures:</p>
        <ul>
            <li>Structure 1: Trigger and content are siblings</li>
            <li>Structure 2: Trigger inside parent element (like <code>&lt;p&gt;</code>) followed by content</li>
        </ul>
        <p>Below is a practical implementation example showing how the collapsible component works.</p>
        <pre>
<code><span class="code-comment">// Structure 1 (siblings under same parent):</span>
&lt;div class="container"&gt;
    &lt;div class="collapsible-trigger"&gt;Trigger&lt;span&gt; class="collapsible-icon material-icons-outlined"&gt;keyboard_arrow_down&lt;/span&gt;&lt;/div&gt;
    &lt;div class="collapsible-content"&gt;Content goes here&lt;/div&gt;
&lt;/div&gt;
<div class="air-md"></div>
<span class="code-comment">// Structure 2 (content after trigger's parent):</span>
&lt;div class="container"&gt;
    &lt;p&gt;
        &lt;span class="collapsible-trigger"&gt;Trigger&lt;span class="collapsible-icon"&gt;...&gt;/span&gt;&lt;/span&gt;
    &lt;/p&gt;
    &lt;div class="collapsible-content"&gt;Content&lt;/div&gt;
&lt;/div&gt;</code>
        </pre>
        <p>Note: The <code>.collapsible-icon</code> element is optional. If it's not present, the script will still toggle the visibility of the content, but there won't be any icon changes.</p>
        <div class="air-lg"></div>
    </div>
</div>

<div class="air-lg"></div>

<details>
<summary>Technical Requirements</summary>

Pay attention for several points:

1. The clickable element must have class `.collapsible-trigger`
2. The hidden content must have class `.collapsible-content`
3. Optional: Icon element with class `.collapsible-icon`
4. The default state of `.collapsible-content` should be set as `display: none;` or `max-height: 0;` to ensure content is hidden before JavaScript runs
</details>

<div class="air-md"></div>

<details>
    <summary>Raw code</summary>

```js
document.addEventListener('DOMContentLoaded', function() {
    // Find all trigger elements
    const triggers = document.querySelectorAll('.collapsible-trigger');

    // Add click handler to each trigger
    triggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            // Try to find related content element
            let content;

            // Check if trigger and content are siblings
            if (this.nextElementSibling && this.nextElementSibling.classList.contains('collapsible-content')) {
                content = this.nextElementSibling;
            }
            // Check if content is the next sibling of trigger's parent
            else if (this.parentElement &&
                        this.parentElement.nextElementSibling &&
                        this.parentElement.nextElementSibling.classList.contains('collapsible-content')) {
                content = this.parentElement.nextElementSibling;
            }

            // Exit if no content found
            if (!content) return;

            // Find the icon (if it exists)
            const icon = this.querySelector('.collapsible-icon');

            // Check if content is currently visible
            const isVisible = window.getComputedStyle(content).display !== 'none';

            // Toggle visibility
            if (isVisible) {
                content.style.display = 'none';
                if (icon) icon.textContent = 'keyboard_arrow_down';
            } else {
                content.style.display = 'block';
                if (icon) icon.textContent = 'keyboard_arrow_up';
            }
        });
    });
});
```
</details>

<div class="air-lg"></div>

### Pseudo-Link Styling Cheat Sheet

Create a special style for pseudo-links.

Following best practices, `.collapsible-trigger` elements should be visually distinguished to indicate their interactive nature. 

When designing the visual treatment for collapsible triggers, aim for a balance between subtlety and clarity. Users should recognize them as interactive elements without disrupting the flow of content.

Bonus: If it’s part of a bigger text block, avoid `display: block` — it should feel natural inside the flow.
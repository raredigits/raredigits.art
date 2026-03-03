---
layout: page.njk
title: "Color System"
section: "Styles"
displaySidebar: true
permalink: '/styles/colors/'
---

## Neutral Foundation
<div class="meta-info">css/colors/</div>

The style system employs a neutral monochromatic palette as its foundation for presenting information. Visual hierarchy is established primarily through typographic techniques and grid structure rather than relying on color differentiation.

This approach helps maintain focus on content while ensuring accessibility and reducing cognitive load for users. The restraint in color usage creates a professional, timeless aesthetic that won’t quickly feel dated.

<div class="highlight">
    When information architecture is strong, color becomes an accent — not a necessity
</div>

For the design and development team, it eliminates the paradox of choice that comes with access to 16.7 million possible HEX colors, streamlining decision-making and ensuring consistency.

### Grayscale Palette

Black and white serve as the foundational contrast colors in the system. The grayscale palette between them performs a supporting function, ensuring comfortable information perception and helping users intuitively distinguish between primary and secondary information.

The core grayscale palette consists of three primary and five supplementary shades that are used throughout the template:

<div class="card text-content-caption padding-lg">
    <h4>Grays Family</h4>
    <div class="column width100">
        <div class="flex stretched white-bg width-100 padding-md">
            <div>white</div>
            <div>
                <span data-copy>#ffffff</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-lightest-bg width-100 padding-md">
            <div>gray-lightest</div>
            <div>
                <span data-copy>#fafafa</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-light-bg width-100 padding-md">
            <div>gray-light</div>
            <div>
                <span data-copy>#f0f0f0</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-mid-light-bg width-100 padding-md">
            <div>gray-mid-light</div>
            <div>
                <span data-copy>#e4e4e4</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-bg width-100 padding-md">
            <div>gray</div>
            <div>
                <span data-copy>#cccccc</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-trans-bg gray-light width-100 padding-md">
            <div>gray-trans</div>
            <div>
                <span data-copy>#888888</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-mid-dark-bg gray-light width-100 padding-md">
            <div>gray-mid-dark</div>
            <div>
                <span data-copy>#666666</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-dark-bg gray-light width-100 padding-md">
            <div>gray-dark</div>
            <div>
                <span data-copy>#333333</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-darkest-bg gray-light width-100 padding-md">
            <div>gray-darkest</div>
            <div>
                <span data-copy>#191919</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched black-bg gray-light width-100 padding-md">
            <div>black</div>
            <div>
                <span data-copy>#000000</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
    </div>
</div>

These settings can be adjusted in your global stylesheet according to specific project needs:

<pre class="text-content-caption">
<code><span class="code-comment">// css/modules/colors/_base.scss</span>
    
<span class="code-comment">// Base Colors </span>

--black: #000; // Text color
--white: #fff; // Used for blocks highlighting

<span class="code-comment">// Grays Family </span>

--gray-light: #f0f0f0; // Used for backgrounds
--gray: #cccccc; // Used for borders, dividers
--gray-dark: #333333; // Used for secondary text

--gray-lightest: #fafafa; // Used for cards backgrounds
--gray-mid-light: #e4e4e4; // Used for secondary backgrounds
--gray-trans: #888888; // Used for disabled states
--gray-mid-dark: #666666; // Used for labels, captions
--gray-darkest: #191919; // Used for highlighting light-grays</code>
</pre>

These grays are implemented across all levels of the interface - from section backgrounds to specialized text elements like blockquotes, citations, and preformatted text blocks.

## Accent Colors

While the grayscale palette forms the foundation, strategic use of color helps highlight key informational elements and establish visual hierarchy where necessary.

### Brand Color

The most prominent color in the system is defined by the <code>--brand-color</code> variable. This color is primarily used for links and supporting elements, ensuring brand recognition and consistency throughout the interface.

<pre class="text-content-caption">
<code><span class="code-comment">// css/modules/colors/_brand.scss</span>
    
--brand-color: #00ff4e; <span class="code-comment">// Primary brand color</span>
--brand-color-light: #d8f9d1; <span class="code-comment">// Lighter variant for hover states</span>
--brand-color-dark: #00b300; <span class="code-comment">// Darker variant for active states</span>
</code></pre>

### Technical Colors

Technical colors are used to highlight important info: statuses, warnings, and errors.

<div class="card text-content-caption padding-lg">
    <div class="column width100">
        <div class="flex stretched yellow-bg width-100 padding-md">
            <div>yellow — for warnings</div>
            <div>
                <span data-copy>#ffe000</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched red-bg width-100 padding-md">
            <div>red — for errors</div>
            <div>
                <span data-copy>#ff0000</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched green-bg white width-100 padding-md">
            <div>green — for success</div>
            <div>
                <span data-copy>#389e0d</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
    </div>
</div>

Technical colors should be used strictly for their intended purpose — a designer must avoid inflating the importance of content that isn’t truly critical.

### Supporting Colors

<div class="meta-info">css/modules/colors/_supporting.scss</div>

A limited set of supporting colors is available for specific purposes like data visualization and thematic section coding:

<div class="card text-content-caption padding-lg">
    <div class="column width100">
        <div class="flex stretched cherry-bg white width-100 padding-md">
            <div>cherry</div>
            <div>
                <span data-copy>#86241a</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched plum-bg white width-100 padding-md">
            <div>plum</div>
            <div>
                <span data-copy>#4e4153</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched ocean-bg gray-light width-100 padding-md">
            <div>ocean</div>
            <div>
                <span data-copy>#2f7395</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched orange-bg width-100 padding-md">
            <div>orange</div>
            <div>
                <span data-copy>#fa8c16</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched pink-bg width-100 padding-md">
            <div>pink</div>
            <div>
                <span data-copy>#ffd6e7</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched princess-bg width-100 padding-md">
            <div>princess</div>
            <div>
                <span data-copy>#ff00f5</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched safari-bg width-100 padding-md">
            <div>safari</div>
            <div>
                <span data-copy>#ffb038</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched purple-bg gray-light width-100 padding-md">
            <div>purple</div>
            <div>
                <span data-copy>#722ed1</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched pen-bg white width-100 padding-md">
            <div>pen</div>
            <div>
                <span data-copy>#0033a0</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched tiffany-bg white width-100 padding-md">
            <div>tiffany</div>
            <div>
                <span data-copy>#53c9e9</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched blueberry-bg gray-light width-100 padding-md">
            <div>blueberry</div>
            <div>
                <span data-copy>#221e4d</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched coral-bg width-100 padding-md">
            <div>coral</div>
            <div>
                <span data-copy>#fe7c64</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
        <div class="flex stretched matrix-bg width-100 padding-md">
            <div>matrix</div>
            <div>
                <span data-copy>#00ff4e</span>
                <span class="copy-data-icon" data-icon="content_copy" title="Copy"></span>
            </div>
        </div>
    </div>
</div>

## Technical Implementation

Using these colors in your project is straightforward. To apply colors to elements, simply assign one of the following class patterns:

- <code>{color-name}</code> - Applies the color to text
- <code>{color-name}-bg</code> - Applies the color as a background
- <code>{color-name}-link</code> - Formats the element as a link with the specified color

For example:
<div class="card text-content-caption padding-lg">
    <div>&lt;span class="red"&gt;<span class="red">Error message</span>&lt;/span&gt;</div>
    <div>&lt;span class="ocean-bg white"&gt;<span class="ocean-bg white">Ocean background, white text</span>&lt;/span&gt;</div>
    <div>&lt;a class="cherry-link"&gt;<a class="cherry-link" href="">Cherry link</a>&lt;/a&gt;</div>
</div>

Remember that just because these color classes are available doesn’t mean they should be used extensively. The most effective interfaces often use color sparingly, relying on it only when necessary to highlight truly important information or actions.

<!-- <h2>Themes</h2>
<p>By default, the system includes a dark theme where the roles of key colors are inverted. This provides users with viewing options that accommodate different environments and preferences while maintaining the same information hierarchy.</p>
<p>To ensure projects using this system maintain their unique visual identity rather than appearing as clones, customization through themes is recommended. This can be achieved by implementing brand-specific color coding and modifying the base color values.</p>

<p>A particularly effective approach is to subtly incorporate your brand color into the grayscale palette. Even a slight tint toward your primary brand color can create a distinctive visual identity without compromising the system's structural integrity.</p>

<p>Developers can create custom themes by following the implementation guidelines in the <a href="/styles/themes/">Theming Section</a>. This allows for appropriate customization while preserving the core design principles and user experience benefits of the system.</p> -->
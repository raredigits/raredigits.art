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
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-lightest-bg width-100 padding-md">
            <div>gray-lightest</div>
            <div>
                <span data-copy>#fafafa</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-light-bg width-100 padding-md">
            <div>gray-light</div>
            <div>
                <span data-copy>#f0f0f0</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-mid-light-bg width-100 padding-md">
            <div>gray-mid-light</div>
            <div>
                <span data-copy>#e4e4e4</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-bg width-100 padding-md">
            <div>gray</div>
            <div>
                <span data-copy>#cccccc</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-trans-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>gray-trans</div>
            <div>
                <span data-copy>#888888</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-mid-dark-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>gray-mid-dark</div>
            <div>
                <span data-copy>#666666</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-dark-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>gray-dark</div>
            <div>
                <span data-copy>#333333</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched gray-darkest-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>gray-darkest</div>
            <div>
                <span data-copy>#191919</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched black-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>black</div>
            <div>
                <span data-copy>#000000</span>
                <span class="copy-data-icon rd-js-copy"></span>
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
--brand-color-dark: #3a8000; <span class="code-comment">// Darker variant: the primary button's hover; white text on it reads at 4.9:1</span>
--brand-color-link: #00b300; <span class="code-comment">// Link underlines and their hover fill</span>
</code></pre>

### Technical Colors

Technical colors are used to highlight important info: statuses, warnings, and errors.

<div class="card text-content-caption padding-lg">
    <div class="column width100">
        <div class="flex stretched yellow-bg width-100 padding-md">
            <div>yellow — for warnings</div>
            <div>
                <span data-copy>#ffe000</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched red-bg width-100 padding-md">
            <div>red — for errors</div>
            <div>
                <span data-copy>#ff0000</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched green-bg white width-100 padding-md copy-data-icon--light">
            <div>green — for success</div>
            <div>
                <span data-copy>#389e0d</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched blue-bg white width-100 padding-md copy-data-icon--light">
            <div>blue — the signal</div>
            <div>
                <span data-copy>#1677ff</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
    </div>
</div>

Technical colors should be used strictly for their intended purpose — a designer must avoid inflating the importance of content that isn’t truly critical.

### Semantic Colors

<div class="meta-info">css/modules/colors/_semantic.scss</div>

Components that signal a state read a role, not a hue. Four roles point at the technical colors above:

<div class="table-scroll">
<table class="table-small">
    <tr>
        <th>Role</th>
        <th>Default</th>
        <th>Meaning</th>
    </tr>
    <tr>
        <td class="nobr"><code>--signal</code></td>
        <td class="nobr"><code>var(--blue)</code></td>
        <td>Technical information, the main chart color</td>
    </tr>
    <tr>
        <td class="nobr"><code>--success</code></td>
        <td class="nobr"><code>var(--green)</code></td>
        <td>Done, passed</td>
    </tr>
    <tr>
        <td class="nobr"><code>--warning</code></td>
        <td class="nobr"><code>var(--yellow)</code></td>
        <td>Caution: read before you go on</td>
    </tr>
    <tr>
        <td class="nobr"><code>--danger</code></td>
        <td class="nobr"><code>var(--red)</code></td>
        <td>An error, a destructive action</td>
    </tr>
</table>
</div>

Four aliases name the same colors where the meaning is different. They follow the role they point at:

<div class="table-scroll">
<table class="table-small">
    <tr>
        <th>Alias</th>
        <th>Points at</th>
        <th>Meaning</th>
    </tr>
    <tr>
        <td class="nobr"><code>--positive</code></td>
        <td class="nobr"><code>var(--success)</code></td>
        <td>A financial figure that changed for the better</td>
    </tr>
    <tr>
        <td class="nobr"><code>--negative</code></td>
        <td class="nobr"><code>var(--danger)</code></td>
        <td>A financial figure that changed for the worse</td>
    </tr>
    <tr>
        <td class="nobr"><code>--neutral</code></td>
        <td class="nobr"><code>var(--warning)</code></td>
        <td>A financial figure that did not change</td>
    </tr>
    <tr>
        <td class="nobr"><code>--fail</code></td>
        <td class="nobr"><code>var(--danger)</code></td>
        <td>A check or an operation that did not go through</td>
    </tr>
</table>
</div>

Each role and each alias has its own `-bg` twin: the color at 25%, a fill to set text on. Every swatch below is the token as a stripe on its own `-bg`:

<div class="card text-content-caption padding-lg">
    <div class="column gap-xs">
        <div class="padding-sm" style="background: var(--signal-bg); border-left: var(--space-xs) solid var(--signal)"><code>--signal</code> on <code>--signal-bg</code></div>
        <div class="padding-sm" style="background: var(--success-bg); border-left: var(--space-xs) solid var(--success)"><code>--success</code> on <code>--success-bg</code></div>
        <div class="padding-sm" style="background: var(--warning-bg); border-left: var(--space-xs) solid var(--warning)"><code>--warning</code> on <code>--warning-bg</code></div>
        <div class="padding-sm" style="background: var(--danger-bg); border-left: var(--space-xs) solid var(--danger)"><code>--danger</code> on <code>--danger-bg</code></div>
        <div class="padding-sm" style="background: var(--positive-bg); border-left: var(--space-xs) solid var(--positive)"><code>--positive</code> on <code>--positive-bg</code></div>
        <div class="padding-sm" style="background: var(--negative-bg); border-left: var(--space-xs) solid var(--negative)"><code>--negative</code> on <code>--negative-bg</code></div>
        <div class="padding-sm" style="background: var(--neutral-bg); border-left: var(--space-xs) solid var(--neutral)"><code>--neutral</code> on <code>--neutral-bg</code></div>
        <div class="padding-sm" style="background: var(--fail-bg); border-left: var(--space-xs) solid var(--fail)"><code>--fail</code> on <code>--fail-bg</code></div>
    </div>
</div>

Where they are used: the <a href="/styles/typography/text-content/#callouts">callout variants</a> (`.callout-success`, `-warning`, `-danger`; `.callout-signal` stays black, with no fill), a [KPI delta](/styles/bricks/panels/#stats) (`--positive` up, `--negative` down), a [form field](/styles/interactive/forms/) (`--success` when right, `--fail` when invalid), the [danger button](/styles/interactive/buttons/) (`--danger`) and the keyboard focus ring (`--focus-ring-color: var(--signal)`; an own `--focus-ring-color` on `:root` still wins).

To change what a meaning looks like, re-map the role once, not every component. Re-map it on `:root`: the aliases and the `-bg` twins are resolved there and follow. On a single surface, restate them too:

<pre class="text-content-caption"><code>:root {
    --warning: var(--orange); /* --neutral and both -bg follow */
}

.report {
    --danger: var(--cherry);
    --danger-bg: color-mix(in srgb, var(--danger) 25%, transparent);
}</code></pre>

They are signal colors for stripes, borders and fills, not for text: none of them reaches 4.5:1 as body text on the light surfaces. Keep the words in the text colors and say the state in words too, so the color is never the only cue.

`--signal` is kept apart from `--brand-color`, which is identity: link highlights, brand marks.

#### Surface

`--surface-current` is the background of the surface an element sits on: the page's `--bg-color`, unless a `.card` or a `.card-inverted` sets its own (each paints its background with it). A `.panel` paints no background and sets none, so the surface behind it passes through. On paper it is white; in an island, which sits on the host's background, set it yourself. Charts paint their label plates with it from RareCharts 0.9.8_7; see [Surfaces](/styles/colors/chart-tokens/#surfaces).

### Chart Tokens

<div class="meta-info">css/modules/charts/_index.scss</div>

The colours a chart takes from the page (its series, text, axes and gridlines, range controls and tooltip) have names of their own, `--chart-*`, each pointing at a token on this page. RareCharts reads them first, from its 0.9.8_7. The full list is on [Chart Tokens](/styles/colors/chart-tokens/).

### Supporting Colors

<div class="meta-info">css/modules/colors/_supporting.scss</div>

A limited set of supporting colors is available for specific purposes like data visualization and thematic section coding:

<div class="card text-content-caption padding-lg">
    <div class="column width100">
        <div class="flex stretched cherry-bg white width-100 padding-md">
            <div>cherry</div>
            <div>
                <span data-copy>#86241a</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched plum-bg white width-100 padding-md">
            <div>plum</div>
            <div>
                <span data-copy>#4e4153</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched ocean-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>ocean</div>
            <div>
                <span data-copy>#2f7395</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched orange-bg width-100 padding-md">
            <div>orange</div>
            <div>
                <span data-copy>#fa8c16</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched pink-bg width-100 padding-md">
            <div>pink</div>
            <div>
                <span data-copy>#ffd6e7</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched princess-bg width-100 padding-md">
            <div>princess</div>
            <div>
                <span data-copy>#ff00f5</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched safari-bg width-100 padding-md">
            <div>safari</div>
            <div>
                <span data-copy>#ffb038</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched purple-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>purple</div>
            <div>
                <span data-copy>#722ed1</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched pen-bg white width-100 padding-md">
            <div>pen</div>
            <div>
                <span data-copy>#0033a0</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched tiffany-bg white width-100 padding-md">
            <div>tiffany</div>
            <div>
                <span data-copy>#53c9e9</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched blueberry-bg gray-light width-100 padding-md copy-data-icon--light">
            <div>blueberry</div>
            <div>
                <span data-copy>#221e4d</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched coral-bg width-100 padding-md">
            <div>coral</div>
            <div>
                <span data-copy>#fe7c64</span>
                <span class="copy-data-icon rd-js-copy"></span>
            </div>
        </div>
        <div class="flex stretched matrix-bg width-100 padding-md">
            <div>matrix</div>
            <div>
                <span data-copy>#00ff4e</span>
                <span class="copy-data-icon rd-js-copy"></span>
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
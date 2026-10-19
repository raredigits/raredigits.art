---
layout: page.njk
title: "Text Elements / Sidenotes"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/notes/'
---

<div class="meta-info">
    css/modules/typography/_notes.scss
</div>

<section id="references">
    <h2>References and Notes</h2>

    <p>A reference mark is a <code>&lt;sup&gt;</code> holding a link to its note; the note links back. Plain ids and links do the work — no script, and the browser's own back button returns the reader to the text.<sup><a href="#note-1" id="ref-1" aria-label="Note 1">1</a></sup> The mark drops the link underline, and the note the reader jumped to is marked while it is the target.<sup><a href="#note-2" id="ref-2" aria-label="Note 2">2</a></sup></p>

    <div class="footnote">
        <ol>
            <li id="note-1">Each note's id matches the mark's link, and its back link points at the mark's id. <a href="#ref-1" aria-label="Back to reference 1">↩</a></li>
            <li id="note-2">The fixed header is accounted for: the page scrolls the target clear of it. <a href="#ref-2" aria-label="Back to reference 2">↩</a></li>
        </ol>
    </div>

<pre><code>&lt;p&gt;… the text.&lt;sup&gt;&lt;a href="#note-1" id="ref-1" aria-label="Note 1"&gt;1&lt;/a&gt;&lt;/sup&gt;&lt;/p&gt;

&lt;div class="footnote"&gt;
    &lt;ol&gt;
        &lt;li id="note-1"&gt;The note. &lt;a href="#ref-1" aria-label="Back to reference 1"&gt;↩&lt;/a&gt;&lt;/li&gt;
    &lt;/ol&gt;
&lt;/div&gt;</code></pre>

    <p>The <code>.footnote</code> block and its top rule keep to the width of the prose. Numbered automatically, with one source of truth for the order, is a full footnote engine — that comes later. For an article with a handful of notes, numbering by hand is fine.</p>
</section>

## Sidenotes

<div class="sidenote-wrapper">
    <p>Sidenotes are the typographic equivalent of having a knowledgeable friend lean over and whisper context while you’re reading. They provide supplementary information, references, or commentary without disrupting the main narrative flow—because nothing kills momentum quite like footnotes at the bottom of the page that make you scroll like it’s 1995<sup>1</sup>.</p>
    <div class="sidenote handwritten">
        <p><sup>1</sup> You weren’t born yet then, right?</p>
    </div>
</div>

<div class="sidenote-wrapper">
    <div>
        <p>We provide two distinct elements for different annotation needs:</p>
        <ul>
            <li><code>sidenote</code> — The workhorse of our marginalia system. This is a flexible block element that can contain text, images, interactive elements, or your grandmother’s secret borscht recipe if that’s somehow relevant to your content. Built on a 9-column grid system, it ensures the main content column remains unbroken while providing unlimited creative freedom for supplementary content. Use this when you need a proper sidebar conversation.</li>
            <li><code>aside-footer</code> — The rebel that doesn’t follow margin rules. This element appears alongside the paragraph <em>after</em> the one being commented on, rather than beside it. Useful for logical asides or when the space next to the original paragraph is already occupied by another sidenote (it happens—some content is just chatty). On mobile, it reverts to following the commented paragraph directly, because we’re not complete anarchists.</li>
        </ul>
    </div>
    <div class="sidenote">
        <p>In Rare Styles, sidenotes live in the right margin of text pages, creating a visual dialogue between primary and secondary content. On mobile devices, where margins are a luxury we can’t afford, they gracefully fold into the main column immediately after the commented element. They’re styled with smaller font sizes and secondary colors to signal their supporting role—think backup dancers, not the main act.</p>
    </div>
</div>

<div class="sidenote-wrapper">
    <div>
        <p>To help readers quickly parse the nature of sidenote content, we provide several modifier classes that add visual cues:</p>
        <ul>
            <li><code>sidenote-bookmark</code> — Decorated with a bookmark icon, this signals editorial comments, observations, or quick asides. Perfect for “by the way” moments that deserve their own visual identity.</li>
            <li><code>sidenote-link</code> — For reference sidenotes and external citations. The icon treatment makes it immediately clear that this sidenote is pointing elsewhere, saving readers the cognitive overhead of discovering this mid-sentence.</li>
            <li><code>sidenote-attach</code> — The paperclip of the digital age. Marks sidenotes containing supplementary materials, downloads, related resources, or that PDF your colleague keeps referencing but never actually shares. Makes “additional resources” actually discoverable.</li>
            <li><code>sidenote-bulb</code> — The lightbulb moment carrier. Use this for helpful tips, practical insights, and those “why didn’t I think of that” ideas that make readers feel smarter. Because sometimes a good lifehack deserves more fanfare than plain text can provide.</li>
            <li><code>sidenote</code> — When you need that personal touch or want to simulate marginalia in a vintage textbook. Use sparingly, unless you’re writing a manifesto (we don’t judge).</li>
        </ul>
    </div>
    <div class="sidenote sidenote-link">
        <p>Look at <a href="/kb/choosing-the-right-font/">example</a></p>
        <p>Or <a href="/kb/hamburger-menu-saga/">another one</a></p>
    </div>
</div>

The system is extensible—you can create your own sidenote types by adding custom selectors to your styles. Simply define a new class with a <code>::before</code> pseudo-element and mask any icon from the shipped SVG set (or your own SVG):

<div class="text-content-width"><pre><code>.sidenote-memory::before {
content: "";
width: 1em;
height: 1em;
background-color: currentcolor;
mask: url("images/icons/cognition-200.svg") no-repeat center / contain;
}
</code></pre></div>
<div class="sidenote-wrapper">
    <p>This opens the door to domain-specific marginalia: <code>.sidenote-warning</code> for caveats, <code>.sidenote-experiment</code> for research notes, <code>.sidenote-coffee</code> for productivity tips that require caffeine. The only limit is your imagination — and the set you ship: any Material Symbols glyph can be added via <code>scripts/fetch-icons.py</code> (see the <a href="/styles/icons/">Icons</a> page).</p>
    <div class="sidenote sidenote-memory">
        <p><strong>Memory Activation:</strong> Remember <a href="/manifesto/principles/">Rareism principles</a>. Just because you <em>can</em> create custom sidenote types doesn’t mean you <em>should</em> turn your margins into an icon bazaar.</p>
    </div>
    <p>Don’t forget to add your new selector to the shared icon properties group to ensure consistent positioning and styling:</p>
</div>
</section>

<pre class="text-content-width">
<code><span class="code-comment">// assets/css/modules/typography/_notes.scss</span>
.sidenote-attach::before,
.sidenote-link::before,
.sidenote-bulb::before,
.sidenote-memory::before {
font-size: var(--font-size-lg);
position: absolute;
top: -8px;
left: -16px;
color: var(--text-color-light);
}</code></pre>

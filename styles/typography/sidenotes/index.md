---
layout: page.njk
title: "Text Elements / Sidenotes"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/sidenotes/'
---

<div class="meta-info">
    css/modules/typography/_sidenotes.scss
</div>

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

The system is extensible—you can create your own sidenote types by adding custom selectors to your styles. Simply define a new class with a <code>::before</code> pseudo-element and specify any Material Icons name:

<div class="text-content-width"><pre><code>.sidenote-memory::before {
content: "cognition";
}
</code></pre></div>
<div class="sidenote-wrapper">
    <p>This opens the door to domain-specific marginalia: <code>.sidenote-warning</code> for caveats, <code>.sidenote-experiment</code> for research notes, <code>.sidenote-coffee</code> for productivity tips that require caffeine. The only limit is your imagination and Google’s Material Icons library.</p>
    <div class="sidenote sidenote-memory">
        <p><strong>Memory Activation:</strong> Remember <a href="/manifesto/principles/">Rareism principles</a>. Just because you <em>can</em> create custom sidenote types doesn’t mean you <em>should</em> turn your margins into an icon bazaar.</p>
    </div>
    <p>Don’t forget to add your new selector to the shared icon properties group to ensure consistent positioning and styling:</p>
</div>
</section>

<pre class="text-content-width">
<code><span class="code-comment">assets/css/modules/typography/_text-content.scss</span>
.sidenote-attach::before,
.sidenote-link::before,
.sidenote-bulb::before,
.sidenote-memory::before {
font-family: "Material Symbols Outlined";
font-size: var(--font-size-lg);
position: absolute;
top: -8px;
left: -16px;
color: var(--text-color-light);
}</code></pre>

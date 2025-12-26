---
layout: post.njk
permalink: "kb/{{ title | slug }}/"
date: 2023-11-01
title: "Taming <pre>"
section: Dev
tags: html
author: Jeeves
---

Web development has this lovely habit: something looks trivial, obvious, almost boring… until you actually use it. Then it quietly erodes your workday, your confidence, and maybe a bit of your belief that the web was designed on purpose.

Displaying raw code in documentation sounds like the most boring, solved problem in the world. HTML literally has a special tag for it:

```html
<pre>
  <code> … </code>
</pre>
```

Done, right?

Hahaha. No.

<div class="sidenote-wrapper">
  <p>Using <code>&lt;pre&gt;</code> in production is a very HTML experience: it works beautifully,
right up until the moment something slightly real happens, and then it starts
behaving like a well-meaning intern who confidently does the opposite of what
you asked — and insists that this is, in fact, the standard.</p>
  <div class="sidenote">
    <p>No need to explain, gimme <a href="#solution">solution</a>!</p>
  </div>
</div>

Here’s why.

### Problem 1: HTML Inside &lt;pre&gt; Still Gets Parsed

The first surprise comes from a very simple misunderstanding: `<pre>` was never
really designed to “show code safely.” It was designed to *preserve whitespace*.
That’s it. It keeps your spaces and newlines, and then politely lets the rest of
HTML behave exactly like HTML always behaves: by enthusiastically trying to execute
and restructure anything that looks like a tag.

Browser sees:

```html
<pre>
  <code>
    <div>hello</div>
  </code>
</pre>
```

Browser thinks: “Oh cool, a `<div>`! Let me rear-range your DOM like I’m cleaning my room by throwing everything out the window.”

So instead of “please show this snippet to the reader,” your page quietly turns it into “please run this snippet inside my layout, ” and now you don’t have a code block, you have live HTML bursting out of containment like a lab experiment escaping through the vents.

What people normally do? There’s a familiar buffet of coping strategies:

- Escape everything manually: `&lt;div&gt;` and `&gt;` and your sanity evaporates.
- Bring in [Prism](https://prismjs.com) / [Highlight.js](https://highlightjs.org) — basically hiring a professional bouncer to stop your browser from “helpfully” interpreting your example.
- Wrap code inside `<script type="text/plain">` like you’re a magician smuggling contraband through security.

Or just scream and give up.

### Problem 2: Tabulation and Formatting Randomly Die

You’d think that `<pre>` “preserves formatting.” And it does… right up until your content passes through the beloved modern publishing gauntlet: Markdown, Liquid, Nunjucks, Eleventy, Astro, Hugo, Jekyll, Next.js MDX, or whatever clever static-site framework you swore would “simplify everything this time.”

Well, suppose you are a relatively civilized person, and your documentation is written in Markdown. Markdown even gives you fenced code blocks:

{%- capture markdownCodeSnippet -%}
```css
// your styles here ...
```
{%- endcapture -%}

<div class="code-block text-content-width">
  <pre><code id="snippet-1" class="language-css">{{ markdownCodeSnippet | escape }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-1"></button>
</div>

You expected to see cleanly formatted CSS. But suddenly, after rendering in the browser, your perfectly innocent code block turns into something like this:

```html
<code>
"body {...}"
<p>header {...}</p>
<p>.title {...}</p>
<p>footer {...}</p>
</code>
```

What happened? Something in the chain noticed that “blank line = new paragraph, ” proudly did what the spec told it to do, and inserted friendly `<p>` tags… inside your `<code>` block. Markdown, in particular, is incredibly enthusiastic about this. When it sees a blank line, it tilts its head like a golden retriever and proudly declares: “Ah yes, clearly this is a paragraph structure.” Afterwards, you don’t get a CSS block — you get an essay, because consistency is for weaker systems.

And the worst part is: it isn’t wrong. It is simply doing its job. Its job just happens to be making you question every positive emotion you ever had toward web standards.

### Problem 3: The Copy Button of Doom

Maybe you’re kind. Maybe you think about users. Maybe you want a sweet « Copy » button so they don’t have to select text like cavemen.

<div class="text-content-width center-x padding-b-lg font-size-xxl">
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button>
</div>

And the obvious answer is: just do what GitHub does. Let JavaScript stroll across the page, find every `<pre>`, invisibly wire it with a clipboard button, and turn your documentation into a frictionless UX paradise where code leaps obediently into the user’s buffer and everyone applauds like we’ve solved civilization.

But maybe you don’t want a global script quietly modifying your entire page. And maybe you only want copy buttons on *some* blocks, not on every stray `<pre>` fragment. And maybe — just to make things more interesting — you’re already juggling Eleventy and Liquid and Markdown and Nunjucks and HTML, plus whatever cosmic entity lives in your build pipeline pretending to be helpful.

At that point the system stops being elegant, stops being predictable, and starts producing fire purely out of enthusiasm.

### The “Build a Rocketship to Press One Button” Option

At this point, many teams just give up on dignity and say: “Fine. Let’s install three plugins, a build pipeline transformer, a shortcode framework, two Markdown extensions, and some custom JavaScript glue. Surely that will make the *copy button* behave.”

And technically, it works. Eventually. After a few hours of massaging config files, aligning CSS, fighting mysterious whitespace behavior, learning which library wants fenced code, which one wants HTML, and which one wants a blood sacrifice at sunset. Every additional dependency brings its own personality, its own philosophy, and its own definition of “correct.”

Then you close your eyes and hope the maintainers of any of these libraries don’t update something critical next week. You hope security advisories don’t appear. You hope you never have to remember why this particular chain of plugins exists in the first place. Because now you’re not just adding a copy button — you’re adopting a small ecosystem of complexity and quietly agreeing to be responsible for it for the foreseeable future.

It’s “elegant” in the same way duct-taping a nuclear reactor is elegant: technically operational, emotionally exhausting, and one slightly wrong vibration away from an impressive light show.

<a id="solution"></a>

## The Solution

No extra JS frameworks.
No plugin farms.
No coping mechanisms involving alcohol.

Just a boring, reliable approach that works.

<div class="air-md"></div>

{% raw %}
**Step 1. Create snippet.** 

We start by taking the code we want to show and moving it *out of harm’s way*. That means we wrap it in a Liquid `{% capture %}` block so the build pipeline treats it as inert text instead of something it should “interpret, ” “optimize, ” or creatively reinterpret according to its spiritual beliefs. In Liquid, `{% capture %}` basically says: “This is a string. Please don’t be clever.”
{% endraw %}

So we do this:

{%- capture captureSnippet -%}
{% raw %}{%- capture codeSnippet -%}
<div id="codeSnippet">
  ...
</div>
{%- endcapture -%}
{% endraw %}
{%- endcapture -%}

<div class="code-block text-content-width">
  <pre><code id="snippet-2" class="language-css">{{ captureSnippet | escape }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-2"></button>
</div>

Now the snippet lives safely as plain text.  
No Markdown rules touch it.  
No templating system improvises.  
Nobody “helps”.

<div class="air-md"></div>

**Step 2. Render the snippet on your terms.**

Later, when we actually want to show this snippet, we explicitly place it inside `<pre><code>` and tell the browser: “Display this. Literally. Calmly.”

{%- capture codeBlockSnippet -%}
<div class="code-block">
  {% raw %}<pre><code id="snippet">{{ codeSnippet | escape }}</code></pre>{% endraw %}
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet"></button>
</div>
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-3" class="language-css">{{ codeBlockSnippet | escape }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-3"></button>
</div>

escape is doing the important emotional labor here. It turns `<` into `&lt;` and `>` into `&gt;`, browser stops being “creative”, `<pre>` preserves lines, copy button works. Life is briefly good.

<div class="air-md"></div>

**Step 2a. CSS Is Worse (Of Course).**

HTML inside `<pre>` is one category of pain. CSS, however, politely introduces an entirely different one.

Because this is where Markdown really leans in. It sees blank lines inside your CSS block and, with great confidence and zero hesitation, begins inserting `<p>` tags *inside your `<code>`*, like a toddler enthusiastically decorating a cake with olives. The browser is technically not wrong, Markdown is technically not wrong, but the end result is emotionally devastating.

So for CSS we add a very small but incredibly calming trick:

{%- capture cssSnippet -%}
{% raw %}{{ codeStyles | escape | replace: '\n', '&#10;' }}{% endraw %}
{%- endcapture -%}

<div class="code-block">
  <pre><code id="snippet-4">{{ cssSnippet | escape | replace: '\n', '&#10;' }}</code></pre>
  <button class="copy-data-icon" title="Copy link" data-icon="content_copy" data-copy-target="#snippet-4"></button>
</div>

escape keeps the browser from executing anything. `replace` swaps literal newlines with `&#10;`, which Markdown politely ignores but browsers happily render as real line breaks. Markdown stops “helping.” Indentation lives. Formatting survives.

Victory.

A slightly questionable, morally grey victory.

But still victory.

<details>
<summary>Quick note on <code>| escape</code> and other liquid filters</summary>

Liquid gives you a few knobs here:

&lt;div&gt;

<table class="table-small">
    <tr>
        <th>Filter</th>
        <th>Purpose</th> 
    </tr>
    <tr>
        <td><code>| escape</code></td>
        <td>Converts HTML tags into entities so they render as text.</td>
    </tr>
    <tr>
        <td><code>| strip</code></td>
        <td>Removes leading and trailing whitespace if you want a tighter block.</td>
    </tr>
    <tr>
        <td><code><nobr>| replace: '\n', '&amp;#10;'</nobr></code></td>
        <td>Useful when Markdown insists on turning blank lines into <code>&lt;p&gt;</code> tags; replacing raw newlines with <code>&amp;#10;</code> keeps formatting without triggering Markdown’s “this must be prose” reflex.</td>
    </tr>
</table>
    
You can mix these depending on how cursed your build pipeline is.
</details>

<div class="air-md"></div>

**Step 3. Enable Copy-to-Clipboard.**

<div class="sidenote-wrapper">
  <p>Once the snippet safely renders as text, the final step is simply letting users copy it without wrestling their trackpads like it’s 2004. For that we use a small, boring, reliable vanilla JavaScript helper. It listens for clicks on the “Copy” button, grabs the content of the associated data, and sends it straight to the clipboard. No frameworks, no magic, no hidden emotional consequences.</p>
  <div class="sidenote sidenote-link">
    <p>You can read more and grab the script here: <a href="/scripts/copy-to-clipboard/">copy-to-clipboard.js</a></p>
  </div>
</div>

Just make sure to include the script on the page — either from your local assets or via CDN — otherwise the button will sit there like a decorative confidence indicator instead of a feature.

## Final Thoughts

{% raw %}
Here’s the short version of what we learned, so you don’t have to collect the same bruises.

`{% raw %}` is not a magic shield — it only calms Liquid, while Markdown will happily continue rearranging your work with a confident smile.

`<pre>` behaves predictably only when the entire surrounding context is pure HTML territory; once you mix Markdown and templating engines, the rules start colliding in ways that feel less like a specification and more like jazz improvisation.

Liquid’s whitespace controls (`{%- … -%}`) are surprisingly powerful emotional support tools. And, most importantly, browsers were never designed to “show HTML safely inside HTML.” Expecting them to do so is like asking a tiger to babysit a steak: everyone involved is technically behaving correctly, and it still goes badly.

`<pre>` itself is not broken. It is simply following rules written in a very different era, before modern documentation systems, static-site pipelines, Markdown layers, copy buttons, mobile browsers, and the fragile dream of happiness in web development. So if your goal is to show code, keep formatting, add a copy button, and not bury your life under libraries, plugins and dependencies, this approach works. Reliably. Sanely. Mostly.

And if future, you is reading this because it somehow broke again… well, you chose this profession.
{% endraw %}
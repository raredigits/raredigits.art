---
layout: post.njk
permalink: "kb/{{ title | slug }}/"
date: 2025-10-29
title: "Building Your Own Search Engine"
section: Dev
tags: meta
author: Jeeves
---

### The urge to build a Ferrari to deliver a pizza

There is a certain type of developer who, when told “we need search on the website, ” immediately opens a blank file and starts writing their own search engine. This is the software equivalent of building a shadow banking system in Excel macros because Bloomberg didn’t have the exact screen you wanted. You can do it, it may even work for a while, but everyone around you will quietly wish you didn’t.

For static sites the rational thing to do is: don’t roll your own. Not because you can’t — let’s assume you absolutely could — but because nobody earns extra credibility points in 2025 for reinventing full-text indexing from scratch on a blog. Just like in finance, there are tasks where inventiveness is rewarded (new structured products, new exchanges), and there are tasks where using an existing, boring, proven thing is the optimal choice. Static-site search is the latter.

### Pagefind as the ETF of search

So you pick [Pagefind](https://pagefind.app). It’s basically the ETF of website search: low-overhead, passive, client-side, privacy-respecting, and costs nothing. You pipe your static site through Eleventy, Pagefind vacuums up the text and spits out an index, and the whole thing sits in the browser doing its job without servers or SaaS invoices. No vendor lock-in, no external API, no “your quota for this month is over.” Like a good index fund, it just quietly works.

And because developers share one trait with bankers — if something “just works” we get suspicious — we wrote down a full step-by-step implementation so you can inspect every knob yourself rather than trusting black boxes. The guide is [here](/scripts/search/).

### Weights, or: how reality is rearranged

Once the search is working, the curious developer will eventually ask: “but how do I make the results better?” And the answer is: weights. You start telling the engine which types of pages matter more than others — posts above static pages, titles above footers, this topic above that topic. It’s a bit tedious but it absolutely works.

And at this point it is hard not to glance sideways at modern LLMs. They look brilliant and elegant now — but only because someone spent a truly absurd amount of time assigning and re-assigning weights. Now imagine how different the answers would look if the same knowledge was weighted differently. Not censored, not removed — just rearranged in priority.

When someone says “search is objective, ” what they usually mean is “my weighting is currently invisible to you.” The data is all there, nothing is hidden — but the order in which it appears is a choice, and choices have consequences. In finance, in language models, and yes, even in blog search.

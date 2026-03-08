---
layout: post.njk
permalink: "kb/{{ title | slug }}/"
date: 2026-02-09
title: "Is Bitcoin mining actually a discount? We ran the numbers"
section: Chart
tags: analytics
author: Jeeves
---

There’s a theory that mining Bitcoin is <em>cleverer</em> than buying it. Instead of paying market price on an exchange, you plug in a machine, feed it electricity, and it manufactures coins for you at a lower cost. The math, in principle, works. Whether it works in practice is a different question.

We had almost a year of real data to find out: a JSON feed from a mining pool with daily hashrate, revenue, and BTC output — the kind of file that is technically complete and completely unreadable — plus eleven months of actual electricity bills. No model, no projections. Just receipts.

<div class="card-dashboard-bordered card-caption" id="mining-hashrate-profit"></div>

Four charts later, the answer is: <strong>sometimes</strong>. The window is real, the discount exists, and then the network difficulty catches up and the window closes. Exactly when, by how much, and what it costs while you wait — <em>that’s what the charts show</em>.

The mining case is also a worked example of something more general: what it looks like when raw operational data becomes a decision-making tool.

The same logic applies whether you’re tracking mining margins or any other business with volatile revenue and fixed costs. You already have the data. The question is whether you’re looking at it or just storing it?

→ <a href="/examples/charts/btc-mining-analysis/">Read the full analysis</a>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-hashrate-profit.js"></script>

---
layout: page.njk
title: "Analysing Bitcoin Mining Profit"
section: "Styles"
displaySidebar: false
permalink: '/examples/charts/btc-mining/'
---

Bitcoin mining is sometimes described as a <em>clever way to buy Bitcoin at a discount</em>. The argument goes roughly like this: instead of purchasing BTC on the market, you run a machine that converts electricity into coins. There may be periods when mining looks barely profitable — or even unprofitable — but over a longer horizon the economics can still work out well.

That idea sounds plausible. But it is also something we can test.

Okay, let’s imagine we decide to start mining Bitcoin. The story sounds simple enough: you plug in a miner, it runs, and it makes money. What could possibly go wrong?

Mining pools publish daily statistics for each worker. We receive daily stats in a simple JSON format:

<pre class="text-content-caption"><code>{
  "date": "2025-02-01",
  "hashrate_th": 235.219,
  "profit_btc": 0.00013751,
  "price_usd": 102039.29,
  "profit_usd": 14.03
}</code></pre>

Based on this dataset, we build a chart that shows a miner’s daily earnings alongside the BTC spot price. Same dates, the same source array, two axes: earnings on the left, BTC spot price on the right.

<div class="card-dashboard-bordered card-caption" id="mining-hashrate-profit"></div>

Looking at the chart, the first thing that stands out is the <strong>steady decline in BTC output</strong>. The gray bars show how many coins the miner produces each day, and the trend is clearly downward (from 0.00013 BTC per day till 0.00009 at the end of the year). We often hear that mining competition increases over time as more hashpower joins the network. What is striking here is how <em>persistent</em> this effect is. The dataset covers almost a full year, yet the downward drift remains remarkably stable: the machine keeps hashing, but <strong>each day it earns slightly fewer coins</strong>.

Against this backdrop, revenue in USD mostly follows the BTC spot price, which is expected. When Bitcoin rises, dollar earnings rise as well; when the price falls, revenue declines.

But the relationship is not perfectly stable. For a while the two series move closer together, but later they begin to separate. Once the BTC price climbs above roughly $105k, miner revenue starts to lag behind the price move. In other words, <strong>price and earnings begin to diverge</strong>.

To examine this relationship more clearly, we can normalize both series and convert them into an index starting at 100. This brings the initial values to the same baseline and makes the changing distance between price and miner earnings much easier to see. No extra fetch, just a few lines of JS before <code>setData()</code>.

<div class="card-dashboard-bordered card-caption" id="mining-index"></div>

Looking at the indexed chart, the relationship becomes clearer.

Mining is not a fixed-income stream. It is a leveraged exposure to BTC price volatility with a structural drag from network competition. When the price of Bitcoin rises, miner earnings rise as well, but <em>more slowly</em>. The gap between the two lines gradually widens as <strong>network difficulty absorbs part of the upside</strong>.

For a while this can be easy to miss. Rising prices still lift dollar revenue, but once the price stops climbing, the underlying dynamic becomes obvious: difficulty keeps increasing, and <strong>miner earnings fall faster than the asset itself</strong>.

<div class="highlight">Mining behaves a bit like a trade with capped upside and uncapped downside</div>

At this point, however, we are still looking only at revenue. A miner does not simply collect dollars — the machine converts electricity into Bitcoin. Which means the real question is not just how revenue moves with the price of BTC, but how much of that revenue remains after paying for power.

Electricity is the main operating cost. Hardware can run for years, so the day-to-day economics largely come down to a simple spread: revenue minus power cost. If that spread is wide enough, it can cover equipment, infrastructure, and other overhead. If not, the economics quickly break down.

The next chart looks at this directly by comparing mining revenue with estimated electricity costs:

<div class="card-dashboard-bordered card-caption" id="mining-net-profit"></div>

What we see is a business with an extremely thin margin. Even in the best periods during the summer the operation earns roughly $1–2 per day, against revenue of about $13–14. In other words, the entire business runs on a margin of roughly 10–15% before accounting for hardware, cooling, hosting, or downtime.

That makes the economics fragile.

When Bitcoin rallies, revenue rises and the spread briefly opens. But when the price weakens, the system breaks down quickly. Network difficulty has already increased, electricity costs remain fixed, and the operation turns unprofitable almost immediately. On the chart this appears as a long red stretch beginning in October.

Electricity, in effect, acts as the anchor of the entire system. Bitcoin may be volatile, but the power meter is not. The machine keeps consuming energy regardless of whether the market price cooperates.

But there is another way to look at the same economics. Because mining looks a bit like running a factory whose output price is volatile but whose main input cost is fixed.

Instead of asking how much profit the miner makes each day, we can ask a simpler question: at what price is the miner actually buying Bitcoin?

Every day the machine consumes electricity and produces a small fraction of a coin. Dividing the daily electricity cost by the BTC output gives us an implied cost to produce one BTC. The next chart compares the electricity cost of mining one BTC with the market price of Bitcoin:

<div class="card-dashboard-bordered card-caption" id="btc-mining-cost"></div>

People sometimes describe Bitcoin mining as a way to buy Bitcoin at a discount. And sometimes it is. Early in the year, for instance, the electricity cost of producing one coin sits below the market price. In that regime the miner is effectively converting power into Bitcoin more cheaply than the market will sell it.

But the discount is not stable. It appears and disappears depending on two moving parts: the BTC price and the network difficulty. When the price rallies faster than difficulty rises, the spread briefly opens and mining looks attractive. When difficulty catches up — or the price stalls — the spread closes again.

The chart makes this visible. Through parts of the spring and summer the market price stays above the estimated electricity cost per coin, and mining looks profitable. Later in the year the lines cross. At that point the miner is effectively paying more for a Bitcoin in electricity than the market is asking.

Which leads to a slightly uncomfortable observation: mining is sometimes a discounted way to acquire Bitcoin, but at other times it is simply a very elaborate way to buy Bitcoin at a premium.

In other words, the miner is not really setting the price of Bitcoin. The miner is trading a spread — the difference between the market price of BTC and the cost of turning electricity into hashpower.

And like most spreads in finance, it does not stay open for very long.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-hashrate-profit.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-index.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-net-profit.js"></script>
<script src="/assets/charts/examples/line/btc-mining-cost.js"></script>

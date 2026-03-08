---
layout: page.njk
title: "Analysing Bitcoin Mining Profit"
section: "Styles"
displaySidebar: false
permalink: '/examples/charts/btc-mining-analysis/'
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

To a human, this is not particularly illuminating. A date, a hashrate, a handful of numbers. Repeat for three hundred days and you have a spreadsheet that tells you nothing at a glance.

So let’s draw a chart instead.

## Drawing the chart

The numbers we care about are revenue and price. One tells you what the miner earned; the other tells you why. To show both on the same timeline without one overwhelming the other, we use a <a href="/charts/combined/">combined</a> `DualAxes` chart — earnings on the left axis, BTC spot price on the right. Same dates, same source array, two scales.

One `setData()` call and the mechanical feed becomes something you can actually read.

<div class="card-dashboard-bordered card-caption" id="mining-hashrate-profit"></div>

The first thing the chart tells you is that the miner is losing ground. Not dramatically, but <strong>steadily</strong>. The gray bars track daily BTC output, and they slope downward for the entire year. From roughly 0.00013 BTC per day in February to around 0.00009 by December. The machine is doing the same work. The network is just getting more competitive, and the miner’s share of the reward keeps shrinking. This is not a bad week. This is physics.

Dollar revenue, meanwhile, <em>mostly</em> tracks the BTC price — which is exactly what you’d expect. Bitcoin goes up, earnings go up. Bitcoin goes down, earnings go down. So far, so intuitive.

Except <em>it’s not quite that clean</em>. Once the BTC price climbs past roughly $105k, something starts to slip. Revenue rises, but not as fast as the price. The two lines that were moving together <em>begin to drift apart</em>. The asset is appreciating. The miner’s cut of it is not keeping up.

## Calculating the divergence

Divergence, in this context, is simple: BTC price goes up by X%, miner revenue goes up by less than X%. The gap between those two numbers is what network difficulty quietly takes off the table.

To make it visible, we index both series to 100 on day one and let them run. Whatever distance opens up between the two lines is the structural drag — difficulty compounding in real time.

<details>
<summary>How-to Index</summary>

The mechanics are straightforward. We apply a 7-day rolling average to smooth daily settlement noise, pin both series to their starting values, and divide everything through:

```js
const BASE_PRICE  = active[0].price_usd;
const BASE_PROFIT = profitMA[0];

const priceIndex  = active.map(r => (r.price_usd  / BASE_PRICE)  * 100);
const profitIndex = active.map((_, i) => (profitMA[i] / BASE_PROFIT) * 100);
```

The divergence series is just the difference between the two — how many index points of price appreciation the miner failed to capture. Then a single `.setData ()` call handles the rest.
</details>

<div class="air-md"></div>

<div class="card-dashboard-bordered card-caption" id="mining-index"></div>

The indexed chart makes the structure hard to ignore.

BTC price and miner earnings start at the same point and <em>immediately</em> begin to separate. The price runs ahead; earnings follow, <em>but at a discount</em>. That discount is not random noise — it is network difficulty, converting every price rally into a slightly smaller reward for everyone still mining.

The asymmetry is what matters. When Bitcoin rises, the miner participates, <strong>just less than you’d hope</strong>. When Bitcoin falls, the miner participates <em>fully</em>. Difficulty does not fall as fast as the price does.

<div class="highlight">Mining behaves a bit like a trade with capped upside and uncapped downside.</div>

Which is an <em>uncomfortable</em> thing to notice. But there’s a second problem we haven’t looked at yet.

Everything above is revenue. <em>Revenue is not profit.</em> The machine runs on electricity, and electricity costs money regardless of what Bitcoin is doing. The real question isn’t how much the miner earns — it’s how much is left after
the power bill arrives.

## Adding a new dataset

To find out, we pull in one more variable: estimated daily electricity cost.

<pre><code><span class="code-comment">// Daily electricity cost by month ($/day, actual billed consumption)</span>
const ELEC = {
  2: 10.936,  3: 10.877,  4: 12.180,  5: 12.577,
  6: 12.680,  7: 12.419,  8: 12.577,  9: 12.077,
  10: 12.577, 11: 12.270, 12: 12.423,
};</code></pre>

Plotted against revenue, it draws a fixed line across the chart, and everything below that line is loss.

<div class="card-dashboard-bordered card-caption" id="mining-net-profit"></div>

The pink line is electricity. It doesn’t care about Bitcoin.

It just sits there — flat, occasionally stepped upward when the rate changes, and waits for the revenue line to clear it. For roughly half the year, the revenue line doesn’t bother.

When it does, <strong>the margin is thin</strong>. On the best days the operation clears $1–2 on $13–14 in revenue — call it 10–15%. That is not a business; that is a savings account that requires a warehouse, a cooling system, and someone who knows what a terahash is. A <nobr>T-bill</nobr> would have been less work and paid about the same. A money market fund would have paid more. And nobody monitors a money market fund at 2am.

From October onward, <em>even that stops</em>. The red bars widen, the green ones disappear, and the operation settles into a steady, metronomic loss. Not a blowup — just arithmetic. Fixed costs, declining revenue, no exit button.

Which brings us back to the original premise.

## What did one Bitcoin actually cost?

We started from the idea that mining could be perceived as buying Bitcoin at a discount. The idea being that you convert cheap electricity into coins rather than buying them at market price. It’s a reasonable theory. <em>Let’s check the receipts.</em>

For each day in the dataset we know two things: how much electricity the miner consumed, and how much Bitcoin it produced. Dividing one by the other gives the <em>implied acquisition cost</em> — the electricity price of one BTC.

<pre class="text-content-caption"><code>const costPerBTC = electricity / r.profit_btc;</code></pre>

Plotted against the market price, it answers a simple question: was the miner <em>actually</em> getting a discount?

<div class="card-dashboard-bordered card-caption" id="btc-mining-cost"></div>

In February, the orange line sits above the blue one. The market price of Bitcoin is higher than what it costs in electricity to produce it. This is the scenario the mining optimists describe: you’re buying Bitcoin at a discount, just via a <em>power outlet</em>, a 3,500-watt ASIC, and a willingness to receive your Bitcoin in daily increments of 0.00013. <strong>It’s real</strong>, and for a while it’s quite good.

Then the lines converge. Then they cross.

By autumn, the blue line — the electricity cost of one coin — is running persistently above the market price. The miner is no longer buying Bitcoin at a discount. <strong>The miner is buying Bitcoin at a premium</strong>, through a process that involves significant capital expenditure, industrial electricity consumption, and considerable optimism.

Mining is sometimes a clever way to acquire Bitcoin below market price. But “sometimes” is doing <em>a lot of work</em> in that sentence. The window is real. It is also not guaranteed to be open when you arrive, and it has a tendency to close
faster than the hardware depreciates.

## Bottom line

None of this was meant to talk you out of Bitcoin mining. Maybe you have cheap electricity. Maybe you have better hardware. Maybe you have a very high tolerance for watching a gray line sit above an orange one for months at a time.

The point was never the mining. The point was what happens when you stop reading a JSON feed and start looking at it.

Four charts. One dataset. Each one asking a slightly different question — and each one returning an answer that the raw numbers wouldn’t give you in a decade of staring at them. That’s not analysis. That’s just visualization doing its job.

<a href="/charts/">RareCharts</a> is built for exactly this: taking the data you already have and turning it into something a room full of people can read in ten seconds and argue about for the next twenty minutes. Dashboards for the metrics that actually move your business. Signals that don’t require a data scientist to interpret. Charts that look good enough to put in a boardroom and honest enough to trust.

The electricity bill was always there in the data. It just needed a line drawn through it.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-hashrate-profit.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-index.js"></script>
<script src="/assets/charts/examples/combined/btc-mining-net-profit.js"></script>
<script src="/assets/charts/examples/line/btc-mining-cost.js"></script>

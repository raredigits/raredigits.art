---
layout: page.njk
title: "Data Import"
section: "Charts"
displaySidebar: true
permalink: '/charts/data-import/'
---

Every chart type accepts data via `setData ()`. What you pass in can come from anywhere — a hardcoded array in your script, a JSON file on the server, a CSV export, or a live API endpoint. RareCharts ships with four adapters that cover the common cases, plus a mapping system that handles the boring part of transforming raw source fields into what the chart expects.

## Direct data

The simplest case: your data is already in the right shape and lives in your script. Just pass it straight in.

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', { height: 280 })
  .setData([
    { date: '2026-01-01', value: 142 },
    { date: '2026-01-02', value: 159 },
    { date: '2026-01-03', value: 151 },
  ]);</code></pre>

Each chart type has its own data format — see the chart’s documentation page for the exact shape it expects.

## Adapters

When data comes from a file or an API, use one of the built-in adapters. They fetch the data, apply a field mapping, and return a clean array ready for `setData()`.

All adapters (except `fromArray`) are async. Use them with `await` inside an async function or chain with `.then()`.

The adapters are available as `RareCharts.fromJson`, `RareCharts.fromCsv`, `RareCharts.fromApi`, and `RareCharts.fromArray`.

## Field mapping

Every adapter accepts a `mapping` object as its second argument. The mapping tells the adapter how to translate your source fields into the fields the chart expects.

Each key in the mapping is the output field name. The value can be:
- **A function** `row => value` — for transformations, type coercion, or computed fields
- **A string** — a direct field name from the source row (simple rename, no transformation)

<div class="air-md"></div>

<pre><code><span class="code-comment">// Source row looks like: { ts: '2026-01-01', close: '148.50', volume: '2300000' }
// Chart expects:         { date: Date, value: number }</span>

const mapping = {
  date:  row => new Date(row.ts),     // parse string to Date
  value: row => +row.close,           // coerce string to number
};</code></pre>

Rows where `date` is an invalid Date or `value` is not finite are filtered out automatically. This keeps garbage data from making your chart look broken.

### fromJson

Fetches a JSON file and applies a mapping.

<pre><code>const data = await RareCharts.fromJson('/data/prices.json', {
  date:  row => new Date(row.date),
  value: row => +row.close,
});

chart.setData(data);</code></pre>

The adapter handles three common JSON shapes automatically, without any configuration:
- **Array at root** — `[{ ... }, { ... }]`
- **Data property** — `{ data: [{ ... }] }`
- **Object of objects** — `{ '2026-01': { ... }, '2026-02': { ... } }` (iterates values)

For anything more exotic, use `fromApi` with a custom `transform` function.

<div class="card collapsible-container">
  <p>
      <span class="section-icon material-icons-outlined">code</span>
      <span class="collapsible-trigger">Real-world example: mining stats<span class="collapsible-icon material-icons-outlined">keyboard_arrow_down</span></span>
  </p>
  
  <div class="collapsible-content">
    <p>
      We get daily stats from a mining pool in a simple JSON format:
    </p>
    <pre class="text-content-caption"><code>{
  "date": "2025-02-01",
  "hashrate_th": 235.219,
  "profit_btc": 0.00013751,
  "price_usd": 102039.29,
  "profit_usd": 14.03
}</code></pre>
    <p>
      Based on this dataset, we built a chart that shows a miner’s daily earnings alongside the BTC spot price.
      Same dates, same source array, two axes: price on the right, earnings on the left.
    </p>
    <div class="card-dashboard-bordered card-caption" id="mining-hashrate-profit"></div>
    <p>
      The idea is simple: price moves, revenue reacts.
      The right axis (orange line) is BTC spot price. The left axis combines two views of mining output:
      gray bars are daily BTC output scaled by a $100k anchor, and the green line is actual USD earnings.
      When the green line sits above the bars, BTC was above $100k and pushed USD revenue higher.
      When they converge, price is close to the $100k anchor. Tooltip shows the real unscaled BTC output.
    </p>
    <pre><code>(async function () {
  const d3 = RareCharts.d3;

<span class="code-comment">
  // BTC profit ≈ 0.00014 BTC/day. Scale by $100k to match USD profit ≈ $14/day.
  // Line above bars = BTC price > $100k. The gap IS the price effect.
</span>
  const BTC_SCALE = 100_000;

  const raw = await RareCharts.fromJson('/assets/charts/data/btc_mining.json', {
    date:       row => new Date(row.date),
    value:      row => +row.profit_usd,
    profit_usd: row => +row.profit_usd,
    profit_btc: row => +row.profit_btc,
    price_usd:  row => +row.price_usd,
  });

  const series = [
    {
      name: 'BTC Price', axis: 'y1', type: 'line', color: '#f7931a',
      strokeWidth: 1.5,
      values: raw.map(r => ({ date: r.date, value: r.price_usd })),
    },
    {
      name: 'BTC Output', axis: 'y2', type: 'bar', color: '#cccccc',
      values: raw.map(r => ({ date: r.date, value: r.profit_btc * BTC_SCALE })),
    },
    {
      name: 'USD Profit', axis: 'y2', type: 'line', color: '#00c97a',
      strokeWidth: 2,
      values: raw.map(r => ({ date: r.date, value: r.profit_usd })),
    },
  ];

  new RareCharts.DualAxes('#mining-hashrate-profit', {
    height: 380, curve: 'linear', crosshair: true, endLabels: false,
    y1Title: 'BTC Price', y2Title: '$/day',
    y1TickFormat: v => '$' + d3.format(',.0f')(v),
    y2TickFormat: v => '$' + d3.format(',.1f')(v),
    xTickFormat:  d => d3.timeFormat('%b')(d),
    tooltipFormat: ({ date, points }) => {
      // Show actual BTC output (un-scale back to real BTC in the formatter)
      ...
    },
  }).setData(series);
})();</code></pre>
  
    <p>The mapping isn't just for field names — you can compute derived values inline. The chart below uses the same data file but adds a pre-processing step: a 7-day rolling average over USD profit, then both series normalized to 100 at the start date. No extra fetch, just a few lines of JS before <code>setData()</code>.</p>
  
    <div id="mining-index"></div>
  
    <p>Both lines start at 100 (Feb 1, 2025). After that, a reading of 120 means the metric is up 20% from the start; 80 means it's down 20%. The gap between them is the difficulty adjustment at work: as more miners join the network, the BTC reward per terahash declines — so even as the spot price rises, individual miner earnings don't follow at the same rate.</p>
  
    <pre><code>// Filter to fully active days, compute rolling average, normalize to 100
    const active     = raw.filter(r => r.profit_usd > 5.0);
    const MA_WINDOW  = 7;
  
    const profitMA = active.map((_, i) => {
      const slice = active.slice(Math.max(0, i - MA_WINDOW + 1), i + 1);
      return slice.reduce((sum, r) => sum + r.profit_usd, 0) / slice.length;
    });
  
    const BASE_PRICE  = active[0].price_usd;
    const BASE_PROFIT = profitMA[0];
  
    const series = [
      {
        name: 'BTC Price', axis: 'y2', type: 'line', color: '#f7931a',
        values: active.map(r => ({ date: r.date, value: (r.price_usd / BASE_PRICE) * 100 })),
      },
      {
        name: 'USD Earnings (7d avg)', axis: 'y2', type: 'line', color: '#00c97a',
        values: active.map((r, i) => ({ date: r.date, value: (profitMA[i] / BASE_PROFIT) * 100 })),
      },
    ];
  
    new RareCharts.DualAxes('#mining-index', {
      y2Title: 'Index (start = 100)',
      y2Domain: [35, 165],
      y2TickFormat: v => d3.format('.0f')(v),
      tooltipFormat: ({ date, points }) => {
        const rows = points.map(p => {
          const delta = p.value - 100;
          const sign  = delta >= 0 ? '+' : '';
          return `<div style="color:${p.color}">${p.name}: ${d3.format('.1f')(p.value)} (${sign}${d3.format('.1f')(delta)}%)</div>`;
        });
        return `...`;
      },
    }).setData(series);</code></pre>
  </div>
</div>

<div class="air-lg"></div>

### fromCsv

Fetches a CSV file. All values come in as strings — the mapping is where you coerce types.

<pre><code>const data = await RareCharts.fromCsv('/data/revenue.csv', {
  date:  row => new Date(row.month),
  value: row => parseFloat(row.revenue_usd),
});</code></pre>

CSV headers become field names. If your CSV has a header row (it should), the adapter handles it correctly — D3's CSV parser is doing the actual work under the hood.

### fromApi

Fetches from a REST endpoint. Supports custom headers for authenticated APIs and a `transform` function for non-standard response shapes.

**Basic usage:**

<pre><code>const data = await RareCharts.fromApi('https://api.example.com/metrics', {
  date:  row => new Date(row.timestamp),
  value: row => row.count,
});</code></pre>

**With authentication:**

<pre><code>const data = await RareCharts.fromApi(
  'https://api.example.com/private/metrics',
  { date: row => new Date(row.ts), value: row => row.val },
  { headers: { 'Authorization': 'Bearer ' + token } }
);</code></pre>

**With a custom transform** — when the response has a non-standard shape that the auto-detection can’t handle:

<pre><code>const data = await RareCharts.fromApi(
  'https://api.example.com/report',
  { date: row => new Date(row.period), value: row => row.total },
  {
    transform: response => response.results.entries,
  }
);</code></pre>

`transform` receives the raw parsed JSON and should return a plain array of row objects.

If the HTTP response is not OK (4xx, 5xx), `fromApi` throws an error with the status code. Handle it if you need a graceful fallback:

<pre><code>try {
  const data = await RareCharts.fromApi(url, mapping);
  chart.setData(data);
} catch (err) {
  console.error('Failed to load chart data:', err.message);
}</code></pre>

### fromArray

For data that’s already in memory but needs field remapping. Synchronous — no `await` needed.

<pre><code>const raw = myApp.getMetrics(); // returns [{ ts, val }, ...]

const data = RareCharts.fromArray(raw, {
  date:  row => new Date(row.ts),
  value: row => row.val,
});

chart.setData(data);</code></pre>

This is useful when you’re pulling data from a state store, another library, or a function that returns a plain array — and the field names don’t match what the chart expects.

## Live updates

`setData ()` can be called any number of times on the same chart instance. Call it again when your data changes — the chart re-renders in place.

<pre><code>const chart = new RareCharts.Line('#chart', { height: 280 });

// Initial load
const data = await RareCharts.fromApi(url, mapping);
chart.setData(data);

// Refresh every 30 seconds
setInterval(async () => {
  const fresh = await RareCharts.fromApi(url, mapping);
  chart.setData(fresh);
}, 30_000);</code></pre>

## Mapping reference

| Value type | Behavior | Example |
|------------|----------|---------|
| Function | Called with each row, return value used | `row => new Date (row.ts)` |
| String | Treated as a field name — `row[fieldName]` | `'close_price'` |

Invalid rows are filtered out automatically:
- Rows where `date` is present but is not a valid `Date` instance
- Rows where `value` is present but is not a finite number (`NaN`, `Infinity`, `null`)

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/dual-axes/btc-mining-hashrate-profit.js"></script>
<script src="/assets/charts/examples/dual-axes/btc-mining-index.js"></script>

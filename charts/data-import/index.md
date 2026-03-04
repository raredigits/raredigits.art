---
layout: page.njk
title: "Data Import"
section: "Charts"
displaySidebar: true
permalink: '/charts/data-import/'
---

Every chart type accepts data via `setData()`. What you pass in can come from anywhere — a hardcoded array in your script, a JSON file on the server, a CSV export, or a live API endpoint. RareCharts ships with four adapters that cover the common cases, plus a mapping system that handles the boring part of transforming raw source fields into what the chart expects.

## Direct data

The simplest case: your data is already in the right shape and lives in your script. Just pass it straight in.

<pre><code>new RareCharts.Line('#chart', { height: 280 })
  .setData([
    { date: '2026-01-01', value: 142 },
    { date: '2026-01-02', value: 159 },
    { date: '2026-01-03', value: 151 },
  ]);</code></pre>

Each chart type has its own data format — see the chart's documentation page for the exact shape it expects.

## Adapters

When data comes from a file or an API, use one of the built-in adapters. They fetch the data, apply a field mapping, and return a clean array ready for `setData()`.

All adapters (except `fromArray`) are async. Use them with `await` inside an async function or chain with `.then()`.

The adapters are available as `RareCharts.fromJson`, `RareCharts.fromCsv`, `RareCharts.fromApi`, and `RareCharts.fromArray`.

## Field mapping

Every adapter accepts a `mapping` object as its second argument. The mapping tells the adapter how to translate your source fields into the fields the chart expects.

Each key in the mapping is the output field name. The value can be:
- **A function** `row => value` — for transformations, type coercion, or computed fields
- **A string** — a direct field name from the source row (simple rename, no transformation)

<pre><code>// Source row looks like: { ts: '2026-01-01', close: '148.50', volume: '2300000' }
// Chart expects:         { date: Date, value: number }

const mapping = {
  date:  row => new Date(row.ts),     // parse string to Date
  value: row => +row.close,           // coerce string to number
};</code></pre>

Rows where `date` is an invalid Date or `value` is not finite are filtered out automatically. This keeps garbage data from making your chart look broken.

---

## fromJson

Fetches a JSON file and applies a mapping.

<pre><code>const data = await RareCharts.fromJson('/data/prices.json', {
  date:  row => new Date(row.date),
  value: row => +row.close,
});

chart.setData(data);</code></pre>

The adapter handles three common JSON shapes automatically, without any configuration:
- **Array at root** — `[{ ... }, { ... }]`
- **`data` property** — `{ data: [{ ... }] }`
- **Object of objects** — `{ '2026-01': { ... }, '2026-02': { ... } }` (iterates values)

For anything more exotic, use `fromApi` with a custom `transform` function.

---

## Real-world example: mining stats from a provider export

The chart below was built from a plain XLS file downloaded from a mining pool. The file was converted to JSON and dropped into the project — no server, no pipeline, no fuss.

<div id="mining-hashrate-profit"></div>

Three series, one source array. Hashrate as bars on the left axis, USD profit and BTC profit as lines on the right. The BTC values (≈ 0.00014 BTC/day) are multiplied by 100,000 before plotting so they land on the same numeric scale as USD — when the two lines track each other closely, BTC price is near $100k; when they diverge, it's moved. The tooltip shows the actual unscaled values.

<pre><code>(async function () {
  const d3 = RareCharts.d3;
  const BTC_SCALE = 100_000;  // ×100k brings BTC values (~0.00014) to dollar scale (~14)

  // fromJson auto-detects the array-at-root shape and applies the mapping to each row
  const raw = await RareCharts.fromJson('/assets/charts/data/btc_mining.json', {
    date:        row => new Date(row.date),
    value:       row => +row.hashrate_th,
    hashrate_th: row => +row.hashrate_th,
    profit_usd:  row => +row.profit_usd,
    profit_btc:  row => +row.profit_btc,
  });

  const series = [
    {
      name: 'Hashrate', axis: 'y2', type: 'bar', color: '#cccccc',
      values: raw.map(r => ({ date: r.date, value: r.hashrate_th })),
    },
    {
      name: 'USD Profit', axis: 'y1', type: 'line', color: '#00c97a',
      values: raw.map(r => ({ date: r.date, value: r.profit_usd })),
    },
    {
      name: 'BTC Profit', axis: 'y1', type: 'line', color: '#f7931a',
      strokeDash: '5,3',
      values: raw.map(r => ({ date: r.date, value: r.profit_btc * BTC_SCALE })),
    },
  ];

  new RareCharts.DualAxes('#mining-hashrate-profit', {
    height: 380, curve: 'linear', crosshair: true, endLabels: false,
    y2Domain: [0, 280], y1Domain: [0, 16],
    y2TickFormat: v => d3.format('.0f')(v),
    y1TickFormat: v => '$' + d3.format(',.1f')(v),
    xTickFormat:  d => d3.timeFormat('%b')(d),
    tooltipFormat: ({ date, points }) => {
      // Show actual BTC value (un-scale it back in the formatter)
      ...
    },
  }).setData(series);
})();</code></pre>

## fromCsv

Fetches a CSV file. All values come in as strings — the mapping is where you coerce types.

<pre><code>const data = await RareCharts.fromCsv('/data/revenue.csv', {
  date:  row => new Date(row.month),
  value: row => parseFloat(row.revenue_usd),
});</code></pre>

CSV headers become field names. If your CSV has a header row (it should), the adapter handles it correctly — D3's CSV parser is doing the actual work under the hood.

---

## fromApi

Fetches from a REST endpoint. Supports custom headers for authenticated APIs and a `transform` function for non-standard response shapes.

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

**With a custom transform** — when the response has a non-standard shape that the auto-detection can't handle:

<pre><code>const data = await RareCharts.fromApi(
  'https://api.example.com/report',
  { date: row => new Date(row.period), value: row => row.total },
  {
    transform: response => response.results.entries,
  }
);</code></pre>

`transform` receives the raw parsed JSON and should return a plain array of row objects.

If the HTTP response is not OK (4xx, 5xx), `fromApi` throws an error with the status code. Handle it if you need a graceful fallback:

<pre><code>try {
  const data = await RareCharts.fromApi(url, mapping);
  chart.setData(data);
} catch (err) {
  console.error('Failed to load chart data:', err.message);
}</code></pre>

---

## fromArray

For data that's already in memory but needs field remapping. Synchronous — no `await` needed.

<pre><code>const raw = myApp.getMetrics(); // returns [{ ts, val }, ...]

const data = RareCharts.fromArray(raw, {
  date:  row => new Date(row.ts),
  value: row => row.val,
});

chart.setData(data);</code></pre>

This is useful when you're pulling data from a state store, another library, or a function that returns a plain array — and the field names don't match what the chart expects.

---

## Live updates

`setData()` can be called any number of times on the same chart instance. Call it again when your data changes — the chart re-renders in place.

<pre><code>const chart = new RareCharts.Line('#chart', { height: 280 });

// Initial load
const data = await RareCharts.fromApi(url, mapping);
chart.setData(data);

// Refresh every 30 seconds
setInterval(async () => {
  const fresh = await RareCharts.fromApi(url, mapping);
  chart.setData(fresh);
}, 30_000);</code></pre>

---

## Mapping reference

| Value type | Behavior | Example |
|------------|----------|---------|
| Function | Called with each row, return value used | `row => new Date(row.ts)` |
| String | Treated as a field name — `row[fieldName]` | `'close_price'` |

Invalid rows are filtered out automatically:
- Rows where `date` is present but is not a valid `Date` instance
- Rows where `value` is present but is not a finite number (`NaN`, `Infinity`, `null`)

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/mining/btc-mining-hashrate-profit.js"></script>

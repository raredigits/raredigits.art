// RareCharts — Entry Point
// scripts/build-charts.mjs compiles this to rare-charts.js and
// rare-charts.min.js in assets/charts/.
// Include with a single tag: <script src="/assets/charts/rare-charts.js"></script>
// CDN: <script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@vX.Y.Z/rare-charts.min.js"></script>
// — pin a release: @latest stays on v0.9.8 until v0.9.9.

// IMPORTANT: imports assume esbuild is configured to load .css as text.
// CLI flag: --loader:.css=text  or  build config: loader: { '.css': 'text' }
import baseCssText       from '../rare-charts.css';
import versionInfo       from './version.json';
import {
  format, formatPrefix, timeFormat, timeParse, utcFormat, utcParse,
  sum, min, max, extent, mean, range,
  scaleLinear, scaleTime, scaleLog, scaleOrdinal,
  color, rgb, hsl, interpolate,
  timeDay, timeWeek, timeMonth, timeYear, utcDay, utcWeek, utcMonth, utcYear,
} from 'd3';

function injectCssOnce(id, cssText) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}

// A page under a strict Content Security Policy (no 'unsafe-inline' in
// style-src) blocks an injected <style>. It loads rare-charts.css itself
// and opts out, before this script runs (K-18):
//   window.RareChartsConfig = { injectStyles: false };
// An element with the id rc-base-styles — that <link> — also stops it.
const config = typeof window !== 'undefined' ? window.RareChartsConfig : undefined;
if (config?.injectStyles !== false) injectCssOnce('rc-base-styles', baseCssText);

// Public docs URL and version for CDN consumers and console discovery.
// VERSION has a single source of truth: assets/charts/src/version.json.
// The build banner (scripts/build-charts.mjs) and the docs label
// (_data/versions.js) read the same file — bump the version there only.
export const DOCS_URL = 'https://raredigits.art/charts';
export const VERSION  = versionInfo.version;

export { Line       } from './charts/Line.js';
export { TimeSeries } from './charts/TimeSeries.js';
export { Overview   } from './charts/Overview.js';
export { Bar        } from './charts/Bar.js';
export { HierarchicalBar } from './charts/HierarchicalBar.js';
export { DualAxes   } from './charts/DualAxes.js';
export { Donut, Pie } from './charts/Donut.js';
export { Gauge      } from './charts/Gauge.js';
export { Graph, linkPresets } from './charts/Graph.js';
export { memorySource } from './graph/source.js';
export { MultiChart        } from './charts/MultiChart.js';
export { Map        } from './charts/Map.js';
export { MapFlow    } from './charts/MapFlow.js';
export { Sankey     } from './charts/Sankey.js';
export { fromJson, fromCsv, fromApi, fromArray } from './adapters/index.js';
export { defaultTheme, darkTheme, createTheme } from './core/theme.js';
export { defaultTimeframes } from './core/Chart.js';

// Demo helper — outside the stability guarantee (K-04). It makes random,
// unseeded OHLCV-like rows for examples and quick sketches: calendar days back
// from today, weekends skipped. Its output and signature may change in any
// release, and it may move out of the bundle; real pages pass their own data.
export function generateMockPrices(days = 365, startPrice = 150) {
  const data = [];
  let price = startPrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    price = Math.max(price + (Math.random() - 0.485) * price * 0.022, 5);
    data.push({
      date,
      value:  +price.toFixed(2),
      open:   +(price * (1 - Math.random() * 0.01)).toFixed(2),
      high:   +(price * (1 + Math.random() * 0.015)).toFixed(2),
      low:    +(price * (1 - Math.random() * 0.015)).toFixed(2),
      volume: Math.floor(50e6 + Math.random() * 100e6),
    });
  }
  return data;
}

// RareCharts.d3 — a documented subset of the D3 the bundle already carries
// (K-13): what page code needs for formatters and small calculations next to
// a chart. Exporting the whole namespace kept all of D3 in the bundle; this
// list adds no module the charts do not use themselves. README and
// /charts/installation/ list the same names; test/exports.test.js freezes them.
export const d3 = Object.freeze({
  // numbers and dates as text
  format, formatPrefix,
  timeFormat, timeParse, utcFormat, utcParse,
  // arrays
  sum, min, max, extent, mean, range,
  // scales
  scaleLinear, scaleTime, scaleLog, scaleOrdinal,
  // colour
  color, rgb, hsl, interpolate,
  // calendar intervals: timeMonth.every(6) for xTicks, timeDay.offset(…)
  timeDay, timeWeek, timeMonth, timeYear,
  utcDay, utcWeek, utcMonth, utcYear,
});

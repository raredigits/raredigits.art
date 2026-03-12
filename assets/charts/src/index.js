// RareCharts — Entry Point
// esbuild compiles this to rare-charts.js in the assets/charts/ root.
// Include with a single tag: <script src="/assets/charts/rare-charts.js"></script>
// Future CDN: <script src="https://cdn.raredigits.io/charts/v1.0.0/rare-charts.js"></script>

// IMPORTANT: imports assume esbuild is configured to load .css as text.
// CLI flag: --loader:.css=text  or  build config: loader: { '.css': 'text' }
import baseCssText       from '../rare-charts.css';

function injectCssOnce(id, cssText) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}

injectCssOnce('rc-base-styles',        baseCssText);

// Public docs URL for CDN consumers and console discovery.
export const DOCS_URL = 'https://raredigits.art/charts';

export { Line       } from './charts/Line.js';
export { TimeSeries } from './charts/TimeSeries.js';
export { Overview   } from './charts/Overview.js';
export { Bar        } from './charts/Bar.js';
export { DualAxes   } from './charts/DualAxes.js';
export { Donut      } from './charts/Donut.js';
export { Donut as Pie } from './charts/Donut.js'; // alias — Pie = Donut with innerRadius: 0
export { Gauge      } from './charts/Gauge.js';
export { Graph, linkPresets } from './charts/Graph.js';
export { Map        } from './charts/Map.js';
export { fromJson, fromCsv, fromApi, fromArray } from './adapters/index.js';
export { defaultTheme, darkTheme, createTheme } from './core/theme.js';

// Helper data generator for demos and tests
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

export * as d3 from 'd3';

// RareCharts — Adapters
// Normalize any data source into the format charts expect.
// Work anywhere: browser, 11ty, any framework.
//
// Usage:
//   import { fromJson, fromCsv, fromApi } from './adapters/index.js';
//
//   const data = await fromJson('/data/prices.json', {
//     date:  row => new Date(row.date),
//     value: row => +row.close,
//   });
//   chart.setData(data);

import * as d3 from 'd3';

/**
 * From a JSON file or URL
 */
export async function fromJson(url, mapping) {
  const raw = await d3.json(url);
  return applyMapping(Array.isArray(raw) ? raw : raw.data ?? Object.values(raw), mapping);
}

/**
 * From a CSV file or URL
 */
export async function fromCsv(url, mapping) {
  const raw = await d3.csv(url);
  return applyMapping(raw, mapping);
}

/**
 * From an arbitrary REST API
 * options.headers — additional request headers (Authorization, etc.)
 * options.transform — fn(response) for non-standard response shapes
 */
export async function fromApi(url, mapping, options = {}) {
  const res = await fetch(url, { headers: options.headers ?? {} });
  if (!res.ok) throw new Error(`RareCharts.fromApi: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  const rows = options.transform ? options.transform(raw) : (Array.isArray(raw) ? raw : raw.data ?? Object.values(raw));
  return applyMapping(rows, mapping);
}

/**
 * From an in-memory array (data already available in JS)
 */
export function fromArray(data, mapping) {
  return applyMapping(data, mapping);
}

// Apply field mapping to an array of rows
function applyMapping(rows, mapping) {
  return rows
    .map(row => {
      const result = {};
      for (const [key, fn] of Object.entries(mapping)) {
        result[key] = typeof fn === 'function' ? fn(row) : row[fn];
      }
      return result;
    })
    .filter(row => {
      // Drop rows with invalid date or value
      const hasDate  = !row.date  || row.date  instanceof Date && !isNaN(row.date);
      const hasValue = !row.value || isFinite(row.value);
      return hasDate && hasValue;
    });
}

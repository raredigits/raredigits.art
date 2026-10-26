// RareCharts — Adapters
// Normalize any data source into the format charts expect.
// Work anywhere: browser, 11ty, any framework.
//
// Usage — the bundle has them as RareCharts.fromJson / fromCsv / fromApi /
// fromArray (in src: import { fromJson } from './adapters/index.js'):
//
//   const data = await RareCharts.fromJson('/data/prices.json', {
//     date:  'date',               // a field name…
//     value: row => +row.close,    // …or a function of the row
//   });
//   chart.setData(data);
//
// Whatever the mapping kind, `date` is then read as a date (Date, ISO string,
// epoch ms) and `value` as a number; a row where either is present but
// unreadable is dropped, an empty value ('' or null) is kept.

import * as d3 from 'd3';
import { parseDate } from '../core/utils.js';

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

// Apply field mapping to an array of rows. Whatever produced it — a key
// rename ({ date: 'ts' }) or a function — a mapped `date` is parsed to a
// Date and a mapped `value` coerced to a number.
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
      // Drop rows whose date is present but unreadable, or whose value is
      // present but non-finite (+'x' → NaN). Keep an absent value and a
      // legitimate 0.
      if ('date' in row && row.date != null && row.date !== '') {
        const date = parseDate(row.date);
        if (!date) return false;
        row.date = date;
      }
      if (row.value == null || row.value === '') return true;
      if (!Number.isFinite(+row.value)) return false;
      row.value = +row.value;
      return true;
    });
}

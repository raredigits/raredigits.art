// RareCharts — Adapters
// Приводят любой источник данных к стандартному формату библиотеки.
// Работают везде: браузер, 11ty, любой фреймворк.
//
// Использование:
//   import { fromJson, fromCsv, fromApi } from './adapters/index.js';
//
//   const data = await fromJson('/data/prices.json', {
//     date:  row => new Date(row.date),
//     value: row => +row.close,
//   });
//   chart.setData(data);

import * as d3 from 'd3';

/**
 * Из JSON-файла или URL
 */
export async function fromJson(url, mapping) {
  const raw = await d3.json(url);
  return applyMapping(Array.isArray(raw) ? raw : raw.data ?? Object.values(raw), mapping);
}

/**
 * Из CSV-файла или URL
 */
export async function fromCsv(url, mapping) {
  const raw = await d3.csv(url);
  return applyMapping(raw, mapping);
}

/**
 * Из произвольного REST API
 * options.headers — дополнительные заголовки (Authorization и т.д.)
 * options.transform — fn(response) для нестандартных структур
 */
export async function fromApi(url, mapping, options = {}) {
  const res = await fetch(url, { headers: options.headers ?? {} });
  if (!res.ok) throw new Error(`RareCharts.fromApi: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  const rows = options.transform ? options.transform(raw) : (Array.isArray(raw) ? raw : raw.data ?? Object.values(raw));
  return applyMapping(rows, mapping);
}

/**
 * Из массива напрямую (если данные уже в памяти)
 */
export function fromArray(data, mapping) {
  return applyMapping(data, mapping);
}

// Применяет маппинг к массиву строк
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
      // Убираем строки с невалидными значениями
      const hasDate  = !row.date  || row.date  instanceof Date && !isNaN(row.date);
      const hasValue = !row.value || isFinite(row.value);
      return hasDate && hasValue;
    });
}

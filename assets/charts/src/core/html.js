// RareCharts — core/html.js
// The library's default tooltips and panels are HTML strings assembled from
// data (labels, names, groups, formatted values). Every data-derived piece is
// escaped with escapeHtml — a label like '<img onerror=…>' from fromCsv or
// fromApi shows as text, never as markup. Formatter results (valueFormat,
// yTickFormat…) are text and are escaped too. The output of a user's own
// tooltipFormat / detailsFormat is HTML by contract and is not touched.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Text (or an attribute value) → safe HTML. null / undefined → ''.
export const escapeHtml = v => (v == null ? '' : String(v).replace(/[&<>"']/g, c => ENTITIES[c]));

// Hrefs allowed in generated links: http(s), site-relative and fragments —
// never javascript: or data: URLs taken from the data.
export const safeUrl = url => typeof url === 'string' && /^(https?:|\/|#)/i.test(url.trim());

// ─── Tooltip rows (B-03, D-03) ───────────────────────────────────────────────
// The default tooltips are built from these fragments: one class per row role,
// styled by rare-charts.css (.rc-tooltip-*) in theme.tooltip's colours. Only
// data colours — a series, a slice, a link category — stay inline. Arguments
// are HTML: callers escape data. tipSources and linkTooltipHtml take data.

const classes = (...names) => names.filter(Boolean).join(' ');

// A role colour of the chart — a var(--rc-…) reference of chart.theme
// (core/paint.js), its muted above all — never goes inline into a tooltip:
// the tooltip is a light popover even on a dark card, where the chart's
// muted is faint (#ccc on white). Such a row takes the tooltip's own muted
// (.rc-tooltip-muted) instead; data colours stay inline (B-03).
export const isRoleColor = c => typeof c === 'string' && c.trimStart().startsWith('var(--rc-');
const dataColor = c => (c && !isRoleColor(c) ? c : null);
const colorStyle = color => (dataColor(color) ? ` style="color:${escapeHtml(color)}"` : '');

// The row naming what is hovered, in every built-in tooltip: a date (muted),
// a label, or a subject title (bold). theme.tooltip.header.text recolours it;
// an inline data colour (a Donut slice) still wins; a role colour reads as
// muted.
export const tipHeader = (html, { color = null, muted = false, title = false } = {}) =>
  `<div class="${classes('rc-tooltip-header', (muted || isRoleColor(color)) && 'rc-tooltip-muted', title && 'rc-tooltip-title')}"${colorStyle(color)}>${html}</div>`;

export const tipTitle = html => tipHeader(html, { title: true });

// A figure — a formatted value, a percentage, a count, a range, a date — in
// the numeric font with tabular digits (.rc-num, K-15). Words stay in the
// chart's font.
export const tipNum = (html, tag = 'span') => `<${tag} class="rc-num">${html}</${tag}>`;

// The date header of a time chart: small and muted, above the rows (RC-082).
export const tipDate = html => tipHeader(tipNum(html), { muted: true });

// The series' marks a row can show (rare-charts.css .rc-tooltip-swatch--*).
const SWATCHES = {
  line:   'rc-tooltip-swatch',
  dashed: 'rc-tooltip-swatch rc-tooltip-swatch--dashed',
  dot:    'rc-tooltip-swatch rc-tooltip-swatch--dot',
  band:   'rc-tooltip-swatch rc-tooltip-swatch--band',
};

// One row per series (RC-082): the series' mark in its colour, its name in
// the tooltip's text colour, the value right-aligned in figures (.rc-num);
// `note` goes under the name, small and muted (a comparison's date and
// change, a share). Arguments are HTML. `swatch` — 'line' | 'dashed' |
// 'dot' | 'band' | null (a row with no mark); `color` — a data colour, set
// as --rc-swatch-color; a role colour (a comparison in the chart's muted)
// takes the tooltip's muted, none the tooltip's text. `muted` sets the value
// in the tooltip's muted ("No data"); `num: false` keeps it in words.
export function tipRow(label, value, { swatch = null, color = null, note = '', muted = false, num = !muted } = {}) {
  const mark = Object.hasOwn(SWATCHES, swatch)
    ? `<span class="${classes(SWATCHES[swatch], isRoleColor(color) && 'rc-tooltip-muted')}"${dataColor(color) ? ` style="--rc-swatch-color:${escapeHtml(color)}"` : ''}></span>`
    : '';
  // the cells apart by a space, which the grid does not draw: the row's
  // text reads 'Range 90 – 110', not 'Range90 – 110'
  const cells = [
    `<span class="rc-tooltip-label">${label ?? ''}</span>`,
    `<span class="${classes('rc-tooltip-value', num && 'rc-num', muted && 'rc-tooltip-muted')}">${value ?? ''}</span>`,
    note ? `<span class="rc-tooltip-note">${note}</span>` : '',
  ];
  return `<div class="${classes('rc-tooltip-row', !mark && 'rc-tooltip-row--plain')}">${mark}${cells.filter(Boolean).join(' ')}</div>`;
}

// Secondary text in tooltip.muted: percentages, totals, a missing value.
export const tipMuted = (html, tag = 'div') => `<${tag} class="rc-tooltip-muted">${html}</${tag}>`;

// Small secondary text; `section` sets it off from the row above.
export const tipSub = (html, { section = false, tag = 'div' } = {}) =>
  `<${tag} class="${classes('rc-tooltip-sub', section && 'rc-tooltip-section')}">${html}</${tag}>`;

// A category in small capitals: in its own colour (a link type), muted
// without one (a node group) or with a role colour (an untyped tie, whose
// colour is the chart's muted).
export const tipKind = (html, color = null, tag = 'span') =>
  `<${tag} class="${classes('rc-tooltip-kind', !dataColor(color) && 'rc-tooltip-muted')}"${colorStyle(color)}>${html}</${tag}>`;

// The relation charts' wrapper: caps the width; a long name wraps (C-29).
export const tipBody = html => `<div class="rc-tooltip-body">${html}</div>`;

// A tie's `sources` — [{ url, title }] or URL strings — as links, clickable
// once the tooltip is pinned; only http(s), site-relative or # hrefs.
export function tipSources(sources) {
  const list = Array.isArray(sources) ? sources : [];
  if (!list.length) return '';
  return `<div class="rc-tooltip-small rc-tooltip-section">${list.map(src => {
    const url = typeof src === 'string' ? src : src?.url;
    const title = typeof src === 'string' ? src : (src?.title ?? src?.url);
    return safeUrl(url)
      ? `<div><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a></div>`
      : `<div>${escapeHtml(title ?? '')}</div>`;
  }).join('')}</div>`;
}

// One tie tooltip for Graph (every view) and MapFlow: the endpoints, then per
// tie its category (`kind` { label, color }, or null to leave it out), label,
// value, period and sources. `from` / `to` are names (text).
export function linkTooltipHtml({ from, to, ties }) {
  const detail = l => {
    const rows = [];
    if (l.label) rows.push(`<div>${escapeHtml(l.label)}</div>`);
    if (l.value != null && l.value !== '') {
      rows.push(tipSub(tipNum(escapeHtml(typeof l.value === 'number' ? l.value.toLocaleString() : l.value))));
    }
    if (l.start != null || l.end != null) {
      rows.push(tipSub(tipNum([l.start, l.end].filter(v => v != null && v !== '').map(escapeHtml).join(' – '))));
    }
    return rows.join('') + tipSources(l.sources);
  };
  const tie = ({ link, kind }) =>
    `<div class="rc-tooltip-section">${kind ? tipKind(escapeHtml(kind.label), kind.color) : ''}${detail(link)}</div>`;
  return tipBody(`${tipTitle(`${escapeHtml(from)} → ${escapeHtml(to)}`)}${ties.map(tie).join('')}`);
}

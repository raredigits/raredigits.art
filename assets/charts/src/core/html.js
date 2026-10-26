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
const colorStyle = color => (color ? ` style="color:${escapeHtml(color)}"` : '');

// The row naming what is hovered, in every built-in tooltip: a date (muted),
// a label, or a subject title (bold). theme.tooltip.header.text recolours it;
// an inline data colour (a Donut slice) still wins.
export const tipHeader = (html, { color = null, muted = false, title = false } = {}) =>
  `<div class="${classes('rc-tooltip-header', muted && 'rc-tooltip-muted', title && 'rc-tooltip-title')}"${colorStyle(color)}>${html}</div>`;

export const tipTitle = html => tipHeader(html, { title: true });

// Secondary text in tooltip.muted: percentages, totals, a missing value.
export const tipMuted = (html, tag = 'div') => `<${tag} class="rc-tooltip-muted">${html}</${tag}>`;

// Small secondary text; `section` sets it off from the row above.
export const tipSub = (html, { section = false, tag = 'div' } = {}) =>
  `<${tag} class="${classes('rc-tooltip-sub', section && 'rc-tooltip-section')}">${html}</${tag}>`;

// A category in small capitals: in its own colour (a link type), muted
// without one (a node group).
export const tipKind = (html, color = null, tag = 'span') =>
  `<${tag} class="${classes('rc-tooltip-kind', !color && 'rc-tooltip-muted')}"${colorStyle(color)}>${html}</${tag}>`;

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
      rows.push(tipSub(escapeHtml(typeof l.value === 'number' ? l.value.toLocaleString() : l.value)));
    }
    if (l.start != null || l.end != null) {
      rows.push(tipSub([l.start, l.end].filter(v => v != null && v !== '').map(escapeHtml).join(' – ')));
    }
    return rows.join('') + tipSources(l.sources);
  };
  const tie = ({ link, kind }) =>
    `<div class="rc-tooltip-section">${kind ? tipKind(escapeHtml(kind.label), kind.color) : ''}${detail(link)}</div>`;
  return tipBody(`${tipTitle(`${escapeHtml(from)} → ${escapeHtml(to)}`)}${ties.map(tie).join('')}`);
}

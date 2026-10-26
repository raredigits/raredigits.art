// RareCharts — graph/tooltips.js
// Graph's default HTML for a node's and a tie's tooltip (ego / path /
// cluster; the flow view writes its node tooltip itself and borrows the
// tie one) and for the built-in details panel (details: true, every view).
// Custom formats replace them: tooltipFormat, linkTooltipFormat,
// detailsFormat.
//
// Methods of Graph (charts/Graph.js mixes them into its prototype; split
// out of Graph.js in 0.9.8_6, D-11, code unchanged): `this` is the chart.

import { dedupeUndirected } from '../core/links.js';
import {
  escapeHtml, safeUrl, tipBody, tipTitle, tipSub, tipKind, linkTooltipHtml,
} from '../core/html.js';

export const graphTooltips = {
  // ─── Tooltip ──────────────────────────────────────────────────────────────

  _defaultTooltip(node, nodeLinks) {
    const esc = escapeHtml;
    // Progressive contract: label is optional everywhere, so the tooltip
    // falls back to the id just like the on-canvas node labels do.
    const name = esc(node.label ?? node.id);

    if (node._size != null) {
      return tipBody(`${tipTitle(name)}
        ${tipSub(`${node._size} node${node._size !== 1 ? 's' : ''} — click to explore`)}`);
    }

    // Counts-first summary with a hard cap on names: a hover tooltip cannot
    // scroll (it dies on mouseout and takes no pointer events), so on hubs it
    // must summarize. The full list belongs to a details surface (backlog).
    const MAX_NAMES = 6;
    const linkW = l => l.weight ?? l.strength ?? 0.5;

    const byType = new Map();
    nodeLinks.slice()
      .sort((a, b) => linkW(b) - linkW(a))          // strongest ties first
      .forEach(l => {
        const type = l.type ?? 'default';
        if (!byType.has(type)) byType.set(type, []);
        const otherId = l.source === node.id ? l.target : l.source;
        byType.get(type).push(this._model.node(otherId)?.label ?? otherId);
      });

    const cfg = type => this._typeInfo(type);
    const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

    // Names take tooltip.text by inheritance; the group and the per-type
    // count read as categories, as in the flow view (B-03).
    let shown = 0;
    const rows = types.map(([type, names]) => {
      const take = Math.max(0, Math.min(names.length, MAX_NAMES - shown));
      shown += take;
      const list = take
        ? `<div>${names.slice(0, take).map(esc).join(', ')}${names.length > take ? '…' : ''}</div>`
        : '';
      return `<div class="rc-tooltip-section">${tipKind(esc(cfg(type).label ?? type), cfg(type).color)}${tipKind(` · ${names.length}`)}${list}</div>`;
    }).join('');

    const hiddenNames = nodeLinks.length - shown;
    const footer = hiddenNames > 0 ? tipSub(`+${hiddenNames} more`, { section: true }) : '';
    const total = nodeLinks.length;

    return tipBody(`${tipTitle(name)}
      ${node.group ? tipKind(esc(node.group), null, 'div') : ''}
      ${tipSub(`${total} connection${total !== 1 ? 's' : ''}`)}
      ${rows}
      ${footer}`);
  },

  // Tie tooltip: endpoints, type, then whatever the payload carries — label,
  // value, period, and `sources` (posts proving the tie) as links, which is
  // why a clicked tie pins its tooltip. A pair collapsed under a +N badge
  // lists every tie it stands for.
  _defaultLinkTooltip(link, source, target) {
    const ties = link._siblings ?? [link];
    return linkTooltipHtml({
      from: source.label ?? source.id,
      to:   target.label ?? target.id,
      ties: ties.map(l => ({ link: l, kind: this._linkTypeOf(l) })),
    });
  },

  // ─── Details panel (details: true) ───────────────────────────────────────

  _defaultDetails(subject) {
    const t = this.theme;
    const esc = escapeHtml;
    const kind = txt => `<p class="rc-graph-details-kind">${esc(txt)}</p>`;
    const row = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
    // in the flow view a tie may end at a fold's meta-node: name it by what
    // is drawn, not by the model
    const drawn = this._view === 'flow'
      ? new Map((this._flowView?._lastVisible?.nodes ?? []).map(n => [n.id, n])) : null;
    const nameOf = id => esc(drawn?.get(id)?.label ?? this._model.node(id)?.label ?? id);
    if (subject?.node?.fold != null && Array.isArray(subject.node.members)) {
      const n = subject.node;
      const list = n.members.slice(0, 12).map(m => `<li>${esc(m.label ?? m.id)}</li>`).join('');
      const more = n.members.length > 12 ? `<p class="rc-graph-details-muted">+${n.members.length - 12} more</p>` : '';
      return `${kind('Folded')}<h4>${esc(n.label ?? n.id)}</h4>
        ${n.sub ? `<p class="rc-graph-details-muted">${esc(n.sub)}</p>` : ''}
        <ul>${list}</ul>${more}
        <p class="rc-graph-details-muted">+ on the node opens it.</p>`;
    }
    if (subject?.node) {
      const n = subject.node;
      // ego/path/cluster ignore direction: a tie listed both ways is one, as
      // in the drawing and the tooltip; the flow view keeps every direction
      const all = this._model.toData().links;
      const ties = (this._view === 'flow' ? all : dedupeUndirected(all))
        .filter(l => l.source === n.id || l.target === n.id);
      const group = this.options.nodeGroups?.[n.group]?.label ?? n.group;
      const list = ties.slice(0, 12).map(l => {
        const other = l.source === n.id ? l.target : l.source;
        const dir = l.source === n.id ? '→' : '←';
        const extra = l.label ?? (l.value != null ? Number(l.value).toLocaleString() : '');
        const type = this._linkTypeOf(l).label;
        return `<li>${dir} ${nameOf(other)}${type ? ` <span class="rc-graph-details-muted">· ${esc(type)}</span>` : ''}${extra ? ` <span class="rc-graph-details-muted">· ${esc(extra)}</span>` : ''}</li>`;
      }).join('');
      const more = ties.length > 12 ? `<p class="rc-graph-details-muted">+${ties.length - 12} more</p>` : '';
      return `${group ? kind(group) : ''}<h4>${esc(n.label ?? n.id)}</h4>
        ${n.sub ? `<p class="rc-graph-details-muted">${esc(n.sub)}</p>` : ''}
        ${n.note ?? n.description ? `<p>${esc(n.note ?? n.description)}</p>` : ''}
        <dl>${row('Connections', String(ties.length))}</dl>
        ${list ? `<ul class="rc-graph-details-ties">${list}</ul>${more}` : ''}`;
    }
    if (subject?.link) {
      const l = subject.link;
      const type = this._linkTypeOf(l).label;
      const period = [l.start, l.end].filter(v => v != null && v !== '').map(esc).join(' – ');
      const sources = Array.isArray(l.sources) ? l.sources.map(src => {
        const url = typeof src === 'string' ? src : src?.url;
        const title = typeof src === 'string' ? src : (src?.title ?? src?.url);
        return safeUrl(url) ? `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a></li>` : `<li>${esc(title ?? '')}</li>`;
      }).join('') : '';
      return `${type ? kind(type) : ''}<h4>${nameOf(l.source)} → ${nameOf(l.target)}</h4>
        <dl>${l.label ? row('Label', esc(l.label)) : ''}${l.value != null && l.value !== '' ? row('Value', esc(typeof l.value === 'number' ? l.value.toLocaleString() : l.value)) : ''}${period ? row('Period', period) : ''}</dl>
        ${sources ? `<ul>${sources}</ul>` : ''}`;
    }
    const hint = this._view === 'flow'
      ? 'Select a node or a tie to see its details.'
      : 'Hover a node, or click a tie, to see its details.';
    return `${kind('Details')}<p style="color:${t.muted}">${hint}</p>`;
  },
};

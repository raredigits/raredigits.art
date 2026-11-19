// RareCharts — core/renderHelpers.js
// Stateless render functions for common chart elements: the render
// functions mutate the passed D3 selection and return nothing; the text and
// label-box helpers below (widths, box overlap, greedy placement) only
// measure or compute.

import * as d3 from 'd3';
import { markerPath, resolveStrokeDash, warnAxisTitleClipped, timeKit } from './utils.js';
import { linePath, areaPath } from './seriesPath.js';
import { drawLinesIn } from './entryMotion.js';

// ─── Text ──────────────────────────────────────────────────────────────────────

// Truncate a text node's content with an ellipsis until it fits `avail` px.
// The full text stays available in the tooltip. No-op where text measurement
// is unavailable (jsdom).
export function fitTextNode(node, full, avail) {
  if (!node.getComputedTextLength) return;
  let s = String(full);
  node.textContent = s;
  while (s.length > 1 && node.getComputedTextLength() > avail) {
    s = s.slice(0, -1).trimEnd();
    node.textContent = s + '…';
  }
}

// The width of a text that is not measured: `perChar` px a character. Each
// caller keeps the rate of its own font (D-08): Graph's node labels 6.2, the
// flow view's captions 6.6 and tie labels 6.4, MapFlow's place labels 6.4,
// Bar's values and Donut's breadcrumb 7, the overview strip's ticks 5.5.
// null and undefined count as no text.
export function estimateTextWidth(text, perChar) {
  return String(text ?? '').length * perChar;
}

// The drawn width of an SVG text node where the browser can measure it.
// Before layout (or without an SVG layout: jsdom) getComputedTextLength gives
// 0, and some browsers throw for a text that is not rendered: the width is
// then estimated from `text` (by default the node's own content).
export function textWidth(node, perChar, text = node?.textContent) {
  let w = 0;
  try { w = node?.getComputedTextLength?.() ?? 0; } catch { w = 0; }
  return w > 0 ? w : estimateTextWidth(text, perChar);
}

// ─── Label boxes ──────────────────────────────────────────────────────────────
// A box is { x0, x1, y0, y1 } in one coordinate space, x0 ≤ x1, y0 ≤ y1.

// Two boxes overlap when they share area: boxes that only touch along an edge
// or at a corner do not.
export function boxesOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

// Greedy placement: the first candidate, in the order given, whose box
// (boxOf(candidate)) overlaps none of `obstacles` and, with `bounds`, stays
// inside that box (edges included). Returns { at, box } — the candidate and
// its box — or null when every candidate collides. Obstacles are only read:
// a caller that wants its next label to keep off this one pushes `box`.
export function placeFirstFree(candidates, boxOf, obstacles, { bounds } = {}) {
  for (const at of candidates) {
    const box = boxOf(at);
    if (bounds && (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1)) continue;
    if (!obstacles.some(b => boxesOverlap(box, b))) return { at, box };
  }
  return null;
}

// ─── Accessibility ─────────────────────────────────────────────────────────────

/**
 * Give an <svg> root an accessible name so assistive technology announces the
 * chart instead of skipping it as an unlabeled graphic. Sets `role="img"` and
 * an `aria-label` built from the chart's title/subtitle (or an explicit
 * `ariaLabel` option), falling back to a generic "Chart".
 *
 * HTMLElement title/subtitle values are ignored here — only string slots
 * contribute to the label. Chart._createSvg() calls it for every SVG chart
 * class, once, as it creates the root.
 *
 * @param {d3.Selection} svg     — the root <svg> selection
 * @param {object}       options — chart options (reads ariaLabel, title, subtitle)
 */
export function applySvgA11y(svg, options = {}) {
  if (!svg) return;
  const explicit = typeof options.ariaLabel === 'string' ? options.ariaLabel.trim() : '';
  const parts = explicit
    ? [explicit]
    : [options.title, options.subtitle].filter(t => typeof t === 'string' && t.trim());
  const label = parts.length ? parts.join(' — ') : 'Chart';
  svg.attr('role', 'img').attr('aria-label', label);
}

// ─── Grid ────────────────────────────────────────────────────────────────────

/**
 * Render horizontal grid lines.
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Function}     scale      — d3 linear scale (Y)
 * @param {number}       W          — chart width (for tick line length)
 * @param {number}       ticks      — tick count
 * @param {object}       theme
 * @param {Iterable}     tickValues — explicit positions; win over ticks
 */
export function renderGrid(g, scale, W, ticks, theme, tickValues = null) {
  drawGrid(g, d3.axisLeft(scale), W, ticks, theme, tickValues);
}

/**
 * Render vertical grid lines, at the ticks of a horizontal value scale (the
 * horizontal Bar). The layer moves to the plot's bottom edge, H down, and
 * its lines run the plot's height up from there.
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Function}     scale      — d3 linear scale (X)
 * @param {number}       H          — plot height (translate and line length)
 * @param {number}       ticks      — tick count
 * @param {object}       theme
 * @param {Iterable}     tickValues — explicit positions; win over ticks
 */
export function renderGridX(g, scale, H, ticks, theme, tickValues = null) {
  g.attr('transform', `translate(0,${H})`);
  drawGrid(g, d3.axisBottom(scale), H, ticks, theme, tickValues);
}

// Grid lines are an axis's ticks drawn across the plot (`size` px), with no
// labels and no axis line.
function drawGrid(g, axis, size, ticks, theme, tickValues) {
  if (tickValues) axis.tickValues(tickValues);
  else axis.ticks(ticks);
  g.call(axis.tickSize(-size).tickFormat(''))
    .call(sel => {
      sel.selectAll('line').attr('stroke', theme.grid);
      sel.select('.domain').remove();
      sel.selectAll('text').remove();
    });
}

// ─── Zero baseline ───────────────────────────────────────────────────────────

/**
 * Render a highlighted zero baseline if domain crosses zero.
 *
 * @param {d3.Selection} g      — target <g> element
 * @param {Function}     scale  — d3 linear scale (Y)
 * @param {number}       W      — chart width
 * @param {object}       theme
 */
export function renderZeroBaseline(g, scale, W, theme) {
  const [lo, hi] = scale.domain();
  const hasZero = lo < 0 && hi > 0;

  g.selectAll('.rc-zero-line')
    .data(hasZero ? [0] : [])
    .join('line')
    .attr('class', 'rc-zero-line')
    .attr('x1', 0).attr('x2', W)
    .attr('y1', scale(0)).attr('y2', scale(0))
    .attr('stroke', theme.border);
}

// ─── X axis ──────────────────────────────────────────────────────────────────

/**
 * Render the bottom X axis.
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Function}     scale      — d3 time scale
 * @param {number}       H          — chart height (for translate)
 * @param {Function}     tickFormat — date formatter
 * @param {object}       theme
 */
// Ticks for a day-labelled time axis (the default '%m/%d'): a span with
// fewer midnights than `max` gets exactly those midnights — a count would let
// d3 pick 12-hour steps (repeating a date) or a 2-day step with no tick in
// view — and a span inside one day gets one tick at its start. null: the
// span holds enough days for d3's own ticks. Midnight is the zone's (T-10).
export function dayTicks([d0, d1], max, timeZone = 'local') {
  const { day } = timeKit(timeZone);
  const days = day.range(day.ceil(d0), +d1 + 1);
  if (days.length >= max) return null;
  return days.length ? days : [d0];
}

export function renderAxisX(g, scale, H, tickFormat, theme, ticks = 6) {
  g.classed('rc-axis', true);   // .rc-axis text → numeric font/size (rare-charts.css)
  const apply = (n) => {
    const axis = d3.axisBottom(scale).tickSize(0).tickPadding(6).tickFormat(tickFormat);
    g.attr('transform', `translate(0,${H})`)
      .call(Array.isArray(n) ? axis.tickValues(n) : axis.ticks(n))
      .call(sel => {
        sel.selectAll('text')
          .attr('fill', theme.muted)
          .attr('dx', null)
          .attr('dy', '0.71em');
        sel.select('.domain').remove();
        sel.selectAll('line').remove();
      });
  };

  apply(ticks);
  if (typeof ticks === 'number') thinAxisX(g, ticks, apply);
  keepEdgeLabelsInside(g);
}

// Auto-thin labels when they overlap. Only kicks in for numeric tick counts;
// explicit tick values and time intervals (d3.timeMonth.every(N)) are
// respected as-is.
function thinAxisX(g, ticks, apply) {
  const minGap = 8;
  let attempts = 5;
  let count = ticks;
  // labels this pass hid on an earlier render show again before it measures
  g.selectAll('text[data-rc-thin]').attr('display', null).attr('data-rc-thin', null);
  while (attempts-- > 0) {
    const labels = g.selectAll('text').nodes();
    if (labels.length <= 2) break;
    let overlap = false;
    let prev = labels[0].getBoundingClientRect();
    for (let i = 1; i < labels.length; i++) {
      const cur = labels[i].getBoundingClientRect();
      if (cur.left < prev.right + minGap) { overlap = true; break; }
      prev = cur;
    }
    if (!overlap) break;
    // Halve the count asked of d3, not the labels drawn: a time scale may
    // answer ticks(6) with 12 quarter ticks, and asking 6 again changes
    // nothing.
    const newCount = Math.max(1, Math.floor(Math.min(count, labels.length) / 2));
    if (newCount >= count) break;
    apply(newCount);
    // Never thin down to one label or none (RC-076: the dated Bar kept a
    // lone 'Jan 25' at 800 px): d3 may answer a small count with a step
    // longer than the view holds twice. Keep the ticks asked before and show
    // every k-th label instead, the first one kept.
    if (g.selectAll('text').size() < 2) {
      apply(count);
      const texts = g.selectAll('text').nodes();
      const rects = texts.map(t => t.getBoundingClientRect());
      const k = thinStep(rects.map(r => (r.left + r.right) / 2), rects.map(r => r.width), minGap);
      if (k > 1) texts.forEach((t, i) => { if (i % k) t.setAttribute('display', 'none'); if (i % k) t.setAttribute('data-rc-thin', ''); });
      break;
    }
    count = newCount;
  }
}

// Labels in a row (centres left to right, widths in px) that would sit
// closer than minGap to a neighbour: the smallest k such that showing every
// k-th, from the first, keeps every pair shown at least minGap apart. At
// most n − 1 (the first and the last stay); 1 when nothing collides or
// nothing is measured. The time axis's 8px rule (thinAxisX) for rows d3
// cannot thin by asking for fewer ticks.
export function thinStep(centres, widths, minGap = 8) {
  const n = centres.length;
  if (!widths.some(v => v > 0)) return 1;
  const clears = k => {
    for (let i = 0; i + k < n; i += k) {
      if (centres[i + k] - centres[i] - (widths[i] + widths[i + k]) / 2 < minGap - 1e-9) return false;   // 1e-9: float steps
    }
    return true;
  };
  let k = 1;
  while (k < n - 1 && !clears(k)) k++;
  return k;
}

// Band labels — a categorical axis at the bottom (Bar's vertical modes) —
// that would sit closer than minGap to a neighbour: show every k-th label
// (thinStep). Each category is a tick, so d3 cannot thin them by asking for
// fewer. Widths come from getComputedTextLength and centres from the band
// scale, so it needs no layout; a DOM that measures nothing (0 px) hides
// nothing. A hidden label gets display="none" and keeps its tick; a later
// call starts afresh. Returns k (1: nothing hidden).
export function thinBandLabels(g, scale, { minGap = 8 } = {}) {
  const texts = g.selectAll('.tick text').nodes();
  texts.forEach(t => t.removeAttribute('display'));
  const step = scale.step?.() ?? 0;
  if (!(step > 0)) return 1;
  const k = thinStep(texts.map((_, i) => i * step), texts.map(t => t.getComputedTextLength?.() || 0), minGap);
  if (k > 1) texts.forEach((t, i) => { if (i % k) t.setAttribute('display', 'none'); });
  return k;
}

// A label centred on a tick near the plot's edge reaches past the svg (a 1M
// view's first weekly tick sits a few px from a zero left margin) and is cut
// off: shift the first and last labels just far enough back inside, as most
// chart libraries do; one that would then run into its neighbour is hidden.
// Measured in screen px (the svg is not scaled), so a no-layout DOM moves
// nothing.
function keepEdgeLabelsInside(g) {
  const svg = g.node()?.ownerSVGElement;
  // the labels thinAxisX left in place (it hides every k-th on a crowded axis)
  const labels = g.selectAll('text').nodes().filter(n => !n.hasAttribute('data-rc-thin'));
  if (!svg || !labels.length) return;
  const box = svg.getBoundingClientRect();
  if (!(box.width > 0)) return;
  labels.forEach(n => n.removeAttribute('display'));
  const shift = (node, neighbour, dx) => {
    node.setAttribute('dx', String(dx > 0 ? Math.ceil(dx) : Math.floor(dx)));
    if (!neighbour) return;
    const r = node.getBoundingClientRect();
    const o = neighbour.getBoundingClientRect();
    if (r.right > o.left - 4 && o.right > r.left - 4) node.setAttribute('display', 'none');
  };
  const first = labels[0];
  const last  = labels[labels.length - 1];
  const r0 = first.getBoundingClientRect();
  const left = r0.width > 0 && r0.left < box.left;
  if (left) shift(first, labels[1], box.left - r0.left);
  // A lone label wider than the svg keeps its start in view.
  if (left && last === first) return;
  const r1 = last.getBoundingClientRect();
  if (r1.width > 0 && r1.right > box.right) shift(last, labels[labels.length - 2], box.right - r1.right);
}

// ─── Y axis ──────────────────────────────────────────────────────────────────

/**
 * Render a vertical value axis at the right or the left edge of the plot:
 * Line's (either side), DualAxes' Y1 (right) and Y2 (left), TimeSeries' and
 * the vertical Bar's (right). Labels in the muted colour and the numeric font
 * (.rc-axis); no tick marks, and the axis line only when labelsOnly is false.
 *
 * @param {d3.Selection} g                 — target <g> element
 * @param {Function}     scale             — d3 continuous scale (Y)
 * @param {object}       opts
 * @param {string}       opts.side         — 'right' (default): the axis at x = width,
 *                                           labels start past it; 'left': at x = 0,
 *                                           labels end before it
 * @param {number}       opts.width        — plot width (where a right axis sits)
 * @param {number}       opts.ticks        — approximate tick count (default 4)
 * @param {Iterable}     opts.tickValues   — explicit positions; win over ticks
 * @param {Function}     opts.tickFormat   — value formatter
 * @param {boolean}      opts.labelsOnly   — hide the axis line (default true)
 * @param {object}       opts.theme
 * @param {number}       opts.padding      — px between the axis and its labels (default 8)
 */
export function renderAxisY(g, scale, {
  side = 'right', width = 0, ticks = 4, tickValues = null, tickFormat,
  labelsOnly = true, theme, padding = 8,
} = {}) {
  const right = side !== 'left';
  const axis = (right ? d3.axisRight : d3.axisLeft)(scale)
    .tickSize(0).tickPadding(padding).tickFormat(tickFormat);
  if (tickValues) axis.tickValues(tickValues);
  else axis.ticks(ticks);
  g.classed('rc-axis', true);   // .rc-axis text → numeric font/size (rare-charts.css)
  g.attr('transform', `translate(${right ? width : 0},0)`)
    .call(axis)
    .call(sel => {
      sel.selectAll('text')
        .attr('fill', theme.muted)
        .attr('text-anchor', right ? 'start' : 'end')
        .attr('x', right ? padding : -padding);
      if (labelsOnly) sel.select('.domain').remove();
      else sel.select('.domain').attr('stroke', theme.border);
      sel.selectAll('line').remove();
    });
}

// ─── Line series ─────────────────────────────────────────────────────────────

/**
 * Draw the line series of Line, DualAxes and TimeSeries into one layer: the
 * area fills first (series with area on), then the lines over them, each
 * joined by series name. A series' own curve, strokeWidth, strokeDash, area,
 * areaOpacity and areaBaseline win over the chart-level values passed here.
 * A line with a dash pattern shows at once with it; a solid line draws in on
 * the chart's entry timeline (`timing`, from EntryMotion.timing; null: whole
 * at once) — the draw-in uses the same stroke-dasharray attribute.
 * Without `classes.area` the fills are left alone: TimeSeries draws its own
 * (a gradient down to the plot's bottom, RC-080) and only its line here.
 *
 * @param {d3.Selection} g       — the lines layer
 * @param {object[]}     lines   — the visible line series
 * @param {object}       opts
 * @param {Function}     opts.x            — the time scale
 * @param {Function}     opts.yFor         — (series) => its Y scale
 * @param {string}       opts.curve        — curve name (resolveCurve)
 * @param {number}       opts.tension      — cardinal tension
 * @param {boolean}      opts.area         — fill under the lines
 * @param {number}       opts.areaOpacity
 * @param {string|number} opts.areaBaseline — 'zero' | 'min' | number
 * @param {*}            opts.dash         — strokeDash (resolveStrokeDash); null: solid
 * @param {number}       opts.width        — stroke width
 * @param {{area?: string, line: string}} opts.classes — the paths' classes;
 *                                           no area class: no fills drawn
 * @param {object|null}  opts.timing       — the draw-in timing, or null
 */
export function drawLineSeries(g, lines, {
  x, yFor, curve, tension, area, areaOpacity, areaBaseline, dash, width, classes, timing,
}) {
  if (classes.area) {
    g.selectAll(`.${classes.area}`)
      .data(lines.filter(s => (s.area ?? area) === true), s => s.name)
      .join('path')
      .attr('class', classes.area)
      .attr('d',       s => areaPath(s, x, yFor(s), curve, areaBaseline, tension))
      .attr('fill',    s => s.color)
      .attr('opacity', s => s.areaOpacity ?? areaOpacity);
  }

  const dashOf = s => resolveStrokeDash(s.strokeDash ?? dash);
  const paths = g.selectAll(`.${classes.line}`)
    .data(lines, s => s.name)
    .join('path')
    .attr('class', classes.line)
    .attr('fill', 'none')
    .attr('stroke',           s => s.color)
    .attr('stroke-width',     s => s.strokeWidth ?? width)
    .attr('stroke-dasharray', dashOf)
    .attr('d', s => linePath(s, x, yFor(s), curve, tension));

  paths.filter(s => dashOf(s)).interrupt()
    .attr('stroke-dasharray', dashOf)
    .attr('stroke-dashoffset', null);
  drawLinesIn(paths.filter(s => !dashOf(s)), timing);
}

// ─── End labels ──────────────────────────────────────────────────────────────

/**
 * Render last-value labels on the right edge.
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Array}        series     — filtered series to label
 * @param {Function}     yScale     — d3 scale for positioning
 * @param {number}       W          — chart width
 * @param {Function}     tickFormat — value formatter
 * @param {object}       theme
 */
// `axis`: the Y axis group in the same column (the right one). A tick label
// there that an end label would sit on is hidden while the end label is
// drawn (RC-084: '10.9k' over '10k'); every other tick label shows.
export function renderEndLabels(g, series, yScale, W, tickFormat, theme, { axis = null } = {}) {
  g.selectAll('*').remove();

  const points = series
    .filter(s => s.type !== 'bar')
    .map(s => {
      const d = s.values[s.values.length - 1];
      return { name: s.name, color: s.color, value: d.value };
    });

  const groups = g.selectAll('.rc-end-label-g')
    .data(points, d => d.name)
    .join('g')
    .attr('class', 'rc-end-label-g')
    // 3px past the plot edge (was 10): longer values ($88.4K, 1,234.56) kept
    // running into the card's edge; the label may sit over the line's last
    // few px instead.
    .attr('transform', d => `translate(${W + 3},${yScale(d.value)})`);

  // Background plate — the chart's own background (theme.bg), so it masks
  // the line under the label in any theme (C-12). Sized after text renders
  // via getBBox().
  groups.append('rect')
    .attr('class', 'rc-end-label-bg')
    .attr('fill', theme.bg);

  groups.append('text')
    .attr('class', 'rc-end-label')
    .attr('dy', '0.35em')
    .attr('fill', d => d.color)
    .text(d => tickFormat(d.value));

  // Fit rect to text bounding box with small horizontal padding
  groups.each(function () {
    const bbox = d3.select(this).select('text').node().getBBox();
    const px = 2, py = 0;
    d3.select(this).select('rect')
      .attr('x', bbox.x - px)
      .attr('y', bbox.y - py)
      .attr('width',  bbox.width  + px * 4)
      .attr('height', bbox.height + py * 8);
  });

  if (axis) {
    const height = el => el.getBBox?.().height || 12;
    const labels = [];
    groups.each(function (d) { labels.push({ y: yScale(d.value), h: height(d3.select(this).select('text').node()) }); });
    axis.selectAll('.tick').each(function () {
      const m = /translate\(\s*[-\d.e]+\s*[, ]\s*([-\d.e]+)/.exec(this.getAttribute('transform') ?? '');
      const text = d3.select(this).select('text');
      if (!m || text.empty()) return;
      const y = +m[1], h = height(text.node());
      // 2px apart, as the plates of two end labels
      const covered = labels.some(l => Math.abs(l.y - y) < (l.h + h) / 2 + 2);
      text.attr('visibility', covered ? 'hidden' : null);
    });
  }
}

// ─── Axis titles ─────────────────────────────────────────────────────────────

/**
 * Render Y axis title labels (used in DualAxes).
 *
 * Titles are clipped by measured pixel width — not character count — so a label
 * only loses characters when it would actually run past the axis margin and get
 * cut off by the chart's overflow clip. The narrow glyphs in something like
 * "N · K HLX" are measured as they render, so a terse title that fits is left
 * intact. When a title is trimmed, the full text is kept as a hover <title> and
 * a one-time console hint fires.
 *
 * @param {d3.Selection} g       — target <g> element
 * @param {number}       W       — chart width
 * @param {string|null}  y1Title — right axis title
 * @param {string|null}  y2Title — left axis title
 * @param {object}       theme
 * @param {object}       [opts]
 * @param {number}       [opts.y1Avail] — px available for the right title (≈ margin.right)
 * @param {number}       [opts.y2Avail] — px available for the left title (≈ margin.left)
 * @param {number}       [opts.maxLength] — optional hard character cap (both axes)
 */
export function renderAxisTitles(g, W, y1Title, y2Title, theme, opts = {}) {
  const titles = [];
  if (y2Title) titles.push({ axis: 'y2', full: String(y2Title), avail: opts.y2Avail });
  if (y1Title) titles.push({ axis: 'y1', full: String(y1Title), avail: opts.y1Avail });

  const maxLen = Number.isFinite(opts.maxLength) ? opts.maxLength : Infinity;

  const sel = g.selectAll('.rc-axis-title')
    .data(titles, d => d.axis)
    .join('text')
    .attr('class', d => `rc-axis-title rc-axis-title-${d.axis}`)
    .attr('x', d => (d.axis === 'y1' ? W + 8 : -8))
    .attr('y', -28)
    .attr('fill', theme.muted);

  sel.each(function (d) {
    const node  = this;
    const avail = Number.isFinite(d.avail) ? d.avail : Infinity;

    // Start from the full text (capped by maxLength if set), measure, then drop
    // one trailing character at a time until the rendered glyphs fit `avail`.
    let text = d.full.length > maxLen ? d.full.slice(0, Math.max(1, maxLen - 1)) + '…' : d.full;
    node.textContent = text;

    while (node.getComputedTextLength() > avail) {
      const core = text.endsWith('…') ? text.slice(0, -1) : text;
      if (core.length <= 1) break;
      text = core.slice(0, -1).trimEnd() + '…';
      node.textContent = text;
    }

    d3.select(node).selectAll('title').remove();
    if (text !== d.full) {
      warnAxisTitleClipped(d.full);
      d3.select(node).append('title').text(d.full);
    }
  });
}

// ─── Markers ─────────────────────────────────────────────────────────────────

/**
 * Render per-point markers for line series.
 *
 * Per-series options (all optional, override chart-level defaults):
 *   series.markers       — true | false
 *   series.markerShape   — 'circle'|'square'|'diamond'|'triangle'|'cross'
 *   series.markerSize    — px radius / half-size (default: 4)
 *   series.markerFill    — fill colour (default: series.color)
 *   series.markerStroke  — stroke colour (default: theme.bg)
 *
 * @param {d3.Selection}  g             — target <g> element
 * @param {Array}         series        — all series (bars are skipped automatically)
 * @param {Function}      x             — d3 time scale
 * @param {Function}      scaleFor      — (series) => d3 y-scale for that series
 * @param {boolean}       globalMarkers — chart-level markers default (default: false)
 * @param {string}        globalShape   — chart-level shape default (default: 'circle')
 * @param {number}        globalSize    — chart-level size default (default: 4)
 * @param {object}        theme
 */
export function renderMarkers(g, series, x, scaleFor, globalMarkers = false, globalShape = 'circle', globalSize = 4, theme) {
  const markerItems = series
    .filter(s => s.type !== 'bar' && (s.markers ?? globalMarkers))
    .flatMap(s => {
      const shape  = s.markerShape  ?? globalShape;
      const size   = s.markerSize   ?? globalSize;
      const fill   = s.markerFill   ?? s.color;
      const stroke = s.markerStroke ?? theme.bg;
      const y      = scaleFor(s);
      const path   = markerPath(shape, size);

      return s.values.map((d, i) => ({
        key: `${s.name}|${i}`,
        cx: x(d.date),
        cy: y(d.value),
        shape, size, fill, stroke, path,
      }));
    });

  // Circles use native <circle> for crisp rendering; other shapes use <path>
  const circles = markerItems.filter(d => !d.path);
  const shapes  = markerItems.filter(d =>  d.path);

  g.selectAll('.rc-marker-circle')
    .data(circles, d => d.key)
    .join('circle')
    .attr('class',        'rc-marker-circle')
    .attr('cx',           d => d.cx)
    .attr('cy',           d => d.cy)
    .attr('r',            d => d.size)
    .attr('fill',   d => d.fill)
    .attr('stroke', d => d.stroke);

  g.selectAll('.rc-marker-shape')
    .data(shapes, d => d.key)
    .join('path')
    .attr('class',        'rc-marker-shape')
    .attr('transform',    d => `translate(${d.cx},${d.cy})`)
    .attr('d',            d => d.path)
    .attr('fill',   d => d.fill)
    .attr('stroke', d => d.stroke);
}

// ─── Annotations ─────────────────────────────────────────────────────────────

/**
 * Render annotation markers on the chart. Supports four kinds:
 *
 *   point   — vertical line at a date, label above the chart.
 *   range   — vertical band between two dates, label centered above.
 *   hPoint  — horizontal line at a Y value, label inline next to the line.
 *   hRange  — horizontal band between two Y values, label inline next to it.
 *
 * Vertical labels render OUTSIDE the SVG plot box (above the chart area), so
 * the caller must reserve vertical space via `margin.top` ≥ `labelHeight + ~6`
 * when at least one vertical annotation has a label.
 *
 * Annotations outside the visible extent are skipped automatically: dates
 * outside the X domain, values outside the Y domain. A range or band that
 * runs past an edge is cut there and draws only the edges inside the plot.
 * Values never widen the Y domain — the caller's scale decides what shows.
 *
 * @param {d3.Selection} g           — target <g> element (chart-relative)
 * @param {Array}        annotations — normalized annotations from normalizeAnnotations()
 * @param {Function}     x           — d3 time scale (X axis)
 * @param {Function}     yScaleFor   — (axisKey) => d3 scale ; receives 'y1' or 'y2'
 * @param {number}       H           — chart drawing height
 * @param {number}       labelHeight — px reserved above the chart for vertical labels
 * @param {object}       theme
 * @param {number[]}     [hSpan]     — [x0, x1] px of the plot (default x.range()):
 *                                      horizontal entries span it, and a date range
 *                                      is cut at its edges. A chart that insets its
 *                                      scale for bars passes the full plot width, so
 *                                      a range can shade the edge bars whole.
 */
export function renderAnnotations(g, annotations, x, yScaleFor, H, labelHeight, theme, hSpan) {
  g.selectAll('*').remove();
  if (!annotations?.length) return;

  const [xLo, xHi] = x.domain();
  const xLoT = +xLo, xHiT = +xHi;
  const [xR0, xR1] = hSpan ?? x.range();
  // Ranges are cut at the plot's edges, which lie past the domain on a scale
  // inset for bars; points stay on the domain (the data's dates).
  const rLoT = hSpan ? +x.invert(xR0) : xLoT;
  const rHiT = hSpan ? +x.invert(xR1) : xHiT;

  // ── Vertical: ranges + points ────────────────────────────────────────────
  const ranges = annotations
    .filter(a => a.kind === 'range' && +a.to >= rLoT && +a.from <= rHiT)
    .map(a => {
      const fromClamped = new Date(Math.max(+a.from, rLoT));
      const toClamped   = new Date(Math.min(+a.to,   rHiT));
      return { ...a, x1: x(fromClamped), x2: x(toClamped) };
    });

  const points = annotations
    .filter(a => a.kind === 'point' && +a.date >= xLoT && +a.date <= xHiT)
    .map(a => ({ ...a, cx: x(a.date) }));

  // ── Horizontal: ranges + points ──────────────────────────────────────────
  // Kept to the Y domain as the vertical ones are to the X domain: a level
  // off the scale is skipped, a band is cut at the plot's edge and draws only
  // the edges it really has (B-04). This also covers a log scale, whose
  // domain starts above zero.
  const yBounds = s => { const [a, b] = s.domain(); return [Math.min(a, b), Math.max(a, b)]; };

  const hRanges = annotations
    .filter(a => a.kind === 'hRange')
    .map(a => {
      const yScale = yScaleFor(a.axis);
      if (!yScale) return null;
      const [yLo, yHi] = yBounds(yScale);
      if (a.yTo < yLo || a.yFrom > yHi) return null;
      const yA = yScale(Math.max(a.yFrom, yLo));
      const yB = yScale(Math.min(a.yTo, yHi));
      return { ...a, yA, yB, edgeA: a.yFrom >= yLo, edgeB: a.yTo <= yHi, yScale };
    })
    .filter(Boolean);

  const hPoints = annotations
    .filter(a => a.kind === 'hPoint')
    .map(a => {
      const yScale = yScaleFor(a.axis);
      if (!yScale) return null;
      const [yLo, yHi] = yBounds(yScale);
      if (a.value < yLo || a.value > yHi) return null;
      return { ...a, cy: yScale(a.value), yScale };
    })
    .filter(Boolean);

  // ── Layer order: hRange fills → hRange edges → hPoint lines →
  //                 vertical range fills → vertical range edges → vertical lines →
  //                 vertical labels (above) → horizontal labels (inline)
  // ────────────────────────────────────────────────────────────────────────

  const gHRanges = g.append('g').attr('class', 'rc-annotation-h-ranges');
  const hRangeGroups = gHRanges.selectAll('.rc-annotation-h-range')
    .data(hRanges, (_, i) => `hr${i}`)
    .join('g')
    .attr('class', 'rc-annotation-h-range');

  hRangeGroups.append('rect')
    .attr('class', 'rc-annotation-h-range-fill')
    .attr('x',      xR0)
    .attr('y',      d => Math.min(d.yA, d.yB))
    .attr('width',  xR1 - xR0)
    .attr('height', d => Math.abs(d.yB - d.yA))
    .attr('fill',   d => d.fill ?? d.color ?? theme.muted)
    .attr('opacity', d => d.fillOpacity);

  hRangeGroups.each(function (d) {
    const sel    = d3.select(this);
    const dash   = resolveStrokeDash(d.strokeDash);
    const stroke = d.color ?? theme.muted;
    [[d.yA, d.edgeA], [d.yB, d.edgeB]].forEach(([yPx, real]) => {
      if (!real) return;
      sel.append('line')
        .attr('class', 'rc-annotation-h-range-edge')
        .attr('x1', xR0).attr('x2', xR1)
        .attr('y1', yPx).attr('y2', yPx)
        .attr('stroke', stroke)
        .attr('stroke-dasharray', dash);
    });
  });

  const gHPoints = g.append('g').attr('class', 'rc-annotation-h-points');
  gHPoints.selectAll('.rc-annotation-h-line')
    .data(hPoints, (_, i) => `hp${i}`)
    .join('line')
    .attr('class', 'rc-annotation-h-line')
    .attr('x1', xR0).attr('x2', xR1)
    .attr('y1', d => d.cy).attr('y2', d => d.cy)
    .attr('stroke', d => d.color ?? theme.muted)
    .attr('stroke-dasharray', d => resolveStrokeDash(d.strokeDash));

  // Vertical range bands
  const gRanges = g.append('g').attr('class', 'rc-annotation-ranges');
  const rangeGroups = gRanges.selectAll('.rc-annotation-range')
    .data(ranges, (_, i) => `r${i}`)
    .join('g')
    .attr('class', 'rc-annotation-range');

  rangeGroups.append('rect')
    .attr('class', 'rc-annotation-range-fill')
    .attr('x',      d => Math.min(d.x1, d.x2))
    .attr('y',      0)
    .attr('width',  d => Math.abs(d.x2 - d.x1))
    .attr('height', H)
    .attr('fill',   d => d.fill ?? d.color ?? theme.muted)
    .attr('opacity', d => d.fillOpacity);

  rangeGroups.each(function (d) {
    const sel    = d3.select(this);
    const dash   = resolveStrokeDash(d.strokeDash);
    const stroke = d.color ?? theme.muted;
    if (+d.from >= rLoT) {
      sel.append('line')
        .attr('class', 'rc-annotation-range-edge')
        .attr('x1', d.x1).attr('x2', d.x1)
        .attr('y1', 0).attr('y2', H)
        .attr('stroke', stroke)
        .attr('stroke-dasharray', dash);
    }
    if (+d.to <= rHiT) {
      sel.append('line')
        .attr('class', 'rc-annotation-range-edge')
        .attr('x1', d.x2).attr('x2', d.x2)
        .attr('y1', 0).attr('y2', H)
        .attr('stroke', stroke)
        .attr('stroke-dasharray', dash);
    }
  });

  // Vertical point lines
  const gPoints = g.append('g').attr('class', 'rc-annotation-points');
  gPoints.selectAll('.rc-annotation-line')
    .data(points, (_, i) => `p${i}`)
    .join('line')
    .attr('class', 'rc-annotation-line')
    .attr('x1', d => d.cx).attr('x2', d => d.cx)
    .attr('y1', 0).attr('y2', H)
    .attr('stroke', d => d.color ?? theme.muted)
    .attr('stroke-dasharray', d => resolveStrokeDash(d.strokeDash));

  // ── Labels: vertical (above), horizontal (inline) ────────────────────────

  const vLabelData = [
    ...points.map(d => ({
      key:   `p:${d.label}|${+d.date}`,
      cx:    d.cx,
      label: d.label,
      color: d.labelColor ?? d.color ?? theme.muted,
    })),
    ...ranges.map((d, i) => ({
      key:   `r:${i}:${d.label}`,
      cx:    (d.x1 + d.x2) / 2,
      label: d.label,
      color: d.labelColor ?? d.color ?? theme.muted,
    })),
  ].filter(d => d.label);

  const gVLabels = g.append('g').attr('class', 'rc-annotation-labels');
  const vLabelGroups = gVLabels.selectAll('.rc-annotation-label-g')
    .data(vLabelData, d => d.key)
    .join('g')
    .attr('class', 'rc-annotation-label-g')
    .attr('transform', d => `translate(${d.cx},${-labelHeight + 2})`);

  vLabelGroups.append('rect')
    .attr('class', 'rc-annotation-label-bg')
    .attr('fill', theme.bg);

  vLabelGroups.append('text')
    .attr('class', 'rc-annotation-label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.71em')
    .attr('fill', d => d.color)
    .text(d => d.label);

  vLabelGroups.each(function () {
    const node = d3.select(this);
    const bbox = node.select('text').node().getBBox();
    const px = 4, py = 1;
    node.select('rect')
      .attr('x', bbox.x - px)
      .attr('y', bbox.y - py)
      .attr('width',  bbox.width  + px * 2)
      .attr('height', bbox.height + py * 2);
  });

  // Horizontal labels — inline next to the line, with a small bg patch so the
  // text reads clearly against the data line. Anchored to left or right end
  // of the plot area depending on `labelPosition`.
  const hLabelData = [
    ...hPoints.map((d, i) => ({
      key:   `hp:${i}:${d.label}`,
      cy:    d.cy - 4,
      labelPosition: d.labelPosition,
      label: d.label,
      color: d.labelColor ?? d.color ?? theme.muted,
    })),
    ...hRanges.map((d, i) => ({
      key:   `hr:${i}:${d.label}`,
      cy:    Math.min(d.yA, d.yB) - 4,
      labelPosition: d.labelPosition,
      label: d.label,
      color: d.labelColor ?? d.color ?? theme.muted,
    })),
  ].filter(d => d.label);

  const gHLabels = g.append('g').attr('class', 'rc-annotation-h-labels');
  const hLabelGroups = gHLabels.selectAll('.rc-annotation-h-label-g')
    .data(hLabelData, d => d.key)
    .join('g')
    .attr('class', 'rc-annotation-h-label-g')
    .attr('transform', d => {
      const tx = d.labelPosition === 'right' ? xR1 - 4 : xR0 + 4;
      return `translate(${tx},${d.cy})`;
    });

  hLabelGroups.append('rect')
    .attr('class', 'rc-annotation-h-label-bg')
    .attr('fill', theme.bg);

  hLabelGroups.append('text')
    .attr('class', 'rc-annotation-h-label')
    .attr('text-anchor', d => d.labelPosition === 'right' ? 'end' : 'start')
    .attr('fill', d => d.color)
    .text(d => d.label);

  hLabelGroups.each(function () {
    const node = d3.select(this);
    const bbox = node.select('text').node().getBBox();
    const px = 4, py = 1;
    node.select('rect')
      .attr('x', bbox.x - px)
      .attr('y', bbox.y - py)
      .attr('width',  bbox.width  + px * 2)
      .attr('height', bbox.height + py * 2);
  });
}

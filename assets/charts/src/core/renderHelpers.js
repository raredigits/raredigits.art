// RareCharts — core/renderHelpers.js
// Stateless render functions for common chart elements.
// Each function mutates the passed D3 selection and returns nothing.

import * as d3 from 'd3';
import { markerPath, resolveStrokeDash, warnAxisTitleClipped } from './utils.js';

// ─── Accessibility ─────────────────────────────────────────────────────────────

/**
 * Give an <svg> root an accessible name so assistive technology announces the
 * chart instead of skipping it as an unlabeled graphic. Sets `role="img"` and
 * an `aria-label` built from the chart's title/subtitle (or an explicit
 * `ariaLabel` option), falling back to a generic "Chart".
 *
 * HTMLElement title/subtitle values are ignored here — only string slots
 * contribute to the label. Call once at SVG creation.
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
 * @param {d3.Selection} g      — target <g> element
 * @param {Function}     scale  — d3 linear scale (Y)
 * @param {number}       W      — chart width (for tick line length)
 * @param {number}       ticks  — tick count
 * @param {object}       theme
 */
export function renderGrid(g, scale, W, ticks, theme, tickValues = null) {
  const axis = tickValues
    ? d3.axisLeft(scale).tickValues(tickValues).tickSize(-W).tickFormat('')
    : d3.axisLeft(scale).ticks(ticks).tickSize(-W).tickFormat('');
  g.call(axis)
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
export function renderAxisX(g, scale, H, tickFormat, theme, ticks = 6) {
  const apply = (n) => {
    g.attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(scale).ticks(n).tickSize(0).tickPadding(6).tickFormat(tickFormat))
      .call(sel => {
        sel.selectAll('text')
          .attr('fill', theme.muted)
          .attr('dy', '0.71em')
          .style('font-family', theme.numericFont)
          .style('font-size', theme.fontSize);
        sel.select('.domain').remove();
        sel.selectAll('line').remove();
      });
  };

  apply(ticks);

  // Auto-thin labels when they overlap. Only kicks in for numeric tick counts;
  // explicit time intervals (d3.timeMonth.every(N)) are respected as-is.
  if (typeof ticks !== 'number') return;

  const minGap = 8;
  let attempts = 5;
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
    const newCount = Math.max(2, Math.floor(labels.length / 2));
    if (newCount === labels.length) break;
    apply(newCount);
  }
}

// ─── Y axis (right) ──────────────────────────────────────────────────────────

/**
 * Render the right-side Y axis (Y1 in DualAxes, sole Y in Line).
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Function}     scale      — d3 linear scale
 * @param {number}       W          — chart width (for translate)
 * @param {number}       ticks      — tick count
 * @param {Function}     tickFormat — value formatter
 * @param {boolean}      labelsOnly — hide axis line (default true)
 * @param {object}       theme
 */
export function renderAxisYRight(g, scale, W, ticks, tickFormat, labelsOnly = true, theme, tickValues = null) {
  const axis = tickValues
    ? d3.axisRight(scale).tickValues(tickValues).tickSize(0).tickPadding(8).tickFormat(tickFormat)
    : d3.axisRight(scale).ticks(ticks).tickSize(0).tickPadding(8).tickFormat(tickFormat);
  g.attr('transform', `translate(${W},0)`)
    .call(axis)
    .call(sel => {
      sel.selectAll('text')
        .attr('fill', theme.muted)
        .attr('text-anchor', 'start')
        .attr('x', 8)
        .style('font-family', theme.numericFont)
        .style('font-size', theme.fontSize);

      if (labelsOnly) {
        sel.select('.domain').remove();
        sel.selectAll('line').remove();
      } else {
        sel.select('.domain').attr('stroke', theme.border);
        sel.selectAll('line').remove();
      }
    });
}

// ─── Y axis (left) ───────────────────────────────────────────────────────────

/**
 * Render the left-side Y axis (Y2 in DualAxes).
 *
 * @param {d3.Selection} g          — target <g> element
 * @param {Function}     scale      — d3 linear scale
 * @param {number}       ticks      — tick count
 * @param {Function}     tickFormat — value formatter
 * @param {boolean}      labelsOnly — hide axis line (default true)
 * @param {object}       theme
 */
export function renderAxisYLeft(g, scale, ticks, tickFormat, labelsOnly = true, theme, tickValues = null) {
  const axis = tickValues
    ? d3.axisLeft(scale).tickValues(tickValues).tickSize(0).tickPadding(8).tickFormat(tickFormat)
    : d3.axisLeft(scale).ticks(ticks).tickSize(0).tickPadding(8).tickFormat(tickFormat);
  g.attr('transform', 'translate(0,0)')
    .call(axis)
    .call(sel => {
      sel.selectAll('text')
        .attr('fill', theme.muted)
        .attr('text-anchor', 'end')
        .attr('x', -8)
        .style('font-family', theme.numericFont)
        .style('font-size', theme.fontSize);

      if (labelsOnly) {
        sel.select('.domain').remove();
        sel.selectAll('line').remove();
      } else {
        sel.select('.domain').attr('stroke', theme.border);
        sel.selectAll('line').remove();
      }
    });
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
export function renderEndLabels(g, series, yScale, W, tickFormat, theme) {
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
    .attr('transform', d => `translate(${W + 10},${yScale(d.value)})`);

  // Background rect — sized after text renders via getBBox()
  groups.append('rect')
    .attr('class', 'rc-end-label-bg')
    .attr('fill', theme.service);

  groups.append('text')
    .attr('class', 'rc-end-label')
    .attr('dy', '0.35em')
    .attr('fill', d => d.color)
    .style('font-family', theme.numericFont)
    .style('font-size', theme.fontSize)
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
    .attr('fill', theme.muted)
    .style('font-family', theme.font)
    .style('font-size', theme.fontSize);

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

// ─── Line animation ───────────────────────────────────────────────────────────

/**
 * Animate SVG line paths using the stroke-dasharray draw technique.
 * Only call for solid lines — dashed/dotted paths must be rendered
 * instantly since they share the same stroke-dasharray attribute.
 *
 * @param {d3.Selection} paths    — selection of solid <path> elements
 * @param {number}       duration — ms
 * @param {Function}     ease     — d3 ease function
 * @param {Function}     onDone   — callback when animation completes
 */
export function animateLines(paths, duration, ease, onDone) {
  paths.each(function () {
    const p     = d3.select(this);
    const total = this.getTotalLength?.() ?? 0;
    if (!total) return;

    p.attr('stroke-dasharray', `${total} ${total}`)
      .attr('stroke-dashoffset', total)
      .transition()
      .duration(duration)
      .ease(ease)
      .attr('stroke-dashoffset', 0)
      .on('end', function () {
        // Clean up after animation so the attribute doesn't linger
        d3.select(this)
          .attr('stroke-dasharray', null)
          .attr('stroke-dashoffset', null);
      });
  });

  if (onDone) setTimeout(onDone, duration + 20);
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
 * Annotations outside the visible extent are skipped automatically.
 *
 * @param {d3.Selection} g           — target <g> element (chart-relative)
 * @param {Array}        annotations — normalized annotations from normalizeAnnotations()
 * @param {Function}     x           — d3 time scale (X axis)
 * @param {Function}     yScaleFor   — (axisKey) => d3 scale ; receives 'y1' or 'y2'
 * @param {number}       H           — chart drawing height
 * @param {number}       labelHeight — px reserved above the chart for vertical labels
 * @param {object}       theme
 */
export function renderAnnotations(g, annotations, x, yScaleFor, H, labelHeight, theme) {
  g.selectAll('*').remove();
  if (!annotations?.length) return;

  const [xLo, xHi] = x.domain();
  const xLoT = +xLo, xHiT = +xHi;
  const xR0  = x.range()[0];
  const xR1  = x.range()[1];

  // ── Vertical: ranges + points ────────────────────────────────────────────
  const ranges = annotations
    .filter(a => a.kind === 'range' && +a.to >= xLoT && +a.from <= xHiT)
    .map(a => {
      const fromClamped = new Date(Math.max(+a.from, xLoT));
      const toClamped   = new Date(Math.min(+a.to,   xHiT));
      return { ...a, x1: x(fromClamped), x2: x(toClamped) };
    });

  const points = annotations
    .filter(a => a.kind === 'point' && +a.date >= xLoT && +a.date <= xHiT)
    .map(a => ({ ...a, cx: x(a.date) }));

  // ── Horizontal: ranges + points ──────────────────────────────────────────
  const hRanges = annotations
    .filter(a => a.kind === 'hRange')
    .map(a => {
      const yScale = yScaleFor(a.axis);
      if (!yScale) return null;
      const yA = yScale(a.yFrom);
      const yB = yScale(a.yTo);
      return { ...a, yA, yB, yScale };
    })
    .filter(Boolean);

  const hPoints = annotations
    .filter(a => a.kind === 'hPoint')
    .map(a => {
      const yScale = yScaleFor(a.axis);
      if (!yScale) return null;
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
    [d.yA, d.yB].forEach(yPx => {
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
    if (+d.from >= xLoT) {
      sel.append('line')
        .attr('class', 'rc-annotation-range-edge')
        .attr('x1', d.x1).attr('x2', d.x1)
        .attr('y1', 0).attr('y2', H)
        .attr('stroke', stroke)
        .attr('stroke-dasharray', dash);
    }
    if (+d.to <= xHiT) {
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
    .style('font-family', theme.font)
    .style('font-size', theme.fontSize)
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
    .style('font-family', theme.font)
    .style('font-size', theme.fontSize)
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

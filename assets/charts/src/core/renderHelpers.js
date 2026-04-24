// RareCharts — core/renderHelpers.js
// Stateless render functions for common chart elements.
// Each function mutates the passed D3 selection and returns nothing.

import * as d3 from 'd3';
import { markerPath } from './utils.js';

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
  g.attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(scale).ticks(ticks).tickSize(0).tickPadding(6).tickFormat(tickFormat))
    .call(sel => {
      sel.selectAll('text')
        .attr('fill', theme.muted)
        .attr('dy', '0.71em')
        .style('font-family', theme.numericFont)
        .style('font-size', theme.fontSize);
      sel.select('.domain').remove();
      sel.selectAll('line').remove();
    });
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
 * @param {d3.Selection} g       — target <g> element
 * @param {number}       W       — chart width
 * @param {string|null}  y1Title — right axis title
 * @param {string|null}  y2Title — left axis title
 * @param {object}       theme
 */
export function renderAxisTitles(g, W, y1Title, y2Title, theme) {
  const titles = [];
  if (y2Title) titles.push({ axis: 'y2', text: y2Title });
  if (y1Title) titles.push({ axis: 'y1', text: y1Title });

  g.selectAll('.rc-axis-title')
    .data(titles, d => d.axis)
    .join('text')
    .attr('class', d => `rc-axis-title rc-axis-title-${d.axis}`)
    .attr('x', d => (d.axis === 'y1' ? W + 8 : -8))
    .attr('y', -28)
    .attr('fill', theme.muted)
    .style('font-family', theme.font)
    .style('font-size', theme.fontSize)
    .text(d => d.text);
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

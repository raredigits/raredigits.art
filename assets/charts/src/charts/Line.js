// RareCharts — Line
// Multi-series line chart (Bloomberg-ish) with crosshair.
//
// Data formats supported:
// 1) Single series: [{ date: Date|string|number, value: number }, ...]
// 2) Multi series:  [{ name, color?, values: [{ date, value }, ...] }, ...]
//
// Options:
//   height         — chart height (default: 240)
//   margin         — {top,right,bottom,left}
//   animate        — animate on first render (default: true)
//   duration       — ms (default: 650)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   yTickFormat    — function(value) => string
//   xTickFormat    — function(date) => string
//   yTicks         — number of ticks (default: 4)
//   yFormat        — 'auto' (default) | 'percent' | 'number'  (used only if yTickFormat is not provided)
//   zeroEpsilon    — treat values with |v| < epsilon as zero (default: 1e-6)
//
//   yLabelsOnly    — show only Y tick labels (no axis line, no tick lines) (default: true)
//   endLabels      — show last value labels on the right (default: true)
//
//   crosshair      — enable crosshair + dots + tooltip (default: true)
//   tooltipFormat  — function({date, points:[{name,value,color}]}) => html

import * as d3 from 'd3';
import { Chart } from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';

export class Line extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 240,
      margin: {
        top:    options.margin?.top    ?? 10,
        right:  options.margin?.right  ?? 60, 
        bottom: options.margin?.bottom ?? 18,
        left:   options.margin?.left   ?? 0,
      },
      ...options,
    });

    this._series = [];
    this._tooltip = new Tooltip(this.container, this.theme);
    this._didAnimateIn = false;

    this._initSVG();
  }

  setData(data) {
    this._series = this._normalizeData(data);
    this.render();
    return this;
  }

  _parseDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    const dt = new Date(v);
    return Number.isNaN(+dt) ? null : dt;
  }

  _normalizeData(data) {
    if (!data) return [];

    // If looks like [{date,value}] => single series
    if (Array.isArray(data) && data.length && data[0] && 'date' in data[0] && 'value' in data[0]) {
      return [{
        name: this.options.seriesName ?? 'Series',
        color: this.options.lineColor ?? (this.theme.blue ?? this.theme.accent),
        values: data.map(d => ({
          date: this._parseDate(d.date),
          value: +d.value,
        })).filter(d => d.date && Number.isFinite(d.value))
      }];
    }

    // Multi-series
    if (Array.isArray(data)) {
      return data.map((s, idx) => ({
        name: s.name ?? `Series ${idx + 1}`,
        color: s.color ?? (this.theme.colors?.[idx % (this.theme.colors.length || 1)] ?? (this.theme.accent)),
        values: (s.values ?? []).map(d => ({
          date: this._parseDate(d.date),
          value: +d.value,
        })).filter(d => d.date && Number.isFinite(d.value))
      })).filter(s => s.values.length);
    }

    return [];
  }

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    const { left, top } = this.margin;

    this.g = this.svg.append('g')
      .attr('transform', `translate(${left},${top})`);

    this.gGrid   = this.g.append('g').attr('class', 'rc-grid');
    this.gLines  = this.g.append('g').attr('class', 'rc-lines');
    this.gAxisX  = this.g.append('g').attr('class', 'rc-axis rc-axis-x');
    this.gAxisY  = this.g.append('g').attr('class', 'rc-axis rc-axis-y');
    this.gEnds   = this.g.append('g').attr('class', 'rc-end-labels');

    // Crosshair layer
    this.gCross  = this.g.append('g').attr('class', 'rc-crosshair');
    this.crossLine = this.gCross.append('line')
      .attr('class', 'rc-cross-line')
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('opacity', 0);

    this.gCrossDots = this.gCross.append('g').attr('class', 'rc-cross-dots');

    this.overlay = this.g.append('rect')
      .attr('class', 'rc-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');
  }

  render() {
    if (!this._series.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;

    const animate = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration = this.options.duration ?? 650;
    const easeName = this.options.ease ?? 'cubicOut';
    const ease = easeName === 'linear'
      ? d3.easeLinear
      : (easeName === 'cubicInOut' ? d3.easeCubicInOut : d3.easeCubicOut);

    const crosshair = this.options.crosshair ?? true;
    const endLabels = this.options.endLabels ?? true;
    const yLabelsOnly = this.options.yLabelsOnly ?? true;

    const all = this._series.flatMap(s => s.values);
    const xPad = 8;
    const x = d3.scaleTime()
      .domain(d3.extent(all, d => d.date))
      .range([xPad, W - xPad]);

    const maxY = d3.max(all, d => d.value);
    const minY = d3.min(all, d => d.value);
    const pad = (maxY - minY) * 0.08 || 1;

    const y = d3.scaleLinear()
      .domain([minY - pad, maxY + pad])
      .nice(4)
      .range([H, 0]);

    const yTicks = this.options.yTicks ?? 4;

    // Y formatter defaults:
    // - If values look like fractions (absMax <= 1) we default to percent.
    // - Otherwise we default to a compact number format.
    // Override with `yTickFormat`, or force via `yFormat: 'percent' | 'number' | 'auto'`.
    const yFormatMode = this.options.yFormat ?? 'auto';
    const absMax = d3.max(all, d => Math.abs(d.value)) ?? 0;
    const usePercent = yFormatMode === 'percent' || (yFormatMode === 'auto' && absMax <= 1);

    const prefix = this.options.yPrefix ?? '';
    const suffix = this.options.ySuffix ?? '';
    const zeroEps = this.options.zeroEpsilon ?? 1e-6;

    const baseY = usePercent
      ? d3.format('+.2%')
      : d3.format('.2s');

    const yTickFormat = this.options.yTickFormat ?? (v => {
      // kill +0.00% / -0.00% and any tiny noise around zero
      if (Math.abs(v) < zeroEps) {
        const z = usePercent && !suffix ? '0%' : '0';
        return `${prefix}${z}${suffix}`;
      }
      return `${prefix}${baseY(v)}${suffix}`;
    });

    const xTickFormat = this.options.xTickFormat ?? (d => d3.timeFormat('%m/%d')(d));

    // Grid: horizontal, subtle
    this.gGrid
      .attr('transform', 'translate(0,0)')
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(-W).tickFormat(''))
      .call(g => {
        g.selectAll('line').attr('stroke', t.grid);
        g.select('.domain').remove();
        g.selectAll('text').remove();
      });

    // X axis bottom
    this.gAxisX
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(0).tickFormat(xTickFormat))
      .call(g => {
        g.selectAll('text').attr('fill', t.muted);
        g.select('.domain').remove();
        g.selectAll('line').remove();
      });

    // Y axis right: labels only (no axis line)
    this.gAxisY
      .attr('transform', `translate(${W},0)`)
      .call(d3.axisRight(y).ticks(yTicks).tickSize(0).tickFormat(yTickFormat))
      .call(g => {
        g.selectAll('text').attr('fill', t.muted);
        if (yLabelsOnly) {
          g.select('.domain').remove();
          g.selectAll('line').remove();
        } else {
          g.select('.domain').attr('stroke', t.border);
          g.selectAll('line').remove();
        }
      });

    // Line generator
    const curveName = this.options.curve ?? 'monotone';
    const curve =
    curveName === 'linear' ? d3.curveLinear :
    curveName === 'step'   ? d3.curveStep :
    d3.curveMonotoneX;

    const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(curve);

    // Draw lines
    const paths = this.gLines.selectAll('.rc-line')
      .data(this._series, s => s.name)
      .join('path')
      .attr('class', 'rc-line')
      .attr('fill', 'none')
      .attr('stroke', s => s.color)
      .attr('stroke-width', 2)
      .attr('d', s => line(s.values));

    // Animate line drawing once
    if (animate) {
      paths.each(function() {
        const p = d3.select(this);
        const total = this.getTotalLength?.() ?? 0;
        if (!total) return;

        p.attr('stroke-dasharray', `${total} ${total}`)
         .attr('stroke-dashoffset', total)
         .transition()
         .duration(duration)
         .ease(ease)
         .attr('stroke-dashoffset', 0);
      });

      setTimeout(() => { this._didAnimateIn = true; }, duration + 20);
    } else {
      paths.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      this._didAnimateIn = true;
    }

    // End labels (right side) like the screenshot
    this.gEnds.selectAll('*').remove();
    if (endLabels) {
      const lastPoints = this._series.map(s => {
        const d = s.values[s.values.length - 1];
        return { name: s.name, color: s.color, date: d.date, value: d.value };
      });

      this.gEnds.selectAll('.rc-end-label')
        .data(lastPoints)
        .join('text')
        .attr('class', 'rc-end-label')
        .attr('x', W + 10)
        .attr('y', d => y(d.value))
        .attr('dy', '0.35em')
        .attr('fill', d => d.color)
        .style('font-family', t.font)
        .style('font-size', t.fontSize)
        .text(d => yTickFormat(d.value));
    }

    // Crosshair (vertical line + dots + tooltip)
    this.overlay
      .attr('width', W)
      .attr('height', H);

    this.crossLine
      .attr('y1', 0)
      .attr('y2', H)
      .attr('stroke', t.border)
      .attr('stroke-dasharray', '2,3');

    const bisect = d3.bisector(d => d.date).left;

    const setCross = (mx, event) => {
      const dt = x.invert(mx);

      const points = this._series.map(s => {
        const vals = s.values;
        const i = bisect(vals, dt, 1);
        const a = vals[i - 1];
        const b = vals[i];
        const d = (!b || (dt - a.date) < (b.date - dt)) ? a : b;
        return { name: s.name, color: s.color, date: d.date, value: d.value };
      });

      this.crossLine
        .attr('x1', mx)
        .attr('x2', mx)
        .attr('opacity', crosshair ? 1 : 0);

      const dots = this.gCrossDots.selectAll('.rc-cross-dot')
        .data(points, d => d.name)
        .join('circle')
        .attr('class', 'rc-cross-dot')
        .attr('r', 3)
        .attr('fill', d => d.color)
        .attr('stroke', t.bg)
        .attr('stroke-width', 1.5)
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.value))
        .attr('opacity', crosshair ? 1 : 0);

      if (!crosshair) return;

      const payload = { date: points[0]?.date, points };

      const html = this.options.tooltipFormat
        ? this.options.tooltipFormat(payload)
        : `<div>${d3.timeFormat('%b %d, %Y')(payload.date)}</div>` +
          points.map(p => `<div style="color:${p.color}">${p.name}: ${yTickFormat(p.value)}</div>`).join('');

      const [px, py] = d3.pointer(event, this.container);
      this._tooltip.show(px, py, html);
    };

    this.overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event, this.overlay.node());
        setCross(mx, event);
      })
      .on('mouseleave', () => {
        this.crossLine.attr('opacity', 0);
        this.gCrossDots.selectAll('.rc-cross-dot').attr('opacity', 0);
        this._tooltip.hide();
      });
  }
}
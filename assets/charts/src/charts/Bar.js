// RareCharts — Bar
// Vertical and horizontal bar chart.
//
// Expected data format:
// [{ label: string, value: number }, ...]
//
// Options:
//   orientation    — 'vertical' (default) | 'horizontal'
//   labelMaxLength — truncate long labels to N chars (default: no truncation)
//                    full label is always shown in tooltip
//   barColor       — override bar color (optional)
//   animate        — animate bars on first render (default: true)
//   duration       — animation duration ms (default: 500)
//   stagger        — per-bar delay ms (default: 0)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showValues     — show numeric labels at bar ends (horizontal only, default: false)
//   valueFormat    — function(d) => string for bar-end labels
//   valueOffset    — px offset from bar end (default: 6)
//   valueInsideGap — threshold px: label flips inside bar when space is tight (default: 42)
//
//   yTickFormat    — function(value) => string (vertical: Y axis labels)
//   yPrefix/ySuffix— prefix/suffix for default Y formatter (vertical)
//   xTickFormat    — function(value) => string (horizontal: X axis labels)
//   tooltipFormat  — function(d) => html string

import * as d3 from 'd3';
import { Chart }              from '../core/Chart.js';
import { Tooltip }            from '../core/Tooltip.js';
import { resolveEase }        from '../core/utils.js';
import { renderGrid }         from '../core/renderHelpers.js';

export class Bar extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 200,
      margin: {
        top:    options.margin?.top    ?? 12,
        right:  options.margin?.right  ?? (options.orientation === 'horizontal' ? 16  : 65),
        left:   options.margin?.left   ?? (options.orientation === 'horizontal' ? 65  : 0),
        bottom: options.margin?.bottom ?? (options.orientation === 'horizontal' ? 16  : 8),
      },
      ...options,
    });

    this._data          = [];
    this._didAnimateIn  = false;
    this._tooltip       = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  setData(data) {
    this._data = data;
    this.render();
    return this;
  }

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    this.gGrid  = this.g.append('g');
    this.gBars  = this.g.append('g');
    this.gAxisX = this.g.append('g');
    this.gAxisY = this.g.append('g');
  }

  _formatLabel(label) {
    const max = this.options.labelMaxLength;
    if (!max || label.length <= max) return label;
    return label.slice(0, max).trimEnd() + '\u2026';
  }

  _tooltipHtml(d) {
    return this.options.tooltipFormat
      ? this.options.tooltipFormat(d)
      : `<div>${d.label}</div><div>${d3.format(',')(d.value)}</div>`;
  }

  render() {
    if (!this._data.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t          = this.theme;
    const horizontal = this.options.orientation === 'horizontal';
    const animate    = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration   = this.options.duration ?? 500;
    const stagger    = this.options.stagger  ?? 0;
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');
    const barFill    = this.options.barColor ?? t.accent;

    const onBarOver = (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 0.75);
      const [mx, my] = d3.pointer(event, this.container);
      this._tooltip.show(mx, my, this._tooltipHtml(d));
    };
    const onBarOut = (event) => {
      d3.select(event.currentTarget).attr('opacity', 1);
      this._tooltip.hide();
    };

    horizontal ? this._renderHorizontal({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut })
               : this._renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut });
  }

  // ─── Horizontal ───────────────────────────────────────────────────────────

  _renderHorizontal({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    const y = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, H])
      .padding(0.25);

    const x = d3.scaleLinear()
      .domain([0, d3.max(this._data, d => d.value) * 1.1])
      .range([0, W]);

    const xTickFormat    = this.options.xTickFormat    ?? (d => d3.format('.2s')(d));
    const showValues     = this.options.showValues     ?? false;
    const valueOffset    = this.options.valueOffset    ?? 6;
    const valueInsideGap = this.options.valueInsideGap ?? 42;
    const valueFormat    = this.options.valueFormat    ?? (d => d3.format(',.0f')(d.value));

    // Grid — vertical lines at the bottom
    this.gGrid
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(this.options.xTicks ?? 4).tickSize(-H).tickFormat(''))
      .call(g => {
        g.selectAll('line').attr('stroke', t.grid);
        g.select('.domain').remove();
        g.selectAll('text').remove();
      });

    // Bars
    const bars = this.gBars.selectAll('.rc-bar')
      .data(this._data, d => d.label)
      .join(
        enter => enter.append('rect')
          .attr('class',  'rc-bar')
          .attr('x',      0)
          .attr('y',      d => y(d.label))
          .attr('height', y.bandwidth())
          .attr('width',  animate ? 0 : d => x(d.value))
          .attr('fill',   barFill),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — y/height depend on the current scale
    bars.attr('y', d => y(d.label)).attr('height', y.bandwidth());

    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('width', d => x(d.value))
        .on('end', (d, i, nodes) => { if (i === nodes.length - 1) this._didAnimateIn = true; });
    } else {
      bars.attr('width', d => x(d.value));
      this._didAnimateIn = true;
    }

    // Value labels
    if (showValues) {
      const placeValue = (sel) => {
        sel.each((d, i, nodes) => {
          const end = x(d.value);
          const inside = (W - end) < valueInsideGap;
          d3.select(nodes[i])
            .attr('x',            inside ? Math.max(2, end - valueOffset) : Math.min(W - 2, end + valueOffset))
            .attr('text-anchor',  inside ? 'end' : 'start')
            .attr('fill',         inside ? t.bg  : t.text);
        });
      };

      const values = this.gBars.selectAll('.rc-bar-value')
        .data(this._data, d => d.label)
        .join('text')
        .attr('class', 'rc-bar-value')
        .attr('y',     d => y(d.label) + y.bandwidth() / 2)
        .attr('dy',    '0.35em')
        .style('font-family',  t.numericFont)
        .style('font-size',    t.fontSize)
        .attr('opacity', animate ? 0 : 1)
        .text(d => valueFormat(d));

      if (animate) {
        values.attr('x', valueOffset)
          .transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
          .attr('opacity', 1)
          .on('end', (d, i, nodes) => placeValue(d3.select(nodes[i])));
        setTimeout(() => placeValue(values), duration + (this._data.length - 1) * stagger + 10);
      } else {
        placeValue(values);
      }
    } else {
      this.gBars.selectAll('.rc-bar-value').remove();
    }

    // Y axis — category labels on the left
    this.gAxisX
      .attr('transform', 'translate(0,0)')
      .call(d3.axisLeft(y).tickSize(0).tickFormat(d => this._formatLabel(d)))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.font)
          .style('font-size', t.fontSize);
        g.select('.domain').attr('stroke', t.border);
        this._bindLabelTooltips(g, 'left');
      });

    // X axis — values at the bottom
    this.gAxisY
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x)
        .tickValues(this.options.xTickValues ?? null)
        .ticks(this.options.xTicks ?? 4)
        .tickFormat(xTickFormat))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.numericFont)
          .style('font-size', t.fontSize);
        g.select('.domain').remove();
        g.selectAll('line').remove();
      });
  }

  // ─── Vertical ─────────────────────────────────────────────────────────────

  _renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    const x = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, W])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(this._data, d => d.value) * 1.1])
      .range([H, 0]);

    const prefix      = this.options.yPrefix ?? '';
    const suffix      = this.options.ySuffix ?? '';
    const yTickFormat = this.options.yTickFormat ?? (d => `${prefix}${d3.format('.2s')(d)}${suffix}`);

    // Grid — horizontal lines
    renderGrid(this.gGrid, y, W, 4, t);

    // Bars
    const bars = this.gBars.selectAll('.rc-bar')
      .data(this._data, d => d.label)
      .join(
        enter => enter.append('rect')
          .attr('class',  'rc-bar')
          .attr('x',      d => x(d.label))
          .attr('width',  x.bandwidth())
          .attr('y',      animate ? H : d => y(d.value))
          .attr('height', animate ? 0  : d => H - y(d.value))
          .attr('fill',   barFill),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — x/width depend on the current scale
    bars.attr('x', d => x(d.label)).attr('width', x.bandwidth());

    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('y',      d => y(d.value))
        .attr('height', d => H - y(d.value))
        .on('end', (d, i, nodes) => { if (i === nodes.length - 1) this._didAnimateIn = true; });
    } else {
      bars.attr('y', d => y(d.value)).attr('height', d => H - y(d.value));
      this._didAnimateIn = true;
    }

    // X axis — category labels at the bottom
    this.gAxisX
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).tickSize(0).tickFormat(d => this._formatLabel(d)))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.font)
          .style('font-size', t.fontSize);
        g.select('.domain').attr('stroke', t.border);
        this._bindLabelTooltips(g, 'bottom');
      });

    // Y axis — values on the right
    this.gAxisY
      .attr('transform', `translate(${W},0)`)
      .call(d3.axisRight(y).ticks(4).tickFormat(yTickFormat))
      .call(g => {
        g.selectAll('text')
          .attr('fill', t.muted)
          .style('font-family', t.numericFont)
          .style('font-size', t.fontSize);
        g.select('.domain').remove();
        g.selectAll('line').remove();
      });
  }

  // ─── Label tooltip on truncated axis labels ────────────────────────────────

  _bindLabelTooltips(g, side) {
    g.selectAll('.tick text')
      .style('cursor', 'default')
      .on('mouseover', (event, fullLabel) => {
        if (this._formatLabel(fullLabel) === fullLabel) return;
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, `<div>${fullLabel}</div>`);
      })
      .on('mouseout', () => this._tooltip.hide());
  }
}
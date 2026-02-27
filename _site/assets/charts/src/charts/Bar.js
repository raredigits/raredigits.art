// RareCharts — Bar
// Vertical and horizontal bar chart.
//
// Expected data format:
// [{ label: string, value: number }, ...]
//
// Options:
//   orientation    — 'vertical' (default) | 'horizontal'
//   labelMaxLength — truncate long labels to N characters (default: no truncation)
//                    full label is always shown in tooltip
//   barColor       — override bar color for this chart only (optional)
//   animate        — animate bars on first render (default: true)
//   duration       — animation duration in ms (default: 500)
//   stagger        — per-bar delay in ms (default: 0)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showValues     — show numeric labels at the end of bars (horizontal only, default: false)
//   valueFormat    — function(d) => string for bar-end labels (horizontal only)
//   valueOffset    — px offset from bar end (horizontal only, default: 6)
//   valueInsideGap — if bar end is close to right edge, draw label inside bar (default: 42)
//
//   yTickFormat    — function(value) => string (vertical: Y axis labels)
//   yPrefix/ySuffix— simple prefix/suffix applied to default Y formatter (vertical)
//
//   xTickFormat    — function(value) => string (horizontal: X axis labels)

import * as d3 from 'd3';
import { Chart } from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';

export class Bar extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 200,
      margin: {
        top:    options.margin?.top ?? 12,
        right:  options.margin?.right ?? (options.orientation === 'horizontal' ? 16 : 65),
        left:   options.margin?.left  ?? (options.orientation === 'horizontal' ? 65 : 0),
        bottom: options.margin?.bottom ?? (options.orientation === 'horizontal' ? 16 : 8),
      },
      ...options,
    });
    this._data    = [];
    this._tooltip = new Tooltip(this.container, this.theme);
    this._didAnimateIn = false;
    this._initSVG();
  }

  setData(data) {
    this._data = data;
    this.render();
    return this;
  }

  _initSVG() {
    this.container.style.height = this.options.height + 'px';
    this.svg = d3.select(this.container).append('svg').attr('width', '100%').attr('height', '100%');
    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);
    this.gGrid  = this.g.append('g');
    this.gBars  = this.g.append('g');
    this.gAxisX = this.g.append('g');
    this.gAxisY = this.g.append('g');
  }

  // Truncate label to maxLength, preserving full text for tooltip
  _formatLabel(label) {
    const max = this.options.labelMaxLength;
    if (!max || label.length <= max) return label;
    return label.slice(0, max).trimEnd() + '…';
  }

  render() {
    if (!this._data.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;
    const horizontal = this.options.orientation === 'horizontal';

    const animate = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration = this.options.duration ?? 500;
    const stagger = this.options.stagger ?? 0;
    const easeName = this.options.ease ?? 'cubicOut';

    const ease = easeName === 'linear'
      ? d3.easeLinear
      : (easeName === 'cubicInOut' ? d3.easeCubicInOut : d3.easeCubicOut);

    // Resolve bar color once (theme override + per-chart override)
    const barFill = this.options.barColor ?? (t.bar ?? t.accent);

    if (horizontal) {
      // Horizontal bars
      const y = d3.scaleBand()
        .domain(this._data.map(d => d.label))
        .range([0, H])
        .padding(0.25);

      const x = d3.scaleLinear()
        .domain([0, d3.max(this._data, d => d.value) * 1.1])
        .range([0, W]);

      const xTickFormat = this.options.xTickFormat ?? (d => d3.format('.2s')(d));

      const showValues = this.options.showValues ?? false;
      const valueOffset = this.options.valueOffset ?? 6;
      const valueInsideGap = this.options.valueInsideGap ?? 42;
      const valueFormat = this.options.valueFormat ?? (d => d3.format(',.0f')(d.value));

      // Grid (vertical gridlines) at the bottom
      this.gGrid
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(4).tickSize(-H).tickFormat(''))
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
            .attr('class', 'rc-bar')
            .attr('x', 0)
            .attr('y', d => y(d.label))
            .attr('height', y.bandwidth())
            .attr('width', animate ? 0 : (d => x(d.value)))
            .style('fill', barFill),
          update => update,
          exit => exit.remove()
        )
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget).attr('opacity', 0.8);
          const [mx, my] = d3.pointer(event, this.container);
          const html = this.options.tooltipFormat
            ? this.options.tooltipFormat(d)
            : `<div>${d.label}</div>
               <div>${d3.format(',.0f')(d.value)}</div>`;
          this._tooltip.show(mx, my, html);
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget)
            .attr('opacity', 1)
            .style('fill', barFill);
          this._tooltip.hide();
        });

      if (animate) {
        bars
          .transition()
          .duration(duration)
          .delay((d, i) => i * stagger)
          .ease(ease)
          .attr('width', d => x(d.value))
          .on('end', (d, i, nodes) => {
            if (i === nodes.length - 1) this._didAnimateIn = true;
          });
      } else {
        bars.attr('width', d => x(d.value));
        this._didAnimateIn = true;
      }

      // Value labels at the end of bars (optional)
      if (showValues) {
        const values = this.gBars.selectAll('.rc-bar-value')
          .data(this._data, d => d.label)
          .join('text')
          .attr('class', 'rc-bar-value')
          .attr('y', d => y(d.label) + y.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('opacity', animate ? 0 : 1)
          .text(d => valueFormat(d));

        const placeValue = (sel) => {
          sel.each((d, i, nodes) => {
            const end = x(d.value);
            const placeInside = (W - end) < valueInsideGap;
            d3.select(nodes[i])
              .attr('x', placeInside ? Math.max(2, end - valueOffset) : Math.min(W - 2, end + valueOffset))
              .attr('text-anchor', placeInside ? 'end' : 'start')
              .attr('fill', placeInside ? t.bg : t.text);
          });
        };

        if (animate) {
          // start near the origin, then move to the final position and fade in
          values.attr('x', valueOffset);
          values
            .transition()
            .duration(duration)
            .delay((d, i) => i * stagger)
            .ease(ease)
            .attr('opacity', 1)
            .on('start', function() { /* keep x */ })
            .on('end', function(d, i, nodes) {
              // snap to computed position at the end of each bar animation
              placeValue(d3.select(nodes[i]));
            });

          // also set the correct position for all after the whole animation
          setTimeout(() => placeValue(values), duration + (this._data.length - 1) * stagger + 10);
        } else {
          placeValue(values);
        }

      } else {
        this.gBars.selectAll('.rc-bar-value').remove();
      }

      // Axis Y — labels on the left (category axis)
      this.gAxisX
        .attr('transform', 'translate(0,0)')
        .call(d3.axisLeft(y).tickSize(0).tickFormat(d => this._formatLabel(d)))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted);
          g.select('.domain').attr('stroke', t.border);

          // Show full label on hover if truncated
          g.selectAll('.tick text')
            .style('cursor', 'default')
            .on('mouseover', (event, fullLabel) => {
              const shown = this._formatLabel(fullLabel);
              if (shown === fullLabel) return;
              const [mx, my] = d3.pointer(event, this.container);
              this._tooltip.show(mx, my, `<div>${fullLabel}</div>`);
            })
            .on('mouseout', () => this._tooltip.hide());
        });

      // Axis X — values at the bottom
      this.gAxisY
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(xTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.text);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });

    } else {
      // Vertical bars
      const x = d3.scaleBand()
        .domain(this._data.map(d => d.label))
        .range([0, W])
        .padding(0.25);

      const y = d3.scaleLinear()
        .domain([0, d3.max(this._data, d => d.value) * 1.1])
        .range([H, 0]);

      // --- Y axis formatting (right axis) ---
      const prefix = this.options.yPrefix ?? '';
      const suffix = this.options.ySuffix ?? '';
      const yTickFormat = this.options.yTickFormat
        ?? (d => `${prefix}${d3.format('.2s')(d)}${suffix}`);

      // Grid (horizontal gridlines)
      this.gGrid
        .attr('transform', 'translate(0,0)')
        .call(d3.axisLeft(y).ticks(4).tickSize(-W).tickFormat(''))
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
            .attr('class', 'rc-bar')
            .attr('x', d => x(d.label))
            .attr('width', x.bandwidth())
            .attr('y', animate ? H : (d => y(d.value)))
            .attr('height', animate ? 0 : (d => H - y(d.value)))
            .style('fill', barFill),
          update => update,
          exit => exit.remove()
        )
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget).attr('opacity', 0.8);
          const [mx, my] = d3.pointer(event, this.container);
          const html = this.options.tooltipFormat
            ? this.options.tooltipFormat(d)
            : `<div>${d.label}</div>
               <div>${d3.format(',.0f')(d.value)}</div>`;
          this._tooltip.show(mx, my, html);
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget)
            .attr('opacity', 1)
            .style('fill', barFill);
          this._tooltip.hide();
        });

      if (animate) {
        bars
          .transition()
          .duration(duration)
          .delay((d, i) => i * stagger)
          .ease(ease)
          .attr('y', d => y(d.value))
          .attr('height', d => H - y(d.value))
          .on('end', (d, i, nodes) => {
            if (i === nodes.length - 1) this._didAnimateIn = true;
          });
      } else {
        bars
          .attr('y', d => y(d.value))
          .attr('height', d => H - y(d.value));
        this._didAnimateIn = true;
      }

      // Axis X — labels at the bottom
      this.gAxisX
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).tickSize(0).tickFormat(d => this._formatLabel(d)))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted);
          g.select('.domain').attr('stroke', t.border);

          // Show full label on hover if truncated
          g.selectAll('.tick text')
            .style('cursor', 'default')
            .on('mouseover', (event, fullLabel) => {
              const shown = this._formatLabel(fullLabel);
              if (shown === fullLabel) return;
              const [mx, my] = d3.pointer(event, this.container);
              this._tooltip.show(mx, my, `<div>${fullLabel}</div>`);
            })
            .on('mouseout', () => this._tooltip.hide());
        });

      // Axis Y — values on the right
      this.gAxisY
        .attr('transform', `translate(${W},0)`)
        .call(d3.axisRight(y).ticks(4).tickFormat(yTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.text);

          // Keep the axis line so it's visible
          g.select('.domain').attr('stroke', t.border);

          // Optional: remove tick lines (keep labels)
          g.selectAll('line').remove();
        });
    }
  }
}
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
//   showGrid       — show grid lines (default: true)
//   showXAxis      — show X axis (default: true)
//   showYAxis      — show Y axis (default: true)
//
//   yTickFormat    — function(value) => string (vertical: Y axis labels)
//   yPrefix/ySuffix— prefix/suffix for default Y formatter (vertical)
//   xTickFormat    — function(value) => string (horizontal: X axis labels)
//   tooltipFormat  — function(d) => html string

import * as d3 from 'd3';
import { Chart }              from '../core/Chart.js';
import { Tooltip }            from '../core/Tooltip.js';
import { parseDate, resolveEase, niceTickValues } from '../core/utils.js';
import { renderGrid }         from '../core/renderHelpers.js';

export class Bar extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 200,
      margin: {
        top:    options.margin?.top    ?? 12,
        right:  options.margin?.right  ?? (options.orientation === 'horizontal' ? 0  : 65),
        left:   options.margin?.left   ?? (options.orientation === 'horizontal' ? 65  : 0),
        bottom: options.margin?.bottom ?? (options.orientation === 'horizontal' ? 16  : 8),
      },
      ...options,
    });

    this._data          = [];
    this._isTimeSeries  = false;
    this._didAnimateIn  = false;
    this._tooltip       = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  setData(data) {
    const isTimeSeries = Array.isArray(data) && data[0] && 'date' in data[0] && 'value' in data[0];

    this._isTimeSeries = isTimeSeries;
    this._data = isTimeSeries
      ? data
        .map(d => ({
          ...d,
          date: parseDate(d.date),
          value: +d.value,
          label: d.label ?? '',
        }))
        .filter(d => d.date && Number.isFinite(d.value))
      : data;

    this._syncTimeframeButtons(this._getDataExtent());
    this.render();
    return this;
  }

  _getDataExtent() {
    return this._isTimeSeries && this._data.length
      ? d3.extent(this._data, d => d.date)
      : null;
  }

  _getNavigatorData() {
    return this._isTimeSeries && this._data.length ? this._data : null;
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
      : `<div>${d.label || d3.timeFormat('%b %d, %Y')(d.date)}</div><div>${d3.format(',')(d.value)}</div>`;
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

    if (!horizontal && this._isTimeSeries) {
      const fullExtent = this._getDataExtent();
      const viewExtent = this._resolveViewExtent(fullExtent);
      const visible = this._data.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]);
      if (!visible.length) return;
      this._syncTimeframeButtons(fullExtent, viewExtent);
      this._syncNavigator();
      this._renderTimeSeries({ data: visible, W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut, viewExtent });
      return;
    }

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
    const showGrid       = this.options.showGrid       ?? true;
    const showXAxis      = this.options.showXAxis      ?? true;
    const showYAxis      = this.options.showYAxis      ?? true;

    // Grid — vertical lines
    if (showGrid) {
      this.gGrid
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(this.options.xTicks ?? 4).tickSize(-H).tickFormat(''))
        .call(g => {
          g.selectAll('line').attr('stroke', t.grid);
          g.select('.domain').remove();
          g.selectAll('text').remove();
        });
    } else {
      this.gGrid.selectAll('*').remove();
    }

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
    if (showYAxis) {
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
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    // X axis — values at the bottom
    if (showXAxis) {
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
    } else {
      this.gAxisY.selectAll('*').remove();
    }
  }

  // ─── Vertical ─────────────────────────────────────────────────────────────

  _renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    const x = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, W])
      .padding(0.25);

    const maxVal = d3.max(this._data, d => d.value);
    const yTicks = this.options.yTicks ?? 4;
    // For bars (always starting from 0), use d3's .nice() + .ticks() to get
    // clean tick values without overshooting. niceTickValues() can pick a step
    // that's 2× too large (e.g. step=100k for max=156k → ticks go to 300k).
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .nice(yTicks)
      .range([H, 0]);
    const resolvedYTickValues = this.options.yTickValues ?? y.ticks(yTicks);

    const prefix      = this.options.yPrefix ?? '';
    const suffix      = this.options.ySuffix ?? '';
    const yTickFormat = this.options.yTickFormat ?? (d => `${prefix}${d3.format('.2s')(d)}${suffix}`);
    const showGrid    = this.options.showGrid  ?? true;
    const showXAxis   = this.options.showXAxis ?? true;
    const showYAxis   = this.options.showYAxis ?? true;

    // Grid — horizontal lines
    if (showGrid) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

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
    if (showXAxis) {
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
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    // Y axis — values on the right
    if (showYAxis) {
      this.gAxisY
        .attr('transform', `translate(${W},0)`)
        .call(d3.axisRight(y).tickValues(resolvedYTickValues).tickFormat(yTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted)
            .style('font-family', t.numericFont)
            .style('font-size', t.fontSize);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });
    } else {
      this.gAxisY.selectAll('*').remove();
    }
  }

  _renderTimeSeries({ data, W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut, viewExtent }) {
    const xPad = 8;
    const x = d3.scaleTime()
      .domain(viewExtent)
      .range([xPad, W - xPad]);

    const minValue = d3.min(data, d => d.value) ?? 0;
    const maxValue = d3.max(data, d => d.value) ?? 0;
    const yTicks = this.options.yTicks ?? 4;
    const y = d3.scaleLinear()
      .domain([Math.min(0, minValue), Math.max(0, maxValue)])
      .nice(yTicks)
      .range([H, 0]);
    const resolvedYTickValues = this.options.yTickValues ?? y.ticks(yTicks);

    const yTickFormat = this.options.yTickFormat ?? (d => d3.format('.2s')(d));
    const xTickFormat = this.options.xTickFormat ?? (d => d3.timeFormat('%b')(d));
    const showGrid    = this.options.showGrid  ?? true;
    const showXAxis   = this.options.showXAxis ?? true;
    const showYAxis   = this.options.showYAxis ?? true;

    if (showGrid) {
      renderGrid(this.gGrid, y, W, yTicks, t, resolvedYTickValues);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    const minStep = data.length > 1
      ? d3.min(data.slice(1), (d, i) => x(d.date) - x(data[i].date))
      : W;
    const barW = Math.max(2, Math.min(48, (minStep ?? W) * (this.options.barWidthRatio ?? 0.72)));
    const zeroY = y(0);

    const bars = this.gBars.selectAll('.rc-bar')
      .data(data, d => +d.date)
      .join(
        enter => enter.append('rect')
          .attr('class', 'rc-bar')
          .attr('x', d => x(d.date) - barW / 2)
          .attr('width', barW)
          .attr('y', animate ? zeroY : d => y(Math.max(0, d.value)))
          .attr('height', animate ? 0 : d => Math.abs(y(d.value) - zeroY))
          .attr('fill', barFill),
        update => update,
        exit => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout', onBarOut);

    bars.attr('x', d => x(d.date) - barW / 2).attr('width', barW);

    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('y', d => y(Math.max(0, d.value)))
        .attr('height', d => Math.abs(y(d.value) - zeroY))
        .on('end', (d, i, nodes) => { if (i === nodes.length - 1) this._didAnimateIn = true; });
    } else {
      bars.attr('y', d => y(Math.max(0, d.value)))
        .attr('height', d => Math.abs(y(d.value) - zeroY));
      this._didAnimateIn = true;
    }

    if (showXAxis) {
      this.gAxisX
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(this.options.xTicks ?? 6).tickSize(0).tickFormat(xTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted)
            .style('font-family', t.numericFont)
            .style('font-size', t.fontSize);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    if (showYAxis) {
      this.gAxisY
        .attr('transform', `translate(${W},0)`)
        .call(d3.axisRight(y).tickValues(resolvedYTickValues).tickFormat(yTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted)
            .style('font-family', t.numericFont)
            .style('font-size', t.fontSize);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });
    } else {
      this.gAxisY.selectAll('*').remove();
    }
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

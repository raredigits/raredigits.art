// RareCharts — Bar
// Vertical and horizontal bar chart with three data modes, detected by shape:
//
//   categorical  [{ label, value }, ...]
//                Values may be negative: bars grow from a zero baseline in
//                both directions (below it when vertical, to the left of it
//                when horizontal).
//   time-series  [{ date, value }, ...]  (vertical only)
//                Time X scale; supports the shared view API — timeframes,
//                defaultTimeframe, defaultView, navigator, setView/getView.
//   stacked      [{ name, color?, values: [{ label, value }] }, ...]
//                Series stack segments per category, both orientations.
//                Categories are the ordered union of series labels; values
//                must be >= 0. stacked: 'percent' normalizes each bar to
//                100%. A legend is auto-built from series names unless a
//                `legend` option is passed.
//
// Options:
//   orientation    — 'vertical' (default) | 'horizontal'
//   labelMaxLength — truncate long labels to N chars (default: no truncation)
//                    full label is always shown in tooltip
//   barColor       — override bar color (single-series modes)
//   barWidthRatio  — bar width as a fraction of the slot (time-series, default: 0.72)
//   stacked        — 'percent' normalizes each bar to 100% (stacking itself is
//                    switched on by the series-major data shape)
//   animate        — animate bars on first render (default: true)
//   duration       — animation duration ms (default: 500)
//   stagger        — per-bar delay ms (default: 0)
//   ease           — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showValues     — show numeric labels at bar ends (horizontal only, default: false)
//   valueFormat    — function(d) => string for bar-end labels and the default
//                    stacked-segment tooltip value
//   valueOffset    — px offset from bar end (default: 6)
//   valueInsideGap — threshold px: label flips inside bar when space is tight (default: 42)
//
//   showGrid       — show grid lines (default: true)
//   showXAxis      — show X axis (default: true; hiding it also reclaims its margin)
//   showYAxis      — show Y axis (default: true; hiding it also reclaims its margin)
//
//   yTicks / yTickValues — value-axis tick count / explicit positions (vertical)
//   xTicks / xTickValues — value-axis tick count / explicit positions (horizontal)
//   yTickFormat    — function(value) => string (vertical: Y axis labels)
//   yPrefix/ySuffix— prefix/suffix for default Y formatter (vertical)
//   xTickFormat    — function(value) => string (horizontal: X axis labels)
//   tooltipFormat  — function(d) => html string; the stacked mode passes a
//                    segment { name, cat, value, total }

import * as d3 from 'd3';
import { Chart }              from '../core/Chart.js';
import { Tooltip }            from '../core/Tooltip.js';
import { parseDate, resolveEase, niceTickValues, motionDuration } from '../core/utils.js';
import { renderGrid, applySvgA11y } from '../core/renderHelpers.js';

const SEG_SEP = String.fromCharCode(31); // stacked join-key separator (never in labels)

// Exactly `count` intervals over a niced stack domain. scale.ticks(count) aims
// for "approximately count" and can nearly double it — domain [0, 120] with
// count 4 yields 7 ticks at step 20. Dividing the niced domain keeps the
// requested density and always labels both ends of the scale.
function stackTickValues(scale, count) {
  const [d0, d1] = scale.domain();
  return d3.range(count + 1).map(i => d0 + (d1 - d0) * (i / count));
}

export class Bar extends Chart {
  constructor(selector, options = {}) {
    const { margin: _margin, ...restOptions } = options;

    // Margin defaults track the axis that owns each gutter (which axis that
    // is flips with the orientation). A hidden axis collapses its gutter so
    // the plot runs flush; an explicit margin always wins.
    const horizontal = options.orientation === 'horizontal';
    const yGutter    = options.showYAxis !== false;
    const xGutter    = options.showXAxis !== false;

    super(selector, {
      height: 200,
      margin: {
        top:    options.margin?.top    ?? 12,
        right:  options.margin?.right  ?? (!horizontal && yGutter ? 65 : 0),
        left:   options.margin?.left   ?? (horizontal && yGutter ? 65 : 0),
        bottom: options.margin?.bottom ?? (xGutter ? (horizontal ? 16 : 8) : 0),
      },
      ...restOptions,
    });

    this._data          = [];
    this._isTimeSeries  = false;
    this._isStacked     = false;
    this._hasUserLegend = options.legend != null;
    this._series        = [];
    this._categories    = [];
    this._didAnimateIn  = false;
    this._tooltip       = new Tooltip(this.container, this.theme);

    this._initSVG();
  }

  setData(data) {
    // Series-major shape [{ name, values: [...] }] switches on the stacked mode.
    const first = Array.isArray(data) ? data[0] : null;
    if (first && Array.isArray(first.values)) return this._setStackedData(data);

    const isTimeSeries = Array.isArray(data) && data[0] && 'date' in data[0] && 'value' in data[0];

    this._isStacked    = false;
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
    applySvgA11y(this.svg, this.options);

    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    this.gGrid  = this.g.append('g');
    this.gBars  = this.g.append('g');
    this.gAxisX = this.g.append('g');
    this.gAxisY = this.g.append('g').classed('rc-axis', true);  // value axis — numeric font (rare-charts.css)
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
    if (this._isStacked) { this._renderStacked(); return; }
    if (!this._data.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t          = this.theme;
    const horizontal = this.options.orientation === 'horizontal';
    const animate    = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration   = motionDuration(this.options.duration ?? 500);
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
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    const y = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, H])
      .padding(0.25);

    // The domain always includes 0 — bars grow from the zero baseline, and
    // negative values extend to the left of it.
    const maxVal = d3.max(this._data, d => d.value);
    const minVal = d3.min(this._data, d => d.value);
    const x = d3.scaleLinear()
      .domain([Math.min(0, minVal * 1.1), Math.max(0, maxVal * 1.1)])
      .range([0, W]);
    const zeroX = x(0);

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
          .attr('x',      animate ? zeroX : d => Math.min(zeroX, x(d.value)))
          .attr('y',      d => y(d.label))
          .attr('height', y.bandwidth())
          .attr('width',  animate ? 0 : d => Math.abs(x(d.value) - zeroX))
          .attr('fill',   barFill),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — y/height depend on the current scale
    bars.attr('y', d => y(d.label)).attr('height', y.bandwidth());

    // Animate once; finalize on re-render. See the note in _renderVertical.
    this._didAnimateIn = true;
    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('x',     d => Math.min(zeroX, x(d.value)))
        .attr('width', d => Math.abs(x(d.value) - zeroX));
    } else {
      bars.interrupt()
          .attr('x', d => Math.min(zeroX, x(d.value)))
          .attr('width', d => Math.abs(x(d.value) - zeroX));
    }

    // Value labels
    if (showValues) {
      const placeValue = (sel) => {
        sel.each((d, i, nodes) => {
          // The label sits just past the bar's value end — to the right of a
          // positive bar, to the left of a negative one — and flips inside
          // the bar when the space between the end and the chart edge is tight.
          const end = x(d.value);
          const neg = d.value < 0;
          const inside = (neg ? end : W - end) < valueInsideGap;
          const xPos = neg
            ? (inside ? Math.min(W - 2, end + valueOffset) : Math.max(2, end - valueOffset))
            : (inside ? Math.max(2, end - valueOffset) : Math.min(W - 2, end + valueOffset));
          const anchor = (neg ? !inside : inside) ? 'end' : 'start';
          d3.select(nodes[i])
            .attr('x',            xPos)
            .attr('text-anchor',  anchor)
            .attr('fill',         inside ? t.bg  : t.text);
        });
      };

      const values = this.gBars.selectAll('.rc-bar-value')
        .data(this._data, d => d.label)
        .join('text')
        .attr('class', 'rc-bar-value')
        .attr('y',     d => y(d.label) + y.bandwidth() / 2)
        .attr('dy',    '0.35em')
        .attr('opacity', animate ? 0 : 1)
        .text(d => valueFormat(d));

      if (animate) {
        values.attr('x', zeroX + valueOffset)
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
            .attr('fill', t.muted);
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
            .attr('fill', t.muted);
          g.select('.domain').remove();
          g.selectAll('line').remove();

          // The value axis can sit flush against the chart edge (margin.left /
          // right = 0), where a centered first/last label would be half-clipped
          // by the card's overflow. Anchor the end labels inward instead.
          const ticks = g.selectAll('.tick text');
          const n = ticks.size();
          ticks.attr('text-anchor', (d, i) =>
            i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle');
        });
    } else {
      this.gAxisY.selectAll('*').remove();
    }
  }

  // ─── Vertical ─────────────────────────────────────────────────────────────

  _renderVertical({ W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut }) {
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    const x = d3.scaleBand()
      .domain(this._data.map(d => d.label))
      .range([0, W])
      .padding(0.25);

    const maxVal = d3.max(this._data, d => d.value);
    const minVal = d3.min(this._data, d => d.value);
    const yTicks = this.options.yTicks ?? 4;
    // Bars grow from a zero baseline, so the domain always includes 0 and
    // extends to the data on both sides — negative bars hang below it.
    // d3's .nice() + .ticks() gives clean tick values without overshooting.
    // niceTickValues() can pick a step that's 2× too large (e.g. step=100k
    // for max=156k → ticks go to 300k).
    const y = d3.scaleLinear()
      .domain([Math.min(0, minVal * 1.1), Math.max(0, maxVal * 1.1)])
      .nice(yTicks)
      .range([H, 0]);
    const zeroY = y(0);
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
          .attr('y',      animate ? zeroY : d => y(Math.max(0, d.value)))
          .attr('height', animate ? 0     : d => Math.abs(y(d.value) - zeroY))
          .attr('fill',   barFill),
        update => update,
        exit   => exit.remove()
      )
      .on('mouseover', onBarOver)
      .on('mouseout',  onBarOut);

    // Always reposition on resize — x/width depend on the current scale
    bars.attr('x', d => x(d.label)).attr('width', x.bandwidth());

    // Animate once per instance. Set the guard synchronously (not on transition
    // end, which never fires if a re-render interrupts) so that later renders —
    // fonts.ready, resize — take the else branch and finalize to the CURRENT
    // scale. interrupt() drops an in-flight entry tween (which may target a stale
    // plot height measured mid-layout) so it can't override the final geometry.
    this._didAnimateIn = true;
    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('y',      d => y(Math.max(0, d.value)))
        .attr('height', d => Math.abs(y(d.value) - zeroY));
    } else {
      bars.interrupt()
        .attr('y', d => y(Math.max(0, d.value))).attr('height', d => Math.abs(y(d.value) - zeroY));
    }

    // X axis — category labels at the bottom
    if (showXAxis) {
      this.gAxisX
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).tickSize(0).tickFormat(d => this._formatLabel(d)))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted);
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
            .attr('fill', t.muted);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });
    } else {
      this.gAxisY.selectAll('*').remove();
    }
  }

  _renderTimeSeries({ data, W, H, t, animate, duration, stagger, ease, barFill, onBarOver, onBarOut, viewExtent }) {
    this.gAxisX.classed('rc-axis', true).classed('rc-axis-cat', false);  // numeric (time) axis
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

    // Animate once; finalize on re-render. See the note in _renderVertical.
    this._didAnimateIn = true;
    if (animate) {
      bars.transition().duration(duration).delay((d, i) => i * stagger).ease(ease)
        .attr('y', d => y(Math.max(0, d.value)))
        .attr('height', d => Math.abs(y(d.value) - zeroY));
    } else {
      bars.interrupt()
        .attr('y', d => y(Math.max(0, d.value)))
        .attr('height', d => Math.abs(y(d.value) - zeroY));
    }

    if (showXAxis) {
      this.gAxisX
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(this.options.xTicks ?? 6).tickSize(0).tickFormat(xTickFormat))
        .call(g => {
          g.selectAll('text')
            .attr('fill', t.muted);
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
            .attr('fill', t.muted);
          g.select('.domain').remove();
          g.selectAll('line').remove();
        });
    } else {
      this.gAxisY.selectAll('*').remove();
    }
  }

  // ─── Stacked (multi-series composition) ─────────────────────────────────────

  _setStackedData(data) {
    this._isStacked    = true;
    this._isTimeSeries = false;

    this._series = (data ?? []).map(s => ({
      name:  s.name ?? '',
      color: s.color,
      values: (s.values ?? []).map(v => ({ label: String(v.label ?? ''), value: +v.value })),
    }));

    // Categories are the ordered union of labels across every series, so a
    // series that omits a category simply contributes 0 there.
    const seen = new Set();
    this._categories = [];
    this._series.forEach(s => s.values.forEach(v => {
      if (v.label && !seen.has(v.label)) { seen.add(v.label); this._categories.push(v.label); }
    }));

    this._ensureStackedLegend();
    this.render();
    return this;
  }

  // Auto-build a legend from the series names unless the caller passed their own.
  _ensureStackedLegend() {
    if (!this._hasUserLegend) {
      const palette = this.theme.colors ?? [];
      this.options.legend = this._series.map((s, i) => ({
        label: s.name || `Series ${i + 1}`,
        type:  'bar',
        color: s.color ?? palette[i % palette.length] ?? this.theme.accent,
      }));
    }
    this._renderHeader();
  }

  _computeStack() {
    const keys = this._series.map((_, i) => String(i));
    const rows = this._categories.map(cat => {
      const row = { label: cat, _total: 0 };
      this._series.forEach((s, i) => {
        const hit = s.values.find(v => v.label === cat);
        const val = hit && Number.isFinite(hit.value) && hit.value > 0 ? hit.value : 0;
        row[String(i)] = val;
        row._total += val;
      });
      return row;
    });

    const percent = this.options.stacked === 'percent';
    const gen = d3.stack().keys(keys);
    if (percent) gen.offset(d3.stackOffsetExpand);

    return { layers: gen(rows), maxTotal: percent ? 1 : (d3.max(rows, r => r._total) || 0), percent };
  }

  _stackSegments(layers) {
    const segs = [];
    layers.forEach((layer, i) => {
      layer.forEach((d, j) => {
        const value = d.data[String(i)];
        if (!(value > 0)) return;
        segs.push({
          i,
          name:  this._series[i].name || `Series ${i + 1}`,
          cat:   this._categories[j],
          v0:    d[0],
          v1:    d[1],
          value,
          total: d.data._total,
        });
      });
    });
    return segs;
  }

  _segTooltipHtml(seg) {
    if (this.options.tooltipFormat) return this.options.tooltipFormat(seg);
    const valFmt = this.options.valueFormat ?? (d => d3.format(',')(d.value));
    const pct    = seg.total > 0 ? seg.value / seg.total : 0;
    return `<div>${seg.cat}</div>
      <div>${seg.name}: ${valFmt(seg)}</div>
      <div>${d3.format('.1%')(pct)}</div>`;
  }

  _renderStacked() {
    this.gAxisX.classed('rc-axis-cat', true).classed('rc-axis', false);  // category axis
    if (!this._series.length || !this._categories.length) return;
    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;
    const palette  = t.colors ?? [];
    const colorFor = i => this._series[i].color ?? palette[i % palette.length] ?? t.accent;
    const { layers, maxTotal, percent } = this._computeStack();
    const segs = this._stackSegments(layers);

    const horizontal = this.options.orientation === 'horizontal';
    const animate    = (this.options.animate ?? true) && !this._didAnimateIn;
    const duration   = motionDuration(this.options.duration ?? 500);
    const ease       = resolveEase(this.options.ease ?? 'cubicOut');

    const showGrid  = this.options.showGrid  ?? true;
    const showXAxis = this.options.showXAxis ?? true;
    const showYAxis = this.options.showYAxis ?? true;

    const onOver = (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 0.8);
      const [mx, my] = d3.pointer(event, this.container);
      this._tooltip.show(mx, my, this._segTooltipHtml(d));
    };
    const onOut = (event) => {
      d3.select(event.currentTarget).attr('opacity', 1);
      this._tooltip.hide();
    };

    // Shared value scale [0, total]; category scale is a band on the other axis.
    const cat = d3.scaleBand().domain(this._categories).padding(0.25)
      .range(horizontal ? [0, H] : [0, W]);
    const valPercentFmt = percent ? (d => d3.format('.0%')(d)) : (d => d3.format('.2s')(d));

    if (horizontal) {
      const xTicks = this.options.xTicks ?? 4;
      const x = d3.scaleLinear().domain([0, maxTotal || 1]).nice(xTicks).range([0, W]);
      const xTickValues = this.options.xTickValues ?? stackTickValues(x, xTicks);

      if (showGrid) {
        this.gGrid.attr('transform', `translate(0,${H})`)
          .call(d3.axisBottom(x).tickValues(xTickValues).tickSize(-H).tickFormat(''))
          .call(g => { g.selectAll('line').attr('stroke', t.grid); g.select('.domain').remove(); g.selectAll('text').remove(); });
      } else { this.gGrid.selectAll('*').remove(); }

      const rects = this.gBars.selectAll('.rc-bar-seg')
        .data(segs, d => d.cat + SEG_SEP + d.i)
        .join('rect')
        .attr('class', 'rc-bar-seg')
        .attr('y',      d => cat(d.cat))
        .attr('height', cat.bandwidth())
        .attr('x',      d => x(d.v0))
        .attr('width',  d => Math.max(0, x(d.v1) - x(d.v0)))
        .attr('fill',   d => colorFor(d.i))
        .on('mouseover', onOver).on('mouseout', onOut);
      this._animateSegments(rects, animate, duration, ease);

      if (showYAxis) {
        this.gAxisX.attr('transform', 'translate(0,0)')
          .call(d3.axisLeft(cat).tickSize(0).tickFormat(d => this._formatLabel(d)))
          .call(g => {
            g.selectAll('text').attr('fill', t.muted);
            g.select('.domain').attr('stroke', t.border);
            this._bindLabelTooltips(g, 'left');
          });
      } else { this.gAxisX.selectAll('*').remove(); }

      if (showXAxis) {
        this.gAxisY.attr('transform', `translate(0,${H})`)
          .call(d3.axisBottom(x).tickValues(xTickValues).tickFormat(this.options.xTickFormat ?? valPercentFmt))
          .call(g => {
            g.selectAll('text').attr('fill', t.muted);
            g.select('.domain').remove(); g.selectAll('line').remove();
            // The value axis can sit flush against the right edge — anchor the
            // first/last labels inward so they are not half-clipped by the card.
            const ticks = g.selectAll('.tick text');
            const n = ticks.size();
            ticks.attr('text-anchor', (d, i) => i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle');
          });
      } else { this.gAxisY.selectAll('*').remove(); }
      return;
    }

    // Vertical
    const yTicks = this.options.yTicks ?? 4;
    const y = d3.scaleLinear().domain([0, maxTotal || 1]).nice(yTicks).range([H, 0]);
    const yTickValues = this.options.yTickValues ?? stackTickValues(y, yTicks);

    if (showGrid) { renderGrid(this.gGrid, y, W, yTicks, t, yTickValues); }
    else { this.gGrid.selectAll('*').remove(); }

    const rects = this.gBars.selectAll('.rc-bar-seg')
      .data(segs, d => d.cat + SEG_SEP + d.i)
      .join('rect')
      .attr('class', 'rc-bar-seg')
      .attr('x',      d => cat(d.cat))
      .attr('width',  cat.bandwidth())
      .attr('y',      d => y(d.v1))
      .attr('height', d => Math.max(0, y(d.v0) - y(d.v1)))
      .attr('fill',   d => colorFor(d.i))
      .on('mouseover', onOver).on('mouseout', onOut);
    this._animateSegments(rects, animate, duration, ease);

    if (showXAxis) {
      this.gAxisX.attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(cat).tickSize(0).tickFormat(d => this._formatLabel(d)))
        .call(g => {
          g.selectAll('text').attr('fill', t.muted);
          g.select('.domain').attr('stroke', t.border);
          this._bindLabelTooltips(g, 'bottom');
        });
    } else { this.gAxisX.selectAll('*').remove(); }

    if (showYAxis) {
      this.gAxisY.attr('transform', `translate(${W},0)`)
        .call(d3.axisRight(y).tickValues(yTickValues).tickFormat(this.options.yTickFormat ?? valPercentFmt))
        .call(g => {
          g.selectAll('text').attr('fill', t.muted);
          g.select('.domain').remove(); g.selectAll('line').remove();
        });
    } else { this.gAxisY.selectAll('*').remove(); }
  }

  _animateSegments(rects, animate, duration, ease) {
    if (animate) {
      rects.attr('opacity', 0).transition().duration(duration).ease(ease).attr('opacity', 1)
        .on('end', (d, i, n) => { if (i === n.length - 1) this._didAnimateIn = true; });
    } else {
      rects.attr('opacity', 1);
      this._didAnimateIn = true;
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

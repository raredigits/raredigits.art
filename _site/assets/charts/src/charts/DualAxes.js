// RareCharts — DualAxes
// Dual-axis composite chart: mix line and bar series on two Y axes.
//
// Data format (multi-series):
// [
//   {
//     name:   string,
//     axis:   'y1' | 'y2',
//     type:   'line' | 'bar',
//     color:  string (optional),
//     values: [{ date: Date|string|number, value: number }, ...]
//   },
//   ...
// ]
//
// Options:
//   height, margin
//   xPad            — inner padding for X scale (default: 8)
//   curve           — 'linear' (default) | 'monotone' | 'step' | ...
//   animate         — animate on first render (default: true)
//   duration        — ms (default: 650)
//   ease            — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   y1Ticks/y2Ticks — tick count (default: 4)
//   y1TickFormat    — function(value) => string
//   y2TickFormat    — function(value) => string
//   xTickFormat     — function(date) => string
//   y1Domain / y2Domain — override auto domains
//
//   y1LabelsOnly/y2LabelsOnly — labels only, no axis line (default: true)
//   showGrid        — show grid lines (default: true)
//   showXAxis       — show X axis (default: true)
//   showY1Axis      — show right Y1 axis (default: true)
//   showY2Axis      — show left Y2 axis (default: true)
//   endLabels       — show last value labels on the right (default: true)
//   endLabelsAxis   — which axis to label ('y1' default)
//
//   y1Title / y2Title — axis title labels
//
//   barOpacity      — opacity for bars (default: 0.35)
//   barWidthRatio   — width ratio vs time step (default: 0.65)
//   barGrouping     — 'overlap' (default) | 'cluster'
//
//   crosshair       — vertical crosshair + dots + tooltip (default: true)
//   tooltipFormat   — function({date, points:[{...}]}) => html
//
// Notes:
//   Y1 axis is drawn on the RIGHT.
//   Y2 axis is drawn on the LEFT.

import * as d3 from 'd3';
import { Chart }                  from '../core/Chart.js';
import { Tooltip }                from '../core/Tooltip.js';
import { Crosshair }              from '../core/Crosshair.js';
import { parseDate, resolveEase, resolveStrokeDash } from '../core/utils.js';
import { linePath, areaPath }     from '../core/seriesPath.js';
import {
  renderGrid,
  renderZeroBaseline,
  renderAxisX,
  renderAxisYRight,
  renderAxisYLeft,
  renderEndLabels,
  renderAxisTitles,
  animateLines,
  renderMarkers,
} from '../core/renderHelpers.js';

export class DualAxes extends Chart {
  constructor(selector, options = {}) {
    const hasAxisTitles = !!(options.y1Title || options.y2Title);
    const topDefault    = options.margin?.top ?? 10;
    const { margin: _margin, ...restOptions } = options;

    super(selector, {
      height: 280,
      margin: {
        top:    hasAxisTitles ? Math.max(topDefault, 30) : topDefault,
        right:  options.margin?.right  ?? 64,
        bottom: options.margin?.bottom ?? 18,
        left:   options.margin?.left   ?? 64,
      },
      ...restOptions,
    });

    this._series       = [];
    this._didAnimateIn = false;

    const tooltip = new Tooltip(this.container, this.theme);
    this._initSVG(tooltip);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  setData(series) {
    this._series = this._normalizeData(series);
    this._syncTimeframeButtons(this._getDataExtent());
    this.render();
    return this;
  }

  _getDataExtent() {
    const all = this._series.flatMap(s => s.values);
    return all.length ? d3.extent(all, d => d.date) : null;
  }

  _getNavigatorData() {
    const preferred = this._series.find(s => s.type === 'line') ?? this._series[0];
    return preferred?.values?.length ? preferred.values : null;
  }

  _normalizeData(series) {
    const colors = this.theme.colors ?? [];

    return (series ?? [])
      .map((s, idx) => ({
        name:         s.name   ?? `Series ${idx + 1}`,
        axis:         s.axis === 'y2' ? 'y2' : 'y1',
        type:         s.type === 'bar' ? 'bar' : 'line',
        color:        s.color ?? (colors[idx % (colors.length || 1)] ?? this.theme.accent),
        curve:        s.curve,
        area:         s.area,
        areaOpacity:  s.areaOpacity,
        areaBaseline: s.areaBaseline,
        strokeWidth:  Number.isFinite(+s.strokeWidth) ? +s.strokeWidth : 2,
        values: (s.values ?? [])
          .map(d => ({ date: parseDate(d.date), value: +d.value }))
          .filter(d => d.date && Number.isFinite(d.value)),
      }))
      .filter(s => s.values.length);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG(tooltip) {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);

    this.gGrid        = this.g.append('g').attr('class', 'rc-grid');
    this.gBars        = this.g.append('g').attr('class', 'rc-bars');
    this.gLines       = this.g.append('g').attr('class', 'rc-lines');
    this.gAxisX       = this.g.append('g').attr('class', 'rc-axis rc-axis-x');
    this.gAxisY1      = this.g.append('g').attr('class', 'rc-axis rc-axis-y1');
    this.gAxisY2      = this.g.append('g').attr('class', 'rc-axis rc-axis-y2');
    this.gAxisTitles  = this.g.append('g').attr('class', 'rc-axis-titles');
    this.gEnds        = this.g.append('g').attr('class', 'rc-end-labels');
    this.gMarkers     = this.g.append('g').attr('class', 'rc-markers');
    this.gZero        = this.g.append('g').attr('class', 'rc-zero-layer');

    // Clip bars and lines to the drawing area so bar stubs don't bleed past edges
    const uid = Math.random().toString(36).slice(2, 8);
    this._clipId   = `rc-clip-${uid}`;
    this._clipRect = this.svg.append('defs')
      .append('clipPath').attr('id', this._clipId)
      .append('rect');
    this.gBars.attr('clip-path',  `url(#${this._clipId})`);
    this.gLines.attr('clip-path', `url(#${this._clipId})`);

    const gCross  = this.g.append('g').attr('class', 'rc-crosshair');
    const overlay = this.g.append('rect')
      .attr('class', 'rc-overlay')
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    this._crosshair = new Crosshair(gCross, overlay, tooltip, this.theme);
  }

  // ─── Bars ─────────────────────────────────────────────────────────────────

  _renderBars({ bars, allValues, x, y1, y2, barOpacity, barWidthRatio, barGrouping, animate, duration, ease }) {
    const barItems = bars.flatMap(s =>
      s.values.map(v => ({
        key:    `${s.name}|${+v.date}`,
        series: s.name,
        axis:   s.axis,
        color:  s.color,
        date:   v.date,
        value:  v.value,
      }))
    );

    const uniqueDates = Array.from(new Set(allValues.map(d => +d.date))).sort((a, b) => a - b);
    const step = uniqueDates.length > 1
      ? Math.max(6, x(new Date(uniqueDates[1])) - x(new Date(uniqueDates[0])))
      : 12;
    const baseBarW = Math.max(4, step * barWidthRatio);

    const barSeriesNames = Array.from(new Set(bars.map(b => b.name)));
    const clusterCount   = barGrouping === 'cluster' ? Math.max(1, barSeriesNames.length) : 1;
    const barW           = barGrouping === 'cluster' ? baseBarW / clusterCount : baseBarW;

    const xOffset = (seriesName) => {
      if (barGrouping !== 'cluster') return 0;
      const i = barSeriesNames.indexOf(seriesName);
      return ((i < 0 ? 0 : i) - (clusterCount - 1) / 2) * (baseBarW / clusterCount);
    };

    const scaleFor = (d) => (d.axis === 'y2' ? y2 : y1);

    const barsSel = this.gBars.selectAll('.rc-dual-bar')
      .data(barItems, d => d.key)
      .join(
        enter => enter.append('rect')
          .attr('class',   'rc-dual-bar')
          .attr('x',       d => x(d.date) - barW / 2 + xOffset(d.series))
          .attr('width',   barW)
          .attr('fill',    d => d.color)
          .attr('opacity', barOpacity)
          .attr('y',       d => animate ? scaleFor(d)(0) : scaleFor(d)(Math.max(0, d.value)))
          .attr('height',  d => animate ? 0 : Math.abs(scaleFor(d)(d.value) - scaleFor(d)(0))),
        update => update,
        exit   => exit.remove()
      );

    barsSel
      .call(sel => {
        const apply = (sel) => sel
          .attr('x',      d => x(d.date) - barW / 2 + xOffset(d.series))
          .attr('width',  barW)
          .attr('y',      d => scaleFor(d)(Math.max(0, d.value)))
          .attr('height', d => Math.abs(scaleFor(d)(d.value) - scaleFor(d)(0)));

        if (animate && barItems.length) {
          apply(sel.transition().duration(duration).ease(ease));
        } else {
          apply(sel);
        }
      });
  }

  // ─── Lines ────────────────────────────────────────────────────────────────

  _renderLines({ lines, x, y1, y2, defaultCurve, tension, globalDash, animate, duration, ease }) {
    const globalArea    = this.options.area        ?? false;
    const globalAreaOp  = this.options.areaOpacity ?? 0.12;
    const globalAreaBase= this.options.areaBaseline?? 'zero';

    const yFor = (s) => (s.axis === 'y2' ? y2 : y1);

    // Areas
    const areaSeries = lines.filter(s => (s.area ?? globalArea) === true);
    this.gLines.selectAll('.rc-dual-area')
      .data(areaSeries, s => s.name)
      .join('path')
      .attr('class', 'rc-dual-area')
      .attr('d',       s => areaPath(s, x, yFor(s), defaultCurve, globalAreaBase, tension))
      .attr('fill',    s => s.color)
      .attr('opacity', s => s.areaOpacity ?? globalAreaOp);

    // Lines
    const paths = this.gLines.selectAll('.rc-dual-line')
      .data(lines, s => s.name)
      .join('path')
      .attr('class',        'rc-dual-line')
      .attr('fill',         'none')
      .attr('stroke',       s => s.color)
      .attr('stroke-width',   s => s.strokeWidth ?? 2)
      .attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
      .attr('d', s => linePath(s, x, yFor(s), defaultCurve, tension));

    if (animate && lines.length) {
      const solidPaths  = paths.filter(s => !resolveStrokeDash(s.strokeDash ?? globalDash));
      const dashedPaths = paths.filter(s =>  resolveStrokeDash(s.strokeDash ?? globalDash));

      dashedPaths.attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
                 .attr('stroke-dashoffset', null);

      animateLines(solidPaths, duration, ease, () => { this._didAnimateIn = true; });

      if (solidPaths.empty()) this._didAnimateIn = true;
    } else {
      paths.attr('stroke-dasharray', s => resolveStrokeDash(s.strokeDash ?? globalDash))
           .attr('stroke-dashoffset', null);
      this._didAnimateIn = true;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._series.length) return;

    const W = this.width, H = this.height;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;
    const fullExtent = this._getDataExtent();
    const viewExtent = this._resolveViewExtent(fullExtent);
    const visibleSeries = this._series
      .map(s => ({ ...s, values: s.values.filter(d => d.date >= viewExtent[0] && d.date <= viewExtent[1]) }))
      .filter(s => s.values.length);
    if (!visibleSeries.length) return;

    this._syncTimeframeButtons(fullExtent, viewExtent);
    this._syncNavigator();

    // Animation
    const animate  = (o.animate ?? true) && !this._didAnimateIn;
    const duration = o.duration ?? 650;
    const ease     = resolveEase(o.ease ?? 'cubicOut');

    // Curve / dash options
    const defaultCurve = o.curve         ?? 'linear';
    const tension      = o.curveTension  ?? 0;
    const xPad         = o.xPad         ?? 8;

    const lines = visibleSeries.filter(s => s.type === 'line');
    const bars  = visibleSeries.filter(s => s.type === 'bar');

    const allValues = visibleSeries.flatMap(s => s.values);
    const allY1     = visibleSeries.filter(s => s.axis === 'y1').flatMap(s => s.values);
    const allY2     = visibleSeries.filter(s => s.axis === 'y2').flatMap(s => s.values);

    // Update clip rect to match current drawing area
    this._clipRect.attr('x', xPad).attr('y', 0).attr('width', W - 2 * xPad).attr('height', H);

    // Scales
    const x = d3.scaleTime()
      .domain(viewExtent)
      .range([xPad, W - xPad]);

    const y1Auto = allY1.length ? d3.extent(allY1, d => d.value) : d3.extent(allY2, d => d.value);
    const y2Auto = allY2.length ? d3.extent(allY2, d => d.value) : d3.extent(allY1, d => d.value);

    const y1 = Array.isArray(o.y1Domain)
      ? d3.scaleLinear().domain(o.y1Domain).range([H, 0])
      : d3.scaleLinear().domain(y1Auto).nice(4).range([H, 0]);

    const y2 = Array.isArray(o.y2Domain)
      ? d3.scaleLinear().domain(o.y2Domain).range([H, 0])
      : d3.scaleLinear().domain(y2Auto).nice(4).range([H, 0]);

    // Formatters
    const xTickFormat  = o.xTickFormat  ?? (d => d3.timeFormat('%m/%d')(d));
    const y1TickFormat = o.y1TickFormat ?? (v => d3.format(',.2f')(v));
    const y2TickFormat = o.y2TickFormat ?? (v => Math.abs(v) < 1e-6 ? '0' : d3.format('+.2f')(v));

    // Axes + grid
    if (o.showGrid ?? true) {
      renderGrid(this.gGrid, y2, W, o.y2Ticks ?? 4, t);
    } else {
      this.gGrid.selectAll('*').remove();
    }

    renderZeroBaseline(this.gZero, y2, W, t);

    if (o.showXAxis ?? true) {
      renderAxisX(this.gAxisX, x, H, xTickFormat, t);
    } else {
      this.gAxisX.selectAll('*').remove();
    }

    if (o.showY1Axis ?? true) {
      renderAxisYRight(this.gAxisY1, y1, W, o.y1Ticks ?? 4, y1TickFormat, o.y1LabelsOnly ?? true, t);
    } else {
      this.gAxisY1.selectAll('*').remove();
    }

    if (o.showY2Axis ?? true) {
      renderAxisYLeft(this.gAxisY2, y2, o.y2Ticks ?? 4, y2TickFormat, o.y2LabelsOnly ?? true, t);
    } else {
      this.gAxisY2.selectAll('*').remove();
    }

    renderAxisTitles(this.gAxisTitles, W, o.y1Title, o.y2Title, t);

    // Series
    if (bars.length) {
      this._renderBars({
        bars, allValues, x, y1, y2,
        barOpacity:    o.barOpacity    ?? 0.35,
        barWidthRatio: o.barWidthRatio ?? 0.65,
        barGrouping:   o.barGrouping   ?? 'overlap',
        animate, duration, ease,
      });
    } else {
      this.gBars.selectAll('*').remove();
    }

    if (lines.length) {
      this._renderLines({ lines, x, y1, y2, defaultCurve, tension, globalDash: o.strokeDash ?? null, animate, duration, ease });
    } else {
      this.gLines.selectAll('*').remove();
      this._didAnimateIn = true;
    }

    // End labels
    if (o.endLabels ?? true) {
      const endAxis   = o.endLabelsAxis ?? 'y1';
      const endSeries = visibleSeries.filter(s => s.axis === endAxis);
      const endScale  = endAxis === 'y2' ? y2 : y1;
      const endFmt    = endAxis === 'y2' ? y2TickFormat : y1TickFormat;
      renderEndLabels(this.gEnds, endSeries, endScale, W, endFmt, t);
    } else {
      this.gEnds.selectAll('*').remove();
    }

    // Markers
    renderMarkers(
      this.gMarkers, visibleSeries, x,
      s => (s.axis === 'y2' ? y2 : y1),
      o.markers ?? false,
      o.markerShape ?? 'circle',
      o.markerSize  ?? 4,
      t
    );

    // Crosshair
    this._crosshair.bind({
      W, H, x,
      series:    visibleSeries,
      enabled:   o.crosshair ?? true,
      scaleFor:  (s) => (s.axis === 'y2' ? y2 : y1),
      formatFor: (s, v) => (s.axis === 'y2' ? y2TickFormat(v) : y1TickFormat(v)),
      tooltipFmt: o.tooltipFormat,
    });
  }
}

// RareCharts — Donut / Pie
// Circular chart. Pie (below) is Donut with innerRadius 0 by default.
//
// Expected data format:
// [{ label: string, value: number, color?: string, id?: string }, ...]
// Slices are matched across updates by id, else label (a repeated label keeps
// its own slice); every update repaints them, so a new `color` shows. Legend
// items without a color take the color of the slice with their id or label.
//
// Options:
//   height       — chart height px (default: 280)
//   innerRadius  — 0 for pie, 0..1 as fraction of outer radius (default: 0.58; Pie: 0)
//   padAngle     — gap between slices in radians (default: 0.018 donut / 0.008 pie)
//   cornerRadius — rounded slice corners px (default: 3 donut / 1 pie)
//
//   animate      — animate on first render (default: true)
//   duration     — animation duration ms (default: 650)
//   ease         — 'cubicOut' | 'cubicInOut' | 'linear' (default: 'cubicOut')
//
//   showLabels   — show slice labels with leader lines outside the chart (default: false)
//   labelMinPct  — hide label when slice is smaller than this fraction (default: 0.04)
//   labelContent — what outside labels show: 'both' | 'label' | 'percent' (default: 'both')
//   showCenter   — show text in the center hole (default: true for donut)
//   centerText   — string | function(data, info) => string (default:
//                  formatted total); data — the drawn items, info — { label,
//                  value }: the centre label and the total. Flat data only —
//                  drill-down shows the focused node's value
//   centerLabel  — secondary line below centerText (default: 'Total'); a
//                  drilled-in level shows the focused node's label instead
//
//   valueFormat  — function(v, info) => string (default: d3.format(',') — comma
//                  thousands, full precision: 1234.5678 → '1,234.5678'); info
//                  — a slice's { label, value, percent, color }, or the
//                  centre's { label, value }
//   percentFormat— function(pct, info) => string (default: '12.3%'); info —
//                  the slice's { label, value, percent, color }
//   tooltipFormat— function({label, value, percent, color}) => html — the
//                  role fields themselves. Formatter arguments, the rule for
//                  every class (K-09): /charts/settings/#formatter-arguments
//
// Drill-down (hierarchy mode): call setData with ONE ROOT OBJECT instead of an
// array — { label, value?, color?, children?, remainderLabel? } — and the donut
// becomes an interactive drill-down over the tree (contract: core/hierarchy.js).
// It opens on the root's children; clicking a slice with children descends;
// clicking the center (or a breadcrumb) goes back up; a leaf shows its value.
// Drilled in, the whole hole is a button (Tab, then Enter or Space); a pie has
// no hole, so it goes back up through the breadcrumb.
// Public navigation (K-21), each returning the chart: drillTo(child) — what a
// click on a slice does: descends into a child of the level shown, given as
// the page's own object, its id or its label (or the chart's node); a child
// without disclosed children (a leaf, a remainder) or not in the level shown
// is ignored. drillUp() — one level up; drillToDepth(index) — the index-th
// breadcrumb (0 the root).
//   showRemainder  — draw each node's remainder (value − Σ children) as a
//                    muted slice (default: false; a per-node remainderLabel
//                    surfaces just that node's remainder)
//   remainderLabel — fallback label for surfaced remainders (default: 'Other')
//   strict         — throw when children exceed a parent's stated value
//                    (default: warn and leave the negative remainder undrawn)

import * as d3 from 'd3';
import { Chart }       from '../core/Chart.js';
import { Tooltip }     from '../core/Tooltip.js';
import { resolveEase, motionDuration } from '../core/utils.js';
import { EntryMotion } from '../core/entryMotion.js';
import { applySvgA11y, fitTextNode } from '../core/renderHelpers.js';
import { normalizeHierarchy } from '../core/hierarchy.js';
import { escapeHtml, tipHeader, tipMuted } from '../core/html.js';


export class Donut extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 280,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
    });

    this._data         = [];
    // The sweep plays on first render and on every drill (C-16: a render in
    // the middle of it carries it on instead of starting over).
    this._entry        = new EntryMotion();
    this._tooltip      = new Tooltip(this.container, this.theme);

    // Drill-down state (hierarchy mode). _mode is 'flat' for a plain slice list
    // or 'hier' for a normalized tree; _trail is the root→focus path.
    this._mode  = 'flat';
    this._tree  = null;
    this._trail = [];

    this._initSVG();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  // A plain ARRAY is the classic flat donut. A single root OBJECT switches on
  // drill-down: the tree is normalized once and navigated in place.
  setData(data) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      this._mode  = 'hier';
      this._tree  = normalizeHierarchy(data, {
        showRemainder:  this.options.showRemainder  ?? false,
        remainderLabel: this.options.remainderLabel ?? 'Other',
        strict:         this.options.strict         ?? false,
      });
      this._trail = this._tree ? [this._tree] : [];
      this._entry.reset();
      this.render();
      return this;
    }

    this._mode  = 'flat';
    this._tree  = null;
    this._trail = [];
    this._data  = (data ?? []).filter(d => Number.isFinite(+d.value) && +d.value > 0);
    this.render();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.height = this.options.height + 'px';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width',  '100%')
      .attr('height', '100%');
    applySvgA11y(this.svg, this.options);

    this.gSlices = this.svg.append('g').attr('class', 'rc-donut-slices');
    this.gLabels = this.svg.append('g').attr('class', 'rc-donut-labels');
    this.gCenter = this.svg.append('g').attr('class', 'rc-donut-center');
    this.gCrumb  = this.svg.append('g').attr('class', 'rc-donut-crumb');
  }

  // ─── Drill-down (hierarchy mode) ────────────────────────────────────────────

  _focus() { return this._trail[this._trail.length - 1] ?? null; }

  _drillable(node) {
    return !!node && !node.isRemainder && Array.isArray(node.children)
      && node.children.some(c => typeof c.value === 'number');
  }

  // Opens a child of the level shown: the chart's own node, or what the
  // page has — the object it passed in, its id or its label — matched among
  // the shown level's children, so it draws the level a click draws (the
  // copy setData makes keeps remainders and undisclosed children; K-21).
  drillTo(target) {
    // a normalized node keeps the page's object as `data`
    const kids  = this._focus()?.children ?? [];
    const isObj = target != null && typeof target === 'object';
    const id    = isObj ? target.id : target;
    const label = isObj ? target.label : target;
    const node  = kids.find(c => c === target || (isObj && c.data === target))
      ?? (id != null ? kids.find(c => c.data?.id != null && c.data.id === id) : undefined)
      ?? kids.find(c => c.label === label);
    if (!node || !this._drillable(node)) return this;
    this._trail = [...this._trail, node];
    this._entry.reset();
    this.render();
    return this;
  }

  drillToDepth(index) {
    if (index < 0 || index >= this._trail.length - 1) return this;
    this._trail = this._trail.slice(0, index + 1);
    this._entry.reset();
    this.render();
    return this;
  }

  drillUp() { return this.drillToDepth(this._trail.length - 2); }

  // ─── Render ───────────────────────────────────────────────────────────────

  _dataLayers() {
    return [this.gSlices, this.gLabels, this.gCenter, this.gCrumb];
  }

  render() {
    const hier = this._mode === 'hier';
    let focus = null;
    let missingChildren = [];
    if (hier) {
      focus = this._focus();
      if (!focus) {
        [this.gSlices, this.gLabels, this.gCenter, this.gCrumb].forEach(g => g.selectAll('*').remove());
        this._centerButton(null, 0);
        return;
      }
      this._data      = (focus.children ?? []).filter(d => typeof d.value === 'number');
      missingChildren = (focus.children ?? []).filter(d => d.missing);
    }

    if (!this._data.length) {
      this._centerButton(null, 0);
      this._syncLegendColors([], null);   // no slices: uncoloured items back to the accent (K-22)
      this._renderEmpty();
      return;
    }

    // Use this.width (subtracts margins + legend-aside width) and add margins back
    // to get the actual SVG content width. Same pattern for height.
    const W = this.width + this.margin.left + this.margin.right;
    const H = this.height + this.margin.top + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;

    const duration   = motionDuration(o.duration ?? 650);
    const ease       = resolveEase(o.ease ?? 'cubicOut');
    const phase      = this._entry.phase((o.animate ?? true) ? duration : 0);

    const isPie      = (o.innerRadius ?? 0.58) === 0;
    const innerFrac  = isPie ? 0 : (o.innerRadius ?? 0.58);
    const padAngle   = o.padAngle     ?? (isPie ? 0.008 : 0.018);
    const cornerR    = o.cornerRadius ?? (isPie ? 1 : 3);
    const showLabels = o.showLabels   ?? false;
    const showCenter = o.showCenter   ?? !isPie;

    // Center in SVG space. In hierarchy mode reserve a strip at the top for the
    // breadcrumb, so the ring drops below it.
    const inset = hier ? 24 : 0;
    const cx = W / 2;
    const cy = inset + (H - inset) / 2;

    // Outer radius — reserve only enough for the polyline itself (text overflows via SVG overflow:visible)
    const labelRoom = showLabels ? 36 : 0;
    const outerR    = Math.min(cx, (H - inset) / 2) - labelRoom - 4;
    const innerR    = outerR * innerFrac;

    // Formatters
    const total      = d3.sum(this._data, d => +d.value);
    const valueFmt   = o.valueFormat   ?? (v => d3.format(',')(v));
    const percentFmt = o.percentFormat ?? (p => d3.format('.1%')(p));

    // Colors — per-item override, then palette, then accent fallback
    const palette  = t.colors ?? [];
    const colorFor = (d, i) => d.isRemainder ? t.muted : (d.color ?? palette[i % palette.length] ?? t.accent);
    // A slice's role fields (K-09): the tooltip payload itself, and the second
    // argument of valueFormat and percentFormat.
    const sliceRole = (d, i) => ({
      label: d.data.label, value: d.data.value,
      percent: total > 0 ? d.data.value / total : 0, color: colorFor(d.data, i),
    });

    // Arc generators
    const arc = d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .padAngle(padAngle)
      .cornerRadius(cornerR);

    const arcHover = d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR + 6)
      .padAngle(padAngle)
      .cornerRadius(cornerR);

    // Pie layout — preserve input order
    const pie = d3.pie()
      .value(d => +d.value)
      .sort(null)
      .padAngle(padAngle);

    const arcs = pie(this._data);

    // Slice identity across renders: `id`, else `label`. A repeated key takes
    // its occurrence number — the second 'A' is 'A' #1 — so slices with the
    // same label stay distinct and keep their path instead of being dropped
    // and drawn again on every render (C-18).
    const seen = new Map();
    arcs.forEach(a => {
      const k = String(a.data.id ?? a.data.label);
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      a.key = n ? `${k}\u001f#${n}` : k;
    });

    // Position all layers at the chart center
    this.gSlices.attr('transform', `translate(${cx},${cy})`);
    this.gLabels.attr('transform', `translate(${cx},${cy})`);
    this.gCenter.attr('transform', `translate(${cx},${cy})`);

    // ── Slices ────────────────────────────────────────────────────────────────

    const slices = this.gSlices.selectAll('.rc-donut-slice')
      .data(arcs, d => d.key)
      .join(
        enter => enter.append('path')
          .attr('class', 'rc-donut-slice')
          .attr('fill',  (d, i) => colorFor(d.data, i))
          .attr('d', phase !== 'none'
            ? d => arc({ ...d, endAngle: d.startAngle })   // start collapsed
            : d => arc(d)
          )
          // where the sweep stands — read by a render in its middle (C-16)
          .property('__rcSweep', d => (phase !== 'none' ? { startAngle: d.startAngle, endAngle: d.startAngle } : null)),
        // a slice still leaving from the previous render is back in the data
        // (drilled in and straight back up): stop its exit, let it be hovered
        update => update.interrupt('exit').style('pointer-events', null),
        // A leaving slice stays in the DOM under the new ring when another
        // transition is on it as its exit ends — transition.remove() skips a
        // node with one — or when one interrupts the exit: the hover one that
        // mouseover / mouseout start on the slice just clicked to drill in
        // (E-04). So: stop its hover and entry transitions, name the exit,
        // take no more pointer events, and let a pointer leaving it only hide
        // the tooltip.
        exit => {
          exit
            .interrupt()
            .style('pointer-events', 'none')
            .on('mouseover click', null)
            .on('mouseout', () => this._tooltip?.hide());
          if (!(o.animate ?? true)) { exit.remove(); return; }
          exit
            .transition('exit').duration(duration / 2).ease(ease)
            .attr('d', d => arc({ ...d, endAngle: d.startAngle }))
            .remove();
        }
      )
      // Every render, not only on enter: a new `color` for a slice that
      // stays, or a palette colour that moved with its position (C-18).
      .attr('fill', (d, i) => colorFor(d.data, i))
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(120).ease(d3.easeQuadOut)
          .attr('d', arcHover(d));

        const role = sliceRole(d, arcs.indexOf(d));
        const html = o.tooltipFormat
          ? o.tooltipFormat(role)
          : `${tipHeader(escapeHtml(role.label), { color: role.color })}
             <div>${escapeHtml(valueFmt(role.value, role))}</div>
             ${tipMuted(escapeHtml(percentFmt(role.percent, role)))}`;

        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, html);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(180).ease(d3.easeQuadOut)
          .attr('d', arc(d));
        this._tooltip.hide();
      })
      .on('click', (event, d) => {
        if (hier && this._drillable(d.data)) this.drillTo(d.data);
      })
      .style('cursor', d =>
        hier && this._drillable(d.data) ? 'pointer' : 'default');

    // The sweep runs on the entry timeline (C-16). 'enter' sweeps every
    // slice open from its start angle; a render in the middle of it
    // ('resume': fonts.ready, the first resize) carries each slice on from
    // the angles it has reached to this render's arc. A slice whose sweep
    // was cut by a hover, or has ended, is drawn whole.
    if (phase === 'none') {
      // a sweep whose last frame has not run yet must not land after this
      // render with the old radius; hover transitions are left alone
      slices.filter(function () { return !!this.__rcSweep; }).interrupt();
      slices.property('__rcSweep', null).attr('d', d => arc(d));
    } else {
      const timing = this._entry.timing(0, duration, ease);
      slices.each(function (d) {
        const from = phase === 'enter'
          ? { startAngle: d.startAngle, endAngle: d.startAngle }
          : this.__rcSweep;
        const node = d3.select(this);
        if (!from || !timing) { node.property('__rcSweep', null).attr('d', arc(d)); return; }
        const to = { startAngle: d.startAngle, endAngle: d.endAngle };
        const i  = d3.interpolate(from, to);
        node.interrupt()
          .property('__rcSweep', from)
          .attr('d', arc({ ...d, ...from }))
          .transition().duration(timing.duration).ease(timing.ease)
          .attrTween('d', function () {
            return t => { const a = i(t); this.__rcSweep = a; return arc({ ...d, ...a }); };
          })
          .on('end interrupt', function () { this.__rcSweep = null; });
      });
    }

    // ── Sync legend indicator colors ──────────────────────────────────────────
    // Legend items are built by Chart base class before render() — colors from
    // the palette are not known at that point. Re-apply correct colors here.
    this._syncLegendColors(arcs, colorFor);

    // ── Outer labels (Bloomberg-style: polyline leader + two-line text) ───────
    this.gLabels.selectAll('*').remove();

    if (showLabels) {
      const lineLen     = 14;
      const tickLen     = 12;
      const labelGap    = 3;
      const lineH       = 14;                           // line height between label rows
      const labelMinPct = o.labelMinPct ?? 0.04;

      // labelContent: 'both' (default) | 'label' | 'percent'
      const content   = o.labelContent ?? 'both';
      const showName  = content !== 'percent';
      const showPct   = content !== 'label';
      const lineCount = (showName ? 1 : 0) + (showPct ? 1 : 0);
      const blockH    = lineCount * lineH;

      // Pass 1 — anchor geometry for every labelled slice. `y` is the label
      // row center; it starts at the leader elbow and may be pushed by pass 2.
      const entries = [];
      arcs.forEach((d, i) => {
        const pct = d.data.value / total;
        if (pct < labelMinPct) return;
        const mid = (d.startAngle + d.endAngle) / 2;
        entries.push({
          d, pct, i,
          isRight: Math.sin(mid) >= 0,
          x1: Math.sin(mid) * outerR,               // on the outer arc edge
          y1: -Math.cos(mid) * outerR,
          x2: Math.sin(mid) * (outerR + lineLen),   // leader elbow
          y:  -Math.cos(mid) * (outerR + lineLen),
        });
      });

      // Pass 2 — spread each side's rows apart so the labels of small adjacent
      // slices never overprint: sweep top-down enforcing a minimum gap, then
      // sweep back up from the bottom bound.
      const spreadSide = (side) => {
        const list = entries.filter(e => e.isRight === side).sort((a, b) => a.y - b.y);
        const gap    = blockH + 4;
        const top    = inset - cy + blockH / 2 + 2;
        const bottom = H - cy - blockH / 2 - 2;
        for (let i = 1; i < list.length; i++) {
          if (list[i].y < list[i - 1].y + gap) list[i].y = list[i - 1].y + gap;
        }
        for (let i = list.length - 1; i >= 0; i--) {
          const maxY = i === list.length - 1 ? bottom : list[i + 1].y - gap;
          if (list[i].y > maxY) list[i].y = maxY;
          if (list[i].y < top)  list[i].y = top;
        }
      };
      spreadSide(true);
      spreadSide(false);

      // Pass 3 — leaders and text at the resolved rows. The leader runs from
      // the arc edge diagonally to the elbow at the label's final row, then
      // horizontally to the tick end.
      entries.forEach((e) => {
        const x3 = e.x2 + (e.isRight ? tickLen : -tickLen);

        this.gLabels.append('polyline')
          .attr('class', 'rc-donut-leader')
          .attr('points', `${e.x1},${e.y1} ${e.x2},${e.y} ${x3},${e.y}`)
          .attr('fill', 'none')
          .attr('stroke', t.border)
          .attr('stroke-width', 1);

        const tx     = x3 + (e.isRight ? labelGap : -labelGap);
        const anchor = e.isRight ? 'start' : 'end';

        // Center the text block around the row regardless of line count
        const topY = e.y - ((lineCount - 1) * lineH) / 2;

        let lineIdx = 0;
        if (showName) {
          const name = this.gLabels.append('text')
            .attr('class', 'rc-donut-label')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.text)
            .text(e.d.data.label);
          // Keep the label inside the svg: truncate to the room between its
          // anchor and the chart edge — the full label stays in the tooltip.
          fitTextNode(name.node(), e.d.data.label, cx - Math.abs(tx) - 2);
        }
        if (showPct) {
          this.gLabels.append('text')
            .attr('class', 'rc-donut-label-pct')
            .attr('x', tx)
            .attr('y', topY + lineIdx++ * lineH)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .attr('fill', t.muted)
            .text(percentFmt(e.pct, sliceRole(e.d, e.i)));
        }
      });
    }

    // ── Center text (donut only) ──────────────────────────────────────────────
    this.gCenter.selectAll('*').remove();
    const drilled = hier && this._trail.length > 1;

    if (showCenter && innerR > 0) {
      const rawCenter = o.centerText;
      const centerLabel = drilled ? focus.label : (o.centerLabel ?? 'Total');
      // The centre's role fields (K-09): its label and the value it shows.
      const centerRole  = { label: centerLabel, value: hier ? focus.value : total };
      const centerVal = hier
        ? valueFmt(focus.value, centerRole)
        : (typeof rawCenter === 'function' ? rawCenter(this._data, centerRole) : (rawCenter ?? valueFmt(total, centerRole)));

      // Usable width inside the hole; both center lines are fitted to it.
      const holeAvail = 2 * innerR - 12;
      const valueSize = Math.max(14, innerR * 0.28);

      const valueSel = this.gCenter.append('text')
        .attr('class',             'rc-donut-center-value')
        .attr('text-anchor',       'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y',     centerLabel ? -10 : 0)
        .attr('fill',  t.text)
        .style('font-size', `${valueSize}px`)
        .text(centerVal);
      // A wide value shrinks its font (floor 11px) instead of poking out.
      const vNode = valueSel.node();
      const vLen  = vNode.getComputedTextLength ? vNode.getComputedTextLength() : 0;
      if (vLen > holeAvail) valueSel.style('font-size', `${Math.max(11, valueSize * holeAvail / vLen)}px`);

      if (centerLabel) {
        const labelSel = this.gCenter.append('text')
          .attr('class',             'rc-donut-center-label')
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y',    14)
          .attr('fill', t.muted)
          .text(centerLabel);
        // Secondary line truncates to the hole; the breadcrumb carries the full name.
        fitTextNode(labelSel.node(), centerLabel, holeAvail);
      }
    }
    this._centerButton(drilled ? this._trail[this._trail.length - 2] : null, innerR);

    // ── Hierarchy chrome: breadcrumb, up-navigation, undisclosed note ─────────
    this.gCrumb.selectAll('*').remove();
    if (hier) {
      // Breadcrumbs appear only once drilled in — the root view carries no
      // trail. Flush left with the chart content (no indent).
      if (this._trail.length > 1) {
        let cursorX = 0;
        this._trail.forEach((node, idx) => {
          if (idx > 0) {
            this.gCrumb.append('text')
              .attr('x', cursorX).attr('y', 14).attr('fill', t.muted).text('›');
            cursorX += 12;
          }
          const isLast = idx === this._trail.length - 1;
          const label  = node.label.length > 22 ? node.label.slice(0, 22).trimEnd() + '…' : node.label;
          const txt = this.gCrumb.append('text')
            .attr('x', cursorX).attr('y', 14)
            .attr('fill', isLast ? t.text : t.accent)
            .style('cursor', isLast ? 'default' : 'pointer')
            .text(label);
          if (!isLast) txt.on('click', () => this.drillToDepth(idx));
          const len = txt.node().getComputedTextLength ? txt.node().getComputedTextLength() : 0;
          cursorX += (len || label.length * 7) + 8;
        });
      }

      if (missingChildren.length) {
        this.gCrumb.append('text')
          .attr('x', W / 2).attr('y', H - 6).attr('text-anchor', 'middle')
          .attr('fill', t.muted)
          .text(`${missingChildren.length} not disclosed`)
          .append('title').text(missingChildren.map(m => m.label).join(', '));
      }
    }
  }

  // Legend items given as objects without a `color` take the colour of their
  // slice: the one with the same `id` when the item has one, else the first
  // with the same label — not the slice at the same position (K-22), so an
  // item order that differs from the data, or a value the ring filtered out,
  // no longer shifts the colours. An item with no slice in this ring (a level
  // drilled away from, a zero value) goes back to the accent the legend was
  // built with; an item with its own `color` is left alone. Dots, lines,
  // dashed lines and bands are all repainted.
  _syncLegendColors(arcs, colorFor) {
    const items = this.options.legend;
    if (!this._legendEl || !Array.isArray(items)) return;
    const rows = [...this._legendEl.children].filter(el => el.classList.contains('rc-legend-item'));
    items.forEach((item, j) => {
      const indicator = rows[j]?.firstElementChild;
      if (!indicator || item?.color != null) return;
      const i = item.id != null
        ? arcs.findIndex(a => a.data.id === item.id)
        : arcs.findIndex(a => a.data.label === (item.label ?? item.name));
      const color = i >= 0 ? colorFor(arcs[i].data, i) : this.theme.accent;
      if (indicator.classList.contains('rc-legend-line--dashed')) {
        indicator.style.backgroundImage =
          `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 8px)`;
      } else {
        indicator.style.background = color;
      }
    });
  }

  // Drilled in, the hole is the button back up (E-21): a transparent disc
  // under the center text takes the click anywhere in the hole — not only on
  // the glyphs — and the group is in the Tab order, Enter or Space going up.
  // `parent` null (the root, flat data) or no hole (a pie) turns it off.
  _centerButton(parent, innerR) {
    const on = !!parent && innerR > 0;
    if (on) {
      this.gCenter.insert('circle', ':first-child')
        .attr('class', 'rc-donut-center-hit')
        .attr('r', innerR)
        .attr('fill', 'transparent');
    }
    this.gCenter
      .style('cursor', on ? 'pointer' : null)
      .attr('tabindex', on ? 0 : null)
      .attr('role', on ? 'button' : null)
      .attr('aria-label', on ? `Back to ${parent.label}` : null)
      .on('click', on ? () => this.drillUp() : null)
      .on('keydown', on ? (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.drillUp();
      } : null);
  }
}

// Pie: a Donut without the hole (C-05). Only the default changes — innerRadius
// 0, and with it the pie defaults of padAngle, cornerRadius and showCenter;
// every other option and method is Donut's, and an explicit innerRadius wins.
// `?? 0` rather than a spread default, so innerRadius: undefined is a pie too.
export class Pie extends Donut {
  constructor(selector, options = {}) {
    super(selector, { ...options, innerRadius: options?.innerRadius ?? 0 });
  }
}

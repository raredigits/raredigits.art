// RareCharts — Donut / Pie
// Circular chart. Pie (below) is Donut with innerRadius 0 by default.
//
// Expected data format:
// [{ label: string, value: number, color?: string, id?: string }, ...]
// Slices are matched across updates by id, else label (a repeated label keeps
// its own slice); every update repaints them, so a new `color` shows. A
// slice's palette colour is its place in the data, whatever is hidden.
//
// Legend (flat data): a header `legend` item names its slice by `series` (the
// slice's id, else its label), else `id` (the slice with that id), else its
// label (the first slice with it); `series: false` keeps it a caption. A
// mapped item is a toggle (core/legend.js: a click, Enter or Space hides or
// shows the slice; a double click keeps only it; "Show all"); slices that
// repeat a label share it and hide together. An item without a `color` takes
// its slice's colour, else grey (theme.muted). Drilled in, the legend is a static key
// whose items take their colour from the level shown.
//   legendRescale     — true (default): the ring closes over the shown
//                       slices, and the total, the percents and the centre are
//                       theirs; false: a hidden slice leaves its gap, and the
//                       total and the percents stay of every slice
//   legendInteractive — false: a static legend, hidden slices left out
//   onLegendToggle    — ({ name, visible, visibleNames }) => void, after a
//                       legend gesture (names are slice keys: id, else label)
//   setSeriesVisible(names | null) — shows those slices (keys as above) and
//                       hides the rest; null shows all. No onLegendToggle.
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
//                  formatted total); data — the slices the total is of (the
//                  shown ones; every one with legendRescale: false), info —
//                  { label, value }: the centre label and the total. Flat data
//                  only — drill-down shows the focused node's value
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
//   onDrill        — ({ node, path, depth, event }) => void, after each change
//                    of the level shown — a click on a slice, the hole or a
//                    breadcrumb, Enter/Space on the hole, or a drill method
//                    (event null) — as onFoldChange. node: the focused node's
//                    own fields as given (without children); path: the same
//                    for each level from the root; depth: 0 at the root. Not
//                    on setData, nor on a call that changes nothing.
//   showRemainder  — draw each node's remainder (value − Σ children) as a
//                    muted slice (default: false; a per-node remainderLabel
//                    surfaces just that node's remainder)
//   remainderLabel — fallback label for surfaced remainders (default: 'Other')
//   strict         — throw when children exceed a parent's stated value
//                    (default: warn and leave the negative remainder undrawn)

import * as d3 from 'd3';
import { Chart }       from '../core/Chart.js';
import { resolveEase, motionDuration } from '../core/utils.js';
import { EntryMotion, ENTRY_DURATION } from '../core/entryMotion.js';
import { fitTextNode, textWidth } from '../core/renderHelpers.js';

// Outer labels: the leader runs LEADER_LINE px out of the ring, then
// LEADER_TICK px sideways; the text starts LABEL_GAP px past its end.
const LEADER_LINE = 14;
const LEADER_TICK = 12;
const LABEL_GAP   = 3;

import { normalizeHierarchy } from '../core/hierarchy.js';
import { escapeHtml, tipNum, tipRow } from '../core/html.js';

// The clear space between the ring (labels included) and the header above
// it, the source below: the card's own padding.
const RING_CLEAR = 16;

// The key a slice answers to in the legend and setSeriesVisible: its id, else
// its label, as a string. Slices that repeat a label share it.
const sliceKey = d => String(d.id ?? d.label);

// The slice a legend item names without `series`: the one with its `id`
// when it has one, else the first with its label (K-22); none for an item
// with neither.
const sliceOf = (item, slices) => {
  if (item.id != null) return slices.find(d => d.id === item.id);
  const label = item.label ?? item.name;
  return label == null ? undefined : slices.find(d => d.label === label);
};

export class Donut extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 280,
      margin: { top: 8, right: 8, bottom: 8, left: 8 },
      ...options,
    });

    this._data         = [];
    this._given        = [];
    // The sweep plays on first render and on every drill (C-16: a render in
    // the middle of it carries it on instead of starting over).
    this._entry        = new EntryMotion();
    this.tooltip;   // made now: its element keeps its place in the card

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
    this._given = data ?? [];   // as the page gave it: the legend's warning reads it
    this._data  = this._given.filter(d => Number.isFinite(+d.value) && +d.value > 0);
    this.render();
    return this;
  }

  // Shows the slices named — keys as the legend's: a slice's id, else its
  // label — and hides the others; null shows every slice. Returns the chart;
  // chain it after setData. No onLegendToggle. Flat data only: drilled in,
  // the ring hides nothing (the legend there is a static key).
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this._createSvg();

    this.gSlices = this.svg.append('g').attr('class', 'rc-donut-slices');
    this.gLabels = this.svg.append('g').attr('class', 'rc-donut-labels');
    this.gCenter = this.svg.append('g').attr('class', 'rc-donut-center');
    this.gCrumb  = this.svg.append('g').attr('class', 'rc-donut-crumb');
  }

  // ─── Drill-down (hierarchy mode) ────────────────────────────────────────────

  _focus() { return this._trail[this._trail.length - 1] ?? null; }

  // The slices of the level shown: the flat data, or the focused node's
  // children with a value. Current before the render too (the legend sync
  // reads it), where this._data still holds the level drawn last.
  _levelData() {
    if (this._mode !== 'hier') return this._data ?? [];
    return (this._focus()?.children ?? []).filter(d => typeof d.value === 'number');
  }

  // A slice's colour: its own, else the palette at its place in the level,
  // else the accent; a remainder is muted.
  _sliceColor(d, i) {
    const t = this.theme;
    const palette = t.colors ?? [];
    return d.isRemainder ? t.muted : (d.color ?? palette[i % palette.length] ?? t.accent);
  }

  _drillable(node) {
    return !!node && !node.isRemainder && Array.isArray(node.children)
      && node.children.some(c => typeof c.value === 'number');
  }

  // Opens a child of the level shown: the chart's own node, or what the
  // page has — the object it passed in, its id or its label — matched among
  // the shown level's children, so it draws the level a click draws (the
  // copy setData makes keeps remainders and undisclosed children; K-21).
  drillTo(target) { return this._drillTo(target, null); }

  _drillTo(target, event) {
    // a normalized node keeps the page's object as `data`
    const kids  = this._focus()?.children ?? [];
    const isObj = target != null && typeof target === 'object';
    const id    = isObj ? target.id : target;
    const label = isObj ? target.label : target;
    const node  = kids.find(c => c === target || (isObj && c.data === target))
      ?? (id != null ? kids.find(c => c.data?.id != null && c.data.id === id) : undefined)
      ?? kids.find(c => c.label === label);
    if (!node || !this._drillable(node)) return this;
    return this._setTrail([...this._trail, node], event);
  }

  drillToDepth(index) { return this._drillToDepth(index, null); }

  drillUp() { return this._drillToDepth(this._trail.length - 2, null); }

  // The methods report event null; the click and key handlers pass theirs.
  _drillToDepth(index, event) {
    if (index < 0 || index >= this._trail.length - 1) return this;
    return this._setTrail(this._trail.slice(0, index + 1), event);
  }

  // The one place the level shown changes: the trail, a fresh entry, the
  // render, then onDrill — for a click, a key or a method alike, with the DOM
  // event or null (the handlers pass theirs).
  _setTrail(trail, event) {
    this._trail = trail;
    this._entry.reset();
    this.render();
    this._emit(this.options.onDrill, {
      node: this._focus().data, path: trail.map(n => n.data), depth: trail.length - 1, event,
    });
    return this;
  }

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
      this._data      = this._levelData();
      missingChildren = (focus.children ?? []).filter(d => d.missing);
    }

    if (!this._data.length) {
      this._centerButton(null, 0);
      this._renderEmpty();
      return;
    }

    // Use this.width (subtracts margins + legend-aside width) and add margins back
    // to get the actual SVG content width. Same pattern for height.
    // The height is the svg's own where it has one: the card's model of it
    // (`height`) leaves gaps under the header and over the source the card
    // does not have, and the ring sat 4 px under the header, 34 over the
    // source (maintainer, 2026-11-19).
    const W = this.width + this.margin.left + this.margin.right;
    const H = this.svg?.node()?.clientHeight || this.height + this.margin.top + this.margin.bottom;
    if (W <= 0 || H <= 0) return;

    const o = this.options;
    const t = this.theme;

    const duration   = motionDuration(o.duration ?? ENTRY_DURATION);
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

    // Outer radius — reserve only enough for the polyline itself (text
    // overflows via SVG overflow:visible). The ring, with its labels, stands
    // RING_CLEAR off the header and the source, centred between them — one
    // rule for every donut and pie (maintainer, 2026-11-19).
    const labelRoom = showLabels ? 36 : 0;
    let   outerR    = Math.min(cx - 4, (H - inset) / 2 - RING_CLEAR) - labelRoom;

    // The slices the legend left shown (flat data; drilled in, all). The
    // ring, the total, the percents and the centre are of them, so the ring
    // closes over a hidden slice; with legendRescale: false they stay of
    // every slice, and a hidden slice leaves its gap. Nothing shown: no
    // ring, no centre, no labels — the legend stays.
    const shownIdx = [];
    this._data.forEach((d, i) => { if (hier || this._isShown(sliceKey(d))) shownIdx.push(i); });
    const shownSet = new Set(shownIdx);
    const rescale = hier || this._legendRescale();
    const base    = rescale ? shownIdx.map(i => this._data[i]) : this._data;
    const nothing = !shownIdx.length;

    // Formatters
    const total      = d3.sum(base, d => +d.value);
    const valueFmt   = o.valueFormat   ?? (v => d3.format(',')(v));
    const percentFmt = o.percentFormat ?? (p => d3.format('.1%')(p));

    // Colors — per-item override, then palette, then accent fallback. `i` is
    // the slice's place in the level (an arc's `at`), never its place among
    // the slices drawn: hiding one recolours no other.
    const colorFor = (d, i) => this._sliceColor(d, i);
    // A slice's role fields (K-09): the tooltip payload itself, and the second
    // argument of valueFormat and percentFormat; the colour as hex (the
    // remainder's muted included, core/paint.js).
    const sliceRole = d => ({
      label: d.data.label, value: d.data.value,
      percent: total > 0 ? d.data.value / total : 0, color: this._hex(colorFor(d.data, d.at)),
    });

    // Pie layout — preserve input order
    const pie = d3.pie()
      .value(d => +d.value)
      .sort(null)
      .padAngle(padAngle);

    // Each arc keeps `at`, its slice's place in this._data.
    const arcs = rescale
      ? pie(base).map((a, j) => Object.assign(a, { at: shownIdx[j] }))
      : pie(this._data).map((a, i) => Object.assign(a, { at: i })).filter(a => shownSet.has(a.at));

    // Slice identity across renders: `id`, else `label`. A repeated key takes
    // its occurrence number — the second 'A' is 'A' #1 — so slices with the
    // same label stay distinct and keep their path instead of being dropped
    // and drawn again on every render (C-18). Counted over the whole level,
    // so a slice keeps its key whatever the legend hides.
    const seen = new Map();
    const joinKeys = this._data.map(d => {
      const k = sliceKey(d);
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      return n ? `${k}\u001f#${n}` : k;
    });
    arcs.forEach(a => { a.key = joinKeys[a.at]; });

    // A long slice name is cut to the room between its anchor and the svg
    // edge. With labels on, the ring gives way first: the outer radius
    // shrinks just enough for every name to fit whole, if 75% of its size is
    // enough; if not (a phone), the ring keeps its size and the names are cut
    // as before, the tooltip keeping them (field finding, 2026-11-17: "World
    // Liberty Finan…" on a 580px card). The anchor of a name at angle a stands
    // |sin a|·(R + LEADER_LINE) + LEADER_TICK + LABEL_GAP from the centre.
    // Measured on a probe in the label's class: nothing measured, no change.
    if (showLabels && (o.labelContent ?? 'both') !== 'percent' && total > 0) {
      const minPct = o.labelMinPct ?? 0.04;
      const probe  = this.gLabels.append('text').attr('class', 'rc-donut-label');
      let fit = outerR;
      arcs.forEach(a => {
        const sin = Math.abs(Math.sin((a.startAngle + a.endAngle) / 2));
        if (a.data.value / total < minPct || sin < 1e-6) return;
        probe.text(a.data.label);
        const w = probe.node().getComputedTextLength?.() || 0;
        if (w > 0) fit = Math.min(fit, (cx - LEADER_TICK - LABEL_GAP - 2 - w) / sin - LEADER_LINE);
      });
      probe.remove();
      if (fit >= outerR * 0.75) outerR = fit;
    }
    // A percentage cannot be cut: the ring always gives way to it, however
    // far (RC-060: '18.0%' ran 9 px past a phone's pie, where the names had
    // been cut instead of the ring shrinking).
    if (showLabels && (o.labelContent ?? 'both') !== 'label' && total > 0) {
      const minPct = o.labelMinPct ?? 0.04;
      const probe  = this.gLabels.append('text').attr('class', 'rc-donut-label-pct');
      let fit = outerR;
      arcs.forEach(a => {
        const share = a.data.value / total;
        const sin = Math.abs(Math.sin((a.startAngle + a.endAngle) / 2));
        if (share < minPct || sin < 1e-6) return;
        probe.text(percentFmt(share, sliceRole(a)));
        const w = probe.node().getComputedTextLength?.() || 0;
        if (w > 0) fit = Math.min(fit, (cx - LEADER_TICK - LABEL_GAP - 2 - w) / sin - LEADER_LINE);
      });
      probe.remove();
      if (fit > 0 && fit < outerR) outerR = fit;
    }
    const innerR = outerR * innerFrac;

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
          .attr('fill',  d => colorFor(d.data, d.at))
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
        // the tooltip. A slice the legend (or setSeriesVisible) has just
        // hidden goes at once: a sweep out that a second click would turn
        // back reads as jitter (no new motion on a legend redraw).
        exit => {
          exit
            .interrupt()
            .style('pointer-events', 'none')
            .on('mouseover click', null)
            .on('mouseout', () => this._tooltip?.hide());
          if (!(o.animate ?? true)) { exit.remove(); return; }
          const hidden = d => !hier && !this._isShown(sliceKey(d.data));
          exit.filter(hidden).remove();
          exit.filter(d => !hidden(d))
            .transition('exit').duration(duration / 2).ease(ease)
            .attr('d', d => arc({ ...d, endAngle: d.startAngle }))
            .remove();
        }
      )
      // Every render, not only on enter: a new `color` for a slice that
      // stays, or a palette colour that moved with its position (C-18).
      .attr('fill', d => colorFor(d.data, d.at))
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(120).ease(d3.easeQuadOut)
          .attr('d', arcHover(d));

        const role = sliceRole(d);
        const html = o.tooltipFormat
          ? o.tooltipFormat(role)
          // the slice's dot, its label and value, its share under them
          // (RC-082); the remainder's dot takes the tooltip's muted, not
          // the chart's (a role colour, core/html.js)
          : tipRow(escapeHtml(role.label), escapeHtml(valueFmt(role.value, role)), {
            swatch: 'dot',
            color: d.data.isRemainder ? this.theme.muted : role.color,
            note: tipNum(escapeHtml(percentFmt(role.percent, role))),
          });

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
        if (hier && this._drillable(d.data)) this._drillTo(d.data, event);
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

    // ── Outer labels (Bloomberg-style: polyline leader + two-line text) ───────
    this.gLabels.selectAll('*').remove();

    if (showLabels) {
      const lineLen     = LEADER_LINE;
      const tickLen     = LEADER_TICK;
      const labelGap    = LABEL_GAP;
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
      arcs.forEach(d => {
        const pct = d.data.value / total;
        if (pct < labelMinPct) return;
        const mid = (d.startAngle + d.endAngle) / 2;
        entries.push({
          d, pct,
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
            .text(percentFmt(e.pct, sliceRole(e.d)));
        }
      });
    }

    // ── Center text (donut only) ──────────────────────────────────────────────
    this.gCenter.selectAll('*').remove();
    const drilled = hier && this._trail.length > 1;

    if (showCenter && innerR > 0 && !nothing) {
      const rawCenter = o.centerText;
      const centerLabel = drilled ? focus.label : (o.centerLabel ?? 'Total');
      // The centre's role fields (K-09): its label and the value it shows.
      const centerRole  = { label: centerLabel, value: hier ? focus.value : total };
      const centerVal = hier
        ? valueFmt(focus.value, centerRole)
        : (typeof rawCenter === 'function' ? rawCenter(base, centerRole) : (rawCenter ?? valueFmt(total, centerRole)));

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
          if (!isLast) txt.on('click', event => this._drillToDepth(idx, event));
          cursorX += textWidth(txt.node(), 7, label) + 8;
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

  // ─── Legend ───────────────────────────────────────────────────────────────
  // The header legend is the base's (core/Chart.js, core/legend.js); these
  // hooks tell it what a slice is. Flat data only: drilled in, each level
  // shows other slices while the page's legend is one list, so it stays a
  // static key.

  // An item whose slice is not in the ring (drilled away from, a zero value)
  // is grey, as a slice with no data: the accent is the first slice's colour
  // and would read as that slice (maintainer, 2026-11-17).
  _legendFallbackColor() {
    return this.theme.muted;
  }

  // The slices the legend toggles, in data order, with their colours.
  _legendSeries() {
    if (this._mode === 'hier') return [];
    return this._data.map((d, i) => ({ key: sliceKey(d), color: this._sliceColor(d, i) }));
  }

  // An item names its slice by `series` (a slice key), else by `id` (the
  // slice with that id), else by its label (the first slice with it) — the
  // K-22 match, not the slice at the item's position. `series: false` is a
  // caption.
  _legendKeyOf(item, present) {
    if (item == null || typeof item !== 'object' || item.series === false) return null;
    const slice = item.series == null ? sliceOf(item, this._levelData()) : null;
    const key = item.series != null ? String(item.series) : slice ? sliceKey(slice) : null;
    return key != null && present.has(key) ? key : null;
  }

  // Drilled in: every item a label, an uncoloured one in the colour of its
  // slice in the level shown, else grey (K-22).
  _headerLegendItems(present) {
    if (this._mode !== 'hier' || !present) return super._headerLegendItems(present);
    const level = new Map();
    this._levelData().forEach((d, i) => {
      const key = sliceKey(d);
      if (!level.has(key)) level.set(key, { key, color: this._sliceColor(d, i) });
    });
    return super._headerLegendItems(level).map(item => ({ ...item, key: null, on: true }));
  }

  // An item that names a slice the page gave with nothing to draw (a zero,
  // negative or missing value) names a slice all the same: it stays a label
  // in grey, without the "names no series" warning.
  _warnUnmappedLegend(legend, items) {
    const rows = this._mode !== 'hier' && Array.isArray(this._given) ? this._given : [];
    const given = rows.filter(d => d != null && typeof d === 'object');
    const namesGiven = item => (item.series != null
      ? given.some(d => sliceKey(d) === String(item.series))
      : !!sliceOf(item, given));
    // such an item reads as mapped to the base (a key it never draws)
    super._warnUnmappedLegend(legend, items.map((item, i) => {
      const entry = legend[i];
      const named = item.key == null && entry != null && typeof entry === 'object'
        && entry.series !== false && namesGiven(entry);
      return named ? { ...item, key: '' } : item;
    }));
  }

  // A legend change redraws the ring under a pointer that has not moved: the
  // slice it was on may be gone, and every percent moves. The tooltip goes
  // (Donut pins none).
  _unpinHidden() {
    this._tooltip?.hide();
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
      .on('click', on ? event => this._drillToDepth(this._trail.length - 2, event) : null)
      .on('keydown', on ? (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this._drillToDepth(this._trail.length - 2, event);
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

// RareCharts — Map
// Choropleth and region-highlight map backed by GeoJSON or TopoJSON.
//
// Data format:
//   [{ id, value?, color?, label? }, ...]
//   id      — matches feature.id OR feature.properties[idField]
//   value   — optional numeric value (used for tooltip)
//   color   — explicit fill color (overrides theme-based color)
//   label   — display name in tooltip (falls back to feature.properties.name)
//
// Geographic data:
//   geoData    — GeoJSON FeatureCollection passed inline
//   geoUrl     — URL string; fetched via d3.json()
//   topoData   — TopoJSON topology object passed inline
//   topoUrl    — URL string; fetched via d3.json()
//   topoObject — named object inside the topology (default: the first object in the topology)
//
// Options:
//   height        — total chart height in px (default: 400)
//   projection    — 'mercator' | 'naturalEarth1' | 'equalEarth' | 'orthographic' | 'identity'
//                   (default: 'naturalEarth1'; 'identity' = no projection, for source data
//                   already in planar/screen coordinates)
//   reflectY      — flip the Y axis; only with projection: 'identity' (default: false)
//   fitPadding    — padding around features in px (default: 20)
//   defaultFill   — fill for regions with NO matching data
//                   (default: theme.map.unmatchedFill — #e8e8e8; dark #1e1e2e)
//   matchFill     — fill for regions WITH matching data without explicit color
//                   (default: theme.map.matchFill, null in both presets, so
//                   theme.accent — #1677ff; dark #ff6200)
//   oceanColor    — SVG background / ocean fill (default: theme.map.ocean,
//                   transparent)
//   borderColor   — feature border stroke
//                   (default: theme.map.border — #ffffff; dark #444455)
//   borderWidth   — border stroke-width (default: 0.5)
//   hoverFill     — fill on mouse-over for matched regions, their own color
//                   included (default: the region's own fill, its lightness
//                   × theme.map.hoverBrighten — 1.3; dark 1.2)
//   graticule     — draw a 10° grid of meridians and parallels under the
//                   regions, in theme.map.graticule (default: false; not
//                   drawn with projection 'identity')
//   The theme's surface / border are only fallbacks for a theme without a
//   `map` section; its accent fills regions with data unless map.matchFill
//   is set, so changing accent recolours a map too.
//   zoom          — zoom and pan (default: false): Ctrl/⌘ + wheel or a
//                   trackpad pinch zooms, a drag pans; on a phone two fingers
//                   pan and pinch. A plain wheel and one finger scroll the
//                   page, with a hint over the map (T-09, core/zoomGesture.js)
//   zoomExtent    — [minScale, maxScale] for d3 zoom (default: [0.8, 12])
//   idField       — feature property used as ID when feature.id is absent (default: 'id')
//   featureFilter — function(feature) => boolean
//   clipExtent    — [[minLon, minLat], [maxLon, maxLat]] used to keep only polygons intersecting that bbox
//   tooltipFormat — function({ feature, item, label, value, color }) => html
//                   string; item is null for a region without a data item;
//                   label — the default tooltip's name (item.label, then the
//                   feature's name or id), value — item.value (null without),
//                   color — the region's fill. Formatter arguments, the rule
//                   for every class (K-09): /charts/settings/#formatter-arguments
//   rotate        — [lambda, phi, gamma] rotation angles passed to projection.rotate()
//   onRegionClick — function({ feature, item, label, value, event }) (B-06):
//                   a click, Enter or Space on a region with a data item. The
//                   chart only reports it; the page navigates (links from the
//                   data come after 1.0). With a handler those regions take a
//                   pointer, become focusable buttons named by their label and
//                   value, and show the focus ring; the svg is a group, not an
//                   image. A click anywhere else on the map — the sea, a region
//                   without data — and Escape on a focused region report
//                   item: null, so the page can clear what it showed (feature
//                   is the region without data, or null). A drag (a pan) is
//                   not a click; MapFlow's arcs and places do not report.
//
// Readiness: whenReady() (base Chart) resolves once the geometry has loaded
// and the map is drawn — and also when the load fails, after the error is
// logged. Without any geometry source the map draws nothing and warns.

import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Chart } from '../core/Chart.js';
import { escapeHtml, tipTitle, tipRow } from '../core/html.js';
import { bindZoom } from '../core/zoomGesture.js';

export class Map extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 400,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this._features = [];
    this._dataMap = new globalThis.Map(); // id → item
    this.tooltip;   // made now: its element keeps its place in the card
    this._geoReady = false;
    this._activeTooltipHtml = null;
    this._zoomTransform = d3.zoomIdentity;

    this._initSVG();
    // What whenReady() (base Chart) waits for: the geometry loaded and the
    // first draw done — or the load failed, after its console.error (K-12).
    this._ready = this._loadGeo();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  setData(items = []) {
    this._dataMap.clear();

    items.forEach(item => {
      if (item?.id != null) {
        this._dataMap.set(String(item.id), item);
      }
    });

    if (this._geoReady) this.render();
    return this;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _initSVG() {
    this.container.style.overflow = 'hidden';

    // sized at render (width, height and a viewBox)
    this._createSvg({
      size: 'none', className: 'rc-map-svg', style: { display: 'block', overflow: 'hidden' }, beforeFooter: true,
    });

    this._bgRect = this.svg.append('rect')
      .attr('class', 'rc-map-ocean');

    this._clipId = `${this._uid}-map-clip`;

    this._defs = this.svg.append('defs');

    this._clipRect = this._defs.append('clipPath')
      .attr('id', this._clipId)
      .append('rect');

    this.gZoom = this.svg.append('g')
      .attr('class', 'rc-map-zoom')
      .attr('clip-path', `url(#${this._clipId})`);

    // under the regions: they cover it on land (C-22)
    if (this.options.graticule) {
      this._graticule = this.gZoom.append('path')
        .attr('class', 'rc-map-graticule')
        .attr('fill', 'none')
        .attr('vector-effect', 'non-scaling-stroke')
        .style('pointer-events', 'none');
    }

    this.gPaths = this.gZoom.append('g')
      .attr('class', 'rc-map-paths');

    if (this.options.zoom) {
      this._zoom = d3.zoom()
        // An explicit extent, as Graph's (RC-073): the default reads the
        // svg's width/height attributes or viewBox, which not every
        // environment resolves to pixels.
        .extent(function () { return [[0, 0], [this.clientWidth || 1, this.clientHeight || 1]]; })
        .scaleExtent(this.options.zoomExtent ?? [0.8, 12])
        .translateExtent([[-2000, -2000], [4000, 4000]])
        .on('zoom', event => {
          this._zoomTransform = event.transform;
          this.gZoom.attr('transform', event.transform);
          this._onZoom(event.transform);
        });

      // Ctrl/⌘ + wheel, two fingers on a phone; a plain wheel and one finger
      // are the page's, with a hint over the map (core/zoomGesture.js)
      this._zoomHint = bindZoom(this.svg, this._zoom, { container: this.container, theme: this.theme });
      this.svg.on('dblclick.zoom', null);
    }
  }

  // ─── Load geographic data ─────────────────────────────────────────────────

  async _loadGeo() {
    try {
      const o = this.options;

      let data;
      if (o.geoData) data = o.geoData;
      else if (o.topoData) data = o.topoData;
      else if (o.geoUrl) data = await d3.json(o.geoUrl);
      else if (o.topoUrl) data = await d3.json(o.topoUrl);
      else {
        console.warn('RareCharts Map: no geographic data — pass geoData, topoData, geoUrl or topoUrl');
        return;
      }
      if (this._destroyed) return;   // destroyed while the geometry loaded

      const features = this._extractFeatures(data, o.topoObject);
      this._features = this._prepareFeatures(features);
      this._geoReady = true;
      this.render();
    } catch (err) {
      if (this._destroyed) return;
      console.error('RareCharts Map: failed to load geographic data', err);
    }
  }

  _prepareFeatures(features) {
    return this._clipFeatures(this._applyFilter(features));
  }

  _applyFilter(features) {
    const fn = this.options.featureFilter;
    return typeof fn === 'function' ? features.filter(fn) : features;
  }

  _extractFeatures(data, topoObject) {
    if (data?.type === 'Topology') {
      const objName = topoObject ?? Object.keys(data.objects ?? {})[0];
      if (!objName || !data.objects?.[objName]) return [];
      const fc = topojson.feature(data, data.objects[objName]);
      return fc.type === 'FeatureCollection' ? (fc.features ?? []) : [fc];
    }

    if (data?.type === 'FeatureCollection') return data.features ?? [];
    if (data?.type === 'Feature') return [data];

    return [];
  }

  // ─── Geographic clipping ──────────────────────────────────────────────────

  _clipFeatures(features) {
    const clip = this.options.clipExtent;
    if (!clip) return features;

    const [[minLon, minLat], [maxLon, maxLat]] = clip;

    const intersects = ([[x0, y0], [x1, y1]]) =>
      !(x1 < minLon || x0 > maxLon || y1 < minLat || y0 > maxLat);

    const clipGeom = geom => {
      if (!geom) return null;

      if (geom.type === 'Polygon') {
        const b = d3.geoBounds({ type: 'Feature', geometry: geom });
        return intersects(b) ? geom : null;
      }

      if (geom.type === 'MultiPolygon') {
        const polys = geom.coordinates.filter(c => {
          const b = d3.geoBounds({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: c }
          });
          return intersects(b);
        });

        if (!polys.length) return null;

        return polys.length === 1
          ? { type: 'Polygon', coordinates: polys[0] }
          : { type: 'MultiPolygon', coordinates: polys };
      }

      return geom;
    };

    return features
      .map(f => {
        const g = clipGeom(f.geometry);
        return g ? { ...f, geometry: g } : null;
      })
      .filter(Boolean);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    if (!this._geoReady || !this._features.length) return;

    const W = this.width;
    const H = this.height;
    if (W <= 0 || H <= 0) return;

    const t = this.theme;
    const tm = t.map ?? {};
    const o = this.options;
    const pad = o.fitPadding ?? 20;
    const idField = o.idField ?? 'id';

    this.svg
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const oceanColor = o.oceanColor ?? tm.ocean ?? 'transparent';

    this._bgRect
      .attr('width', W)
      .attr('height', H)
      .attr('fill', oceanColor);

    this._clipRect
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', W)
      .attr('height', H);

    const projName = o.projection ?? 'naturalEarth1';
    const proj = this._buildProjection(projName);
    this._fitProjection(proj, [[pad, pad], [W - pad, H - pad]]);

    const path = d3.geoPath(proj);
    // Kept for overlays drawn by subclasses: MapFlow places its points with
    // the projection.
    this._projection = proj;

    // ─── Colors ─────────────────────────────────────────────────────────────

    const defaultFill = o.defaultFill ?? tm.unmatchedFill ?? t.surface ?? '#e8e8e8';
    const matchFill = o.matchFill ?? tm.matchFill ?? t.accent ?? '#1677ff';
    const borderColor = o.borderColor ?? tm.border ?? t.border ?? '#ffffff';

    const fillFor = feature => {
      const fid = this._featureId(feature, idField);
      if (fid == null) return defaultFill;

      const item = this._dataMap.get(fid);
      if (!item) return defaultFill;

      return item.color ?? matchFill;
    };

    // A region with data under the pointer: hoverFill, else its own fill
    // moved (hoverBrighten − 1) of the way towards white (C-22) — black
    // changes too, and nothing reaches pure white; a fill already lighter
    // than 0.85 darkens by a similar step instead. A token or var() fill is
    // read as hex first; one d3 still cannot read (a gradient url) stays.
    const brighten = Number.isFinite(tm.hoverBrighten) ? tm.hoverBrighten : 1.3;
    const hoverFillFor = feature => {
      if (o.hoverFill != null) return o.hoverFill;
      const fill = fillFor(feature);
      const c = d3.hsl(this._hex(fill));                 // a token or var() fill, read as hex
      if (!Number.isFinite(c.l)) return fill;
      const step = brighten - 1;
      c.l = c.l > 0.85 ? Math.max(0, c.l - step * 0.4) : c.l + (1 - c.l) * step;
      return String(c);
    };

    // ─── Graticule ──────────────────────────────────────────────────────────
    // Meridians and parallels every 10°; planar data ('identity') has none.

    if (this._graticule) {
      this._graticule
        .attr('d', projName === 'identity' ? null : path(d3.geoGraticule10()))
        .attr('stroke', tm.graticule ?? t.grid ?? 'rgba(0,0,0,0.08)')
        .attr('stroke-width', 1);
    }

    this.gPaths.selectAll('.rc-map-feature')
      .data(
        this._features,
        d => this._featureId(d, idField) ?? d.id ?? JSON.stringify(d.geometry)
      )
      .join('path')
      .attr('class', 'rc-map-feature')
      .attr('d', path)
      .attr('fill', fillFor)
      .attr('stroke', borderColor)
      .attr('stroke-width', o.borderWidth ?? 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
      .on('mouseover', (event, d) => {
        const fid = this._featureId(d, idField);
        // null, not undefined, for a region without data — as documented,
        // whether or not the feature has an id
        const item = fid != null ? (this._dataMap.get(fid) ?? null) : null;

        if (item) {
          d3.select(event.currentTarget).attr('fill', hoverFillFor(d));
        }

        // The payload is an object: the role fields sit on it (K-09).
        const fmt = this._regionTooltipFormat();
        const color = this._hex(fillFor(d));
        const html = fmt
          ? fmt({ feature: d, item, label: this._regionName(d, item), value: item?.value ?? null, color })
          : this._defaultTooltip(d, item, color);

        this._activeTooltipHtml = html;

        if (html) {
          const [mx, my] = d3.pointer(event, this.container);
          this._tooltip.show(mx, my, html);
        }
      })
      .on('mousemove', event => {
        if (!this._activeTooltipHtml) return;
        const [mx, my] = d3.pointer(event, this.container);
        this._tooltip.show(mx, my, this._activeTooltipHtml);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget).attr('fill', fillFor(d));
        this._activeTooltipHtml = null;
        this._tooltip.hide();
      });

    this._bindRegionClicks(idField);

    if (this._zoom) {
      this._zoom.translateExtent([[-W * 2, -H * 2], [W * 3, H * 3]]);
    }
  }

  // ─── Region clicks (B-06) ───────────────────────────────────────────────

  // With onRegionClick, every region with a data item is a button: a click,
  // Enter or Space reports { feature, item, label, value, event }; a click on
  // the rest of the map, or Escape, reports item: null (nothing chosen).
  // Without it, no attribute and no handler, so the drawing stays as it was.
  // The handlers are set on every render (namespaced, replaced, never stacked).
  _bindRegionClicks(idField) {
    const handler = this.options.onRegionClick;
    const on = typeof handler === 'function';
    const itemOf = d => {
      const fid = this._featureId(d, idField);
      return fid != null ? (this._dataMap.get(fid) ?? null) : null;
    };
    const active = d => on && !!itemOf(d);
    const report = (event, d) => {
      if (this._destroyed) return;
      const item = itemOf(d);
      handler({ feature: d, item, label: this._regionName(d, item), value: item?.value ?? null, event });
    };
    // Nothing chosen: a region without data (its feature), the sea (none).
    const clear = (event, d = null) => {
      if (this._destroyed) return;
      handler({ feature: d, item: null, label: d ? this._regionName(d, null) : null, value: null, event });
    };
    // A drag that pans the map ends with a click on a region: one that moved
    // more than 4 px since the press is not taken for a click.
    const moved = event => {
      const at = this._regionPress;
      return !!at && Math.hypot(event.clientX - at[0], event.clientY - at[1]) > 4;
    };
    // Regions sit inside a group, not an image: an image hides its buttons
    // from assistive technology (K-24's rule).
    this.svg.attr('role', on ? 'group' : 'img');
    // One click handler on the svg reads what was hit: a region with data
    // reports it, a region without data or the map's ground clears; anything
    // else drawn over the map (MapFlow's arcs and places) is left alone.
    this.svg
      .on('pointerdown.rc-region', on ? event => { this._regionPress = [event.clientX, event.clientY]; } : null)
      .on('click.rc-region', on ? event => {
        const drag = moved(event);
        this._regionPress = null;
        if (drag) return;
        const t = event.target;
        const region = t?.closest?.('.rc-map-feature');
        if (region && this.gPaths.node().contains(region)) {
          const d = d3.select(region).datum();
          if (active(d)) report(event, d); else clear(event, d);
        } else if (t === this.svg.node() || t === this._graticule?.node() || t?.classList?.contains('rc-map-ocean')) {
          clear(event);
        }
      } : null);
    this.gPaths.selectAll('.rc-map-feature')
      .classed('rc-map-feature--clickable', active)
      .attr('tabindex', d => (active(d) ? 0 : null))
      .attr('role', d => (active(d) ? 'button' : null))
      .attr('aria-label', d => {
        if (!active(d)) return null;
        const item = itemOf(d);
        const label = this._regionName(d, item);
        return item?.value != null ? `${label}, ${item.value}` : label;
      })
      .on('keydown.rc-region', on ? (event, d) => {
        if (!active(d)) return;
        if (event.key === 'Escape') { clear(event); return; }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        report(event, d);
      } : null);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // The formatter for a region's tooltip — tooltipFormat here; MapFlow keeps
  // tooltipFormat for its places and reads regionTooltipFormat instead.
  _regionTooltipFormat() {
    return this.options.tooltipFormat;
  }

  // Fit the projection into the extent [[x0, y0], [x1, y1]]: to the fit
  // object. MapFlow then folds in its arcs as drawn (fitTo: 'links').
  _fitProjection(proj, extent) {
    proj.fitExtent(extent, this._fitObject());
  }

  // What the projection is fitted to: every feature. MapFlow can fit to its
  // own places instead (fitTo: 'links').
  _fitObject() {
    return { type: 'FeatureCollection', features: this._features };
  }

  // Called on every zoom and pan with the new transform, after the map
  // group has taken it: overlays that keep their screen size (MapFlow's
  // dots, labels and arrowheads) follow here.
  _onZoom() {}

  _featureId(feature, idField) {
    if (feature?.id != null) return String(feature.id);

    if (feature?.properties) {
      const v = feature.properties[idField]
        ?? feature.properties.iso_a2
        ?? feature.properties.iso_a3
        ?? feature.properties.ISO_A2
        ?? feature.properties.ISO_A3;

      if (v != null) return String(v);
    }

    return null;
  }

  _buildProjection(name) {
    let proj;
    switch (name) {
      case 'mercator':     proj = d3.geoMercator(); break;
      case 'equalEarth':   proj = d3.geoEqualEarth(); break;
      case 'orthographic': proj = d3.geoOrthographic(); break;
      case 'identity':     proj = d3.geoIdentity().reflectY(this.options.reflectY ?? false); break;
      default:             proj = d3.geoNaturalEarth1();
    }
    if (this.options.rotate && typeof proj.rotate === 'function') {
      proj.rotate(this.options.rotate);
    }
    return proj;
  }

  // A region's name: its data item's label, then the feature's own.
  _regionName(feature, item) {
    return item?.label
      ?? feature?.properties?.name
      ?? feature?.properties?.NAME
      ?? feature?.id
      ?? '—';
  }

  _defaultTooltip(feature, item, color = null) {
    const name = this._regionName(feature, item);

    // names and values can come from a third-party geoUrl / topoUrl. A
    // region with a value: its fill's dot, its name and the value (RC-082);
    // without one, its name.
    return item?.value != null
      ? tipRow(escapeHtml(name), escapeHtml(item.value), { swatch: 'dot', color })
      : tipTitle(escapeHtml(name));
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  _onResize() {
    if (this._geoReady) this.render();
  }
}

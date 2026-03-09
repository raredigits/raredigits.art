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
//   topoObject — named object inside the topology (required when using topo*)
//
// Options:
//   height        — total chart height in px (default: 400)
//   projection    — 'mercator' | 'naturalEarth1' | 'equalEarth' | 'orthographic' (default: 'naturalEarth1')
//   fitPadding    — padding around features in px (default: 20)
//   defaultFill   — fill for regions with NO matching data
//   matchFill     — fill for regions WITH matching data without explicit color
//   oceanColor    — SVG background / ocean fill
//   borderColor   — feature border stroke
//   borderWidth   — border stroke-width (default: 0.5)
//   hoverFill     — fill on mouse-over for matched regions
//   zoom          — enable scroll-zoom and drag pan (default: false)
//   zoomExtent    — [minScale, maxScale] for d3 zoom (default: [0.8, 12])
//   idField       — feature property used as ID when feature.id is absent (default: 'id')
//   featureFilter — function(feature) => boolean
//   clipExtent    — [[minLon, minLat], [maxLon, maxLat]] used to keep only polygons intersecting that bbox
//   tooltipFormat — function({ feature, item }) => html string

import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Chart } from '../core/Chart.js';
import { Tooltip } from '../core/Tooltip.js';

export class Map extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      height: 400,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this._features = [];
    this._dataMap = new globalThis.Map(); // id → item
    this._tooltip = new Tooltip(this.container, this.theme);
    this._geoReady = false;
    this._activeTooltipHtml = null;
    this._zoomTransform = d3.zoomIdentity;

    this._initSVG();
    this._loadGeo();
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

    this.svg = d3.create('svg')
      .attr('class', 'rc-map-svg')
      .style('display', 'block')
      .style('overflow', 'hidden');

    if (this._footerEl && this._footerEl.parentNode === this.container) {
      this.container.insertBefore(this.svg.node(), this._footerEl);
    } else {
      this.container.appendChild(this.svg.node());
    }

    this._bgRect = this.svg.append('rect')
      .attr('class', 'rc-map-ocean');

    this._clipId = `rc-map-clip-${Math.random().toString(36).slice(2, 10)}`;

    this._defs = this.svg.append('defs');

    this._clipRect = this._defs.append('clipPath')
      .attr('id', this._clipId)
      .append('rect');

    this.gZoom = this.svg.append('g')
      .attr('class', 'rc-map-zoom')
      .attr('clip-path', `url(#${this._clipId})`);

    this.gPaths = this.gZoom.append('g')
      .attr('class', 'rc-map-paths');

    if (this.options.zoom) {
      this._zoom = d3.zoom()
        .scaleExtent(this.options.zoomExtent ?? [0.8, 12])
        .translateExtent([[-2000, -2000], [4000, 4000]])
        .on('zoom', event => {
          this._zoomTransform = event.transform;
          this.gZoom.attr('transform', event.transform);
        });

      this.svg
        .call(this._zoom)
        .on('dblclick.zoom', null);
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
      else return;

      const features = this._extractFeatures(data, o.topoObject);
      this._features = this._prepareFeatures(features);
      this._geoReady = true;
      this.render();
    } catch (err) {
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
      return topojson.feature(data, data.objects[objName]).features;
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

    const proj = this._buildProjection(o.projection ?? 'naturalEarth1');
    proj.fitExtent(
      [[pad, pad], [W - pad, H - pad]],
      {
        type: 'FeatureCollection',
        features: this._features,
      }
    );

    const path = d3.geoPath(proj);

    // ─── Colors ─────────────────────────────────────────────────────────────

    const defaultFill = o.defaultFill ?? tm.unmatchedFill ?? t.surface ?? '#e8e8e8';
    const matchFill = o.matchFill ?? tm.matchFill ?? t.accent ?? '#00aaff';
    const borderColor = o.borderColor ?? tm.border ?? t.border ?? '#ffffff';
    const hoverFill =
      o.hoverFill ??
      d3.interpolateRgb(matchFill, '#ffffff')(0.16);

    const fillFor = feature => {
      const fid = this._featureId(feature, idField);
      if (fid == null) return defaultFill;

      const item = this._dataMap.get(fid);
      if (!item) return defaultFill;

      return item.color ?? matchFill;
    };

    const hasTooltip = typeof o.tooltipFormat === 'function';

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
      .style('cursor', hasTooltip ? 'pointer' : 'default')
      .on('mouseover', (event, d) => {
        const fid = this._featureId(d, idField);
        const item = fid != null ? this._dataMap.get(fid) : null;

        if (item) {
          d3.select(event.currentTarget).attr('fill', hoverFill);
        }

        const html = o.tooltipFormat
          ? o.tooltipFormat({ feature: d, item })
          : this._defaultTooltip(d, item);

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

    if (this._zoom) {
      this._zoom.translateExtent([[-W * 2, -H * 2], [W * 3, H * 3]]);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
    switch (name) {
      case 'mercator':     return d3.geoMercator();
      case 'equalEarth':   return d3.geoEqualEarth();
      case 'orthographic': return d3.geoOrthographic();
      default:             return d3.geoNaturalEarth1();
    }
  }

  _defaultTooltip(feature, item) {
    const t = this.theme;

    const name = item?.label
      ?? feature?.properties?.name
      ?? feature?.properties?.NAME
      ?? feature?.id
      ?? '—';

    const valueRow = item?.value != null
      ? `<div style="color:${t.muted ?? '#888'}; margin-top:2px;">${item.value}</div>`
      : '';

    return `<div style="font-weight:600">${name}</div>${valueRow}`;
  }

  // ─── Resize & Destroy ─────────────────────────────────────────────────────

  _onResize() {
    if (this._geoReady) this.render();
  }

  destroy() {
    this._tooltip?.hide?.();
    super.destroy();
  }
}
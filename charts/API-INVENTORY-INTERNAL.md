# RareCharts — Public API Inventory (Internal)

> **Непубличный файл** (см. `.eleventyignore`). Рабочая поверхность для аудита API перед заморозкой 1.0 — пункт **N2** в [ROADMAP-INTERNAL](./ROADMAP-INTERNAL.md).

**Цель:** перед 1.0 пройти по всем публичным классам и свести воедино имена опций и форму данных, чтобы (а) проверить консистентность между типами и (б) зафиксировать контракт, который замораживаем по semver.

**Как заполнять:** у каждого класса в `assets/charts/src/charts/*.js` в шапке есть блок-комментарий с перечнем опций + деструктуризация `this.options.*` в `render`. Источник истины по форме данных — `.setData()` и `_normalizeData`.

**Статус:** ✅ заполнено по всем классам (2026-07-03). Решения по ⚠️/❓ — отдельный проход в 0.9.9, после боевого тестирования.

**Условные обозначения:** ✅ согласовано · ⚠️ расходится между классами (кандидат на унификацию) · ❓ под вопрос к 1.0.

---

## Сводка по типам

| Класс | Файл | Форма данных | Инвентарь |
|-------|------|--------------|-----------|
| Line | `charts/Line.js` | `[{ date, value }]` / series / band | ✅ |
| TimeSeries | `charts/TimeSeries.js` | `[{ date: Date, value }]` (OHLCV — мёртвая дока) | ✅ |
| Overview | `charts/Overview.js` | (навигатор для TimeSeries) | ✅ · ❓ кандидат в internal |
| Bar | `charts/Bar.js` | `[{ label, value }]` или time-series `[{ date, value }]` | ✅ |
| DualAxes | `charts/DualAxes.js` | серии `{ name, axis, type, values }` | ✅ |
| Donut / Pie | `charts/Donut.js` | `[{ label, value, color? }]` | ✅ · ❓ Pie-alias сломан |
| Gauge | `charts/Gauge.js` | `number` или `{ value, max?, min? }` | ✅ |
| Graph | `charts/Graph.js` | `{ nodes, links }` | **experimental — вне 1.0 (B3)** |
| MultiChart | `charts/MultiChart.js` | контейнер дочерних графиков | ✅ |
| Map | `charts/Map.js` | `[{ id, value?, color?, label? }]` + geo через опции | ✅ |
| Адаптеры | `adapters/index.js` | `fromJson/fromCsv/fromApi/fromArray(data, mapping)` | ✅ |

---

## Общие опции (базовый `Chart`)

Из `core/Chart.js` — применимы ко всем типам. **Кандидаты на «общий контракт», который точно фиксируем в 1.0.**

| Опция | Тип | Назначение |
|-------|-----|------------|
| `title` | string \| HTMLElement | заголовок |
| `subtitle` | string \| HTMLElement | подзаголовок |
| `legend` | array \| string \| HTMLElement | легенда |
| `legendPosition` | `'right'` \| — | ❓ легенда правой колонкой вместо шапки; влияет на `get width` — **не была в инвентаре** |
| `source` | string \| `{text,href}` \| array \| HTMLElement | атрибуция (v0.9.7) |
| `note` | string \| HTMLElement | editorial-note в футере (v0.9.7) |
| `theme` | object | тема |
| `margin` | `{top,right,bottom,left}` | поля; дефолт базы `{8, 70, 16, 0}`, классы переопределяют |
| `height` | number | высота инстанса |
| `ariaLabel` | string | явный accessible-name; ❓ читается не в Chart.js, а в `applySvgA11y()` — чарт, забывший её вызвать, молча игнорирует |
| `timeframes` | `true` \| Array<string \| {key,label}> | кнопки диапазонов; `true` → `['1M','3M','6M','1Y','2Y','ALL']` — **не была в инвентаре** |
| `viewSteps` | — | ❓ недокументированный алиас `timeframes` (Chart.js:304) — депрекейт или документировать |
| `navigator` | boolean \| object | мини-обзор (Overview) под графиком — **не была в инвентаре** |
| `defaultView` | `[from, to]` | начальный видимый диапазон — **не была в инвентаре** |
| `defaultTimeframe` | string | начальный диапазон по ключу timeframe — **не была в инвентаре** |

---

## Line

**Форма данных:** три режима. (1) Одиночная серия: `[{ date: Date|string|number, value: number }, ...]` — dates через `parseDate`, нечисловые value отбрасываются; имя/цвет серии из опций `seriesName`/`lineColor`. (2) Мульти-серии: `[{ name?, color?, values: [{ date, value }] }, ...]`. (3) Band-серия: `{ name?, type: 'band', color?, fillOpacity?, values: [{ date, lower, upper }] }` — позади линий, вне crosshair/end labels/маркеров; автоопределяется по `lower`/`upper` в первой точке. Per-series overrides: `curve`, `strokeWidth` (дефолт 2), `strokeDash`, `area`, `areaOpacity`, `areaBaseline`.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `animate` | boolean | `true` | только первый рендер. ⚠️ В TimeSeries моторного блока нет вообще |
| `duration` | number (ms) | `650` | через `motionDuration()` |
| `ease` | `'cubicOut'\|'cubicInOut'\|'linear'` | `'cubicOut'` | |
| `yTicks` | number | `4` | ⚠️ в TimeSeries дефолт 5 |
| `yTickValues` | number[] | авто (`niceTickValues`) | ❓ недокументирована в шапке |
| `yTickFormat` | `fn(value) => string` | авто (SI `.2s` / `+.2%`) | |
| `xTickFormat` | `fn(date) => string` | `'%m/%d'` | ⚠️ в TimeSeries дефолт `'%b'` |
| `xTicks` | number | `6` | ❓ недокументирована в шапке |
| `yFormat` | `'auto'\|'percent'\|'number'` | `'auto'` | `'auto'` → percent при `absMax <= 1` |
| `zeroEpsilon` | number | `1e-6` | |
| `yPrefix` / `ySuffix` | string | `''` | |
| `yLabelsOnly` | boolean | `true` | |
| `yAxisPosition` | `'right'\|'left'` | `'right'` | ❓ недокументирована; меняет дефолты margin |
| `showGrid` | boolean | `true` | |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | 0.9.8: скрытие схлопывает боковое поле, когда `endLabels` тоже выключены (общий gutter) |
| `endLabels` | boolean | `true` | делит правое поле с осью Y |
| `crosshair` | boolean | `true` | ⚠️ в TimeSeries crosshair всегда включён, опции нет |
| `tooltipFormat` | `fn({date, points:[{name,value,color}]}) => html` | встроенный | ⚠️ сигнатура расходится с TimeSeries (`fn(d)` — одна точка) |
| `annotations` | array | `[]` | point / range / hPoint / hRange |
| `annotationLabelHeight` | number | `22` | резерв сверху только при наличии аннотаций |
| `curve` | string | `'monotone'` | |
| `curveTension` | number | `0` | для `'cardinal'`. ⚠️ TimeSeries tension не поддерживает |
| `area` | boolean | `false` | ⚠️ в TimeSeries `area` — `false\|true\|number`, дефолт true |
| `areaOpacity` | number | `0.12` | |
| `areaBaseline` | `'zero'\|'min'\|number` | `'zero'` | |
| `strokeDash` | string\|array | `null` | ❓ глобальный вариант недокументирован (в шапке только per-series) |
| `markers` | boolean | `false` | ❓ недокументирована в шапке |
| `markerShape` | string | `'circle'` | ❓ недокументирована |
| `markerSize` | number | `4` | ❓ недокументирована |
| `seriesName` | string | `'Series'` | ❓ недокументирована; только одиночная серия |
| `lineColor` | string | `theme.accent` | ❓ недокументирована; только одиночная серия |

---

## TimeSeries

**Форма данных:** одна серия `[{ date: Date, value: number }, ...]`. ⚠️ `setData` сохраняет массив **как есть** — без `parseDate`/фильтрации (в отличие от `Line._normalizeData`): строковые даты молча ломают extent/bisect. Поля `open?/high?/low?/volume?` задокументированы в шапке, но кодом **нигде не используются** (мёртвая дока). Дополнительный публичный метод `appendPoint(point)` — только у этого класса.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `tooltipFormat` | `fn(d) => html` | встроенный (`$` + `,.2f`) | ⚠️ сигнатура — одна точка, у Line `{date, points[]}` |
| `curve` | string | `'monotone'` | свой inline curveMap; `curveTension` не поддерживается ⚠️ |
| `area` | `false\|true\|number` | `true` (градиент) | ⚠️ number = opacity сплошной заливки; у Line отдельная `areaOpacity` |
| `areaColor` | string | `theme.accent` | ❓ недокументирована в шапке |
| `yLabelsOnly` | boolean | `true` | |
| `yTicks` | number | `5` | ⚠️ у Line дефолт 4 |
| `yTickFormat` | `fn(v) => string` | `'$' + ',.0f'` | ⚠️ доллар захардкожен; нет `yPrefix`/`ySuffix`/`yFormat`, как у Line |
| `xTickFormat` | `fn(date) => string` | `'%b'` | ❓ недокументирована в шапке; ⚠️ у Line `'%m/%d'` |
| `yTickValues` | number[] | `null` | ❓ недокументирована в шапке |
| `showGrid` | boolean | `true` | **новое в 0.9.8** |
| `showXAxis` | boolean | `true` | **новое в 0.9.8**; скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | **новое в 0.9.8**; скрытие схлопывает правое поле |
| `annotations` | array | `[]` | тот же формат, что у Line |
| `annotationLabelHeight` | number | `22` | ⚠️ формула margin.top отличается от Line: `Math.max(top ?? 16, reserve)` vs `top ?? Math.max(10, reserve)` |

---

## Overview

**Форма данных:** `setData(data, onBrush)` — `[{ date: Date, value: number }]`, без парсинга/валидации. ⚠️ Сигнатура с колбэком вторым аргументом уникальна для библиотеки. Не наследует `Chart`: нет заголовка/футера/легенды, `margin` захардкожен (`{6, 70, 16, 0}`), тема мержится спредом вместо `createTheme`. Дополнительный метод: `setBrush(extent)`.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `height` | number | `52` | собственная опция (не Chart); пример в шапке использует 56 |
| `color` | string | `theme.border` | цвет линии |
| `area` | `true\|number` | градиент | ❓ шапка обещает `false`, но ветки для `false` в коде нет — область рисуется всегда |
| `areaColor` | string | `theme.accent` | |
| `brushColor` | string | `theme.text` | обводка выделения + ручки |

❓ **К 1.0:** Overview выбивается из API (не-Chart, `setData` с колбэком, свой margin). Кандидат на пометку **internal** — он и так создаётся базовым Chart для опции `navigator`.

---

## Bar

**Форма данных:** `[{ label, value }]`; в time-series режиме — `[{ date, value }]` (автоопределение по `date`+`value` в первой строке).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `orientation` | `'vertical'\|'horizontal'` | `'vertical'` | |
| `animate` | boolean | `true` | анимация на первом рендере |
| `duration` | number (ms) | `500` | ⚠️ 650 у Line/DualAxes/Donut, 800 у Gauge |
| `stagger` | number (ms) | `0` | задержка по барам; ⚠️ есть только у Bar |
| `ease` | `'cubicOut'\|'cubicInOut'\|'linear'` | `'cubicOut'` | |
| `barColor` | string | `theme.accent` | |
| `barWidthRatio` | number | `0.72` (time-series) | доля ширины слота (backlog: `barWidth` в px) |
| `labelMaxLength` | number | — | обрезка подписи категории; полный текст в тултипе |
| `showValues` | boolean | `false` | подписи значений у концов баров (horizontal only) |
| `valueFormat` | fn | `,.0f` | формат подписей значений |
| `valueOffset` | number | `6` | |
| `valueInsideGap` | number | `42` | порог перекидывания подписи внутрь бара |
| `showGrid` | boolean | `true` | |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | 0.9.8: скрытие схлопывает боковое поле (какое — зависит от orientation) |
| `yTicks` / `yTickValues` | number / array | `4` / — | vertical/time-series |
| `xTicks` / `xTickValues` | number / array | `4`–`6` / — | horizontal/time-series |
| `yTickFormat` | fn | `.2s` | vertical |
| `yPrefix` / `ySuffix` | string | `''` | vertical |
| `xTickFormat` | fn | `.2s` / `'%b'` | horizontal / time-series |
| `tooltipFormat` | fn(d) => html | встроенный | ⚠️ сигнатура — одна точка |

---

## DualAxes

**Форма данных:** массив серий `[{ name?, axis?: 'y1'|'y2' (дефолт 'y1'), type?: 'line'|'bar' (дефолт 'line'), color?, values: [{ date, value }] }]`. `_normalizeData` дополнительно принимает недокументированные per-series `curve`, `area`, `areaOpacity`, `areaBaseline`, `strokeWidth` (дефолт 2). **Y1 — правая ось, Y2 — левая** (⚠️ против интуиции; сетка и нулевая линия привязаны к y2).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `xPad` | number | `8` | |
| `curve` | string | `'linear'` | ⚠️ у Line дефолт `'monotone'` |
| `curveTension` | number | `0` | ❓ не документирована в шапке |
| `animate` | boolean | `true` | |
| `duration` | number | `650` | |
| `ease` | string | `'cubicOut'` | |
| `y1Ticks` / `y2Ticks` | number | `4` | ❓ авто-домен всегда `.nice(4)` — опция на nice не влияет |
| `y1TickFormat` | fn | `,.2f` | ⚠️ у одноосных классов — `yTickFormat` |
| `y2TickFormat` | fn | `v≈0 ? '0' : '+.2f'` | ❓ знаковый формат — очень опинионированный дефолт |
| `xTickFormat` | fn | `'%m/%d'` | |
| `y1Domain` / `y2Domain` | [min,max] | auto | |
| `y1LabelsOnly` / `y2LabelsOnly` | boolean | `true` | |
| `showGrid` | boolean | `true` | ⚠️ сетка по шкале **y2** и `y2Ticks` |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showY1Axis` | boolean | `true` | ⚠️ вместо общего `showYAxis`. 0.9.8: правое поле схлопывается, когда выключены и `endLabels`, и нет `y1Title` |
| `showY2Axis` | boolean | `true` | 0.9.8: левое поле схлопывается, если нет `y2Title` |
| `endLabels` | boolean | `true` | |
| `endLabelsAxis` | `'y1'\|'y2'` | `'y1'` | |
| `y1Title` / `y2Title` | string | — | тримятся эллипсисом под margin оси |
| `axisTitleMaxLength` | number | — | |
| `barOpacity` | number | `0.35` | |
| `barWidthRatio` | number | `0.65` | ⚠️ у Bar (time-series) — `0.72` |
| `barGrouping` | `'overlap'\|'cluster'` | `'overlap'` | |
| `annotations` | array | `[]` | горизонтальные принимают `axis: 'y1'\|'y2'` |
| `annotationLabelHeight` | number | `22` | |
| `crosshair` | boolean | `true` | |
| `tooltipFormat` | fn({date, points}) => html | встроенный | |
| `area` | boolean | `false` | ❓ не документирована в шапке |
| `areaOpacity` | number | `0.12` | ❓ не документирована |
| `areaBaseline` | string | `'zero'` | ❓ не документирована |
| `strokeDash` | string | `null` | ❓ глобальный, не документирован |
| `markers` / `markerShape` / `markerSize` | — | `false` / `'circle'` / `4` | ❓ не документированы |

---

## Donut / Pie

**Форма данных:** `[{ label: string, value: number, color?: string }]`. `setData` отбрасывает нечисловые и **неположительные** value (`> 0`). Слайсы кейируются по `label` — дубликаты схлопываются. ❓ **Alias Pie сломан:** `index.js` — чистый ре-экспорт `Donut`; «Pie = Donut with innerRadius: 0» из README/шапки коду не соответствует — `new Pie(...)` без опций рисует donut.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `innerRadius` | number 0..1 | `0.58` | `0` ⇒ режим pie |
| `padAngle` | number (рад) | donut `0.018` / pie `0.008` | ⚠️ шапка заявляет только 0.018; ❓ применяется и в `d3.pie()`, и в `d3.arc()` — зазор фактически ~2× |
| `cornerRadius` | number px | donut `3` / pie `1` | ⚠️ шапка заявляет только 3 |
| `animate` | boolean | `true` | |
| `duration` | number | `650` | |
| `ease` | string | `'cubicOut'` | |
| `showLabels` | boolean | `false` | внешние подписи с выносками |
| `labelMinPct` | number | `0.04` | |
| `labelContent` | `'both'\|'label'\|'percent'` | `'both'` | ❓ не документирована в шапке |
| `showCenter` | boolean | `!isPie` | |
| `centerText` | string \| fn(data) => string | `valueFormat(total)` | ⚠️ у Gauge сигнатура позиционная `fn(value, max, min)` |
| `centerLabel` | string | `'Total'` | ⚠️ англ. строка зашита; у Gauge дефолт `null` |
| `valueFormat` | fn | `d3.format(',')` | ⚠️ у Gauge аналога нет |
| `percentFormat` | fn | `.1%` | |
| `tooltipFormat` | fn({label, value, percent, color}) => html | встроенный | ⚠️ своя сигнатура payload |

---

## Gauge

**Форма данных:** `number` либо `{ value, max?, min? }`. `max`/`min` из `setData` перекрывают опции; из опций читаются **только в конструкторе** — вернуться после `setData({max})` нельзя.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `min` / `max` | number | `0` / `100` | читаются только в конструкторе |
| `startAngle` / `endAngle` | number (рад) | `∓0.75π` | |
| `thickness` | number 0..1 | `0.18` | доля внешнего радиуса |
| `cornerRadius` | number px | `6` | |
| `color` | string | `theme.accent` | ⚠️ единичный vs палитра у остальных |
| `trackColor` | string | `theme.grid` | |
| `showCenter` | boolean | `true` | |
| `centerText` | string \| fn(value, max, min) => string | `.0%` | ⚠️ сигнатура позиционная, у Donut `fn(data)` |
| `centerLabel` | string | `null` | ⚠️ у Donut `'Total'` |
| `animate` | boolean | `true` | |
| `duration` | number | `800` | ⚠️ 650 у DualAxes/Donut/Line, 500 у Bar |
| `ease` | string | `'cubicOut'` | |
| `tooltipFormat` | fn({value, max, min, percent}) => html | встроенный (`.1%` захардкожен) | ⚠️ своя сигнатура; ❓ нет `valueFormat`/`percentFormat`, как у Donut |

---

## MultiChart

**Форма данных:** `.setData([d0, d1, ...])` — элементы раздаются детям по индексу; `null` пропускаются, не-массив молча игнорируется. Альтернатива: `charts[i].data` в дескрипторе. Публичное поле `.charts` — массив инстансов детей.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `columns` | number 1–4 | `2` | клампится |
| `mobileColumns` | number | `1` | при ширине контейнера ≤ `mobileBreakpoint` |
| `mobileBreakpoint` | number (px) | `480` | ширина **контейнера**, не окна |
| `chartHeight` | number (px) | `200` | высота ячейки → `height` детей |
| `gap` | number \| string | CSS `--space-lg` | число → px |
| `charts` | Array<descriptor> | `[]` | `{ type: 'Line'\|'Bar' (default 'Line'), title?, span?, data?, options?, mobileOptions? }` |
| `animate` | boolean | `true` | ⚠️ не документирована; только пробрасывается детям |

❓ **TYPE_MAP — только `Line` и `Bar`;** неизвестный `type` молча становится `Line` — ни ошибки, ни ворнинга. Другие типы в композицию не встроить.
❓ Своего SVG и `ariaLabel` у контейнера нет — доступное имя композиции не задать.

---

## Map

**Форма данных:** `.setData([{ id, value?, color?, label? }])` — `id` → `String`, матчится с `feature.id` → `feature.properties[idField]` → фолбэки `iso_a2/iso_a3/ISO_A2/ISO_A3`. **GeoJSON передаётся через опции, не setData:** `geoData` → `topoData` → `geoUrl` → `topoUrl`; если ничего не задано — карта **молча** не рендерится.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `geoData` / `topoData` | object | — | inline GeoJSON (FeatureCollection или Feature) / TopoJSON |
| `geoUrl` / `topoUrl` | string | — | fetch через `d3.json()` |
| `topoObject` | string | первый ключ `objects` | ⚠️ док говорит «required», код фолбэчит |
| `projection` | string | `'naturalEarth1'` | `mercator\|naturalEarth1\|equalEarth\|orthographic`; ❓ `'identity'` работает, но не документирован |
| `reflectY` | boolean | `false` | ❓ не документирована; только с `projection: 'identity'` |
| `fitPadding` | number (px) | `20` | |
| `defaultFill` | color | `theme.map.unmatchedFill` → … | регионы без данных |
| `matchFill` | color | `theme.map.matchFill` → `theme.accent` | |
| `oceanColor` | color | `'transparent'` | |
| `borderColor` / `borderWidth` | color / number | theme / `0.5` | non-scaling-stroke |
| `hoverFill` | color | авто (16% к белому) | только для регионов с данными |
| `zoom` | boolean | `false` | scroll-zoom + pan |
| `zoomExtent` | `[min, max]` | `[0.8, 12]` | |
| `idField` | string | `'id'` | |
| `featureFilter` | fn(feature) => boolean | — | |
| `clipExtent` | `[[minLon,minLat],[maxLon,maxLat]]` | — | |
| `tooltipFormat` | fn({ feature, item }) => html | встроенный | ⚠️ своя сигнатура payload |
| `rotate` | `[λ, φ, γ]` | — | |

Особенности: `height` дефолт 400, `margin` — `{0,0,0,0}`. ❓ Ошибка загрузки geo — только `console.error`, колбэка/события нет.

---

## Адаптеры

Из `adapters/index.js`. Контракт: `(data|url, mapping[, options]) → [{ …mappedFields }]`.

| Функция | Сигнатура | Заметки |
|---------|-----------|---------|
| `fromArray` | `(data, mapping)` | синхронная; `mapping` обязателен |
| `fromJson` | `(url, mapping)` → Promise | принимает массив или `{data}`/значения объекта |
| `fromCsv` | `(url, mapping)` → Promise | через `d3.csv` |
| `fromApi` | `(url, mapping, {headers, transform})` → Promise | бросает на `!res.ok` |

`mapping`: `{ field: row => value }` или `{ field: 'sourceKey' }`. Строки фильтруются: невалидная `date` или non-finite `value` отбрасываются.

**Найдено при тестировании (B1):** фильтр `value` пропускал `NaN` (`!NaN === true`). Исправлено — см. CHANGELOG `[Unreleased]`. Покрыто тестом `test/adapters.test.js`.

---

## Открытые вопросы к заморозке

Решения — проход в 0.9.9, после боевого тестирования. Сгруппировано по весу.

### Кандидаты в блокеры (несоответствие обещанного и фактического)

- ❓ **`export * as d3` — 46 KB gzip (37% бандла) ради шести функций** (замер 2026-07-03, см. роадмап). Публичный ре-экспорт всего d3 из `index.js` выключает tree-shaking: бандл 124 KB gz, без ре-экспорта был бы 78.5 KB. При этом собственные примеры используют из `RareCharts.d3` только `format` (37×), `timeFormat` (22×), `sum`/`min`/`max`/`timeMonth` (по 1–2×). Варианты: (а) оставить как есть — удобная батарейка, но плата вечная; (б) сузить до curated-набора (`format`, `timeFormat`, …) — breaking change, решать **до** заморозки; (в) убрать совсем. Если сузим/уберём — Map (d3-geo + topojson, ~12 KB gz) станет осмысленным кандидатом в отдельный бандл `rare-charts-maps` в 1.x (аддитивно, после 1.0).

- ❓ **Pie-alias не задаёт `innerRadius: 0`** (`index.js` — чистый ре-экспорт Donut). README и шапка Donut обещают pie — `new Pie()` рисует donut. Обёртка или правка доков — до заморозки.
- ❓ **Per-series `strokeDash` в DualAxes мёртв:** `_renderLines` читает, `_normalizeData` не копирует. Тот же баг, что был исправлен в Line в v0.9.6.
- ❓ **TimeSeries.setData не нормализует данные** (нет `parseDate`/фильтрации) — строковые даты молча ломают график. Выровнять с Line или задокументировать требование `Date`.
- ❓ **Мёртвая дока OHLCV:** поля `open/high/low/volume` в шапке TimeSeries не используются кодом. Убрать из доки (candlestick — тема 1+).
- ❓ **Фиксированные id градиентов** `#rc-ts-grad` / `#rc-ov-grad` — при нескольких инстансах на странице возможен перехват чужого градиента. Clip-path при этом использует случайный id — непоследовательно.
- ❓ **Overview как публичный класс** — не-Chart, `setData(data, onBrush)`, свой margin. Кандидат на пометку internal (создаётся автоматически опцией `navigator`).
- ⚠️ **Частичный `margin` у Map/MultiChart** ломает их нулевые дефолты: пользовательский `margin: { top: 10 }` замещает объект целиком, Chart.js доливает `right: 70` вместо нуля класса.

### Унификация имён и дефолтов (⚠️ из таблиц выше, сводно)

- **Моторный блок:** `duration` — 650 (Line/DualAxes/Donut) vs 500 (Bar) vs 800 (Gauge); `stagger` только у Bar; у TimeSeries/Overview блока нет вообще (опции молча игнорируются).
- **`tooltipFormat` — 5+ несовместимых сигнатур:** `{date, points[]}` (Line/DualAxes) vs `(d)` (TimeSeries/Bar) vs `{label, value, percent, color}` (Donut) vs `{value, max, min, percent}` (Gauge) vs `{feature, item}` (Map).
- **Три семантики `area`:** Line — boolean + `areaOpacity`/`areaBaseline`; TimeSeries — `false|true|number`; Overview — `false` задокументирован, но не реализован.
- **Дефолты форматтеров/тиков:** `yTicks` 4 vs 5; `xTickFormat` `'%m/%d'` vs `'%b'`; `yTickFormat` TimeSeries хардкодит `$`; `curve` `'monotone'` (Line/TS) vs `'linear'` (DualAxes); `strokeWidth` per-series 2 (Line) vs `theme.strokeWidth ?? 1.5` (TS); `barWidthRatio` 0.72 (Bar) vs 0.65 (DualAxes).
- **`centerText`/`centerLabel`:** сигнатуры и дефолты Donut vs Gauge расходятся; у Gauge нет `valueFormat`/`percentFormat`.
- **`annotationLabelHeight` + `margin.top`:** формулы Line и TimeSeries различаются при явном `margin.top`.
- **`showY1Axis`/`showY2Axis`** vs `showYAxis`; Y1 = правая, Y2 = левая — контринтуитивно, зафиксировать в доках явно.
- **`viewSteps`** — недокументированный алиас `timeframes`: депрекейт или документировать.

### Недокументированные опции — ✅ закрыто 2026-07-03 (перед боевым тестом)

Выяснилось: сайт-дока была полнее шапок исходников — большинство пунктов ниже уже были в таблицах на сайте, «недокументированность» касалась шапок-комментариев в `src/`. Сделано:
- **Шапки исходников** дополнены: Line (`yTickValues`, `xTicks`, `yAxisPosition`, глобальный `strokeDash`, `markers`/`markerShape`/`markerSize`, `seriesName`/`lineColor`), TimeSeries (`areaColor`, `yTickFormat`/`xTickFormat`/`yTickValues`, уточнена семантика `area`), DualAxes (`curveTension`, `area`/`areaOpacity`/`areaBaseline`, `strokeDash`, `markers`×3), Donut (`labelContent`, фактические pie-дефолты), MultiChart (`animate`, `note`), Map (`identity`, `reflectY`, исправлена ложь про «required» `topoObject`).
- **Сайт-дока** дополнена реальными дырами: `defaultView` (не был описан нигде — добавлен на 4 страницы), `xTicks` (Line), `animate` (MultiChart), `reflectY` (Map).

**Осознанно НЕ документированы** (ждут решений 0.9.9): `viewSteps` (алиас `timeframes` — кандидат на депрекейт), per-series `strokeDash` в DualAxes (мёртв — см. блокеры), опции Overview (кандидат в internal).

### Мелочи и поведение

- ✅ **Bar: отрицательные значения в категориальном режиме** — домен был жёстко `[0, max]`, негативный бар получал отрицательную высоту и молча не рисовался (time-series режим негативы умел). **Исправлено 2026-07-06** (обе ориентации + подписи значений), покрыто `test/bar-negatives.test.js`. Найдено гэп-анализом «терминал».

- ⚠️ **Donut на нулевых данных:** `total = 0` → `NaN%` в подписи/тултипе. Подставлять `0%`. Найдено smoke-тестом.
- ❓ **Donut: двойное применение `padAngle`** (pie layout + arc) — фактический зазор ~2× от заявленного.
- ⚠️ **Donut: слайсы кейируются по `label`** — дубликаты ломают join.
- ⚠️ **Gauge: `min`/`max` из опций** читаются только в конструкторе.
- ❓ **DualAxes: `.nice(4)` захардкожен** — `y1Ticks`/`y2Ticks` не влияют на округление домена.
- ❓ **MultiChart: дефолты margin захардкожены копией** в `_applyBreakpointOptions` — разъедутся молча при смене базовых.
- ❓ **Map: молчаливые отказы** (нет geo-опций → тихий return; ошибка загрузки → только console.error).
- ❓ **Часовые пояса в таймфреймах** (`resolveTimeframeExtent`): local vs UTC, `YTD` нормализуется к полуночи, относительные окна — нет. Решить единообразно к 1.0. Найдено при написании тестов (B1).

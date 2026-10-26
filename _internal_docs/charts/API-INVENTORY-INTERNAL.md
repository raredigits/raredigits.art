# RareCharts — Public API Inventory (Internal)

> **Непубличный файл** (см. `.eleventyignore`). Рабочая поверхность для аудита API перед заморозкой 1.0 — пункт **N2** в [ROADMAP-INTERNAL](ROADMAP-INTERNAL.md).

**Цель:** перед 1.0 пройти по всем публичным классам и свести воедино имена опций и форму данных, чтобы (а) проверить консистентность между типами и (б) зафиксировать контракт, который замораживаем по semver.

**Как заполнять:** у каждого класса в `assets/charts/src/charts/*.js` в шапке есть блок-комментарий с перечнем опций + деструктуризация `this.options.*` в `render`. Источник истины по форме данных — `.setData()` и `_normalizeData`.

**Статус:** ✅ заполнено по всем классам (2026-07-03). Решения по ⚠️/❓ — отдельный проход в 0.9.9, после боевого тестирования. Строки, устаревшие после 0.9.8_6 и шагов 1–5 уборки, сверены с кодом `2fad452` и поправлены 2026-10-22 (O-04, шаг 6 [AUDIT-INTERNAL](AUDIT-INTERNAL.md)); закрытые пункты помечены ✅, открытые — ссылкой на ID аудита.

**Условные обозначения:** ✅ согласовано · ⚠️ расходится между классами (кандидат на унификацию) · ❓ под вопрос к 1.0.

---

## Сводка по типам

| Класс | Файл | Форма данных | Инвентарь |
|-------|------|--------------|-----------|
| Line | `charts/Line.js` | `[{ date, value }]` / series / band | ✅ |
| TimeSeries | `charts/TimeSeries.js` | `[{ date, value, ...extra }]` — дата Date/ISO/epoch, вход копируется и сортируется (C-06); extra-поля (open/high/low/volume) — в `tooltipFormat` | ✅ |
| Overview | `charts/Overview.js` | `[{ date, value }]` + `onBrush` — дата Date/ISO/epoch: строки копируются, парсятся и сортируются, нечитаемые отбрасываются (K-04, шаг 7) | навигатор (`navigator`) всех временных графиков: Line, Bar (даты), DualAxes, TimeSeries, Graph flow, MapFlow; и автономный публичный класс — `/charts/line/time-series/#overview-standalone-navigator` (K-04, шаг 7) |
| Bar | `charts/Bar.js` | `[{ label, value, color? }]`, time-series `[{ date, value, color? }]` или stacked-серии `[{ name, values: [{ label, value }] }]` | ✅ |
| HierarchicalBar | `charts/HierarchicalBar.js` | корень `{ label, value?, color?, children? }` или лес (`core/hierarchy.js`) | ✅ · 0.9.8_2 (раздел «Hierarchy» ниже) |
| DualAxes | `charts/DualAxes.js` | серии `{ name, axis, type, values }` | ✅ |
| Donut / Pie | `charts/Donut.js` | `[{ label, value, color?, id? }]` или дерево (drill-down) | ✅ · Pie — подкласс с `innerRadius: 0` (C-05, 0.9.8_6) |
| Gauge | `charts/Gauge.js` | `number` или `{ value, max?, min? }` | ✅ |
| Graph | `charts/Graph.js` | `{ nodes, links }` (+ `view: 'flow'` с 0.9.8_3, этап 2 с 0.9.8_6) | **experimental — вне 1.0 (B3)** |
| Sankey | `charts/Sankey.js` | `{ nodes?, links: [{ source, target, value }] }` | **experimental — вне 1.0** · 0.9.8_3 |
| MultiChart | `charts/MultiChart.js` | контейнер дочерних графиков | ✅ |
| Map | `charts/Map.js` | `[{ id, value?, color?, label? }]` + geo через опции | ✅ |
| MapFlow | `charts/MapFlow.js` (extends Map) | `{ nodes: [{ id, coords? \| country? }], links }` + geo через опции Map | **experimental — вне 1.0** · 0.9.8_6 |
| Адаптеры | `adapters/index.js` | `fromJson/fromCsv/fromApi/fromArray(data, mapping)` | ✅ |

**Прочие экспорты** (`index.js`, всего 28 имён — `test/exports.test.js`): `VERSION`, `DOCS_URL`; темы `defaultTheme`, `darkTheme`, `createTheme(overrides, base)`; `defaultTimeframes` (`['1M','3M','6M','1Y','2Y','ALL']` — набор для `timeframes: true`); адаптеры (строка выше); `linkPresets` — `{ personal, knowledge, org, tech, causal }`, каждый `{ [type]: { color, dash, label } }` (6 / 7 / 6 / 5 / 5 типов; ре-экспорт из `Graph.js`, файл `charts/presets/linkPresets.js`); `memorySource(data)` → `{ neighbors(id, { depth = 1, types = null }), paths(a, b, { k = 3 }), aggregates() }`, все async, пути — до `k` рёберно-непересекающихся кратчайших по неориентированной проекции, неизвестный конец → `{ paths: [], nodes: [], links: [] }`; `generateMockPrices(days = 365, startPrice = 150)` → `[{ date, value, open, high, low, volume }]` (календарные дни назад от сегодня без выходных, `Math.random` без сида) — демо-хелпер **вне гарантии стабильности**: экспорт остаётся, README, `/charts/installation/` и шапка в `index.js` так и говорят (K-04, шаг 7); `d3` — документированное подмножество, замороженный объект из 28 функций: `format`, `formatPrefix`, `timeFormat`, `timeParse`, `utcFormat`, `utcParse`, `sum`, `min`, `max`, `extent`, `mean`, `range`, `scaleLinear`, `scaleTime`, `scaleLog`, `scaleOrdinal`, `color`, `rgb`, `hsl`, `interpolate`, `timeDay`/`timeWeek`/`timeMonth`/`timeYear`, `utcDay`/`utcWeek`/`utcMonth`/`utcYear` — только из модулей, которые бандл и так несёт (K-13, шаг 7; README, `/charts/installation/`). Статусы классов: Graph, Sankey, MapFlow — experimental; Overview — публичный класс (K-04, шаг 7; `/charts/line/time-series/#overview-standalone-navigator`): шаблон баннера `new RareCharts.<Type>(selector, options).setData(data)` к нему не применим (`new Overview(el, { height, … }).setData(data, onBrush, { extent })` + `setBrush(extent)`, без шапки и подвала).

---

## Общие опции (базовый `Chart`)

Из `core/Chart.js` — применимы ко всем типам. **Кандидаты на «общий контракт», который точно фиксируем в 1.0.**

| Опция | Тип | Назначение |
|-------|-----|------------|
| `title` | string | заголовок; элемент не поддерживается — пишется через `textContent` (вышло бы `[object HTMLElement]`) |
| `subtitle` | string | подзаголовок; то же, что у `title` |
| `legend` | array \| string \| HTMLElement | легенда; элемент массива `{ label \| name, color?, type?: 'bar' \| 'dot' \| 'band' \| 'dashed', dash?: boolean }`: `'bar'`/`'dot'` — круглая точка, `'band'` — квадрат, `'dashed'` или `dash: true` — пунктир, иначе сплошная черта; `color` по умолчанию `theme.accent`; строка — `innerHTML` |
| `legendPosition` | `'right'` \| — | ❓ легенда правой колонкой вместо шапки; влияет на `get width` — **не была в инвентаре**; с навигатором `controls` стоят между навигатором и подвалом (K-19, шаг 7a) |
| `source` | string \| `{text,href}` \| array \| HTMLElement | атрибуция (v0.9.7) |
| `note` | string \| HTMLElement | editorial-note в футере (v0.9.7) |
| `theme` | object | тема; тултип — раздел «Тема: `theme.tooltip`» ниже |
| `margin` | `{top,right,bottom,left}` | поля; классы задают или считают свои. Не заданная сторона частичного `margin` = 0 (C-17, шаг 7a; раньше база доливала `{8, 70, 16, 0}`); Donut, Pie, Gauge, Sankey и Graph `margin` не используют |
| `height` | number | высота инстанса; график держит не меньше 80 px — если шапка, кнопки и подвал не помещаются, карточка растёт на разницу и возвращается к `height` (C-32, шаг 7a) |
| `ariaLabel` | string | явный accessible-name (`role="img"`); без него — строковые `title` и `subtitle` через « — », иначе «Chart». ❓ читается не в Chart.js, а в `applySvgA11y()` — чарт, забывший её вызвать, молча игнорирует |
| `timeframes` | `true` \| Array<string \| { key, label?, range? }> | кнопки диапазонов; `true` → `['1M','3M','6M','1Y','2Y','ALL']`; ключи `ALL`/`MAX`, `YTD`, `nD`/`nW`/`nM`/`nY` (регистр не важен), `range: [start, end]` клампится к данным — **не была в инвентаре**. Активная кнопка при совпадающих окнах — выбранный шаг (клик, `setTimeframe()`, `defaultTimeframe`, пока держится его вид), иначе ALL/MAX при виде на весь размах, иначе первый совпавший (C-34, шаг 7a) |
| `viewSteps` | — | ⚠️ устаревший алиас `timeframes` (K-04, шаг 7): работает (`timeframes` важнее), `console.warn` «RareCharts: viewSteps is deprecated — use timeframes» — один раз на график; удаление — 0.9.9; помечен устаревшим на `/charts/line/time-series/` и в README |
| `navigator` | boolean \| object | мини-обзор (Overview) под графиком — **не была в инвентаре** |
| `defaultView` | `[from, to]` | начальный видимый диапазон — **не была в инвентаре** |
| `defaultTimeframe` | string \| { key, label?, range } | начальный диапазон: ключ из `timeframes`, включая свои `{ key, range }` (T-02, 0.9.8_6); применяется, пока явный вид не задан — **не была в инвентаре** |

**Шаг 7a, общее:** `whenReady()` у всех графиков — промис, резолвится графиком, когда нарисовано загружаемое: Graph — запросы и раскладка, Map/MapFlow — геометрия (и при ошибке загрузки), остальные — сразу (K-12). `window.RareChartsConfig = { injectStyles: false }` до бандла — без внедрённого `<style>` для строгого CSP (K-18). После `destroy()` `onViewChange`, `onScaleChange` и `onBrush` отдельного `Overview` не вызываются (`Chart._emit`, C-33). Шапка складывается по ширине карточки — `@container rc-chart (max-width: 460px)` вместо `@media (max-width: 768px)` (K-17). Живые движения навигатора — один рендер за кадр, конец жеста — сразу (K-16, частично).

**Не контракт** (не документируются, не замораживаются): `render()` — внутренняя перерисовка, снаружи — `setData`/`setView`/`setYScale`; после `destroy()` — no-op. У Graph `render()` и унаследованный `onScaleChange()` (без `setYScale` событие не наступает) — тоже внутренние. Состояние инстанса: геттеры `width`/`height`, поля `container`, `options`, `theme`, `margin`, `svg`; у TimeSeries `xScale`, `yScale`, `clipId` (только запись, X-06).

---

## Тема: `theme.tooltip` (B-03 · 0.9.8_6)

Ревизия B-03 вместе с C-23, D-03 и тултипной частью C-22/K-14. Встроенный тултип — один элемент `Tooltip` на график (`core/Tooltip.js`) внутри `.rc-chart`; HTML строк собирают фрагменты `core/html.js`. Проверено в светлой и тёмной теме и в варианте «светлый график + тёмный тултип» (Chrome: вычисленные стили каждой строки совпадают с 0.9.8_5, кроме D1–D3 и цвета ссылок ниже).

| Свойство | Light / dark | Если `null` | Потребители |
|---|---|---|---|
| `tooltip.bg` | `#ffffff` / `#1a1a1a` | `theme.bg` → CSS `#ffffff` | `--rc-tooltip-bg` → `.rc-tooltip { background }` |
| `tooltip.border` | `#e0e0e0` / `#2e2e2e` | `theme.border` → CSS `#e0e0e0` | `--rc-tooltip-border` → `border: 1px solid …` |
| `tooltip.text` | `#000000` / `#e8e8e8` | `theme.text` → CSS `#000000` | `--rc-tooltip-text` → `color`; обычные строки, имена, заголовки и ссылки наследуют |
| `tooltip.muted` | `#666666` / `#888888` | `theme.muted` → CSS `#666666` | `--rc-tooltip-muted` → `.rc-tooltip-muted`, `.rc-tooltip-sub`, заголовок-дата. До 0.9.8_6 не читался нигде (строки брали `theme.muted`); light-дефолт `#888888` → `#666666` = `theme.muted`, вид тот же |
| `tooltip.shadow` | `0 2px 8px rgba(0,0,0,0.10)` / `0 2px 12px rgba(0,0,0,0.55)` | `none` | `--rc-tooltip-shadow` → `box-shadow` |
| `tooltip.header.text` (новое) | `null` / `null` | цвет роли: дата — `tooltip.muted`, подпись и заголовок — `tooltip.text` | `--rc-tooltip-header-text` → `.rc-tooltip-header`; инлайн-цвет данных (подпись сектора Donut) сильнее |
| `tooltip.header.bg` (новое) | `null` / `null` | без плашки | `--rc-tooltip-header-bg` + класс `.rc-tooltip--header-band` на тултипе: заголовок полосой во всю ширину внутри рамки |
| `numericFont` | `var(--rc-font-family-numeric, …)` | `theme.font` → CSS `var(--rc-font-family-numeric)` | `--rc-tooltip-font` → `font-family` тултипа; единственный читаемый шрифтовой токен темы |
| `font` | `var(--rc-font-family, …)` | — | только запасной для `numericFont` |
| `fontSize` | `var(--rc-font-size-sm, 14px)` | — | ❓ **не используется** (последний читатель — дата TimeSeries — убран); удаление в 1.0 |

**Заголовок** — строка, называющая наведённое, во всех встроенных тултипах; один класс `.rc-tooltip-header`, роли сохраняют вид 0.9.8_5:
- дата + `.rc-tooltip-muted`: Crosshair (Line, DualAxes), TimeSeries;
- подпись: Bar (и дата в режиме времени), stacked Bar, полная подпись оси Bar, HierarchicalBar, Donut (в цвете сектора);
- заголовок + `.rc-tooltip-title` (bold): Map, MapFlow (регион, место, поток), Sankey, Graph (все виды).

У Gauge заголовка нет.

**Граница JS / CSS (контракт):**
- JS-тема, на график, только цвета: `tooltip.bg/border/text/muted/shadow/header.*` и `numericFont`. `Tooltip.js` публикует их на элементе тултипа как `--rc-tooltip-*` (CSSOM `setProperty`; `null` или `''` → не задаётся → фолбэк CSS). Чистка в `destroy` не нужна.
- CSS (`rare-charts.css`), на страницу: размер 13px, размеры строк (10/11/14px), жирность, отступы, `max-width`, letter-spacing. Фолбэки `var()` равны `defaultTheme.tooltip` (тест `charts-css` держит их в шаге). `line-height` не задаётся — от страницы (K-15).
- Инлайн в HTML — только цвета данных: строки серий Crosshair, подпись сектора Donut, цвет категории связи (`kind`), значение TimeSeries (`accent`).

**Приоритет:** правило страницы с селектором сильнее `.rc-tooltip` (`.rc-chart .rc-tooltip`) > тема — раньше инлайн-стили побеждали всегда; простой `.rc-tooltip { … }` проигрывает по порядку (библиотека вставляет стиль последним, как с `.rc-chart`). Внутри темы: `tooltip.X` → (null) токен графика → фолбэк CSS. Цвет заголовка: инлайн-цвет данных > `header.text` > цвет роли.

**Классы строк** — опциональные хуки и для `tooltipFormat`; контракт `tooltipFormat` / `linkTooltipFormat` не изменён (сигнатуры — K-09, вне B-03):

| Класс | Вид |
|---|---|
| `.rc-tooltip-header` | заголовок (см. выше) |
| `.rc-tooltip-title` | bold, отступ снизу 2px (у последней строки — 0) |
| `.rc-tooltip-muted` | `tooltip.muted` |
| `.rc-tooltip-sub` | 11px, `tooltip.muted` |
| `.rc-tooltip-small` | 11px (список участников в flow, источники) |
| `.rc-tooltip-kind` | 10px, uppercase, 0.06em; без цвета данных — `tooltip.muted` |
| `.rc-tooltip-section` | отступ сверху 4px |
| `.rc-tooltip-body` | обёртка relation-тултипов: `max-width: 280px`, длинный текст переносится внутри (C-29) |
| `.rc-tooltip-value` | значение TimeSeries: 14px bold |
| `.rc-tooltip--header-band` | модификатор на тултипе при `header.bg` |

Ссылки в тултипе — цвет текста тултипа, подчёркнуты, при hover тоже (раньше только в pinned; при hover были синими браузерными).

**Фрагменты `core/html.js` (D-03, внутренние, не экспортируются):** `tipHeader(html, { color, muted, title })`, `tipTitle`, `tipMuted(html, tag)`, `tipSub(html, { section, tag })`, `tipKind(html, color, tag)`, `tipBody`, `tipSources(sources)`, `linkTooltipHtml({ from, to, ties: [{ link, kind }] })` — один тултип связи для Graph (все виды) и MapFlow.

**`createTheme(overrides, base = defaultTheme)`** — второй аргумент добавлен, обратно совместимо: `createTheme({ tooltip: { bg } }, darkTheme)` сохраняет остальные тёмные значения. Глубокое слияние: `tooltip`, `tooltip.header`, `map`; не-объектный `header` игнорируется. `{ ...darkTheme, tooltip: { … } }` по-прежнему сливается со светлыми дефолтами: опция `theme` графика — это `createTheme(theme)`.

**Изменения вида (D1–D3, согласованы владельцем):** D1 — дата TimeSeries 14px / отступ 4px → 13px / 0, как у Crosshair (формат даты не менялся); D2 — тултип потока MapFlow принял раскладку связи Graph (`linkTooltipHtml`); D3 — группа узла и счётчик `· n` в Graph в стиле категории (uppercase, 0.06em), как в flow; обёртки relation-тултипов 260/300 → 280px; `+N more` 10px / mt 6 → 11px / mt 4.

---

## Line

**Форма данных:** три режима. (1) Одиночная серия: `[{ date: Date|string|number, value: number }, ...]` — dates через `parseDate`, нечисловые value отбрасываются; имя/цвет серии из опций `seriesName`/`lineColor`. (2) Мульти-серии: `[{ name?, color?, values: [{ date, value }] }, ...]`. (3) Band-серия: `{ name?, type: 'band', color?, fillOpacity?, values: [{ date, lower, upper }] }` — позади линий, вне end labels/маркеров (в тултипе crosshair — диапазон `lower – upper`, без точки); автоопределяется по `lower`/`upper` в первой точке; `fillOpacity` по умолчанию = `areaOpacity` серии, затем графика (`0.12`). Per-series overrides: `curve`, `strokeWidth` (дефолт `theme.strokeWidth`, 2 — с 0.9.8_6, C-22), `strokeDash`, `area`, `areaOpacity`, `areaBaseline`, `markers`, `markerShape`, `markerSize`, `markerFill`, `markerStroke` (0.9.8_6, C-03).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `animate` | boolean | `true` | один раз на экземпляр; рендер посреди входа продолжает рисование с уже нарисованной доли (C-16, шаг 7a). ⚠️ В TimeSeries моторного блока нет вообще |
| `duration` | number (ms) | `650` | через `motionDuration()` |
| `ease` | `'cubicOut'\|'cubicInOut'\|'linear'` | `'cubicOut'` | |
| `yScale` | `'linear'\|'log'` | `'linear'` | 0.9.8_4. Log: тики по степеням 10 (→ 1-2-5 → линейные), отступ множителем (`logPaddedDomain`), значения ≤ 0 пропускаются с одним warn на `setData`. Метод `setYScale(type, { silent })` — перерисовка, chainable, событие `onScaleChange`. С 0.9.8_5 то же на TimeSeries (`yScale`) и DualAxes (`y1Scale`/`y2Scale`) |
| `scaleToggle` | `boolean\|object` | `false` | 0.9.8_5, общий для Line/TimeSeries/DualAxes (`Chart.js`): одна кнопка Lin/Log в шапке справа над подписями оси Y, на уровне таймфреймов, которые остаются на месте (абсолютно в 60px отступа `.rc-chart-range-row--scale`; без таймфреймов — `--scale-only`; закраска по диагонали); подпись — текущая шкала, клик переключает; `{ labels: { linear, log } }`. `onScaleChange(fn)` → `{ scale, axis: 'y' }` |
| `yTicks` | number | `4` | ориентир, не квота: с 0.9.8_4 линейные тики `linearTickValues` (d3 1-2-5) внутри отбитого диапазона, ось не уходит за данные. ⚠️ в TimeSeries дефолт 5 |
| `yTickValues` | number[] | авто (`linearTickValues` / `logTickValues`) | явные тики могут расширить домен |
| `yTickFormat` | `fn(value) => string` | авто: по шагу тиков (`,~f` ниже 1000, `~s` с одним префиксом на ось от 1000, ноль — `0`) / `+.2%` | ✅ C-30 (шаг 7a): подписи точные, без дублей соседних тиков (было `.2s`: «100 110 110 120 120», E-02); подписи концов и `fmt` тултипа — 3 значащие (`.3~r` / `.3~s`); лог — `.3~s`; явный формат форматирует все три |
| `xTickFormat` | `fn(date) => string` | `'%m/%d'` | в TimeSeries дефолт — по размаху вида (C-31) |
| `xTicks` | number | `6` | ✅ в шапке и доках; максимум — подписи прореживаются вдвое, пока налезают; с дефолтным `xTickFormat` — не больше числа целых дней окна (E-03, 0.9.8_6) |
| `yFormat` | `'auto'\|'percent'\|'number'` | `'auto'` | `'auto'` → percent при `absMax <= 1` |
| `zeroEpsilon` | number | `1e-6` | |
| `yPrefix` / `ySuffix` | string | `''` | |
| `yLabelsOnly` | boolean | `true` | |
| `yAxisPosition` | `'right'\|'left'` | `'right'` | ✅ в шапке и доках; `'left'` переносит 64-px жёлоб влево; правое поле при включённых `endLabels` — 64 px под подписи последних значений, при `endLabels: false` — 0 (0.9.8_6) |
| `showGrid` | boolean | `true` | |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | 0.9.8: скрытие схлопывает боковое поле, когда `endLabels` тоже выключены (общий gutter) |
| `endLabels` | boolean | `true` | делит правое поле с осью Y |
| `crosshair` | boolean | `true` | ✅ с 0.9.8_6 и у TimeSeries (`crosshair: false` — без линий и тултипа) |
| `tooltipFormat` | `fn({ date, points }) => html` | встроенный | точка линии `{ name, series, axis, type: 'line', color, date, value, fmt }`, бэнда `{ name, series, type: 'band', color, date, lower, upper, fmt }`; `date` — дата первой точки; серии вне своего диапазона дат не входят (`core/Crosshair.js`). ✅ K-09 (шаг 7): payload — объект, ролевые поля на нём (`date`; у точки `series` = `name`) — `/charts/settings/#formatter-arguments` |
| `annotations` | array | `[]` | point / range / hPoint / hRange; горизонтальные вне Y-домена пропускаются, полосы обрезаются по краю графика (renderAnnotations, v0.9.8_6) |
| `annotationLabelHeight` | number | `22` | резерв сверху только при наличии аннотаций |
| `curve` | string | `'monotone'` | |
| `curveTension` | number | `0` | для `'cardinal'`. ⚠️ TimeSeries tension не поддерживает |
| `area` | boolean | `false` | ⚠️ в TimeSeries `area` — `false\|true\|number`, дефолт true |
| `areaOpacity` | number | `0.12` | |
| `areaBaseline` | `'zero'\|'min'\|number` | `'zero'` | |
| `strokeDash` | string\|array | `null` | ✅ в шапке и доках (глобальный и per-series): `'solid'`/`'dashed'`/`'dotted'`/`'dashDot'`/`'longDash'`, строка dash-array или `number[]` |
| `markers` | boolean | `false` | ✅ в шапке и доках |
| `markerShape` | string | `'circle'` | ✅ в шапке и доках |
| `markerSize` | number | `theme.markerSize` (4) | ✅ в шапке и доках; радиус (у прочих форм — половина размера); fallback темы — с 0.9.8_6 (C-22) |
| `seriesName` | string | `'Series'` | ✅ в шапке и доках; только одиночная серия |
| `lineColor` | string | `theme.accent` | ✅ в шапке и доках; только одиночная серия |

---

## TimeSeries

**Форма данных:** `[{ date, value, ...extra }]` — `setData` копирует, парсит (`parseDate`) и сортирует вход, строки с нечитаемой датой/значением отбрасывает (C-06, 0.9.8_6); `appendPoint` не мутирует массив вызывающего. Рисуется только `value`, прочие поля (open/high/low/volume…) доходят до `tooltipFormat(d)` — так и в шапке. Дополнительный метод `appendPoint(point)` — только у этого класса.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `tooltipFormat` | `fn(d, info) => html` | встроенный (`$` + `,.2f`) | ✅ K-09 (шаг 7): строка первым аргументом, как было; вторым — ролевые поля `{ date, value, color }` (`color` — `theme.accent`) |
| `curve` | string | `'monotone'` | свой inline curveMap; `curveTension` не поддерживается ⚠️ |
| `area` | `false\|true\|number` | `true` (градиент) | ⚠️ number = opacity сплошной заливки; у Line отдельная `areaOpacity` |
| `areaColor` | string | `theme.accent` | ✅ в шапке и доках |
| `yLabelsOnly` | boolean | `true` | |
| `yScale` / `scaleToggle` | `'linear'\|'log'` / `boolean\|object` | `'linear'` / `false` | 0.9.8_5. Как у Line: `setYScale(type, { silent })`, `onScaleChange`; явные `yTickValues` на логе — только > 0 |
| `yTicks` | number | `5` | ⚠️ у Line дефолт 4 |
| `yTickFormat` | `fn(v) => string` | `'$' + ',.0f'` | ⚠️ доллар захардкожен; нет `yPrefix`/`ySuffix`/`yFormat`, как у Line |
| `xTickFormat` | `fn(date) => string` | по размаху вида: ≤ 36 ч `%H:%M` (тик в полночь — `%b %d`), ≤ 92 дн. `%b %d` (не больше тика на день), ≤ 366 дн. `%b`, ≤ 5 лет `%b '%y`, дальше `%Y` | ✅ C-31 (шаг 7a; было `'%b'` на любом масштабе); явный формат побеждает; ⚠️ у Line `'%m/%d'` |
| `yTickValues` | number[] | `null` | ✅ в шапке и доках. Лог: только > 0, расширяют домен. На линейной шкале тоже расширяют домен, как у Line (0.9.8_6) |
| `showGrid` | boolean | `true` | **новое в 0.9.8** |
| `showXAxis` | boolean | `true` | **новое в 0.9.8**; скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | **новое в 0.9.8**; скрытие схлопывает правое поле |
| `annotations` | array | `[]` | тот же формат, что у Line; горизонтальные вне Y-домена пропускаются, полосы обрезаются по краю графика (renderAnnotations, v0.9.8_6) |
| `annotationLabelHeight` | number | `22` | резерв сверху `+4` при аннотациях: дефолт `margin.top` — `Math.max(16, резерв)`; явный `margin.top` побеждает, как у Line/Bar (0.9.8_6) |

---

## Overview

**Форма данных:** `setData(data, onBrush, { extent })` — `[{ date: Date, value: number }]`, без парсинга/валидации (строковые даты дают `NaN` в пути — в отличие от всех Chart после C-06/C-07); колбэк `onBrush(extent, { final })` (`final: true` — один раз, по окончании перетаскивания); `extent` — временной охват полосы (по умолчанию — данных). ⚠️ Сигнатура с колбэком вторым аргументом уникальна для библиотеки. Не наследует `Chart`: нет заголовка/футера/легенды, `setView` нет; `margin` — опция с 0.9.8_6 (`{ top: 6, right: 70, bottom: 16, left: 0, ...options.margin }`, слияние по сторонам), `axis` — ось времени под полосой; тема мержится спредом вместо `createTheme`. Дополнительный метод: `setBrush(extent)`. Как навигатор (`navigator: true | { … }`) создаётся базовым Chart под Line, Bar (даты), DualAxes, TimeSeries, Graph flow и MapFlow; объект `navigator` — те же опции.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `height` | number | `52` | собственная опция (не Chart); пример в шапке использует 56 |
| `color` | string | `theme.border` | цвет линии |
| `area` | `false\|true\|number` | градиент | ✅ `false` работает с 0.9.8_6 (T-06, `d75b816`): только линия |
| `areaColor` | string | `theme.accent` | |
| `brushColor` | string | `theme.text` | обводка выделения + ручки; заливка выделения и подложка — `theme.text`, бледно |
| `margin` | object | `{6, 70, 16, 0}` | 0.9.8_6; навигатор графика берёт `left`/`right` графика, у flow и MapFlow — `{ left: 6, right: 6 }` |
| `axis` | boolean | `false` | 0.9.8_6: ось времени под полосой (10px, приглушённая; крайние подписи за краем скрываются); включена у навигаторов flow и MapFlow |

✅ **Решено (K-04, шаг 7):** Overview — публичный класс, не Chart (`setData` с колбэком, свой margin, без шапки, подвала и `whenReady()`). Документирован в одном месте — раздел «Overview (standalone navigator)», `/charts/line/time-series/#overview-standalone-navigator`: опции `height`, `color`/`area`/`areaColor`, `brushColor`, `margin`, `axis`, `theme`; методы `setData(data, onBrush, { extent })`, `setBrush(extent)`, `destroy()`. Даты читает как графики — Date, ISO-строка, epoch ms — в строках, в `extent` и в `setBrush`; строки копируются и сортируются, нечитаемые отбрасываются.

---

## Bar

**Форма данных:** `[{ label, value, color? }]`; в time-series режиме — `[{ date, value, color? }]` (автоопределение по `date`+`value` в первой строке). `color` — заливка бара (B-01, 0.9.8_6), перекрашивается на `setData`; stacked-режим его игнорирует (цвет серии). Аннотации — только в вертикальном time-series режиме (B-04, v0.9.8_6).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `orientation` | `'vertical'\|'horizontal'` | `'vertical'` | |
| `animate` | boolean | `true` | рост один раз на экземпляр; рендер посреди входа продолжает его с текущего положения (C-16, шаг 7a); подписи значений horizontal проявляются на месте (C-25) |
| `duration` | number (ms) | `500` | ⚠️ 650 у Line/DualAxes/Donut, 800 у Gauge |
| `stagger` | number (ms) | `0` | задержка по барам; категориальный и date-режимы, не в stacked (сегменты появляются вместе); ⚠️ есть только у Bar |
| `ease` | `'cubicOut'\|'cubicInOut'\|'linear'` | `'cubicOut'` | |
| `barColor` | string | `theme.accent` | заливка баров без своего `color` (`d.color \|\| barColor \|\| theme.accent`; `''` = не задан) |
| `barWidth` | number (px) | — | 0.9.8_6 (B-07): ширина бара; толщина в horizontal; весь столбец в stacked; центр на месте дефолтного; кап по шагу категории/даты (соседи касаются, не перекрываются); невалидное игнорируется; снимает пол 2px и потолок 48px ratio |
| `barWidthRatio` | number | `0.72` (time-series) | доля наименьшего промежутка между датами, в пределах 2–48px; игнорируется при `barWidth` |
| `labelMaxLength` | number | — | обрезка подписи категории; полный текст в тултипе. Horizontal: левый отступ измеряется по самой длинной подписи — 65 px … 40% ширины, длиннее — многоточие и тултип; явный `margin.left` сохраняется (C-39, шаг 7a) |
| `showValues` | boolean | `false` | подписи значений у концов баров (horizontal only) |
| `valueFormat` | fn(d, info) | `,.0f` | формат подписей значений: копия строки и вторым аргументом `{ label, value, color }` (K-09, шаг 7); в тултипе stacked — `seg` с ролевыми полями на нём, дефолт `','` |
| `valueOffset` | number | `6` | |
| `valueInsideGap` | number | `42` | порог перекидывания подписи внутрь бара |
| `showGrid` | boolean | `true` | |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showYAxis` | boolean | `true` | 0.9.8: скрытие схлопывает боковое поле (какое — зависит от orientation) |
| `yTicks` / `yTickValues` | number / array | `4` / — | vertical/time-series |
| `xTicks` / `xTickValues` | number / array | `4` / — | xTicks: ось значений horizontal (4) и ось времени в режиме дат (6), приблизительно (stacked — точные интервалы); xTickValues — только horizontal (и stacked horizontal), в режиме дат игнорируется |
| `yTickFormat` | fn | по шагу тиков (C-30, шаг 7a; было `.2s`) | vertical |
| `yPrefix` / `ySuffix` | string | `''` | vertical: категории, даты и stacked (кроме `'percent'`) — с 0.9.8_6 |
| `xTickFormat` | fn | по шагу тиков (C-30) / по размаху вида (C-31) — шаг 7a; было `.2s` / `'%b'` | horizontal / time-series |
| `tooltipFormat` | fn(d, info) => html | встроенный | копия строки (`label` строкой, `value` числом; в date-режиме `date` — Date, `label: ''`), вторым — `{ label, value, color }`, в date-режиме `{ date, value, color }`; `color` — как нарисован (K-09, шаг 7) |
| `annotations` | array | `[]` | тот же формат, что у Line; только вертикальный time-series режим. Categorical / stacked / horizontal: не рисуются, слой очищается, один `console.warn` на инстанс (B-04); горизонтальные вне Y-домена пропускаются, полосы обрезаются по краю графика (renderAnnotations, v0.9.8_6) |
| `annotationLabelHeight` | number | `22` | резерв сверху `+4` при аннотациях у вертикального бара; явный `margin.top` побеждает (как у Line); у horizontal резерва нет |

Таймфреймы и навигатор скрыты в режимах без оси дат (категории, stacked, horizontal); датированные строки + horizontal → `console.warn` один раз (0.9.8_6).

---

## DualAxes

**Форма данных:** массив серий `[{ name?, axis?: 'y1'|'y2' (дефолт 'y1'), type?: 'line'|'bar' (дефолт 'line'), color?, barWidth? (только bar-серии, px; 0.9.8_6), values: [{ date, value }] }]`. Per-series: `curve`, `strokeWidth` (дефолт `theme.strokeWidth`, 2; `null`/`''` → дефолт), `strokeDash`, `area` (только `true`), `areaOpacity`, `areaBaseline`, `markers`, `markerShape`, `markerSize`, `markerFill`, `markerStroke` (линии), `barWidth` (бары) — общий нормализатор с Line (`core/seriesPath.js`, C-03, 0.9.8_6), в шапке и доках. **Y1 — правая ось, Y2 — левая** (⚠️ против интуиции; сетка и нулевая линия привязаны к y2).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `xPad` | number | `8` | зазор от края плота до крайней метки; с барами — до внешнего края первого/последнего бара (шкала X вдвинута на половину самого широкого бара/кластера, C-27, 0.9.8_6); без баров как раньше |
| `curve` | string | `'linear'` | ⚠️ у Line дефолт `'monotone'` |
| `curveTension` | number | `0` | ✅ в шапке и доках |
| `animate` | boolean | `true` | |
| `duration` | number | `650` | |
| `ease` | string | `'cubicOut'` | |
| `y1Ticks` / `y2Ticks` | number | `4` | ✅ авто-домен округляется по тому же числу — `.nice(y1Ticks ?? 4)` (C-21, шаг 7a; было всегда `.nice(4)`) |
| `y1TickFormat` | fn | `,.2f` (лог: `.3~s`) | ⚠️ у одноосных классов — `yTickFormat` |
| `y2TickFormat` | fn | `v≈0 ? '0' : '+.2f'` | ❓ знаковый формат — очень опинионированный дефолт |
| `xTickFormat` | fn | `'%m/%d'` | дефолтный формат — не больше одного тика на день окна (E-03, 0.9.8_6); свой формат — 6 тиков |
| `y1Domain` / `y2Domain` | [min,max] | auto | |
| `y1Scale` / `y2Scale` | `'linear'\|'log'` | `'linear'` | 0.9.8_5, по осям. `setYScale(type, { axis: 'y1'\|'y2'\|'both', silent })` (по умолчанию обе). Лог-ось: бары от низа оси, ≤ 0 пропускаются, явный `yNDomain` на логе принимается только при 0 < min < max |
| `scaleToggle` | `boolean\|'y1'\|'y2'\|'both'\|object` | `false` | 0.9.8_5. `true` = `'y1'` (на Y2 часто знаковая серия), `'y2'`, `'both'` (кнопка «Log», если лог хоть одна ось). `onScaleChange(fn)` → `{ scale, axis }` |
| `y1LabelsOnly` / `y2LabelsOnly` | boolean | `true` | |
| `showGrid` | boolean | `true` | ⚠️ сетка по шкале **y2** и `y2Ticks` |
| `showXAxis` | boolean | `true` | 0.9.8: скрытие схлопывает нижнее поле |
| `showY1Axis` | boolean | `true` | ⚠️ вместо общего `showYAxis`. 0.9.8: правое поле схлопывается, когда выключены и `endLabels`, и нет `y1Title` |
| `showY2Axis` | boolean | `true` | 0.9.8: левое поле схлопывается, если нет `y2Title` |
| `endLabels` | boolean | `true` | |
| `endLabelsAxis` | `'y1'\|'y2'` | `'y1'` | |
| `y1Title` / `y2Title` | string | — | тримятся эллипсисом под margin оси |
| `axisTitleMaxLength` | number | — | |
| `barOpacity` | number | `0.35` | fallback — `theme.barOpacity` (0.9.8_6) |
| `barWidth` | number (px) | — | 0.9.8_6 (B-07): ширина каждого бара (в cluster — каждого бара кластера, кластер = сумма, центр на дате); `series.barWidth` > `barWidth` > `barWidthRatio`; кап по наименьшему промежутку между датами баров, кластер сужается пропорционально |
| `barWidthRatio` | number | `0.65` | доля наименьшего промежутка между датами bar-серий (с 0.9.8_6; было — первый промежуток всех дат, включая линии); в cluster — весь кластер; ⚠️ у Bar (time-series) — `0.72` |
| `barGrouping` | `'overlap'\|'cluster'` | `'overlap'` | |
| `annotations` | array | `[]` | горизонтальные принимают `axis: 'y1'\|'y2'`; горизонтальные вне Y-домена пропускаются, полосы обрезаются по краю графика (renderAnnotations, v0.9.8_6); горизонтальные и диапазоны дат тянутся до краёв плота, а не шкалы (с барами шкала вдвинута на полбара) |
| `annotationLabelHeight` | number | `22` | `margin.top`: дефолт 10, 30 с `y1Title`/`y2Title`, `annotationLabelHeight + 4` с аннотациями; явное значение побеждает (с 0.9.8_6, как у Line/Bar — K-10) |
| `crosshair` | boolean | `true` | |
| `tooltipFormat` | fn({date, points}) => html | встроенный | `points: [{ name, series, axis, type, color, date, value, fmt }]` — по одной на серию, покрывающую дату под курсором; `fmt` — значение через формат тиков своей оси; `date` — дата первой точки. ✅ K-09 (шаг 7): ролевые поля на payload — `/charts/settings/#formatter-arguments` |
| `area` | boolean | `false` | ✅ в шапке и доках |
| `areaOpacity` | number | `0.12` | ✅ в шапке и доках |
| `areaBaseline` | string | `'zero'` | ✅ в шапке и доках |
| `strokeDash` | string \| number[] | `null` | ✅ глобальный, в шапке и доках: пресет (`'dashed'`, `'dotted'`, `'dashDot'`, `'longDash'`, `'solid'`), строка dash-array или `number[]` |
| `markers` / `markerShape` / `markerSize` | — | `false` / `'circle'` / `theme.markerSize` (4) | ✅ в шапке и доках; только линии; fallback темы — с 0.9.8_6 |

---

## Donut / Pie

**Форма данных:** `[{ label: string, value: number, color?: string, id?: string }]`. `setData` отбрасывает нечисловые и **неположительные** value (`> 0`). Слайсы сопоставляются по `id ?? label`; повтор подписи — по порядку (ключ с номером повтора), слайс сохраняется; fill — на каждом рендере (C-18 ✅ шаг 7a). Легенда — по `id`/`label` (K-22 ✅ шаг 7a). ✅ `Pie` — подкласс Donut с `innerRadius: 0` по умолчанию (и pie-дефолты `padAngle`/`cornerRadius`, без центра; явный `innerRadius` даёт отверстие с центром), C-05 `38edd4e`.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `innerRadius` | number 0..1 | `0.58` | `0` ⇒ режим pie |
| `padAngle` | number (рад) | donut `0.018` / pie `0.008` | ✅ шапка с 2026-07-03 (0.9.8): «0.018 donut / 0.008 pie». Один и тот же угол в `d3.pie()` (резерв) и `d3.arc()` (сам зазор) — штатная связка d3, зазор одинарный (Donut.js:178,207,220) |
| `cornerRadius` | number px | donut `3` / pie `1` | ✅ шапка: «3 donut / 1 pie» |
| `animate` | boolean | `true` | |
| `duration` | number | `650` | |
| `ease` | string | `'cubicOut'` | |
| `showLabels` | boolean | `false` | внешние подписи с выносками |
| `labelMinPct` | number | `0.04` | |
| `labelContent` | `'both'\|'label'\|'percent'` | `'both'` | ✅ в шапке и доках |
| `showCenter` | boolean | `!isPie` | |
| `centerText` | string \| fn(data, info) => string | `valueFormat(total)` | `data` — нарисованные элементы, `info` — `{ label, value }`: подпись центра и итог (K-09, шаг 7); в drill-down игнорируется (центр — всегда `valueFormat` значения узла в фокусе) |
| `centerLabel` | string | `'Total'` | ⚠️ англ. строка зашита; у Gauge дефолт `null` |
| `valueFormat` | fn(v, info) | `d3.format(',')` | `info` — `{ label, value, percent, color }` сектора или `{ label, value }` центра (K-09, шаг 7); `percentFormat(pct, info)` — вторым объект сектора; у Gauge аналога нет |
| `percentFormat` | fn | `.1%` | |
| `tooltipFormat` | fn({label, value, percent, color}) => html | встроенный | ✅ payload — сами ролевые поля (K-09, шаг 7) |

✅ **0.9.8_2 — иерархия + drill-down (реализовано):** объект-корень на входе включает drill-down (breadcrumb, клик-вниз/центр-вверх), `showRemainder`/`remainderLabel`/`strict` — опции графика; плоский массив = прежний донат. Полный контракт — раздел «Hierarchy — normalizer + tree consumers» ниже.

---

## Gauge

**Форма данных:** `number` либо `{ value, max?, min? }`. `max`/`min` из `setData` перекрывают опции на один вызов; каждый `setData` начинает от `min`/`max` опций (C-21 ✅ шаг 7a; раньше перекрытие «залипало»).

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `height` | number | `220` | высота контейнера |
| `min` / `max` | number | `0` / `100` | база для каждого `setData`; объект в `setData` перекрывает их на один вызов (C-21, шаг 7a) |
| `startAngle` / `endAngle` | number (рад) | `∓0.75π` | геометрия сама центрирует любой разворот; для мелких дуг (полукруг ±½π) резервируется место под текст снизу (0.9.8_2) |
| `thickness` | number 0..1 | `0.18` | доля внешнего радиуса |
| `cornerRadius` | number px | `6` | |
| `needle` | boolean | `false` | 0.9.8_2: стрелка-спидометр с втулкой в центре, анимируется вместе с заливкой; показания съезжают под втулку (value y=22, label y=44) |
| `needleColor` | string | `theme.text` | 0.9.8_2 | 
| `color` | string | `theme.accent` | ⚠️ единичный vs палитра у остальных |
| `trackColor` | string | `theme.grid` | |
| `showCenter` | boolean | `true` | |
| `centerText` | string \| fn(value, max, min, info) => string | `.0%` | позиционные аргументы сохранены; ролевой объект `{ value, max, min, percent, color }` — четвёртым, после них (K-09, шаг 7) |
| `centerLabel` | string | `null` | ⚠️ у Donut `'Total'` |
| `animate` | boolean | `true` | |
| `duration` | number | `800` | ⚠️ 650 у DualAxes/Donut/Line, 500 у Bar |
| `ease` | string | `'cubicOut'` | |
| `tooltipFormat` | fn({value, max, min, percent, color}) => html | встроенный (`.1%` захардкожен) | `color` — цвет заливки дуги (K-09, шаг 7); ❓ нет `valueFormat`/`percentFormat`, как у Donut |

---

## MultiChart

**Форма данных:** `.setData([d0, d1, ...])` — элементы раздаются детям по индексу; `null` пропускаются, не-массив молча игнорируется. Альтернатива: `charts[i].data` в дескрипторе. Публичное поле `.charts` — массив инстансов детей.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `columns` | number 1–4 | `2` | клампится |
| `mobileColumns` | number | `1` | при ширине контейнера ≤ `mobileBreakpoint`; узкий режим — только по ширине (`0 < w ≤ mobileBreakpoint`), от `columns` не зависит (C-15, шаг 7a) |
| `mobileBreakpoint` | number (px) | `480` | ширина **контейнера**, не окна |
| `chartHeight` | number (px) | `200` | высота ячейки → `height` детей |
| `gap` | number \| string | `32` px (`--rc-space-lg`, с 0.9.8_6 и без Rare Styles) | число → px |
| `charts` | Array<descriptor> | `[]` | `{ type: 'Line'\|'Bar' (default 'Line'; неизвестный → console.warn + Line), title?, span?, data?, options?, mobileOptions? }` |
| `animate` | boolean | `true` | ✅ в шапке и доках; только пробрасывается детям (`options.animate` ребёнка главнее) |

✅ **`mobileOptions` на пересечении брейкпоинта** — панель с ними пересобирается: destroy → новый класс с опциями своей стороны → последние данные (`mc.setData` и `mc.charts[i].setData` запоминаются); `height` и `margin` применяются целиком, `mc.charts[i]` — новый экземпляр (C-15, шаг 7a).
✅ **TYPE_MAP — только `Line` и `Bar`;** неизвестный `type` даёт `console.warn` (с подсказкой при неверном регистре) и fallback на `Line`; ключи Object.prototype (`'constructor'`, `'toString'`, `'__proto__'`) больше не роняют конструктор (B-02, v0.9.8_6). Остальные типы — v0.9.8_9 (K-11).
❓ Своего SVG и `ariaLabel` у контейнера нет — доступное имя композиции не задать.

---

## Map

**Форма данных:** `.setData([{ id, value?, color?, label? }])` — `id` → `String`, матчится с `feature.id` → `feature.properties[idField]` → фолбэки `iso_a2/iso_a3/ISO_A2/ISO_A3`. **GeoJSON передаётся через опции, не setData:** `geoData` → `topoData` → `geoUrl` → `topoUrl`; если ничего не задано — карта **молча** не рендерится.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `geoData` / `topoData` | object | — | inline GeoJSON (FeatureCollection или Feature) / TopoJSON |
| `geoUrl` / `topoUrl` | string | — | fetch через `d3.json()` |
| `topoObject` | string | первый ключ `objects` | ✅ доки и шапка: необязателен, фолбэк — первый ключ |
| `projection` | string | `'naturalEarth1'` | `mercator\|naturalEarth1\|equalEarth\|orthographic\|identity` (неизвестное имя → `naturalEarth1`); ✅ `'identity'` документирован (с `reflectY`) |
| `reflectY` | boolean | `false` | ✅ в шапке и доках; только с `projection: 'identity'` |
| `fitPadding` | number (px) | `20` | |
| `defaultFill` | color | `theme.map.unmatchedFill` (`#e8e8e8`; dark `#1e1e2e`) → `theme.surface` → `#e8e8e8` | регионы без данных |
| `matchFill` | color | `theme.map.matchFill` (`#00aaff`; dark `#ff6200`) → `theme.accent` → `#00aaff` | |
| `oceanColor` | color | `theme.map.ocean` → `'transparent'` | |
| `borderColor` / `borderWidth` | color / number | `theme.map.border` (`#ffffff`; dark `#444455`) → `theme.border` → `#ffffff` / `0.5` | non-scaling-stroke |
| `hoverFill` | color | авто: своя заливка региона, HSL-светлота × `theme.map.hoverBrighten` (1.3; тёмная 1.2; 1 — без эффекта) | только для регионов с данными; было — `matchFill` на 16% к белому (C-22, шаг 7a) |
| `graticule` | boolean | `false` | сетка 10° под регионами цветом `theme.map.graticule`; при `'identity'` не рисуется (C-22, шаг 7a) |
| `zoom` | boolean | `false` | scroll-zoom + pan |
| `zoomExtent` | `[min, max]` | `[0.8, 12]` | |
| `idField` | string | `'id'` | |
| `featureFilter` | fn(feature) => boolean | — | |
| `clipExtent` | `[[minLon,minLat],[maxLon,maxLat]]` | — | |
| `tooltipFormat` | fn({ feature, item, label, value, color }) => html | встроенный | ролевые поля на payload (K-09, шаг 7): `label` — имя дефолтного тултипа (`item.label`, затем имя или id фичи), `value` — `item.value` или `null`, `color` — заливка региона; `item = null` для региона без данных (0.9.8_6, шаг 6). Тот же payload получает `regionTooltipFormat` MapFlow (код Map) |
| `rotate` | `[λ, φ, γ]` | — | |

Особенности: `height` дефолт 400, `margin` — `{0,0,0,0}` (частичный `margin`: не заданные стороны — 0, C-17). ✅ `whenReady()` резолвится после загрузки и первой отрисовки или после ошибки (`console.error`); без источника геометрии — `console.warn` (K-12, шаг 7a).

---

## Адаптеры

Из `adapters/index.js`. Контракт: `(data|url, mapping[, options]) → [{ …mappedFields }]`.

| Функция | Сигнатура | Заметки |
|---------|-----------|---------|
| `fromArray` | `(data, mapping)` | синхронная; `mapping` обязателен. У всех адаптеров `date`/`value` нормализуются при любом маппинге (ключ или функция); пустое `value` остаётся (шаг 6) |
| `fromJson` | `(url, mapping)` → Promise | принимает массив или `{data}`/значения объекта |
| `fromCsv` | `(url, mapping)` → Promise | через `d3.csv` |
| `fromApi` | `(url, mapping, {headers, transform})` → Promise | бросает на `!res.ok` |

`mapping`: `{ field: row => value }` или `{ field: 'sourceKey' }`. После маппинга, при любом виде маппинга (ключ или функция): `date` → `parseDate`, нечитаемая дата — строка отбрасывается; `value` → число, non-finite — строка отбрасывается; отсутствующий, `null` или `''` `value` сохраняется как есть (C-11, 0.9.8_6).

**Найдено при тестировании (B1):** фильтр `value` пропускал `NaN` (`!NaN === true`). Исправлено в v0.9.8 (CHANGELOG `[v0.9.8]`). Покрыто тестом `test/adapters.test.js`.

---

## Hierarchy — normalizer + tree consumers (v0.9.8_2 — ✅ released 2026-07-22)

Решение 2026-07-21 (с владельцем). Реализовано и проверено в браузере: **`stacked` на Bar** (`Bar.js`), **новый класс `HierarchicalBar`** (`charts/HierarchicalBar.js`), **drill-down на `Donut`** (`Donut.js`), общий нормализатор (`core/hierarchy.js`). Тесты: `test/hierarchy.test.js` (25), `test/hierarchical-charts.test.js`, `test/bar.test.js`; полный сюит 251/251. Доки: `/charts/bar/stacked-bar/`, `/charts/bar/hierarchical-bar/`, drill-down-секция на `/charts/circular/`. Развилка А закрыта: `Hierarchies` (пространственные виды — treemap/pack/sunburst) остаётся post-1.0 и потребляет **тот же** контракт; `HierarchicalBar` — его линейный/outline вид. Выпущено в **v0.9.8_2** (2026-07-22); stacked area (Line) и `DivergingBar` перенесены в _3.

Ниже — **фактический** замороженный контракт (сверено с кодом), плюс расхождения для аудита 0.9.9.

### Единый атом

`atom = { label: string, value: number | null, color?: string }` — форма и имена ключей **те же, что у Donut** (раздел «Donut / Pie» выше). Отличие, добавленное реализацией: `value` тристейтный — число `> 0` (раскрыто), `null` (**missing**-плейсхолдер: kept, `missing:true`, вне сумм, рисуется «?»), либо отсутствует/`≤0`/не-конечное (лист отбрасывается). Один атом во всех потребителях, каждый добавляет одну ось:

| Класс | Форма | Добавляет к атому |
|-------|-------|-------------------|
| Donut | `[ atom ]` (плоский) или дерево (drill-down) | — / глубину |
| Bar `stacked` | `[{ name, values: [ atom ] }]` | ось **категорий** (серия × категория) |
| HierarchicalBar / Donut-drilldown | `atom & { children?: [node] }` | **глубину** (дерево) |

Одинаковы **форма и имена ключей**, не правила валидации (Donut отбрасывает `≤ 0`, Bar разрешает негативы, узел дерева считает субтотал). Проекции «вниз по размерности» (дерево → верхнее кольцо → donut) — **явными адаптерами**, не сниффингом формы в классе: `topLevel(tree)` / `flatten(tree, {depth})` → `[atom]` (в духе `adapters/index.js`). Donut **не** учим принимать `children` неявно — это тот же смелл, что автодетект time-series в `Bar.js:70`; drill-down включается деревом на входе явно.

**Правило `name ↔ label`.** Серия живёт поперёк категорий и опознаётся `name` (Line/DualAxes/stacked); часть/срез — `label` (Donut/Bar-категории/узел дерева). Единственная точка ремапа — коллапс stacked в одну категорию: `series.name → slice.label`. Зафиксировать в доках, не «чинить».

### Контракт дерева (замораживается в 1.0)

```
node = {
  label:           string,   // обязателен и непустой; пустой/пробельный → drop
  value?:          number | null,  // тристейт: >0 раскрыто · null = missing «?» · отсутствует → лист drop / родитель = Σ children
  color?:          string,   // override; поднимается в атом. Наследования по поддереву НЕТ (см. блокер 8)
  children?:       [node],   // наличие ⇒ внутренний узел
  remainderLabel?: string,   // подпись остатка (см. ниже). showRemainder — опция графика, НЕ поле узла
}
```

| Решение | Значение (как реализовано) | Обоснование |
|---------|----------------------------|-------------|
| **`value` родителя** | **авторитетно, может быть > Σ children**. Σ children считает только числовые дети — missing-дети (`null`) **не** уменьшают остаток | Расследовательские данные: тотал известен, разбивка частична; неизвестное не вычесть. |
| **Остаток** | `remainder = value − Σ children` **только у внутреннего узла** (у листа и узла без своего value → `0`); рисуется **только** при `remainderLabel` или опции `showRemainder: true` | Никогда не молча. Незаполненная часть целого = «Other / not disclosed». |
| **Σ children > value** | `overflow: true` + `console.warn`, отрицательный остаток виден, но **не рисуется**; опция `strict: true` → `throw` | Явная политика вместо молчаливого отрицательного сегмента (донат его не нарисует). |
| **Домен значения** | лист принимается только при `value > 0`; `0`/отриц./не-конечное → drop | Композиционные чарты рисуют только положительную величину; централизовано в нормализаторе (Donut больше не фильтрует сам в hier-режиме). |
| **`value: null` (лист)** | kept как **missing**-плейсхолдер: `missing:true`, вне сумм, «?» в баре / нота «N not disclosed» в донате | Названный, но нераскрытый элемент ≠ остаток (аноним) ≠ пропуск. |
| **Лист без `value`** | отбрасывается | Зеркально фильтру адаптеров (`adapters/index.js`). |
| **Стабильный id** | **двухфазный**: фаза 1 — структура, фаза 2 — id сверху вниз, дизамбигуация ключа сиблинга протянута в префикс → уникальность на любой глубине (одинаковые сиблинг-**поддеревья** различимы); синтетический остаток в своём namespace, не сталкивается с реальным «Other». `path` — метки предков (для breadcrumb) | Наивный «path = ancestorLabels ⧺ label» давал коллизии внуков (блокер 1). |
| **Цвет** | нормализатор только **поднимает** `node.color` в атом (`node.color`), наследования нет. Затухание по depth и палитра веток — выбор рендера `HierarchicalBar`, не контракт | Bar/donut нужна категориальная различимость; hue-семьи — задача пространственного `Hierarchies` (блокер 8). |

### Нормализатор (shared core)

`normalizeHierarchy(input, opts) → normTree`. Единственный вход для всех потребителей. Опции — **только на уровне графика/нормализатора** (`showRemainder`, `remainderLabel`, `strict`), не на узле.

- принимает **один корневой объект или массив корней** (лес); одиночный невалидный корень → `null`;
- пустой/пробельный `label` → drop узла; лист без числового `value>0` → drop; `value:null` → сохраняется missing-плейсхолдером;
- считает субтоталы (`value ?? Σ числовых children`) и остаток (у внутреннего узла с собственным value);
- политика overflow (`Σ children > value`): `overflow:true`+warn, либо throw при `strict`;
- назначает стабильные id двухфазно (см. таблицу выше);
- эмитит одно нормализованное дерево `{ id, label, value, depth, path, children, remainder, color?, missing?, isRemainder?, overflow?, data }`, **идентичное** для `HierarchicalBar` и `Donut`.

Место: `src/core/hierarchy.js` (не адаптер — богаче: ids, субтоталы, остатки). ✅ Покрыто `test/hierarchy.test.js` (25 кейсов: overflow+strict, `value>0` vs null-missing, remainder листа=0, глубокая уникальность id, коллизия remainder↔реальный «Other», blank-label, color-атом).

### HierarchicalBar (новый класс — ✅ реализовано)

**Форма:** корень или лес → нормализованное дерево. **Рендер:** плоский обход в глубину, строки переменной высоты (SVG высота = rows × `rowHeight`), горизонтальный бар на строку на общей линейной шкале, отступ по `depth`, корень нейтральный (`theme.muted`), ветки — палитра + затухание по глубине, «?» для missing, остаток — приглушённый сегмент.

| Опция | Дефолт | Заметка |
|-------|--------|---------|
| `showRoot` | `true` | `false` → одиночный корень скрыт, дети становятся верхними строками |
| `rowHeight` / `indent` / `barHeight` | `28` рядом / `44` над баром; `16`; шрифт подписи значения + 2 (16) | раскладка (C-28, шаг 7a): от 480 px ширины плота строка — название → бар → значение (колонка названий до 40%, перенос в одну строку, затем многоточие; общая нулевая линия; значения в колонке справа), уже — название над баром, урезано по ширине; `indent` сдвигает только название; родители полужирные, зазор 8 px перед группой. `barHeight` по умолчанию — размер шрифта `.rc-hbar-value` (`--rc-font-size-sm`, 14px) + 2 (O-08) |
| `labelAlign` | `'right'` | рядом с баром: `'right'` — названия прижаты к барам справа, `'left'` — колонка слева с отступом по глубине (просьба владельца 2026-10-26); над баром название всегда с отступом |
| `maxDepth` | `∞` | предел глубины отрисовки |
| `showValues` / `valueFormat` | `true` / `d3.format(',')` | разделители тысяч, дроби сохраняются (`30.5`); `valueFormat(node, info)` — узел первым, как было, вторым `{ label, value, color, percent }`: цвет бара и доля от итога (K-09, шаг 7) |
| `missingGlyph` | `'?'` | маркер для `value:null` |
| `labelMaxLength` | — | обрезка + полный текст в тултипе (как у Bar); без неё длинное имя переносится или урезается само (C-28) |
| `showRemainder` / `remainderLabel` / `strict` | `false` / `'Other'` / `false` | проброс в нормализатор |
| `animate` / `duration` / `ease` | `true` / `500` / `cubicOut` | рост с нуля на каждый `setData`; рендеры сразу после setData (fonts.ready, первый resize) и resize продолжают рост с текущей ширины (C-16, шаг 7a); нет `stagger` |
| `tooltipFormat` | — | `(node, info) => html`, `info` — как у `valueFormat` (K-09, шаг 7); дефолт — доля от итога: значение корня (даже скрытого), у леса — сумма корней (0.9.8_6) |
| `margin` | `{8, 8, 8, 0}` | top/bottom добавляются к высоте контента; опция `height` не действует |

Интерактивный collapse/expand — follow-up (интерактив в 0.9.8_9); текущий вид статический (весь outline сразу).

### Donut drill-down (расширение стабильного класса — ✅ реализовано)

⚠️ Вносит **интерактив + навигационное состояние** (`_trail`) в статический класс — замораживается в 1.0. Поведение: показать непосредственных детей корня → клик по сектору с детьми = вход → breadcrumb (клик по крошке — прыжок к предку) + клик в центр = вверх (центр — кнопка: `tabindex`, `role="button"`, `aria-label`, Enter/Space; E-21, 0.9.8_6) → лист не проваливается. Остаток — приглушённый сектор при `showRemainder`/`remainderLabel`. Missing (`value:null`) **не** рисуется сектором (донат кодирует величину) — нота «N not disclosed» под кольцом.

| Опция / API | Решение | Заметка |
|-------------|---------|---------|
| дискриминатор входа | **массив → плоский легаси; объект-корень → hier** | по типу входа, не сниффинг полей (блокер 6). `.data(arcs, d=>d.data.id ?? d.data.label)` — ключ по id |
| `showRemainder` / `remainderLabel` / `strict` | опции графика | проброс в нормализатор |
| ~~`drilldown` тумблер~~ | ❌ не нужен | дерева на входе достаточно — снято |
| ~~`onDrill` колбэк~~ | ❌ не в v1 | навигация внутренняя; можно добавить аддитивно позже |
| методы | `drillTo(node)` / `drillUp()` / `drillToDepth(i)` | публичные, все три на `/charts/circular/` и возвращают график; `drillTo(node)` — шаг клика по сектору: `node` — узел нормализованного дерева графика (не объект из `setData`), узел без раскрытых детей (лист, остаток) игнорируется (K-21, шаг 7) |

### Bar `stacked` (режим — ✅ реализовано)

**Форма:** серии-major `[{ name, values: [{ label, value }] }]` (как DualAxes), автодетект по `values`-массиву. Категории = упорядоченное объединение меток; пропуск категории серией → 0. `d3.stack` под капотом, обе ориентации.

| Опция | Дефолт | Заметка |
|-------|--------|---------|
| `stacked` | auto | `'percent'` → нормировка к 100% (`stackOffsetExpand`) |
| `legend` | auto | строится из имён серий (палитра по порядку); свой `legend` перекрывает |
| `tooltipFormat` | — | `(seg)`, `seg={i, name, cat, v0, v1, value, total}` + ролевые поля `label` (= `cat`), `series` (= `name`), `color`, `percent` (= `value / total`); тот же `seg` — у `valueFormat` в дефолтном тултипе (K-09, шаг 7) |
| `value ≥ 0` | — | стек кодирует кумулятивную длину; знаковые сравнения → `DivergingBar` |
| date-режим стекинга | ⏳ | отложен в follow-up; сейчас только категориальный |

**Сигнатуры форматтеров — ✅ K-09, шаг 7:** одно правило, обратно совместимое: payload-объект получает ролевые поля `label`, `value`, `date`, `color`, `percent`, `series` (какие применимы); форматтер с числом, строкой данных или узлом первым аргументом сохраняет его и получает ролевые поля объектом следующим аргументом (вторым; у Gauge `centerText(value, max, min)` — четвёртым). Таблица по классам — `/charts/settings/#formatter-arguments`.

---

## Flows — общий слой связей (решения шага 0 релиза 0.9.8_3, 2026-10-07)

Общий контракт связей для `Graph` (включая `view: 'flow'`), `Sankey` и `MapFlow`. Классы experimental, но словарь общий — менять его потом пришлось бы в трёх местах сразу. ТЗ: [SPEC-SANKEY](SPEC-SANKEY-INTERNAL.md), [SPEC-GRAPH-FLOW](SPEC-GRAPH-FLOW-INTERNAL.md), [SPEC-GRAPH-MAPFLOW](SPEC-GRAPH-MAPFLOW-INTERNAL.md).

| Вопрос | Решение | Почему |
|---|---|---|
| Имя коллекции и концов | `links` + `source`/`target`. Алиасы на входе: `from`/`to` (концы), `flows` (коллекция, MapFlow). Наружу (события, тултипы) — всегда каноническая форма | Так уже в Graph и d3; макет data project и черновик MapFlow писали `from`/`to` — принимаем без переписывания данных |
| Время на связи | `start` / `end` (открытый конец = `null`/нет поля). Значения: `Date`, ISO-строка, `YYYY`, `YYYY-MM`, число. **Число < 10000 = год** | `from`/`to` заняты дважды: алиас концов и вертикальные аннотации `{ from, to }` в `utils.normalizeAnnotations`. `parseDate(1773)` сейчас даёт миллисекунды от 1970 — для годов нужен свой `parseTime` в `core/links.js` |
| Окно времени | `setTimeWindow(from, to)` — пересечение `[start, end]` с окном, `null` = открытая граница. Опция `timeWindowMode: 'hide' \| 'dim'`; дефолт MapFlow — `hide`, flow — `dim` | В макете flow вне окна приглушается (контекст виден), на карте лишние дуги только шумят |
| Модель Graph (A2) | Хранение — `graphology` `{ type: 'directed', multi: true }`: каждая связь — ребро в заданном направлении. Аналитика (BFS ego, пути, Louvain, betweenness, `degree`) — по **неориентированной простой проекции**, которая строится лениво и сбрасывается на `merge`. Новые зависимости не нужны (проекция ≈15 строк вместо `graphology-operators`) | Louvain не работает на настоящем `mixed`-графе (README пакета); `bidirectional` и betweenness на направленном графе меняют результат — path view перестал бы находить маршруты «против стрелок». Проекция сохраняет текущее поведение ego/path/cluster бит в бит · 0.9.8_6: betweenness/центральности удалены (X-01) — модель считает degree и Louvain, пути — `memorySource` |
| Дедупликация при `merge` | Одинаковый `id` → обновление атрибутов. Без `id`: одна и та же пара + тот же `type` → обновление; другой `type` → параллельное ребро. Для ego/path/cluster пара считается неупорядоченной (A→B и B→A одного типа — одна связь, как сейчас); во flow — упорядоченной | Сегодня второе ребро пары молча теряется (FIELD-NOTES 2026-07-31). Правило оставляет повторную подгрузку окрестности идемпотентной |
| `model.link(a, b)` | Заменяется на `links(a, b)` → массив всех рёбер пары в обе стороны; path view рисует их параллельными дугами | В мультиграфе `graphology.edge(a, b)` неоднозначен (бросает исключение) · совместимый `link(a, b)` удалён в 0.9.8_6 (X-01) |
| Толщина связи | Опция `linkWidth: { by: 'value', scale: 'sqrt' \| 'linear', min, max }`; `value: null` → `min`. Без опции Graph рисует как сейчас (`strength`/`weight`) | Общая для flow, Sankey (там толщина = геометрия ленты) и MapFlow |
| Тултип связи | `linkTooltipFormat({ link })` во всех трёх классах (`flowTooltipFormat` из черновика MapFlow — не вводим) | Один словарь |
| Закрепление тултипа (A3) | Opt-in API `Tooltip.pin(x, y, html)` / `unpin()` / `isPinned`: класс `.rc-tooltip.is-pinned` включает `pointer-events`, перенос строк и `max-width`; закрытие по клику мимо и Esc; `show()` игнорируется, пока тултип закреплён | Ссылки в тултипе (пруфы связи у schnellreich) должны быть кликабельны. Существующие классы зовут только `show`/`hide` — их поведение не меняется |

### Фактические опции (реализация 0.9.8_3, 2026-10-07)

**Общий слой (`core/links.js`)** — `normalizeRelationData(data, { unknownEndpoints, onUnknown, accept, ids, warn })` — единственный вход данных связей (0.9.8_6, K-07; `normalizeLinks` — его шаг для массива связей, `normalizeLinkData` — прежнее имя без политики концов): алиасы `from`/`to` и `flows` во всех классах и видах, id узлов и концов — строки, связь без обоих концов выбрасывается (с предупреждением, кроме `warn: false`), у каждой связи есть `id`; `accept(link)` — правило класса до политики концов (выброшенная им связь узлов не создаёт); `unknownEndpoints`: `keep` (дефолт) | `create` (узел `{ id }` в порядке появления) | `drop` (+ `onUnknown(link)`), `parseTime` (`< 10000` = год; `YYYY`/`YYYY-MM` как периоды, `{ end: true }` → последний мс периода), `linkInWindow`/`applyTimeWindow` (`'hide'` | `'dim'` → `_dim: true`), `linkWidthScale({ by, scale, min, max })`, `pairKey`, `dedupeUndirected`, `parallelIndex`, `resolveLinkType(types, key, { keys, theme })` (0.9.8_6, R-01: одно правило категорий для ego/path/cluster, flow, MapFlow, Sankey — описанная категория берёт свои `color`/`dash`/`label`; без типа (`default`) — `theme.muted`, подпись «connection»; неописанная — свободный цвет палитры по порядку, приглушённый, когда свободные кончились; Sankey красит неописанные приглушённо). ✅ **K-07 (0.9.8_6): один путь, политики классов.** Graph-модель (ego/path/cluster, `memorySource`, `add()`): `GraphModel.normalize` = `{ unknownEndpoints: 'create', accept: без связи узла с собой (и без узла для неё), ids: 'tie', warn: false }`, хранилище (`mergeCanonical`) берёт канонические связи и не перечитывает их; вид flow: `create` (связь узла с собой остаётся в трассе, модель её не хранит), модель получает ту же нормализованную трассу; MapFlow: `drop` + предупреждение «flow … points to an unknown node»; Sankey: сначала `accept` (положительное `value`), затем `drop` при заданных `nodes` (предупреждение «references an unknown node»; теперь в прямом порядке, раньше — в обратном) или `create` без них (узел `{ id, label: id }`). Алиас `flows` теперь читают и ego/path/cluster (раньше — только flow и MapFlow). **Формат id связи (заморожен до 1.0):** `id` вызывающего побеждает, как строка; без него — в payload-классах (MapFlow, Sankey, вид flow) `source→target#n` (n — число более ранних связей той же упорядоченной пары в payload; занятый читаемый id берёт следующий свободный номер), в накопительной модели Graph (ego/path/cluster) `tieKey` = `source→target|type` (`type` по умолчанию `default`; та же пара и тип — одна связь между подгрузками; ключ, занятый другой парой, получает `#1`, `#2`…). Оба формата порождает только `core/links.js` (`normalizeLinks` `ids: 'payload' | 'tie'`, `tieKey`). Производные id, не меняющиеся этим пунктом: агрегированная связь flow `agg:["s","t","key"]`, мета-узел свёртки `fold:<id>`, связи кластеров `pairKey` (`c0|c1`), запасной `pairKey` для связей ответа источника без `id` в path view.

**`Tooltip.pin(x, y, html, { onClose })` / `unpin()` / `isPinned`** — opt-in; используют Graph (ego/path/cluster и flow) и Sankey.

#### Sankey (`charts/Sankey.js`, раскладка `core/sankey.js`)

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `height` | number | `400` | горизонтальная раскладка; вертикальная растёт по `rowHeight` |
| `orientation` | `'auto'` \| `'horizontal'` \| `'vertical'` | `'auto'` | auto: вертикаль при ширине ≤ `mobileBreakpoint` |
| `mobileBreakpoint` | number | `480` | совпадает по смыслу с `MultiChart.mobileBreakpoint` |
| `rowHeight` | number | `140` | на колонку (ряд) в вертикали |
| `nodeWidth` / `nodePadding` | number | `12` / `12` | |
| `nodeAlign` | `'justify'` \| `'left'` \| `'right'` \| `'center'` | `'justify'` | |
| `nodeSort` | `null` \| `'value'` \| `'auto'` \| fn | `null` (порядок входа) | `'auto'` — по позициям после релаксации своей раскладки (`core/sankey.js:89`); fn получает объекты узлов |
| `iterations` | number | `6` | |
| `linkColor` | `'source'` \| `'target'` \| `'type'` \| `'gradient'` \| css | `'source'` | |
| `linkOpacity` | number | `0.45` | |
| `linkTypes` | `{ type: { color, label } }` | — | общий контракт с Graph; при `linkColor: 'type'` описанный тип — свой цвет, неописанный и без типа — `theme.muted`; `dash` не читается. Легенда строится сама только при `linkColor: 'type'` **и** `linkTypes` — все описанные типы, даже неиспользованные; опция `legend` главнее |
| `labels` | `'auto'` \| `false` | `'auto'` | выключает только `false`. Горизонтально — справа от узла (у последней колонки — поле справа); вертикально — над первым рядом, под последним, в середине бара между ними |
| `minLabelSize` | number | `10` | узел тоньше — без подписи, только тултип; в вертикали порог по ширине узла — `max(minLabelSize, 24)` |
| `showValues` | boolean | `true` | |
| `valueFormat` | fn(v) => string | locale | ✅ как у Donut `(v)` |
| `tooltipFormat` | fn({ node, incoming, outgoing }) => html | встроенный | ⚠️ у Graph `({ node, links })` — см. унификацию |
| `linkTooltipFormat` | fn({ link, source, target }) => html | встроенный | ✅ общий с Graph |
| `tableFallback` | boolean | `true` | скрытая таблица потоков |
| `animate` / `duration` / `ease` | | `true` / `600` / `'cubicOut'` | ⚠️ ещё одно значение `duration` (600). Затухание лент — на каждый `setData`, на общем таймлайне входа: рендер посреди него продолжает, а не обрывает (C-16, шаг 7a) |

Валидация: цикл → `throw` с перечислением; `value` ≤ 0 / не число / висячий узел → `warn` + drop; повтор пары+типа → сумма + `warn`.

#### Graph `view: 'flow'` (`graph/views/flow.js`) — этап 1

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `lanes` | `[{ id, label, weight? }]` | `[]` | дорожки только из данных добавляются в конец |
| `laneBy` | string \| fn | `'lane'` | |
| `nodeGroups` | `{ group: { color, label } }` | — | цвет + легенда |
| `nodeShapes` / `shapeBy` | map / string \| fn | `{}` / `'kind'` | `circle` \| `square` \| `diamond` \| `stack` \| SVG-путь; карта читается первой; вид, которого нет в карте и нет среди circle/square/diamond/stack, — круг; SVG-путь только из карты (шаг 6; раньше kind на m/M рисовался как path и узел пропадал) |
| `linkColorBy` | string \| fn | `'type'` | ключ в `linkTypes` |
| `linkWidth` | `{ by, scale, min, max }` | `{ by: 'value', scale: 'sqrt', min: 1.6, max: 22 }` | |
| `linkDash` | fn(link) => boolean | — | пунктир `6 5`; `linkTypes[...].dash` главнее |
| `linkLabels` | boolean | `true` | |
| `hulls` | `[{ id, label, members, color? }]` | `[]` | полоса через участников |
| `timeWindowMode` | `'dim'` \| `'hide'` | `'dim'` | в обоих режимах узлы без связей в окне бледнеют (шаг 6, как в dim и MapFlow) |
| `onSelect` | fn({ node, link, event }) | — | без него клик по ребру пиннит тултип; зовётся и на `select()`/`clearSelection()`, и с `event: null`, когда свёртка, фильтр, легенда или окно времени сдвигает или снимает выбор |
| `minWidth` | number | `0` | горизонтальная прокрутка только рисунка (`div.rc-graph-scroll`): заголовок, кнопки, легенда, навигатор и панель остаются на месте (шаг 6, D5) |
| `nodeRadius` | number | `18` во flow | ⚠️ 22 в остальных видах — один ключ, два дефолта |
| `tooltipFormat` / `linkTooltipFormat` | | | как в остальных видах Graph |

Методы: `setFilter(fn)`, `setTimeWindow(from, to)`, `select(id | { link })`, `clearSelection()`, `setLinkLabels(bool)`, `setHulls(list)`.
Подсказки узла: `lane`, `row`, `col`, `x`/`y` (доли 0..1), `sub`, `terminal`; ребро: `bend`.

#### Graph `view: 'flow'` — этап 2 (0.9.8_6, Flows II)

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `layout` | `'auto'` \| `'hints'` | `'auto'` | ⚠️ смена поведения: узлы **без** подсказок раскладываются автоматом (`graph/layouts/flowAuto.js`); узел с любой из `row`/`col`/`x`/`y` закреплён как в этапе 1. `'hints'` — поведение этапа 1. Дорожка без объявленного `weight` при `auto` шириной в число своих колонок |
| `folds` | `[{ id, label?, members: ids \| fn, anchor?, collapsed?, sub?, group? }]` | `[]` | свёртка в мета-узел `fold:<id>` на месте якоря; `label` = `fold.label` ?? метка якоря ?? `id`; `sub` — строка с `{n}` или `n => string` (по умолчанию «N nodes»); `group` — якоря, если свёртка не задаёт свою; якорь по умолчанию — первый участник в порядке `nodes` (не списка `members`); узел состоит в первой свёртке, что его заявила; вложенных свёрток нет; состояние свёрнутости переживает `setData`/`setFolds` |
| `onFoldChange` | fn({ id, collapsed, fold, event }) | — | |
| `aggregateLinks` | boolean | `false` | параллельные связи пары одной категории → одна (`value` суммой, исходники в `links`, тултип их перечисляет). Связи, задетые свёрткой, агрегируются всегда |
| `laneCap` | number | — | дорожка показывает не больше n узлов, включая «+N more»: n − 1 тяжёлых (сумма `value`, затем число связей) остаются, остальные — в свёртку `lane:<laneId>` (свёрнута по умолчанию); целое ≥ 1 (дробное молча игнорируется; `1` сворачивает всю дорожку); узлы из `folds` не считаются |
| `timeframes` / `navigator` | как у TimeSeries | — | по `start`/`end` связей; навигатор — число активных связей за день/месяц/год; окно = `setView`, `setTimeWindow` двигает вид |
| `defaultTimeframe` / `defaultView` | string / `[from, to]` | — | период, показанный первым; границы читаются как даты связей (число < 10000 — год, `YYYY`, `YYYY-MM`, ISO), клампятся к охвату связей; действуют при `timeframes` или `navigator` |

Подсказки данных: `main: true` на узле или связи — основной маршрут (строка 0) вместо автоматического.
Методы: `collapse(id)`, `expand(id)`, `isCollapsed(id)`, `setFolds(list)`; из базового Chart — `setTimeframe(key)`, `setView([from, to])`, `getView()`, `onViewChange(fn)`.
Мета-узел наружу (onSelect, tooltipFormat): `{ id: 'fold:<id>', label, sub, group, fold: '<id>', members: [узлы] }` — поля якоря не копируются (кроме позиции `row`/`col`/`x`/`y`). Агрегированная связь: поля первой исходной + `value` (сумма значений в окне), `start`/`end` (охват), `links` (исходные), `aggregate: true`; из нескольких исходных — ещё `id: 'agg:["s","t","key"]'` и `label: 'N ties'` (одна исходная сохраняет свои `id`/`label`).

#### MapFlow (`charts/MapFlow.js`) — 0.9.8_6, experimental

Наследует Map (геометрия, проекции, `fitPadding`, `zoom`, тема — без изменений). Внутреннее изменение Map: `_fitObject()` и сохранённые `_projection`/`_geoPath` для оверлея; публичный API Map не тронут.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `height` | number | `420` | вся карточка: шапка, кнопки периодов, навигатор, подвал; легенда типов — своей строкой сверх высоты |
| `nodes` / `links` (`flows`) | arrays | — | или `setData({ nodes, links })`; узел: `coords: [lon, lat]` или `country` (id фичи → центроид крупнейшего полигона), `color?` — цвет точки (иначе `theme.text`) |
| `linkTypes` | `{ type: { color, dash?, label } }` | — | без типа → `theme.muted` (подпись «connection»); неописанный тип → свободный цвет палитры, приглушённый, когда свободные кончились (`resolveLinkType`, 0.9.8_6) |
| `hiddenLinkTypes` | array | `[]` | |
| `linkLegend` | boolean | `true` | ⚠️ не `legend` — тот занят заголовочной легендой базового Chart |
| `linkWidth` | `{ by, scale, min, max }` | `{ by: 'value', scale: 'sqrt', min: 1, max: 6 }` | наконечник растёт с дугой медленнее |
| `timeframes` / `navigator` / `defaultView` / `defaultTimeframe` | как у TimeSeries | — | шкала времени по `start`/`end` потоков (любой из двух её включает); навигатор с осью; окно = вид, `setTimeWindow` двигает вид |
| `bend` | number | `0.18` | прогиб = (`bend` + 0.16 · номер в веере) × min(90, 0.6 × хорда) px — у дуг длиннее 150 px потолок `bend` × 90 px (`MapFlow.js:262`); встречные дуги расходятся сами (нормаль от направления) |
| `timeWindow` / `timeWindowMode` | `[from, to]` / `'hide'` \| `'dim'` | `null` / `'hide'` | |
| `fitTo` | `'features'` \| `'links'` | `'features'` | |
| `nodeRadius` / `nodeLabels` | number / boolean | `4` / `true` | ⚠️ третий дефолт `nodeRadius` в relation-классах (22 / 18 / 4) |
| `tooltipFormat` | fn({ node, links }) | встроенный | только места (0.9.8_6); сигнатура как у Graph |
| `regionTooltipFormat` | fn({ feature, item }) | встроенный Map | страна под потоками — payload `tooltipFormat` Map (0.9.8_6, шаг 3); `item` всегда `null` — данных регионов у MapFlow нет (шаг 6) |
| `linkTooltipFormat` | fn({ link, source, target }) | встроенный | сигнатура как у Graph |

Методы: `setData`, `setTimeWindow(from, to)`, `setLinkTypesVisible(types | null)`; из базового Chart — `setTimeframe`, `setView`, `getView`, `onViewChange`. Стрелка — у цели (свой треугольник, не `marker`: размер от толщины с замедлением). Нет `onSelect` — клик пиннит тултип.

#### Graph — общие опции, добавленные в 0.9.8_3 (ручной прогон 2026-10-16)

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `details` | `true` \| element \| selector | — | панель деталей в карточке: сбоку при ширине содержимого ≥ `detailsBreakpoint` и сохранённом `minWidth` холста (flow), иначе снизу с ростом карточки. В ego/path/cluster следует за наведением на узел, кликом по связи и фокусом; во flow — только за выбором (наведение её не меняет); `onSelect` есть только во flow. Элемент страницы получает класс `rc-graph-details` (стили `h4`, `dl`, `ul`, `.rc-graph-details-kind`, `.rc-graph-details-muted`), на `destroy` возвращается на место |
| `detailsFormat` | fn({ node, link, view }) => html | встроенный | для `details: true` |
| `detailsWidth` / `detailsBreakpoint` / `detailsHeight` | number | `300` / `1000` / `200` | |
| `fullscreen` | boolean | `true` | ⛶ в подвале; Fullscreen API, фоллбэк — фиксированный слой; метод `toggleFullscreen(on?)` |
| `hiddenLinkTypes` (flow) | array | `[]` | категории, скрытые с начала; узел без видимых связей прячется |
| `onNodeClick` | `'recenter'` \| fn({ node, event }) \| `null` | `'recenter'` | `null`/`false` — клик ничего не делает (шаг 6; раньше `null` читался как дефолт) |
| связи кластера | — | — | мета-связи вида cluster несут `weight = min(1, n/8)` (ширина) и `count = n` (число рёбер; шаг 6, раньше `strength`); толщина ребра — `weight ?? strength` |
| легенда (клавиатура) | — | — | кнопка легенды ego/flow сохраняет фокус после Enter/Space (R-16, шаг 6, `graph/legendFocus.js`; MapFlow — так же); Escape/× у списка скрытых узлов возвращает фокус на «+N more» (D7) |

**Graph — источник данных (`dataSource`, шаг 6).** `neighbors(id: string, { depth, types })` → `{ nodes, links }` (`types` — массив или `null`; вид path зовёт ещё `neighbors(id, { depth: 1 })` для контекста концов); `paths(a, b, { k })` → `{ paths: string[][] (кратчайший первым), nodes, links }` (без `paths` — TypeError в логе); `aggregates()` → `{ communities: [{ id, label, size, top }], links: [{ source, target, weight }] }` (`weight` = число связей). Ошибка запроса → console.error, вид не меняется, `whenReady()` резолвится. Модель копит, но не кэширует: каждый `focus`/`connect`/`overview`/`back` снова зовёт источник (O-09). `memorySource` — та же форма, у сообществ ещё `members`, id `c<n>`.

CSS-классы `.rc-graph-*` и `.rc-flow-*` — внутренние (не контракт), кроме `.rc-graph-details` и его строк `.rc-graph-details-kind` / `.rc-graph-details-muted`: ими пользуется своя панель страницы (демо flow).

#### Базовый `Chart` — `controls` (0.9.8_3)

`controls`: element | selector — элемент страницы переносится в карточку между холстом и подвалом (`.rc-chart-controls`), слушатели сохраняются. Общая опция всех классов; документирована в `/charts/settings/`.

## Открытые вопросы к заморозке

Решения — проход в 0.9.9, после боевого тестирования. Сгруппировано по весу.

### Кандидаты в блокеры (несоответствие обещанного и фактического)

- ✅ ~~**`export * as d3`**~~ → **K-13** (шаг 7): `RareCharts.d3` сужен до документированного подмножества — замороженный объект из 28 функций: всё, что берут сниппеты доков и `assets/charts/examples/**` (`format`, `timeFormat`, `timeMonth`, `sum`, `min`, `max`), плюс форматирование и разбор дат, массивы, шкалы, цвет, интервалы — только из модулей, которые бандл и так несёт. Замер min+gzip (`node scripts/build-charts.mjs --outdir`, Node zlib по умолчанию): 197 979 → 150 857 B (−47 122 B, −23,8%); без `d3` вовсе было бы 150 602 B — подмножество стоит 255 B. Breaking для страниц, бравших из `RareCharts.d3` другое (`select`, формы, geo): им грузить D3 самим (README, `/charts/installation/`). Отдельный бандл `rare-charts-maps` — по-прежнему кандидат 1.x.

- ✅ ~~Pie-alias~~ — `Pie` стал подклассом Donut с `innerRadius: 0`, C-05 `38edd4e`.
- ✅ ~~Per-series `strokeDash` в DualAxes мёртв~~ — общий нормализатор серий, C-03 `38edd4e`.
- ✅ ~~TimeSeries.setData не нормализует данные~~ — копирует, парсит и сортирует, C-06 `04c5d5c`.
- ✅ ~~Мёртвая дока OHLCV~~ — шапка: поля доходят до `tooltipFormat` (C-06); публичные README и installation — O-01.
- ✅ ~~Фиксированные id градиентов~~ — C-04 `38edd4e` (все id в `<defs>` — от `uid()` графика).
- ✅ **Overview как публичный класс** (K-04, шаг 7): остаётся публичным, документирован в одном месте — `/charts/line/time-series/#overview-standalone-navigator`; даты читает как графики.
- ✅ ~~**Частичный `margin` у Map/MultiChart**~~ — базовый Chart больше не доливает 8/70/16/0: не заданная сторона = 0. У Map, MapFlow, Graph, MultiChart гуттера нет; Donut, Pie, Gauge, Sankey заполняют карточку и `margin` не используют (Settings, Layout) — C-17, шаг 7a.

### Унификация имён и дефолтов (⚠️ из таблиц выше, сводно)

- **Моторный блок:** `duration` — 650 (Line/DualAxes/Donut) vs 500 (Bar) vs 800 (Gauge); `stagger` только у Bar; у TimeSeries/Overview блока нет вообще (опции молча игнорируются) → K-08.
- ✅ **`tooltipFormat` — сигнатуры сведены одним правилом** (K-09, шаг 7): формы сохранены ради совместимости, роли общие — payload-объект несёт ролевые поля, у формы «число, строка или узел первым» они приходят вторым аргументом. Таблица — `/charts/settings/#formatter-arguments`.
- ✅ **`valueFormat`** — то же правило (K-09, шаг 7): `(d, info)` Bar, `(v, info)` Donut, `(node, info)` HierarchicalBar, `(seg)` Bar stacked с ролевыми полями на сегменте.
- **Три семантики `area`:** Line — boolean + `areaOpacity`/`areaBaseline`; TimeSeries — `false|true|number`; Overview — `false|true|number`, `false` работает с 0.9.8_6 (T-06) → K-10.
- **Дефолты форматтеров/тиков** (→ K-10): `yTicks` 4 vs 5; `xTickFormat` `'%m/%d'` vs по размаху вида (TimeSeries и ось дат Bar, C-31 — шаг 7a); `yTickFormat` TimeSeries хардкодит `$`; `curve` `'monotone'` (Line/TS) vs `'linear'` (DualAxes); `strokeWidth` — опция серии у Line/DualAxes, у TimeSeries только `theme.strokeWidth` (дефолт везде — токен темы, 2; 0.9.8_6); `barWidthRatio` 0.72 (Bar) vs 0.65 (DualAxes).
- **Relation-классы (0.9.8_3, 0.9.8_6):** `tooltipFormat` узла — `({ node, links })` в Graph и MapFlow vs `({ node, incoming, outgoing })` в Sankey; `duration` по умолчанию добавил значение 600 (Sankey); `nodeRadius` 22 (ego/path/cluster) vs 18 (flow) vs 4 (MapFlow). `linkTooltipFormat({ link, source, target })` общий во всех трёх. Легенда типов: у Graph своя, у MapFlow — `linkLegend` (не `legend`).
- **`centerText`/`centerLabel`:** аргументы — по правилу K-09 (шаг 7): Donut `(data, { label, value })`, Gauge `(value, max, min, { value, max, min, percent, color })`; дефолты Donut и Gauge по-прежнему разные, у Gauge нет `valueFormat`/`percentFormat`.
- ✅ ~~**`annotationLabelHeight` + `margin.top`:** формулы Line/Bar и TimeSeries/DualAxes различаются при явном `margin.top`~~ — явный `margin.top` побеждает у всех четырёх (0.9.8_6, K-10).
- ⚠️ **Толщина горизонтального бара:** Bar — `barWidth` (0.9.8_6), HierarchicalBar — `barHeight` (дефолт — шрифт подписи значения + 2, 16 px). Свести к одному имени в 1.0 (до 1.0 не трогать).
- **`showY1Axis`/`showY2Axis`** vs `showYAxis`; Y1 = правая, Y2 = левая — контринтуитивно, зафиксировать в доках явно.
- ✅ **`viewSteps`** — устаревший алиас `timeframes` (K-04, шаг 7): работает, предупреждает один раз на график, удаление — 0.9.9; помечен устаревшим в документации.

### Недокументированные опции — ✅ закрыто 2026-07-03 (перед боевым тестом)

Выяснилось: сайт-дока была полнее шапок исходников — большинство пунктов ниже уже были в таблицах на сайте, «недокументированность» касалась шапок-комментариев в `src/`. Сделано:
- **Шапки исходников** дополнены: Line (`yTickValues`, `xTicks`, `yAxisPosition`, глобальный `strokeDash`, `markers`/`markerShape`/`markerSize`, `seriesName`/`lineColor`), TimeSeries (`areaColor`, `yTickFormat`/`xTickFormat`/`yTickValues`, уточнена семантика `area`), DualAxes (`curveTension`, `area`/`areaOpacity`/`areaBaseline`, `strokeDash`, `markers`×3), Donut (`labelContent`, фактические pie-дефолты), MultiChart (`animate`, `note`), Map (`identity`, `reflectY`, исправлена ложь про «required» `topoObject`).
- **Сайт-дока** дополнена реальными дырами: `defaultView` (не был описан нигде — добавлен на 4 страницы), `xTicks` (Line), `animate` (MultiChart), `reflectY` (Map).

**Осознанно НЕ документированы** (ждут решений 0.9.9): ~~`viewSteps`~~ (помечен устаревшим, K-04, шаг 7), ~~per-series `strokeDash` в DualAxes~~ (работает и документирован с 0.9.8_6, C-03), ~~опции Overview как отдельного класса~~ (публичный класс, `/charts/line/time-series/`, K-04, шаг 7).

### Мелочи и поведение

- ✅ **Bar: отрицательные значения в категориальном режиме** — домен был жёстко `[0, max]`, негативный бар получал отрицательную высоту и молча не рисовался (time-series режим негативы умел). **Исправлено 2026-07-06** (обе ориентации + подписи значений), покрыто `test/bar.test.js`. Найдено гэп-анализом «терминал».

- ✅ ~~**Donut NaN%** в drill-down~~ — исправлено C-19 (шаг 7a): узел, у которого все дети нераскрыты, — missing («N not disclosed»), не 0.
- ✅ ~~Donut: двойное применение `padAngle`~~ — не было: `pie.padAngle` резервирует, `arc.padAngle` рисует один зазор (закрыто аудитом 2026-10-21).
- ✅ ~~**Donut: повторяющиеся подписи и цвета при обновлении**~~ — слайсы сохраняются (ключ с номером повтора), fill ставится на каждом рендере — C-18 (шаг 7a).
- ✅ ~~**Gauge: `min`/`max` из опций**~~ — `min`/`max` из `setData` действуют на один вызов, база — опции (C-21, шаг 7a).
- ✅ ~~**DualAxes: `.nice(4)` захардкожен**~~ — авто-домен округляется по `y1Ticks`/`y2Ticks` (C-21, шаг 7a).
- ✅ ~~**MultiChart: дефолты margin захардкожены копией**~~ — мобильный режим по ширине контейнера; на пересечении брейкпоинта панель пересобирается с опциями своей стороны (C-15, шаг 7a).
- ✅ ~~**Map: молчаливые отказы**~~ — нет geo-опций → `console.warn`; ошибка загрузки → `console.error`, и `whenReady()` резолвится (K-12, шаг 7a).
- ❓ **Часовые пояса в таймфреймах** (`resolveTimeframeExtent`): local vs UTC, `YTD` нормализуется к полуночи, относительные окна — нет. Решить единообразно к 1.0. Найдено при написании тестов (B1) → T-10, 0.9.8_7.

---

## Матрица API ↔ документация (O-10, проверено на `2fad452`, исправления — шаги 6 и 7a)

Метод — AUDIT-INTERNAL §8. Код → документация: каждый публичный контракт из исходников и его основное описание; документация → код: каждое обещание на страницах `/charts/*`, в README, installation, settings/styles и баннере (здесь перечислены только оказавшиеся ложными). Статус «исправлено» — расхождение снято в коммите шага 6, «✅ исправлено (шаг 7a)» — исправлением открытых багов в шаге 7a; «решение» — контракт меняет шаг 7 (K-04/K-07/K-09/K-13) или ждёт решения владельца; «противоречит/нет описания» с ID — открытый баг аудита, доки описывают задуманное поведение. Приватные поля и `_`-методы исключены.

**Итог:** 485 контрактов — противоречит: 1, решение: 41, исправлено: 164 (из них в шаге 7a: 58), внутреннее: 15, нет описания: 14, совпадает: 250. До шага 7a: 478 — противоречит 8, решение 51, исправлено 122, внутреннее 15, нет описания 14, совпадает 268.


### Chart (общие опции), Line, TimeSeries, Overview, тема, CSS-токены

| Класс / режим | Контракт | Вид | Код | Основная дока | Статус | Задача / как проверено |
|---|---|---|---|---|---|---|
| export | `Line` | export | assets/charts/src/index.js:28; charts/Line.js:98 | /charts/line/ (charts/line/index.md) | ✅ совпадает | bundle exports probe p3-theme.mjs#exports |
| export | `TimeSeries` | export | index.js:29; charts/TimeSeries.js:47 | /charts/line/time-series/ | ✅ совпадает | p3-theme.mjs#exports |
| export | `Overview (standalone class)` | export | index.js; charts/Overview.js | README (строка таблицы со ссылкой); /charts/installation/ (строка таблицы); `/charts/line/time-series/#overview-standalone-navigator` | ✅ решено (шаг 7) | K-04; строковые даты — test/public-surface-k04.test.js |
| export | `defaultTimeframes` | export | core/Chart.js:11; index.js:44; Chart.js:442 | README.md:201 (name only); value stated on /charts/line/ :242 and /ch… | ✅ совпадает | p3-theme.mjs#version. Note: timeframes: true uses this very array by reference (Chart.js:… |
| export | `VERSION / DOCS_URL` | export | index.js:26-27; src/version.json | README.md:203 | ✅ совпадает | p3-theme.mjs#version |
| export | `generateMockPrices` | export | index.js (шапка: демо-хелпер вне гарантии) | README; /charts/installation/ — вне гарантии стабильности | ✅ решено (шаг 7) | K-04 |
| export | `d3 (documented subset)` | export | index.js | README; /charts/installation/ | ✅ решено (шаг 7) | K-13; test/exports.test.js |
| Chart (common) | `constructor(selector, options)` | method | core/Chart.js:18-25 | /charts/settings/ :77-83 | ✅ совпадает | read |
| Chart (common) | `title` | option | core/Chart.js:184-190 | /charts/settings/ :91 | ✅ совпадает | p1-chart.mjs#titleTag (H5, rgb(0,0,0)); #titleElement: an HTMLElement renders as text '[o… |
| Chart (common) | `subtitle` | option | core/Chart.js:192-198 | /charts/settings/ :92 | ✅ совпадает | p1-chart.mjs#titleElement |
| Chart (common) | `legend` | option | core/Chart.js:114-163 (indicator 130-146, text 149) | /charts/settings/ :42-44, :93, :98-112 | ✅ исправлено (доки) | O-07 |
| Chart (common) | `legendPosition` | option | core/Chart.js:109,166-175; width getter 417-423; CSS rare-c… | /charts/settings/ :94, :114 | ✅ исправлено (шаг 7a) | p1-chart.mjs#legendRight; K-19: с навигатором `controls` — между навигатором и подвалом (строки сетки: шапка 1, svg 2, навигатор 3, controls 4, подвал 5) — Chrome test/browser/charts-card-layout.test.js |
| Chart (common) | `source` | option | core/Chart.js:310-323, 395-413; CSS :114-140 | /charts/settings/ :120, :124-139 | ✅ исправлено (код+доки) | p1-chart.mjs#sourceLink, #sourceLinkCss; #sourceObjNoHref: { text: 'X' } without href ren… |
| Chart (common) | `note` | option | core/Chart.js:328-341; CSS :145-157 | /charts/settings/ :121 | ✅ совпадает | p1-chart.mjs#noteEl, #noteZero |
| Chart (common) | `controls` | option | core/Chart.js:363-393; destroy 703; CSS :877-895 | /charts/settings/ :122 | ✅ совпадает | p1-chart.mjs#controls → [true, true, ''] |
| Chart (common) | `height` | option | core/Chart.js:425-434; Line.js:114,208; TimeSeries.js:57,126 | /charts/settings/ :145; /charts/line/ :94,220; /charts/line/time-seri… | ✅ исправлено (шаг 7a) | p1-chart.mjs#heightStyle ['300px', 340]; C-32: минимум графика 80 px (`_keepPlotHeight`): карточка растёт на разницу и возвращается к `height`; высоту, заданную страницей, не трогает — test/chart-core-7a.test.js, Chrome charts-card-layout; доки: settings (Layout, `height`) |
| Chart (common) | `margin` | option | core/Chart.js:53-58; Line.js:109-122; TimeSeries.js:56-65 | /charts/settings/ :146; /charts/line/ :103, :224-230; /charts/line/ti… | ✅ исправлено (шаг 7a) | O-07; C-17: не заданная сторона частичного `margin` = 0 (база больше не доливает 8/70/16/0); Donut, Pie, Gauge, Sankey, Graph `margin` не используют — settings (Layout, `margin`) |
| Chart (common) | `theme` | option | core/Chart.js:50; core/theme.js:126-144 | /charts/settings/ :155-173; /charts/styles/ | ✅ совпадает | p1-chart.mjs#themeMerge; p3-theme.mjs#spreadDark ({...darkTheme, tooltip:{bg}} → tooltip.… |
| Chart (common) | `ariaLabel` | option | core/renderHelpers.js:35-43 (called Line.js:214, TimeSeries… | none | ✅ исправлено (доки) | O-07 |
| Chart (common) | `timeframes` | option | core/Chart.js:207-232, 440-447; core/utils.js:51-89 | /charts/line/ :54-85, :238-243; /charts/line/time-series/ :78-95, :14… | ✅ исправлено (шаг 7a) | p1-chart.mjs#timeframesTrue, #presetKeys (YTD, MAX, 10D, 2W, 1Y work; unknown 'foo' leave…; C-34: активная кнопка при совпадающих окнах — выбранный шаг, иначе ALL/MAX на весь размах, иначе первый; доки time-series (правило кнопок) — test/chart-core-7a.test.js |
| Chart (common) | `timeframes: step without key ({ label, range })` | other | core/Chart.js:224-226 (accepted), 633 (activeKey = step.key… | /charts/line/time-series/ :175 documents { key, label, range } | ✅ исправлено (код) | p1-chart.mjs#labelOnlyStep: timeframes [{ label: 'Jan', range }]; setTimeframe('Jan') app… |
| Chart (common) | `viewSteps (alias of timeframes)` | option | core/Chart.js `_getTimeframeOptions` | /charts/line/time-series/ (устаревший); README | ✅ решено (шаг 7) | K-04: console.warn один раз на график |
| Chart (common) | `defaultTimeframe` | option | core/Chart.js:578-580, 601-604 | /charts/line/ :60, :244-249; /charts/line/time-series/ :85, :220-225 | ✅ совпадает | T-02 |
| Chart (common) | `defaultView` | option | core/Chart.js:570-577 | /charts/line/ :250-255; /charts/line/time-series/ :226-231 | ✅ исправлено (доки) | p4-ts.mjs#defaultViewMiss (→ full), #defaultViewBoth (defaultView wins) |
| Chart (common) | `navigator` | option | core/Chart.js:509-568; Line.js:163-167; TimeSeries.js:119-1… | /charts/line/ :72, :78-85, :256-261; /charts/line/time-series/ :97-12… | ✅ исправлено (шаг 7a) | p1-chart.mjs#navigator=0 → true, #navigator="" → true; p4-ts.mjs#lineNavigatorSeries (1 p…; K-16 (частично): живые движения кисти — один рендер за кадр, конец жеста — сразу и через onViewChange; flow-вид по-прежнему ~33 мс на рендер (300 узлов / 900 связей) |
| Chart (common) | `navigator object (Overview options inside a chart)` | option | core/Chart.js:517-523; charts/Overview.js:35-43,111-115,156… | /charts/line/time-series/ :107-120, :236 | ✅ совпадает | p1-chart.mjs#navigatorDefaults, #navigatorTS |
| Chart (common) | `setView(extent, { silent })` | method | core/Chart.js:642-655 | /charts/line/ :65, :73; /charts/line/time-series/ :127, :376-379 | ✅ исправлено (доки) | p1-chart.mjs#onViewChange (silent suppresses; setView(null) → full range, reported), #set… |
| Chart (common) | `getView()` | method | core/Chart.js:657-659 | /charts/line/ :74; /charts/line/time-series/ :381-384 | ✅ совпадает | p1-chart.mjs#getViewBeforeData → null |
| Chart (common) | `onViewChange(fn)` | callback | core/Chart.js:653, 688-691; Overview brush end Chart.js:562… | /charts/line/ :75; /charts/line/time-series/ :130-133, :386-389 | ✅ исправлено (шаг 7a) | p1-chart.mjs#onViewChange; #destroy callbacksAfterDestroy 2; C-33: после destroy() не вызывается (Chart._emit), в том числе для жеста кисти, закончившегося после него |
| Chart (common) | `setTimeframe(key, { silent })` | method | core/Chart.js:661-668 | only /charts/graph/flow/ :139 and /charts/map/flow/ :74,120 (relation… | ✅ исправлено (доки) | p1-chart.mjs#presetKeys, #onViewChange |
| Chart (common) | `scaleToggle` | option | core/Chart.js:236-246, 257-285; CSS :181-189, :770-779 | /charts/line/ :76, :135, :284-288; /charts/line/time-series/ :139, :2… | ✅ совпадает | p1-chart.mjs#scaleToggle, #scaleToggleBar |
| Line | `setYScale(type, { silent })` | method | charts/Line.js:146-152 | /charts/line/ :148-151, :281 | ✅ совпадает | p1-chart.mjs#scaleToggle (chainable true; 'weird' → linear) |
| TimeSeries | `setYScale(type, { silent })` | method | charts/TimeSeries.js:93-99 | /charts/line/time-series/ :391-394 | ✅ совпадает | — |
| Chart (common) | `onScaleChange(fn)` | callback | core/Chart.js:288-296 | /charts/line/ :146; /charts/line/time-series/ :396-399 | ✅ исправлено (шаг 7a) | p1-chart.mjs#scaleToggle got payloads; fires after destroy (#destroy); C-33: после destroy() не вызывается (Chart._emit) |
| Chart (common) | `destroy()` | method | core/Chart.js:700-731; render guard 41-46 | /charts/settings/ :277-281 | ✅ исправлено (шаг 7a) | p1-chart.mjs#destroy: container emptied, class back to 'mine', style removed, setData aft…; C-33: обнуляет onViewChange/onScaleChange, снимает отложенный кадр кисти; Overview.destroy() сбрасывает onBrush — доки settings «destroy()» |
| Chart (common) | `whenReady()` | method | core/Chart.js (whenReady); Graph.js (своя); Map.js (`_ready`) | charts/settings/index.md «whenReady()»; README (общий шаблон) | ✅ исправлено (шаг 7a) | K-12: Graph — запросы и раскладка, Map/MapFlow — геометрия (и при ошибке), остальные — сразу; test/chart-core-7a.test.js, test/map.test.js |
| Chart (common) / TimeSeries | `setData(data) — common contract` | method | charts/Line.js:135-141; charts/TimeSeries.js:81-89; core/Ch… | /charts/settings/ :266-275; CHANGELOG.md:89 | ✅ исправлено (код) | p1-chart.mjs#setDataReapplyTimeSeries: after setTimeframe('3M') + setData(shifted data) v… |
| Chart (common) | `empty state (setData([]), empty window)` | other | core/Chart.js:675-682; Line.js:246,273; TimeSeries.js:161-1… | /charts/settings/ :268 | ✅ совпадает | p4-ts.mjs#setDataEmpty (0 paths, navigator display none for Line and TS); #setDataNull |
| Chart (common) | `resize (automatic, no public method)` | other | core/Chart.js:85-86, 436-438 | /charts/installation/ :84; README.md:56 | ✅ совпадает | — |
| Chart (common) | `fonts (no webfont; re-render on document.fonts.ready)` | other | core/Chart.js:92-97; rare-charts.css:9-26 | /charts/installation/ :147-156; README.md:23-31; /charts/styles/ :33 | ✅ совпадает | — |
| Chart (common) | `render()` | method | core/Chart.js:41-46, 693-695; Line.js:245; TimeSeries.js:168 | none | внутреннее | — |
| Chart (common) | `width / height getters; instance fields container, options, theme, ma…` | other | core/Chart.js:19,50-58,417-434; TimeSeries.js:136-139,198-2… | CHANGELOG.md:63 names `TimeSeries.clipId` | внутреннее | X-06 |
| Chart (common) | `header creation` | other | core/Chart.js:106-111, 178 | /charts/settings/ :96 | ✅ исправлено (доки) | p1-chart.mjs#headerTimeframesOnly → a header exists with only timeframes |
| Line | `single series [{ date, value }]` | data | charts/Line.js:176-187; core/seriesPath.js:24-39 | /charts/line/ :19-28, :52 | ✅ совпадает | p4-ts.mjs#lineInputCopy (caller array unchanged, invalid rows dropped) |
| Line | `multi series { name?, color?, values, ...style }` | data | charts/Line.js:189-202; core/seriesPath.js:51-65 | /charts/line/ :30-50, :499-588 | ✅ совпадает | — |
| Line | `band series { type:'band', values:[{ date, lower, upper }], fillOpaci…` | data | charts/Line.js:194-200, 379-385; core/seriesPath.js:63 | /charts/line/band/ :19-59, :125-163 | ✅ исправлено (доки) | p2-line.mjs#bandOpacity → '0.12' default, '0.3' with chart areaOpacity 0.3 |
| Line | `seriesName` | option | charts/Line.js:182; renderHelpers.js:250-254 | /charts/line/ :28, :488-491 | ✅ исправлено (доки) | p2-line.mjs#endLabels with seriesName 'Revenue' → ['100'] |
| Line | `lineColor` | option | charts/Line.js:183 | /charts/line/ :494-497; /charts/settings/ :194-198 | ✅ совпадает | — |
| Line | `series.name` | data | core/seriesPath.js:55; Line.js:380,390,399 (join key) | /charts/line/ :506-509 | ✅ исправлено (доки) | p2-line.mjs#nameInLegend → no legend is built from series |
| Line | `per-series style: color, strokeWidth, strokeDash, curve, area, areaOp…` | data | charts/Line.js:379-436; renderHelpers.js:385-426 | /charts/line/ :191-193, :511-582 | ✅ совпадает | C-03 |
| Line | `yAxisPosition` | option | charts/Line.js:109-119, 369-373 | /charts/line/ :119-127, :232-237 | ✅ исправлено (код+доки) | Chrome browser.mjs#left: end label '120' at x 603–628 px inside a 600 px card (clipped by… |
| Line / right axis | `endLabels` | option | charts/Line.js:429-433; renderHelpers.js:224-266 | /charts/line/ :167-171, :440-443 | ✅ совпадает | p2-line.mjs#endLabels; see yAxisPosition row for the left-axis clip |
| Line | `animate / duration / ease` | option | charts/Line.js (EntryMotion); core/entryMotion.js (drawLinesIn) | /charts/line/ :105, :461-480 | ✅ исправлено (шаг 7a) | C-16: общий таймлайн входа (core/entryMotion.js); рендер посреди него продолжает рисование с уже нарисованной доли на новой длине; один раз на экземпляр — test/entry-motion.test.js, Chrome test/browser/charts-entry-motion.test.js |
| Line | `yScale` | option | charts/Line.js:253, 259-272, 309-324; utils.js:226-255 | /charts/line/ :129-151, :277-282 | ✅ совпадает | p2-line.mjs#logWarn |
| Line | `yTicks / yTickValues` | option | charts/Line.js:300, 313-321; utils.js:214-219 | /charts/line/ :117, :271-276, :301-306; /charts/line/annotations/ :100 | ✅ совпадает | p2-line.mjs#tsYTickValuesOutside lineTicks 0/100/200 inside the plot |
| Line | `yFormat + default yTickFormat (number / percent)` | option | charts/Line.js:325-338 | /charts/line/ :111, :115, :265-270 | ✅ исправлено (шаг 7a) | C-30: тики по шагу (`,~f` < 1000, `~s` с одним префиксом ≥ 1000, 0 → `0`); подписи концов и тултип — 3 значащие (`.3~r`/`.3~s`); percent `+.2%` и log `.3~s` без изменений; явный yTickFormat форматирует все три — test/default-formats.test.js |
| Line | `zeroEpsilon / yPrefix / ySuffix / yTickFormat` | option | charts/Line.js:329-338 | /charts/line/ :113-115, :295-330; /charts/settings/ :204-220 | ✅ совпадает | p2-line.mjs#lineYFormat |
| Line | `yLabelsOnly` | option | core/renderHelpers.js:154-175 | /charts/line/ :117, :319-324 | ✅ совпадает | — |
| Line | `xTickFormat / xTicks` | option | charts/Line.js:340, 363; renderHelpers.js:102-139 | /charts/line/ :153-161, :290-294, :334-339 | ✅ совпадает | — |
| Line | `showGrid / showXAxis / showYAxis` | option | charts/Line.js:117-119, 354-376 | /charts/line/ :404-423 | ✅ совпадает | — |
| Line | `crosshair` | option | charts/Line.js:443-450; core/Crosshair.js:41-57 | /charts/line/ :173-175, :427-432; /charts/settings/ :222-228 | ✅ совпадает | — |
| Line | `tooltipFormat (Line)` | callback | core/Crosshair.js | /charts/line/ (опция и :183); /charts/settings/#formatter-arguments | ✅ решено (шаг 7) | K-09: у точек `series` |
| Line | `default crosshair tooltip` | other | core/Crosshair.js:128-131 | /charts/settings/ :236-247 | ✅ совпадает | — |
| Line | `curve / curveTension` | option | core/utils.js:135-146; Line.js:343-344 | /charts/line/ :185, :343-354; /charts/line/visual-options/ :15-25 | ✅ совпадает | — |
| Line | `strokeDash (chart and series)` | option | core/utils.js:163-175; Line.js:405 | /charts/line/ :355-360, :523-528; /charts/line/visual-options/ :43 | ✅ исправлено (доки) | p2-line.mjs#strokeDash |
| Line | `area / areaOpacity` | option | charts/Line.js:345-346, 388-395 | /charts/line/ :187, :364-375 | ✅ совпадает | — |
| Line | `areaBaseline` | option | core/seriesPath.js:76-80, 115-126; Line.js:347,393 | /charts/line/ :187, :376-381; /charts/line/visual-options/ :51-54 | ✅ исправлено (код+доки) | p2-line.mjs#areaZeroPositive: data 100–119, plot H 212, fill reaches y 1159 (947 px below… |
| Line | `markers / markerShape / markerSize` | option | charts/Line.js:349-351, 436; renderHelpers.js:385-426; util… | /charts/line/ :189, :385-402; /charts/line/visual-options/ :67-79 | ✅ совпадает | — |
| Line | `annotations (Line, TimeSeries)` | option | core/utils.js:275-354; renderHelpers.js:460-706; Line.js:10… | /charts/line/annotations/ | ✅ совпадает | — |
| TimeSeries / TimeSeries | `annotationLabelHeight + explicit margin.top` | option | charts/TimeSeries.js:59 vs Line.js:116 | /charts/line/annotations/ :87-94; /charts/line/time-series/ :343-347 | ✅ исправлено (код) | p1-chart.mjs#marginLineAnnTop5 → top 5; #marginTSAnnTop5 → top 26 |
| TimeSeries | `data [{ date, value, ...extra }]` | data | charts/TimeSeries.js:81-89; core/seriesPath.js:24-39 | /charts/line/time-series/ :366-369 | ✅ совпадает | C-06 |
| TimeSeries | `appendPoint(point)` | method | charts/TimeSeries.js:107-113 | /charts/line/time-series/ :370-374 | ✅ исправлено (код+доки) | p4-ts.mjs#appendPointWindow: setTimeframe('1M') then appendPoint 10 days later → view sti… |
| TimeSeries | `tooltipFormat (TimeSeries)` | callback | charts/TimeSeries.js | /charts/line/time-series/ (опция); /charts/settings/#formatter-arguments | ✅ решено (шаг 7) | K-09: `(row, { date, value, color })` |
| TimeSeries | `default tooltip` | other | charts/TimeSeries.js:411-421 | none | ✅ исправлено (доки) | K-10 |
| TimeSeries | `crosshair (not supported)` | option | charts/TimeSeries.js:370-409 (hover always bound) | /charts/settings/ :224-228 | ✅ исправлено (код+доки) | p2-line.mjs#tsCrosshairFalse: new TimeSeries(el, { crosshair: false }) → hover still show… |
| TimeSeries | `line colour and width` | other | charts/TimeSeries.js:282-287 | none | ✅ исправлено (доки) | p2-line.mjs#tsLineColorStroke (lineColor ignored, accent used); #themeSizing tsStrokeWidt… |
| TimeSeries | `area / areaColor` | option | charts/TimeSeries.js:240-280 | /charts/line/time-series/ :313-324 | ✅ совпадает | — |
| TimeSeries | `curve` | option | charts/TimeSeries.js:223-233 | /charts/line/time-series/ :307-312 | ✅ совпадает | — |
| TimeSeries | `yTicks / yTickFormat / xTickFormat / yLabelsOnly / showGrid / showXAx…` | option | charts/TimeSeries.js:56-62, 197-312 | /charts/line/time-series/ :241-303 | ✅ исправлено (шаг 7a) | C-31: дефолт xTickFormat — по размаху вида (`%H:%M` / `%b %d` / `%b` / `%b '%y` / `%Y`), явный формат побеждает — test/default-formats.test.js |
| TimeSeries / linear scale | `yTickValues` | option | charts/TimeSeries.js:199-213 | /charts/line/time-series/ :271-276 | ✅ исправлено (код+доки) | Chrome browser.mjs#ts: yTickValues [0,110,200] on data 100–119 → '$0' at y 1969 and '$200… |
| TimeSeries | `wheel zoom / drag pan` | other | charts/TimeSeries.js:336-366 | /charts/line/time-series/ :388 | ✅ совпадает | — |
| Overview | `Overview.setData(data, onBrush, { extent })` | method | charts/Overview.js | `/charts/line/time-series/#overview-standalone-navigator` | ✅ решено (шаг 7) | K-04 |
| Overview | `Overview.setBrush(extent)` | method | charts/Overview.js | `/charts/line/time-series/#overview-standalone-navigator` | ✅ решено (шаг 7) | K-04 |
| Overview | `Overview.destroy()` | method | charts/Overview.js | `/charts/line/time-series/#overview-standalone-navigator` | ✅ решено (шаг 7) | K-04 |
| Overview | `Overview options margin / axis / area:false / brushColor` | option | charts/Overview.js:13-23, 41-43, 117-118, 156-177, 206-212 | /charts/line/time-series/ :120, :236 (as navigator options) | ✅ совпадает | — |
| theme | `defaultTheme` | export | core/theme.js:8-84 | /charts/styles/ :37-97, :166-232 | ✅ исправлено (доки) | O-05 |
| theme | `darkTheme` | export | core/theme.js:88-112 | /charts/styles/ :105-109; tooltip column :222-230 | ✅ исправлено (доки) | O-05 |
| theme | `createTheme(overrides, base = defaultTheme)` | export | core/theme.js:126-144 | /charts/styles/ :117-143; README.md:200 | ✅ совпадает | p3-theme.mjs#createThemeBase, #createThemeHeaderString, #createThemeNull, #createThemeCol… |
| theme | `bg / surface / grid / border / crosshair / text / muted / accent / co…` | theme-token | consumers: bg renderHelpers.js:248,392,636,688, Crosshair.j… | /charts/styles/ :170-182 | ✅ совпадает | grep of theme reads; p3-theme.mjs#headerColors |
| theme | `positive / negative` | theme-token | core/theme.js:27-28 (no reader in src/) | /charts/styles/ :179-180 | ✅ исправлено (доки) | grep -rn '\.positive\\\|\.negative' assets/charts/src → only theme.js; the Time Series de… |
| theme | `font / numericFont / fontSize` | theme-token | core/Tooltip.js:31; theme.js:46-52 | /charts/styles/ :71-78, :184-190, :205 | ✅ совпадает | p3-theme.mjs#tooltipVars (numericFont null → font) |
| theme | `strokeWidth` | theme-token | charts/Line.js (s.strokeWidth ?? t.strokeWidth ?? 2); DualAxes.js; TimeSeries.js | /charts/styles/ :211, :216; core/theme.js:3-4 | ✅ исправлено (шаг 7a) | C-22: fallback читается с шага 6 (`a827820`); пункт C-22 закрыт в шаге 7a |
| theme | `dotRadius` | theme-token | core/Crosshair.js (t.dotRadius ?? 3) | /charts/styles/ :212; core/theme.js:57 | ✅ исправлено (шаг 7a) | C-22: fallback читается с шага 6 (`a827820`); пункт C-22 закрыт в шаге 7a |
| theme | `markerSize` | theme-token | charts/Line.js, DualAxes.js (o.markerSize ?? t.markerSize ?? 4) | /charts/styles/ :213, :216 | ✅ исправлено (шаг 7a) | C-22: fallback читается с шага 6 (`a827820`); пункт C-22 закрыт в шаге 7a |
| theme | `barOpacity` | theme-token | charts/DualAxes.js (o.barOpacity ?? t.barOpacity ?? 0.35) | /charts/styles/ :214; /charts/settings/ :200 | ✅ исправлено (шаг 7a) | C-22: fallback читается с шага 6 (`a827820`); пункт C-22 закрыт в шаге 7a |
| theme | `map.matchFill / map.unmatchedFill / map.ocean / map.border` | theme-token | charts/Map.js:233-269 | /charts/map/ :114 (points to /src/core/theme.js), :262 (ocean only) | нет описания | O-05, O-06 |
| theme | `map.hoverBrighten / map.graticule` | theme-token | charts/Map.js (hoverFillFor; _graticule) | charts/map/index.md (hover, graticule); charts/styles/index.md (Map) | ✅ исправлено (шаг 7a) | C-22: test/map.test.js |
| theme | `tooltip.bg / border / text / muted / shadow` | theme-token | core/Tooltip.js:29-36; rare-charts.css:444-458 | /charts/styles/ :218-240; /charts/settings/ :249-264 | ✅ совпадает | p3-theme.mjs#tooltipVars, #tooltipVarsDefault |
| theme | `tooltip.header.text / tooltip.header.bg` | theme-token | core/Tooltip.js:37-39; rare-charts.css:463-468, 517-522 | /charts/styles/ :229-232 | ✅ совпадает | p3-theme.mjs#tooltipVars (class rc-tooltip--header-band added) |
| CSS | `--rc-font-family / --rc-font-family-numeric / --rc-font-size / --rc-f…` | css-token | rare-charts.css:12-15, 26, 86, 98, 448, 566 | /charts/styles/ :25-28, :194-199 | ✅ совпадает | p3-theme.mjs#cssTokens |
| CSS | `--rc-space-xs / -sm / -md / -lg` | css-token | rare-charts.css:18-21 | /charts/styles/ :29, :200-203 | ✅ совпадает | — |
| CSS | `--rc-scale-btn-fill` | css-token | rare-charts.css:24, 770-779 | CHANGELOG.md:121 only | ✅ исправлено (шаг 7a) | C-24: заливка Lin/Log — `background-image` на `.rc-range-btn.rc-scale-btn` (0,2,0) и `[data-scale="log"]` (0,3,0), хостовый `button:hover` (Rare Styles) её не снимает; `:hover` кнопок диапазона — `background-color: transparent` — Chrome charts-card-layout |
| CSS | `--rc-tooltip-font / -text / -muted / -bg / -border / -shadow / -heade…` | css-token | core/Tooltip.js:31-38; rare-charts.css:448-522 | /charts/styles/ :21 ('--rc-tooltip-*' only) | ✅ исправлено (доки) | — |
| CSS | `.rc-chart (and the override selector)` | css-class | rare-charts.css:9-55; index.js:11-20 (#rc-base-styles appen… | /charts/styles/ :13-33 | ✅ совпадает | — |
| CSS | `.rc-chart container: rc-chart / inline-size; @container rc-chart (max-width: 460px)` | css-class | rare-charts.css | charts/styles/index.md (Layer 1); charts/settings/index.md (Header) | ✅ исправлено (шаг 7a) | K-17: шапка складывается по ширине карточки, не окна — Chrome charts-card-layout |
| (бандл) | `window.RareChartsConfig.injectStyles` | other | src/index.js | charts/installation/index.md «Strict Content Security Policy» | ✅ исправлено (шаг 7a) | K-18: `false` до бандла — без внедрённого `<style>`; `<link id="rc-base-styles">` тоже; Chrome с мета-CSP (charts-card-layout) |
| CSS | `.rc-tooltip and row classes` | css-class | rare-charts.css:444-541 | /charts/styles/ :240; /charts/settings/ :244, :264 | ✅ исправлено (доки) | — |
| CSS | `.rc-cross-line / .rc-chart-controls / .rc-chart-note / .rc-ts-grad /…` | css-class | core/Crosshair.js:22; rare-charts.css:145, 877; TimeSeries.… | /charts/settings/ :121-122, :264; CHANGELOG.md:63 | ✅ совпадает | — |
| CSS | `.rc-range-btn.active (selected timeframe)` | css-class | core/Chart.js:223, 638; rare-charts.css:740-765 | none | решение | K-06 |

Ложные обещания документации: 59, исправлено 50 (из них 2 — шаг 7a: `/charts/line/`:467 — C-16; заголовок core/theme.js — C-22).
Открытые:

- `/charts/settings/`:242 — `points` is an array of `{ name, value, color, fmt }` → Line/DualAxes points also carry axis, type, date; band entries carry lower/upper instead of value (p2-line.mjs#crosshairPayload)
- `/charts/`:52 — All charts follow a unified configuration model and data structure. → tooltipFormat/valueFormat/centerText argument shapes differ per class (Line {date, points}, TimeSeries (row), …)
- `/charts/line/`:437 — tooltipFormat `({ date, points }) => html` — where `points` is `[{name, value, color}]` (also :179) → points also carry fmt, axis, type, date; band entries have lower/upper and no value
- `/charts/line/annotations/ (charts/line/annotations/index.md…`:87 — The chart automatically pushes its top margin down by `annotationLabelHeight + 4` pixels when at least one annotation is configured → top becomes max(default top, annotationLabelHeight + 4): Line 10 → 26, not 36; TimeSeries 16 → 26
- `/charts/line/annotations/`:340 — annotations: Array of point and/or range annotations. Mixed entries are allowed. → All four kinds (point, range, horizontal line, horizontal band) — utils.js:275-354
- `README.md`:64 — RareCharts.Overview — Standalone brush navigator for selecting a time range → Not a Chart; setData(data, onBrush, { extent }) with unparsed Date rows (string dates draw NaN); no docs page
- `README.md`:196 — The global bundle also exports: … (list without generateMockPrices) → RareCharts.generateMockPrices is exported and used by the published Time Series demo
- `build banner (scripts/build-charts.mjs)`:28 — Usage: new RareCharts.<Type>(selector, options).setData(data) … Types: Line, TimeSeries, Overview, … → Overview is not a Chart: setData(data, onBrush, { extent })
- `source header assets/charts/src/core/Tooltip.js`:28 — null / '' leaves a property unset: the CSS fallback applies. → null first falls back to the chart token (tooltip.text → theme.text …) and shadow null → 'none' (Tooltip.js:32-36); only '' (or a null chart token) reaches the…

<sub>Scope verified at HEAD 2fad452 (v0.9.8_6), bundle rebuilt from HEAD into scratch (byte-identical to assets/charts/rare-charts.js). Contracts reviewed: 107 rows (8 exports; 34 Chart-common options/methods/callbacks/behaviours incl. excluded internals; 31 Line; 16 TimeSeries; 5 Overview; 16 theme incl. tooltip.* and map.*; 7 CSS tokens/classes groups). Status: ok 52, missing 20, contradicts 21, decision 17 (K-04 ×6, K-09 ×3, K-13, K-06, C-22 ×6; C-22 закрыт в шаге 7a), internal 2 (render(); width/height getters + instance fields). Private underscore methods/fields of Chart, Line, TimeSeries, Overview (_renderHeader,…</sub>

### Bar, HierarchicalBar, DualAxes, MultiChart

| Класс / режим | Контракт | Вид | Код | Основная дока | Статус | Задача / как проверено |
|---|---|---|---|---|---|---|
| export | `RareCharts.Bar` | export | assets/charts/src/index.js:32 | charts/bar/index.md; assets/charts/README.md:65 | нет описания | test/exports.test.js |
| export | `RareCharts.HierarchicalBar` | export | assets/charts/src/index.js:33 | charts/bar/hierarchical-bar/index.md; README: none | нет описания | O-01, O-04 |
| export | `RareCharts.DualAxes` | export | assets/charts/src/index.js:34 | charts/line/dual-axes/index.md; README:66 | ✅ совпадает | test/exports.test.js |
| export | `RareCharts.MultiChart` | export | assets/charts/src/index.js:39 | charts/multi/index.md; README:71 | ✅ совпадает | test/exports.test.js |
| common (Bar, HierarchicalBar, DualAxes, MultiChart) | `underscore members and render internals (_renderStacked, _stackSegmen…` | other | Bar.js:110-122; HierarchicalBar.js:55-82; DualAxes.js:141-2… | none | внутреннее | O-10 |
| common (Bar, HierarchicalBar, DualAxes, MultiChart) | `render()` | method | core/Chart.js:46,693; MultiChart.js:204 (no-op); called by… | none (no page, README or Settings mention) | нет описания | grep 'render()' charts/**/index.md README → no hit |
| common (Bar date mode, DualAxes) | `setTimeframe(key, { silent })` | method | core/Chart.js:661-668 | none on bar/dual-axes pages (only charts/graph/flow, charts/map/flow) | ✅ исправлено (доки) | grep setTimeframe charts/ → graph/flow, graph, map/flow only |
| common (Bar date mode, DualAxes) | `onViewChange(fn) / setView(extent, { silent }) / getView()` | callback | core/Chart.js:642-659,688-691 | charts/bar/index.md:102-104; charts/line/dual-axes/index.md:57-59 | ✅ исправлено (доки) | T-04, T-05 |
| common (Bar date mode, DualAxes) | `viewSteps (alias of timeframes)` | option | core/Chart.js `_getTimeframeOptions` | /charts/line/time-series/ (устаревший); README | ✅ решено (шаг 7) | K-04 |
| Bar | `constructor(selector, options) / setData(data)` | method | Bar.js:82-162 | charts/bar/index.md:25-59 | ✅ совпадает | test/bar.test.js 'falls back to plain single-series bars'; test/charts-smoke.test… |
| Bar | `categorical rows { label, value, color? }` | data | Bar.js:148-157 | charts/bar/index.md:27-38 | ✅ исправлено (доки) | CHANGELOG v0.9.8_6 Fixed 'Input'; code read |
| Bar / date | `date rows { date, value, color? }` | data | Bar.js:138-147 | charts/bar/index.md:40-46 | ✅ совпадает | test/annotations.test.js 'Bar (dates)' |
| Bar / date + horizontal | `date rows with orientation: 'horizontal'` | data | Bar.js:246,257,263-273 (horizontal path keys bands by d.lab… | charts/bar/index.md:40 ('time-based vertical mode'); Bar.js:8 '(verti… | ✅ исправлено (код+доки) | probe bar.test.js P-B4: 3 dated rows → 3 rects with identical y=34.4, category labels [''] |
| Bar / stacked | `stacked series [{ name, color?, values:[{label,value}] }]` | data | Bar.js:689-743 | charts/bar/stacked-bar/index.md:19-29 | ✅ исправлено (доки) | probe P-B5: S1 Q2 value -5 → no segment (3 of 4 drawn) |
| Bar | `row color (B-01)` | data | Bar.js:233-234,369,534,639 | charts/bar/index.md:36,65-77 | ✅ совпадает | test/bar-color.test.js |
| Bar | `height` | option | Bar.js:100,175 | charts/bar/index.md:186-190 | ✅ совпадает | — |
| Bar | `margin` | option | Bar.js:85-106 | charts/bar/index.md:192-200 | ✅ исправлено (шаг 7a) | probe P-B7: {12,65,8,0} / {12,0,16,65} / hidden {12,0,0,0} / ann {26,…} / ann+top0 {0,…};…; C-39: у horizontal левый отступ измеряется по подписям (65 px … 40% ширины), явный `margin.left` сохраняется |
| Bar | `orientation` | option | Bar.js:88,228,787 | charts/bar/index.md:202-206 | ✅ совпадает | — |
| Bar / categorical / stacked / horizontal | `timeframes` | option | core/Chart.js:102-249 (buttons built in the constructor, be… | charts/bar/index.md:57,208-212; charts/bar/stacked-bar/index.md:61 | ✅ исправлено (код+доки) | probe P-B1: categorical + timeframes:true → 6 .rc-range-btn, click → getView() null; prob… |
| Bar / date | `defaultTimeframe / defaultView` | option | core/Chart.js:570-583 | charts/bar/index.md:214-224 | ✅ совпадает | — |
| Bar / categorical / stacked / horizontal | `navigator` | option | core/Chart.js:83,525-544 (strip built in constructor); char… | charts/bar/index.md:226-230; charts/bar/stacked-bar/index.md:61 | ✅ исправлено (код+доки) | probe P-B2: categorical + navigator:true → .rc-chart-navigator present, display '', 1 chi… |
| Bar / date (vertical) | `annotations` | option | Bar.js:95-97,213-218,684; core/renderHelpers.js:460 | charts/bar/index.md:114-134,235-239 | ✅ совпадает | test/annotations.test.js 'Bar (dates)', 'Bar — annotations outside the date mode'; probe… |
| Bar | `annotationLabelHeight` | option | Bar.js:96-97,684 | charts/bar/index.md:241-245 | ✅ совпадает | — |
| Bar | `barColor` | option | Bar.js:233 | charts/bar/index.md:250-254 | ✅ совпадает | — |
| Bar | `barWidth` | option | Bar.js:272,484,589-596,810; core/barLayout.js:8-18 | charts/bar/index.md:61-79,256-263; stacked-bar/index.md:87-91 | ✅ совпадает | test/bar-width.test.js; test/barLayout.test.js |
| Bar / date | `barWidthRatio` | option | Bar.js:590-594 | charts/bar/index.md:265-269 | ✅ совпадает | probe P-B12: 3 monthly bars → width 48 |
| Bar | `labelMaxLength` | option | Bar.js:194-198,915-924 | charts/bar/index.md:83,271-278 | ✅ исправлено (шаг 7a) | test/tooltip.test.js 'Bar: the full text of a truncated axis label'; C-39: горизонтальный отступ подписей измеряется, 65 px … 40% ширины, многоточие + тултип — test/bar-category-gutter.test.js |
| Bar / stacked | `animate` | option | Bar.js:229,541; stacked: 788,903-911 | charts/bar/index.md:144,283-287; stacked-bar/index.md:11,61 | ✅ исправлено (шаг 7a) | probe P-B5: stacked segments start at opacity 0 with final heights; C-16: один раз на экземпляр; рендер посреди входа продолжает рост; подписи значений проявляются на месте (C-25) — test/entry-motion.test.js |
| Bar | `duration / ease` | option | Bar.js:230-232,789-790 | charts/bar/index.md:289-305 | ✅ совпадает | K-08 |
| Bar / stacked | `stagger` | option | Bar.js:231,374,543,644; not passed to _animateSegments (Bar… | charts/bar/index.md:295-299; stacked-bar/index.md:61 | ✅ исправлено (доки) | code read; probe P-B5 (stagger:100 → all segments share one transition) |
| Bar / horizontal | `showValues` | option | Bar.js:284,300-334,384-428 | charts/bar/index.md:136-140,310-314 | ✅ исправлено (шаг 7a) | probe P-B11 (0 labels in stacked and vertical); test/bar.test.js; C-25: подписи ставятся по шкале текущего рендера; во время входа проявляются на месте |
| Bar | `valueFormat` | option | Bar.js `_barRole`, `_stackSegments` | charts/bar/index.md (опция); stacked-bar/index.md | ✅ решено (шаг 7) | K-09 |
| Bar / horizontal | `valueOffset / valueInsideGap` | option | Bar.js:285-286,320-322,392-400 | charts/bar/index.md:325-337 | ✅ совпадает | test/bar.test.js |
| Bar | `yTickFormat` | option | Bar.js:504,610,895 | charts/bar/index.md:342-346; stacked-bar/index.md:99-103 | ✅ исправлено (шаг 7a) | C-30: дефолт по шагу тиков (`,~f` < 1000, `~s` ≥ 1000, 0 → `0`); явный формат побеждает — test/default-formats.test.js |
| Bar / date, stacked | `yPrefix / ySuffix` | option | Bar.js:502-504 (categorical only); not read at 610 (date) o… | charts/bar/index.md:89,348-357; Bar.js:52 | ✅ исправлено (код+доки) | probe P-B3: yPrefix '$', ySuffix 'k' → date ticks ['0.0','50','100',…], stacked ['0.0','7… |
| Bar / date | `xTickFormat` | option | Bar.js:283 (horizontal), 611 (date: d3.timeFormat('%b')), 8… | charts/bar/index.md:91,360-364 | ✅ исправлено (шаг 7a) | probe S3: date axis labels ['Feb','Mar','Apr']; C-31: дефолт оси дат — по размаху вида (`%b %d` / `%b` / `%b '%y` / `%Y`; было `%b` — повторы месяцев); horizontal — по шагу тиков (C-30) |
| Bar / date | `xTicks` | option | Bar.js:341,453 (horizontal, 4), 656 (date, 6), 815 (stacked… | charts/bar/index.md:366-370 | ✅ исправлено (доки) | code read; probe S3 |
| Bar | `xTickValues` | option | Bar.js:452,817; not read in _renderTimeSeries (656) | charts/bar/index.md:372-376 | ✅ совпадает | probe S3: xTickValues [Feb] ignored in date mode |
| Bar | `yTicks` | option | Bar.js:489,497,500 (approx), 603-608 (approx), 864-866 (exa… | charts/bar/index.md:378-382; stacked-bar/index.md:105-109 | ✅ исправлено (доки) | probe P-B3 categorical: 6 value ticks ($0.0…$25) with yTicks default 4 |
| Bar | `yTickValues` | option | Bar.js:500,608,866 | charts/bar/index.md:384-388 | ✅ совпадает | — |
| Bar | `showGrid / showXAxis / showYAxis` | option | Bar.js:89-90,103-105,288-290,505-507,612-614,792-794 | charts/bar/index.md:146-154,393-419 | ✅ совпадает | test/axes-margins.test.js 'Bar — margin reclaim' |
| Bar | `tooltipFormat` | option | Bar.js `_tooltipHtml`, `_stackSegments` | charts/bar/index.md (:97 и опция); stacked-bar/index.md (:57 и опция) | ✅ решено (шаг 7) | K-09 |
| Bar / stacked | `stacked` | option | Bar.js:738-742,812 | charts/bar/stacked-bar/index.md:31-39,75-79 | ✅ совпадает | probe P-B13: ['0%','25%','50%','75%','100%']; test/bar.test.js |
| Bar / stacked | `legend (stacked auto legend)` | option | Bar.js:113,713-723 | charts/bar/stacked-bar/index.md:47,93-97 | ✅ совпадает | test/bar.test.js 'auto-builds a legend'; probe P-B9 |
| Bar / stacked | `stacked yTickFormat/xTickFormat default (table cell)` | option | Bar.js:812,849,895 | charts/bar/stacked-bar/index.md:99-103 | ✅ исправлено (шаг 7a) | probe P-B13; C-30: по шагу тиков (не процентная ось), до +3 знаков на «делёной» оси |
| Bar | `scaleToggle / onScaleChange` | option | core/Chart.js:257-259 (needs setYScale) | none for Bar | ✅ совпадает | probe P-B8: no .rc-scale-btn |
| Bar | `.rc-bar, .rc-bar-seg, .rc-bar-value, .rc-axis-cat (category axis), .r…` | css-class | Bar.js:191,265,356,411,828; rare-charts.css:560-583 | none | внутреннее | — |
| HierarchicalBar | `constructor / setData(tree \| forest)` | method | HierarchicalBar.js:41-71 | charts/bar/hierarchical-bar/index.md:17-30 | ✅ совпадает | test/hierarchical-charts.test.js; test/hierarchy.test.js |
| HierarchicalBar | `node { label, value?, color?, children?, remainderLabel? }` | data | core/hierarchy.js:91-147 | charts/bar/hierarchical-bar/index.md:19-54 | ✅ совпадает | test/hierarchy.test.js (25) |
| HierarchicalBar | `height` | option | HierarchicalBar.js:45,170-171 | charts/bar/hierarchical-bar/index.md:105; README:81 | ✅ совпадает | probe P-H1: height 500 → svg height 324 (7 rows×44+16), container style height ''; шаг 7a: высота = строки (28 рядом / 44 над баром, +строка у перенесённого имени) + зазоры групп по 8 px + margin (C-28) |
| HierarchicalBar | `margin` | option | HierarchicalBar.js:46-51 | none | ✅ исправлено (доки) | — |
| HierarchicalBar | `showRoot` | option | HierarchicalBar.js:97,100-103 | charts/bar/hierarchical-bar/index.md:60,120-124 | ✅ исправлено (доки) | probe P-H6: setData([portfolio]) + showRoot:false → root dropped |
| HierarchicalBar | `rowHeight / indent` | option | HierarchicalBar.js:150-151,180-182 | charts/bar/hierarchical-bar/index.md:102-112 | ✅ исправлено (шаг 7a) | C-28: rowHeight 28 рядом / 44 над баром; indent — только у названия — test/hbar-layout.test.js |
| HierarchicalBar | `barHeight` | option | HierarchicalBar.js:152-157; rare-charts.css:628-632 (--rc-f… | charts/bar/hierarchical-bar/index.md:114-118 | ✅ исправлено (доки) | O-08 |
| HierarchicalBar | `maxDepth` | option | HierarchicalBar.js:98,109,122 | charts/bar/hierarchical-bar/index.md:126-130 | ✅ исправлено (доки) | probe P-H4: maxDepth 0 → ['Portfolio']; 1 → root + children |
| HierarchicalBar | `remainderLabel / showRemainder / strict` | option | HierarchicalBar.js:63-67; core/hierarchy.js:122-144 | charts/bar/hierarchical-bar/index.md:36-45,135-151 | ✅ совпадает | test/hierarchy.test.js; test/hierarchical-charts.test.js |
| HierarchicalBar | `showValues` | option | HierarchicalBar.js:163,176,223-229 | charts/bar/hierarchical-bar/index.md:64,156-160 | ✅ исправлено (шаг 7a) | C-28: колонка справа (≥ 480 px) / у конца бара |
| HierarchicalBar | `valueFormat` | option | HierarchicalBar.js | charts/bar/hierarchical-bar/index.md (:68 и опция) | ✅ исправлено (доки); ✅ решено (шаг 7) | K-09: `(node, info)` |
| HierarchicalBar | `missingGlyph / labelMaxLength` | option | HierarchicalBar.js:84-88,165,221-222 | charts/bar/hierarchical-bar/index.md:168-178 | ✅ совпадает | без labelMaxLength длинное имя переносится или урезается само (C-28); родитель без раскрытых детей — `?` (C-19) |
| HierarchicalBar | `animate` | option | HierarchicalBar.js:68 (setData resets _didAnimateIn), 166,2… | charts/bar/hierarchical-bar/index.md:183-187; HierarchicalBar.js:27 | ✅ исправлено (шаг 7a) | C-16: рост с нуля на каждый setData; рендеры сразу после setData (fonts.ready, первый resize) и resize продолжают рост с текущей ширины — test/entry-motion.test.js, Chrome charts-entry-motion |
| HierarchicalBar | `layout (side ≥ 480 px / stacked)` | other | HierarchicalBar.js (SIDE_MIN_WIDTH, render) | charts/bar/hierarchical-bar/index.md «Labels and values» | ✅ исправлено (шаг 7a) | C-28; test/hbar-layout.test.js |
| HierarchicalBar | `duration / ease` | option | HierarchicalBar.js:167-168 | charts/bar/hierarchical-bar/index.md:189-199 | ✅ совпадает | — |
| HierarchicalBar | `tooltipFormat` | option | HierarchicalBar.js | charts/bar/hierarchical-bar/index.md (опция) | ✅ решено (шаг 7) | K-09: `(node, info)` |
| HierarchicalBar | `default tooltip share (pct)` | other | HierarchicalBar.js:137-138,174,186 | charts/bar/hierarchical-bar/index.md:207 | ✅ исправлено (код+доки) | probe P-H3: showRoot:false Equities 100.0% (60 of 100), Bonds 50.8%; forest Engineering 1… |
| HierarchicalBar | `row colour rules` | other | HierarchicalBar.js:111-118 | charts/bar/hierarchical-bar/index.md:58 | ✅ исправлено (доки) | probe P-H1: root color '#ff0000' → fill #666666 |
| HierarchicalBar | `.rc-hbar-row, .rc-hbar-bar, .rc-hbar-label, .rc-hbar-value` | css-class | HierarchicalBar.js:193-196; rare-charts.css:623-632 | none | внутреннее | — |
| DualAxes | `constructor / setData(series)` | method | DualAxes.js:114-158,196-211; core/seriesPath.js:51-65 | charts/line/dual-axes/index.md:427-534; charts/combined/index.md:83-2… | ✅ совпадает | test/series-styles.test.js; test/dual-axes-bars.test.js |
| DualAxes | `series.name` | data | seriesPath.js:55; DualAxes.js:304,362,371; Crosshair.js:113 | charts/line/dual-axes/index.md:434-438; charts/combined/index.md:99-1… | ✅ исправлено (доки) | probe P-D2: no .rc-legend without a legend option |
| DualAxes | `series.axis / series.type / series.color` | data | DualAxes.js:205-207 | charts/line/dual-axes/index.md:440-456; charts/combined/index.md:105-… | ✅ совпадает | — |
| DualAxes | `series.barWidth` | data | DualAxes.js:277 | charts/line/dual-axes/index.md:458-462; charts/combined/index.md:129-… | ✅ совпадает | test/dual-axes-bars.test.js 'an invalid series.barWidth falls back' |
| DualAxes | `series.strokeWidth / strokeDash / curve / area / areaOpacity / areaBa…` | data | DualAxes.js:352-395,567-574; core/renderHelpers.js:385-426;… | charts/line/dual-axes/index.md:464-534; charts/combined/index.md:138-… | ✅ совпадает | C-03 |
| DualAxes | `height` | option | DualAxes.js:131,216 | charts/line/dual-axes/index.md:95-99 | ✅ совпадает | — |
| DualAxes | `margin` | option | DualAxes.js:115-139 | charts/line/dual-axes/index.md:101-108,326 | ✅ исправлено (код+доки) | K-10 |
| DualAxes | `xPad` | option | DualAxes.js:442,452,459-462 | charts/line/dual-axes/index.md:110-117 | ✅ совпадает | C-27 |
| DualAxes | `timeframes / defaultTimeframe / defaultView` | option | core/Chart.js:440-447,570-583 | charts/line/dual-axes/index.md:43-68,119-135 | ✅ совпадает | — |
| DualAxes | `navigator` | option | DualAxes.js:189-192; core/Chart.js:517-523 | charts/line/dual-axes/index.md:56,137-141 | ✅ исправлено (доки) | probe P-D8: bar on y2 + line Q → navigator data = Q |
| DualAxes | `y1Domain / y2Domain` | option | DualAxes.js:470-480 | charts/line/dual-axes/index.md:149-156,194-198 | ✅ исправлено (доки) | probe S5: y1Scale log + y1Domain [0,1000] → auto ticks ['10','100'] |
| DualAxes | `y1Scale / y2Scale` | option | DualAxes.js:416-428,468-487 | charts/line/dual-axes/index.md:33-35,158-162,200-204; charts/combined… | ✅ совпадает | test/log-scales.test.js 'DualAxes — per-axis log scale' |
| DualAxes | `setYScale(type, { axis, silent })` | method | DualAxes.js:162-169 | charts/line/dual-axes/index.md:35; charts/combined/index.md:65,76 | ✅ совпадает | test/log-scales.test.js 'setYScale switches one axis or both', '{ silent: true } skips th… |
| DualAxes | `scaleToggle` | option | core/Chart.js:236-264; DualAxes.js:173-182 | charts/line/dual-axes/index.md:60,371-375; charts/combined/index.md:65 | ✅ совпадает | test/log-scales.test.js scaleToggle block; probe P-D5 (y1 log → 'Log', click → {scale:'li… |
| DualAxes | `onScaleChange(fn)` | callback | core/Chart.js:288-296 | charts/line/dual-axes/index.md:35,374; charts/combined/index.md:65,77 | ✅ совпадает | probe P-D5: setYScale('log') → {scale:'log',axis:'both'} |
| DualAxes | `y1Ticks / y2Ticks` | option | DualAxes.js (auto domain .nice(y1Ticks/y2Ticks ?? 4)) | charts/line/dual-axes/index.md:164-168,206-210 | ✅ исправлено (шаг 7a) | C-21: `y1Ticks: 10` на 12…87 → домен 10…90 — test/default-formats.test.js |
| DualAxes | `y1TickFormat` | option | DualAxes.js:490-492 | charts/line/dual-axes/index.md:170-174 | ✅ исправлено (доки) | probe P-D5 |
| DualAxes | `y2TickFormat` | option | DualAxes.js:493 | charts/line/dual-axes/index.md:31,212-216 | ✅ исправлено (доки) | probe P-D5: ['−2.00','−1.00','0','+1.00','+2.00'] |
| DualAxes | `xTickFormat` | option | DualAxes.js:491; core/renderHelpers.js:102-139 (6 ticks, au… | charts/line/dual-axes/index.md:233-237 | ✅ совпадает | — |
| DualAxes | `y1LabelsOnly / y2LabelsOnly / y1Title / y2Title / axisTitleMaxLength` | option | DualAxes.js:511,517,526-533; core/renderHelpers.js:290-327 | charts/line/dual-axes/index.md:29,176-186,218-228 | ✅ совпадает | — |
| DualAxes | `curve / curveTension / strokeDash / area / areaOpacity / areaBaseline` | option | DualAxes.js:353-378,440-441,549; core/utils.js:135-175 | charts/line/dual-axes/index.md:242-276 | ✅ совпадает | probe P-D6: strokeDash 'dashed' → '6,4' |
| DualAxes | `barOpacity / barWidth / barWidthRatio / barGrouping` | option | DualAxes.js:263-348,541 | charts/line/dual-axes/index.md:281-306; charts/combined/index.md:44,4… | ✅ совпадает | B-07, C-27 |
| DualAxes | `showGrid / showXAxis / showY1Axis / showY2Axis` | option | DualAxes.js:126-136,496-520 | charts/line/dual-axes/index.md:190,311-333 | ✅ совпадает | test/axes-margins.test.js 'DualAxes — margin reclaim'; probe P-D7 (5 grid lines on y2 tic… |
| DualAxes | `endLabels` | option | DualAxes.js:556-564; core/renderHelpers.js:224-232 | charts/line/dual-axes/index.md:338-342; DualAxes.js:63 | ✅ исправлено (доки) | probe P-D3: default → ['130.00'] (y1 line only; y2 line Q unlabelled) |
| DualAxes | `endLabelsAxis` | option | DualAxes.js:557-561 | charts/line/dual-axes/index.md:344-348 | ✅ исправлено (доки) | probe P-D3: endLabelsAxis 'y2' → ['−1.00'] (only y2 line) |
| DualAxes | `markers / markerShape / markerSize` | option | DualAxes.js:567-574 | charts/line/dual-axes/index.md:350-366 | ✅ совпадает | probe P-D10: 8 markers for 2 line series × 4 points; test/series-styles.test.js |
| DualAxes | `crosshair` | option | DualAxes.js:588-595; core/Crosshair.js:41-146 | charts/line/dual-axes/index.md:39,377-381 | ✅ совпадает | — |
| DualAxes | `tooltipFormat` | callback | core/Crosshair.js | charts/line/dual-axes/index.md (опция); /charts/settings/#formatter-arguments | ✅ решено (шаг 7) | K-09 |
| DualAxes | `annotations / annotationLabelHeight` | option | DualAxes.js:117-119,581-585; core/utils.js:275-354 | charts/line/dual-axes/index.md:72-74,395-405 | ✅ совпадает | C-27 |
| DualAxes | `animate / duration / ease` | option | DualAxes.js:435-437 | charts/line/dual-axes/index.md:410-426 | ✅ исправлено (шаг 7a) | C-16: один раз на экземпляр; линии и бары на общем таймлайне; бары-only DualAxes больше не оставляет устаревшую высоту после resize — test/entry-motion.test.js |
| DualAxes | `legend (series legend)` | option | core/Chart.js:114-163 (only options.legend) | charts/line/dual-axes/index.md:78 (common); :437 name row | ✅ исправлено (доки) | probe P-D2 |
| DualAxes | `theme.barOpacity / theme.markerSize / theme.strokeWidth / theme.dotRa…` | theme-token | core/theme.js:56-59 (defined); never read by DualAxes (Dual… | charts/settings/index.md:200; charts/styles/index.md:211-216 | ✅ исправлено (код) | probe S4: theme { barOpacity: .9, markerSize: 9 } → bar opacity 0.35, marker r 4 |
| DualAxes | `.rc-dual-bar, .rc-dual-line, .rc-dual-area, .rc-axis-y1/-y2, .rc-axis…` | css-class | DualAxes.js:227-251,324,364,373; core/renderHelpers.js | none | внутреннее | — |
| MultiChart | `constructor(selector, options) / .charts / destroy()` | method | MultiChart.js:55-66,146,233-240 | charts/multi/index.md:15-47; MultiChart.js:24-27 | ✅ совпадает | test/chart-base / multichart / map .test.js 'MultiChart — composed children smoke' |
| MultiChart | `setData(dataArray)` | method | MultiChart.js:194-200 | charts/multi/index.md:49-51 | ✅ совпадает | probe P-M4 (4 entries on 3 charts, no error) |
| MultiChart | `columns` | option | MultiChart.js:73,87,215 | charts/multi/index.md:103-107 | ✅ совпадает | — |
| MultiChart | `mobileColumns / mobileBreakpoint` | option | MultiChart.js:71-77 | charts/multi/index.md:53-55,109-119 | ✅ исправлено (шаг 7a) | C-15: узкий режим — `0 < width ≤ mobileBreakpoint`, от `columns` не зависит |
| MultiChart | `chartHeight` | option | MultiChart.js:80,133-135 | charts/multi/index.md:121-125 | ✅ исправлено (доки) | probe P-M3: options.height 123 → child container 123px; developer-survey demo uses this |
| MultiChart | `gap` | option | MultiChart.js:89-91; rare-charts.css:21,696-699 | charts/multi/index.md:127-131; charts/styles/index.md:203 | ✅ совпадает | probe P-M5: inline '' by default, '10px' for 10 |
| MultiChart | `animate` | option | MultiChart.js:132 | charts/multi/index.md:133-137 | ✅ совпадает | — |
| MultiChart | `charts[].type` | option | MultiChart.js:33-52 | charts/multi/index.md:167-171 | ✅ совпадает | K-11, B-02 |
| MultiChart | `charts[].title / span / data` | option | MultiChart.js:104-117,148,217-222; rare-charts.css:720-729 | charts/multi/index.md:173-189 | ✅ совпадает | — |
| MultiChart | `charts[].options` | option | MultiChart.js:131-143 | charts/multi/index.md:191-195 | ✅ исправлено (доки) | probe P-M3: Bar showXAxis:false in a grid → margin.bottom 26 (standalone: 0) |
| MultiChart | `charts[].mobileOptions` | option | MultiChart.js:83,128,154-186,213 (isMobile = cols <= mobile… | charts/multi/index.md:57-70,197-201; MultiChart.js:20-21 | ✅ исправлено (шаг 7a) | C-15: isMobile = 0 < width ≤ mobileBreakpoint; пересечение — пересборка панели (destroy → new → setData с последними данными); probe P-M1/P-M2 больше не воспроизводятся; test/multichart.test.js |
| MultiChart | `title / subtitle / legend / source / note (shared header/footer)` | option | core/Chart.js:102-344; MultiChart.js:93-98 | charts/multi/index.md:9,86 | ✅ совпадает | — |
| MultiChart | `height / margin (on the grid itself)` | option | MultiChart.js:56-59 (margin {0,0,0,0}); no _initSVG → heigh… | none (README:81 lists height as shared) | внутреннее | — |
| MultiChart | `.rc-multichart-grid / -cell / -cell-title / -chart-wrapper` | css-class | MultiChart.js:86,102,113,121; rare-charts.css:696-729 | none (Styles mentions only --rc-space-lg) | внутреннее | — |
| common (Bar, HierarchicalBar, DualAxes) | `theme.accent / colors / muted / text / bg / grid / border / crosshair…` | theme-token | Bar.js:233,715,783; HierarchicalBar.js:99-115,208,228; Dual… | charts/styles/index.md (theme tables) | ✅ совпадает | test/theme.test.js; test/tooltip.test.js 'built-in tooltips read theme.tooltip' (Bar, Hie… |
| HierarchicalBar | `--rc-font-size-sm → barHeight default` | css-token | HierarchicalBar.js:154-157; rare-charts.css:14,628-632 | none | нет описания | O-08 |

Ложные обещания документации: 40, исправлено 37.
Открытые:

- `assets/charts/README.md`:81 — "Shared text and presentation options include title, subtitle, legend, source, note, height, and theme." → HierarchicalBar ignores height (rows × rowHeight, HierarchicalBar.js:170-171; probe P-H1) and MultiChart ignores its own height (cells use chartHeight).
- `assets/charts/README.md`:65 — Chart types table: Bar row without the stacked mode; no HierarchicalBar row → Bar has a stacked/percent mode (Bar.js:12-17,689); HierarchicalBar is exported (index.js:33).
- `assets/charts/CHANGELOG.md`:46 — [v0.9.8_6] Changed: "Bar's date mode is inset the same way, so its bars move inward by up to 24px." → The inset is half the bar width (Bar.js:595); with the new explicit barWidth it exceeds 24px (barWidth 100 on monthly bars → 50px). Only the default ratio is c…

<sub>Version checked: HEAD 2fad452, branch flows-ii-v0.9.8_6, src/version.json v0.9.8_6. The repo was not modified. Probes are in /private/tmp/claude-501/-Users-dk-GitHub-raredigits-art/53281f68-ba66-493b-af95-0a67cc826675/scratchpad/step6/bar-dual-multi/probes/ (bar, hbar, dual, multi, snippets .test.js). They ran with: node_modules/.bin/vitest run --config <that dir>/vitest.config.mjs --silent=false, using the repo's test/setup.js and helpers.js. Result: 45 probe cases, all ran. Contracts reviewed (code → docs): 102 matrix rows covering about 180 individual contracts, because grouped rows bundle…</sub>

### Donut, Pie, Gauge, Map, MapFlow, Sankey

| Класс / режим | Контракт | Вид | Код | Основная дока | Статус | Задача / как проверено |
|---|---|---|---|---|---|---|
| export | `RareCharts.Donut` | export | assets/charts/src/index.js:35; charts/Donut.js:50 | charts/circular/index.md:11-64; README:67 | ✅ совпадает | test/exports.test.js 'Donut still defaults to a ring'; probe P1 |
| export | `RareCharts.Pie` | export | assets/charts/src/index.js:35; charts/Donut.js:490-494 | charts/circular/index.md:66-77; README:68 | ✅ совпадает | C-05 |
| export | `RareCharts.Gauge` | export | assets/charts/src/index.js:36; charts/Gauge.js:44 | charts/circular/index.md:96-164; README:69 | ✅ совпадает | — |
| export | `RareCharts.Map` | export | assets/charts/src/index.js:40; charts/Map.js:46 | charts/map/index.md; README:72 | ✅ совпадает | — |
| export | `RareCharts.MapFlow (experimental)` | export | assets/charts/src/index.js:41; charts/MapFlow.js:62 | charts/map/flow/index.md:9-13 (experimental box); README: none | нет описания | O-01 |
| export | `RareCharts.Sankey (experimental)` | export | assets/charts/src/index.js:42; charts/Sankey.js:56 | charts/sankey/index.md:9-13 (experimental box); README: none | нет описания | O-01 |
| export | `RareCharts.d3 (as used by circular snippets)` | export | assets/charts/src/index.js | README; /charts/installation/; сниппеты берут `const d3 = RareCharts.d3` (`sum`, `format` — в подмножестве) | ✅ решено (шаг 7) | K-13 |
| Donut / flat | `setData(array)` | method | assets/charts/src/charts/Donut.js:75-95 | charts/circular/index.md:166-180 | ✅ совпадает | test/chart-base / multichart / map .test.js 'Donut — edge data'; test/hierarchical-charts.test.js 'flat mod… |
| Donut / drill-down | `setData(rootObject)` | method | assets/charts/src/charts/Donut.js:76-87; core/hierarchy.js:… | charts/circular/index.md:42-64,178 (node shape: /charts/bar/hierarchi… | ✅ совпадает | test/hierarchical-charts.test.js 'Donut — drill-down'; probe P2 |
| Donut / drill-down | `drillTo(node)` | method | assets/charts/src/charts/Donut.js | charts/circular/index.md (рядом с drillUp/drillToDepth) | ✅ решено (шаг 7) | K-21 |
| Donut / drill-down | `drillUp()` | method | assets/charts/src/charts/Donut.js:139 | none | ✅ исправлено (доки) | test/exports.test.js:83 (Pie drillUp); test/hierarchical-charts.test.js:116 |
| Donut / drill-down | `drillToDepth(index)` | method | assets/charts/src/charts/Donut.js:131-137 | none | ✅ исправлено (доки) | test/hierarchical-charts.test.js 'jumps to an ancestor via drillToDepth' |
| Donut | `height` | option | assets/charts/src/charts/Donut.js:53,100 | charts/circular/index.md:211-215 | ✅ совпадает | — |
| Donut | `innerRadius` | option | assets/charts/src/charts/Donut.js:176-177,492 | charts/circular/index.md:216-220 | ✅ совпадает | — |
| Donut | `padAngle` | option | assets/charts/src/charts/Donut.js:178,207,220 | charts/circular/index.md:221-225 | ✅ совпадает | — |
| Donut | `cornerRadius` | option | assets/charts/src/charts/Donut.js:179 | charts/circular/index.md:226-230 | ✅ совпадает | — |
| Donut | `showLabels` | option | assets/charts/src/charts/Donut.js:180,303-398 | charts/circular/index.md:79-94,231-235 | ✅ совпадает | — |
| Donut | `labelMinPct` | option | assets/charts/src/charts/Donut.js:308 | charts/circular/index.md:241-245 | ✅ совпадает | — |
| Donut | `labelContent` | option | assets/charts/src/charts/Donut.js:311-314 | charts/circular/index.md:83-86,236-240 | ✅ совпадает | — |
| Donut | `showCenter` | option | assets/charts/src/charts/Donut.js:181,403 | charts/circular/index.md:251-255 | ✅ совпадает | — |
| Donut | `centerText` | option | assets/charts/src/charts/Donut.js | charts/circular/index.md (опция) | ✅ решено (шаг 7) | K-09: `(data, { label, value })` |
| Donut | `centerLabel` | option | assets/charts/src/charts/Donut.js:409-411 | charts/circular/index.md:261-265 | ✅ исправлено (доки) | probe P2: after drilling into X the centre label is 'X' (option was 'Revenue') |
| Donut | `valueFormat (default)` | option | assets/charts/src/charts/Donut.js:196 | charts/circular/index.md:266-270 ('locale number'); Donut.js:24 heade… | ✅ исправлено (доки) | K-09 |
| Donut | `valueFormat (signature)` | option | assets/charts/src/charts/Donut.js | charts/circular/index.md (опция) | ✅ решено (шаг 7) | K-09: `(v, info)` |
| Donut | `percentFormat` | option | assets/charts/src/charts/Donut.js:197 | charts/circular/index.md:271-275 | ✅ совпадает | — |
| Donut | `animate / duration / ease` | option | assets/charts/src/charts/Donut.js:172-174,126 | charts/circular/index.md:276-290 | ✅ совпадает | K-08; C-16: рендер посреди входа продолжает развёртку с достигнутого угла; каждый drill — заново |
| Donut | `tooltipFormat` | callback | assets/charts/src/charts/Donut.js | charts/circular/index.md (опция) | ✅ решено (шаг 7) | K-09: payload — ролевые поля |
| Donut / drill-down | `showRemainder` | option | assets/charts/src/charts/Donut.js:79; core/hierarchy.js:137 | charts/circular/index.md:50,296-300 | ✅ совпадает | — |
| Donut / drill-down | `remainderLabel` | option | assets/charts/src/charts/Donut.js:80; core/hierarchy.js:139 | charts/circular/index.md:301-305 | ✅ совпадает | — |
| Donut / drill-down | `strict` | option | assets/charts/src/charts/Donut.js:81; core/hierarchy.js:122… | charts/circular/index.md:306-310 | ✅ совпадает | — |
| Donut / drill-down | `node with only undisclosed children` | data | assets/charts/src/core/hierarchy.js:111-116; charts/Donut.j… | charts/circular/index.md:50 | ✅ исправлено (шаг 7a) | C-19: missing, не 0; test/hierarchy-undisclosed.test.js |
| Donut | `margin` | option | assets/charts/src/charts/Donut.js:54,165-166 | charts/settings/index.md (Layout, `margin`) | ✅ исправлено (шаг 7a) | C-17: Donut, Pie, Gauge, Sankey и Graph заполняют карточку и `margin` не используют; частичный `margin` — не заданные стороны 0 |
| Donut | `legend indicator colour sync` | other | assets/charts/src/charts/Donut.js:293-298 | implied by charts/circular/index.md:22,37 (legend items without color) | ✅ исправлено (шаг 7a) | K-22: по id/label, band и пунктир тоже; без слайса — accent; probe P5 больше не воспроизводится |
| Donut | `legendPosition` | option | assets/charts/src/core/Chart.js:109,166-175,417-423 | charts/circular/index.md:28-40,246-250; settings:94,114 | ✅ совпадает | — |
| Donut | `item.color (on update)` | data | assets/charts/src/charts/Donut.js:233-241 (fill set on ente… | charts/circular/index.md:180 | ✅ исправлено (шаг 7a) | C-18: fill на каждом рендере; test/circular.test.js |
| Donut | `item.id (slice key)` | data | assets/charts/src/charts/Donut.js:232 | none | ✅ исправлено (шаг 7a) | C-18: повторяющиеся подписи — ключ с номером повтора, слайсы сохраняются |
| Donut | `rc-donut-slices/-labels/-center/-crumb, rc-donut-slice, -leader, -lab…` | css-class | assets/charts/src/charts/Donut.js:108-111,235,361,376,389,4… | none | внутреннее | K-06 |
| Pie | `pie defaults` | option | assets/charts/src/charts/Donut.js:176-181,490-494 | charts/circular/index.md:68,218,223,228,253 | ✅ совпадает | C-05 |
| Pie / drill-down | `drill-down navigation up` | method | assets/charts/src/charts/Donut.js:403,477-481 | charts/circular/index.md:44,68 | ✅ исправлено (доки) | probe P3: Pie drilled into X → centre group has 0 children (nothing to click); breadcrumb… |
| Gauge | `setData(number \| { value, max?, min? })` | method | assets/charts/src/charts/Gauge.js:63-73 | charts/circular/index.md:112-128 | ✅ исправлено (шаг 7a) | C-21: переопределение на один вызов, каждый setData начинает от опций |
| Gauge | `height` | option | assets/charts/src/charts/Gauge.js:47,78 | charts/circular/index.md:314-318 | ✅ совпадает | — |
| Gauge | `min / max` | option | assets/charts/src/charts/Gauge.js:53-54 | charts/circular/index.md:319-328 | ✅ совпадает | доки: «overrides it for that call only» (C-21) |
| Gauge | `value clamping` | other | assets/charts/src/charts/Gauge.js:155-158 | none | ✅ исправлено (доки) | probe G1: setData(150) → centre 100%, tooltip payload {value:150, percent:1}, default too… |
| Gauge | `startAngle / endAngle` | option | assets/charts/src/charts/Gauge.js:101-102,124-149 | charts/circular/index.md:132-134,145,329-338 | ✅ совпадает | test/circular.test.js 'Gauge — shallow arcs' |
| Gauge | `thickness` | option | assets/charts/src/charts/Gauge.js:103 | charts/circular/index.md:339-343 | ✅ совпадает | — |
| Gauge | `cornerRadius` | option | assets/charts/src/charts/Gauge.js:104 | charts/circular/index.md:344-348 | ✅ совпадает | — |
| Gauge | `needle` | option | assets/charts/src/charts/Gauge.js:111,205-231 | charts/circular/index.md:146,349-353 | ✅ совпадает | test/circular.test.js 'Gauge — needle' |
| Gauge | `needleColor` | option | assets/charts/src/charts/Gauge.js:112 | charts/circular/index.md:146,354-358 | ✅ совпадает | — |
| Gauge | `color` | option | assets/charts/src/charts/Gauge.js:110 | charts/circular/index.md:359-363 | ✅ совпадает | — |
| Gauge | `trackColor` | option | assets/charts/src/charts/Gauge.js:109 | charts/circular/index.md:364-368 | ✅ совпадает | — |
| Gauge | `showCenter` | option | assets/charts/src/charts/Gauge.js:132,250 | charts/circular/index.md:369-373 | ✅ совпадает | — |
| Gauge | `centerText` | option | assets/charts/src/charts/Gauge.js | charts/circular/index.md (опция) | ✅ решено (шаг 7) | K-09: `(value, max, min, info)` |
| Gauge | `centerLabel` | option | assets/charts/src/charts/Gauge.js:136-137,256,267 | charts/circular/index.md:379-383 | ✅ совпадает | — |
| Gauge | `animate / duration / ease` | option | assets/charts/src/charts/Gauge.js:105-107 | charts/circular/index.md:384-398 | ✅ совпадает | C-16: рендер посреди входа продолжает развёртку; новое значение посреди входа — за оставшееся время |
| Gauge | `tooltipFormat` | callback | assets/charts/src/charts/Gauge.js | charts/circular/index.md (опция) | ✅ решено (шаг 7) | K-09: + `color` |
| Gauge | `margin` | option | assets/charts/src/charts/Gauge.js:48,94-95 | charts/settings/index.md (Layout, `margin`) | ✅ исправлено (шаг 7a) | C-17: Donut, Pie, Gauge, Sankey и Graph заполняют карточку и `margin` не используют; частичный `margin` — не заданные стороны 0 |
| Gauge | `rc-gauge-arc/-needle/-center, -track, -fill, -needle-pointer, -needle…` | css-class | assets/charts/src/charts/Gauge.js:86-88,177,185,212,217,259… | none | внутреннее | — |
| Map | `setData(items)` | method | assets/charts/src/charts/Map.js:67-78 | charts/map/index.md:69-86,301-335 | ✅ совпадает | probe M4: setData(null) → TypeError (not promised by docs) |
| Map | `item.id` | data | assets/charts/src/charts/Map.js:72,346-360 | charts/map/index.md:79-86,208-215,313-317 | ✅ совпадает | probe M5: feature with id '1' and code 'AA' is not matched by idField:'code' (as document… |
| Map | `item.label / item.value / item.color` | data | assets/charts/src/charts/Map.js:281,378-384 | charts/map/index.md:318-332 | ✅ совпадает | — |
| Map | `height` | option | assets/charts/src/charts/Map.js:49; core/Chart.js:425-434 | charts/map/index.md:147-152 | ✅ совпадает | probe M6: style.height '' , svg height 392 with a title |
| Map | `fitPadding` | option | assets/charts/src/charts/Map.js:235,258 | charts/map/index.md:153-158 | ✅ совпадает | — |
| Map | `geoData / topoData / geoUrl / topoUrl (precedence)` | option | assets/charts/src/charts/Map.js:137-141 | charts/map/index.md:24-42,162-185 | ✅ исправлено (доки) | — |
| Map | `topoObject` | option | assets/charts/src/charts/Map.js:165 | charts/map/index.md:186-194 | ✅ совпадает | — |
| Map | `featureFilter` | option | assets/charts/src/charts/Map.js:158-161 | charts/map/index.md:195-200 | ✅ совпадает | — |
| Map | `clipExtent` | option | assets/charts/src/charts/Map.js:179-221 | charts/map/index.md:201-206 | ✅ совпадает | — |
| Map | `idField` | option | assets/charts/src/charts/Map.js:236,346-360 | charts/map/index.md:207-215 | ✅ совпадает | — |
| Map | `projection` | option | assets/charts/src/charts/Map.js:257,362-370 | charts/map/index.md:88-100,219-224 | ✅ совпадает | — |
| Map | `reflectY` | option | assets/charts/src/charts/Map.js:368 | charts/map/index.md:225-230 | ✅ совпадает | — |
| Map | `rotate` | option | assets/charts/src/charts/Map.js:371-373 | charts/map/index.md:231-236 | ✅ совпадает | — |
| Map | `defaultFill` | option | assets/charts/src/charts/Map.js:267 | charts/map/index.md:241-245 | ✅ исправлено (доки) | O-06 |
| Map | `matchFill` | option | assets/charts/src/charts/Map.js:268 | charts/map/index.md:246-251 | ✅ исправлено (доки) | O-06 |
| Map | `hoverFill` | option | assets/charts/src/charts/Map.js:270-272,300-302 | charts/map/index.md:252-257 | ✅ исправлено (шаг 7a) | probe M3: region color #000000 hovers to rgb(41,184,255); unmatched stays #e8e8e8; C-22: дефолт — своя заливка региона, HSL-светлота × theme.map.hoverBrighten — test/map.test.js |
| Map | `oceanColor` | option | assets/charts/src/charts/Map.js:244 | charts/map/index.md:258-263 | ✅ совпадает | probe M1 |
| Map | `borderColor` | option | assets/charts/src/charts/Map.js:269 | charts/map/index.md:264-269 | ✅ исправлено (доки) | O-06 |
| Map | `borderWidth` | option | assets/charts/src/charts/Map.js:294-295 | charts/map/index.md:270-275 | ✅ совпадает | — |
| Map | `zoom` | option | assets/charts/src/charts/Map.js:115-127 | charts/map/index.md:279-284 | ✅ совпадает | — |
| Map | `zoomExtent` | option | assets/charts/src/charts/Map.js:117 | charts/map/index.md:285-290 | ✅ совпадает | — |
| Map | `tooltipFormat` | callback | assets/charts/src/charts/Map.js | charts/map/index.md (:150 и опция) | ✅ решено (шаг 7) | K-09: + `label`, `value`, `color` |
| Map | `tooltipFormat payload item (unmatched region)` | callback | assets/charts/src/charts/Map.js:298 | charts/map/index.md:127,295 ('item will be null') | ✅ исправлено (код) | probe M2: West:obj East:undefined NoId:null |
| Map | `default region tooltip` | other | assets/charts/src/charts/Map.js:377-388 | charts/map/index.md:118 | ✅ совпадает | — |
| Map | `theme.map.matchFill / unmatchedFill / border / ocean` | theme-token | assets/charts/src/core/theme.js:61-68,104-111,139-142 | charts/map/index.md:114,262 (prose); charts/styles/index.md:137 (deep… | ✅ исправлено (доки) | O-05, O-06 |
| Map | `theme.map.hoverBrighten / graticule` | theme-token | assets/charts/src/charts/Map.js (hoverFillFor; _graticule) | charts/map/index.md (hover, graticule, options); charts/styles/index.md (Map) | ✅ исправлено (шаг 7a) | C-22: test/map.test.js |
| Map | `graticule` | option | assets/charts/src/charts/Map.js (_initSVG, render) | charts/map/index.md (Projections, table) | ✅ исправлено (шаг 7a) | C-22: test/map.test.js |
| Map | `margin` | option | assets/charts/src/charts/Map.js:50; core/Chart.js:53-58 | charts/settings/index.md:146 (general) | ✅ исправлено (шаг 7a) | C-17: частичный margin — не заданные стороны = 0, как у дефолта Map; charts/settings/index.md (Layout) |
| Map | `geometry load failure / readiness` | other | assets/charts/src/charts/Map.js constructor (_ready), _loadGeo | charts/map/index.md (Geographic data); charts/settings/index.md «whenReady()» | ✅ исправлено (шаг 7a) | K-12: whenReady() — после загрузки и первой отрисовки или после ошибки (console.error); без источника — console.warn; test/map.test.js |
| Map | `rc-map-svg, rc-map-ocean, rc-map-zoom, rc-map-paths, rc-map-feature` | css-class | assets/charts/src/charts/Map.js:86,98,109,113,290 | none | внутреннее | — |
| MapFlow | `experimental status` | other | assets/charts/src/charts/MapFlow.js:1 | charts/map/flow/index.md:11-13 | ✅ совпадает | — |
| MapFlow | `nodes / links / flows (constructor)` | option | assets/charts/src/charts/MapFlow.js:65-67 | charts/map/flow/index.md:95 | ✅ совпадает | test/mapflow.test.js 'accepts nodes/links (or flows) as options' |
| MapFlow | `setData({ nodes, links\|flows })` | method | assets/charts/src/charts/MapFlow.js:72-86 | charts/map/flow/index.md:21-45,118 | ✅ совпадает | — |
| MapFlow | `node.coords / node.country` | data | assets/charts/src/charts/MapFlow.js:168-193 | charts/map/flow/index.md:43-44 | ✅ совпадает | test/mapflow.test.js 'places a country node at the centroid of its largest polygon' |
| MapFlow | `node.label` | data | assets/charts/src/charts/MapFlow.js:328,449,484,529 | charts/map/flow/index.md:35 | ✅ совпадает | — |
| MapFlow | `node.color` | data | assets/charts/src/charts/MapFlow.js:422 | none | ✅ исправлено (доки) | probe F1: node fills #ff00ff,#000000,#000000 |
| MapFlow | `link source/target (from/to), type, value, label, start/end` | data | assets/charts/src/core/links.js:20-71,80-130 | charts/map/flow/index.md:45,56 | ✅ совпадает | — |
| MapFlow | `link.sources` | data | assets/charts/src/core/html.js:52-62; charts/MapFlow.js:516… | charts/map/flow/index.md:51 | ✅ совпадает | R-15 |
| MapFlow | `link.id and unknown-endpoint policy` | data | assets/charts/src/core/links.js:72-114; charts/MapFlow.js:156-164 | none (flow:45 documents drop+warning) | ✅ решено (шаг 7, K-07) | `normalizeRelationData` с `unknownEndpoints: 'drop'`; id `source→target#n` (заморожен до 1.0); test/relation-data.test.js |
| MapFlow | `setTimeWindow(from, to)` | method | assets/charts/src/charts/MapFlow.js:91-96; core/Chart.js:48… | charts/map/flow/index.md:75,78,119 | ✅ совпадает | — |
| MapFlow | `setLinkTypesVisible(types \| null)` | method | assets/charts/src/charts/MapFlow.js:115-121 | charts/map/flow/index.md:121 | ✅ совпадает | probe F3 |
| MapFlow | `setTimeframe / setView / getView / onViewChange` | method | assets/charts/src/core/Chart.js:642-691 | charts/map/flow/index.md:74-76,120 (getView not listed) | ✅ исправлено (доки) | — |
| MapFlow | `height` | option | assets/charts/src/charts/MapFlow.js:64 | none on flow page | ✅ исправлено (доки) | probe F1: options.height 420 |
| MapFlow | `linkTypes` | option | assets/charts/src/charts/MapFlow.js:212-216; core/links.js:… | charts/map/flow/index.md:96 | ✅ совпадает | probe F2: goods=#8a5a2b other=#00aaff none=#666666 silver=#fa8c16 |
| MapFlow | `hiddenLinkTypes` | option | assets/charts/src/charts/MapFlow.js:132 | charts/map/flow/index.md:97 | ✅ совпадает | — |
| MapFlow | `linkLegend` | option | assets/charts/src/charts/MapFlow.js:139-143,489-512 | charts/map/flow/index.md:98 | ✅ совпадает | — |
| MapFlow | `linkWidth` | option | assets/charts/src/charts/MapFlow.js:232; core/links.js:176-… | charts/map/flow/index.md:50,99 | ✅ совпадает | probe F6: by fn → goods 10, others 1.9 |
| MapFlow | `bend` | option | assets/charts/src/charts/MapFlow.js:239,262 | charts/map/flow/index.md:100; MapFlow.js:24 header | ✅ исправлено (доки) | probe F4: chord≈259 px: bend 0.18 → 16.2 px (=0.18×90), bend 0.5 → 45 px (=0.5×90) |
| MapFlow | `timeframes` | option | assets/charts/src/core/Chart.js:440-447,464-466 | charts/map/flow/index.md:56,101 | ✅ совпадает | probe F5 |
| MapFlow | `viewSteps (alias of timeframes)` | option | assets/charts/src/core/Chart.js `_getTimeframeOptions` | /charts/line/time-series/ (устаревший); README | ✅ решено (шаг 7) | K-04 |
| MapFlow | `navigator` | option | assets/charts/src/core/Chart.js:509-544 | charts/map/flow/index.md:56,102 | ✅ совпадает | — |
| MapFlow | `defaultView` | option | assets/charts/src/core/Chart.js:574-576 | charts/map/flow/index.md:70,103 | ✅ совпадает | — |
| MapFlow | `defaultTimeframe` | option | assets/charts/src/core/Chart.js:578-580 | none on flow page | ✅ исправлено (доки) | probe F5: defaultTimeframe 'early' → view 1800-01-01…1830-12-31 |
| MapFlow | `timeWindow` | option | assets/charts/src/charts/MapFlow.js:131,150 | charts/map/flow/index.md:104 | ✅ совпадает | probe F8 |
| MapFlow | `timeWindowMode` | option | assets/charts/src/charts/MapFlow.js:230 | charts/map/flow/index.md:56,105 | ✅ совпадает | — |
| MapFlow | `fitTo` | option | assets/charts/src/charts/MapFlow.js _fitObject, _fitProjection | charts/map/flow/index.md:106 | ✅ исправлено (шаг 7a) | C-35: подгонка учитывает точки дуг (большой круг и изгиб), до трёх проходов; рамка не зависит от окна времени и легенды — test/mapflow-arcs.test.js |
| MapFlow | `nodeRadius` | option | assets/charts/src/charts/MapFlow.js:217 | charts/map/flow/index.md:107 | ✅ совпадает | — |
| MapFlow | `nodeLabels` | option | assets/charts/src/charts/MapFlow.js:443 | charts/map/flow/index.md:52,108 | ✅ совпадает | — |
| MapFlow | `tooltipFormat` | callback | assets/charts/src/charts/MapFlow.js:426-434 | charts/map/flow/index.md:109 | ✅ решено (шаг 7) | K-09 |
| MapFlow | `regionTooltipFormat` | callback | assets/charts/src/charts/MapFlow.js:106-108; Map.js:296-307 | charts/map/flow/index.md:110 | ✅ решено (шаг 7) | K-09 |
| MapFlow | `linkTooltipFormat` | callback | assets/charts/src/charts/MapFlow.js:354-359 | charts/map/flow/index.md:111 | ✅ решено (шаг 7) | K-09 |
| MapFlow | `Map colour/data options in MapFlow (matchFill, hoverFill, region data)` | option | assets/charts/src/charts/MapFlow.js:72 (setData overrides M… | charts/map/flow/index.md:82,133 | ✅ совпадает | probe F1: matchFill '#00ff00' → all regions #e8e8e8 |
| MapFlow | `zoom (overlay scaling)` | option | assets/charts/src/charts/Map.js _onZoom; MapFlow.js _layoutFlows | charts/map/flow/index.md (Interaction → Zoom) | ✅ исправлено (шаг 7a) | R-14: test/mapflow-arcs.test.js |
| MapFlow | `great-circle arcs across the antimeridian / far side of orthographic` | other | assets/charts/src/charts/MapFlow.js _bowArcs, _placesAt | charts/map/flow/index.md (Drawing) | ✅ исправлено (шаг 7a) | R-13: test/mapflow-arcs.test.js |
| MapFlow | `whenReady()` | method | core/Chart.js (база) + Map._ready | charts/map/flow/index.md (Methods) | ✅ исправлено (шаг 7a) | K-12 |
| MapFlow | `keyboard and pinning` | other | assets/charts/src/charts/MapFlow.js:144,369-397 | charts/map/flow/index.md:15,125 | ✅ совпадает | R-12 |
| MapFlow | `legend button class rc-graph-legend-item` | css-class | assets/charts/src/charts/MapFlow.js:498 | charts/styles/index.md:21 (mentions 'MapFlow legend buttons', no clas… | решение | K-06 |
| MapFlow | `rc-mapflow-links/-heads/-link-hits/-nodes/-labels, -link, -head, -lin…` | css-class | assets/charts/src/charts/MapFlow.js:134-141,334,348,363,418… | none | внутреннее | — |
| Sankey | `experimental status` | other | assets/charts/src/charts/Sankey.js:1-4 | charts/sankey/index.md:11-13 | ✅ совпадает | — |
| Sankey | `setData({ nodes?, links\|flows })` | method | assets/charts/src/charts/Sankey.js:80-137 | charts/sankey/index.md:21-41 | ✅ совпадает | test/sankey.test.js (13 cases); probes S5, S7 |
| Sankey | `node id / label / color` | data | assets/charts/src/charts/Sankey.js:97,251,430 | charts/sankey/index.md:35 | ✅ совпадает | probe S3: node A color #123456 → fill #123456 |
| Sankey | `node.column` | data | assets/charts/src/core/sankey.js:79-80 | charts/sankey/index.md:37 | ✅ совпадает | — |
| Sankey | `link source/target (from/to), value, type, label; flows alias` | data | assets/charts/src/charts/Sankey.js:81-92; core/links.js | charts/sankey/index.md:23,36,38,55 | ✅ совпадает | — |
| Sankey | `other link fields (sources, custom)` | data | assets/charts/src/charts/Sankey.js:449-461 | charts/sankey/index.md:49,55 | ✅ исправлено (доки) | probe S2: link with label, type, sources, note → tooltip 'A → B', '10 · 67% of A', 'Equit… |
| Sankey | `link.id` | data | assets/charts/src/core/links.js:72-114; charts/Sankey.js:84-103; core/sankey.js:46 | none | ✅ решено (шаг 7, K-07) | id `source→target#n` (заморожен до 1.0); `accept` (value) до политики `drop`/`create`; test/relation-data.test.js |
| Sankey | `repeated pair+type merge; invalid input drop; cycle error` | other | assets/charts/src/charts/Sankey.js:84-133; core/sankey.js:2… | charts/sankey/index.md:38-40 | ✅ совпадает | test/sankey.test.js 'drops invalid values…', 'a cycle throws at setData and the chart kee… |
| Sankey | `height` | option | assets/charts/src/charts/Sankey.js:65,70,185-191 | charts/sankey/index.md:94 | ✅ совпадает | probe S4: 400 px container → height 296 |
| Sankey | `orientation` | option | assets/charts/src/charts/Sankey.js:157-162 | charts/sankey/index.md:79,95 | ✅ совпадает | — |
| Sankey | `mobileBreakpoint` | option | assets/charts/src/charts/Sankey.js:161 | charts/sankey/index.md:96 | ✅ совпадает | — |
| Sankey | `rowHeight` | option | assets/charts/src/charts/Sankey.js:186 | charts/sankey/index.md:97 | ✅ совпадает | — |
| Sankey | `nodeWidth` | option | assets/charts/src/charts/Sankey.js:221 | charts/sankey/index.md:98 | ✅ совпадает | — |
| Sankey | `nodePadding` | option | assets/charts/src/charts/Sankey.js:222; core/sankey.js:102 | charts/sankey/index.md:99 | ✅ совпадает | — |
| Sankey | `nodeAlign` | option | assets/charts/src/charts/Sankey.js:223; core/sankey.js:68-78 | charts/sankey/index.md:100 | ✅ совпадает | — |
| Sankey | `nodeSort` | option | assets/charts/src/charts/Sankey.js:224; core/sankey.js:86-91 | charts/sankey/index.md:101 | ✅ совпадает | probe S3: comparator arg keys 'id' |
| Sankey | `iterations` | option | assets/charts/src/charts/Sankey.js:225 | charts/sankey/index.md:102 | ✅ совпадает | — |
| Sankey | `linkColor` | option | assets/charts/src/charts/Sankey.js:257-265 | charts/sankey/index.md:103 | ✅ совпадает | — |
| Sankey | `linkOpacity` | option | assets/charts/src/charts/Sankey.js:280 | charts/sankey/index.md:104 | ✅ совпадает | — |
| Sankey | `linkTypes (+ automatic legend)` | option | assets/charts/src/charts/Sankey.js:59-63,252-262 | charts/sankey/index.md:49,105 | ✅ исправлено (доки) | probe S1: equity=#00aaff mystery=#666666 none=#666666; legend 'Equity\\|Unused'; no linkT… |
| Sankey | `labels` | option | assets/charts/src/charts/Sankey.js:207,324-336 | charts/sankey/index.md:106 | ✅ совпадает | — |
| Sankey | `minLabelSize` | option | assets/charts/src/charts/Sankey.js:323-325 | charts/sankey/index.md:107 | ✅ исправлено (доки) | probe S4 (400 px, vertical, minLabelSize 4): node C width 3.7 → unlabelled; threshold 24… |
| Sankey | `showValues` | option | assets/charts/src/charts/Sankey.js:200-201 | charts/sankey/index.md:108 | ✅ совпадает | — |
| Sankey | `valueFormat` | option | assets/charts/src/charts/Sankey.js:199 | charts/sankey/index.md:109 | ✅ решено (шаг 7) | K-09 |
| Sankey | `tooltipFormat` | callback | assets/charts/src/charts/Sankey.js:432-440 | charts/sankey/index.md:110 | ✅ решено (шаг 7) | K-09 |
| Sankey | `linkTooltipFormat` | callback | assets/charts/src/charts/Sankey.js:449-453 | charts/sankey/index.md:111 | ✅ решено (шаг 7) | K-09 |
| Sankey | `tableFallback` | option | assets/charts/src/charts/Sankey.js:464-475 | charts/sankey/index.md:112,122 | ✅ совпадает | probe S6; test/sankey.test.js:98 |
| Sankey | `animate / duration / ease` | option | assets/charts/src/charts/Sankey.js (EntryMotion) | charts/sankey/index.md:113 | ✅ исправлено (шаг 7a) | C-16: затухание лент на общем таймлайне входа, на каждый setData; рендер посреди входа (fonts.ready, первый resize) продолжает его, а не обрывает — test/entry-motion.test.js, Chrome charts-entry-motion |
| Sankey | `margin` | option | assets/charts/src/charts/Sankey.js:66,193-194 | charts/settings/index.md (Layout, `margin`) | ✅ исправлено (шаг 7a) | C-17: Donut, Pie, Gauge, Sankey и Graph заполняют карточку и `margin` не используют; частичный `margin` — не заданные стороны 0 |
| Sankey | `hover highlight, click pin, keyboard` | other | assets/charts/src/charts/Sankey.js:363-423 | charts/sankey/index.md:15,49,122 | ✅ совпадает | — |
| Sankey | `rc-sankey, -links, -nodes, -labels, -link, -node, -label, rc-sankey-t…` | css-class | assets/charts/src/charts/Sankey.js:149-152,292,311,350,469 | none | внутреннее | — |
| Chart (common) | `ariaLabel (Donut, Pie, Gauge, Map, MapFlow, Sankey)` | option | assets/charts/src/core/renderHelpers.js:35-43; Donut.js:106… | none (sankey:122 says the SVG is labelled from title/subtitle) | ✅ исправлено (доки) | O-07 |

Ложные обещания документации: 24, исправлено 22 (из них 5 — шаг 7a: circular:50 — C-19, :112 — C-21, :180 — C-18; map/flow:49 — R-13, :129 — R-14).
Открытые:

- `charts/map/index.md`:249 — matchFill default theme.accent → theme.map.matchFill wins (#00aaff / #ff6200). createTheme({accent:'#ff0000'}) leaves matched regions #00aaff (Map.js:268; probe M1).
- `charts/map/index.md`:267 — borderColor default theme.border → theme.map.border wins (#ffffff light, #444455 dark); theme.border (#cccccc / #888888) is only a fallback (Map.js:269; probe M1).

<sub>I reviewed 151 contracts as rows: exports 7, Donut/Pie 32, Gauge 18, Map 31, MapFlow 40, Sankey 30, common ariaLabel 1 (CSS class groups are marked internal). Status: ok 92, missing 17, contradicts 21, decision 23 (K-09 ×12, K-07 ×2, K-04, K-06, K-12, K-13, C-17 ×4, drillTo with no item id yet; K-12 и C-17 ×4 закрыты в шаге 7a), internal 5. Docs → code claims checked: charts/circular 84 (10 false or unverifiable), charts/map 62 (6 false: L114, L127+L295 as one, L243, L249, L256, L267), charts/map/flow 76 (5 false: L49, L56, L100, L110, L129), charts/sankey 61 (3 false: L49, L55, L107). README rows: 9 checked (Donut, Pie, Gaug…</sub>

### Graph (все виды), memorySource, linkPresets, адаптеры, экспорты

| Класс / режим | Контракт | Вид | Код | Основная дока | Статус | Задача / как проверено |
|---|---|---|---|---|---|---|
| export | `Line, Bar, DualAxes, Donut, Pie, Gauge, MultiChart, Map (class export…` | export | assets/charts/src/index.js:30,33,35,36,37,40,41 | assets/charts/README.md:62,65-69,71-72; class pages /charts/* | ✅ совпадает | C-05 |
| export | `TimeSeries` | export | assets/charts/src/index.js:31; charts/TimeSeries.js:7,82 | assets/charts/README.md:63 | ✅ совпадает | TimeSeries.js:7 'other fields (open, high, low, volume…) pass through to tooltipFormat(d)… |
| export | `Overview` | export | assets/charts/src/index.js; charts/Overview.js | README; /charts/installation/; `/charts/line/time-series/#overview-standalone-navigator` | ✅ решено (шаг 7) | K-04 |
| export | `HierarchicalBar` | export | assets/charts/src/index.js:34 | none in README (absent from Chart types table README:60-72 and from t… | нет описания | O-01 |
| export | `Sankey` | export | assets/charts/src/index.js:43 | none in README; /charts/sankey/ | нет описания | O-01 |
| export | `MapFlow` | export | assets/charts/src/index.js:42 | none in README; /charts/map/flow/ | нет описания | O-01 |
| export / ego\|path\|cluster\|flow | `Graph` | export | assets/charts/src/index.js:38; charts/Graph.js:158 | charts/graph/index.md (primary); README:70,83-179; charts/installatio… | противоречит | README:70 and README:85-89 name three views (no flow); installation:135 says 'Force-direc… |
| export | `linkPresets` | export | assets/charts/src/index.js:38; charts/Graph.js:1957; charts… | charts/graph/index.md:197-205 | ✅ исправлено (доки) | O-01 |
| export | `memorySource` | export | assets/charts/src/index.js:39; graph/source.js:16-62 | charts/graph/index.md:49-52; README:119,159 | ✅ совпадает | p02-source.mjs: neighbors('a') -> depth-1 ring; paths('a','d') -> 2 edge-disjoint routes;… |
| export | `fromJson / fromCsv / fromApi / fromArray` | export | assets/charts/src/index.js:44; adapters/index.js:20-51 | charts/data-import/index.md:24-142; README:181-194 | ✅ совпадает | p06-adapters.mjs (fetch stubbed): array / {data} / object-of-objects JSON shapes, CSV, he… |
| export | `defaultTheme / darkTheme / createTheme` | export | assets/charts/src/index.js:45; core/theme.js | /charts/styles/ (other group); README:200 | ✅ совпадает | Covered by the styles/theme group; listed here for the export list only. |
| export | `defaultTimeframes` | export | assets/charts/src/index.js:46; core/Chart.js:11 | README:201 only (name only); no /charts/ page | нет описания | p01-exports.mjs prints the array; grep of charts/**/index.md finds no mention. |
| export | `generateMockPrices` | export | assets/charts/src/index.js | README; /charts/installation/ — демо-хелпер вне гарантии | ✅ решено (шаг 7) | K-04 |
| export | `VERSION` | export | assets/charts/src/index.js:27; src/version.json | README:203 (name only) | нет описания | p01-exports.mjs: VERSION "v0.9.8_6"; same value feeds banner (build-charts.mjs:21) and _d… |
| export | `DOCS_URL` | export | assets/charts/src/index.js:26 | README:203 (name only) | нет описания | p01-exports.mjs. |
| export | `d3 (documented subset)` | export | assets/charts/src/index.js | README; /charts/installation/ | ✅ решено (шаг 7) | K-13 |
| export | `CSS injection on load` | other | assets/charts/src/index.js:11-20 | README:21 ('No separate D3 or CSS import is required') | ✅ совпадает | p01-exports.mjs: #rc-base-styles text length 27,204 in the readable bundle. |
| export | `Export list as a whole (28 names)` | export | assets/charts/src/index.js | README (классы и утилиты, включая `generateMockPrices` и подмножество `d3`); /charts/installation/ | ✅ исправлено (доки, шаг 7) | K-04, K-13 |
| Graph | `view` | option | charts/Graph.js:170,377,469 | charts/graph/index.md:222-227; Graph.js:29 | ✅ исправлено (доки) | p08-view.mjs: view:'cluster' + setData -> rendered view 'ego', 3 nodes; view:'path' + set… |
| Graph | `dataSource (source adapter contract)` | option | charts/Graph.js:169,234,261,276-278,337-360,1910-1934; grap… | charts/graph/index.md:39-56,229-232; README:157-177 | ✅ исправлено (доки) | p02-source.mjs call log: neighbors('a', {depth:2,types:null}); connect -> paths(a,d,{k:3}… |
| Graph / ego | `depth` | option | charts/Graph.js:231,509 | charts/graph/index.md:234-239 | ✅ совпадает | p02-source.mjs: neighbors called with depth 2. |
| Graph / ego | `groupBy` | option | charts/Graph.js:1005; graph/layouts/ego.js:102-105 | charts/graph/index.md:240-245 | ✅ совпадает | p03-ego.mjs: sector labels 'other,person'. |
| Graph / ego | `sectorLabels` | option | charts/Graph.js:1004,1511 | charts/graph/index.md:246-251 | ✅ совпадает | p03-ego.mjs. |
| Graph / ego | `hiddenNodes` | option | charts/Graph.js:186,984-993 | charts/graph/index.md:252-257 | ✅ совпадает | p03-ego.mjs: hiddenNodes ['b'] -> b not drawn, footer '1 hidden · restore'. |
| Graph / ego (filters traversal); stored but inert in path/cluster | `relationTypes` | option | charts/Graph.js:180-182,201-203; graph/model.js:123-128 | charts/graph/index.md:258-263; README:148 | ✅ совпадает | p03-ego.mjs: relationTypes [] -> null. p05-misc.mjs: setRelationTypes in path view -> 0 s… |
| Graph / ego | `interactiveLegend` | option | charts/Graph.js:1679,1700; graph/views/flow.js:923-927 | charts/graph/index.md:264-269; README:140,149 | решение | K-05 |
| Graph / ego\|path\|cluster | `breadcrumbs / historyLimit` | option | charts/Graph.js:1760-1815 | charts/graph/index.md:270-281; README:150-151 | ✅ совпадает | Code read; p03-ego.mjs history after setData keeps old states (see setData row).; R-17 (шаг 7a): setData начинает историю заново |
| Graph / ego\|path\|cluster | `onNodeClick` | callback | charts/Graph.js:1501-1508 | charts/graph/index.md:282-287; Graph.js:39 | ✅ исправлено (код) | p03-ego.mjs: onNodeClick null -> root after click on b = 'b'; false -> 'a'; 'none' -> 'a'. |
| Graph / path | `pathCount / pathContext / pathContextCount` | option | charts/Graph.js:261,274,292 | charts/graph/index.md:288-305 | ✅ совпадает | p02-source.mjs: paths called with {k:3}; context neighbors calls observed. |
| Graph / ego\|cluster | `semanticZoom` | option | charts/Graph.js:1630-1641 | charts/graph/index.md:306-311,483 | ✅ совпадает | Code read. |
| Graph | `height` | option | charts/Graph.js:161,556,677 | charts/graph/index.md:312-317,406-410 | ✅ совпадает | p05-misc.mjs: details below -> card height 720px (520+200). |
| Graph | `nodeRadius` | option | charts/Graph.js:1003,1018,1106; graph/views/flow.js:357 | charts/graph/index.md:318-323; charts/graph/flow/index.md:126 | ✅ совпадает | p04-flow.mjs: flow circle r=18. |
| Graph / ego\|path\|cluster (flow ignores) | `nodeIcons` | option | charts/Graph.js:206-208,1371,1430; graph/icons.js:7-26 | charts/graph/index.md:324-329 | ✅ совпадает | p07-readme.mjs: 2 icons for groups person/company. |
| Graph / ego\|path\|cluster | `sizeBy` | option | charts/Graph.js:1111-1119 | charts/graph/index.md:330-335,182 | ✅ совпадает | Code read. |
| Graph / all views | `zoom` | option | charts/Graph.js:587-604,831-845 | charts/graph/index.md:336-341,477 | ✅ совпадает | Code read. |
| Graph / all views | `details` | option | charts/Graph.js:629-733; graph/views/flow.js:705,739-748 | charts/graph/index.md:342-347; charts/graph/flow/index.md:153; Graph.… | ✅ исправлено (доки) | p05-misc.mjs: side at 1000px card, below at 700px (card 720px); destroy returns the page… |
| Graph | `detailsFormat` | option | charts/Graph.js:729-732 | charts/graph/index.md:348-353 | ✅ совпадает | Code read. |
| Graph | `detailsWidth / detailsBreakpoint / detailsHeight` | option | charts/Graph.js:667-682 | charts/graph/index.md:354-359 | ✅ совпадает | p05-misc.mjs. |
| Graph | `fullscreen + toggleFullscreen(on?)` | option | charts/Graph.js:847-856,870-902 | charts/graph/index.md:360-365,456,477 | ✅ совпадает | p05-misc.mjs: no API in jsdom -> overlay class, 100vh; destroy leaves it. |
| Graph / ego | `maxNodes` | option | charts/Graph.js:1055-1077; graph/layouts/ego.js:28-32 | charts/graph/index.md:366-371,408 | ✅ исправлено (доки) | p03-ego.mjs: 200×150 canvas, 40-node star -> 12 nodes drawn, '+28 more'. |
| Graph / ego\|path\|cluster | `draggable` | option | charts/Graph.js:1462-1464,1565-1599 | charts/graph/index.md:372-377,479 | ✅ совпадает | Code read. |
| Graph | `linkTypes` | option | charts/Graph.js:194-196,1894-1897; core/links.js:202-219; g… | charts/graph/index.md:184-197,378-383 | ✅ исправлено (доки) | p03-ego.mjs with theme.muted '#123456': no linkTypes -> stroke #888888, legend 'Connectio… |
| Graph | `tooltipFormat` | callback | charts/Graph.js:1475-1478; graph/views/flow.js:742-745 | charts/graph/index.md:384-389 | ✅ решено (шаг 7) | K-09 |
| Graph | `linkTooltipFormat` | callback | charts/Graph.js:1311-1317; graph/views/flow.js:750-755 | charts/graph/index.md:390-395 | ✅ решено (шаг 7) | K-09 |
| Graph / ego\|path\|cluster | `duration` | option | charts/Graph.js:1122 | charts/graph/index.md:396-401 | ✅ совпадает | Code read. |
| Graph | `margin` | option | charts/Graph.js:162; core/Chart.js:52-57,207 | charts/settings/index.md:146 (common default 16/70/16/0); none on Gra… | ✅ исправлено (доки) | O-07 |
| Graph | `common options (title, subtitle, legend, source, note, controls, them…` | option | core/Chart.js:98-319; charts/Graph.js:565 | charts/graph/index.md:209 -> /charts/settings/ | ✅ совпадает | p07-readme.mjs title rendered; applySvgA11y called at Graph.js:565. |
| Graph flow / flow | `lanes / laneBy` | option | graph/views/flow.js:52-65,84-97,220-224 | charts/graph/flow/index.md:67,106-107 | ✅ совпадает | R-09 |
| Graph flow / flow | `nodeGroups` | option | graph/views/flow.js:225-233,900-907 | charts/graph/flow/index.md:108 | ✅ совпадает | p04-flow.mjs: fold group g2 -> fill #222222. |
| Graph flow / flow | `nodeShapes / shapeBy` | option | graph/views/flow.js:234-241,611-617 | charts/graph/flow/index.md:109 | ✅ исправлено (код) | p04-flow.mjs without nodeShapes: kind 'mixer' -> <path d='mixer'>, kind 'Multisig' -> <pa… |
| Graph flow / flow | `linkColorBy / linkWidth / linkDash / linkLabels` | option | graph/views/flow.js:242-246,446-459,550 | charts/graph/flow/index.md:76-77,110-113 | ✅ совпадает | p04-flow.mjs: max-value tie width 22; setLinkLabels(false) -> 0 labels. |
| Graph flow / flow | `hulls` | option | graph/views/flow.js:411-443 | charts/graph/flow/index.md:114 | ✅ совпадает | p04-flow.mjs: 1 hull, setHulls([]) -> 0. |
| Graph flow / flow | `hiddenLinkTypes` | option | graph/views/flow.js:189,335-346 | charts/graph/flow/index.md:115,151 | ✅ совпадает | p04-flow.mjs: 'noise' legend aria-pressed false, its only node d not drawn. |
| Graph flow / flow | `layout` | option | graph/views/flow.js:40-76; graph/layouts/flowAuto.js | charts/graph/flow/index.md:23-33,116 | ✅ исправлено (шаг 7a) | Code read. C-38: короткий рисунок сначала отдаёт строкам верхний и нижний отступы (minPad 8) — test/graph-fixes-7a.test.js |
| Graph flow / flow | `folds` | option | graph/views/flowFold.js:21-45,82-93; graph/views/flow.js:26… | charts/graph/flow/index.md:82,117; CHANGELOG.md:28 | ✅ исправлено (доки) | O-03 |
| Graph flow / flow | `onFoldChange` | callback | graph/views/flow.js:315-325 | charts/graph/flow/index.md:118 | ✅ совпадает | p04-flow.mjs: expand('f') -> {id:'f', collapsed:false, fold keys id\\|members\\|collapsed… |
| Graph flow / flow | `aggregateLinks` | option | graph/views/flowFold.js:96-152 | charts/graph/flow/index.md:84,119 | ✅ совпадает | p04-flow.mjs: two 't' ties -> one tie value 3, label '2 ties' drawn; the single 'u' tie k… |
| Graph flow / flow | `laneCap` | option | graph/views/flow.js:264-289 | charts/graph/flow/index.md:84,120; Graph.js:105-106; CHANGELOG.md:30 | ✅ исправлено (доки) | O-03 |
| Graph flow / flow | `timeframes / navigator` | option | core/Chart.js:440-547,600-644; charts/Graph.js:468-474,969 | charts/graph/flow/index.md:86-88,121-122 | ✅ совпадает | p04-flow.mjs: custom {key:'jan', range} button active; setTimeframe('ALL') -> all ties on. |
| Graph flow / flow (with timeframes or navigator) | `defaultView` | option | core/Chart.js:561-575,467-471 | none on charts/graph/flow/index.md (only Line/TimeSeries/DualAxes/Bar… | ✅ исправлено (доки) | O-03 |
| Graph flow / flow (with timeframes) | `defaultTimeframe` | option | core/Chart.js:572-574,616-620 | none on charts/graph/flow/index.md | ✅ исправлено (доки) | O-03 |
| Graph flow / flow | `timeWindowMode` | option | graph/views/flow.js:347,382-387; core/links.js:124-130 | charts/graph/flow/index.md:78,123; Graph.js:114,433-436 | ✅ исправлено (код) | p05-misc.mjs setTimeWindow('2024-02', null): dim -> b opacity 0.2; hide -> b opacity 1 wi… |
| Graph flow / flow | `onSelect` | callback | graph/views/flow.js:698-715,763-773,787-797; charts/Graph.j… | charts/graph/flow/index.md:21,124,143 | ✅ совпадает | p04-flow.mjs: with onSelect tie click -> not pinned, payload keys node,link,event; backgr… |
| Graph flow / flow | `minWidth` | option | charts/Graph.js:670-671,945-950 | charts/graph/flow/index.md:125,157 | ✅ совпадает | Code read. |
| Graph | `node.id / node.label` | data | graph/model.js:64-69; charts/Graph.js:221,406 | charts/graph/index.md:60,73-84 | ✅ совпадает | p03-ego.mjs: ids 0,1,2 -> focus(0) works, root '0'. |
| Graph | `node.group` | data | charts/Graph.js:1129,1371,1430,1757,1876; graph/layouts/ego… | charts/graph/index.md:85-90 | ✅ исправлено (доки) | p03-ego.mjs: node fills only #000000 (anchor) and #f5f5f5 (theme.surface) whatever the gr… |
| Graph / ego\|path\|cluster (flow: color only) | `node.size / color / image / hidden` | data | charts/Graph.js:1111-1131,1376-1385,984-993 | charts/graph/index.md:91-114 | ✅ совпадает | Code read; hidden via p03-ego.mjs. |
| Graph flow | `node hints lane, row, col, x, y, main; tie main, bend` | data | graph/views/flow.js:52-159,481-503; graph/layouts/flowAuto.… | charts/graph/flow/index.md:30-32,65-75 | ✅ совпадает | Code read (rowY grows downwards: -1 above, 1 below). |
| Graph flow / flow (details panel in all views) | `node.sub` | data | graph/views/flow.js:625-630; charts/Graph.js:767 | charts/graph/flow/index.md:58 (example only); none in Placing nodes | ✅ исправлено (доки) | O-03 |
| Graph flow / flow | `node.terminal` | data | graph/views/flow.js:631-634 | none | ✅ исправлено (доки) | O-03 |
| Graph / details: true, all views | `node.note / node.description` | data | charts/Graph.js:768 | none | ✅ исправлено (доки) | Code read. |
| Graph | `link source / target (from / to)` | data | graph/model.js:93-99; core/links.js:20-25 | charts/graph/index.md:121-144; charts/graph/flow/index.md:75 | ✅ совпадает | p02-source.mjs: { from:'a', to:'e' } traversed. |
| Graph | `link.id (and generated ids)` | data | core/links.js:28-30,72-114; graph/model.js:38-57,105-139 | charts/graph/index.md:146-151 | ✅ решено (шаг 7, K-07) | ego/path/cluster `source→target\|type` (+`#n` при занятом ключе), flow `source→target#n`; оба заморожены до 1.0, порождаются только в core/links.js; test/relation-data.test.js |
| Graph | `link.type` | data | charts/Graph.js:1133,1222,1227; graph/model.js:128 | charts/graph/index.md:152-157 | ✅ совпадает | Code read. |
| Graph / ego\|path\|cluster | `link.weight / link.strength` | data | charts/Graph.js:1224 (strength ?? weight); graph/layouts/eg… | charts/graph/index.md:158-163 | ✅ исправлено (код) | p03-ego.mjs: { weight: 1, strength: 0.1 } -> stroke-width 0.75 (from strength). |
| Graph | `link.label / value / start / end` | data | core/html.js:67-82; graph/views/flow.js:550; charts/Graph.j… | charts/graph/index.md:164-169,469; charts/graph/flow/index.md:75-78 | ✅ совпадает | p04-flow.mjs details: Value 3, Period 2020 – 2021. |
| Graph | `link.sources` | data | core/html.js:16,52-62; charts/Graph.js:776-780 | charts/graph/index.md:170-175 | ✅ исправлено (доки) | p04-flow.mjs details: 'https://x.test/1' linked; 'javascript:alert(1)' and 'rel/path' as… |
| Graph | ``flows` collection alias` | data | core/links.js:93-98 (все виды); graph/model.js:54-57 | none for Graph (inventory :498 assigns it to MapFlow) | ✅ решено (шаг 7, K-07) | алиас читают все виды, не только flow; доки Graph его не упоминают (вне шага); test/relation-data.test.js |
| Graph flow / flow | `fold meta-node payload (onSelect, tooltipFormat, linkTooltipFormat)` | data | graph/views/flowFold.js:82-93 | none on charts/graph/flow/index.md (API-INVENTORY:574 only) | ✅ исправлено (доки) | p04-flow.mjs: id 'fold:f', label 'Beta', sub '2 nodes', group 'g2'. |
| Graph flow / flow | `aggregated tie payload` | data | graph/views/flowFold.js:125-152 | charts/graph/flow/index.md:84 ('value summed — the tooltip lists the… | ✅ исправлено (доки) | p04-flow.mjs: v=3, label '2 ties', n=2. |
| Graph | `focus(id, { types? })` | method | charts/Graph.js:219-250 | charts/graph/index.md:440-443; README:124-125 | ✅ совпадает | O-09 |
| Graph | `connect(a, b)` | method | charts/Graph.js:255-329 | charts/graph/index.md:444; README:126 | ✅ исправлено (шаг 7a) | p02-source.mjs call log. R-18: a === b → один узел без маршрутов; paths(a, a) источника → [[a]] (доки: charts/graph/index.md, Data source) |
| Graph | `overview()` | method | charts/Graph.js:333-365 | charts/graph/index.md:445; README:127 | ✅ совпадает | p05-misc.mjs: labels 'p0 · 12'. |
| Graph / ego\|path\|cluster | `setData(data) — ego/path/cluster` | method | charts/Graph.js:371-398 | charts/graph/index.md:446-448; README:119; charts/settings/index.md:2… | ✅ исправлено (шаг 7a) | R-17: новая история и каталог типов легенды; автофокус — наибольшее число различных соседей по рисуемым связям (from/to, без self и неполных, с relationTypes); пустой набор очищает рисунок — test/graph-fixes-7a.test.js (9). R-21 остаётся закрытым |
| Graph flow / flow | `setData(data) — flow` | method | charts/Graph.js:404-418,911-940 | charts/graph/flow/index.md:35-63 | ✅ совпадает | Code read; CHANGELOG Fixed 'Empty data'. |
| Graph / ego (path/cluster: model only; flow: no visible effect) | `add(payload)` | method | charts/Graph.js:505-515 | charts/graph/index.md:449-450,461; Graph.js:129 | ✅ исправлено (доки) | p03-ego.mjs: ego add -> 'zz' drawn; p04-flow.mjs: flow add -> drawn a,b (z missing). |
| Graph | `hide(id) / show(id)` | method | charts/Graph.js:518-519 | charts/graph/index.md:451,481; README:132-133 | ✅ совпадает | p03-ego.mjs. |
| Graph / ego | `setRelationTypes(types) / clearRelationTypes()` | method | charts/Graph.js:522-531 | charts/graph/index.md:452-453,471; README:129-130 | ✅ совпадает | p03-ego.mjs, p05-misc.mjs. |
| Graph | `back() / clearHistory()` | method | charts/Graph.js:534-548 | charts/graph/index.md:454-455,475 | ✅ совпадает | Code read; p07-readme.mjs runs the README sequence without errors. |
| Graph | `whenReady()` | method | charts/Graph.js:551,1924-1935 | charts/graph/index.md:436,457; README:116 | ✅ исправлено (доки) | p02-source.mjs: throwing source -> whenReady resolved, console.error logged. |
| Graph | `Method return values (claim 'all methods return the chart instance')` | method | charts/Graph.js:447,551; core/Chart.js:665 | charts/graph/index.md:436; Graph.js:122 | ✅ исправлено (доки) | p03-ego.mjs: isCollapsed 'boolean', getView null. |
| Graph flow / flow | `setFilter(fn) / setTimeWindow(from, to) / setLinkLabels(on) / setHull…` | method | charts/Graph.js:427-442,489-499 | charts/graph/flow/index.md:133-137 | ✅ совпадает | p04-flow.mjs: all return this; setTimeWindow(null,'2024-01') keeps Jan, dims Mar; nav set… |
| Graph flow / flow | `select(id \| { link }) / clearSelection()` | method | charts/Graph.js:477-486; graph/views/flow.js:698-715,855-876 | charts/graph/flow/index.md:135 | ✅ совпадает | p04-flow.mjs: select('b') folded -> fold:f; select('nope') keeps it; onSelect ['fold:f']. |
| Graph flow / flow | `collapse(id) / expand(id) / isCollapsed(id) / setFolds(list)` | method | charts/Graph.js:445-464; graph/views/flow.js:311-325 | charts/graph/flow/index.md:138 | ✅ совпадает | p04-flow.mjs: expand returns this; setFolds keeps collapsed state; isCollapsed('lane:L')… |
| Graph flow / flow | `setTimeframe(key) / setView([from, to]) / getView() / onViewChange(fn)` | method | core/Chart.js:633-686 | charts/graph/flow/index.md:139 (getView not listed); charts/graph/ind… | ✅ исправлено (доки) | p04-flow.mjs: setTimeframe('ALL') returns this, onViewChange fired. |
| Graph | `destroy()` | method | charts/Graph.js:1939-1954; core/Chart.js:695-731 | charts/settings/index.md:279 | ✅ совпадает | p05-misc.mjs: page details panel back in its section, class and aria-live removed, contai… |
| Graph | `render(), onScaleChange() (inherited)` | method | core/Chart.js:270-273,690; charts/Graph.js:911 | none | внутреннее | Code read. |
| Graph | `Private surface (excluded)` | other | charts/Graph.js (_focusTask, _setFlowData, _flow, _setFold,… | none (correct) | внутреннее | Not exported from src/index.js (p01-exports.mjs). |
| Graph | `.rc-graph-details (+ .rc-graph-details-kind, -muted, h4/dl/ul styles)` | css-class | charts/Graph.js:649; assets/charts/rare-charts.css:898-936 | none | ✅ исправлено (шаг 7a) | The flow demo's own panel uses .rc-graph-details-kind (graph-flow-demo.js:149,158,163).; C-37: список связей узла — `ul.rc-graph-details-ties` без маркера и отступа (и без Rare Styles) |
| Graph / all views | `keyboard access` | other | graph/roving.js; charts/Graph.js _draw (Keyboard); graph/views/flow.js render (Keyboard) | charts/graph/index.md Interaction «Keyboard»; charts/graph/flow/index.md Interaction «Keyboard» | ✅ исправлено (шаг 7a) | K-20: test/graph-keyboard.test.js (17); Chrome на демо: Tab → узел/связь, :focus-visible, подсказка, Enter, Escape |
| Graph | `theme tokens read by Graph` | theme-token | charts/Graph.js:788,809-811,1129-1131,1252-1253,1390,1398,1… | /charts/styles/ (surface = Graph node fills, flow lane bands) | ✅ совпадает | X-11, K-14 |
| memorySource | `neighbors / paths / aggregates (memorySource implementation)` | method | graph/source.js:20-60; graph/model.js:123-189 | charts/graph/index.md:41-47 | ✅ исправлено (доки) | p02-source.mjs: communities keys id,size,top,label,members; links {source:'c0',target:'c1… |
| memorySource | `O-09 client caching promise` | other | charts/Graph.js:18-19,234,261,337 | charts/graph/index.md:56; Graph.js:19 | ✅ исправлено (доки) | O-09 |
| adapters | `mapping normalisation (applyMapping)` | other | assets/charts/src/adapters/index.js:56-78 | charts/data-import/index.md:36-38,50,160-169 | ✅ исправлено (доки) | p06-adapters.mjs: function mapping returning '2026-01-01' / '148.50' -> Date / 148.5 (sam… |

Ложные обещания документации: 40, исправлено 31 (из них 1 — шаг 7a: settings:268, пустой набор Graph — R-17).
Открытые:

- `assets/charts/CHANGELOG.md`:30 — `laneCap: n` — the lightest nodes of a lane beyond `n` fold into a "+N more" node, opened with its +. → Lane keeps n−1 nodes + the '+N more' node (probe p04-flow.mjs).
- `assets/charts/CHANGELOG.md`:28 — Folds (`folds: [{ id, label?, members, anchor?, collapsed?, sub? }]` → Folds also take `group` (flowFold.js:86; colours the folded node). Probe p04-flow.mjs: group 'g2' -> fill #222222.
- `assets/charts/README.md`:70 — Chart types table (lines 60-72) — 11 classes; Graph: 'Deterministic ego, path, and cluster views' → src/index.js exports 14 classes: HierarchicalBar, Sankey, MapFlow are missing; Graph also has the flow view (O-01). Probe p01-exports.mjs.
- `assets/charts/README.md`:85 — It renders the answer to a query through three deterministic views: ego, path, cluster; (:119) setData() wraps static data in memorySource(… → A fourth view, flow (view: 'flow'), draws a whole trace from setData() without memorySource or focus (Graph.js:377,404-418).
- `assets/charts/README.md`:198 — The global bundle also exports: themes, defaultTimeframes, linkPresets and memorySource, VERSION and DOCS_URL, d3 → generateMockPrices is also exported (index.js:49) and listed nowhere.
- `scripts/build-charts.mjs`:28 — Graph flow: nodes without row/col are laid out automatically (layout: 'auto'); … timeframes and navigator filter ties by start/end. → x/y also pin a node (flowAuto.js:33); timeframes/navigator dim out-of-period ties by default (timeWindowMode 'dim'), they do not filter (O-01). Probe p04-flow.…
- `assets/charts/src/index.js`:4 — // Future CDN: <script src="https://cdn.raredigits.io/charts/v1.0.0/rare-charts.js"></script> → Distribution is jsDelivr from raredigits/rare-charts tags (README:12,18); the raredigits.io CDN does not exist (O-01).
- `charts/installation/index.md`:135 — RareCharts.Graph — Force-directed network of nodes and links → Graph has no force simulation: deterministic grid/route/community layouts and a lane trace (Graph.js:2-13) (O-01).
- `charts/settings/index.md`:213 — yTickFormat: v => d3.format(',.0f')(v) + ' units' (also :217-218 and :235 d3.timeFormat) → The bundle defines no global `d3`; it is RareCharts.d3 (index.js:68). Pasted on a page with only rare-charts.js the snippets throw ReferenceError. The examples…

<sub>Contracts reviewed: 92 rows (24 export-level incl. the 28-name export list, 32 Graph ego/path/cluster/common options and callbacks, 22 flow options/callbacks, 21 data-shape contracts, 22 methods, 1 CSS hook, 1 theme-token set, memorySource/O-09/adapter mapping, 1 explicit private-surface exclusion). Status: ok 49, missing 25, contradicts 12, decision 9 (K-04 ×2, K-05, K-07 ×2, K-09 ×2, K-13), internal 2. Claims checked: charts/graph/index.md ~150 (14 false/imprecise), charts/graph/flow/index.md ~100 (7), charts/data-import/index.md ~35 (3), README export table + quick start + Graph API + adap…</sub>

### Примеры, проверки и исключения (O-10, шаг 6)

- **Опубликованные примеры:** все 41 демо, подключённые на `/charts/*`, выполнены на собранном бандле в headless Chrome при 1280 и 375 px (сайт собран `npx @11ty/eleventy --output=<scratch>`), плюс 72 запуска сниппетов из страниц, README и installation на голой странице без Rare Styles и минимальный пример для каждого класса. Ошибок страницы/консоли и неудачных запросов нет; обещанный результат сверен с текстом (ширина `barWidth`, `data[].color`, тема тултипов светлая/тёмная, Pie, folds, MapFlow).
- **Сайт и поставка:** `scripts/check-links.mjs` по собранному сайту, мобильная вёрстка 375 px (таблицы в `.table-scroll` + временное правило в `rare-website.css`), smoke готового бандла без Rare Styles (Line + navigator, Pie/Donut, два TimeSeries, Graph flow с folds, MapFlow, Sankey; повторный `setData`, пустой ввод, `destroy`), реальный браузер: светлая/тёмная тема, узкая карточка, клавиатура, кисть и зум, короткие дуги, панели Graph.
- **Состязательная проверка правок шага 6:** 5 направлений, 14 подтверждённых находок исправлены (регрессия меток по дням, навигатор Bar при смене режима, зазоры скрытых элементов, анимация HierarchicalBar возвращена, тексты).
- **Не закрыто в этом проходе (с ID):** K-16 — частично (рендер flow-вида ~33 мс на 300 узлах / 900 связях: ширины подписей и раскладка flowAuto не кэшируются); D-10 — доки описывают задуманное поведение; K-21 (публичность `drillTo`) и контракты K-04/K-07/K-09/K-10/K-13 — шаг 7; часовой пояс TimeSeries (T-10) — 0.9.8_7. Шаг 7a закрыл C-15…C-19, C-21, C-22, C-24, C-25, C-28, C-30…C-39, R-13, R-14, R-17, R-18, K-12, K-17…K-20, K-22; формат чисел по умолчанию (C-30) и тики TimeSeries по размаху вида (C-31) вышли в 0.9.8_6. Новые находки шага 6 — в AUDIT §8 «Найдено при шаге 6».
- **Повторить после шага 7:** строки с «решение» (K-04/K-07/K-09/K-13), прогон опубликованных примеров и сниппетов, замер размера бандла для CHANGELOG.

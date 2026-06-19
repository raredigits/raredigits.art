# RareCharts — Public API Inventory (Internal)

> **Непубличный файл** (см. `.eleventyignore`). Рабочая поверхность для аудита API перед заморозкой 1.0 — пункт **N2** в [ROADMAP-INTERNAL](./ROADMAP-INTERNAL.md).

**Цель:** перед 1.0 пройти по всем публичным классам и свести воедино имена опций и форму данных, чтобы (а) проверить консистентность между типами и (б) зафиксировать контракт, который замораживаем по semver.

**Как заполнять:** у каждого класса в `assets/charts/src/charts/*.js` в шапке есть блок-комментарий с перечнем опций + деструктуризация `this.options.*` в `render`. Источник истины по форме данных — `.setData()` и `_normalizeData`.

**Статус:** скелет. Bar заполнен как образец, остальные — `TODO`.

**Условные обозначения:** ✅ согласовано · ⚠️ расходится между классами (кандидат на унификацию) · ❓ под вопрос к 1.0.

---

## Сводка по типам

| Класс | Файл | Форма данных | Инвентарь |
|-------|------|--------------|-----------|
| Line | `charts/Line.js` | `[{ date, value }]` / series | TODO |
| TimeSeries | `charts/TimeSeries.js` | OHLCV `[{ date, open, high, low, close, volume }]` | TODO |
| Overview | `charts/Overview.js` | (навигатор для TimeSeries) | TODO |
| Bar | `charts/Bar.js` | `[{ label, value }]` или time-series `[{ date, value }]` | заполнено ниже |
| DualAxes | `charts/DualAxes.js` | два ряда на независимых осях | TODO |
| Donut / Pie | `charts/Donut.js` | `[{ label, value }]` | TODO |
| Gauge | `charts/Gauge.js` | `{ value, target }` | TODO |
| Graph | `charts/Graph.js` | `{ nodes, links }` | **experimental — вне 1.0 (B3)** |
| MultiChart | `charts/MultiChart.js` | контейнер дочерних графиков | TODO |
| Map | `charts/Map.js` | `[{ region, value }]` | TODO |
| Адаптеры | `adapters/index.js` | `fromJson/fromCsv/fromApi/fromArray(data, mapping)` | заполнено ниже |

---

## Общие опции (базовый `Chart`)

Из `core/Chart.js` — применимы ко всем типам. **Кандидаты на «общий контракт», который точно фиксируем в 1.0.**

| Опция | Тип | Назначение |
|-------|-----|------------|
| `title` | string \| HTMLElement | заголовок |
| `subtitle` | string \| HTMLElement | подзаголовок |
| `legend` | array \| … | легенда |
| `source` | string \| `{text,href}` \| array \| HTMLElement | атрибуция (v0.9.7) |
| `note` | string \| HTMLElement | editorial-note в футере (v0.9.7) |
| `theme` | object | тема |
| `margin` | `{top,right,bottom,left}` | поля |
| `height` | number | высота инстанса |
| `ariaLabel` | string | **новое (B4)** — явный accessible-name; иначе берётся из title/subtitle |

---

## Bar (образец заполнения)

**Форма данных:** `[{ label, value }]`; в time-series режиме — `[{ date, value }]`.

| Опция | Тип | Дефолт | Примечание |
|-------|-----|--------|------------|
| `animate` | boolean | `true` | анимация на первом рендере |
| `duration` | number (ms) | `500` | ⚠️ имя `duration` — сверить с другими классами (есть ли `animationDuration`?) |
| `stagger` | number (ms) | `0` | задержка по барам |
| `ease` | `'cubicOut'\|'cubicInOut'\|'linear'` | `'cubicOut'` | |
| `horizontal` | boolean | `false` | ориентация |
| `barWidthRatio` | number | — | доля ширины слота (см. backlog: `barWidth` в px) |
| `labelMaxLength` | number | — | обрезка подписи категории |
| `yTickFormat` | fn | — | формат значений |
| `tooltipFormat` | fn | — | кастомный тултип |

**Заметка аудита:** `duration`/`ease`/`stagger`/`animate` — это «моторный» блок, который, вероятно, повторяется в Donut/Gauge/DualAxes. Кандидат №1 на унификацию имён к 1.0. После введения `motionDuration()` (B4) гейт reduced-motion должен стоять у каждого из них.

---

## Адаптеры (образец заполнения)

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

## Открытые вопросы к заморозке (накапливаем по ходу аудита)

- ⚠️ Единое имя длительности анимации across типов (`duration` vs возможные варианты).
- ❓ Graph помечается experimental — убрать из таблицы «стабильных» типов в README (B3).
- ❓ Сверить имена форматтеров (`yTickFormat`, `xTickFormat`, `tooltipFormat`) на единообразие между Line / Bar / DualAxes / TimeSeries.
- ⚠️ *(низкий приоритет, косметика)* **Donut на нулевых данных.** `percent = value / total`; при `total = 0` (пустой/полностью нулевой набор) это `NaN` → подпись/тултип покажут «NaN%». Рендер не падает (d3.pie держит нули). Стоит подставлять `0%` при `total === 0`. Найдено smoke-тестом.
- ❓ **Часовые пояса в таймфреймах** (`resolveTimeframeExtent`, `core/utils.js`). Математика окон идёт в local time; `YTD` нормализуется к полуночи (`setHours(0,0,0,0)`), а относительные окна (`1Y`/`6M`) — нет. Для библиотеки «где даты важны» стоит осознанно решить к 1.0: считать всё в local или в UTC, и нормализовать время-суток единообразно. Не баг (поведение консистентно внутри local-мира), но кросс-TZ может сдвинуть границу окна на день. Найдено при написании тестов (B1).

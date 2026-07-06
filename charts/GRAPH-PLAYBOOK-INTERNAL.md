# RareCharts.Graph — боевой плейбук

> **Непубличный файл.** Не рендерится на сайт (см. `.eleventyignore`), хранится в git для команды.
> Что это и почему так устроено — [GRAPH-ARCHITECTURE-INTERNAL](./GRAPH-ARCHITECTURE-INTERNAL.md).
> Публичная API-справка — `/charts/graph/` (`charts/graph/index.md`). Этот файл — практика: как подключить к реальному проекту и какие сценарии из чего собираются.
> Статус: **experimental**, вне semver-гарантии 1.0. Собрано и проверено в ветке `graph_branch`.

## Из чего состоит

| Слой | Файлы | Роль |
|------|-------|------|
| Модель + алгоритмы | `assets/charts/src/graph/model.js`, `source.js` | graphology-обёртка: накопление, BFS, центральности, Louvain; `memorySource()` — симулятор бэкенда |
| Раскладки | `src/graph/layouts/{ego,path,cluster}.js` | чистые функции «подграф → координаты», детерминированные |
| Viewport | `src/charts/Graph.js` (+ `src/graph/icons.js`) | класс `RareCharts.Graph`: виды, интерактив, рендеринг темой Rare |

Тесты: `test/graph.test.js`. Демо: `assets/charts/examples/graph/*` (страница `/charts/graph/`).

## Схема данных — минимум

```js
{
  nodes: [{ id, label }],       // опционально: group, hidden, color, image, size
  links: [{ source, target }],  // опционально: type, weight (0..1), label
}
```

- `group` управляет иконкой и углом сетки в ego-виде; встроенные иконки: `person, company, fund, org, politics, education, crypto, lead, cluster`.
- `weight` — наблюдаемая сила связи из домена (объём сделок/транзакций). Важность узлов не задаётся — считается (degree/betweenness в модели).
- Минимальная единица приёма — **одна связь без nodes**: концы создадутся сами, label упадёт на id.

## Подключение данных — три способа

1. **Статичный набор**: `new Graph(el, {...}).setData({ nodes, links })` — внутри обернётся в memorySource и сфокусируется на самом связном узле.
2. **Источник**: `dataSource: RareCharts.memorySource(data)` — или свой адаптер с тем же контрактом (это и есть требования к бэкенду):

```js
dataSource: {
  neighbors: (id, { depth, types })  => Promise<{ nodes, links }>,   // ego
  paths:     (a, b, { k })           => Promise<{ paths, nodes, links }>, // path; k маршрутов, кратчайший первым
  aggregates:()                      => Promise<{ communities, links }>,  // cluster
}
```

`paths` обязан быть серверным на живых данных: клиент держит только «нагулянные» окрестности. Всё полученное копится в клиентской модели — повторные заходы не дёргают источник.

3. **Лента событий** («новость — новая связь», сценарий Lloyd's List):

```js
graph.add({ links: [{ source: 'Maersk', target: 'Suez Canal', type: 'incident', weight: 0.8 }] });
```

Каждый вызов мержит платёж в модель и перерисовывает текущий ego-вид.

## Три вида = три вопроса

| Вопрос | Вызов | Что рисуется |
|--------|-------|--------------|
| Кто вокруг X? | `graph.focus(id)` | сетка: X в центре, категории по углам, от дальнего угла к центру; удалённость ≈ рукопожатия |
| Как связаны A и B? | `graph.connect(a, b)` | ряды-маршруты с подписями `N hops`, кратчайший акцентирован; за конечными точками веера их прочих связей |
| Какова структура всей сети? | `graph.overview()` | Louvain-сообщества как мета-узлы; клик — нырок в ego лидера сообщества |

Все методы чейнятся; ожидание — `await graph.whenReady()`.

## Интерактив (всё включено по умолчанию)

- **клик по узлу** — перецентровка (`onNodeClick: 'recenter'`); свой сценарий — callback: в Columbus-демо клик по лиду вызывает `connect(rep, lead)`;
- **правый клик** — скрыть узел (ego; центр нельзя); возврат — приписка «N hidden · restore»; программно: `hide(id)/show(id)`, поле `hidden`, опция `hiddenNodes`;
- **hover** — тултип + подсветка окружения (остальное гаснет);
- **drag узла** — ручная доводка картинки; позиции живут до смены вида;
- **зум** — кнопки `+/−/⟲` (строка в левом нижнем углу), панорама перетаскиванием фона; колесо отдано скроллу страницы;
- **семантический зум** — сильное отдаление ego → cluster и обратно (`semanticZoom: false` отключает).

## Шпаргалка ключевых опций

```js
new RareCharts.Graph('#el', {
  view: 'ego',              // 'ego' | 'path' | 'cluster'
  dataSource,               // адаптер; «source» — это подпись-атрибуция в футере!
  depth: 2,                 // глубина ego
  maxNodes: 'auto',         // потолок узлов от размера канвы; «+N more» в углу
  pathCount: 3,             // маршрутов в connect()
  pathContext: true,        // веера связей за конечными точками (8 шт: pathContextCount)
  groupBy: 'group',         // угол сетки: по group узла | 'type' (по типу связи 1-го круга)
  linkTypes: RareCharts.linkPresets.personal,  // цвета/штрихи/подписи типов
  nodeIcons: { ... },       // расширить встроенный набор; false = без глифов
  sizeBy: undefined,        // размер единый; 'degree' — от связности, 'field' — из данных
  onNodeClick: 'recenter',  // | ({node, event}) => ... | null
  draggable: true, zoom: true, semanticZoom: true, sectorLabels: false,
})
```

## Рецепты

**Entity-профиль (Тиль):** `focus(id)` + `linkPresets.personal`, depth 2. Готовое демо: `examples/graph/graph-ego.js`.

**Warm intro (Columbus CRM):** ego вокруг сейлза; лиды с `group: 'lead'` (звезда) не связаны с ним напрямую; `onNodeClick`: лид → `connect(rep, lead.id)`, прочие → `focus`. Демо: `graph-columbus.js` + `columbus-data.js`.

**Новостной граф (Lloyd's):** пустой старт `setData({nodes:[{id:'hub',label:'…'}],links:[]})` или готовая база, дальше `add()` на каждое событие. Тип связи = тип события (`incident`, `deal`, `sanction`…) через свой `linkTypes`.

**Свой бэкенд:** реализовать контракт из трёх запросов (выше); клиентский код не меняется — проверено тем, что все демо работают на `memorySource`, который этот контракт лишь симулирует.

## Пределы и известные хвосты

- Бандл: graphology добавил ~130 KB к min-версии (379→509 KB) — перед мержем посмотреть выборочные импорты.
- В бэклоге (`/charts/backlog/` → Graph): редизайн тултипа (на хабах перегружен), стили зум-кнопок и «+N more», интерактивная легенда (клик по типу — изоляция связей).
- Длинные подписи соседних клеток сетки могут соприкасаться — лечится обрезкой по ширине клетки (кандидат в бэклог при боевой необходимости).
- Скрытые узлы не влияют на пути/расчёты — это фильтр отображения, не данных.

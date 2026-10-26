# RareCharts.Graph — боевой плейбук

> **Непубличный файл.** Не рендерится на сайт (см. `.eleventyignore`), хранится в git для команды.
> Что это и почему так устроено — [GRAPH-ARCHITECTURE-INTERNAL](GRAPH-ARCHITECTURE-INTERNAL.md).
> Публичная API-справка — `/charts/graph/` (`charts/graph/index.md`). Этот файл — практика: как подключить к реальному проекту и какие сценарии из чего собираются.
> Статус: **experimental**, вне semver-гарантии 1.0. Собрано и проверено в ветке `graph_branch`.

## Из чего состоит

| Слой | Файлы | Роль |
|------|-------|------|
| Модель + алгоритмы | `assets/charts/src/graph/model.js`, `source.js` | graphology-обёртка: направленный мультиграф (накопление), BFS, degree, Louvain по неориентированной проекции; `memorySource()` — симулятор бэкенда (пути — graphology-shortest-path) |
| Раскладки | `src/graph/layouts/{ego,path,cluster,flowAuto}.js` | чистые функции «подграф → координаты», детерминированные |
| Viewport | `src/charts/Graph.js` (+ `src/graph/icons.js`) | класс `RareCharts.Graph`: виды, интерактив, рендеринг темой Rare |
| Вид flow | `src/graph/views/flow.js`, `flowFold.js` | дорожки, свёртки, агрегация, `laneCap`; рисуется внутри Graph |
| Общий слой связей | `src/core/links.js` | `{ nodes, links }`, алиасы, время `start`/`end`, ширина, категории (`resolveLinkType`) — общий с Sankey и MapFlow |

Тесты: `test/graph.test.js` (DOM), `graph-model.test.js` (модель, источник, раскладки), `graph-flow.test.js` (DOM flow), `flow-layout.test.js` (раскладка flow), `links.test.js`, `relation-data.test.js`. Демо: `assets/charts/examples/graph/*` (`/charts/graph/`, `/charts/graph/flow/`).

## Схема данных — минимум

```js
{
  nodes: [{ id, label }],       // опционально: group, hidden, color, image, size
  links: [{ source, target }],  // опционально: type, weight (0..1), label
}
```

- `group` управляет иконкой и углом сетки в ego-виде; встроенные иконки: `person, company, fund, org, politics, education, crypto, lead, cluster`.
- `weight` — наблюдаемая сила связи из домена (объём сделок/транзакций). Важность узлов не задаётся — считается (по связности: `sizeBy: 'degree'`; betweenness из модели удалён в 0.9.8_6, X-01).
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

`paths` обязан быть серверным на живых данных: клиент держит только «нагулянные» окрестности. Всё полученное копится в клиентской модели (раскладка, идентичность узлов между видами), но это не кэш ответов: каждый `focus`/`connect`/`overview`/`back` снова зовёт источник — кэшировать на стороне бэкенда (O-09).

3. **Лента событий** («новость — новая связь», сценарий Lloyd's List):

```js
graph.add({ links: [{ source: 'Maersk', target: 'Suez Canal', type: 'incident', weight: 0.8 }] });
```

Каждый вызов мержит платёж в модель и перерисовывает текущий ego-вид.

## Четыре вида = четыре вопроса

| Вопрос | Вызов | Что рисуется |
|--------|-------|--------------|
| Кто вокруг X? | `graph.focus(id)` | сетка: X в центре, категории по углам, от дальнего угла к центру; удалённость ≈ рукопожатия |
| Как связаны A и B? | `graph.connect(a, b)` | ряды-маршруты с подписями `N hops`, кратчайший акцентирован; за конечными точками веера их прочих связей |
| Какова структура всей сети? | `graph.overview()` | Louvain-сообщества как мета-узлы; клик — нырок в ego лидера сообщества |
| Куда ушли деньги? | `view: 'flow'` + `setData()` | след по дорожкам слева направо; `/charts/graph/flow/` |

Все методы чейнятся; ожидание — `await graph.whenReady()`.

## Интерактив (всё включено по умолчанию)

- **клик по узлу** — перецентровка (`onNodeClick: 'recenter'`); свой сценарий — callback: в Columbus-демо клик по лиду вызывает `connect(rep, lead)`;
- **правый клик** — скрыть узел (ego; центр нельзя); возврат — кнопка «N hidden · restore» в подвале; программно: `hide(id)/show(id)`, поле `hidden`, опция `hiddenNodes`;
- **hover** — тултип + подсветка окружения (остальное гаснет);
- **drag узла** — ручная доводка картинки; позиции живут до смены вида;
- **зум** — кнопки `+/−/⟲` и ⛶ (полный экран) — в инструментах подвала справа от Source (с 2026-10-16), панорама перетаскиванием фона; колесо отдано скроллу страницы;
- **семантический зум** — сильное отдаление ego → cluster и обратно (`semanticZoom: false` отключает).

## Шпаргалка ключевых опций

```js
new RareCharts.Graph('#el', {
  view: 'ego',              // 'ego' | 'path' | 'cluster' | 'flow'
  dataSource,               // адаптер; «source» — это подпись-атрибуция в футере!
  depth: 2,                 // глубина ego
  maxNodes: 'auto',         // потолок узлов от размера канвы; «+N more» — кнопка в подвале
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

- Бандл: ядро graphology, Louvain и shortest-path — часть стека Graph; доля в бандле — K-13, перемерить в конце релиза. graphology-metrics (центральности) удалён в 0.9.8_6 (X-01). Отдельный `rare-charts-graph` — K-13, 1.x.
- В бэклоге (`/charts/backlog/` → Graph): ownership-раскладка, стратегии cluster-вида, chrome (иконки инструментов; тёмная тема инструментов, списка скрытых и details — B-05/K-14). Сделано: интерактивная легенда (`interactiveLegend`, 0.9.8_1), инструменты и «+N more» в подвале (0.9.8_3), перенос длинных имён в тултипах (0.9.8_6, C-29); отдельной задачи на тултип хабов в бэклоге нет.
- ✅ 2026-10-16: подписи обрезаются по ширине клетки (ручной прогон Graph, ROADMAP 0.9.8_3).
- Скрытые узлы не влияют на пути/расчёты — это фильтр отображения, не данных.

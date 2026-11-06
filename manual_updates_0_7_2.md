# Rare Styles v0.7.2 — ручные правки владельца

Временный файл: правки, сделанные руками при проверке драфта релиза. Перед релизом
перенести в changelog / backlog / доку, затем удалить файл.

## 1. Заголовки h2, h3, h5, h6 (`typography/_headings.scss`)

- h2, h3: отступы уменьшены — `margin: var(--space-md) 0 var(--space-sm)`
  (было `var(--space-lg) 0 var(--space-md)`).
- h5, h6: добавлен `font-family: var(--primary-font)`.

**Задача для доки:** в разделе типографики/заголовков указать, что h5 и h6
набраны основным шрифтом (`--primary-font`) и предназначены для технических
вставок — подписей на дашбордах и в таблицах, а не для структуры текста.

## 2. `.sidenote.sidenote-banner` (`typography/_notes.scss`)

Новый модификатор сайдноута: баннер с полосой слева
(`border-left: 4px solid var(--border-color-light)`, `margin-left: -4px`).
Использован в `styles/index.md`.

Отступ `padding: 0 0 0 var(--space-md)` на всех ширинах (владелец; было
`--space-sm`, на мобильном `--space-md`). На мобильном баннер занимает всю
ширину строки, на планшете — колонки 7–9 (раздел 12), на десктопе — колонку
заметки.

**Почему изначально не работало:** `.sidenote-wrapper` складывался в колонку
при `width < 1024px` (жёсткий брейкпоинт в `_notes.scss`), а миксин `mobile` —
это `width < 769px`. На 769–1023px сайдноут был растянут на всю ширину, но
`article p` ограничен `--text-content-width` = 7 колонок планшета. Снято
разделом 4: обёртка теперь складывается только на мобильном, где
`--text-content-width` уже 100%.

**Задачи:**
- Доку `.sidenote-banner` (что это, разметка, поведение на мобильном).
- На планшете баннер занимает колонки 7–9 (см. раздел 12).

## 3. Новый брейкпоинт `below-desktop` (`utilities/_breakpoints.scss`)

Добавлен миксин `@mixin below-desktop` — `@media screen and (width < $desktop-min)`:
планшет и мобильный одним медиа-блоком. `multi-breakpoint("tablet", "mobile")`
даёт то же, но двумя одинаковыми `@media` в собранном CSS.

**Сейчас нигде не используется:** сайдноуты сначала перевели на него, затем
(раздел 4) на `mobile`. Миксин CSS не генерирует, пока его не подключат.
**Решение владельца: оставляем** — понадобится (дашборды).

**Задачи:**
- Доку брейкпоинтов: добавить `below-desktop` в список миксинов.
- Changelog v0.7.2: новый миксин `below-desktop`.
- Осталось одно жёсткое значение: `@media (width < 769px)` в
  `decorations/_icons.scss:243` — заменить на `@include mobile`.

## 4. Сайдноуты: колонка на планшете, новая форма на мобильном (`typography/_notes.scss`)

**Планшет (769–1023px):** `.sidenote-wrapper` больше не складывается в колонку —
сетка как на десктопе, заметка в правой колонке, маркер на десктопной позиции.
Было: складывание и смещение маркера при `width < 1024px`; теперь оба только
под `@include mobile`.

**Мобильный (`width < 769px`):** обёртка складывается в колонку (как раньше),
плюс паттерн потребителя. Пример — How-To Grid на `/styles/layout/`.

- `.sidenote-wrapper > .sidenote` (кроме `.sidenote-banner`): над заметкой
  линия `border-top: 1px solid var(--border-color)`, текст выровнен по правому
  краю, `margin: var(--space-sm) 0`, `padding-bottom: var(--space-md)`;
  первый `p` — `margin: var(--space-sm) 0`.
- Маркеры `.sidenote-bookmark/-attach/-link/-bulb/-memory::before`: в левом
  верхнем углу (`top: 4px; left: 0`), `opacity: 0.4`,
  `font-size: var(--font-size-xl)`.
- Баннер исключён: у него своя форма — полоса слева, выравнивание по левому краю.

**Задачи:**
- Доку сайдноутов: планшет держит правую колонку; мобильное поведение (линия
  сверху, выравнивание вправо, маркер в углу), баннер в нём не участвует.
- Changelog v0.7.2: сайдноуты на планшете в колонке; мобильная форма.
- Потребителю — см. раздел 11.

## 5. Сайдноуты: общая мобильная форма, ритм, колонки-токены (`typography/_notes.scss`)

По разбору потребителя schnellreich_ru (`sch_styles.css`, на v0.7.1).

**Общая мобильная форма заметки на полях.** Локальный миксин
`margin-note-stacked` в `_notes.scss`: `margin: var(--space-sm) 0`,
`padding: var(--space-xs) 0 var(--space-md)`,
`border-top: 1px solid var(--border-color)`, `text-align: right`. Применён:
- к `.sidenote-wrapper > .sidenote` на мобильном (кроме баннера) — заменил
  раздельные правила из раздела 4; горизонтальный padding `--space-sm` снят;
- к `.footnote-inside-text` и `.aside-footer` на мобильном, плюс
  `float: none; width: auto` (раньше на телефоне оставались float справа
  шириной 2fr). У них общий блок правил, поэтому `.aside-footer` тоже.

**Ритм внутри заметки** (`.sidenote-wrapper > .sidenote > …`, только прямые дети):
- `p` — `margin: var(--space-xs) 0`;
- `h5`, `h6` — `margin: 0`;
- первый ребёнок — `margin-top: 0`, последний — `margin-bottom: 0`;
- на мобильном первый ребёнок (не у баннера) — `margin-top: var(--space-sm)`
  (было `--space-md` у первого `p`).

**Колонки — токены на `:root`:**
- `--sidenote-text-column` — текст строки;
- `--sidenote-wide-column` — широкие блоки (`caption-width`, см. раздел 6);
- `--sidenote-column` — заметка.
Переопределяются на `:root` или на одной обёртке.

**Значения по умолчанию изменены владельцем** (раскладка 6+2, как у
потребителя; было 5+2 с пустой колонкой 6):
- `--sidenote-text-column: 1 / span 6` (было `1 / span 5`);
- `--sidenote-wide-column: 1 / span 7` (было `1 / span 6`);
- `--sidenote-column: 8 / span 2` (было `7 / span 2`).
Текст строки стал на колонку шире; широкий блок теперь вплотную к колонке
заметки (между ними только `column-gap`). Потребителю раскладку 6+2 больше
переопределять не нужно.

**Тесты обновлены:**
- `test/browser/rendering.test.js` (CSS-358): обёртка складывается на 768px,
  сетка с 769px (было 1023/1024) — следствие раздела 4.
- `test/browser/typography.test.js` (CSS-372): верхний отступ первого абзаца
  заметки на телефоне 8px (было 16px); колонки по новым токенам —
  текст `1 / span 6`, заметка `8 / span 2` (было `1 / span 5`, `7 / span 2`).

**Задачи:**
- Доку сайдноутов: ритм заметки, токены колонок с примером переопределения.
- Доку `.footnote-inside-text` / `.aside-footer`: мобильная форма (фраза в
  `/styles/typography/notes/` «On mobile, it reverts to following the
  commented paragraph directly» — дополнить линией и выравниванием вправо).
- Changelog v0.7.2: токены `--sidenote-*-column`, ритм заметки, мобильная
  форма для inline-сносок.
- Потребителю — см. раздел 11.

**Следующий шаг:** заметка рядом с `.highlight` / `blockquote` /
`.text-content-caption` (у потребителя — `:has(blockquote)` с `margin-top`).

## 6. Заметка рядом с широким блоком на планшете (`typography/_notes.scss`)

Пример — Full-Width Layout Option на `/styles/layout/`. На планшете правый
выступ широкого блока (`caption-width`: до `min(--space-lg, --field-width +
--space-md)`, на 769–1279px это 16px) съедал `column-gap` и блок упирался в
заметку вплотную (зазор 0 на 900px).

- Список широких блоков вынесен в `$sidenote-wide` — семейство `caption-width`:
  `.highlight`, `.text-content-caption`, `.lead`, `.teaser-bottom`. Все они
  шире текстовой колонки и выступают вправо. Остальные выступающие (`pre`,
  `blockquote`, `.caption`, `.full-width-caption`, `.card-caption`,
  `.collapsible-container`) выступают только влево, до заметки не достают.
- Широкая колонка (`--sidenote-wide-column`) теперь у всех четырёх; раньше
  только у `.highlight` и `.text-content-caption`. **`.lead` и `.teaser-bottom`
  внутри `.sidenote-wrapper` стали на колонку шире.**
- `@include tablet`: `.sidenote-wrapper:has(> :is(широкие)) > .sidenote` —
  `margin-left: var(--space-md); width: auto`. Заметка сдвигается вправо и
  сужается, маркер едет вместе с ней. Зазор на 900px — 16px; заметка не
  выходит за обёртку; обычные заметки не тронуты.
- Десктоп не тронут: там зазор 120px (1300px).

**Задачи:**
- Доку сайдноутов: какие блоки считаются широкими в строке с заметкой.
- Changelog v0.7.2: отступ заметки рядом с широким блоком на планшете;
  `.lead`/`.teaser-bottom` в широкой колонке.

## 7. Баги со страницы `/styles/layout/`

**7.1. Верхний отступ первого заголовка** (`typography/_headings.scss`).
Правило было: `article > :is(h2, h3):first-child { margin-top: 0 }` — без h4
и без страниц, собранных из `<section>` (на `/styles/layout/` первый ребёнок
`article` — `section`, h2 получал 16px). Стало:
`article > :is(h2, h3, h4):first-child, article > section:first-child > :is(h2, h3, h4):first-child`.
Оба селектора внесены в инвентарь rd-gate (`scripts/rd-gate.config.mjs`);
тесты `rd-gate.test.js` / `rd-gate-negation.test.js` — на новый ключ.

**7.2. Удалено правило** `article .text-content-caption:first-child:not(.panel)
{ padding: 0 0 var(--space-sm) }` (`typography/_text-content.scss`). Селектор
потомка (0,2,1) бил утилиты padding: карточка `.card.text-content-caption
.padding-lg` первой в `.sidenote-wrapper` теряла свои 32px. Тест
`test/browser/panels.test.js`: padding такого caption теперь `0px` (было `0px 0px 8px`).

**7.3. `.phone-frame-wrapper` центрируется** (`special/_mockups.scss`):
`margin-inline: auto`. Блок фиксированной ширины (`width: fit-content`)
не центрировался `.center` — тот задаёт только `text-align`. На странице у
родителя `padding-l-5` (ручной сдвиг) заменён на `text-content-width`;
на 1300px зазоры слева и справа по 58px.

**Замечено, не правил:** в How-To Grid (`styles/layout/index.html:27`)
`<h5>` стоит внутри `<p>` — так нельзя по HTML, браузер закрывает `<p>`
перед `<h5>`, остаётся пустой `<p>`, ссылки — вне абзаца.

**Задачи:**
- Changelog v0.7.2: первый заголовок в `article > section`, h4;
  центрирование мокапа телефона. Правило 7.2 в changelog не нужно — оно
  появилось и удалено в этом же релизе.

## 8. Таблица в заметке на планшете переполняла страницу — закрыто

Следствие раздела 4 (планшет держит заметку в колонке). На
`/styles/typography/tables/` в заметке `.table-terminal` шириной 179px, а
колонка заметки на 769px — 99px: страница была шире окна (823 > 769), падали
4 теста `reference-pages.test.js` → «no horizontal page overflow».

Решено разметкой, библиотека не менялась: таблица в заметке обёрнута в
`.table-scroll` и прокручивается внутри заметки. Теперь ширина страницы
равна ширине окна, `reference-pages.test.js` — 18/18.

Док (`styles/typography/tables/index.md`): заметку «To limit table width…»
дополнил абзацем про `.table-scroll` для таблиц шире колонки, в том числе в
заметке на планшете.

**Задачи:**
- Changelog / доку сайдноутов: широкое содержимое в заметке (таблица, `pre`)
  на планшете оборачивать в `.table-scroll` — колонка заметки там ~100px.

## 9. `.table-terminal`: колонки разделены «gap», без паддингов ячеек (`typography/_tables.scss`)

У таблицы нет `gap`, а `border-spacing` добавил бы отступ и по внешним краям,
поэтому «gap» сделан отступом слева у каждой ячейки, кроме первой:
- `th`, `td` — `padding-inline: 0` (снимает и базовый `padding-right:
  var(--space-md)` у первой колонки);
- `:is(th, td) + :is(th, td)` — `padding-left: var(--space-sm)`: между
  колонками `--space-sm`, по краям таблицы 0, у последней колонки справа 0;
- `td` — `padding-block: 0`; у `th` вертикальный отступ остаётся
  (`--space-xs`), горизонтальная схема та же, чтобы заголовки стояли над
  значениями (особенно правый край последней колонки).

Таблица в заметке на `/styles/typography/tables/` стала 155px (была 179px).

**Зебра:** `.table-striped td { padding-block: var(--space-xs) }` — стоит
после блока `.table-terminal`, поэтому у `table-terminal table-striped`
строки снова с вертикальным отступом 4px; у обычного `.table-terminal`
строки остаются вплотную. Горизонтальная схема у зебры та же (0 по краям).

**Задачи:**
- Доку `.table-terminal`: колонки через отступ `--space-sm`, без отступов по
  краям, строки без вертикальных отступов.
- Changelog v0.7.2: новые отступы `.table-terminal`; `.table-striped` держит
  вертикальные отступы `td`.

## 10. Открытые вопросы и хвосты

Решено владельцем:
1. Баннер на планшете — своя колонка `7 / span 3` (раздел 12).
2. Заметка рядом с `blockquote` — остаётся как есть, без смещения
   (`:has(blockquote)` потребителя в библиотеку не берём).
3. `.lead` / `.teaser-bottom` в широкой колонке — подтверждено.
4. Правило 7.2 в changelog не нужно (появилось и удалено в v0.7.2).
5. Миксин `below-desktop` — оставляем (раздел 3).

Мелочи, без решения:
6. `<h5>` внутри `<p>` в How-To Grid (`styles/layout/index.html:27`) —
   поправить разметку.
7. `@media (width < 769px)` в `decorations/_icons.scss:243` → `@include mobile`.

## 11. Потребитель schnellreich_ru: что удалить после перехода на v0.7.2

В `/Users/dk/GitHub/schnellreich_ru/assets/css/sch_styles.css` проставлены
комментарии `REMOVE AFTER rare-styles v0.7.2` (не закоммичено). Сейчас он
на v0.7.1 (`_includes/head.njk`).

Удалить после перехода:
- `.footnote-inside-text` — мобильный `@media (max-width: 768px)` блок
  (форма из раздела 5); `margin-right: 0` и `font-weight` оставить.
- `.sidenote p { margin: var(--space-xs) 0 }` (раздел 5).
- `@media (max-width: 1024px)` — отмена складывания обёртки (раздел 4).
- Мобильный блок сайдноутов: `display: flex`, `.sidenote` (линия, вправо,
  отступы), `p:first-child` (раздел 4/5). **`::before` в нём оставить**: ниже
  в файле правило маркеров без медиа (`top: -12px; left: -18px`) перебьёт
  мобильную позицию из библиотеки. Либо обернуть то правило в
  `@media (min-width: 769px)` и тогда удалить и `::before`.
- `.the-story .sidenote h5 { margin-top: 0 }` — только эту строку,
  `text-align: left` оставить (раздел 5).
- Колонки `grid-column: 8/span 2` и `1/span 6` (раздел 5, новые дефолты 6+2).
  Заодно уйдёт селектор потомка `.sidenote-wrapper :not(:first-child,.sidenote)`,
  который размещал и вложенные элементы (CSS-372).
- `padding-top: var(--space-xs)` у `.sidenote-wrapper .sidenote`;
  `font-weight` оставить.

Мёртвое уже сейчас: `.sidenote-wrapper .sidenote::before {
font-variation-settings }` — маркеры давно SVG-маски, а не иконочный шрифт.

Добавлено после раздела 13:
- `.sidenote-wrapper + .sidenote-wrapper, .sidenote-wrapper + .highlight
  { margin-top: md }` — библиотека даёт `--space-md` между блоками потока
  статьи, строки сайдноутов включительно (прямые дети `article`/`section`).
- `.sidenote-wrapper p:first-child, p:last-child` — библиотека обнуляет нижний
  отступ последнего текстового блока строки.
- Достройка `.list-group-pack` для ≥1024px — библиотека сама выравнивает колонки
  (раздел 19). Число колонок тогда зависит от ширины; если нужно ровно 3, оставить.

Не трогать (0.7.2 не покрывает или это бренд):
- `.sidenote-wrapper:has(blockquote) .sidenote` — владелец решил не брать
  (раздел 10, п. 2); у потребителя остаётся его выбор.
- Блоки `REMOVE AFTER UPDATE` потребителя (отступ `header`, `.tag`,
  `.cookie-notice__content h3`, `.header-logo`) — в 0.7.2 этого нет.

## 12. Баннер на планшете, текст в `.caption`, файл правок вне сборки

**Баннер на планшете** (`typography/_notes.scss`): `.sidenote.sidenote-banner`
в `@include tablet` — `--sidenote-column: 7 / span 3; max-width: none`.
На 900px баннер 205px (был 121px), h5 в три строки. Десктоп и мобильный не
тронуты.

**Текст в `.caption`** (`typography/_text-content.scss`):
`.caption :is(p, ul, ol) { max-width: none }`. Блок `.caption` был на всю
ширину с выступами (986px на 1300px), а абзац в нём упирался в
`--text-content-width` (505px) из `article :is(p, ul, ol)`. Теперь текст на
всю внутреннюю ширину блока (930px).

**`.eleventyignore`**: добавлен `manual_updates_*.md` — Eleventy собирал этот
файл как страницу `/manual_updates_0_7_2/` (ушла бы на сайт при деплое), и
она переполняла телефонную ширину в `reference-pages.test.js`.

**Задачи:**
- Доку `.caption`: текст на всю ширину блока.
- Changelog v0.7.2: `.caption` без reading measure.

## 13. Строки сайдноутов: отступ на обёртке; `.list-group-pack--balanced` (позже удалён, раздел 19)

**Отступ между строками — модель потребителя.** Раньше (CSS-377) между
соседними `.sidenote-wrapper` было 0, разрыв давал нижний отступ последнего
абзаца текста. Ломалось, когда заметка выше текста: следующая строка
прилипала к ней (0px; после раздела 5, где у последнего элемента заметки
снят нижний отступ). Теперь:
- `_text-content.scss`: удалено исключение `article > :where(.sidenote-wrapper
  + .sidenote-wrapper) { margin-top: 0 }` — строки получают общий отступ
  блоков потока, `--space-md`;
- `_notes.scss`: у последнего текстового блока строки и у его последнего
  ребёнка `margin-bottom: 0` —
  `> :where(:not(.sidenote, :has(~ :not(.sidenote))))` и `… > :last-child`;
  в `:where()`, чтобы утилита margin на этом блоке решала. (Вариант
  `:nth-last-child(1 of …)` внутри `:where()` jsdom/nwsapi считает неверно —
  падал `rd-gate-fixture.test.js`, CSS-338.)
Строка к строке — 16px и от текста, и от заметки выше текста. Блок → абзац
по-прежнему отделяет собственный отступ абзаца (8px).

Тест `typography.test.js` (CSS-377) переписан: строка→строка 16px (было 0),
в фикстуру добавлена строка с заметкой выше текста — 16px.

**`.list-group-pack--balanced`** (`typography/_lists.scss`): на десктопе
`columns: auto 3; column-fill: balance; height: auto` + отступ групп
padding'ом (CSS-366), как на планшете. Для пака без заданной высоты (меню,
индекс): базовый десктопный режим (`column-fill: auto`) без высоты льёт всё в
одну колонку. Проверено: без модификатора 1 колонка 800px, с ним 3 колонки
352px. Разметка: `class="list-group-pack list-group-pack--balanced"`.

**Задачи:**
- Доку сайдноутов: отступ между строками — `--space-md` на обёртке.
- Changelog v0.7.2: отступ между строками сайдноутов (поведение CSS-377
  изменено); отступ баннера.

## 14. Выносы — `--space-md` попробовали и откатили на `--space-lg`

Владелец перевёл выносы на `--space-md`, посмотрел результат и вернул
`--space-lg`. Итог относительно коммита:
- `outdent`: слева `--space-lg`, справа
  `min(--space-lg, --field-width + --space-md)` (ограничение CSS-367 нужно:
  без него `.caption` — блок с шириной `auto` — на 800 и 1024px вылезал за
  страницу на 16px); мобильный `--space-sm`. По сути как в коммите,
  переписан комментарий.
- `pre`, `.collapsible-container`, `.full-width-caption`, `.card-caption` —
  как в коммите (`--space-lg`), изменений нет.
- Таблица в контейнере с выносом (`typography/_tables.scss`): список
  `$caption-boxes` — `.text-content-caption`, `.full-width-caption`,
  `.card-caption`; у таблицы внутри них (или с этим классом) первый столбец
  `padding-left: var(--space-lg)`. Стоит после `.table-terminal`, чтобы его
  `padding-inline: 0` не перебивал. Проверено на `/styles/getting-started/`
  (таблица в `.table-scroll.card-caption`): текст первого столбца ровно по
  краю текста статьи. На мобильном вынос `--space-sm`, отступ
  `--space-lg` — столбец на 24px внутри края текста.

Миксина `outliers` в библиотеке нет и не было. Общий миксин выносов —
`outdent`; `.highlight`, `.text-content-caption`, `.lead`, `.teaser-bottom`
берут его через `caption-width`, `.caption` — напрямую. Свой вынос (только
слева) задан руками у `pre`, `.collapsible-container`, `.full-width-caption`,
`.card-caption`.

`--field-width` — внутренний токен (поле сбоку от центрированной страницы,
`layout/_containers.scss`), в доке и API snapshot его нет. Используют
`.wide-background` (`bricks/_sections.scss`) и правый вынос `outdent`.

Дока `styles/typography/text-content/index.html`: значение выноса там снова
`var(--space-lg)`, как было. Устаревшая фраза «In v0.6.15 the same pattern
will be exposed as … `.rd-outdent`» — решить.

Попутно: `stylelint` ругается на `bricks/_cards.scss:52` (пустая строка перед
комментарием) — ошибка в незатронутой строке, была до этих правок.

**Задачи:**
- Changelog v0.7.2: отступ первого столбца таблицы в `*-caption`.

## 15. `--text-content-caption` — ширина любого блока с выносом

Токен был `--text-content-width + --global-fr + --space-xl` (блок шире текста
на колонку с лишним, несимметрично: слева вынос, справа ~120px). Теперь:
- `:root`: `--text-content-caption: calc(var(--text-content-width) + 2 * var(--space-lg))`;
- мобильный: `calc(100% + 2 * var(--space-sm))` (было `calc(100vw - var(--space-md))`);
- планшет следует сам — токен считается от `--text-content-width`.

Миксин `caption-width` — только `width: var(--text-content-caption);
max-width: none;` и `outdent`. Ограничение `min(…, контейнер + выносы)` и
мобильная ширина в миксине убраны — их даёт токен. `.highlight`,
`.text-content-caption`, `.lead`, `.teaser-bottom` берут ширину только из
токена.

Замеры (`/styles/colors/`): 375 → 359px; 800 → 524; 1024 → 520; 1279 → 561;
1300 → 569 (было 640); 1920 → 721 (было 824). Переполнения нет: 6 страниц ×
375/800/1024/1279/1920.

**Потребитель** (schnellreich_ru): токен считается от его
`--text-content-width` (6fr), поэтому `.text-content--art`,
`.text-content__art`, `.text-content--chart` и `.the-story .introText`
станут уже; его выносы `--space-lg` с токеном совпадают. Помечено в файле
комментариями `NOTE rare-styles v0.7.2`.

**Задачи:**
- Changelog v0.7.2: `--text-content-caption` = текст + 2 × `--space-lg`
  (блоки с выносом стали уже: на 1300px 640 → 569px).
- Доку: что такое `--text-content-caption`.

## 16. Дока `.caption`, `.tag` против `<code>`

**Пример `.caption`** (`styles/typography/text-content/index.html:84`):
текст продолжен двумя фразами, чтобы было видно, что текст идёт на всю
ширину блока (раздел 12).

**`.tag` и `<code>` визуально похожи** (`/styles/typography/lists/`): оба —
мелкий прямоугольник в рамке `1px #ccc`. Отличия: у `.tag` шрифт текста,
прозрачный фон, радиус 8px, `line-height: 1`; у `code` моно, серый фон,
радиус 4px. У потребителя (schnellreich.ru, 876 тегов) `.tag` = библиотечный
+ `line-height: 1.6em` (воздух между рядами в облаке тегов) и `#` в разметке —
своей стилистики нет.

**Решение владельца** (`navigation/_tags.scss`): `border-radius:
var(--space-sm)` (без изменений; капсулу `--space-md` попробовали и вернули),
`padding: 2px var(--space-sm)` (было `1px 4px`), `line-height: 1.6` (было `1`); остальное без изменений (рамка
`--border-color`, без фона, `--text-color-light`, `--font-size-sm`, при
наведении — `--primary-color`).

**Дока** (`styles/typography/text-content/index.html`, раздел «Tags» →
`.tag`): короткое описание (метка темы, капсула вместо прямоугольника
`<code>`, ставить на ссылку на страницу тега, `#` — часть текста), живой
пример из трёх тегов и код.

Потребителю после v0.7.2: `.tag { line-height: 1.6em }` можно удалить
(раздел 11).

**Задачи:**
- Changelog v0.7.2: `.tag` — поля `2px --space-sm`, высота строки 1.6.

## 17. Семантические цвета: роли, алиасы, `-bg`, callout; порядок в файлах

Всё в v0.7.2 (не выпущено) — переименование никого не ломает; Changelog и
MIGRATION поправлены.

**Семантика (владелец):**
- `--signal` = `--blue` — техническая информация, главный цвет на графиках
  (а также акцент действия: основная кнопка, кольцо фокуса);
- `--success` = `--green`, `--warning` = `--yellow`, `--danger` = `--red`;
- алиасы, чистые, для финансов: `--positive` → `--success`, `--negative` →
  `--danger`, `--neutral` → `--warning`; исход проверки: `--fail` → `--danger`.
`--info` нет — его место занимает `--signal`. Было: `--color-success/-danger/-warning/-info`.

**`-bg`**: миксин `color-bg($names)` в `colors/_color-classes.scss` (рядом с
генератором классов `color-classes`) → `--{name}-bg: color-mix(in srgb,
var(--{name}) 25%, transparent)` для всех 8. Алиасы и `-bg` считаются на
`:root`: переназначил роль на `:root` — следуют; на отдельной поверхности
переобъявить.

**Файлы:**
- `colors/_blue.scss` удалён — `--blue`, `--blue-light`, `--blue-dark` и их
  классы в `colors/_base.scss`, рядом с красным/зелёным/жёлтым; MIGRATION
  строка 29 (ломает только сборку из SCSS, подключающую партиалы по одному);
- `colors/_roles.scss` (мой, лишний) удалён; к тому же в `charts/` уже есть
  свой `_roles.scss`;
- `colors/_semantic.scss` — все роли, алиасы, `-bg`, `--surface-current`.

**Callout** (`typography/_text-content.scss`, стили правил владелец):
- `.callout` — между двумя тонкими линиями сверху и снизу (`border-top/-bottom:
  1px solid var(--border-color)`), без рамки и скругления;
- `.callout-signal` — простая информация: чёрная полоса (`--black`), без фона
  (`--callout-bg: transparent`); от цвета `--signal` не зависит;
- `.callout-success`, `-warning`, `-danger` — полоса цвета роли, фон её `-bg`.
У алиасов вариантов нет. `.callout-info` → `.callout-signal`, `.callout-error`
→ `.callout-danger`. Новый хук `--callout-bg`. `--callout-color` и
`--callout-bg` задаются в блоке каждого варианта.

**Компоненты по смыслу:** KPI-дельта `.stat--delta-up/-down` —
`--positive`/`--negative`; поле формы — `--success`/`--fail`; кнопки —
`--signal` (основная), `--danger`.

**Дока:**
- `/styles/colors/`: синий в «Technical Colors» (signal: техническая
  информация, главный цвет графиков); «Semantic Colors» переписан — таблица
  ролей, таблица алиасов, образцы цвета и `-bg`, где используются, как
  переназначить; подраздел «Signal» влился в него (ссылка `#signal` на
  `/styles/bricks/stats/` → `#semantic-colors`);
- `/styles/typography/text-content/#callouts` — 4 варианта, текст под новый вид;
- `/styles/colors/`: блок образцов — по строке на каждый из 8 токенов, со своим `-bg`;
- `/styles/bricks/stats/`, `/styles/elements/forms/`, `/styles/elements/buttons/`
  — новые имена; `/styles/modules/` — дерево без `_blue.scss`.

**Тесты:** CSS-121/156 (`typography.test.js`) — 4 роли, их цвета, `-bg` — одна прозрачность у всех,
алиасы равны своим ролям (с `-bg`), 4 варианта callout; фикстуры на новых
именах.

**Открыто:**
- `--chart-series-1` = `--orange`, а по семантике главный цвет графика —
  `--signal`. Перевязывать серии — вопрос к RareCharts/токенам графиков.
- Короткие имена (`--success`, `--danger`…) чаще совпадут с токенами
  страницы-хоста, чем `--color-*` (MIGRATION, строка 26, это оговаривает).

## 18. `.list-title` — на `<h5>`, без отступов (`typography/_lists.scss`)

- Объявляется через `<h5 class="list-title">`. Разметка переведена со `<span>`:
  `_includes/hamburger.njk` (6), `styles/modules/table-of-contents/index.njk`,
  `styles/typography/lists/index.md` (6).
- `margin: 0; padding: 0` (было `padding-bottom: var(--space-sm)`). Зазора до
  списка нет (решение владельца): список идёт сразу под заголовком, в том числе
  в `.index-list`, меню и оглавлении.
- Ссылка внутри: `color: inherit; text-decoration: none; background-image: none;
  cursor: pointer`. Подчёркивания и заливки при наведении нет.
- Вид остаётся на классе (шрифт, жирный, uppercase), поэтому работает и на другом
  теге: у потребителя `<h3 class="list-title">` в `_includes/hamburger.njk`.
- Дока `/styles/typography/lists/`: описание, пример кода с ссылкой. Заодно ушла
  лишняя обёртка `<p>`, которую markdown ставил вокруг `<span>`.

**Задачи:**
- Changelog v0.7.2 / MIGRATION: `.list-title` без `padding-bottom`: у потребителей
  заголовок встанет вплотную к тому, что под ним.

## 19. `.list-group-pack` без высоты (`typography/_lists.scss`)

**Почему был костыль:** на десктопе `column-fill: auto` заполнял колонки до заданной
высоты, поэтому в разметке стоял `height-xxxxl` (384px), подобранный под контент.
Контента больше — колонки вылезали вправо (920px, вдвое больше контента: на 936px);
меньше — собирался в меньшее число колонок.

**Теперь:** `column-fill: balance` и `height: auto` на всех ширинах, отступ групп
через `padding` тоже на всех (CSS-366). Десктоп — сколько колонок помещается
(`--list-group-pack-min`), планшет `auto 3`, мобильный `auto 2`.
`.list-group-pack--balanced` удалён (не выходил). `height-xxxxl` убран из
`_includes/hamburger.njk` и примера в доке; дока списков и пример на
`/styles/layout/spacing/` переписаны; Changelog и MIGRATION (строка 30) добавлены.

**Что ломало простые решения (не повторять):**
- убрать только высоту, оставив `column-fill: auto` — меню в одну колонку 1046px;
- задать `column-width` на всех ширинах поверх мобильного `auto 2` — на 375px одна
  колонка 1062px.

**Меню в настоящем открытом виде:**

| Окно | Было | Стало |
|---|---|---|
| 1024–1920 | 4 кол. 262/363/262/110, блок 384 | 4 кол. 278/253/278/253, блок 278 |
| 769–1023 | 3 кол. 278/379/405 | то же |
| 375–768 | 2 кол. 531/531 | то же |

Вылетов и переполнения нет ни на одной ширине, включая границы 768/769 и 1023/1024.
Пример в доке на десктопе: 4 колонки вместо 2.

**Не проверено:** только Chrome. Посмотреть меню и пример в Safari и Firefox.

## 20. Меню и `.index-list`: интерлиньяж и отступы пунктов

- `.nav-hamburger` (`navigation/header/_hamburger.scss`): убран `line-height:
  var(--line-height-sm)`; в `_includes/hamburger.njk` убрана утилита
  `line-height-sm` с четырёх обёрток `.site-width-wrapper` — без этого они
  оставляли бы мелкий интерлиньяж. В меню теперь обычный: 21.6px при 14.4px.
- `.index-list > ul > li` (`typography/_lists.scss`): `margin: 0` (было
  `0 0 var(--space-sm)`). Правило `.list-group-pack > .index-list > ul >
  li:last-child { margin-bottom: 0 }` стало лишним — удалено.
- Группы стали короче: в меню на 1300px — 5 колонок (было 4), блок 254px.

**Задачи:**
- Changelog v0.7.2: пункты `.index-list` без отступа; меню — обычный интерлиньяж.

## 21. `/styles/bricks/`: Card vs Panel — базовые свойства

Под двумя карточками раздела «Card vs Panel» — сравнительная таблица (`.table-scroll`
> `table`): строки — свойства, колонки — `.card` и `.panel`. В карточках остались
заголовок и описание; строки-примечания убраны. Содержание таблицы:

| | `.card` | `.panel` |
|---|---|---|
| Background | свой: `--surface-current`, светло-серый; `.card-inverted` тёмный | нет: просвечивает поверхность под ним |
| Padding | нет — утилитой (`.padding-lg`) | встроенный 16px 32px, на телефоне 16px; `.panel--flush` убирает |
| Border | нет — `.bordered` | нет — `.panel--bordered` |
| Structure | свободная; необязательный `.card-header` | `__header` / `__body` / `__footer` с тонкими линиями |
| Layout | flex-колонка | блок; с частями — flex-колонка, тело занимает свободную высоту |
| Many of them | `.card-grid`, `.feature-row` | `.panel-grid`: футеры на одной линии в ряду |

## 22. `-bg` у семантических цветов — 25%

Владелец выбрал **25%** (был 15%, на странице цветов стояло 20%). Миксин
`color-bg` (`colors/_color-classes.scss`) уже был на 25%; выровнены комментарии
там и в `_semantic.scss`, `/styles/colors/` и Changelog. Тест CSS-121 не завязан
на процент: проверяет, что у всех ролей одна прозрачность между 0 и 1.

## 23. Card Grid: ссылка в заголовке плитки без брендовой заливки

`bricks/_cards.scss`: `.card-grid__title a { background-image: none }` — снимает
заливку цветом бренда, которую даёт базовое правило `a` (и поднимает при
наведении). При наведении меняется только фон `.card-grid__title` (в галерее:
30% → 85% тёмного). Проверено наведением на `/styles/bricks/`. Правило общее для
обоих видов сетки (`--cards`, `--gallery`).

## 24. `/styles/bricks/` → Helper Selectors: «рекламный плакат» на утилитах

Блок «Special Offer: Buy 1 Get All Free!» переделан в плакат — только классы
библиотеки и стандартные теги, **ни одного инлайн-стиля** (в старой версии их было
два: `left: -5%; top: -10%`):
- конфетти — `square`/`circle` + палитра `*-bg` + `absolute` и `left-*/right-*/
  top-*/bottom-*` + `z-index-0`; стоят в правой трети и в угловых полях, текст не
  задевают (проверено на 1300 и 375px);
- штамп «−100% on everything» — `circle square coral-bg white shadow-md`,
  `width-20 mobile:width-33`, `font-size-xl font-weight-black`;
- текст — `.tag` ×3, заголовок `font-size-xxl font-weight-black uppercase` с
  `<mark>`, `handwritten`, `<s>`, `.callout.callout-warning`, `.button-primary
  .button-lg`, мелкий шрифт `font-size-xs gray-mid-dark`.

Последний абзац секции — о том, что новых стилей нет: всё из утилит и готовых
компонентов, без инлайн-стилей и одноразовых классов.

Попутно: у утилит нет мобильного кегля (`mobile:font-size-*`), поворотов и
прозрачности — для такого рода демо их не хватает, но и без них обошлось.

Бэклог: заведена `CSS-387` — утилиты поворота (`rotate-*`), раздел «Typographic &
utility finishing» (`v0.7.10`).

## 25. Панель: базовый отступ `--space-md`, выравнивание в блоках с выносом

`bricks/_panels.scss`:
- `.panel { padding: var(--space-md) }` на всех ширинах (было `--space-md
  --space-lg`, на телефоне `--space-md`; шаг для телефона, CSS-376, больше не нужен).
  Сначала пробовали `--space-sm --space-md`, владелец выбрал `--space-md`.
- Панель с выносом — `.text-content-caption`, `.full-width-caption`,
  `.card-caption` — сама убирает содержимое обратно на вынос: слева
  `--space-lg`, у `.text-content-caption` справа `min(--space-lg, --field-width +
  --space-md)` (как правый вынос). Без модификатора: класс выноса и есть сигнал.
  На телефоне — свой `--space-md` (вынос там `--space-sm`, меньше отступа). Не
  действует внутри `.card`, `.panel`, `.collapsible-content` (вынос там погашен)
  и на `.panel--flush`.
- Почему не утилитой: отступ компонента сильнее утилиты, поэтому `padding-x-md`
  в примере Modifiers не работал — убран.

Проверено на `/styles/bricks/panels/`: на 1300px содержимое панелей с выносом —
ровно по краю текста (346 при тексте 345, 1px — рамка); на 375px — свой 16px,
переполнения нет.

Дока: вводный абзац (`16px` на всех ширинах), абзац под примером Modifiers о
выравнивании. Тесты `panels.test.js`: отступы `16px` / `16px 32px` (с выносом, на десктопе);
рамка графика по-прежнему отнимает от высоты 34px (2 × 16 + 2).

**Заметить:**
- Графики в рамке (`panel panel--bordered text-content-caption`) на десктопе
  не изменились: `16px 32px`, как было.
- Панели внутри `.panel-grid.text-content-caption` и `.panel__row.text-content-caption`
  не выравниваются по тексту: вынос у сетки, а отступ у панелей свой (16px).
- Changelog v0.7.2: базовый отступ панели; выравнивание панели с выносом.

## 26. `.panel--data` и `.panel__row--data` — удалены (раздел 28)

Модификатор «данные» — цифра, которую читают с одного взгляда:
- `.panel--data`: панель по центру (`text-align: center`, заголовок
  `justify-content: center`); первый блок `.panel__body` — `--font-size-xl` (сначала был xxl, владелец откатил),
  `--font-weight-bold`, `line-height: var(--line-height-sm)`, `tabular-nums`.
  Подпись `.note` под цифрой остаётся мелкой (задаёт свой размер).
- `.panel__row--data`: то же для ячеек ряда (ячейки и так по центру); подпись
  `.note` в ячейке мелкая.
- В `.panel--data` части стоят плотно: у `.panel__header` нет `margin-bottom`, у
  `.panel__footer` нет `margin-top`; `.panel__body` — flex-колонка с
  `justify-content: center`, цифра по центру высоты, которую даёт ряд сетки.

Применено на `/styles/bricks/panels/`: Panel grid (Orders / Returns / Uptime, убран
`font-size-lg` с цифр), Panel row (OPEN / HIGH / LOW / VOLUME). Дока: `.panel--data`
в списке Modifiers, фраза про `.panel__row--data` в разделе Panel row.

На 375px ряд из четырёх цифр шире экрана и прокручивается внутри своей рамки
(поведение ряда, CSS-354), страница не шире окна.

**Решить:** `--data` пересекается с `.stat` (подпись + значение + дельта, tabular),
и дока ряда советует для KPI `.stat`. Развести назначение или свести одно к другому.

**Задачи:**
- Changelog v0.7.2: новые модификаторы `.panel--data`, `.panel__row--data`.

## 27. Дока: отступы панели приведены к текущим

- `/styles/bricks/`, таблица Card vs Panel, строка Padding: «16px; in a
  caption-width box the sides match the outdent; `.panel--flush` removes it»
  (было «16px 32px, 16px on a phone»).
- `/styles/bricks/panels/`: описание `.panel--data` — части без отступов, тело
  центрирует цифру по высоте.
- Changelog: строка CSS-376 — «A panel pads 16px on every width…» и про выравнивание
  в блоках с выносом; в семействе панелей — пункт Data mode
  (`.panel--data`, `.panel__row--data`).
- MIGRATION, строка 23: было «Bordered panel on a phone: 16px below 769px», стало
  «Panel padding: `.card-dashboard-bordered` 16px 32px → `.panel` 16px на всех
  ширинах; в блоке с выносом бока равны выносу».

## 28. `--data` убран; `.stat` на панели; Stats в доке Panels

**CSS:**
- `.panel--data` и `.panel__row--data` удалены (не выходили) — их цифра
  дублировала `.stat__value`.
- `.stat__value` — `font-weight: var(--font-weight-bold)` (было обычное). У
  `.stat--signal` осталось только `color: var(--signal)`.
- Панели-плитки с цифрой — `class="panel panel--bordered stat"`; ячейки ряда —
  `class="panel__row-item stat"`.

**Дока:**
- Страница `/styles/bricks/stats/` влита в `/styles/bricks/panels/`: раздел
  **Stats** (`#stats`) перед Chart frames, подразделы Direction (`#stat-delta`) и
  Emphasis (`#stat-signal`); текст о ячейках ряда — в разделе Panel row.
- Panel grid — прежняя структура (владелец): `.panel__header` с `h5`,
  `.panel__body stat` с `.stat__value`, `.panel__footer`. `stat` на теле, а не на
  панели: `.stat__value` должен быть прямым ребёнком `.stat` (стрелки дельты). Тело
  занимает свободную высоту, значение прижато к низу — три цифры на одной линии. В
  Returns подпись `meta-info` стоит перед значением.
- Panel row — ячейки `panel__row-item stat`.
- Из Modifiers убран `.panel--data`.
- Старый адрес `/styles/bricks/stats/` — страница-переадресация без шаблона
  (`meta refresh`, `rel=canonical`, `noindex`) на `/styles/bricks/panels/#stats`.
- Ссылки перенаправлены: `/styles/bricks/`, `/styles/colors/`,
  `/styles/colors/chart-tokens/`, `/styles/modules/`; пункт Stats убран из
  сайдбара (`_data/sidebarmenu.json`), оглавление (`_data/tableOfContents.json`)
  ведёт на `#stats`. Проверка ссылок: 90 страниц, 0 битых.
- Changelog: строка Data mode удалена; у KPI figures — ссылка на `#stats` и что
  значение жирное.

## 29. Заголовок панели слушается выравнивания панели; тест всех страниц

- `bricks/_panels.scss`: `.panel__header > :only-child { flex: 1 1 auto }`.
  Шапка — flex-строка с `space-between`, одинокий заголовок был по ширине текста и
  стоял слева: `.center` на панели (`text-align`) его не двигал. Теперь одинокий
  заголовок на всю ширину и наследует выравнивание панели (`.center`, `.right`);
  заголовок с мета-данными по-прежнему по краям. Проверено на Panel grid (плитка
  Orders с `.center`): заголовок, цифра и футер на одной оси.
- `test/browser/reference-pages.test.js` («every built page fits phone widths»)
  пропускает страницы-переадресации (`http-equiv="refresh"`): переход срывал
  замер. 18/18.

## 30. Panel grid: пример кода без `--panel-grid-min`

Из кода примера Panel grid убран `style="--panel-grid-min: 12rem"` — живой пример
его не использовал. Под кодом абзац: ширина колонки задаётся `--panel-grid-min` на
сетке (`12rem` — больше узких панелей в ряд, больше значение — меньше и шире).

## 31. Дока: карточки — отдельная страница `/styles/bricks/cards/`

- Новая страница `styles/bricks/cards/index.html` («Bricks / Cards»): короткое
  вступление со ссылкой на правило Card vs Panel и перенесённые с `/styles/bricks/`
  разделы Card, Card Grid, Composing cards, Helper Selectors (с плакатом). Пометки
  `_cards.scss` у разделов заменены одной в начале страницы.
- На `/styles/bricks/` остались вступление, Card vs Panel, Section, Wide
  Background, Feature Row; в описании `.card` — ссылка «See Cards».
- Боковое меню: Bricks → Cards / Panels / Legend. Оглавление: «Cards» ведёт на
  `/styles/bricks/cards/`.
- Ссылок на старые якоря карточек (`/styles/bricks/#card-grid` и т. п.) на сайте не
  было; проверка ссылок — 91 страница, 0 битых.

## 32. Дока: Legend переехала в Colors — `/styles/colors/legend/`

- Страница `styles/bricks/legend/index.html` → `styles/colors/legend/index.html`,
  заголовок «Colors / Legend», `permalink: '/styles/colors/legend/'`. Модуль CSS
  остался `bricks/_legend.scss` (пометка на странице прежняя).
- Боковое меню: Colors → Chart Tokens / Legend; из Bricks пункт убран (там Cards /
  Panels). Оглавление: Legend перенесён в Colors после Chart Tokens.
- Ссылки перенаправлены: `/styles/bricks/`, `/styles/elements/`,
  `/styles/modules/`, `/styles/colors/chart-tokens/`, Changelog и список
  страниц в `test/browser/reference-pages.test.js`.
- Старый адрес `/styles/bricks/legend/` — страница-переадресация (как у Stats).
- Проверка ссылок: 92 страницы, 0 битых; тесты страниц 18/18.

## 33. Дока: раздел Interactive Elements — `/styles/interactive/`

- `/styles/typography/interactive/` убрана. Её разделы перенесены на главную нового
  раздела: **Links** (`#links`), затем **Keyboard focus** (`#keyboard-focus`),
  переведены в HTML. В Keyboard focus поправлено: кольцо по умолчанию следует
  `--signal` (`--focus-ring-color: var(--signal)`), пример кода тоже. Раздел
  «Buttons and forms» не перенесён — главная и так ведёт на обе подстраницы.
- `/styles/elements/` → `/styles/interactive/`, название «Interactive Elements»;
  прежнее содержимое (вступление, Three rules) без изменений. Подстраницы тоже
  переехали: `/styles/interactive/buttons/`, `/styles/interactive/forms/`
  («Interactive Elements / Buttons», «… / Forms»). Пометка в начале главной —
  `css/modules/elements/ · …/navigation/_links.scss · …/utilities/_a11y.scss`.
- Переадресации: `/styles/elements/`, `/styles/elements/buttons/`,
  `/styles/elements/forms/` → новые адреса; `/styles/typography/interactive/` →
  `/styles/interactive/#links`.
- Меню: из Typography убран пункт Interactive Elements; группа Elements стала
  Interactive Elements (Buttons, Forms). Оглавление: Interactive Elements → Links,
  Keyboard focus, Buttons, Forms.
- Ссылки перенаправлены: `/styles/colors/`, `/styles/typography/tables/`,
  `/styles/modules/`, внутри страниц кнопок и форм, Changelog, комментарий в
  `rare-website.css`. Проверка ссылок: 95 страниц, 0 битых.
- Папка модулей CSS осталась `elements/` — переименован только раздел доки.

## 34. Кнопки: без своих токенов, капсула, основная — в цвете бренда (`elements/_buttons.scss`)

- **Токенов `--button-*` на `:root` нет.** Убраны `--button-radius`,
  `--button-padding-x/-y`, `--button-font-size`, `--button-font-weight`,
  `--button-transition`, `--button-bg/-text/-border-color`: вид записан общими
  токенами (`--space-*`, `--font-size-md`, `--font-weight-normal`, цвета), переход —
  `background-color/border-color 0.15s`.
- **Слоты вариантов и размеров остались** — как внутренние переменные классов, без
  объявления на `:root`: правило читает их с запасным значением
  (`var(--button-bg, var(--white))` и т. п.). На них держатся hover/active, группа
  с `aria-pressed`, размеры, квадрат `.button-icon`. Без них каждое состояние
  пришлось бы расписывать для каждого варианта.
- **Скругление** — `border-radius: var(--space-lg)` (32px): капсула. Группа —
  `--space-lg` по внешним углам. Кнопка выбора файла (`::file-selector-button`) —
  тоже `--space-lg`.
- **`.button-primary`** — фон `--brand-color`, при наведении `--brand-color-dark`,
  нажатие — `--brand-color-dark` на 15% темнее; подпись `--primary-color` (чёрная):
  ≈15:1 на зелёном, 7:1 на тёмном (белая не читалась бы). Кольцо «занято» у неё
  теперь чёрное (цвет подписи).
- **`.button-secondary` удалён** — это обычная кнопка по умолчанию.
- **Поля форм** больше не берут кнопочные токены: `--field-radius: var(--space-xs)`
  (4px, без изменений), `--field-padding-y: var(--space-sm)`. Высота поля и кнопки
  по-прежнему одна.

**Дока** `/styles/interactive/buttons/`: убраны Secondary (пример и описание) и
таблица Tokens; вместо неё раздел «Re-colouring a button» (слоты, пример
`.button-signal`); описание Primary и Danger, переход 0.15s, скругление в описании
вида. `/styles/interactive/forms/`: таблица полей — `var(--space-xs)`,
`var(--space-sm)`. `/styles/colors/`: «danger button (`--danger`)» вместо «`--signal`
for the primary». `_semantic.scss`: основная кнопка — у бренда, не у signal.
Changelog и MIGRATION (строки 3, 4, 25) — без токенов и `-secondary`, радиус 32px.

**Тесты** `controls.test.js`: радиус 32px (кнопка, группа, кнопка файла, остров);
основная — фон бренда, чёрная подпись, AA, при наведении `--brand-color-dark`,
следует `--brand-color`; проверки `-secondary` и токенов на `:root` заменены на
«нет `--button-*` на `:root`»; кольцо «занято» — чёрное. В фикстуре убран
`b-secondary`.
`controls-contexts.test.js`: основная кнопка на тёмной карточке и нажатая в группе
— чёрная подпись, фон бренда (нажатая — `--brand-color-dark` на 15% темнее).
`charts-rd-host.test.js`: кнопка вне графика — радиус 32px. `compiled-css.test.js`
(CSS-118): подстановка `var()` теперь понимает вложенные запасные значения любой
глубины — `var(--button-bg-hover, var(--button-bg, var(--white)))` валиден, а
старая регулярка видела только один уровень скобок.

**Заметить:** рядом стоящие поле (4px) и кнопка (капсула) теперь разной формы —
например, поиск на `/styles/interactive/`. Решить, нужна ли полям капсула тоже.

## 35. `.demo-row` убран; подпись `.button-primary` при наведении — белая; `--brand-color-dark` = #3a8000

- **`.demo-row`** (сайтовый класс в `rare-website.css`: flex, перенос, центр,
  `gap: --space-sm`) удалён; в разметке Interactive / Buttons / Forms (10 мест)
  заменён библиотечными утилитами `flex wrap items-center gap-sm`.
- **Белая подпись `.button-primary`** при наведении, нажатии (`:active`) и у нажатой
  кнопки группы (`aria-pressed="true"`) — отдельным правилом у самой кнопки
  (`.button-primary:is(:hover, :active, [aria-pressed="true"])`, кроме disabled и busy).
  Слот `--button-text-hover` пробовали и убрали (владелец: лишний).
- **`--brand-color-dark: #3a8000`** (было `#00b300`) — насыщенный тёмно-салатовый,
  белый текст на нём 4.9:1 (AA); на прежнем было 2.8:1. Это ещё подчёркивание
  ссылок и их заливка при наведении — стали темнее и салатовее; подчёркивание
  `.button-link` тоже. Нажатая основная кнопка — `#3a8000` на 15% темнее.
- Дока: `/styles/colors/` (значение и назначение), описание Primary, слоты в разделе
  «Re-colouring a button», STYLEGUIDE.
- Тесты: подпись при наведении белая и проверка AA для неё возвращена; цвет
  наведения и подчёркивания `rgb(58, 128, 0)`; нажатая в группе — от `#3a8000`.

**Задачи:**
- Changelog v0.7.2 / MIGRATION: `--brand-color-dark` #00b300 → #3a8000 (ссылки и
  кнопки); белая подпись основной кнопки на тёмном фоне; `.demo-row` — сайтовый, в библиотеку не входил.

## 36. Оптический сдвиг подписи: 1px сверху больше, 1px снизу меньше

- **Кнопки** (`elements/_buttons.scss`), на всех размерах: `padding: calc(py + 1px) px
  calc(py − 1px)` (`py` — `--button-padding-y`, по умолчанию `--space-sm`). Подпись
  на 1px ниже геометрического центра; высота кнопки не меняется. Сначала пробовали
  урезать низ на 2px — кнопка становилась на 2px ниже поля, ломалось правило «One
  height»; владелец выбрал сдвиг 1/1 (тот же оптический результат).
- **`.button-icon`**: `padding: 2px 0 0` — глиф на 1px ниже центра, как подпись,
  квадрат стоит на одной базовой линии с текстовой кнопкой.
- **Текстовые поля, textarea, select** (`elements/_forms.scss`): тот же сдвиг 1/1 —
  иначе в ряду поле и кнопка расходились на 1px по базовой линии. Высота поля прежняя.
- Проверено на `/styles/interactive/`: поле и две кнопки в ряду — один y, 37px.
- Тесты `controls.test.js`: `padding-top` 9/5/13px (кнопки md/sm/lg), 9px у поля;
  глиф в кнопке — на 1px ниже центра.

## 37. Вид кнопки по умолчанию (владелец) и растущее поле в `.form-row`

**Кнопка по умолчанию** (правка владельца в `_buttons.scss`): в покое
`--gray-lightest` и подпись `--gray-dark`; при наведении белый фон, чёрная рамка и
подпись; нажатие — `--bg-color`. Тесты (`controls`, `controls-contexts`,
`charts-rd-host`) переведены на `rgb(250, 250, 250)` / `rgb(51, 51, 51)` в покое;
описание вида в доке кнопок обновлено.

**Поле растёт в `.form-row`** (`elements/_forms.scss`): голое текстовое поле, select
или textarea прямым ребёнком `.form-row` — `flex: 1 1 12rem; min-width: 0`, как
`.form-group`; на телефоне — `flex: none` (ряд складывается в колонку). Однострочная
форма без обёрток:
`<form class="form-row"><input type="email" …><button>Subscribe</button></form>`.
- Пример Subscribe на `/styles/interactive/forms/` переведён на `.form-row`
  (было `flex wrap items-center gap-sm`): на 1300px поле 384 + 16 + кнопка 106 =
  505px — вся ширина текста; на 375px поле на всю ширину, кнопка под ним.
- Описание `.form-row` в доке дополнено.
- Тест «groups stack, a row sits side by side…» + фикстура `fr1`: поле и кнопка на
  одной линии, вместе с отступом заполняют ряд.

**Задачи:** Changelog v0.7.2 — поле растёт в `.form-row`.

## 38. Range, colour, file (`elements/_forms.scss`)

- **Range** — рисует библиотека (`appearance: none`): линия 2px цвета текста
  (`--field-text`), ползунок — круг 1rem, рамка 2px того же цвета, внутри фон поля.
  Части для WebKit (`::-webkit-slider-runnable-track/-thumb`) и Firefox
  (`::-moz-range-track/-thumb`) — отдельными правилами (неизвестный селектор
  ронял бы общий список). Заблокированный — прозрачность 0.5. Акцент `--field-accent`
  для range больше не используется (в доке таблица токенов поправлена).
- **Colour** — квадрат высотой с текстовое поле (37.2 × 37.2px).
- **File** — одно поле: рамка поля вокруг кнопки и имени файла, высота как у
  текстового поля (37.2px), кнопка внутри — маленькая кнопка по умолчанию (серая в
  покое, белая с чёрной рамкой при наведении).
- Дока `/styles/interactive/forms/`: текст раздела «Range, colour, file».
- Тест «range, colour and file»: `appearance: none`; линия и ползунок проверяются
  по правилам в таблице стилей (Chrome не отдаёт вычисленный стиль этих частей и
  отбрасывает `::-moz-`); квадрат цвета; высота и рамка поля файла.

**Крестик «убрать файл»** — не делаем (решение владельца): у нативного
`<input type="file">` его нет, а CSS его не добавит.

**Не проверено:** Firefox и Safari (ползунок и поле файла рисуются по-разному).

## 39. Range, colour, file: decoupled from the field height

- Only the text field, select and button share the "One height". A checkbox or radio was already a 1em box on the text line; now range and colour are decoupled too.
- `_forms.scss`:
  - range `block-size: var(--space-lg)`;
  - colour well a `--space-lg` square (was the text-field height formula).
- File input:
  - `display: block; inline-size: 100%`, the full width of its container;
  - no background (`transparent`), the frame only;
  - `padding: var(--space-xs)`.
  - Owner's hand edit: `border: 1px solid var(--border-color)`, `border-radius: var(--space-md)`.
  - `::file-selector-button` is `.button-sm` sized (`font-size: var(--font-size-sm)`, padding `space-xs + 1px / space-sm / space-xs − 1px`) on `var(--gray-mid-light)`.
- Docs: `/styles/interactive/forms/#range-color-file` text rewritten to match.
- Test `controls.test.js` ('range, colour and file') checks:
  - range and colour 32px;
  - colour a square;
  - file width = container, transparent background, radius 16px;
  - button background #e4e4e4, font 14.4px.
- Unit 1227 ✓, browser 206 ✓.

## 40. The submit button always sits at the right edge

- `_forms.scss`: `:is(.form-group, .form-row) > :is([type="submit"], button:not([type])) { align-self: flex-end; margin-inline-start: auto; }`.
- This puts the button at the right edge:
  - in a group's column;
  - in a row, both on the fields' line and on its own line when the row wraps;
  - on a phone, where the row stacks.
- A `<button>` with no type submits too.
- Docs: `/styles/interactive/forms/#layout` gets a "The submit button" entry.
- Test:
  - fixture `controls.html` gets `#fg-btn` (a submit in `.form-group`);
  - `controls.test.js` (groups/row at 1440 and 375) checks that the right edge of the button = the right edge of the group / row.

## 41. Fieldset spaces with gap; groups and rows have no margins

- `fieldset`: `display: flex; flex-direction: column; gap: var(--space-md)`.
- `.form-group` and `.form-row`: `margin-bottom` removed. The `margin-bottom: 0` on `.form-row > .form-group` was removed as well, since it was no longer needed.
- Outside a fieldset, the spacing between groups is now up to the container.
- Docs: the fieldset paragraph says it stacks groups and rows with a `--space-md` gap.
- Unit 1227 ✓, browser 206 ✓.

## 42. `--brand-color-link`: links get their old green back

- Links had been underlined in `--brand-color-dark`. Once it darkened to #3a8000 for the button (section 35), the underline and its hover fill turned dark olive.
- `_brand.scss`: new token `--brand-color-link: #00b300`, the former `--brand-color-dark` value.
  - It is not added to the class list `$brand_colors`: there would be a `.brand-color-link-link`.
- `_links.scss` uses it for the underline and the hover fill. So does `.button-link` in `_buttons.scss`.
- `--brand-color-dark` (#3a8000) stays the primary button's hover.
- Docs:
  - `/styles/colors/`: in the brand block, `-dark` is the button hover and `-link` is the underlines.
  - `/styles/interactive/`: "underlined in `--brand-color-link`".
  - `/styles/usage/`: the example overrides `--brand-color-link`.
- Test `controls.test.js` (link button): underline rgb(0, 179, 0).
- Along the way: added an empty line before a comment in `_cards.scss:52`, a stylelint error from a hand edit.
- Unit 1227 ✓, browser 206 ✓.

**Tasks:** Changelog / MIGRATION v0.7.2 — a new token `--brand-color-link`; a site that overrode `--brand-color-dark` for its link underline now overrides `--brand-color-link`.

## 43. Small items: h5/h6 in the docs, `--chart-series-1` = `--signal`, icons on the mixin

- **h5 / h6** (task from section 1): `/styles/typography/` → Heading levels now says they serve as minor headings and as technical inserts (labels on dashboards and in tables).
- **`<h5>` inside `<p>` in How-To Grid** (section 10, item 6): fixed by the owner by hand.
- **The main chart colour is `--signal`** (section 17, open item):
  - `charts/_index.scss`: `--chart-series-1: var(--signal)` (#1677ff), `--chart-series-2: var(--orange)`; the series from 3 to 6 are unchanged;
  - RareCharts' light blue #0af is dropped: it is too close to `--signal` to sit next to it;
  - the docs `/styles/colors/chart-tokens/`: the series paragraph and table; the `:root` override example uses `var(--green)` (it was `var(--blue)`, now nearly the default);
  - test `tokens.test.js`: the new order;
  - `_internal_docs/charts/BACKLOG.md`, RC-014: the bullet "accent ≠ series-1: choose" is replaced by the decision — RareCharts reads `accent` from `--chart-series-1`.
- **`decorations/_icons.scss:243`** (section 10, item 7): `@media (width < 769px)` → `@include bp.mobile` (`@use "../utilities/breakpoints" as bp`). The output differs only by `screen and`.
- **The note next to `.highlight`** (the "next step" in section 5): closed by section 6 (wide blocks on a tablet) and by the decision in section 10, item 2 (blockquote stays as it is).
- Unit 1227 ✓, browser 206 ✓.

**Tasks:**
- Changelog / MIGRATION v0.7.2: the series order is `--signal`, orange, green, yellow, violet, red. It differs from the RareCharts default palette until RC-014.

## 44. Task for RareCharts: its own palette starts with `--signal`

The RareCharts default palette (`defaultTheme.colors`, `assets/charts/src/core/theme.js`) still begins with orange #fa8c16 and has the light blue #00aaff in second place. It has to match the Rare Styles series (section 43):

- the order is `--signal` #1677ff, #fa8c16, #00c97a, #ffcc00, #cc44ff, #ff0000;
- #00aaff is dropped, because it is too close to `--signal`;
- `accent` (the single-series default, today #00aaff) is set to #1677ff.

With RC-014, the first colour is read as `var(--chart-series-1, #1677ff)`. That way a chart on a page without Rare Styles also starts with the same blue.
Then update `test/circular.test.js` (`PALETTE`) and the RareCharts docs pages that show the palette.

**Where to put it:** `_internal_docs/charts/BACKLOG.md`, next to RC-014 (a separate task or a bullet in it). Slot 0.9.8_7.

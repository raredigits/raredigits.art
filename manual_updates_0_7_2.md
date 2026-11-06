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


## 45. Review of the hand-reviewed draft: logic, hacks, duplicated styles (2026-11-06)

**Method.**
- **Scope:** the whole v0.7.2 SCSS against `main`, read with this file as the record of intent. An intended decision is not a finding; implementing it through a hack, or by copying something, is.
- **Four lenses:** duplication, hacks, logic, and drift between the CSS and the release's own documents.
- **Verification:** a skeptic re-checked every finding, in a browser where the claim was about rendering.
- **Result:** 50 findings: 36 confirmed, 14 partly confirmed, none refuted. Many overlap between lenses, so the themes below group them.

The full list, with file:line, evidence and the proposed rule, is in Appendix A. Ids in brackets point there.

### 45.1 Fix before the release

1. **`.button-primary` pressed outside a group: white label on bright green.** The white-label rule fires on every `[aria-pressed="true"]`, but the dark pressed fill exists only in `.button-group > [aria-pressed="true"]`. A standalone primary toggle is unreadable. Tie the white label to the dark fill (same condition), or give a standalone pressed primary the dark fill. [`primary-pressed-white-on-green`, `primary-toggle-white-on-green`, `button-primary-pressed-white-on-bright`]
2. **`--brand-color-link` collides with the old public class `.brand-color-link`.** `color-classes(brand-color)` generates that class, and it reads `--brand-color` (#00ff4e). The token is #00b300, the link underline. Rename the token, proposed `--link-underline-color` (decision 2 in section 47). [`brand-color-link-name-collision`, `link-token-name-clash`]
3. **The right padding of a caption panel is wrong on a tablet.** `.panel.text-content-caption { padding-right: min(var(--space-lg), var(--field-width) + var(--space-md)) }` copies the auto-width outdent clamp. A caption-width block has an explicit width (`--text-content-caption`), so the clamp does not apply to it. Solved by 45.2-1 (outdent tokens). [`panel-caption-right-padding-tablet`, `panel-caption-right-padding-wrong-on-tablet`]
4. **The release documents describe the pre-review draft, not the shipped CSS.**
   - MIGRATION step 2 and rows 3, 7, 9, 16, 25, 26:
     - button look;
     - field padding 9/12/7;
     - range/colour/file;
     - the sidenote row gap;
     - `.callout-signal/-danger` instead of `-info/-error`;
     - `--button-*` removed.
   - The Changelog:
     - "six series in RareCharts' palette";
     - `--signal` as the primary accent;
     - `--color-*` names.
   - Rows missing for changes this review made to the v0.7.1 API:
     - `--brand-color-dark` #00b300 → #3a8000 and the links' new token;
     - blue folded into `_base`;
     - the semantic names and their aliases;
     - the series order;
     - h2/h3 margins;
     - h5/h6 in the text face.
   - STYLEGUIDE and the docs pages: the button slot defaults (documented as `--white` / `--primary-color`, actually `--gray-lightest` / `--gray-dark`); "a variant only sets colour slots"; the field height "follows the button" (now two literals that match).
   - The backlog Done rows (`CSS-121`, `-124`, `-040`, `-041`, `-046`, the decisions) still describe what the hand review undid.

   [`migration-rows-contradict-css`, `owner-changes-missing-from-changelog`, `changelog-signal-series-claims`, `button-slot-defaults-described-wrong`, `field-button-height-coupling-docs`, `backlog-done-rows-describe-unshipped`, `brand-link-token-no-migration-row`]
5. **The consumer check predates the hand review.** MIGRATION's "Live consumers — v0.7.2 candidate, verified 2026-10-27" table and the per-site checklists were measured before dbf02a10. They have to be measured again on the final CSS. [`consumer-verification-predates-hand-review`]
6. **Two regressions in the `/charts/` sidenote chart**, from sections 4–5 (found by the pair check, section 46):
   - **769–1023 px:** the sidenote no longer stacks, and the chart inside it shrinks from 556 to 104 px. Its title, source and bar labels are cut.
   - **≤ 768 px:** the stacked form's `text-align: right` reaches into the chart. The title and subtitle go right, the source stays left. Same family as `CSS-372`.

   Proposed: a sidenote that holds an embedded component (`.rc-chart`, `.panel`, `table`) keeps the stacked form below the desktop breakpoint, and the right alignment applies to text only. Add 800 px to the exit criterion (decision 1 in section 47).
7. **The size row names a local-only commit.** `SIZE-BASELINE.md` row v0.7.2 names `b8cde21`, which exists only on this branch. A squash merge makes it unreachable, and then `test/size-baseline.test.js` fails in all three workflows: release-css, sync-charts and deploy. The row and the Changelog bundle line are also stale: 447,443 → now 451,318 B min.

### 45.2 Hacks and duplicated styles (proposed for this release)

1. **The outdent amount is written by hand in 8 places.** These are:
   - the mixin;
   - `--text-content-caption` and its mobile restatement;
   - `pre`;
   - `.full-width-caption` and `.card-caption`;
   - `.collapsible-container`;
   - the panel step-back;
   - the table's first column.

   The two compensations new in this release copy the number and are wrong:
   - on a phone a table's label column sits 24 px inside the text;
   - a table in a caption panel is padded twice (+33 px);
   - a table in a card keeps 32 px.

   Fix: tokens `--outdent` and `--outdent-end` (internal, like `--field-width`) and one rule per user. A prototype gave identical output on 34 elements at 9 widths, apart from the three wrong places. [`outdent-amount-not-a-token`, `outdent-amount-rederived`, `outdent-compensation-two-copies`, `outdent-compensations-misaligned`]
2. **"A surface keeps outdents inside" is implemented four ways:**
   - the `contain-outdents` mixin (card, panel);
   - a stale 6-class copy on the collapsible;
   - `_print` restating the mixin body;
   - the panel step-back's own surface list.

   As a result, `.card-inverted` contains nothing: `pre` and `.highlight` poke 16 px out of a dark card. The collapsible lets `blockquote`, `.full-width-caption` and `.teaser-bottom` hang out.

   Fix: one `$outdent-surfaces` list (card, card-inverted, panel, collapsible) and the mixin everywhere; extend the CSS-357 contract test beyond card/panel. [`outdent-containment-three-lists`, `collapsible-contain-list`]
3. **Sidenote rules fight each other:**
   - **Bottom edge:** the row's bottom-edge rule is (0,1,0), while its comment (and section 13) promises that a margin utility on the block still decides.
   - **Row gap:** the 16 px row gap exists only for direct children of `article` (and its sections), yet the bottom margin is zeroed in every wrapper.
   - **Width cap:** `.sidenote { max-width: calc(2 * var(--global-fr)) }` hard-codes the 2 of `--sidenote-column: 8 / span 2`, so the documented column tokens can move the note but never widen it.
   - **Wide blocks:** a wide block inside the row is sized by the page token `width: var(--text-content-caption)`, not by its grid area. This inflates the tracks and defeats `--sidenote-wide-column`.
   - **Banner column:** on a tablet the banner's `7 / span 3` overlaps the wide column `1 / span 7`. Set on the banner itself, it also overrides a consumer's `:root` setting.

   Fix: one rule set where the grid owns widths, the edge rule sits at zero weight, the gap scope matches the reset scope, and the banner takes a column that cannot overlap. [`sidenote-row-bottom-where-loses`, `sidenote-row-bottom-edge-cascade`, `sidenote-row-gap-only-in-article`, `sidenote-max-width-pins-span-2`, `sidenote-wide-block-inflates-tracks`, `sidenote-wide-blocks-ignore-grid`, `banner-tablet-column-collides-with-wide-column`, `banner-tablet-column-collision`, `sidenote-tokens-defeated`]
4. **Buttons:**
   - **Undoing the look:** four components (legend, header icons, copy icon, cookie notice and others) undo the bare-`<button>` look by hand, each with a different subset. Two of them repeat resets for states the module's specificity contract already covers, which is dead code. Fix: one `unbutton` mixin (or a documented class) that resets exactly what the default sets.
   - **Repeated literals:** `::file-selector-button` restates the button face by hand. The section-36 optical shift is written as `calc(py + 1px) … calc(py - 1px)` three times, and the 32 px radius six times. Fix: one private value each.

   [`unbutton-resets-repeated`, `button-chrome-resets-per-component`, `control-face-copied`, `optical-shift-literals`]
5. **Two mixins for one range.** `below-desktop` (section 3) is used nowhere, while `.card-grid` still uses `multi-breakpoint("mobile", "tablet")` for the same range. Keep one (decision 3 in section 47). [`below-desktop-vs-multi-breakpoint`]
6. **The light card inside a dark card restores roles by retyping the library's `:root` values** from four files, so a project's own re-mapping of a role is lost inside it. The test only keeps the copies equal. Fix: restore by reference (re-declare from the original source tokens), or document the limit. [`nested-card-restores-library-defaults`, `nested-card-restates-root`]
7. **Undo rules instead of scoping, and dead rules:**
   - `.caption :is(p, ul, ol) { max-width: none }` undoes the measure; `.caption` belongs in `$measure-free`, which exists for exactly this case.
   - `.table-terminal` / `.table-striped` padding wins by source order.
   - `.collapsible-content > .panel:not(.panel--flush) { padding: var(--space-md) }` restates the panel base, and its comment is stale.
   - The rest of `dead-and-redundant-rules`.

   [`caption-measure-undo`, `caption-measure-second-mechanism`, `table-striped-order-undo`, `collapsible-panel-padding-dead`, `dead-and-redundant-rules`]

### 45.3 Record for later (backlog)

- **A callout's fill does not follow its role** on a surface: the `-bg` twins are resolved on `:root`. [`callout-fill-does-not-follow-role`]
- **The muted small-print set is copied**, with `line-height: 1.3` as a literal 9 times. [`small-print-block-copied`]
- **The link underline recipe is written three times:** `a`, `.button-link` and the `.<hue>-link` generator. [`link-underline-recipe-three-times`]
- **The `.rc-chart` opt-out is spelled out in five places,** with two private copies of one Sass variable. The `.button` exclusion from link rules is repeated in four. [`rc-chart-optout-hand-written`, `link-button-exclusions`]
- **The cookie badge's `top: -66px` / `-68px`** were reverse-engineered from an accidental inherited line box. [`cookie-badge-px-offsets`]
- **The submit-right rule is (0,2,1),** heavier than the forms module's contract. [`submit-rule-breaks-forms-contract`]
- **`.card-caption` duplicates `.full-width-caption`** (Q-15 alias). [`card-caption-duplicates-full-width-caption`]

## 46. Styles–charts pair check (2026-11-06)

**The release order is sequential (maintainer, 2026-11-06):** first Rare Styles v0.7.2, then RareCharts 0.9.8_7, which reads the new tokens. There is no single push.

**Method.**
- Both libraries were measured in Chrome at 1440 and 375 px: v0.7.2 + RareCharts 0.9.8_6 (this branch) against v0.7.1 + 0.9.8_6 (main).
- Coverage: every chart on 23 pages, with a tooltip opened on 108 of 122 charts.
- The sidenote demo at 375/768/800/1024/1279/1440.
- Simulations: 0.9.8_7 dropping its guards on both Rare Styles versions, and a one-sided pin bump.
- Separately: the coupling contract, the RareCharts plan and the CI mechanics.

The full list is in Appendix B.

### 46.1 Between the two releases (Rare Styles out, charts not yet)

- **Plots get shorter:**
  - 22 docs charts lose 34 px of plot, because the frame moved onto the chart element (RC-058 says 23; it is 22);
  - charts with a source line lose another 2.8 px, because the source no longer gets 1.3 from `cite`;
  - TimeSeries at phone width loses 38 px (its range bar wraps);
  - the Graph demos lose 37–61 px at 375 px.
- **On a dark card** (`.card-inverted`), RareCharts 0.9.8_6 reads `--border-color` directly, so its range and Lin/Log frames fall from 7.9:1 to 2.2:1.
- **Everything else is clean:** no clipped labels, no horizontal scroll, no JS errors. Range buttons, legends, tooltips, Sankey, MapFlow and the details panel only change by intended Rare Styles changes. Removing the RareCharts guards changes nothing on v0.7.2, which confirms CSS-381.

### 46.2 What the RareCharts 0.9.8_7 plan is missing (to add before its branch is cut)

1. **Guards against v0.7.1 hosts.** RC-028 and RC-032 judged the guards only against v0.7.2. On v0.7.1, which both live sites still pin, dropping RC-028 and G1/G3/G4/G6 breaks the sidenote chart and brings back the button chrome. Keep them while v0.7.1 is a supported host, or declare "Rare Styles ≥ v0.7.2". Add the published v0.7.1 `rare.css` as a hostile host in X-08.
2. **RC-054 legend buttons need a full reset** at doubled-class weight, including `:hover` and `:active`. Without it they are grey pills on v0.7.1 and raw browser buttons on v0.7.2.
3. **RC-014 strategy.** `var()` chains in theme values break the JavaScript colour maths: Map's hover brighten gets NaN, and the `tooltipFormat` and points payloads would carry `var()` strings. Either resolve the chain per render with `getComputedStyle` on the container, or keep `var()` in SVG attributes and the literal for maths and payloads.
4. **RC-014 coverage.** Four more page-token reads to switch:
   - header, subtitle, legend and source text on `--primary-color` (black on a dark card);
   - the range hover border;
   - the full-screen background;
   - the Graph overflow panel.

   Acceptance: a light-theme chart on a v0.7.2 `.card-inverted` at 4.5:1 for text and 3:1 for frames; the same chart unchanged on v0.7.1 and on a bare page.
5. **Palette, section 44, sub-decisions:**
   - darkTheme's accent (#ff6200) against a multi-series palette that starts blue;
   - `theme.map.matchFill` #00aaff;
   - five `linkPresets` and about 20 docs examples that hard-code #00aaff;
   - Donut K-22: "back to the accent" now looks like slice 1;
   - `test/circular.test.js` PALETTE;
   - the /charts/styles/ tables.
6. **K-15 now:** `.rc-chart-source { line-height: 1.3 }`, so RC-058's +34 is exact; decide the tooltip rows' line-height.
7. **RC-058 details:** 22, not 23; the TimeSeries phone case; the Graph phones stay short after +34; the dual-axes plot floor at 375.
8. **RC-060 (labels clip in an unpadded container)** is now promoted by the v0.7.2 panel docs: an unframed chart in a sidenote, in a `.panel__row` cell, in `.panel__body`. Include it in 0.9.8_7, or add a caveat on /styles/bricks/panels/ before the Rare Styles tag.
9. **The RareCharts docs that RC-014 and section 44 make false:** /charts/styles/ ("Chart colors are not in CSS", the token list, the palette and accent tables), and a compatibility note on /charts/installation/ (which Rare Styles pairs with which RareCharts).
10. **Rare Styles' own browser tests test RareCharts' DOM.** `charts-rd-host` (CSS-381) selects `.rc-range-btn:not(.active)`, `.rc-graph-legend-item` and the tools buttons. Keep the K-06 aliases, and update the fixture in the charts commit when classes change.
11. **Branch base.** The 0.9.8_7 branch is cut from the final Rare Styles commit, not from today's main. Workflow agents reset to it.
12. **Already done by the Rare Styles docs migration** (tick off, do not redo):
    - RC-029: gauge rows on `.panel__row--stack --text-start`, stacked on phones;
    - RC-031: the dead `black-bg` and the `pre` card classes on /charts/combined/;
    - all chart frames on the one panel recipe.
13. **CI robustness** (a separate change, outside both release commits):
    - `sync-charts.yml` pushes the tag before it creates the GitHub Release, and has no `workflow_dispatch`, so a failed run cannot be resumed;
    - `deploy.yml` does not wait for the rare-charts tag.

## 47. Release plan: Rare Styles v0.7.2, then RareCharts 0.9.8_7

### Decisions needed from the maintainer

| # | Decision | Recommendation |
|---|---|---|
| 1 | The `/charts/` sidenote chart (45.1-6): fix in the styles (a sidenote with an embedded component stays stacked below desktop; right alignment for text only), or move the demo out of the sidenote | Fix in the styles |
| 2 | New name for `--brand-color-link` (45.1-2) | `--link-underline-color` |
| 3 | One breakpoint mixin for tablet+phone (45.2-5) | Keep `below-desktop`, move `.card-grid` onto it, remove the `multi-breakpoint` use |
| 4 | Which of 45.2 goes into v0.7.2 | All of 45.2 (S–M each). 45.3 goes to the backlog |
| 5 | How v0.7.2 lands on main | A PR merge, as v0.7.0 and v0.7.1, so the size row's commit stays reachable. With a squash, re-measure the row at the final commit before the push |
| 6 | The gap between the releases (46.1) | Raise the 22 docs chart heights (+34; +38 TimeSeries on phones) in RareCharts' release only (charts files stay with charts). Accept the shorter docs charts on the site for the time between, or keep the gap short by starting 0.9.8_7 right after the tag |

### Phase 1: Rare Styles fixes (branch `charts-dependencies-v0.7.2`)

1. **45.1 bugs:**
   - the primary pressed label;
   - the link token rename (and every use: links, tags, docs, MIGRATION);
   - the caption-panel padding;
   - the sidenote with an embedded component (decision 1), and add 800 px to the sidenote fixture.
2. **45.2 refactors,** each with a fixture and a mutation check, and output compared against the current build on all built pages at 1440/1023/800/768/375 and in print. Order:
   - outdent tokens;
   - one containment list (`.card-inverted` contains);
   - the sidenote rule set;
   - the unbutton mixin and the shared control literals;
   - one breakpoint mixin;
   - the nested-card restore;
   - the `$measure-free` entry for `.caption`, the table-terminal scope, the dead rules.
3. **45.3 into the backlog** as CSS rows in a later milestone.

### Phase 2: Release documents

1. **Changelog v0.7.2** rewritten against the final CSS: button look, colour names and aliases, series order, brand and link tokens, headings, panels, forms, sidenotes, tables, lists. Set the release date.
2. **MIGRATION v0.7.2:**
   - steps and rows corrected;
   - rows added for every v0.7.1 API change from the hand review (45.1-4);
   - the series order;
   - "RareCharts ≥ 0.9.8_7 reads the tokens".
3. **STYLEGUIDE and the docs pages:** the button slots, the field/button heights, the sidenote tokens.
4. **The backlog:** amend the v0.7.2 Done rows and decisions to what shipped (`CSS-121`, `-124`, `-040`, `-041`, `-046`, the series and signal decisions); move section 44 and 46.2 into `_internal_docs/charts/BACKLOG.md` (RC-014, RC-028, RC-032, RC-054, RC-058, RC-060, K-15, D-04, a CI row), and tick RC-029/RC-031 parts.
5. **This file:** once every open item in it is in the Changelog, the backlog or the docs, delete it, per its own header and the internal-docs rule. If it is still needed while the release is open, it moves to `_internal_docs/styles/`.

### Phase 3: Verification

1. Lint, `build:css` (artifacts equal a fresh build), unit tests, browser tests, `check:links`, `release-css check`, a `release-css stage` dry run.
2. **Consumer check again on the final CSS:**
   - schnellreich.ru and raredigits.io, every page at 1440/375 against v0.7.1, plus states and print;
   - Churchbook from its templates;
   - update MIGRATION's table and the per-site checklists.
3. **The `/charts/` pages** with RareCharts 0.9.8_6 at 1440/1023/800/768/375: the sidenote demo, option tables, dark card.
4. **Size:** a new `SIZE-BASELINE` row and the Changelog bundle line at the final commit (decision 5).

### Phase 4: Landing Rare Styles v0.7.2

1. The maintainer checks the branch by hand.
2. Land on main (decision 5). The push runs release-css (publish and tag `v0.7.2`, then the jsDelivr byte check), sync-charts (no-op: 0.9.8_6 is tagged) and deploy.
3. Watch the three runs; check jsDelivr `@v0.7.2` and the site.
4. **Consumer pins:** keep them on v0.7.1 until 0.9.8_7 is out, then bump `rare-styles` and `rare-charts` together in one commit per site, following MIGRATION's checklists. Exception: Churchbook first needs `class="rd"` and a pinned URL; that can go now, on v0.7.1.

### Phase 5: RareCharts 0.9.8_7

1. **Update the plan first** (`_internal_docs/charts/BACKLOG.md`): 46.2 items 1–12, section 44, the 0.9.8_7 heights.
2. **Cut `timeseries-analytics-v0.9.8_7`** from the v0.7.2 commit on main.
3. **Its scope** stays as planned: TimeSeries Analytics, T-10, every audit item, B-06, the interactive legend, section H. The pickup core moves to the front:
   - RC-014 with its strategy;
   - section H with the v0.7.1-host decision;
   - RC-058 heights;
   - K-15 source line;
   - RC-060 or its caveat.
4. **Release** by the RareCharts rules: a squash; charts and their docs only; no Rare Styles fixes; no Russian internal files.

### Appendix A — every finding of the logic/hacks/duplication review (verbatim summaries)

Four lenses, each finding checked by a skeptic. Verdicts: confirmed / partly (the core holds, details differ). Severity is the skeptic's. Ids are referenced from section 45.

#### Lens: duplication (13)

- **`outdent-amount-not-a-token`** — partly, should-fix, effort M. *Where:* typography/_text-content.scss:6-20,33-52,346,355-358; layout/_spacing.scss:62-74; bricks/_cards.scss:119-127; special/_collapsible.scss:6,9-11; bricks/_panels.scss:57-73; typography/_tables.scss:83-87
  - *What:* The outdent amount is written by hand in 8 places: `--space-lg`, `--space-sm` on a phone, and the right side `min(var(--space-lg), var(--field-width) + var(--space-md))`. Two compensations new in this release copy the number instead of reading it: the table's first-column step-back (§14) and the caption panel's padding (§25). They disagree with the outdent and with each other.
  - *Fix:* For this release, change only the table rule, and key the exclusion on the box (tested via CSSOM: f1b → 346.25, the card case → 361.25, both flush cases stay at 345.25): ```scss $-contained: ".panel, .card, .collapsible-container, .collapsible-content"; // + .card-inverted once it contains :is(:is(#{$caption-boxes}):not(:where(#{$-contained}) *):not(:where(.panel:not(.panel--flush))) table, table:is(#{$caption-boxes}):not(:where(#{$-contained}) *)) :is(th, td):first-child { padding-left: var(--space-lg); @include mobile { padding-left: var(--space-sm); } // the phone outdent: 31 /charts/ opti…
  - *Skeptic:* I measured this on a gated build in a detached worktree (Chrome, the real page shell). Text edge is 345.25px at 1300px and 16px at 375px. What holds: • `.panel.panel--bordered.text-content-caption > table`: the label sits at 378.25 vs 345.25 (+33px) at 1300px and at 57 vs 16 at 375px. The panel pads 32px (panels:59) and the td pads another 32px (tables:85). • `.card.padding-md > .text-content-cap…
- **`outdent-containment-three-lists`** — confirmed, should-fix, effort S. *Where:* bricks/_contain-outdents.scss:10-19; bricks/_cards.scss:10-21,33-73; special/_collapsible.scss:87-100; bricks/_panels.scss:57; utilities/_print.scss:60-65; test/layout-contracts.test.js:48-49
  - *What:* The rule "a surface contains outdents" is implemented four separate ways: • the `contain-outdents` mixin (10 classes), used only on `.card` and `.panel`; • a stale 6-class copy on `.collapsible-container`/`.collapsible-content`; • `_print` restating the mixin body around `co.$outdents`; • the panel step-back's own surface list `:where(.card, .panel, .collapsible-content) *`. `.card-inverted` is a standalone sibling of `.card`, not a modifier, and copies `.card`'s layout block but gets no containment at all.
  - *Fix:* Do it as proposed, but derive the table rule's exclusion in the first finding from the same `$outdent-surfaces` list, so the panel step-back, the table step-back and the contract test all read one list.
- **`below-desktop-vs-multi-breakpoint`** — confirmed, should-fix, effort S. *Where:* utilities/_breakpoints.scss:26-50; bricks/_cards.scss:230-236; typography/_text-content.scss:351-358; test/layout-contracts.test.js:31-39
  - *What:* Two mixins cover one range. `below-desktop` was added (§3) and kept "for dashboards", but nothing uses it. The library's only tablet-plus-mobile consumer, `.card-grid`, still uses `multi-breakpoint("mobile", "tablet")`, which emits two identical @media blocks. `pre` writes `padding: var(--space-md)` once in `tablet` and again in `mobile`. The CSS-358 allowlist does not accept `below-desktop`'s output.
  - *Fix:* As proposed: • `.card-grid` and `pre` padding go on `below-desktop`; • the allowlist entry '(width < 1024px)' becomes 'screen and (width < 1024px)'. Deleting `multi-breakpoint` is optional. It has no caller left, but it is a Sass mixin a SCSS-compiling consumer could use. It costs nothing to keep with a deprecation comment.
- **`sidenote-max-width-pins-span-2`** — confirmed, should-fix, effort S. *Where:* typography/_notes.scss:72-76,94-105 (line 99),168-170,189-193
  - *What:* `.sidenote-wrapper > .sidenote { max-width: calc(2 * var(--global-fr)) }` hard-codes the "2" from `--sidenote-column: 8 / span 2`. The column tokens added in §5 ("override on :root or on one wrapper") can move the note but can never widen it. The banner's tablet `max-width: none` and the mobile `max-width: 100%` exist only to undo this cap.
  - *Fix:* Prefer (b): drop notes:99, plus the two compensations at notes:168-170 and notes:192. It is a small visual change: the default note gains one column gap. Use (a) only if the maintainer wants the default note to stay exactly 2fr wide.
- **`banner-tablet-column-collides-with-wide-column`** — partly, record-for-later, effort S. *Where:* typography/_notes.scss:73-75,148-159,182-194
  - *What:* On a tablet the banner takes `--sidenote-column: 7 / span 3` (§12), while wide blocks take `--sidenote-wide-column: 1 / span 7` (§5/§6). Both claim column 7. Separately, the tablet rule that shifts a note beside a wide block also overrides the banner's own −4px margin.
  - *Fix:* In the wrapper's tablet block, one rule: ```scss &:has(> :is(#{$sidenote-wide})) > .sidenote-banner { --sidenote-column: 8 / span 2; } ``` It shares the 16px shift that notes beside a wide block get. If not, document that on a tablet a banner and a wide block do not share a row. A tablet row has no room for both a 3-column banner and a caption-width block.
  - *Skeptic:* The collision holds (measured at 900px): • `.sidenote-wrapper > p + .highlight + .sidenote.sidenote-banner`: the banner sits at `7 / span 3`, rows 1–2. The highlight (`1 / span 7`, auto row) is pushed below it: the highlight's top (2841) equals the banner's bottom (2841). • The banner's margin-left is 16px. The (0,3,0) `:has(> :is(wide)) > .sidenote` rule beats `.sidenote.sidenote-banner { margin…
- **`unbutton-resets-repeated`** — partly, should-fix, effort S. *Where:* bricks/_legend.scss:38-46; special/_collapsible.scss:29-49; decorations/_icons.scss:261-272; navigation/header/_header-container.scss:94-106; elements/_buttons.scss:16-23
  - *What:* Four components each undo the new bare-`<button>` look by hand. Two of them also repeat the undo for states that the button module's specificity contract already covers, which is dead code.
  - *Fix:* Before release, delete the dead code (verified to change no output): • the second selector at legend:39; • collapsible:39-48, the underline restatement and `&:hover`. The `unbutton` mixin is optional. Leave `border-radius` out of it, or accept a square focus ring on the copy and header icons. Each component writes its own `color` after the include.
  - *Skeptic:* The dead code is real. In rare.css every bare button state rule is (0,0,1): `button:not(:where(.rc-chart *)):where(:hover…)`, `:where([aria-busy])` and the rest. `button.legend__item` and `button.collapsible-trigger` are (0,1,1). I checked it in Chrome with CDP `CSS.forcePseudoState`, comparing 19 computed properties of `#lg` (rest, hover, active), `#lg-busy`, `#lg-dis` and the trigger (rest, hov…
- **`collapsible-panel-padding-dead`** — confirmed, should-fix, effort S. *Where:* special/_collapsible.scss:69-78
  - *What:* `.collapsible-content > .panel:not(.panel--flush) { padding: var(--space-md) }` restates the panel's base padding. Its comment ("an even, tighter padding … was the .card-dashboard-bordered rule") describes the `16px 32px` panel from before §25.
  - *Fix:* Delete collapsible:73-77 (the comment and the rule), as proposed.
- **`card-caption-duplicates-full-width-caption`** — partly, record-for-later, effort S. *Where:* bricks/_cards.scss:119-127; layout/_spacing.scss:62-74; typography/_figures.scss:63; bricks/_panels.scss:63,68; typography/_tables.scss:83
  - *What:* `.card-caption` is a second definition of `.full-width-caption`; Q-15 already calls it a duplicate and plans an alias. Every class list added in v0.7.2 has to name both by hand, and one already misses `.card-caption`. The copy also lacks `max-width: none`.
  - *Fix:* For this release, correct the Q-15 row in the backlog: `.card-caption` lacks `max-width: none`, so it does not match on p/figure. If the alias goes in anyway, write `.full-width-caption, .card-caption { … }` in _spacing.scss, delete cards:119-127, and make panels:63/68 read `$caption-boxes`.
  - *Skeptic:* What holds: • cards:119-127 equals spacing:62-74 minus `max-width: none`. • figures:63 lists `.full-width-caption` but not `.card-caption`. • panels:63 and panels:68 hand-name the pair instead of reading `$caption-boxes`. • Measured at 1300px: - `p.card-caption` is 505.25px wide (max-width = the measure), while `p.full-width-caption` is 954.25px; - `figure.card-caption` is 505.25px, while `figure…
- **`small-print-block-copied`** — confirmed, record-for-later, effort S. *Where:* typography/_text-content.scss:169-195,242-252,471; typography/_notes.scss:4-13,42-49,101,199-204; bricks/_stats.scss:31-35; bricks/_legend.scss:22-23; elements/_forms.scss:387-391; navigation/_sidebar.scss:114-117
  - *What:* The muted small-print set (`color: var(--text-color-light); font-weight: var(--font-weight-light); font-size: var(--font-size-sm); line-height: 1.3`) is copied rather than shared. `line-height: 1.3` is a literal in 9 rules and is not on the line-height scale (1 / 1.2 / 1.5 / 1.7 / 2); three of those rules are new in v0.7.2. The CSS-375 conversion also wrote the scale's own values as literals.
  - *Fix:* As proposed. If the token route is taken, note that `var(--line-height-xs)` on `.handwritten` makes it follow a consumer's override of that token. That is probably what a consumer wants.
- **`control-face-copied`** — confirmed, record-for-later, effort S. *Where:* elements/_forms.scss:55,284-302; elements/_buttons.scss:29-38,62-68,85-97,272-273,296-302,315-319
  - *What:* The button face is restated by hand in `::file-selector-button` (§39 says it is ".button-sm sized"). The 1px optical padding shift is written three times. The 32px radius is written six times. The default-look fallbacks are spread over five rules, and the header comment has already drifted from them.
  - *Fix:* Sass only, so no `--button-*` lands on :root (the §34 decision): • `$-radius: var(--space-lg); $-rest-bg: var(--gray-lightest); $-rest-text: var(--gray-dark); $-hover-bg: var(--white); $-active-bg: var(--bg-color);`, used in every fallback, with the header comment regenerated from them; • `@mixin control-padding($y, $x) { padding: calc(#{$y} + 1px) #{$x} calc(#{$y} - 1px); }` for the button, the field and the file button; • a `button-face($size)` mixin shared by the base rule and `::file-selector-button`, keeping its deliberate `--gray-mid-light` rest fill as a parameter; • `.button-icon`: `b…
- **`caption-measure-second-mechanism`** — confirmed, record-for-later, effort S. *Where:* typography/_text-content.scss:64-86,158-162
  - *What:* §12 frees the measure inside `.caption` with an extra override, `.caption :is(p, ul, ol) { max-width: none }` at (0,1,1) beating (0,0,2). The same file already has `$measure-free` for exactly this purpose (CSS-374/384), and its comment (:73-75) still names `.caption` as a prose wrapper that keeps the measure.
  - *Fix:* `$measure-free: ".table-scroll, .table-bordered, .panel, .stat, .rc-chart, .caption";`, delete :158-162, and update the comment at :73-75. p/ul/ol give the same result (no max-width rule matches them any more); dl, blockquote and figure inside a caption are freed as well, which is consistent with "the caption is its own measure".
- **`rc-chart-optout-hand-written`** — confirmed, record-for-later, effort S. *Where:* elements/_buttons.scss:40; elements/_forms.scss:18; typography/_text-content.scss:78; typography/_notes.scss:111; utilities/_print.scss:106; navigation/_links.scss:55,78; bricks/_cards.scss:80
  - *What:* The rule "an embedded chart owns its subtree" is spelled out in five places, including two private copies of the same Sass variable. The `.button` opt-out from text-link rules is likewise repeated in four selectors.
  - *Fix:* Add one partial, e.g. utilities/_contracts.scss: ```scss $embedded: ".rc-chart"; $outside-embedded: ":not(:where(#{$embedded} *))"; $not-button: ":not(:where(.button))"; ``` `@use` it in all five modules. No change in output.
- **`link-underline-recipe-three-times`** — partly, record-for-later, effort S. *Where:* navigation/_links.scss:9-18; elements/_buttons.scss:207-210; colors/_color-classes.scss:15-21; colors/_brand.scss:14-16,20-23
  - *What:* The link look is written three times: the `a` rule, `.button-link`, and the `.<hue>-link` generator, each with its own copy of the underline colour, the 0.2em offset and the 20% `color-mix` fill.
  - *Fix:* In _links.scss: ```scss @mixin link-underline($color) { text-decoration: underline; text-decoration-color: $color; text-decoration-thickness: 1px; text-underline-offset: 0.2em; } @mixin link-fill($color) { background-image: linear-gradient(to top, color-mix(in srgb, #{$color} 20%, transparent) 0 100%); } ``` Use them in `a`, in `.button-link` (link-underline), and in `color-classes` for the `-link` classes (decoration colour plus link-fill). No change in output.
  - *Skeptic:* The copies exist: • links:11-14 and buttons:207-210 are the same four underline declarations; • links:15-18 and color-classes:17-20 are the same `color-mix(… 20%, transparent)` gradient. The argument for fixing them is weaker than stated: • The §42 detour, keeping `--brand-color-link` out of `$brand_colors` to avoid a `.brand-color-link-link` class, comes from how the generator names its classes.…

#### Lens: hacks (13)

- **`primary-pressed-white-on-green`** — confirmed, fix-before-release, effort S. *Where:* assets/css/modules/elements/_buttons.scss:166-168 (with :315-319)
  - *What:* The white-label rule `.button-primary:is(:hover, :active, [aria-pressed="true"]):where(:not(...)) { color: var(--white) }` turns the label white for every pressed primary. The dark pressed fill only comes from `.button-group > [aria-pressed="true"]` (:315-319), which re-points `--button-bg`. A primary toggle outside a group keeps the #00ff4e fill and gets a white label on it. This is the per-variant override that replaced the `--button-text-hover` slot (section 35), and it no longer travels with the fill it was written for.
  - *Fix:* Use the minimal fix: `.button-primary:is(:hover, :active):where(:not(:disabled, [aria-disabled="true"], [aria-busy="true"])), .button-group > .button-primary[aria-pressed="true"]:where(:not(:disabled, [aria-disabled="true"], [aria-busy="true"])) { color: var(--white); }`. The 'cleaner' fix (pressed remap for every toggle) is a design change: standalone default toggles would start showing a grey fill and black frame. It needs the owner's decision, so it is not a release fix.
- **`panel-caption-right-padding-tablet`** — confirmed, fix-before-release, effort S. *Where:* assets/css/modules/bricks/_panels.scss:57-61
  - *What:* `.panel…text-content-caption { padding-right: min(var(--space-lg), var(--field-width) + var(--space-md)) }` copies the clamp from the `outdent` mixin (_text-content.scss:14). That clamp only limits an auto-width block (`.caption`). A `.text-content-caption` panel has the explicit width `--text-content-caption` (measure + 2 × `--space-lg`), so in block flow its right margin is over-constrained and ignored. It always hangs 32px past the measure, and at 769–1279px the 16px padding leaves its content 16px past the text edge.
  - *Fix:* `&.text-content-caption { padding-left: var(--space-lg); padding-right: var(--space-lg); }`. Keep the phone block. Rewrite :49-56: the right outdent is clamped only for auto-width blocks (`.caption`), and a caption-width box always hangs the full `--space-lg`.
- **`sidenote-wide-block-inflates-tracks`** — partly, should-fix, effort S. *Where:* assets/css/modules/typography/_notes.scss:94-105, 146-159, 182-195; _text-content.scss:26-31
  - *What:* In the sidenote row a wide block (`.highlight`, `.text-content-caption`, `.lead`, `.teaser-bottom`) is placed in `--sidenote-wide-column: 1 / span 7`. Its width still comes from the explicit `width: var(--text-content-caption)` of `caption-width`, not from that area. On a desktop the span does nothing: the card is 569px in a 744px area. On a tablet the explicit width is larger than 7 tracks, so grid sizing widens columns 1–7 and squeezes the note's columns. The tablet rule `&:has(> :is(wide)) > .sidenote { width: auto; margin-left: var(--space-md) }` then moves the already squeezed note right…
  - *Fix:* The proposed rule works as measured. Present it as a layout change for the owner to approve, not a pure refactor. If the cap is kept, the section-8 advice (wrap wide note content in `.table-scroll`) stays necessary even after this fix, because the cap, not the inflation, makes the tablet note about 100px.
  - *Skeptic:* The core holds. On /styles/layout/ the explicit-width card inflates sidenote tracks 1–7 on tablets: 54×7 + 32×2 at 800px, 63×7 + 40×2 at 900px, 73×7 + 51×2 at 1023px. The :has() patch then gives a 64px note at 800px and an 81px note at 900px. With the proposed width/margin in an injected style and the patch neutralised, the tracks are equal (58×9 at 900px), the card is 205–737 (532px), the note i…
- **`sidenote-row-bottom-where-loses`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/typography/_notes.scss:137-144
  - *What:* `.sidenote-wrapper > :where(:not(.sidenote, :has(~ :not(.sidenote))))` (and `… > :last-child`) zeroes the last text block's margin-bottom at (0,1,0). The comment says the `:where()` is there 'so a margin utility on that block still decides'. Source order does the opposite. typography/_notes comes before _text-content (typography/_index.scss), so `.highlight { margin-bottom: md }` and `.lead { margin-bottom: md }` at (0,1,0) win. Spacing utilities (layout/_spacing, forwarded before typography) lose.
  - *Fix:* Drop the `:where()` as proposed: `> :not(.sidenote, :has(~ :not(.sidenote)))` is (0,2,0) and its `> :last-child` form is (0,3,0). Rewrite the comment to say the row always zeroes its last block, and that a utility cannot override this, given CSS-130 load order. Re-run rd-gate-fixture.test.js: section 13 records a jsdom/nwsapi problem with a nearby selector form.
- **`caption-measure-undo`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/typography/_text-content.scss:64-86, 158-162, 254-258, 284-288; _figures.scss:28-38
  - *What:* `.caption :is(p, ul, ol) { max-width: none }` exists only to undo `article :is(p, ul, ol):not(:where(#{$measure-free}) *)`. The exclusion list `$measure-free` was built for exactly this case. Because the undo copies only three of the six measure rules, `dl`, `blockquote` and `figure` inside a `.caption` keep the 505px measure while its paragraphs run the full width. The header comment (:64-65, :74) still lists 'captions' as a prose surface on the measure. The `:not(:where(#{$measure-free}) *)` guard is hand-copied onto five selectors.
  - *Fix:* Put `.caption` in the guard list: either in `$measure-free`, or in a sibling `$own-measure` that the guard joins, since `$measure-free` is documented as 'data components'. Delete :158-162 and fix the comments at :64-77. Emit the guard from one mixin, as proposed. Keep the mobile `max-width: 100%` blocks, or move them into that mixin, rather than deleting them.
- **`outdent-amount-rederived`** — confirmed, should-fix, effort M. *Where:* assets/css/modules/bricks/_panels.scss:57-73; typography/_tables.scss:83-87; typography/_text-content.scss:6-20, 153, 346, 357; layout/_spacing.scss:62-74; bricks/_cards.scss:119-127; special/_collapsible.scss:4-14
  - *What:* The outdent amount (`--space-lg` on the left, `min(--space-lg, --field-width + --space-md)` on the right, `--space-sm` on a phone) is written out by hand in eight places. This release added two compensations that each derive it again. The panel steps its padding back by the outdent: `--space-lg` and the copied min(), plus a mobile block whose only job is to restore `.panel`'s own `--space-md`. A table in a caption box sets its first column to `padding-left: var(--space-lg)` with no phone value, so on a phone (outdent 8px) its labels sit 24px inside the text edge. Section 14 notes this without…
  - *Fix:* The token design is right and also fixes the in-card table, because `contain-outdents` would zero `--outdent`. It is an M refactor. If it waits for the next release, the minimal pre-release fix is: phone value `padding-left: var(--space-sm)` for the table compensation, plus the panel's contained-host exclusion on it. Do not move `.caption`'s border-compensating padding onto the token blindly: `calc(var(--outdent) - var(--space-sm))` gives 0 on a phone.
- **`collapsible-contain-list`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/special/_collapsible.scss:70-76, 85-97; bricks/_panels.scss:57
  - *What:* This release moved card, panel and print onto one list (`$outdents`, bricks/_contain-outdents.scss). The collapsible still contains outdents with its own hand list (`.lead, .caption, .highlight, pre, .text-content-caption, .card-caption`), which lacks `blockquote`, `.full-width-caption`, `.teaser-bottom` and `.collapsible-container`. The panel's exclusion lists `.collapsible-content` but not `.collapsible-container`, which the collapsible list does contain. `.collapsible-content > .panel:not(.panel--flush) { padding: var(--space-md) }` became a no-op once `.panel` pads `--space-md` everywhere…
  - *Fix:* As proposed: `@use "../bricks/contain-outdents" as co;` and `.collapsible-container, .collapsible-content { @include co.contain-outdents; }`. Add `.collapsible-container` to the panel's exclusion, or drop the exclusion with the outdent tokens. Delete :73-77 and MIGRATION row 24, and add the collapsible host to test/layout-contracts.test.js.
- **`link-button-exclusions`** — partly, record-for-later, effort S. *Where:* assets/css/modules/typography/_notes.scss:59-61, 111-113; bricks/_cards.scss:80-82; navigation/_links.scss:54-55, 78; special/_cookie-consent.scss:64-68
  - *What:* Link rules that colour `X a` beat `.button` (0,1,0), so this release patched three of them with zero-weight exclusions: `.sidebar a:not(:where(.button))`, `.card-inverted a:not(:where(.card-inverted .card *, .button))` and `.sidenote a:not(:where(.rc-chart *, .button))`. That is whack-a-mole. `.footnote-inside-text a` (0,1,1) was missed, and so was `.cookie-notice__content a` (0,1,1), which adds a brand border-bottom. The library already has the token for this: `a { color: var(--link-color) }`. `.card-inverted` sets `--link-color: var(--gray-light)` and then sets the same colour again with it…
  - *Fix:* The token remap (`.footnote-inside-text, .sidenote-wrapper > .sidenote { --link-color: var(--text-color-light); }`) is the right direction. Note one behaviour change: a `<button class="button-link">` in a sidenote would then turn muted, because `.button-link` reads `--link-color`. Decide that explicitly.
  - *Skeptic:* The mechanism holds. Fixture: `<a class="button">` in `.footnote-inside-text` gets rgb(102,102,102), while in a sidenote or plain prose it gets rgb(51,51,51). `.card-inverted` both sets `--link-color: var(--gray-light)` and colours `a` with the same value. Its `a` rule's visible extra effect is lifting `nav a` in a dark card to rgb(240,240,240). RareCharts links use `color: inherit` (rare-charts.…
- **`table-striped-order-undo`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/typography/_tables.scss:64-66, 89-93
  - *What:* `.table-terminal td { padding-block: 0 }` and, outside the preset, `.table-striped td { padding-block: var(--space-xs) }` have equal weight (0,1,1). The second exists only to undo the first for `table-terminal table-striped` and works only because it comes later (its comment says so). For every other table it re-declares the base `th, td { padding: var(--space-xs) var(--space-sm) }`. The other presets (`.table-small`, `.table-horizontal-borders`, `.table-bordered`) survive it only because they come after it.
  - *Fix:* As proposed: inside `.table-terminal`, `&.table-striped td { padding-block: var(--space-xs); }` ((0,2,1)), and delete :89-93.
- **`button-chrome-resets-per-component`** — partly, should-fix, effort M. *Where:* assets/css/modules/bricks/_legend.scss:38-46; special/_collapsible.scss:29-48; navigation/header/_header-container.scss:91-107; decorations/_icons.scss:261-270
  - *What:* Because of Q-04, every component that styles its own `<button>` strips the default look by hand, each with a different subset. The release's specificity contract (_buttons.scss:16-23: bare states sit at (0,0,1), so 'a legend toggle … never has to repeat its look for :hover') leaves parts of these resets dead. The legend's second selector `button.legend__item:is(:hover, :active, :disabled, [aria-busy="true"])` (new in this release) repeats what `button.legend__item` (0,1,1) already wins. In `button.collapsible-trigger` the `&:hover { background: none; border: none }` and the five text-decorati…
  - *Fix:* Before release, delete only what is dead: the legend's second selector, the collapsible `&:hover` block and its five repeated text-decoration lines. That is S effort with no visual change. Record the shared `button-unstyled` mixin and the header flex-centring (a 1px visual change that needs the owner's eye) for the next release.
  - *Skeptic:* Dead rules confirmed by CSSOM removal in Chrome, with no computed-style change. I narrowed the legend selector to `button.legend__item` alone (dropping `:is(:hover, :active, :disabled, [aria-busy])`), cleared `button.collapsible-trigger:hover` and removed the five text-decoration lines from `button.collapsible-trigger`. Background, border, colour, padding, radius, font, text-decoration, opacity a…
- **`optical-shift-literals`** — partly, record-for-later, effort S. *Where:* assets/css/modules/elements/_buttons.scss:62, 277; elements/_forms.scss:55, 287
  - *What:* The owner's 1px label drop (section 36) is written as literal `calc(py + 1px) … calc(py - 1px)` three times: the button base, text fields/select/textarea, and `::file-selector-button`. `.button-icon` adds a fourth form, `padding: 2px 0 0`. It is also applied to `textarea`, which has no single label line to centre: it only makes the bottom padding smaller.
  - *Fix:* A private `$label-drop: 1px` and a `label-padding($py, $px)` mixin in a shared elements partial, as proposed, keeping textarea on the shift as the owner decided.
  - *Skeptic:* The duplication holds: `calc(py + 1px) … calc(py - 1px)` is written out at _buttons.scss:62, _forms.scss:55 and _forms.scss:287, and `.button-icon` uses `padding: 2px 0 0` (:277). One owner decision (section 36) is encoded in four literals. However, section 36 explicitly lists textarea among the fields that get the shift ('Текстовые поля, textarea, select … тот же сдвиг'). 'Leave textarea on even…
- **`cookie-badge-px-offsets`** — confirmed, record-for-later, effort S. *Where:* assets/css/modules/special/_cookie-consent.scss:43-62
  - *What:* `top: -66px` / phone `top: -68px` were reverse-engineered so the emoji stays where it sat when its line box was an accidental inherited 24px (CSS-375). The offsets are measured from `.cookie-notice__content`, so they ignore the notice's own padding (32px desktop, 15px phone), and the two values express two different geometries.
  - *Fix:* Anchoring to the notice edge (`top: 0; translate: 0 -55%`, with `position: relative` dropped from `.cookie-notice__content`, since the fixed, transformed `.cookie-notice` is already the containing block) is a visual change on phones. Do it with the owner's check, and update the consumer's MIGRATION note (`top: -1.125em`) at the same time.
- **`nested-card-restates-root`** — confirmed, record-for-later, effort M. *Where:* assets/css/modules/bricks/_cards.scss:84-111
  - *What:* `:where(.card-inverted .card)` restores the light roles by writing out the `:root` values again from four files (fonts, links, base colours, charts). The comment admits this, and test/tokens-contracts.test.js keeps the copies equal. Because they are literal library defaults, a project that re-themes a role on `:root` (e.g. `--border-color`) loses its value inside a light card nested in a dark one.
  - *Fix:* The `:root` snapshot works, because a custom property declared on `:root` resolves against the project's `:root` override. It does add about 11 public `:root` custom properties, which the API snapshot and token-count tests track. Give them names that read as internal, and record the API delta in MIGRATION.

#### Lens: logic (10)

- **`primary-toggle-white-on-green`** — confirmed, fix-before-release, effort S. *Where:* assets/css/modules/elements/_buttons.scss:166-168 (white label) vs :315-319 (pressed fill, group only)
  - *What:* The white label of `.button-primary` turns on for every `[aria-pressed="true"]` button. The dark pressed fill it was written for exists only inside `.button-group`. So a standalone primary toggle gets a white label on the bright brand green.
  - *Fix:* The proposed selector is correct. It is enough to change line 166 and the comment at :163 ('on the dark fills: hover, :active, a pressed toggle in a group').
- **`brand-color-link-name-collision`** — partly, fix-before-release, effort S. *Where:* assets/css/modules/colors/_brand.scss:14-16 and 20-25; colors/_color-classes.scss:15-21; navigation/_links.scss:12,17; elements/_buttons.scss:208
  - *What:* The new token `--brand-color-link` (#00b300, the link underline) has the same name as an existing public class `.brand-color-link`. `color-classes(brand-color)` generates that class, it reads `--brand-color` (#00ff4e), and not the token of the same name.
  - *Fix:* The proposed rename to `--link-underline-color` in navigation/_links.scss is fine. Use it in `a` and in `.button-link` (_buttons.scss:208), drop it from _brand.scss, and update the colors, interactive and usage docs and the section 42 Changelog/MIGRATION rows. The value is unchanged, so the controls.test.js link check (rgb 0,179,0) still holds.
  - *Skeptic:* The collision holds: - `color-classes(brand-color)` emits `.brand-color-link`, which reads `--brand-color`; - that class is in api/v0.6.19.json:118 and is documented at /styles/colors/:403; - the new token `--brand-color-link` (#00b300) is a different colour. Chrome, defaults: the class underline is rgb(0,255,78), a plain link's is rgb(0,179,0). Section 42 guarded only against `.brand-color-link-…
- **`nested-card-restores-library-defaults`** — confirmed, should-fix, effort M. *Where:* assets/css/modules/bricks/_cards.scss:84-112 (`:where(.card-inverted .card)`); the values it copies: typography/_fonts.scss:33-40, navigation/_links.scss:3-7, colors/_base.scss:23-26, charts/_index.scss
  - *What:* The light card inside a dark card 'restores' the text, link, border and chart role tokens by re-typing the library's own `:root` values (`--text-color-light: var(--gray-mid-dark)`, `--border-color: var(--gray)`, …). It does not return the page's actual values. A project that overrides any of these roles on `:root` loses its override inside `.card-inverted .card`.
  - *Fix:* The proposed fix works as written. Give the snapshot names a private prefix (for example `--_page-*`) so they do not read as public tokens. Rewrite tokens-contracts.test.js to check that the Sass list equals the set `.card-inverted` re-maps.
- **`sidenote-wide-blocks-ignore-grid`** — confirmed, should-fix, effort M. *Where:* assets/css/modules/typography/_notes.scss:67, 73-75, 146-159; typography/_text-content.scss:26-31, 38
  - *What:* Inside `.sidenote-wrapper` a wide block (`.highlight`, `.text-content-caption`, `.lead`, `.teaser-bottom`) is sized by the page token `width: var(--text-content-caption)`, not by its grid area. The new public token `--sidenote-wide-column` therefore sizes nothing. On a tablet the explicit width is wider than the 7-column area. The `1fr` (min auto) tracks grow to fit it and take the width from the note columns. The tablet rule `&:has(> wide) > .sidenote { width: auto; margin-left: var(--space-md) }` patches the symptom: a 16px gap, but on a note that is now even narrower. The same two-systems…
  - *Fix:* This fix removes the tablet hack and keeps the owner's desktop widths (tested): ```scss .sidenote-wrapper { grid-template-columns: repeat(9, minmax(0, 1fr)); } @include tablet-and-up /* width >= 769 */ { .sidenote-wrapper > :is(#{$sidenote-wide}) { width: min(var(--text-content-caption), 100% + var(--space-lg)); } } ``` Then delete _notes.scss:152-159. Results: - 900: tracks 57.66 ×9, note 120.7, gap 16; - 1300: block stays 569.3; - no page overflow at 375, 900 or 1300. Whether wide blocks should fill up to the note on desktop (745px, as the :146 comment says) is a separate design call for th…
- **`outdent-compensations-misaligned`** — confirmed, should-fix, effort M. *Where:* assets/css/modules/bricks/_panels.scss:57-72; typography/_tables.scss:83-87; the outdent amount itself, hand-written in typography/_text-content.scss:7,14,17-18,38,346,357, layout/_spacing.scss:66-72, bricks/_cards.scss:120-125, special/_collapsible.scss:6-11
  - *What:* Two new rules step content back in by 'the outdent', each with a hand copy of it, and both copies are wrong somewhere. (1) The caption panel copies the auto-width right outdent: `padding-right: min(var(--space-lg), var(--field-width) + var(--space-md))`. A `.text-content-caption` box has an explicit width, so its margin-right is ignored and it always hangs `--space-lg` to the right. (2) The table step-in `:is(:is(caption-boxes) table, table:is(caption-boxes)) :is(th, td):first-child { padding-left: var(--space-lg) }` has two problems: - it is a descendant selector at (0,2,2), so it stacks wit…
  - *Fix:* Minimal fix for this release: (a) In _panels.scss:58-61: ```scss &.text-content-caption { padding-inline: var(--space-lg); } ``` The right side mirrors the left, because the box always hangs `--space-lg`. Keep the mobile block. (b) In _tables.scss:85: ```scss :is(:is(#{$caption-boxes}):not(.panel, .card) > table, table:is(#{$caption-boxes})) > :is(thead, tbody, tfoot) > tr > :is(th, td):first-child { padding-left: var(--space-lg); @include mobile { padding-left: var(--space-sm); } } ``` The `--outdent` token can follow in the next release to collapse the hand copies.
- **`callout-fill-does-not-follow-role`** — partly, record-for-later, effort S. *Where:* assets/css/modules/typography/_text-content.scss:205-234; colors/_semantic.scss:40 (and the same pattern at bricks/_stats.scss:53-59, elements/_forms.scss:39-43)
  - *What:* A callout variant reads its stripe from the role, resolved on the element (`--callout-color: var(--success)`). It reads its fill from the twin resolved on `:root` (`--callout-bg: var(--success-bg)`). Re-map the role on a surface and one callout shows a new stripe on the old fill. `.callout-signal` uses the palette `--black` for its stripe, so on `.card-inverted` (#333) the stripe disappears while the callout's top and bottom rules re-map.
  - *Fix:* Only the signal stripe: ```scss .callout-signal { --callout-color: var(--primary-text-color); } ``` It is identical on light surfaces (`--primary-text-color` = `--primary-color` = `--black`), and on `.card-inverted` it follows to #ccc. Leave the role and `-bg` model alone unless the owner wants to drop the 'restate on a surface' contract. If so, a `semantic-tokens` mixin (like `chart.role-tokens`) is the way, not per-component mixing.
  - *Skeptic:* The main claim is the documented design, not a defect. - _semantic.scss:15-17: 'Aliases and twins are resolved here on `:root`: re-map a role on `:root` and they follow; on a surface, restate them too.' - Section 17 says the same: 'на отдельной поверхности переобъявить'. The measured mismatch (stripe rgb(0,128,128) on the unchanged #389e0d 25% fill under a surface-level `--success`) is exactly th…
- **`sidenote-row-bottom-edge-cascade`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/typography/_notes.scss:137-144 vs typography/_text-content.scss:125-145 (`.lead` margin-bottom :129, `.highlight` :138); order in typography/_index.scss
  - *What:* The rule 'the row owns its bottom edge' (`.sidenote-wrapper > :where(:not(.sidenote, :has(~ :not(.sidenote))))`) is (0,1,0). Its comment and section 13 say it sits in `:where()` 'so a margin utility on that block still decides'. The cascade does the opposite. Utilities are emitted first (layout is forwarded before typography), so they lose to it. `.lead` and `.highlight` are emitted after it (text-content follows notes), so they win over it.
  - *Fix:* As proposed. Fix the comment at _notes.scss:137-140 and the section 13 sentence ('в `:where()`, чтобы утилита margin на этом блоке решала'). A utility on that block cannot win until cascade layers (CSS-130), and that was already true before the change.
- **`submit-rule-breaks-forms-contract`** — partly, record-for-later, effort S. *Where:* assets/css/modules/elements/_forms.scss:351-354 vs the contract at :6-9
  - *What:* `:is(.form-group, .form-row) > :is([type="submit"], button:not([type]))` is (0,2,1): `:is()` takes its heaviest argument, `button:not([type])` = (0,1,1). It sets `align-self` and `margin-inline-start: auto` on the button. The module header promises 'Every rule stays at type specificity … so any class of the page's beats it'.
  - *Fix:* If the owner wants placement to be overridable, use the proposed (0,0,1) selector (tested: it still pushes right at 375 and 1300 and beats the `*` reset). Note that a left-aligned submit in a group or a stacked row also needs `align-self` overridden, and no utility exists for it. Narrow the header sentence to the element look.
  - *Skeptic:* The specificity holds: `:is(.form-group, .form-row) > :is([type=submit], button:not([type]))` is (0,2,1), and `.margin-l-0` loses. At 375 the button computes margin-left 237.4px. With the proposed selector rebuilt, it computes 0px. The failure as stated does not render differently, though. In a `.form-group`, and in a `.form-row` stacked on a phone, `align-self: flex-end` keeps the button at the…
- **`banner-tablet-column-collision`** — partly, record-for-later, effort S. *Where:* assets/css/modules/typography/_notes.scss:182-195 (tablet `--sidenote-column: 7 / span 3` on the banner) vs :73-75, 148-150
  - *What:* On a tablet the banner sets `--sidenote-column: 7 / span 3` on itself. That overlaps column 7 of the default wide column (`1 / span 7`). Because it is set on the banner, it also overrides whatever a consumer set on `:root` or on the wrapper, which is the documented way to move the columns (:69-71).
  - *Fix:* Zero specificity on the row, after the sidenote-wide fix: ```scss @include tablet { :where(.sidenote-wrapper:has(> .sidenote-banner)) { --sidenote-column: 7 / span 3; --sidenote-wide-column: var(--sidenote-text-column); } .sidenote.sidenote-banner { max-width: none; } } ``` A wrapper-level class from the consumer then wins. To let a `:root` override win as well, read a dedicated `--sidenote-banner-column` (tablet value on `:root`) in the banner's `grid-column`, with a fallback to `--sidenote-column`.
  - *Skeptic:* The collision holds. Chrome 900, `.highlight` plus `.sidenote-banner`: - the banner is at 7 / span 3, top 4px; - the highlight starts 48.3px below the wrapper top, pushed under the banner; - the horizontal 'gap' is −62.6px. Setting the token on the banner does override `:root` or wrapper tokens. Nothing on the site breaks today. The proposed fix is off in two ways: - `.sidenote-wrapper:has(> .sid…
- **`dead-and-redundant-rules`** — confirmed, record-for-later, effort S. *Where:* assets/css/modules/special/_collapsible.scss:73-77 and :79-100; bricks/_legend.scss:38-46; bricks/_cards.scss:232
  - *What:* Four rules are now dead, redundant or stale copies: (a) `.collapsible-content > .panel:not(.panel--flush) { padding: var(--space-md) }`, at (0,3,0), restates the base: since section 25, `.panel` is `--space-md` everywhere, and the caption step-in already excludes `.collapsible-content *`. (b) `button.legend__item:is(:hover, :active, :disabled, [aria-busy="true"])` repeats the reset for states the bare button rules hold at (0,0,1); `button.legend__item` (0,1,1) already wins in every state. This is the repetition the buttons contract (_buttons.scss:16-23) says components never need. (c) The col…
  - *Fix:* All four fixes as proposed. For (c), note one behaviour change: `blockquote`, `.teaser-bottom` and `.full-width-caption` inside a collapsible stop hanging into its padding. That is the stated intent of the family, but check the docs page once.

#### Lens: drift (14)

- **`brand-link-token-no-migration-row`** — confirmed, fix-before-release, effort S. *Where:* assets/css/modules/colors/_brand.scss:10-16; navigation/_links.scss:12,17; elements/_buttons.scss:158,160,208 vs assets/css/docs/MIGRATION.md:83,115 and Changelog.md:10-95
  - *What:* Links moved from --brand-color-dark to the new --brand-color-link, and --brand-color-dark changed from #00b300 to #3a8000. Neither Changelog v0.7.2 nor MIGRATION v0.7.2 says so. The MIGRATION intro still says 'Everything else is a visual refinement or a fix that needs no action'.
  - *Fix:* The MIGRATION row works, but swapping the roles avoids the break entirely. Keep `--brand-color-dark: #00b300` on the links, as in v0.7.1, so overriding sites keep their colour. Give the new darker shade its own token for its new job, e.g. `--brand-color-deep: #3a8000`, added to $brand_colors. Read it in .button-primary: `--button-bg-hover: var(--brand-color-deep); --button-bg-active: color-mix(in srgb, var(--brand-color-deep) 85%, black)`. Drop --brand-color-link. This also settles link-token-name-clash, and Changelog only needs an Added line. If the owner keeps the current design, add the pr…
- **`migration-rows-contradict-css`** — confirmed, fix-before-release, effort S. *Where:* assets/css/docs/MIGRATION.md:80,92,96,98,105,114,115 vs elements/_buttons.scss:64,67-68; elements/_forms.scss:55,198-246,271-276,308-311; typography/_text-content.scss:104-109,205-234; styles/typography/text-content/index.html:39
  - *What:* Seven statements in the v0.7.2 migration section describe the pre-hand-review draft, not the shipped CSS.
  - *Fix:* As proposed. Also fix the 'Was' column of row 3: v0.7.1 was already the #fafafa 32px pill. What actually changes is display block → inline-block, a #333 label at rest, the 9/7 padding, the white hover and the 0.15s fade, so 'breaking (visual)' mostly means the inline display.
- **`owner-changes-missing-from-changelog`** — confirmed, fix-before-release, effort M. *Where:* Changelog.md:10-95, MIGRATION.md:75-119 vs typography/_text-content.scss:38,50,160-162; typography/_notes.scss:67-76,148-193; typography/_lists.scss:21-22,54-55; typography/_headings.scss:29-36,49; navigation/_tags.scss:7,9; typography/_tables.scss:50-66,89-9…
  - *What:* The hand review changed existing v0.7.1 API that consumers already use. Neither the Changelog nor MIGRATION records it.
  - *Fix:* Under Changed, add one line each: --text-content-caption = measure + 2 × --space-lg (1300px: 640 → 569px); sidenote rows on tablet keep the grid, default columns 6+2 (tokens --sidenote-*-column), .lead/.teaser-bottom in the wide column, phone margin-note form, offset next to a wide block, rows spaced 16px; .list-title has no padding (use on <h5>); .index-list items have no margin; h2/h3 margins md/sm; h5/h6 in --primary-font; .tag padding 2px --space-sm, line-height 1.6; .table-terminal gap columns, .table-striped keeps row padding; .caption text spans the block; menu leading. Under Added: .s…
- **`button-primary-pressed-white-on-bright`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/elements/_buttons.scss:163-168 (vs :315-319)
  - *What:* The rule `.button-primary:is(:hover, :active, [aria-pressed="true"]):where(:not(...)) { color: var(--white) }` whitens the label of every pressed primary. Only `.button-group > [aria-pressed="true"]` darkens the fill. The comment says the label turns white 'on the dark fills (… a pressed toggle)'.
  - *Fix:* Keep the (0,2,0) weight that the specificity contract in the file header promises: `.button-primary:is(:hover, :active):where(:not(:disabled, [aria-disabled="true"], [aria-busy="true"])), :where(.button-group) > .button-primary[aria-pressed="true"]:where(:not(:disabled, [aria-disabled="true"], [aria-busy="true"])) { color: var(--white); }`. The proposed `.button-group > …` form weighs (0,3,0) and would outrank a page's `.button-primary.my-x` label rule. Moving the pressed-fill remap out of .button-group (the alternative) is a design change for every toggle, so do not do it.
- **`button-slot-defaults-described-wrong`** — confirmed, should-fix, effort S. *Where:* elements/_buttons.scss:29-38,49-50,67-68,88-89,130,146; bricks/_cards.scss:77; styles/interactive/buttons/index.html:21,143; assets/css/docs/STYLEGUIDE.md:44
  - *What:* The default button's slot fallbacks are documented as --white and --primary-color, but at rest the code uses --gray-lightest and --gray-dark. Several places also say 'a variant only sets colour slots', which is no longer true.
  - *Fix:* As proposed. Write the slot table as two columns, rest and hover fallback, so the asymmetry is explicit.
- **`panel-caption-right-padding-wrong-on-tablet`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/bricks/_panels.scss:49-61 (copies typography/_text-content.scss:14; token :38, mixin :26-31)
  - *What:* `.panel.text-content-caption { padding-right: min(var(--space-lg), var(--field-width) + var(--space-md)) }` copies the outdent mixin's right margin. But a caption-width block has an explicit width, `--text-content-caption` = measure + 2 × --space-lg. Its margin-right is over-constrained and ignored, so the block always overhangs the text column by 32px on the right.
  - *Fix:* `&.text-content-caption { padding-inline: var(--space-lg); }` and drop 'the right side only as far as the room there' from the comment. Do not move the min() into the token: that changes every caption-width block on tablets, which §15 did not decide.
- **`outdent-compensation-two-copies`** — confirmed, should-fix, effort M. *Where:* typography/_tables.scss:76-87; bricks/_panels.scss:49-73; bricks/_contain-outdents.scss:12-18; utilities/_print.scss (`#{co.$outdents}` fold-back)
  - *What:* Two hand-written copies step content back in by the outdent: the table's first column and the panel. Neither follows the outdent when it changes. The table copy ignores the phone outdent, containment and print. The panel copy ignores print.
  - *Fix:* Publish the step once, but account for custom-property inheritance, or the proposed fix keeps the double inset. Set `--outdent-start: var(--space-lg)` on the three caption boxes (`--space-sm` under mobile), and `--outdent-start: 0` in the contain-outdents mixin and in the print fold-back. The panel rule becomes `padding-left: max(var(--space-md), var(--outdent-start, 0))`, plus `.panel > * { --outdent-start: 0 }` so content that is already stepped in does not add it again. The table rule becomes `:is(th, td):first-child { padding-left: var(--outdent-start, 0) }` under the existing `$caption-b…
- **`sidenote-row-gap-only-in-article`** — confirmed, should-fix, effort S. *Where:* typography/_notes.scss:137-144 vs typography/_text-content.scss:104-109
  - *What:* The rows' bottom margin is now zeroed in every `.sidenote-wrapper` (`> :where(:not(.sidenote, :has(~ :not(.sidenote))))` and its `:last-child`). The 16px gap that replaces it only exists for direct children of `article` and `article > section`.
  - *Fix:* As proposed: limit the zeroing to the contexts the flow rule covers, `:where(article, article > section) > .sidenote-wrapper > :where(…)`, written outside the `.sidenote-wrapper` nesting with the rd-gate inventory key updated. Reword the comment to name those contexts.
- **`changelog-signal-series-claims`** — confirmed, should-fix, effort S. *Where:* assets/css/docs/Changelog.md:52,60 vs charts/_index.scss:23-28, assets/charts/src/core/theme.js:36-43, colors/_semantic.scss:25-28, typography/_text-content.scss:216-219, styles/colors/chart-tokens/index.html:14
  - *What:* The Changelog still describes --signal and the series before §34 and §43. A docs page and a module comment do the same.
  - *Fix:* Changelog:52 → 'six series: --signal, orange, then RareCharts' green, yellow, violet, red; series 1–2 differ from RareCharts' own palette until its RC-014 (0.9.8_7)'. Changelog:60 → '--signal: technical information, the main chart colour and the focus ring (blue, no visual change); the primary button is on --brand-color'. _semantic.scss:25-26: drop 'an info notice'. chart-tokens :14 → 'most defaults point at a library token; three series keep RareCharts' own hues'.
- **`backlog-done-rows-describe-unshipped`** — partly, record-for-later, effort S. *Where:* _internal_docs/styles/BACKLOG.md:92,93,140,141,167,168,173,201,231
  - *What:* Milestone decisions and Done rows still describe what the hand review undid. The new CSS-388 row, added in f737e5e during this review, adds a false claim of its own.
  - *Fix:* In the same documentation pass: correct the CSS-388 sentence ('tablet keeps the grid, the phone form under `mobile`; `below-desktop` added unused, kept for dashboards') and the two decision lines :92 and :93. Add a short 'amended by CSS-388' note to the five Done rows instead of rewriting them.
  - *Skeptic:* Holds: - CSS-388 (:201, written in f737e5e during this review) says sidenotes are 'on the new below-desktop mixin'. `git grep below-desktop` finds only its definition (_breakpoints.scss:28): §4 moved the sidenotes to `mobile`. - The milestone decisions are meant to be current and are stale: :92 says the series match RareCharts, :93 says --color-danger. - Exit criterion :232 (not :231) says button…
- **`consumer-verification-predates-hand-review`** — confirmed, fix-before-release, effort M. *Where:* assets/css/docs/MIGRATION.md:121-160; _internal_docs/styles/BACKLOG.md:233
  - *What:* The 'Live consumers — v0.7.2 candidate, verified 2026-10-27' table and its per-site checklists were measured on the candidate before dbf02a10. They still say 'No library regression. Every difference is an intended change'.
  - *Fix:* At minimum, re-date the verdicts ('verified on b8cde21, before the hand review dbf02a10'). Add the --brand-color-dark/link step for schnellreich.ru and Churchbook (unless the role swap in brand-link-token-no-migration-row is taken), plus the §11 and §15 clean-up steps. Better: re-run the box and computed-style diff on the current candidate.
- **`link-token-name-clash`** — confirmed, should-fix, effort S. *Where:* assets/css/modules/colors/_brand.scss:14-23; colors/_color-classes.scss:15-21 (compiled rare.css:18299-18302); navigation/_links.scss:3-7
  - *What:* The new token --brand-color-link (#00b300) shares its name with the existing utility class .brand-color-link. color-classes generates that class for `brand-color`, and it reads var(--brand-color) (#00ff4e). The token's own comment admits it was kept out of $brand_colors to avoid `.brand-color-link-link`.
  - *Fix:* Do not create the token at all. Swap the roles instead: links stay on --brand-color-dark (#00b300, unchanged from v0.7.1), and the button's darker shade gets a new name, e.g. --brand-color-deep: #3a8000, added to $brand_colors with no clash. That removes the clash and the schnellreich.ru/Churchbook link break in one step. If the owner keeps links on their own token, the proposed `--link-underline-color` in _links.scss is the right place.
- **`sidenote-tokens-defeated`** — confirmed, record-for-later, effort S. *Where:* typography/_notes.scss:69-76 (contract), :99 (max-width), :187-193 (banner)
  - *What:* The column tokens are documented as 'A consumer moves them with these tokens, on :root or on one wrapper'. Two rules defeat that. `.sidenote` keeps `max-width: calc(2 * var(--global-fr))`, which caps any wider --sidenote-column. On tablets the banner writes `--sidenote-column: 7 / span 3` on itself, overriding a wrapper or :root value. The banner's own `max-width: none` is the workaround for the first rule.
  - *Fix:* As proposed. The minimum is `.sidenote-wrapper > .sidenote-banner { grid-column: var(--sidenote-banner-column, var(--sidenote-column)) }` with `--sidenote-banner-column: 7 / span 3` on :root under tablet, plus a `--sidenote-max-width` token for the cap.
- **`field-button-height-coupling-docs`** — confirmed, record-for-later, effort S. *Where:* styles/interactive/forms/index.html:143-144; elements/_forms.scss:15-16,36,38-39,55,284-302; elements/_buttons.scss:62
  - *What:* The forms docs say '--field-padding-y … follows the button so the heights match'. Since §34 the field and the button are independent literals that happen to match, with the ±1px optical shift written out separately in each. The `::file-selector-button` comment says 'The small button (.button-sm)', but its rules are a hand copy of .button-sm's values and of the default button's hover. The `--field-accent` comment says 'Checked boxes and radios', but it also drives the focus frame.
  - *Fix:* Docs :143 → '-y: var(--space-sm), the same as the button's default padding: change both together'. _forms.scss:15-16 → 'match at the default values; they are not linked'. :284 → 'sized like .button-sm (values repeated: a pseudo-element cannot take a class)'. :38 → 'Checked boxes and radios, and the focused frame'. Record in the backlog a later shared control-height token (e.g. --control-padding-y) if 'One height' must survive overrides.

### Appendix B — every finding of the styles–charts pair check (verbatim summaries)

#### runtime pairing (v0.7.2 with RareCharts 0.9.8_6)

- **Sidenote chart at tablet widths** — blocker-for-corelease. *Where:* /charts/ (charts/index.md:75-79, #bar-chart-understanding in .sidenote); Rare Styles typography/_notes.scss (manual_updates_0_7_2.md section 4: tablet keeps the sidenote column; section 5: column tokens 8 / span 2)
  - *What:* (c) Rare Styles regression. At 769–1023 px the sidenote no longer stacks, so the RareCharts demo inside it shrinks from full width to a 104 px column. The title ellipsizes ('UNDERSTAN…'), so does the source ('Source: Rare D…'), and the bar value labels are cut off. The v0.7.2 exit criterion ('/charts/ sidenote demo at 1440 and 375 px', ticked 2026-10-27) predates this hand edit and never covered tablet widths.
  - *Action:* Rare Styles, before release: a sidenote holding an embedded component keeps the stacked (mobile) form below desktop, e.g. `.sidenote-wrapper:has(> .sidenote .rc-chart)` stays stacked until the desktop breakpoint. Or the owner accepts it and the RareCharts docs move this demo out of the sidenote (RC-029 'Re-check the sidenote demos'). Either way, re-run the /charts/ sidenote check at 1440 / 800 / 375 and add 800 px to the exit criterion and to RC-028's acceptance.
- **Sidenote chart at phone widths: mixed alignment** — blocker-for-corelease. *Where:* /charts/ #bar-chart-understanding at ≤768 px; Rare Styles _notes.scss mixin margin-note-stacked (`text-align: right` on `.sidenote-wrapper > .sidenote`, manual section 5); rare-charts.css sets no text-align on .rc-chart
  - *What:* (c) A new leak from the mobile sidenote form into an embedded chart. The chart title and subtitle inherit text-align: right, while the source line stays left, so the chart reads half right-aligned and half left-aligned. It is the same family of defect as CSS-372: a typographic rule reaching into nested components.
  - *Action:* Fix on either side in the co-release. Rare Styles: exclude embedded components from the right alignment, e.g. `.sidenote-wrapper > .sidenote :where(.rc-chart, .panel, table) { text-align: start }`, or align only text children. Or RareCharts, as a K-15-style host-independence rule not yet in the backlog: `.rc-chart { text-align: start }`, so no host alignment leaks in (C-13). Add the case to the CSS-372 sidenote fixture.
- **0.9.8_7 on Rare Styles v0.7.1: section H guards** — needed-for-pickup. *Where:* _internal_docs/charts/BACKLOG.md section H: RC-028 (delete the three-class header placement) and RC-032 (G1–G6 'not needed against the new Rare Styles'); X-08 hostile-host fixture; rare-charts.css:39/131-134 (RC-028), 2…
  - *What:* (a) Both RC-028 and RC-032 judge the guards only against v0.7.2. My simulation removed RC-028 and G1–G6 from the injected sheet: - on v0.7.2: no change at rest or on hover at either width, which confirms CSS-381; - on v0.7.1: visible breakage. Live consumers still pin v0.7.1 (schnellreich.ru, raredigits.io). If 0.9.8_7 drops these guards, a consumer who bumps only RareCharts gets broken sidenote charts and button chrome.
  - *Action:* RareCharts 0.9.8_7: either keep RC-028 and G1/G3/G4/G6 while v0.7.1 is a supported host, or state 'Rare Styles ≥ v0.7.2' in the CHANGELOG, README and /charts/installation/. Add the published v0.7.1 rare.css as one of the X-08 hostile hosts, so RC-032 decides against both versions. Record this in RC-028 and RC-032; it is missing from the backlog today.
- **RC-054 interactive legend vs host button rules** — needed-for-pickup. *Where:* _internal_docs/charts/BACKLOG.md D-04 / RC-054 (legend toggles in every class); rare-charts.css .rc-legend-item (272-278, single class, no button reset)
  - *What:* (a) Missing from the plan. If RC-054 renders legend items as `<button class="rc-legend-item">`: - on v0.7.1 they become grey pills, because the host's button and button:hover rules reach inside .rc-chart; - on v0.7.2 they get the raw browser look, because Rare Styles now stops at .rc-chart. RC-054 specifies the CSS-178 swatch contract but no host-button reset.
  - *Action:* D-04/RC-054: give the toggle class a full reset (appearance, border, background, padding, radius, font, line-height) at doubled-class specificity, including :hover and :active (the G1 pattern). Test it in the X-08 fixture on v0.7.1, on v0.7.2 and on a bare page, and add it to S-16.
- **Plot heights after the panel recipe (RC-058)** — needed-for-pickup. *Where:* _internal_docs/charts/BACKLOG.md RC-058; charts/line/time-series/index.md (panel wraps the TimeSeries); assets/charts/examples/line/line-chart-time-series.js
  - *What:* (a) Confirmed: exactly 22 charts lose the frame's 34 px, plus 2.8 px with a source line (see the K-15 finding). They are the 22 files RC-058 lists, but its header says '23 docs charts'. Three things are not in RC-058: - TimeSeries at phone width loses 38 px of plot: the panel takes 26 px of width and the six range buttons wrap to two rows. - Graph losses differ by width: −20 px at 1440 (the freed subtitle now fits on one line), but −37 to −61 px at 375. +34 does not fully restore ego (−61) or columbus (−53.6) on phones. - Dual-axes at 375 drops to MIN_PLOT_HEIGHT, so the card grows 380 → 386…
  - *Action:* RareCharts docs (RC-058): - correct '23' to 22; - add the TimeSeries phone case (more height, fewer presets on phones, or a flush panel around the chart); - note that the Graph demos stay shorter at 375 after +34; - ship RC-058 in the same push as the v0.7.2 docs migration, so the docs never show 34 px-short plots.
- **Source line leading (K-15) and the +34 arithmetic** — needed-for-pickup. *Where:* rare-charts.css .rc-chart-source (no own line-height); Rare Styles CSS-375 and CSS-379; _internal_docs/charts/BACKLOG.md K-15 and RC-058
  - *What:* (a)+(b) Confirmed: since CSS-379 and CSS-375 the source line inherits 1.5 (21 px) instead of the cite rule's 1.3em (18.2 px). Every chart with a source line therefore has a plot 2.8 px shorter, including charts whose frame did not move. RC-058's +34 restores the old plot height only if K-15 pins the source at 1.3.
  - *Action:* K-15: set `.rc-chart-source { line-height: 1.3 }`, which restores 18.2 px on any host, so the RC-058 +34 is exact. Otherwise add +3 to every RC-058 height for charts that show a source.
- **Inherited line-heights in chart chrome (K-15 scope)** — nice-to-have. *Where:* _internal_docs/charts/BACKLOG.md K-15 (text says these 'inherit 24px on Rare Styles pages'); rare-charts.css tooltip rows, .rc-graph-tools, .rc-chart-controls labels, .rc-multichart-cell-title, header
  - *What:* (b) An intended Rare Styles change (CSS-375). On v0.7.2 the chrome inherits 1.5 × its own font size. So today the same chart has three looks: 24 px on v0.7.1, 1.5× on v0.7.2, 'normal' on a bare page. K-15's text predates this. K-15 also leaves the header (title, subtitle, legend) out, and the header follows the host too: inside a sidenote the title takes 1.4 (22.4 px).
  - *Action:* K-15: update its text with the v0.7.2 numbers. Pin line-heights on tooltip rows, controls, Graph tools and notes, the overflow rows, cell titles and the header (title, subtitle, legend), so v0.7.1, v0.7.2 and bare pages match. Optionally add one line to Rare Styles MIGRATION row 14 noting that RareCharts ≤ 0.9.8_6 tooltips and controls tighten.
- **Light-theme chart on .card-inverted (RC-014 acceptance)** — nice-to-have. *Where:* rare-charts.css:82 (header, legend and source read --primary-color), 789-807 (range buttons read --border-color, --text-color-light, --white, --primary-*), theme.js literals; Rare Styles .card-inverted chart-token remap…
  - *What:* (b), documented. With 0.9.8_6, v0.7.2's .card-inverted remaps --border-color, so range and Lin/Log frames fall from 7.9:1 to 2.2:1, as MIGRATION row 22 says. Everything else is poor on both versions: header text, the active timeframe, ticks and plates. Only RC-014 reading the v0.7.2 --chart-* tokens fixes this. On v0.7.1 the planned fallback chain keeps today's look, by design.
  - *Action:* Add to RC-014's acceptance: a light-theme chart on a v0.7.2 .card-inverted (header, legend, source, ticks, range, active and Lin/Log at 4.5:1 for text and 3:1 for frames; plates equal to the surface), and the same chart on v0.7.1 and on a bare page unchanged. Make sure rare-charts.css:82 moves to --chart-text-color in the chain.
- **Section 44 palette: #00aaff outside theme.colors** — needed-for-pickup. *Where:* assets/charts/src/core/theme.js (accent, colors[1], map.matchFill), assets/charts/src/charts/Map.js (2), assets/charts/src/charts/presets/linkPresets.js (5); 17 example scripts in assets/charts/examples; 26 places in ch…
  - *What:* (a), partly missing. RC-014 records the decision: --chart-series-1 = --signal, #00aaff dropped, accent read from series-1. But #00aaff stays as map.matchFill, in linkPresets and as an explicit colour in most docs demos. After 0.9.8_7, default-palette charts will draw #1677ff next to demos hard-coded to #00aaff on the same pages — the two blues the owner called too close to sit together. Section 44 also asks to update test/circular.test.js PALETTE and the docs pages that show the palette; neither is in the backlog.
  - *Action:* RareCharts 0.9.8_7: extend the RC-014 bullet (or add a task next to it): - decide map.matchFill and linkPresets; - recolour the examples and docs that hard-code #00aaff, or record why they keep it; - update test/circular.test.js PALETTE; - regenerate the palette tables on /charts/styles/ (RC-040).
- **Intended Rare Styles changes seen on the charts pages** — info. *Where:* All /charts/** pages, /styles/bricks/panels/, /examples/charts/btc-mining-analysis/, kb post
  - *What:* (b) Intended, no action for the pair: - --text-content-caption narrowed (manual section 15): plots are 83 px narrower at 1440 and 32 px wider at 375 (panel 16 px). - The frame is on the chart element. - Frames on /charts/, /charts/combined/ and the three MultiCharts lost the #fafafa card fill. Label plates (var(--bg-color) #f0f0f0) now match the surface; on the #fafafa card they used to show as grey boxes. - Prose measure freed (CSS-374/384): subtitles, notes and the flow details dl/p/kind run full width, and Graph subtitles fit on one line. - Gauge titles centred → start, and the 2-up gauge…
  - *Action:* RareCharts backlog: mark the RC-029 parts done by the v0.7.2 docs migration (row class, phone stacking, gauge title alignment = start) and the dead black-bg from RC-031. No Rare Styles action.
- **One-sided bump: Rare Styles v0.7.2 with RareCharts 0.9.8_6 and old consumer markup** — info. *Where:* main's HTML served with branch rare.css (variant main-css072); MIGRATION rows 1, 2, 10, 13, 22
  - *What:* (b) Documented breaking change. A consumer who swaps only rare.css loses every .card-dashboard-bordered frame and the .card-row-bordered dividers, because the classes are removed with no alias. Otherwise their charts behave as on the docs. A consumer who renames 1:1 as MIGRATION row 1 says keeps the frame on the wrapper and loses no plot height. Only the docs' frame-on-chart recipe costs the 34 px, and the /styles/bricks/panels/ page says the height includes the frame. RareCharts ≤ 0.9.8_5 with v0.7.2 breaks the source line (bare cite, MIGRATION row 13).
  - *Action:* Docs only. On /charts/settings/ (controls option), suggest `.button .button-sm` for page buttons in the controls row. Content-starter (O-12): when its rare-styles pin moves to v0.7.2, move rare-charts in the same change; it pins v0.7.1 + v0.9.8_5 today.
- **Pairing statement and RC-014 bullet accuracy** — nice-to-have. *Where:* charts/installation/index.md:183-191 ('Fonts and Rare Styles'); _internal_docs/charts/BACKLOG.md RC-014 bullet on the Graph '+N more' items
  - *What:* (a) Two docs gaps. /charts/installation/ never says which Rare Styles versions pair with which RareCharts: tokens from v0.7.2; fallbacks on v0.7.1 and bare pages; any v0.7.2 minimum section H introduces. RC-014's bullet says the '+N more' items 'are now inline-block'. They are flex-column items (blockified) on both versions, so that has no visible effect. The real changes are row height 36 → 30 px (K-15) and the close button's radius 32 → 0.
  - *Action:* RareCharts docs (RC-042/RC-041): add a short compatibility note under 'Fonts and Rare Styles'. Correct the RC-014 '+N more' bullet.

#### contract, plan and mechanics

- **Release mechanics / size baseline** — blocker-for-corelease. *Where:* assets/css/docs/SIZE-BASELINE.md:25; test/size-baseline.test.js:13; scripts/size-report.mjs:22,35; .github/workflows/{release-css.yml,sync-charts.yml,deploy.yml}
  - *What:* The v0.7.2 size row names commit b8cde21, which exists only on the unpushed local branch. If the release is squashed into main (the RareCharts convention), b8cde21 is unreachable in CI. `git show b8cde21:…` then fails in test/size-baseline.test.js, which runs in `vitest run` in all three workflows, and again in `size-report --check` in release-css. The row is also stale: the hand review (dbf02a1) grew the artifact, but the Changelog size line still shows 447,443 / 39,345 / 25,980 B.
  - *Action:* Rare Styles side, before the push: land v0.7.2 by a real merge (PR merge, as for v0.7.0 and v0.7.1) so b8cde21 stays reachable, or replace the row with one measured at a commit that will be on main. Update the Changelog bundle line to the final artifact. In a clone of main plus the release commits, run `npx vitest run test/size-baseline.test.js` and `node scripts/size-report.mjs --check`.
- **Coupling contract / RC-014 is the pickup** — blocker-for-corelease. *Where:* styles/colors/chart-tokens/index.html:15,107; styles/bricks/cards/index.html:31; styles/bricks/panels/index.html:15; styles/colors/index.md:287,293; assets/css/docs/Changelog.md:58,75; assets/css/docs/MIGRATION.md:111 (…
  - *What:* Rare Styles' published docs, Changelog and MIGRATION, and an SCSS comment that ships in the artifact, promise that RareCharts 0.9.8_7 reads the --chart-* tokens: label plates follow --surface-current, and range buttons are fixed on .card-inverted. RareCharts 0.9.8_6 reads none of the 26 names. A co-release whose charts side lacks RC-014 makes these statements false, under a tag that cannot change.
  - *Action:* RareCharts: RC-014 (the --chart-* chain with today's six tokens and literals as fallbacks) is the core of the co-release slice. If the coupling release is not named 0.9.8_7, the Rare Styles side must rewrite these 10 spots before the tag.
- **Palette / accent decision (manual_updates §43–44, RC-014)** — needed-for-pickup. *Where:* assets/charts/src/core/theme.js:32,36-43,65,99; assets/charts/src/charts/Map.js:304; assets/charts/src/charts/presets/linkPresets.js:25,39,50,62,76; assets/charts/src/charts/Donut.js:242,589; test/circular.test.js:148-1…
  - *What:* The decision 'accent and series 1 = --signal #1677ff, drop #00aaff' leaves sub-decisions that the co-release forces and that the plan does not record: (a) darkTheme sets accent #ff6200 but inherits defaultTheme.colors, so a dark single series is orange while a dark multi-series chart starts blue. (b) theme.map.matchFill stays #00aaff, the dropped light blue. Map uses tm.matchFill before accent. (c) Five linkPresets and about 20 docs examples hard-code #00aaff, which will now sit next to the default #1677ff. (d) Donut's K-22 rule sends a legend item with no slice 'back to the accent'. With acc…
  - *Action:* RareCharts: decide (a) to (e) before the slice, record them in RC-014, list the palette reorder and the standalone change as visible changes in the CHANGELOG and the exit criteria. Rare Styles side: reword chart-tokens line 15 to match.
- **RC-014 design: var() chains in JS** — needed-for-pickup. *Where:* assets/charts/src/charts/Map.js:322-330; assets/charts/src/charts/TimeSeries.js:292,424; assets/charts/src/charts/Sankey.js:266-267; assets/charts/src/core/renderHelpers.js:302; test/map.test.js:102,111
  - *What:* If theme values become strings like 'var(--chart-series-1, #1677ff)', the JavaScript that does maths on colours breaks quietly: - Map's hover brighten calls d3.hsl(fill), gets NaN for var() and returns the fill unchanged, so the hover feedback disappears. - The public tooltipFormat and points payload `color` would hand consumers a var() string instead of a hex value. - Many SVG presentation attributes (fill, stroke, stop-color) would carry var(). Today only theme.bg does.
  - *Action:* RareCharts: choose one strategy in RC-014. Either resolve the chain to concrete colours per render via getComputedStyle on the container (re-render on surface change), or keep var() in attributes and use the literal fallback for JS maths and callback payloads. Check var() in presentation attributes in Firefox and Safari.
- **RC-014 coverage gaps in rare-charts.css** — needed-for-pickup. *Where:* assets/charts/rare-charts.css:79-83,386,789-807,932; assets/charts/src/graph/chrome.js:162
  - *What:* Four page-token reads that RC-014 must also switch: - Header, subtitle, legend and source text read var(--primary-color). Rare Styles keeps --primary-color black inside .card-inverted on purpose, so HTML legend labels with no theme colour are black on #333. - The range hover border reads --primary-color, black on the dark card. - The full-screen overlay paints var(--bg-color) instead of the chart surface. - The Graph overflow panel uses #fff and --primary-color. RC-014 lists only theme.bg and the six fallback names.
  - *Action:* RareCharts: map text to --chart-text-color, hover and active borders to --chart-control-hover-border, and the full-screen background to --chart-bg, each with today's token and literal as fallbacks. test/charts-css.test.js already enforces the fallbacks (C-13).
- **Docs heights (RC-058) and the site deploy** — needed-for-pickup. *Where:* charts/**/*.md (migrated on the branch by CSS-183a); assets/charts/examples/** (23 charts listed in _internal_docs/charts/BACKLOG.md:215); test/browser/panels.test.js:110-128; assets/css/rare-website.css:110-118
  - *What:* The Rare Styles branch already moved 23 docs charts into a .panel.panel--bordered frame on the chart element. RareCharts counts that padding and border inside `height`, so their plots are 34px shorter. The site deploys from the same push, so raredigits.art would ship the shorter charts unless RC-058's +34 heights are in the same push. The same task re-marks the four 'Experimental' notices (now `card bordered …`) as .callout-warning, and the TimeSeries KPI row with .stat (deleting the site-only .price-chart-stat*).
  - *Action:* RareCharts: put RC-058 in the charts commit of the co-release. The examples are charts files; the rare-website.css cleanup is charts-docs site CSS.
- **Label clipping (RC-060) vs the v0.7.2 panel docs** — needed-for-pickup. *Where:* styles/bricks/panels/index.html:155; charts/circular/index.md:106-116,158-165; assets/charts/rare-charts.css:36 (.rc-chart overflow:hidden); _internal_docs/charts/BACKLOG.md:216
  - *What:* Rare Styles v0.7.2 now recommends unframed charts in a sidenote and in a .panel__row cell, and dashboards put charts in .panel__body. In each case the chart element has no padding, so .rc-chart { overflow: hidden } cuts axis and slice labels by 11–24 px. The behaviour predates v0.7.2, but the new docs promote these placements; the docs gauges already sit unpadded in .panel__row-item.
  - *Action:* Choose one: include RC-060 (M) in the co-release slice, or add a caveat on /styles/bricks/panels/ (Rare Styles side, before the tag) and keep RC-060 in 0.9.8_7.
- **Line-height after CSS-375/379 (part of K-15)** — needed-for-pickup. *Where:* assets/charts/rare-charts.css:470-490 (tooltip, 'No line-height'), .rc-chart-source; assets/charts/src/core/Chart.js:485 (footerH); test/charts-css.test.js:244; _internal_docs/charts/BACKLOG.md:106
  - *What:* With v0.7.2 alone, RareCharts changes look on Rare Styles pages: - The source line no longer gets 1.3 from `cite`, so it grows from 18 to 21 px per line, and footerH comes out of the plot height. - Tooltip rows inherit a unitless 1.5 (19.5 px at 13 px) instead of a fixed 24 px.
  - *Action:* RareCharts: in the slice, set the source line's own line-height, and decide the tooltip's (S). The rest of K-15 (Fira in tooltips, size tokens) can stay in 0.9.8_7.
- **Section H guards vs version skew (RC-028, RC-032, X-08)** — needed-for-pickup. *Where:* _internal_docs/charts/BACKLOG.md:213,217,184; assets/charts/rare-charts.css:279-307 (G1 doubled-class guards); assets/css/docs/MIGRATION.md:127-129 (consumer pins)
  - *What:* CSS-381 showed guards G1–G6 are not needed against v0.7.2, and CSS-372 makes RC-028's sidenote header guard redundant. But consumers bump pins one at a time: schnellreich.ru is on v0.7.1 with charts v0.9.8_2, raredigits.io on v0.7.1 with v0.9.7, Churchbook unpinned with v0.9.4_4. RareCharts 0.9.8_7 on a v0.7.1 page meets the old `button:hover` backgrounds, display:block buttons and the CSS-372 sidenote bug again.
  - *Action:* RareCharts: keep G1–G5 and treat Rare Styles v0.7.1 as a hostile host in X-08. Either keep RC-028's guard one more release, or state in the CHANGELOG and MIGRATION that a chart in a sidenote needs Rare Styles v0.7.2 or later. Record RC-032's reasons (S).
- **Rare Styles release docs about the pairing** — needed-for-pickup. *Where:* assets/css/docs/Changelog.md:52; assets/css/docs/MIGRATION.md (no series row; checklists at :137,:148,:159); manual_updates_0_7_2.md:994-995
  - *What:* Four places in the release docs need updating: - The Changelog still says 'six series in RareCharts' palette'. Since section 43, series 1 is --signal and RareCharts' #00aaff is dropped. - The section 43 task (a Changelog and MIGRATION row for the series order) is not done. - The per-site upgrade checklists tell consumers to bump rare-charts to v0.9.8_6, which reads no --chart-*, so following them gives no pickup. - They do not warn about the palette reorder consumers will see when they bump charts.
  - *Action:* Rare Styles side, before the tag: fix the Changelog line, add the series-order row, and point the checklists at the co-released charts version with a note on the visible palette change. Bump both pins in one commit per site.
- **Version name of a coupling release** — needed-for-pickup. *Where:* charts/backlog/index.md:165 ('Targeted for v0.9.8_7'); the 10 Rare Styles '0.9.8_7' spots above; _internal_docs/charts/BACKLOG.md:45-75; memory: donor slot 0.9.8_7
  - *What:* Option (b) needs a name: - '0.9.8_7' keeps the Rare Styles docs true, but TimeSeries Analytics (the donor's slot, public backlog 'Targeted for v0.9.8_7') moves to 0.9.8_8, and the milestone, exit criteria and public page need retargeting. - '0.9.8_6_1' (patch naming, as in 0.9.8_5_1) keeps the plan but forces a rewrite of 10 Rare Styles spots before an immutable tag.
  - *Action:* Owner decision, taken together with (a), (b) or (c).
- **RareCharts docs that RC-014/§44 make false** — needed-for-pickup. *Where:* charts/styles/index.md:22,43,58-65,91,114,182,191,249,258; charts/map/index.md:135
  - *What:* /charts/styles/ says 'Chart colors are not in CSS. This is intentional.', lists the Rare Styles colours read (--primary-color …), shows theme.bg as var(--bg-color, #ffffff), and shows the orange/#00aaff palette, accent #00aaff and matchFill #00aaff. All of these change with RC-014 and section 44. RC-040 (regenerate the tables) is scoped after K-14/K-15, which are outside the slice.
  - *Action:* RareCharts: rewrite these parts in the slice (S): the token chain and precedence, the new palette and accent, the matchFill decision. The full RC-040 table regeneration can wait for K-14/K-15.
- **Rare Styles tests that check RareCharts** — needed-for-pickup. *Where:* test/browser/charts-rd-host.test.js:64-72,103-117,127-140; test/browser/fixtures/charts-rd-host.html; test/browser/panels.test.js:110-128; test/browser/reference-pages.test.js:180-217; test/browser/tokens.test.js:26-35
  - *What:* In the co-release push, release-css runs these Rare Styles browser tests on the 0.9.8_x bundle, and any failure blocks the Rare Styles tag: - charts-rd-host (CSS-381) selects `.rc-range-btn:not(.active)`, `.rc-graph-legend-item`, `.rc-graph-breadcrumbs button` and `.rc-graph-tools button`. It asserts counts (range 4, scale 1, breadcrumbs 2, tools ≥3) and the resting look (#ccc 1px border, 4px radius, 8/16 padding, transparent). K-06 (.is-active, .rc-legend-toggle), D-04 (one legend builder) and X-11 (tool classes) touch exactly these. - RC-054's new legend buttons and RC-003's date inputs ins…
  - *Action:* RareCharts: keep the K-06 aliases so these stay green. When classes or controls change, update the fixture selectors and add targets in the charts commit, as RareCharts DOM-contract changes rather than Rare Styles fixes.
- **Branch base for the charts release** — needed-for-pickup. *Where:* _internal_docs/charts/BACKLOG.md:63-65 ('Branch timeseries-analytics-v0.9.8_7, cut from main'); memory workflow-worktree-base
  - *What:* For any co-release the charts branch must start from the v0.7.2 tip (f737e5e or the final Rare Styles commit), not from main (3cc0635). Its docs heights, guard checks and the CSS-381 tests all assume v0.7.2. Workflow worktree agents start from main by default, so they will drift.
  - *Action:* RareCharts: cut the slice or 0.9.8_7 branch from the Rare Styles tip, and tell implementer agents to `git reset --hard <tip>` (per the memory note).
- **Release mechanics: one push, two commits (proposal)** — info. *Where:* .github/workflows/release-css.yml:22-44; .github/workflows/sync-charts.yml:9-17; memory rarecharts-v0986-release-state (release-commit rules)
  - *What:* A layout that respects your rules: 1. Commit A, Rare Styles v0.7.2: assets/css/**, _data/versions.js, package.json and the lock file, styles/**, the CSS-183a charts docs migration, Rare Styles tests and fixtures, the site header fix, internal docs. Brought in by a real merge (or with the size row re-pointed). It touches nothing under assets/charts (verified). 2. Commit B, RareCharts: a squash from a branch cut from A. assets/charts/** (src, rare-charts.css, examples, data), version.json, the charts CHANGELOG, charts/** docs, charts tests, the charts-docs site CSS in rare-website.css. No asset…
  - *Action:* Owner: approve the layout and whether A lands as a merge or a squash. After the tags, bump consumers' rare-styles and rare-charts pins in the same commit per site.
- **CI on one push: triggers, order, coupling** — info. *Where:* .github/workflows/release-css.yml:42-44,92-130; .github/workflows/sync-charts.yml:21-88; .github/workflows/deploy.yml:11,27,38-52
  - *What:* What the push runs: - Three workflows run in parallel on the final commit. Only release-css has a concurrency group (release-rare-styles); the two release jobs push to different repos, so they do not conflict. - All three run the full unit suite. release-css also builds the whole site and the 0.9.8_x bundle and runs the browser suite (including the RareCharts browser tests, which CI otherwise runs only when Rare Styles releases), links and size. - Tag order: rare-charts first (install, unit tests, charts:build, push tag), then rare-styles (verify, publish, then the jsDelivr byte check). - dep…
  - *Action:* None required. Watch the three runs, and expect rare-charts to tag before rare-styles.
- **sync-charts robustness** — nice-to-have. *Where:* .github/workflows/sync-charts.yml:9-17,81-88,92-107; .github/workflows/deploy.yml:33-52
  - *What:* sync-charts has no workflow_dispatch and no resume. It pushes the tag (non-atomic `git push origin main --tags`) before creating the GitHub Release. If it fails after the tag push, a re-run sees the tag (new=false) and skips, so the Release is never created. deploy does not wait for the rare-charts tag, so after a sync failure the docs advertise rare-charts@<new> as a 404 (charts/index.md:12, charts/installation/index.md:24).
  - *Action:* CI, as a separate change outside both release commits: add workflow_dispatch with resume and an atomic push to sync-charts, and add a wait-for-rare-charts-tag step to deploy.yml. Or accept the risk and watch the run.
- **How the site loads the libraries** — info. *Where:* _includes/head.njk:18; charts/**/*.md (19 pages load /assets/charts/rare-charts.js); _data/versions.js; examples/styles/content-starter/demo/article.html:11-12; examples/styles/hetke/index.md:46
  - *What:* raredigits.art uses its own built copies: - /assets/css/rare.css (committed); - /assets/charts/rare-charts.js (built in deploy). So the site picks up both libraries from the pushed commit with no CDN step. CDN versions appear only in code snippets, through versions.styles and versions.charts. The content starter stays pinned to rare-styles v0.7.1 + rare-charts v0.9.8_5 (O-12 parked; the register says move both pins together). The hetke example loads rare-styles@latest, so it will get v0.7.2 once tagged.
  - *Action:* None for the pickup. CDN consumers pick up only by bumping pins.
- **Theme to token mapping and value shifts** — info. *Where:* assets/charts/src/core/theme.js; assets/charts/rare-charts.css; assets/css/modules/charts/{_index,_roles}.scss; assets/css/modules/bricks/_cards.scss:33-62
  - *What:* Each theme value, the token it maps to, and what changes: - bg: today var(--bg-color, #fff); maps to --chart-bg (#f0f0f0 on the page, #fafafa on .card, #333 on .card-inverted, white on paper). Fixes the grey plates on cards. - text: #000; maps to --chart-text-color (#000; #f0f0f0 on the dark card). - muted: #666; maps to --chart-label-color (#666; #ccc on the dark card). - border: #ccc; maps to --chart-axis-color (#ccc; #666 on the dark card). - grid: #e8e8e8; maps to --chart-grid-color (#e4e4e4; about #4d4d4d on the dark card). A small shift. - crosshair (#aaa) and surface (#f5f5f5): no toke…
  - *Action:* RareCharts: use this table to write the RC-014 chain and the CHANGELOG 'Changed' list.
- **Work already done on the Rare Styles branch** — info. *Where:* charts/circular/index.md:106,158; charts/index.md:25; charts/combined/index.md; charts/line/time-series/index.md:35; _internal_docs/styles/BACKLOG.md:237
  - *What:* Parts of RareCharts section H are already done by CSS-183a and CSS-371 on the branch: - RC-029: gauge rows re-marked as .panel__row--stack --text-start, which stack on phones; option tables checked at 375 px (Rare Styles exit criterion). - RC-031: the dead `black-bg` on charts/index.md:25 and `card-dashboard-bordered` on the three /charts/combined/ `pre` blocks are removed. - All chart frames are migrated (one panel recipe).
  - *Action:* RareCharts: tick these off in the plan rather than redoing them. RC-058's remaining parts (heights, callouts, .stat) are still open.
- **Tooltip size and font tokens vs K-15** — nice-to-have. *Where:* assets/css/modules/charts/_index.scss (--chart-tooltip-font-size: 13px; --chart-font-family-numeric); assets/charts/rare-charts.css:481; _internal_docs/charts/BACKLOG.md:106 (K-15)
  - *What:* Rare Styles publishes RareCharts' internal 13px tooltip size as a page token, and describes --chart-font-family-numeric as 'figures in the tooltip'. That matches K-15's planned split (Fira for text, mono for numbers), but today the whole tooltip is in Cousine. If RareCharts reads the size token, a later K-15 size change needs a matching Rare Styles release, and pages on older Rare Styles keep 13px.
  - *Action:* RareCharts: decide in RC-014 whether to read --chart-tooltip-font-size at all, or treat it as a fixed contract value.
- **Rare Styles release docs predating the hand review** — nice-to-have. *Where:* assets/css/docs/MIGRATION.md:80 (step 2), :92 (row 3), :114 (row 25), :115 (row 26); assets/css/docs/Changelog.md:10 (date 2026-10-27)
  - *What:* The release notes and migration table come from these files and stay with the tag permanently, yet several lines predate the hand review: - Step 2 and row 3 describe a white face and 4px corners. The default is now a --gray-lightest pill with 32px corners (§34, §37). - Row 25 lists .callout-info and .callout-error; they are .callout-signal and .callout-danger (§17). - Row 26 lists --button-* as new tokens; they were removed (§34). - The entry is dated 2026-10-27.
  - *Action:* Rare Styles side, before the tag: correct these rows, and set the release date.
- **Hand-review notes and section 44 placement** — nice-to-have. *Where:* manual_updates_0_7_2.md:997-1008 (repo root, Russian, tracked, eleventyignored); _internal_docs/charts/BACKLOG.md:140
  - *What:* Section 44's task is only partly in RC-014. Missing: the #1677ff literal fallback for standalone pages, the circular.test.js PALETTE update, and the docs pages that show the palette. The file itself sits at the repo root, outside _internal_docs/, against the internal-docs rule (move open tasks to the backlog, delete when done).
  - *Action:* Move the rest of section 44 into the RC-014 bullet or its own RC task. Decide whether manual_updates_0_7_2.md moves to _internal_docs/styles/ or is deleted after the release.
- **Legend primitive vs D-04 / RC-054** — info. *Where:* assets/css/modules/bricks/_legend.scss; assets/charts/rare-charts.css:228-275,438-468; assets/charts/src/graph/chrome.js:269; MapFlow.js:672; flow.js:1032
  - *What:* The swatch contract already matches: - an 8px square, dot and band; a 16×2 line; dashes 5/3; - a 6px item gap, 2px/16px row gap, line-height 1.3; - the off state at 0.35, which RareCharts sets inline today and Rare Styles sets on [aria-pressed='false']. Differences: label size 0.9rem (14.4px) vs RareCharts' fixed 14px, and the colour arrives through --swatch-color vs inline background. RareCharts must keep its own rc- classes: a .legend inside a chart would take Rare Styles rules, and CSS-241 keeps RareCharts standalone.
  - *Action:* No co-release work. For D-04 and RC-054 later: adopt the off state through [aria-pressed] and a custom-property swatch colour, under its own rc- name.

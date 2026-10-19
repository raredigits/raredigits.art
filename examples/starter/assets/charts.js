// Charts for the starter's articles (CSS-351).
//
// Every chart is a <figure data-chart="line|bar"> holding three things:
//   .chart          — the box the chart draws into (reserved by project.css)
//   <figcaption>    — the takeaway and the source, plain HTML
//   .chart-data     — a <details> with the data table
// The table is the chart's data. Without JavaScript, or when the chart library
// cannot load, the reader gets the open table and the caption; with it, the
// table collapses under the chart and stays one click away.
//
// RareCharts is pinned and fetched only when the page has a chart, so an
// article without charts never downloads it.

(function () {
    'use strict';

    // Upgrade RareCharts by changing this one line.
    var RARECHARTS_SRC = 'https://cdn.jsdelivr.net/gh/raredigits/rare-charts@v0.9.8_4/rare-charts.min.js';
    var LOAD_TIMEOUT_MS = 10000;

    function figures() {
        return Array.prototype.slice.call(document.querySelectorAll('figure[data-chart]'));
    }

    // Numbers as people type them: "1,234.5", "−0.2" (a real minus sign).
    function toNumber(text) {
        return parseFloat(String(text).replace(/−/g, '-').replace(/[^0-9.\-]/g, ''));
    }

    // First column: the category, or a date in the cell's data-value
    // (YYYY-MM-DD) with a human label as its text. Second column: the value.
    function readTable(figure) {
        var rows = figure.querySelectorAll('.chart-data tbody tr');
        return Array.prototype.map.call(rows, function (row) {
            var cells = row.querySelectorAll('th, td');
            var key = cells[0].getAttribute('data-value') || cells[0].textContent.trim();
            return { key: key, value: toNumber(cells[1].textContent) };
        }).filter(function (d) {
            return d.key && !isNaN(d.value);
        });
    }

    // Numbers and dates in the reader's terms: one decimal at most, months by
    // name. Plain Intl, so no formatting library is needed.
    function formatNumber(value) {
        return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }

    function formatMonth(date) {
        return date.toLocaleString('en-US', { month: 'short' });
    }

    var builders = {
        line: function (box, data, units) {
            return new RareCharts.Line(box, {
                height: 320,
                subtitle: units,
                seriesName: units,
                yTickFormat: formatNumber,
                xTickFormat: formatMonth,
            }).setData(data.map(function (d) {
                return { date: d.key, value: d.value };
            }));
        },
        bar: function (box, data, units) {
            return new RareCharts.Bar(box, {
                orientation: 'horizontal',
                height: 40 * data.length + 60,
                subtitle: units,
                // Value labels are off: a short negative bar has no room for
                // its label in RareCharts v0.9.8_4. The values are in the table.
                xTickFormat: formatNumber,
            }).setData(data.map(function (d) {
                return { label: d.key, value: d.value };
            }));
        },
    };

    function setTable(figure, open) {
        var details = figure.querySelector('.chart-data');
        if (details) details.open = open;
    }

    // Keep the caption and the open table; drop the empty chart box.
    function fail(figure) {
        figure.classList.add('chart-failed');
        setTable(figure, true);
    }

    function draw(figure) {
        var build = builders[figure.getAttribute('data-chart')];
        var box = figure.querySelector('.chart');
        var data = readTable(figure);
        if (!build || !box || data.length === 0) return fail(figure);
        try {
            build(box, data, figure.getAttribute('data-chart-units') || '');
        } catch (error) {
            console.error('Chart failed to draw:', error);
            fail(figure);
        }
    }

    function loadLibrary(onReady, onError) {
        if (window.RareCharts) return onReady();
        var script = document.createElement('script');
        var timer = setTimeout(onError, LOAD_TIMEOUT_MS);
        script.src = RARECHARTS_SRC;
        script.onload = function () {
            clearTimeout(timer);
            window.RareCharts ? onReady() : onError();
        };
        script.onerror = function () {
            clearTimeout(timer);
            onError();
        };
        document.head.appendChild(script);
    }

    function init() {
        var list = figures();
        if (list.length === 0) return;

        // Collapse the tables now, before the library arrives, so the page
        // does not jump twice. They reopen if the chart cannot be drawn.
        list.forEach(function (figure) { setTable(figure, false); });

        var settled = false;
        loadLibrary(function () {
            if (settled) return;
            settled = true;
            list.forEach(draw);
        }, function () {
            if (settled) return;
            settled = true;
            list.forEach(fail);
        });

        // On paper the table is the readable version of the chart: open it
        // for printing, restore it after.
        window.addEventListener('beforeprint', function () {
            list.forEach(function (figure) { setTable(figure, true); });
        });
        window.addEventListener('afterprint', function () {
            list.forEach(function (figure) {
                setTable(figure, figure.classList.contains('chart-failed'));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

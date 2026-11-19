// Needs the page around it: the quote header (#hd-price, #hd-change) and the
// KPI row (#s-open … #s-vol) are the docs page's markup, laid out by Rare
// Styles (.panel__row, .stat) and the site's .price-chart-* rules
// (assets/css/rare-website.css). The chart itself needs none of them.
(async () => {
  const { d3 } = RareCharts;
  const data = RareCharts.generateMockPrices(730, 162);
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const chg  = last.value - prev.value;
  const pct  = chg / prev.value * 100;

  // ── Header ─────────────────────────────────
  document.getElementById('hd-price').textContent = '$' + last.value.toFixed(2);

  // The day's change is a Rare Styles stat with the delta chip: an arrow up or
  // down in the positive or negative colour (.stat--delta-up / -down, v0.7.2).
  // .price-chart-* is the docs site's own layout (assets/css/rare-website.css).
  const chgEl = document.getElementById('hd-change');
  chgEl.querySelector('.stat__value').textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)} (${pct.toFixed(2)}%)`;
  chgEl.className = 'price-chart-change stat stat--delta-' + (chg >= 0 ? 'up' : 'down');

  // ── Stats ──────────────────────────────────
  document.getElementById('s-open').textContent = '$' + last.open.toFixed(2);
  document.getElementById('s-high').textContent = '$' + last.high.toFixed(2);
  document.getElementById('s-low').textContent  = '$' + last.low.toFixed(2);
  document.getElementById('s-vol').textContent  = d3.format('.2s')(last.volume);

  // ── TimeSeries ─────────────────────────────
  const mainChart = new RareCharts.TimeSeries('#timeseriesChart', {
    height: 340,
    title: 'Rare Share Performance',
    curve: 'linear',
    area: false,
    navigator: {
      height: 56,
      color: '#666666',
      area: 1,
      areaColor: '#cccccc',
    },
    timeframes: true,
    defaultTimeframe: '1Y',
    // The tooltip's own rows (/charts/settings/#custom-tooltip): the price
    // row, and under it a note with the day's change, green or red, and the
    // volume — fields of the row the default tooltip does not show.
    tooltipFormat: (d, { color }) => {
      const c  = d.value - d.open;
      const p  = (c / d.open * 100).toFixed(2);
      const up = c >= 0 ? '#389e0d' : '#ff0000';   // up green, down red
      return `
        <div class="rc-tooltip-header rc-tooltip-muted">${d3.timeFormat('%b %d, %Y')(d.date)}</div>
        <div class="rc-tooltip-row">
          <span class="rc-tooltip-swatch" style="--rc-swatch-color:${color}"></span>
          <span class="rc-tooltip-label">Close</span>
          <span class="rc-tooltip-value rc-num">$${d.value.toFixed(2)}</span>
          <span class="rc-tooltip-note"><span style="color:${up}">${c >= 0 ? '+' : ''}${c.toFixed(2)} (${p}%)</span> · Vol ${d3.format('.2s')(d.volume)}</span>
        </div>
      `;
    },
  });

  mainChart.setData(data);
})();

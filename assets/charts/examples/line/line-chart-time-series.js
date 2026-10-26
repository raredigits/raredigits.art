(async () => {
  const { d3 } = RareCharts;
  const data = RareCharts.generateMockPrices(730, 162);
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const chg  = last.value - prev.value;
  const pct  = chg / prev.value * 100;

  // ── Header ─────────────────────────────────
  document.getElementById('hd-price').textContent = '$' + last.value.toFixed(2);

  const chgEl = document.getElementById('hd-change');
  chgEl.textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)} (${pct.toFixed(2)}%)`;
  // .price-chart-* styles live in the site stylesheet, assets/css/rare-website.css
  chgEl.className = 'price-chart-change ' + (chg >= 0 ? 'up' : 'down');

  // ── Stats ──────────────────────────────────
  document.getElementById('s-open').textContent = '$' + last.open.toFixed(2);
  document.getElementById('s-high').textContent = '$' + last.high.toFixed(2);
  document.getElementById('s-low').textContent  = '$' + last.low.toFixed(2);
  document.getElementById('s-vol').textContent  = d3.format('.2s')(last.volume);
  const yearAgo  = new Date(+last.date - 365 * 864e5);
  const lastYear = data.filter(d => d.date >= yearAgo);
  document.getElementById('s-52h').textContent  = '$' + d3.max(lastYear, d => d.high).toFixed(2);
  document.getElementById('s-52l').textContent  = '$' + d3.min(lastYear, d => d.low).toFixed(2);

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
    tooltipFormat: d => {
      const c     = d.value - d.open;
      const p     = (c / d.open * 100).toFixed(2);
      const color = c >= 0 ? RareCharts.defaultTheme.positive : RareCharts.defaultTheme.negative;
      return `
        <div>${d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
        <div style="color:${color}">$${d.value.toFixed(2)}</div>
        <div>${c >= 0 ? '+' : ''}${c.toFixed(2)} (${p}%)  VOL ${d3.format('.2s')(d.volume)}</div>
      `;
    },
  });

  mainChart.setData(data);
})();

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
  // Обновлённые классы совпадают с price-chart.css
  chgEl.className = 'price-chart-change ' + (chg >= 0 ? 'up' : 'down');

  // ── Stats ──────────────────────────────────
  document.getElementById('s-open').textContent = '$' + last.open.toFixed(2);
  document.getElementById('s-high').textContent = '$' + last.high.toFixed(2);
  document.getElementById('s-low').textContent  = '$' + last.low.toFixed(2);
  document.getElementById('s-vol').textContent  = d3.format('.2s')(last.volume);
  document.getElementById('s-52h').textContent  = '$' + d3.max(data, d => d.high).toFixed(2);
  document.getElementById('s-52l').textContent  = '$' + d3.min(data, d => d.low).toFixed(2);

  // ── TimeSeries ─────────────────────────────
  const mainChart = new RareCharts.TimeSeries('#mainChart', {
    height: 340,
    curve: 'linear',
    area: false,
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

  // ── Overview ───────────────────────────────
  const overview = new RareCharts.Overview('#overview', { 
    height: 56,
    color: '#666666',
    area: 1, 
    areaColor: '#cccccc' 
  });
  overview.setData(data, extent => mainChart.setView(extent));
  mainChart.onViewChange(extent => overview.setBrush(extent));

  // ── Начальный вид — последний год ──────────
  const end   = data[data.length - 1].date;
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  mainChart.setView([start, end]);
  overview.setBrush([start, end]);

  // ── Range buttons ──────────────────────────
  document.getElementById('rangeBar').addEventListener('click', e => {
    const btn = e.target.closest('.range-btn');
    if (!btn) return;

    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const range = btn.dataset.range;
    const end   = data[data.length - 1].date;
    const start = new Date(end);

    if      (range === '1M')  start.setMonth(start.getMonth() - 1);
    else if (range === '3M')  start.setMonth(start.getMonth() - 3);
    else if (range === '6M')  start.setMonth(start.getMonth() - 6);
    else if (range === '1Y')  start.setFullYear(start.getFullYear() - 1);
    else if (range === '2Y')  start.setFullYear(start.getFullYear() - 2);
    else if (range === 'ALL') start.setTime(data[0].date.getTime());

    mainChart.setView([start, end]);
    overview.setBrush([start, end]);
  });
})();

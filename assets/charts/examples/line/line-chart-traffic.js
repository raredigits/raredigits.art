(() => {
  // Visits to a website, as a server would aggregate them: per hour for the
  // last five weeks, per day for two years, per month for three. Generated
  // from the moment the page loads, with a fixed seed, so every visit to the
  // page draws the same shape up to "now".
  let seed = 7;
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAYS = 3 * 366;

  // A day's visits: slow growth, quieter weekends, a summer dip, noise.
  const dayVisits = date => {
    const age = (today - date) / 864e5;
    const trend = 1800 - age * 0.9;
    const weekend = [0, 6].includes(date.getDay()) ? 0.62 : 1;
    const summer = 1 - 0.12 * Math.exp(-(((date.getMonth() + 0.5) - 7.5) ** 2) / 2);
    return Math.max(0, Math.round(trend * weekend * summer * (0.85 + random() * 0.3)));
  };
  // The share of a day's visits in each hour: quiet nights, a working-day hump.
  const hourShare = Array.from({ length: 24 }, (_, h) => 0.25 + Math.exp(-((h - 14) ** 2) / 18));
  const shareSum = hourShare.reduce((a, b) => a + b, 0);

  const day = [];
  const hour = [];
  const byMonth = new Map();
  for (let i = DAYS; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const total = dayVisits(date);
    let counted = total;
    if (i <= 35) {
      // the last five weeks also hour by hour; today only up to now
      counted = 0;
      for (let h = 0; h < 24; h++) {
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
        if (at > now) break;
        const value = Math.round(total * hourShare[h] / shareSum * (0.8 + random() * 0.4));
        hour.push({ date: at, value });
        counted += value;
      }
    }
    if (i < 2 * 366) day.push({ date, value: counted });
    const month = new Date(date.getFullYear(), date.getMonth(), 1);
    byMonth.set(+month, (byMonth.get(+month) ?? 0) + counted);
  }
  const month = [...byMonth].map(([t, value]) => ({ date: new Date(t), value }));

  const chart = new RareCharts.TimeSeries('#trafficChart', {
    height: 320,
    title: 'Site visits',
    subtitle: 'Per hour, day or month: the chart picks the level for the window',
    source: 'Demo data generated in the browser',
    legend: [{ label: 'Visits' }, { label: 'Previous period' }],
    seriesName: 'Visits',
    timeframeAnchor: 'now',
    timeframes: [
      { key: 'TODAY', label: 'Today' },
      { key: 'WTD', label: 'Week' },
      { key: 'MTD', label: 'Month' },
      { key: 'YTD', label: 'Year' },
      { key: 'ALL', label: 'All time' },
      { key: 'CUSTOM', label: 'Custom' },
    ],
    defaultTimeframe: 'WTD',
    compare: 'previousPeriod',
    yFormat: 'number',
    gaps: 'zero',
    navigator: true,
  });

  const levelEl = document.getElementById('traffic-level');
  const showLevel = level => { if (levelEl) levelEl.textContent = `Drawn level: ${level ?? '—'}`; };
  chart.onViewChange((extent, { level }) => showLevel(level));
  chart.setData({ hour, day, month });
  showLevel(chart.getLevel());
})();

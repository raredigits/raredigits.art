(function () {
  const d3 = RareCharts.d3;

  (async function () {

    const raw = await RareCharts.fromJson(
      '/_data/special/btc_mining.json',
      {
        date:       row => new Date(row.date),
        profit_btc: row => +row.profit_btc,
        price_usd:  row => +row.price_usd
      }
    );

    // Electricity cost per day by month
    const electricityByMonth = {
      1:  null, // January not used
      2:  10.936,
      3:  10.877,
      4:  12.18,
      5:  12.577,
      6:  12.68,
      7:  12.419,
      8:  12.577,
      9:  12.0767,
      10: 12.577,
      11: 12.27,
      12: 12.423
    };

    const priceSeries = [];
    const costSeries  = [];

    raw.forEach(r => {

      const month = r.date.getMonth() + 1;
      const electricity = electricityByMonth[month];

      if (!electricity || !r.profit_btc) return;

      const costPerBTC = electricity / r.profit_btc;

      priceSeries.push({
        date: r.date,
        value: r.price_usd
      });

      costSeries.push({
        date: r.date,
        value: costPerBTC
      });

    });

    const series = [
      {
        name: 'BTC Market Price',
        color: '#f7931a',
        strokeWidth: 2,
        values: priceSeries
      },
      {
        name: 'Electricity Cost to Mine 1 BTC',
        color: '#ff4d4d',
        strokeWidth: 2,
        values: costSeries
      }
    ];

    new RareCharts.Line('#btc-mining-cost', {

      height: 320,

      title: 'Cost to Mine 1 BTC vs Market Price',
      subtitle: 'Feb–Dec 2025 · electricity-only production cost',

      legend: [
        { label: 'BTC Market Price', color: '#f7931a' },
        { label: 'Electricity Cost to Mine 1 BTC', color: '#ff4d4d' }
      ],

      source: 'Source: mining pool daily summary export',

      endLabels: false,

      curve: 'monotoneX',

      yTickFormat: v => '$' + d3.format(',.0f')(v),

      xTickFormat: d => d3.timeFormat('%b')(d),

      crosshair: true

    }).setData(series);

  })();

})();
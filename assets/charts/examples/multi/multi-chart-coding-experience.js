(function () {
  new RareCharts.MultiChart('#multi-chart-coding-experience', {
    title:    'Coding Experience',
    subtitle: 'Share of developers by years of experience and gender',
    source:   'Source: Stack Overflow Developer Survey 2015',
    columns:  2,
    chartHeight: 200,
    charts: [
      {
        type:  'Bar',
        title: 'Men',
        data: [
          { label: '11+ years',        value: 24.7 },
          { label: '6–10 years',       value: 23.9 },
          { label: '2–5 years',        value: 32.4 },
          { label: 'Less than 2 yrs',  value: 18.9 },
        ],
        options: {
          orientation:  'horizontal',
          barColor:     '#e84000',
          showValues:   true,
          valueFormat:  d => d.value + '%',
          showGrid:     false,
          showXAxis:    false,
          margin:       { left: 100 },
        },
      },
      {
        type:  'Bar',
        title: 'Women',
        data: [
          { label: '11+ years',        value: 10.4 },
          { label: '6–10 years',       value: 16.4 },
          { label: '2–5 years',        value: 32.8 },
          { label: 'Less than 2 yrs',  value: 40.4 },
        ],
        options: {
          orientation:  'horizontal',
          barColor:     '#e84000',
          showValues:   true,
          valueFormat:  d => d.value + '%',
          showGrid:     false,
          showXAxis:    false,
          showYAxis:    false,
          margin:       { left: 0 },
        },
        mobileOptions: {
          showYAxis: true,
          margin:    { left: 100 },
        },
      },
    ],
  });
})();

(function () {
  new RareCharts.MultiChart('#multi-chart-developer-survey', {
    title:    'Who Writes Code',
    subtitle: 'Gender and experience breakdown ',
    source:   'Source: Stack Overflow Developer Survey 2015',
    columns:  2,
    chartHeight: 200,
    charts: [
      {
        type:  'Bar',
        title: 'Respondents by gender',
        span:  2,
        data: [
          { label: 'Men',                    value: 92.1 },
          { label: 'Women',                  value: 5.7  },
          { label: 'Prefer not to disclose', value: 1.7  },
          { label: 'Other',                  value: 0.5  },
        ],
        options: {
          orientation:  'horizontal',
          barColor:     '#e84000',
          showValues:   true,
          valueFormat:  d => d.value + '%',
          showGrid:     false,
          showXAxis:    false,
          height:       160,
          margin:       { left: 100 },
          labelMaxLength: 13,
        },
      },
      {
        type:  'Bar',
        title: 'Men — coding experience',
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
        title: 'Women — coding experience',
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
        // On mobile the chart stands alone — restore category labels
        mobileOptions: {
          showYAxis: true,
          margin:    { left: 100 },
        },
      },
    ],
  });
})();

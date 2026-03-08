/**
 * RareCharts — Line Chart Options Demo (Select UI)
 *
 * Demonstrates all available visual options of Line:
 *   - curve (shape)
 *   - strokeDash (line style)
 *   - area (fill + baseline)
 *   - markers (points + shape)
 *
 * UI is implemented via <select> controls.
 */

(function () {
  const { Line } = RareCharts;

  // ---------------------------------------------------------------------------
  // Demo data
  // ---------------------------------------------------------------------------

  function makeSeries(seed, len = 24) {
    let v = seed;
    const start = new Date('2025-01-01');

    return Array.from({ length: len }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i * 7);

      v += (Math.sin(i * seed * 0.4) + (Math.random() - 0.48)) * 1.8;

      return { date, value: +v.toFixed(2) };
    });
  }

  const series = [
    { name: 'A', color: '#ff6200', values: makeSeries(3.1) },
    { name: 'B', color: '#00aaff', values: makeSeries(1.7) },
    { name: 'C', color: '#00c97a', values: makeSeries(2.3) },
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    curve: 'monotone',
    strokeDash: null,     // null = solid
    area: false,
    areaBaseline: 'zero', // 'zero' | 'min'
    markers: false,
    markerShape: 'circle',
  };

  // ---------------------------------------------------------------------------
  // Select configuration
  // ---------------------------------------------------------------------------

  const groups = [
    {
      key: 'curve',
      label: 'Curve',
      options: [
        { value: 'linear',     label: 'Linear' },
        { value: 'monotone',   label: 'Monotone' },
        { value: 'basis',      label: 'Basis' },
        { value: 'cardinal',   label: 'Cardinal' },
        { value: 'step',       label: 'Step' },
        { value: 'stepBefore', label: 'Step Before' },
        { value: 'stepAfter',  label: 'Step After' },
      ],
    },
    {
      key: 'strokeDash',
      label: 'Stroke',
      options: [
        { value: '',         label: 'Solid' },     // empty string -> null in state
        { value: 'dashed',   label: 'Dashed' },
        { value: 'dotted',   label: 'Dotted' },
        { value: 'dashDot',  label: 'Dash·Dot' },
        { value: 'longDash', label: 'Long Dash' },
      ],
    },
    {
      key: 'area',
      label: 'Fill',
      // Encoded as: off | zero | min
      options: [
        { value: 'off',  label: 'Off'  },
        { value: 'zero', label: 'Zero' },
        { value: 'min',  label: 'Min'  },
      ],
    },
    {
      key: 'markers',
      label: 'Markers',
      // Encoded as: off | circle | square | ...
      options: [
        { value: 'off',      label: 'Off' },
        { value: 'circle',   label: 'Circle' },
        { value: 'square',   label: 'Square' },
        { value: 'diamond',  label: 'Diamond' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'cross',    label: 'Cross' },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  const root = document.getElementById('rc-demo-root');

  const chartEl = document.createElement('div');
  chartEl.id = 'rc-demo-chart';
  root.appendChild(chartEl);

  const controlsEl = document.createElement('div');
  controlsEl.className = 'rc-demo-controls';
  root.appendChild(controlsEl);

  const codeWrap = document.createElement('div');
  codeWrap.className = 'rc-demo-code-wrap';

  const codePre = document.createElement('pre');

  const codeEl = document.createElement('code');

  codePre.appendChild(codeEl);
  root.appendChild(codePre);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getSelectValue(groupKey) {
    if (groupKey === 'area') {
      return state.area ? state.areaBaseline : 'off';
    }

    if (groupKey === 'markers') {
      return state.markers ? state.markerShape : 'off';
    }

    if (groupKey === 'strokeDash') {
      return state.strokeDash ?? ''; // solid -> ''
    }

    return state[groupKey] ?? '';
  }

  function applySelectValue(groupKey, value) {
    if (groupKey === 'area') {
      if (value === 'off') {
        state.area = false;
        state.areaBaseline = 'zero';
      } else {
        state.area = true;
        state.areaBaseline = value; // 'zero' | 'min'
      }
      return;
    }

    if (groupKey === 'markers') {
      if (value === 'off') {
        state.markers = false;
        state.markerShape = 'circle';
      } else {
        state.markers = true;
        state.markerShape = value;
      }
      return;
    }

    if (groupKey === 'strokeDash') {
      state.strokeDash = value ? value : null; // '' -> null
      return;
    }

    state[groupKey] = value;
  }

  // ---------------------------------------------------------------------------
  // Build controls
  // ---------------------------------------------------------------------------

  groups.forEach(group => {
    const row = document.createElement('label');
    row.className = 'rc-demo-group';

    const labelEl = document.createElement('span');
    labelEl.className = 'rc-demo-group-label';
    labelEl.textContent = group.label;

    const select = document.createElement('select');
    select.className = 'rc-demo-select';
    select.dataset.group = group.key;

    group.options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = String(opt.value);
      optionEl.textContent = opt.label;
      select.appendChild(optionEl);
    });

    select.value = String(getSelectValue(group.key));

    select.addEventListener('change', () => {
      applySelectValue(group.key, select.value);
      updateChart();
    });

    row.appendChild(labelEl);
    row.appendChild(select);
    controlsEl.appendChild(row);
  });

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------

  let chart = null;

  function buildOptions() {
    return {
      height: 300,
      curve: state.curve,
      strokeDash: state.strokeDash,
      area: state.area,
      areaBaseline: state.areaBaseline,
      areaOpacity: 0.12,
      markers: state.markers,
      markerShape: state.markerShape,
      markerSize: 4,
      endLabels: true,
      crosshair: false,
      tooltip: false,
      yTickFormat: v => (v >= 0 ? '+' : '') + v.toFixed(1),
    };
  }

  function buildCodeSnippet() {
    const opts = buildOptions();

    const lines = [
      `new RareCharts.Line('#chart', {`,
      `  curve: '${opts.curve}',`,
    ];

    if (opts.strokeDash) {
      lines.push(`  strokeDash: '${opts.strokeDash}',`);
    }

    if (opts.area) {
      lines.push(`  area: true,`);
      if (opts.areaBaseline !== 'zero') {
        lines.push(`  areaBaseline: '${opts.areaBaseline}',`);
      }
    }

    if (opts.markers) {
      lines.push(`  markers: true,`);
      if (opts.markerShape !== 'circle') {
        lines.push(`  markerShape: '${opts.markerShape}',`);
      }
    }

    lines.push(`}).setData(series);`);

    return lines.join('\n');
  }

  function updateChart() {
    if (chart) {
      chartEl.innerHTML = '';
    }

    chart = new Line('#rc-demo-chart', buildOptions());
    chart.setData(series);

    codeEl.textContent = buildCodeSnippet();
  }

  // Initial render
  updateChart();

})();
/**
 * RareCharts — Line Chart Options Demo
 * Показывает все доступные визуальные опции Line:
 *   curve (форма), strokeDash (пунктир), area (заливка), markers (точки)
 */

(function () {
  const { Line, d3 } = RareCharts;

  function makeSeries(seed, len = 24) {
    let v = seed;
    const now = new Date('2025-01-01');
    return Array.from({ length: len }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i * 7);
      v += (Math.sin(i * seed * 0.4) + (Math.random() - 0.48)) * 1.8;
      return { date, value: +v.toFixed(2) };
    });
  }

  const series = [
    { name: 'A',   color: '#ff6200', values: makeSeries(3.1) },
    { name: 'B', color: '#00aaff', values: makeSeries(1.7) },
    { name: 'C',  color: '#00c97a', values: makeSeries(2.3) },
  ];

  // ── Состояние ─────────────────────────────────────────────────────────────

  const state = {
    curve:     'monotone',
    strokeDash: null,
    area:      false,
    areaBaseline: 'zero',
    markers:   false,
    markerShape: 'circle',
  };

  // ── Конфиг групп переключателей ───────────────────────────────────────────

  const groups = [
    {
      key:   'curve',
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
      key:   'strokeDash',
      label: 'Stroke',
      options: [
        { value: null,       label: 'Solid' },
        { value: 'dashed',   label: 'Dashed' },
        { value: 'dotted',   label: 'Dotted' },
        { value: 'dashDot',  label: 'Dash·Dot' },
        { value: 'longDash', label: 'Long Dash' },
      ],
    },
    {
      key:   'area',
      label: 'Fill',
      options: [
        { value: false, label: 'Off' },
        { value: true,  label: 'Zero',
          extra: { areaBaseline: 'zero' } },
        { value: true,  label: 'Min',
          extra: { areaBaseline: 'min' } },
      ],
    },
    {
      key:   'markerShape',
      label: 'Markers',
      options: [
        { value: 'circle',   label: 'Off',      markers: false },
        { value: 'circle',   label: 'Circle',   markers: true  },
        { value: 'square',   label: 'Square',   markers: true  },
        { value: 'diamond',  label: 'Diamond',  markers: true  },
        { value: 'triangle', label: 'Triangle', markers: true  },
        { value: 'cross',    label: 'Cross',    markers: true  },
      ],
    },
  ];

  // ── DOM ───────────────────────────────────────────────────────────────────

  const root = document.getElementById('rc-demo-root');

  // Chart container
  const chartEl = document.createElement('div');
  chartEl.id = 'rc-demo-chart';
  root.appendChild(chartEl);

  // Controls
  const controlsEl = document.createElement('div');
  controlsEl.className = 'rc-demo-controls';
  root.appendChild(controlsEl);

  // Code preview
  const codeWrap = document.createElement('div');
  codeWrap.className = 'rc-demo-code-wrap';
  const codePre = document.createElement('pre');
  codePre.className = 'rc-demo-code';
  const codeEl = document.createElement('code');
  codePre.appendChild(codeEl);
  codeWrap.appendChild(codePre);
  root.appendChild(codeWrap);

  // ── Build controls ────────────────────────────────────────────────────────

  groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'rc-demo-group';

    const labelEl = document.createElement('span');
    labelEl.className = 'rc-demo-group-label';
    labelEl.textContent = group.label;
    groupEl.appendChild(labelEl);

    const barEl = document.createElement('div');
    barEl.className = 'rc-demo-btn-bar';

    group.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'rc-demo-btn';
      btn.textContent = opt.label;
      btn.dataset.group = group.key;
      btn.dataset.idx = i;

      // Determine initial active state
      const isActive = (() => {
        if (group.key === 'markerShape') {
          const isOff = opt.label === 'Off';
          return isOff ? !state.markers : (state.markers && state.markerShape === opt.value && opt.label !== 'Off');
        }
        if (group.key === 'area') {
          if (!opt.value) return !state.area;
          return state.area && state.areaBaseline === (opt.extra?.areaBaseline ?? 'zero');
        }
        return state[group.key] === opt.value;
      })();

      if (isActive) btn.classList.add('is-active');

      btn.addEventListener('click', () => {
        // Update state
        if (group.key === 'markerShape') {
          state.markers     = opt.markers ?? true;
          state.markerShape = opt.value;
        } else if (group.key === 'area') {
          state.area         = opt.value;
          state.areaBaseline = opt.extra?.areaBaseline ?? 'zero';
        } else {
          state[group.key] = opt.value;
        }

        // Update active class within group
        barEl.querySelectorAll('.rc-demo-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        updateChart();
      });

      barEl.appendChild(btn);
    });

    groupEl.appendChild(barEl);
    controlsEl.appendChild(groupEl);
  });

  // ── Chart instance ────────────────────────────────────────────────────────

  let chart = null;

  function buildOptions() {
    return {
      height:       300,
      curve:        state.curve,
      strokeDash:   state.strokeDash,
      area:         state.area,
      areaBaseline: state.areaBaseline,
      areaOpacity:  0.12,
      markers:      state.markers,
      markerShape:  state.markerShape,
      markerSize:   4,
      endLabels:    true,
      crosshair:    false,
      tooltip:    false,
      yTickFormat:  v => (v >= 0 ? '+' : '') + v.toFixed(1),
    };
  }

  function buildCodeSnippet() {
    const opts = buildOptions();
    const lines = [
      `new RareCharts.Line('#chart', {`,
      `  curve: '${opts.curve}',`,
    ];
    if (opts.strokeDash) lines.push(`  strokeDash: '${opts.strokeDash}',`);
    if (opts.area) {
      lines.push(`  area: true,`);
      if (opts.areaBaseline !== 'zero') lines.push(`  areaBaseline: '${opts.areaBaseline}',`);
    }
    if (opts.markers) {
      lines.push(`  markers: true,`);
      if (opts.markerShape !== 'circle') lines.push(`  markerShape: '${opts.markerShape}',`);
    }
    lines.push(`}).setData(series);`);
    return lines.join('\n');
  }

  function updateChart() {
    // Destroy existing
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
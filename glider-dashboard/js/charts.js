(function () {
  const CHART_THEME = {
    background: '#0d120d',
    foreColor: '#6b7280',
  };
  const GRID = { borderColor: '#1a2a1a', strokeDashArray: 3 };
  const TOOLTIP = { theme: 'dark' };

  const charts = {};

  function initCharts() {
    charts.rpm = new ApexCharts(document.getElementById('chart-rpm'), {
      chart: {
        type: 'area',
        height: 180,
        background: CHART_THEME.background,
        foreColor: CHART_THEME.foreColor,
        toolbar: { autoSelected: 'zoom', show: true },
        zoom: { enabled: true },
        animations: { enabled: false },
      },
      series: [{ name: 'RPM', data: [] }],
      xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
      yaxis: { min: 0, labels: { formatter: v => v.toFixed(1) } },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 100],
        },
      },
      colors: ['#39d353'],
      grid: GRID,
      tooltip: { ...TOOLTIP, x: { format: 'HH:mm:ss' } },
      noData: { text: 'No data yet', style: { color: '#6b7280' } },
    });
    charts.rpm.render();

    charts.hourly = new ApexCharts(document.getElementById('chart-hourly'), {
      chart: {
        type: 'bar',
        height: 180,
        background: CHART_THEME.background,
        foreColor: CHART_THEME.foreColor,
        toolbar: { show: false },
        animations: { enabled: false },
      },
      series: [{ name: 'Laps', data: new Array(24).fill(0) }],
      xaxis: {
        categories: Array.from({ length: 24 }, (_, i) => i),
        labels: { formatter: v => v + 'h' },
      },
      yaxis: { min: 0 },
      colors: ['#39d353'],
      plotOptions: { bar: { columnWidth: '70%', borderRadius: 2 } },
      grid: GRID,
      tooltip: TOOLTIP,
      noData: { text: 'No data yet', style: { color: '#6b7280' } },
    });
    charts.hourly.render();
  }

  window.initCharts = initCharts;
  window.updateCharts = function () {};
  window._charts = charts;
})();

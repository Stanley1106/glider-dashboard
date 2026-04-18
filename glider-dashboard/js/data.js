(function () {
  function parseCsv(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 5) continue;
      const ts = new Date(cols[0].trim());
      const total_laps = parseInt(cols[1].trim(), 10);
      const temperature = parseFloat(cols[2].trim());
      const humidity = parseFloat(cols[3].trim());
      const lux = parseFloat(cols[4].trim());
      if (isNaN(ts.getTime()) || isNaN(total_laps)) continue;
      rows.push({ ts, total_laps, temperature, humidity, lux });
    }
    return rows;
  }

  function todayDateStr() {
    return new Date(Date.now() + 8 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  function rowDateStr(ts) {
    return new Date(ts.getTime() + 8 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  function computeRpm(rows) {
    for (let i = 0; i < rows.length; i++) {
      if (i === 0) { rows[i].rpm = 0; rows[i].lapsDelta = 0; continue; }
      const prev = rows[i - 1];
      const curr = rows[i];
      const elapsedMin = (curr.ts - prev.ts) / 60000;
      const delta = Math.max(0, curr.total_laps - prev.total_laps);
      curr.lapsDelta = delta;
      curr.rpm = elapsedMin > 0 ? delta / elapsedMin : 0;
    }
  }

  function buildHourly(rows) {
    const buckets = new Array(24).fill(0);
    for (const r of rows) {
      const hour = r.ts.getHours();
      buckets[hour] += r.lapsDelta;
    }
    return buckets;
  }

  function buildDaily(rows) {
    const map = {};
    for (const r of rows) {
      const d = rowDateStr(r.ts);
      if (!map[d]) map[d] = { start: r.total_laps, end: r.total_laps };
      else map[d].end = r.total_laps;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { start, end }]) => ({ date, laps: Math.max(0, end - start) }));
  }

  function computeStats(rows) {
    const today = todayDateStr();
    const todayRows = rows.filter(r => rowDateStr(r.ts) === today);

    const todayLaps =
      todayRows.length < 2
        ? todayRows.reduce((s, r) => s + r.lapsDelta, 0)
        : Math.max(0, todayRows[todayRows.length - 1].total_laps - todayRows[0].total_laps);

    const todayDistanceM = todayLaps * CONFIG.WHEEL_CIRCUMFERENCE_M;

    const last = rows[rows.length - 1] || {};
    const currentRPM = last.rpm ?? 0;

    return {
      todayLaps,
      todayDistanceM,
      currentRPM,
      latestTemp: last.temperature ?? null,
      latestHumidity: last.humidity ?? null,
      latestLux: last.lux ?? null,
      isRunning: currentRPM > 0,
    };
  }

  async function fetchData() {
    const url =
      'https://docs.google.com/spreadsheets/d/' +
      CONFIG.SHEET_ID +
      '/export?format=csv&t=' + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCsv(text);
    computeRpm(rows);
    const stats = computeStats(rows);
    const hourly = buildHourly(rows);
    const daily = buildDaily(rows);
    return { rows, stats, hourly, daily };
  }

  window.fetchData = fetchData;
})();

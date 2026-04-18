# Sugar Glider Dashboard — Design Spec

Date: 2026-04-19

## Overview

A static single-page dashboard for monitoring a sugar glider's wheel activity. An ESP32-C3 writes sensor data to Google Sheets every 15–30 seconds. The frontend fetches that data directly via the Sheets CSV export endpoint and visualises it with ApexCharts.

Deployed to GitHub Pages at `stanley1106.github.io/glider-dashboard/`.

---

## Data Source

**Sheet ID:** `1l9vBwJzPTvK92EEH6kpATD931HEwnUBS5EsA78xBWZc`

**Fetch URL:**
```
https://docs.google.com/spreadsheets/d/1l9vBwJzPTvK92EEH6kpATD931HEwnUBS5EsA78xBWZc/export?format=csv
```

No Apps Script proxy needed — the CSV export endpoint allows cross-origin requests for publicly shared sheets.

### Column Schema

| Col | Name | Type | Notes |
|-----|------|------|-------|
| A | `timestamp` | datetime string | Taiwan time (UTC+8) |
| B | `total_laps` | integer | **Cumulative** total since device start |
| C | `temperature` | float | °C |
| D | `humidity` | float | % RH |
| E | `lux` | float | Illuminance |

### Derived Metrics (computed in `data.js`)

- **Laps in period** = `total_laps[end] - total_laps[start]`
- **Per-row RPM** = `(total_laps[i] - total_laps[i-1]) / elapsed_minutes`
- **Hourly bucket laps** = sum of lap deltas within each clock hour
- **Daily total laps** = `total_laps[last row of day] - total_laps[first row of day]`
- **Distance** = laps_in_period × `WHEEL_CIRCUMFERENCE_M` (default 0.88 m)

---

## File Structure

```
glider-dashboard/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── config.js
    ├── data.js
    ├── charts.js
    └── app.js
```

No build step. All scripts loaded as plain `<script>` tags. GitHub Pages serves directly.

---

## Configuration (`js/config.js`)

```js
const CONFIG = {
  SHEET_ID: '1l9vBwJzPTvK92EEH6kpATD931HEwnUBS5EsA78xBWZc',
  WHEEL_CIRCUMFERENCE_M: 0.88,
  UPLOAD_INTERVAL_S: 30,
  REFRESH_INTERVAL_MS: 10000,
  COMFORT_TEMP_MIN: 24,
  COMFORT_TEMP_MAX: 27,
};
```

---

## Modules

### `data.js`

Exposes global async function (plain script tag, no ES modules):

```js
async function fetchData()
// Returns: { rows, stats, hourly, daily }
```

- Fetches CSV, parses into row objects
- Computes per-row RPM and lap deltas
- Builds hourly buckets `[0..23]` and daily totals `[{date, laps}]`
- "Today" is defined as the current calendar date in Taiwan time (UTC+8)
- `stats`: `{ todayLaps, todayDistanceM, currentRPM, latestTemp, latestHumidity, latestLux, isRunning }`
  - `currentRPM`: RPM of the most recent interval (last two rows)
  - `isRunning`: true if `currentRPM > 0`

### `charts.js`

```js
function initCharts()      // creates all 5 ApexCharts instances (empty series) on first load
function updateCharts(data, range)  // calls .updateSeries() on each chart
```

Charts:
1. **RPM area** — time series, gradient fill, zoom+pan, default 6h window
2. **Hourly activity** — bar chart, x-axis 0–23
3. **Light vs RPM** — dual-axis line, lux on right axis, RPM on left
4. **Temp & Humidity** — dual-axis line, comfort band (24–27°C) as annotation
5. **Daily totals** — bar chart, x-axis by date

### `app.js`

- On load: `initCharts()`, then `fetchData()` + `updateCharts()` + update stat cards
- Sets `setInterval` at 10 000 ms to repeat fetch + update
- Updates "last updated" timestamp display on each refresh
- Handles time-range buttons (Today / 7d / 30d / All) — filters data before passing to `updateCharts()`

---

## Page Layout

### Header bar
- Left: title "Sugar Glider Dashboard" + "last updated HH:MM:SS"
- Right: `● running` / `○ sleeping` status pill + time-range buttons (Today / 7d / 30d / All)

### Stat cards (5, horizontal row, stack on mobile)
1. Today Laps
2. Today Distance (show as km with 2 decimals if ≥ 1000 m, otherwise m)
3. Current RPM
4. Temp / Humidity (combined card)
5. Light (lux)

### Charts (full width unless noted)
1. RPM over time — full width
2. Hourly activity + Light vs RPM — 2-col grid
3. Temp & Humidity + Daily totals — 2-col grid

### Footer
- "ESP32-C3 + Reed Switch + Google Sheets"
- Link to GitHub repo

---

## Visual Design

- **Background:** `#0a0f0a`
- **Surface (cards/charts):** `#0d120d`
- **Border:** `#1a2a1a`
- **Accent:** `#39d353` (neon green)
- **Text primary:** `#e5e7eb`
- **Text muted:** `#6b7280`
- **Chart secondary colors:** `#fbbf24` (lux), `#f87171` (temperature), `#60a5fa` (humidity)

Responsive: stat cards collapse to 2-col on tablet, 1-col on mobile. Chart grid collapses to single column below 640px.

---

## Error Handling

- If fetch fails: show a non-blocking error banner ("Unable to fetch data — retrying in 10s"), keep stale data displayed
- If sheet is empty or has no rows after header: show "No data yet" state in each chart
- Parse errors (malformed CSV row): skip the row, log to console

---

## Deployment

GitHub Pages from `main` branch root. No build step required. `.superpowers/` added to `.gitignore`.

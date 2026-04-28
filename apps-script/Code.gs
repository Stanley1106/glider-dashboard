const LIVE_DAYS = 2;
const HR_DAYS = 31;

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['timestamp', 'laps_delta', 'temperature', 'humidity', 'lux', 'n']);
  }
  return sheet;
}

function isoHourStart(ts) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 19); // "2025-04-28T14:00:00"
}

function isoDayStart(ts) {
  return new Date(ts).toISOString().slice(0, 10); // "2025-04-28"
}

function doGet(e) {
  const p = e.parameter;
  const ts   = p.ts ? new Date(p.ts) : new Date();
  const laps = Math.max(0, Number(p.laps_delta  ?? 0));
  const temp = Number(p.temperature ?? 0);
  const hum  = Number(p.humidity    ?? 0);
  const lux  = Number(p.lux         ?? 0);

  // 1. live — raw rows, keep 2 days
  const live = getOrCreateSheet('live');
  live.appendRow([ts.toISOString(), laps, temp, hum, lux, 1]);
  pruneSheet(live, LIVE_DAYS);

  // 2. hr_summary — hourly aggregate, keep 31 days
  const hr = getOrCreateSheet('hr_summary');
  upsertAggregate(hr, isoHourStart(ts), laps, temp, hum, lux);
  pruneSheet(hr, HR_DAYS);

  // 3. daily_summary — daily aggregate, keep forever
  const daily = getOrCreateSheet('daily_summary');
  upsertAggregate(daily, isoDayStart(ts), laps, temp, hum, lux);

  return ContentService.createTextOutput('OK');
}

// Find matching key row and update incrementally; append if not found.
function upsertAggregate(sheet, key, laps, temp, hum, lux) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).slice(0, key.length) !== key) continue;
    const n    = Number(data[i][5]);
    const newN = n + 1;
    sheet.getRange(i + 1, 2, 1, 5).setValues([[
      Number(data[i][1]) + laps,
      (Number(data[i][2]) * n + temp) / newN,
      (Number(data[i][3]) * n + hum)  / newN,
      (Number(data[i][4]) * n + lux)  / newN,
      newN,
    ]]);
    return;
  }
  sheet.appendRow([key, laps, temp, hum, lux, 1]);
}

// Delete rows older than `days` days (assumes data is in ascending order).
function pruneSheet(sheet, days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const data = sheet.getDataRange().getValues();
  let lastOldRow = 0;
  for (let i = 1; i < data.length; i++) {
    if (new Date(data[i][0]) < cutoff) lastOldRow = i + 1;
    else break;
  }
  if (lastOldRow > 1) sheet.deleteRows(2, lastOldRow - 1);
}

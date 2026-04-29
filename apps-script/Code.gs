const LIVE_DAYS = 2;
const HR_DAYS = 31;

const TZ = 'Asia/Taipei';

function getOrCreateSheet(name, headers, textKeyColumn) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    if (textKeyColumn) sheet.getRange('A:A').setNumberFormat('@');
  }
  return sheet;
}

// Prefix keeps Sheets from auto-parsing the cell as a Date.
function hrKey(ts) {
  return 'h_' + Utilities.formatDate(new Date(ts), TZ, "yyyy-MM-dd'T'HH");
}

function dayKey(ts) {
  return 'd_' + Utilities.formatDate(new Date(ts), TZ, 'yyyy-MM-dd');
}

function doGet(e) {
  const p = e.parameter;
  const ts   = p.ts ? new Date(p.ts) : new Date();
  const laps = Math.max(0, Number(p.laps_delta  ?? 0));
  const temp = Number(p.temperature ?? 0);
  const hum  = Number(p.humidity    ?? 0);
  const lux  = Number(p.lux         ?? 0);

  const live = getOrCreateSheet('live', ['timestamp', 'laps_delta', 'temperature', 'humidity', 'lux']);
  live.appendRow([ts, laps, temp, hum, lux]);
  pruneSheet(live, LIVE_DAYS);

  const hr = getOrCreateSheet('hr_summary', ['timestamp', 'laps_delta', 'temperature', 'humidity', 'lux', 'n'], true);
  upsertAggregate(hr, hrKey(ts), laps, temp, hum, lux);
  pruneSheet(hr, HR_DAYS);

  const daily = getOrCreateSheet('daily_summary', ['timestamp', 'laps_delta', 'temperature', 'humidity', 'lux', 'n'], true);
  upsertAggregate(daily, dayKey(ts), laps, temp, hum, lux);

  return ContentService.createTextOutput('OK');
}

function upsertAggregate(sheet, key, laps, temp, hum, lux) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== key) continue;
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

function rowDate(cellValue) {
  if (cellValue instanceof Date) return cellValue;
  const s = String(cellValue);
  if (s.startsWith('h_')) return new Date(s.slice(2) + ':00:00+08:00');
  if (s.startsWith('d_')) return new Date(s.slice(2) + 'T00:00:00+08:00');
  return new Date(s);
}

function pruneSheet(sheet, days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const data = sheet.getDataRange().getValues();
  let lastOldRow = 0;
  for (let i = 1; i < data.length; i++) {
    if (rowDate(data[i][0]) < cutoff) lastOldRow = i + 1;
    else break;
  }
  if (lastOldRow > 1) sheet.deleteRows(2, lastOldRow - 1);
}

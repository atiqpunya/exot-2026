const SPREADSHEET_ID = "1JJ73JAySBRhHWohi0ICb7rIAXTCigEzDT4IY8yttogw";

// ==========================================
// MAIN LOGIC
// ==========================================

function openSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doGet(e) {
  const action = e.parameter ? e.parameter.action : null;
  if (action === 'getData') return responseJSON(getAllData());
  return responseJSON({ error: 'Invalid action' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'sync') return responseJSON(syncData(data.payload));
    
    return responseJSON({ error: 'Invalid action' });
  } catch (error) {
    return responseJSON({ error: error.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// CORE LOGIC (TABLE FORMAT)
// ==========================================

function getAllData() {
  const ss = openSpreadsheet();
  const sheets = ['Users', 'Students', 'Classes', 'Settings'];
  const result = {};

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      result[name.toLowerCase()] = [];
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      result[name.toLowerCase()] = name === 'Settings' ? {} : [];
      return;
    }

    const headers = data[0];
    const rows = data.slice(1);
    const objects = rows.map(row => unflattenRow(row, headers));

    if (name === 'Settings') {
      result[name.toLowerCase()] = objects[0] || {};
    } else if (name === 'Classes') {
        result[name.toLowerCase()] = objects.map(o => o.value);
    } else {
      result[name.toLowerCase()] = objects;
    }
  });

  return result;
}

function syncData(payload) {
  const ss = openSpreadsheet();
  
  Object.keys(payload).forEach(key => {
    const sheetName = key.charAt(0).toUpperCase() + key.slice(1);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    
    let data = payload[key];
    if (!data) return;

    if (key === 'classes') data = data.map(c => ({ value: c }));
    if (key === 'settings') data = [data];

    if (data.length === 0) {
        sheet.clear();
        return;
    }

    const flatData = data.map(item => flattenObject(item));
    const headers = Array.from(new Set(flatData.flatMap(Object.keys))).sort();
    
    const matrix = [headers];
    flatData.forEach(obj => {
      const row = headers.map(h => obj[h] === undefined ? "" : obj[h]);
      matrix.push(row);
    });

    sheet.clear();
    if (matrix.length > 0) {
      sheet.getRange(1, 1, matrix.length, matrix[0].length).setValues(matrix);
      sheet.getRange(1, 1, 1, matrix[0].length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
  });

  return { success: true };
}

function flattenObject(obj, prefix = '', res = {}) {
  for (let key in obj) {
    let val = obj[key];
    let newKey = prefix ? prefix + '.' + key : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      flattenObject(val, newKey, res);
    } else {
      res[newKey] = val;
    }
  }
  return res;
}

function unflattenRow(row, headers) {
  const result = {};
  row.forEach((cell, i) => {
    const header = headers[i];
    if (cell === "" || cell === null) return;
    const parts = header.split('.');
    let current = result;
    for (let j = 0; j < parts.length - 1; j++) {
      current[parts[j]] = current[parts[j]] || {};
      current = current[parts[j]];
    }
    current[parts[parts.length - 1]] = cell;
  });
  return result;
}

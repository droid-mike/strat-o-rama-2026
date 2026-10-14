'use strict';

const fs = require('fs');

function parseCsvLine(line) {
  const out = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cell); cell = ''; }
    else cell += ch;
  }
  out.push(cell);
  return out;
}

function readCsv(path, requiredHeader) {
  const lines = fs.readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.length > 0);

  let headerIndex = 0;
  if (requiredHeader) {
    headerIndex = lines.findIndex(line => parseCsvLine(line).includes(requiredHeader));
    if (headerIndex < 0) throw new Error(`Could not find CSV header containing ${requiredHeader} in ${path}`);
  }
  const headers = parseCsvLine(lines[headerIndex]);
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const vals = parseCsvLine(line);
    if (!vals.some(v => v !== '')) continue;
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    rows.push(row);
  }
  return rows;
}

module.exports = { readCsv, parseCsvLine };

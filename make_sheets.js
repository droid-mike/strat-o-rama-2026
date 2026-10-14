'use strict';
const fs = require('fs');
const path = require('path');

const CARD_W = 216;
const CARD_H = 360;
const PAGE_W = 792; // US Letter landscape
const PAGE_H = 612;
const COLS = 3;
const ROWS = 2;
const PER_PAGE = COLS * ROWS;
const MARGIN = 18;
const GAP_X = 12;
const GAP_Y = 12;

function slug(s){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').toLowerCase();
}

function usage() {
  console.log('Usage:');
  console.log('  node make_sheets.js [inputDir] [outputPdf]');
  console.log('  node make_sheets.js [inputDir] [outputPdf] --list roster.txt');
  console.log('Examples:');
  console.log('  node make_sheets.js players print_sheets_6up.pdf');
  console.log('  node make_sheets.js players game5_print.pdf --list rosters/game5_all.txt');
}

function readRoster(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map(x => x.trim())
    .filter(x => x && !x.startsWith('#'))
    .map(line => {
      const m=line.match(/^([A-Z]{2,3})\|(.*)$/);
      return m ? m[2].trim() : line;
    });
}

function listPdfs(dir, rosterFile) {
  if (!rosterFile) {
    return fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
      .map(f => path.join(dir, f));
  }

  const names = readRoster(rosterFile);
  const pdfs = [];
  const missing = [];
  for (const name of names) {
    const file = path.join(dir, `${slug(name)}.pdf`);
    if (fs.existsSync(file)) pdfs.push(file);
    else missing.push(name);
  }
  if (missing.length) {
    console.warn(`Missing ${missing.length} card(s):`);
    missing.forEach(n => console.warn(`  - ${n}`));
  }
  return pdfs;
}

function extractFirstStream(pdfPath) {
  const raw = fs.readFileSync(pdfPath, 'binary');
  const match = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!match) throw new Error(`Could not find page content stream in ${pdfPath}`);
  return match[1];
}

function paginate(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildPageStream(streams) {
  const slotW = (PAGE_W - 2 * MARGIN - (COLS - 1) * GAP_X) / COLS;
  const slotH = (PAGE_H - 2 * MARGIN - (ROWS - 1) * GAP_Y) / ROWS;
  const scale = Math.min(slotW / CARD_W, slotH / CARD_H);
  const placed = [];

  streams.forEach((stream, i) => {
    const col = i % COLS;
    const rowFromTop = Math.floor(i / COLS);
    const x0 = MARGIN + col * (slotW + GAP_X);
    const yTopDown = MARGIN + rowFromTop * (slotH + GAP_Y);
    const y0 = PAGE_H - yTopDown - slotH;
    const tx = x0 + (slotW - CARD_W * scale) / 2;
    const ty = y0 + (slotH - CARD_H * scale) / 2;
    placed.push(`q\n${scale.toFixed(6)} 0 0 ${scale.toFixed(6)} ${tx.toFixed(3)} ${ty.toFixed(3)} cm\n${stream}\nQ`);
  });
  return placed.join('\n');
}

function buildPdf(pageStreams, outPath) {
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = [];
  let nextObj = 5;
  for (let i = 0; i < pageStreams.length; i++) {
    const pageObj = nextObj++;
    const contentObj = nextObj++;
    kids.push(`${pageObj} 0 R`);
    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
    const stream = pageStreams[i];
    objects[contentObj] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageStreams.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  const maxObj = objects.length - 1;
  for (let i = 1; i <= maxObj; i++) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i++) pdf += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(outPath, pdf, 'binary');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { usage(); return; }

  const listAt = args.indexOf('--list');
  const rosterFile = listAt >= 0 ? args[listAt + 1] : null;
  const positional = listAt >= 0 ? args.slice(0, listAt) : args;
  const inputDir = positional[0] || 'players';
  const outputPdf = positional[1] || 'print_sheets_6up.pdf';

  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) throw new Error(`Input directory not found: ${inputDir}`);
  if (rosterFile && !fs.existsSync(rosterFile)) throw new Error(`Roster list not found: ${rosterFile}`);

  const pdfs = listPdfs(inputDir, rosterFile);
  if (!pdfs.length) throw new Error(`No matching PDF files found in ${inputDir}`);
  const pages = paginate(pdfs.map(extractFirstStream), PER_PAGE).map(buildPageStream);
  buildPdf(pages, outputPdf);
  console.log(`Created ${outputPdf} with ${pdfs.length} cards on ${pages.length} sheet(s).`);
}

main();

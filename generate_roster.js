'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readRoster(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map(x => x.trim()).filter(x => x && !x.startsWith('#'))
    .map(line => {
      const m=line.match(/^([A-Z]{2,3})\|(.*)$/);
      return m ? {team:m[1], name:m[2].trim()} : {team:null, name:line};
    });
}

const roster = process.argv[2];
if (!roster) {
  console.log('Usage: node generate_roster.js rosters/game5_all.txt');
  console.log('Roster lines may optionally use TEAM|Player Name, e.g. CHW|Tommy Pham');
  process.exit(1);
}
if (!fs.existsSync(roster)) throw new Error(`Roster list not found: ${roster}`);

const entries = readRoster(roster);
let made = 0, failed = 0;
for (const entry of entries) {
  const appArgs=[path.join(__dirname, 'app.js'), entry.name];
  if(entry.team) appArgs.push('--team',entry.team);
  const r = spawnSync(process.execPath, appArgs, { cwd: __dirname, encoding: 'utf8' });
  if (r.status === 0 && !/Could not build card/.test((r.stdout || '') + (r.stderr || ''))) {
    made++;
    const lines = (r.stdout || '').trim().split(/\r?\n/);
    console.log(lines[lines.length - 1] || entry.name);
  } else {
    failed++;
    console.warn(`FAILED: ${entry.name}`);
    if (r.stdout) console.warn(r.stdout.trim());
    if (r.stderr) console.warn(r.stderr.trim());
  }
}
console.log(`Generated ${made} card(s); ${failed} failed.`);
process.exit(failed ? 2 : 0);

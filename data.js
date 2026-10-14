'use strict';

const path = require('path');
const cfg = require('./config');
const { readCsv } = require('./csv');

const POSITIONS = { '1':'P', '2':'C', '3':'1B', '4':'2B', '5':'3B', '6':'SS', '7':'LF', '8':'CF', '9':'RF' };
const AGG_TEAMS = /^(TOT|\d+TM|\d+LG)$/;

function n(v) {
  const x = Number(String(v ?? '').replace('%',''));
  return Number.isFinite(x) ? x : 0;
}

function cleanDisplayName(name) {
  return String(name ?? '')
    .replace(/[\*#?]+$/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function keyName(name) {
  return cleanDisplayName(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}

function modernPosToOld(pos) {
  const raw = String(pos ?? '');
  const list = [];
  for (const ch of raw) {
    const p = POSITIONS[ch];
    if (p && !list.includes(p)) list.push(p);
  }
  // B-Ref's fielding table should give numeric position codes. Keep a legacy fallback.
  if (!list.length && /^[A-Z0-9-]+$/.test(raw)) return raw.replace(/^\*/,'');
  return list.join('-') || 'DH';
}

function normalizeCommon(row) {
  const r = { ...row };
  if (r.Player !== undefined && r.Name === undefined) r.Name = r.Player;
  if (r.Team !== undefined && r.Tm === undefined) r.Tm = r.Team;
  if (r.GIDP !== undefined && r.GDP === undefined) r.GDP = r.GIDP;
  if (r.Pos !== undefined && r.PosSummary === undefined) r.PosSummary = modernPosToOld(r.Pos);
  r.Name = cleanDisplayName(r.Name);
  r._nameKey = keyName(r.Name);
  r._id = r['Player-additional'] || r['Name-additional'] || r['-9999'] || '';
  return r;
}

function root(p) { return path.resolve(__dirname, p); }

const batting = readCsv(root(cfg.standardBattingPath), 'Player').map(normalizeCommon)
  .filter(r => r._nameKey && r.Name !== 'MLB Average');
const pitching = readCsv(root(cfg.standardPitchingPath), 'Player').map(normalizeCommon)
  .filter(r => r._nameKey && r.Name !== 'MLB Average');
const fielding = readCsv(root(cfg.standardFieldingPath), 'Player').map(normalizeCommon)
  .filter(r => r._nameKey && r.Name !== 'MLB Average');
const against = readCsv(root(cfg.battingPitchingPath), 'Name').map(normalizeCommon)
  .filter(r => r._nameKey);

function bestSeasonRow(rows, measure) {
  if (!rows.length) return undefined;
  const agg = rows.filter(r => AGG_TEAMS.test(r.Tm));
  const pool = agg.length ? agg : rows;
  return [...pool].sort((a,b) => n(b[measure]) - n(a[measure]))[0];
}

function rowsForPlayer(table, token) {
  const key = keyName(token);
  let rows = table.filter(r => r._nameKey === key);
  if (rows.length) return rows;
  // Also permit exact Baseball-Reference player id.
  rows = table.filter(r => r._id && r._id.toLowerCase() === String(token).toLowerCase());
  return rows;
}

function latestTeamCode(...groups) {
  // Baseball-Reference lists an aggregate TOT/2TM row followed by the
  // individual team stints in chronological order.  The last real team row
  // is therefore the player's latest team, which is much more useful on a
  // printed card than "2TM".
  for (const rows of groups) {
    const real = (rows || []).filter(r => r.Tm && !AGG_TEAMS.test(r.Tm));
    if (real.length) return real[real.length - 1].Tm;
  }
  return '';
}

function findBundle(token) {
  const frows = rowsForPlayer(fielding, token);
  const brows = rowsForPlayer(batting, token);
  const prows = rowsForPlayer(pitching, token);
  const arows = rowsForPlayer(against, token);

  const any = frows[0] || brows[0] || prows[0] || arows[0];
  if (!any) return undefined;
  const id = any._id;
  const byId = (table, fallbackRows) => id ? table.filter(r => r._id === id) : fallbackRows;
  const ff = byId(fielding, frows), bb = byId(batting, brows), pp = byId(pitching, prows), aa = byId(against, arows);

  return {
    id,
    name: any.Name,
    teamCode: latestTeamCode(ff, bb, pp, aa),
    fielding: bestSeasonRow(ff, 'Inn'),
    batting: bestSeasonRow(bb, 'PA'),
    pitching: bestSeasonRow(pp, 'BF'),
    against: bestSeasonRow(aa, 'PA')
  };
}

function teamRoster(team) {
  const seen = new Set();
  const result = [];
  for (const r of fielding) {
    if (r.Tm !== team) continue;
    const id = r._id || r._nameKey;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ id: r._id, name: r.Name });
  }
  return result;
}

function leagueAverages() {
  let alH=0, alAB=0, nlH=0, nlAB=0, mlbH=0, mlbAB=0;
  // Exclude aggregate rows so team stints are summed exactly once.
  for (const r of batting) {
    if (AGG_TEAMS.test(r.Tm)) continue;
    const h=n(r.H), ab=n(r.AB);
    mlbH += h; mlbAB += ab;
    if (r.Lg === 'AL') { alH += h; alAB += ab; }
    if (r.Lg === 'NL') { nlH += h; nlAB += ab; }
  }
  return {
    AL: alAB ? alH/alAB : 0.244,
    NL: nlAB ? nlH/nlAB : 0.244,
    MLB: mlbAB ? mlbH/mlbAB : 0.244
  };
}

module.exports = { n, findBundle, teamRoster, leagueAverages, modernPosToOld, keyName };

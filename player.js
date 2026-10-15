'use strict';

const { n, findBundle, leagueAverages, modernPosToOld } = require('./data');
const avgs = leagueAverages();

function round(x) { return Math.round(Number.isFinite(x) ? x : 0); }
function clamp0(x) { return Math.max(0, Number.isFinite(x) ? x : 0); }
function denBat(r) { return n(r.AB) + (n(r.BB) - n(r.IBB)) + n(r.HBP); }
function safeDiv(a,b) { return b ? a/b : 0; }

function battingCardStats(r) {
  const den = denBat(r);
  const walks = round(clamp0(safeDiv((n(r.BB)-n(r.IBB))*216, den) - 9));
  const hbp = round(clamp0(safeDiv(n(r.HBP)*216, den)));
  const ba = n(r.BA);
  const lgBase = r.Lg === 'AL' ? avgs.AL : r.Lg === 'NL' ? avgs.NL : avgs.MLB;
  const leagueBA = lgBase + 0.011;
  const hitChances = round(clamp0(((ba - leagueBA) + ba) * (108 - (walks + hbp))));
  const doubles = round(clamp0(safeDiv(4320*n(r['2B']), den) - 90));
  const triples = round(clamp0(safeDiv(4320*n(r['3B']), den) - 15));
  const homers = round(clamp0(safeDiv(4320*n(r.HR), den) - 50));
  const strikeouts = round(clamp0(safeDiv(n(r.SO)*216, den) - 17));
  const gba = round(clamp0(safeDiv(1140*n(r.GDP), den)));
  const gbb = round(clamp0(31 - gba));
  const sb = n(r.SB);
  let steal = 'E', run = '1-9';
  if (sb >= 90) { steal='AAA'; run='1-19'; }
  else if (sb >= 35) { steal='AA'; run='1-18'; }
  else if (sb >= 24) { steal='A'; run='1-17'; }
  else if (sb >= 10) { steal='B'; run='1-15'; }
  else if (sb >= 6) { steal='C'; run='1-13'; }
  else if (sb >= 3) { steal='D'; run='1-10'; }

  return {
    avg: ba, ab: n(r.AB), doubles:n(r['2B']), triples:n(r['3B']), homeruns:n(r.HR), rbi:n(r.RBI),
    som_hr: homers,
    som_triple: triples,
    som_double: doubles,
    som_single: hitChances * 20,
    som_walk: walks * 20,
    som_hbp: hbp * 20,
    som_strikeout: strikeouts * 20,
    som_flyb: 11 * 20,
    som_flya: (homers >= 120 ? 1 : 0) * 20,
    som_gba: gba * 20,
    som_gbb: gbb * 20,
    som_steal: steal,
    som_run: run
  };
}

function pitcherCardStats(record, against) {
  const bf=n(record.BF), ibb=n(record.IBB), ip=n(record.IP), pa=n(against.PA), aibb=n(against.IBB);
  const pden = Math.max(1, bf-ibb), aden=Math.max(1, pa-aibb);
  return {
    W:n(record.W), L:n(record.L), ERA:record.ERA, IP:record.IP, SO:n(record.SO),
    som_walk: clamp0(safeDiv((n(record.BB)-ibb)*216,pden)-9)*20,
    som_single: clamp0(safeDiv(n(record.H)*216,bf)-29.4+4.9)*20,
    som_double: clamp0(safeDiv(n(against['2B'])*216,aden)-90)*20,
    som_triple: clamp0(safeDiv(n(against['3B'])*216,aden)-15)*20,
    som_hr: clamp0(safeDiv(n(against.HR)*216,aden)-50)*20,
    som_strikeout: clamp0(safeDiv(n(record.SO)*216,pden)-16)*20,
    'som_gb-ss':140, 'som_gb-2b':120, 'som_gb-cf':60, 'som_gb-3b':60,
    'som_fly-lf':40, 'som_fly-rf':40,
    som_errors:120,
    som_balks: clamp0(safeDiv(n(record.BK)*290,ip))*20,
    som_wild: clamp0(safeDiv(n(record.WP)*200,ip))*20,
    role: (n(record.SV) > 0 && n(record.GS) < n(record.G)/2) ? 'relief' : 'starter'
  };
}

function getPlayer(token, pitcherBattingFlag) {
  const bundle = findBundle(token);
  if (!bundle) return undefined;

  // Some players (especially DH-only players) may have no row in the
  // Baseball-Reference fielding export.  Fall back to the batting row for
  // position information so they can still receive a card.
  const positionRow = bundle.fielding || bundle.batting || bundle.pitching;
  if (!positionRow) return undefined;
  const positions = modernPosToOld(positionRow.Pos || positionRow.PosSummary).split('-');
  const isPitcher = positions.includes('P') && pitcherBattingFlag !== '-b';
  if (isPitcher) {
    if (!bundle.pitching || !bundle.against) return undefined;
    return { name:bundle.name, id:bundle.id, teamCode:bundle.teamCode, positions, isPitcher:true, ...pitcherCardStats(bundle.pitching, bundle.against) };
  }
  if (!bundle.batting) return undefined;
  return { name:bundle.name, id:bundle.id, teamCode:bundle.teamCode, positions, isPitcher:false, ...battingCardStats(bundle.batting) };
}

getPlayer.leagueAverages = avgs;
module.exports = getPlayer;

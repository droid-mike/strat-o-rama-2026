'use strict';
const fs=require('fs'); const path=require('path'); const cfg=require('./config'); const data=require('./data');
console.log('Strat-O-Rama 2026 data validation');
for(const [k,v] of Object.entries(cfg)) if(k.endsWith('Path')) console.log(`${k}: ${fs.existsSync(path.resolve(__dirname,v))?'OK':'MISSING'} (${v})`);
const a=data.leagueAverages(); console.log(`AL BA ${a.AL.toFixed(4)}  NL BA ${a.NL.toFixed(4)}  MLB BA ${a.MLB.toFixed(4)}`);
for(const t of ['CLE','DET']) console.log(`${t} fielding-table roster entries: ${data.teamRoster(t).length}`);
for(const name of ['José Ramírez','Tanner Bibee']){
  const b=data.findBundle(name); console.log(`${name}: ${b?'FOUND':'NOT FOUND'}${b?` id=${b.id} fielding=${!!b.fielding} batting=${!!b.batting} pitching=${!!b.pitching} against=${!!b.against}`:''}`);
}

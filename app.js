'use strict';
const fs=require('fs'); const path=require('path');
const getPlayer=require('./player'); const getCard=require('./card'); const {renderCard}=require('./pdf'); const team=require('./team');
function slug(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').toLowerCase();}

const args=process.argv.slice(2);
const arg=args[0];
const battingFlag=args.includes('-b') ? '-b' : undefined;
const teamAt=args.indexOf('--team');
const teamOverride=teamAt>=0 ? String(args[teamAt+1]||'').toUpperCase() : undefined;
if(!arg){console.log('Usage: node app.js "Player Name" [-b] [--team CHW]  OR  node app.js CLE');process.exit(1);}
console.log(`League batting averages from data: AL ${getPlayer.leagueAverages.AL.toFixed(3)}, NL ${getPlayer.leagueAverages.NL.toFixed(3)}, MLB ${getPlayer.leagueAverages.MLB.toFixed(3)}`);

function one(name,dir,override){
  const p=getPlayer(name,battingFlag); if(!p){console.warn(`Could not build card for ${name}`);return false;}
  if(override && team.teamList[override]) p.teamCode=override;
  const c=getCard(p); const outDir=path.resolve(__dirname,dir); fs.mkdirSync(outDir,{recursive:true}); const file=path.join(outDir,`${slug(p.name)}.pdf`); renderCard(p,c,file); console.log(`${p.name}: ${file}`); return true;
}
if(team.teamList[arg]){
  const dir=slug(team.teamList[arg]); const roster=team.playerList(arg); let made=0;
  for(const name of roster) if(one(name,dir,arg)) made++;
  console.log(`Generated ${made} cards for ${arg}. Note: team mode includes anyone who appeared for the team in the regular-season fielding table.`);
}else one(arg,'players',teamOverride);

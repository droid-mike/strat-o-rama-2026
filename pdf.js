'use strict';
const fs=require('fs');
const {teamList}=require('./team');

function esc(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[^\x20-\x7E]/g,'');}

function compact(s){
  return String(s)
    .replace(/HOMERUN/g,'HR').replace(/SINGLE/g,'1B').replace(/DOUBLE/g,'2B').replace(/TRIPLE/g,'3B')
    .replace(/WALK/g,'BB').replace(/strikeout/g,'K')
    .replace(/lineout into as many outs as possible/g,'LO-DP')
    .replace(/groundball\(ss\)A/g,'gbSS-A').replace(/groundball\(2b\)C/g,'gb2B-C')
    .replace(/flyball\(cf\)C/g,'fbCF-C').replace(/flyball\(lf\)C/g,'fbLF-C').replace(/flyball\(rf\)C/g,'fbRF-C')
    .replace(/ground ball A/g,'gbA').replace(/ground ball B/g,'gbB')
    .replace(/flyball A/g,'fbA').replace(/flyball B/g,'fbB')
    .replace(/popout\(([^)]+)\)/g,'pop$1').replace(/1 base error/g,'E1').replace(/wild pitch/g,'WP').replace(/foulout/g,'FO');
}

function makePdf(lines,outfile){
  const content=[];
  const T=(x,y,size,text,bold=false)=>content.push(`BT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`);
  const L=(x1,y1,x2,y2)=>content.push(`${x1} ${y1} m ${x2} ${y2} l S`);

  // Header: prioritize player/team identification when cards get mixed up.
  T(16,343,13.5,lines.playerName,true);
  T(16,329,9.2,lines.teamName,true);
  T(16,317,7.2,`${lines.positions}   Stat-O-Rama 2026`);

  L(14,306,202,306); L(14,66,202,66); L(77,66,77,306); L(140,66,140,306);

  // Give rows with two or three result lines extra vertical room, while
  // keeping the dice totals aligned across all three columns.
  const rowHeights=Array.from({length:11},(_,i)=>{
    const maxLines=Math.max(...lines.cols.map(col=>Math.max(1,(col[i] && col[i].text ? col[i].text.length : 1))));
    return 15.5 + (maxLines-1)*7.0;
  });
  for(let c=0;c<3;c++){
    const x=18+c*63;
    T(x,293,11.5,String(lines.columnLabels[c]),true);
    let y=278;
    lines.cols[c].forEach((row,i)=>{
      T(x,y,8.2,row.roll,true);
      const bits=Array.isArray(row.text)?row.text:[row.text];
      bits.slice(0,3).forEach((bit,j)=>T(x+16,y-j*7.4,6.8,bit));
      y-=rowHeights[i];
    });
  }

  // Larger, split footer statistics for readability.
  T(16,51,7.8,lines.footer1,true);
  T(16,38,7.8,lines.footer2);
  T(16,25,7.8,lines.footer3 || '');

  const stream=content.join('\n');
  const objs=[];
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objs[3]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 216 360] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>';
  objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objs[6]=`<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}\nendstream`;
  let pdf='%PDF-1.4\n', offsets=[0];
  for(let i=1;i<=6;i++){ offsets[i]=Buffer.byteLength(pdf,'ascii'); pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref=Buffer.byteLength(pdf,'ascii');
  pdf+='xref\n0 7\n0000000000 65535 f \n';
  for(let i=1;i<=6;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(outfile,pdf,'binary');
}

function renderCard(player,cells,outfile){
  const cols=[[],[],[]];
  for(const c of cells) cols[c.col-1].push({roll:`${c.roll}-`,text:c.parts.map(compact)});
  const positions=player.positions.join('/');
  const teamName=teamList[player.teamCode] || player.teamCode || 'MLB';
  let f1,f2,f3;
  if(player.isPitcher){
    f1=`W ${player.W}   L ${player.L}   ERA ${player.ERA}`;
    f2=`IP ${player.IP}   SO ${player.SO}`;
    f3=`Role: ${player.role}`;
  } else {
    f1=`AVG ${Number(player.avg).toFixed(3)}   AB ${player.ab}   HR ${player.homeruns}   RBI ${player.rbi}`;
    f2=`2B ${player.doubles}   3B ${player.triples}`;
    f3=`Stealing ${player.som_steal}   Running ${player.som_run}`;
  }
  makePdf({
    playerName:player.name,
    teamName,
    positions,
    columnLabels:player.isPitcher ? [4,5,6] : [1,2,3],
    cols,footer1:f1,footer2:f2,footer3:f3
  },outfile);
}
module.exports={renderCard};

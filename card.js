'use strict';

const WEIGHTS=[20,40,60,80,100,120,100,80,60,40,20];
function makeCells(){
  const out=[];
  for(let c=1;c<=3;c++) for(let i=0;i<11;i++) out.push({col:c,roll:i+2,capacity:WEIGHTS[i],remaining:WEIGHTS[i],parts:[]});
  return out;
}

function allocate(cells, total, text){
  total=Math.max(0,Math.round(total||0));
  let guard=0;
  while(total>0 && guard++<1000){
    const avail=cells.filter(c=>c.remaining>0);
    if(!avail.length) break;
    const fit=avail.filter(c=>c.remaining<=total);
    let cell;
    if(fit.length){
      const best=Math.max(...fit.map(c=>c.remaining));
      cell=avail.find(c=>c.remaining===best);
    } else {
      const best=Math.min(...avail.map(c=>c.remaining));
      cell=avail.find(c=>c.remaining===best);
    }
    const take=Math.min(total,cell.remaining);
    const usedBefore=cell.capacity-cell.remaining;
    const pip=cell.capacity/20;
    let lo=Math.floor(usedBefore/pip)+1;
    let hi=Math.round((usedBefore+take)/pip);
    lo=Math.max(1,Math.min(20,lo)); hi=Math.max(lo,Math.min(20,hi));
    const suffix=(lo===1&&hi===20)?'':(lo===hi?` ${lo}`:` ${lo}-${hi}`);
    cell.parts.push(`${text}${suffix}`);
    cell.remaining-=take;
    total-=take;
  }
}

function getCard(p){
  if(!p) return undefined;
  const cells=makeCells();
  if(p.isPitcher){
    allocate(cells,p.som_walk,'WALK'); allocate(cells,p.som_single,'SINGLE'); allocate(cells,p.som_strikeout,'strikeout');
    allocate(cells,p['som_gb-ss'],'groundball(ss)A'); allocate(cells,p['som_gb-2b'],'groundball(2b)C');
    allocate(cells,p['som_gb-cf'],'flyball(cf)C'); allocate(cells,p['som_fly-lf'],'flyball(lf)C'); allocate(cells,p['som_fly-rf'],'flyball(rf)C');
    allocate(cells,p.som_hr,'HOMERUN'); allocate(cells,p.som_triple,'TRIPLE'); allocate(cells,p.som_double,'DOUBLE');
    allocate(cells,p.som_errors,'1 base error'); allocate(cells,p.som_balks,'balk'); allocate(cells,p.som_wild,'wild pitch');
    allocate(cells,2160,'foulout');
  } else {
    allocate(cells,p.som_hr,'HOMERUN'); allocate(cells,p.som_triple,'TRIPLE'); allocate(cells,p.som_double,'DOUBLE');
    allocate(cells,p.som_single,'SINGLE'); allocate(cells,p.som_walk,'WALK'); allocate(cells,p.som_strikeout,'strikeout');
    allocate(cells,p.som_flya,'flyball A'); allocate(cells,p.som_flyb,'flyball B'); allocate(cells,20,'lineout into as many outs as possible');
    allocate(cells,p.som_gba,'ground ball A'); allocate(cells,p.som_gbb,'ground ball B');
    for(const label of ['popout(1b)','popout(2b)','popout(3b)','popout(cf)','popout(lf)','popout(rf)']) allocate(cells,100,label);
    allocate(cells,2160,'foulout');
  }
  return cells;
}
module.exports=getCard;

/* Deterministic, count-driven layout. No particle data or physics values are changed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PARTICLE_LAYOUT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const roots = [
    {id:'mesons',label:'Мезоны',subtitle:'Кварк + антикварк',tone:'rose',columns:3},
    {id:'baryons',label:'Барионы',subtitle:'Три валентных кварка',tone:'blue',columns:2},
    {id:'bosons',label:'Бозоны',subtitle:'Переносчики и Хиггс',tone:'gold',columns:1},
    {id:'leptons',label:'Лептоны',subtitle:'Заряженные и нейтрино',tone:'green',columns:2},
    {id:'quarks',label:'Кварки',subtitle:'Шесть ароматов',tone:'purple',columns:2}
  ];
  const families = {
    pion:['Пионы','π · J = 0','rose'],rho:['ρ-мезоны','ρ · J = 1','rose'],isoscalar:['η / η′','Нейтральные состояния','rose'],
    kaon:['Каоны','K · открытая странность','orange'],kstar:['K*-мезоны','Векторные каоны','orange'],phi:['ϕ-мезоны','Скрытая странность','orange'],
    opencharm:['D-мезоны','Открытый charm','violet'],charmonium:['Чармоний','c c̄','violet'],
    nucleon:['Нуклоны','p / n','blue'],lambda:['Λ-семейство','uds','blue'],sigma:['Σ-семейство','uus / uds / dds','blue'],xi:['Ξ-семейство','uss / dss','blue'],omega:['Ω-семейство','sss','blue'],
    charged:['Заряженные','e / μ / τ','green'],neutrino:['Нейтрино','νₑ / νμ / ντ','green'],
    lightquark:['Лёгкие','u / d / s','purple'],heavyquark:['Тяжёлые','c / b / t','purple'],
    massless:['Безмассовые','γ / g','gold'],weakboson:['Электрослабые','W⁻ / Z / W⁺','gold'],higgs:['Хиггс','H · J = 0','gold']
  };
  const preferred = ['pip','pi0','rho0','k0','phi','jpsi','p','lambda','sig0','xi0','omega','em','nue','u','c','gamma','z0','h'];
  function rootFor(p) {
    return ['light','strange','charm'].includes(p.group)?'mesons':roots.some(r=>r.id===p.group)?p.group:'mesons';
  }
  function familyFor(p) {
    // Imported data may supply an explicit family; otherwise use this demo's existing names.
    if(p.family)return String(p.family);
    const id=p.id;
    if(p.group==='light')return id.startsWith('pi')?'pion':id.startsWith('rho')?'rho':'isoscalar';
    if(p.group==='strange')return id.startsWith('kst')?'kstar':id==='phi'?'phi':'kaon';
    if(p.group==='charm')return /psi|jpsi|eta_c/i.test(p.name+' '+id)?'charmonium':'opencharm';
    if(p.group==='baryons')return ['p','n'].includes(id)?'nucleon':id.startsWith('sig')?'sigma':id.startsWith('xi')?'xi':id==='lambda'?'lambda':id==='omega'?'omega':'baryons-other';
    if(p.group==='leptons')return id.startsWith('nu')?'neutrino':'charged';
    if(p.group==='quarks')return ['u','d','s'].includes(id)?'lightquark':'heavyquark';
    return ['g','gamma'].includes(id)?'massless':id==='h'?'higgs':'weakboson';
  }
  function pack(particles) {
    const ordered=[...particles].sort((a,b)=>{
      const rank=p=>{const index=preferred.indexOf(p.id);return index<0?100:index;};
      return rank(a)-rank(b)||Math.abs(a.pdg)-Math.abs(b.pdg)||a.id.localeCompare(b.id);
    });
    // Every sphere has a bounded radius. New states expand rings, rather than shrinking spacing.
    const radius=p=>Math.max(30,Math.min(42,Number(p.r)||34));
    const maxRadius=Math.max(...ordered.map(radius));
    const gap=22,step=2*maxRadius+gap;
    const placed=[];
    if(ordered.length<=3){
      const points=ordered.length===1?[[0,0]]:ordered.length===2?[[-step/2,0],[step/2,0]]:[[-step/2,-step*.32],[step/2,-step*.32],[0,step*.55]];
      ordered.forEach((p,i)=>placed.push({id:p.id,x:points[i][0],y:points[i][1],r:radius(p)}));
    }else if(ordered.length<=6){
      const columns=ordered.length===4?2:3,rows=Math.ceil(ordered.length/columns);
      ordered.forEach((p,i)=>{
        const row=Math.floor(i/columns),count=Math.min(columns,ordered.length-row*columns);
        placed.push({id:p.id,x:(i%columns-(count-1)/2)*step,y:(row-(rows-1)/2)*step,r:radius(p)});
      });
    }else{
      placed.push({id:ordered[0].id,x:0,y:0,r:radius(ordered[0])});
      let index=1,ring=1;
      while(index<ordered.length){
        const distance=ring*step;
        // Chord distance (not arc length) guarantees the gap between adjacent spheres.
        const capacity=Math.max(3,Math.floor(Math.PI/Math.asin(step/(2*distance))));
        const count=Math.min(capacity,ordered.length-index);
        for(let i=0;i<count;i++){
          const p=ordered[index++],angle=-Math.PI/2+i*2*Math.PI/count+(ring%2?.12:0);
          placed.push({id:p.id,x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,r:radius(p)});
        }
        ring++;
      }
    }
    let rx=Math.max(116,...placed.map(p=>Math.abs(p.x)+p.r+24)),ry=Math.max(88,...placed.map(p=>Math.abs(p.y)+p.r+24));
    // Enclose the complete circles, including diagonal extrema, within each island.
    const inside=()=>placed.every(p=>Array.from({length:24},(_,i)=>i*Math.PI/12).every(a=>
      ((p.x+Math.cos(a)*p.r)/rx)**2+((p.y+Math.sin(a)*p.r)/ry)**2<=.83));
    while(!inside()){rx*=1.035;ry*=1.035;}
    return {placed,rx,ry,width:rx*2+20,height:ry*2+82};
  }
  function create(data) {
    const buckets=new Map(),positions=new Map(),membership=new Map(),regions=[],clusters=[];
    data.particles.forEach(p=>{
      const family=familyFor(p),root=rootFor(p),key=root+':'+family;
      if(!buckets.has(key))buckets.set(key,{id:key,family,root,group:p.group,particles:[]});
      buckets.get(key).particles.push(p);
    });
    roots.forEach(root=>{
      const children=[...buckets.values()].filter(b=>b.root===root.id);
      if(!children.length)return;
      const order=Object.keys(families),rank=child=>{const index=order.indexOf(child.family);return index<0?order.length:index;};
      children.sort((a,b)=>rank(a)-rank(b)||a.family.localeCompare(b.family));
      children.forEach(child=>{
        const info=families[child.family]||[child.particles[0].familyLabel||'Другие состояния','',root.tone];
        Object.assign(child,{label:info[0],subtitle:info[1],tone:info[2]},pack(child.particles));
      });
      const columns=Math.min(root.columns,children.length),cellWidth=Math.max(...children.map(c=>c.width));
      const region={...root,x:0,y:0,width:columns*cellWidth+(columns-1)*24+72,height:0,children,count:children.reduce((sum,c)=>sum+c.particles.length,0)};
      let y=104;
      for(let i=0;i<children.length;i+=columns){
        const row=children.slice(i,i+columns),height=Math.max(...row.map(c=>c.height));
        row.forEach((child,col)=>Object.assign(child,{x:36+col*(cellWidth+24)+(cellWidth-child.width)/2,y:y+(height-child.height)/2}));
        y+=height+20;
      }
      region.height=y+20;regions.push(region);
    });
    const regionMap=new Map(regions.map(r=>[r.id,r]));
    const left=regionMap.get('mesons'),center=regionMap.get('bosons'),right=regionMap.get('baryons');
    const leptons=regionMap.get('leptons'),quarks=regionMap.get('quarks');
    // Reserve each column for its widest region, including an expanded lower catalogue.
    const gap=84,leftWidth=Math.max(left?.width||0,leptons?.width||0),centerWidth=center?.width||320;
    const rightX=48+leftWidth+gap+centerWidth+gap;
    if(left)Object.assign(left,{x:48,y:68});
    if(right)Object.assign(right,{x:rightX,y:68});
    if(center)Object.assign(center,{x:48+leftWidth+gap,y:68+Math.max(40,(Math.max(left?.height||0,right?.height||0)-center.height)/2)});
    if(leptons)Object.assign(leptons,{x:48,y:68+(left?.height||0)+72});
    if(quarks)Object.assign(quarks,{x:rightX,y:68+(right?.height||0)+72});
    regions.forEach(region=>region.children.forEach(child=>{
      child.x+=region.x;child.y+=region.y;child.cx=child.x+child.width/2;child.cy=child.y+54+child.ry;
      child.ids=child.particles.map(p=>p.id);clusters.push(child);
      child.placed.forEach(point=>{
        positions.set(point.id,{...point,x:child.cx+point.x,y:child.cy+point.y});
        membership.set(point.id,child.id);
      });
    }));
    const world={width:Math.max(...regions.map(r=>r.x+r.width))+48,height:Math.max(...regions.map(r=>r.y+r.height))+48};
    // Bounds for the original group filters span all of that group's nested families.
    const groupBounds=new Map();
    data.groups.forEach(g=>{
      const points=data.particles.filter(p=>p.group===g.id).map(p=>positions.get(p.id));
      if(!points.length)return;
      const x=Math.min(...points.map(p=>p.x-p.r))-60,y=Math.min(...points.map(p=>p.y-p.r))-80;
      const width=Math.max(...points.map(p=>p.x+p.r))-x+60,height=Math.max(...points.map(p=>p.y+p.r))-y+70;
      groupBounds.set(g.id,{x,y,width,height,cx:x+width/2,cy:y+height/2,rx:width/2,ry:height/2});
    });
    return {world,regions,clusters,positions,membership,groupBounds};
  }
  return {create,familyFor,rootFor};
});

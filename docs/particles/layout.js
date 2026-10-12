/* One tessellated lattice; group and family territories share complete hexagon ribs. */
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
    lightmesons:['Лёгкие','π / ρ / η','rose'],strangemesons:['Странные','K / K* / ϕ','orange'],
    lightresonances:['Резонансы','Возбуждения π / ρ / a / f','rose'],strangeexcited:['K-резонансы','Возбуждённые странные мезоны','orange'],
    pion:['Пионы','π · J = 0','rose'],rho:['ρ-мезоны','ρ · J = 1','rose'],isoscalar:['η / η′','Нейтральные состояния','rose'],
    kaon:['Каоны','K · открытая странность','orange'],kstar:['K*-мезоны','Векторные каоны','orange'],phi:['ϕ-мезоны','Скрытая странность','orange'],
    opencharm:['D-мезоны','Открытый charm','rose'],charmonium:['Чармоний','c c̄','violet'],
    openbottom:['Bottom','B / Bₛ / B꜀','rose'],bottomonium:['Боттомоний','b b̄','violet'],
    nucleon:['N','Нуклоны и возбуждения','blue'],delta:['Δ','Изоспин 3/2','blue'],lambda:['Λ','uds','blue'],sigma:['Σ','uus / uds / dds','blue'],xi:['Ξ','uss / dss','blue'],omega:['Ω','sss','blue'],charmedbaryons:['Очарованные','Барионы с c-кварком','violet'],bottombaryons:['Bottom','Барионы с b-кварком','violet'],
    charged:['Заряженные','e / μ / τ','green'],neutrino:['Нейтрино','νₑ / νμ / ντ','green'],
    lightquark:['Лёгкие','u / d / s','purple'],heavyquark:['Тяжёлые','c / b / t','purple'],
    massless:['Безмассовые','γ / g','gold'],weakboson:['Электрослабые','W⁻ / Z / W⁺','gold'],higgs:['Хиггс','H · J = 0','gold']
  };
  const preferred = ['pip','pi0','rho0','k0','phi','jpsi','pdg511','pdg553','p','lambda','sig0','xi0','omega','pdg2224','pdg4122','em','nue','u','c','gamma','z0','h'];
  function rootFor(p) {
    return ['light','strange','charm','bottom'].includes(p.group)?'mesons':roots.some(r=>r.id===p.group)?p.group:'mesons';
  }
  function familyFor(p) {
    // Imported data may supply an explicit family; otherwise use this demo's existing names.
    if(p.family)return String(p.family);
    const id=p.id;
    if(p.group==='light')return 'lightmesons';
    if(p.group==='strange')return 'strangemesons';
    if(p.group==='charm')return /psi|jpsi|eta_c/i.test(p.name+' '+id)?'charmonium':'opencharm';
    if(p.group==='baryons')return ['p','n'].includes(id)?'nucleon':id.startsWith('sig')?'sigma':id.startsWith('xi')?'xi':id==='lambda'?'lambda':id==='omega'?'omega':'baryons-other';
    if(p.group==='leptons')return id.startsWith('nu')?'neutrino':'charged';
    if(p.group==='quarks')return ['u','d','s'].includes(id)?'lightquark':'heavyquark';
    return ['g','gamma'].includes(id)?'massless':id==='h'?'higgs':'weakboson';
  }


  const radius=36,pitch=Math.sqrt(3)*radius,rowPitch=radius*1.5;
  function connected(points){
    if(!points.length)return true;
    const keys=new Set(points.map(p=>p.row+','+p.col)),seen=new Set(),queue=[points[0]];
    for(let i=0;i<queue.length;i++){
      const p=queue[i],key=p.row+','+p.col;if(seen.has(key))continue;seen.add(key);
      const diagonal=p.row%2?1:-1;
      [[p.row,p.col-1],[p.row,p.col+1],[p.row-1,p.col],[p.row+1,p.col],[p.row-1,p.col+diagonal],[p.row+1,p.col+diagonal]].forEach(([row,col])=>{
        const other=row+','+col;if(keys.has(other)&&!seen.has(other))queue.push({row,col});
      });
    }
    return seen.size===points.length;
  }
  function bounds(points){
    const x=Math.min(...points.map(p=>p.x-p.r*Math.sqrt(3)/2)),y=Math.min(...points.map(p=>p.y-p.r));
    const width=Math.max(...points.map(p=>p.x+p.r*Math.sqrt(3)/2))-x,height=Math.max(...points.map(p=>p.y+p.r))-y;
    return {x,y,width,height,cx:x+width/2,cy:y+height/2,rx:width/2,ry:height/2};
  }
  function partition(points,children){
    if(children.length===1){children[0].cells=points;return;}
    const total=points.length;
    let count=0,split=1,best=Infinity;
    for(let i=1;i<children.length;i++){
      count+=children[i-1].particles.length;
      if(Math.abs(count-total/2)<best){best=Math.abs(count-total/2);split=i;}
    }
    const first=children.slice(0,split),second=children.slice(split),quota=first.reduce((n,c)=>n+c.particles.length,0);
    const columns=Math.max(...points.map(p=>p.col))-Math.min(...points.map(p=>p.col));
    const rows=Math.max(...points.map(p=>p.row))-Math.min(...points.map(p=>p.row));
    const primary=columns*pitch>=rows*rowPitch?'col':'row',secondary=primary==='col'?'row':'col';
    let ordered=null;
    for(const axis of [primary,secondary])for(const direction of [1,-1])for(const tie of [1,-1]){
      if(ordered)continue;
      const other=axis==='col'?'row':'col',candidate=[...points].sort((a,b)=>direction*(a[axis]-b[axis])||tie*(a[other]-b[other]));
      if(connected(candidate.slice(0,quota))&&connected(candidate.slice(quota)))ordered=candidate;
    }
    if(!ordered)throw new Error('Cannot divide a family without disconnected cells');
    partition(ordered.slice(0,quota),first);partition(ordered.slice(quota),second);
  }
  function create(data){
    const positions=new Map(),membership=new Map(),regions=[],clusters=[],buckets=new Map();
    data.particles.forEach(p=>{
      const family=familyFor(p),root=rootFor(p),id=root+':'+family;
      if(!buckets.has(id))buckets.set(id,{id,family,root,group:p.group,particles:[]});
      buckets.get(id).particles.push(p);
    });
    const columns=Math.max(4,Math.ceil(Math.sqrt(data.particles.length*1.7)));
    const cells=data.particles.map((_,i)=>{
      const row=Math.floor(i/columns),col=i%columns;
      return {row,col,x:48+pitch/2+(col+(row%2)*.5)*pitch,y:196+row*rowPitch,r:radius};
    });
    const world={width:(columns+.5)*pitch+96,height:Math.max(...cells.map(p=>p.y))+radius+48};
    const rootCounts=new Map(roots.map(r=>[r.id,data.particles.filter(p=>rootFor(p)===r.id).length]));
    const ordered=[...cells].sort((a,b)=>a.col-b.col||a.row-b.row),rootCells=new Map();
    const mesons=rootCounts.get('mesons'),baryons=rootCounts.get('baryons');
    rootCells.set('mesons',ordered.slice(0,mesons));
    rootCells.set('baryons',baryons?ordered.slice(-baryons):[]);
    const center=ordered.slice(mesons,ordered.length-baryons).sort((a,b)=>a.row-b.row||a.col-b.col);
    let start=0;
    ['quarks','bosons','leptons'].forEach(id=>{const count=rootCounts.get(id);rootCells.set(id,center.slice(start,start+count));start+=count;});
    const activeRoots=['mesons','quarks','bosons','leptons','baryons'].filter(id=>rootCounts.get(id));
    roots.forEach(root=>{
      const points=rootCells.get(root.id);if(!points.length)return;
      const children=[...buckets.values()].filter(c=>c.root===root.id),order=Object.keys(families);
      children.sort((a,b)=>order.indexOf(a.family)-order.indexOf(b.family)||a.family.localeCompare(b.family));
      partition(points,children);
      children.forEach((child,index)=>{
        const info=families[child.family]||[child.particles[0].familyLabel||'Другие состояния','',root.tone];
        const rank=p=>{const i=preferred.indexOf(p.id);return i<0?100:i;};
        const particles=[...child.particles].sort((a,b)=>rank(a)-rank(b)||Math.abs(a.pdg)-Math.abs(b.pdg)||a.id.localeCompare(b.id));
        const assigned=[...child.cells].sort((a,b)=>a.row-b.row||a.col-b.col);
        Object.assign(child,{label:info[0],subtitle:info[1],tone:root.tone,shade:index,ids:particles.map(p=>p.id)},bounds(assigned));
        assigned.forEach((point,i)=>{positions.set(particles[i].id,{...point,id:particles[i].id});membership.set(particles[i].id,child.id);});
        delete child.cells;clusters.push(child);
      });
      const slot=(world.width-96)/activeRoots.length,index=activeRoots.indexOf(root.id);
      regions.push({...root,...bounds(points),children,count:points.length,header:{x:48+index*slot,y:32,width:slot-4,height:64}});
    });
    const groupBounds=new Map();
    data.groups.forEach(g=>{const points=data.particles.filter(p=>p.group===g.id).map(p=>positions.get(p.id));if(points.length)groupBounds.set(g.id,bounds(points));});
    return {world,regions,clusters,positions,membership,groupBounds,unified:true};
  }
  return {create,familyFor,rootFor};
});

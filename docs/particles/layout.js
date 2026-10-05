/* Deterministic honeycomb tiles, with reserved group and subgroup headers. */
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

  const radius=36, pitch=Math.sqrt(3)*40, rowPitch=60;
  function pack(particles) {
    const rank=p=>{const i=preferred.indexOf(p.id);return i<0?100:i;};
    const ordered=[...particles].sort((a,b)=>rank(a)-rank(b)||Math.abs(a.pdg)-Math.abs(b.pdg)||a.id.localeCompare(b.id));
    const columns=Math.max(2,Math.ceil(Math.sqrt(ordered.length*.95)));
    const placed=ordered.map((p,i)=>({id:p.id,x:8+Math.sqrt(3)*radius/2+(i%columns+(Math.floor(i/columns)%2)*.5)*pitch,y:88+Math.floor(i/columns)*rowPitch,r:radius}));
    const width=Math.max(176,...placed.map(p=>p.x+Math.sqrt(3)*radius/2+8));
    const height=Math.max(...placed.map(p=>p.y+radius))+8;
    return {placed,width,height,rx:width/2,ry:(height-52)/2};
  }
  function arrange(children,root) {
    const columns=['mesons','baryons'].includes(root)?2:1;
    const lanes=Array.from({length:columns},()=>({height:0,width:0,items:[]}));
    children.forEach(child=>{
      const lane=lanes.reduce((a,b)=>a.height<=b.height?a:b);
      lane.items.push({child,y:lane.height});lane.height+=child.height+20;lane.width=Math.max(lane.width,child.width);
    });
    let x=0;
    lanes.forEach(lane=>{
      lane.items.forEach(({child,y})=>Object.assign(child,{x,y:96+y,cx:x+child.width/2,cy:96+y+52+child.ry}));
      x+=lane.width+20;
    });
    return {width:x-20,height:96+Math.max(...lanes.map(l=>l.height))-20};
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
      const order=Object.keys(families),rank=child=>{const i=order.indexOf(child.family);return i<0?order.length:i;};
      children.sort((a,b)=>rank(a)-rank(b)||a.family.localeCompare(b.family));
      children.forEach((child,index)=>{
        const info=families[child.family]||[child.particles[0].familyLabel||'Другие состояния','',root.tone];
        Object.assign(child,{label:info[0],subtitle:info[1],tone:root.tone,shade:index},pack(child.particles));
      });
      regions.push({...root,x:0,y:48,...arrange(children,root.id),children,count:children.reduce((n,c)=>n+c.particles.length,0)});
    });
    const regionMap=new Map(regions.map(r=>[r.id,r]));
    const mesons=regionMap.get('mesons'),baryons=regionMap.get('baryons');
    const central=['quarks','bosons','leptons'].map(id=>regionMap.get(id)).filter(Boolean);
    const centerWidth=Math.max(0,...central.map(r=>r.width));
    const gap=30,leftWidth=mesons?.width||0;
    if(mesons)mesons.x=48;
    let centerY=48;
    central.forEach(region=>{region.x=48+leftWidth+gap+(centerWidth-region.width)/2;region.y=centerY;centerY+=region.height+gap;});
    if(baryons)baryons.x=48+leftWidth+gap+centerWidth+gap;
    regions.forEach(region=>region.children.forEach(child=>{
      child.x+=region.x;child.y+=region.y;child.cx+=region.x;child.cy+=region.y;
      child.ids=child.particles.map(p=>p.id);clusters.push(child);
      child.placed.forEach(point=>{positions.set(point.id,{...point,x:child.x+point.x,y:child.y+point.y});membership.set(point.id,child.id);});
    }));
    const world={width:Math.max(...regions.map(r=>r.x+r.width))+48,height:Math.max(...regions.map(r=>r.y+r.height))+48};
    const groupBounds=new Map();
    data.groups.forEach(g=>{
      const points=data.particles.filter(p=>p.group===g.id).map(p=>positions.get(p.id));
      if(!points.length)return;
      const x=Math.min(...points.map(p=>p.x-p.r))-8,y=Math.min(...points.map(p=>p.y-p.r))-64;
      const width=Math.max(...points.map(p=>p.x+p.r))-x+8,height=Math.max(...points.map(p=>p.y+p.r))-y+8;
      groupBounds.set(g.id,{x,y,width,height,cx:x+width/2,cy:y+height/2,rx:width/2,ry:height/2});
    });
    return {world,regions,clusters,positions,membership,groupBounds};
  }
  return {create,familyFor,rootFor};
});

/* Seeded constellation layout. Physics data stays untouched; collision clearance is enforced. */
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
  function randomFor(key) {
    let state=2166136261;
    for(const c of key)state=Math.imul(state^c.charCodeAt(0),16777619);
    return ()=>{state=(state+0x6D2B79F5)|0;let n=Math.imul(state^state>>>15,1|state);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};
  }
  function pack(particles,key) {
    const ordered=[...particles].sort((a,b)=>{
      const rank=p=>{const index=preferred.indexOf(p.id);return index<0?100:index;};
      return rank(a)-rank(b)||Math.abs(a.pdg)-Math.abs(b.pdg)||a.id.localeCompare(b.id);
    });
    const featured={pip:85,pi0:45,rho0:39,k0:74,jpsi:70,p:65,n:53,lambda:64,sig0:56,xi0:52,omega:52,pdg2224:57,pdg4122:54,pdg511:61,pdg553:68,em:51,u:51,gamma:85,z0:64,h:62};
    const random=randomFor(key),radius=p=>featured[p.id]||Math.max(23,Math.min(38,(Number(p.r)||34)*.84));
    const typicalRadius=Math.sqrt(ordered.reduce((sum,p)=>sum+radius(p)**2,0)/ordered.length),gap=22;
    const stretch=.95+random()*.35;
    const placed=[];
    ordered.forEach((p,index)=>{
      const r=radius(p);
      if(!index){placed.push({id:p.id,x:(random()-.5)*24,y:(random()-.5)*24,r});return;}
      let extent=(typicalRadius*2+gap)*Math.sqrt(index)*.62,point=null;
      // Random darts produce a blue-noise cloud, with no rows or concentric rings.
      while(!point){
        for(let attempt=0;attempt<90;attempt++){
          const angle=random()*Math.PI*2,distance=Math.sqrt(random())*extent;
          const candidate={id:p.id,x:Math.cos(angle)*distance*stretch,y:Math.sin(angle)*distance/stretch,r};
          if(placed.every(a=>Math.hypot(a.x-candidate.x,a.y-candidate.y)>=a.r+r+gap)){point=candidate;break;}
        }
        extent*=1.13;
      }
      placed.push(point);
    });
    const cx=(Math.max(...placed.map(p=>p.x+p.r))+Math.min(...placed.map(p=>p.x-p.r)))/2;
    const cy=(Math.max(...placed.map(p=>p.y+p.r))+Math.min(...placed.map(p=>p.y-p.r)))/2;
    placed.forEach(p=>{p.x-=cx;p.y-=cy;});
    let rx=Math.max(90,...placed.map(p=>Math.abs(p.x)+p.r+22)),ry=Math.max(75,...placed.map(p=>Math.abs(p.y)+p.r+22));
    // Complete circles remain inside the slightly irregular visual contours.
    const inside=()=>placed.every(p=>Array.from({length:24},(_,i)=>i*Math.PI/12).every(a=>
      ((p.x+Math.cos(a)*p.r)/rx)**2+((p.y+Math.sin(a)*p.r)/ry)**2<=.83));
    while(!inside()){rx*=1.035;ry*=1.035;}
    return {placed,rx,ry,width:rx*2+20,height:ry*2+82};
  }
  function arrange(children,root) {
    const anchors={
      mesons:[[-.64,-1.04],[.61,-.94],[-1.14,.02],[-.03,.11],[1.04,.06],[-.88,1.05],[.19,1.12],[1.18,1.0]],
      baryons:[[-.55,-1.04],[.55,-1.0],[-.64,.02],[.62,-.03],[-.6,.89],[.47,.72],[.69,1.47],[-.65,1.65]],
      leptons:[[-.6,-.08],[.6,.12]],quarks:[[-.58,.12],[.59,-.12]],
      bosons:[[.03,-1.0],[-.13,.05],[.18,1.04]]
    };
    const unit=Math.max(...children.map(c=>Math.max(c.rx,c.ry)))*1.5;
    children.forEach((c,i)=>{
      const random=randomFor(c.id),a=anchors[root]?.[i]||[Math.cos(i*2.399)*Math.sqrt(i+1),Math.sin(i*2.399)*Math.sqrt(i+1)];
      c.cx=a[0]*unit+(random()-.5)*35;c.cy=a[1]*unit+(random()-.5)*45;
    });
    // Elliptical separation keeps labels clear while allowing the luminous outer layers to overlap.
    for(let pass=0;pass<180;pass++){
      let moved=false;
      for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
        const a=children[i],b=children[j],dx=b.cx-a.cx,dy=b.cy-a.cy;
        const clearance=Math.hypot(dx/(a.rx+b.rx+38),dy/(a.ry+b.ry+86));
        if(clearance>=1)continue;
        const factor=(1/Math.max(.001,clearance)-1)*.52;
        a.cx-=dx*factor;a.cy-=dy*factor;b.cx+=dx*factor;b.cy+=dy*factor;moved=true;
      }
      if(!moved)break;
    }
    const minX=Math.min(...children.map(c=>c.cx-c.rx-10)),minY=Math.min(...children.map(c=>c.cy-c.ry-54));
    children.forEach(c=>{c.cx+=48-minX;c.cy+=104-minY;c.x=c.cx-c.width/2;c.y=c.cy-c.ry-54;});
    return {width:Math.max(...children.map(c=>c.x+c.width))+48,height:Math.max(...children.map(c=>c.y+c.height))+40};
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
        Object.assign(child,{label:info[0],subtitle:info[1],tone:info[2]},pack(child.particles,child.id));
      });
      const region={...root,x:0,y:0,...arrange(children,root.id),children,count:children.reduce((sum,c)=>sum+c.particles.length,0)};
      regions.push(region);
    });
    const regionMap=new Map(regions.map(r=>[r.id,r]));
    const left=regionMap.get('mesons'),center=regionMap.get('bosons'),right=regionMap.get('baryons');
    const leptons=regionMap.get('leptons'),quarks=regionMap.get('quarks');
    const mainHeight=Math.max(left?.height||0,right?.height||0);
    if(center&&mainHeight>center.height*1.3){
      const factor=Math.min(1.8,mainHeight*.82/center.height);
      center.children.forEach(c=>{c.cy=150+(c.cy-150)*factor;c.y=c.cy-c.ry-54;});
      center.height=Math.max(...center.children.map(c=>c.y+c.height))+40;
    }
    const gap=24,leftWidth=left?.width||0,centerWidth=center?.width||320;
    const rightX=48+leftWidth+gap+centerWidth+gap;
    if(left)Object.assign(left,{x:48,y:68});
    if(right)Object.assign(right,{x:rightX,y:108});
    if(center)Object.assign(center,{x:48+leftWidth+gap,y:68+Math.max(130,mainHeight-center.height+25)});
    // A loose hexagonal silhouette: organic hadron clouds form the flanks,
    // quarks cap the top, leptons cap the bottom, bosons connect the centre.
    const mainY=(quarks?.height||0)+160;
    if(left)left.y=mainY+(mainHeight-left.height)/2;
    if(right)right.y=mainY+(mainHeight-right.height)/2;
    if(center){
      const first=center.children[0],last=center.children.at(-1),origin=first.cy,span=last.cy-origin;
      const start=158+first.ry,end=mainHeight+72-last.ry;
      center.children.forEach(c=>{c.cy=start+(c.cy-origin)*(end-start)/(span||1);c.y=c.cy-c.ry-54;});
      center.y=mainY-140;center.height=mainHeight+140;
    }
    const seamX=48+leftWidth+gap+centerWidth/2;
    const main=[left,center,right].filter(Boolean);
    function dock(cap,top){
      if(!cap)return;
      cap.x=seamX-cap.width/2;cap.y=top?48:mainY+mainHeight+180;
      const clear=()=>main.every(b=>cap.children.every(a=>b.children.every(c=>
        Math.hypot((a.cx+cap.x-c.cx-b.x)/(a.rx+c.rx+160),(a.cy+cap.y-c.cy-b.y)/(a.ry+c.ry+160))>=1)));
      const step=top?8:-8;
      for(let pass=0;pass<1000;pass++){
        cap.y+=step;
        if(!clear()){cap.y-=step;break;}
      }
    }
    dock(quarks,true);dock(leptons,false);
    const shiftX=48-Math.min(...regions.map(r=>r.x)),shiftY=48-Math.min(...regions.map(r=>r.y));
    regions.forEach(r=>{r.x+=shiftX;r.y+=shiftY;});
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

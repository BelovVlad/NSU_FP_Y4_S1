const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../docs/particles/layout.js');
const contours = require('../docs/particles/contours.js');
const routes = require('../docs/particles/routes.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/particles.js'),'utf8'),context);
const original=JSON.stringify(context.window.PARTICLE_DATA.particles);
const originalEdges=JSON.stringify(context.window.PARTICLE_DATA.edges);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/extra-particles.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/remaining-particles.js'),'utf8'),context);
const data = JSON.parse(JSON.stringify(context.window.PARTICLE_DATA));

test('Neighbouring curved shores follow one bisector with a constant normal gap',()=>{
  const seeds=[
    {id:'a',core:contours.cloud({cx:0,cy:0,rx:140,ry:200},.2),reach:95},
    {id:'b',core:contours.cloud({cx:330,cy:15,rx:140,ry:200},2.1),reach:95}
  ];
  const result=contours.territories(seeds,{gap:28,step:5});
  const a=result.get('a').layers[0][0],b=result.get('b').layers[0][0];
  const samples=a.flatMap((p,i)=>{
    const q=a[(i+1)%a.length],n=Math.ceil(Math.hypot(q.x-p.x,q.y-p.y)/4);
    return Array.from({length:n},(_,j)=>({x:p.x+(q.x-p.x)*j/n,y:p.y+(q.y-p.y)*j/n}));
  });
  const shared=samples.filter(p=>p.x>140&&Math.abs(p.y)<130);
  assert.ok(shared.length>50);
  assert.ok(Math.max(...shared.map(p=>p.x))-Math.min(...shared.map(p=>p.x))>5,'Shared boundary retains its curves');
  for(const p of shared){
    const shore=contours.distance(b,p.x,p.y);
    assert.ok(shore.d>26&&shore.d<30,`Normal gap: ${shore.d}`);
    const normal=contours.distance(a,p.x+shore.gx*.5,p.y+shore.gy*.5);
    assert.ok(normal.gx*shore.gx+normal.gy*shore.gy<-.95,'Opposite shore normals are parallel');
  }
});

function connected(points){
  const seen=new Set([0]),queue=[0];
  for(let i=0;i<queue.length;i++)for(let j=0;j<points.length;j++){
    if(!seen.has(j)&&Math.abs(Math.hypot(points[queue[i]].x-points[j].x,points[queue[i]].y-points[j].y)-Math.sqrt(3)*36)<.001){seen.add(j);queue.push(j);}
  }
  return seen.size===points.length;
}
function verify(data) {
  const before=JSON.stringify(data),diagram=layout.create(data);
  assert.equal(diagram.positions.size,data.particles.length);
  assert.equal(JSON.stringify(data),before,'Layout must preserve all source data');
  const points=[...diagram.positions.values()];
  assert.ok(connected(points),'All tiles form one connected honeycomb');
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];
    const clearance=Math.max(...[0,Math.PI/3,Math.PI*2/3].map(angle=>Math.abs((b.x-a.x)*Math.cos(angle)+(b.y-a.y)*Math.sin(angle))-(a.r+b.r)*Math.sqrt(3)/2));
    assert.ok(clearance>=-.001,`Overlapping tile interiors: ${a.id}, ${b.id}`);
  }
  for(const region of diagram.regions){
    const rootPoints=region.children.flatMap(c=>c.ids.map(id=>diagram.positions.get(id)));
    assert.ok(connected(rootPoints),'Root territory stays connected: '+region.id);
    assert.ok(region.header.y+region.header.height<Math.min(...points.map(p=>p.y-p.r)),'Root titles occupy an empty common band');
    for(const cluster of region.children){
      const family=cluster.ids.map(id=>diagram.positions.get(id));
      assert.ok(connected(family),'Family territory stays connected: '+cluster.id);
      for(const id of cluster.ids)assert.equal(diagram.membership.get(id),cluster.id);
    }
    assert.ok(region.x>=0&&region.y>=0&&region.x+region.width<=diagram.world.width&&region.y+region.height<=diagram.world.height);
  }
  return diagram;
}
test('Every relationship follows continuous ribs, ends on its target, and avoids headings',()=>{
  const diagram=layout.create(data),network=routes.create(diagram);
  function onSegment(p,a,b){
    const length=Math.hypot(b.x-a.x,b.y-a.y),cross=Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x));
    return cross<length*.0001&&p.x>=Math.min(a.x,b.x)-.0001&&p.x<=Math.max(a.x,b.x)+.0001&&p.y>=Math.min(a.y,b.y)-.0001&&p.y<=Math.max(a.y,b.y)+.0001;
  }
  for(const edge of data.edges){
    const path=network.route(edge.from,edge.to);
    assert.ok(path.length>=4,'Even touching cells have a non-zero route');
    const source=diagram.positions.get(edge.from),target=diagram.positions.get(edge.to);
    assert.ok(Math.hypot(path[0].x-source.x,path[0].y-source.y)<source.r);
    assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<target.r);
    for(let i=2;i<path.length-1;i++){
      const a=path[i-1],b=path[i];
      assert.ok(network.ribs.some(([p,q])=>onSegment(a,p,q)&&onSegment(b,p,q)),'Route leaves the actual hexagon ribs: '+edge.id);
      assert.ok(network.headers.every(box=>!routes.crossesBox(a,b,box)),'Route crosses a root title');
    }
    const shifted=routes.offsetPath(path,1.4);
    shifted.forEach((p,i)=>assert.ok(Math.hypot(p.x-path[i].x,p.y-path[i].y)<=2.801,'Colour lanes stay beside their rib'));
  }
});
function catalogue(count, templates=data.particles) {
  return {...data,particles:Array.from({length:count},(_,i)=>{
    const p=templates[i%templates.length];
    return {...p,id:p.id+'-state-'+i,pdg:100000+i,family:layout.familyFor(p),r:i%3===0?42:30};
  }),edges:[]};
}
test('Caption leaders follow ribs from the upper atlas edge to the named family',()=>{
  const diagram=layout.create(data),network=routes.create(diagram),points=[...diagram.positions.values()];
  for(const cluster of diagram.clusters){
    const target=cluster.ids.map(id=>diagram.positions.get(id)).sort((a,b)=>a.y-b.y||a.x-b.x)[0];
    const source=points.slice().sort((a,b)=>a.y-b.y||Math.abs(a.x-target.x)-Math.abs(b.x-target.x))[0];
    const path=network.annotation(source.id,target.id);
    const first=routes.vertices(source)[0],last=routes.vertices(target)[0];
    assert.ok(Math.hypot(path[0].x-first.x,path[0].y-first.y)<1e-6);
    assert.ok(Math.hypot(path.at(-1).x-last.x,path.at(-1).y-last.y)<1e-6);
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];
      assert.ok(network.ribs.some(([p,q])=>{
        const length=Math.hypot(q.x-p.x,q.y-p.y);
        return [a,b].every(v=>Math.abs((v.x-p.x)*(q.y-p.y)-(v.y-p.y)*(q.x-p.x))<length*.0001&&Math.hypot(v.x-p.x,v.y-p.y)+Math.hypot(v.x-q.x,v.y-q.y)<length+.0001);
      }),'A caption connector must not cross a particle interior');
    }
  }
});

test('Real particles preserve data in one connected honeycomb',()=>{
  const diagram=verify(data);
  assert.equal(data.particles.length,616);
  assert.equal(JSON.stringify(data.particles.slice(0,49)),original,'The original 49 records are unmodified');
  assert.equal(JSON.stringify(data.edges.slice(0,104)),originalEdges,'The original 104 relationships are unmodified');
  assert.equal(diagram.regions.length,5);
  assert.equal(JSON.stringify([...diagram.positions]),JSON.stringify([...layout.create(data).positions]),'Placement is deterministic');
});
test('151 additional states have unique PDG IDs, quantum numbers and provenance; edges resolve',()=>{
  assert.equal(new Set(data.particles.map(p=>p.pdg)).size,616);
  for(const p of data.particles.slice(49,200)){
    assert.equal(p.source.edition,'2024');
    assert.ok(p.source.mass&&p.source.particle);
    assert.ok(['0','1','2','3','1/2','3/2','5/2'].includes(p.spin));
    assert.ok(p.mass&&!p.mass.includes('не указано'));
  }
  const byId=new Map(data.particles.map(p=>[p.id,p]));
  for(const e of data.edges)assert.ok(byId.has(e.from)&&byId.has(e.to),'A relation references an absent state');
  assert.ok(!data.edges.some(e=>e.id.startsWith('extra-')&&e.from==='t'),'A mixed-state annotation must not create a top-quark constituent');
  assert.equal(byId.get('pdg2224').charge,'+2');
  assert.equal(byId.get('pdg9000221').mass,'400–800 MeV');
  assert.match(byId.get('pdg433').lifetime,/Γ <1.9 MeV/);
  assert.equal(byId.get('pdg511').lifetime,'τ = (1517 ± 4) × 10⁻¹⁵ s');
});
test('All remaining states preserve measured values, distinct antiparticles and unknown quantities',()=>{
  assert.equal(context.window.PARTICLE_REMAINDER.length,416);
  assert.equal(new Set(data.particles.map(p=>p.symbol)).size,616);
  const byCode=new Map(data.particles.map(p=>[p.pdg,p])),byId=new Map(data.particles.map(p=>[p.id,p]));
  const numericCharge=p=>{const [a,b]=p.charge.replace('−','-').split('/').map(Number);return b?a/b:a;};
  for(const p of data.particles.slice(200)){
    assert.equal(p.source.edition,'2024');
    assert.ok(p.source.particle&&p.spin&&p.mass&&p.lifetime);
    if(p.source.mass)assert.ok(Number.isFinite(p.massValue)||p.mass.includes(' - i '),'Complex pole intervals must retain their original display');
    else{assert.equal(p.mass,'Нет измерения');assert.equal(p.massValue,undefined);}
    if(p.antiparticleOf){
      const counterpart=byId.get(p.antiparticleOf);
      assert.equal(counterpart.pdg,-p.pdg);
      assert.equal(numericCharge(p),-numericCharge(counterpart)||0);
      assert.equal(p.decays.length,0,'Shared particle tables must not invent antiparticle decay channels');
    }
  }
  assert.equal(byCode.get(-2212).quarks,'ūūd̄');
  assert.ok(Math.abs(byCode.get(-2212).massValue-938.272088)<.00001,'Atomic mass units are converted to MeV');
  assert.match(byCode.get(-2212).mass,/ MeV$/);
  assert.ok(Math.abs(byCode.get(-2112).massValue-939.565421)<.00001);
  assert.equal(byCode.get(-2).charge,'−2/3');
  assert.equal(byCode.get(-12).group,'leptons');
  assert.equal(byCode.get(5212).massValue,undefined);
  assert.match(byCode.get(9000113).quarks,/не установлен/);
  assert.ok(data.edges.some(e=>e.from==='pdg-2'&&e.to==='pdg-2212'&&e.kind==='composition'));
  assert.equal(new Set(data.edges.map(e=>e.id)).size,data.edges.length);
});
test('800-state catalogue has connected tiles and territories without interior collisions',()=>verify(catalogue(800)));
test('A heavily expanded lepton catalogue reserves its own column',()=>{
  const expanded=catalogue(650,data.particles.filter(p=>p.group==='leptons'));
  verify({...data,particles:[...data.particles,...expanded.particles]});
});
test('A new explicit family with 300 states expands without collisions',()=>{
  const extra=catalogue(300,[{...data.particles[0],family:'excited-pion',familyLabel:'Возбуждённые пионы'}]);
  const diagram=verify({...data,particles:[...data.particles,...extra.particles]});
  assert.equal(diagram.clusters.find(c=>c.family==='excited-pion').label,'Возбуждённые пионы');
});

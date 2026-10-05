const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../docs/particles/layout.js');
const contours = require('../docs/particles/contours.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/particles.js'),'utf8'),context);
const original=JSON.stringify(context.window.PARTICLE_DATA.particles);
const originalEdges=JSON.stringify(context.window.PARTICLE_DATA.edges);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/extra-particles.js'),'utf8'),context);
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

function verify(data) {
  const before=JSON.stringify(data),diagram=layout.create(data);
  assert.equal(diagram.positions.size,data.particles.length);
  assert.equal(JSON.stringify(data),before,'Layout must preserve all source data');
  const points=[...diagram.positions.values()];
  // Separating-axis clearance for actual pointy hexagons (their bounding circles overlap).
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];
    const clearance=Math.max(...[0,Math.PI/3,Math.PI*2/3].map(angle=>Math.abs((b.x-a.x)*Math.cos(angle)+(b.y-a.y)*Math.sin(angle))-(a.r+b.r)*Math.sqrt(3)/2));
    assert.ok(clearance>6.9,`Overlapping or touching tiles: ${a.id}, ${b.id}`);
  }
  function separated(a,b,gap=0){
    return a.x+a.width+gap<=b.x||b.x+b.width+gap<=a.x||a.y+a.height+gap<=b.y||b.y+b.height+gap<=a.y;
  }
  for(const region of diagram.regions){
    for(const cluster of region.children){
      assert.ok(cluster.x>=region.x&&cluster.y>=region.y+96,'Empty root header is reserved');
      assert.ok(cluster.x+cluster.width<=region.x+region.width&&cluster.y+cluster.height<=region.y+region.height);
      for(const other of region.children)if(other!==cluster)assert.ok(separated(cluster,other,19.9),'Subgroups retain a small gutter');
      for(const id of cluster.ids){
        assert.equal(diagram.membership.get(id),cluster.id);
        const p=diagram.positions.get(id);
        assert.ok(p.y-p.r>=cluster.y+52,'Tiles never enter the subgroup header');
        assert.ok(p.x-p.r*Math.sqrt(3)/2>=cluster.x&&p.x+p.r*Math.sqrt(3)/2<=cluster.x+cluster.width);
        assert.ok(p.y+p.r<=cluster.y+cluster.height);
      }
    }
    for(const other of diagram.regions)if(other!==region)assert.ok(separated(region,other,29.9),'Root groups retain a small gutter');
    assert.ok(region.x>=0&&region.y>=0&&region.x+region.width<=diagram.world.width&&region.y+region.height<=diagram.world.height);
  }
  return diagram;
}
function catalogue(count, templates=data.particles) {
  return {...data,particles:Array.from({length:count},(_,i)=>{
    const p=templates[i%templates.length];
    return {...p,id:p.id+'-state-'+i,pdg:100000+i,family:layout.familyFor(p),r:i%3===0?42:30};
  }),edges:[]};
}

test('Real particles preserve data in separated honeycomb groups',()=>{
  const diagram=verify(data);
  assert.equal(data.particles.length,200);
  assert.equal(JSON.stringify(data.particles.slice(0,49)),original,'The original 49 records are unmodified');
  assert.equal(JSON.stringify(data.edges.slice(0,104)),originalEdges,'The original 104 relationships are unmodified');
  assert.equal(diagram.regions.length,5);
  assert.equal(JSON.stringify([...diagram.positions]),JSON.stringify([...layout.create(data).positions]),'Placement is deterministic');
});
test('151 additional states have unique PDG IDs, quantum numbers and provenance; edges resolve',()=>{
  assert.equal(new Set(data.particles.map(p=>p.pdg)).size,200);
  for(const p of data.particles.slice(49)){
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
test('800-state catalogue has no tile, subgroup or root-group collisions',()=>verify(catalogue(800)));
test('A heavily expanded lepton catalogue reserves its own column',()=>{
  const expanded=catalogue(650,data.particles.filter(p=>p.group==='leptons'));
  verify({...data,particles:[...data.particles,...expanded.particles]});
});
test('A new explicit family with 300 states expands without collisions',()=>{
  const extra=catalogue(300,[{...data.particles[0],family:'excited-pion',familyLabel:'Возбуждённые пионы'}]);
  const diagram=verify({...data,particles:[...data.particles,...extra.particles]});
  assert.equal(diagram.clusters.find(c=>c.family==='excited-pion').label,'Возбуждённые пионы');
});

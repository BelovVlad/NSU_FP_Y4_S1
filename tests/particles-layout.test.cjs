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

test('All 200 spheres stay inside coordinated family and root shores',()=>{
  const diagram=layout.create(data),result=contours.create(diagram);
  for(const id of ['quarks','leptons']){
    const cap=result.regions.get(id).layers[0][0];
    const main=[...result.regions].filter(([other])=>!['quarks','leptons'].includes(other));
    const gap=Math.min(...cap.map(p=>Math.min(...main.map(([,shore])=>contours.distance(shore.layers[0][0],p.x,p.y).d))));
    assert.ok(gap>30&&gap<40,`Detached or overlapping ${id} cap: ${gap}`);
  }
  for(const [id,p] of diagram.positions){
    const family=result.clusters.get(diagram.membership.get(id));
    const region=result.regions.get(layout.rootFor(data.particles.find(item=>item.id===id)));
    for(const territory of [family,region]){
      assert.equal(territory.layers[0].length,1,'Territory is one continuous shape');
      assert.ok(contours.distance(territory.layers[0][0],p.x,p.y).d<-p.r-10,`Boundary cuts ${id}`);
    }
  }
  for(const [id,territory] of result.clusters){
    assert.equal(territory.layers.length,3);
    const root=diagram.clusters.find(c=>c.id===id).root;
    const parent=result.regions.get(root).layers[0][0];
    for(const p of territory.layers[0][0])
      assert.ok(contours.distance(parent,p.x,p.y).d<-57,`Family crosses its enclosing root shore: ${id}`);
    for(let i=1;i<3;i++)for(const p of territory.layers[i][0]){
      const inset=-contours.distance(territory.layers[0][0],p.x,p.y).d;
      assert.ok(Math.abs(inset-i*14)<2,`Inner contour is not parallel: ${id}, ${inset}`);
    }
    for(const otherId of territory.neighbours){
      const other=result.clusters.get(otherId).layers[0][0];
      for(const point of territory.layers[0][0])
        assert.ok(contours.distance(other,point.x,point.y).d>23,`Overlapping shores: ${id}, ${otherId}`);
    }
  }
});

function verify(data) {
  const before = JSON.stringify(data);
  const diagram = layout.create(data);
  assert.equal(diagram.positions.size,data.particles.length);
  assert.equal(JSON.stringify(data),before,'Layout must preserve all source data');
  const points = [...diagram.positions.values()];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++) {
    const a=points[i],b=points[j];
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r+21.9,`Overlapping states: ${a.id}, ${b.id}`);
  }
  // Docked organic territories can share bounding-box area. Test their actual
  // packed cloud envelopes, rather than imposing distant rectangular columns.
  for(let i=0;i<diagram.clusters.length;i++)for(let j=i+1;j<diagram.clusters.length;j++){
    const a=diagram.clusters[i],b=diagram.clusters[j];if(a.root===b.root)continue;
    assert.ok(Math.hypot((a.cx-b.cx)/(a.rx+b.rx+20),(a.cy-b.cy)/(a.ry+b.ry+20))>=1,'Root cloud cores overlap');
  }
  for(const region of diagram.regions) {
    for(let i=0;i<region.children.length;i++) {
      const cluster=region.children[i];
      assert.ok(cluster.x>=region.x&&cluster.y>=region.y+100);
      assert.ok(cluster.x+cluster.width<=region.x+region.width&&cluster.y+cluster.height<=region.y+region.height);
      // Bounding boxes may overlap diagonally; collision checks above cover the actual circles.
      for(const other of region.children.slice(i+1)){
        const clearance=Math.hypot((cluster.cx-other.cx)/(cluster.rx+other.rx+38),(cluster.cy-other.cy)/(cluster.ry+other.ry+86));
        assert.ok(clearance>.999,'Family labels and inner clouds require clearance');
      }
      for(const id of cluster.ids) {
        assert.equal(diagram.membership.get(id),cluster.id);
        const point=diagram.positions.get(id);
        for(let degree=0;degree<360;degree+=3) {
          const angle=degree*Math.PI/180;
          const norm=((point.x+Math.cos(angle)*point.r-cluster.cx)/cluster.rx)**2+((point.y+Math.sin(angle)*point.r-cluster.cy)/cluster.ry)**2;
          assert.ok(norm<.86,'Complete sphere must stay inside its family shell');
        }
      }
    }
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

test('Real particles preserve data in separated constellations',()=>{
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
test('800-state catalogue has no sphere, family or root-region collisions',()=>verify(catalogue(800)));
test('A heavily expanded lepton catalogue reserves its own column',()=>{
  const expanded=catalogue(650,data.particles.filter(p=>p.group==='leptons'));
  verify({...data,particles:[...data.particles,...expanded.particles]});
});
test('A new explicit family with 300 states expands without collisions',()=>{
  const extra=catalogue(300,[{...data.particles[0],family:'excited-pion',familyLabel:'Возбуждённые пионы'}]);
  const diagram=verify({...data,particles:[...data.particles,...extra.particles]});
  assert.equal(diagram.clusters.find(c=>c.family==='excited-pion').label,'Возбуждённые пионы');
});

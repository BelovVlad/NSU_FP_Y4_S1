const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../docs/particles/layout.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/particles/particles.js'),'utf8'),context);
const data = JSON.parse(JSON.stringify(context.window.PARTICLE_DATA));

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
  const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
  for(let i=0;i<diagram.regions.length;i++)for(let j=i+1;j<diagram.regions.length;j++)
    assert.ok(disjoint(diagram.regions[i],diagram.regions[j]),'Root regions overlap');
  for(const region of diagram.regions) {
    for(let i=0;i<region.children.length;i++) {
      const cluster=region.children[i];
      assert.ok(cluster.x>=region.x&&cluster.y>=region.y+100);
      assert.ok(cluster.x+cluster.width<=region.x+region.width&&cluster.y+cluster.height<=region.y+region.height);
      for(const other of region.children.slice(i+1))assert.ok(disjoint(cluster,other),'Family zones overlap');
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

test('49 real particles preserve data and fit in 20 disjoint family zones',()=>{
  const diagram=verify(data);
  assert.equal(diagram.regions.length,5);
  assert.equal(diagram.clusters.length,20);
  assert.equal(JSON.stringify([...diagram.positions]),JSON.stringify([...layout.create(data).positions]),'Placement is deterministic');
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

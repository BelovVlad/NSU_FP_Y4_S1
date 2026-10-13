const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,graceEnd}=require('../Karma/karma-engine.js');
const base=require('../Karma/rules.json');
const at=s=>Date.parse(s+'+07:00');
const rules={...base,series:base.series.map(s=>({...s,firstDate:'2026-09-07'}))};
const counts=n=>Object.fromEntries(rules.series.map(s=>[s.id,n]));
const snapshot=(when,n)=>({at:new Date(at(when)).toISOString(),counts:typeof n==='number'?counts(n):{...n}});
const history=(...snapshots)=>({rules,snapshots});
const run=(h,t)=>calculate(h,at(t));

test('initial snapshot and debt-free days never earn karma or flowers',()=>{
  for(const n of [0,1,100]){
    const h=history(snapshot('2026-09-07T09:00:00',n));
    const r=run(h,'2026-10-01T09:00:00');
    assert.equal(r.level,0);assert.equal(r.shield,false);
    assert.equal(r.changes.filter(c=>c.type==='increase').length,0);
  }
});
test('only repayment of the last outstanding debt raises karma',()=>{
  const c=counts(0);c[rules.series[0].id]=1;
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',c));
  assert.equal(run(h,'2026-09-08T12:00:00').level,0);
  assert.equal(run(h,'2026-09-08T12:00:00').shield,false);
  h.snapshots.push(snapshot('2026-09-08T18:00:00',1));
  const r=run(h,'2026-09-08T18:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,true);
  assert.equal(run(h,'2026-09-09T09:00:00').level,1);
  assert.equal(run(h,'2026-09-14T09:00:00').level,1);
});
test('clearing all debt when only one subject owed gives karma but no flower',()=>{
  const c=counts(1);c[rules.series[0].id]=0;
  const h=history(snapshot('2026-09-08T09:00:00',c),snapshot('2026-09-08T12:00:00',1));
  const r=run(h,'2026-09-08T12:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,false);
});
test('debt in one section of every subject is insufficient for a flower',()=>{
  const c=counts(1);
  for(const subject of new Set(rules.series.map(s=>s.subject)))c[rules.series.find(s=>s.subject===subject).id]=0;
  const h=history(snapshot('2026-09-08T09:00:00',c),snapshot('2026-09-08T12:00:00',1));
  assert.equal(run(h,'2026-09-08T12:00:00').shield,false);
  assert.equal(run(h,'2026-09-08T12:00:00').level,1);
});
test('flower requires all eight sections initially in debt and fully repaid',()=>{
  for(const section of rules.series){
    const initiallyClear=counts(0);initiallyClear[section.id]=1;
    const h=history(snapshot('2026-09-08T09:00:00',initiallyClear),snapshot('2026-09-08T12:00:00',1));
    assert.equal(run(h,'2026-09-08T12:00:00').shield,false);
    const remaining=counts(1);remaining[section.id]=0;
    const partial=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',remaining));
    assert.equal(run(partial,'2026-09-08T12:00:00').shield,false);
    assert.equal(run(partial,'2026-09-08T12:00:00').level,0);
    partial.snapshots.push(snapshot('2026-09-08T18:00:00',1));
    assert.equal(run(partial,'2026-09-08T18:00:00').shield,true);
  }
});
test('reducing backlog in every section still gives no karma until nothing is owed',()=>{
  const h=history(snapshot('2026-09-15T09:00:00',0),snapshot('2026-09-15T12:00:00',1));
  assert.equal(run(h,'2026-09-15T12:00:00').level,0);
  h.snapshots.push(snapshot('2026-09-15T18:00:00',2));
  const r=run(h,'2026-09-15T18:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,true);
  assert.equal(r.changes.find(c=>c.type==='increase').at,at('2026-09-15T18:00:00'));
});
test('repayment spread across assessment days does not earn a flower',()=>{
  const c=counts(0);c[rules.series[0].id]=1;
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',c),snapshot('2026-09-09T12:00:00',1));
  const r=run(h,'2026-09-09T12:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,false);
});
test('surplus uploads and unchanged snapshots are not repayment',()=>{
  const c=counts(0);c[rules.series[0].id]=1;
  const h=history(snapshot('2026-09-08T09:00:00',c),snapshot('2026-09-08T10:00:00',c));
  c[rules.series[0].id]=100;h.snapshots.push(snapshot('2026-09-08T12:00:00',c));
  assert.equal(run(h,'2026-09-08T12:00:00').level,0);
});
test('uploads exactly at the deadline repay newly due debt before assessment',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',0),snapshot('2026-09-08T09:00:00',1));
  const r=run(h,'2026-09-08T09:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,true);
});
test('waiting before deadline is not overdue and cannot earn repayment credit',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',0));
  const r=run(h,'2026-09-07T23:00:00');
  assert.ok(r.rows.every(row=>row.waiting));assert.equal(r.level,0);
  h.snapshots.push(snapshot('2026-09-07T23:00:00',1));
  assert.equal(run(h,'2026-09-08T09:00:00').level,0);
});
test('flower absorbs one daily loss; further debt lowers karma to minimum',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',1),snapshot('2026-09-12T18:00:00',0));
  const r=run(h,'2026-09-13T09:00:00');
  assert.equal(r.level,1);assert.equal(r.shield,false);
  assert.equal(r.protectedUntil,at('2026-09-14T09:00:00'));
  assert.equal(run(h,'2026-09-14T09:00:00').level,0);
  assert.equal(run(h,'2026-10-01T09:00:00').level,0);
  assert.equal(graceEnd(at('2026-09-13T09:00:00'),rules),at('2026-09-14T09:00:00'));
});
test('full repayment during protection can earn a new flower',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',1),snapshot('2026-09-09T12:00:00',0),snapshot('2026-09-10T18:00:00',1));
  const r=run(h,'2026-09-10T18:00:00');
  assert.equal(r.shield,true);assert.equal(r.protectedUntil,null);
});
test('same-day toggles cannot award multiple gains or flowers',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',1),snapshot('2026-09-08T13:00:00',0),snapshot('2026-09-08T18:00:00',1));
  const r=run(h,'2026-09-08T18:00:00');
  assert.equal(r.changes.filter(c=>c.type==='reinforced').length,1);
  assert.equal(r.changes.filter(c=>c.type==='increase').length,1);
});
function highHistory(){
  const h=history(snapshot('2026-09-08T09:00:00',100));
  for(let d=8;d<=15;d++){
    const c=counts(100);c[rules.series[0].id]=0;
    h.snapshots.push(snapshot(`2026-09-${String(d).padStart(2,'0')}T12:00:00`,c),snapshot(`2026-09-${String(d).padStart(2,'0')}T18:00:00`,100));
  }
  return h;
}
test('top karma requires seven days at ninth and an actual repayment',()=>{
  const h=highHistory();
  assert.equal(run(h,'2026-09-15T18:00:00').level,8);
  assert.equal(run(h,'2026-09-23T09:00:00').level,8);
  const c=counts(100);c[rules.series[0].id]=0;
  h.snapshots.push(snapshot('2026-09-23T12:00:00',c),snapshot('2026-09-23T18:00:00',100));
  assert.equal(run(h,'2026-09-23T18:00:00').level,9);
});
test('loss below ninth resets streak',()=>{
  const h=highHistory();h.snapshots.push(snapshot('2026-09-19T12:00:00',0));
  assert.equal(run(h,'2026-09-20T09:00:00').fullSince,null);
});
test('no retroactive credit; deterministic replay includes every daily assessment',()=>{
  const h=history(snapshot('2026-09-21T12:00:00',100));
  assert.throws(()=>run(h,'2026-09-20T09:00:00'));
  const r=run(h,'2026-10-01T09:00:00');
  assert.deepEqual(r,run(JSON.parse(JSON.stringify(h)),'2026-10-01T09:00:00'));
  assert.equal(r.level,0);assert.equal(r.nextDeadline,at('2026-10-02T09:00:00'));
});
test('published engine matches source',()=>{
  const fs=require('node:fs');
  for(const name of ['karma-engine.js','karma-view.js'])assert.equal(fs.readFileSync(`Karma/${name}`,'utf8'),fs.readFileSync(`docs/Karma/${name}`,'utf8'));
});

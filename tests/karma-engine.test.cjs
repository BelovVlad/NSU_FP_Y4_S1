const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,graceEnd}=require('../Karma/karma-engine.js');
const base=require('../Karma/rules.json');
const at=s=>Date.parse(s+'+07:00');
const rules={...base,series:base.series.map(s=>({...s,firstDate:'2026-09-07'}))};
const counts=n=>Object.fromEntries(rules.series.map(s=>[s.id,n]));
const snapshot=(when,n)=>({at:new Date(at(when)).toISOString(),counts:typeof n==='number'?counts(n):n});
const history=(...snapshots)=>({rules,snapshots});

test('starts at one; uploads do not directly increase karma',()=>{
  for(const n of [0,1,100])assert.equal(calculate(history(snapshot('2026-09-07T09:00:00',n)),at('2026-09-07T23:00:00')).level,0);
});
test('daily gain at 09:00 only; Saturday and Sunday count',()=>{
  const h=history(snapshot('2026-09-11T09:00:00',100));
  assert.equal(calculate(h,at('2026-09-12T08:59:59')).level,0);
  assert.equal(calculate(h,at('2026-09-12T09:00:00')).level,1);
  assert.equal(calculate(h,at('2026-09-13T09:00:00')).level,2);
});
test('one daily loss regardless of number of debts; minimum one',()=>{
  const start=snapshot('2026-09-07T09:00:00',100);
  for(const missing of [1,8]){
    const c=counts(100);rules.series.slice(0,missing).forEach(s=>c[s.id]=0);
    const h=history(start,snapshot('2026-09-10T12:00:00',c));
    assert.equal(calculate(h,at('2026-09-10T18:00:00')).level,3);
    assert.equal(calculate(h,at('2026-09-11T09:00:00')).level,2);
    assert.equal(calculate(h,at('2026-10-01T09:00:00')).level,0);
  }
});
test('all debts cleared earns flower immediately but partial repayment does not',()=>{
  const c=counts(0);c[rules.series[0].id]=100;
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',c),snapshot('2026-09-08T18:00:00',100));
  assert.equal(calculate(h,at('2026-09-08T17:00:00')).shield,false);
  const result=calculate(h,at('2026-09-08T18:00:00'));
  assert.equal(result.shield,true);assert.equal(result.level,0);
  assert.equal(calculate(h,at('2026-09-09T09:00:00')).level,1);
  assert.equal(calculate(h,at('2026-09-09T09:00:00')).shield,true);
});
test('a debt-free week alone does not earn flower',()=>{
  const r=calculate(history(snapshot('2026-09-07T09:00:00',100)),at('2026-09-14T09:00:00'));
  assert.equal(r.shield,false);assert.equal(r.level,7);
});
test('flower protects Sunday until Monday without working-day extension',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',100),snapshot('2026-09-11T12:00:00',0),
    snapshot('2026-09-11T18:00:00',100),snapshot('2026-09-12T18:00:00',0));
  const r=calculate(h,at('2026-09-13T09:00:00'));
  assert.equal(r.level,5);assert.equal(r.shield,false);
  assert.equal(r.protectedUntil,at('2026-09-14T09:00:00'));
  assert.equal(calculate(h,at('2026-09-14T08:59:59')).level,5);
  assert.equal(calculate(h,at('2026-09-14T09:00:00')).level,4);
  assert.equal(graceEnd(at('2026-09-13T09:00:00'),rules),at('2026-09-14T09:00:00'));
});
test('repaying all debts during protection earns a new flower',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',100),
    snapshot('2026-09-09T12:00:00',0),snapshot('2026-09-10T18:00:00',100));
  const r=calculate(h,at('2026-09-10T18:00:00'));
  assert.equal(r.shield,true);assert.equal(r.protectedUntil,null);
});
test('same-day debt toggles do not award multiple flowers',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',100),
    snapshot('2026-09-08T13:00:00',0),snapshot('2026-09-08T18:00:00',100));
  assert.equal(calculate(h,at('2026-09-08T18:00:00')).changes.filter(c=>c.type==='reinforced').length,1);
});
test('seven full calendar days on ninth karma unlock tenth',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',100));
  assert.equal(calculate(h,at('2026-09-15T09:00:00')).level,8);
  assert.equal(calculate(h,at('2026-09-22T08:59:59')).level,8);
  const r=calculate(h,at('2026-09-22T09:00:00'));
  assert.equal(r.level,9);assert.equal(r.fullSince,at('2026-09-15T09:00:00'));
  assert.equal(calculate(h,at('2026-10-01T09:00:00')).level,9);
});
test('loss below ninth resets the seven-day streak',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',100),snapshot('2026-09-19T12:00:00',0),snapshot('2026-09-20T18:00:00',100));
  assert.equal(calculate(h,at('2026-09-20T09:00:00')).fullSince,null);
  assert.equal(calculate(h,at('2026-09-21T09:00:00')).fullSince,at('2026-09-21T09:00:00'));
  assert.equal(calculate(h,at('2026-09-27T09:00:00')).level,8);
  assert.equal(calculate(h,at('2026-09-28T09:00:00')).level,9);
});
test('upload exactly at deadline wins tie',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',0),snapshot('2026-09-08T09:00:00',1));
  const r=calculate(h,at('2026-09-08T09:00:00'));
  assert.equal(r.level,1);assert.equal(r.shield,false);
});
test('waiting after lesson is not overdue before 09:00',()=>{
  const h=history(snapshot('2026-09-13T12:00:00',1));
  for(const series of rules.series){
    const [hours,minutes]=series.end.split(':').map(Number);
    const time=at('2026-09-14T00:00:00')+(hours*60+minutes)*60000;
    const r=calculate(h,time),row=r.rows.find(row=>row.id===series.id);
    assert.equal(row.waiting,true);assert.equal(row.waitingUntil,at('2026-09-15T09:00:00'));
    assert.equal(r.level,1);
  }
  assert.equal(calculate(h,at('2026-09-15T09:00:00')).level,0);
});
test('surplus notes cannot repay debt in another section',()=>{
  const c=counts(0);c['fiham-lectures']=100;
  const r=calculate(history(snapshot('2026-09-08T09:00:00',c)),at('2026-09-09T09:00:00'));
  assert.equal(r.level,0);assert.equal(r.raw,1);assert.equal(r.shield,false);
});
test('no retroactive credit before first reliable snapshot',()=>{
  const h=history(snapshot('2026-09-21T12:00:00',100));
  assert.equal(calculate(h,at('2026-09-21T12:00:00')).level,0);
  assert.throws(()=>calculate(h,at('2026-09-20T09:00:00')));
});
test('replay is deterministic after long absence and includes every day',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',100));
  const result=calculate(h,at('2026-10-01T09:00:00'));
  assert.deepEqual(result,calculate(JSON.parse(JSON.stringify(h)),at('2026-10-01T09:00:00')));
  assert.equal(result.level,9);
  assert.equal(result.nextDeadline,at('2026-10-02T09:00:00'));
});

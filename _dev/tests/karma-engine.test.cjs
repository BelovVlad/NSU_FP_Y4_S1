const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,graceEnd}=require('../../docs/Karma/karma-engine.js');
const base=require('../../docs/Karma/rules.json');
const at=s=>Date.parse(s+'+07:00');
const rules={...base,series:base.series.map(s=>({...s,firstDate:'2026-09-07'}))};
const counts=n=>Object.fromEntries(rules.series.map(s=>[s.id,n]));
// Debts in seven of eight sections: never enough for a flower.
const partialDebt=()=>({...counts(0),[rules.series[0].id]:100});
const snapshot=(when,n)=>({at:new Date(at(when)).toISOString(),counts:typeof n==='number'?counts(n):n});
const history=(...snapshots)=>({rules,snapshots:snapshots.flat(2)});
// One debt and one full repayment per day, starting on 2026-09-08.
const climb=days=>Array.from({length:days},(_,i)=>{
  const day=new Date(Date.UTC(2026,8,8+i)).toISOString().slice(0,10);
  return [snapshot(day+'T10:00:00',partialDebt()),snapshot(day+'T12:00:00',100)];
});

test('starts at one; uploads do not directly increase karma',()=>{
  for(const n of [0,1,100])assert.equal(calculate(history(snapshot('2026-09-07T09:00:00',n)),at('2026-09-07T23:00:00')).level,0);
});
test('a day without debts keeps the level; weekends count',()=>{
  const h=history(climb(2));
  assert.equal(calculate(h,at('2026-09-09T12:00:00')).level,2);
  for(const day of ['10','12','13'])assert.equal(calculate(h,at(`2026-09-${day}T09:00:00`)).level,2);
});
test('full repayment raises karma at once, at most once per day; partial repayment does not',()=>{
  const half={...partialDebt(),[rules.series[1].id]:100,[rules.series[2].id]:100};
  const h=history(snapshot('2026-09-08T10:00:00',partialDebt()),snapshot('2026-09-08T11:00:00',half),
    snapshot('2026-09-08T12:00:00',100),snapshot('2026-09-08T13:00:00',partialDebt()),snapshot('2026-09-08T14:00:00',100),
    snapshot('2026-09-09T10:00:00',partialDebt()),snapshot('2026-09-09T12:00:00',100));
  assert.equal(calculate(h,at('2026-09-08T11:30:00')).level,0);
  assert.equal(calculate(h,at('2026-09-08T12:00:00')).level,1);
  assert.equal(calculate(h,at('2026-09-08T14:00:00')).level,1);
  assert.equal(calculate(h,at('2026-09-09T12:00:00')).level,2);
});
test('one daily loss regardless of number of debts; minimum one',()=>{
  for(const missing of [1,8]){
    const c=counts(100);rules.series.slice(0,missing).forEach(s=>c[s.id]=0);
    const h=history(climb(3),snapshot('2026-09-10T18:00:00',c));
    assert.equal(calculate(h,at('2026-09-10T18:00:00')).level,3);
    assert.equal(calculate(h,at('2026-09-11T09:00:00')).level,2);
    assert.equal(calculate(h,at('2026-10-01T09:00:00')).level,0);
    assert.equal(calculate(h,at('2026-10-01T09:00:00')).shield,false);
  }
});
test('repaying debts in all eight sections the same day earns flower and an increase',()=>{
  const c=counts(0);c[rules.series[0].id]=100;
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',c),snapshot('2026-09-08T18:00:00',100));
  assert.equal(calculate(h,at('2026-09-08T17:00:00')).shield,false);
  const result=calculate(h,at('2026-09-08T18:00:00'));
  assert.equal(result.shield,true);assert.equal(result.level,1);
  assert.equal(calculate(h,at('2026-09-09T09:00:00')).level,1);
  assert.equal(calculate(h,at('2026-09-09T09:00:00')).shield,true);
});
test('flower requires debts in every section',()=>{
  const r=calculate(history(snapshot('2026-09-08T09:00:00',partialDebt()),snapshot('2026-09-08T18:00:00',100)),at('2026-09-08T18:00:00'));
  assert.equal(r.level,1);assert.equal(r.shield,false);
});
test('all-section debt from an earlier day does not earn flower',()=>{
  const c=counts(0);c[rules.series[0].id]=100;
  const h=history(snapshot('2026-09-08T10:00:00',0),snapshot('2026-09-08T12:00:00',c),snapshot('2026-09-09T12:00:00',100));
  const r=calculate(h,at('2026-09-09T12:00:00'));
  assert.equal(r.level,1);assert.equal(r.shield,false);
});
test('a debt-free week alone does not earn flower or karma',()=>{
  const r=calculate(history(snapshot('2026-09-07T09:00:00',100)),at('2026-09-14T09:00:00'));
  assert.equal(r.shield,false);assert.equal(r.level,0);
});
test('flower protects Sunday until Monday without working-day extension',()=>{
  const h=history(climb(3),snapshot('2026-09-11T10:00:00',0),
    snapshot('2026-09-11T18:00:00',100),snapshot('2026-09-12T18:00:00',0));
  assert.equal(calculate(h,at('2026-09-11T18:00:00')).level,4);
  const r=calculate(h,at('2026-09-13T09:00:00'));
  assert.equal(r.level,4);assert.equal(r.shield,false);
  assert.equal(r.protectedUntil,at('2026-09-14T09:00:00'));
  assert.equal(calculate(h,at('2026-09-14T08:59:59')).level,4);
  assert.equal(calculate(h,at('2026-09-14T09:00:00')).level,3);
  assert.equal(graceEnd(at('2026-09-13T09:00:00'),rules),at('2026-09-14T09:00:00'));
});
test('a new flower during protection needs the same conditions',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',100),
    snapshot('2026-09-09T12:00:00',0),snapshot('2026-09-10T18:00:00',100));
  const protectedState=calculate(h,at('2026-09-10T12:00:00'));
  assert.equal(protectedState.shield,false);assert.equal(protectedState.protectedUntil,at('2026-09-11T09:00:00'));
  const r=calculate(h,at('2026-09-10T18:00:00'));
  assert.equal(r.shield,true);assert.equal(r.protectedUntil,null);assert.equal(r.level,2);
});
test('same-day debt toggles do not award multiple flowers or increases',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T12:00:00',100),
    snapshot('2026-09-08T13:00:00',0),snapshot('2026-09-08T18:00:00',100));
  const r=calculate(h,at('2026-09-08T18:00:00'));
  assert.equal(r.changes.filter(c=>c.type==='reinforced').length,1);
  assert.equal(r.level,1);
});
test('flower progress counts repaid sections only while a flower is in reach',()=>{
  const half=counts(0);rules.series.slice(0,4).forEach(s=>half[s.id]=100);
  const h=history(snapshot('2026-09-08T09:00:00',0),snapshot('2026-09-08T11:00:00',half),snapshot('2026-09-08T18:00:00',100));
  assert.equal(calculate(h,at('2026-09-08T10:00:00')).flowerProgress,0);
  assert.equal(calculate(h,at('2026-09-08T11:00:00')).flowerProgress,.5);
  assert.equal(calculate(h,at('2026-09-08T18:00:00')).flowerProgress,null);
  assert.equal(calculate(history(snapshot('2026-09-08T09:00:00',partialDebt())),at('2026-09-08T10:00:00')).flowerProgress,null);
});
test('seven full days on ninth karma let the next full repayment unlock tenth',()=>{
  const h=history(climb(8),snapshot('2026-09-23T10:00:00',partialDebt()),snapshot('2026-09-23T12:00:00',100));
  assert.equal(calculate(h,at('2026-09-15T12:00:00')).level,8);
  const waiting=calculate(h,at('2026-09-23T11:00:00'));
  assert.equal(waiting.level,8);assert.equal(waiting.fullSince,at('2026-09-15T12:00:00'));
  assert.equal(calculate(h,at('2026-09-23T12:00:00')).level,9);
  assert.equal(calculate(h,at('2026-10-01T09:00:00')).level,9);
  assert.equal(calculate(history(climb(8)),at('2026-10-01T09:00:00')).level,8);
  const early=history(climb(8),snapshot('2026-09-21T10:00:00',partialDebt()),snapshot('2026-09-21T12:00:00',100));
  assert.equal(calculate(early,at('2026-09-21T12:00:00')).level,8);
});
test('loss below ninth resets the seven-day streak',()=>{
  const h=history(climb(8),snapshot('2026-09-19T12:00:00',partialDebt()),snapshot('2026-09-20T18:00:00',100));
  const lost=calculate(h,at('2026-09-20T09:00:00'));
  assert.equal(lost.level,7);assert.equal(lost.fullSince,null);
  const back=calculate(h,at('2026-09-20T18:00:00'));
  assert.equal(back.level,8);assert.equal(back.fullSince,at('2026-09-20T18:00:00'));
});
test('upload exactly at deadline wins tie',()=>{
  const h=history(snapshot('2026-09-08T10:00:00',partialDebt()),snapshot('2026-09-08T12:00:00',1),snapshot('2026-09-15T09:00:00',2));
  const r=calculate(h,at('2026-09-15T09:00:00'));
  assert.equal(r.level,1);assert.equal(r.shield,false);
  assert.equal(calculate(history(h.snapshots.slice(0,2)),at('2026-09-15T09:00:00')).level,0);
});
test('waiting after lesson is not overdue before 09:00',()=>{
  const h=history(climb(1),snapshot('2026-09-13T12:00:00',1));
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
  const h=history(climb(3));
  const result=calculate(h,at('2026-10-01T09:00:00'));
  assert.deepEqual(result,calculate(JSON.parse(JSON.stringify(h)),at('2026-10-01T09:00:00')));
  assert.equal(result.level,3);
  assert.equal(result.nextDeadline,at('2026-10-02T09:00:00'));
});

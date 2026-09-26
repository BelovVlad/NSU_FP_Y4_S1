const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,graceEnd}=require('../Karma/karma-engine.js');
const base=require('../Karma/rules.json');
const at=s=>Date.parse(s+'+07:00');
const rules={...base,series:base.series.map(s=>({...s,firstDate:'2026-09-07'}))};
const counts=n=>Object.fromEntries(rules.series.map(s=>[s.id,n]));
const snapshot=(when,n)=>({at:new Date(at(when)).toISOString(),counts:typeof n==='number'?counts(n):n});
const history=(...snapshots)=>({rules,snapshots});

test('zero start; one point per covered direction, not per uploaded file',()=>{
  assert.equal(calculate(history(snapshot('2026-09-07T09:00:00',0)),at('2026-09-07T20:00:00')).level,0);
  const c=counts(0);c[rules.series[0].id]=7;
  assert.equal(calculate(history(snapshot('2026-09-07T09:00:00',c)),at('2026-09-07T20:00:00')).level,1);
});
test('FIHAM lectures 4/4 earn no points while seminars are 2/4',()=>{
  const c=counts(0);c['fiham-lectures']=4;c['fiham-seminars']=2;
  const r=calculate(history(snapshot('2026-09-29T09:00:00',c)),at('2026-09-29T09:00:00'));
  assert.equal(r.raw,0);
  const lectures=r.rows.find(row=>row.id==='fiham-lectures');
  assert.equal(lectures.sectionComplete,true);assert.equal(lectures.complete,false);assert.equal(lectures.blockedBySubject,true);
  c['fiham-seminars']=4;
  assert.equal(calculate(history(snapshot('2026-09-29T09:00:00',c)),at('2026-09-29T09:00:00')).raw,2);
});
test('no loss at lesson end or 08:59; loss exactly at next 09:00',()=>{
  const h=history(snapshot('2026-09-13T12:00:00',1));
  for(const t of ['2026-09-14T18:00:00','2026-09-15T08:59:59'])assert.equal(calculate(h,at(t)).level,8);
  assert.equal(calculate(h,at('2026-09-15T09:00:00')).level,0);
});
test('on-time upload at deadline wins tie and keeps level',()=>{
  const h=history(snapshot('2026-09-13T12:00:00',1),snapshot('2026-09-15T09:00:00',2));
  assert.equal(calculate(h,at('2026-09-15T09:00:00')).level,8);
});
test('missing current week loses point even if earlier notes exist',()=>{
  const h=history(snapshot('2026-09-13T12:00:00',1));
  assert.equal(calculate(h,at('2026-09-15T09:00:00')).rows[0].due,2);
});
test('level 9 only after full fourteen days, not at day 13',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',10));
  assert.equal(calculate(h,at('2026-09-21T08:59:59')).level,8);
  assert.equal(calculate(h,at('2026-09-21T09:00:00')).level,9);
});
test('seven days earns flower; one workday of protection then a drop',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',1));
  assert.equal(calculate(h,at('2026-09-14T08:59:59')).shield,false);
  assert.equal(calculate(h,at('2026-09-14T09:00:00')).shield,true);
  const protectedState=calculate(h,at('2026-09-15T09:00:00'));
  assert.equal(protectedState.level,8);assert.equal(protectedState.raw,0);
  assert.equal(protectedState.protectedUntil,at('2026-09-16T09:00:00'));
  assert.equal(calculate(h,at('2026-09-16T08:59:59')).level,8);
  assert.equal(calculate(h,at('2026-09-16T09:00:00')).level,0);
});
test('Sunday is skipped; Saturday is a working day',()=>{
  assert.equal(graceEnd(at('2026-09-27T09:00:00'),rules),at('2026-09-29T09:00:00'));
  assert.equal(graceEnd(at('2026-09-26T09:00:00'),rules),at('2026-09-27T09:00:00'));
});
test('catch-up during protection consumes flower and resets perfect streak',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',1),snapshot('2026-09-15T18:00:00',10));
  const r=calculate(h,at('2026-09-16T09:00:00'));
  assert.equal(r.level,8);assert.equal(r.shield,false);assert.equal(r.protectedUntil,null);
  assert.equal(r.fullSince,at('2026-09-15T18:00:00'));
  assert.equal(calculate(h,at('2026-09-21T09:00:00')).level,8);
});
test('partial catch-up does not extend protection indefinitely',()=>{
  const c=counts(1);c[rules.series[0].id]=2;
  const h=history(snapshot('2026-09-07T09:00:00',1),snapshot('2026-09-15T18:00:00',c));
  assert.equal(calculate(h,at('2026-09-16T09:00:00')).level,1);
});
test('no retroactive credit before first reliable snapshot',()=>{
  const h=history(snapshot('2026-09-21T09:00:00',10));
  const r=calculate(h,at('2026-09-21T09:00:00'));
  assert.equal(r.level,8);assert.equal(r.shield,false);
  assert.throws(()=>calculate(h,at('2026-09-20T09:00:00')));
});
test('exact seven-day boundary can protect a simultaneous loss',()=>{
  const h=history(snapshot('2026-09-08T09:00:00',1));
  const r=calculate(h,at('2026-09-15T09:00:00'));
  assert.equal(r.level,8);assert.equal(r.raw,0);assert.ok(r.protectedUntil);
});
test('replay gives same results on another device and after long absence',()=>{
  const h=history(snapshot('2026-09-07T09:00:00',1));
  calculate(h,at('2026-09-14T09:00:00'));
  assert.deepEqual(calculate(h,at('2026-10-01T09:00:00')),calculate(JSON.parse(JSON.stringify(h)),at('2026-10-01T09:00:00')));
  assert.equal(calculate(h,at('2026-10-01T09:00:00')).level,0);
});

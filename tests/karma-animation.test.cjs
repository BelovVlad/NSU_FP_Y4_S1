const test=require('node:test'),assert=require('node:assert/strict');
const {Animation,sounds}=require('../Karma/karma-animation.js');
function run(previous,result,options={}){
  const events=[];const m=new Animation(previous,result,{...options,random:()=>.5,onEvent:e=>events.push(e)});
  let maxRadius=0,maxVolume=0,n=0;
  do{m.step();maxRadius=Math.max(maxRadius,m.radius);maxVolume=Math.max(maxVolume,m.loopVolume)}while(m.active&&++n<1200);
  assert.ok(n<1200,'animation settles');
  return {m,events,maxRadius,maxVolume};
}
test('increase follows actual ladder phases and delivers one enlarged bump',()=>{
  const r=run({level:1},{level:2,raw:2});
  assert.deepEqual(r.events.filter(e=>e.type==='phase').map(e=>e.phase),['Deselecting','MovingA','MovingB','Settling','Bump','Resting']);
  assert.deepEqual(r.events.filter(e=>e.type==='sound').map(e=>e.id),['Deselect','Start_Moving','Increase_Bump']);
  assert.ok(r.maxRadius>=130);assert.ok(r.maxVolume>.4);
  const start=r.events.find(e=>e.phase==='Bump').tick;
  assert.equal(r.events.find(e=>e.id==='Increase_Bump').tick-start,5);
});
test('decrease does not play increase impact',()=>{
  const r=run({level:8},{level:1,raw:1});
  assert.equal(r.m.phase,'Resting');assert.ok(Math.abs(r.m.scroll-1)<.01);
  assert.ok(!r.events.some(e=>e.id==='Increase_Bump'));
});
test('protection grabs, pulls and returns to protected level',()=>{
  const r=run({level:8,shield:true},{level:8,raw:6,protectedUntil:12345});
  const ids=r.events.filter(e=>e.type==='sound').map(e=>e.id);
  assert.ok(ids.includes('Reinforce_Save_Grab'));assert.ok(ids.includes('Reinforce_Save_Pull'));
  assert.ok(Math.abs(r.m.scroll-8)<.01);assert.equal(r.m.flowerAlpha,1);
});
test('protection dissipation has both original events',()=>{
  const r=run({level:8,protectedUntil:1},{level:3,raw:3});
  assert.ok(r.events.some(e=>e.id==='Reinforcement_Dissipate_A'));
  assert.ok(r.events.some(e=>e.id==='Reinforcement_Dissipate_B'));
  assert.equal(r.m.flowerAlpha,0);
});
test('reinforcement acquisition preserves HUD frames 20 and 135',()=>{
  const r=run({level:5},{level:5,raw:5,shield:true});
  assert.equal(r.events.find(e=>e.id==='HUD_Reinforce_Flicker').tick,20);
  assert.equal(r.events.find(e=>e.id==='HUD_Reinforce_Bump').tick,135);
});
test('upper and lower caps use their corresponding event',()=>{
  for(const [level,goal,id] of [[9,10,'Hit_Upper_Cap'],[0,-1,'Hit_Lower_Cap']]){
    const r=run({level},{level,raw:level},{requestedLevel:goal});
    assert.ok(r.events.some(e=>e.id===id));assert.ok(Math.abs(r.m.scroll-level)<.01);
  }
});
test('PLAYALL preserves sample volumes and does not select one sample',()=>{
  assert.deepEqual(sounds.Increase_Bump,[['karmaRiseA',.4],['UIWoodHit',.4]]);
  assert.deepEqual(sounds.Upper_Cap_Bump,sounds.Increase_Bump);
  assert.deepEqual(sounds.Movement_LOOP,[['karmaWheelLow',.5]]);
});
test('40 Hz state does not depend on browser frame rate',()=>{
  const a=new Animation({level:1},{level:4,raw:4},{random:()=>.5});
  const b=new Animation({level:1},{level:4,raw:4},{random:()=>.5});
  for(let i=0;i<240;i++)a.advance(1/40);
  for(let i=0;i<720;i++)b.advance(1/120);
  assert.ok(Math.abs(a.scroll-b.scroll)<.001);assert.equal(a.phase,b.phase);
});

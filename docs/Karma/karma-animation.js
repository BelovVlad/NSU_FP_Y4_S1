/* Port of Menu.KarmaLadder.Update / HUD.KarmaMeter at 40 simulation ticks/s.
   The website's gain burst is deliberately larger; see ANIMATION-NOTES.md. */
(function(root){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*clamp(t);
  const inv=(a,b,v)=>clamp((v-a)/(b-a));
  const tick=(a,b,l,t)=>{const v=lerp(a,b,l);return v<b?Math.min(v+t,b):Math.max(v-t,b)};
  function sCurve(x,k){x=x*2-1;if(x<0){x=Math.abs(1+x);return k*x/(k-x+1)*.5}k=-1-k;return .5+k*x/(k-x+1)*.5}
  const sounds={
    Movement_LOOP:[['karmaWheelLow',.5]],Deselect:[['karmaFuzz',.4]],
    Start_Moving:[['karmaWheelC',.4]],Hit_Upper_Cap:[['capBell2',.3]],
    Hit_Lower_Cap:[['campBell2',.3]],Reinforce_Save_Grab:[['UIWood5',.5]],
    Reinforce_Save_Pull:[['UIWood5',.5]],Reinforcement_Dissipate_A:[['karmaFuzz2',.6]],
    Reinforcement_Dissipate_B:[['UIWood',.5]],Increase_Bump:[['karmaRiseA',.4],['UIWoodHit',.4]],
    Upper_Cap_Bump:[['karmaRiseA',.4],['UIWoodHit',.4]]
  };
  class Animation {
    constructor(previous,result,{random=Math.random,onEvent=()=>{},requestedLevel=result.level}={}){
      this.random=random;this.onEvent=onEvent;this.result=result;this.initial=previous.level;
      this.scroll=previous.level;this.previousScroll=this.scroll;this.velocity=0;
      this.goal=requestedLevel;this.increasing=this.goal>this.initial;
      this.capped=this.goal<0||this.goal>9;this.save=!!result.protectedUntil&&!previous.protectedUntil;
      if(this.save)this.goal=result.raw;
      this.lost=!!(previous.shield||previous.protectedUntil)&&!(result.shield||result.protectedUntil)&&result.level<=previous.level;
      this.death=this.lost?.01:0;this.flowerAlpha=previous.shield||previous.protectedUntil?1:0;
      this.gained=!!result.shield&&!previous.shield;this.reinforceTick=this.gained?0:-1;
      this.radius=51.5;this.thickness=3;this.glow=1;this.flat=1;this.selector=0;this.clamp=0;
      this.energy=Array(10).fill(1);this.flicker=Array(10).fill(0);this.waves=[];this.bloom=0;
      this.phase='Resting';this.phaseTick=0;this.totalTicks=0;this.accumulator=0;
      if(this.goal!==this.initial||this.capped||this.save)this.enter('Deselecting');
      else if(this.lost)this.enter('Settling');
    }
    emit(id){this.onEvent({type:'sound',id,tick:this.totalTicks})}
    enter(phase){
      this.phase=phase;this.phaseTick=-1;this.onEvent({type:'phase',phase,tick:this.totalTicks});
      if(phase==='Deselecting')this.emit('Deselect');
      if(['MovingA','CappedMovement','ReinforceSave'].includes(phase))this.emit('Start_Moving');
      if(phase==='Settling'&&this.lost)this.emit('Reinforcement_Dissipate_A');
    }
    wave(radius,speed,slow,life,thickness){this.waves.push({radius,speed,slow,life,maxLife:life,thickness})}
    step(){
      this.totalTicks++;this.previousScroll=this.scroll;
      this.waves=this.waves.filter(w=>--w.life>0);
      for(const w of this.waves){w.radius+=w.speed;w.speed*=w.slow}
      for(let i=0;i<10;i++){
        if(this.random()>inv(5,40,this.flicker[i]))this.energy[i]=tick(this.energy[i],1,.1,1/70);
        if(this.flicker[i]>0){this.flicker[i]--;if(this.random()<inv(5,19,this.flicker[i]))this.energy[i]*=.45+this.random()*.5}
      }
      this.scroll+=this.velocity;this.glow=tick(this.glow,1,.2,.0125);
      this.thickness=3;this.selector=0;this.phaseTick++;
      const n=this.phaseTick;
      if(this.phase==='Resting'){
        this.radius=tick(this.radius,51.5,.08,.01);this.flat=1;
        this.velocity*=.3;this.scroll=lerp(this.scroll,this.result.level,.2);
      }else if(this.phase==='Deselecting'){
        this.radius=tick(this.radius,55,.08,.01);
        const p=inv(0,30,n);if(this.random()<p)this.glow=lerp(this.random(),0,p);this.flat=1-p;
        if(p===1){this.enter(this.save?'ReinforceSave':this.capped?'CappedMovement':'MovingA');this.velocity+=Math.sign(this.initial-this.goal)*.01}
      }else if(this.phase==='MovingA'||this.phase==='MovingB'){
        const a=this.phase==='MovingA';this.radius=tick(this.radius,50,.1,.1);this.glow=0;this.flat=0;
        const target=this.goal-Math.sign(this.goal-this.initial)*.049*(a?1:0);
        this.velocity+=(target-this.scroll)/(a?400:3)+Math.sign(target-this.scroll)*.001;
        this.velocity*=a?.95:.9;
        if(((this.scroll<target)===(this.goal<this.initial))===a)this.enter(a?'MovingB':'Settling');
      }else if(this.phase==='Settling'){
        const p=inv(0,40,n);this.velocity*=.6;this.scroll=lerp(this.scroll,this.result.level,.2);
        this.radius=51.5+Math.sin(p*Math.PI)*3+(this.increasing?Math.sin(p*Math.PI*1.5)*3:0);
        if(this.increasing){this.thickness=3+3*Math.sin(p**5*Math.PI);this.selector=inv(.3,.6,p);this.glow=Math.sin(p**5*Math.PI)*.4;this.flat=0}
        else{this.flat=lerp(this.flat,1,p**4);this.glow*=.9-this.death*.3}
        if(this.lost&&this.death<1){
          this.glow+=.3*Math.sin(this.death**3*Math.PI);this.radius+=10*Math.sin(this.death**3*Math.PI);
          this.death=Math.max(this.death,inv(.2,.8,p));this.flowerAlpha=1-this.death;
          if(this.death===1){this.wave(31.5,16,.82,40,8);this.emit('Reinforcement_Dissipate_B')}
        }
        if(p===1)this.enter(this.increasing?(this.capped?'CapBump':'Bump'):'Resting');
      }else if(this.phase==='Bump'||this.phase==='CapBump'){
        const cap=this.phase==='CapBump',p=inv(0,45,n);
        this.velocity*=.4;this.scroll=lerp(this.scroll,this.result.level,.2);
        this.radius=53+lerp(cap?32:80,0,p**.13)-(cap?1:2)*inv(.8,1,p);
        this.glow=(1+(cap?.5:1)*Math.sin(p**.2*Math.PI))*(1-p)**.4;this.flat=p**.3;
        if(n===4){this.wave(this.radius,cap?22:35,.88,60,8);this.emit(cap?'Upper_Cap_Bump':'Increase_Bump')}
        if(n===5)for(let i=0;i<10;i++)if(i!==this.result.level)this.energy[i]=0;
        if(n===6)for(let i=0;i<10;i++)if(i!==this.result.level)this.flicker[i]=40+Math.floor(this.random()*40)+(Math.abs(i-this.result.level)<2?25:0);
        if(p===1)this.enter('Resting');
      }else if(this.phase==='CappedMovement'){
        const p=inv(0,15,n);this.radius=tick(this.radius,50,.1,.1);this.glow=0;this.flat=0;
        this.velocity*=lerp(1,.92,p**6);
        if(n===9)this.emit(this.goal>this.initial?'Hit_Upper_Cap':'Hit_Lower_Cap');
        this.velocity+=(p<.5?-1:1)*Math.sign(this.initial-this.goal)*.001;
        if(p===1){this.goal=this.initial;this.enter('Settling')}
      }else if(this.phase==='ReinforceSave'){
        const p=inv(0,35,n);this.radius=tick(this.radius,50+20*this.clamp**.2,.1,.1);
        this.glow=0;this.flat=0;this.velocity*=.95;
        this.velocity+=p<.25?(this.goal-this.scroll)/400+Math.sign(this.goal-this.scroll)*.001:Math.sign(this.initial-this.goal)*.001;
        this.scroll=lerp(this.scroll,this.initial,inv(.6,1,p)**8);
        if(n===17)this.emit('Reinforce_Save_Grab');if(n===35)this.emit('Reinforce_Save_Pull');
        this.clamp=p>.2?inv(.2,.5,p):0;
        if(n>=50&&Math.abs(this.scroll-this.initial)<.1){this.goal=this.initial;this.clamp=0;this.enter('Settling')}
      }
      if(this.reinforceTick>=0){
        const t=++this.reinforceTick;
        if(t===20)this.emit('HUD_Reinforce_Flicker');
        if(t>20&&t<100)this.glow=1+(this.random()*2-1)*.03*inv(20,100,t);
        if(t===104)this.wave(this.radius,11,.82,50,4);
        if(t>104&&t<130)this.radius-=Math.sin(inv(104,130,t)*Math.PI)**.5*4;
        if(t>130)this.radius+=Math.sin(inv(130,140,t)**.2*Math.PI)*10;
        if(t===135){this.flowerAlpha=1;this.glow=1.7;this.wave(this.radius,22,.92,100,8);this.emit('HUD_Reinforce_Bump');this.reinforceTick=-1}
      }
      if(!this.gained&&!this.lost)this.flowerAlpha=this.result.shield||this.result.protectedUntil?1:0;
      this.bloom=Math.max(this.glow>1?(this.glow-1)*.85:0,this.bloom-1/70);
      const speed=Math.abs(this.scroll-this.previousScroll);
      this.loopVolume=inv(0,.01,speed)*.5;this.loopPitch=lerp(.5,1,inv(0,.03,speed)**.8);
    }
    advance(seconds){this.accumulator+=Math.max(0,seconds)*40;while(this.accumulator>=1){this.step();this.accumulator--}return this}
    get active(){return this.phase!=='Resting'||this.reinforceTick>=0||this.waves.length>0||this.bloom>0||Math.abs(this.radius-51.5)>.1||this.flicker.some(n=>n>0)||this.energy.some(n=>n<.999)}
  }
  const api={Animation,sounds,clamp,lerp,inv,sCurve};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KarmaAnimation=api;
})(typeof window!=='undefined'?window:globalThis);

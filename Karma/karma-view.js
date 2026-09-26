(() => {
  'use strict';
  const ROOT=new URL('./',document.currentScript.src);
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const date=t=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(t);
  const completedDays=(since,days,now)=>since===null?0:Math.min(days,Math.max(0,Math.floor((now-since)/86400000)));
  const icons=Array.from({length:10},(_,i)=>{
    const image=new Image();image.src=new URL(`sprites/karma${i<5?i:i+'-9'}.png`,ROOT);return image;
  });
  const flower=new Image();flower.src=new URL('sprites/karmaRingReinforced.png',ROOT);
  const ring=new Image();ring.src=new URL('sprites/karmaRing.png',ROOT);
  const imagesReady=Promise.all([...icons,flower,ring].map(image=>image.decode().catch(()=>{})));
  class KarmaView {
    constructor(host){
      this.host=host;this.frame=0;this.stops=[];this.last=null;this.generation=0;
      host.innerHTML=`<div class="karma-header"><h3>Карма</h3></div>
        <div class="karma-body"><div class="karma-display" role="img"><canvas width="360" height="360" aria-hidden="true"></canvas></div>
        <div class="karma-details"><p class="karma-status" role="status">Проверяю историю конспектов…</p><div class="karma-tracks"></div><div class="karma-series"></div>
        <details class="karma-rules"><summary>Как считается карма</summary><p>Начальная карма — 1. По одному очку за каждое из восьми направлений. Лекции и семинары дают очки независимо: если в разделе есть конспекты и закрыты все наступившие сроки, он приносит одно очко. Счётчик предмета объединяет конспекты по этим разделам.</p><p>После занятия есть время до 09:00 следующего дня. Все восемь направлений дают уровень 9. Две недели без просрочек на этом уровне открывают уровень 10.</p><p>Семь суток на одном уровне дают кармацвет. При просрочке он удержит уровень на один рабочий день (пн–сб), до 09:00 следующего дня. Если долг остаётся, защита исчезнет. Просрочка прерывает путь к уровню 10 даже под защитой. Полосы прогресса учитывают полные сутки.</p><p class="karma-history-note"></p></details></div></div>`;
      this.canvas=host.querySelector('canvas');
    }
    error(){
      const status=this.host.querySelector('.karma-status');
      status.hidden=false;
      status.textContent='История кармы временно недоступна. Попробуйте обновить данные.';
    }
    render(result,now=Date.now(),fresh=false){
      const h=this.host;
      // The game sprites, animation and saved visual state use indices 0–9.
      const displayLevel=result.level+1;
      h.dataset.level=displayLevel;
      h.querySelector('.karma-display').setAttribute('aria-label',`Карма ${displayLevel} из 10${result.shield?' · закреплена':''}`);
      const status=h.querySelector('.karma-status');
      status.textContent=result.protectedUntil
        ?`Кармацвет удерживает уровень ${displayLevel} до ${date(result.protectedUntil)}.`
        :result.level===9?'Высшая карма. Все направления закрыты в срок две недели подряд.'
        :result.shield?'Карма закреплена кармацветом.':'';
      status.hidden=!status.textContent;
      const flowerDays=result.shield?7:completedDays(result.stableSince,7,now);
      const maximumDays=completedDays(result.fullSince,14,now);
      h.querySelector('.karma-tracks').innerHTML=`<div><span>Кармацвет${result.shield?' · закреплено':result.protectedUntil?' · защита действует':''}</span><b>${flowerDays} / 7 дней</b><i><em style="width:${flowerDays/7*100}%"></em></i></div>
        <div><span>Высшая карма</span><b>${maximumDays} / 14 дней</b><i><em style="width:${maximumDays/14*100}%"></em></i></div>`;
      const subjects=new Map();
      for(const row of result.rows){
        if(!subjects.has(row.subject))subjects.set(row.subject,[]);
        subjects.get(row.subject).push(row);
      }
      h.querySelector('.karma-series').innerHTML=[...subjects].map(([subject,rows])=>{
        rows.sort((a,b)=>a.section.localeCompare(b.section,'ru'));
        const complete=rows.every(row=>row.complete);
        // Extra notes in one section cannot cover missing notes in another.
        const covered=rows.reduce((sum,row)=>sum+Math.min(row.actual,row.due),0);
        const due=rows.reduce((sum,row)=>sum+row.due,0);
        const breakdown=rows.map(row=>`${row.section}: ${row.actual} / ${row.due}`).join('; ');
        return `<div class="karma-subject ${complete?'complete':''}" title="${esc(breakdown)}"><span class="karma-subject-dot">${complete?'✓':'·'}</span><span>${esc(subject)} <small>${esc(rows.map(row=>row.section).join(' + '))}</small></span><b>${covered} / ${due}</b></div>`;
      }).join('');
      h.querySelector('.karma-history-note').textContent=`Серия считается по истории публикаций с ${date(result.observedFrom)}. ${result.rows.some(r=>r.actual>r.due)?'Конспекты, добавленные до срока, уже учтены. ':''}Следующий срок — ${date(result.nextDeadline)}.`;
      let previous=this.last;
      if(!previous){try{previous=JSON.parse(localStorage.getItem('nsu-editor-karma-visual-v1'))}catch{}}
      if(!previous||!Number.isInteger(previous.level)||previous.level<0||previous.level>9)previous=result;
      const changed=previous.level!==result.level||previous.shield!==result.shield||previous.protectedUntil!==result.protectedUntil;
      if(changed||fresh||!this.last)this.animate(previous,result,changed);
      this.last=result;
      try{localStorage.setItem('nsu-editor-karma-visual-v1',JSON.stringify({level:result.level,shield:result.shield,protectedUntil:result.protectedUntil}))}catch{}
    }
    stop(){
      this.generation++;cancelAnimationFrame(this.frame);this.stops.forEach(stop=>stop());this.stops=[];
    }
    sound(name,volume,options){
      const stop=window.playSecretDashboardSound?.(name,volume,options);
      if(stop)this.stops.push(stop);
      return stop;
    }
    event(id){
      const samples=window.KarmaAnimation.sounds[id]||({HUD_Reinforce_Flicker:[['karmaFuzz2',.4]],HUD_Reinforce_Bump:[['UIWood5',.5]]})[id]||[];
      for(let [name,volume] of samples){
        // These two names are absent from the supplied game bundle; no invented substitutes.
        if(name==='campBell2'||name==='UIWood')continue;
        if(name==='karmaWheelC')name+=`_${1+Math.floor(Math.random()*4)}`;
        this.sound(name,volume);
      }
    }
    async animate(previous,result,changed){
      this.stop();const generation=this.generation;
      await imagesReady;
      if(generation!==this.generation||!this.host.closest('.is-open'))return;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(changed&&!reduced)await window.preloadKarmaSounds?.();
      if(generation!==this.generation||!this.host.closest('.is-open'))return;
      const model=new window.KarmaAnimation.Animation(reduced?result:previous,result,{onEvent:event=>{
        if(event.type==='sound'&&!reduced)this.event(event.id);
      }});
      if(reduced){model.reinforceTick=-1;model.flowerAlpha=result.shield||result.protectedUntil?1:0}
      const loop=changed&&!reduced?this.sound('karmaWheelLow',0,{loop:true,pitch:.5}):null;
      let lastTime=performance.now();
      const draw=time=>{
        if(generation!==this.generation)return;
        model.advance(Math.min(.25,(time-lastTime)/1000));lastTime=time;
        loop?.set?.(model.loopVolume||0,model.loopPitch||.5);
        this.host.dataset.phase=model.phase;
        const ctx=this.canvas.getContext('2d'),scale=Math.min(devicePixelRatio||1,2);
        if(this.canvas.width!==360*scale){this.canvas.width=360*scale;this.canvas.height=360*scale}
        ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,360,360);
        const glow=ctx.createRadialGradient(180,180,10,180,180,140+model.bloom*40);
        glow.addColorStop(0,`rgba(255,247,218,${Math.min(.85,.08*model.glow+model.bloom*.65)})`);glow.addColorStop(1,'rgba(239,222,184,0)');
        ctx.fillStyle=glow;ctx.fillRect(0,0,360,360);
        const flat=window.KarmaAnimation.sCurve(model.flat,.09),R=250+750*flat;
        for(let i=0;i<10;i++){
          const offset=(i-model.scroll)*100,angle=offset/R;
          if(Math.abs(angle)>Math.PI/2)continue;
          const y=180-(R*Math.sin(angle)*(1-flat)+offset*flat);
          if(y<-60||y>420)continue;
          const height=100*(Math.cos(angle)*(1-flat)+flat),distance=Math.min(1,Math.abs(i-model.scroll)/.75);
          ctx.globalAlpha=(1-distance*.65)*model.energy[i]*Math.max(0,1-Math.abs(y-180)/240);
          if(icons[i].naturalWidth)ctx.drawImage(icons[i],130,y-height/2,100,height);
          ctx.globalAlpha*=.5;
          if(ring.naturalWidth)ctx.drawImage(ring,130,y-height/2,100,height);
          ctx.strokeStyle='#9b9989';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(180,y+height/2+4);ctx.lineTo(180,y+100-height/2-4);ctx.stroke();
        }
        ctx.globalAlpha=.55+Math.min(1,model.glow)*.45;ctx.strokeStyle=model.selector?'#fff':'#ded4b9';ctx.lineWidth=model.thickness;
        ctx.beginPath();ctx.arc(180,180,model.radius,0,Math.PI*2);ctx.stroke();
        if(model.flowerAlpha>0){
          ctx.globalAlpha=model.flowerAlpha;const size=126+model.clamp*30;
          if(flower.naturalWidth)ctx.drawImage(flower,180-size/2,180-size/2,size,size);
          if(model.clamp>0)for(let i=0;i<4;i++){
            const angle=(-45+i*90)*Math.PI/180;
            ctx.beginPath();ctx.moveTo(180+Math.cos(angle)*size/2,180+Math.sin(angle)*size/2);
            ctx.lineTo(180+Math.cos(angle)*30,180+(model.initial-model.scroll)*100+Math.sin(angle)*30);ctx.stroke();
          }
        }
        for(const wave of model.waves){const life=wave.life/wave.maxLife;ctx.globalAlpha=Math.sqrt(life)*.45;ctx.lineWidth=Math.max(.5,life*wave.thickness);ctx.beginPath();ctx.arc(180,180,wave.radius,0,Math.PI*2);ctx.stroke()}
        ctx.globalAlpha=1;
        if(model.active&&!reduced)this.frame=requestAnimationFrame(draw);else loop?.();
      };
      this.frame=requestAnimationFrame(draw);
    }
  }
  window.KarmaView=KarmaView;
})();

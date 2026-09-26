(() => {
  'use strict';
  const base=new URL('./',document.currentScript.src);
  const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
  const audioUrl=name=>new URL('Karma/audio/'+name+'.wav',base).href;
  const warm=[];
  window.playSecretDashboardSound=(name,volume=1,options={})=>{
    const audio=new Audio(audioUrl(name));
    audio.preload='auto';audio.loop=!!options.loop;audio.volume=clamp(volume);
    audio.playbackRate=Math.max(.25,Math.min(4,Number(options.pitch)||1));
    let stopped=false;
    const stop=()=>{if(stopped)return;stopped=true;audio.pause();try{audio.currentTime=0}catch{}};
    stop.set=(v,p)=>{if(Number.isFinite(Number(v)))audio.volume=clamp(v);if(Number.isFinite(Number(p)))audio.playbackRate=Math.max(.25,Math.min(4,Number(p)))};
    audio.play().catch(()=>{});return stop;
  };
  window.preloadKarmaSounds=()=>{
    if(!warm.length)for(const name of ['UIWood5','UIWoodHit','capBell2','karmaFuzz','karmaFuzz2','karmaRiseA','karmaWheelC_1','karmaWheelC_2','karmaWheelC_3','karmaWheelC_4','karmaWheelLow']){
      const audio=new Audio(audioUrl(name));audio.preload='auto';try{audio.load()}catch{}warm.push(audio);
    }
    return Promise.resolve();
  };
  const core=document.createElement('script');core.src=new URL('app-core.js?v=13',base).href;core.async=false;document.head.appendChild(core);
})();

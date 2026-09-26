(() => {
  'use strict';
  const base=new URL('./',document.currentScript.src),karmaBase=new URL('Karma/',base);
  let corePromise,karmaPromise,coreOpen,view,timer;
  function script(url,key){
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.async=false;s.dataset[key]='1';s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+url));document.body.appendChild(s)});
  }
  function core(){
    if(!corePromise)corePromise=script(new URL('secret-dashboard-core.js?v=1',base).href,'secretCore').then(()=>{
      coreOpen=window.openSecretAcademicDashboard;
      if(typeof coreOpen!=='function'||coreOpen===open)throw new Error('Secret dashboard core did not initialize');
      window.openSecretAcademicDashboard=open;
    });
    return corePromise;
  }
  function karma(){
    if(!karmaPromise){
      if(!document.querySelector('link[data-karma-style]')){const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('karma.css?v=1',karmaBase).href;l.dataset.karmaStyle='1';document.head.appendChild(l)}
      karmaPromise=script(new URL('karma-engine.js?v=1',karmaBase).href,'karmaEngine')
        .then(()=>script(new URL('karma-animation.js?v=1',karmaBase).href,'karmaAnimation'))
        .then(()=>script(new URL('karma-view.js?v=1',karmaBase).href,'karmaView'));
    }
    return karmaPromise;
  }
  function host(){
    let node=document.getElementById('secretAcademicKarma');if(node)return node;
    const summary=document.getElementById('secretAcademicSummary'),card=summary?.closest('.secret-academic-card'),grid=summary?.closest('.secret-academic-grid');
    if(!grid||!card||typeof window.KarmaView!=='function')return null;
    node=document.createElement('section');node.id='secretAcademicKarma';node.className='secret-academic-card wide karma-card';grid.insertBefore(node,card);view=new window.KarmaView(node);
    const refresh=document.getElementById('secretAcademicRefresh');if(refresh&&!refresh.dataset.karmaBound){refresh.dataset.karmaBound='1';refresh.addEventListener('click',()=>void refreshKarma(false))}
    return node;
  }
  async function refreshKarma(fresh=false){
    await karma();const node=host();if(!node)return;if(!view)view=new window.KarmaView(node);
    try{const r=await fetch('search-index/karma-history.json',{cache:'no-cache'});if(!r.ok)throw new Error('karma-history.json: '+r.status);const history=await r.json(),now=Date.now();view.render(window.KarmaEngine.calculate(history,now),now,fresh)}
    catch(error){console.error('[karma-dashboard]',error);view.error()}
  }
  async function open(){
    try{await Promise.all([core(),karma()]);coreOpen();host();await refreshKarma(false);clearInterval(timer);timer=setInterval(()=>{if(document.getElementById('secretAcademicDashboard')?.classList.contains('is-open'))void refreshKarma(false)},30000)}
    catch(error){console.error('[secret-dashboard-karma-loader]',error)}
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')view?.stop()});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-secret-close]'))view?.stop()},true);
  window.openSecretAcademicDashboard=open;
})();

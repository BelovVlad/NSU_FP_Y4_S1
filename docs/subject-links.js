(() => {
  'use strict';
  if(typeof window.sectionsFor!=='function'||typeof window.renderSubject!=='function'||typeof state==='undefined')return;

  const linkState=new Map();
  const linkCache=new Map();
  const linkPending=new Map();
  const linkOrder=['Лекции','Семинары','Лабораторные','Задачи','Литература','Ссылки','Практика','Теория'];
  const encodePath=path=>String(path).split('/').map(encodeURIComponent).join('/');
  const linkUrl=subject=>'https://raw.githubusercontent.com/BelovVlad/NSU_FP_Y4_S1/main/'+encodePath(subject+'/link.md')+'?t='+Date.now();

  async function fetchSubjectLinks(subject,refresh=false){
    if(!refresh&&linkCache.has(subject))return linkCache.get(subject);
    if(!refresh&&linkPending.has(subject))return linkPending.get(subject);
    const pending=(async()=>{
      const response=await fetch(linkUrl(subject),{cache:'no-store'});
      if(!response.ok){
        if(response.status===404)linkState.set(subject,false);
        throw new Error('HTTP '+response.status);
      }
      const markdown=await response.text();
      linkState.set(subject,true);
      linkCache.set(subject,markdown);
      return markdown;
    })().finally(()=>linkPending.delete(subject));
    linkPending.set(subject,pending);
    return pending;
  }

  async function probeSubjectLinks(subject){
    if(linkState.has(subject))return linkState.get(subject);
    try{await fetchSubjectLinks(subject);return true}
    catch{if(!linkState.has(subject))linkState.set(subject,false);return false}
  }

  const baseSectionsFor=window.sectionsFor;
  window.sectionsFor=function(subject){
    const sections=baseSectionsFor(subject).filter(section=>section!=='Ссылки');
    if(linkState.get(subject)===true&&!sections.includes('Ссылки'))sections.push('Ссылки');
    return sections.sort((a,b)=>(linkOrder.indexOf(a)<0?99:linkOrder.indexOf(a))-(linkOrder.indexOf(b)<0?99:linkOrder.indexOf(b))||a.localeCompare(b,'ru'));
  };

  window.loadSubjectLinks=async function(refresh=false){
    const target=document.getElementById('subjectLinksContent');
    if(!target)return;
    const subject=state.subject;
    try{
      const markdown=await fetchSubjectLinks(subject,refresh);
      if(target.isConnected&&state.subject===subject)target.innerHTML=renderLinksMarkdown(markdown);
    }catch(error){
      console.error('[links]',error);
      if(target.isConnected&&state.subject===subject){
        target.innerHTML='<div class="links-error">Не удалось прочитать '+subject+'/link.md. <button type="button" id="retrySubjectLinks" class="feedback-retry">Повторить</button></div>';
        const retry=document.getElementById('retrySubjectLinks');
        if(retry)retry.onclick=()=>{target.innerHTML='<div class="links-loading">Загружаю ссылки…</div>';void window.loadSubjectLinks(true)};
      }
    }
  };

  const baseRenderSubject=window.renderSubject;
  window.renderSubject=function(){
    if(state.subject!=='База'&&!linkState.has(state.subject)){
      const subject=state.subject;
      void probeSubjectLinks(subject).then(found=>{
        if(found&&state.view==='subjects'&&state.subject===subject)window.renderSubject();
      });
    }
    if(state.section==='Ссылки'){
      if(linkState.get(state.subject)===true){renderSubjectLinks();return}
      state.section='';
    }
    return baseRenderSubject();
  };

  if(state.view==='subjects'&&state.subject!=='База'){
    const subject=state.subject;
    void probeSubjectLinks(subject).then(found=>{
      if(found&&state.view==='subjects'&&state.subject===subject)window.renderSubject();
    });
  }
})();

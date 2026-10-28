/* Main site: catalogue, navigation, search, previews, secret dashboard loader.
   Classic script on purpose: app.js and the tests use its top-level bindings. */
const OWNER='BelovVlad',REPO='NSU_FP_Y4_S1',BRANCH='main';
const ORDER=['ОВФ','СВЧ','ТДиСФ','ФКСВ','ФЭЧ','ФиХАиМ','КМ','База'];
const META={
  'ОВФ':{name:'Основы вычислительной физики',lecturer:'Усов Э. В.'},
  'СВЧ':{name:'СВЧ'},
  'ТДиСФ':{name:'Термодинамика и статистическая физика',lecturer:'Грабовский В. В.',seminarist:'Глинский В. В.'},
  'ФКСВ':{name:'Физика конденсированного состояния вещества',lecturer:'Шварц Б. А.',seminarist:'Махмудиан М. М.'},
  'ФЭЧ':{name:'Физика атомного ядра и элементарных частиц',lecturer:'Шварц Б. А.',seminarist:'Винокурова А. Н.'},
  'ФиХАиМ':{name:'Физика и химия атомов и молекул',lecturer:'Горбунов О. А.',seminarist:'Горбунов О. А.'},
  'КМ':{name:'Квантовая механика · архив курса',lecturer:'Грибанов С. С.',seminarist:'Грибанов С. С.'},
  'База':{name:'База знаний'}
};
const HERO_IMAGE='assets/nsu-eva-hero.webp?v=f3f3df221b';
const MUSIC_BACKGROUNDS={
  na19:'assets/NA%2019.webp',
  na19x:'assets/NA%2019x.webp'
};
const MUSIC_TRACKS=[
  {id:'na19',label:'NA 19',src:'assets/music/NA%2019%20-%20Halcyon%20Memories.mp3',theme:'music-na19'},
  {id:'na19x',label:'NA 19x',src:'assets/music/NA%2019x%20-%20Halcyon%20Memories.mp3',theme:'music-na19x'}
];

const UI_ICONS={
  home:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
  subjects:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="14" width="6.5" height="6.5" rx="1.5"/></svg>',
  search:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 5 5"/></svg>',
  literature:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3.1-.8 5.8-.25 8 1.5v12c-2.2-1.75-4.9-2.3-8-1.5z"/><path d="M20 5.5c-3.1-.8-5.8-.25-8 1.5v12c2.2-1.75 4.9-2.3 8-1.5z"/></svg>',
  additional_literature:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3.1-.8 5.8-.25 8 1.5v12c-2.2-1.75-4.9-2.3-8-1.5z"/><path d="M20 5.5c-3.1-.8-5.8-.25-8 1.5v12c2.2-1.75 4.9-2.3 8-1.5z"/><circle cx="18.2" cy="17.8" r="3.2"/><path d="M18.2 16.3v3M16.7 17.8h3"/></svg>',
  tasks:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5h6"/><path d="M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5V6H8V4.5A1.5 1.5 0 0 1 9.5 3Z"/><rect x="5" y="5.5" width="14" height="15.5" rx="2"/><path d="m8.3 11.8 1.7 1.7 3.2-3.5"/><path d="M14.5 12h2.2"/><path d="m8.3 16.8 1.7 1.7 3.2-3.5"/><path d="M14.5 17h2.2"/></svg>',
  archive:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v12H4z"/><path d="M3 4h18v3.5H3z"/><path d="M9 11h6"/></svg>',
  menu:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  notes:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 16h6"/></svg>',
  external:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5"/><path d="m11 13 8-8"/><path d="M18 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H11"/></svg>',
  expand:'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3.5h-5v5M15.5 3.5h5v5M8.5 20.5h-5v-5M20.5 15.5v5h-5"/><path d="m9 9-5.5-5.5M15 9l5.5-5.5M9 15l-5.5 5.5M15 15l5.5 5.5"/></svg>'
};
function iconSvg(name){return UI_ICONS[name]||''}
function hydrateIcons(){document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=iconSvg(el.dataset.icon)})}
let FILES=[];

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
hydrateIcons();
const initialSubject=hashSubject();
const state={view:(ORDER.includes(initialSubject)?'subjects':'home'),subject:(ORDER.includes(initialSubject)?initialSubject:'ФиХАиМ'),section:'',selected:null,selectedEntry:null,meta:new Map(),structure:{groups:[]},searchBusy:false,sort:'date',literatureTab:'main'};
const main=$('#main'),subjectNav=$('#subjectNav'),searchInput=$('#globalSearch'),sidebar=$('#sidebar'),overlay=$('#overlay'),musicToggle=$('#musicToggle'),musicAudio=$('#siteMusic'),pdfFullscreen=$('#pdfFullscreen'),pdfFullscreenFrame=$('#pdfFullscreenFrame'),pdfFullscreenLoader=$('#pdfFullscreenLoader'),pdfFullscreenLoaderText=$('#pdfFullscreenLoaderText');
let searchStems=[],searchRun=0,searchTimer=0,searchWorker=null,searchGroupsAll=[],searchGroups=[],searchFilterSubject='all',searchFilterSection='all',searchSelectedGroup=0,searchSelectedHit=0,searchQuery='',searchMobilePreview=false;
function hashSubject(){if(!location.hash.startsWith('#subject='))return'';try{return decodeURIComponent(location.hash.slice(9).split('&')[0])}catch{return''}}
function syncSubjectHash(){if(state.view!=='subjects'||!ORDER.includes(state.subject))return;const h='#subject='+encodeURIComponent(state.subject);if(location.hash!==h)history.replaceState(null,'',h)}
// #search=<query> opens the search view; other sites (the PweB hub) link here with it.
function takeHashSearch(){
  if(!location.hash.startsWith('#search='))return false;
  let q='';try{q=decodeURIComponent(location.hash.slice(8)).trim()}catch{}
  history.replaceState(null,'',location.pathname+location.search);
  if(!q)return false;
  searchInput.value=q;runSearch(q);return true;
}
function clearSubjectHash(){if(location.hash.startsWith('#subject='))history.replaceState(null,'',location.pathname+location.search)}
function isNewDate(v){if(!v)return false;const d=new Date(v);return Number.isFinite(d.getTime())&&Date.now()-d.getTime()<3*86400000&&Date.now()>=d.getTime()}


function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function encPath(p){return p.split('/').map(encodeURIComponent).join('/')}
function isPhoneLayout(){return matchMedia('(max-width:720px), (pointer:coarse)').matches}
// Desktop shows the music button in the top bar; the phone drawer keeps it in the sidebar.
// Only the row moves: the <audio> element stays in place so playback is never interrupted.
const musicControl=$('.music-control'),musicRow=$('.music-row'),topMusicSlot=$('#topMusicSlot');
function placeMusicControl(){
  const phone=isPhoneLayout();
  if(phone)musicControl.prepend(musicRow);else topMusicSlot.append(musicRow);
  musicControl.classList.toggle('is-moved',!phone);
}
placeMusicControl();
matchMedia('(max-width:720px), (pointer:coarse)').addEventListener('change',placeMusicControl);
function subjectOf(f){const p=f.path.split('/');return p[0]==='База'&&p[1]==='КМ'?'КМ':p[0]}
function rawSection(f){
  const parts=f.path.split('/');
  if(parts[0]==='База'&&parts[1]==='КМ')return 'Лекции';
  const p=parts[1]||'Материалы';
  return p.replace(/^\d+[_ .-]*/,'').replace(/_/g,' ');
}
function sectionOf(f){
  const s=rawSection(f).toLowerCase();
  if(s.includes('лекц'))return 'Лекции';
  if(s.includes('семинар'))return 'Семинары';
  if(s.includes('лаборатор'))return 'Лабораторные';
  if(s.includes('месяч')||s.includes('задач'))return 'Задачи';
  if(s.includes('литерат'))return 'Литература';
  if(s.includes('практик'))return 'Практика';
  if(s.includes('теори'))return 'Теория';
  return rawSection(f);
}
function niceName(f){
  const stem=(f.name||f.path.split('/').pop()).replace(/\.(pdf|ipynb)$/i,'').replace(/_/g,' ');
  if(subjectOf(f)==='КМ'&&stem==='Квантовая механика полный курс')return 'Полный курс';
  if(stem.toLowerCase()==='final'){
    const s=sectionOf(f);
    if(s==='Лекции')return 'Конспект лекций';
    if(s==='Семинары')return 'Семинары';
    if(s==='Задачи')return 'Месячные задания';
  }
  return stem;
}
function fileMeta(f){return state.meta.get(f.path)||{}}
function fmtSize(n){
  n=Number(n)||0;if(!n)return '—';
  if(n<1024)return n+' Б';if(n<1048576)return (n/1024).toFixed(0)+' КБ';return (n/1048576).toFixed(n>10485760?0:1)+' МБ';
}
function fmtDate(s){
  if(!s)return '—';const d=new Date(s);if(Number.isNaN(d.getTime()))return '—';
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function updatedValue(f){const m=fileMeta(f);return m.updated_at||m.created_at||''}
function fileDesc(f){
  const bits=[sectionOf(f)];
  const p=f.path.split('/').slice(2,-1).map(x=>x.replace(/_/g,' ')).filter(Boolean);
  if(p.length)bits.push(p[p.length-1]);
  return bits.join(' · ');
}
function filesFor(subject,section){
  return FILES.filter(f=>subjectOf(f)===subject && (!section||sectionOf(f)===section));
}
function sectionsFor(subject){
  const set=[];filesFor(subject).forEach(f=>{const s=sectionOf(f);if(!set.includes(s))set.push(s)});
  if(subject==='ТДиСФ'&&!set.includes('Ссылки'))set.push('Ссылки');
  const pref=['Лекции','Семинары','Лабораторные','Задачи','Литература','Ссылки','Практика','Теория'];
  return set.sort((a,b)=>(pref.indexOf(a)<0?99:pref.indexOf(a))-(pref.indexOf(b)<0?99:pref.indexOf(b))||a.localeCompare(b,'ru'));
}
function structuredGroup(subject,section){
  return (state.structure.groups||[]).find(g=>g.subject===subject&&g.section===section)||null;
}
function fileByPath(path){return FILES.find(f=>f.path===path)||null}
function sortedEntries(items){
  const out=(items||[]).slice();
  if(state.sort==='name')out.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'ru'));
  else out.sort((a,b)=>(a.number||0)-(b.number||0));
  return out;
}
function githubUrl(f){return 'https://github.com/'+OWNER+'/'+REPO+'/blob/'+BRANCH+'/'+encPath(f.path)}
function notebookUrl(f,cell=0,titleOverride='',embed=false){
  if(f.path==='База/Частицы.ipynb')return 'particles/';
  let url='notebook/viewer.html?build=13&file='+encodeURIComponent(f.path)+'&subject='+encodeURIComponent(subjectOf(f))+'&title='+encodeURIComponent(titleOverride||niceName(f));
  if(cell)url+='&cell='+encodeURIComponent(cell);
  if(fileMeta(f).version)url+='&v='+encodeURIComponent(fileMeta(f).version);
  const theme=currentPdfTheme();if(theme)url+='&theme='+encodeURIComponent(theme);
  if(embed)url+='&embed=1';
  return url;
}
function viewerUrl(f,page=0,titleOverride=''){
  let url='pdfjs/viewer.html?file='+encodeURIComponent(f.path)+'&subject='+encodeURIComponent(subjectOf(f))+'&title='+encodeURIComponent(titleOverride||niceName(f));
  if(page)url+='&page='+encodeURIComponent(page);
  if(fileMeta(f).version)url+='&v='+encodeURIComponent(fileMeta(f).version);
  if(fileMeta(f).reason==='lfs')url+='&lfs=1';
  const theme=currentPdfTheme();if(theme)url+='&theme='+encodeURIComponent(theme);
  return url;
}
function keywords(f){
  const source=(niceName(f)+' '+fileDesc(f)).replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(x=>x.length>4);
  return [...new Set(source)].slice(0,4);
}

const OPEN_HISTORY_KEY='nsu-open-history-v1';
function readOpenHistory(){
  try{
    const value=JSON.parse(localStorage.getItem(OPEN_HISTORY_KEY)||'[]');
    return Array.isArray(value)?value.filter(item=>item&&typeof item.path==='string'):[];
  }catch{return[]}
}
function recordOpenedPath(path){
  path=String(path||'').trim();
  if(!path)return;
  const next=[{path,openedAt:Date.now()},...readOpenHistory().filter(item=>item.path!==path)].slice(0,8);
  try{localStorage.setItem(OPEN_HISTORY_KEY,JSON.stringify(next))}catch{}
}
function removeOpenedPath(path){
  path=String(path||'').trim();
  if(!path)return;
  const next=readOpenHistory().filter(item=>item.path!==path);
  try{localStorage.setItem(OPEN_HISTORY_KEY,JSON.stringify(next))}catch{}
}
function recordOpenedFile(file){if(file?.path)recordOpenedPath(file.path)}
function recordOpenedUrl(url){
  try{
    const parsed=new URL(url,location.href);
    const path=parsed.searchParams.get('file');
    if(path)recordOpenedPath(path);
  }catch{}
}
function rememberedPdfPage(file){
  if(!file||file.ext!=='.pdf')return 0;
  try{
    const page=Number(localStorage.getItem('nsu-pdf-page:'+file.path));
    return Number.isInteger(page)&&page>0?page:0;
  }catch{return 0}
}
function openedHistoryFiles(limit=8){
  return readOpenHistory().map(item=>({item,file:fileByPath(item.path)})).filter(row=>row.file).slice(0,limit);
}
function applyPdfPosition(position){
  const path=String(position?.file||'').trim();
  const canonical=String(position?.canonicalFile||'').trim();
  const page=Number(position?.page);
  const savedAt=Number(position?.savedAt)||Date.now();
  if(!path||!Number.isInteger(page)||page<1)return;
  const paths=[...new Set([path,canonical].filter(Boolean))];
  try{
    const latest=Math.max(0,...paths.map(p=>Number(localStorage.getItem('nsu-pdf-page-ts:'+p))||0));
    if(latest>savedAt)return;
    for(const p of paths){
      localStorage.setItem('nsu-pdf-page:'+p,String(page));
      localStorage.setItem('nsu-pdf-page-ts:'+p,String(savedAt));
    }
  }catch{}
  document.querySelectorAll('.history-row').forEach(row=>{
    if(!paths.includes(row.dataset.historyPath))return;
    const label=row.querySelector('.recent-date');
    if(label)label.textContent='стр. '+page;
  });
}
function persistOpenPdfPosition(){
  try{
    const position=pdfFullscreenFrame.contentWindow?.nsuPersistReaderPosition?.();
    if(position)applyPdfPosition(position);
    return position||null;
  }catch{return null}
}


let activeMusicTrack=null;
let musicAudioContext=null,musicSourceNode=null,musicAnalyser=null,musicAnalyserData=null,musicGlitchFrame=0;
let musicGlitchLastEnergy=0,musicGlitchLastHit=0;

function chooseMusicTrack(forceId=''){
  if(forceId)activeMusicTrack=MUSIC_TRACKS.find(t=>t.id===forceId)||MUSIC_TRACKS[0];
  else activeMusicTrack=Math.random()<0.10?MUSIC_TRACKS[1]:MUSIC_TRACKS[0];
  musicAudio.src=activeMusicTrack.src;
  musicAudio.volume=1;
  return activeMusicTrack;
}
function currentPdfTheme(){
  if(document.body.classList.contains('music-na19x'))return'na19x';
  if(document.body.classList.contains('music-na19'))return'na19';
  return'';
}
function broadcastPdfTheme(){
  const theme=currentPdfTheme();
  document.querySelectorAll('iframe.preview-frame,iframe.search-preview-frame,iframe.pdf-fullscreen-frame').forEach(frame=>{
    try{frame.contentWindow?.postMessage({type:'nsu-pdf-theme',theme},location.origin)}catch{}
  });
}
function setMusicTheme(on){
  document.body.classList.remove('music-active','music-na19','music-na19x');
  if(on&&activeMusicTrack)document.body.classList.add('music-active',activeMusicTrack.theme);
  requestAnimationFrame(broadcastPdfTheme);
}
function syncMusicUi(playing){
  musicToggle.classList.toggle('playing',playing);
  musicToggle.setAttribute('aria-pressed',playing?'true':'false');
  const action=playing?'Приостановить музыку':'Включить музыку';
  musicToggle.setAttribute('aria-label',action);
  musicToggle.title=action;
  setMusicTheme(playing);
  if(playing&&activeMusicTrack?.id==='na19x')startMusicGlitch();
  else stopMusicGlitch();
}
async function ensureMusicAnalyser(){
  if(musicAnalyser)return true;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return false;
  try{
    musicAudioContext=new AudioCtx();
    musicSourceNode=musicAudioContext.createMediaElementSource(musicAudio);
    musicAnalyser=musicAudioContext.createAnalyser();
    musicAnalyser.fftSize=1024;
    musicAnalyser.smoothingTimeConstant=.68;
    musicAnalyserData=new Uint8Array(musicAnalyser.frequencyBinCount);
    musicSourceNode.connect(musicAnalyser);
    musicAnalyser.connect(musicAudioContext.destination);
    return true;
  }catch(e){
    console.warn('Audio analyser unavailable',e);
    musicAnalyser=null;
    return false;
  }
}
let musicGlitchHitTimer=0,musicGlitchFallbackAt=0;
function clearMusicGlitchClasses(){
  clearTimeout(musicGlitchHitTimer);
  document.body.classList.remove('music-glitch-hit','music-glitch-hard');
  for(const name of ['--glitch-x','--glitch-shift','--glitch-y'])document.body.style.removeProperty(name);
}
function stopMusicGlitch(){
  if(musicGlitchFrame){
    cancelAnimationFrame(musicGlitchFrame);
    clearTimeout(musicGlitchFrame);
  }
  musicGlitchFrame=0;
  musicGlitchLastEnergy=0;
  musicGlitchLastHit=0;
  musicGlitchFallbackAt=0;
  clearMusicGlitchClasses();
}
function triggerMusicGlitch(force=.72){
  if(activeMusicTrack?.id!=='na19x'||musicAudio.paused)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const now=performance.now();
  if(now-musicGlitchLastHit<1800)return;
  musicGlitchLastHit=now;
  force=Math.max(.45,Math.min(1,force));

  const sign=()=>Math.random()>.5?1:-1;
  document.body.style.setProperty('--glitch-x',sign()*(2+Math.round(force*5))+'px');
  document.body.style.setProperty('--glitch-shift',sign()*(1+Math.round(force))+'px');
  document.body.style.setProperty('--glitch-y',(8+Math.round(Math.random()*82))+'%');
  document.body.classList.add('music-glitch-hit');
  document.body.classList.toggle('music-glitch-hard',force>.58);

  clearTimeout(musicGlitchHitTimer);
  musicGlitchHitTimer=setTimeout(()=>{
    document.body.classList.remove('music-glitch-hit','music-glitch-hard');
  },Math.round(60+force*40));
}
async function startMusicGlitch(){
  stopMusicGlitch();
  if(activeMusicTrack?.id!=='na19x'||musicAudio.paused)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  musicGlitchLastHit=performance.now();

  const ok=await ensureMusicAnalyser();
  if(musicAudio.paused||activeMusicTrack?.id!=='na19x')return;
  if(!ok){
    const fallback=()=>{
      if(musicAudio.paused||activeMusicTrack?.id!=='na19x')return;
      triggerMusicGlitch(.52+Math.random()*.26);
      musicGlitchFrame=setTimeout(fallback,2500+Math.random()*1500);
    };
    musicGlitchFrame=setTimeout(fallback,2500);
    return;
  }
  if(musicAudioContext?.state==='suspended'){
    try{await musicAudioContext.resume()}catch{}
  }

  const timeData=new Uint8Array(musicAnalyser.fftSize);
  musicGlitchFallbackAt=performance.now()+2500;

  const tick=(now)=>{
    if(musicAudio.paused||activeMusicTrack?.id!=='na19x'){stopMusicGlitch();return}

    musicAnalyser.getByteFrequencyData(musicAnalyserData);
    musicAnalyser.getByteTimeDomainData(timeData);

    let spectral=0,high=0,highCount=0;
    for(let i=2;i<musicAnalyserData.length;i++){
      const v=musicAnalyserData[i]/255;
      spectral+=v;
      if(i>28){high+=v;highCount++}
    }
    const avg=spectral/Math.max(1,musicAnalyserData.length-2);
    const hiss=high/Math.max(1,highCount);

    let sq=0;
    for(let i=0;i<timeData.length;i++){
      const v=(timeData[i]-128)/128;
      sq+=v*v;
    }
    const rms=Math.sqrt(sq/timeData.length);
    const energy=Math.min(1,rms*4.15+avg*1.02+hiss*.58);
    const delta=Math.max(0,energy-musicGlitchLastEnergy);
    musicGlitchLastEnergy=musicGlitchLastEnergy*.74+energy*.26;
    const level=Math.min(1,energy*.9+delta*4.7);

    if((delta>.008||(rms>.05&&level>.24))&&now-musicGlitchLastHit>=1800){
      triggerMusicGlitch(Math.min(.86,.46+level*.42+delta*2.1));
      musicGlitchFallbackAt=now+2500+Math.random()*1500;
    }

    if(now>musicGlitchFallbackAt){
      triggerMusicGlitch(.48+Math.min(.22,level*.28)+Math.random()*.10);
      musicGlitchFallbackAt=now+2500+Math.random()*1500;
    }
    musicGlitchFrame=requestAnimationFrame(tick);
  };
  musicGlitchFrame=requestAnimationFrame(tick);
}
async function toggleMusic(){
  if(!activeMusicTrack)chooseMusicTrack();
  if(!musicAudio.paused){musicAudio.pause();return}
  try{
    await ensureMusicAnalyser();
    if(musicAudioContext?.state==='suspended')await musicAudioContext.resume();
    musicAudio.volume=1;
    await musicAudio.play();
  }catch(e){
    console.error('Music playback failed',e);
    syncMusicUi(false);
  }
}
musicToggle.addEventListener('click',()=>{void toggleMusic()});
musicAudio.volume=1;
musicAudio.addEventListener('play',()=>syncMusicUi(true));
musicAudio.addEventListener('pause',()=>syncMusicUi(false));
musicAudio.addEventListener('error',()=>syncMusicUi(false));

let pdfHistoryArmed=false;

function hidePdfOverlay(){
  persistOpenPdfPosition();
  pdfFullscreen.classList.remove('open','ready');
  pdfFullscreen.setAttribute('aria-hidden','true');
  document.body.classList.remove('pdf-open');
}

async function openPdfFullscreen(url,title='PDF'){
  if(!url)return;
  if(pdfFullscreen.classList.contains('open')){
    try{if(pdfFullscreenFrame.contentWindow?.nsuFlushAnnotations&&!await pdfFullscreenFrame.contentWindow.nsuFlushAnnotations())return;}catch{}
    persistOpenPdfPosition();
  }
  recordOpenedUrl(url);
  const themed=new URL(url,location.href);
  const theme=currentPdfTheme();
  if(theme)themed.searchParams.set('theme',theme);else themed.searchParams.delete('theme');
  const isNotebook=themed.pathname.includes('/notebook/viewer.html');
  if(isNotebook){themed.searchParams.delete('embed');themed.searchParams.set('full','1')}

  // This is deliberately an in-app fixed overlay, not the browser Fullscreen API.
  // Android Back can therefore close the document instead of first exiting immersive mode.
  if(!pdfFullscreen.classList.contains('open')){
    const current=history.state&&typeof history.state==='object'?history.state:{};
    history.pushState({...current,nsuPdfOverlay:true},'',location.href);
    pdfHistoryArmed=true;
  }

  pdfFullscreen.classList.remove('ready');
  pdfFullscreen.classList.add('open');
  pdfFullscreen.setAttribute('aria-hidden','false');
  document.body.classList.add('pdf-open');
  if(pdfFullscreenLoaderText)pdfFullscreenLoaderText.textContent=isNotebook?'Открываю Notebook…':'Открываю PDF…';

  requestAnimationFrame(()=>{
    try{
      // Replace the iframe document instead of navigating it. Otherwise
      // Android WebView adds every opened PDF to the joint Back history.
      pdfFullscreenFrame.contentWindow.location.replace(themed.href);
    }catch{
      pdfFullscreenFrame.src=themed.href;
    }
  });
}

async function closePdfFullscreen(fromHistory=false){
  if(!pdfFullscreen.classList.contains('open'))return;
  try{if(pdfFullscreenFrame.contentWindow?.nsuFlushAnnotations&&!await pdfFullscreenFrame.contentWindow.nsuFlushAnnotations())return;}catch{}
  const popOverlayState=!fromHistory&&pdfHistoryArmed&&history.state?.nsuPdfOverlay;
  // Hide first. Even if Android is still draining an old iframe history entry,
  // the user must never see the previous PDF.
  pdfHistoryArmed=false;
  hidePdfOverlay();
  if(popOverlayState)history.back();
}

window.addEventListener('popstate',()=>{
  if(!pdfFullscreen.classList.contains('open'))return;
  pdfHistoryArmed=false;
  void closePdfFullscreen(true);
});

window.nsuHandleAndroidBack=()=>{
  if(!pdfFullscreen.classList.contains('open'))return false;
  void closePdfFullscreen();
  return true;
};
document.addEventListener('click',e=>{
  const a=e.target.closest('a.preview-open-full,a.search-open,a.action.primary,a[href*="pdfjs/viewer.html"],a[href*="notebook/viewer.html"]');
  if(!a)return;
  const href=a.getAttribute('href')||'';
  recordOpenedUrl(href);
  if(a.classList.contains('knowledge-card')||a.closest('.app-downloads'))return;
  if(!href.includes('pdfjs/viewer.html')&&!href.includes('notebook/viewer.html'))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  void openPdfFullscreen(href);
},true);
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  if(e.data?.type==='nsu-pdf-position'){
    applyPdfPosition(e.data);
    return;
  }
  if(e.data?.type==='nsu-close-pdf'){
    applyPdfPosition(e.data);
    void closePdfFullscreen();
    return;
  }
  if(e.data?.type==='nsu-open-pdf-fullscreen'&&e.data.url){
    void openPdfFullscreen(e.data.url);
    return;
  }
  if(e.data?.type==='nsu-pdf-ready'&&e.source===pdfFullscreenFrame.contentWindow){
    pdfFullscreen.classList.add('ready');
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&pdfFullscreen.classList.contains('open'))persistOpenPdfPosition();
});
window.addEventListener('pagehide',()=>{if(pdfFullscreen.classList.contains('open'))persistOpenPdfPosition()});
window.addEventListener('beforeunload',()=>{if(pdfFullscreen.classList.contains('open'))persistOpenPdfPosition()});

function setActiveNav(view){
  if(view!=='search'){
    clearTimeout(searchTimer);state.searchBusy=false;
    searchWorker?.postMessage({type:'cancel',id:++searchRun});
  }
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
function closeMenu(){sidebar.classList.remove('open');overlay.classList.remove('show');document.body.classList.remove('menu-open')}
function openMenu(){sidebar.classList.add('open');overlay.classList.add('show');document.body.classList.add('menu-open')}

function renderSubjectNav(){
  subjectNav.innerHTML=ORDER.filter(s=>FILES.some(f=>subjectOf(f)===s)).map(s=>{
    const n=filesFor(s).length;
    return '<button class="subject-btn'+(s===state.subject&&state.view==='subjects'?' active':'')+'" data-subject="'+esc(s)+'"><span>'+esc(s)+'</span><span class="subject-count">'+n+'</span></button>';
  }).join('');
  $$('.subject-btn').forEach(b=>b.onclick=()=>{
    state.view='subjects';state.subject=b.dataset.subject;state.section='';state.selected=null;state.selectedEntry=null;
    syncSubjectHash();setActiveNav('subjects');renderSubjectNav();render();closeMenu();
  });
}
function hero(subject){
  const meta=META[subject]||{name:subject};
  const people=[];
  if(meta.lecturer)people.push('<span class="person-chip">Лектор <strong>'+esc(meta.lecturer)+'</strong></span>');
  if(meta.seminarist)people.push('<span class="person-chip">Семинарист <strong>'+esc(meta.seminarist)+'</strong></span>');
  return '<section class="hero">'+
    '<div class="breadcrumbs"><span>Главная</span><span class="sep">›</span><span>'+esc(subject)+'</span></div>'+
    '<div class="hero-row"><div class="hero-copy"><h1>'+esc(subject)+'</h1><div class="hero-sub">'+esc(meta.name||subject)+'</div>'+(people.length?'<div class="hero-people">'+people.join('')+'</div>':'')+'</div></div>'+
    '<div class="hero-art" aria-hidden="true"><img class="hero-art-base" src="'+HERO_IMAGE+'" alt=""><img class="hero-art-na19" src="'+MUSIC_BACKGROUNDS.na19+'" alt=""><img class="hero-art-na19x" src="'+MUSIC_BACKGROUNDS.na19x+'" alt=""></div>'+
  '</section>';
}
function tabs(subject){
  const ss=sectionsFor(subject);
  if(!state.section||!ss.includes(state.section))state.section=ss[0]||'';
  return '<div class="tabs">'+ss.map(s=>'<button class="tab'+(s===state.section?' active':'')+'" data-section="'+esc(s)+'">'+esc(s)+'</button>').join('')+'</div>';
}

function sortedFiles(arr){
  const out=arr.slice();
  if(state.sort==='name')out.sort((a,b)=>niceName(a).localeCompare(niceName(b),'ru'));
  else out.sort((a,b)=>(new Date(updatedValue(b)||0))-(new Date(updatedValue(a)||0))||niceName(a).localeCompare(niceName(b),'ru'));
  return out;
}

function fileRows(files){
  if(!files.length)return '<div class="empty">В этом разделе пока нет материалов.</div>';
  return sortedFiles(files).map((f,i)=>{
    const m=fileMeta(f),active=state.selected&&state.selected.path===f.path;
    const detail=[fileDesc(f)];
    if(m.page_count)detail.push(m.page_count+' стр.');
    else if(m.cell_count)detail.push(m.cell_count+' ячеек');
    const badge=isNewDate(m.created_at)?'<span class="new-badge">NEW</span>':'';
    return '<div class="file-row'+(active?' active':'')+'" data-path="'+esc(f.path)+'">'+
      '<div class="file-ico">'+(f.ext==='.pdf'?'▤':'⌘')+'</div>'+
      '<div class="file-main"><div class="file-name-line"><div class="file-name">'+esc(niceName(f))+'</div>'+badge+'</div><div class="file-desc">'+esc(detail.filter(Boolean).join(' · '))+'</div></div>'+
      '<div class="file-side"><div class="file-date">'+esc(fmtDate(m.updated_at||m.created_at))+'</div><div class="file-size">'+esc(fmtSize(m.size))+'</div></div>'+
    '</div>';
  }).join('');
}
function entryRows(group){
  const items=sortedEntries(group?.items||[]);
  if(!items.length)return '<div class="empty">Структура этого раздела пока не найдена.</div>';
  let lastPart='',html='';
  items.forEach(item=>{
    if(item.part&&item.part!==lastPart){
      lastPart=item.part;
      const label=item.part==='QM1'?'Квантовая механика I':'Квантовая механика II';
      html+='<div class="entry-part"><span>'+esc(label)+'</span></div>';
    }
    const active=state.selectedEntry&&state.selectedEntry.id===item.id;
    const range=item.page?(item.end_page&&item.end_page!==item.page?'стр. '+item.page+'–'+item.end_page:'стр. '+item.page):'страница уточняется';
    const number=item.number_label||String(item.number||'').padStart(2,'0');
    html+='<div class="file-row'+(active?' active':'')+'" data-entry="'+esc(item.id)+'">'+
      '<div class="file-ico"><span class="entry-no">'+esc(number)+'</span></div>'+
      '<div class="file-main"><div class="file-name">'+esc(item.title||'Без названия')+'</div><div class="file-desc">'+esc(item.subtitle||group.section)+'</div></div>'+
      '<div class="file-side"><div class="file-date">'+esc(fmtDate(item.date))+'</div><div class="file-size">'+esc(range)+'</div></div>'+
    '</div>';
  });
  return html;
}

function preview(f,entry=null){
  if(!f)return '<aside class="panel preview-panel"><div class="preview-placeholder"><div><div class="big">Выберите материал</div><div class="small">Справа появится предпросмотр.</div></div></div></aside>';
  const m=fileMeta(f),isPdf=f.ext==='.pdf',isNotebook=f.ext==='.ipynb';
  const displayTitle=entry?.title||niceName(f);
  const url=isPdf?viewerUrl(f,entry?.page||0,displayTitle):isNotebook?notebookUrl(f,0,displayTitle,false):githubUrl(f);
  const frameUrl=isPdf?(url+'&embed=1'):isNotebook?notebookUrl(f,0,displayTitle,true):url;
  const frame=(isPdf||isNotebook)
    ?'<iframe class="preview-frame" src="'+esc(frameUrl)+'" loading="lazy" title="'+esc(displayTitle)+'"></iframe>'
    :'<div class="preview-placeholder"><div><div class="big">Файл</div><div class="small">Предпросмотр для этого формата недоступен.</div></div></div>';
  const tags=keywords(f).map(k=>'<span class="tag">'+esc(k)+'</span>').join('')||'<span class="tag">'+esc(sectionOf(f))+'</span>';
  const date=entry?.date||m.updated_at||m.created_at;
  const pageRange=entry?.page?(entry.end_page&&entry.end_page!==entry.page?entry.page+'–'+entry.end_page:String(entry.page)):'—';
  const infoLabel=isNotebook?'Ячейки':'Страницы';
  const infoValue=isNotebook?(m.cell_count||'—'):pageRange;
  const fullLabel=isNotebook?'Открыть Notebook':'Открыть PDF';
  return '<aside class="panel preview-panel">'+
    '<div class="preview-toolbar"><div class="preview-heading"><h2 class="preview-doc-title" title="'+esc(displayTitle)+'">'+esc(displayTitle)+'</h2><div class="preview-kicker">'+esc(entry?((entry.number?'№ '+entry.number+' · ':'')+sectionOf(f)):sectionOf(f))+'<span class="preview-date"> · '+esc(fmtDate(date))+'</span></div></div>'+
      '<div class="preview-toolbar-actions"><button class="preview-more" type="button" aria-label="Дополнительные действия" title="Информация и файл">•••</button>'+
      '<div class="preview-menu" hidden><button type="button" data-preview-tab="view">Документ</button><button type="button" data-preview-tab="info">Информация</button><button type="button" data-preview-tab="file">Файл</button></div>'+
      ((isPdf||isNotebook)?'<a class="preview-open-full" href="'+esc(url)+'" aria-label="'+esc(fullLabel+' на весь экран')+'" title="'+esc(fullLabel+' на весь экран')+'">'+iconSvg('expand')+'</a>':'')+
      '</div></div>'+
    '<div class="preview-pane" data-preview-pane="view"><div class="preview-frame-wrap">'+frame+'</div></div>'+
    '<div class="preview-pane preview-info-only" data-preview-pane="info" hidden><div class="preview-info"><div class="info-box"><div class="info-title">Информация</div>'+
      '<div class="info-row"><span>Файл</span><span>'+esc(f.name||f.path.split('/').pop())+'</span></div>'+
      '<div class="info-row"><span>Размер</span><span>'+esc(fmtSize(m.size))+'</span></div>'+
      '<div class="info-row"><span>'+esc(infoLabel)+'</span><span>'+esc(String(infoValue))+'</span></div>'+
      '<div class="info-row"><span>Обновлено</span><span>'+esc(fmtDate(date))+'</span></div></div>'+
      '<div class="info-box"><div class="info-title">Ключевые темы</div><div class="tags">'+tags+'</div></div></div></div>'+
    '<div class="preview-pane preview-file-pane" data-preview-pane="file" hidden><div class="info-title">Путь в репозитории</div><div class="preview-file-path">'+esc(f.path)+'</div><div class="preview-file-actions"><a class="action primary" href="'+esc(url)+'">Открыть'+(isPdf?' PDF':isNotebook?' Notebook':' файл')+'</a><a class="action" target="_blank" rel="noopener" href="'+esc(githubUrl(f))+'">GitHub ↗</a></div></div>'+
  '</aside>';
}
function bindPreviewTabs(){
  const panel=$('.preview-panel');if(!panel)return;
  const menu=panel.querySelector('.preview-menu'),more=panel.querySelector('.preview-more');
  if(more&&menu)more.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};
  panel.querySelectorAll('[data-preview-tab]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.previewTab;
    panel.querySelectorAll('[data-preview-pane]').forEach(p=>p.hidden=p.dataset.previewPane!==key);
    if(menu)menu.hidden=true;
  });
  panel.onclick=e=>{if(menu&&!e.target.closest('.preview-toolbar-actions'))menu.hidden=true};
}

let previewLayoutFrame=0,previewLayoutObserver=null;
function updatePreviewHeight(){
  previewLayoutFrame=0;
  const panel=main.querySelector('.workspace .preview-panel');
  if(!panel)return;
  if(innerWidth<=900){panel.style.removeProperty('--preview-available-height');return}
  const toolbar=panel.querySelector('.preview-toolbar');
  if(!toolbar)return;
  const viewport=window.visualViewport;
  const bottom=viewport?viewport.offsetTop+viewport.height:innerHeight;
  const style=getComputedStyle(panel);
  const top=Math.max(parseFloat(style.top)||0,panel.getBoundingClientRect().top);
  const borders=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);
  const height=Math.max(120,Math.floor(bottom-top-toolbar.getBoundingClientRect().height-borders-8));
  const value=height+'px';
  if(panel.style.getPropertyValue('--preview-available-height')!==value)panel.style.setProperty('--preview-available-height',value);
}
function schedulePreviewHeight(){if(!previewLayoutFrame)previewLayoutFrame=requestAnimationFrame(updatePreviewHeight)}
function bindPreviewHeight(){
  previewLayoutObserver?.disconnect();
  previewLayoutObserver=new ResizeObserver(schedulePreviewHeight);
  for(const element of main.querySelectorAll('.hero,.preview-toolbar'))previewLayoutObserver.observe(element);
  updatePreviewHeight();
}
window.addEventListener('scroll',schedulePreviewHeight,{passive:true});
// Phones: give the content the header's space while reading down the page.
(()=>{
  const touchLayout=matchMedia('(max-width:900px) and (pointer:coarse)');
  let lastY=scrollY,travel=0,frame=0;
  window.addEventListener('scroll',()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const y=scrollY,delta=y-lastY;lastY=y;
      if(!touchLayout.matches||y<60||document.body.classList.contains('menu-open')||document.activeElement===searchInput){
        travel=0;document.body.classList.remove('topbar-hidden');return;
      }
      if(Math.sign(delta)!==Math.sign(travel))travel=0;
      travel+=delta;
      if(travel>24)document.body.classList.add('topbar-hidden');
      else if(travel<-12)document.body.classList.remove('topbar-hidden');
    });
  },{passive:true});
})();
window.addEventListener('resize',schedulePreviewHeight);
window.visualViewport?.addEventListener('resize',schedulePreviewHeight);

// Update the surrounding UI without removing a live iframe from the DOM.
// Detaching and reinserting an iframe would reload its document as well.
function patchPreview(current,next){
  if(current.nodeType!==next.nodeType||current.nodeName!==next.nodeName){current.replaceWith(next);return}
  if(current.nodeType!==Node.ELEMENT_NODE){if(current.textContent!==next.textContent)current.textContent=next.textContent;return}
  if(current.tagName==='IFRAME'){
    const oldUrl=new URL(current.dataset.viewerUrl||current.src,location.href),newUrl=new URL(next.src,location.href);
    const samePdf=oldUrl.pathname.endsWith('/pdfjs/viewer.html')&&oldUrl.pathname===newUrl.pathname&&['file','v','lfs'].every(key=>oldUrl.searchParams.get(key)===newUrl.searchParams.get(key));
    if(oldUrl.href!==newUrl.href){
      if(samePdf){
        current.dataset.viewerUrl=newUrl.href;
        const navigate=()=>current.contentWindow?.postMessage({type:'nsu-viewer-navigate',url:current.dataset.viewerUrl},location.origin);
        current.onload=navigate;navigate();
      }else{current.onload=null;delete current.dataset.viewerUrl;current.src=newUrl.href}
    }
    current.title=next.title;return;
  }
  for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
  for(const attr of next.attributes)if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
  const oldChildren=[...current.childNodes],newChildren=[...next.childNodes];
  for(let i=0;i<Math.max(oldChildren.length,newChildren.length);i++){
    if(!newChildren[i])oldChildren[i].remove();
    else if(!oldChildren[i])current.appendChild(newChildren[i]);
    else patchPreview(oldChildren[i],newChildren[i]);
  }
}
function patchPreviewHtml(current,html){
  const template=document.createElement('template');template.innerHTML=html;
  patchPreview(current,template.content.firstElementChild);
}
function bindWorkspaceResizer(){
  const workspace=$('.workspace'),handle=$('.workspace-resizer');
  if(!workspace||!handle||innerWidth<=900)return;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const applySaved=()=>{
    let saved=340;try{saved=Number(localStorage.getItem('nsu-subject-list-width'))||340}catch{}
    const max=Math.max(280,Math.min(520,workspace.clientWidth-520));
    workspace.style.setProperty('--subject-list-width',clamp(saved,280,max)+'px');
  };
  applySaved();
  handle.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();
    handle.classList.add('dragging');handle.setPointerCapture?.(e.pointerId);
    const startX=e.clientX,startW=parseFloat(getComputedStyle(workspace).getPropertyValue('--subject-list-width'))||340;
    const move=ev=>{
      const max=Math.max(280,Math.min(520,workspace.clientWidth-520));
      workspace.style.setProperty('--subject-list-width',clamp(startW+ev.clientX-startX,280,max)+'px');
    };
    const up=()=>{
      handle.classList.remove('dragging');
      handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);
      try{localStorage.setItem('nsu-subject-list-width',String(Math.round(parseFloat(getComputedStyle(workspace).getPropertyValue('--subject-list-width'))||340)))}catch{}
    };
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
  };
  handle.ondblclick=()=>{workspace.style.setProperty('--subject-list-width','340px');try{localStorage.setItem('nsu-subject-list-width','340')}catch{}};
}
const KNOWLEDGE_TOPICS={
  'Физические константы':['atom','Значения и символы постоянных: от скорости света до атомных и тепловых масштабов.',[['fundamental','Основные'],['vacuum','Вакуум'],['particles','Частицы и атом'],['thermal','Термодинамика']]],
  'Системы единиц и фундаментальные соотношения':['ruler','Переводы СИ ↔ СГС, эквиваленты энергии и размерности через m, ℓ, t, q.',[['mechanics','Механика'],['electricity','Электричество'],['magnetism','Магнетизм'],['dimensions','Размерности'],['equivalents','Энергия и масса']]],
  'Погрешности':['errors','Заметки о погрешностях измерений.'],
  'Комплексные числа':['complex','Заметки о комплексных числах.'],
  'Интегралы':['integral','Таблицы интегралов, методы интегрирования и вычеты.'],
  'Дифференциальные уравнения':['curve','Уравнения первого порядка и линейные системы.'],
  'Векторные операции':['vectors','Скалярное, векторное и смешанное произведения.'],
  'Векторные дифференциальные операторы':['field','Градиент, дивергенция, ротор и интегральные теоремы.'],
  'Теория функций комлексного переменного':['contour','Множества, комплексные функции и вычеты.'],
  'Словарик':['book','Термины и короткие пояснения.']
};
const KNOWLEDGE_ICONS={
  atom:'<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  ruler:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v4m5-4v6m5-6v4"/>',
  errors:'<path d="M7 4v16m-3-16h6M4 20h6M17 7v10m-3-10h6m-6 10h6"/><circle cx="7" cy="12" r="2" fill="var(--panel)"/><circle cx="17" cy="12" r="2" fill="var(--panel)"/>',
  complex:'<path d="M4 3v17h17m-3-3 3 3-3 3M1 6l3-3 3 3M4 20l12-12"/><path d="M16 8v12" stroke-dasharray="2 3" opacity=".5"/><circle cx="16" cy="8" r="2" fill="var(--panel)"/>',
  integral:'<path d="M17 4c-1-2-5-2-5 2l-2 12c0 4-4 4-5 2M4 12h15"/>',
  curve:'<path d="M3 4v17h18M6 17c7 0 3-11 9-11 3 0 2 7 6 7"/>',
  vectors:'<path d="M5 19V4m-3 3 3-3 3 3M5 19h15m-3-3 3 3-3 3M5 19 19 5m-5 0h5v5"/>',
  field:'<path d="M3 8V3h5M3 3l5 5m13 0V3h-5m5 0-5 5M3 16v5h5m-5 0 5-5m13 0v5h-5m5 0-5-5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  contour:'<path d="M7 5C2 7 2 17 8 20s14-3 12-10C19 6 15 3 11 4m-1-2 1 2-2 2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  book:'<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1v15M6 8h2m-2 4h2m8-4h2m-2 4h2"/>'
};
function knowledgeIcon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(KNOWLEDGE_ICONS[name]||KNOWLEDGE_ICONS.book)+'</svg>'}
function knowledgeCategory(f){return f.path.split('/').slice(2,-1).at(-1)||'Справочники'}
function knowledgeSection(f){return f.path.split('/').length===2?'Справочники':sectionOf(f)}
function renderKnowledge(){
  const files=filesFor('База');
  const topicOrder=Object.keys(KNOWLEDGE_TOPICS);
  files.sort((a,b)=>(topicOrder.indexOf(niceName(a))<0?999:topicOrder.indexOf(niceName(a)))-(topicOrder.indexOf(niceName(b))<0?999:topicOrder.indexOf(niceName(b))));
  const sections=[...new Set(files.map(knowledgeSection))].sort((a,b)=>['Практика','Теория','Справочники'].indexOf(a)-['Практика','Теория','Справочники'].indexOf(b));
  if(!sections.includes(state.section))state.section='';
  main.innerHTML=hero('База')+'<section class="knowledge-catalog" aria-label="Разделы базы знаний">'+
    '<div class="knowledge-head"><div><h2>Разделы базы <span class="panel-count">'+files.length+'</span></h2><p>Выберите тему, чтобы открыть материал и его оглавление.</p></div><label class="knowledge-search"><span>Найти тему</span><input id="knowledgeSearch" type="search" placeholder="Название или тема…" autocomplete="off"></label></div>'+
    '<div class="knowledge-filters" role="group" aria-label="Тип материалов">'+['',...sections].map(s=>'<button type="button" data-knowledge-section="'+esc(s)+'" aria-pressed="'+(state.section===s)+'">'+esc(s||'Все материалы')+'</button>').join('')+'</div><div id="knowledgeResults"></div><p id="knowledgeStatus" class="sr-only" role="status"></p></section>';
  const input=$('#knowledgeSearch'),results=$('#knowledgeResults');
  const update=()=>{
    const q=input.value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
    const visible=files.filter(f=>{
      const topic=KNOWLEDGE_TOPICS[niceName(f)];
      const text=[niceName(f),knowledgeCategory(f),topic?.[1]||'',...(topic?.[2]||[]).map(item=>item[1])].join(' ').toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
      return (!state.section||knowledgeSection(f)===state.section)&&(!q||text.includes(q));
    });
    const categories=[...new Set(visible.map(knowledgeCategory))];
    categories.sort((a,b)=>['Физика','Математика','Справочники'].indexOf(a)-['Физика','Математика','Справочники'].indexOf(b));
    results.innerHTML=categories.map(category=>'<section class="knowledge-group"><h3>'+esc(category)+'</h3><div class="knowledge-grid">'+visible.filter(f=>knowledgeCategory(f)===category).map(f=>{
      const name=niceName(f),topic=KNOWLEDGE_TOPICS[name]||['book',fileDesc(f)];
      const url=f.ext==='.ipynb'?notebookUrl(f):f.ext==='.pdf'?viewerUrl(f):githubUrl(f);
      const shortcuts=(topic[2]||[]).map(([anchor,label])=>'<a href="'+esc(url+'#'+anchor)+'">'+esc(label)+'</a>').join('');
      return '<article class="knowledge-tile"><a class="knowledge-card" href="'+esc(url)+'"><span class="knowledge-symbol" aria-hidden="true">'+knowledgeIcon(topic[0])+'</span><div class="knowledge-card-copy"><span class="knowledge-kind">'+esc(knowledgeSection(f))+'</span><h4>'+esc(name)+'</h4><p>'+esc(topic[1])+'</p></div><span class="knowledge-arrow" aria-hidden="true">↗</span></a>'+(shortcuts?'<nav class="knowledge-shortcuts" aria-label="'+esc(name)+': быстрые переходы">'+shortcuts+'</nav>':'')+'</article>';
    }).join('')+'</div></section>').join('')||'<div class="empty">Темы не найдены. Попробуйте другое название или выберите все материалы.</div>';
    $('#knowledgeStatus').textContent='Найдено материалов: '+visible.length;
  };
  input.oninput=update;
  $$('[data-knowledge-section]').forEach(button=>button.onclick=()=>{
    state.section=button.dataset.knowledgeSection;
    $$('[data-knowledge-section]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    update();
  });
  update();syncSubjectHash();
}
function safeLinksHref(value){
  try{
    const url=new URL(String(value||'').trim());
    return /^https?:$/.test(url.protocol)?url.href:'';
  }catch{return''}
}
function renderLinksMarkdown(source){
  const inline=text=>esc(text).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(match,label,href)=>{
    const safe=safeLinksHref(href);
    return safe?'<a class="links-open-button" href="'+esc(safe)+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>':esc(match);
  });
  const lines=String(source||'').replace(/\r/g,'').split('\n');
  let html='',listOpen=false;
  const closeList=()=>{if(listOpen){html+='</ul>';listOpen=false}};
  for(const raw of lines){
    const line=raw.trim();
    if(!line){closeList();continue}
    const heading=/^(#{1,3})\s+(.+)$/.exec(line);
    if(heading){
      closeList();
      const level=heading[1].length;
      html+='<h'+level+'>'+inline(heading[2])+'</h'+level+'>';
      continue;
    }
    const item=/^[-*]\s+(.+)$/.exec(line);
    if(item){
      if(!listOpen){html+='<ul>';listOpen=true}
      html+='<li>'+inline(item[1])+'</li>';
      continue;
    }
    closeList();
    html+='<p>'+inline(line)+'</p>';
  }
  closeList();
  return html||'<div class="links-error">Файл link.md пуст.</div>';
}
async function loadSubjectLinks(){
  const target=document.getElementById('subjectLinksContent');
  if(!target)return;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const rawPath=encPath('ТДиСФ/link.md');
    const url='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+rawPath+'?t='+Date.now();
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const markdown=await response.text();
    if(target.isConnected)target.innerHTML=renderLinksMarkdown(markdown);
  }catch(error){
    console.error('[links]',error);
    if(target.isConnected){
      target.innerHTML='<div class="links-error">Не удалось прочитать ТДиСФ/link.md. <button type="button" id="retrySubjectLinks" class="feedback-retry">Повторить</button></div>';
      const retry=document.getElementById('retrySubjectLinks');
      if(retry)retry.onclick=()=>{target.innerHTML='<div class="links-loading">Загружаю ссылки…</div>';void loadSubjectLinks()};
    }
  }finally{
    clearTimeout(timeout);
  }
}
function renderSubjectLinks(){
  main.innerHTML=hero(state.subject)+
    '<div id="subjectTabs">'+tabs(state.subject)+'</div>'+
    '<section class="panel links-panel"><div id="subjectLinksContent" class="links-content"><div class="links-loading">Загружаю ссылки…</div></div></section>';
  syncSubjectHash();
  $$('.tab').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;state.selected=null;state.selectedEntry=null;renderSubject()});
  void loadSubjectLinks();
}
function renderSubject(){
  if(state.subject==='База'){
    const selected=state.selected;state.selected=null;state.selectedEntry=null;
    renderKnowledge();
    if(selected&&subjectOf(selected)==='База')location.href=selected.ext==='.ipynb'?notebookUrl(selected):selected.ext==='.pdf'?viewerUrl(selected):githubUrl(selected);
    return;
  }
  if(state.subject==='ТДиСФ'&&state.section==='Ссылки'){
    renderSubjectLinks();
    return;
  }
  const firstSection=sectionsFor(state.subject)[0]||'';
  if(!state.section)state.section=firstSection;
  const group=structuredGroup(state.subject,state.section);
  const files=filesFor(state.subject,state.section);
  let listHtml='',count=0,listTitle='Список материалов',previewFile=null;

  if(group&&group.items?.length){
    const pdfFile=fileByPath(group.pdf_path);
    count=group.items.length;
    listTitle=state.section==='Лекции'?'Список лекций':state.section==='Семинары'?'Список семинаров':'Список материалов';
    if(!state.selectedEntry||!group.items.some(i=>i.id===state.selectedEntry.id))state.selectedEntry=group.items[0];
    state.selected=pdfFile;
    previewFile=pdfFile;
    listHtml=entryRows(group);
  }else{
    state.selectedEntry=null;
    if(!state.selected||!files.some(f=>f.path===state.selected.path))state.selected=files[0]||null;
    previewFile=state.selected;
    count=files.length;
    listHtml=fileRows(files);
  }

  const listTitleHtml=esc(listTitle)+' <span class="panel-count">'+count+'</span>';
  if(main.querySelector('.workspace')){
    main.querySelector('.hero').outerHTML=hero(state.subject);
    main.querySelector('#subjectTabs').innerHTML=tabs(state.subject);
    main.querySelector('.list-panel .panel-title').innerHTML=listTitleHtml;
    main.querySelector('.list-panel .file-list').innerHTML=listHtml;
    patchPreviewHtml(main.querySelector('.preview-panel'),preview(previewFile,state.selectedEntry));
  }else main.innerHTML=hero(state.subject)+
    '<div id="subjectTabs">'+tabs(state.subject)+'</div>'+
    '<div class="workspace"><div class="subject-list-col"><section class="panel list-panel"><div class="panel-head"><h2 class="panel-title">'+esc(listTitle)+' <span class="panel-count">'+count+'</span></h2><select id="sortSelect" class="sort-select"><option value="date">По порядку</option><option value="name">По названию</option></select></div><div class="file-list">'+listHtml+'</div></section></div><div class="workspace-resizer" role="separator" aria-orientation="vertical" title="Потяните, чтобы изменить ширину списка"></div>'+preview(previewFile,state.selectedEntry)+'</div>';

  syncSubjectHash();
  bindPreviewTabs();
  bindWorkspaceResizer();
  bindPreviewHeight();
  const sort=$('#sortSelect');if(sort){sort.value=state.sort;sort.onchange=()=>{state.sort=sort.value;renderSubject()}}
  $$('.tab').forEach(b=>b.onclick=()=>{state.section=b.dataset.section;state.selected=null;state.selectedEntry=null;renderSubject()});
  $$('.file-row[data-entry]').forEach(r=>r.onclick=()=>{
    const item=(group?.items||[]).find(i=>i.id===r.dataset.entry);if(!item)return;
    state.selectedEntry=item;
    if(isPhoneLayout()&&previewFile?.ext==='.pdf'){openPdfFullscreen(viewerUrl(previewFile,item.page||0,item.title),item.title);return}
    recordOpenedFile(previewFile);
    renderSubject();
  });
  $$('.file-row[data-path]').forEach(r=>r.onclick=()=>{
    const f=FILES.find(x=>x.path===r.dataset.path);if(!f)return;
    if(isPhoneLayout()&&f.ext==='.pdf'){openPdfFullscreen(viewerUrl(f),niceName(f));return}
    if(isPhoneLayout()&&f.ext==='.ipynb'){openPdfFullscreen(notebookUrl(f,0,niceName(f),false),niceName(f));return}
    recordOpenedFile(f);
    state.selected=f;state.selectedEntry=null;renderSubject();
  });
}
function countBySection(name){
  const groups=(state.structure?.groups||[]).filter(g=>g.section===name&&Array.isArray(g.items)&&g.items.length);
  if(groups.length)return groups.reduce((n,g)=>n+g.items.length,0);
  return FILES.filter(f=>sectionOf(f)===name).length;
}

let giscusLoadSerial=0;
function giscusThemeForSite(){
  return 'transparent_dark';
}
async function mountFeedback(){
  const mount=document.getElementById('giscusMount');
  if(!mount)return;
  const serial=++giscusLoadSerial;

  mount.replaceChildren();

  const status=document.createElement('div');
  status.className='feedback-loading';
  status.textContent='Подключаю обсуждение…';
  mount.appendChild(status);

  let cfg;
  try{
    const response=await fetch('giscus-config.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('giscus config '+response.status);
    cfg=await response.json();
    if(!cfg.repoId||!cfg.category||!cfg.categoryId)throw new Error('Incomplete giscus config');
  }catch{
    if(serial!==giscusLoadSerial||!mount.isConnected)return;
    mount.innerHTML='<div class="feedback-setup"><span>Не удалось загрузить настройки комментариев.</span><button class="feedback-retry" type="button">Повторить</button></div>';
    mount.querySelector('.feedback-retry').onclick=mountFeedback;return;
  }
  if(serial!==giscusLoadSerial||!mount.isConnected)return;

  const script=document.createElement('script');
  script.src='https://giscus.app/client.js';
  script.async=true;
  script.crossOrigin='anonymous';
  script.dataset.repo=OWNER+'/'+REPO;
  script.dataset.repoId=cfg.repoId;
  script.dataset.category=cfg.category;
  script.dataset.categoryId=cfg.categoryId;
  script.dataset.mapping='specific';
  script.dataset.term='NSU FP · Идеи и замечания';
  script.dataset.strict='1';
  script.dataset.reactionsEnabled='1';
  script.dataset.emitMetadata='0';
  script.dataset.inputPosition='top';
  script.dataset.theme=giscusThemeForSite();
  script.dataset.lang='ru';

  const watchdog=setTimeout(()=>{
    if(serial!==giscusLoadSerial||!document.body.contains(mount))return;
    if(mount.querySelector('.giscus-frame'))return;
    mount.innerHTML='<div class="feedback-setup"><span>Не удалось подключиться к giscus.</span><button class="feedback-retry" type="button">Повторить</button></div>';
    mount.querySelector('.feedback-retry')?.addEventListener('click',mountFeedback);
  },15000);

  script.onload=()=>{
    clearTimeout(watchdog);
    if(serial!==giscusLoadSerial||!document.body.contains(mount))return;
    requestAnimationFrame(()=>{
      const frame=mount.querySelector('.giscus-frame');
      if(frame){
        status.remove();
        frame.addEventListener('load',()=>status.remove(),{once:true});
      }else{
        mount.innerHTML='<div class="feedback-setup"><span>giscus загрузился, но не создал окно комментариев.</span><button class="feedback-retry" type="button">Повторить</button></div>';
        mount.querySelector('.feedback-retry')?.addEventListener('click',mountFeedback);
      }
    });
  };

  script.onerror=()=>{
    clearTimeout(watchdog);
    if(serial!==giscusLoadSerial||!document.body.contains(mount))return;
    mount.innerHTML='<div class="feedback-setup"><span>Не удалось загрузить giscus.</span><button class="feedback-retry" type="button">Повторить</button></div>';
    mount.querySelector('.feedback-retry')?.addEventListener('click',mountFeedback);
  };

  mount.appendChild(script);
}

window.addEventListener('message',event=>{
  if(event.origin!=='https://giscus.app'||!event.data?.giscus)return;
  const mount=document.getElementById('giscusMount');
  if(!mount)return;
  mount.querySelector('.feedback-loading')?.remove();

  // "Discussion not found" is giscus' normal empty state: it will create
  // the Discussion automatically when an authenticated user posts first.
  const error=String(event.data.giscus.error||'');
  if(error && !error.includes('Discussion not found')){
    console.warn('[giscus]',error);
  }
});


function renderHome(){
  const recent=FILES.slice().sort((a,b)=>(new Date(updatedValue(b)||0))-(new Date(updatedValue(a)||0))).slice(0,7);
  const opened=openedHistoryFiles(8);
  const openedHtml=opened.length?opened.map(({file:f})=>{
    const page=rememberedPdfPage(f);
    const right=f.ext==='.pdf'?(page?'стр. '+page:'PDF'):'Notebook';
    return '<div class="recent-row history-row" data-history-path="'+esc(f.path)+'"><div><div class="recent-name">'+esc(niceName(f))+'</div><div class="recent-meta">'+esc(subjectOf(f)+' · '+sectionOf(f))+'</div></div><div class="history-actions"><div class="recent-date">'+esc(right)+'</div><button class="history-remove" type="button" title="Убрать из истории" aria-label="Убрать '+esc(niceName(f))+' из истории">×</button></div></div>';
  }).join(''):'<div class="history-empty">Здесь появятся последние открытые материалы.</div>';
  main.innerHTML='<div class="home-grid">'+
    '<section class="panel welcome"><h2>Материалы 4 курса</h2><p>Физический факультет НГУ · 1 семестр</p>'+
      '<div class="course-grid">'+ORDER.filter(s=>FILES.some(f=>subjectOf(f)===s)).map(s=>'<div class="course-card" data-subject="'+esc(s)+'"><div class="course-code">'+esc(s)+'</div><div class="course-name">'+esc((META[s]||{}).name||s)+'</div></div>').join('')+'</div>'+
    '</section>'+
    '<section id="openHistory" class="panel recent"><h2 class="panel-title">История открытия</h2>'+openedHtml+'</section>'+
    '<section id="recentUpdates" class="panel recent"><h2 class="panel-title">Недавно обновлено</h2>'+recent.map(f=>{const m=fileMeta(f),b=isNewDate(m.created_at)?'<span class="new-badge">NEW</span>':'';return '<div class="recent-row updated-row" data-path="'+esc(f.path)+'"><div><div class="recent-name"><span class="file-name-line">'+esc(niceName(f))+b+'</span></div><div class="recent-meta">'+esc(subjectOf(f)+' · '+sectionOf(f))+'</div></div><div class="recent-date">'+esc(fmtDate(updatedValue(f)))+'</div></div>'}).join('')+'</section>'+
    '<section class="panel feedback-panel"><div class="feedback-head"><div class="feedback-copy"><div class="feedback-kicker">Обратная связь</div><h2 class="feedback-title">Идеи и замечания</h2><p class="feedback-desc">Есть что улучшить, нашли ошибку или не хватает материала? Напишите здесь — сообщения хранятся в GitHub Discussions.</p></div></div><div id="giscusMount" class="giscus-wrap"><div class="feedback-loading">Загружаю обсуждение…</div></div></section>'+
  '</div>';
  $$('.course-card').forEach(c=>c.onclick=()=>{state.view='subjects';state.subject=c.dataset.subject;state.section='';state.selected=null;state.selectedEntry=null;setActiveNav('subjects');renderSubjectNav();render()});
  $$('.history-row').forEach(r=>r.onclick=()=>{
    const f=fileByPath(r.dataset.historyPath);if(!f)return;
    if(f.ext==='.pdf'){void openPdfFullscreen(viewerUrl(f,rememberedPdfPage(f),niceName(f)),niceName(f));return}
    if(f.ext==='.ipynb'){void openPdfFullscreen(notebookUrl(f,0,niceName(f),false),niceName(f));return}
  });
  $$('.history-remove').forEach(button=>button.onclick=event=>{
    event.preventDefault();
    event.stopPropagation();
    const row=button.closest('.history-row');
    const path=row?.dataset.historyPath;
    if(!path)return;
    removeOpenedPath(path);
    row.remove();
    const panel=document.getElementById('openHistory');
    if(panel&&!panel.querySelector('.history-row')){
      panel.insertAdjacentHTML('beforeend','<div class="history-empty">Здесь появятся последние открытые материалы.</div>');
    }
  });
  $$('.updated-row').forEach(r=>r.onclick=()=>{const f=FILES.find(x=>x.path===r.dataset.path);if(!f)return;state.view='subjects';state.subject=subjectOf(f);state.section=sectionOf(f);state.selected=f;setActiveNav('subjects');renderSubjectNav();render()});
  void mountFeedback();
}

function searchStatus(message,retry=false){
  const note=main.querySelector('.search-note');if(!note)return;
  note.textContent=message;
  if(retry){const button=document.createElement('button');button.type='button';button.className='feedback-retry';button.textContent='Повторить';button.onclick=()=>runSearch(searchQuery);note.append(' ',button)}
}
function ensureSearchWorker(){
  if(searchWorker)return searchWorker;
  const worker=new Worker('search-worker.js?v=32d5520b7c',{type:'module'});
  worker.postMessage({type:'init',files:FILES.map(f=>({...f,title:niceName(f),subject:subjectOf(f),section:sectionOf(f),description:fileDesc(f)}))});
  worker.onmessage=event=>{
    const data=event.data;
    if(data.id!==searchRun||state.view!=='search')return;
    if(data.type==='progress'){searchStatus('Загружаю поиск по содержимому: '+data.loaded+' / '+data.total);return}
    if(data.type!=='results')return;
    const selected=searchGroups[searchSelectedGroup]?.f.path;
    searchGroupsAll=data.groups.map(group=>({...group,f:fileByPath(group.path)})).filter(group=>group.f);
    const filtered=searchGroupsAll.filter(g=>(searchFilterSubject==='all'||subjectOf(g.f)===searchFilterSubject)&&(searchFilterSection==='all'||sectionOf(g.f)===searchFilterSection));
    searchSelectedGroup=Math.max(0,filtered.findIndex(g=>g.f.path===selected));
    state.searchBusy=!!data.partial;searchStems=data.stems||[];
    renderSearchResults(searchQuery);
    searchStatus(data.partial?'Результаты по названию. Загружаю поиск по содержимому…':data.failed?'Не весь индекс удалось загрузить. Результаты могут быть неполными.':'Результаты для «'+searchQuery+'»',!!data.failed);
  };
  worker.onerror=event=>{
    event.preventDefault();worker.terminate();if(searchWorker===worker)searchWorker=null;
    state.searchBusy=false;
    if(state.view==='search')searchStatus('Не удалось запустить поиск.',true);
  };
  searchWorker=worker;return worker;
}

function searchNorm(v){return String(v||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function searchTerms(q){return [...new Set(searchNorm(q).split(' ').filter(Boolean))]}
// Highlights the stems the worker matched (searchStems), extended to the end of the word.
function searchHi(text,q){
  const raw=String(text||''),terms=searchNorm(q)===searchNorm(searchQuery)&&searchStems.length?searchStems:searchTerms(q);
  if(!terms.length)return esc(raw);
  const low=raw.toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
  // Longest term first; an optional dash between letters lets "вопервых" mark "во-первых".
  const pattern=new RegExp(terms.slice().sort((a,b)=>b.length-a.length).map(t=>[...t].map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[-‐-―]?')).join('|'),'gu');
  let out='',pos=0;
  for(const match of low.matchAll(pattern)){
    if(match.index<pos)continue;
    let end=match.index+match[0].length;
    while(end<raw.length&&/[\p{L}\p{N}]/u.test(raw[end]))end++;
    out+=esc(raw.slice(pos,match.index))+'<mark>'+esc(raw.slice(match.index,end))+'</mark>';
    pos=end;
  }
  return out+esc(raw.slice(pos));
}
function searchFiltersHtml(){
  const subjects=ORDER.filter(x=>searchGroupsAll.some(g=>subjectOf(g.f)===x));
  const pref=['Лекции','Семинары','Лабораторные работы','Задачи','Месячные задания','Литература','Практика','Теория'];
  const sections=[...new Set(searchGroupsAll.map(g=>sectionOf(g.f)))].sort((a,b)=>(pref.indexOf(a)<0?99:pref.indexOf(a))-(pref.indexOf(b)<0?99:pref.indexOf(b))||a.localeCompare(b,'ru'));
  const chips=(kind,vals,current)=>'<button class="search-filter-chip'+(current==='all'?' active':'')+'" data-search-filter="'+kind+'" data-value="all">Все</button>'+vals.map(v=>'<button class="search-filter-chip'+(current===v?' active':'')+'" data-search-filter="'+kind+'" data-value="'+esc(v)+'">'+esc(v)+'</button>').join('');
  return '<div class="search-pro-filters"><div class="search-filter-row"><span class="search-filter-label">Раздел</span><div class="search-filter-scroll">'+chips('section',sections,searchFilterSection)+'</div></div><div class="search-filter-row"><span class="search-filter-label">Предмет</span><div class="search-filter-scroll">'+chips('subject',subjects,searchFilterSubject)+'</div></div></div>';
}
function searchGroupHtml(g,i,q){
  const m=fileMeta(g.f),hits=g.hits||[],active=i===searchSelectedGroup;
  const pages=hits.slice(0,10).map((h,j)=>'<button class="search-page-hit'+(active&&j===searchSelectedHit?' active':'')+'" data-search-group="'+i+'" data-search-hit="'+j+'">'+(h.page?(g.f.ext==='.ipynb'?'ячейка ':'стр. ')+h.page:(g.f.ext==='.pdf'?'PDF':'Notebook'))+'</button>').join('');
  const more=hits.length>10?'<span class="search-more">+'+(hits.length-10)+'</span>':'';
  const first=hits[0]||{snippet:''},meta=[subjectOf(g.f),sectionOf(g.f)];
  if(m.page_count)meta.push(m.page_count+' стр.');else if(m.cell_count)meta.push(m.cell_count+' ячеек');if(m.size)meta.push(fmtSize(m.size));
  const badge=isNewDate(m.created_at)?'<span class="new-badge search-result-new">NEW</span>':'';
  return '<div class="search-group'+(active?' active':'')+'"><button class="search-group-main" data-search-group-main="'+i+'"><div class="search-group-top"><span class="search-badge">'+esc(subjectOf(g.f))+'</span><span class="search-group-title">'+searchHi(niceName(g.f),q)+'</span>'+badge+'<span class="search-hit-count">'+hits.length+' совп.</span></div><div class="search-group-meta">'+esc(meta.join(' · '))+'</div><div class="search-group-snippet">'+searchHi(first.snippet||'',q)+'</div></button><div class="search-pages">'+pages+more+'</div></div>';
}
function searchPreviewHtml(q){
  if(state.searchBusy&&!searchMobilePreview)return '<div class="search-preview-empty">Выберите документ или дождитесь результатов поиска по содержимому.</div>';
  const g=searchGroups[searchSelectedGroup];if(!g)return '<div class="search-preview-empty">Нет результатов для выбранных фильтров.</div>';
  const hit=g.hits[searchSelectedHit]||g.hits[0]||{page:0,snippet:''},f=g.f;
  const isPdf=f.ext==='.pdf',isNotebook=f.ext==='.ipynb';
  let openUrl=isPdf?viewerUrl(f,hit.page||0,niceName(f)):isNotebook?notebookUrl(f,hit.page||0,niceName(f),false):githubUrl(f);
  let frameUrl=isPdf?openUrl+'&embed=1&searchpreview=1':isNotebook?notebookUrl(f,hit.page||0,niceName(f),true):openUrl;
  if((isPdf||isNotebook)&&q){openUrl+='&find='+encodeURIComponent(q);frameUrl+='&find='+encodeURIComponent(q)}
  const frame=(isPdf||isNotebook)
    ?'<div class="search-preview-frame-wrap"><iframe class="search-preview-frame" src="'+esc(frameUrl)+'" loading="lazy" title="'+esc(niceName(f))+'"></iframe></div>'
    :'<div class="search-preview-empty">Предпросмотр для этого формата недоступен.</div>';
  const loc=hit.page?(isNotebook?' · ячейка ':' · стр. ')+hit.page:'';
  return '<div class="search-preview-head"><div><div class="search-preview-kicker">'+esc(subjectOf(f)+' · '+sectionOf(f)+loc)+'</div><h2 class="search-preview-title">'+esc(niceName(f))+'</h2></div><button class="search-preview-close" type="button">×</button></div><div class="search-preview-toolbar"><a class="search-open" href="'+esc(openUrl)+'">Открыть'+(hit.page?(isNotebook?' ячейку ':' стр. ')+hit.page:'')+'</a><div class="search-hit-nav"><button class="search-prev-hit" type="button">‹</button><span class="search-hit-position">'+(searchSelectedHit+1)+' / '+g.hits.length+'</span><button class="search-next-hit" type="button">›</button></div></div>'+frame+'<div class="search-preview-text">'+searchHi(hit.snippet||'',q)+'</div>';
}

function dismissSearchKeyboard(){
  searchInput.blur();
  const active=document.activeElement;
  if(active&&active!==document.body&&typeof active.blur==='function')active.blur();
}
function bindSearchUi(q){
  $$('.search-filter-chip').forEach(b=>b.onclick=()=>{dismissSearchKeyboard();if(b.dataset.searchFilter==='subject')searchFilterSubject=b.dataset.value;else searchFilterSection=b.dataset.value;searchSelectedGroup=0;searchSelectedHit=0;searchMobilePreview=false;renderSearchResults(q)});
  $$('.search-group-main').forEach(b=>b.onclick=()=>{dismissSearchKeyboard();searchSelectedGroup=Number(b.dataset.searchGroupMain)||0;searchSelectedHit=0;searchMobilePreview=true;renderSearchResults(q)});
  $$('.search-page-hit').forEach(b=>b.onclick=e=>{e.stopPropagation();dismissSearchKeyboard();searchSelectedGroup=Number(b.dataset.searchGroup)||0;searchSelectedHit=Number(b.dataset.searchHit)||0;searchMobilePreview=true;renderSearchResults(q)});
  const prev=$('.search-prev-hit'),next=$('.search-next-hit'),close=$('.search-preview-close'),open=$('.search-open');
  if(prev)prev.onclick=()=>{dismissSearchKeyboard();const g=searchGroups[searchSelectedGroup];if(!g)return;searchSelectedHit=(searchSelectedHit-1+g.hits.length)%g.hits.length;searchMobilePreview=true;renderSearchResults(q)};
  if(next)next.onclick=()=>{dismissSearchKeyboard();const g=searchGroups[searchSelectedGroup];if(!g)return;searchSelectedHit=(searchSelectedHit+1)%g.hits.length;searchMobilePreview=true;renderSearchResults(q)};
  if(open)open.onclick=()=>dismissSearchKeyboard();
  if(close)close.onclick=()=>{dismissSearchKeyboard();searchMobilePreview=false;const p=$('#searchPreview');if(p)p.classList.remove('mobile-visible')};
}
function renderSearchResults(q){
  searchGroups=searchGroupsAll.filter(g=>(searchFilterSubject==='all'||subjectOf(g.f)===searchFilterSubject)&&(searchFilterSection==='all'||sectionOf(g.f)===searchFilterSection));
  if(searchSelectedGroup>=searchGroups.length)searchSelectedGroup=0;
  const g=searchGroups[searchSelectedGroup];if(g&&searchSelectedHit>=g.hits.length)searchSelectedHit=0;
  const filters=$('#searchFilters'),results=$('#searchResults'),preview=$('#searchPreview');
  if(filters)filters.innerHTML=searchFiltersHtml();
  const total=searchGroups.reduce((n,x)=>n+x.hits.length,0);
  if(results)results.innerHTML='<div class="search-pro-summary">'+searchGroups.length+' документов · '+total+' совпадений</div>'+(searchGroups.length?searchGroups.map((x,i)=>searchGroupHtml(x,i,q)).join(''):'<div class="empty">По этим фильтрам ничего не найдено.</div>');
  if(preview){preview.classList.toggle('mobile-visible',searchMobilePreview);patchPreviewHtml(preview,'<aside id="searchPreview" class="'+esc(preview.className)+'">'+searchPreviewHtml(q)+'</aside>')}
  bindSearchUi(q);
}
async function runSearch(q){
  q=(q||'').trim();
  const previous=searchQuery,run=++searchRun;searchQuery=q;
  if(searchNorm(previous)!==searchNorm(q)){searchFilterSubject='all';searchFilterSection='all';searchSelectedGroup=0;searchSelectedHit=0;searchMobilePreview=false}
  state.view='search';setActiveNav('search');renderSubjectNav();
  main.innerHTML='<section class="search-view"><div class="search-pro-head"><div><h1 class="search-title">Поиск</h1><div class="search-note">'+(q?'Ищем «'+esc(q)+'»':'Введите запрос в строке сверху.')+'</div></div></div><div id="searchFilters"></div><div class="search-pro-layout"><div class="panel search-pro-results" id="searchResults"><div class="empty">'+(q.length<2?'Минимум 2 символа.':'Поиск…')+'</div></div><aside id="searchPreview" class="panel search-pro-preview"><div class="search-preview-empty">Выберите документ — здесь появится найденная страница.</div></aside></div></section>';
  searchGroupsAll=[];searchGroups=[];
  if(q.length<2){state.searchBusy=false;searchWorker?.postMessage({type:'cancel',id:run});return}
  state.searchBusy=true;
  try{ensureSearchWorker().postMessage({type:'search',id:run,query:q})}
  catch{state.searchBusy=false;searchStatus('Не удалось запустить поиск.',true)}
}
function bindFilteredRows(){
  document.querySelectorAll('.file-row').forEach(r=>r.onclick=()=>{
    const f=FILES.find(x=>x.path===r.dataset.path);
    if(!f)return;
    if(subjectOf(f)==='ДЛ'){
      if(f.ext==='.pdf'){void openPdfFullscreen(viewerUrl(f),niceName(f));return}
      if(f.ext==='.ipynb'){void openPdfFullscreen(notebookUrl(f,0,niceName(f),false),niceName(f));return}
    }
    state.view='subjects';
    state.subject=subjectOf(f);
    state.section=sectionOf(f);
    state.selected=f;
    setActiveNav('subjects');
    renderSubjectNav();
    render();
  });
}
function renderFiltered(title,predicate){
  const list=FILES.filter(predicate);
  main.innerHTML='<section class="search-view"><h1 class="search-title">'+esc(title)+'</h1><div class="search-note">'+list.length+' файл(ов)</div><div class="panel filtered-list"><div class="file-list">'+fileRows(list)+'</div></div></section>';
  bindFilteredRows();
}
function renderLiterature(){
  const extra=state.literatureTab==='additional';
  const list=FILES.filter(extra
    ? f=>subjectOf(f)==='ДЛ'
    : f=>subjectOf(f)!=='ДЛ'&&sectionOf(f)==='Литература');
  main.innerHTML='<section class="search-view">'+
    '<h1 class="search-title">Литература</h1>'+
    '<div class="literature-tabs" role="tablist" aria-label="Разделы литературы">'+
      '<button class="literature-tab '+(!extra?'active':'')+'" type="button" data-literature-tab="main" role="tab" aria-selected="'+(!extra)+'">Литература</button>'+
      '<button class="literature-tab '+(extra?'active':'')+'" type="button" data-literature-tab="additional" role="tab" aria-selected="'+extra+'">Доп. литература</button>'+
    '</div>'+
    '<div class="search-note">'+list.length+' файл(ов)</div>'+
    '<div class="panel filtered-list"><div class="file-list">'+fileRows(list)+'</div></div>'+
  '</section>';
  document.querySelectorAll('[data-literature-tab]').forEach(btn=>btn.onclick=()=>{
    const next=btn.dataset.literatureTab;
    if(next===state.literatureTab)return;
    state.literatureTab=next;
    renderLiterature();
  });
  bindFilteredRows();
}

function render(){
  if(state.view==='home')renderHome();
  else if(state.view==='subjects')renderSubject();
  else if(state.view==='search')runSearch(searchInput.value);
  else if(state.view==='literature')renderLiterature();
  else if(state.view==='additional-literature'){state.view='literature';state.literatureTab='additional';setActiveNav('literature');renderLiterature()}
  else if(state.view==='archive')renderFiltered('Все материалы',()=>true);
}

async function loadMeta(){
  main.innerHTML='<div class="empty">Загружаю материалы…</div>';
  try{
    const [data,structure]=await Promise.all([
      fetch('search-index/files.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('files.json '+r.status);return r.json()}),
      fetch('search-index/structure.json',{cache:'no-cache'}).then(r=>r.ok?r.json():({groups:[]})).catch(()=>({groups:[]}))
    ]);
    const rows=(data.files||[]).filter(x=>x?.path&&/\.(pdf|ipynb)$/i.test(x.path)&&!x.path.includes('/LaTeX/')&&x.path!=='ФЭЧ/04_Литератру/PhysRevD.pdf');
    FILES=rows.map(x=>({
      path:x.path,
      name:x.path.split('/').pop(),
      ext:'.'+String(x.type||x.path.split('.').pop()).replace(/^\./,'').toLowerCase()
    }));
    state.meta.clear();
    rows.forEach(x=>state.meta.set(x.path,x));
    searchWorker?.terminate();searchWorker=null;++searchRun;
    state.structure=structure||{groups:[]};
    const hs=hashSubject();
    if(ORDER.includes(hs))state.subject=hs;
    else if(!FILES.some(x=>subjectOf(x)===state.subject))state.subject=ORDER.find(x=>FILES.some(f=>subjectOf(f)===x))||'ФиХАиМ';
    renderSubjectNav();
    setActiveNav(state.view);
    if(!takeHashSearch())render();
  }catch(e){
    console.error(e);
    main.innerHTML='<section class="search-view"><div class="panel"><div class="empty">Не удалось загрузить материалы. Обновите страницу через Ctrl+F5.</div></div></section>';
  }
}

$$('.nav-btn').forEach(b=>b.onclick=()=>{
  state.view=b.dataset.view;
  if(state.view!=='subjects')clearSubjectHash();
  setActiveNav(state.view);renderSubjectNav();
  if(state.view==='search'){searchInput.focus();runSearch(searchInput.value)}else render();
  closeMenu();
});
$('#homeBtn').onclick=()=>{state.view='home';clearSubjectHash();setActiveNav('home');renderSubjectNav();render()};
$('#menuBtn').onclick=openMenu;overlay.onclick=closeMenu;
searchInput.addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{
    if(searchInput.value.trim()){state.view='search';setActiveNav('search');runSearch(searchInput.value)}
    else if(state.view==='search')runSearch('');
  },220);
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInput.focus();searchInput.select();return}
  if(e.key==='Escape'){
    if(pdfFullscreen.classList.contains('open')){closePdfFullscreen();return}
    const p=$('#searchPreview');if(p?.classList.contains('mobile-visible')){searchMobilePreview=false;p.classList.remove('mobile-visible');return}
    if(document.activeElement===searchInput){searchInput.value='';searchInput.blur();if(state.view==='search'){state.view='subjects';setActiveNav('subjects');renderSubjectNav();render()}}
  }
});

function enableMobileImmersiveMode(){
  if(!window.matchMedia('(max-width:720px), (pointer:coarse)').matches)return;
  if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  try{
    const result=document.documentElement.requestFullscreen({navigationUI:'hide'});
    if(result?.catch)result.catch(()=>{});
  }catch{}
}
const installedApp=()=>window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches||navigator.standalone===true;
// Only element fullscreen lets the page draw under the camera cutout (viewport-fit=cover);
// without it the area is a black strip. The browser drops it after the keyboard, app
// switches or dialogs, so the installed app restores it on the next tap.
function mobileImmersiveGesture(event){
  if(event.target.closest('#installApp,#offlineFiles,#appSettings,.app-dialog'))return;
  if(!installedApp())document.removeEventListener('pointerup',mobileImmersiveGesture,true);
  enableMobileImmersiveMode();
}
document.addEventListener('pointerup',mobileImmersiveGesture,true);
// Taps inside the PDF frame never reach this document; the viewer calls this instead.
window.nsuKeepImmersive=()=>{if(installedApp())enableMobileImmersiveMode()};

window.addEventListener('hashchange',()=>{
  if(location.hash.startsWith('#search=')){if(FILES.length)takeHashSearch();return}
  const hs=hashSubject();
  if(ORDER.includes(hs)){
    if(state.view==='subjects'&&hs===state.subject)return;
    state.view='subjects';state.subject=hs;state.section='';state.selected=null;state.selectedEntry=null;
    setActiveNav('subjects');renderSubjectNav();render();
    return;
  }
  state.view='home';state.section='';state.selected=null;state.selectedEntry=null;
  setActiveNav('home');renderSubjectNav();render();
});
if(ORDER.includes(hashSubject())){state.view='subjects';setActiveNav('subjects')}
else{state.view='home';setActiveNav('home')}

/* Secret academic dashboard: nothing is loaded until the emblem is activated. */
(() => {
  const trigger=$('#secretAcademicTrigger');
  if(!trigger)return;
  trigger.style.cursor='pointer';

  let loading=null;
  let soundContext=null,soundGain=null;
  const effectBuffers=new Map();
  function effectBuffer(name){
    if(!effectBuffers.has(name))effectBuffers.set(name,
      fetch(`Karma/audio/${name}.wav`).then(r=>{if(!r.ok)throw new Error('Sound unavailable');return r.arrayBuffer()})
        .then(data=>soundContext.decodeAudioData(data)).catch(()=>{effectBuffers.delete(name);return null}));
    return effectBuffers.get(name);
  }
  window.preloadKarmaSounds=()=>soundContext?Promise.all(['karmaWheelLow','karmaFuzz','karmaFuzz2',
    'karmaWheelC_1','karmaWheelC_2','karmaWheelC_3','karmaWheelC_4','capBell2','UIWood5','karmaRiseA','UIWoodHit'].map(effectBuffer)):Promise.resolve();
  window.playSecretDashboardSound=(name,volume=.4,options={})=>{
    let cancelled=false,source=null,gain=null,pitch=options.pitch||1;
    if(!soundContext)return ()=>{};
    if(!/^[A-Za-z0-9_]+$/.test(name))return ()=>{};
    effectBuffer(name).then(buffer=>{
      if(cancelled||!buffer||!document.getElementById('secretAcademicDashboard')?.classList.contains('is-open'))return;
      source=soundContext.createBufferSource();source.buffer=buffer;
      gain=soundContext.createGain();gain.gain.value=volume;
      source.loop=!!options.loop;source.playbackRate.value=pitch;
      source.connect(gain);gain.connect(soundGain);source.onended=()=>{source.disconnect();gain.disconnect()};source.start();
    }).catch(()=>{});
    const stop=()=>{cancelled=true;if(source)source.stop()};
    stop.set=(newVolume,newPitch=1)=>{volume=newVolume;pitch=newPitch;if(gain)gain.gain.setTargetAtTime(volume,soundContext.currentTime,.025);if(source)source.playbackRate.setTargetAtTime(pitch,soundContext.currentTime,.025)};
    return stop;
  };
  function prepareKarmaAudio(){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;
    try{
      if(!soundContext){
        soundContext=new AudioCtx();
        soundGain=soundContext.createGain();
        soundGain.gain.value=1;
        soundGain.connect(soundContext.destination);
      }
      // Unlock audio during the tap, before the dashboard script loads.
      if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});
    }catch{ /* Audio must not prevent opening the dashboard. */ }
  }
  function openSecretDashboard(){
    window.openSecretAcademicDashboard();
  }
  function loadSecretDashboard(){
    if(loading||document.getElementById('secretAcademicDashboard')?.classList.contains('is-open'))return loading;
    prepareKarmaAudio();
    if(window.openSecretAcademicDashboard&&window.KarmaEngine&&window.KarmaView&&window.KarmaAnimation){
      openSecretDashboard();
      return;
    }

    loading=new Promise((resolve,reject)=>{
      if(!document.querySelector('link[data-secret-dashboard]')){
        const css=document.createElement('link');
        css.rel='stylesheet';
        css.href='secret-dashboard.css?v=3be115b8aa';
        css.dataset.secretDashboard='1';
        document.head.appendChild(css);
        const karmaCss=document.createElement('link');
        karmaCss.rel='stylesheet';karmaCss.href='Karma/karma.css?v=01c0a9ea07';
        document.head.appendChild(karmaCss);
      }

      const scripts=['Karma/karma-engine.js?v=d99288a7f9','Karma/karma-animation.js?v=13d12977d6','Karma/karma-view.js?v=097a0f1789','secret-dashboard.js?v=92564a7fe1'];
      Promise.all(scripts.map(src=>new Promise((loaded,failed)=>{
        const script=document.createElement('script');
        script.src=src;script.async=true;script.dataset.secretDashboard='1';
        script.onload=loaded;script.onerror=()=>{script.remove();failed(new Error('Secret dashboard failed to load'))};
        document.body.appendChild(script);
      }))).then(()=>{
        loading=null;
        if(window.openSecretAcademicDashboard){
          openSecretDashboard();
          resolve();
        }else{
          reject(new Error('Secret dashboard did not initialize'));
        }
      }).catch(error=>{
        loading=null;
        reject(error);
      });
    }).catch(error=>{
      console.error('[secret-dashboard-loader]',error);
      const message=document.createElement('div');
      message.textContent='Не удалось открыть скрытую статистику.';
      message.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2500;padding:10px 13px;border:1px solid #54343a;border-radius:8px;background:#151015;color:#efc6c4;font-size:12px;box-shadow:0 12px 40px rgba(0,0,0,.35)';
      document.body.appendChild(message);
      setTimeout(()=>message.remove(),2600);
    });
    return loading;
  }

  let lastTap=0,lastTouchEnd=0;
  trigger.addEventListener('dblclick',e=>{
    e.preventDefault();
    e.stopPropagation();
    // Touch double taps are recognised in touchend below. The browser's own
    // dblclick would also pair a single tap here with the menu-button tap that
    // opened the sidebar: the emblem appears exactly where that button was.
    if(Date.now()-lastTouchEnd<800)return;
    loadSecretDashboard();
  });

  trigger.addEventListener('touchend',e=>{
    const now=Date.now();
    lastTouchEnd=now;
    if(now-lastTap<360){
      e.preventDefault();
      loadSecretDashboard();
      lastTap=0;
      return;
    }
    lastTap=now;
  },{passive:false});

  trigger.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.shiftKey){
      e.preventDefault();
      loadSecretDashboard();
    }
  });
})();

loadMeta();

// PDF.js is served by the site itself: the reader must not depend on a CDN being reachable.
import * as pdfjsLib from '../vendor/pdfjs-4.10.38/pdf.min.mjs';
import {ReaderNotes} from './notes.js?v=01d30fc6e0';
import {currentMaterialPath} from './material-paths.js?v=ca1e61a965';
import {renderViewerIcons} from './icons.js?v=c6753488af';
import {applyToneToCanvas,PDF_TONES} from './pdf-tone.js?v=37583b871e';
import {normalizeText,findMatches,itemHighlightRanges} from './search-text.js?v=3770976b57';
const PDFJS_BASE=new URL('../vendor/pdfjs-4.10.38/',location.href).href;
pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_BASE+'pdf.worker.min.mjs';

const OWNER='BelovVlad',REPO='NSU_FP_Y4_S1',BRANCH='main';
const params=new URLSearchParams(location.search);
const sourceFileParam=params.get('file')||'';
const raw=currentMaterialPath(sourceFileParam);
const subject=params.get('subject')||'';
const titleParam=params.get('title')||'';
const pageParam=Number(params.get('page')||0);
const findParam=params.get('find')||'';
const versionParam=params.get('v')||'';
const themeParam=params.get('theme')||'';
const embedParam=params.get('embed')==='1';
const searchPreviewParam=params.get('searchpreview')==='1';
if(embedParam)document.body.classList.add('embed-view');
if(searchPreviewParam)document.body.classList.add('search-preview-mode');
const landscapePhoneQuery=window.matchMedia('(orientation:landscape) and (max-height:600px) and (pointer:coarse)');
const phoneStripQuery=window.matchMedia('(pointer:coarse)');
const compactQuery=window.matchMedia(embedParam
  ?'(max-width:520px), (pointer:coarse)'
  :'(max-width:760px), (pointer:coarse)');
document.body.classList.toggle('compact-view',compactQuery.matches);
compactQuery.addEventListener('change',()=>{
  document.body.classList.toggle('compact-view',compactQuery.matches);
  document.body.classList.remove('reader-chrome-hidden');
  closeTools();
});
renderViewerIcons();
function applyViewerTheme(theme){
  document.body.classList.remove('theme-na19','theme-na19x');
  if(theme==='na19')document.body.classList.add('theme-na19');
  else if(theme==='na19x')document.body.classList.add('theme-na19x');
  const meta=document.getElementById('appThemeColor');
  if(meta)meta.content=theme==='na19'?'#071112':theme==='na19x'?'#171b1e':'#0d1015';
}
applyViewerTheme(themeParam);
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='nsu-pdf-theme')return;
  applyViewerTheme(e.data.theme||'');
});
const $=id=>document.getElementById(id);
const back=$('back'),direct=$('direct'),title=$('title'),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),pageInput=$('page'),total=$('total'),prev=$('prev'),next=$('next'),zoomOut=$('zoomOut'),zoomIn=$('zoomIn'),zoomLabel=$('zoom'),fit=$('fit'),viewer=$('viewer'),stage=$('stage'),loading=$('loading'),loadingText=$('loadingText'),mPrev=$('mPrev'),mNext=$('mNext'),mPageInfo=$('mPageInfo'),pageJump=$('pageJump'),pageJumpForm=$('pageJumpForm'),pageJumpInput=$('pageJumpInput'),pageJumpTotal=$('pageJumpTotal'),pageJumpClose=$('pageJumpClose'),searchToggle=$('searchToggle'),searchPanel=$('searchPanel'),searchInput=$('searchInput'),searchPrev=$('searchPrev'),searchNext=$('searchNext'),searchStatus=$('searchStatus'),searchClose=$('searchClose'),highlightLayer=$('highlightLayer'),annotationLayer=$('annotationLayer'),outlineToggle=$('outlineToggle'),outlinePanel=$('outlinePanel'),outlineTree=$('outlineTree'),outlineClose=$('outlineClose'),outlineBackdrop=$('outlineBackdrop'),toneSwitch=$('toneSwitch'),textLayer=$('textLayer'),expandViewer=$('expandViewer');
const toneButtons=[...toneSwitch.querySelectorAll('[data-tone]')];
const canvasWrap=canvas.parentElement;
const toolsToggle=$('toolsToggle'),toolsClose=$('toolsClose'),toolsBackdrop=$('toolsBackdrop'),readerControls=$('readerControls');
const readerControlsHome=readerControls.parentNode;
const readerControlsMarker=document.createComment('reader-controls-home');
readerControlsHome.insertBefore(readerControlsMarker,readerControls);
function syncReaderControlsPortal(){
  if(compactQuery.matches){
    if(readerControls.parentNode!==document.body)document.body.appendChild(readerControls);
  }else if(readerControls.parentNode!==readerControlsHome){
    readerControlsHome.insertBefore(readerControls,readerControlsMarker.nextSibling);
  }
}
syncReaderControlsPortal();
compactQuery.addEventListener('change',syncReaderControlsPortal);
function closeTools(restoreFocus=false){
  document.body.classList.remove('tools-open');toolsToggle.setAttribute('aria-expanded','false');
  if(restoreFocus&&compactQuery.matches)toolsToggle.focus();
}
toolsToggle.onclick=()=>{
  lockReaderChrome(650);
  setReaderChromeHidden(false);
  if(document.body.classList.contains('tools-open')){closeTools();return}
  closeOutline();closeSearch();closePageJump();
  document.body.classList.add('tools-open');toolsToggle.setAttribute('aria-expanded','true');try{toolsClose.focus({preventScroll:true})}catch{toolsClose.focus()}
};
toolsClose.onclick=()=>closeTools(true);toolsBackdrop.onclick=()=>closeTools(true);

function isLiteraturePdf(path){
  if(!path)return false;
  return path.split('/').some(part=>/литерат/i.test(part));
}
const toneEligible=subject==='КМ'||subject==='ДЛ'||isLiteraturePdf(raw)||(raw||'').split('/')[0]==='ДЛ';
toneSwitch.hidden=!toneEligible;

function toneStorageKey(){return 'nsu-pdf-tone-v2:'+(raw||'default')}
function rememberedTone(){
  if(!toneEligible)return 'orig';
  try{
    const value=localStorage.getItem(toneStorageKey());
    return PDF_TONES.includes(value)?value:'mine';
  }catch{return 'mine'}
}
let currentTone='orig';
function applyPdfTone(mode,save=true){
  if(!toneEligible)mode='orig';
  if(!PDF_TONES.includes(mode))mode=toneEligible?'mine':'orig';
  const changed=mode!==currentTone;
  currentTone=mode;
  document.body.classList.remove('pdf-tone-black','pdf-tone-mine');
  if(mode==='black')document.body.classList.add('pdf-tone-black');
  else if(mode==='mine')document.body.classList.add('pdf-tone-mine');
  toneButtons.forEach(btn=>{
    const active=btn.dataset.tone===mode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
  if(save&&toneEligible){try{localStorage.setItem(toneStorageKey(),mode)}catch{}}
  if(changed&&pdf){
    if(continuousMode)invalidateContinuousPages();
    else void renderPage({keepScroll:true});
  }
}

const CSS_UNITS=96/72;
const notes=new ReaderNotes(viewer,document.getElementById('notesToggle'));
const textTasks=new WeakMap();
let pdf=null,pageNum=1,scale=1,renderTask=null,fitWidth=false,pdfUrl='',renderSerial=0,preloadSerial=0,continuousMode=false,continuousRoot=null,continuousRenderSerial=0,gestureActive=false;
let readerSuspended=document.hidden,suspendedReaderAnchor=null,resumeAnchorToken=0;
let lastStablePage=1,lastStableAnchor=null,lastSavedAt=0;
let searchQuery='',searchPage=0,searchOccurrence=-1,searchBusy=false,searchToken=0,searchSource='auto';
let outlineLoaded=false,outlineEntries=[];
const pageCache=new Map(),warmedPages=new Set(),textCache=new Map(),annotationCache=new Map();
let indexedSearchPromise=null,indexedSearchPages=null,indexedSearchAvailable=false;
applyPdfTone(rememberedTone(),false);
toneButtons.forEach(btn=>btn.addEventListener('click',()=>applyPdfTone(btn.dataset.tone)));
const showLoading=(text='Загрузка страницы…')=>{loadingText.textContent=text;loading.classList.add('show')};
const hideLoading=()=>loading.classList.remove('show');
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');
function notifyParentPdfReady(){
  if(window.parent===window)return;
  try{window.parent.postMessage({type:'nsu-pdf-ready'},location.origin)}catch{}
}

function fail(message){
  hideLoading();canvasWrap.hidden=true;
  let error=stage.querySelector('.error');
  if(!error){error=document.createElement('div');error.className='error';error.setAttribute('role','alert');stage.appendChild(error)}
  error.textContent='Не удалось открыть PDF. '+message+' Можно повторить переход к странице или открыть файл кнопкой «Файл ↗».';
  notifyParentPdfReady();
}
function validPage(value,fallback=1){
  const n=Number(value);
  return Math.max(1,Math.min(pdf?.numPages||1,Number.isFinite(n)?Math.trunc(n):fallback));
}
function storageKeys(){
  const keys=[raw,sourceFileParam].filter(Boolean).map(path=>'nsu-pdf-page:'+path);
  return [...new Set(keys.length?keys:['nsu-pdf-page:'+pdfUrl])];
}
function timestampKeys(){
  return storageKeys().map(key=>key.replace('nsu-pdf-page:','nsu-pdf-page-ts:'));
}
function savePage(value=pageNum,{touchTimestamp=true}={}){
  const fallback=Number.isInteger(lastStablePage)&&lastStablePage>0?lastStablePage:1;
  const page=validPage(value,fallback);
  pageNum=page;
  lastStablePage=page;
  if(touchTimestamp)lastSavedAt=Date.now();
  try{
    for(const key of storageKeys())localStorage.setItem(key,String(page));
    if(touchTimestamp)for(const key of timestampKeys())localStorage.setItem(key,String(lastSavedAt));
  }catch{}
  return page;
}
function rememberedPage(){
  try{
    for(const key of storageKeys()){
      const page=Number(localStorage.getItem(key));
      if(Number.isInteger(page)&&page>0)return page;
    }
  }catch{}
  return 1;
}
function persistReaderPosition(notifyParent=true){
  if(pdf){
    if(!readerSuspended&&!document.hidden)captureReaderPosition({measure:true});
    else savePage(lastStablePage,{touchTimestamp:false});
  }
  const page=pdf?lastStablePage:Math.max(1,Number(lastStablePage)||1);
  const position={
    type:'nsu-pdf-position',
    file:sourceFileParam||raw||'',
    canonicalFile:raw||sourceFileParam||'',
    page,
    savedAt:lastSavedAt||Date.now()
  };
  if(notifyParent&&window.parent!==window){
    try{window.parent.postMessage(position,location.origin)}catch{}
  }
  return position;
}
window.nsuPersistReaderPosition=()=>persistReaderPosition(false);
window.nsuFlushAnnotations=async()=>{notes.cancelGesture();await notes.flush();return !notes.pending.length;};
function updateOutlineActive(){if(!outlineEntries.length)return;let best=null;for(const e of outlineEntries){if(!e.page)continue;e.button.classList.remove('active');if(e.page<=pageNum&&(!best||e.page>best.page))best=e}if(best)best.button.classList.add('active')}
function updateControls(){
  pageInput.value=pageNum;total.textContent=`/ ${pdf?pdf.numPages:'—'}`;zoomLabel.value=String(Math.round(scale*100));
  const atStart=pageNum<=1,atEnd=!pdf||pageNum>=pdf.numPages;
  prev.disabled=atStart;next.disabled=atEnd;mPrev.disabled=atStart;mNext.disabled=atEnd;mPageInfo.textContent=`${pageNum} / ${pdf?pdf.numPages:'—'}`;pageJumpInput.value=pageNum;pageJumpInput.max=pdf?String(pdf.numPages):'1';pageJumpTotal.textContent=`/ ${pdf?pdf.numPages:'—'}`;updateOutlineActive();
}
function syncKeyboardOffset(){
  const vv=window.visualViewport;
  if(!vv){pageJump.style.setProperty('--keyboard-offset','0px');return}
  const layoutHeight=Math.max(document.documentElement.clientHeight||0,window.innerHeight||0);
  const covered=Math.max(0,layoutHeight-vv.height-vv.offsetTop);
  pageJump.style.setProperty('--keyboard-offset',covered+'px');
}
function openPageJump(){if(!pdf)return;closeTools();pageJumpInput.value=String(pageNum);pageJumpInput.max=String(pdf.numPages);pageJumpTotal.textContent=`/ ${pdf.numPages}`;syncKeyboardOffset();pageJump.classList.add('open');pageJump.setAttribute('aria-hidden','false');mPageInfo.setAttribute('aria-expanded','true');requestAnimationFrame(()=>{pageJumpInput.focus();pageJumpInput.select();syncKeyboardOffset()})}
function closePageJump(){pageJump.classList.remove('open');pageJump.setAttribute('aria-hidden','true');mPageInfo.setAttribute('aria-expanded','false');pageJump.style.setProperty('--keyboard-offset','0px')}
function jumpToPage(){if(!pdf)return;pageNum=validPage(pageJumpInput.value,pageNum);savePage();closePageJump();void renderPage()}

function closeOutline(){outlinePanel.classList.remove('open');document.body.classList.remove('outline-open');outlineToggle.setAttribute('aria-expanded','false')}
async function openOutline(){if(!pdf)return;setReaderChromeHidden(false);closeTools();closeSearch();outlinePanel.classList.add('open');document.body.classList.add('outline-open');outlineToggle.setAttribute('aria-expanded','true');if(!outlineLoaded)await loadOutline()}
function openSearch(){setReaderChromeHidden(false);closeTools();closeOutline();searchPanel.classList.add('open');document.body.classList.add('search-open');searchToggle.setAttribute('aria-expanded','true');void loadIndexedSearchPages();setTimeout(()=>searchInput.focus(),0)}
function closeSearch(){searchToken++;searchBusy=false;searchPanel.classList.remove('open');document.body.classList.remove('search-open');searchToggle.setAttribute('aria-expanded','false');searchStatus.textContent='Enter — найти';clearHighlights()}
function resetSearch(){searchToken++;searchBusy=false;searchQuery='';searchPage=pageNum;searchOccurrence=-1;searchSource='auto';searchStatus.textContent=searchInput.value.trim()?'Enter — найти':'Введите текст';clearHighlights()}
function runExternalFind(query){
  const value=String(query||'').trim();
  closeSearch();
  searchInput.value=value;
  resetSearch();
  searchInput.blur();
  if(value)void searchStep(1);
}
function clearHighlights(layer=null){
  if(layer){layer.replaceChildren();return}
  highlightLayer.replaceChildren();
  continuousRoot?.querySelectorAll('.highlight-layer').forEach(node=>node.replaceChildren());
}
function clearAnnotations(){annotationLayer.replaceChildren()}
function clearTextLayer(layer=textLayer){if(layer){textTasks.get(layer)?.cancel();textTasks.delete(layer);layer.replaceChildren()}}

function resolvePdfUrl(path,lfs=params.get('lfs')==='1'){
  const url=lfs
    ?new URL(`https://media.githubusercontent.com/media/${OWNER}/${REPO}/${BRANCH}/${encPath(path)}`)
    :new URL('../../'+encPath(path.replace(/^\/+/,'')),location.href);
  if(versionParam)url.searchParams.set('v',versionParam);
  return url.href;
}
async function loadPdfDocument(url){
  const options={disableRange:false,disableStream:true,disableAutoFetch:true,rangeChunkSize:262144,
    cMapUrl:PDFJS_BASE+'cmaps/',cMapPacked:true,
    standardFontDataUrl:PDFJS_BASE+'standard_fonts/'};
  const task=pdfjsLib.getDocument({url,...options});
  task.onProgress=p=>{if(p.total&&p.loaded)loadingText.textContent=`Загрузка: ${Math.min(100,Math.round(p.loaded/p.total*100))}%`};
  try{return await task.promise}
  catch(error){
    // Legacy links may not contain the LFS hint. Inspect only small failed
    // responses, so ordinary PDFs never pay for a preliminary HEAD request.
    if(error?.name!=='InvalidPDFException'||params.get('lfs')==='1')throw error;
    let pointer=false;
    try{
      const response=await fetch(url,{cache:'force-cache'});
      const length=Number(response.headers.get('content-length'));
      if(response.ok&&length>0&&length<2048)pointer=(await response.text()).startsWith('version https://git-lfs.github.com/spec/v1');
      else await response.body?.cancel();
    }catch{}
    if(!pointer)throw error;
    await task.destroy();
    pdfUrl=resolvePdfUrl(raw,true);direct.href=pdfUrl;
    return pdfjsLib.getDocument({url:pdfUrl,...options}).promise;
  }
}

async function getCachedPage(n){if(pageCache.has(n))return pageCache.get(n);const page=await pdf.getPage(n);pageCache.set(n,page);return page}
function trimPageCache(center){for(const [n,page] of pageCache){if(Math.abs(n-center)>1){try{page.cleanup()}catch{}pageCache.delete(n);warmedPages.delete(n)}}}
async function preloadAround(center){
  if(!pdf)return;const serial=++preloadSerial;const targets=[center-1,center+1].filter(n=>n>=1&&n<=pdf.numPages);
  await Promise.allSettled(targets.map(async n=>{if(warmedPages.has(n))return;const page=await getCachedPage(n);if(serial!==preloadSerial&&Math.abs(n-pageNum)>1){try{page.cleanup()}catch{}pageCache.delete(n);warmedPages.delete(n);return}await page.getOperatorList();if(Math.abs(n-pageNum)<=1)warmedPages.add(n);else{try{page.cleanup()}catch{}pageCache.delete(n);warmedPages.delete(n)}}));
  if(serial===preloadSerial)trimPageCache(center);
}

async function loadIndexedSearchPages(){
  if(indexedSearchPages)return indexedSearchPages;
  if(indexedSearchPromise)return indexedSearchPromise;

  indexedSearchPromise=(async()=>{
    try{
      const manifestUrl=new URL('../search-index/manifest.json',location.href);
      const manifest=await fetch(manifestUrl,{cache:'no-cache'}).then(r=>{
        if(!r.ok)throw new Error('search manifest '+r.status);
        return r.json();
      });

      const rawSubject=(raw||'').startsWith('База/КМ/')?'КМ':(raw||'').split('/')[0]||'';
      const wantedSubject=subject||rawSubject;
      let shards=(manifest.shards||[]).slice();
      const preferred=shards.filter(x=>x.subject===wantedSubject);
      if(preferred.length)shards=preferred;

      for(const shard of shards){
        const shardUrl=new URL('../search-index/'+shard.file,location.href);
        const indexVersion=shard.version||manifest.generated_at||manifest.version||'';
        if(indexVersion)shardUrl.searchParams.set('v',indexVersion);
        const data=await fetch(shardUrl,{cache:'force-cache'}).then(r=>{
          if(!r.ok)throw new Error('search shard '+r.status);
          return r.json();
        });
        const record=(data.records||[]).find(r=>r.path===raw);
        if(!record)continue;

        const pages=new Map();
        for(const p of record.pages||[]){
          const n=Number(p.n);
          if(!Number.isFinite(n)||n<1)continue;
          pages.set(n,normalizeText(p.t||''));
        }
        indexedSearchPages=pages;
        indexedSearchAvailable=pages.size>0;
        return pages;
      }
    }catch(err){
      console.warn('Indexed PDF search unavailable, falling back to PDF text layer.',err);
      indexedSearchAvailable=false;
      return new Map();
    }

    indexedSearchPages=new Map();
    indexedSearchAvailable=false;
    return indexedSearchPages;
  })();

  try{return await indexedSearchPromise}finally{indexedSearchPromise=null}
}

async function getSearchTextForPage(n){
  const pages=await loadIndexedSearchPages();
  if(pages.has(n))return pages.get(n);
  const data=await getPageSearchData(n);
  return data.text;
}

async function getPageSearchData(n){
  if(textCache.has(n))return textCache.get(n);
  const cached=pageCache.get(n),page=cached||await pdf.getPage(n),content=await page.getTextContent(),items=content.items.filter(i=>i.str);
  const data={text:normalizeText(items.map(i=>i.str).join(' ')),items};textCache.set(n,data);
  if(!cached&&Math.abs(n-pageNum)>1){try{page.cleanup()}catch{}}
  return data;
}


async function drawSearchHighlights(page,viewport,layer=highlightLayer,targetPage=pageNum){
  clearHighlights(layer);
  if(!searchQuery||searchPage!==targetPage)return;
  try{
    const data=await getPageSearchData(targetPage);
    if(searchPage!==targetPage)return;
    layer.style.width=`${viewport.width}px`;layer.style.height=`${viewport.height}px`;
    for(const item of data.items){
      const ranges=itemHighlightRanges(item.str,searchQuery);
      if(!ranges.length)continue;
      const tx=pdfjsLib.Util.transform(viewport.transform,item.transform);
      const fontHeight=Math.max(2,Math.hypot(tx[2],tx[3]));
      const fullWidth=Math.max(3,(item.width||0)*viewport.scale);
      const angle=Math.atan2(tx[1],tx[0]);
      const cos=Math.cos(angle),sin=Math.sin(angle);
      for(const range of ranges){
        const offset=fullWidth*(range.start/Math.max(1,range.total));
        const width=Math.max(3,fullWidth*(range.length/Math.max(1,range.total)));
        const mark=document.createElement('div');
        mark.className='search-mark';
        mark.style.left=`${tx[4]+cos*offset}px`;
        mark.style.top=`${tx[5]-fontHeight+sin*offset}px`;
        mark.style.width=`${width}px`;
        mark.style.height=`${fontHeight}px`;
        mark.style.transformOrigin='0 0';
        if(Math.abs(angle)>.001)mark.style.transform=`rotate(${angle}rad)`;
        layer.appendChild(mark);
      }
    }
  }catch{}
}

async function renderSelectableText(page,viewport,layer=textLayer){
  if(!layer)return;
  clearTextLayer(layer);
  const pending={cancel(){}};textTasks.set(layer,pending);
  layer.style.setProperty('--scale-factor',viewport.scale);
  try{
    const content=await page.getTextContent();
    if(!layer.isConnected||textTasks.get(layer)!==pending)return;
    const task=new pdfjsLib.TextLayer({textContentSource:content,container:layer,viewport});
    textTasks.set(layer,task);await task.render();
  }catch(error){if(error?.name!=='AbortException')console.warn('PDF text layer:',error);}
}

async function getPageAnnotations(page){
  if(annotationCache.has(page.pageNumber))return annotationCache.get(page.pageNumber);
  const annotations=await page.getAnnotations({intent:'display'});annotationCache.set(page.pageNumber,annotations);return annotations;
}

async function destinationPage(dest){
  if(!pdf||!dest)return null;
  let explicit=dest;
  if(typeof explicit==='string')explicit=await pdf.getDestination(explicit);
  if(!Array.isArray(explicit)||!explicit.length)return null;
  const ref=explicit[0];
  if(Number.isInteger(ref))return Math.max(1,Math.min(pdf.numPages,ref+1));
  if(ref&&typeof ref==='object'){
    try{return (await pdf.getPageIndex(ref))+1}catch{return null}
  }
  return null;
}

async function followInternalLink(dest){const n=await destinationPage(dest);if(!n)return;pageNum=n;await renderPage()}
function followNamedAction(action){if(!pdf)return;if(action==='NextPage')return go(1);if(action==='PrevPage')return go(-1);if(action==='FirstPage'){pageNum=1;return renderPage()}if(action==='LastPage'){pageNum=pdf.numPages;return renderPage()}}

async function renderAnnotations(page,viewport,layer=annotationLayer){
  layer.replaceChildren();layer.style.width=`${viewport.width}px`;layer.style.height=`${viewport.height}px`;
  let annotations=[];try{annotations=await getPageAnnotations(page)}catch{return}
  if(layer===annotationLayer&&page.pageNumber!==pageNum)return;
  for(const a of annotations){
    if(a.subtype!=='Link'||!Array.isArray(a.rect))continue;
    const rect=viewport.convertToViewportRectangle(a.rect),left=Math.min(rect[0],rect[2]),top=Math.min(rect[1],rect[3]),width=Math.abs(rect[0]-rect[2]),height=Math.abs(rect[1]-rect[3]);
    if(width<1||height<1)continue;
    const link=document.createElement('a');link.className='pdf-link';link.style.left=`${left}px`;link.style.top=`${top}px`;link.style.width=`${width}px`;link.style.height=`${height}px`;link.setAttribute('aria-label','Перейти по ссылке');
    if(a.url){link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.title=a.url}
    else if(a.dest){link.href='#';link.title='Перейти к разделу';link.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void followInternalLink(a.dest)})}
    else if(a.action){link.href='#';link.title='Перейти';link.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();followNamedAction(a.action)})}
    else continue;layer.appendChild(link);
  }
}

function renderOutlineNodes(items,container,depth=0){
  for(const item of items||[]){
    const row=document.createElement('div');row.className='outline-row';const link=document.createElement(item.url?'a':'button');link.className=`outline-link depth-${Math.min(depth,3)}`;link.dataset.depth=String(depth);if(link.tagName==='BUTTON')link.type='button';
    const label=document.createElement('span');label.className='outline-label';label.textContent=item.title||'Без названия';const page=document.createElement('span');page.className='outline-page';row.appendChild(link);link.append(label,page);container.appendChild(row);
    const entry={button:link,page:null};outlineEntries.push(entry);
    if(item.url){link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';page.textContent='↗'}
    else if(item.dest){link.addEventListener('click',async()=>{const n=entry.page||await destinationPage(item.dest);if(!n)return;pageNum=n;await renderPage();if(embedParam||compactQuery.matches)closeOutline()});void destinationPage(item.dest).then(n=>{if(n){entry.page=n;page.textContent=String(n);updateOutlineActive()}})}
    else if(item.action){link.addEventListener('click',()=>{followNamedAction(item.action);if(embedParam||compactQuery.matches)closeOutline()})}
    if(item.items?.length)renderOutlineNodes(item.items,container,depth+1);
  }
}
async function loadOutline(){outlineLoaded=true;outlineEntries=[];outlineTree.innerHTML='<div class="outline-empty">Загружаю структуру документа…</div>';try{const items=await pdf.getOutline();outlineTree.replaceChildren();if(!items?.length){outlineTree.innerHTML='<div class="outline-empty">В этом PDF нет встроенных закладок. Кликабельные ссылки внутри самого PDF при этом продолжают работать.</div>';return}renderOutlineNodes(items,outlineTree,0);updateOutlineActive()}catch{outlineTree.innerHTML='<div class="outline-empty">Не удалось прочитать встроенное оглавление.</div>'}}

async function scanSearchSource(direction,q,token,source){
  let n=searchPage||pageNum,first=true;
  for(let checked=0;checked<pdf.numPages;checked++){
    let text='';
    if(source==='index'){
      const pages=await loadIndexedSearchPages();
      text=pages.get(n)||'';
    }else{
      text=(await getPageSearchData(n)).text;
    }
    if(token!==searchToken)return null;

    const matches=findMatches(text,q);
    let occ=-1;
    if(first&&n===searchPage){
      if(direction>0){
        const candidate=searchOccurrence+1;
        if(candidate<matches.length)occ=candidate;
      }else{
        const candidate=Number.isFinite(searchOccurrence)?searchOccurrence-1:matches.length-1;
        if(candidate>=0&&candidate<matches.length)occ=candidate;
      }
    }else if(matches.length){
      occ=direction>0?0:matches.length-1;
    }

    if(occ>=0)return{page:n,occ,count:matches.length,source};

    n+=direction;
    if(n<1)n=pdf.numPages;
    if(n>pdf.numPages)n=1;
    first=false;
  }
  return null;
}

async function searchStep(direction){
  if(!pdf||searchBusy)return;
  const q=normalizeText(searchInput.value);
  if(!q){searchStatus.textContent='Введите текст';searchInput.focus();return}

  if(q!==searchQuery){
    searchQuery=q;
    searchPage=pageNum;
    searchOccurrence=direction>0?-1:Number.POSITIVE_INFINITY;
    searchSource='auto';
  }

  searchBusy=true;
  const token=++searchToken;
  searchStatus.textContent='Ищу…';

  try{
    await loadIndexedSearchPages();
    if(token!==searchToken)return;

    let sources;
    if(searchSource==='index'||searchSource==='pdf')sources=[searchSource];
    else sources=indexedSearchAvailable?['index','pdf']:['pdf'];

    let found=null;
    for(const source of sources){
      found=await scanSearchSource(direction,q,token,source);
      if(token!==searchToken)return;
      if(found)break;

      // If the generated index has no occurrence, restore the old PDF.js
      // text search instead of incorrectly reporting "not found".
      if(searchSource!=='auto')break;
      searchOccurrence=direction>0?-1:Number.POSITIVE_INFINITY;
    }

    if(found){
      searchSource=found.source;
      searchPage=found.page;
      searchOccurrence=found.occ;
      pageNum=found.page;
      await renderPage();
      if(token!==searchToken)return;
      searchStatus.textContent=`${found.occ+1}/${found.count} на стр. ${found.page} · ${found.source==='index'?'индекс':'PDF'}`;
      searchBusy=false;
      return;
    }

    if(token===searchToken){
      searchStatus.textContent='Не найдено';
      clearHighlights();
    }
  }catch(err){
    console.warn('PDF search error',err);
    if(token===searchToken)searchStatus.textContent='Ошибка поиска';
  }finally{
    if(token===searchToken)searchBusy=false;
  }
}

function fittedScale(base){
  const padding=getComputedStyle(stage);
  const available=Math.max(120,viewer.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight));
  return Math.min(2.4,available/(base.width*CSS_UNITS));
}
// Per-canvas pixel budget. Mobile browsers share a few hundred MB of canvas
// memory per tab (iOS also rejects canvases above 16.7 MP); exceeding it kills
// the tab or the Android WebView renderer, which reopens the start page.
const MOBILE_CANVAS_PIXELS=6000000,DESKTOP_CANVAS_PIXELS=16000000;
function canvasRenderRatio(viewport){
  const dpr=Math.max(1,window.devicePixelRatio||1);
  // HiDPI screens are sharp at native resolution; low-DPI screens get mild supersampling.
  let ratio=dpr<2?Math.min(2,dpr*1.5):dpr;
  const cssPixels=Math.max(1,viewport.width*viewport.height);
  const maxPixels=phoneStripQuery.matches?MOBILE_CANVAS_PIXELS:DESKTOP_CANVAS_PIXELS;
  if(cssPixels*ratio*ratio>maxPixels)ratio=Math.sqrt(maxPixels/cssPixels);
  return ratio;
}
function releaseCanvas(target){
  // Safari keeps a detached canvas' backing store until GC; shrinking frees it now.
  if(target){target.width=0;target.height=0}
}

async function renderPage(options={}){
  if(!pdf)return;
  notes.cancelGesture();void notes.flush();
  if(continuousMode){
    if(continuousRoot)scrollToContinuousPage(pageNum);
    else await renderContinuous(pageNum);
    return;
  }
  pageNum=validPage(pageNum);
  const target=pageNum,serial=++renderSerial;
  stage.querySelector('.error')?.remove();canvasWrap.hidden=false;
  showLoading();clearAnnotations();clearTextLayer();clearHighlights();canvasWrap.classList.add('rendering');
  if(renderTask){try{renderTask.cancel()}catch{}}
  try{
    const page=await getCachedPage(target);
    if(serial!==renderSerial)return;
    const base=page.getViewport({scale:1});
    if(fitWidth)scale=fittedScale(base);
    const viewport=page.getViewport({scale:scale*CSS_UNITS});
    const ratio=canvasRenderRatio(viewport);
    const width=Math.max(1,Math.floor(viewport.width*ratio)),height=Math.max(1,Math.floor(viewport.height*ratio));
    const buffer=document.createElement('canvas');
    buffer.width=width;buffer.height=height;
    const bufferCtx=buffer.getContext('2d',{alpha:false});
    renderTask=page.render({canvasContext:bufferCtx,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'#fff'});
    try{await renderTask.promise}catch(error){releaseCanvas(buffer);throw error}
    if(serial!==renderSerial){releaseCanvas(buffer);return}
    renderTask=null;
    applyToneToCanvas(buffer,currentTone);
    canvas.width=width;canvas.height=height;
    canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(buffer,0,0);releaseCanvas(buffer);
    highlightLayer.style.width=textLayer.style.width=annotationLayer.style.width=`${viewport.width}px`;
    highlightLayer.style.height=textLayer.style.height=annotationLayer.style.height=`${viewport.height}px`;
    canvasWrap.classList.remove('rendering');warmedPages.add(target);updateControls();savePage();hideLoading();
    if(options.keepScroll){
      // Re-rendering in place (tone switch): keep the reader where they were.
    }else if(options.anchor){
      const r=canvasWrap.getBoundingClientRect(),a=options.anchor;
      viewer.scrollBy({left:r.left+a.x*r.width-a.clientX,top:r.top+a.y*r.height-a.clientY,behavior:'auto'});
    }else{
      viewer.scrollTo({top:0,left:Math.max(0,(canvas.clientWidth-viewer.clientWidth)/2)});
    }
    trimPageCache(target);
    notes.mount(canvasWrap,viewport,target);
    await Promise.allSettled([drawSearchHighlights(page,viewport),renderSelectableText(page,viewport),renderAnnotations(page,viewport)]);
    void preloadAround(target);
  }catch(err){
    if(serial===renderSerial){renderTask=null;canvasWrap.classList.remove('rendering');hideLoading()}
    if(err?.name!=='RenderingCancelledException'&&serial===renderSerial)fail(err?.message||String(err));
  }
}

// Continuous strip. Only pages near the viewport own a canvas: a scroll-driven
// sweep (binary search over page offsets, not a layout read per page) queues the
// nearest pages first, cancels renders that were scrolled past and unloads distant
// pages, so memory stays bounded however far or fast the reader scrolls or zooms.
const continuousTasks=new Map(),continuousWanted=new Set(),renderedContinuousPages=new Set();
const continuousViewports=new WeakMap(),continuousPixels=new WeakMap();
let continuousPumping=false,continuousSweepFrame=0;
function continuousPageEl(n){return continuousRoot?.children[n-1]||null}
function continuousPrefetchMargin(){return viewer.clientHeight*(phoneStripQuery.matches?.75:1.5)}
function continuousKeepMargin(){return viewer.clientHeight*(phoneStripQuery.matches?1.5:3)}
function continuousPixelBudget(){return phoneStripQuery.matches?MOBILE_CANVAS_PIXELS*4:DESKTOP_CANVAS_PIXELS*4}
// Pages are positioned in the viewer's content box, so offsetTop compares directly with scrollTop.
function continuousPageAt(y){
  const pages=continuousRoot.children;
  let lo=0,hi=pages.length-1;
  while(lo<hi){const mid=(lo+hi)>>1,el=pages[mid];if(el.offsetTop+el.offsetHeight<y)lo=mid+1;else hi=mid}
  return lo;
}
function continuousPageRange(margin){
  const pages=continuousRoot?.children;
  if(!pages?.length)return[0,-1];
  const bottom=viewer.scrollTop+viewer.clientHeight+margin;
  const first=continuousPageAt(viewer.scrollTop-margin);
  let last=first;
  while(last+1<pages.length&&pages[last+1].offsetTop<=bottom)last++;
  return[first,last];
}
function continuousPageDistance(el){
  const top=el.offsetTop,bottom=top+el.offsetHeight,viewTop=viewer.scrollTop,viewBottom=viewTop+viewer.clientHeight;
  return bottom<viewTop?viewTop-bottom:top>viewBottom?top-viewBottom:0;
}
function scheduleContinuousSweep(){
  if(!continuousSweepFrame)continuousSweepFrame=requestAnimationFrame(()=>{continuousSweepFrame=0;sweepContinuous()});
}
function sweepContinuous(){
  if(!continuousMode||!continuousRoot||readerSuspended||document.hidden||gestureActive||viewer.clientHeight<2)return;
  const pages=continuousRoot.children;
  const [first,last]=continuousPageRange(continuousPrefetchMargin());
  for(let i=first;i<=last;i++){
    const el=pages[i];
    // A failed page waits for its retry button instead of failing again on every frame.
    if(el.dataset.failed!=='1'&&(el.dataset.rendered!=='1'||el.dataset.stale==='1'))queueContinuousPage(el,i+1);
  }
  const [keepFirst,keepLast]=continuousPageRange(continuousKeepMargin());
  const outside=(el,a,b)=>{const i=Number(el.dataset.page)-1;return i<a||i>b};
  for(const el of [...continuousTasks.keys()])if(outside(el,keepFirst,keepLast))cancelContinuousRender(el);
  for(const el of [...renderedContinuousPages])if(outside(el,keepFirst,keepLast))unloadContinuousPage(el);
  // Zoomed-out strips keep many pages in range: also cap the total raster size,
  // never touching pages that the prefetch range is about to need again.
  let total=0;
  for(const el of renderedContinuousPages)total+=continuousPixels.get(el)||0;
  const budget=continuousPixelBudget();
  if(total<=budget)return;
  const far=[...renderedContinuousPages].filter(el=>outside(el,first,last))
    .sort((a,b)=>continuousPageDistance(b)-continuousPageDistance(a));
  for(const el of far){
    if(total<=budget)break;
    total-=continuousPixels.get(el)||0;
    unloadContinuousPage(el);
  }
}
function cancelContinuousRender(el){
  const task=continuousTasks.get(el);
  if(!task)return;
  continuousTasks.delete(el);
  el.dataset.renderToken=String(++continuousRenderSerial);el.dataset.rendering='0';
  try{task.cancel()}catch{}
}
function unloadContinuousPage(el,force=false){
  const n=Number(el.dataset.page);
  if(!force&&notes.isInteracting(n))return;
  cancelContinuousRender(el);
  clearTextLayer(el.querySelector(':scope > .text-layer'));
  clearPageDetail(el);
  releaseCanvas(el.querySelector(':scope > canvas:not(.page-detail)'));
  el.replaceChildren();el.dataset.rendered='0';el.dataset.stale='0';el.dataset.failed='0';
  renderedContinuousPages.delete(el);continuousViewports.delete(el);continuousPixels.delete(el);
  try{pageCache.get(n)?.cleanup()}catch{}
  pageCache.delete(n);warmedPages.delete(n);annotationCache.delete(n);
}
function invalidateContinuousPages(){
  if(!continuousRoot)return;
  for(const el of [...continuousTasks.keys()])cancelContinuousRender(el);
  for(const el of renderedContinuousPages)el.dataset.stale='1';
  scheduleContinuousSweep();
}
function destroyContinuous(){
  for(const el of [...continuousTasks.keys()])cancelContinuousRender(el);
  for(const el of [...renderedContinuousPages])unloadContinuousPage(el,true);
  continuousWanted.clear();
  continuousRoot?.remove();continuousRoot=null;
  document.body.classList.remove('continuous-mode');
}
async function renderContinuousPage(el,n,force=false){
  if(!pdf||!el?.isConnected)return;
  if(notes.isInteracting(n)){el.dataset.stale='1';return;}
  if(continuousTasks.has(el))return;
  if(!force&&el.dataset.rendered==='1'&&el.dataset.stale!=='1')return;
  const token=String(++continuousRenderSerial);
  el.dataset.renderToken=token;el.dataset.rendering='1';
  const pending={cancel(){}};
  continuousTasks.set(el,pending);
  let cnv=null;
  try{
    const page=await getCachedPage(n);
    if(el.dataset.renderToken!==token)return;
    const base=page.getViewport({scale:1});
    let useScale=scale;
    if(fitWidth)useScale=fittedScale(base);
    const viewport=page.getViewport({scale:useScale*CSS_UNITS});
    const ratio=canvasRenderRatio(viewport);
    cnv=document.createElement('canvas');
    cnv.width=Math.max(1,Math.floor(viewport.width*ratio));cnv.height=Math.max(1,Math.floor(viewport.height*ratio));
    cnv.style.width=viewport.width+'px';cnv.style.height=viewport.height+'px';
    const ctx2=cnv.getContext('2d',{alpha:false});
    const task=page.render({canvasContext:ctx2,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'#fff'});
    continuousTasks.set(el,task);
    await task.promise;
    if(!continuousMode||!el.isConnected||el.dataset.renderToken!==token)return;
    if(notes.isInteracting(n)){el.dataset.stale='1';return;}
    applyToneToCanvas(cnv,currentTone);
    const hl=document.createElement('div');hl.className='highlight-layer';
    const tl=document.createElement('div');tl.className='text-layer';
    const al=document.createElement('div');al.className='annotation-layer';
    const previous=el.querySelector(':scope > canvas:not(.page-detail)');
    clearPageDetail(el);
    clearTextLayer(el.querySelector(':scope > .text-layer'));
    el.style.width=viewport.width+'px';el.style.height=viewport.height+'px';
    el.replaceChildren(cnv,hl,tl,al);releaseCanvas(previous);notes.mount(el,viewport,n);
    continuousViewports.set(el,viewport);continuousPixels.set(el,cnv.width*cnv.height);
    renderedContinuousPages.add(el);cnv=null;
    el.dataset.rendered='1';el.dataset.stale='0';el.dataset.failed='0';
    schedulePageDetail();
    await Promise.allSettled([
      drawSearchHighlights(page,viewport,hl,n),
      renderSelectableText(page,viewport,tl),renderAnnotations(page,viewport,al)
    ]);
  }catch(error){
    if(el?.isConnected&&el.dataset.renderToken===token){
      el.dataset.rendered='0';
      if(error?.name!=='RenderingCancelledException')showContinuousRetry(el,n);
    }
  }finally{
    releaseCanvas(cnv);
    if(el?.isConnected&&el.dataset.renderToken===token){continuousTasks.delete(el);el.dataset.rendering='0'}
  }
}
function showContinuousRetry(el,n){
  el.dataset.failed='1';
  if(el.querySelector(':scope > .page-retry'))return;
  const retry=document.createElement('button');
  retry.type='button';retry.className='page-retry';
  retry.textContent=`Страница ${n} не отрисовалась · Повторить`;
  retry.onclick=event=>{
    event.stopPropagation();
    retry.remove();el.dataset.failed='0';
    queueContinuousPage(el,n,true);
  };
  el.appendChild(retry);
}
function queueContinuousPage(el,n,force=false){
  if(!el?.isConnected)return;
  if(force)el.dataset.stale='1';
  continuousWanted.add(el);
  void pumpContinuous();
}
async function pumpContinuous(){
  if(continuousPumping)return;
  continuousPumping=true;
  try{
    while(continuousMode&&continuousWanted.size){
      let best=null,bestDistance=Infinity;
      for(const el of continuousWanted){
        if(!el.isConnected){continuousWanted.delete(el);continue}
        const distance=continuousPageDistance(el);
        if(distance<bestDistance){bestDistance=distance;best=el}
      }
      if(!best)break;
      continuousWanted.delete(best);
      // A page scrolled past while waiting is left to the next sweep.
      if(bestDistance>continuousPrefetchMargin())continue;
      await renderContinuousPage(best,Number(best.dataset.page),best.dataset.stale==='1');
    }
  }finally{continuousPumping=false}
}
// Zoomed pages are rastered below screen resolution to stay within the memory
// budget. Once scrolling settles, the visible part of each page is redrawn at full
// screen resolution on top (as PDF.js's own viewer does); it never exceeds about
// one screen of pixels and is dropped on scroll-away, zoom and unload.
const pageDetailTasks=new Map();
let pageDetailTimer=0,pageDetailSerial=0;
function screenRenderRatio(){
  const dpr=Math.max(1,window.devicePixelRatio||1);
  return dpr<2?Math.min(2,dpr*1.5):dpr;
}
function clearPageDetail(el){
  const task=pageDetailTasks.get(el);
  if(task){pageDetailTasks.delete(el);try{task.cancel()}catch{}}
  const detail=el.querySelector(':scope > .page-detail');
  if(detail){releaseCanvas(detail);detail.remove()}
}
function schedulePageDetail(){
  clearTimeout(pageDetailTimer);
  pageDetailTimer=setTimeout(()=>void renderVisibleDetail(),180);
}
async function renderVisibleDetail(){
  if(!continuousMode||!continuousRoot||gestureActive||readerSuspended||document.hidden)return;
  const serial=++pageDetailSerial,want=screenRenderRatio();
  const viewLeft=viewer.scrollLeft,viewTop=viewer.scrollTop;
  const viewRight=viewLeft+viewer.clientWidth,viewBottom=viewTop+viewer.clientHeight;
  for(const el of [...renderedContinuousPages]){
    const base=el.querySelector(':scope > canvas:not(.page-detail)'),viewport=continuousViewports.get(el);
    if(!base||!viewport||el.dataset.stale==='1'||base.width>=viewport.width*want*.95){clearPageDetail(el);continue}
    // Visible part of the page in its CSS pixels, with a margin for small scrolls.
    const marginX=viewer.clientWidth*.15,marginY=viewer.clientHeight*.15;
    const x0=Math.max(0,Math.floor(viewLeft-el.offsetLeft-marginX)),x1=Math.min(viewport.width,Math.ceil(viewRight-el.offsetLeft+marginX));
    const y0=Math.max(0,Math.floor(viewTop-el.offsetTop-marginY)),y1=Math.min(viewport.height,Math.ceil(viewBottom-el.offsetTop+marginY));
    if(x1<=x0||y1<=y0){clearPageDetail(el);continue}
    const current=el.querySelector(':scope > .page-detail');
    if(current&&current.dataset.viewTop<=viewTop-el.offsetTop&&current.dataset.viewBottom>=viewBottom-el.offsetTop&&
       current.dataset.viewLeft<=viewLeft-el.offsetLeft&&current.dataset.viewRight>=viewRight-el.offsetLeft)continue;
    const width=x1-x0,height=y1-y0;
    let ratio=want;
    const budget=phoneStripQuery.matches?MOBILE_CANVAS_PIXELS:DESKTOP_CANVAS_PIXELS;
    if(width*height*ratio*ratio>budget)ratio=Math.sqrt(budget/(width*height));
    const n=Number(el.dataset.page);
    const detail=document.createElement('canvas');detail.className='page-detail';
    detail.width=Math.max(1,Math.ceil(width*ratio));detail.height=Math.max(1,Math.ceil(height*ratio));
    detail.style.cssText=`left:${x0}px;top:${y0}px;width:${width}px;height:${height}px`;
    try{
      const page=await getCachedPage(n);
      if(serial!==pageDetailSerial||continuousViewports.get(el)!==viewport){releaseCanvas(detail);return}
      pageDetailTasks.get(el)?.cancel();
      const task=page.render({canvasContext:detail.getContext('2d',{alpha:false}),viewport,
        transform:[ratio,0,0,ratio,-x0*ratio,-y0*ratio],background:'#fff'});
      pageDetailTasks.set(el,task);
      await task.promise;
      if(pageDetailTasks.get(el)===task)pageDetailTasks.delete(el);
      if(serial!==pageDetailSerial||!el.isConnected||continuousViewports.get(el)!==viewport){releaseCanvas(detail);return}
      applyToneToCanvas(detail,currentTone);
      Object.assign(detail.dataset,{viewLeft:x0,viewTop:y0,viewRight:x1,viewBottom:y1});
      const old=el.querySelector(':scope > .page-detail');
      base.after(detail);
      if(old){releaseCanvas(old);old.remove()}
    }catch{releaseCanvas(detail)}
  }
}
function refreshContinuousHighlights(){
  for(const el of renderedContinuousPages){
    const layer=el.querySelector(':scope > .highlight-layer'),viewport=continuousViewports.get(el),n=Number(el.dataset.page);
    if(!layer||!viewport)continue;
    if(searchQuery&&searchPage===n)void getCachedPage(n).then(page=>drawSearchHighlights(page,viewport,layer,n));
    else clearHighlights(layer);
  }
}
// scrollIntoView would also scroll the parent site around an embedded preview.
function scrollViewerToPage(el){
  if(el)viewer.scrollTop=el.offsetTop-(parseFloat(getComputedStyle(viewer).scrollPaddingTop)||0);
}
function scrollToContinuousPage(n){
  const el=continuousPageEl(n);
  if(!el)return;
  pageNum=validPage(n);
  scrollViewerToPage(el);
  lastStableAnchor={page:pageNum,fraction:0};
  savePage(pageNum);updateControls();
  refreshContinuousHighlights();
  scheduleContinuousSweep();
}
viewer.addEventListener('notesgestureend',scheduleContinuousSweep);
function updateContinuousCurrentPage(){
  if(readerSuspended||document.hidden||!continuousMode||!continuousRoot)return;
  const vr=viewer.getBoundingClientRect();
  if(vr.width<2||vr.height<2)return;
  const clientY=continuousReadingClientY(vr);
  const anchor=continuousAnchorFromClient(clientY);
  if(!anchor)return;
  lastStableAnchor={page:anchor.page,fraction:anchor.fraction};
  const next=validPage(anchor.page,pageNum);
  if(next!==pageNum){
    pageNum=next;
    savePage(next);
    updateControls();
  }else{
    lastStablePage=next;
  }
}
function continuousReadingTop(rect){
  // On phones the toolbar overlays the viewer; scroll-padding marks where pages really start.
  return rect.top+viewer.clientTop+(parseFloat(getComputedStyle(viewer).scrollPaddingTop)||0);
}
function continuousReadingClientY(rect){
  const inset=Math.min(28,Math.max(8,rect.height*.08));
  // At the end of a fitted document the final page may be too short to reach
  // the top edge. Keep its page number instead of reverting to the preceding one.
  return viewer.scrollTop>1&&viewer.scrollHeight-viewer.clientHeight-viewer.scrollTop<2
    ?rect.bottom-inset:continuousReadingTop(rect)+inset;
}
function continuousAnchorFromClient(clientY){
  const pages=continuousRoot?.children;
  if(!pages?.length)return null;
  const y=clientY-viewer.getBoundingClientRect().top-viewer.clientTop+viewer.scrollTop;
  let i=continuousPageAt(y);
  // Between pages: take whichever edge is closer.
  if(i>0&&y<pages[i].offsetTop){
    const above=pages[i-1];
    if(y-(above.offsetTop+above.offsetHeight)<pages[i].offsetTop-y)i--;
  }
  const el=pages[i],height=el.offsetHeight;
  return{
    page:Number(el.dataset.page)||pageNum,
    fraction:height>0?Math.max(0,Math.min(1,(y-el.offsetTop)/height)):0,
    clientY
  };
}
function restoreContinuousAnchor(anchor){
  const el=continuousPageEl(anchor?.page);
  if(!el)return;
  const viewTop=viewer.getBoundingClientRect().top+viewer.clientTop;
  viewer.scrollTop=el.offsetTop+el.offsetHeight*anchor.fraction-(anchor.clientY-viewTop);
  updateContinuousCurrentPage();
}
function continuousCenterAnchor(){
  const r=viewer.getBoundingClientRect();
  return continuousAnchorFromClient(r.top+r.height/2);
}
function captureReaderPosition({measure=true}={}){
  if(!pdf)return lastStablePage;
  if(continuousMode&&continuousRoot){
    const r=viewer.getBoundingClientRect();
    const canMeasure=measure&&!readerSuspended&&!document.hidden&&r.width>=2&&r.height>=2;
    if(canMeasure){
      const clientY=continuousReadingClientY(r);
      const anchor=continuousAnchorFromClient(clientY);
      if(anchor){
        lastStableAnchor={page:anchor.page,fraction:anchor.fraction};
        suspendedReaderAnchor={...lastStableAnchor};
        pageNum=validPage(anchor.page,lastStablePage);
        updateControls();
        return savePage(pageNum);
      }
    }
    if(lastStableAnchor)suspendedReaderAnchor={...lastStableAnchor};
    pageNum=validPage(lastStablePage,pageNum);
    updateControls();
    return savePage(lastStablePage,{touchTimestamp:false});
  }
  suspendedReaderAnchor=null;
  return savePage(pageNum);
}
function restoreReaderPosition(){
  if(!pdf)return;
  if(continuousMode&&continuousRoot&&(suspendedReaderAnchor||lastStableAnchor)){
    const token=++resumeAnchorToken;
    const saved=suspendedReaderAnchor||lastStableAnchor;
    const restore=()=>{
      if(token!==resumeAnchorToken||readerSuspended||document.hidden||!continuousMode||!continuousRoot)return;
      const r=viewer.getBoundingClientRect();
      if(r.width<2||r.height<2)return;
      const clientY=continuousReadingTop(r)+Math.min(28,Math.max(8,r.height*.08));
      restoreContinuousAnchor({...saved,clientY});
      savePage(saved.page,{touchTimestamp:false});
    };
    requestAnimationFrame(()=>requestAnimationFrame(restore));
  }else{
    pageNum=validPage(lastStablePage,pageNum);
    updateControls();
    savePage(lastStablePage,{touchTimestamp:false});
  }
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    // Android can collapse the WebView immediately after visibility changes.
    // Freeze first, then persist the last page measured while visible.
    readerSuspended=true;
    suspendedReaderAnchor=lastStableAnchor?{...lastStableAnchor}:null;
    savePage(lastStablePage,{touchTimestamp:false});
    persistReaderPosition();
    return;
  }
  readerSuspended=false;
  lockReaderChrome(900);
  restoreReaderPosition();
  scheduleContinuousSweep();
});
window.addEventListener('pagehide',()=>persistReaderPosition());
window.addEventListener('beforeunload',()=>persistReaderPosition());
function commitContinuousScale(nextScale,anchor=continuousCenterAnchor(),keepFit=false){
  if(!continuousMode||!continuousRoot)return false;
  notes.cancelGesture();
  lockReaderChrome(700);
  const previous=Math.max(.01,scale);
  scale=clampScale(nextScale);
  if(!keepFit)fitWidth=false;
  const factor=scale/previous;
  for(const el of [...continuousTasks.keys()])cancelContinuousRender(el);
  continuousWanted.clear();
  // Stretch existing rasters with CSS (no new memory) until the sweep re-renders them.
  for(const el of continuousRoot.children){
    const newW=Math.max(1,(parseFloat(el.style.width)||el.offsetWidth)*factor);
    const newH=Math.max(1,(parseFloat(el.style.height)||el.offsetHeight)*factor);
    el.style.width=Math.floor(newW)+'px';el.style.height=Math.floor(newH)+'px';
    clearPageDetail(el);
    const cnv=el.querySelector(':scope > canvas:not(.page-detail)');
    if(cnv){
      cnv.style.width=Math.floor(newW)+'px';cnv.style.height=Math.floor(newH)+'px';
      el.dataset.stale='1';
    }
    const tl=el.querySelector(':scope > .text-layer');
    if(tl){tl.style.pointerEvents='none';tl.style.visibility='hidden'}
    const al=el.querySelector(':scope > .annotation-layer');if(al)al.style.visibility='hidden';
  }
  if(anchor)restoreContinuousAnchor(anchor);
  updateControls();
  requestAnimationFrame(()=>{updateContinuousCurrentPage();sweepContinuous()});
  return true;
}
async function fitContinuousToWidth(anchor=continuousCenterAnchor()){
  if(!pdf||!continuousMode||!continuousRoot)return;
  const first=await getCachedPage(1);
  const next=fittedScale(first.getViewport({scale:1}));
  fitWidth=true;
  commitContinuousScale(next,anchor,true);
}
async function renderContinuous(targetPage=pageNum,anchor=null){
  if(!pdf)return;
  pageNum=validPage(targetPage);
  lastStablePage=pageNum;
  savePage(pageNum);
  canvasWrap.hidden=true;clearAnnotations();clearTextLayer();clearHighlights();
  destroyContinuous();
  document.body.classList.add('continuous-mode');
  const root=document.createElement('div');root.className='continuous-pages';
  continuousRoot=root;
  stage.appendChild(root);
  const first=await getCachedPage(1);
  if(continuousRoot!==root)return;
  if(fitWidth)scale=fittedScale(first.getViewport({scale:1}));
  const base=first.getViewport({scale:scale*CSS_UNITS});
  const pages=document.createDocumentFragment();
  for(let n=1;n<=pdf.numPages;n++){
    const el=document.createElement('section');el.className='continuous-page';el.dataset.page=String(n);
    let width=base.width,height=base.height;
    const hint=pageSizeHints?.[n-1];
    if(hint){
      const pageScale=fitWidth?fittedScale({width:hint[0]}):scale;
      width=hint[0]*pageScale*CSS_UNITS;height=hint[1]*pageScale*CSS_UNITS;
    }
    el.style.width=Math.floor(width)+'px';el.style.height=Math.floor(height)+'px';
    pages.appendChild(el);
  }
  root.appendChild(pages);
  lockReaderChrome(700);
  await new Promise(resolve=>requestAnimationFrame(()=>{
    if(!continuousMode||continuousRoot!==root){resolve();return;}
    if(anchor)restoreContinuousAnchor(anchor);
    else scrollViewerToPage(continuousPageEl(pageNum));
    updateContinuousCurrentPage();
    savePage();
    sweepContinuous();
    resolve();
  }));
  updateControls();hideLoading();
}
// Page sizes from the search index lay out the whole strip before pages render,
// so documents mixing portrait and landscape pages do not jump while scrolling.
let pageSizeHints=null;
async function loadPageSizeHints(){
  try{
    const response=await fetch(new URL('../search-index/files.json',location.href));
    if(!response.ok)return null;
    const record=(await response.json()).files?.find(file=>file.path===raw);
    // A changed file may have different pages; its hints are only valid for the indexed version.
    if(!Array.isArray(record?.page_sizes)||(versionParam&&record.version!==versionParam))return null;
    const sizes=[];
    for(const [width,height,count] of record.page_sizes)for(let i=0;i<count;i++)sizes.push([width,height]);
    return sizes;
  }catch{return null}
}
async function startContinuous(){
  continuousMode=true;
  await renderContinuous(pageNum);
}
let readerChromeLastScroll=viewer.scrollTop,readerChromeDirection=0,readerChromeLockUntil=0;
function setReaderChromeHidden(hidden){
  document.body.classList.toggle('reader-chrome-hidden',!!hidden&&phoneStripQuery.matches&&compactQuery.matches);
}
function lockReaderChrome(ms=650){
  readerChromeLockUntil=Math.max(readerChromeLockUntil,performance.now()+ms);
  readerChromeLastScroll=viewer.scrollTop;
  readerChromeDirection=0;
  setReaderChromeHidden(false);
}
function updateReaderChrome(){
  const y=viewer.scrollTop,delta=y-readerChromeLastScroll;
  readerChromeLastScroll=y;
  if(performance.now()<readerChromeLockUntil||gestureActive||!phoneStripQuery.matches||!compactQuery.matches||
    document.body.classList.contains('tools-open')||notes.draft||notes.eraser||notes.panel.querySelector('details').open||
    pageJump.classList.contains('open')||!notes.selectionMenu.hidden||
     document.body.classList.contains('search-open')||
     document.body.classList.contains('outline-open')){
    readerChromeDirection=0;setReaderChromeHidden(false);return;
  }
  if(y<18){readerChromeDirection=0;setReaderChromeHidden(false);return;}
  if(Math.abs(delta)<2)return;
  if(Math.sign(delta)!==Math.sign(readerChromeDirection))readerChromeDirection=0;
  readerChromeDirection+=delta;
  if(readerChromeDirection>10){setReaderChromeHidden(true);readerChromeDirection=0;}
  else if(readerChromeDirection<-5){setReaderChromeHidden(false);readerChromeDirection=0;}
}
let scrollFrame=0;
viewer.addEventListener('scroll',()=>{
  // Coalesce: browsers may fire several scroll events per frame during a fling.
  if(scrollFrame)return;
  scrollFrame=requestAnimationFrame(()=>{
    scrollFrame=0;
    if(!readerSuspended&&!document.hidden&&continuousMode){updateContinuousCurrentPage();sweepContinuous();schedulePageDetail()}
    updateReaderChrome();
  });
},{passive:true});
viewer.addEventListener('notesmodechange',()=>lockReaderChrome(800));
viewer.addEventListener('notesgesturestart',()=>lockReaderChrome(650));
document.addEventListener('focusin',e=>{if(e.target.closest('.toolbar,.notes-tools,.mobile-nav'))lockReaderChrome(800);});
landscapePhoneQuery.addEventListener('change',()=>{
  lockReaderChrome(1000);
  closeTools();
  readerChromeLastScroll=viewer.scrollTop;readerChromeDirection=0;setReaderChromeHidden(false);
});


async function open(){
  if(!raw){fail('В ссылке не указан файл.');return}
  lockReaderChrome(1000);
  title.textContent=titleParam||raw.split('/').pop();document.title=(titleParam||'PDF')+' · ФФ НГУ';showLoading('Открываю документ…');
  try{
    pdfUrl=resolvePdfUrl(raw);direct.href=pdfUrl;
    const hints=searchPreviewParam?Promise.resolve(null):loadPageSizeHints();
    pdf=await loadPdfDocument(pdfUrl);
    const sizes=await Promise.race([hints,new Promise(resolve=>setTimeout(()=>resolve(null),1500))]);
    if(sizes?.length===pdf.numPages)pageSizeHints=sizes;await notes.open(pdf,raw,titleParam||raw.split('/').pop(),versionParam);pageNum=validPage(pageParam||rememberedPage());lastStablePage=pageNum;searchPage=pageNum;scale=1;fitWidth=embedParam||compactQuery.matches;updateControls();if(searchPreviewParam)await renderPage();else await startContinuous();window.NSUApp?.warm();notifyParentPdfReady();if(pendingNavigation)await applyNavigation();else if(findParam.trim())runExternalFind(findParam)
  }catch(err){fail(err?.message||String(err))}
}

function go(delta){if(!pdf)return;const n=pageNum+delta;if(n<1||n>pdf.numPages)return;pageNum=n;savePage();if(continuousMode)scrollToContinuousPage(pageNum);else renderPage()}
let pendingNavigation=null,navigationSerial=0;
async function applyNavigation(){
  if(!pdf||!pendingNavigation)return;
  const url=pendingNavigation;pendingNavigation=null;
  const serial=++navigationSerial;
  const nextPage=url.searchParams.has('page')?validPage(url.searchParams.get('page')):pageNum;
  const query=url.searchParams.get('find')||'';
  title.textContent=url.searchParams.get('title')||raw.split('/').pop();
  document.title=title.textContent+' · ФФ НГУ';
  history.replaceState(null,'',url.href);
  closeSearch();resetSearch();
  if(nextPage!==pageNum){pageNum=nextPage;savePage();await renderPage()}
  else savePage();
  if(serial!==navigationSerial)return;
  runExternalFind(query)
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='nsu-viewer-navigate')return;
  let url;try{url=new URL(event.data.url,location.href)}catch{return}
  if(url.origin!==location.origin||url.pathname!==location.pathname||currentMaterialPath(url.searchParams.get('file'))!==raw||url.searchParams.get('v')!==params.get('v'))return;
  pendingNavigation=url;void applyNavigation();
});
back.onclick=async()=>{
  if(!await window.nsuFlushAnnotations())return;
  const position=persistReaderPosition();
  if(window.parent!==window){
    window.parent.postMessage({type:'nsu-close-pdf',file:position.file,page:position.page},location.origin);
    return;
  }
  if(history.length>1)history.back();
  else location.href='../'+(subject?`#subject=${encodeURIComponent(subject)}`:'');
};
outlineToggle.onclick=()=>outlinePanel.classList.contains('open')?closeOutline():void openOutline();outlineClose.onclick=closeOutline;outlineBackdrop.onclick=closeOutline;
prev.onclick=()=>go(-1);next.onclick=()=>go(1);mPrev.onclick=()=>go(-1);mNext.onclick=()=>go(1);mPageInfo.onclick=()=>pageJump.classList.contains('open')?closePageJump():openPageJump();pageJumpClose.onclick=closePageJump;pageJumpForm.addEventListener('submit',e=>{e.preventDefault();jumpToPage()});document.addEventListener('pointerdown',e=>{if(!pageJump.classList.contains('open'))return;if(pageJump.contains(e.target)||mPageInfo.contains(e.target))return;closePageJump()});
pageInput.onchange=()=>{if(!pdf)return;pageNum=validPage(pageInput.value,pageNum);savePage();if(continuousMode)scrollToContinuousPage(pageNum);else renderPage()};
function clampScale(value){return Math.max(.35,Math.min(4,value))}
function zoomAnchorFromClient(clientX,clientY){
  const rect=canvasWrap.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return null;
  return{
    x:Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),
    y:Math.max(0,Math.min(1,(clientY-rect.top)/rect.height)),
    clientX,clientY
  };
}
function setZoomScale(nextScale,anchor=null){
  if(!pdf)return;
  const next=clampScale(nextScale);
  if(continuousMode){
    commitContinuousScale(next,anchor||continuousCenterAnchor(),false);
    return;
  }
  fitWidth=false;scale=next;updateControls();void renderPage(anchor?{anchor}:{});
}
function applyCustomZoom(){
  if(!pdf)return;
  const percent=Number(zoomLabel.value);
  if(!Number.isFinite(percent)){updateControls();return}
  setZoomScale(percent/100);
}
zoomOut.onclick=()=>setZoomScale(scale-.15);
zoomIn.onclick=()=>setZoomScale(scale+.15);
zoomLabel.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();zoomLabel.blur();applyCustomZoom()}
  else if(e.key==='Escape'){e.preventDefault();updateControls();zoomLabel.blur()}
});
zoomLabel.addEventListener('change',applyCustomZoom);
zoomLabel.addEventListener('focus',()=>zoomLabel.select());
fit.onclick=()=>{fitWidth=true;closeTools();if(continuousMode)void fitContinuousToWidth();else void renderPage()};
expandViewer.onclick=()=>{
  const url=location.href.replace(/([?&])embed=1(&|$)/,(m,a,b)=>b?a:'').replace(/[?&]$/,'');
  if(window.parent!==window)window.parent.postMessage({type:'nsu-open-pdf-fullscreen',url},location.origin);
  else document.documentElement.requestFullscreen?.().catch?.(()=>{});
};
searchToggle.onclick=openSearch;searchClose.onclick=closeSearch;searchNext.onclick=()=>searchStep(1);searchPrev.onclick=()=>searchStep(-1);searchInput.oninput=resetSearch;searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchStep(e.shiftKey?-1:1)}});
// The installed app keeps element fullscreen so the camera cutout is not a black strip.
document.addEventListener('pointerup',()=>{
  if(window.parent===window||!compactQuery.matches)return;
  try{window.parent.nsuKeepImmersive?.()}catch{}
},true);
window.addEventListener('keydown',e=>{if(e.target.closest('dialog,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();openSearch();return}if(e.key==='Escape'){if(document.body.classList.contains('tools-open'))closeTools(true);else if(pageJump.classList.contains('open'))closePageJump();else if(outlinePanel.classList.contains('open'))closeOutline();else if(searchPanel.classList.contains('open'))closeSearch();else if(notes.enabled){notes.button.click();}else back.click();return}if(document.activeElement===searchInput||document.activeElement===pageInput||document.activeElement===pageJumpInput||document.activeElement===zoomLabel||e.target.closest('input'))return;if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1)});
// Zoom gestures preview with a CSS transform around a point fixed at gesture start
// (measured before any transform is applied), then commit one real scale change.
function endZoomPreview(target){target.classList.remove('pinch-preview');target.style.transform='';target.style.transformOrigin=''}
function startZoomPreview(clientX,clientY){
  const continuous=continuousMode&&!!continuousRoot,target=continuous?continuousRoot:canvasWrap;
  const rect=target.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return null;
  const x=Math.max(rect.left,Math.min(rect.right,clientX)),y=Math.max(rect.top,Math.min(rect.bottom,clientY));
  // Measure first: the preview class makes the strip the pages' offsetParent.
  const anchor=continuous?continuousAnchorFromClient(y):zoomAnchorFromClient(x,y);
  target.classList.add('pinch-preview');
  target.style.transformOrigin=(x-rect.left)+'px '+(y-rect.top)+'px';
  return{target,continuous,anchor,startScale:scale,targetScale:scale,clientX:x,clientY:y,horizontal:(x-rect.left)/rect.width};
}
// Single-page mode: stretch the current raster to the new size at once, so the page
// keeps its previewed size and position while the sharp render is in flight.
function stretchSinglePage(ratio,anchor){
  if(!(ratio>0)||Math.abs(ratio-1)<.001)return;
  for(const el of [canvas,highlightLayer,textLayer,annotationLayer]){
    const w=parseFloat(el.style.width),h=parseFloat(el.style.height);
    if(w>0)el.style.width=w*ratio+'px';
    if(h>0)el.style.height=h*ratio+'px';
  }
  if(!anchor)return;
  const r=canvasWrap.getBoundingClientRect();
  viewer.scrollBy(r.left+anchor.x*r.width-anchor.clientX,r.top+anchor.y*r.height-anchor.clientY);
}
function commitZoomGesture(nextScale,g,clientX){
  if(g.continuous&&continuousMode&&continuousRoot){
    commitContinuousScale(nextScale,g.anchor,false);
    const r=continuousRoot.getBoundingClientRect();viewer.scrollLeft+=r.left+r.width*g.horizontal-clientX;
    return;
  }
  const previous=scale;scale=clampScale(nextScale);
  stretchSinglePage(scale/previous,g.anchor);
  updateControls();void renderPage(g.anchor?{anchor:g.anchor}:{});
}

let wheelZoom=null;
function paintWheelZoom(){
  const z=wheelZoom;if(!z)return;
  z.frame=0;
  // A mouse-wheel notch is a big step: ease towards it. Trackpad pinch deltas are already fine-grained.
  const diff=Math.log(z.targetScale/z.shown);
  z.shown=Math.abs(diff)<.002||!z.smooth?z.targetScale:z.shown*Math.exp(diff*.35);
  z.target.style.transform='scale('+z.shown/z.startScale+')';
  zoomLabel.value=String(Math.round(z.shown*100));
  if(z.shown!==z.targetScale)z.frame=requestAnimationFrame(paintWheelZoom);
}
function scheduleWheelZoomPaint(){if(!wheelZoom.frame)wheelZoom.frame=requestAnimationFrame(paintWheelZoom)}
function beginWheelZoom(clientX,clientY){
  if(!wheelZoom){
    wheelZoom=startZoomPreview(clientX,clientY);
    if(!wheelZoom)return null;
    wheelZoom.shown=scale;wheelZoom.timer=0;wheelZoom.frame=0;
  }
  closePageJump();fitWidth=false;gestureActive=true;lockReaderChrome(900);
  clearTimeout(wheelZoom.timer);
  return wheelZoom;
}
function finishWheelZoom(){
  const z=wheelZoom;if(!z)return;
  // Let an eased step land before committing, or the page would jump to the target.
  if(z.frame){z.timer=setTimeout(finishWheelZoom,40);return}
  wheelZoom=null;
  endZoomPreview(z.target);
  gestureActive=false;lockReaderChrome(650);
  if(Math.abs(z.shown-z.startScale)<.002){updateControls();scheduleContinuousSweep();return}
  commitZoomGesture(z.shown,z,z.clientX);
}
function handleWheelZoom(e){
  if(!pdf||(!e.ctrlKey&&!e.metaKey))return;
  e.preventDefault();e.stopPropagation();
  if(pinchState)return;
  const z=beginWheelZoom(e.clientX,e.clientY);if(!z)return;
  const sensitivity=e.deltaMode===1?.045:e.deltaMode===2?.18:.0026;
  z.smooth=e.deltaMode!==0||Math.abs(e.deltaY)>=40;
  z.targetScale=clampScale(z.targetScale*Math.exp(-e.deltaY*sensitivity));
  scheduleWheelZoomPaint();
  // Trackpads pause mid-pinch; a short idle timeout would commit and re-render halfway through.
  z.timer=setTimeout(finishWheelZoom,z.smooth?200:180);
}
window.addEventListener('wheel',handleWheelZoom,{passive:false,capture:true});
// Safari reports trackpad pinch as gesture* events instead of ctrl+wheel. On iOS the
// touch handlers below own the pinch; these only stop the page itself from zooming.
window.addEventListener('gesturestart',e=>{
  e.preventDefault();
  if(!pdf||pinchState)return;
  const z=beginWheelZoom(e.clientX,e.clientY);if(!z)return;
  z.gestureBase=z.targetScale;z.smooth=false;
},{passive:false});
window.addEventListener('gesturechange',e=>{
  e.preventDefault();
  const z=wheelZoom;if(!z||z.gestureBase==null)return;
  z.targetScale=clampScale(z.gestureBase*e.scale);
  scheduleWheelZoomPaint();
},{passive:false});
window.addEventListener('gestureend',e=>{
  e.preventDefault();
  const z=wheelZoom;if(!z||z.gestureBase==null)return;
  z.gestureBase=null;clearTimeout(z.timer);z.timer=setTimeout(finishWheelZoom,60);
},{passive:false});

function touchDistance(touches){const dx=touches[0].clientX-touches[1].clientX,dy=touches[0].clientY-touches[1].clientY;return Math.hypot(dx,dy)}
function touchMidpoint(touches){return{x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2}}
let pinchState=null,pinchPreviewRaf=0;
function paintPinchPreview(){
  pinchPreviewRaf=0;
  const p=pinchState;if(!p)return;
  // If the browser already started a two-finger pan it keeps scrolling the viewer;
  // cancel that out so the page follows the fingers exactly once.
  const dx=p.mid.x-p.startMid.x+viewer.scrollLeft-p.scrollX,dy=p.mid.y-p.startMid.y+viewer.scrollTop-p.scrollY;
  p.target.style.transform=`translate(${dx}px,${dy}px) scale(${p.targetScale/p.startScale})`;
  zoomLabel.value=String(Math.round(p.targetScale*100));
}
function schedulePinchPreview(){if(!pinchPreviewRaf)pinchPreviewRaf=requestAnimationFrame(paintPinchPreview)}
viewer.addEventListener('touchstart',e=>{
  if(!pdf||e.touches.length!==2||notes.rejectPalm()||[...e.touches].some(t=>t.touchType==='stylus'))return;
  notes.cancelGesture();
  e.preventDefault();
  const mid=touchMidpoint(e.touches),distance=touchDistance(e.touches);
  if(distance<8||wheelZoom)return;
  const p=startZoomPreview(mid.x,mid.y);if(!p)return;
  closePageJump();fitWidth=false;gestureActive=true;lockReaderChrome(1000);
  pinchState=Object.assign(p,{startDistance:distance,startMid:mid,mid,scrollX:viewer.scrollLeft,scrollY:viewer.scrollTop});
},{passive:false});
viewer.addEventListener('touchmove',e=>{
  if(!pinchState||e.touches.length<2||notes.rejectPalm())return;
  if(e.cancelable)e.preventDefault();
  const distance=touchDistance(e.touches);if(distance<8)return;
  pinchState.mid=touchMidpoint(e.touches);
  pinchState.targetScale=clampScale(pinchState.startScale*distance/pinchState.startDistance);
  schedulePinchPreview();
},{passive:false});
viewer.addEventListener('scroll',()=>{if(pinchState)schedulePinchPreview()},{passive:true});
function finishPinch(e){
  const p=pinchState;
  if(!p||(e.touches&&e.touches.length>=2))return;
  pinchState=null;
  if(pinchPreviewRaf){cancelAnimationFrame(pinchPreviewRaf);pinchPreviewRaf=0}
  endZoomPreview(p.target);
  gestureActive=false;lockReaderChrome(700);
  const {mid,startMid}=p;
  if(Math.abs(p.targetScale-p.startScale)<.005){viewer.scrollTo(p.scrollX+startMid.x-mid.x,p.scrollY+startMid.y-mid.y);updateControls();scheduleContinuousSweep();return}
  if(p.anchor){p.anchor.clientY=mid.y;if(!p.continuous)p.anchor.clientX=mid.x}
  commitZoomGesture(p.targetScale,p,mid.x);
}
viewer.addEventListener('touchend',finishPinch,{passive:true});
viewer.addEventListener('touchcancel',finishPinch,{passive:true});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',()=>{if(pageJump.classList.contains('open'))syncKeyboardOffset()});
  window.visualViewport.addEventListener('scroll',()=>{if(pageJump.classList.contains('open'))syncKeyboardOffset()});
}
window.addEventListener('orientationchange',()=>{
  lockReaderChrome(1100);
  closeTools();
  closePageJump();
  setReaderChromeHidden(false);
  setTimeout(()=>{if(pageJump.classList.contains('open'))syncKeyboardOffset()},120);
});
// A taller embedded preview needs no new canvas: keep its page and scroll position.
// Width changes still require fitting the document again.
let resizeTimer;
let viewerWidth=viewer.clientWidth;
new ResizeObserver(()=>{
  if(viewer.clientWidth===viewerWidth)return;
  viewerWidth=viewer.clientWidth;
  lockReaderChrome(900);
  if(!pdf||!fitWidth||gestureActive)return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    if(!pdf||!fitWidth||gestureActive)return;
    lockReaderChrome(650);
    if(continuousMode)void fitContinuousToWidth(continuousCenterAnchor());
    else void renderPage();
  },260);
}).observe(viewer);
open();

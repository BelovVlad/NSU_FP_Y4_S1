/* Change SHELL_VERSION when changing the application shell. Material caches survive updates. */
const SHELL_VERSION = '2911a954bb';
const BASE = new URL('./', self.location);
const ROOT = new URL('../', BASE);
const PREFIX = 'nsu-app-' + BASE.pathname + '-';
const SHELL = PREFIX + 'shell-' + SHELL_VERSION;
const DATA = PREFIX + 'data-v1';
const PDFS = PREFIX + 'pdf-v1';
const CORE = ['index.html', 'site.css?v=581f247313', 'site.js?v=5266289263', 'app.js?v=b0bec72a78', 'app.css?v=4e2e52a233', 'annotations-store.js?v=67333490cd', 'offline-resources.json', 'knowledge.css?v=5db485695e', 'manifest.webmanifest?v=f091c1f136',
  'Overseer/overseer.js?v=2125c3b5d7', 'Overseer/overseer.css?v=3c70ee01aa',
  'Overseer/assets/Circle20.png', 'Overseer/assets/GuidancePebbles.png',
  'Overseer/assets/miscDangerSymbol.png', 'Overseer/assets/keyArrowA.png', 'Overseer/assets/keyXA.png', 'Overseer/assets/noise.png',
  'search-worker.js?v=32d5520b7c', 'notebook/viewer.html', 'notebook/viewer.css?build=2aa53795ce', 'notebook/outline.js?build=d72f570ee4',
  'pdfjs/viewer.html', 'pdfjs/viewer.css?v=1e131249af', 'pdfjs/viewer.js?v=be0d529c93', 'pdfjs/icons.js?v=c6753488af', 'pdfjs/pdf-tone.js?v=37583b871e',
  'pdfjs/search-text.js?v=3770976b57', 'pdfjs/material-paths.js?v=ca1e61a965', 'pdfjs/renamed-materials.js?v=b94bf2d584', 'pdfjs/controls.css?v=ce628b7465', 'pdfjs/notes.js?v=cc44e7db2f', 'pdfjs/notes.css?v=c36146054c', 'assets/nsu-fp-emblem.webp',
  'assets/app-192.png?v=f299e7a63c', 'assets/app-512.png?v=9f41a6f2fa', 'particles/index.html', 'particles/particles.js',
  'particles/explorer.css?v=ab913786e6', 'particles/explorer.js?v=4f8c5e98ad', 'particles/layout.js?v=14224e1e89', 'particles/routes.js?v=1127b43bc0', 'particles/extra-particles.js?v=f0a2243a75', 'particles/remaining-particles.js?v=f1ed737ba7'];
const META = ['search-index/files.json', 'search-index/structure.json', 'search-index/manifest.json', 'search-index/karma-history.json'];
const absolute = path => new URL(path, BASE).href;
const local = url => url.origin === BASE.origin && url.pathname.startsWith(ROOT.pathname);
const pdfUrl = url => /\.pdf$/i.test(url.pathname) && (local(url) ||
  url.origin === 'https://media.githubusercontent.com' && url.pathname.startsWith('/media/BelovVlad/NSU_FP_Y4_S1/main/'));
const notebookUrl = url => local(url) && /\.ipynb$/i.test(url.pathname);
const library = url => url.origin === 'https://cdn.jsdelivr.net' &&
  /^\/npm\/(mathjax@3\.2\.2|marked@12\.0\.2|dompurify@3\.1\.6|highlight\.js@11\.9\.0)\//.test(url.pathname) ||
  url.origin === 'https://cdnjs.cloudflare.com' && url.pathname.startsWith('/ajax/libs/highlight.js/11.9.0/');
function cacheable(url) {
  return library(url) || local(url) && /\.(?:html|css|js|json|ipynb|png|webp|jpg|jpeg|svg|woff2?|webmanifest|mjs|bcmap|pfb|ttf)$/i.test(url.pathname);
}
function keyFor(url) {
  const key = new URL(url);
  if(key.pathname === BASE.pathname) key.pathname += 'index.html';
  if(key.pathname === new URL('particles/',BASE).pathname) key.pathname += 'index.html';
  // Reader query parameters select a document; they do not change its HTML shell.
  if(/\.html$/.test(key.pathname)) key.search = '';
  return key.href;
}
async function put(cache, key, response) {
  if(response.status === 200 || response.type === 'opaque') {
    try { await cache.put(key, response); } catch { /* A full cache must not break reading online. */ }
  }
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(SHELL);
  // Atomic shell installation: keep the previous worker if any required file is unavailable.
  await cache.addAll(CORE.map(absolute));
  const data = await caches.open(DATA);
  await Promise.allSettled(META.map(async path => {
    const response = await fetch(absolute(path), {cache:'no-cache'});
    await put(data, absolute(path), response);
  }));
  // UI fixes must not sit in "waiting" behind the old shell.
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys=await caches.keys();
  const oldShells=keys.filter(name => name.startsWith(PREFIX+'shell-') && name !== SHELL);
  await Promise.all(oldShells.map(name => caches.delete(name)));
  // Take control for future requests, but never navigate/reload an already open
  // document. A reader may be backgrounded in Android Recents.
  await self.clients.claim();
})()));

async function readRange(response, range) {
  if(!range) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  // A full 200 response is a valid fallback for unsupported/multiple range requests.
  if(!match || (!match[1] && !match[2])) return response;
  const blob = await response.blob(), size = blob.size;
  const start = match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]),size-1) : size-1) : size-1;
  if(start >= size || end < start) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  return new Response(blob.slice(start,end+1),{status:206,headers:{
    'Content-Type':'application/pdf','Content-Range':`bytes ${start}-${end}/${size}`,
    'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
async function material(request,event) {
  const saved = await (await caches.open(PDFS)).match(request.url);
  if(saved) return readRange(saved,request.headers.get('range'));
  if(notebookUrl(new URL(request.url)))return resource(request,event);
  // Never turn a PDF.js range request into an unsolicited full download.
  return fetch(request);
}
async function resource(request, event) {
  const url = new URL(request.url), key = keyFor(url);
  // vendor/ paths carry their version, so they live in the data cache and survive shell updates.
  const shell = url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname) &&
    !url.pathname.startsWith(absolute('search-index/').replace(BASE.origin,'')) &&
    !url.pathname.startsWith(absolute('vendor/').replace(BASE.origin,''));
  const cache = await caches.open(shell ? SHELL : DATA);
  const cached = await cache.match(key);
  const html = request.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.href === BASE.href;
  const immutable = library(url) || url.searchParams.has('v') || url.searchParams.has('build');

  const network = (async () => {
    const response = await fetch(request,{cache:html?'no-cache':'default'});
    if(!response.ok && response.type !== 'opaque') throw new Error('HTTP '+response.status);
    await put(cache,key,response.clone());
    return response;
  })();

  // HTML chooses the versioned JS/CSS. On a slow mobile network, never serve
  // an old HTML shell merely because 1.8 seconds elapsed. Cache is offline-only.
  if(html){
    try { return await network; }
    catch {
      if(cached) return cached;
      if(request.mode === 'navigate') return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Нет подключения</title><body style="background:#080d12;color:#eee;font:18px system-ui;padding:24px"><h1>Этот материал ещё не сохранён</h1><p>Откройте его при подключении к интернету.</p><a style="color:#f4b8a5" href="'+BASE.href+'">К материалам</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      return Response.error();
    }
  }

  if(cached && immutable) return cached;
  event.waitUntil(network.catch(()=>{}));
  if(cached) return Promise.race([network.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),1800))]);
  try { return await network; }
  catch { return Response.error(); }
}
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // "Частицы" is a visual application rather than a notebook. Keep the catalog
  // entry in База for indexing/search, but open the explorer itself immediately.
  const notebookViewerPath = absolute('notebook/viewer.html').replace(BASE.origin,'');
  if(event.request.mode === 'navigate' && url.origin === BASE.origin &&
     url.pathname === notebookViewerPath && url.searchParams.get('file') === 'База/Частицы.ipynb') {
    event.respondWith(Response.redirect(absolute('particles/'),302));
    return;
  }

  if(pdfUrl(url)||notebookUrl(url)) event.respondWith(material(event.request,event));
  else if(cacheable(url) || url.href === BASE.href ||
    url.origin === BASE.origin && url.pathname === new URL('particles/',BASE).pathname) event.respondWith(resource(event.request,event));
});

let preparing=new Map();
async function prepareLibrary(types=['pdf','ipynb']) {
  const response=await (await caches.open(SHELL)).match(absolute('offline-resources.json'));
  if(!response)throw new Error('Нет списка ресурсов просмотрщика. Обновите приложение.');
  const manifest=await response.json();
  const urls=[...new Set(types.flatMap(type=>manifest[type]||[]))];
  const cache=await caches.open(DATA);
  let cursor=0;
  await Promise.all(Array.from({length:6},async()=>{
    while(cursor<urls.length){
      const href=absolute(urls[cursor++]);
      if(!cacheable(new URL(href)))throw new Error('Неподдерживаемый ресурс просмотрщика.');
      if(await cache.match(keyFor(href)))continue;
      if(!preparing.has(href)){
        const pending=(async()=>{
          const resource=await fetch(href,{signal:AbortSignal.timeout(90000)});
          if(!resource.ok)throw new Error('Не удалось подготовить офлайн-просмотрщик. Проверьте сеть и повторите.');
          await cache.put(keyFor(href),resource);
        })().finally(()=>preparing.delete(href));
        preparing.set(href,pending);
      }
      await preparing.get(href);
    }
  }));
  return true;
}
async function savePdf(message) {
  let url = new URL(message.url);
  const isNotebook=notebookUrl(url);
  const viewer = new URL(message.viewer);
  if(!(pdfUrl(url)||isNotebook) || viewer.origin !== BASE.origin || viewer.pathname !== new URL(isNotebook?'notebook/viewer.html':'pdfjs/viewer.html',BASE).pathname)
    throw new Error('Некорректная ссылка на материал.');
  viewer.searchParams.delete('embed');
  viewer.searchParams.delete('full');
  let response = await fetch(url.href,{cache:'no-cache',signal:AbortSignal.timeout(180000)});
  if(response.status !== 200) throw new Error('Не удалось скачать PDF. Проверьте подключение.');
  const limit = 150*1024*1024;
  if(Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Файл больше 150 МБ. Скачайте его через кнопку «Файл».');
  }
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  while(true) {
    const {done,value} = await reader.read();
    if(done) break;
    length += value.byteLength;
    if(length > limit) { await reader.cancel(); throw new Error('Файл больше 150 МБ. Скачайте его через кнопку «Файл».'); }
    chunks.push(value);
  }
  let blob=new Blob(chunks,{type:isNotebook?'application/json':'application/pdf'});
  if(!isNotebook&&(await blob.slice(0,200).text()).startsWith('version https://git-lfs.github.com/spec/v1')){
    const relative=decodeURIComponent(url.pathname.slice(ROOT.pathname.length));
    url=new URL('https://media.githubusercontent.com/media/BelovVlad/NSU_FP_Y4_S1/main/'+relative.split('/').map(encodeURIComponent).join('/'));
    const version=new URL(message.url).searchParams.get('v');if(version)url.searchParams.set('v',version);
    viewer.searchParams.set('lfs','1');
    return savePdf({...message,url:url.href,viewer:viewer.href,alias:message.url});
  }
  if(isNotebook){
    try{const notebook=JSON.parse(await blob.text());if(!Array.isArray(notebook.cells)||!notebook.nbformat)throw new Error();}
    catch{throw new Error('Вместо Notebook сервер вернул другой файл.');}
  }else if(!(await blob.slice(0,1024).text()).includes('%PDF-')) throw new Error('Вместо PDF сервер вернул другой файл. Повторите попытку позже.');
  await prepareLibrary([isNotebook?'ipynb':'pdf']);
  const cache=await caches.open(PDFS);
  const stored=new Response(blob,{headers:{'Content-Type':isNotebook?'application/json':'application/pdf',
    'Content-Length':String(length),'Accept-Ranges':'bytes',
    'X-NSU-Title':encodeURIComponent(String(message.title).slice(0,300)),
    'X-NSU-Viewer':encodeURIComponent(viewer.href),'X-NSU-Alias':encodeURIComponent(message.alias||''),
    'X-NSU-Canonical':encodeURIComponent(url.href)}});
  await cache.put(url.href,stored.clone());
  if(message.alias)await cache.put(message.alias,stored.clone());
  // Only prune obsolete versions after the replacement has actually been stored.
  for(const request of await cache.keys()){
    const old=new URL(request.url);
    if(old.origin===url.origin&&old.pathname===url.pathname&&old.href!==url.href)await cache.delete(old.href);
  }
  return {bytes:length,url:url.href};
}
async function listPdfs() {
  const cache=await caches.open(PDFS);
  const files=await Promise.all((await cache.keys()).map(async request=>{
    const response=await cache.match(request);
    const canonical=decodeURIComponent(response.headers.get('X-NSU-Canonical')||request.url);
    if(canonical!==request.url)return null;
    return {url:request.url,title:decodeURIComponent(response.headers.get('X-NSU-Title')||'PDF'),
      alias:decodeURIComponent(response.headers.get('X-NSU-Alias')||''),
      viewer:decodeURIComponent(response.headers.get('X-NSU-Viewer')||''),bytes:Number(response.headers.get('Content-Length'))};
  }));
  return files.filter(Boolean);
}
async function removeMaterial(href) {
  const cache=await caches.open(PDFS),response=await cache.match(href);
  const urls=[href,...['X-NSU-Alias','X-NSU-Canonical'].map(name=>decodeURIComponent(response?.headers.get(name)||''))].filter(Boolean).map(value=>new URL(value));
  const sameFile=href=>{const url=new URL(href);return urls.some(target=>target.origin===url.origin&&target.pathname===url.pathname);};
  for(const request of await cache.keys())if(sameFile(request.url))await cache.delete(request);
  // Notebook may also have been cached by an ordinary earlier online visit.
  const data=await caches.open(DATA);
  for(const request of await data.keys())if(notebookUrl(new URL(request.url))&&sameFile(request.url))await data.delete(request);
  return true;
}
async function clearMaterials() {
  await caches.delete(PDFS);
  const data=await caches.open(DATA);
  for(const request of await data.keys())if(notebookUrl(new URL(request.url)))await data.delete(request);
  return true;
}
self.addEventListener('message',event=>{
  const message=event.data||{};
  const action=async()=>{
    if(message.type==='ACTIVATE') return self.skipWaiting();
    if(message.type==='SAVE_PDF'||message.type==='SAVE_MATERIAL') return savePdf(message);
    if(message.type==='PREPARE_LIBRARY') return prepareLibrary(message.types);
    if(message.type==='LIST_PDFS'||message.type==='LIST_MATERIALS') return listPdfs();
    if(message.type==='REMOVE_PDF'||message.type==='REMOVE_MATERIAL') return removeMaterial(message.url);
    if(message.type==='CLEAR_PDFS'||message.type==='CLEAR_MATERIALS') return clearMaterials();
    if(message.type==='WARM') {
      // Recover resources loaded before the first worker acquired control (including a direct reader link).
      await Promise.allSettled((message.urls||[]).slice(0,120).filter(href=>cacheable(new URL(href))).map(async href=>{
        const url=new URL(href),key=keyFor(url);
        const cache=await caches.open(url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname)&&!url.pathname.includes('/search-index/')?SHELL:DATA);
        if(await cache.match(key)) return;
        const response=await fetch(href,{cache:'force-cache'});
        await put(cache,key,response);
      }));
      return true;
    }
    throw new Error('Неизвестная команда.');
  };
  event.waitUntil(action().then(result=>event.ports[0]?.postMessage({ok:true,result}),error=>
    event.ports[0]?.postMessage({ok:false,error:error.name==='QuotaExceededError'?'Недостаточно места на устройстве.':error.message})));
});

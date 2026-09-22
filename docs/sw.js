/* Change SHELL_VERSION when changing the application shell. Material caches survive updates. */
const SHELL_VERSION = 'v6';
const BASE = new URL('./', self.location);
const ROOT = new URL('../', BASE);
const PREFIX = 'nsu-app-' + BASE.pathname + '-';
const SHELL = PREFIX + 'shell-' + SHELL_VERSION;
const DATA = PREFIX + 'data-v1';
const PDFS = PREFIX + 'pdf-v1';
const CORE = ['index.html', 'app.js?v=4', 'app.css?v=6', 'knowledge.css?v=3', 'manifest.webmanifest',
  'search-worker.js', 'notebook/viewer.html', 'notebook/viewer.css?build=15', 'notebook/outline.js?build=2',
  'pdfjs/viewer.html', 'pdfjs/controls.css?v=3', 'assets/nsu-fp-emblem.webp',
  'assets/app-192.png', 'assets/app-512.png'];
const META = ['search-index/files.json', 'search-index/structure.json', 'search-index/manifest.json'];
const absolute = path => new URL(path, BASE).href;
const local = url => url.origin === BASE.origin && url.pathname.startsWith(ROOT.pathname);
const pdfUrl = url => /\.pdf$/i.test(url.pathname) && (local(url) ||
  url.origin === 'https://media.githubusercontent.com' && url.pathname.startsWith('/media/BelovVlad/NSU_FP_Y4_S1/main/'));
const library = url => url.origin === 'https://cdn.jsdelivr.net' &&
  /^\/npm\/(pdfjs-dist@4\.10\.38|mathjax@3\.2\.2|marked@12\.0\.2|dompurify@3\.1\.6|highlight\.js@11\.9\.0)\//.test(url.pathname) ||
  url.origin === 'https://cdnjs.cloudflare.com' && url.pathname.startsWith('/ajax/libs/highlight.js/11.9.0/');
function cacheable(url) {
  return library(url) || local(url) && /\.(?:html|css|js|json|ipynb|png|webp|jpg|jpeg|svg|woff2?|webmanifest)$/i.test(url.pathname);
}
function keyFor(url) {
  const key = new URL(url);
  if(key.pathname === BASE.pathname) key.pathname += 'index.html';
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
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(name => name.startsWith(PREFIX+'shell-') && name !== SHELL).map(name => caches.delete(name)));
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
async function material(request) {
  const saved = await (await caches.open(PDFS)).match(request.url);
  if(saved) return readRange(saved,request.headers.get('range'));
  // Never turn a PDF.js range request into an unsolicited full download.
  return fetch(request);
}
async function resource(request, event) {
  const url = new URL(request.url), key = keyFor(url);
  const shell = url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname) &&
    !url.pathname.startsWith(absolute('search-index/').replace(BASE.origin,''));
  const cache = await caches.open(shell ? SHELL : DATA);
  const cached = await cache.match(key);
  const immutable = library(url) || url.searchParams.has('v') || url.searchParams.has('build');
  if(cached && immutable) return cached;
  const network = (async () => {
    const response = await fetch(request);
    if(!response.ok && response.type !== 'opaque') throw new Error('HTTP '+response.status);
    await put(cache,key,response.clone());
    return response;
  })();
  event.waitUntil(network.catch(()=>{}));
  if(cached) {
    // Fresh catalogue data and HTML online; immediate offline fallback, bounded wait on weak networks.
    return Promise.race([network.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),1800))]);
  }
  try { return await network; }
  catch {
    if(request.mode === 'navigate') return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Нет подключения</title><body style="background:#080d12;color:#eee;font:18px system-ui;padding:24px"><h1>Этот материал ещё не сохранён</h1><p>Откройте его при подключении к интернету.</p><a style="color:#f4b8a5" href="'+BASE.href+'">К материалам</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
    return Response.error();
  }
}
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(pdfUrl(url)) event.respondWith(material(event.request));
  else if(cacheable(url) || url.href === BASE.href) event.respondWith(resource(event.request,event));
});

async function savePdf(message) {
  const url = new URL(message.url);
  const viewer = new URL(message.viewer);
  if(!pdfUrl(url) || viewer.origin !== BASE.origin || viewer.pathname !== new URL('pdfjs/viewer.html',BASE).pathname)
    throw new Error('Некорректная ссылка на PDF.');
  viewer.searchParams.delete('embed');
  viewer.searchParams.delete('full');
  const response = await fetch(url.href,{cache:'no-cache',signal:AbortSignal.timeout(180000)});
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
  const blob = new Blob(chunks,{type:'application/pdf'});
  if(!(await blob.slice(0,1024).text()).includes('%PDF-')) throw new Error('Вместо PDF сервер вернул другой файл. Повторите попытку позже.');
  const cache = await caches.open(PDFS);
  await cache.put(url.href,new Response(blob,{headers:{'Content-Type':'application/pdf',
    'Content-Length':String(length),'Accept-Ranges':'bytes',
    'X-NSU-Title':encodeURIComponent(String(message.title).slice(0,300)),
    'X-NSU-Viewer':encodeURIComponent(viewer.href)}}));
  return {bytes:length};
}
async function listPdfs() {
  const cache = await caches.open(PDFS);
  return Promise.all((await cache.keys()).map(async request => {
    const response = await cache.match(request);
    return {url:request.url,title:decodeURIComponent(response.headers.get('X-NSU-Title')||'PDF'),
      viewer:decodeURIComponent(response.headers.get('X-NSU-Viewer')||''),bytes:Number(response.headers.get('Content-Length'))};
  }));
}
self.addEventListener('message', event => {
  const message = event.data || {};
  const action = async () => {
    if(message.type === 'ACTIVATE') return self.skipWaiting();
    if(message.type === 'SAVE_PDF') return savePdf(message);
    if(message.type === 'LIST_PDFS') return listPdfs();
    if(message.type === 'REMOVE_PDF') return (await caches.open(PDFS)).delete(message.url);
    if(message.type === 'CLEAR_PDFS') return caches.delete(PDFS);
    if(message.type === 'WARM') {
      // Recover resources loaded before the first worker acquired control (including a direct reader link).
      await Promise.allSettled((message.urls||[]).slice(0,120).filter(href=>cacheable(new URL(href))).map(async href => {
        const url = new URL(href), key = keyFor(url);
        const cache = await caches.open(url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname) && !url.pathname.includes('/search-index/') ? SHELL : DATA);
        if(await cache.match(key)) return;
        const response = await fetch(href,{cache:'force-cache'});
        await put(cache,key,response);
      }));
      return true;
    }
    throw new Error('Неизвестная команда.');
  };
  event.waitUntil(action().then(result=>event.ports[0]?.postMessage({ok:true,result}),error=>
    event.ports[0]?.postMessage({ok:false,error:error.name === 'QuotaExceededError' ? 'Недостаточно места на устройстве.' : error.message})));
});

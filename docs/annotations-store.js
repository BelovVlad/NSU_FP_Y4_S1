/* User data is intentionally independent of all Service Worker caches. */
(() => {
  'use strict';
  if(window.NSUAnnotations)return;
  const FORMAT = 'nsu-pdf-annotations', VERSION = 1;
  let opening;
  const changes = new EventTarget();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(FORMAT) : null;
  channel?.addEventListener('message', event => changes.dispatchEvent(new CustomEvent('change', {detail:event.data})));
  function open() {
    if (!opening) opening = new Promise((resolve,reject) => {
      const request = indexedDB.open(FORMAT, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('documents', {keyPath:['docId','revision']});
        const objects = db.createObjectStore('objects', {keyPath:['docId','revision','id']});
        objects.createIndex('document', ['docId','revision']);
      };
      request.onerror = () => { opening = null; reject(request.error); };
      request.onblocked = () => { opening = null; reject(new Error('Закройте старые вкладки приложения и повторите сохранение.')); };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {db.close();opening=null;};
        resolve(db);
      };
    });
    return opening;
  }
  async function read(store, index, key) {
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx=db.transaction(store), source=index?tx.objectStore(store).index(index):tx.objectStore(store);
      const request=source.getAll(key);
      tx.oncomplete=()=>resolve(request.result);
      tx.onabort=()=>reject(tx.error||new Error('Не удалось прочитать заметки.'));
    });
  }
  async function write(callback, detail={}) {
    const db = await open();
    await new Promise((resolve,reject) => {
      const tx = db.transaction(['documents','objects'], 'readwrite');
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(tx.error||new Error('Не удалось сохранить заметки.'));
      try {callback(tx.objectStore('documents'),tx.objectStore('objects'));}
      catch(error) {tx.abort();reject(error);}
    });
    channel?.postMessage(detail);
    changes.dispatchEvent(new CustomEvent('change',{detail}));
  }
  async function snapshot(){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['documents','objects']);
      const documents=tx.objectStore('documents').getAll(),objects=tx.objectStore('objects').getAll();
      tx.oncomplete=()=>resolve({format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),documents:documents.result,objects:objects.result});
      tx.onabort=()=>reject(tx.error);
    });
  }
  const point = p => Array.isArray(p) && (p.length===2||p.length===3) && p.every(Number.isFinite) && p.every(n=>Math.abs(n)<=1e7);
  function validate(backup) {
    const bad=()=>{throw new Error('Некорректный формат резервной копии заметок.');};
    if(backup?.format!==FORMAT||backup.version!==VERSION||!Array.isArray(backup.documents)||!Array.isArray(backup.objects))bad();
    if(backup.documents.length>10000||backup.objects.length>200000)bad();
    const keys=new Set(), ids=new Set(),pages=new Map();
    for(const doc of backup.documents){
      if(typeof doc.docId!=='string'||doc.docId.length>3000||typeof doc.revision!=='string'||doc.revision.length>300||
        typeof doc.path!=='string'||!doc.path.endsWith('.pdf')||doc.path.split('/').some(p=>p==='..')||
        !Number.isInteger(doc.pageCount)||doc.pageCount<1||doc.pageCount>100000||
        typeof doc.title!=='string'||doc.title.length>1000)bad();
      const key=JSON.stringify([doc.docId,doc.revision]);if(keys.has(key))bad();keys.add(key);pages.set(key,doc.pageCount);
    }
    for(const a of backup.objects){
      const key=JSON.stringify([a.docId,a.revision]);
      if(!keys.has(key)||typeof a.id!=='string'||!a.id||a.id.length>200||a.formatVersion!==VERSION||
        !['pen','marker','highlight','note'].includes(a.type)||!Number.isInteger(a.page)||a.page<1||a.page>pages.get(key)||
        !/^#[\da-f]{6}$/i.test(a.color)||!Number.isFinite(a.width)||a.width<=0||a.width>100||
        !Number.isFinite(a.opacity)||a.opacity<=0||a.opacity>1||
        !Number.isFinite(a.createdAt)||!Number.isFinite(a.updatedAt))bad();
      const id=JSON.stringify([a.docId,a.revision,a.id]);if(ids.has(id))bad();ids.add(id);
      if(a.type==='note'&&(!point(a.point)||typeof a.text!=='string'||a.text.length>10000))bad();
      if(['pen','marker'].includes(a.type)&&(!Array.isArray(a.points)||!a.points.length||a.points.length>100000||!a.points.every(point)))bad();
      if(a.type==='highlight'&&(!Array.isArray(a.quads)||!a.quads.length||a.quads.length>10000||!a.quads.every(q=>Array.isArray(q)&&q.length===4&&q.every(point))))bad();
    }
    return backup;
  }
  window.NSUAnnotations = {
    VERSION, changes,
    documents:()=>read('documents'),
    objects:(docId,revision)=>read('objects','document',IDBKeyRange.only([docId,revision])),
    save:(doc,objects=[],removed=[])=>write((documents,store)=>{
      documents.put(doc);
      for(const a of objects)store.put(a);
      for(const id of removed)store.delete([doc.docId,doc.revision,id]);
    },{docId:doc.docId,revision:doc.revision}),
    backup:snapshot,
    import:async backup=>{
      validate(backup);
      // Merge by object ID. Reimporting an older backup never overwrites newer work.
      return write((documents,store)=>{
        for(const doc of backup.documents){const req=documents.get([doc.docId,doc.revision]);req.onsuccess=()=>{if(!req.result||req.result.updatedAt<doc.updatedAt)documents.put(doc);};}
        for(const a of backup.objects){const req=store.get([a.docId,a.revision,a.id]);req.onsuccess=()=>{if(!req.result||req.result.updatedAt<a.updatedAt)store.put(a);};}
      },{all:true});
    },
    clear:()=>write((documents,store)=>{documents.clear();store.clear();},{all:true,deleted:true}),
    validate
  };
})();

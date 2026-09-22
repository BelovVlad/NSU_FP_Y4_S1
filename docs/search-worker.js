'use strict';

// Keep document text and its normalized form off the UI thread.
let files=[],filesByPath=new Map(),manifestPromise=null,activeRun=0;
const shardCache=new Map(),shardRequests=new Map();
const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const termsFor=query=>[...new Set(normalize(query).split(' ').filter(Boolean))];

async function fetchJson(url,cache){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{cache,signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return await response.json();
  }finally{clearTimeout(timeout)}
}
function manifest(){
  if(!manifestPromise)manifestPromise=fetchJson('search-index/manifest.json','no-cache').then(data=>{
    if(!Array.isArray(data.shards))throw new Error('Invalid search manifest');
    return data;
  }).catch(error=>{manifestPromise=null;throw error});
  return manifestPromise;
}
function loadShard(shard,index){
  const version=shard.version||index.generated_at||index.version||'';
  const key=shard.file+'?v='+encodeURIComponent(version);
  if(shardCache.has(key))return Promise.resolve(shardCache.get(key));
  if(shardRequests.has(key))return shardRequests.get(key);
  const request=fetchJson('search-index/'+key,'force-cache').then(data=>{
    if(!Array.isArray(data.records))throw new Error('Invalid search shard');
    const records=data.records.filter(record=>filesByPath.has(record.path)).map(record=>{
      const file=filesByPath.get(record.path);
      return {path:record.path,title:normalize((record.title||file.title)+' '+record.path+' '+(record.subject||file.subject)+' '+(record.section||file.section)),
        pages:(record.pages||[]).map(page=>({n:Number(page.n)||0,text:String(page.t||''),normalized:normalize(page.t)}))};
    });
    shardCache.set(key,records);return records;
  }).finally(()=>shardRequests.delete(key));
  shardRequests.set(key,request);return request;
}
function score(title,body,query,terms){
  if(!terms.length||!terms.every(term=>title.includes(term)||body.includes(term)))return -1;
  let value=(title.includes(query)?100:0)+(body.includes(query)?80:0);
  for(const term of terms){if(title.includes(term))value+=16;if(body.includes(term))value+=5}
  return value;
}
function snippet(text,terms){
  const raw=text.replace(/\s+/g,' ').trim(),low=normalize(raw);
  let at=-1;
  for(const term of terms){const found=low.indexOf(term);if(found>=0&&(at<0||found<at))at=found}
  at=Math.max(0,at);
  const start=Math.max(0,at-125),end=Math.min(raw.length,at+260);
  return (start?'…':'')+raw.slice(start,end)+(end<raw.length?'…':'');
}
function search(query,records){
  const q=normalize(query),terms=termsFor(query),groups=new Map();
  if(!terms.length)return [];
  function add(file,page,text,value){
    let group=groups.get(file.path);
    if(!group){group={path:file.path,hits:[],score:value,pages:new Set()};groups.set(file.path,group)}
    group.score=Math.max(group.score,value);
    if(!group.pages.has(page)){group.pages.add(page);group.hits.push({page,snippet:text,score:value})}
  }
  for(const file of files){
    const value=score(file.normalizedTitle,'',q,terms);
    if(value>=0)add(file,0,file.description,value+10);
  }
  for(const record of records){
    const file=filesByPath.get(record.path);
    if(!file)continue;
    for(const page of record.pages){
      const value=score(record.title,page.normalized,q,terms);
      if(value>=0)add(file,page.n,snippet(page.text,terms),value+(file.ext==='.pdf'?2:0));
    }
  }
  const result=[...groups.values()];
  for(const group of result){
    if(group.hits.some(hit=>hit.page>0))group.hits=group.hits.filter(hit=>hit.page>0);
    group.hits.sort((a,b)=>b.score-a.score||a.page-b.page);delete group.pages;
  }
  result.sort((a,b)=>b.score-a.score||filesByPath.get(a.path).title.localeCompare(filesByPath.get(b.path).title,'ru'));
  return result;
}
async function runSearch(id,query){
  activeRun=id;
  postMessage({id,type:'results',groups:search(query,[]),partial:true});
  try{
    const index=await manifest();
    if(id!==activeRun)return;
    const shards=index.shards.slice(),records=[];
    let cursor=0,loaded=0,failed=0;
    async function consume(){
      while(cursor<shards.length&&id===activeRun){
        const shard=shards[cursor++];
        try{records.push(...await loadShard(shard,index))}catch{failed++}
        loaded++;
        if(id===activeRun)postMessage({id,type:'progress',loaded,total:shards.length});
      }
    }
    await Promise.all(Array.from({length:Math.min(3,shards.length)},consume));
    if(id===activeRun)postMessage({id,type:'results',groups:search(query,records),partial:false,failed});
  }catch{
    if(id===activeRun)postMessage({id,type:'results',groups:search(query,[]),partial:false,failed:1});
  }
}
self.onmessage=event=>{
  const data=event.data;
  if(data.type==='init'){
    files=data.files.map(file=>({...file,normalizedTitle:normalize(file.title+' '+file.path+' '+file.subject+' '+file.section)}));
    filesByPath=new Map(files.map(file=>[file.path,file]));
  }else if(data.type==='search')void runSearch(data.id,data.query);
  else if(data.type==='cancel')activeRun=data.id;
};

// Text matching shared by the site search (search-worker.js), the PDF search and its highlights.

// Text extracted from PDFs: math letters (𝑞 → q), words broken by a line hyphen ("деся- тичной"),
// stray combining marks. Case is kept, so the result is fit to show as a snippet.
export const cleanText=s=>String(s||'')
  .normalize('NFKC')
  .replace(/­/g,'')
  .replace(/̸\s*=/g,' ≠')
  .replace(/\p{M}+/gu,'')
  .replace(/(\p{L})[-‐‑]\s+(?=\p{Ll})/gu,'$1')
  .replace(/\s+/g,' ')
  .trim();

// Form used for matching: lower case, ё → е, hyphens inside words dropped ("во-первых" = "вопервых").
export const normalizeText=s=>cleanText(s)
  .toLocaleLowerCase('ru-RU')
  .replace(/ё/g,'е')
  .replace(/[‐-―]/g,'-')
  .replace(/(\p{L})-(?=\p{L})/gu,'$1');

// Light Russian stemming: "интегралы", "интеграла", "интегралом" all search as "интеграл".
const ENDINGS=['иями','ется','ится','ются','ятся','ться','ями','ами','ого','его','ому','ему','ыми','ими','ией','иях','тся',
  'ях','ах','ой','ей','ий','ый','ая','яя','ое','ее','ые','ие','ую','юю','ом','ем','ам','ям','ов','ев','ью','ия','ья','ть','ет','ют','ут','ат','ят','ит',
  'ы','и','а','я','о','е','у','ю','ь','й'];
export function stemWord(word){
  if(word.length<5||!/^[а-я]+$/.test(word))return word;
  for(const ending of ENDINGS)if(word.endsWith(ending)&&word.length-ending.length>=4)return word.slice(0,-ending.length);
  return word;
}

// Query words with their stems; a page matches a word when it contains the stem.
export function searchTerms(query){
  const seen=new Set(),terms=[];
  for(const term of normalizeText(query).split(' ')){
    if(!term||seen.has(term))continue;
    seen.add(term);terms.push({term,stem:stemWord(term)});
  }
  return terms;
}

const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// The query with every word allowed any ending: "ряд тейлора" also finds "ряда тейлора".
function phrasePattern(q){
  const words=q.split(' ').filter(Boolean);
  if(!words.some(w=>stemWord(w)!==w))return null;
  return new RegExp(words.map(w=>{const stem=stemWord(w);return escapeRe(stem)+(stem!==w?'[\\p{L}\\p{N}]*':'')}).join(' '),'gu');
}
function patternMatches(text,pattern){
  const hits=[];if(!pattern)return hits;
  pattern.lastIndex=0;
  for(let m;(m=pattern.exec(text));){hits.push({start:m.index,length:m[0].length});if(!m[0].length)pattern.lastIndex++}
  return hits;
}

export function findMatches(text,q){
  const hits=[];if(!q)return hits;
  let from=0;
  while(true){const i=text.indexOf(q,from);if(i<0)break;hits.push(i);from=i+Math.max(1,q.length)}
  return hits.length?hits:patternMatches(text,phrasePattern(q)).map(hit=>hit.start);
}

// Ranges inside one text item to highlight: the whole query, or its words when the query spans items.
export function itemHighlightRanges(text,query){
  const s=normalizeText(text),q=normalizeText(query);
  if(!s||!q)return[];
  const ranges=[];
  const add=(start,length)=>ranges.push({start,length,total:s.length});
  if(s.includes(q)){for(const start of findMatches(s,q))add(start,q.length)}
  else{
    const phrase=patternMatches(s,phrasePattern(q));
    if(phrase.length)for(const hit of phrase)add(hit.start,hit.length);
    else if(q.includes(' '))for(const word of q.split(' ').filter(t=>t.length>1)){
      const exact=findMatches(s,word);
      if(exact.length)for(const start of exact)add(start,word.length);
      else for(const hit of patternMatches(s,phrasePattern(word)))add(hit.start,hit.length);
    }
  }
  ranges.sort((a,b)=>a.start-b.start||b.length-a.length);
  return ranges.filter((range,i)=>!ranges.slice(0,i).some(prev=>range.start>=prev.start&&range.start+range.length<=prev.start+prev.length));
}

// Text matching shared by the PDF search and its highlights.
export const normalizeText=s=>(s||'')
  .normalize('NFKC')
  .toLocaleLowerCase('ru-RU')
  .replace(/­/g,'')
  .replace(/ё/g,'е')
  .replace(/[‐-―]/g,'-')
  .replace(/\s+/g,' ')
  .trim();

export function findMatches(text,q){const hits=[];if(!q)return hits;let from=0;while(true){const i=text.indexOf(q,from);if(i<0)break;hits.push(i);from=i+Math.max(1,q.length)}return hits}

// Ranges inside one text item to highlight: the whole query, or its words when the query spans items.
export function itemHighlightRanges(text,query){
  const s=normalizeText(text),q=normalizeText(query);
  if(!s||!q)return[];
  const needles=s.includes(q)?[q]:(q.includes(' ')?q.split(' ').filter(t=>t.length>1&&s.includes(t)):[]);
  const ranges=[];
  for(const needle of needles){
    let from=0;
    while(from<s.length){
      const start=s.indexOf(needle,from);
      if(start<0)break;
      ranges.push({start,length:needle.length,total:s.length});
      from=start+Math.max(1,needle.length);
    }
  }
  ranges.sort((a,b)=>a.start-b.start||b.length-a.length);
  return ranges.filter((range,i)=>!ranges.slice(0,i).some(prev=>range.start>=prev.start&&range.start+range.length<=prev.start+prev.length));
}

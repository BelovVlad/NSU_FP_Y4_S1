(function(root){
  'use strict';
  const DAY=86400000;
  function dayStart(time,rules){
    const offset=rules.utcOffsetHours*3600000;
    return Math.floor((time+offset)/DAY)*DAY-offset;
  }
  function firstDeadline(series,rules){
    return Date.parse(series.firstDate+'T00:00:00Z')+DAY+(rules.deadlineHour-rules.utcOffsetHours)*3600000;
  }
  function status(rules,counts,time){
    const rows=rules.series.map(s=>{
      const due=Math.max(0,Math.floor((time-firstDeadline(s,rules))/(7*DAY))+1);
      const actual=counts[s.id]||0;
      return {...s,due,actual,sectionComplete:actual>0&&actual>=due};
    });
    return rows.map(row=>({...row,complete:row.sectionComplete&&(!rules.requireWholeSubject||
      rows.filter(s=>s.subject===row.subject).every(s=>s.actual>=s.due)),
      blockedBySubject:row.sectionComplete&&!!rules.requireWholeSubject&&rows.some(s=>s.subject===row.subject&&s.actual<s.due)}));
  }
  function graceEnd(time,rules){
    let day=dayStart(time,rules);
    while(!rules.workingWeekdays.includes(new Date(day+rules.utcOffsetHours*3600000).getUTCDay()))day+=DAY;
    return day+DAY+rules.deadlineHour*3600000;
  }
  function calculate(history,now=Date.now()){
    const rules=history.rules;
    if(rules.series.length!==8)throw new Error('Karma requires eight tracked series');
    const snapshots=history.snapshots.map(s=>({...s,time:Date.parse(s.at)})).filter(s=>s.time<=now).sort((a,b)=>a.time-b.time);
    if(!snapshots.length)throw new Error('No karma history for this date');
    const begin=snapshots[0].time;
    const times=new Set(snapshots.map(s=>s.time));
    for(const s of rules.series){
      for(let t=firstDeadline(s,rules);t<=now;t+=7*DAY)if(t>=begin)times.add(t);
    }
    times.add(now);
    const fixed=[...times].sort((a,b)=>a-b);
    let index=0,snapshot=0,counts={},level=null,raw=0,stableSince=null,fullSince=null;
    let shield=false,protectedUntil=null,rows=[],time=begin;
    const changes=[];
    while(time<=now){
      // A completed seven-day interval earns protection even if a deadline is simultaneous.
      if(level!==null&&!shield&&protectedUntil===null&&stableSince!==null&&time-stableSince>=rules.reinforcementDays*DAY){
        shield=true;changes.push({at:time,type:'reinforced',level});
      }
      while(snapshot<snapshots.length&&snapshots[snapshot].time<=time)counts=snapshots[snapshot++].counts;
      rows=status(rules,counts,time);
      raw=rows.filter(s=>s.complete).length;
      if(raw===8){if(fullSince===null)fullSince=time}else fullSince=null;
      const target=raw===8&&time-fullSince>=rules.maximumDays*DAY?9:raw;
      const before=level;
      if(level===null){level=target;stableSince=time}
      else if(protectedUntil!==null){
        if(target>=level){
          protectedUntil=null;level=target;stableSince=time;
        }else if(time>=protectedUntil){
          protectedUntil=null;level=target;stableSince=time;
          changes.push({at:time,type:'protection-lost',level});
        }
      }else if(target!==level){
        if(target<level&&shield){
          shield=false;protectedUntil=graceEnd(time,rules);stableSince=null;
          changes.push({at:time,type:'protected',level});
        }else{
          level=target;stableSince=time;shield=false;
        }
      }
      if(level!==before)changes.push({at:time,type:before===null?'initial':level>before?'increase':'decrease',level});
      if(!shield&&protectedUntil===null&&stableSince!==null&&time-stableSince>=rules.reinforcementDays*DAY){
        shield=true;changes.push({at:time,type:'reinforced',level});
      }
      if(time===now)break;
      while(index<fixed.length&&fixed[index]<=time)index++;
      const candidates=[fixed[index],protectedUntil,
        !shield&&stableSince!==null?stableSince+rules.reinforcementDays*DAY:null,
        fullSince!==null?fullSince+rules.maximumDays*DAY:null].filter(t=>Number.isFinite(t)&&t>time);
      time=Math.min(...candidates,now);
    }
    const nextDeadlines=rules.series.map(s=>{
      const first=firstDeadline(s,rules);
      return first+Math.max(0,Math.floor((now-first)/(7*DAY))+1)*7*DAY;
    });
    return {level,raw,rows,shield,protectedUntil,stableSince,fullSince,changes,
      observedFrom:begin,nextDeadline:Math.min(...nextDeadlines),
      reinforcementAt:!shield&&protectedUntil===null?stableSince+rules.reinforcementDays*DAY:null,
      maximumAt:fullSince!==null?fullSince+rules.maximumDays*DAY:null};
  }
  const api={calculate,status,graceEnd,DAY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.KarmaEngine=api;
})(typeof window!=='undefined'?window:globalThis);

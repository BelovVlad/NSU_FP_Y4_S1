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
  function firstLessonEnd(series,rules){
    if(!/^\d{2}:\d{2}$/.test(series.end||''))return null;
    const [hours,minutes]=series.end.split(':').map(Number);
    return Date.parse(series.firstDate+'T00:00:00Z')+
      ((hours-rules.utcOffsetHours)*60+minutes)*60000;
  }
  function status(rules,counts,time){
    const rows=rules.series.map(s=>{
      const due=Math.max(0,Math.floor((time-firstDeadline(s,rules))/(7*DAY))+1);
      const actual=counts[s.id]||0;
      const deadline=firstDeadline(s,rules)+due*7*DAY;
      const lessonEnd=firstLessonEnd(s,rules);
      const waiting=lessonEnd!==null&&time>=lessonEnd+due*7*DAY&&time<deadline&&actual<due+1;
      return {...s,due,actual,waiting,waitingUntil:waiting?deadline:null,
        sectionComplete:actual>0&&actual>=due};
    });
    return rows.map(row=>({...row,complete:row.sectionComplete&&(!rules.requireWholeSubject||
      rows.filter(s=>s.subject===row.subject).every(s=>s.actual>=s.due)),
      blockedBySubject:row.sectionComplete&&!!rules.requireWholeSubject&&rows.some(s=>s.subject===row.subject&&s.actual<s.due)}));
  }
  function graceEnd(time,rules){
    const boundary=dayStart(time,rules)+rules.deadlineHour*3600000;
    return boundary>time?boundary:boundary+DAY;
  }
  function calculate(history,now=Date.now()){
    const rules=history.rules;
    if(rules.series.length!==8)throw new Error('Karma requires eight tracked series');
    const snapshots=history.snapshots.map(s=>({...s,time:Date.parse(s.at)})).filter(s=>s.time<=now).sort((a,b)=>a.time-b.time);
    if(!snapshots.length)throw new Error('No karma history for this date');
    const begin=snapshots[0].time;
    const firstDayEnd=graceEnd(begin,rules);
    const times=new Set([...snapshots.map(s=>s.time),now]);
    for(let t=firstDayEnd;t<=now;t+=DAY)times.add(t);
    let snapshot=0,counts={},level=0,stableSince=begin,fullSince=null;
    let shield=false,protectedUntil=null,rows=[],rewardDay=null,gainedToday=false,allSectionsInDebt=false,lastFlowerDay=null;
    const allInDebt=rows=>rows.every(row=>row.actual<row.due);
    const changes=[{at:begin,type:'initial',level}];
    for(const time of [...times].sort((a,b)=>a-b)){
      const day=dayStart(time-rules.deadlineHour*3600000,rules);
      const previousRows=status(rules,counts,time);
      if(day!==rewardDay){
        rewardDay=day;gainedToday=false;allSectionsInDebt=false;
      }
      // Compare counts at the same deadline: passage of time is never repayment.
      if(snapshot>0&&allInDebt(previousRows))allSectionsInDebt=true;
      const hasBaseline=snapshot>0;
      // Uploads at 09:00 count before that day's assessment.
      while(snapshot<snapshots.length&&snapshots[snapshot].time<=time)counts=snapshots[snapshot++].counts;
      rows=status(rules,counts,time);
      const debt=rows.some(row=>row.actual<row.due);
      const repaid=hasBaseline&&rows.some((row,i)=>
        Math.max(0,previousRows[i].due-previousRows[i].actual)>Math.max(0,row.due-row.actual));
      if(allInDebt(rows))allSectionsInDebt=true;
      if(repaid&&allSectionsInDebt&&!debt&&lastFlowerDay!==day){
        shield=true;protectedUntil=null;lastFlowerDay=day;
        changes.push({at:time,type:'reinforced',level});
      }
      if(!debt)protectedUntil=null;
      const before=level;
      if(time>=firstDayEnd&&(time-firstDayEnd)%DAY===0){
        if(protectedUntil!==null&&time>=protectedUntil){
          protectedUntil=null;
          changes.push({at:time,type:'protection-lost',level});
        }
        if(debt){
          if(shield){
            shield=false;protectedUntil=time+DAY;
            changes.push({at:time,type:'protected',level});
          }else level=Math.max(0,level-1);
        }
      }
      if(repaid&&!debt&&!gainedToday){
        gainedToday=true;
        if(level<8)level++;
        else if(level===8&&fullSince!==null&&time-fullSince>=7*DAY)level=9;
      }
      if(level!==before){
        stableSince=time;
        changes.push({at:time,type:level>before?'increase':'decrease',level});
        if(level===8)fullSince=time;
        else if(level<8)fullSince=null;
      }
    }
    return {level,raw:rows.filter(row=>row.complete).length,rows,shield,protectedUntil,
      stableSince,fullSince,changes,observedFrom:begin,nextDeadline:graceEnd(now,rules),
      reinforcementAt:null,maximumAt:fullSince!==null?fullSince+7*DAY:null};
  }
  const api={calculate,status,graceEnd,DAY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.KarmaEngine=api;
})(typeof window!=='undefined'?window:globalThis);

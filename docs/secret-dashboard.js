(() => {
  'use strict';

  const DASH_ID = 'secretAcademicDashboard';
  const TZ = 'Asia/Novosibirsk';

  const TRACKED_SERIES = [
    {subject:'ОВФ', section:'Лекции', label:'Лекции', weekday:2, start:'12:40', end:'14:15', firstDate:'2026-09-01'},
    {subject:'ТДиСФ', section:'Лекции', label:'Лекции', weekday:5, start:'10:50', end:'12:25', firstDate:'2026-09-04'},
    {subject:'ТДиСФ', section:'Семинары', label:'Семинары', weekday:5, start:'12:40', end:'14:15', firstDate:'2026-09-04'},
    {subject:'ФКСВ', section:'Семинары', label:'Семинары', weekday:6, start:'12:40', end:'14:15', firstDate:'2026-09-05'},
    {subject:'ФЭЧ', section:'Семинары', label:'Семинары', weekday:4, start:'09:20', end:'10:55', firstDate:'2026-09-03'},
    {subject:'ФЭЧ', section:'Лекции', label:'Лекции', weekday:4, start:'11:00', end:'12:35', firstDate:'2026-09-03'},
    {subject:'ФиХАиМ', section:'Лекции', label:'Лекции', weekday:2, start:'14:30', end:'16:05', firstDate:'2026-09-01'},
    {subject:'ФиХАиМ', section:'Семинары', label:'Семинары', weekday:2, start:'16:20', end:'17:55', firstDate:'2026-09-01'}
  ];

  const SCHEDULE = [
    {day:1, time:'10:50', end:'12:25', name:'БЖД', kind:'лек', room:'БА'},
    {day:1, time:'12:40', end:'14:15', name:'Физ. конд. сост. в.', kind:'лек', room:'315 ГК', teacher:'Брагинский Л.С.', subject:'ФКСВ'},
    {day:1, time:'14:30', end:'16:05', name:'Ин. яз.', kind:'пр', room:'326 ГК', teacher:'Сапченко Н.А.'},
    {day:1, time:'16:20', end:'17:55', name:'Осн. пр. деят.', kind:'лек', room:'6А', teacher:'Голышев В.М.'},

    {day:2, time:'09:00', end:'10:35', name:'Ин. яз.', kind:'пр', room:'326 ГК', teacher:'Сапченко Н.А.'},
    {day:2, time:'12:40', end:'14:15', name:'ОВФ', kind:'лек', room:'МА', teacher:'Усов Э.В.', trackedSection:'Лекции'},
    {day:2, time:'14:30', end:'16:05', name:'ФиХАиМ', kind:'лек', room:'315 ГК', teacher:'Горбунов О.А.', trackedSection:'Лекции'},
    {day:2, time:'16:20', end:'17:55', name:'ФиХАиМ', kind:'пр', room:'321 ГК', teacher:'Горбунов О.А.', trackedSection:'Семинары'},

    {day:3, time:'15:35', end:'17:40', name:'ТЛЭС', kind:'лек', room:'ИЯФ · ауд. 5006', teacher:'Суханов Д.П.', source:'ИЯФ'},
    {day:3, time:'18:10', end:'19:45', name:'ТЛЭС', kind:'пр', room:'ИЯФ', teacher:'Суханов Д.П.', note:'нечётная неделя', source:'группа'},

    {day:4, time:'09:20', end:'10:55', name:'ФЭЧ', kind:'сем', room:'ИЯФ · ГК пристр., ауд. 500М', teacher:'Шварц Б.А.', trackedSection:'Семинары', source:'ИЯФ'},
    {day:4, time:'11:00', end:'12:35', name:'ФЭЧ', kind:'лек', room:'ИЯФ · ГК пристр., ауд. 500М', teacher:'Винокуров А.Н.', trackedSection:'Лекции', source:'ИЯФ'},
    {day:4, time:'13:00', end:'16:20', name:'Электродинамика СВЧ', kind:'практикум', room:'ИЯФ · ГК, 5 этаж, ауд. 505', teacher:'Запрягаев И.А., Чернов К.Н.', source:'ИЯФ'},

    {day:5, time:'10:50', end:'12:25', name:'ТДиСФ 2', kind:'лек', room:'315 ГК', teacher:'Грабовский А.В.', trackedSection:'Лекции'},
    {day:5, time:'12:40', end:'14:15', name:'ТДиСФ 2', kind:'пр', room:'401 ГК', teacher:'Глинский В.В.', trackedSection:'Семинары'},
    {day:5, time:'16:20', end:'17:55', name:'Контрольные раб.', kind:'пр'},

    {day:6, time:'09:00', end:'10:35', name:'ОВФ', kind:'пр', room:'т307 ГК', teacher:'Усов Э.В.', trackedSection:'Семинары'},
    {day:6, time:'12:40', end:'14:15', name:'Физ. конд. сост. в.', kind:'пр', room:'206 ГК', teacher:'Махмудиан М.М.', subject:'ФКСВ', trackedSection:'Семинары'}
  ];

  const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const state = { busy:false, scheduleFilter:'all', lastData:null };
  let karmaView=null,karmaTimer=null,karmaFresh=false;

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }
  function minutes(hhmm){const [h,m]=hhmm.split(':').map(Number);return h*60+m}
  function utcDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
  function isoFromUTC(date){return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`}
  function addDays(iso,days){const d=utcDate(iso);d.setUTCDate(d.getUTCDate()+days);return isoFromUTC(d)}
  function weekdayOf(iso){return utcDate(iso).getUTCDay()}

  function nskNow(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    const date=`${map.year}-${map.month}-${map.day}`;
    return {date,minutes:Number(map.hour)*60+Number(map.minute),weekday:weekdayOf(date)};
  }
  function formatChecked(){
    return new Intl.DateTimeFormat('ru-RU',{timeZone:TZ,day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · Новосибирск';
  }
  function formatDateRu(iso){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(utcDate(iso))}

  function createDashboard(){
    let root=document.getElementById(DASH_ID);
    if(root)return root;
    root=document.createElement('div');
    root.id=DASH_ID;
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="secret-academic-backdrop" data-secret-close></div>
      <section class="secret-academic-shell" role="dialog" aria-modal="true" aria-labelledby="secretAcademicTitle">
        <div class="secret-academic-scroll">
          <header class="secret-academic-head">
            <div>
              <div class="secret-academic-kicker">hidden dashboard</div>
              <h2 class="secret-academic-title" id="secretAcademicTitle">Состояние конспектов</h2>
              <div class="secret-academic-sub" id="secretAcademicChecked">Данные ещё не загружены</div>
            </div>
            <div class="secret-academic-actions">
              <button class="secret-academic-btn" type="button" id="secretAcademicRefresh">Обновить</button>
              <button class="secret-academic-btn icon" type="button" data-secret-close aria-label="Закрыть">×</button>
            </div>
          </header>
          <div class="secret-academic-alert" id="secretAcademicAlert"></div>
          <div class="secret-academic-grid">
            <section class="karma-card" id="secretAcademicKarma" aria-label="Карма"></section>
            <section class="secret-academic-card">
              <div class="secret-academic-card-head"><h3 class="secret-academic-card-title">Статистика</h3><div class="secret-academic-card-note">лекции и семинары</div></div>
              <div class="secret-academic-card-body" id="secretAcademicSummary"><div class="secret-academic-loading"><i class="secret-academic-spinner"></i>Ожидаю открытия…</div></div>
            </section>
            <section class="secret-academic-card">
              <div class="secret-academic-card-head"><h3 class="secret-academic-card-title">Сегодня</h3><div class="secret-academic-card-note" id="secretAcademicTodayDate"></div></div>
              <div class="secret-academic-card-body" id="secretAcademicToday"></div>
            </section>
            <section class="secret-academic-card wide">
              <div class="secret-academic-card-head"><h3 class="secret-academic-card-title">По предметам</h3><div class="secret-academic-card-note">сравнение с количеством уже прошедших занятий</div></div>
              <div class="secret-academic-card-body" id="secretAcademicSubjects"></div>
            </section>
            <section class="secret-academic-card wide">
              <div class="secret-academic-card-head">
                <h3 class="secret-academic-card-title">Расписание</h3>
                <div class="secret-schedule-tabs" id="secretScheduleTabs">
                  <button class="secret-schedule-tab active" type="button" data-filter="all">Всё</button>
                  <button class="secret-schedule-tab" type="button" data-filter="tracked">Отслеживаемое</button>
                  <button class="secret-schedule-tab" type="button" data-filter="iyaf">ИЯФ</button>
                </div>
              </div>
              <div class="secret-academic-card-body"><div class="secret-schedule-wrap"><div class="secret-schedule" id="secretAcademicSchedule"></div></div></div>
            </section>
          </div>
          <div class="secret-academic-foot"><span>Статистика загружается только после двойного клика по эмблеме.</span><span>План считается по недельному расписанию; переносы и отмены можно учесть отдельно.</span></div>
        </div>
      </section>`;
    document.body.appendChild(root);
    karmaView=new window.KarmaView(root.querySelector('#secretAcademicKarma'));
    root.querySelectorAll('[data-secret-close]').forEach(el=>el.addEventListener('click',closeDashboard));
    root.querySelector('#secretAcademicRefresh').addEventListener('click',()=>refreshDashboard());
    root.querySelector('#secretScheduleTabs').addEventListener('click',e=>{
      const btn=e.target.closest('[data-filter]'); if(!btn)return;
      state.scheduleFilter=btn.dataset.filter;
      root.querySelectorAll('.secret-schedule-tab').forEach(x=>x.classList.toggle('active',x===btn));
      renderSchedule();
    });
    return root;
  }

  function openDashboard(){
    const root=createDashboard();
    if(root.classList.contains('is-open'))return false;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    karmaFresh=true;
    clearInterval(karmaTimer);
    karmaTimer=setInterval(()=>{
      if(document.visibilityState==='visible')refreshDashboard();
    },30000);
    renderSchedule();
    refreshDashboard();
    return true;
  }
  function closeDashboard(){
    const root=document.getElementById(DASH_ID); if(!root)return;
    root.classList.remove('is-open'); root.setAttribute('aria-hidden','true'); document.body.style.overflow='';
    clearInterval(karmaTimer);karmaView?.stop();
  }

  async function fetchDashboardData(){
    const [structureRes,filesRes,history]=await Promise.all([
      fetch('search-index/structure.json',{cache:'no-cache'}),
      fetch('search-index/files.json',{cache:'no-cache'}),
      fetch('search-index/karma-history.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null)
    ]);
    if(!structureRes.ok)throw new Error(`structure.json: ${structureRes.status}`);
    if(!filesRes.ok)throw new Error(`files.json: ${filesRes.status}`);
    return {structure:await structureRes.json(),files:await filesRes.json(),history};
  }

  function actualForSeries(series,data){
    const groups=Array.isArray(data?.structure?.groups)?data.structure.groups:[];
    const group=groups.find(g=>g.subject===series.subject&&g.section===series.section);
    if(group&&Array.isArray(group.items))return group.items.length;
    if(series.fallback==='ovf-files'){
      const rows=Array.isArray(data?.files?.files)?data.files.files:[];
      return rows.filter(x=>x.subject==='ОВФ'&&x.section==='Семинары'&&/\.(ipynb|pdf)$/i.test(x.path||'')&&!(x.path||'').includes('/LaTeX/')).length;
    }
    return 0;
  }

  function occurrenceState(series,now){
    const dates=[];
    for(let d=series.firstDate;d<=now.date;d=addDays(d,7)){
      if(d<now.date||(d===now.date&&now.minutes>=minutes(series.end)))dates.push(d);
    }
    return {due:dates.length,dates};
  }
  function nextOccurrence(series,now){
    let d=series.firstDate;
    while(d<now.date)d=addDays(d,7);
    if(d===now.date&&now.minutes>minutes(series.end))d=addDays(d,7);
    return d;
  }
  function buildStats(data){
    const now=nskNow();
    const series=TRACKED_SERIES.map(s=>{
      const occurrence=occurrenceState(s,now);
      const due=occurrence.due;
      const actual=actualForSeries(s,data);
      const covered=Math.min(actual,due);
      const missing=Math.max(due-actual,0);
      const missingDates=missing?occurrence.dates.slice(covered):[];
      return {...s,due,actual,covered,missing,missingDates,ahead:Math.max(actual-due,0),next:nextOccurrence(s,now)};
    });
    const expected=series.reduce((a,x)=>a+x.due,0);
    const covered=series.reduce((a,x)=>a+x.covered,0);
    const missing=series.reduce((a,x)=>a+x.missing,0);
    const ahead=series.reduce((a,x)=>a+x.ahead,0);
    return {now,series,expected,covered,missing,ahead};
  }
  function badge(text,cls){return `<span class="secret-badge ${cls}">${esc(text)}</span>`}

  function renderSummary(stats){
    const node=document.querySelector('#secretAcademicSummary');
    const pct=stats.expected?Math.round(stats.covered/stats.expected*100):100;
    node.innerHTML=`
      <div class="secret-academic-metrics">
        <div class="secret-academic-metric"><div class="secret-academic-metric-label">По плану</div><div class="secret-academic-metric-value warm">${stats.expected}</div></div>
        <div class="secret-academic-metric"><div class="secret-academic-metric-label">Закрыто</div><div class="secret-academic-metric-value good">${stats.covered}</div></div>
        <div class="secret-academic-metric"><div class="secret-academic-metric-label">Не хватает</div><div class="secret-academic-metric-value ${stats.missing?'bad':'good'}">${stats.missing}</div></div>
        <div class="secret-academic-metric"><div class="secret-academic-metric-label">Готовность</div><div class="secret-academic-metric-value">${pct}%</div></div>
      </div>`;
  }

  function renderToday(stats){
    const node=document.querySelector('#secretAcademicToday');
    document.querySelector('#secretAcademicTodayDate').textContent=formatDateRu(stats.now.date);
    const todaySeries=stats.series.filter(s=>weekdayOf(stats.now.date)===s.weekday&&stats.now.date>=s.firstDate);
    if(!todaySeries.length){
      const next=[...stats.series].sort((a,b)=>a.next.localeCompare(b.next)||a.start.localeCompare(b.start))[0];
      node.innerHTML=`<div class="secret-empty">Сегодня отслеживаемых лекций и семинаров нет.${next?`<br>Следующее: <strong>${esc(next.subject)} · ${esc(next.label)}</strong> — ${formatDateRu(next.next)} в ${esc(next.start)}.`:''}</div>`;
      return;
    }
    node.innerHTML=`<div class="secret-academic-today">${todaySeries.map(s=>{
      const start=minutes(s.start),end=minutes(s.end);
      let status;
      if(stats.now.minutes<start)status=badge('позже сегодня','wait');
      else if(stats.now.minutes<end)status=badge('идёт сейчас','info');
      else status=s.actual>=s.due?badge('добавлено','ok'):badge('не добавлено','miss');
      return `<div class="secret-today-row"><div class="secret-today-time">${esc(s.start)}</div><div><div class="secret-today-title">${esc(s.subject)} · ${esc(s.label)}</div><div class="secret-today-sub">до ${esc(s.end)} · сейчас в индексе ${s.actual}</div></div>${status}</div>`;
    }).join('')}</div>`;
  }

  function renderSubjects(stats){
    const node=document.querySelector('#secretAcademicSubjects');
    const debts=stats.series.filter(s=>s.missing>0);
    node.innerHTML=`
      <div class="secret-academic-card-note" style="text-align:left;margin-bottom:7px">Что сейчас не закрыто</div>
      <div class="secret-debt-list">${debts.length?debts.map(d=>`<div class="secret-debt"><i class="secret-debt-dot"></i><div><div class="secret-debt-name">${esc(d.subject)} · ${esc(d.label)}</div><div class="secret-debt-sub">нужно восполнить за ${d.missingDates.map(formatDateRu).join(', ')} · по расписанию должно быть ${d.due}, в индексе ${d.actual}</div></div><div class="secret-debt-count">−${d.missing}</div></div>`).join(''):'<div class="secret-empty">По расписанию всё закрыто.</div>'}</div>`;
  }

  function isTrackedLesson(lesson){
    if(!lesson.trackedSection)return false;
    const subject=lesson.subject||(lesson.name.startsWith('ТДиСФ')?'ТДиСФ':lesson.name);
    return TRACKED_SERIES.some(s=>s.subject===subject&&s.section===lesson.trackedSection);
  }
  function renderSchedule(){
    const node=document.querySelector('#secretAcademicSchedule'); if(!node)return;
    const now=nskNow();
    node.innerHTML=[1,2,3,4,5,6].map(day=>{
      let lessons=SCHEDULE.filter(x=>x.day===day);
      if(state.scheduleFilter==='tracked')lessons=lessons.filter(isTrackedLesson);
      if(state.scheduleFilter==='iyaf')lessons=lessons.filter(x=>x.source==='ИЯФ');
      const html=lessons.length?lessons.map(x=>{
        const tracked=isTrackedLesson(x);
        const meta=[x.room,x.teacher].filter(Boolean).map(esc).join('<br>');
        const tags=[x.kind,x.note,x.source&&x.source!=='группа'?x.source:''].filter(Boolean).map(t=>`<span class="secret-lesson-tag">${esc(t)}</span>`).join(' ');
        return `<div class="secret-lesson ${tracked?'tracked':''}"><div class="secret-lesson-time">${esc(x.time)}–${esc(x.end)}</div><div class="secret-lesson-name">${esc(x.name)}</div>${meta?`<div class="secret-lesson-meta">${meta}</div>`:''}${tags}</div>`;
      }).join(''):'<div class="secret-empty" style="margin:8px">—</div>';
      return `<section class="secret-day ${now.weekday===day?'today':''}"><div class="secret-day-head"><span class="secret-day-name">${DAY_NAMES[day]}</span><span class="secret-day-count">${lessons.length}</span></div><div class="secret-day-body">${html}</div></section>`;
    }).join('');
  }

  async function refreshDashboard(){
    if(state.busy)return;
    const root=createDashboard(); state.busy=true;
    const btn=root.querySelector('#secretAcademicRefresh'),checked=root.querySelector('#secretAcademicChecked'),alert=root.querySelector('#secretAcademicAlert');
    btn.disabled=true;
    checked.innerHTML='<span class="secret-academic-loading"><i class="secret-academic-spinner"></i>Проверяю индекс лекций и семинаров…</span>';
    alert.classList.remove('show');
    try{
      const data=await fetchDashboardData(); state.lastData=data;
      const stats=buildStats(data);
      renderSummary(stats); renderToday(stats); renderSubjects(stats); renderSchedule();
      if(root.classList.contains('is-open')){
        try{
          if(!data.history||data.history.rules.series.some(s=>actualForSeries(s,data)!==data.history.currentCounts[s.id]))throw new Error('Karma index mismatch');
          karmaView.render(window.KarmaEngine.calculate(data.history),Date.now(),karmaFresh);
          karmaFresh=false;
        }catch{karmaView.error()}
      }
      checked.textContent=`Проверено: ${formatChecked()}`;
    }catch(error){
      karmaView?.error();
      console.error('[secret-dashboard]',error);
      alert.textContent='Не удалось обновить статистику. Расписание доступно, но индекс материалов сейчас не загрузился.';
      alert.classList.add('show'); checked.textContent='Ошибка проверки индекса';
      if(!state.lastData){
        root.querySelector('#secretAcademicSummary').innerHTML='<div class="secret-empty">Нет данных для расчёта статистики.</div>';
        root.querySelector('#secretAcademicToday').innerHTML='<div class="secret-empty">Нет данных.</div>';
        root.querySelector('#secretAcademicSubjects').innerHTML='<div class="secret-empty">Нет данных.</div>';
      }
    }finally{state.busy=false;btn.disabled=false}
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById(DASH_ID)?.classList.contains('is-open'))closeDashboard()});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&document.getElementById(DASH_ID)?.classList.contains('is-open'))refreshDashboard();
    else if(document.visibilityState==='hidden'){karmaView?.stop();karmaFresh=true}
  });
  window.openSecretAcademicDashboard=openDashboard;
})();

/* Particle Explorer: presentation state is separate from the unchanged PDG demo data. */
(() => {
  'use strict';
  const D = window.PARTICLE_DATA;
  if (!D) {
    document.querySelector('#viewTitle').textContent = 'Данные не загрузились. Обновите страницу.';
    return;
  }
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const svg = $('#world'), viewport = $('#viewport'), wrap = $('#canvasWrap');
  const content = $('#modeContent'), search = $('#search');
  const byId = new Map(D.particles.map(p => [p.id, p]));
  const groups = new Map(D.groups.map(g => [g.id, g]));
  const colors = {rose:'#ff527c', orange:'#ff8954', violet:'#c176ff', gold:'#ffd16b', blue:'#498fff', green:'#53e592', purple:'#ae73ff', pearl:'#bbcfdf'};
  const edgeColors = {strong:'#ff466b', em:'#52b6ff', weak:'#53e592', composition:'#bd87ff', mixing:'#ffba75', family:'#aebdcc'};
  const edgeNames = {strong:'сильное', em:'электромагнитное', weak:'слабое', composition:'кварковый состав', mixing:'смешивание', family:'семейство'};
  const modeNames = {graph:'Карта взаимодействий', classification:'Иерархия частиц', table:'Таблица частиц', composition:'Кварковый состав', decays:'Локальные каналы распада'};
  const layout = {
    light:{cx:330,cy:265,rx:295,ry:220}, strange:{cx:355,cy:605,rx:290,ry:180},
    charm:{cx:350,cy:895,rx:280,ry:155}, bosons:{cx:925,cy:735,rx:190,ry:315},
    baryons:{cx:1450,cy:400,rx:300,ry:330}, leptons:{cx:355,cy:1125,rx:320,ry:145},
    quarks:{cx:1450,cy:1060,rx:300,ry:170}
  };
  const labels = {light:'Лёгкие мезоны',strange:'Странные мезоны',charm:'Charm / charmonium',bosons:'Бозоны',baryons:'Барионы',leptons:'Лептоны',quarks:'Кварки'};
  const positions = new Map(D.particles.map(p => {
    const old = groups.get(p.group), box = layout[p.group];
    return [p.id, {x:box.cx+(p.x-old.cx)*box.rx/old.rx,y:box.cy+(p.y-old.cy)*box.ry/old.ry,r:p.r}];
  }));
  const overrides = {pi0:[925,225],eta:[845,320],etap:[1005,320],g:[925,445],gamma:[925,595],wm:[820,775],z0:[925,760],wp:[1030,775],h:[925,935]};
  Object.entries(overrides).forEach(([id,[x,y]]) => Object.assign(positions.get(id),{x,y}));
  let mode='graph', selected=null, current='pip', activeGroup='all', detailTab='properties';
  let query='', charge='all', spin='all', scale=1, tx=0, ty=0, autoFit=true;
  let sortKey='pdg', sortDirection=1, lastSheetTrigger=null;
  const enabledEdges=new Set(Object.keys(edgeColors));
  const nodeElements=new Map(), edgeElements=new Map(), hullElements=new Map(), miniElements=new Map();
  const escape = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).toLocaleLowerCase('ru').replace(/ё/g,'е');
  const isMobile = () => matchMedia('(max-width:900px)').matches;
  function el(tag, attrs={}, text='') {
    const item=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>item.setAttribute(key,value));
    if(text) item.textContent=text;
    return item;
  }
  function tone(p) {
    if(['pi0','eta','etap','g'].includes(p.id)) return 'pearl';
    if(p.id==='gamma') return 'blue';
    return groups.get(p.group).tone;
  }
  function baseVisible(p) {
    const sign=p.charge.startsWith('−')||p.charge.startsWith('-')?'negative':p.charge.startsWith('+')?'positive':'neutral';
    return (activeGroup==='all'||p.group===activeGroup) && (charge==='all'||charge===sign) && (spin==='all'||spin===p.spin);
  }
  function matches(p) {
    return !query || normalize([p.symbol,p.name,p.ru,p.pdg,...(p.aliases||[])].join(' ')).includes(query);
  }
  const filtered = () => D.particles.filter(p=>baseVisible(p)&&matches(p));
  function neighbors(id) {
    const related=new Set([id]);
    D.edges.forEach(e=>{
      if(!enabledEdges.has(e.kind)) return;
      if(e.from===id) related.add(e.to);
      if(e.to===id) related.add(e.from);
    });
    return related;
  }
  function buildGraph() {
    const defs=$('#worldDefs');
    Object.entries(colors).forEach(([key,color])=>{
      const gradient=el('radialGradient',{id:'sphere-'+key,cx:'30%',cy:'25%',r:'80%'});
      [['0%','#fff5f8'],['12%',color],['48%',color],['100%','#07101f']].forEach(([offset,fill])=>gradient.append(el('stop',{offset,'stop-color':fill})));
      defs.append(gradient);
      const aura=el('radialGradient',{id:'aura-'+key});
      [['0%',.04],['70%',.08],['90%',.3],['100%',0]].forEach(([offset,opacity])=>aura.append(el('stop',{offset,'stop-color':color,'stop-opacity':opacity})));
      defs.append(aura);
    });
    Object.entries(edgeColors).forEach(([kind,color])=>{
      const marker=el('marker',{id:'arrow-'+kind,markerWidth:8,markerHeight:8,refX:7,refY:4,orient:'auto',markerUnits:'userSpaceOnUse',viewBox:'0 0 8 8'});
      marker.append(el('path',{d:'M0 0 L8 4 L0 8 L2 4 Z',fill:color}));
      defs.append(marker);
    });
    D.groups.forEach(g=>{
      const box=layout[g.id], holder=el('g',{'data-group':g.id});
      holder.append(el('ellipse',{...{cx:box.cx,cy:box.cy,rx:box.rx*1.12,ry:box.ry*1.12},fill:'url(#aura-'+g.tone+')'}));
      [1,.97,.89].forEach((factor,index)=>holder.append(el('ellipse',{cx:box.cx,cy:box.cy,rx:box.rx*factor,ry:box.ry*factor,fill:colors[g.tone],stroke:colors[g.tone],class:'group-shell',style:'stroke-opacity:'+(index===0?.65:.2)})));
      const count=D.particles.filter(p=>p.group===g.id).length;
      holder.append(el('text',{x:box.cx,y:g.id==='bosons'?box.cy+box.ry-20:box.cy-box.ry+30,fill:colors[g.tone],class:'group-label','text-anchor':'middle'},labels[g.id]+' ('+count+')'));
      $('#hulls').append(holder); hullElements.set(g.id,holder);
    });
    const neutral=el('g');
    [1,.9].forEach(f=>neutral.append(el('ellipse',{cx:925,cy:285,rx:145*f,ry:135*f,fill:'url(#aura-pearl)',stroke:'#9aafc4','stroke-opacity':.25,'stroke-dasharray':'6 8'})));
    neutral.append(el('text',{x:925,y:125,class:'bridge-label','text-anchor':'middle'},'Нейтральные состояния'));
    neutral.append(el('text',{x:925,y:395,class:'group-subtitle','text-anchor':'middle'},'Мосты взаимодействий'));
    $('#hulls').append(neutral);
    D.edges.forEach(edge=>{
      const a=positions.get(edge.from),b=positions.get(edge.to);
      if(!a||!b) return;
      // Stop each arrow at the sphere boundary, so direction remains visible.
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
      const ax=a.x+ux*(a.r+3),ay=a.y+uy*(a.r+3),bx=b.x-ux*(b.r+6),by=b.y-uy*(b.r+6);
      const path=el('path',{class:'edge',stroke:edgeColors[edge.kind],style:'color:'+edgeColors[edge.kind],d:`M${ax} ${ay} Q${(ax+bx)/2-dy*.07} ${(ay+by)/2+dx*.07} ${bx} ${by}`,'data-id':edge.id,'data-from':edge.from,'data-to':edge.to,'data-kind':edge.kind});
      if(edge.kind!=='family') path.setAttribute('marker-end','url(#arrow-'+edge.kind+')');
      if(['mixing','composition','family'].includes(edge.kind)) path.setAttribute('stroke-dasharray',edge.kind==='mixing'?'7 5':'3 5');
      $('#edges').append(path); edgeElements.set(edge.id,path);
    });
    D.particles.forEach(p=>{
      const {x,y,r}=positions.get(p.id),color=colors[tone(p)];
      const node=el('g',{class:'node','data-id':p.id,transform:`translate(${x} ${y})`,role:'button',tabindex:0,'aria-label':p.symbol+' — '+p.ru,style:'--tone:'+color});
      node.append(el('title',{},p.symbol+' · '+p.ru+' · PDG '+p.pdg));
      node.append(el('circle',{class:'selection-ring',r:r+9}));
      node.append(el('circle',{class:'sphere',r,fill:'url(#sphere-'+tone(p)+')',stroke:color}));
      node.append(el('ellipse',{class:'shine',cx:-r*.26,cy:-r*.46,rx:r*.29,ry:r*.12,fill:'#fff',transform:'rotate(-25)'}));
      node.append(el('text',{x:0,y:1,'font-size':Math.max(18,r*.82)},p.symbol));
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(p.id,true);}});
      $('#nodes').append(node);nodeElements.set(p.id,node);
      const mini=el('circle',{cx:x,cy:y,r:14,fill:color});
      $('#miniNodes').append(mini);miniElements.set(p.id,mini);
    });
  }
  function applyState() {
    const hits=filtered(),hitIds=new Set(hits.map(p=>p.id)),rel=selected?neighbors(selected):new Set();
    const visible=new Set(D.particles.filter(p=>baseVisible(p)&&(hitIds.has(p.id)||(query&&hits.length&&rel.has(p.id)))).map(p=>p.id));
    nodeElements.forEach((node,id)=>{
      node.style.display=visible.has(id)?'':'none';
      node.setAttribute('tabindex',visible.has(id)?'0':'-1');
      node.setAttribute('aria-pressed',String(id===selected));
      node.classList.toggle('selected',id===selected);
      node.classList.toggle('related',rel.has(id)&&id!==selected);
      node.classList.toggle('dim',!!selected&&!rel.has(id));
      miniElements.get(id).style.opacity=visible.has(id)?(selected&&!rel.has(id)?'.18':'1'):'.04';
    });
    D.edges.forEach(edge=>{
      const path=edgeElements.get(edge.id);if(!path)return;
      path.style.display=enabledEdges.has(edge.kind)&&visible.has(edge.from)&&visible.has(edge.to)?'':'none';
      const active=selected&&(edge.from===selected||edge.to===selected);
      path.classList.toggle('active',!!active);path.classList.toggle('dim',!!selected&&!active);
    });
    hullElements.forEach((holder,id)=>holder.classList.toggle('group-dim',activeGroup!=='all'&&activeGroup!==id));
    $('#resultCount').textContent=query?hits.length+' найдено':'';
    $('#visibleCount').textContent=hits.length+' / '+D.particles.length+' состояний';
    $('#emptyState').hidden=hits.length>0;
    $('#showAll').hidden=!selected||mode!=='graph';
    $('#selectionHint').textContent=selected?'Выбрано: '+byId.get(selected).symbol:'Выберите узел на карте';
    if(mode!=='graph') renderMode();
  }
  function particleChip(p, extra='') {
    return `<button class="particle-chip ${p.id===selected?'selected':''} ${extra}" data-particle="${escape(p.id)}" style="--c:${colors[tone(p)]}" title="${escape(p.ru)}">${escape(p.symbol)}</button>`;
  }
  function updateDetails() {
    const p=byId.get(current),group=groups.get(p.group);
    $('#detailSymbol').textContent=p.symbol;$('#detailSymbol').style.setProperty('--c',colors[tone(p)]);
    $('#detailName').textContent=p.name+' · '+p.ru;
    const rows=[['Символ',p.symbol],['Название',p.ru],['PDG ID',p.pdg],['Класс',group.label],['Масса',p.mass],['Заряд',p.charge],['Спин J',p.spin],['Чётность P',p.parity],['C-чётность',p.cparity],['Кварковый состав',p.quarks],['Жизнь / ширина',p.lifetime]];
    $('#props').innerHTML=rows.map(([name,value])=>`<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join('');
    $('#decays').innerHTML=p.decays.length?p.decays.map(([channel,br])=>`<div class="decay-row"><span>${escape(channel)}</span><small>${escape(br)}</small></div>`).join(''):'<p class="help">'+escape(p.lifetime)+'<br>Каналы распада в наборе не указаны.</p>';
    const kinds=new Map();
    D.edges.forEach(e=>{if(e.from===current||e.to===current){const id=e.from===current?e.to:e.from;if(!kinds.has(id))kinds.set(id,new Set());kinds.get(id).add(edgeNames[e.kind]);}});
    $('#related').innerHTML=[...kinds].map(([id,k])=>{
      const related=byId.get(id);
      return `<button class="related-button" data-particle="${escape(id)}"><i class="dot" style="--c:${colors[tone(related)]}"></i><strong>${escape(related.symbol)}</strong><span>${escape(related.ru)}<small>${escape([...k].join(' · '))}</small></span><span class="chevron">→</span></button>`;
    }).join('')||'<p class="help">Связи в демонстрационном наборе не указаны.</p>';
  }
  function select(id,open=false) {
    if(!byId.has(id)) return;
    selected=id;current=id;updateDetails();applyState();
    if(open&&isMobile()) {openSheet('details');if(mode==='graph')focusParticle(id,.6);}
  }
  function setDetailTab(tab,focus=false) {
    detailTab=tab;
    $$('[data-detail]').forEach(button=>{
      const active=button.dataset.detail===tab;
      button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
      $('#'+button.dataset.detail+'Panel').hidden=!active;
      if(active&&focus)button.focus();
    });
  }
  function setMode(next) {
    mode=next;
    $$('[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));if(active)button.scrollIntoView({block:'nearest',inline:'nearest'});});
    const graph=mode==='graph';svg.toggleAttribute('hidden',!graph);content.hidden=graph;
    content.scrollTop=0;
    $('#minimapWrap').hidden=!graph;$('.hud').hidden=!graph;$('.legend').hidden=!graph;
    $('#viewTitle').textContent=modeNames[mode];
    closeSheets(false);applyState();
  }
  // Numeric values are used only for table ordering. Original display strings stay intact.
  function numeric(p,key) {
    if(key==='pdg')return p.pdg;
    if(key==='spin'||key==='charge'){
      const text=p[key].replace('−','-');const [a,b]=text.split('/').map(Number);return b?a/b:a;
    }
    const match=p.mass.match(/\d+(?:\.\d+)?/);if(!match)return null;
    return Number(match[0])*(p.mass.includes('GeV')?1000:p.mass.includes('keV')?.001:1);
  }
  function renderTable(hits) {
    const columns=[['symbol','Частица'],['ru','Название'],['pdg','PDG ID'],['group','Семейство'],['mass','Масса'],['charge','Заряд'],['spin','Спин J'],['quarks','Состав'],['lifetime','Жизнь / ширина']];
    const sorted=[...hits].sort((a,b)=>{
      if(['mass','charge','spin','pdg'].includes(sortKey)){
        const av=numeric(a,sortKey),bv=numeric(b,sortKey);
        if(av===null)return bv===null?0:1;if(bv===null)return -1;
        return (av-bv)*sortDirection;
      }
      const av=sortKey==='group'?groups.get(a.group).label:a[sortKey],bv=sortKey==='group'?groups.get(b.group).label:b[sortKey];
      return String(av).localeCompare(String(bv),'ru')*sortDirection;
    });
    return `<h2>Таблица частиц</h2><p class="mode-intro">${hits.length} состояний · Нажмите заголовок для сортировки, символ — для выбора частицы. Поиск и фильтры действуют во всех режимах.</p><div class="table-wrap"><table class="particle-table"><thead><tr>${columns.map(([key,label])=>`<th scope="col" aria-sort="${key===sortKey?(sortDirection===1?'ascending':'descending'):'none'}"><button data-sort="${key}">${label}${key===sortKey?(sortDirection===1?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${sorted.map(p=>`<tr class="${selected===p.id?'selected':''}">${columns.map(([key])=>`<td>${key==='symbol'?`<button class="table-particle" data-particle="${p.id}" aria-label="${escape(p.symbol+' — '+p.ru)}" style="color:${colors[tone(p)]}">${escape(p.symbol)}</button>`:escape(key==='group'?groups.get(p.group).label:p[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function family(ids,title,hits,color) {
    const particles=hits.filter(p=>ids.includes(p.group));
    if(!particles.length)return '';
    return `<div class="class-family" style="--c:${color}"><h4>${title}<small>${particles.length}</small></h4><div class="particle-chips">${particles.map(p=>particleChip(p)).join('')}</div></div>`;
  }
  function renderClassification(hits) {
    return `<h2>Классификация</h2><p class="mode-intro">Элементарные частицы и составные адроны. Выберите состояние, чтобы открыть его свойства.</p><div class="classification-root"><div class="tree-label">Частицы · ${hits.length}</div><div class="tree-branches"><section class="tree-branch"><h3>Элементарные</h3><p>Фермионы: лептоны и кварки · бозоны: переносчики и Хиггс</p>${family(['leptons'],'Лептоны · фермионы',hits,colors.green)}${family(['quarks'],'Кварки · фермионы',hits,colors.purple)}${family(['bosons'],'Бозоны',hits,colors.gold)}</section><section class="tree-branch"><h3>Адроны</h3><p>Составные состояния кварков и антикварков</p>${family(['light','strange','charm'],'Мезоны · бозоны',hits,colors.rose)}${family(['baryons'],'Барионы · фермионы',hits,colors.blue)}</section></div></div>`;
  }
  function localPicker(hits,p) {
    return `<label class="local-picker" for="localParticle">Выбранная частица<select id="localParticle">${hits.map(item=>`<option value="${item.id}" ${item.id===p.id?'selected':''}>${escape(item.symbol+' · '+item.ru)}</option>`).join('')}</select></label>`;
  }
  function quarkTokens(p) {
    return p.quarks.replace(/\bmixture\b/g,'').match(/[udscbtū]̄?/g)||[];
  }
  function renderComposition(hits,p) {
    const hadron=['light','strange','charm','baryons'].includes(p.group);
    const tokens=hadron?quarkTokens(p):[];
    const mixed=/mixture|√/.test(p.quarks);
    const components=tokens.map(token=>{
      const anti=token==='ū'||token.includes('̄');
      const flavor=token==='ū'?'u':token[0];
      return `<button class="component-orb" data-particle="${flavor}" title="${anti?'Антикварк; свойства соответствующего кварка':'Кварк'} ${flavor}" aria-label="${anti?'Антикварк':'Кварк'} ${flavor}, открыть свойства кварка">${escape(token)}</button>`;
    }).join('');
    // Tokenization preserves the stored formula; mixed states are not presented as a single fixed composition.
    return `<h2>Кварковый состав</h2><p class="mode-intro">Локальное представление состава выбранного состояния из текущей базы.</p>${localPicker(hits,p)}<div class="local-stage" style="--c:${colors[tone(p)]}"><div class="local-parent">${escape(p.symbol)}</div><div class="formula">${escape(p.quarks)}</div>${hadron?`<div class="flow-arrow">↓</div><div class="component-orbs">${components}</div><p class="local-caption">${mixed?'Смешанное состояние: показаны компоненты сохранённой формулы, а не один фиксированный набор кварков.':'Кнопки компонентов открывают свойства соответствующего кваркового аромата. Черта обозначает антикварк.'}</p>`:`<p class="local-caption">${p.group==='quarks'?'Элементарный кварк. Адроны с этим ароматом в текущем наборе:':'Элементарная частица; кваркового состава нет.'}</p>`}${p.group==='quarks'?`<div class="particle-chips">${D.particles.filter(item=>['light','strange','charm','baryons'].includes(item.group)&&quarkTokens(item).some(token=>token.replace('ū','u')[0]===p.id)).map(item=>particleChip(item)).join('')}</div>`:''}</div>`;
  }
  function decayProducts(channel) {
    // Exact symbol matching: absent antiparticles/general channels remain explicit, non-clickable labels.
    return channel.split(/\s+/).filter(Boolean).map(token=>{
      const p=D.particles.find(item=>item.symbol===token||((item.id==='nue')&&token==='νe'));
      return p?particleChip(p):`<span class="external-chip" title="Состояние или обобщённый канал вне демонстрационного набора">${escape(token)}</span>`;
    }).join('');
  }
  function renderDecays(hits,p) {
    return `<h2>Распады ${escape(p.symbol)}</h2><p class="mode-intro">Каналы и доли из базы. Нажмите продукт, чтобы продолжить цепочку; пунктиром отмечены состояния и обобщённые каналы вне набора.</p>${localPicker(hits,p)}<div class="local-stage" style="--c:${colors[tone(p)]}"><div class="local-parent">${escape(p.symbol)}</div>${p.decays.length?`<div class="flow-arrow">↓</div>${p.decays.map(([channel,br])=>`<div class="channel-card"><div class="channel-head"><span>${escape(p.symbol)} → ${escape(channel)}</span><small>${escape(br)}</small></div><div class="channel-products">${decayProducts(channel)}</div></div>`).join('')}`:`<div class="stable-message">Каналы в наборе не указаны</div><p class="local-caption">${escape(p.lifetime)}</p>`}</div>`;
  }
  function renderMode() {
    const hits=filtered();
    if(!hits.length){content.replaceChildren();return;}
    const p=hits.find(item=>item.id===current)||hits[0];
    if(['composition','decays'].includes(mode)&&p.id!==current){current=p.id;selected=p.id;updateDetails();}
    content.innerHTML=mode==='table'?renderTable(hits):mode==='classification'?renderClassification(hits):mode==='composition'?renderComposition(hits,p):renderDecays(hits,p);
  }
  function applyTransform() {
    viewport.setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);
    $('#reset').textContent=Math.round(scale*100)+'%';
    const mini=$('#miniViewport');
    const top=isMobile()?75:42,bottom=isMobile()?100:100;
    Object.entries({x:-tx/scale,y:(top-ty)/scale,width:wrap.clientWidth/scale,height:(wrap.clientHeight-top-bottom)/scale}).forEach(([key,value])=>mini.setAttribute(key,value));
  }
  function fit() {
    const top=isMobile()?80:45,bottom=isMobile()?110:110;
    scale=Math.min((wrap.clientWidth-24)/1800,Math.max(100,wrap.clientHeight-top-bottom)/1250);
    tx=(wrap.clientWidth-1800*scale)/2;ty=top+(wrap.clientHeight-top-bottom-1250*scale)/2;
    autoFit=true;applyTransform();
  }
  function focusParticle(id,minScale=.85) {
    const p=positions.get(id);if(!p)return;
    const available=isMobile()&&$('#details').classList.contains('open')?wrap.clientHeight-$('#details').offsetHeight:wrap.clientHeight;
    scale=Math.max(scale,minScale);tx=wrap.clientWidth/2-p.x*scale;ty=Math.max(isMobile()?125:0,available*.45)-p.y*scale;autoFit=false;applyTransform();
  }
  function zoomAt(factor,x,y) {
    const next=Math.max(.08,Math.min(4,scale*factor));
    tx=x-(x-tx)*next/scale;ty=y-(y-ty)*next/scale;scale=next;autoFit=false;applyTransform();
  }
  function chooseFromSearch(open=false) {
    const hits=filtered();
    const exact=hits.find(p=>[p.pdg,p.symbol,...(p.aliases||[])].some(value=>normalize(value)===query));
    const p=exact||hits[0];
    if(query&&p){select(p.id,open);if(mode==='graph')focusParticle(p.id);}
    else {selected=null;applyState();}
  }
  function clearFilters() {
    activeGroup='all';charge='all';spin='all';query='';search.value='';selected=null;
    $('#chargeFilter').value='all';$('#spinFilter').value='all';
    enabledEdges.clear();Object.keys(edgeColors).forEach(kind=>enabledEdges.add(kind));
    $$('[data-edge]').forEach(input=>input.checked=true);
    updateFilterButtons();applyState();fit();
  }
  function updateFilterButtons() {
    $$('.filter').forEach(button=>{const active=button.dataset.group===activeGroup;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }
  function closeSheets(restoreFocus=true) {
    $('#filters').classList.remove('open');$('#details').classList.remove('open');$('#overlay').hidden=true;
    $('#overlay').classList.remove('detail-overlay');
    $('#filtersBtn').setAttribute('aria-expanded','false');$('#detailBtn').setAttribute('aria-expanded','false');
    if(restoreFocus&&lastSheetTrigger?.isConnected)lastSheetTrigger.focus();
    lastSheetTrigger=null;
  }
  function openSheet(id) {
    if(!isMobile())return;
    const trigger=document.activeElement;
    closeSheets(false);lastSheetTrigger=trigger;
    $('#'+id).classList.add('open');$('#overlay').hidden=false;
    $('#overlay').classList.toggle('detail-overlay',id==='details');
    $('#'+(id==='filters'?'filtersBtn':'detailBtn')).setAttribute('aria-expanded','true');
    $('#'+(id==='filters'?'closeFilters':'closeDetail')).focus();
  }
  // One gesture state handles mouse, pen and simultaneous touch pointers in CSS pixels.
  const pointers=new Map();let gesture=null,moved=false,suppressClick=false,pressedNode=null;
  const distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
  function rebaseGesture() {
    const points=[...pointers.values()];
    if(!points.length){gesture=null;return;}
    const center=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
    gesture={...center,tx,ty,scale,distance:points.length>1?distance(points):0};
  }
  svg.addEventListener('pointerdown',event=>{
    if(event.button>0)return;
    const rect=svg.getBoundingClientRect();
    pointers.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top});
    svg.setPointerCapture(event.pointerId);
    if(pointers.size===1){moved=false;suppressClick=false;pressedNode=event.target.closest('.node')?.dataset.id||null;}
    if(pointers.size>1){moved=true;suppressClick=true;}
    rebaseGesture();
  });
  svg.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    const rect=svg.getBoundingClientRect();
    pointers.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top});
    const points=[...pointers.values()];
    const center=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
    if(Math.hypot(center.x-gesture.x,center.y-gesture.y)>4||points.length>1)moved=true;
    if(!moved)return;
    suppressClick=true;autoFit=false;svg.classList.add('dragging');
    scale=points.length>1&&gesture.distance?Math.max(.08,Math.min(4,gesture.scale*distance(points)/gesture.distance)):gesture.scale;
    tx=center.x-(gesture.x-gesture.tx)*scale/gesture.scale;ty=center.y-(gesture.y-gesture.ty)*scale/gesture.scale;
    applyTransform();
  });
  function endPointer(event) {
    const tap=event.type==='pointerup'&&pointers.size===1&&!moved&&pressedNode;
    pointers.delete(event.pointerId);if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    rebaseGesture();if(!pointers.size)svg.classList.remove('dragging');
    if(tap){suppressClick=true;select(pressedNode,true);}
    if(!pointers.size)pressedNode=null;
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,endPointer));
  svg.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const node=event.target.closest('.node');
    if(node)select(node.dataset.id,true);
    else {selected=null;applyState();}
  });
  svg.addEventListener('dblclick',event=>{const node=event.target.closest('.node');if(node)focusParticle(node.dataset.id);});
  svg.addEventListener('wheel',event=>{event.preventDefault();const rect=svg.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0015),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
  $('#minimap').addEventListener('pointerdown',event=>{
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform($('#minimap').getScreenCTM().inverse());
    tx=wrap.clientWidth/2-point.x*scale;ty=wrap.clientHeight/2-point.y*scale;autoFit=false;applyTransform();
  });
  $('#groupFilters').innerHTML=D.groups.map(g=>`<button class="filter" data-group="${g.id}" aria-pressed="false"><i class="dot" style="--c:${colors[g.tone]}"></i>${escape(labels[g.id])}<small>${D.particles.filter(p=>p.group===g.id).length}</small></button>`).join('');
  $$('.filter').forEach(button=>button.addEventListener('click',()=>{
    activeGroup=button.dataset.group;selected=null;updateFilterButtons();applyState();
    if(mode==='graph'){
      if(activeGroup==='all')fit();else{const box=layout[activeGroup];scale=Math.min((wrap.clientWidth-40)/(box.rx*2.3),(wrap.clientHeight-160)/(box.ry*2.3));tx=wrap.clientWidth/2-box.cx*scale;ty=wrap.clientHeight*.46-box.cy*scale;autoFit=false;applyTransform();}
    }
    closeSheets();
  }));
  $$('[data-edge]').forEach(input=>input.addEventListener('change',()=>{input.checked?enabledEdges.add(input.dataset.edge):enabledEdges.delete(input.dataset.edge);applyState();}));
  $('#chargeFilter').addEventListener('change',event=>{charge=event.target.value;selected=null;applyState();});
  $('#spinFilter').addEventListener('change',event=>{spin=event.target.value;selected=null;applyState();});
  search.addEventListener('input',()=>{query=normalize(search.value.trim());chooseFromSearch();});
  search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();chooseFromSearch(true);search.blur();}if(event.key==='Escape'){query='';search.value='';selected=null;applyState();fit();}});
  $('#resetFilters').onclick=clearFilters;$('#clearSearch').onclick=clearFilters;
  $$('[data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
  $$('[data-detail]').forEach(button=>{
    button.onclick=()=>setDetailTab(button.dataset.detail);
    button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=$$('[data-detail]');const index=tabs.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;setDetailTab(tabs[next].dataset.detail,true);}});
  });
  content.addEventListener('click',event=>{
    const particle=event.target.closest('[data-particle]'),sort=event.target.closest('[data-sort]');
    if(particle){
      // Local navigation can cross a family filter (e.g. hadron → quark).
      const p=byId.get(particle.dataset.particle);
      if(!baseVisible(p)||!matches(p)){activeGroup='all';charge='all';spin='all';query='';search.value='';$('#chargeFilter').value='all';$('#spinFilter').value='all';updateFilterButtons();}
      select(p.id,mode==='table'||mode==='classification');
    }
    if(sort){sortDirection=sortKey===sort.dataset.sort?-sortDirection:1;sortKey=sort.dataset.sort;renderMode();}
  });
  content.addEventListener('change',event=>{if(event.target.id==='localParticle')select(event.target.value);});
  $('#related').addEventListener('click',event=>{const button=event.target.closest('[data-particle]');if(button){const p=byId.get(button.dataset.particle);if(!baseVisible(p)||!matches(p)){clearFilters();}select(p.id);if(mode==='graph')focusParticle(p.id);}});
  $('#plus').onclick=()=>zoomAt(1.25,wrap.clientWidth/2,wrap.clientHeight/2);$('#minus').onclick=()=>zoomAt(.8,wrap.clientWidth/2,wrap.clientHeight/2);
  $('#reset').onclick=fit;$('#centerBtn').onclick=fit;$('#showAll').onclick=()=>{selected=null;applyState();};
  $('#focusParticle').onclick=()=>{const id=current;clearFilters();setMode('graph');select(id);focusParticle(id);};
  $('#openComposition').onclick=()=>{selected=current;setMode('composition');};$('#openDecays').onclick=()=>{selected=current;setMode('decays');};
  $('#filtersBtn').onclick=()=>openSheet('filters');$('#detailBtn').onclick=()=>{openSheet('details');if(mode==='graph')focusParticle(current,.6);};
  $('#closeFilters').onclick=()=>closeSheets();$('#closeDetail').onclick=()=>{closeSheets();if(!isMobile()){selected=null;applyState();}};
  $('#overlay').onclick=()=>closeSheets();
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeSheets();
    if(event.key==='Tab'&&isMobile()&&!$('#overlay').hidden){
      const sheet=$('#filters.open')||$('#details.open');const controls=[...sheet.querySelectorAll('button,input,select,a')].filter(item=>!item.disabled&&item.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  let previousSize={width:wrap.clientWidth,height:wrap.clientHeight};
  new ResizeObserver(()=>{
    const next={width:wrap.clientWidth,height:wrap.clientHeight};
    if(autoFit)fit();else{tx+=(next.width-previousSize.width)/2;ty+=(next.height-previousSize.height)/2;applyTransform();}
    previousSize=next;if(!isMobile())closeSheets(false);
  }).observe(wrap);
  $('#datasetVersion').textContent='PDG 2024 · '+D.particles.length+' состояний';$('#totalCount').textContent=D.particles.length;
  buildGraph();updateDetails();applyState();fit();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js').catch(()=>{});
})();

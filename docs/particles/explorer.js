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
  const diagram=window.PARTICLE_LAYOUT.create(D);
  const {positions,membership,regions,clusters,world}=diagram;
  const minZoom=Math.min(.08,180/Math.max(world.width,world.height));
  const layout=Object.fromEntries(diagram.groupBounds);
  const labels={light:'Лёгкие мезоны',strange:'Странные мезоны',charm:'Charm / charmonium',bosons:'Бозоны',baryons:'Барионы',leptons:'Лептоны',quarks:'Кварки'};
  const clusterMap=new Map(clusters.map(c=>[c.id,c]));
  let allEdges=false,focusedCluster=null;
  let mode='graph', selected=null, current='pip', activeGroup='all', detailTab='properties';
  let query='', charge='all', spin='all', scale=1, tx=0, ty=0, autoFit=true;
  let sortKey='pdg', sortDirection=1, lastSheetTrigger=null;
  const enabledEdges=new Set(Object.keys(edgeColors));
  const nodeElements=new Map(), edgeElements=new Map(), hullElements=new Map(), miniElements=new Map(), clusterElements=new Map(), bundles=[];
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
    if(p.id==='g') return 'pearl';
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
      const gradient=el('radialGradient',{id:'sphere-'+key,cx:'32%',cy:'24%',r:'84%'});
      [['0%','#eaf4ff'],['10%',color],['37%',color],['100%','#080e19']].forEach(([offset,fill])=>gradient.append(el('stop',{offset,'stop-color':fill})));
      defs.append(gradient);
      const aura=el('radialGradient',{id:'aura-'+key,cx:'50%',cy:'35%',r:'72%'});
      [['0%',.10],['60%',.045],['100%',0]].forEach(([offset,opacity])=>aura.append(el('stop',{offset,'stop-color':color,'stop-opacity':opacity})));
      defs.append(aura);
    });
    Object.entries(edgeColors).forEach(([kind,color])=>{
      const marker=el('marker',{id:'arrow-'+kind,markerWidth:9,markerHeight:9,refX:8,refY:4.5,orient:'auto',markerUnits:'userSpaceOnUse',viewBox:'0 0 9 9'});
      marker.append(el('path',{d:'M0 0 L9 4.5 L0 9 L2 4.5 Z',fill:color}));defs.append(marker);
    });
    regions.forEach(region=>{
      const holder=el('g',{class:'region','data-region':region.id,style:'--tone:'+colors[region.tone]});
      const {x,y,width,height}=region;
      holder.append(el('rect',{x,y,width,height,rx:90,fill:'url(#aura-'+region.tone+')',stroke:colors[region.tone],class:'region-boundary'}));
      holder.append(el('text',{x:x+width/2,y:y+45,'text-anchor':'middle',class:'region-title',fill:colors[region.tone]},region.label));
      holder.append(el('text',{x:x+width/2,y:y+74,'text-anchor':'middle',class:'region-summary'},region.count+' состояний · '+region.children.length+' семейств'));
      $('#hulls').append(holder);hullElements.set(region.id,holder);
      const mini=el('rect',{x,y,width,height,rx:70,fill:colors[region.tone],'fill-opacity':.04,stroke:colors[region.tone],'stroke-opacity':.4,'stroke-width':4});
      $('#miniRegions').append(mini);
    });
    clusters.forEach(cluster=>{
      const holder=el('g',{class:'cluster','data-cluster':cluster.id,style:'--tone:'+colors[cluster.tone],role:'button',tabindex:0,'aria-label':cluster.label+' — '+cluster.ids.length+' состояний. Приблизить семейство.'});
      holder.append(el('ellipse',{cx:cluster.cx,cy:cluster.cy,rx:cluster.rx,ry:cluster.ry,fill:'url(#aura-'+cluster.tone+')',stroke:colors[cluster.tone],class:'cluster-shell'}));
      holder.append(el('ellipse',{cx:cluster.cx,cy:cluster.cy,rx:cluster.rx-9,ry:cluster.ry-8,fill:'none',stroke:colors[cluster.tone],class:'cluster-inner'}));
      const title=el('text',{x:cluster.cx,y:cluster.y+25,'text-anchor':'middle',class:'cluster-title'},cluster.label);
      title.append(el('tspan',{'dx':10,class:'cluster-count'},String(cluster.ids.length)));
      holder.append(title);
      holder.append(el('text',{x:cluster.cx,y:cluster.y+48,'text-anchor':'middle',class:'cluster-subtitle'},cluster.subtitle));
      holder.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusCluster(cluster.id);}});
      $('#hulls').append(holder);clusterElements.set(cluster.id,holder);
    });
    // The overview summarizes real cross-region edges instead of drawing a hairball.
    const grouped=new Map();
    D.edges.forEach(edge=>{
      const from=window.PARTICLE_LAYOUT.rootFor(byId.get(edge.from)),to=window.PARTICLE_LAYOUT.rootFor(byId.get(edge.to));
      if(from===to)return;
      const key=[from,to].sort().join(':')+':'+edge.kind;
      if(!grouped.has(key))grouped.set(key,{from,to,kind:edge.kind,edges:[]});
      grouped.get(key).edges.push(edge);
    });
    [...grouped.values()].filter(bundle=>bundle.from==='bosons'||bundle.to==='bosons').forEach((bundle,index)=>{
      const a=regions.find(r=>r.id===bundle.from),b=regions.find(r=>r.id===bundle.to);
      if(!a||!b)return;
      const ax=a.x+a.width/2,ay=a.y+a.height/2,bx=b.x+b.width/2,by=b.y+b.height/2;
      const path=el('path',{class:'bundle',stroke:edgeColors[bundle.kind],d:`M${ax} ${ay} C${(ax+bx)/2} ${ay-index*8} ${(ax+bx)/2} ${by+index*8} ${bx} ${by}`});
      $('#bundles').append(path);bundles.push({...bundle,path});
    });
    D.edges.forEach(edge=>{
      const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)return;
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
      const ax=a.x+ux*(a.r+2),ay=a.y+uy*(a.r+2),bx=b.x-ux*(b.r+5),by=b.y-uy*(b.r+5);
      const curve=membership.get(edge.from)===membership.get(edge.to)?.17:.22;
      const path=el('path',{class:'edge',stroke:edgeColors[edge.kind],style:'color:'+edgeColors[edge.kind],d:`M${ax} ${ay} Q${(ax+bx)/2-dy*curve} ${(ay+by)/2+dx*curve} ${bx} ${by}`,'data-id':edge.id,'data-from':edge.from,'data-to':edge.to,'data-kind':edge.kind});
      if(edge.kind!=='family')path.setAttribute('marker-end','url(#arrow-'+edge.kind+')');
      if(['mixing','composition','family'].includes(edge.kind))path.setAttribute('stroke-dasharray',edge.kind==='mixing'?'7 5':'3 5');
      $('#edges').append(path);edgeElements.set(edge.id,path);
    });
    D.particles.forEach(p=>{
      const {x,y,r}=positions.get(p.id),color=colors[tone(p)];
      const node=el('g',{class:'node','data-id':p.id,'data-cluster':membership.get(p.id),transform:`translate(${x} ${y})`,role:'button',tabindex:0,'aria-label':p.symbol+' — '+p.ru,style:'--tone:'+color});
      node.append(el('title',{},p.symbol+' · '+p.ru+' · PDG '+p.pdg));
      node.append(el('circle',{class:'selection-ring',r:r+8,'pointer-events':'none'}));
      node.append(el('circle',{class:'sphere',r,fill:'url(#sphere-'+tone(p)+')',stroke:color}));
      node.append(el('ellipse',{class:'shine',cx:-r*.23,cy:-r*.42,rx:r*.19,ry:r*.07,fill:'#fff',transform:'rotate(-25)'}));
      node.append(el('text',{x:0,y:1,'font-size':p.symbol.length>3?29:34},p.symbol));
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(p.id,true);}});
      node.addEventListener('pointerenter',event=>{
        if(event.pointerType==='touch')return;
        const rect=wrap.getBoundingClientRect(),tip=$('#nodeTooltip');
        tip.innerHTML='<strong>'+escape(p.symbol)+' · '+escape(p.ru)+'</strong><span>PDG '+escape(p.pdg)+' · '+escape(p.mass)+'</span>';
        tip.style.left=Math.min(wrap.clientWidth-260,Math.max(12,event.clientX-rect.left+18))+'px';tip.style.top=Math.max(95,event.clientY-rect.top-65)+'px';tip.hidden=false;
      });
      node.addEventListener('pointerleave',()=>$('#nodeTooltip').hidden=true);
      $('#nodes').append(node);nodeElements.set(p.id,node);
      const label=node.querySelector('text');
      if(label.getComputedTextLength()>r*1.7){label.setAttribute('textLength',r*1.7);label.setAttribute('lengthAdjust','spacingAndGlyphs');}
      const mini=el('circle',{cx:x,cy:y,r:10,fill:color});$('#miniNodes').append(mini);miniElements.set(p.id,mini);
    });
    $('#minimap').setAttribute('viewBox',`0 0 ${world.width} ${world.height}`);
  }
  function updateLevel() {
    const overview=scale<.30,detail=scale>=.65;
    svg.classList.toggle('overview',overview);svg.classList.toggle('detail-level',detail);svg.classList.toggle('show-all',allEdges);
    regions.forEach(region=>{const title=hullElements.get(region.id).querySelector('.region-title');title.setAttribute('font-size',Math.max(12/scale,Math.min(46,22/scale)));title.setAttribute('y',region.y+Math.max(45,17/scale));});
    $$('.region-summary').forEach(title=>title.setAttribute('font-size',Math.max(8.5/scale,Math.min(18,10/scale))));
    clusterElements.forEach(holder=>{
      holder.querySelector('.cluster-title').style.fontSize=Math.min(32,18/scale)+'px';
      holder.querySelector('.cluster-count').style.fontSize=Math.min(20,11/scale)+'px';
      holder.querySelector('.cluster-subtitle').style.fontSize=Math.min(17,11/scale)+'px';
    });
    nodeElements.forEach((node,id)=>{
      const label=node.querySelector('text'),size=Number(label.getAttribute('font-size'));
      label.style.opacity=selected===id||size*scale>=11?'1':'0';
    });
    $('#levelInfo').textContent=overview?'Обзор · нажмите на семейство':detail?'Состояния · локальные связи':'Семейства · нажмите, чтобы приблизить';
  }
  function focusCluster(id) {
    const cluster=clusterMap.get(id);if(!cluster)return;
    focusedCluster=id;selected=null;applyState();
    const top=isMobile()?125:100,bottom=105;
    scale=Math.min((wrap.clientWidth-60)/cluster.width,(wrap.clientHeight-top-bottom)/cluster.height,1.8);
    tx=wrap.clientWidth/2-cluster.cx*scale;ty=top+(wrap.clientHeight-top-bottom)/2-cluster.cy*scale;
    autoFit=false;$('#mapPath').textContent=cluster.label;applyTransform();
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
      node.classList.toggle('dim',selected?!rel.has(id):!!focusedCluster&&membership.get(id)!==focusedCluster);
      miniElements.get(id).style.opacity=visible.has(id)?(selected&&!rel.has(id)?'.18':'1'):'.04';
    });
    D.edges.forEach(edge=>{
      const path=edgeElements.get(edge.id);if(!path)return;
      const active=selected&&(edge.from===selected||edge.to===selected);
      const local=membership.get(edge.from)===membership.get(edge.to);
      path.style.display=enabledEdges.has(edge.kind)&&visible.has(edge.from)&&visible.has(edge.to)&&(allEdges||active||(!selected&&local))?'':'none';
      path.classList.toggle('active',!!active);path.classList.toggle('dim',selected?!active:!!focusedCluster&&membership.get(edge.from)!==focusedCluster);
    });
    clusters.forEach(cluster=>{
      const holder=clusterElements.get(cluster.id),show=cluster.ids.some(id=>visible.has(id));
      holder.style.display=show?'':'none';holder.setAttribute('tabindex',show?'0':'-1');
      holder.classList.toggle('cluster-muted',selected?!cluster.ids.some(id=>rel.has(id)):!!focusedCluster&&cluster.id!==focusedCluster);
      holder.classList.toggle('cluster-focused',cluster.id===focusedCluster);
    });
    regions.forEach(region=>{
      const show=region.children.some(c=>c.ids.some(id=>visible.has(id)));
      hullElements.get(region.id).style.display=show?'':'none';
    });
    bundles.forEach(bundle=>bundle.path.style.display=!selected&&!allEdges&&activeGroup==='all'&&enabledEdges.has(bundle.kind)&&bundle.edges.some(e=>visible.has(e.from)&&visible.has(e.to))?'':'none');
    $('#edgeViewBtn').setAttribute('aria-pressed',String(allEdges));
    $('#edgeViewBtn').textContent=allEdges?'Все связи':'Связи по выбору';
    updateLevel();
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
    $('#metricStrip').innerHTML=[['Масса',p.mass],['Заряд',p.charge],['Спин J',p.spin]].map(([label,value],i)=>`<div><small>${escape(label)}</small><strong class="${i===0?'mass':''}">${escape(value)}</strong></div>`).join('');
    const rows=[['Символ',p.symbol],['Название',p.ru],['PDG ID',p.pdg],['Класс',group.label],['Чётность P',p.parity],['C-чётность',p.cparity],['Кварковый состав',p.quarks],['Жизнь / ширина',p.lifetime]];
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
    $('#viewTitle').textContent=modeNames[mode];$('#graphToolbar').hidden=!graph;$('#levelInfo').hidden=!graph;$('#nodeTooltip').hidden=true;
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
    const top=isMobile()?120:94,bottom=100;
    Object.entries({x:-tx/scale,y:(top-ty)/scale,width:wrap.clientWidth/scale,height:(wrap.clientHeight-top-bottom)/scale}).forEach(([key,value])=>mini.setAttribute(key,value));
    updateLevel();
  }
  function fit() {
    const wasFocused=focusedCluster;
    const top=isMobile()?130:100,bottom=110;
    scale=Math.min((wrap.clientWidth-36)/world.width,Math.max(100,wrap.clientHeight-top-bottom)/world.height);
    tx=(wrap.clientWidth-world.width*scale)/2;ty=top+(wrap.clientHeight-top-bottom-world.height*scale)/2;
    autoFit=true;focusedCluster=null;$('#mapPath').textContent='Все семейства';if(wasFocused)applyState();applyTransform();
  }
  function focusParticle(id,minScale=.85) {
    const p=positions.get(id);if(!p)return;
    const available=isMobile()&&$('#details').classList.contains('open')?wrap.clientHeight-$('#details').offsetHeight:wrap.clientHeight;
    scale=Math.max(scale,minScale);tx=wrap.clientWidth/2-p.x*scale;ty=Math.max(isMobile()?125:0,available*.45)-p.y*scale;autoFit=false;applyTransform();
  }
  function zoomAt(factor,x,y) {
    const next=Math.max(minZoom,Math.min(4,scale*factor));
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
    activeGroup='all';charge='all';spin='all';query='';search.value='';selected=null;focusedCluster=null;allEdges=false;
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
  const pointers=new Map();let gesture=null,moved=false,suppressClick=false,pressedNode=null,pressedCluster=null;
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
    if(pointers.size===1){moved=false;suppressClick=false;pressedNode=event.target.closest('.node')?.dataset.id||null;pressedCluster=event.target.closest('.cluster')?.dataset.cluster||null;}
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
    scale=points.length>1&&gesture.distance?Math.max(minZoom,Math.min(4,gesture.scale*distance(points)/gesture.distance)):gesture.scale;
    tx=center.x-(gesture.x-gesture.tx)*scale/gesture.scale;ty=center.y-(gesture.y-gesture.ty)*scale/gesture.scale;
    applyTransform();
  });
  function endPointer(event) {
    const tap=event.type==='pointerup'&&pointers.size===1&&!moved;
    const tappedNode=pressedNode,tappedCluster=pressedCluster;
    pointers.delete(event.pointerId);if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    rebaseGesture();if(!pointers.size)svg.classList.remove('dragging');
    if(tap&&tappedNode){suppressClick=true;select(tappedNode,true);}
    else if(tap&&tappedCluster){suppressClick=true;focusCluster(tappedCluster);}
    if(!pointers.size){pressedNode=null;pressedCluster=null;}
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,endPointer));
  svg.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const node=event.target.closest('.node');
    const cluster=event.target.closest('.cluster');
    if(node)select(node.dataset.id,true);
    else if(cluster)focusCluster(cluster.dataset.cluster);
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
  $('#reset').onclick=fit;$('#centerBtn').onclick=fit;$('#mapHome').onclick=()=>{selected=null;fit();applyState();};$('#showAll').onclick=()=>{selected=null;applyState();};
  $('#edgeViewBtn').onclick=()=>{allEdges=!allEdges;applyState();};
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

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
  const byPdg = new Map(D.particles.map(p=>[p.pdg,p]));
  const groups = new Map(D.groups.map(g => [g.id, g]));
  const colors = {rose:'#ff527c', orange:'#ff8954', violet:'#c176ff', gold:'#ffd16b', blue:'#498fff', green:'#53e592', purple:'#ae73ff', pearl:'#bbcfdf'};
  const edgeColors = {strong:'#ff466b', em:'#52b6ff', weak:'#53e592', composition:'#bd87ff', mixing:'#ffba75', family:'#aebdcc'};
  const edgeNames = {strong:'сильное', em:'электромагнитное', weak:'слабое', composition:'кварковый состав', mixing:'смешивание', family:'семейство'};
  const modeNames = {graph:'Карта взаимодействий', classification:'Иерархия частиц', table:'Таблица частиц', composition:'Кварковый состав', decays:'Локальные каналы распада'};
  const diagram=window.PARTICLE_LAYOUT.create(D);
  const {positions,membership,regions,clusters,world}=diagram;
  const regionMap=new Map(regions.map(r=>[r.id,r]));
  const maxZoom=4;
  // Temporary height changes (keyboard, browser bars) must not change the zoom floor.
  let cameraViewportHeight=wrap.clientHeight;
  function cameraInsets(){
    const compact=isMobile()&&wrap.clientWidth>=600&&cameraViewportHeight<500;
    return isMobile()?(compact?{top:80,bottom:72,right:Math.min(wrap.clientWidth*.4,340)+24}:{top:156,bottom:112,right:0}):{top:253,bottom:86,right:0};
  }
  function mapInsets(){
    // Map chrome has reserved space, independent of selection and panel contents.
    return isMobile()?(compactMap()?{top:80,bottom:72,right:Math.min(wrap.clientWidth*.4,340)+24}:{top:156,bottom:112,right:0}):cameraInsets();
  }
  function overviewScale() {
    const {top,bottom,right}=cameraInsets();
    return Math.min((wrap.clientWidth-right-36)/(atlasBounds.right-atlasBounds.left),Math.max(80,cameraViewportHeight-top-bottom-20)/(atlasBounds.bottom-atlasBounds.top));
  }
  const minZoom=()=>overviewScale();
  const labels={light:'Лёгкие мезоны',strange:'Странные мезоны',charm:'Charm / charmonium',bottom:'Bottom / bottomonium',bosons:'Бозоны',baryons:'Барионы',leptons:'Лептоны',quarks:'Кварки'};
  const clusterMap=new Map(clusters.map(c=>[c.id,c]));
  const rootCodes={mesons:'М',baryons:'Б',quarks:'К',leptons:'Л',bosons:'Бз'};
  const subgroupNames={nucleon:'Нуклоны (N)',delta:'Дельта (Δ)',lambda:'Лямбда (Λ)',sigma:'Сигма (Σ)',xi:'Кси (Ξ)',omega:'Омега (Ω)',openbottom:'B-мезоны',bottombaryons:'С b-кварком'};
  const clusterName=c=>subgroupNames[c.family]||c.label;
  const clusterCodes=new Map(regions.flatMap(r=>r.children.map((c,i)=>[c.id,rootCodes[r.id]+(i+1)])));
  const edgeRank={strong:0,em:1,weak:2,composition:3,mixing:4,family:5};
  const edgePatterns={strong:'',em:'12 5',weak:'2 5',composition:'10 4 2 4',mixing:'6 4',family:'4 6'};
  const atlasBounds={left:Math.min(...[...positions.values()].map(p=>p.x-p.r*Math.sqrt(3)/2)),right:Math.max(...[...positions.values()].map(p=>p.x+p.r*Math.sqrt(3)/2)),top:Math.min(...[...positions.values()].map(p=>p.y-p.r)),bottom:Math.max(...[...positions.values()].map(p=>p.y+p.r))};

  let focusedCluster=null,focusedRegion=null,routeTarget=null,hoverTarget=null,routeKind=null;
  let previewRegion=null,previewCluster=null,previewTimer=null,inspectedParticle=null;
  const boundaryLoops=new Map(),outlineElements=new Map();
  let mode='graph', selected=null, current='pip', activeGroup='all', detailTab='properties';
  let query='', charge='all', spin='all', scale=1, tx=0, ty=0, autoFit=true;
  let sortKey='pdg', sortDirection=1, lastSheetTrigger=null;
  const enabledEdges=new Set(Object.keys(edgeColors));
  const nodeElements=new Map(), edgeElements=new Map(), edgeTracks=new Map(), hullElements=new Map(), miniElements=new Map(), clusterElements=new Map();
  const endpointTransforms=new Map(),endpointElements=new Map();
  const routes=window.PARTICLE_ROUTES.create(diagram);
  const escape = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).toLocaleLowerCase('ru').replace(/ё/g,'е');
  const isMobile = () => matchMedia('(max-width:900px), (hover:none) and (pointer:coarse)').matches;
  const compactMap = () => isMobile()&&wrap.clientWidth>=600&&wrap.clientHeight<500;
  function placeRelationPanel(){
    const panel=$('#connectionReadout'),host=isMobile()?$('#linksPanel'):$('#details');
    if(panel.parentElement!==host){if(isMobile())host.prepend(panel);else host.append(panel);}
  }
  const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  function hexPoints(r) {
    return Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return `${Math.cos(a)*r},${Math.sin(a)*r}`;}).join(' ');
  }
  const shades={mesons:['#f45670','#ff776a','#de3c60','#ef947e','#f47f9b','#c74263','#ff6064','#de7791'],baryons:['#4b9af2','#6ebdf5','#5077dc','#55acd8','#657cdb','#7b9fee','#368fba','#8797e4'],quarks:['#b27aef','#9670e8'],leptons:['#4dce96','#7fe2b0'],bosons:['#ebc668','#e8ae49','#ffe499']};
  const tileColors=new Map(clusters.map(c=>[c.id,(shades[c.root]||[colors[c.tone]])[c.shade%(shades[c.root]?.length||1)]]));
  const colorFor=p=>tileColors.get(membership.get(p.id))||colors[tone(p)];
  function el(tag, attrs={}, text='') {
    const item=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>item.setAttribute(key,value));
    if(text) item.textContent=text;
    return item;
  }
  function tone(p) {
    return clusterMap.get(membership.get(p.id))?.tone||groups.get(p.group).tone;
  }
  function baseVisible(p) {
    const sign=p.charge.startsWith('−')||p.charge.startsWith('-')?'negative':p.charge.startsWith('+')?'positive':'neutral';
    return (activeGroup==='all'||p.group===activeGroup) && (charge==='all'||charge===sign) && (spin==='all'||spin===p.spin);
  }
  function matches(p) {
    if(/^-?\d+$/.test(query)&&byPdg.has(Number(query)))return p.pdg===Number(query);
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
  function closedPath(loops){
    return loops.map(points=>points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')+' Z').join(' ');
  }
  function insetLoop(points,padding){
    // Each directed shore keeps its own cells on the right, including holes.
    return points.map((b,i)=>{
      const a=points[(i+points.length-1)%points.length],c=points[(i+1)%points.length];
      const u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y},ul=Math.hypot(u.x,u.y),vl=Math.hypot(v.x,v.y);
      const first={x:b.x-u.y/ul*padding,y:b.y+u.x/ul*padding},second={x:b.x-v.y/vl*padding,y:b.y+v.x/vl*padding};
      const cross=u.x*v.y-u.y*v.x;
      if(Math.abs(cross)<.001)return first;
      const t=((second.x-first.x)*v.y-(second.y-first.y)*v.x)/cross;
      return {x:first.x+t*u.x,y:first.y+t*u.y};
    });
  }
  function updateOutlineHighlights(){
    const active=selected?membership.get(selected):focusedCluster;
    wrap.classList.toggle('previewing',!!(previewRegion||previewCluster));
    clusters.forEach(c=>{
      const holder=outlineElements.get(c.id);if(!holder)return;
      const preview=c.id===previewCluster||(!previewCluster&&c.root===previewRegion);
      const chosen=!previewRegion&&!previewCluster&&c.id===active;
      holder.style.display=(preview||chosen)&&c.ids.some(id=>nodeElements.get(id).style.display!=='none')?'':'none';
      holder.classList.toggle('chosen',chosen);holder.classList.toggle('preview',preview);
      clusterElements.get(c.id).classList.toggle('cluster-preview',c.id===previewCluster);
      if(preview||chosen){
        const d=closedPath(boundaryLoops.get(c.id).map(loop=>insetLoop(loop,Math.min(12,5/scale))));
        holder.querySelectorAll('path').forEach(path=>path.setAttribute('d',d));
      }
    });
    nodeElements.forEach((node,id)=>{
      const cluster=membership.get(id);
      node.classList.toggle('family-preview-outside',!!previewRegion&&clusterMap.get(cluster).root!==previewRegion);
      node.classList.toggle('subgroup-preview-outside',!!previewCluster&&cluster!==previewCluster);
    });
    regions.forEach(r=>$('#groupBorders').querySelector('.group-border[data-region='+r.id+']').classList.toggle('group-preview',r.id===previewRegion));
  }
  function refreshPreview(){
    updateHierarchy();updateLevel();
    const {top,bottom}=mapInsets();
    $('#mapSurfaceRect').setAttribute('y',top);$('#mapSurfaceRect').setAttribute('height',Math.max(1,wrap.clientHeight-top-bottom));
  }
  function showFamilyPreview(id){
    clearTimeout(previewTimer);if(previewRegion===id)return;
    inspectedParticle=null;previewRegion=id;previewCluster=null;refreshPreview();
  }
  function schedulePreviewClear(){
    clearTimeout(previewTimer);previewTimer=setTimeout(()=>{previewRegion=null;previewCluster=null;refreshPreview();},180);
  }
  function showClusterPreview(id){
    if(id)clearTimeout(previewTimer);previewCluster=id;updateInspection();updateOutlineHighlights();
  }
  function inspectParticle(id){
    clearTimeout(previewTimer);previewRegion=null;inspectedParticle=id;
    previewCluster=id?membership.get(id):null;
    refreshPreview();highlightRoutes(id);
  }
  function buildGraph() {
    const defs=$('#worldDefs');
    const cosmos=$('#cosmos');
    for(let i=0;i<240;i++)cosmos.append(el('circle',{cx:noise(i+1)*1600,cy:noise(i+811)*1200,r:noise(i+45)>.94?2.0:.45+noise(i+271)*.85,fill:i%9===0?'#e9d7ff':'#b8d5ff',opacity:.13+noise(i+135)*.52,class:i%13===0?'twinkle':''}));
    Object.entries(edgeColors).forEach(([kind,color])=>{
      const marker=el('marker',{id:'arrow-'+kind,markerWidth:12,markerHeight:12,refX:8,refY:4.5,orient:'auto',markerUnits:'userSpaceOnUse',viewBox:'0 0 9 9'});
      marker.append(el('path',{d:'M0 0 L9 4.5 L0 9 L2 4.5 Z',fill:'#ffffff',stroke:'#070b12','stroke-width':.7,'paint-order':'stroke'}));defs.append(marker);
    });
    function traceBoundary(ids){
      const segments=new Map(),key=p=>p.x.toFixed(4)+','+p.y.toFixed(4);
      ids.forEach(id=>{
        const points=window.PARTICLE_ROUTES.vertices(positions.get(id));
        points.forEach((a,i)=>{
          const b=points[(i+1)%6],edge=[key(a),key(b)].sort().join('|');
          if(segments.has(edge))segments.delete(edge);else segments.set(edge,[a,b]);
        });
      });
      const outgoing=new Map([...segments.values()].map(([a,b])=>[key(a),[a,b]])),loops=[];
      while(outgoing.size){
        const start=outgoing.keys().next().value,loop=[];let current=start;
        do{
          const edge=outgoing.get(current);if(!edge)throw new Error('Open subgroup boundary');
          loop.push(edge[0]);outgoing.delete(current);current=key(edge[1]);
        }while(current!==start);
        loops.push(loop);
      }
      return loops;
    }
    const boundary=ids=>closedPath(traceBoundary(ids));
    regions.forEach(region=>{
      const holder=el('g',{class:'region','data-region':region.id,style:'--tone:'+colors[region.tone],role:'button',tabindex:0,'aria-label':region.label+' — '+region.count+' состояний. Выбрать группу.'});
      const {x,y,width,height}=region.header;
      holder.append(el('rect',{x,y,width,height,fill:'transparent',class:'region-hit'}));
      const title=el('text',{x:x+width/2,y:y+height/2,'text-anchor':'middle',class:'region-title',fill:colors[region.tone]},rootCodes[region.id]+' · '+region.label);
      title.append(el('tspan',{dx:8,class:'region-count'},'('+region.count+')'));holder.append(title);
      holder.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusRegion(region.id);}});
      $('#mapHeadings').append(holder);hullElements.set(region.id,holder);
      $('#groupBorders').append(el('path',{d:boundary(region.children.flatMap(c=>c.ids)),class:'group-cut','data-region':region.id}));
      $('#groupBorders').append(el('path',{d:boundary(region.children.flatMap(c=>c.ids)),class:'group-border','data-region':region.id,stroke:colors[region.tone]}));
      holder.addEventListener('pointerenter',event=>{if(!isMobile()&&event.pointerType!=='touch')showFamilyPreview(region.id);});
      holder.addEventListener('pointerleave',schedulePreviewClear);
    });
    clusters.forEach(cluster=>{
      const color=tileColors.get(cluster.id),loops=traceBoundary(cluster.ids),outline=closedPath(loops);boundaryLoops.set(cluster.id,loops);
      const focus=el('g',{class:'cluster-outline','data-cluster':cluster.id,'pointer-events':'none',style:'display:none'});
      focus.append(el('path',{class:'outline-casing'}),el('path',{class:'outline-ink'}));$('#clusterOutlines').append(focus);outlineElements.set(cluster.id,focus);
      const gradient=el('linearGradient',{id:'tile-'+cluster.id.replace(':','-'),x1:'0%',y1:'0%',x2:'70%',y2:'100%'});
      [['0%',.57],['100%',.28]].forEach(([offset,opacity])=>gradient.append(el('stop',{offset,'stop-color':color,'stop-opacity':opacity})));defs.append(gradient);
      const holder=el('g',{class:'cluster','data-cluster':cluster.id,style:'--tone:'+color,role:'button',tabindex:0,'aria-label':cluster.label+' — '+cluster.ids.length+' состояний. Выбрать подгруппу.'});
      holder.append(el('path',{d:outline,class:'subgroup-depth',transform:'translate(0 8)'}));
      holder.append(el('path',{d:outline,class:'subgroup-boundary',stroke:'#070b12'}));
      holder.append(el('path',{d:outline,class:'subgroup-rim',stroke:'#a6b4c7'}));
      holder.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusCluster(cluster.id);}});
      $('#hulls').append(holder);clusterElements.set(cluster.id,holder);

    });
    D.edges.forEach(edge=>{
      const path=el('path',{class:'edge',stroke:'#ffffff',style:'color:#ffffff',d:'M0 0','data-id':edge.id,'data-from':edge.from,'data-to':edge.to,'data-kind':edge.kind});
      if(edge.kind!=='family')path.setAttribute('marker-end','url(#arrow-'+edge.kind+')');
      if(edgePatterns[edge.kind])path.setAttribute('stroke-dasharray',edgePatterns[edge.kind]);
      const track=el('path',{class:'edge-track',d:'M0 0'});$('#edgeTracks').append(track);edgeTracks.set(edge.id,track);
      $('#edges').append(path);edgeElements.set(edge.id,path);
    });
    D.particles.forEach(p=>{
      const {x,y,r}=positions.get(p.id),color=colorFor(p);
      const node=el('g',{class:'node','data-id':p.id,'data-cluster':membership.get(p.id),transform:`translate(${x} ${y})`,role:'button',tabindex:0,'aria-label':p.symbol+' — '+p.ru,style:'--tone:'+color});
      node.append(el('polygon',{class:'selection-ring',points:hexPoints(r-4),'pointer-events':'none'}));
      node.append(el('polygon',{class:'sphere hex-cell','data-radius':r,points:hexPoints(r),fill:'url(#tile-'+membership.get(p.id).replace(':','-')+')',stroke:color}));
      const label=el('text',{class:'particle-label',x:0,y:0});
      const split=p.symbol.match(/^(.+?)(\([^)]*\).*)$/);
      if(split){label.append(el('tspan',{class:'symbol-main',x:0,y:-4},split[1]));label.append(el('tspan',{class:'symbol-state',x:0,y:15},split[2]));}
      else label.textContent=p.symbol;
      node.append(label);
      const mark=el('g',{class:'endpoint-mark',transform:'translate(0 28)','aria-hidden':'true',style:'display:none'});
      mark.append(el('polygon',{points:hexPoints(6),fill:'#fff',stroke:'#070b12'}));mark.append(el('text',{x:0,y:0},''));
      const overlay=el('g',{class:'endpoint-holder',transform:`translate(${x} ${y})`,'pointer-events':'none'});overlay.append(mark);$('#endpointMarks').append(overlay);endpointElements.set(p.id,mark);
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(p.id,true);}});
      node.addEventListener('pointerenter',event=>{
        if(isMobile()||event.pointerType==='touch')return;
        inspectParticle(p.id);
      });
      node.addEventListener('pointerleave',()=>{if(inspectedParticle===p.id)inspectParticle(null);});
      $('#nodes').append(node);nodeElements.set(p.id,node);
      const mini=el('polygon',{points:hexPoints(r),transform:`translate(${x} ${y})`,fill:color,'fill-opacity':.75});$('#miniNodes').append(mini);miniElements.set(p.id,mini);
    });
    $('#minimap').setAttribute('viewBox',`0 0 ${world.width} ${world.height}`);
    fitNodeLabels();
    document.fonts.ready.then(()=>{fitNodeLabels();updateLevel();});
  }
  function restoreEndpointLabels(){
    endpointTransforms.forEach((value,label)=>value===null?label.removeAttribute('transform'):label.setAttribute('transform',value));endpointTransforms.clear();
  }
  function fitNodeLabels() {
    restoreEndpointLabels();
    nodeElements.forEach((node,id)=>{
      const label=node.querySelector('.particle-label'),r=positions.get(id).r,main=label.querySelector('.symbol-main'),state=label.querySelector('.symbol-state');
      label.removeAttribute('textLength');label.removeAttribute('lengthAdjust');label.removeAttribute('transform');
      let size=32;
      for(let pass=0;pass<5;pass++){
        label.style.fontSize=size+'px';label.setAttribute('font-size',size);
        label.setAttribute('x',0);label.setAttribute('y',0);
        if(main){
          main.setAttribute('x',0);main.setAttribute('y',-3);state.setAttribute('x',0);state.setAttribute('y',size*.51);
          state.style.fontSize=size*.45+'px';
          [main,state].forEach(t=>{const b=t.getBBox();t.setAttribute('x',-(b.x+b.width/2));});
        }
        const b=label.getBBox(),x=Math.max(Math.abs(b.x),Math.abs(b.x+b.width));
        const y=Math.max(Math.abs(b.y),Math.abs(b.y+b.height));
        const factor=Math.min(1,r*1.42/(b.width||1),r*1.36/(b.height||1),r*.81/Math.hypot(x,y));
        if(factor>=.999)break;size*=factor;
      }
      const b=label.getBBox();
      if(!main){label.setAttribute('x',-(b.x+b.width/2));label.setAttribute('y',-(b.y+b.height/2));}
      else {const shift=-(b.y+b.height/2);[main,state].forEach(t=>t.setAttribute('y',+t.getAttribute('y')+shift));}
    });
  }
  function updateHierarchy(){
    const band=$('#hierarchyBand'),particle=inspectedParticle||selected,root=previewRegion||(particle?clusterMap.get(membership.get(particle)).root:focusedRegion);
    band.hidden=mode!=='graph';if(band.hidden)return;
    const active=previewRegion?null:particle?membership.get(particle):focusedCluster;
    const status=$('#hierarchyStatus'),index=$('#subgroupIndex');
    if(!root){
      status.textContent='Выберите семейство → подгруппу → частицу';index.innerHTML='';band.dataset.level='overview';
    }else{
      const region=regionMap.get(root);band.dataset.level=active?'particles':'families';
      status.textContent=(previewRegion?'Наведение · ':'')+rootCodes[root]+' · '+region.label+' / '+(active?'Подгруппа '+clusterCodes.get(active)+' · '+clusterName(clusterMap.get(active)):region.children.length+' подгрупп');
      const entries=active?[clusterMap.get(active)]:region.children;
      const pinned=selected?membership.get(selected):focusedCluster;
      index.innerHTML=entries.map(c=>`<button class="subgroup-key ${pinned===c.id?'active':''}" data-cluster="${escape(c.id)}" aria-pressed="${pinned===c.id}" style="--tone:${tileColors.get(c.id)}"><b>${escape(clusterCodes.get(c.id))}</b><span>${escape(clusterName(c))}</span><small>${c.ids.length}</small></button>`).join('')+(active?`<button class="all-subgroups" data-region="${root}">Все ${region.children.length} подгрупп</button>`:'');
    }
    updateInspection();
  }
  function updateInspection(){
    const c=previewCluster?clusterMap.get(previewCluster):previewRegion?null:selected?clusterMap.get(membership.get(selected)):focusedCluster?clusterMap.get(focusedCluster):null;
    const root=c?.root||previewRegion||focusedRegion,hovering=!!(previewRegion||previewCluster||inspectedParticle);
    const band=$('#hierarchyBand');band.dataset.inspection=hovering?'hover':'selection';
    if(root){
      $('#hierarchyStatus').textContent=(hovering?'Наведение · ':'')+rootCodes[root]+' · '+regionMap.get(root).label+' / '+(c?'Подгруппа '+clusterCodes.get(c.id)+' · '+clusterName(c):regionMap.get(root).children.length+' подгрупп');
    }
    const p=byId.get(inspectedParticle||(!previewRegion&&!previewCluster?selected:null));
    $('#mapInspection').textContent=p?p.symbol+' · '+p.ru+(isMobile()?'':' · PDG '+p.pdg):hovering?(previewRegion&&!previewCluster?'Голубые контуры — подгруппы семейства':'Голубой контур показывает подгруппу'):c?'Подгруппа выделена золотым контуром':'Названия сверху · выбор не меняет масштаб';
    regions.forEach(r=>hullElements.get(r.id).classList.toggle('region-preview',hovering&&r.id===root));
    $$('#subgroupIndex .subgroup-key').forEach(key=>key.classList.toggle('preview',key.dataset.cluster===previewCluster));
  }
  function updateLevel() {
    placeRelationPanel();
    wrap.classList.toggle('compact-map',compactMap());
    wrap.classList.toggle('particle-selected',!!selected);
    restoreEndpointLabels();
    const overview=scale<.3,detail=scale>=.65;
    svg.classList.toggle('overview',overview);svg.classList.toggle('detail-level',detail);
    const headingOrder=['mesons','quarks','bosons','leptons','baryons'];
    const slot=(wrap.clientWidth-32)/5,headY=isMobile()?44:88;
    headingOrder.forEach((id,i)=>{
      const region=regionMap.get(id),holder=hullElements.get(id),title=holder.querySelector('.region-title'),hit=holder.querySelector('rect');
      holder.setAttribute('transform','');
      const x=16+i*slot;
      Object.entries({x,y:headY,width:slot-5,height:30,rx:6}).forEach(([k,v])=>hit.setAttribute(k,v));
      title.firstChild.nodeValue=(slot<75?'':rootCodes[id]+' · ')+region.label;
      title.querySelector('.region-count').style.display=slot<120?'none':'';
      title.style.fontSize=(slot<85?10:14)+'px';title.setAttribute('x',x+(slot-5)/2);title.setAttribute('y',headY+20);
    });
    nodeElements.forEach((node,id)=>{
      const label=node.querySelector('.particle-label'),size=Number(label.getAttribute('font-size'));
      label.style.opacity=selected===id||id===(hoverTarget||routeTarget)||(!overview&&size*scale>=7)?'1':'0';
    });
    $$('#worldDefs marker').forEach(marker=>{const size=12*Math.max(1,.8/scale);marker.setAttribute('markerWidth',size);marker.setAttribute('markerHeight',size);});
    updateEndpointMarks();
    $('#levelInfo').textContent=selected?'Белая линия: 1 → 2 · тип связи подписан ниже':focusedRegion?'Названия подгрупп — в верхней панели':'Толстая граница — семейство · тонкая — подгруппа';
    updateConnectionReadout();updateOutlineHighlights();
  }
  function focusRegion(id) {
    const region=regionMap.get(id);if(!region)return;
    focusedRegion=id;focusedCluster=null;selected=null;
    $('#mapPath').textContent=region.label;applyState();
  }
  function focusCluster(id) {
    const cluster=clusterMap.get(id);if(!cluster)return;
    focusedRegion=cluster.root;focusedCluster=id;selected=null;
    $('#mapPath').textContent=regionMap.get(cluster.root).label+' / '+cluster.label;
    applyState();
  }
  function applyState() {
    clearTimeout(previewTimer);previewRegion=null;previewCluster=null;inspectedParticle=null;hoverTarget=null;updateHierarchy();
    if(!selected)routeTarget=null;
    else if(routeTarget&&!connectionTargets().includes(routeTarget))routeTarget=connectionTargets()[0]||null;
    const hits=filtered(),hitIds=new Set(hits.map(p=>p.id)),rel=selected?neighbors(selected):new Set();
    const visible=new Set(D.particles.filter(p=>baseVisible(p)&&(hitIds.has(p.id)||(query&&hits.length&&rel.has(p.id)))).map(p=>p.id));
    nodeElements.forEach((node,id)=>{
      node.style.display=visible.has(id)?'':'none';
      node.setAttribute('tabindex',visible.has(id)?'0':'-1');
      node.setAttribute('aria-pressed',String(id===selected));
      node.classList.toggle('selected',id===selected);node.classList.toggle('lifted',membership.get(id)===(selected?membership.get(selected):focusedCluster));
      node.classList.toggle('related',rel.has(id)&&id!==selected);
      node.classList.toggle('dim',selected?!rel.has(id):focusedCluster?membership.get(id)!==focusedCluster:!!focusedRegion&&clusterMap.get(membership.get(id)).root!==focusedRegion);
      miniElements.get(id).style.opacity=visible.has(id)?(selected&&!rel.has(id)?'.18':'1'):'.04';
    });
    D.edges.forEach(edge=>{
      const path=edgeElements.get(edge.id);if(!path)return;
      const active=selected&&(edge.from===selected||edge.to===selected);
      path.style.display=enabledEdges.has(edge.kind)&&visible.has(edge.from)&&visible.has(edge.to)&&active?'':'none';
      edgeTracks.get(edge.id).style.display=path.style.display;
      path.classList.toggle('active',!!active);
      if(active&&enabledEdges.has(edge.kind)&&visible.has(edge.from)&&visible.has(edge.to)&&!path.dataset.routed){
        const lanes={strong:-.8,em:.8,weak:0,composition:1.4,mixing:-1.4,family:0};
        const points=window.PARTICLE_ROUTES.offsetPath(routes.route(edge.from,edge.to),lanes[edge.kind]);
        path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' '));path.dataset.routed='true';edgeTracks.get(edge.id).setAttribute('d',path.getAttribute('d'));
      }
    });
    clusters.forEach(cluster=>{
      const holder=clusterElements.get(cluster.id),show=cluster.ids.some(id=>visible.has(id));
      holder.style.display=show?'':'none';holder.setAttribute('tabindex',show?'0':'-1');
      holder.classList.toggle('cluster-muted',selected?!cluster.ids.some(id=>rel.has(id)):focusedCluster?cluster.id!==focusedCluster:!!focusedRegion&&cluster.root!==focusedRegion);
      holder.classList.toggle('cluster-focused',cluster.id===focusedCluster);holder.classList.toggle('subgroup-lifted',cluster.id===(selected?membership.get(selected):focusedCluster));
    });
    regions.forEach(region=>{
      const show=region.children.some(c=>c.ids.some(id=>visible.has(id)));
      const holder=hullElements.get(region.id);holder.style.display=show?'':'none';holder.setAttribute('tabindex',show?'0':'-1');holder.classList.toggle('region-focused',region.id===(selected?clusterMap.get(membership.get(selected)).root:focusedRegion));
      $('#groupBorders').querySelector('.group-border[data-region='+region.id+']').classList.toggle('group-focused',region.id===(selected?clusterMap.get(membership.get(selected)).root:focusedRegion));
    });
    highlightRoutes(null);updateLevel();
    $('#resultCount').textContent=query?hits.length+' найдено':'';
    $('#visibleCount').textContent=hits.length+' / '+D.particles.length+' состояний';
    $('#emptyState').hidden=hits.length>0;
    $('#showAll').hidden=!selected||mode!=='graph';
    $('#selectionHint').textContent=selected?'Выбрано: '+byId.get(selected).symbol:'Выберите узел на карте';
    if(mode!=='graph') renderMode();
  }
  function connectionTargets(){
    if(!selected)return [];
    const rank={strong:0,em:1,weak:2,composition:3,mixing:4,family:5},targets=new Map();
    D.edges.filter(e=>enabledEdges.has(e.kind)&&(e.from===selected||e.to===selected)).forEach(e=>{
      const id=e.from===selected?e.to:e.from;
      if(!baseVisible(byId.get(id)))return;
      targets.set(id,Math.min(targets.get(id)??99,rank[e.kind]));
    });
    return [...targets].sort((a,b)=>a[1]-b[1]||Math.hypot(positions.get(a[0]).x-positions.get(selected).x,positions.get(a[0]).y-positions.get(selected).y)-Math.hypot(positions.get(b[0]).x-positions.get(selected).x,positions.get(b[0]).y-positions.get(selected).y)).map(([id])=>id);
  }
  function activeRelation(){
    const target=hoverTarget||routeTarget;
    if(!selected||!target)return null;
    const edges=D.edges.filter(e=>enabledEdges.has(e.kind)&&[e.from,e.to].includes(selected)&&[e.from,e.to].includes(target)).sort((a,b)=>edgeRank[a.kind]-edgeRank[b.kind]);
    const kind=edges.some(e=>e.kind===routeKind)?routeKind:edges[0]?.kind;
    const shown=edges.filter(e=>e.kind===kind),edge=shown[0];if(!edge)return null;
    return {target,edges,shown,kind,from:edge.kind==='family'?selected:edge.from,to:edge.kind==='family'?target:edge.to,both:shown.some(e=>e.from===edge.to&&e.to===edge.from)};
  }
  function updateEndpointMarks(){
    restoreEndpointLabels();
    const relation=activeRelation();
    nodeElements.forEach((node,id)=>{
      const mark=endpointElements.get(id),number=relation?(id===relation.from?1:id===relation.to?2:0):0;
      mark.style.display=number?'':'none';mark.querySelector('text').textContent=number||'';
      mark.setAttribute('transform',scale<.55?`translate(0 0) scale(${1.2/scale})`:`translate(0 28) scale(${Math.max(1,1.2/scale)})`);
      if(number&&scale<.55)node.querySelector('.particle-label').style.opacity='0';
      node.classList.toggle('route-from',!!number&&number===1);node.classList.toggle('route-to',!!number&&number===2);
      if(number){
        const label=node.querySelector('.particle-label'),b=label.getBBox(),matrix=label.transform.baseVal.numberOfItems?label.transform.baseVal.getItem(0).matrix.a:1;
        const bottom=28-6*Math.max(1,1.2/scale)-2/scale;
        if(scale>=.55&&(b.y+b.height)*matrix>bottom){endpointTransforms.set(label,label.getAttribute('transform'));label.setAttribute('transform',`scale(${matrix*bottom/((b.y+b.height)*matrix)})`);}
      }
    });
  }
  function highlightRoutes(id){
    hoverTarget=selected&&id&&id!==selected&&neighbors(selected).has(id)?id:null;
    const target=hoverTarget||routeTarget,pair=selected&&target,relation=activeRelation();
    edgeElements.forEach(path=>{
      const matching=relation&&relation.shown.some(e=>e.id===path.dataset.id);
      path.classList.toggle('route-highlight',!!matching);path.classList.toggle('route-muted',!!pair&&!matching);
      edgeTracks.get(path.dataset.id).classList.toggle('route-muted',!!pair&&!matching);
      if(matching)$('#edges').append(path);
    });
    nodeElements.forEach((node,id)=>{
      node.classList.toggle('route-target',!!pair&&id===target);
      const label=node.querySelector('.particle-label'),size=Number(label.getAttribute('font-size'));
      label.style.opacity=selected===id||id===target||(scale>=.3&&size*scale>=7)?'1':'0';
    });
    updateEndpointMarks();updateConnectionReadout();
  }
  function updateConnectionReadout(){
    const box=$('#connectionReadout'),target=hoverTarget||routeTarget,targets=connectionTargets(),relation=activeRelation();
    box.hidden=!selected||mode!=='graph';
    $('.mobile-relation-controls').hidden=box.hidden;
    if(box.hidden){$('#mobileRelationPair').textContent='Коснитесь частицы';$('#mobileRelationKind').textContent='Связи выбранной частицы появятся здесь';return;}
    $('#connectionEnds').hidden=!relation;$('#connectionTypes').replaceChildren();
    if(!relation){$('#connectionPair').textContent=byId.get(selected).symbol+(targets.length?' · все связи':' · связей нет');$('#connectionKind').textContent=targets.length+' связанных частиц';}
    else {
      const arrow=relation.kind==='family'?' — ':relation.both?' ↔ ':' → ';
      $('#connectionPair').textContent='1 '+byId.get(relation.from).symbol+arrow+'2 '+byId.get(relation.to).symbol;
      $('#connectionKind').textContent='Тип: '+edgeNames[relation.kind];
      for(const [side,id,number] of [['From',relation.from,1],['To',relation.to,2]]){
        const particle=byId.get(id),c=clusterMap.get(membership.get(id));
        $('#connection'+side+'Role').textContent=number+' · '+(relation.kind==='family'?'Частица':relation.both?'В обе стороны':side==='From'?'Откуда':'Куда');
        $('#connection'+side+'Symbol').textContent=particle.symbol+' · '+particle.ru;
        $('#connection'+side+'Address').textContent=rootCodes[c.root]+' '+regionMap.get(c.root).label+' → '+clusterCodes.get(c.id)+' '+clusterName(c);
      }
      const kinds=[...new Set(relation.edges.map(e=>e.kind))];
      if(kinds.length>1)kinds.forEach(kind=>{
        const button=document.createElement('button');button.dataset.kind=kind;button.textContent=edgeNames[kind];button.setAttribute('aria-pressed',String(kind===relation.kind));$('#connectionTypes').append(button);
      });
    }
    $('#connectionPosition').textContent=target?(targets.indexOf(target)+1)+' / '+targets.length:String(targets.length);
    $('#connectionPrev').disabled=$('#connectionNext').disabled=targets.length<2;
    $('#connectionAll').disabled=!targets.length;
    $('#connectionAll').setAttribute('aria-pressed',String(!routeTarget));$('#connectionAll').textContent=routeTarget?'Все связи':'По одной';
    $('#mobileRelationPair').textContent=$('#connectionPair').textContent;
    $('#mobileRelationKind').textContent=$('#connectionKind').textContent+' · '+$('#connectionPosition').textContent;
    $('#mobileConnectionPrev').disabled=$('#connectionPrev').disabled;
    $('#mobileConnectionNext').disabled=$('#connectionNext').disabled;
  }
  function stepConnection(step){
    const targets=connectionTargets();if(!targets.length)return;
    routeTarget=targets[(Math.max(0,targets.indexOf(routeTarget))+step+targets.length)%targets.length];
    highlightRoutes(null);
  }
  function particleChip(p, extra='') {
    return `<button class="particle-chip ${p.id===selected?'selected':''} ${extra}" data-particle="${escape(p.id)}" style="--c:${colorFor(p)}" title="${escape(p.ru)}">${escape(p.symbol)}</button>`;
  }
  function updateDetails() {
    const p=byId.get(current),group=groups.get(p.group);
    $('#detailSymbol').textContent=p.symbol;$('#detailSymbol').style.setProperty('--c',colorFor(p));
    $('#detailName').textContent=p.name+' · '+p.ru;
    $('#metricStrip').innerHTML=[['Масса',p.mass],['Заряд',p.charge],['Спин J',p.spin]].map(([label,value],i)=>`<div><small>${escape(label)}</small><strong class="${i===0?'mass':''}">${escape(value)}</strong></div>`).join('');
    const rows=[['Символ',p.symbol],['Название',p.ru],['PDG ID',p.pdg],['Класс',group.label],['Чётность P',p.parity],['C-чётность',p.cparity],['Кварковый состав',p.quarks],['Жизнь / ширина',p.lifetime]];
    $('#props').innerHTML=rows.map(([name,value])=>`<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join('');
    $('#dataSource').innerHTML=p.source?'<a href="https://pdg.lbl.gov/2024/api/index.html" target="_blank" rel="noopener">PDG 2024 · '+escape(p.source.particle)+'</a>':'Исходная выборка · PDG 2024';
    $('#decays').innerHTML=p.decays.length?p.decays.map(([channel,br])=>`<div class="decay-row"><span>${escape(channel)}</span><small>${escape(br)}</small></div>`).join(''):'<p class="help">'+escape(p.lifetime)+'<br>Каналы распада в наборе не указаны.</p>';
    const kinds=new Map();
    D.edges.forEach(e=>{if(e.from===current||e.to===current){const id=e.from===current?e.to:e.from;if(!kinds.has(id))kinds.set(id,new Set());kinds.get(id).add(edgeNames[e.kind]);}});
    $('#related').innerHTML=[...kinds].map(([id,k])=>{
      const related=byId.get(id);
      return `<button class="related-button" data-particle="${escape(id)}"><i class="dot" style="--c:${colorFor(related)}"></i><strong>${escape(related.symbol)}</strong><span>${escape(related.ru)}<small>${escape([...k].join(' · '))}</small></span><span class="chevron">→</span></button>`;
    }).join('')||'<p class="help">Связи в демонстрационном наборе не указаны.</p>';
  }
  function select(id,open=false) {
    if(!byId.has(id)) return;
    selected=id;current=id;hoverTarget=null;routeKind=null;focusedRegion=clusterMap.get(membership.get(id)).root;focusedCluster=null;
    $('#mapPath').textContent=regionMap.get(focusedRegion).label+' / '+clusterMap.get(membership.get(id)).label+' / '+byId.get(id).symbol;
    routeTarget=connectionTargets()[0]||null;updateDetails();applyState();
    if(open&&isMobile()&&mode!=='graph')openSheet('details');
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
    $('#mapFooter').hidden=!graph;
    $('#viewTitle').textContent=modeNames[mode];$('#graphToolbar').hidden=!graph;$('#levelInfo').hidden=!graph;
    closeSheets(false);applyState();
  }
  // Numeric values are used only for table ordering. Original display strings stay intact.
  function numeric(p,key) {
    if(key==='pdg')return p.pdg;
    if(key==='mass'&&Number.isFinite(p.massValue))return p.massValue;
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
    return `<h2>Таблица частиц</h2><p class="mode-intro">${hits.length} состояний · Нажмите заголовок для сортировки, символ — для выбора частицы. Поиск и фильтры действуют во всех режимах.</p><div class="table-wrap"><table class="particle-table"><thead><tr>${columns.map(([key,label])=>`<th scope="col" aria-sort="${key===sortKey?(sortDirection===1?'ascending':'descending'):'none'}"><button data-sort="${key}">${label}${key===sortKey?(sortDirection===1?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${sorted.map(p=>`<tr class="${selected===p.id?'selected':''}">${columns.map(([key])=>`<td>${key==='symbol'?`<button class="table-particle" data-particle="${p.id}" aria-label="${escape(p.symbol+' — '+p.ru)}" style="color:${colorFor(p)}">${escape(p.symbol)}</button>`:escape(key==='group'?groups.get(p.group).label:p[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function family(ids,title,hits,color) {
    const particles=hits.filter(p=>ids.includes(p.group));
    if(!particles.length)return '';
    return `<div class="class-family" style="--c:${color}"><h4>${title}<small>${particles.length}</small></h4><div class="particle-chips">${particles.map(p=>particleChip(p)).join('')}</div></div>`;
  }
  function renderClassification(hits) {
    return `<h2>Классификация</h2><p class="mode-intro">Элементарные частицы и составные адроны. Выберите состояние, чтобы открыть его свойства.</p><div class="classification-root"><div class="tree-label">Частицы · ${hits.length}</div><div class="tree-branches"><section class="tree-branch"><h3>Элементарные</h3><p>Фермионы: лептоны и кварки · бозоны: переносчики и Хиггс</p>${family(['leptons'],'Лептоны · фермионы',hits,colors.green)}${family(['quarks'],'Кварки · фермионы',hits,colors.purple)}${family(['bosons'],'Бозоны',hits,colors.gold)}</section><section class="tree-branch"><h3>Адроны</h3><p>Составные состояния кварков и антикварков</p>${family(['light','strange','charm','bottom'],'Мезоны · бозоны',hits,colors.rose)}${family(['baryons'],'Барионы · фермионы',hits,colors.blue)}</section></div></div>`;
  }
  function localPicker(hits,p) {
    return `<label class="local-picker" for="localParticle">Выбранная частица<select id="localParticle">${hits.map(item=>`<option value="${item.id}" ${item.id===p.id?'selected':''}>${escape(item.symbol+' · '+item.ru)}</option>`).join('')}</select></label>`;
  }
  function quarkTokens(p) {
    return p.quarks.replace(/\bmixture\b/g,'').match(/[udscbtū]̄?/g)||[];
  }
  function renderComposition(hits,p) {
    const hadron=['light','strange','charm','bottom','baryons'].includes(p.group);
    const tokens=hadron?quarkTokens(p):[];
    const mixed=/mixture|√/.test(p.quarks);
    const compositionCaption=!tokens.length?'Однозначный валентный состав в этой выборке не указан.':mixed?'Смешанное состояние: показаны компоненты сохранённой формулы, а не один фиксированный набор кварков.':'Кнопки компонентов открывают свойства соответствующего кваркового аромата. Черта обозначает антикварк.';
    const components=tokens.map(token=>{
      const anti=token==='ū'||token.includes('̄');
      const flavor=token==='ū'?'u':token[0];
      return `<button class="component-orb" data-particle="${flavor}" title="${anti?'Антикварк; свойства соответствующего кварка':'Кварк'} ${flavor}" aria-label="${anti?'Антикварк':'Кварк'} ${flavor}, открыть свойства кварка">${escape(token)}</button>`;
    }).join('');
    // Tokenization preserves the stored formula; mixed states are not presented as a single fixed composition.
    return `<h2>Кварковый состав</h2><p class="mode-intro">Локальное представление состава выбранного состояния из текущей базы.</p>${localPicker(hits,p)}<div class="local-stage" style="--c:${colorFor(p)}"><div class="local-parent"><span>${escape(p.symbol)}</span></div><div class="formula">${escape(p.quarks)}</div>${hadron?`<div class="flow-arrow">↓</div><div class="component-orbs">${components}</div><p class="local-caption">${escape(compositionCaption)} ${escape(p.compositionNote||'')}</p>`:`<p class="local-caption">${p.group==='quarks'?'Элементарный кварк. Адроны с этим ароматом в текущем наборе:':'Элементарная частица; кваркового состава нет.'}</p>`}${p.group==='quarks'?`<div class="particle-chips">${D.particles.filter(item=>['light','strange','charm','bottom','baryons'].includes(item.group)&&quarkTokens(item).some(token=>token.replace('ū','u')[0]===p.id)).map(item=>particleChip(item)).join('')}</div>`:''}</div>`;
  }
  function decayProducts(channel) {
    // Exact symbol matching: absent antiparticles/general channels remain explicit, non-clickable labels.
    return channel.split(/\s+/).filter(Boolean).map(token=>{
      const p=D.particles.find(item=>item.symbol===token||((item.id==='nue')&&token==='νe'));
      return p?particleChip(p):`<span class="external-chip" title="Состояние или обобщённый канал вне демонстрационного набора">${escape(token)}</span>`;
    }).join('');
  }
  function renderDecays(hits,p) {
    return `<h2>Распады ${escape(p.symbol)}</h2><p class="mode-intro">Каналы и доли из базы. Нажмите продукт, чтобы продолжить цепочку; пунктиром отмечены состояния и обобщённые каналы вне набора.</p>${localPicker(hits,p)}<div class="local-stage" style="--c:${colorFor(p)}"><div class="local-parent"><span>${escape(p.symbol)}</span></div>${p.decays.length?`<div class="flow-arrow">↓</div>${p.decays.map(([channel,br])=>`<div class="channel-card"><div class="channel-head"><span>${escape(p.symbol)} → ${escape(channel)}</span><small>${escape(br)}</small></div><div class="channel-products">${decayProducts(channel)}</div></div>`).join('')}`:`<div class="stable-message">Каналы в наборе не указаны</div><p class="local-caption">${escape(p.lifetime)}</p>`}</div>`;
  }
  function renderMode() {
    const hits=filtered();
    if(!hits.length){content.replaceChildren();return;}
    const p=hits.find(item=>item.id===current)||hits[0];
    if(['composition','decays'].includes(mode)&&p.id!==current){current=p.id;selected=p.id;updateDetails();}
    content.innerHTML=mode==='table'?renderTable(hits):mode==='classification'?renderClassification(hits):mode==='composition'?renderComposition(hits,p):renderDecays(hits,p);
    content.querySelectorAll('.local-parent span').forEach(label=>{
      const b=label.getBoundingClientRect();
      label.style.fontSize=39*Math.min(1,78/(b.width||1),48/(b.height||1))+'px';
    });
  }
  function applyTransform(preserveCamera=false) {
    // Keep some of the map in reach even after a long drag or minimap jump.
    const points=[...positions.values()],left=Math.min(...points.map(p=>p.x-p.r*Math.sqrt(3)/2)),right=Math.max(...points.map(p=>p.x+p.r*Math.sqrt(3)/2));
    const upper=atlasBounds.top,lower=atlasBounds.bottom,insets=mapInsets(),top=insets.top,bottom=wrap.clientHeight-insets.bottom;
    if(!preserveCamera){
      scale=Math.max(minZoom(),Math.min(maxZoom,scale));
      const bounds=cameraInsets(),cameraBottom=cameraViewportHeight-bounds.bottom,cameraTop=bounds.top,cameraWidth=wrap.clientWidth-bounds.right;
      if((right-left)*scale>cameraWidth-48)tx=Math.max(cameraWidth-24-right*scale,Math.min(24-left*scale,tx));
      else tx=(cameraWidth-(right+left)*scale)/2;
      if((lower-upper)*scale>cameraBottom-cameraTop)ty=Math.max(cameraBottom-lower*scale,Math.min(cameraTop-upper*scale,ty));
      else ty=cameraTop+(cameraBottom-cameraTop-(lower-upper)*scale)/2-upper*scale;
    }
    const surfaceTop=top;
    Object.entries({x:0,y:surfaceTop,width:wrap.clientWidth-insets.right,height:Math.max(1,bottom-surfaceTop)}).forEach(([key,value])=>$('#mapSurfaceRect').setAttribute(key,value));
    viewport.setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);
    $('#reset').textContent=Math.round(scale*100)+'%';
    $('#minus').disabled=scale<=minZoom()+.000001;
    $('#plus').disabled=scale>=maxZoom-.000001;
    const mini=$('#miniViewport'),miniTop=top,miniBottom=insets.bottom;
    Object.entries({x:-tx/scale,y:(miniTop-ty)/scale,width:wrap.clientWidth/scale,height:(wrap.clientHeight-miniTop-miniBottom)/scale}).forEach(([key,value])=>mini.setAttribute(key,value));
    updateLevel();
  }
  function centerOverview() {
    scale=overviewScale();
    const {top,bottom,right}=cameraInsets();
    tx=(wrap.clientWidth-right-(atlasBounds.left+atlasBounds.right)*scale)/2;
    ty=top+(wrap.clientHeight-top-bottom-(atlasBounds.bottom-atlasBounds.top)*scale)/2-atlasBounds.top*scale;
    applyTransform();
  }
  function fit() {
    cameraViewportHeight=wrap.clientHeight;
    autoFit=true;focusedCluster=null;focusedRegion=null;
    $('#mapPath').textContent='Все семейства';applyState();centerOverview();
  }
  function focusParticle(id,minScale=.85) {
    const p=positions.get(id);if(!p)return;
    const available=isMobile()&&$('#details').classList.contains('open')?wrap.clientHeight-$('#details').offsetHeight:wrap.clientHeight;
    scale=Math.max(scale,minScale);tx=(wrap.clientWidth-cameraInsets().right)/2-p.x*scale;ty=Math.max(mapInsets().top+p.r*scale,available*.45)-p.y*scale;autoFit=false;applyTransform();
  }
  function zoomAt(factor,x,y) {
    const next=Math.max(minZoom(),Math.min(maxZoom,scale*factor));
    tx=x-(x-tx)*next/scale;ty=y-(y-ty)*next/scale;scale=next;autoFit=false;applyTransform();
  }
  function chooseFromSearch(open=false) {
    const hits=filtered();
    const exact=hits.find(p=>[p.pdg,p.symbol,...(p.aliases||[])].some(value=>normalize(value)===query));
    const p=exact||hits[0];
    if(query&&p){select(p.id,open);if(open&&isMobile())openSheet('details');}
    else {selected=null;focusedCluster=null;focusedRegion=null;$('#mapPath').textContent=activeGroup==='all'?'Все семейства':labels[activeGroup];applyState();}
  }
  function clearFilters() {
    activeGroup='all';charge='all';spin='all';query='';search.value='';selected=null;focusedCluster=null;focusedRegion=null;
    $('#mapPath').textContent='Все семейства';
    $('#chargeFilter').value='all';$('#spinFilter').value='all';
    enabledEdges.clear();Object.keys(edgeColors).forEach(kind=>enabledEdges.add(kind));
    $$('[data-edge]').forEach(input=>input.checked=true);
    updateFilterButtons();applyState();
  }
  function updateFilterButtons() {
    $$('.filter').forEach(button=>{const active=button.dataset.group===activeGroup;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }
  function closeSheets(restoreFocus=true) {
    $('#filters').classList.remove('open');$('#details').classList.remove('open');$('#overlay').hidden=true;
    $('#mainMenu').classList.remove('open');if(isMobile())$('#topReveal').setAttribute('aria-expanded','false');
    $('#overlay').classList.remove('detail-overlay');
    $('#filtersBtn').setAttribute('aria-expanded','false');$('#detailBtn').setAttribute('aria-expanded','false');
    if(restoreFocus&&lastSheetTrigger?.isConnected)lastSheetTrigger.focus({preventScroll:true});
    lastSheetTrigger=null;
  }
  function openSheet(id) {
    if(!isMobile())return;
    // Returning to search would reopen the phone keyboard after closing the card.
    const trigger=$('#'+(id==='details'?'detailBtn':'topReveal'));
    closeSheets(false);lastSheetTrigger=trigger;
    const sheet=$('#'+id);sheet.classList.add('open');sheet.scrollTop=0;$('#overlay').hidden=false;
    if(id==='details')$('#particleDetails').scrollTop=0;
    $('#overlay').classList.toggle('detail-overlay',id==='details');
    $('#'+(id==='mainMenu'?'topReveal':id==='filters'?'filtersBtn':'detailBtn')).setAttribute('aria-expanded','true');
    $('#'+(id==='mainMenu'?'closeMenu':id==='filters'?'closeFilters':'closeDetail')).focus({preventScroll:true});
  }
  // One gesture state handles mouse, pen and simultaneous touch pointers in CSS pixels.
  const pointers=new Map();let gesture=null,moved=false,suppressClick=false,pressedNode=null,pressedCluster=null,pressedRegion=null;
  const distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
  function rebaseGesture() {
    const points=[...pointers.values()];
    if(!points.length){gesture=null;return;}
    const center=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
    gesture={...center,tx,ty,scale,touch:points.some(p=>p.type==='touch'),distance:points.length>1?distance(points):0};
  }
  svg.addEventListener('pointerdown',event=>{
    if(event.button>0)return;
    document.getSelection()?.removeAllRanges();
    const rect=svg.getBoundingClientRect();
    pointers.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top,type:event.pointerType});
    svg.setPointerCapture(event.pointerId);
    if(pointers.size===1){moved=false;suppressClick=false;pressedNode=event.target.closest('.node')?.dataset.id||null;pressedCluster=event.target.closest('.cluster,.cluster-caption')?.dataset.cluster||null;pressedRegion=event.target.closest('.region')?.dataset.region||null;}
    if(pointers.size>1){moved=true;suppressClick=true;}
    rebaseGesture();
  });
  svg.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    const rect=svg.getBoundingClientRect();
    pointers.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top,type:event.pointerType});
    const points=[...pointers.values()];
    const center=points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
    if(Math.hypot(center.x-gesture.x,center.y-gesture.y)>(gesture.touch?10:4)||points.length>1)moved=true;
    if(!moved)return;
    suppressClick=true;autoFit=false;svg.classList.add('dragging');
    scale=points.length>1&&gesture.distance?Math.max(minZoom(),Math.min(maxZoom,gesture.scale*distance(points)/gesture.distance)):gesture.scale;
    tx=center.x-(gesture.x-gesture.tx)*scale/gesture.scale;ty=center.y-(gesture.y-gesture.ty)*scale/gesture.scale;
    applyTransform();
  });
  function endPointer(event) {
    const tap=event.type==='pointerup'&&pointers.size===1&&!moved;
    const tappedNode=pressedNode,tappedCluster=pressedCluster,tappedRegion=pressedRegion;
    pointers.delete(event.pointerId);if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    rebaseGesture();if(!pointers.size)svg.classList.remove('dragging');
    if(tap&&tappedNode){suppressClick=true;select(tappedNode,true);}
    else if(tap&&tappedCluster){suppressClick=true;focusCluster(tappedCluster);}
    else if(tap&&tappedRegion){suppressClick=true;focusRegion(tappedRegion);}
    if(!pointers.size){pressedNode=null;pressedCluster=null;pressedRegion=null;}
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,endPointer));
  svg.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const node=event.target.closest('.node');
    const cluster=event.target.closest('.cluster,.cluster-caption'),region=event.target.closest('.region');
    if(node)select(node.dataset.id,true);
    else if(cluster)focusCluster(cluster.dataset.cluster);
    else if(region)focusRegion(region.dataset.region);
    else {selected=null;applyState();}
  });
  svg.addEventListener('wheel',event=>{event.preventDefault();const rect=svg.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0015),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
  $('#minimap').addEventListener('pointerdown',event=>{
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform($('#minimap').getScreenCTM().inverse());
    tx=wrap.clientWidth/2-point.x*scale;ty=wrap.clientHeight/2-point.y*scale;autoFit=false;applyTransform();
  });
  const spins=[...new Set(D.particles.map(p=>p.spin))].sort((a,b)=>numeric({spin:a},'spin')-numeric({spin:b},'spin'));
  $('#spinFilter').innerHTML='<option value="all">Все</option>'+spins.map(value=>`<option value="${escape(value)}">${escape(value)}</option>`).join('');
  $('#groupFilters').innerHTML=D.groups.map(g=>`<button class="filter" data-group="${g.id}" aria-pressed="false"><i class="dot" style="--c:${colorFor(D.particles.find(p=>p.group===g.id))}"></i>${escape(labels[g.id])}<small>${D.particles.filter(p=>p.group===g.id).length}</small></button>`).join('');
  $$('.filter').forEach(button=>button.addEventListener('click',()=>{
    activeGroup=button.dataset.group;selected=null;focusedCluster=null;focusedRegion=null;updateFilterButtons();applyState();
    $('#mapPath').textContent=activeGroup==='all'?'Все семейства':labels[activeGroup];
    closeSheets();
  }));
  $$('[data-edge]').forEach(input=>input.addEventListener('change',()=>{input.checked?enabledEdges.add(input.dataset.edge):enabledEdges.delete(input.dataset.edge);applyState();}));
  $('#chargeFilter').addEventListener('change',event=>{charge=event.target.value;selected=null;applyState();});
  $('#spinFilter').addEventListener('change',event=>{spin=event.target.value;selected=null;applyState();});
  search.addEventListener('input',()=>{query=normalize(search.value.trim());chooseFromSearch();});
  search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();chooseFromSearch(true);search.blur();}if(event.key==='Escape'){query='';search.value='';chooseFromSearch();}});
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
  $('#related').addEventListener('click',event=>{const button=event.target.closest('[data-particle]');if(button){const p=byId.get(button.dataset.particle);if(!baseVisible(p)||!matches(p)){clearFilters();}select(p.id);}});
  $('#plus').onclick=()=>zoomAt(1.25,(wrap.clientWidth-cameraInsets().right)/2,wrap.clientHeight/2);$('#minus').onclick=()=>zoomAt(.8,(wrap.clientWidth-cameraInsets().right)/2,wrap.clientHeight/2);
  $('#reset').onclick=fit;$('#centerBtn').onclick=fit;$('#mapHome').onclick=()=>{selected=null;fit();applyState();};$('#showAll').onclick=()=>{selected=null;focusedRegion=null;focusedCluster=null;$('#mapPath').textContent='Все семейства';applyState();};
  $('#focusParticle').onclick=()=>{const id=current;clearFilters();setMode('graph');select(id);focusParticle(id);};
  $('#openComposition').onclick=()=>{selected=current;setMode('composition');};$('#openDecays').onclick=()=>{selected=current;setMode('decays');};
  $('#filtersBtn').onclick=()=>openSheet('filters');$('#detailBtn').onclick=()=>openSheet('details');
  $('#closeFilters').onclick=()=>closeSheets();$('#closeDetail').onclick=()=>{closeSheets();if(!isMobile()){selected=null;applyState();}};
  $('#closeMenu').onclick=()=>closeSheets();
  $('#overlay').onclick=()=>closeSheets();
  // Menus overlay the desktop edges; opening them never resizes the map or its camera.
  let keyboardNavigation=false;
  document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardNavigation=true;});
  document.addEventListener('pointerdown',()=>{keyboardNavigation=false;});
  const edgeMenus=[['#topReveal','#mainMenu'],['#leftReveal','#filters']].map(([handleSelector,panelSelector])=>{
    const handle=$(handleSelector),panel=$(panelSelector);let timer=null,pointerInside=false;
    const setOpen=open=>{panel.classList.toggle('peek-open',open);handle.setAttribute('aria-expanded',String(open));};
    const enter=()=>{if(isMobile())return;clearTimeout(timer);pointerInside=true;setOpen(true);};
    const leave=()=>{pointerInside=false;clearTimeout(timer);timer=setTimeout(()=>{
      const active=document.activeElement,editing=panel.contains(active)&&(keyboardNavigation||active.matches('input:not([type=checkbox]):not([type=radio]),textarea'));
      if(!editing&&!pointerInside)setOpen(false);
    },280);};
    [handle,panel].forEach(item=>{
      item.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')enter();});
      item.addEventListener('pointerleave',leave);
    });
    panel.addEventListener('focusin',()=>{if(!isMobile()){clearTimeout(timer);setOpen(true);}});
    panel.addEventListener('focusout',leave);
    handle.onclick=()=>{
      if(isMobile()){if(panel.id==='mainMenu')panel.classList.contains('open')?closeSheets():openSheet('mainMenu');}
      else{clearTimeout(timer);setOpen(!panel.classList.contains('peek-open'));}
    };
    return {handle,panel,enter,outside:()=>{if(pointerInside)leave();},close:()=>{clearTimeout(timer);pointerInside=false;setOpen(false);}};
  });
  document.addEventListener('pointermove',event=>{
    if(isMobile()||event.pointerType==='touch')return;
    if(event.clientY<=6)edgeMenus[0].enter();
    if(event.clientX<=6&&event.clientY>=78)edgeMenus[1].enter();
    edgeMenus.forEach((menu,i)=>{
      const atEdge=i===0?event.clientY<=6:event.clientX<=6&&event.clientY>=78;
      if(!atEdge&&!menu.panel.contains(event.target)&&!menu.handle.contains(event.target))menu.outside();
    });
  });
  matchMedia('(max-width:900px), (hover:none) and (pointer:coarse)').addEventListener('change',()=>edgeMenus.forEach(menu=>menu.close()));
  // Keep the minimap with the filters instead of floating over the expanded map.
  $('#filters').append($('#minimapWrap'));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      closeSheets();
      if(!isMobile())edgeMenus.forEach(menu=>{
        if(menu.panel.contains(document.activeElement))menu.handle.focus({preventScroll:true});
        menu.close();
      });
    }
    if(event.key==='Tab'&&isMobile()&&!$('#overlay').hidden){
      const sheet=$('#filters.open')||$('#details.open')||$('#mainMenu.open');const controls=[...sheet.querySelectorAll('button,input,select,a')].filter(item=>!item.disabled&&item.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  let previousSize={width:wrap.clientWidth,height:wrap.clientHeight};
  new ResizeObserver(()=>{
    const next={width:wrap.clientWidth,height:wrap.clientHeight};
    // Keyboard and browser bars change phone height. Keep the map and selection exactly where they were.
    if(next.width===previousSize.width)applyTransform(true);
    else{
      cameraViewportHeight=next.height;
      if(autoFit)centerOverview();else{tx+=(next.width-previousSize.width)/2;ty+=(next.height-previousSize.height)/2;applyTransform();}
    }
    previousSize=next;if(!isMobile())closeSheets(false);
  }).observe(wrap);
  $('#datasetVersion').textContent='PDG 2024 · '+D.particles.length+' состояний';$('#totalCount').textContent=D.particles.length;
  $('#hierarchyBand').addEventListener('pointerenter',()=>clearTimeout(previewTimer));
  $('#hierarchyBand').addEventListener('pointerleave',()=>{if(previewRegion)schedulePreviewClear();else {showClusterPreview(null);updateHierarchy();}});
  wrap.addEventListener('selectstart',event=>event.preventDefault());
  $('#subgroupIndex').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.cluster)focusCluster(button.dataset.cluster);else if(button.dataset.region)focusRegion(button.dataset.region);
  });
  $('#subgroupIndex').addEventListener('pointerover',event=>{if(isMobile()||event.pointerType==='touch')return;const c=event.target.closest('[data-cluster]');if(c)showClusterPreview(c.dataset.cluster);});
  $('#subgroupIndex').addEventListener('pointerout',event=>{const c=event.target.closest('[data-cluster]');if(c&&!c.contains(event.relatedTarget))showClusterPreview(null);});
  $('#connectionTypes').addEventListener('click',event=>{const b=event.target.closest('[data-kind]');if(b){routeKind=b.dataset.kind;highlightRoutes(null);}});
  $('#connectionPrev').onclick=()=>stepConnection(-1);
  $('#connectionNext').onclick=()=>stepConnection(1);
  $('#mobileConnectionPrev').onclick=()=>stepConnection(-1);
  $('#mobileConnectionNext').onclick=()=>stepConnection(1);
  $('#mobileRelationDetails').onclick=()=>{
    setDetailTab('links');openSheet('details');
    const body=$('#particleDetails'),panel=$('#connectionReadout');
    body.scrollTop=Math.max(0,panel.getBoundingClientRect().top-body.getBoundingClientRect().top-8);
  };
  $('#connectionAll').onclick=()=>{routeTarget=routeTarget?null:connectionTargets()[0]||null;highlightRoutes(null);};
  buildGraph();updateDetails();applyState();fit();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js').catch(()=>{});
})();

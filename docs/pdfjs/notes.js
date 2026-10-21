import '../annotations-store.js?v=1';

const svgNS='http://www.w3.org/2000/svg';
const clone=value=>structuredClone(value);
const uid=()=>crypto.randomUUID();
function svg(tag,attrs={}){const el=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;}
const icons={
  select:'M8 13V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 4-2 6-6 6h-1c-2 0-3-1-4-2l-5-5a2 2 0 0 1 3-3l1 1',
  pen:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5M4 15l5 5',
  marker:'m14 3 7 7-9 9-7-7 9-9ZM5 12l-2 6 3 3 6-2M3 21h8',
  eraser:'m15 3 6 6-11 12H6l-5-5L15 3ZM7 10l7 7M10 21h12',
  note:'M21 11v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3l4 3v-3h7a2 2 0 0 0 2-2v-6M7 8h10M7 12h7',
  undo:'M9 5 3 11l6 6M3 11h11a6 6 0 0 1 6 6',redo:'m15 5 6 6-6 6M21 11H10a6 6 0 0 0-6 6',
  settings:'M4 7h16M4 17h16M8 4v6M16 14v6',close:'m6 6 12 12M6 18 18 6'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"/></svg>`;
function centerPath(points){
  let d=`M${points[0][0]} ${points[0][1]}`;
  for(let i=1;i<points.length-1;i++)d+=` Q${points[i][0]} ${points[i][1]} ${(points[i][0]+points[i+1][0])/2} ${(points[i][1]+points[i+1][1])/2}`;
  const last=points.at(-1);return d+` L${last[0]+.01} ${last[1]+.01}`;
}
function brushPath(points,width){
  if(points.length===1){const [x,y]=points[0],r=width/2;return `M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`;}
  const left=[],right=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
    const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
    const radius=width/2*(.4+Math.max(.05,Math.min(1,p[2]??.5))*1.2);
    left.push([p[0]-dy/length*radius,p[1]+dx/length*radius]);right.push([p[0]+dy/length*radius,p[1]-dx/length*radius]);
  }
  return centerPath(left)+' L'+right.at(-1).join(' ')+centerPath(right.reverse()).replace(/^M/,' L')+' Z';
}
function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}

export class ReaderNotes {
  constructor(viewer,button){
    this.viewer=viewer;this.button=button;this.items=new Map();this.layers=new Set();this.history=[];this.future=[];this.pending=[];this.pointers=new Set();
    this.tool='pen';this.color='#3879ef';this.width=2;this.enabled=false;this.fingerDrawing=true;this.colors={pen:'#3879ef',marker:'#ffcc00',note:'#3879ef'};
    this.panel=document.createElement('div');this.panel.className='notes-tools';this.panel.hidden=true;
    this.panel.setAttribute('role','region');this.panel.setAttribute('aria-label','Инструменты заметок');
    const labels={select:'Прокрутка и выделение текста',pen:'Ручка',marker:'Маркер',eraser:'Ластик',note:'Комментарий'};
    this.panel.innerHTML=`<div class="notes-tool-group" role="group" aria-label="Инструмент">${['select','pen','marker','eraser','note'].map(tool=>`<button type="button" class="note-tool" data-note-tool="${tool}" title="${labels[tool]}" aria-label="${labels[tool]}" aria-pressed="false">${icon(tool)}</button>`).join('')}</div>
      <div class="notes-actions"><button type="button" id="noteUndo" title="Отменить (Ctrl+Z)" aria-label="Отменить аннотацию">${icon('undo')}</button><button type="button" id="noteRedo" title="Повторить (Ctrl+Shift+Z)" aria-label="Повторить аннотацию">${icon('redo')}</button>
      <details class="notes-options"><summary title="Цвет и толщина" aria-label="Цвет, толщина и управление касаниями">${icon('settings')}<span class="notes-color-preview"></span></summary><div class="notes-options-body">
      <label>Цвет <input id="noteColor" type="color" value="${this.color}" aria-label="Цвет заметок"></label>
      <div class="notes-swatches">${['#3879ef','#202a35','#e94d61','#18a37a','#ffcc00'].map(color=>`<button type="button" data-note-color="${color}" style="--swatch:${color}" aria-label="Цвет ${color}"></button>`).join('')}</div>
      <label>Толщина <input id="noteWidth" type="range" min="1" max="20" value="2" aria-label="Толщина линии"><output id="noteWidthValue">2</output></label>
      <label class="notes-finger"><input id="noteFinger" type="checkbox" checked> Рисовать пальцем</label><p>Двумя пальцами — перемещение и масштаб. Со стилусом палец прокручивает страницу.</p>
      <button type="button" id="noteHighlight">Выделить выбранный текст</button></div></details>
      <button type="button" id="noteDone" title="Закончить рисование" aria-label="Закончить рисование">${icon('close')}</button></div>`;
    document.body.append(this.panel);
    this.status=document.createElement('div');this.status.className='notes-status';this.status.setAttribute('role','status');this.status.hidden=true;document.body.append(this.status);
    this.selectionMenu=document.createElement('div');this.selectionMenu.className='notes-selection';this.selectionMenu.hidden=true;
    this.selectionMenu.innerHTML='<button type="button">Копировать</button><button type="button">Выделить маркером</button>';
    document.body.append(this.selectionMenu);
    this.selectionMenu.addEventListener('pointerdown',e=>e.preventDefault());
    this.selectionMenu.children[0].onclick=()=>void this.copy();this.selectionMenu.children[1].onclick=()=>this.highlightSelection();
    this.panel.querySelectorAll('[data-note-tool]').forEach(button=>button.onclick=()=>{this.cancelGesture();this.colors[this.tool]=this.color;this.tool=button.dataset.noteTool;this.color=this.colors[this.tool]||this.color;this.panel.querySelector('details').open=false;this.syncMode();});
    this.panel.querySelector('#noteColor').oninput=e=>{this.color=e.target.value;this.syncMode();};
    this.panel.querySelectorAll('[data-note-color]').forEach(button=>button.onclick=()=>{this.color=button.dataset.noteColor;this.syncMode();});
    this.panel.querySelector('#noteWidth').oninput=e=>{this.width=Number(e.target.value);this.panel.querySelector('#noteWidthValue').value=this.width;};
    this.panel.querySelector('#noteFinger').onchange=e=>{this.fingerDrawing=e.target.checked;this.syncMode();};
    this.panel.querySelector('#noteDone').onclick=()=>button.click();
    this.panel.querySelector('#noteUndo').onclick=()=>this.undo();this.panel.querySelector('#noteRedo').onclick=()=>this.redo();
    this.panel.querySelector('#noteHighlight').onclick=()=>this.highlightSelection();
    button.onclick=()=>{this.cancelGesture();this.enabled=!this.enabled;this.syncMode();void this.flush();};
    viewer.addEventListener('pointerdown',e=>{if(this.penActive&&e.pointerType==='touch')return;if(e.pointerType==='pen'){this.pointers.clear();this.penActive=e.pointerId;this.multi=false;}this.pointers.add(e.pointerId);if(this.pointers.size>1){this.multi=true;this.cancelGesture();}},{capture:true});
    const release=e=>{this.up(e);this.pointers.delete(e.pointerId);if(this.penActive===e.pointerId)this.penActive=null;if(!this.pointers.size)this.multi=false;};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',e=>{if(!(this.penActive&&e.pointerType==='touch'))this.cancelGesture();this.pointers.delete(e.pointerId);if(this.penActive===e.pointerId)this.penActive=null;if(!this.pointers.size)this.multi=false;});
    window.addEventListener('blur',()=>{this.cancelGesture();this.pointers.clear();this.penActive=null;this.multi=false;});
    viewer.addEventListener('touchstart',e=>{if(!this.penActive&&e.touches.length>1)this.cancelGesture();},{capture:true,passive:true});
    viewer.addEventListener('pointermove',e=>{if(this.pan?.id!==e.pointerId)return;e.preventDefault();viewer.scrollBy(this.pan.x-e.clientX,this.pan.y-e.clientY);this.pan={id:e.pointerId,x:e.clientX,y:e.clientY};},{passive:false});
    viewer.addEventListener('contextmenu',e=>{if(this.enabled&&this.tool!=='select')e.preventDefault();});
    document.addEventListener('pointerdown',e=>{if(!this.panel.contains(e.target))this.panel.querySelector('details').open=false;});
    document.addEventListener('selectionchange',()=>{clearTimeout(this.selectionTimer);this.selectionTimer=setTimeout(()=>this.showSelection(),180);});
    viewer.addEventListener('scroll',()=>{this.selectionMenu.hidden=true;},{passive:true});
    document.addEventListener('keydown',e=>{
      if(!this.enabled||e.target.closest('input,textarea,select,dialog')||!(e.ctrlKey||e.metaKey))return;
      if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();}
      if(e.key.toLowerCase()==='y'){e.preventDefault();this.redo();}
    });
    window.addEventListener('pagehide',()=>{this.cancelGesture();void this.flush();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancelGesture();void this.flush();}});
    window.addEventListener('beforeunload',e=>{if(this.pending.length){e.preventDefault();e.returnValue='';}});
    window.NSUAnnotations.changes.addEventListener('change',event=>{
      if(event.detail.deleted){this.cancelGesture();this.pending=[];this.history=[];this.future=[];this.syncMode();}
      if(this.doc&&!this.pending.length&&(event.detail.all||event.detail.docId===this.doc.docId))void this.reload();
    });
    this.syncMode();
  }
  message(text,error=false){
    this.status.hidden=!text;this.status.replaceChildren(document.createTextNode(text));
    if(error){const retry=document.createElement('button');retry.textContent='Повторить сохранение';retry.onclick=()=>void this.flush();this.status.append(retry);}
  }
  async open(pdf,path,title,version){
    this.button.disabled=true;
    try{
      const docId=new URL('../',location.href).pathname+'|'+path;
      const revision=String(pdf.fingerprints?.filter(Boolean).join(':')||version||'unversioned');
      const docs=(await window.NSUAnnotations.documents()).filter(d=>d.docId===docId);
      const existing=docs.find(d=>d.revision===revision);
      this.doc=existing||{docId,revision,path,title,pageCount:pdf.numPages,formatVersion:1,createdAt:Date.now(),updatedAt:Date.now()};
      this.doc.pageCount=pdf.numPages;
      await this.reload();this.button.disabled=false;
      const older=docs.filter(d=>d.revision!==revision).sort((a,b)=>b.updatedAt-a.updatedAt);
      if(older.length){
        this.recovery=document.createElement('details');this.recovery.className='notes-recovery';
        const summary=document.createElement('summary');summary.textContent='PDF изменился: доступны прежние заметки';this.recovery.append(summary);
        const note=document.createElement('p');note.textContent='Старая копия сохранена отдельно. При изменении страниц положение пометок может не совпасть. Экспортируйте резервную копию в настройках.';this.recovery.append(note);
        const select=document.createElement('select');select.setAttribute('aria-label','Версия прежних заметок');
        for(const d of older){const option=document.createElement('option');option.value=d.revision;option.textContent=new Date(d.updatedAt).toLocaleString('ru-RU')+' · '+d.pageCount+' стр.';select.append(option);}
        const restore=document.createElement('button');restore.textContent='Восстановить в текущем PDF';
        restore.onclick=async()=>{try{
          if(!confirm('Скопировать прежние пометки в этот PDF? Проверьте совпадение страниц. Исходная копия останется в резервном хранилище.'))return;
          const objects=await window.NSUAnnotations.objects(docId,select.value);
          this.change(objects.filter(a=>a.page<=pdf.numPages).map(a=>({...a,id:uid(),revision,updatedAt:Date.now()})));
        }catch(error){this.message('Не удалось восстановить заметки: '+error.message);}};
        this.recovery.append(select,restore);document.body.append(this.recovery);
      }
    }catch(error){this.doc=null;this.message('Заметки недоступны: '+error.message);}
  }
  async reload(){
    if(!this.doc)return;
    const objects=await window.NSUAnnotations.objects(this.doc.docId,this.doc.revision);
    if(this.pending.length)return;
    this.items=new Map(objects.map(a=>[a.id,a]));this.paintAll();
  }
  syncMode(){
    this.button.setAttribute('aria-pressed',String(this.enabled));this.button.classList.toggle('active',this.enabled);
    this.panel.hidden=!this.enabled;document.body.classList.toggle('notes-mode',this.enabled);
    if(!this.enabled)this.panel.querySelector('details').open=false;
    document.body.classList.toggle('notes-drawing',this.enabled&&this.tool!=='select');
    document.body.dataset.noteTool=this.tool;
    this.panel.querySelectorAll('[data-note-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.noteTool===this.tool)));
    this.panel.querySelector('#noteColor').value=this.color;this.panel.style.setProperty('--note-color',this.color);
    this.panel.querySelector('#noteFinger').checked=this.fingerDrawing;
    this.panel.querySelector('#noteUndo').disabled=!this.history.length;
    this.panel.querySelector('#noteRedo').disabled=!this.future.length;
  }
  mount(container,viewport,page){
    for(const layer of this.layers)if(!layer.root.isConnected)this.layers.delete(layer);
    container.querySelector('.user-notes')?.remove();
    const root=document.createElement('div');root.className='user-notes';
    const drawing=svg('svg',{viewBox:`0 0 ${viewport.width} ${viewport.height}`,preserveAspectRatio:'none','aria-label':'Аннотации страницы '+page});
    const group=svg('g',{transform:`matrix(${viewport.transform.join(' ')})`}),draftGroup=svg('g',{transform:`matrix(${viewport.transform.join(' ')})`,'class':'notes-draft'});drawing.append(group,draftGroup);root.append(drawing);container.append(root);
    const layer={root,drawing,group,draftGroup,viewport,page};this.layers.add(layer);this.paint(layer);
    drawing.addEventListener('pointerdown',e=>this.down(e,layer));
    drawing.addEventListener('pointermove',e=>this.move(e,layer));
    drawing.addEventListener('pointerup',e=>this.up(e));
    drawing.addEventListener('pointercancel',e=>{if(!(this.penActive&&e.pointerType==='touch'))this.cancelGesture();});
    drawing.addEventListener('lostpointercapture',e=>{if(this.draft?.pointerId===e.pointerId||this.eraser?.id===e.pointerId)this.up(e);});
  }
  toPdf(e,layer){
    const rect=layer.drawing.getBoundingClientRect();
    return layer.viewport.convertToPdfPoint((e.clientX-rect.left)*layer.viewport.width/rect.width,(e.clientY-rect.top)*layer.viewport.height/rect.height);
  }
  base(type,page){const now=Date.now();return{docId:this.doc.docId,revision:this.doc.revision,id:uid(),page,type,color:this.color,width:this.width,opacity:type==='pen'?1:.32,formatVersion:1,createdAt:now,updatedAt:now};}
  down(e,layer){
    if(!this.doc||!this.enabled||this.tool==='select'||this.multi||this.pointers.size>1||e.button!==0||this.penActive&&e.pointerType==='touch')return;
    e.preventDefault();
    if(e.pointerType==='pen'&&this.fingerDrawing){this.fingerDrawing=false;this.syncMode();}
    try{layer.drawing.setPointerCapture(e.pointerId);}catch{}
    if(e.pointerType==='touch'&&!this.fingerDrawing){this.pan={id:e.pointerId,x:e.clientX,y:e.clientY};return;}
    if(this.tool==='eraser'){
      this.eraser={id:e.pointerId,removed:new Set()};this.eraseAt(e,layer);return;
    }
    const point=this.toPdf(e,layer);
    if(this.tool==='note'){this.editNote({...this.base('note',layer.page),opacity:1,point,text:''},true);return;}
    const a={...this.base(this.tool,layer.page),brushVersion:2,points:[[...point,e.pointerType==='pen'?e.pressure||.2:.5]]};
    if(this.tool==='marker')a.width*=5;
    this.draft={a,layer,pointerId:e.pointerId,strokes:[{a,layer}]};this.paintDraft();
  }
  layerAt(e,fallback){
    if(fallback?.root.isConnected){const r=fallback.drawing.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return fallback;}
    for(const layer of this.layers){if(!layer.root.isConnected)continue;const r=layer.drawing.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return layer;}
    return null;
  }
  move(e,layer){
    if(this.eraser?.id===e.pointerId){const current=this.layerAt(e,layer);if(current)this.eraseAt(e,current);return;}
    if(!this.draft||this.draft.pointerId!==e.pointerId||this.multi)return;
    const samples=e.getCoalescedEvents?.()||[];
    for(const sample of samples.length?samples:[e]){
      const current=this.layerAt(sample,this.draft.layer);
      if(!current){this.draft.penUp=true;continue;}
      const point=this.toPdf(sample,current),pressure=e.pointerType==='pen'?sample.pressure||.2:.5;
      if(current!==this.draft.layer||this.draft.penUp){
        const a={...this.draft.a,id:uid(),page:current.page,points:[[...point,pressure]]};
        this.draft.a=a;this.draft.layer=current;this.draft.strokes.push({a,layer:current});this.draft.penUp=false;
      }else{
        const last=this.draft.a.points.at(-1);
        if(Math.hypot(point[0]-last[0],point[1]-last[1])>.2)this.draft.a.points.push([last[0]+(point[0]-last[0])*.72,last[1]+(point[1]-last[1])*.72,pressure]);
      }
    }
    if(!this.paintFrame)this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0;this.paintDraft();});
  }
  up(e){
    if(this.pan?.id===e.pointerId)this.pan=null;
    if(this.eraser?.id===e.pointerId){const removed=[...this.eraser.removed];this.eraser=null;if(removed.length)this.change([],removed);this.gestureEnded();return;}
    if(!this.draft||this.draft.pointerId!==e.pointerId)return;
    if(e.type==='pointerup'&&this.layerAt(e,this.draft.layer))this.move(e,this.draft.layer);
    const strokes=this.draft.strokes;this.draft=null;this.clearDraft();this.change(strokes.map(stroke=>stroke.a));this.gestureEnded();
  }
  isInteracting(page){return this.draft?.strokes.some(stroke=>stroke.layer.page===page)||!!this.eraser;}
  gestureEnded(){this.viewer.dispatchEvent(new CustomEvent('notesgestureend'));}
  clearDraft(){for(const layer of this.layers)layer.draftGroup.replaceChildren();}
  paintDraft(){
    if(!this.draft)return;
    for(const {a,layer} of this.draft.strokes){let path=layer.draftGroup.querySelector(`[data-draft-id="${a.id}"]`);if(!path){path=this.strokeElement(a);path.dataset.draftId=a.id;layer.draftGroup.append(path);}this.updateStroke(path,a);}
  }
  eraseAt(e,layer){
    const point=this.toPdf(e,layer),radius=10*layer.viewport.width/layer.drawing.getBoundingClientRect().width/layer.viewport.scale;
    for(const a of [...this.items.values()].reverse()){
      if(a.page!==layer.page||this.eraser.removed.has(a.id)||a.type==='note')continue;
      let hit=false;
      if(a.points)hit=a.points.some((p,i)=>distanceToSegment(point,a.points[Math.max(0,i-1)],p)<=radius+a.width/2);
      else if(a.quads)hit=a.quads.some(q=>point[0]>=Math.min(...q.map(p=>p[0]))-radius&&point[0]<=Math.max(...q.map(p=>p[0]))+radius&&point[1]>=Math.min(...q.map(p=>p[1]))-radius&&point[1]<=Math.max(...q.map(p=>p[1]))+radius);
      if(hit){this.eraser.removed.add(a.id);this.paint(layer);break;}
    }
  }
  cancelGesture(){const changed=this.draft||this.eraser;this.draft=null;this.eraser=null;this.pan=null;this.clearDraft();if(changed){this.paintAll();this.gestureEnded();}}
  paintAll(){for(const layer of this.layers){if(layer.root.isConnected)this.paint(layer);else this.layers.delete(layer);}}
  paint(layer){
    layer.group.replaceChildren();layer.root.querySelectorAll('.note-pin').forEach(n=>n.remove());
    const objects=[...this.items.values()].filter(a=>a.page===layer.page&&!this.eraser?.removed.has(a.id));
    for(const a of objects){
      let element;
      if(a.type==='note'){
        const pin=document.createElement('button');pin.className='note-pin';pin.textContent='✎';pin.type='button';pin.dataset.noteId=a.id;
        pin.setAttribute('aria-label','Заметка: '+a.text.slice(0,80));pin.title=a.text;
        const [x,y]=layer.viewport.convertToViewportPoint(...a.point);pin.style.left=x/layer.viewport.width*100+'%';pin.style.top=y/layer.viewport.height*100+'%';
        pin.onclick=()=>this.editNote(a);layer.root.append(pin);continue;
      }
      if(a.type==='highlight'){
        element=svg('g');for(const quad of a.quads)element.append(svg('polygon',{points:quad.map(p=>p.join(',')).join(' '),fill:a.color}));
      }else{
        element=this.strokeElement(a);
      }
      element.setAttribute('opacity',a.opacity);element.dataset.noteId=a.id;layer.group.append(element);
    }
  }
  strokeElement(a){const element=svg('path',{'stroke-linecap':'round','stroke-linejoin':'round'});this.updateStroke(element,a);return element;}
  updateStroke(element,a){
    const brush=a.type==='pen'&&a.brushVersion===2;
    element.setAttribute('d',brush?brushPath(a.points,a.width):centerPath(a.points));
    element.setAttribute('fill',brush?a.color:'none');element.setAttribute('stroke',brush?'none':a.color);element.setAttribute('stroke-width',a.width);element.setAttribute('opacity',a.opacity);
  }
  change(put,remove=[],record=true){
    if(!this.doc)return;
    const ids=[...new Set([...put.map(a=>a.id),...remove])];
    const before=ids.map(id=>this.items.get(id)).filter(Boolean).map(clone);
    for(const id of remove)this.items.delete(id);for(const a of put)this.items.set(a.id,clone(a));
    if(record){this.history.push({before,after:put.map(clone),ids});if(this.history.length>100)this.history.shift();this.future=[];}
    this.pending.push({put:put.map(clone),remove:[...remove]});this.paintAll();this.syncMode();void this.flush();
  }
  undo(){const action=this.history.pop();if(!action)return;this.future.push(action);this.change(action.before.map(a=>({...a,updatedAt:Date.now()})),action.ids.filter(id=>!action.before.some(a=>a.id===id)),false);}
  redo(){const action=this.future.pop();if(!action)return;this.history.push(action);this.change(action.after.map(a=>({...a,updatedAt:Date.now()})),action.ids.filter(id=>!action.after.some(a=>a.id===id)),false);}
  flush(){
    if(this.saving)return this.saving;
    if(!this.doc||!this.pending.length)return Promise.resolve();
    this.saving=this.writePending().finally(()=>{this.saving=null;});return this.saving;
  }
  async writePending(){
    this.message('Сохраняю заметки…');
    try{
      while(this.pending.length){
        const action=this.pending[0];this.doc.updatedAt=Date.now();
        await window.NSUAnnotations.save(this.doc,action.put,action.remove);this.pending.shift();
      }
      await this.reload();
      this.message('Заметки сохранены на устройстве');
      clearTimeout(this.statusTimer);this.statusTimer=setTimeout(()=>{if(!this.pending.length)this.message('');},2500);
    }catch(error){this.message('Не сохранено: '+(error.name==='QuotaExceededError'?'недостаточно места':error.message)+'. Не закрывайте документ.',true);}
  }
  selected(){
    const selection=getSelection();if(!selection?.rangeCount||selection.isCollapsed)return null;
    const range=selection.getRangeAt(0);
    const parent=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
    return this.viewer.contains(parent)?{selection,range}:null;
  }
  showSelection(){
    const selected=this.selected();this.selectionMenu.hidden=!selected;if(!selected)return;
    const rect=selected.range.getBoundingClientRect(),width=Math.min(300,innerWidth-16);
    this.selectionMenu.style.maxWidth=width+'px';this.selectionMenu.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left))+'px';
    this.selectionMenu.style.top=Math.max(4,Math.min(innerHeight-52,rect.bottom+8))+'px';
  }
  async copy(){
    const selected=this.selected();if(!selected)return;
    try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(selected.selection.toString());else if(!document.execCommand('copy'))throw new Error();}
    catch{this.message('Используйте системную команду «Копировать» или Ctrl+C.');}
  }
  highlightSelection(){
    const selected=this.selected();if(!selected||!this.doc)return;
    const put=[];
    // Inspect text nodes separately: a multi-page range must never paint the page margins.
    for(const layer of this.layers){
      if(!layer.root.isConnected)continue;
      const text=layer.root.parentElement.querySelector('.text-layer');if(!text)continue;
      const bounds=layer.drawing.getBoundingClientRect(),quads=[];
      for(const span of text.querySelectorAll('span:not(.markedContent)')){
        if(!selected.range.intersectsNode(span)||!span.firstChild)continue;
        const range=document.createRange();range.selectNodeContents(span);
        if(span.contains(selected.range.startContainer))range.setStart(selected.range.startContainer,selected.range.startOffset);
        if(span.contains(selected.range.endContainer))range.setEnd(selected.range.endContainer,selected.range.endOffset);
        for(const rect of range.getClientRects()){
          if(rect.width<.5||rect.height<.5)continue;
          const convert=(x,y)=>layer.viewport.convertToPdfPoint((x-bounds.left)*layer.viewport.width/bounds.width,(y-bounds.top)*layer.viewport.height/bounds.height);
          quads.push([convert(rect.left,rect.top),convert(rect.right,rect.top),convert(rect.right,rect.bottom),convert(rect.left,rect.bottom)]);
        }
      }
      if(quads.length)put.push({...this.base('highlight',layer.page),quads});
    }
    if(put.length){this.change(put);selected.selection.removeAllRanges();this.selectionMenu.hidden=true;}
  }
  editNote(a,isNew=false){
    if(document.querySelector('.note-editor'))return;
    const dialog=document.createElement('dialog');dialog.className='note-editor';dialog.setAttribute('aria-label','Текстовая заметка');
    const text=document.createElement('textarea');text.maxLength=10000;text.value=a.text;text.setAttribute('aria-label','Текст заметки');
    const save=document.createElement('button');save.textContent='Сохранить';
    const remove=document.createElement('button');remove.textContent='Удалить';remove.hidden=isNew;
    const close=document.createElement('button');close.textContent='Отмена';
    save.onclick=()=>{if(!text.value.trim())return;this.change([{...a,text:text.value,updatedAt:Date.now()}]);dialog.close();};
    remove.onclick=()=>{if(confirm('Удалить эту заметку?')){this.change([],[a.id]);dialog.close();}};
    close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
    dialog.append(text,save,remove,close);document.body.append(dialog);dialog.showModal();text.focus();
  }
}

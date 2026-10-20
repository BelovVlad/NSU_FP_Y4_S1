import '../annotations-store.js?v=1';

const svgNS='http://www.w3.org/2000/svg';
const clone=value=>structuredClone(value);
const uid=()=>crypto.randomUUID();
function svg(tag,attrs={}){const el=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;}

export class ReaderNotes {
  constructor(viewer,button){
    this.viewer=viewer;this.button=button;this.items=new Map();this.layers=new Set();this.history=[];this.future=[];this.pending=[];this.pointers=new Set();
    this.tool='pen';this.color='#ffcc00';this.width=2;this.enabled=false;
    this.panel=document.createElement('div');this.panel.className='notes-tools';this.panel.hidden=true;
    this.panel.setAttribute('role','region');this.panel.setAttribute('aria-label','Инструменты заметок');
    this.panel.innerHTML=`<label>Инструмент <select id="noteTool" aria-label="Инструмент заметок"><option value="pen">Ручка</option><option value="marker">Маркер</option><option value="select">Выделить текст / прокрутка</option><option value="eraser">Ластик</option><option value="note">Комментарий</option></select></label>
      <label>Цвет <input id="noteColor" type="color" value="#ffcc00" aria-label="Цвет заметок"></label>
      <label>Толщина <input id="noteWidth" type="range" min="1" max="20" value="2" aria-label="Толщина линии"></label>
      <button type="button" id="noteUndo" title="Отменить (Ctrl+Z)" aria-label="Отменить аннотацию">↶</button><button type="button" id="noteRedo" title="Повторить (Ctrl+Shift+Z)" aria-label="Повторить аннотацию">↷</button>
      <button type="button" id="noteHighlight">Выделить маркером</button>`;
    document.body.append(this.panel);
    this.status=document.createElement('div');this.status.className='notes-status';this.status.setAttribute('role','status');this.status.hidden=true;document.body.append(this.status);
    this.selectionMenu=document.createElement('div');this.selectionMenu.className='notes-selection';this.selectionMenu.hidden=true;
    this.selectionMenu.innerHTML='<button type="button">Копировать</button><button type="button">Выделить маркером</button>';
    document.body.append(this.selectionMenu);
    this.selectionMenu.addEventListener('pointerdown',e=>e.preventDefault());
    this.selectionMenu.children[0].onclick=()=>void this.copy();this.selectionMenu.children[1].onclick=()=>this.highlightSelection();
    this.panel.querySelector('#noteTool').onchange=e=>{this.cancelGesture();this.tool=e.target.value;this.syncMode();};
    this.panel.querySelector('#noteColor').oninput=e=>this.color=e.target.value;
    this.panel.querySelector('#noteWidth').oninput=e=>this.width=Number(e.target.value);
    this.panel.querySelector('#noteUndo').onclick=()=>this.undo();this.panel.querySelector('#noteRedo').onclick=()=>this.redo();
    this.panel.querySelector('#noteHighlight').onclick=()=>this.highlightSelection();
    button.onclick=()=>{this.cancelGesture();this.enabled=!this.enabled;this.syncMode();void this.flush();};
    viewer.addEventListener('pointerdown',e=>{this.pointers.add(e.pointerId);if(this.pointers.size>1){this.multi=true;this.cancelGesture();}},{capture:true});
    const release=e=>{this.pointers.delete(e.pointerId);if(!this.pointers.size)this.multi=false;};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    viewer.addEventListener('touchstart',e=>{if(e.touches.length>1)this.cancelGesture();},{capture:true,passive:true});
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
    document.body.classList.toggle('notes-drawing',this.enabled&&this.tool!=='select');
    this.panel.querySelector('#noteUndo').disabled=!this.history.length;
    this.panel.querySelector('#noteRedo').disabled=!this.future.length;
  }
  mount(container,viewport,page){
    for(const layer of this.layers)if(!layer.root.isConnected)this.layers.delete(layer);
    container.querySelector('.user-notes')?.remove();
    const root=document.createElement('div');root.className='user-notes';
    const drawing=svg('svg',{viewBox:`0 0 ${viewport.width} ${viewport.height}`,preserveAspectRatio:'none','aria-label':'Аннотации страницы '+page});
    const group=svg('g',{transform:`matrix(${viewport.transform.join(' ')})`});drawing.append(group);root.append(drawing);container.append(root);
    const layer={root,drawing,group,viewport,page};this.layers.add(layer);this.paint(layer);
    drawing.addEventListener('pointerdown',e=>this.down(e,layer));
    drawing.addEventListener('pointermove',e=>this.move(e,layer));
    drawing.addEventListener('pointerup',e=>this.up(e));
    drawing.addEventListener('pointercancel',()=>this.cancelGesture());
  }
  toPdf(e,layer){
    const rect=layer.drawing.getBoundingClientRect();
    return layer.viewport.convertToPdfPoint((e.clientX-rect.left)*layer.viewport.width/rect.width,(e.clientY-rect.top)*layer.viewport.height/rect.height);
  }
  base(type,page){const now=Date.now();return{docId:this.doc.docId,revision:this.doc.revision,id:uid(),page,type,color:this.color,width:this.width,opacity:type==='pen'?1:.32,formatVersion:1,createdAt:now,updatedAt:now};}
  down(e,layer){
    if(!this.doc||!this.enabled||this.tool==='select'||this.multi||this.pointers.size>1||e.button!==0)return;
    e.preventDefault();
    if(this.tool==='eraser'){
      const target=e.target.closest('[data-note-id]'),object=this.items.get(target?.getAttribute('data-note-id'));
      if(object)this.change([], [object.id]);return;
    }
    const point=this.toPdf(e,layer);
    if(this.tool==='note'){this.editNote({...this.base('note',layer.page),opacity:1,point,text:''},true);return;}
    const a={...this.base(this.tool,layer.page),points:[[...point,e.pressure||.5]]};
    if(this.tool==='marker')a.width*=5;
    this.draft={a,layer,pointerId:e.pointerId};try{layer.drawing.setPointerCapture(e.pointerId);}catch{}this.paint(layer);
  }
  move(e,layer){
    if(!this.draft||this.draft.pointerId!==e.pointerId||this.draft.layer!==layer||this.multi)return;
    for(const sample of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e]){
      const point=this.toPdf(sample,layer),last=this.draft.a.points.at(-1);
      if(Math.hypot(point[0]-last[0],point[1]-last[1])>.15)this.draft.a.points.push([...point,sample.pressure||.5]);
    }
    if(!this.paintFrame)this.paintFrame=requestAnimationFrame(()=>{this.paintFrame=0;if(this.draft)this.paint(this.draft.layer);});
  }
  up(e){
    if(!this.draft||this.draft.pointerId!==e.pointerId)return;
    const {a,layer}=this.draft;this.draft=null;this.change([a]);this.paint(layer);
  }
  cancelGesture(){if(this.draft){const layer=this.draft.layer;this.draft=null;this.paint(layer);}}
  paintAll(){for(const layer of this.layers){if(layer.root.isConnected)this.paint(layer);else this.layers.delete(layer);}}
  paint(layer){
    layer.group.replaceChildren();layer.root.querySelectorAll('.note-pin').forEach(n=>n.remove());
    const objects=[...this.items.values()].filter(a=>a.page===layer.page);
    if(this.draft?.layer===layer)objects.push(this.draft.a);
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
        const points=a.points;let d=`M${points[0][0]} ${points[0][1]}`;
        for(let i=1;i<points.length-1;i++)d+=` Q${points[i][0]} ${points[i][1]} ${(points[i][0]+points[i+1][0])/2} ${(points[i][1]+points[i+1][1])/2}`;
        const last=points.at(-1);d+=` L${last[0]+.01} ${last[1]+.01}`;
        const pressure=a.type==='pen'?points.reduce((sum,p)=>sum+(p[2]||.5),0)/points.length*1.4+.3:1;
        element=svg('path',{d,fill:'none',stroke:a.color,'stroke-width':a.width*pressure,'stroke-linecap':'round','stroke-linejoin':'round'});
      }
      element.setAttribute('opacity',a.opacity);element.dataset.noteId=a.id;layer.group.append(element);
    }
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

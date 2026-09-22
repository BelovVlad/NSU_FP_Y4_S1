/* Navigation is derived from rendered Markdown, never written into notebooks. */
(()=>{
  const panel=document.getElementById('notebookOutline');
  const nav=document.getElementById('tocLinks');
  const toggle=document.getElementById('tocToggle');
  const close=document.getElementById('tocClose');
  const backdrop=document.getElementById('tocBackdrop');
  const narrow=matchMedia('(max-width:1100px)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let entries=[],active=null,scheduled=false;
  function setOpen(open,restoreFocus=false){
    document.body.classList.toggle('toc-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    backdrop.hidden=!open;
    if(open)close.focus();
    else if(restoreFocus)toggle.focus();
  }
  toggle.onclick=()=>setOpen(!document.body.classList.contains('toc-open'));
  close.onclick=()=>setOpen(false,true);
  backdrop.onclick=()=>setOpen(false,true);
  narrow.addEventListener('change',()=>setOpen(false));
  window.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('toc-open'))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setOpen(false,true)}
    if(event.key==='Tab'){
      const controls=[...panel.querySelectorAll('button,a,summary')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    }
  },true);
  const toolbar=document.querySelector('.toolbar');
  new ResizeObserver(()=>{
    document.documentElement.style.setProperty('--notebook-toolbar-height',toolbar.getBoundingClientRect().height+'px');
  }).observe(toolbar);
  function labelFor(heading,registry){
    const copy=heading.cloneNode(true);
    copy.querySelectorAll('.math-display').forEach(el=>el.remove());
    copy.querySelectorAll('.math-placeholder').forEach(el=>{
      let tex=registry.get(el.dataset.mathId)?.tex||el.textContent;
      const symbols={nabla:'∇',alpha:'α',beta:'β',gamma:'γ',int:'∫',sin:'sin',cos:'cos',partial:'∂',infty:'∞',varphi:'φ',phi:'φ',theta:'θ',rho:'ρ',pi:'π',cdot:'·',times:'×',quad:' '};
      tex=tex.replace(/\\([a-zA-Z]+)/g,(match,name)=>symbols[name]??(['displaystyle','mathrm','mathbf','boldsymbol','text','left','right'].includes(name)?'':name)).replace(/[{}$]/g,'');
      el.textContent=tex;
    });
    return copy.textContent.replace(/\s+/g,' ').trim();
  }
  function activate(entry){
    if(active===entry)return;
    active?.link.removeAttribute('aria-current');active=entry;
    if(!entry)return;
    entry.link.setAttribute('aria-current','location');
    for(let parent=entry.link.parentElement;parent&&parent!==nav;parent=parent.parentElement){
      if(parent.tagName==='DETAILS')parent.open=true;
    }
    if(panel.getClientRects().length){
      const bounds=nav.getBoundingClientRect(),linkBounds=entry.link.getBoundingClientRect();
      if(linkBounds.top<bounds.top)nav.scrollTop-=bounds.top-linkBounds.top+8;
      else if(linkBounds.bottom>bounds.bottom)nav.scrollTop+=linkBounds.bottom-bounds.bottom+8;
    }
  }
  function updateActive(){
    scheduled=false;
    const limit=toolbar.getBoundingClientRect().bottom+32;
    let current=entries[0];
    for(const entry of entries){if(entry.heading.getBoundingClientRect().top>limit)break;current=entry}
    activate(current);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updateActive)}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  function jump(entry,smooth=false){
    if(!entry)return;
    setOpen(false);
    entry.heading.scrollIntoView({block:'start',behavior:smooth&&!reduced.matches?'smooth':'auto'});
    entry.heading.focus({preventScroll:true});activate(entry);
  }
  function restoreHash(){
    let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
    jump(entries.find(entry=>entry.heading.id===id));
  }
  window.addEventListener('hashchange',restoreHash);
  function build(root,registry){
    nav.replaceChildren();entries=[];active=null;
    const tree=[],stack=[];
    const used=new Set([...document.querySelectorAll('[id]')].map(el=>el.id));
    root.querySelectorAll('.markdown-body :is(h1,h2,h3,h4,h5,h6)').forEach((heading,index)=>{
      const label=labelFor(heading,registry);if(!label)return;
      if(!heading.id){let id='nb-heading-'+(index+1);while(used.has(id))id+='-';heading.id=id;used.add(id)}
      heading.tabIndex=-1;
      const entry={heading,label,level:Number(heading.tagName.slice(1)),children:[],link:null};
      while(stack.length&&stack.at(-1).level>=entry.level)stack.pop();
      (stack.length?stack.at(-1).children:tree).push(entry);stack.push(entry);entries.push(entry);
    });
    function makeList(nodes,depth=0){
      const list=document.createElement('ul');
      for(const node of nodes){
        const item=document.createElement('li'),link=document.createElement('a');
        link.href='#'+encodeURIComponent(node.heading.id);link.textContent=node.label;link.title=node.label;node.link=link;
        link.onclick=event=>{
          if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
          event.preventDefault();history.replaceState(null,'',link.hash);jump(node,true);
        };
        item.append(link);
        if(node.children.length){
          const children=makeList(node.children,depth+1);
          if(depth>=1){
            const details=document.createElement('details'),summary=document.createElement('summary');
            if(document.body.classList.contains('reference-reader'))details.open=true;
            summary.textContent='Подразделы · '+node.children.length;details.append(summary,children);item.append(details);
          }else item.append(children);
        }
        list.append(item);
      }
      return list;
    }
    nav.append(makeList(tree));
    root.querySelector('.reference-nav')?.remove();
    if(document.body.classList.contains('reference-reader')){
      const quick=document.createElement('nav');quick.className='reference-nav';quick.setAttribute('aria-label','Быстрые переходы по справочнику');
      for(const entry of entries.filter(item=>item.level===2)){
        const link=document.createElement('a');link.href=entry.link.getAttribute('href');link.textContent=entry.label;
        link.onclick=entry.link.onclick;quick.append(link);
      }
      if(quick.children.length)root.querySelector('.cells')?.before(quick);
    }
    panel.hidden=toggle.hidden=!entries.length;
    document.body.classList.toggle('has-toc',!!entries.length);
    new ResizeObserver(schedule).observe(root);
    schedule();
  }
  window.notebookOutline={build,restoreHash};
})();

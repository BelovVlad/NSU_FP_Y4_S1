(() => {
  'use strict';
  const base = new URL('./',document.currentScript.src);
  const supported = 'serviceWorker' in navigator && window.isSecureContext;
  let registration, installPrompt;
  const nativeBridge = window.NSUFPAndroid || null;
  const nativeAndroid = !!nativeBridge || /\bNSUFPAndroid\//.test(navigator.userAgent);
  const installed = () => nativeAndroid || matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
  const installButton = document.getElementById('installApp');
  const downloadsButton = document.getElementById('offlineFiles');
  const settingsButton = document.getElementById('appSettings');
  const saveButton = document.getElementById('saveOffline');
  function notice(text) {
    let node = document.getElementById('appNotice');
    if(!node) { node=document.createElement('div'); node.id='appNotice'; node.className='app-notice'; node.setAttribute('role','status'); document.body.append(node); }
    node.textContent=text;
    node.hidden=false;
    clearTimeout(notice.timer);
    notice.timer=setTimeout(()=>node.hidden=true,9000);
  }
  function request(type, values={}) {
    return ready.then(() => new Promise((resolve,reject)=>{
      const worker = navigator.serviceWorker.controller || registration?.active;
      if(!worker) { reject(new Error('Офлайн-режим ещё не готов. Попробуйте через несколько секунд.')); return; }
      const channel = new MessageChannel();
      const timer = setTimeout(()=>{channel.port1.close();reject(new Error('Сохранение не завершено. Проверьте подключение и попробуйте снова.'));},200000);
      channel.port1.onmessage=({data})=>{
        clearTimeout(timer);channel.port1.close();
        if(data.ok)resolve(data.result);else reject(new Error(data.error));
      };
      worker.postMessage({type,...values},[channel.port2]);
    }));
  }
  function updateInstallButton() {
    if(!installButton)return;
    if(nativeAndroid){installButton.hidden=true;return;}
    installButton.hidden=false;
    installButton.textContent=installed()?'Приложение установлено':'Установить приложение';
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(nativeAndroid)return;
    event.preventDefault();installPrompt=event;updateInstallButton();
  });
  window.addEventListener('appinstalled',()=>{
    installPrompt=null;
    if(installButton)installButton.textContent='Приложение установлено';
    notice('Приложение установлено. Его значок появится на главном экране.');
    navigator.storage?.persist?.().catch(()=>{});
  });
  function dialog(title) {
    document.getElementById('appDialog')?.remove();
    const node=document.createElement('dialog');node.id='appDialog';node.className='app-dialog';
    const header=document.createElement('div');header.className='app-dialog-head';
    const heading=document.createElement('h2');heading.textContent=title;
    const close=document.createElement('button');close.type='button';close.className='app-close';close.textContent='×';close.setAttribute('aria-label','Закрыть');close.onclick=()=>node.close();
    header.append(heading,close);node.append(header);document.body.append(node);
    node.addEventListener('click',event=>{if(event.target===node) { const rect=node.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)node.close(); }});
    node.addEventListener('close',()=>node.remove());node.showModal();return node;
  }
  function paragraph(parent,text) {const node=document.createElement('p');node.textContent=text;parent.append(node);return node;}
  const fmtBytes = value => {
    const n=Number(value)||0;
    if(n<1048576)return Math.max(0,n/1024).toFixed(n<10240?1:0)+' КБ';
    return (n/1048576).toFixed(n>=104857600?0:1)+' МБ';
  };
  const encPath = path => String(path).split('/').map(encodeURIComponent).join('/');
  const lfsPaths = new Set([
    'ФЭЧ/03_Литератру/PhysRevD.pdf',
    'ФЭЧ/04_Литератру/PhysRevD.pdf'
  ]);
  function fileSubject(path){
    const parts=String(path).split('/');
    return parts[0]==='База'&&parts[1]==='КМ'?'КМ':parts[0]||'';
  }
  function offlineUrls(file){
    const lfs=lfsPaths.has(file.path);
    const direct=lfs
      ? new URL('https://media.githubusercontent.com/media/BelovVlad/NSU_FP_Y4_S1/main/'+encPath(file.path))
      : new URL('../'+encPath(file.path),base);
    if(file.version)direct.searchParams.set('v',file.version);
    const viewer=new URL('pdfjs/viewer.html',base);
    viewer.searchParams.set('file',file.path);
    viewer.searchParams.set('subject',file.subject||fileSubject(file.path));
    viewer.searchParams.set('title',file.title||file.path.split('/').pop().replace(/\.pdf$/i,''));
    if(file.version)viewer.searchParams.set('v',file.version);
    if(lfs)viewer.searchParams.set('lfs','1');
    return {direct:direct.href,viewer:viewer.href};
  }
  async function storageText(){
    try{
      const estimate=await navigator.storage?.estimate?.();
      if(!estimate)return 'Данные хранятся на этом устройстве.';
      return 'Использовано около '+fmtBytes(estimate.usage||0)+(estimate.quota?' из '+fmtBytes(estimate.quota):'')+'.';
    }catch{return 'Данные хранятся на этом устройстве.'}
  }
  async function activateWaitingWorker(){
    await ready;
    if(!registration?.waiting)return false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
    registration.waiting.postMessage({type:'ACTIVATE'});
    return true;
  }
  async function checkForUpdate(status,button){
    if(button)button.disabled=true;
    if(status)status.textContent='Проверяю обновления…';
    try{
      await ready;
      await registration.update();
      await new Promise(resolve=>setTimeout(resolve,700));
      if(registration.waiting){
        if(status)status.textContent='Доступно обновление.';
        if(button){button.disabled=false;button.textContent='Обновить сейчас';button.dataset.ready='1';}
        return true;
      }
      if(status)status.textContent='У вас актуальная версия.';
      return false;
    }catch(error){
      if(status)status.textContent=error.message||'Не удалось проверить обновления.';
      return false;
    }finally{
      if(button&&!registration?.waiting)button.disabled=false;
    }
  }
  async function checkNativeApkUpdate(status,button){
    if(button)button.disabled=true;
    status.textContent='Проверяю обновление APK…';
    try{
      const metaUrl=new URL('android/version.json',base);
      metaUrl.searchParams.set('_',Date.now());
      const response=await fetch(metaUrl,{cache:'no-store'});
      if(!response.ok)throw new Error('APK обновление ещё не опубликовано.');
      const meta=await response.json();
      const current=Number((navigator.userAgent.match(/NSUFPAndroid\/(\d+)/)||[])[1]||0);
      if(current && Number(meta.versionCode)<=current){
        status.textContent='Установлена актуальная версия APK. Материалы сайта обновляются автоматически.';
        button.textContent='Проверить обновление приложения';
        button.disabled=false;
        return;
      }
      if(current && current < Number(meta.requiresReinstallBelow||0)){
        button.textContent='Скачать APK '+(meta.versionName||'');
        button.disabled=false;
        button.onclick=()=>{ location.href=meta.apkUrl; };
        status.textContent='Для перехода на '+(meta.versionName||'новую версию')+
          ' нужно один раз удалить старое NSU FP и установить скачанный APK заново. После этой переустановки следующие APK будут ставиться поверх приложения.';
        return;
      }
      button.textContent='Обновить приложение';
      button.disabled=false;
      button.onclick=()=>{
        if(nativeBridge?.startUpdate){
          const result=String(nativeBridge.startUpdate(meta.apkUrl)||'');
          if(result==='permission'){
            status.textContent='Разрешите установку приложений для NSU FP и нажмите кнопку ещё раз.';
          }else if(result==='downloading'){
            status.textContent='Скачиваю APK. После загрузки Android откроет установщик.';
          }else if(result.startsWith('error:')){
            status.textContent=result.slice(6);
          }
        }else{
          location.href=meta.apkUrl;
        }
      };
      status.textContent='Доступна новая версия приложения '+(meta.versionName||'')+'.';
    }catch(error){
      status.textContent=error.message||'Не удалось проверить APK.';
      if(button)button.disabled=false;
    }
  }

  async function downloadAllPdfs(status,progress,button){
    button.disabled=true;
    button.textContent='Скачиваю…';
    try{
      const response=await fetch(new URL('search-index/files.json',base),{cache:'no-cache'});
      if(!response.ok)throw new Error('Не удалось получить список материалов.');
      const catalogue=await response.json();
      const pdfs=(catalogue.files||[]).filter(file=>file.type==='pdf');
      const totalBytes=pdfs.reduce((sum,file)=>sum+(Number(file.size)||0),0);
      const saved=await request('LIST_PDFS');
      const savedUrls=new Set(saved.map(file=>file.url));
      let done=0,downloaded=0,failed=0,skipped=0;
      progress.hidden=false;
      const bar=progress.querySelector('span');
      for(const file of pdfs){
        const urls=offlineUrls(file);
        if(savedUrls.has(urls.direct)){skipped++;done++;bar.style.width=(done/pdfs.length*100)+'%';continue;}
        status.textContent='Скачиваю '+(done+1)+' / '+pdfs.length+': '+(file.title||file.path);
        try{
          const result=await request('SAVE_PDF',{url:urls.direct,viewer:urls.viewer,title:file.title||file.path});
          downloaded+=Number(result?.bytes)||0;
        }catch{failed++}
        done++;
        bar.style.width=(done/pdfs.length*100)+'%';
      }
      status.textContent='Готово: '+(pdfs.length-failed)+' / '+pdfs.length+
        ' PDF · добавлено '+fmtBytes(downloaded)+(skipped?' · уже было '+skipped:'')+
        (failed?' · ошибок '+failed:'')+'. Всего в каталоге около '+fmtBytes(totalBytes)+'.';
      navigator.storage?.persist?.().catch(()=>{});
    }catch(error){
      status.textContent=error.message||'Не удалось скачать материалы.';
    }finally{
      button.disabled=false;button.textContent='Скачать все PDF';
    }
  }
  async function openManager(){
    const panel=dialog('Приложение и данные');
    panel.classList.add('app-manager');
    const body=document.createElement('div');body.className='app-manager-body';panel.append(body);

    const summary=document.createElement('div');summary.className='app-manager-summary';
    const storageLabel=document.createElement('strong');storageLabel.textContent='Данные на устройстве';
    const storage=document.createElement('span');storage.className='app-manager-storage';storage.textContent='Считаю…';
    summary.append(storageLabel,storage);body.append(summary);
    storage.textContent=await storageText();

    const appSection=document.createElement('section');appSection.className='app-manager-section';
    appSection.innerHTML='<h3>'+(nativeAndroid?'Приложение':'Обновления')+'</h3><div class="app-manager-actions"></div>';
    const appActions=appSection.querySelector('.app-manager-actions');
    const update=document.createElement('button');update.type='button';update.className='app-manager-btn';
    const updateStatus=document.createElement('div');updateStatus.className='app-manager-status';
    if(nativeAndroid){
      update.textContent='Проверить обновление приложения';
      updateStatus.textContent='Материалы сайта обновляются автоматически. APK проверяется отдельно.';
      update.onclick=()=>checkNativeApkUpdate(updateStatus,update);
    }else{
      update.textContent=registration?.waiting?'Обновить сейчас':'Проверить обновления';
      if(registration?.waiting){update.dataset.ready='1';updateStatus.textContent='Доступно обновление.'}
      update.onclick=async()=>{
        if(update.dataset.ready==='1'||registration?.waiting){await activateWaitingWorker();return;}
        await checkForUpdate(updateStatus,update);
      };
    }
    appActions.append(update);appSection.append(updateStatus);body.append(appSection);

    const dataSection=document.createElement('section');dataSection.className='app-manager-section';
    dataSection.innerHTML='<h3>Офлайн-данные</h3><div class="app-manager-actions"></div>';
    const dataActions=dataSection.querySelector('.app-manager-actions');
    const saved=document.createElement('button');saved.type='button';saved.className='app-manager-btn';saved.textContent='Сохранённые PDF';
    saved.onclick=()=>downloadsButton?.click();
    const all=document.createElement('button');all.type='button';all.className='app-manager-btn primary';all.textContent='Скачать все PDF';
    const clear=document.createElement('button');clear.type='button';clear.className='app-manager-btn danger';clear.textContent='Удалить сохранённые PDF';
    const status=document.createElement('div');status.className='app-manager-status';
    const progress=document.createElement('div');progress.className='app-manager-progress';progress.hidden=true;progress.innerHTML='<span></span>';
    all.onclick=()=>downloadAllPdfs(status,progress,all);
    clear.onclick=async()=>{
      if(!confirm('Удалить все PDF, сохранённые для офлайн-доступа на этом устройстве?'))return;
      clear.disabled=true;status.textContent='Удаляю сохранённые PDF…';
      try{await request('CLEAR_PDFS');status.textContent='Сохранённые PDF удалены.';storage.textContent=await storageText();}
      catch(error){status.textContent=error.message}
      finally{clear.disabled=false}
    };
    dataActions.append(saved,all,clear);
    dataSection.append(progress,status);
    const note=document.createElement('p');note.className='app-manager-note';
    note.textContent='«Скачать все PDF» загружает материалы целиком. Сейчас каталог занимает примерно 250 МБ; фактический объём может меняться после обновлений.';
    dataSection.append(note);body.append(dataSection);
  }
  settingsButton?.addEventListener('click',()=>{void openManager()});
  installButton?.addEventListener('click',async()=>{
    if(nativeAndroid)return;
    if(installPrompt) {
      const prompt=installPrompt;installPrompt=null;
      try {await prompt.prompt();await prompt.userChoice;}catch{notice('Откройте меню браузера и выберите «Установить приложение».');}
      return;
    }
    const panel=dialog(installed()?'Приложение на устройстве':'Установка приложения');
    paragraph(panel,installed()?'Вы уже открыли установленное приложение. Материалы обновляются при подключении к интернету.':
      /iPad|iPhone|iPod/.test(navigator.userAgent)?'В Safari нажмите «Поделиться», затем «На экран Домой».':
      'На Android откройте этот сайт в Chrome, нажмите ⋮ → «Установить приложение» или «Добавить на главный экран». Если сайт открыт внутри мессенджера, сначала выберите «Открыть в браузере».');
    paragraph(panel,'Страницы базы сохраняются после открытия. Для PDF нажмите «Без интернета» в настройках просмотрщика: скачается весь файл, до 150 МБ. Первый запуск и несохранённые материалы требуют интернета.');
    if(!supported)paragraph(panel,'Установка и офлайн-режим доступны на опубликованном сайте с HTTPS.');
  });
  downloadsButton?.addEventListener('click',async()=>{
    const panel=dialog('Сохранённые PDF');
    paragraph(panel,'Эти файлы доступны без интернета в этом браузере и установленном через него приложении. При очистке данных сайта они удалятся.');
    const state=paragraph(panel,'Проверяю сохранённые файлы…');
    try {
      const files=await request('LIST_PDFS');
      state.textContent=files.length?`Сохранено: ${files.length} · ${(files.reduce((sum,file)=>sum+file.bytes,0)/1048576).toFixed(1)} МБ`:'Пока нет сохранённых PDF. Откройте документ и нажмите «Без интернета» в настройках чтения.';
      const list=document.createElement('ul');list.className='app-downloads';panel.append(list);
      for(const file of files) {
        const row=document.createElement('li'),link=document.createElement('a'),remove=document.createElement('button');
        link.href=file.viewer;link.textContent=file.title;
        remove.type='button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить сохранённый файл '+file.title);
        remove.onclick=async()=>{try{await request('REMOVE_PDF',{url:file.url});row.remove();state.textContent='Файл удалён с устройства.';}catch(error){notice(error.message);}};
        row.append(link,remove);list.append(row);
      }
    }catch(error){state.textContent=error.message;}
  });
  saveButton?.addEventListener('click',async()=>{
    const direct=document.getElementById('direct');
    if(!direct || direct.getAttribute('href')==='#')return;
    saveButton.disabled=true;saveButton.textContent='Сохраняю…';
    notice('Скачиваю PDF целиком. Не закрывайте документ до завершения.');
    try {
      const result=await request('SAVE_PDF',{url:direct.href,viewer:location.href,title:document.getElementById('title')?.textContent||'PDF'});
      saveButton.textContent='Сохранён';
      notice(`PDF сохранён (${(result.bytes/1048576).toFixed(1)} МБ). Открывайте его через «Сохранённые PDF» в меню сайта.`);
      navigator.storage?.persist?.().catch(()=>{});
    }catch(error){saveButton.textContent='Без интернета';notice(error.message);}
    finally{saveButton.disabled=false;}
  });
  const ready = supported ? navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'}).then(async value=>{
    registration=value;
    value.update().catch(()=>{});
    function offerUpdate(){
      if(!registration.waiting || !registration.active || !navigator.serviceWorker.controller)return;
      if(nativeAndroid)return;
      settingsButton?.classList.add('has-update');
      settingsButton?.setAttribute('title','Доступно обновление приложения');
      notice('Доступно обновление приложения. Откройте «Приложение» → «Обновить сейчас».');
    }
    offerUpdate();
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate();});});
    if(!registration.active) await new Promise((resolve,reject)=>{
      const worker=registration.installing||registration.waiting;
      if(!worker){reject(new Error('Не удалось подготовить офлайн-режим.'));return;}
      const check=()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(new Error('Не удалось подготовить офлайн-режим. Попробуйте обновить страницу при подключении к сети.'));};
      worker.addEventListener('statechange',check);check();
    });
    return registration;
  }) : Promise.reject(new Error('Офлайн-режим требует HTTPS и поддерживаемого браузера.'));
  // Avoid an unhandled rejection on browsers that cannot install the app.
  ready.catch(()=>{});
  window.NSUApp={ready,request};
  updateInstallButton();

  // A reader can be the first page visited: retain libraries loaded before worker activation.
  const warm=()=>ready.then(()=>request('WARM',{urls:[location.href,...performance.getEntriesByType('resource').map(entry=>entry.name)]})).catch(()=>{});
  window.NSUApp.warm=warm;
  if(document.readyState==='complete')warm();else window.addEventListener('load',warm,{once:true});
})();

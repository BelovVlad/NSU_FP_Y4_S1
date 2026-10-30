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
    const viewer=new URL(file.type==='ipynb'?'notebook/viewer.html':'pdfjs/viewer.html',base);
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

  let bulkRunning=false,bulkStop=false;
  async function downloadAllPdfs(status,progress,button){
    if(bulkRunning){bulkStop=true;button.textContent='Завершаю текущий файл…';return;}
    bulkRunning=true;bulkStop=false;button.disabled=true;status.textContent='Проверяю каталог и сохранённые версии…';
    try{
      const response=await fetch(new URL('search-index/files.json',base),{cache:'no-cache'});
      if(!response.ok)throw new Error('Не удалось получить список материалов.');
      const catalogue=await response.json();
      const files=(catalogue.files||[]).filter(file=>['pdf','ipynb'].includes(file.type));
      const totalBytes=files.reduce((sum,file)=>sum+(Number(file.size)||0),0);
      const saved=await request('LIST_MATERIALS');
      const savedUrls=new Set(saved.flatMap(file=>[file.url,file.alias].filter(Boolean)));
      const remaining=files.filter(file=>!savedUrls.has(offlineUrls(file).direct));
      const needed=remaining.reduce((sum,file)=>sum+(Number(file.size)||0),0);
      const estimate=await navigator.storage?.estimate?.().catch(()=>null);
      const available=estimate?.quota?estimate.quota-(estimate.usage||0):null;
      const summary=files.length+' файлов · около '+fmtBytes(totalBytes)+'. Осталось '+remaining.length+' · около '+fmtBytes(needed)+
        '. Дополнительно будут сохранены шрифты и ресурсы просмотрщиков.'+(available!==null?' Свободно около '+fmtBytes(available)+'.':'');
      status.textContent=summary;
      if(available!==null&&needed>available)throw new Error('Недостаточно места. '+summary);
      if(!confirm('Сохранить все материалы? '+summary))return;
      button.disabled=false;button.textContent='Остановить загрузку';
      status.textContent='Подготавливаю PDF.js, шрифты и просмотр Notebook…';
      await request('PREPARE_LIBRARY',{types:[...new Set(files.map(f=>f.type))]});
      let done=files.length-remaining.length,downloaded=0,savedBytes=files.filter(file=>savedUrls.has(offlineUrls(file).direct)).reduce((sum,file)=>sum+(Number(file.size)||0),0);
      const failed=[];
      progress.hidden=false;
      const bar=progress.querySelector('span');
      bar.style.width=(files.length?done/files.length*100:100)+'%';
      for(const file of remaining){
        if(bulkStop||!status.isConnected)break;
        const urls=offlineUrls(file);
        status.textContent='Сохранено '+done+' / '+files.length+' · '+fmtBytes(savedBytes)+' / ≈'+fmtBytes(totalBytes)+' · '+(file.title||file.path);
        try{
          const result=await request('SAVE_MATERIAL',{url:urls.direct,viewer:urls.viewer,title:file.title||file.path});
          downloaded+=Number(result?.bytes)||0;savedBytes+=Number(result?.bytes)||0;done++;
        }catch(error){failed.push((file.title||file.path)+': '+error.message);}
        bar.style.width=(files.length?done/files.length*100:100)+'%';
        if(!navigator.onLine){bulkStop=true;break;}
      }
      const verified=await request('LIST_MATERIALS');
      const verifiedUrls=new Set(verified.flatMap(file=>[file.url,file.alias].filter(Boolean)));
      const actual=files.filter(file=>verifiedUrls.has(offlineUrls(file).direct)).length;
      status.textContent=(actual===files.length?'Библиотека сохранена. ':'Загрузка не завершена. ')+actual+' / '+files.length+
        ' файлов · добавлено '+fmtBytes(downloaded)+(failed.length?' · ошибок '+failed.length+'. '+failed.join('; '):'')+
        (actual<files.length?' Нажмите «Продолжить / повторить»: сохранённые версии будут пропущены.':'');
      navigator.storage?.persist?.().catch(()=>{});
    }catch(error){status.textContent=error.message||'Не удалось скачать материалы.';}
    finally{bulkRunning=false;button.disabled=false;button.textContent='Продолжить / повторить';}
  }
  async function annotationStore(){
    if(!window.NSUAnnotations)await import(new URL('annotations-store.js?v=1',base).href);
    return window.NSUAnnotations;
  }
  async function openMyNotes(){
    const panel=dialog('Мои заметки');
    const status=paragraph(panel,'Читаю заметки…');
    try{
      const store=await annotationStore(),backup=await store.backup();
      const list=document.createElement('ul');list.className='app-downloads';panel.append(list);
      for(const doc of backup.documents){
        const objects=backup.objects.filter(a=>a.docId===doc.docId&&a.revision===doc.revision);
        if(!objects.length)continue;
        const row=document.createElement('li'),links=document.createElement('div');
        const title=document.createElement('strong');title.textContent=doc.title+' · '+objects.length;links.append(title);
        for(const page of [...new Set(objects.map(a=>a.page))].sort((a,b)=>a-b)){
          const link=document.createElement('a');const url=offlineUrls({path:doc.path,title:doc.title}).viewer;
          const target=new URL(url);target.searchParams.set('page',page);
          link.href=target.href;link.textContent='Стр. '+page+' ';links.append(document.createElement('br'),link);
        }
        const info=document.createElement('small');info.textContent='Версия '+doc.revision.slice(0,12)+' · '+new Date(doc.updatedAt).toLocaleString('ru-RU');links.append(info);
        row.append(links);list.append(row);
      }
      status.textContent=list.children.length?'Заметки хранятся только на этом устройстве. Для прежней версии PDF используйте восстановление в просмотрщике.':'Пока нет заметок.';
    }catch(error){status.textContent=error.message;}
  }
  function addNotesSettings(body){
    const section=document.createElement('section');section.className='app-manager-section';
    section.innerHTML='<h3>Заметки</h3><div class="app-manager-actions"></div>';
    const actions=section.querySelector('div'),status=document.createElement('div');status.className='app-manager-status';
    function action(label,callback){const button=document.createElement('button');button.type='button';button.className='app-manager-btn';button.textContent=label;button.onclick=async()=>{try{await callback();}catch(error){status.textContent=error.message;}};actions.append(button);return button;}
    action('Мои заметки',openMyNotes);
    action('Экспорт резервной копии',async()=>{
      const backup=await (await annotationStore()).backup();const json=JSON.stringify(backup,null,2);
      if(nativeBridge?.saveNotesBackup){nativeBridge.saveNotesBackup(json);status.textContent='Выберите место для резервной копии.';return;}
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');
      link.href=url;link.download='nsu-notes-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      if(nativeAndroid){
        const text=document.createElement('textarea');text.value=json;text.setAttribute('aria-label','Резервная копия JSON');text.style.width='100%';section.append(text);
        status.textContent='Если загрузка JSON недоступна в этой версии APK, скопируйте текст и сохраните его в файл.';
      }else status.textContent='Резервная копия подготовлена для скачивания.';
    });
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
    const importJson=async text=>{
      const store=await annotationStore(),backup=store.validate(JSON.parse(text));
      if(!confirm('Импортировать '+backup.objects.length+' аннотаций? Более новые записи на устройстве сохранятся.'))return;
      await store.import(backup);status.textContent='Резервная копия восстановлена: '+backup.objects.length+' аннотаций.';
    };
    input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>50*1024*1024)throw new Error('Резервная копия больше 50 МБ.');await importJson(await file.text());}catch(error){status.textContent='Импорт не выполнен: '+error.message;}finally{input.value='';}};
    action('Импорт резервной копии',()=>input.click());section.append(input);
    if(nativeAndroid&&!nativeBridge?.saveNotesBackup)action('Вставить JSON резервной копии',async()=>{const text=prompt('Вставьте JSON резервной копии');if(text)await importJson(text);});
    const clear=action('Удалить все аннотации',async()=>{if(!confirm('Удалить ВСЕ заметки без возможности отмены? Сначала экспортируйте резервную копию. Офлайн-файлы останутся.'))return;await (await annotationStore()).clear();status.textContent='Все аннотации удалены.';});clear.classList.add('danger');
    const note=document.createElement('p');note.className='app-manager-note';note.textContent='Заметки не удаляются при очистке библиотеки и обновлении приложения. Очистка данных браузера или APK удаляет их. Сохраняйте резервные копии.';
    section.append(status,note);body.append(section);
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
    appSection.innerHTML='<h3>Приложение</h3><div class="app-manager-actions"></div>';
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
    if(!nativeAndroid&&!installed()){
      const install=document.createElement('button');install.type='button';install.className='app-manager-btn primary';
      install.textContent=matchMedia('(pointer:fine)').matches?'Установить на компьютер':'Установить приложение';
      install.onclick=()=>void installApp();appActions.append(install);
    }
    appActions.append(update);appSection.append(updateStatus);paragraph(appSection,'Версия оболочки: 84 · формат заметок: 1');body.append(appSection);

    const dataSection=document.createElement('section');dataSection.className='app-manager-section';
    dataSection.innerHTML='<h3>Офлайн-библиотека</h3><div class="app-manager-actions"></div>';
    const dataActions=dataSection.querySelector('.app-manager-actions');
    const saved=document.createElement('button');saved.type='button';saved.className='app-manager-btn';saved.textContent='Сохранённые материалы';
    saved.onclick=()=>downloadsButton?.click();
    const all=document.createElement('button');all.type='button';all.className='app-manager-btn primary';all.textContent='Сохранить все материалы';
    const clear=document.createElement('button');clear.type='button';clear.className='app-manager-btn danger';clear.textContent='Удалить загруженные материалы';
    const status=document.createElement('div');status.className='app-manager-status';
    const progress=document.createElement('div');progress.className='app-manager-progress';progress.hidden=true;progress.innerHTML='<span></span>';
    all.onclick=()=>downloadAllPdfs(status,progress,all);
    clear.onclick=async()=>{
      if(bulkRunning){status.textContent='Сначала остановите загрузку и дождитесь завершения текущего файла.';return;}
      if(!confirm('Удалить все загруженные материалы? Заметки останутся на устройстве.'))return;
      clear.disabled=true;status.textContent='Удаляю загруженные материалы…';
      try{await request('CLEAR_MATERIALS');status.textContent='Загруженные материалы удалены. Заметки сохранены.';storage.textContent=await storageText();}
      catch(error){status.textContent=error.message}
      finally{clear.disabled=false}
    };
    dataActions.append(saved,all,clear);
    dataSection.append(progress,status);
    const note=document.createElement('p');note.className='app-manager-note';
    note.textContent='PDF и Notebook сохраняются целиком (до 150 МБ на файл). Объём вычисляется по текущему каталогу. При остановке текущий файл завершается; продолжение пропускает уже сохранённые версии.';
    dataSection.append(note);body.append(dataSection);addNotesSettings(body);
    panel.addEventListener('close',()=>{bulkStop=true;});
  }
  settingsButton?.addEventListener('click',()=>{void openManager()});
  // Installing (Edge/Chrome on a computer, Android, iOS) gives a window that opens without the internet.
  async function installApp(){
    if(nativeAndroid)return;
    if(installPrompt) {
      const prompt=installPrompt;installPrompt=null;
      try {await prompt.prompt();await prompt.userChoice;}catch{notice('Откройте меню браузера и выберите «Установить приложение».');}
      return;
    }
    const panel=dialog(installed()?'Приложение на устройстве':'Установка приложения');
    paragraph(panel,installed()?'Вы уже открыли установленное приложение. Материалы обновляются при подключении к интернету.':
      /iPad|iPhone|iPod/.test(navigator.userAgent)?'В Safari нажмите «Поделиться», затем «На экран Домой».':
      matchMedia('(pointer:fine)').matches?'На компьютере: в Edge — меню ⋯ → «Приложения» → «Установить этот сайт как приложение», в Chrome — значок установки справа в адресной строке. Приложение появится в меню «Пуск» и на рабочем столе и будет открываться без интернета.':
      'На Android откройте этот сайт в Chrome, нажмите ⋮ → «Установить приложение» или «Добавить на главный экран». Если сайт открыт внутри мессенджера, сначала выберите «Открыть в браузере».');
    paragraph(panel,'Страницы базы сохраняются после открытия. Чтобы PDF открывались без интернета, откройте шестерёнку рядом с «Главная» → «Сохранить все материалы». Первый запуск и несохранённые материалы требуют интернета.');
    if(!supported)paragraph(panel,'Установка и офлайн-режим доступны на опубликованном сайте с HTTPS.');
  }
  installButton?.addEventListener('click',()=>void installApp());
  downloadsButton?.addEventListener('click',async()=>{
    const panel=dialog('Сохранённые материалы');
    paragraph(panel,'Эти файлы доступны без интернета в этом браузере и установленном через него приложении. При очистке данных сайта они удалятся.');
    const state=paragraph(panel,'Проверяю сохранённые файлы…');
    try {
      const files=await request('LIST_PDFS');
      state.textContent=files.length?`Сохранено: ${files.length} · ${(files.reduce((sum,file)=>sum+file.bytes,0)/1048576).toFixed(1)} МБ`:'Пока нет сохранённых материалов. В настройках выберите «Сохранить все материалы».';
      const list=document.createElement('ul');list.className='app-downloads';panel.append(list);
      for(const file of files) {
        const row=document.createElement('li'),link=document.createElement('a'),remove=document.createElement('button');
        link.href=file.viewer;link.textContent=file.title;
        remove.type='button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить сохранённый файл '+file.title);
        remove.onclick=async()=>{if(!confirm('Удалить загруженный файл? Заметки останутся.'))return;try{await request('REMOVE_MATERIAL',{url:file.url});row.remove();state.textContent='Файл удалён с устройства.';}catch(error){notice(error.message);}};
        row.append(link,remove);list.append(row);
      }
    }catch(error){state.textContent=error.message;}
  });
  // The short address (…/NSU_FP_Y4_S1/ and its particles/ link) only redirects here; its own tiny worker
  // keeps those pages for offline use. The more specific scope of sw.js still controls this site.
  if(supported)navigator.serviceWorker.register(new URL('../offline-root.js',base),{scope:new URL('../',base).pathname,updateViaCache:'none'}).catch(()=>{});
  const ready = supported ? navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'}).then(async value=>{
    registration=value;
    value.update().catch(()=>{});
    // A new version is applied silently: the waiting worker takes over and the page reloads.
    function offerUpdate(){
      if(!registration.waiting || !registration.active || !navigator.serviceWorker.controller)return;
      if(nativeAndroid)return;
      void activateWaitingWorker();
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
  ready.catch(()=>{});
  window.NSUApp={ready,request};
  updateInstallButton();

  const warm=()=>ready.then(()=>request('WARM',{urls:[location.href,...performance.getEntriesByType('resource').map(entry=>entry.name)]})).catch(()=>{});
  window.NSUApp.warm=warm;
  if(document.readyState==='complete')warm();else window.addEventListener('load',warm,{once:true});
})();

;(() => {
  'use strict';

  // Subject links: any <subject>/link.md creates a "Ссылки" tab.
  if(typeof state!=='undefined'&&typeof sectionsFor==='function'&&typeof renderSubject==='function'){
    const linkState=new Map(),linkCache=new Map(),linkPending=new Map();
    const order=['Лекции','Семинары','Лабораторные','Задачи','Литература','Ссылки','Практика','Теория'];
    const encodePath=path=>String(path).split('/').map(encodeURIComponent).join('/');
    const urlFor=subject=>'https://raw.githubusercontent.com/BelovVlad/NSU_FP_Y4_S1/main/'+encodePath(subject+'/link.md')+'?t='+Date.now();
    async function fetchLinks(subject,refresh=false){
      if(!refresh&&linkCache.has(subject))return linkCache.get(subject);
      if(!refresh&&linkPending.has(subject))return linkPending.get(subject);
      const pending=(async()=>{
        const response=await fetch(urlFor(subject),{cache:'no-store'});
        if(!response.ok){if(response.status===404)linkState.set(subject,false);throw new Error('HTTP '+response.status)}
        const markdown=await response.text();linkState.set(subject,true);linkCache.set(subject,markdown);return markdown;
      })().finally(()=>linkPending.delete(subject));
      linkPending.set(subject,pending);return pending;
    }
    async function probe(subject){
      if(linkState.has(subject))return linkState.get(subject);
      try{await fetchLinks(subject);return true}catch{if(!linkState.has(subject))linkState.set(subject,false);return false}
    }
    const baseSectionsFor=sectionsFor;
    sectionsFor=function(subject){
      const set=baseSectionsFor(subject).filter(section=>section!=='Ссылки');
      if(linkState.get(subject)===true&&!set.includes('Ссылки'))set.push('Ссылки');
      return set.sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))||a.localeCompare(b,'ru'));
    };
    loadSubjectLinks=async function(refresh=false){
      const target=document.getElementById('subjectLinksContent');if(!target)return;
      const subject=state.subject;
      try{
        const markdown=await fetchLinks(subject,refresh);
        if(target.isConnected&&state.subject===subject)target.innerHTML=renderLinksMarkdown(markdown);
      }catch(error){
        console.error('[links]',error);
        if(target.isConnected&&state.subject===subject){
          target.innerHTML='<div class="links-error">Не удалось прочитать '+subject+'/link.md. <button type="button" id="retrySubjectLinks" class="feedback-retry">Повторить</button></div>';
          const retry=document.getElementById('retrySubjectLinks');if(retry)retry.onclick=()=>{target.innerHTML='<div class="links-loading">Загружаю ссылки…</div>';void loadSubjectLinks(true)};
        }
      }
    };
    const baseRenderSubject=renderSubject;
    renderSubject=function(){
      const subject=state.subject;
      if(subject!=='База'&&!linkState.has(subject))void probe(subject).then(found=>{if(found&&state.view==='subjects'&&state.subject===subject)renderSubject()});
      if(state.section==='Ссылки'){
        if(linkState.get(subject)===true){renderSubjectLinks();return}
        if(linkState.has(subject))state.section='';
      }
      return baseRenderSubject();
    };
    if(state.view==='subjects'&&state.subject!=='База'){
      const subject=state.subject;void probe(subject).then(found=>{if(found&&state.view==='subjects'&&state.subject===subject)renderSubject()});
    }
  }
})();

;(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const audioUrl = name => new URL('Karma/audio/' + name + '.wav', base).href;
  const warm = [];

  window.playSecretDashboardSound = (name, volume = 1, options = {}) => {
    const audio = new Audio(audioUrl(name));
    audio.preload = 'auto';
    audio.loop = !!options.loop;
    audio.volume = clamp(volume);
    audio.playbackRate = Math.max(.25, Math.min(4, Number(options.pitch) || 1));
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      try { audio.currentTime = 0; } catch {}
    };
    stop.set = (nextVolume, nextPitch) => {
      if (Number.isFinite(Number(nextVolume))) audio.volume = clamp(nextVolume);
      if (Number.isFinite(Number(nextPitch))) audio.playbackRate = Math.max(.25, Math.min(4, Number(nextPitch)));
    };
    audio.play().catch(() => {});
    return stop;
  };

  window.preloadKarmaSounds = () => {
    if (!warm.length) {
      for (const name of ['UIWood5','UIWoodHit','capBell2','karmaFuzz','karmaFuzz2','karmaRiseA','karmaWheelC_1','karmaWheelC_2','karmaWheelC_3','karmaWheelC_4','karmaWheelLow']) {
        const audio = new Audio(audioUrl(name));
        audio.preload = 'auto';
        try { audio.load(); } catch {}
        warm.push(audio);
      }
    }
    return Promise.resolve();
  };
})();

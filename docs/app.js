(() => {
  'use strict';
  const base = new URL('./',document.currentScript.src);
  const supported = 'serviceWorker' in navigator && window.isSecureContext;
  let registration, installPrompt;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const installButton = document.getElementById('installApp');
  const downloadsButton = document.getElementById('offlineFiles');
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
    if(installButton) installButton.textContent=installed()?'Приложение установлено':'Установить приложение';
  }
  window.addEventListener('beforeinstallprompt',event=>{
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
  installButton?.addEventListener('click',async()=>{
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
    function offerUpdate(){
      if(!registration.waiting || !registration.active || !navigator.serviceWorker.controller)return;
      let button=document.getElementById('appUpdate');
      if(button)return;
      button=document.createElement('button');button.id='appUpdate';button.className='app-update';button.textContent='Обновить приложение';document.body.append(button);
      button.onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});registration.waiting?.postMessage({type:'ACTIVATE'});};
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

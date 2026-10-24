(() => {
  'use strict';

  const scriptUrl = document.currentScript?.src || location.href;
  const asset = name => new URL('assets/' + name, scriptUrl).href;
  const MINUTE = 60 * 1000;
  const HOLOGRAM_SCALE = .7;
  const supplied = window.__OVERSEER_TEST_CONFIG__ || {};
  const CONFIG = Object.freeze({
    initialWindow: supplied.initialWindow ?? 14 * MINUTE,
    raisedWindow: supplied.raisedWindow ?? 7 * MINUTE,
    musicWindow: supplied.musicWindow ?? 7 * MINUTE,
    glitchMin: supplied.glitchMin ?? 15 * 1000,
    glitchMax: supplied.glitchMax ?? 60 * 1000,
    activeMax: supplied.activeMax ?? 3 * MINUTE,
    mobileActiveMax: supplied.mobileActiveMax ?? 1 * MINUTE,
    cooldown: supplied.cooldown ?? 7 * MINUTE,
    scanInterval: supplied.scanInterval ?? 700,
    bodySize: supplied.bodySize ?? 48
  });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobilePointer = matchMedia('(pointer: coarse)');
  const random = () => Math.random();
  const randomCurl = () => {
    const value=random()*2-1;
    return (value<0?-1:1)*(.58+Math.abs(value)*.42);
  };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const yellow = '#ffcc4d';
  const paleYellow = '#fff2a6';

  let host, canvas, ctx, musicAudio, musicButton;
  let frame = 0, lastFrameAt = 0, scanTimer = 0, scanQueued = false;
  let attemptTimer = 0, windowTimer = 0, activeTimer = 0, cooldownTimer = 0;
  let attentionTimer = 0, teleportTimer = 0;
  let pdfPaused = false, activeDeadline = 0, activeRemaining = 0;
  let dpr = 1, viewportWidth = innerWidth, viewportHeight = innerHeight;
  let imageLoadStarted = false;
  const images = {};
  const tintCache = new Map();

  const state = {
    active: false,
    reason: '',
    activeSince: 0,
    cooldownUntil: 0,
    ambientStage: 0,
    scheduleMode: 'ambient',
    scheduleChance: .10,
    scheduleWindowEnds: 0,
    pos: {x: innerWidth * .72, y: innerHeight * .36},
    targetPos: {x: innerWidth * .72, y: innerHeight * .36},
    velocity: {x: 0, y: 0},
    pointer: {x: -1000, y: -1000, seen: false},
    lookAt: {x: innerWidth * .5, y: innerHeight * .5},
    gazeAngle: null,
    renderedTailCurl: 0,
    feelers: [],
    retractDuration: 280,
    projecting: false,
    focus: 'ambient',
    projectionKind: '',
    projectionStage: 'idle',
    projectionElapsed: 0,
    projectionDwell: 0,
    projectionDwellLimit: 0,
    projectionBuild: 0,
    crownOpen: 1,
    musicHovered: false,
    musicApproach: 'idle',
    musicReadyAt: 0,
    haloAmount: 0,
    recentSpots: [],
    attention: null,
    attentionRect: null,
    previousAttentionCenter: null,
    interfaceMotion: 0,
    dangerRange: null,
    dangerRect: null,
    gribanovVisible: false,
    suppressedUntilReload: false,
    disintegrating: false,
    sparks: [],
    teleporting: false,
    phase: 1,
    phaseDirection: 0,
    nextWanderAt: 0,
    edge: 'right',
    rootAlong: 0,
    tailCurl: randomCurl(),
    holoSeed: random() * 1000
  };

  function chanceForStage(stage) {
    if(stage <= 0) return .10;
    if(stage === 1) return .20;
    if(stage === 2) return .40;
    return Math.min(1, .40 + (stage - 2) * .05);
  }

  function musicMode() {
    if(!musicAudio || musicAudio.paused) return 'ambient';
    const source = decodeURIComponent(musicAudio.currentSrc || musicAudio.src || '').toLowerCase();
    return document.body.classList.contains('music-na19x') || source.includes('na 19x') ? 'glitch' : 'music';
  }

  function clearSchedule() {
    clearTimeout(attemptTimer);
    clearTimeout(windowTimer);
    clearTimeout(cooldownTimer);
    attemptTimer = windowTimer = cooldownTimer = 0;
    state.scheduleWindowEnds = 0;
  }

  function beginWindow(duration, chance, reason, advance) {
    clearSchedule();
    state.scheduleMode = reason;
    state.scheduleChance = chance;
    state.scheduleWindowEnds = Date.now() + duration;
    // One trial per window, at a uniformly random moment within that window.
    const attemptDelay = random() * duration;
    attemptTimer = setTimeout(() => {
      attemptTimer = 0;
      if(state.active || Date.now() < state.cooldownUntil || musicMode() !== reason) return;
      if(random() < chance) show(reason);
    }, attemptDelay);
    windowTimer = setTimeout(() => {
      windowTimer = 0;
      if(state.active) return;
      if(musicMode() === reason) advance();
      planNextEncounter();
    }, duration);
  }

  function planNextEncounter() {
    clearSchedule();
    if(state.active || state.suppressedUntilReload) return;
    const cooldownLeft = state.cooldownUntil - Date.now();
    if(cooldownLeft > 0) {
      cooldownTimer = setTimeout(() => {
        cooldownTimer = 0;
        scanForGribanov();
        if(!state.active) planNextEncounter();
      }, cooldownLeft + 20);
      return;
    }
    if(state.gribanovVisible && !state.suppressedUntilReload) {
      show('danger');
      return;
    }
    const mode = musicMode();
    if(mode === 'glitch') {
      const delay = lerp(CONFIG.glitchMin, CONFIG.glitchMax, random());
      state.scheduleMode = 'glitch';
      state.scheduleChance = 1;
      state.scheduleWindowEnds = Date.now() + delay;
      attemptTimer = setTimeout(() => {
        attemptTimer = 0;
        if(!state.active && Date.now() >= state.cooldownUntil && musicMode() === 'glitch') show('glitch');
        else if(!state.active) planNextEncounter();
      }, delay);
      return;
    }
    if(mode === 'music') {
      beginWindow(CONFIG.musicWindow, .50, 'music', () => {});
      return;
    }
    const stage = state.ambientStage;
    const duration = stage === 0 ? CONFIG.initialWindow : CONFIG.raisedWindow;
    beginWindow(duration, chanceForStage(stage), 'ambient', () => { state.ambientStage += 1; });
  }

  function loadImages() {
    if(imageLoadStarted) return;
    imageLoadStarted = true;
    const sources = {
      eye: asset('Circle20.png'),
      guidance: asset('GuidancePebbles.png'),
      stop: asset('keyXA.png'),
      danger: asset('miscDangerSymbol.png'),
      arrow: asset('keyArrowA.png'),
      noise: asset('noise.png')
    };
    for(const [name, src] of Object.entries(sources)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      image.onload = () => { images[name] = image; tintCache.clear(); drawSoon(); };
    }
  }

  function resizeCanvas() {
    if(!canvas) return;
    viewportWidth = innerWidth;
    viewportHeight = innerHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(viewportWidth * dpr));
    canvas.height = Math.max(1, Math.round(viewportHeight * dpr));
    canvas.style.width = viewportWidth + 'px';
    canvas.style.height = viewportHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(state.active && !state.disintegrating) {
      const spot = chooseSpot(false, state.edge);
      if(!spot) { queueScan(); return; }
      state.edge = spot.edge;
      state.pos = {x:spot.x,y:spot.y};
      state.targetPos = {x:spot.x,y:spot.y};
      state.rootAlong = spot.edge === 'top' || spot.edge === 'bottom' ? spot.x : spot.y;
    }
    queueScan();
  }

  function visibleRect(element) {
    if(!element?.isConnected) return null;
    if(element.checkVisibility && !element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return null;
    const style = getComputedStyle(element);
    if(style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
    const rect = element.getBoundingClientRect();
    if(rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.right < 0 || rect.top > viewportHeight || rect.left > viewportWidth) return null;
    return rect;
  }

  function rangeRect(range) {
    const rects = Array.from(range?.getClientRects?.() || []);
    const parent = range?.startContainer.parentElement;
    if(!visibleRect(parent)) return null;
    return rects.find(rect => {
      if(rect.width <= 1 || rect.height <= 1 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewportHeight || rect.left >= viewportWidth) return false;
      // Hit testing also rejects clipped text and text covered by a dialog.
      const y = clamp(rect.top + rect.height / 2, 1, viewportHeight - 1);
      return [.2,.5,.8].some(t => {
        const x = clamp(rect.left + rect.width * t, 1, viewportWidth - 1);
        const top = document.elementFromPoint(x,y);
        return top && (top === parent || parent.contains(top));
      });
    }) || null;
  }

  function findVisibleWord(word) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if(!parent || parent.closest('.overseer-host,script,style,noscript,template,iframe')) return NodeFilter.FILTER_REJECT;
        return node.data.toLocaleLowerCase('ru').includes(word.toLocaleLowerCase('ru')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    const needle = word.toLocaleLowerCase('ru');
    while((node = walker.nextNode())) {
      if(!visibleRect(node.parentElement)) continue;
      const text = node.data.toLocaleLowerCase('ru');
      for(let index = text.indexOf(needle); index >= 0; index = text.indexOf(needle,index+needle.length)) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + word.length);
        if(rangeRect(range)) return range;
      }
    }
    return null;
  }

  function scanForGribanov() {
    scanQueued = false;
    const range = findVisibleWord('Грибанов');
    state.dangerRange = range;
    state.dangerRect = rangeRect(range);
    state.gribanovVisible = !!state.dangerRect;
    if(state.gribanovVisible && !state.active && !state.suppressedUntilReload && Date.now() >= state.cooldownUntil) show('danger');
    else if(state.active && !state.disintegrating) {
      state.reason = state.gribanovVisible ? 'danger' : musicMode();
      host.setAttribute('data-reason',state.reason);
    }
    drawSoon();
  }

  function queueScan() {
    if(scanQueued) return;
    scanQueued = true;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanForGribanov, CONFIG.scanInterval);
  }

  const PDF_SELECTOR='iframe[src*="pdfjs/"],iframe.pdf-fullscreen-frame,object[type="application/pdf"],embed[type="application/pdf"]';
  const pdfRects=()=>Array.from(document.querySelectorAll(PDF_SELECTOR),visibleRect).filter(Boolean);
  const pdfFullscreenOpen=()=>document.body.classList.contains('pdf-open');
  function clearOfPdf(point, rects=pdfRects()) {
    const margin=CONFIG.bodySize*1.5;
    return rects.every(rect=>point.x+margin<=rect.left || point.x-margin>=rect.right ||
      point.y+margin<=rect.top || point.y-margin>=rect.bottom);
  }

  function edgeIntervals(edge, depth, alongMargin, rects) {
    const horizontal=edge==='top'||edge==='bottom';
    const normal=edge==='top'||edge==='left'?depth:(horizontal?viewportHeight:viewportWidth)-depth;
    const limit=horizontal?viewportWidth:viewportHeight;
    const margin=CONFIG.bodySize*1.5;
    let intervals=[[Math.min(alongMargin,limit/2),Math.max(limit/2,limit-alongMargin)]];
    for(const rect of rects) {
      if(normal+margin<=(horizontal?rect.top:rect.left) || normal-margin>=(horizontal?rect.bottom:rect.right)) continue;
      const low=(horizontal?rect.left:rect.top)-margin, high=(horizontal?rect.right:rect.bottom)+margin;
      intervals=intervals.flatMap(([a,b])=>b<=low||a>=high?[[a,b]]:
        [...(a<low?[[a,low]]:[]),...(b>high?[[high,b]]:[])]);
    }
    return intervals;
  }

  function syncPdfFullscreen() {
    const paused=pdfFullscreenOpen();
    if(paused===pdfPaused) return;
    pdfPaused=paused;
    if(paused) {
      if(state.active && !state.disintegrating) {
        activeRemaining=Math.max(0,activeDeadline-Date.now());
        clearTimeout(activeTimer);
        clearTimeout(teleportTimer);
        state.teleporting=false;
        state.musicApproach='idle';
        state.phase=1;state.phaseDirection=0;
        host.classList.remove('is-zipping');
      }
      if(frame) cancelAnimationFrame(frame);
      frame=0;
      ctx.clearRect(0,0,viewportWidth,viewportHeight);
      host.style.visibility='hidden';
    } else {
      host.style.visibility='';
      state.pointer.seen=false;
      if(state.active && !state.disintegrating) {
        activeDeadline=Date.now()+activeRemaining;
        activeTimer=setTimeout(()=>hide('timeout'),activeRemaining);
        drawSoon();
      }
    }
  }

  function chooseSpot(awayFromPointer = false, fixedEdge = '') {
    const depth = mobilePointer.matches ? 32 : 40;
    const alongMargin = mobilePointer.matches ? 88 : 118;
    // Choose the edge first: UI density must not make the same empty side win
    // every time. Top and bottom have four times the weight of either side.
    const rects=pdfRects();
    const available=new Map(['top','bottom','left','right'].map(edge=>[edge,edgeIntervals(edge,depth,alongMargin,rects)]));
    const edges=Array.from(available.keys()).filter(edge=>available.get(edge).length);
    if(!edges.length) return null;
    const lastSpot = state.recentSpots[0];
    const weights = edges.map(edge => (edge==='top'||edge==='bottom'?4:1) * (edge===lastSpot?.edge ? .45 : 1));
    let pick = random()*weights.reduce((sum,weight)=>sum+weight,0);
    const edge = (edges.includes(fixedEdge)?fixedEdge:'') || edges.find((_,index)=>(pick-=weights[index])<0) || 'bottom';
    const candidates = [];
    const avoid = [visibleRect(musicButton), state.dangerRect].filter(Boolean);
    for(let i = 0; i < 32; i++) {
      const horizontal = edge === 'top' || edge === 'bottom';
      const intervals=available.get(edge);
      let alongPick=random()*intervals.reduce((sum,[a,b])=>sum+b-a,0);
      const interval=intervals.find(([a,b])=>(alongPick-=b-a)<=0)||intervals[intervals.length-1];
      const along=lerp(interval[0],interval[1],random());
      const candidate = edge === 'top' ? {x:along,y:depth,edge}
        : edge === 'bottom' ? {x:along,y:viewportHeight-depth,edge}
        : edge === 'left' ? {x:depth,y:along,edge}
        : {x:viewportWidth-depth,y:along,edge};
      let score = random() * 45;
      if(state.pointer.seen) score += Math.min(260, distance(candidate, state.pointer));
      for(const rect of avoid) {
        const center = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
        score += Math.min(180, distance(candidate, center)) * .42;
      }
      const tangent=edge==='top'||edge==='bottom'?{x:1,y:0}:{x:0,y:1};
      const inward=edge==='top'?{x:0,y:1}:edge==='bottom'?{x:0,y:-1}:edge==='left'?{x:1,y:0}:{x:-1,y:0};
      const probes=[candidate,
        {x:candidate.x+tangent.x*19,y:candidate.y+tangent.y*19},
        {x:candidate.x-tangent.x*19,y:candidate.y-tangent.y*19},
        {x:candidate.x+tangent.x*58,y:candidate.y+tangent.y*58},
        {x:candidate.x-tangent.x*58,y:candidate.y-tangent.y*58},
        {x:candidate.x+inward.x*17,y:candidate.y+inward.y*17}];
      for(const probe of probes) {
        const stack=document.elementsFromPoint(probe.x,probe.y);
        if(stack.some(element=>element.matches?.('button,a,input,select,.file-row,.course-card,.tab,.subject-btn,.nav-btn'))) score-=280;
        if(stack.some(element=>element.childElementCount===0&&element.textContent?.trim())) score-=135;
        if(stack.some(element=>element.matches?.('img,iframe,canvas'))) score-=70;
      }
      if(awayFromPointer && state.pointer.seen && distance(candidate, state.pointer) < CONFIG.bodySize * 5) score -= 400;
      for(const [index,spot] of state.recentSpots.entries()) {
        const previous={x:spot.x*viewportWidth,y:spot.y*viewportHeight};
        const proximity=clamp(1-distance(candidate,previous)/220,0,1);
        score-=1800*Math.pow(.72,index)*proximity*proximity;
      }
      candidates.push({...candidate,score});
    }
    const minTravel=Math.min(180,Math.min(viewportWidth,viewportHeight)*.3);
    const fresh = lastSpot && !fixedEdge ? candidates.filter(candidate =>
      distance(candidate,{x:lastSpot.x*viewportWidth,y:lastSpot.y*viewportHeight})>minTravel) : candidates;
    const pool=fresh.length?fresh:candidates;
    const bestScore=Math.max(...pool.map(candidate=>candidate.score));
    // Sample among usable positions instead of always taking one winning point.
    const chances=pool.map(candidate=>Math.exp((candidate.score-bestScore)/160));
    let positionPick=random()*chances.reduce((sum,chance)=>sum+chance,0);
    return pool.find((_,index)=>(positionPick-=chances[index])<0) || pool[pool.length-1];
  }

  function rememberSpot(spot) {
    state.recentSpots.unshift({x:spot.x/viewportWidth,y:spot.y/viewportHeight,edge:spot.edge});
    state.recentSpots.length=Math.min(state.recentSpots.length,6);
  }

  function spotNearMusic() {
    const rect=visibleRect(musicButton);
    if(!rect) return chooseSpot(true);
    const center={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const depth=mobilePointer.matches?32:40;
    const minDistance=CONFIG.bodySize*3,maxDistance=CONFIG.bodySize*4.5;
    const edgeData=['top','bottom','left','right'].map(edge=>{
      const horizontal=edge==='top'||edge==='bottom';
      const normal=edge==='top'||edge==='left'?depth:(horizontal?viewportHeight:viewportWidth)-depth;
      return {edge,horizontal,normal,distance:Math.abs(normal-(horizontal?center.y:center.x))};
    }).sort((a,b)=>a.distance-b.distance).slice(0,2);
    const candidates=[];
    // Sample intervals between the minimum and maximum radii on the two nearby edges.
    for(const data of edgeData) {
      for(let sample=0;sample<16;sample++) {
        const radius=lerp(Math.max(minDistance,data.distance),Math.max(maxDistance,data.distance),random());
        const offset=Math.sqrt(Math.max(0,radius*radius-data.distance*data.distance));
        for(const direction of [-1,1]) {
          const along=(data.horizontal?center.x:center.y)+direction*offset;
          if(along<depth+20 || along>(data.horizontal?viewportWidth:viewportHeight)-depth-20) continue;
          const point=data.horizontal?{x:along,y:data.normal,edge:data.edge}:{x:data.normal,y:along,edge:data.edge};
          if(distance(point,center)<minDistance || !clearOfPdf(point)) continue;
          // The proximity zone can include an arrival point: don't land beside
          // the cursor and immediately cancel the projection with an escape.
          if(state.pointer.seen && distance(point,state.pointer)<CONFIG.bodySize*1.75) continue;
          const occupied=[[0,0],[-20,0],[20,0],[0,-20],[0,20]].some(([dx,dy])=>
            document.elementsFromPoint(point.x+dx,point.y+dy).some(element=>element.matches?.('button,a,input,select')));
          const previous=state.recentSpots[0];
          const repeated=previous && distance(point,{x:previous.x*viewportWidth,y:previous.y*viewportHeight})<25;
          candidates.push({...point,weight:(occupied?.12:1)*(repeated?.25:1)});
        }
      }
    }
    let pick=random()*candidates.reduce((sum,point)=>sum+point.weight,0);
    return candidates.find(point=>(pick-=point.weight)<0) || chooseSpot(true);
  }

  function setAttentionSoon() {
    clearTimeout(attentionTimer);
    if(!state.active) return;
    attentionTimer = setTimeout(() => {
      chooseAttention();
      setAttentionSoon();
    }, reduceMotion.matches ? 12000 : 3200 + random() * 6200);
  }

  function chooseAttention() {
    const candidates = Array.from(document.querySelectorAll('button,a,.file-row,.course-card,.search-result-title,.preview-title,.hero h1,.panel-title,h1,h2,h3,p'))
      .filter(element => !element.closest('.overseer-host') && visibleRect(element));
    state.attention = candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
    state.previousAttentionCenter = null;
  }

  function show(reason = 'ambient') {
    if(state.active || pdfFullscreenOpen() || state.suppressedUntilReload || Date.now() < state.cooldownUntil) return false;
    const spot = chooseSpot(true);
    if(!spot) return false;
    clearSchedule();
    loadImages();
    state.active = true;
    state.teleporting = false;
    state.gazeAngle = null;
    state.feelers = [];
    state.projecting = false;
    state.projectionKind = '';
    state.projectionStage = 'idle';
    state.projectionElapsed = 0;
    state.projectionDwell = 0;
    state.projectionBuild = 0;
    state.crownOpen = 1;
    state.musicApproach = state.musicHovered ? 'pending' : 'idle';
    state.haloAmount = 0;
    state.reason = reason;
    state.disintegrating = false;
    state.sparks = [];
    state.activeSince = Date.now();
    state.ambientStage = 0;
    rememberSpot(spot);
    state.edge = spot.edge;
    state.targetPos = {x:spot.x,y:spot.y};
    state.pos = {...state.targetPos};
    state.rootAlong = spot.edge === 'top' || spot.edge === 'bottom' ? spot.x : spot.y;
    state.velocity = {x: 0, y: 0};
    state.phase = 0;
    state.phaseDirection = 1;
    state.tailCurl = randomCurl();
    state.renderedTailCurl = state.tailCurl;
    state.holoSeed = random() * 1000;
    state.nextWanderAt = performance.now() + 1800 + random() * 3200;
    host.classList.add('is-active');
    host.setAttribute('data-reason', reason);
    chooseAttention();
    setAttentionSoon();
    clearTimeout(activeTimer);
    activeRemaining=mobilePointer.matches ? CONFIG.mobileActiveMax : CONFIG.activeMax;
    activeDeadline=Date.now()+activeRemaining;
    activeTimer = setTimeout(() => hide('timeout'), activeRemaining);
    drawSoon();
    return true;
  }

  function hide(reason = 'manual') {
    if(!state.active) return false;
    state.musicApproach = 'idle';
    state.active = false;
    state.teleporting = false;
    state.reason = '';
    state.disintegrating = false;
    state.sparks = [];
    state.phaseDirection = -1;
    state.cooldownUntil = Date.now() + CONFIG.cooldown;
    state.ambientStage = 0;
    state.attention = null;
    clearTimeout(activeTimer);
    clearTimeout(attentionTimer);
    clearTimeout(teleportTimer);
    activeTimer = attentionTimer = teleportTimer = 0;
    host.classList.remove('is-active', 'is-zipping');
    host.removeAttribute('data-reason');
    if(frame) cancelAnimationFrame(frame);
    frame = 0;
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    planNextEncounter();
    return true;
  }

  function disintegrate() {
    if(!state.active || pdfPaused || state.disintegrating || !mobilePointer.matches) return false;
    clearSchedule();
    clearTimeout(activeTimer);
    clearTimeout(attentionTimer);
    clearTimeout(teleportTimer);
    state.suppressedUntilReload = true;
    state.disintegrating = true;
    state.teleporting = false;
    state.reason = 'shattered';
    state.sparks = Array.from({length: reduceMotion.matches ? 24 : 46}, (_, index) => {
      const angle = random() * Math.PI * 2;
      const speed = 1.8 + random() * 6.2;
      return {
        x: state.pos.x + (random() - .5) * 12,
        y: state.pos.y + (random() - .5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        life: .58 + random() * .42,
        size: .8 + random() * 2.4,
        pale: index % 4 === 0
      };
    });
    host.classList.remove('is-zipping');
    host.setAttribute('data-reason', 'shattered');
    activeTimer = setTimeout(() => {
      state.active = false;
      state.disintegrating = false;
      state.sparks = [];
      state.attention = null;
      host.classList.remove('is-active', 'is-zipping');
      host.removeAttribute('data-reason');
      if(frame) cancelAnimationFrame(frame);
      frame = 0;
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    }, 900);
    drawSoon();
    return true;
  }

  function teleport(destination = '') {
    if(!state.active || pdfPaused || state.disintegrating || state.teleporting) return false;
    state.teleporting = true;
    const towardMusic=destination==='music';
    const fleeing=destination==='escape';
    state.retractDuration=fleeing?105:280;
    state.musicApproach=towardMusic?'moving':'idle';
    state.phaseDirection = -1;
    host.classList.add('is-zipping');
    clearTimeout(teleportTimer);
    teleportTimer = setTimeout(() => {
      const spot = towardMusic ? spotNearMusic() : chooseSpot(true);
      if(!spot) {
        state.teleporting=false;state.phase=1;state.phaseDirection=0;state.musicApproach='idle';
        host.classList.remove('is-zipping');
        return;
      }
      rememberSpot(spot);
      state.edge = spot.edge;
      state.pos = {x:spot.x,y:spot.y};
      state.rootAlong = spot.edge === 'top' || spot.edge === 'bottom' ? spot.x : spot.y;
      state.targetPos = {x:spot.x,y:spot.y};
      state.velocity = {x: 0, y: 0};
      state.tailCurl = randomCurl();
      state.renderedTailCurl = state.tailCurl;
      state.gazeAngle = null;
      state.feelers = [];
      state.nextWanderAt = performance.now() + 6000 + random() * 11000;
      state.phase = 0;
      state.phaseDirection = 1;
      teleportTimer = setTimeout(() => {
        state.teleporting = false;
        if(towardMusic && state.musicHovered) {
          state.musicApproach='arrived';
          state.musicReadyAt=performance.now()+180;
        }
        host.classList.remove('is-zipping');
      }, 210);
    }, fleeing?115:290);
    return true;
  }

  function musicChanged() {
    if(state.active) {
      state.reason = state.gribanovVisible ? 'danger' : musicMode();
      host.setAttribute('data-reason',state.reason);
      drawSoon();
      return;
    }
    planNextEncounter();
  }

  function tinted(image, color) {
    if(!image?.complete || !image.naturalWidth) return null;
    const key = image.src + color;
    if(tintCache.has(key)) return tintCache.get(key);
    const out = document.createElement('canvas');
    out.width = image.naturalWidth;
    out.height = image.naturalHeight;
    const paint = out.getContext('2d');
    paint.drawImage(image, 0, 0);
    paint.globalCompositeOperation = 'source-in';
    paint.fillStyle = color;
    paint.fillRect(0, 0, out.width, out.height);
    tintCache.set(key, out);
    return out;
  }

  function drawTinted(image, x, y, width, height, color, alpha = 1) {
    const source = tinted(image, color);
    if(!source) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(source, x, y, width, height);
    ctx.restore();
    return true;
  }

  function hash(value) {
    const result = Math.sin(value * 12.9898 + state.holoSeed * 4.1414) * 43758.5453;
    return result - Math.floor(result);
  }

  function hologramLayout(rect, placement = 'auto', gap = 48) {
    const target={x:clamp(rect.left+rect.width/2,12,viewportWidth-12),y:clamp(rect.top+rect.height/2,12,viewportHeight-12)};
    // Project next to the actual target so the warning has an unambiguous subject.
    const above=placement!=='below' && rect.top>65;
    const symbol={x:clamp(target.x,22,viewportWidth-22),
      y:clamp(above?rect.top-gap:rect.bottom+gap,24,viewportHeight-24)};
    const angle=Math.atan2(target.y-symbol.y,target.x-symbol.x);
    const arrowDistance=Math.min(28,gap-12);
    const arrow={x:symbol.x+Math.cos(angle)*arrowDistance,y:symbol.y+Math.sin(angle)*arrowDistance};
    return {target,symbol,arrow,aim:angle+Math.PI/2};
  }

  function projectionLayout(kind, rect) {
    return hologramLayout(rect,kind==='danger'?'below':'auto',kind==='pebbles'?32:48);
  }

  function drawProjection(layout,color) {
    ctx.save();
    ctx.strokeStyle=color;ctx.lineWidth=.6;ctx.globalAlpha=state.phase*state.projectionBuild*.1;
    ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(state.pos.x,state.pos.y);
    ctx.lineTo(layout.symbol.x,layout.symbol.y);ctx.stroke();
    ctx.restore();
  }

  function drawHologramSprite(image, center, width, height, color, time, seed, rotation = 0) {
    const source = tinted(image,color);
    if(!source) return false;
    const tick = Math.floor(time/(reduceMotion.matches ? 3000 : 55))+seed*17;
    if(hash(tick)<.012) return true;
    // Interference briefly displaces the projection, then restores its anchor.
    const burstTick=Math.floor(time/650)+seed*29;
    const burst=reduceMotion.matches?0:(hash(burstTick)<.38?Math.max(0,1-(time%650)/220):0);
    const motion=reduceMotion.matches?0:1;
    const jitterX=motion*(hash(tick+2)-.5)*2.8+(hash(burstTick+3)-.5)*14*burst;
    const jitterY=motion*(hash(tick+7)-.5)*1.8+(hash(burstTick+8)-.5)*8*burst;
    const shear=(hash(tick+11)-.5)*.015;
    const flicker=.65+hash(tick+19)*.30;
    ctx.save();
    ctx.translate(center.x+jitterX*HOLOGRAM_SCALE,center.y+jitterY*HOLOGRAM_SCALE);
    ctx.scale(HOLOGRAM_SCALE,HOLOGRAM_SCALE);
    ctx.rotate(rotation+Math.sin(time*.0014+seed)*.006);
    ctx.transform(1,shear,-shear*.45,1,0,0);
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=flicker*state.phase*state.projectionBuild;
    ctx.beginPath();ctx.rect(-width/2-5,height/2-height*state.projectionBuild,width+10,height*state.projectionBuild);ctx.clip();
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(source,-width/2,-height/2,width,height);
    for(let slice=0;slice<(reduceMotion.matches?0:hash(tick+90)<.65?3:1);slice++) {
      const sliceY=-height/2+hash(tick+30+slice)*height;
      const sliceH=1+hash(tick+40+slice)*3.5;
      const shift=(hash(tick+50+slice)-.5)*(5+burst*12);
      ctx.save();
      ctx.beginPath();ctx.rect(-width/2-5,sliceY,width+10,sliceH);ctx.clip();
      ctx.globalAlpha=(.38+hash(tick+60+slice)*.25)*state.projectionBuild;
      ctx.drawImage(source,-width/2+shift,-height/2,width,height);
      ctx.restore();
    }
    ctx.fillStyle=color;
    for(let line=0;line<8;line++) {
      ctx.globalAlpha=(.08+hash(tick+100+line)*.2)*state.phase*state.projectionBuild;
      ctx.fillRect(-width/2+hash(tick+120+line)*width,
        -height/2+hash(tick+140+line)*height,1+hash(tick+160+line)*5,.65);
    }
    ctx.strokeStyle=color;
    ctx.globalAlpha=(.22+hash(tick+70)*.28)*state.projectionBuild;
    ctx.lineWidth=.7;
    ctx.beginPath();
    ctx.moveTo(-width*.7,(hash(tick+74)-.5)*height);
    ctx.lineTo(-width*.52,(hash(tick+75)-.5)*height);
    ctx.moveTo(width*.52,(hash(tick+76)-.5)*height);
    ctx.lineTo(width*.72,(hash(tick+77)-.5)*height);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  function requestedMusicHologram() {
    if(!state.active || state.disintegrating || state.gribanovVisible || !visibleRect(musicButton)) return '';
    if(state.musicApproach==='arrived' && !state.teleporting && state.phase>=.98 && performance.now()>=state.musicReadyAt &&
      musicAudio?.paused && state.musicHovered) return 'pebbles';
    return musicMode() === 'glitch' ? 'stop' : '';
  }

  function musicHologram() {
    const kind=requestedMusicHologram();
    return state.focus==='music' && state.projectionBuild>0 && state.projectionKind===kind ? kind : '';
  }

  function updateProjection(desired, delta) {
    if(desired && (state.projectionKind!==desired || state.projectionStage==='closing' || state.projectionStage==='idle')) {
      state.projectionKind=desired;
      state.projectionStage='opening';
      state.projectionElapsed=0;
      state.projectionDwell=0;
      state.projectionDwellLimit=8000+random()*6000;
      state.projectionBuild=0;
    } else if(!desired && state.projectionStage!=='closing' && state.projectionStage!=='idle') {
      state.projectionStage='closing';
      state.projectionElapsed=0;
      state.projectionDwell=0;
      state.projectionBuild=0;
    }
    state.projectionElapsed+=delta;
    const stage=state.projectionStage;
    if(stage==='projecting') state.projectionDwell+=delta;
    if(stage==='opening' || stage==='projecting') {
      state.haloAmount=lerp(state.haloAmount,1,1-Math.exp(-delta/110));
      state.crownOpen=lerp(state.crownOpen,state.projectionElapsed<120?1:0,1-Math.exp(-delta/160));
      if(stage==='opening' && state.projectionElapsed>=480) state.projectionStage='projecting';
      if(state.projectionStage==='projecting') state.projectionBuild=clamp(state.projectionBuild+delta/360,0,1);
    } else if(stage==='closing') {
      state.crownOpen=lerp(state.crownOpen,1,1-Math.exp(-delta/180));
      if(state.projectionElapsed>550) state.haloAmount=lerp(state.haloAmount,0,1-Math.exp(-delta/190));
      if(state.projectionElapsed>1400) {
        state.projectionStage='idle';state.projectionKind='';state.haloAmount=0;
      }
    }
  }

  function drawGuidance(time) {
    const kind=musicHologram();
    if(!kind) return;
    const rect=visibleRect(musicButton);
    if(!rect) return;
    const layout=projectionLayout(kind,rect);
    const color=Math.floor(time/3200)%2===0?yellow:'#fffde7';
    drawProjection(layout,color);
    const sprite=kind==='pebbles'?images.guidance:images.stop;
    drawHologramSprite(sprite,layout.symbol,kind==='pebbles'?32:23,kind==='pebbles'?29:23,color,time,2);
    drawHologramSprite(images.arrow,layout.arrow,17,18,color,time,3,layout.aim);
    return !!sprite;
  }

  function drawDanger(time) {
    if(!state.gribanovVisible || state.focus!=='danger' || state.projectionKind!=='danger' || !state.projectionBuild) return;
    state.dangerRect=rangeRect(state.dangerRange);
    const rect=state.dangerRect;
    if(!rect) return;
    const layout=projectionLayout('danger',rect);
    const color=reduceMotion.matches?yellow:hash(Math.floor(time/180))>.46?yellow:'#ff3b2f';
    drawProjection(layout,color);
    drawHologramSprite(images.danger,layout.symbol,25,34,color,time,7);
    drawHologramSprite(images.arrow,layout.arrow,17,18,color,time,11,layout.aim);
    return !!images.danger;
  }

  function drawSparks(delta) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for(const spark of state.sparks) {
      spark.x += spark.vx * delta / 16.67;
      spark.y += spark.vy * delta / 16.67;
      spark.vx *= Math.pow(.975, delta / 16.67);
      spark.vy += .16 * delta / 16.67;
      spark.life = Math.max(0, spark.life - delta / 900);
      if(!spark.life) continue;
      ctx.globalAlpha = Math.min(1, spark.life * 1.7);
      ctx.fillStyle = spark.pale ? paleYellow : yellow;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * (.45 + spark.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = spark.pale ? paleYellow : yellow;
      ctx.lineWidth = Math.max(.6, spark.size * .45);
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * 2.4, spark.y - spark.vy * 2.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function bezier(a, b, c, d, t) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*a.x + 3*mt*mt*t*b.x + 3*mt*t*t*c.x + t*t*t*d.x,
      y: mt*mt*mt*a.y + 3*mt*mt*t*b.y + 3*mt*t*t*c.y + t*t*t*d.y
    };
  }

  function edgeFrame() {
    const along = state.rootAlong;
    if(state.edge === 'top') return {inward:{x:0,y:1},tangent:{x:1,y:0},root:{x:along,y:-2}};
    if(state.edge === 'bottom') return {inward:{x:0,y:-1},tangent:{x:1,y:0},root:{x:along,y:viewportHeight+2}};
    if(state.edge === 'left') return {inward:{x:1,y:0},tangent:{x:0,y:1},root:{x:-2,y:along}};
    return {inward:{x:-1,y:0},tangent:{x:0,y:1},root:{x:viewportWidth+2,y:along}};
  }

  function bodyGeometry(time) {
    const frame = edgeFrame();
    const extension = state.phase * state.phase * (3 - 2 * state.phase);
    const head = {x:lerp(frame.root.x,state.pos.x,extension),y:lerp(frame.root.y,state.pos.y,extension)};
    const angle = state.gazeAngle ?? 0;
    const scale = mobilePointer.matches ? .85 : 1;
    const bend = state.renderedTailCurl * 15 + Math.sin(time*.0018)*3;
    // A single tapering stem, with the head tangent following its gaze.
    const first = {x:head.x-Math.cos(angle)*18*extension,y:head.y-Math.sin(angle)*18*extension};
    const last = {x:frame.root.x+frame.inward.x*22+frame.tangent.x*bend,
      y:frame.root.y+frame.inward.y*22+frame.tangent.y*bend};
    const points = [], left = [], right = [];
    for(let i=0;i<=32;i++) points.push(bezier(head,first,last,frame.root,i/32));
    for(let i=0;i<points.length;i++) {
      const before=points[Math.max(0,i-1)],after=points[Math.min(32,i+1)];
      const angle=Math.atan2(after.y-before.y,after.x-before.x)+Math.PI/2;
      const radius=(.2+6.4*Math.pow(1-i/32,1.65))*scale*extension;
      left.push({x:points[i].x+Math.cos(angle)*radius,y:points[i].y+Math.sin(angle)*radius});
      right.push({x:points[i].x-Math.cos(angle)*radius,y:points[i].y-Math.sin(angle)*radius});
    }
    const path=new Path2D();
    path.moveTo(left[0].x,left[0].y);
    for(const point of left) path.lineTo(point.x,point.y);
    for(const point of right.reverse()) path.lineTo(point.x,point.y);
    path.closePath();
    const lengths=[0];
    for(let i=1;i<points.length;i++) lengths.push(lengths[i-1]+distance(points[i],points[i-1]));
    const anchors=[.30,.325,.35].map(fraction=>{
      const length=lengths[lengths.length-1]*fraction;
      const index=Math.max(1,lengths.findIndex(value=>value>=length));
      const before=points[index-1],after=points[index];
      const segment=Math.max(.001,lengths[index]-lengths[index-1]);
      const t=(length-lengths[index-1])/segment;
      return {x:lerp(before.x,after.x,t),y:lerp(before.y,after.y,t),nx:-(after.y-before.y)/segment,ny:(after.x-before.x)/segment};
    });
    return {frame,head,path,angle,anchors,scale:scale*extension};
  }

  function drawOverseer(time,delta) {
    const {frame,head,path,angle,anchors,scale}=bodyGeometry(time);
    if(scale<.01) return;
    ctx.save();
    ctx.globalAlpha=state.phase;
    ctx.lineCap='round';ctx.lineJoin='round';
    const glow=ctx.createRadialGradient(head.x,head.y,1,head.x,head.y,22);
    glow.addColorStop(0,'rgba(255,225,100,.25)');
    glow.addColorStop(1,'rgba(255,210,70,0)');
    ctx.fillStyle=glow;ctx.fillRect(head.x-22,head.y-22,44,44);
    ctx.save();ctx.translate(head.x,head.y);ctx.rotate(angle);ctx.scale(scale,scale);
    drawFeelers(time,anchors,head,angle,scale,true,delta);
    ctx.restore();
    const gradient=ctx.createLinearGradient(head.x,head.y,frame.root.x,frame.root.y);
    gradient.addColorStop(0,'#fff3a0');gradient.addColorStop(.22,'#e9c443');
    gradient.addColorStop(.7,'#9a7e2a');gradient.addColorStop(1,'rgba(113,91,36,.1)');
    ctx.fillStyle=gradient;ctx.fill(path);
    ctx.strokeStyle='rgba(255,224,109,.55)';ctx.lineWidth=.65;ctx.stroke(path);
    ctx.save();ctx.clip(path);
    ctx.fillStyle='#fff8b5';
    for(let i=0;i<90;i++) {
      ctx.globalAlpha=state.phase*(.06+hash(i+Math.floor(time/140))*.24);
      ctx.fillRect(head.x+(hash(i*3)-.5)*64,head.y+(hash(i*3+1)-.5)*90,.7,1.2);
    }
    ctx.restore();

    ctx.translate(head.x,head.y);ctx.rotate(angle);ctx.scale(scale,scale);
    drawFeelers(time,anchors,head,angle,scale,false,delta);
    ctx.shadowColor='#ffe98c';ctx.shadowBlur=5;
    ctx.fillStyle='#e9cc5b';ctx.beginPath();ctx.ellipse(0,0,6.7,6,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#514555';ctx.beginPath();ctx.ellipse(1,0,4.5,4.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f7f3ff';ctx.beginPath();ctx.ellipse(2,0,2.9,3.7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9b9cff';ctx.fillRect(3,-1,1.3,2);
    if(state.haloAmount>.01) drawProjector(time);
    ctx.restore();
  }

  function relaxFeeler(index,targets,delta) {
    if(reduceMotion.matches || state.phase<.98 || !state.feelers[index]) {
      state.feelers[index]=targets.map(point=>({...point,vx:0,vy:0}));
      return targets;
    }
    const nodes=state.feelers[index];
    const lengths=targets.map((point,j)=>j?distance(point,targets[j-1]):0);
    const steps=Math.max(1,Math.ceil(delta/10)),dt=delta/1000/steps;
    for(let step=0;step<steps;step++) {
      for(let j=2;j<nodes.length;j++) {
        const node=nodes[j],t=j/(nodes.length-1);
        // Distal joints have less stiffness and retain more of the previous motion.
        const stiffness=lerp(420,100,t),damping=lerp(32,15,t);
        node.vx+=(targets[j].x-node.x)*stiffness*dt;
        node.vy+=(targets[j].y-node.y)*stiffness*dt;
        node.vx*=Math.exp(-damping*dt);node.vy*=Math.exp(-damping*dt);
        node.x+=node.vx*dt;node.y+=node.vy*dt;
      }
      // Preserve strand lengths while allowing the curve to bend between joints.
      for(let pass=0;pass<3;pass++) {
        for(let j=0;j<2;j++) Object.assign(nodes[j],targets[j],{vx:0,vy:0});
        for(let j=2;j<nodes.length;j++) {
          const prev=nodes[j-1],node=nodes[j];
          const dx=node.x-prev.x,dy=node.y-prev.y;
          const length=Math.max(.001,Math.hypot(dx,dy));
          const correction=(length-lengths[j])/length;
          const share=j===2?1:.75;
          node.x-=dx*correction*share;node.y-=dy*correction*share;
          if(j>2) {prev.x+=dx*correction*(1-share);prev.y+=dy*correction*(1-share);}
        }
      }
    }
    return nodes;
  }

  function drawFeelers(time,anchors,head,angle,scale,rear,delta) {
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const tangentEnd=Math.tan(.3*4.8)-.3*4.8;
    for(const i of (rear?[2]:[0,1])) {
      const anchor=anchors[i],dx=(anchor.x-head.x)/scale,dy=(anchor.y-head.y)/scale;
      const base={x:dx*cos+dy*sin,y:-dx*sin+dy*cos};
      const normal={x:anchor.nx*cos+anchor.ny*sin,y:-anchor.nx*sin+anchor.ny*cos};
      const side=i===1?1:-1;
      const wave=reduceMotion.matches?0:Math.sin(time*.0018+i*2)*.5;
      let points=[];
      const lengths=[0];
      for(let j=0;j<=32;j++) {
        const u=4.8*j/32;
        // Subtract the linear term so the base exits exactly at a right angle.
        const forward=(Math.tan(.3*u)-.3*u)/tangentEnd*(rear?38:30);
        const lateral=side*(2+u*((i===2?1.9:2.8)+wave*.12));
        const point=rear
          ? {x:base.x-3+normal.x*lateral*.35+forward*.85,y:base.y+2+normal.y*lateral*.35}
          : {x:base.x+normal.x*lateral+forward,y:base.y+normal.y*lateral};
        if(!reduceMotion.matches) {
          const t=j/32,envelope=t*t;
          point.x+=Math.sin(time*(.0029+i*.0003)-t*4+i*2)*envelope*1.7;
          point.y+=(Math.sin(time*(.004+i*.0004)-t*5+i*2)*3.8+
            Math.sin(time*.006+t*3+i)*1.1)*envelope*(rear?.7:1);
        }
        points.push(point);
      }
      // Simulate in screen coordinates so turning the head doesn't rotate the whole
      // strand rigidly. Convert back only for drawing in the head's local frame.
      const targets=points.map(point=>({x:head.x+(point.x*cos-point.y*sin)*scale,y:head.y+(point.x*sin+point.y*cos)*scale}));
      points=relaxFeeler(i,targets,delta).map(point=>{
        const dx=(point.x-head.x)/scale,dy=(point.y-head.y)/scale;
        return {x:dx*cos+dy*sin,y:-dx*sin+dy*cos};
      });
      for(let j=1;j<points.length;j++) lengths.push(lengths[j-1]+distance(points[j],points[j-1]));
      ctx.globalAlpha=state.phase*(rear?.68:1);
      ctx.lineWidth=rear?.75:.85;
      for(let j=1;j<points.length;j++) {
        const blue=clamp((lengths[j]/lengths[lengths.length-1]-.88)/.09,0,1);
        ctx.strokeStyle=`rgb(${Math.round(lerp(255,112,blue))},${Math.round(lerp(219,117,blue))},${Math.round(lerp(87,255,blue))})`;
        ctx.beginPath();ctx.moveTo(points[j-1].x,points[j-1].y);ctx.lineTo(points[j].x,points[j].y);ctx.stroke();
      }
    }
  }

  function drawProjector(time) {
    const spin=reduceMotion.matches?0:time*.00085;
    const yaw=.52+(reduceMotion.matches?0:Math.sin(time*.0007)*.12);
    const project=point=>{
      const x=point.x*Math.cos(yaw)+point.z*Math.sin(yaw);
      const z=-point.x*Math.sin(yaw)+point.z*Math.cos(yaw);
      const perspective=100/(100+z);
      return {x:x*perspective,y:point.y*perspective,z};
    };
    const faces=[];
    const addFace=vertices=>{
      const points=vertices.map(project);
      faces.push({points,depth:points.reduce((sum,point)=>sum+point.z,0)/points.length});
    };
    // A rotating conical crown: its bases sit in a plane ahead of the eye,
    // and its tips lean along the gaze in depth as the projection opens.
    for(let i=0;i<5;i++) {
      const angle=spin+i*Math.PI*2/5;
      addFace([
        {x:8,y:Math.cos(angle-.42)*12,z:Math.sin(angle-.42)*12},
        {x:8,y:Math.cos(angle+.42)*12,z:Math.sin(angle+.42)*12},
        {x:lerp(15.5,8,state.crownOpen),y:Math.cos(angle)*lerp(9,19.5,state.crownOpen),z:Math.sin(angle)*lerp(9,19.5,state.crownOpen)}
      ]);
    }
    faces.sort((a,b)=>b.depth-a.depth);
    ctx.save();
    ctx.lineWidth=.7;
    for(const face of faces) {
      const light=clamp(.7-face.depth*.025,.28,1);
      ctx.beginPath();ctx.moveTo(face.points[0].x,face.points[0].y);
      for(const point of face.points.slice(1)) ctx.lineTo(point.x,point.y);
      ctx.closePath();
      ctx.fillStyle=yellow;
      ctx.globalAlpha=state.phase*state.haloAmount*.025*light;
      ctx.fill();
      ctx.strokeStyle=yellow;
      ctx.globalAlpha=state.phase*state.haloAmount*light;
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateAttention() {
    const rect = visibleRect(state.attention);
    state.attentionRect = rect;
    if(!rect) return null;
    const center = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    if(state.previousAttentionCenter) {
      const moved = distance(center, state.previousAttentionCenter);
      state.interfaceMotion = clamp(state.interfaceMotion + moved * .018, 0, 1);
    }
    state.previousAttentionCenter = center;
    return center;
  }

  function updateMusicProximity() {
    const rect=visibleRect(musicButton), pointer=state.pointer;
    const near=!!rect && pointer.seen && !mobilePointer.matches &&
      Math.hypot(Math.max(rect.left-pointer.x,0,pointer.x-rect.right),
        Math.max(rect.top-pointer.y,0,pointer.y-rect.bottom))<=CONFIG.bodySize*4;
    if(near && (!state.musicHovered || state.musicApproach==='idle') && state.active && !state.disintegrating) state.musicApproach='pending';
    if(!near) state.musicApproach='idle';
    state.musicHovered=near;
  }

  function update(time, delta) {
    updateMusicProximity();
    if(state.disintegrating) return;
    if(state.musicApproach==='pending' && state.musicHovered && !state.teleporting && !state.gribanovVisible) teleport('music');
    if(state.phaseDirection) {
      state.phase = clamp(state.phase + state.phaseDirection * delta / (state.phaseDirection<0?state.retractDuration:280), 0, 1);
      if(state.phase === 0 || state.phase === 1) state.phaseDirection = 0;
    }
    state.interfaceMotion *= Math.pow(.91, delta / 16.67);
    const attentionCenter = updateAttention();
    const pointerDistance = state.pointer.seen && !mobilePointer.matches ? distance(state.pos, state.pointer) : Infinity;
    const followRadius = CONFIG.bodySize * 8;
    const musicKind=requestedMusicHologram();
    const atMusicButton=state.musicHovered;
    state.dangerRect=rangeRect(state.dangerRange);
    if(pointerDistance<followRadius && !(atMusicButton && !state.dangerRect)) {
      state.focus='cursor';state.lookAt={...state.pointer};
    } else if(state.gribanovVisible && state.dangerRect) {
      state.focus='danger';state.lookAt={x:state.dangerRect.left+state.dangerRect.width/2,y:state.dangerRect.top+state.dangerRect.height/2};
    } else if(musicKind || atMusicButton && state.musicApproach==='arrived') {
      state.focus='music';
      const rect=musicButton.getBoundingClientRect();state.lookAt={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    } else {
      state.focus='ambient';
      state.lookAt=attentionCenter || {x:viewportWidth*.5+Math.sin(time*.0008)*180,y:viewportHeight*.5+Math.cos(time*.0006)*120};
    }
    const desired=state.teleporting || state.phase<.98 ? '' : state.focus==='danger' ? 'danger' : state.focus==='music' ? musicKind : '';
    updateProjection(desired,delta);
    if(desired && state.projectionDwell>=state.projectionDwellLimit) {
      state.projectionDwell=0;
      teleport(state.focus==='music'?'music':'');
      updateProjection('',0);
    }
    if(desired) {
      const rect=desired==='danger'?state.dangerRect:visibleRect(musicButton);
      if(rect) state.lookAt=projectionLayout(desired,rect).symbol;
    }

    if(pointerDistance < CONFIG.bodySize * 1.25 && !state.teleporting) teleport('escape');
    if(!reduceMotion.matches && time > state.nextWanderAt && !state.teleporting && !desired && !(state.musicHovered && !state.gribanovVisible)) {
      if(random() < .35) teleport();
      else {
        // The root stays planted. Only the head leans and turns to inspect things.
        const horizontal = state.edge === 'top' || state.edge === 'bottom';
        const along = state.rootAlong + (random()-.5)*24;
        if(horizontal) state.targetPos.x = along;
        else state.targetPos.y = along;
        state.tailCurl = randomCurl();
        chooseAttention();
        state.nextWanderAt = time + 2200 + random()*6000;
      }
    }
    // Smooth the rendered orientation, not the target coordinates: interpolating
    // a target through the head could still flip the body by 180 degrees.
    const targetAngle = Math.atan2(state.lookAt.y-state.pos.y,state.lookAt.x-state.pos.x);
    if(state.gazeAngle === null) state.gazeAngle = targetAngle;
    const angleDelta = Math.atan2(Math.sin(targetAngle-state.gazeAngle),Math.cos(targetAngle-state.gazeAngle));
    const turn = angleDelta * (1-Math.exp(-delta/220));
    const maxTurn = delta*.0035;
    state.gazeAngle += clamp(turn,-maxTurn,maxTurn);
    state.renderedTailCurl = lerp(state.renderedTailCurl,state.tailCurl,1-Math.exp(-delta/320));
    if(reduceMotion.matches) return;
    const spring = .0022 * Math.min(delta, 34);
    state.velocity.x += (state.targetPos.x - state.pos.x) * spring;
    state.velocity.y += (state.targetPos.y - state.pos.y) * spring;
    const damping = Math.pow(.82, delta / 16.67);
    state.velocity.x *= damping;
    state.velocity.y *= damping;
    const jitter = state.interfaceMotion * 1.8;
    state.pos.x += state.velocity.x * delta / 16.67 + Math.sin(time*.031)*jitter;
    state.pos.y += state.velocity.y * delta / 16.67 + Math.cos(time*.027)*jitter;
    const depth = mobilePointer.matches ? 32 : 40;
    if(state.edge === 'left') state.pos.x = depth;
    else if(state.edge === 'right') state.pos.x = viewportWidth-depth;
    else if(state.edge === 'top') state.pos.y = depth;
    else state.pos.y = viewportHeight-depth;
    state.pos.x = clamp(state.pos.x, depth, viewportWidth-depth);
    state.pos.y = clamp(state.pos.y, depth, viewportHeight-depth);
  }

  function draw(time) {
    frame = 0;
    if(!state.active || pdfPaused) return;
    const rects=pdfRects();
    if(!clearOfPdf(state.pos,rects) || !clearOfPdf(state.targetPos,rects)) {
      const spot=chooseSpot(true);
      if(!spot) {
        ctx.clearRect(0,0,viewportWidth,viewportHeight);
        frame=requestAnimationFrame(draw);
        return;
      }
      state.edge=spot.edge;state.pos={x:spot.x,y:spot.y};state.targetPos={...state.pos};
      state.rootAlong=spot.edge==='top'||spot.edge==='bottom'?spot.x:spot.y;
      state.velocity={x:0,y:0};
      rememberSpot(spot);
    }
    const delta = lastFrameAt ? Math.min(50, time - lastFrameAt) : 16.67;
    lastFrameAt = time;
    update(time, delta);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    if(state.disintegrating) drawSparks(delta);
    else {
      state.projecting=!!(drawDanger(time) || drawGuidance(time));
      drawOverseer(time,delta);
    }
    // Embedded readers own their pointer events; keep the entire overlay off PDFs.
    for(const element of document.querySelectorAll(PDF_SELECTOR)) {
      const rect=visibleRect(element);
      if(rect) ctx.clearRect(rect.left,rect.top,rect.width,rect.height);
    }
    frame = requestAnimationFrame(draw);
  }

  function drawSoon() {
    if(state.active && !pdfPaused && !frame) {
      lastFrameAt = 0;
      frame = requestAnimationFrame(draw);
    }
  }

  function init() {
    if(document.getElementById('nsuOverseer')) return;
    host = document.createElement('div');
    host.id = 'nsuOverseer';
    host.className = 'overseer-host';
    host.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    canvas.className = 'overseer-canvas';
    host.append(canvas);
    document.body.append(host);
    ctx = canvas.getContext('2d', {alpha:true});
    musicAudio = document.getElementById('siteMusic');
    musicButton = document.getElementById('musicToggle');
    resizeCanvas();
    new MutationObserver(syncPdfFullscreen).observe(document.body,{attributes:true,attributeFilter:['class']});
    syncPdfFullscreen();

    addEventListener('resize', resizeCanvas, {passive:true});
    addEventListener('scroll', queueScan, {passive:true, capture:true});
    addEventListener('pointermove', event => {
      if(event.pointerType === 'touch') return;
      state.pointer = {x:event.clientX,y:event.clientY,seen:true};
      updateMusicProximity();
      // Nearness to the music button already requests a retreat and approach; don't
      // replace that request with a random escape before the next animation frame.
      const approachingMusic=state.musicHovered && state.musicApproach==='pending' && !state.gribanovVisible;
      if(state.active && !mobilePointer.matches && !approachingMusic && distance(state.pos,state.pointer)<CONFIG.bodySize*1.25) teleport('escape');
    }, {passive:true});
    addEventListener('pointerdown', event => {
      if(pdfPaused) return;
      state.pointer = {x:event.clientX,y:event.clientY,seen:true};
      if(state.active && distance(state.pos,state.pointer) < CONFIG.bodySize*(event.pointerType==='touch'?.58:1.25)) {
        if(event.pointerType === 'touch' && mobilePointer.matches) {
          if(event.cancelable) event.preventDefault();
          event.stopImmediatePropagation();
          disintegrate();
        }
        else teleport('escape');
      }
    }, {passive:false,capture:true});
    addEventListener('touchstart', event => {
      if(pdfPaused) return;
      const touch = event.changedTouches?.[0];
      if(!touch) return;
      state.pointer = {x:touch.clientX,y:touch.clientY,seen:true};
      if(state.active && distance(state.pos,state.pointer) < CONFIG.bodySize*.58) {
        if(event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
        disintegrate();
      }
    }, {passive:false,capture:true});
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden) queueScan();
    });
    for(const event of ['play','pause','ended','emptied']) musicAudio?.addEventListener(event, musicChanged);
    new MutationObserver(queueScan).observe(document.body, {childList:true,subtree:true,characterData:true});
    // CSS transitions, overflow and overlays can change visibility without changing text.
    setInterval(() => { if(!document.hidden) scanForGribanov(); }, Math.max(100,CONFIG.scanInterval));
    scanForGribanov();
    if(!state.active) planNextEncounter();
  }

  window.NSUOverseer = {
    show,
    hide,
    teleport,
    disintegrate,
    scan: scanForGribanov,
    chanceForStage,
    getState() {
      return {
        active: state.active,
        pdfPaused,
        reason: state.reason,
        mobile: mobilePointer.matches,
        disintegrating: state.disintegrating,
        suppressedUntilReload: state.suppressedUntilReload,
        cooldownUntil: state.cooldownUntil,
        ambientStage: state.ambientStage,
        scheduleMode: state.scheduleMode,
        scheduleChance: state.scheduleChance,
        scheduleWindowEnds: state.scheduleWindowEnds,
        gribanovVisible: state.gribanovVisible,
        musicHologram: musicHologram(),
        musicApproach: state.musicApproach,
        focus: state.focus,
        projectionStage: state.projectionStage,
        projectionBuild: state.projectionBuild,
        haloAmount: state.haloAmount,
        crownOpen: state.crownOpen,
        edge: state.edge,
        lookAt: {...state.lookAt},
        position: {...state.pos}
      };
    }
  };

  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

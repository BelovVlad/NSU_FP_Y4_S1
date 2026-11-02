// Living dot patches: the banner's dots (hero.js) in the corner of cards and along rows. All patches on a page
// show one field drawn in page coordinates, so the wave runs on from one card or row into the next.
// The wave, when patches show, the grid step and the speed are settings shared by every Hyle site: they live in
// localStorage under one origin (hyle.space), so a change on the hub reaches NSU, the Department and the Diploma,
// and open tabs follow it at once. Any page with [data-dots] controls gets them bound (the hub's settings).
// A patch animates only while it is "on" (hovered or focused, always for the chosen ones, or for every patch
// when the setting says so) and on screen; touch patches show only while pressed; reduced motion draws still frames.
// Usage: PwebDots.attach(selector, { anchor:'corner'|'right'|'bottom'|'progress', reach, maxReach, fadeEnd, mode:'hover'|'always',
//   alwaysWhen, gap, quiet }). quiet: selector of the text inside the element; dots under it are dimmed so it stays readable.
(() => {
  'use strict';
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // Keep touch holds inside the app instead of opening the browser's link/selection menu.
  // Document content remains selectable; this applies only to navigation and card controls.
  document.addEventListener('contextmenu', event => {
    if ((event.pointerType === 'touch' || matchMedia('(hover: none)').matches) &&
        event.target.closest?.('a,button,summary,[role="button"],.resource-card,.course-card,.knowledge-card,.file-row,.file')) {
      event.preventDefault();
    }
  });

  function rng(seed) {
    return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function valueNoise(random) {
    const size = 256, grid = new Float32Array(size * size).map(() => random()), smooth = t => t * t * (3 - 2 * t);
    const at = (i, j) => grid[(j & 255) * size + (i & 255)];
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j), a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function rgb(value, fallback) {
    const hex = value.trim().replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
  }
  // Seeded by the date, as the banner: every day has its own pattern, the same on every site.
  const today = new Date();
  const noise = valueNoise(rng(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()));
  const field = (x, y) => noise(x, y) * .65 + noise(x * 2.1 + 17, y * 2.1 + 3) * .35;
  const wave01 = v => v * .5 + .5;
  // Fixed pseudo-random values per dot (twinkling).
  const hash2 = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const cell = (x, y) => hash2(Math.round(x) * .1, Math.round(y) * .1);

  // The waves. at(x, y, t, pointer) → s: dot size 0..1; red; a: alpha factor; dx/dy: shift in px.
  // pointer: { x, y, on, gap } in the same coordinates as x and y; gap is the grid step.
  const WAVES = {
    drift: { name: 'Бегущая волна', at(x, y, t) {
      const n = field(x / 130 + t * .00004, y / 130), w = wave01(Math.sin(x * .017 + y * .06 + n * 5 - t * .0009));
      return { s: w * w, red: n > .73 };
    } },
    lens: { name: 'Линза', at(x, y, t, p) {
      const r = Math.hypot(x - p.x, y - p.y), L = p.on ? Math.exp(-((r / 80) ** 2)) : 0;
      const b = wave01(Math.sin(x * .02 + y * .03 - t * .0012)) * .3, k = r > 0 ? L * 9 / r : 0;
      return { s: b + (1 - b) * L, dx: (x - p.x) * k, dy: (y - p.y) * k, red: L > .65 && field(x / 40, y / 40) > .5 };
    } },
    membrane: { name: 'Мембрана', at(x, y, t) {
      const h = (u, v) => Math.sin(u * .03 - t * .002) + Math.sin(v * .045 + t * .0016) + Math.sin((u + v) * .02 - t * .0011);
      const z = h(x, y), gx = (h(x + 1, y) - h(x - 1, y)) / 2, gy = (h(x, y + 1) - h(x, y - 1)) / 2;
      return { s: .18 + .14 * (z + 3) / 6, dx: gx * 90, dy: gy * 90, a: .55 + .45 * (z + 3) / 6, red: z > 2.45 };
    } },
    twinkle: { name: 'Мерцание', at(x, y, t) {
      const h = cell(x, y), tw = wave01(Math.sin(t * .0011 * (.4 + h) + h * 40));
      return { s: .1 + .55 * tw ** 6, a: .45 + .55 * tw ** 3, red: h > .95 && tw > .85 };
    } },
  };
  const SHOW = { hover: 'При наведении', always: 'Всегда', off: 'Выключены' };

  // Shared settings.
  const KEY = 'hyle.dots.v1', DEFAULTS = { wave: 'drift', show: 'hover', gap: 13, speed: 1, transitions: true };
  const clamp = (v, lo, hi, d) => Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d;
  const normalize = raw => ({
    wave: raw.wave in WAVES || raw.wave === 'random' ? raw.wave : DEFAULTS.wave, show: raw.show in SHOW ? raw.show : DEFAULTS.show,
    gap: Math.round(clamp(raw.gap, 8, 18, DEFAULTS.gap)), speed: clamp(raw.speed, .25, 2, DEFAULTS.speed),
    transitions: typeof raw.transitions === 'boolean' ? raw.transitions : DEFAULTS.transitions });
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || '{}') || {}); } catch { return { ...DEFAULTS }; }
  }
  let settings = load();
  // «Случайная»: every tab picks one wave and keeps it while it moves between the sites.
  function waveName() {
    if (settings.wave !== 'random') return settings.wave;
    let name = null;
    try { name = sessionStorage.getItem('hyle.dots.random'); } catch {}
    if (!(name in WAVES)) {
      const names = Object.keys(WAVES); name = names[Math.floor(Math.random() * names.length)];
      try { sessionStorage.setItem('hyle.dots.random', name); } catch {}
    }
    return name;
  }
  const listeners = new Set();

  // One clock for every drawing; the speed setting changes its rate without a jump.
  let clockBase = 0, clockAt = performance.now();
  const clock = () => clockBase + (performance.now() - clockAt) * settings.speed;
  function apply(next) {
    clockBase = clock(); clockAt = performance.now();
    settings = next;
    for (const patch of patches) { patch.wake(); patch.draw(); }
    for (const fn of listeners) fn(settings);
    syncControls();
    start();
  }
  function save(change) {
    const next = normalize({ ...settings, ...change });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}   // without storage the change lasts for this page
    apply(next);
  }
  // Another tab or another Hyle site changed them.
  addEventListener('storage', event => { if (event.key === KEY) apply(load()); });

  // The pointer, for the lens, in page coordinates.
  const pointer = { x: 0, y: 0, on: false };
  addEventListener('pointermove', event => { pointer.x = event.pageX; pointer.y = event.pageY; pointer.on = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.on = false; });

  const patches = new Set();
  const seen = new WeakSet();
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) { const patch = entry.target.__dots; if (patch) { patch.visible = entry.isIntersecting; patch.wake(); } }
  });

  class Patch {
    constructor(el, options) {
      this.el = el; this.o = options; this.visible = false; this.hot = false; this.w = 0; this.h = 0;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'dots-canvas'; this.canvas.setAttribute('aria-hidden', 'true');
      el.prepend(this.canvas); el.__dots = this;
      this.ctx = this.canvas.getContext('2d');
      this.sizer = new ResizeObserver(() => this.resize()); this.sizer.observe(el); this.sizer.observe(this.canvas);
      visibility.observe(el);
      if (options.mode === 'hover') {
        let hovered = false, pressed = false;
        const update = () => {
          // Touch can leave a link focused after release; only keyboard focus keeps its patch on.
          this.hot = hovered || pressed || el.matches(':focus-visible') || !!el.querySelector(':focus-visible');
          el.classList.toggle('dots-hot', this.hot && settings.show !== 'off'); this.wake();
        };
        const release = () => { pressed = false; update(); };
        el.addEventListener('pointerenter', event => {
          if (event.pointerType !== 'touch') { hovered = true; update(); }
        });
        el.addEventListener('pointerleave', () => { hovered = false; release(); });
        el.addEventListener('pointerdown', event => {
          if (event.isPrimary && event.button === 0 && event.pointerType !== 'mouse') { pressed = true; update(); }
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, release);
        el.addEventListener('focusin', update);
        el.addEventListener('focusout', () => queueMicrotask(update));
      }
      patches.add(this);
      this.wake();
    }
    get pinned() {
      if (settings.show === 'off') return false;
      return this.o.mode === 'always' || settings.show === 'always' || !!(this.o.alwaysWhen && this.el.matches(this.o.alwaysWhen));
    }
    get on() { return settings.show !== 'off' && (this.pinned || this.hot); }
    get live() { return this.visible && this.on && !still.matches && document.visibilityState === 'visible'; }
    resize() {
      // The canvas may cover only part of its element (the foot of the sidebar), so it is measured itself.
      const ratio = Math.min(2, devicePixelRatio || 1), box = this.canvas.getBoundingClientRect();
      this.w = box.width; this.h = box.height;
      if (!this.w || !this.h) return;
      this.canvas.width = Math.round(this.w * ratio); this.canvas.height = Math.round(this.h * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.measureQuiet(box);
      // A fixed element (NSU's sidebar) stays on screen while the page scrolls: its field must not scroll either.
      this.pinnedToScreen = getComputedStyle(this.el).position === 'fixed';
      const style = getComputedStyle(this.el);
      this.cream = rgb(style.getPropertyValue('--cream'), '234,212,183');
      this.red = rgb(style.getPropertyValue('--accent'), '214,76,80');
      this.draw();
    }
    // Where the text is, measured on the text itself (a block element may be much wider than its words).
    measureQuiet(box = this.canvas.getBoundingClientRect()) {
      this.quiet = [];
      if (!this.o.quiet) return;
      const range = document.createRange();
      for (const node of this.el.querySelectorAll(this.o.quiet)) {
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) if (r.width && r.height)
          this.quiet.push([r.left - box.left - 8, r.top - box.top - 5, r.right - box.left + 8, r.bottom - box.top + 5]);
      }
    }
    wake() {
      // The class is touched only when it changes: it is watched for pinned rows (the chosen lecture).
      const pinned = this.pinned;
      if (this.el.classList.contains('dots-on') !== pinned) this.el.classList.toggle('dots-on', pinned);
      if (settings.show === 'off' && this.el.classList.contains('dots-hot')) this.el.classList.remove('dots-hot');
      start();
    }
    draw(time = clock()) {
      const { ctx, w, h, o } = this;
      if (!w || !h) return;
      const scale = settings.gap / 13, gap = (o.gap || 11) * scale, wave = WAVES[waveName()];
      // Page coordinates of the canvas: the field is one for the whole page.
      const box = this.canvas.getBoundingClientRect(), page = !this.pinnedToScreen;
      const ox = box.left + (page ? scrollX : 0), oy = box.top + (page ? scrollY : 0);
      // A corner patch reaches a share of the diagonal, a row band a share of the width, never further than maxReach px.
      pointer.gap = gap;
      const spread = Math.min(o.reach * (o.anchor === 'right' ? w : Math.hypot(w, h)), o.maxReach || Infinity);
      // A progress bar: dots stand under the filled part (the width of its first child).
      const filled = o.anchor === 'progress' ? (this.el.firstElementChild?.offsetWidth || 0) : 0;
      ctx.clearRect(0, 0, w, h);
      // Rows of a list share the grid of the page, so the dots line up from one row to the next.
      const x0 = gap / 2 - ((ox % gap) + gap) % gap, y0 = gap / 2 - ((oy % gap) + gap) % gap;
      for (let y = y0; y < h; y += gap) for (let x = x0; x < w; x += gap) {
        if (x < 0 || y < 0) continue;
        // How much of the patch reaches this point: a corner glow, a band along the right edge, or rising from the bottom.
        let f = o.anchor === 'bottom' ? (y / h - (1 - o.reach)) / o.reach
          : o.anchor === 'progress' ? (x < filled ? 1 : .12)
          : o.anchor === 'right' ? 1 - (w - x) / spread : 1 - Math.hypot(w - x, y) / spread;
        if (o.fadeEnd) f *= Math.min(1, (h - y) / o.fadeEnd);  // keeps the band clear of what sits at its very bottom
        if (f <= 0) continue;
        f = Math.min(1, f); f = f * f * (3 - 2 * f);
        for (const q of this.quiet) if (x > q[0] && x < q[2] && y > q[1] && y < q[3]) { f *= .2; break; }
        const d = wave.at(ox + x, oy + y, time, pointer), s = Math.max(0, Math.min(1, d.s));
        const radius = (.45 + 2.15 * s) * (.4 + .6 * f) * scale;
        const alpha = Math.min(.92, (.16 + .8 * Math.sqrt(s)) * f * (d.a ?? 1));
        ctx.fillStyle = `rgba(${d.red ? this.red : this.cream},${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x + (d.dx || 0), y + (d.dy || 0), radius, 0, Math.PI * 2); ctx.fill();
      }
    }
    drop() { this.sizer.disconnect(); visibility.unobserve(this.el); patches.delete(this); }
  }

  // About 30 frames a second on a timer rather than requestAnimationFrame: the dots need no frame sync, and other
  // animations on the page (NSU's Overseer) keep the animation frames to themselves.
  let running = false;
  function frame() {
    const time = clock();
    let any = false;
    for (const patch of patches) {
      if (!patch.el.isConnected) { patch.drop(); continue; }
      if (patch.live) { any = true; patch.draw(time); }
    }
    if (any) setTimeout(frame, 33); else running = false;
  }
  function start() { if (!running && !still.matches) { running = true; setTimeout(frame, 0); } }

  const rules = [];
  function scan(root) {
    for (const [selector, options] of rules) {
      const found = root.matches?.(selector) ? [root] : [];
      for (const el of [...found, ...(root.querySelectorAll?.(selector) || [])]) {
        if (seen.has(el)) continue;
        seen.add(el); new Patch(el, options);
      }
    }
    bindControls(root);
  }
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
      if (record.type === 'attributes') { const patch = record.target.__dots; if (patch) patch.wake(); }
    }
  }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  still.addEventListener('change', () => { for (const patch of patches) patch.draw(); start(); });
  // Web fonts move the text: measure it again once they are in.
  document.fonts?.ready.then(() => { for (const patch of patches) patch.measureQuiet(); });
  document.addEventListener('visibilitychange', start);

  // Settings controls: <select data-dots="wave|show">, <input type="range" data-dots="gap|speed">, <output data-dots-out="gap|speed">.
  const bound = new WeakSet();
  const shown = { gap: v => `${v} px`, speed: v => `${(+v).toFixed(2).replace(/\.?0+$/, '')}×` };
  function bindControls(root) {
    let added = false;
    for (const control of root.querySelectorAll?.('[data-dots]') || []) {
      if (bound.has(control)) continue;
      bound.add(control); added = true;
      const name = control.dataset.dots;
      if (control.tagName === 'SELECT' && !control.options.length) {
        const names = name === 'wave' ? { ...Object.fromEntries(Object.entries(WAVES).map(([k, v]) => [k, v.name])), random: 'Случайная' } : SHOW;
        for (const [value, label] of Object.entries(names)) control.add(new Option(label, value));
      }
      control.addEventListener(control.type === 'range' ? 'input' : 'change', () =>
        save({ [name]: control.type === 'checkbox' ? control.checked : control.type === 'range' ? +control.value : control.value }));
    }
    if (added) syncControls();
  }
  function syncControls() {
    for (const control of document.querySelectorAll('[data-dots]')) {
      const value = settings[control.dataset.dots];
      if (control.type === 'checkbox') control.checked = !!value;
      else if (String(control.value) !== String(value)) control.value = value;
    }
    for (const out of document.querySelectorAll('[data-dots-out]')) out.textContent = shown[out.dataset.dotsOut](settings[out.dataset.dotsOut]);
  }

  // One-shot dot animations. kind 'cover': dots of the page colour grow behind a wavy front until the page is hidden;
  // 'reveal': the same backwards; 'flash': a band of dots in the chosen wave runs across and fades. The front glows
  // cream (red where the wave is red). from: 'top', 'left', 'right' or 'point' (a ring from origin {x, y}, in host
  // coordinates — it may lie outside the host). fixed: over the whole window, else inside host.
  const smooth = v => v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
  function sweep(host, { kind = 'flash', from = 'top', origin = { x: 0, y: 0 }, duration = 600, fixed = false, done } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'dots-sweep'; canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: fixed ? 'fixed' : 'absolute', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: fixed ? '2147483000' : '5', borderRadius: 'inherit' });
    (fixed ? document.documentElement : host).append(canvas);
    const ctx = canvas.getContext('2d'), ratio = Math.min(2, devicePixelRatio || 1);
    const w = fixed ? innerWidth : host.clientWidth, h = fixed ? innerHeight : host.clientHeight;
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(fixed ? document.body || document.documentElement : host);
    const bg = rgb(style.getPropertyValue('--bg'), '8,13,18'), cream = rgb(style.getPropertyValue('--cream'), '234,212,183');
    const red = rgb(style.getPropertyValue('--accent'), '214,76,80');
    const ring = from === 'point', far = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([cx, cy]) => Math.hypot(cx - origin.x, cy - origin.y)));
    const gap = 15 * settings.gap / 13, wave = WAVES[waveName()], len = ring ? far : from === 'top' ? h : w, edge = Math.max(ring ? 60 : 90, len * .12);
    const began = performance.now(), probe = { x: -1e6, y: -1e6, on: false, gap };
    const draw = now => {
      const k = Math.min(1, (now - began) / duration), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const front = -edge * 1.6 + e * (len + edge * 3.2), t = clock();
      ctx.clearRect(0, 0, w, h);
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
        const along = ring ? Math.hypot(x - origin.x, y - origin.y) : from === 'top' ? y : from === 'left' ? x : w - x;
        const across = ring ? Math.atan2(y - origin.y, x - origin.x) * 60 : from === 'top' ? x : y;
        // How far the wavy front has gone past this dot.
        const passed = front + Math.sin(across * .011 + t * .002) * edge * .25 + (field(across / 110, 3.7) - .5) * edge * .5 - along;
        if (kind !== 'flash') {
          const cover = kind === 'cover' ? smooth(passed / edge) : 1 - smooth(passed / edge);
          if (cover > .01) { ctx.fillStyle = `rgb(${bg})`; ctx.beginPath(); ctx.arc(x, y, cover * gap * .76, 0, Math.PI * 2); ctx.fill(); }
        }
        const glow = Math.exp(-(((passed - edge * .5) / (edge * .38)) ** 2));
        if (glow < .04) continue;
        const d = wave.at(x, y, t, probe), s = Math.max(0, Math.min(1, d.s));
        ctx.fillStyle = `rgba(${d.red ? red : cream},${(glow * .9).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x + (d.dx || 0), y + (d.dy || 0), (.6 + 2.3 * s) * glow * gap / 13, 0, Math.PI * 2); ctx.fill();
      }
      if (k < 1) requestAnimationFrame(draw);
      else { if (kind !== 'cover') canvas.remove(); if (done) done(); }
    };
    draw(began);
    return canvas;
  }
  const animate = () => settings.transitions && settings.show !== 'off' && !still.matches;

  // Moving between the Hyle sites (hub, NSU, Department, Diploma — one origin): the page sinks under a wave of
  // dots from the top, and the next site comes up from under it. Only a plain click on a link that stays in the window.
  const ROOTS = ['NSU_FP_Y4_S1', 'Department', 'diploma'];
  const siteOf = url => { const first = decodeURIComponent(url.pathname.split('/')[1] || ''); return ROOTS.includes(first) ? first : ''; };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !animate()) return;
    const link = event.target.closest?.('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || siteOf(url) === siteOf(location)) return;
    event.preventDefault();
    try { sessionStorage.setItem('hyle.arrive', String(Date.now())); } catch {}
    sweep(null, { kind: 'cover', fixed: true, duration: 450, done: () => location.assign(url.href) });
  });
  // Arrival: the snippet in the page's <head> hid it (.dots-arrive) until this cover is up.
  let arrived = 0;
  try { arrived = +sessionStorage.getItem('hyle.arrive') || 0; sessionStorage.removeItem('hyle.arrive'); } catch {}
  if (Date.now() - arrived < 4000 && animate()) sweep(null, { kind: 'reveal', fixed: true, duration: 650 });
  document.documentElement.classList.remove('dots-arrive');
  // Back to a page kept in the browser's memory: it must not stay under the cover.
  addEventListener('pageshow', event => { if (event.persisted) for (const c of document.querySelectorAll('.dots-sweep')) c.remove(); });

  window.PwebDots = {
    attach(selector, options = {}) { rules.push([selector, { anchor:'corner', reach:.75, mode:'hover', ...options }]); scan(document.documentElement); },
    // For the hub's banner (hero.js): the same waves, settings and clock.
    get settings() { return settings; },
    wave: name => WAVES[name === 'random' ? waveName() : name] || WAVES.drift,
    sweep, animate,
    clock, save,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  bindControls(document);
})();

// NSU: subject and knowledge cards light up on hover; lecture rows carry a wide band along their right edge that runs on
// from row to row (dimmed under the text), the chosen lecture keeps its dots; the foot of the sidebar always has a slow
// field rising from the bottom; the "save everything" progress bar fills with dots.
PwebDots.attach('.course-card,.knowledge-card', { reach:.75, maxReach:220 });
PwebDots.attach('.file-row', { anchor:'right', reach:.85, maxReach:460, alwaysWhen:'.active', quiet:'.file-name,.file-desc,.file-side>*,.new-badge' });
PwebDots.attach('.sidebar', { anchor:'bottom', reach:1, fadeEnd:150, mode:'always', gap:12 });
PwebDots.attach('.app-manager-progress', { anchor:'progress', mode:'always', gap:6 });

// Living dot patches: the banner's dots (hero.js) in the corner of cards and rows. Each patch is a canvas
// drawn like the banner — dots swell along a travelling wave and red patches follow a noise field — with its own
// wave direction, frequency, speed and noise picked from the element's identity, so neighbours differ.
// A patch animates only while it is "on" (hovered or focused, or always for the chosen ones) and on screen;
// touch screens get one still frame, and reduced motion draws still frames only.
// Usage: PwebDots.attach(selector, { anchor:'corner'|'bottom', reach, maxReach, fadeEnd, mode:'hover'|'always', alwaysWhen, gap }).
(() => {
  'use strict';
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = matchMedia('(hover: hover)');

  function rng(seed) {
    return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function valueNoise(random) {
    const size = 64, grid = new Float32Array(size * size).map(() => random()), smooth = t => t * t * (3 - 2 * t);
    const at = (i, j) => grid[(j & 63) * size + (i & 63)];
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j), a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  const hash = text => { let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h; };
  const keyOf = el => el.dataset.id || el.dataset.path || el.dataset.entry || el.dataset.subject || el.getAttribute('href') || el.textContent.trim().slice(0, 80);
  function rgb(value, fallback) {
    const hex = value.trim().replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
  }

  const patches = new Set();
  const seen = new WeakSet();
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) { const patch = entry.target.__dots; if (patch) { patch.visible = entry.isIntersecting; patch.wake(); } }
  });

  class Patch {
    constructor(el, options) {
      this.el = el; this.o = options; this.visible = false; this.hot = false; this.w = 0; this.h = 0;
      const random = rng(hash(keyOf(el)));
      this.noise = valueNoise(random);
      this.angle = random() * Math.PI; this.freq = .05 + random() * .05; this.speed = (.0007 + random() * .0009) * (random() < .5 ? -1 : 1);
      this.offset = random() * 50; this.redLevel = .71 + random() * .06;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'dots-canvas'; this.canvas.setAttribute('aria-hidden', 'true');
      el.prepend(this.canvas); el.__dots = this;
      this.ctx = this.canvas.getContext('2d');
      this.sizer = new ResizeObserver(() => this.resize()); this.sizer.observe(el); this.sizer.observe(this.canvas);
      visibility.observe(el);
      if (options.mode === 'hover') {
        const on = () => { this.hot = true; el.classList.add('dots-hot'); this.wake(); };
        const off = () => { if (!el.matches(':focus-within')) { this.hot = false; el.classList.remove('dots-hot'); } };
        el.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' || canHover.matches) on(); });
        el.addEventListener('pointerleave', off); el.addEventListener('focusin', on); el.addEventListener('focusout', off);
      } else el.classList.add('dots-on');
      patches.add(this);
    }
    get on() { return this.o.mode === 'always' || this.hot || !!(this.o.alwaysWhen && this.el.matches(this.o.alwaysWhen)); }
    get live() { return this.visible && this.on && !still.matches && document.visibilityState === 'visible'; }
    resize() {
      // The canvas may cover only part of its element (the foot of the sidebar), so it is measured itself.
      const ratio = Math.min(2, devicePixelRatio || 1), box = this.canvas.getBoundingClientRect();
      this.w = box.width; this.h = box.height;
      if (!this.w || !this.h) return;
      this.canvas.width = Math.round(this.w * ratio); this.canvas.height = Math.round(this.h * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const style = getComputedStyle(this.el);
      this.cream = rgb(style.getPropertyValue('--cream'), '234,212,183');
      this.red = rgb(style.getPropertyValue('--accent'), '214,76,80');
      this.draw(performance.now());
    }
    wake() {
      // A hover patch can still be pinned on (the chosen lecture); the class is touched only when it changes.
      if (this.o.mode === 'hover') {
        const pinned = !!(this.o.alwaysWhen && this.el.matches(this.o.alwaysWhen));
        if (this.el.classList.contains('dots-on') !== pinned) this.el.classList.toggle('dots-on', pinned);
      }
      start();
    }
    draw(time) {
      const { ctx, w, h, o } = this, gap = o.gap || 11, ca = Math.cos(this.angle), sa = Math.sin(this.angle);
      // A corner patch reaches a share of the diagonal, but never further than maxReach px (long rows stay calm).
      const phase = time * this.speed, drift = time * .00003 + this.offset, spread = Math.min(o.reach * Math.hypot(w, h), o.maxReach || Infinity);
      ctx.clearRect(0, 0, w, h);
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
        // How much of the patch reaches this point: a corner glow or a band rising from the bottom.
        let f = o.anchor === 'bottom' ? (y / h - (1 - o.reach)) / o.reach : 1 - Math.hypot(w - x, y) / spread;
        if (o.fadeEnd) f *= Math.min(1, (h - y) / o.fadeEnd);  // keeps the band clear of what sits at its very bottom
        if (f <= 0) continue;
        f = Math.min(1, f); f = f * f * (3 - 2 * f);
        const n = this.noise(x / 70 + drift, y / 70 + this.offset);
        const wave = Math.sin((x * ca + y * sa) * this.freq + n * 4 - phase) * .5 + .5;
        const red = n > this.redLevel;
        const radius = (.45 + 2.15 * wave * wave) * (.4 + .6 * f);
        const alpha = Math.min(.92, (.16 + .8 * wave) * f);
        ctx.fillStyle = `rgba(${red ? this.red : this.cream},${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      }
    }
    drop() { this.sizer.disconnect(); visibility.unobserve(this.el); patches.delete(this); }
  }

  let running = false, last = -Infinity;
  function frame(time) {
    let any = false;
    for (const patch of patches) {
      if (!patch.el.isConnected) { patch.drop(); continue; }
      if (patch.live) { any = true; if (time - last >= 33) patch.draw(time); }
    }
    if (time - last >= 33) last = time;
    if (any) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (!running && !still.matches) { running = true; requestAnimationFrame(frame); } }

  const rules = [];
  function scan(root) {
    for (const [selector, options] of rules) {
      const found = root.matches?.(selector) ? [root] : [];
      for (const el of [...found, ...(root.querySelectorAll?.(selector) || [])]) {
        if (seen.has(el)) continue;
        seen.add(el); new Patch(el, options);
      }
    }
  }
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
      if (record.type === 'attributes') { const patch = record.target.__dots; if (patch) patch.wake(); }
    }
  }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  still.addEventListener('change', () => { for (const patch of patches) patch.draw(performance.now()); start(); });
  document.addEventListener('visibilitychange', start);

  window.PwebDots = { attach(selector, options = {}) { rules.push([selector, { anchor:'corner', reach:.75, mode:'hover', ...options }]); scan(document.documentElement); } };
})();

// NSU: subject and knowledge cards and lecture rows light up on hover, the chosen lecture keeps its dots,
// and the foot of the sidebar always has a slow field rising from the bottom.
PwebDots.attach('.course-card,.knowledge-card', { reach:.75, maxReach:220 });
PwebDots.attach('.file-row', { reach:.7, maxReach:165, alwaysWhen:'.active' });
PwebDots.attach('.sidebar', { anchor:'bottom', reach:1, fadeEnd:150, mode:'always', gap:12 });

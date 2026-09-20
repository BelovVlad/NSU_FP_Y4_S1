/* A small, procedural Overseer cameo. No images, layout shifts or hit targets. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 154;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'overseer-cameo';
  Object.assign(canvas.style, {
    position: 'fixed', width: '144px', height: '154px', zIndex: '4',
    pointerEvents: 'none', imageRendering: 'pixelated', display: 'none'
  });
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pointer = {x: -1000, y: -1000};
  let visit = null, frame = 0, nextAllowed = 0, trialTimer = 0;
  let gaze = {x: -0.6, y: 0.1};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = v => {v = clamp(v, 0, 1); return v * v * (3 - 2 * v)};

  function host() {
    if (document.hidden || document.body.classList.contains('pdf-open')) return null;
    const element = document.querySelector('.hero') || document.querySelector('.welcome');
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return r.bottom > 120 && r.top >= 0 && r.top < innerHeight - 130 ? element : null;
  }

  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    visit = null;
    canvas.style.display = 'none';
    ctx.clearRect(0, 0, 144, 154);
  }

  function place(element) {
    const r = element.getBoundingClientRect();
    const mobile = innerWidth <= 720;
    const scale = mobile ? 0.72 : 1;
    const width = 144 * scale;
    // Leave the hero's text and Five Pebbles clear, including on narrow screens.
    const text = element.querySelector('.hero-copy');
    const textRight = text ? text.getBoundingClientRect().right : r.left;
    const preferred = mobile ? r.right - width - 5 : r.right - Math.min(460, r.width * .29) - width / 2;
    const left = mobile ? preferred : Math.min(r.right - width - 12, Math.max(preferred, textRight + 16));
    canvas.style.left = Math.round(left) + 'px';
    canvas.style.top = Math.round(r.top + 1) + 'px';
    canvas.style.width = width + 'px';
    canvas.style.height = 154 * scale + 'px';
    return {left, top: r.top + 1, scale};
  }

  function line(points, color, width = 1, close = false) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function draw(time, extension, position) {
    ctx.clearRect(0, 0, 144, 154);
    const t = time / 1000;
    const sway = Math.sin(t * 1.8) * 3 + Math.sin(t * .7) * 2;
    const head = {x: 77 + sway, y: -12 + extension * (95 + Math.sin(t * 2.1) * 2)};
    const target = {
      x: clamp((pointer.x - position.left) / position.scale - head.x, -160, 160),
      y: clamp((pointer.y - position.top) / position.scale - head.y, -110, 110)
    };
    const hasPointer = pointer.x > 0;
    gaze.x += ((hasPointer ? target.x / 160 : -.55 + Math.sin(t * .8) * .3) - gaze.x) * .07;
    gaze.y += ((hasPointer ? target.y / 110 : .15 + Math.cos(t * .9) * .2) - gaze.y) * .07;
    const cyan = 'rgba(111,231,255,.90)', pale = 'rgba(206,251,255,.94)';
    ctx.globalAlpha = extension * (.95 + Math.sin(t * 17) * .035);

    // Thin, tapered stalk anchored above the edge, with a translucent membrane.
    ctx.beginPath();
    ctx.moveTo(96, -5);
    ctx.bezierCurveTo(92 + sway, head.y * .38, head.x + 23, head.y - 23, head.x + 3, head.y + 4);
    ctx.quadraticCurveTo(head.x - 10, head.y + 2, head.x - 9, head.y - 10);
    ctx.bezierCurveTo(head.x + 13, head.y - 27, 95, head.y * .34, 96, -5);
    ctx.fillStyle = 'rgba(86,204,241,.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(107,226,250,.62)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(96, 0);
    ctx.bezierCurveTo(94, head.y * .46, head.x + 8, head.y - 26, head.x, head.y);
    ctx.strokeStyle = cyan;
    ctx.stroke();

    // Four articulated feelers; their ends have the blue sparks of the reference.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const phase = t * 2.5 + i * 1.8;
      const root = [head.x + 4, head.y - 19 + Math.floor(i / 2) * 6];
      const elbow = [head.x + side * (15 + Math.sin(phase) * 4), head.y - 13 + Math.cos(phase) * 5];
      const tip = [head.x + side * (19 + Math.sin(phase + .8) * 5), head.y + 2 + Math.cos(phase * .8) * 7];
      line([root, elbow, tip], 'rgba(112,223,249,.65)');
      ctx.fillStyle = '#6178ff';
      ctx.fillRect(Math.round(tip[0]), Math.round(tip[1]), 2, 2);
    }

    // A dim halo is drawn locally, never as a screen-wide flash.
    const glow = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, 27);
    glow.addColorStop(0, 'rgba(116,225,255,.19)');
    glow.addColorStop(1, 'rgba(116,225,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(head.x - 27, head.y - 27, 54, 54);

    // An orbit of broken triangular marks, flattened as the eye turns.
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + t * .42;
      const x = head.x + Math.cos(angle) * 18;
      const y = head.y + Math.sin(angle) * 15;
      const radial = [Math.cos(angle), Math.sin(angle)];
      line([[x - radial[1] * 2, y + radial[0] * 2],
        [x + radial[0] * 5, y + radial[1] * 5],
        [x + radial[1] * 2, y - radial[0] * 2]], cyan, 1, true);
    }

    // Wireframe projection follows the gaze instead of rotating the whole creature.
    const aim = Math.atan2(gaze.y, gaze.x);
    const dx = Math.cos(aim), dy = Math.sin(aim);
    const tip = [head.x + dx * 32, head.y + dy * 32];
    const a = [head.x + dx * 13 - dy * 8, head.y + dy * 13 + dx * 8];
    const b = [head.x + dx * 13 + dy * 8, head.y + dy * 13 - dx * 8];
    line([a, tip, b], 'rgba(137,239,255,.60)', 1, true);
    line([[head.x + dx * 10, head.y + dy * 10], tip], 'rgba(137,239,255,.25)');

    // Small bright eye, with a dark rim and a white diamond-shaped lens.
    ctx.fillStyle = '#163c54';
    ctx.beginPath();ctx.ellipse(head.x, head.y, 8, 7, -.35, 0, Math.PI * 2);ctx.fill();
    ctx.strokeStyle = cyan;ctx.lineWidth = 1.4;ctx.stroke();
    const eyeX = head.x + gaze.x * 2, eyeY = head.y + gaze.y * 1.5;
    ctx.fillStyle = pale;
    ctx.beginPath();ctx.moveTo(eyeX, eyeY - 5);ctx.lineTo(eyeX + 4, eyeY);
    ctx.lineTo(eyeX, eyeY + 5);ctx.lineTo(eyeX - 4, eyeY);ctx.closePath();ctx.fill();
    ctx.fillStyle = '#fff';ctx.fillRect(Math.round(eyeX - 1), Math.round(eyeY - 2), 2, 3);

    // Occasional small signal specks, kept inside the cameo's bounds.
    for (let i = 0; i < 3; i++) {
      const phase = (t * .65 + i * .31) % 1;
      ctx.fillStyle = `rgba(126,217,255,${(1 - phase) * .45})`;
      ctx.fillRect(Math.round(head.x - 26 + i * 24), Math.round(head.y + 16 + phase * 19), 1, 2);
    }
    ctx.globalAlpha = 1;
    return {x: position.left + head.x * position.scale, y: position.top + head.y * position.scale};
  }

  function tick(now) {
    if (!visit || !visit.host.isConnected || !host() || reducedMotion.matches) {hide();return}
    const age = now - visit.start;
    const position = place(visit.host);
    const retract = visit.retreatAt === null ? 1 : 1 - smooth((now - visit.retreatAt) / 280);
    const extension = smooth(age / 650) * retract;
    const eye = draw(now - visit.start, extension, position);
    const near = pointer.x > 0 && Math.hypot(pointer.x - eye.x, pointer.y - eye.y) < 42;
    if (visit.retreatAt === null && (age > visit.duration || (age > 1500 && near))) visit.retreatAt = now;
    if (visit.retreatAt !== null && now - visit.retreatAt >= 280) {hide();return}
    frame = requestAnimationFrame(tick);
  }

  function appear(preview = false) {
    const anchor = host();
    if (!anchor || reducedMotion.matches || visit || (!preview && Date.now() < nextAllowed)) return false;
    gaze = {x: -.6, y: .1};
    visit = {host: anchor, start: performance.now(), duration: 6500 + Math.random() * 2500, retreatAt: null};
    nextAllowed = Date.now() + 120000;
    canvas.style.display = 'block';
    place(anchor);
    frame = requestAnimationFrame(tick);
    return true;
  }

  function scheduleTrial() {
    clearTimeout(trialTimer);
    if (document.hidden || reducedMotion.matches) return;
    trialTimer = setTimeout(() => {
      const playing = document.body.classList.contains('music-active');
      if (Math.random() < (playing ? .18 : .01)) appear();
      scheduleTrial();
    }, 30000);
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {pointer.x = e.clientX;pointer.y = e.clientY}
  }, {passive: true});
  document.addEventListener('pointerleave', () => {pointer.x = pointer.y = -1000});
  document.addEventListener('visibilitychange', () => {hide();scheduleTrial()});
  reducedMotion.addEventListener('change', () => {hide();scheduleTrial()});
  scheduleTrial();

  // Explicit local/demo URL: normal visitors never receive forced appearances.
  if (new URLSearchParams(location.search).get('overseer') === 'preview') {
    window.overseerPreview = Object.freeze({show: () => {hide();return appear(true)}, hide});
    const observer = new MutationObserver(() => {
      if (host()) {observer.disconnect();appear(true)}
    });
    if (host()) appear(true);
    else {observer.observe(document.querySelector('#main'), {childList: true});setTimeout(() => observer.disconnect(), 10000)}
  }
})();

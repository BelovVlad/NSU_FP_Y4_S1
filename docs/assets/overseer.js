/* A small, procedural Overseer cameo. No images, layout shifts or hit targets. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Temporary review mode: deliberately frequent appearances so the cameo is easy to inspect.
  // After visual approval, these probabilities/intervals can be reduced without touching the animation.
  const CONFIG = Object.freeze({
    idleChance: .72,
    musicChance: .93,
    trialInterval: 9000,
    initialDelay: 1800,
    cooldown: 18000,
    minDuration: 7200,
    durationJitter: 2800
  });
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
    // The whole body follows the gaze: the eye leads and the torso bends after it.
    head.x += gaze.x * 4.2;
    head.y += gaze.y * 2.4;
    const bodyBendX = gaze.x * 11.5;
    const bodyBendY = gaze.y * 6.5;
    const bodyFill = '#7ab2a1';
    const bodyDark = '#5f9486';
    const bodyLight = '#a8d5c7';
    const bodyStroke = 'rgba(185,232,218,.82)';
    const lineBlue = 'rgba(111,231,255,.90)';
    const tipBlue = '#6178ff';
    const eyeBlue = '#6178ff';
    const eyeWhite = '#ffffff';
    ctx.globalAlpha = extension * (.95 + Math.sin(t * 17) * .035);

    // Filled, curved body. Both edges react to the gaze so the silhouette visibly arcs.
    const rootX = 96;
    const rootY = -4;
    const upper1 = [93 + sway + bodyBendX * .08, head.y * .21 + bodyBendY * .04];
    const upper2 = [head.x + 29 + bodyBendX * .58, head.y - 23 + bodyBendY * .42];
    const lower2 = [head.x - 18 + bodyBendX * .32, head.y + 11 + bodyBendY * .30];
    const lower1 = [96 + bodyBendX * .08, head.y * .29 + bodyBendY * .08];

    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.bezierCurveTo(upper1[0], upper1[1], upper2[0], upper2[1], head.x + 7, head.y + 3);
    ctx.quadraticCurveTo(head.x - 12, head.y + 6, head.x - 11, head.y - 10);
    ctx.bezierCurveTo(head.x + 7, head.y - 29, lower2[0], lower2[1], lower1[0], lower1[1]);
    ctx.bezierCurveTo(97 + bodyBendX * .03, head.y * .11, 97, -2, rootX, rootY);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(head.x - 24, head.y - 26, head.x + 30, head.y + 18);
    bodyGrad.addColorStop(0, bodyLight);
    bodyGrad.addColorStop(.30, bodyFill);
    bodyGrad.addColorStop(1, bodyDark);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = bodyStroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Soft body highlight and a curved internal spine reinforce the bend.
    ctx.beginPath();
    ctx.moveTo(95, -2);
    ctx.bezierCurveTo(
      94 + bodyBendX * .05, head.y * .30,
      head.x + 13 + bodyBendX * .42, head.y - 24 + bodyBendY * .28,
      head.x + gaze.x * 1.6, head.y + gaze.y * 1.1
    );
    ctx.strokeStyle = 'rgba(236,255,249,.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(96, 0);
    ctx.bezierCurveTo(
      94 + bodyBendX * .04, head.y * .44,
      head.x + 8 + bodyBendX * .34, head.y - 25 + bodyBendY * .24,
      head.x, head.y
    );
    ctx.strokeStyle = 'rgba(84,143,131,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Exactly four long articulated feelers. The blue tips stay bright and readable.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      const phase = t * 2.15 + i * 1.62;
      const root = [
        head.x + side * (3 + row * 1.5),
        head.y - 18 + row * 8
      ];
      const elbow = [
        head.x + side * (24 + Math.sin(phase) * 6 + gaze.x * 2.5),
        head.y - 13 + row * 3 + Math.cos(phase) * 7 + gaze.y * 1.4
      ];
      const tip = [
        head.x + side * (39 + Math.sin(phase + .82) * 8 + Math.sin(t * 4.6 + i) * 2.4 + gaze.x * 4.8),
        head.y + 2 + row * 3 + Math.cos(phase * .83) * 11 + Math.sin(t * 3.4 + i * .86) * 2 + gaze.y * 2.2
      ];
      line([root, elbow, tip], 'rgba(155,218,201,.78)', 1.15);
      ctx.fillStyle = tipBlue;
      ctx.beginPath();
      ctx.arc(Math.round(tip[0]), Math.round(tip[1]), 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(125,145,255,.28)';
      ctx.fillRect(Math.round(tip[0] - 3), Math.round(tip[1]), 6, 1);
    }

    // Body-colored local halo.
    const haloPulse = .14 + (Math.sin(t * 2.4) + 1) * .04;
    const glow = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, 29);
    glow.addColorStop(0, `rgba(122,178,161,${haloPulse.toFixed(3)})`);
    glow.addColorStop(1, 'rgba(122,178,161,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(head.x - 29, head.y - 29, 58, 58);

    // An orbit of broken triangular marks, flattened as the eye turns.
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + t * .42;
      const orbitPulse = 1 + Math.sin(t * 1.3 + i * .7) * .045;
      const x = head.x + Math.cos(angle) * 18 * orbitPulse;
      const y = head.y + Math.sin(angle) * 15 * orbitPulse;
      const radial = [Math.cos(angle), Math.sin(angle)];
      line([[x - radial[1] * 2, y + radial[0] * 2],
        [x + radial[0] * 5, y + radial[1] * 5],
        [x + radial[1] * 2, y - radial[0] * 2]], lineBlue, 1, true);
    }

    // Wireframe projection follows the gaze instead of rotating the whole creature.
    const aim = Math.atan2(gaze.y, gaze.x);
    const dx = Math.cos(aim), dy = Math.sin(aim);
    const tip = [head.x + dx * 32, head.y + dy * 32];
    const a = [head.x + dx * 13 - dy * 8, head.y + dy * 13 + dx * 8];
    const b = [head.x + dx * 13 + dy * 8, head.y + dy * 13 - dx * 8];
    line([a, tip, b], 'rgba(137,239,255,.60)', 1, true);
    line([[head.x + dx * 10, head.y + dy * 10], tip], 'rgba(137,239,255,.25)');
    const scan = (t * 1.7) % 1;
    const scanX = head.x + dx * (10 + scan * 22);
    const scanY = head.y + dy * (10 + scan * 22);
    ctx.fillStyle = `rgba(97,120,255,${(.24 + (1 - scan) * .56).toFixed(3)})`;
    ctx.fillRect(Math.round(scanX), Math.round(scanY), 2, 2);

    // A faint local ping occasionally expands around the eye.
    const ping = (t * .52) % 1;
    if (ping < .64) {
      ctx.beginPath();
      ctx.arc(head.x, head.y, 10 + ping * 24, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(113,227,255,${((.64 - ping) * .20).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // White eyeball, blue moving iris and a hooked vertical pupil like the reference.
    const eyeX = head.x + gaze.x * 3.2;
    const eyeY = head.y + gaze.y * 2.2;
    const blinkPhase = t % 5.2;
    const blinkA = blinkPhase > 4.54 && blinkPhase < 4.70;
    const blinkB = blinkPhase > 4.84 && blinkPhase < 4.95;
    const eyeOpen = (blinkA || blinkB) ? .18 : 1;

    // Dark socket around the eyeball.
    ctx.fillStyle = '#315e58';
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, 9.5, 8, -.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = bodyStroke;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // White eyeball itself.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, 7.7, Math.max(1.35, 6.3 * eyeOpen), -.18, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = eyeWhite;
    ctx.fillRect(head.x - 10, head.y - 9, 20, 18);

    // Blue iris follows the cursor and matches the tentacle tips.
    ctx.fillStyle = eyeBlue;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 3.4, Math.max(.9, 4.2 * eyeOpen), -.12, 0, Math.PI * 2);
    ctx.fill();

    // Vertical pupil with two small hooks pointing back toward the body/root.
    if (eyeOpen > .5) {
      const back = rootX < eyeX ? -1 : 1;
      ctx.strokeStyle = '#18375f';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY - 3.0);
      ctx.lineTo(eyeX, eyeY + 3.0);
      ctx.moveTo(eyeX, eyeY - 2.9);
      ctx.lineTo(eyeX + back * 2.1, eyeY - 1.25);
      ctx.moveTo(eyeX, eyeY + 2.9);
      ctx.lineTo(eyeX + back * 2.1, eyeY + 1.25);
      ctx.stroke();
    }
    ctx.restore();

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
    visit = {
      host: anchor,
      start: performance.now(),
      duration: CONFIG.minDuration + Math.random() * CONFIG.durationJitter,
      retreatAt: null
    };
    nextAllowed = Date.now() + CONFIG.cooldown;
    canvas.style.display = 'block';
    place(anchor);
    frame = requestAnimationFrame(tick);
    return true;
  }

  function scheduleTrial(delay = CONFIG.trialInterval) {
    clearTimeout(trialTimer);
    if (document.hidden || reducedMotion.matches) return;
    trialTimer = setTimeout(() => {
      const playing = document.body.classList.contains('music-active');
      if (Math.random() < (playing ? CONFIG.musicChance : CONFIG.idleChance)) appear();
      scheduleTrial();
    }, delay);
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {pointer.x = e.clientX;pointer.y = e.clientY}
  }, {passive: true});
  document.addEventListener('pointerleave', () => {pointer.x = pointer.y = -1000});
  document.addEventListener('visibilitychange', () => {hide();scheduleTrial(CONFIG.initialDelay)});
  reducedMotion.addEventListener('change', () => {hide();scheduleTrial(CONFIG.initialDelay)});
  window.addEventListener('blur', () => {pointer.x = pointer.y = -1000});
  scheduleTrial(CONFIG.initialDelay);

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

/* أنواع المراحل الثلاثة. كل نوع يرسم مسرحه، وينفّذ أوامر البرنامج واحداً واحداً، ويقرّر هل نجح الطفل. */
(function (root) {
  'use strict';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const done = tl => new Promise(r => (tl && tl.then ? tl.then(r) : r()));

  /* ---------- سراج يتكلم ---------- */
  class TalkStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      // خطة بالصور فوق: الطفل اللي ما بيقرأ يشوف المطلوب، وكل خطوة تتلوّن لما سراج يعملها
      const chip = a => a === 'wave' ? '👋' : a === 'jump' ? '🦘' : `💬<small>${a.slice(4)}</small>`;
      this.el.innerHTML = `<div class="talk-stage">
        <div class="plan">${this.level.target.map((a, i) => `<span class="pc" data-i="${i}">${chip(a)}</span>`).join('<i>←</i>')}</div>
        <div class="talk-window"><span></span><span></span></div>
        <div class="say-bubble" id="sayBubble"></div>
        <div class="siraj-holder talk"></div></div>`;
      this.siraj = Siraj.create(this.el.querySelector('.siraj-holder'), this.color);
      this.reset();
    }
    reset() {
      this.actions = []; this.bubble('');
      this.el.querySelectorAll('.pc').forEach(c => c.classList.remove('ok', 'bad'));
    }
    mark() {
      const k = this.actions.length - 1, c = this.el.querySelector(`.pc[data-i="${k}"]`);
      if (!c) return;
      const good = this.level.target[k] === this.actions[k];
      c.classList.add(good ? 'ok' : 'bad');
      gsap.fromTo(c, { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    }
    bubble(t) {
      const b = this.el.querySelector('#sayBubble');
      b.textContent = t;
      b.classList.toggle('show', !!t);
      if (t) gsap.fromTo(b, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
    }
    async exec(o) {
      if (o.op === 'say') {
        this.actions.push('say:' + o.arg); this.mark();
        this.bubble(o.arg);
        const i = Talk.key(o.arg);
        Voice.play('ph_' + i, i >= 0 ? SIRAJ_TEXTS.PHRASES[i][1] : o.arg);
        await this.siraj.talk(950);
        await sleep(200);
        this.bubble('');
      } else if (o.op === 'wave') { this.actions.push('wave'); this.mark(); Sfx.tap(); await done(this.siraj.wave()); }
      else if (o.op === 'jump') { this.actions.push('jump'); this.mark(); Sfx.hop(); await done(this.siraj.jump()); Sfx.land(); }
      else if (o.op === 'loop') await sleep(120);
      return true;
    }
    result() {
      const t = this.level.target, a = this.actions;
      const ok = t.length === a.length && t.every((x, i) => x === a[i]);
      if (ok) return { ok };
      return { ok, reason: a.length < t.length ? 'talk_short' : a.length > t.length ? 'talk_long' : 'talk_order' };
    }
    celebrate() { return done(this.siraj.happy()); }
    destroy() { this.siraj && this.siraj.destroy(); }
  }
  // مفتاح ملف الصوت لكل جملة
  const Talk = { key: t => SIRAJ_TEXTS.PHRASES.findIndex(p => p[0] === t) };

  /* ---------- ارسم بالكود ---------- */
  class DrawStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      this.el.innerHTML = `<div class="draw-stage"><canvas></canvas><div class="pen-siraj"><div class="pen-dir"></div><div class="pen-body"></div></div></div>`;
      this.cv = this.el.querySelector('canvas');
      this.mini = Siraj.create(this.el.querySelector('.pen-body'), this.color, { shadow: false });
      this.layout();
      this.reset();
    }
    layout() {
      const pts = [[0, 0]].concat(...this.level.target.map(s => [[s[0], s[1]], [s[2], s[3]]]));
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      this.minX = Math.min(...xs) - 1; this.minY = Math.min(...ys) - 1;
      const w = Math.max(...xs) - this.minX + 1, h = Math.max(...ys) - this.minY + 1;
      const r = this.el.getBoundingClientRect();
      const top = 54; // مكان شريط الهدف فوق
      this.u = Math.floor(Math.min((r.width - 24) / w, (r.height - top - 16) / h, 90));
      this.ox = (r.width - w * this.u) / 2; this.oy = top + (r.height - top - h * this.u) / 2;
      const d = devicePixelRatio || 1;
      this.cv.width = r.width * d; this.cv.height = r.height * d;
      this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
      this.g = this.cv.getContext('2d');
      this.g.setTransform(d, 0, 0, d, 0, 0);
      this.W = r.width; this.H = r.height; this.gw = w; this.gh = h;
    }
    px(x, y) { return [this.ox + (x - this.minX) * this.u, this.oy + (y - this.minY) * this.u]; }
    reset() {
      const [x, y, h] = this.level.start;
      this.x = x; this.y = y; this.h = h; this.lines = []; this.edges = new Set();
      this.draw();
      this.placePen(true);
    }
    draw(extra) {
      const g = this.g, u = this.u;
      g.clearRect(0, 0, this.W, this.H);
      g.fillStyle = '#c9d6ef';
      for (let i = 0; i <= this.gw; i++) for (let j = 0; j <= this.gh; j++) {
        const [px, py] = this.px(this.minX + i, this.minY + j);
        g.beginPath(); g.arc(px, py, 2.2, 0, 7); g.fill();
      }
      g.lineCap = 'round';
      g.setLineDash([u * 0.12, u * 0.14]); g.strokeStyle = 'rgba(120,130,170,.55)'; g.lineWidth = Math.max(4, u * 0.08);
      for (const s of this.level.target) { const a = this.px(s[0], s[1]), b = this.px(s[2], s[3]); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      g.setLineDash([]); g.strokeStyle = this.color; g.lineWidth = Math.max(6, u * 0.13);
      for (const l of this.lines.concat(extra ? [extra] : [])) { const a = this.px(l[0], l[1]), b = this.px(l[2], l[3]); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    }
    placePen(instant) {
      const pen = this.el.querySelector('.pen-siraj');
      const [px, py] = this.px(this.x, this.y);
      const s = this.u * 0.95;
      pen.style.width = s + 'px'; pen.style.height = s + 'px';
      gsap.to(pen, { x: px - s / 2, y: py - s * 0.92, duration: instant ? 0 : 0.15 });
      gsap.to(pen.querySelector('.pen-dir'), { rotation: this.h, duration: instant ? 0 : 0.3, ease: 'back.out(2)' });
    }
    async exec(o) {
      // وضع الصغار: الأسهم ترسم مربعاً واحداً في اتجاه الشاشة مباشرة (بدون استدارة)
      const SCREEN = { right: 0, down: 90, left: 180, up: 270 };
      if (SCREEN[o.op] !== undefined) { this.h = SCREEN[o.op]; this.placePen(); await sleep(120); o = { op: 'forward', arg: 1 }; }
      if (o.op === 'forward') {
        const rad = this.h * Math.PI / 180;
        const r2 = v => Math.round(v * 100) / 100;
        const nx = r2(this.x + Math.cos(rad) * o.arg), ny = r2(this.y + Math.sin(rad) * o.arg);
        const pen = this.el.querySelector('.pen-siraj');
        const p = { t: 0 };
        Sfx.pen();
        await done(gsap.to(p, {
          t: 1, duration: 0.35 + 0.18 * o.arg, ease: 'power1.inOut',
          onUpdate: () => {
            const cx = this.x + (nx - this.x) * p.t, cy = this.y + (ny - this.y) * p.t;
            this.draw([this.x, this.y, cx, cy]);
            const [px, py] = this.px(cx, cy), s = this.u * 0.95;
            gsap.set(pen, { x: px - s / 2, y: py - s * 0.92 });
          },
        }));
        this.addSeg(this.x, this.y, nx, ny);
        this.lines.push([this.x, this.y, nx, ny]);
        this.x = nx; this.y = ny;
        this.draw();
      } else if (o.op === 'turn') {
        this.h = (this.h + o.arg + 360) % 360;
        Sfx.tap();
        this.placePen();
        await sleep(330);
      } else if (o.op === 'loop') await sleep(100);
      return true;
    }
    // نقسّم الخطوط المستقيمة لقطع طولها مربع واحد، عشان الرسم يتقارن بالهدف مهما كان ترتيب الرسم
    addSeg(x1, y1, x2, y2, set = this.edges) {
      const key = (a, b, c, d) => [[a, b], [c, d]].sort((p, q) => p[0] - q[0] || p[1] - q[1]).map(p => p.join(',')).join('|');
      const n = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
      const axis = x1 === x2 || y1 === y2;
      if (!axis || n < 1) { set.add(key(x1, y1, x2, y2)); return; }
      const dx = (x2 - x1) / n, dy = (y2 - y1) / n;
      for (let i = 0; i < n; i++) set.add(key(x1 + dx * i, y1 + dy * i, x1 + dx * (i + 1), y1 + dy * (i + 1)));
    }
    result() {
      const want = new Set();
      this.level.target.forEach(s => this.addSeg(s[0], s[1], s[2], s[3], want));
      const extra = [...this.edges].some(e => !want.has(e));
      const missing = [...want].some(e => !this.edges.has(e));
      if (!extra && !missing) return { ok: true };
      return { ok: false, reason: extra ? 'draw_extra' : 'draw_missing' };
    }
    celebrate() {
      const r = this.el.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
      return done(this.mini.happy());
    }
    destroy() { this.mini && this.mini.destroy(); }
  }

  /* ---------- مغامرة النور ---------- */
  const MOVES = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const SPARK = '<svg viewBox="0 0 40 40"><path d="M20 2 L25 15 L38 20 L25 25 L20 38 L15 25 L2 20 L15 15Z" fill="#ffd23e" stroke="#f0a500" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="20" r="5" fill="#fff8d6"/></svg>';
  const CRATE = '<svg viewBox="0 0 60 60"><rect x="4" y="12" width="52" height="44" rx="6" fill="#c98a4b" stroke="#7a4d22" stroke-width="3"/><rect x="4" y="6" width="52" height="12" rx="5" fill="#dca266" stroke="#7a4d22" stroke-width="3"/><path d="M10 22 L50 50 M50 22 L10 50" stroke="#7a4d22" stroke-width="3.5" stroke-linecap="round"/></svg>';
  const LAMP = lit => `<svg viewBox="0 0 40 100"><rect x="17" y="30" width="6" height="64" rx="3" fill="#4b4f6e"/><rect x="9" y="90" width="22" height="8" rx="4" fill="#3a3d58"/>
    <path d="M6 30 L34 30 L28 6 L12 6Z" fill="${lit ? '#ffd23e' : '#6d7192'}" stroke="${lit ? '#f0a500' : '#4b4f6e'}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="10" y="2" width="20" height="6" rx="3" fill="#4b4f6e"/>${lit ? '<circle cx="20" cy="18" r="9" fill="#fff6c8"/>' : ''}</svg>`;

  class PathStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      this.el.innerHTML = '<div class="path-stage"><div class="board"></div></div>';
      this.grid = this.level.grid;
      this.sparks = [];
      this.grid.forEach((row, y) => [...row].forEach((c, x) => { if (c === 's') this.sparks.push(x + ',' + y); }));
      this.reset();
    }
    reset() {
      this.got = new Set(); this.lit = false; this.face = 1;
      this.grid.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'R') { this.x = x; this.y = y; } }));
      this.el.querySelector('.path-stage').classList.remove('lit');
      this.render();
    }
    layout() { this.render(); }
    render() {
      const rows = this.grid.length, cols = this.grid[0].length;
      const r = this.el.getBoundingClientRect();
      // نترك مكاناً فوق لشريط الهدف وللمصباح وسراج لما ينط
      const C = this.C = Math.floor(Math.min((r.width - 20) / cols, (r.height - 70) / (rows * 0.78 + 1.2), 96));
      const R = this.R = Math.round(C * 0.78), F = Math.round(C * 0.24);
      const b = this.el.querySelector('.board');
      b.style.width = cols * C + 'px'; b.style.height = rows * R + F + 'px';
      let h = '';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const c = this.grid[y][x];
        if (c === '#') continue;
        h += `<div class="tile" style="left:${x * C + 2}px;top:${y * R + 2}px;width:${C - 4}px;height:${R + F - 4}px;z-index:${y * 10}">
          <div class="t-front" style="top:${R - 14}px;height:${F + 10}px"></div><div class="t-top ${(x + y) % 2 ? 'a' : 'b'}" style="height:${R - 4}px"></div></div>`;
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const c = this.grid[y][x], px = x * C + C / 2, py = y * R + R / 2, z = y * 10 + 5;
        if (c === 's' && !this.got.has(x + ',' + y)) h += `<div class="obj spark" id="sp-${x}-${y}" style="left:${px}px;top:${py}px;width:${C * 0.5}px;z-index:${z}">${SPARK}</div>`;
        if (c === 'L') h += `<div class="lamp-glow" style="left:${px}px;top:${py - R}px;width:${C * 4}px;height:${C * 4}px"></div>
          <div class="obj ${this.lit ? '' : 'beckon'}" id="lamp" style="left:${px}px;top:${py + R * 0.3}px;width:${C * 0.42}px;z-index:${z}">${LAMP(this.lit)}</div>`;
      }
      // الحواجز صناديق فوق مربعات فاضية
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (this.grid[y][x] !== '#') continue;
        h += `<div class="obj crate" style="left:${x * C + C / 2}px;top:${y * R + R * 0.95}px;width:${C * 0.74}px;z-index:${y * 10 + 5}">${CRATE}</div>`;
      }
      const s = C * 0.95;
      h += `<div class="walker" style="width:${s}px;height:${s}px"></div>`;
      b.innerHTML = h;
      if (this.mini) this.mini.destroy();
      this.mini = Siraj.create(b.querySelector('.walker'), this.color);
      this.place(this.x, this.y, 0);
    }
    place(x, y, lift) {
      const w = this.el.querySelector('.walker'), s = this.C * 0.95;
      gsap.set(w, { x: x * this.C + this.C / 2 - s / 2, y: y * this.R + this.R / 2 - s * 0.8 - lift, zIndex: Math.round(y) * 10 + 7, scaleX: this.face });
    }
    async exec(o) {
      if (o.op === 'loop') { await sleep(100); return true; }
      const d = MOVES[o.op];
      if (!d) return true;
      if (d[0]) this.face = d[0] < 0 ? -1 : 1;
      const nx = this.x + d[0], ny = this.y + d[1];
      const edge = ny < 0 || ny >= this.grid.length || nx < 0 || nx >= this.grid[0].length;
      const blocked = edge || this.grid[ny][nx] === '#';
      if (blocked) {
        Sfx.bump();
        const p = { t: 0 };
        await done(gsap.to(p, { t: 1, duration: 0.25, onUpdate: () => { const k = Math.sin(Math.PI * p.t) * 0.3; this.place(this.x + d[0] * k, this.y + d[1] * k, this.C * 0.2 * Math.sin(Math.PI * p.t)); } }));
        gsap.fromTo(this.el.querySelector('.board'), { x: -6 }, { x: 0, duration: 0.3, ease: 'elastic.out(3,0.3)' });
        await done(this.mini.dizzy());
        this.place(this.x, this.y, 0);
        this.failReason = edge ? 'edge' : 'bump';
        return false;
      }
      Sfx.hop();
      const ox = this.x, oy = this.y, p = { t: 0 };
      await done(gsap.to(p, { t: 1, duration: 0.32, ease: 'power1.inOut', onUpdate: () => this.place(ox + d[0] * p.t, oy + d[1] * p.t, this.C * 0.5 * Math.sin(Math.PI * p.t)) }));
      this.x = nx; this.y = ny;
      Sfx.land();
      if (this.grid[ny][nx] === 's' && !this.got.has(nx + ',' + ny)) {
        this.got.add(nx + ',' + ny);
        Sfx.spark();
        const sp = this.el.querySelector(`#sp-${nx}-${ny}`);
        if (sp) {
          const r = sp.getBoundingClientRect();
          FX.burst(r.left + r.width / 2, r.top + r.height / 2, 16, ['#ffd23e', '#fff3b0', '#ffb300']);
          sp.classList.remove('spark'); // حركة الطفو في الـ CSS كانت تمنع حركة الطيران
          gsap.fromTo(sp, { xPercent: -50, yPercent: -100 }, { y: -60, scale: 0, duration: 0.45, ease: 'back.in(2)', onComplete: () => sp.remove() });
        }
        if (this.onSpark) this.onSpark(this.got.size, this.sparks.length);
      }
      await sleep(60);
      return true;
    }
    result() {
      if (this.failReason) { const r = this.failReason; this.failReason = null; return { ok: false, reason: r }; }
      const atLamp = this.grid[this.y][this.x] === 'L';
      if (atLamp && this.got.size === this.sparks.length) return { ok: true };
      if (this.got.size < this.sparks.length) return { ok: false, reason: 'path_sparks' };
      return { ok: false, reason: 'path_lamp' };
    }
    async celebrate() {
      this.lit = true;
      Sfx.light();
      const lamp = this.el.querySelector('#lamp');
      lamp.innerHTML = LAMP(true); lamp.classList.remove('beckon');
      this.el.querySelector('.lamp-glow').classList.add('on');
      this.el.querySelector('.path-stage').classList.add('lit');
      const r = lamp.getBoundingClientRect();
      for (let i = 0; i < 3; i++) setTimeout(() => FX.burst(r.left + r.width / 2 + (Math.random() - 0.5) * 160, r.top + (Math.random() - 0.3) * 100, 36, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a', '#fff']), i * 250);
      return done(this.mini.happy());
    }
    destroy() { this.mini && this.mini.destroy(); }
  }

  /* ---------- جزيئات الاحتفال ---------- */
  const FX = (() => {
    const cv = document.getElementById('fx'), g = cv.getContext('2d');
    let parts = [], running = false;
    const fit = () => { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);
    function loop() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.98; p.life -= 0.016; p.rot += 0.2;
        g.save(); g.globalAlpha = Math.max(0, p.life); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
      }
      if (parts.length) requestAnimationFrame(loop); else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return {
      burst(x, y, n, colors) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 2 + Math.random() * 6; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 1, c: colors[i % colors.length], r: 3 + Math.random() * 4, rot: Math.random() * 6 }); }
        if (!running) { running = true; requestAnimationFrame(loop); }
      },
      confetti() { for (let i = 0; i < 5; i++) setTimeout(() => this.burst(Math.random() * innerWidth, innerHeight * (0.2 + Math.random() * 0.3), 30, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a', '#b28dff']), i * 180); },
    };
  })();

  root.Stages = { talk: TalkStage, draw: DrawStage, path: PathStage };
  root.FX = FX;
  root.Talk = Talk;
})(window);

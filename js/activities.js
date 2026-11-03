/* أنواع المراحل الثلاثة. كل نوع يرسم مسرحه، وينفّذ أوامر البرنامج واحداً واحداً، ويقرّر هل نجح الطفل. */
(function (root) {
  'use strict';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const done = tl => new Promise(r => (tl && tl.then ? tl.then(r) : r()));

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // رقم يقوله سراج بصوته (n_<رقم>)، وإلا صوت الجهاز
  // كلام سراج وهو ينفّذ البرنامج هو "ناتج" البرنامج: يتقال كل مرة (حتى لو تكرر في حلقة)
  const OUT = { pri: 'feedback', force: true, again: true };
  const sayNum = v => { const N = SIRAJ_TEXTS.NUMS; Voice.play(Number.isInteger(v) && v >= 0 && v < N.length ? 'n_' + v : 'n_x', Number.isInteger(v) && v >= 0 && v < N.length ? N[v] : String(v), undefined, OUT); };
  const talkChip = a => a === 'wave' ? '🙋' : a === 'jump' ? '🦘' : `💬<small>${esc(a.slice(4))}</small>`;

  /* ---------- سراج يتكلم ---------- */
  class TalkStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      // خطة بالصور فوق: الطفل اللي ما بيقرأ يشوف المطلوب، وكل خطوة تتلوّن لما سراج يعملها
      const chip = talkChip;
      this.el.innerHTML = `<div class="talk-stage${this.level.target.length ? ' has-plan' : ''}">
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
        this.bubble(String(o.arg));
        const i = Talk.key(o.arg);
        if (typeof o.arg === 'number') sayNum(o.arg);
        else Voice.play(i >= 0 ? 'ph_' + i : 'ph_x', i >= 0 ? SIRAJ_TEXTS.PHRASES[i][1] : o.arg, undefined, OUT);
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
      if (this.level.free) return a.length ? { ok: true } : { ok: false, reason: 'talk_short' }; // لعب حر: أي عرض ينفع
      const ok = t.length === a.length && t.every((x, i) => x === a[i]);
      if (ok) return { ok };
      return { ok, reason: a.length < t.length ? 'talk_short' : a.length > t.length ? 'talk_long' : 'talk_order' };
    }
    // وضع الصغار: هل آخر ضغطة غلط؟ ونرجّعها خطوة واحدة بدل ما نبدأ من الأول
    wrong() { if (this.level.free) return null; const k = this.actions.length - 1; return k >= this.level.target.length ? 'talk_long' : this.actions[k] !== this.level.target[k] ? 'talk_order' : null; }
    pop() { const k = this.actions.length - 1; this.actions.pop(); const c = this.el.querySelector(`.pc[data-i="${k}"]`); if (c) c.classList.remove('ok', 'bad'); }
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
      const a = this.level.area; // اللعب الحر: لوحة ثابتة بدل حدود الشكل المطلوب
      const pts = [[0, 0]].concat(a ? [[a[0], a[1]], [a[2], a[3]]] : [], ...this.level.target.map(s => [[s[0], s[1]], [s[2], s[3]]]));
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      this.minX = Math.min(...xs) - 1; this.minY = Math.min(...ys) - 1;
      const w = Math.max(...xs) - this.minX + 1, h = Math.max(...ys) - this.minY + 1;
      const r = this.el.getBoundingClientRect();
      const top = 54; // مكان شريط الهدف فوق
      this.u = Math.floor(Math.min((r.width - 24) / w, (r.height - top - 16) / h, 90));
      this.ox = (r.width - w * this.u) / 2; this.oy = top + (r.height - top - h * this.u) / 2;
      const d = Math.min(2, devicePixelRatio || 1); // أكثر من ٢ يتعب التلفونات الرخيصة بدون فرق يُرى
      this.cv.width = r.width * d; this.cv.height = r.height * d;
      this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
      this.g = this.cv.getContext('2d');
      this.g.setTransform(d, 0, 0, d, 0, 0);
      this.W = r.width; this.H = r.height; this.gw = w; this.gh = h;
    }
    px(x, y) { return [this.ox + (x - this.minX) * this.u, this.oy + (y - this.minY) * this.u]; }
    reset() {
      const [x, y, h] = this.level.start;
      this.x = x; this.y = y; this.h = h; this.lines = []; this.edges = new Set(); this.ghost = null;
      if (this.ghostTw) this.ghostTw.kill();
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
      g.setLineDash([]);
      // التلميح: طريق القلم الصحيح بالبرتقالي الشفاف
      if (this.ghost) {
        const pts = this.ghost, n = Math.max(1, Math.round(this.ghostT * (pts.length - 1)));
        g.strokeStyle = 'rgba(255,154,46,.55)'; g.lineWidth = Math.max(8, u * 0.2);
        g.beginPath(); g.moveTo(...this.px(...pts[0]));
        for (let i = 1; i <= n && i < pts.length; i++) g.lineTo(...this.px(...pts[i]));
        g.stroke();
      }
      g.strokeStyle = this.color; g.lineWidth = Math.max(6, u * 0.13);
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
      if (this.level.free) return this.lines.length ? { ok: true } : { ok: false, reason: 'draw_missing' };
      const want = new Set();
      this.level.target.forEach(s => this.addSeg(s[0], s[1], s[2], s[3], want));
      const extra = [...this.edges].some(e => !want.has(e));
      const missing = [...want].some(e => !this.edges.has(e));
      if (!extra && !missing) return { ok: true };
      return { ok: false, reason: extra ? 'draw_extra' : 'draw_missing' };
    }
    wrong() { if (this.level.free) return null; const r = this.result(); return r.reason === 'draw_extra' ? 'draw_extra' : null; }
    // التلميح: سراج يرسم الطريق الصحيح ببطء بخط شفاف
    hint(ops) {
      let [x, y, h] = this.level.start;
      const pts = [[x, y]];
      for (const o of ops) {
        if (o.op === 'turn') h = (h + o.arg + 360) % 360;
        if (o.op === 'forward') { const r = h * Math.PI / 180; x = Math.round((x + Math.cos(r) * o.arg) * 100) / 100; y = Math.round((y + Math.sin(r) * o.arg) * 100) / 100; pts.push([x, y]); }
      }
      if (pts.length < 2) return false;
      this.ghost = pts; this.ghostT = 0;
      if (this.ghostTw) this.ghostTw.kill();
      this.ghostTw = gsap.to(this, { ghostT: 1, duration: 0.5 + 0.35 * pts.length, ease: 'none', onUpdate: () => this.draw() });
      return 'hint_draw';
    }
    celebrate() {
      const r = this.el.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
      return done(this.mini.happy());
    }
    destroy() { if (this.ghostTw) this.ghostTw.kill(); this.mini && this.mini.destroy(); }
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
    // التلميح: نقاط مرقّمة على الطريق الصحيح
    hint(ops) {
      const b = this.el.querySelector('.board');
      b.querySelectorAll('.hint-dot').forEach(d => d.remove());
      let x, y;
      this.grid.forEach((row, j) => [...row].forEach((c, i) => { if (c === 'R') { x = i; y = j; } }));
      let k = 0, h = '';
      for (const o of ops) {
        const d = MOVES[o.op];
        if (!d) continue;
        x += d[0]; y += d[1]; k++;
        if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) break;
        h += `<div class="hint-dot" style="left:${x * this.C + this.C / 2}px;top:${y * this.R + this.R / 2}px;z-index:${y * 10 + 6}">${k}</div>`;
      }
      b.insertAdjacentHTML('beforeend', h);
      gsap.from(b.querySelectorAll('.hint-dot'), { scale: 0, stagger: 0.12, duration: 0.3, ease: 'back.out(3)' });
      return 'hint_path';
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

  /* ---------- عرض الأضواء ---------- */
  // صف مصابيح في شارع المدينة. كل light("لون") يضيء المصباح التالي، و off() يتركه مطفأ.
  // تحت كل مصباح دائرة صغيرة بلون الهدف، عشان الصغير يشوف المطلوب بدون قراءة
  const LC = () => Blocks.LIGHTS;
  class LightsStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      // اللعب الحر: مصابيح فاضية بدون لون مطلوب
      const t = this.level.target || Array(this.level.lamps || 8).fill('');
      this.el.innerHTML = `<div class="lights-stage"><div class="lt-moon"></div>
        <div class="lt-row" style="--n:${t.length}">${t.map((c, i) => `<div class="lt" data-i="${i}" style="--want:${LC()[c] || '#2a2d4a'}">
          <div class="lt-bulb"></div><div class="lt-post"></div>${c ? `<div class="lt-want ${c === 'off' ? 'off' : ''}"></div>` : ''}</div>`).join('')}</div>
        <div class="lt-ground"></div><div class="siraj-holder lt-siraj"></div></div>`;
      this.siraj = Siraj.create(this.el.querySelector('.lt-siraj'), this.color);
      this.reset();
    }
    reset() {
      this.seq = [];
      this.el.querySelectorAll('.lt').forEach(l => { l.className = 'lt'; l.style.removeProperty('--on'); });
      if (this.siraj) this.siraj.setChest('#ffd23e');
    }
    lamp(k) { return this.el.querySelector(`.lt[data-i="${k}"]`); }
    async exec(o) {
      if (o.op === 'loop' || o.op === 'call') { await sleep(110); return true; }
      if (o.op !== 'light' && o.op !== 'off') return true;
      const c = o.op === 'off' ? 'off' : o.arg, k = this.seq.length;
      this.seq.push(c);
      this.siraj.setChest(c === 'off' ? '#3a3d58' : LC()[c]);
      const l = this.lamp(k);
      if (l) {
        const good = this.level.free || this.level.target[k] === c;
        l.classList.add(c === 'off' ? 'dark' : 'on', good ? 'ok' : 'bad');
        if (c !== 'off') l.style.setProperty('--on', LC()[c]);
        gsap.fromTo(l.querySelector('.lt-bulb'), { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
      } else {
        // مصباح زائد: الشارع كله يهتز
        gsap.fromTo(this.el.querySelector('.lt-row'), { x: -6 }, { x: 0, duration: 0.3, ease: 'elastic.out(3,0.3)' });
      }
      if (c === 'off') Sfx.tap(); else Sfx.spark();
      await sleep(380);
      return true;
    }
    result() {
      const t = this.level.target, s = this.seq;
      if (this.level.free) return s.length ? { ok: true } : { ok: false, reason: 'light_short' };
      const bad = s.findIndex((c, i) => i < t.length && c !== t[i]);
      if (bad >= 0) return { ok: false, reason: 'light_wrong' };
      if (s.length < t.length) return { ok: false, reason: 'light_short' };
      if (s.length > t.length) return { ok: false, reason: 'light_long' };
      return { ok: true };
    }
    wrong() { if (this.level.free) return null; const r = this.result(); return r.reason === 'light_wrong' || r.reason === 'light_long' ? r.reason : null; }
    pop() { const k = this.seq.length - 1; this.seq.pop(); const l = this.lamp(k); if (l) { l.className = 'lt'; l.style.removeProperty('--on'); } }
    celebrate() {
      Sfx.light();
      const ls = this.el.querySelectorAll('.lt-bulb');
      gsap.fromTo(ls, { y: 0 }, { y: -14, duration: 0.22, yoyo: true, repeat: 3, stagger: 0.07, ease: 'sine.inOut' });
      const r = this.el.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, (this.level.target || this.seq).filter(c => c !== 'off').map(c => LC()[c]).concat(['#fff']));
      return done(this.siraj.happy());
    }
    destroy() { this.siraj && this.siraj.destroy(); }
  }

  /* ---------- حفلة سراج: أضواء المدينة + كلام وقفز ورقص في برنامج واحد ---------- */
  // الهدف قائمة مختلطة: 'red' / 'off' (مصباح) و 'say:..' / 'wave' / 'jump' / 'dance' (سراج). خطة بالصور فوق، والمصابيح بالترتيب
  const isLight = a => a === 'off' || !!LC()[a];
  const partyChip = a => (a === 'off' ? '<i class="lt-chip off"></i>' : LC()[a] ? `<i class="lt-chip" style="background:${LC()[a]}"></i>` : a === 'dance' ? '💃' : talkChip(a));
  class PartyStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      const t = this.level.target || [], free = this.level.free;
      const lamps = free ? Array(this.level.lamps || 6).fill('') : t.filter(isLight);
      this.el.innerHTML = `<div class="lights-stage party-stage${t.length ? ' has-plan' : ''}">
        ${t.length ? `<div class="plan">${t.map((a, i) => `<span class="pc" data-i="${i}">${partyChip(a)}</span>`).join('<i>←</i>')}</div>` : ''}
        <div class="lt-row" style="--n:${lamps.length}">${lamps.map((c, i) => `<div class="lt" data-i="${i}" style="--want:${LC()[c] || '#2a2d4a'}">
          <div class="lt-bulb"></div><div class="lt-post"></div>${c ? `<div class="lt-want ${c === 'off' ? 'off' : ''}"></div>` : ''}</div>`).join('')}</div>
        <div class="lt-ground"></div><div class="say-bubble" id="sayBubble"></div><div class="siraj-holder lt-siraj"></div></div>`;
      this.siraj = Siraj.create(this.el.querySelector('.lt-siraj'), this.color);
      this.reset();
    }
    reset() {
      this.actions = []; this.lit = 0; this.bubble('');
      this.el.querySelectorAll('.lt').forEach(l => { l.className = 'lt'; l.style.removeProperty('--on'); });
      this.el.querySelectorAll('.pc').forEach(c => c.classList.remove('ok', 'bad'));
      if (this.siraj) this.siraj.setChest('#ffd23e');
    }
    bubble(t) {
      const b = this.el.querySelector('#sayBubble');
      if (!b) return;
      b.textContent = t; b.classList.toggle('show', !!t);
      if (t) gsap.fromTo(b, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
    }
    mark() {
      const k = this.actions.length - 1, c = this.el.querySelector(`.pc[data-i="${k}"]`);
      if (!c) return;
      c.classList.add(this.level.target[k] === this.actions[k] ? 'ok' : 'bad');
      gsap.fromTo(c, { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    }
    async exec(o) {
      if (o.op === 'loop' || o.op === 'call') { await sleep(110); return true; }
      if (o.op === 'light' || o.op === 'off') {
        const c = o.op === 'off' ? 'off' : o.arg, k = this.lit++;
        this.actions.push(c); this.mark();
        this.siraj.setChest(c === 'off' ? '#3a3d58' : LC()[c]);
        const l = this.el.querySelector(`.lt[data-i="${k}"]`);
        if (l) {
          const want = this.level.free ? c : this.level.target.filter(isLight)[k];
          l.classList.add(c === 'off' ? 'dark' : 'on', want === c ? 'ok' : 'bad');
          if (c !== 'off') l.style.setProperty('--on', LC()[c]);
          gsap.fromTo(l.querySelector('.lt-bulb'), { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
        } else gsap.fromTo(this.el.querySelector('.lt-row'), { x: -6 }, { x: 0, duration: 0.3, ease: 'elastic.out(3,0.3)' });
        if (c === 'off') Sfx.tap(); else Sfx.spark();
        await sleep(380);
      } else if (o.op === 'say') {
        this.actions.push('say:' + o.arg); this.mark();
        this.bubble(String(o.arg));
        const i = Talk.key(o.arg);
        Voice.play(i >= 0 ? 'ph_' + i : 'ph_x', i >= 0 ? SIRAJ_TEXTS.PHRASES[i][1] : String(o.arg), undefined, OUT);
        await this.siraj.talk(950); await sleep(200); this.bubble('');
      } else if (o.op === 'wave') { this.actions.push('wave'); this.mark(); Sfx.tap(); await done(this.siraj.wave()); }
      else if (o.op === 'jump') { this.actions.push('jump'); this.mark(); Sfx.hop(); await done(this.siraj.jump()); Sfx.land(); }
      else if (o.op === 'dance') {
        this.actions.push('dance'); this.mark();
        // المدينة كلها ترقص معه: المصابيح المضاءة تهتز
        Sfx.spark();
        gsap.fromTo(this.el.querySelectorAll('.lt.on .lt-bulb'), { y: 0 }, { y: -10, duration: 0.2, yoyo: true, repeat: 3, stagger: 0.05, ease: 'sine.inOut' });
        await done(this.siraj.dance());
      }
      return true;
    }
    result() {
      const t = this.level.target, a = this.actions;
      if (this.level.free) return a.length ? { ok: true } : { ok: false, reason: 'party_short' };
      const ok = t.length === a.length && t.every((x, i) => x === a[i]);
      if (ok) return { ok };
      return { ok, reason: a.length < t.length ? 'party_short' : a.length > t.length ? 'party_long' : 'party_order' };
    }
    // وضع الصغار: الضغطة الغلط ترجع خطوة واحدة
    wrong() { if (this.level.free) return null; const k = this.actions.length - 1; return k >= this.level.target.length ? 'party_long' : this.actions[k] !== this.level.target[k] ? 'party_order' : null; }
    pop() {
      const k = this.actions.length - 1, a = this.actions.pop(), c = this.el.querySelector(`.pc[data-i="${k}"]`);
      if (c) c.classList.remove('ok', 'bad');
      if (isLight(a)) { const l = this.el.querySelector(`.lt[data-i="${--this.lit}"]`); if (l) { l.className = 'lt'; l.style.removeProperty('--on'); } }
    }
    celebrate() {
      Sfx.light();
      gsap.fromTo(this.el.querySelectorAll('.lt-bulb'), { y: 0 }, { y: -14, duration: 0.22, yoyo: true, repeat: 3, stagger: 0.07, ease: 'sine.inOut' });
      const r = this.el.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, (this.level.target || []).filter(c => LC()[c]).map(c => LC()[c]).concat(['#fff', '#ff6b9a']));
      return done(this.siraj.dance()).then(() => done(this.siraj.happy()));
    }
    destroy() { this.siraj && this.siraj.destroy(); }
  }

  /* ---------- صناديق الذاكرة ---------- */
  // كل متغيّر صندوق عليه اسمه بالإنجليزي، وجواه حبات بعدد الرقم. علامة 🎯 تبيّن الرقم المطلوب.
  const vEmoji = n => Blocks.VARS[n] || '📦';
  class VarsStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; }
    mount() {
      const says = this.level.says || [];
      this.el.innerHTML = `<div class="vars-stage${says.length ? '' : ' no-plan'}">
        ${says.length ? `<div class="plan">${says.map((n, i) => `<span class="pc" data-i="${i}">💬<small>${n}</small></span>`).join('<i>←</i>')}</div>` : ''}
        <div class="vboxes"></div><div class="say-bubble" id="sayBubble"></div><div class="siraj-holder vsiraj"></div></div>`;
      this.siraj = Siraj.create(this.el.querySelector('.vsiraj'), this.color);
      this.reset();
    }
    reset() {
      this.vals = {}; this.said = []; this.failReason = null;
      const want = this.level.target || {};
      this.names = (this.level.vars || []).slice();
      Object.keys(want).forEach(n => { if (!this.names.includes(n)) this.names.push(n); });
      this.el.querySelector('.vboxes').innerHTML = this.names.map(n => this.boxHtml(n)).join('');
      this.names.forEach(n => this.paint(n));
      this.el.querySelectorAll('.pc').forEach(c => c.classList.remove('ok', 'bad'));
      this.bubble('');
    }
    boxHtml(n) {
      const w = (this.level.target || {})[n];
      return `<div class="vbox" data-n="${esc(n)}"><div class="vb-items"></div><div class="vb-front"><b class="vb-val"></b></div>
        <div class="vb-label" dir="ltr">${vEmoji(n)} ${esc(n)}</div>${w != null ? `<div class="vb-want">🎯 ${w}</div>` : ''}</div>`;
    }
    box(n) {
      let b = this.el.querySelector(`.vbox[data-n="${CSS.escape(n)}"]`);
      if (!b) { this.names.push(n); this.el.querySelector('.vboxes').insertAdjacentHTML('beforeend', this.boxHtml(n)); b = this.el.querySelector(`.vbox[data-n="${CSS.escape(n)}"]`); gsap.from(b, { scale: 0, duration: 0.4, ease: 'back.out(2)' }); }
      return b;
    }
    paint(n) {
      const b = this.box(n), v = this.vals[n];
      // الصغار: الصندوق الفاضي = صفر (وسراج يقول صفر لو سألناه)، فنكتب 0 بدل ؟
      b.querySelector('.vb-val').textContent = v == null ? (this.little ? '0' : '?') : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v);
      b.classList.toggle('empty', v == null && !this.little);
      const k = Number.isInteger(v) && v > 0 && v <= 12 ? v : 0;
      b.querySelector('.vb-items').innerHTML = Array.from({ length: k }, () => `<i>${vEmoji(n)}</i>`).join('');
      const w = (this.level.target || {})[n];
      b.classList.toggle('match', w != null && v === w);
    }
    bubble(t) {
      const b = this.el.querySelector('#sayBubble');
      b.textContent = t; b.classList.toggle('show', t !== '');
      if (t !== '') gsap.fromTo(b, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
    }
    empty(n) {
      this.failReason = 'var_empty';
      const b = this.box(n);
      gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(3,0.3)' });
      Sfx.bump();
      return false;
    }
    async speak(v) {
      const k = this.said.length;
      this.said.push(v);
      const c = this.el.querySelector(`.pc[data-i="${k}"]`), says = this.level.says || [];
      if (c) { c.classList.add(says[k] === v ? 'ok' : 'bad'); gsap.fromTo(c, { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }); }
      this.bubble(String(v));
      if (typeof v === 'number') sayNum(v);
      await this.siraj.talk(800);
      this.bubble('');
    }
    async exec(o) {
      if (o.op === 'loop' || o.op === 'call') { await sleep(110); return true; }
      if (o.op === 'set') {
        this.vals[o.name] = o.arg; this.paint(o.name); Sfx.snap();
        gsap.fromTo(this.box(o.name).querySelector('.vb-val'), { scale: 1.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
        await sleep(o.loopvar ? 150 : 350);
      } else if (o.op === 'add') {
        let v = this.vals[o.name];
        if (v == null) { if (!this.little) return this.empty(o.name); v = 0; }
        this.vals[o.name] = v + o.arg; this.paint(o.name); Sfx.hop();
        const b = this.box(o.name);
        b.insertAdjacentHTML('beforeend', `<span class="vb-plus">${o.arg > 0 ? '+' : '−'}${Math.abs(o.arg)}</span>`);
        const p = b.querySelector('.vb-plus:last-child');
        gsap.fromTo(p, { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: 0.8, onComplete: () => p.remove() });
        await sleep(420);
      } else if (o.op === 'sayvar') {
        const v = this.vals[o.name];
        if (v == null) { if (!this.little) return this.empty(o.name); }
        await this.speak(v == null ? 0 : v);
      } else if (o.op === 'say') await this.speak(o.arg);
      else if (o.op === 'wave') await done(this.siraj.wave());
      else if (o.op === 'jump') await done(this.siraj.jump());
      return true;
    }
    result() {
      if (this.failReason) return { ok: false, reason: this.failReason };
      const want = this.level.target || {}, says = this.level.says || [];
      if (Object.entries(want).some(([n, v]) => this.vals[n] !== v)) return { ok: false, reason: 'var_wrong' };
      if (says.length !== this.said.length || says.some((v, i) => this.said[i] !== v)) return { ok: false, reason: 'var_say' };
      return { ok: true };
    }
    wrong() {
      const says = this.level.says || [];
      return this.said.some((v, i) => says[i] !== v) ? 'var_say' : null;
    }
    celebrate() {
      const r = this.el.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
      gsap.fromTo(this.el.querySelectorAll('.vbox'), { y: 0 }, { y: -16, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.1 });
      return done(this.siraj.happy());
    }
    destroy() { this.siraj && this.siraj.destroy(); }
  }

  /* ---------- صور "ماذا سيحدث؟" ---------- */
  // يرسم اختياراً صغيراً حسب نوع المسرح: خطة كلام، صف أضواء، رسمة، أو رقم
  function preview(kind, c) {
    if (kind === 'talk') return `<div class="pv-talk">${c.map(a => `<span class="pc">${talkChip(a)}</span>`).join('')}</div>`;
    if (kind === 'lights') return `<div class="pv-lights">${c.map(x => `<i style="background:${x === 'off' ? '#2a2d4a' : LC()[x]}"></i>`).join('')}</div>`;
    if (kind === 'vars') return `<div class="pv-num">💬 ${esc(c)}</div>`;
    if (kind === 'draw') {
      const xs = c.flatMap(s => [s[0], s[2]]), ys = c.flatMap(s => [s[1], s[3]]);
      const x0 = Math.min(...xs, 0) - 0.5, y0 = Math.min(...ys, 0) - 0.5, w = Math.max(...xs, 0) - x0 + 0.5, h = Math.max(...ys, 0) - y0 + 0.5;
      const sz = Math.max(w, h);
      return `<svg class="pv-draw" viewBox="${x0} ${y0} ${sz} ${sz}"><g stroke="#16a865" stroke-width="${sz / 14}" stroke-linecap="round">${c.map(s => `<line x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}"/>`).join('')}</g></svg>`;
    }
    return '';
  }

  /* ---------- جزيئات الاحتفال ---------- */
  const FX = (() => {
    const cv = document.getElementById('fx'), g = cv.getContext('2d');
    let parts = [], running = false;
    const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
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

  root.Stages = { talk: TalkStage, draw: DrawStage, path: PathStage, lights: LightsStage, vars: VarsStage, party: PartyStage, preview };
  root.FX = FX;
  root.Talk = Talk;
})(window);

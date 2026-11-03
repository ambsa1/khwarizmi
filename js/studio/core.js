/* استوديو سراج: الطفل (٧+) يصنع عرضه بنفسه بالبطاقات التي يعرفها، بدل حل مرحلة.
   نفس عقد الأقسام الأخرى: STUDIO.render(app, ctx) و STUDIO.destroy()، و ctx = { player, playSeq, say, sfx, Siraj, fx, saveProgress, back }.
   يعيد استخدام: Blocks.makeWorkspace/compile/python/load (js/blocks.js)، ومسرح الرسم Stages.draw (js/activities.js)، وسراج (js/siraj.js).
   المشاريع محفوظة في player.studio = [ { id, e, t, sc, c, prog, ts } ] (حدّ ٦)، و prog بصيغة Blocks.load: [[النوع، الحقول، الداخل]] */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const done = tl => new Promise(r => (tl && tl.then ? tl.then(r) : r()));
  const T = () => root.STUDIO_TEXTS || {};
  const OUT = { pri: 'feedback', force: true, again: true }; // كلام سراج أثناء العرض = ناتج البرنامج
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const MAX = 6, MAX_BLOCKS = 40, LAMPS = 6, AREA = [-2, -1, 2, 1];
  const SCENES = [
    { id: 'city', name: 'المَدينَة', e: '🌃', grad: ['#2b2f7a', '#12153a'], ground: '#241d4a', props: ['🌙', '🏙️', '⭐'] },
    { id: 'beach', name: 'الشاطِئ', e: '🏖️', grad: ['#8fd8ff', '#fff3c4'], ground: '#f3cf7a', props: ['☀️', '🌴', '⛵'] },
    { id: 'space', name: 'الفَضاء', e: '🚀', grad: ['#0b0f2e', '#2a1050'], ground: '#3a2d66', props: ['🪐', '🌟', '🛸'] },
    { id: 'theater', name: 'المَسْرَح', e: '🎭', grad: ['#6a0f2a', '#b3173f'], ground: '#4a2a12', props: ['🎪', '✨', '🎵'] },
  ];
  const PROP_POS = [[0.1, 0.22], [0.9, 0.3], [0.86, 0.72]]; // مواقع الرموز (نسبة من العرض والارتفاع)
  const COLORS = ['#3d8bff', '#e8579a', '#16a865', '#f08a24', '#8b5cf6'];
  const TYPES = ['siraj_say', 'siraj_wave', 'siraj_jump', 'pen_forward', 'pen_right', 'pen_left',
    'light_on:red', 'light_on:yellow', 'light_on:green', 'light_on:blue', 'light_on:purple', 'light_off', 'siraj_repeat', 'func_def', 'func_call'];
  const ALLOWED = new Set(TYPES.map(s => s.split(':')[0]));
  const sceneOf = id => SCENES.find(s => s.id === id) || SCENES[0];

  /* ---------- البرنامج ⇄ قائمة محفوظة ---------- */
  function serialize(ws) {
    const walk = b => {
      const out = [];
      for (; b; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        const fields = {};
        b.inputList.forEach(inp => inp.fieldRow.forEach(f => { if (f.name && f.isSerializable && f.isSerializable()) fields[f.name] = String(b.getFieldValue(f.name)); }));
        const step = [b.type, fields];
        if (b.getInput('DO')) step.push(walk(b.getInputTargetBlock('DO')));
        out.push(step);
      }
      return out;
    };
    return walk(Blocks.startOf(ws).getNextBlock());
  }
  // قائمة من الذاكرة قد تكون تالفة: نقبل الأنواع المعروفة فقط، وبعمق وعدد محدودين
  function sanitize(list, depth = 0, budget = { n: 60 }) {
    if (!Array.isArray(list) || depth > 4) return [];
    const out = [];
    for (const s of list) {
      const [type, fields, inner] = Array.isArray(s) ? s : [s];
      if (typeof type !== 'string' || !ALLOWED.has(type) || !(root.Blockly && Blockly.Blocks[type]) || budget.n-- <= 0) continue;
      const f = {};
      if (fields && typeof fields === 'object') for (const [k, v] of Object.entries(fields)) if (/^[A-Z0-9_]{1,8}$/.test(k) && (typeof v === 'string' || typeof v === 'number')) f[k] = String(v).slice(0, 40);
      const step = [type, f];
      if (inner) step.push(sanitize(inner, depth + 1, budget));
      out.push(step);
    }
    return out;
  }
  const flatTypes = list => list.flatMap(s => [s[0]].concat(s[2] ? flatTypes(s[2]) : []));
  const emojiOf = prog => { const t = new Set(flatTypes(prog)); return t.has('light_on') ? '💡' : t.has('pen_forward') ? '✏️' : t.has('siraj_say') ? '💬' : '🤖'; };

  /* ---------- المسرح: مشهد + مصابيح + لوحة الرسم (مسرح الرسم نفسه) وسراج هو القلم ---------- */
  class StudioStage {
    constructor(el, scene, color, voice) { this.el = el; this.scene = scene; this.color = color; this.voice = voice; }
    mount() {
      const sc = this.scene;
      this.el.innerHTML = `<div class="st-stage st-sc-${sc.id}">
        <div class="st-props">${sc.props.map(p => `<span class="st-prop">${p}</span>`).join('')}</div>
        <div class="st-ground"></div>
        <div class="st-lamps">${Array.from({ length: LAMPS }, (_, i) => `<i class="st-lamp" data-i="${i}"></i>`).join('')}</div>
        <div class="st-draw"></div>
        <div class="st-bub"></div></div>`;
      // لوحة الرسم الحقيقية من المراحل (اللعب الحر): شبكة ثابتة بلا هدف
      this.draw = new Stages.draw(this.el.querySelector('.st-draw'), { start: [0, 0, 0], target: [], area: AREA, free: true }, this.color);
      this.draw.mount();
      this.mini = this.draw.mini;
      this.seq = [];
      // لو حجم المسرح تغيّر (تدوير التلفون): اللوحة تتبعه
      let t;
      this.ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => this.relayout(), 60); });
      this.ro.observe(this.el);
    }
    relayout() {
      if (!this.draw || !this.el.isConnected) return;
      const d = this.draw, keep = { x: d.x, y: d.y, h: d.h, lines: d.lines };
      d.layout(); Object.assign(d, keep); d.draw(); d.placePen(true);
    }
    reset() {
      this.seq = [];
      this.draw.reset();
      this.bubble('');
      this.el.querySelectorAll('.st-lamp').forEach(l => { l.className = 'st-lamp'; l.style.removeProperty('--on'); });
      if (this.mini) this.mini.setChest('#ffd23e');
    }
    bubble(t) {
      const b = this.el.querySelector('.st-bub');
      if (!b) return;
      b.textContent = t; b.classList.toggle('show', !!t);
      if (t && root.gsap) gsap.fromTo(b, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: 'back.out(2.5)' });
    }
    async exec(o) {
      const m = this.mini;
      if (o.op === 'say') {
        this.bubble(String(o.arg));
        const i = root.Talk ? Talk.key(o.arg) : -1;
        this.voice(i >= 0 ? 'ph_' + i : 'ph_x', i >= 0 ? SIRAJ_TEXTS.PHRASES[i][1] : String(o.arg));
        await m.talk(950); await sleep(200);
        this.bubble('');
      } else if (o.op === 'wave') { Sfx.tap(); await done(m.wave()); }
      else if (o.op === 'jump') { Sfx.hop(); await done(m.jump()); Sfx.land(); }
      else if (o.op === 'forward' || o.op === 'turn') await this.draw.exec(o);
      else if (o.op === 'light' || o.op === 'off') {
        const c = o.op === 'off' ? 'off' : o.arg, k = this.seq.length % LAMPS, col = c === 'off' ? '#3a3d58' : Blocks.LIGHTS[c] || '#fff';
        this.seq.push(c);
        m.setChest(col);
        const l = this.el.querySelector(`.st-lamp[data-i="${k}"]`);
        if (l) {
          l.className = 'st-lamp ' + (c === 'off' ? 'dark' : 'on');
          if (c !== 'off') l.style.setProperty('--on', col);
          if (root.gsap) gsap.fromTo(l, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
        }
        if (c === 'off') Sfx.tap(); else Sfx.spark();
        await sleep(380);
      } else await sleep(110);
      return true;
    }
    // صورة العرض: المشهد + المصابيح + الرسمة + سراج في مكانه
    async snapshot() {
      const sc = this.scene, d = this.draw, W = d.W || this.el.clientWidth || 320, H = d.H || this.el.clientHeight || 200, k = 2;
      const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
      const g = c.getContext('2d'); g.scale(k, k);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sc.grad[0]); gr.addColorStop(1, sc.grad[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = sc.ground; g.fillRect(0, H * 0.86, W, H * 0.14);
      g.font = `${Math.round(H * 0.11)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
      PROP_POS.forEach(([x, y], i) => { if (sc.props[i]) g.fillText(sc.props[i], W * x, H * y); });
      const lamps = this.el.querySelectorAll('.st-lamp'), gap = 30, x0 = W / 2 - (lamps.length - 1) * gap / 2;
      lamps.forEach((l, i) => {
        g.beginPath(); g.arc(x0 + i * gap, 22, 10, 0, 7);
        g.fillStyle = l.classList.contains('on') ? l.style.getPropertyValue('--on') || '#fff' : l.classList.contains('dark') ? '#1b1d33' : '#3a3d58';
        g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.8)'; g.stroke();
      });
      if (d.cv) g.drawImage(d.cv, 0, 0, W, H);
      try { await this.drawSiraj(g); } catch (e) { /* الصورة بدون سراج أفضل من لا صورة */ }
      return c;
    }
    drawSiraj(g) {
      const pen = this.el.querySelector('.pen-siraj');
      if (!pen || !root.Siraj || !Siraj.svg) return Promise.resolve();
      const s = parseFloat(pen.style.width) || 60, x = root.gsap ? +gsap.getProperty(pen, 'x') : 0, y = root.gsap ? +gsap.getProperty(pen, 'y') : 0;
      const img = new Image();
      return new Promise(res => {
        const t = setTimeout(res, 900);
        img.onload = () => { clearTimeout(t); try { g.drawImage(img, x, y, s, s); this.sirajDrawn = true; } catch (e) { /* */ } res(); };
        img.onerror = () => { clearTimeout(t); res(); };
        // صورة SVG مستقلة لازم لها xmlns ومقاس، وإلا المتصفح ما يرسمها
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Siraj.svg(this.color, { shadow: false }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" '));
      });
    }
    destroy() { if (this.ro) this.ro.disconnect(); this.draw && this.draw.destroy(); }
  }

  /* ---------- الجلسة ---------- */
  let S = null;
  function session(rootEl, ctx) {
    const P = ctx.player || { name: '', age: 7, gender: 'b', color: '#3d8bff', progress: {}, seen: {} };
    if (!Array.isArray(P.studio)) P.studio = [];
    if (!P.seen) P.seen = {};
    const girl = P.gender === 'g';
    const sfx = ctx.sfx || root.Sfx || new Proxy({}, { get: () => () => {} });
    const fx = () => ctx.fx || root.FX || null;
    let ws = null, stage = null, timers = [], run = 0, running = false, closed = false, lock = 0;
    let cur = null, scene = SCENES[0], color = /^#[0-9a-f]{6}$/i.test(P.color || '') ? P.color : COLORS[0], shot = null, screenId = '';
    const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
    const $ = s => rootEl.querySelector(s);

    const line = k => { const X = T(), kk = girl && X[k + '_f'] ? k + '_f' : k; return X[kk] ? [kk, X[kk]] : null; };
    function speak(keys, opts) {
      const items = [].concat(keys).map(line).filter(Boolean);
      if (!items.length || closed) return;
      const o = opts || { pri: 'instruction' };
      try { if (ctx.playSeq) ctx.playSeq(items, o); else if (root.Voice) Voice.playSeq(items, o); } catch (e) { /* الصوت اختياري */ }
    }
    const voiceOut = (k, t) => { try { if (ctx.say) ctx.say(k, t, OUT); else if (root.Voice) Voice.play(k, t, undefined, OUT); } catch (e) { /* */ } };
    const persist = () => { try { if (root.Store && Store.save) Store.save(); } catch (e) { /* */ } };
    const seen = k => !!P.seen[k];
    const markSeen = k => { try { if (root.Store && Store.setSeen) Store.setSeen(P, k, true); else P.seen[k] = true; } catch (e) { P.seen[k] = true; } };

    function teardown() {
      run++; running = false;
      timers.forEach(clearTimeout); timers = [];
      if (ws) { try { Blocks.dispose(ws); } catch (e) { /* */ } ws = null; }
      if (stage) { stage.destroy(); stage = null; }
      if (root.gsap) gsap.killTweensOf(rootEl.querySelectorAll('*'));
    }
    function screen(html, cls) {
      teardown();
      lock = Date.now() + 300;
      rootEl.innerHTML = `<div class="st ${cls || ''}" dir="rtl">${html}</div>`;
    }
    const title = p => `${p.e || '🎬'} ${p.t || ''}`;
    const bar = (back, extra) => `<header class="bar st-bar"><button class="ib" data-st="${back}" aria-label="رجوع">→</button>
      <span class="t" id="stTitle">🎬 اسْتوديو سِراج</span>${extra || ''}<button class="ib" data-st="replay" aria-label="اسمع">🔊</button></header>`;

    /* ---------- الرفّ: المشاريع المحفوظة ---------- */
    function home() {
      screenId = 'home';
      const full = P.studio.length >= MAX;
      screen(`${bar('exit')}
        <div class="st-home">
          <button class="st-new ${full ? 'off' : ''}" data-st="new" aria-disabled="${full}">✨ عَرْضٌ جَديد</button>
          <div class="st-grid">${P.studio.map(p => `<div class="st-card" data-id="${esc(p.id)}">
            <button class="st-open" data-st="open" data-id="${esc(p.id)}"><span class="st-ce">${esc(p.e || '🎬')}</span><b>${esc(p.t || '')}</b><small>${esc(sceneOf(p.sc).e)} ${esc(sceneOf(p.sc).name)}</small></button>
            <button class="st-del" data-st="del" data-id="${esc(p.id)}" aria-label="احذف العرض">🗑</button></div>`).join('')}</div>
          ${P.studio.length ? '' : '<p class="st-hint">اضْغَطْ «عَرْضٌ جَديد» وَاصْنَعْ أَوَّلَ عَرْضٍ لَك!</p>'}
          <p class="st-count">${AR(P.studio.length)} / ${AR(MAX)}</p>
        </div>`, 'st-shelf');
      if (!seen('st_intro')) { markSeen('st_intro'); later(() => speak(['st_hello', 'st_pick', 'st_cards']), 400); }
    }

    /* ---------- المحرّر ---------- */
    function editor(p) {
      screenId = 'edit';
      cur = p || null; shot = null;
      if (cur) { scene = sceneOf(cur.sc); if (/^#[0-9a-f]{6}$/i.test(cur.c || '')) color = cur.c; }
      const share = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
      screen(`${bar('home', '<button class="ib" data-st="pick" aria-label="المكان واللون">🎨</button><button class="ib" data-st="save" aria-label="احفظ">💾</button>')}
        <section class="st-stagewrap"><div class="st-stageel"></div>
          <div class="st-panel" hidden>
            <div class="st-row">${SCENES.map(s => `<button class="st-opt ${s.id === scene.id ? 'sel' : ''}" data-st="scene" data-id="${s.id}" aria-label="${esc(s.name)}">${s.e}</button>`).join('')}</div>
            <div class="st-row">${COLORS.map(c => `<button class="st-opt st-col ${c === color ? 'sel' : ''}" data-st="color" data-c="${c}" style="--c:${c}" aria-label="لون"></button>`).join('')}</div>
          </div>
          <div class="st-toast"></div></section>
        <section class="st-editor"><div class="st-ws ws" dir="ltr"></div>
          <div class="st-py"><button class="st-pyhead" data-st="py">🐍 Python <span class="st-cnt"></span></button><pre dir="ltr"></pre></div></section>
        <footer class="st-controls"><button class="st-run" data-st="run">▶ شَغِّل</button>
          <button class="st-sq" data-st="delb" aria-label="احذف البطاقة">🗑</button><button class="st-sq" data-st="undo" aria-label="تراجع">↶</button><button class="st-sq" data-st="reset" aria-label="من البداية">↺</button></footer>
        <div class="st-modal" hidden><div class="st-mcard"><h2>🎉 عَرْضٌ رائِع!</h2><img class="st-shot" alt="">
          <div class="st-macts"><button class="st-sq" data-st="again" aria-label="مرة أخرى">↻</button><button class="st-sq" data-st="save" aria-label="احفظ">💾</button>
          <button class="st-sq" data-st="png" aria-label="احفظ الصورة">📷</button>${share ? '<button class="st-sq" data-st="share" aria-label="شارك">📤</button>' : ''}
          <button class="st-sq" data-st="close" aria-label="إغلاق">✖</button></div></div></div>`, 'st-edit');
      $('#stTitle').textContent = cur ? title(cur) : '🎬 عَرْضٌ جَديد';
      mountStage();
      ws = Blocks.makeWorkspace($('.st-ws'), TYPES, MAX_BLOCKS, onWs);
      if (cur && cur.prog) { Blocks.load(ws, sanitize(cur.prog), Blocks.startOf(ws).nextConnection); ws.clearUndo(); }
      updateCode();
      later(() => speak(cur ? 'st_open' : 'st_new'), 350);
      later(() => { if (ws && !running) Blocks.peek(ws); }, 1600);
    }
    function mountStage() {
      if (stage) stage.destroy();
      stage = new StudioStage($('.st-stageel'), scene, color, voiceOut);
      stage.mount();
    }
    function onWs(e) {
      if (closed || !ws) return;
      if (e.full) { toast('البِطاقاتُ كَثيرَة! احْذِفْ بَعْضَها.', 'bad'); sfx.oops(); return; }
      updateCode();
    }
    const hl = l => esc(l)
      .replace(/&quot;(.*?)&quot;/g, '<b class="s">&quot;<bdi>$1</bdi>&quot;</b>')
      .replace(/\b(for|in|range|pass|if|elif|else|while|def)\b/g, '<b class="k">$1</b>')
      .replace(/\b([a-z_]+)(?=\()/g, '<b class="f">$1</b>')
      .replace(/\b(\d+)\b/g, '<b class="n">$1</b>');
    function updateCode(activeId) {
      const pre = $('.st-py pre'), cnt = $('.st-cnt');
      if (!ws || !pre) return;
      const { lines, map } = Blocks.python(ws);
      const c = activeId != null ? map[activeId] : -1;
      pre.innerHTML = lines.length ? lines.map((l, i) => `<span class="ln ${i === c ? 'cur' : ''}"><i>${i + 1}</i>${hl(l)}</span>`).join('') : '<span class="ln muted"><i>1</i># start</span>';
      if (cnt) cnt.textContent = `${Blocks.countBlocks(ws)}/${MAX_BLOCKS}`;
      const el = pre.querySelector('.cur');
      if (el) pre.scrollTop = el.offsetTop - pre.clientHeight / 2;
    }
    let toastT;
    function toast(text, kind) {
      const t = $('.st-toast'); if (!t) return;
      t.textContent = text; t.className = 'st-toast show ' + (kind || '');
      clearTimeout(toastT); toastT = later(() => { t.className = 'st-toast'; }, 2600);
    }

    /* ---------- التشغيل ---------- */
    async function play() {
      if (running || !ws || !stage) return;
      const ops = Blocks.compile(ws);
      if (!ops.length || ops[0].op === 'error') { toast(T().st_empty || '', 'bad'); speak('st_empty', { pri: 'feedback', cut: true }); return; }
      const my = ++run, w = ws, st = stage, alive = () => my === run && !closed;
      running = true; shot = null;
      rootEl.querySelectorAll('.st-run, .st-controls .st-sq').forEach(b => { b.disabled = true; });
      try { if (root.Voice) Voice.stop(); } catch (e) { /* */ }
      st.reset(); w.highlightBlock(null);
      try {
        await sleep(200);
        for (const o of ops) {
          if (!alive()) return;
          if (o.op === 'error') { sfx.bump(); break; }
          w.highlightBlock(o.id); updateCode(o.id);
          await st.exec(o);
        }
        if (!alive()) return;
        w.highlightBlock(null); updateCode();
        sfx.win();
        const r = $('.st-stageel') && $('.st-stageel').getBoundingClientRect();
        if (fx() && r) fx().burst(r.left + r.width / 2, r.top + r.height / 2, 36, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
        speak('st_bravo', { pri: 'feedback' });
        shot = await st.snapshot();
        if (!alive()) return;
        const m = $('.st-modal'), img = m && m.querySelector('.st-shot');
        if (img) { img.src = shot.toDataURL('image/png'); m.hidden = false; lock = Date.now() + 300; }
      } finally { if (alive()) { running = false; rootEl.querySelectorAll('.st-run, .st-controls .st-sq').forEach(b => { b.disabled = false; }); } }
    }
    const closeModal = () => { const m = $('.st-modal'); if (m) m.hidden = true; };

    /* ---------- الحفظ والتصدير ---------- */
    function save() {
      if (!ws) return false;
      const prog = serialize(ws);
      if (!prog.length) { toast(T().st_empty || '', 'bad'); speak('st_empty', { pri: 'feedback', cut: true }); return false; }
      if (!cur) {
        if (P.studio.length >= MAX) { toast(T().st_full || '', 'bad'); speak('st_full', { pri: 'feedback', cut: true }); return false; }
        cur = { id: uid(), t: `${scene.name} ${AR(P.studio.length + 1)}`, ts: Date.now() };
        P.studio.push(cur);
      }
      Object.assign(cur, { e: emojiOf(prog), sc: scene.id, c: color, prog, ts: Date.now() });
      persist();
      sfx.snap();
      const tt = $('#stTitle'); if (tt) tt.textContent = title(cur);
      toast('💾 ' + (T().st_saved || ''), 'tip'); speak('st_saved', { pri: 'feedback', cut: true });
      return true;
    }
    function remove(id) {
      const i = P.studio.findIndex(p => p.id === id);
      if (i < 0) return;
      P.studio.splice(i, 1); persist(); sfx.tap();
      speak('st_deleted', { pri: 'feedback', cut: true });
      home();
    }
    const fileName = () => ((cur && cur.t) || 'عرضي').replace(/[\\/:*?"<>|]/g, '') + '-سراج.png';
    async function picture() { return shot || (stage ? (shot = await stage.snapshot()) : null); }
    // نفس طريقة «احفظ رسمتي» في اللعب الحر: ملف PNG يُنزَّل
    async function exportPng() {
      const c = await picture(); if (!c) return;
      sfx.snap();
      c.toBlob(b => {
        if (!b) return;
        const u = URL.createObjectURL(b), a = document.createElement('a');
        a.href = u; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 5000);
      }, 'image/png');
    }
    async function share() {
      const c = await picture(); if (!c) return;
      c.toBlob(async b => {
        if (!b) return;
        try {
          const f = new File([b], 'siraj-show.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: (cur && cur.t) || 'استوديو سراج' });
          else await navigator.share({ title: 'استوديو سراج', text: (cur && cur.t) || '' });
        } catch (e) { /* الطفل ألغى المشاركة */ }
      }, 'image/png');
    }
    function setScene(id) { scene = sceneOf(id); mountStage(); rootEl.querySelectorAll('[data-st="scene"]').forEach(b => b.classList.toggle('sel', b.dataset.id === id)); sfx.tap(); }
    function setColor(c) { if (!/^#[0-9a-f]{6}$/i.test(c)) return; color = c; mountStage(); rootEl.querySelectorAll('[data-st="color"]').forEach(b => b.classList.toggle('sel', b.dataset.c === c)); sfx.tap(); }

    const ACT = {
      exit: () => { sfx.tap(); if (ctx.back) ctx.back(); },
      home: () => { sfx.tap(); home(); },
      replay: () => { sfx.tap(); speak(screenId === 'home' ? ['st_hello', 'st_pick', 'st_cards'] : 'st_cards', { pri: 'instruction', force: true }); },
      new: () => { if (P.studio.length >= MAX) { speak('st_full', { pri: 'feedback', cut: true }); sfx.oops(); return; } sfx.tap(); editor(null); },
      open: b => { const p = P.studio.find(x => x.id === b.dataset.id); if (p) { sfx.tap(); editor(p); } },
      del: b => remove(b.dataset.id),
      pick: () => { const p = $('.st-panel'); if (p) p.hidden = !p.hidden; sfx.tap(); },
      scene: b => setScene(b.dataset.id),
      color: b => setColor(b.dataset.c),
      save: () => { if (!running) save(); },
      py: () => { const p = $('.st-py'); if (p) p.classList.toggle('folded'); },
      run: () => play(),
      delb: () => { if (!running && ws && ws.__del()) sfx.tap(); },
      undo: () => { if (!running && ws) { ws.undo(false); sfx.tap(); } },
      reset: () => { if (!running && stage) { stage.reset(); if (ws) { ws.highlightBlock(null); updateCode(); } sfx.tap(); } },
      again: () => { closeModal(); if (stage) stage.reset(); },
      png: () => exportPng(),
      share: () => share(),
      close: () => closeModal(),
    };
    function onClick(e) {
      const b = e.target.closest && e.target.closest('[data-st]');
      if (!b || !rootEl.contains(b) || closed) return;
      if (e.isTrusted && Date.now() < lock) return; // لمسة شبح من الشاشة السابقة
      if (b.getAttribute('aria-disabled') === 'true') return;
      const f = ACT[b.dataset.st];
      if (f) f(b);
    }
    rootEl.addEventListener('click', onClick);

    return {
      home, editor, play, save, remove, exportPng, snapshot: picture, setScene, setColor, refresh: () => updateCode(),
      get ws() { return ws; }, get stage() { return stage; }, get project() { return cur; }, get running() { return running; },
      close() { if (closed) return; closed = true; teardown(); rootEl.removeEventListener('click', onClick); rootEl.innerHTML = ''; },
    };
  }

  const STUDIO = root.STUDIO = {
    SCENES, COLORS, TYPES, MAX, MAX_BLOCKS, serialize, sanitize,
    render(rootEl, ctx) { if (S) S.close(); S = session(rootEl, ctx || {}); S.home(); return { destroy: STUDIO.destroy }; },
    destroy() { if (S) S.close(); S = null; },
    get _s() { return S; },
  };
})(window);

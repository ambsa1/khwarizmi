/* عالم الكمبيوتر: الإطار العام (قائمة الأقسام ← قائمة الأنشطة ← النشاط)
   كل قسم يسجّل نفسه بـ CW.register، وكل نشاط له mount(el, A) يرجّع { destroy() }.
   A = أدوات النشاط (الصوت، المؤقّتات، السحب، الفوز...) وكلها تتنظّف تلقائياً عند الخروج. */
(function (root) {
  'use strict';

  const plain = s => String(s == null ? '' : s).replace(/[ً-ْٰ]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hasGsap = () => typeof root.gsap !== 'undefined';

  const CW = root.CW = root.CW || {};
  const sections = CW.sections = CW.sections || [];
  CW.art = CW.art || {};
  // يكبّر صندوقاً بنسبة عرض/ارتفاع ثابتة ليملأ المكان المتاح في أبيه
  function fit(box, ratio) {
    const p = box.parentElement; if (!p) return;
    const cs = getComputedStyle(p);
    const w = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = p.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const W = w / h > ratio ? h * ratio : w;
    box.style.width = Math.floor(W) + 'px'; box.style.height = Math.floor(W / ratio) + 'px';
    box.style.fontSize = Math.max(11, W / 40) + 'px';
  }
  CW.util = { plain, esc, rand, pick, shuffle, fit };
  CW.register = sec => { sections.push(sec); sections.sort((a, b) => a.order - b.order); };
  const TXT = () => root.CW_TEXTS || {};

  let S = null; // الجلسة الحالية

  CW.render = function (rootEl, ctx) {
    if (S) S.close();
    S = session(rootEl, ctx || {});
    CW._s = S;
    S.home();
    return { destroy: () => CW.destroy() };
  };
  CW.destroy = () => { if (S) S.close(); S = null; CW._s = null; };

  function session(rootEl, ctx) {
    const P = ctx.player || { name: '', age: 7, gender: 'b', color: '#3d8bff', progress: {} };
    if (!P.progress) P.progress = {};
    const age = Math.max(3, Math.min(12, +P.age || 7));
    const girl = P.gender === 'g';
    const color = /^#[0-9a-f]{6}$/i.test(P.color || '') ? P.color : '#3d8bff';
    const sfx = ctx.sfx || root.Sfx || new Proxy({}, { get: () => () => {} });
    const fx = () => ctx.fx || root.FX || null;
    const SirajLib = ctx.Siraj || ctx.siraj || root.Siraj;
    let lock = 0, teardowns = [], cur = null, barSj = null, onClick = null, closed = false;

    const vkey = k => (girl && TXT()[k + '_f'] ? k + '_f' : k);
    const line = k => { const kk = vkey(k); return [kk, TXT()[kk] || '', kk.startsWith('cw_en_') ? 'en' : undefined]; };
    const text = k => plain(TXT()[vkey(k)] || '');
    let lastSeq = null;
    // كل الصوت يمر بسياسة Voice (sfx.js): opts.pri = instruction|feedback|name|ambient، و force لزر 🔊
    function speak(list, opts) {
      list = (Array.isArray(list) ? list : [list]).filter(Boolean);
      const items = list.map(k => (Array.isArray(k) ? k : line(k))).filter(i => i[1]);
      if (!items.length) return '';
      // زر 🔊 يعيد آخر "تعليمة" (مش آخر اسم أو تشجيع)
      const V = root.Voice, instr = opts && opts.pri ? opts.pri === 'instruction' : !V || !V.cls || list.some(k => typeof k !== 'string' || V.cls(vkey(k)) === 'instruction');
      if (!(opts && opts.noReplay) && instr) lastSeq = list;
      // في الأنشطة كل "نتيجة" هي رد على ضغطة الطفل، فتقطع سؤال الجولة
      const vo = opts ? { pri: opts.pri, force: opts.force, cool: opts.cool, once: opts.once, cut: opts.cut != null ? opts.cut : opts.pri === 'feedback' } : undefined;
      try {
        if (ctx.playSeq) ctx.playSeq(items, vo);
        else if (ctx.play) ctx.play(items, vo);
        else if (root.Voice) root.Voice.playSeq(items, vo);
      } catch (e) { /* الصوت اختياري */ }
      const show = items.slice(0, (opts && opts.show) || items.length);
      const shown = plain(show[0][2] === 'en' ? show[0][1] : show.filter(i => i[2] !== 'en').map(i => i[1]).join(' '));
      if (!(opts && opts.quiet)) bubble(shown);
      if (barSj) barSj.talk(Math.min(4000, 500 + shown.length * 70));
      return shown;
    }
    function bubble(t) { const b = rootEl.querySelector('.cw-bub-t'); if (b && t) { b.textContent = t; if (hasGsap()) gsap.fromTo(b, { opacity: 0.2 }, { opacity: 1, duration: 0.3 }); } }

    const stars = id => +(P.progress['cw:' + id] || 0);
    function save(id, n) {
      const k = 'cw:' + id;
      n = Math.max(0, Math.min(3, n | 0));
      // ctx.saveProgress يستقبل معرّف النشاط بدون البادئة (مثل Store.cwWin)، والمفتاح المحفوظ cw:<id>
      if (ctx.saveProgress) { try { ctx.saveProgress(id, n); } catch (e) { /* لا شيء */ } }
      if ((P.progress[k] || 0) < n) P.progress[k] = n; // لو الـ ctx ما حدّث اللاعب
    }
    const cwStars = () => Object.keys(P.progress).filter(k => k.startsWith('cw:')).reduce((a, k) => a + (+P.progress[k] || 0), 0);

    function teardown() {
      teardowns.splice(0).reverse().forEach(f => { try { f(); } catch (e) { console.warn(e); } });
      if (barSj) { barSj.destroy(); barSj = null; }
      if (hasGsap()) gsap.killTweensOf(rootEl.querySelectorAll('*'));
      lastSeq = null;
    }
    function screen(html, cls) {
      if (cur) closeActivity();
      teardown();
      lock = Date.now() + 300; guard = Date.now() + 250;
      rootEl.innerHTML = `<div class="cw ${cls || ''}" dir="rtl">${html}</div>`;
    }
    // لمسة "شبح" من الضغطة اللي فتحت الشاشة ما توصل للعبة الجديدة (مثلاً تختار إجابة لوحدها)
    let guard = 0;
    const ghost = e => { if (e.isTrusted && Date.now() < guard) { e.stopPropagation(); if (e.type === 'click') e.preventDefault(); } };
    const GHOST = ['pointerdown', 'mousedown', 'touchstart', 'click'];
    GHOST.forEach(ev => rootEl.addEventListener(ev, ghost, true));
    function miniSiraj(el) {
      if (!el || !SirajLib) return null;
      const s = SirajLib.create(el, color, { shadow: false });
      teardowns.push(() => s.destroy());
      return s;
    }
    const secStars = sec => sec.activities.reduce((a, x) => a + (x.summaryStars ? x.summaryStars(stars) : stars(x.id)), 0);
    const ageBadge = m => (m > age ? `<span class="cw-age">${m}+</span>` : '');

    /* ---------- قائمة الأقسام ---------- */
    function home() {
      screen(`<div class="sky"></div>
        <header class="bar"><button class="ib" data-cw="exit" aria-label="رجوع">→</button>
          <span class="cw-bsj" id="cwSj"></span><span class="t">عالم الكمبيوتر</span><span class="chip">⭐ ${cwStars()}</span></header>
        <div class="cw-scroll"><div class="cw-grid cw-secs">
          ${sections.map((s, i) => `<button class="cw-sec ${s.rec && s.rec(age) ? 'rec' : ''} ${s.minAge > age ? 'dim' : ''}" data-cw="sec" data-i="${i}" style="--sc:${s.color}">
            <span class="cw-sec-ic">${s.icon}</span><b>${esc(s.name)}</b>
            <span class="cw-lamps">${s.activities.map(a => `<i class="${(a.summaryStars ? a.summaryStars(stars) : stars(a.id)) ? 'on' : ''}"></i>`).join('')}</span>
            ${ageBadge(s.minAge)}</button>`).join('')}
        </div></div>`, 'night cw-home');
      barSj = miniSiraj(rootEl.querySelector('#cwSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.cw-sec'), { y: 30, opacity: 0, scale: 0.9, stagger: 0.06, duration: 0.45, ease: 'back.out(1.8)' });
      speak(['cw_hello', 'cw_pick_sec'], { quiet: true, once: true }); // الترحيب مرة واحدة في الجلسة (الرجوع من قائمة ما يعيده)
    }

    /* ---------- قائمة الأنشطة ---------- */
    let curSec = null;
    function sectionScreen(sec, silent) {
      curSec = sec;
      screen(`<div class="sky"></div>
        <header class="bar" style="--sc:${sec.color}"><button class="ib" data-cw="home" aria-label="رجوع">→</button>
          <span class="cw-bsj" id="cwSj"></span><span class="t">${sec.icon} ${esc(sec.name)}</span><span class="chip">⭐ ${secStars(sec)}</span></header>
        <div class="cw-scroll"><div class="cw-grid cw-acts">
          ${sec.activities.map((a, i) => {
            const sum = a.summary ? a.summary(stars) : null, st = stars(a.id);
            return `<button class="cw-act ${a.minAge > age ? 'dim' : ''} ${st || (sum && sum.done) ? 'done' : ''}" data-cw="act" data-i="${i}" style="--sc:${sec.color}">
              <span class="cw-act-ic">${a.icon}</span><b>${esc(a.name)}</b>
              <span class="cw-st">${sum ? esc(sum.text) : '★'.repeat(st) + '<i>' + '★'.repeat(3 - st) + '</i>'}</span>${ageBadge(a.minAge)}</button>`;
          }).join('')}
        </div></div>`, 'night cw-list');
      barSj = miniSiraj(rootEl.querySelector('#cwSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.cw-act'), { y: 24, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'back.out(1.8)' });
      if (!silent) speak([sec.voice, 'cw_pick_game'], { quiet: true, once: true }); // اسم القسم مرة واحدة لكل قسم في الجلسة
    }

    /* ---------- النشاط ---------- */
    function openActivity(sec, act) {
      curSec = sec;
      screen(`<header class="bar cw-bar" style="--sc:${sec.color}"><button class="ib" data-cw="back" aria-label="رجوع">→</button>
          <span class="cw-bsj" id="cwSj"></span>
          <div class="cw-bub"><span class="cw-bub-i">${act.icon}</span><span class="cw-bub-t">${esc(act.name)}</span></div>
          <button class="ib" data-cw="replay" aria-label="اسمع مرة أخرى">🔊</button></header>
        <div class="cw-stage" id="cwStage"></div>`, 'cw-play cw-s-' + sec.id);
      barSj = miniSiraj(rootEl.querySelector('#cwSj'));
      const stage = rootEl.querySelector('#cwStage');
      const A = api(sec, act, stage);
      let inst = null;
      try { inst = act.mount(stage, A) || {}; } catch (e) { console.error(e); inst = {}; }
      cur = { sec, act, A, inst };
      CW._act = cur;
    }
    function closeActivity() {
      const c = cur; cur = null; CW._act = null;
      if (!c) return;
      try { if (c.inst && c.inst.destroy) c.inst.destroy(); } catch (e) { console.warn(e); }
      c.A._cleanup();
      if (root.Voice && root.Voice.stop) root.Voice.stop();
    }

    function api(sec, act, stage) {
      const timers = [], ivals = [], rafs = new Set(), offs = [], own = [];
      let alive = true, backHandler = null, resizeT = null;
      const A = {
        el: stage, player: P, age, girl, color, sfx, util: CW.util, art: CW.art, sec, act,
        get alive() { return alive; },
        key: vkey, text, line,
        say: (k, o) => speak(k, o),
        later(fn, ms) { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; },
        // الجولة التالية بعد ما سراج يخلّص جملة الشرح (على الأقل min، وأقصى حد max). بدون صوت: بعد min بس
        afterVoice(fn, min, max) {
          const t0 = Date.now(), V = root.Voice;
          const tick = () => { const el = Date.now() - t0; if (el >= (max || 9000) || !(V && V.busy && V.busy())) fn(); else A.later(tick, 150); };
          return A.later(tick, min || 900);
        },
        every(fn, ms) { const t = setInterval(() => { if (alive) fn(); }, ms); ivals.push(t); return t; },
        wait: ms => new Promise(r => { timers.push(setTimeout(r, ms)); }),
        loop(fn) { // حلقة رسم: fn(dt) ترجع false للإيقاف
          let last = performance.now(), id;
          const step = now => { rafs.delete(id); if (!alive) return; const dt = Math.min(50, now - last); last = now; if (fn(dt) !== false) { id = requestAnimationFrame(step); rafs.add(id); } };
          id = requestAnimationFrame(step); rafs.add(id);
          return () => { cancelAnimationFrame(id); rafs.delete(id); };
        },
        on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); offs.push(() => target.removeEventListener(ev, fn, opt)); },
        onResize(fn) { A.on(root, 'resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => alive && fn(), 160); }); },
        onBack(fn) { backHandler = fn; },
        onDestroy(fn) { own.push(fn); },
        siraj(el, opts) { if (!SirajLib) return null; const s = SirajLib.create(el, color, opts); own.push(() => s.destroy()); return s; },
        sirajSvg: (opts) => (SirajLib ? SirajLib.svg(color, Object.assign({ shadow: false }, opts)) : ''),
        cheer() { sfx.spark && sfx.spark(); if (barSj) barSj.wow(); },
        burst(el, n, colors) {
          const f = fx(); if (!f || !el) return;
          const r = el.getBoundingClientRect();
          f.burst(r.left + r.width / 2, r.top + r.height / 2, n || 18, colors || ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
        },
        // رد على إجابة الطفل: يقطع سؤال الجولة (الطفل جاوب خلاص)، لكن ما يتكرر خلال ٦ ثوانٍ
        good(el, k) { sfx.spark && sfx.spark(); A.burst(el); if (barSj) barSj.wow(); if (k) speak(k, { pri: 'feedback', cut: true }); if (el && hasGsap()) gsap.fromTo(el, { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, overwrite: 'auto' }); },
        bad(el, k) { sfx.oops && sfx.oops(); if (k) speak(k, { pri: 'feedback', cut: true }); if (el) { el.classList.remove('cw-shake'); void el.offsetWidth; el.classList.add('cw-shake'); } },
        // تشجيع متنوّع ونادر (مرة كل ١٥ ثانية على الأكثر)؛ غير كده المؤثر الصوتي يكفي
        praise(keys) { const k = root.Voice && root.Voice.pick ? root.Voice.pick(keys) : pick(keys); speak(k, { pri: 'ambient', quiet: true }); },
        hit(el, x, y, pad) { const r = el.getBoundingClientRect(); pad = pad || 0; return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; },
        drag: (el, o) => drag(el, o, A),
        stars, save,
        dots(box, n) {
          box.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
          return k => box.querySelectorAll('i').forEach((d, i) => { d.className = i < k ? 'on' : i === k ? 'cur' : ''; });
        },
        win(o) { return showWin(A, o || {}); },
        _cleanup() {
          alive = false;
          timers.forEach(clearTimeout); ivals.forEach(clearInterval); rafs.forEach(cancelAnimationFrame); clearTimeout(resizeT);
          offs.forEach(f => f()); own.splice(0).forEach(f => { try { f(); } catch (e) { console.warn(e); } });
          if (hasGsap()) gsap.killTweensOf(stage.querySelectorAll('*'));
        },
        _back() { return backHandler ? backHandler() : false; },
        restart: () => openActivity(sec, act),
        toList: () => sectionScreen(sec, true),
      };
      return A;
    }

    /* ---------- الفوز ---------- */
    function showWin(A, o) {
      const n = o.stars == null ? 3 : Math.max(1, Math.min(3, o.stars));
      save(o.id || A.act.id, n);
      sfx.win && sfx.win();
      const f = fx(); if (f && f.confetti) f.confetti();
      const w = root.Voice && root.Voice.pick ? root.Voice.pick(['cw_win1', 'cw_win2', 'cw_win3']) : 'cw_win' + rand(1, 3);
      speak([w].concat(o.say ? [o.say] : []).concat(n < 3 && o.tip ? [o.tip] : []), { noReplay: true, pri: 'feedback', force: true });
      const old = rootEl.querySelector('.cw-win'); if (old) old.remove();
      const box = document.createElement('div');
      box.className = 'cw-win';
      box.innerHTML = `<div class="cw-wcard"><div class="cw-wsj"></div><h2>${esc(text(w))}</h2>
        <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</div>
        ${o.note ? `<p class="cw-wnote">${esc(o.note)}</p>` : ''}
        <div class="cw-wacts"><button class="sq" data-cw="again" aria-label="مرة أخرى">↻</button>
          <button class="run" data-cw="done">${o.next ? '▶ التالي' : '✔ تم'}</button></div></div>`;
      rootEl.querySelector('.cw').appendChild(box);
      const s = A.siraj(box.querySelector('.cw-wsj'), { shadow: false });
      if (s) A.later(() => s.happy(), 250);
      if (barSj) barSj.wow();
      if (hasGsap()) {
        gsap.fromTo(box.querySelector('.cw-wcard'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
        gsap.from(box.querySelectorAll('.w-stars span.on'), { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.25 });
      }
      lock = Date.now() + 500;
      S.winOpts = { A, o };
      CW._won = (CW._won || 0) + 1;
    }

    /* ---------- السحب والإفلات (لمس وفأرة) ---------- */
    function drag(el, o, A) {
      el.style.touchAction = 'none';
      el.classList.add('cw-draggable');
      let id = null, sx = 0, sy = 0, moved = false, bx = 0, by = 0;
      const down = e => {
        if (id !== null || (o.enabled && !o.enabled()) || (e.button && e.button !== 0)) return;
        id = e.pointerId; try { el.setPointerCapture(id); } catch (er) { /* لا شيء */ }
        sx = e.clientX; sy = e.clientY; moved = false;
        if (hasGsap()) { gsap.killTweensOf(el); bx = +gsap.getProperty(el, 'x') || 0; by = +gsap.getProperty(el, 'y') || 0; }
        el.classList.add('cw-dragging');
        if (o.start) o.start();
        e.preventDefault();
      };
      const move = e => {
        if (e.pointerId !== id) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
        if (moved && hasGsap()) gsap.set(el, { x: bx + dx, y: by + dy });
        if (moved && o.move) o.move(e.clientX, e.clientY);
      };
      const up = e => {
        if (e.pointerId !== id) return;
        id = null; el.classList.remove('cw-dragging');
        if (!A.alive) return;
        const ok = moved ? (e.type === 'pointercancel' ? false : o.drop(e.clientX, e.clientY)) : (o.tap ? o.tap() : false);
        if (!ok && hasGsap() && A.alive && el.isConnected) gsap.to(el, { x: bx, y: by, duration: 0.35, ease: 'back.out(2)' });
      };
      A.on(el, 'pointerdown', down);
      A.on(el, 'pointermove', move);
      A.on(el, 'pointerup', up);
      A.on(el, 'pointercancel', up);
    }

    /* ---------- الضغطات ---------- */
    const ACT = {
      exit: () => { close(); if (ctx.back) ctx.back(); },
      home: () => { Voice_stop(); home(); },
      sec: t => { const sec = sections[+t.dataset.i]; sfx.tap && sfx.tap(); sectionScreen(sec); },
      act: t => { const a = curSec.activities[+t.dataset.i]; sfx.tap && sfx.tap(); openActivity(curSec, a); },
      back: () => { if (cur && cur.A._back()) return; Voice_stop(); sectionScreen(curSec, true); },
      replay: () => { sfx.tap && sfx.tap(); if (lastSeq) speak(lastSeq, { force: true }); }, // 🔊 = بالطلب دايماً
      again: () => { const w = S.winOpts; S.winOpts = null; const box = rootEl.querySelector('.cw-win'); if (box) box.remove(); if (w && w.o.again) w.o.again(); else if (cur) openActivity(cur.sec, cur.act); },
      done: () => { const w = S.winOpts; S.winOpts = null; const box = rootEl.querySelector('.cw-win'); if (box) box.remove(); if (w && w.o.next) w.o.next(); else if (w && w.o.done) w.o.done(); else sectionScreen(curSec, true); },
    };
    function Voice_stop() { if (root.Voice && root.Voice.stop) root.Voice.stop(); }
    onClick = e => {
      const t = e.target.closest('[data-cw]');
      if (!t || t.disabled || !rootEl.contains(t)) return;
      if (Date.now() < lock && !t.closest('.cw-stage')) return;
      const f = ACT[t.dataset.cw];
      if (f) { e.stopPropagation(); f(t, e); }
    };
    rootEl.addEventListener('click', onClick);

    function close() {
      if (closed) return; closed = true;
      if (cur) closeActivity();
      teardown();
      rootEl.removeEventListener('click', onClick);
      GHOST.forEach(ev => rootEl.removeEventListener(ev, ghost, true));
      rootEl.innerHTML = '';
    }

    const self = { home, sectionScreen, openActivity, close, get cur() { return cur; }, P, speak, winOpts: null,
      // للاختبار: يفتح نشاطاً بالمعرّف
      open(id) { for (const s of sections) for (const a of s.activities) if (a.id === id) { openActivity(s, a); return true; } return false; } };
    return self;
  }
})(window);

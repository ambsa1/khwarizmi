/* قسم الإنجليزي: الإطار العام (قائمة الأقسام ← قائمة الأنشطة ← النشاط)
   نفس عقد عالم الكمبيوتر (CW): EN.render(app, ctx) و EN.destroy()، و ctx هو نفسه.
   كل الكلام إنجليزي بصوت إنجليزي (مفاتيح en2_)، والترجمة العربية مكتوبة تحته ولا تُنطق.
   كل نشاط له mount(el, A) يرجّع { destroy?, solve?, state? }، و A تتنظّف تلقائياً عند الخروج. */
(function (root) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hasGsap = () => typeof root.gsap !== 'undefined';
  // نص إنجليزي داخل صفحة عربية: اتجاهه من اليسار ومعزول عن النص العربي
  const ltr = (s, cls) => `<bdi dir="ltr" class="en-ltr ${cls || ''}">${esc(s)}</bdi>`;

  const EN = root.EN = root.EN || {};
  const sections = EN.sections = EN.sections || [];
  EN.util = { esc, rand, pick, shuffle, ltr };
  EN.register = sec => { sections.push(sec); sections.sort((a, b) => a.order - b.order); };
  const TXT = () => root.EN_TEXTS || {};
  const ARX = () => root.EN_AR || {};

  /* ---------- الكلمات ---------- */
  const VOC = {};
  // كلمات قسم: [{ id, en, ar, pic, key, sec }]
  EN.vocab = sec => {
    if (VOC[sec]) return VOC[sec];
    const list = ((root.EN_VOCAB || {})[sec] || []).map(([id, en, ar, pic]) => ({ id, en, ar, pic, sec, key: (sec === 'talk' ? 'en2_t_' : 'en2_w_') + id }));
    return (VOC[sec] = list);
  };

  let S = null; // الجلسة الحالية
  EN.render = function (rootEl, ctx) {
    if (S) S.close();
    S = session(rootEl, ctx || {});
    EN._s = S;
    S.home();
    return { destroy: () => EN.destroy() };
  };
  EN.destroy = () => { if (S) S.close(); S = null; EN._s = null; EN._act = null; };

  function session(rootEl, ctx) {
    const P = ctx.player || { name: '', age: 7, gender: 'b', color: '#3d8bff', progress: {} };
    if (!P.progress) P.progress = {};
    const age = Math.max(3, Math.min(12, +P.age || 7));
    const girl = P.gender === 'g';
    const color = /^#[0-9a-f]{6}$/i.test(P.color || '') ? P.color : '#3d8bff';
    const sfx = ctx.sfx || root.Sfx || new Proxy({}, { get: () => () => {} });
    const fx = () => ctx.fx || root.FX || null;
    const SirajLib = ctx.Siraj || ctx.siraj || root.Siraj;
    let lock = 0, guard = 0, teardowns = [], cur = null, barSj = null, closed = false, lastSeq = null, curSec = null;

    // الترجمة العربية المكتوبة (البنت: _f لو موجودة)
    const arOf = k => { const A = ARX(); return (girl && A[k + '_f']) || A[k] || ''; };
    const enOf = k => TXT()[k] || '';

    /* الصوت: كل المفاتيح إنجليزية. opts: { pri, force, cut, quiet (ما يغيّر الفقاعة), show (كم سطر يظهر)، ar (ترجمة لكلمة)، noReplay } */
    function speak(list, opts) {
      opts = opts || {};
      list = (Array.isArray(list) ? list : [list]).filter(Boolean);
      const items = list.map(k => [k, enOf(k), 'en']).filter(i => i[1]);
      if (!items.length) return '';
      const V = root.Voice;
      const instr = opts.pri ? opts.pri === 'instruction' : !V || !V.cls || list.some(k => V.cls(k) === 'instruction');
      if (!opts.noReplay && instr) lastSeq = { list, opts: Object.assign({}, opts, { force: true }) };
      const vo = { pri: opts.pri, force: opts.force, cool: opts.cool, once: opts.once, cut: opts.cut != null ? opts.cut : opts.pri === 'feedback' };
      try {
        if (ctx.playSeq) ctx.playSeq(items, vo);
        else if (ctx.play) ctx.play(items, vo);
        else if (V) V.playSeq(items, vo);
      } catch (e) { /* الصوت اختياري */ }
      const k0 = items[0][0];
      if (!opts.quiet) bubble(items[0][1], opts.ar || arOf(k0));
      if (barSj) barSj.talk(Math.min(4000, 500 + items[0][1].length * 70));
      return items[0][1];
    }
    function bubble(en, ar) {
      const b = rootEl.querySelector('.en-bub-t'); if (!b || !en) return;
      b.innerHTML = `${ltr(en, 'en-bub-en')}${ar ? `<small class="en-bub-ar">${esc(ar)}</small>` : ''}`;
      if (hasGsap()) gsap.fromTo(b, { opacity: 0.2 }, { opacity: 1, duration: 0.3 });
    }

    // التقدّم محفوظ بالمفتاح en:<القسم>_<النشاط>
    const pid = (sec, act) => 'en:' + sec.id + '_' + act.id;
    const stars = id => +(P.progress[id] || 0);
    function save(id, n) {
      n = Math.max(0, Math.min(3, n | 0));
      if (ctx.saveProgress) { try { ctx.saveProgress(id, n); } catch (e) { /* لا شيء */ } }
      if ((P.progress[id] || 0) < n) P.progress[id] = n;
    }
    const secStars = sec => sec.activities.reduce((a, x) => a + stars(pid(sec, x)), 0);
    const allStars = () => Object.keys(P.progress).filter(k => k.startsWith('en:')).reduce((a, k) => a + (+P.progress[k] || 0), 0);

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
      rootEl.innerHTML = `<div class="en ${cls || ''}" dir="rtl">${html}</div>`;
    }
    // لمسة "شبح" من الضغطة اللي فتحت الشاشة ما توصل للعبة الجديدة
    const ghost = e => { if (e.isTrusted && Date.now() < guard) { e.stopPropagation(); if (e.type === 'click') e.preventDefault(); } };
    const GHOST = ['pointerdown', 'mousedown', 'touchstart', 'click'];
    GHOST.forEach(ev => rootEl.addEventListener(ev, ghost, true));
    function miniSiraj(el) {
      if (!el || !SirajLib) return null;
      const s = SirajLib.create(el, color, { shadow: false });
      teardowns.push(() => s.destroy());
      return s;
    }
    const ageBadge = m => (m > age ? `<span class="en-age">${m}+</span>` : '');
    const lamps = sec => sec.activities.map(a => `<i class="${stars(pid(sec, a)) ? 'on' : ''}"></i>`).join('');

    /* ---------- قائمة الأقسام ---------- */
    function home() {
      screen(`<div class="sky"></div>
        <header class="bar"><button class="ib" data-en="exit" aria-label="رجوع">→</button>
          <span class="en-bsj" id="enSj"></span><span class="t">${ltr('English')} <small class="en-tsub">الإنجليزية</small></span><span class="chip">⭐ ${allStars()}</span></header>
        <div class="en-scroll"><div class="en-grid en-secs">
          ${sections.map((s, i) => `<button class="en-sec ${s.minAge > age ? 'dim' : ''}" data-en="sec" data-i="${i}" style="--sc:${s.color}">
            <span class="en-sec-ic">${s.icon}</span>${ltr(s.en, 'en-sec-en')}<small>${esc(s.name)}</small>
            <span class="en-lamps">${lamps(s)}</span>${ageBadge(s.minAge)}</button>`).join('')}
        </div></div>`, 'night en-home');
      barSj = miniSiraj(rootEl.querySelector('#enSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.en-sec'), { y: 30, opacity: 0, scale: 0.9, stagger: 0.05, duration: 0.45, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
      speak(['en2_hello', 'en2_pick'], { quiet: true, once: true }); // الترحيب مرة واحدة في الجلسة
    }

    /* ---------- قائمة الأنشطة ---------- */
    function sectionScreen(sec, silent) {
      curSec = sec;
      screen(`<div class="sky"></div>
        <header class="bar" style="--sc:${sec.color}"><button class="ib" data-en="home" aria-label="رجوع">→</button>
          <span class="en-bsj" id="enSj"></span><span class="t">${sec.icon} ${ltr(sec.en)} <small class="en-tsub">${esc(sec.name)}</small></span><span class="chip">⭐ ${secStars(sec)}</span></header>
        <div class="en-scroll"><div class="en-grid en-acts">
          ${sec.activities.map((a, i) => {
            const st = stars(pid(sec, a));
            return `<button class="en-act ${a.minAge > age ? 'dim' : ''} ${st ? 'done' : ''} ${a.quiz ? 'quiz' : ''}" data-en="act" data-i="${i}" style="--sc:${sec.color}">
              <span class="en-act-ic">${a.icon}</span>${ltr(a.en, 'en-act-en')}<b>${esc(a.name)}</b>
              <span class="en-st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span>${ageBadge(a.minAge)}</button>`;
          }).join('')}
        </div></div>`, 'night en-list');
      barSj = miniSiraj(rootEl.querySelector('#enSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.en-act'), { y: 24, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
      if (!silent) speak([sec.voice, 'en2_pick'], { quiet: true, once: true }); // اسم القسم مرة واحدة لكل قسم في الجلسة
    }

    /* ---------- النشاط ---------- */
    function openActivity(sec, act) {
      curSec = sec;
      if (S) S.winOpts = null;
      screen(`<header class="bar en-bar" style="--sc:${sec.color}"><button class="ib" data-en="back" aria-label="رجوع">→</button>
          <span class="en-bsj" id="enSj"></span>
          <div class="en-bub"><span class="en-bub-i">${act.icon}</span><span class="en-bub-t">${ltr(act.en, 'en-bub-en')}<small class="en-bub-ar">${esc(act.name)}</small></span></div>
          <button class="ib" data-en="replay" aria-label="اسمع مرة أخرى">🔊</button></header>
        <div class="en-stage" id="enStage"></div>`, 'en-play en-s-' + sec.id);
      barSj = miniSiraj(rootEl.querySelector('#enSj'));
      const stage = rootEl.querySelector('#enStage');
      const A = api(sec, act, stage);
      let inst = null;
      try { inst = act.mount(stage, A) || {}; } catch (e) { console.error(e); inst = {}; }
      cur = { sec, act, A, inst };
      EN._act = cur;
    }
    function closeActivity() {
      const c = cur; cur = null; EN._act = null;
      if (!c) return;
      try { if (c.inst && c.inst.destroy) c.inst.destroy(); } catch (e) { console.warn(e); }
      c.A._cleanup();
      if (root.Voice && root.Voice.stop) root.Voice.stop();
    }

    function api(sec, act, stage) {
      const timers = [], ivals = [], offs = [], own = [];
      let alive = true, replayFn = null, gate = 0;
      const A = {
        el: stage, player: P, age, girl, color, sfx, util: EN.util, sec, act, id: pid(sec, act),
        get alive() { return alive; },
        text: enOf, ar: arOf,
        say: (k, o) => speak(k, o),
        // كلمة/جملة الدرس: تُقال دايماً (الطفل لازم يسمعها)، ومش ممنوعة بتكرار
        hear(item, o) { return speak([item.key], Object.assign({ pri: 'instruction', force: true, ar: item.ar, quiet: true }, o)); },
        later(fn, ms) { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; },
        // الجولة التالية بعد ما الصوت يخلص (على الأقل min، وأقصى حد max)
        afterVoice(fn, min, max) {
          const t0 = Date.now(), V = root.Voice;
          const tick = () => { const el = Date.now() - t0; if (el >= (max || 9000) || !(V && V.busy && V.busy())) fn(); else A.later(tick, 150); };
          return A.later(tick, min || 900);
        },
        every(fn, ms) { const t = setInterval(() => { if (alive) fn(); }, ms); ivals.push(t); return t; },
        wait: ms => new Promise(r => { timers.push(setTimeout(r, ms)); }),
        on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); offs.push(() => target.removeEventListener(ev, fn, opt)); },
        onDestroy(fn) { own.push(fn); },
        // حارس الضغطتين: بعد تغيّر الجولة نتجاهل الضغطات ~٣٠٠ms
        hold(ms) { gate = Date.now() + (ms == null ? 300 : ms); },
        get open() { return alive && Date.now() >= gate; },
        onReplay(fn) { replayFn = fn; },
        siraj(el, opts) { if (!SirajLib || !el) return null; const s = SirajLib.create(el, color, opts); own.push(() => s.destroy()); return s; },
        sirajSvg: opts => (SirajLib ? SirajLib.svg(color, Object.assign({ shadow: false }, opts)) : '🤖'),
        burst(el, n, colors) {
          const f = fx(); if (!f || !f.burst || !el) return;
          const r = el.getBoundingClientRect();
          f.burst(r.left + r.width / 2, r.top + r.height / 2, n || 18, colors || ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
        },
        good(el) { sfx.spark && sfx.spark(); A.burst(el); if (barSj) barSj.wow(); if (el && hasGsap()) gsap.fromTo(el, { scale: 1 }, { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, overwrite: 'auto' }); },
        bad(el, k) { sfx.oops && sfx.oops(); if (k) speak(k, { pri: 'feedback', cut: true, quiet: true }); if (el) { el.classList.remove('en-shake'); void el.offsetWidth; el.classList.add('en-shake'); } },
        // تشجيع متنوّع
        praise() { const keys = ['en2_good1', 'en2_good2', 'en2_good3', 'en2_good4']; return root.Voice && root.Voice.pick ? root.Voice.pick(keys) : pick(keys); },
        stars: () => stars(pid(sec, act)), save,
        dots(box, n) {
          box.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
          return k => {
            if (root.__enDot) root.__enDot(k, A); // للاختبار: هل الجولة تقدّمت والصوت شغّال؟
            box.querySelectorAll('i').forEach((d, i) => { d.className = i < k ? 'on' : i === k ? 'cur' : ''; });
          };
        },
        win(o) { return showWin(A, o || {}); },
        _cleanup() {
          alive = false;
          timers.forEach(clearTimeout); ivals.forEach(clearInterval);
          offs.forEach(f => f()); own.splice(0).forEach(f => { try { f(); } catch (e) { console.warn(e); } });
          if (hasGsap()) gsap.killTweensOf(stage.querySelectorAll('*'));
        },
        _replay() { if (replayFn) replayFn(); else if (lastSeq) speak(lastSeq.list, lastSeq.opts); },
      };
      return A;
    }

    /* ---------- الفوز ---------- */
    function showWin(A, o) {
      const n = o.stars == null ? 3 : Math.max(1, Math.min(3, o.stars));
      save(A.id, n);
      sfx.win && sfx.win();
      const f = fx(); if (f && f.confetti) f.confetti();
      const w = root.Voice && root.Voice.pick ? root.Voice.pick(['en2_win1', 'en2_win2', 'en2_win3']) : 'en2_win' + rand(1, 3);
      speak([w], { noReplay: true, pri: 'feedback', force: true, quiet: true });
      const acts = A.sec.activities, nx = acts[acts.indexOf(A.act) + 1];
      const old = rootEl.querySelector('.en-win'); if (old) old.remove();
      const box = document.createElement('div');
      box.className = 'en-win';
      box.innerHTML = `<div class="en-wcard"><div class="en-wsj"></div><h2>${ltr(enOf(w))}</h2><p class="en-war">${esc(arOf(w))}</p>
        <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="en-wacts"><button class="sq" data-en="again" aria-label="مرة أخرى">↻</button>
          <button class="run" data-en="done">${nx ? '▶ التالي' : '✔ تم'}</button></div></div>`;
      rootEl.querySelector('.en').appendChild(box);
      const s = A.siraj(box.querySelector('.en-wsj'), { shadow: false });
      if (s) A.later(() => s.happy(), 250);
      if (barSj) barSj.wow();
      if (hasGsap()) {
        gsap.fromTo(box.querySelector('.en-wcard'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
        gsap.from(box.querySelectorAll('.w-stars span.on'), { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.25 });
      }
      lock = Date.now() + 500;
      S.winOpts = { A, o, next: nx };
      EN._won = (EN._won || 0) + 1;
    }

    /* ---------- الضغطات ---------- */
    function Voice_stop() { if (root.Voice && root.Voice.stop) root.Voice.stop(); }
    const ACT = {
      exit: () => { close(); if (ctx.back) ctx.back(); },
      home: () => { Voice_stop(); home(); },
      sec: t => { const sec = sections[+t.dataset.i]; sfx.tap && sfx.tap(); sectionScreen(sec); },
      act: t => { const a = curSec.activities[+t.dataset.i]; sfx.tap && sfx.tap(); openActivity(curSec, a); },
      back: () => { Voice_stop(); sectionScreen(curSec, true); },
      replay: () => { sfx.tap && sfx.tap(); if (cur) cur.A._replay(); },
      again: () => { S.winOpts = null; if (cur) openActivity(cur.sec, cur.act); },
      done: () => { const w = S.winOpts; S.winOpts = null; if (w && w.next) openActivity(curSec, w.next); else sectionScreen(curSec, true); },
    };
    const onClick = e => {
      const t = e.target.closest('[data-en]');
      if (!t || t.disabled || !rootEl.contains(t)) return;
      if (Date.now() < lock && !t.closest('.en-stage')) return;
      const f = ACT[t.dataset.en];
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

    const self = { home, sectionScreen, openActivity, close, get cur() { return cur; }, P, age, speak, winOpts: null,
      // للاختبار: يفتح نشاطاً بمعرّف القسم والنشاط
      open(secId, actId) { const s = sections.find(x => x.id === secId); const a = s && s.activities.find(x => x.id === actId); if (!a) return false; openActivity(s, a); return true; } };
    return self;
  }
})(window);

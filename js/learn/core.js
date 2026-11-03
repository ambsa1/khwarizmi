/* دفتر البرمجة (LEARN): الكلمات قبل الأيادي — شنو البرمجة، الدروس السبعة، على اللابتوب، الامتحان، والدفتر.
   العقد: LEARN.render(app, ctx, { page, back }) و LEARN.destroy()، ctx = { player, playSeq, say, sfx, Siraj, fx, saveProgress } مثل EN.
   page: 'intro' | 'lesson:<seq|loops|vars|cond|funcs|io|bugs>' | 'laptop' | 'exam' | 'notebook'. التقدّم بمفاتيح lr:*
   للاختبار: LEARN._s.next() يرجّع محدّد الزرّ الصحيح التالي (أو null عند الانتهاء). */
(function (root) {
  'use strict';
  const plain = s => String(s == null ? '' : s).replace(/[ً-ْٰ]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hasGsap = () => typeof root.gsap !== 'undefined';
  const TXT = () => root.LEARN_TEXTS || {};
  const PG = () => root.LEARN_PAGES || {};

  const LEARN = root.LEARN = root.LEARN || {};
  const CONCEPTS = ['seq', 'loops', 'vars', 'cond', 'funcs', 'io', 'bugs'];
  // الصفحات بالترتيب (للخريطة): id هو ما يُمرَّر لـ render
  LEARN.pages = [
    { id: 'intro', title: 'شنو البرمجة؟', icon: '📖', minAge: 8 },
    { id: 'lesson:seq', title: 'التسلسل', icon: '🔢', minAge: 8 },
    { id: 'lesson:loops', title: 'التكرار', icon: '🔁', minAge: 8 },
    { id: 'lesson:vars', title: 'المتغيّرات', icon: '📦', minAge: 8 },
    { id: 'lesson:cond', title: 'الشروط', icon: '🔀', minAge: 8 },
    { id: 'lesson:funcs', title: 'الدوال', icon: '🧩', minAge: 9 },
    { id: 'lesson:io', title: 'الإدخال والإخراج', icon: '⌨️', minAge: 9 },
    { id: 'lesson:bugs', title: 'الأخطاء', icon: '🐛', minAge: 8 },
    { id: 'laptop', title: 'على اللابتوب', icon: '💻', minAge: 9 },
    { id: 'exam', title: 'الامتحان الأخير', icon: '🎓', minAge: 9 },
  ];
  LEARN.saveKey = id => 'lr:' + id.replace(/^lesson:/, '');

  /* تلوين بايثون: كلمات مفتاحية، دوال مدمجة، نصوص، أرقام، تعليقات */
  const KW = /^(for|in|if|else|elif|def|while|return|True|False|None|and|or|not|import)$/;
  const BI = /^(print|input|range|int|str|len|say)$/;
  LEARN.hl = function (line) {
    if (line && typeof line === 'object') return `<i class="${line.err ? 'e' : 'o'}">${esc(line.t)}</i>`;
    const re = /("[^"]*"|'[^']*'|#.*$|\b\d+\b|[A-Za-z_]\w*|\s+|.)/g;
    let out = '', m;
    while ((m = re.exec(line))) {
      const t = m[0];
      if (/^["']/.test(t)) out += `<i class="s">${esc(t)}</i>`;
      else if (t[0] === '#') out += `<i class="c">${esc(t)}</i>`;
      else if (/^\d/.test(t)) out += `<i class="n">${esc(t)}</i>`;
      else if (KW.test(t)) out += `<i class="k">${t}</i>`;
      else if (BI.test(t)) out += `<i class="b">${t}</i>`;
      else out += esc(t);
    }
    return out;
  };
  const codeBox = (lines, cls, attrs) => `<div class="lr-code ${cls || ''}" dir="ltr" ${attrs || ''}>${lines.map((l, i) => `<div class="lr-cl" data-l="${i}"><em>${i + 1}</em><span>${LEARN.hl(l)}</span></div>`).join('')}</div>`;

  let S = null;
  LEARN.render = function (rootEl, ctx, opts) {
    if (S) S.close();
    S = session(rootEl, ctx || {}, opts || {});
    LEARN._s = S;
    S.open(opts && opts.page || 'notebook');
    return { destroy: () => LEARN.destroy() };
  };
  LEARN.destroy = () => { if (S) S.close(); S = null; LEARN._s = null; };

  function session(rootEl, ctx, opts) {
    const P = ctx.player || { name: '', age: 9, gender: 'b', color: '#3d8bff', progress: {} };
    if (!P.progress) P.progress = {};
    const girl = P.gender === 'g';
    const color = /^#[0-9a-f]{6}$/i.test(P.color || '') ? P.color : '#3d8bff';
    const sfx = ctx.sfx || root.Sfx || new Proxy({}, { get: () => () => {} });
    const fx = () => ctx.fx || root.FX || null;
    const SirajLib = ctx.Siraj || ctx.siraj || root.Siraj;
    const back = () => { if (opts.back) opts.back(); else if (ctx.back) ctx.back(); };
    let timers = [], own = [], barSj = null, closed = false, lock = 0, lastSeq = null;
    let state = 'none', curPage = null, correct = -1, fromNotebook = false;

    const vkey = k => (girl && TXT()[k + '_f'] ? k + '_f' : k);
    const text = k => plain(TXT()[vkey(k)] || '');
    function speak(list, o) {
      o = o || {};
      list = (Array.isArray(list) ? list : [list]).filter(Boolean);
      const items = list.map(k => { const kk = vkey(k); return [kk, TXT()[kk] || '']; }).filter(i => i[1]);
      if (!items.length) return '';
      if (!o.noReplay && o.pri !== 'feedback') lastSeq = { list, o: Object.assign({}, o, { force: true }) };
      const vo = { pri: o.pri || 'instruction', force: o.force, once: o.once, cut: o.cut != null ? o.cut : o.pri === 'feedback' };
      try {
        if (ctx.playSeq) ctx.playSeq(items, vo);
        else if (ctx.play) ctx.play(items, vo);
        else if (root.Voice) root.Voice.playSeq(items, vo);
      } catch (e) { /* الصوت اختياري */ }
      const shown = plain(items.map(i => i[1]).join(' '));
      if (!o.quiet) bubble(shown);
      if (barSj) barSj.talk(Math.min(4500, 500 + shown.length * 70));
      return shown;
    }
    function bubble(t) { const b = rootEl.querySelector('.lr-bub-t'); if (b && t) { b.textContent = t; if (hasGsap()) gsap.fromTo(b, { opacity: 0.2 }, { opacity: 1, duration: 0.3 }); } }
    const later = (fn, ms) => { const t = setTimeout(() => { if (!closed) fn(); }, ms); timers.push(t); return t; };
    const stars = id => +(P.progress[id] || 0);
    function save(id, n) {
      n = Math.max(0, Math.min(3, n | 0));
      if (ctx.saveProgress) { try { ctx.saveProgress(id, n); } catch (e) { /* لا شيء */ } }
      if ((P.progress[id] || 0) < n) P.progress[id] = n;
    }
    function teardown() {
      timers.splice(0).forEach(clearTimeout);
      own.splice(0).reverse().forEach(f => { try { f(); } catch (e) { console.warn(e); } });
      if (barSj) { barSj.destroy(); barSj = null; }
      if (hasGsap()) gsap.killTweensOf(rootEl.querySelectorAll('*'));
      if (root.Voice && root.Voice.stop) { try { root.Voice.stop(); } catch (e) { /* */ } }
      lastSeq = null;
    }
    function miniSiraj(el) {
      if (!el || !SirajLib) return null;
      const s = SirajLib.create(el, color, { shadow: false });
      own.push(() => s.destroy());
      return s;
    }
    function screen(html, cls) {
      teardown();
      lock = Date.now() + 300;
      rootEl.innerHTML = `<div class="lr ${cls || ''}" dir="rtl">${html}</div>`;
    }
    const ghost = e => { if (e.isTrusted && Date.now() < lock) { e.stopPropagation(); if (e.type === 'click') e.preventDefault(); } };
    const GHOST = ['pointerdown', 'mousedown', 'touchstart', 'click'];
    GHOST.forEach(ev => rootEl.addEventListener(ev, ghost, true));

    /* ---------- الدفتر ---------- */
    function notebook() {
      curPage = null; state = 'list'; fromNotebook = true;
      const age = +P.age || 9;
      screen(`<div class="sky"></div>
        <header class="bar"><button class="ib" data-lr="exit" aria-label="رجوع">→</button>
          <span class="lr-bsj" id="lrSj"></span><span class="t">📘 دفتر البرمجة</span><span class="chip">⭐ ${LEARN.pages.reduce((a, p) => a + stars(LEARN.saveKey(p.id)), 0)}</span></header>
        <div class="lr-scroll"><div class="lr-list">
          ${LEARN.pages.map(p => { const st = stars(LEARN.saveKey(p.id)); return `<button class="lr-item ${st ? 'done' : ''} ${p.minAge > age ? 'dim' : ''}" data-lr="page" data-page="${p.id}">
            <i class="lr-lamp ${st ? 'on' : ''}"></i><span class="lr-item-ic">${p.icon}</span><b>${esc(p.title)}</b>
            <span class="lr-st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span></button>`; }).join('')}
        </div></div>`, 'night lr-home');
      barSj = miniSiraj(rootEl.querySelector('#lrSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.lr-item'), { y: 24, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
      speak(['lr_hello', 'lr_pick'], { quiet: true, once: true }); // الترحيب مرة واحدة في الجلسة (الرجوع من صفحة ما يعيده)
    }

    /* ---------- إطار الصفحة ---------- */
    function frame(title, icon, body) {
      screen(`<header class="bar lr-bar"><button class="ib" data-lr="back" aria-label="رجوع">→</button>
          <span class="lr-bsj" id="lrSj"></span>
          <div class="lr-bub"><span class="lr-bub-i">${icon}</span><span class="lr-bub-t">${esc(title)}</span></div>
          <button class="ib" data-lr="replay" aria-label="اسمع مرة أخرى">🔊</button></header>
        <div class="lr-stage" id="lrStage">${body}</div>
        <div class="lr-foot" id="lrFoot"></div>`, 'lr-play');
      barSj = miniSiraj(rootEl.querySelector('#lrSj'));
    }
    const stage = () => rootEl.querySelector('#lrStage');
    const foot = () => rootEl.querySelector('#lrFoot');
    const dots = (i, n) => `<div class="lr-dots" dir="ltr">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : k === i ? 'cur' : ''}"></i>`).join('')}</div>`;

    /* ---------- تشغيل سلسلة خطوات ---------- */
    // steps: [{ type:'story', key, pic } | { type:'code', lines } | { type:'quiz', qs }], ثم onEnd(mistakes, total)
    function runFlow(page, steps, onEnd) {
      let i = 0, mistakes = 0, total = 0;
      const n = steps.length;
      const next = () => { i++; if (i < n) show(); else onEnd(mistakes, total); };
      function show() {
        const st = steps[i];
        if (st.type === 'story') story(st, i, n, next);
        else if (st.type === 'code') code(st, i, n, next);
        else quiz(st.qs, i, n, (m, t) => { mistakes += m; total += t; next(); });
      }
      show();
    }
    function animIn(el) { if (el && hasGsap()) gsap.from(el, { y: 20, opacity: 0, scale: 0.96, duration: 0.4, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }); }
    function nextBtn(fn, label) {
      foot().innerHTML = `<button class="lr-next run" data-lr="next">${label || 'التالي ◂'}</button>`;
      S._next = fn;
    }

    function story(st, i, n, done) {
      state = 'story';
      const pic = typeof st.pic === 'function' ? st.pic() : st.pic;
      stage().innerHTML = `${dots(i, n)}<div class="lr-story"><div class="lr-pic">${pic || ''}</div><p class="lr-line">${esc(text(st.key))}</p></div>`;
      animIn(stage().querySelector('.lr-pic'));
      nextBtn(done);
      speak(st.key, { quiet: true });
    }
    function code(st, i, n, done) {
      state = 'code';
      let k = 0;
      stage().innerHTML = `${dots(i, n)}<div class="lr-codes">${codeBox(st.lines.map(l => l.t), 'big')}<p class="lr-expl"></p></div>`;
      animIn(stage().querySelector('.lr-code'));
      const rows = [...stage().querySelectorAll('.lr-cl')];
      function reveal() {
        rows.forEach((r, j) => { r.classList.toggle('hid', j > k); r.classList.toggle('cur', j === k); });
        stage().querySelector('.lr-expl').textContent = text(st.lines[k].k);
        speak(st.lines[k].k, { quiet: true });
        if (k === 0) speak(['lr_code_look', st.lines[0].k], { quiet: true });
      }
      reveal();
      nextBtn(() => { if (k < st.lines.length - 1) { k++; sfx.tap && sfx.tap(); reveal(); } else done(); });
    }
    function quiz(qs, i, n, done) {
      let q = 0, mistakes = 0, busy = false, wrongHere = false;
      const total = qs.length;
      function ask() {
        state = 'quiz'; busy = false; wrongHere = false;
        const Q = qs[q];
        const order = shuffle(Q.opts.map((_, j) => j));
        correct = order.indexOf(0);
        const isCode = t => /^[\x20-\x7e]+$/.test(t);
        stage().innerHTML = `${dots(i, n)}<div class="lr-q"><div class="lr-qdots" dir="ltr">${qs.map((_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
          <h3 class="lr-qt">${esc(text(Q.key))}</h3>${Q.code ? codeBox(Q.code, 'q') : ''}
          <div class="lr-opts n${order.length}">${order.map((oi, j) => { const t = Q.opts[oi]; return `<button class="lr-opt ${isCode(t) ? 'code' : ''}" data-i="${j}" ${isCode(t) ? 'dir="ltr"' : ''}>${isCode(t) ? LEARN.hl(t) : esc(t)}</button>`; }).join('')}</div></div>`;
        foot().innerHTML = '';
        animIn(stage().querySelector('.lr-q'));
        speak(q === 0 && i > 0 ? ['lr_check', Q.key] : Q.key, { quiet: true });
      }
      S._answer = j => {
        if (busy || state !== 'quiz') return;
        const btn = stage().querySelector(`.lr-opt[data-i="${j}"]`); if (!btn) return;
        if (j === correct) {
          busy = true;
          btn.classList.add('ok');
          stage().querySelectorAll('.lr-opt').forEach(b => { if (b !== btn) b.classList.add('off'); });
          sfx.spark && sfx.spark(); burst(btn); if (barSj) barSj.wow();
          speak(['lr_good1', 'lr_good2', 'lr_good3'][q % 3], { pri: 'feedback', quiet: true, noReplay: true });
          later(() => { q++; if (q < total) ask(); else done(mistakes, total); }, 900);
        } else {
          if (!wrongHere) { wrongHere = true; mistakes++; }
          btn.classList.add('no');
          sfx.oops && sfx.oops();
          btn.classList.remove('lr-shake'); void btn.offsetWidth; btn.classList.add('lr-shake');
          speak('lr_try', { pri: 'feedback', quiet: true, noReplay: true });
        }
      };
      ask();
    }
    function burst(el) {
      const f = fx(); if (!f || !f.burst || !el) return;
      const r = el.getBoundingClientRect();
      f.burst(r.left + r.width / 2, r.top + r.height / 2, 18, ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
    }

    /* ---------- النهاية ---------- */
    function win(saveId, n, key) {
      state = 'win';
      save(saveId, n);
      sfx.win && sfx.win();
      const f = fx(); if (f && f.confetti) f.confetti();
      speak(key || 'lr_win', { pri: 'feedback', force: true, quiet: true, noReplay: true });
      foot().innerHTML = '';
      const box = document.createElement('div');
      box.className = 'lr-win';
      box.innerHTML = `<div class="lr-wcard"><div class="lr-wsj"></div><h2>${esc(text(key || 'lr_win'))}</h2>
        <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="lr-wacts"><button class="sq" data-lr="again" aria-label="مرة أخرى">↻</button><button class="run lr-done" data-lr="done">✔ تم</button></div></div>`;
      rootEl.querySelector('.lr').appendChild(box);
      const s = miniSiraj(box.querySelector('.lr-wsj'));
      if (s) later(() => s.happy(), 250);
      if (hasGsap()) {
        gsap.fromTo(box.querySelector('.lr-wcard'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
        gsap.from(box.querySelectorAll('.w-stars span.on'), { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.25 });
      }
      lock = Date.now() + 500;
    }
    function fail(score, total) {
      state = 'fail';
      sfx.oops && sfx.oops();
      speak('lr_exam_fail', { pri: 'feedback', force: true, quiet: true, noReplay: true });
      stage().innerHTML = `<div class="lr-story"><div class="lr-pic"><span class="lr-emo">💪</span></div><p class="lr-line">${esc(text('lr_exam_fail'))}</p><p class="lr-score" dir="ltr">${score} / ${total}</p></div>`;
      foot().innerHTML = `<button class="lr-next lr-retry run" data-lr="again">↻ مرة أخرى</button>`;
    }
    const starsOf = m => (m === 0 ? 3 : m === 1 ? 2 : 1);

    /* ---------- الصفحات ---------- */
    function openPage(id) {
      const pg = PG();
      curPage = id;
      const info = LEARN.pages.find(p => p.id === id);
      if (id === 'notebook' || !info) return notebook();
      const saveId = LEARN.saveKey(id);
      frame(info.title, info.icon, '');
      if (id === 'intro' || id === 'laptop') {
        const d = pg[id];
        const steps = d.screens.map(s => ({ type: 'story', key: s.key, pic: s.pic })).concat([{ type: 'quiz', qs: d.quiz }]);
        runFlow(id, steps, m => win(saveId, starsOf(m)));
      } else if (id.startsWith('lesson:')) {
        const c = id.slice(7), L = pg.lessons[c];
        const steps = [{ type: 'story', key: `lr_${c}_ex`, pic: L.pic }, { type: 'code', lines: L.code }, { type: 'quiz', qs: L.quiz }];
        runFlow(id, steps, m => win(saveId, starsOf(m)));
      } else if (id === 'exam') {
        const qs = shuffle(pg.examPool()).slice(0, 10);
        const steps = [{ type: 'story', key: 'lr_exam_go', pic: '<span class="lr-emo">🎓</span>' }, { type: 'quiz', qs }];
        runFlow(id, steps, (m, t) => { const score = t - m; if (score >= 8) win(saveId, score >= 10 ? 3 : score === 9 ? 2 : 1, 'lr_exam_pass'); else fail(score, t); });
      }
    }

    /* ---------- الضغطات ---------- */
    const ACT = {
      exit: () => { close(); back(); },
      back: () => { if (fromNotebook && curPage) notebook(); else { close(); back(); } },
      page: t => { sfx.tap && sfx.tap(); openPage(t.dataset.page); },
      next: () => { if (S._next) { const f = S._next; f(); } },
      replay: () => { sfx.tap && sfx.tap(); if (lastSeq) speak(lastSeq.list, lastSeq.o); },
      again: () => { if (curPage) openPage(curPage); },
      done: () => { state = 'done'; if (fromNotebook) notebook(); else { close(); back(); } },
    };
    const onClick = e => {
      const t = e.target.closest('[data-lr], .lr-opt');
      if (!t || t.disabled || !rootEl.contains(t)) return;
      if (Date.now() < lock) return;
      e.stopPropagation();
      if (t.classList.contains('lr-opt')) { if (S._answer) S._answer(+t.dataset.i); return; }
      const f = ACT[t.dataset.lr];
      if (f) f(t, e);
    };
    rootEl.addEventListener('click', onClick);

    function close() {
      if (closed) return; closed = true;
      teardown();
      rootEl.removeEventListener('click', onClick);
      GHOST.forEach(ev => rootEl.removeEventListener(ev, ghost, true));
      rootEl.innerHTML = '';
    }

    const self = {
      open(id) { fromNotebook = id === 'notebook'; openPage(id); }, close, P, speak,
      get state() { return state; }, get page() { return curPage; }, get correct() { return correct; },
      // للاختبار: محدّد الزرّ الصحيح التالي
      next() {
        if (state === 'story' || state === 'code') return '.lr-next';
        if (state === 'quiz') return `.lr-opt[data-i="${correct}"]`;
        if (state === 'win') return '.lr-done';
        if (state === 'fail') return '.lr-retry';
        return null;
      },
      _next: null, _answer: null,
    };
    return self;
  }
})(window);

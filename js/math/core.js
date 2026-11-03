/* الرياضيات: نفس عقد عالم الكمبيوتر (MATH.render(app, ctx) و MATH.destroy())
   قائمة الأقسام ← قائمة الأنشطة ← النشاط. كل قسم يسجّل نفسه بـ MATH.register، وكل نشاط له mount(el, A) يرجّع { solve(), destroy() }.
   A = أدوات النشاط (الصوت، المؤقّتات، السحب، الفوز...) وكلها تتنظّف تلقائياً عند الخروج.
   A.game(spec) = محرّك الجولات المشترك: نقاط التقدّم، جولة التحدّي الأخيرة 🏆، حماية الضغطتين، والانتقال بعد انتهاء الصوت. */
(function (root) {
  'use strict';

  const plain = s => String(s == null ? '' : s).replace(/[ً-ْٰ]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hasGsap = () => typeof root.gsap !== 'undefined';
  const LRI = '⁦', PDI = '⁩';

  // اختيارات قريبة من الإجابة (بدون تكرار، وكلها في المدى)
  function near(ans, n, lo, hi, spread) {
    lo = lo == null ? 0 : lo; hi = hi == null ? Math.max(ans + 5, 10) : hi; spread = spread || 3;
    const set = new Set([ans]);
    let guard = 0;
    while (set.size < n && guard++ < 200) {
      const v = ans + (Math.random() < 0.5 ? -1 : 1) * rand(1, spread + Math.floor(guard / 20));
      if (v >= lo && v <= hi) set.add(v);
    }
    for (let v = lo; set.size < n && v <= hi + n; v++) set.add(v);
    return shuffle([...set]);
  }

  // الرقم → مقاطع الصوت: ٠–٢٠ من n_ ، والعشرات m_t_ ، و ٤٧ = n_7 + m_wt_40
  function numKeys(n) {
    n = Math.round(+n);
    if (n < 0) return [];
    if (n <= 20) return ['n_' + n];
    if (n >= 100) return ['m_t_100'];
    const t = Math.floor(n / 10) * 10, u = n % 10;
    return u ? ['n_' + u, 'm_wt_' + t] : ['m_t_' + t];
  }
  const OPK = { '+': 'm_plus', '-': 'm_minus', '−': 'm_minus', '×': 'm_times', '÷': 'm_div' };
  // مسألة كاملة بالصوت: ٣ زائد ٢ يساوي كم؟ (أو يساوي ٥ لو res موجود)
  function eqKeys(a, op, b, res) {
    return numKeys(a).concat([OPK[op]], numKeys(b), res == null ? ['m_eq_q'] : ['m_eq'].concat(numKeys(res)));
  }
  const OPS = { '+': '+', '-': '−', '−': '−', '×': '×', '÷': '÷' };
  const eqText = (a, op, b, res) => `${a} ${OPS[op]} ${b} = ${res == null ? '?' : res}`;
  // المسألة مكتوبة بمربعات كبيرة (من الشمال لليمين مثل الكتب)
  function eqHtml(parts, cls) {
    return `<div class="mt-eq ${cls || ''}" dir="ltr">${parts.map(p => (p === '?' ? '<b class="q">?</b>' : /^[+\-−×÷=]$/.test(String(p)) ? `<i>${OPS[p] || p}</i>` : `<b>${p}</b>`)).join('')}</div>`;
  }
  // كسر مكتوب فوق بعض
  const frac = (a, b) => `<span class="mt-frac"><b>${a}</b><i>${b}</i></span>`;

  const MATH = root.MATH = root.MATH || {};
  const sections = MATH.sections = MATH.sections || [];
  MATH.art = MATH.art || {};
  MATH.util = { plain, esc, rand, pick, shuffle, near, numKeys, eqKeys, eqText, eqHtml, frac };
  MATH.register = sec => { sections.push(sec); sections.sort((a, b) => a.order - b.order); };
  const TXT = () => root.MATH_TEXTS || {};
  const NUMS = () => (root.SIRAJ_TEXTS && root.SIRAJ_TEXTS.NUMS) || [];
  const textOf = k => { const t = TXT()[k]; if (t) return t; const m = /^n_(\d+)$/.exec(k); return m ? NUMS()[+m[1]] || '' : ''; };
  MATH.textOf = textOf;

  let S = null; // الجلسة الحالية

  MATH.render = function (rootEl, ctx) {
    if (S) S.close();
    S = session(rootEl, ctx || {});
    MATH._s = S;
    S.home();
    return { destroy: () => MATH.destroy() };
  };
  MATH.destroy = () => { if (S) S.close(); S = null; MATH._s = null; };

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
    const line = k => { const kk = vkey(k); return [kk, textOf(kk)]; };
    const text = k => plain(textOf(vkey(k)));
    let lastSeq = null, lastOpts = null;
    // كل الصوت يمر بسياسة Voice (sfx.js): opts.pri = instruction|feedback|name|ambient، و force لزر 🔊
    // opts.text = نص الفقاعة بدل الكلام (مثلاً المسألة بالأرقام: 3 + 2 = ?)
    function speak(list, opts) {
      opts = opts || {};
      list = (Array.isArray(list) ? list : [list]).filter(Boolean);
      const items = list.map(k => (Array.isArray(k) ? k : line(k))).filter(i => i[1]);
      if (!items.length) { if (opts.text && !opts.quiet) bubble(opts.text); return ''; }
      const V = root.Voice;
      const instr = opts.pri ? opts.pri === 'instruction' : !V || !V.cls || list.some(k => typeof k !== 'string' || V.cls(vkey(k)) === 'instruction');
      if (!opts.noReplay && instr) { lastSeq = list; lastOpts = { pri: opts.pri, text: opts.text }; }
      const vo = { pri: opts.pri, force: opts.force, cool: opts.cool, cut: opts.cut != null ? opts.cut : opts.pri === 'feedback' };
      try {
        if (ctx.playSeq) ctx.playSeq(items, vo);
        else if (ctx.play) ctx.play(items, vo);
        else if (V) V.playSeq(items, vo);
      } catch (e) { /* الصوت اختياري */ }
      const shown = opts.text != null ? opts.text : plain(items.map(i => i[1]).join(' '));
      if (!opts.quiet) bubble(shown);
      if (barSj) barSj.talk(Math.min(4000, 500 + plain(items.map(i => i[1]).join(' ')).length * 70));
      return shown;
    }
    function bubble(t) {
      const b = rootEl.querySelector('.mt-bub-t'); if (!b || !t) return;
      b.textContent = /^[\d\s+\-−×÷=?:<>→]+$/.test(t) ? LRI + t + PDI : t;
      if (hasGsap()) gsap.fromTo(b, { opacity: 0.2 }, { opacity: 1, duration: 0.3 });
    }

    const stars = id => +(P.progress['math:' + id] || 0);
    function save(id, n) {
      const k = 'math:' + id;
      n = Math.max(0, Math.min(3, n | 0));
      // ctx.saveProgress يستقبل المفتاح كاملاً بالبادئة math:<id> (يُحفظ كما هو: Store.win(p, key, stars))
      if (ctx.saveProgress) { try { ctx.saveProgress(k, n); } catch (e) { /* لا شيء */ } }
      if ((P.progress[k] || 0) < n) P.progress[k] = n; // لو الـ ctx ما حدّث اللاعب
    }
    const allStars = () => Object.keys(P.progress).filter(k => k.startsWith('math:')).reduce((a, k) => a + (+P.progress[k] || 0), 0);

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
      rootEl.innerHTML = `<div class="mt ${cls || ''}" dir="rtl">${html}</div>`;
    }
    // لمسة "شبح" من الضغطة اللي فتحت الشاشة ما توصل للعبة الجديدة
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
    const secStars = sec => sec.activities.reduce((a, x) => a + stars(x.id), 0);
    const ageBadge = m => (m > age ? `<span class="mt-age">${m}+</span>` : '');

    /* ---------- قائمة الأقسام ---------- */
    function home() {
      screen(`<div class="sky"></div><div class="mt-nums-bg" aria-hidden="true">1 2 3 + 5 × 7 = 9 ½ 4 − 8 6 0</div>
        <header class="bar"><button class="ib" data-mt="exit" aria-label="رجوع">→</button>
          <span class="mt-bsj" id="mtSj"></span><span class="t">الرياضيات</span><span class="chip">⭐ ${allStars()}</span></header>
        <div class="mt-scroll"><div class="mt-grid mt-secs">
          ${sections.map((s, i) => `<button class="mt-sec ${s.rec && s.rec(age) ? 'rec' : ''} ${s.minAge > age ? 'dim' : ''}" data-mt="sec" data-i="${i}" style="--sc:${s.color}">
            <span class="mt-sec-ic">${s.icon}</span><b>${esc(s.name)}</b>
            <span class="mt-lamps">${s.activities.map(a => `<i class="${stars(a.id) ? 'on' : ''}"></i>`).join('')}</span>
            ${ageBadge(s.minAge)}</button>`).join('')}
        </div></div>`, 'night mt-home');
      barSj = miniSiraj(rootEl.querySelector('#mtSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.mt-sec'), { y: 30, opacity: 0, scale: 0.9, stagger: 0.06, duration: 0.45, ease: 'back.out(1.8)' });
      speak(['m_hello', 'm_pick_sec'], { quiet: true });
    }

    /* ---------- قائمة الأنشطة ---------- */
    let curSec = null;
    function sectionScreen(sec, silent) {
      curSec = sec;
      screen(`<div class="sky"></div>
        <header class="bar" style="--sc:${sec.color}"><button class="ib" data-mt="home" aria-label="رجوع">→</button>
          <span class="mt-bsj" id="mtSj"></span><span class="t">${sec.icon} ${esc(sec.name)}</span><span class="chip">⭐ ${secStars(sec)}</span></header>
        <div class="mt-scroll"><div class="mt-grid mt-acts">
          ${sec.activities.map((a, i) => {
            const st = stars(a.id);
            return `<button class="mt-act ${a.minAge > age ? 'dim' : ''} ${st ? 'done' : ''}" data-mt="act" data-i="${i}" style="--sc:${sec.color}">
              <span class="mt-act-ic">${a.icon}</span><b>${esc(a.name)}</b>
              <span class="mt-st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span>${ageBadge(a.minAge)}</button>`;
          }).join('')}
        </div></div>`, 'night mt-list');
      barSj = miniSiraj(rootEl.querySelector('#mtSj'));
      if (hasGsap()) gsap.from(rootEl.querySelectorAll('.mt-act'), { y: 24, opacity: 0, stagger: 0.05, duration: 0.4, ease: 'back.out(1.8)' });
      if (!silent) speak([sec.voice, 'm_pick_game'], { quiet: true });
    }

    /* ---------- النشاط ---------- */
    function openActivity(sec, act) {
      curSec = sec;
      screen(`<header class="bar mt-bar" style="--sc:${sec.color}"><button class="ib" data-mt="back" aria-label="رجوع">→</button>
          <span class="mt-bsj" id="mtSj"></span>
          <div class="mt-bub"><span class="mt-bub-i">${act.icon}</span><span class="mt-bub-t">${esc(act.name)}</span></div>
          <button class="ib" data-mt="replay" aria-label="اسمع مرة أخرى">🔊</button></header>
        <div class="mt-stage" id="mtStage" style="--sc:${sec.color}"></div>`, 'mt-play mt-s-' + sec.id);
      barSj = miniSiraj(rootEl.querySelector('#mtSj'));
      const stage = rootEl.querySelector('#mtStage');
      const A = api(sec, act, stage);
      let inst = null;
      try { inst = act.mount(stage, A) || {}; } catch (e) { console.error(e); inst = {}; }
      cur = { sec, act, A, inst };
      MATH._act = cur;
    }
    function closeActivity() {
      const c = cur; cur = null; MATH._act = null;
      if (!c) return;
      try { if (c.inst && c.inst.destroy) c.inst.destroy(); } catch (e) { console.warn(e); }
      c.A._cleanup();
      if (root.Voice && root.Voice.stop) root.Voice.stop();
    }

    function api(sec, act, stage) {
      const timers = [], ivals = [], rafs = new Set(), offs = [], own = [];
      let alive = true, backHandler = null, resizeT = null;
      const A = {
        el: stage, player: P, age, girl, color, sfx, util: MATH.util, art: MATH.art, sec, act,
        get alive() { return alive; },
        key: vkey, text, line,
        say: (k, o) => speak(k, o),
        num: numKeys,
        later(fn, ms) { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; },
        // الخطوة التالية بعد ما سراج يخلّص جملته (على الأقل min، وأقصى حد max). بدون صوت: بعد min بس
        afterVoice(fn, min, max) {
          const t0 = Date.now(), V = root.Voice;
          const tick = () => { const e = Date.now() - t0; if (e >= (max || 9000) || !(V && V.busy && V.busy())) fn(); else A.later(tick, 150); };
          return A.later(tick, min || 900);
        },
        every(fn, ms) { const t = setInterval(() => { if (alive) fn(); }, ms); ivals.push(t); return t; },
        wait: ms => new Promise(r => { timers.push(setTimeout(r, ms)); }),
        loop(fn) {
          let last = performance.now(), id;
          const step = now => { rafs.delete(id); if (!alive) return; const dt = Math.min(50, now - last); last = now; if (fn(dt) !== false) { id = requestAnimationFrame(step); rafs.add(id); } };
          id = requestAnimationFrame(step); rafs.add(id);
          return () => { cancelAnimationFrame(id); rafs.delete(id); };
        },
        on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); offs.push(() => target.removeEventListener(ev, fn, opt)); },
        onResize(fn) { A.on(root, 'resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => alive && fn(), 160); }); },
        onBack(fn) { backHandler = fn; },
        onDestroy(fn) { own.push(fn); },
        siraj(el, opts) { if (!SirajLib || !el) return null; const s = SirajLib.create(el, color, opts); own.push(() => s.destroy()); return s; },
        // سراج واحد داخل المشهد: الجديد يقفل القديم (المشهد يتمسح كل جولة)
        sj1(el, opts) { if (A._sj) A._sj.destroy(); A._sj = el ? A.siraj(el, Object.assign({ shadow: false }, opts)) : null; return A._sj; },
        sirajSvg: (opts) => (SirajLib ? SirajLib.svg(color, Object.assign({ shadow: false }, opts)) : ''),
        get barSj() { return barSj; },
        burst(el, n, colors) {
          const f = fx(); if (!f || !el) return;
          const r = el.getBoundingClientRect();
          f.burst(r.left + r.width / 2, r.top + r.height / 2, n || 18, colors || ['#ffd23e', '#ff6b9a', '#4fd1ff', '#7cff8a']);
        },
        pop(el) { if (el && hasGsap()) gsap.fromTo(el, { scale: 1 }, { scale: 1.15, duration: 0.14, yoyo: true, repeat: 1, overwrite: 'auto' }); },
        good(el, k) { sfx.spark && sfx.spark(); A.burst(el); if (barSj) barSj.wow(); if (k) speak(k, { pri: 'feedback', cut: true }); A.pop(el); },
        bad(el, k) { sfx.oops && sfx.oops(); if (barSj) barSj.sad(); if (k) speak(k, { pri: 'feedback', cut: true }); if (el) { el.classList.remove('mt-shake'); void el.offsetWidth; el.classList.add('mt-shake'); } },
        praiseKey() { const ks = ['m_good1', 'm_good2', 'm_good3', 'm_good4']; return root.Voice && root.Voice.pick ? root.Voice.pick(ks) : pick(ks); },
        tryKey() { return pick(['m_try', 'm_look']); },
        hit(el, x, y, pad) { const r = el.getBoundingClientRect(); pad = pad || 0; return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; },
        drag: (el, o) => drag(el, o, A),
        stars, save,
        // شبكة أشياء تكبر قد ما المكان يسمح (أعمدة × صفوف تختار أكبر حجم)
        fitGrid(box, n, max, min) {
          const W = box.clientWidth, H = box.clientHeight;
          if (!W || !H) return;
          const gap = 6;
          let best = 0, bc = 1;
          for (let c = 1; c <= n; c++) { const rr = Math.ceil(n / c), s = Math.min((W - gap * (c - 1)) / c, (H - gap * (rr - 1)) / rr); if (s > best + 0.5) { best = s; bc = c; } }
          const s = Math.floor(Math.max(min || 26, Math.min(max || 96, best)));
          box.style.setProperty('--c', s + 'px');
          box.style.gridTemplateColumns = `repeat(${bc}, var(--c))`;
        },
        win(o) { return showWin(A, o || {}); },
        game: spec => game(A, spec),
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

    /* ---------- محرّك الجولات ---------- */
    function game(A, spec) {
      const el = A.el, N = spec.rounds, chal = spec.challenge !== false && N > 2;
      el.innerHTML = `<div class="mt-game ${spec.cls || ''}"><div class="mt-dots" id="mtd"></div>
        <div class="mt-scene" id="mts"></div><div class="mt-choices" id="mtc"></div></div>`;
      const dots = el.querySelector('#mtd'), scene = el.querySelector('#mts'), chBox = el.querySelector('#mtc');
      dots.innerHTML = Array.from({ length: N }, (_, i) => `<i class="${chal && i === N - 1 ? 'chal' : ''}"></i>`).join('');
      const setDots = k => dots.querySelectorAll('i').forEach((d, i) => { d.classList.toggle('on', i < k); d.classList.toggle('cur', i === k); });
      let r = 0, mistakes = 0, busy = true, lockT = 0, done = false, R = null, roundMiss = 0;
      const G = {
        get r() { return r; }, get R() { return R; }, get mistakes() { return mistakes; }, get done() { return done; },
        scene, chBox, el,
        ready: () => A.alive && !busy && !done && Date.now() >= lockT,
      };
      // ضغطة على اختيار: مرة واحدة لكل جولة (busy)، وتتجاهل الضغطات أول ٣٥٠ ملي ثانية من الجولة
      A.on(el, 'click', e => {
        const b = e.target.closest('.mt-ch');
        if (!b || !R || !R.vals || b.classList.contains('no') || !G.ready()) return;
        const v = R.vals[+b.dataset.ci];
        if (R.onPick) { R.onPick(v, b); return; }
        if (R.chk(v)) R.right(b, R.okSay ? R.okSay(v) : null);
        else R.wrong(b, R.noSay ? R.noSay(v) : null);
      });
      function start() {
        if (!A.alive) return;
        busy = false; lockT = Date.now() + 350; roundMiss = 0;
        setDots(r);
        scene.innerHTML = ''; chBox.innerHTML = ''; chBox.className = 'mt-choices'; scene.className = 'mt-scene';
        const last = chal && r === N - 1;
        const pre = [].concat(r === 0 && spec.intro ? spec.intro : [], last ? ['m_challenge'] : []);
        if (last) banner();
        R = {
          r, last, scene, chBox, data: {}, ready: () => G.ready(),
          // سؤال الجولة: تعليمة (تُعاد بزر 🔊)
          ask(keys, o) { const k = pre.splice(0).concat(keys || []); return speak(k, Object.assign({ pri: 'instruction', cool: 400 }, o || {})); },
          choices(vals, ans, o) {
            o = o || {};
            const box = o.box || chBox;
            if (o.cls) box.classList.add(o.cls);
            R.vals = vals; R.ans = ans; R.chk = o.check || (v => v === ans); R.okSay = o.okSay; R.noSay = o.noSay;
            box.insertAdjacentHTML('beforeend', vals.map((v, i) => `<button class="mt-ch ${o.btnCls || ''}" data-ci="${i}" ${o.label ? `aria-label="${esc(o.label(v))}"` : ''}>${o.html ? o.html(v, i) : `<b dir="ltr">${esc(v)}</b>`}</button>`).join(''));
            const bs = box.querySelectorAll('.mt-ch');
            if (hasGsap() && !o.noAnim) gsap.from(bs, { scale: 0.4, opacity: 0, stagger: 0.06, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform,opacity' });
            R.solver = () => { const i = vals.findIndex(v => R.chk(v)); const b = el.querySelector(`.mt-ch[data-ci="${i}"]`); if (b) b.click(); };
            return bs;
          },
          // إجابة صحيحة: مرة واحدة فقط في الجولة
          right(btn, keys, o) {
            if (busy || done) return false;
            busy = true; o = o || {};
            if (btn) btn.classList.add('ok');
            A.good(btn || scene, null);
            speak([].concat(keys || [], o.noPraise ? [] : [A.praiseKey()]), { pri: 'feedback', cut: true, cool: 300, noReplay: true, text: o.text });
            try { if (o.anim) o.anim(); else if (R.okAnim) R.okAnim(); } catch (e) { console.error(e); }
            flyStar(btn || scene, r);
            A.afterVoice(next, o.min || 1300, 6500);
            return true;
          },
          wrong(btn, keys) {
            if (busy || done) return false;
            mistakes++; roundMiss++;
            if (btn && btn.classList.contains('mt-ch')) btn.classList.add('no');
            A.bad(btn, keys || A.tryKey());
            if (roundMiss >= 2 && R.hint) R.hint();
            else if (roundMiss >= 2 && R.vals) { const i = R.vals.findIndex(v => R.chk(v)); const b = el.querySelector(`.mt-ch[data-ci="${i}"]`); if (b) b.classList.add('hint'); }
            return true;
          },
          // انتهى الوقت (تحدّي السرعة): بدون عقاب، سؤال جديد
          skip(keys) { if (busy || done) return; busy = true; mistakes++; speak(keys || 'm_sp_time', { pri: 'feedback', cut: true, noReplay: true }); A.afterVoice(next, 1100, 4000); },
        };
        try { spec.round(r, R, G); } catch (e) { console.error(e); }
        // المقاسات تُحسب بعد ما الاختيارات تنزل (المشهد بيصغر بعدها)
        try { if (R.fit) R.fit(); } catch (e) { console.error(e); }
      }
      A.onResize(() => { if (R && R.fit) R.fit(); });
      // نجمة صغيرة تطير من الإجابة إلى نقطة الجولة، والنقطة تنط
      function flyStar(from, k) {
        const dot = dots.querySelectorAll('i')[k], host = el.querySelector('.mt-game');
        if (!dot || !host || !from || !hasGsap()) return;
        const h = host.getBoundingClientRect(), a = from.getBoundingClientRect(), b = dot.getBoundingClientRect();
        const s = document.createElement('span');
        s.className = 'mt-flystar'; s.textContent = '⭐';
        s.style.left = (a.left + a.width / 2 - h.left) + 'px'; s.style.top = (a.top + a.height / 2 - h.top) + 'px';
        host.appendChild(s);
        gsap.timeline({ onComplete: () => { s.remove(); dot.classList.add('on'); gsap.fromTo(dot, { scale: 2.2 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', clearProps: 'transform' }); } })
          .to(s, { scale: 1.6, duration: 0.18, ease: 'back.out(3)' })
          .to(s, { left: b.left + b.width / 2 - h.left, top: b.top + b.height / 2 - h.top, scale: 0.5, duration: 0.55, ease: 'power2.in' });
      }
      function banner() {
        const b = document.createElement('div');
        b.className = 'mt-chal-b'; b.innerHTML = '<span>🏆</span><b>تحدّي!</b>';
        el.querySelector('.mt-game').appendChild(b);
        sfx.light && sfx.light();
        if (A.barSj) A.barSj.wave();
        if (hasGsap()) gsap.timeline().from(b, { scale: 0.3, opacity: 0, duration: 0.4, ease: 'back.out(2)' }).to(b, { opacity: 0, y: -30, duration: 0.4, delay: 0.9, onComplete: () => b.remove() });
        else A.later(() => b.remove(), 1500);
      }
      function next() {
        if (!A.alive || done) return;
        if (spec.after) spec.after(r, R);
        r++;
        if (r < N) start();
        else {
          done = true; setDots(N);
          const s = spec.stars ? spec.stars(mistakes) : mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          A.win(Object.assign({ stars: s }, spec.win ? spec.win(mistakes) : {}));
        }
      }
      A.later(start, 250);
      G.solve = async () => {
        while (A.alive && !done) {
          if (G.ready() && R && R.solver) R.solver();
          await A.wait(200);
        }
      };
      return G;
    }

    /* ---------- الفوز ---------- */
    function showWin(A, o) {
      const n = o.stars == null ? 3 : Math.max(1, Math.min(3, o.stars));
      save(o.id || A.act.id, n);
      sfx.win && sfx.win();
      const f = fx(); if (f && f.confetti) f.confetti();
      const w = root.Voice && root.Voice.pick ? root.Voice.pick(['m_win1', 'm_win2', 'm_win3']) : 'm_win' + rand(1, 3);
      speak([w].concat(o.say ? [o.say] : []), { noReplay: true, pri: 'feedback', force: true });
      const old = rootEl.querySelector('.mt-win'); if (old) old.remove();
      const acts = A.sec.activities, nx = acts[acts.indexOf(A.act) + 1];
      const box = document.createElement('div');
      box.className = 'mt-win';
      box.innerHTML = `<div class="mt-wcard"><div class="mt-wsj"></div><h2>${esc(text(w))}</h2>
        <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</div>
        ${o.note ? `<p class="mt-wnote">${esc(o.note)}</p>` : ''}
        <div class="mt-wacts"><button class="sq" data-mt="again" aria-label="مرة أخرى">↻</button>
          <button class="run" data-mt="done">${nx ? '▶ التالي' : '✔ تم'}</button></div></div>`;
      rootEl.querySelector('.mt').appendChild(box);
      const s = A.siraj(box.querySelector('.mt-wsj'), { shadow: false });
      if (s) A.later(() => s.happy(), 250);
      if (barSj) barSj.happy();
      if (hasGsap()) {
        gsap.fromTo(box.querySelector('.mt-wcard'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
        gsap.from(box.querySelectorAll('.w-stars span.on'), { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.25 });
      }
      lock = Date.now() + 600;
      S.winOpts = { A, o, nx };
      MATH._won = (MATH._won || 0) + 1;
    }

    /* ---------- السحب والإفلات (لمس وفأرة) ---------- */
    function drag(el, o, A) {
      el.style.touchAction = 'none';
      el.classList.add('mt-draggable');
      let id = null, sx = 0, sy = 0, moved = false, bx = 0, by = 0;
      const down = e => {
        if (id !== null || (o.enabled && !o.enabled()) || (e.button && e.button !== 0)) return;
        id = e.pointerId; try { el.setPointerCapture(id); } catch (er) { /* لا شيء */ }
        sx = e.clientX; sy = e.clientY; moved = false;
        if (hasGsap()) { gsap.killTweensOf(el); bx = +gsap.getProperty(el, 'x') || 0; by = +gsap.getProperty(el, 'y') || 0; }
        el.classList.add('mt-dragging');
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
        id = null; el.classList.remove('mt-dragging');
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
      home: () => { vstop(); home(); },
      sec: t => { const sec = sections[+t.dataset.i]; sfx.tap && sfx.tap(); sectionScreen(sec); },
      act: t => { const a = curSec.activities[+t.dataset.i]; sfx.tap && sfx.tap(); openActivity(curSec, a); },
      back: () => { if (cur && cur.A._back()) return; vstop(); sectionScreen(curSec, true); },
      replay: () => { sfx.tap && sfx.tap(); if (lastSeq) speak(lastSeq, Object.assign({}, lastOpts, { force: true, cool: 1 })); },
      again: () => { const w = S.winOpts; S.winOpts = null; if (w && cur) openActivity(cur.sec, cur.act); },
      done: () => { const w = S.winOpts; S.winOpts = null; if (w && w.nx && cur) openActivity(cur.sec, w.nx); else sectionScreen(curSec, true); },
    };
    function vstop() { if (root.Voice && root.Voice.stop) root.Voice.stop(); }
    onClick = e => {
      const t = e.target.closest('[data-mt]');
      if (!t || t.disabled || !rootEl.contains(t)) return;
      if (Date.now() < lock && !t.closest('.mt-stage')) return;
      const f = ACT[t.dataset.mt];
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

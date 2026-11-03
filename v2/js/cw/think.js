/* القسم ٦: كيف يفكّر الكمبيوتر (٧ سنوات فأكثر) — بطاقات الأرقام الثنائية، رسم بالأصفار والآحاد، ترتيب الخطوات، وخمّن الرقم */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util;

  /* ---------- البطاقات الثنائية ---------- */
  const VALS = [16, 8, 4, 2, 1];
  const binary = {
    id: 'binary', name: 'بطاقات الأرقام', icon: '💡', minAge: 7,
    mount(el, A) {
      const targets = A.age <= 7 ? [3, 6, 10, 17, 25] : [U.rand(3, 7), U.rand(9, 15), U.rand(17, 23), U.rand(25, 30), 31];
      el.innerHTML = `<div class="cw-binary"><div class="cw-dots" id="d"></div>
        <div class="cw-bin-goal"><span>🎯 <b id="tg"></b></span><span class="cw-bin-sum">= <b id="sm">0</b></span></div>
        <div class="cw-bcards" dir="ltr">${VALS.map((v, i) => `<button class="cw-bcard" data-i="${i}"><span class="cw-bface">
          <span class="cw-bdots">${'<i></i>'.repeat(v)}</span><b>${v}</b></span><span class="cw-bback"><span class="cw-bdots">${'<i></i>'.repeat(v)}</span><b>${v}</b></span></button>`).join('')}</div>
        <div class="cw-bits" dir="ltr">${VALS.map(() => '<b>0</b>').join('')}</div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), targets.length);
      const on = [0, 0, 0, 0, 0];
      let r = 0, busy = false, warned = false;
      const sum = () => on.reduce((a, b, i) => a + b * VALS[i], 0);
      function show() {
        busy = false; warned = false; setDot(r);
        on.fill(0); paint();
        q('#tg').textContent = targets[r];
        if (root.gsap) gsap.from(q('#tg'), { scale: 2, duration: 0.4, ease: 'back.out(2)' });
        A.say(r === 0 ? ['cw_bin', 'cw_bin_tip'] : 'cw_bin_next');
      }
      function paint() {
        el.querySelectorAll('.cw-bcard').forEach((c, i) => c.classList.toggle('on', !!on[i]));
        el.querySelectorAll('.cw-bits b').forEach((b, i) => { b.textContent = on[i]; b.classList.toggle('on', !!on[i]); });
        q('#sm').textContent = sum();
      }
      A.on(el, 'click', e => {
        const c = e.target.closest('.cw-bcard'); if (!c || busy) return;
        const i = +c.dataset.i; on[i] = on[i] ? 0 : 1;
        A.sfx[on[i] ? 'light' : 'tap']();
        paint();
        const s = sum(), t = targets[r];
        if (s === t) {
          busy = true;
          el.querySelector('.cw-bits').classList.add('win');
          A.good(q('.cw-bits'), 'cw_bin_ok');
          A.afterVoice(() => { el.querySelector('.cw-bits').classList.remove('win'); r++; if (r < targets.length) show(); else { setDot(targets.length); A.win({ stars: 3 }); } }, 1200, 7000);
        } else if (s > t && !warned) { warned = true; A.bad(q('.cw-bin-sum'), 'cw_bin_high'); }
      });
      A.later(show, 250);
      return {
        async solve() {
          while (A.alive && r < targets.length) {
            if (!busy) { const t = targets[r]; VALS.forEach((v, i) => { const want = (t & v) ? 1 : 0; if (on[i] !== want && !busy) el.querySelector(`.cw-bcard[data-i="${i}"]`).click(); }); }
            await A.wait(2400);
          }
        },
      };
    },
  };

  /* ---------- رسام البكسل ---------- */
  const PICS = {
    plus: ['001100', '001100', '111111', '111111', '001100', '001100'],
    heart: ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'],
    house: ['00011000', '00111100', '01111110', '11111111', '01000010', '01011010', '01011010', '01111110'],
    robot: ['00011000', '00111100', '11111111', '10011001', '10011001', '11111111', '10000001', '11111111'],
  };
  const PCOL = { plus: '#3d8bff', heart: '#e8579a', house: '#ff9a2e', robot: '#8b5cf6' };
  const pixel = {
    id: 'pixel', name: 'رسام البكسل', icon: '🟦', minAge: 7,
    mount(el, A) {
      const list = A.age <= 7 ? ['plus', 'heart', 'house'] : ['heart', 'house', 'robot'];
      el.innerHTML = `<div class="cw-px"><div class="cw-dots" id="d"></div><div class="cw-px-main"><div class="cw-px-box" id="bx"></div></div>
        <div class="cw-px-acts"><button class="sq" data-x="check" aria-label="تحقق">🔍</button></div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), list.length);
      let r = 0, grid = [], pic = null, busy = false;
      function show() {
        busy = false; setDot(r);
        pic = PICS[list[r]];
        const n = pic.length;
        grid = pic.map(row => [...row].map(() => 0));
        q('#bx').innerHTML = `<div class="cw-px-grid" style="--n:${n};--pc:${PCOL[list[r]]}" dir="ltr">${pic.map((row, y) => `<div class="cw-px-row">
          ${[...row].map((b, x) => `<button class="cw-px-c" data-y="${y}" data-x="${x}" aria-label="مربع"></button>`).join('')}
          <code class="cw-px-code">${row}</code></div>`).join('')}</div>`;
        fit();
        if (root.gsap) gsap.from(q('.cw-px-grid'), { scale: 0.8, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
        A.say(r === 0 ? ['cw_px', 'cw_px_0'] : 'cw_px_next');
      }
      function fit() {
        const main = q('.cw-px-main'), n = pic.length;
        // كود الصف بخط أصغر (٠٫٣٨ من المربع) عشان المربعات تكبر قد ما نقدر
        const cell = Math.floor(Math.max(18, Math.min(58, (main.clientWidth - 20 - 2 * n) / (n * 1.24), (main.clientHeight - 16 - 2 * n) / n)));
        q('.cw-px-grid').style.setProperty('--c', cell + 'px');
      }
      A.onResize(() => pic && fit());
      const matches = () => pic.every((row, y) => [...row].every((b, x) => +b === grid[y][x]));
      A.on(el, 'click', e => {
        const c = e.target.closest('.cw-px-c');
        if (c && !busy) {
          const y = +c.dataset.y, x = +c.dataset.x;
          grid[y][x] = grid[y][x] ? 0 : 1;
          c.classList.toggle('on', !!grid[y][x]); c.classList.remove('bad');
          A.sfx.pen();
          if (matches()) {
            busy = true;
            q('.cw-px-grid').classList.add('done');
            A.good(q('.cw-px-grid'), 'cw_px_ok');
            A.later(() => { r++; if (r < list.length) show(); else { setDot(list.length); A.win({ stars: 3 }); } }, 2500);
          }
          return;
        }
        const b = e.target.closest('[data-x="check"]');
        if (b && !busy) {
          let bad = 0;
          el.querySelectorAll('.cw-px-c').forEach(cc => { const w = +pic[+cc.dataset.y][+cc.dataset.x]; const wrong = w !== grid[+cc.dataset.y][+cc.dataset.x]; cc.classList.toggle('bad', wrong && grid[+cc.dataset.y][+cc.dataset.x] === 1); if (wrong) bad++; });
          if (el.querySelector('.cw-px-c.bad')) A.bad(b, 'cw_px_fix'); else A.say(bad ? 'cw_px_more' : 'cw_px_ok', { pri: 'feedback' });
        }
      });
      A.later(show, 250);
      return {
        async solve() {
          while (A.alive && r < list.length) {
            if (!busy) el.querySelectorAll('.cw-px-c').forEach(c => { if (!busy && +pic[+c.dataset.y][+c.dataset.x] !== grid[+c.dataset.y][+c.dataset.x]) c.click(); });
            await A.wait(2600);
          }
        },
      };
    },
  };

  /* ---------- رتّب الخطوات (الخوارزمية) ---------- */
  // فرشاة الأسنان رسمة صغيرة (إيموجي الفرشاة جديد وبيظهر مربّع في التلفونات القديمة)
  const BRUSH = '<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><g transform="rotate(-35 20 20)"><rect x="1" y="21" width="27" height="6" rx="3" fill="#3d8bff"/><rect x="25" y="19" width="14" height="8" rx="2.5" fill="#e9f3ff" stroke="#7fb0f0" stroke-width="1.2"/><path d="M27 19v-7M30 19v-7M33 19v-7M36 19v-7" stroke="#4fd1ff" stroke-width="2.4" stroke-linecap="round"/></g></svg>';
  const ALGS = [
    ['🚰', '🧼', '👐', '💧', '🧻'],
    ['⛏️', '🌰', '🟫', '🚿', '🌳'],
    [BRUSH, '🧴', '😁', '💦'], // تنظيف الأسنان: كل خطوة لازم بعد اللي قبلها (الشطيرة كان فيها ترتيبان صحيحان)
    ['🧦', '👟', '🎀'],
  ];
  const algo = {
    id: 'algo', name: 'رتّب الخطوات', icon: '🔢', minAge: 7,
    mount(el, A) {
      const order = [2, 3, 0, 1];
      el.innerHTML = `<div class="cw-alg"><div class="cw-dots" id="d"></div><h3 class="cw-alg-t" id="tt"></h3>
        <div class="cw-slots" id="sl"></div><div class="cw-pool" id="pl"></div>
        <button class="run cw-alg-run" data-x="run" disabled>▶ نفّذ</button></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), order.length);
      let r = 0, p = 0, slots = [], busy = false, fails = 0;
      const stepKey = (pp, s) => `cw_alg_${pp + 1}_${s + 1}`;
      function show() {
        busy = false; setDot(r);
        p = order[r];
        const steps = ALGS[p];
        slots = steps.map(() => null);
        q('#tt').textContent = A.text('cw_alg_t' + (p + 1));
        let mix = U.shuffle(steps.map((s, i) => i));
        if (mix.every((v, i) => v === i)) mix = mix.reverse();
        q('#pl').innerHTML = mix.map(i => `<button class="cw-step" data-s="${i}"><span>${steps[i]}</span><small>${U.esc(A.text(stepKey(p, i)))}</small></button>`).join('');
        renderSlots();
        if (root.gsap) gsap.from(q('#pl').children, { y: 30, opacity: 0, stagger: 0.07, duration: 0.35, ease: 'back.out(2)' });
        A.say(r === 0 ? ['cw_alg_what', 'cw_alg_t' + (p + 1)] : ['cw_alg_t' + (p + 1)]);
      }
      function renderSlots() {
        const steps = ALGS[p];
        q('#sl').innerHTML = slots.map((s, i) => `<button class="cw-slot ${s == null ? '' : 'full'}" data-k="${i}"><i>${i + 1}</i>${s == null ? '' : `<span>${steps[s]}</span><small>${U.esc(A.text(stepKey(p, s)))}</small>`}</button>`).join('');
        q('[data-x="run"]').disabled = slots.some(s => s == null);
      }
      A.on(el, 'click', e => {
        if (busy) return;
        const st = e.target.closest('.cw-step');
        if (st && !st.classList.contains('used')) {
          const k = slots.indexOf(null); if (k < 0) return;
          slots[k] = +st.dataset.s; st.classList.add('used');
          A.sfx.snap(); A.say(stepKey(p, +st.dataset.s), { quiet: true });
          renderSlots();
          if (root.gsap) gsap.from(q(`.cw-slot[data-k="${k}"]`), { scale: 0.6, duration: 0.3, ease: 'back.out(3)' });
          return;
        }
        const sl = e.target.closest('.cw-slot.full');
        if (sl) {
          const k = +sl.dataset.k, s = slots[k]; slots[k] = null;
          const b = q(`.cw-step[data-s="${s}"]`); if (b) b.classList.remove('used');
          A.sfx.tap(); renderSlots(); return;
        }
        if (e.target.closest('[data-x="run"]') && !slots.some(s => s == null)) run();
      });
      async function run() {
        busy = true;
        q('[data-x="run"]').disabled = true;
        const cells = el.querySelectorAll('.cw-slot');
        for (let k = 0; k < slots.length; k++) {
          if (!A.alive) return;
          cells[k].classList.add('cur');
          await A.wait(450);
          if (!A.alive) return;
          cells[k].classList.remove('cur');
          if (slots[k] !== k) {
            fails++;
            cells[k].classList.add('bad');
            A.bad(cells[k], 'cw_alg_bug');
            await A.wait(1200);
            if (!A.alive) return;
            cells[k].classList.remove('bad');
            busy = false; renderSlots(); return;
          }
          cells[k].classList.add('ok'); A.sfx.tap();
        }
        A.good(q('#sl'), 'cw_alg_ok');
        A.afterVoice(() => { r++; if (r < order.length) show(); else { setDot(order.length); A.win({ stars: fails === 0 ? 3 : fails <= 2 ? 2 : 1 }); } }, 1200, 7000);
      }
      A.later(show, 250);
      return {
        async solve() {
          while (A.alive && r < order.length) {
            if (!busy) { for (let s = 0; s < ALGS[p].length; s++) { const b = q(`.cw-step[data-s="${s}"]`); if (b && !b.classList.contains('used')) b.click(); } q('[data-x="run"]').click(); }
            await A.wait(5200);
          }
        },
      };
    },
  };

  /* ---------- خمّن الرقم (البحث الثنائي) ---------- */
  const guess = {
    id: 'guess', name: 'خمّن الرقم', icon: '🔍', minAge: 7,
    mount(el, A) {
      const N = A.age <= 7 ? 30 : A.age <= 8 ? 50 : 100, ROUNDS = 3;
      const best = Math.ceil(Math.log2(N + 1));
      el.innerHTML = `<div class="cw-hl"><div class="cw-dots" id="d"></div>
        <div class="cw-hl-top"><span class="cw-hl-sj" id="sj"></span><span class="cw-hl-say" id="hs">🤔 ؟</span><span class="cw-hl-cnt">👆 <b id="ct">0</b></span></div>
        <div class="cw-hl-main"><div class="cw-nums" id="nums" dir="ltr">${Array.from({ length: N }, (_, i) => `<button class="cw-num" data-n="${i + 1}">${i + 1}</button>`).join('')}</div></div></div>`;
      const q = s => el.querySelector(s);
      const sj = A.siraj(q('#sj'));
      const setDot = A.dots(q('#d'), ROUNDS);
      let r = 0, secret = 0, tries = 0, total = 0, lo = 1, hi = N, busy = false;
      function fit() {
        const m = q('.cw-hl-main'), W = m.clientWidth - 6, H = m.clientHeight - 6;
        // نختار عدد الأعمدة اللي يكبّر الأزرار أكثر (٥ أو ١٠ أو ٢٠؛ المية دايماً صفوف من ١٠ أو ٢٠)
        const size = k => Math.min(64, (W - 3 * (k - 1)) / k, (H - 3 * (Math.ceil(N / k) - 1)) / Math.ceil(N / k));
        const cols = [5, 10, 20].filter(k => k < N && (N <= 50 || k >= 10)).reduce((a, k) => (size(k) > size(a) ? k : a), 10);
        const c = Math.floor(Math.max(16, size(cols)));
        q('#nums').style.setProperty('--c', c + 'px');
        q('#nums').style.gridTemplateColumns = `repeat(${cols}, var(--c))`;
      }
      A.onResize(fit);
      function show() {
        busy = false; setDot(r); tries = 0; lo = 1; hi = N;
        secret = U.rand(1, N);
        q('#ct').textContent = 0; q('#hs').textContent = '🤔 ' + 1 + ' – ' + N;
        el.querySelectorAll('.cw-num').forEach(b => { b.className = 'cw-num'; });
        fit();
        A.say(r === 0 ? ['cw_hl', 'cw_hl_tip'] : 'cw_hl_next');
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('.cw-num'); if (!b || busy || b.classList.contains('out')) return;
        const n = +b.dataset.n; tries++; total++; q('#ct').textContent = tries;
        if (n === secret) {
          busy = true; b.classList.add('hit');
          q('#hs').textContent = '🎉 ' + n;
          A.good(b, 'cw_hl_ok'); if (sj) sj.jump();
          A.later(() => { r++; if (r < ROUNDS) show(); else { setDot(ROUNDS); const avg = total / ROUNDS; A.win({ stars: avg <= best ? 3 : avg <= best + 2 ? 2 : 1, note: `👆 ${total}`, tip: 'cw_hl_tip' }); } }, 1800);
          return;
        }
        if (n < secret) lo = Math.max(lo, n + 1); else hi = Math.min(hi, n - 1);
        el.querySelectorAll('.cw-num').forEach(x => { const v = +x.dataset.n; if (v < lo || v > hi) x.classList.add('out'); });
        b.classList.add(n < secret ? 'low' : 'high');
        q('#hs').textContent = (n < secret ? '⬆️ ' : '⬇️ ') + lo + ' – ' + hi;
        A.sfx.tap();
        A.say(n < secret ? 'cw_hl_up' : 'cw_hl_down', { pri: 'feedback', cool: 1500 }); // معلومة اللعبة نفسها: تتكرر بسرعة أكبر
        if (sj) sj.talk(500);
      });
      A.later(show, 250);
      return {
        async solve() {
          while (A.alive && r < ROUNDS) {
            if (!busy) { const m = Math.floor((lo + hi) / 2); q(`.cw-num[data-n="${m}"]`).click(); }
            await A.wait(busy ? 1900 : 120);
          }
        },
      };
    },
  };

  CW.register({
    id: 'think', order: 6, name: 'كيف يفكّر الكمبيوتر', icon: '🧠', color: '#f08a24', voice: 'cw_s_think', minAge: 7,
    rec: a => a >= 7, activities: [binary, pixel, algo, guess],
  });
})(window);

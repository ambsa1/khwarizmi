/* القسم ٩: ألعاب الذكاء — أوراق الذاكرة، الصورة الغريبة، تذكّر التسلسل، ما الذي اختفى؟، ظلّ من؟، أدرها في رأسك، عدّ بسرعة، شبكة المنطق.
   كلها على محرّك الجولات المشترك (A.game) بأنماط الاختيار والضغط فقط؛ الصعوبة تكبر مع العمر، والجولة الأخيرة تحدّي 🏆. */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const N = 6; // ٥ جولات + التحدّي
  const ageOf = A => Math.max(4, A.age);
  const picks = (arr, n) => U.shuffle(arr).slice(0, n);
  const em = (e, cls, st) => `<span class="mt-br-em ${cls || ''}" ${st ? `style="${st}"` : ''}>${e}</span>`;
  const big = v => `<b dir="ltr">${v}</b>`;
  // مجموعات صور من نوع واحد (للشاذّ والظلّ)
  const CATS = [
    ['🍎', '🍌', '🍓', '🍒', '🍇', '🍊', '🍉', '🍐'],
    ['🐱', '🐶', '🐭', '🐰', '🐻', '🐸', '🐮', '🐷'],
    ['🚗', '🚌', '🚲', '🚂', '✈️', '🚁', '🚀', '⛵'],
    ['🐟', '🐙', '🐬', '🦀', '🐳', '🦐', '🐚', '🐢'],
    ['🍩', '🍪', '🍰', '🍭', '🍫', '🧁', '🍦', '🎂'],
    ['👕', '👖', '👟', '🧢', '🧦', '🧤', '👗', '👒'],
    ['☀️', '🌙', '⭐', '☁️', '🌈', '⚡', '❄️', '🌧️'],
    ['🌸', '🌻', '🌹', '🌷', '🌵', '🌳', '🍀', '🌴'],
    ['⚽', '🏀', '🎾', '🏈', '🎱', '🏐', '⚾', '🥎'],
  ];
  // صور بظلال مختلفة بوضوح (للصغار في لعبة الظلّ)
  const DISTINCT = ['🐟', '🚗', '⭐', '🌙', '🍌', '🌸', '🐘', '🔑', '🎸', '🦆', '🏠', '🌳', '✈️', '⚽', '🍦', '🐢'];
  // شبكة داخل المشهد: الأزرار تكبر قد ما المكان يسمح
  function gridIn(A, R, n, max) { R.scene.classList.add('mt-br-pick'); R.fit = () => A.fitGrid(R.scene, n, max || 120, 44); }
  // تلميح بعد غلطتين: جملة + الإجابة الصحيحة تنبض
  function hintTo(A, R, key, extra) {
    R.hint = () => {
      A.say(key, { pri: 'feedback' });
      if (R.vals) { const i = R.vals.findIndex(v => R.chk(v)); const b = A.el.querySelector(`.mt-ch[data-ci="${i}"]`); if (b) b.classList.add('hint'); }
      if (extra) extra();
    };
  }

  /* ---------- ١ أوراق الذاكرة (٤ → ١٢ ورقة) ---------- */
  const memory = {
    id: 'memory', name: 'أوراق الذاكرة', icon: '🃏', minAge: 4,
    mount(el, A) {
      const a = ageOf(A);
      const pairsFor = last => Math.min(6, (a <= 4 ? 2 : a <= 6 ? 3 : a <= 8 ? 4 : 6) + (last ? 1 : 0));
      let total = 0; for (let r = 0; r < N; r++) total += pairsFor(r === N - 1);
      return A.game({
        rounds: N, cls: 'mt-g-mem', intro: ['m_mem_tip'],
        stars: m => (m <= total ? 3 : m <= total * 2 ? 2 : 1),
        round(r, R) {
          const P = pairsFor(R.last), ems = picks(MATH.OBJ, P), cards = U.shuffle(ems.concat(ems));
          let open = [], lock = true, left = P;
          const bs = R.choices(cards.map((e, i) => i), -1, { box: R.scene, btnCls: 'mt-br-card', html: i => `<span class="bk">✦</span>${em(cards[i], 'fc')}`, label: i => cards[i] });
          gridIn(A, R, cards.length, 120);
          const st = i => bs[i].classList;
          const up = (i, on) => { st(i).toggle('up', on); if (root.gsap) gsap.fromTo(bs[i], { rotationY: 90 }, { rotationY: 0, duration: 0.25, clearProps: 'transform' }); };
          const peek = ms => {
            lock = true; bs.forEach((b, i) => { if (!st(i).contains('done')) up(i, true); });
            A.later(() => { bs.forEach((b, i) => { if (!st(i).contains('done')) up(i, false); }); lock = false; }, ms);
          };
          R.onPick = (i, b) => {
            if (lock || st(i).contains('up') || st(i).contains('done')) return;
            up(i, true); open.push(i); A.sfx.tap && A.sfx.tap();
            if (open.length < 2) return;
            const [x, y] = open; open = [];
            if (cards[x] === cards[y]) {
              st(x).add('done'); st(y).add('done'); left--;
              if (left === 0) R.right(b, null, { min: 1200 }); else A.good(b, null);
            } else {
              lock = true; R.wrong(R.scene);
              A.later(() => { up(x, false); up(y, false); lock = false; }, 800);
            }
          };
          R.hint = () => { A.say('m_mem_peek', { pri: 'feedback' }); A.later(() => peek(1200), 850); };
          R.solver = () => {
            if (lock) return;
            const down = cards.map((e, i) => i).filter(i => !st(i).contains('up') && !st(i).contains('done'));
            for (const i of down) { const j = down.find(k => k !== i && cards[k] === cards[i]); if (j != null) { bs[i].click(); bs[j].click(); return; } }
          };
          R.ask(['m_mem_q']);
          if (a <= 6) A.afterVoice(() => peek(a <= 4 ? 2000 : 1500), 700, 4000); else lock = false;
        },
      });
    },
  };

  /* ---------- ٢ الصورة الغريبة ---------- */
  const odd = {
    id: 'odd', name: 'الصورة الغريبة', icon: '🔍', minAge: 4,
    mount(el, A) {
      const a = ageOf(A);
      return A.game({
        rounds: N, cls: 'mt-g-odd', intro: ['m_odd_tip'],
        round(r, R) {
          const n = Math.min(6, (a <= 5 ? 3 : a <= 8 ? 4 : 5) + (R.last ? 1 : 0));
          const [c1, c2] = picks(CATS, 2), oddE = U.pick(c2);
          const items = U.shuffle(picks(c1, n - 1).concat([oddE]));
          R.choices(items, oddE, { box: R.scene, html: e => em(e), label: e => e });
          gridIn(A, R, n, 150);
          hintTo(A, R, 'm_odd_tip');
          R.ask(['m_odd_q']);
        },
      });
    },
  };

  /* ---------- ٣ تذكّر التسلسل (٢ → ٦ أضواء) ---------- */
  const seq = {
    id: 'seq', name: 'تذكّر التسلسل', icon: '💡', minAge: 4,
    mount(el, A) {
      const a = ageOf(A);
      const LC = ['#f0533f', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6', '#ff8a3d'], IC = ['⭐', '🌙', '🍎', '🐟', '🌸', '🎈'];
      return A.game({
        rounds: N, cls: 'mt-g-seq',
        round(r, R) {
          const n = a <= 6 ? 4 : 6, L = Math.min(6, (a <= 4 ? 2 : a <= 6 ? 3 : a <= 8 ? 4 : 5) + (R.last ? 1 : 0));
          const order = Array.from({ length: L }, () => U.rand(0, n - 1));
          let phase = 'show', pos = 0;
          const bs = R.choices(Array.from({ length: n }, (_, i) => i), -1, { box: R.scene, btnCls: 'mt-br-light', html: i => em(IC[i]), label: i => IC[i] });
          bs.forEach((b, i) => b.style.setProperty('--lc', LC[i]));
          gridIn(A, R, n, 130);
          const ON = a <= 6 ? 650 : 500, GAP = a <= 6 ? 350 : 250;
          const lit = (i, ms) => { bs[i].classList.add('lit'); bs[i].classList.remove('hint'); A.sfx.tap && A.sfx.tap(); A.later(() => bs[i].classList.remove('lit'), ms); };
          function show() {
            phase = 'show'; pos = 0;
            order.forEach((i, k) => A.later(() => lit(i, ON), k * (ON + GAP)));
            A.later(() => { if (phase === 'show') { phase = 'input'; R.ask(['m_seq_go']); } }, L * (ON + GAP) + 200);
          }
          R.onPick = (i, b) => {
            if (phase !== 'input') return;
            if (i === order[pos]) { lit(i, 300); pos++; if (pos === L) { phase = 'done'; R.right(null, null); } }
            else { R.wrong(R.scene); phase = 'wait'; A.later(show, 900); }
          };
          R.hint = () => { A.say('m_seq_hint', { pri: 'feedback' }); A.later(() => { if (phase === 'input') bs[order[0]].classList.add('hint'); }, L * (ON + GAP) + 1200); };
          R.solver = () => { if (phase === 'input') bs[order[pos]].click(); };
          R.ask(['m_seq_watch']);
          A.afterVoice(show, 800, 4000);
        },
      });
    },
  };

  /* ---------- ٤ ما الذي اختفى؟ (٤ → ٧ أشياء) ---------- */
  const missing = {
    id: 'missing', name: 'ما الذي اختفى؟', icon: '🙈', minAge: 4,
    mount(el, A) {
      const a = ageOf(A);
      return A.game({
        rounds: N, cls: 'mt-g-mis', intro: ['m_mis_tip'],
        round(r, R) {
          const k = Math.min(8, (a <= 5 ? 4 : a <= 8 ? 5 : 6) + (R.last ? 1 : 0)), T = a <= 5 ? 3000 : a <= 8 ? 2500 : 2000;
          const ems = picks(MATH.OBJ, k), gone = U.pick(ems);
          R.scene.innerHTML = `<div class="mt-br-wrap"><div class="mt-objs">${ems.map((e, i) => `<span class="mt-obj" data-o="${i}">${e}</span>`).join('')}</div><div class="mt-br-curtain">🙈</div></div>`;
          const box = R.scene.querySelector('.mt-objs'), cur = R.scene.querySelector('.mt-br-curtain');
          R.fit = () => A.fitGrid(box, k, 110, 44);
          R.ask(['m_mis_watch']);
          A.afterVoice(() => {
            cur.classList.add('on'); A.sfx.pop && A.sfx.pop();
            A.later(() => {
              const sp = box.querySelector(`.mt-obj[data-o="${ems.indexOf(gone)}"]`);
              sp.textContent = '?'; sp.classList.add('mt-br-q');
              cur.classList.remove('on');
              const opts = U.shuffle([gone].concat(picks(ems.filter(e => e !== gone), (a <= 6 ? 3 : 4) - 1)));
              R.choices(opts, gone, { cls: 'mt-br-big', html: e => em(e), label: e => e, noAnim: true });
              R.okAnim = () => { sp.textContent = gone; sp.classList.remove('mt-br-q'); A.pop(sp); };
              hintTo(A, R, 'm_mis_tip');
              R.ask(['m_mis_q']);
              R.fit();
            }, 900);
          }, T, T + 2500);
        },
      });
    },
  };

  /* ---------- ٥ ظلّ من؟ (الصغار: الصورة → ظلّها، ٧+: الظلّ → صاحبه من نفس النوع) ---------- */
  const shadow = {
    id: 'shadow', name: 'ظلّ من؟', icon: '🌑', minAge: 4,
    mount(el, A) {
      const a = ageOf(A), rev = a >= 7;
      return A.game({
        rounds: N, cls: 'mt-g-shd', intro: ['m_shd_tip'],
        round(r, R) {
          const n = Math.min(5, (a <= 5 ? 3 : 4) + (R.last ? 1 : 0));
          const items = picks(a >= 7 ? U.pick(CATS) : DISTINCT, n), ans = items[0];
          R.scene.innerHTML = `<div class="mt-br-target">${em(ans, rev ? 'mt-br-sil' : '')}</div>`;
          R.choices(U.shuffle(items), ans, { cls: 'mt-br-big', html: e => em(e, rev ? '' : 'mt-br-sil'), label: e => e });
          R.okAnim = () => { A.el.querySelectorAll('.mt-ch.ok .mt-br-sil, .mt-br-target .mt-br-sil').forEach(x => { x.classList.remove('mt-br-sil'); A.pop(x); }); };
          hintTo(A, R, 'm_shd_tip');
          R.ask([rev ? 'm_shd_q2' : 'm_shd_q']);
        },
      });
    },
  };

  /* ---------- ٦ أدرها في رأسك (٧+): نفس الصورة مُدارة، والمرآة خدعة للكبار ---------- */
  const rot = {
    id: 'rotate', name: 'أدرها في رأسك', icon: '🔄', minAge: 7,
    mount(el, A) {
      const a = ageOf(A), EMS = ['🔑', '🐟', '🚗', '🦆', '🎸', '🐘', '✏️', '🐓'];
      const rnd = () => U.pick([90, 180, 270]);
      return A.game({
        rounds: N, cls: 'mt-g-rot', intro: ['m_rot_tip'],
        round(r, R) {
          const [e, d1, d2, d3] = picks(EMS, 4), deg = U.pick(a <= 8 && !R.last ? [90, 180, 270] : [45, 90, 135, 180, 225, 270]);
          const opts = [{ e, t: `rotate(${deg}deg)`, ok: true }, { e: d1, t: `rotate(${rnd()}deg)` }, { e: d2, t: `rotate(${rnd()}deg)` }];
          if (a >= 9 || R.last) opts.push({ e, t: `scaleX(-1) rotate(${deg}deg)` }); else if (r >= 2) opts.push({ e: d3, t: `rotate(${rnd()}deg)` });
          R.scene.innerHTML = `<div class="mt-br-target">${em(e)}</div>`;
          R.choices(U.shuffle(opts), null, { check: v => !!v.ok, cls: 'mt-br-big', html: v => em(v.e, '', `transform:${v.t}`), label: v => v.e });
          R.okAnim = () => { const t = R.scene.querySelector('.mt-br-em'); if (t && root.gsap) gsap.to(t, { rotation: deg, duration: 0.6, ease: 'back.out(1.5)' }); };
          hintTo(A, R, 'm_rot_tip');
          R.ask(['m_rot_q']);
        },
      });
    },
  };

  /* ---------- ٧ عدّ بسرعة (٥+): الأشياء تظهر ثانيتين ثم تختفي ---------- */
  const fast = {
    id: 'fastcount', name: 'عدّ بسرعة', icon: '⚡', minAge: 5,
    mount(el, A) {
      const a = ageOf(A);
      return A.game({
        rounds: N, cls: 'mt-g-fst', intro: ['m_fst_tip'],
        round(r, R) {
          const lo = a <= 6 ? 2 : a <= 8 ? 3 : 5, hi = Math.min(12, (a <= 6 ? 5 : a <= 8 ? 8 : 10) + (R.last ? 2 : 0)), n = U.rand(lo, hi);
          const T = (a <= 6 ? 2500 : a <= 8 ? 2000 : 1500) - (R.last ? 300 : 0);
          R.scene.innerHTML = `<div class="mt-br-wrap">${MATH.objs(n, U.pick(MATH.OBJ))}<div class="mt-br-curtain on">👀</div></div>`;
          const box = R.scene.querySelector('.mt-objs'), cur = R.scene.querySelector('.mt-br-curtain');
          R.fit = () => A.fitGrid(box, n, 110, 44);
          R.ask(['m_fst_watch']);
          A.afterVoice(() => {
            cur.classList.remove('on'); A.sfx.pop && A.sfx.pop();
            A.later(() => {
              cur.classList.add('on'); cur.textContent = '🙈';
              R.choices(U.near(n, a <= 6 ? 3 : 4, 1, hi + 2, 2), n, { html: big, noAnim: true });
              R.okAnim = () => { cur.classList.remove('on'); };
              hintTo(A, R, 'm_fst_tip', () => { cur.classList.remove('on'); A.later(() => cur.classList.add('on'), 1200); });
              R.ask(['m_fst_q']);
              R.fit();
            }, T);
          }, 500, 5000);
        },
      });
    },
  };

  /* ---------- ٨ شبكة المنطق (٦+): ٢×٢ ثم ٣×٣ — الصفوف أشكال والأعمدة ألوان (أو بالعكس) ---------- */
  const logic = {
    id: 'logic', name: 'شبكة المنطق', icon: '🔲', minAge: 6,
    mount(el, A) {
      const a = ageOf(A);
      const COL = ['#f0533f', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6'], KINDS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
      const tok = v => `<span class="mt-tok">${MATH.art.shape(KINDS[v[0]], COL[v[1]])}</span>`;
      return A.game({
        rounds: N, cls: 'mt-g-lgc', intro: ['m_grd_tip'],
        round(r, R) {
          const n = a <= 7 && !R.last ? 2 : 3;
          const ss = picks([0, 1, 2, 3, 4, 5], n), cs = picks([0, 1, 2, 3, 4], n), byRow = Math.random() < 0.5;
          const cell = (i, j) => (byRow ? [ss[i], cs[j]] : [ss[j], cs[i]]);
          const qr = U.rand(0, n - 1), qc = U.rand(0, n - 1), ans = cell(qr, qc);
          const hid = R.last && a >= 8 ? [qr, (qc + 1) % n] : null; // التحدّي: خانة إضافية مخفية (الحل ما زال أكيداً)
          const isQ = (i, j) => i === qr && j === qc, isH = (i, j) => hid && hid[0] === i && hid[1] === j;
          R.scene.innerHTML = `<div class="mt-sdk" style="--n:${n}">${Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => `<span class="${isQ(i, j) ? 'q' : isH(i, j) ? 'hid' : ''}">${isQ(i, j) ? '<b>?</b>' : isH(i, j) ? '' : tok(cell(i, j))}</span>`).join('')).join('')}</div>`;
          if (root.gsap) gsap.from(R.scene.querySelectorAll('.mt-sdk span'), { scale: 0, duration: 0.25, stagger: 0.04, ease: 'back.out(2)', clearProps: 'transform' });
          const os = ss[(ss.indexOf(ans[0]) + 1) % n], oc = cs[(cs.indexOf(ans[1]) + 1) % n];
          const opts = U.shuffle([ans, [ans[0], oc], [os, ans[1]], [os, oc]]);
          R.choices(opts, null, { check: v => v[0] === ans[0] && v[1] === ans[1], btnCls: 'mt-tokb', html: tok, label: v => KINDS[v[0]], okSay: v => ['m_sh_' + KINDS[v[0]]] });
          R.okAnim = () => {
            const q = R.scene.querySelector('.mt-sdk .q'); if (q) { q.classList.remove('q'); q.innerHTML = tok(ans); A.pop(q); }
            const h = R.scene.querySelector('.mt-sdk .hid'); if (h) { h.classList.remove('hid'); h.innerHTML = tok(cell(hid[0], hid[1])); }
          };
          hintTo(A, R, 'm_grd_tip');
          R.ask(['m_grd_q']);
        },
      });
    },
  };

  MATH.register({
    id: 'brain', order: 9, name: 'ألعاب الذكاء', icon: '🧠', color: '#8b5cf6', voice: 'm_s_brain', minAge: 4,
    rec: a => a >= 5, activities: [memory, odd, seq, missing, shadow, rot, fast, logic],
  });
})(window);

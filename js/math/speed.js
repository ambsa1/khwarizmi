/* القسم ٧: تحدّي السرعة — صاروخ الحساب: كل إجابة ترفع الصاروخ نحو القمر.
   أقل من ٦ سنوات: بدون وقت أبداً (عدّ الأشياء). ٦ فأكثر: شريط وقت هادئ؛ لو خلص الوقت ييجي سؤال جديد بدون عقاب. */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const big = v => `<b dir="ltr">${v}</b>`;

  const rocket = {
    id: 'rocket', name: 'صاروخ الحساب', icon: '🚀', minAge: 4,
    mount(el, A) {
      const a = A.age, N = 10, timed = a >= 6, voiced = a <= 7;
      const T = a <= 7 ? 12000 : a <= 8 ? 9000 : 8000;
      const em = U.shuffle(MATH.OBJ);
      let streak = 0, t0 = 0, track = null, rk = null, tw = null;
      function make(r) {
        if (a <= 5) { const n = U.rand(1, a <= 4 ? 5 : 6); return { n, ans: n, opts: U.near(n, 3, 1, 7, 2) }; }
        const kind = a <= 7 ? U.pick(['+', '+', '-']) : a <= 8 ? U.pick(['+', '-', '×']) : U.pick(['+', '-', '×', '×']);
        let x, y, ans;
        if (kind === '×') { x = a <= 8 ? U.pick([2, 5, 10]) : U.rand(2, 10); y = U.rand(1, a <= 8 ? 10 : 6); ans = x * y; }
        else {
          const max = a <= 7 ? 10 : a <= 8 ? 20 : 50;
          x = U.rand(1, max - 1); y = U.rand(1, max - x);
          if (kind === '-') { const s = x + y; ans = x; x = s; } else ans = x + y;
        }
        const set = new Set([ans]);
        [ans + 1, ans - 1, ans + 2, ans + 10, ans - 2].forEach(v => { if (set.size < 3 && v >= 0) set.add(v); });
        return { x, y, op: kind, ans, opts: U.shuffle([...set]) };
      }
      const G = A.game({
        rounds: N, challenge: false, cls: 'mt-g-speed', intro: ['m_sp_go'],
        round(r, R) {
          if (!track) {
            t0 = Date.now();
            el.querySelector('.mt-game').insertAdjacentHTML('afterbegin', `<div class="mt-track" aria-hidden="true"><span class="mt-moon">🌙</span><span class="mt-rk" id="rk">🚀</span></div>`);
            track = el.querySelector('.mt-track'); rk = track.querySelector('#rk');
          }
          const p = make(r);
          if (p.n != null) {
            R.scene.innerHTML = MATH.objs(p.n, em[r % em.length]);
            R.fit = () => A.fitGrid(R.scene.querySelector('.mt-objs'), p.n, 90, 44);
          } else {
            R.scene.innerHTML = (timed ? '<div class="mt-timer"><i></i></div>' : '') + U.eqHtml([p.x, p.op, p.y, '=', '?'], 'xl');
          }
          R.choices(p.opts, p.ans, { html: big, cls: 'speed' });
          const bar = R.scene.querySelector('.mt-timer i');
          if (timed && bar && root.gsap) tw = gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: T / 1000, ease: 'none' });
          const my = r;
          if (timed) A.later(() => { if (G.r === my && G.ready()) { streak = 0; rk.classList.remove('fire'); A.sfx.oops && A.sfx.oops(); R.skip(); } }, T);
          R.onPick = (v, b) => {
            if (v === p.ans) {
              streak++;
              if (tw) tw.pause();
              if (streak >= 3) rk.classList.add('fire');
              const fire = streak % 3 === 0 ? ['m_sp_fire'] : null;
              R.right(b, fire, { noPraise: true, min: 650, text: p.x != null ? U.eqText(p.x, p.op, p.y, p.ans) : String(p.ans), anim: () => {
                const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = p.ans; q.classList.remove('q'); q.classList.add('ans'); }
                if (root.gsap) gsap.to(rk, { bottom: ((r + 1) / N) * 84 + '%', duration: 0.6, ease: 'back.out(1.5)' });
              } });
            } else { streak = 0; rk.classList.remove('fire'); R.wrong(b); }
          };
          if (p.n != null) R.ask(['m_cnt']);
          else if (voiced) R.ask(U.eqKeys(p.x, p.op, p.y), { text: U.eqText(p.x, p.op, p.y) });
          else R.ask([], { text: U.eqText(p.x, p.op, p.y) });
        },
        after: r => { if (rk && root.gsap && r === N - 1) gsap.to(rk, { bottom: '84%', duration: 0.5 }); },
        win: () => ({ say: 'm_sp_moon', note: timed ? '⏱ ' + Math.round((Date.now() - t0) / 1000) : '' }),
      });
      return G;
    },
  };

  MATH.register({
    id: 'speed', order: 7, name: 'تحدّي السرعة', icon: '🚀', color: '#f0533f', voice: 'm_s_speed', minAge: 4,
    rec: a => a >= 6, activities: [rocket],
  });

  /* ===== القسم ٨: الألغاز — سودوكو الأشكال، آلة القاعدة، ميزان الأعداد ===== */
  const COL = ['#f0533f', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6'];
  const KINDS = ['circle', 'square', 'triangle', 'star', 'heart'];
  const shp = (k, i) => MATH.art.shape(k, COL[i % COL.length]);

  /* ---------- سودوكو الأشكال ---------- */
  const sudoku = {
    id: 'sudoku', name: 'سودوكو الأشكال', icon: '🧩', minAge: 5,
    mount(el, A) {
      const a = A.age, N = 5, n = a <= 6 ? 3 : 4;
      // مربّع لاتيني: صف أساس مُخلّط، ثم إزاحة دائرية، ثم خلط الصفوف والأعمدة
      function square() {
        const base = U.shuffle([0, 1, 2, 3, 4].slice(0, n));
        let g = Array.from({ length: n }, (_, r) => base.map((_, c) => base[(r + c) % n]));
        g = U.shuffle(g);
        const perm = U.shuffle([0, 1, 2, 3].slice(0, n));
        return g.map(row => perm.map(c => row[c]));
      }
      return A.game({
        rounds: N, cls: 'mt-g-sdk', intro: ['m_sdk_tip'],
        round(r, R) {
          const g = square(), holes = R.last && a >= 7 ? 2 : 1;
          const qr = U.rand(0, n - 1), qc = U.rand(0, n - 1), ans = g[qr][qc];
          // التحدّي: خانة إضافية مخفية في نفس الصف (ما زال الحل أكيداً من العمود)
          const hid = holes === 2 ? [qr, (qc + U.rand(1, n - 1)) % n] : null;
          R.scene.innerHTML = `<div class="mt-sdk" style="--n:${n}">${g.map((row, i) => row.map((v, j) => `<span class="${i === qr && j === qc ? 'q' : hid && hid[0] === i && hid[1] === j ? 'hid' : ''}">${i === qr && j === qc ? '<b>?</b>' : hid && hid[0] === i && hid[1] === j ? '' : shp(KINDS[v], v)}</span>`).join('')).join('')}</div>`;
          if (root.gsap) gsap.from(R.scene.querySelectorAll('.mt-sdk span'), { scale: 0, duration: 0.25, stagger: 0.03, ease: 'back.out(2)', clearProps: 'transform' });
          const opts = U.shuffle([0, 1, 2, 3, 4].slice(0, n));
          R.choices(opts, ans, { btnCls: 'mt-tokb', html: v => `<span class="mt-tok">${shp(KINDS[v], v)}</span>`, label: v => KINDS[v], okSay: v => ['m_sh_' + KINDS[v]] });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-sdk .q'); if (q) { q.classList.remove('q'); q.innerHTML = shp(KINDS[ans], ans); A.pop(q); } const h = R.scene.querySelector('.mt-sdk .hid'); if (h) { h.classList.remove('hid'); h.innerHTML = shp(KINDS[g[hid[0]][hid[1]]], g[hid[0]][hid[1]]); } };
          R.ask(['m_sdk_q']);
        },
      });
    },
  };

  /* ---------- آلة القاعدة (٢→٤، ٥→٧: القاعدة +٢) ---------- */
  const rule = {
    id: 'rule', name: 'آلة القاعدة', icon: '⚙️', minAge: 7,
    mount(el, A) {
      const a = A.age, N = 5;
      const RULES = a <= 7 ? [['+', 1], ['+', 2], ['+', 3], ['−', 1], ['−', 2], ['+', 5], ['+', 10]] : [['+', 2], ['+', 3], ['−', 2], ['−', 3], ['×', 2], ['×', 3], ['×', 5], ['×', 10], ['+', 10], ['−', 10]];
      const apply = (ru, x) => (ru[0] === '+' ? x + ru[1] : ru[0] === '−' ? x - ru[1] : x * ru[1]);
      const txt = ru => `${ru[0]} ${ru[1]}`;
      let prev = '';
      return A.game({
        rounds: N, cls: 'mt-g-rule', intro: ['m_rule_tip'],
        round(r, R) {
          let ru; do { ru = U.pick(RULES); } while (txt(ru) === prev);
          prev = txt(ru);
          const ins = [], lo = ru[0] === '−' ? ru[1] : 1, hi = ru[0] === '×' ? 10 : 15;
          while (ins.length < 3) { const v = U.rand(lo, hi); if (!ins.includes(v)) ins.push(v); }
          R.scene.innerHTML = `<div class="mt-rules" dir="ltr">${ins.map(v => `<span class="mt-rl"><b>${v}</b><i>→</i><b>${apply(ru, v)}</b></span>`).join('')}<span class="mt-rl q"><b>?</b></span></div>`;
          // قاعدة الآلة مخفية: الاختيارات قواعد قريبة
          const others = U.shuffle(RULES.filter(x => txt(x) !== txt(ru))).slice(0, R.last ? 3 : 2);
          const opts = U.shuffle([ru].concat(others));
          R.choices(opts, ru, { check: v => txt(v) === txt(ru), html: v => `<b dir="ltr">${txt(v)}</b>`, label: txt, okSay: v => [v[0] === '+' ? 'm_plus' : v[0] === '−' ? 'm_minus' : 'm_times'].concat(A.num(v[1])) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-rl.q b'); if (q) { q.textContent = txt(ru); q.parentElement.classList.add('ans'); A.pop(q.parentElement); } };
          R.ask(['m_rule_q']);
        },
      });
    },
  };

  /* ---------- ميزان الأعداد (أيّ كفّة أثقل: المجموع الأكبر) ---------- */
  const balance = {
    id: 'balance', name: 'ميزان الأعداد', icon: '⚖️', minAge: 6,
    mount(el, A) {
      const a = A.age, N = 5, sums = a >= 8;
      return A.game({
        rounds: N, cls: 'mt-g-bal',
        round(r, R) {
          const side = U.rand(0, 1);
          let L, Rv, lt, rt;
          if (sums || (a >= 7 && R.last)) {
            const mk = () => { const x = U.rand(1, 9), y = U.rand(1, 9); return [x + y, `${x} + ${y}`]; };
            do { [L, lt] = mk(); [Rv, rt] = mk(); } while (L === Rv);
          } else { do { L = U.rand(1, a <= 6 ? 9 : 20); Rv = U.rand(1, a <= 6 ? 9 : 20); } while (L === Rv); lt = String(L); rt = String(Rv); }
          const heavy = L > Rv ? 0 : 1;
          R.scene.innerHTML = `<div class="mt-scale" dir="ltr"><div class="mt-beam" id="bm"></div><div class="mt-post"></div><div class="mt-base"></div></div>`;
          const sc = R.scene.querySelector('.mt-scale'), beam = sc.querySelector('#bm');
          const pans = R.choices([0, 1], heavy, { box: sc, btnCls: 'mt-pan', noAnim: true, html: i => `<span class="mt-mbox num" style="--bc:${i ? '#3d8bff' : '#f0533f'}">${i ? rt : lt}</span><i class="mt-dish"></i>`, label: i => (i ? rt : lt), okSay: () => A.num(Math.max(L, Rv)) });
          pans[0].classList.add('L'); pans[1].classList.add('R');
          R.okAnim = () => {
            const dy = heavy === 0 ? 1 : -1, h = (beam.offsetWidth / 2) * Math.sin(12 * Math.PI / 180);
            if (!root.gsap) return;
            gsap.to(beam, { rotation: -dy * 12, duration: 0.8, ease: 'back.out(1.6)' });
            gsap.to(pans[0], { y: dy * h, duration: 0.8, ease: 'back.out(1.6)' });
            gsap.to(pans[1], { y: -dy * h, duration: 0.8, ease: 'back.out(1.6)' });
            A.sfx.land && A.sfx.land();
          };
          R.ask(['m_bal_q'].concat(r === 0 ? ['m_bal_tip'] : []));
        },
      });
    },
  };

  MATH.register({
    id: 'puzzle', order: 8, name: 'ألغاز', icon: '🧩', color: '#14b8c4', voice: 'm_s_puzzle', minAge: 5,
    rec: a => a >= 6, activities: [sudoku, rule, balance],
  });
})(window);

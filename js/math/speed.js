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
})(window);

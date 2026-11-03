/* القسم ٥: القياس والساعة (٥–٨ سنوات) — أطول أم أقصر، الميزان، كم الساعة؟ */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const PC = ['#f0533f', '#ff9a2e', '#22b573', '#3d8bff', '#8b5cf6', '#e8579a', '#14b8c4'];
  const pencil = (len, max, c) => `<span class="mt-pencil" style="--w:${(len / max) * 100}%;--pc:${c}"><span class="pe"></span><span class="pb"></span><span class="pt"></span></span>`;

  /* ---------- أطول أم أقصر ---------- */
  const longer = {
    id: 'longer', name: 'أطول أم أقصر', icon: '📏', minAge: 4,
    mount(el, A) {
      const a = A.age, N = 5;
      const plan = a >= 7 ? ['long', 'short', 'cubes', 'cubes', 'cubes'] : ['long', 'short', 'long', 'short', 'longest'];
      return A.game({
        rounds: N, cls: 'mt-g-len',
        round(r, R) {
          const kind = plan[r], cols = U.shuffle(PC);
          if (kind === 'cubes') {
            const L = R.last ? U.rand(6, 10) : U.rand(3, 8);
            R.scene.innerHTML = `<div class="mt-ruler" dir="ltr">${pencil(L, 10, cols[0])}<div class="mt-cubes">${Array.from({ length: 10 }, (_, i) => `<i style="--h:${i * 36}"></i>`).join('')}</div></div>`;
            R.choices(U.near(L, 4, 1, 10, 2), L, { html: v => `<b dir="ltr">${v}</b>`, okSay: v => A.num(v) });
            R.okAnim = () => R.scene.querySelectorAll('.mt-cubes i').forEach((c, i) => { if (i < L) { c.classList.add('on'); if (root.gsap) gsap.from(c, { y: -10, duration: 0.25, delay: i * 0.06 }); } });
            R.ask(['m_cubes']);
            return;
          }
          const k = kind === 'longest' ? 3 : 2, gap = a <= 5 ? 3 : 2;
          const set = new Set(); let g = 0;
          while (set.size < k && g++ < 200) { const v = U.rand(2, 10); if ([...set].every(x => Math.abs(x - v) >= gap)) set.add(v); }
          const vals = [...set];
          const ans = kind === 'short' ? Math.min(...vals) : Math.max(...vals);
          R.choices(vals, ans, { box: R.scene, cls: 'mt-pencils', btnCls: 'mt-prow', html: (v, i) => pencil(v, 10, cols[i]), label: () => 'قلم' });
          R.ask([kind === 'long' ? 'm_long' : kind === 'short' ? 'm_short' : 'm_longest']);
        },
      });
    },
  };

  /* ---------- الميزان ---------- */
  const PAIRS = [['🐘', '🐭'], ['🍉', '🍒'], ['🚗', '⚽'], ['🐻', '🐥'], ['🎃', '🍓'], ['🐄', '🐝'], ['🐳', '🐟']];
  const BOX = ['#f0533f', '#3d8bff', '#22b573', '#8b5cf6', '#ff9a2e'];
  const heavy = {
    id: 'heavy', name: 'الميزان', icon: '🏋️', minAge: 5,
    mount(el, A) {
      const a = A.age, N = 5, pairs = U.shuffle(PAIRS);
      return A.game({
        rounds: N, cls: 'mt-g-scale',
        round(r, R) {
          const mystery = a >= 5 && r >= 3;
          const wantHeavy = R.last ? false : r % 2 === 0;
          const heavySide = U.rand(0, 1);
          let items;
          if (mystery) { const c = U.shuffle(BOX); items = [0, 1].map(i => `<span class="mt-mbox" style="--bc:${c[i]}">?</span>`); }
          else { const p = pairs[r % pairs.length]; items = heavySide === 0 ? [p[0], p[1]] : [p[1], p[0]]; items = items.map(e => `<span class="mt-pan-e">${e}</span>`); }
          R.scene.innerHTML = `<div class="mt-scale" dir="ltr"><div class="mt-beam" id="bm"></div><div class="mt-post"></div><div class="mt-base"></div></div>`;
          const sc = R.scene.querySelector('.mt-scale'), beam = sc.querySelector('#bm');
          const ans = wantHeavy ? heavySide : 1 - heavySide;
          const pans = R.choices([0, 1], ans, { box: sc, btnCls: 'mt-pan', noAnim: true, html: i => `${items[i]}<i class="mt-dish"></i>`, label: () => 'كفّة' });
          pans[0].classList.add('L'); pans[1].classList.add('R');
          // الميل: الثقيل ينزل
          const tilt = (side, d) => {
            // نزول الكفّة = نصف العارضة × جيب زاوية الميل (عشان الخيوط تفضل متعلّقة بالطرف)
            const dy = side === 0 ? 1 : -1, h = (beam.offsetWidth / 2) * Math.sin(12 * Math.PI / 180);
            if (!root.gsap) return;
            gsap.to(beam, { rotation: -dy * 12, duration: d, ease: 'back.out(1.6)' });
            gsap.to(pans[0], { y: dy * h, duration: d, ease: 'back.out(1.6)' });
            gsap.to(pans[1], { y: -dy * h, duration: d, ease: 'back.out(1.6)' });
          };
          if (mystery) A.later(() => { tilt(heavySide, 0.9); A.sfx.land && A.sfx.land(); }, 350);
          else R.okAnim = () => { tilt(heavySide, 0.8); A.sfx.land && A.sfx.land(); };
          R.ask([wantHeavy ? 'm_heavy' : 'm_light'].concat(mystery && r === 3 ? ['m_scale_tip'] : []));
        },
      });
    },
  };

  /* ---------- كم الساعة؟ ---------- */
  const clock = {
    id: 'clock', name: 'كم الساعة؟', icon: '🕒', minAge: 7,
    mount(el, A) {
      const a = A.age, N = 5;
      const fmt = (h, m) => `${h}:${m ? '30' : '00'}`;
      const sayT = (h, m) => ['m_its', 'm_h_' + h].concat(m ? ['m_half'] : []);
      const hs = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      return A.game({
        rounds: N, cls: 'mt-g-clock', intro: ['m_clock_tip'],
        round(r, R) {
          // الساعة تماماً أولاً، ثم "والنصف" (من الجولة الثانية للكبار)
          const h = hs[r], m = r === 3 || (a >= 9 && r === 1) || (R.last && a >= 8 && Math.random() < 0.5) ? 30 : 0;
          const nx = h % 12 + 1, pv = (h + 10) % 12 + 1;
          const opts = m ? [[h, 30], [nx, 30], [h, 0]] : [[h, 0], [h, 30], [nx, 0]];
          if (!m && Math.random() < 0.5) opts[2] = [pv, 0];
          const vals = U.shuffle(opts), chk = v => v[0] === h && v[1] === m;
          if (R.last) {
            R.scene.innerHTML = `<div class="mt-digital" dir="ltr">${fmt(h, m)}</div>`;
            R.choices(vals, null, { check: chk, cls: 'mt-clocks', btnCls: 'mt-clockb', html: v => MATH.art.clock(v[0], v[1]), label: v => fmt(v[0], v[1]), okSay: () => sayT(h, m) });
            R.ask(['m_clock_find', 'm_h_' + h].concat(m ? ['m_half'] : []), { text: '🕒 ' + fmt(h, m) });
            return;
          }
          R.scene.innerHTML = `<div class="mt-clockbox">${MATH.art.clock(h, m)}</div>`;
          if (root.gsap) gsap.from(R.scene.querySelector('.mt-hand-h'), { rotation: -360, svgOrigin: '50 50', duration: 0.9, ease: 'power2.out' });
          R.choices(vals, null, { check: chk, html: v => `<b dir="ltr" class="mt-dig">${fmt(v[0], v[1])}</b>`, okSay: () => sayT(h, m) });
          R.ask(['m_clock_q']);
        },
      });
    },
  };

  /* ---------- أيام الأسبوع (والشهور للكبار) ---------- */
  const week = {
    id: 'week', name: 'أيام الأسبوع', icon: '📅', minAge: 5,
    mount(el, A) {
      const a = A.age, N = 6;
      const DAYS = [1, 2, 3, 4, 5, 6, 7].map(i => 'm_d_' + i), MONTHS = Array.from({ length: 12 }, (_, i) => 'm_mo_' + (i + 1));
      return A.game({
        rounds: N, cls: 'mt-g-week', intro: ['m_week_tip'],
        round(r, R) {
          const months = a >= 8 && (r >= 3 || R.last);
          const list = months ? MONTHS : DAYS, before = !months && R.last && a >= 6;
          const i = U.rand(0, list.length - 1), ans = list[(i + (before ? list.length - 1 : 1)) % list.length];
          const name = k => A.text(k);
          R.scene.innerHTML = `<div class="mt-ear-row sm"><span class="mt-sj" id="sj"></span><button class="mt-ear" aria-label="اسمع">🔊</button></div>
            <div class="mt-daycard"><b>${name(list[i])}</b></div>
            <div class="mt-rep mt-days">${list.map((k, j) => `<span class="${j === i ? 'on' : ''}">${name(k)}</span>`).join('')}</div>`;
          const sj = A.sj1(R.scene.querySelector('#sj'));
          const wrong = U.shuffle(list.filter(k => k !== ans && k !== list[i])).slice(0, 2);
          R.choices(U.shuffle([ans].concat(wrong)), ans, { html: v => `<b>${name(v)}</b>`, btnCls: 'txt', label: v => name(v), okSay: v => [v] });
          const ask = () => { R.ask([months ? 'm_mo_after' : before ? 'm_day_before' : 'm_day_after', list[i]], { force: true }); if (sj) sj.talk(1800); };
          A.on(R.scene.querySelector('.mt-ear'), 'click', () => { A.sfx.tap(); ask(); });
          R.okAnim = () => { const sp = R.scene.querySelectorAll('.mt-days span')[list.indexOf(ans)]; if (sp) { sp.classList.add('ok'); A.pop(sp); } };
          ask();
        },
      });
    },
  };

  MATH.register({
    id: 'measure', order: 5, name: 'القياس والساعة', icon: '📏', color: '#f08a24', voice: 'm_s_measure', minAge: 5,
    rec: a => a >= 5 && a <= 8, activities: [longer, heavy, clock, week],
  });
})(window);

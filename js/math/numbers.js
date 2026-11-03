/* القسم ١: الأعداد (٣–٥ سنوات) — عُدّ معي، أين الرقم؟، أكثر أم أقل، قطار الأرقام */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  // إيموجي قديمة (≤ ١٢) تظهر في كل التلفونات
  const OBJ = ['🍎', '🍌', '🍓', '⭐', '🐟', '🎈', '🐞', '🌸', '🚗', '🐥', '🍪', '🦋', '🐢', '🍩', '⚽', '🐱', '🍒', '🐝'];
  MATH.OBJ = OBJ;
  const big = v => `<b dir="ltr">${v}</b>`;
  const objs = (n, e, cls) => `<div class="mt-objs ${cls || ''}">${Array.from({ length: n }, (_, i) => `<span class="mt-obj" data-o="${i}">${e}</span>`).join('')}</div>`;
  MATH.objs = objs;
  // عدّ بالضغط: كل ضغطة على شيء جديد تقول رقمه (مساعدة للصغار)
  MATH.tapCount = (A, R, box, onAll) => {
    let k = 0;
    box.classList.add('tapc');
    A.on(box, 'click', e => {
      const o = e.target.closest('.mt-obj');
      if (!o || o.classList.contains('counted') || !R.ready()) return;
      k++; o.classList.add('counted'); o.insertAdjacentHTML('beforeend', `<i dir="ltr">${k}</i>`);
      A.sfx.tap && A.sfx.tap(); A.pop(o);
      A.say(A.num(k), { pri: 'feedback', cut: true, cool: 150, noReplay: true, text: String(k) });
      if (onAll && k === box.querySelectorAll('.mt-obj').length) onAll(k);
    });
  };

  /* ---------- عُدّ معي ---------- */
  const count = {
    id: 'count', name: 'عُدّ معي', icon: '🍎', minAge: 3,
    mount(el, A) {
      const a = A.age, N = 5;
      const [lo, hi] = a <= 3 ? [1, 5] : a <= 5 ? [2, 10] : a <= 7 ? [5, 15] : [8, 20];
      const nch = a <= 3 ? 3 : 4, em = U.shuffle(OBJ);
      let prev = 0;
      return A.game({
        rounds: N, cls: 'mt-g-count', intro: a <= 6 ? ['m_cnt_tip'] : [],
        round(r, R) {
          let n;
          do { n = R.last ? U.rand(hi - 1, hi) : U.rand(lo, lo + Math.ceil((hi - lo) * (r + 1) / N)); } while (n === prev && hi > lo + 1);
          prev = n;
          R.scene.innerHTML = objs(n, em[r % em.length]);
          const box = R.scene.querySelector('.mt-objs');
          R.fit = () => A.fitGrid(box, n, 104, 44);
          MATH.tapCount(A, R, box, () => { const b = R.chBox.querySelector(`.mt-ch[data-ci="${R.vals.indexOf(n)}"]`); if (b) b.classList.add('glow'); });
          if (root.gsap) gsap.from(box.children, { scale: 0, duration: 0.3, stagger: 0.04, ease: 'back.out(2)', clearProps: 'transform' });
          R.choices(U.near(n, nch, 1, hi + 2, 2), n, { html: big, okSay: v => A.num(v) });
          R.ask(['m_cnt']);
        },
      });
    },
  };

  /* ---------- أين الرقم؟ ---------- */
  const tapnum = {
    id: 'tapnum', name: 'أين الرقم؟', icon: '👂', minAge: 3,
    mount(el, A) {
      const a = A.age, N = 6;
      const [lo, hi, nch] = a <= 3 ? [1, 5, 3] : a <= 5 ? [1, 10, 4] : a <= 7 ? [1, 20, 6] : [10, 99, 6];
      let prev = -1;
      return A.game({
        rounds: N, cls: 'mt-g-tapnum',
        round(r, R) {
          let n; do { n = U.rand(lo, hi); } while (n === prev);
          prev = n;
          R.scene.innerHTML = `<div class="mt-ear-row"><span class="mt-sj" id="sj"></span><button class="mt-ear" aria-label="اسمع">🔊</button></div>`;
          const sj = A.sj1(R.scene.querySelector('#sj'));
          const ask = () => { R.ask(['m_find'].concat(A.num(n)), { force: true }); if (sj) sj.talk(1600); };
          A.on(R.scene.querySelector('.mt-ear'), 'click', () => { A.sfx.tap(); ask(); });
          let opts;
          const k = R.last ? Math.min(6, nch + 1) : nch;
          if (n >= 10 && n % 10 && Math.floor(n / 10) !== n % 10 && (n % 10) * 10 + Math.floor(n / 10) <= hi) {
            const rev = (n % 10) * 10 + Math.floor(n / 10);
            opts = U.shuffle([n, rev].concat(U.near(n, k + 2, lo, hi, 12).filter(v => v !== n && v !== rev).slice(0, k - 2)));
          } else opts = U.near(n, k, lo, hi, Math.max(3, Math.round((hi - lo) / 3)));
          R.choices(opts, n, { html: big, cls: k > 4 ? 'many' : '', okSay: v => A.num(v), noSay: v => A.num(v).concat([A.tryKey()]) });
          ask();
        },
      });
    },
  };

  /* ---------- أكثر أم أقل ---------- */
  const more = {
    id: 'more', name: 'أكثر أم أقل', icon: '⚖️', minAge: 4,
    mount(el, A) {
      const a = A.age, N = 6, nums = a >= 7;
      const hi = a <= 4 ? 5 : a <= 6 ? 10 : a <= 7 ? 50 : 99;
      const em = U.shuffle(OBJ);
      return A.game({
        rounds: N, cls: 'mt-g-more',
        round(r, R) {
          const k = R.last ? 3 : 2;
          const wantMore = R.last || (a <= 4 && r < 2) || r % 2 === 0;
          const set = new Set();
          const minGap = nums ? 1 : r < 2 ? 2 : 1;
          let guard = 0;
          while (set.size < k && guard++ < 300) {
            const v = U.rand(1, hi);
            if ([...set].every(x => Math.abs(x - v) >= minGap)) set.add(v);
          }
          // للكبار: أرقام متشابهة الخانات (٣٨ و ٨٣) تختبر القيمة المكانية
          let vals = [...set];
          if (nums && hi > 20 && r >= 2 && !R.last) { const t = U.rand(1, 9), u = U.rand(1, 9); if (t !== u) vals = [t * 10 + u, u * 10 + t]; }
          const ans = wantMore ? Math.max(...vals) : Math.min(...vals);
          const e = em[r % em.length];
          R.choices(vals, ans, {
            box: R.scene, cls: 'mt-trays', btnCls: 'mt-tray',
            html: v => (nums ? `<b class="mt-bignum" dir="ltr">${v}</b>` : objs(v, e)),
            label: v => String(v), okSay: v => A.num(v),
          });
          if (nums) R.scene.classList.add('nums');
          if (!nums) R.fit =() => R.scene.querySelectorAll('.mt-objs').forEach(g => A.fitGrid(g, g.children.length, 72, 18));
          R.ask([nums ? (wantMore ? 'm_big' : 'm_small') : R.last ? 'm_most' : wantMore ? 'm_more' : 'm_less']);
        },
      });
    },
  };

  /* ---------- قطار الأرقام ---------- */
  const order = {
    id: 'order', name: 'قطار الأرقام', icon: '🚂', minAge: 4,
    mount(el, A) {
      const a = A.age, N = 5;
      const len = a <= 4 ? 4 : a <= 6 ? 5 : 6;
      const steps = a <= 6 ? [1, 1, 1, 1, 1] : a === 7 ? [1, 2, 2, 5, 10] : U.shuffle([2, 5, 10, 2]).concat([5]);
      return A.game({
        rounds: N, cls: 'mt-g-order', intro: a <= 6 ? ['m_order_tip'] : [],
        round(r, R) {
          const st = steps[r] || 1, down = R.last && a >= 5;
          const maxStart = a <= 3 ? 1 : a <= 4 ? 3 : a <= 6 ? 12 : 30;
          let start = st === 1 ? U.rand(1, maxStart) : st * U.rand(0, Math.floor(maxStart / st));
          if (down) start = st === 1 ? U.rand(len, a <= 6 ? 10 : 20) : st * U.rand(len, 10);
          const seq = Array.from({ length: len }, (_, i) => (down ? start - i * st : start + i * st));
          const miss = a <= 4 ? len - 1 : U.rand(1, len - 1);
          const ans = seq[miss];
          R.scene.innerHTML = `<div class="mt-train-wrap"><div class="mt-train" dir="ltr">${seq.map((v, i) => `<span class="mt-car ${i === miss ? 'q' : ''}" style="--h:${(i * 47) % 360}"><b>${i === miss ? '?' : v}</b><i></i><i></i></span>`).join('')}<span class="mt-loco">🚂</span></div><div class="mt-rail"></div></div>`;
          const tr = R.scene.querySelector('.mt-train');
          if (root.gsap) gsap.from(tr, { x: -400, duration: 0.8, ease: 'power2.out' });
          const set = new Set([ans]);
          [ans + st, ans - st, ans + 1, ans - 1, ans + 2 * st].forEach(v => { if (set.size < (a <= 3 ? 3 : 4) && v >= 0) set.add(v); });
          R.choices(U.shuffle([...set]), ans, {
            html: big,
            okSay: () => (a <= 6 ? seq.reduce((k, v) => k.concat(A.num(v)), []) : A.num(ans)),
          });
          R.data.anim = () => {
            const c = R.scene.querySelector('.mt-car.q'); if (c) { c.classList.remove('q'); c.classList.add('fill'); c.querySelector('b').textContent = ans; }
            A.sfx.hop && A.sfx.hop();
            if (root.gsap) gsap.to(tr, { x: 18, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' });
          };
          R.okAnim = R.data.anim;
          R.ask([down ? 'm_back' : null, 'm_order'].filter(Boolean));
        },
      });
    },
  };

  /* ---------- زوجي أم فردي ---------- */
  const evenodd = {
    id: 'evenodd', name: 'زوجي أم فردي', icon: '👯', minAge: 6,
    mount(el, A) {
      const a = A.age, N = 6;
      const [lo, hi] = a <= 6 ? [1, 10] : a <= 7 ? [1, 20] : [10, 99];
      const em = U.shuffle(OBJ);
      let prev = -1;
      return A.game({
        rounds: N, cls: 'mt-g-eo', intro: ['m_eo_tip'],
        round(r, R) {
          let n; do { n = R.last && a >= 8 ? U.rand(50, 99) : U.rand(lo, hi); } while (n === prev);
          prev = n;
          const showObj = n <= 20;
          R.scene.innerHTML = `<div class="mt-eo-num"><b dir="ltr">${n}</b></div>` + (showObj ? objs(n, em[r % em.length], 'pairs') : '');
          const box = R.scene.querySelector('.mt-objs');
          if (box) { R.fit = () => A.fitGrid(box, n, 80, 30); MATH.tapCount(A, R, box); }
          const ans = n % 2 === 0 ? 'e' : 'o';
          R.choices(['e', 'o'], ans, { html: v => `<b>${v === 'e' ? 'زوجي' : 'فردي'}</b>`, btnCls: 'txt', label: v => (v === 'e' ? 'زوجي' : 'فردي'), okSay: v => (v === 'e' ? ['m_even'] : ['m_odd']) });
          R.okAnim = () => { if (box) [...box.children].forEach((o, i) => { o.classList.add(i % 2 ? 'pb' : 'pa'); }); };
          R.ask(A.num(n).concat(['m_eo_q']), { text: String(n) });
        },
      });
    },
  };

  /* ---------- أكبر أم أصغر (< > =) ---------- */
  const compare = {
    id: 'compare', name: 'علامة المقارنة', icon: '🐊', minAge: 7,
    mount(el, A) {
      const a = A.age, N = 6, hi = a <= 7 ? 20 : 99;
      return A.game({
        rounds: N, cls: 'mt-g-cmp', intro: ['m_cmp_tip'],
        round(r, R) {
          let x = U.rand(1, hi), y = U.rand(1, hi);
          if (r === 2 || (R.last && Math.random() < 0.4)) y = x; // يساوي
          else if (a >= 8 && r >= 3 && x !== y) { const t = U.rand(1, 9), u = U.rand(0, 9); if (t !== u) { x = t * 10 + u; y = u * 10 + t; } }
          const ans = x > y ? '>' : x < y ? '<' : '=';
          R.scene.innerHTML = '<span class="mt-sj sm" id="sj"></span>' + U.eqHtml([x, '?', y], 'xl');
          const s = A.sj1(R.scene.querySelector('#sj'));
          R.choices(U.shuffle(['<', '>', '=']), ans, { okSay: v => A.num(x).concat([v === '>' ? 'm_cmp_gt' : v === '<' ? 'm_cmp_lt' : 'm_eq'], A.num(y)) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = ans; q.classList.remove('q'); q.classList.add('ans'); } if (s) s.jump(); };
          R.ask(['m_cmp_q'], { text: `${x} ? ${y}` });
        },
      });
    },
  };

  MATH.register({
    id: 'count', order: 1, name: 'الأعداد', icon: '🔢', color: '#3d8bff', voice: 'm_s_count', minAge: 3,
    rec: a => a <= 6, activities: [count, tapnum, more, order, evenodd, compare],
  });
})(window);

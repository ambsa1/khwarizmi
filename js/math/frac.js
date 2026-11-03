/* القسم ٦: الكسور والنقود (٨–٩ سنوات) — البيتزا (نصف وربع)، والدكّان (ادفع الثمن بالضبط) */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;

  /* ---------- البيتزا ---------- */
  const NAME = { '1/2': ['m_pz_half', 'm_fr_half'], '1/4': ['m_pz_q', 'm_fr_q'], '3/4': ['m_pz_3q', 'm_fr_3q'] };
  const pizza = {
    id: 'pizza', name: 'البيتزا', icon: '🍕', minAge: 7,
    mount(el, A) {
      const a = A.age, N = 5;
      const plan = a >= 8 ? [[2, 1], [4, 1], [4, 2], [4, 3]] : [[2, 1], [4, 1], [4, 2], [2, 1]];
      return A.game({
        rounds: N, cls: 'mt-g-pz', intro: ['m_pz_tip'],
        round(r, R) {
          if (R.last) {
            // التحدّي: كم أكلنا؟ (بيتزا من ٤ قطع، مأكول منها ١ أو ٢ أو ٣)
            const k = U.rand(1, a >= 8 ? 3 : 2), f = k === 2 ? '1/2' : k === 1 ? '1/4' : '3/4';
            const eaten = Array.from({ length: k }, (_, i) => i);
            R.scene.innerHTML = `<div class="mt-pz-box">${MATH.art.pizza(4, eaten, { gap: true })}</div>`;
            const opts = U.shuffle(['1/2', '1/4', '3/4']);
            R.choices(opts, f, { html: v => U.frac(...v.split('/')), btnCls: 'mt-frb', okSay: v => [NAME[v][1]] });
            R.ask(['m_pz_how']);
            return;
          }
          const [n, t] = plan[r];
          const f = t * 4 / n === 2 ? '1/2' : t * 4 / n === 1 ? '1/4' : '3/4';
          R.scene.innerHTML = `<div class="mt-pz-goal">${U.frac(...f.split('/'))}</div><div class="mt-pz-box">${MATH.art.pizza(n, [], { gap: true })}</div>`;
          const eaten = new Set();
          const box = R.scene.querySelector('.mt-pz-box');
          const toggle = g => {
            if (!R.ready()) return;
            const i = +g.dataset.s;
            if (eaten.has(i)) { eaten.delete(i); g.classList.remove('eaten'); A.sfx.tap(); return; }
            eaten.add(i); g.classList.add('eaten'); A.sfx.snap && A.sfx.snap();
            const rr = g.getBoundingClientRect(); A.burst(g, 10, ['#ffd35c', '#d63a2b', '#e09a3b']);
            if (eaten.size === t) R.right(box, [NAME[f][1]], { min: 1100 });
            else if (eaten.size > t) {
              R.wrong(box, 'm_pz_much');
              A.later(() => { eaten.delete(i); g.classList.remove('eaten'); }, 500);
            }
            return rr;
          };
          A.on(box, 'click', e => { const g = e.target.closest('.mt-slice'); if (g) toggle(g); });
          R.solver = () => { const g = [...box.querySelectorAll('.mt-slice')].find(x => !x.classList.contains('eaten')); if (g && eaten.size < t) toggle(g); };
          R.hint = () => { box.classList.add('hint'); A.later(() => box.classList.remove('hint'), 2000); };
          R.ask([NAME[f][0]]);
        },
      });
    },
  };

  /* ---------- الدكّان ---------- */
  const ITEMS = ['🧸', '🍦', '⚽', '📚', '🎈', '🍭', '🍉', '🚲', '🎨'];
  const shop = {
    id: 'shop', name: 'الدكّان', icon: '🛒', minAge: 8,
    mount(el, A) {
      const a = A.age, N = 5;
      const coins = a <= 7 ? [1, 5] : [1, 5, 10];
      const [lo, hi] = a <= 7 ? [2, 10] : a <= 8 ? [6, 20] : [11, 50];
      const items = U.shuffle(ITEMS);
      return A.game({
        rounds: N, cls: 'mt-g-shop', intro: ['m_shop_tip'],
        round(r, R) {
          const price = R.last ? U.rand(Math.max(lo, hi - 8), hi) : U.rand(lo, lo + Math.round((hi - lo) * (r + 1) / N));
          R.scene.innerHTML = `<div class="mt-shop"><div class="mt-item-card"><span class="mt-goods">${items[r % items.length]}</span><span class="mt-tag" dir="ltr">${price}</span></div>
            <div class="mt-tray"><div class="mt-paid" id="pd"></div><div class="mt-sum" dir="ltr">= <b id="sm">0</b></div></div></div>`;
          R.chBox.classList.add('mt-wallet');
          R.chBox.innerHTML = coins.map(v => `<button class="mt-coinb" data-v="${v}" aria-label="${v}">${MATH.art.coin(v)}</button>`).join('');
          const pd = R.scene.querySelector('#pd'), sm = R.scene.querySelector('#sm');
          let sum = 0;
          const show = () => { sm.textContent = sum; };
          const add = (v, b) => {
            if (!R.ready()) return;
            if (sum + v > price) { R.wrong(b, 'm_shop_much'); return; }
            sum += v; show(); A.sfx.pen && A.sfx.pen();
            const c = document.createElement('button'); c.className = 'mt-paidc'; c.dataset.v = v; c.innerHTML = MATH.art.coin(v); c.setAttribute('aria-label', String(v));
            pd.appendChild(c);
            if (root.gsap) gsap.from(c, { y: 60, scale: 0.5, duration: 0.3, ease: 'back.out(2)' });
            if (sum === price) R.right(R.scene.querySelector('.mt-tray'), ['m_shop_ok'], { min: 1200 });
          };
          R.chBox.querySelectorAll('.mt-coinb').forEach(b => A.on(b, 'click', () => add(+b.dataset.v, b)));
          A.on(pd, 'click', e => { const c = e.target.closest('.mt-paidc'); if (!c || !R.ready()) return; sum -= +c.dataset.v; show(); c.remove(); A.sfx.tap(); });
          R.solver = () => { const left = price - sum; const v = [...coins].reverse().find(x => x <= left); const b = R.chBox.querySelector(`.mt-coinb[data-v="${v}"]`); if (b) add(v, b); };
          R.hint = () => { const left = price - sum; const v = [...coins].reverse().find(x => x <= left); const b = R.chBox.querySelector(`.mt-coinb[data-v="${v}"]`); if (b) { b.classList.add('hint'); A.later(() => b.classList.remove('hint'), 2200); } };
          R.ask(['m_price'].concat(A.num(price), r === 0 ? ['m_shop'] : []), { text: '🏷️ ' + price });
        },
      });
    },
  };

  /* ---------- أيّ بيتزا؟ (تعرّف على الكسر من الصورة) ---------- */
  const FR = { '1/2': [2, 1, 'm_fr_half'], '1/4': [4, 1, 'm_fr_q'], '3/4': [4, 3, 'm_fr_3q'], '1/3': [3, 1, 'm_fr_third'], '2/3': [3, 2, 'm_fr_2third'] };
  const fraccmp = {
    id: 'fraccmp', name: 'أيّ بيتزا؟', icon: '🧀', minAge: 8,
    mount(el, A) {
      const a = A.age, N = 5;
      const pool = a >= 9 ? Object.keys(FR) : ['1/2', '1/4', '3/4'];
      const plan = U.shuffle(pool).concat(U.shuffle(pool));
      return A.game({
        rounds: N, cls: 'mt-g-frc',
        round(r, R) {
          const f = plan[r], k = R.last ? Math.min(4, pool.length) : 3;
          const opts = U.shuffle([f].concat(U.shuffle(pool.filter(x => x !== f)).slice(0, k - 1)));
          R.scene.innerHTML = `<div class="mt-pz-goal">${U.frac(...f.split('/'))}</div>`;
          R.choices(opts, f, { btnCls: 'mt-pzb', cls: 'mt-pzs', html: v => MATH.art.pizza(FR[v][0], Array.from({ length: FR[v][1] }, (_, i) => i), { gap: true }), label: v => v, okSay: v => [FR[v][2]] });
          R.ask(['m_frc_q', FR[f][2]], { text: f });
        },
      });
    },
  };

  /* ---------- الباقي (دفعنا ١٠ والثمن ٧) ---------- */
  const change = {
    id: 'change', name: 'الباقي', icon: '💰', minAge: 8,
    mount(el, A) {
      const a = A.age, N = 5, items = U.shuffle(ITEMS);
      return A.game({
        rounds: N, cls: 'mt-g-chg', intro: ['m_chg_tip'],
        round(r, R) {
          const paid = a <= 8 ? (R.last ? 20 : 10) : R.last ? 50 : U.pick([10, 20]);
          const price = U.rand(1, paid - 1), ans = paid - price;
          R.scene.innerHTML = `<div class="mt-shop"><div class="mt-item-card"><span class="mt-goods">${items[r % items.length]}</span><span class="mt-tag" dir="ltr">${price}</span></div>
            <div class="mt-paidbig">${MATH.art.coin(paid)}</div></div>` + U.eqHtml([paid, '−', price, '=', '?']);
          const set = new Set([ans]);
          [ans + 1, ans - 1, price, ans + 10, ans + 2].forEach(v => { if (set.size < 4 && v > 0 && v !== ans) set.add(v); });
          R.choices(U.shuffle([...set]), ans, { html: v => `<b dir="ltr">${v}</b>`, okSay: () => U.eqKeys(paid, '−', price, ans) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = ans; q.classList.remove('q'); q.classList.add('ans'); } };
          R.ask(['m_chg'].concat(A.num(paid), ['m_chg2'], A.num(price), ['m_chg_q']), { text: U.eqText(paid, '−', price) });
        },
      });
    },
  };

  MATH.register({
    id: 'frac', order: 6, name: 'الكسور والنقود', icon: '🍕', color: '#d9a400', voice: 'm_s_frac', minAge: 8,
    rec: a => a >= 8, activities: [pizza, shop, fraccmp, change],
  });
})(window);

/* القسم ٤: الضرب (٨–٩ سنوات) — مجموعات وصفوف، وجداول ٢ و ٥ و ١٠ */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const big = v => `<b dir="ltr">${v}</b>`;
  // اختيارات تشبه أخطاء الأطفال: جمع بدل ضرب، مجموعة زيادة أو ناقصة
  function mulOpts(g, k) {
    const ans = g * k, set = new Set([ans]);
    [g + k, ans + k, ans - k, ans + 1, ans - 1, ans + g].forEach(v => { if (set.size < 4 && v > 0) set.add(v); });
    return U.shuffle([...set]);
  }

  /* ---------- مجموعات وصفوف ---------- */
  const groups = {
    id: 'groups', name: 'مجموعات وصفوف', icon: '🍪', minAge: 7,
    mount(el, A) {
      const a = A.age, N = 5, gm = a <= 7 ? 3 : a <= 8 ? 5 : 6, km = a <= 7 ? 4 : a <= 8 ? 5 : 6;
      const em = U.shuffle(['🍪', '🍓', '🍩', '⭐', '🍒', '🐞']);
      return A.game({
        rounds: N, cls: 'mt-g-grp', intro: ['m_grp_tip'],
        round(r, R) {
          const arr = r % 2 === 1;
          let g = U.rand(2, gm), k = U.rand(2, km);
          if (R.last) { g = U.rand(3, a <= 7 ? 5 : 9); k = U.pick([2, 5, 10]); }
          const ans = g * k;
          let html;
          if (R.last) html = '';
          else if (arr) html = `<div class="mt-arr" dir="ltr" style="--cols:${k}">${Array.from({ length: g * k }, (_, i) => `<i style="--d:${Math.floor(i / k)}"></i>`).join('')}</div>`;
          else html = `<div class="mt-plates" id="pl">${Array.from({ length: g }, () => `<span class="mt-plate"><span class="mt-plate-in" style="--k:${Math.ceil(Math.sqrt(k))}">${Array.from({ length: k }, () => `<i>${em[r % em.length]}</i>`).join('')}</span></span>`).join('')}</div>`;
          const rep = `<div class="mt-rep" dir="ltr">${Array.from({ length: g }, () => k).join(' + ')}</div>`;
          R.scene.innerHTML = html + (R.last ? '' : rep) + U.eqHtml([g, '×', k, '=', '?'], R.last ? 'xl' : '');
          const pl = R.scene.querySelector('#pl');
          const ar = R.scene.querySelector('.mt-arr');
          R.fit = () => {
            if (pl) A.fitGrid(pl, g, 130, 54);
            if (ar) {
              // المساحة الباقية بعد المسألة والجمع المتكرر
              const used = [...R.scene.children].filter(c => c !== ar).reduce((s, c) => s + c.offsetHeight + 10, 0);
              const W = R.scene.clientWidth - 20, H = R.scene.clientHeight - used - 10;
              ar.style.setProperty('--c', Math.floor(Math.max(14, Math.min(44, (W - 6 * k) / k, (H - 6 * g) / g))) + 'px');
            }
          };
          if (ar && root.gsap) gsap.from(ar.children, { scale: 0, duration: 0.25, stagger: { each: 0.02 }, ease: 'back.out(2)', clearProps: 'transform' });
          if (pl && root.gsap) gsap.from(pl.children, { y: -30, opacity: 0, duration: 0.35, stagger: 0.1, ease: 'back.out(2)', clearProps: 'transform,opacity' });
          R.choices(mulOpts(g, k), ans, { html: big, okSay: () => U.eqKeys(g, '×', k, ans) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = ans; q.classList.remove('q'); q.classList.add('ans'); } };
          R.ask([R.last ? null : arr ? 'm_arr' : 'm_grp'].filter(Boolean).concat(U.eqKeys(g, '×', k)), { text: U.eqText(g, '×', k) });
        },
      });
    },
  };

  /* ---------- جدول الضرب ---------- */
  const tables = {
    id: 'tables', name: 'جدول الضرب', icon: '✖️', minAge: 8,
    mount(el, A) {
      let G = null;
      el.innerHTML = `<div class="mt-pickt"><div class="mt-pickt-sj" id="sj"></div><div class="mt-pickt-row">
        ${[2, 5, 10].map(t => `<button class="mt-tbtn" data-t="${t}"><b dir="ltr">× ${t}</b></button>`).join('')}
        <button class="mt-tbtn mix" data-t="0"><b>🎲</b></button></div></div>`;
      const sj = A.siraj(el.querySelector('#sj'));
      A.later(() => { A.say('m_tbl'); if (sj) sj.wave(); }, 250);
      if (root.gsap) gsap.from(el.querySelectorAll('.mt-tbtn'), { scale: 0.4, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'back.out(2)', clearProps: 'transform,opacity' });
      A.on(el, 'click', e => {
        const b = e.target.closest('.mt-tbtn'); if (!b || G) return;
        A.sfx.tap(); start(+b.dataset.t);
      });
      function start(t) {
        if (sj) sj.destroy();
        const ns = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const list = ns.slice(0, 5).map(n => [t || U.pick([2, 5, 10]), n]);
        list.push([t || U.pick([3, 4]), U.rand(6, 10)]); // التحدّي
        const lit = new Set();
        G = A.game({
          rounds: list.length, cls: 'mt-g-tbl',
          round(r, R) {
            const [tt, n] = list[r], ans = tt * n;
            R.scene.innerHTML = (t ? `<div class="mt-ladder" dir="ltr">${Array.from({ length: 10 }, (_, i) => `<span class="${lit.has(i + 1) ? 'on' : ''}" data-n="${i + 1}"><small>${t}×${i + 1}</small><b>${lit.has(i + 1) ? (i + 1) * t : '·'}</b></span>`).join('')}</div>` : '') + U.eqHtml([tt, '×', n, '=', '?'], 'xl');
            R.choices(mulOpts(tt, n), ans, { html: big, okSay: () => U.eqKeys(tt, '×', n, ans) });
            R.okAnim = () => {
              const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = ans; q.classList.remove('q'); q.classList.add('ans'); }
              if (tt === t) { lit.add(n); const c = R.scene.querySelector(`.mt-ladder span[data-n="${n}"]`); if (c) { c.classList.add('on'); c.querySelector('b').textContent = ans; A.pop(c); } }
            };
            R.ask(U.eqKeys(tt, '×', n), { text: U.eqText(tt, '×', n) });
          },
          win: () => ({ note: t ? '× ' + t : '🎲' }),
        });
      }
      return {
        get G() { return G; },
        pick() { if (!G) start(2); },
        async solve() {
          if (!G) el.querySelector('.mt-tbtn').click();
          await A.wait(400);
          if (G) await G.solve();
        },
      };
    },
  };

  /* ---------- القسمة بالتساوي (وزّع على الأطباق) ---------- */
  const share = {
    id: 'share', name: 'وزّع بالتساوي', icon: '🍽️', minAge: 8,
    mount(el, A) {
      const a = A.age, N = 5, em = U.shuffle(['🍪', '🍓', '🍩', '🍒', '🍬', '🥕']);
      return A.game({
        rounds: N, cls: 'mt-g-share', intro: ['m_share_tip'],
        round(r, R) {
          const g = R.last ? U.rand(3, 5) : U.rand(2, a <= 8 ? 4 : 5), k = R.last ? U.rand(3, 6) : U.rand(1, a <= 8 ? 5 : 6), n = g * k;
          const e = em[r % em.length];
          R.scene.innerHTML = MATH.objs(n, e) + `<div class="mt-plates" id="pl">${Array.from({ length: g }, () => `<span class="mt-plate"><span class="mt-plate-in" style="--k:${Math.ceil(Math.sqrt(k))}"></span></span>`).join('')}</div>` + U.eqHtml([n, '÷', g, '=', '?']);
          const box = R.scene.querySelector('.mt-objs'), pl = R.scene.querySelector('#pl');
          R.fit = () => { A.fitGrid(box, n, 56, 22); A.fitGrid(pl, g, 110, 54); };
          if (root.gsap) gsap.from(box.children, { scale: 0, duration: 0.25, stagger: 0.02, ease: 'back.out(2)', clearProps: 'transform' });
          const set = new Set([k]);
          [k + 1, k - 1, g, k + 2, n - g].forEach(v => { if (set.size < 4 && v > 0) set.add(v); });
          R.choices(U.shuffle([...set]), k, { html: big, okSay: () => U.eqKeys(n, '÷', g, k) });
          R.okAnim = () => {
            const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = k; q.classList.remove('q'); q.classList.add('ans'); }
            [...box.children].forEach((o, i) => { o.style.visibility = 'hidden'; const p = pl.children[i % g]; if (p) p.querySelector('.mt-plate-in').insertAdjacentHTML('beforeend', `<i>${e}</i>`); });
            A.sfx.snap && A.sfx.snap();
          };
          R.ask(U.eqKeys(n, '÷', g).slice(0, -1).concat(['m_share_q']), { text: U.eqText(n, '÷', g) });
        },
      });
    },
  };

  /* ---------- العامل المفقود (٣ × ? = ١٢) ---------- */
  const factor = {
    id: 'factor', name: 'الرقم المختفي', icon: '🔍', minAge: 8,
    mount(el, A) {
      const a = A.age, N = 5;
      return A.game({
        rounds: N, cls: 'mt-g-factor', intro: ['m_factor_tip'],
        round(r, R) {
          const g = R.last ? U.rand(3, 9) : a <= 8 ? U.pick([2, 3, 4, 5, 10]) : U.rand(2, 10), k = U.rand(2, R.last ? 9 : a <= 8 ? 6 : 10), ans = g * k;
          R.scene.innerHTML = '<span class="mt-sj sm" id="sj"></span>' + U.eqHtml([g, '×', '?', '=', ans], 'xl');
          const s = A.sj1(R.scene.querySelector('#sj'));
          const set = new Set([k]);
          [k + 1, k - 1, k + 2, ans - g, k + g].forEach(v => { if (set.size < 4 && v > 0) set.add(v); });
          R.choices(U.shuffle([...set]), k, { html: big, okSay: () => U.eqKeys(g, '×', k, ans) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = k; q.classList.remove('q'); q.classList.add('ans'); } if (s) s.jump(); };
          R.ask(['m_miss'], { text: `${g} × ? = ${ans}` });
        },
      });
    },
  };

  MATH.register({
    id: 'mult', order: 4, name: 'الضرب', icon: '✖️', color: '#8b5cf6', voice: 'm_s_mult', minAge: 8,
    rec: a => a >= 8, activities: [groups, tables, share, factor],
  });
})(window);

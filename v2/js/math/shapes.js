/* القسم ٢: الأشكال والأنماط (٣–٦ سنوات) — أين الشكل؟، أكمل النمط، رتّب في الصناديق */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const COL = ['#f0533f', '#ff9a2e', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6', '#e8579a', '#14b8c4'];
  const shp = (k, c, rot) => MATH.art.shape(k, c, rot);

  /* ---------- أين الشكل؟ ---------- */
  const shapes = {
    id: 'shapes', name: 'أين الشكل؟', icon: '🔺', minAge: 3,
    mount(el, A) {
      const a = A.age, N = 6;
      const pool = a <= 3 ? ['circle', 'square', 'triangle', 'star'] : a <= 5 ? ['circle', 'square', 'triangle', 'star', 'heart', 'rect'] : ['circle', 'square', 'triangle', 'star', 'heart', 'rect', 'diamond'];
      const order = U.shuffle(pool).concat(U.shuffle(pool));
      return A.game({
        rounds: N, cls: 'mt-g-shapes',
        round(r, R) {
          R.scene.innerHTML = `<div class="mt-ear-row sm"><span class="mt-sj" id="sj"></span><button class="mt-ear" aria-label="اسمع">🔊</button></div><div class="mt-fitbox" id="fb"></div>`;
          const sj = A.sj1(R.scene.querySelector('#sj'));
          const fb = R.scene.querySelector('#fb');
          // التحدّي للكبار: كم ضلعاً؟
          if (R.last && a >= 6) {
            const kind = U.pick(['triangle', 'square', 'pentagon', 'hexagon']), n = MATH.art.SIDES[kind];
            fb.innerHTML = `<div class="mt-oneshape">${shp(kind, U.pick(COL))}</div>`;
            R.choices([3, 4, 5, 6], n, { html: v => `<b dir="ltr">${v}</b>`, okSay: v => A.num(v) });
            const ask = () => { R.ask(['m_sides'], { force: true }); if (sj) sj.talk(1500); };
            A.on(R.scene.querySelector('.mt-ear'), 'click', () => { A.sfx.tap(); ask(); });
            ask();
            return;
          }
          const target = order[r], k = a <= 3 ? 3 : 4;
          const others = U.shuffle(pool.filter(p => p !== target)).slice(0, k - 1);
          const oneCol = R.last ? U.pick(COL) : null, cols = U.shuffle(COL);
          const vals = U.shuffle([target].concat(others)).map((kind, i) => ({ kind, color: oneCol || cols[i], rot: a >= 6 && !['circle', 'square', 'diamond'].includes(kind) ? U.rand(-25, 25) : 0 })); // المربع المايل = معيّن، فلا نميله
          R.choices(vals, null, {
            box: fb, cls: 'mt-fitgrid', btnCls: 'mt-fit', check: v => v.kind === target,
            html: v => shp(v.kind, v.color, v.rot), okSay: () => ['m_sh_' + target],
          });
          R.fit = () => A.fitGrid(fb, vals.length, 170, 60);
          const ask = () => { R.ask(['m_shq_' + target], { force: true }); if (sj) sj.talk(1200); };
          A.on(R.scene.querySelector('.mt-ear'), 'click', () => { A.sfx.tap(); ask(); });
          ask();
        },
      });
    },
  };

  /* ---------- أكمل النمط ---------- */
  // عنصر النمط: شكل ملوّن أو رقم
  const tok = t => (t.n != null ? `<b class="mt-tnum" dir="ltr">${t.n}</b>` : shp(t.k, t.c));
  const tkey = t => (t.n != null ? 'n' + t.n : t.k + t.c);
  const pattern = {
    id: 'pattern', name: 'أكمل النمط', icon: '🔴', minAge: 4,
    mount(el, A) {
      const a = A.age, N = 5;
      function make(r, last) {
        const units = a <= 4 ? ['AB', 'AB', 'AB', 'ABB', 'ABC'] : a <= 6 ? ['AB', 'AAB', 'ABC', 'ABB', 'AABB'] : ['ABC', 'AABB', 'num', 'num', 'num'];
        const u = units[Math.min(r, units.length - 1)];
        if (u === 'num') {
          const st = last ? U.pick([3, 4, -2]) : U.pick([2, 5, 10]);
          const s0 = st < 0 ? U.rand(14, 20) : st === 10 ? 10 * U.rand(0, 4) : st * U.rand(0, 3);
          const seq = Array.from({ length: 5 }, (_, i) => ({ n: s0 + i * st }));
          const ans = { n: s0 + 5 * st };
          const opts = [ans, { n: ans.n + 1 }, { n: ans.n + st }, { n: ans.n - 1 }];
          return { seq, ans, opts: U.shuffle(opts.slice(0, 3)), num: true };
        }
        const letters = [...new Set(u)];
        const mode = a <= 4 && r < 2 ? 'col' : U.pick(['col', 'shape', 'both']);
        const ks = U.shuffle(['circle', 'square', 'triangle', 'star', 'heart']), cs = U.shuffle(COL);
        const map = {};
        letters.forEach((L, i) => { map[L] = mode === 'col' ? { k: ks[0], c: cs[i] } : mode === 'shape' ? { k: ks[i], c: cs[0] } : { k: ks[i], c: cs[i] }; });
        const L = Math.max(a <= 4 ? 5 : 6, u.length * 2 + 1);
        const full = Array.from({ length: L + 1 }, (_, i) => map[u[i % u.length]]);
        const ans = full[L], seq = full.slice(0, L);
        const wrong = letters.map(x => map[x]).filter(t => tkey(t) !== tkey(ans));
        if (wrong.length < 2) wrong.push(mode === 'col' ? { k: ks[0], c: cs[5] } : { k: ks[4], c: map[letters[0]].c });
        return { seq, ans, opts: U.shuffle([ans].concat(wrong.slice(0, 2))) };
      }
      return A.game({
        rounds: N, cls: 'mt-g-pattern', intro: ['m_pat_tip'],
        round(r, R) {
          const p = make(r, R.last);
          R.scene.innerHTML = `<div class="mt-patrow" style="--n:${p.seq.length + 1}" ${p.num ? 'dir="ltr"' : ''}>${p.seq.map(t => `<span class="mt-tok">${tok(t)}</span>`).join('')}<span class="mt-tok q"><b>?</b></span></div>`;
          if (root.gsap) gsap.from(R.scene.querySelectorAll('.mt-tok'), { y: -20, opacity: 0, stagger: 0.07, duration: 0.3, ease: 'back.out(2)', clearProps: 'transform,opacity' });
          R.choices(p.opts, p.ans, {
            check: v => tkey(v) === tkey(p.ans), html: v => `<span class="mt-tok">${tok(v)}</span>`, btnCls: 'mt-tokb',
            okSay: v => (v.n != null ? A.num(v.n) : null),
          });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-tok.q'); if (q) { q.classList.remove('q'); q.innerHTML = tok(p.ans); A.pop(q); } };
          R.ask(['m_pat']);
        },
      });
    },
  };

  /* ---------- رتّب في الصناديق ---------- */
  const sort = {
    id: 'sort', name: 'رتّب في الصناديق', icon: '🧺', minAge: 3,
    mount(el, A) {
      const a = A.age, N = 3, byCol = a <= 4;
      return A.game({
        rounds: N, cls: 'mt-g-sort',
        round(r, R) {
          const nb = R.last && a >= 5 ? 3 : 2;
          const n = r === 0 ? (a <= 3 ? 4 : 6) : R.last ? (nb === 3 ? 9 : 8) : 6;
          const kinds = U.shuffle(['circle', 'square', 'triangle', 'star', 'heart']).slice(0, nb);
          const cols = U.shuffle(['#f0533f', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6']).slice(0, nb);
          const bins = byCol ? cols : kinds;
          // كل صندوق له نصيب، والباقي عشوائي
          const items = U.shuffle(Array.from({ length: n }, (_, i) => {
            const b = i < nb * 2 ? i % nb : U.rand(0, nb - 1);
            return byCol ? { b, k: U.pick(kinds.concat(['circle', 'square'])), c: cols[b] } : { b, k: kinds[b], c: U.pick(['#f0533f', '#ff9a2e', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6', '#e8579a']) };
          }));
          R.scene.innerHTML = `<div class="mt-pool">${items.map((t, i) => `<button class="mt-item" data-i="${i}" aria-label="شكل">${shp(t.k, t.c)}</button>`).join('')}</div>`;
          R.chBox.classList.add('mt-bins');
          R.chBox.innerHTML = bins.map((b, i) => `<button class="mt-bin" data-b="${i}" style="--bc:${byCol ? b : '#7a83b8'}" aria-label="صندوق">
            <span class="mt-bin-lbl">${byCol ? '<span class="mt-sw"></span>' : shp(b, '#ffffff')}</span><span class="mt-got"></span></button>`).join('');
          if (root.gsap) gsap.from(R.scene.querySelectorAll('.mt-item'), { scale: 0, duration: 0.3, stagger: 0.05, ease: 'back.out(2)', clearProps: 'transform' });
          let sel = null, left = n;
          const binEl = i => R.chBox.querySelector(`.mt-bin[data-b="${i}"]`);
          const select = it => { if (sel) sel.classList.remove('sel'); sel = it; if (it) { it.classList.add('sel'); A.sfx.tap(); } };
          function place(it, bi) {
            if (!R.ready() || !it || it.classList.contains('used')) return false;
            const t = items[+it.dataset.i], bin = binEl(bi);
            if (t.b !== bi) {
              R.hint = () => { const c = binEl(t.b); if (c) { c.classList.add('hint'); A.later(() => c.classList.remove('hint'), 2200); } };
              R.wrong(bin, 'm_sort_no');
              select(null);
              return false;
            }
            it.classList.add('used'); select(null);
            if (root.gsap) gsap.set(it, { x: 0, y: 0 });
            bin.querySelector('.mt-got').insertAdjacentHTML('beforeend', `<span>${shp(t.k, t.c)}</span>`);
            A.sfx.snap && A.sfx.snap(); A.pop(bin); A.burst(bin, 8);
            if (--left === 0) R.right(R.chBox, null, { min: 1100 });
            return true;
          }
          R.scene.querySelectorAll('.mt-item').forEach(it => A.drag(it, {
            enabled: () => R.ready() && !it.classList.contains('used'),
            tap: () => { select(sel === it ? null : it); return false; },
            move: (x, y) => R.chBox.querySelectorAll('.mt-bin').forEach(b => b.classList.toggle('over', A.hit(b, x, y, 6))),
            drop: (x, y) => {
              R.chBox.querySelectorAll('.mt-bin').forEach(b => b.classList.remove('over'));
              const b = [...R.chBox.querySelectorAll('.mt-bin')].find(bb => A.hit(bb, x, y, 10));
              return b ? place(it, +b.dataset.b) : false;
            },
          }));
          // الصناديق تتعمل من جديد كل جولة، فالمستمع على كل صندوق (مش على الحاوية الثابتة)
          R.chBox.querySelectorAll('.mt-bin').forEach(b => A.on(b, 'click', () => { if (sel) place(sel, +b.dataset.b); }));
          R.solver = () => { const it = R.scene.querySelector('.mt-item:not(.used)'); if (it) place(it, items[+it.dataset.i].b); };
          R.ask([byCol ? 'm_sort_col' : 'm_sort_shape'].concat(r === 0 ? ['m_sort_tip'] : []));
        },
      });
    },
  };

  MATH.register({
    id: 'shapes', order: 2, name: 'الأشكال والأنماط', icon: '🔷', color: '#e8579a', voice: 'm_s_shapes', minAge: 3,
    rec: a => a <= 6, activities: [shapes, pattern, sort],
  });
})(window);

/* القسم ٣: الجمع والطرح (٥–٩ سنوات) — بالأشياء أولاً، ثم خط الأعداد، ثم الأرقام وحدها
   ٥ سنوات: حتى ٥، ٦–٧: حتى ١٠، ٨: حتى ٢٠، ٩: حتى ١٠٠ */
(function (root) {
  'use strict';
  const MATH = root.MATH, U = MATH.util;
  const big = v => `<b dir="ltr">${v}</b>`;
  const lim = a => (a <= 5 ? 5 : a <= 7 ? 10 : 20);

  /* ---------- اجمع الأشياء ---------- */
  const addobj = {
    id: 'addobj', name: 'اجمع الأشياء', icon: '➕', minAge: 5,
    mount(el, A) {
      const a = A.age, N = 5, max = lim(a), em = U.shuffle(MATH.OBJ);
      return A.game({
        rounds: N, cls: 'mt-g-add', intro: ['m_add_in'],
        round(r, R) {
          const x = U.rand(1, max - 1), y = U.rand(1, Math.max(1, max - x)), s = x + y;
          const onlyNums = R.last && a >= 6;
          const e = em[r % em.length];
          R.scene.innerHTML = (onlyNums ? '' : `<div class="mt-addrow" dir="ltr"><div class="mt-grp">${MATH.objs(x, e)}</div><i class="mt-op">+</i><div class="mt-grp">${MATH.objs(y, e)}</div></div>`) + U.eqHtml([x, '+', y, '=', '?'], onlyNums ? 'xl' : '');
          if (!onlyNums) {
            R.fit = () => R.scene.querySelectorAll('.mt-grp .mt-objs').forEach(g => A.fitGrid(g, g.children.length, 70, 18));
            MATH.tapCount(A, R, R.scene.querySelector('.mt-addrow'));
          }
          R.choices(U.near(s, a <= 5 ? 3 : 4, 1, max + 2, 2), s, { html: big, okSay: () => U.eqKeys(x, '+', y, s) });
          R.okAnim = () => {
            const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = s; q.classList.remove('q'); q.classList.add('ans'); }
            const gs = R.scene.querySelectorAll('.mt-grp'), op = R.scene.querySelector('.mt-op');
            if (root.gsap && gs.length === 2) { gsap.to(op, { scale: 0, duration: 0.3 }); gsap.to(gs[0], { x: 14, duration: 0.4 }); gsap.to(gs[1], { x: -14, duration: 0.4 }); }
          };
          R.ask(U.eqKeys(x, '+', y), { text: U.eqText(x, '+', y) });
        },
      });
    },
  };

  /* ---------- العصافير (الطرح) ---------- */
  const subobj = {
    id: 'subobj', name: 'العصافير', icon: '🐦', minAge: 5,
    mount(el, A) {
      const a = A.age, N = 5, max = lim(a);
      return A.game({
        rounds: N, cls: 'mt-g-sub', intro: ['m_sub_in'],
        round(r, R) {
          const t = U.rand(Math.min(3, max), max), g = U.rand(1, t - 1), s = t - g;
          const onlyNums = R.last && a >= 6;
          R.scene.innerHTML = (onlyNums ? '' : `<div class="mt-wire-box"><div class="mt-wire"></div>${MATH.objs(t, '🐦', 'birds')}</div>`) + U.eqHtml([t, '−', g, '=', '?'], onlyNums ? 'xl' : '');
          if (!onlyNums) {
            const box = R.scene.querySelector('.mt-objs');
            R.fit = () => A.fitGrid(box, t, 74, 20);
            const birds = [...box.children], fly = birds.slice(t - g);
            fly.forEach(b => b.classList.add('flyer'));
            // تطير بعد لحظة، وتترك مكانها فارغاً (عشان الطفل يشوف كم طار وكم بقي)
            A.later(() => {
              fly.forEach((b, i) => {
                b.classList.remove('mt-obj'); b.classList.add('mt-gone');
                b.innerHTML = '<span class="mt-ghost">🐦</span><span class="mt-fly">🐦</span>';
                const ghost = b.querySelector('.mt-fly');
                if (root.gsap) gsap.to(ghost, { x: (i % 2 ? 1 : -1) * U.rand(60, 140), y: -U.rand(160, 260), rotation: U.rand(-30, 30), opacity: 0, duration: 1.1, delay: i * 0.08, ease: 'power1.in' });
              });
              A.sfx.hop && A.sfx.hop();
            }, 700);
            MATH.tapCount(A, R, box);
          }
          R.choices(U.near(s, a <= 5 ? 3 : 4, 0, max, 2), s, { html: big, okSay: () => U.eqKeys(t, '−', g, s) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = s; q.classList.remove('q'); q.classList.add('ans'); } };
          R.ask(onlyNums ? U.eqKeys(t, '−', g) : U.eqKeys(t, '−', g).slice(0, -1).concat(['m_left']), { text: U.eqText(t, '−', g) });
        },
      });
    },
  };

  /* ---------- قفزات الضفدع (خط الأعداد) ---------- */
  const numline = {
    id: 'numline', name: 'قفزات الضفدع', icon: '🐸', minAge: 6,
    mount(el, A) {
      const a = A.age, N = 5, max = a <= 7 ? 10 : 20;
      return A.game({
        rounds: N, cls: 'mt-g-nl', intro: ['m_nl', 'm_nl_tip'],
        round(r, R) {
          const minus = R.last ? Math.random() < 0.5 : r >= 3;
          let x, y, s;
          do { x = U.rand(minus ? 3 : 0, minus ? max : max - 2); y = U.rand(1, Math.min(minus ? x : max - x, a <= 7 ? 5 : 8)); s = minus ? x - y : x + y; } while (y < 1);
          const lo = max === 10 ? 0 : Math.max(0, Math.min(10, Math.min(x, s) - U.rand(0, 2))), hi = lo + 10;
          const pct = v => ((v - lo) / 10) * 100;
          R.scene.innerHTML = `<div class="mt-nl"><div class="mt-nl-in" dir="ltr"><div class="mt-nl-line"></div>
              ${Array.from({ length: 11 }, (_, i) => `<span class="mt-tick ${lo + i === x ? 'from' : ''}" style="left:${i * 10}%"><b>${lo + i}</b></span>`).join('')}
              <span class="mt-frog" style="left:${pct(x)}%">🐸</span></div></div>
            <div class="mt-nl-ctl"><button class="mt-hop" aria-label="قفزة"><span>🐸</span><b>${minus ? '←' : '→'}</b><small dir="ltr" id="hc">0</small></button>
              <button class="mt-reset" aria-label="من جديد">↺</button></div>` + U.eqHtml([x, minus ? '−' : '+', y, '=', '?']);
          const frog = R.scene.querySelector('.mt-frog'), hc = R.scene.querySelector('#hc');
          let pos = x, hops = 0;
          const hopTo = v => {
            if (root.gsap) gsap.timeline().to(frog, { left: pct(v) + '%', duration: 0.32, ease: 'none' }, 0).to(frog, { y: -26, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.out' }, 0);
            else frog.style.left = pct(v) + '%';
          };
          A.on(R.scene.querySelector('.mt-hop'), 'click', e => {
            if (!R.ready()) return;
            const nv = pos + (minus ? -1 : 1);
            if (nv < lo || nv > hi) { A.sfx.bump && A.sfx.bump(); A.bad(e.currentTarget); return; }
            pos = nv; hops++; hc.textContent = hops; A.sfx.hop && A.sfx.hop(); hopTo(pos);
            A.say(A.num(hops), { pri: 'feedback', cut: true, cool: 150, noReplay: true, text: String(hops) });
          });
          A.on(R.scene.querySelector('.mt-reset'), 'click', () => { if (!R.ready()) return; pos = x; hops = 0; hc.textContent = 0; A.sfx.tap(); hopTo(x); });
          R.choices(U.near(s, 4, lo, hi, 3), s, { html: big, okSay: () => U.eqKeys(x, minus ? '−' : '+', y, s) });
          R.hint = () => { const b = R.scene.querySelector('.mt-hop'); b.classList.add('hint'); A.later(() => b.classList.remove('hint'), 2500); };
          R.okAnim = () => {
            const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = s; q.classList.remove('q'); q.classList.add('ans'); }
            const d = s > pos ? 1 : -1; let k = 0;
            const step = () => { if (pos === s || k++ > 25) { const t = R.scene.querySelectorAll('.mt-tick')[s - lo]; if (t) t.classList.add('to'); return; } pos += d; hopTo(pos); A.sfx.hop && A.sfx.hop(); A.later(step, 330); };
            step();
          };
          R.ask(U.eqKeys(x, minus ? '−' : '+', y), { text: U.eqText(x, minus ? '−' : '+', y) });
        },
      });
    },
  };

  /* ---------- مسائل بالأرقام ---------- */
  const addnum = {
    id: 'addnum', name: 'مسائل الأرقام', icon: '🧮', minAge: 6,
    mount(el, A) {
      const a = A.age, N = 6;
      function make(r, last) {
        const minus = r % 2 === 1;
        let x, y;
        if (a <= 5) { x = U.rand(1, 4); y = U.rand(1, 5 - x); }
        else if (a <= 6) { x = U.rand(1, 9); y = U.rand(1, 10 - x); }
        else if (a <= 7) { x = U.rand(3, 15); y = U.rand(1, 20 - x); }
        else if (a <= 8) {
          // عشرات مع عشرات، أو عدد من خانتين مع آحاد بدون حمل
          if (r < 2) { x = 10 * U.rand(1, 6); y = 10 * U.rand(1, 9 - x / 10); } else { x = 10 * U.rand(1, 8) + U.rand(0, 5); y = U.rand(1, 9 - (x % 10)); }
        } else { x = U.rand(15, 60); y = U.rand(8, 99 - x); }
        if (minus) { const s = x + y; return { x: s, y, op: '−', ans: x, miss: false }; }
        if (last && a >= 7) return { x, y, op: '+', ans: y, total: x + y, miss: true };
        return { x, y, op: '+', ans: x + y, miss: false };
      }
      return A.game({
        rounds: N, cls: 'mt-g-num',
        round(r, R) {
          const p = make(r, R.last);
          const sj = '<span class="mt-sj sm" id="sj"></span>';
          if (p.miss) R.scene.innerHTML = sj + U.eqHtml([p.x, '+', '?', '=', p.total], 'xl');
          else R.scene.innerHTML = sj + U.eqHtml([p.x, p.op, p.y, '=', '?'], 'xl');
          const s = A.sj1(R.scene.querySelector('#sj'));
          if (s) s.talk(1500);
          const big2 = p.ans >= 10;
          const set = new Set([p.ans]);
          (big2 ? [p.ans + 10, p.ans - 10, p.ans + 1, p.ans - 1] : [p.ans + 1, p.ans - 1, p.ans + 2, p.ans - 2]).forEach(v => { if (set.size < 4 && v >= 0) set.add(v); });
          R.choices(U.shuffle([...set]), p.ans, { html: big, okSay: () => (p.miss ? A.num(p.ans) : U.eqKeys(p.x, p.op, p.y, p.ans)) });
          R.okAnim = () => { const q = R.scene.querySelector('.mt-eq .q'); if (q) { q.textContent = p.ans; q.classList.remove('q'); q.classList.add('ans'); } if (s) s.jump(); };
          if (p.miss) R.ask(['m_miss'], { text: `${p.x} + ? = ${p.total}` });
          else R.ask(U.eqKeys(p.x, p.op, p.y), { text: U.eqText(p.x, p.op, p.y) });
        },
      });
    },
  };

  MATH.register({
    id: 'add', order: 3, name: 'الجمع والطرح', icon: '➕', color: '#16a865', voice: 'm_s_add', minAge: 5,
    rec: a => a >= 5, activities: [addobj, subobj, numline, addnum],
  });
})(window);

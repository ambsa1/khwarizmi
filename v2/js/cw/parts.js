/* القسم ٢: أجزاء الكمبيوتر — تعرّف بالضغط، ركّب الكمبيوتر وشغّله، ومن أنا؟ */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util, ART = CW.art;

  // مكان كل جزء على المكتب (شبكة ١٦٠×١٠٠): [المعرّف، الرسمة، س، ص، العرض]
  const DESK = [
    ['monitor', 'monitor', 52, 10, 56], ['camera', 'camera', 72, -3, 16], // فوق الشاشة شوية: ما تتداخل مع لمس الشاشة
    ['speaker', 'speaker', 31, 31, 15], ['speaker2', 'speaker', 114, 31, 15],
    ['tower', 'tower', 134, 21, 22], ['printer', 'printer', 2, 35, 26],
    ['keyboard', 'keyboard', 48, 69, 62], ['mouse', 'mouse', 116, 71, 12],
  ];
  const partOf = id => (id === 'speaker2' ? 'speaker' : id);
  const pos = (x, y, w) => `left:${(x / 160) * 100}%;top:${y}%;width:${(w / 160) * 100}%`;
  function deskHtml(cls, art) {
    return `<div class="cw-desk-wrap"><div class="cw-desk ${cls || ''}" id="desk"><div class="cw-desk-top"></div><div class="cw-wall-win"></div>
      ${DESK.map(([id, a, x, y, w]) => `<div class="cw-part" data-p="${id}" style="${pos(x, y, w)}">${art ? art(id, a) : ART[a]()}<span class="cw-tag"></span></div>`).join('')}
      </div></div>`;
  }

  /* ---------- تعرّف على الأجزاء ---------- */
  const learn = {
    id: 'learn', name: 'تعرّف على الأجزاء', icon: '👆', minAge: 3,
    mount(el, A) {
      const names = ['monitor', 'keyboard', 'mouse', 'tower', 'speaker', 'camera', 'printer'];
      el.innerHTML = `<div class="cw-learn">${deskHtml('learn')}
        <div class="cw-chips">${names.map(n => `<span class="cw-chip" data-n="${n}"><span class="cw-art xs">${ART[n]()}</span></span>`).join('')}</div></div>`;
      const desk = el.querySelector('#desk');
      const fit = () => U.fit(desk, 1.6);
      fit(); A.onResize(fit);
      const got = new Set();
      let done = false;
      function tapPart(p) {
        const id = partOf(p.dataset.p);
        el.querySelectorAll('.cw-part.on').forEach(x => x.classList.remove('on'));
        el.querySelectorAll(`.cw-part[data-p^="${id}"]`).forEach(x => { x.classList.add('on'); x.querySelector('.cw-tag').textContent = A.text('cw_p_' + id); });
        if (root.gsap) gsap.fromTo(p, { y: 0 }, { y: -10, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
        A.sfx.tap();
        const chip = el.querySelector(`.cw-chip[data-n="${id}"]`);
        if (!got.has(id)) { got.add(id); chip.classList.add('on'); A.burst(chip, 12); }
        A.say(['cw_p_' + id, 'cw_pd_' + id], { force: true, pri: 'instruction' }); // الطفل ضغط عشان يسمع: الدرس نفسه
        if (got.size === names.length && !done) { done = true; A.later(() => A.win({ stars: 3 }), 3200); }
      }
      A.on(el, 'click', e => { const p = e.target.closest('.cw-part'); if (p) tapPart(p); });
      A.later(() => A.say('cw_learn'), 250);
      return {
        async solve() { for (const n of names) { tapPart(el.querySelector(`.cw-part[data-p="${n}"]`)); await A.wait(120); } },
      };
    },
  };

  /* ---------- ركّب الكمبيوتر ---------- */
  const build = {
    id: 'build', name: 'ركّب الكمبيوتر', icon: '🔧', minAge: 3,
    mount(el, A) {
      const ids = DESK.map(d => d[0]);
      const trayIds = U.shuffle(ids);
      const artFor = id => ART[DESK.find(d => d[0] === id)[1]]();
      el.innerHTML = `<div class="cw-build">${deskHtml('ghost', (id, a) => ART[a](a === 'monitor' ? 'off' : undefined))}
        <div class="cw-tray">${trayIds.map(id => `<div class="cw-titem" data-p="${id}"><span class="cw-art sm">${artFor(id)}</span></div>`).join('')}</div></div>`;
      const desk = el.querySelector('#desk');
      const fit = () => U.fit(desk, 1.6);
      fit(); A.onResize(fit);
      el.querySelectorAll('.cw-part').forEach(p => p.classList.add('empty'));
      const placed = new Set();
      let sel = null, phase = 'build';
      const tapPlaces = A.age <= 5; // الصغار: ضغطة وتطير القطعة لمكانها
      const slot = id => el.querySelector(`.cw-part[data-p="${id}"]`);
      function place(id, item) {
        placed.add(id);
        const s = slot(id);
        s.classList.remove('empty');
        item.classList.add('used');
        if (root.gsap) gsap.fromTo(s, { scale: 1.35 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
        A.sfx.snap(); A.burst(s, 10);
        A.say('cw_p_' + partOf(id), { quiet: placed.size < ids.length });
        sel = null;
        if (placed.size === ids.length) A.later(ready, 900);
      }
      // السمّاعتان متشابهتان: لو القطعة راحت لمكان أختها، نبدّل المكانين
      function retarget(item, tid) {
        const old = item.dataset.p; if (old === tid) return;
        const other = el.querySelector(`.cw-titem[data-p="${tid}"]`);
        if (other) other.dataset.p = old;
        item.dataset.p = tid;
      }
      function select(item) {
        el.querySelectorAll('.cw-titem.sel').forEach(x => x.classList.remove('sel'));
        sel = item; item.classList.add('sel');
        A.sfx.tap(); A.say('cw_p_' + partOf(item.dataset.p), { quiet: true });
      }
      el.querySelectorAll('.cw-titem').forEach(item => {
        const id = item.dataset.p;
        A.drag(item, {
          enabled: () => phase === 'build' && !item.classList.contains('used'),
          tap() { if (tapPlaces) place(item.dataset.p, item); else select(item); return false; },
          drop(x, y) {
            const target = [...el.querySelectorAll('.cw-part.empty')].find(s => A.hit(s, x, y, 14));
            if (!target) return false;
            const same = partOf(target.dataset.p) === partOf(id);
            if (!same) { A.bad(target, 'cw_try'); return false; }
            // السمّاعتان متشابهتان: أي سمّاعة في أي مكان سمّاعة
            const tid = target.dataset.p;
            retarget(item, tid);
            if (root.gsap) gsap.set(item, { x: 0, y: 0 });
            place(tid, item);
            return true;
          },
        });
      });
      A.on(el, 'click', e => {
        const s = e.target.closest('.cw-part.empty');
        if (s && sel && phase === 'build') {
          if (partOf(s.dataset.p) === partOf(sel.dataset.p)) { const it = sel; retarget(it, s.dataset.p); place(s.dataset.p, it); } else A.bad(s, 'cw_try');
        }
        const t = e.target.closest('.cw-part[data-p="tower"]');
        if (t && phase === 'ready') powerOn();
      });
      function ready() {
        phase = 'ready';
        el.querySelector('.cw-tray').classList.add('gone');
        slot('tower').classList.add('cw-pulse-pwr');
        A.say('cw_power');
      }
      function powerOn() {
        phase = 'on';
        slot('tower').classList.remove('cw-pulse-pwr');
        slot('tower').innerHTML = ART.tower(true) + '<span class="cw-tag"></span>';
        A.sfx.light();
        const mon = slot('monitor');
        mon.insertAdjacentHTML('beforeend', `<div class="cw-boot"><div class="cw-boot-sj">${A.sirajSvg()}</div><div class="cw-boot-bar"><i></i></div></div>`);
        const boot = mon.querySelector('.cw-boot');
        if (root.gsap) {
          gsap.timeline()
            .fromTo(boot, { opacity: 0 }, { opacity: 1, duration: 0.5 })
            .fromTo(boot.querySelector('.cw-boot-bar i'), { width: '0%' }, { width: '100%', duration: 1.4, ease: 'power1.inOut' })
            .to(boot.querySelector('.cw-boot-bar'), { opacity: 0, duration: 0.2 })
            .fromTo(boot.querySelector('.cw-boot-sj'), { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)' });
          gsap.to(el.querySelectorAll('.cw-part[data-p^="speaker"]'), { scale: 1.08, duration: 0.18, yoyo: true, repeat: 7, delay: 2 });
        }
        el.querySelector('#desk').classList.add('lit');
        A.later(() => { A.sfx.spark(); A.say('cw_boot'); }, 2100);
        A.later(() => A.win({ stars: 3 }), 4300);
      }
      A.later(() => A.say(tapPlaces ? 'cw_build_tap' : 'cw_build'), 250);
      return {
        async solve() {
          for (const it of [...el.querySelectorAll('.cw-titem')]) { if (!it.classList.contains('used')) place(it.dataset.p, it); await A.wait(60); }
          await A.wait(1100);
          slot('tower').click();
        },
      };
    },
  };

  /* ---------- من أنا؟ ---------- */
  const RIDDLES = ['monitor', 'keyboard', 'mouse', 'speaker', 'printer', 'camera', 'mic', 'tower'];
  const riddle = {
    id: 'riddle', name: 'من أنا؟', icon: '❓', minAge: 4,
    mount(el, A) {
      const list = U.shuffle(RIDDLES).slice(0, A.age <= 5 ? 4 : 6);
      el.innerHTML = `<div class="cw-rid"><div class="cw-dots" id="d"></div>
        <div class="cw-rid-q"><div class="cw-rid-sj" id="sj"></div><div class="cw-rid-b"><b>❓</b><p id="qt"></p></div></div>
        <div class="cw-opts" id="op"></div></div>`;
      const q = s => el.querySelector(s);
      const sj = A.siraj(q('#sj'));
      const setDot = A.dots(q('#d'), list.length);
      let i = 0, miss = 0, busy = false;
      function show() {
        const ans = list[i];
        const opts = U.shuffle([ans].concat(U.shuffle(RIDDLES.filter(r => r !== ans)).slice(0, 2)));
        setDot(i);
        q('#qt').textContent = A.text('cw_rd_' + ans);
        q('#op').innerHTML = opts.map(o => `<button class="cw-opt" data-o="${o}"><span class="cw-art md">${ART[o]()}</span></button>`).join('');
        if (root.gsap) gsap.from(q('#op').children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'back.out(2)' });
        A.say('cw_rd_' + ans);
        if (sj) sj.talk(1600);
        busy = false;
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('.cw-opt'); if (!b || busy) return;
        if (b.dataset.o !== list[i]) { miss++; A.bad(b, 'cw_try'); return; }
        busy = true;
        b.classList.add('ok');
        A.good(b, 'cw_p_' + list[i]);
        if (sj) sj.jump();
        A.later(() => { i++; if (i < list.length) show(); else { setDot(list.length); A.win({ stars: miss <= 1 ? 3 : miss <= 3 ? 2 : 1 }); } }, 1500);
      });
      A.later(show, 250);
      return { async solve() { while (A.alive && i < list.length) { if (!busy) q(`.cw-opt[data-o="${list[i]}"]`).click(); await A.wait(1600); } } };
    },
  };

  CW.register({
    id: 'parts', order: 2, name: 'أجزاء الكمبيوتر', icon: '🖱️', color: '#2b78c2', voice: 'cw_s_parts', minAge: 3,
    rec: a => a <= 7, activities: [learn, build, riddle],
  });
})(window);

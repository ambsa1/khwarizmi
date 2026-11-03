/* القسم ٣: أيادٍ صغيرة (٣–٥ سنوات) — مهارات اللمس والفأرة: البالونات، أطعم الحيوان، ارسم الطريق، أين النجمة؟
   لا يوجد فشل هنا: كل محاولة تُكمل اللعب */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util;
  const COLORS = ['#f0533f', '#ff9a2e', '#ffc531', '#22b573', '#3d8bff', '#8b5cf6', '#e8579a', '#14b8c4'];

  /* ---------- فرقع البالونات ---------- */
  const balloons = {
    id: 'balloons', name: 'فرقع البالونات', icon: '🎈', minAge: 3,
    mount(el, A) {
      const GOAL = A.age <= 3 ? 10 : 14;
      el.innerHTML = `<div class="cw-sky-play" id="area"><div class="cw-count" id="cnt"></div></div>`;
      const area = el.querySelector('#area'), cnt = el.querySelector('#cnt');
      let popped = 0, list = [], spawnT = 0, done = false;
      const level = () => popped / GOAL; // يصغر البالون ويسرع شيئاً فشيئاً
      const showCount = () => { cnt.innerHTML = `🎈 <b>${popped}</b> / ${GOAL}`; };
      showCount();
      function spawn() {
        const W = area.clientWidth, H = area.clientHeight;
        const size = Math.max(54, Math.min(W, H) * (0.3 - 0.15 * level()));
        const b = document.createElement('button');
        b.className = 'cw-balloon';
        b.setAttribute('aria-label', 'بالون');
        const c = U.pick(COLORS);
        b.innerHTML = `<svg viewBox="0 0 60 84"><path d="M30 60 Q26 72 32 84" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" fill="none"/>
          <ellipse cx="30" cy="30" rx="26" ry="30" fill="${c}"/><path d="M26 60 L34 60 L30 54 Z" fill="${c}"/>
          <ellipse cx="20" cy="18" rx="6" ry="9" fill="#fff" opacity=".45" transform="rotate(-20 20 18)"/></svg>`;
        b.style.width = size + 'px'; b.style.height = size * 1.4 + 'px';
        const o = { el: b, x: Math.random() * Math.max(10, W - size), y: H + 10, size, vy: (H + size * 1.6) / ((A.age <= 3 ? 8000 : 7000) - 3000 * level()), ph: Math.random() * 6, drift: 0.3 + level() * 1.2, c };
        list.push(o);
        b.style.transform = `translate(${o.x}px, ${o.y}px)`;
        area.appendChild(b);
        A.on(b, 'pointerdown', e => { e.preventDefault(); pop(o); });
      }
      function pop(o) {
        if (o.dead || done) return;
        o.dead = true;
        popped++; showCount();
        A.sfx.snap(); A.burst(o.el, 16, [o.c, '#fff', '#ffd23e']);
        o.el.classList.add('pop');
        A.later(() => o.el.remove(), 250);
        if (popped === 1) A.say('cw_bal_good');
        if (popped >= GOAL) { done = true; A.later(() => A.win({ stars: 3 }), 600); }
      }
      A.loop(dt => {
        spawnT -= dt;
        const H = area.clientHeight;
        if (!done && spawnT <= 0 && list.filter(o => !o.dead).length < (A.age <= 3 ? 3 : 4)) { spawn(); spawnT = 900 - 300 * level(); }
        for (const o of list) {
          if (o.dead) continue;
          o.y -= o.vy * dt;
          o.ph += dt / 600;
          const x = o.x + Math.sin(o.ph) * 14 * o.drift;
          o.el.style.transform = `translate(${x}px, ${o.y}px)`;
          if (o.y < -o.size * 1.5) { o.dead = true; o.el.remove(); }
        }
        list = list.filter(o => !o.dead || o.el.isConnected);
        return !done || list.some(o => !o.dead);
      });
      A.later(() => A.say('cw_bal'), 250);
      return { async solve() { while (A.alive && !done) { const o = list.find(x => !x.dead); if (o) pop(o); await A.wait(60); } } };
    },
  };

  /* ---------- أطعم الحيوان ---------- */
  const ANIMALS = [['🐰', '🥕'], ['🐵', '🍌'], ['🐱', '🐟'], ['🐶', '🦴'], ['🐼', '🎋'], ['🐭', '🧀']];
  const feed = {
    id: 'feed', name: 'أطعم الحيوان', icon: '🥕', minAge: 3,
    mount(el, A) {
      const rounds = U.shuffle(ANIMALS).slice(0, 4);
      el.innerHTML = `<div class="cw-feed"><div class="cw-dots" id="d"></div>
        <div class="cw-feed-row"><div class="cw-animal" id="an"></div><div class="cw-foods" id="fd"></div></div>
        <div class="cw-hand" id="hand">👆</div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), rounds.length);
      let r = 0, busy = false, taps = 0;
      function show() {
        setDot(r); busy = false; taps = 0;
        const [an, food] = rounds[r];
        const others = U.shuffle(ANIMALS.filter(x => x[1] !== food)).slice(0, A.age <= 3 ? 1 : 2).map(x => x[1]);
        q('#an').innerHTML = `<span class="cw-emo">${an}</span><span class="cw-mouth"></span>`;
        q('#fd').innerHTML = U.shuffle([food].concat(others)).map(f => `<div class="cw-food" data-f="${f}">${f}</div>`).join('');
        if (root.gsap) { gsap.from(q('#an'), { scale: 0, duration: 0.5, ease: 'back.out(2)' }); gsap.from(q('#fd').children, { scale: 0, stagger: 0.1, duration: 0.4, ease: 'back.out(2)', delay: 0.2 }); }
        q('#fd').querySelectorAll('.cw-food').forEach(f => A.drag(f, {
          enabled: () => !busy,
          tap() { taps++; hint(f); return false; },
          drop(x, y) { if (!A.hit(q('#an'), x, y, 30)) return false; return eat(f); },
        }));
        A.say(r === 0 ? 'cw_feed' : 'cw_feed_more');
      }
      function hint(f) {
        A.say('cw_feed_drag', { pri: 'feedback' });
        const h = q('#hand'), fr = f.getBoundingClientRect(), ar = q('#an').getBoundingClientRect(), base = el.getBoundingClientRect();
        if (!root.gsap) return;
        gsap.killTweensOf(h);
        gsap.timeline()
          .set(h, { opacity: 1, x: fr.left - base.left + fr.width / 2, y: fr.top - base.top + fr.height / 2 })
          .to(h, { x: ar.left - base.left + ar.width / 2, y: ar.top - base.top + ar.height / 2, duration: 1.1, ease: 'power1.inOut' })
          .to(h, { opacity: 0, duration: 0.3 });
      }
      function eat(f) {
        const [, food] = rounds[r];
        if (f.dataset.f !== food) {
          A.bad(q('#an'), 'cw_feed_no');
          return false;
        }
        busy = true;
        if (root.gsap) gsap.to(f, { scale: 0, opacity: 0, duration: 0.3 });
        q('#an').classList.add('eat');
        A.sfx.hop(); A.burst(q('#an'), 20, ['#ff6b9a', '#ffd23e', '#fff']);
        A.say('cw_yum');
        A.later(() => { q('#an').classList.remove('eat'); r++; if (r < rounds.length) show(); else { setDot(rounds.length); A.win({ stars: 3 }); } }, 1600);
        return true;
      }
      A.later(show, 250);
      return { async solve() { while (A.alive && r < rounds.length) { if (!busy) eat(q(`.cw-food[data-f="${rounds[r][1]}"]`)); await A.wait(1700); } } };
    },
  };

  /* ---------- ارسم الطريق ---------- */
  const PATHS = [
    'M40 200 C120 200 160 60 240 80 S340 180 370 60',
    'M40 60 C120 60 120 200 200 200 S280 60 370 200',
    'M40 220 L120 60 L200 200 L280 50 L370 190',
  ];
  const trace = {
    id: 'trace', name: 'ارسم الطريق', icon: '🚗', minAge: 3,
    mount(el, A) {
      const rounds = A.age <= 3 ? PATHS.slice(0, 2) : PATHS;
      el.innerHTML = `<div class="cw-trace"><div class="cw-dots" id="d"></div><div class="cw-trace-box"><svg id="sv" viewBox="0 0 410 260" preserveAspectRatio="xMidYMid meet"></svg></div></div>`;
      const q = s => el.querySelector(s), sv = q('#sv');
      const setDot = A.dots(q('#d'), rounds.length);
      let r = 0, pts = [], cur = 0, dragging = false, done = false, car, trail, len = 0;
      const TOL = A.age <= 3 ? 46 : 36;
      function show() {
        setDot(r); cur = 0; done = false;
        const d = rounds[r];
        sv.innerHTML = `<path d="${d}" fill="none" stroke="#c9b48a" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#8d7a55" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="12 12" stroke-linecap="round" opacity=".8"/>
          <path id="tr" d="${d}" fill="none" stroke="#ffd23e" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
          <g id="end"><circle r="30" fill="#fff" opacity=".35"/><text text-anchor="middle" dy="14" font-size="42">🏠</text></g>
          <g id="car" class="cw-car"><circle r="34" fill="#fff" opacity=".001"/><circle r="27" fill="#3d8bff" stroke="#fff" stroke-width="4"/><text text-anchor="middle" dy="10" font-size="28">🚗</text></g>`;
        const p = sv.querySelector('path');
        len = p.getTotalLength();
        pts = [];
        for (let s = 0; s <= len; s += 4) { const pt = p.getPointAtLength(s); pts.push([pt.x, pt.y]); }
        trail = q('#tr'); car = q('#car');
        trail.style.strokeDasharray = len; trail.style.strokeDashoffset = len;
        const e = pts[pts.length - 1]; q('#end').setAttribute('transform', `translate(${e[0]},${e[1]})`);
        place();
        if (root.gsap) gsap.from(car, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' });
        A.say(r === 0 ? 'cw_trace' : 'cw_trace_more');
      }
      function place() {
        const p = pts[cur];
        car.setAttribute('transform', `translate(${p[0]},${p[1]})`);
        trail.style.strokeDashoffset = len - (cur / (pts.length - 1)) * len;
      }
      const toSvg = (x, y) => { const m = sv.getScreenCTM(); if (!m) return [x, y]; const pt = sv.createSVGPoint(); pt.x = x; pt.y = y; const r2 = pt.matrixTransform(m.inverse()); return [r2.x, r2.y]; };
      function follow(x, y) {
        const [sx, sy] = toSvg(x, y);
        let best = -1, bd = TOL * TOL;
        for (let i = cur; i < Math.min(pts.length, cur + 30); i++) { const dx = pts[i][0] - sx, dy = pts[i][1] - sy, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
        if (best > cur) { cur = best; place(); if (cur % 6 === 0) A.sfx.pen(); }
        if (cur >= pts.length - 2) finish();
      }
      function finish() {
        if (done) return; done = true; dragging = false;
        A.good(q('#end'), 'cw_trace_ok');
        A.later(() => { r++; if (r < rounds.length) show(); else { setDot(rounds.length); A.win({ stars: 3 }); } }, 1500);
      }
      A.on(sv, 'pointerdown', e => {
        if (done) return;
        const [sx, sy] = toSvg(e.clientX, e.clientY), p = pts[cur];
        if (Math.hypot(sx - p[0], sy - p[1]) < 60) { dragging = true; try { sv.setPointerCapture(e.pointerId); } catch (er) { /* لا شيء */ } e.preventDefault(); }
        else A.say('cw_trace_car', { pri: 'feedback' });
      });
      A.on(sv, 'pointermove', e => { if (dragging) follow(e.clientX, e.clientY); });
      A.on(sv, 'pointerup', () => { dragging = false; });
      A.on(sv, 'pointercancel', () => { dragging = false; });
      A.later(show, 250);
      return {
        async solve() {
          while (A.alive && r < rounds.length) {
            if (!done) { cur = pts.length - 1; place(); finish(); }
            await A.wait(1600);
          }
        },
      };
    },
  };

  /* ---------- أين النجمة؟ ---------- */
  const COVERS = ['🌳', '🎁', '☁️', '🧺', '🌷', '🏠'];
  const star = {
    id: 'star', name: 'أين النجمة؟', icon: '⭐', minAge: 3,
    mount(el, A) {
      const n = A.age <= 3 ? 4 : 6, ROUNDS = 5;
      el.innerHTML = `<div class="cw-hide"><div class="cw-dots" id="d"></div><div class="cw-hide-grid n${n}" id="g"></div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), ROUNDS);
      let r = 0, at = 0, busy = false;
      function show() {
        setDot(r); busy = false;
        at = U.rand(0, n - 1);
        const covers = U.shuffle(COVERS).slice(0, n);
        q('#g').innerHTML = covers.map((c, i) => `<button class="cw-spot" data-i="${i}"><span class="cw-under">${i === at ? '⭐' : ''}</span><span class="cw-cover">${c}</span></button>`).join('');
        if (root.gsap) gsap.from(q('#g').children, { scale: 0, stagger: 0.06, duration: 0.4, ease: 'back.out(2)' });
        A.say(r === 0 ? 'cw_star' : 'cw_star_more');
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('.cw-spot'); if (!b || busy || b.classList.contains('open')) return;
        b.classList.add('open');
        A.sfx.hop();
        if (+b.dataset.i === at) {
          busy = true;
          A.good(b, 'cw_star_yes');
          A.later(() => { r++; if (r < ROUNDS) show(); else { setDot(ROUNDS); A.win({ stars: 3 }); } }, 1500);
        } else {
          A.say('cw_star_no', { pri: 'feedback' });
          A.later(() => b.classList.remove('open'), 1100);
        }
      });
      A.later(show, 250);
      return { async solve() { while (A.alive && r < ROUNDS) { if (!busy) q(`.cw-spot[data-i="${at}"]`).click(); await A.wait(1600); } } };
    },
  };

  CW.register({
    id: 'hands', order: 3, name: 'أيادٍ صغيرة', icon: '✋', color: '#e8579a', voice: 'cw_s_hands', minAge: 3,
    rec: a => a <= 5, activities: [balloons, feed, trace, star],
  });
})(window);

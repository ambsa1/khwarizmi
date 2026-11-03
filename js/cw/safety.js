/* القسم ٥: الأمان في الإنترنت — سبع قواعد في مواقف قصيرة، أشارك أم أحتفظ؟، فخّ النوافذ، وصانع كلمة السر.
   الفكرة مستوحاة من برنامج Be Internet Awesome (رخصة CC BY 4.0) بصياغتنا الخاصة. */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util;

  /* ---------- مواقف وقواعد ---------- */
  const SCEN = [
    { b: '🤫', scene: `<div class="cw-dev-h">🎮 لعبة</div><div class="cw-msg in">أين تسكن؟ 🏠</div>`, opts: [['🙅', 1], ['✍️', 0]] },
    { b: '🔑', scene: `<div class="cw-big-emo">🔐</div>`, opts: [['1234', 0, 1], ['قمر*أخضر7يقفز', 1, 1]] },
    { b: '🤔', scene: `<div class="cw-dev-h">▶ فيديو</div><div class="cw-video">🐱🚀<small>القطط تطير!</small></div>`, opts: [['🙋', 1], ['📢', 0]] },
    { b: '✉️', scene: `<div class="cw-dev-h">✉️ رسالة</div><div class="cw-msg in">👤❓ اضغط هنا 🔗</div>`, opts: [['🚫', 1], ['👆', 0]] },
    { b: '👾', scene: `<div class="cw-dev-h">🎮 دردشة اللعبة</div><div class="cw-msg in">👾 لنلتقِ في الحديقة!</div>`, opts: [['👨‍👩‍👧', 1], ['🚶', 0]] },
    { b: '💛', scene: `<div class="cw-dev-h">🎮 لعبة</div><div class="cw-big-emo">😢</div><div class="cw-msg in">خسرت…</div>`, opts: [['💛', 1], ['😝', 0]] },
    { b: '🙈', scene: `<div class="cw-dev-h">▶ فيديو</div><div class="cw-video scary">👻</div>`, opts: [['📴', 1], ['👀', 0]] },
  ];
  const rules = {
    id: 'rules', name: 'سبع قواعد للأمان', icon: '🛡️', minAge: 5,
    mount(el, A) {
      el.innerHTML = `<div class="cw-scen"><div class="cw-badges" id="bg">${SCEN.map(s => `<span class="cw-badge">${s.b}</span>`).join('')}</div>
        <div class="cw-scen-main"><div class="cw-device" id="dv"></div><div class="cw-sopts" id="op"></div></div></div>`;
      const q = s => el.querySelector(s);
      let i = 0, miss = 0, busy = false;
      function show() {
        busy = false;
        const s = SCEN[i], n = i + 1;
        q('#dv').innerHTML = s.scene;
        const opts = U.shuffle(s.opts.map((o, k) => ({ o, k })));
        q('#op').innerHTML = opts.map(({ o, k }) => `<button class="cw-sopt" data-ok="${o[1]}" data-k="${k}">
          ${o[2] ? `<b class="cw-pw-show" dir="ltr">${U.esc(o[0])}</b>` : `<span class="cw-sopt-i">${o[0]}</span>`}<span class="cw-sopt-t">${U.esc(A.text(`cw_sf${n}_${'ab'[k]}`))}</span></button>`).join('');
        q('#bg').children[i].classList.add('cur');
        if (root.gsap) { gsap.from(q('#dv'), { scale: 0.7, opacity: 0, duration: 0.45, ease: 'back.out(2)' }); gsap.from(q('#op').children, { x: 40, opacity: 0, stagger: 0.12, duration: 0.4, delay: 0.2 }); }
        A.say([`cw_sf${n}`].concat(opts.map(({ k }) => `cw_sf${n}_${'ab'[k]}`)), { show: 1 });
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('.cw-sopt'); if (!b || busy) return;
        if (b.dataset.ok !== '1') { miss++; A.bad(b, 'cw_sf_think'); b.classList.add('no'); return; }
        busy = true;
        b.classList.add('yes');
        const badge = q('#bg').children[i];
        badge.classList.remove('cur'); badge.classList.add('on');
        A.good(badge);
        A.say(['cw_sf_safe', 'cw_rule' + (i + 1)], { pri: 'feedback' });
        // الموقف التالي بعد ما سراج يخلّص القاعدة (ما نقطعها)
        A.afterVoice(() => { i++; if (i < SCEN.length) show(); else A.win({ stars: miss <= 1 ? 3 : miss <= 3 ? 2 : 1, say: 'cw_sf_end' }); }, 1500, 10000);
      });
      A.later(show, 250);
      return { async solve() { while (A.alive && i < SCEN.length) { if (!busy) q('.cw-sopt[data-ok="1"]').click(); await A.wait(3900); } } };
    },
  };

  /* ---------- أشارك أم أحتفظ؟ ---------- */
  const CARDS = [['color', '🎨', 1], ['animal', '🐱', 1], ['drawing', '🖼️', 1], ['game', '⚽', 1],
    ['password', '🔑', 0], ['address', '🏠', 0], ['phone', '📞', 0], ['school', '🏫', 0]];
  const share = {
    id: 'share', name: 'أشارك أم أحتفظ؟', icon: '🔒', minAge: 5,
    mount(el, A) {
      const k = A.age <= 6 ? 3 : 4;
      const list = U.shuffle(U.shuffle(CARDS.filter(c => c[2])).slice(0, k).concat(U.shuffle(CARDS.filter(c => !c[2])).slice(0, k)));
      el.innerHTML = `<div class="cw-share"><div class="cw-dots" id="d"></div>
        <div class="cw-share-row"><button class="cw-side share" data-s="1"><span>📢</span><b>أشارك</b></button>
          <div class="cw-card cw-share-card" id="cd"></div>
          <button class="cw-side keep" data-s="0"><span>🔒</span><b>سرّي</b></button></div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), list.length);
      let i = 0, miss = 0, busy = false;
      function show() {
        busy = false; setDot(i);
        const [id, ic] = list[i];
        q('#cd').innerHTML = `<span class="cw-emo">${ic}</span><small>${U.esc(A.text('cw_sk_' + id))}</small>`;
        if (root.gsap) gsap.fromTo(q('#cd'), { y: -40, opacity: 0, x: 0, rotation: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' });
        A.say(i === 0 ? ['cw_sk_' + id, 'cw_sk'] : ['cw_sk_' + id]);
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('.cw-side'); if (!b || busy) return;
        const it = list[i], v = +b.dataset.s;
        if (v !== it[2]) { miss++; A.bad(b, it[2] ? 'cw_sk_no_share' : 'cw_sk_no_keep'); return; }
        busy = true;
        A.good(b, it[2] ? 'cw_sk_ok_share' : 'cw_sk_ok_keep');
        const r = b.getBoundingClientRect(), c = q('#cd').getBoundingClientRect();
        if (root.gsap) gsap.to(q('#cd'), { x: r.left + r.width / 2 - (c.left + c.width / 2), rotation: v ? -15 : 15, scale: 0.4, opacity: 0, duration: 0.5, ease: 'power2.in' });
        A.afterVoice(() => { i++; if (i < list.length) show(); else { setDot(list.length); A.win({ stars: miss <= 1 ? 3 : miss <= 3 ? 2 : 1 }); } }, 1200, 7000);
      });
      A.later(show, 250);
      return { async solve() { while (A.alive && i < list.length) { if (!busy) q(`.cw-side[data-s="${list[i][2]}"]`).click(); await A.wait(2300); } } };
    },
  };

  /* ---------- فخّ النوافذ المنبثقة ---------- */
  const POPS = [['🎁', 'فزت بجائزة!', 'اضغط هنا'], ['⚠️', 'جهازك فيه فيروس!', 'نظّف الآن'], ['🎮', 'لعبة مجانية!', 'حمّل الآن'], ['💎', 'جواهر مجانية!', 'خذها'], ['🏆', 'أنت الفائز!', 'استلم']];
  const popup = {
    id: 'popup', name: 'فخّ النوافذ', icon: '⚠️', minAge: 5,
    mount(el, A) {
      const N = A.age <= 6 ? 4 : 5;
      el.innerHTML = `<div class="cw-pop"><div class="cw-tab"><div class="cw-tab-scr" id="scr"><div class="cw-tab-h"><span>⭐ <b id="sc">0</b></span><span>❎ <b id="pc">0</b>/${N}</span></div></div></div></div>`;
      const q = s => el.querySelector(s), scr = q('#scr');
      let score = 0, closed = 0, traps = 0, popOpen = false, shown = 0, over = false;
      const order = U.shuffle(POPS);
      function star() {
        if (over) return;
        const s = document.createElement('button');
        s.className = 'cw-gstar'; s.textContent = '⭐'; s.setAttribute('aria-label', 'نجمة');
        s.style.left = U.rand(8, 80) + '%'; s.style.top = U.rand(18, 78) + '%';
        scr.appendChild(s);
        if (root.gsap) gsap.from(s, { scale: 0, duration: 0.3, ease: 'back.out(3)' });
        A.later(() => { if (s.isConnected) s.remove(); }, 2600);
      }
      function openPop() {
        if (over || popOpen) return;
        popOpen = true;
        const [ic, t, bt] = order[shown % order.length]; shown++;
        const side = Math.random() < 0.5 ? 'l' : 'r';
        const p = document.createElement('div');
        p.className = 'cw-popw ' + (A.age <= 6 ? 'big ' : '') + 'x' + side;
        p.innerHTML = `<button class="cw-popx" data-x="close" aria-label="إغلاق">✕</button><div class="cw-pop-ic">${ic}</div><b>${t}</b>
          <button class="cw-bait" data-x="bait">${bt} 👉</button>`;
        scr.appendChild(p);
        if (root.gsap) gsap.from(p, { scale: 0.3, opacity: 0, duration: 0.35, ease: 'back.out(2)' });
        A.say(shown === 1 ? 'cw_pop_close' : 'cw_pop_again');
      }
      A.on(scr, 'click', e => {
        const s = e.target.closest('.cw-gstar');
        if (s && !popOpen) { score++; q('#sc').textContent = score; A.sfx.spark(); A.burst(s, 10); s.remove(); return; }
        const x = e.target.closest('[data-x]'); if (!x) return;
        const p = x.closest('.cw-popw');
        if (x.dataset.x === 'bait') { traps++; A.bad(p, 'cw_pop_trap'); return; }
        closed++; q('#pc').textContent = closed;
        A.sfx.snap(); A.burst(x, 12);
        if (root.gsap) gsap.to(p, { scale: 0, opacity: 0, duration: 0.25, onComplete: () => p.remove() }); else p.remove();
        popOpen = false;
        if (closed >= N) { over = true; A.later(() => A.win({ stars: traps === 0 ? 3 : traps <= 2 ? 2 : 1, say: 'cw_pop_end' }), 600); }
        else { A.praise(['cw_good1', 'cw_good2', 'cw_good3']); A.later(openPop, U.rand(1800, 3000)); }
      });
      A.every(() => { if (!popOpen) star(); }, 900);
      A.later(() => A.say('cw_pop'), 250);
      A.later(openPop, 3200);
      return { async solve() { while (A.alive && !over) { const x = scr.querySelector('.cw-popx'); if (x) x.click(); await A.wait(400); } }, openPop };
    },
  };

  /* ---------- صانع كلمة السر ---------- */
  const TILES = [
    ['قمر', 'w'], ['أسد', 'w'], ['بحر', 'w'], ['نجمة', 'w'], ['جبل', 'w'], ['موز', 'w'],
    ['7', 'd'], ['3', 'd'], ['9', 'd'], ['5', 'd'],
    ['!', 's'], ['#', 's'], ['@', 's'], ['_', 's'], ['*', 's'],
    ['اسمي', 'name'], ['1234', 'easy'],
  ];
  const password = {
    id: 'password', name: 'صانع كلمة السر', icon: '🔑', minAge: 8,
    mount(el, A) {
      el.innerHTML = `<div class="cw-pw">
        <div class="cw-pw-box"><div class="cw-pw-field" id="pf" dir="ltr"></div><button class="sq" data-x="del" aria-label="امسح">⌫</button></div>
        <div class="cw-meter"><i id="mt"></i><span id="ml"></span></div>
        <div class="cw-tiles" id="tl">${TILES.map((t, i) => `<button class="cw-tile k-${t[1]}" data-i="${i}">${U.esc(t[0])}</button>`).join('')}</div>
        <button class="run cw-pw-ok" data-x="ok" disabled>✔ تم</button></div>`;
      const q = s => el.querySelector(s);
      const parts = [];
      let lvl = 0, warned = {};
      const LV = [['ضعيفة جداً', '#f0533f', 8], ['ضعيفة', '#f0533f', 25], ['متوسطة', '#ff9a2e', 50], ['قوية', '#c9b200', 75], ['قوية جداً', '#16a865', 100]];
      function score() {
        const str = parts.map(p => (p[1] === 'name' ? 'Name' : p[0])).join('');
        const kinds = new Set(parts.map(p => (p[1] === 'w' || p[1] === 'name' ? 'w' : p[1] === 'easy' ? 'd' : p[1])));
        let s = 0;
        if (str.length >= 6) s++;
        if (str.length >= 10) s++;
        if (str.length >= 14) s++;
        if (kinds.size >= 3) s++;
        if (kinds.size < 2) s = Math.min(s, 1);
        if (parts.some(p => p[1] === 'name' || p[1] === 'easy')) s = Math.min(s, 1);
        return Math.min(4, s);
      }
      function update(added) {
        q('#pf').innerHTML = parts.length ? parts.map(p => `<span class="k-${p[1]}">${U.esc(p[0])}</span>`).join('') : '<em>…</em>';
        const s = score(), [label, c, w] = LV[s];
        q('#mt').style.width = w + '%'; q('#mt').style.background = c; q('#ml').textContent = label;
        q('[data-x="ok"]').disabled = s < 4;
        if (added && added[1] === 'name' && !warned.name) { warned.name = 1; A.bad(q('#pf'), 'cw_pw_name'); }
        else if (added && added[1] === 'easy' && !warned.easy) { warned.easy = 1; A.bad(q('#pf'), 'cw_pw_easy'); }
        else if (s > lvl) { A.sfx.spark(); A.say(s === 4 ? 'cw_pw_strong' : s === 3 ? 'cw_pw_good' : 'cw_pw_mid', { quiet: s < 4, pri: s === 4 ? 'feedback' : 'ambient' }); }
        if (s === 4 && lvl < 4 && root.gsap) gsap.fromTo(q('[data-x="ok"]'), { scale: 1 }, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 3 });
        lvl = s;
      }
      A.on(el, 'click', e => {
        const t = e.target.closest('.cw-tile');
        if (t) { if (parts.length >= 8) { A.bad(q('#pf')); return; } A.sfx.tap(); const tile = TILES[+t.dataset.i]; parts.push(tile); update(tile); if (root.gsap) gsap.from(q('#pf').lastElementChild, { scale: 0, duration: 0.3, ease: 'back.out(3)' }); return; }
        const x = e.target.closest('[data-x]'); if (!x) return;
        if (x.dataset.x === 'del') { parts.pop(); A.sfx.tap(); update(); }
        if (x.dataset.x === 'ok' && score() === 4) A.win({ stars: 3, say: 'cw_pw_secret' });
      });
      update();
      A.later(() => A.say(['cw_pw', 'cw_pw_tip']), 250);
      return {
        solve() { [0, 6, 10, 1, 7, 3, 11].forEach(i => q(`.cw-tile[data-i="${i}"]`).click()); q('[data-x="ok"]').click(); },
      };
    },
  };

  CW.register({
    id: 'safety', order: 5, name: 'الأمان في الإنترنت', icon: '🛡️', color: '#16a865', voice: 'cw_s_safety', minAge: 5,
    rec: a => a >= 5, activities: [rules, share, popup, password],
  });
})(window);

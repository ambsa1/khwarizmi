/* قسم الإنجليزي: أنواع الأنشطة (كل نوع يشتغل على كلمات أي قسم)
   learn  = بطاقات: صورة كبيرة + الكلمة، اضغط واسمع
   choice = اسمع واضغط / اقرأ واضغط / عُدّ / لوّن / الاختبار (سؤال + صور للاختيار)
   match  = صِل الكلمة بالصورة،  spell = رتّب الحروف،  build = رتّب كلمات الجملة
   الأعمار: ٣–٤ اسمع والمس فقط (٢–٣ اختيارات)، ٥–٦ (٣–٤ اختيارات)، ٧+ قراءة وتهجئة. */
(function (root) {
  'use strict';
  const EN = root.EN, U = EN.util, ltr = U.ltr, esc = U.esc;
  const gs = () => (typeof root.gsap !== 'undefined' ? root.gsap : null);

  /* ---------- الكلمات حسب العمر ---------- */
  const SIZE = {
    numbers: a => (a <= 4 ? 5 : a <= 6 ? 10 : 20),
    colors: a => (a <= 4 ? 6 : a <= 6 ? 8 : 10),
    talk: a => (a <= 4 ? 6 : a <= 6 ? 8 : 99),
    _: a => (a <= 4 ? 6 : a <= 6 ? 9 : 99),
  };
  const pool = (sec, age) => EN.vocab(sec).slice(0, (SIZE[sec] || SIZE._)(age));
  EN.pool = pool;
  const nChoices = age => (age <= 3 ? 2 : age <= 5 ? 3 : 4);
  const starsFor = miss => (miss <= 1 ? 3 : miss <= 3 ? 2 : 1);
  // دورة بدون تكرار: كل الكلمات مرة قبل ما تتكرر، ولا نفس الكلمة مرتين ورا بعض
  function cycler(items) {
    let bag = [], last = null;
    return () => {
      if (!bag.length) { bag = U.shuffle(items); if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()); }
      return (last = bag.pop());
    };
  }
  // اختيارات: الإجابة + كلمات من نفس القسم بصور مختلفة
  function options(ans, n, from) {
    const same = from.filter(x => x !== ans && x.pic !== ans.pic && x.en !== ans.en);
    let others = U.shuffle(same).slice(0, n - 1);
    if (others.length < n - 1) others = others.concat(U.shuffle(EN.vocab(ans.sec).filter(x => x !== ans && !others.includes(x) && x.pic !== ans.pic)).slice(0, n - 1 - others.length));
    return U.shuffle([ans].concat(others));
  }
  const cap = it => `<span class="en-cap">${ltr(it.en)}<small>${esc(it.ar)}</small></span>`;
  const bigText = it => (it.en.length > 12 ? ' long' : it.en.length > 7 ? ' mid' : '');

  /* ---------- ١ بطاقات التعلّم ---------- */
  function learn(o) {
    o = o || {};
    return Object.assign({ id: 'learn', en: 'Learn', name: 'تعلّم الكلمات', icon: '🃏', minAge: 3 }, o, {
      mount(el, A) {
        const items = o.items ? o.items(A.age) : pool(A.sec.vocab, A.age);
        el.innerHTML = `<div class="en-learn"><div class="en-dots" id="d"></div>
          <div class="en-lrow"><button class="en-nav" data-x="prev" aria-label="السابق">→</button>
            <button class="en-card" id="card" aria-label="اسمع"></button>
            <button class="en-nav" data-x="next" aria-label="التالي">←</button></div></div>`;
        const q = s => el.querySelector(s), card = q('#card');
        const setDot = A.dots(q('#d'), items.length);
        const seen = new Set();
        let i = 0, won = false;
        function show(k, dir) {
          i = (k + items.length) % items.length;
          const it = items[i];
          seen.add(i); setDot(i);
          el.querySelectorAll('.en-dots i').forEach((d, j) => { if (seen.has(j) && j !== i) d.className = 'on'; });
          card.innerHTML = `${EN.pic(it, { dots: true })}<span class="en-cword${bigText(it)}">${ltr(it.en)}</span><small class="en-car">${esc(it.ar)}</small>`;
          const g = gs(); if (g) g.fromTo(card, { x: dir ? -dir * 40 : 0, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.8)' });
          A.hold(300);
          A.hear(it, { quiet: false });
          if (seen.size === items.length && !won) { won = true; A.afterVoice(() => A.win({ stars: 3 }), 1600, 6000); }
        }
        A.on(el, 'click', e => {
          const b = e.target.closest('button'); if (!b || !A.open) return;
          if (b === card) {
            A.sfx.tap && A.sfx.tap(); A.hear(items[i], { quiet: false });
            const g = gs(); if (g) g.fromTo(card.querySelector('.en-pic'), { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1 });
          } else if (b.dataset.x === 'next') { A.sfx.tap && A.sfx.tap(); show(i + 1, 1); } else if (b.dataset.x === 'prev') { A.sfx.tap && A.sfx.tap(); show(i - 1, -1); }
        });
        A.onReplay(() => A.hear(items[i], { quiet: false }));
        A.later(() => { A.say('en2_learn', { pri: 'instruction' }); A.later(() => show(0), 50); }, 200);
        return {
          state: () => ({ i, seen: seen.size, n: items.length }),
          step() { A.hold(0); q('[data-x="next"]').click(); return true; },
          async solve() { while (A.alive && !won) { if (A.open) q('[data-x="next"]').click(); await A.wait(350); } },
        };
      },
    });
  }

  /* ---------- ٢ سؤال + صور (اسمع / اقرأ / عُدّ / لوّن / اختبار) ---------- */
  const COUNT_OBJ = ['🍎', '⭐', '🐟', '🎈', '🌸', '🚗', '🐤', '🍓'];
  const INTRO = { listen: 'en2_listen', read: 'en2_read', count: 'en2_count', paint: 'en2_paint' };
  // o.kinds(A, i) → نوع السؤال، o.from(A) → [كلمات الإجابات]، o.rounds(age)
  function choice(o) {
    return Object.assign({ minAge: 3 }, o, {
      mount(el, A) {
        const from = o.from ? o.from(A) : pool(A.sec.vocab, A.age);
        const next = cycler(from);
        const rounds = o.rounds ? o.rounds(A.age) : A.age <= 4 ? 5 : 6;
        const n = nChoices(A.age);
        el.innerHTML = `<div class="en-q"><div class="en-dots" id="d"></div><div class="en-prompt" id="pr"></div><div class="en-opts" id="op"></div></div>`;
        const q = s => el.querySelector(s);
        const setDot = A.dots(q('#d'), rounds);
        const shapes = U.shuffle(Object.keys(EN.shapes));
        const introDone = {};
        let r = 0, miss = 0, busy = true, cur = null, good = 0;
        function make() {
          const kind = o.kinds ? o.kinds(A, r) : 'listen';
          let ans = next();
          if (kind === 'count') ans = U.pick(EN.vocab('numbers').slice(0, A.age <= 4 ? 5 : 10));
          if (kind === 'paint') { while (/^#f{6}$/i.test(ans.pic) || ans.sec !== 'colors') ans = U.pick(pool('colors', A.age)); }
          const src = kind === 'count' ? EN.vocab('numbers').slice(0, A.age <= 4 ? 5 : 10) : kind === 'paint' ? pool('colors', A.age) : from.filter(x => x.sec === ans.sec).length >= n ? from.filter(x => x.sec === ans.sec) : pool(ans.sec, A.age);
          return { kind, ans, opts: options(ans, n, src) };
        }
        function prompt(c) {
          const it = c.ans;
          if (c.kind === 'listen') return `<button class="en-ear" data-x="hear" aria-label="اسمع مرة أخرى"><span>🔊</span></button>`;
          if (c.kind === 'read') return `<div class="en-word${bigText(it)}">${ltr(it.en)}</div>`;
          if (c.kind === 'count') { const ob = U.pick(COUNT_OBJ), k = +it.pic.slice(1); return `<div class="en-objs${k > 6 ? ' many' : ''}" dir="ltr" style="grid-template-columns:repeat(${Math.min(5, k)},auto)">${Array.from({ length: k }, () => `<span>${ob}</span>`).join('')}</div>`; }
          if (c.kind === 'paint') return `<button class="en-shape" data-x="hear" aria-label="اسمع مرة أخرى">${EN.shapes[shapes[r % shapes.length]]}</button>`;
          return '';
        }
        function ask(c, first) {
          const k = c.ans.key;
          if (c.kind === 'listen' || c.kind === 'paint') {
            if (!introDone[c.kind]) { introDone[c.kind] = 1; A.say([INTRO[c.kind], k], { pri: 'instruction', force: true }); } else A.hear(c.ans);
          } else if (!introDone[c.kind] || first) { introDone[c.kind] = 1; A.say(INTRO[c.kind], { pri: 'instruction', force: true }); }
        }
        function show() {
          cur = make();
          setDot(r);
          const pr = q('#pr'), op = q('#op');
          pr.className = 'en-prompt k-' + cur.kind;
          pr.innerHTML = prompt(cur);
          op.className = 'en-opts n' + cur.opts.length + ' k-' + cur.kind;
          const dotsOn = A.age <= 6 && cur.kind !== 'count';
          op.innerHTML = cur.opts.map(it => `<button class="en-opt" data-id="${it.sec}:${it.id}" aria-label="${esc(it.ar)}">${EN.pic(it, { dots: dotsOn })}${cur.kind === 'read' ? '' : cap(it)}</button>`).join('');
          const g = gs(); if (g) { g.from(op.children, { y: 26, opacity: 0, stagger: 0.07, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform,opacity' }); g.from(pr.children, { scale: 0.7, opacity: 0, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform,opacity' }); }
          A.hold(350);
          ask(cur, r === 0);
          busy = false;
        }
        function answer(b) {
          if (busy || !A.open || b.classList.contains('no')) return;
          const it = cur.ans;
          if (b.dataset.id !== it.sec + ':' + it.id) {
            miss++; b.classList.add('no');
            A.bad(b);
            A.say(cur.kind === 'listen' || cur.kind === 'paint' ? ['en2_try', it.key] : ['en2_try'], { pri: 'feedback', force: true, quiet: true });
            return;
          }
          busy = true; good++;
          b.classList.add('ok');
          el.querySelectorAll('.en-opt').forEach(x => { if (x !== b) x.classList.add('off'); });
          if (cur.kind === 'paint') { const sh = q('.en-shape'); sh.classList.add('painted'); sh.querySelectorAll('.fill').forEach(p => p.setAttribute('fill', it.pic)); }
          if (cur.kind === 'read') b.insertAdjacentHTML('beforeend', cap(it));
          A.good(b);
          A.say(good % 2 ? [it.key] : [it.key, A.praise()], { pri: 'feedback', force: true, ar: it.ar });
          A.afterVoice(() => {
            r++;
            if (r < rounds) show(); else { setDot(rounds); A.win({ stars: starsFor(miss) }); }
          }, 1300, 7000);
        }
        A.on(el, 'click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.classList.contains('en-opt')) answer(b);
          else if (b.dataset.x === 'hear' && cur && A.open) { A.sfx.tap && A.sfx.tap(); A.hear(cur.ans); const g = gs(); if (g) g.fromTo(b, { scale: 1 }, { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1 }); }
        });
        A.onReplay(() => { if (!cur) return; if (cur.kind === 'listen' || cur.kind === 'paint') A.hear(cur.ans); else A.say(INTRO[cur.kind], { pri: 'instruction', force: true }); });
        A.later(show, 250);
        return {
          state: () => ({ r, miss, busy, rounds }),
          step() { A.hold(0); const b = cur && el.querySelector(`.en-opt[data-id="${cur.ans.sec}:${cur.ans.id}"]`); if (b) b.click(); return !!b; },
          async solve() {
            while (A.alive && r < rounds) {
              if (!busy && A.open && cur) { const b = el.querySelector(`.en-opt[data-id="${cur.ans.sec}:${cur.ans.id}"]`); if (b) b.click(); }
              await A.wait(200);
            }
          },
        };
      },
    });
  }

  /* ---------- ٣ صِل الكلمة بالصورة ---------- */
  function match(o) {
    return Object.assign({ id: 'match', en: 'Match', name: 'صِل الكلمة بالصورة', icon: '🔗', minAge: 5 }, o, {
      mount(el, A) {
        const from = pool(A.sec.vocab, A.age);
        const per = A.age <= 6 ? 3 : 4, rounds = 2;
        const bag = U.shuffle(from);
        el.innerHTML = `<div class="en-match"><div class="en-dots" id="d"></div><div class="en-mpics" id="mp"></div><div class="en-mwords" id="mw"></div></div>`;
        const q = s => el.querySelector(s);
        const setDot = A.dots(q('#d'), rounds);
        let r = 0, miss = 0, set = [], selW = null, selP = null, done = 0, busy = true;
        function show() {
          setDot(r);
          set = [];
          for (const it of bag.slice(r * per).concat(bag)) { if (set.length >= per) break; if (!set.some(x => x.pic === it.pic || x === it)) set.push(it); }
          q('#mp').className = 'en-mpics n' + set.length; q('#mw').className = 'en-mwords n' + set.length;
          q('#mp').innerHTML = U.shuffle(set).map(it => `<button class="en-mp" data-id="${it.id}" aria-label="${esc(it.ar)}">${EN.pic(it, { dots: A.age <= 6 })}</button>`).join('');
          q('#mw').innerHTML = U.shuffle(set).map(it => `<button class="en-mw${bigText(it)}" data-id="${it.id}">${ltr(it.en)}</button>`).join('');
          selW = selP = null; done = 0;
          const g = gs(); if (g) g.from(el.querySelectorAll('.en-mp, .en-mw'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.3, ease: 'back.out(2)', clearProps: 'transform,opacity' });
          A.hold(350); busy = false;
          if (r === 0) A.say('en2_match', { pri: 'instruction' });
        }
        function check() {
          if (!selW || !selP) return;
          const w = selW, p = selP; selW = selP = null;
          w.classList.remove('sel'); p.classList.remove('sel');
          if (w.dataset.id !== p.dataset.id) { miss++; A.bad(p); A.bad(w); A.say('en2_try', { pri: 'feedback', quiet: true }); return; }
          const it = set.find(x => x.id === w.dataset.id);
          w.classList.add('ok', 'p' + done); p.classList.add('ok', 'p' + done);
          w.disabled = p.disabled = true;
          p.insertAdjacentHTML('beforeend', `<span class="en-tick">✔</span>`);
          done++;
          A.good(p);
          if (done < set.length) { A.hear(it, { pri: 'feedback', quiet: false }); return; }
          busy = true;
          A.say([it.key, A.praise()], { pri: 'feedback', force: true, ar: it.ar });
          A.afterVoice(() => { r++; if (r < rounds) show(); else { setDot(rounds); A.win({ stars: starsFor(miss) }); } }, 1400, 7000);
        }
        A.on(el, 'click', e => {
          const b = e.target.closest('.en-mw, .en-mp'); if (!b || b.disabled || busy || !A.open) return;
          A.sfx.tap && A.sfx.tap();
          if (b.classList.contains('en-mw')) {
            if (selW) selW.classList.remove('sel');
            selW = b; b.classList.add('sel');
            A.hear(set.find(x => x.id === b.dataset.id));
          } else {
            if (selP) selP.classList.remove('sel');
            selP = b; b.classList.add('sel');
          }
          check();
        });
        A.onReplay(() => (selW ? A.hear(set.find(x => x.id === selW.dataset.id)) : A.say('en2_match', { pri: 'instruction', force: true })));
        A.later(show, 250);
        return {
          state: () => ({ r, miss, done }),
          step() { A.hold(0); const w = el.querySelector('.en-mw:not(:disabled)'); if (!w) return false; w.click(); el.querySelector(`.en-mp[data-id="${w.dataset.id}"]`).click(); el.querySelector('.en-mw:not(:disabled)').click(); return true; },
          async solve() {
            while (A.alive && r < rounds) {
              if (!busy && A.open) {
                const w = el.querySelector('.en-mw:not(:disabled)');
                if (w) { w.click(); await A.wait(80); const p = el.querySelector(`.en-mp[data-id="${w.dataset.id}"]`); if (p) p.click(); }
              }
              await A.wait(200);
            }
          },
        };
      },
    });
  }

  /* ---------- ٤ التهجئة (حروف) / ترتيب الجملة (كلمات) ---------- */
  function seq(o, words) {
    return Object.assign({ minAge: 7 }, o, {
      mount(el, A) {
        let from = o.from ? o.from(A) : pool(A.sec.vocab, A.age);
        if (!words) {
          const max = A.age >= 9 ? 6 : 5;
          const ok = from.filter(x => /^[a-z]+$/.test(x.en) && x.en.length >= 3 && x.en.length <= max);
          from = ok.length >= 3 ? ok : from.filter(x => /^[a-z]+$/.test(x.en)).sort((a, b) => a.en.length - b.en.length).slice(0, 5);
        } else from = from.filter(x => x.en.split(' ').length >= 2);
        const rounds = A.age < 7 ? 3 : A.age >= 9 ? 5 : 4;
        const ghost = A.age < 7; // الصغار: الحروف باهتة في المربعات ليطابقوا
        const next = cycler(from);
        el.innerHTML = `<div class="en-spell ${words ? 'words' : ''}"><div class="en-dots" id="d"></div>
          <button class="en-spic" data-x="hear" id="pic" aria-label="اسمع"></button>
          <div class="en-slots" id="sl" dir="ltr"></div><div class="en-tiles" id="tl" dir="ltr"></div></div>`;
        const q = s => el.querySelector(s);
        const setDot = A.dots(q('#d'), rounds);
        let r = 0, miss = 0, pos = 0, parts = [], it = null, busy = true;
        function show() {
          it = next(); pos = 0;
          setDot(r);
          parts = words ? it.en.replace(/[!?.,]/g, '').split(' ') : it.en.split('');
          let tiles = parts.slice();
          if (!words && A.age >= 9) { const abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !parts.includes(c)); tiles = tiles.concat(U.shuffle(abc).slice(0, 2)); }
          tiles = U.shuffle(tiles);
          if (tiles.join('') === parts.join('') && tiles.length > 1) tiles.push(tiles.shift());
          q('#pic').innerHTML = EN.pic(it) + '<span class="en-ear-s">🔊</span>';
          q('#sl').className = 'en-slots n' + parts.length;
          q('#sl').innerHTML = parts.map(p => `<span class="en-slot">${ghost ? `<i>${esc(p)}</i>` : ''}</span>`).join('');
          q('#tl').innerHTML = tiles.map(p => `<button class="en-tile" data-c="${esc(p)}">${esc(p)}</button>`).join('');
          q('.en-slot').classList.add('cur');
          const g = gs(); if (g) g.from(el.querySelectorAll('.en-tile'), { y: 24, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'back.out(2)', clearProps: 'transform,opacity' });
          A.hold(350);
          if (r === 0) A.say([words ? 'en2_build' : 'en2_spell', it.key], { pri: 'instruction', force: true }); else A.hear(it);
          busy = false;
        }
        function tap(b) {
          if (busy || !A.open || b.disabled) return;
          const want = parts[pos];
          if (b.dataset.c !== want) { miss++; A.bad(b); return; }
          const slots = el.querySelectorAll('.en-slot');
          slots[pos].innerHTML = esc(want); slots[pos].classList.remove('cur'); slots[pos].classList.add('got');
          b.disabled = true; b.classList.add('used');
          const g = gs(); if (g) g.fromTo(slots[pos], { scale: 1.4 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
          pos++;
          if (pos < parts.length) {
            slots[pos].classList.add('cur');
            A.sfx.snap ? A.sfx.snap() : A.sfx.tap && A.sfx.tap();
            if (!words) A.say('en2_l_' + want, { pri: 'name', force: true, quiet: true, noReplay: true });
            return;
          }
          busy = true;
          if (words) q('#sl').insertAdjacentHTML('beforeend', `<span class="en-full">${ltr(it.en)}</span>`);
          q('#sl').classList.add('done');
          A.good(q('#sl'));
          A.say([it.key, A.praise()], { pri: 'feedback', force: true, ar: it.ar });
          A.afterVoice(() => { r++; if (r < rounds) show(); else { setDot(rounds); A.win({ stars: starsFor(miss) }); } }, 1500, 8000);
        }
        A.on(el, 'click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.classList.contains('en-tile')) tap(b);
          else if (b.dataset.x === 'hear' && it && A.open) { A.sfx.tap && A.sfx.tap(); A.hear(it); }
        });
        A.onReplay(() => it && A.hear(it));
        A.later(show, 250);
        return {
          state: () => ({ r, miss, pos }),
          step() { A.hold(0); while (!busy && pos < parts.length) { const want = parts[pos]; const b = [...el.querySelectorAll('.en-tile:not(:disabled)')].find(x => x.dataset.c === want); if (!b) break; tap(b); } return true; },
          async solve() {
            while (A.alive && r < rounds) {
              if (!busy && A.open) { const want = parts[pos]; const b = [...el.querySelectorAll('.en-tile:not(:disabled)')].find(x => x.dataset.c === want); if (b) b.click(); }
              await A.wait(120);
            }
          },
        };
      },
    });
  }

  EN.acts = {
    learn,
    listen: o => choice(Object.assign({ id: 'listen', en: 'Listen', name: 'اسمع واضغط', icon: '👂', kinds: () => 'listen' }, o)),
    read: o => choice(Object.assign({ id: 'read', en: 'Read', name: 'اقرأ واختر الصورة', icon: '📖', minAge: 7, kinds: () => 'read' }, o)),
    count: o => choice(Object.assign({ id: 'count', en: 'Count', name: 'عُدّ واضغط', icon: '🧮', kinds: () => 'count' }, o)),
    paint: o => choice(Object.assign({ id: 'paint', en: 'Paint', name: 'لوّن الصورة', icon: '🖌️', kinds: () => 'paint' }, o)),
    // الاختبار: اسمع للكل، وللكبار (٧+) اسمع واقرأ بالتناوب، و extra نوع خاص بالقسم (عُدّ/لوّن)
    quiz: o => choice(Object.assign({ id: 'quiz', en: 'Quiz', name: 'اختبار', icon: '🏅', quiz: true,
      rounds: a => (a <= 4 ? 5 : a <= 6 ? 6 : 8),
      kinds: (A, i) => { const ex = o && o.extra; if (ex && i % 3 === 2) return ex; return A.age >= 7 && i % 2 ? 'read' : 'listen'; } }, o)),
    match,
    spell: o => seq(Object.assign({ id: 'spell', en: 'Spell', name: 'رتّب حروف الكلمة', icon: '🔤' }, o), false),
    build: o => seq(Object.assign({ id: 'build', en: 'Sentences', name: 'رتّب الجملة', icon: '🧩' }, o), true),
    pool, starsFor, nChoices,
  };
})(window);

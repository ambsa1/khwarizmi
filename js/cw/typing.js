/* القسم ٤: مدرسة الكتابة — لوحة مفاتيح على الشاشة بألوان الأصابع، يدان تُظهران الإصبع، والمفتاح التالي يتوهّج.
   الحروف العربية خطوة خطوة، ثم الأرقام، ثم الكلمات؛ ومسار إنجليزي لكلمات البرمجة. لا ننتقل لدرس جديد قبل دقّة كافية.
   اللوحة الحقيقية تُقرأ بـ event.code (مكان المفتاح) فتعمل مهما كانت لغة الجهاز. */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util;

  const ROWS = [
    ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
    ['Space'],
  ];
  const AR = {
    Backquote: 'ذ', Minus: '-', Equal: '=',
    KeyQ: 'ض', KeyW: 'ص', KeyE: 'ث', KeyR: 'ق', KeyT: 'ف', KeyY: 'غ', KeyU: 'ع', KeyI: 'ه', KeyO: 'خ', KeyP: 'ح', BracketLeft: 'ج', BracketRight: 'د',
    KeyA: 'ش', KeyS: 'س', KeyD: 'ي', KeyF: 'ب', KeyG: 'ل', KeyH: 'ا', KeyJ: 'ت', KeyK: 'ن', KeyL: 'م', Semicolon: 'ك', Quote: 'ط',
    KeyZ: 'ئ', KeyX: 'ء', KeyC: 'ؤ', KeyV: 'ر', KeyB: 'لا', KeyN: 'ى', KeyM: 'ة', Comma: 'و', Period: 'ز', Slash: 'ظ', Space: ' ',
  };
  const EN = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: ' ' };
  'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(c => { EN['Key' + c.toUpperCase()] = c; });
  for (let d = 0; d <= 9; d++) { AR['Digit' + d] = String(d); EN['Digit' + d] = String(d); }
  const REV = { ar: {}, en: {} };
  for (const [c, ch] of Object.entries(AR)) if (ch.length === 1) REV.ar[ch] = c;
  for (const [c, ch] of Object.entries(EN)) REV.en[ch] = c;

  // الأصابع: lp lr lm li (يسار) th (إبهام) ri rm rr rp (يمين)
  const FINGER = {};
  const setF = (f, codes) => codes.forEach(c => { FINGER[c] = f; });
  setF('lp', ['Backquote', 'Digit1', 'KeyQ', 'KeyA', 'KeyZ']);
  setF('lr', ['Digit2', 'KeyW', 'KeyS', 'KeyX']);
  setF('lm', ['Digit3', 'KeyE', 'KeyD', 'KeyC']);
  setF('li', ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']);
  setF('ri', ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM']);
  setF('rm', ['Digit8', 'KeyI', 'KeyK', 'Comma']);
  setF('rr', ['Digit9', 'KeyO', 'KeyL', 'Period']);
  setF('rp', ['Digit0', 'Minus', 'Equal', 'KeyP', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Slash']);
  setF('th', ['Space']);
  const FC = { lp: '#f0533f', lr: '#ff9a2e', lm: '#e0b100', li: '#22b573', th: '#7d86c8', ri: '#3d8bff', rm: '#8b5cf6', rr: '#e8579a', rp: '#14b8c4' };
  const FNAME = { lp: 'الخنصر الأيسر', lr: 'البنصر الأيسر', lm: 'الوسطى اليسرى', li: 'السبابة اليسرى', th: 'الإبهام', ri: 'السبابة اليمنى', rm: 'الوسطى اليمنى', rr: 'البنصر الأيمن', rp: 'الخنصر الأيمن' };
  const pastel = (hex, f) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * f)).join(',') + ')'; };

  // كلمات الدروس (لكل كلمة صوت cw_wd_رقم)
  const AR_WORDS = ['باب', 'بيت', 'تين', 'سمك', 'كتاب', 'بنت', 'شمس', 'نام', 'قمر', 'ورد', 'فيل', 'عسل', 'خبز', 'حليب', 'شجرة', 'سراج', 'كمبيوتر', 'مدرسة', 'برمجة', 'روبوت', 'فراشة'];
  const EN_WORDS = ['if', 'in', 'for', 'say', 'print', 'def', 'and', 'not', 'while', 'else', 'return', 'range'];
  const LESSONS = {
    ar: [
      { keys: 'ب ت' }, { keys: 'ي ن' }, { keys: 'س م' }, { keys: 'ش ك' }, { keys: 'ل ا' },
      { review: 'ب ت ي ن س م ش ك ل ا' },
      { words: 'باب بيت تين سمك كتاب بنت شمس نام' },
      { keys: 'ع ق' }, { keys: 'ه ث' }, { keys: 'ف غ' }, { keys: 'ص خ' }, { keys: 'ض ح' }, { keys: 'ج د' },
      { keys: 'ر و' }, { keys: 'ة ى' }, { keys: 'ز ط ذ' },
      { words: 'قمر ورد فيل عسل خبز حليب شجرة سراج' },
      { keys: '1 2 3 4 5', num: 1 }, { keys: '6 7 8 9 0', num: 1 },
      { words: 'كمبيوتر مدرسة برمجة روبوت فراشة' },
    ],
    en: [
      { keys: 'f j' }, { keys: 'd k' }, { keys: 's l' }, { keys: 'a g h' }, { review: 'a s d f g h j k l' },
      { keys: 'e i' }, { keys: 'r u' }, { keys: 't y' }, { keys: 'w o' }, { keys: 'q p' }, { keys: 'c n m' }, { keys: 'v b x z' },
      { words: 'if in for say' }, { words: 'print def and not' }, { words: 'while else return range' },
    ],
  };
  const lessonId = (tr, i) => 'ty_' + tr + '_' + (i + 1);
  const lessonLabel = L => (L.keys || (L.review ? '🔁' : L.words.split(' ').slice(0, 2).join(' ') + '…'));
  const letterKey = (tr, ch) => (tr === 'ar' ? (/\d/.test(ch) ? 'cw_n_' + ch : 'cw_l_' + REV.ar[ch].toLowerCase()) : 'cw_en_l_' + ch);
  const wordKey = (tr, w) => (tr === 'ar' ? 'cw_wd_' + AR_WORDS.indexOf(w) : 'cw_en_w_' + w);

  // كل الحروف التي تعلّمها الطفل في مسار حتى الدرس i
  function knownUpTo(tr, i) {
    const s = new Set();
    LESSONS[tr].slice(0, i + 1).forEach(L => { if (L.keys && !L.num) L.keys.split(' ').forEach(c => s.add(c)); });
    return [...s];
  }

  function drill(L, known, n) {
    if (L.words) return U.shuffle(L.words.split(' ')).slice(0, n <= 6 ? 4 : 6);
    if (L.review) { const ks = L.review.split(' '); return Array.from({ length: n }, () => Array.from({ length: U.rand(2, 3) }, () => U.pick(ks)).join('')); }
    const ks = L.keys.split(' '), g = [];
    ks.forEach(k => g.push(k + k));
    if (ks.length > 1) { g.push(ks[0] + ks[1]); g.push(ks[1] + ks[0]); }
    const pool = known.filter(k => !ks.includes(k));
    while (g.length < n) {
      const len = U.rand(2, 3), s = [];
      for (let j = 0; j < len; j++) s.push(Math.random() < 0.65 || !pool.length || L.num ? U.pick(ks) : U.pick(pool));
      g.push(s.join(''));
    }
    return g.slice(0, n);
  }

  /* ---------- اليدان ---------- */
  function handsSvg() {
    const f = (id, x, y, w, h, rot) => `<rect class="cw-fg" data-f="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" style="--fc:${FC[id]};--fp:${pastel(FC[id], 0.55)}" ${rot ? `transform="rotate(${rot} ${x + w / 2} ${y + h})"` : ''}/>`;
    const hand = (ids, mirror) => `<g ${mirror ? 'transform="translate(400 0) scale(-1 1)"' : ''}>
      ${f('th', 126, 84, 28, 60, 52)}${f(ids[0], 22, 44, 26, 64)}${f(ids[1], 52, 22, 28, 82)}${f(ids[2], 85, 10, 28, 92)}${f(ids[3], 118, 22, 28, 84)}
      <rect class="cw-palm" x="20" y="84" width="128" height="68" rx="32"/></g>`;
    return `<svg viewBox="0 0 400 156" aria-hidden="true">${hand(['lp', 'lr', 'lm', 'li'])}${hand(['rp', 'rr', 'rm', 'ri'], true)}</svg>`;
  }

  /* ---------- لوحة المفاتيح على الشاشة ---------- */
  function keyboard(box, tr, onKey, A) {
    const map = tr === 'ar' ? AR : EN;
    box.innerHTML = `<div class="cw-kb" dir="ltr">${ROWS.map((row, ri) => `<div class="cw-kr r${ri}">${row.map(c => {
      const fc = FC[FINGER[c]];
      return `<button class="cw-key ${c === 'Space' ? 'space' : ''} ${c === 'KeyF' || c === 'KeyJ' ? 'bump' : ''}" data-c="${c}" style="--kc:${pastel(fc, 0.62)};--fc:${fc}" tabindex="-1">${c === 'Space' ? '' : U.esc(map[c])}</button>`;
    }).join('')}</div>`).join('')}</div>`;
    const kb = box.querySelector('.cw-kb');
    const key = c => kb.querySelector(`.cw-key[data-c="${c}"]`);
    A.on(kb, 'pointerdown', e => { const k = e.target.closest('.cw-key'); if (!k) return; e.preventDefault(); onKey(k.dataset.c); });
    return {
      el: kb,
      size(W, H) { // يحسب حجم المفتاح من المساحة المتاحة
        const u = Math.max(18, Math.min(60, (W - 6) / 13.3, H / 5.15));
        kb.style.setProperty('--u', u.toFixed(1) + 'px');
        return u * 5.15;
      },
      glow(c) { kb.querySelectorAll('.cw-key.next').forEach(k => k.classList.remove('next')); const k = c && key(c); if (k) k.classList.add('next'); },
      press(c, bad) {
        const k = key(c); if (!k) return;
        k.classList.remove('down', 'bad'); void k.offsetWidth;
        k.classList.add(bad ? 'bad' : 'down');
        A.later(() => k.classList.remove('down', 'bad'), bad ? 450 : 160);
      },
    };
  }
  const keyEvent = (A, fn) => A.on(root, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!(e.code in AR)) return;
    e.preventDefault();
    if (e.repeat) return;
    fn(e.code);
  });

  /* ---------- مسار دروس (عربي أو إنجليزي) ---------- */
  function trackActivity(tr) {
    const list = LESSONS[tr];
    return {
      id: 'type_' + tr, name: tr === 'ar' ? 'الحروف العربية' : 'كلمات البرمجة', icon: tr === 'ar' ? '🔤' : '🔠', minAge: tr === 'ar' ? 5 : 7,
      summary: st => { const d = list.filter((L, i) => st(lessonId(tr, i)) > 0).length; return { text: `${d}/${list.length}`, done: d === list.length }; },
      summaryStars: st => list.reduce((a, L, i) => a + st(lessonId(tr, i)), 0),
      mount(el, A) {
        const thr = A.age <= 6 ? 80 : 90;
        let mode = 'list', kb = null, stopKeys = false;
        A.onBack(() => { if (mode === 'lesson') { menu(); return true; } return false; });
        keyEvent(A, c => { if (mode === 'lesson' && cur) cur.key(c); });
        let cur = null;

        function menu() {
          mode = 'list'; cur = null;
          const open = i => i === 0 || A.stars(lessonId(tr, i - 1)) > 0 || A.stars(lessonId(tr, i)) > 0;
          const next = list.findIndex((L, i) => !A.stars(lessonId(tr, i)));
          el.innerHTML = `<div class="cw-lessons"><div class="cw-lgrid">${list.map((L, i) => {
            const st = A.stars(lessonId(tr, i)), o = open(i);
            return `<button class="cw-les ${st ? 'done' : ''} ${o ? '' : 'locked'} ${i === next ? 'next' : ''} ${L.words ? 'words' : ''}" data-l="${i}" ${tr === 'en' ? 'dir="ltr"' : ''}>
              <span class="cw-les-n">${o ? i + 1 : '🔒'}</span><span class="cw-les-k">${U.esc(lessonLabel(L))}</span>
              <span class="cw-st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span></button>`;
          }).join('')}</div></div>`;
          if (root.gsap) gsap.from(el.querySelectorAll('.cw-les'), { scale: 0.6, opacity: 0, stagger: 0.025, duration: 0.3, ease: 'back.out(2)' });
          const nb = el.querySelector('.cw-les.next'); if (nb && nb.scrollIntoView) nb.scrollIntoView({ block: 'nearest' });
          A.say('cw_ty_pick');
        }
        A.on(el, 'click', e => {
          const b = e.target.closest('.cw-les'); if (!b || mode !== 'list') return;
          if (b.classList.contains('locked')) { A.bad(b, 'cw_ty_locked'); return; }
          A.sfx.tap(); lesson(+b.dataset.l);
        });

        function lesson(i) {
          mode = 'lesson';
          const L = list[i], n = A.age <= 6 ? 6 : 9;
          const groups = drill(L, knownUpTo(tr, i), n);
          const lines = []; // سطور قصيرة: ثلاث مجموعات أو كلمتان في كل سطر
          const per = L.words ? 2 : 3;
          for (let k = 0; k < groups.length; k += per) lines.push(groups.slice(k, k + per).join(' '));
          const units = []; // [سطر، موضع]
          lines.forEach((ln, li) => { [...ln].forEach((ch, ci) => units.push([li, ci])); if (li < lines.length - 1) units.push([li, ln.length]); });
          const charAt = u => (u[1] < lines[u[0]].length ? lines[u[0]][u[1]] : ' ');
          el.innerHTML = `<div class="cw-type ${tr}">
            <div class="cw-type-top"><div class="cw-prog"><i id="pg"></i></div><span class="cw-finger" id="fg"></span></div>
            <div class="cw-text" id="tx" dir="${tr === 'ar' ? 'rtl' : 'ltr'}"></div>
            <div class="cw-kb-wrap" id="kbw"></div>
            <div class="cw-hands" id="hd">${handsSvg()}</div></div>`;
          const q = s => el.querySelector(s);
          let pos = 0, errs = new Set(), wrongHere = 0, t0 = 0, finished = false;
          kb = keyboard(q('#kbw'), tr, c => st.key(c), A);
          function layout() {
            const box = el.querySelector('.cw-type'); if (!box) return;
            const top = q('.cw-type-top').offsetHeight + q('#tx').offsetHeight + 18;
            const kh = kb.size(box.clientWidth - 8, Math.min((box.clientHeight - top) * 0.92, box.clientHeight * 0.6));
            q('#kbw').style.height = Math.ceil(kh) + 'px';
            const left = box.clientHeight - top - kh;
            q('#hd').style.display = left > 64 ? '' : 'none';
            q('#hd').style.height = Math.min(150, left - 8) + 'px';
          }
          function render() {
            const u = units[Math.min(pos, units.length - 1)], li = u[0];
            const done = pos >= units.length;
            q('#tx').innerHTML = [li, li + 1].filter(x => x < lines.length).map(x => {
              const ln = lines[x];
              let h = '';
              for (let ci = 0; ci <= ln.length; ci++) {
                if (ci === ln.length && x === lines.length - 1) break;
                const idx = units.findIndex(v => v[0] === x && v[1] === ci);
                if (idx < 0) continue;
                const ch = ci < ln.length ? ln[ci] : ' ';
                const cls = idx < pos ? (errs.has(idx) ? 'er' : 'ok') : idx === pos && !done ? 'cur' : '';
                h += ch === ' ' ? `<span class="sp ${cls}"> </span>` : `<span class="${cls}">${U.esc(ch)}</span>`;
              }
              return `<div class="cw-line ${x === li ? 'now' : 'later'}">${h}</div>`;
            }).join('');
            q('#pg').style.width = (pos / units.length) * 100 + '%';
            if (done) { kb.glow(null); hl(null); return; }
            const want = REV[tr][charAt(units[pos])];
            kb.glow(want);
            hl(FINGER[want]);
          }
          function hl(f) {
            el.querySelectorAll('.cw-fg.on').forEach(x => x.classList.remove('on'));
            if (f) el.querySelectorAll(`.cw-fg[data-f="${f}"]`).forEach(x => x.classList.add('on'));
            q('#fg').innerHTML = f ? `<i style="background:${FC[f]}"></i>${FNAME[f]}` : '';
          }
          // نطق الكلمة عند بدايتها
          function wordAt(p) {
            if (!L.words) return null;
            const u = units[p]; if (!u) return null;
            const ln = lines[u[0]];
            if (u[1] >= ln.length || (u[1] > 0 && ln[u[1] - 1] !== ' ')) return null;
            return ln.slice(u[1]).split(' ')[0];
          }
          const st = {
            key(c) {
              if (finished) return;
              const want = REV[tr][charAt(units[pos])];
              if (!t0) t0 = performance.now();
              if (c === want) {
                kb.press(c); A.sfx.pen();
                pos++; wrongHere = 0;
                render();
                const w = wordAt(pos); if (w) A.say(wordKey(tr, w), { quiet: true });
                if (pos >= units.length) finish();
              } else {
                errs.add(pos); wrongHere++;
                kb.press(c, true); A.sfx.land();
                const k = el.querySelector('.cw-key.next');
                if (k) { k.classList.remove('cw-shake'); void k.offsetWidth; k.classList.add('cw-shake'); }
                // كل ضغطة = مؤثر صوتي فقط؛ بعد غلطتين على نفس الحرف نساعد بالصوت (الحرف وإصبعه)
                if (wrongHere === 2) { const ch = charAt(units[pos]); A.say(ch === ' ' ? ['cw_ty_space'] : [letterKey(tr, ch), 'cw_f_' + FINGER[want]], { pri: 'feedback' }); }
                render();
              }
            },
          };
          cur = st;
          function finish() {
            finished = true;
            const acc = Math.round(100 * (units.length - errs.size) / units.length);
            const mins = Math.max(0.1, (performance.now() - t0) / 60000), wpm = Math.round(units.length / 5 / mins);
            const id = lessonId(tr, i);
            const note = `🎯 ${acc}%` + (A.age >= 8 ? ` · ⏱ ${wpm} كلمة/دقيقة` : '');
            if (acc >= thr) {
              const stars = acc >= 98 ? 3 : acc >= thr + 4 ? 2 : 1;
              A.later(() => A.win({ stars, id, note, tip: 'cw_ty_tip', next: i + 1 < list.length ? () => lesson(i + 1) : null, again: () => lesson(i), done: () => menu() }), 350);
            } else {
              A.later(() => {
                el.querySelector('.cw-type').insertAdjacentHTML('beforeend', `<div class="cw-result"><div class="cw-rcard">
                  <div class="cw-rsj" id="rsj"></div><h3>${U.esc(A.text('cw_ty_close'))}</h3><p class="cw-big">🎯 ${acc}%</p><p>${U.esc(A.text('cw_ty_slow'))}</p>
                  <div class="cw-wacts"><button class="sq" data-r="list" aria-label="الدروس">☰</button><button class="run" data-r="again">↻ مرة أخرى</button></div></div></div>`);
                const s = A.siraj(q('#rsj')); if (s) s.sad();
                A.sfx.oops();
                A.say(['cw_ty_close', 'cw_ty_slow'], { pri: 'feedback' });
                el.querySelectorAll('[data-r]').forEach(b => A.on(b, 'click', () => { A.sfx.tap(); if (b.dataset.r === 'again') lesson(i); else menu(); }));
              }, 350);
            }
          }
          render(); layout();
          A.onResize(layout);
          A.later(layout, 60);
          // تعريف الدرس بالصوت: الحروف الجديدة وأصابعها، أو الكلمات
          const intro = [];
          if (L.keys) {
            intro.push(L.num ? 'cw_ty_num' : tr === 'en' ? 'cw_ty_en' : 'cw_ty_new');
            L.keys.split(' ').slice(0, 3).forEach(ch => { intro.push(letterKey(tr, ch)); if (!L.num) intro.push('cw_f_' + FINGER[REV[tr][ch]]); });
          } else if (L.review) intro.push('cw_ty_review');
          else { intro.push('cw_ty_words'); const w = wordAt(0); if (w) intro.push(wordKey(tr, w)); }
          A.later(() => A.say(intro), 200);
          return st;
        }

        menu();
        return {
          lesson, menu,
          // للاختبار: يكتب الدرس كله صحيحاً
          async solve(i) {
            const st = lesson(i || 0);
            await A.wait(50);
            for (let g = 0; g < 400 && mode === 'lesson'; g++) {
              const want = el.querySelector('.cw-key.next');
              if (!want) break;
              st.key(want.dataset.c);
            }
          },
          typeWrong(n) { for (let k = 0; k < n; k++) cur && cur.key('Digit0'); },
        };
      },
    };
  }

  /* ---------- مطر الحروف ---------- */
  const rain = {
    id: 'ty_rain', name: 'مطر الحروف', icon: '🌧️', minAge: 5,
    mount(el, A) {
      let stopped = false, kb = null, onKey = null;
      keyEvent(A, c => { if (onKey) onKey(c); });
      function choose() {
        onKey = null;
        el.innerHTML = `<div class="cw-pick2"><button class="cw-big-pick" data-t="ar"><b>ب ت ن</b><small>عربي</small></button>
          <button class="cw-big-pick" data-t="en" dir="ltr"><b>f j k</b><small>English</small></button></div>`;
        el.querySelectorAll('[data-t]').forEach(b => A.on(b, 'click', () => { A.sfx.tap(); play(b.dataset.t); }));
        A.say('cw_rain_pick');
      }
      function pool(tr) {
        const L = LESSONS[tr];
        let last = 1;
        L.forEach((x, i) => { if (A.stars(lessonId(tr, i)) > 0) last = Math.max(last, i); });
        return knownUpTo(tr, last);
      }
      function play(tr) {
        const letters = pool(tr), total = A.age <= 6 ? 12 : 20;
        const fall = A.age <= 6 ? 9000 : A.age <= 8 ? 7500 : 6200;
        el.innerHTML = `<div class="cw-rain"><div class="cw-rain-top"><span>💧 <b id="sc">0</b> / ${total}</span><span>☔ <b id="ms">0</b></span></div>
          <div class="cw-rain-area" id="ar" dir="ltr"></div><div class="cw-kb-wrap" id="kbw"></div></div>`;
        const q = s => el.querySelector(s), area = q('#ar');
        kb = keyboard(q('#kbw'), tr, c => onKey(c), A);
        const layout = () => { const b = el.querySelector('.cw-rain'); if (!b) return; const h = kb.size(b.clientWidth - 8, b.clientHeight * 0.42); q('#kbw').style.height = Math.ceil(h) + 'px'; };
        layout(); A.onResize(layout);
        let drops = [], spawned = 0, score = 0, miss = 0, t = 600, over = false;
        const hint = A.age <= 7;
        function spawn() {
          const ch = U.pick(letters), d = document.createElement('div');
          d.className = 'cw-drop'; d.textContent = ch;
          const W = area.clientWidth;
          const o = { ch, code: REV[tr][ch], x: 10 + Math.random() * Math.max(10, W - 70), y: -60, el: d, speed: 1 + spawned / total * 0.6 };
          d.style.transform = `translate(${o.x}px, ${o.y}px)`;
          area.appendChild(d); drops.push(o); spawned++;
        }
        onKey = c => {
          if (over) return;
          const hits = drops.filter(o => !o.dead && o.code === c).sort((a, b) => b.y - a.y);
          if (!hits.length) { kb.press(c, true); A.sfx.land(); return; }
          const o = hits[0]; o.dead = true; score++;
          kb.press(c); A.sfx.snap(); A.burst(o.el, 14, ['#4fd1ff', '#fff', '#7cff8a']);
          o.el.classList.add('pop'); A.later(() => o.el.remove(), 250);
          q('#sc').textContent = score;
        };
        A.loop(dt => {
          const H = area.clientHeight;
          t -= dt;
          if (spawned < total && t <= 0) { spawn(); t = (fall / 3.2) * (1 - spawned / total * 0.35); }
          for (const o of drops) {
            if (o.dead) continue;
            o.y += dt * (H + 60) / fall * o.speed;
            o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
            if (o.y > H - 50) { o.dead = true; miss++; q('#ms').textContent = miss; o.el.classList.add('splash'); A.sfx.land(); A.later(() => o.el.remove(), 300); }
          }
          drops = drops.filter(o => !o.dead);
          if (hint) { const low = drops.slice().sort((a, b) => b.y - a.y)[0]; kb.glow(low ? low.code : null); }
          if (spawned >= total && !drops.length && !over) {
            over = true;
            A.later(() => A.win({ stars: miss <= 2 ? 3 : miss <= 5 ? 2 : 1, note: `💧 ${score} / ${total}`, again: () => play(tr), done: () => A.toList() }), 400);
            return false;
          }
          return true;
        });
        A.say('cw_rain');
        api.drops = () => drops;
      }
      const api = {
        play,
        async solve(tr) {
          play(tr || 'ar');
          while (A.alive && !el.querySelector('.cw-win') && !document.querySelector('.cw-win')) {
            const ds = api.drops ? api.drops() : [];
            for (const d of ds) if (!d.dead && d.y > 0) onKey(d.code);
            await A.wait(100);
          }
        },
        destroy() { stopped = true; },
      };
      choose();
      return api;
    },
  };

  CW.typing = { AR, EN, REV, FINGER, LESSONS, AR_WORDS, EN_WORDS, drill, knownUpTo };
  CW.register({
    id: 'typing', order: 4, name: 'مدرسة الكتابة', icon: '⌨️', color: '#8b5cf6', voice: 'cw_s_typing', minAge: 5,
    rec: a => a >= 6, activities: [trackActivity('ar'), trackActivity('en'), rain],
  });
})(window);

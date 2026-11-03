/* إضافات بيت الخوارزمي: موسوعتي، الألقاب، الملصقات، الشهادات، ركن العائلة، تذكير الراحة، وحساب وقت اللعب.
   تعتمد على window.App (من app.js): S, screen, showModal, closeModal, live, mini */
(function () {
  'use strict';

  const X = window.EXTRA_TEXTS.SAY, EN = window.EXTRA_TEXTS.EN;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = s => String(s || '').replace(/[ً-ْ]/g, '');
  const A = () => window.App;
  const P = () => (A() ? A().S.player : null);
  const girlOf = p => !!p && p.gender === 'g';
  const xk = (k, p) => (girlOf(p || P()) && X[k + '_f'] ? k + '_f' : k);
  const xline = (k, p) => [xk(k, p), X[xk(k, p)]];
  const xtext = (k, p) => plain(X[xk(k, p)]);
  const frac = (a, b) => `<bdi dir="ltr">${a} / ${b}</bdi>`; // ٣ من ١٠ تُقرأ صح في سطر عربي
  const modalOpen = () => !!($('#modal') && $('#modal').innerHTML.trim());

  /* ---------- المحتوى: المراحل وأقسام عالم الكمبيوتر ---------- */
  const tracks = () => (Array.isArray(window.TRACKS) ? window.TRACKS : []);
  const cwSections = () => (window.CW && Array.isArray(window.CW.sections) ? window.CW.sections : []);
  // كل قسم له شهادة، وبيت في مدينة المصابيح
  function groups() {
    return tracks().map(t => ({ key: 'T-' + t.id, name: t.name, icon: t.icon, color: t.color, ids: (t.levels || []).map(l => l.id) }))
      .concat(cwSections().map(s => ({ key: 'C-' + s.id, name: s.name, icon: s.icon, color: s.color, ids: (s.activities || []).map(cwItem) })))
      .filter(g => g.ids.length);
  }
  // نشاط عالم الكمبيوتر: مفتاحه cw:<id>، أو (مثل مدرسة الكتابة) عدة دروس يلخّصها summary
  const cwStars = p => id => +(p.progress['cw:' + id] || 0);
  function cwItem(a) {
    if (typeof a.summary !== 'function') return 'cw:' + a.id;
    return p => { try { return !!a.summary(cwStars(p)).done; } catch (e) { return false; } };
  }
  function cwStarted(a) {
    if (typeof a.summaryStars !== 'function') return 'cw:' + a.id;
    return p => { try { return a.summaryStars(cwStars(p)) > 0; } catch (e) { return false; } };
  }
  const isDone = (p, x) => (typeof x === 'function' ? x(p) : Store.solved(p, x));
  const doneIn = (p, g) => g.ids.filter(id => isDone(p, id)).length;

  /* ---------- الألقاب ---------- */
  const TITLES = [[0, '🌱'], [6, '🔍'], [15, '💡'], [30, '💻'], [50, '🛠️'], [80, '🚀'], [120, '🧠'], [170, '👑']];
  function titleIdx(p) { const s = Store.stars(p); let i = 0; TITLES.forEach((t, j) => { if (s >= t[0]) i = j; }); return i; }
  const titleKey = (p, i) => 'x_t' + i + (girlOf(p) ? '_f' : '');
  const titleName = (p, i) => plain(X[titleKey(p, i == null ? titleIdx(p) : i)]);
  function titleChip(p) {
    if (!p) return '';
    const i = titleIdx(p);
    return `<button class="chip x-title" data-x="title" aria-label="لقبي">${TITLES[i][1]} ${esc(titleName(p, i))}</button>`;
  }

  /* ---------- الملصقات: ملصق لكل ٤ نجوم ---------- */
  const STICKERS = ['🦁', '🐼', '🦊', '🐸', '🐙', '🦄', '🐢', '🦋', '🐝', '🐞', '🦉', '🐧', '🐬', '🐳', '🦕', '🐯', '🐨', '🦒', '🚀', '🛸',
    '🌈', '🌙', '☀️', '🌻', '🍉', '🍓', '🍦', '🎈', '🎨', '🎸', '⚽', '🚂', '🚁', '⛵', '🏰', '🎁', '🧩', '🔭', '💎', '🏆'];
  const PER = 4;
  const stickerCount = p => Math.min(STICKERS.length, Math.floor(Store.stars(p) / PER));

  /* ---------- الموسوعة ---------- */
  // lv: يُطابق أنواع البطاقات أو اسم المسار أو نوع المرحلة. cw: يُطابق نشاطات عالم الكمبيوتر.
  // المرحلة أو النشاط يقدر يحدد الكلمات صراحة: learn: ['for', 'range']
  // لو مفيش أي مرحلة أو نشاط مرتبط بالكلمة (محتوى لسه ما اتعملش)، الكلمة تفتح من الأول.
  const ENTRIES = [
    { id: 'program', g: 'py', icon: '📜', word: 'برنامج', lv: /./ },
    { id: 'python', g: 'py', icon: '🐍', word: 'Python', code: 1, lv: /./ },
    { id: 'say', g: 'py', icon: '💬', word: 'say("مرحبا")', code: 1, lv: /say/ },
    { id: 'print', g: 'py', icon: '🖨️', word: 'print("مرحبا")', code: 1, lv: /say|^print$/ },
    { id: 'paren', g: 'py', icon: '🫧', word: '( )', code: 1, lv: /./ },
    { id: 'wave', g: 'py', icon: '👋', word: 'wave()', code: 1, lv: /wave/ },
    { id: 'jump', g: 'py', icon: '🦘', word: 'jump()', code: 1, lv: /jump/ },
    { id: 'light', g: 'py', icon: '🚦', word: 'light("red")\noff()', code: 1, lv: /^light|^off$/ },
    { id: 'forward', g: 'py', icon: '✏️', word: 'forward(2)', code: 1, lv: /forward/ },
    { id: 'right', g: 'py', icon: '↪️', word: 'right(90)', code: 1, lv: /pen_right|^right$/ },
    { id: 'left', g: 'py', icon: '↩️', word: 'left(90)', code: 1, lv: /pen_left|^left$/ },
    { id: 'move', g: 'py', icon: '🧭', word: 'move_up()\nmove_down()\nmove_left()\nmove_right()', code: 1, lv: /^go_|^move_/ },
    { id: 'for', g: 'py', icon: '🔁', word: 'for', code: 1, lv: /repeat|^for$/ },
    { id: 'range', g: 'py', icon: '🔢', word: 'range(4)', code: 1, lv: /repeat|^range$/ },
    { id: 'i', g: 'py', icon: '🔤', word: 'i', code: 1, lv: /repeat|^for$/ },
    { id: 'colon', g: 'py', icon: '➡️', word: 'for i in range(3):\n    jump()', code: 1, lv: /repeat|^for$|^if$|^def$|^func_def/ },
    { id: 'var', g: 'py', icon: '📦', word: 'x = 5', code: 1, lv: /^var/ },
    { id: 'eq', g: 'py', icon: '🟰', word: '=', code: 1, lv: /^var/ },
    { id: 'plus', g: 'py', icon: '➕', word: '+', code: 1, lv: /var_add|^plus$/ },
    { id: 'if', g: 'py', icon: '🤔', word: 'if', code: 1, lv: /^if$|^elif$/ },
    { id: 'while', g: 'py', icon: '♾️', word: 'while', code: 1, lv: /^while$/ },
    { id: 'def', g: 'py', icon: '🧩', word: 'def', code: 1, lv: /^def$|^func_/ },
    { id: 'bug', g: 'py', icon: '🐞', word: 'bug', code: 1, lv: /bug/ },
    { id: 'algorithm', g: 'pc', icon: '📋', word: 'خوارزمية', more: 'الكلمة جاءت من اسم العالم الخوارزمي!', lv: /./, cw: /^algo/ },
    { id: 'computer', g: 'pc', icon: '💻', word: 'الكمبيوتر', cw: /intro|what|computer|meet/ },
    { id: 'input', g: 'pc', icon: '📥', word: 'Input', code: 1, cw: /^ipo$|^parts$|input/ },
    { id: 'output', g: 'pc', icon: '📤', word: 'Output', code: 1, cw: /^ipo$|^parts$|output/ },
    { id: 'cpu', g: 'pc', icon: '🧠', word: 'CPU', code: 1, cw: /^ipo$|^parts$|cpu|brain/ },
    { id: 'keyboard', g: 'pc', icon: '⌨️', word: 'لوحة المفاتيح', cw: /key|typ/ },
    { id: 'mouse', g: 'pc', icon: '🖱️', word: 'الفأرة', cw: /mouse|hand|click/ },
    { id: 'screen', g: 'pc', icon: '🖥️', word: 'الشاشة', cw: /screen|^parts$/ },
    { id: 'binary', g: 'pc', icon: '🔟', word: '0 1', code: 1, cw: /binary|^bit|pixel/ },
    { id: 'internet', g: 'pc', icon: '🌐', word: 'الإنترنت', cw: /safe|internet|net/ },
    { id: 'safety', g: 'pc', icon: '🛡️', word: 'قواعد الأمان', more: 'لا نعطي اسمنا أو عنواننا أو صورنا لمن لا نعرفه، ونسأل الكبار.', cw: /^rules$|^share$|^popup$/ },
    { id: 'password', g: 'pc', icon: '🔑', word: 'كلمة السر', cw: /pass/ },
  ];
  function levelsFor(e) {
    const out = [];
    for (const t of tracks()) for (const L of t.levels || []) {
      const learn = Array.isArray(L.learn) ? L.learn : null;
      const toks = [t.id, L.kind || ''].concat(L.blocks || []);
      if (typeof L.solution === 'string') { // مختبر بايثون: كلمات الكود المكتوب
        toks.push(...(L.solution.match(/[A-Za-z_]+/g) || []));
        if (L.solution.includes('+')) toks.push('plus');
        if (/^\s*\w+\s*=[^=]/m.test(L.solution)) toks.push('var_set');
      }
      if ((learn && learn.includes(e.id)) || (e.lv && !learn && toks.some(x => e.lv.test(String(x))))) out.push(L.id);
    }
    return out;
  }
  function actsFor(e) {
    const out = [];
    for (const s of cwSections()) for (const a of s.activities || []) {
      const learn = Array.isArray(a.learn) ? a.learn : null;
      if ((learn && learn.includes(e.id)) || (e.cw && !learn && (e.cw.test(a.id) || e.cw.test(s.id)))) out.push(cwStarted(a));
    }
    return out;
  }
  function unlocked(e, p) {
    const ids = levelsFor(e).concat(actsFor(e));
    return !ids.length || ids.some(id => isDone(p, id));
  }

  /* ---------- الشاشات ---------- */
  const back = () => (P() ? 'sections' : 'home');
  function go(name, title, body, hearKey) {
    A().S.screen = name;
    A().screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="${back()}" aria-label="رجوع">→</button><span class="t">${title}</span>
        ${hearKey ? `<button class="ib" data-x="hear" data-k="${hearKey}" aria-label="اسمع">🔊</button>` : ''}</header>
      <div class="x-scroll">${body}</div>`, 'night x-screen xs-' + name);
  }
  // الصوت عبر سياسة Voice: تعليمة الشاشة مرة، وزر 🔊 والمكافآت دايماً (force)
  const FORCE = { force: true };
  const hear = (k, o) => Voice.play(...xline(k), undefined, o);

  function openEncy() {
    const p = P(); if (!p) return;
    const card = e => {
      if (!unlocked(e, p)) return `<button class="x-entry locked" data-x="e-lock"><span class="x-ic">🔒</span><b>؟</b><p>${esc(plain(X.x_locked))}</p></button>`;
      return `<div class="x-entry" data-x="e-ar" data-k="${e.id}" role="button" tabindex="0">
        <span class="x-ic">${e.icon}</span>
        ${e.code ? `<code dir="ltr">${esc(e.word).replace(/&quot;(.*?)&quot;/g, '&quot;<bdi>$1</bdi>&quot;')}</code>` : `<b>${esc(e.word)}</b>`}
        <p>${esc(plain(X['x_e_' + e.id]))}</p>${e.more ? `<p class="x-more">${esc(e.more)}</p>` : ''}
        <span class="x-hear"><button data-x="e-ar" data-k="${e.id}" aria-label="اسمع بالعربي">🔊 عربي</button>${EN[e.id] ? `<button class="en" data-x="e-en" data-k="${e.id}" aria-label="English">🔊 EN</button>` : ''}</span></div>`;
    };
    const part = (g, icon, name) => {
      const list = ENTRIES.filter(e => e.g === g), n = list.filter(e => unlocked(e, p)).length;
      return `<h3 class="x-h">${icon} ${name} <small>${frac(n, list.length)}</small></h3><div class="x-grid">${list.map(card).join('')}</div>`;
    };
    go('ency', '📖 موسوعتي', part('py', '🐍', 'كلمات بايثون') + part('pc', '💻', 'عالم الكمبيوتر'), 'x_ency');
    gsap.from('.x-entry', { y: 20, opacity: 0, stagger: 0.025, duration: 0.35, ease: 'back.out(1.6)' });
  }

  function openStickers() {
    const p = P(); if (!p) return;
    const n = stickerCount(p), s = Store.stars(p), left = n >= STICKERS.length ? 0 : (n + 1) * PER - s;
    const body = `<div class="x-st-head"><span class="x-st-n">${frac(n, STICKERS.length)}</span>
        ${left ? `<div class="x-bar"><i style="width:${Math.round(((s % PER) / PER) * 100)}%"></i></div><p>⭐ ${left} للملصق التالي</p>` : '<p>🎉 جمعت كل الملصقات!</p>'}</div>
      <div class="x-stickers">${STICKERS.map((e, i) => i < n
        ? `<button class="x-stk" data-x="stk" style="--r:${((i * 37) % 17) - 8}deg">${e}</button>`
        : `<span class="x-stk off" style="--r:${((i * 37) % 17) - 8}deg">${e}</span>`).join('')}</div>`;
    go('stickers', '🏅 ملصقاتي', body, 'x_stickers');
    gsap.from('.x-stk:not(.off)', { scale: 0, rotation: -40, stagger: 0.03, duration: 0.4, ease: 'back.out(2.4)' });
  }

  function openCerts() {
    const p = P(); if (!p) return;
    const gs = groups();
    const body = `<div class="x-certs">${gs.map(g => {
      const d = doneIn(p, g), all = g.ids.length, got = p.certs[g.key];
      return got ? `<button class="x-cert got" data-x="cert" data-k="${esc(g.key)}" style="--tc:${esc(g.color || '#ffc531')}"><span class="x-ic">${g.icon || '📜'}</span><b>${esc(g.name)}</b><span class="x-c-ok">📜 شهادة</span></button>`
        : `<div class="x-cert" style="--tc:${esc(g.color || '#888')}"><span class="x-ic">${g.icon || '📜'}</span><b>${esc(g.name)}</b><div class="x-bar"><i style="width:${Math.round(d / all * 100)}%"></i></div><small>💡 ${frac(d, all)}</small></div>`;
    }).join('')}</div>`;
    const k = Object.keys(p.certs).length ? 'x_certs' : 'x_certs_none';
    go('certs', '📜 شهاداتي', body, k);
    A().S.timers.push(setTimeout(() => { if (A().S.screen === 'certs') hear(k); }, 400));
  }

  /* ---------- ركن العائلة: نجوم العائلة معاً، ومدينة مصابيح لكل طفل (بدون ترتيب) ---------- */
  function city(p, gs) {
    if (!gs.length) return '';
    const shapes = gs.map(g => { const n = g.ids.length, cols = n > 8 ? 3 : 2, rows = Math.ceil(n / cols); return { g, n, cols, w: cols * 16 + 12, h: rows * 16 + 12 }; });
    const top = Math.max(40, ...shapes.map(s => s.h + 18)), ground = top + 4;
    let x = 8, out = '';
    for (const s of shapes) {
      const y = ground - s.h;
      out += `<polygon points="${x - 4},${y} ${x + s.w / 2},${y - 14} ${x + s.w + 4},${y}" fill="${esc(s.g.color || '#4a4f9e')}" opacity=".9"/>`;
      out += `<rect x="${x}" y="${y}" width="${s.w}" height="${s.h}" rx="3" fill="#262a66"/>`;
      s.g.ids.forEach((id, j) => {
        const on = isDone(p, id);
        out += `<rect class="${on ? 'on' : ''}" x="${x + 7 + (j % s.cols) * 16}" y="${y + 7 + Math.floor(j / s.cols) * 16}" width="10" height="10" rx="2" fill="${on ? '#ffd23e' : '#14173d'}"/>`;
      });
      x += s.w + 10;
    }
    return `<svg class="x-city" viewBox="0 0 ${x} ${ground + 8}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect x="0" y="${ground}" width="${x}" height="8" rx="4" fill="#1b1f55"/>${out}</svg>`;
  }
  function openFamily() {
    if (!Store.data.family) return;
    const kids = Store.data.players.filter(p => p.fid).sort((a, b) => String(a.fid).localeCompare(String(b.fid)));
    const ps = kids.length ? kids : Store.data.players;
    const total = ps.reduce((a, p) => a + Store.stars(p), 0);
    const lamps = p => groups().reduce((a, g) => a + doneIn(p, g), 0), all = groups().reduce((a, g) => a + g.ids.length, 0);
    const body = `<div class="x-fam-total"><span class="x-bigstar">⭐</span><b>${total}</b><p>نجوم عائلتنا معاً</p></div>
      <div class="x-kids">${ps.map(p => `<div class="x-kid" style="--pc:${esc(p.color)}"><span class="pic">${A().mini(p.color)}</span>
        <div class="x-kid-main"><b>${esc(p.name) || '&nbsp;'}</b>${city(p, groups().filter(g => g.key[0] === 'T'))}${city(p, groups().filter(g => g.key[0] === 'C'))}<small>💡 ${frac(lamps(p), all)} · ${TITLES[titleIdx(p)][1]} ${esc(titleName(p))}</small></div></div>`).join('')}</div>`;
    go('family', '🏠 ركن العائلة', body, 'x_family');
    gsap.from('.x-kid', { y: 24, opacity: 0, stagger: 0.1, duration: 0.45, ease: 'back.out(1.6)' });
    gsap.from('.x-bigstar', { scale: 0, rotation: -120, duration: 0.7, ease: 'back.out(2.5)' });
    A().S.timers.push(setTimeout(() => { if (A().S.screen === 'family') hear('x_family'); }, 350));
  }

  /* ---------- الشهادة: صورة على canvas فيها الاسم واللقب والتاريخ وسراج ---------- */
  function rr(x, X0, Y0, w, h, r) { x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X0 + w, Y0, X0 + w, Y0 + h, r); x.arcTo(X0 + w, Y0 + h, X0, Y0 + h, r); x.arcTo(X0, Y0 + h, X0, Y0, r); x.arcTo(X0, Y0, X0 + w, Y0, r); x.closePath(); }
  function sirajImage(color) {
    return new Promise(res => {
      const img = new Image(), done = ok => { clearTimeout(t); res(ok ? img : null); };
      const t = setTimeout(() => done(false), 2000);
      img.onload = () => done(true); img.onerror = () => done(false);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Siraj.svg(color, { lit: true, shadow: false }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="460" '));
    });
  }
  async function certCanvas(p, g, when) {
    try { await Promise.race([Promise.all([document.fonts.load('800 80px Baloo', 'شهادة'), document.fonts.load('700 40px Tajawal', 'شهادة')]), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* نكمل بخط الجهاز */ }
    const W = 1400, H = 1000, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d'), f = girlOf(p);
    const HEAD = '"Baloo", "Tajawal", "Segoe UI", Tahoma, sans-serif', BODY = '"Tajawal", "Baloo", "Segoe UI", Tahoma, sans-serif';
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b2f7a'); bg.addColorStop(1, '#12153a');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 70; i++) { x.beginPath(); x.arc((i * 197) % W, (i * 89) % H, (i % 3) + 1, 0, 7); x.fill(); }
    rr(x, 56, 56, W - 112, H - 112, 46); x.fillStyle = '#fffaf0'; x.fill();
    x.lineWidth = 8; x.strokeStyle = '#ffc531'; rr(x, 82, 82, W - 164, H - 164, 32); x.stroke();
    x.lineWidth = 2; x.strokeStyle = '#e8c56a'; rr(x, 98, 98, W - 196, H - 196, 24); x.stroke();
    x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const cx = 760;
    x.font = `64px ${BODY}`; x.fillText(g.icon || '📜', cx, 190);
    x.fillStyle = '#2b2f7a'; x.font = `800 86px ${HEAD}`; x.fillText('شهادة إنجاز', cx, 290);
    x.fillStyle = '#7a6f63'; x.font = `700 40px ${BODY}`; x.fillText(f ? 'يشهد سراج بأنّ البطلة' : 'يشهد سراج بأنّ البطل', cx, 365);
    const gold = x.createLinearGradient(0, 390, 0, 500); gold.addColorStop(0, '#f2a900'); gold.addColorStop(1, '#c46a00');
    x.fillStyle = gold; x.font = `800 112px ${HEAD}`;
    x.fillText(p.name || (f ? 'بطلتنا الصغيرة' : 'بطلنا الصغير'), cx, 490, 900);
    x.fillStyle = '#20213a'; x.font = `700 50px ${BODY}`; x.fillText(`${f ? 'أكملت' : 'أكمل'} قسم «${g.name}»`, cx, 585, 900);
    x.fillStyle = '#16a865'; x.font = `700 42px ${BODY}`; x.fillText(`${f ? 'لقبها' : 'لقبه'}: ${TITLES[titleIdx(p)][1]} ${titleName(p)}`, cx, 660, 900);
    x.fillStyle = '#ffc531'; x.font = `64px ${BODY}`; x.fillText('★ ★ ★', cx, 750);
    x.fillStyle = '#7a6f63'; x.font = `500 34px ${BODY}`;
    let date = '';
    try { date = new Date(when || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { date = new Date(when || Date.now()).toLocaleDateString(); }
    x.fillText(date, cx, 840);
    const img = await sirajImage(p.color);
    if (img) { try { x.drawImage(img, 150, 560, 250, 288); } catch (e) { /* بدون صورة */ } }
    x.fillStyle = '#3d8bff'; x.font = `800 40px ${HEAD}`; x.fillText('صديقك سراج', 275, 892);
    x.fillStyle = '#b3a891'; x.font = `500 26px ${BODY}`; x.fillText('بيت الخوارزمي', 275, 160);
    return c;
  }
  let certUrl = null, certName = '', certTok = 0;
  async function showCert(p, g, fromQueue) {
    // الرسم بياخد وقت: لو الطفل خرج من الشاشة أو ضغط شهادة ثانية، ما نفتح نافذة متأخرة فوق شاشة ثانية
    const my = ++certTok, scr = A().S.screen, alive = () => my === certTok && A().S.screen === scr && P() === p;
    let c;
    try { c = await certCanvas(p, g, p.certs[g.key]); } catch (e) { if (fromQueue && alive()) runQueue(true); return; }
    if (!alive()) return;
    c.toBlob(blob => {
      if (!alive()) return;
      if (!blob) { if (fromQueue) runQueue(true); return; }
      if (certUrl) URL.revokeObjectURL(certUrl);
      certUrl = URL.createObjectURL(blob);
      certName = `شهادة-${(p.name || 'سراج').replace(/[\\/:*?"<>|]/g, '')}-${g.name}.png`;
      A().showModal(`<h2>📜 ${esc(xtext('x_cert', p))}</h2><img class="x-cert-img" alt="شهادة" src="${certUrl}">
        <div class="w-acts"><button class="sq x-save" data-x="cert-save" aria-label="احفظ">💾</button><button class="run" data-x="${fromQueue ? 'q-next' : 'm-close'}">▶</button></div>`, true);
      FX.confetti(); Sfx.win();
      Voice.play(...xline('x_cert', p), undefined, FORCE);
    }, 'image/png');
  }
  function saveCert() {
    if (!certUrl) return;
    const a = document.createElement('a');
    a.href = certUrl; a.download = certName;
    document.body.appendChild(a); a.click(); a.remove();
    Sfx.tap();
  }

  /* ---------- طابور المكافآت والراحة: يظهر فقط في شاشات الخرائط، وأبداً أثناء مرحلة ---------- */
  // شاشات الخرائط فقط (عالم الكمبيوتر كله شاشة واحدة 'cw' فيها أنشطة، فلا نقاطعه)
  const isMap = n => /^(sections|tracks|ency|stickers|certs|family)$/.test(n || '');
  let queue = [], qTimer = null, breakDue = false, lastBreak = 0;
  function collect(p) {
    const q = [];
    for (const g of groups()) {
      if (!p.certs[g.key] && g.ids.every(id => isDone(p, id))) { p.certs[g.key] = Date.now(); Store.save(); q.push(() => showCert(p, g, true)); }
    }
    const ti = titleIdx(p);
    if (typeof p.seen.title !== 'number') Store.setSeen(p, 'title', ti);
    else if (ti > p.seen.title) { Store.setSeen(p, 'title', ti); q.push(() => showTitle(p, ti)); }
    const sn = stickerCount(p);
    if (typeof p.seen.stk !== 'number') Store.setSeen(p, 'stk', sn);
    else if (sn > p.seen.stk) { const from = p.seen.stk; Store.setSeen(p, 'stk', sn); q.push(() => showSticker(p, from, sn)); }
    if (breakDue) q.push(() => showBreak(p));
    return q;
  }
  function runQueue(force) {
    if (!force && modalOpen()) return;
    const f = queue.shift();
    if (f) f(); else if (force) A().closeModal();
  }
  function onScreen(name) {
    clearTimeout(qTimer); queue = []; certTok++; // شاشة جديدة تلغي أي شهادة لسه بتترسم
    if (name === 'home' && Store.backupDue()) { const c = $('.corner'); if (c) c.classList.add('x-due'); } // تذكير الأهل بالنسخة الاحتياطية
    const p = P();
    if (!p || !isMap(name)) return;
    qTimer = setTimeout(() => {
      if (!A() || A().S.screen !== name || P() !== p || modalOpen()) return;
      queue = collect(p);
      runQueue();
    }, name === 'sections' ? 2400 : 650);
  }

  function rewardModal(html, color) {
    A().showModal(html, true);
    const el = $('#xsj');
    if (el) { const s = Siraj.create(el, color); A().S.msirajs.push(s); s.happy(); }
    FX.confetti(); Sfx.win();
  }
  function showTitle(p, i) {
    rewardModal(`<div class="w-siraj" id="xsj"></div><p class="x-sub">${esc(xtext('x_title_new', p))}</p>
      <div class="x-title-big"><span>${TITLES[i][1]}</span>${esc(titleName(p, i))}</div>
      <div class="w-acts"><button class="run" data-x="q-next">▶</button></div>`, p.color);
    gsap.from('.x-title-big', { scale: 0.3, opacity: 0, duration: 0.6, ease: 'back.out(2.5)', delay: 0.15 });
    Voice.playSeq([xline('x_title_new', p), [titleKey(p, i), X[titleKey(p, i)]]], FORCE);
  }
  function showSticker(p, from, to) {
    const got = STICKERS.slice(from, to).slice(-3);
    rewardModal(`<p class="x-sub">${esc(xtext('x_sticker_new', p))}</p>
      <div class="x-new-stk">${got.map(e => `<span class="x-stk">${e}</span>`).join('')}</div>
      <div class="w-acts"><button class="sq" data-x="go-stickers" aria-label="ملصقاتي">🏅</button><button class="run" data-x="q-next">▶</button></div>`);
    gsap.from('.x-new-stk .x-stk', { scale: 0, rotation: 200, stagger: 0.15, duration: 0.7, ease: 'back.out(2)' });
    Voice.play(...xline('x_sticker_new', p), undefined, FORCE);
  }
  function showBreak(p) {
    breakDue = false; lastBreak = Date.now();
    A().showModal(`<div class="w-siraj x-sleepy" id="xsj"></div><span class="x-zz">💤</span>
      <h2 class="x-break-t">${esc(xtext('x_break', p))}</h2>
      <p class="hint">⏱ ${Math.round(Store.todaySec(p) / 60)} دقيقة اليوم</p>
      <div class="w-acts"><button class="run" data-act="home">👋 حاضر</button></div>`, true);
    const el = $('#xsj');
    if (el) { const s = Siraj.create(el, p.color); A().S.msirajs.push(s); s.setLit(false); }
    gsap.from('.x-zz', { y: 10, opacity: 0, duration: 1.2, repeat: -1, ease: 'sine.out' });
    Voice.play(...xline('x_break', p), undefined, { pri: 'instruction', force: true });
  }

  /* ---------- وقت اللعب: كل ١٥ ثانية والطفل يلعب ---------- */
  function checkBreak(p) {
    const lim = Store.settings.limit;
    if (!(lim > 0) || Store.todaySec(p) < lim * 60 || Date.now() - lastBreak < 10 * 60e3) return;
    breakDue = true;
    const n = A().S.screen;
    if (isMap(n) && !modalOpen()) { queue.push(() => showBreak(p)); runQueue(); }
  }
  function tick(sec) {
    const p = P();
    if (!p || !A() || document.hidden || ['home', 'new', 'parents'].includes(A().S.screen)) return;
    Store.addTime(p, sec || 15);
    checkBreak(p);
  }
  setInterval(() => tick(15), 15000);

  /* ---------- الشعار وأزرار الشاشات ---------- */
  function logo() {
    // سقف البيت الذهبي، وسراج (مصباح المدينة) واقف فوقه، وتحته اسم اللعبة
    return `<svg class="x-logo" viewBox="0 52 640 196" role="img" aria-label="بيت الخوارزمي">
      <defs><linearGradient id="xl-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5c2"/><stop offset=".5" stop-color="#ffd23e"/><stop offset="1" stop-color="#f29a00"/></linearGradient>
        <radialGradient id="xl-glow"><stop offset="0" stop-color="#fff3b0" stop-opacity=".8"/><stop offset=".4" stop-color="#ffd23e" stop-opacity=".3"/><stop offset="1" stop-color="#ffd23e" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="x-logo-glow" cx="320" cy="78" rx="190" ry="60" fill="url(#xl-glow)"/>
      <path d="M60 150 L320 70 L580 150" fill="none" stroke="#0b0d2a" stroke-opacity=".55" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 6)"/>
      <path d="M60 150 L320 70 L580 150" fill="none" stroke="url(#xl-gold)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="#fff"><circle cx="110" cy="84" r="3"/><circle cx="540" cy="74" r="4"/><circle cx="486" cy="104" r="2.5"/><circle cx="170" cy="112" r="2"/></g>
      <text x="320" y="228" text-anchor="middle" class="x-logo-txt" fill="url(#xl-gold)">بيت الخوارزمي</text></svg>`;
  }
  function homeExtra() {
    return Store.data.family ? '<button class="x-fam-btn" data-x="family">🏠 ركن العائلة</button>' : '';
  }
  function sectionsRow(p) {
    if (!p) return '';
    return `<div class="x-row">
      <button class="x-tile" data-x="ency"><span>📖</span><b>موسوعتي</b></button>
      <button class="x-tile" data-x="stickers"><span>🏅</span><b>ملصقاتي</b><small>${stickerCount(p)}</small></button>
      <button class="x-tile" data-x="certs"><span>📜</span><b>شهاداتي</b><small>${Object.keys(p.certs).length}</small></button>
      ${Store.data.family ? '<button class="x-tile" data-x="family"><span>🏠</span><b>ركن العائلة</b></button>' : ''}</div>`;
  }

  /* ---------- الأحداث ---------- */
  const XACT = {
    hear: t => hear(t.dataset.k, FORCE),
    ency: () => { Sfx.tap(); openEncy(); hear('x_ency'); },
    stickers: () => { Sfx.tap(); openStickers(); hear('x_stickers'); },
    certs: () => { Sfx.tap(); openCerts(); },
    family: () => { Sfx.tap(); openFamily(); },
    title: () => { const p = P(); if (p) { Sfx.tap(); Voice.play(titleKey(p, titleIdx(p)), X[titleKey(p, titleIdx(p))], undefined, FORCE); } },
    'e-ar': (t, e) => {
      e.stopPropagation();
      const id = t.dataset.k; Sfx.tap();
      Voice.play('x_e_' + id, X['x_e_' + id], undefined, FORCE);
      const card = t.closest('.x-entry'); if (card) gsap.fromTo(card, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    },
    'e-en': (t, e) => { e.stopPropagation(); Sfx.tap(); Voice.play('en_' + t.dataset.k, EN[t.dataset.k], 'en', FORCE); },
    'e-lock': () => { Sfx.oops(); hear('x_locked'); },
    stk: t => { Sfx.spark(); gsap.fromTo(t, { scale: 1.4, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, .4)' }); },
    cert: t => { const p = P(), g = groups().find(x => x.key === t.dataset.k); if (p && g) showCert(p, g, false); },
    'cert-save': () => saveCert(),
    'q-next': () => { A().closeModal(); setTimeout(() => runQueue(), 250); },
    'm-close': () => A().closeModal(),
    'go-stickers': () => { queue = []; openStickers(); },
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-x]');
    if (!t || t.disabled || !A()) return;
    if (!A().tapOk(t, t.dataset.x)) return; // نفس حارس التطبيق: بعد تغيير الشاشة، وضغطتين على نفس الزر
    const f = XACT[t.dataset.x];
    if (f) f(t, e);
  });

  window.Extras = {
    onScreen, logo, homeExtra, sectionsRow, titleChip, openEncy, openStickers, openCerts, openFamily, certCanvas, showCert,
    tick, checkBreak, groups, doneIn, ENTRIES, unlocked, titleIdx, titleName, stickerCount, STICKERS, TITLES,
    get breakDue() { return breakDue; }, get queued() { return queue.length; }, _resetBreak() { lastBreak = 0; breakDue = false; },
  };
})();

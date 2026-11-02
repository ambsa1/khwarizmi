/* واجهة عمران: الشاشات، اللعب، الأهل، والشهادات */
(function () {
  'use strict';

  const E = window.OmranEngine, WORLDS = window.OMRAN_WORLDS, T = window.OMRAN_TEXTS;
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app'), modalRoot = $('#modal');

  const ICON = {
    move: '👣', turn_left: '↺', turn_right: '↻', pick: Art.dates, for: '🔁',
    if_dates: Art.askDates, if_wall: Art.askWall, ifelse_wall: '🔀', while_goal: Art.askGoal,
  };
  const CHIP = {
    move: 'move()', turn_left: 'turn_left()', turn_right: 'turn_right()', pick: 'pick()',
    for: 'for i in range(…):', if_dates: 'if dates_here():', if_wall: 'if wall_ahead():',
    ifelse_wall: 'if wall_ahead(): … else:', while_goal: 'while not at_goal():',
  };
  const ANIM_LIMIT = 60; // بعد هذا العدد من الخطوات (أو ١٥ ثانية) تُسرَّع الحركة عشان الطفل ما يزهج

  const S = {
    screen: 'home', profile: null, wi: 0, li: 0, level: null,
    program: [], active: 'root', history: [], running: false, timer: null, speed: 420, runAt: 0,
    fails: 0, usedSolution: false, offeredSolution: false, pendingCert: false, cell: 40,
    b: null, newAv: null, newGender: null, clearArm: false, delArm: null, breakAt: 0, breakDue: false,
    gateOk: null, gateAns: 0, lockUntil: 0, modalAt: 0, closedAt: 0, timers: {}, won: false, armAt: 0,
  };
  // أثناء التشغيل، وبعد الفوز حتى تظهر نافذة النتيجة، لا يُسمح بتعديل البرنامج
  const busy = () => S.running || S.won;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nameHTML = p => (p.name ? `<bdi>${esc(p.name)}</bdi>` : '');
  const fmt = text => esc(text).replace(/\{(\w+)\}/g, (m, k) => `<span class="chip" lang="en">${esc(CHIP[k] || k)}</span>`);
  // في القاموس، الكلمات الإنجليزية بين {} تظهر ككود منفصل عشان ما يتلخبط اتجاه السطر العربي
  const glossFmt = text => esc(text).replace(/\{([^}]+)\}/g, (m, w) => `<span class="chip" lang="en">${w}</span>`);
  const voiceText = text => text.replace(/\{(\w+)\}/g, (m, k) => T.KIND_VOICE[k] || k);
  const girl = () => !!(S.profile && S.profile.gender === 'g');
  const sayKey = key => (girl() && T.SAY[key + '_f'] ? key + '_f' : key);
  const sayText = key => T.SAY[sayKey(key)];
  const say = key => Voice.play(sayKey(key), sayText(key));
  const munibBox = mood => `<div class="munib">${Art.munib(mood)}</div>`;
  const starsHTML = (n, max = 3) => Array.from({ length: max }, (_, i) => Art.star(i < n)).join('');
  const toAscii = s => String(s || '').replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).trim();
  const later = (name, fn, ms) => { clearTimeout(S.timers[name]); S.timers[name] = setTimeout(fn, ms); };
  const cancel = name => clearTimeout(S.timers[name]);

  // ---------- التقدّم والفتح ----------
  const prog = id => (S.profile && S.profile.progress[id]) || null;
  const solved = id => !!(prog(id) && prog(id).solved);
  const anySolvedFrom = (wi, li) => WORLDS[wi].levels.slice(li).some(l => solved(l.id));
  const worldDone = wi => WORLDS[wi].levels.length > 0 && WORLDS[wi].levels.every(l => solved(l.id));
  // لو أضفنا مراحل جديدة لاحقاً، ما نقفل أقسام الطفل أكملها قبل كده
  const worldUnlocked = wi => !WORLDS[wi].soon && (wi === 0 || worldDone(wi - 1) || !!S.profile.certs[WORLDS[wi - 1].id] || anySolvedFrom(wi, 0));
  const levelUnlocked = (wi, li) => worldUnlocked(wi) && (li === 0 || solved(WORLDS[wi].levels[li - 1].id) || anySolvedFrom(wi, li));
  const worldStars = wi => WORLDS[wi].levels.reduce((s, l) => s + ((prog(l.id) || {}).stars || 0), 0);
  const titleFor = (stars, g) => { const t = T.TITLES.filter(x => stars >= x[0]).pop(); return g === 'g' ? t[2] : t[1]; };
  const totalLevels = WORLDS.reduce((s, w) => s + w.levels.length, 0);

  // ---------- النوافذ ----------
  function showModal(html, sticky) {
    S.modalAt = Date.now();
    S.lockUntil = Date.now() + 350;
    modalRoot.innerHTML = `<div class="modal-back" ${sticky ? '' : 'data-act="modal-bg"'}><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const first = modalRoot.querySelector('input, .actions .btn');
    if (first && first.tagName !== 'INPUT') first.focus({ preventScroll: true });
  }
  function closeModal() {
    if (modalRoot.innerHTML) S.closedAt = Date.now(); // اللمسة الثانية بعد إغلاق النافذة ما تضغط شيء تحتها
    modalRoot.innerHTML = '';
  }
  function message(html, mood) {
    showModal(`${mood ? munibBox(mood) : ''}<p>${html}</p><div class="actions"><button class="btn primary" data-act="close">👍 حسناً</button></div>`);
  }
  function screen(html) {
    S.lockUntil = Date.now() + 350; // عشان اللمسة الثانية من الطفل ما تضغط شيء في الشاشة الجديدة
    app.innerHTML = html;
  }

  // تنزيل ملف على الجهاز
  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // للأهل فقط: مشاركة مباشرة (واتساب، بلوتوث...) لو الجهاز يدعمها، وإلا تنزيل عادي
  function shareOrDownload(blob, filename) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'عمران' }).catch(e => { if (e && e.name !== 'AbortError') download(blob, filename); });
        return;
      }
    } catch (e) { /* المشاركة غير مدعومة */ }
    download(blob, filename);
  }
  const saveJSON = (obj, filename) => shareOrDownload(new Blob([JSON.stringify(obj)], { type: 'application/json' }), filename);

  // ---------- الشاشة الرئيسية ----------
  function renderHome() {
    stopRun(true);
    S.screen = 'home';
    S.profile = null;
    const ps = Store.data.profiles;
    screen(`<div class="screen"><div class="scroll home">
      ${Store.saveFailed ? '<div class="notice">⚠️ المتصفح لا يسمح بحفظ التقدّم على هذا الجهاز. اطلب من الكبار فتح اللعبة في متصفح عادي (وليس التصفح الخفي).</div>' : ''}
      <div class="home-hero">
        <button class="plain ${ps.length ? '' : 'pulse'}" data-act="say" data-key="${ps.length ? 'welcome' : 'welcome_first'}" aria-label="اسمع منيب">${munibBox('happy')}</button>
        <h1>عمران</h1><p>من سيلعب اليوم؟</p>
      </div>
      <div class="tiles">
        ${ps.map(p => `<button class="tile" data-act="pick-profile" data-id="${esc(p.id)}">
          <span class="av">${esc(p.avatar)}</span><span class="nm">${nameHTML(p) || '&nbsp;'}</span>
          <span class="stars-total">${Art.star(true)} ${Store.totalStars(p)}</span></button>`).join('')}
        <button class="tile add ${ps.length ? '' : 'pulse'}" data-act="new-profile"><span class="av">＋</span><span class="nm">طفل جديد</span></button>
      </div>
    </div><button class="icon-btn corner" data-act="parents" aria-label="لوحة الأهل">🔒</button></div>`);
  }

  function renderNewProfile() {
    S.screen = 'new';
    S.newAv = null;
    S.newGender = null;
    const used = new Set(Store.data.profiles.map(p => p.avatar));
    screen(`<div class="screen">
      <header class="topbar"><button class="icon-btn" data-act="home" aria-label="رجوع">→</button>
        <div class="title">طفل جديد</div><button class="icon-btn" data-act="say" data-key="new_profile" aria-label="اسمع">🔊</button></header>
      <div class="scroll">
        <div class="avatars">${T.AVATARS.map(a => `<button data-act="avatar" data-av="${a}" ${used.has(a) ? 'disabled' : ''}>${a}</button>`).join('')}</div>
        <div class="gender">
          <button data-act="gender" data-g="b"><span>👦</span>ولد</button>
          <button data-act="gender" data-g="g"><span>👧</span>بنت</button>
        </div>
        <label class="field"><input id="nameIn" maxlength="20" placeholder="الاسم (اختياري)" autocomplete="off" dir="auto"></label>
        <div class="actions"><button class="btn primary big" id="saveProfile" data-act="save-profile" disabled>✔ يلا نبدأ</button></div>
      </div></div>`);
    say('new_profile');
  }
  function updateNewProfileBtn() { $('#saveProfile').disabled = !(S.newAv && S.newGender); }

  // ---------- الخريطة ----------
  function topbarWho(back) {
    const p = S.profile, st = Store.totalStars(p);
    return `<header class="topbar">
      <button class="icon-btn" data-act="${back}" aria-label="رجوع">→</button>
      <div class="who"><span class="av">${esc(p.avatar)}</span><span class="nm">${nameHTML(p)}</span></div>
      <div class="title muted sub">${titleFor(st, p.gender)}</div>
      <span class="stars-total">${Art.star(true)} ${st}</span>`;
  }

  function renderMap() {
    stopRun(true);
    S.screen = 'map';
    screen(`<div class="screen">
      ${topbarWho('home')}
        <button class="icon-btn" data-act="glossary" aria-label="قاموسي">📖</button>
        <button class="icon-btn" data-act="family" aria-label="نجوم العائلة">👨‍👩‍👧</button>
        <button class="icon-btn" data-act="certs" aria-label="شهاداتي">📜</button>
      </header>
      <div class="scroll"><div class="worlds">
        ${WORLDS.map((w, wi) => {
          const n = w.levels.length, done = w.levels.filter(l => solved(l.id)).length;
          const locked = !worldUnlocked(wi);
          return `<button class="world-card theme-${w.theme} ${locked ? 'locked' : ''}" data-act="open-world" data-i="${wi}">
            <span class="ic">${locked && !w.soon ? '🔒' : w.icon}</span>
            <span><h3>${w.name}</h3><p>${esc(w.concept)}</p>
            <span class="prog">${w.soon ? 'قريباً' : `${done} / ${n} &nbsp; ${Art.star(true)} ${worldStars(wi)}`}${S.profile.certs[w.id] ? ' &nbsp;📜' : ''}</span></span>
          </button>`;
        }).join('')}
      </div></div></div>`);
    return maybeBreak();
  }

  function renderWorld(wi) {
    stopRun(true);
    S.screen = 'world';
    S.wi = wi;
    const w = WORLDS[wi];
    const nextLi = w.levels.findIndex(l => !solved(l.id));
    screen(`<div class="screen theme-${w.theme}">
      ${topbarWho('map')}</header>
      <div class="scroll">
        <div class="world-head"><span class="ic">${w.icon}</span><div><h2>${w.name}</h2><p class="muted" style="margin:0">${esc(w.concept)}</p></div></div>
        <div class="levels">
          ${w.levels.map((l, li) => {
            const p = prog(l.id), open = levelUnlocked(wi, li);
            const cls = p && p.solved ? 'done' : !open ? 'locked' : li === nextLi ? 'next' : '';
            return `<button class="lvl ${cls}" data-act="open-level" data-li="${li}">
              <span>${open ? li + 1 : '🔒'}</span><span class="st">${starsHTML(p ? p.stars : 0)}</span></button>`;
          }).join('')}
        </div>
      </div></div>`);
    return maybeBreak();
  }

  // ---------- المرحلة ----------
  function renderLevel(wi, li) {
    stopRun(true);
    const w = WORLDS[wi], L = w.levels[li];
    Object.assign(S, { screen: 'level', wi, li, level: L, program: [], active: 'root', history: [], fails: 0,
      usedSolution: false, offeredSolution: false, pendingCert: false, clearArm: false, delArm: null, won: false });
    screen(`<div class="screen theme-${w.theme}">
      <header class="topbar">
        <button class="icon-btn" data-act="back-world" aria-label="رجوع">→</button>
        <div class="title">${w.name} · ${li + 1}</div>
        <span class="stars-total" id="lvlStars">${starsHTML((prog(L.id) || {}).stars || 0)}</span>
        <button class="icon-btn" data-act="intro" aria-label="اسمع الشرح">🔊</button>
        <button class="icon-btn" id="hintBtn" data-act="hint" aria-label="تلميح">💡</button>
      </header>
      <main class="level-main">
        <section class="board-wrap" id="boardWrap"><div class="board" id="board"></div><div class="bubble hidden" id="bubble" data-act="hide-bubble"></div></section>
        <section class="code-wrap">
          <div class="program" id="program"></div>
          <div class="counter" id="counter"></div>
          <div class="palette" id="palette"></div>
          <div class="controls">
            <button class="btn primary run" id="runBtn" data-act="run">▶ تشغيل</button>
            <button class="icon-btn" id="speedBtn" data-act="speed" aria-label="السرعة">🐢</button>
            <button class="icon-btn" id="undoBtn" data-act="undo" aria-label="تراجع">↶</button>
            <button class="icon-btn" id="clearBtn" data-act="clear" aria-label="امسح الكل">🗑</button>
          </div>
        </section>
      </main></div>`);
    resetBoard();
    renderBoard();
    renderPalette();
    renderProgram();
    updateSpeedBtn();
    updateControls();
    showIntro();
  }

  function showIntro() {
    const L = S.level;
    showModal(`${munibBox('happy')}<p>${fmt(L.intro)}</p>
      <div class="actions"><button class="btn primary big" data-act="start-level">▶ يلا نبدأ</button>
      <button class="btn" data-act="intro-voice">🔊 اسمع</button></div>`);
    Voice.play(L.id + '_intro', voiceText(L.intro));
  }

  // ---------- اللوحة ----------
  function resetBoard() {
    const L = S.level;
    S.b = { cells: L.grid.map(r => r.split('')), x: L.start[0], y: L.start[1], angle: L.start[2] * 90, dirty: false };
  }

  // اللوحة لها إطار من الحواجز حولها، عشان الطفل يشوف إن حافة اللوحة حاجز
  function renderBoard() {
    const L = S.level, wrap = $('#boardWrap'), board = $('#board');
    if (!wrap || !board) return;
    const rows = L.grid.length + 2, cols = L.grid[0].length + 2;
    const r = wrap.getBoundingClientRect();
    const cell = Math.max(18, Math.floor(Math.min((r.width - 12) / cols, (r.height - 12) / rows, 100)));
    S.cell = cell;
    board.style.width = cols * cell + 'px';
    board.style.height = rows * cell + 'px';
    board.style.setProperty('--mv', S.speed > 300 ? '.32s' : '.16s');
    const theme = WORLDS[S.wi].theme;
    const wall = Art.WALLS[theme] || Art.palm, goal = Art.GOALS[theme] || Art.door;
    let h = '';
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx - 1, y = gy - 1;
        const frame = x < 0 || y < 0 || x >= cols - 2 || y >= rows - 2;
        const orig = frame ? '#' : L.grid[y][x], now = frame ? '#' : S.b.cells[y][x];
        let cls = (gx + gy) % 2 ? 'f2' : 'f1', inner = '';
        if (frame) cls += ' frame';
        if (orig === '#') { cls += ' wall'; inner = wall; }
        else if (orig === 'W') { cls = 'water'; inner = Art.waves; }
        else if (orig === 'G') { cls += ' goal'; inner = goal; }
        else if (orig === 'D') inner = `<span class="dates ${now === 'D' ? '' : 'gone'}" id="d-${x}-${y}">${Art.dates}</span>`;
        h += `<div class="cell ${cls}" id="c-${x}-${y}" style="left:${gx * cell}px;top:${gy * cell}px;width:${cell}px;height:${cell}px">${inner}</div>`;
      }
    }
    h += `<div class="robot instant" id="robot" style="width:${cell}px;height:${cell}px"><div class="robot-fx"><div class="robot-rot" id="robotRot">${Art.robotTop}</div></div></div>`;
    board.innerHTML = h;
    placeRobot();
    requestAnimationFrame(() => { const rb = $('#robot'); if (rb) rb.classList.remove('instant'); });
  }

  function placeRobot() {
    const rb = $('#robot'), rot = $('#robotRot');
    if (!rb) return;
    rb.style.transform = `translate(${(S.b.x + 1) * S.cell}px, ${(S.b.y + 1) * S.cell}px)`;
    rot.style.transform = `rotate(${S.b.angle}deg)`;
  }

  function robotFx(cls) {
    const rb = $('#robot');
    if (!rb) return;
    rb.classList.remove(cls);
    void rb.offsetWidth;
    rb.classList.add(cls);
  }

  // التلميح يرسم طريق الحل على اللوحة بنقاط، عشان الطفل اللي ما بيقرأ يفهمه
  function showTrail() {
    clearTrail();
    const res = E.run(E.fromCompact(S.level.solution), S.level);
    const done = new Set();
    const size = Math.max(8, Math.round(S.cell * 0.2));
    let n = 0;
    res.events.forEach(ev => {
      if (ev.kind !== 'move' || done.has(ev.x + ',' + ev.y)) return; // المربع الذي نمر عليه مرتين نرقّمه مرة واحدة
      done.add(ev.x + ',' + ev.y);
      const c = $(`#c-${ev.x}-${ev.y}`);
      if (c) c.insertAdjacentHTML('beforeend', `<span class="trail" style="animation-delay:${n * 0.12}s;font-size:${size}px">${++n}</span>`);
    });
    later('trail', clearTrail, 9000);
  }
  function clearTrail() {
    cancel('trail');
    document.querySelectorAll('.trail').forEach(el => el.remove());
  }

  // ---------- البرنامج ----------
  function locate(id, list = S.program, key = 'root') {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === id) return { list, key, index: i, block: b };
      if (b.body) { const r = locate(id, b.body, b.id + ':body'); if (r) return r; }
      if (b.orelse) { const r = locate(id, b.orelse, b.id + ':else'); if (r) return r; }
    }
    return null;
  }

  function findList(key) {
    if (key === 'root') return S.program;
    const [id, part] = key.split(':');
    const r = locate(id);
    if (!r) return null;
    return part === 'else' ? r.block.orelse : r.block.body;
  }

  // قبل أي تعديل نحفظ نسخة، وزر التراجع يرجّعها
  function snapshot() {
    S.history.push(JSON.stringify({ p: S.program, a: S.active, u: S.usedSolution }));
    if (S.history.length > 60) S.history.shift();
  }

  // depth = عدد التكرارات فوق البطاقة، عشان العدّاد يكون i ثم j ثم k
  function codeHTML(b, depth) {
    if (b.type === 'for') {
      const v = E.blockCode(b, depth).split(' ')[1];
      return `<code>for ${v} in range(</code><button class="num" data-act="num" data-id="${b.id}">${b.n}</button><code>):</code>`;
    }
    return `<code>${esc(E.blockCode(b, depth))}</code>`;
  }

  function listHTML(list, key, depth) {
    const on = S.active === key;
    return list.map(b => blockHTML(b, depth)).join('') +
      `<button class="slot ${on ? 'on' : ''} ${key === 'root' ? 'root' : ''}" data-act="slot" data-list="${key}" aria-label="ضع البطاقة التالية هنا">${on ? '＋ هنا' : '＋'}</button>`;
  }

  function blockHTML(b, depth) {
    const armed = S.delArm === b.id;
    const head = `<div class="card k-${b.kind}" data-id="${b.id}"><span class="ic">${ICON[b.kind]}</span><span class="code">${codeHTML(b, depth)}</span>
      <button class="del ${armed ? 'armed' : ''}" data-act="del" data-id="${b.id}" aria-label="حذف">${armed ? '؟' : '✕'}</button></div>`;
    if (!b.body) return head;
    const d = depth + (b.type === 'for' ? 1 : 0);
    let h = `<div class="cont k-${b.kind}">${head}<div class="body">${listHTML(b.body, b.id + ':body', d)}</div>`;
    if (b.orelse) h += `<div class="card else-head"><span class="ic">↘</span><span class="code"><code>else:</code></span></div><div class="body">${listHTML(b.orelse, b.id + ':else', d)}</div>`;
    return h + '</div>';
  }

  function renderProgram() {
    if (!findList(S.active)) S.active = 'root';
    $('#program').innerHTML = listHTML(S.program, 'root', 0);
    const n = E.countBlocks(S.program), max = S.level.maxBlocks;
    const c = $('#counter');
    c.className = 'counter' + (max && n >= max ? ' full' : '');
    c.innerHTML = `<span>البطاقات: <b>${n}${max ? ' / ' + max : ''}</b></span>${max ? `<span class="dots">${'●'.repeat(Math.min(n, max))}${'○'.repeat(Math.max(0, max - n))}</span>` : ''}`;
    $('#undoBtn').disabled = S.running || !S.history.length;
    const slot = $('#program .slot.on');
    if (slot) slot.scrollIntoView({ block: 'nearest' });
  }

  function renderPalette() {
    $('#palette').innerHTML = S.level.palette.map(k => `<button class="pal k-${k}" data-act="pal" data-k="${k}">
      <span class="pal-top"><span class="ic">${ICON[k]}</span><span lang="en">${esc(CHIP[k])}</span></span>
      <small>${T.KIND_AR[k]}</small></button>`).join('');
  }

  function addBlock(kind) {
    if (busy()) return;
    const max = S.level.maxBlocks;
    if (max && E.countBlocks(S.program) >= max) {
      const key = S.wi === 1 ? 'max_blocks_loop' : 'max_blocks';
      bubble('tip', sayText(key), 'wow');
      say(key);
      return;
    }
    snapshot();
    const b = E.makeBlock(kind);
    (findList(S.active) || S.program).push(b);
    if (b.body) S.active = b.id + ':body';
    Sound.tap();
    const en = T.KIND_EN[kind];
    const seq = [['en_' + en, T.EN[en], 'en'], ['kind_' + kind, T.KIND_AR[kind]]];
    // أول مرة يضيف الطفل بطاقة فيها بطاقات داخلها، منيب يشرح المربع المنقّط.
    // وفي المراحل التي تعلّم هذه الفكرة، يشرحها في كل مرة (لو الطفل قاطع الصوت أول مرة)
    const tip = kind === 'ifelse_wall' ? 'else_tip' : b.body ? 'slot_tip' : null;
    const teach = ['w2l0', 'w2l2', 'w3l4'].includes(S.level.id) && E.countBlocks(S.program) <= 2;
    if (tip && (!S.profile.seen[tip] || teach)) {
      S.profile.seen[tip] = true;
      Store.save();
      seq.push([tip, T.SAY[tip]]);
      afterEdit();
      bubble('tip', T.SAY[tip], 'happy');
    } else {
      afterEdit();
    }
    Voice.playSeq(seq);
  }

  function deleteBlock(id) {
    const r = locate(id);
    if (!r) return;
    // حذف بطاقة فيها بطاقات أخرى يحتاج ضغطتين، عشان ما تضيع بالغلط
    const kids = E.countBlocks([r.block]) > 1;
    if (kids && S.delArm !== id) {
      S.delArm = id;
      S.armAt = Date.now();
      renderProgram();
      later('delArm', () => { S.delArm = null; if (S.screen === 'level' && !busy()) renderProgram(); }, 2500);
      return;
    }
    if (kids && Date.now() - S.armAt < 400) return; // ضغطتين سريعتين جداً ما تحسب تأكيد
    cancel('delArm');
    S.delArm = null;
    snapshot();
    r.list.splice(r.index, 1);
    if (!findList(S.active)) S.active = r.key;
    Sound.tap();
    afterEdit();
  }

  function undo() {
    const last = S.history.pop();
    if (!last) return;
    const s = JSON.parse(last);
    S.program = s.p;
    S.active = s.a;
    S.usedSolution = !!s.u;
    Sound.tap();
    afterEdit();
  }

  function clearAll() {
    const btn = $('#clearBtn');
    if (!S.program.length) return;
    if (!S.clearArm) {
      S.clearArm = true;
      S.armAt = Date.now();
      say('clear_confirm');
      btn.textContent = '؟';
      btn.classList.add('pulse', 'armed');
      later('clearArm', () => {
        S.clearArm = false;
        const b = $('#clearBtn');
        if (b) { b.textContent = '🗑'; b.classList.remove('pulse', 'armed'); }
      }, 2500);
      return;
    }
    if (Date.now() - S.armAt < 400) return;
    cancel('clearArm');
    S.clearArm = false;
    btn.textContent = '🗑';
    btn.classList.remove('pulse', 'armed');
    snapshot();
    S.program = [];
    S.active = 'root';
    S.usedSolution = false;
    afterEdit();
  }

  function afterEdit() {
    hideBubble();
    clearMarks();
    clearTrail();
    if (S.b && S.b.dirty) { resetBoard(); renderBoard(); }
    renderProgram();
  }

  function pickNumber(id) {
    const b = locate(id).block;
    const max = S.wi >= 2 ? 24 : 12;
    // تحت كل رقم نقاط بعدده، عشان الصغار اللي ما بيقروا الأرقام
    const dots = n => (n <= 12 ? `<small>${'•'.repeat(n)}</small>` : '');
    showModal(`<h2>كم مرة؟</h2><div class="numgrid">${Array.from({ length: max }, (_, i) => i + 1)
      .map(n => `<button class="${n === b.n ? 'on' : ''}" data-act="set-num" data-id="${id}" data-n="${n}">${n}${dots(n)}</button>`).join('')}</div>`);
    say('how_many');
  }

  // ---------- التشغيل ----------
  function clearMarks() {
    document.querySelectorAll('.card.running, .card.failed').forEach(el => el.classList.remove('running', 'failed'));
  }
  function mark(id, cls) {
    document.querySelectorAll('.card.' + cls).forEach(el => el.classList.remove(cls));
    if (!id) return;
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) { el.classList.add(cls); el.scrollIntoView({ block: 'nearest' }); }
  }

  function updateControls() {
    const run = $('#runBtn');
    if (!run) return;
    run.textContent = S.running ? '⏹ إيقاف' : '▶ تشغيل';
    run.classList.toggle('primary', !S.running);
    run.classList.toggle('danger', S.running);
    run.disabled = S.won;
    document.querySelector('.code-wrap').classList.toggle('busy', busy());
    document.querySelectorAll('.pal, #clearBtn').forEach(el => { el.disabled = busy(); });
    $('#undoBtn').disabled = busy() || !S.history.length;
  }

  function updateSpeedBtn() {
    const b = $('#speedBtn');
    if (b) b.textContent = S.speed > 300 ? '🐢' : '🐇';
    const board = $('#board');
    if (board) board.style.setProperty('--mv', S.speed > 300 ? '.32s' : '.16s');
  }

  function stopRun(silent) {
    clearTimeout(S.timer);
    cancel('wet');
    cancel('winModal');
    cancel('offer');
    if (!S.running) return;
    S.running = false;
    if (silent) return;
    updateControls();
    clearMarks();
    resetBoard();
    renderBoard();
  }

  function runProgram() {
    if (S.won) return;
    if (S.running) {
      if (Date.now() - S.runAt < 600) return; // ضغطتين سريعتين ما توقف التشغيل فوراً
      stopRun();
      say('stopped');
      return;
    }
    Sound.unlock();
    Voice.stop();
    hideBubble();
    clearMarks();
    clearTrail();
    cancel('offer');
    // بطاقة "إذا وإلا" مكانها الثاني فارغ: نطلب من الطفل يملاه بدل ما يشتغل البرنامج ناقص
    const ee = E.emptyElse(S.program);
    if (ee) {
      mark(ee.id, 'failed');
      S.active = ee.id + ':else';
      renderProgram();
      mark(ee.id, 'failed');
      bubble('tip', T.SAY.else_empty, 'wow');
      say('else_empty');
      return;
    }
    cancel('delArm'); cancel('clearArm');
    S.delArm = null;
    if (S.clearArm) { S.clearArm = false; const cb = $('#clearBtn'); cb.textContent = '🗑'; cb.classList.remove('pulse', 'armed'); }
    resetBoard();
    renderBoard();
    S.b.dirty = true;
    const res = E.run(S.program, S.level);
    S.running = true;
    S.runAt = Date.now();
    updateControls();
    let i = 0;
    const tick = () => {
      if (!S.running) return;
      if (i >= res.events.length) { mark(null, 'running'); return finishRun(res); }
      const ev = res.events[i++];
      const fast = i > ANIM_LIMIT || Date.now() - S.runAt > 15000;
      mark(ev.id, 'running');
      let delay = fast ? 40 : S.speed;
      switch (ev.kind) {
        case 'move': S.b.x = ev.x; S.b.y = ev.y; placeRobot(); if (!fast) Sound.step(); break;
        case 'turn': S.b.angle += 90 * ev.dir; placeRobot(); if (!fast) Sound.turn(); break;
        case 'pick': {
          S.b.cells[ev.y][ev.x] = '.';
          const d = $(`#d-${ev.x}-${ev.y}`);
          if (d) d.classList.add('gone');
          Sound.pick();
          break;
        }
        case 'bump': robotFx('bump'); Sound.bump(); delay = 600; break;
        case 'splash': S.b.x = ev.x; S.b.y = ev.y; placeRobot(); later('wet', () => robotFx('wet'), 250); Sound.splash(); delay = 800; break;
        case 'nopick': robotFx('bump'); Sound.fail(); delay = 600; break;
        case 'check': if (!fast) Sound.check(); delay = fast ? 20 : Math.round(S.speed * 0.4); break;
      }
      S.timer = setTimeout(tick, delay);
    };
    S.timer = setTimeout(tick, 200);
  }

  function finishRun(res) {
    S.running = false;
    updateControls();
    if (res.ok) return win(res);
    if (res.reason !== 'empty') { S.fails++; Sound.fail(); }
    if (res.failId) mark(res.failId, 'failed');
    let key = 'fail_' + res.reason;
    if (res.reason === 'not_goal') {
      // ما وصل: لو في تكرار فالحل غالباً رقم أكبر، وإلا نكمل الطريق
      key = E.hasFor(S.program) ? 'fail_not_goal_loop' : WORLDS[S.wi].goal === 'boat' ? 'fail_not_goal_boat' : 'fail_not_goal';
    }
    bubble('bad', T.SAY[key], 'sad');
    say(key);
    if (S.fails >= 2) $('#hintBtn').classList.add('pulse');
    if (S.fails >= 5 && !S.offeredSolution) {
      S.offeredSolution = true;
      const L = S.level;
      later('offer', () => {
        if (S.screen !== 'level' || S.level !== L || S.running || modalRoot.innerHTML) return;
        showModal(`${munibBox('wow')}<p>${sayText('offer_solution')}</p><div class="actions">
          <button class="btn orange big" data-act="show-solution">👀 الحل</button>
          <button class="btn big" data-act="close">💪 سأحاول</button></div>`);
        say('offer_solution');
      }, 3500);
    }
  }

  function win(res) {
    cancel('offer');
    const L = S.level;
    const n = E.countBlocks(S.program), best = E.countBlocks(E.fromCompact(L.solution));
    let stars = S.usedSolution ? 1 : n <= best ? 3 : n <= best + 2 ? 2 : 1;
    // وصل قبل أن ينتهي التكرار: نجمتان، ونعلّمه الرقم الصحيح كما في بايثون الحقيقي
    const early = !S.usedSolution && res && res.early;
    if (early) stars = Math.min(stars, 2);
    const wasDone = worldDone(S.wi);
    const oldTitle = titleFor(Store.totalStars(S.profile), S.profile.gender);
    Store.recordWin(S.profile, L.id, stars);
    const newTitle = titleFor(Store.totalStars(S.profile), S.profile.gender);
    const w = WORLDS[S.wi];
    if (!wasDone && worldDone(S.wi) && !S.profile.certs[w.id]) {
      S.profile.certs[w.id] = Date.now();
      Store.save();
      S.pendingCert = true;
    }
    $('#lvlStars').innerHTML = starsHTML(prog(L.id).stars);
    $('#hintBtn').classList.remove('pulse');
    S.won = true;
    updateControls();
    Sound.win();
    robotFx('happy');
    const key = S.usedSolution ? 'win_solution' : 'win' + stars;
    const code = E.toPython(S.program).join('\n');
    later('winModal', () => {
      const seq = early
        ? [['win_early', T.SAY.win_early], ['num_' + early.used, T.NUMBERS[early.used]]]
        : [[sayKey(key), sayText(key)]];
      if (newTitle !== oldTitle) seq.push([sayKey('new_title'), sayText('new_title')]);
      Voice.playSeq(seq);
      const msg = early ? `${esc(T.SAY.win_early)} <b class="big-num">${early.used}</b>` : sayText(key);
      const last = S.li + 1 >= w.levels.length;
      showModal(`${munibBox('happy')}<div class="stars-big">${starsHTML(stars)}</div><p>${msg}</p>
        ${newTitle !== oldTitle ? `<p class="new-title">🏅 ${esc(sayText('new_title'))} <b>${esc(newTitle)}</b></p>` : ''}
        <p class="muted small-note">برنامجك بلغة بايثون:</p>
        <div class="code-view" lang="en">${esc(code)}</div>
        <div class="actions sticky">
          ${stars < 3 ? '<button class="btn big" data-act="retry">↻ مرة أخرى</button>' : ''}
          <button class="btn primary big" data-act="next-level">${last ? '✔ أكملت القسم' : '▶ التالي'}</button>
        </div>`, true);
    }, 900);
  }

  function bubble(kind, text, mood) {
    const b = $('#bubble');
    if (!b) return;
    b.className = 'bubble ' + kind;
    b.innerHTML = `<div class="munib">${Art.munib(mood || 'happy')}</div><div class="txt">${text}</div>`;
    // رسالة الخطأ تغطي جزءاً من اللوحة، فتختفي وحدها بعد قليل
    cancel('bubble');
    if (kind === 'bad') later('bubble', hideBubble, 6000);
    if (kind === 'hint') later('bubble', hideBubble, 9000); // التلميح تحت اللوحة، ويختفي مع نقاط الطريق
  }
  function hideBubble() { const b = $('#bubble'); if (b) b.className = 'bubble hidden'; }

  // ---------- الراحة ----------
  // التذكير بالراحة لا يقطع المرحلة: يظهر عند الخروج منها أو بعد الفوز
  function maybeBreak() {
    if (!S.breakDue || !S.profile) return false;
    S.breakDue = false;
    S.breakAt = Date.now();
    showModal(`${munibBox('sleepy')}<p>${sayText('break_time')}</p><div class="actions"><button class="btn primary big" data-act="home">👋 حاضر</button></div>`, true);
    say('break_time');
    return true;
  }

  setInterval(() => {
    const p = S.profile;
    if (!p || document.visibilityState !== 'visible' || ['home', 'new', 'parents'].includes(S.screen)) return;
    Store.addTime(p, 15);
    const lim = Store.data.parent.dailyMin;
    if (lim > 0 && Store.todaySec(p) >= lim * 60 && Date.now() - S.breakAt > 10 * 60e3) {
      S.breakDue = true;
      if (S.screen !== 'level' && !modalRoot.innerHTML) maybeBreak();
    }
  }, 15000);

  // ---------- الشهادة ----------
  function certCanvas(p, w) {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.width = 1400; c.height = 1000;
      const g = c.getContext('2d');
      const f = p.gender === 'g';
      const font = (size, bold) => `${bold ? 'bold ' : ''}${size}px "Segoe UI", Tahoma, "Noto Sans Arabic", sans-serif`;
      g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 1400, 1000);
      g.strokeStyle = '#2f8f5b'; g.lineWidth = 28; g.strokeRect(28, 28, 1344, 944);
      g.strokeStyle = '#f2b632'; g.lineWidth = 6; g.strokeRect(66, 66, 1268, 868);
      g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#23704a';
      g.font = font(88, true); g.fillText('شهادة إنجاز', 700, 200);
      g.fillStyle = '#7a6f63'; g.font = font(44); g.fillText(f ? 'تشهد لعبة عمران بأن البطلة' : 'تشهد لعبة عمران بأن البطل', 700, 300);
      g.fillStyle = '#2b2622'; g.font = font(100, true); g.fillText(((p.name ? p.name + ' ' : '') + p.avatar).trim(), 700, 440, 1150);
      g.font = font(54, true); g.fillText(`${f ? 'أكملت' : 'أكمل'} قسم «${w.name}» بنجاح`, 700, 570, 1150);
      g.fillStyle = '#7a6f63'; g.font = font(42); g.fillText((f ? 'وتعلّمت: ' : 'وتعلّم: ') + w.concept.split(':')[0], 700, 650, 1150);
      g.font = font(36); g.fillText(new Date(p.certs[w.id] || Date.now()).toLocaleDateString('ar'), 700, 760);
      g.fillStyle = '#2f7fb5'; g.font = font(40, true); g.fillText('صديقك منيب', 700, 860);
      g.fillStyle = '#f2b632'; g.font = font(70); g.fillText('★ ★ ★', 300, 860);
      const img = new Image();
      img.onload = () => { try { g.drawImage(img, 1040, 690, 220, 220); } catch (e) { /* نكمل بدون صورة منيب */ } resolve(c); };
      img.onerror = () => resolve(c);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Art.munib('happy').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" '));
    });
  }

  // لو فشل رسم الشهادة لأي سبب، الطفل يكمل اللعب عادي (والشهادة محفوظة في شهاداتي)
  function showCert(wi, then) {
    const w = WORLDS[wi], p = S.profile;
    const fallback = () => { if (then) then(); };
    certCanvas(p, w).then(c => c.toBlob(blob => {
      if (!blob) return fallback();
      if (S.certUrl) URL.revokeObjectURL(S.certUrl);
      S.certBlob = blob;
      S.certUrl = URL.createObjectURL(blob);
      S.certName = `شهادة-${p.name || 'عمران'}-${w.name}.png`;
      S.certThen = then || null;
      showModal(`<h2>📜 ${esc(sayText('cert'))}</h2><img class="cert-img" alt="شهادة" src="${S.certUrl}">
        <div class="actions sticky"><button class="btn blue" data-act="save-cert">💾 احفظ</button>
        <button class="btn primary big" data-act="cert-done">▶ متابعة</button></div>`, true);
      say('cert');
    }, 'image/png')).catch(fallback);
  }

  // ---------- القاموس والعائلة والشهادات ----------
  function renderGlossary() {
    S.screen = 'glossary';
    const open = g => solved(g.level); // الكلمة تظهر بعد أن يحل الطفل المرحلة التي تعلّمها
    screen(`<div class="screen">${topbarWho('map')}<button class="icon-btn" data-act="say" data-key="glossary" aria-label="اسمع">🔊</button></header>
      <div class="scroll"><h2 class="section-title">📖 قاموسي</h2><div class="list">
        ${T.GLOSSARY.map(g => open(g) ? `<div class="row">
          <div class="grow"><h4 class="gl-code" lang="en">${esc(g.code)}</h4><p>${glossFmt(g.ar)}</p></div>
          <div class="acts">${g.noEn ? '' : `<button class="btn small blue" data-act="gl-en" data-k="${g.k}">🔊 English</button>`}
          <button class="btn small" data-act="gl-ar" data-k="${g.k}">🔊 عربي</button></div></div>`
          : '<div class="row locked"><div class="grow"><h4>🔒 كلمة جديدة</h4><p>تظهر عندما نتعلّمها في اللعب</p></div></div>').join('')}
      </div></div></div>`);
    say('glossary');
  }

  // بدل ترتيب الأطفال ضد بعض: نجوم العائلة كلها معاً
  function renderFamily() {
    S.screen = 'family';
    const ps = Store.data.profiles;
    const total = ps.reduce((s, p) => s + Store.totalStars(p), 0);
    screen(`<div class="screen">${topbarWho('map')}<button class="icon-btn" data-act="say" data-key="family" aria-label="اسمع">🔊</button></header>
      <div class="scroll">
        <div class="family-total"><span>${Art.star(true)}</span><b>${total}</b><p>نجوم عائلتنا</p></div>
        <div class="tiles">
          ${ps.map(p => `<div class="tile ${p.id === S.profile.id ? 'me' : ''}"><span class="av">${esc(p.avatar)}</span>
            <span class="nm">${nameHTML(p) || '&nbsp;'}</span></div>`).join('')}
        </div>
      </div></div>`);
    say('family');
  }

  function renderCerts() {
    S.screen = 'certs';
    const got = WORLDS.map((w, wi) => ({ w, wi })).filter(x => S.profile.certs[x.w.id]);
    screen(`<div class="screen">${topbarWho('map')}</header>
      <div class="scroll"><h2 class="section-title">📜 شهاداتي</h2><div class="list">
        ${got.length ? got.map(x => `<button class="row as-btn" data-act="open-cert" data-i="${x.wi}">
          <span class="av">${x.w.icon}</span><div class="grow"><h4>شهادة قسم ${x.w.name}</h4><p>${esc(x.w.concept)}</p></div><span>📜</span></button>`).join('')
          : '<div class="row"><div class="grow"><h4>لا توجد شهادات بعد</h4><p>أكمل كل مراحل القسم لتحصل على شهادته.</p></div></div>'}
      </div></div></div>`);
  }

  // ---------- الأهل ----------
  function gate(onOk, hard) {
    const a = hard ? 120 + Math.floor(Math.random() * 380) : 12 + Math.floor(Math.random() * 8);
    const b = hard ? 13 + Math.floor(Math.random() * 25) : 6 + Math.floor(Math.random() * 4);
    S.gateOk = onOk;
    S.gateAns = a * b;
    showModal(`<h2>🔒 للكبار فقط</h2><p>كم يساوي <bdi>${a} × ${b}</bdi>؟</p>
      <label class="field"><input id="gateIn" inputmode="numeric" class="pin-input" autocomplete="off"></label>
      <p id="gateMsg" class="muted"></p>
      <div class="actions"><button class="btn primary" data-act="gate-ok">تأكيد</button><button class="btn" data-act="close">إلغاء</button></div>`);
    setTimeout(() => { const i = $('#gateIn'); if (i) i.focus(); }, 50);
  }

  function setPin() {
    showModal(`<h2>رقم سري للأهل</h2><p>اختر رقماً من 4 إلى 6 أرقام. ستحتاجه لدخول لوحة الأهل.</p>
      <label class="field"><input id="pinNew" inputmode="numeric" type="password" maxlength="6" class="pin-input" autocomplete="off"></label>
      <p id="pinMsg" class="muted"></p>
      <div class="actions"><button class="btn primary" data-act="pin-save">حفظ</button><button class="btn" data-act="close">إلغاء</button></div>`);
    setTimeout(() => { const i = $('#pinNew'); if (i) i.focus(); }, 50);
  }

  function openParents() {
    if (!Store.data.parent.pin) return gate(setPin);
    showModal(`<h2>🔒 لوحة الأهل</h2><p>أدخل الرقم السري</p>
      <label class="field"><input id="pinIn" inputmode="numeric" type="password" maxlength="6" class="pin-input" autocomplete="off"></label>
      <p id="pinMsg" class="muted"></p>
      <div class="actions"><button class="btn primary" data-act="pin-ok">دخول</button><button class="btn" data-act="close">إلغاء</button></div>
      <button class="btn small plain" data-act="pin-forgot">نسيت الرقم؟</button>`);
    setTimeout(() => { const i = $('#pinIn'); if (i) i.focus(); }, 50);
  }

  const mins = sec => Math.round(sec / 60);
  const timeText = sec => (sec >= 3600 ? `${(sec / 3600).toFixed(1)} ساعة` : `${mins(sec)} دقيقة`);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function renderParents() {
    closeModal();
    S.screen = 'parents';
    const d = Store.data, par = d.parent;
    const anyProgress = d.profiles.some(p => Object.keys(p.progress).length);
    const since = Math.max(d.lastBackup || 0, Math.min(...d.profiles.map(p => p.created || 0), Date.now()));
    const oldBackup = anyProgress && Date.now() - since > 7 * 864e5;
    screen(`<div class="screen">
      <header class="topbar"><button class="icon-btn" data-act="home" aria-label="رجوع">→</button><div class="title">لوحة الأهل</div></header>
      <div class="scroll">
        ${isIOS && !installed ? `<div class="notice">⚠️ على الآيباد والآيفون: متصفح سفاري يمسح التقدّم إذا لم تُفتح اللعبة لمدة أسبوع. لتجنّب ذلك، ثبّت اللعبة: اضغط زر المشاركة في المتصفح، ثم "إضافة إلى الشاشة الرئيسية"، وافتحها من أيقونتها دائماً.</div>` : ''}
        ${Store.saveFailed ? '<div class="notice">⚠️ المتصفح لا يسمح بحفظ التقدّم. لا تستخدم التصفح الخفي، وتأكد أن ذاكرة الجهاز ليست ممتلئة.</div>' : ''}
        ${oldBackup ? `<div class="notice">⚠️ لم تُحفظ نسخة احتياطية منذ أكثر من أسبوع. بعض الأجهزة تمسح بيانات المتصفح عند امتلاء الذاكرة، فاحفظ نسخة الآن واحتفظ بها في مكان آمن.
          <div class="actions" style="margin:8px 0 0;justify-content:flex-start"><button class="btn small orange" data-act="backup-all">💾 احفظ نسخة الآن</button></div></div>` : ''}
        <h3 class="section-title">الأطفال على هذا الجهاز (${d.profiles.length})</h3>
        <div class="list">
          ${d.profiles.length ? d.profiles.map(p => {
            const n = Object.values(p.progress).filter(x => x.solved).length;
            return `<div class="row"><span class="av">${esc(p.avatar)}</span><div class="grow">
              <h4>${nameHTML(p) || 'بدون اسم'} ${p.gender === 'g' ? '👧' : '👦'}</h4>
              <p>⭐ ${Store.totalStars(p)} · حلّ ${n} من ${totalLevels} مرحلة · اليوم ${mins(Store.todaySec(p))} دقيقة · المجموع ${timeText(p.totalSec || 0)}</p>
              <div class="acts" style="margin-top:6px">
                <button class="btn small blue" data-act="export-one" data-id="${esc(p.id)}">📤 نقل لجهاز آخر</button>
                <button class="btn small" data-act="reset-one" data-id="${esc(p.id)}">↺ تصفير</button>
                <button class="btn small danger" data-act="delete-one" data-id="${esc(p.id)}">🗑 حذف</button>
              </div></div></div>`;
          }).join('') : '<div class="row"><div class="grow"><p>لا يوجد أطفال بعد.</p></div></div>'}
        </div>

        <h3 class="section-title">الإعدادات</h3>
        <div class="settings">
          <label>وقت اللعب في اليوم
            <select data-change="daily">${[[0, 'بدون حد'], [15, '15 دقيقة'], [30, '30 دقيقة'], [45, '45 دقيقة'], [60, 'ساعة'], [90, 'ساعة ونصف']]
              .map(([v, t]) => `<option value="${v}" ${par.dailyMin === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label>صوت منيب <input type="checkbox" data-change="voice" ${par.voice !== false ? 'checked' : ''} class="check"></label>
          <div><button class="btn small" data-act="change-pin">🔑 تغيير الرقم السري</button></div>
        </div>

        <h3 class="section-title">النسخ الاحتياطي والنقل</h3>
        <div class="settings">
          <p style="margin:0;line-height:1.8">احفظ ملفاً فيه تقدّم كل الأطفال، وأرسله لنفسك بالواتساب أو انقله بفلاشة. لاسترجاعه أو لنقل طفل لجهاز آخر، افتح لوحة الأهل في الجهاز الآخر واختر "استرجاع من ملف". لا يضيع شيء: اللعبة تحتفظ بأفضل نتيجة لكل مرحلة.</p>
          <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn small orange" data-act="backup-all">💾 حفظ نسخة لكل الأطفال</button>
            <button class="btn small blue" data-act="import">📥 استرجاع من ملف</button>
          </div>
          <input type="file" id="importIn" accept=".json,application/json,application/octet-stream,text/plain" class="hidden">
        </div>

        <h3 class="section-title">مساعدة</h3>
        <div class="settings help">
          <div>• <b>تثبيت اللعبة:</b> افتح رابط اللعبة في المتصفح، ثم من قائمة المتصفح اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".</div>
          <div>• <b>بدون إنترنت:</b> بعد أول فتح، اللعبة تعمل بدون إنترنت. افتح الرابط مع الإنترنت من وقت لآخر لتصلك المراحل الجديدة.</div>
          <div>• <b>الخصوصية:</b> لا توجد إعلانات ولا حسابات، وكل البيانات تبقى على هذا الجهاز فقط.</div>
        </div>
        <div style="height:30px"></div>
      </div></div>`);
  }

  function importFile(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const n = Store.importData(JSON.parse(r.result));
        renderParents();
        message(`✔ تم استرجاع تقدّم ${n} ${n === 1 ? 'طفل' : 'أطفال'} بنجاح.`, 'happy');
      } catch (e) {
        message('هذا الملف ليس ملف عمران صحيح، أو لا يحتوي على أي طفل.', 'sad');
      }
    };
    r.readAsText(file);
  }

  // ---------- الأحداث ----------
  const ACT = {
    // إغلاق النافذة لا يقطع كلام منيب، عشان الطفل اللي ما بيقرأ يسمع الشرح كاملاً وهو ينظر للوحة
    'modal-bg': (t, e) => {
      if (e.target !== t || Date.now() - S.modalAt < 400) return;
      closeModal();
    },
    close: () => closeModal(),
    say: t => say(t.dataset.key),
    home: () => { closeModal(); renderHome(); say(Store.data.profiles.length ? 'welcome' : 'welcome_first'); },
    'new-profile': () => renderNewProfile(),
    avatar: t => {
      S.newAv = t.dataset.av;
      document.querySelectorAll('.avatars button').forEach(b => b.classList.toggle('on', b === t));
      Sound.tap();
      updateNewProfileBtn();
    },
    gender: t => {
      S.newGender = t.dataset.g;
      document.querySelectorAll('.gender button').forEach(b => b.classList.toggle('on', b === t));
      Sound.tap();
      updateNewProfileBtn();
    },
    'save-profile': () => {
      if (!S.newAv || !S.newGender) return;
      S.profile = Store.addProfile($('#nameIn').value, S.newAv, S.newGender);
      if (!renderMap()) say('map');
    },
    'pick-profile': t => {
      S.profile = Store.getProfile(t.dataset.id);
      if (!S.profile) return renderHome();
      S.breakAt = 0;
      S.breakDue = false;
      if (!renderMap()) say('map');
    },
    map: () => renderMap(),
    'open-world': t => {
      const wi = +t.dataset.i;
      if (WORLDS[wi].soon) { say('coming_soon'); message(T.SAY.coming_soon, 'happy'); return; }
      if (!worldUnlocked(wi)) { say('world_locked'); message('🔒 ' + T.SAY.world_locked, 'wow'); return; }
      if (!renderWorld(wi)) say('world');
    },
    'open-level': t => {
      const li = +t.dataset.li;
      if (!levelUnlocked(S.wi, li)) { say('level_locked'); message('🔒 ' + T.SAY.level_locked, 'wow'); return; }
      renderLevel(S.wi, li);
    },
    'back-world': () => { Voice.stop(); renderWorld(S.wi); },
    intro: () => showIntro(),
    'start-level': () => closeModal(),
    'intro-voice': () => Voice.play(S.level.id + '_intro', voiceText(S.level.intro)),
    hint: () => {
      const L = S.level;
      bubble('hint', fmt(L.hint), 'happy');
      Voice.playSeq([['hint_trail', T.SAY.hint_trail], [L.id + '_hint', voiceText(L.hint)]]);
      showTrail();
      $('#hintBtn').classList.remove('pulse');
    },
    'hide-bubble': () => hideBubble(),
    pal: t => addBlock(t.dataset.k),
    slot: t => { if (busy()) return; S.active = t.dataset.list; Sound.tap(); renderProgram(); },
    del: t => { if (!busy()) deleteBlock(t.dataset.id); },
    num: t => { if (!busy()) pickNumber(t.dataset.id); },
    'set-num': t => {
      const r = locate(t.dataset.id);
      if (r) { snapshot(); r.block.n = +t.dataset.n; }
      Voice.play('num_' + t.dataset.n, T.NUMBERS[+t.dataset.n]);
      closeModal();
      afterEdit();
    },
    undo: () => { if (!busy()) undo(); },
    clear: () => { if (!busy()) clearAll(); },
    run: () => runProgram(),
    speed: () => { S.speed = S.speed > 300 ? 220 : 420; updateSpeedBtn(); },
    retry: () => {
      closeModal();
      Voice.stop();
      S.won = false;
      if (S.usedSolution) { snapshot(); S.program = []; S.active = 'root'; S.usedSolution = false; }
      resetBoard(); renderBoard(); renderProgram(); updateControls();
      if (S.pendingCert) { S.pendingCert = false; showCert(S.wi); }
    },
    'next-level': () => {
      closeModal();
      const w = WORLDS[S.wi];
      const go = () => {
        if (maybeBreak()) return;
        if (S.li + 1 < w.levels.length) return renderLevel(S.wi, S.li + 1);
        if (renderMap()) return;
        // أكمل آخر قسم موجود والأقسام الباقية قادمة قريباً
        const next = WORLDS[S.wi + 1];
        if (!next || next.soon) { message(T.SAY.all_done, 'happy'); say('all_done'); } else say('map');
      };
      if (S.pendingCert) { S.pendingCert = false; showCert(S.wi, go); } else go();
    },
    'show-solution': () => {
      snapshot();
      S.program = E.fromCompact(S.level.solution);
      S.active = 'root';
      S.usedSolution = true;
      closeModal();
      resetBoard(); renderBoard(); renderProgram();
      bubble('tip', T.SAY.solution_loaded, 'happy');
      say('solution_loaded');
    },
    // الأطفال يحفظون الشهادة فقط. على الآيباد المثبّت التنزيل لا يعمل، فنستخدم نافذة الحفظ والمشاركة
    'save-cert': () => { if (S.certBlob) (isIOS && installed ? shareOrDownload : download)(S.certBlob, S.certName); },
    'cert-done': () => { closeModal(); const f = S.certThen; S.certThen = null; if (f) f(); },
    'open-cert': t => showCert(+t.dataset.i),
    glossary: () => renderGlossary(),
    family: () => renderFamily(),
    certs: () => renderCerts(),
    'gl-en': t => Voice.play('en_' + t.dataset.k, T.EN[t.dataset.k], 'en'),
    'gl-ar': t => { const g = T.GLOSSARY.find(x => x.k === t.dataset.k); Voice.play('gl_' + g.k, g.say || g.ar); },

    parents: () => openParents(),
    'gate-ok': () => {
      if (+toAscii($('#gateIn').value) === S.gateAns) { const f = S.gateOk; S.gateOk = null; f(); }
      else $('#gateMsg').textContent = 'الإجابة غير صحيحة.';
    },
    'pin-ok': () => {
      if (toAscii($('#pinIn').value) === Store.data.parent.pin) renderParents();
      else { $('#pinMsg').textContent = 'الرقم غير صحيح.'; $('#pinIn').value = ''; }
    },
    'pin-forgot': () => gate(setPin, true),
    'change-pin': () => setPin(),
    'pin-save': () => {
      const v = toAscii($('#pinNew').value);
      if (!/^\d{4,6}$/.test(v)) { $('#pinMsg').textContent = 'اكتب من 4 إلى 6 أرقام.'; return; }
      Store.data.parent.pin = v;
      Store.save();
      renderParents();
    },
    'export-one': t => {
      const p = Store.getProfile(t.dataset.id);
      if (!p) return renderParents();
      saveJSON(Store.exportProfile(p), `عمران-${p.name || 'طفل'}.json`);
    },
    'reset-one': t => {
      const p = Store.getProfile(t.dataset.id);
      if (!p) return renderParents();
      if (confirm(`تصفير كل تقدّم «${p.name || p.avatar}»؟ لا يمكن التراجع.`)) { Store.resetProfile(p.id); renderParents(); }
    },
    'delete-one': t => {
      const p = Store.getProfile(t.dataset.id);
      if (!p) return renderParents();
      if (confirm(`حذف «${p.name || p.avatar}» نهائياً؟ لا يمكن التراجع.`)) { Store.deleteProfile(p.id); renderParents(); }
    },
    'backup-all': () => {
      const d = new Date();
      saveJSON(Store.exportAll(), `عمران-نسخة-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.json`);
      setTimeout(() => { if (S.screen === 'parents') renderParents(); }, 300);
    },
    import: () => $('#importIn').click(),
  };

  // اللوحة والبطاقات تقبل الضغط السريع، وباقي الأزرار لا تقبل لمسة ثانية بعد تغيّر الشاشة مباشرة
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    if (Date.now() - S.closedAt < 300) return;
    if (Date.now() < S.lockUntil && !t.closest('.palette, .program')) return;
    const f = ACT[t.dataset.act];
    if (f) f(t, e);
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'importIn' && t.files && t.files[0]) { importFile(t.files[0]); t.value = ''; return; }
    if (t.dataset.change === 'daily') { Store.data.parent.dailyMin = +t.value; Store.save(); }
    if (t.dataset.change === 'voice') { Store.data.parent.voice = t.checked; Store.save(); if (!t.checked) Voice.stop(); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const bg = $('#modal [data-act="modal-bg"]'); if (bg) { Voice.stop(); closeModal(); } return; }
    if (e.key !== 'Enter') return;
    const btn = $('#modal [data-act="gate-ok"], #modal [data-act="pin-ok"], #modal [data-act="pin-save"]');
    if (btn) btn.click();
  });

  // لما الطفل يخرج من التطبيق: يسكت منيب ويقف التشغيل
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    Voice.stop();
    cancel('offer');
    if (S.running) stopRun();
  });

  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (S.screen === 'level') renderBoard(); }, 150);
  });
  // لو اللعبة مفتوحة في نافذة ثانية وحفظت تقدّماً، نقرأه هنا من غير ما نقطع ما يفعله الطفل
  Store.onChange = () => {
    const had = !!S.profile;
    if (S.profile) S.profile = Store.getProfile(S.profile.id);
    if (had && !S.profile) { closeModal(); return renderHome(); }
    if (modalRoot.innerHTML || S.running) return;
    const lock = S.lockUntil;
    setTimeout(() => { S.lockUntil = lock; }); // التحديث من نافذة أخرى لا يوقف لمسات الطفل
    if (S.screen === 'home') renderHome();
    else if (S.screen === 'map') renderMap();
    else if (S.screen === 'world') renderWorld(S.wi);
    else if (S.screen === 'parents') renderParents();
  };

  Store.load();
  Store.requestPersist();
  renderHome();
})();

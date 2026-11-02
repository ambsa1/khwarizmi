/* بيت الخوارزمي: الشاشات وتسلسل اللعب */
(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app'), modal = $('#modal');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const plain = s => String(s).replace(/[ً-ْ]/g, ''); // التشكيل للصوت فقط، والشاشة بدونه
  const { SAY, CARD } = window.SIRAJ_TEXTS;

  const S = { screen: 'home', player: null, track: null, li: 0, stage: null, ws: null, running: false, run: 0, lock: 0, timers: [], sirajs: [], msirajs: [] };
  const girl = () => S.player && S.player.gender === 'g';
  const key = k => (girl() && SAY[k + '_f'] ? k + '_f' : k);
  const line = k => [key(k), SAY[key(k)]];
  const say = k => Voice.play(...line(k));
  const little = () => S.player && S.player.age <= 4;
  const showCode = () => !S.player || S.player.age >= 7;
  const level = () => TRACKS[S.track].levels[S.li];
  const later = (fn, ms) => S.timers.push(setTimeout(fn, ms));

  function cleanup() {
    S.run++; // أي تشغيل قديم يقيف
    S.timers.forEach(clearTimeout); S.timers = [];
    if (S.ws) { Blocks.dispose(S.ws); S.ws = null; }
    if (S.stage) { S.stage.destroy(); S.stage = null; }
    S.sirajs.forEach(s => s.destroy()); S.sirajs = [];
    closeModal();
    S.running = false;
  }
  function screen(html, cls) {
    cleanup();
    S.lock = Date.now() + 350;
    app.innerHTML = `<div class="screen ${cls || ''}">${html}</div>`;
  }
  const live = (el, color, opts) => { const s = Siraj.create(el, color, opts); S.sirajs.push(s); return s; };
  const mini = (color, lit = true) => Siraj.svg(color, { lit, shadow: false });

  function showModal(html, sticky) {
    S.lock = Date.now() + 350;
    modal.innerHTML = `<div class="m-back" ${sticky ? '' : 'data-act="m-close-bg"'}><div class="m-card" role="dialog" aria-modal="true">${html}</div></div>`;
    gsap.fromTo('.m-card', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
  }
  function closeModal() {
    S.msirajs.forEach(s => s.destroy()); S.msirajs = [];
    modal.innerHTML = '';
  }

  /* ---------- الشاشة الرئيسية ---------- */
  function renderHome() {
    S.player = null; S.screen = 'home';
    const ps = Store.data.players.slice().sort((a, b) => (a.fid || 'z').localeCompare(b.fid || 'z'));
    screen(`<div class="sky"></div>
      <div class="home">
        <div class="logo"><div class="hero" id="hero"></div><h1>بيت الخوارزمي</h1><p>ساعد سراج يرجّع النور للمدينة</p></div>
        <h2 class="who">من سيلعب اليوم؟</h2>
        <div class="players">
          ${ps.map(p => `<button class="player ${p.fid ? 'fam' : ''}" data-act="pick" data-id="${esc(p.id)}">
            <span class="pic">${mini(p.color)}</span><b>${esc(p.name) || '&nbsp;'}</b><small>⭐ ${Store.stars(p)}</small></button>`).join('')}
          <button class="player add" data-act="new"><span class="plus">＋</span><b>لاعب جديد</b></button>
        </div>
      </div>
      <button class="corner" data-act="parents" aria-label="للأهل">🔒</button>`, 'night');
    live($('#hero'), '#3d8bff');
    gsap.from('.player', { y: 30, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'back.out(2)' });
  }

  /* ---------- لاعب جديد ---------- */
  function renderNew() {
    S.screen = 'new';
    S.np = { color: Siraj.COLORS[0], age: null, gender: null };
    screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="home" aria-label="رجوع">→</button><span class="t">لاعب جديد</span></header>
      <div class="newp">
        <div class="preview" id="pv"></div>
        <div class="swatches">${Siraj.COLORS.map((c, i) => `<button class="sw ${i ? '' : 'on'}" style="background:${c}" data-act="color" data-c="${c}" aria-label="لون"></button>`).join('')}</div>
        <input id="nm" maxlength="16" placeholder="اسمك (اختياري)" autocomplete="off" dir="auto">
        <div class="lbl">عمرك</div>
        <div class="ages">${[3, 4, 5, 6, 7, 8, 9, 10].map(a => `<button data-act="age" data-a="${a}">${a}</button>`).join('')}</div>
        <div class="gender"><button data-act="gender" data-g="b">👦 ولد</button><button data-act="gender" data-g="g">👧 بنت</button></div>
        <button class="big-go" id="saveNp" data-act="save-new" disabled>✔ يلا نبدأ</button>
      </div>`, 'night');
    S.pv = live($('#pv'), S.np.color);
  }
  function npReady() { $('#saveNp').disabled = !(S.np.age && S.np.gender); }

  /* ---------- اختيار القسم ---------- */
  const allLevels = () => TRACKS.reduce((a, t) => a.concat(t.levels), []);
  function renderSections() {
    const p = S.player;
    S.screen = 'sections';
    screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="home" aria-label="رجوع">→</button><span class="t">أهلاً ${esc(p.name)}!</span><span class="chip">⭐ ${Store.stars(p)}</span></header>
      <div class="sections">
        <button class="door code" data-act="code"><span class="d-pic">${mini(p.color)}</span><span><h3>البرمجة مع سراج</h3><p>برمج سراج يتكلم ويرسم وينوّر المدينة</p>
          <span class="lamps">${allLevels().map(l => `<i class="${Store.solved(p, l.id) ? 'on' : ''}"></i>`).join('')}</span></span></button>
        <button class="door pc" data-act="pc"><span class="d-pic big">💻</span><span><h3>عالم الكمبيوتر</h3><p>أجزاء الكمبيوتر، مدرسة الكتابة، والأمان في الإنترنت</p><span class="soon">قريباً</span></span></button>
      </div>`, 'night');
    gsap.from('.door', { x: 60, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(1.6)' });
  }

  /* ---------- خريطة البرمجة ---------- */
  function renderTracks() {
    const p = S.player;
    S.screen = 'tracks';
    screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="sections" aria-label="رجوع">→</button><span class="t">البرمجة مع سراج</span><span class="chip">⭐ ${Store.stars(p)}</span></header>
      <div class="tracks">
        ${TRACKS.map((t, ti) => {
          const next = t.levels.findIndex(l => !Store.solved(p, l.id));
          return `<div class="track" style="--tc:${t.color}">
            <div class="track-head"><span class="ti">${t.icon}</span><span><h3>${t.name}</h3><p>${t.idea}</p></span></div>
            <div class="track-lamps">${t.levels.map((l, li) => {
              const st = p.progress[l.id] || 0, open = li === 0 || Store.solved(p, t.levels[li - 1].id) || st > 0;
              return `<button class="lv ${st ? 'done' : ''} ${open ? '' : 'locked'} ${li === next ? 'next' : ''}" data-act="level" data-t="${ti}" data-l="${li}">
                <span class="bulb">${st ? '💡' : open ? li + 1 : '🔒'}</span><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span></button>`;
            }).join('')}</div></div>`;
        }).join('')}
      </div>`, 'night');
    gsap.from('.track', { y: 30, opacity: 0, stagger: 0.1, duration: 0.45, ease: 'back.out(1.6)' });
  }

  /* ---------- المرحلة ---------- */
  function renderLevel(ti, li) {
    const t = TRACKS[ti], L = t.levels[li], p = S.player;
    S.screen = 'level'; S.track = ti; S.li = li; S.fails = 0;
    const lit = little();
    screen(`<header class="bar"><button class="ib" data-act="tracks" aria-label="رجوع">→</button>
        <span class="t">${t.icon} ${t.name}</span><span class="chip">${li + 1}/${t.levels.length}</span>
        <button class="ib" data-act="goal" aria-label="اسمع المطلوب">🔊</button></header>
      <section class="stage-wrap"><div class="stage" id="stage"></div>
        <div class="goal">🎯 ${esc(plain(L.goal))}</div>
        <div class="toast" id="toast"></div></section>
      <section class="editor ${lit ? 'little' : ''}">
        ${lit ? '<div class="strip" id="strip"></div><div class="lpal" id="lpal"></div>'
          : `<div class="ws" id="ws" dir="ltr"></div>
             <div class="py ${showCode() ? '' : 'folded'}" id="pyBox"><button class="py-head" data-act="py">🐍 Python <span id="cnt"></span></button><pre id="py" dir="ltr"></pre></div>`}
      </section>
      ${lit ? '' : `<footer class="controls"><button class="run" id="run" data-act="run">▶ شغّل</button>
        <button class="sq" data-act="undo" aria-label="تراجع">↶</button><button class="sq" data-act="reset" aria-label="من البداية">↺</button></footer>`}`,
      'level t-' + t.id);
    S.stage = new Stages[t.id]($('#stage'), L, p.color);
    S.stage.mount();
    if (lit) buildLittle(t, L);
    else { S.ws = Blocks.makeWorkspace($('#ws'), L.blocks, L.max, onWs); updateCode(); }
    // الهدف أولاً، ثم النصيحة، في تسلسل واحد عشان ما يقطع بعض
    const seq = [['goal_' + L.id, L.goal]];
    if (lit) seq.push(line('little'));
    else if (L.tip) seq.push(line(L.tip));
    later(() => Voice.playSeq(seq), 350);
    if (!lit && L.tip) later(() => toast(SAY[key(L.tip)], 'tip'), 2600);
  }

  function onWs(e) {
    if (e.full) {
      const L = level(), k = L.blocks.includes('siraj_repeat') ? 'use_loop' : 'full';
      toast(SAY[key(k)], 'bad'); say(k); return;
    }
    if (e.added) Voice.play('k_' + e.added, CARD[e.added]);
    if (e.phrase) { const i = SIRAJ_TEXTS.PHRASES.findIndex(p => p[0] === e.phrase); if (i >= 0) Voice.play('ph_' + i, SIRAJ_TEXTS.PHRASES[i][1]); }
    if (!S.running) { S.failId = null; updateCode(); }
  }
  function updateCode(activeId, bad) {
    if (!S.ws) return;
    const { lines, map } = Blocks.python(S.ws);
    const cur = activeId != null ? map[activeId] : -1;
    $('#py').innerHTML = lines.length
      ? lines.map((l, i) => `<span class="ln ${i === cur ? (bad ? 'bad' : 'cur') : ''}"><i>${i + 1}</i>${hl(l)}</span>`).join('')
      : '<span class="ln muted"><i>1</i># start</span>';
    const n = Blocks.countBlocks(S.ws), max = level().max;
    $('#cnt').textContent = max ? `${n}/${max}` : n;
    const pre = $('#py'), el = pre.querySelector('.cur, .bad');
    if (el) pre.scrollTop = el.offsetTop - pre.clientHeight / 2;
  }
  // تلوين كود بايثون
  function hl(l) {
    return esc(l)
      .replace(/&quot;(.*?)&quot;/g, '<b class="s">&quot;<bdi>$1</bdi>&quot;</b>')
      .replace(/\b(for|in|range|pass|if|else|while|def)\b/g, '<b class="k">$1</b>')
      .replace(/\b(say|wave|jump|forward|right|left|move_up|move_down|move_left|move_right)(?=\()/g, '<b class="f">$1</b>')
      .replace(/\b(\d+)\b/g, '<b class="n">$1</b>');
  }

  function toast(text, kind) {
    const t = $('#toast');
    if (!t) return;
    t.className = 'toast show ' + (kind || '');
    t.textContent = plain(text);
    gsap.fromTo(t, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
    clearTimeout(S.toastT);
    S.toastT = setTimeout(() => { if ($('#toast')) gsap.to('#toast', { opacity: 0, duration: 0.3 }); }, 3200);
  }

  function setBusy(on) {
    S.running = on;
    const r = $('#run');
    if (r) r.disabled = on;
    if (S.ws && S.ws.setIsReadOnly) S.ws.setIsReadOnly(on); // ما نعدّل البرنامج وهو شغّال
  }

  async function run() {
    if (S.running || !S.ws) return;
    const L = level(), ops = Blocks.compile(S.ws);
    if (!ops.length) { toast(SAY[key('empty')], 'bad'); say('empty'); return; }
    const my = ++S.run, stage = S.stage, ws = S.ws;
    const alive = () => my === S.run;
    setBusy(true);
    Voice.stop();
    stage.reset();
    ws.highlightBlock(null);
    let failAt = null;
    try {
      await sleep(250);
      for (const o of ops) {
        if (!alive()) return;
        ws.highlightBlock(o.id);
        updateCode(o.id);
        if (!(await stage.exec(o))) { failAt = o.id; break; }
      }
      if (!alive()) return;
      const res = stage.result();
      if (res.ok) {
        ws.highlightBlock(null); updateCode();
        return await win(L, Blocks.countBlocks(ws), my);
      }
      // البطاقة اللي حصل فيها الخطأ تفضل ملوّنة لحدي ما الطفل يعدّل
      failAt = failAt || (ops.length ? ops[ops.length - 1].id : null);
      ws.highlightBlock(failAt); updateCode(failAt, true);
      fail(res.reason);
    } finally {
      if (alive()) setBusy(false);
    }
  }

  function fail(reason) {
    S.fails++;
    Sfx.oops();
    toast(SAY[reason] || SAY[key('retry')], 'bad');
    Voice.play(...(SAY[reason] ? [reason, SAY[reason]] : line('retry')));
  }

  async function win(L, n, my) {
    const lit = little();
    const stars = lit ? 3 : n <= L.best ? 3 : n <= L.best + 2 ? 2 : 1; // الصغار دايماً ثلاث نجوم
    const p = S.player;
    Store.win(p, L.id, stars);
    Sfx.win();
    FX.confetti();
    await S.stage.celebrate();
    if (my !== S.run) return;
    const w = 'win' + (1 + Math.floor(Math.random() * 3));
    const code = S.ws ? Blocks.python(S.ws).lines : S.littleCode || [];
    Voice.playSeq([line(w)].concat(stars < 3 ? [line('fewer')] : []));
    const t = TRACKS[S.track], last = S.li + 1 >= t.levels.length;
    showModal(`<div class="w-siraj" id="wsj"></div>
      <h2>${plain(SAY[key(w)])}</h2>
      <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
      ${stars < 3 ? `<p class="hint">${plain(SAY[key('fewer')])}</p>` : ''}
      ${code.length ? `<pre class="w-code" dir="ltr">${code.map(hl).join('\n')}</pre>` : ''}
      <div class="w-acts">${stars < 3 ? '<button class="sq" data-act="again" aria-label="مرة أخرى">↻</button>' : ''}
        <button class="run" data-act="next">${last ? '✔ تم' : '▶ التالي'}</button></div>`, true);
    const s = Siraj.create($('#wsj'), p.color); S.msirajs.push(s); s.happy();
    gsap.from('.w-stars span.on', { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.2 });
  }

  /* ---------- وضع الصغار: كل ضغطة تتنفّذ فوراً ---------- */
  const ARROWS = [{ op: 'up', i: '⬆️' }, { op: 'down', i: '⬇️' }, { op: 'left', i: '⬅️' }, { op: 'right', i: '➡️' }];
  function littlePalette(t, L) {
    if (t.id === 'talk') {
      // نفس الأفعال المطلوبة في المرحلة، بدون تكرار
      const seen = new Set();
      return L.target.filter(a => !seen.has(a) && seen.add(a)).map(a => a.startsWith('say:') ? { op: 'say', arg: a.slice(4) } : { op: a });
    }
    return ARROWS.map(a => ({ op: a.op }));
  }
  const LICON = {
    say: o => { const p = SIRAJ_TEXTS.PHRASES.find(x => x[0] === o.arg); return `${p ? p[2] : '💬'}<small>${esc(o.arg)}</small>`; },
    wave: () => '👋', jump: () => '🦘', up: () => '⬆️', down: () => '⬇️', left: () => '⬅️', right: () => '➡️',
  };
  const LPY = (t, o) => (o.op === 'say' ? `say("${o.arg}")` : t.id === 'path' ? `move_${o.op}()` : t.id === 'draw' ? `draw_${o.op}()` : o.op + '()');
  function buildLittle(t, L) {
    S.lpal = littlePalette(t, L);
    S.littleCode = [];
    $('#lpal').innerHTML = S.lpal.map((o, i) => `<button class="lb" data-act="lb" data-i="${i}" style="--tc:${t.color}">${LICON[o.op](o)}</button>`).join('');
    $('#strip').innerHTML = '';
  }
  function resetLittle() {
    if (!S.stage) return;
    S.stage.reset(); S.littleCode = [];
    const st = $('#strip'); if (st) st.innerHTML = '';
  }
  async function littleTap(i) {
    if (S.running || !S.stage) return;
    const t = TRACKS[S.track], L = level(), o = S.lpal[i], my = S.run, stage = S.stage;
    S.running = true;
    try {
      S.littleCode.push(LPY(t, o));
      $('#strip').insertAdjacentHTML('beforeend', `<span class="sb" style="--tc:${t.color}">${LICON[o.op](o)}</span>`);
      gsap.from('#strip .sb:last-child', { scale: 0, duration: 0.35, ease: 'back.out(3)' });
      const ok = await stage.exec(o);
      if (my !== S.run) return;
      const res = stage.result();
      if (res.ok) { await win(L, 0, my); return; }
      if (!ok) { fail(res.reason); S.littleCode.pop(); $('#strip .sb:last-child').remove(); return; } // اصطدام: نرجع خطوة بس
      const talkWrong = t.id === 'talk' && stage.actions[stage.actions.length - 1] !== L.target[stage.actions.length - 1];
      if (res.reason === 'draw_extra' || talkWrong) {
        fail(res.reason === 'draw_extra' ? 'draw_extra' : 'talk_order');
        await sleep(900);
        if (my === S.run) resetLittle();
      }
    } finally {
      if (my === S.run) S.running = false;
    }
  }

  /* ---------- الأهل ---------- */
  function parents() {
    const a = 6 + Math.floor(Math.random() * 4), b = 12 + Math.floor(Math.random() * 8);
    S.gate = a * b;
    showModal(`<h2>🔒 للكبار</h2><p>كم يساوي <bdi>${a} × ${b}</bdi>؟</p>
      <input id="gate" inputmode="numeric" class="inp"><p class="err" id="gerr"></p>
      <div class="w-acts"><button class="run" data-act="gate">دخول</button></div>`);
  }
  function parentsPanel() {
    const d = Store.data;
    showModal(`<h2>لوحة الأهل</h2>
      ${d.family ? '<p class="ok">✔ وضع العائلة مفعّل</p>' : `<p>رمز العائلة</p><input id="fam" class="inp" autocomplete="off"><p class="err" id="ferr"></p><button class="sq wide" data-act="family">تفعيل</button>`}
      <label class="row"><span>صوت سراج</span><input type="checkbox" id="vc" ${d.settings.voice ? 'checked' : ''}></label>
      <div class="plist">${d.players.map(p => `<div class="prow"><span class="pic">${mini(p.color)}</span><b>${esc(p.name) || '—'}</b><small>${p.age} سنين · ⭐ ${Store.stars(p)}</small>
        <button class="del" data-act="delp" data-id="${esc(p.id)}" aria-label="حذف">🗑</button></div>`).join('')}</div>
      <div class="w-acts"><button class="run" data-act="m-close">تم</button></div>`);
  }

  /* ---------- الأحداث ---------- */
  const toAscii = s => String(s || '').replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).trim();
  const ACT = {
    home: () => renderHome(),
    'm-close-bg': (t, e) => { if (e.target === t) closeModal(); },
    'm-close': () => renderHome(),
    new: () => { renderNew(); say('newp'); },
    color: t => {
      S.np.color = t.dataset.c;
      document.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b === t));
      S.pv.destroy(); S.sirajs = S.sirajs.filter(s => s !== S.pv);
      S.pv = live($('#pv'), S.np.color); S.pv.happy(); Sfx.tap();
    },
    age: t => { S.np.age = +t.dataset.a; document.querySelectorAll('.ages button').forEach(b => b.classList.toggle('on', b === t)); Sfx.tap(); npReady(); },
    gender: t => { S.np.gender = t.dataset.g; document.querySelectorAll('.gender button').forEach(b => b.classList.toggle('on', b === t)); Sfx.tap(); npReady(); },
    'save-new': () => {
      S.player = Store.addPlayer({ name: $('#nm').value.trim().slice(0, 16), age: S.np.age, gender: S.np.gender, color: S.np.color });
      renderSections(); say('sections');
    },
    pick: t => {
      S.player = Store.getPlayer(t.dataset.id);
      if (!S.player) return renderHome();
      renderSections();
      Voice.playSeq((S.player.hi ? [['hi_' + S.player.fid, S.player.hi]] : []).concat([line('sections')]));
    },
    sections: () => renderSections(),
    code: () => { renderTracks(); say('tracks'); },
    pc: () => { Sfx.tap(); say('soon'); },
    tracks: () => { Voice.stop(); renderTracks(); },
    level: t => {
      if (t.classList.contains('locked')) { Sfx.oops(); return; }
      renderLevel(+t.dataset.t, +t.dataset.l);
    },
    goal: () => { const L = level(); Voice.play('goal_' + L.id, L.goal); },
    py: () => $('#pyBox').classList.toggle('folded'),
    run: () => run(),
    undo: () => { if (!S.running && S.ws) { S.ws.undo(false); Sfx.tap(); } },
    reset: () => { if (!S.running && S.stage) { S.stage.reset(); if (S.ws) { S.ws.highlightBlock(null); updateCode(); } Sfx.tap(); } },
    lb: t => littleTap(+t.dataset.i),
    again: () => { closeModal(); if (little()) resetLittle(); else if (S.stage) S.stage.reset(); },
    next: () => {
      const t = TRACKS[S.track];
      if (S.li + 1 < t.levels.length) renderLevel(S.track, S.li + 1); else renderTracks();
    },
    parents: () => parents(),
    gate: () => { if (+toAscii($('#gate').value) === S.gate) parentsPanel(); else $('#gerr').textContent = 'غير صحيح'; },
    family: () => { if (Store.enableFamily($('#fam').value)) parentsPanel(); else $('#ferr').textContent = 'الرمز غير صحيح'; },
    delp: t => { if (confirm('حذف هذا اللاعب نهائياً؟')) { Store.removePlayer(t.dataset.id); parentsPanel(); } },
  };

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    if (Date.now() < S.lock && t.dataset.act !== 'lb') return;
    const f = ACT[t.dataset.act];
    if (f) f(t, e);
  });
  document.addEventListener('change', e => { if (e.target.id === 'vc') { Store.settings.voice = e.target.checked; Store.save(); if (!e.target.checked) Voice.stop(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Voice.stop(); });

  // لو حجم المسرح اتغيّر (تدوير الجهاز مثلاً) نعيد رسمه، إلا وهو شغّال
  let rt;
  const relayout = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (S.screen !== 'level' || !S.stage || S.running) return;
      if (S.stage.layout) S.stage.layout();
      if (S.stage.draw) { S.stage.draw(); S.stage.placePen(true); }
    }, 150);
  };
  addEventListener('resize', relayout);

  Store.load();
  renderHome();
})();

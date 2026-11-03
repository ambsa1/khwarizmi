/* بيت الخوارزمي: الشاشات وتسلسل اللعب */
(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app'), modal = $('#modal');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms / (window.__speed || 1)));
  const plain = s => String(s).replace(/[ً-ْ]/g, ''); // التشكيل للصوت فقط، والشاشة بدونه
  const { SAY, CARD, CARD_EN, EN } = window.SIRAJ_TEXTS;

  const S = { screen: 'home', player: null, track: null, li: 0, stage: null, ws: null, running: false, run: 0, lock: 0, timers: [], sirajs: [], msirajs: [] };
  const girl = () => S.player && S.player.gender === 'g';
  const key = k => (girl() && SAY[k + '_f'] ? k + '_f' : k);
  const line = k => [key(k), SAY[key(k)]];
  // الصوت يمر دايماً بسياسة Voice في sfx.js (أولوية، عدم تكرار، أسماء تُتعلّم)
  const say = (k, o) => Voice.play(...line(k), undefined, o);
  const little = () => S.player && S.player.age <= 4;
  const showCode = () => !S.player || S.player.age >= 7;
  const level = () => TRACKS[S.track].levels[S.li];
  const later = (fn, ms) => S.timers.push(setTimeout(fn, ms));
  Voice.who = () => S.player; // عدّادات "اتعلّم الاسم" لكل طفل

  // كل ما يخص الشاشة القديمة يتنظّف هنا: التشغيل، المؤقّتات، الحركات، الصوت، بلوكلي، والنافذة
  function cleanup() {
    S.run++; // أي تشغيل قديم يقيف
    S.timers.forEach(clearTimeout); S.timers = [];
    clearTimeout(S.toastT);
    if (S.ws) { Blocks.dispose(S.ws); S.ws = null; }
    if (S.stage) { S.stage.destroy(); S.stage = null; }
    S.sirajs.forEach(s => s.destroy()); S.sirajs = [];
    if (window.CW && CW.destroy) CW.destroy(); // لو عالم الكمبيوتر مفتوح، يقفل نفسه
    closeModal();
    gsap.killTweensOf(app.querySelectorAll('*')); // حركات عناصر الشاشة القديمة ما تفضل شغّالة
    Voice.stop();
    S.running = false; S.relayoutDue = false; S.ed = null;
  }
  function screen(html, cls) {
    cleanup();
    S.lock = Date.now() + 350;
    app.innerHTML = `<div class="screen ${cls || ''}">${html}</div>`;
    if (window.Extras) Extras.onScreen(S.screen); // المكافآت وتذكير الراحة (شاشات الخرائط فقط)
  }
  const live = (el, color, opts) => { const s = Siraj.create(el, color, opts); S.sirajs.push(s); return s; };
  const mini = (color, lit = true) => Siraj.svg(color, { lit, shadow: false });

  // نافذة واحدة فقط في أي وقت: الجديدة تنظّف القديمة أولاً
  function showModal(html, sticky) {
    closeModal();
    S.lock = Date.now() + 350;
    modal.innerHTML = `<div class="m-back" ${sticky ? '' : 'data-act="m-close-bg"'}><div class="m-card" role="dialog" aria-modal="true">${html}</div></div>`;
    gsap.fromTo('.m-card', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
  }
  function closeModal() {
    S.msirajs.forEach(s => s.destroy()); S.msirajs = [];
    if (modal.firstChild) gsap.killTweensOf(modal.querySelectorAll('*'));
    modal.innerHTML = '';
  }

  /* ---------- الشاشة الرئيسية ---------- */
  function renderHome() {
    S.player = null; S.screen = 'home';
    const ps = Store.data.players.slice().sort((a, b) => (a.fid || 'z').localeCompare(b.fid || 'z'));
    screen(`<div class="sky"></div>
      <div class="home">
        <div class="logo"><div class="hero" id="hero"></div>${window.Extras ? Extras.logo() : '<h1>بيت الخوارزمي</h1>'}<p>ساعد سراج يرجّع النور للمدينة</p></div>
        <h2 class="who">من سيلعب اليوم؟</h2>
        <div class="players">
          ${ps.map(p => `<button class="player ${p.fid ? 'fam' : ''}" data-act="pick" data-id="${esc(p.id)}">
            <span class="pic">${mini(p.color)}</span><b>${esc(p.name) || '&nbsp;'}</b><small>⭐ ${Store.stars(p)}</small></button>`).join('')}
          <button class="player add" data-act="new"><span class="plus">＋</span><b>لاعب جديد</b></button>
        </div>${window.Extras ? Extras.homeExtra() : ''}
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
      <header class="bar"><button class="ib" data-act="home" aria-label="رجوع">→</button><span class="t">أهلاً ${esc(p.name)}!</span>${window.Extras ? Extras.titleChip(p) : ''}<span class="chip">⭐ ${Store.stars(p)}</span></header>
      <div class="sections">
        <button class="door code" data-act="code"><span class="d-pic">${mini(p.color)}</span><span><h3>البرمجة مع سراج</h3><p>برمج سراج يتكلم ويرسم وينوّر المدينة</p>
          <span class="lamps">${allLevels().map(l => `<i class="${Store.solved(p, l.id) ? 'on' : ''}"></i>`).join('')}</span></span></button>
        <button class="door pc" data-act="pc"><span class="d-pic big">💻</span><span><h3>عالم الكمبيوتر</h3><p>أجزاء الكمبيوتر، مدرسة الكتابة، والأمان في الإنترنت</p></span></button>
        ${window.Extras ? Extras.sectionsRow(p) : ''}
      </div>`, 'night');
    gsap.from('.door', { x: 60, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(1.6)' });
  }

  /* ---------- خريطة البرمجة: مدينة تنوّر ---------- */
  // كل مسار عمارة في المدينة، وكل مرحلة نافذة فيها. المرحلة المحلولة تنوّر نافذتها.
  // مختبر بايثون (كتابة الكود) يظهر من عمر ٨ سنين
  const tracksFor = p => TRACKS.map((t, ti) => [t, ti]).filter(([t]) => !t.minAge || p.age >= t.minAge);
  function renderTracks() {
    const p = S.player;
    S.screen = 'tracks';
    const list = tracksFor(p), all = list.reduce((a, [t]) => a.concat(t.levels), []), lit = all.filter(l => Store.solved(p, l.id)).length;
    screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="sections" aria-label="رجوع">→</button><span class="t">البرمجة مع سراج</span><span class="chip">⭐ ${Store.stars(p)}</span></header>
      <div class="tracks">
        <div class="city"><div class="moon"></div>
          <div class="skyline">${list.map(([t, ti]) => `<button class="bld" data-act="tjump" data-t="${ti}" style="--tc:${t.color}" aria-label="${esc(t.name)}">
            <span class="roof">${t.icon}</span><span class="wins">${t.levels.map(l => `<i class="${Store.solved(p, l.id) ? 'on' : ''}" data-id="${l.id}"></i>`).join('')}</span></button>`).join('')}</div>
          <div class="city-count">💡 <bdi>${lit} / ${all.length}</bdi></div></div>
        ${list.map(([t, ti]) => {
          const next = t.levels.findIndex(l => !Store.solved(p, l.id));
          return `<div class="track" id="tr-${ti}" style="--tc:${t.color}">
            <div class="track-head"><span class="ti">${t.icon}</span><span><h3>${t.name}</h3><p>${t.idea}</p></span></div>
            <div class="track-lamps">${t.levels.map((l, li) => {
              const st = p.progress[l.id] || 0, open = li === 0 || Store.solved(p, t.levels[li - 1].id) || st > 0;
              return `<button class="lv ${st ? 'done' : ''} ${open ? '' : 'locked'} ${li === next ? 'next' : ''}" data-act="level" data-t="${ti}" data-l="${li}">
                <span class="bulb">${st ? '💡' : open ? li + 1 : '🔒'}</span><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span></button>`;
            }).join('')}</div></div>`;
        }).join('')}
      </div>`, 'night');
    gsap.from('.bld', { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.05, duration: 0.5, ease: 'back.out(1.6)' });
    gsap.from('.track', { y: 30, opacity: 0, stagger: 0.08, duration: 0.45, ease: 'back.out(1.6)' });
    // النافذة التي نوّرها الطفل الآن تلمع
    if (S.justLit) {
      const w = document.querySelector(`.wins i[data-id="${S.justLit}"]`);
      S.justLit = null;
      if (w) { w.classList.add('pop'); later(() => Sfx.light(), 450); }
    }
  }

  /* ---------- المرحلة ---------- */
  // نوع المسرح: من المرحلة نفسها (مسارات الكلمات والحشرات والمختبر تخلط المسارح) أو من المسار
  const stageKind = (t, L) => L.stage || t.id;
  function renderLevel(ti, li) {
    const t = TRACKS[ti], L = t.levels[li], p = S.player;
    S.screen = 'level'; S.track = ti; S.li = li; S.fails = 0; S.solShown = false; S.offered = false;
    const py = L.kind === 'py', lit = little() && !py, kind = S.kind = stageKind(t, L);
    S.drafts = S.drafts || {};
    screen(`<header class="bar"><button class="ib" data-act="tracks" aria-label="رجوع">→</button>
        <span class="t">${t.icon} ${t.name}</span><span class="chip">${li + 1}/${t.levels.length}</span>
        ${lit ? '' : '<button class="ib hintb" id="hintBtn" data-act="hint" aria-label="مساعدة">💡</button>'}
        <button class="ib" data-act="goal" aria-label="اسمع المطلوب">🔊</button></header>
      <section class="stage-wrap"><div class="stage" id="stage"></div>
        <div class="goal">🎯 ${esc(plain(L.goal))}</div>
        <div class="toast" id="toast"></div></section>
      <section class="editor ${lit ? 'little' : ''} ${py ? 'pyed' : ''}" id="editor">
        ${lit ? '<div class="strip" id="strip"></div><div class="lpal" id="lpal"></div>'
          : py ? '' : `<div class="ws" id="ws" dir="ltr"></div>
             <div class="py ${showCode() ? '' : 'folded'}" id="pyBox"><button class="py-head" data-act="py">🐍 Python <span id="cnt"></span></button><pre id="py" dir="ltr"></pre></div>`}
      </section>
      ${lit ? '' : `<footer class="controls"><button class="run" id="run" data-act="run">▶ شغّل</button>
        ${py ? '' : '<button class="sq" data-act="del" aria-label="احذف البطاقة">🗑</button><button class="sq" data-act="undo" aria-label="تراجع">↶</button>'}
        <button class="sq" data-act="reset" aria-label="من البداية">↺</button></footer>`}`,
      'level t-' + t.id + (py ? ' t-py' : ''));
    S.stage = new Stages[kind]($('#stage'), L, p.color);
    S.stage.little = lit; // صناديق الصغار تبدأ من صفر بدل "فارغ"
    S.stage.mount();
    S.ed = null;
    if (lit) buildLittle(t, L);
    else if (py) {
      S.ed = PyLab.editor($('#editor'), L, kind, () => { if (!S.running && S.ed) S.drafts[L.id] = S.ed.get(); });
      S.ed.set(S.drafts[L.id] != null ? S.drafts[L.id] : (L.starter || ''));
    } else {
      S.ws = Blocks.makeWorkspace($('#ws'), L.blocks, L.max, onWs);
      if (L.preset) { Blocks.load(S.ws, L.preset, Blocks.startOf(S.ws).nextConnection); S.ws.clearUndo(); }
      updateCode();
    }
    // الهدف أولاً، ثم النصيحة، في تسلسل واحد عشان ما يقطع بعض
    const seq = [['goal_' + L.id, L.goal]];
    if (lit) seq.push(line('little'));
    else if (L.tip) seq.push(line(L.tip));
    if (L.predict && !lit) { later(() => predict(L, kind, seq), 350); return; }
    later(() => Voice.playSeq(seq, { pri: 'instruction' }), 350);
    if (!lit && L.tip) later(() => toast(SAY[key(L.tip)], 'tip'), 2600);
  }

  /* توقّع قبل التشغيل (PRIMM): البرنامج الجاهز ظاهر، والطفل يختار الصورة التي سيرسمها/يقولها، ثم نشغّله ونشوف */
  function predict(L, kind, seq) {
    if (S.running || S.screen !== 'level') return;
    const order = L.predict.choices.map((c, i) => i).sort(() => Math.random() - 0.5);
    const code = S.ws ? Blocks.python(S.ws).lines : [];
    S.predSeq = seq;
    showModal(`<h2 class="pred-title">🤔 ${plain(SAY[key('predict')])}</h2>
      ${code.length ? `<pre class="w-code" dir="ltr">${code.map(hl).join('\n')}</pre>` : ''}
      <div class="pred pred-${kind}">${order.map(i => `<button class="pchoice" data-act="pred" data-i="${i}">${Stages.preview(kind, L.predict.choices[i])}</button>`).join('')}</div>`, true);
    say('predict', { pri: 'instruction' });
  }
  function pickPredict(t) {
    const L = level(), right = L.predict.answer, ok = +t.dataset.i === right;
    if (document.querySelector('.pchoice.right')) return;
    document.querySelectorAll('.pchoice').forEach(b => b.classList.add(+b.dataset.i === right ? 'right' : 'dim'));
    if (ok) { Sfx.win(); const r = t.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 30, ['#ffd23e', '#7cff8a', '#4fd1ff']); } else Sfx.oops();
    say(ok ? 'predict_ok' : 'predict_no', { pri: 'feedback', cut: true });
    // نشغّل البرنامج الجاهز عشان الطفل يتأكد من توقّعه، ثم يسمع المطلوب
    later(() => { closeModal(); run(true); }, 1500);
  }

  // كلمة البطاقة بالإنجليزي، ثم معناها بالعربي (ولون الضوء)
  function cardVoice(type, b) {
    const T = SIRAJ_TEXTS, seq = [];
    let en = CARD_EN[type];
    if (type === 'func_call' || type === 'var_set') en = b.getFieldValue(type === 'func_call' ? 'NAME' : 'V');
    if (en && EN[en]) seq.push(['en_' + en, EN[en], 'en']);
    if (CARD[type]) seq.push(['k_' + type, CARD[type]]);
    if (type === 'light_on') { const c = b.getFieldValue('C'); seq.push(['c_' + c, T.COLORS[c]]); }
    Voice.playSeq(seq, { pri: 'name' }); // أول ٣ مرات لكل طفل، وبعدها صوت البطاقة فقط
  }
  const NAME = { pri: 'name' };
  function onWs(e) {
    if (S.screen !== 'level' || !S.ws) return; // حدث متأخر من مساحة اتقفلت
    if (e.full) {
      const L = level(), k = L.blocks.includes('siraj_repeat') ? 'use_loop' : 'full';
      toast(SAY[key(k)], 'bad'); say(k, { pri: 'feedback', cut: true }); return;
    }
    if (e.added) cardVoice(e.added, e.block);
    if (e.field === 'TEXT') { const i = SIRAJ_TEXTS.PHRASES.findIndex(p => p[0] === e.value); if (i >= 0) Voice.play('ph_' + i, SIRAJ_TEXTS.PHRASES[i][1], undefined, NAME); }
    if (e.field === 'C' && EN[e.value]) Voice.playSeq([['en_' + e.value, EN[e.value], 'en'], ['c_' + e.value, SIRAJ_TEXTS.COLORS[e.value]]], NAME);
    if (e.field === 'V' && EN[e.value]) Voice.play('en_' + e.value, EN[e.value], 'en', NAME);
    if (e.field === 'N' && SIRAJ_TEXTS.NUMS[+e.value]) Voice.play('n_' + e.value, SIRAJ_TEXTS.NUMS[+e.value], undefined, NAME);
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
      .replace(/\b(for|in|range|pass|if|elif|else|while|def)\b/g, '<b class="k">$1</b>')
      .replace(/\b([a-z_]+)(?=\()/g, '<b class="f">$1</b>')
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
    if (S.ed) S.ed.lock(on);
    if (!on && S.relayoutDue) relayout(); // الجهاز اتلفّ أثناء التشغيل: نعيد الرسم بعده
  }

  // demo: تشغيل البرنامج الجاهز بعد التوقّع (لا يُحسب محاولة)
  async function run(demo) {
    if (S.running) return;
    if (S.ed) return runPy();
    if (!S.ws) return;
    const L = level(), ops = Blocks.compile(S.ws);
    if (!ops.length) { if (!demo) { toast(SAY[key('empty')], 'bad'); say('empty', { pri: 'feedback', cut: true }); } return; }
    const my = ++S.run, stage = S.stage, ws = S.ws;
    const alive = () => my === S.run;
    setBusy(true);
    Voice.stop();
    stage.reset();
    ws.highlightBlock(null);
    Blocks.clearGlow(ws);
    let failAt = null, reason = null;
    try {
      await sleep(250);
      for (const o of ops) {
        if (!alive()) return;
        ws.highlightBlock(o.id);
        updateCode(o.id);
        // خطأ في البرنامج نفسه (مثلاً نداء كلمة قبل تعليمها)
        if (o.op === 'error') { failAt = o.id; reason = o.reason; Sfx.bump(); break; }
        if (!(await stage.exec(o))) { failAt = o.id; break; }
      }
      if (!alive()) return;
      const res = reason ? { ok: false, reason } : stage.result();
      if (demo) {
        ws.highlightBlock(null); updateCode();
        Voice.playSeq(S.predSeq || [['goal_' + L.id, L.goal]], { pri: 'instruction' });
        toast(L.goal, 'tip');
        return;
      }
      const miss = res.ok && missing(L);
      if (res.ok && !miss) {
        ws.highlightBlock(null); updateCode();
        return await win(L, Blocks.countBlocks(ws), my);
      }
      if (miss) { ws.highlightBlock(null); updateCode(); return fail(miss); }
      // البطاقة اللي حصل فيها الخطأ تفضل ملوّنة لحدي ما الطفل يعدّل
      failAt = failAt || (ops.length ? ops[ops.length - 1].id : null);
      ws.highlightBlock(failAt); updateCode(failAt, true);
      fail(res.reason);
    } finally {
      if (alive()) setBusy(false);
    }
  }
  // بطاقات لازم تُستعمل في المرحلة (الكلمة الجديدة، الجمع...)
  function missing(L) {
    const need = (L.must || []).filter(ty => !S.ws.getAllBlocks(false).some(b => b.type === ty && b.isEnabled()));
    if (!need.length) return null;
    return need.some(n => /^func_/.test(n)) ? 'use_func' : need.includes('siraj_repeat') ? 'use_loop' : 'use_card';
  }

  /* مختبر بايثون: نفس المسارح، لكن الأوامر من الكود المكتوب، والسطر الشغّال يتلوّن */
  async function runPy() {
    const L = level(), ed = S.ed, code = ed.get(), r = PyLab.compile(code);
    if (!r.ops.length && !r.error) { toast(SAY[key('empty')], 'bad'); say('empty', { pri: 'feedback', cut: true }); return; }
    const my = ++S.run, stage = S.stage, alive = () => my === S.run;
    S.drafts[L.id] = code;
    setBusy(true);
    Voice.stop();
    stage.reset();
    ed.clear();
    let failLine = null;
    try {
      if (r.error && r.error.parse) { ed.error(r.error.line, r.error.msg); return fail('py_err'); }
      await sleep(250);
      for (const o of r.ops) {
        if (!alive()) return;
        ed.mark(o.line);
        if (!(await stage.exec(o))) { failLine = o.line; break; }
      }
      if (!alive()) return;
      if (failLine == null && r.error) { Sfx.bump(); ed.error(r.error.line, r.error.msg); return fail('py_err'); }
      const res = stage.result();
      if (res.ok) {
        const need = (L.mustPy || []).find(w => !PyLab.uses(code, w));
        if (need) { ed.error(0, `استعمل \`${need}\` في هذه المرحلة`, 'tip'); return fail('use_word'); }
        ed.mark(null);
        return await win(L, PyLab.lineCount(code), my);
      }
      ed.mark(failLine || (r.ops.length ? r.ops[r.ops.length - 1].line : 1), true);
      fail(res.reason);
    } finally {
      if (alive()) setBusy(false);
    }
  }

  function fail(reason) {
    S.lastResult = { won: false, reason };
    S.fails++;
    Sfx.oops();
    toast(SAY[key(reason)] || SAY[key('retry')], 'bad');
    Voice.play(...(SAY[reason] ? line(reason) : line('retry')), undefined, { pri: 'feedback', cut: true });
    helpAfterFail();
  }

  /* ---------- المساعدة ---------- */
  // بعد محاولتين فاشلتين: زر 💡 يلمع ويظهر تلميح بالصورة. بعد أربع: نعرض الحل (والفوز به نجمة واحدة)
  function helpAfterFail() {
    const b = $('#hintBtn');
    if (S.fails >= 2 && b) b.classList.add('pulse');
    if (little()) { if (S.fails >= 2) later(littleHint, 1500); return; }
    if (S.fails === 2) later(hint, 1700);
    if (S.fails >= 4 && !S.offered && level().solution) { S.offered = true; later(offerSolution, 1900); }
  }
  // manual = الطفل ضغط 💡 (طلب صريح مثل 🔊)، وإلا تلميح تلقائي بعد فشلين
  function hint(manual) {
    const ho = manual ? { pri: 'feedback', force: true } : { pri: 'feedback' };
    const L = level();
    if (!L.solution || S.running || S.screen !== 'level') return;
    const b = $('#hintBtn'); if (b) b.classList.remove('pulse');
    if (S.ed) {
      const d = PyLab.diffLines(S.ed.get(), L.solution);
      if (d && d.text) { S.ed.error(d.line, `جرّب: \`${d.text.trim()}\``, 'tip'); say('hint_next', ho); }
      else if (d) { S.ed.error(d.line, 'هذا السطر زائد', 'tip'); say('hint_extra', ho); }
      return;
    }
    if (!S.ws) return;
    Blocks.clearGlow(S.ws);
    // المغامرة والرسم: الطريق الصحيح على المسرح نفسه (إلا مراحل الحشرات، فالبطاقة الغلط أوضح)
    if (!L.preset && S.stage.hint) {
      S.stage.reset();
      const k = S.stage.hint(Blocks.opsOf(L.solution));
      if (k) { toast(SAY[key(k)], 'tip'); say(k, ho); return; }
    }
    const d = Blocks.diff(S.ws, L.solution);
    if (!d) return;
    const k = { field: 'hint_field', wrong: 'hint_wrong', next: 'hint_next', extra: 'hint_extra' }[d.kind];
    if (d.block) Blocks.glow(d.block);
    if (d.kind === 'next') Blocks.glowTool(S.ws, d.step);
    toast(plain(SAY[key(k)]) + (d.line && d.kind !== 'wrong' && d.kind !== 'extra' ? '  ' + d.line : ''), 'tip');
    say(k, ho);
  }
  function offerSolution() {
    if (S.screen !== 'level' || S.running || !level().solution) return;
    showModal(`<h2>💡 ${plain(SAY[key('sol_offer')])}</h2><p class="hint">الحل يعطيك نجمة واحدة ⭐</p>
      <div class="w-acts"><button class="sq" data-act="hint-only" aria-label="تلميح فقط">💡</button><button class="run" data-act="sol">👀 اعرض الحل</button></div>`);
    say('sol_offer');
  }
  function showSolution() {
    const L = level();
    closeModal();
    if (!L.solution || S.running) return;
    S.solShown = true;
    if (S.ed) S.ed.set(L.solution);
    else if (S.ws) { Blocks.clear(S.ws); Blocks.load(S.ws, L.solution, Blocks.startOf(S.ws).nextConnection); Blocks.clearGlow(S.ws); updateCode(); }
    S.stage.reset();
    toast(SAY[key('sol_shown')], 'tip'); say('sol_shown');
    const r = $('#run'); if (r) { r.classList.add('pulse'); later(() => r.classList.remove('pulse'), 4000); }
  }

  async function win(L, n, my) {
    const lit = little();
    // الصغار دايماً ثلاث نجوم، ولو شاف الحل نجمة واحدة
    const stars = lit ? 3 : S.solShown ? 1 : n <= L.best ? 3 : n <= L.best + 2 ? 2 : 1;
    S.lastResult = { won: true, stars };
    const p = S.player;
    if (!Store.solved(p, L.id)) S.justLit = L.id; // نافذة جديدة تنوّر في المدينة
    Store.win(p, L.id, stars);
    Sfx.win();
    FX.confetti();
    await S.stage.celebrate();
    if (my !== S.run) return;
    const w = Voice.pick(['win1', 'win2', 'win3']); // متنوّعة، وما تتكرر نفس الجملة مرتين ورا بعض
    const code = S.ed ? S.ed.get().split('\n').filter(l => l.trim()) : S.ws ? Blocks.python(S.ws).lines : S.littleCode || [];
    const fewer = stars < 3 && !S.solShown;
    Voice.playSeq([line(w)].concat(fewer ? [line('fewer')] : []), { pri: 'feedback', force: true });
    const t = TRACKS[S.track], last = S.li + 1 >= t.levels.length;
    showModal(`<div class="w-siraj" id="wsj"></div>
      <h2>${plain(SAY[key(w)])}</h2>
      <div class="w-stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
      ${fewer ? `<p class="hint">${plain(SAY[key('fewer')])}</p>` : ''}
      ${code.length ? `<pre class="w-code" dir="ltr">${code.map(hl).join('\n')}</pre>` : ''}
      <div class="w-acts">${stars < 3 ? '<button class="sq" data-act="again" aria-label="مرة أخرى">↻</button>' : ''}
        <button class="run" data-act="next">${last ? '✔ تم' : '▶ التالي'}</button></div>`, true);
    const s = Siraj.create($('#wsj'), p.color); S.msirajs.push(s); s.happy();
    gsap.from('.w-stars span.on', { scale: 0, rotation: -90, stagger: 0.18, duration: 0.5, ease: 'back.out(3)', delay: 0.2 });
  }

  /* ---------- وضع الصغار: كل ضغطة تتنفّذ فوراً ---------- */
  // الأزرار تُبنى من أوامر الحل نفسه (بدون تكرار)، والمغامرة والرسم بأسهم الشاشة
  const ARROWS = [{ op: 'up', i: '⬆️' }, { op: 'down', i: '⬇️' }, { op: 'left', i: '⬅️' }, { op: 'right', i: '➡️' }];
  const SKIP = ['loop', 'call', 'error'];
  const lkey = o => [o.op, o.arg, o.name].join('|');
  const arrowsKind = k => k === 'path' || k === 'draw';
  function littlePalette(kind, L) {
    if (arrowsKind(kind)) return ARROWS.map(a => ({ op: a.op }));
    const seen = new Set(), out = [];
    for (const o of Blocks.opsOf(L.solution || [])) {
      if (SKIP.includes(o.op) || seen.has(lkey(o))) continue;
      seen.add(lkey(o)); out.push({ op: o.op, arg: o.arg, name: o.name });
    }
    return out;
  }
  // ترتيب ضغطات الحل (للتلميح وللاختبار التلقائي)
  function littleSeq(kind, L, pal) {
    const ops = Blocks.opsOf(L.solution || []).filter(o => !SKIP.includes(o.op));
    let keys = ops.map(lkey);
    if (kind === 'path') keys = ops.map(o => o.op);
    if (kind === 'draw') {
      const DIR = { 0: 'right', 90: 'down', 180: 'left', 270: 'up' };
      let h = L.start[2]; keys = [];
      for (const o of ops) { if (o.op === 'turn') h = (h + o.arg + 360) % 360; if (o.op === 'forward') for (let i = 0; i < o.arg; i++) keys.push(DIR[h]); }
    }
    return keys.map(k => pal.findIndex(o => (arrowsKind(kind) ? o.op : lkey(o)) === k));
  }
  const vEm = n => Blocks.VARS[n] || '📦';
  const LICON = {
    say: o => { const p = SIRAJ_TEXTS.PHRASES.find(x => x[0] === o.arg); return `${p ? p[2] : '💬'}<small>${esc(o.arg)}</small>`; },
    wave: () => '👋', jump: () => '🦘', up: () => '⬆️', down: () => '⬇️', left: () => '⬅️', right: () => '➡️',
    light: () => '💡', off: () => '🌑',
    set: o => `${vEm(o.name)}<small>= ${o.arg}</small>`, add: o => `${vEm(o.name)}<small>${o.arg > 0 ? '+' : '−'}${Math.abs(o.arg)}</small>`,
    sayvar: o => `💬<small>${vEm(o.name)}</small>`,
  };
  const LCOLOR = (t, o) => (o.op === 'light' ? Blocks.LIGHTS[o.arg] : o.op === 'off' ? '#3a3d58' : t.color);
  const LPY = (kind, o) => ({
    say: () => `say("${o.arg}")`, light: () => `light("${o.arg}")`, off: () => 'off()',
    set: () => `${o.name} = ${o.arg}`, add: () => `${o.name} = ${o.name} ${o.arg > 0 ? '+' : '-'} ${Math.abs(o.arg)}`, sayvar: () => `say(${o.name})`,
  }[o.op] || (() => (kind === 'path' ? `move_${o.op}()` : kind === 'draw' ? `draw_${o.op}()` : o.op + '()')))();
  function buildLittle(t, L) {
    S.lpal = littlePalette(S.kind, L);
    S.lseq = littleSeq(S.kind, L, S.lpal);
    S.littleCode = []; S.ltaps = [];
    $('#lpal').innerHTML = S.lpal.map((o, i) => `<button class="lb ${o.op}" data-act="lb" data-i="${i}" style="--tc:${LCOLOR(t, o)}">${LICON[o.op](o)}</button>`).join('');
    $('#strip').innerHTML = '';
  }
  function resetLittle() {
    if (!S.stage) return;
    S.stage.reset(); S.littleCode = []; S.ltaps = [];
    const st = $('#strip'); if (st) st.innerHTML = '';
  }
  function popStrip() { S.littleCode.pop(); S.ltaps.pop(); const l = $('#strip .sb:last-child'); if (l) l.remove(); }
  // تلميح الصغار: الزر الصحيح التالي يلمع (أو نقاط الطريق في المغامرة)
  function littleHint() {
    if (S.screen !== 'level' || !S.lseq) return;
    const k = S.ltaps.length, onTrack = S.ltaps.every((x, i) => x === S.lseq[i]);
    const b = onTrack && document.querySelector(`.lb[data-i="${S.lseq[k]}"]`);
    if (b) { b.classList.add('pulse'); return; }
    if (S.kind === 'path' && S.stage.hint) { resetLittle(); S.stage.hint(Blocks.opsOf(level().solution)); }
  }
  async function littleTap(i) {
    if (S.running || !S.stage) return;
    const t = TRACKS[S.track], L = level(), o = S.lpal[i], my = S.run, stage = S.stage;
    S.running = true;
    document.querySelectorAll('.lb.pulse').forEach(b => b.classList.remove('pulse'));
    try {
      S.littleCode.push(LPY(S.kind, o)); S.ltaps.push(i);
      $('#strip').insertAdjacentHTML('beforeend', `<span class="sb" style="--tc:${LCOLOR(t, o)}">${LICON[o.op](o)}</span>`);
      gsap.from('#strip .sb:last-child', { scale: 0, duration: 0.35, ease: 'back.out(3)' });
      const ok = await stage.exec(o);
      if (my !== S.run) return;
      const res = stage.result();
      if (res.ok) { await win(L, 0, my); return; }
      if (!ok) { fail(res.reason); popStrip(); return; } // اصطدام: نرجع خطوة بس
      // ضغطة غلط: نرجعها خطوة واحدة لو المسرح يقدر، وإلا نبدأ من جديد
      const bad = stage.wrong && stage.wrong();
      if (bad) {
        fail(bad);
        await sleep(900);
        if (my !== S.run) return;
        if (stage.pop) { stage.pop(); popStrip(); } else resetLittle();
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
    home: () => { renderHome(); say('who'); },
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
    // عالم الكمبيوتر: يرسم شاشاته بنفسه داخل التطبيق، ويرجع لاختيار القسم لما الطفل يخرج
    pc: () => {
      Sfx.tap();
      if (!window.CW || !CW.render) { say('soon'); return; }
      cleanup(); S.screen = 'cw'; S.lock = Date.now() + 350;
      const p = S.player;
      CW.render(app, {
        player: p,
        playSeq: (items, o) => Voice.playSeq(items, o),
        say: (k, t, o) => Voice.play(k, t, undefined, o),
        sfx: Sfx, Siraj, fx: FX,
        saveProgress: (id, stars) => Store.cwWin(p, id, stars),
        back: () => renderSections(),
      });
    },
    tracks: () => { Voice.stop(); renderTracks(); },
    level: t => {
      if (t.classList.contains('locked')) { Sfx.oops(); return; }
      renderLevel(+t.dataset.t, +t.dataset.l);
    },
    goal: () => { const L = level(); Voice.play('goal_' + L.id, L.goal, undefined, { pri: 'instruction', force: true }); }, // 🔊 = بالطلب دايماً
    py: () => $('#pyBox').classList.toggle('folded'),
    run: () => run(),
    undo: () => { if (!S.running && S.ws) { S.ws.undo(false); Sfx.tap(); } },
    del: () => { if (!S.running && S.ws && S.ws.__del()) Sfx.tap(); },
    reset: () => { if (!S.running && S.stage) { S.stage.reset(); if (S.ws) { S.ws.highlightBlock(null); Blocks.clearGlow(S.ws); updateCode(); } if (S.ed) S.ed.clear(); Sfx.tap(); } },
    hint: () => { if (S.running) return; Sfx.tap(); if (S.fails >= 4 && level().solution) offerSolution(); else hint(true); },
    'hint-only': () => { closeModal(); hint(true); },
    sol: () => showSolution(),
    pred: t => pickPredict(t),
    tjump: t => { const el = $('#tr-' + t.dataset.t); Sfx.tap(); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); gsap.fromTo(el, { scale: 1.04 }, { scale: 1, duration: 0.5, delay: 0.3 }); } },
    lb: t => littleTap(+t.dataset.i),
    again: () => { closeModal(); if (little() && level().kind !== 'py') resetLittle(); else if (S.stage) S.stage.reset(); },
    next: () => {
      const t = TRACKS[S.track];
      if (S.li + 1 < t.levels.length) renderLevel(S.track, S.li + 1); else renderTracks();
    },
    parents: () => (window.Parents ? Parents.open() : parents()),
    gate: () => { if (+toAscii($('#gate').value) === S.gate) parentsPanel(); else $('#gerr').textContent = 'غير صحيح'; },
    family: () => { if (Store.enableFamily($('#fam').value)) parentsPanel(); else $('#ferr').textContent = 'الرمز غير صحيح'; },
    delp: t => { if (confirm('حذف هذا اللاعب نهائياً؟')) { Store.removePlayer(t.dataset.id); parentsPanel(); } },
  };

  /* حارس الضغطات السريعة (للتطبيق كله، ومنه extras.js و parents.js):
     - بعد تغيير الشاشة أو فتح نافذة بـ ٣٥٠ ملّي ثانية: أي لمسة "شبح" من الضغطة السابقة تُتجاهل (حتى على بلوكلي والأنشطة).
     - نفس الزر مرتين خلال ٣٥٠ ملّي ثانية = ضغطة واحدة (إلا أزرار الصغار والحذف والتراجع، فتكرارها مقصود). */
  const REPEAT = new Set(['lb', 'undo', 'del', 'gate', 'pin-ok', 'pin-save', 'family']); // تكرارها مقصود أو آمن (تصحيح رقم ثم إعادة المحاولة)
  let lastEl = null, lastT = 0;
  function tapOk(t, act) {
    const now = Date.now();
    if (now < S.lock && act !== 'lb') return false;
    if (t === lastEl && now - lastT < 350 && !REPEAT.has(act)) return false;
    lastEl = t; lastT = now;
    return true;
  }
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(ev => addEventListener(ev, e => {
    if (!e.isTrusted || Date.now() >= S.lock || !e.target.closest || e.target.closest('.lb')) return; // لمسات حقيقية فقط
    if (e.target.closest('#app, #modal')) { e.stopPropagation(); if (ev === 'click') e.preventDefault(); }
  }, true));
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled || !tapOk(t, t.dataset.act)) return;
    const f = ACT[t.dataset.act];
    if (f) f(t, e);
  });
  document.addEventListener('change', e => { if (e.target.id === 'vc') { Store.settings.voice = e.target.checked; Store.save(); if (!e.target.checked) Voice.stop(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Voice.stop(); });

  // لو حجم المسرح اتغيّر (تدوير الجهاز مثلاً) نعيد رسمه؛ وهو شغّال نأجّل لحدي ما يخلص
  let rt;
  function relayout() {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (S.screen !== 'level' || !S.stage) return;
      if (S.running) { S.relayoutDue = true; return; }
      S.relayoutDue = false;
      if (S.stage.layout) S.stage.layout();
      if (S.stage.draw) { S.stage.draw(); S.stage.placePen(true); }
    }, 150);
  }
  addEventListener('resize', relayout);

  // واجهة صغيرة للوحدات الإضافية (extras.js, parents.js)
  window.App = { S, screen, showModal, closeModal, live, mini, renderHome, renderSections, tapOk };
  try { Store.load(); } catch (e) { /* البيانات التالفة لا توقف اللعبة */ }
  renderHome();

  /* ---------- وضع الاختبار التلقائي (?test=1): يفتح أي مرحلة، ويحمّل حلّها، ويشغّله بسرعة ---------- */
  if (/[?&]test=1/.test(location.search)) {
    window.__speed = 12;
    gsap.globalTimeline.timeScale(12);
    Store.settings.voice = false;
    // الحل: ['نوع'] أو ['نوع', {حقل: قيمة}] أو ['siraj_repeat', {N: '4'}, [بطاقات داخلية]]، ونص بايثون لمراحل المختبر
    window.SirajTest = {
      S, TRACKS,
      player(age) {
        let p = Store.data.players.find(x => x.name === 'اختبار' + age);
        if (!p) p = Store.addPlayer({ name: 'اختبار' + age, age, gender: 'b', color: '#3d8bff' });
        S.player = p; return p;
      },
      open(trackId, levelId, age = 9) {
        this.player(age);
        const ti = TRACKS.findIndex(t => t.id === trackId), li = TRACKS[ti].levels.findIndex(l => l.id === levelId);
        renderLevel(ti, li); S.lock = 0;
      },
      loadSolution() {
        const L = level();
        if (S.ed) { S.ed.set(L.solution); return L.solution.split('\n'); }
        Blocks.clear(S.ws); // مراحل الحشرات فيها برنامج جاهز
        Blocks.load(S.ws, L.solution, Blocks.startOf(S.ws).nextConnection);
        return Blocks.python(S.ws).lines;
      },
      setCode(src) { if (S.ed) S.ed.set(src); },
      async run() { S.lastResult = null; await run(); return S.lastResult; },
      async little(ops) { S.lastResult = null; for (const i of ops) await littleTap(i); return S.lastResult; },
      // وضع الصغار: يضغط أزرار الحل بالترتيب
      async littleSolve() { S.lastResult = null; for (const i of S.lseq) { if (i < 0) return { won: false, reason: 'no-button' }; await littleTap(i); if (S.lastResult && S.lastResult.won) break; } return S.lastResult; },
      hint: () => hint(), offer: () => offerSolution(), showSolution: () => showSolution(),
      screens: { renderHome, renderSections, renderTracks, renderLevel },
      act: (name, data) => { const d = document.createElement('div'); Object.assign(d.dataset, data || {}); return ACT[name](d, { target: d }); },
    };
  }
})();

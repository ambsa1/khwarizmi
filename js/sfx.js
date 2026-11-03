/* المؤثرات الصوتية (مولّدة بالكود) وصوت سراج (ملفات mp3 في مجلد voice، وإلا صوت الجهاز) */
(function (root) {
  'use strict';

  let ctx = null;
  function ac() {
    if (!ctx) { const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(f, d, type, v, delay, to) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  root.Sfx = {
    unlock: ac,
    tap: () => tone(660, 0.07, 'triangle', 0.08, 0, 900),
    snap: () => { tone(520, 0.05, 'square', 0.04); tone(780, 0.07, 'triangle', 0.06, 0.04); },
    hop: () => tone(300, 0.18, 'sine', 0.09, 0, 620),
    land: () => tone(170, 0.08, 'triangle', 0.07),
    spark: () => [988, 1319, 1568].forEach((f, i) => tone(f, 0.14, 'sine', 0.09, i * 0.06)),
    pen: () => tone(440 + Math.random() * 80, 0.12, 'sine', 0.05),
    bump: () => { tone(150, 0.25, 'sawtooth', 0.08, 0, 70); tone(520, 0.3, 'sine', 0.05, 0.1, 380); },
    oops: () => { tone(392, 0.14, 'triangle', 0.09); tone(330, 0.24, 'triangle', 0.09, 0.14); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.26, 'triangle', 0.1, i * 0.1)),
    net: () => { tone(1400, 0.22, 'sine', 0.05, 0, 500); tone(880, 0.1, 'triangle', 0.08, 0.3, 1320); }, // شبكة الحشرات: هَوْب ثم طَق
    light: () => { tone(220, 0.6, 'sine', 0.06, 0, 880); tone(1320, 0.4, 'sine', 0.05, 0.25); },
  };

  /* ---------- صوت سراج: سياسة واحدة لكل اللعبة ----------
     - عنصر صوت واحد يُعاد استخدامه (ضروري للآيفون)، فلا يتداخل مقطعان أبداً.
     - الأولوية: تعليمات (الهدف، النصيحة) > نتيجة (فوز، خطأ، تلميح) > أسماء (بطاقة، حرف، لون) > تشجيع.
       الأقل ما يقطع الأعلى وهو شغّال، والأعلى (أو المساوي) يقطع الأقل.
     - نفس الجملة ما تتعاد خلال ٦ ثوانٍ، إلا لو الطفل طلبها (زر 🔊 = force).
     - الأسماء تُقال أول ٣ مرات فقط لكل طفل، وبعدها صوت قصير بس (الطفل اتعلّمها).
     - التشجيع مرة كل ١٥ ثانية على الأكثر، ومتنوّع (Voice.pick). */
  const PRI = { ambient: 1, name: 2, feedback: 3, instruction: 4 };
  const COOL = 6000, AMBIENT_GAP = 15000, LEARN = 3;
  const NAME = /^(en_|k_|c_|n_|ph_|cw_(en_)?l_|cw_en_w_|cw_wd_|cw_n_|cw_f_|cw_p_|cw_alg_\d|m_(sh_|fr_|t_|wt_|h_\d))/;
  const AMBIENT = /^(hi_|cw_hello$|cw_good\d|cw_bal_good(_f)?$|cw_yum$|m_good\d|m_hello$|m_sp_fire)/;
  const FEEDBACK = /^(win\d|cw_win\d|fewer|retry|empty|full$|hint_|sol_|predict_(ok|no)|py_err|use_|talk_|draw_|path_|bump$|edge$|light_|var_(empty|wrong|say)|func_(unknown|empty|loop)|x_(cert$|cert_f|title_new|sticker_new|locked|t\d)|en2_(win\d|good\d|try)$|m_(win\d|try|look|sort_no|pz_much|shop_much|shop_ok|sp_time|sp_moon))/;
  // تصنيف الجملة من مفتاحها لو المستدعي ما حدّد الأولوية
  const cls = k => (AMBIENT.test(k) ? 'ambient' : NAME.test(k) ? 'name' : FEEDBACK.test(k) ? 'feedback' : 'instruction');

  const player = new Audio();
  player.preload = 'auto';
  let token = 0, voices = null, cur = null, wd = null, lastAmbient = -1e9, pending = null;
  const last = new Map(), memo = {}, picked = {}, log = [];
  const onced = new Set(); // جمل "مرة واحدة" في الجلسة (ترحيب القسم وأسماء القوائم): قيلت فعلاً فما تتعاد
  const blobs = {}; // أصوات مفكوكة التشفير في الذاكرة (ترحيب العائلة): مفتاح → رابط blob
  const has = k => { if (!voices) voices = new Set(root.SIRAJ_VOICE || []); return voices.has(k) || !!blobs[k]; };
  const enabled = () => !(root.Store && Store.settings && Store.settings.voice === false);
  const now = () => V.now();
  const note = (k, ev, extra) => { log.push(Object.assign({ t: now(), k, ev }, extra)); if (log.length > 400) log.splice(0, 100); };

  // كم مرة سمع الطفل هذا الاسم (محفوظ مع اللاعب، وإلا في الذاكرة)
  const who = () => (typeof V.who === 'function' ? V.who() : null);
  function heard(k) { const p = who(); return p && p.seen ? +(p.seen['v:' + k] || 0) : memo[k] || 0; }
  function count(k) {
    const p = who(), n = heard(k) + 1;
    if (p && p.seen && root.Store && Store.setSeen) Store.setSeen(p, 'v:' + k, n); else memo[k] = n;
  }

  function fallback(text, lang, my, next) {
    if (!text || !root.speechSynthesis) return next();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'ar-SA'; u.rate = 1;
    u.onend = u.onerror = () => { if (my === token) next(); };
    speechSynthesis.speak(u);
  }
  function stop() {
    token++;
    clearTimeout(wd); pending = null;
    if (cur) note(cur.keys, 'stop');
    cur = null;
    player.onended = player.onerror = null;
    try { player.pause(); } catch (e) { /* لا شيء */ }
    if (root.speechSynthesis) speechSynthesis.cancel();
  }
  const sig = items => items.map(i => i[0]).join('+');

  // items: [[المفتاح، النص، اللغة]] ، opts: { pri, force (بالطلب)، cut (رد على إجابة الطفل)، again (ناتج برنامج يتكرر)، cool (مدة منع التكرار)،
  //        once (الجملة تُقال مرة واحدة فقط في الجلسة — ترحيب القسم/القائمة؛ زر 🔊 force يتجاوزها)، onLine }
  function playSeq(items, opts) {
    const o = typeof opts === 'function' ? { onLine: opts } : opts || {};
    if (!enabled() || document.hidden) { stop(); return false; }
    items = (items || []).filter(i => i && i[0]);
    if (o.once && !o.force) {
      items = items.filter(i => !onced.has(i[0]));
      if (!items.length) { note('', 'drop', { why: 'once' }); return false; }
    }
    if (!items.length) return false;
    const t = now(), pri = PRI[o.pri] || Math.max(...items.map(i => PRI[cls(i[0])]));
    if (o.force) {
      if (cur && cur.keys === sig(items) && !o.again) return true; // نفس الجملة شغّالة: ما نبدأها من الأول مع كل ضغطة
    } else {
      // cut: رد على إجابة الطفل نفسها (هو جاوب السؤال، فالتعليمة خلاص انتهت)
      // اسم بطاقة جديد ما يقطع اسماً شغّالاً (عشان الزوج إنجليزي + عربي ما يتقسم)
      if (cur && (cur.pri > pri || (cur.pri === PRI.name && pri === PRI.name)) && !o.cut) { note(sig(items), 'drop', { why: 'busy' }); return false; }
      // تعليمة السؤال الجديد ما تقطع رد سراج على الإجابة ("أحسنت"): تنتظره يخلص ثم تبدأ (آخر تعليمة بس هي اللي تنتظر)
      if (cur && cur.pri === PRI.feedback && pri === PRI.instruction && !o.cut) { pending = { items, opts: Object.assign({}, o, { pri: 'instruction' }) }; note(sig(items), 'wait'); return true; }
      items = items.filter(([k]) => {
        if (t - (last.has(k) ? last.get(k) : -1e9) < (o.cool || COOL)) return false;
        const c = cls(k);
        if (c === 'ambient' && t - lastAmbient < AMBIENT_GAP) return false;
        if (c === 'name' && pri <= PRI.name && heard(k) >= LEARN) return false;
        return true;
      });
      if (!items.length) { note('', 'drop', { why: 'repeat' }); return false; }
    }
    stop();
    const my = token;
    cur = { pri, keys: sig(items) };
    let i = 0;
    const next = () => {
      if (my !== token) return;
      clearTimeout(wd);
      if (i >= items.length) {
        note(cur && cur.keys, 'end'); cur = null;
        if (pending) { const p = pending; pending = null; setTimeout(() => { if (my === token) playSeq(p.items, p.opts); }, 250); }
        return;
      }
      const [key, text, lang] = items[i++];
      last.set(key, now());
      if (o.once) onced.add(key);
      if (cls(key) === 'ambient') lastAmbient = now();
      if (cls(key) === 'name') count(key);
      note(key, 'start', { pri });
      if (o.onLine) o.onLine(text);
      // حارس: لو الملف أو صوت الجهاز ما بلّغ بالنهاية، ما نفضل "مشغولين" للأبد
      wd = setTimeout(() => { if (my === token) next(); }, Math.min(15000, 2500 + String(text || '').length * 120));
      if (has(key)) {
        player.onended = () => { if (my === token) next(); };
        player.onerror = () => { if (my === token) { player.onerror = null; fallback(text, lang, my, next); } };
        player.src = blobs[key] || 'voice/' + key + '.mp3';
        player.play().catch(e => { if (my === token && e && e.name !== 'AbortError' && player.onerror) { player.onerror = null; fallback(text, lang, my, next); } });
      } else {
        fallback(text, lang, my, next);
      }
    };
    next();
    return true;
  }
  // تنويع: يختار واحدة من الجمل بدون تكرار آخر واحدة
  function pick(keys) {
    const id = keys.join('|');
    const opts = keys.length > 1 ? keys.filter(k => k !== picked[id]) : keys;
    return (picked[id] = opts[Math.floor(Math.random() * opts.length)]);
  }
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, () => ac(), true));

  const V = root.Voice = {
    play: (key, text, lang, opts) => playSeq([[key, text, lang]], opts),
    playSeq, stop, pick, cls, PRI, has,
    blob: (k, url) => { if (blobs[k]) URL.revokeObjectURL(blobs[k]); blobs[k] = url; },
    busy: () => (cur ? cur.pri : 0),
    now: () => Date.now(),
    who: null, // app.js: دالة ترجع اللاعب الحالي (لعدّادات الأسماء)
    log,
    resetOnce: () => onced.clear(), // جمل "مرة واحدة" تُقال من جديد (مثلاً لاعب آخر دخل)
    // للاختبار: نبدأ من جديد
    _reset() { stop(); last.clear(); onced.clear(); lastAmbient = -1e9; Object.keys(memo).forEach(k => delete memo[k]); log.length = 0; },
  };
})(window);

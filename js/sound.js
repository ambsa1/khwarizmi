/* المؤثرات الصوتية (مولّدة بالكود، بدون ملفات) وصوت منيب */
(function (root) {
  'use strict';

  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {}); // الآيفون يستخدم حالة interrupted بعد المكالمات
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  root.Sound = {
    unlock: ac,
    tap: () => tone(700, 0.06, 'triangle', 0.08),
    step: () => tone(420, 0.09, 'triangle', 0.07, 0, 520),
    turn: () => tone(520, 0.08, 'sine', 0.07, 0, 760),
    pick: () => { tone(880, 0.08, 'sine', 0.1); tone(1320, 0.12, 'sine', 0.09, 0.08); },
    check: () => tone(980, 0.03, 'sine', 0.03),
    bump: () => tone(160, 0.22, 'sawtooth', 0.09, 0, 70),
    splash: () => { tone(600, 0.3, 'sine', 0.08, 0, 120); tone(300, 0.3, 'triangle', 0.06, 0.05, 90); },
    fail: () => { tone(330, 0.14, 'triangle', 0.09); tone(247, 0.26, 'triangle', 0.09, 0.14); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.1)),
  };

  /* صوت منيب: عنصر صوت واحد يُعاد استخدامه. على الآيباد والآيفون لازم العنصر يشتغل أول مرة
     بلمسة من الطفل، وبعدها يقدر يشتغل في أي وقت (مثلاً بعد ما يخلص تشغيل البرنامج). */
  const player = new Audio();
  player.preload = 'auto';
  let token = 0;
  let voices = null;
  const enabled = () => !root.Store || !Store.data || Store.data.parent.voice !== false;
  const has = key => {
    if (!voices) voices = new Set(root.OMRAN_VOICE_LIST || []);
    return voices.has(key);
  };

  function silentWav() {
    const n = 64, b = new ArrayBuffer(44 + n), v = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }

  // نفتح الصوت بلمسة حقيقية (رفع الإصبع أو الضغط)، ونعيد المحاولة حتى ينجح
  let unlocked = false, silent = null;
  function unlock() {
    ac();
    if (unlocked) return;
    try {
      if (!player.src || player.paused) {
        silent = silent || silentWav();
        player.src = silent;
        player.play().then(() => { unlocked = true; }).catch(() => {});
      }
    } catch (e) { /* غير مدعوم */ }
  }
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, unlock, true));

  let utter = null; // نحتفظ بالجملة عشان المتصفح ما يرميها قبل ما تخلص
  function speakFallback(text, lang, my, next) {
    if (!text || !root.speechSynthesis) return next();
    const u = utter = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'ar-SA';
    u.rate = 0.95;
    u.onend = u.onerror = () => { if (my === token) next(); };
    speechSynthesis.speak(u);
  }

  function stop() {
    token++;
    player.onended = player.onerror = null;
    try { player.pause(); } catch (e) { /* لا شيء */ }
    if (root.speechSynthesis) speechSynthesis.cancel();
  }

  // يشغّل جملة أو أكثر واحدة بعد الأخرى: [[المفتاح، النص، اللغة], ...]
  function playSeq(items) {
    stop();
    if (!enabled() || document.hidden) return;
    const my = token;
    let i = 0;
    const next = () => {
      if (my !== token || i >= items.length) return;
      const [key, text, lang] = items[i++];
      if (has(key)) {
        player.onended = () => { if (my === token) next(); };
        // ملف صوت تالف: نقول الجملة بصوت الجهاز ونكمل
        player.onerror = () => { if (my === token) { player.onerror = null; speakFallback(text, lang, my, next); } };
        player.src = 'voice/' + key + '.mp3';
        player.play().then(() => { unlocked = true; }).catch(e => {
          if (my === token && e && e.name !== 'AbortError' && player.onerror) { player.onerror = null; speakFallback(text, lang, my, next); }
        });
      } else {
        speakFallback(text, lang, my, next);
      }
    };
    next();
  }

  root.Voice = { play: (key, text, lang) => playSeq([[key, text, lang]]), playSeq, stop, unlock };
})(window);

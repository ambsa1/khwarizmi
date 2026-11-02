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
    light: () => { tone(220, 0.6, 'sine', 0.06, 0, 880); tone(1320, 0.4, 'sine', 0.05, 0.25); },
  };

  /* صوت سراج: عنصر صوت واحد يُعاد استخدامه (ضروري للآيفون) */
  const player = new Audio();
  player.preload = 'auto';
  let token = 0, voices = null, utter = null;
  const has = k => { if (!voices) voices = new Set(root.SIRAJ_VOICE || []); return voices.has(k); };
  const enabled = () => !(root.Store && Store.settings && Store.settings.voice === false);

  function fallback(text, lang, my, next) {
    if (!text || !root.speechSynthesis) return next();
    const u = utter = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'ar-SA'; u.rate = 1;
    u.onend = u.onerror = () => { if (my === token) next(); };
    speechSynthesis.speak(u);
  }
  function stop() {
    token++;
    player.onended = player.onerror = null;
    try { player.pause(); } catch (e) { /* لا شيء */ }
    if (root.speechSynthesis) speechSynthesis.cancel();
  }
  // items: [[المفتاح، النص، اللغة]] ، onWord: يُستدعى مع كل جملة (لتحريك فم سراج)
  function playSeq(items, onLine) {
    stop();
    if (!enabled() || document.hidden) return;
    const my = token;
    let i = 0;
    const next = () => {
      if (my !== token || i >= items.length) return;
      const [key, text, lang] = items[i++];
      if (onLine) onLine(text);
      if (has(key)) {
        player.onended = () => { if (my === token) next(); };
        player.onerror = () => { if (my === token) { player.onerror = null; fallback(text, lang, my, next); } };
        player.src = 'voice/' + key + '.mp3';
        player.play().catch(e => { if (my === token && e && e.name !== 'AbortError' && player.onerror) { player.onerror = null; fallback(text, lang, my, next); } });
      } else {
        fallback(text, lang, my, next);
      }
    };
    next();
  }
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, () => ac(), true));

  root.Voice = { play: (key, text, lang) => playSeq([[key, text, lang]]), playSeq, stop };
})(window);

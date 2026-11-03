/* حفظ اللاعبين وتقدّمهم على الجهاز. وضع العائلة يُفعَّل برمز من لوحة الأهل.
   كل ما يُقرأ من الذاكرة أو من ملف يُنظَّف أولاً، عشان أي بيانات تالفة ما توقف اللعبة أبداً. */
(function (root) {
  'use strict';

  const KEY = 'khwarizmi.v1';
  // بيانات أطفال العائلة مشفّرة برمز العائلة (tools/family.js)، فأسماؤهم لا تظهر في الكود المنشور
  const FAMILY_ENC = 'AfJ2o2STBZpK/vsLyxyYHKPJCSB0T1Q2bX8TTuvvljG603TD/yfkHS8UjlDHF1c54srhQr2QPi5CRXKOVmwvosxTcU/6oRgnia5mfOHuhm/yliOaQPcqogvZnkHavaKrO+Xs7LoHoVYElqpje7jyuP3R12hcvr57LHf7bRGZLJ/fNftjBt7HGy1UnD/yBuqpgDxKD0ncTONoTDiRrl2QtmanYWgFlFLBYHsRVcwoAZLqt/mTYnecA5uejVISaJjaDA7/qE5l2VzeUv+no5gMub8DUNL4VNN7cmk279WXlWXWhm05kTdZ0m8ghirVdFW6voYPQbi7sPnF5Eu8KHzv0gr8pIPuQLxEdv58RX/9waNdjNPxCOqgskRsVd9EzeUxb10HRM+cz/deAucP4oIHt5PFYdtND8Bf3hla0G59SYWnBbFUOZyhUrbJ20QN51D9CKyGnZ5cmbG6EXjdk1zi3VY0snyKW/+RaPgsHaIuOJYlTzzpZmbjSjBy+TSmfROo8IJ5GARVHTP0Ir/7hm6/5Ts5n7K7aplwxOs3AVHGtoAnFW9BuunRM9VN6Z2LPo0c25Trcd2cue7glH0ioqecXk2st0YpA99Hye9NRi8p3QrKSHmWZNpqbA7506hgCGZjfNCuWdDxJfbiv/VDscQ=';
  const APP = 'khwarizmi';
  const LIMITS = [0, 15, 30, 45, 60, 90]; // دقائق اللعب في اليوم (0 = بدون حد)
  const MAX_PLAYERS = 40;

  let data = null, saveFailed = false;
  const now = () => Date.now();
  const blank = () => ({ v: 2, players: [], family: false, settings: { voice: true, limit: 30, pin: null }, lastBackup: 0, created: now() });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = (v, def, max) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.min(v, max || 1e13) : def);
  const safeKey = k => typeof k === 'string' && /^[\w:.\-]{1,60}$/.test(k);
  const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n) : '');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  // أرقام عربية أو فارسية → إنجليزية
  const digits = s => String(s == null ? '' : s).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).replace(/\s+/g, '');

  // ينظّف بيانات لاعب، ويرجع null لو مش صالحة
  function clean(p) {
    if (!isObj(p) || typeof p.id !== 'string' || !/^[\w\-]{1,40}$/.test(p.id)) return null;
    const progress = {};
    if (isObj(p.progress)) {
      for (const [k, v] of Object.entries(p.progress)) {
        if (!safeKey(k)) continue;
        const s = typeof v === 'number' ? v : isObj(v) ? +v.stars : NaN; // نقبل الشكل القديم {stars}
        if (isFinite(s)) progress[k] = Math.max(0, Math.min(3, Math.round(s)));
      }
    }
    const seen = {};
    if (isObj(p.seen)) for (const [k, v] of Object.entries(p.seen)) if (safeKey(k) && (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)))) seen[k] = v;
    const certs = {};
    if (isObj(p.certs)) for (const [k, v] of Object.entries(p.certs)) if (safeKey(k) && num(v, 0) > 0) certs[k] = v;
    const day = typeof p.day === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(p.day) ? p.day : today();
    return {
      id: p.id, fid: typeof p.fid === 'string' ? p.fid.slice(0, 8) : undefined, hi: typeof p.hi === 'string' ? p.hi.slice(0, 80) : undefined,
      name: str(p.name, 16), age: Math.max(3, Math.min(12, Math.round(+p.age) || 7)),
      gender: p.gender === 'g' ? 'g' : 'b', color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3d8bff',
      progress, seen, certs, created: num(p.created, now()), last: num(p.last, 0),
      total: num(p.total, 0, 1e9), day, daySec: num(p.daySec, 0, 864e2),
      studio: Array.isArray(p.studio) ? p.studio.filter(isObj).slice(0, 6) : undefined, // استوديو سراج: مشاريع الطفل (js/studio/core.js يتحقّق من محتواها)
    };
  }

  function load() {
    let raw = null, txt = null;
    try { txt = localStorage.getItem(KEY); raw = JSON.parse(txt); } catch (e) {
      raw = null;
      // نحتفظ بالنسخة التالفة جانباً (مرة واحدة) بدل ما تضيع
      try { if (txt && !localStorage.getItem(KEY + '.corrupt')) localStorage.setItem(KEY + '.corrupt', txt); } catch (e2) { /* لا شيء */ }
    }
    data = blank();
    try {
      if (isObj(raw)) {
        const seenIds = new Set();
        data.players = (Array.isArray(raw.players) ? raw.players : []).map(clean).filter(p => p && !seenIds.has(p.id) && seenIds.add(p.id)).slice(0, MAX_PLAYERS);
        data.family = raw.family === true;
        if (data.family && typeof raw.fk === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(raw.fk)) data.fk = raw.fk;
        data.famHidden = raw.famHidden === true;
        const s = isObj(raw.settings) ? raw.settings : {};
        data.settings.voice = s.voice !== false;
        data.settings.limit = LIMITS.includes(s.limit) ? s.limit : 30;
        data.settings.pin = typeof s.pin === 'string' && /^[0-9a-f]{8}$/.test(s.pin) ? s.pin : null;
        data.lastBackup = num(raw.lastBackup, 0);
        data.created = num(raw.created, now());
      }
    } catch (e) { data = blank(); }
    try { localStorage.setItem(KEY + '.probe', '1'); localStorage.removeItem(KEY + '.probe'); saveFailed = false; } catch (e) { saveFailed = true; }
    if (data.players.length) requestPersist();
    if (familyReady()) setTimeout(familyVoices, 0);
    return data;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); saveFailed = false; return true; } catch (e) { saveFailed = true; return false; }
  }

  // نطلب من المتصفح ألا يمسح بياناتنا عند امتلاء الذاكرة
  let persistAsked = false;
  function requestPersist() {
    if (persistAsked) return;
    persistAsked = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* غير مدعوم */ }
  }

  function addPlayer(p) {
    const pl = clean(Object.assign({ id: uid(), progress: {}, created: now() }, p));
    if (!pl) return null;
    data.players.push(pl);
    save(); requestPersist();
    return pl;
  }
  const getPlayer = id => data.players.find(p => p.id === id) || null;
  function removePlayer(id) { data.players = data.players.filter(p => p.id !== id); save(); }
  function resetPlayer(id) {
    const p = getPlayer(id);
    if (!p) return;
    p.progress = {}; p.certs = {}; p.seen = {};
    save();
  }

  // يرجع Promise<true|false>. نحفظ المفتاح المشتق (وليس الرمز) عشان أصوات الترحيب تشتغل كل مرة بدون إعادة كتابة الرمز
  let unlocking = null;
  function enableFamily(code) {
    if (unlocking) return unlocking;
    return (unlocking = (async () => {
      const o = root.Crypt && FAMILY_ENC ? await Crypt.open(FAMILY_ENC, code) : null;
      let fam = null;
      try { fam = JSON.parse(o.text); } catch (e) { return false; }
      if (!fam || fam.ok !== 'siraj' || !Array.isArray(fam.family)) return false;
      data.family = true; data.fk = o.key; data.famHidden = false;
      for (const f of fam.family) if (!data.players.some(p => p.fid === f.fid)) addPlayer(Object.assign({}, f));
      save();
      familyVoices();
      return true;
    })().finally(() => { unlocking = null; }));
  }
  const familyReady = () => data.family && !!data.fk && !data.famHidden;
  // إخفاء وضع العائلة: الجهاز يرجع "عام" (أطفال العائلة وتقدّمهم محفوظين لكن مخفيين)، والرجوع بالرمز من جديد
  function hideFamily() { if (!data.family) return; data.famHidden = true; delete data.fk; save(); }
  // اللاعبون الظاهرون: في وضع العائلة أطفال العائلة فقط، وفي الوضع العام الباقون فقط
  const visiblePlayers = () => data.players.filter(p => (familyReady() ? !!p.fid : !p.fid));
  // ترحيب كل طفل باسمه: ملف مشفّر voice/hi_<fid>.bin → يُفك بالمفتاح المحفوظ → رابط blob يشغّله Voice
  const heard = {};
  function familyVoices() {
    if (!familyReady() || !root.Voice || !Voice.blob || typeof fetch !== 'function') return;
    for (const p of data.players) {
      const k = 'hi_' + p.fid;
      if (!p.fid || !/^\w+$/.test(p.fid) || heard[k]) continue;
      heard[k] = 1;
      fetch('voice/' + k + '.bin').then(r => (r.ok ? r.arrayBuffer() : null))
        .then(b => b && Crypt.openBytes(b, data.fk))
        .then(m => { if (m) Voice.blob(k, URL.createObjectURL(new Blob([m], { type: 'audio/mpeg' }))); else delete heard[k]; })
        .catch(() => { delete heard[k]; });
    }
  }

  // صورة كل طفل: voice/pic_<fid>.bin مشفّر بنفس المفتاح → رابط blob في الذاكرة فقط (لا يُحفظ)، ثم onPic() لإعادة الرسم
  const pics = {};
  const picOf = p => (p && p.fid && typeof pics['pic_' + p.fid] === 'string' ? pics['pic_' + p.fid] : '');
  function familyPics(onPic) {
    if (!familyReady() || typeof fetch !== 'function') return;
    for (const p of data.players) {
      const k = 'pic_' + p.fid;
      if (!p.fid || !/^\w+$/.test(p.fid) || pics[k]) continue;
      pics[k] = 1;
      fetch('voice/' + k + '.bin').then(r => (r.ok ? r.arrayBuffer() : null))
        .then(b => b && Crypt.openBytes(b, data.fk))
        .then(m => { if (!m) { delete pics[k]; return; } pics[k] = URL.createObjectURL(new Blob([m], { type: 'image/png' })); if (onPic) onPic(p); })
        .catch(() => { delete pics[k]; });
    }
  }

  function win(p, levelId, stars) {
    if (!p || !safeKey(levelId)) return;
    p.progress[levelId] = Math.max(p.progress[levelId] || 0, Math.max(0, Math.min(3, stars | 0)));
    p.last = now();
    save();
  }
  const stars = p => (p ? Object.values(p.progress).reduce((a, b) => a + b, 0) : 0);
  const solved = (p, id) => !!p && (p.progress[id] || 0) > 0;
  // عالم الكمبيوتر: التقدّم محفوظ بالمفتاح cw:<id>
  const cwWin = (p, id, s) => win(p, 'cw:' + id, s == null ? 3 : s);
  const cwSolved = (p, id) => solved(p, 'cw:' + id);

  /* ---------- الوقت ---------- */
  function addTime(p, sec) {
    if (!p) return;
    const t = today();
    if (p.day !== t) { p.day = t; p.daySec = 0; }
    p.daySec = Math.min(864e2, p.daySec + sec);
    p.total = Math.min(1e9, p.total + sec);
    p.last = now();
    save();
  }
  const todaySec = p => (p && p.day === today() ? p.daySec : 0);
  function setLimit(m) { if (LIMITS.includes(m)) { data.settings.limit = m; save(); } }

  /* ---------- الرقم السري للأهل (4–6 أرقام، تُقبل الأرقام العربية) ---------- */
  const pinOk = pin => /^\d{4,6}$/.test(digits(pin));
  function hash(s) {
    let h = 2166136261;
    for (const ch of 'siraj|' + s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
    return h.toString(16).padStart(8, '0');
  }
  function setPin(pin) { if (!pinOk(pin)) return false; data.settings.pin = hash(digits(pin)); save(); return true; }
  const checkPin = pin => !!data.settings.pin && pinOk(pin) && hash(digits(pin)) === data.settings.pin;
  const hasPin = () => !!data.settings.pin;

  /* ---------- النسخ الاحتياطي والنقل ---------- */
  const pack = (type, players) => ({ app: APP, type, v: 2, date: now(), players: JSON.parse(JSON.stringify(players)) });
  function exportAll() { data.lastBackup = now(); save(); return pack('all', data.players); }
  function exportOne(id) { const p = getPlayer(id); return p ? pack('one', [p]) : null; }
  const anyProgress = () => data.players.some(p => Object.keys(p.progress).length);
  const backupDue = () => anyProgress() && now() - Math.max(data.lastBackup || 0, data.created || 0) > 7 * 864e5;

  // دمج لاعب في لاعب: نأخذ أفضل نتيجة لكل شيء، ولا نُنقص شيئاً أبداً
  function mergeInto(d, s) {
    for (const [k, v] of Object.entries(s.progress)) d.progress[k] = Math.max(d.progress[k] || 0, v);
    for (const [k, v] of Object.entries(s.certs)) d.certs[k] = d.certs[k] ? Math.min(d.certs[k], v) : v;
    for (const [k, v] of Object.entries(s.seen)) if (!(k in d.seen) || (typeof v === 'number' && typeof d.seen[k] === 'number' && v > d.seen[k])) d.seen[k] = v;
    d.total = Math.max(d.total, s.total);
    if (s.day === d.day) d.daySec = Math.max(d.daySec, s.daySec);
    d.last = Math.max(d.last, s.last);
    d.created = Math.min(d.created, s.created);
    if (!d.name && s.name) d.name = s.name;
  }

  // يرجع {count, added, merged}، ويرمي خطأ لو الملف غير صالح. كل شيء يتجهّز على نسخة أولاً
  function importData(obj) {
    if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch (e) { throw new Error('json'); } }
    if (!isObj(obj) || !Array.isArray(obj.players) || (obj.app && obj.app !== APP)) throw new Error('format');
    const incoming = obj.players.slice(0, MAX_PLAYERS).map(p => { try { return clean(p); } catch (e) { return null; } }).filter(Boolean);
    if (!incoming.length) throw new Error('empty');
    const copy = JSON.parse(JSON.stringify(data));
    let added = 0, merged = 0;
    for (const s of incoming) {
      const d = copy.players.find(x => x.id === s.id) || (s.fid && copy.players.find(x => x.fid === s.fid));
      if (d) { mergeInto(d, s); merged++; } else if (copy.players.length < MAX_PLAYERS) { copy.players.push(s); added++; }
    }
    data = copy;
    save(); requestPersist();
    return { count: added + merged, added, merged };
  }

  function setSeen(p, k, v) { if (p && safeKey(k)) { p.seen[k] = v; save(); } }

  root.Store = {
    load, save, addPlayer, getPlayer, removePlayer, resetPlayer, enableFamily, familyReady, hideFamily, visiblePlayers, familyVoices, familyPics, picOf, win, stars, solved, cwWin, cwSolved,
    addTime, todaySec, setLimit, LIMITS, setPin, checkPin, hasPin, pinOk, digits,
    exportAll, exportOne, importData, backupDue, requestPersist, setSeen, today,
    get data() { return data; }, get settings() { return data.settings; }, get saveFailed() { return saveFailed; },
  };
})(window);

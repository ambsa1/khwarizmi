/* حفظ ملفات الأطفال وتقدّمهم على الجهاز، والنقل والنسخ الاحتياطي */
(function (root) {
  'use strict';

  const KEY = 'omran.v1';
  let data = null;
  let onChange = null;

  const blank = () => ({ version: 1, profiles: [], parent: { pin: null, dailyMin: 30, voice: true }, lastBackup: 0 });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const num = (v, def) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : def);

  const avatars = () => (root.OMRAN_TEXTS && OMRAN_TEXTS.AVATARS) || ['🐪'];
  const safeKey = k => /^[a-z0-9_]{1,40}$/i.test(k);

  // ينظّف ملف طفل ويرجعه بشكل سليم، أو null لو غير صالح.
  // نتحقق من الشكل فقط، ونحتفظ بتقدّم مراحل قد لا تعرفها هذه النسخة (من نسخة أحدث مثلاً)
  function normalize(p) {
    if (!isObj(p) || typeof p.id !== 'string' || !/^[a-z0-9]{4,30}$/i.test(p.id)) return null;
    const av = avatars();
    const avatar = av.indexOf(p.avatar) >= 0 ? p.avatar : av[0];
    const progress = {};
    if (isObj(p.progress)) {
      for (const [lid, v] of Object.entries(p.progress)) {
        if (!safeKey(lid) || !isObj(v)) continue;
        progress[lid] = { stars: Math.max(0, Math.min(3, Math.round(num(v.stars, 0)))), solved: v.solved === true };
      }
    }
    const certs = {};
    if (isObj(p.certs)) for (const [k, v] of Object.entries(p.certs)) if (safeKey(k) && num(v, 0)) certs[k] = v;
    const seen = {};
    if (isObj(p.seen)) for (const [k, v] of Object.entries(p.seen)) if (v === true) seen[k] = true;
    return {
      id: p.id, avatar, name: typeof p.name === 'string' ? p.name.trim().slice(0, 20) : '',
      gender: p.gender === 'g' ? 'g' : 'b', created: num(p.created, Date.now()), lastPlayed: num(p.lastPlayed, 0),
      progress, certs, seen, totalSec: num(p.totalSec, 0), day: typeof p.day === 'string' ? p.day : today(), daySec: num(p.daySec, 0),
    };
  }

  function load() {
    // نجرّب الحفظ من البداية، عشان نعرف بدري لو المتصفح يمنعه
    try { localStorage.setItem(KEY + '.probe', '1'); localStorage.removeItem(KEY + '.probe'); saveFailed = false; } catch (e) { saveFailed = true; }
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    data = blank();
    if (isObj(raw)) {
      data.profiles = (Array.isArray(raw.profiles) ? raw.profiles : []).map(normalize).filter(Boolean);
      if (isObj(raw.parent)) {
        data.parent.pin = typeof raw.parent.pin === 'string' ? raw.parent.pin : null;
        data.parent.dailyMin = num(raw.parent.dailyMin, 30);
        data.parent.voice = raw.parent.voice !== false;
      }
      data.lastBackup = num(raw.lastBackup, 0);
    }
    return data;
  }

  let saveFailed = false;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      saveFailed = false;
      return true;
    } catch (e) {
      saveFailed = true;
      return false;
    }
  }

  // لو اللعبة مفتوحة في نافذتين، كل نافذة تقرأ آخر ما حفظته الأخرى بدل أن تمسحه
  root.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    load();
    if (onChange) onChange();
  });

  // نطلب من المتصفح ألا يمسح بياناتنا عند امتلاء الذاكرة
  function requestPersist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* غير مدعوم */ }
  }

  function addProfile(name, avatar, gender) {
    const p = normalize({ id: uid(), name, avatar, gender, created: Date.now() });
    data.profiles.push(p);
    save();
    return p;
  }

  const getProfile = id => data.profiles.find(p => p.id === id) || null;

  function deleteProfile(id) {
    data.profiles = data.profiles.filter(p => p.id !== id);
    save();
  }

  function resetProfile(id) {
    const p = getProfile(id);
    if (!p) return;
    p.progress = {}; p.certs = {};
    save();
  }

  // يسجّل الفوز ويحتفظ بأفضل نتيجة فقط
  function recordWin(p, levelId, stars) {
    const old = p.progress[levelId] || { stars: 0, solved: false };
    p.progress[levelId] = { stars: Math.max(old.stars, stars), solved: true };
    p.lastPlayed = Date.now();
    save();
  }

  const totalStars = p => Object.values(p.progress).reduce((s, x) => s + (x.stars || 0), 0);

  function addTime(p, sec) {
    const t = today();
    if (p.day !== t) { p.day = t; p.daySec = 0; }
    p.daySec += sec;
    p.totalSec += sec;
    p.lastPlayed = Date.now();
    save();
  }

  const todaySec = p => (p.day === today() ? p.daySec : 0);

  // دمج ملف طفل مع الموجود: نأخذ أفضل نتيجة لكل مرحلة
  function merge(target, incoming) {
    const p = target.profiles.find(x => x.id === incoming.id);
    if (!p) { target.profiles.push(incoming); return; }
    for (const [lid, v] of Object.entries(incoming.progress)) {
      const o = p.progress[lid] || { stars: 0, solved: false };
      p.progress[lid] = { stars: Math.max(o.stars, v.stars), solved: o.solved || v.solved };
    }
    p.certs = Object.assign({}, incoming.certs, p.certs);
    p.seen = Object.assign({}, incoming.seen, p.seen);
    p.totalSec = Math.max(p.totalSec, incoming.totalSec);
    if (incoming.name && !p.name) p.name = incoming.name;
  }

  const exportProfile = p => ({ app: 'omran', type: 'profile', version: 1, date: Date.now(), profiles: [p] });

  function exportAll() {
    data.lastBackup = Date.now();
    save();
    return { app: 'omran', type: 'all', version: 1, date: Date.now(), profiles: data.profiles };
  }

  // يرجع عدد الأطفال الذين دخلوا. يجهّز كل شيء على نسخة أولاً، فلو فشل لا يتغير شيء
  function importData(obj) {
    if (!isObj(obj) || obj.app !== 'omran' || !Array.isArray(obj.profiles)) throw new Error('not omran');
    const incoming = obj.profiles.map(normalize).filter(Boolean);
    if (!incoming.length) throw new Error('empty');
    const copy = JSON.parse(JSON.stringify(data));
    // طفل جديد صورته مستخدمة عند طفل آخر: نعطيه صورة غير مستخدمة عشان يفرّقوا بينهم
    const used = new Set(copy.profiles.map(p => p.avatar));
    for (const p of incoming) {
      if (copy.profiles.some(x => x.id === p.id)) continue;
      if (used.has(p.avatar)) p.avatar = avatars().find(a => !used.has(a)) || p.avatar;
      used.add(p.avatar);
    }
    incoming.forEach(p => merge(copy, p));
    data = copy;
    save();
    return incoming.length;
  }

  root.Store = {
    load, save, requestPersist, uid, today,
    get data() { return data; },
    get saveFailed() { return saveFailed; },
    set onChange(f) { onChange = f; },
    addProfile, getProfile, deleteProfile, resetProfile, recordWin, totalStars, addTime, todaySec,
    exportProfile, exportAll, importData,
  };
})(window);

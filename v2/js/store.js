/* حفظ اللاعبين وتقدّمهم على الجهاز. وضع العائلة يُفعَّل برمز من لوحة الأهل */
(function (root) {
  'use strict';

  const KEY = 'khwarizmi.v1';
  // بيانات أطفال العائلة مشفّرة برمز العائلة (tools/family.js)، فأسماؤهم لا تظهر في الكود المنشور
  const FAMILY_ENC = 'WgsEaLtL+QkxnMbLBtk1LRR+BmWJPDbqoHMiM2xME2/ibIIf6iwSEerLK19ZLPWa0oUkmBrNIzOF+TYQiO3nLrHh9ZyuL1GsR2h7JqvtetlKP/eyMYX/uSOBgIJNvWymzpNrp5ZEU0fhhU5MNcbZ6WptNTXiKp/+9SPzVZYv6qNfc5hBjlg1LKK+G1rEvq1Ig0LprRBsY02VedMnoNrnZQpz9X1xDxCBDWTzIOThanSxgYRR5n91XroKhy819KebhopkiWPNf9eUJp1n9VG+6fb2Uor3dakwXX49OXLgoxTD87a+jI2EA7kApOeF2n2yc9n3+H3B9wRd8Q2Et0VcOrIYwyqw8LxMwZ+cDLFkqntnuEZOsMzoxOpegc+BsFQ7cTyqPmuXS2ypyunFwXNxPnp+Hq0ffAOWIiAHMxLTfrYf746YoCZrizqdrSyLszfbStgt+pF1mo/lIjqHBZDlTL1r2ucrXeJba+EA8PiqAGJWqv5iewAXmz2UpBvZX7Rv7R1qGj5+RhnVO15CWvMR2FdQAbZNHiDOLoCuTM+oPEQNzCFn9e+FgLh9FtmgZXo5iPyWyVEv2UPlLtrNvmKYmhk=';

  let data = null;
  const blank = () => ({ v: 1, players: [], family: false, settings: { voice: true } });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  // ينظّف بيانات لاعب، عشان أي بيانات تالفة ما توقف اللعبة
  function clean(p) {
    if (!isObj(p) || typeof p.id !== 'string') return null;
    const progress = {};
    if (isObj(p.progress)) for (const [k, v] of Object.entries(p.progress)) if (typeof v === 'number') progress[k] = Math.max(0, Math.min(3, v | 0));
    return {
      id: p.id, fid: typeof p.fid === 'string' ? p.fid : undefined, hi: typeof p.hi === 'string' ? p.hi : undefined,
      name: typeof p.name === 'string' ? p.name.slice(0, 16) : '', age: Math.max(3, Math.min(12, +p.age || 7)),
      gender: p.gender === 'g' ? 'g' : 'b', color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3d8bff',
      progress, seen: isObj(p.seen) ? p.seen : {}, created: +p.created || Date.now(),
    };
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    data = blank();
    if (isObj(raw)) {
      data.players = (Array.isArray(raw.players) ? raw.players : []).map(clean).filter(Boolean);
      data.family = raw.family === true;
      if (isObj(raw.settings)) data.settings.voice = raw.settings.voice !== false;
    }
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }

  function addPlayer(p) {
    const pl = clean(Object.assign({ id: uid(), progress: {}, created: Date.now() }, p));
    data.players.push(pl);
    save();
    return pl;
  }
  const getPlayer = id => data.players.find(p => p.id === id) || null;
  function removePlayer(id) { data.players = data.players.filter(p => p.id !== id); save(); }

  function enableFamily(code) {
    const txt = Crypt.open(FAMILY_ENC, code);
    let fam = null;
    try { fam = JSON.parse(txt); } catch (e) { return false; }
    if (!fam || fam.ok !== 'siraj') return false;
    data.family = true;
    for (const f of fam.family) if (!data.players.some(p => p.fid === f.fid)) addPlayer(Object.assign({}, f));
    save();
    return true;
  }

  function win(p, levelId, stars) {
    p.progress[levelId] = Math.max(p.progress[levelId] || 0, stars);
    save();
  }
  const stars = p => Object.values(p.progress).reduce((a, b) => a + b, 0);
  const solved = (p, id) => (p.progress[id] || 0) > 0;

  root.Store = {
    load, save, addPlayer, getPlayer, removePlayer, enableFamily, win, stars, solved,
    get data() { return data; }, get settings() { return data.settings; },
  };
})(window);

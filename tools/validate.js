// يتأكد إن كل مرحلة صحيحة، وإن حلّها يشتغل، وإن صوت منيب مطابق للنصوص:  node tools/validate.js
const fs = require('fs');
const path = require('path');
const E = require('../js/engine.js');
const WORLDS = require('../js/levels.js');
const T = require('../js/texts.js');
const { buildTexts } = require('./collect_texts.js');

let bad = 0;
const ids = new Set();
for (const w of WORLDS) {
  for (const L of w.levels) {
    const errs = [];
    if (ids.has(L.id)) errs.push('id مكرر');
    ids.add(L.id);
    const W = L.grid[0].length;
    if (L.grid.some(r => r.length !== W)) errs.push('صفوف اللوحة مختلفة الطول');
    const [x, y, d] = L.start;
    const c = (L.grid[y] || '')[x];
    if (c === undefined || c === '#' || c === 'W') errs.push('مكان البداية غير صالح');
    if (d < 0 || d > 3) errs.push('اتجاه البداية غير صالح');
    const prog = E.fromCompact(L.solution);
    for (const k of E.kindsUsed(prog)) if (!L.palette.includes(k)) errs.push('الحل يستخدم بطاقة غير موجودة: ' + k);
    const n = E.countBlocks(prog);
    if (L.maxBlocks && n > L.maxBlocks) errs.push(`الحل ${n} بطاقة أكبر من الحد ${L.maxBlocks}`);
    const r = E.run(prog, L);
    if (!r.ok) errs.push('الحل لا ينجح: ' + r.reason);
    if (r.early) errs.push('الحل يصل قبل أن ينتهي التكرار (الرقم الصحيح ' + r.early.used + ')');
    for (const m of (L.intro + L.hint).match(/\{(\w+)\}/g) || []) {
      if (!E.KINDS[m.slice(1, -1)]) errs.push('رمز غير معروف في النص: ' + m);
    }
    if (/بطاقة\s*\{/.test(L.intro + L.hint)) errs.push('كلمة "بطاقة" قبل الرمز ستتكرر في الصوت');
    console.log((errs.length ? 'FAIL ' : 'ok   ') + L.id + `  blocks=${n}` + (L.maxBlocks ? `/${L.maxBlocks}` : '') + (errs.length ? '  ' + errs.join(' | ') : ''));
    bad += errs.length;
  }
}

for (const g of T.GLOSSARY) {
  if (!ids.has(g.level)) { console.log('FAIL glossary ' + g.k + ': مرحلة غير موجودة ' + g.level); bad++; }
}

// لا حروف إنجليزية داخل الجمل الصوتية العربية
for (const t of buildTexts()) {
  if (t.lang === 'ar' && /[a-z]/i.test(t.text)) { console.log('FAIL voice ' + t.key + ': فيها كلمة إنجليزية: ' + t.text.match(/[a-z_()]+/i)[0]); bad++; }
}

// الصوت: كل جملة لها ملف، والملفات مولّدة من نفس النص الحالي
const now = buildTexts();
let last = [];
try { last = JSON.parse(fs.readFileSync(path.join(__dirname, 'voice_texts.json'), 'utf8')); } catch (e) { /* لم يُولَّد بعد */ }
const lastMap = new Map(last.map(t => [t.key, t.text]));
const stale = now.filter(t => lastMap.get(t.key) !== t.text || !fs.existsSync(path.join(__dirname, '..', 'voice', t.key + '.mp3')));
if (stale.length) {
  console.log(`VOICE ${stale.length} جملة صوتها قديم أو ناقص: ${stale.slice(0, 8).map(t => t.key).join(', ')}${stale.length > 8 ? ' ...' : ''}`);
  console.log('      شغّل: node tools/collect_texts.js ثم python tools/make_voice.py');
  bad++;
} else {
  console.log('voice ok');
}

process.exit(bad ? 1 : 0);

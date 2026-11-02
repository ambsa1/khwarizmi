// يجمع كل كلام سراج في ملف واحد ليُولَّد صوته:
//   node tools/voice.js "رمز العائلة"   ثم   python tools/make_voice.py
// رمز العائلة اختياري: بدونه ما يتولّد ترحيب أطفال العائلة بأسمائهم.
const fs = require('fs');
const path = require('path');
const T = require('../js/texts.js');
const TRACKS = require('../js/levels.js');
const Crypt = require('../js/crypt.js');

const out = [];
for (const [k, v] of Object.entries(T.SAY)) out.push({ key: k, text: v });
for (const [k, v] of Object.entries(T.CARD)) out.push({ key: 'k_' + k, text: v });
T.PHRASES.forEach((p, i) => out.push({ key: 'ph_' + i, text: p[1] }));
// كلمات البطاقات بالإنجليزي (en_)، أسماء الألوان (c_)، والأرقام التي يقولها سراج (n_)
for (const [k, v] of Object.entries(T.EN || {})) out.push({ key: 'en_' + k, text: v, lang: 'en' });
for (const [k, v] of Object.entries(T.COLORS || {})) out.push({ key: 'c_' + k, text: v });
(T.NUMS || []).forEach((v, i) => out.push({ key: 'n_' + i, text: v }));
for (const t of TRACKS) for (const L of t.levels) out.push({ key: 'goal_' + L.id, text: L.goal });

const code = process.argv[2];
if (code) {
  const store = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
  const enc = store.match(/FAMILY_ENC = '([^']+)'/)[1];
  const fam = JSON.parse(Crypt.open(enc, code));
  for (const f of fam.family) out.push({ key: 'hi_' + f.fid, text: f.hi });
}

// الموسوعة والمكافآت (x_)، وكلمات الكود بالإنجليزي (en_، تُنطق بصوت إنجليزي)
const XT = require('../js/extras-texts.js');
for (const [k, v] of Object.entries(XT.SAY)) out.push({ key: k, text: v });
for (const [k, v] of Object.entries(XT.EN)) out.push({ key: 'en_' + k, text: v, lang: 'en' });

// عالم الكمبيوتر (cw_)، والمفاتيح cw_en_ بصوت إنجليزي
const CWT = require('../js/cw/texts.js');
for (const [k, v] of Object.entries(CWT)) out.push(k.startsWith('cw_en_') ? { key: k, text: v, lang: 'en' } : { key: k, text: v });

// مفتاح واحد لكل ملف صوت (الأخير يكسب)، عشان ما يتولّد نفس الملف مرتين في نفس الوقت
const uniq = [...new Map(out.map(i => [i.key, i])).values()];
fs.writeFileSync(path.join(__dirname, 'voice_texts.json'), JSON.stringify(uniq, null, 1));
console.log(uniq.length + ' texts');

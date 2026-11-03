// يجمع كل كلام سراج في ملف واحد ليُولَّد صوته:
//   node tools/voice.js   ثم   python tools/make_voice.py
// رمز العائلة يُقرأ من tools/family-code.local.txt (بدونه ما يتولّد ترحيب أطفال العائلة بأسمائهم).
// ملفات الترحيب hi_*.mp3 تتشفّر تلقائياً إلى hi_*.bin في آخر make_voice.py (tools/family.js) ولا تُنشر كـ mp3 أبداً.
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

(async () => {
// ترحيب أطفال العائلة (hi_): الرمز من tools/family-code.local.txt. make_voice.py يشفّر ملفاتهم بعدها (tools/family.js)
let code = process.argv[2];
if (!code) { try { code = fs.readFileSync(path.join(__dirname, 'family-code.local.txt'), 'utf8').trim(); } catch (e) { /* بدون عائلة */ } }
if (code) {
  const store = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
  const enc = store.match(/FAMILY_ENC = '([^']+)'/)[1];
  const o = await Crypt.open(enc, code);
  if (!o) { console.error('family code does not open FAMILY_ENC (run node tools/family.js)'); process.exit(1); }
  for (const f of JSON.parse(o.text).family) out.push({ key: 'hi_' + f.fid, text: f.hi });
}

// الموسوعة والمكافآت (x_)، وكلمات الكود بالإنجليزي (en_، تُنطق بصوت إنجليزي)
const XT = require('../js/extras-texts.js');
for (const [k, v] of Object.entries(XT.SAY)) out.push({ key: k, text: v });
for (const [k, v] of Object.entries(XT.EN)) out.push({ key: 'en_' + k, text: v, lang: 'en' });

// عالم الكمبيوتر (cw_)، والمفاتيح cw_en_ بصوت إنجليزي
const CWT = require('../js/cw/texts.js');
for (const [k, v] of Object.entries(CWT)) out.push(k.startsWith('cw_en_') ? { key: k, text: v, lang: 'en' } : { key: k, text: v });

// الإنجليزية (en2_): كلها بصوت إنجليزي (en2 = صوت آنا). الترجمة العربية EN_AR للعرض فقط وما يتولّدش لها صوت
const ENT = require('../js/en/texts.js');
for (const [k, v] of Object.entries(ENT)) out.push({ key: k, text: v, lang: 'en2' });

// الرياضيات (m_)
const MT = require('../js/math/texts.js');
for (const [k, v] of Object.entries(MT)) out.push({ key: k, text: v });

// استوديو سراج (st_)
const ST = require('../js/studio/texts.js');
for (const [k, v] of Object.entries(ST)) out.push({ key: k, text: v });

// مسارات شاشة الناتج: ملفاتها بتضيف على الجداول نفسها عند التحميل، فنوفّرها كمتغيرات عامة ثم نعيد الجمع
globalThis.SIRAJ_TEXTS = T; globalThis.TRACKS = TRACKS;
require('../js/texts-py.js'); require('../js/levels-py.js');
for (const [k, v] of Object.entries(T.SAY)) out.push({ key: k, text: v });
for (const t of TRACKS) for (const L of t.levels) out.push({ key: 'goal_' + L.id, text: L.goal });

// دفتر البرمجة (lr_)
const LR = require('../js/learn/texts.js');
for (const [k, v] of Object.entries(LR)) out.push({ key: k, text: v });

// مفتاح واحد لكل ملف صوت (الأخير يكسب)، عشان ما يتولّد نفس الملف مرتين في نفس الوقت
const uniq = [...new Map(out.map(i => [i.key, i])).values()];
fs.writeFileSync(path.join(__dirname, 'voice_texts.json'), JSON.stringify(uniq, null, 1));
console.log(uniq.length + ' texts');
})();

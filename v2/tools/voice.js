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
for (const t of TRACKS) for (const L of t.levels) out.push({ key: 'goal_' + L.id, text: L.goal });

const code = process.argv[2];
if (code) {
  const store = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
  const enc = store.match(/FAMILY_ENC = '([^']+)'/)[1];
  const fam = JSON.parse(Crypt.open(enc, code));
  for (const f of fam.family) out.push({ key: 'hi_' + f.fid, text: f.hi });
}

fs.writeFileSync(path.join(__dirname, 'voice_texts.json'), JSON.stringify(out, null, 1));
console.log(out.length + ' texts');

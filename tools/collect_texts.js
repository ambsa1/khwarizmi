// يجمع كل الجمل التي يقولها منيب في ملف واحد، ليُولّد صوتها:  node tools/collect_texts.js
const fs = require('fs');
const path = require('path');
const WORLDS = require('../js/levels.js');
const T = require('../js/texts.js');

const voiceText = t => t.replace(/\{(\w+)\}/g, (m, k) => T.KIND_VOICE[k] || k);

function buildTexts() {
  const out = [];
  for (const [k, v] of Object.entries(T.SAY)) out.push({ key: k, text: v, lang: 'ar' });
  for (const w of WORLDS) for (const L of w.levels) {
    out.push({ key: L.id + '_intro', text: voiceText(L.intro), lang: 'ar' });
    out.push({ key: L.id + '_hint', text: voiceText(L.hint), lang: 'ar' });
  }
  for (const g of T.GLOSSARY) out.push({ key: 'gl_' + g.k, text: g.say || g.ar, lang: 'ar' });
  for (const [k, v] of Object.entries(T.EN)) out.push({ key: 'en_' + k, text: v, lang: 'en' });
  for (const [k, v] of Object.entries(T.KIND_AR)) out.push({ key: 'kind_' + k, text: v, lang: 'ar' });
  T.NUMBERS.forEach((v, n) => { if (n) out.push({ key: 'num_' + n, text: v, lang: 'ar' }); });
  return out;
}

module.exports = { buildTexts };

if (require.main === module) {
  const out = buildTexts();
  fs.writeFileSync(path.join(__dirname, 'voice_texts.json'), JSON.stringify(out, null, 1));
  console.log(out.length + ' texts');
}

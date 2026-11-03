// يشفّر بيانات أطفال العائلة وأصوات الترحيب بأسمائهم برمز العائلة، عشان ما يظهر أي اسم في الملفات المنشورة.
//   node tools/family.js            (الرمز يُقرأ من tools/family-code.local.txt — لا تكتبه في سطر الأوامر)
//   node tools/family.js --new      (ملح جديد: يعيد تشفير كل شيء)
// يعمل:
//   1) لو tools/family.local.json اتغيّر (أو --new) → يكتب FAMILY_ENC جديداً في js/store.js
//      ويعيد تشفير ملفات voice/hi_*.bin الموجودة بالمفتاح الجديد.
//   2) أي voice/hi_*.mp3 (ناتج make_voice.py) → voice/hi_*.bin مشفّر، ويُمسح الـ mp3.
// make_voice.py يشغّله تلقائياً في آخره. لا يطبع الرمز ولا الأسماء أبداً.
const fs = require('fs');
const path = require('path');
const Crypt = require('../js/crypt.js');

const ROOT = path.join(__dirname, '..'), VOICE = path.join(ROOT, 'voice'), STORE = path.join(ROOT, 'js', 'store.js');
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
let code = arg;
if (!code) { try { code = fs.readFileSync(path.join(__dirname, 'family-code.local.txt'), 'utf8').trim(); } catch (e) { /* لا شيء */ } }
if (!code) { console.error('رمز العائلة غير موجود (tools/family-code.local.txt)'); process.exit(1); }

(async () => {
  const src = fs.readFileSync(STORE, 'utf8');
  const cur = (src.match(/FAMILY_ENC = '([^']*)'/) || [])[1] || '';
  const text = JSON.stringify({ ok: 'siraj', family: JSON.parse(fs.readFileSync(path.join(__dirname, 'family.local.json'), 'utf8')) });
  const old = cur ? await Crypt.open(cur, code) : null;
  let key = old && old.key;
  const bins = fs.readdirSync(VOICE).filter(f => /^hi_\w+\.bin$/.test(f));
  if (process.argv.includes('--new') || !old || old.text !== text) {
    const s = await Crypt.seal(text, code);
    for (const f of bins) { // نفس الصوت بالمفتاح الجديد
      const plain = key ? await Crypt.openBytes(fs.readFileSync(path.join(VOICE, f)), key) : null;
      if (plain) fs.writeFileSync(path.join(VOICE, f), await Crypt.sealBytes(plain, s.key));
      else { fs.unlinkSync(path.join(VOICE, f)); console.log('removed undecryptable ' + f + ' (run make_voice.py again)'); }
    }
    fs.writeFileSync(STORE, src.replace(/FAMILY_ENC = '[^']*'/, `FAMILY_ENC = '${s.data}'`));
    key = s.key;
    console.log('FAMILY_ENC updated in js/store.js');
  }
  let n = 0;
  for (const f of fs.readdirSync(VOICE).filter(f => /^hi_\w+\.mp3$/.test(f))) {
    const mp3 = path.join(VOICE, f);
    fs.writeFileSync(mp3.replace(/\.mp3$/, '.bin'), await Crypt.sealBytes(fs.readFileSync(mp3), key));
    fs.unlinkSync(mp3); n++;
  }
  console.log(`family voices encrypted: ${n}, total ${fs.readdirSync(VOICE).filter(f => /^hi_\w+\.bin$/.test(f)).length}`);
})().catch(e => { console.error('family.js failed:', e.message); process.exit(1); });

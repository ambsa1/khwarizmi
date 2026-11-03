// صور أطفال العائلة: تُقصّ دائرياً وتُصغّر ثم تُشفّر برمز العائلة، عشان ما تظهر أي صورة في الملفات المنشورة.
//   node tools/pics.js
// يقرأ tools/pics.local.json (غير منشور): { "<fid>": "<مسار الصورة الأصلية>", ... }
// والرمز من tools/family-code.local.txt. الناتج: voice/pic_<fid>.bin (مشفّر بنفس مفتاح الترحيب).
const fs = require('fs');
const path = require('path');
const Crypt = require('../js/crypt.js');
const { chromium } = require('../tests/node_modules/playwright');

const ROOT = path.join(__dirname, '..'), VOICE = path.join(ROOT, 'voice');
const SIZE = 320;
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'pics.local.json'), 'utf8'));
const code = fs.readFileSync(path.join(__dirname, 'family-code.local.txt'), 'utf8').trim();

(async () => {
  const enc = (fs.readFileSync(path.join(ROOT, 'js', 'store.js'), 'utf8').match(/FAMILY_ENC = '([^']*)'/) || [])[1];
  const o = enc && await Crypt.open(enc, code);
  if (!o) { console.error('رمز العائلة غير صحيح'); process.exit(1); }
  const b = await chromium.launch(), pg = await b.newPage();
  let n = 0;
  for (const [fid, src] of Object.entries(map)) {
    if (!/^\w+$/.test(fid) || !fs.existsSync(src)) { console.log('skip ' + fid); continue; }
    const data = 'data:image/' + (src.endsWith('.png') ? 'png' : 'webp') + ';base64,' + fs.readFileSync(src).toString('base64');
    // قصّ دائري مع تكبير بسيط عشان نشيل الحواف البيضاء، ثم PNG صغير
    const png = await pg.evaluate(([d, S]) => new Promise(res => {
      const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
        x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
        const z = 1.18, w = im.width / z, h = im.height / z;
        x.drawImage(im, (im.width - w) / 2, (im.height - h) / 2 - im.height * 0.02, w, h, 0, 0, S, S);
        res(c.toDataURL('image/png').split(',')[1]);
      }; im.src = d;
    }), [data, SIZE]);
    const bytes = Buffer.from(png, 'base64');
    fs.writeFileSync(path.join(VOICE, 'pic_' + fid + '.bin'), await Crypt.sealBytes(bytes, o.key));
    n++;
  }
  await b.close();
  console.log('family pictures encrypted: ' + n);
})().catch(e => { console.error('pics.js failed:', e.message); process.exit(1); });

// يولّد أيقونات التطبيق من icons/logo.svg (شعار «خ»):   node tools/make_icons.js
// من logo.svg نأخذ <defs> و <g id="art"> فقط، والخلفية (tile) نرسمها هنا لكل مقاس:
//   icon-192.png و icon-512.png: زوايا مدوّرة وخلفية شفافة
//   icon-maskable-512.png: مربع كامل بلا شفافية، والرسمة داخل المنطقة الآمنة (دائرة ٨٠٪) — scale .72
//   apple-touch-icon.png: ١٨٠ مربع بلا شفافية (آيفون يدوّر الزوايا بنفسه)
//   favicon-32.png: الرسمة أكبر شوية وبدون الهالة، عشان تبان في تبويب المتصفح
//   icon.svg: نفس أيقونة ٥١٢ كملف متّجه
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'tests', 'node_modules', 'playwright'));

const DIR = path.join(__dirname, '..', 'icons');
const src = fs.readFileSync(path.join(DIR, 'logo.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const defs = src.match(/<defs>[\s\S]*<\/defs>/)[0];
const art = src.match(/<g id="art">[\s\S]*<\/g>\s*<\/svg>/)[0].replace(/<\/svg>\s*$/, '');
const noHalo = art.replace(/<circle[^>]*url\(#halo\)[^>]*\/>/, '');

const svg = (round, scale, small) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${256 * (1 - scale)} ${256 * (1 - scale)}) scale(${scale})">${small ? noHalo : art}</g></svg>`;

const OUT = [
  ['icon-192.png', 192, true, 1],
  ['icon-512.png', 512, true, 1],
  ['icon-maskable-512.png', 512, false, 0.72],
  ['apple-touch-icon.png', 180, false, 0.9],
  ['favicon-32.png', 32, true, 1.08, true],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [name, size, round, scale, small] of OUT) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg(round, scale, small).replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
    await page.screenshot({ path: path.join(DIR, name), omitBackground: round, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('icons/' + name);
  }
  fs.writeFileSync(path.join(DIR, 'icon.svg'), svg(true, 1));
  await browser.close();
})();

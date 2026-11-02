// يجهّز قائمة كل ملفات اللعبة للتخزين في الجهاز (العمل بدون إنترنت)، مع بصمة تتغيّر تلقائياً مع أي تعديل:
//   node tools/precache.js
// شغّله قبل كل رفع. ينتج ملف precache.js الذي يقرؤه sw.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SKIP = /^(tests|tools|docs)(\/|$)|(^|\/)\.|\.md$|manifest\.json$|precache\.js$|sw\.js$/;
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f), rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (SKIP.test(rel)) continue;
    if (fs.statSync(full).isDirectory()) walk(full); else files.push(rel);
  }
})(ROOT);
files.sort();
const h = crypto.createHash('sha1');
for (const f of files) h.update(f).update(fs.readFileSync(path.join(ROOT, f)));
const version = h.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'precache.js'), `self.PRECACHE = ${JSON.stringify({ version, files: ['./'].concat(files) })};\n`);
console.log(`${files.length} files, version ${version}`);

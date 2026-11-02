// يشفّر بيانات أطفال العائلة برمز العائلة، عشان أسماؤهم ما تظهر في الكود المنشور.
//   node tools/family.js "رمز العائلة"
// البيانات في tools/family.local.json (ملف محلي لا يُرفع على جيت هب).
// ينتج سطراً يُلصق في js/store.js مكان FAMILY_ENC.
const fs = require('fs');
const path = require('path');
const crypt = require('../js/crypt.js');

const code = process.argv[2];
if (!code) { console.error('اكتب رمز العائلة'); process.exit(1); }
const FAMILY = JSON.parse(fs.readFileSync(path.join(__dirname, 'family.local.json'), 'utf8'));
console.log(crypt.seal(JSON.stringify({ ok: 'siraj', family: FAMILY }), code));

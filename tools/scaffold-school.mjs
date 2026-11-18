// ينشئ هيكل المدرسة الفارغ: ستة صفوف × خمس مواد.
// لكل صف ومادة ملفّان: ملف الوحدات في content/school/gN/<subject>.json وملف المهارات في content/skills/school/gN-<subject>.json
// آمن للتكرار: لا يكتب فوق أي ملف موجود. شغّله بعد إضافة مادة أو صف جديد:
//   node tools/scaffold-school.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADES = [1, 2, 3, 4, 5, 6];
const SUBJECTS = {
  math: { ar: 'الرياضيات', en: 'Mathematics' },
  science: { ar: 'العلوم', en: 'Science' },
  arabic: { ar: 'اللغة العربية', en: 'Arabic' },
  islamic: { ar: 'التربية الإسلامية', en: 'Islamic Studies' },
  english: { ar: 'اللغة الإنجليزية المدرسية', en: 'School English' },
};
const ORD = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];

let made = 0, kept = 0;
function put(rel, data) {
  const file = join(ROOT, rel);
  if (existsSync(file)) { kept++; return; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  made++;
}

for (const g of GRADES) {
  for (const [s, t] of Object.entries(SUBJECTS)) {
    const title = { ar: `${t.ar}، الصف ${ORD[g]}`, en: `${t.en}, Grade ${g}` };
    put(`content/school/g${g}/${s}.json`, {
      $schema: '../../../schemas/school-subject.schema.json',
      grade: g, subject: s, title, status: 'awaiting-source', sources: [], units: [],
    });
    put(`content/skills/school/g${g}-${s}.json`, {
      $schema: '../../../schemas/skill-tree.schema.json',
      domain: 'school', pillar: 'school', world: 'marra', grade: g, subject: s, title, status: 'awaiting-source', skills: [],
    });
  }
}
console.log(`school scaffold: ${made} created, ${kept} already existed`);

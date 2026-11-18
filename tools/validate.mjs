// فاحص المحتوى: يتأكّد أن كل ملف في content/ يطابق مخطّطه، ثم يطبّق القواعد العابرة للملفات.
//   npm run validate
// أي خطأ يوقف البناء (رمز خروج 1). التحذيرات لا توقفه.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = f => relative(ROOT, f).split(sep).join('/');
const errors = [], warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

// ---------- المخطّطات ----------
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaDir = join(ROOT, 'schemas');
for (const f of readdirSync(schemaDir).filter(f => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, f), 'utf8')), f);
}

// ---------- أي ملف يُفحص بأي مخطّط ----------
const RULES = [
  [/^content\/worlds\/worlds\.json$/, 'worlds.schema.json'],
  [/^content\/skills\/[a-z]+\.json$/, 'skill-tree.schema.json'],
  [/^content\/skills\/school\/g[1-6]-[a-z]+\.json$/, 'skill-tree.schema.json'],
  [/^content\/school\/g[1-6]\/[a-z]+\.json$/, 'school-subject.schema.json'],
  [/^content\/lessons\/.+\.json$/, 'lesson.schema.json'],
  [/^content\/sources\/sources\.json$/, 'sources.schema.json'],
  [/^content\/legacy\/coding-75\.json$/, 'legacy-coding.schema.json'],
  [/^content\/persona\/siraj\.json$/, 'persona.schema.json'],
  [/^content\/templates\/templates\.json$/, 'templates.schema.json'],
  [/^content\/design\/tokens\.json$/, 'tokens.schema.json'],
];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

const docs = {}; // المسار ← المحتوى
for (const full of walk(join(ROOT, 'content'))) {
  const r = rel(full);
  if (!r.endsWith('.json')) { err(r, 'ملف غير معروف داخل مجلد المحتوى'); continue; }
  const rule = RULES.find(([re]) => re.test(r));
  if (!rule) { err(r, 'لا يوجد مخطّط لهذا المسار'); continue; }
  let data;
  try { data = JSON.parse(readFileSync(full, 'utf8')); } catch (e) { err(r, 'ملف JSON غير صالح: ' + e.message); continue; }
  const validate = ajv.getSchema(rule[1]);
  if (!validate(data)) {
    for (const e of validate.errors) err(r, `${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ' (' + e.params.additionalProperty + ')' : ''}`);
    continue;
  }
  docs[r] = data;
}

const get = r => docs[r];
const pick = re => Object.entries(docs).filter(([r]) => re.test(r));

// ---------- القواعد العابرة للملفات ----------
const worldsDoc = get('content/worlds/worlds.json');
const worlds = worldsDoc ? worldsDoc.worlds : [];
const worldById = new Map(worlds.map(w => [w.id, w]));
const zoneWorld = new Map();
const uniq = (list, what, file) => {
  const seen = new Set();
  for (const v of list) { if (seen.has(v)) err(file, `${what} مكرّر: ${v}`); seen.add(v); }
};

// العوالم: أرقام ومناطق وقمم وأختام فريدة
if (worldsDoc) {
  const W = 'content/worlds/worlds.json';
  uniq(worlds.map(w => w.id), 'عالم', W);
  uniq(worlds.map(w => w.order), 'ترتيب عالم', W);
  uniq(worlds.map(w => w.summit.id), 'قمّة', W);
  uniq(worlds.map(w => w.summit.reward.stamp), 'ختم', W);
  uniq(worlds.map(w => w.domain), 'مجال عالم', W);
  if (worlds.filter(w => w.kind === 'landmark').length < 5) err(W, 'يجب وجود خمسة عوالم معالم على الأقل');
  for (const w of worlds) {
    uniq(w.zones.map(z => z.order), `ترتيب منطقة في ${w.id}`, W);
    for (const z of w.zones) {
      if (!z.id.startsWith(w.id + '.')) err(W, `المنطقة ${z.id} يجب أن تبدأ باسم عالمها ${w.id}`);
      if (zoneWorld.has(z.id)) err(W, `منطقة مكرّرة: ${z.id}`);
      zoneWorld.set(z.id, w.id);
    }
    if (!w.summit.id.startsWith(w.id + '.')) err(W, `القمّة ${w.summit.id} يجب أن تبدأ باسم عالمها`);
    if (w.id === 'marra') for (let g = 1; g <= 6; g++) if (!w.zones.some(z => z.grade === g)) err(W, `جبل مرّة بلا مصطبة للصف ${g}`);
  }
}

// القوالب
const templatesDoc = get('content/templates/templates.json');
const templates = new Map((templatesDoc ? templatesDoc.templates : []).map(t => [t.id, t]));
if (templatesDoc) uniq(templatesDoc.templates.map(t => t.id), 'قالب', 'content/templates/templates.json');

// شجرة المهارات: كل مهارة مرة واحدة فقط في كل اللعبة
const skills = new Map(); // الرقم ← { skill, file, tree }
const titleKey = new Map();
const norm = s => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^ء-ي0-9a-z]/gi, '').toLowerCase();
const trees = pick(/^content\/skills\//);
for (const [file, tree] of trees) {
  const w = tree.world && worldById.get(tree.world);
  if (!w) { err(file, `العالم ${tree.world} غير موجود`); }
  else if (w.domain !== tree.domain) err(file, `مجال الشجرة ${tree.domain} لا يطابق مجال العالم ${w.domain}`);
  const isSchool = tree.domain === 'school';
  if (isSchool) {
    const m = file.match(/g([1-6])-([a-z]+)\.json$/);
    if (!m || +m[1] !== tree.grade || m[2] !== tree.subject) err(file, 'الصف أو المادة داخل الملف لا يطابق اسم الملف');
  } else if (tree.grade || tree.subject) err(file, 'شجرة مهارات المستقبل لا تحمل صفًّا ولا مادة');
  for (const s of tree.skills) {
    if (skills.has(s.id)) { err(file, `المهارة ${s.id} معرّفة مرّتين (الأولى في ${skills.get(s.id).file}). صفر تكرار`); continue; }
    skills.set(s.id, { skill: s, file, tree });
    if (!s.id.startsWith(tree.domain + '.')) err(file, `المهارة ${s.id} يجب أن تبدأ بمجالها ${tree.domain}`);
    if (isSchool && !s.id.startsWith(`school.g${tree.grade}.${tree.subject}.`)) err(file, `مهارة المدرسة ${s.id} يجب أن تبدأ بـ school.g${tree.grade}.${tree.subject}.`);
    if (zoneWorld.get(s.zone) !== tree.world) err(file, `المهارة ${s.id}: المنطقة ${s.zone} ليست في عالم ${tree.world}`);
    if (isSchool && s.zone !== `marra.g${tree.grade}`) err(file, `المهارة ${s.id} يجب أن تكون في مصطبة marra.g${tree.grade}`);
    if (s.ages.max && s.ages.max < s.ages.min) err(file, `المهارة ${s.id}: أكبر عمر أصغر من أصغر عمر`);
    for (const t of s.templates || []) {
      const T = templates.get(t);
      if (!T) err(file, `المهارة ${s.id}: القالب ${t} غير مسجّل`);
      else if (!T.domains.includes(tree.domain)) err(file, `المهارة ${s.id}: القالب ${t} غير مسموح لمجال ${tree.domain}`);
    }
    const k = norm(s.title.ar);
    if (titleKey.has(k)) err(file, `عنوان مهارة مكرّر في المعنى: «${s.title.ar}» يشبه ${titleKey.get(k)}`);
    else titleKey.set(k, s.id);
  }
}
// المتطلّبات موجودة، وبلا دوائر
for (const [id, { skill, file }] of skills) {
  for (const r of skill.requires || []) {
    const dep = skills.get(r);
    if (!dep) { err(file, `المهارة ${id} تتطلّب ${r} وهي غير موجودة`); continue; }
    if (dep.skill.ages.min > skill.ages.min) warn(file, `المهارة ${id} (من ${skill.ages.min}) تتطلّب ${r} (من ${dep.skill.ages.min})`);
  }
}
const state = new Map();
function visit(id, trail) {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { err(skills.get(id).file, `دائرة في المتطلّبات: ${[...trail, id].join(' ← ')}`); return; }
  state.set(id, 1);
  for (const r of (skills.get(id).skill.requires || [])) if (skills.has(r)) visit(r, [...trail, id]);
  state.set(id, 2);
}
for (const id of skills.keys()) visit(id, []);
// كل منطقة في عوالم المستقبل فيها مهارة واحدة على الأقل
for (const w of worlds) {
  if (w.pillar !== 'future') continue;
  if (!trees.some(([, t]) => t.world === w.id)) { err('content/worlds/worlds.json', `العالم ${w.id} بلا شجرة مهارات`); continue; }
  for (const z of w.zones) if (![...skills.values()].some(v => v.skill.zone === z.id)) err('content/worlds/worlds.json', `المنطقة ${z.id} فارغة من المهارات`);
}

// المدرسة: ستة صفوف × خمس مواد، والمصادر صحيحة
const sourcesDoc = get('content/sources/sources.json');
const sources = new Map((sourcesDoc ? sourcesDoc.sources : []).map(s => [s.id, s]));
if (sourcesDoc) uniq(sourcesDoc.sources.map(s => s.id), 'مصدر', 'content/sources/sources.json');
const SUBJECTS = ['math', 'science', 'arabic', 'islamic', 'english'];
let schoolFiles = 0;
for (let g = 1; g <= 6; g++) for (const s of SUBJECTS) {
  const f = `content/school/g${g}/${s}.json`, k = `content/skills/school/g${g}-${s}.json`;
  if (!existsSync(join(ROOT, f))) err(f, 'ملف المادة غير موجود (شغّل node tools/scaffold-school.mjs)');
  if (!existsSync(join(ROOT, k))) err(k, 'ملف مهارات المادة غير موجود (شغّل node tools/scaffold-school.mjs)');
  const d = get(f);
  if (!d) continue;
  schoolFiles++;
  if (d.grade !== g || d.subject !== s) err(f, 'الصف أو المادة داخل الملف لا يطابق المسار');
  for (const id of d.sources) {
    const src = sources.get(id);
    if (!src) err(f, `المصدر ${id} غير مسجّل`);
    else if (src.grade !== g || src.subject !== s) err(f, `المصدر ${id} لصف أو مادة أخرى`);
  }
  if (d.status !== 'awaiting-source' && !d.sources.length) err(f, 'حالة المادة تتطلّب مصدرًا مسجّلًا');
  uniq(d.units.map(u => u.id), 'وحدة', f);
  uniq(d.units.map(u => u.order), 'ترتيب وحدة', f);
}

// الدروس: مهاراتها موجودة، ومصدرها مسجّل، وقوالبها مسجّلة
for (const [file, lesson] of pick(/^content\/lessons\//)) {
  for (const id of [...lesson.skills, ...(lesson.reviews || [])]) if (!skills.has(id)) err(file, `المهارة ${id} غير موجودة في الشجرة`);
  if (lesson.source && !sources.has(lesson.source.id)) err(file, `المصدر ${lesson.source.id} غير مسجّل`);
  for (const a of lesson.activities) if (!templates.has(a.template)) err(file, `القالب ${a.template} غير مسجّل`);
}

// المصادر: هل الملف موجود على اللابتوب؟
let downloaded = 0;
for (const s of sources.values()) {
  if (s.localPath && existsSync(join(ROOT, s.localPath))) downloaded++;
  else warn('content/sources/sources.json', `الملف غير موجود محليًا بعد: ${s.localPath || s.id}`);
}

// المفاهيم البرمجية الخمسة والسبعون
const legacy = get('content/legacy/coding-75.json');
if (legacy) {
  const L = 'content/legacy/coding-75.json';
  uniq(legacy.levels.map(l => l.legacyId), 'مرحلة قديمة', L);
  for (const l of legacy.levels) {
    for (const id of l.skills) {
      const s = skills.get(id);
      if (!s) err(L, `${l.legacyId}: المهارة ${id} غير موجودة`);
      else if (s.tree.domain !== 'coding') err(L, `${l.legacyId}: المهارة ${id} ليست مهارة برمجة`);
    }
    const first = skills.get(l.skills[0]);
    if (first && first.skill.zone !== l.zone) err(L, `${l.legacyId}: المنطقة ${l.zone} لا تطابق منطقة ${l.skills[0]}`);
    if (l.track === 'pylab' && !l.python) err(L, `${l.legacyId}: مرحلة بايثون بلا كود`);
  }
  const used = new Set(legacy.levels.flatMap(l => l.skills));
  for (const [id, v] of skills) {
    if (v.tree.domain !== 'coding') continue;
    if (!used.has(id) && !v.skill.isNew && id !== 'coding.create.project' && id !== 'coding.conditions.compare') warn(L, `مهارة برمجة غير مغطّاة بمرحلة قديمة ولا معلّمة كجديدة: ${id}`);
  }
}

// شخصية سراج: لا كلمات ممنوعة، وطول الجمل في الحدود
const persona = get('content/persona/siraj.json');
if (persona) {
  const P = 'content/persona/siraj.json';
  const banned = persona.bannedPhrases.map(norm);
  const words = s => s.trim().split(/\s+/).length;
  uniq(persona.lineCategories.map(c => c.id), 'فئة جمل', P);
  for (const c of persona.lineCategories) for (const e of c.examples) for (const line of [e.m, e.f].filter(Boolean)) {
    const n = norm(line);
    for (let i = 0; i < banned.length; i++) if (n.includes(banned[i])) err(P, `الجملة «${line}» فيها كلمة ممنوعة: ${persona.bannedPhrases[i]}`);
    const limit = c.id.startsWith('summit') || c.id.startsWith('session') ? persona.maxWords.instruction : persona.maxWords.feedback;
    if (words(line) > limit) err(P, `الجملة «${line}» أطول من ${limit} كلمات`);
  }
}

// رموز التصميم: التباين بمعادلة الحد العالمي للقراءة، وحد أدنى لحجم خط الطفل
const tokens = get('content/design/tokens.json');
const contrastReport = [];
if (tokens) {
  const K = 'content/design/tokens.json';
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const p of tokens.contrast) {
    const fg = tokens.color[p.fg], bg = tokens.color[p.bg];
    if (!fg || !bg) { err(K, `زوج تباين يذكر لونًا غير معرّف: ${p.fg} على ${p.bg}`); continue; }
    const r = ratio(fg, bg);
    contrastReport.push(`${p.fg} on ${p.bg}: ${r.toFixed(2)} (min ${p.min})`);
    if (r < p.min) err(K, `التباين ${r.toFixed(2)} أقل من ${p.min}: ${p.fg} على ${p.bg} (${p.use})`);
  }
  for (const s of tokens.type.scale) if (!s.parentsOnly && s.size < tokens.type.childMin) err(K, `حجم الخط ${s.id} أصغر من حد الطفل ${tokens.type.childMin}`);
  for (const w of worlds) if (!tokens.worlds[w.id]) err(K, `لا توجد ألوان للعالم ${w.id}`);
}

// نصوص الواجهة في كود التطبيق: نفس قائمة الكلمات الممنوعة على كل نص عربي يراه الطفل
let uiStrings = 0;
if (persona) {
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(f)) files.push(p); } };
  const srcDir = join(ROOT, 'app', 'src');
  try { walk(srcDir); } catch { /* app not present */ }
  const bannedUi = persona.bannedPhrases.map(norm);
  for (const f of files) {
    const rel = relative(ROOT, f).split(sep).join('/');
    if (rel.endsWith('screens/Others.tsx')) continue; // parents' corner and performance page: adult text
    for (const m of readFileSync(f, 'utf8').matchAll(/(['"`])((?:(?!\1).)*[\u0600-\u06FF](?:(?!\1).)*)\1/g)) {
      uiStrings++;
      const n = norm(m[2]);
      bannedUi.forEach((b, i) => { if (n.includes(b)) err(rel, `نص الواجهة «${m[2]}» فيه كلمة ممنوعة: ${persona.bannedPhrases[i]}`); });
    }
  }
}

// ---------- التقرير ----------
const count = re => [...skills.values()].filter(v => re.test(v.tree.domain)).length;
console.log('Khawarizmi content validator');
console.log(`  files checked      : ${Object.keys(docs).length + errors.filter(e => /JSON|مخطّط/.test(e)).length}`);
console.log(`  worlds             : ${worlds.length} (${worlds.filter(w => w.kind === 'landmark').length} landmarks)`);
console.log(`  skills (future)    : ${count(/^(coding|techai|english|brain|explorer)$/)}  coding ${count(/^coding$/)}, tech-ai ${count(/^techai$/)}, english ${count(/^english$/)}, brain ${count(/^brain$/)}, explorer ${count(/^explorer$/)}`);
console.log(`  skills (school)    : ${count(/^school$/)}`);
console.log(`  school grade files : ${schoolFiles} / 30`);
console.log(`  legacy concepts    : ${legacy ? legacy.levels.length : 0} / 75`);
console.log(`  templates          : ${templates.size}`);
console.log(`  sources            : ${sources.size} registered, ${downloaded} on disk`);
console.log(`  app UI strings     : ${uiStrings} checked for banned phrases`);
console.log(`  contrast pairs     : ${contrastReport.length}`);
for (const c of contrastReport) console.log('    ' + c);
for (const w of warnings) console.log('  WARN  ' + w);
for (const e of errors) console.log('  ERROR ' + e);
console.log(errors.length ? `FAILED: ${errors.length} error(s)` : `PASSED with ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);

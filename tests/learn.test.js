// اختبار دفتر البرمجة:  node tests/learn.test.js [texts|play]   (من المجلد الرئيسي)
//  1) النصوص: كل مفتاح lr_ عربي، ≤ ٩ كلمات، بلا حروف لاتينية، و _f لها أصل؛ وكل مفتاح مستخدم في الكود والمحتوى له نص
//  2) play: كل صفحة تُلعب حتى النهاية (الأسئلة صحيحة) في Chromium (390 و1366) و WebKit (آيفون ١٣)، التقدّم lr: محفوظ،
//     لا أخطاء كونسول، لا تداخل/قص، أزرار ≥ ٤٤، صناديق الكود LTR، الامتحان يفشل عند الأخطاء، والدفتر يفتح الصفحات ويرجع
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require(path.join(__dirname, 'node_modules', 'playwright'));

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const PORT = 8797;
const only = process.argv[2];
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const errors = [];

/* ---------- ١ النصوص ---------- */
function checkTexts() {
  const T = require('../js/learn/texts.js');
  const PG = require('../js/learn/pages.js');
  for (const [k, v] of Object.entries(T)) {
    if (!k.startsWith('lr_')) fail(`key without lr_ prefix: ${k}`);
    if (typeof v !== 'string' || !v.trim()) fail(`empty text: ${k}`);
    if (/[A-Za-z]/.test(v)) fail(`Latin letters in Arabic voice line ${k}: ${v}`);
    if (v.split(/\s+/).length > 9) fail(`more than 9 words ${k}: ${v}`);
    if (k.endsWith('_f') && !T[k.slice(0, -2)]) fail(`girl line without base: ${k}`);
  }
  const used = new Set();
  const src = fs.readFileSync(path.join(ROOT, 'js', 'learn', 'core.js'), 'utf8');
  for (const m of src.matchAll(/'(lr_[a-z0-9_]+)'/g)) used.add(m[1]);
  const walkQ = q => used.add(q.key);
  PG.intro.screens.forEach(s => used.add(s.key)); PG.intro.quiz.forEach(walkQ);
  PG.laptop.screens.forEach(s => used.add(s.key)); PG.laptop.quiz.forEach(walkQ);
  for (const [c, L] of Object.entries(PG.lessons)) { used.add(`lr_${c}_ex`); L.code.forEach(l => used.add(l.k)); L.quiz.forEach(walkQ); if (L.quiz.length !== 2) fail(`lesson ${c}: needs 2 questions`); if (L.code.length < 2 || L.code.length > 4) fail(`lesson ${c}: 2-4 code lines`); }
  PG.examPool().forEach(walkQ);
  if (PG.examPool().length < 10) fail('exam pool < 10');
  for (const k of used) if (!T[k]) fail(`voice key without text: ${k}`);
  // الخيار الأوّل صحيح وموجود، وكل الخيارات مختلفة
  for (const q of PG.examPool()) { if (!q.opts || q.opts.length < 2) fail(`question ${q.key}: needs ≥2 options`); if (new Set(q.opts).size !== q.opts.length) fail(`question ${q.key}: duplicate options`); }
  if (PG.intro.screens.length < 6 || PG.intro.screens.length > 8) fail('intro needs 6-8 screens');
  if (PG.laptop.screens.length < 6 || PG.laptop.screens.length > 8) fail('laptop needs 6-8 screens');
  console.log(`texts: ${Object.keys(T).length} lines, ${used.size} keys used`);
}

/* ---------- فحص الشاشة داخل الصفحة ---------- */
function pageCheck() {
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const d = e => (e.className && e.className.baseVal == null ? String(e.className).split(' ')[0] : e.tagName) + (e.textContent ? '"' + e.textContent.trim().slice(0, 14) + '"' : '');
  if (document.documentElement.scrollWidth > vw + 1) out.push('horizontal scroll ' + document.documentElement.scrollWidth);
  const scrollers = [...document.querySelectorAll('.lr-scroll, .lr-stage')];
  const inScroll = e => scrollers.find(s => s.contains(e));
  const all = [...document.querySelectorAll('.lr button, .lr-code, .lr-line, .lr-expl, .lr-qt, .lr-vsc, .lr-pic')].filter(vis);
  for (const e of all) {
    const r = e.getBoundingClientRect(), sc = inScroll(e);
    if (r.left < -1 || r.right > vw + 1) out.push('off-screen-x ' + d(e) + ` ${Math.round(r.left)}-${Math.round(r.right)}`);
    if (!sc && (r.top < -1 || r.bottom > vh + 1)) out.push('off-screen-y ' + d(e) + ` ${Math.round(r.top)}-${Math.round(r.bottom)}`);
    if (sc) { const sr = sc.getBoundingClientRect(); if (r.left < sr.left - 1 || r.right > sr.right + 1) out.push('outside scroller-x ' + d(e)); }
  }
  // لا تداخل بين عناصر المسرح
  const st = [...document.querySelectorAll('.lr-stage button, .lr-stage .lr-code, .lr-stage .lr-line, .lr-stage .lr-expl, .lr-stage .lr-qt, .lr-stage .lr-pic, .lr-foot button, .lr-bar .ib, .lr-bub')].filter(vis);
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b = st[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) out.push(`overlap ${d(a)} × ${d(b)} (${Math.round(ox)}x${Math.round(oy)})`);
  }
  // أهداف اللمس ≥ ٤٤ (ما عدا زرّ المحاكاة الزخرفي)
  for (const e of [...document.querySelectorAll('.lr button:not(.lr-vsc-run)')].filter(vis)) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 43.5) out.push(`small tap target ${d(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
  // نص مقصوص داخل أب يقص
  const clippers = e => { const a = []; for (let p = e; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') a.push(p); } return a; };
  for (const e of [...document.querySelectorAll('.lr-line, .lr-expl, .lr-qt, .lr-opt, .lr-item b, .lr-wcard h2, .lr-steps li, .lr-bub-t')].filter(vis)) {
    if (!e.classList.contains('lr-bub-t') && e.scrollWidth > e.clientWidth + 1) out.push(`text too wide ${d(e)} ${e.scrollWidth}/${e.clientWidth}`);
    const rg = document.createRange(); rg.selectNodeContents(e);
    const tr = rg.getBoundingClientRect(); if (!tr.width) continue;
    const tol = Math.max(3, tr.height * 0.15);
    for (const a of clippers(e)) {
      if (a.classList.contains('lr-scroll') || a.classList.contains('lr-stage') || a === e) break;
      const ar = a.getBoundingClientRect();
      if (tr.top < ar.top - tol || tr.bottom > ar.bottom + tol || tr.left < ar.left - 2 || tr.right > ar.right + 2) { out.push(`clipped text ${d(e)} by ${d(a)}`); break; }
    }
  }
  // الكود LTR وبخط أحادي العرض
  for (const e of document.querySelectorAll('.lr-code, .lr-vsc, .lr-opt.code')) {
    const cs = getComputedStyle(e);
    if (cs.direction !== 'ltr') out.push('code not LTR ' + d(e));
    if (e.getAttribute('dir') !== 'ltr') out.push('code without dir=ltr ' + d(e));
    if (!/mono|consolas|menlo|courier/i.test(cs.fontFamily)) out.push('code not monospace ' + cs.fontFamily);
  }
  for (const e of document.querySelectorAll('.lr-code .lr-cl span')) if (/[؀-ۿ]/.test(e.textContent) && !/["'].*[؀-ۿ].*["']/.test(e.textContent)) out.push('Arabic outside a string in code: ' + e.textContent);
  return out;
}

(async () => {
  if (!only || only === 'texts') checkTexts();
  if (only === 'texts') { console.log(bad ? `\n${bad} problem(s)` : '\nALL OK'); process.exit(bad ? 1 : 0); }

  await new Promise(r => server.listen(PORT, r));
  const browsers = { chromium: await chromium.launch() };
  if (!process.env.LR_NO_WEBKIT) try { browsers.webkit = await webkit.launch(); } catch (e) { fail('webkit not available: ' + e.message.split('\n')[0]); }

  async function open(bname, vp, q) {
    const opts = bname === 'webkit' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }) : { viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1, hasTouch: vp[0] < 900 };
    const ctx = await browsers[bname].newContext(opts);
    const pg = await ctx.newPage();
    const tag = `${bname} ${opts.viewport.width}x${opts.viewport.height} ${q}`;
    pg.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
    await pg.goto(`http://localhost:${PORT}/tests/learn.html?fast=4&${q}`);
    await pg.waitForTimeout(500);
    return { pg, tag, close: () => ctx.close() };
  }
  const check = async (pg, label) => { const c = await pg.evaluate(pageCheck); if (c.length) fail(`${label}: ${[...new Set(c)].slice(0, 6).join(' | ')}`); };

  // يلعب الصفحة حتى النهاية؛ يفحص الشكل في كل شاشة
  async function playPage(pg, tag, pageId) {
    let steps = 0, states = new Set();
    while (steps++ < 60) {
      await pg.waitForTimeout(380);
      const st = await pg.evaluate(() => LEARN._s && LEARN._s.state);
      states.add(st);
      await check(pg, `${tag} [${st} ${steps}]`);
      if (st === 'win') break;
      const sel = await pg.evaluate(() => LEARN._s.next());
      if (!sel) { fail(`${tag}: no next step in state ${st}`); break; }
      const h = await pg.$(sel);
      if (!h) { fail(`${tag}: button ${sel} not found`); break; }
      await h.click();
    }
    const state = await pg.evaluate(() => LEARN._s.state);
    if (state !== 'win') fail(`${tag}: did not reach win (state ${state} after ${steps} steps)`);
    const key = pageId.replace(/^lesson:/, 'lr:').replace(/^(intro|laptop|exam)$/, 'lr:$1');
    const saved = await pg.evaluate(() => window.__saved);
    if (!saved[key] || saved[key] < 1 || saved[key] > 3) fail(`${tag}: progress ${key} not saved (${JSON.stringify(saved)})`);
    if (pageId !== 'exam' && saved[key] !== 3) fail(`${tag}: perfect run should give 3 stars, got ${saved[key]}`);
    for (const k of Object.keys(saved)) if (!k.startsWith('lr:')) fail(`${tag}: progress key without lr: ${k}`);
    const miss = await pg.evaluate(() => window.__missing);
    if (miss.length) fail(`${tag}: voice keys without text: ${[...new Set(miss)].join(',')}`);
    const said = await pg.evaluate(() => window.__said.length);
    if (said < 4) fail(`${tag}: too little speech (${said})`);
    if (pageId.startsWith('lesson:') && !states.has('code')) fail(`${tag}: lesson without code screen`);
    // ✔ تم → back (بعد قفل الفوز)
    await pg.waitForTimeout(600);
    await pg.click('.lr-done');
    await pg.waitForTimeout(400);
    const backs = await pg.evaluate(() => window.__backs);
    if (backs !== 1) fail(`${tag}: done should call back once (got ${backs})`);
    const left = await pg.evaluate(() => document.querySelector('#app').innerHTML.length);
    if (left) fail(`${tag}: app not emptied after done`);
  }

  const PAGES = ['intro', 'lesson:seq', 'lesson:loops', 'lesson:vars', 'lesson:cond', 'lesson:funcs', 'lesson:io', 'lesson:bugs', 'laptop', 'exam'];
  const RUNS = [['chromium', [390, 844]], ['chromium', [1366, 768]]];
  if (browsers.webkit) RUNS.push(['webkit', [390, 844]]);
  for (const [b, vp] of RUNS) {
    for (const g of ['b', 'g']) {
      if (g === 'g' && vp[0] !== 390) continue;
      for (const id of PAGES) {
        const { pg, tag, close } = await open(b, vp, `page=${id}&g=${g}`);
        try { await playPage(pg, tag, id); } catch (e) { fail(`${tag}: ${e.message.split('\n')[0]}`); }
        await close();
      }
    }
    // الدفتر: القائمة، فتح صفحة، رجوع للدفتر، المصابيح
    {
      const { pg, tag, close } = await open(b, vp, 'page=notebook');
      await check(pg, tag + ' list');
      const n = await pg.$$eval('.lr-item', a => a.length);
      if (n !== 10) fail(`${tag}: notebook should list 10 pages (got ${n})`);
      await pg.click('.lr-item[data-page="lesson:loops"]');
      await pg.waitForTimeout(400);
      if ((await pg.evaluate(() => LEARN._s.state)) !== 'story') fail(`${tag}: notebook did not open lesson`);
      await pg.click('[data-lr="back"]');
      await pg.waitForTimeout(400);
      if ((await pg.evaluate(() => LEARN._s.state)) !== 'list') fail(`${tag}: back did not return to notebook`);
      if ((await pg.evaluate(() => window.__backs)) !== 0) fail(`${tag}: back from a sub-page must not leave the notebook`);
      await pg.click('[data-lr="exit"]');
      await pg.waitForTimeout(400);
      if ((await pg.evaluate(() => window.__backs)) !== 1) fail(`${tag}: exit should call back`);
      await close();
    }
    {
      const { pg, tag, close } = await open(b, vp, 'page=notebook&done=1');
      const lamps = await pg.$$eval('.lr-lamp.on', a => a.length);
      if (lamps !== 10) fail(`${tag}: done lamps ${lamps}/10`);
      await check(pg, tag + ' list done');
      await close();
    }
    // الامتحان: إجابات خاطئة → فشل بلا حفظ، ثم إعادة
    {
      const { pg, tag, close } = await open(b, vp, 'page=exam');
      await pg.click('.lr-next');
      for (let i = 0; i < 10; i++) {
        await pg.waitForTimeout(400);
        const c = await pg.evaluate(() => LEARN._s.correct);
        const wrong = await pg.$(`.lr-opt:not([data-i="${c}"])`);
        if (i < 3) { await wrong.click(); await pg.waitForTimeout(80); }
        await pg.click(`.lr-opt[data-i="${c}"]`);
      }
      await pg.waitForTimeout(400);
      if ((await pg.evaluate(() => LEARN._s.state)) !== 'fail') fail(`${tag}: exam with 3 mistakes should fail`);
      await check(pg, tag + ' fail');
      if (Object.keys(await pg.evaluate(() => window.__saved)).length) fail(`${tag}: failed exam must not save`);
      await pg.click('.lr-retry');
      await pg.waitForTimeout(400);
      if ((await pg.evaluate(() => LEARN._s.state)) !== 'story') fail(`${tag}: retry did not restart exam`);
      await close();
    }
    // درس بخطأ واحد → نجمتان؛ destroy ينظّف
    {
      const { pg, tag, close } = await open(b, vp, 'page=lesson:vars');
      for (let i = 0; i < 6; i++) { await pg.waitForTimeout(400); const s = await pg.evaluate(() => LEARN._s.state); if (s === 'quiz') break; await pg.click('.lr-next'); }
      const c = await pg.evaluate(() => LEARN._s.correct);
      await pg.click(`.lr-opt:not([data-i="${c}"])`); await pg.waitForTimeout(80);
      await pg.click(`.lr-opt[data-i="${c}"]`); await pg.waitForTimeout(400);
      const c2 = await pg.evaluate(() => LEARN._s.correct);
      await pg.click(`.lr-opt[data-i="${c2}"]`); await pg.waitForTimeout(400);
      const saved = await pg.evaluate(() => window.__saved);
      if (saved['lr:vars'] !== 2) fail(`${tag}: one mistake should give 2 stars (${JSON.stringify(saved)})`);
      await pg.evaluate(() => LEARN.destroy());
      if (await pg.evaluate(() => document.querySelector('#app').innerHTML.length || LEARN._s)) fail(`${tag}: destroy did not clean up`);
      await close();
    }
  }

  for (const b of Object.values(browsers)) await b.close();
  server.close();
  for (const e of [...new Set(errors)]) fail('console: ' + e);
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

// اختبار استوديو سراج:  node tests/studio.test.js [texts|play]   (من المجلد الرئيسي)
//  1) النصوص: كل مفتاح st_ عربي مشكّل ≤ ٨ كلمات، و _f له أساس، وكل مفتاح في الكود له نص
//  2) Chromium (360x640، 1366x768) + WebKit (آيفون ١٣): يفتح الاستوديو، يبني برنامجاً من ٣ بطاقات عبر Blockly API، يشغّله،
//     يحفظه، يعيد تحميل الصفحة ويفتح المشروع، يصدّر PNG، يحذف؛ بدون أخطاء كونسول، بدون تداخل/قص، أزرار ≥ ٤٤
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots', 'studio');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const PORT = 8798;
const only = process.argv[2];
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const errors = [];

/* ---------- ١ النصوص ---------- */
function checkTexts() {
  const T = require('../js/studio/texts.js');
  for (const [k, v] of Object.entries(T)) {
    if (!k.startsWith('st_')) fail(`key without st_ prefix: ${k}`);
    if (typeof v !== 'string' || !v.trim()) fail(`empty text: ${k}`);
    if (/[A-Za-z]/.test(v)) fail(`Latin letters in Arabic line ${k}: ${v}`);
    if (v.split(/\s+/).length > 8) fail(`more than 8 words ${k}: ${v}`);
    if (!/[ً-ْ]/.test(v)) fail(`line without diacritics ${k}: ${v}`);
    if (k.endsWith('_f') && !T[k.slice(0, -2)]) fail(`girl line without base: ${k}`);
  }
  const src = fs.readFileSync(path.join(ROOT, 'js', 'studio', 'core.js'), 'utf8');
  for (const m of src.matchAll(/'(st_[a-z0-9_]+)'/g)) if (!T[m[1]] && m[1] !== 'st_intro') fail(`core.js: voice key without text: ${m[1]}`);
  console.log(`texts: ${Object.keys(T).length} lines checked`);
}

/* ---------- فحص الشاشة داخل الصفحة ---------- */
function pageCheck() {
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
  const d = e => (e.className && e.className.baseVal == null ? String(e.className).split(' ')[0] : e.tagName) + (e.textContent ? '"' + e.textContent.trim().slice(0, 14) + '"' : '');
  if (document.documentElement.scrollWidth > vw + 1) out.push('horizontal scroll ' + document.documentElement.scrollWidth);
  const scroll = document.querySelector('.st-home');
  const all = [...document.querySelectorAll('.st button, .st-lamps, .st-bub.show, .st-py, .st-ws')].filter(vis);
  for (const e of all) {
    const r = e.getBoundingClientRect();
    const inScroll = scroll && scroll.contains(e);
    if (r.left < -1 || r.right > vw + 1 || (!inScroll && (r.top < -1 || r.bottom > vh + 1))) out.push('off-screen ' + d(e) + ` ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
  }
  // لا تداخل بين الأزرار (ولا مع المصابيح أو مساحة البطاقات)
  // (لو نافذة «عرض رائع» مفتوحة فهي تغطّي ما تحتها عن قصد: نفحص ما بداخلها فقط)
  const modal = document.querySelector('.st-modal:not([hidden])');
  const items = [...document.querySelectorAll('.st button, .st-lamps, .st-ws, .st-py')].filter(vis).filter(e => !e.closest('.blocklyFlyout') && (!modal || modal.contains(e)));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) out.push(`overlap ${d(a)} × ${d(b)} (${Math.round(ox)}x${Math.round(oy)})`);
  }
  // أهداف اللمس ≥ ٤٤
  for (const e of [...document.querySelectorAll('.st button')].filter(vis)) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 43.5) out.push(`small tap target ${d(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
  // نص مقصوص
  for (const e of [...document.querySelectorAll('.st-bar .t, .st-open b, .st-open small, .st-new, .st-run, .st-mcard h2')].filter(vis)) {
    if (e.scrollWidth > e.clientWidth + 1 && !e.classList.contains('t') && !e.matches('.st-open b')) out.push(`text too wide ${d(e)} ${e.scrollWidth}/${e.clientWidth}`);
    const rg = document.createRange(); rg.selectNodeContents(e);
    const tr = rg.getBoundingClientRect();
    if (!tr.width) continue;
    const tol = Math.max(3, tr.height * 0.15);
    for (let p = e; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      if (p.classList.contains('st-home')) break;
      const ar = p.getBoundingClientRect();
      if (tr.top < ar.top - tol || tr.bottom > ar.bottom + tol) { out.push(`clipped text ${d(e)} by ${d(p)}`); break; }
    }
  }
  // المسرح: اللوحة والمصابيح داخل المسرح
  const st = document.querySelector('.st-stageel');
  if (st) {
    const sr = st.getBoundingClientRect();
    for (const e of [...document.querySelectorAll('.st-lamps, .st-draw canvas, .st-bub.show')].filter(vis)) { const r = e.getBoundingClientRect(); if (r.top < sr.top - 1 || r.bottom > sr.bottom + 1 || r.left < sr.left - 1 || r.right > sr.right + 1) out.push('outside stage ' + d(e)); }
    if (sr.height < 120) out.push('stage too short ' + Math.round(sr.height));
  }
  const ws = document.querySelector('.st-ws');
  if (ws && ws.getBoundingClientRect().height < 100) out.push('workspace too short ' + Math.round(ws.getBoundingClientRect().height));
  return out;
}

(async () => {
  if (!only || only === 'texts') checkTexts();
  if (only === 'texts') { console.log(bad ? `\n${bad} problem(s)` : '\nALL OK'); process.exit(bad ? 1 : 0); }

  await new Promise(r => server.listen(PORT, r));
  fs.mkdirSync(SHOTS, { recursive: true });
  const browsers = { chromium: await chromium.launch() };
  if (!process.env.ST_NO_WEBKIT) try { browsers.webkit = await webkit.launch(); } catch (e) { fail('webkit not available: ' + e.message.split('\n')[0] + ' (run: npx playwright install webkit)'); }

  async function open(bname, vp, q) {
    const opts = bname === 'webkit' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }) : { viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1, hasTouch: vp[0] < 900 };
    opts.acceptDownloads = true;
    const ctx = await browsers[bname].newContext(opts);
    const pg = await ctx.newPage();
    const tag = `${bname} ${opts.viewport.width}x${opts.viewport.height}`;
    pg.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
    await pg.goto(`http://localhost:${PORT}/tests/studio.html?${q || ''}`);
    await pg.waitForTimeout(400);
    await pg.addScriptTag({ content: `window.pageCheck = ${pageCheck}` });
    return pg;
  }
  const check = async (pg, label) => { const c = await pg.evaluate(pageCheck); if (c.length) fail(`${label}: ${[...new Set(c)].slice(0, 6).join(' | ')}`); };

  async function flow(bname, vp) {
    const pg = await open(bname, vp, 'fast=3');
    const tag = bname === 'webkit' ? 'iphone13' : vp.join('x');
    await pg.waitForTimeout(500);
    // الرفّ (فاضي أول مرة): الدرس الأول يُقال
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-home.png`) });
    await check(pg, `${tag} home`);
    const intro = await pg.evaluate(() => window.__said.slice());
    if (!intro.includes('st_hello') || !intro.includes('st_cards')) fail(`${tag} first-open tutorial not spoken: ${intro}`);
    // عرض جديد
    await pg.click('[data-st="new"]');
    await pg.waitForTimeout(600);
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-editor.png`) });
    await check(pg, `${tag} editor`);
    // بناء برنامج من ٣ بطاقات عبر Blockly API، ثم التحقّق من كود بايثون
    const code = await pg.evaluate(() => {
      const ws = STUDIO._s.ws;
      Blocks.load(ws, [['siraj_say', { TEXT: 'مرحبا' }], ['pen_forward', { N: '2' }], ['light_on', { C: 'green' }]], Blocks.startOf(ws).nextConnection);
      STUDIO._s.refresh(); // Blocks.load يعطّل الأحداث (مثل تحميل الحل في المراحل)، فالكود يتحدّث صراحةً
      return Blocks.python(ws).lines;
    });
    await pg.waitForTimeout(200);
    if (code.length !== 3 || !/say\("مرحبا"\)/.test(code[0]) || code[1] !== 'forward(2)' || code[2] !== 'light("green")') fail(`${tag} python code: ${JSON.stringify(code)}`);
    const shown = await pg.evaluate(() => document.querySelectorAll('.st-py .ln').length);
    if (shown !== 3) fail(`${tag} python pane shows ${shown} lines`);
    // المكان واللون
    await pg.click('[data-st="pick"]'); await pg.waitForTimeout(200);
    await check(pg, `${tag} picker`);
    await pg.click('[data-st="scene"][data-id="space"]'); await pg.click('[data-st="color"][data-c="#e8579a"]'); await pg.waitForTimeout(200);
    await pg.click('[data-st="pick"]');
    const sc = await pg.evaluate(() => [!!document.querySelector('.st-sc-space'), STUDIO._s.stage.color]);
    if (!sc[0] || sc[1] !== '#e8579a') fail(`${tag} scene/colour not applied: ${sc}`);
    // تشغيل العرض
    const r = await pg.evaluate(async () => {
      const t0 = performance.now();
      await STUDIO._s.play();
      const st = STUDIO._s.stage;
      return { ms: Math.round(performance.now() - t0), lines: st.draw.lines.length, lamp: !!document.querySelector('.st-lamp.on'), said: window.__said.filter(k => /^ph_/.test(k)).length, modal: !document.querySelector('.st-modal').hidden, img: (document.querySelector('.st-shot').src || '').slice(0, 22), siraj: !!st.sirajDrawn };
    });
    if (r.lines !== 1 || !r.lamp || r.said < 1 || !r.modal || !r.img.startsWith('data:image/png;base64') || !r.siraj) fail(`${tag} run: ${JSON.stringify(r)}`);
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-done.png`) });
    await check(pg, `${tag} done modal`);
    // تصدير PNG (تنزيل حقيقي في كروم)
    if (bname === 'chromium') {
      const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.click('[data-st="png"]')]);
      if (!dl || !/\.png$/.test(dl.suggestedFilename())) fail(`${tag} png export: ${dl && dl.suggestedFilename()}`);
    } else {
      const png = await pg.evaluate(async () => (await STUDIO._s.snapshot()).toDataURL('image/png').slice(0, 22));
      if (!png.startsWith('data:image/png;base64')) fail(`${tag} snapshot: ${png}`);
    }
    // إغلاق النافذة ثم حفظ من الشريط
    await pg.click('[data-st="close"]'); await pg.waitForTimeout(200);
    await pg.click('.st-bar [data-st="save"]');
    await pg.waitForTimeout(300);
    const saved = await pg.evaluate(() => ({ n: window.__player.studio.length, p: window.__player.studio[0], ls: JSON.parse(localStorage.getItem('khwarizmi.v1')).players.find(p => p.name === 'تجربة').studio.length, said: window.__said.includes('st_saved') }));
    if (saved.n !== 1 || saved.ls !== 1 || !saved.said || saved.p.sc !== 'space' || saved.p.c !== '#e8579a' || saved.p.prog.length !== 3 || saved.p.e !== '💡') fail(`${tag} save: ${JSON.stringify(saved)}`);
    // إعادة التحميل: المشروع على الرفّ، ويُفتح بنفس البطاقات
    await pg.reload(); await pg.waitForTimeout(600);
    await pg.addScriptTag({ content: `window.pageCheck = ${pageCheck}` });
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-shelf.png`) });
    await check(pg, `${tag} shelf`);
    const again = await pg.evaluate(() => window.__said.includes('st_hello'));
    if (again) fail(`${tag} tutorial repeated on second open`);
    const cards = await pg.locator('.st-card').count();
    if (cards !== 1) fail(`${tag} shelf shows ${cards} cards after reload`);
    await pg.click('.st-open'); await pg.waitForTimeout(700);
    const re = await pg.evaluate(() => ({ lines: Blocks.python(STUDIO._s.ws).lines, scene: !!document.querySelector('.st-sc-space'), title: document.querySelector('#stTitle').textContent, prog: STUDIO.serialize(STUDIO._s.ws) }));
    if (re.lines.length !== 3 || !re.scene || !/💡/.test(re.title) || re.prog[2][1].C !== 'green') fail(`${tag} reopen: ${JSON.stringify(re)}`);
    await check(pg, `${tag} reopened`);
    // تعديل وحفظ (نفس المشروع، لا نسخة جديدة)
    await pg.evaluate(() => { const ws = STUDIO._s.ws; Blocks.load(ws, [['siraj_jump', {}]], Blocks.startOf(ws).getNextBlock().nextConnection); STUDIO._s.save(); });
    const edited = await pg.evaluate(() => [window.__player.studio.length, window.__player.studio[0].prog.length]);
    if (edited[0] !== 1 || edited[1] !== 4) fail(`${tag} edit+save: ${edited}`);
    // الحدّ ٦ مشاريع
    const limit = await pg.evaluate(() => { const P = window.__player; while (P.studio.length < 6) P.studio.push(Object.assign({}, P.studio[0], { id: 'x' + P.studio.length })); STUDIO._s.home(); return [document.querySelectorAll('.st-card').length, document.querySelector('.st-new').getAttribute('aria-disabled')]; });
    if (limit[0] !== 6 || limit[1] !== 'true') fail(`${tag} limit: ${limit}`);
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-full.png`) });
    await check(pg, `${tag} full shelf`);
    // حذف
    await pg.click('.st-del >> nth=0'); await pg.waitForTimeout(300);
    const left = await pg.evaluate(() => [window.__player.studio.length, document.querySelectorAll('.st-card').length, window.__said.includes('st_deleted')]);
    if (left[0] !== 5 || left[1] !== 5 || !left[2]) fail(`${tag} delete: ${left}`);
    // destroy ينظّف
    const leak = await pg.evaluate(async () => { STUDIO._s.editor(window.__player.studio[0]); await new Promise(r => setTimeout(r, 200)); STUDIO.destroy(); await new Promise(r => setTimeout(r, 300)); return { html: document.getElementById('app').innerHTML.length, bl: document.querySelectorAll('.blocklyWidgetDiv .blocklyDropDownDiv > *').length }; });
    if (leak.html) fail(`${tag} destroy leaked html`);
    // الخروج يستدعي ctx.back
    await pg.evaluate(() => STUDIO.render(document.getElementById('app'), window.__ctx)); await pg.waitForTimeout(300);
    await pg.click('[data-st="exit"]');
    if ((await pg.evaluate(() => window.__backs)) !== 1) fail(`${tag} exit did not call ctx.back()`);
    const miss = await pg.evaluate(() => [...new Set(window.__missing)]);
    if (miss.length) fail(`${tag} voice keys without text: ${miss.join(', ')}`);
    await pg.evaluate(() => localStorage.clear());
    await pg.context().close();
    console.log(`flow ${tag} done`);
  }

  const jobs = [() => flow('chromium', [360, 640]), () => flow('chromium', [1366, 768])];
  if (browsers.webkit) jobs.push(() => flow('webkit', [390, 844]));
  for (const j of jobs) { try { await j(); } catch (e) { fail('job crashed: ' + e.message.split('\n')[0]); } }

  if (errors.length) { console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  for (const b of Object.values(browsers)) await b.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

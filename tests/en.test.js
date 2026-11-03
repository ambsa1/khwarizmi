// اختبار قسم الإنجليزي:  node tests/en.test.js [texts|layout|play]   (من المجلد الرئيسي)
//  1) النصوص: كل مفتاح en2_ له جملة إنجليزية (بدون حروف عربية)، وكل تعليمة لها ترجمة عربية، وكل مفتاح ثابت في الكود له نص
//  2) layout: كل نشاط بخمسة مقاسات × ثلاثة أعمار (Chromium) + آيفون ١٣ (WebKit): لا تداخل، لا قص، أزرار ≥ ٤٤، صور في tests/shots/en/
//  3) play: يلعب كل نشاط حتى الفوز بأعمار ٣ و٦ و٩ في Chromium و WebKit (آيفون ١٣)، ويتأكد من النجوم en:، وأن الجولة لا تتقدّم والصوت شغّال،
//     وأن الضغطتين السريعتين لا تحسبان مرتين، وأن الضغط فور تغيّر الجولة يُتجاهل، وأن destroy ينظّف كل شيء
//  4) يفشل عند أي خطأ في الكونسول
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots', 'en');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const PORT = 8799;

const VIEWPORTS = [[360, 640], [390, 844], [375, 667], [768, 1024], [1366, 768]];
const AGES = process.env.EN_AGES ? process.env.EN_AGES.split(',').map(Number) : [3, 6, 9];
const only = process.argv[2];
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const errors = [];

/* ---------- ١ النصوص ---------- */
function checkTexts() {
  const T = require('../js/en/texts.js');
  const AR = globalThis.EN_AR, V = globalThis.EN_VOCAB;
  for (const [k, v] of Object.entries(T)) {
    if (!k.startsWith('en2_')) fail(`key without en2_ prefix: ${k}`);
    if (typeof v !== 'string' || !v.trim()) fail(`empty text: ${k}`);
    if (/[؀-ۿ]/.test(v)) fail(`Arabic letters in English voice line ${k}: ${v}`);
    if (v.split(/\s+/).length > 8) fail(`more than 8 words ${k}: ${v}`);
    if (!/^en2_(w|t|l)_/.test(k) && !AR[k]) fail(`instruction without Arabic subtitle: ${k}`);
  }
  for (const [k, v] of Object.entries(AR)) {
    if (/[A-Za-z]/.test(v)) fail(`Latin letters in Arabic subtitle ${k}: ${v}`);
    if (k.endsWith('_f') && !AR[k.slice(0, -2)]) fail(`girl subtitle without base: ${k}`);
  }
  // الإيموجي: ≤ Emoji 12 فقط (قائمة الرموز المستخدمة؛ الأحدث مرفوض)
  const NEW = /[\u{1F971}-\u{1F976}\u{1F97A}-\u{1F97F}\u{1F9A3}-\u{1F9A4}\u{1F9AB}-\u{1F9AD}\u{1F9CB}-\u{1F9CC}\u{1FA74}-\u{1FAFF}\u{1F6D6}-\u{1F6D7}\u{1F6FB}-\u{1F6FC}\u{1F90C}\u{1F972}\u{1F977}\u{1F978}\u{1F9A3}]/u;
  const srcs = ['texts.js', 'acts.js', 'sections.js', 'art.js', 'core.js'].map(f => fs.readFileSync(path.join(ROOT, 'js', 'en', f), 'utf8')).join('\n');
  if (NEW.test(srcs)) fail('emoji newer than Emoji 12 used: ' + srcs.match(NEW)[0]);
  for (const [sec, list] of Object.entries(V)) for (const [id, en, ar, pic] of list) {
    if (!ar || !en || !pic) fail(`vocab ${sec}/${id} incomplete`);
    if (pic && /^[\u{1F7E0}-\u{1F7EB}]/u.test(pic)) fail(`emoji circle used as colour ${sec}/${id}`);
  }
  // كل مفتاح ثابت في الكود له نص
  for (const f of ['core.js', 'acts.js', 'sections.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'en', f), 'utf8');
    for (const m of src.matchAll(/'(en2_[a-z0-9_]+)'(\s*\+)?/g)) {
      if (/_$/.test(m[1]) || m[2]) continue;
      if (!T[m[1]] && !/^en2_(win|good)$/.test(m[1])) fail(`${f}: voice key without text: ${m[1]}`);
    }
  }
  console.log(`texts: ${Object.keys(T).length} English lines, ${Object.keys(AR).length} Arabic subtitles checked`);
}

/* ---------- فحص الشاشة داخل الصفحة ---------- */
function pageCheck() {
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.en-win'); };
  const d = e => (e.className && e.className.baseVal == null ? String(e.className).split(' ')[0] : e.tagName) + (e.dataset.id ? '[' + e.dataset.id + ']' : '') + (e.textContent ? '"' + e.textContent.trim().slice(0, 14) + '"' : '');
  if (document.documentElement.scrollWidth > vw + 1) out.push('horizontal scroll ' + document.documentElement.scrollWidth);
  const sc = document.querySelector('.en-scroll');
  // داخل الشاشة
  const all = [...document.querySelectorAll('.en button, .en-word, .en-objs, .en-slot, .en-card, .en-bub')].filter(vis);
  for (const e of all) {
    const r = e.getBoundingClientRect();
    const inScroll = sc && sc.contains(e);
    if (r.left < -1 || r.right > vw + 1 || (!inScroll && (r.top < -1 || r.bottom > vh + 1))) out.push('off-screen ' + d(e) + ` ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
  }
  // لا تداخل بين عناصر المسرح (والشريط)
  const stage = document.querySelector('.en-stage');
  const st = [...document.querySelectorAll('.en-stage button, .en-stage .en-word, .en-stage .en-objs, .en-stage .en-slot, .en-stage .en-slots, .en-stage .en-tiles, .en-stage .en-dots')].filter(vis);
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b = st[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) out.push(`overlap ${d(a)} × ${d(b)} (${Math.round(ox)}x${Math.round(oy)})`);
  }
  if (stage) {
    const sr = stage.getBoundingClientRect();
    for (const e of st) { const r = e.getBoundingClientRect(); if (r.top < sr.top - 1 || r.bottom > sr.bottom + 1 || r.left < sr.left - 1 || r.right > sr.right + 1) out.push('outside stage ' + d(e) + ` ${Math.round(r.top)}-${Math.round(r.bottom)} stage ${Math.round(sr.top)}-${Math.round(sr.bottom)}`); }
  }
  // أهداف اللمس ≥ ٤٤
  for (const e of [...document.querySelectorAll('.en button')].filter(vis)) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 43.5) out.push(`small tap target ${d(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
  // نص مقصوص
  // النص نفسه (مدى الحروف الفعلي) لازم يكون داخل كل أب يقص (overflow غير visible)، وما يلتفّ خارج عرضه
  const clippers = e => { const a = []; for (let p = e; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') a.push(p); } return a; };
  for (const e of [...document.querySelectorAll('.en-cword, .en-car, .en-word, .en-mw, .en-bub-en, .en-bub-ar, .en-sec-en, .en-sec small, .en-act b, .en-act-en, .en-opt.ok .en-cap > *, .en-tile, .en-slot, .bar .t, .en-wcard h2, .en-war')].filter(vis)) {
    if (e.scrollWidth > e.clientWidth + 1) out.push(`text too wide ${d(e)} ${e.scrollWidth}/${e.clientWidth}`);
    const rg = document.createRange(); rg.selectNodeContents(e);
    const tr = rg.getBoundingClientRect();
    if (!tr.width) continue;
    // مدى الحروف من الـ Range يشمل هوامش الخط (Baloo عالي)، فنسمح بـ ١٥٪ رأسياً
    const tol = Math.max(3, tr.height * 0.15);
    for (const a of clippers(e)) {
      if (a.classList.contains('en-scroll')) break; // داخل منطقة تمرير: ما فوقها لا يُحسب
      const ar = a.getBoundingClientRect();
      if (tr.top < ar.top - tol || tr.bottom > ar.bottom + tol || tr.left < ar.left - 2 || tr.right > ar.right + 2) { out.push(`clipped text ${d(e)} by ${d(a)} text ${Math.round(tr.top)}-${Math.round(tr.bottom)} box ${Math.round(ar.top)}-${Math.round(ar.bottom)}`); break; }
    }
  }
  for (const c of [...document.querySelectorAll('.en-opt.ok .en-cap')].filter(vis)) { const r = c.getBoundingClientRect(), p = c.parentElement.getBoundingClientRect(); if (r.top < p.top - 1 || r.bottom > p.bottom + 1) out.push('caption outside card ' + d(c)); }
  // الإنجليزي LTR
  for (const e of document.querySelectorAll('.en-ltr, .en-word, .en-slots, .en-tiles')) if (getComputedStyle(e).direction !== 'ltr') out.push('English not LTR ' + d(e));
  return out;
}

(async () => {
  if (!only || only === 'texts') checkTexts();
  if (only === 'texts') { console.log(bad ? `\n${bad} problem(s)` : '\nALL OK'); process.exit(bad ? 1 : 0); }

  await new Promise(r => server.listen(PORT, r));
  fs.mkdirSync(SHOTS, { recursive: true });
  const browsers = { chromium: await chromium.launch() };
  if (process.env.EN_NO_WEBKIT) { /* تشغيل سريع */ } else try { browsers.webkit = await webkit.launch(); } catch (e) { fail('webkit not available: ' + e.message.split('\n')[0] + ' (run: npx playwright install webkit)'); }

  async function open(bname, vp, q) {
    const opts = bname === 'webkit' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }) : { viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1, hasTouch: vp[0] < 900 };
    const ctx = await browsers[bname].newContext(opts);
    const pg = await ctx.newPage();
    const tag = `${bname} ${opts.viewport.width}x${opts.viewport.height} ${q}`;
    pg.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
    await pg.goto(`http://localhost:${PORT}/tests/en.html?${q}`);
    await pg.waitForTimeout(400);
    return pg;
  }
  const acts = pg => pg.evaluate(() => EN.sections.flatMap(s => s.activities.map(a => [s.id, a.id])));
  const check = async (pg, label) => { const c = await pg.evaluate(pageCheck); if (c.length) fail(`${label}: ${[...new Set(c)].slice(0, 6).join(' | ')}`); };

  /* ---------- ٢ الشكل بكل المقاسات ---------- */
  async function layout(bname, vp, age) {
    const pg = await open(bname, vp, `age=${age}&fast=3`);
    await pg.addScriptTag({ content: `window.pageCheck = ${pageCheck}` });
    const tag = `${bname === 'webkit' ? 'iphone13' : vp.join('x')}-a${age}`;
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-home.png`) });
    await check(pg, `${tag} home`);
    for (const sid of await pg.evaluate(() => EN.sections.map(s => s.id))) {
      await pg.evaluate(id => EN._s.sectionScreen(EN.sections.find(s => s.id === id), true), sid);
      await pg.waitForTimeout(350);
      if (sid === 'numbers' || sid === 'big') await pg.screenshot({ path: path.join(SHOTS, `${tag}-list-${sid}.png`) });
      await check(pg, `${tag} list ${sid}`);
    }
    for (const [sid, id] of await acts(pg)) {
      await pg.evaluate(([s, a]) => EN._s.open(s, a), [sid, id]);
      await pg.waitForTimeout(700);
      await pg.screenshot({ path: path.join(SHOTS, `${tag}-${sid}-${id}.png`) });
      await check(pg, `${tag} ${sid}/${id}`);
      // بعد إجابة صحيحة (الكلمة والترجمة ظاهرة)
      const answered = await pg.evaluate(() => { const ins = EN._act.inst; return ins.step ? ins.step() : false; });
      if (answered) {
        await pg.waitForTimeout(250);
        await pg.screenshot({ path: path.join(SHOTS, `${tag}-${sid}-${id}-b.png`) });
        await check(pg, `${tag} ${sid}/${id} (answered)`);
      }
    }
    // شاشة الفوز
    await pg.evaluate(() => { EN._s.open('animals', 'learn'); EN._act.A.win({ stars: 2 }); });
    await pg.waitForTimeout(700);
    await pg.screenshot({ path: path.join(SHOTS, `${tag}-win.png`) });
    const winOk = await pg.evaluate(() => { const c = document.querySelector('.en-wcard').getBoundingClientRect(); return c.top >= 0 && c.bottom <= innerHeight && c.left >= 0 && c.right <= innerWidth; });
    if (!winOk) fail(`${tag} win card off-screen`);
    await pg.context().close();
    console.log(`layout ${tag} done`);
  }

  /* ---------- ٣ اللعب حتى الفوز ---------- */
  async function play(bname, age) {
    const pg = await open(bname, [360, 640], `age=${age}&fast=6`);
    const tag = `${bname} age ${age}`;
    let n = 0;
    for (const [sid, id] of await acts(pg)) {
      const r = await pg.evaluate(async ([s, a]) => {
        document.querySelectorAll('.en-win').forEach(x => x.remove());
        const before = EN._won || 0;
        window.__advBusy = 0;
        EN._s.open(s, a);
        await new Promise(r => setTimeout(r, 300));
        const inst = EN._act.inst;
        if (!inst.solve) return { err: 'no solve()' };
        const t0 = performance.now();
        inst.solve();
        while ((EN._won || 0) === before && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 50));
        return { won: (EN._won || 0) > before, ms: Math.round(performance.now() - t0), stars: window.__saved['en:' + s + '_' + a], adv: window.__advBusy };
      }, [sid, id]);
      if (process.env.EN_VERBOSE) console.log(`  ${tag} ${sid}/${id} ${r.ms}ms`);
      if (!r.won || !(r.stars > 0)) fail(`${tag} play ${sid}/${id}: ${JSON.stringify(r)}`);
      else if (r.stars !== 3) fail(`${tag} play ${sid}/${id}: perfect play gave ${r.stars} stars`);
      else n++;
      if (r.adv) fail(`${tag} ${sid}/${id}: round advanced while voice was playing (${r.adv}x)`);
    }
    await pg.screenshot({ path: path.join(SHOTS, `play-${bname}-a${age}-win.png`) });
    console.log(`play ${tag}: ${n} activities won`);

    // ضغطتان سريعتان على الإجابة الصحيحة = جولة واحدة، والضغط فور تغيّر الجولة يُتجاهل
    await pg.evaluate(() => { document.querySelectorAll('.en-win').forEach(x => x.remove()); EN._s.open('animals', 'listen'); });
    await pg.waitForTimeout(400);
    const right = async () => pg.evaluate(() => ({ st: EN._act.inst.state() }));
    const ansSel = await pg.evaluate(() => { const said = window.__said.filter(k => k.startsWith('en2_w_')); const k = said[said.length - 1].slice(6); return `.en-opt[data-id="animals:${k}"]`; });
    const box = await pg.locator(ansSel).boundingBox();
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await pg.waitForTimeout(30);
    let s1 = (await right()).st;
    if (s1.r !== 0 || s1.miss !== 0 || !s1.busy) fail(`${tag} double tap: ${JSON.stringify(s1)}`);
    // ننتظر الجولة التالية ونضغط فوراً على إجابة خاطئة: لازم تُتجاهل (حارس ٣٠٠ms)
    const t0 = Date.now();
    while ((await right()).st.r === 0 && Date.now() - t0 < 5000) await pg.waitForTimeout(10);
    const wrong = await pg.evaluate(() => { const said = window.__said.filter(k => k.startsWith('en2_w_')); const k = said[said.length - 1].slice(6); const b = [...document.querySelectorAll('.en-opt')].find(x => x.dataset.id !== 'animals:' + k); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await pg.mouse.click(wrong[0], wrong[1]);
    s1 = (await right()).st;
    if (s1.miss !== 0) fail(`${tag} tap right after round change was counted: ${JSON.stringify(s1)}`);

    // destroy ينظّف: لا مؤقتات ولا حركات بعد الخروج
    const leak = await pg.evaluate(async () => {
      EN._s.open('colors', 'paint');
      await new Promise(r => setTimeout(r, 200));
      EN.destroy();
      const tw = gsap.globalTimeline.getChildren(true, true, false).filter(t => t.isActive()).length;
      const said = window.__said.length;
      await new Promise(r => setTimeout(r, 1500));
      return { html: document.getElementById('app').innerHTML.length, tw, spokeAfter: window.__said.length - said };
    });
    if (leak.html || leak.spokeAfter) fail(`${tag} destroy leaked: ${JSON.stringify(leak)}`);
    // نعيد الرسم ونجرّب الرجوع: نشاط ← قائمة ← الأقسام ← التطبيق
    await pg.evaluate(() => EN.render(document.getElementById('app'), ctx));
    await pg.waitForTimeout(500);
    await pg.click('.en-sec >> nth=2'); await pg.waitForTimeout(500);
    await pg.click('.en-act >> nth=1'); await pg.waitForTimeout(600);
    await pg.click('[data-en="replay"]'); await pg.waitForTimeout(100);
    await pg.click('[data-en="back"]'); await pg.waitForTimeout(500);
    await pg.click('[data-en="home"]'); await pg.waitForTimeout(500);
    await pg.click('[data-en="exit"]'); await pg.waitForTimeout(200);
    if ((await pg.evaluate(() => window.__backs)) !== 1) fail(`${tag} exit did not call ctx.back()`);
    const miss = await pg.evaluate(() => [...new Set(window.__missing)]);
    if (miss.length) fail(`${tag} missing/non-en2 voice keys: ${miss.join(', ')}`);
    const langs = await pg.evaluate(() => Object.keys(window.__langs));
    if (langs.join() !== 'en') fail(`${tag} non-English voice lines: ${langs}`);
    console.log(`${tag}: ${await pg.evaluate(() => new Set(window.__said).size)} distinct voice lines`);
    await pg.context().close();
  }

  // مجمّع مهام بسيط (٤ صفحات معاً)
  const jobs = [];
  if (!only || only === 'layout') {
    for (const vp of VIEWPORTS) for (const age of AGES) jobs.push(() => layout('chromium', vp, age));
    if (browsers.webkit) for (const age of AGES) jobs.push(() => layout('webkit', [390, 844], age));
  }
  if (!only || only === 'play') for (const b of Object.keys(browsers)) for (const age of AGES) jobs.push(() => play(b, age));
  let ji = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (ji < jobs.length) { const j = jobs[ji++]; try { await j(); } catch (e) { fail('job crashed: ' + e.message.split('\n')[0]); } } }));

  if (errors.length) { console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  for (const b of Object.values(browsers)) await b.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

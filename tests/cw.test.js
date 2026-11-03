// اختبار عالم الكمبيوتر:  node tests/cw.test.js   (من المجلد الرئيسي)
//  1) فحص النصوص: لا حروف لاتينية في الجمل العربية، ≤ ٨ كلمات، لكل مفتاح مستخدم في الكود نص
//  2) يفتح كل نشاط بثلاثة مقاسات، يصوّره في tests/shots/cw-*.png، ويتأكد أن الأزرار ظاهرة وغير مقصوصة
//  3) يلعب كل نشاط حتى الفوز (بالحل التلقائي) ويتأكد من حفظ النجوم، ويجرّب ضغطات وسحباً ولوحة مفاتيح حقيقية
//  4) يفشل عند أي خطأ في الكونسول
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const VIEWPORTS = [[360, 640], [640, 360], [1024, 768]];
const only = process.argv[2]; // اختياري: texts | shots | play
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };

/* ---------- ١ النصوص ---------- */
function checkTexts() {
  const T = require('../js/cw/texts.js');
  for (const [k, v] of Object.entries(T)) {
    if (!k.startsWith('cw_')) fail(`key without cw_ prefix: ${k}`);
    if (typeof v !== 'string' || !v.trim()) fail(`empty text: ${k}`);
    if (k.startsWith('cw_en_')) continue;
    if (/[A-Za-z]/.test(v)) fail(`Latin letters in Arabic voice line ${k}: ${v}`);
    const words = v.replace(/[^؀-ۿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length > 8) fail(`more than 8 words ${k} (${words.length}): ${v}`);
    if (k.endsWith('_f') && !T[k.slice(0, -2)]) fail(`girl line without base: ${k}`);
  }
  // كل مفتاح ثابت في الكود له نص
  const dir = path.join(ROOT, 'js', 'cw');
  for (const f of fs.readdirSync(dir)) {
    if (f === 'texts.js') continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/'(cw_[a-z0-9_]+)'(\s*\+)?/g)) {
      const k = m[1];
      if (/_$/.test(k) || m[2]) continue; // بادئة لمفتاح يُبنى بالكود (يُفحص في المتصفح)
      if (!T[k] && !/^cw_(win|good)$/.test(k)) fail(`${f}: voice key without text: ${k}`);
    }
  }
  console.log(`texts: ${Object.keys(T).length} lines checked`);
}

(async () => {
  if (!only || only === 'texts') checkTexts();
  if (only === 'texts') { console.log(bad ? `\n${bad} problem(s)` : '\nALL OK'); process.exit(bad ? 1 : 0); }

  await new Promise(r => server.listen(8798, r));
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const open = async (w, h, q) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900 });
    const pg = await ctx.newPage();
    const tag = `${w}x${h}`;
    pg.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
    await pg.goto(`http://localhost:8798/tests/cw.html?${q || 'age=9'}`);
    await pg.waitForTimeout(500);
    return pg;
  };
  const acts = async pg => pg.evaluate(() => CW.sections.flatMap(s => s.activities.map(a => [s.id, a.id])));
  // كل زر ظاهر داخل الشاشة وغير مقصوص
  const clipped = pg => pg.evaluate(() => {
    const out = [];
    const skip = '.cw-balloon, .cw-drop, .cw-les, .cw-gstar, .cw-win button, .used';
    document.querySelectorAll('.cw button, .cw-titem, .cw-food').forEach(b => {
      if (b.closest(skip) || b.matches(skip)) return;
      const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none') return;
      // داخل منطقة قابلة للتمرير؟ نقيس بالنسبة لها
      const sc = b.closest('.cw-scroll, .cw-lessons, .cw-alg, .cw-pw, .cw-scen');
      if (sc && sc.scrollHeight > sc.clientHeight + 2) return;
      if (r.left < -2 || r.top < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2) out.push((b.className || b.tagName) + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom));
    });
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('horizontal scroll ' + document.documentElement.scrollWidth);
    return out;
  });

  /* ---------- ٢ الصور بكل المقاسات ---------- */
  if (!only || only === 'shots') {
    for (const [w, h] of VIEWPORTS) {
      const tag = `${w}x${h}`;
      for (const q of ['age=9', 'age=4&g=g']) {
        const pg = await open(w, h, q);
        const young = q.startsWith('age=4');
        await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}${young ? '-a4' : ''}-home.png`) });
        let c = await clipped(pg); if (c.length) fail(`${tag} home: ${c.join(' | ')}`);
        if (young) { // الصغار: الأقسام المناسبة
          for (const id of ['balloons', 'feed', 'trace', 'star', 'build', 'isit']) {
            await pg.evaluate(i => CW._s.open(i), id); await pg.waitForTimeout(900);
            await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}-a4-${id}.png`) });
            c = await clipped(pg); if (c.length) fail(`${tag} a4 ${id}: ${c.join(' | ')}`);
          }
          await pg.context().close();
          continue;
        }
        await pg.click('.cw-sec >> nth=3'); await pg.waitForTimeout(500);
        await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}-list.png`) });
        for (const [sid, id] of await acts(pg)) {
          await pg.evaluate(i => CW._s.open(i), id);
          await pg.waitForTimeout(900);
          await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}-${id}.png`) });
          c = await clipped(pg); if (c.length) fail(`${tag} ${sid}/${id}: ${c.join(' | ')}`);
        }
        // درس كتابة مفتوح + لعبة مطر الحروف
        for (const [id, les] of [['type_ar', 6], ['type_en', 12], ['type_ar', 0]]) {
          await pg.evaluate(([i, l]) => { CW._s.open(i); CW._act.inst.lesson(l); }, [id, les]);
          await pg.waitForTimeout(700);
          await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}-${id}-lesson${les + 1}.png`) });
          c = await clipped(pg); if (c.length) fail(`${tag} ${id} lesson: ${c.join(' | ')}`);
        }
        await pg.evaluate(() => { CW._s.open('ty_rain'); CW._act.inst.play('ar'); });
        await pg.waitForTimeout(2500);
        await pg.screenshot({ path: path.join(SHOTS, `cw-${tag}-ty_rain-play.png`) });
        await pg.context().close();
      }
      console.log(`shots ${tag} done`);
    }
  }

  /* ---------- ٣ اللعب حتى الفوز ---------- */
  if (!only || only === 'play') {
    const pg = await open(390, 760, 'age=9&fast=5');
    const list = await acts(pg);
    for (const [sid, id] of list) {
      const r = await pg.evaluate(async i => {
        document.querySelectorAll('.cw-win').forEach(x => x.remove());
        const before = CW._won || 0;
        CW._s.open(i);
        await new Promise(r => setTimeout(r, 400));
        const inst = CW._act.inst;
        if (!inst.solve) return { err: 'no solve()' };
        const t0 = performance.now();
        inst.solve();
        while ((CW._won || 0) === before && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 100));
        return { won: (CW._won || 0) > before, ms: Math.round(performance.now() - t0), saved: Object.assign({}, window.__saved) };
      }, id);
      const key = id === 'type_ar' ? 'cw:ty_ar_1' : id === 'type_en' ? 'cw:ty_en_1' : 'cw:' + id;
      const ok = r.won && r.saved && r.saved[key] > 0;
      if (!ok) fail(`play ${sid}/${id}: ${JSON.stringify(r).slice(0, 200)}`); else console.log(`ok   play ${sid}/${id} (${r.ms}ms)`);
    }
    await pg.screenshot({ path: path.join(SHOTS, 'cw-win.png') });

    // ضغطات حقيقية: هل هو كمبيوتر؟
    await pg.evaluate(() => CW._s.open('isit')); await pg.waitForTimeout(300);
    await pg.click('.cw-yn-b.yes'); await pg.waitForTimeout(200);
    const said = await pg.evaluate(() => window.__said.slice(-1)[0]);
    if (!/^cw_isit_(yes|wy|no|wn)$/.test(said)) fail('isit click feedback: ' + said);

    // سحب حقيقي: ركّب الكمبيوتر (عمر ٩ = سحب)
    await pg.evaluate(() => CW._s.open('build')); await pg.waitForTimeout(400);
    const from = await pg.locator('.cw-titem[data-p="monitor"]').boundingBox();
    const to = await pg.locator('.cw-part[data-p="monitor"]').boundingBox();
    await pg.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await pg.mouse.down();
    await pg.mouse.move(from.x + 30, from.y - 30, { steps: 4 });
    await pg.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 }); await pg.mouse.up();
    await pg.waitForTimeout(300);
    if (await pg.locator('.cw-part[data-p="monitor"].empty').count()) fail('drag monitor into place did not work');

    // لوحة المفاتيح الحقيقية: الدرس الأول (ب = KeyF، ت = KeyJ)
    await pg.evaluate(() => { CW._s.open('type_ar'); CW._act.inst.lesson(0); }); await pg.waitForTimeout(300);
    const next = await pg.evaluate(() => document.querySelector('.cw-key.next').dataset.c);
    await pg.keyboard.press(next); await pg.waitForTimeout(100);
    const prog = await pg.evaluate(() => parseFloat(document.querySelector('#pg').style.width));
    if (!(prog > 0)) fail('physical key did not advance typing: ' + prog);
    await pg.keyboard.press('KeyQ'); await pg.waitForTimeout(60);
    if (!(await pg.locator('.cw-key.bad').count())) fail('wrong physical key not flagged');
    // ضغط مفتاح على الشاشة
    const n2 = await pg.evaluate(() => document.querySelector('.cw-key.next').dataset.c);
    await pg.locator(`.cw-key[data-c="${n2}"]`).dispatchEvent('pointerdown');
    const prog2 = await pg.evaluate(() => parseFloat(document.querySelector('#pg').style.width));
    if (!(prog2 > prog)) fail('on-screen key did not advance typing');
    // بوابة الإتقان: أخطاء كثيرة = لا نجوم
    await pg.evaluate(async () => { CW._s.open('type_ar'); const st = CW._act.inst.lesson(1); for (let i = 0; i < 60; i++) { const k = document.querySelector('.cw-key.next'); if (!k) break; st.key('Digit0'); st.key(k.dataset.c); } await new Promise(r => setTimeout(r, 200)); });
    await pg.waitForTimeout(300);
    if (!(await pg.locator('.cw-result').count())) fail('mastery gate: low accuracy should show retry card');
    if (await pg.evaluate(() => window.__saved['cw:ty_ar_2'])) fail('mastery gate: low accuracy saved stars');
    await pg.screenshot({ path: path.join(SHOTS, 'cw-typing-retry.png') });

    // نقرة حقيقية على بالون
    await pg.evaluate(() => CW._s.open('balloons')); await pg.waitForTimeout(1500);
    const bl = pg.locator('.cw-balloon').first();
    if (await bl.count()) { const b = await bl.boundingBox(); await pg.mouse.click(b.x + b.width / 2, b.y + b.height / 3); await pg.waitForTimeout(100); }
    if (!(await pg.evaluate(() => /<b>[1-9]/.test(document.querySelector('#cnt').innerHTML)))) fail('balloon tap did not pop');

    // كل مفاتيح الصوت المبنية بالكود (حروف وكلمات الدروس) لها نص
    const miss = await pg.evaluate(() => {
      const m = [], T = CW_TEXTS, L = CW.typing;
      for (const tr of ['ar', 'en']) for (const les of L.LESSONS[tr]) {
        if (les.keys) les.keys.split(' ').forEach(ch => { const k = tr === 'ar' ? (/\d/.test(ch) ? 'cw_n_' + ch : 'cw_l_' + L.REV.ar[ch].toLowerCase()) : 'cw_en_l_' + ch; if (!T[k]) m.push(k); });
        if (les.words) les.words.split(' ').forEach(w => { const k = tr === 'ar' ? 'cw_wd_' + L.AR_WORDS.indexOf(w) : 'cw_en_w_' + w; if (!T[k]) m.push(k); });
      }
      return m.concat(window.__missing);
    });
    if (miss.length) fail('missing voice texts: ' + [...new Set(miss)].join(', '));
    // الرجوع: من النشاط إلى القائمة إلى الأقسام إلى التطبيق
    await pg.evaluate(() => CW._s.open('story')); await pg.waitForTimeout(400);
    await pg.click('[data-cw="back"]'); await pg.waitForTimeout(400);
    await pg.click('[data-cw="home"]'); await pg.waitForTimeout(400);
    await pg.click('[data-cw="exit"]'); await pg.waitForTimeout(200);
    if ((await pg.evaluate(() => window.__backs)) !== 1) fail('exit did not call ctx.back()');
    console.log(`voice lines spoken in playthrough: ${await pg.evaluate(() => new Set(window.__said).size)}`);
    await pg.context().close();
  }

  if (errors.length) { console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  await browser.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

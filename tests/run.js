// اختبار خوارزمي التلقائي:  node tests/run.js  (من المجلد الرئيسي)
//  1) يتأكد إن كل مرحلة بتنحل بحلّها المرجعي وبتدّي ثلاث نجوم
//  2) يفتح الشاشات بمقاسات أجهزة مختلفة ويصوّرها في tests/shots، ويتأكد إن زر التشغيل والبطاقات ظاهرة
//  3) يجمع أي خطأ في الكود
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const VIEWPORTS = [[320, 568], [360, 640], [375, 812], [414, 896], [640, 360], [768, 1024], [1024, 768], [1366, 768]];
const only = process.argv[2]; // اختياري: اسم جزء الاختبار (levels | screens | cw)

(async () => {
  const PORT = +process.env.PORT || 8799; // PORT=8800 لو في اختبار ثاني شغّال
  await new Promise(r => server.listen(PORT, r));
  const base = `http://localhost:${PORT}/index.html?test=1`;
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const page = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900 });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(`${w}x${h}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE/.test(m.text())) errors.push(`${w}x${h}: ${m.text()}`); });
    await pg.goto(base); await pg.waitForTimeout(400);
    return pg;
  };

  if (!only || only === 'levels') {
    const pg = await page(390, 844);
    const list = await pg.evaluate(() => SirajTest.TRACKS.flatMap(t => t.levels.map(l => [t.id, l.id, !!l.solution, l.kind || ''])));
    for (const [tid, lid, hasSol] of list) {
      if (!hasSol) { console.log(`FAIL ${tid}/${lid}: لا يوجد حل مرجعي`); bad++; continue; }
      const r = await pg.evaluate(async ([t, l]) => { SirajTest.open(t, l); SirajTest.loadSolution(); return await SirajTest.run(); }, [tid, lid]);
      const ok = r && r.won && r.stars === 3;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${tid}/${lid} ${JSON.stringify(r)}`);
    }
    console.log(`${list.length} levels`);
    // البرنامج الجاهز (حشرة أو للتعديل) لازم ما ينجح قبل ما الطفل يصلحه
    const presets = await pg.evaluate(() => SirajTest.TRACKS.flatMap(t => t.levels.filter(l => l.preset).map(l => [t.id, l.id])));
    for (const [tid, lid] of presets) {
      const r = await pg.evaluate(async ([t, l]) => { SirajTest.open(t, l); return await SirajTest.run(); }, [tid, lid]);
      const ok = !r || !r.won; // null = برنامج فاضي (كلمة جديدة بلا بطاقات)، ولا يُحسب محاولة
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} preset ${tid}/${lid} fails as expected ${JSON.stringify(r)}`);
    }
    await pg.context().close();
  }

  // وضع الصغار (عمر ٣): كل مرحلة (ما عدا مختبر بايثون) تنحل بضغط أزرار الحل، ودايماً ثلاث نجوم
  if (!only || only === 'little') {
    const pg = await page(390, 844);
    // الكلمات والحشرات مخفية عن الصغار (tracksFor)، والأزرار مخلوطة فالحل بالترتيب من S.lseq
    const hidden = await pg.evaluate(() => { const p = SirajTest.player(3); return SirajTest.TRACKS.filter(t => !tracksFor(p).some(([x]) => x === t)).map(t => t.id).join(','); });
    if (hidden !== 'funcs,bugs,pylab') { bad++; console.log('FAIL little tracks hidden: ' + hidden); }
    const list = await pg.evaluate(() => SirajTest.TRACKS.filter(t => !t.noLittle).flatMap(t => t.levels.filter(l => l.kind !== 'py').map(l => [t.id, l.id])));
    for (const [tid, lid] of list) {
      const r = await pg.evaluate(async ([t, l]) => { SirajTest.open(t, l, 3); return await SirajTest.littleSolve(); }, [tid, lid]);
      const ok = r && r.won && r.stars === 3;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} little ${tid}/${lid} ${JSON.stringify(r)}`);
    }
    await pg.context().close();
  }

  // المساعدة: بعد فشلين يلمع زر 💡، وبعد أربعة نعرض الحل، والفوز بالحل المعروض نجمة واحدة
  if (!only || only === 'help') {
    const pg = await page(390, 844);
    for (const [tid, lid, wrong] of [['lights', 'l3', null], ['pylab', 'y3', 'forward(1)']]) {
      const r = await pg.evaluate(async ([t, l, w]) => {
        SirajTest.open(t, l);
        const S = SirajTest.S;
        if (w) SirajTest.setCode(w); else { Blocks.load(S.ws, [['light_on', { C: 'red' }]], Blocks.startOf(S.ws).nextConnection); }
        for (let i = 0; i < 4; i++) await SirajTest.run();
        const pulse = document.querySelector('#hintBtn').classList.contains('pulse');
        await new Promise(res => setTimeout(res, 2200));
        const offered = !!document.querySelector('[data-act="sol"]');
        SirajTest.showSolution();
        const res = await SirajTest.run();
        return { fails: S.fails, pulse, offered, res };
      }, [tid, lid, wrong]);
      const ok = r.pulse && r.offered && r.res && r.res.won && r.res.stars === 1;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} help ${tid}/${lid} ${JSON.stringify(r)}`);
    }
    await pg.context().close();
  }

  if (!only || only === 'screens') {
    for (const [w, h] of VIEWPORTS) {
      const pg = await page(w, h);
      const tag = `${w}x${h}`;
      await pg.screenshot({ path: path.join(SHOTS, `${tag}-home.png`) });
      for (const [tid, lid] of [['talk', 't3'], ['draw', 'd4'], ['path', 'p2']]) {
        await pg.evaluate(([t, l]) => SirajTest.open(t, l), [tid, lid]);
        await pg.waitForTimeout(500);
        const vis = await pg.evaluate(() => {
          const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; };
          const fly = document.querySelector('.blocklyFlyout');
          return { run: inView(document.querySelector('#run')), flyout: !!fly && fly.getBoundingClientRect().height > 30 && fly.getBoundingClientRect().bottom <= innerHeight + 1 };
        });
        if (!vis.run || !vis.flyout) { bad++; console.log(`FAIL ${tag} ${tid}/${lid}: ${JSON.stringify(vis)}`); }
        await pg.screenshot({ path: path.join(SHOTS, `${tag}-${tid}.png`) });
      }
      // المسارات الجديدة: [مسار، مرحلة، عمر، اسم الصورة]
      for (const [tid, lid, age, name] of [['lights', 'l3', 9, 'lights'], ['vars', 'v5', 9, 'vars'], ['funcs', 'f3', 9, 'funcs'], ['bugs', 'b4', 9, 'bugs'], ['pylab', 'y4', 9, 'pylab'], ['lights', 'l3', 3, 'little-lights'], ['vars', 'v3', 3, 'little-vars']]) {
        await pg.evaluate(([t, l, a]) => SirajTest.open(t, l, a), [tid, lid, age]);
        await pg.waitForTimeout(500);
        const vis = await pg.evaluate(() => {
          const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; };
          const fly = document.querySelector('.blocklyFlyout'), code = document.querySelector('.code-ed'), lpal = document.querySelector('.lpal');
          const run = document.querySelector('#run');
          return {
            run: run ? inView(run) : !!lpal,
            editor: fly ? fly.getBoundingClientRect().height > 30 && fly.getBoundingClientRect().bottom <= innerHeight + 1 : code ? code.getBoundingClientRect().height > 40 : !!lpal && inView(lpal.lastElementChild),
          };
        });
        if (!vis.run || !vis.editor) { bad++; console.log(`FAIL ${tag} ${tid}/${lid} age ${age}: ${JSON.stringify(vis)}`); }
        await pg.screenshot({ path: path.join(SHOTS, `${tag}-${name}.png`) });
      }
      await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderTracks(); });
      await pg.waitForTimeout(700);
      await pg.screenshot({ path: path.join(SHOTS, `${tag}-tracks.png`) });
      await pg.context().close();
    }
    console.log('screens done →', SHOTS);
  }

  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  await browser.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

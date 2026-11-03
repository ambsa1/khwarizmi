// لقطات اللابتوب للأنشطة: node tests/wide2.shots.js [en|math|cw|learn]  → tests/shots/wide2/
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'wide2');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const PORT = 8790, VPS = [[1366, 768], [1920, 1080]];
const only = process.argv[2];
const probs = [];
const scrollCheck = () => {
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('hscroll ' + document.documentElement.scrollWidth);
  document.querySelectorAll('button').forEach(b => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05 || b.closest('.used')) return;
    const sc = b.closest('.en-scroll, .mt-scroll, .cw-scroll, .lr-scroll, .cw-lessons, .cw-alg, .cw-pw, .cw-scen, .lr-stage');
    if (sc && sc.scrollHeight > sc.clientHeight + 2) { out.push('scrollable ' + sc.className); return; }
    if (r.left < -2 || r.top < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2) out.push('off ' + (b.className || b.tagName).split(' ')[0] + ` ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
  });
  return [...new Set(out)];
};
(async () => {
  await new Promise(r => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch();
  const open = async (page, w, h, q) => {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => probs.push(`${page} ${w}x${h}: ${e.message}`));
    await pg.goto(`http://localhost:${PORT}/tests/${page}.html?${q}`); await pg.waitForTimeout(500);
    return pg;
  };
  const shot = async (pg, name) => { await pg.screenshot({ path: path.join(OUT, name + '.png') }); const c = await pg.evaluate(scrollCheck); if (c.length) probs.push(`${name}: ${c.join(' | ')}`); };
  for (const [w, h] of VPS) {
    const tag = `${w}x${h}`;
    if (!only || only === 'en') {
      const pg = await open('en', w, h, 'age=6&fast=3');
      for (const [s, a] of await pg.evaluate(() => EN.sections.flatMap(s => s.activities.map(a => [s.id, a.id])))) {
        if (!['colors', 'numbers', 'animals', 'talk'].includes(s)) continue;
        await pg.evaluate(([s, a]) => EN._s.open(s, a), [s, a]); await pg.waitForTimeout(600);
        await shot(pg, `en-${tag}-${s}-${a}`);
      }
      await pg.context().close();
    }
    if (!only || only === 'math') {
      const pg = await open('math', w, h, 'age=9&fast=3');
      for (const [s, a] of await pg.evaluate(() => MATH.sections.flatMap(s => s.activities.map(a => [s.id, a.id])))) {
        await pg.evaluate(i => MATH._s.open(i), a); await pg.waitForTimeout(600);
        if (a === 'tables') { await shot(pg, `math-${tag}-tables-pick`); await pg.click('.mt-tbtn >> nth=1'); await pg.waitForTimeout(600); }
        await shot(pg, `math-${tag}-${a}`);
      }
      await pg.context().close();
    }
    if (!only || only === 'cw') {
      const pg = await open('cw', w, h, 'age=9');
      for (const [s, a] of await pg.evaluate(() => CW.sections.flatMap(s => s.activities.map(a => [s.id, a.id])))) {
        await pg.evaluate(i => CW._s.open(i), a); await pg.waitForTimeout(800);
        await shot(pg, `cw-${tag}-${a}`);
      }
      await pg.evaluate(() => { CW._s.open('type_ar'); CW._act.inst.lesson(6); }); await pg.waitForTimeout(600); await shot(pg, `cw-${tag}-type_ar-lesson`);
      await pg.evaluate(() => { CW._s.open('ty_rain'); CW._act.inst.play('ar'); }); await pg.waitForTimeout(1500); await shot(pg, `cw-${tag}-ty_rain-play`);
      await pg.context().close();
    }
    if (!only || only === 'learn') {
      for (const id of ['intro', 'lesson:loops', 'exam']) {
        const pg = await open('learn', w, h, `fast=4&page=${id}&g=b`);
        const seen = {};
        for (let i = 0; i < 40; i++) {
          await pg.waitForTimeout(350);
          const st = await pg.evaluate(() => LEARN._s && LEARN._s.state);
          if (st === 'win') break;
          seen[st] = (seen[st] || 0) + 1;
          if (seen[st] <= 2) await shot(pg, `learn-${tag}-${id.replace(':', '_')}-${st}${seen[st]}`);
          const sel = await pg.evaluate(() => LEARN._s.next()); if (!sel) break;
          const hd = await pg.$(sel); if (!hd) break; await hd.click();
        }
        await pg.context().close();
      }
    }
    console.log(`${tag} done`);
  }
  await br.close(); server.close();
  console.log(probs.length ? probs.join('\n') + `\n${probs.length} problem(s)` : 'ALL OK');
})();

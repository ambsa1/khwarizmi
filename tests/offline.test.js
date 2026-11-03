// يتأكد إن اللعبة بتشتغل بدون إنترنت بعد أول فتح:  node tests/offline.test.js  (من المجلد الرئيسي)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(8796, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:8796/');
  // ننتظر لحدي ما التخزين يكتمل
  const state = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 100; i++) {
      const keys = await caches.keys(); const k = keys.find(x => x.startsWith('khwarizmi-'));
      if (k && reg.active) { const n = (await (await caches.open(k)).keys()).length; if (n >= self.PRECACHE_N) return { ok: true, n }; }
      await new Promise(r => setTimeout(r, 200));
    }
    const keys = await caches.keys();
    return { ok: !!reg.active, keys };
  }).catch(e => ({ err: e.message }));
  await pg.waitForTimeout(3000);
  await ctx.setOffline(true);
  server.close();
  await pg.reload();
  await pg.waitForTimeout(1500);
  const home = await pg.evaluate(() => !!document.querySelector('.players') && typeof Blockly !== 'undefined');
  const voiceOk = await pg.evaluate(async () => { try { const r = await fetch('voice/' + SIRAJ_VOICE[0] + '.mp3'); return r.ok; } catch (e) { return false; } });
  console.log(JSON.stringify({ state, homeOffline: home, voiceOffline: voiceOk }));
  await browser.close();
  process.exit(home && voiceOk ? 0 : 1);
})();

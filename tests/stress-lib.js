// أدوات مشتركة لاختبارات الضغط والصوت (monkey.test.js و voice.test.js):
//  خادم ملفات صغير، وأجهزة قياس تُحقن في الصفحة قبل أي كود: عشوائية ثابتة البذرة، عدّاد المؤقّتات المتكررة،
//  مراقبة الصوت (لا يشتغل مقطعان معاً)، عدد النوافذ والشاشات، وحالة "شغّال" العالقة.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

function serve(port) {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

const familyCode = () => { try { return fs.readFileSync(path.join(ROOT, 'tools', 'family-code.local.txt'), 'utf8').trim(); } catch (e) { return ''; } };

// يُحقن قبل كود اللعبة
function instrument(seed) {
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const inv = window.__inv = { modals: 0, roots: 0, overlap: 0, overlapKeys: [], maxAudio: 0, stuck: 0, desync: [], runningSince: 0 };
  const si = window.setInterval, ci = window.clearInterval, live = new Set();
  window.setInterval = function (f, ms, ...a) { const id = si.call(window, f, ms, ...a); live.add(id); return id; };
  window.clearInterval = function (id) { live.delete(id); return ci.call(window, id); };
  inv.intervals = () => live.size;
  const playing = new Set();
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__inst) {
      this.__inst = 1;
      this.addEventListener('playing', () => playing.add(this));
      ['pause', 'ended', 'emptied', 'abort', 'error'].forEach(ev => this.addEventListener(ev, () => playing.delete(this)));
    }
    return play.apply(this, arguments);
  };
  inv.clicks = 0; inv.keys = 0;
  document.addEventListener('click', () => inv.clicks++, true);
  document.addEventListener('keydown', () => inv.keys++, true);
  inv.audioNow = () => [...playing].filter(x => !x.paused && !x.ended).length + (window.speechSynthesis && speechSynthesis.speaking ? 1 : 0);
  si.call(window, () => {
    const a = inv.audioNow();
    inv.maxAudio = Math.max(inv.maxAudio, a);
    if (a > 1) { inv.overlap++; inv.overlapKeys.push([...playing].map(x => x.src.split('/').pop()).join('+')); }
    inv.modals = Math.max(inv.modals, document.querySelectorAll('.m-back').length);
    const app = document.getElementById('app');
    if (app) inv.roots = Math.max(inv.roots, app.children.length);
    const S = window.App && window.App.S;
    if (S && app) {
      // الأقسام اللي بترسم شاشاتها بنفسها: عالم الكمبيوتر (.cw)، الإنجليزية (.en)، الرياضيات (.mt)، الاستوديو (.st)
      const own = { cw: '.cw', en: '.en', math: '.mt', studio: '.st' }[S.screen];
      const ok = S.screen === 'level' ? !!document.getElementById('stage') : own ? !!app.querySelector(':scope > ' + own) : !!app.querySelector(':scope > .screen');
      if (!ok && inv.desync.length < 10) inv.desync.push(S.screen + ' vs ' + (app.firstElementChild ? app.firstElementChild.className : 'empty'));
      if (S.running) { if (!inv.runningSince) inv.runningSince = Date.now(); else if (Date.now() - inv.runningSince > 30000) { inv.stuck++; inv.runningSince = Date.now(); } } else inv.runningSince = 0;
    }
  }, 20);
}

async function newPage(browser, { w, h, touch, seed, errors, tag }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: !!touch, isMobile: false });
  await ctx.addInitScript(instrument, seed || 1);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(`${pg.__tag || tag}: pageerror ${e.message}`));
  pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|net::ERR_ABORTED/.test(m.text())) errors.push(`${pg.__tag || tag}: console ${m.text()}`); });
  pg.on('dialog', d => d.dismiss().catch(() => {}));
  return pg;
}

module.exports = { serve, ROOT, familyCode, instrument, newPage };

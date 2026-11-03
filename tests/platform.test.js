// رمز العائلة من ملف محلي غير منشور
const FAMILY_CODE = (() => { try { return require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'family-code.local.txt'), 'utf8').trim(); } catch (e) { return ''; } })();
// اختبار ميزات المنصة:  node tests/platform.test.js  (من المجلد الرئيسي)
// لوحة الأهل (رقم بالكلمات + الرقم السري بأرقام عربية)، النسخ والاسترجاع مع الدمج، البيانات التالفة،
// وضع العائلة وركن العائلة، الموسوعة، الشهادة، الملصقات والألقاب، وتذكير الراحة بعد انتهاء الوقت.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const BASE = 'http://localhost:8797/index.html?test=1';
const KEY = 'khwarizmi.v1';
// أسماء أطفال العائلة لا تظهر في الصور المحفوظة
const HIDE_NAMES = '.player b, .x-kid-main b, .bar .t, .p-kid h4 { filter: blur(7px); }';

// يقرأ رقم بوابة الأهل المكتوب بالكلمات (مثل «ألفان وثلاثمئة وخمسة وأربعون»)
const WORDS = [
  [['واحد', 1], ['اثنان', 2], ['ثلاثة', 3], ['أربعة', 4], ['خمسة', 5], ['ستة', 6], ['سبعة', 7], ['ثمانية', 8], ['تسعة', 9]],
  [['عشرون', 20], ['ثلاثون', 30], ['أربعون', 40], ['خمسون', 50], ['ستون', 60], ['سبعون', 70], ['ثمانون', 80], ['تسعون', 90]],
  [['مئة', 100], ['مئتان', 200], ['ثلاثمئة', 300], ['أربعمئة', 400], ['خمسمئة', 500], ['ستمئة', 600], ['سبعمئة', 700], ['ثمانمئة', 800], ['تسعمئة', 900]],
  [['ألف', 1000], ['ألفان', 2000], ['ثلاثة آلاف', 3000], ['أربعة آلاف', 4000], ['خمسة آلاف', 5000], ['ستة آلاف', 6000], ['سبعة آلاف', 7000], ['ثمانية آلاف', 8000], ['تسعة آلاف', 9000]],
].flat();
const wordsToNum = s => s.trim().split(' و').reduce((n, w) => n + ((WORDS.find(([k]) => k === w.trim()) || [0, NaN])[1]), 0);

let bad = 0;
const errors = [];
const check = (ok, name, extra) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };

(async () => {
  await new Promise(r => server.listen(8797, r));
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  async function open(init, w = 390, h = 844) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, acceptDownloads: true });
    if (init !== undefined) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('__init')) { sessionStorage.setItem('__init', '1'); localStorage.setItem(k, v); } }, [KEY, init]);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404/.test(m.text())) errors.push(m.text()); });
    await pg.goto(BASE);
    await pg.waitForTimeout(500);
    return pg;
  }
  const shot = (pg, n) => pg.screenshot({ path: path.join(SHOTS, `platform-${n}.png`) });
  const wait = (pg, ms) => pg.waitForTimeout(ms || 450);

  /* 1) بيانات تالفة */
  for (const [name, raw] of [['broken json', '{"players":[{bad'], ['wrong shapes', JSON.stringify({ players: [{ id: 5 }, { id: 'a b' }, null, 'x',
    { id: 'ok1', name: { x: 1 }, age: 'nine', progress: { t1: '9', 'cw:intro': 7, '<bad>': 2, d1: { stars: 2 } }, seen: [1], certs: 5, color: 'red', total: -4, day: 7 }],
    settings: { limit: 'x', pin: 5, voice: 'no' }, family: 'yes' })], ['not object', '42']]) {
    const pg = await open(raw);
    const r = await pg.evaluate(() => ({ home: !!document.querySelector('.players'), n: Store.data.players.length, p: Store.data.players[0] || null, lim: Store.settings.limit, fam: Store.data.family }));
    check(r.home, `corrupt storage (${name}) → home renders`, JSON.stringify({ n: r.n, lim: r.lim }));
    if (name === 'wrong shapes') check(r.n === 1 && r.p.progress['cw:intro'] === 3 && r.p.progress.d1 === 2 && !('<bad>' in r.p.progress) && r.p.name === '' && r.lim === 30 && r.fam === false, 'corrupt storage normalised', JSON.stringify(r.p.progress));
    await pg.context().close();
  }

  /* 2) لوحة الأهل: سؤال الحساب ثم رقم سري بأرقام عربية */
  {
    const pg = await open();
    await pg.click('.corner'); await wait(pg);
    const q = await pg.textContent('.p-gate-w');
    const qn = wordsToNum(q);
    check(qn >= 121 && qn <= 999, 'gate shows a 3-digit number in words', q);
    const ar = String(qn).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    await pg.fill('#pGate', '1'); await pg.click('[data-p="gate"]');
    check(/غير صحيح/.test(await pg.textContent('#pErr')), 'gate rejects wrong answer');
    await pg.fill('#pGate', ar); await pg.click('[data-p="gate"]'); await wait(pg);
    check(!!(await pg.$('#pPin1')), 'gate accepts Arabic digits → set PIN');
    await pg.fill('#pPin1', '١٢٣٤'); await pg.fill('#pPin2', '1234'); await pg.click('[data-p="pin-save"]'); await wait(pg);
    check(!!(await pg.$('.p-panel')), 'PIN saved (Arabic = Latin digits) → panel opens');
    await shot(pg, 'parents');
    await pg.click('[data-act="home"]'); await wait(pg);
    await pg.click('.corner'); await wait(pg);
    await pg.fill('#pPin', '9999'); await pg.click('[data-p="pin-ok"]');
    check(/غير صحيح/.test(await pg.textContent('#pErr')), 'wrong PIN rejected');
    await pg.fill('#pPin', '۱۲۳۴'); await pg.click('[data-p="pin-ok"]'); await wait(pg);
    check(!!(await pg.$('.p-panel')), 'Persian-digit PIN accepted');
    await pg.click('[data-act="home"]'); await wait(pg);
    await pg.click('.corner'); await wait(pg);
    await pg.click('[data-p="forgot"]'); await wait(pg);
    const hq = await pg.textContent('.p-gate-w');
    check(wordsToNum(hq) >= 1000, 'forgot PIN → 4-digit number gate', hq);
    // حد اللعب والصوت
    await pg.fill('#pGate', String(wordsToNum(hq))); await pg.click('[data-p="gate"]'); await wait(pg);
    await pg.fill('#pPin1', '4321'); await pg.fill('#pPin2', '4321'); await pg.click('[data-p="pin-save"]'); await wait(pg);
    await pg.click('[data-p="limit"][data-m="45"]');
    await pg.uncheck('#pVoice');
    const st = await pg.evaluate(() => ({ lim: Store.settings.limit, v: Store.settings.voice, pin: Store.checkPin('4321') }));
    check(st.lim === 45 && st.v === false && st.pin, 'limit/voice/new PIN saved', JSON.stringify(st));
    await pg.context().close();
  }

  /* 3) النسخ والاسترجاع مع الدمج (الاحتفاظ بأفضل نتيجة) */
  {
    const pg = await open();
    const r = await pg.evaluate(() => {
      const a = Store.addPlayer({ name: 'أ', age: 8, gender: 'b' });
      Store.win(a, 't1', 1); Store.win(a, 'd1', 3); Store.addTime(a, 120);
      const file = JSON.stringify(Store.exportAll());
      a.progress = { t1: 3, d1: 1, p1: 2 }; a.total = 30; Store.save();
      const res = Store.importData(file);
      const b = Store.getPlayer(a.id);
      return { res, prog: b.progress, total: b.total, n: Store.data.players.length, backup: Store.data.lastBackup > 0 };
    });
    check(r.res.merged === 1 && r.n === 1 && r.prog.t1 === 3 && r.prog.d1 === 3 && r.prog.p1 === 2 && r.total === 120 && r.backup, 'export → import merges best results', JSON.stringify(r));
    // من الواجهة: حفظ ملف، ثم استرجاع ملف فيه طفل جديد، ثم ملف خاطئ
    await pg.evaluate(() => { Store.setPin('1111'); });
    await pg.click('.corner'); await wait(pg);
    await pg.fill('#pPin', '1111'); await pg.click('[data-p="pin-ok"]'); await wait(pg);
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-p="backup"]')]);
    const saved = fs.readFileSync(await dl.path(), 'utf8');
    check(/"app":"khwarizmi"/.test(saved) && /\.json$/.test(dl.suggestedFilename()), 'backup downloads a file', dl.suggestedFilename());
    const other = JSON.parse(saved);
    other.players.push({ id: 'zzz1', name: 'ب', age: 5, gender: 'g', color: '#e8579a', progress: { t1: 3 } });
    await wait(pg);
    await pg.setInputFiles('#pFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(other)) });
    await wait(pg, 700);
    const after = await pg.evaluate(() => ({ n: Store.data.players.length, msg: document.querySelector('.m-card') ? document.querySelector('.m-card').textContent : '' }));
    check(after.n === 2 && /تم الاسترجاع/.test(after.msg), 'UI import adds new child', JSON.stringify(after));
    await pg.click('[data-p="close"]'); await wait(pg);
    await pg.setInputFiles('#pFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": [1,2') });
    await wait(pg, 700);
    const msg = await pg.evaluate(() => (document.querySelector('.m-card') ? document.querySelector('.m-card').textContent : ''));
    check(/لم يتم/.test(msg), 'bad file → friendly error, no crash');
    await pg.click('[data-p="close"]'); await wait(pg);
    // حذف بتأكيد
    await pg.click('[data-p="delete"][data-id="zzz1"]'); await wait(pg);
    await pg.click('[data-p="confirm"]'); await wait(pg);
    check(await pg.evaluate(() => Store.data.players.length === 1), 'delete with confirmation');
    await pg.context().close();
  }

  /* 4) وضع العائلة: ٤ أطفال + ركن العائلة */
  {
    const pg = await open();
    await pg.evaluate(() => Store.setPin('2222'));
    check(!(await pg.$('.x-fam-btn')), 'family corner hidden when family mode off');
    await pg.click('.corner'); await wait(pg);
    await pg.fill('#pPin', '2222'); await pg.click('[data-p="pin-ok"]'); await wait(pg);
    await pg.fill('#pFam', 'خطأ'); await pg.click('[data-p="family"]');
    await pg.waitForFunction(() => /غير صحيح/.test((document.querySelector('#pFamErr') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    check(/غير صحيح/.test(await pg.textContent('#pFamErr')), 'wrong family code rejected');
    await pg.fill('#pFam', FAMILY_CODE); await pg.click('[data-p="family"]');
    await pg.waitForFunction(() => Store.familyReady(), null, { timeout: 8000 }).catch(() => {});
    await wait(pg);
    // ترحيب العائلة: ملفات مشفّرة فقط، تُفك بعد الفتح، وتشتغل بعد إعادة الفتح بدون الرمز
    const hi = async () => pg.waitForFunction(() => Store.data.players.filter(p => p.fid).every(p => Voice.has('hi_' + p.fid)), null, { timeout: 8000 }).then(() => true, () => false);
    check(await hi(), 'family greeting voices decrypted after unlock');
    check(await pg.evaluate(c => !(window.SIRAJ_VOICE || []).some(k => /^hi_/.test(k)) && !Object.keys(localStorage).some(k => localStorage.getItem(k).includes(c)), FAMILY_CODE), 'no plain family voices listed, code not stored');
    check(await pg.evaluate(async () => (await fetch('voice/hi_1.mp3')).status === 404), 'no plain hi_*.mp3 published');
    await pg.reload(); await wait(pg, 700);
    check(await pg.evaluate(() => Store.familyReady()) && await hi(), 'family unlock remembered after reload (no code)');
    await pg.evaluate(() => App.renderHome()); await wait(pg, 700);
    const fam = await pg.evaluate(() => document.querySelectorAll('.player.fam').length);
    check(fam === 4, 'family mode shows 4 kids', String(fam));
    await pg.evaluate(() => { const k = Store.data.players.filter(p => p.fid); ['t1', 't2', 'd1'].forEach(id => Store.win(k[0], id, 3)); Store.win(k[1], 't1', 2); Store.win(k[2], 'p1', 3); });
    await pg.addStyleTag({ content: HIDE_NAMES });
    await shot(pg, 'home-family');
    await pg.click('.x-fam-btn'); await wait(pg, 900);
    const fc = await pg.evaluate(() => ({ kids: document.querySelectorAll('.x-kid').length, total: document.querySelector('.x-fam-total b').textContent, lit: document.querySelectorAll('.x-city rect.on').length }));
    check(fc.kids === 4 && fc.total === '14' && fc.lit === 5, 'family corner: 4 kids, family stars, lamp cities', JSON.stringify(fc));
    await shot(pg, 'family');
    await pg.context().close();
  }

  /* 5) الموسوعة، الملصقات، الشهادات، الألقاب، الراحة */
  {
    const pg = await open();
    await pg.evaluate(() => { const p = SirajTest.player(9); Store.win(p, 't1', 3); SirajTest.screens.renderSections(); });
    await wait(pg);
    await shot(pg, 'sections');
    await pg.click('[data-x="ency"]'); await wait(pg, 700);
    const en = await pg.evaluate(() => ({ all: document.querySelectorAll('.x-entry').length, locked: document.querySelectorAll('.x-entry.locked').length, say: !!document.querySelector('[data-x="e-ar"][data-k="say"]'), n: Extras.ENTRIES.length }));
    check(en.all === en.n && en.say && en.locked > 0 && en.locked < en.all, 'encyclopedia opens; unlocks by solved levels', JSON.stringify(en));
    await pg.click('[data-x="e-en"][data-k="say"]');
    await shot(pg, 'ency');
    await pg.click('[data-act="sections"]'); await wait(pg);
    await pg.click('[data-x="stickers"]'); await wait(pg, 900);
    check(await pg.evaluate(() => document.querySelectorAll('.x-stk').length === Extras.STICKERS.length), 'sticker book opens');
    await shot(pg, 'stickers');

    // الشهادة: نكمل مسار الكلام، ونرجع للخريطة → تظهر الشهادة
    await pg.evaluate(() => { const p = SirajTest.S.player; SirajTest.TRACKS[0].levels.forEach(l => Store.win(p, l.id, 3)); SirajTest.screens.renderTracks(); });
    // شهادة + لقب + ملصق = نافذة احتفال واحدة، والشهادة تنفتح من قائمتها
    await pg.waitForSelector('.x-rewards', { timeout: 6000 }).catch(() => {});
    const rw = await pg.evaluate(() => ({ title: !!document.querySelector('.x-rewards .x-title-big'), stk: !!document.querySelector('.x-rewards .x-new-stk'), certs: document.querySelectorAll('.x-rewards [data-x="q-cert"]').length, modals: document.querySelectorAll('.m-back').length }));
    check(rw.title && rw.stk && rw.certs === 1 && rw.modals === 1, 'one celebration modal: title + sticker + certificate list', JSON.stringify(rw));
    await shot(pg, 'rewards');
    await pg.click('[data-x="q-cert"]');
    await pg.waitForSelector('.x-cert-img', { timeout: 6000 }).catch(() => {});
    const cert =await pg.evaluate(() => { const i = document.querySelector('.x-cert-img'); return i ? { w: i.naturalWidth, h: i.naturalHeight } : null; });
    check(cert && cert.w === 1400 && cert.h === 1000, 'certificate renders on canvas', JSON.stringify(cert));
    await wait(pg, 600);
    await shot(pg, 'cert-modal');
    const png = await pg.evaluate(async () => { const p = SirajTest.S.player, g = Extras.groups()[0]; const c = await Extras.certCanvas(p, g, Date.now()); return c.toDataURL('image/png'); });
    fs.writeFileSync(path.join(SHOTS, 'platform-cert.png'), Buffer.from(png.split(',')[1], 'base64'));
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 4000 }).catch(() => null), pg.click('[data-x="cert-save"]')]);
    check(!!dl && /\.png$/.test(dl.suggestedFilename()), 'certificate save downloads png');
    await pg.click('[data-x="q-next"]'); await wait(pg, 500);
    check(!(await pg.$('.m-card')), 'reward queue finishes');
    await pg.evaluate(() => Extras.openCerts()); await wait(pg, 700);
    check(await pg.evaluate(() => document.querySelectorAll('.x-cert.got').length === 1), 'certificates screen lists earned certificate');
    await shot(pg, 'certs');
    await pg.evaluate(() => Extras.openStickers()); await wait(pg, 900);
    await shot(pg, 'stickers-earned');

    // تذكير الراحة: لا يظهر داخل المرحلة، ويظهر عند الرجوع للخريطة
    await pg.evaluate(() => { Store.setLimit(15); Extras._resetBreak(); SirajTest.open('draw', 'd1'); });
    await wait(pg);
    await pg.evaluate(() => Extras.tick(15 * 60));
    await wait(pg, 900);
    check(!(await pg.$('.x-break-t')), 'break reminder never interrupts a level');
    await pg.evaluate(() => SirajTest.screens.renderTracks());
    await pg.waitForSelector('.x-break-t', { timeout: 4000 }).catch(() => {});
    check(!!(await pg.$('.x-break-t')), 'break reminder appears on map after limit');
    await wait(pg, 600);
    await shot(pg, 'break');
    await pg.click('.m-card [data-act="home"]'); await wait(pg);
    check(await pg.evaluate(() => SirajTest.S.screen === 'home'), 'break → home');
    // الوقت محسوب
    check(await pg.evaluate(() => Store.todaySec(Store.data.players[0]) >= 900), 'time today tracked');
    await pg.context().close();
  }

  /* 6) الشعار والشاشات الجديدة بمقاسات صغيرة وكبيرة: الأبواب الأربعة بالترتيب، جوّه الشاشة، وما بتتداخلش */
  const DOORS = ['code', 'pc', 'en', 'math'];
  for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1366, 768]]) {
    const pg = await open(undefined, w, h);
    await shot(pg, `home-${w}`);
    check(await pg.evaluate(() => { const m = document.querySelector('.x-mark'), t = document.querySelector('.x-word'); return !!m && m.complete && m.naturalWidth > 0 && !!t && t.textContent === 'خوارزمي'; }), `home logo lockup (mark + wordmark) at ${w}px`);
    await pg.evaluate(() => { const p = SirajTest.player(7); Store.win(p, 't1', 3); Store.win(p, 'math:count', 3); Store.win(p, 'en:colors_learn', 2); SirajTest.screens.renderSections(); });
    await wait(pg, 1100); // حركة دخول الأبواب
    const fit = await pg.evaluate(() => [...document.querySelectorAll('.x-tile, .x-title')].every(el => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }));
    check(fit, `sections tiles fit at ${w}px`);
    const d = await pg.evaluate(() => {
      const ds = [...document.querySelectorAll('.sections .door')], rs = ds.map(e => e.getBoundingClientRect());
      const overlap = rs.some((a, i) => rs.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
      const inside = rs.every(r => r.left >= -1 && r.right <= innerWidth + 1 && r.width > 200);
      const titles = ds.every(e => { const h = e.querySelector('h3'); return h && h.scrollWidth <= h.clientWidth + 1; });
      const lamps = ds.map(e => e.querySelectorAll('.lamps i').length), lit = ds.map(e => e.querySelectorAll('.lamps i.on').length);
      return { acts: ds.map(e => e.dataset.act), overlap, inside, titles, lamps, lit, cols: new Set(rs.map(r => Math.round(r.left))).size };
    });
    check(JSON.stringify(d.acts) === JSON.stringify(DOORS) && !d.overlap && d.inside && d.titles, `4 doors in order, inside, no overlap at ${w}px`, JSON.stringify(d));
    check(d.lamps.every(n => n > 0) && d.lit[0] === 1 && d.lit[2] === 1 && d.lit[3] === 1, `door lamps per activity (en/math keys light up) at ${w}px`, JSON.stringify({ lamps: d.lamps, lit: d.lit }));
    check(w < 700 ? d.cols === 1 : d.cols === 2, `doors layout ${w < 700 ? '1 column' : '2×2'} at ${w}px`, String(d.cols));
    await shot(pg, `sections-${w}`);
    await pg.click('[data-x="ency"]'); await wait(pg, 700);
    await shot(pg, `ency-${w}`);
    await pg.context().close();
  }

  /* 7) كل باب يفتح قسمه، وزر الرجوع يرجّع لاختيار القسم (بالضغط الحقيقي، بدون أخطاء) */
  {
    const pg = await open(undefined, 390, 844);
    await pg.evaluate(() => { SirajTest.player(7); SirajTest.screens.renderSections(); });
    const BACK = { code: ['tracks', '[data-act="sections"]'], pc: ['cw', '[data-cw="exit"]'], en: ['en', '[data-en="exit"]'], math: ['math', '[data-mt="exit"]'] };
    for (const act of DOORS) {
      await wait(pg, 600);
      await pg.click(`.door[data-act="${act}"]`);
      await wait(pg, 700);
      const [scr, back] = BACK[act];
      const r = await pg.evaluate(s => ({ screen: SirajTest.S.screen, doors: document.querySelectorAll('.door').length, back: !!document.querySelector(s) }), back);
      check(r.screen === scr && r.doors === 0 && r.back, `door ${act} opens its section`, JSON.stringify(r));
      await pg.click(back);
      await wait(pg, 700);
      const b = await pg.evaluate(() => ({ screen: SirajTest.S.screen, doors: document.querySelectorAll('.sections .door').length }));
      check(b.screen === 'sections' && b.doors === 4, `back from ${act} → sections`, JSON.stringify(b));
    }
    // الأهل: عدّ الإنجليزية والرياضيات
    await pg.evaluate(() => { const p = SirajTest.S.player; Store.win(p, 'en:colors_learn', 3); Store.win(p, 'math:count', 2); });
    const st = await pg.evaluate(() => { const p = SirajTest.S.player; const n = Object.keys(p.progress).length; return { stars: Store.stars(p), n, groups: Extras.groups(p).filter(g => /^[EM]-/.test(g.key)).length }; });
    check(st.stars >= 5 && st.groups > 5, 'en/math stars counted; en/math certificate groups', JSON.stringify(st));
    await pg.context().close();
  }

  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  await browser.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();

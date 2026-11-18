// End-to-end checks on the production build (npm run build && npm run preview):
//   node tools/check.mjs [baseUrl]
// 1. works offline after the first visit (service worker + bundled fonts)
// 2. guest flow: three questions + picture -> today's journey; the golden button lights a lamp
// 3. map: a locked world explains itself, an open world travels
// 4. no child-facing text below 18px on any child screen
// 5. no UI element overlaps another or sits on the 3D world view (on four screen sizes)
// 6. family mode unlocks with the local code and shows four sealed portraits (screenshots go to ../private/shots)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const PRIVATE = join(HERE, '..', '..', 'private');
const base = process.argv[2] || 'http://127.0.0.1:5181/';
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));

/** Visible text nodes smaller than 18px, outside parents-only text. */
const smallText = () => page.evaluate(() => {
  const bad = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const n = walk.currentNode; const t = n.textContent.trim(); const el = n.parentElement;
    if (!t || !el || el.closest('.t-small, .parents, .perf, kbd, .sr')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.opacity === '0') continue;
    const size = parseFloat(st.fontSize); if (size < 18) bad.push(`${size}px "${t.slice(0, 20)}"`);
  }
  return bad;
});

// 1. offline
await page.goto(base, { waitUntil: 'load' });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.entry', { timeout: 15000 }).catch(() => {});
const offlineOk = await page.locator('.entry').count();
const fontsOk = await page.evaluate(async () => Promise.all([['24px Lalezar', 'سراج'], ['700 24px Rubik', 'سراج'], ['500 28px "Noto Naskh Arabic"', 'سَرَاج'], ['28px Andika', 'abc']].map(async ([f, t]) => (await document.fonts.load(f, t)).length > 0)));
ok('opens offline after first visit', offlineOk === 1);
ok('bundled fonts available offline', fontsOk.every(Boolean), JSON.stringify(fontsOk));
await ctx.setOffline(false);

// 2. guest flow
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.entry');
await page.waitForTimeout(1200);
let small = await smallText(); ok('entry: no text under 18px', small.length === 0, small.join(', '));
await page.getByRole('button', { name: 'ضيف جديد' }).click();
await page.waitForSelector('.guest');
small = await smallText(); ok('guest: no text under 18px', small.length === 0, small.join(', '));
await page.getByRole('button', { name: 'ولد' }).click();
await page.locator('.age-ball').nth(5).click();          // 8 years
await page.waitForSelector('.terrace');
await page.locator('.terrace').nth(2).click();           // grade 3
await page.waitForSelector('.avatar-pick');
await page.locator('.avatar-pick').first().click();
await page.waitForSelector('.path', { timeout: 10000 });
ok('guest wizard reaches today\'s journey', true);
await page.waitForTimeout(2500);
small = await smallText(); ok('path: no text under 18px', small.length === 0, small.join(', '));
const before = await page.locator('.today-bar li.done').count();
await page.locator('.btn.go').click();
await page.waitForSelector('.lesson', { timeout: 8000 });
small = await smallText(); ok('lesson: no text under 18px', small.length === 0, small.join(', '));
await page.waitForSelector('.lesson-steps li', { timeout: 8000 });
const stepsSeen = await page.locator('.lesson-steps li').count();
for (let k = 0; k < stepsSeen; k++) { await page.locator('.lesson .btn.go').click(); await page.waitForTimeout(700); }   // the lesson button ignores double taps within 0.5 s
await page.waitForSelector('.path', { timeout: 8000 });
await page.waitForTimeout(1600);
const after = await page.locator('.today-bar li.done').count();
ok('a real lesson plays through and builds its house', before === 0 && after === 1 && stepsSeen === 6, `${stepsSeen} steps, lamps ${before} -> ${after}`);

/** Every UI block on the journey screen: inside the viewport, no two overlapping, none on the world view. */
const overlaps = () => page.evaluate(() => {
  const sel = ['.topbar-me', '.world-pill', '.path-window', '.btn.go', '.today', '.zones', '.tabbar'];
  const R = sel.map(s => [s, document.querySelector(s)?.getBoundingClientRect()]).filter(([, r]) => r && r.width && r.height);
  const bad = [];
  const vw = innerWidth, vh = innerHeight;
  for (const [s, r] of R) if (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5) bad.push(`${s} outside the screen`);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, ra] = R[i], [b, rb] = R[j];
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 1 && iy > 1) bad.push(`${a} overlaps ${b}`);
  }
  // nothing positioned on top of the world view except Siraj's bubble and the confetti
  const win = document.querySelector('.path-window');
  for (const el of win ? win.querySelectorAll(':scope > *') : []) {
    if (el.matches('canvas, div:has(> canvas), .window-line, .confetti, [aria-hidden="true"], [role="img"]') || el.querySelector('canvas')) continue;
    const r = el.getBoundingClientRect(); if (r.width && r.height) bad.push(`extra element on the world view: ${el.className}`);
  }
  return bad;
});
for (const [w, h] of [[360, 800], [393, 873], [800, 360], [1366, 768]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);
  const bad = await overlaps();
  ok(`journey layout clean at ${w}x${h}`, bad.length === 0, bad.join(', '));
}
await page.setViewportSize({ width: 360, height: 800 });
await page.waitForTimeout(500);
const fps = await page.evaluate(() => window.__stats?.fps ?? 0);
ok('3D window renders frames', fps > 0, `fps=${fps}`);


// 4b. learner data (phase 3): survives reloads, migrates old shapes, recovers from corruption, backs up and restores,
//     and carries progress over from the version published before the rebuild (v2, 'khwarizmi.v1')
const pill = () => page.locator('.world-pill').getAttribute('aria-label').catch(() => '');
const builtFrom = t => { const m = String(t).match(/:\s*([٠-٩0-9]+)/); return m ? +m[1].replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660) : -1; };
// the installed app always opens on "who's playing?": reopen, then tap the (only) player card, as a child would
const openPath = async pg => { await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.who-card', { timeout: 10000 }).catch(async e => { await pg.screenshot({ path: process.env.TEMP + '/openpath-fail.png' }); console.log('openPath stalled; storage:', await pg.evaluate(() => localStorage.getItem('khawarizmi.v2'))); console.log('app error log:', await pg.evaluate(() => new Promise(res => { const r = indexedDB.open('khawarizmi'); r.onsuccess = () => { const q = r.result.transaction('meta').objectStore('meta').get('errors'); q.onsuccess = () => res(JSON.stringify(q.result)); }; r.onerror = () => res('no db'); }))); throw e; }); await pg.locator('.who-card').last().click(); await pg.waitForSelector('.path', { timeout: 10000 }); };
const toPath = () => openPath(page);
const openParents = async pg => { await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.entry', { timeout: 10000 }); await pg.locator('.entry-corner button').dispatchEvent('keydown', { key: 'Enter' }); await pg.waitForSelector('.learner-data', { timeout: 10000 }); };
const guestId = () => page.evaluate(() => JSON.parse(localStorage.getItem('khawarizmi.v2')).state.current);
const idb = (fn, ...args) => page.evaluate(([src, a]) => new Promise((res, rej) => {
  const r = indexedDB.open('khawarizmi'); r.onerror = () => rej(r.error);
  r.onsuccess = () => { const db = r.result; Promise.resolve(new Function('db', 'args', src)(db, a)).then(v => { db.close(); res(v); }, rej); };
}), [fn, args]);
const putRec = `return new Promise((res, rej) => { const tx = db.transaction(args[0], 'readwrite'); tx.objectStore(args[0]).put(args[2], args[1]); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });`;
const getRec = `return new Promise((res, rej) => { const tx = db.transaction(args[0], 'readonly'); const q = tx.objectStore(args[0]).get(args[1]); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });`;

await page.setViewportSize({ width: 360, height: 800 });
await page.locator('.btn.go').click(); await page.waitForTimeout(1400);
const gid = await guestId();
const builtBefore = builtFrom(await pill());
await toPath(); await page.waitForTimeout(800);
ok('progress survives closing and reopening', builtFrom(await pill()) === builtBefore && builtBefore >= 2, `houses ${builtBefore} -> ${builtFrom(await pill())}`);

// an old-shape record (schema 0, no days) is migrated on load
const sk = ['coding.sequence.order', 'coding.sequence.values', 'coding.sequence.grid-moves'];
await idb(putRec, 'learners', gid, { id: gid, skills: Object.fromEntries(sk.map(k => [k, { status: 'mastered', box: 1, attempts: 1, correct: 1, first: 1, last: 1, due: null }])) });
await toPath(); await page.waitForTimeout(800);
const migrated = await idb(getRec, 'learners', gid);
ok('older data shape is migrated on load', migrated?.schema === 1 && builtFrom(await pill()) >= 3, `schema ${migrated?.schema}, houses ${builtFrom(await pill())}`);

// a corrupted record falls back to the last good copy
await idb(putRec, 'meta', `lastGood:${gid}`, migrated);
await idb(putRec, 'learners', gid, { broken: true });
await toPath(); await page.waitForTimeout(800);
ok('corrupted data recovers from the last good copy', builtFrom(await pill()) >= 3, `houses ${builtFrom(await pill())}`);

// backup: download from the parents' corner, restore into a brand-new browser
await openParents(page);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'احفظ نسخة احتياطية' }).click()]);
const backupPath = await dl.path();
const housesHere = builtFrom(await (async () => { await toPath(); await page.waitForTimeout(500); return pill(); })());
const ctx2 = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'ar' });
// same players (settings only, no learning data) placed before the app starts, so it cannot overwrite them
await ctx2.addInitScript(state => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('khawarizmi.v2', state); sessionStorage.setItem('seeded', '1'); } },
  await page.evaluate(() => localStorage.getItem('khawarizmi.v2')));
const p2 = await ctx2.newPage();
await p2.goto(base, { waitUntil: 'load' });
await openParents(p2);
await p2.locator('.learner-data input[type=file]').setInputFiles(backupPath);
await p2.waitForTimeout(800);
const restoredMsg = await p2.locator('.learner-data [role=status]').innerText().catch(() => '');
await openPath(p2); await p2.waitForTimeout(800);
const housesThere = builtFrom(await p2.locator('.world-pill').getAttribute('aria-label'));
ok('backup restores on another browser', housesThere === housesHere && housesHere > 0, `${restoredMsg} houses ${housesHere} -> ${housesThere}`);
await ctx2.close();

// v2 progress: an old player with every coding level solved; linked by hand to a guest in the parents' corner
const ctx3 = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'ar' });
const p3 = await ctx3.newPage();
await p3.goto(base, { waitUntil: 'load' });
const levels = JSON.parse(readFileSync(join(HERE, '..', '..', 'content', 'legacy', 'coding-75.json'), 'utf8')).levels.map(l => l.legacyId);
await p3.evaluate(([lv]) => localStorage.setItem('khwarizmi.v1', JSON.stringify({ v: 2, players: [{ id: 'old1', name: 'لاعب قديم', age: 9, gender: 'b', progress: Object.fromEntries(lv.map(k => [k, 3])) }] })), [levels]);
await p3.reload({ waitUntil: 'load' }); await p3.waitForSelector('.entry');
await p3.getByRole('button', { name: 'ضيف جديد' }).click();
await p3.getByRole('button', { name: 'ولد' }).click(); await p3.locator('.age-ball').nth(5).click();
await p3.locator('.terrace').nth(2).click(); await p3.locator('.avatar-pick').first().click();
await p3.waitForSelector('.path');
await openParents(p3); await p3.waitForSelector('.learner-data select', { timeout: 5000 }).catch(() => {});
const waitingOld = await p3.locator('.learner-data select').count();
if (waitingOld) await p3.locator('.learner-data select').first().selectOption({ index: 1 });
await p3.waitForTimeout(500);
await openPath(p3); await p3.waitForTimeout(800);
const fromV2 = builtFrom(await p3.locator('.world-pill').getAttribute('aria-label'));
const archived = await p3.evaluate(() => new Promise(res => { const r = indexedDB.open('khawarizmi'); r.onsuccess = () => { const q = r.result.transaction('legacy').objectStore('legacy').getAllKeys(); q.onsuccess = () => res(q.result.length); }; }));
ok('v2 progress is archived, translated and linked', waitingOld === 1 && fromV2 > 0 && archived === 1, `waiting ${waitingOld}, houses from v2 ${fromV2}, raw copies ${archived}`);
await ctx3.close();
await page.setViewportSize({ width: 360, height: 800 });
await toPath(); await page.waitForTimeout(800);

// 3. map
await page.getByRole('button', { name: 'الخريطة' }).click();
await page.waitForSelector('.map');
await page.waitForTimeout(2000);
small = await smallText(); ok('map: no text under 18px', small.length === 0, small.join(', '));
await page.locator('.world-card', { hasText: 'الساقية' }).click();
const lockedMsg = await page.locator('.window-line').innerText().catch(() => '');
ok('locked world explains itself', lockedMsg.length > 0, lockedMsg);
await page.waitForTimeout(800);
await page.locator('.world-card', { hasText: 'سواكن' }).click();
await page.waitForSelector('.path', { timeout: 5000 }).catch(() => {});
const title = await page.locator('.world-pill-name').first().innerText().catch(() => '');
ok('open world travels to its path', title.includes('سواكن') || title.includes('جزيرة'), title);
await page.getByRole('button', { name: 'جوازي' }).first().click();
await page.waitForSelector('.stamps');
small = await smallText(); ok('passport: no text under 18px', small.length === 0, small.join(', '));

// 5b. a downloaded world works with no internet; a deleted one explains that it needs internet once
{
  const cx = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'ar', serviceWorkers: 'allow' });
  const pg = await cx.newPage();
  await pg.goto(base, { waitUntil: 'load' }); await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.entry');
  await pg.getByRole('button', { name: 'ضيف جديد' }).click();
  await pg.getByRole('button', { name: 'بنت' }).click(); await pg.locator('.age-ball').nth(5).click();
  await pg.locator('.terrace').nth(2).click(); await pg.locator('.avatar-pick').first().click();
  await pg.waitForSelector('.path-window canvas', { timeout: 60000 }).catch(() => {});
  const online3d = await pg.locator('.path-window canvas').count();
  await cx.setOffline(true);
  await openPath(pg); await pg.waitForTimeout(3500);
  const offline3d = await pg.locator('.path-window canvas').count();
  const fpsOff = await pg.evaluate(() => window.__stats?.fps ?? 0);
  ok('a downloaded world opens with no internet', online3d === 1 && offline3d === 1 && fpsOff > 0, `3D online ${online3d}, offline ${offline3d}, fps ${fpsOff}`);
  await cx.setOffline(false);
  await openParents(pg);
  await pg.locator('.device').getByRole('button', { name: 'احذف من الجهاز' }).click(); await pg.waitForTimeout(800);
  await cx.setOffline(true);
  await openPath(pg); await pg.waitForTimeout(1500);
  const gate = await pg.locator('.world-gate').innerText().catch(() => '');
  ok('a deleted world says it needs internet once', gate.includes('إنترنت'), gate);
  await cx.close();
}

// 5c. performance budgets (the release stops if any is exceeded)
{
  const { gzipSync } = await import('node:zlib');
  const { readdirSync } = await import('node:fs');
  const dist = join(HERE, '..', 'dist', 'assets');
  const js = existsSync(dist) ? readdirSync(dist).filter(f => f.endsWith('.js')).reduce((a, f) => a + gzipSync(readFileSync(join(dist, f))).length, 0) : 0;
  ok('app code under 600 KB compressed', js > 0 && js <= 600 * 1024, `${Math.round(js / 1024)} KB`);
  const idx = JSON.parse(readFileSync(join(HERE, '..', 'public', 'worlds', 'index.json'), 'utf8'));
  const big = Object.entries(idx).filter(([, w]) => w.bytes > 6 * 1048576);
  ok('every world under 6 MB', big.length === 0, Object.entries(idx).map(([id, w]) => `${id} ${(w.bytes / 1048576).toFixed(2)} MB`).join(', '));
  const cx = await browser.newContext({ viewport: { width: 393, height: 873 }, locale: 'ar' });
  await cx.addInitScript(() => localStorage.setItem('khawarizmi.v2', JSON.stringify({ state: { tierOverride: 'low' }, version: 0 })));
  const pg = await cx.newPage();
  const worst = { calls: 0, tris: 0 };
  for (const m of [0, 24, 37]) {
    await pg.goto(`${base}?view=world&w=kassala&m=${m}`, { waitUntil: 'load' }); await pg.waitForTimeout(6000);
    const st = await pg.evaluate(() => window.__stats);
    worst.calls = Math.max(worst.calls, st.calls); worst.tris = Math.max(worst.tris, st.tris);
  }
  ok('low tier: at most 80 draw calls', worst.calls > 0 && worst.calls <= 80, `${worst.calls}`);
  ok('low tier: at most 150,000 triangles', worst.tris > 0 && worst.tris <= 150000, `${worst.tris}`);
  await cx.close();
}

// 5. family mode (local only)
const codeFile = join(PRIVATE, 'family-code.txt');
if (existsSync(codeFile)) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.entry');
  ok('family hidden before the code', await page.locator('.who-card').count() === 0);
  await page.locator('.entry-corner button').dispatchEvent('keydown', { key: 'Enter' });
  await page.waitForSelector('.parents');
  await page.locator('input.code').fill('wrong-code');
  await page.getByRole('button', { name: 'افتح' }).click();
  await page.waitForTimeout(2500);
  ok('wrong code is refused', await page.locator('.parents [role=status]').innerText().then(t => t.includes('ما اتطابق')).catch(() => false));
  await page.locator('input.code').fill(readFileSync(codeFile, 'utf8').trim());
  await page.getByRole('button', { name: 'افتح' }).click();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'رجوع' }).click();
  await page.waitForSelector('.who-card');
  await page.waitForTimeout(2500);
  const cards = await page.locator('.who-card').count();
  const imgs = await page.locator('.who-card img').evaluateAll(els => els.filter(e => e.complete && e.naturalWidth > 0).length);
  ok('family mode shows four children with portraits', cards === 4 && imgs === 4, `cards=${cards} portraits=${imgs}`);
  mkdirSync(join(PRIVATE, 'shots'), { recursive: true });
  await page.screenshot({ path: join(PRIVATE, 'shots', 'family-entry-360x800.png') });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(PRIVATE, 'shots', 'family-entry-1366x768.png') });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('.who-card').first().click();
  await page.waitForSelector('.path', { timeout: 5000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(PRIVATE, 'shots', 'family-path-360x800.png') });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.who-card', { timeout: 8000 }).catch(() => {});
  ok('family stays open after reload (saved key, not the code)', await page.locator('.who-card').count() === 4);
  const stored = await page.evaluate(() => localStorage.getItem('khawarizmi.v2') || '');
  ok('the code itself is never stored', !stored.includes(readFileSync(codeFile, 'utf8').trim()));
} else ok('family mode', true, 'skipped: no private code on this machine');

ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

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
const fontsOk = await page.evaluate(async () => Promise.all([['800 24px Cairo', 'سراج'], ['700 24px Cairo', 'سراج'], ['500 28px "Noto Naskh Arabic"', 'سَرَاج'], ['28px Andika', 'abc']].map(async ([f, t]) => (await document.fonts.load(f, t)).length > 0)));
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
await page.waitForSelector('.grade-card');
const kg = await page.locator('.kg-btn').count();
await page.locator('.grade-card').nth(2).click();        // grade 3
await page.waitForSelector('.pic-strip .pic');
await page.waitForTimeout(500);
const strip = await page.evaluate(() => { const box = document.querySelector('.pic-strip').getBoundingClientRect(), on = document.querySelector('.pic-strip .pic.on'), r = on?.getBoundingClientRect();
  return { pics: document.querySelectorAll('.pic-strip .pic').length, on: on?.querySelector('img').getAttribute('src').split('/').pop(), offCentre: r ? Math.round(Math.abs(r.left + r.width / 2 - (box.left + box.width / 2))) : -1, scrolls: document.querySelector('.pic-strip').scrollWidth > box.width }; });
small = await smallText();
ok('new player: grade cards with a kindergarten button, then all six boy pictures in a scrolling strip that starts on one of his age (grade 3)', kg === 1 && strip.pics === 6 && strip.on === 'g3.webp' && strip.offCentre <= 12 && strip.scrolls && small.length === 0, JSON.stringify(strip) + ' ' + small.join(', '));
await page.locator('.avatar-go').click();
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
    if (el.matches('canvas, div:has(> canvas), .window-line, .toast, .confetti, [aria-hidden="true"], [role="img"]') || el.querySelector('canvas')) continue;
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
const openPath = async pg => { await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.who-card:not(.who-new)', { timeout: 10000 }).catch(async e => { await pg.screenshot({ path: process.env.TEMP + '/openpath-fail.png' }); console.log('openPath stalled; storage:', await pg.evaluate(() => localStorage.getItem('khawarizmi.v2'))); console.log('app error log:', await pg.evaluate(() => new Promise(res => { const r = indexedDB.open('khawarizmi'); r.onsuccess = () => { const q = r.result.transaction('meta').objectStore('meta').get('errors'); q.onsuccess = () => res(JSON.stringify(q.result)); }; r.onerror = () => res('no db'); }))); throw e; }); await pg.locator('.who-card:not(.who-new)').last().click(); await pg.waitForSelector('.path', { timeout: 10000 }); };
const toPath = () => openPath(page);
const openParents = async pg => { await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.entry', { timeout: 10000 }); await pg.locator('.entry-corner button').click(); await pg.waitForSelector('.learner-data', { timeout: 10000 }); };
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
await p3.getByRole('button', { name: 'ولد' }).click(); await p3.locator('.grade-card').nth(2).click(); await p3.locator('.avatar-go').click();
await p3.waitForSelector('.path');
await openParents(p3); await p3.waitForTimeout(800);
const parentsText = await p3.locator('.parents').innerText();
const idbRead = (store, key) => p3.evaluate(([st, k]) => new Promise(res => { const r = indexedDB.open('khawarizmi'); r.onsuccess = () => { const q = k ? r.result.transaction(st).objectStore(st).get(k) : r.result.transaction(st).objectStore(st).getAllKeys(); q.onsuccess = () => res(q.result); }; }), [store, key]);
const translated = ((await idbRead('meta', 'legacyPlayers')) ?? []).length, archived = ((await idbRead('legacy')) ?? []).length;
ok('v2 progress is archived and translated, never shown in the public parents corner', translated === 1 && archived === 1 && !parentsText.includes('لاعب قديم') && !parentsText.includes('اربطه'), `translated ${translated}, raw copies ${archived}`);
await ctx3.close();

// desktop guest session: the secret holds show nothing, the lock opens with one tap, pages use the full width, every
// page has a back button that matches the browser back button, and a guest can be removed (after a confirmation)
{
  const cx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'ar' });
  const pg = await cx.newPage();
  await pg.goto(base + '?demo=guest', { waitUntil: 'load' }); await pg.waitForSelector('.entry');
  const bdOf = () => pg.evaluate(() => { const b = document.querySelector('.backdrop'); const ic = [...document.querySelectorAll('.backdrop .heritage i')]; const cut = ic.filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5; }).length; return { region: b?.dataset.region, tile: ic[0] ? getComputedStyle(ic[0]).backgroundImage : '', icons: ic.length, cut }; });
  const entryBd = await bdOf();
  const sj = await pg.locator('.entry-siraj').boundingBox();
  await pg.mouse.move(sj.x + sj.width / 2, sj.y + sj.height / 2); await pg.mouse.down(); await pg.waitForTimeout(1200);
  const ringShown = await pg.locator('.entry-siraj svg, .hold-ring').count();
  await pg.mouse.up(); await pg.waitForTimeout(400);
  const stillEntry = await pg.locator('.entry').count();
  ok('secret gates are silent: no ring while holding, a short hold does nothing', ringShown === 0 && stillEntry === 1, `ring ${ringShown}`);
  await pg.locator('.entry-corner button').click();
  const opened = await pg.waitForSelector('.parents', { timeout: 5000 }).then(() => true).catch(() => false);
  const body = await pg.locator('.parents-body').boundingBox();
  const backBtn = await pg.locator('.parents .back-btn').boundingBox();
  ok('desktop: one tap on the lock opens the parents corner across the full width', opened && body && body.width >= 1300, `width ${Math.round(body?.width ?? 0)}px`);
  await pg.goBack(); const backToEntry = await pg.waitForSelector('.entry', { timeout: 5000 }).then(() => true).catch(() => false);
  await pg.locator('.who-wrap .who-card').first().click(); await pg.waitForSelector('.path', { timeout: 8000 });
  await pg.getByRole('button', { name: 'جوازي' }).click(); await pg.waitForSelector('.stamps');
  await pg.locator('.stamp').first().click(); await pg.waitForSelector('.sheet.page');
  await pg.goBack(); await pg.waitForTimeout(500);
  const sheetClosed = await pg.locator('.sheet.page').count() === 0 && await pg.locator('.stamps').count() === 1;
  await pg.locator('.topbar .back-btn').click(); const toPathBack = await pg.waitForSelector('.path', { timeout: 5000 }).then(() => true).catch(() => false);
  ok('back buttons sit top right and match the browser back (pages and modals)', backBtn && backBtn.x > 683 && backToEntry && sheetClosed && toPathBack, `right edge ${Math.round((backBtn?.x ?? 0) + (backBtn?.width ?? 0))}, entry ${backToEntry}, sheet closed ${sheetClosed}, path ${toPathBack}`);
  const pathBd = await bdOf();
  ok('the background carries the heritage icons (whole, none cut at an edge): all four regions on "who is playing?", the own region of the world on the journey', entryBd.region === 'all' && entryBd.tile.includes('/art/heritage/all.webp') && !entryBd.tile.includes('/assets/art/') && pathBd.region === 'east' && pathBd.tile.includes('/art/heritage/east.webp') && !pathBd.tile.includes('/assets/art/') && entryBd.icons >= 30 && entryBd.cut === 0 && pathBd.cut === 0, JSON.stringify({ entryBd, pathBd }));
  await pg.goto(base, { waitUntil: 'load' }); await pg.waitForSelector('.entry');
  const before = await pg.locator('.who-wrap').count();
  await pg.locator('.who-del').first().click(); await pg.getByRole('button', { name: 'امسح' }).click(); await pg.waitForTimeout(400);
  const after = await pg.locator('.who-wrap').count();
  ok('a guest can be removed from "who is playing?" after a confirmation', before === 1 && after === 0, `${before} -> ${after}`);
  await cx.close();
}
await page.setViewportSize({ width: 360, height: 800 });
await toPath(); await page.waitForTimeout(800);

// 3. map
await page.getByRole('button', { name: 'الخريطة' }).click();
await page.waitForSelector('.map');
await page.waitForTimeout(2000);
small = await smallText(); ok('map: no text under 18px', small.length === 0, small.join(', '));
await page.locator('.world-card', { hasText: 'المستكشف الصغير' }).click();
const lockedMsg = await page.locator('.window-line').innerText().catch(() => '');
ok('locked world explains itself', lockedMsg.length > 0, lockedMsg);
await page.waitForTimeout(800);
await page.locator('.world-card', { hasText: 'ألعاب الذكاء' }).click();
await page.waitForSelector('.path', { timeout: 5000 }).catch(() => {});
const title = await page.locator('.world-pill-name').first().innerText().catch(() => '');
ok('open world travels to its path (subject in the top bar)', title.includes('ألعاب الذكاء'), title);
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
  await pg.getByRole('button', { name: 'بنت' }).click(); await pg.locator('.grade-card').nth(2).click(); await pg.locator('.avatar-go').click();
  await pg.waitForSelector('.path-window canvas', { timeout: 60000 }).catch(() => {});
  const online3d = await pg.locator('.path-window canvas').count();
  await cx.setOffline(true);
  await openPath(pg); await pg.waitForTimeout(3500);
  const offline3d = await pg.locator('.path-window canvas').count();
  const fpsOff = await pg.evaluate(() => window.__stats?.fps ?? 0);
  ok('a downloaded world opens with no internet', online3d === 1 && offline3d === 1 && fpsOff > 0, `3D online ${online3d}, offline ${offline3d}, fps ${fpsOff}`);
  await cx.setOffline(false);
  // the world's files gone from the device (the parents' corner no longer offers a delete button)
  await pg.evaluate(async () => { const c = await caches.open('worlds'); for (const k of await c.keys()) if (k.url.includes('/worlds/kassala/')) await c.delete(k); });
  await pg.waitForTimeout(500);
  await cx.setOffline(true);
  await openPath(pg); await pg.waitForTimeout(1500);
  const gate = await pg.locator('.world-gate').innerText().catch(() => '');
  ok('a world missing from the device says it needs internet once', gate.includes('إنترنت'), gate);
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
  const each = [];
  for (const [w, n] of [['kassala', 37], ['saqiya', 11], ['mogran', 19], ['suakin', 17], ['meroe', 26], ['marra', 30]]) {
    const one = { calls: 0, tris: 0, fps: 999 };
    for (const m of [0, Math.round(n * 0.6), n]) {
      await pg.goto(`${base}?view=world&w=${w}&m=${m}`, { waitUntil: 'load' }); await pg.waitForTimeout(6500);
      const st = await pg.evaluate(() => window.__stats);
      one.calls = Math.max(one.calls, st.calls); one.tris = Math.max(one.tris, st.tris); one.fps = Math.min(one.fps, st.fps);
    }
    each.push(`${w} ${one.calls}/${Math.round(one.tris / 1000)}k/${one.fps}fps`);
    worst.calls = Math.max(worst.calls, one.calls); worst.tris = Math.max(worst.tris, one.tris);
  }
  ok('low tier: at most 80 draw calls (all worlds)', worst.calls > 0 && worst.calls <= 80, each.join(', '));
  ok('low tier: at most 150,000 triangles (all worlds)', worst.tris > 0 && worst.tris <= 150000, each.join(', '));
  await cx.close();
}

// 4b. developer gate (local only): hold the version number 4 s in menu > about; wrong code refused, right code opens the panel
const devFile = join(PRIVATE, 'dev-code.txt');
if (existsSync(devFile)) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(base, { waitUntil: 'load' }); await page.waitForSelector('.entry');
  await page.getByRole('button', { name: 'القائمة' }).first().click();
  await page.getByRole('button', { name: 'عن تطبيق خوارزمي' }).click();
  await page.waitForTimeout(900);   // let the sheet finish sliding in
  const vb = await page.locator('.version').boundingBox(), sb = await page.locator('.sheet.page').boundingBox();
  ok('desktop: menu pages are a centred modal with the version line in view', vb && sb && vb.y + vb.height <= 768 && Math.abs((sb.x + sb.width / 2) - 683) < 4 && Math.abs((sb.y + sb.height / 2) - 384) < 4,
    `version bottom ${Math.round((vb?.y ?? 0) + (vb?.height ?? 0))}, modal centre ${Math.round((sb?.x ?? 0) + (sb?.width ?? 0) / 2)},${Math.round((sb?.y ?? 0) + (sb?.height ?? 0) / 2)}`);
  await page.locator('.version').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const v = await page.locator('.version').boundingBox();
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2); await page.mouse.down(); await page.waitForTimeout(2800); await page.mouse.up();
  await page.waitForSelector('.gate #dev-code');
  await page.locator('#dev-code').fill('wrong-code'); await page.getByRole('button', { name: 'ادخل' }).click(); await page.waitForTimeout(2500);
  const refused = await page.locator('.gate [role=status]').innerText().catch(() => '');
  await page.locator('#dev-code').fill(readFileSync(devFile, 'utf8').trim()); await page.getByRole('button', { name: 'ادخل' }).click();
  const opened = await page.waitForSelector('.dev .dev-tabs', { timeout: 15000 }).then(() => true).catch(() => false);
  ok('developer gate: hidden gesture, wrong code refused, right code opens the panel', refused.includes('ما اتطابق') && opened, refused);
  // active issues: grouped cards, an archive tab for older versions, and the copyable Claude Code prompt
  await page.getByRole('tab', { name: /الأخطاء الحالية/ }).click(); await page.waitForTimeout(800);
  const prompt = await page.locator('.dev-prompt textarea').inputValue().catch(() => '');
  const archiveTab = await page.getByRole('tab', { name: /الأرشيف/ }).count();
  const devWide = await page.locator('.dev-body').evaluate(e => e.getBoundingClientRect().width);
  ok('developer panel: active / archive tabs, live Claude Code prompt, desktop width', prompt.includes('Khwarizmi') && archiveTab === 1 && devWide > 800, `prompt ${prompt.length} chars, body ${Math.round(devWide)}px`);
  await page.setViewportSize({ width: 360, height: 800 });
}

// 5. family mode (local only)
const codeFile = join(PRIVATE, 'family-code.txt');
if (existsSync(codeFile)) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.entry');
  ok('family hidden before the code', await page.locator('.who-card:not(.who-new)').count() === 0);
  // the secret gesture: hold Siraj for four seconds -> the full-screen family page
  const sj = await page.locator('.entry-siraj').boundingBox();
  await page.mouse.move(sj.x + sj.width / 2, sj.y + sj.height / 2); await page.mouse.down(); await page.waitForTimeout(2800); await page.mouse.up();
  await page.waitForSelector('.gate .family-gate');
  const fieldTop = await page.locator('.gate .code').boundingBox();
  ok('family page opens by holding Siraj 2.5 s; the code field sits in the top half', fieldTop && fieldTop.y < page.viewportSize().height / 2, `field at ${Math.round(fieldTop?.y ?? -1)}px`);
  await page.locator('input.code').fill('wrong-code');
  await page.getByRole('button', { name: 'افتح' }).click();
  await page.waitForTimeout(2500);
  ok('wrong code is refused', await page.locator('.family-gate [role=status]').innerText().then(t => t.includes('ما اتطابق')).catch(() => false));
  // first time on this device: the activation word (typed without hamza, to check the normalising), then the
  // parents create and confirm their personal code
  const word = readFileSync(codeFile, 'utf8').trim().replace(/[أإآ]/g, 'ا');
  await page.locator('#fam-code').fill(word);
  await page.getByRole('button', { name: 'افتح' }).click();
  await page.waitForSelector('#fam-code2', { timeout: 15000 });
  await page.locator('#fam-code').fill('2468'); await page.locator('#fam-code2').fill('1357');
  await page.getByRole('button', { name: 'احفظ وادخل' }).click(); await page.waitForTimeout(600);
  const mismatch = await page.locator('.family-gate [role=status]').innerText().catch(() => '');
  await page.locator('#fam-code2').fill('2468');
  await page.getByRole('button', { name: 'احفظ وادخل' }).click();
  await page.waitForSelector('.who-card:not(.who-new)', { timeout: 15000 });
  ok('activation word (with or without hamza) -> the parents create + confirm a personal code', mismatch.includes('متطابقين'), mismatch);
  ok('family mode shows only the four children (no guests, no new-player card)', await page.locator('.who-new').count() === 0 && await page.locator('.who-card').count() === 4);
  await page.waitForTimeout(2500);
  const cards = await page.locator('.who-card:not(.who-new)').count();
  const imgs = await page.locator('.who-card:not(.who-new) img').evaluateAll(els => els.filter(e => e.complete && e.naturalWidth > 0).length);
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
  // opening the app again (a new window): family mode is closed until the personal code is entered
  const again = await page.context().newPage();
  await again.goto(base, { waitUntil: 'load' }); await again.waitForSelector('.entry'); await again.waitForTimeout(1500);
  const closed = await again.locator('.who-card:not(.who-new)').count() === 0;
  const sj2 = await again.locator('.entry-siraj').boundingBox();
  await again.mouse.move(sj2.x + sj2.width / 2, sj2.y + sj2.height / 2); await again.mouse.down(); await again.waitForTimeout(2800); await again.mouse.up();
  await again.waitForSelector('#fam-code');
  const asksPin = (await again.locator('label[for=fam-code]').innerText()).includes('الشخصي');
  await again.locator('#fam-code').fill('2468'); await again.getByRole('button', { name: 'افتح' }).click();
  const back = await again.waitForSelector('.who-card:not(.who-new)', { timeout: 15000 }).then(() => true).catch(() => false);
  ok('reopened app: family closed, asks the personal code directly, then shows the four', closed && asksPin && back && await again.locator('.who-card').count() === 4);
  const stored = await again.evaluate(() => JSON.stringify(localStorage));
  ok('neither the activation word, the personal code nor the open key is stored', !stored.includes(word) && !stored.includes('2468') && !stored.includes('familyKey'));
  // inside family mode the parents' corner becomes «بيتنا»: the sealed family picture and a card for each of the four
  await again.locator('[aria-label^="ركن الأهل"]').first().click();
  await again.waitForSelector('.our-kid', { timeout: 10000 }).catch(() => null); await again.waitForTimeout(1500);
  const homeTitle = await again.locator('.parents h1').innerText().catch(() => '');
  const kidCards = await again.locator('.our-kid').count();
  const banner = await again.locator('.our-banner img').evaluateAll(els => els.filter(e => e.complete && e.naturalWidth > 0).length);
  const homeOverflow = await again.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('family mode: the parents corner is «بيتنا» with the family picture and four children cards', homeTitle === 'بيتنا' && kidCards === 4 && banner === 1 && homeOverflow <= 0, `title ${homeTitle}, cards ${kidCards}, picture ${banner}, overflow ${homeOverflow}`);
  const warm = await again.evaluate(() => ({ card: getComputedStyle(document.querySelector('.our-kid')).backgroundColor, page: getComputedStyle(document.querySelector('.backdrop[data-home]') ?? document.body).backgroundImage }));
  ok('«بيتنا» uses the warm sand and gold palette (cream cards, sand page)', warm.card === 'rgb(250, 242, 225)' && warm.page.includes('247, 237, 218'), JSON.stringify(warm));
  await again.close();
  const ctx4 = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'ar' });
  await ctx4.addInitScript(lv => { if (!localStorage.getItem('khwarizmi.v1')) localStorage.setItem('khwarizmi.v1', JSON.stringify({ v: 2, players: [{ id: 'old1', name: 'لاعب قديم', age: 9, gender: 'b', progress: Object.fromEntries(lv.map(k => [k, 3])) }] })); }, levels);
  const p4 = await ctx4.newPage(); await p4.goto(base, { waitUntil: 'load' }); await p4.waitForSelector('.entry');
  const holdSiraj = async pg => { const b = await pg.locator('.entry-siraj').boundingBox(); await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await pg.mouse.down(); await pg.waitForTimeout(2800); await pg.mouse.up(); };
  await holdSiraj(p4); await p4.waitForSelector('#fam-code'); await p4.locator('#fam-code').fill(word); await p4.getByRole('button', { name: 'افتح' }).click();
  await p4.waitForSelector('#fam-code2', { timeout: 15000 }); await p4.locator('#fam-code').fill('2468'); await p4.locator('#fam-code2').fill('2468'); await p4.getByRole('button', { name: 'احفظ وادخل' }).click();
  await p4.waitForSelector('.who-card', { timeout: 15000 }); await p4.waitForTimeout(1200); await holdSiraj(p4);
  const linkable = await p4.waitForSelector('.legacy-link select', { timeout: 8000 }).then(() => true).catch(() => false);
  if (linkable) await p4.locator('.legacy-link select').selectOption({ index: 1 });
  const linkedMsg = await p4.locator('.legacy-link [role=status]').innerText().catch(() => '');
  ok('v2 progress is linked to a child only inside the unlocked family page', linkable && linkedMsg.includes('اتربط'), linkedMsg);
  await ctx4.close();
} else ok('family mode', true, 'skipped: no private code on this machine');

ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

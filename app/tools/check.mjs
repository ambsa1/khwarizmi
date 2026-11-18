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
await page.waitForTimeout(1600);
const after = await page.locator('.today-bar li.done').count();
ok('golden button lights a lamp (today bar)', before === 0 && after === 1, `${before} -> ${after}`);

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
    if (el.matches('canvas, div:has(> canvas), .window-line, .confetti, [aria-hidden="true"]') || el.querySelector('canvas')) continue;
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

// Short motion recordings of the real flow (guest mode only, so no family photos ever land in a video).
//   node tools/video.mjs [baseUrl] [outDir]
// Phone: who's playing -> three questions + picture -> today's journey -> two lamps light -> map -> travel.
// Laptop: the same journey screen, then the Kassala climb from the bank to the summit on the performance page.
import { mkdirSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const [base = 'http://127.0.0.1:5181/', out = '../docs/phase2/video'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pause = (p, ms) => p.waitForTimeout(ms);

async function record(name, size, mobile, script) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'ar', recordVideo: { dir: out, size } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.entry'); await pause(page, 2200);
  await script(page);
  const v = page.video();
  await ctx.close();
  renameSync(await v.path(), join(out, name));
  console.log('wrote', join(out, name));
}

await record('phone-journey-393x873.webm', { width: 393, height: 873 }, true, async p => {
  await p.getByRole('button', { name: 'ضيف جديد' }).click(); await pause(p, 1500);
  await p.getByRole('button', { name: 'بنت' }).click(); await pause(p, 1100);
  await p.locator('.age-ball').nth(5).click(); await pause(p, 1100);
  await p.locator('.terrace').nth(1).click(); await pause(p, 1100);
  await p.locator('.avatar-pick').nth(2).click(); await pause(p, 3500);
  await p.locator('.btn.go').click(); await pause(p, 3000);
  await p.locator('.btn.go').click(); await pause(p, 3000);
  await p.getByRole('button', { name: 'الخريطة' }).click(); await pause(p, 3000);
  await p.locator('.world-card', { hasText: 'الساقية' }).click(); await pause(p, 2400);
  await p.locator('.world-card', { hasText: 'كسلا' }).click(); await pause(p, 3000);
});

await record('laptop-journey-1366x768.webm', { width: 1366, height: 768 }, false, async p => {
  await p.getByRole('button', { name: 'ضيف جديد' }).click(); await pause(p, 1200);
  await p.getByRole('button', { name: 'ولد' }).click(); await pause(p, 900);
  await p.locator('.age-ball').nth(6).click(); await pause(p, 900);
  await p.locator('.terrace').nth(3).click(); await pause(p, 900);
  await p.locator('.avatar-pick').first().click(); await pause(p, 3000);
  for (let i = 0; i < 3; i++) { await p.locator('.btn.go').click(); await pause(p, 2600); }
  // drag the road upward to look ahead toward Totil, then let it settle
  const box = await p.locator('.path-window canvas').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await p.mouse.down(); await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.15, { steps: 40 }); await p.mouse.up();
  await pause(p, 3000);
  await p.goto(base + '?view=perf', { waitUntil: 'load' }); await pause(p, 2500);
  await p.getByRole('button', { name: 'البداية' }).click(); await pause(p, 2000);
  await p.getByRole('button', { name: 'القمّة' }).click(); await pause(p, 6000);
});

await browser.close();

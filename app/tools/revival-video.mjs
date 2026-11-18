// Records the revival mechanic on the performance page: from grey desert, lesson by lesson, to the green oasis.
//   node tools/revival-video.mjs [baseUrl] [outDir]      (guest data only)
import { mkdirSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const [base = 'http://127.0.0.1:5187/', out = '../docs/phase2/video'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, size, mobile, steps] of [['revival-laptop-1366x768.webm', { width: 1366, height: 768 }, false, 9], ['revival-phone-393x873.webm', { width: 393, height: 873 }, true, 7]]) {
  const ctx = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, locale: 'ar', recordVideo: { dir: out, size } });
  const page = await ctx.newPage();
  await page.goto(base + '?view=perf', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'البداية' }).click();
  await page.waitForTimeout(4000);
  for (let i = 0; i < steps; i++) { await page.getByRole('button', { name: 'ولّع لمبة' }).click(); await page.waitForTimeout(3200); }
  await page.getByRole('button', { name: 'القمّة' }).click();
  await page.waitForTimeout(9000);
  const v = page.video(); await ctx.close();
  renameSync(await v.path(), join(out, name)); console.log('wrote', name);
}
await browser.close();

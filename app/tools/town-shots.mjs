// Review shots of the drone-view world at fixed points along the street (guest mode, no family data).
//   node tools/town-shots.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const [base = 'http://127.0.0.1:5182/', out = '../docs/phase2/grey'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const SIZES = [['phone', 393, 873, true], ['laptop', 1366, 768, false]];
const STOPS = (process.env.STOPS || '0,5,14,24,30,37').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, width, height, mobile] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'ar' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  page.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  for (const m of STOPS) {
    await page.goto(`${base}?view=world&w=${process.env.W || 'kassala'}&m=${m}`, { waitUntil: 'load' });
    await page.waitForTimeout(+(process.env.WAIT || 4500));
    const s = await page.evaluate(() => window.__stats);
    await page.screenshot({ path: `${out}/${name}-m${String(m).padStart(2, '0')}.jpg`, quality: 85, type: 'jpeg' });
    console.log(name, 'm=' + m, `fps ${s.fps} calls ${s.calls} tris ${s.tris}`);
  }
  await ctx.close();
}
await browser.close();

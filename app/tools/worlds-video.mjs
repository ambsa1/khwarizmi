// One review video of the phase-4 worlds: for each world, the grey desert -> every station built in turn (revival and the
// celebration shot behind Siraj) -> the finale shot, then Siraj in that region's outfit.   (guest data only)
//   node tools/worlds-video.mjs [baseUrl] [outDir] [worlds]
import { mkdirSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const [base = 'http://127.0.0.1:5187/', out = '../docs/phase4/video', list = 'saqiya,mogran,suakin,meroe,marra'] = process.argv.slice(2);
const OUTFIT = { saqiya: 'nile', mogran: 'nile', suakin: 'east', meroe: 'nile', marra: 'nile' };
const STEP = { saqiya: 2600, mogran: 1700, suakin: 1800, meroe: 1400, marra: 1300 };
mkdirSync(out, { recursive: true });
const size = { width: 1366, height: 768 };
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: size, locale: 'ar', recordVideo: { dir: out, size } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
for (const w of list.split(',')) {
  // download the world first (outside the recording's main flow) so the tour starts at once
  await page.goto(`${base}?view=world&w=${w}&m=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__stats && window.__stats.tris > 1000, null, { timeout: 120000 }).catch(() => {});
  await page.goto(`${base}?view=tour&w=${w}&step=${STEP[w]}`, { waitUntil: 'load' });
  await page.waitForSelector('.tour-title');
  const total = +(await page.locator('.tour-title .num').innerText()).split('/')[1].trim();
  await page.waitForTimeout(3500 + total * STEP[w] + 10000);
  const s = await page.evaluate(() => window.__stats);
  console.log(w, `stations ${total}`, s ? `fps ${s.fps} calls ${s.calls} tris ${s.tris}` : '');
  await page.goto(`${base}?view=siraj&outfit=${OUTFIT[w]}&action=wave`, { waitUntil: 'load' });
  await page.addStyleTag({ content: '.screen button, .screen input, .screen label { visibility: hidden !important; }' });
  await page.waitForTimeout(2400);
  // a slow quarter turn to show the outfit from the side, then back to the front
  await page.mouse.move(683, 380); await page.mouse.down(); await page.mouse.move(803, 380, { steps: 30 }); await page.mouse.move(683, 380, { steps: 30 }); await page.mouse.up();
  await page.waitForTimeout(1600);
}
const v = page.video(); await ctx.close();
const name = 'worlds-review-1366x768.webm';
renameSync(await v.path(), join(out, name)); console.log('wrote', name);
await browser.close();

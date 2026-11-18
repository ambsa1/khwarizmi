// Pre-renders each world's live window to public/fallback/<world>.jpg for phones without WebGL2.
//   node tools/fallback.mjs [baseUrl]      (dev server must be running)
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fallback');
mkdirSync(OUT, { recursive: true });
const base = process.argv[2] || 'http://127.0.0.1:5180/';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
for (const [w, m] of [['kassala', 6], ['mogran', 0], ['meroe', 0], ['suakin', 0], ['marra', 0], ['saqiya', 2]]) {
  await page.goto(`${base}?view=world&w=${w}&m=${m}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT, `${w}.jpg`), type: 'jpeg', quality: 74 });
  console.log('wrote', w);
}
await browser.close();

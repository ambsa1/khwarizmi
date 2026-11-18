// Review shots of the redesigned screens (guest mode only - never family data).   node tools/ui-shots.mjs [base] [out]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const [base = 'http://127.0.0.1:5186/', out = '../docs/phase4/ui'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [n, w, h, mobile] of [['phone', 393, 873, true], ['laptop', 1366, 768, false]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'ar' })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  const shot = async name => { await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${n}-${name}.png` }); };
  await p.goto(base, { waitUntil: 'load' }); await p.waitForSelector('.entry'); await shot('1-entry-empty');
  await p.getByRole('button', { name: 'ضيف جديد' }).click(); await p.waitForSelector('.guest'); await shot('2-guest-gender');
  await p.getByRole('button', { name: 'ولد' }).click(); await shot('3-guest-age');
  await p.locator('.age-ball').nth(5).click(); await p.waitForSelector('.terrace'); await p.locator('.terrace').nth(2).click();
  await p.waitForSelector('.avatar-pick'); await p.locator('.avatar-pick').first().click(); await p.waitForSelector('.path', { timeout: 10000 });
  await p.waitForTimeout(5000); await shot('4-journey');
  await p.locator('.btn.go').click(); await p.waitForSelector('.lesson-steps li', { timeout: 8000 });
  const steps = await p.locator('.lesson-steps li').count();
  for (let k = 0; k < steps; k++) { await p.locator('.lesson .btn.go').click(); await p.waitForTimeout(700); }
  await p.waitForSelector('.path', { timeout: 10000 }); await p.waitForTimeout(2300); await p.screenshot({ path: `${out}/${n}-5-celebration.png` });
  await p.waitForTimeout(3000);
  await p.getByRole('button', { name: 'القائمة' }).first().click(); await shot('6-menu');
  await p.getByRole('button', { name: 'إعدادات الصوت والمؤثرات' }).click(); await shot('7-sound');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'الخريطة' }).first().click(); await p.waitForSelector('.map'); await p.waitForTimeout(2500); await shot('8-map');
  if (await p.locator('.world-card').nth(3).isVisible()) { await p.locator('.world-card').nth(3).click(); await shot('9-map-picked'); }
  await p.getByRole('button', { name: 'جوازي' }).first().click(); await p.waitForSelector('.stamps'); await shot('10-passport');
  await p.goto(base, { waitUntil: 'load' }); await p.waitForSelector('.entry'); await shot('11-entry-guest');
}
await b.close();

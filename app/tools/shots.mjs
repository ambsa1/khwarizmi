// Screenshots at target device viewports, plus 3D stats read from the running page.
//   node tools/shots.mjs <baseUrl> <outDir> [filter] [--only=path1,path2]
// Uses the Playwright already installed under ../v2/tests (Chromium + WebKit).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require('../../v2/tests/node_modules/playwright');

export const DEVICES = [
  { id: 'realme-360x800', w: 360, h: 800, dpr: 2, mobile: true, engine: 'chromium' },
  { id: 'redmi-393x873', w: 393, h: 873, dpr: 2.75, mobile: true, engine: 'chromium' },
  { id: 'vivo-360x780', w: 360, h: 780, dpr: 2, mobile: true, engine: 'chromium' },
  { id: 'huawei-nova7i-360x780', w: 360, h: 780, dpr: 3, mobile: true, engine: 'chromium' },
  { id: 'iphone13promax-428x926', w: 428, h: 926, dpr: 3, mobile: true, engine: 'webkit' },
  { id: 'phone-landscape-800x360', w: 800, h: 360, dpr: 2, mobile: true, engine: 'chromium' },
  { id: 'pavilion14-1366x768', w: 1366, h: 768, dpr: 1, mobile: false, engine: 'chromium' },
  { id: 'pavilion14-1920x1080', w: 1920, h: 1080, dpr: 1, mobile: false, engine: 'chromium' },
];

const [base = 'http://127.0.0.1:5180/', out = 'shots', filter = '', ...flags] = process.argv.slice(2);
const only = (flags.find(f => f.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const PAGES = only.length ? only.map(p => ({ id: p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''), path: p })) : [{ id: 'home', path: '' }];
mkdirSync(out, { recursive: true });

const browsers = {};
const launch = e => (browsers[e] ??= (e === 'webkit' ? webkit : chromium).launch({
  args: e === 'chromium' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] : [],
}));

const report = [];
for (const d of DEVICES.filter(d => !filter || d.id.includes(filter))) {
  let b;
  try { b = await launch(d.engine); } catch (e) { console.log(`${d.id}: SKIPPED, ${d.engine} would not start on this machine`); browsers[d.engine] = Promise.resolve(null); continue; }
  if (!b) continue;
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: d.engine === 'chromium' ? d.mobile : undefined, hasTouch: d.mobile, locale: 'ar' });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message || e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + p.path, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(+(process.env.SHOT_WAIT || 4000));
    const s = await page.evaluate(() => (window).__stats ? { ...(window).__stats } : null).catch(() => null);
    const file = join(out, `${p.id}__${d.id}.png`);
    await page.screenshot({ path: file });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    report.push({ page: p.id, device: d.id, stats: s, overflowX: overflow, errors });
    console.log(`${p.id} @ ${d.id}${s ? ` fps=${s.fps} calls=${s.calls} tris=${s.tris} dpr=${s.dpr} tier=${s.tier}` : ''}${overflow ? ' OVERFLOW-X' : ''}${errors.length ? ' ERRORS=' + errors.length + ' ' + errors[0].slice(0, 160) : ''}`);
    await page.close();
  }
  await ctx.close();
}
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
for (const b of Object.values(browsers)) { const x = await b.catch(() => null); if (x) await x.close(); }

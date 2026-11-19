// Step 1 of the heritage pattern tiles: render every ink icon (identity/icons/*.svg) to a square transparent PNG mask.
// Step 2 (tools/heritage-tiles.py) arranges the masks into seamless, embossed tiles: public/art/heritage/*.webp
// usage: node tools/heritage-render.mjs <outDir>
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const SRC = new URL('../../identity/icons/', import.meta.url);
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const S = 320;   // mask size: icons are drawn at about 150-225 px in the tiles (x1.5 for sharp phones)
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: S, height: S } });
for (const f of readdirSync(SRC).filter(f => f.endsWith('.svg'))) {
  const svg = readFileSync(new URL(f, SRC), 'utf8');
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const sw = Math.max(vb[2], vb[3]) / 150 * 0.9;   // the same thin outline on every icon so they share one weight
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${S}" height="${S}" fill="#000">
    <g stroke="#000" stroke-width="${sw.toFixed(1)}" stroke-linejoin="round">${inner}</g></svg></body></html>`);
  await pg.screenshot({ path: `${out}/${f.replace('.svg', '')}.png`, omitBackground: true });
}
await b.close();
console.log('ok');

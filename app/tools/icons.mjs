// App icons: Siraj's lantern head on warm gold. Writes public/icons/*.svg|png.   node tools/icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// pad = fraction of the canvas kept clear around the head (maskable icons need ~20% safe zone).
const svg = (pad = 0.1, round = true) => {
  const s = 512, k = 1 - pad * 2, o = s * pad;
  const T = (x, y) => `${o + x * k},${o + y * k}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#FFD36B"/><stop offset="1" stop-color="#FFB627"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF6D8"/><stop offset=".5" stop-color="#FFE08A" stop-opacity=".7"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient>
    <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24305A"/><stop offset="1" stop-color="#141B36"/></linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${round ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${o} ${o}) scale(${k})">
    <circle cx="256" cy="118" r="92" fill="url(#glow)"/>
    <rect x="236" y="54" width="40" height="16" rx="8" fill="#C7861A"/>
    <circle cx="256" cy="112" r="34" fill="#FFF3C4" stroke="#E2A43C" stroke-width="8"/>
    <rect x="206" y="146" width="100" height="22" rx="10" fill="#E2A43C"/>
    <ellipse cx="256" cy="290" rx="190" ry="150" fill="#FFF4DE"/>
    <ellipse cx="256" cy="300" rx="136" ry="104" fill="url(#scr)" stroke="#E2A43C" stroke-width="12"/>
    <path d="M196 292q24-34 48 0M268 292q24-34 48 0" fill="none" stroke="#FFE08A" stroke-width="18" stroke-linecap="round"/>
    <path d="M222 336q34 32 68 0" fill="none" stroke="#FFE08A" stroke-width="14" stroke-linecap="round"/>
    <ellipse cx="178" cy="340" rx="20" ry="11" fill="#FF8C78" opacity=".55"/><ellipse cx="334" cy="340" rx="20" ry="11" fill="#FF8C78" opacity=".55"/>
    <circle cx="60" cy="290" r="22" fill="#E2A43C"/><circle cx="452" cy="290" r="22" fill="#E2A43C"/>
  </g>
</svg>`;
};

writeFileSync(join(OUT, 'favicon.svg'), svg(0.04));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad, round] of [['icon-192.png', 192, 0.08, true], ['icon-512.png', 512, 0.08, true], ['icon-maskable-512.png', 512, 0.2, false], ['apple-touch-icon.png', 180, 0.1, false]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(pad, round).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.locator('svg').screenshot({ path: join(OUT, name), omitBackground: true });
  console.log('wrote', name);
}
await browser.close();

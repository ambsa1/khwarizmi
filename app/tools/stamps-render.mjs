// The six passport stamps (public/art/stamps/<world>.webp, 384x384, transparent outside the stamp).
// Each one is a rubber stamp in its world's colour: a double ring with a bead circle, a warm tinted face, the world's
// landmark in ink, a ribbon with three stars, and a faint ink texture (a real stamp never prints perfectly).
// Landmarks come from the project's heritage ink drawings (identity/icons); the Saqiya water wheel and Jebel Marra
// have no drawing there, so they are drawn here in the same line style. The app shows a stamp softly (faded, low
// colour) until the world is finished, then at full colour, turned a little like a real stamp.
// usage: node tools/stamps-render.mjs <pngDir>, then python tools/stamps-webp.py <pngDir>  (-> public/art/stamps/*.webp)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('../../v2/tests/node_modules/playwright');
const ICONS = new URL('../../identity/icons/', import.meta.url);
const out = process.argv[2] ?? new URL('../../identity/_build/stamps/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
mkdirSync(out, { recursive: true });

const SAQIYA = `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M30 168 58 54M170 168 142 54M50 84h100"/>
  <circle cx="100" cy="104" r="58"/><circle cx="100" cy="104" r="46" stroke-width="3"/><circle cx="100" cy="104" r="10" fill="currentColor"/>
  ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${100 + 10 * Math.cos(a)} ${104 + 10 * Math.sin(a)}L${100 + 46 * Math.cos(a)} ${104 + 46 * Math.sin(a)}"/>`; }).join('')}
  ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, x = 100 + 62 * Math.cos(a), y = 104 + 62 * Math.sin(a); return `<rect x="${x - 7}" y="${y - 9}" width="14" height="18" rx="5" fill="currentColor" stroke="none" transform="rotate(${a * 180 / Math.PI + 90} ${x} ${y})"/>`; }).join('')}
  <path d="M14 178c12-6 22-6 34 0s22 6 34 0 22-6 34 0 22 6 34 0 22-6 36 0" stroke-width="4"/><path d="M28 190c10-4 18-4 28 0s18 4 28 0 18-4 28 0 18 4 28 0 18-4 30 0" stroke-width="3"/>
</svg>`;
const MARRA = `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 170C36 154 50 108 72 80l12-8c6 9 26 9 32 0l12 8c22 28 36 74 66 90z"/>
  <path d="M84 72c4 8 28 8 32 0" stroke-width="4"/><ellipse cx="100" cy="77" rx="13" ry="3.5" fill="currentColor" stroke="none"/>
  <path d="M60 112l-10 22M70 104l-14 34M140 112l10 22M130 104l14 34" stroke-width="3"/>
  <path d="M104 96v46M112 98v42" stroke-width="3.5"/><path d="M96 146c8-5 20-5 26 0" stroke-width="3.5"/>
  <path d="M10 182c22-7 42-7 62 0s42 7 62 0 40-7 60-1" stroke-width="4"/>
  <circle cx="30" cy="160" r="10" fill="currentColor" stroke="none"/><path d="M30 162v12" stroke-width="3.5"/>
  <circle cx="172" cy="158" r="12" fill="currentColor" stroke="none"/><path d="M172 160v14" stroke-width="3.5"/>
  <path d="M34 42c6-8 18-8 22 0 6-4 14 0 12 8H30c-4-2-2-8 4-8zM144 32c6-8 18-8 22 0 6-4 14 0 12 8h-38c-4-2-2-8 4-8z" stroke-width="3.5"/>
</svg>`;
const icon = name => readFileSync(new URL(name + '.svg', ICONS), 'utf8');
// world: landmark, ink colour, face tint. Six distinct inks: brick red, purple, Nile blue, turquoise, gold, emerald.
const WORLDS = {
  kassala: { art: icon('kassala-mountain'), ink: '#A8432A', tint: '#F7E3DC' },
  saqiya: { art: SAQIYA, ink: '#5B3FA0', tint: '#ECE6F6' },
  mogran: { art: icon('blue-nile-bridge'), ink: '#1F4E8C', tint: '#E1EAF5' },
  suakin: { art: icon('suakin-gate'), ink: '#12807F', tint: '#DDF2F0' },
  meroe: { art: icon('meroe-pyramids'), ink: '#A87508', tint: '#FBEFD3' },
  marra: { art: MARRA, ink: '#18774A', tint: '#DDF0E5' },
};

const fit = svg => {
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number), sw = Math.max(vb[2], vb[3]) / 100;   // thicker ink
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  const traced = !/stroke="currentColor"/.test(svg.slice(0, svg.indexOf('>')));
  return `<svg viewBox="${vb.join(' ')}" x="106" y="104" width="300" height="236" preserveAspectRatio="xMidYMid meet"${traced ? '' : ' fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'}>`
    + (traced ? `<g fill="currentColor" stroke="currentColor" stroke-width="${sw.toFixed(1)}" stroke-linejoin="round">${inner}</g>` : inner) + '</svg>';
};
const star = (x, y, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`; } return d + 'Z'; };
const beads = Array.from({ length: 48 }, (_, i) => { const a = i * Math.PI / 24; return `<circle cx="${(256 + 222 * Math.cos(a)).toFixed(1)}" cy="${(256 + 222 * Math.sin(a)).toFixed(1)}" r="3.4"/>`; }).join('');

function stamp({ art, ink, tint }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="face" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#FFFBF3"/><stop offset="1" stop-color="${tint}" stop-opacity=".7"/></radialGradient>
    <!-- ink texture: tiny gaps where the stamp did not print -->
    <filter id="wear" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -14 9.5" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
  </defs>
  <circle cx="256" cy="256" r="240" fill="${tint}"/>
  <circle cx="256" cy="256" r="204" fill="url(#face)"/>
  <g filter="url(#wear)" color="${ink}" fill="${ink}">
    <circle cx="256" cy="256" r="240" fill="none" stroke="${ink}" stroke-width="12"/>
    <circle cx="256" cy="256" r="204" fill="none" stroke="${ink}" stroke-width="4"/>
    ${beads}
    <circle cx="256" cy="256" r="190" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/>
    <g style="color:${ink}">${fit(art)}</g>
    <path d="M118 352h276l-18 26 18 26H118l18-26z" fill="${ink}"/>
    <path d="${star(214, 378, 11)}${star(256, 378, 13)}${star(298, 378, 11)}" fill="#FFFBF3"/>
    <path d="${star(70, 256, 13)}${star(442, 256, 13)}"/>
  </g>
</svg>`;
}

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 512, height: 512 } });
for (const [id, w] of Object.entries(WORLDS)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent">${stamp(w)}</body></html>`);
  await pg.screenshot({ path: `${out}/${id}.png`, omitBackground: true });
}
await b.close();
console.log('ok', out);

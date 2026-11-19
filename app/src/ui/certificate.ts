// "Save the certificate as a picture": draws the certificate on a canvas (1600 x 1130, landscape) with the same parts
// as on screen: double gold frame with geometric corners, woven bands, the title, the child's photo, name and the
// praise line, the skills mastered with gold stars, the world's stamp, the date and Siraj's signature. Shared through
// the phone's share sheet when it can take files, otherwise downloaded as a PNG. Nothing leaves the device.
type Cert = { name: string; line: string; world: string; subject: string; skills: string[]; more: (n: number) => string; date: string; photo: string | null; stamp: string; ink: string; girl: boolean };

const W = 1600, H = 1130;
const INK = '#2B2118', GOLD = '#BA7C03', GOLD2 = '#FFB627', CREAM = '#FFFBF3';
const BAND = ['#D9643A', '#FFB627', '#3E9B4F', '#1F5FAD', '#1FA3A3'];

const load = (src: string) => new Promise<HTMLImageElement | null>(res => {
  const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
});

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(' '), lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > width && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

/** a woven band: zigzag triangles over a coloured strip, with a bead row */
function band(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#5B3B26'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#D9643A'; ctx.fillRect(x, y + 3, w, h * 0.45);
  ctx.fillStyle = GOLD2;
  for (let i = x; i < x + w; i += 24) { ctx.beginPath(); ctx.moveTo(i, y + 3); ctx.lineTo(i + 12, y + 3 + h * 0.45); ctx.lineTo(i + 24, y + 3); ctx.fill(); }
  ctx.fillStyle = '#3E9B4F'; ctx.fillRect(x, y + h * 0.55, w, h * 0.4);
  for (let i = x + 8, k = 0; i < x + w; i += 18, k++) { ctx.fillStyle = BAND[k % BAND.length] === '#3E9B4F' ? CREAM : BAND[k % BAND.length]; ctx.beginPath(); ctx.arc(i, y + h * 0.75, 4, 0, 7); ctx.fill(); }
}

/** a geometric corner: nested diamonds and a gold triangle fan */
function corner(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, ink: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(90, 0); ctx.lineTo(0, 90); ctx.fill();
  ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(64, 10); ctx.lineTo(10, 64); ctx.fill();
  for (const [d, c] of [[34, ink], [22, GOLD2], [11, CREAM]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(30, 30 - d / 2); ctx.lineTo(30 + d / 2, 30); ctx.lineTo(30, 30 + d / 2); ctx.lineTo(30 - d / 2, 30); ctx.fill(); }
  ctx.restore();
}

export async function saveCertificate(c: Cert) {
  await document.fonts?.ready;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!; ctx.direction = 'rtl';
  const [photo, stamp] = await Promise.all([c.photo ? load(c.photo) : Promise.resolve(null), load(c.stamp)]);
  // paper and the faint security waves
  const g = ctx.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H / 2, W * 0.7); g.addColorStop(0, CREAM); g.addColorStop(1, '#F6E7CC');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(201,150,60,.13)'; ctx.lineWidth = 1.2;
  for (let y = 120; y < H - 120; y += 22) { ctx.beginPath(); for (let x = 60; x <= W - 60; x += 10) ctx.lineTo(x, y + Math.sin(x / 38) * 7); ctx.stroke(); }
  // double gold frame, corners, woven bands
  ctx.strokeStyle = GOLD; ctx.lineWidth = 10; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.lineWidth = 3; ctx.strokeRect(52, 52, W - 104, H - 104);
  corner(ctx, 52, 52, 1, 1, c.ink); corner(ctx, W - 52, 52, -1, 1, c.ink); corner(ctx, 52, H - 52, 1, -1, c.ink); corner(ctx, W - 52, H - 52, -1, -1, c.ink);
  band(ctx, 160, 70, W - 320, 30); band(ctx, 160, H - 100, W - 320, 30);
  // the title
  ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.font = '700 30px Cairo, sans-serif'; ctx.fillText('رحلة خوارزمي', W / 2, 160);
  ctx.fillStyle = INK; ctx.font = '800 64px Cairo, sans-serif'; ctx.fillText('شهادة إنجاز وتفوّق', W / 2, 232);
  // the child (right half): photo, name, praise
  const px = 1135, py = 285, pw = 240, ph = 320;
  ctx.fillStyle = '#F7E2B9'; ctx.fillRect(px - 12, py - 12, pw + 24, ph + 24); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.strokeRect(px - 12, py - 12, pw + 24, ph + 24);
  if (photo) { const s = Math.max(pw / photo.width, ph / photo.height), w = photo.width * s, h = photo.height * s; ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.drawImage(photo, px + (pw - w) / 2, py + (ph - h) / 2, w, h); ctx.restore(); }
  ctx.fillStyle = INK; ctx.font = '800 54px Cairo, sans-serif'; ctx.fillText(c.name, px + pw / 2, py + ph + 80);
  ctx.font = '600 30px Cairo, sans-serif'; ctx.fillStyle = '#4A3A2A';
  wrap(ctx, c.line, 560).forEach((l, i) => ctx.fillText(l, px + pw / 2, py + ph + 132 + i * 44));
  // divider and the skills (left half)
  ctx.strokeStyle = 'rgba(186,124,3,.45)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(880, 290); ctx.lineTo(880, 860); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = '800 36px Cairo, sans-serif'; ctx.fillText(c.girl ? 'المهارات التي أتقنتها' : 'المهارات التي أتقنها', 820, 320);
  // two columns of up to ten skills each, then "and N more"
  ctx.font = '600 24px Cairo, sans-serif';
  const shown = c.skills.slice(0, 20);
  shown.forEach((s, i) => {
    const col = i < 10 ? 0 : 1, row = i % 10, x = 820 - col * 360, y = 372 + row * 44;
    ctx.fillStyle = GOLD2; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 5 : 12; ctx.lineTo(x - 12 + r * Math.cos(a), y - 9 + r * Math.sin(a)); } ctx.fill();
    ctx.fillStyle = INK;
    let t = s; while (ctx.measureText(t).width > 300 && t.length > 4) t = t.slice(0, -2);
    ctx.fillText(t === s ? s : t + '…', x - 32, y);
  });
  if (c.skills.length > shown.length) { ctx.fillStyle = '#6B5A48'; ctx.fillText(c.more(c.skills.length - shown.length), 820, 372 + 10 * 44); }
  // the foot: stamp, date, Siraj's signature
  if (stamp) { ctx.save(); ctx.translate(250, 930); ctx.rotate(-0.09); ctx.drawImage(stamp, -110, -110, 220, 220); ctx.restore(); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#6B5A48'; ctx.font = '600 26px Cairo, sans-serif'; ctx.fillText('تاريخ الإتمام', W / 2, 930);
  ctx.fillStyle = INK; ctx.font = '800 34px Cairo, sans-serif'; ctx.fillText(c.date, W / 2, 976);
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(1180, 930); ctx.bezierCurveTo(1210, 880, 1230, 960, 1260, 915); ctx.bezierCurveTo(1290, 870, 1300, 950, 1340, 910); ctx.bezierCurveTo(1370, 885, 1390, 935, 1440, 905); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1180, 950); ctx.lineTo(1440, 950); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = '700 28px Cairo, sans-serif'; ctx.fillText('المرشد سراج', 1310, 990);

  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `شهادة-${c.world}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'شهادة إنجاز وتفوّق' }); return; } catch { /* closed: fall back to download */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

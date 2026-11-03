/* رسومات الرياضيات (SVG بالكود): الأشكال، البيتزا، الساعة، العملات */
(function (root) {
  'use strict';
  const MATH = root.MATH = root.MATH || {};
  const O = '#262a4a';

  // لون أغمق للحواف
  function dark(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = 1 - (k || 0.3);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function poly(n, r, cx, cy, rot) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = (rot || -90) * Math.PI / 180 + i * 2 * Math.PI / n; p.push((cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)); }
    return 'M' + p.join(' L') + ' Z';
  }
  function starPath(cx, cy, R, r) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; p.push((cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1)); }
    return 'M' + p.join(' L') + ' Z';
  }
  const SH = {
    circle: () => '<circle cx="50" cy="50" r="42"/>',
    square: () => '<rect x="10" y="10" width="80" height="80" rx="5"/>',
    triangle: () => '<path d="M50 9 L93 87 L7 87 Z" stroke-linejoin="round"/>',
    rect: () => '<rect x="3" y="24" width="94" height="52" rx="5"/>',
    star: () => `<path d="${starPath(50, 54, 46, 19)}" stroke-linejoin="round"/>`,
    heart: () => '<path d="M50 88 C18 66 6 50 6 32 C6 18 17 9 29 9 C39 9 46 15 50 23 C54 15 61 9 71 9 C83 9 94 18 94 32 C94 50 82 66 50 88 Z"/>',
    diamond: () => '<path d="M50 4 L88 50 L50 96 L12 50 Z" stroke-linejoin="round"/>',
    pentagon: () => `<path d="${poly(5, 44, 50, 54)}" stroke-linejoin="round"/>`,
    hexagon: () => `<path d="${poly(6, 45, 50, 50, 0)}" stroke-linejoin="round"/>`,
  };
  const SIDES = { triangle: 3, square: 4, rect: 4, diamond: 4, pentagon: 5, hexagon: 6 };
  // شكل ملوّن (rot = دوران بالدرجات)
  function shape(kind, color, rot) {
    return `<svg class="mt-shape" viewBox="-4 -4 108 108" aria-hidden="true"><g fill="${color}" stroke="${dark(color)}" stroke-width="5" ${rot ? `transform="rotate(${rot} 50 50)"` : ''}>${SH[kind]()}</g>
      <ellipse cx="34" cy="30" rx="10" ry="6" fill="#fff" opacity=".35" ${rot ? `transform="rotate(${rot} 50 50)"` : ''}/></svg>`;
  }

  /* ---------- البيتزا: n قطع، eaten = مجموعة القطع المأكولة ---------- */
  let pid = 0;
  function pizza(n, eaten, opt) {
    opt = opt || {};
    const id = 'mtpz' + (++pid), R = 46, cx = 50, cy = 50;
    eaten = eaten || [];
    let s = '';
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const d = n === 1 ? `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} Z` : `M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${n === 1 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
      // حبات الطماطم والزيتون داخل القطعة
      const am = (a0 + a1) / 2, tops = [[0.62, 0], [0.36, -0.28], [0.36, 0.28]].map(([rr, da], k) => {
        const aa = am + da * (4 / n), x = cx + R * rr * Math.cos(aa), y = cy + R * rr * Math.sin(aa);
        return k === 0 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${n > 4 ? 4 : 5.5}" fill="#d63a2b"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#3a7a2e"/>`;
      }).join('');
      const off = opt.gap ? `transform="translate(${(Math.cos(am) * 2.2).toFixed(2)} ${(Math.sin(am) * 2.2).toFixed(2)})"` : '';
      s += `<g class="mt-slice ${eaten.includes(i) ? 'eaten' : ''}" data-s="${i}" ${off}><path d="${d}" fill="url(#${id})" stroke="#c9822c" stroke-width="3"/>${tops}</g>`;
    }
    return `<svg class="mt-pizza" viewBox="-4 -4 108 108" aria-hidden="true"><defs><radialGradient id="${id}"><stop offset=".78" stop-color="#ffd35c"/><stop offset=".86" stop-color="#ffbe4a"/><stop offset="1" stop-color="#e09a3b"/></radialGradient></defs>
      <circle cx="50" cy="50" r="49" fill="#fff" stroke="#e4ddcf" stroke-width="2"/><circle cx="50" cy="50" r="40" fill="none" stroke="#efe9de" stroke-width="2"/>${s}</svg>`;
  }

  /* ---------- الساعة ---------- */
  function clock(h, m) {
    const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    let nums = '';
    for (let i = 1; i <= 12; i++) { const a = (i * 30 - 90) * Math.PI / 180; nums += `<text x="${(50 + 36 * Math.cos(a)).toFixed(1)}" y="${(50 + 36 * Math.sin(a)).toFixed(1)}">${i}</text>`; }
    let ticks = '';
    for (let i = 0; i < 60; i += 5) ticks += `<line x1="50" y1="6" x2="50" y2="${i % 15 ? 9 : 11}" transform="rotate(${i * 6} 50 50)"/>`;
    return `<svg class="mt-clock" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#fff" stroke="${O}" stroke-width="4"/>
      <g stroke="#9aa3c2" stroke-width="1.6">${ticks}</g>
      <g class="mt-clock-n" fill="${O}" text-anchor="middle" dominant-baseline="central">${nums}</g>
      <line class="mt-hand-m" x1="50" y1="50" x2="50" y2="14" stroke="#3d8bff" stroke-width="3.2" stroke-linecap="round" transform="rotate(${ma} 50 50)"/>
      <line class="mt-hand-h" x1="50" y1="50" x2="50" y2="26" stroke="#f0533f" stroke-width="5" stroke-linecap="round" transform="rotate(${ha} 50 50)"/>
      <circle cx="50" cy="50" r="4" fill="${O}"/></svg>`;
  }

  /* ---------- العملات ---------- */
  const coin = v => `<span class="mt-coin c${v}"><b dir="ltr">${v}</b></span>`;

  /* ---------- صورة باب القسم (في شاشة اختيار القسم بالتطبيق) ---------- */
  const tile = (x, y, c, t, rot) => `<g transform="rotate(${rot} ${x + 20} ${y + 20})"><rect x="${x}" y="${y}" width="40" height="40" rx="10" fill="${c}" stroke="${O}" stroke-width="3"/>
    <rect x="${x + 5}" y="${y + 4}" width="30" height="8" rx="4" fill="#fff" opacity=".3"/><text x="${x + 20}" y="${y + 22}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="Baloo, sans-serif" font-weight="800" font-size="26">${t}</text></g>`;
  const door = () => `<svg class="mt-door" viewBox="0 0 100 112" aria-hidden="true">${tile(6, 8, '#3d8bff', '1', -8)}${tile(52, 4, '#22b573', '+', 6)}${tile(8, 58, '#ff9a2e', '2', 5)}${tile(54, 56, '#e8579a', '3', -6)}</svg>`;

  MATH.art = Object.assign(MATH.art || {}, { shape, SIDES, dark, pizza, clock, coin, door, SHAPES: Object.keys(SH) });
})(window);

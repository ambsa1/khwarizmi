/* قسم الإنجليزي: الصور. إيموجي (≤ 12 فقط) أو SVG مرسوم بالكود.
   EN.pic(item, opts) يرجّع HTML للصورة:
     '#rrggbb' = بقعة ألوان،  '#7' = رقم (ومعه نقاط العدّ لو opts.dots)،  '@siraj' = سراج،  غير كده إيموجي. */
(function (root) {
  'use strict';
  const EN = root.EN;

  // بقعة ألوان (مش دائرة إيموجي): شكل طلاء ناعم + لمعة
  // بقعة بـ ٩ فصوص ناعمة (منحنيات تربيعية بين نقاط داخلية، والتحكم على نصف قطر خارجي)
  const SPLAT = (() => {
    const N = 9, cx = 50, cy = 52, r0 = 33, r1 = 47, pt = (a, r) => (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    let d = 'M' + pt(0, r0);
    for (let i = 0; i < N; i++) { const a = (i / N) * 2 * Math.PI, b = ((i + 1) / N) * 2 * Math.PI, m = (a + b) / 2; d += ' Q' + pt(m, r1 + (i % 3) * 2) + ' ' + pt(b, r0); }
    return d + 'Z';
  })();
  function splat(c) {
    const white = /^#f{6}$/i.test(c);
    return `<svg class="en-splat" viewBox="0 0 100 100" aria-hidden="true"><path d="${SPLAT}" fill="${c}" stroke="${white ? '#b9b2a6' : 'rgba(0,0,0,.16)'}" stroke-width="${white ? 3 : 2}" stroke-linejoin="round"/>
      <circle cx="88" cy="18" r="5" fill="${c}" stroke="${white ? '#b9b2a6' : 'none'}" stroke-width="2"/><circle cx="12" cy="88" r="3.5" fill="${c}" stroke="${white ? '#b9b2a6' : 'none'}" stroke-width="2"/>
      <ellipse cx="38" cy="36" rx="10" ry="6" fill="#fff" opacity="${white ? 0 : 0.35}" transform="rotate(-30 38 36)"/></svg>`;
  }
  // نقاط العدّ: صفوف من ٥
  function dots(n, c) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<i style="background:${c}"></i>`;
    return `<span class="en-cnt" dir="ltr">${s}</span>`;
  }
  const NUMC = ['#e53935', '#1e7de0', '#2fa84f', '#ff8a00', '#8e3bd1', '#ff6fae', '#00a3a3', '#c0392b', '#3949ab', '#f4511e'];

  EN.pic = function (item, opts) {
    opts = opts || {};
    const p = item.pic || '';
    if (/^#[0-9a-f]{6}$/i.test(p)) return `<span class="en-pic en-pic-c">${splat(p)}</span>`;
    if (/^#\d+$/.test(p)) {
      const n = +p.slice(1), c = NUMC[(n - 1) % NUMC.length];
      return `<span class="en-pic en-pic-n"><b class="en-digit" dir="ltr" style="color:${c}">${n}</b>${opts.dots && n <= 10 ? dots(n, c) : ''}</span>`;
    }
    if (p === '@siraj') return `<span class="en-pic en-pic-s">${root.Siraj && root.Siraj.svg ? root.Siraj.svg('#3d8bff', { shadow: false }) : '🤖'}</span>`;
    return `<span class="en-pic en-pic-e${[...p.replace(/️/g, '')].length > 1 ? ' two' : ''}" dir="ltr">${p}</span>`;
  };

  /* أشكال للتلوين (لعبة "لوّن"): الجزء .fill يتلوّن */
  const S = 'stroke="#3a3550" stroke-width="3" stroke-linejoin="round"';
  EN.shapes = {
    balloon: `<svg viewBox="0 0 100 120"><path d="M50 98 Q46 108 52 118" fill="none" stroke="#3a3550" stroke-width="2"/><path class="fill" d="M50 6C28 6 16 24 16 44c0 24 20 44 34 52 14-8 34-28 34-52C84 24 72 6 50 6z" fill="#fff" ${S}/><path d="M44 96l6 6 6-6z" fill="#3a3550"/><ellipse cx="36" cy="30" rx="7" ry="12" fill="#fff" opacity=".55" transform="rotate(25 36 30)"/></svg>`,
    fish: `<svg viewBox="0 0 120 90"><path class="fill" d="M8 45 L30 22 L30 68 Z" fill="#fff" ${S}/><path class="fill" d="M28 45c10-24 34-34 56-30 20 4 30 18 30 30s-10 26-30 30c-22 4-46-6-56-30z" fill="#fff" ${S}/><circle cx="92" cy="40" r="5" fill="#3a3550"/><path d="M60 30q-8 15 0 30" fill="none" stroke="#3a3550" stroke-width="2.5" opacity=".5"/></svg>`,
    star: `<svg viewBox="0 0 100 100"><path class="fill" d="M50 6l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 37l30-4z" fill="#fff" ${S}/><circle cx="40" cy="48" r="3.5" fill="#3a3550"/><circle cx="60" cy="48" r="3.5" fill="#3a3550"/><path d="M42 60q8 7 16 0" fill="none" stroke="#3a3550" stroke-width="3" stroke-linecap="round"/></svg>`,
    car: `<svg viewBox="0 0 130 90"><path class="fill" d="M10 60V44c0-6 4-9 10-10l18-3 14-16c3-3 6-4 10-4h26c5 0 9 2 12 6l12 16c8 1 14 6 14 13v14z" fill="#fff" ${S}/><path d="M50 30l10-12h20v12zM86 30V18h4l9 12z" fill="#cfe9ff" ${S}/><circle cx="36" cy="64" r="12" fill="#3a3550"/><circle cx="36" cy="64" r="5" fill="#ddd"/><circle cx="98" cy="64" r="12" fill="#3a3550"/><circle cx="98" cy="64" r="5" fill="#ddd"/></svg>`,
    heart: `<svg viewBox="0 0 100 92"><path class="fill" d="M50 86C24 66 6 50 6 30 6 16 17 6 30 6c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 20-18 36-44 56z" fill="#fff" ${S}/><ellipse cx="28" cy="26" rx="6" ry="10" fill="#fff" opacity=".55" transform="rotate(-30 28 26)"/></svg>`,
    flower: `<svg viewBox="0 0 100 120"><path d="M50 60v56" stroke="#2fa84f" stroke-width="6"/><path d="M50 98q-20-14-30-4 12 12 30 4z" fill="#2fa84f"/>${[0, 72, 144, 216, 288].map(r => `<ellipse class="fill" cx="50" cy="26" rx="14" ry="20" fill="#fff" ${S} transform="rotate(${r} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="13" fill="#ffd21f" ${S}/></svg>`,
  };

  /* ---------- صورة باب القسم (في شاشة اختيار القسم بالتطبيق): فقاعة كلام فيها ABC، وفقاعة صغيرة Hi ---------- */
  const O = '#262a4a';
  const door = () => `<svg class="en-door" viewBox="0 0 100 112" direction="ltr" style="direction:ltr" aria-hidden="true">
    <g transform="rotate(-6 50 50)"><path d="M10 22q0-12 12-12h56q12 0 12 12v34q0 12-12 12H40l-16 14 3-14h-5q-12 0-12-12z" fill="#fff" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="17" y="15" width="66" height="9" rx="4.5" fill="#e8f1ff"/>
      <g font-family="Baloo, sans-serif" font-weight="800" font-size="27" text-anchor="middle" dominant-baseline="central" stroke="${O}" stroke-width="1.6" paint-order="stroke">
        <text x="30" y="42" fill="#f0533f">A</text><text x="50" y="40" fill="#3d8bff">B</text><text x="70" y="42" fill="#16a865">C</text></g></g>
    <g transform="rotate(7 70 90)"><path d="M54 82q0-9 9-9h24q9 0 9 9v10q0 9-9 9h-6l4 8-12-8h-10q-9 0-9-9z" fill="#ffd23e" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
      <text x="75" y="88" text-anchor="middle" dominant-baseline="central" font-family="Baloo, sans-serif" font-weight="800" font-size="17" fill="${O}">Hi!</text></g></svg>`;
  EN.art = Object.assign(EN.art || {}, { door });
})(window);

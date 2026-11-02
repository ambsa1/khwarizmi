/* رسومات عالم الكمبيوتر (SVG مرسوم بالكود): أجزاء الكمبيوتر والأجهزة */
(function (root) {
  'use strict';
  const CW = root.CW = root.CW || {};
  const O = '#262a4a'; // لون الحواف
  let n = 0;
  const svg = (vb, body, cls) => `<svg class="cw-svg ${cls || ''}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

  // محتوى الشاشة: مطفأة، أو سراج ينوّر، أو ألوان
  function screenFill(state, x, y, w, h) {
    if (state === 'on') {
      const id = 'cwscr' + (++n);
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ab0ff"/><stop offset="1" stop-color="#7b4fe0"/></linearGradient></defs>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#${id})"/>
        <circle cx="${x + w / 2}" cy="${y + h * 0.45}" r="${h * 0.22}" fill="#ffd23e" stroke="#f0a500" stroke-width="2"/>
        <rect x="${x + w * 0.3}" y="${y + h * 0.78}" width="${w * 0.4}" height="${h * 0.08}" rx="2" fill="#fff" opacity=".8"/>`;
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#141834"/>
      <path d="M${x + 4} ${y + h - 6} L${x + w * 0.45} ${y + 4}" stroke="#fff" stroke-opacity=".09" stroke-width="${w * 0.12}"/>`;
  }

  const A = {
    monitor: (s) => svg('0 0 100 92', `
      <rect x="4" y="4" width="92" height="64" rx="8" fill="#3a3f66" stroke="${O}" stroke-width="3"/>
      <g class="cw-scr">${screenFill(s, 10, 10, 80, 50)}</g>
      <circle cx="50" cy="64" r="1.6" fill="#8a93c8"/>
      <path d="M43 68 L41 81 H59 L57 68 Z" fill="#a7b0c8" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="26" y="80" width="48" height="8" rx="4" fill="#c4cbe0" stroke="${O}" stroke-width="2.5"/>`),
    keyboard: () => {
      let k = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) k += `<rect x="${9 + c * 10.4 + (r === 1 ? 2.5 : r === 2 ? 5 : 0)}" y="${9 + r * 9}" width="8" height="7" rx="1.8" fill="#fff" stroke="#b8bfd6" stroke-width=".8"/>`;
      return svg('0 0 120 50', `<rect x="3" y="3" width="114" height="44" rx="7" fill="#dfe4f2" stroke="${O}" stroke-width="3"/>${k}
        <rect x="32" y="37" width="56" height="6" rx="2" fill="#fff" stroke="#b8bfd6" stroke-width=".8"/>`);
    },
    mouse: () => svg('0 0 60 92', `
      <path d="M30 4 C30 14 46 10 44 24" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="10" y="22" width="40" height="64" rx="20" fill="#eef1fa" stroke="${O}" stroke-width="3"/>
      <path d="M30 22 V48 M10 46 Q30 52 50 46" fill="none" stroke="#9aa3c2" stroke-width="2"/>
      <rect x="26.5" y="30" width="7" height="12" rx="3.5" fill="#3d8bff" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="20" cy="66" rx="4" ry="10" fill="#fff" opacity=".7"/>`),
    tower: (on) => svg('0 0 60 100', `
      <rect x="6" y="4" width="48" height="92" rx="7" fill="#4b5287" stroke="${O}" stroke-width="3"/>
      <rect x="12" y="12" width="36" height="7" rx="2" fill="#2f345c"/><rect x="12" y="23" width="36" height="7" rx="2" fill="#2f345c"/>
      ${[0, 1, 2, 3, 4].map(i => `<rect x="14" y="${48 + i * 6}" width="32" height="2.5" rx="1" fill="#2f345c"/>`).join('')}
      <circle class="cw-pwr" cx="30" cy="38" r="5.5" fill="${on ? '#3ee08a' : '#c4cbe0'}" stroke="${O}" stroke-width="2"/>
      <path d="M30 35 V38.5 M27.4 36.4 A3.4 3.4 0 1 0 32.6 36.4" fill="none" stroke="${O}" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="44" cy="88" r="2" fill="${on ? '#3ee08a' : '#7d86a0'}"/>`),
    speaker: () => svg('0 0 50 80', `
      <rect x="5" y="4" width="40" height="72" rx="8" fill="#353a63" stroke="${O}" stroke-width="3"/>
      <circle cx="25" cy="22" r="8" fill="#1d2140" stroke="#8a93c8" stroke-width="2"/><circle cx="25" cy="22" r="3" fill="#8a93c8"/>
      <circle cx="25" cy="52" r="14" fill="#1d2140" stroke="#8a93c8" stroke-width="2.5"/><circle cx="25" cy="52" r="5" fill="#8a93c8"/>`),
    camera: () => svg('0 0 70 56', `
      <rect x="8" y="6" width="54" height="34" rx="17" fill="#3a3f66" stroke="${O}" stroke-width="3"/>
      <circle cx="35" cy="23" r="11" fill="#141834" stroke="#8a93c8" stroke-width="2.5"/><circle cx="35" cy="23" r="4.5" fill="#3d8bff"/>
      <circle cx="32" cy="20" r="1.8" fill="#fff"/><circle cx="53" cy="17" r="2.3" fill="#3ee08a"/>
      <path d="M27 40 L24 50 H46 L43 40" fill="#a7b0c8" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>`),
    printer: () => svg('0 0 100 84', `
      <rect x="24" y="4" width="52" height="26" rx="2" fill="#fff" stroke="${O}" stroke-width="2.5"/>
      <rect x="6" y="26" width="88" height="38" rx="9" fill="#dfe4f2" stroke="${O}" stroke-width="3"/>
      <rect x="20" y="52" width="60" height="6" rx="3" fill="#262a4a"/>
      <circle cx="80" cy="38" r="3" fill="#3ee08a"/><circle cx="70" cy="38" r="3" fill="#ffc531"/>
      <rect x="26" y="58" width="48" height="22" fill="#fff" stroke="${O}" stroke-width="2.5"/>
      <path d="M32 66 H68 M32 72 H58" stroke="#9aa3c2" stroke-width="2.5" stroke-linecap="round"/>`),
    mic: () => svg('0 0 50 92', `
      <rect x="14" y="4" width="22" height="42" rx="11" fill="#c4cbe0" stroke="${O}" stroke-width="3"/>
      <path d="M17 18 H33 M17 26 H33 M17 34 H33" stroke="#8a93c8" stroke-width="2"/>
      <path d="M8 34 Q8 58 25 58 Q42 58 42 34" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <path d="M25 58 V78 M12 82 H38" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>`),
    headphones: () => svg('0 0 90 80', `
      <path d="M14 52 Q14 8 45 8 Q76 8 76 52" fill="none" stroke="#3a3f66" stroke-width="8" stroke-linecap="round"/>
      <rect x="6" y="44" width="20" height="30" rx="9" fill="#e8579a" stroke="${O}" stroke-width="3"/>
      <rect x="64" y="44" width="20" height="30" rx="9" fill="#e8579a" stroke="${O}" stroke-width="3"/>`),
    laptop: (s) => svg('0 0 120 84', `
      <rect x="18" y="6" width="84" height="56" rx="6" fill="#3a3f66" stroke="${O}" stroke-width="3"/>
      ${screenFill(s, 24, 12, 72, 44)}
      <path d="M6 66 H114 L108 78 H12 Z" fill="#c4cbe0" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="48" y="66" width="24" height="4" rx="2" fill="#9aa3c2"/>`),
    phone: (s) => svg('0 0 52 92', `
      <rect x="4" y="4" width="44" height="84" rx="9" fill="#262a4a" stroke="${O}" stroke-width="3"/>
      ${screenFill(s || 'on', 8, 12, 36, 66)}
      <rect x="20" y="7" width="12" height="2.5" rx="1.2" fill="#5d6191"/>`),
    tablet: (s) => svg('0 0 84 104', `
      <rect x="4" y="4" width="76" height="96" rx="10" fill="#e8ebf5" stroke="${O}" stroke-width="3"/>
      ${screenFill(s || 'on', 10, 10, 64, 80)}<circle cx="42" cy="95" r="2.5" fill="#9aa3c2"/>`),
    watch: () => svg('0 0 56 96', `
      <rect x="15" y="2" width="26" height="24" rx="5" fill="#e8579a" stroke="${O}" stroke-width="2.5"/>
      <rect x="15" y="70" width="26" height="24" rx="5" fill="#e8579a" stroke="${O}" stroke-width="2.5"/>
      <rect x="6" y="22" width="44" height="52" rx="12" fill="#262a4a" stroke="${O}" stroke-width="3"/>
      <rect x="11" y="27" width="34" height="42" rx="8" fill="#141834"/>
      <text x="28" y="54" text-anchor="middle" font-size="15" font-weight="800" fill="#7cff8a" font-family="Baloo, sans-serif">10:30</text>`),
    chip: () => {
      let pins = '';
      for (let i = 0; i < 5; i++) {
        const p = 22 + i * 9;
        pins += `<rect x="${p}" y="4" width="4" height="10" rx="1" fill="#c9a227"/><rect x="${p}" y="66" width="4" height="10" rx="1" fill="#c9a227"/>`;
        pins += `<rect x="4" y="${p}" width="10" height="4" rx="1" fill="#c9a227"/><rect x="66" y="${p}" width="10" height="4" rx="1" fill="#c9a227"/>`;
      }
      return svg('0 0 80 80', `${pins}<rect x="12" y="12" width="56" height="56" rx="8" fill="#2f345c" stroke="${O}" stroke-width="3"/>
        <rect x="24" y="24" width="32" height="32" rx="5" fill="#4b5287" stroke="#8a93c8" stroke-width="2"/>
        <path d="M33 40 H47 M40 33 V47" stroke="#ffd23e" stroke-width="3" stroke-linecap="round"/>`);
    },
    // جهاز الصراف الآلي
    atm: () => svg('0 0 80 100', `
      <rect x="8" y="4" width="64" height="92" rx="8" fill="#16a865" stroke="${O}" stroke-width="3"/>
      <rect x="16" y="14" width="48" height="30" rx="4" fill="#141834"/><rect x="22" y="22" width="36" height="5" rx="2" fill="#7cff8a"/>
      ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${22 + c * 13}" y="${52 + r * 9}" width="10" height="6" rx="2" fill="#e5f8ee"/>`).join('')).join('')}
      <rect x="20" y="84" width="40" height="4" rx="2" fill="#0d5c34"/>`),
  };
  CW.art = Object.assign(CW.art || {}, A);
})(window);

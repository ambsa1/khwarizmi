/* رسومات عمران: كلها مرسومة بالكود عشان اللعبة تبقى خفيفة */
(function (root) {
  'use strict';

  // منيب من فوق، ووجهه (السهم البرتقالي) لفوق. اللعبة تلفّه حسب اتجاهه
  const robotTop = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="9" y="40" width="13" height="34" rx="5" fill="#3b3f4a"/><rect x="78" y="40" width="13" height="34" rx="5" fill="#3b3f4a"/>
    <circle cx="50" cy="56" r="33" fill="#4f8ef0" stroke="#2a5bb8" stroke-width="4"/>
    <circle cx="38" cy="38" r="9" fill="#fff"/><circle cx="62" cy="38" r="9" fill="#fff"/>
    <circle cx="38" cy="35" r="4.5" fill="#1d2433"/><circle cx="62" cy="35" r="4.5" fill="#1d2433"/>
    <circle cx="50" cy="64" r="8" fill="#ffd34d" stroke="#e0a91f" stroke-width="3"/>
    <path d="M50 4 L60 18 L40 18 Z" fill="#ff8a3d"/></svg>`;

  // منيب من الأمام، للحوارات
  function munib(mood) {
    const mouth = {
      happy: '<path d="M47 62 Q60 72 73 62" stroke="#1d2433" stroke-width="4" fill="none" stroke-linecap="round"/>',
      sad: '<path d="M48 68 Q60 60 72 68" stroke="#1d2433" stroke-width="4" fill="none" stroke-linecap="round"/>',
      sleepy: '<path d="M52 66 H68" stroke="#1d2433" stroke-width="4" stroke-linecap="round"/>',
      wow: '<circle cx="60" cy="65" r="5" fill="#1d2433"/>',
    }[mood || 'happy'];
    const eyes = mood === 'sleepy'
      ? '<path d="M39 50 Q46 55 53 50 M67 50 Q74 55 81 50" stroke="#1d2433" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<circle cx="46" cy="50" r="7" fill="#1d2433"/><circle cx="74" cy="50" r="7" fill="#1d2433"/><circle cx="48.5" cy="47.5" r="2.4" fill="#fff"/><circle cx="76.5" cy="47.5" r="2.4" fill="#fff"/>';
    return `<svg viewBox="0 0 120 120" aria-hidden="true">
      <line x1="60" y1="10" x2="60" y2="24" stroke="#2a5bb8" stroke-width="4"/><circle cx="60" cy="9" r="6" fill="#ffd34d"/>
      <rect x="34" y="88" width="52" height="26" rx="10" fill="#4f8ef0" stroke="#2a5bb8" stroke-width="4"/>
      <circle cx="60" cy="101" r="5" fill="#ffd34d"/>
      <rect x="16" y="22" width="88" height="68" rx="24" fill="#4f8ef0" stroke="#2a5bb8" stroke-width="4"/>
      <rect x="27" y="33" width="66" height="44" rx="15" fill="#e9f3ff"/>
      <circle cx="35" cy="66" r="4" fill="#ffb3b3" opacity=".8"/><circle cx="85" cy="66" r="4" fill="#ffb3b3" opacity=".8"/>
      ${eyes}${mouth}</svg>`;
  }

  const palm = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M47 48 Q44 74 42 95 L58 95 Q55 74 53 48Z" fill="#8a5a2b"/>
    <g fill="#3f9a4a" stroke="#2f7a38" stroke-width="2">
      <path d="M50 46 Q28 24 4 40 Q30 36 50 46Z"/><path d="M50 46 Q72 24 96 40 Q70 36 50 46Z"/>
      <path d="M50 46 Q34 12 14 12 Q38 22 50 46Z"/><path d="M50 46 Q66 12 86 12 Q62 22 50 46Z"/>
      <path d="M50 46 Q46 18 50 4 Q56 18 50 46Z"/></g>
    <circle cx="45" cy="50" r="4.5" fill="#7a3e12"/><circle cx="55" cy="51" r="4.5" fill="#7a3e12"/></svg>`;

  const crate = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M22 30 Q22 18 50 18 Q78 18 78 30 L84 84 Q84 92 50 92 Q16 92 16 84Z" fill="#c9773f" stroke="#8d4f22" stroke-width="4"/>
    <path d="M20 48 Q50 56 80 48 M18 68 Q50 76 82 68" stroke="#8d4f22" stroke-width="4" fill="none"/>
    <ellipse cx="50" cy="22" rx="20" ry="6" fill="#6e3a17"/></svg>`;

  const rock = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M10 84 Q8 52 30 38 Q50 18 72 32 Q94 44 90 84 Z" fill="#a39b8f" stroke="#6f685e" stroke-width="4"/>
    <path d="M32 54 Q44 46 54 54 M60 66 Q68 62 76 66" stroke="#cdc6ba" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M14 86 Q20 70 24 86 M80 86 Q84 66 90 86" stroke="#4f8a2f" stroke-width="4" fill="none"/></svg>`;

  const dates = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 12 Q53 26 49 38" stroke="#4f8a2f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="37" cy="55" rx="13" ry="19" fill="#9b5523" transform="rotate(-18 37 55)"/>
    <ellipse cx="63" cy="55" rx="13" ry="19" fill="#8b4513" transform="rotate(18 63 55)"/>
    <ellipse cx="50" cy="70" rx="13" ry="19" fill="#7a3a10"/>
    <ellipse cx="45" cy="64" rx="3.5" ry="7" fill="#fff" opacity=".3"/></svg>`;

  const door = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M10 46 L50 12 L90 46 Z" fill="#d9663b"/>
    <rect x="19" y="44" width="62" height="48" fill="#f6e7cc" stroke="#c9b28a" stroke-width="3"/>
    <path d="M37 92 V64 Q50 50 63 64 V92 Z" fill="#2f7fb5"/><circle cx="58" cy="77" r="3" fill="#ffd34d"/></svg>`;

  const waves = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M8 38 Q20 28 32 38 T56 38 T80 38" stroke="#d6eefc" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M20 66 Q32 56 44 66 T68 66 T92 66" stroke="#d6eefc" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;

  const star = (on) => `<svg viewBox="0 0 24 24" class="star ${on ? 'on' : ''}" aria-hidden="true"><path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>`;

  const boat = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 14 V62" stroke="#6b4a2b" stroke-width="5"/>
    <path d="M53 18 L82 58 L53 58 Z" fill="#fff6e0" stroke="#d9c49a" stroke-width="3"/>
    <path d="M47 26 L24 58 L47 58 Z" fill="#f2b632"/>
    <path d="M10 64 H90 L78 84 Q50 92 22 84 Z" fill="#b5652f" stroke="#7a3e12" stroke-width="4"/>
    <path d="M16 92 Q28 86 40 92 T64 92 T88 92" stroke="#2f7fb5" stroke-width="4" fill="none"/></svg>`;

  // أيقونات بطاقات الشروط، عشان الطفل اللي ما بيقرأ يفرّق بينها
  const ask = inner => `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" opacity=".9"/>
    <g transform="translate(14 18) scale(.72)">${inner}</g>
    <text x="76" y="34" font-size="34" font-weight="900" fill="#d0533f" font-family="Arial">?</text></svg>`;
  const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const WALLS = { hosh: palm, souq: crate, nile: rock };
  const GOALS = { hosh: door, souq: door, nile: boat };

  root.Art = {
    robotTop, munib, palm, crate, rock, dates, door, boat, waves, star, WALLS, GOALS,
    askDates: ask(inner(dates)), askWall: ask(inner(rock)), askGoal: ask(inner(boat)),
  };
})(window);

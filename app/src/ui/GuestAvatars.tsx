// Eight illustrated Sudanese children for guest mode, drawn in code (vector, crisp at any size, ~1 KB each).
// Warm brown skin tones, varied hair, one girl with a tarha (headscarf), one boy in a white jalabiya collar.

type Look = {
  id: string; gender: 'm' | 'f'; skin: string; skinShade: string; hair: string; hairStyle: 'curly' | 'short' | 'puffs' | 'braids' | 'tarha' | 'fade' | 'bun';
  bg: string; shirt: string; collar?: 'jalabiya' | 'round' | 'school'; scarf?: string;
};

export const GUEST_AVATARS: Look[] = [
  { id: 'g1', gender: 'm', skin: '#8D5A3B', skinShade: '#74472C', hair: '#1E1512', hairStyle: 'curly', bg: '#BFE0F2', shirt: '#2F7FD8', collar: 'round' },
  { id: 'g2', gender: 'm', skin: '#6E432B', skinShade: '#58331F', hair: '#16100D', hairStyle: 'fade', bg: '#FFE3A8', shirt: '#FFFFFF', collar: 'jalabiya' },
  { id: 'g3', gender: 'm', skin: '#A06A45', skinShade: '#86553A', hair: '#2A1C15', hairStyle: 'short', bg: '#CFEBD3', shirt: '#1F9D61', collar: 'school' },
  { id: 'g4', gender: 'm', skin: '#7A4A30', skinShade: '#633A24', hair: '#1A120E', hairStyle: 'curly', bg: '#F9D3C2', shirt: '#E8892B', collar: 'round' },
  { id: 'g5', gender: 'f', skin: '#8D5A3B', skinShade: '#74472C', hair: '#1E1512', hairStyle: 'puffs', bg: '#F8D1E2', shirt: '#D9558F', collar: 'round' },
  { id: 'g6', gender: 'f', skin: '#A06A45', skinShade: '#86553A', hair: '#2A1C15', hairStyle: 'tarha', bg: '#DCD3F3', shirt: '#7B61C9', scarf: '#F3B9CF' },
  { id: 'g7', gender: 'f', skin: '#6E432B', skinShade: '#58331F', hair: '#16100D', hairStyle: 'braids', bg: '#FFE3A8', shirt: '#FFB627', collar: 'school' },
  { id: 'g8', gender: 'f', skin: '#7A4A30', skinShade: '#633A24', hair: '#1A120E', hairStyle: 'bun', bg: '#BFE0F2', shirt: '#1F5FAD', collar: 'round' },
];

function Hair({ l }: { l: Look }) {
  const h = l.hair;
  switch (l.hairStyle) {
    case 'curly':
      return <g fill={h}>{[[34, 30], [42, 24], [52, 21], [62, 22], [70, 27], [76, 35], [28, 39], [80, 44], [46, 30], [58, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} />)}</g>;
    case 'fade':
      return <path d="M27 50c-2-17 9-29 25-29s27 12 25 29c-3-8-9-12-25-12s-22 4-25 12z" fill={h} />;
    case 'short':
      return <path d="M26 48c-1-16 10-27 26-27 14 0 25 9 26 23-6-6-14-9-26-9-11 0-19 5-26 13z" fill={h} />;
    case 'puffs':
      return <g fill={h}><circle cx="24" cy="30" r="12" /><circle cx="80" cy="30" r="12" /><path d="M28 48c-1-15 10-26 24-26s25 11 24 26c-5-8-13-12-24-12s-19 4-24 12z" /></g>;
    case 'braids':
      return <g fill={h}><path d="M27 50c-2-17 9-29 25-29s27 12 25 29c-4-9-12-13-25-13s-21 4-25 13z" />
        {[0, 1, 2].map(i => <circle key={'l' + i} cx={24} cy={56 + i * 9} r={5} />)}{[0, 1, 2].map(i => <circle key={'r' + i} cx={80} cy={56 + i * 9} r={5} />)}</g>;
    case 'bun':
      return <g fill={h}><circle cx="52" cy="17" r="10" /><path d="M27 50c-2-17 9-29 25-29s27 12 25 29c-4-9-12-13-25-13s-21 4-25 13z" /></g>;
    case 'tarha':
      return <path d="M18 104c0-34 4-52 10-62 6-12 14-19 24-19s18 7 24 19c6 10 10 28 10 62z" fill={l.scarf} />;
  }
}

export function GuestAvatar({ id, size = 112 }: { id: string; size?: number }) {
  const l = GUEST_AVATARS.find(a => a.id === id) ?? GUEST_AVATARS[0];
  const uid = 'ga-' + l.id;
  return (
    <svg width={size} height={size} viewBox="0 0 104 104" role="img" aria-label={l.gender === 'f' ? 'صورة بنت' : 'صورة ولد'}>
      <defs>
        <radialGradient id={uid + '-bg'} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id={uid + '-face'} cx="42%" cy="38%" r="65%"><stop offset="0" stopColor={l.skin} /><stop offset="1" stopColor={l.skinShade} /></radialGradient>
        <clipPath id={uid + '-c'}><circle cx="52" cy="52" r="52" /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect width="104" height="104" fill={l.bg} />
        <rect width="104" height="104" fill={`url(#${uid}-bg)`} />
        {l.hairStyle === 'tarha' && <Hair l={l} />}
        {/* shoulders */}
        <path d="M14 104c2-18 18-26 38-26s36 8 38 26z" fill={l.shirt} />
        {l.collar === 'jalabiya' && <path d="M44 79l8 12 8-12" stroke="#E2DACB" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {l.collar === 'school' && <path d="M40 78l12 9 12-9" fill="#FFFFFF" />}
        {l.collar === 'round' && <path d="M42 79c5 5 15 5 20 0" stroke="rgba(0,0,0,.18)" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {/* neck + head */}
        <rect x="45" y="64" width="14" height="16" rx="6" fill={l.skinShade} />
        <ellipse cx="29" cy="51" rx="5" ry="7" fill={l.skinShade} />
        <ellipse cx="75" cy="51" rx="5" ry="7" fill={l.skinShade} />
        <ellipse cx="52" cy="48" rx="23" ry="25" fill={`url(#${uid}-face)`} />
        {l.hairStyle !== 'tarha' ? <Hair l={l} /> : <path d="M29 44c2-14 11-21 23-21s21 7 23 21c-6-7-14-10-23-10s-17 3-23 10z" fill={l.scarf} opacity=".9" />}
        {/* face */}
        <ellipse cx="43" cy="50" rx="4.6" ry="5.4" fill="#1B120D" />
        <ellipse cx="61" cy="50" rx="4.6" ry="5.4" fill="#1B120D" />
        <circle cx="44.6" cy="48" r="1.6" fill="#fff" />
        <circle cx="62.6" cy="48" r="1.6" fill="#fff" />
        <path d="M37.5 42.5c2.5-2 6.5-2.2 9-.6M57.5 41.9c2.5-1.6 6.5-1.4 9 .6" stroke={l.hair} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="36" cy="58" rx="4" ry="2.6" fill="#E0726A" opacity=".35" />
        <ellipse cx="68" cy="58" rx="4" ry="2.6" fill="#E0726A" opacity=".35" />
        <path d="M44 61c4.5 4.5 11.5 4.5 16 0" stroke="#3B1F14" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

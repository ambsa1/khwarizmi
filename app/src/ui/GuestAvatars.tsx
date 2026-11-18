// Twelve illustrated Sudanese children for guest mode, drawn in code (vector, crisp at any size, ~1 KB each).
// Three ages (small, middle, older) with their own proportions; warm brown skin tones; boys with varied hair, a white
// jalabiya, a school shirt, a white taqiya, glasses; girls always modestly covered: colourful patterned tarhas, a
// hijab wrapped round the face, and a niqab for older girls. Ids g1..g8 keep their place so saved guests keep theirs.

type Age = 'small' | 'mid' | 'teen';
type Look = {
  id: string; gender: 'm' | 'f'; age: Age; skin: string; skinShade: string; hair: string;
  hairStyle?: 'curly' | 'short' | 'fade' | 'taqiya';
  cover?: 'tarha' | 'hijab' | 'niqab'; scarf?: string; trim?: string; pattern?: 'dots' | 'stripes' | 'flowers';
  bg: string; shirt: string; collar?: 'jalabiya' | 'round' | 'school'; glasses?: boolean;
};

export const GUEST_AVATARS: Look[] = [
  { id: 'g1', gender: 'm', age: 'small', skin: '#8D5A3B', skinShade: '#74472C', hair: '#1E1512', hairStyle: 'curly', bg: '#BFE0F2', shirt: '#2F7FD8', collar: 'round' },
  { id: 'g2', gender: 'm', age: 'mid', skin: '#6E432B', skinShade: '#58331F', hair: '#16100D', hairStyle: 'fade', bg: '#FFE3A8', shirt: '#FFFFFF', collar: 'jalabiya' },
  { id: 'g3', gender: 'm', age: 'teen', skin: '#A06A45', skinShade: '#86553A', hair: '#2A1C15', hairStyle: 'short', bg: '#CFEBD3', shirt: '#1F9D61', collar: 'school', glasses: true },
  { id: 'g4', gender: 'm', age: 'small', skin: '#5E3824', skinShade: '#4A2A1A', hair: '#1A120E', hairStyle: 'curly', bg: '#F9D3C2', shirt: '#E8892B', collar: 'round' },
  { id: 'g9', gender: 'm', age: 'mid', skin: '#93603F', skinShade: '#7A4C30', hair: '#1E1512', hairStyle: 'taqiya', bg: '#D7ECF7', shirt: '#FFFFFF', collar: 'jalabiya' },
  { id: 'g10', gender: 'm', age: 'teen', skin: '#7A4A30', skinShade: '#633A24', hair: '#16100D', hairStyle: 'fade', bg: '#E6DDF7', shirt: '#5A4FB8', collar: 'round' },
  { id: 'g5', gender: 'f', age: 'small', skin: '#8D5A3B', skinShade: '#74472C', hair: '#1E1512', cover: 'tarha', scarf: '#F07FAE', trim: '#FFFFFF', pattern: 'dots', bg: '#F8D1E2', shirt: '#D9558F', collar: 'round' },
  { id: 'g6', gender: 'f', age: 'mid', skin: '#A06A45', skinShade: '#86553A', hair: '#2A1C15', cover: 'tarha', scarf: '#9C7FE0', trim: '#F5D36B', pattern: 'flowers', bg: '#DCD3F3', shirt: '#7B61C9' },
  { id: 'g7', gender: 'f', age: 'small', skin: '#6E432B', skinShade: '#58331F', hair: '#16100D', cover: 'tarha', scarf: '#FFC23A', trim: '#E8892B', pattern: 'stripes', bg: '#FFE3A8', shirt: '#1FA3A3', collar: 'school' },
  { id: 'g8', gender: 'f', age: 'teen', skin: '#7A4A30', skinShade: '#633A24', hair: '#1A120E', cover: 'hijab', scarf: '#2F5FA8', trim: '#8FB8EC', bg: '#BFE0F2', shirt: '#1F4F8F' },
  { id: 'g11', gender: 'f', age: 'teen', skin: '#93603F', skinShade: '#7A4C30', hair: '#1A120E', cover: 'niqab', scarf: '#3A2C45', trim: '#B98FD0', bg: '#EFE3D2', shirt: '#3A2C45' },
  { id: 'g12', gender: 'f', age: 'mid', skin: '#5E3824', skinShade: '#4A2A1A', hair: '#16100D', cover: 'hijab', scarf: '#2E9A6A', trim: '#BFE8CF', pattern: 'dots', bg: '#D6F0DE', shirt: '#1F7A52' },
];

/** face proportions per age: small children have rounder faces and bigger eyes */
const FACE: Record<Age, { rx: number; ry: number; cy: number; eye: number; eyeY: number; shoulders: number }> = {
  small: { rx: 25, ry: 24, cy: 50, eye: 5.4, eyeY: 51, shoulders: 22 },
  mid: { rx: 23, ry: 25, cy: 48, eye: 4.7, eyeY: 50, shoulders: 26 },
  teen: { rx: 21, ry: 27, cy: 46, eye: 3.9, eyeY: 47, shoulders: 30 },
};

function Hair({ l, f }: { l: Look; f: typeof FACE[Age] }) {
  const h = l.hair, top = f.cy - f.ry;
  switch (l.hairStyle) {
    case 'curly':
      return <g fill={h}>{[[34, 8], [42, 2], [52, -1], [62, 0], [70, 5], [76, 13], [28, 17], [80, 22], [46, 8], [58, 6]].map(([x, y], i) => <circle key={i} cx={x} cy={top + 6 + y} r={9} />)}</g>;
    case 'fade':
      return <path d={`M${52 - f.rx - 2} ${f.cy}c-2-17 9-${f.ry + 4} ${f.rx + 2}-${f.ry + 4}s27 12 25 29c-3-8-9-12-25-12s-22 4-25 12z`} fill={h} transform={`translate(0 ${-2})`} />;
    case 'short':
      return <path d={`M${52 - f.rx - 1} ${f.cy}c-1-16 10-${f.ry + 2} ${f.rx + 1}-${f.ry + 2} 14 0 25 9 26 23-6-6-14-9-26-9-11 0-19 5-26 13z`} fill={h} />;
    case 'taqiya':   // white crocheted cap over short hair
      return <g><path d={`M${52 - f.rx} ${f.cy - 4}c0-14 10-${f.ry - 2} ${f.rx}-${f.ry - 2}s${f.rx} ${f.ry - 16} ${f.rx} ${f.ry - 2}z`} fill="#F7F3EA" />
        {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={36 + i * 8} cy={f.cy - 10} r={1.4} fill="#D9CFBC" />)}</g>;
    default: return null;
  }
}

function Pattern({ l, id }: { l: Look; id: string }) {
  if (!l.pattern || !l.trim) return null;
  return (
    <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
      {l.pattern === 'dots' && <circle cx="5" cy="5" r="1.6" fill={l.trim} opacity=".85" />}
      {l.pattern === 'stripes' && <rect width="10" height="2.6" fill={l.trim} opacity=".7" />}
      {l.pattern === 'flowers' && <g fill={l.trim} opacity=".9"><circle cx="5" cy="3.6" r="1.3" /><circle cx="3.6" cy="5.4" r="1.3" /><circle cx="6.4" cy="5.4" r="1.3" /></g>}
    </pattern>
  );
}

export function GuestAvatar({ id, size = 112 }: { id: string; size?: number }) {
  const l = GUEST_AVATARS.find(a => a.id === id) ?? GUEST_AVATARS[0];
  const f = FACE[l.age], uid = 'ga-' + l.id;
  const scarfFill = l.pattern ? `url(#${uid}-pat)` : l.scarf;
  const covered = !!l.cover;
  return (
    <svg width={size} height={size} viewBox="0 0 104 104" role="img" aria-label={l.gender === 'f' ? 'صورة بنت' : 'صورة ولد'}>
      <defs>
        <radialGradient id={uid + '-bg'} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id={uid + '-face'} cx="42%" cy="38%" r="65%"><stop offset="0" stopColor={l.skin} /><stop offset="1" stopColor={l.skinShade} /></radialGradient>
        <clipPath id={uid + '-c'}><circle cx="52" cy="52" r="52" /></clipPath>
        <Pattern l={l} id={uid + '-pat'} />
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect width="104" height="104" fill={l.bg} />
        <rect width="104" height="104" fill={`url(#${uid}-bg)`} />
        {/* the scarf behind the head and over the shoulders */}
        {covered && <path d={`M${52 - f.shoulders - 16} 104c0-30 6-50 14-${60 - (f.cy - 46)}c6-12 14-19 24-19s18 7 24 19c8 10 14 30 14 ${60 - (f.cy - 46)}z`} fill={l.scarf} />}
        {covered && l.pattern && <path d={`M${52 - f.shoulders - 16} 104c0-30 6-50 14-${60 - (f.cy - 46)}c6-12 14-19 24-19s18 7 24 19c8 10 14 30 14 ${60 - (f.cy - 46)}z`} fill={scarfFill} />}
        {/* shoulders */}
        {!covered || l.cover === 'tarha' ? <path d={`M${52 - f.shoulders - 12} 104c2-18 18-26 ${f.shoulders + 12}-26s36 8 ${f.shoulders + 12} 26z`} fill={l.shirt} /> : null}
        {l.collar === 'jalabiya' && <path d="M44 81l8 12 8-12" stroke="#E2DACB" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {l.collar === 'school' && <path d="M40 80l12 9 12-9" fill="#FFFFFF" />}
        {l.collar === 'round' && <path d="M42 81c5 5 15 5 20 0" stroke="rgba(0,0,0,.18)" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {/* neck + ears (hidden under a hijab or niqab) */}
        {l.cover !== 'hijab' && l.cover !== 'niqab' && <rect x="45" y={f.cy + f.ry - 10} width="14" height="16" rx="6" fill={l.skinShade} />}
        {!covered && <><ellipse cx={52 - f.rx - 1} cy={f.cy + 3} rx="5" ry="7" fill={l.skinShade} /><ellipse cx={52 + f.rx + 1} cy={f.cy + 3} rx="5" ry="7" fill={l.skinShade} /></>}
        <ellipse cx="52" cy={f.cy} rx={f.rx} ry={f.ry} fill={`url(#${uid}-face)`} />
        {!covered && <Hair l={l} f={f} />}
        {/* scarf frame round the face; a hijab also closes under the chin */}
        {covered && <path d={`M${52 - f.rx - 4} ${f.cy + 6}c0-${f.ry + 2} 10-${f.ry + 10} ${f.rx + 4}-${f.ry + 10}s${f.rx + 4} ${8} ${f.rx + 4} ${f.ry + 10}c-5-${f.ry - 8}-13-${f.ry - 4}-${f.rx + 4}-${f.ry - 4}s-${f.rx - 1} ${4}-${f.rx + 4} ${f.ry - 4}z`} fill={l.scarf} stroke={l.scarf} strokeWidth="1" />}
        {covered && l.pattern && <path d={`M${52 - f.rx - 4} ${f.cy + 6}c0-${f.ry + 2} 10-${f.ry + 10} ${f.rx + 4}-${f.ry + 10}s${f.rx + 4} ${8} ${f.rx + 4} ${f.ry + 10}c-5-${f.ry - 8}-13-${f.ry - 4}-${f.rx + 4}-${f.ry - 4}s-${f.rx - 1} ${4}-${f.rx + 4} ${f.ry - 4}z`} fill={scarfFill} />}
        {(l.cover === 'hijab' || l.cover === 'niqab') && <path d={`M${52 - f.rx - 4} ${f.cy + 4}c2 ${f.ry} 12 ${f.ry + 8} ${f.rx + 4} ${f.ry + 8}s${f.rx + 2}-8 ${f.rx + 4}-${f.ry + 8}c-4 ${f.ry - 10}-12 ${f.ry - 4}-${f.rx + 4} ${f.ry - 4}s-${f.rx} -6-${f.rx + 4}-${f.ry - 4}z`} fill={l.scarf} />}
        {l.cover === 'hijab' && <path d={`M${52 - f.rx - 8} 104c4-14 14-20 ${f.rx + 8}-22s${f.rx + 4} 8 ${f.rx + 8} 22z`} fill={l.scarf} />}
        {/* eyes and brows */}
        <ellipse cx="43" cy={f.eyeY} rx={f.eye} ry={f.eye * 1.17} fill="#1B120D" />
        <ellipse cx="61" cy={f.eyeY} rx={f.eye} ry={f.eye * 1.17} fill="#1B120D" />
        <circle cx="44.6" cy={f.eyeY - 2} r={f.eye * 0.34} fill="#fff" />
        <circle cx="62.6" cy={f.eyeY - 2} r={f.eye * 0.34} fill="#fff" />
        <path d={`M37.5 ${f.eyeY - 7.5}c2.5-2 6.5-2.2 9-.6M57.5 ${f.eyeY - 8.1}c2.5-1.6 6.5-1.4 9 .6`} stroke={l.hair} strokeWidth={l.age === 'teen' ? 2.6 : 2.2} strokeLinecap="round" fill="none" />
        {l.glasses && <g stroke="#2A1C15" strokeWidth="1.8" fill="rgba(255,255,255,.15)"><circle cx="43" cy={f.eyeY} r="7" /><circle cx="61" cy={f.eyeY} r="7" /><path d={`M50 ${f.eyeY}h4`} /></g>}
        {/* niqab: the face covered below the eyes, with a soft fold */}
        {l.cover === 'niqab' ? (
          <g><path d={`M${52 - f.rx - 3} ${f.eyeY + 7}h${2 * f.rx + 6}c0 ${f.ry} -10 ${f.ry + 8} -${f.rx + 3} ${f.ry + 10}s-${f.rx + 3}-10-${f.rx + 3}-${f.ry + 10}z`} fill={l.scarf} />
            <path d={`M${52 - f.rx} ${f.eyeY + 8}h${2 * f.rx}`} stroke={l.trim} strokeWidth="2" strokeLinecap="round" />
            <path d={`M48 ${f.eyeY + 18}c3 3 5 3 8 0`} stroke="rgba(255,255,255,.18)" strokeWidth="2" fill="none" /></g>
        ) : (
          <>
            <ellipse cx="36" cy={f.eyeY + 8} rx="4" ry="2.6" fill="#E0726A" opacity=".35" />
            <ellipse cx="68" cy={f.eyeY + 8} rx="4" ry="2.6" fill="#E0726A" opacity=".35" />
            <path d={`M44 ${f.eyeY + 11}c4.5 4.5 11.5 4.5 16 0`} stroke="#3B1F14" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}

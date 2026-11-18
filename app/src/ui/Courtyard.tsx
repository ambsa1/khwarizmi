// Siraj's colourful mud-brick courtyard at sunrise, drawn as one inline SVG so it appears instantly
// (no image download). Only Siraj, rendered on top, is live 3D.
import { useEffect, useState } from 'react';

/** Portrait phones see the tall framing; laptops and landscape phones see a wide strip with sky, wall and floor. */
function useLandscape() {
  const q = '(orientation: landscape)';
  const [l, setL] = useState(() => matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const on = () => setL(m.matches); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return l;
}

export function Courtyard() {
  const wide = useLandscape();
  return (
    <svg aria-hidden viewBox={wide ? '-300 220 1000 560' : '0 0 400 800'} preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="cy-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD9A0" /><stop offset=".55" stopColor="#FFE9C4" /><stop offset="1" stopColor="#FFF3DC" />
        </linearGradient>
        <radialGradient id="cy-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#FFF6D8" /><stop offset=".4" stopColor="#FFE08A" stopOpacity=".9" /><stop offset="1" stopColor="#FFE08A" stopOpacity="0" /></radialGradient>
        <linearGradient id="cy-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E6B783" /><stop offset="1" stopColor="#D49C66" /></linearGradient>
        <linearGradient id="cy-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EBCB98" /><stop offset="1" stopColor="#E2BC85" /></linearGradient>
      </defs>
      <rect x="-1000" width="2400" height="800" fill="url(#cy-sky)" />
      <circle cx="300" cy="250" r="120" fill="url(#cy-sun)" />
      <circle cx="300" cy="250" r="34" fill="#FFF1C2" />
      {/* distant palms over the wall */}
      <g fill="#7FA35A" opacity=".75">
        <path d="M60 330c10-30 40-40 60-36-20 4-38 16-48 36zM62 330c-6-26-30-40-52-38 18 6 34 18 44 38zM64 328c4-28 22-46 44-50-16 10-30 28-36 50z" />
        <rect x="60" y="326" width="7" height="90" rx="3" fill="#8A6440" />
        <path d="M352 300c10-30 40-40 60-36-20 4-38 16-48 36zM354 300c-6-26-30-40-52-38 18 6 34 18 44 38z" />
        <rect x="352" y="296" width="7" height="120" rx="3" fill="#8A6440" />
        <path d="M-182 320c10-30 40-40 60-36-20 4-38 16-48 36zM-180 320c-6-26-30-40-52-38 18 6 34 18 44 38z" />
        <rect x="-182" y="316" width="7" height="100" rx="3" fill="#8A6440" />
        <path d="M592 310c10-30 40-40 60-36-20 4-38 16-48 36zM594 310c-6-26-30-40-52-38 18 6 34 18 44 38z" />
        <rect x="592" y="306" width="7" height="110" rx="3" fill="#8A6440" />
      </g>
      {/* courtyard wall with a painted blue door and a window */}
      <path d="M-1000 400q0-14 14-14h2372q14 0 14 14v220H-1000z" fill="url(#cy-wall)" />
      <path d="M-1000 392h2400v14H-1000z" fill="#F0C892" />
      <g fill="#C98A55" opacity=".35">{[-450, -370, -290, -210, -130, -50, 30, 110, 190, 270, 350, 430, 510, 590, 670, 750].map(x => <rect key={x} x={x} y="430" width="40" height="6" rx="3" />)}</g>
      <path d="M150 620V500a50 50 0 0 1 100 0v120z" fill="#2F7FD8" />
      <path d="M150 620V500a50 50 0 0 1 100 0v120" fill="none" stroke="#F2C14E" strokeWidth="8" />
      <g stroke="#F2C14E" strokeWidth="4" fill="none" opacity=".9">
        <path d="M200 470l14 14-14 14-14-14zM200 520l14 14-14 14-14-14z" />
      </g>
      <circle cx="232" cy="560" r="5" fill="#F2C14E" />
      <rect x="40" y="470" width="62" height="56" rx="10" fill="#1F5FAD" />
      <rect x="44" y="474" width="54" height="48" rx="7" fill="#FFE08A" opacity=".85" />
      <path d="M71 474v48M44 498h54" stroke="#1F5FAD" strokeWidth="4" />
      <rect x="300" y="470" width="62" height="56" rx="10" fill="#1A7F50" />
      <rect x="304" y="474" width="54" height="48" rx="7" fill="#FFE08A" opacity=".85" />
      <path d="M331 474v48M304 498h54" stroke="#1A7F50" strokeWidth="4" />
      {/* clay pots (zeer) and a bench */}
      <ellipse cx="80" cy="640" rx="26" ry="30" fill="#C46A3C" /><ellipse cx="80" cy="612" rx="14" ry="5" fill="#8A4A2A" />
      <ellipse cx="330" cy="646" rx="22" ry="25" fill="#D9643A" /><ellipse cx="330" cy="623" rx="12" ry="4" fill="#8A4A2A" />
      <rect x="-1000" y="620" width="2400" height="200" fill="url(#cy-floor)" />
      <g fill="#D7AE74" opacity=".5">{[[40, 680], [140, 720], [260, 690], [350, 740], [90, 770], [220, 780]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="22" ry="5" />)}</g>
    </svg>
  );
}

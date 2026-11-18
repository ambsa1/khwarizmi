// Hand-drawn SVG icons (no emoji: emoji look different on every phone). Rounded strokes, 2.5px, currentColor.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 28, ...p }: P) => ({
  width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});

export const IconPath = (p: P) => (
  <svg {...base(p)}><path d="M8 27c0-5 5-5 8-8s1-7 5-9 4-4 4-6" /><circle cx="8" cy="27" r="2.2" fill="currentColor" /><path d="M23 4l3 1-1 3" /></svg>
);
export const IconMap = (p: P) => (
  <svg {...base(p)}><path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z" /><path d="M11 5v19M21 8v19" /></svg>
);
export const IconPassport = (p: P) => (
  <svg {...base(p)}><rect x="7" y="4" width="18" height="24" rx="3" /><circle cx="16" cy="14" r="4.5" /><path d="M12 22h8" /></svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}><rect x="7" y="14" width="18" height="13" rx="3" /><path d="M11 14v-3a5 5 0 0 1 10 0v3" /><circle cx="16" cy="20.5" r="1.6" fill="currentColor" /></svg>
);
/** RTL "back": points right. */
export const IconBack = (p: P) => (
  <svg {...base(p)}><path d="M12 7l9 9-9 9" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M22 7.8v16.4a1.5 1.5 0 0 1-2.3 1.3L8.6 17.3a1.5 1.5 0 0 1 0-2.6l11.1-8.2A1.5 1.5 0 0 1 22 7.8z" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)} strokeWidth={3.5}><path d="M7 17l6 6 12-13" /></svg>
);
export const IconLamp = (p: P) => (
  <svg {...base(p)}><path d="M16 4c5 0 8 3.6 8 8 0 3-1.6 5-3.5 6.5-.9.7-1.5 1.8-1.5 3V23h-6v-1.5c0-1.2-.6-2.3-1.5-3C9.6 17 8 15 8 12c0-4.4 3-8 8-8z" fill="currentColor" fillOpacity=".25" /><path d="M13 27h6" /></svg>
);
export const IconRefresh = (p: P) => (
  <svg {...base(p)}><path d="M25 10a10 10 0 1 0 1.5 8" /><path d="M26 4v6h-6" /></svg>
);
export const IconGift = (p: P) => (
  <svg {...base(p)}><rect x="5" y="12" width="22" height="15" rx="2.5" /><path d="M4 12h24v-3H4zM16 9v18" /><path d="M16 9c-2-4-7-5-7-1.5S14 9 16 9c2 0 7-1 7-1.5S18 5 16 9z" /></svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}><circle cx="16" cy="16" r="4" /><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" /></svg>
);
export const IconFamily = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="10" r="3.5" /><circle cx="22" cy="11" r="3" /><path d="M4 26c0-5 3-8 7-8s7 3 7 8M17 26c.4-4 2.4-6.5 5-6.5s4.6 2.5 5 6.5" /></svg>
);
export const IconStar = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M16 3.5l3.8 7.8 8.5 1.2-6.2 6 1.5 8.5L16 23l-7.6 4 1.5-8.5-6.2-6 8.5-1.2z" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}><path d="M9 9l14 14M23 9L9 23" /></svg>
);
export const IconSchool = (p: P) => (
  <svg {...base(p)}><path d="M3 12l13-6 13 6-13 6z" /><path d="M8 15v6c3 3 13 3 16 0v-6" /><path d="M29 12v8" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}><path d="M16 6v20M6 16h20" /></svg>
);

/** subject icons for the six worlds (coding, technology & AI, English, thinking games, school, little explorer) */
export const IconCode = (p: P) => (<svg {...base(p)}><path d="M11 9l-7 7 7 7M21 9l7 7-7 7M18 6l-4 20" /></svg>);
export const IconChip = (p: P) => (<svg {...base(p)}><rect x="9" y="9" width="14" height="14" rx="3" /><path d="M13 13h6v6h-6zM13 4v5M19 4v5M13 23v5M19 23v5M4 13h5M4 19h5M23 13h5M23 19h5" /></svg>);
export const IconLetters = (p: P) => (<svg {...base(p)}><path d="M4 24l6-16 6 16M6.5 18h7" /><path d="M20 14c2-2 7-2 7 2v8M27 19c-4-1-8 0-8 3s5 3 8 0" /></svg>);
export const IconPuzzle = (p: P) => (<svg {...base(p)}><path d="M6 10h6a3 3 0 1 1 6 0h6v6a3 3 0 1 0 0 6v4H18a3 3 0 1 0-6 0H6v-6a3 3 0 1 1 0-6z" /></svg>);
export const IconBag = (p: P) => (<svg {...base(p)}><path d="M8 12c0-4 4-6 8-6s8 2 8 6v14H8z" /><path d="M12 6V4h8v2M8 17h16M14 17v4h4v-4" /></svg>);
export const IconLens = (p: P) => (<svg {...base(p)}><circle cx="14" cy="14" r="8" /><path d="M20 20l7 7" /><path d="M10.5 12a4 4 0 0 1 4-3" /></svg>);
export const IconLeaf = (p: P) => (<svg {...base(p)}><path d="M7 25C7 13 15 6 27 5c0 12-7 20-19 20z" /><path d="M7 25c5-6 10-10 16-14" /></svg>);

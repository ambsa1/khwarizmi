// Small shared UI pieces: player avatar, long-press, double-tap guard, confetti, tab bar, Siraj's speech bubble.
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { imageUrl } from '../lib/family';
import { useApp, type Profile, type Screen } from '../state/store';
import { artUrl, GUEST_AVATARS, GuestAvatar } from './GuestAvatars';
import { IconMap, IconPassport, IconPath, IconSchoolHouse } from './Icons';

/** Masculine / feminine wording (Sudanese Arabic addresses boys and girls differently). */
/** the player's school stage: "روضة" (kindergarten) or "الصف ٣"; family children without a grade show nothing */
export const gradeLabel = (p: { kind: 'family' | 'guest'; grade?: number | null }, num: (n: number) => string) =>
  p.grade ? `الصف ${num(p.grade)}` : p.kind === 'guest' ? 'روضة' : '';
export const playerName = (p: { kind: 'family' | 'guest'; name?: string; gender: 'm' | 'f' }) =>
  (p.name?.trim() || (p.kind === 'family' ? '' : p.gender === 'f' ? 'ضيفة' : 'ضيف'));
export const say = (p: { gender: 'm' | 'f' } | null | undefined, m: string, f: string) => (p?.gender === 'f' ? f : m);

/** Ignores repeated taps inside `ms` (little ones double and triple tap). */
/** blocks a second tap within `ms` (double taps); when `key` changes (a new step on screen) the next tap always counts */
export function useGuard(ms = 450, key?: unknown) {
  const last = useRef(-Infinity), seen = useRef(key);
  if (seen.current !== key) { seen.current = key; last.current = -Infinity; }
  return (fn: () => void) => () => { const t = performance.now(); if (t - last.current < ms) return; last.current = t; fn(); };
}

export function usePrefersReduced() {
  const motionSetting = useApp(s => s.motion);
  const [sys, setSys] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSys(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return motionSetting === 'reduced' || sys;
}

/** Round avatar: decrypted family portrait or illustrated guest, inside a ring in the child's colour. */
/** the player's picture as a plain image address: a guest's illustration, or a family child's portrait (decrypted on
 *  the device after the family code). Used for the passport photo and the saved certificate. */
export function usePlayerImage(profile: Profile | null | undefined) {
  const key = useApp(s => s.familyKey), family = useApp(s => s.family);
  const member = profile?.kind === 'family' ? family?.members.find(m => m.id === profile.id) : undefined;
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (member && key) imageUrl(key, member.image).then(u => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [member, key]);
  if (!profile) return null;
  if (profile.kind === 'family') return src;
  const id = GUEST_AVATARS.find(a => a.id === profile.avatar)?.id ?? GUEST_AVATARS[0].id;
  return artUrl(`avatars/${id}.webp`);
}
/** a rectangular passport photo (3:4) of the player */
export function PlayerPhoto({ profile, className }: { profile: Profile; className?: string }) {
  const src = usePlayerImage(profile);
  return <span className={'player-photo ' + (className ?? '')}>{src && <img src={src} alt="" draggable={false} />}</span>;
}

/** An embroidered ring (Sudanese / African stitch-work in calm colours): a soft brick and indigo band, cream stitches,
 *  thin pale-gold edges. Drawn over a picture; `accent` (a family child's colour) replaces the indigo. */
export function Embroidery({ accent }: { accent?: string }) {
  const b = accent ?? '#5E7191';
  return (
    <svg className="embroidery" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="47.6" fill="none" stroke="#7A5B43" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="44.4" fill="none" stroke="#B9785D" strokeWidth="5.6" />
      <circle cx="50" cy="50" r="44.4" fill="none" stroke={b} strokeWidth="5.6" strokeDasharray="3.49 3.49" opacity=".9" />
      <circle cx="50" cy="50" r="44.4" fill="none" stroke="#EFE0C2" strokeWidth="1.6" strokeDasharray="0.01 3.49" strokeDashoffset="1.745" strokeLinecap="round" />
      <circle cx="50" cy="50" r="41.2" fill="none" stroke="#C9A866" strokeWidth="1.1" />
      <circle cx="50" cy="50" r="47.6" fill="none" stroke="#C9A866" strokeWidth=".6" strokeDasharray=".9 1.6" />
    </svg>
  );
}

export function Avatar({ profile, size = 56, ring }: { profile: Profile; size?: number; ring?: string }) {
  const key = useApp(s => s.familyKey), family = useApp(s => s.family);
  const member = profile.kind === 'family' ? family?.members.find(m => m.id === profile.id) : undefined;
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (member && key) imageUrl(key, member.image).then(u => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [member, key]);
  const accent = ring ?? member?.ring;
  const inner = Math.round(size * 0.82);
  return (
    <span className="avatar" style={{ width: size, height: size, position: 'relative', display: 'grid', placeItems: 'center', flex: 'none', borderRadius: '50%',
      boxShadow: `0 ${Math.max(2, size * 0.03)}px ${Math.max(4, size * 0.08)}px rgba(91,59,38,.25)` }}>
      <span style={{ width: inner, height: inner, borderRadius: '50%', overflow: 'hidden', background: '#FFF4DE', display: 'grid', placeItems: 'center' }}>
        {member ? (src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null)
          : <GuestAvatar id={profile.avatar} size={inner} />}
      </span>
      <Embroidery accent={accent && accent !== '#FFB627' ? accent : undefined} />
    </span>
  );
}

/** Press and hold for `ms` (parents' corner). Shows a filling ring so adults know to keep holding. */
export function LongPress({ ms = 2000, onDone, children, label }: { ms?: number; onDone: () => void; children: ReactNode; label: string }) {
  const [p, setP] = useState(0);
  const raf = useRef(0), start = useRef(0);
  const stop = () => { cancelAnimationFrame(raf.current); setP(0); };
  const begin = () => {
    start.current = performance.now();
    const tick = () => {
      const k = (performance.now() - start.current) / ms;
      if (k >= 1) { setP(0); onDone(); return; }
      setP(k); raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const C = 2 * Math.PI * 25;
  return (
    <button className="icon-btn" aria-label={label} style={{ position: 'relative' }}
      onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={e => e.preventDefault()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDone(); }}>
      {children}
      {p > 0 && (
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden>
          <circle cx="28" cy="28" r="25" fill="none" stroke="var(--c-nile)" strokeWidth="4" strokeDasharray={C} strokeDashoffset={C * (1 - p)} strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

/** Paper confetti in the palette. Never blocks touches; finishes inside 2 seconds. */
export function Confetti({ run }: { run: number }) {
  const reduced = usePrefersReduced();
  const bits = useMemo(() => Array.from({ length: reduced ? 0 : 42 }, (_, i) => ({
    x: (Math.random() - 0.5) * 340, y: -260 - Math.random() * 220, r: Math.random() * 720 - 360, d: 1.1 + Math.random() * 0.7,
    c: ['#FFB627', '#1F5FAD', '#2FA36B', '#D9643A', '#7B61C9', '#FFE08A'][i % 6], w: 8 + Math.random() * 8, delay: Math.random() * 0.15,
  })), [run, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!run) return null;
  return (
    <div key={run} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 20 }}>
      {bits.map((b, i) => (
        <motion.i key={i} initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }} animate={{ x: b.x, y: [0, b.y, b.y + 520], rotate: b.r, opacity: [1, 1, 0] }}
          transition={{ duration: b.d, delay: b.delay, ease: 'easeOut', times: [0, 0.35, 1] }}
          style={{ position: 'absolute', left: '50%', top: '62%', width: b.w, height: b.w * 0.6, background: b.c, borderRadius: 2 }} />
      ))}
    </div>
  );
}

export function TabBar({ current }: { current: Screen }) {
  const go = useApp(s => s.go);
  const tabs: { id: Screen; label: string; icon: ReactNode }[] = [
    { id: 'path', label: 'رحلتي', icon: <IconPath /> },
    { id: 'map', label: 'الخريطة', icon: <IconMap /> },
    { id: 'school', label: 'المدرسة', icon: <IconSchoolHouse /> },
    { id: 'passport', label: 'جوازي', icon: <IconPassport /> },
  ];
  return (
    <nav className="tabbar" aria-label="التنقّل">
      {tabs.map(t => (
        <button key={t.id} className="tab" aria-current={current === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
          {t.icon}<span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Siraj's short line, in a speech bubble. */
export function Bubble({ children, style }: { children: ReactNode; style?: import('framer-motion').MotionStyle }) {
  return (
    <motion.div key={String(children)} initial={{ scale: 0.6, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="card t-h2" role="status" style={{ padding: '10px 20px', borderRadius: 22, textAlign: 'center', ...style }}>
      {children}
    </motion.div>
  );
}

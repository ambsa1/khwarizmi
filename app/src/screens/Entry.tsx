// "Who's playing?" Family mode shows the children (only after the family code has unlocked the sealed data); guest
// profiles saved on this device appear too. The family code page opens with a silent secret gesture: hold Siraj for
// 2.5 seconds (nothing on screen shows the hold). One tap on the lock opens the parents' corner (or «بيتنا» in family
// mode): guest controls
// and the daily play-time limit. The menu sits opposite it.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { stampsOf, useLearning } from '../data/learning';
import { useApp, type Profile } from '../state/store';
import { useNum } from '../lib/num';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Siraj, type SirajAction } from '../three/Siraj';
import { Stage } from '../three/Stage';
import { Courtyard } from '../ui/Courtyard';
import { IconLock, IconPlus, IconStar } from '../ui/Icons';
import { AppMenu } from '../ui/TopBar';
import { Avatar, Bubble, playerName, useGuard } from '../ui/kit';
import { useHold } from '../ui/Hold';
import { useModalBack } from '../ui/nav';
import { IconClose } from '../ui/Icons';

function Aim() {
  const cam = useThree(s => s.camera);
  useEffect(() => { cam.lookAt(0, 1.05, 0); }, [cam]);
  return null;
}

export function SirajLive({ action }: { action: SirajAction }) {
  return (
    <Stage camera={{ position: [0, 1.35, 6.2], fov: 30 }} transparent label="سراج يلوّح">
      <Aim />
      <hemisphereLight args={['#FFE6C2', '#8A6A4A', 1.15]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color="#FFD9A6" />
      <Siraj action={action} glow={0.8} stamps={3} position={[0, 0.02, 0]} />
    </Stage>
  );
}

export function Entry() {
  const family = useApp(s => s.family), guests = useApp(s => s.profiles), setCurrent = useApp(s => s.setCurrent), go = useApp(s => s.go);
  const num = useNum();
  const learners = useLearning(s => s.learners);
  const guard = useGuard();
  const [picked, setPicked] = useState<string | null>(null);
  const players: (Profile & { ring?: string; stamps: number })[] = [
    ...(family?.members ?? []).map(m => ({ id: m.id, kind: 'family' as const, name: m.name, gender: m.gender, age: m.age, grade: null, avatar: m.id, ring: m.ring, stamps: stampsOf(learners[m.id]) })),
    // family mode is reserved for the four children: no guests and no way to add a player
    ...(family ? [] : guests.map(g => ({ ...g, stamps: stampsOf(learners[g.id]) }))),
  ];
  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => { setCurrent(id); go('path'); }, 650);
  };
  const action: SirajAction = picked ? 'cheer' : 'wave';
  // the secret gesture: hold Siraj for 2.5 seconds (mouse or finger) -> the family page; silent, no ring
  const hold = useHold(2500, () => go('family'));
  const removeGuest = useApp(s => s.removeGuest), forget = useLearning(s => s.forget);
  const [askDel, setAskDel] = useState<string | null>(null);
  useModalBack(askDel != null, () => setAskDel(null));
  const del = (id: string) => { removeGuest(id); forget(id); setAskDel(null); };
  const portrait = window.innerWidth >= 700 || window.innerHeight >= 860 ? 132 : window.innerHeight >= 740 ? 112 : 96;
  const label = (p: Profile) => playerName(p);
  return (
    <div className={'screen entry' + (players.length ? ' has-players' : '')}>
      <Courtyard />
      <div className="entry-corner">
        <button className="icon-btn lock-btn" aria-label={family ? 'ركن الأهل: بيتنا' : 'ركن الأهل'} onClick={() => go('parents')}><IconLock /></button>
      </div>
      <div className="entry-menu"><AppMenu /></div>
      <div className="entry-hero">
        <div className="entry-siraj" {...hold.handlers} data-secret="family"><SirajLive action={action} /></div>
        <Bubble>مين الجاي يلعب؟</Bubble>
      </div>
      <div className="entry-who">
        <div className={'who-grid' + (players.length + 1 > 4 ? ' many' : '')}>
          {players.map((p, i) => (
            <div key={p.id} className="who-wrap">
            <motion.button className="who-card card lift" onClick={guard(() => pick(p.id))}
              initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={picked === p.id ? { scale: 1.12, opacity: 1, y: -6 } : { opacity: picked ? 0.4 : 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24, delay: picked ? 0 : 0.05 * i }}>
              <Avatar profile={p} size={portrait} ring={p.ring} />
              <span className="who-name">{label(p)}</span>
              {p.kind === 'family' && (
                <span className="who-stamps"><IconStar size={22} style={{ color: 'var(--c-gold)' }} /> {num(p.stamps)} {p.stamps === 1 ? 'ختم' : 'أختام'}</span>
              )}
            </motion.button>
            {p.kind === 'guest' && !picked && (askDel === p.id ? (
              <div className="who-confirm card" role="alertdialog" aria-label={`نمسح ${label(p)}؟`}>
                <b>نمسح {label(p)}؟</b>
                <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
                  <button className="btn danger" onClick={() => del(p.id)}>امسح</button>
                  <button className="btn paper" onClick={() => setAskDel(null)}>لا</button>
                </div>
              </div>
            ) : <button className="who-del" aria-label={`امسح ${label(p)}`} onClick={() => setAskDel(p.id)}><IconClose size={20} /></button>)}
            </div>
          ))}
          {!family && (
          <motion.button className="who-card card lift who-new" onClick={guard(() => go('guest'))}
              initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: picked ? 0.4 : 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.05 * players.length }}>
              <span className="who-plus" style={{ width: portrait, height: portrait }}><IconPlus size={Math.round(portrait * 0.4)} /></span>
              <span className="who-name">ضيف جديد</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

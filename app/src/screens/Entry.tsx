// "Who's playing?" Family mode shows the four children (only after the family code has unlocked the sealed data);
// guest profiles saved on this device appear too. A 2-second press on the lock opens the parents' corner.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { DEMO_STAMPS, useApp, type Profile } from '../state/store';
import { useNum } from '../lib/num';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Siraj, type SirajAction } from '../three/Siraj';
import { Stage } from '../three/Stage';
import { Courtyard } from '../ui/Courtyard';
import { IconLock, IconStar } from '../ui/Icons';
import { Avatar, Bubble, LongPress, useGuard } from '../ui/kit';

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
  const guard = useGuard();
  const [picked, setPicked] = useState<string | null>(null);
  const players: (Profile & { ring?: string; stamps: number })[] = [
    ...(family?.members ?? []).map(m => ({ id: m.id, kind: 'family' as const, name: m.name, gender: m.gender, age: m.age, grade: null, avatar: m.id, ring: m.ring, stamps: DEMO_STAMPS[m.id] ?? 0 })),
    ...guests.map(g => ({ ...g, stamps: 0 })),
  ];
  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => { setCurrent(id); go('path'); }, 650);
  };
  const action: SirajAction = picked ? 'cheer' : 'wave';
  // 140px portraits where there is room (laptop, tall phones); a little smaller on short phones so all four fit.
  const portrait = window.innerWidth >= 700 || window.innerHeight >= 860 ? 140 : window.innerHeight >= 740 ? 118 : 100;
  return (
    <div className={'screen entry' + (players.length ? ' has-players' : '')}>
      <Courtyard />
      <div className="entry-corner">
        <LongPress label="ركن الأهل: اضغط مطوّلًا ثانيتين" onDone={() => go('parents')}><IconLock /></LongPress>
      </div>
      <div className="entry-hero">
        <div className="entry-siraj"><SirajLive action={action} /></div>
        <Bubble>مين الجاي يلعب؟</Bubble>
      </div>
      <div className="entry-who">
        {players.length > 0 && (
          <div className={'who-grid' + (players.length > 4 ? ' many' : '')}>
            {players.map((p, i) => (
              <motion.button key={p.id} className="who-card card lift" onClick={guard(() => pick(p.id))}
                initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={picked === p.id ? { scale: 1.12, opacity: 1, y: -6 } : { opacity: picked ? 0.4 : 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24, delay: picked ? 0 : 0.05 * i }}>
                <Avatar profile={p} size={p.kind === 'family' ? portrait : Math.round(portrait * 0.75)} ring={p.ring} />
                <span className="who-name">{p.kind === 'family' ? p.name : p.gender === 'f' ? 'ضيفة' : 'ضيف'}</span>
                {p.kind === 'family' && (
                  <span className="who-stamps"><IconStar size={22} style={{ color: 'var(--c-gold)' }} /> {num(p.stamps)} {p.stamps === 1 ? 'ختم' : 'أختام'}</span>
                )}
              </motion.button>
            ))}
          </div>
        )}
        <button className={'btn ' + (players.length ? 'paper' : 'big')} onClick={guard(() => go('guest'))} style={{ alignSelf: 'center' }}>
          ضيف جديد
        </button>
      </div>
    </div>
  );
}

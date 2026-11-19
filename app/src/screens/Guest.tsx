// A new player in three short questions from Siraj, then "who's playing?":
//   1. boy or girl (two picture cards)     2. which grade (six warm cards, and a big "kindergarten" button with toy
//   blocks, readable without reading)      3. "pick your picture": every picture for that gender, in a
//   wide swipeable strip that starts on a picture of the child's own age (the middle one grows in a glowing gold ring,
//   the side ones are smaller so more choices show at both ends, a soft pop on every step; arrows for a mouse), then
//   the name.
// The age is taken from the grade (kindergarten = 5, grade n = n + 6).
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Sound } from '../audio/SoundManager';
import { useNum } from '../lib/num';
import { useApp } from '../state/store';
import { artUrl, GuestAvatar, picturesFor } from '../ui/GuestAvatars';
import { IconBack } from '../ui/Icons';
import { back as navBack } from '../ui/nav';
import { Bubble, say, useGuard } from '../ui/kit';
import { SirajLive } from './Entry';

type Step = 'gender' | 'grade' | 'avatar';
const GRADE_WORDS = ['الأول', 'التاني', 'التالت', 'الرابع', 'الخامس', 'السادس'];

/** toy blocks: kindergarten at a glance */
function IconBlocks({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g stroke="#5B3B26" strokeWidth="2" strokeLinejoin="round">
        <rect x="6" y="34" width="24" height="24" rx="4" fill="#D9643A" /><circle cx="18" cy="46" r="5" fill="#FFF3D6" />
        <rect x="34" y="34" width="24" height="24" rx="4" fill="#1F5FAD" /><path d="M46 39 52 51H40Z" fill="#FFF3D6" />
        <rect x="20" y="8" width="24" height="24" rx="4" fill="#FFB627" transform="rotate(-6 32 20)" /><rect x="27" y="15" width="10" height="10" rx="2" fill="#3E9B4F" transform="rotate(-6 32 20)" />
      </g>
    </svg>
  );
}

/** the picture strip: snaps one picture to the middle, the middle one is the choice */
function PictureStrip({ ids, active, setActive }: { ids: string[]; active: number; setActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null), last = useRef(active), raf = useRef(0);
  const center = (i: number, smooth = true) => {
    const el = ref.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  };
  // while the finger moves, every picture follows its distance from the middle: it grows smoothly as it comes to the
  // centre and shrinks and fades as it leaves (no jump when the scroll stops); the centred one is the choice
  const paint = () => {
    const box = ref.current; if (!box) return;
    const mid = box.getBoundingClientRect().left + box.clientWidth / 2;
    let best = 0, bd = Infinity;
    [...box.children].forEach((node, i) => {
      const c = node as HTMLElement, r = c.getBoundingClientRect(), dx = Math.abs(r.left + r.width / 2 - mid);
      const d = Math.min(1.6, dx / (c.offsetWidth + 10));
      c.style.transform = `scale(${(1 - d * 0.2).toFixed(3)})`;
      c.style.opacity = (1 - d * 0.32).toFixed(3);
      if (dx < bd) { bd = dx; best = i; }
    });
    if (best !== last.current) {
      last.current = best; setActive(best);
      Sound.unlock(); Sound.play('pop');
      try { navigator.vibrate?.(8); } catch { /* no vibration on this device */ }
    }
  };
  const onScroll = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(paint); };
  useEffect(() => { center(active, false); paint(); return () => cancelAnimationFrame(raf.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (d: number) => center(Math.max(0, Math.min(ids.length - 1, active + d)));
  return (
    <div className="pic-wrap">
      <div className="pic-strip" ref={ref} onScroll={onScroll} role="listbox" aria-label="الصور"
        onKeyDown={e => { if (e.key === 'ArrowLeft') step(1); if (e.key === 'ArrowRight') step(-1); }}>
        {ids.map((id, i) => (
          <button key={id} role="option" aria-selected={i === active} className={'pic' + (i === active ? ' on' : '')} onClick={() => center(i)}>
            <GuestAvatar id={id} size={150} />
          </button>
        ))}
      </div>
      {/* right to left: the next picture is on the left */}
      <button className="pic-nav prev" aria-label="الصورة القبلها" disabled={active === 0} onClick={() => step(-1)}><IconBack /></button>
      <button className="pic-nav next" aria-label="الصورة الجاية" disabled={active === ids.length - 1} onClick={() => step(1)}><IconBack /></button>
    </div>
  );
}

export function Guest() {
  const go = useApp(s => s.go), addGuest = useApp(s => s.addGuest);
  const num = useNum();
  const guard = useGuard(350);
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [grade, setGrade] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [active, setActive] = useState(0);
  const who = { gender };
  const back = () => setStep(s => (s === 'gender' ? (navBack('entry'), s) : s === 'grade' ? 'gender' : 'grade'));
  const question: Record<Step, string> = {
    gender: 'إنت ولد ولا بنت؟',
    grade: say(who, 'في ياتو صف إنت؟', 'في ياتو صف إنتِ؟'),
    avatar: say(who, 'اختار صورتك', 'اختاري صورتك'),
  };
  const { ids: pics } = picturesFor(gender, grade);
  const pickGrade = (g: number | null) => { setGrade(g); setActive(picturesFor(gender, g).start); setStep('avatar'); };
  const finish = () => {
    const avatar = pics[Math.min(active, pics.length - 1)];
    addGuest({ gender, age: grade == null ? 5 : grade + 6, grade, avatar, name: name.trim().slice(0, 16) || undefined });
    go('path');
  };
  const stepIndex = ['gender', 'grade', 'avatar'].indexOf(step);

  return (
    <div className={'screen sand guest step-' + step}>
      <header className="guest-top">
        <button className="icon-btn back-btn" aria-label="رجوع" onClick={guard(back)}><IconBack /></button>
        <div className="dots" aria-label={`الخطوة ${stepIndex + 1} من ٣`}>{[0, 1, 2].map(i => <i key={i} className={i <= stepIndex ? 'on' : ''} />)}</div>
        <span style={{ width: 56 }} />
      </header>
      <div className="guest-siraj"><SirajLive action={step === 'avatar' ? 'cheer' : 'think'} /></div>
      <Bubble style={{ alignSelf: 'center', marginTop: -8 }}>{question[step]}</Bubble>
      <AnimatePresence mode="wait">
        <motion.div key={step} className="guest-body" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }}>
          {step === 'gender' && (
            <div className="pick-two">
              {([['m', 'ولد', 'boy'], ['f', 'بنت', 'girl']] as const).map(([g, label, img]) => (
                <button key={g} className="gender-card lift" onClick={guard(() => { setGender(g); setStep('grade'); })}>
                  <img src={artUrl(`avatars/${img}.webp`)} alt="" draggable={false} />
                  <span className="gender-label">{label}</span>
                </button>
              ))}
            </div>
          )}
          {step === 'grade' && (
            <div className="grades">
              <button className="kg-btn lift" onClick={guard(() => pickGrade(null))}>
                <IconBlocks />
                <span>{say(who, 'ما دخلت المدرسة', 'ما دخلت المدرسة')} <small>(روضة)</small></span>
              </button>
              <div className="grade-grid">
                {[1, 2, 3, 4, 5, 6].map(g => (
                  <button key={g} className="grade-card lift" aria-label={`الصف ${GRADE_WORDS[g - 1]}`} onClick={guard(() => pickGrade(g))}>
                    <b>{num(g)}</b><small>الصف</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'avatar' && (
            <div className="pick-picture">
              <PictureStrip ids={pics} active={active} setActive={setActive} />
              <button className="btn big avatar-go" onClick={guard(finish)}>يلا نبدأ</button>
              <div className="guest-name quiet">
                <label htmlFor="guest-name">{say(who, 'اسمك (لو داير، ممكن تخلّيه):', 'اسمك (لو دايرة، ممكن تخلّيه):')}</label>
                <input id="guest-name" className="code" maxLength={16} autoComplete="off" dir="rtl" placeholder={gender === 'f' ? 'ضيفة' : 'ضيف'} value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

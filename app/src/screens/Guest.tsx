// Guest mode in three short questions from Siraj, then a picture: boy or girl (needed for how Siraj speaks),
// age as big round numbers on a gentle arc, and school grade as little terraces (or "not at school yet").
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useNum } from '../lib/num';
import { useApp } from '../state/store';
import { GUEST_AVATARS, GuestAvatar } from '../ui/GuestAvatars';
import { IconBack } from '../ui/Icons';
import { back as navBack } from '../ui/nav';
import { Bubble, say, useGuard } from '../ui/kit';
import { SirajLive } from './Entry';

type Step = 'gender' | 'age' | 'grade' | 'avatar';
const AGES = [3, 4, 5, 6, 7, 8, 9, 10, 11];

export function Guest() {
  const go = useApp(s => s.go), addGuest = useApp(s => s.addGuest);
  const num = useNum();
  const guard = useGuard(350);
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [age, setAge] = useState(7);
  const [grade, setGrade] = useState<number | null>(null);
  const [name, setName] = useState('');
  const who = { gender };
  const back = () => setStep(s => (s === 'gender' ? (navBack('entry'), s) : s === 'age' ? 'gender' : s === 'grade' ? 'age' : age <= 4 ? 'age' : 'grade'));
  const question: Record<Step, string> = {
    gender: 'إنت ولد ولا بنت؟',
    age: say(who, 'عمرك كم سنة؟', 'عمرك كم سنة؟'),
    grade: say(who, 'في ياتو صف إنت؟', 'في ياتو صف إنتِ؟'),
    avatar: say(who, 'اختار صورتك', 'اختاري صورتك'),
  };
  const avatars = [...GUEST_AVATARS].sort((a, b) => Number(b.gender === gender) - Number(a.gender === gender));
  const finish = (avatar: string) => { addGuest({ gender, age, grade, avatar, name: name.trim().slice(0, 16) || undefined }); go('path'); };
  const stepIndex = ['gender', 'age', 'grade', 'avatar'].indexOf(step);

  return (
    <div className="screen sand guest">
      <header className="guest-top">
        <button className="icon-btn back-btn" aria-label="رجوع" onClick={guard(back)}><IconBack /></button>
        <div className="dots" aria-label={`الخطوة ${stepIndex + 1} من ٤`}>{[0, 1, 2, 3].map(i => <i key={i} className={i <= stepIndex ? 'on' : ''} />)}</div>
        <span style={{ width: 56 }} />
      </header>
      <div className="guest-siraj"><SirajLive action={step === 'avatar' ? 'cheer' : 'think'} /></div>
      <Bubble style={{ alignSelf: 'center', marginTop: -8 }}>{question[step]}</Bubble>
      <AnimatePresence mode="wait">
        <motion.div key={step} className="guest-body" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }}>
          {step === 'gender' && (
            <div className="pick-two">
              {([['m', 'ولد', 'g1'], ['f', 'بنت', 'g5']] as const).map(([g, label, av]) => (
                <button key={g} className="card pick-big lift" onClick={guard(() => { setGender(g); setStep('age'); })}>
                  <GuestAvatar id={av} size={132} /><span className="t-h2">{label}</span>
                </button>
              ))}
            </div>
          )}
          {step === 'age' && (
            <div className="age-arc">
              {AGES.map((a, i) => (
                <button key={a} className={'age-ball' + (a === age ? ' on' : '')} style={{ ['--lift' as string]: `${[16, 0, 16][i % 3]}px` }}
                  onClick={guard(() => { setAge(a); if (a <= 4) { setGrade(null); setStep('avatar'); } else setStep('grade'); })}>
                  {a === 11 ? <span>{num(10)}<small>+</small></span> : num(a)}
                </button>
              ))}
            </div>
          )}
          {step === 'grade' && (
            <div className="grades">
              <div className="terraces">
                {[1, 2, 3, 4, 5, 6].map(g => (
                  <button key={g} className="terrace" style={{ ['--h' as string]: `${56 + (g - 1) * 10}px` }} onClick={guard(() => { setGrade(g); setStep('avatar'); })}>
                    <span className="t-h2">{num(g)}</span>
                  </button>
                ))}
              </div>
              <button className="btn paper wide" onClick={guard(() => { setGrade(null); setStep('avatar'); })}>
                {say(who, 'لسه ما دخلت المدرسة', 'لسه ما دخلت المدرسة')}
              </button>
            </div>
          )}
          {step === 'avatar' && (
            <div className="guest-name">
              <label htmlFor="guest-name" className="t-body">{say(who, 'اسمك (لو داير):', 'اسمك (لو دايرة):')}</label>
              <input id="guest-name" className="code" maxLength={16} autoComplete="off" dir="rtl" placeholder={gender === 'f' ? 'ضيفة' : 'ضيف'} value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          {step === 'avatar' && (
            <div className="avatars">
              {avatars.map(a => (
                <button key={a.id} className="avatar-pick lift" onClick={guard(() => finish(a.id))} aria-label={a.gender === 'f' ? 'صورة بنت' : 'صورة ولد'}>
                  <GuestAvatar id={a.id} size={88} />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

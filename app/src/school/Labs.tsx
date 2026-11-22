// The two labs of lessons 1-2 (علوم.md, section 5). Original drawings in the identity style, real interaction:
//   BreathingModel (d1): the book's bottle model. Pull the lower balloon down -> the two inner balloons grow (inhale);
//     let go -> they shrink (exhale). After one full breath the result line appears.
//   FoodJourney (d2): drag the morsel from station to station in order (a wrong station sends it back); at each station
//     pick its work from the six cards (a wrong card shakes and returns); the station's result line appears; the liver
//     and pancreas glow at station 5; a closing line at the end.
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, useAnimationControls, type PanInfo } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { g, type LessonData } from './book';
import { HelpBox, shuffle, type Help } from './Questions';
import { Sfx } from './sfx';

const INK = '#2B2118';

export function BreathingModel({ lab, gender, help, onDone, instruction }: { lab: LessonData['lab']; gender: 'm' | 'f'; help: Help; onDone: () => void; instruction: string }) {
  const y = useMotionValue(0);
  const [phase, setPhase] = useState<'rest' | 'in' | 'out' | 'done'>('rest');
  const inhaled = useRef(false);
  const lung = useTransform(y, [0, 70], [1, 1.42]);
  const membrane = useTransform(y, v => `M52 300 Q150 ${300 + v * 1.7} 248 300`);
  const knobY = useTransform(y, v => 300 + v * 0.85);
  useMotionValueEvent(y, 'change', v => {
    if (v > 52 && !inhaled.current) { inhaled.current = true; setPhase('in'); void Sfx.play('lab-air-in'); }
  });
  const release = () => {
    void Sfx.play('lab-release');
    void animate(y, 0, { type: 'spring', stiffness: 160, damping: 14 });
    if (inhaled.current) {
      setPhase('out'); void Sfx.play('lab-air-out');
      setTimeout(() => { setPhase('done'); void Sfx.play('lab-result'); }, 900);
    }
  };
  return (
    <div className="lab">
      <p className="lab-instr">{instruction}</p>
      <div className="lab-stage breathing">
        <svg viewBox="0 0 300 380" className="lab-svg" aria-label="نموذج الرئتين">
          {/* the glass bottle */}
          <path d="M112 40h76v26c40 14 64 50 64 96v138H48V162c0-46 24-82 64-96z" fill="#C7E1E9" opacity=".38" />
          <path d="M112 40h76v26c40 14 64 50 64 96v138M48 300V162c0-46 24-82 64-96V40" fill="none" stroke={INK} strokeWidth="2.4" opacity=".55" />
          <path d="M66 170c4-36 22-62 50-74" fill="none" stroke="#FFFBF3" strokeWidth="7" strokeLinecap="round" opacity=".6" />
          <rect x="106" y="26" width="88" height="22" rx="6" fill="#8A5A3B" />
          {/* the windpipe and its two branches */}
          <path d="M150 8v88M150 96c-10 10-22 18-34 28M150 96c10 10 22 18 34 28" fill="none" stroke="#E6DACA" strokeWidth="10" strokeLinecap="round" />
          <path d="M150 8v88M150 96c-10 10-22 18-34 28M150 96c10 10 22 18 34 28" fill="none" stroke={INK} strokeWidth="1.4" opacity=".4" />
          {/* the two balloons (the lungs) */}
          {[[112, -1], [188, 1]].map(([cx, s]) => (
            <motion.g key={cx} style={{ scale: lung, originX: `${cx}px`, originY: '128px' }}>
              <path d={`M${cx} 128c${s * 26} 2 ${s * 34} 24 ${s * 30} 46c${-s * 4} 20 ${-s * 18} 30 ${-s * 30} 30s${-s * 26} -10 ${-s * 30} -30c${-s * 4} -22 ${s * 4} -44 ${s * 30} -46z`} fill="#E49CBB" />
              <path d={`M${cx - s * 16} 150c${s * 4} -8 ${s * 10} -12 ${s * 16} -12`} fill="none" stroke="#FFFBF3" strokeWidth="5" strokeLinecap="round" opacity=".55" />
            </motion.g>
          ))}
          {/* the lower balloon (the diaphragm) */}
          <motion.path d={membrane} fill="#D9643A" stroke="#963C1C" strokeWidth="2" />
          <motion.circle cx="150" cy={knobY} r="13" fill="#963C1C" />
        </svg>
        <span className="lab-label l1">الرئتان</span><span className="lab-label l2">القصبة الهوائية</span><span className="lab-label l3">الحجاب الحاجز</span>
        <motion.div className="pull-handle" drag="y" dragConstraints={{ top: 0, bottom: 70 }} dragElastic={0.05} dragMomentum={false} style={{ y }}
          onDragStart={() => void Sfx.play('lab-pull')} onDragEnd={release} aria-label="اسحب البالون السفلي" role="slider" aria-valuemin={0} aria-valuemax={70}>
          <span />
        </motion.div>
        {(phase === 'in' || phase === 'out') && <motion.span key={phase} className={'phase-tag ' + phase} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>{phase === 'in' ? 'شهيق' : 'زفير'}</motion.span>}
      </div>
      {phase === 'done' && lab.result && (
        <motion.div className="lab-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p>{g(lab.result, gender)}</p>
          <button className="btn-next" onClick={onDone}>متابعة</button>
        </motion.div>
      )}
      <HelpBox help={help} hint={false} reveal={false} />
    </div>
  );
}

// station centres on the body drawing (viewBox 0 0 240 400)
const AT: [number, number][] = [[120, 76], [120, 108], [124, 150], [150, 196], [118, 266], [164, 282]];

export function FoodJourney({ lab, help, onDone, instruction }: { lab: LessonData['lab']; help: Help; onDone: () => void; instruction: string }) {
  const st = lab.stations ?? [];
  const [at, setAt] = useState(-1);            // the station the morsel is in (-1 = on the plate)
  const [chosen, setChosen] = useState(-1);    // the station whose card is solved
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const morsel = useAnimationControls();
  const cards = useMemo(() => (at >= 0 ? shuffle(st.map(s => s.card)) : []), [at, st]);
  const waiting = at === chosen;               // solved: ready to move on
  const finished = chosen === st.length - 1;
  const toXY = (i: number) => {
    const r = svgRef.current!.getBoundingClientRect(), [x, y] = i < 0 ? [40, 40] : AT[i];
    return { x: (x / 240) * r.width, y: (y / 400) * r.height };
  };
  const moveTo = (i: number) => { setAt(i); setWrong(0); void morsel.start({ ...toXY(i), transition: { type: 'spring', stiffness: 220, damping: 20 } }); void Sfx.play('lab-move'); };
  const tryStation = (i: number) => {
    if (finished || !waiting && at !== -1) return;            // first solve the station you are in
    if (i === at + 1) moveTo(i);
    else { void Sfx.play('locked'); void morsel.start({ ...toXY(at), transition: { type: 'spring', stiffness: 260, damping: 18 } }); }
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((info.point.x - r.left) / r.width) * 240, py = ((info.point.y - r.top) / r.height) * 400;
    let best = -1, bd = 1e9; AT.forEach(([x, y], i) => { const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = i; } });
    if (bd < 34) tryStation(best); else void morsel.start({ ...toXY(at), transition: { type: 'spring', stiffness: 260, damping: 18 } });
  };
  const pick = (c: string) => {
    if (waiting) return;
    void Sfx.play('card-touch');
    if (c === st[at].card) { setChosen(at); void Sfx.play('correct'); if (at === st.length - 1) setTimeout(() => void Sfx.play('lab-result'), 600); }
    else { setBad(c); setWrong(w => { const n = w + 1; void Sfx.play('wrong'); if (n === 2) setTimeout(() => void Sfx.play('hint'), 450); return n; }); setTimeout(() => setBad(null), 450); }
  };
  const atRef = useRef(at); atRef.current = at;
  useEffect(() => {   // the morsel starts on the plate corner; keep it on its station when the screen resizes
    const place = () => { if (svgRef.current) morsel.set(toXY(atRef.current)); };
    const t = setTimeout(place, 60); addEventListener('resize', place);
    return () => { clearTimeout(t); removeEventListener('resize', place); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const glow5 = at === 4;
  return (
    <div className="lab">
      <p className="lab-instr">{instruction}</p>
      <div className="lab-stage journey">
        <svg ref={svgRef} viewBox="0 0 240 400" className="lab-svg body" aria-label="الجهاز الهضمي">
          <path d="M120 14c22 0 38 16 38 38s-16 40-38 40-38-18-38-40 16-38 38-38z" fill="#D9C4A6" />
          <path d="M106 90h28v18c34 4 56 22 60 52l8 200c0 14-10 24-24 24H62c-14 0-24-10-24-24l8-200c4-30 26-48 60-52z" fill="#E6DACA" />
          {/* mouth cavity (teeth and tongue, a cut-away, no face) */}
          <path d="M100 70c6 12 34 12 40 0-4 14-12 20-20 20s-16-6-20-20z" fill="#E49CBB" />
          <path d="M102 70h36" stroke="#FFFBF3" strokeWidth="5" strokeLinecap="round" strokeDasharray="4 2" />
          {/* pharynx, oesophagus */}
          <path d="M120 88v22c0 14 4 28 8 50 2 10 6 18 12 24" fill="none" stroke="#E5AE9A" strokeWidth="11" strokeLinecap="round" />
          {/* liver (viewer's left), stomach (viewer's right), pancreas */}
          <motion.path d="M56 168c20-10 54-12 74-4 4 14-6 28-26 32-20 4-40 0-52-10-4-8-2-14 4-18z" fill="#963C1C" animate={{ opacity: glow5 ? [0.7, 1, 0.7] : 0.75, filter: glow5 ? 'drop-shadow(0 0 6px #FFB627)' : 'none' }} transition={{ duration: 1.2, repeat: glow5 ? Infinity : 0 }} />
          <path d="M138 178c6 6 14 4 22 2 14-2 26 6 24 20-2 14-16 22-30 20-10-1-16-6-24-4-4 0-6-4-2-7 6-4 12-2 18-2 8 0 14-3 14-8s-6-6-12-5c-8 2-14-4-14-12z" fill="#E49CBB" />
          <motion.path d="M106 218c14-6 34-6 50 0-2 6-10 8-24 8s-22-2-26-8z" fill="#ECBF93" animate={{ filter: glow5 ? 'drop-shadow(0 0 6px #FFB627)' : 'none', opacity: glow5 ? [0.8, 1, 0.8] : 0.9 }} transition={{ duration: 1.2, repeat: glow5 ? Infinity : 0 }} />
          {/* large intestine frame, small intestine coils */}
          <path d="M76 318V240c0-6 4-10 10-10h70c6 0 10 4 10 10v72c0 8-6 12-14 12h-24" fill="none" stroke="#C9A676" strokeWidth="14" strokeLinecap="round" />
          <path d="M96 252c10-6 20 6 30 0s20-6 22 4-12 10-22 14-22 4-28 12 6 14 18 12 22-4 24 4" fill="none" stroke="#E5AE9A" strokeWidth="9" strokeLinecap="round" />
          {AT.map(([x, y], i) => (
            <g key={i} className={'jstation' + (i === at + 1 && (waiting || at === -1) && !finished ? ' next' : '') + (i <= chosen ? ' passed' : '')} onClick={() => tryStation(i)}>
              <circle cx={x} cy={y} r="13" />
            </g>
          ))}
        </svg>
        {st.map((s, i) => <span key={s.name} className={'jlabel j' + i + (i === at ? ' here' : '')} style={{ left: `${(AT[i][0] / 240) * 100}%`, top: `${(AT[i][1] / 400) * 100}%` }}>{s.name}</span>)}
        <motion.div className="morsel" drag={!finished} dragMomentum={false} onDragStart={() => void Sfx.play('card-touch')} onDragEnd={onDragEnd}
          animate={morsel} initial={{ x: 0, y: 0 }} style={{ left: 0, top: 0 }} aria-label="اللقمة">
          <img src={new URL('art/school/morsel.svg', document.baseURI).href} alt="" draggable={false} />
        </motion.div>
      </div>
      <div className="journey-side">
        {at >= 0 && !waiting && (
          <div className="q-cards six">
            {cards.map(c => (
              <motion.button data-own-sfx key={c} className={'qcard' + (bad === c ? ' bad' : '') + (wrong >= 3 && c === st[at].card ? ' glow' : '')}
                animate={bad === c ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.38 }} onClick={() => pick(c)}>{c}</motion.button>
            ))}
          </div>
        )}
        {at >= 0 && !waiting && wrong >= 2 && help && <HelpBox help={{ hint: help.hint, explain: help.hint }} hint reveal={false} />}
        {waiting && at >= 0 && <motion.p key={at} className="lab-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{st[at].result}</motion.p>}
        {finished && (
          <motion.div className="lab-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {lab.closing && <p>{lab.closing}</p>}
            <button className="btn-next" onClick={onDone}>متابعة</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

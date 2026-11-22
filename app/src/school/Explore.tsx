// «اكتشف»: the child discovers the lesson with their hands before reading about it. A general, data-driven component:
// a figure from the FIGURES library (original identity-style anatomy drawings with named parts) + ordered steps from
// the lesson design file (public/school-data/<book>/lessons.design.json). Each step reveals ONE explanation card of the
// book file at the moment of discovery. Step types (reusable by any lesson / book):
//   trace  the child moves a traveller (air, morsel…) through parts in order; each part lights as it is reached
//   tap    the child touches the glowing part; it plays its animation (flap, exchange, chew, digest, absorb, dissolve)
//   hold   the child presses and holds, then lets go (e.g. breathe in / out)
// New figures and animations are added here as general pieces, so the next lessons and books can use them.
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { artUrl } from './book';
import { Sfx } from './sfx';

export type Step = { type: 'trace' | 'tap' | 'hold'; card: number; path?: string[]; part?: string; anim?: string; light?: string[] };
export type ExploreDesign = { figure: keyof typeof FIGURES; traveller?: string; steps: Step[] };

type Fig = { vb: string; parts: Record<string, { at: [number, number]; label?: string }>; draw: (s: FigState) => ReactNode };
type FigState = { lit: Set<string>; act: string | null; holding: boolean };
const INK = '#2B2118';
const glow = (on: boolean) => (on ? { filter: 'drop-shadow(0 0 6px #FFB627)', opacity: 1 } : { filter: 'none', opacity: 0.9 });

export const FIGURES: Record<'airway' | 'digestive', Fig> = {
  airway: {
    vb: '0 0 240 400',
    parts: {
      nasal: { at: [120, 58], label: 'الأنف' }, pharynx: { at: [120, 90], label: 'البلعوم' }, larynx: { at: [120, 114], label: 'الحنجرة' },
      trachea: { at: [120, 150], label: 'القصبة الهوائية' }, lungs: { at: [92, 228], label: 'الرئتان' }, diaphragm: { at: [120, 300], label: 'الحجاب الحاجز' },
    },
    draw: ({ lit, act, holding }) => (
      <>
        <path d="M120 14c22 0 38 16 38 38s-16 40-38 40-38-18-38-40 16-38 38-38z" fill="#D9C4A6" />
        <path d="M106 88h28v18c34 4 56 22 60 52l8 200c0 14-10 24-24 24H62c-14 0-24-10-24-24l8-200c4-30 26-48 60-52z" fill="#E6DACA" />
        {/* nasal cavity, pharynx (a cut-away, no face) */}
        <motion.path d="M104 54c6-8 26-8 32 0-2 6-8 10-16 10s-14-4-16-10z" fill="#E5AE9A" animate={glow(lit.has('nasal'))} />
        <motion.path d="M114 62h12v40h-12z" fill="#E5AE9A" animate={glow(lit.has('pharynx'))} />
        {/* larynx with the epiglottis flap */}
        <motion.rect x="111" y="104" width="18" height="16" rx="5" fill="#C98B7A" animate={glow(lit.has('larynx'))} />
        <motion.path d="M118 104l-10-6" stroke={INK} strokeWidth="3" strokeLinecap="round" style={{ originX: '118px', originY: '104px' }}
          animate={{ rotate: act === 'flap' ? [0, 38, 38, 0] : 0 }} transition={{ duration: 2.4, times: [0, 0.2, 0.8, 1] }} />
        {/* windpipe with its rings, bronchi */}
        <motion.g animate={glow(lit.has('trachea'))}>
          <rect x="113" y="120" width="14" height="56" rx="5" fill="#C7E1E9" />
          {[128, 138, 148, 158, 168].map(y => <path key={y} d={`M113 ${y}h14`} stroke={INK} strokeWidth="1.2" opacity=".4" />)}
          <path d="M120 176c-10 8-20 14-30 22M120 176c10 8 20 14 30 22" stroke="#C7E1E9" strokeWidth="8" strokeLinecap="round" fill="none" />
        </motion.g>
        {/* lungs grow when breathing in (hold) */}
        <motion.g animate={{ scale: holding ? 1.14 : 1, ...glow(lit.has('lungs')) }} style={{ originX: '120px', originY: '190px' }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
          <path d="M108 186c-14-8-38 4-42 32-4 26 4 52 22 54 14 1 20-8 20-22z" fill="#E49CBB" />
          <path d="M132 186c14-8 38 4 42 32 4 26-4 52-22 54-14 1-20-8-20-22z" fill="#E49CBB" />
          <path d="M80 206c4-6 10-9 16-9-6 3-11 7-13 13z" fill="#FFFBF3" opacity=".5" />
        </motion.g>
        {/* the diaphragm moves down when breathing in */}
        <motion.path d="M62 296c30-22 86-22 116 0" stroke="#D9643A" strokeWidth="7" strokeLinecap="round" fill="none" animate={{ y: holding ? 14 : 0 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }} />
        {act === 'exchange' && [0, 1, 2, 3].map(i => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: i % 2 ? [40, 0] : [0, -40], y: [0, 6] }} transition={{ duration: 1.6, delay: i * 0.35, repeat: 2 }}>
            <circle cx={i % 2 ? 150 : 96} cy={220 + i * 8} r="5" fill={i % 2 ? '#1F5FAD' : '#3E9B4F'} />
          </motion.g>
        ))}
      </>
    ),
  },
  digestive: {
    vb: '0 0 240 400',
    parts: {
      morsel: { at: [40, 40] }, mouth: { at: [120, 76], label: 'الفم والأسنان' }, stomach: { at: [152, 196], label: 'المعدة' },
      liver: { at: [86, 182], label: 'الكبد' }, pancreas: { at: [130, 222], label: 'البنكرياس' }, small: { at: [118, 266], label: 'الأمعاء الدقيقة' },
      large: { at: [164, 290], label: 'الأمعاء الغليظة' },
    },
    draw: ({ lit, act }) => (
      <>
        <path d="M120 14c22 0 38 16 38 38s-16 40-38 40-38-18-38-40 16-38 38-38z" fill="#D9C4A6" />
        <path d="M106 90h28v18c34 4 56 22 60 52l8 200c0 14-10 24-24 24H62c-14 0-24-10-24-24l8-200c4-30 26-48 60-52z" fill="#E6DACA" />
        <motion.g animate={glow(lit.has('mouth'))}>
          <path d="M100 70c6 12 34 12 40 0-4 14-12 20-20 20s-16-6-20-20z" fill="#E49CBB" />
          <motion.path d="M102 70h36" stroke="#FFFBF3" strokeWidth="5" strokeLinecap="round" strokeDasharray="4 2" animate={{ y: act === 'chew' ? [0, 3, 0, 3, 0] : 0 }} transition={{ duration: 1.2 }} />
        </motion.g>
        <path d="M120 88v22c0 14 4 28 8 50 2 10 6 18 12 24" fill="none" stroke="#E5AE9A" strokeWidth="11" strokeLinecap="round" />
        <motion.path d="M56 168c20-10 54-12 74-4 4 14-6 28-26 32-20 4-40 0-52-10-4-8-2-14 4-18z" fill="#963C1C" animate={glow(lit.has('liver'))} />
        <motion.path d="M138 178c6 6 14 4 22 2 14-2 26 6 24 20-2 14-16 22-30 20-10-1-16-6-24-4-4 0-6-4-2-7 6-4 12-2 18-2 8 0 14-3 14-8s-6-6-12-5c-8 2-14-4-14-12z" fill="#E49CBB" animate={glow(lit.has('stomach'))} />
        <motion.path d="M106 218c14-6 34-6 50 0-2 6-10 8-24 8s-22-2-26-8z" fill="#ECBF93" animate={glow(lit.has('pancreas'))} />
        <motion.path d="M76 318V240c0-6 4-10 10-10h70c6 0 10 4 10 10v72c0 8-6 12-14 12h-24" fill="none" stroke="#C9A676" strokeWidth="14" strokeLinecap="round" animate={glow(lit.has('large'))} />
        <motion.path d="M96 252c10-6 20 6 30 0s20-6 22 4-12 10-22 14-22 4-28 12 6 14 18 12 22-4 24 4" fill="none" stroke="#E5AE9A" strokeWidth="9" strokeLinecap="round" animate={glow(lit.has('small'))} />
        {act === 'absorb' && [0, 1, 2, 3, 4].map(i => (
          <motion.circle key={i} cx={164} cy={250 + i * 14} r="4" fill="#5CB8D6" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, 26] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: 2 }} />
        ))}
        {/* the morsel; it falls apart into tiny pieces ("a simple food that dissolves") */}
        {act !== 'dissolve' ? <motion.image href={artUrl('art/school/morsel.svg')} x="18" y="18" width="44" height="44" animate={glow(lit.has('morsel'))} />
          : [0, 1, 2, 3, 4, 5, 6, 7].map(i => <motion.circle key={i} cx={40} cy={40} r="4" fill="#ECBF93" initial={{ opacity: 1 }} animate={{ x: Math.cos(i) * 22, y: Math.sin(i) * 22, opacity: [1, 1, 0.3] }} transition={{ duration: 1.4 }} />)}
      </>
    ),
  },
};

export function Explore({ design, cards, instr, onDone }: { design: ExploreDesign; cards: string[]; instr: Record<string, string>; onDone: () => void }) {
  const fig = FIGURES[design.figure];
  const [i, setI] = useState(0);                 // current step
  const [solved, setSolved] = useState(false);   // current step done (its card is shown)
  const [lit, setLit] = useState<Set<string>>(new Set());
  const [act, setAct] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [k, setK] = useState(0);                 // trace progress (index in path)
  const held = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const step = design.steps[i];
  useEffect(() => { setSolved(false); setK(0); setAct(null); held.current = false; }, [i]);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (solved) setTimeout(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120); }, [solved]);
  const light = (ids: string[]) => setLit(prev => new Set([...prev, ...ids]));
  const finishStep = () => { setSolved(true); void Sfx.play('flip'); };
  // trace: move the finger / mouse near the next part of the path
  const toSvg = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(), [, , w, h] = fig.vb.split(' ').map(Number); return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * h]; };
  const onMove = (e: React.PointerEvent) => {
    if (step.type !== 'trace' || solved || !step.path) return;
    const next = step.path[k]; if (!next) return;
    const [x, y] = toSvg(e), [px, py] = fig.parts[next].at;
    if (Math.hypot(px - x, py - y) < 30) advance();
  };
  const advance = () => {
    if (!step.path) return;
    const part = step.path[k]; light([part]); void Sfx.play('station-ding', { rate: 1 + k * 0.08 });
    if (k + 1 >= step.path.length) finishStep(); else setK(k + 1);
  };
  const tap = (part: string) => {
    if (solved) return;
    if (step.type === 'trace' && step.path?.[k] === part) return advance();
    if (step.type !== 'tap' || step.part !== part) return;
    light(step.light ?? [part]); setAct(step.anim ?? null); void Sfx.play('lab-result'); setTimeout(finishStep, 900);
  };
  const press = (down: boolean) => {
    if (step.type !== 'hold' || solved) return;
    setHolding(down);
    if (down) { held.current = true; void Sfx.play('lab-air-in'); }
    else if (held.current) { void Sfx.play('lab-air-out'); light(['lungs', 'diaphragm']); setTimeout(finishStep, 700); }
  };
  // the traveller sits on the last part it reached (before the first part at the start)
  const path = step.path ?? [];
  const tr = step.type !== 'trace' ? null : solved ? fig.parts[path[path.length - 1]] : k > 0 ? fig.parts[path[k - 1]] : { at: [fig.parts[path[0]].at[0], fig.parts[path[0]].at[1] - 26] as [number, number] };
  const target = step.type === 'trace' ? step.path?.[k] : step.type === 'tap' ? step.part : undefined;
  return (
    <div className="explore">
      <p className="lab-instr">{instr[step.type]}</p>
      <div className="explore-stage" onPointerMove={onMove}>
        <svg ref={svg} viewBox={fig.vb} className="lab-svg body" aria-label="رسم توضيحي">
          {fig.draw({ lit, act, holding })}
          {target && !solved && <circle className="explore-target" cx={fig.parts[target].at[0]} cy={fig.parts[target].at[1]} r="15" onClick={() => tap(target)} />}
          {step.type === 'trace' && tr && design.traveller && (
            <motion.circle cx={tr.at[0]} cy={tr.at[1]} r="9" fill="#5CB8D6" stroke="#FFFBF3" strokeWidth="3" initial={false} animate={{ cx: tr.at[0], cy: tr.at[1] }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} />
          )}
        </svg>
        {Object.entries(fig.parts).map(([id, p]) => p.label && lit.has(id) &&
          <motion.span key={id} className="explore-label" style={{ left: `${(p.at[0] / 240) * 100}%`, top: `${(p.at[1] / 400) * 100}%` }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>{p.label}</motion.span>)}
        {step.type === 'hold' && !solved && (
          <button className="hold-btn" data-own-sfx onPointerDown={() => press(true)} onPointerUp={() => press(false)} onPointerLeave={() => holding && press(false)}
            onContextMenu={e => e.preventDefault()} aria-label={instr.hold}><span /></button>
        )}
      </div>
      <div className="explore-side">
        <div className="explore-dots" aria-hidden>{design.steps.map((_, j) => <i key={j} className={j < i || (j === i && solved) ? 'done' : j === i ? 'now' : ''} />)}</div>
        {solved && (
          <motion.div ref={cardRef} className="explore-card" initial={{ opacity: 0, y: 14, rotateX: -40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
            <p>{cards[step.card]}</p>
            <button className="btn-next" onClick={() => (i + 1 < design.steps.length ? setI(i + 1) : onDone())}>{i + 1 < design.steps.length ? 'التالي' : 'إلى المختبر'}</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

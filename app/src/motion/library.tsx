// The motion library: every reusable piece of the explainers, driven only by data (types.ts).
// RULE: a better entrance, transition or scene REPLACES the old one here, so every book gets it at once. A movement a
// new book needs and the library lacks is added here as a general layer or option, never as code for one book.
// Pictures are the original identity-style drawings of public/art/school. Sizes use container units, so one scene
// fits the 16:9 computer stage and the squarer phone stage.
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Anim, Item, Layer, Loop, Scene, Side, Target } from './types';

export type Ctx = { on: (k?: string) => boolean; cover: string; logo: string; art: (name: string) => string };

const spring = { type: 'spring', stiffness: 260, damping: 18 } as const;
const FROM: Record<Anim, Target> = {
  pop: { opacity: 0, scale: 0.2 }, grow: { opacity: 0, scaleY: 0.1, scaleX: 0.6 }, drop: { opacity: 0, y: '-60cqh' },
  left: { opacity: 0, x: '-60cqw' }, right: { opacity: 0, x: '60cqw' }, fade: { opacity: 0 }, rise: { opacity: 0, y: '30cqh' },
};
const LOOP: Record<Loop, { animate: Target; transition: Record<string, unknown> }> = {
  float: { animate: { y: [0, -6, 0] }, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  bob: { animate: { y: [0, -4, 0] }, transition: { duration: 0.9, repeat: Infinity } },
  spin: { animate: { rotate: [0, 360] }, transition: { duration: 6, repeat: Infinity, ease: 'linear' } },
  pulse: { animate: { scale: [1, 1.06, 1] }, transition: { duration: 1.2, repeat: Infinity } },
  flap: { animate: { scaleY: [1, 0.7, 1] }, transition: { duration: 0.35, repeat: Infinity } },
  wobble: { animate: { rotate: [0, -4, 4, 0] }, transition: { duration: 1.6, repeat: Infinity } },
};

/** one placed thing: centred on (x, y), size s, entrance a, optional moves (positions from later cues) */
export function Placed({ show, x, y, s, a = 'pop', delay = 0, origin = 'center', to, z, chip, loop, children }: {
  show: boolean; x: number; y: number; s: number; a?: Anim; delay?: number; origin?: string; to?: Target; z?: number; chip?: boolean; loop?: Loop; children: ReactNode;
}) {
  const body = loop ? <motion.div animate={LOOP[loop].animate as never} transition={LOOP[loop].transition}>{children}</motion.div> : children;
  return (
    <motion.div className="it" style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%', ['--s' as string]: s, zIndex: z }}
      initial={false} animate={{ left: `${x}%`, top: `${y}%`, ['--s' as string]: s } as never} transition={{ type: 'spring', stiffness: 90, damping: 16 }}>
      <motion.div className={'it-in' + (chip ? ' chip' : '')} style={{ transformOrigin: origin }} initial={FROM[a] as never}
        animate={(show ? { opacity: 1, scale: 1, scaleX: 1, scaleY: 1, x: 0, y: 0, ...to } : FROM[a]) as never} transition={{ ...spring, delay }}>
        {body}
      </motion.div>
    </motion.div>
  );
}

function ItemView({ it, c }: { it: Item; c: Ctx }) {
  const shown = c.on(it.cue) && !(it.hide && c.on(it.hide));
  let { x, y, s } = it;
  for (const m of it.at ?? []) if (c.on(m.cue)) { x = m.x ?? x; y = m.y ?? y; s = m.s ?? s; }
  const src = it.art === '@cover' ? c.cover : it.art === '@logo' ? c.logo : it.art ? c.art(it.art) : '';
  const pic = it.text ? <span className="it-text">{it.text}</span> : <img src={src} alt="" draggable={false} className={it.art === '@logo' ? 'logo-mark' : undefined} />;
  if (it.fly) {
    const f = it.fly, go = c.on(f.cue);
    return (
      <motion.div className="it" style={{ ['--s' as string]: s, top: `${y}%`, x: '-50%', y: '-50%', zIndex: it.z }} initial={{ left: `${f.x[0]}%`, opacity: 0 }}
        animate={go ? { left: f.x.map(v => `${v}%`), opacity: 1, ...(f.y ? { y: f.y.map(v => `calc(-50% + ${v}px)`) } : {}) } as never : {}} transition={{ duration: f.dur, ease: 'easeOut' }}>
        <div className="it-in">{it.loop ? <motion.div animate={LOOP[it.loop].animate as never} transition={LOOP[it.loop].transition}>{pic}</motion.div> : pic}</div>
      </motion.div>
    );
  }
  return <Placed show={shown} x={x} y={y} s={s} a={it.a} delay={it.delay} origin={it.origin} to={it.to} z={it.z} chip={it.chip} loop={it.loop}>{pic}</Placed>;
}

const Sparkle = ({ show, x, y, s = 4, delay = 0 }: { show: boolean; x: number; y: number; s?: number; delay?: number }) => (
  <Placed show={show} x={x} y={y} s={s} delay={delay} to={{ rotate: [0, 90], scale: [1, 1.25, 1] }}>
    <svg viewBox="0 0 20 20" className="sparkle"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" /></svg>
  </Placed>
);
const TONE = { palm: '#3E9B4F', clay: '#D9643A', nile: '#1F5FAD', royal: '#7B61C9' };

function LayerView({ l, c }: { l: Layer; c: Ctx }) {
  switch (l.kind) {
    case 'ground': return (
      <svg className="ground" viewBox="0 0 160 30" preserveAspectRatio="none" aria-hidden>
        <path d="M0 10C40 4 80 6 160 12V30H0z" fill={l.night ? '#20253F' : '#E6DACA'} />{l.river && <path d="M70 16c30-6 60-6 90-2v16H62z" fill="#1F5FAD" opacity=".85" />}
        {l.river && <path d="M84 20c12-2 22-2 32 0M120 24c10-2 20-2 30 0" stroke="#9CBDE2" strokeWidth=".8" fill="none" />}
      </svg>);
    case 'stars': return <>{(l.points ?? [[8, 12], [22, 30], [40, 8], [55, 22], [92, 50], [12, 60], [70, 10]]).map(([x, y], i) => <span key={i} className="star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }} />)}</>;
    case 'road': {
      const show = c.on(l.cue), pts = l.points;
      const d = pts.map(([x, y], i) => (i ? `S ${x - 6} ${y} ${x} ${y}` : `M ${x} ${y}`)).join(' ');
      return (
        <>
          <svg className="road" viewBox="0 0 100 56.25" preserveAspectRatio="none" aria-hidden>
            <motion.path d={d} fill="none" stroke="#C9A676" strokeWidth="2.6" strokeLinecap="round" initial={{ pathLength: 0 } as never} animate={{ pathLength: show ? 1 : 0 } as never} transition={{ duration: 1.2, ease: 'easeInOut' }} />
            <motion.path d={d} fill="none" stroke="#FFFBF3" strokeWidth=".5" strokeDasharray="1.4 1.6" initial={{ pathLength: 0 } as never} animate={{ pathLength: show ? 1 : 0 } as never} transition={{ duration: 1.2, ease: 'easeInOut' }} />
          </svg>
          {pts.map(([x, y], i) => {
            const lit = !!l.lit?.[i] && c.on(l.lit[i]!);
            return (
              <motion.div key={i} className={'station' + (lit ? ' lit' : '') + (l.last === 'exam' && i === pts.length - 1 ? ' exam' : '')} style={{ left: `${x}%`, top: `${(y / 56.25) * 100}%` }}
                initial={{ scale: 0 }} animate={{ scale: show ? (lit ? [1, 1.35, 1.12] : 1) : 0 }} transition={{ ...spring, delay: show && !lit ? 0.25 + i * 0.12 : 0 }}>
                {l.labels?.[i] && <span>{l.labels[i]}</span>}
              </motion.div>
            );
          })}
        </>);
    }
    case 'ring': return <motion.div className="ring" style={{ x: '-50%', y: '-50%', left: `${l.x}%`, top: `${l.y}%`, width: `${l.size}cqw`, height: `${l.size}cqw`, borderColor: l.color }} initial={false} animate={{ opacity: c.on(l.cue) ? 1 : 0, scale: c.on(l.cue) ? 1 : 0.6 }} transition={spring} />;
    case 'aura': return <motion.div className="aura" style={{ x: '-50%', y: '-50%', left: `${l.x}%`, top: `${l.y}%`, width: `${l.size}cqw`, height: `${l.size}cqw` }} initial={false} animate={{ opacity: c.on(l.cue) ? 1 : 0, scale: c.on(l.cue) ? 1 : 0.5 }} transition={spring} />;
    case 'term': return <motion.h3 className="term-big" style={{ top: `${l.y ?? 6}%` }} initial={{ opacity: 0, scale: 0.6 }} animate={c.on(l.cue) ? { opacity: 1, scale: 1 } : {}} transition={spring}>{l.text}</motion.h3>;
    case 'plank': return <motion.div className="table-plank" style={{ top: `${l.y ?? 66}%` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: c.on(l.cue) && !(l.hide && c.on(l.hide)) ? 1 : 0, y: c.on(l.cue) ? 0 : 20 }} />;
    case 'group': return (
      <motion.div className="group-ring" style={{ x: '-50%', y: '-50%', left: `${l.x}%`, top: `${l.y}%`, width: `${l.size}cqw`, height: `${l.size}cqw`, borderColor: TONE[l.tone], background: TONE[l.tone] + '18' }}
        initial={false} animate={{ opacity: c.on(l.cue) ? 1 : 0, scale: c.on(l.cue) ? 1 : 0.5 }} transition={spring}>{l.label && <span className="group-label" style={{ color: TONE[l.tone] }}>{l.label}</span>}</motion.div>);
    case 'path': return (
      <svg className="journey-path" viewBox="0 0 100 56.25" aria-hidden>
        <motion.path d={l.d} fill="none" stroke={l.color ?? '#FFB627'} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 3.2"
          initial={{ pathLength: 0, opacity: 0 } as never} animate={{ pathLength: c.on(l.cue) ? 1 : 0, opacity: c.on(l.cue) ? 1 : 0 } as never} transition={{ duration: 1.6, ease: 'easeOut' }} />
      </svg>);
    case 'drops': return <>{l.xs.map((x, i) => (
      <motion.span key={i} className="drop-fall" style={{ left: `${x}%` }} initial={{ opacity: 0, top: `${l.from}%` }}
        animate={c.on(l.cue) && !(l.until && c.on(l.until)) ? { opacity: [0, 1, 0], top: [`${l.from}%`, `${l.to}%`] } : { opacity: 0 }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }} />))}</>;
    case 'sparkles': return <>{l.points.map(([x, y], i) => <Sparkle key={i} show={c.on(l.cue)} x={x} y={y} s={(l.size ?? 3) + (i % 2)} delay={i * 0.12} />)}</>;
    case 'book': {
      let { x, y } = l; for (const m of l.at ?? []) if (c.on(m.cue)) { x = m.x ?? x; y = m.y ?? y; }
      return (
        <Placed show={c.on(l.cue)} x={x} y={y} s={l.s} a="rise">
          <div className="open-book"><div className="ob-page" /><motion.img className="ob-cover" src={c.cover} alt="" draggable={false}
            initial={false} animate={{ rotateY: c.on(l.open) ? -150 : 0 }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }} /></div>
        </Placed>);
    }
    case 'button': return (
      <Placed show={c.on(l.cue)} x={l.x ?? 50} y={l.y ?? 64} s={30} delay={0.3}>
        <motion.div className="start-ghost" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>{l.text}</motion.div>
      </Placed>);
    // ---- general teaching templates
    case 'title': return (
      <motion.div className="m-title" initial={{ opacity: 0, y: 20 }} animate={c.on(l.cue) ? { opacity: 1, y: 0 } : {}} transition={spring}>
        {l.art && <img src={c.art(l.art)} alt="" draggable={false} />}<h3>{l.text}</h3>{l.sub && <p>{l.sub}</p>}
      </motion.div>);
    case 'card': return (
      <motion.div className="m-card" style={{ left: `${l.x ?? 50}%`, top: `${l.y ?? 52}%`, width: `${l.w ?? 56}%`, x: '-50%', y: '-50%' }}
        initial={{ opacity: 0, rotateX: -70 }} animate={c.on(l.cue) ? { opacity: 1, rotateX: 0 } : {}} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
        {l.art && <img src={c.art(l.art)} alt="" draggable={false} />}<div>{l.title && <b>{l.title}</b>}<p>{l.text}</p></div>
      </motion.div>);
    case 'steps': return (
      <ol className="m-steps" style={{ top: `${l.y ?? 18}%` }}>
        {l.items.map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: 30 }} animate={c.on(s.cue) ? { opacity: 1, x: 0 } : {}} transition={{ ...spring, delay: 0.05 }}>
            <span className="m-step-n">{(i + 1).toLocaleString('ar-EG')}</span>{s.art && <img src={c.art(s.art)} alt="" draggable={false} />}<em>{s.text}</em>
          </motion.li>))}
      </ol>);
    case 'compare': {
      const side = (sd: Side, k: string) => (
        <motion.div className="m-side" style={{ borderColor: TONE[sd.tone ?? 'nile'] }} initial={{ opacity: 0, y: 20 }} animate={c.on(l.cue) || !l.cue ? { opacity: 1, y: 0 } : {}} transition={spring} key={k}>
          <b style={{ color: TONE[sd.tone ?? 'nile'] }}>{sd.title}</b>
          {sd.items.map((it, i) => <motion.span key={i} initial={{ opacity: 0, scale: 0.6 }} animate={c.on(it.cue) ? { opacity: 1, scale: 1 } : {}} transition={spring}>
            {it.art && <img src={c.art(it.art)} alt="" draggable={false} />}{it.text}</motion.span>)}
        </motion.div>);
      return <div className="m-compare">{side(l.right, 'r')}{side(l.left, 'l')}</div>;
    }
    case 'labels': return <>{l.items.map((t, i) => (
      <motion.span key={i} className="m-label" style={{ left: `${t.x}%`, top: `${t.y}%`, x: '-50%', y: '-50%' }} initial={{ opacity: 0, scale: 0.6 }} animate={c.on(t.cue) ? { opacity: 1, scale: 1 } : {}} transition={spring}>{t.text}</motion.span>))}</>;
  }
}

/** one scene from data: its layers (back to front) and then its items */
export function SceneView({ scene, c }: { scene: Scene; c: Ctx }) {
  return <>{scene.layers?.map((l, i) => <LayerView key={'l' + i} l={l} c={c} />)}{scene.items?.map((it, i) => <ItemView key={'i' + i} it={it} c={c} />)}</>;
}
export const LIBRARY = ['ground', 'stars', 'road', 'ring', 'aura', 'term', 'plank', 'group', 'path', 'drops', 'sparkles', 'book', 'button', 'title', 'card', 'steps', 'compare', 'labels'] as const;

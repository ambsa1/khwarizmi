// The eight motion scenes of the first science explainer (grade 5). Each scene starts on its word from the timing file
// (علوم.md, section 4: «لما يتقال ← المشهد»); extra in-scene cues raise the written scenes. All pictures are original
// drawings in the identity style (tools/school-art.py). Sizes use container units, so the same scene fits the 16:9
// computer stage and the taller phone stage.
import { motion, type TargetAndTransition } from 'framer-motion';
import type { ReactNode } from 'react';
import { artUrl } from './book';

export type Cue = { key: string; word: string };
export type SceneDef = { cues: Cue[]; sfx: [string, string, number?][]; night?: boolean; View: (p: SceneProps) => JSX.Element };
export type SceneProps = { on: (k: string) => boolean; cover: string };

const art = (n: string) => artUrl(`art/school/${n}.svg`);
const spring = { type: 'spring', stiffness: 260, damping: 18 } as const;
type Anim = 'pop' | 'grow' | 'drop' | 'left' | 'right' | 'fade' | 'rise';
const FROM: Record<Anim, TargetAndTransition> = {
  pop: { opacity: 0, scale: 0.2 }, grow: { opacity: 0, scaleY: 0.1, scaleX: 0.6 }, drop: { opacity: 0, y: '-60cqh' },
  left: { opacity: 0, x: '-60cqw' }, right: { opacity: 0, x: '60cqw' }, fade: { opacity: 0 }, rise: { opacity: 0, y: '30cqh' },
};

/** a picture placed by its centre (x, y in % of the stage) with size s (in stage units) */
function It({ show, n, x, y, s, a = 'pop', delay = 0, origin = 'center', style, children, to, z, chip }: {
  show: boolean; n?: string; x: number; y: number; s: number; a?: Anim; delay?: number; origin?: string; style?: Record<string, string | number>;
  children?: ReactNode; to?: TargetAndTransition; z?: number; chip?: boolean;
}) {
  return (
    <motion.div className="it" style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%', ['--s' as string]: s, zIndex: z }}
      initial={false} animate={{ left: `${x}%`, top: `${y}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }}>
      <motion.div className={'it-in' + (chip ? ' chip' : '')} style={{ transformOrigin: origin, ...(style as object) }} initial={FROM[a] as never}
        animate={(show ? { opacity: 1, scale: 1, scaleX: 1, scaleY: 1, x: 0, y: 0, ...to } : FROM[a]) as never} transition={{ ...spring, delay }}>
        {n ? <img src={art(n)} alt="" draggable={false} /> : children}
      </motion.div>
    </motion.div>
  );
}
const Sparkle = ({ show, x, y, s = 4, delay = 0 }: { show: boolean; x: number; y: number; s?: number; delay?: number }) => (
  <It show={show} x={x} y={y} s={s} delay={delay} to={{ rotate: [0, 90], scale: [1, 1.25, 1] }}>
    <svg viewBox="0 0 20 20" className="sparkle"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" /></svg>
  </It>
);
const Ground = ({ river }: { river?: boolean }) => (
  <svg className="ground" viewBox="0 0 160 30" preserveAspectRatio="none" aria-hidden>
    <path d="M0 10C40 4 80 6 160 12V30H0z" fill="#E6DACA" />{river && <path d="M70 16c30-6 60-6 90-2v16H62z" fill="#1F5FAD" opacity=".85" />}
    {river && <path d="M84 20c12-2 22-2 32 0M120 24c10-2 20-2 30 0" stroke="#9CBDE2" strokeWidth=".8" fill="none" />}
  </svg>
);
/** the winding road of the map scenes, with N station points */
function Road({ show, points, lit, labels, exam }: { show: boolean; points: [number, number][]; lit: boolean[]; labels?: string[]; exam?: boolean }) {
  const d = points.map(([x, y], i) => (i ? `S ${x - 6} ${y} ${x} ${y}` : `M ${x} ${y}`)).join(' ');
  return (
    <>
      <svg className="road" viewBox="0 0 100 56.25" preserveAspectRatio="none" aria-hidden>
        <motion.path d={d} fill="none" stroke="#C9A676" strokeWidth="2.6" strokeLinecap="round" initial={{ pathLength: 0 } as never} animate={{ pathLength: show ? 1 : 0 } as never} transition={{ duration: 1.2, ease: 'easeInOut' }} />
        <motion.path d={d} fill="none" stroke="#FFFBF3" strokeWidth=".5" strokeDasharray="1.4 1.6" initial={{ pathLength: 0 } as never} animate={{ pathLength: show ? 1 : 0 } as never} transition={{ duration: 1.2, ease: 'easeInOut' }} />
      </svg>
      {points.map(([x, y], i) => (
        <motion.div key={i} className={'station' + (lit[i] ? ' lit' : '') + (exam && i === points.length - 1 ? ' exam' : '')} style={{ left: `${x}%`, top: `${(y / 56.25) * 100}%` }}
          initial={{ scale: 0 }} animate={{ scale: show ? (lit[i] ? [1, 1.35, 1.12] : 1) : 0 }} transition={{ ...spring, delay: show && !lit[i] ? 0.25 + i * 0.12 : 0 }}>
          {labels?.[i] && <span>{labels[i]}</span>}
        </motion.div>
      ))}
    </>
  );
}

export const EXPLAIN1: SceneDef[] = [
  { // 1. الترحيب: the Khwarizmi mark welcomes, the book opens, a road comes out of it, little sparkles
    cues: [{ key: 'a', word: 'أهلًا' }, { key: 'b', word: 'كتابَ' }, { key: 'c', word: 'رِحْلةً' }, { key: 'd', word: 'أسرارَ' }],
    sfx: [['a', 'welcome-chime'], ['b', 'book-open'], ['c', 'path-extend'], ['d', 'sparkles']],
    View: ({ on, cover }) => (
      <>
        <It show={on('a')} x={50} y={on('b') ? 16 : 42} s={on('b') ? 13 : 26} to={{ rotate: [0, -8, 8, 0] }}>
          <img src={artUrl('icons/icon-512.png')} alt="" className="logo-mark" draggable={false} />
        </It>
        <It show={on('b')} x={on('c') ? 30 : 50} y={60} s={30} a="rise">
          <div className="open-book">
            <div className="ob-page" /><motion.img className="ob-cover" src={cover} alt="" draggable={false}
              initial={false} animate={{ rotateY: on('c') ? -150 : 0 }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }} />
          </div>
        </It>
        <svg className="journey-path" viewBox="0 0 100 56.25" aria-hidden>
          <motion.path d="M36 34 C 52 30, 58 46, 72 38 S 88 18, 96 14" fill="none" stroke="#FFB627" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 3.2"
            initial={{ pathLength: 0, opacity: 0 } as never} animate={{ pathLength: on('c') ? 1 : 0, opacity: on('c') ? 1 : 0 } as never} transition={{ duration: 1.6, ease: 'easeOut' }} />
        </svg>
        {[[52, 56], [62, 70], [72, 64], [82, 44], [92, 28]].map(([x, y], i) => <Sparkle key={i} show={on('d')} x={x} y={y} s={3 + (i % 2)} delay={i * 0.14} />)}
      </>
    ),
  },
  { // 2. الخطّاف: a neem tree, a sparrow, a Nile fish, the children; they gather in one circle; eat, breathe, grow, water
    cues: [{ key: 'tree', word: 'شجرةُ' }, { key: 'bird', word: 'عُصْفور' }, { key: 'fish', word: 'سَمَكةٌ' }, { key: 'kids', word: 'أنتم' },
      { key: 'ring', word: 'كائِناتٌ' }, { key: 'i1', word: 'نأكُل' }, { key: 'i2', word: 'ونَتَنَفَّس' }, { key: 'i3', word: 'ونَكْبَر' }, { key: 'i4', word: 'ونحتاجُ' }],
    sfx: [['tree', 'tree-grow'], ['bird', 'bird-land'], ['fish', 'fish-splash'], ['kids', 'soft-pop'], ['ring', 'gather-swirl'],
      ['i1', 'kalimba-pluck', 1], ['i2', 'kalimba-pluck', 1.12], ['i3', 'kalimba-pluck', 1.26], ['i4', 'kalimba-pluck', 1.5]],
    View: ({ on }) => {
      const r = on('ring');
      return (
        <>
          <Ground river />
          <motion.div className="ring" style={{ x: '-50%', y: '-50%' }} initial={false} animate={{ opacity: r ? 1 : 0, scale: r ? 1 : 0.6 }} transition={spring} />
          <It show={on('tree')} n="tree" x={r ? 38 : 20} y={r ? 30 : 52} s={r ? 15 : 30} a="grow" origin="bottom" />
          <It show={on('bird')} n="bird" x={r ? 62 : 30} y={r ? 30 : 31} s={r ? 12 : 11} a="left" />
          <It show={on('fish')} n="fish" x={r ? 62 : 78} y={r ? 58 : 66} s={r ? 13 : 15} a="rise" to={r ? {} : { y: [0, -50, 0], rotate: [0, -25, 20, 0] }} />
          <It show={on('kids')} n="kids" x={r ? 38 : 52} y={r ? 58 : 58} s={r ? 13 : 22} />
          {(['plate', 'wind', 'grow', 'icon-drop'] as const).map((n, i) => (
            <It key={n} show={on('i' + (i + 1))} n={n} x={20 + i * 20} y={82} s={10} a="rise" z={3} chip />
          ))}
        </>
      );
    },
  },
  { // 3. الأهمية: the child glows healthy; good food; watering a tree with the ibreeq; the tap closes, the last drop shines
    cues: [{ key: 'a', word: 'نَعْتَني' }, { key: 'b', word: 'طعامًا' }, { key: 'c', word: 'نَسْقي' }, { key: 'd', word: 'قَطْرةَ' }],
    sfx: [['a', 'glow-shimmer'], ['b', 'plate-clink'], ['c', 'water-pour'], ['d', 'tap-drop']],
    View: ({ on }) => (
      <>
        <Ground />
        <motion.div className="aura" style={{ left: '20%', top: '52%', x: '-50%', y: '-50%' }} initial={false} animate={{ opacity: on('a') ? 1 : 0, scale: on('a') ? 1 : 0.5 }} transition={spring} />
        <It show n="kids" x={20} y={56} s={22} a="fade" />
        <It show={on('b')} n="plate" x={44} y={66} s={18} />
        <It show={on('c')} n="icon-seedling" x={66} y={68} s={11} a="grow" origin="bottom" />
        <It show={on('c')} n="ibreeq" x={60} y={40} s={14} a="right" to={{ rotate: -28 }} />
        {[0, 1, 2].map(i => (
          <motion.span key={i} className="drop-fall" style={{ left: `${63 + i * 1.5}%` }} initial={{ opacity: 0, top: '46%' }}
            animate={on('c') && !on('d') ? { opacity: [0, 1, 0], top: ['46%', '62%'] } : { opacity: 0 }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }} />
        ))}
        <It show={on('d')} n="icon-tap" x={86} y={42} s={16} a="drop" />
        <It show={on('d')} n="icon-drop" x={88} y={70} s={6} delay={0.6} a="drop" to={{ filter: ['drop-shadow(0 0 0 #fff)', 'drop-shadow(0 0 1.5cqw #FFFBF3)'] }} />
      </>
    ),
  },
  { // 4. الخريطة: a road with four stations; each lights with its picture (body, plants, animals, water)
    cues: [{ key: 'road', word: 'مَحَطّات' }, { key: 's1', word: 'الأولى' }, { key: 'air', word: 'الهواءُ' }, { key: 'food', word: 'اللُّقْمة' },
      { key: 's2', word: 'الثانية' }, { key: 's3', word: 'الثالثة' }, { key: 'birds', word: 'الطُّيورِ' }, { key: 'bugs', word: 'الحَشَرات' }, { key: 's4', word: 'الأخيرة' }],
    sfx: [['road', 'map-unroll'], ['s1', 'station-ding', 1], ['air', 'breath-in'], ['food', 'swallow-slide'], ['s2', 'station-ding', 1.12], ['s2', 'sprout-pop'],
      ['s3', 'station-ding', 1.26], ['birds', 'wing-flap'], ['bugs', 'bee-buzz'], ['s4', 'station-ding', 1.5], ['s4', 'drop-shine']],
    View: ({ on }) => {
      const pts: [number, number][] = [[14, 44], [38, 36], [62, 44], [86, 36]];
      return (
        <>
          <Road show={on('road')} points={pts} lit={[on('s1'), on('s2'), on('s3'), on('s4')]} labels={['أجسامنا', 'النباتات', 'الحيوانات', 'الماء']} />
          <It show={on('s1')} n="icon-lungs" x={14} y={36} s={13} />
          <It show={on('air')} n="wind" x={14} y={15} s={8} a="right" to={{ opacity: [0, 1, 0.8] }} />
          <It show={on('food')} n="morsel" x={22} y={on('s2') ? 52 : 24} s={5} a="drop" />
          <It show={on('s2')} n="icon-seedling" x={38} y={34} s={12} a="grow" origin="bottom" />
          <It show={on('s2')} n="seed" x={45} y={44} s={5} delay={0.3} />
          <It show={on('birds')} n="bird" x={58} y={30} s={9} a="left" />
          <It show={on('bugs')} n="bee" x={68} y={42} s={7} a="right" to={{ y: [0, -6, 0] }} />
          <It show={on('s4')} n="icon-drop" x={86} y={32} s={14} to={{ scale: [1, 1.12, 1] }} />
        </>
      );
    },
  },
  { // 5. المفهوم المفتاح: the word «التصنيف»; mixed things on a table; fruits to one basket, vegetables to the other;
    //    then the baskets become two groups: plants and animals
    cues: [{ key: 'term', word: 'التَّصْنيف' }, { key: 'mix', word: 'تَتَشابَهُ' }, { key: 'fruit', word: 'الفَواكِهُ' }, { key: 'veg', word: 'والخُضْرَواتُ' }, { key: 'groups', word: 'النَّباتاتِ' }],
    sfx: [['term', 'term-thock'], ['mix', 'table-clatter'], ['fruit', 'basket-drop'], ['veg', 'basket-drop', 0.9], ['groups', 'sort-swish']],
    View: ({ on }) => {
      const fr = on('fruit'), vg = on('veg'), gp = on('groups');
      const FRUIT = ['mango', 'banana', 'orange', 'guava'], VEG = ['tomato', 'carrot', 'eggplant', 'okra'];
      const mix: [number, number][] = [[30, 58], [46, 54], [58, 60], [70, 55], [36, 66], [52, 66], [64, 67], [44, 60]];
      return (
        <>
          <motion.h3 className="term-big" initial={{ opacity: 0, scale: 0.6 }} animate={on('term') ? { opacity: 1, scale: 1 } : {}} transition={spring}>التصنيف</motion.h3>
          <motion.div className="table-plank" initial={{ opacity: 0, y: 20 }} animate={{ opacity: on('mix') && !gp ? 1 : 0, y: on('mix') ? 0 : 20 }} />
          <It show={on('mix') && !gp} n="basket" x={82} y={70} s={16} a="right" />
          <It show={on('mix') && !gp} n="basket" x={18} y={70} s={16} a="left" />
          {FRUIT.map((n, i) => <It key={n} show={on('mix') && !gp} n={n} x={fr ? 76 + (i % 2) * 10 : mix[i][0]} y={fr ? 58 - (i > 1 ? 4 : 0) : mix[i][1]} s={7} delay={i * 0.05} z={2} />)}
          {VEG.map((n, i) => <It key={n} show={on('mix') && !gp} n={n} x={vg ? 13 + (i % 2) * 10 : mix[i + 4][0]} y={vg ? 58 - (i > 1 ? 4 : 0) : mix[i + 4][1]} s={7} delay={0.2 + i * 0.05} z={2} />)}
          <motion.div className="group-ring right" style={{ x: '-50%', y: '-50%' }} initial={false} animate={{ opacity: gp ? 1 : 0, scale: gp ? 1 : 0.5 }} transition={spring} />
          <motion.div className="group-ring left" style={{ x: '-50%', y: '-50%' }} initial={false} animate={{ opacity: gp ? 1 : 0, scale: gp ? 1 : 0.5 }} transition={{ ...spring, delay: 0.1 }} />
          {['tree', 'icon-flower', 'icon-seedling'].map((n, i) => <It key={n} show={gp} n={n} x={[70, 82, 76][i]} y={[50, 52, 70][i]} s={9} delay={0.2 + i * 0.1} />)}
          {['bird', 'fish', 'icon-snail', 'bee'].map((n, i) => <It key={n} show={gp} n={n} x={[18, 30, 20, 31][i]} y={[50, 52, 69, 68][i]} s={8} delay={0.3 + i * 0.1} />)}
        </>
      );
    },
  },
  { // 6. لغز مشوّق: night; a bat crosses the moon; a bird with a soft cross; a big turning question mark
    night: true,
    cues: [{ key: 'bat', word: 'الخُفّاشُ' }, { key: 'no', word: 'ليس' }, { key: 'q', word: 'فماذا' }],
    sfx: [['bat', 'bat-flight'], ['no', 'x-swipe'], ['q', 'question-twirl']],
    View: ({ on }) => (
      <>
        {[[8, 12], [22, 30], [40, 8], [55, 22], [92, 50], [12, 60], [70, 10]].map(([x, y], i) => <span key={i} className="star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }} />)}
        <It show n="moon" x={70} y={36} s={30} a="fade" />
        <motion.div className="it" style={{ ['--s' as string]: 16, top: '30%', x: '-50%', y: '-50%' }} initial={{ left: '-20%', opacity: 0 }}
          animate={on('bat') ? { left: ['-10%', '70%', '58%'], opacity: 1, y: [0, -12, 6, 0] } : {}} transition={{ duration: 2.2, ease: 'easeOut' }}>
          <motion.img src={art('bat')} alt="" className="it-in" animate={{ scaleY: [1, 0.7, 1] }} transition={{ duration: 0.35, repeat: Infinity }} draggable={false} />
        </motion.div>
        <It show={on('no')} n="bird" x={22} y={64} s={13} />
        <It show={on('no')} n="cross" x={22} y={64} s={11} delay={0.25} z={2} />
        <It show={on('q')} n="question" x={46} y={66} s={18} to={{ rotate: [0, 360] }} />
      </>
    ),
  },
  { // 7. التحفيز: lesson points on the road light one after another; the exam station appears at the end; all twinkle
    cues: [{ key: 'road', word: 'درسٍ' }, { key: 'light', word: 'يُضيءُ' }, { key: 'exam', word: 'امتحانٌ' }, { key: 'joy', word: 'واسْتَمْتِعوا' }],
    sfx: [['light', 'station-ding'], ['exam', 'exam-reveal'], ['joy', 'twinkle-cascade']],
    View: ({ on }) => {
      const pts: [number, number][] = [[8, 40], [17, 33], [26, 38], [35, 31], [44, 37], [53, 30], [62, 36], [71, 29], [80, 34], [91, 26]];
      const lit = pts.map((_, i) => (on('joy') ? true : on('light') ? i < 3 : false));
      return (
        <>
          <Road show={on('road')} points={pts} lit={lit} exam />
          <It show={on('exam')} n="icon-exam" x={91} y={30} s={12} />
          {on('joy') && pts.map(([x, y], i) => <Sparkle key={i} show x={x} y={(y / 56.25) * 100 - 9} s={3} delay={i * 0.08} />)}
        </>
      );
    },
  },
  { // 8. الدعوة: the start button appears (it becomes the real «لنبدأ» button when the narration ends)
    cues: [{ key: 'go', word: 'هيّا' }],
    sfx: [['go', 'start-pop']],
    View: ({ on }) => (
      <>
        <It show={on('go')} n="icon-explain" x={50} y={30} s={12} a="fade" />
        <It show={on('go')} x={50} y={64} s={30} delay={0.3}>
          <motion.div className="start-ghost" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>لنبدأ</motion.div>
        </It>
      </>
    ),
  },
];
export const SCENE_SFX = Array.from(new Set(EXPLAIN1.flatMap(s => s.sfx.map(x => x[1]))));

// A lesson of a school book, designed as an experience (not a lecture). Five stages, each finished before the next:
//   توقّع   the play question as a prediction, with its scene
//   اكتشف   the child discovers with their hands; each explanation card appears at the moment of discovery (Explore)
//   جرّب    the lab (apply what was discovered)
//   تحدَّ    the six questions as a star game: gold = right on the first try, silver = after help; every question that
//           needed help comes back in a «mastery round» (up to two rounds) until it is right on the first try
//   تذكّر   active recall of the summary points (Recall)
// then the mastery screen (stars and what was mastered), saved per child. Leaving in the middle keeps nothing.
// Texts the child reads come from the book file (book.json); the hands-on design from lessons.design.json.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useApp, useProfile } from '../state/store';
import { back } from '../ui/nav';
import { Confetti } from '../ui/kit';
import { artUrl, bookUrl, g, useProgress, type Book, type LessonData } from '../school/book';
import { ChoiceQ, GenderCtx, QuestionView, UiCtx } from '../school/Questions';
import { BreathingModel, FoodJourney } from '../school/Labs';
import { Explore, type ExploreDesign } from '../school/Explore';
import { Recall } from '../school/Recall';
import { Sfx } from '../school/sfx';
import { useBook } from './BookPage';

type Design = Record<string, { predict?: { art: string[] }; explore: ExploreDesign; terms?: string[] }>;
const LESSON_SFX = ['tap', 'back', 'card-touch', 'card-drop', 'snap', 'correct', 'wrong', 'streak', 'flip', 'hint', 'lab-pull', 'lab-release',
  'lab-air-in', 'lab-air-out', 'lab-move', 'lab-result', 'stage-done', 'lesson-done', 'locked', 'station-ding'];
const IconX = () => <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const Star = ({ kind }: { kind: 'gold' | 'silver' | 'none' }) => (
  <svg viewBox="0 0 24 24" className={'star-' + kind}><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" /></svg>
);

let designCache: Promise<Design> | null = null;
const loadDesign = (book: string) => (designCache ??= fetch(bookUrl(book, 'lessons.design.json')).then(r => r.json()));

export function BookLesson() {
  const p = useProfile();
  const [{ book: bookId, stage = 'd1' }] = useState(() => useApp.getState().school);   // pinned on mount
  const book = useBook(bookId);
  const [design, setDesign] = useState<Design | null>(null);
  useEffect(() => { void Sfx.preload(LESSON_SFX); loadDesign(bookId).then(setDesign); }, [bookId]);
  if (!p || !book || !design) return <div className="screen blesson"><div className="book-loading" /></div>;
  const data = book.lessons[stage];
  if (!data || !design[stage]) { back('book'); return null; }
  return (
    <GenderCtx.Provider value={p.gender}>
      <UiCtx.Provider value={book.ui ?? {}}>
        <LessonRun book={book} stage={stage} data={data} design={design[stage]} pid={p.id} gender={p.gender} />
      </UiCtx.Provider>
    </GenderCtx.Provider>
  );
}

function LessonRun({ book, stage, data, design, pid, gender }: { book: Book; stage: string; data: LessonData; design: Design[string]; pid: string; gender: 'm' | 'f' }) {
  const ui = book.ui ?? {};
  const T = (k: string, vars: Record<string, string> = {}) => g(Object.entries(vars).reduce((t, [a, b]) => t.replace(`{${a}}`, b), ui[k] ?? ''), gender);
  const NAMES = (ui.stages ?? 'توقّع · اكتشف · جرّب · تحدَّ · تذكّر').split('·').map(x => x.trim());
  const [step, setStep] = useState(0);              // 0..4 stages, 5 = mastery
  // the star game: queue of question indexes; stars per question; mastery rounds
  const [queue, setQueue] = useState<number[]>(() => data.challenge.map((_, i) => i));
  const [qi, setQi] = useState(0);
  const [stars, setStars] = useState<('gold' | 'silver' | 'none')[]>(() => data.challenge.map(() => 'none'));
  const [round, setRound] = useState(0);            // 0 = first pass, 1-2 = mastery rounds
  const [streak, setStreak] = useState(0);
  const s = book.stages.find(x => x.id === stage)!;
  const help = (k: string) => data.hints[k];
  const nextStep = () => { void Sfx.play('stage-done'); setStep(x => x + 1); };
  const solved = (wrong = 0) => {
    const q = queue[qi], first = wrong === 0;
    const st = [...stars]; if (first) st[q] = 'gold'; else if (st[q] === 'none') st[q] = 'silver'; setStars(st);
    const n = first ? streak + 1 : 0; setStreak(n); if (n >= 2) setTimeout(() => void Sfx.play('streak'), 300);
    if (qi + 1 < queue.length) { setQi(qi + 1); return; }
    const again = data.challenge.map((_, i) => i).filter(i => st[i] !== 'gold');
    if (again.length && round < 2) { setRound(round + 1); setQueue(again); setQi(0); void Sfx.play('hint'); }
    else nextStep();
  };
  const finish = () => {
    const gold = stars.filter(x => x === 'gold').length;
    const prev = useProgress.getState().p[pid]?.[book.id]?.[stage];
    useProgress.getState().set(pid, book.id, stage, { done: true, best: Math.max(gold, prev?.best ?? 0), stars: stars.join(',') });
    setStep(5); void Sfx.play('lesson-done');
  };
  const lab = data.lab;
  const panelKey = step + '-' + (step === 3 ? `${round}-${qi}` : 0);
  return (
    <div className="screen blesson">
      <header className="lesson-top">
        <button className="ex-btn" data-own-sfx onClick={() => { void Sfx.play('back'); back('book'); }} aria-label="خروج من الدرس"><IconX /></button>
        <div className="lesson-steps" aria-label={`المرحلة ${Math.min(step, 4) + 1} من ٥`}>
          {NAMES.map((n, i) => <span key={n} className={i < step ? 'done' : i === step ? 'now' : ''}><i /><em>{n}</em></span>)}
        </div>
        <img className="lesson-icon" src={artUrl(s.icon ?? '')} alt="" draggable={false} />
      </header>
      <main className="lesson-body scroll">
        <AnimatePresence mode="wait">
          <motion.section key={panelKey} className="lesson-panel"
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            {step === 0 && (
              <>
                <p className="stage-kicker">{NAMES[0]}</p>
                <p className="lab-instr">{T('predict')}</p>
                {design.predict && <div className="predict-scene" aria-hidden>{design.predict.art.map((a, i) => (
                  <motion.img key={a} src={artUrl(`art/school/${a}.svg`)} alt="" draggable={false} initial={{ opacity: 0, y: 20, scale: 0.7 }} animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
                    transition={{ delay: 0.15 * i, y: { duration: 2.4, repeat: Infinity, delay: 0.6 + i * 0.3 } }} />))}</div>}
                <ChoiceQ q={data.play.q} options={data.play.options} answer={data.play.answer} help={help('play')} onDone={nextStep} />
              </>
            )}
            {step === 1 && <><p className="stage-kicker">{NAMES[1]}</p><Explore design={design.explore} cards={data.cards} instr={{ trace: T('trace'), tap: T('tap'), hold: T('hold') }} onDone={nextStep} /></>}
            {step === 2 && (
              <><p className="stage-kicker">{NAMES[2]}</p>
                {lab.stations ? <FoodJourney lab={lab} help={help('lab')} onDone={nextStep} instruction={g(lab.instruction ?? '', gender)} />
                  : <BreathingModel lab={lab} gender={gender} help={help('lab')} onDone={nextStep} instruction={g(lab.instruction ?? '', gender)} />}</>
            )}
            {step === 3 && (
              <>
                <div className="star-bar" aria-label="نجوم التحدي">{stars.map((k, i) => <Star key={i} kind={k} />)}</div>
                {round > 0 && qi === 0 && <motion.p className="retry-banner" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>{T('retry')}</motion.p>}
                <p className="stage-kicker">{NAMES[3]} · {(qi + 1).toLocaleString('ar-EG')} / {queue.length.toLocaleString('ar-EG')}</p>
                <QuestionView q={data.challenge[queue[qi]]} help={help(String(queue[qi] + 1))} onDone={solved} />
              </>
            )}
            {step === 4 && <><p className="stage-kicker">{NAMES[4]}</p><Recall data={data} terms={design.terms} instruction={T('recall')} onDone={finish} /></>}
            {step === 5 && (
              <div className="lesson-done">
                <Confetti run={1} />
                <motion.img src={artUrl(s.icon ?? '')} alt="" initial={{ scale: 0.3, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} />
                <h2>{T('done', { 'الدرس': s.name })}</h2>
                <div className="star-bar big">{stars.map((k, i) => <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring' }}><Star kind={k} /></motion.span>)}</div>
                <p className="mastery-title">{T('mastery')}</p>
                <ul className="mastery-list">{data.summary.map((x, i) => <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1 }}>{x}</motion.li>)}</ul>
                <button className="btn-next" onClick={() => back('book')}>العودة إلى الكتاب</button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

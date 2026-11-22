// A lesson of a school book: five stages in order (علوم.md, section 5): play (one question of four), explanation cards,
// the lab, the challenge (six questions) and the summary. Each stage must be finished for the next to start.
// Leaving in the middle keeps nothing: the lesson is not complete and starts again from the beginning next time.
// When all stages are done: a small achievement screen, the lesson is saved complete and the next stage opens.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useApp, useProfile } from '../state/store';
import { back } from '../ui/nav';
import { Confetti } from '../ui/kit';
import { artUrl, g, useProgress, type Book, type LessonData } from '../school/book';
import { ChoiceQ, GenderCtx, QuestionView, UiCtx } from '../school/Questions';
import { BreathingModel, FoodJourney } from '../school/Labs';
import { Sfx } from '../school/sfx';
import { useBook } from './BookPage';

const STAGES = ['لعب', 'بطاقات الشرح', 'المختبر', 'التحدي', 'الخلاصة'];
const SHORT = ['لعب', 'الشرح', 'المختبر', 'التحدي', 'الخلاصة'];
const LESSON_SFX = ['tap', 'back', 'card-touch', 'card-drop', 'snap', 'correct', 'wrong', 'streak', 'flip', 'hint', 'lab-pull', 'lab-release',
  'lab-air-in', 'lab-air-out', 'lab-move', 'lab-result', 'stage-done', 'lesson-done', 'locked'];
const IconX = () => <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>;

export function BookLesson() {
  const p = useProfile();
  const [{ book: bookId, stage = 'd1' }] = useState(() => useApp.getState().school);   // pinned on mount
  const book = useBook(bookId);
  useEffect(() => { void Sfx.preload(LESSON_SFX); }, []);
  if (!p || !book) return <div className="screen blesson"><div className="book-loading" /></div>;
  const data = book.lessons[stage];
  if (!data) { back('book'); return null; }
  return (
    <GenderCtx.Provider value={p.gender}>
      <UiCtx.Provider value={(book as Book & { ui?: Record<string, string> }).ui ?? {}}>
        <LessonRun book={book} stage={stage} data={data} pid={p.id} gender={p.gender} />
      </UiCtx.Provider>
    </GenderCtx.Provider>
  );
}

function LessonRun({ book, stage, data, pid, gender }: { book: Book; stage: string; data: LessonData; pid: string; gender: 'm' | 'f' }) {
  const [step, setStep] = useState(0);        // 0..4 stages, 5 = achievement
  const [card, setCard] = useState(0);
  const [qi, setQi] = useState(0);
  const [streak, setStreak] = useState(0);
  const s = book.stages.find(x => x.id === stage)!;
  const ui = (book as Book & { ui?: Record<string, string> }).ui ?? {};
  const help = (k: string) => data.hints[k];
  const nextStep = () => { void Sfx.play('stage-done'); setStep(x => x + 1); };
  const solved = () => {                    // one challenge question done
    const n = streak + 1; setStreak(n); if (n >= 2) setTimeout(() => void Sfx.play('streak'), 300);
    if (qi + 1 < data.challenge.length) setQi(qi + 1); else nextStep();
  };
  const finish = () => {
    useProgress.getState().set(pid, book.id, stage, { done: true });
    setStep(5); void Sfx.play('lesson-done');
  };
  const lab = data.lab as LessonData['lab'] & { instruction?: string };
  const instr = g(lab.instruction ?? '', gender);
  return (
    <div className="screen blesson">
      <header className="lesson-top">
        <button className="ex-btn" data-own-sfx onClick={() => { void Sfx.play('back'); back('book'); }} aria-label="خروج من الدرس"><IconX /></button>
        <div className="lesson-steps" aria-label={`المرحلة ${step + 1} من ٥`}>
          {SHORT.map((n, i) => <span key={n} className={i < step ? 'done' : i === step ? 'now' : ''}><i /><em>{n}</em></span>)}
        </div>
        <img className="lesson-icon" src={artUrl(s.icon ?? '')} alt="" draggable={false} />
      </header>
      <main className="lesson-body scroll">
        <AnimatePresence mode="wait">
          <motion.section key={step + '-' + (step === 1 ? card : step === 3 ? qi : 0)} className="lesson-panel"
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            {step === 0 && <><p className="stage-kicker">{STAGES[0]}</p><ChoiceQ q={data.play.q} options={data.play.options} answer={data.play.answer} help={help('play')} onDone={nextStep} art={artUrl(s.icon ?? '')} /></>}
            {step === 1 && (
              <div className="explain-cards">
                <p className="stage-kicker">{STAGES[1]} · {(card + 1).toLocaleString('ar-EG')} / {data.cards.length.toLocaleString('ar-EG')}</p>
                <motion.div className="xcard" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }} onAnimationStart={() => void Sfx.play('flip')}>
                  <span className="xcard-n">{(card + 1).toLocaleString('ar-EG')}</span>
                  <p>{data.cards[card]}</p>
                </motion.div>
                <button className="btn-next" onClick={() => { if (card + 1 < data.cards.length) setCard(card + 1); else nextStep(); }}>
                  {card + 1 < data.cards.length ? 'التالي' : 'إلى المختبر'}
                </button>
              </div>
            )}
            {step === 2 && (
              <><p className="stage-kicker">{STAGES[2]}</p>
                {lab.stations ? <FoodJourney lab={lab} help={help('lab')} onDone={nextStep} instruction={instr} />
                  : <BreathingModel lab={lab} gender={gender} help={help('lab')} onDone={nextStep} instruction={instr} />}</>
            )}
            {step === 3 && (
              <><p className="stage-kicker">{STAGES[3]} · {(qi + 1).toLocaleString('ar-EG')} / {data.challenge.length.toLocaleString('ar-EG')}</p>
                <QuestionView q={data.challenge[qi]} help={help(String(qi + 1))} onDone={solved} /></>
            )}
            {step === 4 && (
              <div className="summary">
                <p className="stage-kicker">{STAGES[4]}</p>
                <ul>{data.summary.map((x, i) => <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }}>{x}</motion.li>)}</ul>
                <button className="btn-next" onClick={finish}>إنهاء الدرس</button>
              </div>
            )}
            {step === 5 && (
              <div className="lesson-done">
                <Confetti run={1} />
                <motion.img src={artUrl(s.icon ?? '')} alt="" initial={{ scale: 0.3, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} />
                <h2>{g((ui.done ?? '').replace('{الدرس}', s.name), gender)}</h2>
                <button className="btn-next" onClick={() => back('book')}>العودة إلى الكتاب</button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

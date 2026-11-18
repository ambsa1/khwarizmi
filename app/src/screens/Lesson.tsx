// Starter lesson player (phase 3): proves the whole chain works from a real lesson file to a built house.
// It walks the lesson's key cards (Siraj explains), its activities and its quiz, one clear step per screen, then records
// the skill as mastered and returns to the street, where the house is built in front of the child.
// The real activity templates replace the activity and quiz placeholders in phase 6.
import { motion } from 'framer-motion';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { useLearning } from '../data/learning';
import { lessonFor, templateById, type Lesson as LessonDoc } from '../lib/content';
import { useNum } from '../lib/num';
import { useApp, useProfile } from '../state/store';
import { outfitFor } from '../three/outfits';
import { Siraj } from '../three/Siraj';
import { Stage } from '../three/Stage';
import { IconClose, IconPlay } from '../ui/Icons';
import { useGuard } from '../ui/kit';

/** The camera looks at Siraj's middle, not his feet (the default target is the origin). */
function Aim() {
  const cam = useThree(s => s.camera);
  useEffect(() => { cam.lookAt(0, 1.05, 0); }, [cam]);
  return null;
}

type Step = { kind: 'card' | 'activity' | 'quiz'; text: string; note?: string };

export function Lesson() {
  const p = useProfile();
  const at = useApp(s => s.lesson), go = useApp(s => s.go), finished = useApp(s => s.finishLesson);
  const complete = useLearning(s => s.complete);
  const num = useNum();
  const guard = useGuard(500);
  const [doc, setDoc] = useState<LessonDoc | null | undefined>(undefined);
  const [i, setI] = useState(0);
  useEffect(() => { if (at) lessonFor(at.world, at.skill).then(l => setDoc(l ?? null)); }, [at]);
  if (!p || !at) return null;
  if (doc === null) { go('path'); return null; }

  const steps: Step[] = doc ? [
    ...doc.keyCards.map(c => ({ kind: 'card' as const, text: c.text.ar })),
    ...doc.activities.map(a => ({ kind: 'activity' as const, text: templateById(a.template)?.title.ar ?? a.template, note: 'هنا يأتي النشاط التفاعلي' })),
    ...doc.quiz.map(q => ({ kind: 'quiz' as const, text: q.q.ar })),
  ] : [];
  const step = steps[i], last = i === steps.length - 1;
  const next = () => {
    if (!last) { setI(i + 1); return; }
    complete(p.id, at.skill);
    finished();
  };

  return (
    <div className="screen sand lesson">
      <header className="lesson-top">
        <button className="icon-btn" aria-label="ارجع للرحلة" onClick={() => go('path')}><IconClose /></button>
        <ol className="lesson-steps" aria-label={`الخطوة ${num(i + 1)} من ${num(steps.length || 1)}`}>
          {steps.map((_, k) => <li key={k} className={k < i ? 'done' : k === i ? 'now' : undefined} />)}
        </ol>
      </header>
      <section className="lesson-stage">
        <Stage camera={{ position: [0, 1.25, 6.4], fov: 30 }} transparent label="سراج">
          <Aim />
          <hemisphereLight args={['#FFE6C2', '#8A6A4A', 1.1]} />
          <directionalLight position={[3, 5, 4]} intensity={1.6} color="#FFD9A6" />
          <Siraj action={step?.kind === 'quiz' ? 'think' : step?.kind === 'activity' ? 'point' : 'wave'} glow={0.8} position={[0, -0.05, 0]} outfit={outfitFor(at.world)} />
        </Stage>
      </section>
      <section className="lesson-card card" aria-live="polite">
        {doc && step ? (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {doc.title && i === 0 && <h1 className="t-h1" style={{ margin: '0 0 8px' }}>{doc.title.ar}</h1>}
            <p className="lesson-text">{step.text}</p>
            {step.note && <p className="lesson-note soft">{step.note}</p>}
          </motion.div>
        ) : <p className="lesson-text soft">…</p>}
      </section>
      <footer className="lesson-actions">
        <motion.button className="btn big wide go" whileTap={{ scale: 0.97 }} onClick={guard(next)} disabled={!doc}>
          <IconPlay size={30} /> {last ? 'خلّصت الدرس' : 'التالي'}
        </motion.button>
      </footer>
    </div>
  );
}

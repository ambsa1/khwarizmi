// «تذكّر»: active recall instead of a summary to read. Each summary point of the book file is shown with one key term
// missing; the child picks it from three cards (the term + two other terms of the SAME lesson). No new text: the points
// and the terms come from the book file. A point without a known term is simply shown.
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { LessonData } from './book';
import { shuffle } from './Questions';
import { Sfx } from './sfx';

/** the lesson's own terms: order cards, matching pairs, odd-one words, sorting cards, lab stations, short choices */
export function lessonTerms(d: LessonData, extra: string[] = []): string[] {
  const t = new Set<string>(extra);
  const add = (x?: string) => { if (x && x.length >= 3 && x.split(' ').length <= 3) t.add(x); };
  d.play.options.forEach(add);
  for (const q of d.challenge as Record<string, unknown>[]) {
    (q.order as string[] | undefined)?.forEach(add); (q.words as string[] | undefined)?.forEach(add); (q.items as string[] | undefined)?.forEach(add);
    (q.pairs as [string, string][] | undefined)?.forEach(([a, b]) => { add(a); add(b); }); (q.options as string[] | undefined)?.forEach(add);
  }
  d.lab.stations?.forEach(s => add(s.name));
  return [...t];
}

type Gap = { text: string; term: string | null; options: string[] };
function makeGaps(summary: string[], terms: string[]): Gap[] {
  const byLen = [...terms].sort((a, b) => b.length - a.length);
  return summary.map(text => {
    const term = byLen.find(x => text.includes(x)) ?? null;
    const others = shuffle(terms.filter(x => x !== term && !text.includes(x))).slice(0, 2);
    return { text, term, options: term ? shuffle([term, ...others]) : [] };
  });
}

export function Recall({ data, terms = [], instruction, onDone }: { data: LessonData; terms?: string[]; instruction: string; onDone: (wrong: number) => void }) {
  const gaps = useMemo(() => makeGaps(data.summary, lessonTerms(data, terms)), [data, terms]);
  const [i, setI] = useState(0);
  const [bad, setBad] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [filled, setFilled] = useState<number[]>([]);
  const g = gaps[i];
  const pick = (o: string) => {
    if (!g?.term || filled.includes(i)) return;
    if (o === g.term) { setFilled([...filled, i]); void Sfx.play('snap'); setTimeout(() => next(), 700); }
    else { setBad(o); setWrong(w => w + 1); void Sfx.play('wrong'); setTimeout(() => setBad(null), 450); }
  };
  const next = () => { if (i + 1 < gaps.length) setI(i + 1); else onDone(wrong); };
  const parts = g?.term ? g.text.split(g.term) : [g?.text ?? ''];
  return (
    <div className="recall">
      <p className="lab-instr">{instruction}</p>
      <ul className="recall-done">{gaps.slice(0, i).map((x, k) => <li key={k}>{x.text}</li>)}</ul>
      {g && (
        <motion.div key={i} className="recall-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p>{parts[0]}{g.term && <span className={'recall-gap' + (filled.includes(i) ? ' ok' : '')}>{filled.includes(i) ? g.term : ' '}</span>}{parts.slice(1).join(g.term ?? '')}</p>
          {g.term ? (
            <div className="q-cards">{g.options.map(o => (
              <motion.button key={o} data-own-sfx className={'qcard' + (bad === o ? ' bad' : '') + (filled.includes(i) && o === g.term ? ' ok' : '')} animate={bad === o ? { x: [0, -8, 8, -5, 5, 0] } : {}} onClick={() => pick(o)}>{o}</motion.button>
            ))}</div>
          ) : <button className="btn-next" onClick={next}>التالي</button>}
        </motion.div>
      )}
    </div>
  );
}

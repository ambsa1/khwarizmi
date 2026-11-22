// The answer-by-cards question engine for the lessons (no typing anywhere). Every answer is a card.
// Mistakes never stop the child (مسار-الطفل-والتنفيذ.md أولاً ٤): try again; after two wrong tries the hint from the book
// file shows; after the third the right card lights up with the short explanation, and the child must pick it.
import { motion, useAnimationControls } from 'framer-motion';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { g, type Choice, type Classify, type Match, type Odd, type Order, type Question } from './book';

/** the child's gender for the {boy|girl} forms of the little instructions */
export const GenderCtx = createContext<'m' | 'f'>('m');
/** the short on-screen texts of the book file (book.json → ui) */
export const UiCtx = createContext<Record<string, string>>({});
const useG = () => { const x = useContext(GenderCtx), ui = useContext(UiCtx); return (key: string, vars: Record<string, string> = {}) => g(Object.entries(vars).reduce((t, [k, v]) => t.replace(`{${k}}`, v), ui[key] ?? ''), x); };
import { Sfx } from './sfx';

export type Help = { hint: string; explain: string } | undefined;
export function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

/** wrong-try counter: 2 -> hint, 3 -> reveal */
function useTries() {
  const [wrong, setWrong] = useState(0);
  const miss = () => setWrong(w => { const n = w + 1; void Sfx.play('wrong'); if (n === 2) setTimeout(() => void Sfx.play('hint'), 450); return n; });
  return { wrong, miss, hint: wrong >= 2, reveal: wrong >= 3, reset: () => setWrong(0) };
}
export function HelpBox({ help, hint, reveal }: { help: Help; hint: boolean; reveal: boolean }) {
  if (!help || !hint) return null;
  return (
    <motion.div className={'help-box' + (reveal ? ' explain' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status">
      <b>{reveal ? 'الإجابة الصحيحة' : 'تلميح'}</b><span>{reveal ? help.explain : help.hint}</span>
    </motion.div>
  );
}

function Card({ children, state, onClick, disabled }: { children: ReactNode; state?: 'ok' | 'bad' | 'glow' | 'picked' | 'dim'; onClick?: () => void; disabled?: boolean }) {
  const c = useAnimationControls();
  return (
    <motion.button data-own-sfx className={'qcard' + (state ? ' ' + state : '')} animate={c} disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={() => { if (state === 'bad') void c.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.38 } }); onClick?.(); }}>
      {children}
    </motion.button>
  );
}

/** one choice among cards (اختار، علّل، توقّع، true/false, and the two steps of الشاذة) */
export function ChoiceQ({ q, options, answer, help, onDone, art }: { q?: string; options: string[]; answer: string; help: Help; onDone: () => void; art?: string }) {
  const opts = useMemo(() => shuffle(options), [options]);
  const t = useTries();
  const [bad, setBad] = useState<string[]>([]);
  const [ok, setOk] = useState(false);
  const pick = (o: string) => {
    if (ok) return;
    void Sfx.play('card-touch');
    if (o === answer) { setOk(true); void Sfx.play('correct'); setTimeout(onDone, 750); }
    else { if (!bad.includes(o)) setBad([...bad, o]); t.miss(); }
  };
  return (
    <div className="q">
      {q && <h2 className="q-text">{q}</h2>}
      {art && <motion.img className="q-art" src={art} alt="" draggable={false} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} />}
      <div className={'q-cards' + (opts.length === 4 ? ' four' : '')}>
        {opts.map(o => (
          <Card key={o} onClick={() => pick(o)} disabled={ok}
            state={ok && o === answer ? 'ok' : t.reveal && o === answer ? 'glow' : bad.includes(o) ? 'bad' : undefined}>{o}</Card>
        ))}
      </div>
      <HelpBox help={help} hint={t.hint} reveal={t.reveal} />
    </div>
  );
}

/** رتّب: tap the cards in order into the slots; a wrong full order sends back the cards from the first wrong place */
export function OrderQ({ q, order, help, onDone }: { q: string; order: string[]; help: Help; onDone: () => void }) {
  const pool0 = useMemo(() => shuffle(order), [order]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [bad, setBad] = useState(false);
  const t = useTries();
  const done = placed.length === order.length && placed.every((x, i) => x === order[i]);
  const put = (x: string) => {
    if (done) return;
    const next = [...placed, x]; setPlaced(next); void Sfx.play('card-drop');
    if (next.length === order.length) {
      if (next.every((y, i) => y === order[i])) { void Sfx.play('snap'); setTimeout(() => { void Sfx.play('correct'); setTimeout(onDone, 750); }, 200); }
      else { t.miss(); setBad(true); setTimeout(() => { const k = next.findIndex((y, i) => y !== order[i]); setPlaced(next.slice(0, k)); setBad(false); }, 650); }
    }
  };
  const nextRight = order[placed.length];
  return (
    <div className="q">
      <h2 className="q-text">{q}</h2>
      <ol className={'slots' + (bad ? ' bad' : '') + (done ? ' ok' : '')}>
        {order.map((_, i) => (
          <li key={i}><span className="slot-n">{(i + 1).toLocaleString('ar-EG')}</span>
            {placed[i] ? <button data-own-sfx className="qcard placed" onClick={() => { if (!done && !bad) { setPlaced(placed.slice(0, i)); void Sfx.play('card-touch'); } }}>{placed[i]}</button> : <span className="slot-empty" />}
          </li>
        ))}
      </ol>
      <div className="q-cards pool">
        {pool0.filter(x => !placed.includes(x)).map(x => <Card key={x} onClick={() => put(x)} state={t.reveal && x === nextRight ? 'glow' : undefined}>{x}</Card>)}
      </div>
      <HelpBox help={help} hint={t.hint} reveal={t.reveal} />
    </div>
  );
}

/** وصّل: tap a card on the right, then its partner on the left */
export function MatchQ({ q, pairs, help, onDone }: { q: string; pairs: [string, string][]; help: Help; onDone: () => void }) {
  const right = useMemo(() => shuffle(pairs.map(p => p[1])), [pairs]);
  const G = useG();
  const [sel, setSel] = useState<string | null>(null);
  const [made, setMade] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const t = useTries();
  const target = sel ? pairs.find(p => p[0] === sel)![1] : null;
  const pickRight = (r: string) => {
    if (!sel || made.includes(sel)) return;
    if (r === target) {
      const m = [...made, sel]; setMade(m); setSel(null); void Sfx.play('snap');
      if (m.length === pairs.length) { void Sfx.play('correct'); setTimeout(onDone, 750); }
    } else { setBad(r); t.miss(); setTimeout(() => setBad(null), 500); }
  };
  return (
    <div className="q">
      <h2 className="q-text">{q}</h2>
      <div className="match">
        <div className="match-col">
          {pairs.map(([l]) => <Card key={l} state={made.includes(l) ? 'ok' : sel === l ? 'picked' : undefined} disabled={made.includes(l)} onClick={() => { setSel(l); void Sfx.play('card-touch'); }}>{l}</Card>)}
        </div>
        <div className="match-col">
          {right.map(r => {
            const used = pairs.some(p => p[1] === r && made.includes(p[0]));
            return <Card key={r} disabled={used || !sel} onClick={() => pickRight(r)} state={used ? 'ok' : bad === r ? 'bad' : t.reveal && r === target ? 'glow' : undefined}>{r}</Card>;
          })}
        </div>
      </div>
      {!sel && made.length < pairs.length && <p className="q-tip">{G('match')}</p>}
      <HelpBox help={help} hint={t.hint} reveal={t.reveal} />
    </div>
  );
}

/** صنّف: tap a card, then the group it belongs to */
export function ClassifyQ({ q, items, groups, help, onDone }: { q: string; items: string[]; groups: { name: string; items: string[] }[]; help: Help; onDone: () => void }) {
  const pool = useMemo(() => shuffle(items), [items]);
  const G = useG();
  const [sel, setSel] = useState<string | null>(null);
  const [inG, setInG] = useState<Record<string, number>>({});
  const [bad, setBad] = useState<number | null>(null);
  const t = useTries();
  const right = (x: string) => groups.findIndex(g => g.items.includes(x));
  const drop = (gi: number) => {
    if (!sel) return;
    if (right(sel) === gi) {
      const n = { ...inG, [sel]: gi }; setInG(n); setSel(null); void Sfx.play('card-drop');
      if (Object.keys(n).length === items.length) { void Sfx.play('correct'); setTimeout(onDone, 750); }
    } else { setBad(gi); t.miss(); setTimeout(() => setBad(null), 500); }
  };
  return (
    <div className="q">
      <h2 className="q-text">{q}</h2>
      <div className="q-cards pool">
        {pool.filter(x => inG[x] === undefined).map(x => <Card key={x} state={sel === x ? 'picked' : undefined} onClick={() => { setSel(x); void Sfx.play('card-touch'); }}>{x}</Card>)}
      </div>
      <div className="bins">
        {groups.map((g, gi) => (
          <motion.button data-own-sfx key={g.name} className={'bin' + (bad === gi ? ' bad' : '') + (t.reveal && sel && right(sel) === gi ? ' glow' : '')} onClick={() => drop(gi)}
            animate={bad === gi ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.38 }}>
            <b>{g.name}</b>
            <span className="bin-items">{items.filter(x => inG[x] === gi).map(x => <span key={x} className="qcard ok mini">{x}</span>)}</span>
          </motion.button>
        ))}
      </div>
      {!sel && Object.keys(inG).length < items.length && <p className="q-tip">{G('classify')}</p>}
      <HelpBox help={help} hint={t.hint} reveal={t.reveal} />
    </div>
  );
}

/** الشاذة: first the odd word, then the reason */
export function OddQ({ words, odd, reasons, reason, help, onDone }: { words: string[]; odd: string; reasons: string[]; reason: string; help: Help; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const G = useG();
  return step === 0
    ? <ChoiceQ key="w" q={G('odd1')} options={words} answer={odd} help={help} onDone={() => setStep(1)} />
    : <ChoiceQ key="r" q={G('odd2', { 'الكلمة': odd })} options={reasons} answer={reason} help={help} onDone={onDone} />;
}

export function QuestionView({ q, help, onDone }: { q: Question; help: Help; onDone: () => void }) {
  switch (q.type) {
    case 'رتّب': { const x = q as Order; return <OrderQ q={x.q} order={x.order} help={help} onDone={onDone} />; }
    case 'وصّل': { const x = q as Match; return <MatchQ q={x.q} pairs={x.pairs} help={help} onDone={onDone} />; }
    case 'صنّف': { const x = q as Classify; return <ClassifyQ q={x.q} items={x.items} groups={x.groups} help={help} onDone={onDone} />; }
    case 'الشاذة': { const x = q as Odd; return <OddQ words={x.words} odd={x.odd} reasons={x.reasons} reason={x.reason} help={help} onDone={onDone} />; }
    default: { const x = q as Choice; return <ChoiceQ q={x.q} options={x.options} answer={x.answer} help={help} onDone={onDone} />; }
  }
}

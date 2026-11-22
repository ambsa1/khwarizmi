// The explainer player (مسار-الطفل-والتنفيذ.md: أولاً ٢-٣، ثانياً ٤-٥). Full screen: motion scenes + narration + a
// visible progress bar + the spoken words as captions.
//   First time: play/pause and exit only (no seek, no skip, no way to the lesson before the end). Leaving does not
//   complete it; coming back resumes from the saved position minus 2 seconds. It completes only on the real end of the
//   audio with no part jumped (the furthest point reached grows only while playing continuously).
//   After it is complete: skip is allowed too.
// The narration audio is the raw file, never edited; effects are separate files ducked under it (Sfx.duck).
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useProfile } from '../state/store';
import { back } from '../ui/nav';
import { bookUrl, loadMotion, loadTiming, useProgress, type Book, type Timing } from '../school/book';
import { effectIds, effectTimes, resolveCues } from '../motion/cues';
import { SceneView, type Ctx } from '../motion/library';
import type { MotionDoc } from '../motion/types';
import { artUrl } from '../school/book';
import { Sfx, useSfxMuted } from '../school/sfx';
import { useBook } from './BookPage';

const plain = (s: string) => s.replace(/[ً-ْٰـ]/g, '');

const IconPlay = () => <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg>;
const IconPause = () => <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const IconSkip = () => <svg viewBox="0 0 24 24"><path d="M17 6l-7 6 7 6zM10 6l-7 6 7 6z" /></svg>;
const IconFx = ({ off }: { off: boolean }) => <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" />{off ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16.5 8.5c1.6 2 1.6 5 0 7M19 6c3 3.4 3 8.6 0 12" />}</svg>;

export function Explainer() {
  const p = useProfile();
  // pinned on mount: during the exit transition the store already points at the next stage
  const [{ book: bookId, stage = 'e1' }] = useState(() => useApp.getState().school);
  const book = useBook(bookId);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [doc, setDoc] = useState<MotionDoc | null>(null);
  useEffect(() => { if (book) { loadTiming(book, stage).then(setTiming); loadMotion(book, stage).then(setDoc); } }, [book, stage]);
  if (!p || !book || !timing || !doc) return <div className="screen explain-screen"><div className="book-loading" /></div>;
  return <Player book={book} stage={stage} timing={timing} doc={doc} pid={p.id} />;
}

function Player({ book, stage, timing, doc, pid }: { book: Book; stage: string; timing: Timing; doc: MotionDoc; pid: string }) {
  const prog = useProgress();
  const saved = useProgress(s => s.p[pid]?.[book.id]?.[stage]);
  const firstTime = !saved?.done;
  const audio = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const reach = useRef(Math.max(0, (saved?.pos ?? 0) - 2));
  const lastT = useRef(-1);
  const muted = useSfxMuted();
  const cues = useMemo(() => resolveCues(doc, timing, m => console.warn('[motion]', m)), [doc, timing]);
  const fx = useMemo(() => effectTimes(doc, cues), [doc, cues]);
  useEffect(() => {   // developer review only: the effect cue times, used to mix the review video's sound
    if (useProgress.getState().dev) (window as unknown as { __khwCues: unknown }).__khwCues = fx;
  }, [fx]);
  const dur = timing.duration;
  const seg = timing.segments.reduce((k, s, i) => (t >= s.start - 0.3 ? i : k), 0);   // the part being spoken
  const segment = timing.segments[seg];

  // start: resume 2 s before the saved point (first time) or from the start (after completion)
  useEffect(() => {
    void Sfx.preload([...effectIds(doc), 'tap', 'back']);
    const a = audio.current!; const start = firstTime ? Math.max(0, (saved?.pos ?? 0) - 2) : 0;
    const go = () => { a.currentTime = start; lastT.current = start; setT(start); void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
    if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
    const save = () => { const s = useProgress.getState(); if (!s.p[pid]?.[book.id]?.[stage]?.done) s.set(pid, book.id, stage, { pos: a.currentTime }); };
    const every = window.setInterval(() => { if (!a.paused) save(); }, 3000);
    const hide = () => { if (document.hidden) { a.pause(); save(); } };       // a call or the app going to the background
    document.addEventListener('visibilitychange', hide); addEventListener('pagehide', save);
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', hide); removeEventListener('pagehide', save); a.pause(); save(); Sfx.duck(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the clock: scenes, effects on their cues, the furthest point reached without a jump
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = audio.current; if (!a) return;
      const now = a.currentTime, prev = lastT.current;
      if (now - prev > 0 && now - prev < 1) {            // continuous play: fire the effects whose cue just passed
        if (now <= reach.current + 1.2) reach.current = Math.max(reach.current, now);
        for (const f of fx) if (f.t > prev && f.t <= now) void Sfx.play(f.id, { rate: f.rate });
      }
      lastT.current = now; setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fx]);

  const toggle = () => {
    const a = audio.current!;
    if (a.paused) { void a.play().then(() => setPlaying(true)).catch(() => {}); } else { a.pause(); setPlaying(false); }
  };
  const onEnded = () => {
    setPlaying(false); Sfx.duck(false);
    if (reach.current >= dur - 1.5) {                    // heard to the end, nothing jumped
      prog.set(pid, book.id, stage, { done: true, pos: 0 }); setEnded(true);
    } else { audio.current!.currentTime = reach.current; }
  };
  const next = () => {
    const i = book.stages.findIndex(s => s.id === stage), n = book.stages[i + 1];
    // back to the book page first, so leaving the lesson (or the device back button) returns to the book page
    back('book');
    if (n?.built && n.type === 'lesson') setTimeout(() => useApp.getState().openSchool(book.id, n.id, 'blesson'), 150);
  };
  useEffect(() => { Sfx.duck(playing); }, [playing]);

  const si = Math.max(0, doc.scenes.findIndex(x => x.part === seg)), sc = doc.scenes[si];
  const last = si === doc.scenes.length - 1;
  const ctx: Ctx = { on: (k?: string) => !k || t >= (cues[si]?.[k] ?? Infinity) - 0.05 || (last && ended), cover: bookUrl(book.id, book.cover),
    logo: artUrl('icons/icon-512.png'), art: n => artUrl(`art/school/${n}.svg`) };
  const cur = segment?.words.findIndex(w => t >= w.start && t < w.end + 0.08) ?? -1;
  // the caption shows the sentence being spoken (sentences end with . ! ? ؟ …)
  const words = segment?.words ?? [];
  const ends = words.map(w => /[.!?؟…]$/.test(w.w));
  const nextW = words.findIndex(w => w.start > t);
  const at = cur >= 0 ? cur : nextW < 0 ? words.length - 1 : Math.max(0, nextW - 1);   // in a pause: keep the sentence just said
  let from = at; while (from > 0 && !ends[from - 1]) from--;
  let to = at; while (to < words.length - 1 && !ends[to]) to++;
  return (
    <div className={'screen explain-screen' + (sc.night ? ' night' : '')}>
      <audio ref={audio} src={bookUrl(book.id, book.explain[stage].audio)} preload="auto" onEnded={onEnded}
        onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)}
        onSeeking={e => { if (firstTime && !useProgress.getState().dev && Math.abs(e.currentTarget.currentTime - lastT.current) > 1.2 && e.currentTarget.currentTime > reach.current + 1.2) e.currentTarget.currentTime = reach.current; }} />
      <div className="explain-top">
        <button className="ex-btn" data-own-sfx onClick={() => { void Sfx.play('back'); back('book'); }} aria-label="خروج"><IconX /></button>
        <div className="explain-title"><b>{book.stages.find(s => s.id === stage)?.name}</b><span>{segment?.title}</span></div>
        <button className="ex-btn" onClick={() => Sfx.setMuted(!muted)} aria-label={muted ? 'تشغيل المؤثرات' : 'كتم المؤثرات'} aria-pressed={muted}><IconFx off={muted} /></button>
      </div>
      <div className="explain-stage-wrap">
        <div className={'explain-stage' + (sc.night ? ' night' : '')}>
          <AnimatePresence mode="sync" initial={false}>
            <motion.div key={seg} className="scene" initial={{ opacity: 0, x: '-6%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '6%' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <SceneView scene={sc} c={ctx} />
            </motion.div>
          </AnimatePresence>
          {ended && (
            <motion.button className="start-btn" data-own-sfx style={{ x: '-50%' }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              onClick={() => { void Sfx.play('tap'); next(); }}>لنبدأ</motion.button>
          )}
        </div>
      </div>
      <p className="captions" aria-live="off">
        {words.slice(from, to + 1).map((w, k) => { const i = from + k; return <span key={i} className={i === cur ? 'now' : i < cur ? 'said' : ''}>{plain(w.w)}</span>; })}
      </p>
      <div className="explain-controls">
        <div className="ex-bar" role="progressbar" aria-label="تقدّم الشرح" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)}>
          {timing.segments.map(s => <i key={s.id} style={{ left: `${(s.start / dur) * 100}%` }} />)}
          <span style={{ width: `${Math.min(100, (t / dur) * 100)}%` }} />
        </div>
        <div className="ex-row">
          <button className="ex-play" onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'} disabled={ended}>{playing ? <IconPause /> : <IconPlay />}</button>
          {!firstTime && !ended && <button className="ex-skip" data-own-sfx onClick={() => { void Sfx.play('tap'); back('book'); }}><IconSkip /> تخطَّ</button>}
        </div>
      </div>
    </div>
  );
}

// The book page (مسار-الطفل-والتنفيذ.md, أولاً ١): header with the real cover, name, grade, «n من m مرحلة» and a progress
// bar; the stages in one vertical path (two journeys, exams in their own colour, the title at the end).
// Phone: header on top, the path full width. Computer: a fixed side panel (cover, progress, title) and the path in the
// middle at a limited width. States: done (light green, check, «اكتمل»), current (glows, «ابدأ من هنا», arrow), locked
// (grey, lock; a tap shakes it and says «أكمِل المرحلة السابقة أولًا»). Stages that are not built yet look locked and
// never open. Developer review mode (?dev=1 or the developer page) shows a small bar to set progress.
import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNum } from '../lib/num';
import { useApp, useProfile } from '../state/store';
import { back } from '../ui/nav';
import { IconBack } from '../ui/Icons';
import { artUrl, bookUrl, doneCount, loadBook, stageStatus, useProgress, type Book, type Stage, type StageStatus } from '../school/book';
import { Sfx } from '../school/sfx';

const GRADE = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
const STAGE_ICON: Record<string, string> = { explain: 'art/school/icon-explain.svg', exam: 'art/school/icon-exam.svg', title: 'art/school/icon-title.svg' };
const LINE: Record<StageStatus, string> = { done: 'اكتمل', current: 'ابدأ من هنا', open: 'مفتوح للمراجعة', locked: '' };

export function useBook(id: string) {
  const [book, setBook] = useState<Book | null>(null);
  useEffect(() => { let on = true; loadBook(id).then(b => on && setBook(b)); return () => { on = false; }; }, [id]);
  return book;
}

function kindLine(s: Stage, num: (n: number) => string) {
  if (s.type === 'lesson') return `الدرس ${num(s.n!)}`;
  if (s.type === 'explain') return 'شرح مسموع';
  if (s.type === 'exam') return 'امتحان';
  return 'برونزي · فضي · ذهبي';
}

function StageCard({ s, status, fresh, onOpen }: { s: Stage; status: StageStatus; fresh: boolean; onOpen: () => void }) {
  const num = useNum();
  const shake = useAnimationControls();
  const [toast, setToast] = useState(false);
  const icon = s.icon ?? STAGE_ICON[s.type];
  const tap = () => {
    if (status === 'locked') {
      void Sfx.play('locked'); void shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.42 } });
      if (s.built) { setToast(true); setTimeout(() => setToast(false), 1800); }
      return;
    }
    void Sfx.play('page'); onOpen();
  };
  return (
    <motion.li className={`stage t-${s.type} ${status}${fresh ? ' fresh' : ''}`} animate={shake} data-stage={s.id}>
      <button className="stage-card" data-own-sfx onClick={tap} aria-label={`${s.name}، ${status === 'locked' ? 'مقفول' : LINE[status] || kindLine(s, num)}`}>
        <span className="stage-icon">
          {icon && <img src={artUrl(icon)} alt="" draggable={false} />}
          {status === 'done' && <span className="stage-badge done" aria-hidden><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg></span>}
          {status === 'locked' && <span className="stage-badge lock" aria-hidden><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg></span>}
        </span>
        <span className="stage-text">
          <span className="stage-name">{s.name}</span>
          <span className="stage-line">{status === 'locked' || status === 'open' && !LINE[status] ? kindLine(s, num) : (LINE[status] || kindLine(s, num))}</span>
        </span>
        {status === 'current' && <span className="stage-arrow" aria-hidden><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></span>}
      </button>
      {toast && <motion.span className="stage-toast" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>أكمِل المرحلة السابقة أولًا</motion.span>}
    </motion.li>
  );
}

function DevBar({ book, pid }: { book: Book; pid: string }) {
  const prog = useProgress();
  const upTo = (k: number) => { prog.reset(pid, book.id); book.stages.slice(0, k).forEach(s => prog.set(pid, book.id, s.id, { done: true })); };
  return (
    <div className="dev-bar" role="group" aria-label="وضع المطوّر">
      <b>وضع المطوّر</b>
      <button onClick={() => prog.reset(pid, book.id)}>بداية الكتاب</button>
      <button onClick={() => upTo(1)}>بعد الشرح</button>
      <button onClick={() => upTo(2)}>بعد الدرس ١</button>
      <button onClick={() => upTo(3)}>بعد الدرس ٢</button>
      <button onClick={() => prog.setDev(false)}>إخفاء</button>
    </div>
  );
}

export function BookPage() {
  const p = useProfile();
  const id = useApp(s => s.school.book);
  const book = useBook(id);
  const num = useNum();
  const all = useProgress(s => s.p), dev = useProgress(s => s.dev);
  const st = (p && all[p.id]?.[id]) || {};
  const listRef = useRef<HTMLOListElement>(null);
  // the stage that became current since the last visit plays the unlock animation once
  const seenKey = p ? `khawarizmi.seen.${p.id}.${id}` : '';
  const statuses = useMemo(() => book?.stages.map((_, i) => stageStatus(book, i, st, dev)) ?? [], [book, st, dev]);
  const currentId = book?.stages[statuses.indexOf('current')]?.id;
  const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => {
    void Sfx.preload(['tap', 'page', 'locked', 'unlock', 'back']);
    if (!currentId || !seenKey) return;
    let seen: string | null = null; try { seen = localStorage.getItem(seenKey); } catch { /* private mode */ }
    if (seen && seen !== currentId) { setFresh(currentId); setTimeout(() => void Sfx.play('unlock'), 380); }
    try { localStorage.setItem(seenKey, currentId); } catch { /* private mode */ }
  }, [currentId, seenKey]);
  useEffect(() => {   // keep the current stage in view
    const el = listRef.current?.querySelector('.stage.current');
    if (el) setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 250);
  }, [currentId, book]);
  if (!p) return null;
  if (!book) return <div className="screen book-page"><div className="book-loading" /></div>;

  const done = doneCount(book, st), total = book.stages.length;
  const open = (s: Stage) => {
    if (s.type === 'explain') useApp.getState().openSchool(book.id, s.id, 'explain');
    else if (s.type === 'lesson') useApp.getState().openSchool(book.id, s.id, 'blesson');
  };
  const head = (
    <header className="book-head">
      <img className="book-cover-big" src={bookUrl(book.id, book.cover)} alt={`غلاف كتاب ${book.name}`} draggable={false} />
      <div className="book-meta">
        <h1>{book.name}</h1>
        <p className="book-grade">الصف {GRADE[book.grade]}</p>
        <p className="book-count">{num(done)} من {num(total)} مرحلة</p>
        <div className="book-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{ width: `${(done / total) * 100}%` }} /></div>
      </div>
      <div className="book-goal">
        <img src={artUrl('art/school/icon-title.svg')} alt="" draggable={false} />
        <span><b>لقب {book.title}</b><small>برونزي · فضي · ذهبي</small></span>
      </div>
    </header>
  );
  let lastJourney = -1;
  return (
    <div className="screen book-page">
      <button className="back-btn book-back" data-own-sfx onClick={() => { void Sfx.play('back'); back('school'); }} aria-label="رجوع"><IconBack /></button>
      <aside className="book-side">{head}</aside>
      <main className="book-main scroll">
        <div className="book-head-mobile">{head}</div>
        {dev && <DevBar book={book} pid={p.id} />}
        <ol className="stage-path" ref={listRef}>
          {book.stages.map((s, i) => {
            const label = s.journey !== lastJourney && s.type !== 'title' ? book.journeys[(lastJourney = s.journey)] : null;
            return [
              label && <li key={'j' + s.journey} className="journey-label"><span>{label}</span></li>,
              <StageCard key={s.id} s={s} status={statuses[i]} fresh={fresh === s.id} onOpen={() => open(s)} />,
            ];
          })}
        </ol>
      </main>
    </div>
  );
}

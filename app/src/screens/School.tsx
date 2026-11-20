// "المدرسة": the child's school books. Top: a classroom where Siraj, as the teacher, stands in front of a chalkboard.
// Bottom: the names of the textbooks of the child's grade (only the books the app really has, from the Sudanese
// curriculum folder via tools/school-books.py), as a grid of book covers. Names only: no lesson content yet.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNum } from '../lib/num';
import { useProfile } from '../state/store';
import { Stage } from '../three/Stage';
import { Siraj } from '../three/Siraj';
import { Bubble, TabBar, say } from '../ui/kit';
import { TopBar } from '../ui/TopBar';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import BOOKS from '../data/school-books.json';

type Book = { key: string; name: string };
const I = (d: string) => <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const COVER: Record<string, { c: string; glyph: React.ReactNode }> = {
  arabic: { c: '#B9785D', glyph: 'أ ب' }, math: { c: '#5E7191', glyph: '+ −' }, english: { c: '#A8432A', glyph: 'ABC' }, 'english-act': { c: '#C46A3C', glyph: 'abc' },
  islamic: { c: '#3E8A5E', glyph: I('M20 6a10 10 0 1 0 6 17A8 8 0 1 1 20 6z') },
  science: { c: '#12807F', glyph: I('M12 4h8M14 4v8l-7 13a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-7-13V4M10 20h12') },
  history: { c: '#8A5A3B', glyph: I('M9 4h14M9 28h14M10 4c0 8 12 8 12 12s-12 4-12 12M22 4c0 8-12 8-12 12s12 4 12 12') },
  geography: { c: '#1F5FAD', glyph: I('M16 4a12 12 0 1 0 0 24 12 12 0 1 0 0-24M4 16h24M16 4c-5 6-5 18 0 24M16 4c5 6 5 18 0 24') },
  earth: { c: '#5E8A3A', glyph: I('M6 26C6 14 14 6 26 6c0 12-8 20-20 20zM6 26 18 14') },
  art: { c: '#A0466E', glyph: I('M16 4a12 12 0 0 0 0 24c2 0 2-2 1-3-1-2 0-4 3-4h3a5 5 0 0 0 5-5c0-7-5-12-12-12zM10 14h.1M14 9h.1M20 9h.1') },
  ict: { c: '#49318E', glyph: I('M5 6h22v15H5zM12 26h8M16 21v5') },
  resources: { c: '#A87508', glyph: I('M16 28V10M16 10c-4-2-6-6-4-8 3 0 5 3 4 8zM16 16c-4-1-7-4-6-7 3 0 6 3 6 7zM16 16c4-1 7-4 6-7-3 0-6 3-6 7zM16 22c-4-1-7-4-6-7 3 0 6 3 6 7zM16 22c4-1 7-4 6-7-3 0-6 3-6 7z') },
  clothes: { c: '#6E5A9A', glyph: I('M11 4 4 9l3 5 3-2v16h12V12l3 2 3-5-7-5c-1 2-3 3-5 3s-4-1-5-3z') },
};
const GRADE_WORD = ['الأول', 'التاني', 'التالت', 'الرابع', 'الخامس', 'السادس'];

function Aim() {
  const cam = useThree(s => s.camera);
  useEffect(() => { cam.lookAt(0, 1.05, 0); }, [cam]);
  return null;
}

export function School() {
  const p = useProfile();
  const num = useNum();
  const [line, setLine] = useState<string | null>(null);
  if (!p) return null;
  // kindergarten (no grade yet) sees the first grade's books; a family child without a grade by age
  const grade = p.grade ?? (p.kind === 'family' ? Math.min(6, Math.max(1, p.age - 6)) : 1);
  const books = ((BOOKS as Record<string, Book[]>)[String(grade)] ?? []);
  const kg = p.grade == null && p.kind === 'guest';
  const title = kg ? 'كتب الصف الأول (لما تدخل المدرسة)' : `كتب الصف ${GRADE_WORD[grade - 1]}`;
  return (
    <div className="screen sand has-rail school">
      <div className="main col grow scroll school-main">
        <TopBar title="المدرسة" />
        <section className="classroom" aria-label="الفصل">
          <div className="chalkboard" aria-hidden>
            <span className="chalk c1">أ ب ت</span><span className="chalk c2">١ + ٢ = ٣</span><span className="chalk c3">A B C</span>
            <span className="chalk-tray" />
          </div>
          <div className="teacher">
            <Stage camera={{ position: [0, 1.3, 6.2], fov: 30 }} transparent label="سراج الأستاذ">
              <Aim />
              <hemisphereLight args={['#FFE6C2', '#8A6A4A', 1.15]} />
              <directionalLight position={[3, 5, 4]} intensity={1.6} color="#FFD9A6" />
              {/* mirrored so his pointing hand faces the board */}
              <group scale={[-1, 1, 1]}><Siraj action="point" glow={0.8} stamps={3} position={[0, 0.02, 0]} outfit="nile" /></group>
            </Stage>
          </div>
          <div className="desk" aria-hidden />
          {line && <div className="school-line"><Bubble>{line}</Bubble></div>}
        </section>
        <section className="bookshelf" aria-label={title}>
          <h2 className="shelf-title">{title} <span className="soft">{num(books.length)} {books.length > 10 || books.length < 3 ? 'كتاب' : 'كتب'}</span></h2>
          <div className="books">
            {books.map((b, i) => {
              const cv = COVER[b.key] ?? { c: '#8A5A3B', glyph: 'ك' };
              return (
                <motion.button key={b.key} className="book" style={{ ['--cover' as string]: cv.c }}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, type: 'spring', stiffness: 360, damping: 26 }}
                  onClick={() => { setLine(say(p, `كتاب ${b.name}: قريب نقرأه سوا!`, `كتاب ${b.name}: قريب نقرأه سوا!`)); setTimeout(() => setLine(null), 2600); }}>
                  <span className="book-cover" aria-hidden><span className="book-glyph">{cv.glyph}</span><span className="book-band" /></span>
                  <span className="book-name">{b.name}</span>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
      <TabBar current="school" />
    </div>
  );
}

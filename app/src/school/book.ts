// School books: data from public/school-data/<id>/book.json (built from the book file by tools/book-data.py), the per-child
// progress, and the ONE unlock rule of the app (مسار-الطفل-والتنفيذ.md, ثانياً ٣):
//   stage n is open  <=>  stage n-1 is complete (the first stage is always open) AND the stage is built.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type StageType = 'explain' | 'lesson' | 'exam' | 'title';
export type Stage = { id: string; type: StageType; name: string; journey: number; n?: number; icon?: string; built: boolean };
export type Choice = { type: string; q: string; options: string[]; answer: string };   // اختار، علّل، توقّع، and the true/false type
export type Order = { type: 'رتّب'; q: string; order: string[] };
export type Match = { type: 'وصّل'; q: string; pairs: [string, string][] };
export type Classify = { type: 'صنّف'; q: string; items: string[]; groups: { name: string; items: string[] }[] };
export type Odd = { type: 'الشاذة'; q: string; words: string[]; odd: string; reasons: string[]; reason: string };
export type Question = Choice | Order | Match | Classify | Odd;
export type LessonData = {
  play: { q: string; options: string[]; answer: string };
  cards: string[];
  lab: { text: string; instruction?: string; result?: string; stations?: { name: string; card: string; result: string }[]; closing?: string };
  challenge: Question[];
  hints: Record<string, { hint: string; explain: string }>;
  summary: string[];
};
export type Book = {
  id: string; grade: number; subject: string; name: string; title: string; cover: string; journeys: string[]; stages: Stage[];
  explain: Record<string, { audio: string; timing: string; motion?: string }>; lessons: Record<string, LessonData>; ui?: Record<string, string>;
};
export type Timing = {
  duration: number;
  segments: { id: string; title: string; start: number; end: number; words: { w: string; start: number; end: number }[]; beats: { word: string; scene: string }[] }[];
};

const base = () => new URL('school-data/', document.baseURI).href;
export const bookUrl = (book: string, file: string) => `${base()}${book}/${file}`;
export const artUrl = (file: string) => new URL(file, document.baseURI).href;

const cache = new Map<string, Promise<unknown>>();
const getJson = <T,>(url: string) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }));
  return cache.get(url) as Promise<T>;
};
export const loadBook = (id: string) => getJson<Book>(bookUrl(id, 'book.json'));
export const loadTiming = (book: Book, stage: string) => getJson<Timing>(bookUrl(book.id, book.explain[stage].timing));
/** the explainer's motion data (one light JSON per explainer, played by the motion engine in src/motion) */
export const loadMotion = (book: Book, stage: string) => getJson<import('../motion/types').MotionDoc>(bookUrl(book.id, book.explain[stage].motion ?? book.explain[stage].audio.replace(/\.mp3$/, '.motion.json')));

/** the books that exist in the app, by grade and subject key of school-books.json */
export const BOOKS: Record<string, string> = { '5:science': 'g5-science' };

/** {boy|girl} -> the child's form */
export const g = (text: string, gender: 'm' | 'f') => text.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, f) => (gender === 'f' ? f : m));

// ---------------------------------------------------------------- progress (per child, per book, on this device)
export type StageState = { done?: boolean; pos?: number };
type Progress = {
  p: Record<string, Record<string, Record<string, StageState>>>;     // profile -> book -> stage -> state
  dev: boolean;                                                      // developer review mode (never shown to a child)
  set: (profile: string, book: string, stage: string, s: StageState) => void;
  reset: (profile: string, book: string) => void;
  setDev: (v: boolean) => void;
};
const storage = createJSONStorage(() => {
  try { localStorage.setItem('__b', '1'); localStorage.removeItem('__b'); return localStorage; } catch {
    const mem = new Map<string, string>();
    return { getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: k => void mem.delete(k) };
  }
});
export const useProgress = create<Progress>()(persist((set, get) => ({
  p: {}, dev: false,
  set: (profile, book, stage, s) => {
    const all = get().p, mine = all[profile] ?? {}, bk = mine[book] ?? {};
    set({ p: { ...all, [profile]: { ...mine, [book]: { ...bk, [stage]: { ...bk[stage], ...s } } } } });
  },
  reset: (profile, book) => { const all = get().p, mine = { ...(all[profile] ?? {}) }; delete mine[book]; set({ p: { ...all, [profile]: mine } }); },
  setDev: dev => set({ dev }),
}), { name: 'khawarizmi.books', storage, partialize: s => ({ p: s.p, dev: s.dev }) }));

export type StageStatus = 'done' | 'current' | 'open' | 'locked';
/** THE unlock rule. `dev` opens every built stage (review only). */
export function stageStatus(book: Book, i: number, st: Record<string, StageState>, dev = false): StageStatus {
  const s = book.stages[i];
  if (st[s.id]?.done) return 'done';
  if (!s.built) return 'locked';
  const prevDone = i === 0 || !!st[book.stages[i - 1].id]?.done;
  if (prevDone) return 'current';
  return dev ? 'open' : 'locked';
}
export const doneCount = (book: Book, st: Record<string, StageState>) => book.stages.filter(s => st[s.id]?.done).length;

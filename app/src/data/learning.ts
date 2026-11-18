// Learner data: what each child has learned, kept safely on the device and carried across every app update.
//
//   Learner record (one per child, IndexedDB 'learners'):
//     skills[skillId] = { status: learning | mastered | stable, box, attempts, correct, first, last, due }
//     days[YYYY-MM-DD] = { lit }   lamps lit that day (today's three steps)
//   SCHEMA is the data version. Every change to the shape adds ONE function to MIGRATIONS (n -> n+1), so data written by
//   any older version is converted on load and nothing is ever lost.
//
//   Spaced review: a mastered skill sits in a review box; each successful review moves it up a box and pushes the next
//   review further out (REVIEW_DAYS); a miss drops it back. After the last box the skill is 'stable' (the yard tree).
//   (The full mastery rules arrive with the activity templates in phase 6; this is the data they will use.)
//
//   v2 (the version published before the rebuild) kept progress per old coding level under 'khwarizmi.v1'. On first run
//   the raw text is archived untouched, every solved level is translated into the new skills through
//   content/legacy/coding-75.json, and each old player is linked to a family child only when the family id matches;
//   the others wait in the parents' corner to be linked by hand.
import { create } from 'zustand';
import legacyMap from '../../../content/legacy/coding-75.json';
import { WORLDS, worldSkills } from '../lib/content';
import * as db from './idb';

export const SCHEMA = 1;
export type SkillStatus = 'learning' | 'mastered' | 'stable';
export type SkillState = { status: SkillStatus; box: number; attempts: number; correct: number; first: number; last: number; due: number | null };
export type Learner = { schema: number; id: string; skills: Record<string, SkillState>; days: Record<string, { lit: number }>; updated: number };
export type LegacyPlayer = { legacyId: string; fid?: string; name: string; age: number; gender: 'm' | 'f'; skills: Record<string, SkillStatus>; levels: number; linkedTo?: string };

const DAY = 86400000;
export const REVIEW_DAYS = [1, 3, 7, 14, 30, 60];
const RANK: Record<SkillStatus, number> = { learning: 1, mastered: 2, stable: 3 };
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const blankLearner = (id: string): Learner => ({ schema: SCHEMA, id, skills: {}, days: {}, updated: Date.now() });

/** n -> n+1. Schema 1 is the first; add the next step here when the shape changes. */
export const MIGRATIONS: Record<number, (l: Record<string, unknown>) => Record<string, unknown>> = {
  0: l => ({ ...blankLearner(String(l.id ?? '')), ...l, schema: 1 }),
};

/** Brings any stored record (any older schema) up to the current one; returns null if it cannot be read. */
export function migrate(raw: unknown): Learner | null {
  if (!raw || typeof raw !== 'object' || typeof (raw as Learner).id !== 'string') return null;
  let l = raw as Record<string, unknown>, v = typeof l.schema === 'number' ? l.schema : 0;
  if (v > SCHEMA) return null; // written by a newer app: never downgrade-destroy it
  while (v < SCHEMA) { const step = MIGRATIONS[v]; if (!step) return null; l = step(l); v++; }
  const out = l as Learner;
  if (typeof out.skills !== 'object' || !out.skills || typeof out.days !== 'object' || !out.days) return null;
  return out;
}

// ---------- learning events ----------
/** A lesson finished well: the skill is mastered and enters spaced review; today's lamp count goes up. */
export function completeSkill(l: Learner, skillId: string, now = Date.now()): Learner {
  const prev = l.skills[skillId];
  const s: SkillState = prev ? { ...prev } : { status: 'learning', box: 0, attempts: 0, correct: 0, first: now, last: now, due: null };
  s.attempts++; s.correct++; s.last = now;
  if (RANK[s.status] < RANK.mastered) { s.status = 'mastered'; s.box = 1; s.due = now + REVIEW_DAYS[0] * DAY; }
  const k = dayKey(now);
  return { ...l, skills: { ...l.skills, [skillId]: s }, days: { ...l.days, [k]: { lit: (l.days[k]?.lit ?? 0) + 1 } }, updated: now };
}
/** A review of a mastered skill: success moves it up a box (further review), a miss drops it back one. */
export function reviewSkill(l: Learner, skillId: string, ok: boolean, now = Date.now()): Learner {
  const prev = l.skills[skillId]; if (!prev) return l;
  const s = { ...prev, attempts: prev.attempts + 1, correct: prev.correct + (ok ? 1 : 0), last: now };
  s.box = Math.max(1, Math.min(REVIEW_DAYS.length, s.box + (ok ? 1 : -1)));
  s.status = s.box >= REVIEW_DAYS.length ? 'stable' : 'mastered';
  s.due = s.status === 'stable' ? null : now + REVIEW_DAYS[s.box - 1] * DAY;
  return { ...l, skills: { ...l.skills, [skillId]: s }, updated: now };
}
/** Keeps the stronger state of each skill (used when linking old progress or restoring onto existing data). */
export function mergeSkills(l: Learner, skills: Record<string, SkillStatus>, now = Date.now()): Learner {
  const next = { ...l.skills };
  for (const [id, status] of Object.entries(skills)) {
    const cur = next[id];
    if (cur && RANK[cur.status] >= RANK[status]) continue;
    next[id] = { status, box: status === 'learning' ? 0 : 1, attempts: cur?.attempts ?? 0, correct: cur?.correct ?? 0, first: cur?.first ?? now, last: now,
      due: status === 'learning' ? null : now + REVIEW_DAYS[0] * DAY };
  }
  return { ...l, skills: next, updated: now };
}

// ---------- reading progress ----------
const done = (s?: SkillState) => !!s && RANK[s.status] >= RANK.mastered;
/** Houses built in a world: skills mastered, counted along the street in order. */
export const masteredIn = (l: Learner | undefined, world: string) => (l ? worldSkills(world).filter(s => done(l.skills[s.id])).length : 0);
/** The next lesson on the street: the first skill (in path order) that is not mastered yet. */
export const nextSkillIn = (l: Learner | undefined, world: string) => worldSkills(world).find(s => !done(l?.skills[s.id]));
export const litToday = (l: Learner | undefined) => l?.days[dayKey()]?.lit ?? 0;
/** Passport stamps: worlds whose every skill is mastered. */
export const stampsOf = (l: Learner | undefined) => WORLDS.filter(w => { const sk = worldSkills(w.id); return sk.length > 0 && sk.every(s => done(l?.skills[s.id])); }).length;

// ---------- v2 import ----------
const LEGACY_KEY = 'khwarizmi.v1';
type V2Player = { id: string; fid?: string; name?: string; age?: number; gender?: string; progress?: Record<string, number | { stars?: number }> };
/** Translate one v2 player: a new skill is mastered when every old level teaching it was solved, learning if some were. */
export function translateV2(p: V2Player): LegacyPlayer {
  const solved = new Set(Object.entries(p.progress ?? {}).filter(([, v]) => (typeof v === 'number' ? v : v?.stars ?? 0) > 0).map(([k]) => k));
  const per = new Map<string, { n: number; ok: number }>();
  for (const lv of legacyMap.levels) for (const sk of lv.skills) {
    const e = per.get(sk) ?? { n: 0, ok: 0 }; e.n++; if (solved.has(lv.legacyId)) e.ok++; per.set(sk, e);
  }
  const skills: Record<string, SkillStatus> = {};
  for (const [sk, e] of per) if (e.ok > 0) skills[sk] = e.ok === e.n ? 'mastered' : 'learning';
  return { legacyId: p.id, fid: p.fid, name: String(p.name ?? '').slice(0, 16), age: Number(p.age) || 7, gender: p.gender === 'g' ? 'f' : 'm',
    skills, levels: legacyMap.levels.filter(lv => solved.has(lv.legacyId)).length };
}

// ---------- the store ----------
type Backup = { app: 'khawarizmi'; kind: 'backup'; schema: number; created: number; learners: Learner[] };
type LearningState = {
  ready: boolean;
  durable: boolean;            // saved in IndexedDB (false = temporary memory only)
  persisted: boolean | null;   // the browser promised not to evict the data
  learners: Record<string, Learner>;
  legacy: LegacyPlayer[];      // players imported from v2
  load: () => Promise<void>;
  complete: (pid: string, skillId: string) => void;
  review: (pid: string, skillId: string, ok: boolean) => void;
  linkLegacy: (legacyId: string, pid: string) => void;
  linkFamily: (memberIds: string[]) => void;
  exportBackup: () => Backup;
  importBackup: (json: unknown) => { ok: boolean; count: number };
  forget: (pid: string) => void;
};

async function save(l: Learner) {
  const prev = await db.get<Learner>('learners', l.id);
  if (prev && migrate(prev)) await db.put('meta', `lastGood:${l.id}`, prev);   // keep the previous good copy for recovery
  await db.put('learners', l.id, l);
}

export const useLearning = create<LearningState>()((set, get) => ({
  ready: false, durable: false, persisted: null, learners: {}, legacy: [],
  load: async () => {
    const durable = await db.durable();
    const learners: Record<string, Learner> = {};
    for (const [id, raw] of await db.all<unknown>('learners')) {
      let l = migrate(raw);
      if (!l) { const good = await db.get<unknown>('meta', `lastGood:${id}`); l = migrate(good); }   // corrupted -> last good copy
      if (l) { learners[id] = l; if (l.schema !== (raw as Learner)?.schema) await db.put('learners', id, l); }
    }
    // v2 import, once: archive the raw text first, then translate
    let legacy = (await db.get<LegacyPlayer[]>('meta', 'legacyPlayers')) ?? [];
    if (!(await db.get<boolean>('meta', 'legacyImported'))) {
      try {
        const txt = localStorage.getItem(LEGACY_KEY);
        if (txt) {
          await db.put('legacy', `${LEGACY_KEY}@${Date.now()}`, txt);
          const raw = JSON.parse(txt) as { players?: V2Player[] };
          legacy = (Array.isArray(raw.players) ? raw.players : []).filter(p => p && typeof p.id === 'string').map(translateV2);
          await db.put('meta', 'legacyPlayers', legacy);
        }
      } catch { /* unreadable old data stays archived as raw text */ }
      await db.put('meta', 'legacyImported', true);
    }
    let persisted: boolean | null = null;
    try { persisted = navigator.storage?.persist ? await navigator.storage.persist() : null; } catch { persisted = null; }
    set({ ready: true, durable, persisted, learners, legacy });
  },
  complete: (pid, skillId) => {
    const l = completeSkill(get().learners[pid] ?? blankLearner(pid), skillId);
    set({ learners: { ...get().learners, [pid]: l } }); void save(l);
  },
  review: (pid, skillId, ok) => {
    const cur = get().learners[pid]; if (!cur) return;
    const l = reviewSkill(cur, skillId, ok); set({ learners: { ...get().learners, [pid]: l } }); void save(l);
  },
  linkLegacy: (legacyId, pid) => {
    const lp = get().legacy.find(x => x.legacyId === legacyId); if (!lp) return;
    const l = mergeSkills(get().learners[pid] ?? blankLearner(pid), lp.skills);
    const legacy = get().legacy.map(x => (x.legacyId === legacyId ? { ...x, linkedTo: pid } : x));
    set({ learners: { ...get().learners, [pid]: l }, legacy }); void save(l); void db.put('meta', 'legacyPlayers', legacy);
  },
  /** When the family is unlocked: link old players whose family id matches a child exactly. */
  linkFamily: memberIds => {
    for (const lp of get().legacy) if (!lp.linkedTo && lp.fid && memberIds.includes(lp.fid)) get().linkLegacy(lp.legacyId, lp.fid);
  },
  exportBackup: () => ({ app: 'khawarizmi', kind: 'backup', schema: SCHEMA, created: Date.now(), learners: Object.values(get().learners) }),
  importBackup: json => {
    const b = json as Partial<Backup>;
    if (!b || b.app !== 'khawarizmi' || b.kind !== 'backup' || !Array.isArray(b.learners)) return { ok: false, count: 0 };
    const learners = { ...get().learners }; let count = 0;
    for (const raw of b.learners) { const l = migrate(raw); if (l) { learners[l.id] = { ...l, updated: Date.now() }; count++; void save(learners[l.id]); } }
    set({ learners });
    return { ok: count > 0, count };
  },
  forget: pid => { const learners = { ...get().learners }; delete learners[pid]; set({ learners }); void db.del('learners', pid); },
}));

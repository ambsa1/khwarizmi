// Content reader. The curriculum is NOT compiled into the app: it arrives as packs built by tools/content-packs.mjs
// (public/content). The core pack (worlds, skill trees, templates) is loaded once at start-up, before any screen shows,
// so the getters below stay synchronous; a world's lessons are loaded when that world needs them.
// Packs are cached by the service worker, so after the first visit everything works offline.

type WorldsDoc = typeof import('../../../content/worlds/worlds.json');
export type World = WorldsDoc['worlds'][number];
export type Skill = { id: string; title: { ar: string; en?: string }; zone: string; ages: { min: number; max?: number }; templates?: string[] };
export type Template = { id: string; family: string; domains: string[]; minAge: number; title: { ar: string; en?: string } };
export type Text = { ar: string; en?: string };
export type Lesson = {
  id: string; title?: Text; status: 'draft' | 'approved'; skills: string[]; reviews?: string[];
  keyCards: { text: Text; visual: string; voice?: string }[];
  workedExamples?: { question: Text; steps: Text[]; answer: Text }[];
  activities: { template: string; params?: Record<string, unknown>; rounds?: number; mode?: string }[];
  quiz: { type: string; q: Text }[];
};
type StationPlan = { place?: Text; subject?: Text; stations: string[][] };
type Core = { worlds: World[]; trees: Record<string, { world: string; skills: Skill[] }>; templates: Template[]; stations?: Record<string, StationPlan> };
export type Manifest = { version: string; built: string; packs: { file: string; bytes: number; hash: string }[] };

const BASE = `${import.meta.env.BASE_URL}content/`;
/** Filled in place by loadContent(), so modules that imported it keep a live reference. */
export const WORLDS: World[] = [];
const TREES: Record<string, Skill[]> = {};
const TEMPLATES = new Map<string, Template>();
const STATIONS: Record<string, StationPlan> = {};
export let CONTENT: Manifest | null = null;

async function json<T>(file: string): Promise<T> {
  const r = await fetch(BASE + file);
  if (!r.ok) throw new Error(`content ${file}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Start-up: the manifest and the core pack. Throws if the content cannot be read (the error screen explains). */
export async function loadContent() {
  if (WORLDS.length) return;
  const [manifest, core] = await Promise.all([json<Manifest>('manifest.json').catch(() => null), json<Core>('core.json')]);
  CONTENT = manifest;
  WORLDS.push(...core.worlds);
  for (const t of Object.values(core.trees)) TREES[t.world] = t.skills;
  for (const t of core.templates) TEMPLATES.set(t.id, t);
  Object.assign(STATIONS, core.stations ?? {});
}

export const worldById = (id: string) => WORLDS.find(w => w.id === id)!;
export const templateById = (id: string) => TEMPLATES.get(id);

/** Skills of a world in path order: zone order first, then the order inside the tree file. */
export function worldSkills(worldId: string): Skill[] {
  const w = WORLDS.find(x => x.id === worldId);
  const tree = TREES[worldId];
  if (!w || !tree || worldId === 'marra') return [];
  const zoneOrder = new Map(w.zones.map(z => [z.id, z.order]));
  return tree.slice().sort((a, b) => (zoneOrder.get(a.zone)! - zoneOrder.get(b.zone)!));
}
export const skillCount = (worldId: string) => worldSkills(worldId).length;

// ---------- stations (nested progression) ----------
/** A world's stations in path order. Each holds an ordered series of skills (its lessons open one after another);
 *  a station is built in the scene when all of them are mastered. Empty stations are reserved for future content. */
export function worldStations(worldId: string): { index: number; skills: Skill[] }[] {
  const byId = new Map(worldSkills(worldId).map(s => [s.id, s]));
  return (STATIONS[worldId]?.stations ?? []).map((ids, index) => ({ index, skills: ids.map(id => byId.get(id)).filter((s): s is Skill => !!s) }));
}
export const stationCount = (worldId: string) => STATIONS[worldId]?.stations.length ?? 0;
/** The subject shown on the map and in the top bar (the place itself is only greeted by Siraj on arrival). */
export const subjectName = (worldId: string) => STATIONS[worldId]?.subject?.ar ?? worldId;
export const placeName = (worldId: string) => STATIONS[worldId]?.place?.ar ?? worldId;

// ---------- lessons (per world, on demand) ----------
const lessonPacks = new Map<string, Promise<Lesson[]>>();
export function worldLessons(worldId: string): Promise<Lesson[]> {
  if (!lessonPacks.has(worldId)) lessonPacks.set(worldId, json<{ lessons: Lesson[] }>(`world-${worldId}.json`).then(p => p.lessons).catch(() => []));
  return lessonPacks.get(worldId)!;
}
/** The lesson that teaches a skill, if one has been written yet. */
export async function lessonFor(worldId: string, skillId: string): Promise<Lesson | undefined> {
  return (await worldLessons(worldId)).find(l => l.skills.includes(skillId));
}
/** Old v2 level -> new skill map, only needed when importing data from the previous version. */
export const legacyMap = () => json<{ levels: { legacyId: string; skills: string[] }[] }>('legacy.json');

/** Short world names for chips, cards and the top bar. */
export const SHORT_NAME: Record<string, string> = { kassala: 'كسلا', mogran: 'المقرن', meroe: 'مروي', suakin: 'سواكن', marra: 'جبل مرّة', saqiya: 'الساقية' };
